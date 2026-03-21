const pool = require('../config/db');

class GatePassModel {
  async findAll() {
    const query = `
      SELECT *
      FROM gatepass
      ORDER BY created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async findById(id) {
    const query = 'SELECT * FROM gatepass WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data) {
    const query = `
      INSERT INTO gatepass (
        name,
        mobile_number,
        employee_photo,
        employee_address,
        purpose_of_visit,
        reason,
        date_of_leave,
        time_of_entry,
        hod_approval,
        status,
        gate_pass_closed,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      data.name,
      data.mobile_number,
      data.employee_photo,
      data.employee_address,
      data.purpose_of_visit,
      data.reason,
      data.date_of_leave,
      data.time_of_entry,
      data.hod_approval,
      data.status,
      data.gate_pass_closed
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async update(id, data) {
    const query = `
      UPDATE gatepass
      SET
        name = COALESCE($1, name),
        mobile_number = COALESCE($2, mobile_number),
        employee_photo = COALESCE($3, employee_photo),
        employee_address = COALESCE($4, employee_address),
        purpose_of_visit = COALESCE($5, purpose_of_visit),
        reason = COALESCE($6, reason),
        date_of_leave = COALESCE($7, date_of_leave),
        time_of_entry = COALESCE($8, time_of_entry),
        hod_approval = COALESCE($9, hod_approval),
        status = COALESCE($10, status),
        gate_pass_closed = COALESCE($11, gate_pass_closed),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;

    const values = [
      data.name,
      data.mobile_number,
      data.employee_photo,
      data.employee_address,
      data.purpose_of_visit,
      data.reason,
      data.date_of_leave,
      data.time_of_entry,
      data.hod_approval,
      data.status,
      data.gate_pass_closed,
      id
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = 'DELETE FROM gatepass WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = new GatePassModel();
