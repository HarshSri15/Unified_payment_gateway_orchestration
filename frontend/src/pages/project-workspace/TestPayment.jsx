import { useOutletContext } from "react-router-dom";

export default function ProjectTestPayment() {
  const { project } = useOutletContext();

  if (!project) {
    return <div className="text-gray-400">No project selected</div>;
  }

  const gateways = Object.entries(project.gatewayConfigs || {})
    .filter(([, g]) => g.enabled)
    .map(([key]) => key);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">
        Test Payment — {project.name}
      </h1>

      {gateways.length === 0 ? (
        <p className="text-gray-500">No gateways enabled</p>
      ) : (
        <ul className="space-y-2">
          {gateways.map((g) => (
            <li
              key={g}
              className="bg-white p-4 rounded shadow flex justify-between"
            >
              <span className="capitalize">{g}</span>
              <button className="px-4 py-1 bg-black text-white rounded">
                Test
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
