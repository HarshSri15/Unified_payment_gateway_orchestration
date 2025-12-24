import express from "express";
import { createProject, getProject, listProjects } from "../controllers/project.controller.js";
import { protect } from "../middleware/authMiddleware.js";
import { getProjectStats } from "../controllers/project.controller.js";
import { getProjectGatewaySummary } from "../controllers/project.controller.js";


const router = express.Router();

router.post("/", protect, createProject);
router.get("/", protect, listProjects);
router.get("/:id", protect, getProject);
router.get("/:projectId/stats", protect, getProjectStats);
router.get("/:projectId/gateways", protect, getProjectGatewaySummary);


export default router;



