import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, SocketEvents } from './types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export interface UseWebSocketOptions {
  token?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    token,
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    connecting: false,
    reconnecting: false,
    reconnectAttempts: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    isManualDisconnectRef.current = false;
    setStatus((prev) => ({
      ...prev,
      connecting: true,
      reconnecting: reconnectAttemptsRef.current > 0,
      error: undefined,
    }));

    const socket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // We'll handle reconnection manually
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      reconnectAttemptsRef.current = 0;
      setStatus({
        connected: true,
        connecting: false,
        reconnecting: false,
        reconnectAttempts: 0,
      });
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setStatus((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
      }));
      onDisconnect?.(reason);

      // Auto-reconnect if not manual disconnect
      if (!isManualDisconnectRef.current && reason !== 'io client disconnect') {
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setStatus((prev) => ({
        ...prev,
        connected: false,
        connecting: false,
        error: error.message,
      }));
      onError?.(error);

      // Attempt reconnect on connection error
      if (!isManualDisconnectRef.current) {
        attemptReconnect();
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error);
      setStatus((prev) => ({
        ...prev,
        error: error.message,
      }));
      onError?.(new Error(error.message));
    });

    socketRef.current = socket;
  }, [token, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus({
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
    });
  }, []);

  const attemptReconnect = useCallback(() => {
    if (isManualDisconnectRef.current) {
      return;
    }

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      setStatus((prev) => ({
        ...prev,
        reconnecting: false,
        error: 'Max reconnection attempts reached. Please refresh the page.',
      }));
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
      MAX_RECONNECT_DELAY
    );

    console.log(
      `Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`
    );

    setStatus((prev) => ({
      ...prev,
      reconnecting: true,
      reconnectAttempts: reconnectAttemptsRef.current,
    }));

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const emit = useCallback(
    (event: keyof SocketEvents | string, data: unknown) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data as never);
      } else {
        console.warn('Socket not connected, cannot emit:', event);
      }
    },
    []
  );

  const on = useCallback(<K extends keyof SocketEvents>(
    event: K,
    handler: (data: SocketEvents[K]) => void
  ) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler as never);
    }
  }, []);

  const off = useCallback(<K extends keyof SocketEvents>(
    event: K,
    handler?: (data: SocketEvents[K]) => void
  ) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler as never);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket: socketRef.current,
    status,
    connect,
    disconnect,
    emit,
    on,
    off,
    isConnected: status.connected,
  };
}
