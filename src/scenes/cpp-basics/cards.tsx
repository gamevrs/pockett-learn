"use client";

import React from "react";
import { C, clamp, fmtNum, hasValues, type Reactor } from "./data";
import { Empty, Lamp, Meter, Tile, dash } from "./ui";

/**
 * The small instrument cards of the board (lessons 3 to 16). Each one draws only what the learner's
 * program sent, tolerates missing or odd values, and never throws. Lime is reserved for values the
 * learner's code produced; amber is caution, red is failure, everything else is neutral grey.
 */

const show = (v: number | undefined, f: (n: number) => string = (n) => fmtNum(n)) => (v === undefined ? dash : f(v));
const kw = (n: number) => `${n.toLocaleString("en-US")}`;

// ───────────────────────── lesson 3: power balance ─────────────────────────

function PowerBar({ label, value, max, color }: { label: string; value: number | undefined; max: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="hud-label">{label}</span>
        <span className="hud-value text-[11px]">{value === undefined ? dash : `${kw(value)} kW`}</span>
      </div>
      <Meter value={value} max={max} color={color} />
    </div>
  );
}

function EfficiencyRing({ pct }: { pct: number | undefined }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const v = pct === undefined ? 0 : clamp(pct, 0, 100);
  return (
    <svg viewBox="0 0 60 60" className="h-[60px] w-[60px] shrink-0" role="img" aria-label={pct === undefined ? "Efficiency unknown" : `Efficiency ${fmtNum(pct, 1)} percent`}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
      <circle cx="30" cy="30" r={r} fill="none" stroke={C.lime} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 30 30)" />
      <text x="30" y="34" textAnchor="middle" fontSize="12" fontWeight="600" fill={pct === undefined ? "rgba(255,255,255,0.3)" : "#e0f6c1"} fontFamily="var(--font-mono)">
        {pct === undefined ? dash : `${fmtNum(pct, 1)}%`}
      </text>
    </svg>
  );
}

export function Power({ d }: { d: Reactor["power"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send trays, efficiency, netKw and the other results.</Empty>;
  const top = Math.max(d.thermalKw ?? 0, d.electricKw ?? 0, d.netKw ?? 0, 1);
  const cap = d.trayCapacity !== undefined ? clamp(Math.round(d.trayCapacity), 1, 16) : undefined;
  const trays = cap !== undefined && d.pellets !== undefined ? clamp(d.trays ?? Math.ceil(d.pellets / cap), 0, 8) : 0;
  const pellets = d.pellets ?? 0;
  return (
    <div>
      <div className="flex items-center gap-3">
        <EfficiencyRing pct={d.efficiency} />
        <div className="min-w-0 flex-1 space-y-2">
          <PowerBar label="Thermal" value={d.thermalKw} max={top} color={C.heat} />
          <PowerBar label="Electric" value={d.electricKw} max={top} color={C.lime} />
          <PowerBar label="Net" value={d.netKw} max={top} color={C.limeSoft} />
        </div>
      </div>
      {trays > 0 && cap !== undefined && (
        <div className="mt-3">
          <p className="hud-label mb-1.5">
            Fuel pellets · {fmtNum(pellets)} in {trays} tray{trays === 1 ? "" : "s"}
            {d.emptySlots !== undefined ? ` · ${fmtNum(d.emptySlots)} empty` : ""}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {Array.from({ length: trays }, (_, t) => (
              <div key={t} className="flex flex-wrap gap-[3px] rounded-md border border-white/[0.08] p-1">
                {Array.from({ length: cap }, (_, s) => {
                  const filled = t * cap + s < pellets;
                  return <span key={s} className={`h-[7px] w-[7px] rounded-full ${filled ? "bg-[#c5ee8a]" : "border border-dashed border-white/25"}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        <Tile label="Refills" value={show(d.refills)} />
        <Tile label="Deviation" value={show(d.deviation)} unit="C" />
        <Tile label="Flux gain" value={show(d.fluxGain)} unit="x" />
      </dl>
      {(d.wrapped !== undefined || d.energyJ !== undefined) && (
        <div className="mt-2 rounded-md border border-white/[0.08] px-2.5 py-1.5">
          <p className="hud-label mb-1">Number traps</p>
          <div className="space-y-0.5 font-mono text-[11px]">
            <p className="flex min-w-0 justify-between gap-2">
              <span className="text-white/45">wrapped counter</span>
              <span className="hud-warning min-w-0 truncate tabular-nums">{show(d.wrapped)}</span>
            </p>
            <p className="flex min-w-0 justify-between gap-2">
              <span className="text-white/45">long long energy</span>
              <span className="hud-accent min-w-0 truncate tabular-nums">{show(d.energyJ, (n) => `${n.toLocaleString("en-US")} J`)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 4: operator desk ─────────────────────────

export function Operator({ d }: { d: Reactor["operator"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Read the operator details and send operatorName, clearance and setpoint.</Empty>;
  const initial = (d.initial?.trim() || d.name?.trim().charAt(0) || "?").charAt(0).toUpperCase();
  const level = d.clearance === undefined ? undefined : clamp(Math.round(d.clearance), 0, 5);
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#c5ee8a]/30 bg-[#c5ee8a]/10">
          <span className="hud-value hud-accent text-[20px]">{initial}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="hud-value hud-accent truncate text-[14px]" title={d.name}>
            {d.name?.trim() ? d.name : "Unnamed"}
          </p>
          <p className="hud-muted truncate text-[10.5px]">{d.shift ? d.shift : "shift unknown"}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="hud-label">Clearance</span>
        <span className="flex items-center gap-1" role="img" aria-label={level === undefined ? "Clearance unknown" : `Clearance level ${level} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`h-2 w-4 rounded-sm ${level !== undefined && i <= level ? "bg-[#c5ee8a]" : "bg-white/12"}`} />
          ))}
          <span className="hud-value ml-1 text-[11px]">{d.clearance === undefined ? dash : fmtNum(d.clearance)}</span>
        </span>
      </div>
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Tile label="Setpoint" value={show(d.setpoint, (n) => fmtNum(n, 1))} unit="C" tone="accent" />
        <Tile label="Name length" value={show(d.nameLength)} />
      </dl>
      {d.welcome && <p className="hud-log mt-2.5 truncate rounded-md bg-black/40 px-2 py-1.5 text-[11px]" title={d.welcome}>{d.welcome}</p>}
    </div>
  );
}

// ───────────────────────── lesson 5: interlocks ─────────────────────────

const LEVELS = ["NORMAL", "WARNING", "CRITICAL"] as const;

function LampRow({ label, on, bad = false, note }: { label: string; on: boolean | undefined; bad?: boolean; note?: string }) {
  return (
    <li className="flex min-w-0 items-center gap-2 text-[11px]">
      <Lamp on={on} bad={bad} size={9} />
      <span className="min-w-0 flex-1 truncate text-white/80">{label}</span>
      <span className={`hud-value shrink-0 text-[10px] ${on === undefined ? "text-white/30" : on ? (bad ? "hud-danger" : "hud-accent") : "text-white/45"}`}>{on === undefined ? dash : note ?? (on ? "YES" : "NO")}</span>
    </li>
  );
}

export function Interlocks({ d }: { d: Reactor["interlocks"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send alarmLevel, coolantOk, canStart, modeName and scramNeeded.</Empty>;
  const max = d.maxTemp !== undefined && d.maxTemp > 0 ? d.maxTemp : 650;
  const scale = max * 1.25;
  const level = d.alarmLevel;
  const tone = (l: string) => (l === "CRITICAL" ? "border-[#f87171]/60 bg-[#f87171]/15 text-[#fecaca]" : l === "WARNING" ? "border-[#fbbf24]/60 bg-[#fbbf24]/15 text-[#fde68a]" : "border-[#c5ee8a]/60 bg-[#c5ee8a]/15 text-[#e0f6c1]");
  const probeColor = d.probeTemp === undefined ? C.lime : d.probeTemp >= max ? C.red : d.probeTemp >= max * 0.8 ? C.amber : C.lime;
  return (
    <div>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <span key={l} aria-current={l === level ? "true" : undefined} className={`flex h-6 min-w-0 flex-1 items-center justify-center rounded-full border px-1 text-[9.5px] font-semibold tracking-wide ${l === level ? tone(l) : "border-white/10 text-white/30"}`}>
            <span className="truncate">{l}</span>
          </span>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="hud-label">Probe temperature</span>
          <span className="hud-value text-[11px]">{d.probeTemp === undefined ? dash : `${fmtNum(d.probeTemp, 1)} / ${fmtNum(max)} C`}</span>
        </div>
        <Meter value={d.probeTemp} max={scale} color={probeColor} ticks={[(max * 0.8) / scale, max / scale]} />
      </div>
      <div className="mt-2.5">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="hud-label">Coolant flow</span>
          <span className="hud-value text-[11px]">{d.flowLpm === undefined ? dash : `${fmtNum(d.flowLpm)}${d.minFlow !== undefined ? ` (min ${fmtNum(d.minFlow)})` : ""} L/min`}</span>
        </div>
        <Meter value={d.flowLpm} max={Math.max((d.minFlow ?? 0) * 1.6, d.flowLpm ?? 0, 1)} color={d.flowLpm !== undefined && d.minFlow !== undefined && d.flowLpm < d.minFlow ? C.red : C.lime} ticks={d.minFlow !== undefined ? [d.minFlow / Math.max(d.minFlow * 1.6, d.flowLpm ?? 0, 1)] : []} />
      </div>
      <ul className="mt-3 space-y-1.5 border-t border-white/[0.08] pt-2.5">
        <LampRow label="Coolant OK" on={d.coolantOk} />
        <LampRow label="Start permitted" on={d.canStart} />
        <LampRow label="SCRAM needed" on={d.scramNeeded} bad />
      </ul>
      {d.modeName && (
        <p className="mt-2.5 flex items-center justify-between gap-2">
          <span className="hud-label">Mode</span>
          <span className="hud-tag hud-accent border-[#c5ee8a]/30">{d.modeName}</span>
        </p>
      )}
    </div>
  );
}

// ───────────────────────── lesson 6: warm-up ramp ─────────────────────────

function RampChart({ start, peak, ticks }: { start: number; peak: number; ticks: number }) {
  const n = clamp(Math.round(ticks), 1, 60);
  const lo = Math.min(start, peak);
  const span = Math.max(Math.abs(peak - start), 1);
  const X0 = 30;
  const X1 = 232;
  const Y0 = 8;
  const Y1 = 62;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = start + ((peak - start) * i) / n;
    return [X0 + ((X1 - X0) * i) / n, Y1 - ((t - lo) / span) * (Y1 - Y0)] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 240 84" className="block w-full" role="img" aria-label={`Warm-up from ${fmtNum(start)} to ${fmtNum(peak)} degrees in ${n} ticks`}>
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="rgba(255,255,255,0.15)" />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke="rgba(255,255,255,0.15)" />
      <polygon points={`${X0},${Y1} ${line} ${X1},${Y1}`} fill={C.heat} fillOpacity="0.12" />
      <polyline points={line} fill="none" stroke={C.heat} strokeWidth="1.6" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === n ? 3.2 : 1.8} fill={i === n ? C.lime : C.heat} />
      ))}
      <text x={X0 - 4} y={Y1 + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)">
        {fmtNum(start)}
      </text>
      <text x={X0 - 4} y={Y0 + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)">
        {fmtNum(peak)}
      </text>
      <text x={X0} y="78" fontSize="8" fill="rgba(255,255,255,0.4)">
        tick 0
      </text>
      <text x={X1} y="78" textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.4)">
        tick {n}
      </text>
    </svg>
  );
}

function CoreMap({ map }: { map: string }) {
  const rows = map
    .split("\n")
    .map((r) => r.replace(/\r/g, ""))
    .filter((r) => r.length > 0)
    .slice(0, 24)
    .map((r) => r.slice(0, 24));
  if (rows.length === 0) return null;
  const width = Math.max(...rows.map((r) => r.length));
  return (
    <div className="mx-auto w-full" style={{ maxWidth: width * 22 }} role="img" aria-label={`Core map, ${width} by ${rows.length}`}>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}>
        {rows.flatMap((row, y) =>
          Array.from({ length: width }, (_, x) => {
            const ch = row[x] ?? " ";
            const cls =
              ch === "#" ? "bg-white/20"
              : ch === "*" ? "rc-shimmer bg-[#ffb26b] shadow-[0_0_8px_1px_rgba(255,178,107,0.55)]"
              : ch === "." || ch === " " ? "bg-white/[0.05]"
              : "bg-[#c5ee8a]/30";
            return <span key={`${x},${y}`} className={`aspect-square rounded-[2px] ${cls}`} style={ch === "*" ? { animationDuration: `${3 + ((x + y) % 3)}s` } : undefined} />;
          }),
        )}
      </div>
    </div>
  );
}

export function Ramp({ d }: { d: Reactor["ramp"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Run your loops and send rampTicks, rampPeak and coreMap.</Empty>;
  const hasChart = d.start !== undefined && d.peak !== undefined && d.ticks !== undefined;
  return (
    <div>
      {hasChart ? <RampChart start={d.start!} peak={d.peak!} ticks={d.ticks!} /> : d.ticks !== undefined || d.peak !== undefined ? (
        <p className="hud-muted mb-2 text-[11px]">Send rampStart, rampPeak and rampTicks to draw the ramp.</p>
      ) : null}
      <dl className="mt-2 grid grid-cols-3 gap-1.5">
        <Tile label="Ticks" value={show(d.ticks)} tone="accent" />
        <Tile label="Peak" value={show(d.peak)} unit="C" tone="accent" />
        <Tile label="Prime" value={show(d.primeCycles)} unit="cycles" />
        <Tile label="Skipped" value={show(d.skipped)} />
        <Tile label="Last tick" value={show(d.lastTick)} />
        <Tile label="Heat" value={show(d.heatTotal)} />
      </dl>
      {d.coreMap && (
        <div className="mt-3">
          <p className="hud-label mb-1.5">Core map</p>
          <CoreMap map={d.coreMap} />
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 9: telemetry decoder ─────────────────────────

const FIELD_COLORS: Record<string, string> = { T: C.heat, P: C.cool, S: C.lime, R: "#e5e5e5" };

export function Telemetry({ d }: { d: Reactor["telemetry"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Decode a packet and send packetTemp, packetState and goodPackets.</Empty>;
  const fields = (d.packet ?? "")
    .split(";")
    .filter((f) => f.length > 0)
    .slice(0, 8)
    .map((f) => {
      const at = f.indexOf("=");
      return at < 0 ? { k: "", v: f } : { k: f.slice(0, at), v: f.slice(at + 1) };
    });
  const good = d.good ?? 0;
  const bad = d.bad ?? 0;
  const total = good + bad;
  return (
    <div>
      {d.packet !== undefined && (
        <div className="rounded-md bg-black/40 p-2">
          <p className="hud-label mb-1.5">Raw packet</p>
          <div className="flex flex-wrap gap-1">
            {fields.length === 0 ? (
              <span className="hud-muted font-mono text-[11px]">(empty)</span>
            ) : (
              fields.map((f, i) => (
                <span key={i} className="inline-flex min-w-0 items-center overflow-hidden rounded border border-white/10 font-mono text-[10.5px]">
                  {f.k && (
                    <span className="px-1.5 py-0.5 font-semibold" style={{ background: `${FIELD_COLORS[f.k] ?? C.grey}22`, color: FIELD_COLORS[f.k] ?? C.grey }}>
                      {f.k}
                    </span>
                  )}
                  <span className="truncate px-1.5 py-0.5 text-white/85">{f.v === "" ? "(empty)" : f.v}</span>
                </span>
              ))
            )}
          </div>
        </div>
      )}
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Tile label="Temperature" value={show(d.temp, (n) => fmtNum(n, 1))} unit="C" tone="accent" />
        <Tile label="Pressure" value={show(d.pressure, (n) => fmtNum(n, 1))} unit="bar" tone="accent" />
        <Tile label="State" value={d.state ?? dash} tone="accent" />
        <Tile label="Rods" value={show(d.rods)} tone="accent" />
      </dl>
      {total > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="hud-label">Packets</span>
            <span className="hud-value text-[11px]">
              <span className="hud-accent">{good} good</span> · <span className={bad > 0 ? "hud-warning" : "text-white/45"}>{bad} bad</span>
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
            <span style={{ width: `${(good / total) * 100}%`, background: C.lime }} />
            <span style={{ width: `${(bad / total) * 100}%`, background: C.amber }} />
          </div>
        </div>
      )}
      {d.logLine && <p className="hud-log hud-log-line mt-2.5 truncate rounded-md bg-black/40 px-2 py-1.5 text-[11px]" title={d.logLine}>{d.logLine}</p>}
    </div>
  );
}

// ───────────────────────── lesson 10: sensor bank ─────────────────────────

export function Sensors({ d }: { d: Reactor["sensors"] }) {
  const names = d.names ?? [];
  const n = Math.min(names.length, 12);
  if (n === 0) return <Empty>Nothing yet. Send sensorNames, sensorValues and sensorLimits.</Empty>;
  return (
    <div>
      <ul className="space-y-1.5">
        {Array.from({ length: n }, (_, i) => {
          const v = d.values?.[i];
          const lim = d.limits?.[i];
          const ratio = v !== undefined && lim !== undefined && lim > 0 ? v / lim : undefined;
          const color = ratio === undefined ? C.grey : ratio >= 1 ? C.red : ratio >= 0.85 ? C.amber : C.lime;
          const closest = d.closest !== undefined && names[i] === d.closest;
          return (
            <li key={i} className={`grid min-w-0 grid-cols-[minmax(0,6.5rem)_1fr_2.6rem] items-center gap-2 rounded-md px-1.5 py-1 ${closest ? "bg-white/[0.06] ring-1 ring-[#c5ee8a]/35" : ""}`} title={v === undefined || lim === undefined ? undefined : `${fmtNum(v)} of ${fmtNum(lim)}`}>
              <span className="truncate text-[11px] text-white/80">{names[i]}</span>
              <Meter value={ratio === undefined ? undefined : ratio * 100} max={100} color={color} ticks={[0.85]} />
              <span className="hud-value text-right text-[10.5px]" style={{ color: ratio === undefined ? undefined : color }}>
                {ratio === undefined ? dash : `${Math.round(ratio * 100)}%`}
              </span>
            </li>
          );
        })}
      </ul>
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Tile label="Near limit" value={show(d.overCount)} tone={d.overCount ? "warning" : "plain"} />
        <Tile label="Closest" value={d.closest ?? dash} tone="accent" />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 11: event tally ─────────────────────────

export function Tally({ d }: { d: Reactor["tally"] }) {
  const entries = Object.entries(d.tally ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
  if (entries.length === 0 && !hasValues(d)) return <Empty>Nothing yet. Count events in a map and send tally.</Empty>;
  const top = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div>
      {entries.length > 0 && (
        <ul className="space-y-1.5">
          {entries.map(([k, v]) => {
            const hot = d.mostCommon !== undefined ? k === d.mostCommon : v === top;
            return (
              <li key={k} className="grid min-w-0 grid-cols-[minmax(0,7.5rem)_1fr_1.5rem] items-center gap-2">
                <span className={`truncate font-mono text-[10.5px] ${hot ? "hud-accent" : "text-white/70"}`}>{k}</span>
                <Meter value={v} max={top} color={hot ? C.lime : "#6b6b6b"} />
                <span className="hud-value text-right text-[11px]">{fmtNum(v)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <div className="col-span-2">
          <Tile label="Most common" value={d.mostCommon === undefined ? dash : `${d.mostCommon}${d.mostCommonCount === undefined ? "" : ` ×${fmtNum(d.mostCommonCount)}`}`} tone="accent" />
        </div>
        <Tile label="Distinct kinds" value={show(d.distinct)} />
        <Tile label="Pressure limit" value={show(d.pressureLimit)} unit="bar" />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 12: analysis ─────────────────────────

export function Analysis({ d }: { d: Reactor["analysis"] }) {
  const ranked = (d.ranked ?? []).slice(0, 10);
  if (ranked.length === 0 && !hasValues(d)) return <Empty>Nothing yet. Sort the sensors and send rankedNames, firstWarning and warnCount.</Empty>;
  return (
    <div>
      {ranked.length > 0 && (
        <>
          <p className="hud-label mb-1.5">Closest to its limit first</p>
          <ol className="space-y-1">
            {ranked.map((name, i) => (
              <li key={i} className={`flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-[11px] ${i === 0 ? "bg-[#c5ee8a]/10" : ""}`}>
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold ${i === 0 ? "bg-[#c5ee8a] text-[#0a0a0a]" : "bg-white/10 text-white/60"}`}>{i + 1}</span>
                <span className={`min-w-0 flex-1 truncate ${i === 0 ? "text-[#e0f6c1]" : "text-white/75"}`}>{name}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <dl className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Tile label="First warning" value={d.firstWarning ?? dash} tone="warning" />
        <Tile label="Warnings" value={show(d.warnCount)} tone={d.warnCount ? "warning" : "plain"} />
        <Tile label="Median rod" value={show(d.median)} unit="%" tone="accent" />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 13: control rods ─────────────────────────

export function Control({ d }: { d: Reactor["control"] }) {
  const names = d.names ?? [];
  const n = Math.min(names.length, 8);
  if (n === 0 && !hasValues(d)) return <Empty>Nothing yet. Build ControlRod objects and send controlNames and controlInsertions.</Empty>;
  const slot = 54;
  const tubeH = 78;
  return (
    <div>
      {n > 0 && (
        <svg viewBox={`0 0 ${n * slot} 124`} className="mx-auto block w-full" style={{ maxWidth: n * 72 }} role="img" aria-label={`${n} control rods`}>
          <line x1="4" y1="6" x2={n * slot - 4} y2="6" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" />
          {Array.from({ length: n }, (_, i) => {
            const cx = i * slot + slot / 2;
            const ins = clamp(d.insertions?.[i] ?? 0, 0, 100);
            const known = d.insertions?.[i] !== undefined;
            const full = ins >= 100;
            return (
              <g key={i}>
                <title>{`${names[i]}: ${known ? fmtNum(ins) : "unknown"}% inserted`}</title>
                <line x1={cx} y1="6" x2={cx} y2="16" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                <rect x={cx - 8} y="16" width="16" height={tubeH} rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" />
                {known && <rect x={cx - 8} y="16" width="16" height={(tubeH * ins) / 100} rx="4" fill={full ? C.limeSoft : C.lime} fillOpacity={0.5 + 0.4 * (ins / 100)} className="rc-shimmer" style={{ "--i": i } as React.CSSProperties} />}
                <text x={cx} y="108" textAnchor="middle" fontSize="10" fontWeight="600" fill="#f4f4f4">
                  {names[i].slice(0, 6)}
                </text>
                <text x={cx} y="120" textAnchor="middle" fontSize="9" fill={known ? C.lime : "rgba(255,255,255,0.3)"} fontFamily="var(--font-mono)">
                  {known ? `${fmtNum(ins)}%` : dash}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {n > 0 && d.reactivity && d.reactivity.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {Array.from({ length: Math.min(n, d.reactivity.length) }, (_, i) => (
            <span key={i} className="hud-tag" title="Reactivity: how much this rod still lets the reaction run">
              {names[i]} <span className="hud-value hud-accent ml-1">{fmtNum(d.reactivity![i], 2)}</span>
            </span>
          ))}
        </div>
      )}
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Tile label="Total reactivity" value={show(d.total, (v) => fmtNum(v, 2))} tone="accent" />
        <Tile label="Fully inserted" value={show(d.fullyInserted)} />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 14: reactor state ─────────────────────────

const STATES = ["Offline", "Standby", "WarmUp", "Running", "Scram"];

export function StateChain({ d }: { d: Reactor["state"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send state, history and rejected from your enum class.</Empty>;
  const history = d.history ?? [];
  const extra = [...history, ...(d.state ? [d.state] : [])].filter((s, i, a) => !STATES.includes(s) && a.indexOf(s) === i).slice(0, 2);
  const nodes = [...STATES, ...extra];
  const current = d.state ?? history[history.length - 1] ?? (d.code !== undefined ? STATES[Math.round(d.code)] : undefined);
  const visited = new Set(history);
  const slot = 56;
  const scram = current === "Scram";
  return (
    <div>
      <svg viewBox={`0 0 ${nodes.length * slot} 58`} className="mx-auto block w-full" role="img" aria-label={`Reactor state ${current ?? "unknown"}`}>
        {nodes.map((s, i) => {
          const cx = i * slot + slot / 2;
          const isCur = s === current;
          const seen = visited.has(s);
          const next = nodes[i + 1];
          const color = isCur ? (s === "Scram" ? C.red : C.lime) : seen ? C.limeSoft : "rgba(255,255,255,0.25)";
          return (
            <g key={s}>
              {next !== undefined && <line x1={cx + 12} y1="20" x2={cx + slot - 12} y2="20" stroke={seen && visited.has(next) ? C.limeSoft : "rgba(255,255,255,0.15)"} strokeWidth="2" strokeDasharray={seen && visited.has(next) ? undefined : "3 3"} />}
              {isCur && <circle cx={cx} cy="20" r="14" fill={color} fillOpacity="0.18" className="rc-plasma" />}
              <circle cx={cx} cy="20" r="9" fill={isCur ? color : "#121212"} stroke={color} strokeWidth="1.8" />
              {seen && !isCur && <circle cx={cx} cy="20" r="3" fill={C.limeSoft} />}
              <text x={cx} y="48" textAnchor="middle" fontSize="9.5" fontWeight={isCur ? 600 : 400} fill={isCur ? (scram ? "#fecaca" : "#e0f6c1") : seen ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.4)"}>
                {s}
              </text>
            </g>
          );
        })}
      </svg>
      {history.length > 0 && (
        <p className="hud-log mt-2 rounded-md bg-black/40 px-2 py-1.5 text-[10.5px] leading-snug">
          {history.join(" → ")}
        </p>
      )}
      <dl className="mt-2.5 grid grid-cols-3 gap-1.5">
        <Tile label="State" value={current ?? dash} tone={scram ? "danger" : "accent"} />
        <Tile label="Code" value={show(d.code)} />
        <Tile label="Rejected" value={show(d.rejected)} tone={d.rejected ? "warning" : "plain"} />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 15: alarms ─────────────────────────

function alarmTone(code: string): { chip: string; label: string } {
  const c = code.toUpperCase();
  if (c.includes("OVER") || c.includes("CRIT") || c.includes("SCRAM")) return { chip: "border-[#f87171]/50 bg-[#f87171]/15 text-[#fecaca]", label: code };
  if (c.includes("BAD") || c.includes("INVALID") || c.includes("DATA")) return { chip: "border-[#8fb3c9]/50 bg-[#8fb3c9]/15 text-[#cfe3f0]", label: code };
  return { chip: "border-[#fbbf24]/50 bg-[#fbbf24]/15 text-[#fde68a]", label: code };
}

export function Alarms({ d }: { d: Reactor["alarms"] }) {
  const codes = d.codes ?? [];
  const messages = d.messages ?? [];
  const n = Math.max(codes.length, messages.length);
  if (n === 0 && !hasValues(d)) return <Empty>Nothing yet. Catch the exceptions and send alarmCodes and alarmMessages.</Empty>;
  const shown = Math.min(n, 8);
  return (
    <div>
      {n === 0 ? (
        <p className="hud-log hud-accent flex items-center gap-2 py-1 text-[11px]">
          <Lamp on size={8} /> No alarms raised
        </p>
      ) : (
        <ul className="space-y-1.5">
          {Array.from({ length: shown }, (_, i) => {
            const tone = alarmTone(codes[i] ?? "ALARM");
            return (
              <li key={i} className="rounded-md bg-white/[0.04] px-2 py-1.5">
                <span className={`inline-flex h-4 items-center rounded-full border px-1.5 text-[9px] font-semibold tracking-wide ${tone.chip}`}>{tone.label}</span>
                <p className="mt-1 break-words text-[11px] leading-snug text-white/80">{messages[i] ?? ""}</p>
              </li>
            );
          })}
          {n > shown && <li className="hud-muted text-[10.5px]">+{n - shown} more</li>}
        </ul>
      )}
      <dl className="mt-2.5 grid grid-cols-2 gap-1.5">
        <Tile label="Alarms" value={show(d.count ?? (n > 0 ? n : undefined))} tone={(d.count ?? n) > 0 ? "warning" : "plain"} />
        <Tile label="Accepted" value={show(d.accepted)} tone="accent" />
      </dl>
    </div>
  );
}

// ───────────────────────── lesson 16: shift report ─────────────────────────

const GRADE_COLOR: Record<string, string> = { A: C.lime, B: C.limeSoft, C: C.amber, D: C.heat, F: C.red };

function logTone(line: string): string {
  const u = line.toUpperCase();
  if (u.includes("CRITICAL") || u.includes("FAULT") || u.includes("SKIPPED")) return "text-[#f87171]";
  if (u.includes("WARNING")) return "text-[#fbbf24]";
  return "text-white/80";
}

export function Shift({ d, allLive, interactive }: { d: Reactor["shift"]; allLive: boolean; interactive: boolean }) {
  const log = d.log ?? [];
  const noData = !hasValues({ ...d, operator: undefined, shiftName: undefined });
  if (noData && log.length === 0) return <Empty>Nothing yet. Build the shift report and send shiftLog, shiftPeak, shiftAverage and shiftGrade.</Empty>;
  const levels = Object.entries(d.levels ?? {});
  const total = levels.reduce((a, [, v]) => a + v, 0);
  const gradeColor = d.grade ? GRADE_COLOR[d.grade] ?? C.grey : C.grey;
  const levelColor = (k: string) => (k.toUpperCase() === "CRITICAL" ? C.red : k.toUpperCase() === "WARNING" ? C.amber : C.lime);
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border bg-white/[0.03]" style={{ borderColor: `${gradeColor}66` }} role="img" aria-label={d.grade ? `Shift grade ${d.grade}` : "No grade yet"}>
          <span className="hud-value text-[28px] leading-none" style={{ color: d.grade ? gradeColor : "rgba(255,255,255,0.3)" }}>
            {d.grade ?? dash}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="hud-label">Shift grade</p>
          <p className="truncate text-[12px] text-white/85">{d.operator ? d.operator : "Operator unknown"}</p>
          <p className="hud-muted truncate text-[10.5px]">
            {d.shiftName ?? "shift unknown"}
            {d.state ? ` · ${d.state}` : ""}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-1.5">
        <Tile label="Peak" value={show(d.peak, (n) => fmtNum(n, 1))} unit="C" tone="accent" />
        <Tile label="Average" value={show(d.average, (n) => fmtNum(n, 1))} unit="C" tone="accent" />
        <Tile label="Warnings" value={show(d.warnings)} tone={d.warnings ? "warning" : "plain"} />
        <Tile label="Bad" value={show(d.bad)} tone={d.bad ? "warning" : "plain"} />
      </dl>
      {total > 0 && (
        <div className="mt-2.5">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
            {levels.map(([k, v]) => (
              <span key={k} style={{ width: `${(v / total) * 100}%`, background: levelColor(k) }} title={`${k}: ${v}`} />
            ))}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-white/55">
            {levels.map(([k, v]) => (
              <span key={k}>
                <span style={{ color: levelColor(k) }}>●</span> {k} {v}
              </span>
            ))}
          </p>
        </div>
      )}
      {log.length > 0 && (
        <div className={`hud-log mt-2.5 rounded-md bg-black/40 px-2 py-1.5 ${interactive ? "max-h-44 overflow-auto" : "max-h-32 overflow-hidden"}`} role="log" aria-label="Shift log">
          {log.map((l, i) => (
            <div key={i} className={`hud-log-line break-words ${logTone(l)}`}>
              {l}
            </div>
          ))}
        </div>
      )}
      {allLive && (
        <p className="mt-2.5 flex items-center justify-center gap-2 rounded-md border border-[#c5ee8a]/25 bg-[#c5ee8a]/[0.07] py-1.5 text-[11px] text-[#e0f6c1]">
          <Lamp on size={7} /> All systems live. Helios-1 is yours.
        </p>
      )}
    </div>
  );
}
