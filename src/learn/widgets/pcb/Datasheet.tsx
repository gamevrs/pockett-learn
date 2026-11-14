"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Capacitor, Ground, Junction, NetLabel, Wire } from "../elec-kit/symbols";
import { Note, ToyNote } from "./ui";
import {
  ABSMAX,
  DEFAULT_DESIGN,
  EC,
  PART_NAME,
  PINS,
  REC,
  SECTION_IDS,
  THETA_JA,
  labelOf,
  meaningOf,
  reviewRows,
  violations,
  type Design,
  type SectionId,
  type TableRow,
} from "./datasheet-data";

export interface DatasheetProps {
  /** read: tap any cell to learn what it means. find: tap the cell named by `ask`. audit: flag the rows of a design review that break the datasheet. */
  mode?: "read" | "find" | "audit";
  /** find mode: the id of the cell the learner should tap (kept for the lesson author; the question text names the target). */
  ask?: string;
  /** which sections to show (default all) */
  sections?: SectionId[];
  /** audit mode: the design under review */
  design?: Partial<Design>;
}

export interface DatasheetState {
  picked: string | null;
  flagged: string[];
}

const SECTION_TITLES: Record<SectionId, string> = {
  features: "Features",
  pinout: "Pinout",
  absmax: "Absolute maximum ratings",
  rec: "Recommended operating conditions",
  ec: "Electrical characteristics",
  thermal: "Thermal information",
  app: "Typical application",
};

function Section({ id, children }: { id: SectionId; children: React.ReactNode }) {
  return (
    <section className="mt-3 first:mt-0" aria-label={SECTION_TITLES[id]}>
      <h4 className="border-b-2 border-[var(--line-strong)] pb-1 text-[0.82rem] font-semibold uppercase tracking-wide text-ink">{SECTION_TITLES[id]}</h4>
      {children}
    </section>
  );
}

interface CellCtx {
  interactive: boolean;
  picked: string | null;
  answer: string | null;
  pick: (id: string) => void;
}

function Cell({ id, text, tag, label, ctx }: { id: string; text: string; tag?: string; label: string; ctx: CellCtx }) {
  const isPicked = ctx.picked === id;
  const isAnswer = ctx.answer === id;
  const body = (
    <>
      {tag && <span className="mr-1.5 text-[11px] uppercase text-ink-3">{tag}</span>}
      <span>{text}</span>
    </>
  );
  const base = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border px-2.5 py-1 font-mono text-[0.82rem] tabular-nums text-ink";
  if (!ctx.interactive)
    return (
      <span className={`${base} border-transparent bg-surface-2`}>
        {body}
      </span>
    );
  return (
    <button
      type="button"
      aria-pressed={isPicked}
      aria-label={label}
      onClick={() => ctx.pick(id)}
      className={`${base} transition-colors ${
        isPicked ? "border-[var(--brand)] bg-tint shadow-[0_0_0_1px_var(--brand)]" : isAnswer ? "border-dashed border-[var(--brand)] bg-surface" : "border-line bg-surface-2 hover:border-[var(--line-strong)]"
      }`}
    >
      {body}
    </button>
  );
}

function Table({ rows, ctx }: { rows: TableRow[]; ctx: CellCtx }) {
  return (
    <div role="list">
      {rows.map((r) => (
        <div key={r.param} role="listitem" className="flex flex-col gap-1 border-b border-line py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0 text-[0.86rem] leading-snug text-ink">
            {r.param}
            {r.cond && <span className="block text-xs text-ink-3">{r.cond}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.cells.map((c) => (
              <Cell key={c.id} id={c.id} tag={c.tag} text={c.text} label={`${r.param}${c.tag ? `, ${c.tag}` : ""}: ${c.text}`} ctx={ctx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** SOT-223 style top view; the picked pin is drawn in the accent colour. */
function PinDrawing({ picked }: { picked: string | null }) {
  const hi = (id: string) => (picked === id ? "var(--brand)" : "var(--ink)");
  const pins = [
    { id: "pin-gnd", x: 90, a: "1", n: "GND" },
    { id: "pin-out", x: 140, a: "2", n: "OUT" },
    { id: "pin-in", x: 190, a: "3", n: "IN" },
  ];
  return (
    <svg viewBox="0 0 280 150" className="mx-auto mt-2 w-full max-w-[320px]" role="img" aria-label="SOT-223 style package, top view: three pins along the bottom, pin 1 GND, pin 2 OUT, pin 3 IN, and a metal tab at the top connected to OUT">
      <rect x={80} y={8} width={120} height={28} rx={3} fill="var(--surface-2)" stroke={hi("pin-tab")} strokeWidth={picked === "pin-tab" ? 3 : 2} />
      <text x={140} y={27} textAnchor="middle" fontSize={14} fill="var(--ink)">
        tab = OUT
      </text>
      <rect x={40} y={36} width={200} height={62} rx={4} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      <text x={140} y={72} textAnchor="middle" fontSize={14} fontFamily="monospace" fill="var(--ink-2)">
        {PART_NAME}
      </text>
      {pins.map((p) => (
        <g key={p.id}>
          <rect x={p.x - 9} y={98} width={18} height={22} fill="var(--surface-2)" stroke={hi(p.id)} strokeWidth={picked === p.id ? 3 : 2} />
          <text x={p.x} y={142} textAnchor="middle" fontSize={14} fill={picked === p.id ? "var(--brand)" : "var(--ink)"} fontWeight={picked === p.id ? 700 : 400}>
            {p.a} {p.n}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AppCircuit() {
  return (
    <svg viewBox="0 0 300 134" className="mx-auto mt-2 w-full max-w-[340px]" role="img" aria-label="Typical application: VIN goes through the regulator's IN pin; a 10 microfarad input capacitor sits between IN and ground; a 10 microfarad output capacitor sits between OUT and ground; VOUT leaves from OUT.">
      <Wire points={[[6, 40], [100, 40]]} />
      <Wire points={[[190, 40], [294, 40]]} />
      <Junction x={60} y={40} />
      <Junction x={230} y={40} />
      <Capacitor x={60} y={40} rot={90} label="CIN" value="10 µF" labelFlip />
      <Ground x={60} y={100} />
      <Capacitor x={230} y={40} rot={90} label="COUT" value="10 µF" />
      <Ground x={230} y={100} />
      <Wire points={[[145, 76], [145, 100]]} />
      <Ground x={145} y={100} />
      <rect x={100} y={14} width={90} height={62} rx={3} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      <text x={145} y={32} textAnchor="middle" fontSize={14} fontFamily="monospace" fontWeight={600} fill="var(--ink)">
        {PART_NAME}
      </text>
      <text x={106} y={55} fontSize={14} fill="var(--ink)">
        IN
      </text>
      <text x={184} y={55} textAnchor="end" fontSize={14} fill="var(--ink)">
        OUT
      </text>
      <text x={145} y={71} textAnchor="middle" fontSize={14} fill="var(--ink)">
        GND
      </text>
      <NetLabel x={6} y={30} text="VIN" />
      <NetLabel x={294} y={30} text="VOUT" anchor="end" />
    </svg>
  );
}

export function Datasheet({ props, onChange, revealed, status, goal }: WidgetProps<DatasheetProps>) {
  const mode = props.mode ?? "read";
  const sections = props.sections ?? SECTION_IDS;
  const design: Design = { ...DEFAULT_DESIGN, ...(props.design ?? {}) };
  const [picked, setPicked] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
  const done = Boolean(revealed) || status === "revealed";
  const locked = mode === "find" && done;

  const emit = (p: string | null, f: string[]) => onChange?.({ picked: p, flagged: f } satisfies DatasheetState);
  const pick = (id: string) => {
    if (locked) return;
    setPicked(id);
    emit(id, flagged);
  };
  const toggle = (id: string) => {
    const next = flagged.includes(id) ? flagged.filter((x) => x !== id) : [...flagged, id];
    setFlagged(next);
    emit(picked, next);
  };

  const answer = mode === "find" && done && typeof goal?.picked === "string" ? (goal.picked as string) : null;
  const ctx: CellCtx = { interactive: mode !== "audit", picked, answer, pick };
  const show = (s: SectionId) => sections.includes(s);

  const sheet = (
    <div className="rounded-xl border border-line bg-surface p-2 sm:p-3">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b-2 border-[var(--ink)] pb-2">
        <div>
          <p className="font-mono text-lg font-bold leading-tight text-ink">{PART_NAME}</p>
          <p className="text-[0.86rem] text-ink-2">3.3 V, 500 mA low-dropout (LDO) regulator</p>
        </div>
        <p className="rounded border border-line px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-3">Fictional part, made up for this lesson</p>
      </div>

      {show("features") && (
        <Section id="features">
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[0.86rem] text-ink-2">
            <li>Fixed 3.3 V output, ±2% at 25 °C</li>
            <li>Up to 500 mA output current, internal current limit</li>
            <li>Low dropout: 0.6 V typical at 500 mA</li>
            <li>Stable with a 10 µF output capacitor</li>
            <li>SOT-223 package with heat-spreading tab</li>
          </ul>
        </Section>
      )}

      {show("pinout") && (
        <Section id="pinout">
          <PinDrawing picked={picked} />
          <div role="list" className="mt-1">
            {PINS.map((p) => (
              <div key={p.id} role="listitem" className="flex items-center gap-2 border-b border-line py-1.5 last:border-b-0">
                <Cell id={p.id} text={`${p.pin} ${p.name}`} label={`Pin ${p.pin}, ${p.name}: ${p.text}`} ctx={ctx} />
                <span className="min-w-0 flex-1 text-[0.82rem] leading-snug text-ink-2">{p.text}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {show("absmax") && (
        <Section id="absmax">
          <p className="mt-1 text-xs text-ink-3">Stresses beyond these can damage the part. Not a place to operate.</p>
          <Table rows={ABSMAX} ctx={ctx} />
        </Section>
      )}

      {show("rec") && (
        <Section id="rec">
          <p className="mt-1 text-xs text-ink-3">The electrical characteristics are guaranteed inside these limits.</p>
          <Table rows={REC} ctx={ctx} />
        </Section>
      )}

      {show("ec") && (
        <Section id="ec">
          <p className="mt-1 text-xs text-ink-3">Under the stated conditions. Design to min and max; typ is only what a part usually does.</p>
          <Table rows={EC} ctx={ctx} />
        </Section>
      )}

      {show("thermal") && (
        <Section id="thermal">
          <div className="flex flex-col gap-1 border-b border-line py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 text-[0.86rem] leading-snug text-ink">
              Junction-to-ambient thermal resistance, θJA
              <span className="block text-xs text-ink-3">SOT-223 on a 2-layer test board, 1 in² (about 645 mm²) of copper under the tab, still air</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Cell id="theta-ja" text={`${THETA_JA} °C/W`} label={`Thermal resistance θJA: ${THETA_JA} degrees Celsius per watt`} ctx={ctx} />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-ink-3">
            Estimate: P = (VIN − VOUT) × IOUT, then TJ = TA + P × θJA. (Simplified: ignores the small power VIN × IQ.)
          </p>
        </Section>
      )}

      {show("app") && (
        <Section id="app">
          <AppCircuit />
          <div role="list" className="mt-1">
            <div role="listitem" className="flex items-center gap-2 border-b border-line py-1.5">
              <Cell id="app-cin" text="CIN 10 µF" label="Input capacitor, 10 microfarad" ctx={ctx} />
              <span className="min-w-0 flex-1 text-[0.82rem] leading-snug text-ink-2">Recommended near the IN pin.</span>
            </div>
            <div role="listitem" className="flex items-center gap-2 py-1.5">
              <Cell id="app-cout" text="COUT 10 µF" label="Output capacitor, 10 microfarad minimum" ctx={ctx} />
              <span className="min-w-0 flex-1 text-[0.82rem] leading-snug text-ink-2">Required: 10 µF minimum for stability.</span>
            </div>
          </div>
        </Section>
      )}
    </div>
  );

  if (mode === "audit") {
    const rows = reviewRows(design);
    const right = new Set(violations(design));
    return (
      <div className="w-full">
        <div className="rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-[0.86rem] font-semibold text-ink">Design review: should each line be flagged?</p>
          <p className="mt-0.5 text-xs text-ink-3">A wall-adapter-powered sensor board uses the {PART_NAME} to make 3.3 V. Tap a line to flag it if it breaks the datasheet; tap again to unflag.</p>
          <div className="mt-2 flex flex-col gap-1.5" role="group" aria-label="Design review lines">
            {rows.map((r) => {
              const on = flagged.includes(r.id);
              const should = right.has(r.id);
              return (
                <div key={r.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(r.id)}
                    disabled={done}
                    className={`flex min-h-10 w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-[0.86rem] leading-snug transition-colors disabled:cursor-default ${
                      on ? "border-[var(--bad)] bg-surface text-ink shadow-[0_0_0_1px_var(--bad)]" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"
                    }`}
                  >
                    <span aria-hidden className={`mt-0.5 shrink-0 rounded border px-1 text-[11px] font-semibold uppercase ${on ? "border-[var(--bad)] text-[var(--bad)]" : "border-line text-ink-3"}`}>
                      {on ? "Flag" : "OK?"}
                    </span>
                    <span className="min-w-0 flex-1">{r.text}</span>
                  </button>
                  {done && (
                    <p className="mt-1 rounded-md bg-surface px-3 py-1.5 text-xs leading-snug text-ink-2">
                      <b className="text-ink">{should === on ? "Right" : should ? "Missed: this one breaks the datasheet" : "This one is fine"}.</b> {r.working}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <details open className="mt-3 rounded-xl border border-line">
          <summary className="min-h-10 cursor-pointer px-3 py-2.5 text-[0.86rem] font-medium text-ink">Datasheet excerpt (tap to show or hide)</summary>
          <div className="p-1 sm:p-2">{sheet}</div>
        </details>
        <ToyNote>Made-up part with invented numbers. The heat estimate is a simplified steady-state model (one thermal resistance, still air).</ToyNote>
      </div>
    );
  }

  const shown = picked ?? answer;
  return (
    <div className="w-full">
      {sheet}
      {(mode === "read" || done) && shown ? (
        <div className="sticky bottom-2 z-10 mt-2">
          <Note tone="accent">
            <b>{labelOf(shown)}.</b> {meaningOf(shown)}
          </Note>
        </div>
      ) : mode === "find" && picked ? (
        <div className="sticky bottom-2 z-10 mt-2">
          <Note>
            You tapped: <b>{labelOf(picked)}</b>. Tap another cell to change your answer.
          </Note>
        </div>
      ) : mode === "read" ? (
        <p className="mt-2 text-center text-xs text-ink-3">Tap any value to see what it means.</p>
      ) : null}
      <ToyNote>Made-up part with invented numbers, for learning how to read a datasheet. Real datasheets come from the manufacturer of the part.</ToyNote>
    </div>
  );
}

/** goal: { picked: id } (find mode), or { flags: string[] } (audit mode, exact set match) */
export function checkDatasheet(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<DatasheetState> | undefined;
  if (!s) return false;
  if (typeof goal.picked === "string") return s.picked === goal.picked;
  if (Array.isArray(goal.flags)) {
    const want = new Set(goal.flags as string[]);
    const got = new Set(s.flagged ?? []);
    return want.size === got.size && [...want].every((x) => got.has(x));
  }
  return false;
}
