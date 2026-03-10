const { Router } = require("express");
const jwt = require("jsonwebtoken");
const { login, logout, verifySession } = require("../controllers/login.controller.js");
const { loginQuery } = require("../../../config/pg.js");

const router = Router();

// Lightweight middleware: attaches req.user from Bearer token (best-effort, no DB)
function attachUser(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const secret =
        process.env.JWT_SECRET || process.env.JWT_SCREAT || process.env.JWT_SECREAT ||
        process.env.jwt_secret || process.env.jwt_screat || process.env.jwt_secreat || "";
      if (secret) req.user = jwt.verify(token, secret);
    }
  } catch { /* best effort */ }
  next();
}

// ── Auth routes ────────────────────────────────────────────────────────────────
router.post("/login", login);
router.post("/logout", attachUser, logout);   // attachUser so logout can clear session_token
router.get("/verify-session", verifySession); // frontend polls to detect session revocation

// ── Utility: CRM users list ────────────────────────────────────────────────────
router.get("/crm-users", async (req, res) => {
  try {
    const result = await loginQuery(
      `SELECT id, user_name, employee_id, email_id, department, role
       FROM users
       WHERE department = 'CRM'
         AND COALESCE(status, 'active') = 'active'
       ORDER BY user_name ASC`,
      []
    );
    return res.status(200).json({ success: true, data: result.rows || [] });
  } catch (err) {
    console.error("Error fetching CRM users:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch CRM users",
      error: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
    });
  }
});

module.exports = router;
