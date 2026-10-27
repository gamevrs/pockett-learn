"use client";

import React, { useEffect, useState } from "react";
import { CloudOff, Hourglass, PackageX, RotateCw, Timer, WifiOff, OctagonAlert } from "lucide-react";
import { SERVICE_COPY, type ServiceIssue, type ServiceIssueKind } from "@/engine/runtimes/service-error";

const ICON: Record<ServiceIssueKind, React.ComponentType<{ className?: string }>> = {
  busy: Hourglass,
  unavailable: CloudOff,
  offline: WifiOff,
  timeout: Timer,
  engine: PackageX,
  rejected: OctagonAlert,
};

/** Seconds left of a Retry-After wait (0 when none), ticking twice a second. Mount it with key={issue.at}. */
function useRetryCountdown(issue: ServiceIssue): number {
  const until = issue.retryAfter ? issue.at + issue.retryAfter * 1000 : 0;
  const [now, setNow] = useState(issue.at);
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
}

/**
 * A runner or download problem that is not the learner's fault. Deliberately calm (neutral colours, no red,
 * no error type or stack) and always says the code is fine; Retry puts them straight back where they were.
 */
export function ServiceNotice({
  issue,
  onRetry,
  engineName,
  className = "",
}: {
  issue: ServiceIssue;
  onRetry: () => void;
  /** "Python" / "SQL": only used for the engine message. */
  engineName?: string;
  className?: string;
}) {
  const copy = SERVICE_COPY[issue.kind];
  const Icon = ICON[issue.kind];
  const wait = useRetryCountdown(issue);
  const body =
    issue.kind === "rejected" && issue.detail
      ? issue.detail
      : issue.kind === "engine" && engineName
        ? `The files that run ${engineName} couldn't be downloaded (they come from a CDN that may be blocked or slow). This is usually a connection problem. Your code is fine.`
        : copy.body;
  const title = issue.kind === "engine" && engineName ? `${engineName} didn't load` : copy.title;

  return (
    <div
      role="status"
      data-testid="service-notice"
      data-kind={issue.kind}
      className={`rounded-lg border border-[var(--line-strong)] bg-surface-2 p-3 font-sans ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-ink">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">{body}</p>
          {issue.kind !== "rejected" && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={onRetry} disabled={wait > 0} className="btn btn-sm" data-testid="service-retry">
                <RotateCw className="h-3.5 w-3.5" />
                {wait > 0 ? `Retry in ${wait}s` : "Retry"}
              </button>
              {issue.kind === "busy" && wait > 0 && <span className="text-xs text-ink-3">Retrying when it's ready.</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
