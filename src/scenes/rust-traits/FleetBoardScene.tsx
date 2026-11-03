"use client";

import React, { useEffect, useState } from "react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import { CONSOLE_ID, PANELS, SCENE_KEYS, outputLines, readFleet, tileValue, type Fleet, type Panel } from "./data";
import { HarbourMap } from "./HarbourMap";
import { panelBody } from "./panels";
import { CompilerPanel } from "../rust-inventory/console";
import { ErrorStrip, StatusChip } from "../rust-inventory/overview";
import { readAny } from "../rust-inventory/data";
import { CSS, Chip, Frame, LockedPanel, WaitingPanel, type GhostKind } from "../rust-inventory/ui";

/**
 * Skerry Post fleet board: the live board for the Drone Fleet course (Rust, Advanced).
 *
 * Rust runs through the compiled-language path, so the board can't call the program back. It draws what the
 * program printed: stdout for the console, and every `scene("key", value)` line (an `@scene {json}` line) for
 * the panels. A failed build arrives as `build_error` ({ type, message, line }) and is explained by the
 * compiler panel (shared with Corvid Peak). Each panel is a dashed ghost until its lesson is passed, and shows
 * an "unlocked, press Run" hint when nothing has been built on this page yet.
 *
 * Colour follows the Pockett Stage system: neutral greys for structure, lime only for values the learner's
 * code produced, blue for pointers and borrows, amber for caution, red for refusals.
 */

const GHOST: Record<string, GhostKind> = {
  "df-roster": "cards",
  "df-abilities": "rows",
  "df-generics": "stages",
  "df-bounds": "tests",
  "df-hangar": "cards",
  "df-choice": "cards",
  "df-derives": "text",
  "df-convert": "table",
  "df-harbour": "ruler",
  "df-ranking": "ranking",
  "df-charging": "ruler",
  "df-pipeline": "stages",
  "df-depot": "tree",
  "df-ledger": "strip",
  "df-rigs": "tiles",
  "df-board": "report",
};

const OVERVIEW_W = 780;
const OVERVIEW_H = 520;
const SHELL_TOP = 44;

/** Short and wide stages (the project hub, the landing page) get the one-screen overview. */
const isCompact = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

/** The last few output lines, as a one-glance strip. */
function OutputStrip({ lines, built, locked }: { lines: string[]; built: boolean; locked: boolean }) {
  const tail = lines.slice(-4);
  return (
    <div className="hud-panel min-w-0 !px-3 !py-2">
      <div className="mb-1 flex items-center gap-2">
        <FeatureIcon id="df-console" className="h-3.5 w-3.5 text-[#c5ee8a]" />
        <span className="hud-title">Flight console</span>
        <span className="hud-tag ml-auto shrink-0 !text-white/70">{built ? `${lines.length} lines` : locked ? "locked · L1" : "idle"}</span>
      </div>
      <div className="hud-log space-y-0 truncate">
        {locked ? (
          <p className="truncate text-white/60">println!(…) lights this up.</p>
        ) : !built ? (
          <p className="truncate text-white/60">Press Run to build and run.</p>
        ) : tail.length === 0 ? (
          <p className="truncate text-white/60">Nothing printed yet.</p>
        ) : (
          tail.map((l, i) => (
            <div key={i} className="hud-log-line truncate">
              {l === "" ? " " : l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

function ConsolePanel({
  stdout,
  built,
  error,
  keys,
  interactive,
  focus,
  flash,
  locked,
}: {
  stdout: string;
  built: boolean;
  error: Fleet["error"];
  keys: [string, unknown][];
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  locked: boolean;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = outputLines(stdout);
  const panicked = error?.type === "Panic";
  const status = !built ? "Idle" : error ? (panicked ? "Panicked" : "Build failed") : "Build OK";
  const statusTone = !built ? "text-white/60" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";
  const box = interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden";
  return (
    <section data-panel="df-console" className={`hud-panel min-w-0 px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <FeatureIcon id="df-console" className="h-3.5 w-3.5" />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Flight console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>
      {locked ? (
        <div>
          <div className="space-y-1.5">
            {[70, 45, 85, 30].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-2 shrink-0 rounded-sm bg-white/[0.06]" />
                <div className="h-1.5 rounded-sm bg-white/[0.06]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/55">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
            println!(…) · scene(…)
          </p>
        </div>
      ) : (
        <>
          <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Console view">
            <Chip active={tab === "output"} onClick={() => setTab("output")}>
              Output{lines.length > 0 ? ` · ${lines.length}` : ""}
            </Chip>
            <Chip active={tab === "data"} onClick={() => setTab("data")}>
              Scene data{keys.length > 0 ? ` · ${keys.length}` : ""}
            </Chip>
          </div>
          {tab === "output" ? (
            <div className={`hud-log rounded-md bg-black/40 px-2 py-1.5 ${box}`} role="log" aria-label="Program output">
              {!built ? (
                <p className="text-white/60">Press Run to build and run your program (2 to 6 seconds).</p>
              ) : lines.length === 0 ? (
                <p className="text-white/60">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing."}</p>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                    {l === "" ? " " : l}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] ${box}`}>
              {keys.length === 0 ? (
                <p className="text-white/60">{built ? 'No values yet. Send one with scene("name", value);' : "Run your program to see what it sent to the board."}</p>
              ) : (
                <dl className="space-y-0.5">
                  {keys.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-white/60">{k}</dt>
                      <dd className="hud-accent min-w-0 flex-1 truncate" title={safeJson(v)}>
                        {safeJson(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function FleetBoardScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
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

  const fleet = readFleet(program);
  const flashing = new Set(celebration?.features ?? []);
  const failed = fleet.error !== null;
  const liveCount = PANELS.filter((p) => unlocked.has(p.id)).length;
  const allLive = liveCount === PANELS.length;
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

  const renderPanel = (p: Panel) => {
    const kind = GHOST[p.id] ?? "text";
    if (!unlocked.has(p.id)) {
      return <LockedPanel key={p.id} id={p.id} title={p.title} kind={kind} lesson={p.lesson} clause={p.clause} spot={focus === p.id} className="mb-3 break-inside-avoid" />;
    }
    if (!program) return <WaitingPanel key={p.id} id={p.id} title={p.title} kind={kind} lesson={p.lesson} className="mb-3 break-inside-avoid" />;
    const body = failed ? (
      <p className="hud-log py-1 text-[11px] !text-white/60">Waiting for a successful build. Fix the error and press Run.</p>
    ) : (
      panelBody(p.id, fleet, liveCount, PANELS.length)
    );
    return (
      <Frame
        key={flashing.has(p.id) ? `${p.id}:${celebration?.nonce}` : p.id}
        id={p.id}
        title={p.title}
        meta={failed ? undefined : tileValue(p.id, fleet)}
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
      key="df-console"
      stdout={program?.stdout ?? ""}
      built={built}
      error={fleet.error}
      keys={keys}
      interactive={interactive}
      focus={focus === CONSOLE_ID}
      flash={flashing.has(CONSOLE_ID)}
      locked={consoleLocked}
    />
  );

  if (box && isCompact(box)) {
    const availH = Math.max(box.h - SHELL_TOP, 120);
    const scale = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    const day = fleet.dispatchDay;
    return (
      <div ref={measure} className="absolute inset-0 overflow-hidden">
        <style>{CSS}</style>
        <div
          className="absolute flex flex-col gap-2.5"
          style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * scale) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * scale) / 2, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="flex min-w-0 shrink-0 items-baseline gap-3 px-0.5">
            <h2 className="hud-title !text-[14px]">Skerry Post fleet board</h2>
            <span className={`hud-label min-w-0 truncate !text-[11px] ${failed ? "hud-danger" : "!text-white/65"}`}>· {failed ? "Build failed" : built ? "Build OK" : "Idle"}</span>
            <span className="hud-label ml-auto shrink-0 !text-[11px]">
              <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/55"}`}>{liveCount}</span>/{PANELS.length} panels live
            </span>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-2.5">
            <div className="relative flex min-h-0 min-w-0 items-center">
              <HarbourMap fleet={fleet} unlocked={unlocked} autoplay={!!autoplay} compact />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
              {fleet.error ? <ErrorStrip error={fleet.error} /> : null}
              <OutputStrip lines={outputLines(program?.stdout ?? "")} built={built} locked={consoleLocked} />
              {allLive && !fleet.error && day?.delivered !== undefined && (
                <div className="hud-panel !px-3 !py-2 text-[11px]">
                  <span className="hud-title !text-[#d3f3a4]">Dispatch day closed</span>
                  <p className="mt-0.5 text-white/75">
                    {day.delivered} of {day.total ?? "?"} parcels delivered, {day.deliveredKg ?? "?"} kg, {day.left.length} left on the shelf
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-4 gap-2">
            {PANELS.map((p) => (
              <StatusChip key={p.id} panel={p} unlocked={unlocked.has(p.id)} built={built} spot={focus === p.id} flash={flashing.has(p.id)} value={tileValue(p.id, fleet)} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selected = PANELS.find((p) => p.id === selectedId) ?? null;
  const rest = PANELS.filter((p) => p.id !== selected?.id);

  return (
    <div ref={measure} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
      <style>{CSS}</style>
      <div className="px-3 pb-3 pt-12">
        <div className="mb-3 flex min-w-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Skerry Post fleet board</h2>
          <span className="hud-label ml-auto shrink-0">
            <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/55"}`}>{liveCount}</span>/{PANELS.length} panels live
          </span>
        </div>
        <HarbourMap fleet={fleet} unlocked={unlocked} autoplay={!!autoplay} compact={false} />
        <div className="mt-3 grid gap-3 @4xl:grid-cols-2 @4xl:items-start">
          <div className="flex min-w-0 flex-col gap-3">
            {fleet.error && <CompilerPanel error={fleet.error} />}
            {consolePanel}
          </div>
          {selected && <div className="min-w-0 [&>section]:mb-0">{renderPanel(selected)}</div>}
        </div>
        <div className="mt-3 gap-3 @xl:columns-2 @4xl:columns-3">{rest.map(renderPanel)}</div>
      </div>
    </div>
  );
}
