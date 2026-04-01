import { Router } from "express";
import { fetchVendorRegistrations } from "../controllers/vendorRegistration.controller.js";

const router = Router();

router.get("/", fetchVendorRegistrations);

export default router;
