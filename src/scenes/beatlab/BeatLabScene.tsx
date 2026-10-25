"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Square, Volume2, VolumeX } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { useThreeStage } from "@/engine/three-kit";
import { STEPS, TRACK_IDS, midiName, midiToHzReference } from "./sequencer";
import { Runtime, TRACKS, trackAlive, type PatternId, type Ui } from "./runtime";
import { createBeatStage, formatHz, hudMode, type BeatStage, type StageLabels } from "./stage3d";

// ───────────────────────── HUD (HTML, refreshed ~10x per second) ─────────────────────────

type Tone = "on" | "warn" | "bad" | "off";

interface HudRow {
  label: string;
  sub: string;
  tone: Tone;
  muted: boolean;
}

interface Hud {
  hasProgram: boolean;
  powered: boolean;
  tempo: boolean;
  title: string;
  info: string;
  lines: string[];
  arranger: boolean;
  playing: boolean;
  bar: number;
  section: string;
  step: number;
  rows: HudRow[];
  mixerOn: boolean;
  mixer: { label: string; vol: number; mute: boolean }[];
}

function readHud(rt: Runtime): Hud {
  const { program } = rt.props;
  const model = rt.model;
  const alive = (f: string) => rt.isAlive(f);
  const powered = !!program && alive("power");
  const playing = rt.playing && rt.step >= 0 && powered;
  const rows: HudRow[] = TRACK_IDS.map((id) => {
    const meta = TRACKS[id];
    const on = powered && trackAlive(id, alive);
    if (!on || !model) return { label: meta.label, sub: powered ? "locked" : "", tone: "off", muted: false };
    const len = model.rawLen[id];
    const muted = alive("mixer") && model.mix[id].mute;
    if (len < 0) return { label: meta.label, sub: `${meta.variable} = ?`, tone: "bad", muted };
    if (len !== STEPS) return { label: meta.label, sub: `len ${len}/16`, tone: "warn", muted };
    if (id === "bass") {
      const note = playing && rt.lastBassNote > 0 ? rt.lastBassNote : (model.notes.find((n) => n > 0) ?? 0);
      if (note <= 0) return { label: meta.label, sub: "no notes", tone: "warn", muted };
      const hz = model.hz[model.notes.indexOf(note)] || midiToHzReference(note);
      return { label: meta.label, sub: `${midiName(note)} ${formatHz(hz)}`, tone: model.hzBad ? "bad" : "on", muted };
    }
    const n = model.patterns[id as PatternId].filter((v) => v > 0).length;
    return { label: meta.label, sub: `${n} hit${n === 1 ? "" : "s"}`, tone: "on", muted };
  });
  const mixerOn = powered && alive("mixer");
  return {
    hasProgram: !!program,
    powered,
    tempo: powered && alive("tempo"),
    title: model?.title || "UNTITLED",
    info: model ? `${Math.round(model.bpm)} BPM · SWING ${Math.round(model.swing * 100)}% · VOL ${Math.round(model.master * 100)}` : "",
    lines: (program?.stdout ?? "")
      .split("\n")
      .filter((l) => l.length > 0)
      .slice(-3),
    arranger: powered && alive("arranger"),
    playing,
    bar: rt.bar,
    section: rt.section,
    step: playing ? rt.step : -1,
    rows,
    mixerOn,
    mixer: TRACK_IDS.map((id) => ({ label: TRACKS[id].label, vol: Math.round((model?.mix[id].volume ?? 1) * 100), mute: !!model?.mix[id].mute })),
  };
}

const EMPTY_HUD: Hud = {
  hasProgram: false,
  powered: false,
  tempo: false,
  title: "",
  info: "",
  lines: [],
  arranger: false,
  playing: false,
  bar: 0,
  section: "groove",
  step: -1,
  rows: TRACK_IDS.map((id) => ({ label: TRACKS[id].label, sub: "", tone: "off", muted: false })),
  mixerOn: false,
  mixer: [],
};

const GLASS = "rounded-xl border border-white/10 bg-black/45 px-3 py-2 backdrop-blur";
const TONE: Record<Tone, string> = {
  on: "text-lime-200/80",
  warn: "text-amber-200/90",
  bad: "text-[#f87171]",
  off: "text-white/35",
};

// ───────────────────────── component ─────────────────────────

export default function BeatLabScene({ program, unlocked, focus, celebration, interactive, autoplay = false }: SceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<BeatStage | null>(null);
  const labelsRef = useRef<StageLabels>({ rows: [], mixer: [] });
  const [rt] = useState(() => new Runtime());
  const [ui, setUi] = useState<Ui>({ playing: false, audio: "off" });
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [roomy, setRoomy] = useState(true);

  // hand the latest props to the runtime (declared before the effect that starts the scheduler)
  useEffect(() => {
    rt.setInputs({ program, unlocked, focus, celebration, interactive, autoplay });
  });

  // scheduler + lifecycle: everything audible is torn down when the route is hidden / unmounted
  useEffect(() => {
    rt.attach(setUi);
    const timer = window.setInterval(() => rt.tick(), 25);
    const onVisibility = () => rt.onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      rt.detach();
    };
  }, [rt]);

  // HTML HUD: sampled from the runtime at ~10Hz, re-rendered only when something changed
  useEffect(() => {
    let last = "";
    const id = window.setInterval(() => {
      const next = readHud(rt);
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setHud(next);
      }
      setRoomy((stageRef.current?.rowSpacing() ?? 30) >= 24);
    }, 100);
    return () => window.clearInterval(id);
  }, [rt]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      const h = Math.round(e.contentRect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useThreeStage(canvasRef, (ctx) => {
    const stage = createBeatStage(ctx, rt, labelsRef.current);
    stageRef.current = stage;
    return {
      frame: stage.frame,
      resize: stage.resize,
      dispose: () => {
        stage.dispose?.();
        stageRef.current = null;
      },
    };
  });

  const canPlay = interactive && !!program && unlocked.has("power");
  const silent = ui.playing && ui.audio !== "on" && ui.audio !== "unsupported";
  const displayFocus = !!focus && !unlocked.has(focus) && (focus === "power" || focus === "tempo");
  const ledFocus = focus === "arranger" && !unlocked.has("arranger");

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.focus({ preventScroll: true });
    if (!interactive) return;
    const box = e.currentTarget.getBoundingClientRect();
    const hit = stageRef.current?.pick(e.clientX - box.left, e.clientY - box.top) ?? null;
    void rt.ensureAudio(true).then(() => {
      if (hit) rt.audition(hit);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) void rt.toggle();
    }
  };

  // HUD density follows the stage size; stage3d frames the machine below hudTopPx(mode) to match
  const mode = hudMode(size.w, size.h);
  const narrow = size.w < 420;
  const lines = mode === "full" ? hud.lines : hud.lines.slice(-1);
  const subs = mode === "full" && roomy;
  const beatIdx = hud.step >= 0 ? Math.floor(hud.step / 4) : -1;
  const lamps = (
    <div className="flex shrink-0 items-center gap-1.5">
      {[0, 1, 2, 3].map((b) => (
        <span
          key={b}
          className={`h-2 w-2 rounded-full ${hud.powered && beatIdx === b ? "bg-lime-300 shadow-[0_0_10px_2px_rgba(163, 230, 53,0.8)]" : "border border-lime-300/40"}`}
        />
      ))}
    </div>
  );
  const barText = hud.arranger ? `BAR ${hud.playing ? String(hud.bar).padStart(2, "0") : "--"}` : `STEP ${hud.step >= 0 ? String(hud.step + 1).padStart(2, "0") : "--"}/16`;
  const sectionText = hud.arranger ? (hud.playing ? hud.section : "-") : "";
  const sectionClass = hud.section === "groove" ? "text-lime-300" : hud.section === "break" ? "text-white/70" : "text-lime-100";
  const panel = mode === "tiny" ? "rounded-xl border border-white/10 bg-black/45 px-2.5 py-1.5 backdrop-blur" : GLASS;
  const shortInfo = hud.info.split(" · ");

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        tabIndex={interactive ? 0 : -1}
        aria-label="Beat Lab drum machine. Press space to play or stop. Tap a row to hear its sound."
        className="absolute inset-0 h-full w-full touch-manipulation outline-none"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      />

      {/* 3D-anchored labels: the stage writes their transform every frame (no layout reads) */}
      <div className="pointer-events-none absolute inset-0 z-[5] font-mono">
        {hud.rows.map((r, i) => (
          <div
            key={r.label}
            ref={(el) => {
              labelsRef.current.rows[i] = el;
            }}
            className="absolute left-0 top-0 whitespace-nowrap pr-2 text-right will-change-transform"
            style={{ opacity: 0 }}
          >
            <div className={`${subs ? "text-[11px] leading-tight" : "text-[10px] leading-none"} font-medium tracking-wide ${r.tone === "off" ? "text-white/40" : r.muted ? "text-white/45 line-through" : "text-white"}`}>
              {r.label}
            </div>
            {subs && r.sub && <div className={`max-w-[90px] truncate text-[10px] leading-tight ${TONE[r.tone]}`}>{r.sub}</div>}
          </div>
        ))}
        {TRACK_IDS.map((id, i) => {
          const m = hud.mixer[i];
          return (
            <div
              key={id}
              ref={(el) => {
                labelsRef.current.mixer[i] = el;
              }}
              className="absolute left-0 top-0 whitespace-nowrap rounded-md bg-black/45 px-1 py-px text-[10px] font-medium leading-tight text-lime-100 will-change-transform"
              style={{ opacity: 0 }}
            >
              {m ? m.vol : ""}
              {m?.mute && <span className="ml-1 text-[#f87171]">M</span>}
            </div>
          );
        })}
      </div>

      {/* display: title, tempo and what print() said (with no program, StageShell shows its own hint here) */}
      <div className={`pointer-events-none absolute left-3 top-12 z-10 max-w-[min(58%,340px)] ${panel} ${displayFocus ? "pulse-ring" : ""} ${hud.hasProgram ? "" : "hidden"}`}>
        {!hud.powered ? (
          mode === "tiny" ? (
            <div className="truncate font-mono text-[11px] leading-4">
              <span className="font-medium text-lime-200">NO POWER</span> <span className="text-white/55">· print() to boot</span>
            </div>
          ) : (
            <div className="font-mono text-[11px] leading-snug">
              <div className="font-medium tracking-wider text-lime-200">NO POWER</div>
              <div className="truncate text-white/55">print() something to boot</div>
            </div>
          )
        ) : mode === "tiny" ? (
          <div className="truncate font-mono text-[11px] leading-4">
            <span className={`font-sans text-[12px] font-semibold ${hud.tempo ? "text-white" : "text-white/35"}`}>{hud.tempo ? hud.title : "UNTITLED"}</span>
            {hud.tempo && <span className="text-lime-200"> · {shortInfo[0]}</span>}
          </div>
        ) : (
          <div className="min-w-0 font-mono text-[11px] leading-snug">
            <div className={`truncate font-sans text-[13px] font-semibold ${hud.tempo ? "text-white" : "text-white/35"}`}>{hud.tempo ? hud.title : "UNTITLED"}</div>
            <div className={`truncate ${hud.tempo ? "text-lime-200" : "text-white/35"}`}>{hud.tempo ? (narrow ? shortInfo.slice(0, 2).join(" · ") : hud.info) : "tempo: locked"}</div>
            {lines.length === 0 ? (
              <div className="truncate text-white/40">› (nothing printed yet)</div>
            ) : (
              lines.map((l, i) => (
                <div key={`${i}:${l}`} className="truncate text-white/65">
                  › {l}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* LED panel: beat lamps, bar counter and the arranger's decision */}
      <div className={`pointer-events-none absolute right-3 top-12 z-10 ${panel} ${ledFocus ? "pulse-ring" : ""}`}>
        {mode === "tiny" ? (
          <div className="flex items-center gap-2 font-mono text-[11px] leading-4">
            {lamps}
            <span className="text-white/75">{barText}</span>
            {sectionText && <span className={`font-medium uppercase ${sectionClass}`}>{sectionText}</span>}
          </div>
        ) : (
          <>
            <div className="flex justify-end">{lamps}</div>
            <div className="mt-1 text-right font-mono text-[11px] leading-snug">
              <div className="text-white/75">{barText}</div>
              {sectionText && <div className={`font-medium uppercase tracking-wider ${sectionClass}`}>{sectionText}</div>}
            </div>
          </>
        )}
      </div>

      {/* bottom-right cluster (the row labels live on the left, so nothing here can collide with them) */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-2">
        {silent && interactive && (
          <div
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] leading-4 text-white/80 backdrop-blur"
            title={autoplay ? "Tap for sound" : "Sound is off"}
          >
            <VolumeX className="h-3.5 w-3.5" />
            {narrow ? "" : autoplay ? "Tap for sound" : "Sound is off"}
          </div>
        )}
        {canPlay && (
          <button
            type="button"
            onClick={() => void rt.toggle()}
            className={`pointer-events-auto flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium leading-4 transition-colors ${
              silent
                ? "border-transparent bg-[#a3e635] text-black"
                : ui.playing
                  ? "border-white/15 bg-black/55 text-white backdrop-blur hover:bg-white/15"
                  : "border-transparent bg-[#a3e635] text-black"
            }`}
          >
            {silent ? <><Volume2 className="h-3.5 w-3.5" /> Sound on</> : ui.playing ? <><Square className="h-3 w-3" fill="currentColor" /> Stop</> : <><Play className="h-3 w-3" fill="currentColor" /> Play</>}
            {!narrow && <span className="ml-1 opacity-60 [@media(pointer:coarse)]:hidden">(Space)</span>}
          </button>
        )}
      </div>
    </div>
  );
}
