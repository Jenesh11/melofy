import { NextRequest, NextResponse } from 'next/server';
import { buildBackendUrl } from '@/lib/server/backend-url';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q');
  const authorization = req.headers.get('authorization');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backendRes = await fetch(
      `${buildBackendUrl('/api/search')}?q=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: authorization,
        },
      },
    );

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'Backend search failed' },
        { status: backendRes.status }
      );
    }

    const data = await backendRes.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
