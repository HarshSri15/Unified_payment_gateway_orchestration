import { Plus } from "lucide-react";

export default function ProjectSidebar({
  projects = [],
  activeProject,
  onSelectProject,
  onCreateProject,
}) {
  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
    <div className="w-72 border-r bg-white p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Projects</h2>
        <button
          onClick={onCreateProject}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
        >
          + New
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {safeProjects.length === 0 && (
          <p className="text-sm text-gray-400">No projects yet</p>
        )}

        {safeProjects.map((project) => {
          const isActive = activeProject?._id === project._id;

          return (
            <button
              key={project._id}
              onClick={() => onSelectProject(project)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                isActive
                  ? "bg-black text-white"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              {project.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
