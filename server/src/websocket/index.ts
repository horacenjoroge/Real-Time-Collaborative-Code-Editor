import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { User } from './types';
import {
  AuthenticatedSocket,
  DocumentOperationAckMessage,
  DocumentOperationMessage,
} from './types';
import { authenticateSocket } from './auth';
import { roomManager } from './roomManager';
import type { Operation } from '../crdt/ot';
import { transformOperations } from '../crdt/ot';
import { operationHistoryService } from '../operations/service';
import {
  addUserToPresence,
  removeUserFromPresence,
  updatePresenceHeartbeat,
  removeStalePresence,
} from '../presence/service';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 60000; // 60 seconds

// In-memory document operation history and version tracking.
const documentVersions = new Map<string, number>();
const documentOperationHistory = new Map<string, DocumentOperationMessage[]>();

/** Serialize user for client (no socketId). */
function toPresenceUser(u: User): { id: string; name: string; color: string; cursor: { line: number; column: number }; selection: { start: { line: number; column: number }; end: { line: number; column: number } } | null; lastSeen: number; joinedAt: number } {
  return {
    id: u.id,
    name: u.name,
    color: u.color,
    cursor: u.cursor,
    selection: u.selection,
    lastSeen: u.lastSeen,
    joinedAt: u.joinedAt,
  };
}

export function setupWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: PING_TIMEOUT,
    pingInterval: HEARTBEAT_INTERVAL,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    const result = authenticateSocket(socket, token);
    
    if (result.authenticated) {
      next();
    } else {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId || socket.id;
    const username = socket.username || 'Anonymous';
    
    console.log(`✅ Client connected: ${username} (${userId}) - Socket ID: ${socket.id}`);

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      username,
      timestamp: Date.now(),
    });

    // Handle joining a document room
    socket.on('join-document', async (data: { documentId: string }) => {
      try {
        const { documentId } = data;
        if (!documentId) {
          socket.emit('error', { message: 'Document ID is required' });
          return;
        }

        roomManager.joinRoom(socket, documentId);
        const users = roomManager.getRoomUsers(documentId);
        const me = users.find((u) => u.id === (socket.userId || socket.id));
        if (me) {
          await addUserToPresence(documentId, me);
        }

        // Notify the user they joined (full presence list)
        socket.emit('joined-document', {
          documentId,
          users: users.map(toPresenceUser),
        });

        // Broadcast to all others in the room (full user for presence sidebar)
        if (me) {
          socket.to(documentId).emit('user-joined', {
            user: toPresenceUser(me),
            timestamp: Date.now(),
          });
        }

        console.log(`User ${username} joined document: ${documentId}`);
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Handle leaving a document room
    socket.on('leave-document', async () => {
      if (socket.roomId) {
        const documentId = socket.roomId;
        const userId = socket.userId || socket.id;
        const username = socket.username || 'Anonymous';

        await removeUserFromPresence(documentId, userId);
        socket.to(documentId).emit('user-left', {
          userId,
          username,
          name: username,
          timestamp: Date.now(),
        });

        roomManager.leaveRoom(socket);
        socket.emit('left-document', { documentId });
      }
    });

    // Handle incoming OT operations for a document
    socket.on(
      'document-operation',
      (data: DocumentOperationMessage & { operations: Operation[] }) => {
      try {
        const { documentId, operations, baseVersion, clientOpId } = data;

        if (!documentId || !Array.isArray(operations) || operations.length === 0) {
          socket.emit('error', { message: 'Invalid operation payload' });
          return;
        }

        if (!socket.roomId || socket.roomId !== documentId) {
          socket.emit('error', { message: 'Not joined to this document room' });
          return;
        }

        const currentVersion = documentVersions.get(documentId) ?? 0;

        // Transform the incoming operations against any operations
        // that the server has already applied after baseVersion.
        const history = documentOperationHistory.get(documentId) ?? [];
        let transformedOps: Operation[] = operations;

        if (typeof baseVersion === 'number') {
          for (const past of history) {
            if (past.version > baseVersion) {
              transformedOps = transformOperations(transformedOps, past.operations);
            }
          }
        }

        const nextVersion = currentVersion + 1;

        const message: DocumentOperationMessage = {
          documentId,
          userId,
          baseVersion: typeof baseVersion === 'number' ? baseVersion : currentVersion,
          version: nextVersion,
          operations: transformedOps,
          timestamp: Date.now(),
          clientOpId,
        };

        // Store in history
        history.push(message);
        documentOperationHistory.set(documentId, history);
        documentVersions.set(documentId, nextVersion);

        // Persist operation to the database for long-term history.
        void operationHistoryService
          .storeOperation({
            documentId,
            userId,
            version: nextVersion,
            operations: transformedOps,
            timestamp: message.timestamp,
          })
          .catch((err) => {
            console.error('Failed to store operation history:', err);
          });

        // Broadcast to all other clients in the room (including the sender
        // so they can reconcile with the transformed version).
        socket.to(documentId).emit('document-operation', message);

        // Acknowledge back to the originating client so it can
        // advance its confirmed version and clear pending buffers.
        const ack: DocumentOperationAckMessage = {
          documentId,
          userId,
          version: nextVersion,
          clientOpId,
        };
        socket.emit('operation-ack', ack);
      } catch (error) {
        console.error('Error handling document operation:', error);
        socket.emit('error', { message: 'Failed to process document operation' });
      }
    });

    // Handle ping/pong heartbeat (updates lastSeen in memory and Redis)
    socket.on('ping', () => {
      roomManager.updateUserPing(socket);
      if (socket.roomId) {
        const userId = socket.userId || socket.id;
        void updatePresenceHeartbeat(socket.roomId, userId, { lastSeen: Date.now() });
      }
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('pong', () => {
      roomManager.updateUserPing(socket);
      if (socket.roomId) {
        const userId = socket.userId || socket.id;
        void updatePresenceHeartbeat(socket.roomId, userId, { lastSeen: Date.now() });
      }
    });

    // Cursor updates: broadcast to room only, do not persist
    socket.on('cursor-update', (data: { documentId: string; cursor: { line: number; column: number }; color?: string }) => {
      const { documentId, cursor, color } = data;
      if (!documentId || !cursor || typeof cursor.line !== 'number' || typeof cursor.column !== 'number') return;
      if (!socket.roomId || socket.roomId !== documentId) return;
      const uid = socket.userId || socket.id;
      socket.to(documentId).emit('cursor-update', {
        documentId,
        userId: uid,
        cursor,
        color: color ?? undefined,
      });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`❌ Client disconnected: ${username} (${userId}) - Reason: ${reason}`);

      if (socket.roomId) {
        const documentId = socket.roomId;
        const uid = socket.userId || socket.id;
        const uname = socket.username || 'Anonymous';

        await removeUserFromPresence(documentId, uid);
        socket.to(documentId).emit('user-left', {
          userId: uid,
          username: uname,
          name: uname,
          timestamp: Date.now(),
          reason,
        });

        roomManager.leaveRoom(socket);
      }
    });

    // Handle generic messages (for testing)
    socket.on('message', (data: { type: string; payload: unknown }) => {
      console.log(`Message from ${username}:`, data);
      
      // Echo back for testing
      socket.emit('message-response', {
        original: data,
        timestamp: Date.now(),
      });
    });

    // Handle broadcast messages to room
    socket.on('broadcast', (data: { type: string; payload: unknown }) => {
      if (!socket.roomId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      socket.to(socket.roomId).emit('broadcast-received', {
        from: {
          userId,
          username,
        },
        type: data.type,
        payload: data.payload,
        timestamp: Date.now(),
      });
    });
  });

  // Remove users from Redis + in-memory after 30s no heartbeat; broadcast user-left
  const PRESENCE_STALE_INTERVAL = 15000; // 15s
  const presenceStaleTimer = setInterval(async () => {
    for (const documentId of roomManager.getRoomIds()) {
      const staleIds = await removeStalePresence(documentId);
      for (const uid of staleIds) {
        const user = roomManager.removeUserById(documentId, uid);
        if (user) {
          io.to(documentId).emit('user-left', {
            userId: uid,
            username: user.name,
            name: user.name,
            timestamp: Date.now(),
            reason: 'timeout',
          });
        }
      }
    }
  }, PRESENCE_STALE_INTERVAL);

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    clearInterval(presenceStaleTimer);
    console.log('Cleaning up WebSocket server...');
    roomManager.cleanup();
    io.close();
  });

  process.on('SIGINT', () => {
    clearInterval(presenceStaleTimer);
    console.log('Cleaning up WebSocket server...');
    roomManager.cleanup();
    io.close();
  });

  console.log('🔌 WebSocket server initialized');
  return io;
}
