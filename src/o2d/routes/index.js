const { Router } = require("express");
const firstWeightRoutes = require("./firstWeight.routes.js");
const secondWeightRoutes = require("./secondWeight.routes.js");
const invoiceRoutes = require("./invoice.routes.js");
const gateOutRoutes = require("./gateOut.routes.js");
const gateProcessRoutes = require("./gateProcess.routes.js");
const paymentRoutes = require("./payment.routes.js");
const authRoutes = require("./auth.routes.js");
const dashboardRoutes = require("./dashboard.routes.js");
const complaintRoutes = require("./complaint.routes.js");
const pendingOrderRoutes = require("./pendingOrder.routes.js");

const router = Router();

router.use("/first-weight", firstWeightRoutes);
router.use("/second-weight", secondWeightRoutes);
router.use("/invoice", invoiceRoutes);
router.use("/gate-out", gateOutRoutes);
router.use("/process", gateProcessRoutes);
router.use("/payment", paymentRoutes);
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/complaint", complaintRoutes);
router.use("/orders", pendingOrderRoutes);

module.exports = router;
