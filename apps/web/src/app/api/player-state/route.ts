import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client using Upstash env variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  try {
    const data = await redis.get(`player:${userId}`);
    return NextResponse.json({ state: data || null });
  } catch (error) {
    console.error('Error fetching player state from Redis:', error);
    return NextResponse.json({ error: 'Failed to fetch player state' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, state } = body;

  if (!userId || !state) {
    return NextResponse.json({ error: 'Missing userId or state in body' }, { status: 400 });
  }

  try {
    // Overwrite the user's player state in Redis
    await redis.set(`player:${userId}`, JSON.stringify(state));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving player state to Redis:', error);
    return NextResponse.json({ error: 'Failed to save player state' }, { status: 500 });
  }
}
