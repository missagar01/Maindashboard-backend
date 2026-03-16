// src/services/costLocation.service.js
import { getConnection } from "../config/db.js";
import oracledb from "../config/oracleClient.js";
import { getOrSetCache, cacheKeys, DEFAULT_TTL } from "./redisCache.js";

export async function getCostLocationsService(divCode = null) {
  try {
    const cacheKey = cacheKeys.costLocation(divCode || "ALL");

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const conn = await getConnection();
        try {
          // If no divCode, fetch all cost locations for ENTITY_CODE = 'SR'
          const sql = `
            SELECT DISTINCT t.COST_NAME
            FROM view_cost_mast t
            WHERE t.ENTITY_CODE = 'SR'
              ${divCode ? 'AND (t.DIV_CODE IS NULL OR t.DIV_CODE = :divCode)' : ''}
            ORDER BY t.COST_NAME
          `;

          const binds = divCode ? { divCode } : {};

          const result = await conn.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          });

          return result.rows || [];
        } finally {
          if (conn) {
            try {
              await conn.close();
            } catch (closeErr) {
              console.error("Error closing Oracle connection:", closeErr);
            }
          }
        }
      },
      DEFAULT_TTL.COST_LOCATION
    );

    return {
      ok: true,
      rows: result || [],
    };
  } catch (err) {
    console.error("getCostLocationsService error:", err);
    return {
      ok: false,
      error: err.message || "Oracle query failed",
    };
  }
}

// Get Cost Locations for RP Division
export async function getCostLocationsRP() {
  try {
    const cacheKey = cacheKeys.costLocation("RP");

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const conn = await getConnection();
        try {
          const sql = `
            SELECT DISTINCT t.COST_NAME
            FROM view_cost_mast t
            WHERE t.ENTITY_CODE = 'SR'
              AND (t.DIV_CODE IS NULL OR t.DIV_CODE = 'RP')
            ORDER BY t.COST_NAME
          `;

          const result = await conn.execute(sql, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          });

          return result.rows || [];
        } finally {
          if (conn) {
            try {
              await conn.close();
            } catch (closeErr) {
              console.error("Error closing Oracle connection:", closeErr);
            }
          }
        }
      },
      DEFAULT_TTL.COST_LOCATION
    );

    return {
      ok: true,
      rows: result || [],
    };
  } catch (err) {
    console.error("getCostLocationsRP error:", err);
    return {
      ok: false,
      error: err.message || "Oracle query failed",
    };
  }
}

// Get Cost Locations for PM Division
export async function getCostLocationsPM() {
  try {
    const cacheKey = cacheKeys.costLocation("PM");

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const conn = await getConnection();
        try {
          const sql = `
            SELECT DISTINCT t.COST_NAME
            FROM view_cost_mast t
            WHERE t.ENTITY_CODE = 'SR'
              AND (t.DIV_CODE IS NULL OR t.DIV_CODE = 'PM')
            ORDER BY t.COST_NAME
          `;

          const result = await conn.execute(sql, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          });

          return result.rows || [];
        } finally {
          if (conn) {
            try {
              await conn.close();
            } catch (closeErr) {
              console.error("Error closing Oracle connection:", closeErr);
            }
          }
        }
      },
      DEFAULT_TTL.COST_LOCATION
    );

    return {
      ok: true,
      rows: result || [],
    };
  } catch (err) {
    console.error("getCostLocationsPM error:", err);
    return {
      ok: false,
      error: err.message || "Oracle query failed",
    };
  }
}

// Get Cost Locations for CO Division (DIV_CODE IS NULL only)
export async function getCostLocationsCO() {
  try {
    const cacheKey = cacheKeys.costLocation("CO");

    const result = await getOrSetCache(
      cacheKey,
      async () => {
        const conn = await getConnection();
        try {
          const sql = `
            SELECT DISTINCT t.COST_NAME
            FROM view_cost_mast t
            WHERE t.ENTITY_CODE = 'SR'
              AND t.DIV_CODE IS NULL
            ORDER BY t.COST_NAME
          `;

          const result = await conn.execute(sql, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          });

          return result.rows || [];
        } finally {
          if (conn) {
            try {
              await conn.close();
            } catch (closeErr) {
              console.error("Error closing Oracle connection:", closeErr);
            }
          }
        }
      },
      DEFAULT_TTL.COST_LOCATION
    );

    return {
      ok: true,
      rows: result || [],
    };
  } catch (err) {
    console.error("getCostLocationsCO error:", err);
    return {
      ok: false,
      error: err.message || "Oracle query failed",
    };
  }
}

