const redis = require("../../../config/redis");
const crypto = require("crypto");

const DEFAULT_TTL = {
  DASHBOARD: 300,
  PENDING: 120,
  HISTORY: 1800,
  CUSTOMERS: 3600,
  TIMELINE: 60,
};

function generateCacheKey(prefix, params = {}) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}:${params[k]}`)
    .join("|");

  const hash = crypto
    .createHash("md5")
    .update(sorted || "default")
    .digest("hex")
    .slice(0, 8);

  return `o2d:${prefix}:${hash}`;
}

async function getCached(key) {
  if (!redis.isAvailable()) return null;

  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null; // fail silently
  }
}

async function setCached(key, data, ttl = DEFAULT_TTL.PENDING) {
  if (!redis.isAvailable()) return;

  try {
    redis.setEx(key, ttl, JSON.stringify(data)); // intentionally not awaited
  } catch {
    /* ignore */
  }
}

async function withCache(key, ttl, fetchFn) {
  const cached = await getCached(key);
  if (cached !== null) return cached;

  const fresh = await fetchFn();
  setCached(key, fresh, ttl);
  return fresh;
}

module.exports = {
  generateCacheKey,
  getCached,
  setCached,
  withCache,
  DEFAULT_TTL,
};
