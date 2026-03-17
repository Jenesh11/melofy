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

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let activeSocket: Socket | null = null;
    let cancelled = false;

    if (!user) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const connectSocket = async () => {
      const token = await user.getIdToken();
      if (cancelled) return;

      const socketInstance = io('/', {
        transports: ['websocket'],
        auth: {
          token,
        },
      });

      socketInstance.on('connect', () => {
        console.log('Connected to Audio Backend socket server');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from Audio Backend socket server');
        setIsConnected(false);
      });

      activeSocket = socketInstance;
      setSocket(socketInstance);
    };

    connectSocket().catch((error) => {
      console.error('Failed to establish socket connection:', error);
      setIsConnected(false);
    });

    return () => {
      cancelled = true;
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
