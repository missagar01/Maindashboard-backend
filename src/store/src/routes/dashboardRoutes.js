import express from "express";
import {
  getDashboardMetrics,
  getPendingIndents,
  getHistory,
  getPoPending,
  getPoHistory,
  getRepairPending,
  getRepairHistory,
  getReturnableDetails,
} from "../controllers/dashboardController.js";

const router = express.Router();

// GET dashboard summary (Consolidated)
router.get("/", getDashboardMetrics);

// Individual Endpoints for Testing
router.get("/pending-indents", getPendingIndents);
router.get("/history-indents", getHistory);
router.get("/po-pending", getPoPending);
router.get("/po-history", getPoHistory);
router.get("/repair-pending", getRepairPending);
router.get("/repair-history", getRepairHistory);
router.get("/returnable-details", getReturnableDetails);

export default router;
