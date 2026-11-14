"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Explainer, type ExplainScene } from "../explain/Explainer";
import { ease, lerp, r2, seg } from "../explain/anim";
import { isoLimit } from "./phys";
import { Note, Readout, Seg, Slider, Toy, ORANGE, sci, whole } from "./ui";

// ───────────────────────────── semi-ingot: sand to wafer, in five scenes ─────────────────────────────

const INK = "var(--ink)";
const INK2 = "var(--ink-2)";
const BRAND = "var(--brand)";
const LINE = "var(--line-strong)";
const SURF = "var(--surface)";
const SURF2 = "var(--surface-2)";
const HOT = ORANGE;

function Label({ x, y, children, anchor = "middle", o = 1, bold }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end"; o?: number; bold?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={14} fontWeight={bold ? 600 : 400} fill={INK} opacity={o}>
      {children}
    </text>
  );
}

function Arrow({ x1, x2, y, o = 1 }: { x1: number; x2: number; y: number; o?: number }) {
  return (
    <g opacity={o}>
      <line x1={x1} y1={y} x2={x2 - 2} y2={y} stroke={INK2} strokeWidth={2} />
      <path d={`M${x2 - 8} ${y - 5} L${x2} ${y} L${x2 - 8} ${y + 5}`} fill="none" stroke={INK2} strokeWidth={2} />
    </g>
  );
}

/** Deterministic sand grains. */
const GRAINS = Array.from({ length: 26 }, (_, i) => ({ x: 22 + ((i * 29) % 70), y: 150 - ((i * 7) % 26) - Math.abs(((i * 29) % 70) - 35) * 0.5 }));

function sand(t: number) {
  const a = ease(seg(t, 0.15, 0.45));
  const b = ease(seg(t, 0.5, 0.85));
  return (
    <g>
      {GRAINS.map((g, i) => (
        <circle key={i} cx={g.x} cy={r2(g.y + 20)} r={3.5} fill="#d8b56a" />
      ))}
      <Label x={58} y={196}>quartz sand</Label>
      <Label x={58} y={214}>(SiO₂)</Label>
      <Arrow x1={104} x2={140} y={150} o={a} />
      {/* furnace */}
      <g opacity={a}>
        <rect x={146} y={96} width={70} height={84} rx={6} fill={SURF2} stroke={LINE} strokeWidth={1.5} />
        <rect x={158} y={130} width={46} height={40} rx={4} fill={HOT} opacity={0.85} />
        <line x1={170} y1={70} x2={170} y2={122} stroke={INK} strokeWidth={4} />
        <line x1={192} y1={70} x2={192} y2={122} stroke={INK} strokeWidth={4} />
        <Label x={181} y={196}>arc furnace</Label>
        <Label x={181} y={214}>with carbon</Label>
      </g>
      <Arrow x1={222} x2={258} y={150} o={b} />
      <g opacity={b}>
        <path d="M268 166 L284 128 L314 122 L336 146 L326 172 L286 178 Z" fill="#8a96a3" stroke={INK} strokeWidth={1.2} />
        <Label x={302} y={196}>silicon,</Label>
        <Label x={302} y={214}>98–99% pure</Label>
      </g>
      <Label x={180} y={32} bold>
        Sand + carbon + heat → silicon
      </Label>
      <Label x={180} y={52} o={0.85}>
        about 2,000 °C: carbon pulls the oxygen off
      </Label>
    </g>
  );
}

function purify(t: number) {
  const a = ease(seg(t, 0.1, 0.4));
  const rod = ease(seg(t, 0.45, 0.9));
  return (
    <g>
      <Label x={180} y={30} bold>
        Purify through a gas
      </Label>
      <rect x={30} y={70} width={56} height={120} rx={8} fill={SURF2} stroke={LINE} strokeWidth={1.5} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={38} y1={92 + i * 24} x2={78} y2={92 + i * 24} stroke={LINE} strokeWidth={1.5} />
      ))}
      <Label x={58} y={208}>distil</Label>
      <Arrow x1={92} x2={150} y={130} o={a} />
      <text x={121} y={118} textAnchor="middle" fontSize={14} fill={INK2} opacity={a}>
        gas
      </text>
      {/* deposition reactor bell jar with a growing rod */}
      <path d="M150 190 V96 Q150 64 200 64 Q250 64 250 96 V190 Z" fill={SURF} stroke={LINE} strokeWidth={1.5} />
      <rect x={r2(200 - lerp(2, 12, rod))} y={r2(176 - lerp(10, 96, rod))} width={r2(lerp(4, 24, rod))} height={r2(lerp(10, 96, rod))} rx={3} fill="#8a96a3" stroke={INK} strokeWidth={1} />
      <Label x={200} y={208}>polysilicon rod grows</Label>
      <g opacity={rod}>
        <Label x={306} y={110}>99.9999999%</Label>
        <Label x={306} y={130}>&quot;nine nines&quot;</Label>
        <Label x={306} y={150}>or purer</Label>
      </g>
      <Label x={180} y={50} o={0.85}>
        silicon → trichlorosilane gas → silicon again
      </Label>
    </g>
  );
}

function crystal(t: number, reduced: boolean) {
  const grow = ease(seg(t, 0.15, 0.9));
  const len = lerp(6, 76, grow);
  const spin = reduced ? 0 : t * 4;
  return (
    <g>
      <Label x={180} y={26} bold>
        Grow one perfect crystal
      </Label>
      {/* pull rod and seed */}
      <line x1={180} y1={36} x2={180} y2={r2(176 - len - 34)} stroke={INK} strokeWidth={2} />
      {/* ingot */}
      <rect x={150} y={r2(176 - len - 34)} width={60} height={r2(len)} rx={4} fill="#8a96a3" stroke={INK} strokeWidth={1.2} />
      <path d={`M150 ${r2(176 - 34)} Q180 ${r2(176 - 22)} 210 ${r2(176 - 34)}`} fill="none" stroke={INK} strokeWidth={1.2} />
      {/* turning: an arc round the pull rod just above the ingot, with an arrowhead that slides while playing */}
      <path d={`M164 ${r2(176 - len - 44)} a 16 6 0 1 0 32 0`} fill="none" stroke={BRAND} strokeWidth={2} />
      <circle cx={r2(180 + 16 * Math.cos(spin))} cy={r2(176 - len - 44 + 6 * Math.abs(Math.sin(spin)))} r={3} fill={BRAND} />
      {/* crucible and melt */}
      <path d="M110 140 V196 Q110 210 124 210 H236 Q250 210 250 196 V140" fill="none" stroke={INK} strokeWidth={2} />
      <rect x={112} y={146} width={136} height={60} rx={8} fill={HOT} opacity={0.75} />
      <Label x={290} y={168} anchor="start">molten</Label>
      <Label x={290} y={186} anchor="start">silicon</Label>
      <Label x={290} y={204} anchor="start">1,414 °C</Label>
      <Label x={70} y={90} anchor="middle">pull up</Label>
      <Label x={70} y={108} anchor="middle">slowly,</Label>
      <Label x={70} y={126} anchor="middle">turning</Label>
      <text x={290} y={100} fontSize={14} fill={INK2} opacity={grow}>
        ingot
      </text>
      <line x1={286} y1={96} x2={214} y2={r2(176 - len / 2 - 34)} stroke={INK2} strokeWidth={1} opacity={grow} />
    </g>
  );
}

function slice(t: number) {
  const cut = ease(seg(t, 0.15, 0.55));
  const drop = ease(seg(t, 0.6, 0.95));
  const wires = 7;
  return (
    <g>
      <Label x={180} y={26} bold>
        Slice it into wafers
      </Label>
      <rect x={60} y={70} width={240} height={64} rx={6} fill="#8a96a3" stroke={INK} strokeWidth={1.2} />
      {Array.from({ length: wires }, (_, i) => {
        const x = 90 + i * 30;
        return <line key={i} x1={x} y1={r2(56)} x2={x} y2={r2(lerp(60, 140, cut))} stroke={BRAND} strokeWidth={1.6} />;
      })}
      {[0, 1, 2].map((i) => (
        <g key={i} opacity={drop}>
          <ellipse cx={110 + i * 70} cy={r2(lerp(160, 188, drop))} rx={26} ry={9} fill={SURF} stroke={INK} strokeWidth={1.2} />
        </g>
      ))}
      <Label x={180} y={160} o={1 - drop}>
        a wire saw cuts hundreds at once
      </Label>
      <Label x={180} y={222} o={drop}>
        300 mm wafers are about 0.775 mm thick
      </Label>
      <Label x={180} y={50} o={0.85}>
        ground to an exact diameter first
      </Label>
    </g>
  );
}

function polish(t: number) {
  const shine = ease(seg(t, 0.1, 0.5));
  const box = ease(seg(t, 0.55, 0.9));
  return (
    <g>
      <Label x={180} y={26} bold>
        Polish, inspect, seal
      </Label>
      <circle cx={110} cy={128} r={70} fill={SURF} stroke={INK} strokeWidth={1.5} />
      <path d="M104 198 L110 190 L116 198" fill={SURF2} stroke={INK} strokeWidth={1.2} />
      <path d={`M70 96 Q110 ${r2(lerp(120, 80, shine))} 150 96`} fill="none" stroke={BRAND} strokeWidth={3} opacity={shine} />
      <Label x={180} y={222}>a notch marks the crystal direction</Label>
      <g opacity={box}>
        <rect x={232} y={78} width={100} height={100} rx={10} fill={SURF2} stroke={INK} strokeWidth={1.5} />
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={244} y1={96 + i * 16} x2={320} y2={96 + i * 16} stroke={INK2} strokeWidth={2} />
        ))}
        <Label x={282} y={196}>sealed carrier</Label>
      </g>
      <Label x={180} y={50} o={0.85}>
        mirror-flat to within nanometres
      </Label>
    </g>
  );
}

const SCENES: ExplainScene[] = [
  {
    id: "sand",
    title: "1. Sand to silicon",
    caption: "Quartz sand is silicon dioxide. Heated to about 2,000 °C in an arc furnace with carbon, the carbon takes the oxygen away and leaves silicon that is about 98 to 99 percent pure: good enough for steel and aluminium alloys, nowhere near good enough for chips.",
    durationMs: 9000,
    render: (t) => sand(t),
  },
  {
    id: "purify",
    title: "2. Purify through a gas",
    caption: "The silicon is reacted into a liquid compound, trichlorosilane, that can be distilled like spirits. The pure vapour then deposits silicon back onto hot rods. The result, polysilicon, is about 99.9999999 percent pure (\"nine nines\") or better: at most about one stray atom per billion.",
    durationMs: 10000,
    render: (t) => purify(t),
  },
  {
    id: "crystal",
    title: "3. Grow one perfect crystal",
    caption: "The polysilicon is melted in a quartz crucible just above silicon's melting point, 1,414 °C. A small seed crystal is dipped in and pulled up slowly while turning (the Czochralski method). Atoms freeze onto the seed in its exact pattern, so the whole ingot is a single crystal. A little boron or phosphorus in the melt sets the wafer's starting doping.",
    durationMs: 11000,
    render: (t, reduced) => crystal(t, reduced),
  },
  {
    id: "slice",
    title: "4. Slice into wafers",
    caption: "The ingot is ground to an exact diameter (300 mm for modern fabs, 200 mm for many older ones) and a wire saw cuts it into hundreds of thin discs at once. A 300 mm wafer is about 0.775 mm thick.",
    durationMs: 9000,
    render: (t) => slice(t),
  },
  {
    id: "polish",
    title: "5. Polish, inspect, seal",
    caption: "Each wafer is lapped, etched and polished until the surface is flat to within nanometres, then cleaned and inspected. A small notch on the edge marks the crystal's direction. Wafers travel in sealed carriers so they never meet ordinary air.",
    durationMs: 9000,
    render: (t) => polish(t),
  },
];

export interface IngotProps {
  scenes?: string[];
}

export function Ingot({ props }: WidgetProps<IngotProps>) {
  const scenes = props.scenes?.length ? SCENES.filter((s) => props.scenes!.includes(s.id)) : SCENES;
  return <Explainer scenes={scenes.length ? scenes : SCENES} width={360} height={240} label="From sand to a polished wafer" />;
}

// ───────────────────────────── semi-iso: cleanroom classes ─────────────────────────────

export interface IsoProps {
  cls?: number;
  size?: number;
}
export interface IsoState {
  cls: number;
  size: number;
  limit: number;
}

const SIZES = [0.1, 0.2, 0.3, 0.5, 1, 5];

const EXAMPLES: Record<number, string> = {
  1: "the cleanest air any standard names",
  2: "inside the most demanding wafer handling equipment",
  3: "around lithography tools and inside sealed wafer carriers (typical)",
  4: "inside a modern fab's process tools and mini-environments (typical)",
  5: "the old US \"Class 100\": a classic chip cleanroom bay",
  6: "\"Class 1,000\": assembly of precise optics",
  7: "\"Class 10,000\": hospital pharmacies, electronics assembly",
  8: "\"Class 100,000\": many packaging and test areas",
  9: "about as clean as ordinary indoor air",
};

export function Iso({ props, onChange }: WidgetProps<IsoProps>) {
  const [cls, setCls] = useState(props.cls ?? 9);
  const [size, setSize] = useState(props.size ?? 0.5);
  const limit = isoLimit(cls, size);
  const report = (c: number, s: number) => onChange?.({ cls: c, size: s, limit: isoLimit(c, s) } satisfies IsoState);
  const perLitre = limit / 1000;
  // dots in a "litre" box on a log scale: five more dots for every ten times more particles
  const dots = Math.max(0, Math.min(40, Math.round(Math.log10(Math.max(perLitre, 1)) * 5)));

  return (
    <div className="w-full" data-widget>
      <Slider
        label="Cleanroom class"
        value={cls}
        min={1}
        max={9}
        step={1}
        onChange={(v) => {
          setCls(v);
          report(v, size);
        }}
        format={(v) => `ISO ${v}`}
      />
      <div className="mt-2">
        <p className="mb-1 text-xs text-ink-3">Count particles at least this big</p>
        <Seg
          label="Particle size"
          value={size}
          onChange={(v) => {
            setSize(v);
            report(cls, v);
          }}
          options={SIZES.map((s) => ({ value: s, label: `${s} µm` }))}
        />
      </div>
      <div className="mt-3 grid items-center gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Readout label="Allowed per m³" value={limit >= 1 ? whole(limit) : limit.toFixed(2)} accent />
          <Readout label="Per litre" value={perLitre >= 10 ? whole(perLitre) : perLitre >= 0.01 ? perLitre.toFixed(2) : sci(perLitre, 1)} />
        </div>
        <svg viewBox="0 0 120 80" className="mx-auto block h-auto w-40" role="img" aria-label={`A litre of air at ISO ${cls}: about ${perLitre >= 1 ? whole(perLitre) : "less than one"} particles of ${size} micrometres or larger.`}>
          <rect x={2} y={2} width={116} height={76} rx={8} fill="var(--surface)" stroke={LINE} strokeWidth={1.5} />
          {Array.from({ length: dots }, (_, i) => (
            <circle key={i} cx={10 + ((i * 37) % 100)} cy={10 + ((i * 23) % 60)} r={2.5} fill={HOT} />
          ))}
        </svg>
      </div>
      <div className="mt-3">
        <Note tone="accent">
          ISO {cls}: {EXAMPLES[cls]}. At most {limit >= 1 ? whole(limit) : limit.toFixed(2)} particles of {size} µm or larger in every cubic metre of air.
        </Note>
      </div>
      <Toy>
        Formula from ISO 14644-1: limit = 10^N × (0.1 / size in µm)^2.08 per m³. The standard only tabulates some class and size pairs; this applies the formula everywhere. The litre box is on a log scale: five more dots for every ten times more particles. Examples are typical, not rules.
      </Toy>
    </div>
  );
}

export function checkIso(state: unknown, goal: Record<string, unknown>) {
  const s = state as IsoState | undefined;
  if (!s) return false;
  if (typeof goal.cls === "number" && s.cls !== goal.cls) return false;
  if (typeof goal.size === "number" && s.size !== goal.size) return false;
  if (typeof goal.maxLimit === "number" && s.limit > goal.maxLimit) return false;
  if (typeof goal.minLimit === "number" && s.limit < goal.minLimit) return false;
  return true;
}
