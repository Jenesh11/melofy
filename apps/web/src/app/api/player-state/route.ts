import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { verifyFirebaseUserFromRequest } from '@/lib/server/firebase-auth';

// Initialize Redis client using Upstash env variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: Request) {
  const authUser = await verifyFirebaseUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('userId');
  if (requestedUserId && requestedUserId !== authUser.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = authUser.uid;

  try {
    const data = await redis.get(`player:${userId}`);
    return NextResponse.json({ state: data || null });
  } catch (error) {
    console.error('Error fetching player state from Redis:', error);
    return NextResponse.json({ error: 'Failed to fetch player state' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await verifyFirebaseUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId: requestedUserId, state } = (body || {}) as {
    userId?: string;
    state?: unknown;
  };

  if (requestedUserId && requestedUserId !== authUser.uid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!state) {
    return NextResponse.json({ error: 'Missing state in body' }, { status: 400 });
  }

  try {
    const serializedState = JSON.stringify(state);
    if (serializedState.length > 200_000) {
      return NextResponse.json({ error: 'State payload too large' }, { status: 413 });
    }

    // Overwrite the user's player state in Redis
    await redis.set(`player:${authUser.uid}`, serializedState, { ex: 60 * 60 * 24 * 14 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving player state to Redis:', error);
    return NextResponse.json({ error: 'Failed to save player state' }, { status: 500 });
  }
}
