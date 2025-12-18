// src/pages/project-workspace/Dashboard.jsx
import { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import api from "@/api/axios";

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const outletContext = useOutletContext();
  const contextProject = outletContext?.project;

  const [project, setProject] = useState(contextProject || null);
  const [loading, setLoading] = useState(!contextProject);

  // ✅ Fallback fetch if context not ready
  useEffect(() => {
    if (contextProject) return;

    const fetchProject = async () => {
      try {
        const res = await api.get(`/api/projects/${projectId}`);
        setProject(res.data.data);
      } catch (err) {
        console.error("Failed to load project", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, contextProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading project…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">
        {project.name}
      </h1>
      <p className="text-gray-500">
        Monitor your payment activity for this project
      </p>

      {/* Stats + charts come next step */}
    </div>
  );
}
