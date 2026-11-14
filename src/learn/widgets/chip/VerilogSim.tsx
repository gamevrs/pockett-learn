"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Seg, Toy } from "../semi/ui";
import { compareTrace, compile, defaultStimulus, formatDiag, formatValue, simulate, type Diag, type Radix, type Stimulus, type Trace } from "./verilog/index.ts";

// ───────────── chip-verilog: a tiny Verilog editor with a waveform viewer ─────────────

export interface VerilogGoal {
  /** The stimulus the check (and the target rows) use. */
  stimulus: Stimulus;
  /** Expected per-cycle values for some signals (see `sample`). */
  expect: Record<string, number[]>;
  /** Where the expected values are sampled: "post" (default) = just after the rising edge settles, "pre" = just before it (for Mealy outputs). */
  sample?: "pre" | "post";
  /** Regexes (as strings) the source must / must not match, tested on the code with comments removed. */
  mustContain?: string[];
  mustNotContain?: string[];
  /** Shown when the step is revealed. */
  solution?: string;
}

export interface VerilogSimProps {
  /** Starting source. */
  code: string;
  /** Inputs per cycle. Falls back to goal.stimulus, then to inputs counting up in binary over 8 steps. */
  stimulus?: Stimulus;
  /** Signals to draw (default: every port, plus the clock). */
  watch?: string[];
  /** Default true. false = read-only code. */
  editable?: boolean;
  /** Initial radix (default "dec"). */
  radix?: Radix;
  title?: string;
  /** A second, read-only design simulated with the same stimulus and drawn underneath (e.g. blocking vs non-blocking). */
  compare?: { code: string; label: string };
  /** Show the collapsible "What this toy supports" panel (default true). */
  subset?: boolean;
}

export interface VerilogState {
  code: string;
  ok: boolean;
  errors: number;
  trace?: { values: Record<string, number[]>; clock?: string };
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** goal: { stimulus, expect, sample?, mustContain?, mustNotContain? }. Re-compiles state.code and simulates it. */
export function checkVerilog(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as VerilogState | undefined;
  const g = goal as unknown as Partial<VerilogGoal>;
  if (!s || typeof s.code !== "string" || !g.stimulus || !g.expect) return false;
  try {
    const bare = stripComments(s.code);
    for (const re of g.mustContain ?? []) if (!new RegExp(re).test(bare)) return false;
    for (const re of g.mustNotContain ?? []) if (new RegExp(re).test(bare)) return false;
    const c = compile(s.code);
    if (!c.ok) return false;
    const r = simulate(c.design, g.stimulus);
    if (!r.ok) return false;
    return compareTrace(r.trace, g.expect, g.sample === "pre" ? "pre" : "post").ok;
  } catch {
    return false;
  }
}

// ───────────── running ─────────────

interface Evaluated {
  ok: boolean;
  errors: Diag[];
  warnings: Diag[];
  trace?: Trace;
}

function evaluate(src: string, given?: Stimulus): Evaluated {
  const c = compile(src);
  if (!c.ok) return { ok: false, errors: c.errors, warnings: [] };
  const stim = given ?? defaultStimulus(c.design);
  const r = simulate(c.design, stim);
  if (!r.ok) return { ok: false, errors: r.errors, warnings: c.warnings };
  return { ok: true, errors: [], warnings: c.warnings, trace: r.trace };
}

// ───────────── waveform ─────────────

const ROW = 34;
const HEAD = 26;
const NAME_W = 88;

interface WaveRow {
  name: string;
  width: number;
  isClock: boolean;
  pre: number[];
  post: number[];
  target?: number[];
  isTarget?: boolean;
}

function runsOf(seq: number[]) {
  const out: { a: number; b: number; v: number }[] = [];
  seq.forEach((v, i) => {
    const last = out[out.length - 1];
    if (last && last.v === v) last.b = i + 1;
    else out.push({ a: i, b: i + 1, v });
  });
  return out;
}

function Wave({ rows, steps, radix, sample, clocked }: { rows: WaveRow[]; steps: number; radix: Radix; sample: "pre" | "post"; clocked: boolean }) {
  const buses = rows.filter((r) => r.width > 1 || r.target);
  const maxLen = Math.max(1, ...buses.map((r) => formatValue(2 ** Math.min(r.width, 31) - 1, r.width, radix).length));
  const cw = Math.max(52, Math.min(170, Math.round(maxLen * 8.8 + 26)));
  const half = cw / 2;
  const W = steps * cw + 2;
  const H = HEAD + rows.length * ROW + 4;
  const tx = (i: number) => i * half;
  const fmt = (v: number, w: number) => formatValue(v, w, radix);

  return (
    <div className="flex">
      <div className="shrink-0" style={{ width: NAME_W }}>
        <div style={{ height: HEAD }} className="flex items-end pb-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-ink-3">
          {clocked ? "cycle" : "step"}
        </div>
        {rows.map((r) => (
          <div key={r.name + (r.isTarget ? "·t" : "")} style={{ height: ROW }} className="flex items-center gap-1 pr-2" title={`${r.name}${r.width > 1 ? ` (${r.width} bits)` : ""}${r.isTarget ? " target" : ""}`}>
            <span className={`truncate font-mono text-[0.82rem] ${r.isTarget ? "italic text-ink-3" : "font-semibold text-ink"}`}>{r.isTarget ? `${r.name} goal` : r.name}</span>
            {!r.isTarget && r.width > 1 && <span className="shrink-0 font-mono text-[0.68rem] text-ink-3">[{r.width - 1}:0]</span>}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto" tabIndex={0} role="region" aria-label="Waveform. Scrolls sideways when there are many cycles.">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`Waveform of ${rows.map((r) => r.name).join(", ")} over ${steps} ${clocked ? "clock cycles" : "steps"}.`}>
          {Array.from({ length: steps }, (_, i) => (
            <g key={i}>
              <line x1={i * cw} x2={i * cw} y1={HEAD - 4} y2={H} stroke="var(--line)" strokeWidth={1} />
              <text x={i * cw + half} y={HEAD - 8} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
                {i + 1}
              </text>
            </g>
          ))}
          <line x1={steps * cw + 1} x2={steps * cw + 1} y1={HEAD - 4} y2={H} stroke="var(--line)" strokeWidth={1} />
          {rows.map((r, ri) => {
            const top = HEAD + ri * ROW;
            const y0 = top + 7;
            const y1 = top + ROW - 7;
            const halves: number[] = [];
            for (let i = 0; i < steps; i++) halves.push(r.pre[i] ?? 0, r.post[i] ?? 0);
            if (r.isTarget && r.target) {
              return (
                <g key={`${r.name}·t`}>
                  {r.target.slice(0, steps).map((want, i) => {
                    const got = sample === "pre" ? r.pre[i] : r.post[i];
                    const wrong = got !== want;
                    return (
                      <g key={i}>
                        {wrong && <rect x={i * cw + 1} y={top + 1} width={cw - 1} height={ROW - 2} fill="var(--bad)" opacity={0.16} />}
                        <rect x={i * cw + 4} y={y0} width={cw - 8} height={y1 - y0} rx={5} fill="none" stroke={wrong ? "var(--bad)" : "var(--ink-3)"} strokeWidth={1.5} strokeDasharray="4 3" />
                        <text x={i * cw + half} y={y1 - 5} textAnchor="middle" fontSize={14} fontFamily="ui-monospace, monospace" fill="var(--ink)">
                          {fmt(want, r.width)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            }
            if (r.width === 1) {
              let d = "";
              let prev = -1;
              halves.forEach((v, h) => {
                const y = v ? y0 : y1;
                if (h === 0) d += `M0 ${y}`;
                else if (y !== prev) d += `L${tx(h)} ${prev}L${tx(h)} ${y}`;
                prev = y;
              });
              d += `L${steps * cw} ${prev}`;
              return (
                <g key={r.name}>
                  <path d={d} fill="none" stroke={r.isClock ? "var(--ink-3)" : "var(--brand)"} strokeWidth={2.25} strokeLinejoin="round" />
                </g>
              );
            }
            const segs = runsOf(halves);
            const slant = Math.min(6, half / 3);
            return (
              <g key={r.name}>
                {segs.map((s, si) => {
                  const xa = tx(s.a);
                  const xb = tx(s.b);
                  const mid = (y0 + y1) / 2;
                  const pts = `${xa + slant},${y0} ${xb - slant},${y0} ${xb},${mid} ${xb - slant},${y1} ${xa + slant},${y1} ${xa},${mid}`;
                  const txt = fmt(s.v, r.width);
                  const fits = xb - xa - 2 * slant >= txt.length * 8.4 + 4;
                  return (
                    <g key={si}>
                      <title>{`${r.name} = ${s.v} (${txt})`}</title>
                      <polygon points={pts} fill="var(--tint)" stroke="var(--brand)" strokeWidth={1.75} strokeLinejoin="round" />
                      {fits && (
                        <text x={(xa + xb) / 2} y={y1 - 5} textAnchor="middle" fontSize={14} fontFamily="ui-monospace, monospace" fill="var(--ink)">
                          {txt}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** Screen-reader table of the same values. */
function WaveTable({ rows, steps, radix }: { rows: WaveRow[]; steps: number; radix: Radix }) {
  return (
    <table className="sr-only">
      <caption>Signal values after each rising edge</caption>
      <thead>
        <tr>
          <th scope="col">Signal</th>
          {Array.from({ length: steps }, (_, i) => (
            <th scope="col" key={i}>{`Cycle ${i + 1}`}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.filter((r) => !r.isTarget).map((r) => (
          <tr key={r.name}>
            <th scope="row">{r.name}</th>
            {r.post.slice(0, steps).map((v, i) => (
              <td key={i}>{formatValue(v, r.width, radix)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildRows(trace: Trace, watch: string[] | undefined, goal: Partial<VerilogGoal> | undefined, showTarget: boolean): WaveRow[] {
  const byName = new Map(trace.signals.map((s) => [s.name, s]));
  let names = watch ?? trace.signals.filter((s) => s.kind === "input" || s.kind === "output").map((s) => s.name);
  if (trace.clock) names = [trace.clock, ...names.filter((n) => n !== trace.clock)];
  if (showTarget && goal?.expect) for (const n of Object.keys(goal.expect)) if (!names.includes(n)) names.push(n);
  const rows: WaveRow[] = [];
  for (const n of names) {
    const s = byName.get(n);
    if (!s) continue;
    rows.push({ name: n, width: s.width, isClock: n === trace.clock, pre: trace.pre[n], post: trace.values[n] });
    if (showTarget && goal?.expect?.[n]) rows.push({ name: n, width: s.width, isClock: false, pre: trace.pre[n], post: trace.values[n], target: goal.expect[n], isTarget: true });
  }
  return rows;
}

// ───────────── editor ─────────────

function Editor({ code, onEdit, readOnly, errorLines, taRef }: { code: string; onEdit: (v: string) => void; readOnly: boolean; errorLines: Set<number>; taRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const lines = code.split("\n");
  const maxLen = Math.max(28, ...lines.map((l) => l.length));
  const escaped = useRef(false);
  return (
    <div className="max-h-[26rem] overflow-auto rounded-xl border border-line bg-surface-2">
      <div className="flex min-w-full w-max">
        <div aria-hidden className="shrink-0 select-none border-r border-line py-2 pl-2 pr-2 text-right font-mono text-[14px] leading-6 text-ink-3">
          {lines.map((_, i) => (
            <div key={i} className={errorLines.has(i + 1) ? "font-bold text-bad" : ""}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={code}
          readOnly={readOnly}
          onChange={(e) => onEdit(e.target.value)}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.key === "Escape") {
              escaped.current = true;
              return;
            }
            if (e.key === "Tab" && !e.shiftKey && !escaped.current) {
              e.preventDefault();
              const ta = e.currentTarget;
              ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end");
              onEdit(ta.value);
            }
          }}
          onBlur={() => {
            escaped.current = false;
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          wrap="off"
          rows={lines.length}
          aria-label="Verilog source code"
          className="block flex-1 resize-none overflow-hidden whitespace-pre bg-transparent p-2 font-mono text-[16px] leading-6 text-ink outline-none sm:text-[14px]"
          style={{ minWidth: `${maxLen + 3}ch`, height: lines.length * 24 + 16 }}
        />
      </div>
    </div>
  );
}

const SUBSET = [
  "One `module` per design. Ports in the header (`module m(input clk, output reg [3:0] q);`) or listed first and declared inside.",
  "`input`, `output`, `output reg`, `wire`, `reg`, scalars or `[N:0]` vectors up to 32 bits wide (the range must end at 0). `parameter` and `localparam` constants.",
  "Numbers: `5`, `4'b1010`, `8'hFF`, `3'd5`, underscores allowed. All values are unsigned. There is no x or z.",
  "`assign` for wires. `always @(posedge clk)` (also `negedge`, and `posedge clk or posedge rst`) for registers, with `<=` or `=`. `always @*` (or `always @(a or b)`) for combinational logic.",
  "`begin`/`end`, `if`/`else`, `case`/`default`, comments.",
  "Operators: `& | ^ ~`, `! && ||`, `+ - *`, `== != < <= > >=`, `<< >>`, `?:`, `{a,b}`, `{4{a}}`, `a[i]`, `a[3:1]`, and reductions `&a |a ^a`. Width rules follow Verilog: `{cout, sum} = a + b + cin` keeps the carry, `a + b` into a 4-bit target wraps.",
  "Not supported (you get a friendly error): `initial`, `#delays`, `$display` and other `$` tasks, loops, `generate`, `function`/`task`, `integer`, signed numbers, `x`/`z`, instantiating other modules, `casez`/`casex`.",
];

// ───────────── the widget ─────────────

export function VerilogSim({ props, onChange, goal, status }: WidgetProps<VerilogSimProps>) {
  const g = goal as unknown as Partial<VerilogGoal> | undefined;
  const given = props.stimulus ?? g?.stimulus;
  const editable = props.editable ?? true;
  const [code, setCode] = useState(props.code);
  const [applied, setApplied] = useState(props.code);
  const [radix, setRadix] = useState<Radix>(props.radix ?? "dec");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shown = useMemo(() => evaluate(applied, given), [applied, given]);
  const live = useMemo(() => (code === applied ? shown : evaluate(code, given)), [code, applied, shown, given]);
  const other = useMemo(() => (props.compare ? evaluate(props.compare.code, given) : undefined), [props.compare, given]);

  const state = useMemo<VerilogState>(() => {
    const names = props.watch;
    const values: Record<string, number[]> = {};
    if (live.trace) for (const [k, v] of Object.entries(live.trace.values)) if (!names || names.includes(k) || live.trace.clock === k) values[k] = v;
    return { code, ok: live.ok, errors: live.errors.length, trace: live.trace ? { values, clock: live.trace.clock } : undefined };
  }, [code, live, props.watch]);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    cb.current?.(state);
  }, [state]);

  const edit = (v: string) => {
    setCode(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setApplied(v), 500);
  };
  const run = () => {
    if (timer.current) clearTimeout(timer.current);
    setApplied(code);
  };
  const gotoLine = (n: number) => {
    const ta = taRef.current;
    if (!ta || n < 1) return;
    const ls = code.split("\n");
    let start = 0;
    for (let i = 0; i < n - 1 && i < ls.length; i++) start += ls[i].length + 1;
    ta.focus();
    ta.setSelectionRange(start, start + (ls[n - 1]?.length ?? 0));
  };

  const sample = g?.sample === "pre" ? "pre" : "post";
  const showTarget = Boolean(g?.expect && g?.stimulus && (!props.stimulus || JSON.stringify(props.stimulus) === JSON.stringify(g.stimulus)));
  const tr = shown.trace;
  const rows = tr ? buildRows(tr, props.watch, g, showTarget) : [];
  const steps = tr ? (tr.values[tr.signals[0]?.name]?.length ?? 0) : 0;
  const clocked = Boolean(tr?.clock);
  const cmp = tr && g?.expect && showTarget ? compareTrace(tr, g.expect, sample) : undefined;
  const otherRows = other?.trace ? buildRows(other.trace, props.watch, undefined, false) : [];
  const errLines = new Set(shown.errors.map((e) => e.line));
  const stale = code !== applied;

  const fmtV = (sig: string, v: number | null) => (v === null ? "missing" : formatValue(v, tr?.signals.find((s) => s.name === sig)?.width ?? 32, radix));

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <Editor code={code} onEdit={edit} readOnly={!editable} errorLines={errLines} taRef={taRef} />
      {editable && <p className="mt-1 text-xs text-ink-3">Tab inserts spaces while you are typing here. Press Esc, then Tab, to move on.</p>}

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Btn primary onClick={run}>
          {stale ? "Run (code changed)" : "Run"}
        </Btn>
        {editable && code !== props.code && (
          <Btn
            onClick={() => {
              setCode(props.code);
              setApplied(props.code);
            }}
          >
            Reset code
          </Btn>
        )}
        <Seg
          label="Number format"
          value={radix}
          onChange={setRadix}
          options={[
            { value: "dec", label: "Decimal" },
            { value: "hex", label: "Hex" },
            { value: "bin", label: "Binary" },
          ]}
        />
      </div>

      {shown.errors.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" aria-label="Errors">
          {shown.errors.map((e, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => gotoLine(e.line)}
                className="min-h-10 w-full rounded-xl border border-[var(--bad)]/60 bg-surface px-3 py-2 text-left text-[0.88rem] leading-snug text-ink hover:bg-surface-2"
              >
                <span className="font-semibold text-bad">{e.line > 0 ? `Line ${e.line}` : "Error"}: </span>
                {e.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      {shown.warnings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" aria-label="Warnings">
          {shown.warnings.map((w, i) => (
            <li key={i}>
              <button type="button" onClick={() => gotoLine(w.line)} className="min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-[0.88rem] leading-snug text-ink-2 hover:bg-surface">
                <span className="font-semibold text-ink">Heads-up, line {w.line}: </span>
                {w.message}
              </button>
            </li>
          ))}
        </ul>
      )}

      {tr && rows.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-2">
          <Wave rows={rows} steps={steps} radix={radix} sample={sample} clocked={clocked} />
          <WaveTable rows={rows} steps={steps} radix={radix} />
          {steps > 5 && <p className="mt-1 text-xs text-ink-3">Scroll the waveform sideways to see all {steps} {clocked ? "cycles" : "steps"}.</p>}
        </div>
      )}
      {props.compare && (
        <div className="mt-3">
          <Caption className="mb-1.5">{props.compare.label}</Caption>
          <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-2 font-mono text-[14px] leading-6 text-ink">{props.compare.code}</pre>
          {other?.ok && other.trace ? (
            <div className="mt-2 rounded-xl border border-line bg-surface p-2">
              <Wave rows={otherRows} steps={steps} radix={radix} sample="post" clocked={Boolean(other.trace.clock)} />
            </div>
          ) : (
            other && (
              <p className="mt-2 text-sm text-bad">
                {other.errors.map((e) => formatDiag(e)).join(" ")}
              </p>
            )
          )}
        </div>
      )}

      {cmp && shown.ok && (
        <div className="mt-3">
          {cmp.ok ? (
            <Note tone="accent">Matches the target on all {steps} {clocked ? "cycles" : "steps"}.</Note>
          ) : (
            <Note>
              {clocked ? "Cycle" : "Step"} {cmp.firstMismatch!.step + 1}: {cmp.firstMismatch!.signal} is {fmtV(cmp.firstMismatch!.signal, cmp.firstMismatch!.got)}, target {fmtV(cmp.firstMismatch!.signal, cmp.firstMismatch!.want)}.
            </Note>
          )}
        </div>
      )}
      {status === "revealed" && g?.solution && (
        <div className="mt-3">
          <Caption className="mb-1.5">One solution</Caption>
          <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-2 font-mono text-[14px] leading-6 text-ink">{g.solution}</pre>
        </div>
      )}

      {props.subset !== false && (
        <details className="mt-3 rounded-xl border border-line bg-surface">
          <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium text-ink">What this toy supports</summary>
          <ul className="flex list-disc flex-col gap-1.5 px-7 pb-3 pt-1 text-[0.86rem] leading-snug text-ink-2">
            {SUBSET.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </details>
      )}
      <Toy>
        Toy Verilog simulator: a small subset, 2-state (0/1, no x/z), one module. Real simulators start every reg as x (unknown); here everything starts at 0. Each cycle the inputs change first, then the clock rises and registers update; the number shown for each cycle is the value just after the rising edge has settled
        {sample === "pre" && showTarget ? ", except the goal rows, which are read just before the edge" : ""}. A design that compiles here may still not be synthesisable, and vice versa.
      </Toy>
    </div>
  );
}
