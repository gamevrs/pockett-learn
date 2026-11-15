"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { OPC, OPC_RANGE, simulate, withinTol } from "./opc-model";
import { Note, Readout, Slider, Toy } from "./ui";

// ───────────────────────────── semi-opc: optical proximity correction on a toy blur-and-threshold model ─────────────────────────────

export interface OpcProps {
  bias?: number;
  ext?: number;
  head?: number;
  /** Mark each error as within tolerance or not. The graded step turns this off. */
  showVerdict?: boolean;
}

export interface OpcState {
  /** Cells added to each side of the whole line. */
  bias: number;
  /** Cells the hammerhead extends past the target line end. */
  ext: number;
  /** Extra half-width of the hammerhead, cells. */
  head: number;
  /** Printed line end minus target line end, cells (negative: pulled back). */
  endEpe: number;
  /** Printed half-width minus target half-width, cells. */
  widthEpe: number;
}

// the view: a window around the line end
const CELL = 10;
const VX0 = 26;
const VX1 = 61;
const VY0 = 8;
const VY1 = 32;

const signed = (v: number) => {
  const t = Math.abs(v).toFixed(1);
  return t === "0.0" ? "0.0" : `${v < 0 ? "−" : "+"}${t}`;
};

export function Opc({ props, onChange }: WidgetProps<OpcProps>) {
  const [bias, setBias] = useState(props.bias ?? 0);
  const [ext, setExt] = useState(props.ext ?? 0);
  const [head, setHead] = useState(props.head ?? 0);
  const verdict = props.showVerdict !== false;
  const r = simulate(bias, ext, head);

  const report = (b: number, e: number, h: number) => {
    const x = simulate(b, e, h);
    onChange?.({ bias: b, ext: e, head: h, endEpe: x.endEpe, widthEpe: x.widthEpe } satisfies OpcState);
  };

  const cells: React.ReactNode[] = [];
  for (let y = VY0; y < VY1; y++) {
    for (let x = VX0; x < VX1; x++) {
      const m = r.mask[y * OPC.nx + x];
      const printed = r.img[y * OPC.nx + x] >= OPC.threshold;
      if (m <= 0 && !printed) continue;
      cells.push(
        <g key={`${x}-${y}`}>
          {m > 0 && <rect x={(x - VX0) * CELL} y={(y - VY0) * CELL} width={CELL} height={CELL} fill="var(--ink-3)" opacity={0.55 * m} />}
          {printed && <rect x={(x - VX0) * CELL} y={(y - VY0) * CELL} width={CELL} height={CELL} fill="var(--brand)" opacity={0.4} />}
        </g>,
      );
    }
  }
  const tx = (OPC.xe - VX0) * CELL;
  const ty0 = (OPC.yc - OPC.wt / 2 - VY0) * CELL;
  const ty1 = (OPC.yc + OPC.wt / 2 - VY0) * CELL;

  const tag = (v: number) => (verdict ? (withinTol(v) ? " ✓ within ±0.5" : " ✗ outside ±0.5") : "");

  return (
    <div className="w-full" data-widget>
      <div className="grid gap-3 sm:grid-cols-3">
        <Slider
          label="Line bias (each side)"
          value={bias}
          min={OPC_RANGE.bias[0]}
          max={OPC_RANGE.bias[1]}
          step={OPC_RANGE.bias[2]}
          onChange={(v) => {
            setBias(v);
            report(v, ext, head);
          }}
          format={(v) => `${v} cells`}
        />
        <Slider
          label="Hammerhead: extension past the end"
          value={ext}
          min={OPC_RANGE.ext[0]}
          max={OPC_RANGE.ext[1]}
          step={OPC_RANGE.ext[2]}
          onChange={(v) => {
            setExt(v);
            report(bias, v, head);
          }}
          format={(v) => `${v} cells`}
        />
        <Slider
          label="Hammerhead: extra half-width"
          value={head}
          min={OPC_RANGE.head[0]}
          max={OPC_RANGE.head[1]}
          step={OPC_RANGE.head[2]}
          onChange={(v) => {
            setHead(v);
            report(bias, ext, v);
          }}
          format={(v) => `${v} cells`}
        />
      </div>

      <div className="mt-3 flex justify-center">
        <svg
          viewBox={`-2 -2 ${(VX1 - VX0) * CELL + 4} ${(VY1 - VY0) * CELL + 4}`}
          className="block h-auto w-full max-w-[28rem] rounded-lg border border-line bg-surface-2"
          role="img"
          aria-label={`Near the line end: grey is the mask, blue is what prints, the dashed outline is the target. Line end error ${signed(r.endEpe)} cells, width error ${signed(r.widthEpe)} cells.`}
        >
          {cells}
          <rect x={-10} y={ty0} width={tx + 10} height={ty1 - ty0} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="6 4" />
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[var(--ink-3)] opacity-60" aria-hidden /> mask
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[var(--brand)] opacity-60" aria-hidden /> prints
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[var(--ink)]" aria-hidden /> target
        </span>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Line-end error" value={`${signed(r.endEpe)} cells${tag(r.endEpe)}`} accent={verdict && withinTol(r.endEpe)} />
        <Readout label="Width error (half-width)" value={`${signed(r.widthEpe)} cells${tag(r.widthEpe)}`} accent={verdict && withinTol(r.widthEpe)} />
      </div>
      <div className="mt-3">
        <Note>
          Negative line-end error means the printed line stops short of the target. The blur rounds off the corners and pulls the end back; bias thickens the whole line, while the hammerhead adds mask only where the end needs it.
        </Note>
      </div>
      <Toy>
        Toy model: a Gaussian blur and a fixed threshold, not a real lithography simulator. Real OPC models the optics and the resist and runs on whole chips with huge compute farms. Cell counts are illustrative.
      </Toy>
    </div>
  );
}

/** goal: { maxEndEpe, maxWidthEpe } (absolute values, in cells) */
export function checkOpc(state: unknown, goal: Record<string, unknown>) {
  const s = state as OpcState | undefined;
  if (!s) return false;
  if (typeof goal.maxEndEpe === "number" && !(Math.abs(s.endEpe) <= goal.maxEndEpe)) return false;
  if (typeof goal.maxWidthEpe === "number" && !(Math.abs(s.widthEpe) <= goal.maxWidthEpe)) return false;
  return true;
}
