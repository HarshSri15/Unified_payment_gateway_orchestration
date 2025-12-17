import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api";

export default function ProjectDashboard() {
  const { project } = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🛡️ HARD GUARD — prevents destructure crash
  if (!project) {
    return (
      <div className="p-6 text-gray-500">
        Select a project to view its dashboard
      </div>
    );
  }

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const res = await api.get(
          `/api/projects/${project._id}/stats`
        );
        if (mounted) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load project stats", err);
        if (mounted) setStats(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    return () => {
      mounted = false;
    };
  }, [project._id]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading stats…</div>;
  }

  if (!stats) {
    return <div className="p-6 text-red-500">Failed to load stats</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">
        {project.name} — Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Transactions" value={stats.totalTransactions} />
        <StatCard title="Revenue" value={`₹${stats.totalRevenue}`} />
        <StatCard title="Success Rate" value={`${stats.successRate}%`} />
        <StatCard title="Gateways" value={stats.activeGateways} />
      </div>

      <h2 className="text-xl font-medium mb-4">Recent Transactions</h2>

      <div className="space-y-3">
        {stats.recentTransactions.length === 0 && (
          <p className="text-gray-500">No transactions yet</p>
        )}

        {stats.recentTransactions.map((tx) => (
          <div
            key={tx._id}
            className="flex justify-between bg-white p-4 border rounded shadow-sm"
          >
            <span className="text-sm text-gray-600">
              {tx.txnId || tx._id}
            </span>
            <span className="capitalize">{tx.status}</span>
            <span>₹{tx.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm text-center">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
    </div>
  );
}
