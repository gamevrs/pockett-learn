"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { clamp } from "./model";
import { HomeRuntime, type View } from "./runtime";
import { FloorPlan } from "./FloorPlan";
import {
  AuditPanel,
  AutomationsPanel,
  DeadLettersPanel,
  EventLogPanel,
  Inspector,
  LockedPanel,
  PANEL_DEFS,
  PanelFrame,
  PhonePanel,
  RoutinesPanel,
  ScenesPanel,
  StatusStrip,
  TrafficBar,
  WorldControls,
  panelMeta,
  type PanelId,
} from "./Panels";

/**
 * Smart Home Hub: a top-down floor plan driven by the learner's Python.
 *
 * The world (a person, the clock, the weather, the front door) belongs to the scene; the house
 * (devices, bus, rules, routines) belongs to the learner. HomeRuntime reports the world to the
 * program through hooks and reads the house back, so every light, lock and log line here is
 * something the learner's code produced. A panel stays a ghost until its lesson is passed.
 */

const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const readMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A feature without its own panel spotlights the one that shows it. */
const PANEL_FOR: Record<string, PanelId> = { "sh-timeline": "sh-eventlog", "sh-wiring": "sh-eventlog" };

export default function SmartHomeScene({ program, unlocked, focus, celebration, interactive, autoplay = false }: SceneProps) {
  const [rt] = useState(() => new HomeRuntime());
  const [view, setView] = useState<View>(() => rt.view());
  const [planWidth, setPlanWidth] = useState(560);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const planRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(true);
  const reduce = useSyncExternalStore(subscribeMotion, readMotion, () => false);

  // hand the latest props to the runtime
  useEffect(() => {
    rt.setInputs({ program, unlocked, interactive, autoplay });
  });

  // the clock: advance the world, read the house back, redraw only when something changed
  useEffect(() => {
    let last = "";
    let prev = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(now - prev, 400);
      prev = now;
      if (document.hidden || !visibleRef.current) return;
      rt.tick(dt);
      const next = rt.view();
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setView(next);
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      rt.dispose();
    };
  }, [rt]);

  // routes are kept alive while hidden: stop simulating when nobody can see the scene
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = planRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) setPlanWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const k = clamp(600 / planWidth, 1, 1.9);
  const flashing = new Set(celebration?.features ?? []);
  const spotPanel: PanelId | null = focus ? (PANEL_DEFS.some((p) => p.id === focus) ? (focus as PanelId) : (PANEL_FOR[focus] ?? null)) : null;
  const liveCount = view.hasProgram ? [...unlocked].length : 0;

  const renderPanel = (def: (typeof PANEL_DEFS)[number]) => {
    const alive = view.hasProgram && unlocked.has(def.id);
    const spot = !alive && (focus === def.id || spotPanel === def.id);
    if (!alive) return <LockedPanel key={def.id} id={def.id} title={def.title} lesson={def.lesson} clause={def.clause} spot={spot} />;
    let body: React.ReactNode;
    switch (def.id) {
      case "sh-routines":
        body = <RoutinesPanel rt={rt} view={view} />;
        break;
      case "sh-scenes":
        body = <ScenesPanel rt={rt} view={view} />;
        break;
      case "sh-eventlog":
        body = <EventLogPanel rt={rt} view={view} unlocked={unlocked} />;
        break;
      case "sh-automations":
        body = <AutomationsPanel view={view} />;
        break;
      case "sh-phone":
        body = <PhonePanel view={view} />;
        break;
      case "sh-resilience":
        body = <DeadLettersPanel view={view} />;
        break;
      default:
        body = <AuditPanel view={view} />;
    }
    const isFocus = focus === def.id || spotPanel === def.id;
    return (
      <PanelFrame
        key={flashing.has(def.id) ? `${def.id}:${celebration?.nonce}` : def.id}
        id={def.id}
        title={def.title}
        icon={<FeatureIcon id={def.id} className="h-3.5 w-3.5" />}
        meta={panelMeta(def.id, view)}
        focus={isFocus}
        flash={flashing.has(def.id)}
      >
        {body}
      </PanelFrame>
    );
  };

  const order: PanelId[] = ["sh-routines", "sh-scenes", "sh-eventlog", "sh-automations", "sh-phone", "sh-resilience", "sh-audit"];
  const defs = order.map((id) => PANEL_DEFS.find((d) => d.id === id)!);
  const focused = spotPanel ? defs.find((d) => d.id === spotPanel) : undefined;
  const rest = focused ? defs.filter((d) => d !== focused) : defs;

  const planSpot = focus === "sh-blueprint" && !unlocked.has("sh-blueprint");

  return (
    <div ref={rootRef} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <div className="px-3 pb-3 pt-12">
        {/* One column on a small stage (plan, then the lesson's panel, then the controls, then the rest);
            two columns when there is room. `contents` lets the wrappers dissolve so `order` can interleave. */}
        <div className="grid gap-x-3 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="contents min-w-0 @3xl:block">
            <div className="order-1 min-w-0 @3xl:order-none">
            <StatusStrip view={view} />
            <div ref={planRef} className={`mb-1 overflow-hidden rounded-[10px] border bg-[#0a0a0a] ${planSpot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/[0.08]"}`}>
              <FloorPlan
                view={view}
                unlocked={unlocked}
                focus={focus}
                celebration={celebration}
                k={k}
                interactive={interactive}
                selected={view.selected}
                reduceMotion={reduce}
                onSelect={(id) => rt.selectDevice(id)}
                onRoom={(room) => rt.walkTo(room)}
                onDoor={() => rt.toggleDoor()}
              />
            </div>
            <Legend liveCount={liveCount} hasProgram={view.hasProgram} blueprint={unlocked.has("sh-blueprint") && view.fromProgram} />
            {unlocked.has("sh-traffic") && view.hasProgram && <TrafficBar view={view} />}
            </div>
            {interactive && (
              <div className="order-3 mt-3 min-w-0 @3xl:order-none">
                <WorldControls rt={rt} view={view} unlocked={unlocked} />
                <Inspector rt={rt} view={view} unlocked={unlocked} selected={view.selected} />
              </div>
            )}
          </div>
          <div className="contents min-w-0 @3xl:block @3xl:pt-7">
            {focused && <div className="order-2 min-w-0 pt-3 @3xl:order-none @3xl:pt-0">{renderPanel(focused)}</div>}
            <div className="order-4 min-w-0 @3xl:order-none">{rest.map(renderPanel)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ liveCount, hasProgram, blueprint }: { liveCount: number; hasProgram: boolean; blueprint: boolean }) {
  const item = (swatch: React.ReactNode, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      <span>{label}</span>
    </span>
  );
  const ring = (color: string, dashed: boolean) => <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${color}`, borderStyle: dashed ? "dashed" : "solid" }} />;
  return (
    <div className="hud-label flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 !text-[9.5px] !normal-case !tracking-normal text-white/45">
      {item(ring("rgba(255,255,255,0.35)", true), "not built yet")}
      {item(ring("rgba(197,238,138,0.55)", true), "in your catalog")}
      {item(ring("#c5ee8a", false), "running your code")}
      <span className="ml-auto font-mono">{hasProgram ? `${liveCount} of 16 features live${blueprint ? "" : ""}` : "run your code to start"}</span>
    </div>
  );
}
