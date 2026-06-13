import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import SeverityBadge from "../components/SeverityBadge";
import StatusBadge from "../components/StatusBadge";
import { getAlertById } from "../services/alertService";
import type { AlertDetail } from "../types/alert";

export default function AlertDetailPage() {
  const { alertId } = useParams();
  const navigate = useNavigate();

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const riskSectionRef = useRef<HTMLDivElement | null>(null);
  const locationSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchAlert = async () => {
      if (!alertId) return;

      try {
        setLoading(true);
        const data = await getAlertById(alertId);
        setAlert(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load alert.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlert();
  }, [alertId]);

  const scrollToSection = (section: "risk" | "location") => {
    const ref = section === "risk" ? riskSectionRef : locationSectionRef;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-400">Loading alert details...</div>
      </Layout>
    );
  }

  if (error || !alert) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-indigo-400 hover:text-indigo-300 mb-6"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-red-400">
            {error || "Alert not found."}
          </div>
        </div>
      </Layout>
    );
  }

  const detailRows = [
    ["Alert ID", alert.id],
    ["User ID", alert.userId],
    ["Session ID", alert.userSessionId],
    ["Type", alert.type],
    ["Severity", alert.severity],
    ["Status", alert.status],
    ["Description", alert.description],
    ["Created At", new Date(alert.createdAt).toLocaleString()],
    ["Resolved At", alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : "Not resolved"],
    ["Session Mode", alert.sessionMode],
    ["Session Status", alert.sessionStatus],
    ["IP Address", alert.ipAddress],
    ["Device Info", alert.deviceInfo],
    ["Session Started At", new Date(alert.sessionStartedAt).toLocaleString()],
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-indigo-400 hover:text-indigo-300 mb-6"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-wide">
            Alert Investigation Workspace
          </p>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Alert #{alert.id.slice(0, 8)}
              </h1>
              <p className="text-gray-400 text-sm mt-2">
                {alert.type} · Created {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-sm">Alert Information</p>
            <h2 className="text-white font-bold mt-2">{alert.type}</h2>
            <p className="text-xs text-gray-500 mt-2">ID: {alert.id}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-sm">Customer</p>
            <h2 className="text-white font-bold mt-2">{alert.customerName}</h2>
            <p className="text-xs text-gray-500 mt-2">{alert.customerEmail}</p>
            <p className="text-xs text-gray-500">{alert.customerPhoneNumber}</p>
          </div>

          <button
            onClick={() => scrollToSection("risk")}
            className="text-left bg-gray-900 border border-red-900/40 rounded-2xl p-5 hover:border-red-500 transition"
          >
            <p className="text-gray-400 text-sm">Risk Score</p>
            <h2 className="text-4xl font-bold text-red-400 mt-2">92 / 100</h2>
            <p className="text-xs text-gray-500 mt-2">Assessment: High Risk</p>
          </button>

          <button
            onClick={() => scrollToSection("location")}
            className="text-left bg-gray-900 border border-yellow-900/40 rounded-2xl p-5 hover:border-yellow-500 transition"
          >
            <p className="text-gray-400 text-sm">Location Confidence</p>
            <h2 className="text-4xl font-bold text-yellow-400 mt-2">18%</h2>
            <p className="text-xs text-gray-500 mt-2">Location anomaly detected</p>
          </button>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-gray-400 text-sm">Notifications</p>
            <h2 className="text-3xl font-bold text-white mt-2">3 Sent</h2>
            <p className="text-xs text-red-400 mt-2">1 Failure</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Analyst Actions</h2>

          <div className="flex flex-wrap gap-3">
            {[
              "Assign",
              "Mark Investigating",
              "Resolve Alert",
              "Mark False Alarm",
              "Freeze Account",
              "Call Authorities",
              "Contact Emergency Contact",
            ].map((action) => (
              <button
                key={action}
                className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-indigo-600 hover:text-white transition text-sm"
              >
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Contact Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Customer Contact Details</h2>
            <p className="text-sm text-gray-400">Name</p>
            <p className="text-white mb-3">{alert.customerName}</p>

            <p className="text-sm text-gray-400">Email</p>
            <p className="text-white mb-3">{alert.customerEmail}</p>

            <p className="text-sm text-gray-400">Phone</p>
            <p className="text-white">{alert.customerPhoneNumber}</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Emergency Contact</h2>
            <p className="text-sm text-gray-400">Name</p>
            <p className="text-white mb-3">Thandi Nkosi</p>

            <p className="text-sm text-gray-400">Relationship</p>
            <p className="text-white mb-3">Mother</p>

            <p className="text-sm text-gray-400">Phone</p>
            <p className="text-white">082 555 0198</p>
          </div>
        </div>

        {/* Alert Information */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-5">Alert Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detailRows.map(([label, value]) => (
              <div key={label} className="border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase">{label}</p>
                <p className="text-sm text-gray-200 mt-1 break-all">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Location Analysis */}
        <div
          ref={locationSectionRef}
          className="bg-gray-900 border border-yellow-900/40 rounded-2xl p-6 mb-8 scroll-mt-6"
        >
          <h2 className="text-xl font-bold text-white">Location Intelligence Analysis</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase">Current Location</p>
              <p className="text-white mt-1">Sandton, Johannesburg</p>
            </div>

            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase">Confidence Score</p>
              <p className="text-yellow-400 text-2xl font-bold mt-1">18%</p>
            </div>

            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase">Assessment</p>
              <p className="text-white mt-1">Location anomaly detected</p>
            </div>
          </div>

          <p className="text-gray-300 mt-5">
            Current location appears outside the customer's normal travel pattern.
          </p>

          <ul className="list-disc list-inside text-gray-400 text-sm mt-4 space-y-2">
            <li>Login occurred outside a frequently visited area.</li>
            <li>Location has not been seen in previous sessions.</li>
            <li>Distance from normal route: 34 km.</li>
            <li>Login occurred from a location not associated with typical movement patterns.</li>
          </ul>

          <div className="mt-5 bg-yellow-500/10 border border-yellow-700/40 rounded-xl p-4">
            <p className="text-yellow-300 text-sm font-semibold">Recommendation</p>
            <p className="text-gray-300 text-sm mt-1">Flag for further investigation.</p>
          </div>
        </div>

        {/* Risk Analysis */}
        <div
          ref={riskSectionRef}
          className="bg-gray-900 border border-red-900/40 rounded-2xl p-6 mb-8 scroll-mt-6"
        >
          <h2 className="text-xl font-bold text-white">Risk Evaluation Report</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase">Overall Score</p>
              <p className="text-red-400 text-3xl font-bold mt-1">92 / 100</p>
            </div>

            <div className="border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase">Risk Level</p>
              <p className="text-white text-2xl font-bold mt-1">High</p>
            </div>
          </div>

          <ul className="list-disc list-inside text-gray-400 text-sm mt-5 space-y-2">
            <li>Duress PIN matched.</li>
            <li>Login occurred at an unusual time.</li>
            <li>Location anomaly detected.</li>
            <li>Multiple risk indicators triggered simultaneously.</li>
          </ul>

          <div className="mt-5 bg-red-500/10 border border-red-700/40 rounded-xl p-4">
            <p className="text-red-300 text-sm font-semibold">Recommendation</p>
            <p className="text-gray-300 text-sm mt-1">Immediate investigation recommended.</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-5">Session Timeline</h2>

          <div className="space-y-5 border-l border-gray-700 pl-6">
            {[
              ["18:01", "Duress PIN matched"],
              ["18:01", "New Beneficiary / Send Cash request created"],
              ["18:02", "Location Captured: [-26.1076, 28.0567]"],
              ["18:03", "Transaction: TXN-000123 · Transfer · R5,000"],
              ["18:03", "Beneficiary: John Smith · 003327982"],
              ["18:05", "Location Captured: [-26.1084, 28.0611]"],
            ].map(([time, text]) => (
              <div key={`${time}-${text}`} className="relative">
                <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-indigo-500" />
                <p className="text-xs text-indigo-400 font-semibold">{time}</p>
                <p className="text-sm text-gray-300 mt-1">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}