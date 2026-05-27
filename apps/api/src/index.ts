import 'dotenv/config';
import express from 'express';
import cors, { type CorsOptions } from 'cors';
import { Server as SocketIOServer, type Socket as SocketIOSocket } from 'socket.io';
import http from 'http';
import helmet from 'helmet';
import crypto from 'crypto';
import { fetchFullSpotifyPlaylist } from './lib/spotify';
import { Redis } from '@upstash/redis';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import streamRouter from './routes/stream';
import spotifyRouter from './routes/spotify';
import lyricsRouter from './routes/lyrics';
import playerRouter from './routes/player';
import { LavalinkManager } from 'lavalink-client';
import { requireFirebaseAuth, verifyFirebaseIdToken } from './lib/firebaseAuth';
import { registerJamHandlers } from './sockets/jam';

const app = express();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function resolveTrustProxySetting():
  | boolean
  | number
  | string
  | string[]
  | ((ip: string) => boolean) {
  const raw = process.env.TRUST_PROXY;
  if (!raw) return false;

  const normalized = raw.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  const numeric = Number(normalized);
  if (Number.isInteger(numeric) && numeric >= 0) return numeric;

  // Supports values like "loopback", "10.0.0.0/8", or comma-separated lists.
  const entries = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  return entries.length <= 1 ? raw.trim() : entries;
}

app.set('trust proxy', resolveTrustProxySetting());
console.log(`[API] Trust Proxy set to: ${process.env.TRUST_PROXY}`);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    console.log(`[CORS] Rejected origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
    callback(new Error('CORS origin not allowed'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

function getAuthenticatedRateLimitKey(req: express.Request): string {
  if (req.user?.uid) return `uid:${req.user.uid}`;
  const ip = req.ip || req.socket.remoteAddress || '';
  return `ip:${ipKeyGenerator(ip)}`;
}


const privateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  keyGenerator: getAuthenticatedRateLimitKey,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  // 30s timeout for non-stream routes
  if (!req.path.includes('/stream')) {
    res.setTimeout(30_000, () => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    });
  }
  next();
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: '/api/socket.io',
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

export const lavalink = new LavalinkManager({
  nodes: [
    {
      authorization: process.env.LAVALINK_PASSWORD!,
      host: process.env.LAVALINK_HOST!,
      port: parseInt(process.env.LAVALINK_PORT!),
      secure: process.env.LAVALINK_SECURE === 'true',
      id: process.env.LAVALINK_NAME!
    },
  ],
  sendToShard: () => {},
  client: {
    id: '123456789012345678',
    username: 'MelofyBackend',
  },
});

lavalink.nodeManager.on('connect', (node) => {
  console.log(`[NodeLink] Connected to ${node.id}`);
});

lavalink.nodeManager.on('error', (node, error) => {
  if (error.message.includes('ECONNREFUSED')) {
    return;
  }
  console.error(`[NodeLink] Error on ${node.id}:`, error.message);
});

const nodeReconnectState = new Map<
  string,
  { interval?: NodeJS.Timeout; attempts: number }
>();

lavalink.nodeManager.on('disconnect', (node, reason) => {
  console.warn(`[NodeLink] Disconnected from ${node.id}:`, reason?.reason || reason);

  if (!nodeReconnectState.has(node.id)) {
    nodeReconnectState.set(node.id, { attempts: 0 });
  }

  const state = nodeReconnectState.get(node.id)!;
  if (state.interval) return;

  console.log(`[NodeLink] Starting reconnection heartbeat for ${node.id}...`);

  state.interval = setInterval(async () => {
    if (node.connected) {
      console.log(`[NodeLink] Reconnection successful for ${node.id}`);
      clearInterval(state.interval);
      state.interval = undefined;
      state.attempts = 0;
      return;
    }

    state.attempts++;

    if (state.attempts === 1 || state.attempts % 6 === 0) {
      console.log(`[NodeLink] Node ${node.id} is offline. (Attempt ${state.attempts})`);
    }

    try {
      await node.connect();
    } catch {
      // Most errors are handled by the nodeManager error event.
    }
  }, 5000);
});

lavalink.init({ id: '123456789012345678', username: 'MelofyBackend' });

app.get('/health', async (_req, res) => {
  let redisOk = false;
  try {
    const start = Date.now();
    await redis.ping();
    console.log(`[Health] Redis: ok (${Date.now() - start}ms)`);
    redisOk = true;
  } catch (err) {
    console.error('[Health] Redis: error', err);
  }

  const nodes = lavalink.nodeManager.nodes;
  const connectedNodes = Array.from(nodes.values()).filter(n => n.connected).length;

  const overallStatus = redisOk && connectedNodes > 0
    ? 'ok'
    : connectedNodes > 0 || redisOk
      ? 'degraded'
      : 'offline';

  res.json({
    status: overallStatus,
    systems: {
      api: 'ok',
      redis: redisOk ? 'ok' : 'error',
      lavalink: connectedNodes > 0 ? 'ok' : 'offline',
    }
  });
});

app.use('/api', streamRouter);
app.use('/api/spotify', privateRateLimit, spotifyRouter);
app.use('/api/lyrics', requireFirebaseAuth, privateRateLimit, lyricsRouter);
app.use('/api', privateRateLimit, playerRouter);

app.get('/api/search', requireFirebaseAuth, privateRateLimit, async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2 || trimmedQuery.length > 500) {
    return res.status(400).json({ error: 'Invalid query length' });
  }

  const cacheKey = `search:${trimmedQuery.toLowerCase()}`;

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`[SearchCache] Hit for: ${trimmedQuery}`);
      return res.json(cached);
    }

    const node = lavalink.nodeManager.leastUsedNodes()[0];
    if (!node)
      return res.status(500).json({ error: 'No NodeLink nodes available' });

    // Handle Spotify Playlist URLs/URIs specially to bypass the 100 tracks limit
    const spotifyPlaylistRegex = /(?:open\.spotify\.com\/playlist\/|spotify:playlist:)([a-zA-Z0-9]{22})/;
    const match = trimmedQuery.match(spotifyPlaylistRegex);

    let finalResult: any;

    if (match) {
      const playlistId = match[1];
      console.log(`[SpotifyImport] Detected Spotify playlist URL: ${playlistId}. Fetching full playlist...`);
      
      try {
        const fullData = await fetchFullSpotifyPlaylist(playlistId);
        
        // Transform to Lavalink-like structure that the frontend expects
        const tracks = (fullData.tracks?.items || [])
          .map((item: any) => item.track)
          .filter(Boolean)
          .filter((t: any) => {
            const hasValidTitle = t.name && typeof t.name === 'string' && t.name.toLowerCase() !== 'unknown' && t.name.toLowerCase() !== 'unknown title';
            const hasValidDuration = typeof t.duration_ms === 'number' && t.duration_ms > 0;
            return t.id && hasValidTitle && hasValidDuration;
          })
          .map((t: any) => ({
            encoded: '', // Will be resolved by client on-demand in useAudioPlayback
            info: {
              identifier: t.id,
              title: t.name,
              author: t.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
              length: t.duration_ms || 0,
              duration: t.duration_ms || 0, // Explicitly provide duration for Firestore
              artworkUrl: t.album?.images?.[0]?.url || '',
              uri: `https://open.spotify.com/track/${t.id}`,
              sourceName: 'spotify',
              isSeekable: true,
              isStream: false,
              isrc: t.external_ids?.isrc || null
            }
          }));

        finalResult = {
          loadType: 'playlist',
          playlistInfo: {
            name: fullData.name,
            selectedTrack: 0
          },
          tracks
        };
      } catch (err) {
        console.error('[SpotifyImport] Failed to fetch full playlist metadata:', err);
        // Fallback to normal node search if manual fetch fails
      }
    }

    if (!finalResult) {
      finalResult = await node.search(
        { query: trimmedQuery },
        { id: req.user?.uid || 'MelofyInternal' },
      );
    }

    // Filter out unavailable tracks from general search result if they exist
    if (finalResult && Array.isArray(finalResult.tracks)) {
      finalResult.tracks = finalResult.tracks.filter((track: any) => {
        if (!track || !track.info) return false;
        const title = track.info.title;
        const length = track.info.length || track.info.duration || 0;
        
        const hasValidTitle = title && typeof title === 'string' && title.toLowerCase() !== 'unknown' && title.toLowerCase() !== 'unknown title';
        const hasValidDuration = typeof length === 'number' && length > 0;
        
        return hasValidTitle && hasValidDuration;
      });
    }

    // Cache the result for 24 hours
    if (finalResult && finalResult.loadType !== 'error' && finalResult.loadType !== 'empty') {
      await redis.set(cacheKey, finalResult, { ex: 86400 });
    }

    res.json(finalResult);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get(
  '/api/recommendations',
  requireFirebaseAuth,
  privateRateLimit,
  async (req, res) => {
    const { videoId, spotifyId, query, trackId } = req.query as {
      videoId?: string;
      spotifyId?: string;
      query?: string;
      trackId?: string;
    };

    // Determine seed criteria. Prioritize Spotify for recommendations if available and valid (length 22).
    const isSpotifyId = (id?: string) => typeof id === 'string' && id.length === 22;
    const isVideoId = (id?: string) => typeof id === 'string' && id.length === 11;

    const effectiveSpotifyId = isSpotifyId(spotifyId)
      ? spotifyId
      : (isSpotifyId(trackId) ? trackId : undefined);

    const effectiveVideoId = isVideoId(videoId)
      ? videoId
      : (isVideoId(spotifyId)
        ? spotifyId
        : (isVideoId(trackId) ? trackId : undefined));

    const effectiveQuery = query || trackId;

    if (!effectiveSpotifyId && !effectiveVideoId && !effectiveQuery) {
      return res.status(400).json({ error: 'Missing seed identifier' });
    }

    // NodeLink sprec: hits Spotify recommendations, ytrec: hits YouTube recommendations
    const identifier = effectiveSpotifyId
      ? `sprec:${effectiveSpotifyId}`
      : effectiveVideoId
        ? `ytrec:${effectiveVideoId}`
        : `ytrec:${effectiveQuery}`;

    const recCacheKey = `recs:${identifier}`;

    try {
      // Check cache first
      const cached = await redis.get(recCacheKey);
      if (cached) {
        return res.json(cached);
      }

      const node = lavalink.nodeManager.leastUsedNodes()[0];
      if (!node)
        return res.status(500).json({ error: 'No NodeLink nodes available' });

      const result = await node.search(
        { query: identifier },
        { id: req.user?.uid || 'MelofyAutoplay' },
      );

      if (result.loadType === 'empty' || result.loadType === 'error') {
        return res.json({ tracks: [] });
      }

      const rawTracks = (result as any).tracks || (result as any).data || [];
      const tracks = rawTracks.map((track: any) => ({
        encoded: track.encoded,
        id: track.info.identifier,
        title: track.info.title,
        artist: track.info.author,
        duration: track.info.length,
        artwork: track.info.artworkUrl,
        uri: track.info.uri,
        isrc: track.info.isrc,
        source: track.info.sourceName,
      }));

      // Filter out the seed track to ensure autoplay moves forward
      const filtered = tracks.filter(
        (t: any) =>
          t.id !== effectiveVideoId &&
          t.id !== effectiveSpotifyId &&
          t.title.toLowerCase() !== effectiveQuery?.toLowerCase(),
      );

      const response = { tracks: filtered.length > 0 ? filtered : tracks };

      // Cache recommendations for 6 hours
      if (response.tracks.length > 0) {
        await redis.set(recCacheKey, response, { ex: 21600 });
      }

      res.json(response);
    } catch (error: any) {
      console.error('Recommendations error:', error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  },
);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error('Unauthorized'));
    return;
  }

  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    next(new Error('Unauthorized'));
    return;
  }

  socket.data.userId = user.uid;
  socket.data.username = user.name || user.email || user.uid;
  socket.data.tokenExpiresAt = user.exp
    ? user.exp * 1000
    : Date.now() + 55 * 60 * 1000;
  next();
});

function scheduleSocketExpiry(socket: SocketIOSocket): void {
  const existingTimer = socket.data.authExpiryTimer as NodeJS.Timeout | undefined;
  if (existingTimer) clearTimeout(existingTimer);

  const tokenExpiresAt =
    typeof socket.data.tokenExpiresAt === 'number'
      ? socket.data.tokenExpiresAt
      : Date.now() + 55 * 60 * 1000;

  const delayMs = Math.max(1000, tokenExpiresAt - Date.now() + 5000);
  socket.data.authExpiryTimer = setTimeout(() => {
    socket.emit('auth_error', { error: 'TokenExpired' });
    socket.disconnect(true);
  }, delayMs);
}

io.on('connection', (socket) => {
  const userId = socket.data.userId as string;
  const username = (socket.data.username as string) || userId;
  const secureRoomId = `user:${userId}`;

  scheduleSocketExpiry(socket);
  socket.join(secureRoomId);
  socket.data.roomId = secureRoomId;

  console.log(`[Socket] User connected: ${username} (${socket.id})`);

  socket.use((packet, next) => {
    if (packet[0] === 'refresh_token') {
      next();
      return;
    }

    const tokenExpiresAt = socket.data.tokenExpiresAt as number | undefined;
    if (typeof tokenExpiresAt === 'number' && Date.now() > tokenExpiresAt + 5000) {
      next(new Error('Token expired'));
      socket.emit('auth_error', { error: 'TokenExpired' });
      socket.disconnect(true);
      return;
    }

    next();
  });

  socket.on(
    'refresh_token',
    async (
      token: string,
      callback?: (payload: { ok: boolean; error?: string; expiresAt?: number }) => void,
    ) => {
      if (typeof token !== 'string' || !token.trim()) {
        callback?.({ ok: false, error: 'Missing token' });
        return;
      }

      const refreshedUser = await verifyFirebaseIdToken(token.trim());
      if (!refreshedUser || refreshedUser.uid !== userId) {
        callback?.({ ok: false, error: 'Unauthorized' });
        socket.emit('auth_error', { error: 'Unauthorized' });
        socket.disconnect(true);
        return;
      }

      socket.data.username = refreshedUser.name || refreshedUser.email || refreshedUser.uid;
      socket.data.tokenExpiresAt = refreshedUser.exp
        ? refreshedUser.exp * 1000
        : Date.now() + 55 * 60 * 1000;
      scheduleSocketExpiry(socket);

      callback?.({
        ok: true,
        expiresAt: socket.data.tokenExpiresAt as number,
      });
    },
  );

  socket.on('join_room', () => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(secureRoomId);
    socket.data.roomId = secureRoomId;
    console.log(`Socket ${socket.id} joined secure room ${secureRoomId}`);
  });

  registerJamHandlers(io, socket, redis);

  socket.on('disconnect', () => {
    const timer = socket.data.authExpiryTimer as NodeJS.Timeout | undefined;
    if (timer) clearTimeout(timer);
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Audio Backend running on port ${PORT}`);
});

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n[API] ${signal} received. Shutting down gracefully...`);

  // Stop accepting new connections
  io.close(() => {
    console.log('[API] Socket.IO closed.');
  });

  server.close(() => {
    console.log('[API] HTTP server closed.');

    // Clean up Lavalink connections
    try {
      lavalink.nodeManager.nodes.forEach((node) => {
        try { node.destroy(); } catch {}
      });
    } catch {}

    // Clear reconnect intervals
    nodeReconnectState.forEach((state) => {
      if (state.interval) clearInterval(state.interval);
    });
    nodeReconnectState.clear();

    console.log('[API] Cleanup complete. Exiting.');
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    console.error('[API] Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
