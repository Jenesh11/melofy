import crypto from 'crypto';
import { Server as SocketIOServer, Socket as SocketIOSocket } from 'socket.io';
import { Redis } from '@upstash/redis';

const hostDisconnectTimers = new Map<string, NodeJS.Timeout>();

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
      }), { ex: 4 * 60 * 60 }); 

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
        await redis.set(roomId, JSON.stringify(partyData), { ex: 4 * 60 * 60 });
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
      callback?.({ 
        ok: true, 
        hostName: partyData.hostName,
        currentTrack: partyData.currentTrack
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
        callback?.({ ok: true, initialState: partyData, isHost: true });
      } else {
        console.log(`Socket ${socket.id} joined party ${roomId} as listener`);
        if (!partyData.listeners) partyData.listeners = [];
        const isNewListener = !partyData.listeners.find((l: any) => l.userId === userId);
        if (isNewListener) {
          partyData.listeners.push({ userId, username });
          await redis.set(roomId, JSON.stringify(partyData), { ex: 4 * 60 * 60 });
        }
        callback?.({ ok: true, initialState: partyData, isHost: false });
        
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
            await redis.set(roomId, JSON.stringify(partyData), { ex: 4 * 60 * 60 });
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
      
      socket.to(socket.data.roomId).emit('playback_state', data);
      
      if (data.type === 'play_track' && data.track) {
        partyData.currentTrack = data.track;
        partyData.isPlaying = true;
        partyData.currentTime = 0;
        partyData.stateUpdatedAt = Date.now();
      } else if (data.type === 'pause') {
        partyData.isPlaying = false;
        partyData.currentTime = data.time ?? partyData.currentTime;
        partyData.stateUpdatedAt = Date.now();
      } else if (data.type === 'resume') {
        partyData.isPlaying = true;
        partyData.currentTime = data.time ?? partyData.currentTime;
        partyData.stateUpdatedAt = Date.now();
      } else if (data.type === 'seek') {
        partyData.currentTime = data.time;
        partyData.stateUpdatedAt = Date.now();
      } else if (data.type === 'sync') {
        partyData.currentTime = data.time;
        partyData.isPlaying = data.isPlaying ?? partyData.isPlaying;
        partyData.stateUpdatedAt = Date.now();
      }

      try {
        await redis.set(roomId, JSON.stringify(partyData), { ex: 4 * 60 * 60 });
      } catch (err) {
        console.error('Error updating party state in Redis:', err);
      }
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
          await redis.set(roomId, JSON.stringify(partyData), { ex: 4 * 60 * 60 });
          io.to(roomId).emit('listeners_update', { listeners: partyData.listeners });
        }
      }
    } catch (e) {}
  });
}
