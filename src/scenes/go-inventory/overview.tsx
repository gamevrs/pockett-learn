"use client";

import React from "react";
import { ArrowRight, Check, Lock, Play, X } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { SENTINEL_OF, type Board } from "./data";
import { Shelves, ShelvesGhost } from "./panels";
import { AMBER, dash, LIME, Pill, RED, TypePill } from "./ui";

/**
 * The compact overview: what the board shows when its stage is short and wide (the project hub, the
 * landing page), so the whole ledger reads at a glance without scrolling. Drawn at a fixed logical
 * size and scaled to fit by the scene.
 */

export const OVERVIEW_W = 780;
export const OVERVIEW_H = 540;

interface Mini {
  id: string;
  title: string;
  lesson: number;
}

function MiniLocked({ m, spot, className = "" }: { m: Mini; spot: boolean; className?: string }) {
  return (
    <div data-panel={m.id} data-locked="" className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-dashed px-2.5 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"} ${className}`}>
      <div className="flex items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[11px]">{m.title}</span>
        <span className="hud-label shrink-0 !text-[10px] text-white/45">L{m.lesson}</span>
      </div>
      <div className="mt-2.5 space-y-1.5">
        {[88, 62, 74].map((w, i) => (
          <div key={i} className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function MiniFrame({ m, built, flash, spot, meta, className = "", children }: { m: Mini; built: boolean; flash: boolean; spot: boolean; meta?: string; className?: string; children: React.ReactNode }) {
  return (
    <section data-panel={m.id} className={`hud-panel flex min-h-0 min-w-0 flex-col overflow-hidden !px-2.5 !py-2 ${spot ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-1.5 flex min-w-0 items-center gap-1.5">
        {built ? <FeatureIcon id={m.id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" /> : <Play className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]/70" aria-hidden />}
        <h3 className="hud-title min-w-0 flex-1 truncate !text-[11px]">{m.title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{built ? children : <p className="hud-muted text-[10.5px]">Press Run to fill this in.</p>}</div>
    </section>
  );
}

export interface OverviewProps {
  board: Board;
  unlocked: ReadonlySet<string>;
  built: boolean;
  focus: string | null;
  flashing: ReadonlySet<string>;
}

const M = {
  shelves: { id: "gi-shelves", title: "Shelves", lesson: 1 },
  lane: { id: "gi-lane", title: "Handler lane", lesson: 2 },
  inbox: { id: "gi-inbox", title: "Rejected inbox", lesson: 6 },
  imp: { id: "gi-import", title: "JSON import", lesson: 11 },
  sku: { id: "gi-sku", title: "SKU strip", lesson: 13 },
  tests: { id: "gi-tests", title: "Tests", lesson: 15 },
  close: { id: "gi-close", title: "Close-out", lesson: 16 },
};

const CHIPS: { m: Mini; value: (b: Board) => string | undefined }[] = [
  { m: { id: "gi-kinds", title: "Type probe", lesson: 3 }, value: (b) => (b.probe.kinds ? `${b.probe.kinds.length} probed` : undefined) },
  { m: { id: "gi-compose", title: "Composition", lesson: 4 }, value: (b) => (b.compose.calls !== undefined ? `${b.compose.calls} audited` : b.compose.labels ? `${b.compose.labels.length} labels` : undefined) },
  { m: { id: "gi-printout", title: "Printout", lesson: 5 }, value: (b) => (b.printout.table ? `${b.printout.table.length} rows` : undefined) },
  { m: { id: "gi-typed", title: "Error desk", lesson: 7 }, value: (b) => (b.typed.rows ? `${b.typed.rows.length} typed` : undefined) },
  { m: { id: "gi-index", title: "Stock index", lesson: 8 }, value: (b) => (b.index.byQty ? `${b.index.byQty.length} sorted` : undefined) },
  { m: { id: "gi-helpers", title: "Helpers", lesson: 9 }, value: (b) => (b.helpers.totalUnits !== undefined ? `${b.helpers.totalUnits} units` : undefined) },
  { m: { id: "gi-ledger", title: "Ledger[K,V]", lesson: 10 }, value: (b) => (b.ledger.len !== undefined ? `${b.ledger.len} keys` : undefined) },
  { m: { id: "gi-validate", title: "Validation", lesson: 12 }, value: (b) => (b.validation.total !== undefined ? `${b.validation.total} problems` : undefined) },
  { m: { id: "gi-log", title: "Movement log", lesson: 14 }, value: (b) => (b.log.lines !== undefined ? `${b.log.lines} lines` : undefined) },
];

function Chip({ m, value, unlocked, built, spot, flash }: { m: Mini; value: string | undefined; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  if (!unlocked) {
    return (
      <div data-panel={m.id} data-locked="" className={`flex min-w-0 items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[10px]">{m.title}</span>
        <span className="hud-label shrink-0 !text-[9px] text-white/45">L{m.lesson}</span>
      </div>
    );
  }
  return (
    <div data-panel={m.id} className={`flex min-w-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 ${flash ? "pop-in" : ""}`}>
      <FeatureIcon id={m.id} className="h-3 w-3 shrink-0 text-[#c5ee8a]" />
      <div className="min-w-0 flex-1">
        <div className="hud-label truncate !text-[9px]">{m.title}</div>
        <div className="hud-value truncate text-[10.5px] leading-tight" style={{ color: built && value ? "#d3f3a4" : "rgba(255,255,255,0.45)" }}>
          {!built ? "Press Run" : (value ?? dash)}
        </div>
      </div>
    </div>
  );
}

export function Overview({ board: b, unlocked, built, focus, flashing }: OverviewProps) {
  const u = (id: string) => unlocked.has(id);
  const spot = (id: string) => focus === id;
  const fl = (id: string) => flashing.has(id);

  const lane = b.lane.rows ?? [];
  const inbox = b.inbox.rows ?? [];
  const tests = [...(b.tests.rows ?? []), ...(b.tests.gate ?? [])];
  const passed = tests.filter((t) => t.pass).length;
  const failedNames = tests.filter((t) => !t.pass).map((t) => t.name);
  const imp = { ok: b.importer.decoded?.length ?? 0, bad: b.importer.failed?.length ?? 0 };
  const c = b.close;

  return (
    <div className="flex h-full flex-col gap-2">
      {/* shelves */}
      <div className="shrink-0">
        {!u(M.shelves.id) ? (
          <div data-panel={M.shelves.id} data-locked="" className={`rounded-[10px] border border-dashed p-2 ${spot(M.shelves.id) ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
            <ShelvesGhost />
          </div>
        ) : (
          <MiniFrame m={M.shelves} built={built} flash={fl(M.shelves.id)} spot={spot(M.shelves.id)} meta={b.shelves.items ? `${b.shelves.items.reduce((s, i) => s + (i.qty ?? 0), 0)} units` : undefined}>
            <Shelves d={b.shelves} compact />
          </MiniFrame>
        )}
      </div>

      {/* lane, inbox, import */}
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-1 gap-2">
        {!u(M.lane.id) ? (
          <MiniLocked m={M.lane} spot={spot(M.lane.id)} />
        ) : (
          <MiniFrame m={M.lane} built={built} flash={fl(M.lane.id)} spot={spot(M.lane.id)} meta={lane.length ? `${lane.length} moved` : undefined}>
            <ul className="space-y-1">
              {lane.slice(0, 4).map((r, i) => (
                <li key={i} className="flex min-w-0 items-center gap-1">
                  <span className="shrink-0 rounded bg-white/10 px-1 font-mono text-[9px] text-white/75">{r.kind.slice(0, 3)}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/85">{r.sku}</span>
                  <ArrowRight className="h-2.5 w-2.5 shrink-0 text-white/40" aria-hidden />
                  <TypePill type={r.handler} tone={r.ok === false ? "danger" : "accent"} />
                </li>
              ))}
              {lane.length === 0 && <li className="hud-muted text-[10.5px]">No movements yet.</li>}
            </ul>
          </MiniFrame>
        )}
        {!u(M.inbox.id) ? (
          <MiniLocked m={M.inbox} spot={spot(M.inbox.id)} />
        ) : (
          <MiniFrame m={M.inbox} built={built} flash={fl(M.inbox.id)} spot={spot(M.inbox.id)} meta={inbox.length ? `${inbox.length} refused` : undefined}>
            <ul className="space-y-1">
              {inbox.slice(0, 4).map((r, i) => {
                const typed = r.badge?.startsWith("*");
                return (
                  <li key={i} className="flex min-w-0 items-center gap-1">
                    {r.line !== undefined && <span className="shrink-0 rounded bg-white/10 px-1 font-mono text-[9px] text-white/75">L{r.line}</span>}
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/75">{r.sku ?? r.text ?? ""}</span>
                    <Pill tone={typed ? "danger" : "warning"} solid={typed}>
                      {(r.badge ?? SENTINEL_OF[r.cls] ?? r.cls).replace("*main.", "*")}
                    </Pill>
                  </li>
                );
              })}
              {inbox.length === 0 && <li className="hud-muted text-[10.5px]">Nothing refused yet.</li>}
            </ul>
          </MiniFrame>
        )}
        {!u(M.imp.id) ? (
          <MiniLocked m={M.imp} spot={spot(M.imp.id)} />
        ) : (
          <MiniFrame m={M.imp} built={built} flash={fl(M.imp.id)} spot={spot(M.imp.id)} meta={imp.ok + imp.bad ? `${imp.ok}/${imp.ok + imp.bad} decoded` : undefined}>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <span style={{ width: `${(imp.ok / Math.max(imp.ok + imp.bad, 1)) * 100}%`, background: LIME }} />
              <span style={{ width: `${(imp.bad / Math.max(imp.ok + imp.bad, 1)) * 100}%`, background: RED }} />
            </div>
            <ul className="mt-1.5 space-y-1">
              {(b.importer.failed ?? []).slice(0, 3).map((f, i) => (
                <li key={i} className="flex min-w-0 items-center gap-1">
                  <X className="hud-danger h-2.5 w-2.5 shrink-0" aria-hidden />
                  <span className="font-mono text-[10px] text-white/80">#{f.index ?? "?"}</span>
                  {f.field && <Pill tone="danger">{f.field}</Pill>}
                </li>
              ))}
              {(b.importer.decoded ?? []).slice(0, 1).map((r, i) => (
                <li key={`d${i}`} className="flex min-w-0 items-center gap-1">
                  <Check className="hud-accent h-2.5 w-2.5 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/80">{r.sku}</span>
                  {r.hasQty === false && <Pill tone="warning">no qty</Pill>}
                </li>
              ))}
            </ul>
          </MiniFrame>
        )}
      </div>

      {/* sku, tests, close */}
      <div className="grid shrink-0 grid-cols-3 gap-2">
        {!u(M.sku.id) ? (
          <MiniLocked m={M.sku} spot={spot(M.sku.id)} />
        ) : (
          <MiniFrame m={M.sku} built={built} flash={fl(M.sku.id)} spot={spot(M.sku.id)}>
            <div className="flex flex-wrap gap-1">
              {(b.sku.skus ?? []).slice(0, 6).map((r, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 rounded border px-1 font-mono text-[9.5px]" style={r.ok ? { borderColor: "rgba(197,238,138,0.45)", color: "#e0f6c1" } : { borderColor: "rgba(248,113,113,0.45)", color: "#fecaca" }}>
                  {r.ok ? <Check className="h-2 w-2" aria-hidden /> : <X className="h-2 w-2" aria-hidden />}
                  {r.value.trim() === "" ? "(empty)" : r.value}
                </span>
              ))}
            </div>
          </MiniFrame>
        )}
        {!u(M.tests.id) ? (
          <MiniLocked m={M.tests} spot={spot(M.tests.id)} />
        ) : (
          <MiniFrame m={M.tests} built={built} flash={fl(M.tests.id)} spot={spot(M.tests.id)} meta={tests.length ? `${passed}/${tests.length}` : undefined}>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <span style={{ width: `${(passed / Math.max(tests.length, 1)) * 100}%`, background: LIME }} />
              <span style={{ width: `${((tests.length - passed) / Math.max(tests.length, 1)) * 100}%`, background: RED }} />
            </div>
            <p className="mt-1 truncate font-mono text-[10px]" style={{ color: failedNames.length ? "#fecaca" : "#e0f6c1" }}>
              {tests.length === 0 ? "No test results yet." : failedNames.length ? `red: ${failedNames.slice(0, 2).join(", ")}${failedNames.length > 2 ? "…" : ""}` : "all green"}
            </p>
          </MiniFrame>
        )}
        {!u(M.close.id) ? (
          <MiniLocked m={M.close} spot={spot(M.close.id)} />
        ) : (
          <MiniFrame m={M.close} built={built} flash={fl(M.close.id)} spot={spot(M.close.id)} meta={c.balanced === undefined ? undefined : c.balanced ? "balanced" : "off"}>
            <p className="font-mono text-[10.5px] text-white/85">
              {c.opening ?? dash} <span className="text-white/45">+</span> {(c.received ?? 0) + (c.returned ?? 0)} <span className="text-white/45">−</span> {(c.issued ?? 0) + (c.retired ?? 0)} <span className="text-white/45">=</span>{" "}
              <span style={{ color: c.balanced === false ? AMBER : LIME }}>{c.closing ?? dash}</span>
            </p>
          </MiniFrame>
        )}
      </div>

      {/* the rest, as chips */}
      <div className="grid shrink-0 grid-cols-5 gap-1.5">
        {CHIPS.map((ch) => (
          <Chip key={ch.m.id} m={ch.m} value={ch.value(b)} unlocked={u(ch.m.id)} built={built} spot={spot(ch.m.id)} flash={fl(ch.m.id)} />
        ))}
      </div>
    </div>
  );
}

/** Shown instead of the overview when the program failed to build or crashed. */
export function ErrorStrip({ error }: { error: NonNullable<Board["error"]> }) {
  const compile = error.type === "CompileError";
  const first = error.message.split("\n").map((l) => l.trim()).find((l) => l.length > 0 && !l.startsWith("#")) ?? error.message;
  return (
    <div role="alert" className="rounded-[10px] border border-[#f87171]/40 bg-[#2a0f0f]/70 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-2">
        <span className="hud-title hud-danger">{compile ? "Build failed" : "The program crashed"}</span>
        {error.line !== null && <span className="hud-tag hud-danger border-[#f87171]/40">line {error.line}</span>}
      </div>
      <p className="break-words font-mono text-[11px] leading-snug text-[#fecaca]">{first}</p>
      <p className="hud-muted mt-1 text-[10px]">Open the workspace, fix it and press Run again.</p>
    </div>
  );
}
