import { buildBackendUrl } from '@/lib/server/backend-url';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const backendRes = await fetch(buildBackendUrl('/health'), {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (backendRes.ok) {
      const data = await backendRes.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline or unreachable in local dev mode
  }

  return NextResponse.json({
    status: 'degraded',
    web: 'ok',
    backend: 'unreachable',
    timestamp: new Date().toISOString(),
  });
}
