// Use auth database pool for users table (users table is in auth database)
const { getLoginPool } = require("../../../config/pg.js");

// Create a pool wrapper for users service with better error handling
const pool = {
  query: async function (text, params) {
    try {
      const p = getLoginPool();
      if (!p) {
        throw new Error("Database pool is not available");
      }
      return await p.query(text, params);
    } catch (error) {
      console.error("Database query error:", error.message);
      console.error("Query:", text);
      console.error("Params:", params);
      throw error;
    }
  }
};

const PUBLIC_COLUMNS = [
  "id",
  "user_name",
  "password",
  "email_id",
  "number",
  "department",
  "role",
  "status",
  "user_access",
  "remark",
  "employee_id",
  "page_access",
  "system_access",
  "created_at"
];

async function fetchUsers() {
  const result = await pool.query(`
    SELECT ${PUBLIC_COLUMNS.join(", ")}
    FROM public.users
    ORDER BY created_at DESC;
  `);
  return result.rows;
}

async function fetchUserById(id) {
  const result = await pool.query(
    `
      SELECT ${PUBLIC_COLUMNS.join(", ")}
      FROM public.users
      WHERE id = $1
      LIMIT 1;
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function fetchUserByUsername(userName) {
  if (!userName) {
    return null;
  }
  const result = await pool.query(
    `
      SELECT ${PUBLIC_COLUMNS.join(", ")}
      FROM public.users
      WHERE TRIM(user_name) = TRIM($1)
      LIMIT 1;
    `,
    [userName]
  );
  return result.rows[0] || null;
}

async function createUser(userData) {
  const {
    user_name,
    password,
    email_id,
    number,
    department,
    role,
    status,
    user_access,
    remark,
    employee_id,
    page_access,
    system_access,
  } = userData;

  const columns = [
    "user_name",
    "password",
    "email_id",
    "number",
    "department",
    "role",
    "status",
    "user_access",
    "remark",
    "employee_id",
    "page_access",
    "system_access",
  ];

  // Convert number to integer if it's a string, or null if empty
  let numberValue = null;
  if (number) {
    if (typeof number === 'string') {
      const num = parseInt(number.trim());
      numberValue = isNaN(num) ? null : num;
    } else if (typeof number === 'number') {
      numberValue = number;
    }
  }

  const values = [
    user_name.trim(),
    password,
    email_id || null,
    numberValue,
    department && typeof department === 'string' ? department.trim() : null, // Department is required, but handle edge cases
    role || "user",
    status || "active",
    user_access || null,
    remark || null,
    employee_id || null,
    page_access || null,
    system_access || null,
  ];

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

  try {
    const result = await pool.query(
      `
        INSERT INTO public.users (${columns.join(", ")})
        VALUES (${placeholders})
        RETURNING ${PUBLIC_COLUMNS.join(", ")};
      `,
      values
    );

    return result.rows[0];
  } catch (error) {
    console.error("Create user database error:", error.message);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    console.error("Columns:", columns);
    console.error("Values:", values);
    throw error;
  }
}

async function updateUser(id, updates) {
  const allowedFields = [
    "user_name",
    "password",
    "email_id",
    "number",
    "department",
    "role",
    "status",
    "user_access",
    "remark",
    "employee_id",
    "page_access",
    "system_access",
  ];

  const setClauses = [];
  const values = [];

  for (const field of allowedFields) {
    if (!(field in updates)) {
      continue;
    }
    let value = updates[field];
    if (field === "user_name" && typeof value === "string") {
      value = value.trim();
      if (!value) {
        continue;
      }
    }
    if (field === "password") {
      if (!value) {
        continue;
      }
      // Password stored as plain text (no hashing)
    }
    setClauses.push(`${field} = $${values.length + 1}`);
    values.push(value === undefined ? null : value);
  }

  if (setClauses.length === 0) {
    return null;
  }

  values.push(id);
  const query = `
    UPDATE public.users
    SET ${setClauses.join(", ")}
    WHERE id = $${values.length}
    RETURNING ${PUBLIC_COLUMNS.join(", ")};
  `;

  try {
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Update user database error:", error.message);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    throw error;
  }
}

async function deleteUser(id) {
  const result = await pool.query(
    `
      DELETE FROM public.users
      WHERE id = $1;
    `,
    [id]
  );
  return result.rowCount > 0;
}

async function fetchDepartments() {
  const result = await pool.query(`
    SELECT DISTINCT department
    FROM public.users
    WHERE department IS NOT NULL
      AND TRIM(department) != ''
    ORDER BY department ASC;
  `);
  return result.rows.map(row => row.department);
}

module.exports = {
  fetchUsers,
  fetchUserById,
  fetchUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  fetchDepartments,
};
