/* Offline audit reproductions. Runs actual source functions with dependency mocks.
 * These assertions document existing defects; they are NOT regression acceptance tests.
 * Run from the repository root: node reports/2026-09-12/reproduce-audit.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { LavalinkManager, LavalinkNode } = require('lavalink-client');
function manager() {
  return new LavalinkManager({ nodes: [], sendToShard() {}, client: { id: '123456789012345678', username: 'audit' }, playerOptions: { defaultSearchPlatform: 'ytmsearch' } });
}
const root = path.resolve(__dirname, '../..');
const quietConsole = { log() {}, error() {}, warn() {} };
const results = [];

function extract(file, predicate) {
  const fullPath = path.join(root, file);
  const source = ts.createSourceFile(fullPath, fs.readFileSync(fullPath, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let match;
  function walk(node) {
    if (!match && predicate(node, source)) match = node;
    if (!match) ts.forEachChild(node, walk);
  }
  walk(source);
  assert.ok(match, `Source function not found: ${file}`);
  return { node: match, source };
}

function compileExpression(expression, context = {}) {
  const js = ts.transpileModule(`globalThis.auditFn = (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  }).outputText;
  const sandbox = { console: quietConsole, URLSearchParams, ...context };
  vm.runInNewContext(js, sandbox);
  return sandbox.auditFn;
}

function variableCallback(file, name, context) {
  const { node, source } = extract(file, n => ts.isVariableDeclaration(n) && n.name.getText() === name);
  const expression = ts.isCallExpression(node.initializer) ? node.initializer.arguments[0] : node.initializer;
  return compileExpression(expression.getText(source), context);
}

function recommendationRoute(context) {
  const { node, source } = extract('apps/api/src/index.ts', n => ts.isCallExpression(n) && n.expression.getText() === 'app.get' && n.arguments[0]?.text === '/api/recommendations');
  return compileExpression(node.arguments[node.arguments.length - 1].getText(source), context);
}

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function routeContext(options = {}) {
  const calls = [];
  const candidate = { encoded: 'test-encoded', info: { identifier: 'abcdefghijk', title: 'Seed', author: 'Artist', length: 180000, sourceName: 'youtube' } };
  return {
    calls,
    redis: {
      async get() { if (options.readFailure) throw new Error('Cache unavailable'); return null; },
      async set() { if (options.writeFailure) throw new Error('Cache unavailable'); }
    },
    lavalink: { nodeManager: { leastUsedNodes: () => [{ search: async ({ query }) => {
      calls.push(query);
      return options.empty ? { loadType: 'empty' } : { loadType: 'search', tracks: [candidate] };
    } }] } }
  };
}

async function check(name, run) {
  await run();
  results.push({ name, reproduced: true });
  console.log(`REPRODUCED: ${name}`);
}

(async () => {
  await check('Installed client sends ytmsearch:ytrec: instead of the YouTube radio prefix', async () => {
    let requestPath;
    const fakeNode = {
      _LManager: manager(), _checkForSources: false, info: { sourceManagers: ['youtube'] },
      restAddress: 'http://localhost:2333/v4',
      request: async requested => { requestPath = requested; return { loadType: 'empty', data: {} }; }
    };
    await LavalinkNode.prototype.search.call(fakeNode, { query: 'ytrec:abcdefghijk' }, { id: 'audit' });
    assert.equal(new URL(requestPath, 'http://localhost').searchParams.get('identifier'), 'ytmsearch:ytrec:abcdefghijk');
  });

  await check('Spotify seed wins over valid YouTube ID; empty result has no fallback', async () => {
    const context = routeContext({ empty: true });
    const res = response();
    await recommendationRoute(context)({ query: { spotifyId: 'a'.repeat(22), videoId: 'abcdefghijk', query: 'Seed Artist' } }, res);
    assert.deepEqual(context.calls, ['sprec:' + 'a'.repeat(22)]);
    assert.equal(res.body.tracks.length, 0);
  });

  await check('Cache read failure prevents recommendation provider from running', async () => {
    const context = routeContext({ readFailure: true });
    const res = response();
    await recommendationRoute(context)({ query: { videoId: 'abcdefghijk' } }, res);
    assert.equal(context.calls.length, 0);
    assert.equal(res.statusCode, 500);
  });

  await check('Cache write failure discards successful recommendation results', async () => {
    const context = routeContext({ writeFailure: true });
    const res = response();
    await recommendationRoute(context)({ query: { videoId: 'otherseed12' } }, res);
    assert.equal(context.calls.length, 1);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.tracks, undefined);
  });

  await check('Seed-only provider response puts the seed back into recommendations', async () => {
    const context = routeContext();
    const res = response();
    await recommendationRoute(context)({ query: { videoId: 'abcdefghijk', query: 'Seed Artist' } }, res);
    assert.equal(res.body.tracks[0].id, 'abcdefghijk');
  });

  await check('Delayed autoplay overwrites manual selection and clears its queue', async () => {
    const storePath = path.join(root, 'apps/web/src/store/usePlayerStore.ts');
    const storeModule = { exports: {} };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(storePath, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
    }).outputText, {
      exports: storeModule.exports,
      require: name => name === 'sonner' ? { toast: { error() {} } } : name === '@capacitor/core' ? { Capacitor: { isNativePlatform: () => false } } : require(name)
    });
    const store = storeModule.exports.usePlayerStore;
    const seed = { id: 'seed', title: 'Seed', artist: 'Artist', duration: 1000 };
    store.getState().play(seed);
    let release;
    const responseGate = new Promise(resolve => { release = resolve; });
    const fn = variableCallback('apps/web/src/hooks/useTrackDiscovery.ts', 'triggerAutoplay', {
      currentTrack: seed, isAutoplay: true, isFetchingAutoplay: false, setIsFetchingAutoplay() {},
      getAuthHeader: async () => ({}), fetch: async () => responseGate, play: store.getState().play
    });
    const pending = fn();
    store.getState().playPlaylist([{ ...seed, id: 'manual', title: 'Manual selection' }, { ...seed, id: 'queued' }]);
    release({ json: async () => ({ tracks: [{ id: 'old-radio', title: 'Old radio', artist: 'Artist', encoded: 'mock', duration: 1000 }] }) });
    await pending;
    assert.equal(store.getState().currentTrack.id, 'old-radio');
    assert.equal(store.getState().queue.length, 0);
  });

  await check('Dashboard marks all HTTP 500 responses as fetched', async () => {
    let hasFetched = false;
    let requests = 0;
    const context = {
      user: {}, controller: new AbortController(), historyRef: { current: [] },
      getFirebaseAuthHeaders: async () => ({}), fetch: async () => { requests++; return { ok: false, status: 500 }; },
      setIsFetching() {}, setHasFetched(value) { hasFetched = value; }
    };
    for (const name of ['setTrending', 'setNewReleases', 'setMixes', 'setEditorsPicks', 'setFeaturedPlaylists', 'setDiscoveryMixes', 'setRecommendations']) context[name] = () => { throw new Error('Should not update a failed section'); };
    await variableCallback('apps/web/src/app/page.tsx', 'fetchDashboardData', context)();
    assert.equal(requests, 6);
    assert.equal(hasFetched, true);
  });

  await check('Client-normalized track duration is lost by the recommendations route', async () => {
    const builtTrack = manager().utils.buildTrack({ encoded: 'test-encoded', info: { identifier: 'abcdefghijk', title: 'Candidate', author: 'Artist', length: 180000, sourceName: 'youtube' } });
    assert.equal(builtTrack.info.duration, 180000);
    const context = routeContext();
    context.lavalink.nodeManager.leastUsedNodes = () => [{ search: async () => ({ loadType: 'search', tracks: [builtTrack] }) }];
    const res = response();
    await recommendationRoute(context)({ query: { videoId: 'otherseed12' } }, res);
    assert.equal(res.body.tracks[0].duration, undefined);
  });

  await check('Native playback at 90 seconds is persisted as zero from the unused HTML audio element', async () => {
    let saved;
    const context = {
      user: { uid: 'test-user' }, isHydrated: true, history: [], queue: [], currentTrack: { id: 'track' },
      isShuffle: false, isRepeat: false, volume: 1, audioRef: { current: { currentTime: 0 } },
      activePlaylistContext: null, activeCollectionId: null, activeCollectionType: null, recentPlaylists: [],
      usePlayerStore: { getState: () => ({ progress: 90000 }) },
      getAuthHeader: async () => ({}), fetch: async (_url, options) => { saved = JSON.parse(options.body); return { ok: true }; }
    };
    await variableCallback('apps/web/src/hooks/usePlayerSync.ts', 'syncStateToServer', context)();
    assert.equal(saved.state.currentTime, 0);
  });

  fs.writeFileSync(path.join(__dirname, 'reproduction-results.json'), JSON.stringify({
    sourceCommit: 'eb9e918', kind: 'offline-source-functions-with-mocks', results
  }, null, 2) + '\n');
  console.log(`${results.length} existing failure scenarios reproduced. No live service or device acceptance performed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
