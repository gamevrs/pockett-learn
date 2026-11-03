"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { readAny, readBoard, SCENE_KEYS, type Board } from "./data";
import {
  CancelCard,
  Calibration,
  Lanes,
  ConsolePanel,
  DeadlineBoard,
  FanCard,
  GroupCard,
  GuardedTally,
  PeakKeeper,
  PoolCard,
  RaceReplay,
  ShutdownCard,
  StageLine,
  Stream,
  Switchboard,
  TickChart,
  Waiting,
} from "./panels";
import { ErrorStrip, Overview, OVERVIEW_H, OVERVIEW_W } from "./overview";
import { Frame, LockedPanel, WaitingPanel, type GhostKind } from "../go-inventory/ui";

/**
 * Tidewatch harbour board: the live scene for the Go Advanced course.
 *
 * Go runs on the pockett runner, so the board can't call the program back. It draws what the program
 * printed: stdout for the console, and every `scene("key", value)` line for the panels. A failed build
 * arrives as a `build_error` value and is shown on the console with its line number. Each panel is a
 * blueprint until its lesson is passed, and shows a "press Run" hint when it is unlocked but nothing has
 * been built on this page yet. Short, wide stages (the project hub, the landing page) get the one-screen
 * overview.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's code produced, amber for caution, red for failures.
 */

interface PanelSpec {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
}

const PANELS: PanelSpec[] = [
  { id: "gp-lanes", title: "Buoy lanes", lesson: 1, clause: "go · sync.WaitGroup", ghost: "bars" },
  { id: "gp-stream", title: "Stream hatch", lesson: 2, clause: "chan · close · range", ghost: "chips" },
  { id: "gp-queue", title: "Waiting room", lesson: 3, clause: "make(chan T, n) · len · cap", ghost: "tiles" },
  { id: "gp-select", title: "Switchboard", lesson: 4, clause: "select · default", ghost: "chips" },
  { id: "gp-race", title: "Race replay", lesson: 5, clause: "lost update · interleaving", ghost: "rows" },
  { id: "gp-tally", title: "Guarded tally", lesson: 6, clause: "sync.Mutex", ghost: "bars" },
  { id: "gp-once", title: "Calibration desk", lesson: 7, clause: "sync.Once · atomic", ghost: "tiles" },
  { id: "gp-owner", title: "Peak keeper", lesson: 8, clause: "one owner goroutine", ghost: "bars" },
  { id: "gp-pipeline", title: "Stage line", lesson: 9, clause: "<-chan T in, <-chan T out", ghost: "cards" },
  { id: "gp-pool", title: "Worker pool", lesson: 10, clause: "jobs · results · index", ghost: "cards" },
  { id: "gp-fan", title: "Fan-in", lesson: 11, clause: "merge · spread", ghost: "bars" },
  { id: "gp-gantt", title: "Tick chart", lesson: 12, clause: "logical ticks · queue depth", ghost: "bars" },
  { id: "gp-cancel", title: "Cancelled work", lesson: 13, clause: "context.WithCancel", ghost: "chips" },
  { id: "gp-deadline", title: "Deadline board", lesson: 14, clause: "context.WithTimeout", ghost: "rows" },
  { id: "gp-group", title: "Error group", lesson: 15, clause: "first error · errors.Join", ghost: "cards" },
  { id: "gp-shutdown", title: "Shutdown report", lesson: 16, clause: "drain, then stop", ghost: "tiles" },
];

const ALL_IDS = ["gp-console", ...PANELS.map((p) => p.id)];

function panelBody(id: string, b: Board): React.ReactNode {
  switch (id) {
    case "gp-lanes":
      return <Lanes d={b} />;
    case "gp-stream":
      return <Stream d={b} />;
    case "gp-queue":
      return <Waiting d={b} />;
    case "gp-select":
      return <Switchboard d={b} />;
    case "gp-race":
      return <RaceReplay d={b} />;
    case "gp-tally":
      return <GuardedTally d={b} />;
    case "gp-once":
      return <Calibration d={b} />;
    case "gp-owner":
      return <PeakKeeper d={b} />;
    case "gp-pipeline":
      return <StageLine d={b} />;
    case "gp-pool":
      return <PoolCard d={b} />;
    case "gp-fan":
      return <FanCard d={b} />;
    case "gp-gantt":
      return <TickChart d={b} />;
    case "gp-cancel":
      return <CancelCard d={b} />;
    case "gp-deadline":
      return <DeadlineBoard d={b} />;
    case "gp-group":
      return <GroupCard d={b} />;
    default:
      return <ShutdownCard d={b} />;
  }
}

/** A short count shown in each card header, when the card has something to count. */
function panelMeta(id: string, b: Board): string | undefined {
  switch (id) {
    case "gp-lanes":
      return b.lanes ? `${b.lanes.length} lanes` : undefined;
    case "gp-queue":
      return b.queue?.cap !== undefined ? `cap ${b.queue.cap}` : undefined;
    case "gp-race":
      return b.lostRuns !== undefined ? `${b.lostRuns} lost` : undefined;
    case "gp-pool":
      return b.pool?.workers !== undefined ? `${b.pool.workers} workers` : undefined;
    case "gp-fan":
      return b.fan?.total !== undefined ? `${b.fan.total} readings` : undefined;
    case "gp-gantt":
      return b.ticks?.best !== undefined ? `best: ${b.ticks.best}` : undefined;
    case "gp-deadline":
      return b.deadlines?.statuses ? `${b.deadlines.statuses.filter((s) => s !== "ok").length} timed out` : undefined;
    case "gp-shutdown":
      return b.shutdown?.clean === undefined ? undefined : b.shutdown.clean ? "clean" : "late";
    default:
      return undefined;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function GoPipelineScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const [box, setBox] = React.useState<{ w: number; h: number } | null>(null);
  const measure = React.useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) => (prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const board = readBoard(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = board.error?.type === "CompileError";
  const liveCount = ALL_IDS.filter((id) => unlocked.has(id)).length;

  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];

  const renderPanel = (p: PanelSpec) => {
    if (!unlocked.has(p.id)) {
      return <LockedPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} clause={p.clause} spot={focus === p.id} />;
    }
    if (!program) return <WaitingPanel key={p.id} id={p.id} title={p.title} kind={p.ghost} lesson={p.lesson} />;
    return (
      <Frame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : panelMeta(p.id, board)}
        focus={focus === p.id}
        flash={flashing.has(p.id)}
      >
        {compileFailed ? <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p> : panelBody(p.id, board)}
      </Frame>
    );
  };

  const title = (
    <div className="flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
      <h2 className="hud-title min-w-0 truncate">Tidewatch harbour board</h2>
      <span className="hud-label ml-auto shrink-0">
        <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/55"}`}>{liveCount}</span>/{ALL_IDS.length} systems live
      </span>
    </div>
  );

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <div
          className="absolute flex flex-col gap-2"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {title}
          <div className="min-h-0 flex-1">
            {board.error ? (
              <ErrorStrip error={board.error} />
            ) : (
              <Overview board={compileFailed ? readBoard(null) : board} unlocked={unlocked} built={!!program} focus={focus} flashing={flashing} />
            )}
          </div>
        </div>
      </div>
    );
  }

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id);

  const consolePanel = (
    <ConsolePanel
      key="gp-console"
      stdout={program?.stdout ?? ""}
      built={!!program}
      error={board.error}
      keys={keys}
      live={!!program}
      interactive={interactive}
      focus={focus === "gp-console"}
      flash={flashing.has("gp-console")}
      locked={!unlocked.has("gp-console")}
    />
  );

  return (
    <div ref={measure} className={`absolute inset-0 [container-type:size] ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className={`px-3 pt-12 ${interactive ? "pb-3" : "pb-2"}`}>
        <div className={interactive ? "mb-3" : "mb-1.5"}>{title}</div>
        {!interactive ? (
          <div>
            {consolePanel}
            {!board.error && (focused ?? PANELS.find((p) => unlocked.has(p.id)) ?? null) && renderPanel((focused ?? PANELS.find((p) => unlocked.has(p.id)))!)}
          </div>
        ) : (
          <div className="gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
            {consolePanel}
            {focused && renderPanel(focused)}
            {rest.map(renderPanel)}
          </div>
        )}
      </div>
    </div>
  );
}
