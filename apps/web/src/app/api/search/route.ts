import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis/client';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    
    // Check Redis cache first
    let cachedResults;
    try {
      cachedResults = await redis.get(cacheKey);
    } catch (redisError) {
      console.error('Redis get error:', redisError);
      // Fallback to not using cache if redis fails
    }
    
    if (cachedResults) {
      return NextResponse.json(cachedResults);
    }

    // Not in cache, fetch from Lavalink Backend
    const backendRes = await fetch(
      `http://localhost:3001/api/search?q=${encodeURIComponent(query)}`
    );
    
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'Backend search failed' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    // Cache the successful results in Upstash Redis for 1 hour
    if (data && data.tracks && data.tracks.length > 0) {
      try {
        await redis.set(cacheKey, data, { ex: 3600 });
      } catch (redisError) {
        console.error('Redis set error:', redisError);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
