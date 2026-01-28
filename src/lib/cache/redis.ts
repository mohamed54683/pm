/**
 * Redis Cache Layer
 * Production-ready caching for scalability
 */

import Redis from 'ioredis';

// Cache configuration
const CACHE_CONFIG = {
  defaultTTL: 300, // 5 minutes
  dashboardTTL: 60, // 1 minute for dashboard data
  userTTL: 600, // 10 minutes for user data
  reportTTL: 300, // 5 minutes for reports
};

// Redis client (lazy initialization)
let redisClient: Redis | null = null;
let cacheEnabled = false;

/**
 * Initialize Redis connection
 */
export function initRedis(): Redis | null {
  if (process.env.ENABLE_REDIS_CACHE !== 'true') {
    console.log('Redis cache disabled');
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      password: process.env.REDIS_PASSWORD || undefined,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => {
      console.log('Redis connected');
      cacheEnabled = true;
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      cacheEnabled = false;
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    return null;
  }
}

/**
 * Get Redis client
 */
export function getRedis(): Redis | null {
  return redisClient || initRedis();
}

/**
 * Check if cache is available
 */
export function isCacheEnabled(): boolean {
  return cacheEnabled && redisClient !== null;
}

/**
 * Get cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isCacheEnabled()) return null;

  try {
    const value = await redisClient!.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set cached value
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number = CACHE_CONFIG.defaultTTL
): Promise<boolean> {
  if (!isCacheEnabled()) return false;

  try {
    await redisClient!.setex(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

/**
 * Delete cached value
 */
export async function cacheDelete(key: string): Promise<boolean> {
  if (!isCacheEnabled()) return false;

  try {
    await redisClient!.del(key);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

/**
 * Delete cached values by pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  if (!isCacheEnabled()) return false;

  try {
    const keys = await redisClient!.keys(pattern);
    if (keys.length > 0) {
      await redisClient!.del(...keys);
    }
    return true;
  } catch (error) {
    console.error('Cache delete pattern error:', error);
    return false;
  }
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  await cacheSet(key, data, ttl);

  return data;
}

// Cache key generators
export const CacheKeys = {
  dashboard: (userId: number) => `dashboard:${userId}`,
  users: (page: number, limit: number) => `users:list:${page}:${limit}`,
  user: (id: number) => `user:${id}`,
  roles: () => 'roles:list',
  audits: (restaurant: string, page: number) => `audits:${restaurant}:${page}`,
  reports: (type: string, page: number) => `reports:${type}:${page}`,
  restaurants: () => 'restaurants:list',
};

// Export config for external use
export { CACHE_CONFIG };
