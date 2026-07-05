import { Router, type Request, type Response, type NextFunction } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { lavalink } from '../index';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import dns from 'node:dns/promises';
import net from 'node:net';
import {
  extractBearerToken,
  requireFirebaseAuth,
  verifyFirebaseIdToken,
} from '../lib/firebaseAuth';
import { issueStreamTicket, verifyStreamTicket } from '../lib/streamTicket';

const router = Router();

const MAX_REDIRECTS = 6;
const MAX_PROXY_RETRIES = 3;
const RESOLVE_TIMEOUT_MS = 10_000;
const UPSTREAM_TIMEOUT_MS = 20_000;
const MAX_RESOLVE_BODY_BYTES = 1_000_000;
const TRACKSTREAM_URL_CACHE_TTL_MS = 4 * 60 * 1000;
const MAX_TRACKSTREAM_URL_CACHE_ENTRIES = 500;
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);
const BLOCKED_HOSTNAME_SUFFIXES = ['.localhost', '.local', '.internal'];

const streamRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator(req) {
    if (req.user?.uid) return `uid:${req.user.uid}`;
    const ip = req.ip || req.socket.remoteAddress || '';
    return `ip:${ipKeyGenerator(ip)}`;
  },
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

const streamTicketRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator(req) {
    if (req.user?.uid) return `uid:${req.user.uid}`;
    const ip = req.ip || req.socket.remoteAddress || '';
    return `ip:${ipKeyGenerator(ip)}`;
  },
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

interface NodeConnectionOptions {
  secure: boolean;
  host: string;
  port: number | string;
  authorization: string;
}

interface NodeLike {
  options: NodeConnectionOptions;
  connected: boolean;
}

interface ResolveResponse {
  url?: string;
  message?: string;
  error?: string;
  exception?: {
    message?: string;
  };
}

class ResolveError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly nonRetryable?: boolean,
  ) {
    super(message);
  }
}

function isPrivateIPv4(address: string): boolean {
  const octets = address.split('.').map((segment) => Number(segment));
  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value))) return true;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // Benchmarking range
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  return false;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;

  const mappedV4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedV4?.[1]) return isPrivateIPv4(mappedV4[1]);

  const firstSegment = normalized.split(':')[0] || '0';
  const firstValue = parseInt(firstSegment, 16);
  if (Number.isNaN(firstValue)) return true;

  if ((firstValue & 0xfe00) === 0xfc00) return true; // fc00::/7 (ULA)
  if ((firstValue & 0xffc0) === 0xfe80) return true; // fe80::/10 (link-local)
  if ((firstValue & 0xff00) === 0xff00) return true; // ff00::/8 (multicast)
  return false;
}

function isPrivateOrInternalIp(address: string): boolean {
  const ipVersion = net.isIP(address);
  if (ipVersion === 4) return isPrivateIPv4(address);
  if (ipVersion === 6) return isPrivateIPv6(address);
  return true;
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/\.$/, '').toLowerCase();
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

async function assertSafeProxyTargetUrl(targetUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new ResolveError('Invalid upstream URL', 400, true);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ResolveError('Blocked non-http upstream protocol', 400, true);
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (isBlockedHostname(hostname)) {
    throw new ResolveError(`Blocked private hostname: ${hostname}`, 403, true);
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrInternalIp(hostname)) {
      throw new ResolveError(`Blocked private IP: ${hostname}`, 403, true);
    }
    return parsed;
  }

  let lookupResults: Array<{ address: string; family: number }>;
  try {
    lookupResults = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ResolveError(`Unable to resolve upstream host: ${hostname}`, 502, true);
  }

  if (!lookupResults.length) {
    throw new ResolveError(`Unable to resolve upstream host: ${hostname}`, 502, true);
  }

  for (const result of lookupResults) {
    if (isPrivateOrInternalIp(result.address)) {
      throw new ResolveError(
        `Blocked upstream host resolved to private IP: ${result.address}`,
        403,
        true,
      );
    }
  }

  return parsed;
}

function parseItag(rawItag: string | undefined): number | null {
  if (!rawItag) return null;
  const parsed = Number(rawItag);
  return Number.isFinite(parsed) ? parsed : null;
}

function getItagCandidates(rawItag: string | undefined): Array<number | null> {
  const explicit = parseItag(rawItag);
  if (explicit !== null) return [explicit];

  return [null];
}

function shouldRetryStatus(statusCode: number): boolean {
  return [401, 403, 404, 408, 409, 410, 425, 429, 500, 502, 503, 504].includes(statusCode);
}

function isLikelyUnplayableContentType(contentTypeHeader: string): boolean {
  const contentType = contentTypeHeader.toLowerCase();
  return (
    contentType.includes('application/vnd.yt-ump') ||
    contentType.includes('application/x-mpegurl') ||
    contentType.includes('application/vnd.apple.mpegurl')
  );
}

function sanitizeErrorMessage(message: string): string {
  return message.length > 250 ? `${message.slice(0, 250)}...` : message;
}

function applyUpstreamHeaders(
  res: Parameters<typeof router.get>[1] extends (req: any, res: infer T) => any ? T : never,
  upstreamHeaders: http.IncomingHttpHeaders,
): void {
  const contentType = upstreamHeaders['content-type'];
  const contentRange = upstreamHeaders['content-range'];
  const contentLength = upstreamHeaders['content-length'];
  const acceptRanges = upstreamHeaders['accept-ranges'];
  const etag = upstreamHeaders.etag;
  const lastModified = upstreamHeaders['last-modified'];
  const cacheControl = upstreamHeaders['cache-control'];
  const expires = upstreamHeaders.expires;
  const transferEncoding = upstreamHeaders['transfer-encoding'];

  if (typeof contentType === 'string') res.setHeader('Content-Type', contentType);
  if (typeof contentRange === 'string') res.setHeader('Content-Range', contentRange);
  if (typeof acceptRanges === 'string') res.setHeader('Accept-Ranges', acceptRanges);
  else res.setHeader('Accept-Ranges', 'bytes');

  const hasChunkedEncoding =
    typeof transferEncoding === 'string' && transferEncoding.toLowerCase().includes('chunked');

  if (!hasChunkedEncoding && typeof contentLength === 'string') {
    res.setHeader('Content-Length', contentLength);
  }

  if (typeof etag === 'string') res.setHeader('ETag', etag);
  if (typeof lastModified === 'string') res.setHeader('Last-Modified', lastModified);
  if (typeof cacheControl === 'string') res.setHeader('Cache-Control', cacheControl);
  else res.setHeader('Cache-Control', 'no-cache');
  if (typeof expires === 'string') res.setHeader('Expires', expires);
}

/**
 * In-flight deduplication map: while a NodeLink /v4/trackstream request is
 * pending for a given (encodedTrack, itag) pair, every additional caller
 * receives the SAME promise instead of firing a duplicate HTTP request.
 * The entry is removed once the promise settles (resolve or reject).
 */
const inflightTrackResolves = new Map<string, Promise<string>>();
const cachedTrackResolves = new Map<string, { url: string; expiresAt: number }>();

function getTrackResolveCacheKey(encodedTrack: string, itag: number | null): string {
  return `${encodedTrack}:${itag === null ? 'auto' : itag}`;
}

function getCachedTrackstreamUrl(cacheKey: string): string | null {
  const cached = cachedTrackResolves.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    cachedTrackResolves.delete(cacheKey);
    return null;
  }

  console.log(`[TrackResolve] Cache hit for key=${cacheKey}`);
  return cached.url;
}

function cacheTrackstreamUrl(cacheKey: string, url: string): void {
  if (cachedTrackResolves.size >= MAX_TRACKSTREAM_URL_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [key, cached] of cachedTrackResolves) {
      if (cached.expiresAt <= now) cachedTrackResolves.delete(key);
    }
  }

  while (cachedTrackResolves.size >= MAX_TRACKSTREAM_URL_CACHE_ENTRIES) {
    const oldestKey = cachedTrackResolves.keys().next().value;
    if (!oldestKey) break;
    cachedTrackResolves.delete(oldestKey);
  }

  cachedTrackResolves.set(cacheKey, {
    url,
    expiresAt: Date.now() + TRACKSTREAM_URL_CACHE_TTL_MS,
  });
}

function requestTrackstreamUrl(
  node: NodeLike,
  encodedTrack: string,
  itag: number | null,
  forceRefresh = false,
): Promise<string> {
  const cacheKey = getTrackResolveCacheKey(encodedTrack, itag);

  if (!forceRefresh) {
    const cached = getCachedTrackstreamUrl(cacheKey);
    if (cached) return Promise.resolve(cached);
  }

  const existing = inflightTrackResolves.get(cacheKey);
  if (existing) {
    console.log(`[TrackResolve] Joining in-flight resolution for key=${cacheKey}`);
    return existing;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const protocol = node.options.secure ? 'https' : 'http';
    const baseUrl = `${protocol}://${node.options.host}:${node.options.port}`;
    const query =
      itag === null
        ? `encodedTrack=${encodeURIComponent(encodedTrack)}`
        : `encodedTrack=${encodeURIComponent(encodedTrack)}&itag=${encodeURIComponent(String(itag))}`;
    const trackstreamUrl = `${baseUrl}/v4/trackstream?${query}`;

    const requester = baseUrl.startsWith('https') ? https : http;
    const req = requester.get(
      trackstreamUrl,
      {
        headers: {
          Authorization: node.options.authorization,
          Accept: 'application/json',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let totalSize = 0;

        response.on('data', (chunk) => {
          totalSize += chunk.length;
          if (totalSize > MAX_RESOLVE_BODY_BYTES) {
            req.destroy(new Error('Trackstream response too large'));
            return;
          }
          chunks.push(Buffer.from(chunk));
        });

        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const statusCode = response.statusCode || 500;

          let parsed: ResolveResponse | null = null;
          try {
            parsed = JSON.parse(body) as ResolveResponse;
          } catch {
            reject(new Error(`Trackstream returned non-JSON response (status ${statusCode})`));
            return;
          }

          if (statusCode < 200 || statusCode >= 300) {
            const message =
              parsed?.exception?.message ||
              parsed?.message ||
              parsed?.error ||
              `Trackstream failed with status ${statusCode}`;
            const nonRetryable =
              message.toLowerCase().includes('runtime contract is incomplete') ||
              message.toLowerCase().includes('track stream endpoint') ||
              message.toLowerCase().includes('disabled');

            reject(
              new ResolveError(message, statusCode, nonRetryable),
            );
            return;
          }

          if (!parsed?.url) {
            const message =
              parsed?.exception?.message ||
              parsed?.message ||
              parsed?.error ||
              'Trackstream returned no URL';
            reject(new ResolveError(message, statusCode));
            return;
          }

          resolve(parsed.url);
        });
      },
    );

    req.setTimeout(RESOLVE_TIMEOUT_MS, () => {
      req.destroy(new Error('Trackstream resolve timeout'));
    });

    req.on('error', reject);
  }).finally(() => {
    // Remove the entry once settled so failed resolutions can be retried
    // and so the map doesn't grow unboundedly.
    inflightTrackResolves.delete(cacheKey);
  }).then((url) => {
    cacheTrackstreamUrl(cacheKey, url);
    return url;
  });

  inflightTrackResolves.set(cacheKey, promise);
  return promise;
}

function resolveRedirectUrl(currentUrl: string, location: string): string | null {
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    return null;
  }
}

interface StreamAuthContext {
  trackUrl?: string;
}

async function requireStreamAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const fetchSite = req.headers['sec-fetch-site'];
  const fetchDest = req.headers['sec-fetch-dest'];

  if (fetchSite === 'none' || fetchDest === 'document') {
    res.status(403).json({ error: 'Direct browser access to stream is restricted' });
    return;
  }

  const bearerToken = extractBearerToken(req.headers.authorization);
  if (bearerToken) {
    const user = await verifyFirebaseIdToken(bearerToken);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = user;
    next();
    return;
  }

  const ticket = typeof req.query.ticket === 'string' ? req.query.ticket.trim() : '';
  const trackUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';

  if (!ticket || !trackUrl) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (trackUrl.length > 2048) {
    res.status(400).json({ error: 'Invalid url parameter' });
    return;
  }

  const payload = verifyStreamTicket(ticket, trackUrl);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired stream ticket' });
    return;
  }

  req.user = { uid: payload.uid };
  (req as typeof req & StreamAuthContext).trackUrl = trackUrl;
  next();
}

router.post('/stream-ticket', requireFirebaseAuth, streamTicketRateLimit, (req, res) => {
  const trackUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!trackUrl) {
    res.status(400).json({ error: 'Missing url in body' });
    return;
  }
  if (trackUrl.length > 2048) {
    res.status(400).json({ error: 'Invalid url in body' });
    return;
  }

  const uid = req.user?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { ticket, expiresInSeconds } = issueStreamTicket(uid, trackUrl);
  res.json({ ticket, expiresInSeconds });
});

router.get('/stream', requireStreamAccess, streamRateLimit, async (req, res) => {
  const contextTrackUrl = (req as typeof req & StreamAuthContext).trackUrl;
  const trackUrl = contextTrackUrl || (req.query.url as string);
  const requestedItag = req.query.itag as string | undefined;

  if (!trackUrl) {
    return res.status(400).send('Missing url parameter');
  }
  if (trackUrl.length > 2048) {
    return res.status(400).send('Invalid url parameter');
  }

  const node = lavalink.nodeManager.leastUsedNodes()[0] as NodeLike | undefined;
  if (!node || !node.connected) {
    return res
      .status(503)
      .send('Audio bridge (NodeLink) is currently unavailable. Please try again in a moment.');
  }

  const requestId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const itagCandidates = getItagCandidates(requestedItag);
  let itagCursor = 0;

  const pickNextCandidate = (advance: boolean) => {
    if (advance) {
      itagCursor = (itagCursor + 1) % itagCandidates.length;
    }
    return itagCandidates[itagCursor];
  };

  const resolveCdnUrl = async (advanceCandidate: boolean, forceRefresh = false): Promise<string> => {
    let lastError: Error | null = null;

    for (let i = 0; i < itagCandidates.length; i++) {
      const candidate = pickNextCandidate(i > 0 || advanceCandidate);

      try {
        const resolved = await requestTrackstreamUrl(node, trackUrl, candidate, forceRefresh);
        console.log(
          `[Relay:${requestId}] Resolved CDN URL using itag=${candidate === null ? 'auto' : candidate}${forceRefresh ? ' (refresh)' : ''}`,
        );
        return resolved;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown resolve error');
        lastError = err;
        console.warn(
          `[Relay:${requestId}] Resolve failed for itag=${candidate === null ? 'auto' : candidate}: ${sanitizeErrorMessage(err.message)}`,
        );

        if (error instanceof ResolveError && error.nonRetryable) {
          break;
        }
      }
    }

    throw lastError || new Error('Unable to resolve CDN URL');
  };

  const proxyWithRedirects = async (
    currentUrl: string,
    depth: number,
    retryCount: number,
  ): Promise<void> => {
    if (depth > MAX_REDIRECTS) {
      if (!res.headersSent) res.status(502).send('Too many redirects from upstream');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = await assertSafeProxyTargetUrl(currentUrl);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Invalid upstream URL');
      const statusCode =
        error instanceof ResolveError && typeof error.statusCode === 'number'
          ? error.statusCode
          : 403;
      console.warn(`[Relay:${requestId}] Blocked upstream URL: ${sanitizeErrorMessage(err.message)}`);
      if (!res.headersSent) res.status(statusCode).send('Blocked upstream stream target');
      return;
    }

    const requester = parsedUrl.protocol === 'https:' ? https : http;

    const upstreamReq = requester.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          Range: req.headers.range || 'bytes=0-',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      },
      (upstreamRes) => {
        const statusCode = upstreamRes.statusCode || 502;
        const contentType = String(upstreamRes.headers['content-type'] || '');

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          typeof upstreamRes.headers.location === 'string'
        ) {
          upstreamRes.resume();
          const redirectedUrl = resolveRedirectUrl(currentUrl, upstreamRes.headers.location);
          if (!redirectedUrl) {
            if (!res.headersSent) res.status(502).send('Invalid redirect URL from upstream');
            return;
          }
          void proxyWithRedirects(redirectedUrl, depth + 1, retryCount);
          return;
        }

        const needsRetry =
          shouldRetryStatus(statusCode) || isLikelyUnplayableContentType(contentType);

        if (needsRetry && retryCount < MAX_PROXY_RETRIES && !res.headersSent) {
          upstreamRes.resume();
          const advanceCandidate = isLikelyUnplayableContentType(contentType);

          void resolveCdnUrl(advanceCandidate, true)
            .then((freshUrl) => {
              void proxyWithRedirects(freshUrl, 0, retryCount + 1);
            })
            .catch((error) => {
              const err = error instanceof Error ? error : new Error('Retry resolve failed');
              console.error(`[Relay:${requestId}] Retry resolve failed: ${sanitizeErrorMessage(err.message)}`);
              if (!res.headersSent) res.status(502).send('Failed to recover stream URL');
            });
          return;
        }

        console.log(
          `[Relay:${requestId}] Upstream status=${statusCode} type=${contentType || 'unknown'} range=${req.headers.range || 'all'} retry=${retryCount}`,
        );

        res.status(statusCode);
        applyUpstreamHeaders(res, upstreamRes.headers);

        upstreamRes.on('error', (error) => {
          console.error(`[Relay:${requestId}] Upstream response error: ${sanitizeErrorMessage(error.message)}`);
          if (!res.headersSent) res.status(502).send('Upstream response error');
        });

        upstreamRes.pipe(res);
      },
    );

    upstreamReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      upstreamReq.destroy(new Error('Upstream stream timeout'));
    });

    const onClientClose = () => {
      upstreamReq.destroy();
    };

    req.on('close', onClientClose);
    upstreamReq.on('close', () => {
      req.off('close', onClientClose);
    });

    upstreamReq.on('error', (error) => {
      if (retryCount < MAX_PROXY_RETRIES && !res.headersSent) {
        void resolveCdnUrl(false, true)
          .then((freshUrl) => {
            void proxyWithRedirects(freshUrl, 0, retryCount + 1);
          })
          .catch((resolveError) => {
            const err =
              resolveError instanceof Error
                ? resolveError
                : new Error('Failed to resolve retry URL');
            console.error(
              `[Relay:${requestId}] Stream error then resolve failed: ${sanitizeErrorMessage(err.message)}`,
            );
            if (!res.headersSent) res.status(502).send('CDN Proxy Error');
          });
        return;
      }

      console.error(`[Relay:${requestId}] CDN proxy error: ${sanitizeErrorMessage(error.message)}`);
      if (!res.headersSent) res.status(502).send('CDN Proxy Error');
    });

    upstreamReq.end();
  };

  try {
    const initialUrl = await resolveCdnUrl(false);
    void proxyWithRedirects(initialUrl, 0, 0);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown resolution error');
    console.error(`[Relay:${requestId}] Failed to resolve initial CDN URL: ${sanitizeErrorMessage(err.message)}`);

    if (err.message.toLowerCase().includes('runtime contract is incomplete')) {
      if (!res.headersSent) {
        res.status(503).send(
          'NodeLink track streaming is not fully enabled. Set NODELINK_ENABLETRACKSTREAMENDPOINT=true in your NodeLink config and restart it.',
        );
      }
      return;
    }

    if (!res.headersSent) {
      res.status(502).send('Failed to resolve CDN stream URL');
    }
  }
});

export default router;
