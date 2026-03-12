const pool = require("../config/db.js");

function generateLeadNoFromId(id) {
  return `LD-${String(id).padStart(3, "0")}`; // LD-001, LD-002 etc.
}

async function getNextLeadSequence(client) {
  const result = await client.query(
    `
      SELECT COALESCE(
        MAX(
          NULLIF(
            REGEXP_REPLACE(lead_no, '[^0-9]', '', 'g'),
            ''
          )::INTEGER
        ),
        0
      ) AS max_lead_number
      FROM fms_leads
      WHERE lead_no IS NOT NULL
    `
  );

  return Number(result.rows[0]?.max_lead_number || 0) + 1;
}

const createLead = async (leadData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(947231)");

    // Insert the row first, then derive a stable lead number for this transaction.
    const insertQuery = `
      INSERT INTO fms_leads (
        lead_receiver_name,
        lead_source,
        company_name,
        phone_number,
        salesperson_name,
        location,
        email_address,
        state,
        address,
        nob,
        additional_notes,
        sc_name
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id, created_at, ctid;
    `;

    const values = [
      leadData.receiverName,
      leadData.source,
      leadData.companyName,
      leadData.phoneNumber,
      leadData.salespersonName,
      leadData.location,
      leadData.email,
      leadData.state,
      leadData.address,
      leadData.nob,
      leadData.notes,
      leadData.scName,
    ];

    const result = await client.query(insertQuery, values);
    const insertedRow = result.rows[0] || {};
    const newId = insertedRow.id;
    const createdAt = insertedRow.created_at;
    const rowCtid = insertedRow.ctid;
    const numericLeadId =
      Number.isFinite(Number(newId)) && Number(newId) > 0
        ? Number(newId)
        : await getNextLeadSequence(client);
    const leadNo = generateLeadNoFromId(numericLeadId);

    await client.query(
      `UPDATE fms_leads SET lead_no = $1, updated_at = NOW() WHERE ctid = $2`,
      [leadNo, rowCtid]
    );

    await client.query("COMMIT");

    return {
      id: newId || numericLeadId,
      leadNo,
      createdAt,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  createLead
};
