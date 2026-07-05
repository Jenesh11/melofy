import { NextRequest, NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-url';

export async function GET(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backendRes = await fetch(buildBackendUrl('/api/player-state'), {
      headers: { Authorization: authorization },
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'Backend state fetch failed' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Player state GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    
    const backendRes = await fetch(buildBackendUrl('/api/player-state'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'Backend state save failed' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Player state POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
