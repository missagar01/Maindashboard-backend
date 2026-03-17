import dotenv from "dotenv";
import { createRequire } from "module";
import oracledb, {
  initOracleClient,
  isStoreOracleEnabled,
} from "./oracleClient.js";

dotenv.config();

const require = createRequire(import.meta.url);
const {
  initSSHTunnel,
  getLocalOraclePort,
  isTunnelActive,
} = require("../../../../config/sshTunnel.js");

let pool = null;
let poolPromise = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function getPositiveInteger(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function getOracleRuntimeConfig() {
  const usingSshTunnel = Boolean(readEnv("SSH_HOST") && readEnv("SSH_USER"));

  return {
    user: readEnv("STORE_ORACLE_USER", "ORACLE_USER"),
    password: readEnv("STORE_ORACLE_PASSWORD", "ORACLE_PASSWORD"),
    directConnectString: readEnv("STORE_ORACLE_CONNECTION_STRING", "ORACLE_CONNECTION_STRING"),
    serviceName: readEnv("STORE_ORACLE_SERVICE_NAME", "ORACLE_SERVICE_NAME") || "ora11g",
    localPort:
      typeof getLocalOraclePort === "function"
        ? getLocalOraclePort()
        : getPositiveInteger(readEnv("LOCAL_ORACLE_PORT"), 1521),
    usingSshTunnel,
    hasSshAuth: Boolean(
      readEnv("SSH_PASSWORD") || readEnv("SSH_KEY_PATH") || readEnv("SSH_PRIVATE_KEY")
    ),
    poolMin: getPositiveInteger(
      readEnv("STORE_ORACLE_POOL_MIN", "ORACLE_POOL_MIN"),
      1
    ),
    poolMax: getPositiveInteger(
      readEnv("STORE_ORACLE_POOL_MAX", "ORACLE_POOL_MAX"),
      10
    ),
    poolIncrement: getPositiveInteger(
      readEnv("STORE_ORACLE_POOL_INCREMENT", "ORACLE_POOL_INCREMENT"),
      1
    ),
    poolTimeout: getPositiveInteger(
      readEnv("STORE_ORACLE_POOL_TIMEOUT", "ORACLE_POOL_TIMEOUT"),
      60
    ),
    connectTimeout: getPositiveInteger(
      readEnv("STORE_ORACLE_CONNECT_TIMEOUT", "ORACLE_CONNECT_TIMEOUT"),
      10
    ),
    queueTimeout: getPositiveInteger(
      readEnv("STORE_ORACLE_QUEUE_TIMEOUT", "ORACLE_QUEUE_TIMEOUT"),
      30000
    ),
    queueMax: getPositiveInteger(
      readEnv("STORE_ORACLE_QUEUE_MAX", "ORACLE_QUEUE_MAX"),
      100
    ),
    stmtCacheSize: getPositiveInteger(
      readEnv("STORE_ORACLE_STMT_CACHE_SIZE", "ORACLE_STMT_CACHE_SIZE"),
      50
    ),
    initProbeDelayMs: getPositiveInteger(
      readEnv("STORE_ORACLE_TUNNEL_STABILIZE_MS"),
      2000
    ),
    connectRetries: getPositiveInteger(
      readEnv("STORE_ORACLE_CONNECT_RETRIES"),
      3
    ),
  };
}

function validateEnv(config) {
  const missing = [];

  if (!config.user) missing.push("ORACLE_USER");
  if (!config.password) missing.push("ORACLE_PASSWORD");

  if (config.usingSshTunnel) {
    if (!config.hasSshAuth) {
      missing.push("SSH_PASSWORD (or SSH_KEY_PATH or SSH_PRIVATE_KEY)");
    }
  } else if (!config.directConnectString) {
    missing.push("ORACLE_CONNECTION_STRING (or SSH_HOST/SSH_USER tunnel settings)");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Store Oracle environment variables: ${missing.join(", ")}`
    );
  }
}

async function resolveConnectString(config) {
  if (config.usingSshTunnel) {
    try {
      if (typeof isTunnelActive !== "function" || !isTunnelActive()) {
        console.log("Initializing shared SSH tunnel for Store Oracle...");
        await initSSHTunnel();
      } else {
        console.log("Reusing active shared SSH tunnel for Store Oracle");
      }

      await delay(config.initProbeDelayMs);

      const connectString = `127.0.0.1:${config.localPort}/${config.serviceName}`;
      console.log("Store Oracle using SSH tunnel");
      return connectString;
    } catch (error) {
      console.warn("Store Oracle SSH tunnel initialization failed:", error.message);

      if (!config.directConnectString) {
        throw error;
      }

      console.warn("Falling back to direct Store Oracle connection string");
    }
  }

  if (config.directConnectString) {
    console.log("Store Oracle using direct connection");
    return config.directConnectString;
  }

  throw new Error("No valid Store Oracle connection method configured");
}

async function closePoolInternal() {
  if (!pool) {
    return;
  }

  const activePool = pool;
  pool = null;

  try {
    await activePool.close(0);
    console.log("Store Oracle pool closed");
  } catch (error) {
    console.warn("Failed to close Store Oracle pool cleanly:", error.message);
  }
}

function isTransientOracleError(error) {
  const message = error?.message || "";
  return (
    message.includes("ORA-12537") ||
    message.includes("ORA-12541") ||
    message.includes("ORA-12170") ||
    message.includes("ORA-03113") ||
    message.includes("ORA-03114") ||
    message.includes("NJS-500") ||
    message.includes("NJS-040") ||
    message.includes("ECONNRESET") ||
    message.includes("socket hang up")
  );
}

export async function initPool() {
  if (pool) {
    return pool;
  }

  if (poolPromise) {
    return poolPromise;
  }

  const config = getOracleRuntimeConfig();
  validateEnv(config);

  poolPromise = (async () => {
    const oracleReady = initOracleClient();
    if (!oracleReady || !isStoreOracleEnabled()) {
      throw new Error(
        "Oracle Thick client is unavailable or disabled. Check Oracle Instant Client and ENABLE_ORACLE."
      );
    }

    const connectString = await resolveConnectString(config);

    const createdPool = await oracledb.createPool({
      user: config.user,
      password: config.password,
      connectString,
      poolMin: config.poolMin,
      poolMax: config.poolMax,
      poolIncrement: config.poolIncrement,
      poolTimeout: config.poolTimeout,
      connectTimeout: config.connectTimeout,
      queueTimeout: config.queueTimeout,
      queueMax: config.queueMax,
      stmtCacheSize: config.stmtCacheSize,
    });

    let probeConnection;
    try {
      probeConnection = await createdPool.getConnection();
      await probeConnection.execute("SELECT 1 FROM DUAL");
    } finally {
      if (probeConnection) {
        await probeConnection.close().catch(() => {});
      }
    }

    pool = createdPool;
    console.log("Store Oracle pool started");
    return createdPool;
  })();

  try {
    return await poolPromise;
  } catch (error) {
    poolPromise = null;
    await closePoolInternal();
    console.error("Store Oracle pool initialization failed:", error.message);
    throw error;
  }
}

export async function getConnection() {
  const { connectRetries } = getOracleRuntimeConfig();
  let lastError = null;

  for (let attempt = 1; attempt <= connectRetries; attempt += 1) {
    let connection;

    try {
      const activePool = await initPool();
      if (!activePool) {
        throw new Error("Store Oracle pool is not initialized");
      }

      connection = await activePool.getConnection();
      // Test the connection immediately
      await connection.execute("SELECT 1 FROM DUAL");
      return connection;
    } catch (error) {
      lastError = error;

      if (connection) {
        try {
          await connection.close();
        } catch (closeErr) {
          // Ignore close errors on already broken connections
        }
      }

      if (!isTransientOracleError(error) || attempt === connectRetries) {
        // If we've exhausted retries or it's a non-transient error, 
        // we might need to reset the pool for the next caller.
        if (attempt === connectRetries) {
          console.error(`Store Oracle connection failed after ${connectRetries} attempts. Clearing pool.`);
          poolPromise = null;
          pool = null;
        }
        break;
      }

      console.warn(
        `Store Oracle connection attempt ${attempt}/${connectRetries} failed: ${error.message}. Retrying...`
      );

      // Don't close the entire pool here as it kills other concurrent queries.
      // Just clear local references to force re-init on NEXT call if this connection failure 
      // suggests the pool is fundamentally broken.
      if (error.message.includes("NJS-040") || error.message.includes("NJS-500")) {
        poolPromise = null;
        pool = null;
      }

      await delay(attempt * 500); // Shorter delay for faster recovery
    }
  }

  throw lastError;
}

export async function closePool() {
  poolPromise = null;
  await closePoolInternal();
}
