import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const DEFAULT_STREAM_TICKET_TTL_SECONDS = 300;
const MAX_STREAM_TICKET_TTL_SECONDS = 600;

interface StreamTicketClaims {
  u: string; // uid
  e: number; // unix expiration seconds
  t: string; // track digest
  n: string; // nonce
}

interface VerifiedStreamTicket {
  uid: string;
}

function getSigningSecret(): string {
  const secret = process.env.STREAM_TICKET_SECRET || process.env.LAVALINK_PASSWORD || '';
  if (!secret) {
    throw new Error('Missing STREAM_TICKET_SECRET (or LAVALINK_PASSWORD) for stream tickets');
  }
  return secret;
}

function normalizeTtl(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds)) return DEFAULT_STREAM_TICKET_TTL_SECONDS;
  return Math.max(15, Math.min(MAX_STREAM_TICKET_TTL_SECONDS, Math.floor(ttlSeconds)));
}

function digestTrackUrl(trackUrl: string): string {
  return createHash('sha256').update(trackUrl, 'utf8').digest('base64url');
}

function encodeClaims(claims: StreamTicketClaims): string {
  return Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
}

function decodeClaims(encodedClaims: string): StreamTicketClaims | null {
  try {
    const raw = Buffer.from(encodedClaims, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as StreamTicketClaims;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.u !== 'string') return null;
    if (typeof parsed.e !== 'number') return null;
    if (typeof parsed.t !== 'string') return null;
    if (typeof parsed.n !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function signClaims(encodedClaims: string): string {
  return createHmac('sha256', getSigningSecret())
    .update(encodedClaims)
    .digest('base64url');
}

function safeSignatureMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueStreamTicket(
  uid: string,
  trackUrl: string,
  ttlSeconds = DEFAULT_STREAM_TICKET_TTL_SECONDS,
): { ticket: string; expiresInSeconds: number } {
  const expiresInSeconds = normalizeTtl(ttlSeconds);
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const claims: StreamTicketClaims = {
    u: uid,
    e: expiresAt,
    t: digestTrackUrl(trackUrl),
    n: randomBytes(12).toString('base64url'),
  };

  const encodedClaims = encodeClaims(claims);
  const signature = signClaims(encodedClaims);
  return { ticket: `${encodedClaims}.${signature}`, expiresInSeconds };
}

export function verifyStreamTicket(
  ticket: string,
  trackUrl: string,
): VerifiedStreamTicket | null {
  if (!ticket || !trackUrl) return null;

  const parts = ticket.split('.');
  if (parts.length !== 2) return null;
  const [encodedClaims, providedSignature] = parts;
  if (!encodedClaims || !providedSignature) return null;

  const expectedSignature = signClaims(encodedClaims);
  if (!safeSignatureMatch(expectedSignature, providedSignature)) return null;

  const claims = decodeClaims(encodedClaims);
  if (!claims) return null;

  const now = Math.floor(Date.now() / 1000);
  if (claims.e < now) return null;
  if (claims.t !== digestTrackUrl(trackUrl)) return null;

  return { uid: claims.u };
}
