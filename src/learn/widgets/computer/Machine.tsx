"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Icon, Note, Seg } from "./ui";

export type PartId = "cpu" | "ram" | "storage" | "keyboard" | "mouse" | "mic" | "screen" | "speaker";

interface Part {
  id: PartId;
  label: string;
  long: string;
  group: "input" | "core" | "output";
  role: string;
  like: string;
  /** For memory parts: does it keep data with the power off? */
  keeps?: boolean;
}

const PARTS: Part[] = [
  { id: "keyboard", label: "Keyboard", long: "Keyboard", group: "input", role: "Turns each key press into a number (which key, pressed or released) and sends it to the computer.", like: "A row of labelled doorbells." },
  { id: "mouse", label: "Mouse", long: "Mouse or trackpad", group: "input", role: "Reports how far it moved and which buttons are down, many times a second.", like: "Someone calling out directions." },
  { id: "mic", label: "Mic", long: "Microphone", group: "input", role: "Measures air pressure tens of thousands of times a second and sends each reading as a number.", like: "An ear that writes down what it hears." },
  { id: "cpu", label: "CPU", long: "Processor (CPU)", group: "core", role: "Follows a program's instructions one at a time: add these two numbers, compare those, copy this byte over there. It does billions of these tiny steps every second.", like: "The cook following a recipe." },
  { id: "ram", label: "Memory", long: "Memory (RAM)", group: "core", role: "Holds the programs and data in use right now, so the CPU can reach them fast. Everything in it vanishes when the power goes off.", like: "The kitchen counter: close at hand, cleared every night.", keeps: false },
  { id: "storage", label: "Storage", long: "Storage (SSD or hard drive)", group: "core", role: "Keeps files and installed apps, even with the power off. Far bigger than memory, but much slower to reach.", like: "The pantry: lots of room, but you have to walk to it.", keeps: true },
  { id: "screen", label: "Screen", long: "Screen", group: "output", role: "Lights up millions of pixels, each from colour numbers the computer sends it.", like: "A huge grid of tiny coloured lamps." },
  { id: "speaker", label: "Speaker", long: "Speakers", group: "output", role: "Turns a stream of numbers back into vibrations in the air that you hear as sound.", like: "The microphone, run backwards." },
];

export interface MachineScenario {
  label: string;
  path: { part: PartId; text: string }[];
}

export interface MachineProps {
  /** "explore": tap parts to read about them. "pick": tap the part that answers the question. "flow": step through scenarios. */
  mode?: "explore" | "pick" | "flow";
  scenarios?: MachineScenario[];
  /** Explore mode: part shown at the start. */
  initial?: PartId;
}

export type MachineState =
  | { mode: "explore"; selected: PartId | null; seen: PartId[] }
  | { mode: "pick"; picked: PartId | null }
  | { mode: "flow"; scenario: number; pos: number; atEnd: boolean };

const GROUPS: { id: Part["group"]; label: string }[] = [
  { id: "input", label: "Input" },
  { id: "core", label: "Inside the box" },
  { id: "output", label: "Output" },
];

/** A computer's main parts as a diagram: explore them, pick one, or watch a task flow through them. */
export function Machine({ props, onChange, revealed, status, goal }: WidgetProps<MachineProps>) {
  const mode = props.mode ?? "explore";
  const scenarios = props.scenarios ?? [];
  const [selected, setSelected] = useState<PartId | null>(props.initial ?? (mode === "explore" ? "cpu" : null));
  const [seen, setSeen] = useState<PartId[]>(props.initial ? [props.initial] : mode === "explore" ? ["cpu"] : []);
  const [scenario, setScenario] = useState(0);
  const [pos, setPos] = useState(0);
  const locked = Boolean(revealed) && mode !== "explore";

  const path = scenarios[scenario]?.path ?? [];
  const tap = (id: PartId) => {
    if (mode === "flow") return;
    if (mode === "pick") {
      if (locked) return;
      setSelected(id);
      onChange?.({ mode: "pick", picked: id } satisfies MachineState);
      return;
    }
    const nextSeen = seen.includes(id) ? seen : [...seen, id];
    setSelected(id);
    setSeen(nextSeen);
    onChange?.({ mode: "explore", selected: id, seen: nextSeen } satisfies MachineState);
  };
  const goTo = (s: number, p: number) => {
    const len = scenarios[s]?.path.length ?? 0;
    const np = Math.max(0, Math.min(len, p));
    setScenario(s);
    setPos(np);
    onChange?.({ mode: "flow", scenario: s, pos: np, atEnd: np === len } satisfies MachineState);
  };

  const target = mode === "pick" && status === "revealed" && typeof goal?.picked === "string" ? (goal.picked as PartId) : null;
  const current = mode === "flow" && pos > 0 ? path[pos - 1] : null;
  const info = mode === "explore" || (mode === "pick" && revealed) ? PARTS.find((p) => p.id === (target ?? selected)) : undefined;

  const stateOf = (id: PartId): { look: "on" | "trail" | "target" | "idle"; badge?: number } => {
    if (mode === "flow") {
      const visits = path.slice(0, pos).map((s, i) => (s.part === id ? i + 1 : 0)).filter(Boolean);
      if (current?.part === id) return { look: "on", badge: visits[visits.length - 1] };
      if (visits.length) return { look: "trail", badge: visits[visits.length - 1] };
      return { look: "idle" };
    }
    if (target === id) return { look: "target" };
    if (selected === id) return { look: "on" };
    if (mode === "explore" && seen.includes(id)) return { look: "trail" };
    return { look: "idle" };
  };

  return (
    <div className="w-full">
      {mode === "flow" && scenarios.length > 1 && (
        <div className="mb-4 flex justify-center">
          <Seg label="Task" options={scenarios.map((s, i) => ({ value: i, label: s.label }))} value={scenario} onChange={(i) => goTo(i, 0)} />
        </div>
      )}

      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2 sm:gap-4">
        {GROUPS.map((g) => (
          <div key={g.id} className={`flex flex-col gap-2 rounded-2xl p-1.5 sm:p-2 ${g.id === "core" ? "border border-line bg-surface-2" : ""}`}>
            <Caption className="px-1 text-center !text-[9.5px] sm:!text-[10.5px]">
              {g.id === "input" ? `${g.label} →` : g.id === "output" ? `→ ${g.label}` : g.label}
            </Caption>
            <div className={`flex flex-1 flex-col gap-2 ${g.id === "core" ? "" : "justify-center"}`}>
              {PARTS.filter((p) => p.group === g.id).map((p) => {
                const s = stateOf(p.id);
                const look =
                  s.look === "on"
                    ? "border-transparent bg-primary text-primary-ink shadow-[0_0_0_4px_var(--brand-soft)]"
                    : s.look === "target"
                      ? "border-[var(--brand)] border-dashed bg-tint text-ink"
                      : s.look === "trail"
                        ? "border-[var(--brand)]/50 bg-tint text-ink"
                        : "border-line bg-surface text-ink";
                const big = p.group === "core";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => tap(p.id)}
                    disabled={mode === "flow" || locked}
                    aria-pressed={s.look === "on"}
                    aria-label={p.long}
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border px-1 transition-all disabled:cursor-default ${big ? "min-h-[4.6rem] sm:min-h-[5.2rem]" : "min-h-[3.6rem]"} ${look} ${
                      mode !== "flow" && !locked && s.look === "idle" ? "hover:border-[var(--line-strong)] hover:bg-surface-2" : ""
                    }`}
                  >
                    <Icon name={p.id} className={big ? "h-6 w-6" : "h-5 w-5"} />
                    <span className={`font-medium leading-tight ${big ? "text-[0.8rem] sm:text-sm" : "text-[0.72rem] sm:text-[0.8rem]"}`}>{p.label}</span>
                    {s.badge !== undefined && (
                      <span
                        className={`absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 font-mono text-[10px] font-semibold ${
                          s.look === "on" ? "bg-[var(--ink)] text-[var(--surface)]" : "bg-primary text-primary-ink"
                        }`}
                      >
                        {s.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {info && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-4" aria-live="polite">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-tint text-brand">
              <Icon name={info.id} className="h-4 w-4" />
            </span>
            <p className="font-semibold text-ink">{info.long}</p>
            <span className="chip ml-auto capitalize">{info.group === "core" ? (info.id === "cpu" ? "processing" : info.id === "ram" ? "memory" : "storage") : info.group}</span>
          </div>
          <p className="mt-2.5 text-[0.92rem] leading-relaxed text-ink-2">{info.role}</p>
          <p className="mt-1.5 text-[0.85rem] italic text-ink-3">{info.like}</p>
          {info.keeps !== undefined && (
            <p className="mt-2 text-[0.82rem] text-ink-2">
              Power off: <span className="font-semibold text-ink">{info.keeps ? "keeps everything" : "forgets everything"}</span>
            </p>
          )}
        </div>
      )}
      {mode === "explore" && seen.length < PARTS.length && <p className="mt-2 text-center text-xs text-ink-3">Tap any part. {PARTS.length - seen.length} not opened yet.</p>}
      {mode === "pick" && !revealed && <p className="mt-3 text-center text-xs text-ink-3">{selected ? `You picked: ${PARTS.find((p) => p.id === selected)?.long}` : "Tap a part."}</p>}

      {mode === "flow" && (
        <div className="mt-4 grid gap-3">
          <Note tone={current ? "accent" : "plain"}>
            {current ? (
              <>
                <span className="font-mono text-xs font-semibold text-brand">
                  {pos}/{path.length}
                </span>{" "}
                {current.text}
              </>
            ) : (
              <>Press Next to follow “{scenarios[scenario]?.label}” through the machine.</>
            )}
          </Note>
          <div className="flex items-center justify-center gap-2">
            <Btn onClick={() => goTo(scenario, pos - 1)} disabled={pos === 0} label="Back">
              <ChevronLeft className="h-4 w-4" /> Back
            </Btn>
            {pos < path.length ? (
              <Btn primary onClick={() => goTo(scenario, pos + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Btn>
            ) : (
              <Btn onClick={() => goTo(scenario, 0)}>
                <RotateCcw className="h-4 w-4" /> Again
              </Btn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** goal: { picked } (pick mode), { seen: n } (explore: opened at least n parts) or { atEnd: true } (flow). */
export function checkMachine(state: unknown, goal: Record<string, unknown>) {
  const s = state as MachineState | undefined;
  if (!s) return false;
  if (typeof goal.picked === "string") return s.mode === "pick" && s.picked === goal.picked;
  if (typeof goal.seen === "number") return s.mode === "explore" && s.seen.length >= goal.seen;
  if (goal.atEnd === true) return s.mode === "flow" && s.atEnd;
  return false;
}
