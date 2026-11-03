"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { outputLines } from "../cpp-basics/data";
import { CSS as BASE_CSS, Chip, Frame, Lamp, LockedPanel, WaitingPanel, type GhostKind } from "../cpp-basics/ui";
import { ErrorBlock } from "../cpp-memory/console";
import { readBay, type Bay } from "./data";
import { Algorithms, Bus, Cutters, Cycles, Deduction, ENGINE_CSS, Gatehouse, Hierarchy, Lambdas, Ledger, Logbooks, Owners, Queue, Report, Strategy, Variants, Vtable } from "./panels";

/**
 * Lantern Bay: the harbour office board for the C++ Advanced course.
 *
 * C++ cannot be called back, so the board draws what the program printed: stdout for the console and the values sent
 * with scene("name", value) for the sixteen panels. Each system is a dashed ghost until its lesson is passed, and a
 * "press Run" hint when it is unlocked but nothing has been built on this page yet. A failed build arrives as a
 * `build_error` value and is shown on the console with its line number and a plain-language hint.
 */

interface PanelSpec {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
  /** Scene keys that make the panel's status chip say "has data". */
  keys: string[];
}

const PANELS: PanelSpec[] = [
  { id: "en-cutters", title: "Cookie cutters", lesson: 1, clause: "template <typename T> · instantiation", ghost: "tiles", keys: ["stamps"] },
  { id: "en-logbooks", title: "Logbooks", lesson: 2, clause: "class templates", ghost: "cards", keys: ["bookTypes"] },
  { id: "en-deduction", title: "Deduction desk", lesson: 3, clause: "deduction · explicit <T> · N", ghost: "rows", keys: ["deducedTypes"] },
  { id: "en-gatehouse", title: "Gatehouse", lesson: 4, clause: "concepts · requires", ghost: "pills", keys: ["gateChecks"] },
  { id: "en-queue", title: "Berth queue", lesson: 5, clause: "deque · iterators", ghost: "chain", keys: ["queueNow"] },
  { id: "en-ledger", title: "Ledger", lesson: 6, clause: "map · unordered_map · set", ghost: "bars", keys: ["tonsByPort"] },
  { id: "en-algorithms", title: "Algorithm bench", lesson: 7, clause: "sort · find_if · accumulate", ghost: "chart", keys: ["sortedLumens"] },
  { id: "en-lambdas", title: "Lambda bench", lesson: 8, clause: "[capture](args) { body }", ghost: "columns", keys: ["dimByReference"] },
  { id: "en-strategy", title: "Flash plans", lesson: 9, clause: "std::function · strategy", ghost: "bars", keys: ["planShapes"] },
  { id: "en-bus", title: "Event bus", lesson: 10, clause: "observer · subscribe · publish", ghost: "loops", keys: ["busLog"] },
  { id: "en-vtable", title: "Vtable", lesson: 11, clause: "virtual · override", ghost: "columns", keys: ["viaBaseSignals"] },
  { id: "en-hierarchy", title: "Hierarchy", lesson: 12, clause: "abstract · final · slicing", ghost: "cards", keys: ["abstractness"] },
  { id: "en-owners", title: "Owners", lesson: 13, clause: "shared_ptr · use_count", ghost: "chain", keys: ["useCounts"] },
  { id: "en-cycles", title: "Cycles", lesson: 14, clause: "weak_ptr · reference cycles", ghost: "loops", keys: ["cycleCounts"] },
  { id: "en-variants", title: "Report desk", lesson: 15, clause: "optional · variant · visit", ghost: "pills", keys: ["reportLines", "lookups"] },
  { id: "en-report", title: "Night report", lesson: 16, clause: "the whole engine together", ghost: "log", keys: ["nightLines"] },
];

function PanelBody({ id, bay, autoplay }: { id: string; bay: Bay; autoplay: boolean }) {
  const s = bay.scalars;
  switch (id) {
    case "en-cutters":
      return <Cutters s={s} />;
    case "en-logbooks":
      return <Logbooks s={s} />;
    case "en-deduction":
      return <Deduction s={s} />;
    case "en-gatehouse":
      return <Gatehouse s={s} />;
    case "en-queue":
      return <Queue s={s} />;
    case "en-ledger":
      return <Ledger s={s} />;
    case "en-algorithms":
      return <Algorithms s={s} />;
    case "en-lambdas":
      return <Lambdas s={s} />;
    case "en-strategy":
      return <Strategy s={s} />;
    case "en-bus":
      return <Bus s={s} autoplay={autoplay} />;
    case "en-vtable":
      return <Vtable s={s} />;
    case "en-hierarchy":
      return <Hierarchy s={s} />;
    case "en-owners":
      return <Owners s={s} autoplay={autoplay} />;
    case "en-cycles":
      return <Cycles s={s} />;
    case "en-variants":
      return <Variants s={s} />;
    default:
      return <Report s={s} />;
  }
}

function safeJson(v: unknown): string {
  try {
    const t = JSON.stringify(v);
    return t === undefined ? String(v) : t;
  } catch {
    return String(v);
  }
}

function HarbourConsole({ bay, built, interactive, className = "" }: { bay: Bay; built: boolean; interactive: boolean; className?: string }) {
  const [tab, setTab] = React.useState<"output" | "data">("output");
  const lines = outputLines(bay.stdout);
  const keys = Object.keys(bay.scalars);
  const compileFailed = bay.error?.type === "CompileError";
  const status = !built ? "Idle" : bay.error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const tone = !built ? "text-white/45" : bay.error ? "hud-danger border-[#f87171]/40" : "hud-accent";
  return (
    <section data-panel="en-console" className={`hud-panel min-w-0 px-3 py-2.5 ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <h3 className="hud-title min-w-0 flex-1 truncate">Harbour console</h3>
        <span className={`hud-tag shrink-0 ${tone}`}>{status}</span>
      </header>
      {bay.error && <ErrorBlock error={bay.error} />}
      <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Console view">
        <Chip active={tab === "output"} onClick={() => setTab("output")}>
          Output{lines.length > 0 ? ` · ${lines.length}` : ""}
        </Chip>
        <Chip active={tab === "data"} onClick={() => setTab("data")}>
          Board data{keys.length > 0 ? ` · ${keys.length}` : ""}
        </Chip>
      </div>
      <div className={`rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] ${interactive ? "max-h-56 overflow-auto" : "max-h-32 overflow-hidden"}`}>
        {tab === "output" ? (
          !built ? (
            <p className="hud-muted">Press Run to build and run your program (a few seconds).</p>
          ) : lines.length === 0 ? (
            <p className="hud-muted">{bay.error ? "Nothing was printed before the problem." : "Nothing printed. The panels draw what you send with scene(...)."}</p>
          ) : (
            lines.map((l, i) => (
              <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                {l === "" ? " " : l}
              </div>
            ))
          )
        ) : keys.length === 0 ? (
          <p className="hud-muted">{built ? 'Nothing sent yet. Use scene("name", value);' : "Run your program to see what it sent to the board."}</p>
        ) : (
          <dl className="space-y-0.5">
            {keys.map((k) => (
              <div key={k} className="flex min-w-0 gap-2">
                <dt className="shrink-0 text-white/45">{k}</dt>
                <dd className="hud-accent min-w-0 flex-1 truncate" title={safeJson(bay.scalars[k])}>
                  {safeJson(bay.scalars[k])}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

export default function LanternBayScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const bay = readBay(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = bay.error?.type === "CompileError";
  const liveCount = PANELS.filter((p) => unlocked.has(p.id)).length;
  const generation = program?.generation ?? 0;
  const filled = PANELS.filter((p) => unlocked.has(p.id) && p.keys.some((k) => bay.scalars[k] !== undefined)).length;
  const stateLabel = bay.error ? "Fault" : program ? "Build OK" : "Idle";
  const cardClass = "mb-3 break-inside-avoid";

  const renderPanel = (spec: PanelSpec) => {
    if (!unlocked.has(spec.id)) {
      return <LockedPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} clause={spec.clause} spot={focus === spec.id} className={cardClass} />;
    }
    if (!program) return <WaitingPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} className={cardClass} />;
    return (
      <Frame
        key={flashing.has(spec.id) ? `${spec.id}:${celebration?.nonce}` : spec.id}
        id={spec.id}
        title={spec.title}
        icon={<FeatureIcon id={spec.id} className="h-3.5 w-3.5" />}
        focus={focus === spec.id}
        flash={flashing.has(spec.id)}
        className={cardClass}
      >
        {compileFailed ? <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p> : <PanelBody key={generation} id={spec.id} bay={bay} autoplay={!!autoplay} />}
      </Frame>
    );
  };

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id);

  return (
    <div className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{BASE_CSS + ENGINE_CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 px-0.5">
          <div className="flex min-w-0 items-baseline gap-x-3 gap-y-0.5">
            <h2 className="hud-title min-w-0 truncate">Lantern Bay harbour office</h2>
            <span className="hud-label ml-auto shrink-0">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{PANELS.length} systems live
            </span>
          </div>
          <div className="mt-1.5 flex min-w-0 items-center gap-2 border-t border-white/10 pt-1.5">
            <Lamp on={program ? true : undefined} bad={!!bay.error} />
            <span className={`hud-label min-w-0 truncate ${bay.error ? "hud-danger" : "text-white/55"}`}>{stateLabel}</span>
            {program && !bay.error && filled > 0 && <span className="hud-value ml-auto shrink-0 text-[10.5px] text-white/55">{filled} drawn from your output</span>}
          </div>
        </div>
        <div className="gap-3 @2xl:columns-2 @6xl:columns-3">
          {focused && renderPanel(focused)}
          {rest.map((p) => renderPanel(p))}
          <HarbourConsole bay={bay} built={!!program} interactive={interactive} className={cardClass} />
        </div>
      </div>
    </div>
  );
}
