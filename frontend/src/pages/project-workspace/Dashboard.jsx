import { useOutletContext } from "react-router-dom";

export default function ProjectDashboard() {
  const { project } = useOutletContext() || {};

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading project…
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">
        {project.name}
      </h1>
      <p className="text-gray-500 mb-6">
        Monitor your payment activity
      </p>

      {/* You can re-add stats later */}
    </div>
  );
}
