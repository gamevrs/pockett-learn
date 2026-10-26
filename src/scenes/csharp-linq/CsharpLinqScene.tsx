"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { ConsolePanel } from "./console";
import { fmtNum, outputLines, plural, readAny, readPort, SCENE_KEYS, type PortData } from "./data";
import { BoardPanel } from "./hero";
import { BoardSnippet, chipSpecs, ErrorStrip, LoadsSnippet, OVERVIEW_H, OVERVIEW_W, StatusChip } from "./overview";
import { Contracts, Generics, Groups, Joins, Lanes, Lazy, Records, Structures } from "./panels-a";
import { Ext, Faults, Inbox, Json, Lookup, Parser, Report } from "./panels-b";
import { ALL_IDS, BOARD, CONSOLE, JOINS, PANELS, TOTAL_SYSTEMS, type PanelSpec } from "./specs";
import { CSS, Frame, Lamp, LockedPanel, WaitingPanel } from "./ui";

/**
 * Halyard Port: the live board for the Halyard Port course (C# Intermediate: LINQ, generics,
 * records, pattern matching, JSON, parsing and validation).
 *
 * C# runs on the pockett runner, so the board can't call the program back. It draws what the
 * program printed: stdout for the console, and every `Port.Show("key", value)` line (an
 * `@scene {json}` line) for the panels. A failed build arrives as a `build_error` value and is
 * shown on the console with its line number. Each system is a dashed ghost until its lesson is
 * passed, and shows a "press Run" hint when it is unlocked but nothing has been built yet.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's code produced, amber for caution, red for failures.
 */

interface BodyCtx {
  allLive: boolean;
  interactive: boolean;
}

function panelBody(id: string, p: PortData, ctx: BodyCtx): React.ReactNode {
  switch (id) {
    case "hp-board":
      return <BoardPanel d={p.board} />;
    case "hp-structures":
      return <Structures d={p.structures} />;
    case "hp-groups":
      return <Groups d={p.groups} />;
    case "hp-joins":
      return <Joins d={p.joins} interactive={ctx.interactive} />;
    case "hp-lazy":
      return <Lazy d={p.lazy} />;
    case "hp-records":
      return <Records d={p.records} />;
    case "hp-lanes":
      return <Lanes d={p.lanes} />;
    case "hp-contracts":
      return <Contracts d={p.contracts} />;
    case "hp-generics":
      return <Generics d={p.generics} />;
    case "hp-ext":
      return <Ext d={p.ext} />;
    case "hp-lookup":
      return <Lookup d={p.lookup} />;
    case "hp-parser":
      return <Parser d={p.parser} />;
    case "hp-faults":
      return <Faults d={p.faults} />;
    case "hp-json":
      return <Json d={p.json} interactive={ctx.interactive} />;
    case "hp-inbox":
      return <Inbox d={p.inbox} interactive={ctx.interactive} />;
    default:
      return <Report d={p.report} allLive={ctx.allLive} systems={TOTAL_SYSTEMS} interactive={ctx.interactive} />;
  }
}

/** A short note shown in each panel header, when the panel has something to count. */
function panelMeta(id: string, p: PortData): string | undefined {
  switch (id) {
    case "hp-board":
      return p.board.rows ? plural(p.board.rows.length, "shipment") : undefined;
    case "hp-structures":
      return p.structures.docked ? `docked ${p.structures.docked}` : undefined;
    case "hp-groups":
      return p.groups.stats ? `${p.groups.stats.length} categories` : undefined;
    case "hp-joins":
      return p.joins.vesselLoads ? plural(p.joins.vesselLoads.length, "vessel") : undefined;
    case "hp-lazy":
      return p.lazy.trace ? plural(p.lazy.trace.length, "step") : undefined;
    case "hp-lanes":
      return p.lanes.lanes ? `${p.lanes.lanes.length} routed` : undefined;
    case "hp-contracts":
      return p.contracts.loadables ? plural(p.contracts.loadables.length, "loadable") : undefined;
    case "hp-lookup":
      return p.lookup.vesselLookups ? plural(p.lookup.vesselLookups.length, "lookup") : undefined;
    case "hp-parser":
      return p.parser.telegrams ? `${p.parser.telegrams.length} parsed` : undefined;
    case "hp-faults":
      return p.faults.loadLog ? `${p.faults.loadLog.length} entries` : undefined;
    case "hp-inbox":
      return p.inbox.importReport ? `${p.inbox.importReport.accepted ?? 0} in · ${p.inbox.importReport.rejected ?? 0} out` : undefined;
    default:
      return undefined;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function CsharpLinqScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
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

  const port = readPort(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = port.error?.type === "CompileError";
  const liveCount = ALL_IDS.filter((id) => unlocked.has(id)).length;
  const allLive = liveCount === TOTAL_SYSTEMS;
  const generation = program?.generation ?? 0;
  const ctx: BodyCtx = { allLive, interactive };

  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];

  const shipments = port.board.rows?.length ?? port.groups.totals?.count;
  const totalKg = port.groups.totals?.totalKg ?? (port.board.rows ? port.board.rows.reduce((a, r) => a + (r.massKg ?? 0), 0) : undefined);
  const portState = port.error ? (compileFailed ? "Port closed · build failed" : "Port closed · program crashed") : program ? "Port open" : "Port idle";
  const portSummary = !port.error && shipments !== undefined ? `${plural(shipments, "shipment")}${totalKg !== undefined && totalKg > 0 ? ` · ${fmtNum(totalKg)} kg` : ""}` : undefined;

  const renderPanel = (spec: PanelSpec, className: string, body: React.ReactNode) => {
    if (!unlocked.has(spec.id)) {
      return <LockedPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} clause={spec.clause} spot={focus === spec.id} className={className} />;
    }
    if (!program) return <WaitingPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} className={className} />;
    return (
      <Frame
        key={flashing.has(spec.id) ? `${spec.id}:${celebration?.nonce}` : spec.id}
        id={spec.id}
        title={spec.title}
        icon={<FeatureIcon id={spec.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : panelMeta(spec.id, port)}
        focus={focus === spec.id}
        flash={flashing.has(spec.id)}
        className={className}
      >
        {compileFailed ? <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p> : body}
      </Frame>
    );
  };

  const consolePanel = (className: string) => (
    <ConsolePanel
      key="hp-console"
      stdout={program?.stdout ?? ""}
      built={!!program}
      error={port.error}
      keys={keys}
      live={!!program}
      interactive={interactive}
      focus={focus === CONSOLE.id}
      flash={flashing.has(CONSOLE.id)}
      locked={!unlocked.has(CONSOLE.id)}
      className={className}
    />
  );

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    const chips = chipSpecs(port, program ? outputLines(program.stdout).length : 0, allLive);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="relative flex min-w-0 shrink-0 items-center gap-2 px-0.5">
            <Lamp on={program ? true : undefined} bad={!!port.error} size={9} blink={!!program && !port.error} />
            <h2 className="hud-title !text-[14px]">Halyard Port</h2>
            <span className={`hud-label min-w-0 truncate !text-[11px] ${port.error ? "hud-danger" : "text-white/55"}`}>· {portSummary ? `${portState} · ${portSummary}` : portState}</span>
            <span className="hud-label ml-auto shrink-0 !text-[11px]">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
            </span>
            {program && <span key={generation} aria-hidden className="hp-scan pointer-events-none absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-5 gap-2.5">
            {renderPanel(BOARD, "col-span-3", <BoardSnippet d={port.board} />)}
            {renderPanel(JOINS, "col-span-2", <LoadsSnippet d={port.joins} />)}
          </div>
          {port.error && (
            <div className="shrink-0">
              <ErrorStrip error={port.error} />
            </div>
          )}
          <div className="grid shrink-0 grid-cols-4 gap-2">
            {chips.map((c) => (
              <StatusChip key={c.id} spec={c} unlocked={unlocked.has(c.id)} built={!!program} spot={focus === c.id} flash={flashing.has(c.id)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const rest = PANELS;
  const focusedCard = rest.find((c) => c.id === focus) ?? null;
  const others = rest.filter((c) => c.id !== focusedCard?.id);
  const cardClass = "mb-3 break-inside-avoid";

  return (
    <div ref={measure} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 px-0.5">
          <div className="flex min-w-0 items-baseline gap-x-3 gap-y-0.5">
            <h2 className="hud-title min-w-0 truncate">Halyard Port</h2>
            <span className="hud-label ml-auto shrink-0">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
            </span>
          </div>
          <div className="relative mt-1.5 flex min-w-0 items-center gap-2 overflow-hidden border-t border-white/10 pt-1.5">
            <Lamp on={program ? true : undefined} bad={!!port.error} blink={!!program && !port.error} />
            <span className={`hud-label min-w-0 truncate ${port.error ? "hud-danger" : "text-white/55"}`}>{portState}</span>
            {portSummary && <span className="hud-value ml-auto shrink-0 text-[10.5px] text-white/55">{portSummary}</span>}
            {program && <span key={generation} aria-hidden className="hp-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 @4xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
          {renderPanel(BOARD, "", panelBody(BOARD.id, port, ctx))}
          {consolePanel("")}
        </div>

        <div className="mt-3 gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
          {focusedCard && renderPanel(focusedCard, cardClass, panelBody(focusedCard.id, port, ctx))}
          {others.map((c) => renderPanel(c, cardClass, panelBody(c.id, port, ctx)))}
        </div>
      </div>
    </div>
  );
}
