"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout } from "./ui";

/**
 * Give each part of the clinic system an identity of its own and grant it permissions. A job
 * fails if a permission it needs is missing; every permission nobody needs is blast radius, the
 * damage a stolen credential could do. "admin:*" makes everything work, and shows what that costs.
 */

const PERMS = ["bookings:read", "bookings:write", "patients:read", "patients:export", "sms:send", "db:snapshot", "backups:write", "users:manage"] as const;
type Perm = (typeof PERMS)[number];
const ADMIN = "admin:*";

interface Job {
  text: string;
  needs: Perm[];
}
interface Service {
  id: string;
  name: string;
  blurb: string;
  jobs: Job[];
}

const SERVICES: Service[] = [
  {
    id: "reminder",
    name: "Reminder worker",
    blurb: "Texts patients the day before their visit.",
    jobs: [
      { text: "Find tomorrow's bookings", needs: ["bookings:read"] },
      { text: "Look up each patient's phone number", needs: ["patients:read"] },
      { text: "Send the text", needs: ["sms:send"] },
    ],
  },
  {
    id: "api",
    name: "Booking API",
    blurb: "Serves the patient app.",
    jobs: [
      { text: "Show and create bookings", needs: ["bookings:read", "bookings:write"] },
      { text: "Show a patient their own contact details", needs: ["patients:read"] },
    ],
  },
  {
    id: "report",
    name: "Weekly report job",
    blurb: "Emails the manager a bookings-per-day chart.",
    jobs: [{ text: "Count bookings per day", needs: ["bookings:read"] }],
  },
  {
    id: "backup",
    name: "Backup job",
    blurb: "Copies the database to cold storage each night.",
    jobs: [
      { text: "Take a snapshot of the database", needs: ["db:snapshot"] },
      { text: "Write it to the backup bucket", needs: ["backups:write"] },
    ],
  },
];

export interface PermsLabProps {
  /** Subset of service ids (default: all four). */
  services?: string[];
}

export interface PermsLabState {
  working: number;
  jobs: number;
  excess: number;
  /** Every job works and nothing extra is granted. */
  minimal: boolean;
  usesAdmin: boolean;
}

export function PermsLab({ props, onChange, revealed, status }: WidgetProps<PermsLabProps>) {
  const services = props.services ? SERVICES.filter((s) => props.services!.includes(s.id)) : SERVICES;
  const [grants, setGrants] = useState<Record<string, string[]>>({});

  const needed = (s: Service) => new Set<string>(s.jobs.flatMap((j) => j.needs));

  const summarize = (gr: Record<string, string[]>): PermsLabState => {
    let working = 0;
    let jobs = 0;
    let excess = 0;
    let usesAdmin = false;
    for (const s of services) {
      const g = gr[s.id] ?? [];
      const eff = g.includes(ADMIN) ? new Set<string>([...PERMS]) : new Set(g);
      if (g.includes(ADMIN)) usesAdmin = true;
      const need = new Set<string>(s.jobs.flatMap((j) => j.needs));
      for (const j of s.jobs) {
        jobs += 1;
        if (j.needs.every((p) => eff.has(p))) working += 1;
      }
      excess += [...eff].filter((p) => !need.has(p)).length;
    }
    return { working, jobs, excess, minimal: working === jobs && excess === 0, usesAdmin };
  };

  const toggle = (sid: string, perm: string) => {
    if (revealed) return;
    const cur = grants[sid] ?? [];
    const next = { ...grants, [sid]: cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm] };
    setGrants(next);
    onChange?.(summarize(next));
  };

  const shown = status === "revealed" ? Object.fromEntries(services.map((s) => [s.id, [...needed(s)]])) : grants;
  const sum = summarize(shown);

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-2.5">
        {services.map((s) => {
          const g = shown[s.id] ?? [];
          const eff = g.includes(ADMIN) ? new Set<string>([...PERMS, ADMIN]) : new Set(g);
          const need = needed(s);
          const extra = [...eff].filter((p) => p !== ADMIN && !need.has(p)).length;
          return (
            <div key={s.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <p className="text-xs text-ink-3">{s.blurb}</p>
              </div>
              <ul className="mt-2 grid gap-1">
                {s.jobs.map((j) => {
                  const ok = j.needs.every((p) => eff.has(p));
                  return (
                    <li key={j.text} className="flex items-start gap-1.5 text-[13px] text-ink-2">
                      {ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" /> : <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" />}
                      <span className={ok ? "" : "text-ink"}>
                        {j.text}
                        {!ok && <span className="text-ink-3"> · blocked</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {[...PERMS, ADMIN].map((p) => {
                  const on = g.includes(p);
                  const isExtra = eff.has(p) && p !== ADMIN && !need.has(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      role="switch"
                      aria-checked={on}
                      disabled={revealed}
                      onClick={() => toggle(s.id, p)}
                      className={`min-h-10 rounded-full border px-2.5 font-mono text-[11.5px] transition-colors disabled:cursor-default ${
                        on
                          ? isExtra || p === ADMIN
                            ? "border-[var(--bad)]/55 bg-[var(--bad)]/[0.08] text-ink"
                            : "border-[var(--brand)] bg-tint text-ink"
                          : eff.has(p)
                            ? "border-dashed border-[var(--bad)]/55 bg-surface text-ink-2"
                            : "border-line bg-surface text-ink-3 hover:text-ink"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              {extra > 0 && <p className="mt-1.5 text-xs text-bad">{extra} more than this service needs</p>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Jobs working" value={`${sum.working}/${sum.jobs}`} accent={sum.working === sum.jobs} />
        <Readout label="Unneeded permissions" value={sum.excess} accent={sum.excess === 0 && sum.working === sum.jobs} />
      </div>
      {sum.minimal && (
        <Note tone="good" className="pop-in mt-2">
          Every job works and nothing extra is granted. If one of these credentials leaks, the damage is limited to that job.
        </Note>
      )}
      {sum.usesAdmin && (
        <Note tone="bad" className="mt-2">
          admin:* makes every job work, and also every permission nobody asked for.
        </Note>
      )}
    </div>
  );
}

export function checkPermsLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as PermsLabState | undefined;
  if (!st) return false;
  if (goal.minimal === true && !st.minimal) return false;
  if (typeof goal.maxExcess === "number" && st.excess > goal.maxExcess) return false;
  if (goal.allWorking === true && st.working !== st.jobs) return false;
  return true;
}
