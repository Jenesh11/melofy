import { createHash } from 'crypto';
import { cleanTitle } from './sourceFallback';

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
  /** Tracks the listener skipped early: a strong negative signal. */
  skipped: RecommendationTrack[];
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
  return { seed: normalizeTrack(raw.seed) || undefined, history: list(raw.history), liked: list(raw.liked), skipped: list(raw.skipped),
    genre: genres.includes(text(raw.genre)) ? text(raw.genre) : 'pop',
    language: languages.includes(text(raw.language)) ? text(raw.language) : 'all' };
}
/** First credited artist, so "Pritam, Arijit Singh" and "Pritam" count together. */
const primaryArtist = (artist: string) => artist.split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bx\b|\/)\s*/i)[0]!.trim().toLowerCase();
/** Same recording across uploads: "Song (Official Video)" == "Song". */
export const metadataKey = (t: Pick<RecommendationTrack, 'title' | 'artist'>) =>
  `${cleanTitle(t.title) || t.title}|${primaryArtist(t.artist)}`.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}|]/gu, '');
function ids(t: RecommendationTrack) { return [t.id, t.identifier, t.recordingMbid].filter(Boolean); }

/** Never what the listener asked for, unless the seed itself is one. */
const JUNK_PATTERN = /\b(?:slowed|reverb|sped\s*up|speed\s*up|nightcore|8d|bass\s*boost(?:ed)?|\d+\s*hours?|hour\s*loop|loop(?:ed)?|jukebox|mash\s*up|mashup|non\s*-?\s*stop|karaoke|ringtone|whatsapp|status|reaction|tutorial|full\s*album|audiobook|podcast|trending|reels?|shorts)\b/i;
/** Legitimate alternate versions; ranked below the original unless requested. */
const VARIANT_PATTERN = /\b(?:remix|live|cover|lofi|lo-fi|instrumental|unplugged|acoustic\s+version|reprise|extended|edit)\b/i;
const MIN_TRACK_MS = 95_000;
const MAX_TRACK_MS = 9 * 60_000;

export interface CandidateSignal {
  /** Accumulated evidence from providers (rank in a radio, multi-source agreement). */
  relevance: number;
}

function qualityFilter(profile: TasteProfile) {
  const seedText = `${profile.seed?.title || ''} ${profile.genre}`;
  const allowJunk = JUNK_PATTERN.test(seedText);
  const longForm = (profile.seed?.duration || 0) > MAX_TRACK_MS || ['classical', 'jazz'].includes(profile.genre);
  return (track: RecommendationTrack) => {
    if (!allowJunk && JUNK_PATTERN.test(track.title)) return false;
    if (track.duration > 0 && track.duration < MIN_TRACK_MS) return false;
    if (track.duration > (longForm ? MAX_TRACK_MS * 2 : MAX_TRACK_MS)) return false;
    return true;
  };
}

/** Greedy reorder so one artist never plays twice in a row when avoidable. */
function spreadArtists<T extends { track: RecommendationTrack }>(items: T[]): T[] {
  const pending = [...items];
  const ordered: T[] = [];
  while (pending.length) {
    const previous = ordered.length ? primaryArtist(ordered[ordered.length - 1]!.track.artist) : null;
    const index = pending.findIndex(item => primaryArtist(item.track.artist) !== previous);
    ordered.push(pending.splice(index >= 0 ? index : 0, 1)[0]!);
  }
  return ordered;
}

export function rankTracks(
  candidates: RecommendationTrack[],
  profile: TasteProfile,
  limit = 20,
  signals?: Map<RecommendationTrack, CandidateSignal>,
): RecommendationTrack[] {
  const excluded = [...profile.history.slice(-30), ...profile.skipped, ...(profile.seed ? [profile.seed] : [])];
  const excludedIds = new Set(excluded.flatMap(ids));
  const excludedNames = new Set(excluded.map(metadataKey));

  const affinity = new Map<string, number>();
  const bump = (artist: string, amount: number, cap: number) => {
    const key = primaryArtist(artist);
    affinity.set(key, Math.max(-cap, Math.min(cap, (affinity.get(key) || 0) + amount)));
  };
  for (const t of profile.history.slice(-15)) bump(t.artist, 0.5, 4);
  for (const t of profile.liked) bump(t.artist, 1.5, 4);
  for (const t of profile.skipped.slice(-30)) bump(t.artist, -1.5, 4.5);

  const seedText = `${profile.seed?.title || ''} ${profile.genre}`;
  const wantsVariants = VARIANT_PATTERN.test(seedText);
  const passesQuality = qualityFilter(profile);
  const seedArtist = profile.seed ? primaryArtist(profile.seed.artist) : null;

  const scored = candidates.map((track, index) => {
    const relevance = signals?.get(track)?.relevance ?? Math.max(0, 1 - index / Math.max(candidates.length, 1));
    let score = relevance * 2 + (affinity.get(primaryArtist(track.artist)) || 0) + (track.encoded ? 1 : 0) - index / 1000;
    if (!wantsVariants && VARIANT_PATTERN.test(track.title)) score -= 2;
    return { track, score };
  }).sort((a, b) => b.score - a.score);

  const seenIds = new Set<string | undefined>();
  const seenNames = new Set<string>();
  const counts = new Map<string, number>();
  const picked = scored.filter(({ track }) => {
    if (!passesQuality(track)) return false;
    const key = metadataKey(track);
    if (ids(track).some(id => excludedIds.has(id) || seenIds.has(id)) || excludedNames.has(key) || seenNames.has(key)) return false;
    const artist = primaryArtist(track.artist);
    // The seed's artist dominates YouTube radio; leave room for discovery.
    if ((counts.get(artist) || 0) >= (artist === seedArtist ? 2 : 3)) return false;
    ids(track).forEach(id => seenIds.add(id)); seenNames.add(key); counts.set(artist, (counts.get(artist) || 0) + 1);
    return true;
  }).slice(0, limit);
  return spreadArtists(picked).map(({ track }) => track);
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
    // With an explicit seed, blend in radios from recent likes/history so the
    // station stays anchored to the listener's taste rather than drifting.
    const skippedKeys = new Set(profile.skipped.map(metadataKey));
    const anchors = profile.seed ? Array.from(new Map(
      [...profile.liked.slice(-10).reverse(), ...profile.history.slice(-10).reverse()]
        .filter(t => metadataKey(t) !== metadataKey(profile.seed!) && !skippedKeys.has(metadataKey(t)))
        .map(t => [metadataKey(t), t]),
    ).values()).slice(0, 2) : [];

    const candidates: RecommendationTrack[] = [];
    const signals = new Map<RecommendationTrack, CandidateSignal>();
    const byKey = new Map<string, RecommendationTrack>();
    const failures: string[] = [];
    // Each list contributes rank-decayed evidence; songs several radios agree
    // on accumulate it, which is the strongest similarity signal available.
    const add = (tracks: RecommendationTrack[], weight: number) => {
      tracks.forEach((track, index) => {
        const evidence = weight * (1 - index / Math.max(tracks.length, 1));
        const key = metadataKey(track);
        const existing = byKey.get(key);
        // Independent lists agreeing is worth more than any single rank.
        if (existing) { signals.get(existing)!.relevance += evidence + 0.5; return; }
        byKey.set(key, track); candidates.push(track); signals.set(track, { relevance: evidence });
      });
    };
    const attempt = async (provider: string, weight: number, work: () => Promise<RecommendationTrack[]>) => {
      try { add(await work(), weight); } catch { failures.push(provider); }
    };
    const radio = (seed: RecommendationTrack) => {
      const videoId = [seed.identifier, seed.id].find(id => id && videoPattern.test(id));
      return nodeTracks(`ytrec:${videoId || `${seed.title} ${seed.artist}`}`);
    };
    // Anchors load in parallel but only count when they fit the current
    // context (their artist shows up in the seed's own radio); otherwise a
    // liked English pop song would leak into a Hindi romance station.
    const anchorResults = anchors.map(anchor => radio(anchor).then(tracks => ({ anchor, tracks })).catch(() => null));
    await Promise.all(uniqueSeeds.map(seed => attempt('youtube-radio', 1, () => radio(seed))));
    const contextArtists = new Set(candidates.map(t => primaryArtist(t.artist)));
    for (const result of await Promise.all(anchorResults)) {
      if (result && contextArtists.has(primaryArtist(result.anchor.artist))) add(result.tracks, 0.45);
    }
    if (profile.language !== 'all') {
      await attempt('youtube-search', 0.6, () => search(`${profile.language} ${profile.genre} songs`));
    }
    const enough = () => rankTracks(candidates, profile, limit, signals).length >= Math.min(5, limit);
    if (!enough() && uniqueSeeds[0]) {
      await attempt('listenbrainz', 0.8, () => similar(uniqueSeeds[0]!));
    }
    if (!enough()) {
      const language = profile.language === 'all' ? '' : profile.language;
      await attempt('youtube-search', 0.5, () => search(`${language} ${uniqueSeeds[0]?.artist || ''} ${profile.genre} songs`));
    }
    const fresh = rankTracks(candidates, profile, limit, signals);
    const library = [...profile.liked.map(t => ({ ...t, provider: 'library' })), ...profile.history.slice(0, -20).map(t => ({ ...t, provider: 'library' }))];
    // Fresh picks keep their order; the library only backfills empty slots.
    const tracks = fresh.length >= limit ? fresh : [...fresh, ...rankTracks(library, { ...profile, history: [...profile.history, ...fresh] }, limit - fresh.length)];
    return { tracks, providers: [...new Set(tracks.map(t => t.provider))], degraded: failures.length > 0, unavailable: [...new Set(failures)] };
  }
  return { recommend, search, similar };
}

export function displayTrack(track: RecommendationTrack) {
  return { id: track.id, identifier: track.identifier, name: track.title, artists: [{ name: track.artist }],
    album: { name: track.title, images: track.artwork ? [{ url: track.artwork }] : [] },
    duration_ms: track.duration, encoded: track.encoded, source: track.source, uri: track.uri, recordingMbid: track.recordingMbid };
}
