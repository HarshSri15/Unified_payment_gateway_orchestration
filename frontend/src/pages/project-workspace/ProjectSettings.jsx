import { useOutletContext } from "react-router-dom";

export default function ProjectSettings() {
  const { project } = useOutletContext() || {};

  if (!project) {
    return (
      <div className="text-gray-400 text-center py-10">
        Loading project settings…
      </div>
    );
  }

  const gateways = project.gatewayConfigs || {};
  const callbacks = project.callbacks || {};
  const gstInfo = project.settings?.gstInfo;

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Project Settings</h1>

      {/* BASIC INFO */}
      <Section title="Basic Information">
        <Item label="Project Name" value={project.name} />
        <Item label="Environment" value={project.environment} />
      </Section>

      {/* GATEWAYS */}
      <Section title="Enabled Gateways">
        {Object.keys(gateways).length === 0 ? (
          <p className="text-gray-500">No gateways enabled.</p>
        ) : (
          Object.keys(gateways).map((g) => (
            <Item key={g} label={g.toUpperCase()} value="Enabled" />
          ))
        )}
      </Section>

      {/* CALLBACKS */}
      <Section title="Callback URLs">
        <Item label="Success URL" value={callbacks.successUrl || "-"} />
        <Item label="Failure URL" value={callbacks.failureUrl || "-"} />
        <Item label="Webhook URL" value={callbacks.webhookUrl || "-"} />
      </Section>

      {/* GST */}
      <Section title="GST / Tax Information">
        {gstInfo ? (
          <>
            <Item label="GST Number" value={gstInfo.gstNumber} />
            <Item label="Business Name" value={gstInfo.businessName} />
          </>
        ) : (
          <p className="text-gray-500">No GST information configured.</p>
        )}
      </Section>
    </div>
  );
}

/* ----------------- Helpers ----------------- */
function Section({ title, children }) {
  return (
    <div className="bg-white border rounded-xl p-6 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Item({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
