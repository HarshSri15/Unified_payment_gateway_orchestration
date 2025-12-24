import { useEffect, useState } from "react";
import { useOutletContext, Link, useParams } from "react-router-dom";
import api from "@/api/axios";

const shortId = (id) =>
  id ? id.slice(0, 6) + "..." + id.slice(-4) : "-";

export default function ProjectDashboard() {
  const { project } = useOutletContext() || {};
  const { projectId } = useParams();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    const loadStats = async () => {
      try {
        const res = await api.get(`/api/projects/${projectId}/stats`);
        setStats(res.data.data);
      } catch (err) {
        console.error("Failed to load project dashboard", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [projectId]);

  if (!project || loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading project dashboard…
      </div>
    );
  }

  const recentTransactions = stats?.recentTransactions || [];
  const gatewaySummary = stats?.gatewaySummary || [];

  return (
    <div className="space-y-8">
      {/* HEADER */}
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

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard title="Transactions" value={stats.totalTransactions} />
        <StatCard title="Revenue" value={`₹${stats.totalRevenue}`} />
        <StatCard title="Success Rate" value={`${stats.successRate}%`} />
        <StatCard title="Gateways" value={stats.activeGateways} />
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>

        {recentTransactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="py-2 text-left">Txn ID</th>
                <th className="text-left">Gateway</th>
                <th className="text-left">Amount</th>
                <th className="text-left">Status</th>
                <th className="text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx._id} className="border-b last:border-0">
                  <td className="py-2">{shortId(tx.transactionId)}</td>
                  <td className="capitalize">{tx.gateway}</td>
                  <td>₹{tx.amount}</td>
                  <td>{tx.status}</td>
                  <td>{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* GATEWAY SUMMARY */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Gateway Summary</h2>

        {gatewaySummary.length === 0 ? (
          <p className="text-gray-500">No gateway data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b text-gray-500">
              <tr>
                <th className="text-left">Gateway</th>
                <th>Total</th>
                <th>Success</th>
                <th>Failed</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {gatewaySummary.map((g) => (
                <tr key={g._id} className="border-b last:border-0">
                  <td className="capitalize py-2">{g._id}</td>
                  <td>{g.total}</td>
                  <td>{g.success}</td>
                  <td>{g.failed}</td>
                  <td>₹{g.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white border rounded-xl p-5">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
