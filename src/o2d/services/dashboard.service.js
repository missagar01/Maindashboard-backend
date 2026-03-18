const { getConnection } = require("../config/db.js");
const oracledb = require("oracledb");
const { getCached, setCached, DEFAULT_TTL } = require("../utils/cacheHelper.js");

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
  TO_CHAR(
    ROUND((COUNT(DISTINCT acc_code) / 900) * 100, 2),
    'FM990.00'
  ) || '%' AS monthly_party_average

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

  TO_CHAR(
    ROUND((COUNT(DISTINCT acc_code) / 900) * 100, 2),
    'FM990.00'
  ) || '%' AS conversion_ratio

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

const STATE_DISTRIBUTION_QUERY = `
select lhs_utility.get_name('state_code', t.state_code) as state_name,
       sum(t.qtyissued) as total
from view_itemtran_engine t
where t.entity_code = 'SR'
  and t.tcode = 'S'
  and t.series = 'SA'
  and t.div_code = 'PM'
  and t.vrdate >= TRUNC(SYSDATE, 'MM')
  and t.vrdate <  ADD_MONTHS(TRUNC(SYSDATE, 'MM'), 1)
group by t.state_code
order by lhs_utility.get_name('state_code', t.state_code) asc
`;

function parseDateParam(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildEmptyResponse(p_party, p_item, p_sales, p_state, safeFrom, safeTo) {
  return {
    summary: {
      monthlyStats: [],
      pendingStats: [],
      gdStats: [],
      saudaAvg: [],
      allSaudaAvg: [],
      salesAvg: [],
      saudaRate2026: 0,
      stateDistribution: [],
    },
    filters: {
      parties: [],
      items: [],
      salesPersons: [],
      states: [],
    },
    rows: [],
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
}

// -----------------------------------------------------------------------------
// BACKGROUND DATA FETCH SYSTEM
// Executes heavy Oracle queries using Promise.allSettled for fault tolerance,
// formats exactly to API structure, and stores directly in Redis.
// -----------------------------------------------------------------------------
async function refreshOracleDashboardData(params, cacheKey, binds, summaryDateBinds, safeFrom, safeTo) {
  let connection;
  try {
    connection = await getConnection();
    if (!connection) {
      throw new Error("Failed to establish Oracle database connection");
    }

    const { p_party, p_item, p_sales, p_state } = binds;

    const queries = [
      connection.execute(BASE_DASHBOARD_QUERY, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(MONTHLY_STATS_QUERY, summaryDateBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(PENDING_ORDERS_STATS_QUERY, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(SAUDA_AVERAGE_QUERY, summaryDateBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(SALES_AVG_QUERY, summaryDateBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(SAUDA_RATE_TREND_QUERY, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(GD_QUERY, summaryDateBinds, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(FILTERS_QUERY, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(ALL_SAUDA_AVERAGE_QUERY, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
      connection.execute(STATE_DISTRIBUTION_QUERY, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT })
    ];

    const results = await Promise.allSettled(queries);

    // Error tolerance: Use data if fulfilled, otherwise fallback to empty array
    const [
      result, monthlyRes, pendingRes, saudaAvgRes, salesAvgRes,
      saudaRateRes, gdRes, filtersRes, allSaudaAvgRes, stateDistributionRes
    ] = results.map(res => res.status === 'fulfilled' ? res.value : { rows: [] });

    const rows = result.rows || [];
    const filterRows = filtersRes.rows || [];
    
    // Extract aggregate stats
    const monthlyStats = monthlyRes.rows || [];
    const pendingStats = pendingRes.rows || [];
    const gdStats = gdRes.rows || [];
    const saudaRateRow = (saudaRateRes.rows && saudaRateRes.rows[0]) ? saudaRateRes.rows[0] : {};
    const stateDistribution = stateDistributionRes.rows || [];

    const saudaAvg = saudaAvgRes.rows || [];
    const salesAvg = salesAvgRes.rows || [];
    const allSaudaAvg = allSaudaAvgRes.rows || [];
    const saudaRate2026 = saudaRateRow.AVERAGE || 0;

    const uniqueParties = Array.from(new Set(filterRows.map((r) => r.PARTY_NAME).filter(Boolean)));
    const uniqueItems = Array.from(new Set(filterRows.map((r) => r.ITEM_NAME).filter(Boolean)));
    const uniqueSales = Array.from(new Set(filterRows.map((r) => r.SALES_PERSON).filter(Boolean)));
    const uniqueStates = Array.from(new Set(filterRows.map((r) => (r.STATE ? r.STATE.trim() : "")).filter(Boolean)));

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

    // Construct exactly matching output format WITHOUT restructuring response
    const payload = {
      summary: {
        monthlyStats,
        pendingStats,
        gdStats,
        saudaAvg,
        allSaudaAvg,
        salesAvg,
        saudaRate2026,
        stateDistribution,
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

    // Store final processed JSON in Redis. 300 seconds TTL.
    await setCached(cacheKey, payload, DEFAULT_TTL.DASHBOARD || 300);

    return payload;

  } catch (error) {
    console.error("❌ Error in refreshOracleDashboardData:", error.message);
    const fallback = buildEmptyResponse(binds.p_party, binds.p_item, binds.p_sales, binds.p_state, safeFrom, safeTo);
    await setCached(cacheKey, fallback, 30); // short TTL on DB failure block
    return fallback;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("⚠️ Error closing Oracle connection:", closeError.message);
      }
    }
  }
}


// Track first-time fetches globally to apply the blocking optimization constraint
const firstRequestTracking = new Set();


// -----------------------------------------------------------------------------
// CACHE-FIRST DASHBOARD API
// Instantly returns data if stored, fires background queries, enforces constraints
// -----------------------------------------------------------------------------
async function getDashboardData({
  fromDate,
  toDate,
  partyName,
  itemName,
  salesPerson,
  stateName,
} = {}) {

  // Setup boundaries defaults
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = today;

  const p_party = partyName || null;
  const p_item = itemName || null;
  const p_sales = salesPerson || null;
  const p_state = stateName || null;

  const parsedFrom = parseDateParam(fromDate) || defaultFrom;
  const parsedTo = parseDateParam(toDate) || defaultTo;

  const safeFrom = parsedFrom.toISOString().slice(0, 10);
  const safeTo = parsedTo.toISOString().slice(0, 10);

  // Use explicit parameter-based Cache Key as requested
  const cacheKeyStr = `dashboard_oracle_${safeFrom}_${safeTo}_${p_party || 'all'}_${p_item || 'all'}_${p_sales || 'all'}_${p_state || 'all'}`;

  // STEP 1: Check Redis cache
  const cachedData = await getCached(cacheKeyStr);

  // IF FOUND: return data immediately
  if (cachedData) {
    return cachedData;
  }

  // IF NOT FOUND -> Prepare constraints
  const binds = { p_party, p_item, p_sales, p_state };
  const summaryDateBinds = { p_from_date: safeFrom, p_to_date: safeTo };

  // FIRST LOAD OPTIMIZATION: If cache is missing AND it's the first time
  if (!firstRequestTracking.has(cacheKeyStr)) {
    firstRequestTracking.add(cacheKeyStr);
    
    // ONE blocking fetch (await background data builder directly)
    return await refreshOracleDashboardData(params = {}, cacheKeyStr, binds, summaryDateBinds, safeFrom, safeTo);
  }

  // AFTER FIRST LOAD: If not found but NOT first load 
  // Trigger background job asynchronously (NON-BLOCKING)
  refreshOracleDashboardData(params = {}, cacheKeyStr, binds, summaryDateBinds, safeFrom, safeTo).catch(console.error);

  // Return fallback empty response IMMEDIATELY
  return buildEmptyResponse(p_party, p_item, p_sales, p_state, safeFrom, safeTo);
}

module.exports = { getDashboardData };