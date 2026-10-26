"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { fmtNum, outputLines, readAny, readReactor, SCENE_KEYS, type Reactor } from "./data";
import { Alarms, Analysis, Control, Interlocks, Operator, Power, Ramp, Sensors, Shift, StateChain, Tally, Telemetry } from "./cards";
import { ConsolePanel } from "./console";
import { CoolantLoops, CoreGauge, RodGrid } from "./hero";
import { AlarmStrip, chipSpecs, ErrorStrip, OVERVIEW_H, OVERVIEW_W, StatusChip } from "./overview";
import { CSS, Frame, Lamp, LockedPanel, WaitingPanel, type GhostKind } from "./ui";

/**
 * Helios-1 control room: the live board for the Reactor Core course.
 *
 * C++ cannot be called back, so the board draws what the program printed: stdout for the console,
 * and every `scene("key", value)` line (an `@scene {json}` line) for the instruments. A failed build
 * arrives as a `build_error` value and is shown on the console with its line number. Each system is
 * a dashed ghost until its lesson is passed, and shows a "press Run" hint when it is unlocked but
 * nothing has been built on this page yet.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the
 * learner's code produced, amber for caution, red for failures, warm orange for heat.
 */

interface PanelSpec {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
}

const CORE: PanelSpec = { id: "rc-core", title: "Core gauge", lesson: 2, clause: "int · double · bool · char · string", ghost: "dial" };
const RODS: PanelSpec = { id: "rc-rods", title: "Fuel rods", lesson: 7, clause: "std::vector", ghost: "rodgrid" };
const COOLANT: PanelSpec = { id: "rc-coolant", title: "Coolant loops", lesson: 8, clause: "functions · & · const&", ghost: "loops" };

const CARDS: PanelSpec[] = [
  { id: "rc-power", title: "Power balance", lesson: 3, clause: "/ · % · static_cast · <cmath>", ghost: "bars" },
  { id: "rc-operator", title: "Operator desk", lesson: 4, clause: "std::cin · getline", ghost: "cards" },
  { id: "rc-interlocks", title: "Interlocks", lesson: 5, clause: "if · else · switch", ghost: "pills" },
  { id: "rc-ramp", title: "Warm-up ramp", lesson: 6, clause: "for · while · do", ghost: "chart" },
  { id: "rc-telemetry", title: "Telemetry decoder", lesson: 9, clause: "find · substr · stoi", ghost: "tiles" },
  { id: "rc-sensors", title: "Sensor bank", lesson: 10, clause: "struct", ghost: "bars" },
  { id: "rc-tally", title: "Event tally", lesson: 11, clause: "std::map", ghost: "bars" },
  { id: "rc-analysis", title: "Analysis", lesson: 12, clause: "<algorithm> · lambdas", ghost: "rows" },
  { id: "rc-control", title: "Control rods", lesson: 13, clause: "class", ghost: "tubes" },
  { id: "rc-state", title: "Reactor state", lesson: 14, clause: "enum class", ghost: "chain" },
  { id: "rc-alarms", title: "Alarms", lesson: 15, clause: "throw · try · catch", ghost: "rows" },
  { id: "rc-shift", title: "Shift report", lesson: 16, clause: "your whole program", ghost: "log" },
];

const ALL_IDS = ["rc-console", CORE.id, RODS.id, COOLANT.id, ...CARDS.map((c) => c.id)];
const TOTAL_SYSTEMS = ALL_IDS.length;

function cardBody(id: string, r: Reactor, allLive: boolean, interactive: boolean): React.ReactNode {
  switch (id) {
    case "rc-power":
      return <Power d={r.power} />;
    case "rc-operator":
      return <Operator d={r.operator} />;
    case "rc-interlocks":
      return <Interlocks d={r.interlocks} />;
    case "rc-ramp":
      return <Ramp d={r.ramp} />;
    case "rc-telemetry":
      return <Telemetry d={r.telemetry} />;
    case "rc-sensors":
      return <Sensors d={r.sensors} />;
    case "rc-tally":
      return <Tally d={r.tally} />;
    case "rc-analysis":
      return <Analysis d={r.analysis} />;
    case "rc-control":
      return <Control d={r.control} />;
    case "rc-state":
      return <StateChain d={r.state} />;
    case "rc-alarms":
      return <Alarms d={r.alarms} />;
    default:
      return <Shift d={r.shift} allLive={allLive} interactive={interactive} />;
  }
}

/** A short note shown in each panel header, when the panel has something to count. */
function panelMeta(id: string, r: Reactor): string | undefined {
  switch (id) {
    case "rc-core":
      return r.core.name;
    case "rc-rods":
      return r.rods.levels ? `${r.rods.levels.length} rods` : undefined;
    case "rc-coolant":
      return r.coolant.flows ? `${r.coolant.flows.length} loops` : undefined;
    case "rc-sensors":
      return r.sensors.names ? `${r.sensors.names.length} sensors` : undefined;
    case "rc-tally":
      return r.tally.tally ? `${Object.keys(r.tally.tally).length} kinds` : undefined;
    case "rc-control":
      return r.control.names ? `${r.control.names.length} rods` : undefined;
    case "rc-alarms":
      return r.alarms.codes ? `${r.alarms.codes.length} raised` : undefined;
    case "rc-shift":
      return r.shift.log ? `${r.shift.log.length} entries` : undefined;
    default:
      return undefined;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function ReactorCoreScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
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
  const reactor = readReactor(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = reactor.error?.type === "CompileError";
  const liveCount = ALL_IDS.filter((id) => unlocked.has(id)).length;
  const allLive = liveCount === TOTAL_SYSTEMS;
  const generation = program?.generation ?? 0;

  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];

  const stateLabel = reactor.state.state ?? reactor.shift.state ?? (reactor.error ? "Fault" : program ? "Build OK" : "Idle");
  const fault = !!reactor.error || reactor.state.state === "Scram";

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
        meta={compileFailed ? undefined : panelMeta(spec.id, reactor)}
        focus={focus === spec.id}
        flash={flashing.has(spec.id)}
        className={className}
      >
        {compileFailed ? <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p> : body}
      </Frame>
    );
  };

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    const chips = chipSpecs(reactor, program ? outputLines(program.stdout).length : 0);
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="relative flex min-w-0 shrink-0 items-center gap-2 px-0.5">
            <Lamp on={program ? true : undefined} bad={fault} size={9} />
            <h2 className="hud-title !text-[14px]">Helios-1 control room</h2>
            <span className={`hud-label min-w-0 truncate !text-[11px] ${fault ? "hud-danger" : "text-white/55"}`}>· Reactor {stateLabel}</span>
            <span className="hud-label ml-auto shrink-0 !text-[11px]">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
            </span>
            {program && <span key={generation} aria-hidden className="rc-scan pointer-events-none absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-2.5">
            {renderPanel(CORE, "", <CoreGauge d={reactor.core} generation={generation} alarmLevel={reactor.interlocks.alarmLevel} compact />)}
            {renderPanel(RODS, "", <RodGrid d={reactor.rods} compact />)}
            {renderPanel(COOLANT, "", <CoolantLoops d={reactor.coolant} compact />)}
          </div>
          <div className="shrink-0">
            {reactor.error ? <ErrorStrip error={reactor.error} /> : <AlarmStrip d={reactor.alarms} unlocked={unlocked.has("rc-alarms")} built={!!program} spot={focus === "rc-alarms"} flash={flashing.has("rc-alarms")} />}
          </div>
          <div className="grid shrink-0 grid-cols-4 gap-2">
            {chips.map((c) => (
              <StatusChip key={c.id} spec={c} unlocked={unlocked.has(c.id)} built={!!program} spot={focus === c.id} flash={flashing.has(c.id)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const focusedCard = CARDS.find((c) => c.id === focus) ?? null;
  const restCards = CARDS.filter((c) => c.id !== focusedCard?.id);
  const cardClass = "mb-3 break-inside-avoid";

  return (
    <div ref={measure} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 px-0.5">
          <div className="flex min-w-0 items-baseline gap-x-3 gap-y-0.5">
            <h2 className="hud-title min-w-0 truncate">Helios-1 control room</h2>
            <span className="hud-label ml-auto shrink-0">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
            </span>
          </div>
          <div className="relative mt-1.5 flex min-w-0 items-center gap-2 overflow-hidden border-t border-white/10 pt-1.5">
            <Lamp on={program ? true : undefined} bad={fault} />
            <span className={`hud-label min-w-0 truncate ${fault ? "hud-danger" : "text-white/55"}`}>Reactor {stateLabel}</span>
            {reactor.core.temp !== undefined && !compileFailed && unlocked.has("rc-core") && (
              <span className="hud-value ml-auto shrink-0 text-[10.5px] text-white/55">{fmtNum(reactor.core.temp, 1)} °C</span>
            )}
            {program && <span key={generation} aria-hidden className="rc-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {renderPanel(CORE, "", <CoreGauge d={reactor.core} generation={generation} alarmLevel={reactor.interlocks.alarmLevel} />)}
          {renderPanel(RODS, "", <RodGrid d={reactor.rods} />)}
          {renderPanel(COOLANT, "@2xl:col-span-2 @5xl:col-span-1", <CoolantLoops d={reactor.coolant} />)}
        </div>

        <div className="mt-3 gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
          <ConsolePanel
            stdout={program?.stdout ?? ""}
            built={!!program}
            error={reactor.error}
            keys={keys}
            live={!!program}
            interactive={interactive}
            focus={focus === "rc-console"}
            flash={flashing.has("rc-console")}
            locked={!unlocked.has("rc-console")}
            className={cardClass}
          />
          {focusedCard && renderPanel(focusedCard, cardClass, cardBody(focusedCard.id, reactor, allLive, interactive))}
          {restCards.map((c) => renderPanel(c, cardClass, cardBody(c.id, reactor, allLive, interactive)))}
        </div>
      </div>
    </div>
  );
}
