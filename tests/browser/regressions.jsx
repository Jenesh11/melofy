import React, { useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { setUser } from './auth';
import { useTrackDiscovery } from '../../apps/web/src/hooks/useTrackDiscovery';
import { useHomeDiscovery } from '../../apps/web/src/hooks/useHomeDiscovery';
import { usePlayerSync } from '../../apps/web/src/hooks/usePlayerSync';
import { useSpotifyCollection } from '../../apps/web/src/hooks/useSpotifyCollection';
import { LikedSongsSync } from '../../apps/web/src/components/layout/LikedSongsSync';
import { usePlayerStore as player } from '../../apps/web/src/store/usePlayerStore';
import { useHomeStore as home } from '../../apps/web/src/store/useHomeStore';
import { useLikedStore as likes } from '../../apps/web/src/store/useLikedStore';
import { useLibraryStore as library } from '../../apps/web/src/store/useLibraryStore';
import { mapSpotifyTrackToPlayerTrack } from '../../apps/web/src/lib/track-mappers';
import { normalizeToFirebaseTrack } from '../../apps/web/src/lib/library-tracks';
import Home from '../../apps/web/src/app/page';

const alice = { uid: 'alice', displayName: 'Alice', getIdToken: async () => 'fixture-alice' };
const bob = { uid: 'bob', displayName: 'Bob', getIdToken: async () => 'fixture-bob' };
const seed = { id: 'abcdefghijk', identifier: 'abcdefghijk', title: 'Seed Song', artist: 'Seed Artist', duration: 180000, artworkUrl: '', url: 'encoded-seed', source: 'youtube' };
const next = { ...seed, id: 'freshsong01', identifier: 'freshsong01', title: 'Fresh Song', artist: 'Fresh Artist', url: 'encoded-fresh' };
const manual = { ...next, id: 'manualsong1', title: 'Manual Selection' };
const recommendation = { ...next, encoded: next.url, artwork: '' };
const display = { id: next.id, identifier: next.identifier, name: next.title, artists: [{ name: next.artist }], duration_ms: next.duration, encoded: next.url, source: 'youtube', album: { images: [] } };
const mix = { id: 'mix:chill', name: 'Chill Vibes', images: [], type: 'mix', tracks: { total: 1, items: [display] } };
const homeData = () => ({ trending: [{ track: display }], newReleases: [display], recommendations: [display], mixes: [mix], editorsPicks: [mix], discoveryMixes: [], featuredPlaylists: [mix], unavailable: [] });
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (value, message = 'Assertion failed') => { if (!value) throw Error(message); };
async function until(predicate, label = 'condition', timeout = 5000) { const end = Date.now() + timeout; while (!predicate()) { if (Date.now() > end) throw Error('Timed out: ' + label); await sleep(10); } }
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const root = createRoot(document.getElementById('root'));
const publish = handle => { window.handle = handle; };
function Discovery() { const handle = useTrackDiscovery(); useEffect(() => publish(handle)); return <p>Track discovery hook mounted</p>; }
function HomeDriver() { const handle = useHomeDiscovery(); useEffect(() => publish(handle)); return <p>{handle.isFetching ? 'Loading discovery' : 'Discovery ready'}</p>; }
function Sync() {
  const audioRef = useRef(null);
  useEffect(() => { audioRef.current = new Audio(); audioRef.current.currentTime = 7; }, []);
  const setTime = useCallback(time => { window.hydratedTime = time; player.getState().setProgress(time * 1000); }, []);
  const handle = usePlayerSync(audioRef, setTime); useEffect(() => publish(handle)); return <p>{handle.isHydrated ? 'Player hydrated' : 'Loading player'}</p>;
}
function Collection() { const handle = useSpotifyCollection(); useEffect(() => publish(handle)); return <p>Collection hook mounted</p>; }
async function mount(Component) { window.handle = null; flushSync(() => root.render(<Component />)); await sleep(30); }
async function reset() {
  flushSync(() => root.render(null));
  window.fixtureNative = false; window.fixtureToasts = []; window.fixtureWrites = []; window.fixtureDeletes = []; window.fixtureUpdate = null;
  window.fixtureSnapshot = null; window.hydratedTime = null;
  setUser(alice); player.getState().reset(); home.getState().resetForUser('alice');
  likes.getState().bindUser('alice'); likes.setState({ likedTracks: [], likedPlaylistId: null });
  library.setState({ recentPlaylists: [] });
  window.fetch = async () => response({});
}
const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('Fresh autoplay starts a playable recommendation and sends metadata without audio payloads', async () => {
  let body;
  window.fetch = async (_url, options) => { body = JSON.parse(options.body); return response({ tracks: [recommendation] }); };
  await mount(Discovery);
  await window.handle.triggerAutoplay(seed);
  assert(player.getState().currentTrack.id === next.id);
  assert(player.getState().currentTrack.url === next.url);
  assert(!('url' in body.seed) && !('encoded' in body.seed));
});

for (const action of ['play', 'queue', 'pause', 'party', 'account']) test('Delayed autoplay cannot overwrite ' + action, async () => {
  const request = deferred(); let started = false;
  window.fetch = async () => { started = true; return request.promise; };
  await mount(Discovery); const pending = window.handle.triggerAutoplay(seed); await until(() => started);
  if (action === 'play') player.getState().playPlaylist([manual, next]);
  if (action === 'queue') player.getState().addToQueue(manual);
  if (action === 'pause') player.getState().pause();
  if (action === 'party') player.getState().setParty('OTHER', false);
  if (action === 'account') { likes.getState().bindUser('bob'); home.getState().resetForUser('bob'); flushSync(() => setUser(bob)); }
  request.resolve(response({ tracks: [recommendation] })); await pending;
  assert(player.getState().currentTrack?.id !== next.id, action + ' was overwritten');
  if (action === 'play') { assert(player.getState().currentTrack.id === manual.id); assert(player.getState().queue.length === 1); }
  if (action === 'queue') assert(player.getState().queue[0].id === manual.id);
});

test('Seed-only and empty radio results stop cleanly without looping', async () => {
  window.fetch = async () => response({ tracks: [{ ...seed, encoded: seed.url }] });
  await mount(Discovery); await window.handle.triggerAutoplay(seed);
  assert(player.getState().currentTrack === null);
  window.fetch = async () => response({ tracks: [] });
  await window.handle.triggerAutoplay(seed); assert(player.getState().currentTrack === null);
});

test('Cancelled track resolution can revisit the same song and preserve normalized duration', async () => {
  const old = deferred(); let count = 0;
  window.fetch = async () => { count++; if (count === 1) return old.promise; return response({ tracks: [{ encoded: 'resolved', info: { identifier: next.id, duration: 190000 } }] }); };
  player.getState().play({ ...seed, url: '', duration: 0 });
  await mount(Discovery); await until(() => count === 1);
  flushSync(() => player.getState().play(manual));
  flushSync(() => player.getState().play({ ...seed, url: '', duration: 0 }));
  await until(() => player.getState().currentTrack?.url === 'resolved');
  old.resolve(response({ tracks: [{ encoded: 'stale', info: { identifier: seed.id, duration: 1 } }] }));
  await sleep(30);
  assert(player.getState().currentTrack.url === 'resolved');
  assert(player.getState().currentTrack.duration === 190000);
});

test('Track resolution preserves the legacy flat-array response contract', async () => {
  window.fetch = async () => response([{ id: next.id, duration: 175000, encoded: 'flat-result' }]);
  player.getState().play({ ...seed, url: '', duration: 0 });
  await mount(Discovery); await until(() => player.getState().currentTrack?.url === 'flat-result');
  assert(player.getState().currentTrack.identifier === next.id && player.getState().currentTrack.duration === 175000);
});

test('Home retains successful sections and retries a failed section', async () => {
  const bodies = [];
  window.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); bodies.push(body);
    if (bodies.length === 1) { const data = homeData(); delete data.newReleases; data.unavailable = ['newReleases']; return response(data); }
    return response({ newReleases: [display], unavailable: [] });
  };
  await mount(HomeDriver);
  await until(() => home.getState().unavailable.includes('newReleases'));
  assert(home.getState().recommendations.length === 1 && !home.getState().hasFetched);
  await until(() => home.getState().hasFetched, 'home retry', 4500);
  assert(bodies.length === 2 && JSON.stringify(bodies[1].sections) === '["newReleases"]');
});

test('Initial home network failure retries instead of permanently marking fetched', async () => {
  let calls = 0;
  window.fetch = async () => ++calls === 1 ? response({}, 503) : response(homeData());
  await mount(HomeDriver); assert(!home.getState().hasFetched);
  await until(() => home.getState().hasFetched, 'network retry', 4500);
  assert(calls === 2);
});

test('Account switch clears personalized home/likes and ignores an older home response', async () => {
  const old = deferred(); let calls = 0;
  likes.getState().addLikedTrack(normalizeToFirebaseTrack(seed));
  home.getState().setGenre('rock');
  window.fetch = async (_url, options) => { calls++; if (options.headers.Authorization.endsWith('alice')) return old.promise; return response({ ...homeData(), recommendations: [{ ...display, name: 'Bob song' }] }); };
  await mount(HomeDriver); await until(() => calls > 0);
  home.getState().resetForUser('bob'); likes.getState().bindUser('bob'); flushSync(() => setUser(bob));
  await until(() => home.getState().recommendations[0]?.name === 'Bob song');
  old.resolve(response(homeData())); await sleep(40);
  assert(home.getState().recommendations[0].name === 'Bob song');
  assert(likes.getState().likedTracks.length === 0 && home.getState().genre === 'pop');
});

test('Home preferences feed both discovery and autoplay', async () => {
  home.getState().setGenre('jazz'); home.getState().setLanguage('Hindi'); const bodies = [];
  window.fetch = async (_url, options) => { bodies.push(JSON.parse(options.body)); return response({ tracks: [recommendation] }); };
  await mount(Discovery); await window.handle.triggerAutoplay(seed);
  assert(bodies[0].language === 'Hindi' && bodies[0].genre === 'jazz');
});

test('Hydration retries a failed read and uses native playback progress when saving', async () => {
  window.fixtureNative = true; let reads = 0; let saved;
  window.fetch = async (_url, options) => {
    if (options.method === 'POST') { saved = JSON.parse(options.body).state; return response({ success: true }); }
    if (++reads === 1) return response({}, 500);
    return response({ state: { currentTrack: seed, queue: [next], history: [], currentTime: 42.5 } });
  };
  await mount(Sync); assert(!window.handle.isHydrated);
  await until(() => window.handle.isHydrated, 'hydration retry');
  assert(reads === 2 && window.hydratedTime === 42.5);
  player.getState().setProgress(85300); await sleep(20);
  await window.handle.syncStateToServer();
  assert(saved.currentTime === 85.3, 'native progress saved incorrectly');
  assert(saved.queue[0].id === next.id);
});

test('Delayed hydration preserves a manual selection', async () => {
  const old = deferred();
  window.fetch = async () => old.promise;
  await mount(Sync); player.getState().play(manual);
  old.resolve(response({ state: { currentTrack: seed, history: [], queue: [next], currentTime: 42 } }));
  await until(() => window.handle.isHydrated);
  assert(player.getState().currentTrack.id === manual.id && player.getState().queue.length === 0);
});

test('Hydration is disabled again after switching accounts', async () => {
  const second = deferred();
  window.fetch = async (_url, options) => options.headers.Authorization.endsWith('alice') ? response({ state: { currentTrack: seed, currentTime: 11 } }) : second.promise;
  await mount(Sync); await until(() => window.handle.isHydrated);
  flushSync(() => setUser(bob)); await sleep(30);
  assert(!window.handle.isHydrated && player.getState().currentTrack === null);
  second.resolve(response({ state: { currentTrack: manual, currentTime: 12 } }));
  await until(() => window.handle.isHydrated);
  assert(player.getState().currentTrack.id === manual.id);
});

test('Signing back into the same account waits for a new hydration read', async () => {
  const pending = deferred(); let reads = 0;
  window.fetch = async () => ++reads === 1 ? response({ state: { currentTrack: seed } }) : pending.promise;
  await mount(Sync); await until(() => window.handle.isHydrated);
  flushSync(() => setUser(null)); await sleep(20);
  flushSync(() => setUser(alice)); await sleep(20);
  assert(!window.handle.isHydrated);
  pending.resolve(response({ state: null })); await until(() => window.handle.isHydrated);
});

test('A delayed mix cannot replace a newer manual selection', async () => {
  const pending = deferred(); window.fetch = async () => pending.promise;
  await mount(Collection); const request = window.handle.handlePlayCollection(mix);
  await sleep(20); player.getState().play(manual);
  pending.resolve(response(mix)); await request;
  assert(player.getState().currentTrack.id === manual.id);
});

test('Generated mixes play, save their collection context and import without Spotify', async () => {
  const urls = []; window.fetch = async url => { urls.push(url); return response(mix); };
  await mount(Collection);
  await window.handle.handlePlayCollection(mix);
  assert(player.getState().currentTrack.url === next.url);
  assert(player.getState().currentTrack.source === 'youtube');
  assert(player.getState().activeCollectionId === mix.id);
  assert(library.getState().recentPlaylists[0].id === mix.id);
  await window.handle.handleImportSpotifyPlaylist(mix);
  assert(window.fixtureWrites[0].data.tracks[0].encoded === next.url);
  assert(window.fixtureWrites[0].data.tracks[0].info.sourceName === 'youtube');
  assert(urls.every(url => url.startsWith('/api/discovery/mixes/')));
});

test('Existing playlist queue, previous, repeat, shuffle and locked party behavior remain intact', async () => {
  player.getState().playPlaylist([seed, next, manual], 'existing', 'custom');
  player.getState().playNext(); assert(player.getState().currentTrack.id === next.id);
  player.getState().playPrevious(); assert(player.getState().currentTrack.id === seed.id);
  player.getState().toggleRepeat(); player.getState().playNext(); assert(player.getState().currentTrack.id === seed.id);
  player.getState().toggleRepeat(); player.getState().toggleShuffle(); player.getState().playNext();
  assert([next.id, manual.id].includes(player.getState().currentTrack.id)); assert(player.getState().queue.length === 1);
  const current = player.getState().currentTrack;
  player.getState().setParty('LOCKED', false); player.getState().play(seed);
  assert(player.getState().currentTrack === current);
});

test('Source and duration survive legacy library normalization and UI mapping', async () => {
  const track = mapSpotifyTrackToPlayerTrack(display);
  assert(track.source === 'youtube' && track.url === next.url && track.duration === 180000);
  const normalized = normalizeToFirebaseTrack({ ...track, duration: 123000 });
  assert(normalized.info.sourceName === 'youtube' && normalized.info.duration === 123000);
  assert(normalizeToFirebaseTrack({ id: 'a'.repeat(22), title: 'Old Spotify', artist: 'Artist' }).info.sourceName === 'spotify');
});

test('Failed liked-song merge preserves duplicate documents instead of losing songs', async () => {
  window.fixtureUpdate = async () => { throw Error('simulated write failure'); };
  await mount(LikedSongsSync);
  const docs = [seed, next].map((track, i) => ({ id: 'doc' + i, data: () => ({ isLikedSongs: true, tracks: [normalizeToFirebaseTrack(track)] }) }));
  await window.fixtureSnapshot({ docs });
  assert(window.fixtureDeletes.length === 0);
});

test('Delayed liked-song snapshot cannot update another account', async () => {
  const updating = deferred(); window.fixtureUpdate = () => updating.promise;
  await mount(LikedSongsSync);
  const pending = window.fixtureSnapshot({ docs: [{ id: 'alice-likes', data: () => ({ name: 'Liked Songs', tracks: [normalizeToFirebaseTrack(seed)] }) }] });
  likes.getState().bindUser('bob'); flushSync(() => setUser(bob));
  updating.resolve(); await pending;
  assert(likes.getState().likedPlaylistId === null && likes.getState().likedTracks.length === 0);
});

window.runResults = [];
window.runComplete = false;
window.fixtureToasts = [];
if (location.pathname === '/home') {
  home.getState().resetForUser('alice'); likes.getState().bindUser('alice');
  window.fixtureRequests = [];
  window.fetch = async (url, options) => { window.fixtureRequests.push({ url, body: options?.body ? JSON.parse(options.body) : null }); return response(String(url).includes('/mixes/') ? mix : homeData()); };
  root.render(<Home />);
  window.playerStore = player; window.homeStore = home;
} else {
  (async () => {
    for (const { name, run } of tests) {
      await reset();
      try { await run(); window.runResults.push({ name, passed: true }); }
      catch (error) { window.runResults.push({ name, passed: false, error: error.stack }); }
      document.getElementById('results').innerText = window.runResults.map(r => `${r.passed ? 'PASS' : 'FAIL'} ${r.name}${r.error ? '\n' + r.error : ''}`).join('\n');
    }
    await reset(); window.runComplete = true;
  })();
}
