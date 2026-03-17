import { NextRequest, NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-url';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const trackId = searchParams.get('trackId');
  const authorization = req.headers.get('authorization');

  if (!trackId) {
    return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });
  }
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backendRes = await fetch(
      `${buildBackendUrl('/api/recommendations')}?trackId=${encodeURIComponent(trackId)}`,
      {
        headers: {
          Authorization: authorization,
        },
      },
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'Backend recommendations failed' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
