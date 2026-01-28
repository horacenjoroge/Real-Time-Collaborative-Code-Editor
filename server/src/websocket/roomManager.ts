import { AuthenticatedSocket, Room, User } from './types';

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly DISCONNECT_TIMEOUT = 60000; // 60 seconds - remove user if no ping for 60s
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Start periodic heartbeat check to remove dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.rooms.forEach((room, roomId) => {
        room.users.forEach((user, userId) => {
          // Remove users who haven't pinged in DISCONNECT_TIMEOUT
          if (now - user.lastPing > this.DISCONNECT_TIMEOUT) {
            console.log(
              `Removing inactive user ${user.username} (${userId}) from room ${roomId}`
            );
            room.users.delete(userId);
            
            // If room is empty, remove it after a delay
            if (room.users.size === 0) {
              setTimeout(() => {
                if (this.rooms.get(roomId)?.users.size === 0) {
                  this.rooms.delete(roomId);
                  console.log(`Removed empty room: ${roomId}`);
                }
              }, 60000); // Wait 60s before removing empty room
            }
          }
        });
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Create or get a room
   */
  getOrCreateRoom(documentId: string): Room {
    let room = this.rooms.get(documentId);
    if (!room) {
      room = {
        id: documentId,
        documentId,
        users: new Map(),
        createdAt: Date.now(),
      };
      this.rooms.set(documentId, room);
      console.log(`Created room: ${documentId}`);
    }
    return room;
  }

  /**
   * Join a user to a room
   */
  joinRoom(socket: AuthenticatedSocket, documentId: string): Room {
    const room = this.getOrCreateRoom(documentId);
    const user: User = {
      id: socket.userId || socket.id,
      username: socket.username || 'Anonymous',
      socketId: socket.id,
      joinedAt: Date.now(),
      lastPing: Date.now(),
    };

    room.users.set(user.id, user);
    socket.roomId = documentId;
    socket.join(documentId);

    console.log(
      `User ${user.username} (${user.id}) joined room ${documentId}. Total users: ${room.users.size}`
    );

    return room;
  }

  /**
   * Remove a user from a room
   */
  leaveRoom(socket: AuthenticatedSocket): void {
    if (!socket.roomId) return;

    const room = this.rooms.get(socket.roomId);
    if (!room) return;

    const userId = socket.userId || socket.id;
    const user = room.users.get(userId);
    
    if (user) {
      room.users.delete(userId);
      console.log(
        `User ${user.username} (${userId}) left room ${socket.roomId}. Remaining users: ${room.users.size}`
      );
    }

    socket.leave(socket.roomId);
    socket.roomId = undefined;

    // Clean up empty rooms after delay
    if (room.users.size === 0) {
      setTimeout(() => {
        if (this.rooms.get(socket.roomId!)?.users.size === 0) {
          this.rooms.delete(socket.roomId!);
          console.log(`Removed empty room: ${socket.roomId}`);
        }
      }, 60000);
    }
  }

  /**
   * Update user's last ping time
   */
  updateUserPing(socket: AuthenticatedSocket): void {
    if (!socket.roomId) return;

    const room = this.rooms.get(socket.roomId);
    if (!room) return;

    const userId = socket.userId || socket.id;
    const user = room.users.get(userId);
    if (user) {
      user.lastPing = Date.now();
    }
  }

  /**
   * Get room information
   */
  getRoom(documentId: string): Room | undefined {
    return this.rooms.get(documentId);
  }

  /**
   * Get all users in a room
   */
  getRoomUsers(documentId: string): User[] {
    const room = this.rooms.get(documentId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  /**
   * Cleanup on server shutdown
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.rooms.clear();
  }
}

export const roomManager = new RoomManager();
