const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL;

const client = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

let redisEnabled = true;
let lastError = null;

client.on("ready", () => {
  redisEnabled = true;
  console.log("Redis ready");
});

client.on("error", (err) => {
  redisEnabled = false;
  const msg = err.message;

  if (msg.includes("ECONNREFUSED")) {
    if (lastError !== "ECONNREFUSED") {
      console.warn("Redis connection refused (caching disabled, retrying...)");
      lastError = "ECONNREFUSED";
    }
    return;
  }

  console.warn("Redis error:", msg);
  lastError = msg;
});

client.on("connect", () => {
  lastError = null;
});

client.on("end", () => {
  redisEnabled = false;
  console.warn("Redis connection closed");
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    redisEnabled = false;
    console.warn("Redis disabled:", err.message);
  }
})();

function isAvailable() {
  return redisEnabled && client.isOpen;
}

module.exports = {
  isAvailable,

  async get(key) {
    if (!isAvailable()) return null;
    return client.get(key);
  },

  async set(key, value) {
    if (!isAvailable()) return null;
    return client.set(key, value);
  },

  async setEx(key, ttl, value) {
    if (!isAvailable()) return null;
    return client.setEx(key, ttl, value);
  },

  async del(key) {
    if (!isAvailable()) return null;
    return client.del(key);
  },

  async deletePattern(pattern) {
    if (!isAvailable()) return 0;

    const keys = [];
    for await (const matchedKey of client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(matchedKey);
    }

    if (!keys.length) {
      return 0;
    }

    return client.del(keys);
  },

  async quit() {
    if (client.isOpen) await client.quit();
  },
};
