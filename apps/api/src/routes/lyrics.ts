import { Router, Request, Response } from 'express';
import { Redis } from '@upstash/redis';
import { Client as GeniusClient } from 'genius-lyrics';

const router = Router();
const genius = new GeniusClient(process.env.GENIUS_LYRICS_API);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const MAX_PARAM_LENGTH = 300;

function sanitizeParam(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PARAM_LENGTH) return null;
  return trimmed;
}

/**
 * Cleans lyrics text from Genius-style metadata like [Verse 1], [Chorus], etc.
 */
function cleanLyrics(text: string): string {
  return text
    .replace(/\[.*?\]/g, '') // Remove [Verse 1], [Chorus], etc.
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
}

/**
 * Cleans the search query to improve Genius search results
 */
function cleanSearchQuery(term: string): string {
  return term.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
}

function getBigrams(str: string): string[] {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bigrams = [];
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.push(s.substring(i, i + 2));
  }
  return bigrams;
}

function stringSimilarity(str1: string, str2: string): number {
  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);
  
  if (bg1.length === 0 && bg2.length === 0) return 1;
  if (bg1.length === 0 || bg2.length === 0) return 0;
  
  let intersection = 0;
  const bg2Copy = [...bg2];
  
  for (const bg of bg1) {
    const index = bg2Copy.indexOf(bg);
    if (index !== -1) {
      intersection++;
      bg2Copy.splice(index, 1);
    }
  }
  
  return (2.0 * intersection) / (bg1.length + bg2.length);
}

async function fetchFromGenius(trackName: string, artistName: string) {
  try {
    let cleanTrack = cleanSearchQuery(trackName);
    // Take only the first artist to prevent Genius from failing on long lists
    let primaryArtist = artistName.split(/,|&|feat\.|ft\./i)[0].trim();
    
    let query = '';
    if (trackName.includes('-')) {
      // YouTube titles often use "Artist - Song". If present, parse it to score correctly.
      const parts = trackName.split('-');
      if (parts.length >= 2) {
        primaryArtist = parts[0].trim();
        cleanTrack = parts.slice(1).join('-').trim();
      }
      query = cleanTrack;
    } else {
      query = `${cleanTrack} ${primaryArtist}`.trim();
    }
    
    console.log(`[Lyrics] Genius Fallback: Searching for "${query}"`);
    
    let searches = await genius.songs.search(query);
    
    // If no results, try just the track name
    if (searches.length === 0) {
      console.log(`[Lyrics] Genius Fallback: No results, trying "${cleanTrack}"`);
      searches = await genius.songs.search(cleanTrack);
    }
    
    if (searches.length > 0) {
      const candidates = searches.slice(0, 5);
      
      let bestSong = candidates[0];
      let bestScore = -1;

      candidates.forEach(s => {
        // Score against the parsed track and artist, not the dirty original ones
        const titleScore = stringSimilarity(cleanTrack, s.title);
        const artistScore = stringSimilarity(primaryArtist, s.artist.name);
        
        // Title is slightly more important, but artist helps differentiate covers/remixes
        const totalScore = (titleScore * 0.65) + (artistScore * 0.35);
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestSong = s;
        }
      });

      console.log(`[Lyrics] Genius Best Match: "${bestSong.title}" by "${bestSong.artist.name}" (Score: ${bestScore.toFixed(2)})`);
      
      const lyrics = await bestSong.lyrics();
      
      if (lyrics) {
        return {
          plainLyrics: cleanLyrics(lyrics),
          syncedLyrics: null,
          trackName: bestSong.title,
          artistName: bestSong.artist.name,
          albumName: null,
          duration: null,
          instrumental: false,
          lang: null,
          isrc: null,
          spotifyId: null,
          releaseDate: null,
          source: 'genius'
        };
      }
    }
  } catch (error) {
    console.error('[Lyrics] Genius error:', error);
  }
  return null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const track_name = sanitizeParam(req.query.track_name);
    const artist_name = sanitizeParam(req.query.artist_name);
    const album_name = sanitizeParam(req.query.album_name);
    const duration = sanitizeParam(req.query.duration);

    if (!track_name || !artist_name) {
      return res
        .status(400)
        .json({ error: 'Missing or invalid track_name / artist_name' });
    }

    const cacheKey = `lyrics:${track_name.toLowerCase()}:${artist_name.toLowerCase()}`;
    
    // Check cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // If it's a "not_found" marker, return 404
        if ((cached as any).error === 'not_found') {
          return res.status(404).json({ error: 'Lyrics not found' });
        }
        return res.json(cached);
      }
    } catch (redisErr) {
      console.warn('[Lyrics] Redis error (ignoring):', redisErr);
    }

    // 1. Try LRCLIB
    let lrclibData = null;
    try {
      const url = new URL('https://lrclib.net/api/get');
      url.searchParams.append('track_name', track_name);
      url.searchParams.append('artist_name', artist_name);
      if (album_name) url.searchParams.append('album_name', album_name);
      if (duration) url.searchParams.append('duration', duration);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': 'Melofy (https://github.com/ShreyJaiswal1/melofy)' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        lrclibData = await response.json();
      } else if (response.status !== 404) {
        console.warn(`[Lyrics] LRCLIB non-404 error: ${response.status}`);
      }
    } catch (lrclibErr) {
      console.error('[Lyrics] LRCLIB error:', lrclibErr);
    }

    // 2. If LRCLIB failed or returned empty, try Genius
    if (!lrclibData || (!lrclibData.syncedLyrics && !lrclibData.plainLyrics)) {
      const geniusData = await fetchFromGenius(track_name, artist_name);
      if (geniusData) {
        await redis.set(cacheKey, geniusData, { ex: 86400 }); // Cache for 24h
        return res.json(geniusData);
      }
    } else {
      // Return LRCLIB data
      await redis.set(cacheKey, { ...lrclibData, source: 'lrclib' }, { ex: 86400 });
      return res.json({ ...lrclibData, source: 'lrclib' });
    }

    // 3. Still nothing? Cache 404
    await redis.set(cacheKey, { error: 'not_found' }, { ex: 3600 });
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

