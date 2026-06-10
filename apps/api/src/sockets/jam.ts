import crypto from 'crypto';
import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';
import { Redis } from '@upstash/redis';

const hostDisconnectTimers = new Map<string, NodeJS.Timeout>();
const PARTY_TTL_SECONDS = 4 * 60 * 60;
const eventRateLimits = new Map<string, { count: number; windowStartedAt: number }>();

const RATE_LIMITS = {
  playbackState: { maxEvents: 12, windowMs: 5000 },
  syncState: { maxEvents: 6, windowMs: 10000 },
} as const;

function isRateLimited(key: string, limit: { maxEvents: number; windowMs: number }) {
  const now = Date.now();
  const bucket = eventRateLimits.get(key);

  if (!bucket || now - bucket.windowStartedAt > limit.windowMs) {
    eventRateLimits.set(key, { count: 1, windowStartedAt: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit.maxEvents;
}

function getRateLimitKey(socket: SocketIOSocket, eventName: 'playback_state' | 'sync_state') {
  return `${socket.data.partyId || 'no-party'}:${socket.data.userId || 'anonymous'}:${eventName}`;
}

function getLivePartyState(partyData: any) {
  const currentTime = Number.isFinite(partyData.currentTime) ? partyData.currentTime : 0;
  const updatedAt = Number.isFinite(partyData.stateUpdatedAt) ? partyData.stateUpdatedAt : Date.now();
  const elapsedSeconds = partyData.isPlaying ? Math.max(0, (Date.now() - updatedAt) / 1000) : 0;
  const durationSeconds = Number.isFinite(partyData.currentTrack?.duration)
    ? partyData.currentTrack.duration / 1000
    : Number.POSITIVE_INFINITY;

  return {
    ...partyData,
    currentTime: Math.min(currentTime + elapsedSeconds, durationSeconds),
    stateUpdatedAt: Date.now(),
  };
}

function getSafeTime(time: unknown, fallback = 0) {
  return typeof time === 'number' && Number.isFinite(time) && time >= 0
    ? time
    : fallback;
}

export function registerJamHandlers(
  io: SocketIOServer,
  socket: SocketIOSocket,
  redis: Redis
) {
  const userId = socket.data.userId as string;
  const username = (socket.data.username as string) || userId;

  socket.on('create_party', async (callback?: (response: { ok: boolean, partyId?: string, error?: string }) => void) => {
    try {
      const partyId = crypto.randomBytes(3).toString('hex').toUpperCase(); 
      const roomId = `party:${partyId}`;
      
      await redis.set(roomId, JSON.stringify({
        hostId: userId,
        hostName: username,
        currentTrack: null,
        currentTime: 0,
        stateUpdatedAt: Date.now(),
        isPlaying: false,
        listenersCanControl: false,
        listeners: [],
      }), { ex: PARTY_TTL_SECONDS });

      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.isPartyHost = true;
      socket.data.partyId = partyId;

      console.log(`Socket ${socket.id} created party ${roomId} as host`);
      callback?.({ ok: true, partyId });
    } catch (error) {
      console.error('Failed to create party:', error);
      callback?.({ ok: false, error: 'Failed to create party' });
    }
  });

  socket.on('toggle_listener_control', async (data: { canControl: boolean }) => {
    if (!socket.data.isPartyHost || !socket.data.partyId) return;
    const roomId = `party:${socket.data.partyId}`;
    try {
      const partyDataStr = await redis.get<string | object>(roomId);
      if (partyDataStr) {
        const partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;
        partyData.listenersCanControl = !!data.canControl;
        await redis.set(roomId, JSON.stringify(partyData), { ex: PARTY_TTL_SECONDS });
        io.to(roomId).emit('listener_control_updated', { canControl: partyData.listenersCanControl });
      }
    } catch (error) {
      console.error('Failed to toggle listener control:', error);
    }
  });

  socket.on('get_party_info', async (partyId: string, callback?: (response: { ok: boolean, error?: string, hostName?: string, currentTrack?: any }) => void) => {
    if (!partyId) return callback?.({ ok: false, error: 'Invalid ID' });
    const roomId = `party:${partyId.toUpperCase()}`;
    try {
      const partyDataStr = await redis.get<string | object>(roomId);
      if (!partyDataStr) return callback?.({ ok: false, error: 'Not found' });
      const partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;
      const liveState = getLivePartyState(partyData);
      callback?.({ 
        ok: true, 
        hostName: liveState.hostName,
        currentTrack: liveState.currentTrack
      });
    } catch (e) {
      callback?.({ ok: false, error: 'Error' });
    }
  });

  socket.on('join_party', async (partyId: string, callback?: (response: { ok: boolean, error?: string, initialState?: any, isHost?: boolean }) => void) => {
    if (typeof partyId !== 'string' || !partyId) {
      callback?.({ ok: false, error: 'Invalid party ID' });
      return;
    }

    const roomId = `party:${partyId.toUpperCase()}`;
    try {
      const partyDataStr = await redis.get<string | object>(roomId);
      if (!partyDataStr) {
        callback?.({ ok: false, error: 'Session not found or expired' });
        return;
      }

      const partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;

      const isHost = partyData.hostId === userId;

      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.isPartyHost = isHost;
      socket.data.partyId = partyId.toUpperCase();

      if (isHost) {
        console.log(`Socket ${socket.id} rejoined party ${roomId} as host`);
        const timer = hostDisconnectTimers.get(partyId.toUpperCase());
        if (timer) {
          clearTimeout(timer);
          hostDisconnectTimers.delete(partyId.toUpperCase());
          console.log(`[JamSync] Host rejoined party ${partyId}. Grace period cancelled.`);
        }
        callback?.({ ok: true, initialState: getLivePartyState(partyData), isHost: true });
      } else {
        console.log(`Socket ${socket.id} joined party ${roomId} as listener`);
        if (!partyData.listeners) partyData.listeners = [];
        const isNewListener = !partyData.listeners.find((l: any) => l.userId === userId);
        if (isNewListener) {
          partyData.listeners.push({ userId, username });
          await redis.set(roomId, JSON.stringify(partyData), { ex: PARTY_TTL_SECONDS });
        }
        callback?.({ ok: true, initialState: getLivePartyState(partyData), isHost: false });
        
        if (isNewListener) {
          socket.to(roomId).emit('listener_joined', { username });
          io.to(roomId).emit('listeners_update', { listeners: partyData.listeners });
        }
      }
    } catch (error) {
      console.error('Failed to join party:', error);
      callback?.({ ok: false, error: 'Internal server error' });
    }
  });

  socket.on('leave_party', async () => {
    const pId = socket.data.partyId;
    if (!pId) return;

    const roomId = `party:${pId}`;
    console.log(`Socket ${socket.id} leaving party ${roomId}`);

    if (socket.data.isPartyHost) {
      await redis.del(roomId);
      socket.to(roomId).emit('party_ended');
    } else {
      try {
        const partyDataStr = await redis.get<string | object>(roomId);
        if (partyDataStr) {
          const partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;
          if (partyData.listeners) {
            partyData.listeners = partyData.listeners.filter((l: any) => l.userId !== userId);
            await redis.set(roomId, JSON.stringify(partyData), { ex: PARTY_TTL_SECONDS });
            io.to(roomId).emit('listeners_update', { listeners: partyData.listeners });
          }
        }
      } catch (e) {}
      socket.to(roomId).emit('listener_left', { username });
    }

    socket.leave(roomId);
    
    // Fallback to secure room
    const secureRoomId = `user:${userId}`;
    socket.data.roomId = secureRoomId;
    socket.data.isPartyHost = false;
    socket.data.partyId = undefined;
    socket.join(secureRoomId);
  });

  socket.on('queue_update', async (data) => {
    if (socket.data.roomId && socket.data.partyId) {
      if (!socket.data.isPartyHost) {
        const roomId = `party:${socket.data.partyId}`;
        try {
          const partyDataStr = await redis.get<string | object>(roomId);
          if (!partyDataStr) return;
          const partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;
          if (!partyData.listenersCanControl) return;
        } catch (e) { return; }
      }
      socket.to(socket.data.roomId).emit('queue_update', data);
    }
  });

  socket.on('playback_state', async (data) => {
    if (socket.data.roomId && socket.data.partyId) {
      if (isRateLimited(getRateLimitKey(socket, 'playback_state'), RATE_LIMITS.playbackState)) {
        console.warn(`[JamSync] Rate limited playback_state from ${userId} in party ${socket.data.partyId}`);
        return;
      }

      const roomId = `party:${socket.data.partyId}`;
      let partyData: any = null;

      try {
        const partyDataStr = await redis.get<string | object>(roomId);
        if (partyDataStr) {
          partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;
        }
      } catch (err) {
        console.error('Error fetching party state in Redis:', err);
        return;
      }

      if (!partyData) return;

      if (!socket.data.isPartyHost && !partyData.listenersCanControl) {
        return;
      }

      if (!['play_track', 'pause', 'resume', 'seek'].includes(data?.type)) {
        return;
      }

      if (data.type === 'seek' && !Number.isFinite(data.time)) {
        return;
      }

      const normalizedState = {
        ...data,
        time: getSafeTime(data.time, data.type === 'play_track' ? 0 : partyData.currentTime),
        serverSentAt: Date.now(),
      };

      socket.to(socket.data.roomId).emit('playback_state', normalizedState);
      
      if (data.type === 'play_track' && data.track) {
        partyData.currentTrack = data.track;
        partyData.isPlaying = true;
        partyData.currentTime = normalizedState.time;
        partyData.stateUpdatedAt = Date.now();
      } else if (data.type === 'pause') {
        partyData.isPlaying = false;
        partyData.currentTime = normalizedState.time;
        partyData.stateUpdatedAt = Date.now();
      } else if (data.type === 'resume') {
        partyData.isPlaying = true;
        partyData.currentTime = normalizedState.time;
        partyData.stateUpdatedAt = Date.now();
      } else if (data.type === 'seek') {
        partyData.currentTime = normalizedState.time;
        partyData.stateUpdatedAt = Date.now();
      }

      try {
        await redis.set(roomId, JSON.stringify(partyData), { ex: PARTY_TTL_SECONDS });
      } catch (err) {
        console.error('Error updating party state in Redis:', err);
      }
    }
  });

  socket.on('sync_state', async (data) => {
    if (!socket.data.roomId || !socket.data.partyId || !socket.data.isPartyHost) {
      return;
    }

    if (isRateLimited(getRateLimitKey(socket, 'sync_state'), RATE_LIMITS.syncState)) {
      console.warn(`[JamSync] Rate limited sync_state from host ${userId} in party ${socket.data.partyId}`);
      return;
    }

    if (!Number.isFinite(data?.time)) {
      return;
    }

    const roomId = `party:${socket.data.partyId}`;
    let partyData: any = null;

    try {
      const partyDataStr = await redis.get<string | object>(roomId);
      if (partyDataStr) {
        partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;
      }
    } catch (err) {
      console.error('Error fetching party state for sync in Redis:', err);
      return;
    }

    if (!partyData) return;

    const syncState = {
      ...data,
      time: Math.max(0, data.time),
      serverSentAt: Date.now(),
    };

    socket.to(socket.data.roomId).emit('sync_state', syncState);

    if (syncState.track) partyData.currentTrack = syncState.track;
    partyData.currentTime = syncState.time;
    partyData.isPlaying = syncState.isPlaying ?? partyData.isPlaying;
    partyData.stateUpdatedAt = Date.now();

    try {
      await redis.set(roomId, JSON.stringify(partyData), { ex: PARTY_TTL_SECONDS });
    } catch (err) {
      console.error('Error updating party sync state in Redis:', err);
    }
  });

  socket.on('disconnect', async () => {
    const pId = socket.data.partyId;
    if (!pId) return;

    const roomId = `party:${pId}`;

    if (socket.data.isPartyHost) {
      console.log(`[JamSync] Host for party ${pId} disconnected. Starting 15s grace period...`);
      const timer = setTimeout(async () => {
        hostDisconnectTimers.delete(pId);
        console.log(`[JamSync] Host grace period expired. Ending party ${pId} permanently.`);
        try {
          await redis.del(roomId);
          io.to(roomId).emit('party_ended');
        } catch (err) {
          console.error('Error ending party after host disconnect:', err);
        }
      }, 15000); // 15 seconds grace period
      hostDisconnectTimers.set(pId, timer);
      return;
    }

    try {
      const partyDataStr = await redis.get<string | object>(roomId);
      if (partyDataStr) {
        const partyData = typeof partyDataStr === 'string' ? JSON.parse(partyDataStr) : partyDataStr;
        if (partyData.listeners) {
          partyData.listeners = partyData.listeners.filter((l: any) => l.userId !== userId);
          await redis.set(roomId, JSON.stringify(partyData), { ex: PARTY_TTL_SECONDS });
          io.to(roomId).emit('listeners_update', { listeners: partyData.listeners });
        }
      }
    } catch (e) {}
  });
}
