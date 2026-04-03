const { Router } = require("express");
const { login, logout, verifySession } = require("../controllers/login.controller.js");
const { loginQuery } = require("../../../config/pg.js");
const { authenticate } = require("../../o2d/middleware/auth.js");

const router = Router();

// ── Auth routes ────────────────────────────────────────────────────────────────
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.get("/verify-session", verifySession); // frontend polls to detect session revocation

// ── Utility: CRM users list ────────────────────────────────────────────────────
router.get("/crm-users", authenticate, async (req, res) => {
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
