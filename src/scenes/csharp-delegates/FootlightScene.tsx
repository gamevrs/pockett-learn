"use client";

import React from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { fmtNum, outputLines, plural, readAny, readDesk, SCENE_KEYS, type Desk } from "./data";
import { ConsolePanel, CSS, Frame, LockedPanel, WaitingPanel, type GhostKind } from "./ui";
import { CueSheet, EventBus, Faders, FadeSteps, GoButton, Meters, PropShelves, QueryBench, SoundChain } from "./panels-a";
import { BreakerPanel, ChannelPanel, HoldPanel, Lifetimes, RetryLadder, RunSheet, ShowReport, TaskTimeline, Wiring } from "./panels-b";
import { chipSpecs, ErrorStrip, MiniBus, MiniTimeline, OverviewHeader, OVERVIEW_H, OVERVIEW_W, ReportStrip, StatusChip } from "./overview";

/**
 * Lantern Hall show desk: the live board for the Footlight course.
 *
 * C# cannot be called back, so the board draws what the program printed: stdout for the console,
 * and every `Desk.Show("key", value)` line (an `@scene {json}` line) for the panels. A failed build
 * arrives as a `build_error` value and is shown on the console with its line number. Each panel is
 * a dashed ghost until its lesson is passed, and shows a "press Run" hint when it is unlocked but
 * nothing has been built on this page yet.
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
  { id: "fl-cues", title: "Cue sheet", lesson: 1, clause: "delegate · Func · Action · Predicate", ghost: "pills" },
  { id: "fl-faders", title: "Fader bank", lesson: 2, clause: "lambdas · closures", ghost: "faders" },
  { id: "fl-chain", title: "Sound chain", lesson: 3, clause: "higher-order functions · compose", ghost: "chain" },
  { id: "fl-go", title: "GO button", lesson: 4, clause: "multicast delegates", ghost: "pills" },
  { id: "fl-bus", title: "Event bus", lesson: 5, clause: "event · EventHandler<T>", ghost: "bus" },
  { id: "fl-observers", title: "Light meters", lesson: 6, clause: "IObservable · IObserver", ghost: "bars" },
  { id: "fl-props", title: "Prop shelves", lesson: 7, clause: "where T · in · out", ghost: "cards" },
  { id: "fl-iter", title: "Fade steps", lesson: 8, clause: "yield return", ghost: "bars" },
  { id: "fl-linq", title: "Query bench", lesson: 9, clause: "Keep · Shape · Batch", ghost: "chain" },
  { id: "fl-runsheet", title: "Run sheet", lesson: 10, clause: "local functions · static lambdas", ghost: "timeline" },
  { id: "fl-timeline", title: "Task timeline", lesson: 11, clause: "async · await · WhenAll", ghost: "timeline" },
  { id: "fl-hold", title: "Hold and timeout", lesson: 12, clause: "CancellationToken", ghost: "timeline" },
  { id: "fl-channel", title: "Backstage channel", lesson: 13, clause: "Channel<T> · backpressure", ghost: "rows" },
  { id: "fl-retry", title: "Retry ladder", lesson: 14, clause: "backoff · jitter", ghost: "bars" },
  { id: "fl-breaker", title: "Breaker and bulkhead", lesson: 15, clause: "circuit states", ghost: "graph" },
  { id: "fl-lifetimes", title: "Lifetimes", lesson: 16, clause: "IDisposable · using", ghost: "rows" },
  { id: "fl-wiring", title: "Wiring diagram", lesson: 17, clause: "dependency injection", ghost: "graph" },
  { id: "fl-show", title: "Show report", lesson: 18, clause: "your whole program", ghost: "tiles" },
];

const ALL_IDS = ["fl-console", ...PANELS.map((p) => p.id)];
const TOTAL_SYSTEMS = ALL_IDS.length;

function panelBody(id: string, d: Desk, generation: number, allLive: boolean): React.ReactNode {
  switch (id) {
    case "fl-cues":
      return <CueSheet d={d.cues} />;
    case "fl-faders":
      return <Faders d={d.faders} />;
    case "fl-chain":
      return <SoundChain d={d.chain} />;
    case "fl-go":
      return <GoButton d={d.go} />;
    case "fl-bus":
      return <EventBus d={d.bus} generation={generation} />;
    case "fl-observers":
      return <Meters d={d.observers} />;
    case "fl-props":
      return <PropShelves d={d.props} />;
    case "fl-iter":
      return <FadeSteps d={d.iter} />;
    case "fl-linq":
      return <QueryBench d={d.query} />;
    case "fl-runsheet":
      return <RunSheet d={d.runSheet} />;
    case "fl-timeline":
      return <TaskTimeline d={d.timeline} />;
    case "fl-hold":
      return <HoldPanel d={d.hold} spans={d.timeline.spans} />;
    case "fl-channel":
      return <ChannelPanel d={d.channel} generation={generation} />;
    case "fl-retry":
      return <RetryLadder d={d.retry} />;
    case "fl-breaker":
      return <BreakerPanel d={d.breaker} generation={generation} />;
    case "fl-lifetimes":
      return <Lifetimes d={d.lifetimes} />;
    case "fl-wiring":
      return <Wiring d={d.wiring} />;
    default:
      return <ShowReport d={d.show} allLive={allLive} total={TOTAL_SYSTEMS} />;
  }
}

/** A short note shown in each panel header, when the panel has something to count. */
function panelMeta(id: string, d: Desk): string | undefined {
  switch (id) {
    case "fl-cues":
      return d.cues.sheet ? plural(d.cues.sheet.length, "cue") : undefined;
    case "fl-bus":
      return d.bus.log ? `${d.bus.log.length} deliver${d.bus.log.length === 1 ? "y" : "ies"}` : undefined;
    case "fl-props":
      return d.props.shelf ? plural(d.props.shelf.length, "prop") : undefined;
    case "fl-linq":
      return d.query.pages ? plural(d.query.pages.length, "page") : undefined;
    case "fl-runsheet":
      return d.runSheet.endsAt !== undefined ? `${fmtNum(d.runSheet.endsAt)} min` : undefined;
    case "fl-timeline":
      return d.timeline.spans ? plural(d.timeline.spans.length, "task") : undefined;
    case "fl-hold":
      return d.hold.state;
    case "fl-channel":
      return d.channel.capacity !== undefined ? `capacity ${d.channel.capacity}` : undefined;
    case "fl-retry":
      return d.retry.fog ? plural(d.retry.fog.length, "attempt") : undefined;
    case "fl-breaker":
      return d.breaker.finalState;
    case "fl-lifetimes":
      return d.lifetimes.free !== undefined ? `${d.lifetimes.free} free` : undefined;
    case "fl-wiring":
      return d.wiring.nodes ? plural(d.wiring.nodes.length, "part") : undefined;
    default:
      return undefined;
  }
}

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

export default function FootlightScene({ program, unlocked, focus, celebration, interactive }: SceneProps) {
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

  const desk = readDesk(program);
  const flashing = new Set(celebration?.features ?? []);
  const compileFailed = desk.error?.type === "CompileError";
  const liveCount = ALL_IDS.filter((id) => unlocked.has(id)).length;
  const allLive = liveCount === TOTAL_SYSTEMS;
  const generation = program?.generation ?? 0;

  const keys: [string, unknown][] = program
    ? SCENE_KEYS.flatMap((k): [string, unknown][] => {
        const v = readAny(program, k);
        return v === undefined ? [] : [[k, v]];
      })
    : [];

  const fault = !!desk.error;
  const stateLabel = desk.error ? (compileFailed ? "Build failed" : "Crashed") : program ? "Build OK" : "Idle";

  const renderPanel = (spec: PanelSpec) => {
    if (!unlocked.has(spec.id)) {
      return <LockedPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} clause={spec.clause} spot={focus === spec.id} />;
    }
    if (!program) return <WaitingPanel key={spec.id} id={spec.id} title={spec.title} kind={spec.ghost} lesson={spec.lesson} />;
    return (
      <Frame
        key={flashing.has(spec.id) ? `${spec.id}:${celebration?.nonce}` : spec.id}
        id={spec.id}
        title={spec.title}
        icon={<FeatureIcon id={spec.id} className="h-3.5 w-3.5" />}
        meta={compileFailed ? undefined : panelMeta(spec.id, desk)}
        focus={focus === spec.id}
        flash={flashing.has(spec.id)}
      >
        {compileFailed ? (
          <p className="hud-log hud-muted py-1 text-[11px]">Waiting for a successful build. Fix the error on the console and press Run.</p>
        ) : (
          panelBody(spec.id, desk, generation, allLive)
        )}
      </Frame>
    );
  };

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    const chips = chipSpecs(desk, program ? outputLines(program.stdout).length : 0).filter((c) => c.id !== "fl-bus" && c.id !== "fl-timeline" && c.id !== "fl-show");
    const built = !!program;
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <OverviewHeader fault={fault} stateLabel={stateLabel} liveCount={liveCount} total={TOTAL_SYSTEMS} generation={generation} built={built} />
          <div className="grid h-[150px] shrink-0 grid-cols-2 gap-2.5">
            <MiniBus d={desk.bus} unlocked={unlocked.has("fl-bus")} built={built} spot={focus === "fl-bus"} flash={flashing.has("fl-bus")} />
            <MiniTimeline d={desk.timeline} unlocked={unlocked.has("fl-timeline")} built={built} spot={focus === "fl-timeline"} flash={flashing.has("fl-timeline")} />
          </div>
          <div className="shrink-0">
            {desk.error ? <ErrorStrip error={desk.error} /> : <ReportStrip d={desk.show} unlocked={unlocked.has("fl-show")} built={built} spot={focus === "fl-show"} flash={flashing.has("fl-show")} />}
          </div>
          <div className="grid shrink-0 grid-cols-4 gap-2">
            {chips.map((c) => (
              <StatusChip key={c.id} spec={c} unlocked={unlocked.has(c.id)} built={built} spot={focus === c.id} flash={flashing.has(c.id)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const focused = PANELS.find((p) => p.id === focus) ?? null;
  const rest = PANELS.filter((p) => p.id !== focused?.id);

  return (
    <div ref={measure} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 px-0.5">
          <div className="flex min-w-0 items-baseline gap-x-3 gap-y-0.5">
            <h2 className="hud-title min-w-0 truncate">Lantern Hall show desk</h2>
            <span className="hud-label ml-auto shrink-0">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{TOTAL_SYSTEMS} systems live
            </span>
          </div>
        </div>
        <div className="gap-3 @xl:columns-2 @4xl:columns-3 @7xl:columns-4">
          <ConsolePanel
            stdout={program?.stdout ?? ""}
            built={!!program}
            error={desk.error}
            keys={keys}
            live={!!program}
            interactive={interactive}
            focus={focus === "fl-console"}
            flash={flashing.has("fl-console")}
            locked={!unlocked.has("fl-console")}
          />
          {focused && renderPanel(focused)}
          {rest.map(renderPanel)}
        </div>
      </div>
    </div>
  );
}
