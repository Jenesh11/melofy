'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/firebase/auth-context';

interface SocketContextData {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextData>({
  socket: null,
  isConnected: false,
});
const SOCKET_TOKEN_REFRESH_INTERVAL_MS = 45 * 60 * 1000;

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let activeSocket: Socket | null = null;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectAuthHandler: (() => void) | null = null;
    let cancelled = false;

    if (!user) {
      return;
    }

    const refreshSocketToken = async (forceRefresh = false) => {
      if (!activeSocket || cancelled) return;

      try {
        const refreshedToken = await user.getIdToken(forceRefresh);
        if (cancelled || !activeSocket) return;

        activeSocket.auth = { token: refreshedToken };
        if (activeSocket.connected) {
          activeSocket.emit(
            'refresh_token',
            refreshedToken,
            (response?: { ok?: boolean; error?: string }) => {
              if (response?.ok) return;

              console.error(
                'Socket token refresh rejected:',
                response?.error || 'Unknown error',
              );
              activeSocket?.disconnect();
            },
          );
        }
      } catch (error) {
        console.error('Failed to refresh socket token:', error);
      }
    };

    const connectSocket = async () => {
      const token = await user.getIdToken();
      if (cancelled) return;

      const backendUrl = process.env.BACKEND_API_URL || '/';

      const socketInstance = io(backendUrl, {
        path: '/api/socket.io/',
        auth: {
          token,
        },
        // Skip HTTP long-polling entirely — connect straight to WebSocket.
        // This prevents the 500 (polling error) → 400 (stale session-ID) cascade
        // that occurs when socket.io tries to resume a dead polling session
        // after a reconnect or page refresh.
        transports: ['websocket'],
      });

      socketInstance.on('connect', () => {
        console.log('Connected to Audio Backend socket server');
        setIsConnected(true);
        void refreshSocketToken(false);
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from Audio Backend socket server');
        setIsConnected(false);
      });

      socketInstance.on('auth_error', (payload) => {
        console.error('Socket authentication error:', payload);
        socketInstance.disconnect();
      });

      reconnectAuthHandler = () => {
        void refreshSocketToken(true);
      };
      socketInstance.io.on('reconnect_attempt', reconnectAuthHandler);

      activeSocket = socketInstance;
      setSocket(socketInstance);
      refreshInterval = setInterval(() => {
        void refreshSocketToken(true);
      }, SOCKET_TOKEN_REFRESH_INTERVAL_MS);
    };

    connectSocket().catch((error) => {
      console.error('Failed to establish socket connection:', error);
      setIsConnected(false);
    });

    return () => {
      cancelled = true;
      if (refreshInterval) clearInterval(refreshInterval);
      if (activeSocket && reconnectAuthHandler) {
        activeSocket.io.off('reconnect_attempt', reconnectAuthHandler);
      }
      activeSocket?.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

  useEffect(() => {
    if (isConnected && socket) {
      const roomId = user?.uid;
      if (roomId) {
        socket.emit('join_room', roomId);
      }
    }
  }, [user?.uid, isConnected, socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
