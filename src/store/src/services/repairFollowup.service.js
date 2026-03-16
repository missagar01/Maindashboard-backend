import { getPgPool } from "../config/postgres.js";
import { getOrSetCache, deleteCache, cacheKeys, DEFAULT_TTL } from "./redisCache.js";

const pool = getPgPool();

async function invalidateRepairFollowupCaches(id = null) {
    const deletes = [deleteCache(cacheKeys.repairFollowups())];

    if (id !== null && id !== undefined) {
        deletes.push(deleteCache(cacheKeys.repairFollowupById(id)));
    } else {
        deletes.push(deleteCache(cacheKeys.repairFollowupByIdPattern()));
    }

    await Promise.all(deletes);
}

function differenceInDays(actual, planned) {
    const actualDate = new Date(actual);
    const plannedDate = new Date(planned);
    const diffTime = actualDate - plannedDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function todayISTDateOnly() {
    return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
    });
}


export async function createRepairFollowup(data) {
    const query = `
    INSERT INTO repair_followup (
      gate_pass_date,
      gate_pass_no,
      department,
      party_name,
      item_name,
      item_code,
      remarks,
      uom,
      qty_issued,
      lead_time,
      planned1,
      actual1,
      time_delay1,
      stage1_status,
      planned2,
      actual2,
      time_delay2,
      stage2_status,
      gate_pass_status
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19
    )
    RETURNING *;
  `;

    const time_delay1 =
        data.actual1 && data.planned1
            ? Math.max(0, differenceInDays(data.actual1, data.planned1))
            : null;

    const time_delay2 =
        data.actual2 && data.planned2
            ? Math.max(0, differenceInDays(data.actual2, data.planned2))
            : null;

    const values = [
        data.gate_pass_date,
        data.gate_pass_no,
        data.department,
        data.party_name,
        data.item_name,
        data.item_code,
        data.remarks,
        data.uom,
        data.qty_issued,
        data.lead_time,
        data.planned1,
        data.actual1,
        time_delay1,
        data.stage1_status,
        data.planned2,
        data.actual2,
        time_delay2,
        data.stage2_status,
        data.gate_pass_status,
    ];

    const { rows } = await pool.query(query, values);
    await invalidateRepairFollowupCaches(rows[0]?.id ?? null);
    return rows[0];
}

export async function getAllRepairFollowups() {
    return getOrSetCache(
        cacheKeys.repairFollowups(),
        async () => {
            const { rows } = await pool.query(
                `SELECT * FROM repair_followup ORDER BY created_at DESC`
            );
            return rows;
        },
        DEFAULT_TTL.REPAIR_FOLLOWUP
    );
}

export async function getRepairFollowupById(id) {
    return getOrSetCache(
        cacheKeys.repairFollowupById(id),
        async () => {
            const { rows } = await pool.query(
                `SELECT * FROM repair_followup WHERE id = $1`,
                [id]
            );
            return rows[0] || null;
        },
        DEFAULT_TTL.REPAIR_FOLLOWUP
    );
}

export async function updateRepairFollowup(id, data) {
    const time_delay1 =
        data.actual1 && data.planned1
            ? Math.max(0, differenceInDays(data.actual1, data.planned1))
            : null;

    const time_delay2 =
        data.actual2 && data.planned2
            ? Math.max(0, differenceInDays(data.actual2, data.planned2))
            : null;

    const query = `
    UPDATE repair_followup SET
      gate_pass_date = $1,
      gate_pass_no = $2,
      department = $3,
      party_name = $4,
      item_name = $5,
      item_code = $6,
      remarks = $7,
      uom = $8,
      qty_issued = $9,
      lead_time = $10,
      planned1 = $11,
      actual1 = $12,
      time_delay1 = $13,
      stage1_status = $14,
      planned2 = $15,
      actual2 = $16,
      time_delay2 = $17,
      stage2_status = $18,
      gate_pass_status = $19,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $20
    RETURNING *;
  `;

    const values = [
        data.gate_pass_date,
        data.gate_pass_no,
        data.department,
        data.party_name,
        data.item_name,
        data.item_code,
        data.remarks,
        data.uom,
        data.qty_issued,
        data.lead_time,
        data.planned1,
        data.actual1,
        time_delay1,
        data.stage1_status,
        data.planned2,
        data.actual2,
        time_delay2,
        data.stage2_status,
        data.gate_pass_status,
        id,
    ];

    const { rows } = await pool.query(query, values);
    await invalidateRepairFollowupCaches(id);
    return rows[0];
}

export async function deleteRepairFollowup(id) {
    await pool.query(`DELETE FROM repair_followup WHERE id = $1`, [id]);
    await invalidateRepairFollowupCaches(id);
    return true;
}

export async function updateStage2ById(id, data) {

    if (data.extended_date) {
        const query = `
        UPDATE repair_followup
        SET
            stage2_status = $1,
            extended_date = $2,
            gate_pass_status = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *;
    `;

        const { rows } = await pool.query(query, [
            data.stage2_status ?? null,
            data.extended_date,
            data.gate_pass_status,
            id,
        ]);

        await invalidateRepairFollowupCaches(id);
        return rows[0];
    }

    const isCompleted =
        typeof data.gate_pass_status === "string" &&
        data.gate_pass_status.toLowerCase() === "completed";

    let actual2 = null;
    let time_delay2 = null;

    if (isCompleted) {
        actual2 = todayISTDateOnly();

        if (data.planned2) {
            time_delay2 = Math.max(
                0,
                differenceInDays(actual2, data.planned2)
            );
        }
    }

    const query = `
        UPDATE repair_followup
        SET
            stage2_status = $1,
            gate_pass_status = $2,
            actual2 = COALESCE($3, actual2),
            time_delay2 = COALESCE($4, time_delay2),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *;
    `;

    const values = [
        data.stage2_status ?? null,
        data.gate_pass_status ?? null,
        actual2,
        time_delay2,
        id,
    ];

    const { rows } = await pool.query(query, values);
    await invalidateRepairFollowupCaches(id);
    return rows[0];
}



