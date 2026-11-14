"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { INTERNAL_PULL_OHMS, VDD, bounceEdges, debounce, resolvePin, type Edge, type PinConfig, type PinExternal, type PinMode, type PinOType, type PinPull } from "./sim";
import { Btn, Field, Note, Readout, Seg, Stepper, ToyNote, fmtAmps } from "./ui";

function Lock({ disabled, children }: { disabled?: boolean; children: React.ReactNode }) {
  return (
    <fieldset disabled={disabled} className={`m-0 min-w-0 border-0 p-0 ${disabled ? "opacity-60" : ""}`}>
      {children}
    </fieldset>
  );
}

const f1 = (n: number) => n.toFixed(1);

// ───────────────────────────── emb-gpio ─────────────────────────────

type Wiring = "none" | "gnd" | "vdd";
type GpioKey = "mode" | "otype" | "pull" | "out" | "wiring";
type Level = 0 | 1 | "float" | "conflict";

export interface GpioProps {
  initial?: Partial<{ mode: PinMode; otype: PinOType; pull: PinPull; out: 0 | 1; wiring: Wiring }>;
  hide?: GpioKey[];
  task?: string;
}

export interface GpioState {
  mode: PinMode;
  otype: PinOType;
  pull: PinPull;
  out: 0 | 1;
  wiring: Wiring;
  pressed: boolean;
  level: Level;
  read: 0 | 1 | "?";
  readPressed: 0 | 1 | "?";
  readReleased: 0 | 1 | "?";
  conflictPossible: boolean;
  pullCurrent: number;
}

interface Cfg {
  mode: PinMode;
  otype: PinOType;
  pull: PinPull;
  out: 0 | 1;
  wiring: Wiring;
  pressed: boolean;
}

const extOf = (wiring: Wiring, pressed: boolean): PinExternal => (wiring === "none" ? "none" : `btn-${wiring}-${pressed ? "pressed" : "open"}`);

function gpioState(c: Cfg): GpioState {
  const base: Omit<PinConfig, "external"> = { mode: c.mode, otype: c.otype, pull: c.pull, out: c.out };
  const now = resolvePin({ ...base, external: extOf(c.wiring, c.pressed) });
  const p = resolvePin({ ...base, external: extOf(c.wiring, true) });
  const r = resolvePin({ ...base, external: extOf(c.wiring, false) });
  return { ...c, level: now.level, read: now.read, readPressed: p.read, readReleased: r.read, conflictPossible: p.level === "conflict" || r.level === "conflict", pullCurrent: now.pullCurrent };
}

const levelText = (l: Level) => (l === 0 ? "0 V" : l === 1 ? `${VDD} V` : l === "float" ? "floating" : "SHORT");

export function Gpio({ props, onChange, revealed }: WidgetProps<GpioProps>) {
  const ini = props.initial ?? {};
  const [cfg, setCfg] = useState<Cfg>({ mode: ini.mode ?? "input", otype: ini.otype ?? "push-pull", pull: ini.pull ?? "none", out: ini.out ?? 0, wiring: ini.wiring ?? "none", pressed: false });
  const locked = Boolean(revealed);
  const hide = props.hide ?? [];
  const st = gpioState(cfg);
  const res = resolvePin({ mode: cfg.mode, otype: cfg.otype, pull: cfg.pull, out: cfg.out, external: extOf(cfg.wiring, cfg.pressed) });
  const conflict = st.level === "conflict";

  const update = (patch: Partial<Cfg>) => {
    const next = { ...cfg, ...patch };
    if (next.wiring === "none") next.pressed = false;
    setCfg(next);
    onChange?.(gpioState(next));
  };

  // ── diagram geometry ──
  const isOut = cfg.mode === "output";
  const wireColor = conflict ? "var(--bad)" : st.level === "float" ? "var(--ink-3)" : "var(--brand)";
  const topOn = isOut && cfg.otype === "push-pull" && cfg.out === 1;
  const botOn = isOut && cfg.out === 0;
  const drvOp = isOut ? 1 : 0.35;
  const sw = (y: number, active: boolean, name: string) => (
    <g opacity={drvOp}>
      <rect x={28} y={y} width={24} height={24} rx={3} fill={active ? "var(--brand)" : "var(--surface-2)"} fillOpacity={active ? 0.3 : 1} stroke={active ? (conflict ? "var(--bad)" : "var(--brand)") : "var(--ink-3)"} strokeWidth={2} />
      <text x={58} y={y + 17} fontSize={14} fill="var(--ink-2)">
        {active ? "on" : "off"}
      </text>
      <title>{name}</title>
    </g>
  );
  const nodeY = 105;
  const rightX = 290;
  const pressed = cfg.pressed;

  const aria = `Pin diagram. Mode ${cfg.mode}${isOut ? `, ${cfg.otype}, output ${cfg.out}` : ""}, pull ${cfg.pull}, ${cfg.wiring === "none" ? "nothing wired" : `button to ${cfg.wiring === "gnd" ? "ground" : "3.3 volts"}, ${pressed ? "pressed" : "released"}`}. Pin level ${levelText(st.level)}.`;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-center text-[0.9rem] text-ink-2">{props.task}</p>}
      <Lock disabled={locked}>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {!hide.includes("mode") && (
            <Field label="Mode">
              <Seg
                label="Mode"
                value={cfg.mode}
                onChange={(v) => update({ mode: v })}
                options={[
                  { value: "input", label: "Input" },
                  { value: "output", label: "Output" },
                ]}
              />
            </Field>
          )}
          {!hide.includes("otype") && (
            <Field label="Output type">
              <Lock disabled={!isOut}>
                <Seg
                  label="Output type"
                  value={cfg.otype}
                  onChange={(v) => update({ otype: v })}
                  options={[
                    { value: "push-pull", label: "Push-pull" },
                    { value: "open-drain", label: "Open-drain" },
                  ]}
                />
              </Lock>
            </Field>
          )}
          {!hide.includes("pull") && (
            <Field label="Pull resistor">
              <Seg
                label="Pull resistor"
                value={cfg.pull}
                onChange={(v) => update({ pull: v })}
                options={[
                  { value: "none", label: "None" },
                  { value: "up", label: "Pull-up" },
                  { value: "down", label: "Pull-down" },
                ]}
              />
            </Field>
          )}
          {!hide.includes("out") && (
            <Field label="Output value (ODR)">
              <Lock disabled={!isOut}>
                <Seg
                  label="Output value"
                  value={cfg.out}
                  onChange={(v) => update({ out: v })}
                  options={[
                    { value: 0, label: "0" },
                    { value: 1, label: "1" },
                  ]}
                />
              </Lock>
            </Field>
          )}
          {!hide.includes("wiring") && (
            <Field label="Wired to the pin">
              <Seg
                label="Wiring"
                value={cfg.wiring}
                onChange={(v) => update({ wiring: v })}
                options={[
                  { value: "none", label: "Nothing" },
                  { value: "gnd", label: "Button to GND" },
                  { value: "vdd", label: "Button to 3.3 V" },
                ]}
              />
            </Field>
          )}
        </div>
        {cfg.wiring !== "none" && (
          <div className="mt-2 flex justify-center">
            <Btn on={pressed} onClick={() => update({ pressed: !pressed })}>
              {pressed ? "Release" : "Press button"}
            </Btn>
          </div>
        )}
      </Lock>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 226" className="w-full" role="img" aria-label={aria}>
          <rect x={8} y={6} width={182} height={196} rx={10} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={2} />
          <text x={99} y={220} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
            inside the MCU
          </text>
          {/* rails */}
          <line x1={24} y1={30} x2={110} y2={30} stroke="var(--ink-3)" strokeWidth={2} />
          <text x={114} y={35} fontSize={14} fill="var(--ink-2)">
            3.3 V
          </text>
          <line x1={24} y1={182} x2={110} y2={182} stroke="var(--ink-3)" strokeWidth={2} />
          <text x={114} y={187} fontSize={14} fill="var(--ink-2)">
            GND
          </text>
          {/* output driver */}
          <g opacity={drvOp}>
            <line x1={40} y1={30} x2={40} y2={cfg.otype === "push-pull" ? 40 : 30} stroke="var(--ink-3)" strokeWidth={2} />
            {cfg.otype === "push-pull" && <line x1={40} y1={64} x2={40} y2={nodeY} stroke="var(--ink-3)" strokeWidth={2} />}
            <line x1={40} y1={nodeY} x2={40} y2={146} stroke="var(--ink-3)" strokeWidth={2} />
            <line x1={40} y1={170} x2={40} y2={182} stroke="var(--ink-3)" strokeWidth={2} />
          </g>
          {cfg.otype === "push-pull" && sw(40, topOn, "Output driver, upper switch to 3.3 V")}
          {sw(146, botOn, "Output driver, lower switch to ground")}
          {/* pin wire */}
          <line x1={40} y1={nodeY} x2={190} y2={nodeY} stroke={wireColor} strokeWidth={3} strokeDasharray={st.level === "float" ? "4 4" : undefined} />
          {/* pull resistor */}
          {cfg.pull !== "none" && (
            <g>
              <line x1={96} y1={nodeY} x2={96} y2={cfg.pull === "up" ? 80 : 130} stroke="var(--ink-3)" strokeWidth={2} />
              <rect x={89} y={cfg.pull === "up" ? 58 : 130} width={14} height={22} fill="var(--surface)" stroke={res.pullCurrent > 0 ? "var(--brand)" : "var(--ink-3)"} strokeWidth={2} />
              <line x1={96} y1={cfg.pull === "up" ? 30 : 152} x2={96} y2={cfg.pull === "up" ? 58 : 182} stroke="var(--ink-3)" strokeWidth={2} />
              <text x={108} y={cfg.pull === "up" ? 74 : 148} fontSize={14} fill="var(--ink-2)">
                40 kΩ
              </text>
            </g>
          )}
          {/* input buffer */}
          <line x1={168} y1={nodeY} x2={168} y2={124} stroke="var(--ink-3)" strokeWidth={2} />
          <rect x={150} y={124} width={36} height={26} rx={4} fill="var(--surface)" stroke="var(--ink-3)" strokeWidth={2} />
          <text x={168} y={142} textAnchor="middle" fontSize={14} fill="var(--ink)">
            IDR
          </text>
          {/* pad */}
          <circle cx={190} cy={nodeY} r={6} fill={wireColor} stroke="var(--ink)" strokeWidth={1.5} />
          <text x={200} y={nodeY - 10} fontSize={14} fill="var(--ink-2)">
            pin
          </text>
          {/* outside */}
          {cfg.wiring === "none" ? (
            <text x={200} y={nodeY + 28} fontSize={14} fill="var(--ink-2)">
              nothing wired
            </text>
          ) : (
            <g>
              <line x1={196} y1={nodeY} x2={rightX} y2={nodeY} stroke={wireColor} strokeWidth={3} strokeDasharray={st.level === "float" ? "4 4" : undefined} />
              {cfg.wiring === "gnd" ? (
                <g>
                  <line x1={rightX} y1={nodeY} x2={rightX} y2={128} stroke={wireColor} strokeWidth={2} />
                  <line x1={rightX} y1={128} x2={pressed ? rightX : rightX - 14} y2={150} stroke={pressed ? wireColor : "var(--ink)"} strokeWidth={2.5} />
                  <circle cx={rightX} cy={128} r={3} fill="var(--ink)" />
                  <circle cx={rightX} cy={150} r={3} fill="var(--ink)" />
                  <line x1={rightX} y1={150} x2={rightX} y2={170} stroke={pressed ? wireColor : "var(--ink-3)"} strokeWidth={2} />
                  <line x1={rightX - 12} y1={170} x2={rightX + 12} y2={170} stroke="var(--ink)" strokeWidth={2} />
                  <line x1={rightX - 7} y1={176} x2={rightX + 7} y2={176} stroke="var(--ink)" strokeWidth={2} />
                  <line x1={rightX - 3} y1={182} x2={rightX + 3} y2={182} stroke="var(--ink)" strokeWidth={2} />
                  <text x={rightX + 12} y={146} fontSize={14} fill="var(--ink-2)">
                    {pressed ? "closed" : "open"}
                  </text>
                  <text x={rightX + 18} y={188} fontSize={14} fill="var(--ink-2)">
                    GND
                  </text>
                </g>
              ) : (
                <g>
                  <line x1={rightX} y1={nodeY} x2={rightX} y2={82} stroke={wireColor} strokeWidth={2} />
                  <line x1={rightX} y1={82} x2={pressed ? rightX : rightX - 14} y2={60} stroke={pressed ? wireColor : "var(--ink)"} strokeWidth={2.5} />
                  <circle cx={rightX} cy={82} r={3} fill="var(--ink)" />
                  <circle cx={rightX} cy={60} r={3} fill="var(--ink)" />
                  <line x1={rightX} y1={60} x2={rightX} y2={30} stroke={pressed ? wireColor : "var(--ink-3)"} strokeWidth={2} />
                  <line x1={rightX - 14} y1={30} x2={rightX + 14} y2={30} stroke="var(--ink)" strokeWidth={2} />
                  <text x={rightX + 12} y={76} fontSize={14} fill="var(--ink-2)">
                    {pressed ? "closed" : "open"}
                  </text>
                  <text x={rightX + 18} y={26} fontSize={14} fill="var(--ink-2)">
                    3.3 V
                  </text>
                </g>
              )}
            </g>
          )}
          <text x={rightX + 14} y={nodeY + 4} textAnchor="start" fontSize={14} fill="var(--ink-2)">
            {cfg.wiring === "none" ? "" : "button"}
          </text>
        </svg>
        <p className="px-1 text-center text-[0.78rem] text-ink-2">Pull resistor ≈ {INTERNAL_PULL_OHMS / 1000} kΩ (typical). Highlighted wire = the level on the pin.</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Pin level" value={levelText(st.level)} accent />
        <Readout label="IDR reads" value={st.read === "?" ? "? (random)" : st.read} />
        {st.pullCurrent > 0 && <Readout label="Pull current" value={fmtAmps(st.pullCurrent)} />}
      </div>
      <p className="mt-1.5 text-center text-[0.85rem] text-ink-2">Who sets the level: {res.driver}.</p>
      {cfg.wiring !== "none" && (
        <p className="mt-1 text-center font-mono text-[0.78rem] text-ink-2">
          Released reads {st.readReleased} · pressed reads {st.readPressed}
        </p>
      )}

      {conflict && (
        <div className="mt-2 rounded-xl border-2 border-[var(--bad)] px-3.5 py-2.5 text-[0.88rem] leading-snug text-ink" role="alert">
          Two drivers fight: in a real chip a large current flows and can damage the pin.
        </div>
      )}
      {!conflict && st.conflictPossible && <Note>Careful: when the button changes position, the pin and the button would fight.</Note>}
      <ToyNote>Toy model: ideal switches and a typical 40 kΩ internal pull resistor; real pins also have protection diodes and input thresholds.</ToyNote>
    </div>
  );
}

/** goal: { mode?, otype?, pull?, wiring?, readPressed?, readReleased?, noConflict?, level?, out? } */
export function checkGpio(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as GpioState | undefined;
  if (!s) return false;
  for (const k of ["mode", "otype", "pull", "wiring", "out", "readPressed", "readReleased", "level"] as const) {
    if (k in goal && goal[k] !== undefined && s[k] !== goal[k]) return false;
  }
  if (goal.noConflict === true && s.conflictPossible) return false;
  return true;
}

// ───────────────────────────── emb-debounce ─────────────────────────────

const SAMPLES = [0.5, 1, 2, 5, 10];
const BOUNCES = [1, 3, 5, 8];

export interface DebounceProps {
  bounceMs?: number;
  sampleMs?: number;
  stable?: number;
  seed?: number;
}

export interface DebounceState {
  sampleMs: number;
  stable: number;
  bounceMs: number;
  presses: number;
  rawPresses: number;
  delayMs: number | null;
  seed: number;
}

const PRESS_AT = 10;
const RELEASE_AT = 60;

function runDebounce(sampleMs: number, stable: number, bounceMs: number, seed: number) {
  const raw = bounceEdges(PRESS_AT, RELEASE_AT, bounceMs, seed);
  const d = debounce(raw, sampleMs, stable, 100);
  return { raw, d, state: { sampleMs, stable, bounceMs, presses: d.presses, rawPresses: d.rawPresses, delayMs: d.delayMs, seed } satisfies DebounceState };
}

/** A step path of `edges` between t0 and t1 ms, mapped to x0..x0+w; high level at yHi, low at yLo. */
function stepPath(edges: Edge[], t0: number, t1: number, x0: number, w: number, yHi: number, yLo: number): string {
  const xOf = (t: number) => x0 + ((t - t0) / (t1 - t0)) * w;
  const yOf = (l: 0 | 1) => (l === 1 ? yHi : yLo);
  let lv: 0 | 1 = edges[0]?.level ?? 1;
  for (const e of edges) if (e.t <= t0) lv = e.level;
  let d = `M${f1(x0)} ${f1(yOf(lv))}`;
  for (const e of edges) {
    if (e.t <= t0 || e.t >= t1) continue;
    d += `L${f1(xOf(e.t))} ${f1(yOf(lv))}L${f1(xOf(e.t))} ${f1(yOf(e.level))}`;
    lv = e.level;
  }
  return d + `L${f1(x0 + w)} ${f1(yOf(lv))}`;
}

export function Debounce({ props, onChange, revealed }: WidgetProps<DebounceProps>) {
  const [sampleMs, setSampleMs] = useState(SAMPLES.includes(props.sampleMs ?? 1) ? (props.sampleMs ?? 1) : 1);
  const [stable, setStable] = useState(Math.min(10, Math.max(1, Math.round(props.stable ?? 1))));
  const [bounceMs, setBounceMs] = useState(props.bounceMs ?? 5);
  const [seed, setSeed] = useState(props.seed ?? 7);
  const [zoom, setZoom] = useState<"whole" | "zoom">("whole");
  const locked = Boolean(revealed);

  const { raw, d, state } = runDebounce(sampleMs, stable, bounceMs, seed);
  const report = (s: number, n: number, b: number, sd: number) => onChange?.(runDebounce(s, n, b, sd).state);

  const t0 = zoom === "zoom" ? 8 : 0;
  const t1 = zoom === "zoom" ? 20 : 100;
  const X0 = 14;
  const W = 332;
  const xOf = (t: number) => X0 + ((t - t0) / (t1 - t0)) * W;
  const skip = sampleMs < 1 ? 2 : 1;
  const ticks = d.samples.filter((s, i) => i % skip === 0 && s.t >= t0 && s.t <= t1);
  const axis = zoom === "zoom" ? [8, 11, 14, 17, 20] : [0, 25, 50, 75, 100];
  const events = [
    { t: PRESS_AT, label: "pressed" },
    { t: RELEASE_AT, label: "released" },
  ].filter((e) => e.t >= t0 && e.t <= t1);

  const bounceOptions = BOUNCES.includes(bounceMs) ? BOUNCES : [...BOUNCES, bounceMs].sort((a, b) => a - b);

  return (
    <div className="w-full">
      <Lock disabled={locked}>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Field label="Read the pin every">
            <Seg
              label="Read the pin every"
              value={sampleMs}
              onChange={(v) => {
                setSampleMs(v);
                report(v, stable, bounceMs, seed);
              }}
              options={SAMPLES.map((v) => ({ value: v, label: `${v} ms` }))}
            />
          </Field>
          <Field label="Agree N reads in a row">
            <Stepper
              label="Agreeing reads"
              value={stable}
              min={1}
              max={10}
              onChange={(v) => {
                setStable(v);
                report(sampleMs, v, bounceMs, seed);
              }}
            />
          </Field>
          <Field label="Bounce lasts up to">
            <Seg
              label="Bounce lasts up to"
              value={bounceMs}
              onChange={(v) => {
                setBounceMs(v);
                report(sampleMs, stable, v, seed);
              }}
              options={bounceOptions.map((v) => ({ value: v, label: `${v} ms` }))}
            />
          </Field>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Btn
            onClick={() => {
              setSeed(seed + 1);
              report(sampleMs, stable, bounceMs, seed + 1);
            }}
          >
            Another press
          </Btn>
        </div>
      </Lock>
      <div className="mt-2 flex justify-center">
        <Seg
          label="View"
          value={zoom}
          onChange={setZoom}
          options={[
            { value: "whole", label: "Whole press" },
            { value: "zoom", label: "Zoom on the press (8–20 ms)" },
          ]}
        />
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 182" className="w-full" role="img" aria-label={`Button pin over ${t0} to ${t1} milliseconds. The raw pin has ${state.rawPresses} falling edges; the debounced signal has ${state.presses} press${state.presses === 1 ? "" : "es"}${state.delayMs === null ? "" : `, accepted ${state.delayMs} milliseconds after the first edge`}.`}>
          {events.map((e) => (
            <g key={e.label}>
              <line x1={xOf(e.t)} y1={22} x2={xOf(e.t)} y2={150} stroke="var(--line-strong)" strokeDasharray="3 3" />
              <text x={Math.min(Math.max(xOf(e.t), 34), 326)} y={16} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
                {e.label}
              </text>
            </g>
          ))}
          <text x={X0} y={40} fontSize={14} fill="var(--ink-2)">
            Pin (raw), pressed = low
          </text>
          <path d={stepPath(raw, t0, t1, X0, W, 48, 72)} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
          {ticks.map((s) => (
            <line key={s.t} x1={xOf(s.t)} y1={78} x2={xOf(s.t)} y2={85} stroke="var(--ink-3)" strokeWidth={1} />
          ))}
          <text x={X0} y={108} fontSize={14} fill="var(--ink-2)">
            Debounced
          </text>
          <path d={stepPath(d.edges, t0, t1, X0, W, 116, 140)} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />
          <line x1={X0} y1={150} x2={X0 + W} y2={150} stroke="var(--ink-3)" />
          {axis.map((t, i) => (
            <g key={t}>
              <line x1={xOf(t)} y1={150} x2={xOf(t)} y2={155} stroke="var(--ink-3)" />
              <text x={xOf(t)} y={172} textAnchor={i === 0 ? "start" : i === axis.length - 1 ? "end" : "middle"} fontSize={14} fill="var(--ink-2)">
                {i === axis.length - 1 ? `${t} ms` : t}
              </text>
            </g>
          ))}
        </svg>
        <p className="px-1 text-center text-[0.78rem] text-ink-2">Small ticks under the raw trace = the moments the code reads the pin{skip > 1 ? " (every 2nd one drawn)" : ""}.</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Naive code sees" value={`${state.rawPresses} press${state.rawPresses === 1 ? "" : "es"}`} />
        <Readout label="Debounced code sees" value={`${state.presses} press${state.presses === 1 ? "" : "es"}`} accent />
        <Readout label="Delay" value={state.delayMs === null ? "never" : `${state.delayMs} ms`} />
      </div>
      <div className="mt-2">
        <Note>
          {state.presses > 1
            ? "Too few agreeing reads: some bounces get through and look like extra presses."
            : state.presses === 0
              ? "The press was never accepted: the reads that agree take longer than the button stays down. Read faster or ask for fewer."
              : state.delayMs !== null && state.delayMs > 20
                ? "One clean press, but a long delay: you wait for many reads. Read faster or ask for fewer agreeing reads."
                : "One clean press. Agreeing reads must cover the bounce, but every extra read adds delay."}
        </Note>
      </div>
      <ToyNote>Toy bounce: real contacts bounce for roughly 1 to 10 ms, depending on the switch.</ToyNote>
    </div>
  );
}

/** goal: { presses?, maxDelayMs?, minBounceMs? } */
export function checkDebounce(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as DebounceState | undefined;
  if (!s) return false;
  if (typeof goal.presses === "number" && s.presses !== goal.presses) return false;
  if (typeof goal.maxDelayMs === "number" && (s.delayMs === null || s.delayMs > goal.maxDelayMs)) return false;
  if (typeof goal.minBounceMs === "number" && s.bounceMs < goal.minBounceMs) return false;
  return true;
}
