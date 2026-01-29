import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  roomId?: string;
}

/** Editor position (1-based line, 1-based column for display). */
export interface Position {
  line: number;
  column: number;
}

/** Presence user: who's in the document, cursor, selection, color. */
export interface User {
  id: string;
  name: string;
  username?: string; // legacy, same as name
  color: string;
  cursor: { line: number; column: number };
  selection: { start: Position; end: Position } | null;
  socketId: string;
  joinedAt: number;
  lastPing: number;
  lastSeen: number;
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
