import express from "express";
import { getDepartmentTasks } from "../controllers/departmentTaskController.js";

const router = express.Router();

/**
 * @route GET /api/checklist/department-tasks
 * @desc Get tasks (pending or completed) filtered by user department/division
 * @params username, type (pending/completed), page
 */
router.get("/", getDepartmentTasks);

export default router;
