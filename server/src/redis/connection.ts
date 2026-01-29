import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT || '6379');

let redis: Redis | null = null;

/**
 * Get Redis client. Connects lazily. Returns null if Redis is unavailable.
 */
export function getRedis(): Redis | null {
  if (redis !== null) {
    return redis;
  }

  try {
    redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err: Error) => {
      console.warn('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });

    return redis;
  } catch (err) {
    console.warn('Redis init failed:', err);
    return null;
  }
}

/**
 * Connect to Redis (call at startup if you need presence).
 */
export async function connectRedis(): Promise<Redis | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    await client.connect();
    return client;
  } catch (err) {
    console.warn('Redis connect failed:', err);
    redis = null;
    return null;
  }
}

/**
 * Close Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
