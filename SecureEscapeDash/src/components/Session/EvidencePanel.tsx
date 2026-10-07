import { useEffect, useState } from "react";
import StatusBadge from "../StatusBadge";
import type { DuressSessionDetail } from "../../types/session";
import LocationAddress from "./LocationAddress";
import {
  getSessionEvidence,
  getSessionEvidenceFile,
  type SessionEvidenceItem,
} from "../../services/sessionService";

interface EvidencePanelProps {
  session: DuressSessionDetail;
}

interface LoadedEvidencePhoto {
  evidence: SessionEvidenceItem;
  imageUrl: string;
}

export default function EvidencePanel({
  session,
}: EvidencePanelProps) {
  const isLiveSession = session.status === "Active";

  const [photoEvidence, setPhotoEvidence] = useState<
    LoadedEvidencePhoto[]
  >([]);

  const [loadingPhotoEvidence, setLoadingPhotoEvidence] =
    useState(true);

  const [photoEvidenceError, setPhotoEvidenceError] =
    useState("");

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    const loadPhotoEvidence = async () => {
      try {
        setLoadingPhotoEvidence(true);
        setPhotoEvidenceError("");

        const evidenceItems = await getSessionEvidence(
          session.id,
        );

        const currentPhotos = evidenceItems.filter(
          (item) => item.evidenceType === "CurrentPhoto",
        );

        const loadedPhotos = await Promise.all(
          currentPhotos.map(async (evidence) => {
            const imageUrl = await getSessionEvidenceFile(
              session.id,
              evidence.id,
            );

            createdUrls.push(imageUrl);

            return {
              evidence,
              imageUrl,
            };
          }),
        );

        if (cancelled) {
          createdUrls.forEach((url) =>
            URL.revokeObjectURL(url),
          );
          return;
        }

        setPhotoEvidence(loadedPhotos);
      } catch (err) {
        if (!cancelled) {
          setPhotoEvidence([]);

          setPhotoEvidenceError(
            err instanceof Error
              ? err.message
              : "Current photo evidence could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPhotoEvidence(false);
        }
      }
    };

    loadPhotoEvidence();

    return () => {
      cancelled = true;

      createdUrls.forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, [session.id]);

  const sortedLocations = [...session.locations].sort(
    (a, b) =>
      new Date(b.capturedAt).getTime() -
      new Date(a.capturedAt).getTime(),
  );

  const findLinkedTransaction = (
    bankTransactionId: string | null,
  ) => {
    if (!bankTransactionId) {
      return undefined;
    }

    return session.transactions.find(
      (transaction) =>
        transaction.id === bankTransactionId,
    );
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "Size unavailable";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatBeneficiaryStatus = (
    status: string | null,
  ) => {
    if (!status) {
      return "Not available";
    }

    return status.replace(/([a-z])([A-Z])/g, "$1 $2");
  };

  const currentPhotoEvidenceBlock = (
    <div className="dashboard-panel overflow-hidden">
      <div className="dashboard-panel-header">
        <div>
          <p className="eyebrow">
            Visual evidence
          </p>

          <h2 className="panel-heading">
            Current Photo Evidence
          </h2>

          <p className="panel-description">
            Photos securely captured during transaction
            activity in this duress session.
          </p>
        </div>

        <span className="panel-count">
          {loadingPhotoEvidence
            ? "Loading"
            : `${photoEvidence.length} ${
                photoEvidence.length === 1
                  ? "photo"
                  : "photos"
              }`}
        </span>
      </div>

      {loadingPhotoEvidence ? (
        <div className="px-6 py-10 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#1769AA]" />

          <p className="mt-4 font-medium text-slate-600">
            Loading photo evidence...
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Retrieving protected incident evidence.
          </p>
        </div>
      ) : photoEvidenceError ? (
        <div className="px-6 py-8">
          <div className="border border-red-200 bg-red-50 px-4 py-4">
            <p className="text-sm font-semibold text-red-800">
              Photo evidence could not be loaded
            </p>

            <p className="mt-1 break-words text-xs leading-5 text-red-600">
              {photoEvidenceError}
            </p>
          </div>
        </div>
      ) : photoEvidence.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-medium text-slate-600">
            No current photos recorded
          </p>

          <p className="mt-1 text-sm text-slate-400">
            No current-photo evidence is associated with
            this incident.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
          {photoEvidence.map(
            ({ evidence, imageUrl }) => {
              const linkedTransaction =
                findLinkedTransaction(
                  evidence.bankTransactionId,
                );

              return (
                <article
                  key={evidence.id}
                  className="overflow-hidden border border-[#DCE6EE] bg-white"
                >
                  <div className="relative bg-slate-100">
                    <img
                      src={imageUrl}
                      alt="Current photo captured during the incident"
                      className="h-auto max-h-[520px] w-full object-contain"
                    />

                    <div className="absolute left-3 top-3 border border-blue-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1769AA] shadow-sm">
                      Current photo
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                          Captured
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#102A43]">
                          {new Date(
                            evidence.capturedAt,
                          ).toLocaleString(
                            "en-ZA",
                          )}
                        </p>
                      </div>

                      <span className="w-fit border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                        Stored
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E5EDF3] pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Evidence type
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          Current photo
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          File size
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatFileSize(
                            evidence.fileSizeBytes,
                          )}
                        </p>
                      </div>
                    </div>

                    {linkedTransaction ? (
                      <div className="mt-4 border border-[#DCE6EE] bg-[#F8FBFD] px-4 py-3">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                              Linked transaction
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[#102A43]">
                              {
                                linkedTransaction.transactionType
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Ref:{" "}
                              {
                                linkedTransaction.bankReference
                              }
                            </p>
                          </div>

                          <p className="text-lg font-bold text-[#102A43]">
                            R{" "}
                            {linkedTransaction.amount.toLocaleString(
                              "en-ZA",
                            )}
                          </p>
                        </div>
                      </div>
                    ) : evidence.bankTransactionId ? (
                      <div className="mt-4 border border-[#DCE6EE] bg-[#F8FBFD] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                          Linked transaction
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          Transaction evidence recorded
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 border border-[#DCE6EE] bg-[#F8FBFD] px-4 py-3">
                        <p className="text-xs text-slate-500">
                          This photo is associated with the
                          incident session.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </div>
  );

  const locationHistoryBlock = (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <p className="eyebrow">
            Location evidence
          </p>

          <h2 className="panel-heading">
            {isLiveSession
              ? "Location History"
              : "Recorded Locations"}
          </h2>

          <p className="panel-description">
            Readable addresses and original GPS coordinates
            captured during this incident.
          </p>
        </div>

        <span className="panel-count">
          {sortedLocations.length}{" "}
          {sortedLocations.length === 1
            ? "point"
            : "points"}
        </span>
      </div>

      {sortedLocations.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-medium text-slate-600">
            No location events recorded
          </p>

          <p className="mt-1 text-sm text-slate-400">
            GPS location evidence is not available for
            this incident.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#E5EDF3]">
          {sortedLocations.map(
            (location, index) => (
              <div
                key={location.id}
                className="px-5 py-4 transition-colors hover:bg-[#F8FBFD]"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start gap-2">
                      <LocationAddress
                        latitude={Number(
                          location.latitude,
                        )}
                        longitude={Number(
                          location.longitude,
                        )}
                      />

                      {index === 0 && (
                        <span className="shrink-0 border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1769AA]">
                          Latest
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      <span>
                        Accuracy: ±
                        {location.accuracyMeters} m
                      </span>

                      <span>
                        Source:{" "}
                        {location.locationSource}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm font-semibold text-[#102A43]">
                      {new Date(
                        location.capturedAt,
                      ).toLocaleTimeString(
                        "en-ZA",
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(
                        location.capturedAt,
                      ).toLocaleDateString(
                        "en-ZA",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );

  const transactionsBlock = (
    <div className="dashboard-panel">
      <div className="dashboard-panel-header">
        <div>
          <p className="eyebrow">
            Financial evidence
          </p>

          <h2 className="panel-heading">
            Transactions
          </h2>

          <p className="panel-description">
            Transaction and recipient details captured
            during this duress session.
          </p>
        </div>

        <span className="panel-count">
          {session.transactions.length}{" "}
          {session.transactions.length === 1
            ? "transaction"
            : "transactions"}
        </span>
      </div>

      {session.transactions.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-medium text-slate-600">
            No transactions recorded
          </p>

          <p className="mt-1 text-sm text-slate-400">
            No financial activity was captured during
            this incident.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#E5EDF3]">
          {session.transactions.map((tx) => (
            <div
              key={tx.id}
              className="px-5 py-5 transition-colors hover:bg-[#F8FBFD]"
            >
              <div className="flex flex-col justify-between gap-5 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
                        tx.flagged
                          ? "border border-red-200 bg-red-50 text-red-700"
                          : "border border-green-200 bg-green-50 text-green-700"
                      }`}
                    >
                      {tx.flagged
                        ? "Flagged"
                        : "Clean"}
                    </span>

                    <StatusBadge
                      status={tx.status}
                    />
                  </div>

                  <div className="mt-4">
                    <h3 className="text-2xl font-bold tracking-tight text-[#102A43]">
                      {tx.currency === "ZAR"
                        ? "R"
                        : `${tx.currency} `}
                      {tx.amount.toLocaleString(
                        "en-ZA",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </h3>

                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {tx.transactionType}
                    </p>
                  </div>

                  <div className="mt-5 border border-[#DCE6EE] bg-[#F8FBFD]">
                    <div className="border-b border-[#DCE6EE] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1769AA]">
                        Recipient / Beneficiary Details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Beneficiary Name
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#102A43]">
                          {tx.beneficiaryName ||
                            "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Bank
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {tx.beneficiaryBank ||
                            "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Account Number
                        </p>

                        <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">
                          {tx.beneficiaryAccountNumber ||
                            "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Account Type
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {tx.beneficiaryAccountType ||
                            "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Branch Code
                        </p>

                        <p className="mt-1 font-mono text-sm font-medium text-slate-700">
                          {tx.beneficiaryBranchCode ||
                            "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Beneficiary Reference
                        </p>

                        <p className="mt-1 break-words text-sm font-medium text-slate-700">
                          {tx.beneficiaryReference ||
                            "Not available"}
                        </p>
                      </div>

                      {tx.beneficiaryId && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Beneficiary Status
                          </p>

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {formatBeneficiaryStatus(
                              tx.beneficiaryStatus,
                            )}
                          </p>
                        </div>
                      )}

                      {tx.beneficiaryId &&
                        tx.beneficiaryLastPaidAt && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                              Last Paid
                            </p>

                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {new Date(
                                tx.beneficiaryLastPaidAt,
                              ).toLocaleString(
                                "en-ZA",
                              )}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Transaction Reference
                      </p>

                      <p className="mt-1 break-all text-sm font-medium text-slate-800">
                        {tx.bankReference}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Currency
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {tx.currency}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Risk Level
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {tx.riskLevel}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                        Risk Score
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {tx.riskScore}
                      </p>
                    </div>

                    {tx.secureEscapeCode && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          SecureEscape Code
                        </p>

                        <p className="mt-1 font-mono text-sm font-semibold text-[#1769AA]">
                          {tx.secureEscapeCode}
                        </p>
                      </div>
                    )}

                    {tx.description && (
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Description
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {tx.description}
                        </p>
                      </div>
                    )}

                    {tx.statusReason && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                          Status Reason
                        </p>

                        <p className="mt-1 text-sm text-slate-600">
                          {tx.statusReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 lg:text-right">
                  <p className="text-sm font-semibold text-[#102A43]">
                    {new Date(
                      tx.createdAt,
                    ).toLocaleTimeString(
                      "en-ZA",
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(
                      tx.createdAt,
                    ).toLocaleDateString(
                      "en-ZA",
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {isLiveSession ? (
        <>
          {currentPhotoEvidenceBlock}
          {locationHistoryBlock}
          {transactionsBlock}
        </>
      ) : (
        <>
          {transactionsBlock}
          {currentPhotoEvidenceBlock}
          {locationHistoryBlock}
        </>
      )}
    </div>
  );
}