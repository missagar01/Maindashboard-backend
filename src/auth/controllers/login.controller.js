const jwt = require("jsonwebtoken");
const { loginQuery } = require("../../../config/pg.js");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";
const ENFORCE_SINGLE_SESSION = String(process.env.ENFORCE_SINGLE_SESSION || "").toLowerCase() === "true";

const FAST_USER_SELECT_QUERY = `
  SELECT
    id,
    user_name,
    password,
    email_id,
    department,
    user_access1,
    given_by,
    role,
    COALESCE(status, 'active') AS status,
    user_access,
    page_access,
    system_access,
    store_access,
    verify_access,
    verify_access_dept,
    designation,
    division,
    remark,
    employee_id
  FROM users
  WHERE user_name = $1 OR employee_id = $1
  LIMIT 1
`;

const FALLBACK_USER_SELECT_QUERY = `
  SELECT
    id,
    user_name,
    password,
    email_id,
    department,
    user_access1,
    given_by,
    role,
    COALESCE(status, 'active') AS status,
    user_access,
    page_access,
    system_access,
    store_access,
    verify_access,
    verify_access_dept,
    designation,
    division,
    remark,
    employee_id
  FROM users
  WHERE TRIM(user_name) = $1 OR TRIM(COALESCE(employee_id, '')) = $1
  LIMIT 1
`;

function getJwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.JWT_SCREAT ||
    process.env.JWT_SECREAT ||
    process.env.jwt_secret ||
    process.env.jwt_screat ||
    process.env.jwt_secreat ||
    null
  );
}

function signToken(user) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    throw new Error("JWT secret not configured");
  }

  return jwt.sign(
    {
      id: user.id,
      username: user.user_name || user.username,
      user_name: user.user_name || user.username,
      role: user.role || "user",
      user_access: user.user_access || "",
      user_access1: user.user_access1 || "",
      page_access: user.page_access || "",
      system_access: user.system_access || "",
      store_access: user.store_access || "",
      verify_access: user.verify_access || "",
      verify_access_dept: user.verify_access_dept || "",
      employee_id: user.employee_id || "",
      email_id: user.email_id || "",
      department: user.department || "",
      designation: user.designation || "",
      division: user.division || "",
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extractBearerToken(rawHeader) {
  const header = typeof rawHeader === "string" ? rawHeader.trim() : "";
  if (!header) return null;

  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }

  return header;
}

function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && (value.toUpperCase() === "NULL" || value.trim() === "")) {
    return null;
  }
  return value;
}

async function login(req, res) {
  const loginId = req.body.username || req.body.user_name || req.body.employee_id;
  const password = req.body.password;

  if (!loginId || !password) {
    return res.status(400).json({
      success: false,
      message: "username/user_name/employee_id and password are required",
    });
  }

  try {
    const normalizedLoginId = String(loginId).trim();
    let result = await loginQuery(FAST_USER_SELECT_QUERY, [normalizedLoginId]);

    // Preserve compatibility with legacy rows that may contain stray spaces.
    if (!result.rows || result.rows.length === 0) {
      result = await loginQuery(FALLBACK_USER_SELECT_QUERY, [normalizedLoginId]);
    }

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];

    if ((user.password || "") !== password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.status && user.status.toLowerCase() === "inactive") {
      return res.status(403).json({ success: false, message: "Account is inactive" });
    }

    const normalizedUser = {
      id: user.id,
      role: user.role || "user",
      user_name: user.user_name,
      username: user.user_name,
      user_access: normalizeValue(user.user_access),
      user_access1: normalizeValue(user.user_access1),
      page_access: normalizeValue(user.page_access),
      system_access: normalizeValue(user.system_access),
      store_access: normalizeValue(user.store_access),
      verify_access: normalizeValue(user.verify_access),
      verify_access_dept: normalizeValue(user.verify_access_dept),
      employee_id: normalizeValue(user.employee_id),
      email_id: normalizeValue(user.email_id),
      department: normalizeValue(user.department),
      designation: normalizeValue(user.designation),
      division: normalizeValue(user.division),
      status: user.status || "active",
    };

    const token = signToken(normalizedUser);

    try {
      await loginQuery(`UPDATE users SET session_token = $1 WHERE id = $2`, [token, user.id]);
    } catch (err) {
      console.warn("Could not store session_token:", err.message);
    }

    console.log("Login:", normalizedUser.user_name);

    return res.status(200).json({
      success: true,
      data: {
        user: normalizedUser,
        token,
        user_access: normalizedUser.user_access,
        user_access1: normalizedUser.user_access1,
        page_access: normalizedUser.page_access,
        system_access: normalizedUser.system_access,
        store_access: normalizedUser.store_access,
        verify_access: normalizedUser.verify_access,
        verify_access_dept: normalizedUser.verify_access_dept,
        designation: normalizedUser.designation,
        division: normalizedUser.division,
        role: normalizedUser.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    });
  }
}

async function logout(req, res) {
  const userId = req.user?.id;
  if (userId) {
    try {
      await loginQuery(`UPDATE users SET session_token = NULL WHERE id = $1`, [userId]);
    } catch (err) {
      console.warn("Could not clear session_token on logout:", err.message);
    }
  }
  return res.status(200).json({ success: true, message: "Logged out successfully" });
}

async function verifySession(req, res) {
  const token = extractBearerToken(req.headers.authorization || req.headers.Authorization || "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
      code: "TOKEN_MISSING",
    });
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return res.status(500).json({ success: false, message: "Server misconfigured" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    const code = err?.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
    return res.status(401).json({ success: false, message: "Token expired or invalid", code });
  }

  if (!ENFORCE_SINGLE_SESSION) {
    return res.status(200).json({ success: true, message: "Session active" });
  }

  if (!decoded?.id) {
    return res.status(401).json({
      success: false,
      message: "Token payload missing user id",
      code: "TOKEN_INVALID",
    });
  }

  try {
    const result = await loginQuery(`SELECT session_token FROM users WHERE id = $1 LIMIT 1`, [
      decoded.id,
    ]);
    const row = result.rows?.[0];

    if (!row) {
      return res.status(401).json({
        success: false,
        message: "Session invalidated - another login detected",
        code: "SESSION_REVOKED",
      });
    }

    const storedToken = typeof row.session_token === "string" ? row.session_token.trim() : "";
    if (!storedToken) {
      try {
        await loginQuery(`UPDATE users SET session_token = $1 WHERE id = $2`, [token, decoded.id]);
      } catch (err) {
        console.warn("Could not backfill missing session_token:", err.message);
      }
      return res.status(200).json({ success: true, message: "Session active" });
    }

    if (storedToken !== token) {
      return res.status(401).json({
        success: false,
        message: "Session invalidated - another login detected",
        code: "SESSION_REVOKED",
      });
    }
  } catch (err) {
    console.warn("Could not verify session_token:", err.message);
  }

  return res.status(200).json({ success: true, message: "Session active" });
}

module.exports = { login, logout, verifySession };
