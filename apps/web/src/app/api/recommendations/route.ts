import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const trackId = searchParams.get('trackId');

  if (!trackId) {
    return NextResponse.json({ error: 'Missing trackId' }, { status: 400 });
  }

  try {
    // Pass to our backend
    const backendRes = await fetch(
      `http://localhost:3001/api/recommendations?trackId=${encodeURIComponent(trackId)}`
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
