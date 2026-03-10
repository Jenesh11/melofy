import { Router } from 'express';
import { lavalink } from '../index';
import http from 'http';
import https from 'https';
import { URL } from 'url';

const router = Router();

router.get('/stream', async (req, res) => {
  const trackUrl = req.query.url as string;
  
  if (!trackUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const node = lavalink.nodeManager.leastUsedNodes()[0];
    if (!node || !node.connected) {
      return res.status(503).send('Audio bridge (NodeLink) is currently unavailable. Please try again in a moment.');
    }

    const protocol = node.options.secure ? 'https' : 'http';
    const nodeUrl = `${protocol}://${node.options.host}:${node.options.port}`;
    const auth = node.options.authorization;

    // 1. Resolve CDN URL from NodeLink /v4/trackstream
    const resolveUrl = `${nodeUrl}/v4/trackstream?encodedTrack=${encodeURIComponent(trackUrl)}`;
    console.log(`[Relay] Resolving CDN for: ${trackUrl.substring(0, 20)}...`);

    const requester = nodeUrl.startsWith('https') ? https : http;

    requester.get(
      resolveUrl,
      { headers: { Authorization: auth } },
      (resolveRes) => {
        let data = '';
        resolveRes.on('data', (chunk) => (data += chunk));
        resolveRes.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            const cdnUrl = parsedData.url;
            
            if (!cdnUrl) {
                console.error('[Relay] No CDN URL found in response:', data);
                return res.status(500).send('Failed to resolve CDN stream URL');
            }

            // 2. Proxy to CDN with Redirect and Range Support
            const proxyWithRedirects = (currentUrl: string, depth = 0) => {
              if (depth > 5) {
                console.error('[Relay] Too many redirects');
                return res.status(500).send('Too many redirects');
              }

              const parsedUrl = new URL(currentUrl);
              const requester = parsedUrl.protocol === 'https:' ? https : http;
              
              const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                headers: {
                  Range: req.headers.range || 'bytes=0-',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': '*/*',
                }
              };

              const cdnReq = requester.request(options, (cdnRes) => {
                if (cdnRes.statusCode && cdnRes.statusCode >= 300 && cdnRes.statusCode < 400 && cdnRes.headers.location) {
                  console.log(`[Relay] Following redirect to: ${cdnRes.headers.location.substring(0, 50)}...`);
                  return proxyWithRedirects(cdnRes.headers.location, depth + 1);
                }

                console.log(`[Relay] Upstream Status: ${cdnRes.statusCode} | Type: ${cdnRes.headers['content-type']} | Range: ${req.headers.range || 'all'}`);

                // Forward essential range-discovery headers
                res.status(cdnRes.statusCode || 200).set({
                  'Content-Type': cdnRes.headers['content-type'] || 'audio/webm',
                  'Content-Range': cdnRes.headers['content-range'] || '',
                  'Accept-Ranges': 'bytes',
                  'Content-Length': cdnRes.headers['content-length'] || '',
                  'Cache-Control': 'no-cache'
                });

                cdnRes.pipe(res);
              });

              cdnReq.on('error', (e) => {
                console.error('[Relay] CDN Proxy Error:', e.message);
                if (!res.headersSent) res.status(500).send('CDN Proxy Error');
              });

              // Handle client disconnect
              req.on('close', () => {
                cdnReq.destroy();
              });

              cdnReq.end();
            };

            proxyWithRedirects(cdnUrl);
          } catch (e: any) {
            console.error('[Relay] Parse Error:', e.message);
            if (!res.headersSent) res.status(500).send('Resolution Failed');
          }
        });
      }
    ).on('error', (e) => {
      console.error('[Relay] NodeLink Request Error:', e.message);
      if (!res.headersSent) res.status(500).send('NodeLink Connection Error');
    });

  } catch (error) {
    console.error('Stream routing error:', error);
    if (!res.headersSent) res.status(500).send('Internal Server Error stream routing');
  }
});

export default router;
