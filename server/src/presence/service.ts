import { getRedis } from '../redis/connection';
import type { User, Position } from '../websocket/types';

const PRESENCE_SET_PREFIX = 'presence:set:';
const PRESENCE_DATA_PREFIX = 'presence:data:';
const PRESENCE_HEARTBEAT_TIMEOUT_MS = 30000; // 30s - remove user after no heartbeat

function presenceSetKey(documentId: string): string {
  return `${PRESENCE_SET_PREFIX}${documentId}`;
}

function presenceDataKey(documentId: string): string {
  return `${PRESENCE_DATA_PREFIX}${documentId}`;
}

/**
 * Serialize user for Redis (subset of fields we need to persist).
 */
function userToRedisValue(user: User): string {
  return JSON.stringify({
    id: user.id,
    name: user.name,
    color: user.color,
    cursor: user.cursor,
    selection: user.selection,
    socketId: user.socketId,
    joinedAt: user.joinedAt,
    lastPing: user.lastPing,
    lastSeen: user.lastSeen,
  });
}

function parseUserFromRedis(data: string): User | null {
  try {
    const o = JSON.parse(data) as Record<string, unknown>;
    const cursor =
      o.cursor && typeof o.cursor === 'object' && 'line' in o.cursor && 'column' in o.cursor
        ? { line: Number((o.cursor as { line: number }).line), column: Number((o.cursor as { column: number }).column) }
        : { line: 1, column: 1 };
    let selection: { start: Position; end: Position } | null = null;
    if (o.selection && typeof o.selection === 'object' && 'start' in o.selection && 'end' in o.selection) {
      const sel = o.selection as { start: Position; end: Position };
      selection = {
        start: { line: Number(sel.start?.line ?? 1), column: Number(sel.start?.column ?? 1) },
        end: { line: Number(sel.end?.line ?? 1), column: Number(sel.end?.column ?? 1) },
      };
    }
    return {
      id: String(o.id),
      name: String(o.name ?? o.username ?? 'Anonymous'),
      color: String(o.color ?? '#6b7280'),
      cursor,
      selection,
      socketId: String(o.socketId),
      joinedAt: Number(o.joinedAt ?? 0),
      lastPing: Number(o.lastPing ?? 0),
      lastSeen: Number(o.lastSeen ?? 0),
    };
  } catch {
    return null;
  }
}

/**
 * Add user to document presence: Redis SET for membership, HASH for user data.
 */
export async function addUserToPresence(documentId: string, user: User): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    const setKey = presenceSetKey(documentId);
    const dataKey = presenceDataKey(documentId);
    await client.sadd(setKey, user.id);
    await client.hset(dataKey, user.id, userToRedisValue(user));
    await client.pexpire(setKey, 86400 * 1000);
    await client.pexpire(dataKey, 86400 * 1000);
  } catch (err) {
    console.warn('Presence addUser failed:', err);
  }
}

/**
 * Remove user from document presence (SET + HASH).
 */
export async function removeUserFromPresence(documentId: string, userId: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.srem(presenceSetKey(documentId), userId);
    await client.hdel(presenceDataKey(documentId), userId);
  } catch (err) {
    console.warn('Presence removeUser failed:', err);
  }
}

/**
 * Update user's lastSeen (and optionally cursor/selection) in Redis.
 */
export async function updatePresenceHeartbeat(
  documentId: string,
  userId: string,
  payload: {
    lastSeen: number;
    cursor?: { line: number; column: number };
    selection?: { start: Position; end: Position } | null;
  }
): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    const dataKey = presenceDataKey(documentId);
    const raw = await client.hget(dataKey, userId);
    if (!raw) return;
    const user = parseUserFromRedis(raw);
    if (!user) return;
    user.lastSeen = payload.lastSeen;
    user.lastPing = payload.lastSeen;
    if (payload.cursor) user.cursor = payload.cursor;
    if (payload.selection !== undefined) user.selection = payload.selection;
    await client.hset(dataKey, userId, userToRedisValue(user));
  } catch (err) {
    console.warn('Presence heartbeat update failed:', err);
  }
}

/**
 * Get all users currently in document presence from Redis (SET members + HASH data).
 */
export async function getPresenceUsers(documentId: string): Promise<User[]> {
  const client = getRedis();
  if (!client) return [];
  try {
    const setKey = presenceSetKey(documentId);
    const dataKey = presenceDataKey(documentId);
    const userIds = await client.smembers(setKey);
    if (userIds.length === 0) return [];
    const map = await client.hmget(dataKey, ...userIds);
    const users: User[] = [];
    for (const value of map) {
      if (value) {
        const user = parseUserFromRedis(value);
        if (user) users.push(user);
      }
    }
    return users.sort((a, b) => a.joinedAt - b.joinedAt);
  } catch (err) {
    console.warn('Presence getUsers failed:', err);
    return [];
  }
}

/**
 * Remove users who have not sent a heartbeat in the last 30s.
 * Returns list of userIds that were removed (so server can broadcast user-left).
 */
export async function removeStalePresence(documentId: string): Promise<string[]> {
  const client = getRedis();
  if (!client) return [];
  const now = Date.now();
  const stale: string[] = [];
  try {
    const users = await getPresenceUsers(documentId);
    for (const user of users) {
      if (now - user.lastSeen > PRESENCE_HEARTBEAT_TIMEOUT_MS) {
        await client.srem(presenceSetKey(documentId), user.id);
        await client.hdel(presenceDataKey(documentId), user.id);
        stale.push(user.id);
      }
    }
    return stale;
  } catch (err) {
    console.warn('Presence removeStale failed:', err);
    return [];
  }
}

export const PRESENCE_HEARTBEAT_TIMEOUT = PRESENCE_HEARTBEAT_TIMEOUT_MS;
