"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { i2cAddrByte, minOf, sagTrace } from "./logic";
import { Btn, Caption, Note, Readout, Seg, Toy } from "./ui";

export interface DetectiveProps {
  /** Case ids to offer, in order. Default: all four. */
  cases?: string[];
}

export interface DetectiveState {
  caseId: string;
  solved: string[];
  toolsUsed: number;
  /** tools used on the current case */
  tools: ToolId[];
}

type ToolId = "meter" | "scope" | "la" | "dbg" | "log";
const TOOLS: { id: ToolId; label: string }[] = [
  { id: "meter", label: "Multimeter" },
  { id: "scope", label: "Oscilloscope" },
  { id: "la", label: "Logic analyser" },
  { id: "dbg", label: "Debugger (SWD)" },
  { id: "log", label: "Log output" },
];

interface Cause {
  text: string;
  feedback: string;
}
interface Case {
  id: string;
  tab: string;
  symptom: string;
  evidence: Record<ToolId, string>;
  /** tools that tell you the most for this case */
  best: ToolId[];
  causes: Cause[];
  answer: number;
  fix: string;
}

const CASES: Case[] = [
  {
    id: "cold-reset",
    tab: "1 Cold resets",
    symptom: "In the fridge test, Sprout resets every time it starts to send. At room temperature it is fine.",
    evidence: {
      meter: "DC volts on VCC: 2.58 V, looks steady and healthy. A meter averages, so a 3 ms dip is invisible to it.",
      scope: "Single-shot capture, triggered on a falling VCC: at the start of each radio burst the rail dips for about 3 ms, below the chip's brown-out threshold (shown as a dashed line; 1.8 V is a typical example).",
      la: "Only the digital pins are visible. The UART log pin shows the boot banner appearing again right after each radio start. That tells you WHEN it resets, not WHY.",
      dbg: "Reset-cause register: BROWN-OUT. The chip itself reports that its supply dipped below the threshold.",
      log: "Last line before each reboot: 'ble: tx start'. First line after: 'boot: reason=BOR'. So it dies just as the radio fires.",
    },
    best: ["scope", "dbg"],
    causes: [
      { text: "A stack overflow in the Bluetooth code", feedback: "A stack overflow shows up as a fault or watchdog reset. The reset-cause flag here says brown-out, which is about the supply." },
      { text: "The cold coin cell cannot supply the radio burst, so the rail sags below brown-out; there is no bulk capacitor to cover it", feedback: "" },
      { text: "A loose sensor wire", feedback: "A loose sensor wire would give bad readings, not a reset that lines up exactly with the radio burst." },
      { text: "The crystal stops oscillating in the cold", feedback: "A clock fault gives a different reset cause. The reset flag and the rail dip both point at the supply." },
    ],
    answer: 1,
    fix: "A coin cell's internal resistance rises when cold and old, so a 10 mA burst drops the rail (V = V_open − I × R_int). Fix: a bulk capacitor near the radio, which supplies the burst while the cell recharges it slowly. Try the sizes below. This was the main change in hardware Rev B.",
  },
  {
    id: "silent-sensor",
    tab: "2 Silent sensor",
    symptom: "The light sensor returns an error every time. The moisture sensor on the same I²C bus works fine.",
    evidence: {
      meter: "Light sensor VDD: 3.31 V. SDA and SCL both rest at 3.3 V, so the pull-up resistors are there and the sensor has power.",
      scope: "SDA and SCL edges look clean, with sensible rise times. Nothing wrong at the analog level.",
      la: "Decoded: START, address byte 0x88 (address 0x44, write), NACK, STOP, repeated. A scan of 0x08 to 0x77 gets an ACK at 0x40 (moisture sensor) and at 0x45 only.",
      dbg: "Stopped in the driver: the I²C read returns error −121 (no acknowledge) for address 0x44.",
      log: "light: i2c err -121 (NACK), retrying. It says the sensor did not answer, not why.",
    },
    best: ["la"],
    causes: [
      { text: "The pull-up resistors are missing", feedback: "The meter showed SDA and SCL resting high, and the moisture sensor works on the same two wires, so the pull-ups are fine." },
      { text: "The light sensor has no power", feedback: "The meter read 3.31 V on its supply pin, and a powerless chip would not acknowledge at 0x45 either." },
      { text: "The sensor's address pin is strapped so it answers at 0x45, but the firmware asks for 0x44", feedback: "" },
      { text: "The I²C clock is too fast", feedback: "Too fast a clock corrupts bits. This is a clean NACK on the address byte, and the scan finds the part." },
    ],
    answer: 2,
    fix: "Many I²C sensors pick their address from a pin tied to ground, VDD, SDA or SCL. Here it is tied high, so the part sits at 0x45. Change the firmware constant (or the strap) and note the choice on the schematic.",
  },
  {
    id: "flash-fast",
    tab: "3 Flash errors",
    symptom: "Settings saved in the SPI flash are corrupted when the clock runs at 16 MHz. At 1 MHz everything is fine.",
    evidence: {
      meter: "A steady ~1.6 V on the clock pin (just the average of a fast square wave) and 3.3 V on the flash supply. A meter cannot show fast signals.",
      scope: "Clock line at the flash pin. Look at the edges, and try both bandwidth settings: they show very different pictures.",
      la: "Sampled at 100 MS/s, the clock looks like a clean square wave and the data decodes correctly. A logic analyser only reports high or low at each sample, so ringing between samples is invisible.",
      dbg: "The driver reports CRC errors on about 1 in 50 reads at 16 MHz and none at 1 MHz.",
      log: "flash: crc fail, retry ok (x3). It tells you it is intermittent and speed-related, nothing more.",
    },
    best: ["scope"],
    causes: [
      { text: "The flash chip is defective", feedback: "A defective chip would not become healthy just because the clock is slower." },
      { text: "The oscilloscope's ground lead is creating the ringing", feedback: "Always worth ruling out. Here the ringing stays when re-measured with a short ground spring, so it is on the board." },
      { text: "A bug in the SPI driver code", feedback: "The same code works perfectly at 1 MHz. Only the speed changed, which points at the electrical side." },
      { text: "Ringing on the clock line makes the flash see extra edges: a fast edge on a long trace with no damping resistor", feedback: "" },
    ],
    answer: 3,
    fix: "A fast edge on an unterminated trace rings. If the ring dips back below the input's threshold the flash counts a false clock edge. Fix: a series resistor (often tens of ohms) next to the driver, a shorter trace, or a slower edge. Rule of thumb: pick a scope with bandwidth of about 3 to 5 times the highest frequency you care about, and a fast edge has content far above its clock rate.",
  },
  {
    id: "random-reboot",
    tab: "4 Random reboots",
    symptom: "Every few hours Sprout reboots. There is no pattern, and the battery voltage looks fine.",
    evidence: {
      meter: "VCC reads 3.0 V, steady. Looks fine, but a meter would miss a brief dip anyway.",
      scope: "Triggered on a falling VCC for six hours: no dips at all. The supply is not the problem.",
      la: "The UART log line is visible, so you can read the same text as the log tool, but you must be capturing at the right moment. Not the first tool to reach for.",
      dbg: "Reset-cause register: WATCHDOG. Halting just before a reset shows the firmware stuck inside ble_send(), in its retry loop.",
      log: "wdt: not fed for 8.0 s; last task: ble_send, attempt 4172. The phone was away and the code kept retrying.",
    },
    best: ["log", "dbg"],
    causes: [
      { text: "Brown-out resets from the battery", feedback: "The reset flag says watchdog and the scope saw no dips in six hours. That rules the supply out." },
      { text: "EMC noise glitches the chip", feedback: "Noise rarely lines up with one function stuck in a loop, and the log names the exact function." },
      { text: "Flash memory wearing out", feedback: "Flash wear gives write errors over a long life, not a watchdog reset with a retry count of 4172." },
      { text: "The firmware retries sending forever when the phone is away, so the main loop never feeds the watchdog", feedback: "" },
    ],
    answer: 3,
    fix: "A watchdog is a timer that resets the chip if the firmware stops proving it is alive. Here it did its job: it caught an unbounded retry loop. The fix is in the firmware lesson: a retry limit with back-off, and a log of the reset reason.",
  },
];

// ───────────── drawings ─────────────

const PW = 360;
const PH = 168;
const L = 44;
const R = 352;
const T = 10;
const B = 128;

function ScopePlot({
  t,
  v,
  tMax,
  vMin,
  vMax,
  xLabel,
  hline,
  yTicks,
  aria,
}: {
  t: number[];
  v: number[];
  tMax: number;
  vMin: number;
  vMax: number;
  xLabel: string;
  hline?: { y: number; label: string };
  yTicks: number[];
  aria: string;
}) {
  const sx = (x: number) => L + (x / tMax) * (R - L);
  const sy = (y: number) => B - ((y - vMin) / (vMax - vMin)) * (B - T);
  const d = t.map((x, i) => `${i ? "L" : "M"}${sx(x).toFixed(1)} ${sy(Math.max(vMin, Math.min(vMax, v[i]))).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={aria}>
      {yTicks.map((y) => (
        <g key={y}>
          <line x1={L} x2={R} y1={sy(y)} y2={sy(y)} stroke="var(--line-strong)" strokeWidth={0.7} />
          <text x={L - 4} y={sy(y) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
            {y}
          </text>
        </g>
      ))}
      {hline && (
        <g>
          <line x1={L} x2={R} y1={sy(hline.y)} y2={sy(hline.y)} stroke="var(--bad)" strokeWidth={1.5} strokeDasharray="5 4" />
          <text x={R} y={sy(hline.y) - 4} textAnchor="end" fontSize={14} fill="var(--bad)">
            {hline.label}
          </text>
        </g>
      )}
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
      <text x={(L + R) / 2} y={B + 28} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
        {xLabel}
      </text>
    </svg>
  );
}

/** Digital capture of the first byte of an I²C transaction that gets no acknowledge. */
function LaPlot({ byte }: { byte: number }) {
  const bit = 28;
  const x0 = 44;
  const scl: [number, number][] = [];
  const sda: [number, number][] = [];
  const hi = 20;
  const lo = 44;
  const hi2 = 82;
  const lo2 = 106;
  // start: SDA falls while SCL high
  let x = x0;
  scl.push([x, hi], [x + bit * 0.5, hi]);
  sda.push([x, hi2], [x + bit * 0.25, hi2], [x + bit * 0.25, lo2], [x + bit * 0.5, lo2]);
  x += bit * 0.5;
  const bits = [...Array(8)].map((_, i) => (byte >> (7 - i)) & 1);
  const all = [...bits, 1]; // ninth slot: NACK = SDA stays high
  for (const b of all) {
    scl.push([x, lo], [x + bit * 0.25, lo], [x + bit * 0.25, hi], [x + bit * 0.75, hi], [x + bit * 0.75, lo], [x + bit, lo]);
    const y = b ? hi2 : lo2;
    sda.push([x, y], [x + bit, y]);
    x += bit;
  }
  const path = (p: [number, number][]) => p.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)} ${b}`).join(" ");
  return (
    <svg viewBox={`0 0 ${PW} 150`} className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Logic analyser capture: the clock and data lines for address byte 0x${byte.toString(16)} followed by a high ninth bit, meaning no acknowledge.`}>
      <text x={4} y={38} fontSize={14} fill="var(--ink-3)">SCL</text>
      <text x={4} y={100} fontSize={14} fill="var(--ink-3)">SDA</text>
      <path d={path(scl)} fill="none" stroke="var(--ink-2)" strokeWidth={2} />
      <path d={path(sda)} fill="none" stroke="var(--brand)" strokeWidth={2} />
      {all.map((b, i) => (
        <text key={i} x={x0 + bit * 0.5 + bit * i + bit / 2} y={72} textAnchor="middle" fontSize={14} fill={i === 8 ? "var(--bad)" : "var(--ink)"}>
          {i === 8 ? "N" : b}
        </text>
      ))}
      <text x={x0 + bit * 0.5 + bit * 4} y={140} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
        {`0x${(byte >> 1).toString(16)} write, then NACK (N)`}
      </text>
    </svg>
  );
}

/** Ringing on a 16 MHz clock edge, seen through a first-order filter that stands in for the scope's bandwidth. */
function ringTrace(fcHz: number) {
  const tEnd = 130e-9;
  const n = 650;
  const dt = tEnd / n;
  const period = 1 / 16e6;
  const tau = 1 / (2 * Math.PI * fcHz);
  const raw = (t: number) => {
    let level = 0;
    let ring = 0;
    const half = period / 2;
    const first = 10e-9;
    const k = Math.floor((t - first) / half);
    if (t >= first) {
      level = k % 2 === 0 ? 3.3 : 0;
      const te = first + k * half;
      const dtt = t - te;
      const edge = Math.min(1, dtt / 2e-9);
      const rising = k % 2 === 0;
      // previous level so the edge is a ramp, not a jump
      const prev = rising ? 0 : 3.3;
      level = prev + (level - prev) * edge;
      ring = (rising ? 1 : -1) * 2.3 * Math.sin(2 * Math.PI * 150e6 * dtt) * Math.exp(-dtt / 12e-9);
    }
    return level + ring;
  };
  const ts: number[] = [];
  const vs: number[] = [];
  let y = 0;
  for (let i = 0; i <= n; i++) {
    const t = i * dt;
    const x = raw(t);
    y = y + (dt / (tau + dt)) * (x - y);
    ts.push(t * 1e9);
    vs.push(y);
  }
  return { ts, vs };
}

// ───────────── widget ─────────────

const CAPS = [
  { value: 0, label: "No capacitor" },
  { value: 10, label: "10 µF" },
  { value: 220, label: "220 µF" },
];

/** Debugging detective: a symptom, five tools that each show different evidence, and a root cause to pick. */
export function Detective({ props, onChange }: WidgetProps<DetectiveProps>) {
  const ids = props.cases ?? CASES.map((c) => c.id);
  const list = CASES.filter((c) => ids.includes(c.id));
  const [ci, setCi] = useState(0);
  const [used, setUsed] = useState<Record<string, ToolId[]>>({});
  const [tool, setTool] = useState<ToolId | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [solved, setSolved] = useState<string[]>([]);
  const [capUf, setCapUf] = useState(0);
  const [bw, setBw] = useState<"20" | "500">("20");

  const c = list[ci];
  const isSolved = solved.includes(c.id);
  const toolsHere = used[c.id] ?? [];
  const totalUsed = Object.values(used).reduce((a, b) => a + b.length, 0);

  const emit = (sv: string[], u: Record<string, ToolId[]>, cid: string) =>
    onChange?.({ caseId: cid, solved: sv, toolsUsed: Object.values(u).reduce((a, b) => a + b.length, 0), tools: u[cid] ?? [] } satisfies DetectiveState);

  const selectCase = (i: number) => {
    setCi(i);
    setTool(null);
    setPick(null);
    setMsg("");
    emit(solved, used, list[i].id);
  };
  const pickTool = (t: ToolId) => {
    setTool(t);
    const have = used[c.id] ?? [];
    if (!have.includes(t)) {
      const u = { ...used, [c.id]: [...have, t] };
      setUsed(u);
      emit(solved, u, c.id);
    }
  };
  const submit = () => {
    if (pick === null) return;
    if (pick === c.answer) {
      const sv = solved.includes(c.id) ? solved : [...solved, c.id];
      setSolved(sv);
      setMsg("Root cause found.");
      emit(sv, used, c.id);
    } else {
      setMsg(c.causes[pick].feedback);
    }
  };

  // evidence drawing
  let trace: React.ReactNode = null;
  if (tool === "scope" && c.id === "cold-reset") {
    const m = { vOpen: 2.7, rInt: 100, iBurst: 0.01, burstS: 0.003, capF: capUf * 1e-6 };
    const tr = sagTrace(m, 0.03, 600);
    const lowest = minOf(tr.v);
    trace = (
      <>
        <ScopePlot t={tr.t.map((x) => x * 1000)} v={tr.v} tMax={30} vMin={1.4} vMax={3} xLabel="time (ms)" hline={{ y: 1.8, label: "brown-out 1.8 V" }} yTicks={[2, 2.5, 3]} aria={`Scope trace of the supply rail: lowest value ${lowest.toFixed(2)} volts during the radio burst.`} />
        <p className="mt-1.5 text-xs text-ink-2">
          Lowest point: <strong className="text-ink">{lowest.toFixed(2)} V</strong> {lowest < 1.8 ? "(below the threshold: reset)" : "(above the threshold: no reset)"}. Cold cell example: 2.7 V open circuit, 100 Ω internal resistance, 10 mA burst for 3 ms.
        </p>
        {isSolved && (
          <div className="mt-2">
            <Caption>Try a fix: bulk capacitor on the rail</Caption>
            <Seg label="Bulk capacitor" value={capUf} onChange={setCapUf} options={CAPS} className="mt-1" />
          </div>
        )}
      </>
    );
  } else if (tool === "scope" && c.id === "flash-fast") {
    const tr = ringTrace(bw === "20" ? 20e6 : 500e6);
    const win = tr.vs.filter((_, i) => tr.ts[i] >= 14 && tr.ts[i] <= 30);
    const dips = win.length > 0 && minOf(win) < 2.0;
    trace = (
      <>
        <div className="mb-2">
          <Seg label="Scope bandwidth" value={bw} onChange={setBw} options={[{ value: "20", label: "20 MHz limit" }, { value: "500", label: "500 MHz full" }]} />
        </div>
        <ScopePlot t={tr.ts} v={tr.vs} tMax={130} vMin={-1.6} vMax={5.2} xLabel="time (ns)" hline={{ y: 2.0, label: "input high 2.0 V" }} yTicks={[0, 2, 4]} aria={`Scope trace of the clock line at ${bw} MHz bandwidth.`} />
        <p className="mt-1.5 text-xs text-ink-2">
          {bw === "20"
            ? "With the 20 MHz limit the edges are rounded and the ringing is gone: the scope is too slow to see the problem. A 16 MHz clock with fast edges needs far more bandwidth."
            : `Full bandwidth shows overshoot and ringing after every edge${dips ? ", and after the rising edge the signal dips back under the 2.0 V input-high level: the flash can count a false clock." : "."}`}
        </p>
      </>
    );
  } else if (tool === "la" && c.id === "silent-sensor") {
    trace = <LaPlot byte={i2cAddrByte(0x44, false)} />;
  }

  return (
    <div className="w-full" data-widget>
      <Seg label="Case" value={ci} onChange={selectCase} options={list.map((x, i) => ({ value: i, label: `${x.tab}${solved.includes(x.id) ? " ✓" : ""}` }))} />
      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-[0.9rem] leading-snug text-ink">
        <Caption>Symptom</Caption>
        <p className="mt-1">{c.symptom}</p>
      </div>

      <div className="mt-3">
        <Caption>Pick a tool</Caption>
        <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Debugging tools">
          {TOOLS.map((t) => (
            <Btn key={t.id} onClick={() => pickTool(t.id)} on={tool === t.id} className="!px-3 text-xs">
              {t.label}
            </Btn>
          ))}
        </div>
      </div>

      {tool && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <p className="text-[0.88rem] leading-snug text-ink-2">
            <strong className="text-ink">{TOOLS.find((t) => t.id === tool)!.label}:</strong> {c.evidence[tool]}
          </p>
          {trace}
        </div>
      )}

      <div className="mt-4">
        <Caption>What is the root cause?</Caption>
        <div role="radiogroup" aria-label="Root cause" className="mt-1 grid gap-1.5">
          {c.causes.map((cause, i) => (
            <button
              key={cause.text}
              type="button"
              role="radio"
              aria-checked={pick === i}
              onClick={() => {
                setPick(i);
                setMsg("");
              }}
              className={`min-h-10 rounded-xl border px-3 py-2 text-left text-[0.86rem] leading-snug transition-colors ${pick === i ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-2 hover:bg-surface-2"}`}
            >
              {cause.text}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Btn primary onClick={submit} disabled={pick === null}>
            Submit
          </Btn>
          <Readout label="Tools used here" value={toolsHere.length} />
          <Readout label="Total" value={totalUsed} />
        </div>
        {msg && (
          <p className={`mt-2 text-[0.86rem] ${isSolved ? "text-[var(--good)]" : "text-[var(--bad)]"}`} aria-live="polite">
            {msg}
          </p>
        )}
      </div>

      {isSolved && (
        <div className="mt-3">
          <Note tone="accent">
            {c.fix} Most useful here: {c.best.map((b) => TOOLS.find((t) => t.id === b)!.label).join(" or ")}. You used {toolsHere.length} {toolsHere.length === 1 ? "tool" : "tools"}.
          </Note>
        </div>
      )}
      <Toy>Toy evidence for made-up faults, with example numbers. Real debugging is messier: you form a guess, pick the cheapest measurement that could prove it wrong, and repeat.</Toy>
    </div>
  );
}

/** goal: { solved: [case ids] } or { minSolved }. */
export function checkDetective(state: unknown, goal: Record<string, unknown>) {
  const s = state as DetectiveState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.solved)) for (const id of goal.solved) if (!s.solved.includes(id as string)) return false;
  if (typeof goal.minSolved === "number" && s.solved.length < goal.minSolved) return false;
  return true;
}
