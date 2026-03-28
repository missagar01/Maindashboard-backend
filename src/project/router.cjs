const express = require("express");

const projectRoutes = require("./routes/projects");
const workAreaRoutes = require("./routes/workAreas");
const taskRoutes = require("./routes/tasks");
const logRoutes = require("./routes/logs");
const materialRoutes = require("./routes/materials");
const analyticsRoutes = require("./routes/analytics");

const router = express.Router();

router.get("/project/health", (_req, res) => {
  res.json({
    success: true,
    service: "project",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

router.use("/projects", projectRoutes);
router.use("/work-areas", workAreaRoutes);
router.use("/tasks", taskRoutes);
router.use("/logs", logRoutes);
router.use("/materials", materialRoutes);
router.use("/analytics", analyticsRoutes);

module.exports = router;
