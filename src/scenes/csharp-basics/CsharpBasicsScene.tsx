"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { readAny, readDepot, SCENE_KEYS, type Depot } from "./data";
import {
  ConsolePanel,
  Dispatch,
  Fleet,
  Frame,
  Label,
  LockedPanel,
  Parcels,
  Patrol,
  RobotCard,
  Routes,
  Rules,
  Safety,
  Scanner,
  Shelves,
  Shift,
  Stock,
  WaitingPanel,
  type GhostKind,
} from "./panels";

/**
 * Cinder Street Depot: the live board for the C# Foundations course.
 *
 * C# runs on the pockett runner, so the board can't call the program back. It draws what the
 * program printed: stdout for the console, and every `Depot.Show("key", value)` line (an
 * `@scene {json}` line) for the panels. A failed build arrives as a `build_error` value and is
 * shown on the console with its line number. Each panel is a ghost until its lesson is passed,
 * and shows a "press Run" hint when it is unlocked but nothing has been built on this page yet.
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
  { id: "cs-robot", title: "Robot card", lesson: 2, clause: "string · int · double · bool · char", ghost: "tiles" },
  { id: "cs-dispatch", title: "Dispatch calculator", lesson: 3, clause: "/ · % · casts · decimal", ghost: "tiles" },
  { id: "cs-label", title: "Shipping label", lesson: 4, clause: "ReadLine · Parse · Trim", ghost: "label" },
  { id: "cs-rules", title: "Service rules", lesson: 5, clause: "if · else · switch", ghost: "pills" },
  { id: "cs-patrol", title: "Patrol route", lesson: 6, clause: "for · while · nested loops", ghost: "grid" },
  { id: "cs-shelves", title: "Shelves", lesson: 7, clause: "string[] · List<T>", ghost: "slots" },
  { id: "cs-stock", title: "Stock bins", lesson: 8, clause: "Dictionary<string, int>", ghost: "bars" },
  { id: "cs-routes", title: "Route planner", lesson: 9, clause: "methods · overloads", ghost: "rows" },
  { id: "cs-scanner", title: "Parcel scanner", lesson: 10, clause: "string? · ?? · ?.", ghost: "rows" },
  { id: "cs-fleet", title: "Fleet", lesson: 11, clause: "class Robot", ghost: "cards" },
  { id: "cs-parcels", title: "Parcel board", lesson: 12, clause: "record · enum", ghost: "columns" },
  { id: "cs-safety", title: "Safety log", lesson: 13, clause: "try · catch · finally", ghost: "rows" },
  { id: "cs-shift", title: "Shift report", lesson: 14, clause: "your whole program", ghost: "tiles" },
];

const TOTAL_SYSTEMS = PANELS.length + 1;

function panelBody(id: string, d: Depot, generation: number, allLive: boolean): React.ReactNode {
  switch (id) {
    case "cs-robot":
      return <RobotCard d={d.robot} />;
    case "cs-dispatch":
      return <Dispatch d={d.dispatch} />;
    case "cs-label":
      return <Label d={d.label} />;
    case "cs-rules":
      return <Rules d={d.rules} />;
    case "cs-patrol":
      return <Patrol d={d.patrol} generation={generation} />;
    case "cs-shelves":
      return <Shelves d={d.shelves} />;
    case "cs-stock":
      return <Stock d={d.stock} />;
    case "cs-routes":
      return <Routes d={d.routes} />;
    case "cs-scanner":
      return <Scanner d={d.scanner} />;
    case "cs-fleet":
      return <Fleet d={d.fleet} />;
    case "cs-parcels":
      return <Parcels d={d.parcels} />;
    case "cs-safety":
      return <Safety d={d.safety} />;
    default:
      return <Shift d={d.shift} allLive={allLive} />;
  }
}

/** A short count shown in each panel header, when the panel has something to count. */
function panelMeta(id: string, d: Depot): string | undefined {
  switch (id) {
    case "cs-shelves":
      return d.shelves.queue ? `${d.shelves.queue.length} queued` : undefined;
    case "cs-stock":
      return d.stock.stock ? `${Object.keys(d.stock.stock).length} SKUs` : undefined;
    case "cs-routes":
      return d.routes.legs ? `${d.routes.legs.length} legs` : undefined;
    case "cs-scanner":
      return d.scanner.scans ? `${d.scanner.scans.length} scans` : undefined;
    case "cs-fleet":
      return d.fleet.fleet ? `${d.fleet.fleet.length} robots` : undefined;
    case "cs-parcels":
      return d.parcels.list ? `${d.parcels.list.length} parcels` : undefined;
    case "cs-safety":
      return d.safety.incidents ? `${d.safety.incidents.length} logged` : undefined;
    default:
      return undefined;
  }
}

export default function CsharpBasicsScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
  const depot = readDepot(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = depot.error?.type === "CompileError";
  const liveCount = [...PANELS.map((p) => p.id), "cs-console"].filter((id) => unlocked.has(id)).length;
  const allLive = liveCount === TOTAL_SYSTEMS;

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
    const body = compileFailed ? (
      <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p>
    ) : (
      panelBody(p.id, depot, program.generation, allLive)
    );
    return (
      <Frame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : panelMeta(p.id, depot)}
        focus={focus === p.id}
        flash={flashing.has(p.id)}
      >
        {body}
      </Frame>
    );
  };

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id);

  const consolePanel = (
    <ConsolePanel
      key="cs-console"
      stdout={program?.stdout ?? ""}
      built={!!program}
      error={depot.error}
      keys={keys}
      live={!!program}
      interactive={interactive}
      focus={focus === "cs-console"}
      flash={flashing.has("cs-console")}
      locked={!unlocked.has("cs-console")}
    />
  );

  return (
    <div className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Cinder Street Depot</h2>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
          </span>
        </div>
        <div className="gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
          {consolePanel}
          {focused && renderPanel(focused)}
          {rest.map(renderPanel)}
        </div>
      </div>
    </div>
  );
}
