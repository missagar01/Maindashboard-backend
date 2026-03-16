import { createRequire } from "module";

const require = createRequire(import.meta.url);
const redis = require("../../../../config/redis.js");

const CACHE_NAMESPACE = "store:v2";

const DEFAULT_TTL = {
  STOCK: 90,
  PO: 45,
  INDENT: 45,
  DASHBOARD: 15,
  GATE_PASS: 45,
  UOM: 900,
  AUTH: 300,
  COST_LOCATION: 1800,
  STORE_ISSUE: 30,
  ITEMS: 1800,
  RETURNABLE: 45,
  REPAIR_FOLLOWUP: 20,
  STORE_GRN: 30,
  STORE_GRN_APPROVAL: 15,
  DEPARTMENTS: 300,
  SETTINGS: 60,
};

const memoryCache = new Map();
const inFlightFetches = new Map();
const keyVersions = new Map();
const registeredKeys = new Set();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createPatternMatcher(pattern) {
  return new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`);
}

function registerKey(key) {
  registeredKeys.add(key);
}

function getKeyVersion(key) {
  return keyVersions.get(key) || 0;
}

function bumpKeyVersion(key) {
  keyVersions.set(key, getKeyVersion(key) + 1);
}

function getMatchingKeys(pattern) {
  if (!pattern.includes("*")) {
    return [pattern];
  }

  const matcher = createPatternMatcher(pattern);
  const matches = [];

  for (const key of registeredKeys) {
    if (matcher.test(key)) {
      matches.push(key);
    }
  }

  return matches;
}

function getMemoryEntry(key) {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

function setMemoryEntry(key, data, ttlSeconds = null) {
  const hasTtl = Number.isFinite(ttlSeconds) && ttlSeconds > 0;

  memoryCache.set(key, {
    data,
    expiresAt: hasTtl ? Date.now() + (ttlSeconds * 1000) : null,
  });
}

function deleteMemoryEntries(pattern) {
  if (!pattern.includes("*")) {
    return memoryCache.delete(pattern) ? 1 : 0;
  }

  const matcher = createPatternMatcher(pattern);
  let deleted = 0;

  for (const key of memoryCache.keys()) {
    if (matcher.test(key)) {
      memoryCache.delete(key);
      deleted += 1;
    }
  }

  return deleted;
}

function clearInFlightFetches(pattern) {
  if (!pattern.includes("*")) {
    inFlightFetches.delete(pattern);
    return;
  }

  const matcher = createPatternMatcher(pattern);

  for (const key of inFlightFetches.keys()) {
    if (matcher.test(key)) {
      inFlightFetches.delete(key);
    }
  }
}

function normalizeKeyPart(value) {
  if (value === undefined || value === null || value === "") {
    return "na";
  }

  return encodeURIComponent(String(value).trim().toLowerCase());
}

function normalizePatternPart(value) {
  if (value === "*") {
    return "*";
  }

  return normalizeKeyPart(value);
}

function buildKey(prefix, ...parts) {
  return [CACHE_NAMESPACE, prefix, ...parts.map(normalizeKeyPart)].join(":");
}

function buildPattern(prefix, ...parts) {
  return [CACHE_NAMESPACE, prefix, ...parts.map(normalizePatternPart)].join(":");
}

export async function getCache(key) {
  registerKey(key);

  // Redis first avoids stale local memory hiding a fresher shared cache entry.
  if (redis.isAvailable()) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`[RedisCache] getCache error for key "${key}":`, err.message);
    }
  }

  return getMemoryEntry(key);
}

export async function setCache(key, data, ttlSeconds = null) {
  registerKey(key);
  setMemoryEntry(key, data, ttlSeconds);

  if (!redis.isAvailable()) {
    return true;
  }

  try {
    const serialized = JSON.stringify(data);

    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      await redis.setEx(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }

    return true;
  } catch (err) {
    console.warn(`[RedisCache] setCache error for key "${key}":`, err.message);
    return false;
  }
}

export async function deleteCache(pattern) {
  const matchingKeys = getMatchingKeys(pattern);

  for (const key of matchingKeys) {
    bumpKeyVersion(key);
    registeredKeys.delete(key);
  }

  clearInFlightFetches(pattern);
  const memoryDeletes = deleteMemoryEntries(pattern);

  if (!redis.isAvailable()) {
    return memoryDeletes;
  }

  try {
    if (pattern.includes("*")) {
      return memoryDeletes + (await redis.deletePattern(pattern));
    }

    return memoryDeletes + (await redis.del(pattern));
  } catch (err) {
    console.warn(`[RedisCache] deleteCache error for key "${pattern}":`, err.message);
    return memoryDeletes;
  }
}

export async function getOrSetCache(key, fetchFn, ttlSeconds = null) {
  registerKey(key);

  const cached = await getCache(key);
  if (cached !== null) {
    return cached;
  }

  if (inFlightFetches.has(key)) {
    return inFlightFetches.get(key);
  }

  const versionBeforeFetch = getKeyVersion(key);

  const fetchPromise = (async () => {
    const freshData = await fetchFn();

    // Do not re-populate cache with stale data after an invalidation raced this fetch.
    if (
      freshData !== null &&
      freshData !== undefined &&
      versionBeforeFetch === getKeyVersion(key)
    ) {
      await setCache(key, freshData, ttlSeconds);
    }

    return freshData;
  })();

  inFlightFetches.set(key, fetchPromise);

  try {
    return await fetchPromise;
  } finally {
    if (inFlightFetches.get(key) === fetchPromise) {
      inFlightFetches.delete(key);
    }
  }
}

export const cacheKeys = {
  stock: (fromDate, toDate) => buildKey("stock", fromDate, toDate),
  poPending: () => buildKey("po", "pending"),
  poHistory: () => buildKey("po", "history"),
  indentPending: () => buildKey("indent", "pending"),
  indentHistory: () => buildKey("indent", "history"),
  indentDashboard: () => buildKey("indent", "dashboard"),
  gatePassPending: () => buildKey("gatepass", "pending"),
  gatePassReceived: () => buildKey("gatepass", "received"),
  gatePassCounts: () => buildKey("gatepass", "counts"),
  uomItems: () => buildKey("uom", "items"),
  authUser: (userName, employeeId) => buildKey("auth", "user", userName, employeeId),
  costLocation: (divCode) => buildKey("costlocation", divCode || "all"),
  storeIssue: () => buildKey("storeissue", "all"),
  itemsMaster: () => buildKey("items", "master"),
  itemCategories: () => buildKey("items", "categories"),
  productsMaster: () => buildKey("products", "master"),
  vendorsMaster: () => buildKey("vendors", "master"),
  returnableStats: () => buildKey("returnable", "stats"),
  returnableDetails: () => buildKey("returnable", "details"),
  repairFollowups: () => buildKey("repairfollowup", "all"),
  repairFollowupById: (id) => buildKey("repairfollowup", "id", id),
  repairFollowupByIdPattern: () => buildPattern("repairfollowup", "id", "*"),
  storeGrnPending: () => buildKey("storegrn", "pending"),
  storeGrnApprovalAll: () => buildKey("storegrnapproval", "all"),
  departments: () => buildKey("departments", "all"),
  departmentHod: (department) => buildKey("departments", "hod", department),
  departmentHodPattern: () => buildPattern("departments", "hod", "*"),
  settingsUsers: () => buildKey("settings", "users"),
  dashboardRepair: () => buildKey("dashboard", "repair-system"),
};

export async function invalidateCache(pattern) {
  return deleteCache(pattern);
}

export { DEFAULT_TTL };
