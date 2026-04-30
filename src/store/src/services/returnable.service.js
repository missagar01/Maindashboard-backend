import { getConnection } from "../config/db.js";
import oracledb from "../config/oracleClient.js";
import { getOrSetCache, cacheKeys, DEFAULT_TTL } from "./redisCache.js";

const RETURNABLE_FROM_DATE = "TO_DATE('01-APR-2025', 'DD-MON-YYYY')";
const RETURNABLE_SOURCE_CTE = `
  WITH issued_rows AS (
    SELECT
      t.vrno,
      t.vrdate,
      t.series,
      t.acc_code,
      t.item_code,
      t.item_name,
      t.remark,
      t.um,
      t.qtyissued,
      t.mobile,
      t.email
    FROM view_itemtran_engine t
    WHERE t.entity_code = 'SR'
      AND t.series IN ('R3', 'N3')
      AND t.vrdate >= ${RETURNABLE_FROM_DATE}
  ),
  received_rows AS (
    SELECT
      a.ref1_vrno,
      a.item_code,
      MAX(a.qtyrecd) AS qtyreceived
    FROM view_itemtran_engine a
    WHERE a.entity_code = 'SR'
      AND a.trantype = 'RGP'
      AND a.ref1_vrno IS NOT NULL
    GROUP BY a.ref1_vrno, a.item_code
  )
`;

async function withOracleConnection(queryFn) {
  const conn = await getConnection();
  try {
    return await queryFn(conn);
  } finally {
    await conn.close();
  }
}

export async function getReturnableStats() {
  return getOrSetCache(
    cacheKeys.returnableStats(),
    async () =>
      withOracleConnection(async (conn) => {
        const sql = `
          ${RETURNABLE_SOURCE_CTE}
          SELECT
            COUNT(*) AS total_count,
            COUNT(CASE WHEN i.series = 'R3' THEN 1 END) AS returnable_count,
            COUNT(CASE WHEN i.series = 'N3' THEN 1 END) AS non_returnable_count,
            COUNT(CASE WHEN i.series = 'R3' AND r.ref1_vrno IS NOT NULL THEN 1 END) AS returnable_completed_count,
            COUNT(CASE WHEN i.series = 'R3' AND r.ref1_vrno IS NULL THEN 1 END) AS returnable_pending_count
          FROM issued_rows i
          LEFT JOIN received_rows r
            ON r.ref1_vrno = i.vrno
           AND r.item_code = i.item_code
        `;

        const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const row = result.rows?.[0] || {};

        return {
          TOTAL_COUNT: Number(row.TOTAL_COUNT || 0),
          RETURNABLE_COUNT: Number(row.RETURNABLE_COUNT || 0),
          NON_RETURNABLE_COUNT: Number(row.NON_RETURNABLE_COUNT || 0),
          RETURNABLE_COMPLETED_COUNT: Number(row.RETURNABLE_COMPLETED_COUNT || 0),
          RETURNABLE_PENDING_COUNT: Number(row.RETURNABLE_PENDING_COUNT || 0),
        };
      }),
    DEFAULT_TTL.RETURNABLE
  );
}

export async function getReturnableDetails() {
  return getOrSetCache(
    cacheKeys.returnableDetails(),
    async () =>
      withOracleConnection(async (conn) => {
        const sql = `
          ${RETURNABLE_SOURCE_CTE}
          SELECT
            CASE
              WHEN i.series = 'R3' THEN 'RETURNABLE'
              WHEN i.series = 'N3' THEN 'NON RETURANABLE'
              ELSE 'OTHER'
            END AS gatepass_type,
            i.vrdate,
            i.vrno,
            lhs_utility.get_name('acc_code', i.acc_code) AS party_name,
            i.item_code,
            i.item_name,
            i.remark,
            i.um AS unit,
            i.qtyissued,
            r.qtyreceived,
            i.mobile,
            i.email,
            CASE
              WHEN r.ref1_vrno IS NOT NULL THEN 'COMPLETED'
              ELSE 'PENDING'
            END AS gatepass_status
          FROM issued_rows i
          LEFT JOIN received_rows r
            ON r.ref1_vrno = i.vrno
           AND r.item_code = i.item_code
          ORDER BY i.vrdate DESC
        `;

        const result = await conn.execute(sql, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result.rows || [];
      }),
    DEFAULT_TTL.RETURNABLE
  );
}