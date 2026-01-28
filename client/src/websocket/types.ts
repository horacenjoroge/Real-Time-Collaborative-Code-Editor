export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  error?: string;
  reconnectAttempts: number;
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
    users: Array<{
      id: string;
      username: string;
      joinedAt: number;
    }>;
  };
  'user-joined': {
    userId: string;
    username: string;
    timestamp: number;
  };
  'user-left': {
    userId: string;
    username: string;
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
}
