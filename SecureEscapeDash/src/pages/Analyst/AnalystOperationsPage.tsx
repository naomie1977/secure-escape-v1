import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Layout from "../../components/Layout";
import IncidentTrendChart from "../../components/Analyst/IncidentTrendChart";
import RiskMap from "../../components/Analyst/RiskMap";
import LiveAlertQueue from "../../components/Analyst/LiveAlertQueue";
import ResponsePerformance from "../../components/Analyst/ResponsePerformance";
import CaseTable from "../../components/Dashboard/CaseTable";

import type { DuressSessionSummary } from "../../types/session";
import { getDuressSessions } from "../../services/sessionService";

type OperationsSection =
  | "activity"
  | "geographic"
  | "attention"
  | "performance"
  | "monitoring"
  | "priority";

type Props = {
  section: OperationsSection;
};

const sectionDetails: Record<
  OperationsSection,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  activity: {
    eyebrow: "Activity intelligence",
    title: "Duress incident activity",
    description:
      "Incident volume across the selected reporting period.",
  },
  geographic: {
    eyebrow: "Geographic intelligence",
    title: "Area risk overview",
    description:
      "Security risk distribution across monitored areas.",
  },
  attention: {
    eyebrow: "Immediate attention",
    title: "Live investigation queue",
    description:
      "New active duress incidents waiting for analyst attention.",
  },
  performance: {
    eyebrow: "Operational performance",
    title: "Response & resolution",
    description:
      "Analyst response and case resolution performance.",
  },
  monitoring: {
    eyebrow: "Case monitoring",
    title: "Case monitoring",
    description:
      "Cases currently requiring analyst monitoring and action.",
  },
  priority: {
    eyebrow: "Priority cases",
    title: "Priority cases",
    description:
      "High-priority duress investigations requiring analyst review.",
  },
};

export default function AnalystOperationsPage({
  section,
}: Props) {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<
    DuressSessionSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);

        const data = await getDuressSessions();

        setSessions(data);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load sessions.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    if (period === "all") {
      return sessions;
    }

    const days = Number(period);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return sessions.filter(
      (session) =>
        new Date(session.startedAt) >= cutoff,
    );
  }, [period, sessions]);

  const operationalCases = filteredSessions.filter(
    (session) =>
      session.caseStatus === "Open" ||
      session.caseStatus === "Investigating",
  );

  const investigationQueue = sessions.filter(
    (session) =>
      session.status === "Active" &&
      session.caseStatus === "Open" &&
      !session.assignedAdminUserId,
  );

  const criticalCases = operationalCases.filter(
    (session) =>
      session.highestSeverity === "High" ||
      session.highestSeverity === "Critical",
  );

  const details = sectionDetails[section];

  const renderSection = () => {
    switch (section) {
      case "activity":
        return (
          <IncidentTrendChart
            sessions={filteredSessions}
            period={period}
          />
        );

      case "geographic":
        return <RiskMap />;

      case "attention":
        return (
          <LiveAlertQueue
            sessions={investigationQueue}
          />
        );

      case "performance":
        return (
          <ResponsePerformance
            sessions={filteredSessions}
          />
        );

      case "monitoring":
        return (
          <CaseTable
            sessions={operationalCases.slice(0, 20)}
            loading={loading}
            error={error}
          />
        );

      case "priority":
        return (
          <CaseTable
            sessions={criticalCases.slice(0, 20)}
            loading={loading}
            error={error}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#52708B]">
              Fraud Operations Center
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[#16324F]">
              {details.title}
            </h1>

            <p className="mt-1 text-sm text-[#60788D]">
              {details.description}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/analyst")}
            className="inline-flex items-center justify-center gap-2 border border-[#C8D7E3] bg-white px-4 py-2.5 text-sm font-medium text-[#29465D] shadow-sm transition hover:bg-[#F4F8FB]"
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>
        </div>

        {section === "activity" && (
          <div className="mb-5 flex justify-end">
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value)
              }
              className="border border-[#C8D7E3] bg-white px-3 py-2 text-sm text-[#29465D] outline-none focus:border-[#52708B]"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        )}

        {error &&
          section !== "monitoring" &&
          section !== "priority" && (
            <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

        {renderSection()}
      </div>
    </Layout>
  );
}