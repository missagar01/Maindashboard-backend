import pool from "../config/db.js";
import axios from "axios";

export const fetchGatePassesService = async (personToMeet, showAll = false) => {
    try {
        const query = `
            SELECT
                id,
                visitor_name,
                mobile_number,
                visitor_photo,
                visitor_address,
                purpose_of_visit,
                person_to_meet,
                date_of_visit,
                time_of_entry,
                visitor_out_time,
                approval_status,
                status,
                gate_pass_closed
            FROM visitors
            WHERE approval_status IN ('approved','rejected')
            ${showAll ? "" : "AND person_to_meet = $1"}
            ORDER BY created_at DESC
        `;

        const { rows } = showAll
            ? await pool.query(query)
            : await pool.query(query, [personToMeet]);
        return rows;
    } catch (err) {
        err.message = "Failed to fetch gate passes";
        throw err;
    }
};

export const closeGatePassService = async (id, personToMeet, showAll = false) => {
    try {
        const query = `
            UPDATE visitors
            SET
                status = 'OUT',
                gate_pass_closed = true,
                visitor_out_time = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::time
            WHERE id = $1
              ${showAll ? "" : "AND person_to_meet = $2"}
            RETURNING
                visitor_name,
                person_to_meet,
                date_of_visit,
                time_of_entry,
                visitor_out_time
        `;

        const result = showAll
            ? await pool.query(query, [id])
            : await pool.query(query, [id, personToMeet]);

        if (!result.rowCount) {
            const error = new Error("Visitor not found");
            error.statusCode = 404;
            throw error;
        }

        return result.rows[0];
    } catch (err) {
        if (!err.statusCode) {
            err.message = "Failed to close gate pass";
        }
        throw err;
    }
};

export const sendGateCloseWhatsappMessage = async (message) => {
    try {
        await axios.post(
            `${process.env.MAYTAPI_BASE_URL}/${process.env.MAYTAPI_PRODUCT_ID}/${process.env.MAYTAPI_PHONE_ID}/sendMessage`,
            {
                to_number: process.env.WHATSAPP_GROUP_ID,
                message,
                type: "text"
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-maytapi-key": process.env.MAYTAPI_API_KEY
                },
                timeout: 10000
            }
        );
    } catch (err) {
        // Non-blocking in production
        console.error("⚠️ WhatsApp send failed (gate close):", err.message);
    }
};
