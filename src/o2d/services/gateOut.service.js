const { getConnection } = require("../config/db.js");
const oracledb = require("oracledb");
const { generateCacheKey, withCache, DEFAULT_TTL } = require("../utils/cacheHelper.js");

// 🟢 Pending Gate Out Data with Filters
async function getPendingGateOutData(offset = 0, limit = 50, customer = '', search = '') {
  const cacheKey = generateCacheKey("gate-out:pending", { offset, limit, customer, search });

  return await withCache(cacheKey, DEFAULT_TTL.PENDING, async () => {
    let whereClause = `
    WHERE t.entity_code = 'SR'
      AND t.order_tcode = 'O'
      AND t.outdate IS NULL
      AND (SELECT DISTINCT b.vrno 
           FROM view_itemtran_engine b 
           WHERE b.order_vrno = t.order_vrno 
             AND b.entity_code = 'SR') IS NOT NULL
  `;

    // 🔍 Customer filter
    if (customer) {
      whereClause += ` AND UPPER(lhs_utility.get_name('acc_code', t.acc_code)) LIKE UPPER('%${customer.replace(/'/g, "''")}%')`;
    }

    // 🔍 Search filter
    if (search) {
      whereClause += ` AND (
      UPPER(t.order_vrno) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(t.vrno) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(lhs_utility.get_name('acc_code', t.acc_code)) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(t.truckno) LIKE UPPER('%${search.replace(/'/g, "''")}%')
    )`;
    }

    // Count query
    const countQuery = `
    SELECT COUNT(*) AS total_count
    FROM view_gatetran_engine t
    ${whereClause}
  `;

    // Data query
    const dataQuery = `
    SELECT * FROM (
      SELECT a.*, ROWNUM rnum FROM (
        SELECT 
          (SELECT a.outdate 
           FROM view_weighbridge_engine a 
           WHERE a.wslipno = t.Wslip_No 
             AND a.entity_code = 'SR') + INTERVAL '01' HOUR AS plannedtimestamp,
          t.order_vrno,
          t.vrno,
          t.vrdate,
          lhs_utility.get_name('acc_code', t.acc_code) AS partyname,
          t.truckno,
          (SELECT DISTINCT b.vrno 
           FROM view_itemtran_engine b 
           WHERE b.order_vrno = t.order_vrno 
             AND b.entity_code = 'SR') AS invoiceno
        FROM view_gatetran_engine t
        ${whereClause}
        ORDER BY t.vrdate ASC
      ) a
      WHERE ROWNUM <= :endRow
    )
    WHERE rnum > :startRow
  `;

    const params = { startRow: offset, endRow: offset + limit };
    let connection;

    try {
      connection = await getConnection();
      const [countResult, dataResult] = await Promise.all([
        connection.execute(countQuery, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
        connection.execute(dataQuery, params, { outFormat: oracledb.OUT_FORMAT_OBJECT })
      ]);
      return {
        data: dataResult.rows,
        totalCount: countResult.rows[0]?.TOTAL_COUNT || 0
      };
    } catch (error) {
      console.error("Error fetching pending gate out data:", error);
      throw error;
    } finally {
      if (connection) await connection.close();
    }
  });
}

// 🟣 Gate Out History Data with Filters
async function getGateOutHistoryData(offset = 0, limit = 50, customer = '', search = '') {
  const cacheKey = generateCacheKey("gate-out:history", { offset, limit, customer, search });

  return await withCache(cacheKey, DEFAULT_TTL.HISTORY, async () => {
    let whereClause = `
    WHERE t.entity_code = 'SR'
      AND t.vrdate >= TO_DATE('01-APR-2025', 'DD-MON-YYYY')
      AND t.outdate IS NOT NULL
      AND t.order_tcode = 'O'
  `;

    // 🔍 Customer filter
    if (customer) {
      whereClause += ` AND UPPER(lhs_utility.get_name('acc_code', t.acc_code)) LIKE UPPER('%${customer.replace(/'/g, "''")}%')`;
    }

    // 🔍 Search filter
    if (search) {
      whereClause += ` AND (
      UPPER(t.order_vrno) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(t.vrno) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(t.Wslip_No) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(t.ref1_vrno) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(lhs_utility.get_name('acc_code', t.acc_code)) LIKE UPPER('%${search.replace(/'/g, "''")}%') OR
      UPPER(t.truckno) LIKE UPPER('%${search.replace(/'/g, "''")}%')
    )`;
    }

    // Count query
    const countQuery = `
    SELECT COUNT(DISTINCT t.vrno) AS total_count
    FROM view_gatetran_engine t
    ${whereClause}
  `;

    // Data query
    const dataQuery = `
    SELECT * FROM (
      SELECT a.*, ROWNUM rnum FROM (
        SELECT DISTINCT
          t.outdate,
          t.order_vrno,
          t.vrno,
          t.Wslip_No,
          t.ref1_vrno,
          lhs_utility.get_name('acc_code', t.acc_code) AS partyname,
          t.truckno
        FROM view_gatetran_engine t
        ${whereClause}
        ORDER BY t.outdate ASC
      ) a
      WHERE ROWNUM <= :endRow
    )
    WHERE rnum > :startRow
  `;

    const params = { startRow: offset, endRow: offset + limit };
    let connection;

    try {
      connection = await getConnection();
      const [countResult, dataResult] = await Promise.all([
        connection.execute(countQuery, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
        connection.execute(dataQuery, params, { outFormat: oracledb.OUT_FORMAT_OBJECT })
      ]);
      return {
        data: dataResult.rows,
        totalCount: countResult.rows[0]?.TOTAL_COUNT || 0
      };
    } catch (error) {
      console.error("Error fetching gate out history data:", error);
      throw error;
    } finally {
      if (connection) await connection.close();
    }
  });
}


async function getAllGateOutCustomers() {
  const cacheKey = generateCacheKey("gate-out:customers", {});

  return await withCache(cacheKey, DEFAULT_TTL.CUSTOMERS, async () => {
    const query = `
    SELECT DISTINCT lhs_utility.get_name('acc_code', acc_code) AS customer_name
    FROM view_gatetran_engine 
    WHERE entity_code = 'SR' 
      AND lhs_utility.get_name('acc_code', acc_code) IS NOT NULL
    ORDER BY customer_name
  `;

    let connection;
    try {
      connection = await getConnection();
      const result = await connection.execute(query, {}, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      return result.rows
        .map(row => row.CUSTOMER_NAME)
        .filter(name => !!name);
    } catch (error) {
      console.error("Error fetching Gate Out customers:", error);
      throw error;
    } finally {
      if (connection) await connection.close();
    }
  });
}

module.exports = {
  getPendingGateOutData,
  getGateOutHistoryData,
  getAllGateOutCustomers,
};
