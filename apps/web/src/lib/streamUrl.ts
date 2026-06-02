import type { User } from 'firebase/auth';
import { getFirebaseAuthHeaders } from '@/lib/firebase/client-auth';

/**
 * Resolve a playable stream URL for an encoded track.
 *
 * Mints a short-lived stream ticket (TTL ~5min, see apps/api streamTicket.ts)
 * and returns an absolute `/api/stream?...` URL that both the HTML5 <audio>
 * element and the native Android MediaPlayer can consume.
 *
 * Returns null if the track has no encoded url or the user is unavailable.
 */
export async function buildStreamUrl(
  encodedTrack: string | undefined | null,
  user?: User | null,
): Promise<string | null> {
  if (!encodedTrack || !user) return null;

  const authHeaders = await getFirebaseAuthHeaders(user);
  const ticketRes = await fetch('/api/stream-ticket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ url: encodedTrack }),
  });
  if (!ticketRes.ok) {
    throw new Error(`Failed to create stream ticket (${ticketRes.status})`);
  }

  const ticketData = (await ticketRes.json()) as { ticket?: string };
  if (!ticketData.ticket) {
    throw new Error('Missing stream ticket');
  }

  const params = new URLSearchParams({
    ticket: ticketData.ticket,
    url: encodedTrack,
  });
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/api/stream?${params.toString()}`;
}

/**
 * Extract the encoded track string embedded in a stream URL's `url` query
 * param. Used to map a URL the native player reports back to a Track.
 */
export function encodedTrackFromStreamUrl(streamUrl: string | undefined | null): string | null {
  if (!streamUrl) return null;
  try {
    const parsed = new URL(streamUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return parsed.searchParams.get('url');
  } catch {
    return null;
  }
}
