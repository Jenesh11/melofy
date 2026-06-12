'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let activeSocket: Socket | null = null;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectAuthHandler: (() => void) | null = null;
    let cancelled = false;

    if (!userRef.current) {
      return;
    }

    const refreshSocketToken = async (forceRefresh = false) => {
      if (!activeSocket || cancelled) return;

      try {
        const currentUser = userRef.current;
        if (!currentUser) return;

        const refreshedToken = await currentUser.getIdToken(forceRefresh);
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
      const currentUser = userRef.current;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      let backendUrl = process.env.BACKEND_API_URL || '/';
      if (typeof window !== 'undefined' && window.location.port === '3000') {
        backendUrl = `http://${window.location.hostname}:3001`;
      }

      const socketInstance = io(backendUrl, {
        path: '/api/socket.io',
        auth: {
          token,
        },
        // Enable both HTTP long-polling and WebSockets, allowing a graceful
        // fallback to polling if the reverse proxy/Next.js rewrites do not
        // support WebSocket upgrade requests.
        transports: ['polling', 'websocket'],
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
  }, [user?.uid]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
