const { Router } = require("express");
const sharedAuthRoutes = require("../../auth/routes/login.routes.js");
const { authenticate } = require("../middleware/auth.js");
const gateProcessRoutes = require("./gateProcess.routes.js");
const dashboardRoutes = require("./dashboard.routes.js");
const pendingOrderRoutes = require("./pendingOrder.routes.js");
const sizeMasterRoutes = require("./sizeMaster.routes.js");
const clientRoutes = require("./client.routes.js");
const followupRoutes = require("./followup.routes.js");
const deliveryRoutes = require("./delivery.routes.js");

const router = Router();

router.use("/auth", sharedAuthRoutes);
router.use(authenticate);

router.use("/process", gateProcessRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/orders", pendingOrderRoutes);
router.use("/size-master", sizeMasterRoutes);
router.use("/client", clientRoutes);
router.use("/followup", followupRoutes);
router.use("/delivery", deliveryRoutes);

module.exports = router;




