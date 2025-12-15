
// backend/middleware/requireProjectOwner.js
import Project from "../models/project.model.js";

export default async function requireProjectOwner(req, res, next) {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Ensure we have req.user from protect middleware
    if (!req.user || String(project.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.project = project;
    next();
  } catch (e) {
    next(e);
  }
}
