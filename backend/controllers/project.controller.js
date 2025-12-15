import asyncHandler from "express-async-handler";
import Project from "../models/project.model.js";
import ApiError from "../utils/apiError.js";

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
      if (val.enabled) { // Only include enabled gateways
        normalizedGateways[k] = {
          enabled: true,
          config: val.config || {},
        };
      }
    }
  }

  // Generate default API key pair
  const pair = Project.generateKeyPair();
  
  const projectPayload = {
    name,
    description: description || "",
    owner: req.user._id,
    environment,
    callbacks: callbacks || {},
    apiKeys: [{ keyId: pair.keyId, secret: pair.secret, label: "default" }],
    gatewayConfigs: normalizedGateways,
  };

  // Add gstInfo if provided
  if (gstInfo) {
    projectPayload.settings = { gstInfo };
  }

  const newProject = await Project.create(projectPayload);

  return res.status(201).json({
    success: true,
    data: {
      project: newProject,
      apiKey: pair.keyId,
      apiSecret: pair.secret,
    },
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, "Project not found");

  if (req.user.role !== "admin" && project.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Access denied");
  }

  return res.status(200).json({ success: true, data: project });
});

export const listProjects = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== "admin") filter.owner = req.user._id;

  const projects = await Project.find(filter).sort({ createdAt: -1 });
  return res.status(200).json({ success: true, data: projects });
});


