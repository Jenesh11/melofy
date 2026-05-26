import { NextRequest, NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-url';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const trackId = searchParams.get('trackId');
  const videoId = searchParams.get('videoId');
  const spotifyId = searchParams.get('spotifyId');
  const query = searchParams.get('query');
  const authorization = req.headers.get('authorization');

  if (!trackId && !videoId && !query && !spotifyId) {
    return NextResponse.json({ error: 'Missing track parameters' }, { status: 400 });
  }
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = new URLSearchParams();
    if (trackId) params.append('trackId', trackId);
    if (videoId) params.append('videoId', videoId);
    if (spotifyId) params.append('spotifyId', spotifyId);
    if (query) params.append('query', query);

    const backendRes = await fetch(
      `${buildBackendUrl('/api/recommendations')}?${params.toString()}`,
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
