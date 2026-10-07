import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import type { DuressSessionDetail } from "../types/session";
import {
  getDuressSessionById,
  freezeSessionAccounts,
  dispatchSessionNotifications,
  claimSession,
  assignSession,
} from "../services/sessionService";

import { getAdminUser } from "../utils/tokenStore";
import type { AdminLoginResponse } from "../types/auth";
import CaseOverview from "../components/Session/CaseOverview";
import InvestigationPanel from "../components/Session/InvestigationPanel";
import CaseManagement from "../components/Session/CaseManagement";
import Timeline from "../components/Session/Timeline";
import EvidencePanel from "../components/Session/EvidencePanel";
import { ADMIN_ROLES } from "../constants/roles";
import { hasPermission } from "../constants/permission";
import CaseReportForm from "../components/Session/CaseReportForm";
import ManagerReviewForm from "../components/Session/ManagerReviewForm";
import CaseStageTracker from "../components/Session/CaseStageTracker";
import IncidentLocationPanel from "../components/Session/IncidentLocationPanel";

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const admin = getAdminUser();

  const [session, setSession] =
    useState<DuressSessionDetail | null>(null);

  const isAssignedToMe =
    session?.assignedAdminUserId === admin?.adminUserId;

  const isUnassigned = !session?.assignedAdminUserId;

  const canViewAnyCaseDetails = hasPermission(
    admin?.adminRole,
    "viewAnyCaseDetails",
  );

  const canViewAssignedCaseDetails =
    hasPermission(
      admin?.adminRole,
      "viewAssignedCaseDetails",
    ) && isAssignedToMe;

  const canViewFullCase =
    canViewAnyCaseDetails || canViewAssignedCaseDetails;

  const canAssignCases = hasPermission(
    admin?.adminRole,
    "assignCases",
  );

  const canFreezeAccounts = hasPermission(
    admin?.adminRole,
    "freezeAccounts",
  );

  const canDispatchNotifications = hasPermission(
    admin?.adminRole,
    "dispatchNotifications",
  );

  const canClaimCases = hasPermission(
    admin?.adminRole,
    "claimCases",
  );

  const isSecureEscapeAdmin =
    admin?.adminRole === ADMIN_ROLES.SecureEscapeAdmin;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [freezingAccounts, setFreezingAccounts] =
    useState(false);

  const [
    dispatchingNotifications,
    setDispatchingNotifications,
  ] = useState(false);

  const [claimingCase, setClaimingCase] =
    useState(false);

  const [assigningCase, setAssigningCase] =
    useState(false);

  const [assignAdminUserId, setAssignAdminUserId] =
    useState("");

  const [assignNotes, setAssignNotes] =
    useState("");

  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      try {
        setLoading(true);

        const data = await getDuressSessionById(id);

        setSession(data);
        setError("");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load session.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id]);

  const handleClaimSession = async () => {
    if (!id) return;

    try {
      setClaimingCase(true);

      const updatedSession = await claimSession(id);

      setSession(updatedSession);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to claim case.",
      );
    } finally {
      setClaimingCase(false);
    }
  };

  const handleAssignSession = async () => {
    if (!id || !assignAdminUserId.trim()) return;

    try {
      setAssigningCase(true);

      const updatedSession = await assignSession(
        id,
        assignAdminUserId.trim(),
        assignNotes.trim(),
      );

      setSession(updatedSession);
      setAssignAdminUserId("");
      setAssignNotes("");
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to assign case.",
      );
    } finally {
      setAssigningCase(false);
    }
  };

  const handleFreezeAccounts = async () => {
    if (!id) return;

    try {
      setFreezingAccounts(true);

      const updatedSession =
        await freezeSessionAccounts(id);

      setSession(updatedSession);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to freeze accounts.",
      );
    } finally {
      setFreezingAccounts(false);
    }
  };

  const handleDispatchNotifications = async () => {
    if (!id) return;

    try {
      setDispatchingNotifications(true);

      const updatedSession =
        await dispatchSessionNotifications(id);

      setSession(updatedSession);
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Failed to dispatch notifications.",
      );
    } finally {
      setDispatchingNotifications(false);
    }
  };

  const handleReturnNavigate = (
    admin: AdminLoginResponse,
  ) => {
    switch (admin.adminRole) {
      case ADMIN_ROLES.FraudAnalyst:
        navigate("/analyst");
        break;

      case ADMIN_ROLES.FraudManager:
        navigate("/manager");
        break;

      case ADMIN_ROLES.SecureEscapeAdmin:
      case ADMIN_ROLES.SystemAdmin:
        navigate("/admin");
        break;

      default:
        navigate("/login");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-400">
          Loading session...
        </div>
      </Layout>
    );
  }

  if (error || !session) {
    return (
      <Layout>
        <div className="p-8 text-center text-red-400">
          {error || "Session not found."}
        </div>
      </Layout>
    );
  }

  const canSubmitCaseReport =
    admin?.adminRole === ADMIN_ROLES.FraudAnalyst &&
    isAssignedToMe &&
    session.caseStatus === "Investigating" &&
    session.managerReviewStatus !== "PendingReview" &&
    session.managerReviewStatus !== "Approved";

  const canManagerReview =
    (admin?.adminRole === ADMIN_ROLES.FraudManager ||
      admin?.adminRole === ADMIN_ROLES.SystemAdmin) &&
    session.managerReviewStatus === "PendingReview";

  const isLiveSession = session.status === "Active";

  const isPostIncidentSession =
    session.status === "Expired" ||
    session.status === "Terminated";

  return (
    <Layout>
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() =>
            admin && handleReturnNavigate(admin)
          }
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#1769AA]"
        >
          ← Back to Dashboard
        </button>

        {isUnassigned && canClaimCases && (
          <section className="mb-6 overflow-hidden border-2 border-[#1769AA] bg-white shadow-sm">
            <div className="flex flex-col gap-4 bg-gradient-to-r from-[#EAF4FB] via-white to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#1769AA] text-lg font-bold text-white">
                  !
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1769AA]">
                      Analyst action required
                    </p>

                    <span className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-700">
                      Unassigned
                    </span>
                  </div>

                  <h2 className="mt-1 text-lg font-bold text-[#102A43]">
                    This case is available to claim
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                    Claim this investigation to become the
                    assigned fraud analyst and begin the full
                    investigation workflow.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClaimSession}
                disabled={claimingCase}
                className="shrink-0 border border-[#1769AA] bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12558A] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {claimingCase
                  ? "Claiming case..."
                  : "Claim Case"}
              </button>
            </div>
          </section>
        )}

        <CaseOverview
          session={session}
          assignedToMe={isAssignedToMe}
        />

        <div className="mt-6">
          <CaseStageTracker session={session} />
        </div>

        {!isUnassigned &&
          canViewFullCase &&
          !isSecureEscapeAdmin && (
            <div className="mt-6">
              <IncidentLocationPanel
                session={session}
              />
            </div>
          )}

        <div className="mt-6">
          {isUnassigned && (
            <section className="dashboard-panel overflow-hidden">
              <div className="dashboard-panel-header">
                <div>
                  <p className="eyebrow">
                    Case assignment
                  </p>

                  <h2 className="panel-heading">
                    Unclaimed investigation
                  </h2>

                  <p className="panel-description">
                    This case has not yet been assigned to a
                    fraud analyst.
                  </p>
                </div>

                <span className="border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
                  Unassigned
                </span>
              </div>

              <div className="p-5">
                <div className="border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Analyst attention required
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    {canClaimCases
                      ? "Use the Claim Case action at the top of this page to take ownership of this investigation."
                      : "This case must be assigned before the investigation workflow can begin."}
                  </p>
                </div>

                {canAssignCases && (
                  <div className="mt-6 border-t border-[#E5EDF3] pt-5">
                    <div>
                      <p className="text-sm font-semibold text-[#102A43]">
                        Assign analyst
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Assign this investigation to a specific
                        fraud analyst and optionally include
                        assignment notes.
                      </p>
                    </div>

                    <input
                      type="text"
                      value={assignAdminUserId}
                      onChange={(e) =>
                        setAssignAdminUserId(
                          e.target.value,
                        )
                      }
                      placeholder="Analyst admin user ID"
                      className="mt-4 w-full border border-[#CBD9E3] bg-white px-4 py-3 text-sm text-[#102A43] outline-none transition placeholder:text-slate-400 focus:border-[#1769AA] focus:ring-2 focus:ring-[#1769AA]/10"
                    />

                    <textarea
                      value={assignNotes}
                      onChange={(e) =>
                        setAssignNotes(
                          e.target.value,
                        )
                      }
                      placeholder="Assignment notes..."
                      rows={3}
                      className="mt-3 w-full resize-none border border-[#CBD9E3] bg-white px-4 py-3 text-sm leading-6 text-[#102A43] outline-none transition placeholder:text-slate-400 focus:border-[#1769AA] focus:ring-2 focus:ring-[#1769AA]/10"
                    />

                    <button
                      onClick={handleAssignSession}
                      disabled={
                        assigningCase ||
                        !assignAdminUserId.trim()
                      }
                      className="mt-4 w-full border border-[#1769AA] bg-[#1769AA] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12558A] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      {assigningCase
                        ? "Assigning case..."
                        : "Assign case"}
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {!isUnassigned &&
            !canViewFullCase && (
              <section className="dashboard-panel overflow-hidden">
                <div className="dashboard-panel-header">
                  <div>
                    <p className="eyebrow">
                      Case ownership
                    </p>

                    <h2 className="panel-heading">
                      Investigation in progress
                    </h2>

                    <p className="panel-description">
                      This case is currently being handled by
                      another fraud analyst.
                    </p>
                  </div>

                  <span className="panel-count">
                    Assigned
                  </span>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="border border-[#E1EAF1] bg-[#FBFDFE] px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Assigned to
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#102A43]">
                        {session.assignedAdminName ||
                          "Assigned analyst"}
                      </p>
                    </div>

                    <div className="border border-[#E1EAF1] bg-[#FBFDFE] px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Assigned at
                      </p>

                      <p className="mt-2 text-sm font-semibold text-[#102A43]">
                        {session.assignedAt
                          ? new Date(
                              session.assignedAt,
                            ).toLocaleString(
                              "en-ZA",
                            )
                          : "Not recorded"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border border-[#DCE6EE] bg-[#F8FBFD] px-4 py-3">
                    <p className="text-xs leading-5 text-slate-500">
                      Full investigation details are restricted
                      to the assigned analyst and authorised
                      supervisory roles.
                    </p>
                  </div>
                </div>
              </section>
            )}

          {!isUnassigned &&
            canViewFullCase &&
            !isSecureEscapeAdmin && (
              <>
                {isLiveSession && (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    <div className="space-y-6 xl:col-span-8">
                      <EvidencePanel
                        session={session}
                      />

                      <InvestigationPanel
                        session={session}
                      />

                      <Timeline
                        session={session}
                      />
                    </div>

                    <div className="space-y-6 xl:col-span-4">
                      <div className="dashboard-panel overflow-hidden">
                        <div className="border-b border-red-100 bg-gradient-to-r from-red-50 to-white px-5 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-red-200 bg-white">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                                </span>
                              </div>

                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-red-500">
                                  Active incident
                                </p>

                                <h2 className="mt-0.5 text-base font-semibold text-[#102A43]">
                                  Live duress response
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  This customer session is
                                  still active and requires
                                  ongoing analyst attention.
                                </p>
                              </div>
                            </div>

                            <span className="shrink-0 border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-red-700">
                              Live
                            </span>
                          </div>
                        </div>

                        <div className="px-5 py-4">
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                            Response priorities
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="border border-[#E1EAF1] bg-[#FBFDFE] px-3 py-2.5">
                              <p className="text-xs font-semibold text-[#102A43]">
                                Monitor location
                              </p>
                            </div>

                            <div className="border border-[#E1EAF1] bg-[#FBFDFE] px-3 py-2.5">
                              <p className="text-xs font-semibold text-[#102A43]">
                                Review alerts
                              </p>
                            </div>

                            <div className="border border-[#E1EAF1] bg-[#FBFDFE] px-3 py-2.5">
                              <p className="text-xs font-semibold text-[#102A43]">
                                Check notifications
                              </p>
                            </div>

                            <div className="border border-[#E1EAF1] bg-[#FBFDFE] px-3 py-2.5">
                              <p className="text-xs font-semibold text-[#102A43]">
                                Protect accounts
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <CaseManagement
                        session={session}
                        freezingAccounts={
                          freezingAccounts
                        }
                        handleFreezeAccounts={
                          handleFreezeAccounts
                        }
                        dispatchingNotifications={
                          dispatchingNotifications
                        }
                        handleDispatchNotifications={
                          handleDispatchNotifications
                        }
                        canFreezeAccounts={
                          canFreezeAccounts
                        }
                        canDispatchNotifications={
                          canDispatchNotifications
                        }
                      />

                      {canSubmitCaseReport && (
                        <CaseReportForm
                          session={session}
                          onSubmitted={setSession}
                        />
                      )}
                    </div>
                  </div>
                )}

                {isPostIncidentSession && (
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                    <div className="space-y-6 xl:col-span-8">
                      <InvestigationPanel
                        session={session}
                      />

                      <EvidencePanel
                        session={session}
                      />

                      <Timeline
                        session={session}
                      />
                    </div>

                    <div className="space-y-6 xl:col-span-4">
                      {canSubmitCaseReport && (
                        <CaseReportForm
                          session={session}
                          onSubmitted={setSession}
                        />
                      )}

                      {canManagerReview && (
                        <ManagerReviewForm
                          session={session}
                          onReviewed={setSession}
                        />
                      )}

                      {session.managerReviewStatus ===
                        "Approved" && (
                        <section className="dashboard-panel overflow-hidden">
                          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-600">
                                  Review complete
                                </p>

                                <h2 className="mt-0.5 text-base font-semibold text-[#102A43]">
                                  Case resolved
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  The manager approved the
                                  analyst report and the case
                                  has been formally closed.
                                </p>
                              </div>

                              <span className="shrink-0 border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                                Resolved
                              </span>
                            </div>
                          </div>

                          <div className="space-y-4 p-5">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                Resolution
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#102A43]">
                                {session.resolutionSummary ||
                                  "No resolution summary was recorded."}
                              </p>
                            </div>

                            {session.managerReviewedAt && (
                              <div className="border-t border-[#E5EDF3] pt-4">
                                <p className="text-xs text-slate-500">
                                  Approved{" "}
                                  {new Date(
                                    session.managerReviewedAt,
                                  ).toLocaleString(
                                    "en-ZA",
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </Layout>
  );
}