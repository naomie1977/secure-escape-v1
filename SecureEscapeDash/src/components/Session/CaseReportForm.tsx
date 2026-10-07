import { useState } from "react";
import {
  AlertCircle,
  Check,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Pencil,
  Send,
  Sparkles,
} from "lucide-react";

import type { DuressSessionDetail } from "../../types/session";
import { submitCaseReport } from "../../services/sessionService";

interface CaseReportFormProps {
  session: DuressSessionDetail;
  onSubmitted: (updated: DuressSessionDetail) => void;
}

export default function CaseReportForm({
  session,
  onSubmitted,
}: CaseReportFormProps) {
  const [investigationSummary, setInvestigationSummary] =
    useState(session.investigationSummary || "");

  const [resolutionSummary, setResolutionSummary] =
    useState(session.resolutionSummary || "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const buildCaseAnalysis = () => {
    const flaggedTransactions = session.transactions.filter(
      (transaction) => transaction.flagged,
    );

    const highRiskTransactions = session.transactions.filter(
      (transaction) => {
        const riskLevel =
          transaction.riskLevel?.toLowerCase() || "";

        return (
          riskLevel === "high" ||
          riskLevel === "critical"
        );
      },
    );

    const totalTransactionValue =
      session.transactions.reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0,
      );

    const flaggedTransactionValue =
      flaggedTransactions.reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0,
      );

    const alertTypes = Array.from(
      new Set(
        session.alerts
          .map((alert) => alert.type)
          .filter(Boolean),
      ),
    );

    const latestLocation = [...session.locations].sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() -
        new Date(a.capturedAt).getTime(),
    )[0];

    return {
      flaggedTransactions,
      highRiskTransactions,
      totalTransactionValue,
      flaggedTransactionValue,
      alertTypes,
      latestLocation,
    };
  };

  const caseAnalysis = buildCaseAnalysis();

  const generateRecommendedInvestigationSummary = () => {
    const findings: string[] = [];

    findings.push(
      `The duress session for ${session.customerName} was reviewed as a ${
        session.highestSeverity || "recorded"
      } severity incident.`,
    );

    if (session.alertCount > 0) {
      findings.push(
        `${session.alertCount} ${
          session.alertCount === 1
            ? "alert was"
            : "alerts were"
        } recorded during the session${
          caseAnalysis.alertTypes.length > 0
            ? `, including ${caseAnalysis.alertTypes.join(
                ", ",
              )}`
            : ""
        }.`,
      );
    } else {
      findings.push(
        "No alert records were captured during the session.",
      );
    }

    if (session.transactions.length > 0) {
      findings.push(
        `${session.transactions.length} ${
          session.transactions.length === 1
            ? "transaction was"
            : "transactions were"
        } recorded with a combined value of R${caseAnalysis.totalTransactionValue.toLocaleString(
          "en-ZA",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )}.`,
      );

      if (caseAnalysis.flaggedTransactions.length > 0) {
        findings.push(
          `${caseAnalysis.flaggedTransactions.length} ${
            caseAnalysis.flaggedTransactions.length === 1
              ? "transaction was"
              : "transactions were"
          } flagged for review, representing R${caseAnalysis.flaggedTransactionValue.toLocaleString(
            "en-ZA",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}.`,
        );
      }

      if (caseAnalysis.highRiskTransactions.length > 0) {
        findings.push(
          `${caseAnalysis.highRiskTransactions.length} ${
            caseAnalysis.highRiskTransactions.length === 1
              ? "transaction carries"
              : "transactions carry"
          } a high or critical risk classification and should receive particular attention during the investigation.`,
        );
      }
    } else {
      findings.push(
        "No financial transactions were recorded during the duress session.",
      );
    }

    if (session.locations.length > 0) {
      findings.push(
        `${session.locations.length} GPS ${
          session.locations.length === 1
            ? "location was"
            : "locations were"
        } captured as supporting incident evidence${
          caseAnalysis.latestLocation
            ? `, with the most recent position recorded on ${new Date(
                caseAnalysis.latestLocation.capturedAt,
              ).toLocaleString("en-ZA")}`
            : ""
        }.`,
      );
    } else {
      findings.push(
        "No GPS location evidence was captured for this incident.",
      );
    }

    if (session.accountsFrozen) {
      findings.push(
        "The customer's affected account access has been frozen as a protective measure.",
      );
    } else {
      findings.push(
        "The case record does not currently indicate that the customer's accounts have been frozen.",
      );
    }

    if (session.notificationAttemptCount > 0) {
      findings.push(
        `${session.notificationAttemptCount} notification ${
          session.notificationAttemptCount === 1
            ? "attempt was"
            : "attempts were"
        } recorded during the incident response process.`,
      );
    }

    if (session.assignedAdminName) {
      findings.push(
        `The case is assigned to ${session.assignedAdminName} for investigation.`,
      );
    }

    if (
      caseAnalysis.flaggedTransactions.length > 0 ||
      caseAnalysis.highRiskTransactions.length > 0
    ) {
      findings.push(
        "The flagged and high-risk financial activity should be verified against the beneficiary details, transaction references, captured location evidence and other incident records.",
      );
    } else if (session.transactions.length > 0) {
      findings.push(
        "The recorded transactions should be verified against the beneficiary information, location evidence, alerts and other incident records before the case is concluded.",
      );
    } else {
      findings.push(
        "The available alerts, location records, account status and incident evidence should be reviewed together before the case is concluded.",
      );
    }

    return findings.join(" ");
  };

  const generateRecommendedResolution = () => {
    const recommendations: string[] = [];

    if (
      caseAnalysis.flaggedTransactions.length > 0 ||
      caseAnalysis.highRiskTransactions.length > 0
    ) {
      recommendations.push(
        "The case should remain under fraud investigation until the flagged and high-risk transactions have been fully verified.",
      );

      recommendations.push(
        "Beneficiary details, transaction references and associated incident evidence should be reviewed to determine whether the financial activity was authorised by the customer or occurred under duress.",
      );
    } else if (session.transactions.length > 0) {
      recommendations.push(
        "The recorded financial activity should be verified against the customer, beneficiary details and available incident evidence before the case is closed.",
      );
    } else {
      recommendations.push(
        "The available incident evidence should be reviewed and verified before a final case outcome is approved.",
      );
    }

    if (session.accountsFrozen) {
      recommendations.push(
        "The existing account protection measures should remain in place until the investigation confirms that it is safe to restore normal account access.",
      );
    } else if (
      caseAnalysis.flaggedTransactions.length > 0 ||
      caseAnalysis.highRiskTransactions.length > 0
    ) {
      recommendations.push(
        "Account protection measures should be considered while the suspicious financial activity is being investigated.",
      );
    }

    if (session.locations.length > 0) {
      recommendations.push(
        "The captured location evidence should be retained as supporting evidence and compared with the timing of the recorded alerts and transactions.",
      );
    }

    if (session.alertCount > 0) {
      recommendations.push(
        "The recorded duress alerts should remain attached to the case as supporting evidence for manager review.",
      );
    }

    recommendations.push(
      "Once the analyst has verified the available evidence and documented any outstanding concerns, the case can be submitted to the fraud manager for final review and approval.",
    );

    return recommendations.join(" ");
  };

  const initialRecommendedInvestigation =
    generateRecommendedInvestigationSummary();

  const initialRecommendedResolution =
    generateRecommendedResolution();

  const [
    recommendedInvestigation,
    setRecommendedInvestigation,
  ] = useState(initialRecommendedInvestigation);

  const [
    recommendedResolution,
    setRecommendedResolution,
  ] = useState(initialRecommendedResolution);

  const [
    editingInvestigationRecommendation,
    setEditingInvestigationRecommendation,
  ] = useState(false);

  const [
    editingResolutionRecommendation,
    setEditingResolutionRecommendation,
  ] = useState(false);

  const handleUseInvestigationRecommendation = () => {
    setInvestigationSummary(
      recommendedInvestigation.trim(),
    );

    if (error) {
      setError("");
    }
  };

  const handleUseResolutionRecommendation = () => {
    setResolutionSummary(
      recommendedResolution.trim(),
    );

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (!resolutionSummary.trim()) {
      setError("Resolution recommendation is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const updated = await submitCaseReport(
        session.id,
        investigationSummary.trim(),
        resolutionSummary.trim(),
      );

      onSubmitted(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit report.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const wasRejected =
    session.managerReviewStatus === "Rejected";

  return (
    <section className="dashboard-panel overflow-hidden">
      <div className="dashboard-panel-header">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#EAF4FB] text-[#1769AA]">
            <FileText size={18} strokeWidth={1.8} />
          </div>

          <div>
            <p className="eyebrow">
              Analyst workflow
            </p>

            <h2 className="panel-heading">
              Case report
            </h2>

            <p className="panel-description">
              Review the recommended findings and resolution,
              make any necessary changes and submit the final
              case report for manager review.
            </p>
          </div>
        </div>
      </div>

      {wasRejected && (
        <div className="mx-5 mt-5 border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-600"
            />

            <div>
              <p className="text-sm font-semibold text-red-800">
                Report returned for changes
              </p>

              <p className="mt-1 text-xs leading-5 text-red-700">
                The manager did not approve the previous
                submission. Review the feedback below,
                update your findings and resubmit the report.
              </p>

              {session.managerReviewNotes && (
                <div className="mt-3 border-l-2 border-red-300 pl-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-red-500">
                    Manager feedback
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-800">
                    {session.managerReviewNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 p-5">
        <div className="overflow-hidden border-2 border-[#B9D7EA] bg-[#F4FAFE]">
          <div className="border-b border-[#D7E8F2] bg-[#EAF4FB] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white text-[#1769AA] shadow-sm">
                <Sparkles size={19} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1769AA]">
                  Secure Escape Recommendation
                </p>

                <h3 className="mt-1 text-base font-bold text-[#102A43]">
                  Recommended Investigation Summary
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review this system-generated draft before
                  applying it to the official case report.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {editingInvestigationRecommendation ? (
              <textarea
                rows={8}
                maxLength={2000}
                value={recommendedInvestigation}
                onChange={(e) =>
                  setRecommendedInvestigation(
                    e.target.value,
                  )
                }
                className="w-full resize-none border border-[#9EC7DF] bg-white px-4 py-3 text-sm leading-7 text-[#102A43] outline-none transition focus:border-[#1769AA] focus:ring-2 focus:ring-[#1769AA]/10"
              />
            ) : (
              <p className="text-sm leading-7 text-slate-700">
                {recommendedInvestigation}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#D7E8F2] pt-3">
              <button
                type="button"
                onClick={() =>
                  setEditingInvestigationRecommendation(
                    !editingInvestigationRecommendation,
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap border border-[#1769AA] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#1769AA] transition hover:bg-[#EAF4FB]"
              >
                {editingInvestigationRecommendation ? (
                  <>
                    <Check size={13} />
                    Finish Editing
                  </>
                ) : (
                  <>
                    <Pencil size={13} />
                    Edit Recommendation
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={
                  handleUseInvestigationRecommendation
                }
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap border border-[#1769AA] bg-[#1769AA] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#12558A]"
              >
                <ClipboardCheck size={13} />
                Use Recommendation
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2">
              <Lightbulb
                size={15}
                className="mt-0.5 shrink-0 text-[#1769AA]"
              />

              <p className="text-xs leading-5 text-slate-500">
                You can edit this recommendation first. When
                you are satisfied, select Use Recommendation
                to copy the current version into the official
                Investigation Summary below.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-semibold text-[#102A43]">
              Investigation Summary
            </label>

            <span className="text-xs text-slate-400">
              {investigationSummary.length}/2000
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            This is the official investigation summary that
            will be included in the report sent for manager
            review.
          </p>

          <textarea
            rows={7}
            maxLength={2000}
            value={investigationSummary}
            onChange={(e) => {
              setInvestigationSummary(
                e.target.value,
              );

              if (error) {
                setError("");
              }
            }}
            placeholder="Describe what you found during the investigation..."
            className="mt-3 w-full resize-none border border-[#CBD9E3] bg-white px-4 py-3 text-sm leading-6 text-[#102A43] outline-none transition placeholder:text-slate-400 focus:border-[#1769AA] focus:ring-2 focus:ring-[#1769AA]/10"
          />
        </div>

        <div className="overflow-hidden border-2 border-[#D8D4F0] bg-[#FAF9FE]">
          <div className="border-b border-[#E3DFF3] bg-[#F2F0FA] px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-white text-[#5B4F9B] shadow-sm">
                <ClipboardCheck size={19} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B4F9B]">
                  Secure Escape Recommendation
                </p>

                <h3 className="mt-1 text-base font-bold text-[#102A43]">
                  Recommended Resolution
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Suggested next steps based on the evidence
                  currently recorded for this case.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {editingResolutionRecommendation ? (
              <textarea
                rows={7}
                maxLength={2000}
                value={recommendedResolution}
                onChange={(e) =>
                  setRecommendedResolution(
                    e.target.value,
                  )
                }
                className="w-full resize-none border border-[#C9C1E8] bg-white px-4 py-3 text-sm leading-7 text-[#102A43] outline-none transition focus:border-[#5B4F9B] focus:ring-2 focus:ring-[#5B4F9B]/10"
              />
            ) : (
              <p className="text-sm leading-7 text-slate-700">
                {recommendedResolution}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E3DFF3] pt-3">
              <button
                type="button"
                onClick={() =>
                  setEditingResolutionRecommendation(
                    !editingResolutionRecommendation,
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap border border-[#5B4F9B] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5B4F9B] transition hover:bg-[#F2F0FA]"
              >
                {editingResolutionRecommendation ? (
                  <>
                    <Check size={13} />
                    Finish Editing
                  </>
                ) : (
                  <>
                    <Pencil size={13} />
                    Edit Recommendation
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={
                  handleUseResolutionRecommendation
                }
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap border border-[#5B4F9B] bg-[#5B4F9B] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#493F7D]"
              >
                <ClipboardCheck size={13} />
                Use Recommendation
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2">
              <Lightbulb
                size={15}
                className="mt-0.5 shrink-0 text-[#5B4F9B]"
              />

              <p className="text-xs leading-5 text-slate-500">
                Edit the recommended resolution if necessary,
                then use it to populate the official
                Resolution Recommendation below.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-semibold text-[#102A43]">
              Resolution Recommendation
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <span className="text-xs text-slate-400">
              {resolutionSummary.length}/2000
            </span>
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            This is the official resolution recommendation
            that will be submitted to the manager.
          </p>

          <textarea
            rows={6}
            maxLength={2000}
            value={resolutionSummary}
            onChange={(e) => {
              setResolutionSummary(
                e.target.value,
              );

              if (error) {
                setError("");
              }
            }}
            placeholder="Provide your recommended resolution..."
            className="mt-3 w-full resize-none border border-[#CBD9E3] bg-white px-4 py-3 text-sm leading-6 text-[#102A43] outline-none transition placeholder:text-slate-400 focus:border-[#1769AA] focus:ring-2 focus:ring-[#1769AA]/10"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
            <AlertCircle
              size={16}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        )}

        <div className="border border-[#DCE6EE] bg-[#F8FBFD] p-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck
              size={17}
              className="mt-0.5 shrink-0 text-[#1769AA]"
            />

            <div>
              <p className="text-sm font-semibold text-[#102A43]">
                What happens next?
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Submitting this report sends the final
                Investigation Summary and Resolution
                Recommendation to the manager for review. The
                case is not resolved until the manager
                approves the submission.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={
            submitting || !resolutionSummary.trim()
          }
          className="flex w-full items-center justify-center gap-2 border border-[#1769AA] bg-[#1769AA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#12558A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />

          {submitting
            ? "Submitting report..."
            : wasRejected
              ? "Resubmit for manager review"
              : "Submit for manager review"}
        </button>
      </div>
    </section>
  );
}