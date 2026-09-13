import { createHash } from 'crypto';

export interface RecommendationTrack {
  id: string;
  identifier?: string;
  title: string;
  artist: string;
  duration: number;
  artwork: string;
  encoded: string;
  uri: string;
  source: string;
  recordingMbid?: string;
  provider?: string;
}
export interface TasteProfile {
  seed?: RecommendationTrack;
  history: RecommendationTrack[];
  liked: RecommendationTrack[];
  genre: string;
  language: string;
}
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const genres = ['pop', 'rock', 'indie', 'hip-hop', 'r&b', 'electronic', 'acoustic', 'jazz', 'classical', 'lofi'];
export const languages = ['all', 'English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi', 'Spanish', 'Korean', 'Japanese'];
const videoPattern = /^[\w-]{11}$/;
const mbidPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

export function normalizeTrack(value: unknown): RecommendationTrack | null {
  const raw = object(value);
  const info = Object.keys(object(raw.info)).length ? object(raw.info) : raw;
  const title = text(info.title || info.name);
  const artist = text(info.artist || info.author);
  const id = text(raw.id || info.identifier, 120);
  if (!title || !artist || !id || /^unknown( title)?$/i.test(title)) return null;
  const duration = Number(info.duration || info.length || raw.duration_ms || 0);
  return {
    id, title, artist,
    identifier: text(info.identifier || raw.identifier, 120) || undefined,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    artwork: text(info.artworkUrl || raw.artwork || raw.artworkUrl, 1500),
    encoded: text(raw.encoded || raw.url, 16000),
    uri: text(info.uri || raw.uri, 1500),
    source: text(info.sourceName || raw.source, 40) || 'unknown',
    recordingMbid: mbidPattern.test(text(raw.recordingMbid)) ? text(raw.recordingMbid) : undefined,
    provider: text(raw.provider, 40) || undefined,
  };
}
export function parseProfile(value: unknown): TasteProfile {
  const raw = object(value);
  const list = (v: unknown) => Array.isArray(v) ? v.slice(-50).map(normalizeTrack).filter((t): t is RecommendationTrack => !!t) : [];
  return { seed: normalizeTrack(raw.seed) || undefined, history: list(raw.history), liked: list(raw.liked),
    genre: genres.includes(text(raw.genre)) ? text(raw.genre) : 'pop',
    language: languages.includes(text(raw.language)) ? text(raw.language) : 'all' };
}
export const metadataKey = (t: Pick<RecommendationTrack, 'title' | 'artist'>) => `${t.title}|${t.artist}`.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
function ids(t: RecommendationTrack) { return [t.id, t.identifier, t.recordingMbid].filter(Boolean); }
export function rankTracks(candidates: RecommendationTrack[], profile: TasteProfile, limit = 20): RecommendationTrack[] {
  const excluded = [...profile.history.slice(-20), ...(profile.seed ? [profile.seed] : [])];
  const excludedIds = new Set(excluded.flatMap(ids));
  const excludedNames = new Set(excluded.map(metadataKey));
  const favoriteArtists = new Map<string, number>();
  for (const [tracks, weight] of [[profile.history.slice(-15), 1], [profile.liked, 2]] as const) {
    for (const t of tracks) favoriteArtists.set(t.artist.toLowerCase(), Math.min(10, (favoriteArtists.get(t.artist.toLowerCase()) || 0) + weight));
  }
  const seenIds = new Set<string | undefined>();
  const seenNames = new Set<string>();
  const counts = new Map<string, number>();
  return candidates.map((track, index) => ({ track, score: (favoriteArtists.get(track.artist.toLowerCase()) || 0) + (track.encoded ? 2 : 0) - index / 100 }))
    .sort((a, b) => b.score - a.score)
    .filter(({ track }) => {
      const key = metadataKey(track);
      if (ids(track).some(id => excludedIds.has(id) || seenIds.has(id)) || excludedNames.has(key) || seenNames.has(key)) return false;
      const artist = track.artist.toLowerCase();
      if ((counts.get(artist) || 0) >= 3) return false;
      ids(track).forEach(id => seenIds.add(id)); seenNames.add(key); counts.set(artist, (counts.get(artist) || 0) + 1);
      return true;
    }).slice(0, limit).map(({ track }) => track);
}

export interface RecommendationDependencies {
  /** Must send this exact identifier to NodeLink, bypassing client prefix rewriting. */
  load: (identifier: string, signal: AbortSignal) => Promise<unknown>;
  cache?: { get: <T>(key: string) => Promise<T | null>; set: (key: string, value: unknown, options: { ex: number }) => Promise<unknown> };
  fetch?: typeof fetch;
  listenBrainz?: boolean;
}
export function createRecommendationService(deps: RecommendationDependencies) {
  const memory = new Map<string, { expires: number; tracks: RecommendationTrack[] }>();
  const inflight = new Map<string, Promise<RecommendationTrack[]>>();
  let activeLoads = 0;
  let nextLabsRequest = 0;
  let labsCooldown = 0;
  const fetcher = deps.fetch || fetch;
  async function cached(key: string, run: () => Promise<RecommendationTrack[]>, ttl = 3600) {
    const cacheKey = 'discovery:v1:' + createHash('sha256').update(key).digest('hex');
    const local = memory.get(cacheKey);
    if (local && local.expires > Date.now()) return local.tracks;
    const pending = inflight.get(cacheKey);
    if (pending) return pending;
    const work = (async () => {
      try {
        const hit = await deps.cache?.get<RecommendationTrack[]>(cacheKey);
        if (Array.isArray(hit)) {
          const valid = hit.map(normalizeTrack).filter((track): track is RecommendationTrack => !!track);
          if (valid.length) return valid;
        }
      } catch { /* Cache is optional. */ }
      const tracks = await run();
      if (tracks.length) {
        if (memory.size >= 256) memory.delete(memory.keys().next().value!);
        memory.set(cacheKey, { tracks, expires: Date.now() + ttl * 1000 });
        try { await deps.cache?.set(cacheKey, tracks, { ex: ttl }); } catch { /* Still return tracks. */ }
      }
      return tracks;
    })().finally(() => inflight.delete(cacheKey));
    inflight.set(cacheKey, work);
    return work;
  }
  async function nodeTracks(identifier: string) {
    return cached(identifier, async () => {
      if (activeLoads >= 16) throw new Error('Music source busy');
      activeLoads++;
      let raw: JsonObject;
      try { raw = object(await deps.load(identifier, AbortSignal.timeout(6000))); }
      finally { activeLoads--; }
      if (raw.loadType === 'error') throw new Error('Music source unavailable');
      if (raw.loadType === 'empty') return [];
      const data = raw.tracks || (raw.loadType === 'playlist' ? object(raw.data).tracks : raw.loadType === 'track' ? [raw.data] : raw.data);
      return (Array.isArray(data) ? data : []).map(normalizeTrack).filter((t): t is RecommendationTrack => !!t && t.duration > 0 && !!t.encoded)
        .slice(0, 80).map(t => ({ ...t, provider: identifier.startsWith('ytrec:') ? 'youtube-radio' : 'youtube-search' }));
    });
  }
  async function labs(path: string, params: Record<string, string>) {
    if (Date.now() < labsCooldown) throw new Error('Similarity service cooling down');
    const slot = Math.max(Date.now(), nextLabsRequest);
    // Bounded queue: do not accumulate long waits under traffic.
    if (slot - Date.now() > 2000) throw new Error('Similarity service busy');
    nextLabsRequest = slot + 1100;
    await new Promise(resolve => setTimeout(resolve, Math.max(0, slot - Date.now())));
    const response = await fetcher(`https://labs.api.listenbrainz.org/${path}/json?${new URLSearchParams(params)}`, {
      headers: { 'User-Agent': 'Melofy/1.0.5 (https://github.com/Jenesh11/melofy)' }, signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) labsCooldown = Date.now() + Math.max(60000, Math.min(3600000, Number(response.headers.get('retry-after')) * 1000 || 60000));
      throw new Error('Similarity service unavailable');
    }
    const result: unknown = await response.json();
    return Array.isArray(result) ? result.map(object) : [];
  }
  async function similar(seed: RecommendationTrack) {
    if (deps.listenBrainz === false) return [];
    return cached('listenbrainz:' + metadataKey(seed), async () => {
      const mbid = seed.recordingMbid || text((await labs('acr-lookup', { artist_credit_name: seed.artist, recording_name: seed.title }))[0]?.recording_mbid);
      if (!mbidPattern.test(mbid)) return [];
      const data = await labs('similar-recordings', { recording_mbids: mbid, algorithm: 'session_based_days_7500_session_300_contribution_5_threshold_15_limit_50_skip_30' });
      return data.filter(row => mbidPattern.test(text(row.recording_mbid))).slice(0, 30).map(row => normalizeTrack({
        id: `mb:${text(row.recording_mbid)}`, recordingMbid: row.recording_mbid,
        title: row.recording_name, artist: row.artist_credit_name,
        source: 'musicbrainz', provider: 'listenbrainz',
        uri: `https://musicbrainz.org/recording/${text(row.recording_mbid)}`,
      })).filter((t): t is RecommendationTrack => !!t);
    }, 86400);
  }
  const search = (query: string) => nodeTracks(`ytmsearch:${query.slice(0, 300)}`);
  async function recommend(profile: TasteProfile, limit = 20) {
    const seeds = [profile.seed, ...profile.history.slice(-6).reverse(), ...profile.liked.slice(-6).reverse()].filter((t): t is RecommendationTrack => !!t);
    const uniqueSeeds = Array.from(new Map(seeds.map(t => [metadataKey(t), t])).values()).slice(0, profile.seed ? 1 : 3);
    const candidates: RecommendationTrack[] = [];
    const failures: string[] = [];
    const attempt = async (provider: string, work: () => Promise<RecommendationTrack[]>) => {
      try { candidates.push(...await work()); } catch { failures.push(provider); }
    };
    await Promise.all(uniqueSeeds.map(seed => attempt('youtube-radio', () => {
      const videoId = [seed.identifier, seed.id].find(id => id && videoPattern.test(id));
      return nodeTracks(`ytrec:${videoId || `${seed.title} ${seed.artist}`}`);
    })));
    if (profile.language !== 'all') {
      await attempt('youtube-search', () => search(`${profile.language} ${profile.genre} songs`));
    }
    if (rankTracks(candidates, profile, limit).length < Math.min(5, limit) && uniqueSeeds[0]) {
      await attempt('listenbrainz', () => similar(uniqueSeeds[0]));
    }
    if (rankTracks(candidates, profile, limit).length < Math.min(5, limit)) {
      const language = profile.language === 'all' ? '' : profile.language;
      await attempt('youtube-search', () => search(`${language} ${uniqueSeeds[0]?.artist || ''} ${profile.genre} songs`));
    }
    const fresh = rankTracks(candidates, profile, limit);
    const tracks = rankTracks([...fresh, ...profile.liked.map(t => ({ ...t, provider: 'library' })), ...profile.history.slice(0, -20).map(t => ({ ...t, provider: 'library' }))], profile, limit);
    return { tracks, providers: [...new Set(tracks.map(t => t.provider))], degraded: failures.length > 0, unavailable: [...new Set(failures)] };
  }
  return { recommend, search, similar };
}

export function displayTrack(track: RecommendationTrack) {
  return { id: track.id, identifier: track.identifier, name: track.title, artists: [{ name: track.artist }],
    album: { name: track.title, images: track.artwork ? [{ url: track.artwork }] : [] },
    duration_ms: track.duration, encoded: track.encoded, source: track.source, uri: track.uri, recordingMbid: track.recordingMbid };
}
