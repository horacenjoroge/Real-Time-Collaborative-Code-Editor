import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket, DocumentOperationMessage } from './types';
import { authenticateSocket } from './auth';
import { roomManager } from './roomManager';
import type { Operation } from '../crdt/ot';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const PING_TIMEOUT = 60000; // 60 seconds

// In-memory document operation history and version tracking.
// In later phases this can be persisted to Redis/Postgres.
const documentVersions = new Map<string, number>();
const documentOperationHistory = new Map<string, DocumentOperationMessage[]>();

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
    socket.on('join-document', (data: { documentId: string }) => {
      try {
        const { documentId } = data;
        if (!documentId) {
          socket.emit('error', { message: 'Document ID is required' });
          return;
        }

        roomManager.joinRoom(socket, documentId);
        const users = roomManager.getRoomUsers(documentId);

        // Notify the user they joined
        socket.emit('joined-document', {
          documentId,
          users: users.map((u) => ({
            id: u.id,
            username: u.username,
            joinedAt: u.joinedAt,
          })),
        });

        // Notify other users in the room
        socket.to(documentId).emit('user-joined', {
          userId,
          username,
          timestamp: Date.now(),
        });

        console.log(`User ${username} joined document: ${documentId}`);
      } catch (error) {
        console.error('Error joining document:', error);
        socket.emit('error', { message: 'Failed to join document' });
      }
    });

    // Handle leaving a document room
    socket.on('leave-document', () => {
      if (socket.roomId) {
        const userId = socket.userId || socket.id;
        const username = socket.username || 'Anonymous';
        
        socket.to(socket.roomId).emit('user-left', {
          userId,
          username,
          timestamp: Date.now(),
        });

        roomManager.leaveRoom(socket);
        socket.emit('left-document', { documentId: socket.roomId });
      }
    });

    // Handle incoming OT operations for a document
    socket.on(
      'document-operation',
      (data: DocumentOperationMessage & { operations: Operation[] }) => {
      try {
        const { documentId, operations } = data;

        if (!documentId || !Array.isArray(operations) || operations.length === 0) {
          socket.emit('error', { message: 'Invalid operation payload' });
          return;
        }

        if (!socket.roomId || socket.roomId !== documentId) {
          socket.emit('error', { message: 'Not joined to this document room' });
          return;
        }

        const currentVersion = documentVersions.get(documentId) ?? 0;
        const nextVersion = currentVersion + 1;

        const message: DocumentOperationMessage = {
          documentId,
          userId,
          version: nextVersion,
          operations,
          timestamp: Date.now(),
        };

        // Store in history
        const history = documentOperationHistory.get(documentId) ?? [];
        history.push(message);
        documentOperationHistory.set(documentId, history);
        documentVersions.set(documentId, nextVersion);

        // Broadcast to all other clients in the room
        socket.to(documentId).emit('document-operation', message);
      } catch (error) {
        console.error('Error handling document operation:', error);
        socket.emit('error', { message: 'Failed to process document operation' });
      }
    });

    // Handle ping/pong heartbeat
    socket.on('ping', () => {
      roomManager.updateUserPing(socket);
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle client pong response
    socket.on('pong', () => {
      roomManager.updateUserPing(socket);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${username} (${userId}) - Reason: ${reason}`);
      
      if (socket.roomId) {
        const userId = socket.userId || socket.id;
        const username = socket.username || 'Anonymous';
        
        // Notify other users in the room
        socket.to(socket.roomId).emit('user-left', {
          userId,
          username,
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

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    console.log('Cleaning up WebSocket server...');
    roomManager.cleanup();
    io.close();
  });

  process.on('SIGINT', () => {
    console.log('Cleaning up WebSocket server...');
    roomManager.cleanup();
    io.close();
  });

  console.log('🔌 WebSocket server initialized');
  return io;
}
