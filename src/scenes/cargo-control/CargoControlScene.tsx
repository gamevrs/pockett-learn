"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Check, Clock, Lock, Minus, Pause, Play, RotateCcw, ScanLine, Send, SkipForward, Wind, X } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { SAMPLE_OWN, findKeyLine, viewManifest } from "./crates";
import { blueprintRows, type Inspection, type Outcome, type Row, type RowId, type RowState } from "./inspect";
import { DepotSim, type Counts, type Snapshot } from "./sim";

/**
 * Cargo Control: a depot gate, a conveyor of crates, and a control room that is entirely your Python.
 *
 * Each crate's manifest arrives as raw text. The scene calls the learner's functions, newest lesson
 * first (see inspect.ts), and shows the answers. Nothing here decides anything about a crate: if a
 * lesson isn't passed yet its row is a blueprint, and if a function misbehaves the real Python error
 * is shown. Lime means "your code produced this".
 */

const OUTCOME: Record<Outcome, { label: string; text: string; border: string; bg: string }> = {
  LOAD: { label: "LOAD", text: "text-[#d3f3a4]", border: "border-[#c5ee8a]/50", bg: "bg-[#c5ee8a]/10" },
  QUARANTINE: { label: "QUARANTINE", text: "text-[#fbbf24]", border: "border-[#fbbf24]/50", bg: "bg-[#fbbf24]/10" },
  REJECT: { label: "REJECT", text: "text-[#f87171]", border: "border-[#f87171]/50", bg: "bg-[#f87171]/10" },
  HELD: { label: "HELD", text: "text-white/70", border: "border-white/25", bg: "bg-white/[0.05]" },
  UNSORTED: { label: "UNSORTED", text: "text-white/60", border: "border-white/20", bg: "bg-white/[0.04]" },
  CRASH: { label: "CRASH", text: "text-[#f87171]", border: "border-[#f87171]/60", bg: "bg-[#f87171]/15" },
};

const CSS = `
@keyframes cc-belt { from { background-position: 0 0; } to { background-position: -24px 0; } }
@keyframes cc-scan { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
.cc-belt { animation: cc-belt 0.9s linear infinite; }
.cc-scan { animation: cc-scan 1.6s ease-in-out infinite; }
.cc-paused .cc-belt { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { .cc-belt, .cc-scan { animation: none !important; } }
`;

/** Which feature each inspection row belongs to, for spotlighting the lesson's focus. */
const FOCUS_ROW: Record<string, RowId> = {
  "cc-gate": "weigh",
  "cc-scale": "weigh",
  "cc-tally": "weigh",
  "cc-trace": "weigh",
  "cc-routing": "route",
  "cc-docks": "dock",
  "cc-audit": "dock",
  "cc-reader": "read",
  "cc-receipt": "receipt",
  "cc-fields": "check",
  "cc-formats": "check",
  "cc-schema": "check",
  "cc-chaos": "final",
};

const ROW_CLAUSE: Record<RowId, string> = {
  read: "json.loads · JSONDecodeError",
  weigh: "try / except / else / finally",
  check: "validate · regex · schema",
  route: "raise · class CargoError",
  dock: "with · @contextmanager",
  receipt: "json.dumps · default=",
  final: "parse → validate → decide → log",
};

// ───────────────────────── small pieces ─────────────────────────

function Panel({
  title,
  icon,
  meta,
  focus,
  flash,
  className = "",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function LockedPanel({ title, lesson, clause, spot, children }: { title: string; lesson: number; clause: string; spot: boolean; children?: React.ReactNode }) {
  return (
    <section className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      {children}
      <p className="mt-2 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

function GhostLines({ widths }: { widths: number[] }) {
  return (
    <div className="space-y-1.5">
      {widths.map((w, i) => (
        <div key={i} className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

const STATE_ICON: Record<RowState, React.ReactNode> = {
  locked: <Lock className="h-3 w-3 text-white/35" aria-hidden />,
  waiting: <Clock className="h-3 w-3 text-white/40" aria-hidden />,
  ok: <Check className="h-3 w-3 text-[#c5ee8a]" aria-hidden />,
  warn: <AlertTriangle className="h-3 w-3 text-[#fbbf24]" aria-hidden />,
  bad: <X className="h-3 w-3 text-[#f87171]" aria-hidden />,
  crash: <AlertTriangle className="h-3 w-3 text-[#f87171]" aria-hidden />,
  skip: <Minus className="h-3 w-3 text-white/35" aria-hidden />,
};

const STATE_TEXT: Record<RowState, string> = {
  locked: "text-white/40",
  waiting: "text-white/55",
  ok: "text-white/90",
  warn: "text-[#fde68a]",
  bad: "text-[#fca5a5]",
  crash: "text-[#fca5a5]",
  skip: "text-white/45",
};

function InspectionRow({ row, spot, flash }: { row: Row; spot: boolean; flash: boolean }) {
  if (row.state === "locked") {
    return (
      <li className={`rounded-lg border border-dashed px-2.5 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/12"}`}>
        <div className="flex min-w-0 items-center gap-2">
          {STATE_ICON.locked}
          <span className="hud-label min-w-0 flex-1 truncate">{row.title}</span>
          <span className="hud-label shrink-0 text-white/30">L{row.lesson}</span>
        </div>
        <p className="mt-1 truncate pl-5 font-mono text-[10px] text-white/35">
          {spot ? <span className="hud-accent">Your code powers this · </span> : null}
          {ROW_CLAUSE[row.id]}
        </p>
      </li>
    );
  }
  const crashed = row.state === "crash";
  return (
    <li
      className={`rounded-lg border px-2.5 py-2 ${flash ? "pop-in" : ""} ${crashed ? "border-[#f87171]/45 bg-[#f87171]/[0.08]" : spot ? "border-[#c5ee8a]/35 bg-white/[0.03]" : "border-white/[0.07] bg-white/[0.02]"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {STATE_ICON[row.state]}
        <span className="hud-label min-w-0 shrink-0 text-white/60">{row.title}</span>
        <span className="hud-value hud-muted ml-auto min-w-0 truncate text-[10px]" title={row.fn}>
          {row.fn}
        </span>
      </div>
      {row.text && <p className={`mt-1 break-words pl-5 text-[11px] leading-snug ${STATE_TEXT[row.state]} ${crashed ? "font-mono" : ""}`}>{row.text}</p>}
      {row.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-5">
          {row.tags.map((t, i) => (
            <span key={`${i}:${t}`} className="hud-tag h-auto max-w-full py-0.5 font-mono text-[9.5px] font-medium" title={t}>
              <span className="truncate">{t}</span>
            </span>
          ))}
        </div>
      )}
      {row.receipt && (
        <details className="mt-1.5 pl-5">
          <summary className="hud-label cursor-pointer select-none text-white/50 hover:text-white/80">Show receipt</summary>
          <pre className="mt-1 max-h-32 overflow-auto rounded-md bg-black/40 p-2 font-mono text-[10px] leading-[1.45] text-white/75">{row.receipt}</pre>
        </details>
      )}
    </li>
  );
}

// ───────────────────────── belt ─────────────────────────

const STEP = 62;

function Belt({ snap, alive, playing }: { snap: Snapshot; alive: boolean; playing: boolean }) {
  const items: { id: number; offset: number; label: string; kind: "next" | "now" | "done"; outcome?: Outcome; chaos: boolean }[] = [];
  snap.upcoming.forEach((c, i) => items.push({ id: c.id, offset: -(i + 1) * STEP, label: `#${c.id}`, kind: "next", chaos: c.kind === "chaos" }));
  if (snap.current) {
    items.push({ id: snap.current.crate.id, offset: 0, label: `#${snap.current.crate.id}`, kind: "now", outcome: snap.current.insp.outcome, chaos: snap.current.crate.kind === "chaos" });
  }
  snap.trail.forEach((t, i) => items.push({ id: t.id, offset: (i + 1) * STEP, label: `#${t.id}`, kind: "done", outcome: t.outcome, chaos: false }));

  const seen = new Set<number>();
  const unique = items.filter((it) => !seen.has(it.id) && !!seen.add(it.id));

  return (
    <div className={`relative h-[84px] overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.02] ${playing ? "" : "cc-paused"}`} aria-label="Conveyor belt">
      {/* belt surface */}
      <div
        className={`absolute inset-x-0 bottom-0 h-3 ${alive ? "cc-belt" : ""}`}
        style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 10px, transparent 10px 24px)", backgroundColor: "rgba(255,255,255,0.03)" }}
      />
      {/* scanner */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2">
        <div className={`mx-auto h-full w-px ${alive ? "cc-scan bg-[#c5ee8a]" : "bg-white/15"}`} />
        <span className={`hud-label absolute left-1/2 top-1 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-[#0a0a0a]/85 px-1.5 ${alive ? "text-[#d3f3a4]" : "text-white/35"}`}>
          <ScanLine className="h-3 w-3" aria-hidden />
          Scanner
        </span>
      </div>
      {alive ? (
        unique.map((it) => {
          const style = it.outcome && it.kind !== "next" ? OUTCOME[it.outcome] : null;
          return (
            <div
              key={it.id}
              className={`absolute bottom-[14px] flex h-[34px] w-[50px] items-center justify-center rounded-md border font-mono text-[10px] font-medium tabular-nums transition-[left,opacity] duration-300 ease-out ${
                style ? `${style.border} ${style.bg} ${style.text}` : "border-white/15 bg-white/[0.05] text-white/60"
              } ${it.chaos ? "border-dashed" : ""} ${it.kind === "done" ? "opacity-70" : ""}`}
              style={{ left: `calc(50% + ${it.offset}px)`, transform: "translateX(-50%)" }}
            >
              {it.label}
            </div>
          );
        })
      ) : (
        [-2, -1, 0, 1, 2].map((n) => (
          <div key={`ghost${n}`} className="absolute bottom-[14px] h-[34px] w-[50px] rounded-md border border-dashed border-white/15" style={{ left: `calc(50% + ${n * STEP}px)`, transform: "translateX(-50%)" }} />
        ))
      )}
    </div>
  );
}

// ───────────────────────── manifest viewer ─────────────────────────

function ManifestViewer({ insp }: { insp: Inspection }) {
  const view = viewManifest(insp.raw);
  const marked = new Map<number, string>();
  const missing: string[] = [];

  for (const f of insp.flags) {
    const path = f.field === "(root)" || f.field === "?" ? [] : f.field.split(".");
    const idx = path.length === 0 ? 0 : findKeyLine(view.lines, path);
    if (idx >= 0) marked.set(idx, f.text);
    else missing.push(f.field);
  }
  let caret: { line: number; column: number } | null = null;
  if (insp.parseAt && !view.pretty) {
    const at = insp.parseAt.line - 1;
    if (at >= 0 && at < view.lines.length) {
      marked.set(at, insp.readMessage ?? "invalid JSON");
      caret = { line: at, column: insp.parseAt.column };
    }
  }

  return (
    <>
      <div className="max-h-[236px] overflow-auto rounded-md bg-black/35 py-1.5 font-mono text-[10.5px] leading-[1.5]" role="region" aria-label="Manifest text">
        {view.lines.map((line, i) => {
          const hot = marked.has(i);
          return (
            <React.Fragment key={i}>
              <div className={`flex min-w-max ${hot ? "bg-[#f87171]/15" : ""}`} title={marked.get(i)}>
                <span className={`w-8 shrink-0 select-none pr-2 text-right ${hot ? "text-[#f87171]" : "text-white/25"}`}>{i + 1}</span>
                <span className={`whitespace-pre pr-3 ${hot ? "text-[#fecaca]" : "text-white/80"}`}>{line || " "}</span>
              </div>
              {caret && caret.line === i && (
                <div className="flex min-w-max bg-[#f87171]/15 text-[#f87171]">
                  <span className="w-8 shrink-0" />
                  <span className="whitespace-pre pr-3">{" ".repeat(Math.max(0, Math.min(caret.column - 1, 60))) + `^ line ${insp.parseAt?.line}, column ${insp.parseAt?.column}`}</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
        {view.clipped && <div className="pl-8 text-white/35">… {view.chars.toLocaleString("en-US")} characters in all</div>}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="hud-label">{view.pretty ? "valid JSON · pretty-printed" : "text as sent"}</span>
        {[...new Set(missing)].map((m, i) => (
          <span key={`${i}:${m}`} className="hud-tag hud-danger h-auto py-0.5 font-mono text-[9.5px]">
            {m}: missing or wrong
          </span>
        ))}
      </div>
    </>
  );
}

// ───────────────────────── scene ─────────────────────────

function Counter({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1.5">
      <div className="hud-label truncate">{label}</div>
      <div className={`hud-value text-sm ${tone}`}>{value}</div>
    </div>
  );
}

function Bay({ outcome, count, active }: { outcome: "LOAD" | "QUARANTINE" | "REJECT"; count: number; active: boolean }) {
  const o = OUTCOME[outcome];
  return (
    <div className={`min-w-0 rounded-lg border px-2 py-2 text-center transition-colors ${active ? `${o.border} ${o.bg}` : "border-white/[0.07] bg-white/[0.02]"}`}>
      <div className={`truncate text-[10px] font-semibold tracking-wide ${active ? o.text : "text-white/55"}`}>{o.label}</div>
      <div className={`hud-value text-base ${active ? o.text : "text-white/80"}`}>{count}</div>
    </div>
  );
}

function Depot({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const alive = !!program && unlocked.has("cc-gate");
  const [sim] = useState(() => new DepotSim(program, unlocked, true));
  const snap = useSyncExternalStore(sim.subscribe, sim.getSnapshot, sim.getSnapshot);
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(SAMPLE_OWN[1].raw);
  const [ownOpen, setOwnOpen] = useState(false);

  useEffect(() => {
    if (alive) sim.start();
    return () => sim.stop();
  }, [sim, alive]);

  // Pause the belt while the stage is scrolled away or hidden (routes are kept alive hidden).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => sim.setVisible(entries.some((e) => e.isIntersecting)));
    io.observe(el);
    return () => io.disconnect();
  }, [sim]);

  const flashing = new Set(celebration?.features ?? []);
  const flashRow = (id: RowId) => [...flashing].some((f) => FOCUS_ROW[f] === id);
  const focusRow = focus ? FOCUS_ROW[focus] : undefined;
  const cur = snap.current;
  const insp = cur?.insp ?? null;
  const routingOn = unlocked.has("cc-routing") || unlocked.has("cc-chaos");
  const showControls = interactive && alive;
  const c: Counts = snap.counts;

  const rows: Row[] = insp && insp.rows.length > 0 ? insp.rows : blueprintRows();
  const routeFn = rows.find((r) => r.id === "final")?.state !== "locked" ? "process_manifest()" : "triage()";

  const verdict = insp ? OUTCOME[insp.outcome] : null;
  const chaos = snap.chaos;
  const chaosDone = chaos ? chaos.done >= chaos.sent : false;
  const maxErr = Math.max(1, ...snap.errors.map((e) => e.count));

  return (
    <div ref={rootRef} className="@container absolute inset-0 overflow-y-auto overscroll-contain">
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        {/* title + controls */}
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Harbour depot · Gate 7</h2>
          <span className="hud-label shrink-0">
            <span className={`hud-value ${alive ? "hud-accent" : "text-white/45"}`}>{c.processed}</span> crates scanned
          </span>
          {showControls && (
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button type="button" className="hud-btn !h-7 !px-2.5 text-[11px]" disabled={!alive} onClick={() => sim.setPlaying(!snap.playing)} aria-label={snap.playing ? "Pause the belt" : "Run the belt"}>
                {snap.playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {snap.playing ? "Pause" : "Run"}
              </button>
              <button type="button" className="hud-btn !h-7 !px-2.5 text-[11px]" disabled={!alive || !!snap.halted} onClick={() => sim.next()} aria-label="Send the next crate">
                <SkipForward className="h-3 w-3" />
                Next
              </button>
              <button type="button" className="hud-btn hud-btn-on !h-7 !px-2.5 text-[11px] disabled:opacity-40" disabled={!alive || !!snap.halted} onClick={() => sim.throwChaos()} aria-label="Throw chaos at the gate">
                <Wind className="h-3 w-3" />
                Throw chaos
              </button>
            </div>
          )}
        </div>

        {snap.halted && (
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-[#f87171]/50 bg-[#f87171]/10 px-3 py-2" role="alert">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#f87171]" aria-hidden />
            <p className="min-w-0 flex-1 text-[11px] leading-snug text-[#fecaca]">
              <strong className="font-semibold">Gate down.</strong> <span className="font-mono">{snap.halted}</span>: nothing catches it, so the belt stopped. Lesson 2 fixes this.
            </p>
            <button type="button" className="hud-btn !h-7 !px-2.5 text-[11px]" onClick={() => sim.reboot()}>
              <RotateCcw className="h-3 w-3" />
              Reboot gate
            </button>
          </div>
        )}

        {chaos && !snap.halted && (
          <div
            className={`mb-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] ${
              chaosDone ? (chaos.crashed === 0 ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/10 text-[#e0f6c1]" : "border-[#f87171]/45 bg-[#f87171]/10 text-[#fecaca]") : "border-white/10 bg-white/[0.03] text-white/80"
            }`}
            role="status"
          >
            <Wind className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              {chaosDone
                ? chaos.crashed === 0
                  ? `Chaos survived: ${chaos.sent} malformed crates, 0 crashes.`
                  : `Chaos test: ${chaos.crashed} of ${chaos.sent} crates crashed your code. Read the red rows.`
                : `Chaos incoming: ${chaos.done} of ${chaos.sent} handled · ${chaos.crashed} crashes`}
            </span>
          </div>
        )}

        {/* belt */}
        <div className="mb-3">
          <Belt snap={snap} alive={alive} playing={snap.playing && !snap.halted} />
          <p className="mt-1.5 truncate px-0.5 font-mono text-[10px] text-white/45">
            {cur ? (
              <>
                #{cur.crate.id} · <span className="text-white/70">{cur.crate.label}</span>
                {cur.crate.kind === "chaos" && <span className="hud-warning"> · chaos</span>}
              </>
            ) : alive ? (
              "waiting for the first crate…"
            ) : (
              "Run your code to open the gate"
            )}
          </p>
        </div>

        <div className="gap-3 @2xl:columns-2 @6xl:columns-3">
          {/* manifest */}
          {alive ? (
            <Panel title="Manifest" icon={<FeatureIcon id="cc-gate" className="h-3.5 w-3.5" />} meta={cur ? `#${cur.crate.id}` : undefined} flash={flashing.has("cc-gate")}>
              {insp ? <ManifestViewer insp={insp} /> : <GhostLines widths={[40, 80, 62, 70, 30]} />}
            </Panel>
          ) : (
            <LockedPanel title="Manifest" lesson={1} clause="raw JSON text from the gate" spot={focus === "cc-gate"}>
              <GhostLines widths={[40, 80, 62, 70, 30]} />
            </LockedPanel>
          )}

          {/* verdict */}
          {routingOn ? (
            <Panel title="Routing bays" icon={<FeatureIcon id="cc-routing" className="h-3.5 w-3.5" />} meta={insp ? routeFn : undefined} focus={focus === "cc-routing"} flash={flashing.has("cc-routing")}>
              <div className="grid grid-cols-3 gap-1.5">
                <Bay outcome="LOAD" count={c.LOAD} active={insp?.outcome === "LOAD"} />
                <Bay outcome="QUARANTINE" count={c.QUARANTINE} active={insp?.outcome === "QUARANTINE"} />
                <Bay outcome="REJECT" count={c.REJECT} active={insp?.outcome === "REJECT"} />
              </div>
              {insp && verdict ? (
                <div className="mt-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold tracking-wide ${verdict.border} ${verdict.bg} ${verdict.text}`}>{verdict.label}</span>
                    {insp.errorType && <span className="hud-tag h-5 font-mono text-[9.5px]">{insp.errorType}</span>}
                    {insp.reasons.length === 0 && insp.outcome === "LOAD" && <span className="text-[11px] text-white/55">all clear</span>}
                  </div>
                  {insp.reasons.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1">
                      {insp.reasons.slice(0, 6).map((r, i) => (
                        <li key={`${i}:${r}`} className="hud-tag h-auto max-w-full py-0.5 text-[9.5px] font-medium" title={r}>
                          <span className="truncate">{r}</span>
                        </li>
                      ))}
                      {insp.reasons.length > 6 && <li className="hud-label self-center">+{insp.reasons.length - 6} more</li>}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-white/45">Waiting for a crate…</p>
              )}
            </Panel>
          ) : (
            <LockedPanel title="Routing bays" lesson={4} clause="LOAD · QUARANTINE · REJECT" spot={focus === "cc-routing"}>
              <div className="grid grid-cols-3 gap-1.5">
                {["LOAD", "QUARANTINE", "REJECT"].map((l, i) => (
                  <div key={`${i}:${l}`} className="rounded-lg border border-dashed border-white/12 px-2 py-2 text-center text-[10px] tracking-wide text-white/30">
                    {l}
                  </div>
                ))}
              </div>
            </LockedPanel>
          )}

          {/* inspection */}
          <Panel title="Inspection" icon={<ScanLine className="h-3.5 w-3.5" />} meta={insp ? `${rows.filter((r) => r.state !== "locked").length}/${rows.length} stages live` : undefined}>
            <ul className="space-y-1.5">
              {rows.map((r) => (
                <InspectionRow key={flashRow(r.id) ? `${r.id}:${celebration?.nonce}` : r.id} row={r} spot={focusRow === r.id} flash={flashRow(r.id)} />
              ))}
            </ul>
          </Panel>

          {/* tally */}
          {alive ? (
            <Panel title="Depot tally" icon={<FeatureIcon id="cc-tally" className="h-3.5 w-3.5" />} meta={unlocked.has("cc-tally") ? "by error type" : undefined} focus={focus === "cc-tally"} flash={flashing.has("cc-tally")}>
              <div className="grid grid-cols-3 gap-1.5 @md:grid-cols-5">
                <Counter label="Scanned" value={c.processed} />
                <Counter label="Loaded" value={c.LOAD} tone={c.LOAD ? "hud-accent" : ""} />
                <Counter label="Held" value={c.QUARANTINE} tone={c.QUARANTINE ? "hud-warning" : ""} />
                <Counter label="Rejected" value={c.REJECT} tone={c.REJECT ? "hud-danger" : ""} />
                <Counter label="Crashes" value={c.crashed} tone={c.crashed ? "hud-danger" : "hud-accent"} />
              </div>
              {unlocked.has("cc-tally") ? (
                <div className="mt-2.5">
                  {snap.errors.length === 0 ? (
                    <p className="text-[11px] text-white/45">No errors yet. Everything has been clean so far.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {snap.errors.map((e, i) => (
                        <li key={`${i}:${e.uncaught ? "!" : ""}${e.name}`} className="min-w-0">
                          <div className="flex min-w-0 items-baseline gap-2 text-[10.5px]">
                            <span className={`min-w-0 flex-1 truncate font-mono ${e.uncaught ? "hud-danger" : "text-white/80"}`}>{e.name}</span>
                            {e.uncaught && <span className="hud-label hud-danger shrink-0">uncaught</span>}
                            <span className="hud-value shrink-0 text-white/60">{e.count}</span>
                          </div>
                          <div className={`hud-bar mt-0.5 ${e.uncaught ? "" : "hud-bar-neutral"}`}>
                            <span style={{ width: `${(e.count / maxErr) * 100}%`, background: e.uncaught ? "#f87171" : undefined }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="mt-2 truncate font-mono text-[10px] text-white/35">{focus === "cc-tally" ? <span className="hud-accent">Your code powers this · </span> : "Error breakdown · L3"}weigh_crate() outcomes</p>
              )}
            </Panel>
          ) : (
            <LockedPanel title="Depot tally" lesson={3} clause="errors counted by type" spot={focus === "cc-tally"}>
              <GhostLines widths={[88, 64, 40, 26]} />
            </LockedPanel>
          )}

          {/* ops log */}
          {unlocked.has("cc-oplog") ? (
            <Panel title="Operations log" icon={<FeatureIcon id="cc-oplog" className="h-3.5 w-3.5" />} meta="log_lines()" focus={focus === "cc-oplog"} flash={flashing.has("cc-oplog")}>
              {insp?.logLines && insp.logLines.length > 0 ? (
                <div className="hud-log max-h-40 overflow-auto text-[10.5px]">
                  {insp.logLines.map((l, i) => (
                    <div key={`${i}:${l}`} className="hud-log-line truncate" title={l}>
                      {l}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="hud-log hud-muted py-1 text-[11px]">No log lines yet. Use log.info / warning / error and read them back with log_lines().</p>
              )}
            </Panel>
          ) : (
            <LockedPanel title="Operations log" lesson={13} clause="logging · handlers · levels" spot={focus === "cc-oplog"}>
              <GhostLines widths={[72, 58, 80, 46]} />
            </LockedPanel>
          )}

          {/* audit trail */}
          {insp && insp.audit.length > 0 && (
            <Panel title="Audit trail" icon={<FeatureIcon id="cc-audit" className="h-3.5 w-3.5" />} meta={insp.baysHeld !== null ? `${insp.baysHeld} bay${insp.baysHeld === 1 ? "" : "s"} stuck open` : undefined} flash={flashing.has("cc-audit")}>
              <ul className="space-y-1 font-mono text-[10.5px]">
                {insp.audit.map((a, i) => (
                  <li key={`${i}:${a.crate}`} className="flex min-w-0 gap-2">
                    <span className="min-w-0 flex-1 truncate text-white/75">{a.crate}</span>
                    <span className={`shrink-0 ${a.status === "closed" ? "hud-accent" : "hud-warning"}`}>{a.status}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* send your own */}
          {showControls && alive && (
            <Panel title="Send your own manifest" icon={<Send className="h-3.5 w-3.5" />} meta={<button type="button" className="hud-label hover:text-white" onClick={() => setOwnOpen((v) => !v)}>{ownOpen ? "hide" : "open"}</button>}>
              {ownOpen ? (
                <>
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {SAMPLE_OWN.map((s, i) => (
                      <button key={`${i}:${s.label}`} type="button" className="hud-btn !h-6 !px-2 text-[10px]" onClick={() => setDraft(s.raw)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 6000))}
                    spellCheck={false}
                    rows={7}
                    aria-label="Manifest text to send"
                    className="w-full resize-y rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[10.5px] leading-[1.45] text-white/85 outline-none focus:border-[#c5ee8a]/50"
                  />
                  <button type="button" className="hud-btn hud-btn-on mt-1.5 !h-7 !px-3 text-[11px] disabled:opacity-40" disabled={!!snap.halted} onClick={() => sim.send(draft)}>
                    <Send className="h-3 w-3" />
                    Send to the gate
                  </button>
                </>
              ) : (
                <p className="text-[11px] text-white/45">Type any manifest, valid or not, and watch your code handle it.</p>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CargoControlScene(props: SceneProps) {
  const { program, unlocked } = props;
  const alive = !!program && unlocked.has("cc-gate");
  // A new run or a newly unlocked feature starts a fresh shift (new belt, new counters).
  const shift = alive ? `${program.generation}:${[...unlocked].sort().join(",")}` : "blueprint";
  return <Depot key={shift} {...props} />;
}
