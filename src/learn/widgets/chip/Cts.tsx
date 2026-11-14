"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Seg, Slider, Toy, ORANGE } from "../semi/ui";
import { ARCHS, BUF_PS, MIN_PATH, T_CQ, T_HOLD, T_SU, WIRE_PS, arrivals, buildTree, latencyOf, pairTiming, skewOf, sinkPositions, type Arch } from "./cts-model.ts";

export { checkCts } from "./cts-model.ts";

// ───────────── chip-cts: clock distribution, latency and skew ─────────────

export interface CtsProps {
  /** 8 or 16 flip-flops (default 16). */
  sinks?: 8 | 16;
  /** Starting architecture (default "daisy"). */
  arch?: Arch;
  title?: string;
  /** Show the setup/hold slack panel for a tapped launch/capture pair (default true). */
  slack?: boolean;
}

export interface CtsState {
  arch: Arch;
  sinks: 8 | 16;
  skewPs: number;
  /** Longest insertion delay (clock source to the latest flop), ps. */
  latencyPs: number;
  launch?: number;
  capture?: number;
  setupSlackPs?: number;
  holdSlackPs?: number;
}

const NAME: Record<Arch, string> = { daisy: "Daisy chain", unbalanced: "Unbalanced tree", htree: "H-tree" };
const BLURB: Record<Arch, string> = {
  daisy: "One wire snakes past every flop, so each flop hears the clock a little later than the one before.",
  unbalanced: "A buffered tree, but each buffer sits at its group's first flop instead of the middle, so the branches differ in length.",
  htree: "Every branch splits into two of equal length and the same buffers, so all flops see the clock at the same time.",
};
const SCALE = 500;
const X0 = 64;
const Y0 = 60;
const PITCH = 85;

export function Cts({ props, onChange, goal, status }: WidgetProps<CtsProps>) {
  const n: 8 | 16 = props.sinks === 8 ? 8 : 16;
  const showSlack = props.slack !== false;
  const [arch, setArch] = useState<Arch>(props.arch && ARCHS.includes(props.arch) ? props.arch : "daisy");
  const [sel, setSel] = useState<number[]>([0, n - 1]);
  const [period, setPeriod] = useState(1000);
  const [path, setPath] = useState(600);

  const arr = useMemo(() => arrivals(arch, n), [arch, n]);
  const tree = useMemo(() => buildTree(arch, n), [arch, n]);
  const pos = useMemo(() => sinkPositions(n), [n]);
  const skew = skewOf(arr);
  const lat = latencyOf(arr);
  const minA = Math.min(...arr);
  const pairOk = sel.length === 2;
  const pt = pairOk ? pairTiming(arr, sel[0], sel[1], period, path) : null;

  const state = useMemo<CtsState>(
    () => ({
      arch,
      sinks: n,
      skewPs: skew,
      latencyPs: lat,
      ...(pt ? { launch: sel[0], capture: sel[1], setupSlackPs: pt.setupSlack, holdSlackPs: pt.holdSlack } : {}),
    }),
    [arch, n, skew, lat, pt, sel]
  );
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    cb.current?.(state);
  }, [state]);

  const tap = (i: number) => setSel((s) => (s.length === 1 ? (s[0] === i ? [] : [s[0], i]) : [i]));

  const X = (x: number) => X0 + x * PITCH;
  const Y = (y: number) => Y0 + y * PITCH;
  const H = Y(n / 4 - 1) + 44;
  const compare = ARCHS.map((a) => {
    const r = arrivals(a, n);
    return { a, skew: skewOf(r), lat: latencyOf(r) };
  });
  const maxSkewGoal = typeof goal?.maxSkewPs === "number" ? goal.maxSkewPs : undefined;
  const bw = 360 / n;

  const sinkFill = (i: number) => {
    const f = skew > 0 ? (arr[i] - minA) / skew : 0;
    return `color-mix(in srgb, ${ORANGE} ${Math.round(f * 70)}%, var(--surface))`;
  };

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <div className="flex justify-center">
        <Seg
          label="Clock distribution"
          value={arch}
          onChange={setArch}
          options={ARCHS.map((a) => ({ value: a, label: NAME[a] }))}
        />
      </div>
      <p className="mt-2 text-center text-[0.88rem] leading-snug text-ink-2">{BLURB[arch]}</p>

      <div className="mx-auto mt-2 max-w-[30rem]">
        <svg viewBox={`0 0 360 ${H}`} className="block h-auto w-full" role="group" aria-label={`Clock distribution on a die with ${n} flip-flops, ${NAME[arch]}. Tap two flip-flops to compare their clock arrival times.`}>
          {tree.map((nd, i) => {
            if (nd.parent < 0) return null;
            const p = tree[nd.parent];
            return <polyline key={i} points={`${X(p.x)},${Y(p.y)} ${X(nd.x)},${Y(p.y)} ${X(nd.x)},${Y(nd.y)}`} fill="none" stroke="var(--ink-3)" strokeWidth={2} strokeLinejoin="round" />;
          })}
          {tree.map((nd, i) =>
            nd.buf ? <rect key={"b" + i} x={X(nd.x) - 6} y={Y(nd.y) - 6} width={12} height={12} rx={2} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2.5} /> : null
          )}
          <circle cx={X(tree[0].x)} cy={Y(tree[0].y)} r={9} fill="var(--brand)" />
          <text x={X(tree[0].x) + 14} y={Y(tree[0].y) - 12} fontSize={14} fontWeight={600} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
            CLK
          </text>
          {pos.map((p, i) => {
            const isL = sel[0] === i;
            const isC = sel.length === 2 && sel[1] === i;
            return (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`Flip-flop ${i}, clock arrives at ${arr[i]} picoseconds${isL ? ", launch" : ""}${isC ? ", capture" : ""}`}
                aria-pressed={isL || isC}
                onClick={() => tap(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    tap(i);
                  }
                }}
                className="cursor-pointer"
              >
                <circle cx={X(p.x)} cy={Y(p.y)} r={30} fill="transparent" />
                <circle cx={X(p.x)} cy={Y(p.y)} r={17} fill={sinkFill(i)} stroke={isL ? "var(--brand)" : isC ? ORANGE : "var(--ink-3)"} strokeWidth={isL || isC ? 4 : 1.5} />
                <text x={X(p.x)} y={Y(p.y) + 5} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
                  {i}
                </text>
                {(isL || isC) && (
                  <text x={X(p.x)} y={Y(p.y) + 36} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
                    {isL ? "launch" : "capture"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="text-center text-xs text-ink-3">Numbered circles are flip-flops (darker orange = clock arrives later). Squares are clock buffers. {showSlack ? "Tap one flip-flop to launch from, then another to capture at." : ""}</p>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Skew (max − min)" value={`${skew} ps`} accent />
        <Readout label="Latency (latest flop)" value={`${lat} ps`} />
        <Readout label="Earliest flop" value={`${minA} ps`} />
        {maxSkewGoal !== undefined && <Readout label="Target skew" value={`≤ ${maxSkewGoal} ps`} />}
      </div>

      <div className="mx-auto mt-3 max-w-[30rem] rounded-xl border border-line bg-surface p-2">
        <Caption className="mb-1">Clock arrival (insertion delay) at each flop</Caption>
        <svg viewBox="0 0 360 150" className="block h-auto w-full" role="img" aria-label={`Bar chart of clock arrival time at each of ${n} flip-flops. Earliest ${minA} picoseconds, latest ${lat} picoseconds.`}>
          <line x1={0} x2={360} y1={118} y2={118} stroke="var(--line-strong)" />
          {arr.map((v, i) => {
            const h = (v / SCALE) * 100;
            return <rect key={i} x={i * bw + bw * 0.15} y={118 - h} width={bw * 0.7} height={h} rx={2} fill={sel.includes(i) ? (sel[0] === i ? "var(--brand)" : ORANGE) : "var(--tint-strong, var(--brand))"} opacity={sel.includes(i) ? 1 : 0.55} />;
          })}
          {arr.map((_, i) => (
            <text key={i} x={i * bw + bw / 2} y={136} textAnchor="middle" fontSize={n === 16 ? 14 : 14} fill="var(--ink-3)">
              {i}
            </text>
          ))}
          <line x1={0} x2={360} y1={118 - (lat / SCALE) * 100} y2={118 - (lat / SCALE) * 100} stroke="var(--ink-2)" strokeDasharray="4 3" />
          <text x={2} y={118 - (lat / SCALE) * 100 - 4} fontSize={14} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
            latest {lat} ps
          </text>
          {skew > 0 && (
            <>
              <line x1={0} x2={360} y1={118 - (minA / SCALE) * 100} y2={118 - (minA / SCALE) * 100} stroke="var(--ink-2)" strokeDasharray="4 3" />
              <text x={358} y={118 - (minA / SCALE) * 100 - 4} textAnchor="end" fontSize={14} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
                earliest {minA} ps
              </text>
            </>
          )}
        </svg>
        <table className="sr-only">
          <caption>Clock arrival in picoseconds per flip-flop</caption>
          <tbody>
            {arr.map((v, i) => (
              <tr key={i}>
                <th scope="row">{`Flip-flop ${i}`}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mx-auto mt-3 max-w-[30rem] overflow-hidden rounded-xl border border-line text-[0.86rem]">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] bg-surface-2 px-3 py-1.5 text-xs text-ink-3">
          <span>Style</span>
          <span className="text-right">Skew</span>
          <span className="text-right">Latency</span>
        </div>
        {compare.map((c) => (
          <div key={c.a} className={`grid grid-cols-[1.4fr_1fr_1fr] px-3 py-1.5 ${c.a === arch ? "bg-tint font-semibold text-ink" : "text-ink-2"}`}>
            <span>{NAME[c.a]}</span>
            <span className="text-right font-mono tabular-nums">{c.skew} ps</span>
            <span className="text-right font-mono tabular-nums">{c.lat} ps</span>
          </div>
        ))}
      </div>

      {showSlack && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3">
          <Caption className="mb-2">A launch → capture pair</Caption>
          <div className="grid gap-3 sm:grid-cols-2">
            <Slider label="Clock period T" value={period} min={400} max={2000} step={50} onChange={setPeriod} format={(v) => `${v} ps`} />
            <Slider label="Slowest logic between them" value={path} min={100} max={1500} step={50} onChange={setPath} format={(v) => `${v} ps`} />
          </div>
          {pt ? (
            <>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Readout label={`Flop ${sel[0]} → ${sel[1]}: capture clock`} value={`${pt.skewPs >= 0 ? "+" : ""}${pt.skewPs} ps later`} />
                <Readout label="Setup slack" value={`${pt.setupSlack} ps ${pt.setupSlack >= 0 ? "(met)" : "(VIOLATED)"}`} accent={pt.setupSlack >= 0} />
                <Readout label="Hold slack" value={`${pt.holdSlack} ps ${pt.holdSlack >= 0 ? "(met)" : "(VIOLATED)"}`} accent={pt.holdSlack >= 0} />
              </div>
              <div className="mt-3">
                <Note tone={pt.setupSlack < 0 || pt.holdSlack < 0 ? "plain" : "accent"}>
                  {pt.skewPs > 0
                    ? "The capture flop's clock is late, so data gets extra time to arrive (setup slack grows) but the next value also races through sooner relative to that late clock (hold gets harder)."
                    : pt.skewPs < 0
                      ? "The capture flop's clock is early, so data has less time to arrive: skew is subtracted straight from setup slack. Hold is easier."
                      : "No skew between these two flops: setup and hold depend only on the logic and the flop timing."}
                </Note>
              </div>
            </>
          ) : (
            <p className="mt-3 text-center text-sm text-ink-2">Tap a second flip-flop on the die to capture at.</p>
          )}
          <p className="mt-2 text-xs leading-snug text-ink-3">
            setup slack = T − (t<sub>cq</sub> + logic + t<sub>su</sub>) + (capture clock arrival − launch clock arrival), with t<sub>cq</sub> = {T_CQ} ps and t<sub>su</sub> = {T_SU} ps. hold slack = (t<sub>cq</sub> + {MIN_PATH} ps fastest logic) − t<sub>hold</sub> ({T_HOLD} ps) − (capture arrival − launch arrival). A negative slack is a violation.
          </p>
        </div>
      )}

      {status === "revealed" && typeof goal?.arch === "string" && (
        <div className="mt-3">
          <Note tone="accent">Answer: the {NAME[goal.arch as Arch] ?? goal.arch} layout.</Note>
        </div>
      )}
      <Toy>
        Toy clock tree: delay = {WIRE_PS} ps per grid unit of wire + {BUF_PS} ps per buffer, flops on a regular grid, nothing else loading the wires. Real wire delay is RC (it grows faster than length), buffers slow down with load, and clock-tree synthesis tools also balance for process variation and on-chip voltage and temperature differences. Zero skew in the H-tree is a result of the perfectly symmetric toy.
      </Toy>
    </div>
  );
}
