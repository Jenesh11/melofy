import 'dotenv/config';
import express from 'express';
import cors, { type CorsOptions } from 'cors';
import { Server as SocketIOServer, type Socket as SocketIOSocket } from 'socket.io';
import http from 'http';
import helmet from 'helmet';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import streamRouter from './routes/stream';
import spotifyRouter from './routes/spotify';
import lyricsRouter from './routes/lyrics';
import playerRouter from './routes/player';
import { LavalinkManager } from 'lavalink-client';
import { requireFirebaseAuth, verifyFirebaseIdToken } from './lib/firebaseAuth';

const app = express();

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

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

function getAuthenticatedRateLimitKey(req: express.Request): string {
  if (req.user?.uid) return `uid:${req.user.uid}`;
  const ip = req.ip || req.socket.remoteAddress || '';
  return `ip:${ipKeyGenerator(ip)}`;
}

const publicRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

const privateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  keyGenerator: getAuthenticatedRateLimitKey,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
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
      id: process.env.LAVALINK_NAME!,
      nodeType: 'NodeLink',
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

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    node: lavalink.nodeManager.nodes.size > 0 ? 'connected' : 'disconnected',
  });
});

app.use('/api', streamRouter);
app.use('/api/spotify', publicRateLimit, spotifyRouter);
app.use('/api/lyrics', publicRateLimit, lyricsRouter);
app.use('/api', playerRouter);

app.get('/api/search', requireFirebaseAuth, privateRateLimit, async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2 || trimmedQuery.length > 200) {
    return res.status(400).json({ error: 'Invalid query length' });
  }

  try {
    const node = lavalink.nodeManager.leastUsedNodes()[0];
    if (!node)
      return res.status(500).json({ error: 'No NodeLink nodes available' });

    const result = await node.search(
      { query: trimmedQuery },
      { id: req.user?.uid || 'MelofyInternal' },
    );

    res.json(result);
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
    const trackId = req.query.trackId as string;
    if (!trackId) return res.status(400).json({ error: 'Missing trackId' });

    const trimmedTrackId = trackId.trim();
    if (trimmedTrackId.length < 2 || trimmedTrackId.length > 300) {
      return res.status(400).json({ error: 'Invalid trackId length' });
    }

    try {
      const node = lavalink.nodeManager.leastUsedNodes()[0];
      if (!node)
        return res.status(500).json({ error: 'No NodeLink nodes available' });

      const result = await node.search(
        { query: `ytsearch: ${trimmedTrackId} similar songs` },
        { id: req.user?.uid || 'MelofyAutoplay' },
      );

      res.json(result);
    } catch (error) {
      console.error('Recommendations error:', error);
      res.status(500).json({ error: 'Recommendations failed' });
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
  socket.data.username = user.email || user.uid;
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

      socket.data.username = refreshedUser.email || refreshedUser.uid;
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

  socket.on('queue_update', (data) => {
    if (socket.data.roomId) {
      socket.to(socket.data.roomId).emit('queue_update', data);
    }
  });

  socket.on('playback_state', (data) => {
    if (socket.data.roomId) {
      socket.to(socket.data.roomId).emit('playback_state', data);
    }
  });

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
