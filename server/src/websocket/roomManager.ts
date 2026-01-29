import { AuthenticatedSocket, Room, User } from './types';

/** Distinct colors for presence avatars (readable on dark background). */
const PRESENCE_COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

function pickColorForRoom(room: Room): string {
  const used = new Set(Array.from(room.users.values()).map((u) => u.color).filter(Boolean));
  for (const c of PRESENCE_COLORS) {
    if (!used.has(c)) return c;
  }
  return PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)];
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds check
  private readonly DISCONNECT_TIMEOUT = 30000; // 30 seconds - remove user after no heartbeat
  private heartbeatInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Start periodic heartbeat check to remove dead connections (30s timeout).
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      this.rooms.forEach((room, roomId) => {
        room.users.forEach((user, userId) => {
          if (now - user.lastSeen > this.DISCONNECT_TIMEOUT) {
            console.log(
              `Removing inactive user ${user.name} (${userId}) from room ${roomId}`
            );
            room.users.delete(userId);
            if (room.users.size === 0) {
              setTimeout(() => {
                if (this.rooms.get(roomId)?.users.size === 0) {
                  this.rooms.delete(roomId);
                  console.log(`Removed empty room: ${roomId}`);
                }
              }, 60000);
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
   * Join a user to a room. Assigns a random color and initial cursor.
   */
  joinRoom(socket: AuthenticatedSocket, documentId: string): Room {
    const room = this.getOrCreateRoom(documentId);
    const name = socket.username || 'Anonymous';
    const user: User = {
      id: socket.userId || socket.id,
      name,
      username: name,
      color: pickColorForRoom(room),
      cursor: { line: 1, column: 1 },
      selection: null,
      socketId: socket.id,
      joinedAt: Date.now(),
      lastPing: Date.now(),
      lastSeen: Date.now(),
    };

    room.users.set(user.id, user);
    socket.roomId = documentId;
    socket.join(documentId);

    console.log(
      `User ${user.name} (${user.id}) joined room ${documentId}. Total users: ${room.users.size}`
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
        `User ${user.name} (${userId}) left room ${socket.roomId}. Remaining users: ${room.users.size}`
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
   * Update user's last ping / lastSeen (and optionally cursor/selection).
   */
  updateUserPing(
    socket: AuthenticatedSocket,
    opts?: { cursor?: { line: number; column: number }; selection?: { start: { line: number; column: number }; end: { line: number; column: number } } | null }
  ): void {
    if (!socket.roomId) return;

    const room = this.rooms.get(socket.roomId);
    if (!room) return;

    const userId = socket.userId || socket.id;
    const user = room.users.get(userId);
    if (user) {
      const now = Date.now();
      user.lastPing = now;
      user.lastSeen = now;
      if (opts?.cursor) user.cursor = opts.cursor;
      if (opts?.selection !== undefined) user.selection = opts.selection;
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
   * Get all document/room ids (for presence stale cleanup).
   */
  getRoomIds(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * Remove a user from a room by id (e.g. after Redis stale cleanup). Returns the removed user.
   */
  removeUserById(documentId: string, userId: string): User | undefined {
    const room = this.rooms.get(documentId);
    if (!room) return undefined;
    const user = room.users.get(userId);
    if (user) {
      room.users.delete(userId);
      return user;
    }
    return undefined;
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
