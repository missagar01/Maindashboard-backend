import pool from "../config/db.js";

export const getUserByIdService = async (userId) => {
    const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE id = $1
        `,
        [userId]
    );

    if (result.rowCount === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
    }

    return result.rows[0];
};

export const getEmpImageService = async (userId) => {
    const result = await pool.query(
        `
        SELECT id, emp_image, profile_img
        FROM users
        WHERE id = $1
        `,
        [userId]
    );

    if (result.rowCount === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
    }

    return result.rows[0];
};

export const updateEmpImageService = async (userId, profileImageUrl) => {
    if (!profileImageUrl) {
        const err = new Error("Profile image is required");
        err.statusCode = 400;
        throw err;
    }

    const result = await pool.query(
        `
        UPDATE users
        SET profile_img = $1
        WHERE id = $2
        RETURNING id, emp_image, profile_img
        `,
        [profileImageUrl, userId]
    );

    if (result.rowCount === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
    }

    return result.rows[0];
};
