import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import type { DuressSessionSummary } from "../../types/session";
import { getDuressSessions } from "../../services/sessionService";
import WelcomeBanner from "../../components/Analyst/WelcomeBanner";
import CaseStats from "../../components/Analyst/CaseStats";
import { getAdminUser } from "../../utils/tokenStore";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  MapPinned,
  ShieldAlert,
  Target,
} from "lucide-react";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

type OperationsSection = {
  path: string;
  label: string;
  description: string;
  icon: typeof Activity;
  badgeType?: "live" | "monitoring" | "priority";
};

const operationsSections: OperationsSection[] = [
  {
    path: "/analyst/activity-intelligence",
    label: "Activity Intelligence",
    description: "Incident volume and activity trends",
    icon: Activity,
  },
  {
    path: "/analyst/geographic-intelligence",
    label: "Geographic Intelligence",
    description: "Risk distribution across monitored areas",
    icon: MapPinned,
  },
  {
    path: "/analyst/immediate-attention",
    label: "Immediate Attention",
    description: "Live incidents requiring action",
    icon: ShieldAlert,
    badgeType: "live",
  },
  {
    path: "/analyst/operational-performance",
    label: "Operational Performance",
    description: "Response and resolution performance",
    icon: BarChart3,
  },
  {
    path: "/analyst/case-monitoring",
    label: "Case Monitoring",
    description: "Priority investigations and case status",
    icon: BriefcaseBusiness,
    badgeType: "monitoring",
  },
  {
    path: "/analyst/priority-cases",
    label: "Priority Cases",
    description: "Highest-priority cases requiring review",
    icon: Target,
    badgeType: "priority",
  },
];

export default function AnalystDashboard() {
  const navigate = useNavigate();
  const admin = getAdminUser();

  const [sessions, setSessions] = useState<
    DuressSessionSummary[]
  >([]);
  const [period, setPeriod] = useState("30");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await getDuressSessions();

        setSessions(data);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load sessions.",
        );
      }
    };

    fetchSessions();
  }, []);

  const operationalCases = sessions.filter(
    (session) =>
      session.caseStatus === "Open" ||
      session.caseStatus === "Investigating",
  );

  const liveSessions = sessions.filter(
    (session) => session.status === "Active",
  );

  const criticalCases = operationalCases.filter(
    (session) =>
      session.highestSeverity === "High" ||
      session.highestSeverity === "Critical",
  );

  const assignedToMe = operationalCases.filter(
    (session) =>
      session.assignedAdminUserId ===
      admin?.adminUserId,
  );

  const unassignedCases = operationalCases.filter(
    (session) => !session.assignedAdminUserId,
  );

  const priorityAssignedToMe = criticalCases.filter(
    (session) =>
      session.assignedAdminUserId ===
      admin?.adminUserId,
  );

  const priorityUnassigned = criticalCases.filter(
    (session) => !session.assignedAdminUserId,
  );

  const today = startOfToday();

  const resolvedToday = sessions.filter((session) => {
    if (
      session.caseStatus !== "Resolved" ||
      !session.managerReviewedAt
    ) {
      return false;
    }

    return new Date(session.managerReviewedAt) >= today;
  }).length;

  const getBadgeCount = (
    badgeType?: OperationsSection["badgeType"],
  ) => {
    switch (badgeType) {
      case "live":
        return liveSessions.length;

      case "monitoring":
        return operationalCases.length;

      case "priority":
        return criticalCases.length;

      default:
        return null;
    }
  };

  const getBadgeStyle = (
    badgeType?: OperationsSection["badgeType"],
  ) => {
    switch (badgeType) {
      case "live":
        return "border-red-200 bg-red-50 text-red-700";

      case "priority":
        return "border-amber-200 bg-amber-50 text-amber-700";

      case "monitoring":
        return "border-[#B9D7EA] bg-[#EAF4FB] text-[#1769AA]";

      default:
        return "";
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-[1440px]">
        <WelcomeBanner
          fullName={admin?.fullName}
          period={period}
          onPeriodChange={setPeriod}
        />

        {error && (
          <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <CaseStats
            activeCases={liveSessions.length}
            criticalCases={criticalCases.length}
            assignedCases={assignedToMe.length}
            unassignedCases={unassignedCases.length}
            resolvedToday={resolvedToday}
          />

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="eyebrow">
                  Fraud operations center
                </p>

                <h2 className="panel-heading">
                  Investigation intelligence
                </h2>

                <p className="panel-description">
                  Select an operational area to monitor and
                  investigate fraud activity.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-px bg-[#DCE6EE] sm:grid-cols-2 xl:grid-cols-3">
              {operationsSections.map((section) => {
                const Icon = section.icon;
                const badgeCount = getBadgeCount(
                  section.badgeType,
                );

                return (
                  <button
                    key={section.path}
                    type="button"
                    onClick={() =>
                      navigate(section.path)
                    }
                    className="group relative bg-white px-5 py-5 text-left transition duration-200 hover:bg-[#F4F8FB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#1769AA]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="relative">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#EAF4FB] text-[#1769AA] transition duration-200 group-hover:bg-[#1769AA] group-hover:text-white">
                          <Icon
                            size={19}
                            strokeWidth={1.8}
                          />
                        </div>

                        {badgeCount !== null &&
                          badgeCount > 0 && (
                            <span
                              className={`absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border px-1.5 text-[10px] font-bold shadow-sm ${getBadgeStyle(
                                section.badgeType,
                              )}`}
                            >
                              {badgeCount > 99
                                ? "99+"
                                : badgeCount}
                            </span>
                          )}
                      </div>

                      <span className="text-xs font-semibold text-[#1769AA] opacity-0 transition duration-200 group-hover:opacity-100">
                        View
                      </span>
                    </div>

                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#102A43]">
                          {section.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {section.description}
                        </p>
                      </div>

                      {badgeCount !== null && (
                        <span
                          className={`shrink-0 border px-2 py-1 text-[10px] font-bold ${getBadgeStyle(
                            section.badgeType,
                          )}`}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </div>

                    {section.badgeType ===
                      "monitoring" && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E5EDF3] pt-3">
                        <span className="bg-[#F4F8FB] px-2 py-1 text-[10px] font-semibold text-slate-600">
                          {assignedToMe.length} Mine
                        </span>

                        <span className="bg-[#FFF8E7] px-2 py-1 text-[10px] font-semibold text-amber-700">
                          {unassignedCases.length} Unassigned
                        </span>
                      </div>
                    )}

                    {section.badgeType ===
                      "priority" && (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E5EDF3] pt-3">
                        <span className="bg-[#F4F8FB] px-2 py-1 text-[10px] font-semibold text-slate-600">
                          {priorityAssignedToMe.length} Mine
                        </span>

                        <span className="bg-[#FFF8E7] px-2 py-1 text-[10px] font-semibold text-amber-700">
                          {priorityUnassigned.length} Unassigned
                        </span>
                      </div>
                    )}

                    {section.badgeType === "live" && (
                      <div className="mt-4 border-t border-[#E5EDF3] pt-3">
                        <span className="inline-flex items-center gap-1.5 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">
                          {liveSessions.length > 0 && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
                            </span>
                          )}

                          {liveSessions.length} Live
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}