const express = require("express");
const oracledb = require("oracledb");
const dotenv = require("dotenv");
const cors = require("cors");
const { initOracleClient } = require("./config/oracleClient.js");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

let pool;

// Validate required environment variables
function validateEnv() {
  const required = [
    'ORACLE_USER',
    'ORACLE_PASSWORD',
    'ORACLE_CONNECTION_STRING'
  ];

  const missing = required.filter(key => !process.env[key] || process.env[key].trim() === '');

  if (missing.length > 0) {
    const errorMsg = `❌ Missing or empty required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file and ensure these variables are set:\n` +
      missing.map(key => `  - ${key}`).join('\n');
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log('✅ All required Oracle environment variables are set');
  console.log('🔧 Oracle Config:', {
    user: process.env.ORACLE_USER,
    connectString: process.env.ORACLE_CONNECTION_STRING ?
      (process.env.ORACLE_CONNECTION_STRING.length > 50 ?
        process.env.ORACLE_CONNECTION_STRING.substring(0, 50) + '...' :
        process.env.ORACLE_CONNECTION_STRING) :
      'NOT SET'
  });
}

// Initialize Oracle connection pool
async function initPool() {
  try {
    // Validate environment variables first
    validateEnv();

    // Initialize Oracle client (will use thin mode if no client found)
    initOracleClient();

    console.log("📡 Creating Oracle connection pool...");

    const dbConfig = {
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECTION_STRING,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      connectTimeout: 10,   // fail if DB not reachable in 10s
      queueTimeout: 10000,  // fail if waiting >10s
      stmtCacheSize: 0
    };

    pool = await oracledb.createPool(dbConfig);
    console.log("✅ Oracle connection pool started");
  } catch (err) {
    console.error("❌ Pool init failed:", err.message);
    if (err.code === 'NJS-125') {
      console.error("\n💡 TROUBLESHOOTING:");
      console.error("   The Oracle connectString is empty or undefined.");
      console.error("   Please check your .env file and ensure ORACLE_CONNECTION_STRING is set.");
      console.error("   Format example: hostname:port/service_name or hostname:port:SID");
    }
    process.exit(1);
  }
}

// =======================
// Fetch all students
app.get("/users", async (req, res) => {
  console.log("Fetching all students...");
  let conn;
  try {
    conn = await pool.getConnection();

    // ✅ 1. Check schema exists
    const schemaCheck = await conn.execute(
      `SELECT username FROM all_users WHERE username = :schemaName`,
      { schemaName: 'SRMPLERP' },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (schemaCheck.rows.length === 0) {
      return res.status(404).json({ error: "Schema SRMPLERP does not exist" });
    }

    console.log("Schema SRMPLERP exists ✅");

    // ✅ 2. Check table exists
    const tableCheck = await conn.execute(
      `SELECT table_name 
         FROM all_tables 
        WHERE owner = :schemaName 
          AND table_name = :tableName`,
      { schemaName: 'SRMPLERP', tableName: 'ACCBAL_AUDIT' },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (tableCheck.rows.length === 0) {
      return res.status(404).json({ error: "Table ACCBAL_AUDIT does not exist in schema SRMPLERP" });
    }

    console.log("Table ACCBAL_AUDIT exists ✅");

    // ✅ 3. Fetch data
    const result = await conn.execute(
      `SELECT * FROM SRMPLERP.ACCBAL_AUDIT`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log("Rows fetched:", result.rows.length);
    res.json(result.rows);

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});


// Route to list all schemas and tables
app.get("/schema", async (req, res) => {
  console.log("Fetching all schemas and tables...");
  let conn;
  try {
    conn = await pool.getConnection();

    // 1️⃣ Get all schemas
    const schemasResult = await conn.execute(
      `SELECT username AS schema_name FROM all_users ORDER BY username`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const schemas = schemasResult.rows.map(r => r.SCHEMA_NAME);
    console.log("Schemas found:", schemas.length);

    // 2️⃣ Optional: Get tables for each schema (you can limit to a few for performance)
    const schemaTables = {};

    for (let schema of schemas) {
      const tablesResult = await conn.execute(
        `SELECT table_name FROM all_tables WHERE owner = :schema ORDER BY table_name`,
        { schema },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      schemaTables[schema] = tablesResult.rows.map(r => r.TABLE_NAME);
    }

    res.json({
      totalSchemas: schemas.length,
      schemas: schemaTables
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.get("/current-schema", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.execute(
      `SELECT sys_context('USERENV','CURRENT_SCHEMA') AS schema_name FROM dual`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});



app.post("/store-indent", async (req, res) => {
  let conn;
  try {
    const {
      timestamp,
      indenterName,
      department,
      groupHead,
      itemCode,
      productName,
      quantity,
      uom,
      specifications,
      indentApprovedBy,
      indentType,
      attachment,
    } = req.body;

    conn = await pool.getConnection();

    // 1️⃣ Fetch the last indent number
    const result = await conn.execute(
      `SELECT MAX(TO_NUMBER(REGEXP_SUBSTR(INDENT_NUMBER, '[0-9]+'))) AS LAST_NUM FROM STORE_INDENT`
    );

    const lastNum = result.rows[0][0] || 0;
    const newNum = lastNum + 1;
    const indentNumber = `SI-${String(newNum).padStart(4, '0')}`;

    // 2️⃣ Insert with new indent number
    await conn.execute(
      `INSERT INTO STORE_INDENT 
       (TIMESTAMP, INDENT_NUMBER, INDENTER_NAME, DEPARTMENT, GROUP_HEAD, 
        ITEM_CODE, PRODUCT_NAME, QUANTITY, UOM, SPECIFICATIONS, 
        INDENT_APPROVED_BY, INDENT_TYPE, ATTACHMENT)
       VALUES (
         TO_TIMESTAMP(:timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
         :indentNumber,
         :indenterName,
         :department,
         :groupHead,
         :itemCode,
         :productName,
         :quantity,
         :uom,
         :specifications,
         :indentApprovedBy,
         :indentType,
         :attachment
       )`,
      {
        timestamp,
        indentNumber,
        indenterName,
        department,
        groupHead,
        itemCode,
        productName,
        quantity,
        uom,
        specifications,
        indentApprovedBy,
        indentType,
        attachment,
      },
      { autoCommit: true }
    );

    res.json({ success: true, message: "Indent saved successfully", indentNumber });
  } catch (err) {
    console.error("Error inserting indent:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});


app.put("/store-indent/approve", async (req, res) => {
  let conn;
  try {
    const { indentNumber, itemCode, vendorType, approvedQuantity } = req.body;

    conn = await pool.getConnection();
    const result = await conn.execute(
      `UPDATE STORE_INDENT
          SET VENDOR_TYPE = :vendorType,
              APPROVED_QUANTITY = :approvedQuantity,
              ACTUAL_1 = SYSDATE
        WHERE INDENT_NUMBER = :indentNumber
          AND ITEM_CODE = :itemCode`,
      { indentNumber, itemCode, vendorType, approvedQuantity },
      { autoCommit: true }
    );

    res.json({ success: true, message: "Indent approved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});


app.get("/store-indent/pending", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.execute(
      `SELECT * FROM STORE_INDENT 
        WHERE PLANNED_1 IS NOT NULL 
          AND ACTUAL_1 IS NULL`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});


app.get("/store-indent/history", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.execute(
      `SELECT * FROM STORE_INDENT 
        WHERE PLANNED_1 IS NOT NULL 
          AND ACTUAL_1 IS NOT NULL`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});



app.get("/tables", async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.execute(
      `SELECT table_name 
         FROM all_tables 
        WHERE owner = :owner
        ORDER BY table_name`,
      ["SRMPLERP"],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(result.rows);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

app.get("/o2d-gate-process", async (req, res) => {
  let conn;
  const entityCode = (req.query.entity || "SR").toUpperCase();
  const query = `
select to_char(t.vrdate,'dd/mm/yyyy hh:mi:ss') as gate_entry_timestamp,
       t.vrno as gate_entry_number,
       t.order_vrno as loading_order_number,
       lhs_utility.get_name('acc_code',t.acc_code) as party_name,
       t.truckno,
       t.Wslip_No,
       to_char(t.vrdate + INTERVAL '10' MINUTE,'dd/mm/yyyy hh:mi:ss') as first_weight_planned,
       to_char((select a.indate from view_weighbridge_engine a where a.wslipno = t.Wslip_No and a.entity_code = :entityCode),'dd/mm/yyyy hh:mi:ss') as first_weight_actual,
       to_char((select a.indate from view_weighbridge_engine a where a.wslipno = t.Wslip_No and a.entity_code = :entityCode) + INTERVAL '4' HOUR,'dd/mm/yyyy hh:mi:ss') as planned_second_weight,
       to_char((select a.outdate from view_weighbridge_engine a where a.wslipno = t.Wslip_No and a.entity_code = :entityCode),'dd/mm/yyyy hh:mi:ss') as actual_second_weight,
       to_char((select a.outdate from view_weighbridge_engine a where a.wslipno = t.Wslip_No and a.entity_code = :entityCode) + INTERVAL '10' MINUTE,'dd/mm/yyyy hh:mi:ss') as planned_invoice_timestamp,
       to_char((select distinct B.vrdate from view_itemtran_engine b where b.wslipno = t.Wslip_No and b.entity_code = :entityCode),'dd/mm/yyyy hh:mi:ss') as actual_invoice_timestamp,
       (select distinct B.vrno from view_itemtran_engine b where b.wslipno = t.Wslip_No and b.entity_code = :entityCode) as invoice_number,
       to_char((select distinct B.vrdate from view_itemtran_engine b where b.wslipno = t.Wslip_No and b.entity_code = :entityCode) + INTERVAL '30' MINUTE,'dd/mm/yyyy hh:mi:ss') as gate_out_planned,
       to_char(t.outdate,'dd/mm/yyyy hh:mi:ss') as gate_out_actual
from view_gatetran_engine t
where t.entity_code = :entityCode
      and t.series='SE'
      and t.outdate is null
order by to_char(t.vrdate,'dd/mm/yyyy hh:mi:ss') asc`;

  try {
    conn = await pool.getConnection();
    const result = await conn.execute(query, { entityCode }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json({ entity: entityCode, rowCount: result.rows.length, rows: result.rows });
  } catch (err) {
    console.error("O2D gate process query failed:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});


// Start server
const port = 3004;
app.listen(port, async () => {
  await initPool();
  console.log(`🚀 Server running at http://localhost:${port}`);
});
