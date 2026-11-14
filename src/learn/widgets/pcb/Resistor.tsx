"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { formatSI } from "../elec-kit/format";
import { Btn, Caption, Note, Readout, Seg, ToyNote } from "./ui";
import {
  E96,
  EIA96_MULT,
  SERIES_TOL,
  SMD_EXAMPLES,
  SMD_SCHEME_NAMES,
  COLORS,
  allowedColors,
  bandRoles,
  colorOf,
  convertBands,
  decodeBands,
  decodeSmd,
  eSeriesOf,
  encodeBands,
  normalizeCode,
  sameOhms,
  type BandRole,
} from "./codes";

/* ───────────────────────── pcb-resistor: colour bands ───────────────────────── */

export interface ResistorProps {
  /** decode: read the value of the bands. encode: set the bands to match `target`. */
  mode?: "decode" | "encode";
  /** 4 or 5 bands to start with (default 4) */
  bands?: 4 | 5;
  /** let the learner switch between 4 and 5 bands */
  toggle?: boolean;
  /** starting colours (must match the band count) */
  initial?: string[];
  /** encode mode: the value to build */
  target?: { ohms: number; tolerancePct: number };
  /** hide the numeric reading until the question is answered (for "read it yourself" questions) */
  hideValue?: boolean;
  /** do not let the learner change the colours */
  lock?: boolean;
}

export interface ResistorState {
  count: 4 | 5;
  bands: string[];
  ohms: number;
  tolerancePct: number;
}

const DEFAULT_4 = ["brown", "black", "red", "gold"];
const DEFAULT_5 = ["brown", "black", "black", "brown", "brown"];

function multLabel(mult: number): string {
  if (mult < 1) return `×${mult}`;
  return `×${formatSI(mult, "", { digits: 3, space: false })}`;
}

function bandHint(c: ReturnType<typeof colorOf>, role: BandRole): string {
  if (role === "digit") return String(c.digit);
  if (role === "mult") return multLabel(c.mult);
  return `±${c.tol}%`;
}

const BAND_X: Record<4 | 5, number[]> = { 4: [110, 136, 162, 238], 5: [106, 128, 150, 172, 238] };
const BODY = "#d9c7a0";

function fmtOhms(v: number): string {
  return formatSI(v, "Ω", { digits: 4 });
}

export function Resistor({ props, onChange, revealed, status, goal }: WidgetProps<ResistorProps>) {
  const mode = props.mode ?? "decode";
  const start: 4 | 5 = props.initial && props.initial.length === 5 ? 5 : props.initial && props.initial.length === 4 ? 4 : (props.bands ?? 4);
  const [bands, setBands] = useState<string[]>(props.initial && props.initial.length === start ? props.initial : start === 4 ? DEFAULT_4 : DEFAULT_5);
  const [active, setActive] = useState(0);
  const count = bands.length as 4 | 5;
  const roles = bandRoles(count);
  const done = Boolean(revealed) || status === "revealed";
  const locked = Boolean(props.lock);
  const reading = decodeBands(bands);

  const commit = (next: string[]) => {
    setBands(next);
    const r = decodeBands(next);
    onChange?.({ count: next.length as 4 | 5, bands: next, ohms: r.ohms, tolerancePct: r.tolerancePct } satisfies ResistorState);
  };
  const setColor = (name: string) => {
    if (locked) return;
    const next = bands.slice();
    next[active] = name;
    commit(next);
  };
  const setCount = (n: 4 | 5) => {
    if (n === count) return;
    setActive(0);
    commit(convertBands(bands, n));
  };

  const bandNames = roles.map((r, i) => (r === "digit" ? `Band ${i + 1}` : r === "mult" ? "Multiplier" : "Tolerance"));
  const role = roles[active];
  const palette = allowedColors(role);
  const hidden = Boolean(props.hideValue) && !done;
  const lo = reading.ok ? reading.ohms * (1 - reading.tolerancePct / 100) : NaN;
  const hi = reading.ok ? reading.ohms * (1 + reading.tolerancePct / 100) : NaN;
  const series = reading.ok ? eSeriesOf(reading.ohms) : [];
  const target = props.target;
  const matches = target ? reading.ok && Math.abs(reading.ohms - target.ohms) <= 1e-6 * target.ohms && reading.tolerancePct === target.tolerancePct : false;
  const goalOhms = typeof goal?.ohms === "number" ? goal.ohms : target?.ohms;
  const goalTol = typeof goal?.tolerancePct === "number" ? goal.tolerancePct : target?.tolerancePct;
  const answerBands = done && mode === "encode" && goalOhms && goalTol !== undefined ? encodeBands(goalOhms, goalTol, (typeof goal?.count === "number" ? goal.count : count) as 4 | 5) : null;
  const xs = BAND_X[count];

  return (
    <div className="w-full">
      {mode === "encode" && target && (
        <p className="mb-2 text-center text-[0.95rem] text-ink">
          Build a resistor of <b className="font-mono">{fmtOhms(target.ohms)}</b>, tolerance <b className="font-mono">±{target.tolerancePct} %</b>
          {goal && typeof goal.count === "number" ? <>, with <b>{goal.count} bands</b></> : null}.
        </p>
      )}
      <svg viewBox="0 0 360 134" className="w-full" role="img" aria-label={`Resistor with ${count} colour bands, left to right: ${bands.join(", ")}`}>
        <line x1={6} y1={62} x2={84} y2={62} stroke="var(--ink-3)" strokeWidth={5} strokeLinecap="round" />
        <line x1={276} y1={62} x2={354} y2={62} stroke="var(--ink-3)" strokeWidth={5} strokeLinecap="round" />
        <rect x={80} y={32} width={200} height={60} rx={26} fill={BODY} stroke="var(--ink-2)" strokeWidth={2} />
        {bands.map((b, i) => (
          <g key={i}>
            <rect
              x={xs[i]}
              y={32}
              width={12}
              height={60}
              fill={colorOf(b).hex}
              stroke={i === active && !locked ? "var(--brand)" : "rgba(0,0,0,0.45)"}
              strokeWidth={i === active && !locked ? 3 : 1}
              onClick={() => !locked && setActive(i)}
              style={{ cursor: locked ? "default" : "pointer" }}
            />
            <text x={xs[i] + 6} y={116} textAnchor="middle" fontSize={14} fill={i === active && !locked ? "var(--brand)" : "var(--ink-2)"} fontWeight={i === active && !locked ? 700 : 400}>
              {roles[i] === "digit" ? i + 1 : roles[i] === "mult" ? "×" : "tol"}
            </text>
          </g>
        ))}
        <text x={84} y={20} fontSize={14} fill="var(--ink-2)">
          ◂ start reading here
        </text>
      </svg>

      {props.toggle && (
        <div className="mt-1 flex justify-center">
          <Seg
            label="Number of bands"
            value={count}
            onChange={setCount}
            options={[
              { value: 4, label: "4 bands" },
              { value: 5, label: "5 bands" },
            ]}
          />
        </div>
      )}

      {!locked && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3">
          <Caption className="mb-1.5">Which band</Caption>
          <Seg label="Band to change" value={active} onChange={setActive} options={bandNames.map((n, i) => ({ value: i, label: n }))} />
          <Caption className="mb-1.5 mt-3">
            Colour for {bandNames[active].toLowerCase()}
            {role === "digit" ? " (a digit)" : role === "mult" ? " (what to multiply by)" : " (how far off it may be)"}
          </Caption>
          <div role="radiogroup" aria-label={`Colour of ${bandNames[active]}`} className="flex flex-wrap gap-1.5">
            {palette.map((c) => {
              const on = bands[active] === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${c.name}, ${bandHint(c, role)}`}
                  onClick={() => setColor(c.name)}
                  className={`flex min-h-10 min-w-[3.6rem] flex-col items-stretch gap-0.5 rounded-lg border px-1.5 py-1 text-center transition-colors ${
                    on ? "border-[var(--brand)] bg-tint shadow-[0_0_0_1px_var(--brand)]" : "border-line bg-surface-2 hover:border-[var(--line-strong)]"
                  }`}
                >
                  <span aria-hidden className="block h-4 rounded-sm border border-black/40" style={{ background: c.hex }} />
                  <span className="text-[11px] leading-tight text-ink">{c.name}</span>
                  <span className="font-mono text-[11px] leading-tight text-ink-2">{bandHint(c, role)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {locked && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3">
          <Caption className="mb-1.5">Colour chart</Caption>
          <table className="w-full text-left text-[0.82rem] text-ink-2">
            <thead>
              <tr className="text-xs text-ink-3">
                <th className="py-0.5 pr-2 font-medium">Colour</th>
                <th className="py-0.5 pr-2 font-medium">Digit</th>
                <th className="py-0.5 pr-2 font-medium">Multiplier</th>
                <th className="py-0.5 font-medium">Tolerance</th>
              </tr>
            </thead>
            <tbody>
              {COLORS.map((c) => (
                <tr key={c.name}>
                  <td className="py-0.5 pr-2">
                    <span className="flex items-center gap-1.5 text-ink">
                      <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-sm border border-black/40" style={{ background: c.hex }} />
                      {c.name}
                    </span>
                  </td>
                  <td className="py-0.5 pr-2 font-mono">{c.digit ?? "–"}</td>
                  <td className="py-0.5 pr-2 font-mono">{multLabel(c.mult)}</td>
                  <td className="py-0.5 font-mono">{c.tol !== null ? `±${c.tol}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2" aria-live="polite">
        <Readout label="Value" value={hidden ? "?" : fmtOhms(reading.ohms)} accent />
        <Readout label="Tolerance" value={hidden ? "?" : `±${reading.tolerancePct} %`} />
        <Readout label="Range" value={hidden ? "?" : `${fmtOhms(lo)} to ${fmtOhms(hi)}`} />
      </div>

      <div className="mt-3 space-y-2">
        {mode === "encode" && target ? (
          <Note tone={matches ? "accent" : "plain"}>
            {matches ? "These bands read exactly the target value." : `These bands read ${fmtOhms(reading.ohms)}, ±${reading.tolerancePct} %. The target is ${fmtOhms(target.ohms)}, ±${target.tolerancePct} %.`}
          </Note>
        ) : hidden ? (
          <Note>Read the bands left to right: two digits (or three), then the multiplier, then the tolerance.</Note>
        ) : (
          <Note>
            {series.length ? (
              <>{fmtOhms(reading.ohms)} is a standard value (in the {series.join(", ")} series).</>
            ) : (
              <>{fmtOhms(reading.ohms)} is not in the common E6, E12, E24 or E96 series, so it is a special order.</>
            )}{" "}
            Typical tolerances sold with each series: E12 {SERIES_TOL.E12}, E24 {SERIES_TOL.E24}, E96 {SERIES_TOL.E96}.
          </Note>
        )}
        {answerBands && (
          <Note tone="accent">
            One answer: <b>{answerBands.join(", ")}</b> (left to right).
          </Note>
        )}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Band 1 is the band closest to an end. The tolerance band is usually set a little apart from the others, which tells you where to start reading. If you cannot tell, the value that is a standard one is the likely reading.
      </p>
      <ToyNote>Typical colour code (IEC 60062). Gold and silver as a multiplier are ×0.1 and ×0.01; as tolerance they are ±5 % and ±10 %.</ToyNote>
    </div>
  );
}

/** goal: { ohms, tolerancePct, count } (any subset). ohms matches within 1e-6 relative. */
export function checkResistor(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<ResistorState> | undefined;
  if (!s || typeof s.ohms !== "number" || !Number.isFinite(s.ohms)) return false;
  let any = false;
  if (typeof goal.ohms === "number") {
    any = true;
    if (!sameOhms(s.ohms, goal.ohms)) return false;
  }
  if (typeof goal.tolerancePct === "number") {
    any = true;
    if (s.tolerancePct !== goal.tolerancePct) return false;
  }
  if (typeof goal.count === "number") {
    any = true;
    if (s.count !== goal.count) return false;
  }
  return any;
}

/* ───────────────────────── pcb-smd: SMD resistor codes ───────────────────────── */

export interface SmdProps {
  /** code to start with (empty by default) */
  initial?: string;
  /** which quick-pick codes to offer (default: a standard set) */
  examples?: string[];
  /** hide the quick-pick chips (for "type the code" questions) */
  noExamples?: boolean;
}

export interface SmdState {
  code: string;
  ohms: number | null;
  scheme: string;
}

function fmtSmd(ohms: number): string {
  return ohms === 0 ? "0 Ω" : formatSI(ohms, "Ω", { digits: 4 });
}

export function Smd({ props, onChange, status, goal }: WidgetProps<SmdProps>) {
  const [raw, setRaw] = useState(props.initial ?? "");
  const code = normalizeCode(raw);
  const r = decodeSmd(raw);
  const examples = props.examples ?? SMD_EXAMPLES.map((e) => e.code);
  const noteOf = (c: string) => SMD_EXAMPLES.find((e) => e.code === c)?.note;
  const done = status === "revealed";
  const idx = r.ok && r.scheme === "EIA-96" ? Number(code.slice(0, 2)) : 0;

  const set = (v: string) => {
    setRaw(v);
    const d = decodeSmd(v);
    onChange?.({ code: normalizeCode(v), ohms: d.ok ? d.ohms : null, scheme: d.ok ? d.scheme : "" } satisfies SmdState);
  };

  return (
    <div className="w-full">
      <svg viewBox="0 0 360 120" className="w-full" role="img" aria-label={`A surface-mount resistor chip printed with ${code || "no code yet"}`}>
        <rect x={0} y={0} width={360} height={120} rx={8} fill="#2f6b4f" opacity={0.9} />
        <rect x={88} y={14} width={184} height={72} rx={2} fill="#1b1b1b" stroke="#000" strokeWidth={1} />
        <rect x={88} y={14} width={26} height={72} fill="#c4c8cc" stroke="#6b6f73" strokeWidth={1} />
        <rect x={246} y={14} width={26} height={72} fill="#c4c8cc" stroke="#6b6f73" strokeWidth={1} />
        <text x={180} y={64} textAnchor="middle" fontSize={32} fontFamily="monospace" fontWeight={700} fill="#f5f5f5">
          {code || "···"}
        </text>
        <text x={180} y={110} textAnchor="middle" fontSize={14} fill="#f5f5f5">
          0603 chip, about 1.6 × 0.8 mm (not to scale)
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
          <Caption>Printed code</Caption>
          <input
            value={raw}
            onChange={(e) => set(e.target.value)}
            maxLength={6}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. 472"
            aria-label="Code printed on the chip"
            className="min-h-10 w-full rounded-lg border border-line bg-surface px-3 font-mono text-base uppercase text-ink outline-none focus:border-[var(--brand)]"
          />
        </label>
      </div>

      {!props.noExamples && (
        <div className="mt-2" role="group" aria-label="Example codes">
          <Caption className="mb-1.5">Try one</Caption>
          <div className="flex flex-wrap gap-1.5">
            {examples.map((c) => (
              <Btn key={c} on={code === c} onClick={() => set(c)} label={`Example code ${c}${noteOf(c) ? `, ${noteOf(c)}` : ""}`} className="!px-3 font-mono">
                {c}
              </Btn>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2" aria-live="polite">
        {!code ? (
          <Note>Type a code to decode it. A chip shows 3 or 4 characters.</Note>
        ) : r.ok ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Readout label="Value" value={fmtSmd(r.ohms ?? 0)} accent />
              <Readout label="Scheme" value={SMD_SCHEME_NAMES[r.scheme as keyof typeof SMD_SCHEME_NAMES]} />
            </div>
            <Note>
              <span className="font-mono">{r.working}</span>
              {r.alt ? ` ${r.alt}` : ""}
            </Note>
            {r.scheme === "zero" && <Note>000 (or a single 0) is a zero-ohm resistor, which is a jumper: a wire link in the shape of a resistor so a machine can place it.</Note>}
          </>
        ) : (
          <Note>{r.error}</Note>
        )}
        {done && goal && typeof goal.ohms === "number" && (
          <Note tone="accent">
            The goal was {fmtSmd(goal.ohms)}.
          </Note>
        )}
      </div>

      <details className="mt-3 rounded-xl border border-line bg-surface p-3">
        <summary className="min-h-6 cursor-pointer text-[0.86rem] font-medium text-ink">EIA-96 tables (for 1 % chips with a letter)</summary>
        <p className="mt-2 text-xs text-ink-3">Two digits pick a value from the table (01 is 100, 96 is 976), the letter picks the multiplier.</p>
        <p className="mt-1 text-xs text-ink-2">
          {Object.entries(EIA96_MULT).map(([l, m]) => `${l} ×${m}`).join(" · ")}
        </p>
        <ol className="mt-2 grid grid-cols-4 gap-x-2 gap-y-0.5 sm:grid-cols-8" aria-label="EIA-96 index to value">
          {E96.map((v, i) => (
            <li key={i} className={`flex justify-between rounded px-1 font-mono text-[11px] tabular-nums ${idx === i + 1 ? "bg-tint font-bold text-ink shadow-[0_0_0_1px_var(--brand)]" : "text-ink-2"}`}>
              <span className="text-ink-3">{String(i + 1).padStart(2, "0")}</span>
              <span>{v}</span>
            </li>
          ))}
        </ol>
      </details>
      <ToyNote>Markings follow the usual conventions (EIA-96 for 1 % chips, 3 or 4 digits for others). Makers differ, and tiny chips such as 0402 are often not marked at all.</ToyNote>
    </div>
  );
}

/** goal: { ohms, scheme? } or { code }. Matches when the decoded value equals the goal value (and the scheme, if the goal names one). */
export function checkSmd(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<SmdState> | undefined;
  if (!s || s.ohms === null || s.ohms === undefined) return false;
  let want: number | null = null;
  if (typeof goal.ohms === "number") want = goal.ohms;
  else if (typeof goal.code === "string") {
    const d = decodeSmd(goal.code);
    want = d.ok ? d.ohms : null;
  }
  if (want === null || !sameOhms(s.ohms, want)) return false;
  if (typeof goal.scheme === "string" && s.scheme !== goal.scheme) return false;
  return true;
}
