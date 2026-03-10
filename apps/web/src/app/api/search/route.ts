import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  try {
    // Fetch directly from Lavalink Backend
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

    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
