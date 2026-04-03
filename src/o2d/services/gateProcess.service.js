const { getConnection } = require("../config/db.js");
const oracledb = require("oracledb");

const gateProcessQuery = `
SELECT DISTINCT
    t.vrno AS loading_order_number,
    lhs_utility.get_name('acc_code', t.acc_code) AS party_name,
    g.truckno,

    -- Gate Entry
    TO_CHAR(g.vrdate,'dd/mm/yyyy hh24:mi:ss') AS gate_entry_timestamp,
    g.vrno AS gate_entry_number,

    -- First Weight
    TO_CHAR(g.vrdate + INTERVAL '10' MINUTE,'dd/mm/yyyy hh24:mi:ss') AS first_weight_planned,
    TO_CHAR(wb.indate,'dd/mm/yyyy hh24:mi:ss') AS first_weight_actual,
    CASE 
        WHEN wb.indate IS NULL THEN 'PENDING' 
        ELSE 'COMPLETED' 
    END AS first_weight_status,

    -- Second Weight
    TO_CHAR(wb.indate + INTERVAL '4' HOUR,'dd/mm/yyyy hh24:mi:ss') AS planned_second_weight,
    TO_CHAR(wb.outdate,'dd/mm/yyyy hh24:mi:ss') AS actual_second_weight,
    CASE 
        WHEN wb.outdate IS NULL THEN 'PENDING' 
        ELSE 'COMPLETED' 
    END AS second_weight_status,

    -- Invoice
    TO_CHAR(wb.outdate + INTERVAL '10' MINUTE,'dd/mm/yyyy hh24:mi:ss') AS planned_invoice_timestamp,
    TO_CHAR(it.vrdate,'dd/mm/yyyy hh24:mi:ss') AS actual_invoice_timestamp,
    it.vrno AS invoice_number,
    CASE 
        WHEN it.vrdate IS NULL THEN 'PENDING' 
        ELSE 'COMPLETED' 
    END AS invoice_status,

    -- Gate Out
    TO_CHAR(it.vrdate + INTERVAL '30' MINUTE,'dd/mm/yyyy hh24:mi:ss') AS gate_out_planned,
    TO_CHAR(g.outdate,'dd/mm/yyyy hh24:mi:ss') AS gate_out_actual,
    CASE 
        WHEN g.outdate IS NULL THEN 'PENDING' 
        ELSE 'COMPLETED' 
    END AS gate_out_status

FROM view_order_engine t

LEFT JOIN view_gatetran_engine g
    ON g.order_vrno = t.vrno
   AND g.entity_code = t.entity_code

LEFT JOIN view_weighbridge_engine wb
    ON wb.wslipno = g.wslip_no
   AND wb.entity_code = g.entity_code

LEFT JOIN (
    SELECT wslipno, entity_code, vrdate, vrno
    FROM (
        SELECT 
            b.wslipno,
            b.entity_code,
            b.vrdate,
            b.vrno,
            ROW_NUMBER() OVER (
                PARTITION BY b.wslipno, b.entity_code 
                ORDER BY b.vrdate
            ) rn
        FROM view_itemtran_engine b
    )
    WHERE rn = 1
) it
    ON it.wslipno = g.wslip_no
   AND it.entity_code = g.entity_code

WHERE t.entity_code = :entityCode
  AND t.tcode = 'O'
  AND t.series = 'O4'
  AND t.div_code = 'PM'
  AND NVL(t.qtycancelled,0) = 0
  AND g.order_vrno IS NOT NULL
  AND g.outdate IS NULL

ORDER BY t.vrno ASC`;

async function getGateProcessTimeline(entityCode = "SR") {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      gateProcessQuery,
      { entityCode },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getGateProcessTimeline,
};
