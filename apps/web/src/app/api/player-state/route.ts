import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { verifyFirebaseUserFromRequest } from '@/lib/server/firebase-auth';

// Initialize Redis client using Upstash env variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const MAX_PLAYER_STATE_BODY_BYTES = 256 * 1024;

function parseContentLength(request: Request): number | null {
  const contentLengthHeader = request.headers.get('content-length');
  if (!contentLengthHeader) return null;

  const parsed = Number(contentLengthHeader);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

async function parseJsonBodyWithLimit(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  const declaredLength = parseContentLength(request);
  if (declaredLength !== null && declaredLength > maxBytes) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }

  if (!request.body) {
    return {};
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error('PAYLOAD_TOO_LARGE');
    }

    chunks.push(value);
  }

  const bodyBuffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  if (!bodyBuffer.length) return {};

  try {
    return JSON.parse(bodyBuffer.toString('utf8'));
  } catch {
    throw new Error('INVALID_JSON');
  }
}

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
    body = await parseJsonBodyWithLimit(request, MAX_PLAYER_STATE_BODY_BYTES);
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
    }
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
    if (Buffer.byteLength(serializedState, 'utf8') > 200_000) {
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
