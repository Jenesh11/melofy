import { Router, Request, Response } from 'express';
import { Redis } from '@upstash/redis';

const router = Router();

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

    // Check cache first
    const cacheKey = `lyrics:${track_name.toLowerCase()}:${artist_name.toLowerCase()}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const url = new URL('https://lrclib.net/api/get');
    url.searchParams.append('track_name', track_name);
    url.searchParams.append('artist_name', artist_name);

    if (album_name) {
      url.searchParams.append('album_name', album_name);
    }

    if (duration) {
      url.searchParams.append('duration', duration);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Melofy (https://github.com/ShreyJaiswal1/melofy)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        // Cache 404s for 10 minutes to avoid hammering lrclib
        await redis.set(cacheKey, { error: 'not_found' }, { ex: 600 });
        return res.status(404).json({ error: 'Lyrics not found' });
      }
      console.error(`lrclib API error: ${response.status} ${response.statusText}`);
      return res
        .status(502)
        .json({ error: 'Failed to fetch lyrics from upstream' });
    }

    const data = await response.json();

    // Cache successful lyrics for 1 hour
    await redis.set(cacheKey, data, { ex: 3600 });

    return res.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({ error: 'Lyrics service timeout' });
    }
    console.error('Lyrics fetch error:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error' });
  }
});

export default router;
