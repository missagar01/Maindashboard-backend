const redisClient = require("../../../config/redis.js");
const crypto = require("crypto");

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  DASHBOARD: 300,        // 5 minutes - dashboard data changes frequently
  PENDING: 120,          // 2 minutes - pending data changes often
  HISTORY: 1800,         // 30 minutes - history data is more stable
  CUSTOMERS: 3600,       // 1 hour - customer lists change rarely
  TIMELINE: 60,          // 1 minute - timeline is very dynamic
};

/**
 * Generate a cache key from parameters
 */
function generateCacheKey(prefix, params = {}) {
  // Sort params to ensure consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  // Create hash for long keys to keep them short
  const paramString = sortedParams || 'default';
  const hash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 8);
  
  return `o2d:${prefix}:${hash}`;
}

/**
 * Get cached data
 */
async function getCached(key) {
  try {
    const cached = await redisClient.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // Silently fail - cache is optional
    if (!error.message.includes('ECONNREFUSED')) {
      console.warn(`⚠️ Cache get failed for ${key}:`, error.message);
    }
  }
  return null;
}

/**
 * Set cached data with TTL
 */
async function setCached(key, data, ttl = DEFAULT_TTL.PENDING) {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    // Silently fail - cache is optional
    if (!error.message.includes('ECONNREFUSED')) {
      console.warn(`⚠️ Cache set failed for ${key}:`, error.message);
    }
  }
}

/**
 * Invalidate cache by pattern (for cache invalidation)
 */
async function invalidateCache(pattern) {
  try {
    // Note: This is a simple implementation
    // For production, you might want to use Redis SCAN for pattern matching
    // For now, we'll just log - actual invalidation can be done per-key
    console.log(`🔄 Cache invalidation requested for pattern: ${pattern}`);
  } catch (error) {
    console.warn(`⚠️ Cache invalidation failed:`, error.message);
  }
}

/**
 * Cache wrapper for service functions
 */
async function withCache(cacheKey, ttl, fetchFunction) {
  // Try to get from cache
  const cached = await getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFunction();

  // Store in cache (non-blocking)
  setCached(cacheKey, data, ttl).catch(() => {
    // Ignore cache errors
  });

  return data;
}

module.exports = {
  generateCacheKey,
  getCached,
  setCached,
  invalidateCache,
  withCache,
  DEFAULT_TTL,
};




