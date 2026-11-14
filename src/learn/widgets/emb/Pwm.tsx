"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { ledBrightness, pwm, servoAngle } from "./sim";
import { Caption, Note, Readout, Slider, ToyNote, clamp, fmtHz, fmtSec } from "./ui";

// ───────────────────────────── emb-pwm: a timer as a PWM generator, with a scope ─────────────────────────────

type PwmMode = "led" | "servo" | "timer";
type PwmField = "psc" | "arr" | "ccr";

export interface PwmProps {
  clockHz?: number;
  psc?: number;
  arr?: number;
  ccr?: number;
  mode?: PwmMode;
  /** Registers that are fixed (shown, not editable). */
  lock?: PwmField[];
  task?: string;
}

export interface PwmState {
  psc: number;
  arr: number;
  ccr: number;
  tickHz: number;
  freqHz: number;
  duty: number;
  highMs: number;
  angle: number;
}

const MAXREG = 65535;

const DEFAULTS: Record<PwmMode, { arr: number; ccr: number }> = {
  led: { arr: 999, ccr: 250 },
  servo: { arr: 19999, ccr: 1500 },
  timer: { arr: 999, ccr: 500 },
};

function makeState(clockHz: number, psc: number, arr: number, ccr: number): PwmState {
  const r = pwm(clockHz, psc, arr, ccr);
  const highMs = r.highS * 1000;
  return { psc, arr, ccr, tickHz: r.tickHz, freqHz: r.freqHz, duty: r.duty, highMs, angle: servoAngle(highMs) };
}

/** A whole-number box that keeps what you are typing until you leave it, and ignores text that is not a number. */
function NumField({ label, value, onCommit, disabled, max = MAXREG }: { label: string; value: number; onCommit: (v: number) => void; disabled?: boolean; max?: number }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft !== null && /^\d+$/.test(draft.trim()) ? clamp(parseInt(draft.trim(), 10), 0, max) : null;
  const shown = draft !== null && parsed === value ? draft : String(value);
  return (
    <div className="flex flex-col items-start gap-1">
      <label htmlFor={id} className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`${label}: down`}
          disabled={disabled || value <= 0}
          onClick={() => {
            setDraft(null);
            onCommit(clamp(value - 1, 0, max));
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-lg text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          step={1}
          value={shown}
          disabled={disabled}
          onChange={(e) => {
            const t = e.target.value;
            setDraft(t);
            if (/^\d+$/.test(t.trim())) onCommit(clamp(parseInt(t.trim(), 10), 0, max));
          }}
          onBlur={() => setDraft(null)}
          className="min-h-10 w-24 rounded-lg border border-line bg-surface px-2 text-center font-mono text-sm text-ink disabled:opacity-60 sm:w-28"
        />
        <button
          type="button"
          aria-label={`${label}: up`}
          disabled={disabled || value >= max}
          onClick={() => {
            setDraft(null);
            onCommit(clamp(value + 1, 0, max));
          }}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-lg text-ink hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

const f1 = (n: number) => n.toFixed(1);

function Scope({ psc, arr, ccr, clockHz, periodS, freqHz, duty }: { psc: number; arr: number; ccr: number; clockHz: number; periodS: number; freqHz: number; duty: number }) {
  const X0 = 44;
  const W = 306;
  const periods = 3;
  const pw = W / periods;
  const steps = arr + 1;
  const cTop = 22;
  const cBot = 86;
  const oHigh = 112;
  const oLow = 138;
  const ccrY = cBot - (Math.min(ccr, steps) / steps) * (cBot - cTop);
  const xs = Array.from({ length: periods + 1 }, (_, i) => X0 + i * pw);

  const saw = xs
    .slice(0, periods)
    .map((x, i) => `${i === 0 ? "M" : "L"}${f1(x)} ${cBot} L${f1(x + pw)} ${cTop}${i < periods - 1 ? ` L${f1(x + pw)} ${cBot}` : ""}`)
    .join(" ");

  const ev: { x: number; v: 0 | 1 }[] = [];
  for (let i = 0; i < periods; i++) {
    ev.push({ x: xs[i], v: duty > 0 ? 1 : 0 });
    if (duty > 0 && duty < 1) ev.push({ x: xs[i] + duty * pw, v: 0 });
  }
  const yOf = (v: 0 | 1) => (v ? oHigh : oLow);
  let out = `M${f1(ev[0].x)} ${yOf(ev[0].v)}`;
  for (let i = 1; i < ev.length; i++) out += ` L${f1(ev[i].x)} ${yOf(ev[i - 1].v)} L${f1(ev[i].x)} ${yOf(ev[i].v)}`;
  out += ` L${f1(X0 + W)} ${yOf(ev[ev.length - 1].v)}`;

  const label = `Scope, three periods. Counter CNT counts 0 to ${arr}. Output is high while CNT is below ${ccr}: duty ${(duty * 100).toFixed(1)} percent, frequency ${fmtHz(freqHz)}, period ${fmtSec(periodS)}, timer clock ${fmtHz(clockHz)}, prescaler ${psc}.`;
  const ccrLabelY = clamp(ccrY + 5, 60, 100);

  return (
    <svg viewBox="0 0 360 196" className="w-full" role="img" aria-label={label}>
      {xs.map((x) => (
        <line key={x} x1={f1(x)} x2={f1(x)} y1={cTop - 6} y2={oLow + 8} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 4" />
      ))}
      <text x={4} y={44} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">
        CNT
      </text>
      <path d={saw} fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinejoin="round" />
      <line x1={X0} x2={X0 + W} y1={f1(ccrY)} y2={f1(ccrY)} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={4} y={f1(ccrLabelY)} fontSize={14} fill="var(--brand)" fontFamily="var(--font-mono, monospace)">
        CCR
      </text>
      <text x={4} y={(oHigh + oLow) / 2 + 5} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">
        OUT
      </text>
      <path d={out} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
      <line x1={X0} x2={f1(X0 + pw)} y1={166} y2={166} stroke="var(--ink-2)" strokeWidth={1.5} />
      <line x1={X0} x2={X0} y1={160} y2={172} stroke="var(--ink-2)" strokeWidth={1.5} />
      <line x1={f1(X0 + pw)} x2={f1(X0 + pw)} y1={160} y2={172} stroke="var(--ink-2)" strokeWidth={1.5} />
      <text x={f1(X0 + pw / 2)} y={190} fontSize={14} textAnchor="middle" fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
        one period = {fmtSec(periodS)}
      </text>
    </svg>
  );
}

function ServoDial({ angle, pulseMs }: { angle: number; pulseMs: number }) {
  const cx = 180;
  const cy = 112;
  const r = 80;
  const pt = (a: number, rad: number) => {
    const t = (a * Math.PI) / 180;
    return { x: +(cx - rad * Math.cos(t)).toFixed(1), y: +(cy - rad * Math.sin(t)).toFixed(1) };
  };
  const horn = pt(angle, 70);
  return (
    <svg viewBox="0 0 360 150" className="w-full" role="img" aria-label={`Servo horn at ${angle.toFixed(0)} degrees for a ${pulseMs.toFixed(2)} millisecond pulse. Scale 0, 90 and 180 degrees.`}>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--line-strong)" strokeWidth={2} />
      {[0, 45, 90, 135, 180].map((a) => {
        const p1 = pt(a, r - 6);
        const p2 = pt(a, r + 6);
        return <line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--ink-2)" strokeWidth={a % 90 === 0 ? 2 : 1} />;
      })}
      <text x={cx - r} y={cy + 24} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
        0°
      </text>
      <text x={cx} y={cy - r - 12} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
        90°
      </text>
      <text x={cx + r} y={cy + 24} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
        180°
      </text>
      <line x1={cx} y1={cy} x2={horn.x} y2={horn.y} stroke="var(--brand)" strokeWidth={8} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={10} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
    </svg>
  );
}

export function Pwm({ props, onChange, revealed }: WidgetProps<PwmProps>) {
  const mode: PwmMode = props.mode ?? "led";
  const clockHz = props.clockHz && props.clockHz > 0 ? props.clockHz : 16_000_000;
  const lock = props.lock ?? [];
  const locked = Boolean(revealed);
  const [regs, setRegs] = useState({
    psc: clamp(Math.round(props.psc ?? 15), 0, MAXREG),
    arr: clamp(Math.round(props.arr ?? DEFAULTS[mode].arr), 0, MAXREG),
    ccr: clamp(Math.round(props.ccr ?? DEFAULTS[mode].ccr), 0, MAXREG),
  });
  const { psc, arr, ccr } = regs;
  const r = pwm(clockHz, psc, arr, ccr);
  const st = makeState(clockHz, psc, arr, ccr);

  const set = (patch: Partial<typeof regs>) => {
    const next = { ...regs, ...patch };
    setRegs(next);
    onChange?.(makeState(clockHz, next.psc, next.arr, next.ccr));
  };

  const fields: { key: PwmField; label: string; hint: string }[] = [
    { key: "psc", label: "PSC (prescaler)", hint: "divides the clock by PSC + 1" },
    { key: "arr", label: "ARR (auto-reload)", hint: "the counter runs 0 to ARR" },
    { key: "ccr", label: "CCR (compare)", hint: "output is high while the counter is below CCR" },
  ];
  const brightness = ledBrightness(r.duty);
  const opacity = 0.08 + 0.92 * brightness;
  const flicker = r.freqHz < 50;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}

      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        {fields
          .filter((f) => !(f.key === "ccr" && mode === "timer"))
          .map((f) =>
            lock.includes(f.key) ? (
              <div key={f.key} className="flex flex-col items-start gap-1">
                <Caption>{f.label}</Caption>
                <span className="inline-flex min-h-10 items-center rounded-lg border border-line bg-surface-2 px-3 font-mono text-sm text-ink">{regs[f.key]} (fixed)</span>
              </div>
            ) : (
              <NumField key={f.key} label={f.label} value={regs[f.key]} onCommit={(v) => set({ [f.key]: v } as Partial<typeof regs>)} disabled={locked} />
            ),
          )}
      </div>

      {mode !== "timer" && !lock.includes("ccr") && (
        <Slider label="CCR on a slider (0 to ARR + 1)" value={Math.min(ccr, arr + 1)} min={0} max={arr + 1} step={1} onChange={(v) => set({ ccr: v })} disabled={locked} className="mt-2" />
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <Scope psc={psc} arr={arr} ccr={ccr} clockHz={clockHz} periodS={r.periodS} freqHz={r.freqHz} duty={r.duty} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Timer clock" value={fmtHz(clockHz)} />
        <Readout label="Tick rate" value={fmtHz(r.tickHz)} />
        <Readout label="Frequency" value={fmtHz(r.freqHz)} accent />
        <Readout label="Period" value={fmtSec(r.periodS)} />
        {mode !== "timer" && <Readout label="Duty" value={`${(r.duty * 100).toFixed(1)}%`} accent />}
        {mode !== "timer" && <Readout label="High time" value={fmtSec(r.highS)} />}
        <Readout label="Duty steps" value={r.steps.toLocaleString("en-US")} />
      </div>

      {mode === "led" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
          <span aria-hidden className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--line-strong)] bg-surface-2">
            <span className="h-8 w-8 rounded-full" style={{ background: "var(--elec-glow, #f5c518)", opacity }} />
          </span>
          <div className="min-w-0 flex-1 basis-48">
            <p className="text-sm text-ink">
              LED brightness: <b className="font-mono tabular-nums">{Math.round(brightness * 100)}%</b>
              <span className="text-ink-3"> (about {Math.round(brightness * 100)}% of the time on)</span>
            </p>
            <p className="mt-0.5 text-[0.82rem] leading-snug text-ink-2">Above about 100 Hz your eye averages the flicker into brightness (perceived brightness is not linear).</p>
          </div>
        </div>
      )}
      {mode === "led" && flicker && (
        <p className="mt-2 rounded-xl border border-[var(--bad)] bg-surface px-3.5 py-2.5 text-[0.88rem] leading-snug text-ink" aria-live="polite">
          <b className="text-[var(--bad)]">Too slow:</b> at {fmtHz(r.freqHz)} you would see it flicker.
        </p>
      )}

      {mode === "servo" && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-2">
          <ServoDial angle={st.angle} pulseMs={st.highMs} />
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Readout label="Pulse" value={`${st.highMs.toFixed(2)} ms`} accent />
            <Readout label="Angle" value={`${st.angle.toFixed(0)}°`} accent />
          </div>
          {Math.abs(r.freqHz - 50) > 5 && (
            <div className="mt-2">
              <Note>Hobby servos expect a pulse about every 20 ms (50 Hz).</Note>
            </div>
          )}
        </div>
      )}

      {mode === "timer" && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-line bg-surface p-3">
          <Readout label="Overflow every" value={fmtSec(r.periodS)} accent />
          <Readout label="Interrupts per second" value={fmtHz(r.freqHz)} accent />
        </div>
      )}

      <ToyNote>Edge-aligned PWM, counting up (the common &ldquo;PWM mode 1&rdquo;). Servo mapping is typical: 1 ms = 0°, 2 ms = 180°; real servos vary.</ToyNote>
    </div>
  );
}

/** goal: { freqHz, freqTol (relative, 0.005), duty, dutyTol (absolute, 0.002), angle, angleTol (2), tickHz (relative 0.005), minSteps } */
export function checkPwm(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as PwmState | undefined;
  if (!s || typeof s.freqHz !== "number") return false;
  const rel = (got: number, want: number, tol: number) => (want === 0 ? Math.abs(got) <= tol : Math.abs(got - want) / Math.abs(want) <= tol);
  if (typeof goal.freqHz === "number" && !rel(s.freqHz, goal.freqHz, typeof goal.freqTol === "number" ? goal.freqTol : 0.005)) return false;
  if (typeof goal.duty === "number" && Math.abs(s.duty - goal.duty) > (typeof goal.dutyTol === "number" ? goal.dutyTol : 0.002)) return false;
  if (typeof goal.angle === "number" && Math.abs(s.angle - goal.angle) > (typeof goal.angleTol === "number" ? goal.angleTol : 2)) return false;
  if (typeof goal.tickHz === "number" && !rel(s.tickHz, goal.tickHz, 0.005)) return false;
  if (typeof goal.minSteps === "number" && s.arr + 1 < goal.minSteps) return false;
  return true;
}
