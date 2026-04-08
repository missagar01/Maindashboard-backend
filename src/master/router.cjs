const express = require("express");

const router = express.Router();
let masterRouterPromise = null;

async function buildMasterRouter() {
  const [
    dashboardRoutesMod,
    settingRoutesMod,
    userRoutesMod,
    userScoreRoutesMod,
    attendenceRoutesMod,
  ] = await Promise.all([
    import("./routes/dashboardRoutes.js"),
    import("./routes/settingRoutes.js"),
    import("./routes/userRoutes.js"),
    import("./routes/userScoreRoutes.js"),
    import("./routes/attendenceRoutes.js"),
  ]);

  const dashboardRoutes = dashboardRoutesMod.default;
  const settingRoutes = settingRoutesMod.default;
  const userRoutes = userRoutesMod.default;
  const userScoreRoutes = userScoreRoutesMod.default;
  const attendenceRoutes = attendenceRoutesMod.default;

  const mountedRouter = express.Router();

  mountedRouter.get("/health", (_req, res) => {
    res.json({
      success: true,
      service: "master",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  mountedRouter.use("/dashboard", dashboardRoutes);
  mountedRouter.use("/settings", settingRoutes);
  mountedRouter.use("/users", userRoutes);
  mountedRouter.use("/user-score", userScoreRoutes);
  mountedRouter.use("/attendence", attendenceRoutes);

  return mountedRouter;
}

function getMasterRouter() {
  if (!masterRouterPromise) {
    masterRouterPromise = buildMasterRouter().catch((error) => {
      masterRouterPromise = null;
      throw error;
    });
  }
  return masterRouterPromise;
}

router.use(async (req, res, next) => {
  try {
    const mountedRouter = await getMasterRouter();
    return mountedRouter(req, res, next);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
