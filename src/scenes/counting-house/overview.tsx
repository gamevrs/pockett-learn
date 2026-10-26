"use client";

import React from "react";
import { Lock } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { C, fmtInt, money, n, n0, objs, PANELS, plural, s, type Bundle } from "./model";
import { BalanceBeam } from "./panels-a";
import { toneColor, type Tone } from "./ui";

/**
 * The compact overview: what the console shows when its stage is short and wide (the project hub,
 * the landing page), so the whole operation reads at a glance without scrolling. It is drawn at a
 * fixed logical size and scaled to fit by the scene.
 */

export const OVERVIEW_W = 640;
export const OVERVIEW_H = 380;

const SHORT: Record<string, string> = {
  "ch-trial": "Trial",
  "ch-posting": "Posting",
  "ch-guards": "Guards",
  "ch-money": "Money",
  "ch-idem": "Retries",
  "ch-outbox": "Outbox",
  "ch-queue": "Queue",
  "ch-dead": "Dead jobs",
  "ch-audit": "Audit",
  "ch-retention": "Retention",
  "ch-tenants": "Tenants",
  "ch-plans": "Plans",
  "ch-pages": "Pages",
  "ch-statement": "Reports",
  "ch-rollup": "Roll-ups",
  "ch-quality": "Quality",
  "ch-migrations": "Migrate",
  "ch-close": "Close",
};

export interface ChipSpec {
  id: string;
  title: string;
  lesson: number;
  value: string | undefined;
  tone: Tone;
}

/** One status chip per panel: what it found, in a few words. */
export function chipSpecs(b: Bundle): ChipSpec[] {
  const board = objs(b.board);
  const lane = (st: string) => board.filter((r) => s(r.state) === st).length;
  const tr = objs(b.trial);
  const beam = objs(b.beam)[0];
  const debits = beam ? n0(beam.total_debits) : tr.reduce((t, r) => t + n0(r.debit_cents), 0);
  const credits = beam ? n0(beam.total_credits) : tr.reduce((t, r) => t + n0(r.credit_cents), 0);
  const guards = objs(b.guards);
  const holding = guards.filter((r) => n0(r.violations) === 0).length;
  const summary = new Map(objs(b.idemSummary).map((r) => [s(r.outcome), n0(r.requests)]));
  const replayed = summary.get("replayed") ?? objs(b.idemStream).filter((r) => s(r.outcome) === "replayed").length;
  const outbox = objs(b.outbox);
  const sent = outbox.filter((r) => s(r.status) === "sent").length;
  const dead = b.dead ? b.dead.rows.length : lane("dead");
  const checks = objs(b.checks);
  const clean = checks.filter((r) => n0(r.violations) === 0).length;
  const proofs = objs(b.proofs);
  const proven = proofs.filter((r) => n0(r.ok) === 1).length;
  const daily = objs(b.daily);
  const lastDay = daily[daily.length - 1];
  const stmt = objs(b.statement);
  const mig = objs(b.migrations);
  const plan = b.plans[b.plans.length - 1];
  const tenants = b.tenants.length;
  const leak = objs(b.lookup).some((r) => /^scoped/i.test(s(r.lookup)) && n0(r.rows_returned) > 0);
  const ret = objs(b.retention);
  const wrong = b.shortfall ? n0(objs(b.shortfall)[0]?.orders_wrong) : undefined;
  const v = (id: string): Pick<ChipSpec, "value" | "tone"> => {
    switch (id) {
      case "ch-trial":
        return b.trial || b.beam ? { value: debits === credits && debits > 0 ? "balanced" : "out of balance", tone: debits === credits && debits > 0 ? "accent" : "warning" } : { value: undefined, tone: "plain" };
      case "ch-posting":
        return b.posting ? { value: `${fmtInt(objs(b.posting).reduce((t, r) => t + n0(r.entries), 0))} posted`, tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-guards":
        return b.guards ? { value: `${holding}/${guards.length} hold`, tone: holding === guards.length ? "accent" : "danger" } : { value: undefined, tone: "plain" };
      case "ch-money":
        return wrong !== undefined ? { value: wrong > 0 ? `${wrong} found` : "all right", tone: "accent" } : b.split || b.display ? { value: "adds up", tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-idem":
        return b.idemStream || b.idemSummary ? { value: `${replayed} caught`, tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-outbox":
        return b.outbox ? { value: `${sent} sent`, tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-queue":
        return b.board ? { value: `${lane("running")} running`, tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-dead":
        return b.dead || b.board ? { value: dead > 0 ? `${dead} handled` : "none dead", tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-audit":
        return b.audit ? { value: `${b.audit.rows.length} changes`, tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-retention":
        return b.retention ? { value: `${ret.reduce((t, r) => t + n0(r.purged), 0)} purged`, tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-tenants":
        return tenants > 0 || b.lookup ? { value: leak ? "leak!" : "0 leaks", tone: leak ? "danger" : "accent" } : { value: undefined, tone: "plain" };
      case "ch-plans":
        return plan ? { value: plan.after ? "indexed" : "captured", tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-pages":
        return b.pages.length || b.nplus1 ? { value: b.pages.length ? plural(b.pages.length, "page") : "1 query", tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-statement":
        return stmt.length ? { value: money(n(stmt[stmt.length - 1].balance_cents)), tone: "accent" } : b.mom ? { value: "trend", tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-rollup":
        return lastDay ? { value: `${n0(lastDay.approval_pct).toFixed(1)}% ok`, tone: "accent" } : b.stages.length ? { value: "hourly", tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-quality":
        return b.checks ? { value: clean === checks.length ? "all clean" : `${checks.length - clean} flagged`, tone: "accent" } : b.recon ? { value: "reconciled", tone: "accent" } : { value: undefined, tone: "plain" };
      case "ch-migrations":
        return mig.length ? { value: `v${Math.max(...mig.map((r) => n0(r.version)))}`, tone: "accent" } : { value: undefined, tone: "plain" };
      default:
        return b.proofs ? { value: proven === proofs.length ? "balanced" : `${proven}/${proofs.length} proven`, tone: proven === proofs.length ? "accent" : "warning" } : { value: undefined, tone: "plain" };
    }
  };
  return PANELS.map((p) => ({ id: p.id, title: SHORT[p.id] ?? p.title, lesson: p.lesson, ...v(p.id) }));
}

export function StatusChip({ spec, unlocked, built, spot, flash }: { spec: ChipSpec; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  if (!unlocked) {
    return (
      <div data-panel={spec.id} data-locked="" className={`flex min-w-0 items-center gap-1.5 rounded-lg border border-dashed px-2 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[9.5px] !tracking-[0.03em]">{spec.title}</span>
        <span className="hud-label shrink-0 !text-[9px] text-white/30">L{spec.lesson}</span>
      </div>
    );
  }
  return (
    <div data-panel={spec.id} className={`flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 ${flash ? "pop-in" : ""} ${spot ? "border-[#c5ee8a]/40" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="hud-label flex items-center gap-1 !text-[9px] !tracking-[0.03em]"><FeatureIcon id={spec.id} className="h-3 w-3 shrink-0 text-[#c5ee8a]" /><span className="truncate">{spec.title}</span></div>
        <div className="hud-value whitespace-nowrap text-[10.5px] leading-tight" style={{ color: spec.value === undefined ? "rgba(255,255,255,0.3)" : toneColor(spec.tone) }}>
          {!built ? "Press Run" : (spec.value ?? "—")}
        </div>
      </div>
    </div>
  );
}

function HeroBox({ id, title, unlocked, lesson, children }: { id: string; title: string; unlocked: boolean; lesson: number; children: React.ReactNode }) {
  if (!unlocked) {
    return (
      <div data-panel={`${id}-hero`} data-locked="" className="flex min-w-0 flex-col rounded-[10px] border border-dashed border-white/15 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Lock className="h-3 w-3 text-white/35" aria-hidden />
          <span className="hud-label flex-1 truncate">{title}</span>
          <span className="hud-label text-white/30">L{lesson}</span>
        </div>
        <div className="mt-auto space-y-1.5 pt-3">
          {[80, 56, 38].map((w) => (
            <div key={w} className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="hud-panel flex min-w-0 flex-col px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-2">
        <FeatureIcon id={id} className="h-3.5 w-3.5 text-[#c5ee8a]" />
        <h3 className="hud-title">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function Overview({ b, unlocked, built }: { b: Bundle; unlocked: ReadonlySet<string>; built: boolean }) {
  const tr = objs(b.trial);
  const beam = objs(b.beam)[0];
  const debits = beam ? n0(beam.total_debits) : tr.reduce((t, r) => t + n0(r.debit_cents), 0);
  const credits = beam ? n0(beam.total_credits) : tr.reduce((t, r) => t + n0(r.credit_cents), 0);
  const balanced = debits === credits && debits > 0;
  const board = objs(b.board);
  const lanes = [
    { st: "queued", label: "queued", color: C.amber },
    { st: "running", label: "running", color: C.lime },
    { st: "done", label: "done", color: "#9f9f9f" },
    { st: "dead", label: "dead", color: C.red },
  ];
  const maxLane = Math.max(1, ...lanes.map((l) => board.filter((r) => s(r.state) === l.st).length));
  const proofs = objs(b.proofs);
  const proven = proofs.filter((r) => n0(r.ok) === 1).length;
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_1fr_0.85fr] gap-2.5">
      <HeroBox id="ch-trial" title="Trial balance" unlocked={unlocked.has("ch-trial")} lesson={1}>
        {built && (b.trial || b.beam) ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <BalanceBeam debits={debits} credits={credits} />
            <div className="hud-value -mt-1 text-[12px] font-semibold tracking-widest" style={{ color: balanced ? C.limeText : C.amber }}>
              {balanced ? "BALANCED" : "OUT OF BALANCE"}
            </div>
            <div className="hud-muted text-[10.5px]">
              {money(debits)} debits · {money(credits)} credits
            </div>
          </div>
        ) : (
          <p className="hud-log hud-muted py-1 text-[11px]">{built ? "Return your trial balance to weigh the books." : "Press Run to weigh the books."}</p>
        )}
      </HeroBox>
      <HeroBox id="ch-queue" title="Job queue" unlocked={unlocked.has("ch-queue")} lesson={7}>
        {built && b.board ? (
          <ul className="space-y-2 pt-1">
            {lanes.map((l) => {
              const count = board.filter((r) => s(r.state) === l.st).length;
              return (
                <li key={l.st}>
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="hud-label">{l.label}</span>
                    <span className="hud-value">{count}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full" style={{ width: `${(count / maxLane) * 100}%`, background: l.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="hud-log hud-muted py-1 text-[11px]">{built ? "Select the whole jobs table to see the lanes." : "Press Run to see the lanes."}</p>
        )}
      </HeroBox>
      <HeroBox id="ch-close" title="Month-end close" unlocked={unlocked.has("ch-close")} lesson={18}>
        {built && b.proofs ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
            <div
              className="rounded-md border-2 px-3 py-1.5 text-center"
              style={{ borderColor: proven === proofs.length ? C.lime : "rgba(251,191,36,0.6)", color: proven === proofs.length ? C.limeText : C.amber, transform: "rotate(-4deg)" }}
            >
              <div className="hud-value text-[13px] font-bold leading-none tracking-[0.12em]">{proven === proofs.length ? "BOOKS" : "NOT YET"}</div>
              <div className="hud-value mt-0.5 text-[13px] font-bold leading-none tracking-[0.12em]">{proven === proofs.length ? "BALANCE" : "PROVEN"}</div>
            </div>
            <div className="hud-muted text-[10.5px]">
              {proven}/{proofs.length} proofs agree
            </div>
          </div>
        ) : (
          <p className="hud-log hud-muted py-1 text-[11px]">{built ? "Return the proof rows to close the month." : "Press Run to close the month."}</p>
        )}
      </HeroBox>
    </div>
  );
}
