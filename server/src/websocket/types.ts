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
  /**
   * The document version that the client based this operation on.
   * For client->server messages this is required.
   */
  baseVersion: number;
  /**
   * The document version after the server has applied this operation.
   * For server->client messages this is set by the server.
   */
  version: number;
  operations: Operation[];
  timestamp: number;
  /**
   * Optional client-generated identifier so we can correlate acks
   * and echoed operations with the original local operation.
   */
  clientOpId?: string;
}

export interface DocumentOperationAckMessage {
  documentId: string;
  userId: string;
  /**
   * The document version on the server after applying the acknowledged op.
   */
  version: number;
  /**
   * The client operation id that is being acknowledged.
   */
  clientOpId?: string;
}
