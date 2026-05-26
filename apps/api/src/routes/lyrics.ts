import { Router, Request, Response as ExpressResponse } from 'express';
import { Redis } from '@upstash/redis';

const router = Router();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PARAM_LENGTH = 300;
const LRCLIB_TIMEOUT_MS = 8000;
const GENIUS_TIMEOUT_MS = 10000;

/**
 * Minimum bigram-similarity score (0–1) required before we accept a Genius
 * result. Below this we treat Genius as having found nothing, avoiding garbage
 * lyrics from completely unrelated songs.
 */
const MIN_GENIUS_SIMILARITY = 0.4;

/** Browser-like headers used for every Genius HTTP request (same as NodeLink). */
const GENIUS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
} as const;

/**
 * Patterns that strip YouTube / streaming-platform noise from track titles and
 * artist names before building the Genius query (ported from NodeLink).
 */
const CLEAN_PATTERNS = [
  /\s*\([^)]*(?:official|lyrics?|video|audio|mv|visualizer|color\s*coded|hd|4k|prod\.)[^)]*\)/gi,
  /\s*\[[^\]]*(?:official|lyrics?|video|audio|mv|visualizer|color\s*coded|hd|4k|prod\.)[^\]]*\]/gi,
  /\s*-\s*Topic$/i,
  /VEVO$/i,
] as const;

// Regexes used while extracting / cleaning the Genius song-page HTML
const PRELOADED_STATE_REGEX =
  /<script[^>]*>\s*window\.__PRELOADED_STATE__\s*=\s*JSON\.parse\((.+?)\);\s*<\/script>/s;
const BREAK_TAG_REGEX = /<br\s*\/?>/gi;
const HTML_TAG_REGEX = /<[^>]*>/g;
const HTML_ENTITY_REGEX = /&(?:amp|quot|apos|lt|gt|#39|#x27);/gi;

// ---------------------------------------------------------------------------
// Lightweight JSON-traversal helpers (same pattern as NodeLink)
// ---------------------------------------------------------------------------

type JsonValue = JsonRecord | JsonValue[] | string | number | boolean | null;
interface JsonRecord { [key: string]: JsonValue | undefined }

function getRecordFromValue(v: JsonValue | undefined): JsonRecord | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  return v;
}
function getRecordValue(r: JsonRecord | null, key: string): JsonValue | undefined {
  return r?.[key];
}
function getString(v: JsonValue | undefined): string | null {
  return typeof v === 'string' ? v : null;
}
function getArray(v: JsonValue | undefined): JsonValue[] | null {
  return Array.isArray(v) ? v : null;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function sanitizeParam(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PARAM_LENGTH) return null;
  return trimmed;
}

/**
 * Strips YouTube / VEVO / production noise from a title or artist string
 * before it is sent to Genius.  Ported 1-to-1 from NodeLink.
 */
function cleanMetadata(text: string): string {
  let result = text;
  for (const pattern of CLEAN_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/**
 * Returns the primary artist (first name before commas, ampersands or feat.
 * tags) to keep the Genius query tight.
 */
function primaryArtist(artistName: string): string {
  return artistName.split(/,|&|feat\.|ft\./i)[0].trim();
}

/**
 * Builds the Genius search query.  If the title already starts with the
 * artist name we avoid duplicating it (same logic as NodeLink).
 */
function buildSearchQuery(trackName: string, artistName: string): { query: string; title: string; author: string } {
  const title  = cleanMetadata(trackName);
  const author = cleanMetadata(primaryArtist(artistName));
  const query  =
    author.length > 0 && !title.toLowerCase().startsWith(author.toLowerCase())
      ? `${title} ${author}`
      : title;
  return { query, title, author };
}

// ---------------------------------------------------------------------------
// Bigram similarity – used for LRCLIB candidate ranking and Genius threshold
// ---------------------------------------------------------------------------

function getBigrams(str: string): string[] {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const result: string[] = [];
  for (let i = 0; i < s.length - 1; i++) result.push(s.substring(i, i + 2));
  return result;
}

function stringSimilarity(a: string, b: string): number {
  const bg1 = getBigrams(a);
  const bg2 = getBigrams(b);
  if (bg1.length === 0 && bg2.length === 0) return 1;
  if (bg1.length === 0 || bg2.length === 0) return 0;
  let intersection = 0;
  const bg2Copy = [...bg2];
  for (const bg of bg1) {
    const idx = bg2Copy.indexOf(bg);
    if (idx !== -1) { intersection++; bg2Copy.splice(idx, 1); }
  }
  return (2.0 * intersection) / (bg1.length + bg2.length);
}

// ---------------------------------------------------------------------------
// Genius direct-scrape helpers (ported from NodeLink genius.ts)
// ---------------------------------------------------------------------------

/**
 * Parses the Genius multi-search JSON payload and returns the `path` of the
 * first song hit (e.g. "/artist-name-song-name-lyrics").
 */
function extractSearchHitPath(body: string): string | null {
  let payload: JsonValue;
  try { payload = JSON.parse(body) as JsonValue; }
  catch { return null; }

  const root     = getRecordFromValue(payload);
  const response = getRecordFromValue(getRecordValue(root, 'response'));
  const sections = getArray(getRecordValue(response, 'sections'));
  if (!sections) return null;

  for (const sectionVal of sections) {
    const section = getRecordFromValue(sectionVal);
    if (getString(getRecordValue(section, 'type')) !== 'song') continue;

    const hits = getArray(getRecordValue(section, 'hits'));
    if (!hits || hits.length === 0) continue;

    const firstHit = getRecordFromValue(hits[0]);
    const result   = getRecordFromValue(getRecordValue(firstHit, 'result'));
    const path     = getString(getRecordValue(result, 'path'));
    if (path) return path;
  }
  return null;
}

/**
 * Extracts the lyrics HTML from the embedded `window.__PRELOADED_STATE__`
 * script block in a Genius song page (same strategy as NodeLink).
 */
function extractLyricsHtml(html: string): string | null {
  const match = html.match(PRELOADED_STATE_REGEX);
  const arg   = match?.[1];
  if (!arg) {
    console.log('[Lyrics] Genius Parser: __PRELOADED_STATE__ script tag pattern not matched in HTML.');
    return null;
  }

  try {
    const parse = new Function(`return JSON.parse(${arg})`) as () => JsonValue;
    const payload = parse();

    const root         = getRecordFromValue(payload);
    const songPage     = getRecordFromValue(getRecordValue(root, 'songPage'));
    if (!songPage) {
      console.warn('[Lyrics] Genius Parser: "songPage" property missing in preloaded state payload.');
      return null;
    }
    const lyricsData   = getRecordFromValue(getRecordValue(songPage, 'lyricsData'));
    if (!lyricsData) {
      console.warn('[Lyrics] Genius Parser: "lyricsData" property missing in preloaded state songPage.');
      return null;
    }
    const body         = getRecordFromValue(getRecordValue(lyricsData, 'body'));
    if (!body) {
      console.warn('[Lyrics] Genius Parser: "body" property missing in preloaded state lyricsData.');
      return null;
    }
    const htmlVal      = getString(getRecordValue(body, 'html'));
    if (!htmlVal) {
      console.warn('[Lyrics] Genius Parser: "html" body string missing in preloaded state body.');
      return null;
    }
    return htmlVal;
  } catch (err: any) {
    console.error('[Lyrics] Genius Parser: Failed to parse __PRELOADED_STATE__ JSON payload:', err?.message || err);
    return null;
  }
}

/**
 * Extracts lyrics from the Genius song page HTML by looking for data-lyrics-container divs.
 * This is a robust fallback when the embedded __PRELOADED_STATE__ script is missing or fails to parse.
 */
function extractLyricsHtmlFallback(html: string): string | null {
  const containerRegex = /<div[^>]+data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi;
  const matches = [...html.matchAll(containerRegex)];
  
  if (matches.length === 0) {
    // Fallback to older container class name
    const oldRegex = /<div[^>]+class="lyrics"[^>]*>([\s\S]*?)<\/div>/gi;
    const oldMatches = [...html.matchAll(oldRegex)];
    if (oldMatches.length > 0) {
      console.log('[Lyrics] Genius Parser Fallback: Found lyrics in legacy "lyrics" class container.');
      return oldMatches.map(m => m[1]).join('\n');
    }
    return null;
  }
  
  console.log(`[Lyrics] Genius Parser Fallback: Found ${matches.length} "data-lyrics-container" containers.`);
  return matches.map(m => m[1]).join('\n');
}

/**
 * Decodes the small set of HTML entities that appear in Genius lyrics.
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(HTML_ENTITY_REGEX, (entity) => {
    switch (entity.toLowerCase()) {
      case '&amp;':  return '&';
      case '&quot;': return '"';
      case '&apos;':
      case '&#39;':
      case '&#x27;': return "'";
      case '&lt;':   return '<';
      case '&gt;':   return '>';
      default:       return entity;
    }
  });
}

/**
 * Converts raw Genius lyrics HTML into a clean plain-text string.
 * 1. Replaces <br> tags with newlines.
 * 2. Strips all remaining HTML tags.
 * 3. Decodes HTML entities.
 * 4. Normalises excess blank lines.
 */
function parseLyricsHtml(lyricsHtml: string): string {
  return lyricsHtml
    .replace(BREAK_TAG_REGEX, '\n')
    .replace(HTML_TAG_REGEX, '')
    .split('\n')
    .map((line) => decodeHtmlEntities(line).trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// LRCLIB helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries LRCLIB /api/get first (exact match with duration).
 * If that returns 404 or has no lyrics, falls back to /api/search and picks
 * the highest-scoring result using bigram similarity.
 */
async function fetchFromLrclib(
  trackName: string,
  artistName: string,
  albumName: string | null,
  duration: string | null,
): Promise<Record<string, unknown> | null> {  // eslint-disable-line
  const UA = { 'User-Agent': 'Melofy (https://github.com/ShreyJaiswal1/melofy)' };

  // --- 1. Exact match via /api/get ---
  try {
    const exactUrl = new URL('https://lrclib.net/api/get');
    exactUrl.searchParams.append('track_name', trackName);
    exactUrl.searchParams.append('artist_name', artistName);
    if (albumName) exactUrl.searchParams.append('album_name', albumName);
    if (duration)  exactUrl.searchParams.append('duration', duration);

    const res = await fetchWithTimeout(exactUrl.toString(), { headers: UA }, LRCLIB_TIMEOUT_MS);
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      if (data.syncedLyrics || data.plainLyrics) {
        console.log('[Lyrics] LRCLIB /api/get hit');
        return data;
      }
    } else if (res.status !== 404) {
      console.warn(`[Lyrics] LRCLIB /api/get non-404 error: ${res.status}`);
    }
  } catch (err) {
    console.error('[Lyrics] LRCLIB /api/get error:', err);
  }

  // --- 2. Fuzzy fallback via /api/search ---
  try {
    const searchUrl = new URL('https://lrclib.net/api/search');
    searchUrl.searchParams.append('track_name', trackName);
    searchUrl.searchParams.append('artist_name', primaryArtist(artistName));

    const res = await fetchWithTimeout(searchUrl.toString(), { headers: UA }, LRCLIB_TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[Lyrics] LRCLIB /api/search error: ${res.status}`);
      return null;
    }

    const results = await res.json() as Record<string, unknown>[];
    if (!Array.isArray(results) || results.length === 0) return null;

    // Pick best candidate by bigram similarity
    let best: Record<string, unknown> | null = null;
    let bestScore = -1;

    for (const candidate of results.slice(0, 10)) {
      const titleScore  = stringSimilarity(trackName,  String(candidate.trackName  ?? ''));
      const artistScore = stringSimilarity(primaryArtist(artistName), String(candidate.artistName ?? ''));
      const total = (titleScore * 0.65) + (artistScore * 0.35);
      if (total > bestScore) { bestScore = total; best = candidate; }
    }

    if (best && bestScore >= MIN_GENIUS_SIMILARITY && (best.syncedLyrics || best.plainLyrics)) {
      console.log(`[Lyrics] LRCLIB /api/search best match: "${best.trackName}" score=${bestScore.toFixed(2)}`);
      return best;
    }
  } catch (err) {
    console.error('[Lyrics] LRCLIB /api/search error:', err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Genius direct-scrape (NodeLink strategy, no npm package)
// ---------------------------------------------------------------------------

async function fetchFromGenius(
  trackName: string,
  artistName: string,
): Promise<{ plainLyrics: string; syncedLyrics: null; trackName: string; artistName: string; albumName: null; duration: null; instrumental: boolean; lang: null; isrc: null; spotifyId: null; releaseDate: null; source: string } | null> {
  const queriesToTry: { query: string; title: string; author: string }[] = [];

  // 1. Try standard query first
  queriesToTry.push(buildSearchQuery(trackName, artistName));

  // 2. Fallback: If track name has a hyphen (e.g. "Artist - Song (Lyrics)"), add the split query
  if (trackName.includes('-')) {
    const parts = trackName.split('-');
    if (parts.length >= 2) {
      const leftPart = parts[0].trim();
      const rightPart = parts.slice(1).join('-').trim();

      const fallbackTitle = cleanMetadata(rightPart);
      const fallbackAuthor = cleanMetadata(primaryArtist(leftPart));

      if (fallbackTitle && fallbackAuthor) {
        const fallbackQuery = `${fallbackTitle} ${fallbackAuthor}`;
        const standardQueryObj = queriesToTry[0];
        if (fallbackQuery.toLowerCase() !== standardQueryObj.query.toLowerCase()) {
          queriesToTry.push({
            query: fallbackQuery,
            title: fallbackTitle,
            author: fallbackAuthor
          });
        }
      }
    }
  }

  console.log(`[Lyrics] Genius: Search queries queue: ${JSON.stringify(queriesToTry.map(q => q.query))}`);

  for (let attempt = 0; attempt < queriesToTry.length; attempt++) {
    const { query, title, author } = queriesToTry[attempt];
    console.log(`[Lyrics] Genius: searching for "${query}" (attempt ${attempt + 1}/${queriesToTry.length})`);

    try {
      // Step 1: Search Genius multi-search API
      const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`;
      console.log(`[Lyrics] Genius: Fetching search API from ${searchUrl}`);
      const searchRes = await fetchWithTimeout(searchUrl, { method: 'GET', headers: { ...GENIUS_HEADERS } }, GENIUS_TIMEOUT_MS);

      if (!searchRes.ok) {
        const errorText = await searchRes.text().catch(() => '');
        console.warn(
          `[Lyrics] Genius search API returned status ${searchRes.status}. ` +
          `Headers: ${JSON.stringify(Object.fromEntries(searchRes.headers.entries()))}. ` +
          `Body snippet: ${errorText.substring(0, 500)}`
        );
        continue;
      }

      const searchBody = await searchRes.text();
      const songPath   = extractSearchHitPath(searchBody);

      if (!songPath) {
        console.log(`[Lyrics] Genius: no song hit found in search results payload for query "${query}".`);
        continue;
      }

      // Step 2: Validate similarity BEFORE fetching the page to avoid useless scrape
      // The path is like "/artist-name-song-name-lyrics" — extract the name slug
      const pathSlug = songPath.replace(/^\//, '').replace(/-lyrics$/, '').replace(/-/g, ' ');
      const titleScore  = stringSimilarity(title,  pathSlug);
      const authorScore = stringSimilarity(author, pathSlug);
      const matchScore  = Math.max(titleScore, (titleScore * 0.65) + (authorScore * 0.35));

      console.log(`[Lyrics] Genius candidate found: "${songPath}" (slug similarity=${matchScore.toFixed(2)})`);

      if (matchScore < MIN_GENIUS_SIMILARITY) {
        console.log(`[Lyrics] Genius: rejected match — score ${matchScore.toFixed(2)} < threshold ${MIN_GENIUS_SIMILARITY} for query "${query}"`);
        continue;
      }

      // Step 3: Fetch the song page
      const pageUrl = `https://genius.com${songPath}`;
      console.log(`[Lyrics] Genius: Fetching song page from ${pageUrl}`);
      const pageRes = await fetchWithTimeout(
        pageUrl,
        { method: 'GET', headers: { ...GENIUS_HEADERS } },
        GENIUS_TIMEOUT_MS,
      );

      if (!pageRes.ok) {
        const pageErrorText = await pageRes.text().catch(() => '');
        console.warn(
          `[Lyrics] Genius page fetch returned status ${pageRes.status}. ` +
          `Headers: ${JSON.stringify(Object.fromEntries(pageRes.headers.entries()))}. ` +
          `Body snippet: ${pageErrorText.substring(0, 500)}`
        );
        continue;
      }

      const pageHtml  = await pageRes.text();
      
      // Attempt standard preloaded state extraction first
      let lyricsHtml = extractLyricsHtml(pageHtml);
      let extractedVia = 'preloaded_state';

      // Fallback to direct HTML container scraping
      if (!lyricsHtml) {
        console.log('[Lyrics] Genius: __PRELOADED_STATE__ lyrics extraction failed. Attempting HTML containers fallback...');
        lyricsHtml = extractLyricsHtmlFallback(pageHtml);
        extractedVia = 'html_containers';
      }

      if (!lyricsHtml) {
        console.warn('[Lyrics] Genius: Failed to extract lyrics HTML using both __PRELOADED_STATE__ and HTML containers fallback.');
        continue;
      }

      const plainLyrics = parseLyricsHtml(lyricsHtml);

      if (!plainLyrics) {
        console.log(`[Lyrics] Genius: Parsed lyrics are empty (extracted via: ${extractedVia})`);
        continue;
      }

      console.log(`[Lyrics] Genius: successfully scraped lyrics for "${songPath}" (extracted via: ${extractedVia}, length: ${plainLyrics.length} chars)`);

      return {
        plainLyrics,
        syncedLyrics: null,
        trackName,
        artistName,
        albumName: null,
        duration: null,
        instrumental: false,
        lang: null,
        isrc: null,
        spotifyId: null,
        releaseDate: null,
        source: 'genius',
      };
    } catch (err: any) {
      console.error(`[Lyrics] Genius handler caught an error for query "${query}":`, err?.message || err);
      // continue to next query candidate
    }
  }

  console.log('[Lyrics] Genius: All query candidates failed to retrieve lyrics.');
  return null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

router.get('/', async (req: Request, res: ExpressResponse) => {
  try {
    const track_name  = sanitizeParam(req.query.track_name);
    const artist_name = sanitizeParam(req.query.artist_name);
    const album_name  = sanitizeParam(req.query.album_name);
    const duration    = sanitizeParam(req.query.duration);

    if (!track_name || !artist_name) {
      return res.status(400).json({ error: 'Missing or invalid track_name / artist_name' });
    }

    const cacheKey = `lyrics:${track_name.toLowerCase()}:${artist_name.toLowerCase()}`;

    // --- Cache check ---
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        if ((cached as Record<string, unknown>).error === 'not_found') {
          return res.status(404).json({ error: 'Lyrics not found' });
        }
        return res.json(cached);
      }
    } catch (redisErr) {
      console.warn('[Lyrics] Redis error (ignoring):', redisErr);
    }

    // --- 1. Try LRCLIB (exact, then fuzzy search) ---
    const lrclibData = await fetchFromLrclib(track_name, artist_name, album_name, duration);

    if (lrclibData && (lrclibData.syncedLyrics || lrclibData.plainLyrics)) {
      const payload = { ...lrclibData, source: 'lrclib' };
      try { await redis.set(cacheKey, payload, { ex: 86400 }); } catch {}
      return res.json(payload);
    }

    // --- 2. Genius fallback (NodeLink direct-scrape strategy) ---
    const geniusData = await fetchFromGenius(track_name, artist_name);

    if (geniusData) {
      try { await redis.set(cacheKey, geniusData, { ex: 86400 }); } catch {}
      return res.json(geniusData);
    }

    // --- 3. Nothing found — cache 404 for 1 h to avoid re-hammering services ---
    try { await redis.set(cacheKey, { error: 'not_found' }, { ex: 3600 }); } catch {}
    return res.status(404).json({ error: 'Lyrics not found' });

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'Lyrics service timeout' });
    }
    console.error('[Lyrics] Unhandled error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
