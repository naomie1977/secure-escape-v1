import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import StatsGrid from "../../components/Dashboard/StatsGrid";
import StatCard from "../../components/Dashboard/StatCard";
import {
  getAdminPlatformStats,
  type AdminPlatformStats,
} from "../../services/adminPlatformService";

function getStatusClasses(status: string) {
  if (status.toLowerCase() === "active") {
    return "bg-green-100 text-green-700";
  }

  if (status.toLowerCase() === "inactive") {
    return "bg-slate-100 text-slate-700";
  }

  return "bg-orange-100 text-orange-700";
}

export default function AdminBanksPage() {
  const [stats, setStats] = useState<AdminPlatformStats | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getAdminPlatformStats();
        setStats(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load bank statistics.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, []);

  return (
    <Layout>
      <h1 className="dashboard-title">Bank Stats</h1>

      <p className="dashboard-subtitle mb-8">
        Monitor Secure Escape bank integrations and duress
        activity across the platform.
      </p>

      {error && (
        <div className="mb-6 border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <StatsGrid>
        <StatCard
          title="Connected Banks"
          value={loading ? "..." : stats?.connectedBanks ?? 0}
        />

        <StatCard
          title="Registered Users"
          value={loading ? "..." : stats?.totalUsers ?? 0}
        />

        <StatCard
          title="Duress Sessions"
          value={
            loading ? "..." : stats?.totalDuressSessions ?? 0
          }
        />

        <StatCard
          title="Active Sessions"
          value={loading ? "..." : stats?.activeSessions ?? 0}
          valueColor="text-orange-600"
        />

        <StatCard
          title="Resolved Cases"
          value={loading ? "..." : stats?.resolvedCases ?? 0}
          valueColor="text-green-600"
        />

        <StatCard
          title="High Risk Events"
          value={loading ? "..." : stats?.highRiskEvents ?? 0}
          valueColor="text-red-600"
        />
      </StatsGrid>

      <div className="dashboard-card dashboard-card-body">
        <div>
          <h2 className="section-title">
            Bank Integration Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Registered banks currently integrated with the Secure
            Escape platform.
          </p>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading bank integrations...
          </div>
        ) : !stats || stats.banks.length === 0 ? (
          <div className="mt-6 border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="font-semibold text-slate-700">
              No bank integrations found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Connected banks will appear here when they are
              registered with Secure Escape.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    Bank
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    Code
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    Users
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    Duress Sessions
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    Active
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    Resolved
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-semibold text-slate-600">
                    High Risk
                  </th>
                </tr>
              </thead>

              <tbody>
                {stats.banks.map((bank) => (
                  <tr
                    key={bank.bankIntegrationId}
                    className="border-t border-slate-200 transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {bank.bankName}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {bank.bankCode}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          bank.status,
                        )}`}
                      >
                        {bank.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {bank.registeredUsers}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {bank.duressSessions}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {bank.activeSessions}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {bank.resolvedCases}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {bank.highRiskEvents}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}