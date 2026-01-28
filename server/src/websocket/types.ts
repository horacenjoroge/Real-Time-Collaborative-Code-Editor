import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  roomId?: string;
}

export interface User {
  id: string;
  username: string;
  socketId: string;
  joinedAt: number;
  lastPing: number;
}

export interface Room {
  id: string;
  documentId: string;
  users: Map<string, User>;
  createdAt: number;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
}
