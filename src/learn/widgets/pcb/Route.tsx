"use client";

import { useState, type ReactNode } from "react";
import type { WidgetProps } from "@/learn/widget";
import {
  COLS,
  DEFAULT_C1,
  FIXED_BODY,
  NETS,
  ROWS,
  c1Cells,
  clearPowerCopper,
  emptyCopper,
  evaluate,
  key,
  neighbours,
  ownerOf,
  pinsOf,
  placeC1,
  tapRoute,
  type Copper,
  type Layout,
  type NetId,
  type Rot,
} from "./routegame";
import { Btn, Caption, Meter, Note, ORANGE, BLUE, Readout, Seg, ToyNote } from "./ui";

export interface RouteProps {
  /** Start in the routing phase with the cap at its tight spot? Default false: start in placement. */
  phase?: "place" | "route";
}

export interface RouteState {
  phase: "place" | "route";
  placed: { C1: [number, number, number] };
  routed: string[];
  unrouted: string[];
  drcErrors: number;
  /** Steps VDD to C1+ plus C1− to GND through copper; -1 when not connected yet. */
  loopCells: number;
  totalCells: number;
  allRouted: boolean;
}

const NET_COLOUR: Record<NetId, string> = { VCC: ORANGE, GND: BLUE, SIG: "var(--brand)" };

function snapshot(phase: "place" | "route", layout: Layout, copper: Copper): RouteState {
  const rep = evaluate(layout, copper);
  return {
    phase,
    placed: { C1: [...layout.c1] },
    routed: NETS.filter((n) => rep.routed[n]),
    unrouted: rep.unrouted,
    drcErrors: rep.drcErrors,
    loopCells: rep.loopCells,
    totalCells: rep.totalCells,
    allRouted: rep.unrouted.length === 0,
  };
}

export function Route({ props, onChange, revealed }: WidgetProps<RouteProps>) {
  const [phase, setPhase] = useState<"place" | "route">(props.phase ?? "place");
  const [layout, setLayout] = useState<Layout>({ c1: DEFAULT_C1 });
  const [copper, setCopper] = useState<Copper>(emptyCopper());
  const [net, setNet] = useState<NetId>("VCC");
  const [sel, setSel] = useState(false);
  const [msg, setMsg] = useState("Tap C1, then tap a free cell to move it. Pads of the same net that touch are connected.");
  const locked = Boolean(revealed);

  const rep = evaluate(layout, copper);
  const pins = pinsOf(layout);
  const { plus, minus } = c1Cells(layout);
  const bad = new Set(rep.drcCells);

  const commit = (p: "place" | "route", l: Layout, c: Copper) => {
    setPhase(p);
    setLayout(l);
    setCopper(c);
    onChange?.(snapshot(p, l, c));
  };

  const onCell = (x: number, y: number) => {
    if (locked) return;
    const k = key(x, y);
    if (phase === "place") {
      if (k === plus || k === minus) {
        setSel(!sel);
        setMsg(sel ? "C1 put down. Tap it again to pick it up." : "C1 picked up. Tap a free cell for its + pad (use Rotate C1 to turn it).");
        return;
      }
      if (!sel) {
        setMsg("Tap C1 first, then the cell where its + pad should go.");
        return;
      }
      const r = placeC1(layout, copper, x, y, layout.c1[2]);
      if (!r.ok) {
        setMsg(r.why);
        return;
      }
      const had = copper.VCC.length + copper.GND.length > 0;
      setSel(false);
      setMsg(had ? "C1 moved. Its VCC and GND traces were cleared, so route them again." : "C1 moved. Is it close to U1's VDD and GND pads?");
      commit(phase, r.layout, had ? clearPowerCopper(copper) : copper);
      return;
    }
    const r = tapRoute(layout, copper, net, k);
    setMsg(r.msg);
    if (r.copper !== copper) commit(phase, layout, r.copper);
  };

  const rotate = () => {
    if (locked) return;
    const rot = (((layout.c1[2] + 90) % 360) as Rot);
    const r = placeC1(layout, copper, layout.c1[0], layout.c1[1], rot);
    if (!r.ok) {
      setMsg(`Cannot rotate here: ${r.why}`);
      return;
    }
    const had = copper.VCC.length + copper.GND.length > 0;
    setMsg(had ? "C1 rotated. Its VCC and GND traces were cleared." : "C1 rotated: the − pad moved around the + pad.");
    commit(phase, r.layout, had ? clearPowerCopper(copper) : copper);
  };

  const setPhaseTo = (p: "place" | "route") => {
    setSel(false);
    setMsg(p === "place" ? "Tap C1, then tap a free cell to move it." : `Pick a net, then tap cells next to its pads to lay copper. Tap the last cell again to undo it.`);
    setPhase(p);
    onChange?.(snapshot(p, layout, copper));
  };

  const clearNet = () => {
    if (locked) return;
    setMsg(`Cleared ${net}.`);
    commit(phase, layout, { ...copper, [net]: [] });
  };
  const clearAll = () => {
    if (locked) return;
    setMsg("Cleared all copper.");
    commit(phase, layout, emptyCopper());
  };

  const loop = rep.loopCells;
  const loopTone = loop < 0 ? "muted" : loop <= 3 ? "brand" : loop <= 7 ? "warn" : "bad";
  const done = rep.unrouted.length === 0 && rep.drcErrors === 0;

  const cellView = (x: number, y: number) => {
    const k = key(x, y);
    const pin = pins[k];
    const body = FIXED_BODY[k];
    const owner = ownerOf(copper, k);
    const isC1 = k === plus || k === minus;
    const netOf: NetId | null = pin ? pin.net : owner;
    const same = netOf ? neighbours(k).filter((n) => pins[n]?.net === netOf || ownerOf(copper, n) === netOf) : [];
    const dirs = same.map((n) => {
      const [nx, ny] = n.split(",").map(Number);
      return nx > x ? "e" : nx < x ? "w" : ny > y ? "s" : "n";
    });
    const arm = (d: "n" | "e" | "s" | "w") =>
      dirs.includes(d) ? (
        <span
          key={d}
          aria-hidden
          className="absolute"
          style={{
            background: netOf ? NET_COLOUR[netOf] : "transparent",
            ...(d === "n" ? { left: "50%", top: 0, width: 6, height: "50%", marginLeft: -3 } : {}),
            ...(d === "s" ? { left: "50%", bottom: 0, width: 6, height: "50%", marginLeft: -3 } : {}),
            ...(d === "w" ? { top: "50%", left: 0, height: 6, width: "50%", marginTop: -3 } : {}),
            ...(d === "e" ? { top: "50%", right: 0, height: 6, width: "50%", marginTop: -3 } : {}),
          }}
        />
      ) : null;
    const desc = pin
      ? `${pin.part} ${pin.name} pad, net ${pin.net}${isC1 && sel ? ", picked up" : ""}`
      : body
        ? `${body.part} body`
        : owner
          ? `${owner} trace`
          : "empty";
    return (
      <button
        key={k}
        type="button"
        disabled={locked}
        onClick={() => onCell(x, y)}
        aria-label={`Column ${x + 1}, row ${y + 1}: ${desc}`}
        className={`relative aspect-square min-h-10 min-w-10 overflow-hidden rounded-md border text-[11px] font-semibold leading-none transition-colors disabled:cursor-not-allowed ${
          isC1 ? "border-[var(--line-strong)] bg-tint text-ink" : pin || body ? "border-[var(--line-strong)] bg-surface-2 text-ink" : "border-line bg-surface text-ink-3 hover:bg-surface-2"
        } ${isC1 && sel ? "ring-2 ring-[var(--brand)]" : ""} ${bad.has(k) ? "!border-[var(--bad)] ring-2 ring-[var(--bad)]" : ""}`}
      >
        {netOf && (
          <>
            {arm("n")}
            {arm("e")}
            {arm("s")}
            {arm("w")}
            <span aria-hidden className="absolute left-1/2 top-1/2 -ml-[6px] -mt-[6px] h-3 w-3 rounded-sm" style={{ background: NET_COLOUR[netOf] }} />
          </>
        )}
        {pin && (
          <span className="absolute inset-x-0 bottom-0.5 block text-center font-mono text-[10.5px] leading-none text-ink">
            {pin.name}
          </span>
        )}
        {pin && (
          <span className="absolute inset-x-0 top-0.5 block text-center font-mono text-[10.5px] leading-none text-ink-2">{pin.part}</span>
        )}
        {body && <span className="absolute inset-0 grid place-items-center font-mono text-[12px] text-ink">{body.label}</span>}
      </button>
    );
  };

  const cells: ReactNode[] = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) cells.push(cellView(x, y));

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <Caption className="mb-1">Phase</Caption>
          <Seg label="Phase" value={phase} options={[{ value: "place", label: "1 Place" }, { value: "route", label: "2 Route" }]} onChange={(v) => !locked && setPhaseTo(v)} />
        </div>
        {phase === "place" ? (
          <Btn onClick={rotate} disabled={locked}>
            Rotate C1
          </Btn>
        ) : (
          <>
            <div>
              <Caption className="mb-1">Net</Caption>
              <Seg label="Net to route" value={net} options={NETS.map((n) => ({ value: n, label: `${n}${rep.routed[n] ? " ✓" : ""}` }))} onChange={(v) => setNet(v)} />
            </div>
            <Btn onClick={clearNet} disabled={locked || copper[net].length === 0}>
              Clear net
            </Btn>
            <Btn onClick={clearAll} disabled={locked || rep.totalCells === 0}>
              Clear all
            </Btn>
          </>
        )}
      </div>

      <div className="mt-3">
        <div className="mx-auto grid w-full max-w-[21rem] gap-[2px]" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(40px, 1fr))` }} role="group" aria-label="Board grid, 6 columns by 7 rows">
          {cells}
        </div>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.8rem] text-ink-2">
          {NETS.map((n) => (
            <span key={n} className="inline-flex items-center gap-1">
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NET_COLOUR[n] }} />
              {n}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-3">
        <Note>{msg}</Note>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Routed" value={`${3 - rep.unrouted.length}/3`} accent={rep.unrouted.length === 0} />
        <Readout label="Clearance errors" value={rep.drcErrors} accent={rep.drcErrors === 0 && rep.totalCells > 0} />
        <Readout label="Copper" value={`${rep.totalCells} cells`} />
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <div className="flex items-baseline justify-between gap-2 text-xs text-ink-3">
          <span>Decoupling loop (VDD to C1 + C1 to GND)</span>
          <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{loop < 0 ? "not connected" : `${loop} ${loop === 1 ? "step" : "steps"}`}</span>
        </div>
        <div className="mt-1.5">
          <Meter frac={loop < 0 ? 0 : Math.min(1, loop / 12)} tone={loopTone} label="Decoupling loop length" />
        </div>
        <p className="mt-2 text-[0.82rem] leading-snug text-ink-2">
          {loop < 0
            ? "Route VCC and GND so C1 is wired to U1 to measure the loop."
            : loop <= 3
              ? `Tight: about ${loop * 2} mm of loop, roughly ${loop * 2} nH. C1 can feed U1's quick current gulps.`
              : `Long: about ${loop * 2} mm, roughly ${loop * 2} nH. A long loop slows the capacitor's help. Move C1 right next to the pads.`}
        </p>
      </div>
      {done && (
        <div className="mt-3">
          <Note tone="accent">DRC passes: every net routed and no clearance errors.</Note>
        </div>
      )}
      <p className="mt-2 text-[0.82rem] leading-snug text-ink-2">
        Toy clearance rule: traces and pads of different nets may not touch edge to edge (pads of one part are exempt). Walk the nets around each other with a free cell between.
      </p>
      <ToyNote>Toy board: one copper layer, 1 cell = 2 mm, loop inductance about 1 nH per mm (a rough rule of thumb). Real tools route at much finer pitch with many layers.</ToyNote>
    </div>
  );
}

/** goal: { allRouted, maxDrc, maxLoop } */
export function checkRoute(state: unknown, goal: Record<string, unknown>) {
  const s = state as RouteState | undefined;
  if (!s) return false;
  if (typeof goal.allRouted === "boolean" && s.allRouted !== goal.allRouted) return false;
  if (typeof goal.maxDrc === "number" && s.drcErrors > goal.maxDrc) return false;
  if (typeof goal.maxLoop === "number" && (s.loopCells < 0 || s.loopCells > goal.maxLoop)) return false;
  return true;
}
