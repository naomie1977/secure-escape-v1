import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ClipboardList,
  RefreshCw,
  Search,
} from "lucide-react";
import Layout from "../../components/Layout";
import {
  getAuditLogs,
  type AdminAuditLog,
} from "../../services/auditLogService";

function formatEventType(eventType: string) {
  return eventType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function formatEntityType(entityType: string) {
  return entityType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function formatMetadata(metadataJson: string) {
  if (!metadataJson || metadataJson.trim() === "") {
    return "No additional details";
  }

  try {
    const parsed = JSON.parse(metadataJson);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      const entries = Object.entries(parsed);

      if (entries.length === 0) {
        return "No additional details";
      }

      return entries
        .map(([key, value]) => {
          const readableKey = key
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/^./, (character) =>
              character.toUpperCase(),
            );

          if (
            value === null ||
            value === undefined ||
            value === ""
          ) {
            return `${readableKey}: Not available`;
          }

          return `${readableKey}: ${String(value)}`;
        })
        .join(" • ");
    }

    return String(parsed);
  } catch {
    return metadataJson;
  }
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function loadAuditLogs(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load audit logs.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAuditLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return logs;
    }

    return logs.filter((log) => {
      const searchableValues = [
        log.eventType,
        log.actor,
        log.entityType,
        log.entityId,
        log.userName,
        log.adminName,
        log.userSessionId,
        log.metadataJson,
      ];

      return searchableValues.some((value) =>
        value?.toLowerCase().includes(search),
      );
    });
  }, [logs, searchTerm]);

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="dashboard-title">Audit Logs</h1>
          <p className="dashboard-subtitle">
            System activity and administrative audit trail.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAuditLogs(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh Logs"}
        </button>
      </div>

      <div className="dashboard-card overflow-hidden">
        <div className="border-b border-slate-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList
                  size={20}
                  className="text-slate-500"
                />
                <h2 className="section-title">
                  Recent System Events
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Showing the latest recorded security and
                administrative activity.
              </p>
            </div>

            <div className="relative w-full lg:w-80">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search audit logs..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading audit logs...
          </div>
        ) : error ? (
          <div className="p-8">
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="font-semibold text-red-800">
                  Unable to load audit logs
                </p>
                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList
              size={32}
              className="mx-auto mb-3 text-slate-400"
            />

            <p className="font-semibold text-slate-700">
              {searchTerm
                ? "No matching audit logs"
                : "No audit logs recorded"}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {searchTerm
                ? "Try a different search term."
                : "System activity will appear here when audit events are recorded."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Event
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Actor
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Entity
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Details
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Time
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-slate-200 align-top transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {formatEventType(log.eventType)}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {log.eventType}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-700">
                        {log.actor || "System"}
                      </div>

                      {log.adminName && (
                        <div className="mt-1 text-xs text-slate-400">
                          Administrator
                        </div>
                      )}

                      {!log.adminName && log.userName && (
                        <div className="mt-1 text-xs text-slate-400">
                          Customer
                        </div>
                      )}

                      {!log.adminName && !log.userName && (
                        <div className="mt-1 text-xs text-slate-400">
                          Automated system event
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-700">
                        {formatEntityType(log.entityType)}
                      </div>

                      {log.entityId && (
                        <div
                          className="mt-1 max-w-48 truncate text-xs text-slate-400"
                          title={log.entityId}
                        >
                          {log.entityId}
                        </div>
                      )}
                    </td>

                    <td className="max-w-md px-6 py-4">
                      <p
                        className="text-sm leading-6 text-slate-600"
                        title={formatMetadata(
                          log.metadataJson,
                        )}
                      >
                        {formatMetadata(log.metadataJson)}
                      </p>

                      {log.userSessionId && (
                        <p className="mt-2 text-xs text-slate-400">
                          Session: {log.userSessionId}
                        </p>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {new Date(
                        log.createdAt,
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm text-slate-500">
            Showing {filteredLogs.length} of {logs.length}{" "}
            audit {logs.length === 1 ? "event" : "events"}
          </div>
        )}
      </div>
    </Layout>
  );
}