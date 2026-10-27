"use client";

import React, { useEffect, useState } from "react";
import type { SceneProps } from "@/engine/scene";
import { CONSOLE_ID, PANELS, SCENE_KEYS, outputLines, readAny, readPeak, tileValue, type Panel, type Peak } from "./data";
import { ConsolePanel, CompilerPanel } from "./console";
import { ChipGrid, ErrorStrip, OutputStrip, OVERVIEW_H, OVERVIEW_W } from "./overview";
import { ErrorFunnel, ErrorLedger, InputBuffer, LifetimeScopes, ModuleMap, ParsePipeline } from "./panels1";
import { AdaptorChain, Aggregates, DriftScan, InstrumentRack, LineDesk, ReportCards } from "./panels2";
import { IntakeBench, NightReport, SortDesk, TestResults } from "./panels3";
import { SkyChart } from "./sky";
import { CSS, Frame, LockedPanel, WaitingPanel, type GhostKind } from "./ui";

/**
 * Corvid Peak Observatory: the live board for the Corvid Peak course (Rust, Intermediate).
 *
 * Rust runs through the compiled-language path, so the board can't call the program back. It draws what
 * the program printed: stdout for the console, and every `scene("key", value)` line (an `@scene {json}`
 * line) for the panels. A failed build arrives as `build_error` ({ type, message, line }) and is
 * explained by the compiler panel. Each panel is a dashed ghost until its lesson is passed, and shows an
 * "unlocked, press Run" hint when nothing has been built on this page yet.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's code produced, blue for text borrowed from the buffer, amber for caution, red for failures.
 */

const GHOST: Record<string, GhostKind> = {
  "ob-buffer": "text",
  "ob-lifetimes": "scopes",
  "ob-records": "pipeline",
  "ob-modules": "tree",
  "ob-variants": "cards",
  "ob-funnel": "funnel",
  "ob-lines": "rows",
  "ob-closures": "cards",
  "ob-chain": "stages",
  "ob-groups": "tiles",
  "ob-sweep": "ruler",
  "ob-cards": "table",
  "ob-order": "ranking",
  "ob-tests": "tests",
  "ob-intake": "strip",
  "ob-report": "report",
};

function panelBody(id: string, peak: Peak, interactive: boolean, liveCount: number): React.ReactNode {
  switch (id) {
    case "ob-buffer":
      return <InputBuffer s={peak} interactive={interactive} />;
    case "ob-lifetimes":
      return <LifetimeScopes s={peak} />;
    case "ob-records":
      return <ParsePipeline s={peak} interactive={interactive} />;
    case "ob-modules":
      return <ModuleMap s={peak} />;
    case "ob-variants":
      return <ErrorLedger s={peak} />;
    case "ob-funnel":
      return <ErrorFunnel s={peak} />;
    case "ob-lines":
      return <LineDesk s={peak} interactive={interactive} />;
    case "ob-closures":
      return <InstrumentRack s={peak} />;
    case "ob-chain":
      return <AdaptorChain s={peak} />;
    case "ob-groups":
      return <Aggregates s={peak} />;
    case "ob-sweep":
      return <DriftScan s={peak} />;
    case "ob-cards":
      return <ReportCards s={peak} />;
    case "ob-order":
      return <SortDesk s={peak} interactive={interactive} />;
    case "ob-tests":
      return <TestResults s={peak} />;
    case "ob-intake":
      return <IntakeBench s={peak} interactive={interactive} />;
    default:
      return <NightReport s={peak} liveCount={liveCount} total={PANELS.length} />;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function CorvidPeakScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const peak = readPeak(program);
  const flashing = new Set(celebration?.features ?? []);
  const failed = peak.error !== null;
  const liveCount = PANELS.filter((p) => unlocked.has(p.id)).length;
  const allLive = liveCount === PANELS.length;
  const generation = program?.generation ?? 0;
  const built = !!program;

  // Which panel is pulled up next to the console. A fresh unlock wins, then the lesson's panel, then the
  // newest live one. With autoplay (the landing page) the board tours the live panels itself.
  const [tour, setTour] = useState(0);
  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => setTour((n) => n + 1), 3400);
    return () => clearInterval(id);
  }, [autoplay]);

  const livePanels = PANELS.filter((p) => unlocked.has(p.id));
  const newest = livePanels.length > 0 ? livePanels[livePanels.length - 1].id : null;
  const fresh = celebration?.features.find((f) => PANELS.some((p) => p.id === f)) ?? null;
  const touring = autoplay && livePanels.length > 0 ? livePanels[tour % livePanels.length].id : null;
  const selectedId = touring ?? fresh ?? (focus && PANELS.some((p) => p.id === focus) ? focus : null) ?? newest;

  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];

  const skyStatus = !unlocked.has("ob-records") ? "locked" : !built || failed ? "waiting" : "live";
  const sky = (compact: boolean) => (
    <SkyChart
      key={flashing.has("ob-records") ? `sky:${celebration?.nonce}` : "sky"}
      records={peak.records}
      status={skyStatus}
      focus={focus === "ob-records"}
      flash={flashing.has("ob-records")}
      compact={compact}
      generation={generation}
      note={failed && unlocked.has("ob-records") ? "Fix the build error, then press Run." : undefined}
    />
  );

  const renderPanel = (p: Panel) => {
    const kind = GHOST[p.id] ?? "text";
    if (!unlocked.has(p.id)) {
      return <LockedPanel key={p.id} id={p.id} title={p.title} kind={kind} lesson={p.lesson} clause={p.clause} spot={focus === p.id} className="mb-3 break-inside-avoid" />;
    }
    if (!program) return <WaitingPanel key={p.id} id={p.id} title={p.title} kind={kind} lesson={p.lesson} className="mb-3 break-inside-avoid" />;
    const body = failed ? (
      <p className="hud-log py-1 text-[11px] !text-white/60">Waiting for a successful build. Fix the error and press Run.</p>
    ) : (
      panelBody(p.id, peak, interactive, liveCount)
    );
    return (
      <Frame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        meta={failed ? undefined : tileValue(p.id, peak)}
        focus={focus === p.id}
        flash={flashing.has(p.id)}
        className="mb-3 break-inside-avoid"
      >
        {body}
      </Frame>
    );
  };

  const consoleLocked = !unlocked.has(CONSOLE_ID);
  const consolePanel = (
    <ConsolePanel
      key="ob-console"
      stdout={program?.stdout ?? ""}
      built={built}
      error={peak.error}
      keys={keys}
      live={built}
      interactive={interactive}
      focus={focus === CONSOLE_ID}
      flash={flashing.has(CONSOLE_ID)}
      locked={consoleLocked}
    />
  );

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="flex min-w-0 shrink-0 items-baseline gap-3 px-0.5">
            <h2 className="hud-title !text-[14px]">Corvid Peak Observatory</h2>
            <span className={`hud-label min-w-0 truncate !text-[11px] ${failed ? "hud-danger" : "!text-white/65"}`}>· {failed ? "Build failed" : built ? "Build OK" : "Idle"}</span>
            <span className="hud-label ml-auto shrink-0 !text-[11px]">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/55"}`}>{liveCount}</span>/{PANELS.length} panels live
            </span>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-2.5">
            <div className="relative min-h-0 min-w-0">
              <div className="absolute inset-0 [&>section]:h-full">{sky(true)}</div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
              {peak.error ? <ErrorStrip error={peak.error} /> : null}
              <OutputStrip lines={outputLines(program?.stdout ?? "")} built={built} locked={consoleLocked} />
              {allLive && !peak.error && peak.report?.accepted !== undefined && (
                <div className="hud-panel !px-3 !py-2 text-[11px]">
                  <span className="hud-title !text-[#d3f3a4]">Night report filed</span>
                  <p className="mt-0.5 text-white/75">
                    {peak.report.accepted} stars accepted, {peak.report.rejected ?? 0} lines rejected{peak.report.nearest ? `, nearest ${peak.report.nearest}` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
          <ChipGrid peak={peak} unlocked={unlocked} built={built} focus={focus} flashing={flashing} />
        </div>
      </div>
    );
  }

  // The parse pipeline already has the sky chart as its hero, so it stays in the grid below.
  const selected = PANELS.find((p) => p.id === selectedId && p.id !== "ob-records") ?? null;
  const rest = PANELS.filter((p) => p.id !== selected?.id);

  return (
    <div ref={measure} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Corvid Peak Observatory</h2>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/55"}`}>{liveCount}</span>/{PANELS.length} panels live
          </span>
        </div>
        {sky(false)}
        <div className="mt-3 grid gap-3 @4xl:grid-cols-2 @4xl:items-start">
          <div className="flex min-w-0 flex-col gap-3">
            {peak.error && <CompilerPanel error={peak.error} />}
            {consolePanel}
          </div>
          {selected && <div className="min-w-0 [&>section]:mb-0">{renderPanel(selected)}</div>}
        </div>
        <div className="mt-3 gap-3 @xl:columns-2 @4xl:columns-3">{rest.map(renderPanel)}</div>
      </div>
    </div>
  );
}
