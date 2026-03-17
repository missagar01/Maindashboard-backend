// Script to create indent table in PostgreSQL (AWS RDS)
// Run this: node src/scripts/create-indent-table.js

import { getPgPool } from "../config/postgres.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CREATE_TABLE_SQL = `
-- Create indent table for PostgreSQL (AWS RDS)
CREATE TABLE IF NOT EXISTS indent (
  id SERIAL PRIMARY KEY,
  sample_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  form_type VARCHAR(20) NOT NULL CHECK (form_type IN ('INDENT', 'REQUISITION')),
  request_number VARCHAR(50) NOT NULL,
  indent_series VARCHAR(10),
  requester_name VARCHAR(255),
  department VARCHAR(255),
  division VARCHAR(50),
  item_code VARCHAR(100),
  product_name VARCHAR(255),
  request_qty NUMERIC(10, 2) DEFAULT 0,
  uom VARCHAR(50),
  specification TEXT,
  make VARCHAR(255),
  purpose TEXT,
  cost_location VARCHAR(255),
  group_name VARCHAR(255),
  planned_1 TIMESTAMPTZ,
  actual_1 TIMESTAMPTZ,
  time_delay_1 INTERVAL,
  request_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  approved_quantity NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_indent_request_number ON indent(request_number);
CREATE INDEX IF NOT EXISTS idx_indent_form_type ON indent(form_type);
CREATE INDEX IF NOT EXISTS idx_indent_request_status ON indent(request_status);
CREATE INDEX IF NOT EXISTS idx_indent_created_at ON indent(created_at);
CREATE INDEX IF NOT EXISTS idx_indent_requester_name ON indent(requester_name);
CREATE INDEX IF NOT EXISTS idx_indent_item_code ON indent(item_code);
`;

async function createIndentTable() {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    console.log('🔄 Creating indent table in PostgreSQL (AWS RDS)...');

    // Check if table exists first
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'indent'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ indent table already exists!');
      return;
    }

    // Create table
    await client.query('BEGIN');
    await client.query(CREATE_TABLE_SQL);
    await client.query('COMMIT');

    console.log('✅ indent table created successfully!');
    console.log('✅ All indexes created!');

    // Verify
    const verify = await client.query('SELECT COUNT(*) FROM indent');
    console.log(`✅ Table verified. Current row count: ${verify.rows[0].count}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating table:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1] && process.argv[1].endsWith('create-indent-table.js');

if (isMainModule) {
  createIndentTable()
    .then(() => {
      console.log('✅ Script completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Script failed:', err);
      process.exit(1);
    });
}

export { createIndentTable };

