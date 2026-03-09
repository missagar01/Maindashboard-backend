const express = require("express");

const router = express.Router();
let checklistRouterPromise = null;

async function buildChecklistMaintenanceRouter() {
  const [
    dashboardRoutesMod,
    assignTaskRoutesMod,
    checklistRoutesMod,
    delegationRoutesMod,
    settingRoutesMod,
    staffTasksRoutesMod,
    quickTaskRoutesMod,
    deviceRoutesMod,
    userScoreRoutesMod,
    addNewTaskRoutesMod,
    maintenanceRoutesMod,
    maintenanceTaskRoutesMod,
    formResponsesRoutesMod,
    dropdownRoutesMod,
    machineDetailsRoutesMod,
    workingDayRoutesMod,
    machineRoutesMod,
    masterRoutesMod,
    departmentRoutesMod,
    maintenanceDashboardRoutesMod,
    housekeepingRoutesMod,
    authMiddlewareMod,
  ] = await Promise.all([
    import("./routes/dashboardRoutes.js"),
    import("./routes/assignTaskRoutes.js"),
    import("./routes/checklistRoutes.js"),
    import("./routes/delegationRoutes.js"),
    import("./routes/settingRoutes.js"),
    import("./routes/staffTasksRoutes.js"),
    import("./routes/quickTaskRoutes.js"),
    import("./routes/deviceRoutes.js"),
    import("./routes/userScoreRoutes.js"),
    import("./routes/AddNewTask.routes.js"),
    import("./routes/maintenanceRoutes.js"),
    import("./routes/maintenance-routes/maintenanceTaskRoutes.js"),
    import("./routes/maintenance-routes/formResponsesRoutes.js"),
    import("./routes/maintenance-routes/dropdownRoutes.js"),
    import("./routes/maintenance-routes/machineDetailsRoutes.js"),
    import("./routes/maintenance-routes/workingDayRoutes.js"),
    import("./routes/maintenance-routes/machineRoutes.js"),
    import("./routes/maintenance-routes/masterRoutes.js"),
    import("./routes/maintenance-routes/departmentRoutes.js"),
    import("./routes/maintenance-routes/maintenanceDashboardRoutes.js"),
    import("./routes/housekepping-routes/index.js"),
    import("./middleware/authMiddleware.js"),
  ]);

  const dashboardRoutes = dashboardRoutesMod.default;
  const assignTaskRoutes = assignTaskRoutesMod.default;
  const checklistRoutes = checklistRoutesMod.default;
  const delegationRoutes = delegationRoutesMod.default;
  const settingRoutes = settingRoutesMod.default;
  const staffTasksRoutes = staffTasksRoutesMod.default;
  const quickTaskRoutes = quickTaskRoutesMod.default;
  const deviceRoutes = deviceRoutesMod.default;
  const userScoreRoutes = userScoreRoutesMod.default;
  const addNewTaskRoutes = addNewTaskRoutesMod.default;
  const maintenanceRoutes = maintenanceRoutesMod.default;
  const maintenanceTaskRoutes = maintenanceTaskRoutesMod.default;
  const formResponsesRoutes = formResponsesRoutesMod.default;
  const dropdownRoutes = dropdownRoutesMod.default;
  const machineDetailsRoutes = machineDetailsRoutesMod.default;
  const workingDayRoutes = workingDayRoutesMod.default;
  const machineRoutes = machineRoutesMod.default;
  const masterRoutes = masterRoutesMod.default;
  const departmentRoutes = departmentRoutesMod.default;
  const maintenanceDashboardRoutes = maintenanceDashboardRoutesMod.default;
  const housekeepingRoutes = housekeepingRoutesMod.default;
  const authMiddleware = authMiddlewareMod.default;

  const mountedRouter = express.Router();

  mountedRouter.get("/checklist/health", authMiddleware, (_req, res) => {
    res.json({
      success: true,
      service: "checklist-maintenance-housekeeping",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Authentication is handled by the shared /api/auth/login endpoint.
  // Use POST /api/auth/login to get a token, then pass it as Bearer token.

  // Checklist APIs
  mountedRouter.use("/checklist", authMiddleware);
  mountedRouter.use("/checklist/dashboard", dashboardRoutes);
  mountedRouter.use("/checklist/assign-task", assignTaskRoutes);
  mountedRouter.use("/checklist", checklistRoutes);
  mountedRouter.use("/checklist", delegationRoutes);
  mountedRouter.use("/checklist/settings", settingRoutes);
  mountedRouter.use("/checklist/staff-tasks", staffTasksRoutes);
  mountedRouter.use("/checklist/tasks", quickTaskRoutes);
  mountedRouter.use("/checklist/logs", deviceRoutes);
  mountedRouter.use("/checklist/user-score", userScoreRoutes);
  mountedRouter.use("/checklist/add-new-task", addNewTaskRoutes);

  // Housekeeping APIs (user requested spelling)
  mountedRouter.use("/houskeeping", authMiddleware);
  mountedRouter.use("/housekeeping", authMiddleware);
  mountedRouter.use("/houskeeping", housekeepingRoutes);
  mountedRouter.use("/housekeeping", housekeepingRoutes);

  const mountMaintenanceGroup = (basePath) => {
    mountedRouter.use(basePath, authMiddleware);
    mountedRouter.use(basePath, maintenanceRoutes);
    mountedRouter.use(`${basePath}/maintenance-tasks`, maintenanceTaskRoutes);
    mountedRouter.use(`${basePath}/form-responses`, formResponsesRoutes);
    mountedRouter.use(`${basePath}/dropdown`, dropdownRoutes);
    mountedRouter.use(`${basePath}/machine-details`, machineDetailsRoutes);
    mountedRouter.use(`${basePath}/working-days`, workingDayRoutes);
    mountedRouter.use(`${basePath}/machines`, machineRoutes);
    mountedRouter.use(`${basePath}/master`, masterRoutes);
    mountedRouter.use(`${basePath}/departments`, departmentRoutes);
    mountedRouter.use(`${basePath}/dashboard`, maintenanceDashboardRoutes);
  };

  // Maintenance APIs (user requested spelling + alias)
  mountMaintenanceGroup("/mainatce");
  mountMaintenanceGroup("/maintenance");

  return mountedRouter;
}

function getChecklistMaintenanceRouter() {
  if (!checklistRouterPromise) {
    checklistRouterPromise = buildChecklistMaintenanceRouter().catch((error) => {
      checklistRouterPromise = null;
      throw error;
    });
  }
  return checklistRouterPromise;
}

router.use(async (req, res, next) => {
  try {
    const mountedRouter = await getChecklistMaintenanceRouter();
    return mountedRouter(req, res, next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
