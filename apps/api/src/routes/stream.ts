import { Router } from 'express';
import { lavalink } from '../index';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const router = Router();

const MAX_REDIRECTS = 6;
const MAX_PROXY_RETRIES = 3;
const RESOLVE_TIMEOUT_MS = 10_000;
const UPSTREAM_TIMEOUT_MS = 20_000;
const MAX_RESOLVE_BODY_BYTES = 1_000_000;

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
  exception?: {
    message?: string;
  };
}

function parseItag(rawItag: string | undefined): number | null {
  if (!rawItag) return null;
  const parsed = Number(rawItag);
  return Number.isFinite(parsed) ? parsed : null;
}

function getItagCandidates(rawItag: string | undefined): Array<number | null> {
  const explicit = parseItag(rawItag);
  if (explicit !== null) return [explicit, null];

  // Prefer direct YouTube audio formats first, then default behavior.
  return [251, 250, 249, 140, null];
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

function requestTrackstreamUrl(
  node: NodeLike,
  encodedTrack: string,
  itag: number | null,
): Promise<string> {
  return new Promise((resolve, reject) => {
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
            reject(
              new Error(
                parsed?.exception?.message || `Trackstream failed with status ${statusCode}`,
              ),
            );
            return;
          }

          if (!parsed?.url) {
            reject(new Error(parsed?.exception?.message || 'Trackstream returned no URL'));
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
  });
}

function resolveRedirectUrl(currentUrl: string, location: string): string | null {
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    return null;
  }
}

router.get('/stream', async (req, res) => {
  const trackUrl = req.query.url as string;
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

  const resolveCdnUrl = async (advanceCandidate: boolean): Promise<string> => {
    let lastError: Error | null = null;

    for (let i = 0; i < itagCandidates.length; i++) {
      const candidate = pickNextCandidate(i > 0 || advanceCandidate);

      try {
        const resolved = await requestTrackstreamUrl(node, trackUrl, candidate);
        console.log(
          `[Relay:${requestId}] Resolved CDN URL using itag=${candidate === null ? 'auto' : candidate}`,
        );
        return resolved;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown resolve error');
        lastError = err;
        console.warn(
          `[Relay:${requestId}] Resolve failed for itag=${candidate === null ? 'auto' : candidate}: ${sanitizeErrorMessage(err.message)}`,
        );
      }
    }

    throw lastError || new Error('Unable to resolve CDN URL');
  };

  const proxyWithRedirects = (
    currentUrl: string,
    depth: number,
    retryCount: number,
  ): void => {
    if (depth > MAX_REDIRECTS) {
      if (!res.headersSent) res.status(502).send('Too many redirects from upstream');
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      if (!res.headersSent) res.status(500).send('Invalid upstream URL');
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
          return proxyWithRedirects(redirectedUrl, depth + 1, retryCount);
        }

        const needsRetry =
          shouldRetryStatus(statusCode) || isLikelyUnplayableContentType(contentType);

        if (needsRetry && retryCount < MAX_PROXY_RETRIES && !res.headersSent) {
          upstreamRes.resume();
          const advanceCandidate = isLikelyUnplayableContentType(contentType);

          void resolveCdnUrl(advanceCandidate)
            .then((freshUrl) => {
              proxyWithRedirects(freshUrl, 0, retryCount + 1);
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
        void resolveCdnUrl(false)
          .then((freshUrl) => {
            proxyWithRedirects(freshUrl, 0, retryCount + 1);
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
    proxyWithRedirects(initialUrl, 0, 0);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown resolution error');
    console.error(`[Relay:${requestId}] Failed to resolve initial CDN URL: ${sanitizeErrorMessage(err.message)}`);
    if (!res.headersSent) {
      res.status(502).send('Failed to resolve CDN stream URL');
    }
  }
});

export default router;
