import {
  Clock3,
  MapPin,
  Navigation,
} from "lucide-react";

import SessionMap from "../SessionMap";
import LocationAddress from "./LocationAddress";
import type { DuressSessionDetail } from "../../types/session";

interface IncidentLocationPanelProps {
  session: DuressSessionDetail;
}

export default function IncidentLocationPanel({
  session,
}: IncidentLocationPanelProps) {
  const sortedLocations = [...session.locations].sort(
    (a, b) =>
      new Date(b.capturedAt).getTime() -
      new Date(a.capturedAt).getTime(),
  );

  const latest = sortedLocations[0];
  const isLive = session.status === "Active";

  if (!latest) {
    return (
      <section className="dashboard-panel overflow-hidden">
        <div className="dashboard-panel-header">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#EAF4FB] text-[#1769AA]">
              <MapPin size={18} strokeWidth={1.8} />
            </div>

            <div>
              <p className="eyebrow">
                Incident intelligence
              </p>

              <h2 className="panel-heading">
                Customer location
              </h2>

              <p className="panel-description">
                GPS information captured during the duress
                incident.
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex h-11 w-11 items-center justify-center bg-slate-100 text-slate-400">
              <MapPin size={21} />
            </div>

            <p className="mt-4 font-semibold text-[#102A43]">
              No location captured
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              No GPS location events are available for this
              incident.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-panel overflow-hidden">
      <div className="dashboard-panel-header">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center ${
              isLive
                ? "bg-red-50 text-red-600"
                : "bg-[#EAF4FB] text-[#1769AA]"
            }`}
          >
            <MapPin size={18} strokeWidth={1.8} />
          </div>

          <div>
            <p className="eyebrow">
              Incident intelligence
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-3">
              <h2 className="panel-heading">
                {isLive
                  ? "Live customer location"
                  : "Incident location"}
              </h2>

              {isLive && (
                <span className="inline-flex items-center gap-1.5 border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-red-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />

                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-600" />
                  </span>

                  Live incident
                </span>
              )}
            </div>

            <p className="panel-description">
              {isLive
                ? "Latest customer location captured during the active duress incident."
                : "Most recent customer location recorded during this incident."}
            </p>
          </div>
        </div>

        <span className="panel-count">
          {session.locations.length}{" "}
          {session.locations.length === 1
            ? "point"
            : "points"}
        </span>
      </div>

      <div className="grid grid-cols-1 border-b border-[#DCE7EF] bg-[#FBFDFE] md:grid-cols-3">
        <LocationMetric
          icon={<MapPin size={17} />}
          label="Latest Address"
        >
          <LocationAddress
            latitude={Number(latest.latitude)}
            longitude={Number(latest.longitude)}
          />
        </LocationMetric>

        <LocationMetric
          icon={<Clock3 size={17} />}
          label="Last Captured"
        >
          <p className="text-sm font-semibold text-[#102A43]">
            {new Date(
              latest.capturedAt,
            ).toLocaleDateString("en-ZA")}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {new Date(
              latest.capturedAt,
            ).toLocaleTimeString("en-ZA", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
        </LocationMetric>

        <LocationMetric
          icon={<Navigation size={17} />}
          label="GPS Accuracy"
          last
        >
          <p className="text-sm font-semibold text-[#102A43]">
            ±{latest.accuracyMeters} m
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            Source: {latest.locationSource}
          </p>
        </LocationMetric>
      </div>

      <div className="relative">
        {isLive && (
          <div className="absolute left-4 top-4 z-[500] border border-red-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>

              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-red-700">
                Latest position
              </span>
            </div>
          </div>
        )}

        <SessionMap locations={session.locations} />
      </div>

      <div className="flex flex-col gap-2 border-t border-[#E5EDF3] bg-[#FBFDFE] px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Showing the latest captured position and recorded
          location points.
        </span>

        <span className="font-medium text-slate-400">
          {sortedLocations.length} GPS event
          {sortedLocations.length !== 1 ? "s" : ""} recorded
        </span>
      </div>
    </section>
  );
}

interface LocationMetricProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  last?: boolean;
}

function LocationMetric({
  icon,
  label,
  children,
  last = false,
}: LocationMetricProps) {
  return (
    <div
      className={`flex items-start gap-3 border-b border-[#E5EDF3] px-5 py-4 md:border-b-0 ${
        last ? "" : "md:border-r"
      }`}
    >
      <div className="mt-0.5 shrink-0 text-[#1769AA]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </p>

        <div className="mt-1">
          {children}
        </div>
      </div>
    </div>
  );
}