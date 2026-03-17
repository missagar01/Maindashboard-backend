// services/repairGatePass.service.js
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";
import { getOrSetCache, cacheKeys, DEFAULT_TTL } from "./redisCache.js";

/**
 * Get Pending Repair Gate Pass
 * Query: P3 series gate passes that are not yet received (A3)
 * Uses Redis cache for fast retrieval
 */
export async function getPendingRepairGatePass() {
  return await getOrSetCache(
    cacheKeys.gatePassPending(),
    async () => {
      const conn = await getConnection();
      try {
        const sql = `
          SELECT t.vrno,
                 t.vrdate,
                 lhs_utility.get_name('dept_code', t.dept_code) AS department,
                 lhs_utility.get_name('acc_code', t.acc_code) AS partyname,
                 t.item_name,
                 t.item_code,
                 t.qtyissued,
                 t.um,
                 t.app_remark,
                 t.remark
          FROM view_itemtran_engine t
          WHERE t.entity_code = 'SR'
            AND SUBSTR(t.vrno, 1, 2) = 'P3'
            AND t.qty1 is null
            AND t.vrdate >= TRUNC(SYSDATE, 'MM')
            AND NOT EXISTS (
              SELECT 1 FROM view_itemtran_engine r
              WHERE r.entity_code = 'SR' AND SUBSTR(r.vrno, 1, 2) = 'A3' AND r.ref1_vrno = t.vrno
            )
          ORDER BY t.vrdate DESC, t.vrno DESC
        `;

        const result = await conn.execute(sql, [], {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        return result.rows || [];
      } catch (error) {
        console.error("Error fetching pending repair gate pass:", error);
        throw error;
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            console.error("Error closing connection:", err);
          }
        }
      }
    },
    DEFAULT_TTL.GATE_PASS
  );
}

/**
 * Get Received/History Repair Gate Pass
 * Query: A3 series gate passes (received)
 * Uses Redis cache for fast retrieval
 */
export async function getReceivedRepairGatePass() {
  return await getOrSetCache(
    cacheKeys.gatePassReceived(),
    async () => {
      const conn = await getConnection();
      try {
        const sql = `
          SELECT t.ref1_vrno AS repair_gate_pass,
                 t.vrno AS receive_gate_pass,
                 t.vrdate AS received_date,
                 lhs_utility.get_name('dept_code', t.dept_code) AS department,
                 lhs_utility.get_name('acc_code', t.acc_code) AS partyname,
                 t.item_name,
                 t.item_code,
                 t.qtyrecd,
                 t.um,
                 t.app_remark,
                 t.remark
          FROM view_itemtran_engine t
          WHERE t.entity_code = 'SR'
            AND t.series = 'A3'
            AND t.vrdate >= TRUNC(SYSDATE, 'MM')
          ORDER BY t.vrdate DESC, t.vrno DESC
        `;

        const result = await conn.execute(sql, [], {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        return result.rows || [];
      } catch (error) {
        console.error("Error fetching received repair gate pass:", error);
        throw error;
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            console.error("Error closing connection:", err);
          }
        }
      }
    },
    DEFAULT_TTL.GATE_PASS
  );
}

/**
 * Get counts for dashboard
 * Uses Redis cache for fast retrieval
 */
export async function getRepairGatePassCounts() {
  return await getOrSetCache(
    cacheKeys.gatePassCounts(),
    async () => {
      const conn = await getConnection();
      try {
        const pendingSql = `
          SELECT COUNT(*) AS count
          FROM view_itemtran_engine t
          WHERE t.entity_code = 'SR'
            AND SUBSTR(t.vrno, 1, 2) = 'P3'
            AND t.qty1 is null
            AND t.vrdate >= TRUNC(SYSDATE, 'MM')
            AND NOT EXISTS (
              SELECT 1 FROM view_itemtran_engine r
              WHERE r.entity_code = 'SR' AND SUBSTR(r.vrno, 1, 2) = 'A3' AND r.ref1_vrno = t.vrno
            )
        `;

        const historySql = `
          SELECT COUNT(*) AS count
          FROM view_itemtran_engine t
          WHERE t.entity_code = 'SR'
            AND t.series = 'A3'
            AND t.vrdate >= TRUNC(SYSDATE, 'MM')
        `;

        const [pendingResult, historyResult] = await Promise.all([
          conn.execute(pendingSql, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          }),
          conn.execute(historySql, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
          }),
        ]);

        return {
          pending: Number(pendingResult.rows?.[0]?.COUNT || pendingResult.rows?.[0]?.count || 0),
          history: Number(historyResult.rows?.[0]?.COUNT || historyResult.rows?.[0]?.count || 0),
        };
      } catch (error) {
        console.error("Error fetching repair gate pass counts:", error);
        throw error;
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (err) {
            console.error("Error closing connection:", err);
          }
        }
      }
    },
    DEFAULT_TTL.GATE_PASS
  );
}

