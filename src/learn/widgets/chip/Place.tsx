"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Toy } from "../semi/ui";
import { BLOCKS, CAP, COLS, FIXED, GOOD, NETS, ROWS, START, colOf, demand, hpwl, netHpwl, overflow, placeAt, routeNet, rowOf, type Placement } from "./place-model.ts";

export { checkPlacement } from "./place-model.ts";

// ───────────── chip-place: tap a block, tap a slot; watch wirelength and congestion ─────────────

export interface PlaceProps {
  title?: string;
  /** Hide the congestion map and overflow readout (a wirelength-only warm-up). Default true = shown. */
  congestion?: boolean;
}

export interface PlaceState {
  placement: Placement;
  hpwl: number;
  overflow: number;
}

const label = (id: string) => BLOCKS.find((b) => b.id === id)?.label ?? id;
const cx = (slot: number) => (colOf(slot) + 0.5) * 100;
const cy = (slot: number) => (rowOf(slot) + 0.5) * 100;

export function Place({ props, onChange, goal, status }: WidgetProps<PlaceProps>) {
  const showCong = props.congestion !== false;
  const [placement, setPlacement] = useState<Placement>(START);
  const [selected, setSelected] = useState<string | null>(null);
  const [routed, setRouted] = useState(false);
  const [note, setNote] = useState("");

  const total = useMemo(() => hpwl(placement), [placement]);
  const dem = useMemo(() => demand(placement), [placement]);
  const over = useMemo(() => overflow(placement), [placement]);
  const state = useMemo<PlaceState>(() => ({ placement, hpwl: total, overflow: over }), [placement, total, over]);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    cb.current?.(state);
  }, [state]);

  const at = (slot: number) => Object.keys(placement).find((k) => placement[k] === slot);
  const maxHpwl = typeof goal?.maxHpwl === "number" ? goal.maxHpwl : undefined;
  const maxOver = typeof goal?.maxOverflow === "number" ? goal.maxOverflow : undefined;

  const tap = (slot: number) => {
    const occ = at(slot);
    if (selected === null) {
      if (!occ) return setNote("Tap a block first, then tap the slot to move it to.");
      if (BLOCKS.find((b) => b.id === occ)?.fixed) return setNote(`${label(occ)} is fixed to the die edge: pads cannot move.`);
      setSelected(occ);
      return setNote(`${label(occ)} selected. Tap an empty slot to move it, or another block to swap.`);
    }
    if (occ === selected) {
      setSelected(null);
      return setNote("");
    }
    if (occ && BLOCKS.find((b) => b.id === occ)?.fixed) return setNote(`${label(occ)} is a fixed pad. Pick another slot.`);
    const next = placeAt(placement, selected, slot);
    if (!next) return setNote("That move is not allowed.");
    setPlacement(next);
    setNote(occ ? `Swapped ${label(selected)} and ${label(occ)}.` : `Moved ${label(selected)}.`);
    setSelected(null);
  };

  const selNets = selected ? NETS.filter((n) => n.pins.includes(selected)) : [];
  const worst = Math.max(...dem);

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <div className="mx-auto max-w-[24rem]">
        <div className="relative overflow-hidden rounded-xl border border-line bg-surface">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {Array.from({ length: COLS * ROWS }, (_, slot) => {
              const occ = at(slot);
              const def = occ ? BLOCKS.find((b) => b.id === occ) : undefined;
              const d = dem[slot];
              const bad = showCong && d > CAP;
              const heat = showCong ? (bad ? "var(--bad)" : "var(--brand)") : "transparent";
              const pct = showCong ? (bad ? 38 : Math.min(30, (d / CAP) * 30)) : 0;
              const isSel = occ === selected;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => tap(slot)}
                  aria-label={`Row ${rowOf(slot) + 1}, column ${colOf(slot) + 1}: ${occ ? label(occ) + (def?.fixed ? " (fixed pad)" : "") : "empty"}${showCong ? `. ${d} nets pass through, capacity ${CAP}${bad ? ", overflowing" : ""}` : ""}${isSel ? ". Selected" : ""}`}
                  aria-pressed={isSel}
                  className={`relative aspect-square min-h-10 border border-line text-center ${isSel ? "outline outline-2 -outline-offset-2 outline-[var(--brand)]" : ""} ${bad ? "border-[var(--bad)]" : ""}`}
                  style={{ background: `color-mix(in srgb, ${heat} ${pct}%, transparent)` }}
                >
                  {occ && (
                    <span
                      className={`absolute inset-[14%] flex items-center justify-center rounded-lg border text-[0.72rem] font-semibold leading-none sm:text-[0.8rem] ${
                        def?.fixed ? "border-[var(--ink-3)] bg-surface-2 text-ink-2" : isSel ? "border-transparent bg-primary text-primary-ink" : "border-[var(--brand)] bg-surface text-ink"
                      }`}
                    >
                      {occ}
                    </span>
                  )}
                  {showCong && (
                    <span className={`pointer-events-none absolute right-0.5 top-0 font-mono text-[0.62rem] tabular-nums ${bad ? "font-bold text-[color-mix(in_srgb,var(--bad)_70%,var(--ink))]" : "text-ink-3"}`} aria-hidden>
                      {d}{bad ? "!" : ""}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <svg viewBox={`0 0 ${COLS * 100} ${ROWS * 100}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            {selNets.map((n) => {
              const cols = n.pins.map((p) => colOf(placement[p]));
              const rows = n.pins.map((p) => rowOf(placement[p]));
              const x0 = (Math.min(...cols) + 0.5) * 100;
              const y0 = (Math.min(...rows) + 0.5) * 100;
              return (
                <rect key={n.id} x={x0} y={y0} width={(Math.max(...cols) - Math.min(...cols)) * 100} height={(Math.max(...rows) - Math.min(...rows)) * 100} fill="none" stroke="var(--brand)" strokeWidth={2} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
              );
            })}
            {routed &&
              NETS.map((n) =>
                routeNet(placement, n).branches.map((br, bi) => (
                  <polyline
                    key={n.id + bi}
                    points={br.map((s) => `${cx(s)},${cy(s)}`).join(" ")}
                    fill="none"
                    stroke={selected && n.pins.includes(selected) ? "var(--brand)" : "var(--ink-2)"}
                    strokeOpacity={selected && !n.pins.includes(selected) ? 0.35 : 0.85}
                    strokeWidth={selected && n.pins.includes(selected) ? 3 : 1.75}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))
              )}
          </svg>
        </div>
        <p className="mt-1 text-center text-xs text-ink-3">
          Small number in each slot: nets routed through it (capacity {CAP}). Red slots overflow.{selected ? " Dashed boxes: the bounding box of each net on the selected block." : ""}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Total HPWL" value={`${total} slots`} accent />
        {showCong && <Readout label="Overflow" value={over} accent={over === 0} />}
        {showCong && <Readout label="Busiest slot" value={`${worst} / ${CAP}`} />}
        {maxHpwl !== undefined && <Readout label="Target HPWL" value={`≤ ${maxHpwl}`} />}
        {showCong && maxOver !== undefined && <Readout label="Target overflow" value={`≤ ${maxOver}`} />}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Btn on={routed} onClick={() => setRouted((v) => !v)}>
          {routed ? "Hide routes" : "Route"}
        </Btn>
        <Btn
          onClick={() => {
            setPlacement(START);
            setSelected(null);
            setNote("Back to the scattered starting placement.");
          }}
        >
          Reset
        </Btn>
        {status === "revealed" && (
          <Btn
            onClick={() => {
              setPlacement(GOOD);
              setSelected(null);
              setNote("A good placement: short wires and no slot over capacity.");
            }}
          >
            Show a good placement
          </Btn>
        )}
      </div>

      <div className="mt-3">
        <Note tone={note ? "accent" : "plain"}>{note || "Tap a block (CPU, SRAM, DSP, DMA, UART, PLL), then tap where it should go. The IN and OUT pads are fixed to the die edge."}</Note>
      </div>

      <details className="mt-3 rounded-xl border border-line bg-surface">
        <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium text-ink">Nets and wirelength</summary>
        <div className="px-3 pb-3 pt-1 text-[0.86rem] leading-snug text-ink-2">
          <p>
            <strong className="text-ink">HPWL</strong> (half-perimeter wirelength): for each net, draw the smallest box around all its pins and add its width and height, measured in slots. The total over all nets is a fast stand-in for real routed wire. Routes here go along the driver&apos;s row, then down the sink&apos;s column (an L shape).
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {NETS.map((n) => (
              <li key={n.id} className="flex justify-between gap-2">
                <span>
                  <span className="font-mono font-semibold text-ink">{n.id}</span> {n.pins.join(" → ")}
                </span>
                <span className="font-mono tabular-nums text-ink">{netHpwl(placement, n)}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
      <Toy>
        Toy floorplan: a 5 × 5 grid, eight blocks and eight nets, with wirelength in slot units. Real placers work on millions of cells, minimise HPWL together with timing and density, and a global router picks routes from a layer stack; the L routes and the capacity of {CAP} per slot here are simplifications. Pads: {Object.keys(FIXED).join(" and ")}.
      </Toy>
    </div>
  );
}
