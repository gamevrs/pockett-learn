"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Seg, ToyNote } from "./ui";
import { PACKAGES, PACKAGE_IDS, VERDICT_NAMES, type PackageInfo } from "./packages-data";

export interface PackagesProps {
  /** which packages to offer (ids, default all) */
  ids?: string[];
  /** which one to show first */
  initial?: string;
}

export interface PackagesState {
  selected: string;
  seen: string[];
}

const BODY = "var(--surface-2)";
const OUTLINE = "var(--ink)";
const METAL = "var(--ink-3)";
const sw = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: 1.5 };

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Top-view drawings in millimetres, centred on the origin, y down. Dashed = hidden under the body. */
function Drawing({ id }: { id: string }) {
  switch (id) {
    case "dip8": {
      const xs = [-3.81, -1.27, 1.27, 3.81];
      return (
        <g {...sw}>
          <rect x={-4.9} y={-3.2} width={9.8} height={6.4} rx={0.3} fill={BODY} stroke={OUTLINE} {...sw} />
          <path d="M-4.9 -0.8 A0.8 0.8 0 0 1 -4.9 0.8" fill="none" stroke={OUTLINE} {...sw} />
          {xs.flatMap((x) =>
            [-1, 1].map((s) => (
              <g key={`${x}${s}`}>
                <rect x={x - 0.25} y={s < 0 ? -3.81 : 3.2} width={0.5} height={0.61} fill={METAL} />
                <circle cx={x} cy={s * 3.81} r={0.55} fill="none" stroke={OUTLINE} {...sw} />
              </g>
            )),
          )}
        </g>
      );
    }
    case "to220":
      return (
        <g>
          <rect x={-14.5} y={-5} width={8.5} height={10} fill="var(--surface)" stroke={OUTLINE} {...sw} />
          <circle cx={-11.5} cy={0} r={1.9} fill="none" stroke={OUTLINE} {...sw} />
          <rect x={-6} y={-5} width={10} height={10} fill={BODY} stroke={OUTLINE} {...sw} />
          {[-2.54, 0, 2.54].map((y) => (
            <rect key={y} x={4} y={y - 0.45} width={10.5} height={0.9} fill={METAL} stroke={OUTLINE} {...sw} />
          ))}
        </g>
      );
    case "soic8": {
      const xs = [-1.905, -0.635, 0.635, 1.905];
      return (
        <g>
          {xs.flatMap((x) =>
            [-1, 1].map((s) => <rect key={`${x}${s}`} x={x - 0.2} y={s < 0 ? -3 : 1.95} width={0.4} height={1.05} fill={METAL} stroke={OUTLINE} {...sw} />),
          )}
          <rect x={-2.45} y={-1.95} width={4.9} height={3.9} rx={0.2} fill={BODY} stroke={OUTLINE} {...sw} />
          <circle cx={-1.8} cy={1.2} r={0.3} fill={OUTLINE} />
        </g>
      );
    }
    case "tssop": {
      const xs = range(7).map((i) => -1.95 + i * 0.65);
      return (
        <g>
          {xs.flatMap((x) =>
            [-1, 1].map((s) => <rect key={`${x}${s}`} x={x - 0.125} y={s < 0 ? -3.2 : 2.2} width={0.25} height={1} fill={METAL} stroke={OUTLINE} {...sw} />),
          )}
          <rect x={-2.5} y={-2.2} width={5} height={4.4} rx={0.2} fill={BODY} stroke={OUTLINE} {...sw} />
          <circle cx={-2} cy={1.5} r={0.3} fill={OUTLINE} />
        </g>
      );
    }
    case "qfn32": {
      const ps = range(8).map((i) => -1.75 + i * 0.5);
      return (
        <g>
          <rect x={-2.5} y={-2.5} width={5} height={5} rx={0.2} fill={BODY} stroke={OUTLINE} {...sw} />
          <rect x={-1.55} y={-1.55} width={3.1} height={3.1} fill="none" stroke={OUTLINE} strokeDasharray="4 3" {...sw} />
          {ps.flatMap((p) => [
            <rect key={`t${p}`} x={p - 0.125} y={-2.5} width={0.25} height={0.55} fill="none" stroke={OUTLINE} strokeDasharray="3 2" {...sw} />,
            <rect key={`b${p}`} x={p - 0.125} y={1.95} width={0.25} height={0.55} fill="none" stroke={OUTLINE} strokeDasharray="3 2" {...sw} />,
            <rect key={`l${p}`} x={-2.5} y={p - 0.125} width={0.55} height={0.25} fill="none" stroke={OUTLINE} strokeDasharray="3 2" {...sw} />,
            <rect key={`r${p}`} x={1.95} y={p - 0.125} width={0.55} height={0.25} fill="none" stroke={OUTLINE} strokeDasharray="3 2" {...sw} />,
          ])}
          <circle cx={-1.9} cy={-1.9} r={0.18} fill={OUTLINE} />
        </g>
      );
    }
    case "bga": {
      const ps = range(12).map((i) => -4.4 + i * 0.8);
      return (
        <g>
          <rect x={-5} y={-5} width={10} height={10} rx={0.3} fill={BODY} stroke={OUTLINE} {...sw} />
          {ps.flatMap((x) => ps.map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={0.25} fill="none" stroke={OUTLINE} strokeDasharray="2 2" {...sw} />))}
          <circle cx={-4.6} cy={-4.6} r={0.2} fill={OUTLINE} />
        </g>
      );
    }
    default: {
      // chip passives: a dark body with a metal cap at each end
      const p = PACKAGES.find((q) => q.id === id);
      const [w, h] = p ? p.size : [2, 1.25];
      const cap = w * 0.2;
      return (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#262626" stroke={OUTLINE} {...sw} />
          <rect x={-w / 2} y={-h / 2} width={cap} height={h} fill="#c4c8cc" stroke={OUTLINE} {...sw} />
          <rect x={w / 2 - cap} y={-h / 2} width={cap} height={h} fill="#c4c8cc" stroke={OUTLINE} {...sw} />
        </g>
      );
    }
  }
}

const MAX_LEN = 29;

function Verdict({ p }: { p: PackageInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`Hand soldering: ${VERDICT_NAMES[p.verdict]}`}>
      <span aria-hidden className="inline-flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-2 w-5 rounded-full ${i <= p.verdict ? "bg-[var(--brand)]" : "bg-[var(--line-strong)]"}`} />
        ))}
      </span>
      <b className="text-[0.88rem] text-ink">{VERDICT_NAMES[p.verdict]}</b>
    </div>
  );
}

export function Packages({ props, onChange }: WidgetProps<PackagesProps>) {
  const ids = (props.ids ?? PACKAGE_IDS).filter((i) => PACKAGE_IDS.includes(i));
  const list = PACKAGES.filter((p) => ids.includes(p.id));
  const first = props.initial && ids.includes(props.initial) ? props.initial : (list[0]?.id ?? "dip8");
  const [selected, setSelected] = useState(first);
  const [seen, setSeen] = useState<string[]>([first]);
  const p = PACKAGES.find((q) => q.id === selected) ?? PACKAGES[0];

  const choose = (id: string) => {
    setSelected(id);
    const nextSeen = seen.includes(id) ? seen : [...seen, id];
    setSeen(nextSeen);
    onChange?.({ selected: id, seen: nextSeen } satisfies PackagesState);
  };

  const [lw, lh] = p.size;
  const s = Math.min(300 / lw, 100 / lh);
  const barPx = p.bar * s;

  return (
    <div className="w-full">
      <Seg label="Package" value={selected} onChange={choose} options={list.map((q) => ({ value: q.id, label: q.label }))} />

      <svg viewBox="0 0 360 160" className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={`${p.name}, top view, drawn to scale. ${p.pins}`}>
        <g transform={`translate(180 62) scale(${s})`}>
          <Drawing id={p.id} />
        </g>
        <line x1={20} y1={138} x2={20 + barPx} y2={138} stroke="var(--ink)" strokeWidth={2.5} />
        <line x1={20} y1={132} x2={20} y2={144} stroke="var(--ink)" strokeWidth={2} />
        <line x1={20 + barPx} y1={132} x2={20 + barPx} y2={144} stroke="var(--ink)" strokeWidth={2} />
        <text x={20 + barPx + 8} y={143} fontSize={14} fill="var(--ink)">
          {p.bar} mm
        </text>
        <text x={346} y={20} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          top view
        </text>
      </svg>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[0.95rem] font-semibold text-ink">{p.name}</h4>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-2">{p.mount === "THT" ? "Through-hole (THT)" : "Surface-mount (SMD)"}</span>
        </div>
        <dl className="mt-2 grid gap-x-3 gap-y-2 text-[0.86rem] sm:grid-cols-[7.5rem_1fr]">
          <dt className="text-ink-3">Pitch</dt>
          <dd className="text-ink">{p.pitch}</dd>
          <dt className="text-ink-3">Pins</dt>
          <dd className="text-ink">{p.pins}</dd>
          <dt className="text-ink-3">Hand-solder?</dt>
          <dd className="space-y-1">
            <Verdict p={p} />
            <span className="block text-ink-2">{p.solder}</span>
          </dd>
          <dt className="text-ink-3">Note</dt>
          <dd className="text-ink-2">{p.fact}</dd>
        </dl>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">Longest side, all on one scale (typical)</Caption>
        <ul className="space-y-1">
          {list.map((q) => {
            const len = Math.max(q.size[0], q.size[1]);
            return (
              <li key={q.id} className="flex items-center gap-2 text-xs">
                <span className={`w-12 shrink-0 font-mono ${q.id === selected ? "font-bold text-ink" : "text-ink-2"}`}>{q.label}</span>
                <span className="relative h-3 min-w-0 flex-1">
                  <span className={`absolute left-0 top-0 h-3 rounded-sm ${q.id === selected ? "bg-[var(--brand)]" : "bg-[var(--ink-3)]"}`} style={{ width: `${Math.max(1.5, (len / MAX_LEN) * 100)}%` }} />
                </span>
                <span className="w-14 shrink-0 text-right font-mono tabular-nums text-ink-2">{len} mm</span>
              </li>
            );
          })}
        </ul>
      </div>

      {seen.length >= 3 && (
        <div className="mt-2">
          <Note>You have looked at {seen.length} of {list.length} packages.</Note>
        </div>
      )}
      <ToyNote>Sizes, pitches and soldering verdicts are typical figures. Real parts vary by maker and variant: check the package drawing in the datasheet.</ToyNote>
    </div>
  );
}

/** goal: { selected?: id, minSeen?: number } */
export function checkPackages(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<PackagesState> | undefined;
  if (!s) return false;
  let any = false;
  if (typeof goal.selected === "string") {
    any = true;
    if (s.selected !== goal.selected) return false;
  }
  if (typeof goal.minSeen === "number") {
    any = true;
    if ((s.seen?.length ?? 0) < goal.minSeen) return false;
  }
  return any;
}
