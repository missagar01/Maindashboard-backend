import { Router } from "express";
import {
  getPoPending,
  getPoHistory,
  downloadPoHistory,
  downloadPoPending,
} from "../controllers/po.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/pending", authenticate, getPoPending);
router.get("/pending/download", authenticate, downloadPoPending);
router.get("/history", authenticate, getPoHistory);
router.get("/history/download", authenticate, downloadPoHistory);

export default router;


