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
ORDER BY indate DESC
`;

const FILTERS_QUERY = `
WITH order_sales AS (
  SELECT vrno, entity_code, MAX(lhs_utility.get_name('emp_code', emp_code)) AS sales_person
  FROM view_order_engine
  WHERE entity_code = 'SR'
  GROUP BY vrno, entity_code
),
base_filters AS (
    SELECT
        os.sales_person,
        lhs_utility.get_name('state_code', acc.state_code) AS state,
        t.acc_remark AS party_name,
        CASE
            WHEN t.div_code = 'SM' THEN 'MS BILLET'
            WHEN t.div_code = 'RP' THEN 'MS STRIP'
            WHEN t.div_code = 'PM' THEN 'MS PIPE'
            ELSE NULL
        END AS item_name
    FROM view_weighbridge_engine t
    LEFT JOIN order_sales os ON os.vrno = t.order_vrno AND os.entity_code = 'SR'
    LEFT JOIN acc_mast acc ON acc.acc_code = t.acc_code
    WHERE t.vrdate >= DATE '2025-04-01'
      AND t.entity_code = 'SR'
      AND t.tcode = 'S'
      AND t.item_catg IN ('F0001','F0002','F0003')
)
SELECT DISTINCT party_name, item_name, sales_person, state FROM base_filters
`;

const SAUDA_AVERAGE_QUERY = `
select case when t.div_code = 'PM' then 'PIPE'
       when t.div_code = 'RP' then 'STRIPS'
       when t.div_code = 'SM' then 'BILLET'
       end as item,
       round((sum((t.rate*((t.qtyorder - nvl(t.SALE_INVOICE_QTY,0)) + nvl(t.SRET_QTY,0))))/sum(((t.qtyorder - nvl(t.SALE_INVOICE_QTY,0)) + nvl(t.SRET_QTY,0)))),0) as average
from view_order_engine t
where t.entity_code='SR'
      and t.tcode='E'
      and t.approveddate is not null
      and t.closeddate is null
      and ((t.qtyorder - nvl(t.SALE_INVOICE_QTY,0)) + nvl(t.SRET_QTY,0)) > 0
      and t.vrdate >= TO_DATE(:p_from_date, 'YYYY-MM-DD')
      and t.vrdate <  TO_DATE(:p_to_date,   'YYYY-MM-DD') + 1
group by t.div_code
`;

const ALL_SAUDA_AVERAGE_QUERY = `
SELECT
  CASE
    WHEN sales_person IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
      THEN 'ANIL MISHRA'
    ELSE sales_person
  END AS sales_person,
  CASE 
    WHEN div_code = 'PM' THEN 'PIPE'
    WHEN div_code = 'RP' THEN 'STRIPS'
    WHEN div_code = 'SM' THEN 'BILLET'
    ELSE 'OTHER'
  END AS item,
  ROUND(
    SUM(rate * qty_balance) /
    NULLIF(SUM(qty_balance), 0),
  0) AS average
FROM (
  SELECT
    lhs_utility.get_name('emp_code', t.emp_code) AS sales_person,
    t.div_code,
    t.rate,
    ((t.qtyorder - NVL(t.sale_invoice_qty,0)) + NVL(t.sret_qty,0)) AS qty_balance
  FROM view_order_engine t
  WHERE t.entity_code = 'SR'
    AND t.tcode = 'E'
    AND t.approveddate IS NOT NULL
    AND t.closeddate IS NULL
    AND ((t.qtyorder - NVL(t.sale_invoice_qty,0)) + NVL(t.sret_qty,0)) > 0
    AND t.vrdate >= DATE '2025-04-01'
)
GROUP BY
  CASE
    WHEN sales_person IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
      THEN 'ANIL MISHRA'
    ELSE sales_person
  END,
  div_code
`;

const SALES_AVG_QUERY = `
SELECT
  sales_person,
  item,
  ROUND(
    SUM(tax_onamount) / NULLIF(SUM(qtyissued), 0),
    0
  ) AS average
FROM (
  SELECT
    CASE
      WHEN lhs_utility.get_name('emp_code', t.emp_code)
           IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
      THEN 'ANIL MISHRA'
      ELSE lhs_utility.get_name('emp_code', t.emp_code)
    END AS sales_person,
    CASE
      WHEN t.div_code = 'PM' THEN 'PIPE'
      WHEN t.div_code = 'RP' THEN 'STRIPS'
      WHEN t.div_code = 'SM' THEN 'BILLET'
    END AS item,
    t.tax_onamount,
    t.qtyissued
  FROM view_itemtran_engine t
  WHERE t.entity_code = 'SR'
    AND t.series = 'SA'
    AND t.vrdate >= TO_DATE(:p_from_date, 'YYYY-MM-DD')
    AND t.vrdate <  TO_DATE(:p_to_date,   'YYYY-MM-DD') + 1
)
GROUP BY
  sales_person,
  item
ORDER BY
  sales_person,
  item
`;

const SAUDA_RATE_TREND_QUERY = `
select round(avg(average),0) as average from 
(select t.vrdate, round(avg(t.rate),0) as average
from view_order_engine t
where t.entity_code='SR'
      and t.tcode='E'
      and t.vrdate >= DATE '2025-04-01'
      and t.div_code='PM'
group by t.vrdate
order by t.vrdate )
`;

const GD_QUERY = `
SELECT
  merged_sales_person AS sales_person,

  /* Monthly GD – selected month range */
  COALESCE(
    ROUND(
      SUM(monthly_summary) / NULLIF(SUM(monthly_qty), 0),
    0),
  0) AS monthly_gd,
  SUM(monthly_qty) AS monthly_qty,

  /* Daily GD – selected end date (usually today or last day of month) */
  COALESCE(
    ROUND(
      SUM(daily_summary) / NULLIF(SUM(daily_qty), 0),
    0),
  0) AS daily_gd,
  SUM(daily_qty) AS daily_qty

FROM (
  SELECT
    /* Merge sales persons */
    CASE
      WHEN lhs_utility.get_name('emp_code', t.emp_code)
           IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
        THEN 'ANIL MISHRA'
      ELSE lhs_utility.get_name('emp_code', t.emp_code)
    END AS merged_sales_person,

    /* Monthly calculation (full selected range) */
    (
      COALESCE(t.afrate3,0)
    + COALESCE(t.afrate4,0)
    + (COALESCE(t.fc_rate,0) - COALESCE(t.contract_rate,0))
    ) * COALESCE(t.qtyissued,0) AS monthly_summary,
    COALESCE(t.qtyissued,0) AS monthly_qty,

    /* Daily calculation (target day only - p_to_date) */
    CASE
      WHEN t.vrdate >= TO_DATE(:p_to_date, 'YYYY-MM-DD')
       AND t.vrdate <  TO_DATE(:p_to_date, 'YYYY-MM-DD') + 1
      THEN (
        COALESCE(t.afrate3,0)
      + COALESCE(t.afrate4,0)
      + (COALESCE(t.fc_rate,0) - COALESCE(t.contract_rate,0))
      ) * COALESCE(t.qtyissued,0)
    END AS daily_summary,

    CASE
      WHEN t.vrdate >= TO_DATE(:p_to_date, 'YYYY-MM-DD')
       AND t.vrdate <  TO_DATE(:p_to_date, 'YYYY-MM-DD') + 1
      THEN COALESCE(t.qtyissued,0)
    END AS daily_qty

  FROM view_itemtran_engine t
  WHERE t.entity_code = 'SR'
    AND t.series = 'SA'
    AND t.div_code = 'PM'
    /* Range filter */
    AND t.vrdate >= TO_DATE(:p_from_date, 'YYYY-MM-DD')
    AND t.vrdate <  TO_DATE(:p_to_date, 'YYYY-MM-DD') + 1
)
GROUP BY merged_sales_person
ORDER BY merged_sales_person
`;

const MONTHLY_STATS_QUERY = `
SELECT
  CASE
    WHEN sales_person IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
      THEN 'ANIL MISHRA'
    ELSE sales_person
  END AS sales_person,

  COUNT(DISTINCT acc_code) AS monthly_working_party,

  ROUND(
    (COUNT(DISTINCT acc_code) / 900) * 100,
  0) || '%' AS monthly_party_average

FROM (
  SELECT
    lhs_utility.get_name('emp_code', t.emp_code) AS sales_person,
    t.acc_code
  FROM view_itemtran_engine t
  WHERE t.entity_code = 'SR'
    AND t.series = 'SA'
    AND t.div_code = 'PM'
    AND t.acc_vrno <> 'CANCELLED'
    AND t.vrdate >= TO_DATE(:p_from_date, 'YYYY-MM-DD')
    AND t.vrdate <  TO_DATE(:p_to_date, 'YYYY-MM-DD') + 1
)

GROUP BY
  CASE
    WHEN sales_person IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
      THEN 'ANIL MISHRA'
    ELSE sales_person
  END

ORDER BY sales_person
`;


const PENDING_ORDERS_STATS_QUERY = `
SELECT
  CASE
    WHEN sales_person IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
      THEN 'ANIL MISHRA'
    ELSE sales_person
  END AS sales_person,

  COUNT(DISTINCT acc_code) AS total,

  ROUND(
    (COUNT(DISTINCT acc_code) / 900) * 100,
  0) || '%' AS conversion_ratio

FROM (
  SELECT
    lhs_utility.get_name('emp_code', t.emp_code) AS sales_person,
    t.acc_code
  FROM view_order_engine t
  WHERE t.entity_code = 'SR'
    AND t.tcode = 'E'
    AND t.div_code = 'PM'
    AND t.approveddate IS NOT NULL
    AND t.closeddate IS NULL
    AND ((t.qtyorder - NVL(t.sale_invoice_qty, 0))
         + NVL(t.sret_qty, 0)) > 0
)

GROUP BY
  CASE
    WHEN sales_person IN ('DIRECT', 'DC GOUTAM', 'P.S GEDAM')
      THEN 'ANIL MISHRA'
    ELSE sales_person
  END

ORDER BY sales_person
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
    // Defaults: Use CURRENT MONTH for summary metrics (from start of month to TODAY)
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1); // First day of current month
    const defaultTo = today; // Today (not last day of month)

    const p_party = partyName || null;
    const p_item = itemName || null;
    const p_sales = salesPerson || null;
    const p_state = stateName || null;

    const parsedFrom = parseDateParam(fromDate) || defaultFrom;
    const parsedTo = parseDateParam(toDate) || defaultTo;

    // Send dates as 'YYYY-MM-DD' strings so Oracle can TRUNC/TO_DATE deterministically (no timezone drift)
    const safeFrom = parsedFrom.toISOString().slice(0, 10);
    const safeTo = parsedTo.toISOString().slice(0, 10);

    // Base query binds - NO date filtering (shows all data from April 2025)
    const binds = {
      p_party,
      p_item,
      p_sales,
      p_state,
    };

    // Summary queries binds - WITH date filtering (current month or selected month)
    const summaryDateBinds = {
      p_from_date: safeFrom,
      p_to_date: safeTo,
    };

    let connection;
    try {
      connection = await getConnection();
      if (!connection) {
        throw new Error("Failed to establish Oracle database connection");
      }

      const [result, monthlyRes, pendingRes, saudaAvgRes, salesAvgRes, saudaRateRes, gdRes, filtersRes, allSaudaAvgRes] = await Promise.all([
        connection.execute(BASE_DASHBOARD_QUERY, binds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(MONTHLY_STATS_QUERY, summaryDateBinds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(PENDING_ORDERS_STATS_QUERY, {}, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(SAUDA_AVERAGE_QUERY, summaryDateBinds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(SALES_AVG_QUERY, summaryDateBinds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(SAUDA_RATE_TREND_QUERY, {}, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(GD_QUERY, summaryDateBinds, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(FILTERS_QUERY, {}, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        }),
        connection.execute(ALL_SAUDA_AVERAGE_QUERY, {}, {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
        })
      ]);

      const rows = result.rows || [];
      const filterRows = filtersRes.rows || [];

      // Extract aggregate stats
      const monthlyStats = monthlyRes.rows || [];
      const pendingStats = pendingRes.rows || [];
      const gdStats = gdRes.rows || [];
      const saudaRateRow = (saudaRateRes.rows && saudaRateRes.rows[0]) ? saudaRateRes.rows[0] : {};

      // Calculate totals for backward compatibility if needed, or just pass the array
      // const monthlyWorkingParty = mRow.MONTHLY_WORKING_PARTY || 0;
      // const monthlyPartyAverage = mRow.MONTHLY_PARTY_AVERAGE || '0%';
      // const pendingOrdersTotal = pRow.TOTAL || 0;
      // const conversionRatio = pRow.CONVERSION_RATIO || '0%';

      const saudaAvg = saudaAvgRes.rows || [];
      const salesAvg = salesAvgRes.rows || [];
      const allSaudaAvg = allSaudaAvgRes.rows || [];
      const saudaRate2026 = saudaRateRow.AVERAGE || 0;
      // const monthlyGd = gdRow.MONTHLY_GD || 0;
      // const dailyGd = gdRow.DAILY_GD || 0;


      // Gate/Dispatch stats calculation removed


      const uniqueParties = Array.from(
        new Set(filterRows.map((r) => r.PARTY_NAME).filter(Boolean))
      );
      const uniqueItems = Array.from(
        new Set(filterRows.map((r) => r.ITEM_NAME).filter(Boolean))
      );
      const uniqueSales = Array.from(
        new Set(filterRows.map((r) => r.SALES_PERSON).filter(Boolean))
      );
      const uniqueStates = Array.from(
        new Set(filterRows.map((r) => (r.STATE ? r.STATE.trim() : "")).filter(Boolean))
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
          monthlyStats,
          pendingStats,
          gdStats,
          saudaAvg,
          allSaudaAvg,
          salesAvg,
          saudaRate2026,
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