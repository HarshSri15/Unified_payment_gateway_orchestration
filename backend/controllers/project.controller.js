import asyncHandler from "express-async-handler";
import Project from "../models/project.model.js";
import Transaction from "../models/transaction.model.js";
import ApiError from "../utils/apiError.js";

/**
 * CREATE PROJECT (Wizard)
 */
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, environment, callbacks, gateways, gstInfo } = req.body;

  if (!name || !environment) {
    throw new ApiError(400, "Missing required fields: name or environment");
  }

  // Normalize gateways
  const normalizedGateways = {};
  if (gateways && typeof gateways === "object") {
    for (const [key, val] of Object.entries(gateways)) {
      const k = String(key).toLowerCase().trim();
      if (val?.enabled) {
        normalizedGateways[k] = {
          enabled: true,
          config: val.config || {},
        };
      }
    }
  }

  // Generate API key
  const pair = Project.generateKeyPair();

  const projectPayload = {
    name,
    description: description || "",
    owner: req.user._id,
    environment,
    callbacks: callbacks || {},
    apiKeys: [{ keyId: pair.keyId, secret: pair.secret, label: "default" }],
    gatewayConfigs: normalizedGateways,
    settings: gstInfo ? { gstInfo } : {},
  };

  const project = await Project.create(projectPayload);

  res.status(201).json({
    success: true,
    data: {
      project,
      apiKey: pair.keyId,
      apiSecret: pair.secret,
    },
  });
});

/**
 * LIST PROJECTS
 */
export const listProjects = asyncHandler(async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { owner: req.user._id };
  const projects = await Project.find(filter).sort({ createdAt: -1 });

  res.json({ success: true, data: projects });
});

/**
 * GET SINGLE PROJECT
 */
export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");

  if (
    req.user.role !== "admin" &&
    project.owner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "Access denied");
  }

  res.json({ success: true, data: project });
});

/**
 * PROJECT DASHBOARD STATS (STEP 4)
 */
export const getProjectStats = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const transactions = await Transaction.find({ projectId }).sort({
    createdAt: -1,
  });

  const paid = transactions.filter((t) => t.status === "paid");
  const totalRevenue = paid.reduce((sum, t) => sum + (t.amount || 0), 0);

  res.json({
    success: true,
    data: {
      totalTransactions: transactions.length,
      totalRevenue,
      successRate: transactions.length
        ? Math.round((paid.length / transactions.length) * 100)
        : 0,
      activeGateways: Object.keys(project.gatewayConfigs || {}).length,
      recentTransactions: transactions.slice(0, 10),
    },
  });
});
