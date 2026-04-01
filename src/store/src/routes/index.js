// Unified routes index
import { Router } from "express";
import authRoutes from "./auth.routes.js";

// Store routes (Oracle-backed)
import storeIndentRoutes from "./storeIndent.routes.js";
import vendorRateUpdateRoutes from "./vendorRateUpdate.routes.js";
import threePartyApprovalRoutes from "./threePartyApproval.routes.js";
import poRoutes from "./po.routes.js";
import healthRoutes from "./health.routes.js";
import itemRoutes from "./item.routes.js";
import uomRoutes from "./uom.routes.js";
import costLocationRoutes from "./costLocation.routes.js";
import stockRoutes from "./stockRoutes.js";
import repairGatePassRoutes from "./repairGatePass.routes.js";
import vendorRegistrationRoutes from "./vendorRegistration.routes.js";

// Checklist PostgreSQL routes
import indentRoutes from "./indent.routes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import repairFollowupRoutes from "./repairFollowup.routes.js";
import settingsRoutes from "./settings.routes.js";
import storeGRNApproval from "./storeGRNApproval.routes.js";
import departmentRoutes from "./department.routes.js";
import divisionRoutes from "./division.routes.js";

// Additional Oracle-backed routes
import storeGRNRoutes from "./storeGRN.routes.js";
import storeIssueRoutes from "./storeIssue.routes.js";
import returnableRoutes from "./returnable.routes.js";
import erpIndentRoutes from "./erpIndent.routes.js";

const router = Router();

// Auth utility routes (local login/logout removed; shared login is /api/auth/login)
router.use("/auth", authRoutes);

router.use("/store-indent", storeIndentRoutes);
router.use("/vendor-rate-update", vendorRateUpdateRoutes);
router.use("/three-party-approval", threePartyApprovalRoutes);
router.use("/po", poRoutes);
router.use("/health", healthRoutes);
router.use("/items", itemRoutes);
router.use("/uom", uomRoutes);
router.use("/cost-location", costLocationRoutes);
router.use("/stock", stockRoutes);
router.use("/repair-gate-pass", repairGatePassRoutes);
router.use("/vendor-registration", vendorRegistrationRoutes);

// Additional Oracle-backed routes
router.use("/store-grn", storeGRNRoutes);
router.use("/store-issue", storeIssueRoutes);
router.use("/returnable", returnableRoutes);
router.use("/erp-indent", erpIndentRoutes);

// Checklist PostgreSQL routes
router.use("/indent", indentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/repair-followup", repairFollowupRoutes);
router.use("/settings", settingsRoutes);
router.use("/store-grn-approval", storeGRNApproval);
router.use("/departments", departmentRoutes);
router.use("/division", divisionRoutes);

export default router;

