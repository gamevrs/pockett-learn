"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { readAny, readHub, SCENE_KEYS, type Hub } from "./data";
import { Floor } from "./floor";
import {
  Bay,
  BeltCard,
  Chutes,
  ConsolePanel,
  Frame,
  Gate,
  LockedPanel,
  ManifestCard,
  Plate,
  Queue,
  Rejects,
  Routers,
  Safety,
  Scanner,
  ShiftCard,
  Sorter,
  Vans,
  WaitingPanel,
  Weigh,
  type GhostKind,
} from "./panels";

/**
 * Gopher Post Central Hub: the live sorting floor for the Go Foundations course.
 *
 * Go runs on the pockett runner, so the floor can't call the program back. It draws what the program
 * printed: stdout for the console, and every `scene("key", value)` line (an `@scene` line) for the
 * floor and the cards. A failed build arrives as a `build_error` value and is shown on the console
 * with its line number. Each part is a blueprint until its lesson is passed, and shows a "press Run"
 * hint when it is unlocked but nothing has been built on this page yet.
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
  { id: "go-plate", title: "Hub plate", lesson: 2, clause: "var · := · const · iota", ghost: "tiles" },
  { id: "go-bay", title: "Loading bay", lesson: 3, clause: "/ · % · float64() · int8", ghost: "tiles" },
  { id: "go-scanner", title: "Label scanner", lesson: 4, clause: "bufio.Scanner · Atoi", ghost: "label" },
  { id: "go-gate", title: "Sorting gate", lesson: 5, clause: "if · switch", ghost: "chips" },
  { id: "go-belt", title: "Intake belt", lesson: 6, clause: "for · range", ghost: "tiles" },
  { id: "go-queue", title: "Parcel queue", lesson: 7, clause: "[]int · append · cap", ghost: "bars" },
  { id: "go-chutes", title: "Chute tally", lesson: 8, clause: "map[string]int", ghost: "bars" },
  { id: "go-weigh", title: "Weigh station", lesson: 9, clause: "func · variadic", ghost: "tiles" },
  { id: "go-rejects", title: "Reject bin", lesson: 10, clause: "error · %w · errors.Is", ghost: "rows" },
  { id: "go-vans", title: "Courier vans", lesson: 11, clause: "struct · *Van", ghost: "bars" },
  { id: "go-routers", title: "Routing board", lesson: 12, clause: "interface · Stringer", ghost: "rows" },
  { id: "go-sorter", title: "Sorting racks", lesson: 13, clause: "sort.Slice · closures", ghost: "chips" },
  { id: "go-safety", title: "Safety interlock", lesson: 14, clause: "defer · panic · recover", ghost: "lines" },
  { id: "go-manifest", title: "Manifest", lesson: 15, clause: "encoding/json", ghost: "lines" },
  { id: "go-shift", title: "Shift report", lesson: 16, clause: "your whole program", ghost: "tiles" },
];

const TOTAL_SYSTEMS = PANELS.length + 1;

function panelBody(id: string, h: Hub, allLive: boolean): React.ReactNode {
  switch (id) {
    case "go-plate":
      return <Plate d={h.plate} />;
    case "go-bay":
      return <Bay d={h.bay} />;
    case "go-scanner":
      return <Scanner d={h.scanner} />;
    case "go-gate":
      return <Gate d={h.gate} />;
    case "go-belt":
      return <BeltCard d={h.belt} />;
    case "go-queue":
      return <Queue d={h.queue} />;
    case "go-chutes":
      return <Chutes d={h.chutes} />;
    case "go-weigh":
      return <Weigh d={h.weigh} />;
    case "go-rejects":
      return <Rejects d={h.rejects} />;
    case "go-vans":
      return <Vans d={h.vans} />;
    case "go-routers":
      return <Routers d={h.routers} />;
    case "go-sorter":
      return <Sorter d={h.sorter} />;
    case "go-safety":
      return <Safety d={h.safety} />;
    case "go-manifest":
      return <ManifestCard d={h.manifest} entries={h.manifest.entries} />;
    default:
      return <ShiftCard d={h.shift} allLive={allLive} />;
  }
}

/** A short count shown in each card header, when the card has something to count. */
function panelMeta(id: string, h: Hub): string | undefined {
  switch (id) {
    case "go-queue":
      return h.queue.queue ? `${h.queue.queue.length} queued` : undefined;
    case "go-chutes":
      return h.chutes.tally ? `${Object.keys(h.chutes.tally).length} regions` : undefined;
    case "go-rejects":
      return h.rejects.rejects ? `${h.rejects.rejects.length} rejected` : undefined;
    case "go-vans":
      return h.vans.vans ? `${h.vans.vans.length} vans` : undefined;
    case "go-routers":
      return h.routers.routes ? `${h.routers.routes.length} routed` : undefined;
    case "go-safety":
      return h.safety.caught ? `${h.safety.caught.length} caught` : undefined;
    default:
      return undefined;
  }
}

export default function GoBasicsScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const hub = readHub(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = hub.error?.type === "CompileError";
  const liveCount = [...PANELS.map((p) => p.id), "go-console"].filter((id) => unlocked.has(id)).length;
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
      panelBody(p.id, hub, allLive)
    );
    return (
      <Frame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        icon={<FeatureIcon id={p.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : panelMeta(p.id, hub)}
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
      key="go-console"
      stdout={program?.stdout ?? ""}
      built={!!program}
      error={hub.error}
      keys={keys}
      live={!!program}
      interactive={interactive}
      focus={focus === "go-console"}
      flash={flashing.has("go-console")}
      locked={!unlocked.has("go-console")}
    />
  );

  // While the build is broken the floor keeps its blueprint look: nothing the learner made is drawn.
  const floorHub = compileFailed ? readHub(null) : hub;

  return (
    <div className={`absolute inset-0 [container-type:size] ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className={`px-3 pt-12 ${interactive ? "pb-3" : "pb-2"}`}>
        <div className={`${interactive ? "mb-3" : "mb-1.5"} flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5`}>
          <h2 className="hud-title min-w-0 truncate">{hub.plate.hubName && unlocked.has("go-plate") && !compileFailed ? hub.plate.hubName : "Gopher Post sorting hub"}</h2>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
          </span>
        </div>
        {/* the small stage (hub card, landing) shows the floor only, or the console when the build failed */}
        {!interactive && hub.error ? consolePanel : <Floor hub={floorHub} unlocked={unlocked} focus={focus} animate={interactive || !!autoplay} compact={!interactive} />}
        {interactive && (
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
