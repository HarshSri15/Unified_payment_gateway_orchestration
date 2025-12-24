import asyncHandler from "express-async-handler";
import Project from "../models/project.model.js";
import Transaction from "../models/transaction.model.js";
import ApiError from "../utils/apiError.js";

/**
 * CREATE PROJECT (Wizard)
 */
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, environment, callbacks, gateways, gstInfo } =
    req.body;

  if (!name || !environment) {
    throw new ApiError(400, "Missing required fields: name or environment");
  }

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

  const pair = Project.generateKeyPair();

  const project = await Project.create({
    name,
    description: description || "",
    owner: req.user._id,
    environment,
    callbacks: callbacks || {},
    apiKeys: [{ keyId: pair.keyId, secret: pair.secret, label: "default" }],
    gatewayConfigs: normalizedGateways,
    settings: gstInfo ? { gstInfo } : {},
  });

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
 * PROJECT DASHBOARD STATS (STEP 7.1)
 */
/**
 * PROJECT DASHBOARD STATS (STEP 7.3 ✅)
 */
export const getProjectStats = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Access control
  if (
    req.user.role !== "admin" &&
    project.owner.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "Access denied");
  }

  /* ------------------------------
     OVERALL STATS
  ------------------------------ */
  const overall = await Transaction.aggregate([
    { $match: { project: project._id } },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
          },
        },
        successCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
          },
        },
        failedCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
          },
        },
      },
    },
  ]);

  const stats = overall[0] || {
    totalTransactions: 0,
    totalRevenue: 0,
    successCount: 0,
    failedCount: 0,
  };

  const successRate =
    stats.totalTransactions > 0
      ? Math.round((stats.successCount / stats.totalTransactions) * 100)
      : 0;

  /* ------------------------------
     RECENT TRANSACTIONS
  ------------------------------ */
  const recentTransactions = await Transaction.find({ project: project._id })
    .sort({ createdAt: -1 })
    .limit(10);

  /* ------------------------------
     GATEWAY SUMMARY (STEP 7.3)
  ------------------------------ */
  const gatewaySummary = await Transaction.aggregate([
    { $match: { project: project._id } },
    {
      $group: {
        _id: "$gateway",
        total: { $sum: 1 },
        success: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        amount: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
          },
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.json({
    success: true,
    data: {
      ...stats,
      successRate,
      activeGateways: Object.keys(project.gatewayConfigs || {}).length,
      recentTransactions,
      gatewaySummary,
    },
  });
});


/**
 * PROJECT GATEWAY SUMMARY (STEP 7.3 ✅)
 */
export const getProjectGatewaySummary = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const summary = await Transaction.aggregate([
    { $match: { project: project._id } },
    {
      $group: {
        _id: "$gateway",
        totalTransactions: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { totalTransactions: -1 } },
  ]);

  res.json({ success: true, data: summary });
});
