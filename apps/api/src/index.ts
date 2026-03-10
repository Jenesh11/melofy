import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import streamRouter from './routes/stream';
import spotifyRouter from './routes/spotify';
import { LavalinkManager } from 'lavalink-client';

const app = express();
app.use(cors());
app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

export const lavalink = new LavalinkManager({
    nodes: [
        {
            authorization: process.env.LAVALINK_PASSWORD!,
            host: process.env.LAVALINK_HOST!,
            port: parseInt(process.env.LAVALINK_PORT!),
            secure: process.env.LAVALINK_SECURE === "true",
            id: process.env.LAVALINK_NAME!,
            nodeType: "NodeLink"
        }
    ],
    sendToShard: () => {},
    client: {
        id: "123456789012345678",
        username: "MelofyBackend"
    }
});

lavalink.nodeManager.on("connect", (node) => {
    console.log(`[NodeLink] ✅ Connected to ${node.id}`);
});

lavalink.nodeManager.on("error", (node, error) => {
    if (error.message.includes("ECONNREFUSED")) {
      // Quietly handle connection refused during reconnect
      return; 
    }
    console.error(`[NodeLink] ❌ Error on ${node.id}:`, error.message);
});

// Reconnect state management
const nodeReconnectState = new Map<string, { interval?: NodeJS.Timeout, attempts: number }>();

lavalink.nodeManager.on("disconnect", (node, reason) => {
  console.warn(`[NodeLink] ⚠️  Disconnected from ${node.id}:`, reason?.reason || reason);
  
  if (!nodeReconnectState.has(node.id)) {
    nodeReconnectState.set(node.id, { attempts: 0 });
  }
  
  const state = nodeReconnectState.get(node.id)!;
  if (state.interval) return; // Already trying to reconnect

  console.log(`[NodeLink] 🔄 Starting reconnection heartbeat for ${node.id}...`);

  state.interval = setInterval(async () => {
    if (node.connected) {
      console.log(`[NodeLink] ✨ Reconnection successful for ${node.id}`);
      clearInterval(state.interval);
      state.interval = undefined;
      state.attempts = 0;
      return;
    }

    state.attempts++;
    
    // Only log every 6th attempt (approx every 30s) to keep logs clean
    if (state.attempts === 1 || state.attempts % 6 === 0) {
      console.log(`[NodeLink] ⏳ Node ${node.id} is offline. (Attempt ${state.attempts})`);
    }

    try {
      // Small guard: don't call connect if it's already in the middle of connecting
      // though node.connected check above mostly covers this.
      await node.connect();
    } catch (e: any) {
      // Most errors will fire the "error" event which we handle above
    }
  }, 5000);
});

lavalink.init({ id: "123456789012345678", username: "MelofyBackend" });


app.get('/health', (req, res) => {
  res.json({ status: 'ok', node: lavalink.nodeManager.nodes.size > 0 ? 'connected' : 'disconnected' });
});

// Proxy route for streaming
app.use('/api', streamRouter);

// Spotify API Integration Routes
app.use('/api/spotify', spotifyRouter);

// Search API
app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const node = lavalink.nodeManager.leastUsedNodes()[0];
    if (!node) return res.status(500).json({ error: 'No NodeLink nodes available' });

    const result = await node.search({ query: query }, { id: "MelofyInternal" });
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Recommendations API
app.get('/api/recommendations', async (req, res) => {
  const trackId = req.query.trackId as string;
  if (!trackId) return res.status(400).json({ error: 'Missing trackId' });

  try {
    const node = lavalink.nodeManager.leastUsedNodes()[0];
    if (!node) return res.status(500).json({ error: 'No NodeLink nodes available' });

    const result = await node.search({ query: `ytsearch: ${trackId} similar songs` }, { id: "MelofyAutoplay" });
    res.json(result);
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Recommendations failed' });
  }
});

io.on('connection', (socket) => {
  const username = socket.handshake.auth.username || 'Guest';
  console.log(`[Socket] 👤 User connected: ${username} (${socket.id})`);

  socket.on('join_room', (roomId: string) => {
    socket.rooms.forEach(room => {
      if (room !== socket.id) socket.leave(room);
    });
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`Socket ${socket.id} joined room ${roomId}`);
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
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Audio Backend running on port ${PORT}`);
});
