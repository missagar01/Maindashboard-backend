import { Router } from "express";
import * as divisionController from "../controllers/division.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/issue", authenticate, divisionController.getDivisionWiseIssue);
router.get("/indent", authenticate, divisionController.getDivisionWiseIndent);
router.get("/po", authenticate, divisionController.getDivisionWisePO);
router.get("/grn", authenticate, divisionController.getDivisionWiseGRN);

export default router;
