const jwt = require("jsonwebtoken");
const { loginQuery } = require("../../../config/pg.js");

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

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

// ── Ensure session_token column exists (run once on first login) ──────────────
let sessionColumnEnsured = false;
async function ensureSessionTokenColumn() {
  if (sessionColumnEnsured) return;
  try {
    await loginQuery(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT NULL`,
      []
    );
    sessionColumnEnsured = true;
    console.log("✅ users.session_token column ensured");
  } catch (err) {
    console.warn("⚠️  Could not ensure session_token column:", err.message);
  }
}

// ── User select query ─────────────────────────────────────────────────────────
let cachedUserSelectQuery = null;
async function getUserSelectQuery() {
  if (cachedUserSelectQuery) return cachedUserSelectQuery;
  cachedUserSelectQuery = `
    SELECT
      id, user_name, password, email_id, department, given_by, role,
      COALESCE(status, 'active') as status,
      user_access, page_access, system_access, remark, employee_id
    FROM users
    WHERE TRIM(user_name) = $1 OR TRIM(COALESCE(employee_id, '')) = $1
    LIMIT 1
  `;
  return cachedUserSelectQuery;
}

// ── Sign JWT ──────────────────────────────────────────────────────────────────
function signToken(user) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) throw new Error("JWT secret not configured");

  return jwt.sign(
    {
      id: user.id,
      username: user.user_name || user.username,
      user_name: user.user_name || user.username,
      role: user.role || "user",
      user_access: user.user_access || "",
      page_access: user.page_access || "",
      system_access: user.system_access || "",
      employee_id: user.employee_id || "",
      email_id: user.email_id || "",
      department: user.department || "",
    },
    jwtSecret,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ── Normalize DB value ────────────────────────────────────────────────────────
function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && (value.toUpperCase() === "NULL" || value.trim() === "")) return null;
  return value;
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
async function login(req, res) {
  await ensureSessionTokenColumn();

  const loginId = req.body.username || req.body.user_name || req.body.employee_id;
  const password = req.body.password;

  if (!loginId || !password) {
    return res.status(400).json({
      success: false,
      message: "username/user_name/employee_id and password are required",
    });
  }

  try {
    const query = await getUserSelectQuery();
    const result = await loginQuery(query, [String(loginId).trim()]);

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
      page_access: normalizeValue(user.page_access),
      system_access: normalizeValue(user.system_access),
      employee_id: normalizeValue(user.employee_id),
      email_id: normalizeValue(user.email_id),
      department: normalizeValue(user.department),
      status: user.status || "active",
    };

    // Generate token (30 days)
    const token = signToken(normalizedUser);

    // ── Single-session: store new token in DB, revoking any previous session ──
    try {
      await loginQuery(
        `UPDATE users SET session_token = $1 WHERE id = $2`,
        [token, user.id]
      );
    } catch (err) {
      console.warn("⚠️  Could not store session_token:", err.message);
      // Non-fatal — login continues
    }

    console.log("✅ Login:", normalizedUser.user_name);

    return res.status(200).json({
      success: true,
      data: {
        user: normalizedUser,
        token,
        user_access: normalizedUser.user_access,
        page_access: normalizedUser.page_access,
        system_access: normalizedUser.system_access,
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

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
async function logout(req, res) {
  const userId = req.user?.id;
  if (userId) {
    try {
      await loginQuery(`UPDATE users SET session_token = NULL WHERE id = $1`, [userId]);
    } catch (err) {
      console.warn("⚠️  Could not clear session_token on logout:", err.message);
    }
  }
  return res.status(200).json({ success: true, message: "Logged out successfully" });
}

// ── GET /api/auth/verify-session ─────────────────────────────────────────────
// Frontend calls this periodically to detect if session was revoked by another login
async function verifySession(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    return res.status(500).json({ success: false, message: "Server misconfigured" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ success: false, message: "Token expired or invalid" });
  }

  try {
    const result = await loginQuery(
      `SELECT session_token FROM users WHERE id = $1 LIMIT 1`,
      [decoded.id]
    );
    const row = result.rows?.[0];
    if (!row || row.session_token !== token) {
      return res.status(401).json({
        success: false,
        message: "Session invalidated — another login detected",
        code: "SESSION_REVOKED",
      });
    }
  } catch (err) {
    console.warn("⚠️  Could not verify session_token:", err.message);
    // Fail open — don't lock users out if DB check fails
  }

  return res.status(200).json({ success: true, message: "Session active" });
}

module.exports = { login, logout, verifySession };
