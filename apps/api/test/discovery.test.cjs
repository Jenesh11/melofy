const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createRecommendationService, normalizeTrack, parseProfile, rankTracks } = require('../dist/lib/recommendations');
const { optionalCache } = require('../dist/lib/optionalCache');
const { fetchFullSpotifyPlaylist } = require('../dist/lib/spotify');
const { createDiscoveryRouter } = require('../dist/routes/discovery');
const raw = (id, artist = 'Artist ' + id, durationField = 'length') => ({ encoded: 'encoded-' + id, info: { identifier: id, title: 'Song ' + id, author: artist, [durationField]: 180000, sourceName: 'youtube', uri: 'https://www.youtube.com/watch?v=' + id } });
const results = (prefix = 'new') => ({ loadType: 'search', data: Array.from({ length: 8 }, (_, i) => raw(prefix + i)) });
const seed = normalizeTrack(raw('abcdefghijk'));
const profile = () => parseProfile({ seed, history: [seed] });

test('normalizes wire length and library duration without losing source or playback token', () => {
  for (const field of ['duration', 'length']) {
    const track = normalizeTrack(raw('abcdefghijk', 'Artist', field));
    assert.equal(track.duration, 180000);
    assert.equal(track.encoded, 'encoded-abcdefghijk');
    assert.equal(track.source, 'youtube');
  }
  assert.equal(normalizeTrack({ title: 'Unknown Title', artist: 'x', id: 'x' }), null);
  assert.equal(parseProfile({ history: Array(100).fill(seed), language: 'bad', genre: 'bad' }).history.length, 50);
  assert.equal(parseProfile({ language: 'bad' }).language, 'all');
});

test('sends exact ytrec identifier and never requests Spotify credentials', async () => {
  const calls = [];
  const service = createRecommendationService({ load: async (id, signal) => { calls.push(id); assert.ok(signal instanceof AbortSignal); return results(); } });
  const result = await service.recommend(profile());
  assert.deepEqual(calls, ['ytrec:abcdefghijk']);
  assert.equal(result.tracks.length, 8);
  assert.equal(result.degraded, false);
  assert.deepEqual(result.providers, ['youtube-radio']);
});

test('Spotify-shaped seed uses title/artist radio and falls back after source error', async () => {
  const calls = [];
  const service = createRecommendationService({ listenBrainz: false, load: async id => { calls.push(id); if (id.startsWith('ytrec:')) throw Error('down'); return results(); } });
  const result = await service.recommend(parseProfile({ seed: { ...seed, id: 'a'.repeat(22), identifier: undefined } }));
  assert.equal(calls[0], 'ytrec:Song abcdefghijk Artist abcdefghijk');
  assert.ok(calls[1].startsWith('ytmsearch:'));
  assert.equal(result.tracks.length, 8);
  assert.equal(result.degraded, true);
});

test('ListenBrainz fallback works without auth and preserves lazy resolution identity', async () => {
  const urls = [];
  const mbid = '9e2ad5bc-c6f9-40d2-a36f-3122ee2072a3';
  const service = createRecommendationService({ load: async () => ({ loadType: 'empty' }), fetch: async (url, options) => {
    urls.push(url);
    assert.equal(options.headers.Authorization, undefined);
    return new Response(JSON.stringify(url.includes('acr-lookup') ? [{ recording_mbid: mbid }] : [{ recording_mbid: '00000000-0000-0000-0000-000000000001', recording_name: 'Fresh Song', artist_credit_name: 'Another Artist' }]));
  } });
  const result = await service.recommend(profile());
  assert.equal(urls.length, 2);
  assert.equal(result.tracks[0].provider, 'listenbrainz');
  assert.equal(result.tracks[0].encoded, '');
  assert.equal(result.tracks[0].source, 'musicbrainz');
  assert.ok(result.tracks[0].recordingMbid);
});

test('429 similarity failure cools down and still returns music search results', async () => {
  let calls = 0;
  const service = createRecommendationService({ load: async id => id.startsWith('ytrec:') ? { loadType: 'empty' } : results(), fetch: async () => { calls++; return new Response('', { status: 429 }); } });
  const first = await service.recommend(profile());
  const second = await service.recommend(parseProfile({ seed: { ...seed, title: 'Different seed' } }));
  assert.equal(calls, 1);
  assert.equal(first.tracks.length, 8);
  assert.equal(second.tracks.length, 8);
  assert.ok(second.unavailable.includes('listenbrainz'));
});

test('cache failures do not block or discard live recommendations; identical loads singleflight', async () => {
  let calls = 0;
  const service = createRecommendationService({ cache: { get: async () => { throw Error('cache down'); }, set: async () => { throw Error('write down'); } }, load: async () => { calls++; await new Promise(r => setTimeout(r, 5)); return results(); } });
  const [a, b] = await Promise.all([service.recommend(profile()), service.recommend(profile())]);
  assert.equal(calls, 1);
  assert.equal(a.tracks.length, 8);
  assert.deepEqual(a, b);
});

test('optional cache has bounded waits and tolerates rejecting writes', async () => {
  const cache = optionalCache({ get: () => new Promise(() => {}), set: async () => { throw Error('write'); }, setex: async () => { throw Error('write'); } });
  const started = Date.now();
  assert.equal(await cache.get('x'), null);
  assert.ok(Date.now() - started < 1400);
  assert.equal(await cache.set('x', {}, { ex: 1 }), null);
  assert.equal(await cache.setex('x', 1, {}), null);
});

test('never reinserts seed, excludes recent songs by metadata and caps same artist', () => {
  const p = profile();
  const candidates = [seed, { ...seed, id: 'other-id' }, ...Array.from({ length: 8 }, (_, i) => normalizeTrack(raw('new' + i, 'Same Artist')))];
  const tracks = rankTracks(candidates, p);
  assert.equal(tracks.length, 3);
  assert.ok(tracks.every(t => t.id.startsWith('new')));
});

test('total provider outage uses eligible library tracks and seed-only library remains empty', async () => {
  const service = createRecommendationService({ listenBrainz: false, load: async () => { throw Error('offline'); } });
  const empty = await service.recommend(parseProfile({ seed, liked: [seed] }));
  assert.equal(empty.tracks.length, 0);
  const result = await service.recommend(parseProfile({ seed, liked: [normalizeTrack(raw('favorite'))] }));
  assert.equal(result.tracks[0].id, 'favorite');
  assert.deepEqual(result.providers, ['library']);
});

test('cached public candidates do not reuse another user personalization', async () => {
  const service = createRecommendationService({ load: async () => results() });
  const a = await service.recommend(parseProfile({ seed, history: [normalizeTrack(raw('new0'))] }));
  const b = await service.recommend(parseProfile({ seed, history: [normalizeTrack(raw('new1'))] }));
  assert.ok(a.tracks.some(t => t.id === 'new1') && !a.tracks.some(t => t.id === 'new0'));
  assert.ok(b.tracks.some(t => t.id === 'new0') && !b.tracks.some(t => t.id === 'new1'));
});

test('cold start and language preferences produce music searches', async () => {
  const calls = [];
  const service = createRecommendationService({ load: async id => { calls.push(id); return results(); } });
  await service.recommend(parseProfile({ genre: 'jazz', language: 'Hindi' }));
  assert.ok(calls.includes('ytmsearch:Hindi jazz songs'));
});

for (const wrapper of ['track', 'item']) test('Spotify playlist pagination accepts ' + wrapper + ' schema and preserves null slots', async () => {
  const id = 'a'.repeat(22);
  const firstPage = { total: 3, items: [{ [wrapper]: { id: 'first' } }], next: `https://api.spotify.com/v1/playlists/${id}/${wrapper === 'track' ? 'tracks' : 'items'}?offset=1` };
  const data = await fetchFullSpotifyPlaylist(id, async path => path === `/playlists/${id}` ? { id, [wrapper === 'track' ? 'tracks' : 'items']: firstPage } : { items: [{ [wrapper]: null }, { [wrapper]: { id: 'last' } }], next: null });
  assert.equal(data.tracks.items.length, 3);
  assert.equal(data.tracks.items[2].track.id, 'last');
  assert.equal(data.tracks.next, null);
});

test('Spotify import refuses missing pages, pagination cycles and foreign URLs', async () => {
  const id = 'a'.repeat(22);
  const next = `https://api.spotify.com/v1/playlists/${id}/tracks?offset=1`;
  await assert.rejects(fetchFullSpotifyPlaylist(id, async path => { if (path.includes('?')) throw Error('page failed'); return { tracks: { items: [], next } }; }), /page failed/);
  await assert.rejects(fetchFullSpotifyPlaylist(id, async () => ({ tracks: { total: 2, items: [{ track: {} }], next: null } })), /Incomplete/);
  await assert.rejects(fetchFullSpotifyPlaylist(id, async () => ({ tracks: { items: [], next: 'https://example.com/v1/playlists/a/tracks' } })), /Invalid/);
  await assert.rejects(fetchFullSpotifyPlaylist(id, async path => path.includes('?') ? { items: [], next } : { tracks: { items: [], next } }), /did not complete/);
});

test('HTTP discovery returns partial home results, actionable failures and playable mixes', async () => {
  const app = express();
  app.use(express.json());
  app.use(createDiscoveryRouter({ listenBrainz: false, load: async id => {
    if (id.includes('new music') || id.includes('workout')) throw Error('source down');
    return results();
  } }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base + '/discovery/home', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: [seed] }) });
    const data = await home.json();
    assert.equal(home.headers.get('cache-control'), 'private, no-store');
    assert.ok(data.unavailable.includes('newReleases'));
    assert.equal(data.mixes.length, 2);
    assert.ok(data.unavailable.includes('mixes'));
    assert.equal(data.recommendations.length, 8);
    const mix = await (await fetch(base + '/discovery/mixes/mix:chill')).json();
    assert.ok(mix.tracks.items[0].encoded);
    assert.equal(mix.tracks.items[0].duration_ms, 180000);
    assert.equal((await fetch(base + '/discovery/mixes/mix:invalid')).status, 404);
    assert.equal((await fetch(base + '/recommendations')).status, 400);
  } finally { await new Promise(r => server.close(r)); }
});

test('actual installed NodeLink REST transport preserves ytrec and timeout with exactly one v4 prefix', async () => {
  const { LavalinkNode } = require('lavalink-client');
  const { nodeLinkDiscoveryLoader } = require('../dist/lib/nodeLinkDiscovery');
  const originalFetch = global.fetch;
  let requested;
  global.fetch = async (url, options) => { requested = { url: new URL(url), options }; return new Response(JSON.stringify(results())); };
  try {
    const node = { connected: true, version: 'v4', options: { authorization: 'fixture-secret' }, restAddress: 'http://localhost:2333', calls: 0, NodeManager: {}, rawRequest: LavalinkNode.prototype.rawRequest };
    const signal = AbortSignal.timeout(1000);
    const load = nodeLinkDiscoveryLoader(() => node);
    await load('ytrec:abcdefghijk', signal);
    assert.equal(requested.url.pathname, '/v4/loadtracks');
    assert.equal(requested.url.searchParams.get('identifier'), 'ytrec:abcdefghijk');
    assert.equal(requested.options.signal, signal);
    assert.equal(requested.options.headers.Authorization, 'fixture-secret');
    global.fetch = async () => new Response('{}', { status: 500 });
    await assert.rejects(load('ytrec:abcdefghijk', signal), /unavailable/);
  } finally { global.fetch = originalFetch; }
});

test('malformed cached candidates are ignored and valid live results are returned', async () => {
  let calls = 0;
  const service = createRecommendationService({ cache: { get: async () => [{ id: 'broken' }], set: async () => {} }, load: async () => { calls++; return results(); } });
  const result = await service.recommend(profile());
  assert.equal(calls, 1);
  assert.equal(result.tracks.length, 8);
});
