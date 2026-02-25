const { Router } = require("express");
const { fetchDashboardSummary, fetchAnalyticsMetrics } = require("../controllers/dashboard.controller.js");
const { fetchCustomerFeedback } = require("../controllers/customerFeedback.controller.js");
const asyncHandler = require("../utils/asyncHandler.js");

const router = Router();

router.get("/summary", asyncHandler(fetchDashboardSummary));
router.get("/metrics", asyncHandler(fetchAnalyticsMetrics));
router.get("/customer-feedback", asyncHandler(fetchCustomerFeedback));


module.exports = router;




