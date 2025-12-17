import { useEffect, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import api from "@/api";
import ProjectSidebar from "@/components/projectSidebar";

export default function ProjectsHub() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState(null);

  // Fetch all projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/api/projects");
        const list = res.data?.data || [];

        setProjects(list);

        if (projectId) {
          const found = list.find((p) => p._id === projectId);
          setActiveProject(found || null);
        }
      } catch (err) {
        console.error("Failed to load projects", err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [projectId]);

  const handleSelectProject = (project) => {
    setActiveProject(project);
    navigate(`/projects/${project._id}`); // ✅ FIXED
  };

  const handleCreateProject = () => {
    navigate("/projects/create");
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading projects...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <ProjectSidebar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
      />

      {/* Main content */}
      <div className="flex-1 bg-gray-50 p-6 overflow-auto">
        <Outlet
          context={{
            project: activeProject,
            projects,
          }}
        />
      </div>
    </div>
  );
}
