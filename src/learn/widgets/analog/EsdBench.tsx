"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type WireSpec } from "../elec-kit/Schematic";
import { Caption, Note, Plot, Readout, Seg, ToyNote, formatSI } from "./ui";
import { niceMax } from "./rlsim";
import { CHIP_MAX_A, CHIP_RON, CHIP_VF, ESD_C, ESD_CPIN, ESD_LEVELS, ESD_R, ESD_RAIL, ESD_T_STOP, TVS_PARTS, TVS_RON, runEsd, type EsdResult, type TvsId } from "./esdsim";

export interface EsdBenchProps {
  /** Starting test level, kV (2, 4, 6 or 8). Default 4. */
  kv?: number;
  /** Starting TVS part. Default "none". */
  tvs?: TvsId;
  /** Lock any of these controls. */
  lock?: ("kv" | "tvs")[];
}

export interface EsdBenchState {
  kv: number;
  tvs: TvsId;
  peakPinV: number;
  peakChipA: number;
  peakTvsA: number;
  energyJ: number;
  chipSafe: boolean;
  signalOk: boolean;
}

const num = (x: number) => String(Number(x.toPrecision(3)));

function toState(kv: number, tvs: TvsId, r: EsdResult): EsdBenchState {
  return { kv, tvs, peakPinV: r.peakPinV, peakChipA: r.peakChipA, peakTvsA: r.peakTvsA, energyJ: r.energyJ, chipSafe: r.chipSafe, signalOk: r.signalOk };
}

/** Bent bar ends drawn over the kit's plain diode bar (part at grid [gx, gy], rot 270), making it look like a Zener / TVS. */
function ZenerBars({ gx, gy, cols, rows }: { gx: number; gy: number; cols: number; rows: number }) {
  const X = gx * 20;
  const Y = gy * 20;
  return (
    <svg viewBox={`0 0 ${cols * 20} ${rows * 20}`} className="pointer-events-none absolute inset-0 block h-full w-full" aria-hidden style={{ overflow: "visible" }}>
      <g stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" fill="none">
        <path d={`M${X - 12} ${Y - 46}L${X - 12} ${Y - 40}`} />
        <path d={`M${X + 12} ${Y - 34}L${X + 12} ${Y - 40}`} />
      </g>
    </svg>
  );
}

/** Toy ESD hit on a 3.3 V pin: pick the test level and a TVS diode and watch the pin voltage and the current in the chip's own clamp. */
export function EsdBench({ props, onChange, status, goal }: WidgetProps<EsdBenchProps>) {
  const lock = props.lock ?? [];
  const [kv, setKv] = useState(props.kv ?? 4);
  const [tvs, setTvs] = useState<TvsId>(props.tvs ?? "none");
  const [view, setView] = useState<"pin" | "chip" | "tvs">("pin");

  const res = useMemo(() => runEsd(kv, tvs), [kv, tvs]);

  // report the starting state once, then every change
  useEffect(() => {
    const r = runEsd(props.kv ?? 4, props.tvs ?? "none");
    if (r) onChange?.(toState(props.kv ?? 4, props.tvs ?? "none", r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (nkv: number, ntvs: TvsId) => {
    setKv(nkv);
    setTvs(ntvs);
    const r = runEsd(nkv, ntvs);
    if (r) onChange?.(toState(nkv, ntvs, r));
  };

  if (!res) return <Note>The simulation could not run with these values.</Note>;

  const part = TVS_PARTS.find((p) => p.id === tvs) ?? TVS_PARTS[0];
  const COLS = 18;
  const ROWS = 9;
  const tvsLabel = tvs === "none" ? "" : `${part.label}`;

  const trace = view === "pin" ? res.pin : view === "chip" ? res.chip : res.tvs;
  const peak = Math.max(...trace);
  const yMax = niceMax(Math.max(peak, view === "pin" ? ESD_RAIL : 1e-3) * 1.05);
  const unit = view === "pin" ? "V" : "A";
  const nsMax = ESD_T_STOP * 1e9;

  // after a wrong Check or a reveal, say what went wrong
  const g = (goal ?? {}) as Record<string, unknown>;
  const notes: string[] = [];
  if (status === "wrong" || status === "revealed") {
    if (g.tvs === "any" && tvs === "none") notes.push("No TVS is fitted, so the whole hit lands on the chip's own small clamp.");
    if (g.chipSafe === true && !res.chipSafe) notes.push(`The chip's own clamp carries ${formatSI(res.peakChipA, "A")}, over the ~${CHIP_MAX_A} A this toy chip survives. A TVS that clamps lower takes more of the current and leaves the chip less.`);
    if (g.signalOk === true && !res.signalOk) notes.push(`This TVS starts to conduct at about ${part.vbr} V, below the normal ${ESD_RAIL} V signal, so it would clip the signal even with no ESD. Its standoff voltage must be at or above the signal level.`);
  }

  const wires: WireSpec[] = [
    { points: ["C1.a", "R1.a"] },
    { points: ["R1.b", "D1.a"] },
    { points: ["D1.b", [15, 6]] },
    { points: ["C1.b", [2, 7]] },
    ...(tvs !== "none" ? ([{ points: [[9, 2], "T1.b"] }, { points: ["T1.a", [9, 7], [2, 7]] }] as WireSpec[]) : []),
  ];

  return (
    <div data-widget="analog-esd" className="w-full">
      <div className="relative mx-auto max-w-[460px]">
        <Schematic
          cols={COLS}
          rows={ROWS}
          className="block w-full"
          animate={false}
          ariaLabel={`A ${formatSI(ESD_C, "F")} capacitor charged to ${kv} kilovolts discharges through a ${ESD_R} ohm resistor into a pin. ${tvs === "none" ? "No TVS diode is fitted." : `A ${part.label} standoff TVS diode runs from the pin to ground.`} The chip's own protection diode runs from the pin to its ${ESD_RAIL} volt supply rail.`}
          parts={[
            { kind: "capacitor", id: "C1", at: [2, 2], rot: 90, label: "C1", value: "150 pF" },
            { kind: "resistor", id: "R1", at: [4, 2], label: "R1", value: `${ESD_R} Ω` },
            ...(tvs !== "none" ? [{ kind: "diode" as const, id: "T1", at: [9, 6] as [number, number], rot: 270 as const, label: "TVS", value: tvsLabel }] : []),
            { kind: "diode", id: "D1", at: [15, 2], rot: 90, label: "D1" },
            { kind: "ground", id: "G1", at: [2, 7] },
          ]}
          wires={wires}
          texts={[
            { at: [9.4, 1.55], text: "pin", anchor: "start", muted: true },
            { at: [15, 6.9], text: `${ESD_RAIL} V rail`, anchor: "middle", muted: true },
            { at: [17.9, 8.5], text: "D1 = the chip's own clamp", anchor: "end", muted: true },
          ]}
        />
        {tvs !== "none" && <ZenerBars gx={9} gy={6} cols={COLS} rows={ROWS} />}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Caption>ESD level (contact discharge)</Caption>
        <Seg label="ESD level" value={kv} className={lock.includes("kv") ? "pointer-events-none opacity-50" : ""} options={ESD_LEVELS.map((k) => ({ value: k, label: `${k} kV` }))} onChange={(v) => update(v, tvs)} />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Caption>TVS diode, standoff voltage</Caption>
        <Seg label="TVS standoff" value={tvs} className={lock.includes("tvs") ? "pointer-events-none opacity-50" : ""} options={TVS_PARTS.map((p) => ({ value: p.id, label: p.label }))} onChange={(v) => update(kv, v)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Caption>The first {nsMax} ns of the hit</Caption>
        <Seg label="Plot" value={view} options={[{ value: "pin", label: "Pin voltage" }, { value: "chip", label: "Chip clamp current" }, { value: "tvs", label: "TVS current" }]} onChange={setView} />
      </div>
      <Plot
        ariaLabel={`${view === "pin" ? "Voltage at the pin" : view === "chip" ? "Current into the chip's own protection diode" : "Current through the TVS diode"} during the first ${nsMax} nanoseconds of a ${kv} kilovolt hit. Peak ${formatSI(peak, unit)}.`}
        x={[0, nsMax]}
        y={[0, yMax]}
        xTicks={[0, 100, 200, 300].map((v) => ({ value: v, label: String(v) }))}
        yTicks={[0, 0.5, 1].map((f) => ({ value: f * yMax, label: num(f * yMax) }))}
        markers={view === "pin" ? [{ y: ESD_RAIL, color: "var(--ink-3)", label: `${ESD_RAIL} V signal` }] : view === "chip" ? [{ y: CHIP_MAX_A, color: "var(--ink-3)", label: `${CHIP_MAX_A} A chip limit` }] : []}
        series={[{ points: res.t.map((t, k) => [t * 1e9, trace[k]] as [number, number]) }]}
        xLabel="time (ns)"
        yLabel={view === "pin" ? "pin volts" : "amps"}
      />

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Stored energy ½CV²" value={formatSI(res.energyJ, "J")} />
        <Readout label="Peak pin voltage" value={formatSI(res.peakPinV, "V")} accent />
        <Readout label="Peak into chip clamp" value={formatSI(res.peakChipA, "A")} accent />
        <Readout label="Peak through TVS" value={tvs === "none" ? "no TVS" : formatSI(res.peakTvsA, "A")} />
      </div>
      <p className="mt-2 text-center text-xs leading-snug text-ink-3">
        This toy chip&apos;s own clamp is rated for about {CHIP_MAX_A} A (derived from a 2 kV human-body-model test). {tvs === "none" ? "With no TVS fitted, a normal 3.3 V signal passes freely." : `This TVS starts to conduct at about ${part.vbr} V (toy figure); a normal ${ESD_RAIL} V signal ${res.signalOk ? "stays below that, so the TVS stays off" : "is above that, so the TVS would conduct on the signal itself"}.`}
      </p>

      {notes.length > 0 && (
        <div className="mt-3 space-y-1">
          {notes.map((m) => (
            <Note key={m}>{m}</Note>
          ))}
        </div>
      )}

      <div className="mt-3">
        <ToyNote>
          Toy model: a plain RC discharge (150 pF through {ESD_R} Ω, plus {ESD_CPIN * 1e12} pF of pin capacitance), positive hits only. Real ESD current has a sub-nanosecond first spike this toy lacks. The chip&apos;s clamp is a diode that turns on {CHIP_VF} V above the {ESD_RAIL} V rail with {CHIP_RON} Ω, and the TVS a diode that turns on at its breakdown voltage with {TVS_RON} Ω (typical-looking values, not a datasheet). Never try this with real equipment unless you are trained to.
        </ToyNote>
      </div>
    </div>
  );
}

/** goal: { kv }, { tvs: "any" | "none" | "2.5" | "3.3" | "5" | "12" }, { chipSafe }, { signalOk }. */
export function checkEsd(state: unknown, goal: Record<string, unknown>) {
  const s = state as EsdBenchState | undefined;
  if (!s) return false;
  if (typeof goal.kv === "number" && s.kv !== goal.kv) return false;
  if (goal.tvs === "any") {
    if (s.tvs === "none") return false;
  } else if (typeof goal.tvs === "string" && s.tvs !== goal.tvs) return false;
  if (typeof goal.chipSafe === "boolean" && s.chipSafe !== goal.chipSafe) return false;
  if (typeof goal.signalOk === "boolean" && s.signalOk !== goal.signalOk) return false;
  return true;
}
