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

// OT operation message sent over WebSocket
// Reuses the Operation type from the CRDT OT module.
import type { Operation } from '../crdt/ot';

export interface DocumentOperationMessage {
  documentId: string;
  userId: string;
  version: number;
  operations: Operation[];
  timestamp: number;
}
