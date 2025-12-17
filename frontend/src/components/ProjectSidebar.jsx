export default function ProjectSidebar({
  projects = [],
  activeProject,
  onSelectProject,
  onCreateProject,
}) {
  const safeProjects = Array.isArray(projects) ? projects : [];

  return (
    <div className="w-72 border-r bg-white p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Projects</h2>
        <button
          onClick={onCreateProject}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
        >
          + New
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {safeProjects.length === 0 && (
          <p className="text-sm text-gray-400">No projects yet</p>
        )}

        {safeProjects.map((project) => (
          <button
            key={project._id}
            onClick={() => onSelectProject(project)}
            className={`w-full text-left px-3 py-2 rounded text-sm ${
              activeProject?._id === project._id
                ? "bg-black text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {project.name}
          </button>
        ))}
      </div>
    </div>
  );
}
