"use client";

import { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { AREAS_CM2, THETA_BODY, THETA_JC_PAD, THETA_VIA, VIA_COUNTS, thermal } from "./thermal-model";
import { Caption, Meter, Note, ORANGE, Readout, Seg, ToyNote } from "./ui";

// ───────────────────────────── pcb-thermal: copper area and thermal vias under an exposed pad ─────────────────────────────

export interface ThermalProps {
  /** Power the chip turns into heat, watts (default 1.2). */
  power?: number;
  /** Air temperature around the board, °C (default 50). */
  ambient?: number;
  /** Design target for the junction, °C: below the 125 °C rating, leaving margin (default 105). */
  tjMax?: number;
  /** Starting copper area, cm² (one of the choices). */
  area?: number;
  /** Starting via count (one of the choices). */
  vias?: number;
}

export interface ThermalState {
  areaCm2: number;
  vias: number;
  thetaJA: number;
  tj: number;
  ok: boolean;
}

const CW = 360;
const CH = 168;
const TJ_RATING = 125;

export function Thermal({ props, onChange }: WidgetProps<ThermalProps>) {
  const power = props.power ?? 1.2;
  const ambient = props.ambient ?? 50;
  const tjMax = props.tjMax ?? 105;
  const [area, setArea] = useState<number>(props.area ?? 1);
  const [vias, setVias] = useState<number>(props.vias ?? 0);
  const r = thermal(area, vias, power, ambient);
  const ok = r.tj <= tjMax;

  const report = (a: number, v: number) => {
    const x = thermal(a, v, power, ambient);
    onChange?.({ areaCm2: a, vias: v, thetaJA: Math.round(x.thetaJA * 10) / 10, tj: Math.round(x.tj * 10) / 10, ok: x.tj <= tjMax } satisfies ThermalState);
  };

  // drawing: board slab side view, copper width grows with the square root of the area
  const widthFor = (a: number) => 40 + (Math.sqrt(a) / Math.sqrt(AREAS_CM2[AREAS_CM2.length - 1])) * 280;
  const cuW = widthFor(area);
  const cx = CW / 2;
  const boardTop = 82;
  const boardBot = 130;

  const label = `Exposed-pad chip on ${area} square centimetres of copper with ${vias} thermal vias. Thermal resistance ${r.thetaJA.toFixed(0)} degrees per watt, junction ${r.tj.toFixed(0)} degrees Celsius, ${ok ? "within" : "over"} the ${tjMax} degree target.`;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-2">
        <Seg label="Copper area around the pad" value={area} onChange={(v) => { setArea(v); report(v, vias); }} options={AREAS_CM2.map((a) => ({ value: a as number, label: `${a} cm²` }))} />
        <Seg label="Thermal vias under the pad" value={vias} onChange={(v) => { setVias(v); report(area, v); }} options={VIA_COUNTS.map((v) => ({ value: v as number, label: v === 0 ? "No vias" : `${v} vias` }))} />
      </div>

      <svg viewBox={`0 0 ${CW} ${CH}`} className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={label}>
        {/* board */}
        <rect x={0} y={boardTop} width={CW} height={boardBot - boardTop} fill="color-mix(in srgb, var(--ink-3) 12%, transparent)" />
        {/* copper on top, and on the far side when there are vias */}
        <rect x={cx - cuW / 2} y={boardTop - 5} width={cuW} height={5} fill="var(--ink-2)" />
        {vias > 0 && <rect x={cx - cuW / 2} y={boardBot} width={cuW} height={5} fill="var(--ink-2)" />}
        {/* vias */}
        {Array.from({ length: vias }, (_, i) => {
          const x = cx - 26 + ((i + 0.5) * 52) / vias;
          return <line key={i} x1={x} x2={x} y1={boardTop} y2={boardBot} stroke="var(--ink)" strokeWidth={vias > 9 ? 1.6 : 2.4} />;
        })}
        {/* the chip with its exposed pad */}
        <rect x={cx - 40} y={34} width={80} height={boardTop - 5 - 34 - 4} rx={3} fill="var(--surface-2)" stroke="var(--ink-2)" strokeWidth={1.5} />
        <rect x={cx - 26} y={boardTop - 5 - 4} width={52} height={4} fill={ORANGE} />
        <text x={cx} y={58} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          chip
        </text>
        {/* heat arrows */}
        <path d={`M${cx - 52} ${boardTop - 10} L${cx - cuW / 2 + 6} ${boardTop - 10}`} stroke={ORANGE} strokeWidth={2.5} fill="none" />
        <path d={`M${cx + 52} ${boardTop - 10} L${cx + cuW / 2 - 6} ${boardTop - 10}`} stroke={ORANGE} strokeWidth={2.5} fill="none" />
        <text x={8} y={CH - 8} fontSize={14} fill="var(--ink-2)">
          board side view{vias > 0 ? ": copper on both faces, joined by the vias" : ": copper on the top face only"}
        </text>
        <text x={CW - 8} y={22} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          heat spreads out in the copper
        </text>
      </svg>
      <p className="mt-1 text-center text-[0.8rem] text-ink-3">Side view, not to scale. The orange pad is the chip&apos;s exposed pad, soldered to the copper.</p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="θJA now" value={`${r.thetaJA.toFixed(0)} °C/W`} accent />
        <Readout label="Heat" value={`${power.toFixed(1)} W`} />
        <Readout label="Junction TJ" value={`${r.tj.toFixed(0)} °C`} accent={ok} />
        <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-medium ${ok ? "border-[var(--brand)]/50 bg-tint text-ink" : "border-[var(--bad)]/60 text-[var(--bad)]"}`}>
          {ok ? `Within ${tjMax} °C` : `Over ${tjMax} °C`}
        </span>
      </div>
      <div className="mt-3">
        <Meter frac={(r.tj - ambient) / (TJ_RATING + 60 - ambient)} tone={r.tj > TJ_RATING ? "bad" : ok ? "brand" : "warn"} label={`Junction temperature ${r.tj.toFixed(0)} degrees, from ${ambient} degrees ambient`} />
        <p className="mt-1 text-center text-[0.8rem] text-ink-3">
          Bar: {ambient} °C air up to {TJ_RATING + 60} °C. The chip is rated for {TJ_RATING} °C, and we aim for {tjMax} °C or lower.
        </p>
      </div>
      <div className="mt-3">
        <Note>
          TJ = {ambient} + {power.toFixed(1)} W × {r.thetaJA.toFixed(0)} °C/W = <b>{r.tj.toFixed(0)} °C</b>. Heat has two ways out: down through the pad (chip to pad {THETA_JC_PAD} °C/W, then the copper and vias, {r.thetaPad.toFixed(0)} °C/W in all) or from the plastic body into the air ({THETA_BODY} °C/W). Two paths side by side combine to {r.thetaJA.toFixed(0)} °C/W.
          {vias > 0 ? ` The ${vias} vias in parallel add ${r.thetaVias.toFixed(0)} °C/W between the two copper faces.` : " With no vias only the top copper helps."}
        </Note>
      </div>
      <Caption className="mt-2 text-center">Toy model</Caption>
      <ToyNote>
        Typical round numbers, not a field solver: about 22 W/m²K from still-air copper, {THETA_VIA} °C/W for one plain 0.3 mm via through 1.6 mm FR-4, {THETA_JC_PAD} °C/W junction to pad. Real parts and boards differ widely: use the datasheet and measure.
      </ToyNote>
    </div>
  );
}

/** goal: { maxTj, maxAreaCm2, minVias, ok } */
export function checkThermal(state: unknown, goal: Record<string, unknown>) {
  const s = state as ThermalState | undefined;
  if (!s) return false;
  if (typeof goal.maxTj === "number" && s.tj > goal.maxTj) return false;
  if (typeof goal.maxAreaCm2 === "number" && s.areaCm2 > goal.maxAreaCm2) return false;
  if (typeof goal.minVias === "number" && s.vias < goal.minVias) return false;
  if (typeof goal.ok === "boolean" && s.ok !== goal.ok) return false;
  return true;
}
