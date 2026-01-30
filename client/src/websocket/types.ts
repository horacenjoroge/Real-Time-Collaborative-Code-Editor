export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  error?: string;
  reconnectAttempts: number;
}

/** Presence user (who's in the document) for sidebar display. */
export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  cursor: { line: number; column: number };
  selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null;
  lastSeen: number;
  joinedAt: number;
}

export interface SocketEvents {
  connected: {
    socketId: string;
    userId: string;
    username: string;
    timestamp: number;
  };
  'joined-document': {
    documentId: string;
    users: PresenceUser[];
  };
  'user-joined': {
    user: PresenceUser;
    timestamp: number;
  };
  'user-left': {
    userId: string;
    username: string;
    name?: string;
    timestamp: number;
    reason?: string;
  };
  'left-document': {
    documentId: string;
  };
  'broadcast-received': {
    from: {
      userId: string;
      username: string;
    };
    type: string;
    payload: unknown;
    timestamp: number;
  };
  'message-response': {
    original: {
      type: string;
      payload: unknown;
    };
    timestamp: number;
  };
  error: {
    message: string;
  };
  pong: {
    timestamp: number;
  };
  'document-operation': {
    documentId: string;
    userId: string;
    /**
     * Version the sender based this operation on.
     * Present on client->server and server->client messages.
     */
    baseVersion: number;
    /**
     * Version after the server applied this operation.
     */
    version: number;
    operations: unknown[]; // Operations are interpreted in the editor layer
    timestamp: number;
    clientOpId?: string;
  };
  'operation-ack': {
    documentId: string;
    userId: string;
    version: number;
    clientOpId?: string;
  };
  'cursor-update': {
    documentId: string;
    userId: string;
    cursor: { line: number; column: number };
    color?: string;
  };
}
