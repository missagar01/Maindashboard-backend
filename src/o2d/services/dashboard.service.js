const { getConnection } = require("../config/db.js");
const oracledb = require("oracledb");
const { generateCacheKey, withCache, DEFAULT_TTL } = require("../utils/cacheHelper.js");




// Query uses optional filters via bind params (exact match on party/item, date range on indate)
const BASE_DASHBOARD_QUERY = `
WITH order_sales AS (
  SELECT vrno, entity_code, MAX(lhs_utility.get_name('emp_code', emp_code)) AS sales_person
  FROM view_order_engine
  WHERE entity_code = 'SR'
  GROUP BY vrno, entity_code
),
inv_map AS (
  SELECT wslipno, entity_code, MAX(vrno) AS invoice_no
  FROM itemtran_head
  WHERE entity_code = 'SR'
  GROUP BY wslipno, entity_code
),
gate_out AS (
  SELECT vrno, entity_code, MAX(outdate) AS gate_out_time
  FROM view_gatetran_engine
  WHERE entity_code = 'SR'
  GROUP BY vrno, entity_code
),
base AS (
    SELECT
        t.indate,
        t.outdate,
        t.order_vrno,
        t.gate_vrno,
        t.wslipno,
        os.sales_person,
        lhs_utility.get_name('state_code', acc.state_code) AS state,
        t.acc_remark AS party_name,
        CASE
            WHEN t.div_code = 'SM' THEN 'MS BILLET'
            WHEN t.div_code = 'RP' THEN 'MS STRIP'
            WHEN t.div_code = 'PM' THEN 'MS PIPE'
            ELSE NULL
        END AS item_name,
        inv.invoice_no,
        go.gate_out_time
    FROM view_weighbridge_engine t
    LEFT JOIN order_sales os ON os.vrno = t.order_vrno AND os.entity_code = 'SR'
    LEFT JOIN acc_mast acc ON acc.acc_code = t.acc_code
    LEFT JOIN inv_map inv ON inv.wslipno = t.wslipno AND inv.entity_code = 'SR'
    LEFT JOIN gate_out go ON go.vrno = t.gate_vrno AND go.entity_code = 'SR'
    WHERE t.vrdate >= DATE '2025-04-01'
      AND t.entity_code = 'SR'
      AND t.tcode = 'S'
      AND t.item_catg IN ('F0001','F0002','F0003')
)
SELECT *
FROM base
WHERE (:p_party     IS NULL OR party_name = :p_party)
  AND (:p_item      IS NULL OR item_name  = :p_item)
  AND (:p_sales     IS NULL OR sales_person = :p_sales)
  AND (:p_state     IS NULL OR UPPER(TRIM(state)) = UPPER(TRIM(:p_state)))
  AND (:p_from_date IS NULL OR indate >= TO_DATE(:p_from_date, 'YYYY-MM-DD'))
  AND (:p_to_date   IS NULL OR indate <  TO_DATE(:p_to_date,   'YYYY-MM-DD') + 1)
ORDER BY indate ASC
`;

function parseDateParam(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getDashboardData({
  fromDate,
  toDate,
  partyName,
  itemName,
  salesPerson,
  stateName,
} = {}) {
  const shouldUseMockData =
    process.env.FORCE_MOCK_DASHBOARD === "true" || process.env.NODE_ENV !== "production";

  // Generate cache key from parameters
  const cacheKey = generateCacheKey("dashboard", {
    fromDate: fromDate || "default",
    toDate: toDate || "default",
    partyName: partyName || "",
    itemName: itemName || "",
    salesPerson: salesPerson || "",
    stateName: stateName || "",
  });

  // Use cache wrapper
  return await withCache(cacheKey, DEFAULT_TTL.DASHBOARD, async () => {
    // Defaults: keep base window starting 01-APR-2025 to today if dates not provided
    const defaultFrom = new Date("2025-04-01T00:00:00"); // local midnight to avoid TZ offset trimming early rows
    const defaultTo = new Date(); // today

    const p_party = partyName || null;
    const p_item = itemName || null;
    const p_sales = salesPerson || null;
    const p_state = stateName || null;

    const parsedFrom = parseDateParam(fromDate) || defaultFrom;
    const parsedTo = parseDateParam(toDate) || defaultTo;

    // Send dates as 'YYYY-MM-DD' strings so Oracle can TRUNC/TO_DATE deterministically (no timezone drift)
    const safeFrom = parsedFrom.toISOString().slice(0, 10);
    const safeTo = parsedTo.toISOString().slice(0, 10);

    const binds = {
      p_party,
      p_item,
      p_sales,
      p_state,
      p_from_date: safeFrom,
      p_to_date: safeTo,
    };

    let connection;
    try {
      connection = await getConnection();
      if (!connection) {
        throw new Error("Failed to establish Oracle database connection");
      }

      const result = await connection.execute(BASE_DASHBOARD_QUERY, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });

      const rows = result.rows || [];


      const totalGateIn = rows.length; // total rows returned
      const totalGateOut = rows.filter((row) => row.GATE_OUT_TIME !== null).length;
      const pendingGateOut = totalGateIn - totalGateOut;


      const totalDispatch = rows.filter((row) => {
        const inv = row.INVOICE_NO;
        if (inv === null || inv === undefined) return false;
        if (typeof inv === "string" && inv.trim() === "") return false;
        return true;
      }).length;

      const uniqueParties = Array.from(
        new Set(rows.map((r) => r.PARTY_NAME).filter(Boolean))
      );
      const uniqueItems = Array.from(
        new Set(rows.map((r) => r.ITEM_NAME).filter(Boolean))
      );
      const uniqueSales = Array.from(
        new Set(rows.map((r) => r.SALES_PERSON).filter(Boolean))
      );
      const uniqueStates = Array.from(
        new Set(rows.map((r) => (r.STATE ? r.STATE.trim() : "")).filter(Boolean))
      );

      const dataRows = rows.map((r) => ({
        indate: r.INDATE,
        outdate: r.OUTDATE,
        gateOutTime: r.GATE_OUT_TIME,
        orderVrno: r.ORDER_VRNO,
        gateVrno: r.GATE_VRNO,
        wslipno: r.WSLIPNO,
        salesPerson: r.SALES_PERSON,
        state: r.STATE,
        partyName: r.PARTY_NAME,
        itemName: r.ITEM_NAME,
        invoiceNo: r.INVOICE_NO,
      }));

      return {
        summary: {
          totalGateIn,
          totalGateOut,
          pendingGateOut,
          totalDispatch,
        },
        filters: {
          parties: uniqueParties,
          items: uniqueItems,
          salesPersons: uniqueSales,
          states: uniqueStates,
        },
        rows: dataRows,
        lastUpdated: new Date().toISOString(),
        appliedFilters: {
          fromDate: safeFrom,
          toDate: safeTo,
          partyName: p_party,
          itemName: p_item,
          salesPerson: p_sales,
          state: p_state,
        },
      };
    } catch (error) {
      console.error("❌ Error in getDashboardData:", error.message);
      if (shouldUseMockData) {
        console.warn("⚠️ Serving mock dashboard data because Oracle is unavailable.");

      }
      // Re-throw with more context
      throw new Error(`Dashboard data fetch failed: ${error.message}`);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          console.error("⚠️ Error closing Oracle connection:", closeError.message);
        }
      }
    }
  });
}

module.exports = { getDashboardData };
