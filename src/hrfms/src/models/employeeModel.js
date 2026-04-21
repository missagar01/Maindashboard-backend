const pool = require("../config/db");
const { normalizeEmployeeImagePath } = require("../utils/employeeUpload");

const resolvePageAccessInput = (data) =>
  data?.page_access ??
  data?.pageAccess ??
  data?.Page_Access ??
  data?.PageAccess ??
  null;

const serializePageAccess = (value) => {
  if (value == null || value === undefined) {
    return null;
  }

  // If already an array, join with commas
  if (Array.isArray(value)) {
    return value.join(',');
  }

  // If it's a string
  if (typeof value === "string") {
    // If it looks like a JSON array, parse and join
    const trimmed = value.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.join(',');
        }
      } catch {
        // ignore error, treat as string
      }
    }
    return value;
  }

  // Fallback for objects or other types
  return String(value);
};

const deserializePageAccess = (value) => {
  if (value == null || value === undefined || value === '') {
    return [];
  }

  if (typeof value !== "string") {
    // If it's already an array, return it
    if (Array.isArray(value)) {
      return value;
    }
    // If it's an object, return as array
    if (typeof value === "object") {
      return value;
    }
    // Otherwise wrap in array
    return [value];
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(value);
    // Ensure we return an array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    // If parsed value is an object, return as-is
    if (typeof parsed === "object") {
      return parsed;
    }
    // If it's a single value, wrap in array
    return [parsed];
  } catch {
    // If parsing fails, treat as comma-separated string or single value
    if (value.includes(',')) {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    // Single value, wrap in array
    return [value];
  }
};

const deserializeDocuments = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(normalizeEmployeeImagePath).filter(Boolean);

  if (typeof value !== "string") {
    const normalizedValue = normalizeEmployeeImagePath(String(value));
    return normalizedValue ? [normalizedValue] : [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(normalizeEmployeeImagePath).filter(Boolean);

    const normalizedValue = normalizeEmployeeImagePath(parsed);
    return normalizedValue ? [normalizedValue] : [];
  } catch {
    if (value.includes(',')) {
      return value
        .split(',')
        .map(item => normalizeEmployeeImagePath(item))
        .filter(Boolean);
    }

    const normalizedValue = normalizeEmployeeImagePath(value);
    return normalizedValue ? [normalizedValue] : [];
  }
};

const hydrateEmployee = (employee) => {
  if (!employee) {
    return null;
  }
  return {
    ...employee,
    page_access: deserializePageAccess(employee.page_access),
    profile_img: normalizeEmployeeImagePath(employee.profile_img),
    document_img: deserializeDocuments(employee.document_img),
  };
};

async function getByEmployeeId(employeeId) {
  const result = await pool.query("SELECT * FROM users WHERE employee_id = $1", [employeeId]);
  return hydrateEmployee(result.rows[0]);
}

async function getAll() {
  const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
  return result.rows.map(hydrateEmployee);
}

async function getById(id) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return hydrateEmployee(result.rows[0]);
}

async function create(data) {
  const query = ` 
    INSERT INTO users ( 
      employee_id, 
      user_name, 
      email_id, 
      number, 
      page_access,
      department, 
      designation, 
      role, 
      status, 
      address,
      password,
      profile_img,
      document_img
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) 
    RETURNING * 
  `;

  const pageAccessInput = resolvePageAccessInput(data);
  const serializedPageAccess = serializePageAccess(pageAccessInput);

  const values = [
    data.employee_id,
    data.user_name,
    data.email_id,
    data.number || data.mobile_number,
    serializedPageAccess,
    data.department,
    data.designation,
    data.role,
    data.status,
    data.address ?? null,
    data.password,
    data.profile_img || null,
    data.document_img || null
  ];

  const result = await pool.query(query, values);
  const created = hydrateEmployee(result.rows[0]);
  return created;
}

async function update(id, data) {
  const query = ` 
    UPDATE users 
    SET 
      employee_id = $1, 
      user_name = $2, 
      email_id = $3, 
      number = $4, 
      department = $5, 
      designation = $6, 
      role = $7, 
      status = $8, 
      password = COALESCE(NULLIF($9, ''), password),
      page_access = $10,
      address = $11,
      profile_img = COALESCE($12, profile_img),
      document_img = COALESCE($13, document_img)
    WHERE id = $14 
    RETURNING * 
  `;

  const pageAccessInput = resolvePageAccessInput(data);
  const serializedPageAccess = serializePageAccess(pageAccessInput);

  const values = [
    data.employee_id,
    data.user_name,
    data.email_id,
    data.number || data.mobile_number,
    data.department,
    data.designation,
    data.role,
    data.status,
    data.password || null,
    serializedPageAccess,
    data.address ?? null,
    data.profile_img !== undefined ? data.profile_img : null,
    data.document_img !== undefined ? data.document_img : null,
    id
  ];

  const result = await pool.query(query, values);
  const updated = hydrateEmployee(result.rows[0]);
  return updated;
}

async function remove(id) {
  const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [id]);
  return result.rows[0] || null;
}

async function getByCredentials(identifier, password) {
  const result = await pool.query(
    "SELECT * FROM users WHERE (user_name = $1 OR employee_id = $1) AND password = $2",
    [identifier, password]
  );
  return hydrateEmployee(result.rows[0]);
}

async function getDistinctDepartments() {
  const result = await pool.query(
    "SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department"
  );
  return result.rows.map(row => row.department);
}

async function getDistinctDesignations() {
  const result = await pool.query(
    "SELECT DISTINCT designation FROM users WHERE designation IS NOT NULL AND designation != '' ORDER BY designation"
  );
  return result.rows.map(row => row.designation);
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getByCredentials,
  getDistinctDepartments,
  getDistinctDesignations,
  getByEmployeeId,
  hydrateEmployee
};
