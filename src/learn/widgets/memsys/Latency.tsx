"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { amat, avgLatency, DEFAULT_LEVELS, type Level } from "./cachesim";
import { Caption, Note, Readout, Seg, Slider, fmtBytes, fmtHuman, fmtNs } from "./ui";

// ───────────────────────────── memsys-amat: average memory access time ─────────────────────────────

const NAMES = ["L1", "L2", "L3", "RAM"];
const NS = [1, 4, 15, 90];
const COLORS = ["var(--brand)", "color-mix(in srgb, var(--brand) 60%, var(--ink-3))", "var(--ink-3)", "var(--bad)"];

export interface AmatProps {
  /** Starting hit rates (percent) for L1, L2, L3. */
  initial?: [number, number, number];
}

export interface AmatState {
  hit: [number, number, number];
  ns: number;
  slowdown: number;
}

export function Amat({ props, onChange, revealed }: WidgetProps<AmatProps>) {
  const [hit, setHit] = useState<[number, number, number]>(props.initial ?? [90, 50, 50]);
  const locked = Boolean(revealed);
  const r = amat(
    hit.map((h) => h / 100),
    NS,
  );
  const slowdown = r.ns / NS[0];
  const set = (i: number, v: number) => {
    const next = hit.slice() as [number, number, number];
    next[i] = v;
    setHit(next);
    const rr = amat(
      next.map((h) => h / 100),
      NS,
    );
    onChange?.({ hit: next, ns: rr.ns, slowdown: rr.ns / NS[0] } satisfies AmatState);
  };
  const total = r.ns;
  const ramReach = r.reach[3];

  return (
    <div className="w-full">
      <div className="grid gap-1 sm:grid-cols-3 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <Slider key={i} label={`${NAMES[i]} hit rate (${NS[i]} ns)`} value={hit[i]} min={0} max={100} step={1} onChange={(v) => set(i, v)} disabled={locked} format={(v) => `${v}%`} />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-ink-3">Each rate is the share of the accesses that reach that level and are found there. RAM ({NS[3]} ns) always has it.</p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">Where the average time goes</Caption>
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-[var(--line-strong)]" role="img" aria-label={`Time shares: ${NAMES.map((n, i) => `${n} ${Math.round((r.parts[i] / total) * 100)} percent`).join(", ")}`}>
          {r.parts.map((p, i) => (
            <div key={i} style={{ width: `${(p / total) * 100}%`, background: COLORS[i] }} />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[0.82rem] text-ink-2 sm:grid-cols-4">
          {NAMES.map((n, i) => (
            <li key={n} className="flex items-baseline gap-1.5">
              <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i] }} />
              <span className="text-ink">{n}</span>
              <span className="font-mono tabular-nums">{Math.round((r.parts[i] / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Average access" value={fmtNs(total)} accent />
        <Readout label="vs all-L1" value={`${slowdown.toFixed(1)}×`} />
        <Readout label="Reach RAM" value={`${(ramReach * 100).toFixed(ramReach < 0.1 ? 1 : 0)}%`} />
      </div>
      <div className="mt-3">
        <Note>
          If 1 ns were 1 second, an average access would take <b>{fmtHuman(total)}</b>. Only <b>{(ramReach * 100).toFixed(ramReach < 0.1 ? 1 : 0)}%</b> of accesses go all the way to RAM, yet they cause <b>{Math.round((r.parts[3] / total) * 100)}%</b> of the time.
        </Note>
      </div>
    </div>
  );
}

/** goal: { maxNs, minNs, maxSlowdown } */
export function checkAmat(state: unknown, goal: Record<string, unknown>) {
  const s = state as AmatState | undefined;
  if (!s) return false;
  if (typeof goal.maxNs === "number" && s.ns > goal.maxNs) return false;
  if (typeof goal.minNs === "number" && s.ns < goal.minNs) return false;
  if (typeof goal.maxSlowdown === "number" && s.slowdown > goal.maxSlowdown) return false;
  return true;
}

// ───────────────────────────── memsys-pipe: latency vs bandwidth ─────────────────────────────

interface Link {
  id: string;
  name: string;
  /** Time until the first byte, ns. */
  latencyNs: number;
  /** Bytes per second. */
  bw: number;
  note: string;
}

/** Typical, rounded figures; real devices vary by a factor of a few. */
const LINKS: Link[] = [
  { id: "ram", name: "RAM", latencyNs: 90, bw: 50e9, note: "Dual-channel DDR5 desktop, about 50 GB/s." },
  { id: "nvme", name: "NVMe SSD", latencyNs: 80_000, bw: 5e9, note: "A fast NVMe drive: about 80 µs to the first byte, a few GB/s after." },
  { id: "hdd", name: "Hard disk", latencyNs: 10_000_000, bw: 150e6, note: "Seek and spin: about 10 ms to the first byte, about 150 MB/s after." },
  { id: "net", name: "Ocean link", latencyNs: 150_000_000, bw: 1.25e9, note: "A 10 Gbit/s link across an ocean: 150 ms round trip, 1.25 GB/s." },
];

export interface PipeProps {
  /** Which links to offer (ids). Default all. */
  links?: string[];
  /** Starting link id. */
  link?: string;
  /** Starting size as a power of two (6 = 64 B, 30 = 1 GiB). */
  exp?: number;
}

export interface PipeState {
  link: string;
  exp: number;
  bytes: number;
  totalNs: number;
  /** Share of the time spent moving bytes (the rest is waiting for the first one). */
  transferShare: number;
  /** Achieved bytes/s as a share of the peak bandwidth. */
  efficiency: number;
}

export function Pipe({ props, onChange, revealed }: WidgetProps<PipeProps>) {
  const links = props.links ? LINKS.filter((l) => props.links!.includes(l.id)) : LINKS;
  const [link, setLink] = useState(props.link ?? links[0].id);
  const [exp, setExp] = useState(props.exp ?? 12);
  const locked = Boolean(revealed);
  const L = LINKS.find((l) => l.id === link) ?? links[0];
  const bytes = 2 ** exp;
  const xferNs = (bytes / L.bw) * 1e9;
  const totalNs = L.latencyNs + xferNs;
  const eff = xferNs / totalNs;
  const breakEven = (L.latencyNs * L.bw) / 1e9;

  const report = (l: Link, e: number) => {
    const x = (2 ** e / l.bw) * 1e9;
    onChange?.({ link: l.id, exp: e, bytes: 2 ** e, totalNs: l.latencyNs + x, transferShare: x / (l.latencyNs + x), efficiency: x / (l.latencyNs + x) } satisfies PipeState);
  };
  const pickLink = (id: string) => {
    setLink(id);
    report(LINKS.find((l) => l.id === id)!, exp);
  };
  const pickExp = (e: number) => {
    setExp(e);
    report(L, e);
  };

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <div className="flex flex-wrap justify-center gap-1.5">
          <Seg label="Link" value={link} onChange={pickLink} disabled={locked} options={links.map((l) => ({ value: l.id, label: l.name }))} />
        </div>
      </div>
      <p className="mt-2 text-center text-[0.82rem] text-ink-3">{L.note} (Typical, rounded.)</p>
      <Slider className="mt-2" label="Bytes to move" value={exp} min={6} max={30} step={1} onChange={pickExp} disabled={locked} format={(v) => fmtBytes(2 ** v)} />

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">Total time = waiting for the first byte + moving the rest</Caption>
        <div className="flex h-6 w-full overflow-hidden rounded-full bg-[var(--line-strong)]" role="img" aria-label={`${Math.round((1 - eff) * 100)} percent waiting, ${Math.round(eff * 100)} percent moving bytes`}>
          <div style={{ width: `${(1 - eff) * 100}%`, background: "var(--bad)" }} />
          <div style={{ width: `${eff * 100}%`, background: "var(--brand)" }} />
        </div>
        <div className="mt-1.5 flex justify-between gap-2 text-[0.8rem] text-ink-2">
          <span>
            <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--bad)" }} />
            Latency {fmtNs(L.latencyNs)}
          </span>
          <span>
            <span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--brand)" }} />
            Transfer {fmtNs(xferNs)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Total" value={fmtNs(totalNs)} accent />
        <Readout label="Effective speed" value={`${Math.round(eff * 100)}% of peak`} />
        <Readout label="Break-even size" value={fmtBytes(Math.round(breakEven))} />
      </div>
      <div className="mt-3">
        <Note>
          {eff < 0.5 ? (
            <>
              Moving <b>{fmtBytes(bytes)}</b> is dominated by the wait. The pipe is mostly empty: you are <b>latency-bound</b>.
            </>
          ) : (
            <>
              Moving <b>{fmtBytes(bytes)}</b> is dominated by the flow. The wait is a small cost: you are <b>bandwidth-bound</b>.
            </>
          )}{" "}
          Latency and transfer take equal time at about <b>{fmtBytes(Math.round(breakEven))}</b> (latency × bandwidth).
        </Note>
      </div>
    </div>
  );
}

/** goal: { link, minEfficiency, maxEfficiency, minExp, maxExp } */
export function checkPipe(state: unknown, goal: Record<string, unknown>) {
  const s = state as PipeState | undefined;
  if (!s) return false;
  if (typeof goal.link === "string" && s.link !== goal.link) return false;
  if (typeof goal.minEfficiency === "number" && s.efficiency < goal.minEfficiency) return false;
  if (typeof goal.maxEfficiency === "number" && s.efficiency > goal.maxEfficiency) return false;
  if (typeof goal.minExp === "number" && s.exp < goal.minExp) return false;
  if (typeof goal.maxExp === "number" && s.exp > goal.maxExp) return false;
  return true;
}

// ───────────────────────────── memsys-curve: working set vs latency ─────────────────────────────

interface Machine {
  id: string;
  name: string;
  levels: Level[];
}
const MACHINES: Machine[] = [
  {
    id: "older",
    name: "Older desktop",
    levels: [
      { name: "L1", bytes: 32 * 1024, ns: 1 },
      { name: "L2", bytes: 256 * 1024, ns: 3.5 },
      { name: "L3", bytes: 8 * 1024 * 1024, ns: 12 },
      { name: "RAM", bytes: Infinity, ns: 80 },
    ],
  },
  { id: "newer", name: "Newer desktop", levels: DEFAULT_LEVELS },
];

export interface CurveProps {
  machine?: "older" | "newer";
  /** Starting working set as a power of two. */
  exp?: number;
  /** Hide the machine switch. */
  lockMachine?: boolean;
}

export interface CurveState {
  machine: string;
  exp: number;
  ns: number;
}

const X0 = 10;
const X1 = 32;
const W = 360;
const H = 190;
const PL = 40;
const PR = 10;
const PT = 12;
const PB = 34;
const YMIN = Math.log10(0.8);
const YMAX = Math.log10(120);
const xOf = (e: number) => PL + ((e - X0) / (X1 - X0)) * (W - PL - PR);
const yOf = (ns: number) => PT + (1 - (Math.log10(Math.max(ns, 0.8)) - YMIN) / (YMAX - YMIN)) * (H - PT - PB);

export function Curve({ props, onChange, revealed }: WidgetProps<CurveProps>) {
  const [machine, setMachine] = useState<string>(props.machine ?? "newer");
  const [exp, setExp] = useState(props.exp ?? 12);
  const locked = Boolean(revealed);
  const M = MACHINES.find((m) => m.id === machine)!;
  const here = avgLatency(2 ** exp, M.levels);
  const path = Array.from({ length: (X1 - X0) * 4 + 1 }, (_, k) => {
    const e = X0 + k / 4;
    return `${k === 0 ? "M" : "L"}${xOf(e).toFixed(1)} ${yOf(avgLatency(2 ** e, M.levels).ns).toFixed(1)}`;
  }).join(" ");
  const ticks = [1, 2, 5, 10, 20, 50, 100];

  const report = (m: string, e: number) => {
    const mm = MACHINES.find((x) => x.id === m)!;
    onChange?.({ machine: m, exp: e, ns: avgLatency(2 ** e, mm.levels).ns } satisfies CurveState);
  };
  const pickExp = (e: number) => {
    setExp(e);
    report(machine, e);
  };
  const pickMachine = (m: string) => {
    setMachine(m);
    report(m, exp);
  };

  return (
    <div className="w-full">
      {!props.lockMachine && (
        <div className="mb-2 flex justify-center">
          <Seg label="Machine" value={machine} onChange={pickMachine} disabled={locked} options={MACHINES.map((m) => ({ value: m.id, label: m.name }))} />
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Average access time against working-set size. At ${fmtBytes(2 ** exp)} it is ${fmtNs(here.ns)}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={yOf(t)} y2={yOf(t)} stroke="var(--line-strong)" strokeWidth={0.6} />
            <text x={PL - 4} y={yOf(t) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {t}
            </text>
          </g>
        ))}
        {M.levels.slice(0, 3).map((l, i) => (
          <g key={l.name}>
            <line x1={xOf(Math.log2(l.bytes))} x2={xOf(Math.log2(l.bytes))} y1={PT} y2={H - PB} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={xOf(Math.log2(l.bytes))} y={PT + 14 + (i % 2) * 0} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink-2)">
              {l.name}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
        <line x1={xOf(exp)} x2={xOf(exp)} y1={PT} y2={H - PB} stroke="var(--ink)" strokeWidth={1} opacity={0.5} />
        <circle cx={xOf(exp)} cy={yOf(here.ns)} r={5.5} fill="var(--primary)" stroke="var(--ink)" strokeWidth={1.5} />
        {[10, 15, 20, 25, 30].map((e) => (
          <text key={e} x={xOf(e)} y={H - PB + 17} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
            {e === 10 ? "1K" : e === 15 ? "32K" : e === 20 ? "1M" : e === 25 ? "32M" : "1G"}
          </text>
        ))}
        <text x={PL + 2} y={H - 4} fontSize={14} fill="var(--ink-3)">
          working set (log) →
        </text>
        <text x={W - PR} y={H - 4} textAnchor="end" fontSize={14} fill="var(--ink-3)">
          ns
        </text>
      </svg>
      <Slider label="Working set (the memory you keep touching)" value={exp} min={X0} max={X1} step={1} onChange={pickExp} disabled={locked} format={(v) => fmtBytes(2 ** v)} />
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Average access" value={fmtNs(here.ns)} accent />
        {M.levels.map((l, i) => (
          <Readout key={l.name} label={l.name} value={`${Math.round(here.share[i] * 100)}%`} />
        ))}
      </div>
      <div className="mt-3">
        <Note>
          Toy model: random accesses over a working set of <b>{fmtBytes(2 ** exp)}</b>. Whatever fits in a level is served there; the rest falls through to the next, slower one. Real curves have the same shape: flat, then a climb at each cache size.
        </Note>
      </div>
    </div>
  );
}

/** goal: { maxNs, minExp, maxExp, minNs } */
export function checkCurve(state: unknown, goal: Record<string, unknown>) {
  const s = state as CurveState | undefined;
  if (!s) return false;
  if (typeof goal.maxNs === "number" && s.ns > goal.maxNs) return false;
  if (typeof goal.minNs === "number" && s.ns < goal.minNs) return false;
  if (typeof goal.minExp === "number" && s.exp < goal.minExp) return false;
  if (typeof goal.maxExp === "number" && s.exp > goal.maxExp) return false;
  return true;
}
