const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL

/**
 * SINGLE Redis instance
 */
const client = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      // Exponential backoff (handled internally, no state needed)
      return Math.min(retries * 100, 3000);
    },
  },
});

let redisEnabled = true;

/**
 * Attach minimal listeners (no heavy logic)
 */
client.on("ready", () => {
  redisEnabled = true;
  console.log("✅ Redis ready");
});


let lastError = null;

client.on("error", (err) => {
  redisEnabled = false;
  const msg = err.message;

  // Suppress repeated ECONNREFUSED or common connection errors to avoid spam
  if (msg.includes("ECONNREFUSED")) {
    if (lastError !== "ECONNREFUSED") {
      console.warn("⚠️ Redis connection refused (caching disabled, retrying...)");
      lastError = "ECONNREFUSED";
    }
  } else {
    console.warn("⚠️ Redis error:", msg);
    lastError = msg;
  }
});

client.on("connect", () => {
  // Reset error state on successful connection attempt
  // Note: 'ready' is better for ensuring usability, but 'connect' means we found the server
  lastError = null;
});

client.on("end", () => {
  redisEnabled = false;
  console.warn("⚠️ Redis connection closed");
});

/**
 * Fire-and-forget connect (non-blocking)
 */
(async () => {
  try {
    await client.connect();
  } catch (err) {
    redisEnabled = false;
    console.warn("⚠️ Redis disabled:", err.message);
  }
})();

/**
 * FAST guard — no async connect per request
 */
function isAvailable() {
  return redisEnabled && client.isOpen;
}

/**
 * PUBLIC API (thin wrappers only)
 */
module.exports = {
  isAvailable,

  async get(key) {
    if (!isAvailable()) return null;
    return client.get(key);
  },

  async setEx(key, ttl, value) {
    if (!isAvailable()) return null;
    return client.setEx(key, ttl, value);
  },

  async del(key) {
    if (!isAvailable()) return null;
    return client.del(key);
  },

  async quit() {
    if (client.isOpen) await client.quit();
  },
};





