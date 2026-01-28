import jwt from 'jsonwebtoken';
import { AuthenticatedSocket } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  username: string;
}

/**
 * Authenticate socket connection using JWT token
 * For now, we'll allow anonymous connections but validate tokens if provided
 */
export function authenticateSocket(
  socket: AuthenticatedSocket,
  token?: string
): { authenticated: boolean; userId?: string; username?: string } {
  if (!token) {
    // Allow anonymous connections for now
    // In production, you might want to require authentication
    const anonymousId = `anon-${socket.id}`;
    socket.userId = anonymousId;
    socket.username = 'Anonymous';
    return {
      authenticated: true,
      userId: anonymousId,
      username: 'Anonymous',
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    return {
      authenticated: true,
      userId: decoded.userId,
      username: decoded.username,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return { authenticated: false };
  }
}

/**
 * Generate JWT token for testing/development
 */
export function generateToken(userId: string, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
