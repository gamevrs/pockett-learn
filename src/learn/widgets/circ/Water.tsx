"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { useReducedMotion } from "../explain/useReducedMotion";
import { Btn, Note, Readout, Seg, Sch, Slider, ToyNote, volts } from "./ui";

export interface WaterProps {
  /** Start on the water picture. */
  view?: "circuit" | "water";
}

export interface WaterState {
  view: "circuit" | "water";
  closed: boolean;
  push: number;
  flowing: boolean;
}

/** goal: { flowing: true|false, minPush, maxPush }. */
export function checkWater(state: unknown, goal: Record<string, unknown>) {
  const s = state as WaterState | undefined;
  if (!s) return false;
  const g = goal as { flowing?: boolean; minPush?: number; maxPush?: number; view?: string };
  if (g.flowing !== undefined && s.flowing !== g.flowing) return false;
  if (g.minPush !== undefined && s.push < g.minPush) return false;
  if (g.maxPush !== undefined && s.push > g.maxPush) return false;
  if (g.view !== undefined && s.view !== g.view) return false;
  return true;
}

const MAX_PUSH = 9;

/** The same loop twice: as a battery, switch and lamp, and as a pump, tap and narrow pipe. Both flow only when the loop is complete. */
export function Water({ props, onChange }: WidgetProps<WaterProps>) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [view, setView] = useState<"circuit" | "water">(props.view ?? "circuit");
  const [closed, setClosed] = useState(false);
  const [push, setPush] = useState(4.5);

  const flowing = closed && push > 0;
  const emit = (v: typeof view, c: boolean, p: number) => onChange?.({ view: v, closed: c, push: p, flowing: c && p > 0 } satisfies WaterState);
  const rel = push / MAX_PUSH;
  const dur = (2 - 1.75 * Math.sqrt(rel)).toFixed(2);
  const brightness = flowing ? Math.min(1, 0.15 + 0.85 * rel) : 0;

  const loop = "M60 40 H300 V150 H60 Z";

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-center">
        <Seg
          label="Picture"
          value={view}
          options={[
            { value: "circuit", label: "Circuit" },
            { value: "water", label: "Water pipes" },
          ]}
          onChange={(v) => {
            setView(v);
            emit(v, closed, push);
          }}
        />
      </div>

      {view === "circuit" ? (
        <Sch
          cols={18}
          rows={9}
          flowRef={Math.sqrt(MAX_PUSH)}
          ariaLabel={`A battery, a switch and a lamp in a loop. The switch is ${closed ? "closed and current flows" : "open, so nothing flows"}.`}
          parts={[
            { kind: "battery", id: "B1", at: [3, 3], rot: 90, label: "Battery", value: volts(push) },
            { kind: "switch", id: "S1", at: [7, 2], label: "Switch", closed },
            { kind: "lamp", id: "L1", at: [14, 3], rot: 90, label: "Lamp", brightness },
          ]}
          wires={[
            { points: ["B1.a", [3, 2], "S1.a"], flow: flowing ? Math.sqrt(push) : 0 },
            { points: ["S1.b", [14, 2], "L1.a"], flow: flowing ? Math.sqrt(push) : 0 },
            { points: ["L1.b", [14, 7], [3, 7], "B1.b"], flow: flowing ? Math.sqrt(push) : 0 },
          ]}
        />
      ) : (
        <svg viewBox="0 0 360 190" className="w-full" role="img" aria-label={`A loop of water pipe with a pump, a tap and a narrow section. The tap is ${closed ? "open, so water circulates" : "shut, so nothing moves"}.`}>
          <style>{`@keyframes circwater${uid}{to{stroke-dashoffset:-20}}`}</style>
          {/* the pipe: wide everywhere except the narrow section on the right */}
          <path d="M300 78 V40 H60 V150 H300 V112" fill="none" stroke="var(--line-strong)" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M300 78 V112" fill="none" stroke="var(--line-strong)" strokeWidth={6} strokeLinecap="round" />
          <path d="M300 78 V40 H60 V150 H300 V112" fill="none" stroke="var(--surface)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M300 78 V112" fill="none" stroke="var(--surface)" strokeWidth={2} strokeLinecap="round" />
          {flowing && (
            <g pointerEvents="none">
              <path
                d={loop}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="0.001 19.999"
                style={reduced ? undefined : { animation: `circwater${uid} ${dur}s linear infinite` }}
              />
              {reduced && (
                <g>
                  <path d="M170 33 L182 40 L170 47Z" fill="var(--brand)" />
                  <path d="M60 100 L53 88 L67 88Z" fill="var(--brand)" />
                </g>
              )}
            </g>
          )}
          {/* the pump */}
          <circle cx={60} cy={95} r={24} fill="var(--surface-2)" stroke="var(--ink)" strokeWidth={2} />
          <path d="M60 106 V84 M51 92 L60 83 L69 92" fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <text x={92} y={100} fontSize={14} fill="var(--ink)">
            Pump
          </text>
          {/* the tap */}
          <rect x={160} y={30} width={40} height={20} rx={4} fill="var(--surface-2)" stroke="var(--ink)" strokeWidth={2} />
          <line x1={180} y1={28} x2={180} y2={52} stroke={closed ? "var(--ink-3)" : "var(--bad)"} strokeWidth={4} strokeLinecap="round" transform={closed ? "rotate(90 180 40)" : undefined} />
          <text x={180} y={22} fontSize={14} textAnchor="middle" fill="var(--ink)">
            Tap
          </text>
          {/* narrow section label */}
          <text x={288} y={100} fontSize={14} textAnchor="end" fill="var(--ink)">
            Narrow pipe
          </text>
          <text x={180} y={176} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
            Water is not used up: it goes round
          </text>
        </svg>
      )}

      <div className="mt-2 grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-x-4">
        <Btn
          on={closed}
          label={view === "circuit" ? (closed ? "Open the switch" : "Close the switch") : closed ? "Shut the tap" : "Open the tap"}
          onClick={() => {
            setClosed(!closed);
            emit(view, !closed, push);
          }}
        >
          {view === "circuit" ? (closed ? "Switch: closed" : "Switch: open") : closed ? "Tap: open" : "Tap: shut"}
        </Btn>
        <Slider
          label={view === "circuit" ? "Battery voltage (the push)" : "Pump pressure (the push)"}
          value={push}
          min={0}
          max={MAX_PUSH}
          step={0.5}
          onChange={(p) => {
            setPush(p);
            emit(view, closed, p);
          }}
          format={(x) => (view === "circuit" ? volts(x) : `${x.toFixed(1)} (units)`)}
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Loop complete" value={closed ? "yes" : "no"} />
        <Readout label="Current flowing" value={flowing ? "yes" : "no"} accent={flowing} />
      </div>
      <div className="mt-2">
        <Note tone={flowing ? "accent" : "neutral"}>
          {flowing
            ? view === "circuit"
              ? "The battery pushes charge round the complete loop. The lamp glows because charge is flowing through it."
              : "The pump pushes water round the complete loop. The narrow pipe is where the flow has to squeeze through, like a lamp."
            : closed
              ? "The loop is complete but the push is zero, so nothing moves. Turn up the push."
              : "The loop has a gap, so nothing can flow anywhere. Close it."}
        </Note>
      </div>
      <ToyNote>The pipe picture is an analogy. It breaks down: wires are not hollow tubes, and charge does not leak out if you cut a wire.</ToyNote>
    </div>
  );
}
