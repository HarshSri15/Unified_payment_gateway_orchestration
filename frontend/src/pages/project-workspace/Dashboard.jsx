import { useOutletContext, Link } from "react-router-dom";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-gray-500">Project dashboard</p>
        </div>

        <Link
          to={`/projects/${project._id}/test-payment`}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-900"
        >
          Test Payment
        </Link>
      </div>

      <div className="bg-white border rounded-lg p-6 text-gray-500">
        Stats will appear here next.
      </div>
    </div>
  );
}
