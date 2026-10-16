const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const dns = require('node:dns/promises');
const express = require('express');
const { once } = require('node:events');

// Actual HTTP sockets and the production router; only Firebase verification,
// NodeLink discovery, and CDN routing are replaced with local deterministic peers.
test('Stream relay preserves ranges, closes broken responses and cancels abandoned upstream work', { timeout: 10000 }, async t => {
  const sockets = new Set();
  const upstreamHits = [];
  let slowClosed = false;
  const upstream = http.createServer((req, res) => {
    upstreamHits.push(req.url);
    if (req.url.startsWith('/v4/trackstream')) {
      const encoded = new URL(req.url, 'http://fixture').searchParams.get('encodedTrack');
      if (encoded === 'broken-resolution') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': 999 });
        res.write('{"url":'); setTimeout(() => res.destroy(), 20); return;
      }
      res.setHeader('Content-Type', 'application/json');
      if (encoded === 'sabr-only') { res.end(JSON.stringify({ url: 'http://cdn.example.test/sabr', protocol: 'sabr' })); return; }
      res.end(JSON.stringify({ url: 'http://cdn.example.test/' + (encoded === 'saavn-match' ? 'good' : encoded), protocol: 'http' })); return;
    }
    if (req.url.startsWith('/v4/decodetrack')) {
      const encoded = new URL(req.url, 'http://fixture').searchParams.get('encodedTrack');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ info: encoded === 'sabr-only'
        ? { title: 'Blinding Lights (Official Video)', author: 'The Weeknd', length: 202000, sourceName: 'youtube' }
        : { title: 'Unknown', author: 'Nobody', length: 1000, sourceName: 'youtube' } })); return;
    }
    if (req.url.startsWith('/v4/loadtracks')) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ loadType: 'search', data: [
        { encoded: 'saavn-wrong', info: { title: 'Blinding Lights', author: 'Cover Band', length: 202000 } },
        { encoded: 'saavn-match', info: { title: 'Blinding Lights', author: 'The Weeknd', length: 204000 } },
      ] })); return;
    }
    if (req.url === '/broken') {
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': 100000 });
      res.write('partial'); setTimeout(() => res.destroy(), 20); return;
    }
    if (req.url === '/slow') {
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': 100000 });
      res.write('start'); res.on('close', () => { slowClosed = true; }); return;
    }
    assert.equal(req.headers.range, 'bytes=2-5');
    res.writeHead(206, { 'Content-Type': 'audio/wav', 'Content-Range': 'bytes 2-5/10', 'Content-Length': 4 });
    res.end('2345');
  });
  upstream.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  upstream.listen(0, '127.0.0.1'); await once(upstream, 'listening');
  const port = upstream.address().port;
  const request = http.request, lookup = dns.lookup;
  http.request = function(options, ...args) {
    if (options?.hostname === 'cdn.example.test') options = { ...options, hostname: '127.0.0.1', port };
    return request.call(this, options, ...args);
  };
  dns.lookup = async (host, ...args) => host === 'cdn.example.test' ? [{ address: '93.184.216.34', family: 4 }] : lookup(host, ...args);
  const indexPath = require.resolve('../dist/index');
  const authPath = require.resolve('../dist/lib/firebaseAuth');
  require.cache[indexPath] = { id: indexPath, filename: indexPath, loaded: true, exports: { lavalink: { nodeManager: { leastUsedNodes: () => [{ connected: true, options: { host: '127.0.0.1', port, secure: false, authorization: 'fixture' } }] } } } };
  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: { extractBearerToken: value => value, verifyFirebaseIdToken: async () => ({ uid: 'fixture' }), requireFirebaseAuth: (_req, _res, next) => next() } };
  const app = express(); app.use(require('../dist/routes/stream').default);
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { http.request = request; dns.lookup = lookup; server.closeAllConnections(); server.close(); for (const socket of sockets) socket.destroy(); upstream.close(); });
  const url = encoded => `http://127.0.0.1:${server.address().port}/stream?url=${encoded}`;
  const get = (encoded, cb) => http.get(url(encoded), { headers: { Authorization: 'fixture', Range: 'bytes=2-5' } }, cb);
  await t.test('range response survives request completion', async () => {
    await new Promise((resolve, reject) => {
      get('good', res => {
        assert.equal(res.statusCode, 206); assert.equal(res.headers['content-range'], 'bytes 2-5/10');
        let data = ''; res.on('data', c => data += c); res.on('end', () => { assert.equal(data, '2345'); resolve(); }); res.on('error', reject);
      }).on('error', reject);
    });
  });
  await t.test('truncated CDN body closes the downstream instead of hanging', async () => {
    await new Promise((resolve, reject) => {
      get('broken', res => { res.resume(); res.on('aborted', resolve); res.on('error', () => {}); res.on('end', () => reject(Error('Truncated stream reported success'))); }).on('error', reject);
    });
  });
  await t.test('client cancellation destroys upstream without retrying it', async () => {
    await new Promise((resolve, reject) => {
      get('slow', res => { res.once('data', () => { res.destroy(); resolve(); }); res.on('error', () => {}); }).on('error', reject);
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(slowClosed, true); assert.equal(upstreamHits.filter(url => url === '/slow').length, 1);
  });
  await t.test('unplayable primary protocol switches to the same recording on another source and never GETs SABR URLs', async () => {
    await new Promise((resolve, reject) => {
      get('sabr-only', res => {
        assert.equal(res.statusCode, 206);
        let data = ''; res.on('data', c => data += c); res.on('end', () => { assert.equal(data, '2345'); resolve(); }); res.on('error', reject);
      }).on('error', reject);
    });
    assert.ok(upstreamHits.some(url => url.includes('encodedTrack=saavn-match')));
    assert.ok(!upstreamHits.some(url => url === '/sabr'), 'SABR URL must never be fetched with GET');
  });
  await t.test('truncated NodeLink JSON fails promptly instead of leaving resolution pending', async () => {
    await new Promise((resolve, reject) => {
      get('broken-resolution', res => { assert.equal(res.statusCode, 502); res.resume(); res.on('end', resolve); }).on('error', reject);
    });
  });
});
