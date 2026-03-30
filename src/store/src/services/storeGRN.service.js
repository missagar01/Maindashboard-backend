import { getConnection } from "../config/db.js";
import oracledb from "oracledb";
import { getOrSetCache, cacheKeys, DEFAULT_TTL } from "./redisCache.js";

/**
 * 🔹 PENDING STORE GRN
 * Uses Redis cache for fast retrieval
 */
export async function getStoreGRNPending() {
    return await getOrSetCache(
        cacheKeys.storeGrnPending(),
        async () => {
            const conn = await getConnection();

            try {
                const sql = `
          SELECT DISTINCT
            TO_CHAR(t.lastupdate + INTERVAL '3' DAY, 'dd/MM/yyyy hh:mi:ss') AS PLANNEDDATE,
            t.vrno AS VRNO,
            t.vrdate AS VRDATE,
            t.partybillno AS PARTYBILLNO,
            t.partybillamt AS PARTYBILLAMT,
            lhs_utility.get_name('acc_code', t.acc_code) AS PARTYNAME
          FROM view_itemtran_engine t
          WHERE t.entity_code = 'SR'
            AND t.series = 'G3'
            AND t.trantype = 'PD'
            AND t.valuationdate IS NULL
          ORDER BY t.vrdate DESC, t.vrno DESC
        `;

                const result = await conn.execute(sql, [], {
                    outFormat: oracledb.OUT_FORMAT_OBJECT,
                });

                const rows = result.rows || [];

                // Debug (same style as PO)
                if (rows.length > 0) {
                    console.log("🔍 Store GRN Pending - First row keys:", Object.keys(rows[0]));
                }

                return {
                    rows,
                    total: rows.length,
                };
            } finally {
                await conn.close();
            }
        },
        DEFAULT_TTL.STORE_GRN
    );
}


