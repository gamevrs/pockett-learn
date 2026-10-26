"use client";

import React from "react";
import { C, clamp, fmtNum, tempColor, type Reactor } from "./data";
import { Empty, Lamp, Tile, dash } from "./ui";

/**
 * The three big instruments of the board: the core temperature dial, the fuel-rod grid and the
 * coolant loops. They are SVG drawn in a fixed viewBox, so they scale with their panel.
 * Motion is CSS only (see CSS in ui.tsx) so it costs nothing per frame and honours reduced motion.
 */

// ───────────────────────── core dial ─────────────────────────

const SWEEP = 118; // degrees either side of straight up
const CX = 150;
const CY = 118;
const R = 90;

const polar = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};

function arc(from: number, to: number, r: number): string {
  const [x0, y0] = polar(from, r);
  const [x1, y1] = polar(to, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const MODE_NAMES: Record<string, string> = { S: "Standby", W: "Warm-up", R: "Run", X: "Shutdown" };

export function CoreGauge({ d, generation, alarmLevel, compact = false }: { d: Reactor["core"]; generation: number; alarmLevel: string | undefined; compact?: boolean }) {
  const max = d.max !== undefined && d.max > 0 ? d.max : 650;
  const scaleMax = max * 1.25;
  const toAngle = (v: number) => -SWEEP + 2 * SWEEP * clamp(v / scaleMax, 0, 1);
  const bands: { from: number; to: number; color: string }[] = [
    { from: 0, to: max * 0.8, color: C.lime },
    { from: max * 0.8, to: max, color: C.amber },
    { from: max, to: scaleMax, color: C.red },
  ];
  const temp = d.temp;
  const needle = temp === undefined ? -SWEEP : toAngle(temp);
  const level = alarmLevel ?? (temp === undefined ? undefined : temp >= max ? "CRITICAL" : temp >= max * 0.8 ? "WARNING" : "NORMAL");
  const readColor = level === "CRITICAL" ? C.red : level === "WARNING" ? C.amber : temp === undefined ? "rgba(255,255,255,0.3)" : "#e0f6c1";
  const ticks = Array.from({ length: 13 }, (_, i) => i * (max / 10)).filter((v) => v <= scaleMax + 1e-6);
  const mode = d.mode;

  return (
    <div className="flex h-full flex-col justify-between">
      <svg viewBox="0 0 300 176" className="mx-auto block w-full max-w-[28rem]" role="img" aria-label={temp === undefined ? "Core temperature gauge, no reading" : `Core temperature ${fmtNum(temp, 1)} degrees, limit ${fmtNum(max)}`}>
        {d.plasma && (
          <g className="rc-plasma" aria-hidden>
            <ellipse cx={CX} cy={CY - 6} rx="58" ry="24" fill="none" stroke={C.lime} strokeWidth="1.5" className="rc-orbit" />
            <ellipse cx={CX} cy={CY - 6} rx="58" ry="24" fill="none" stroke={C.heat} strokeWidth="1.5" strokeOpacity="0.8" className="rc-orbit" transform={`rotate(-38 ${CX} ${CY - 6})`} style={{ animationDirection: "reverse" }} />
            <ellipse cx={CX} cy={CY - 6} rx="34" ry="14" fill="none" stroke={C.lime} strokeOpacity="0.5" strokeWidth="1" />
          </g>
        )}
        {bands.map((b, i) => (
          <path key={`t${i}`} d={arc(toAngle(b.from), toAngle(b.to), R)} fill="none" stroke={b.color} strokeOpacity="0.2" strokeWidth="9" />
        ))}
        {temp !== undefined &&
          bands.map((b, i) => {
            const end = Math.min(b.to, temp);
            return end > b.from + 0.01 ? <path key={`l${i}`} d={arc(toAngle(b.from), toAngle(end), R)} fill="none" stroke={b.color} strokeWidth="9" strokeOpacity="0.95" /> : null;
          })}
        {ticks.map((v, i) => {
          const a = toAngle(v);
          const [x0, y0] = polar(a, R - 10);
          const [x1, y1] = polar(a, R - (i % 5 === 0 ? 17 : 14));
          return <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />;
        })}
        {[0, max].map((v) => {
          const [x, y] = polar(toAngle(v), R - 27);
          return (
            <text key={v} x={x} y={y + 3} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)">
              {fmtNum(v)}
            </text>
          );
        })}
        <g transform={`translate(${CX} ${CY})`}>
          <g key={generation} className="rc-needle" style={{ "--rc-from": `${-SWEEP}deg`, "--rc-to": `${needle}deg` } as React.CSSProperties}>
            <polygon points="-2.6,4 0,-74 2.6,4" fill={temp === undefined ? "rgba(255,255,255,0.3)" : "#f4f4f4"} />
          </g>
          <circle r="7" fill="#1f1f1f" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        </g>
        <text x={CX} y={CY + 34} textAnchor="middle" fontSize="26" fontWeight="600" fill={readColor} fontFamily="var(--font-mono)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {temp === undefined ? dash : fmtNum(temp, 1)}
          {temp !== undefined && (
            <tspan fontSize="11" fill="rgba(255,255,255,0.5)" dx="3">
              °C
            </tspan>
          )}
        </text>
        <text x={CX} y={CY + 49} textAnchor="middle" fontSize="8.5" letterSpacing="1.2" fill="rgba(255,255,255,0.4)">
          CORE TEMPERATURE
        </text>
      </svg>
      {!compact && (
        <dl className="mt-1 grid grid-cols-3 gap-1.5">
          <Tile label="Pressure" value={d.pressure === undefined ? dash : fmtNum(d.pressure)} unit="bar" tone="accent" />
          <Tile label="Fuel rods" value={d.rods === undefined ? dash : fmtNum(d.rods)} tone="accent" />
          <Tile label="Loops" value={d.loops === undefined ? dash : fmtNum(d.loops)} tone="accent" />
        </dl>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-white/70">
          <Lamp on={d.plasma} />
          Plasma {d.plasma === undefined ? "unknown" : d.plasma ? "on" : "off"}
        </span>
        {mode && (
          <span className="hud-tag" title="Operating mode">
            Mode {mode}
            {MODE_NAMES[mode] ? <span className="hud-muted ml-1 font-normal">{MODE_NAMES[mode]}</span> : null}
          </span>
        )}
        {level && (
          <span className={`hud-tag ${level === "CRITICAL" ? "hud-danger border-[#f87171]/40" : level === "WARNING" ? "hud-warning border-[#fbbf24]/40" : "hud-accent border-[#c5ee8a]/30"}`}>{level}</span>
        )}
        {d.state && <span className="hud-tag ml-auto">{d.state}</span>}
      </div>
    </div>
  );
}

// ───────────────────────── fuel rods ─────────────────────────

const COLS = 6;
const CELL_W = 44;
const CELL_H = 58;
const GAP = 6;

export function RodGrid({ d, compact = false }: { d: Reactor["rods"]; compact?: boolean }) {
  const levels = (d.levels ?? []).slice(0, 60);
  if (levels.length === 0) return <Empty>Nothing yet. Fill a vector with the rod levels and send it as rodLevels.</Empty>;
  const rows = Math.ceil(levels.length / COLS);
  const height = rows * (CELL_H + GAP) - GAP;
  let lowest = 0;
  levels.forEach((v, i) => {
    if (v < levels[lowest]) lowest = i;
  });
  const minIndex = d.minIndex !== undefined && d.minIndex >= 0 && d.minIndex < levels.length ? Math.floor(d.minIndex) : lowest;
  const minLevel = d.min ?? levels[minIndex];
  const maxLevel = d.max ?? Math.max(...levels);
  const avg = d.avg ?? levels.reduce((a, b) => a + b, 0) / levels.length;
  return (
    <div className="flex h-full flex-col justify-between">
      <svg viewBox={`0 0 ${COLS * (CELL_W + GAP) - GAP} ${height}`} className="mx-auto block w-full max-w-[26rem]" role="img" aria-label={`${levels.length} fuel rods, average level ${fmtNum(avg, 1)} percent`}>
        {levels.map((raw, i) => {
          const v = clamp(raw, 0, 100);
          const x = (i % COLS) * (CELL_W + GAP);
          const y = Math.floor(i / COLS) * (CELL_H + GAP);
          const low = v < 25;
          const isMin = i === minIndex;
          const fill = low ? C.amber : C.lime;
          const rodH = 30;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <title>{`Rod ${i}: ${fmtNum(raw)}%`}</title>
              <rect width={CELL_W} height={CELL_H} rx="6" fill="rgba(255,255,255,0.03)" stroke={isMin ? C.amber : "rgba(255,255,255,0.07)"} strokeWidth={isMin ? 1.3 : 1} />
              <text x="4" y="10" fontSize="7.5" fill={isMin ? C.amber : "rgba(255,255,255,0.3)"} fontFamily="var(--font-mono)">
                {i}
              </text>
              <rect x={(CELL_W - 14) / 2} y="14" width="14" height={rodH} rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
              <rect
                x={(CELL_W - 14) / 2}
                y={14 + rodH - (rodH * v) / 100}
                width="14"
                height={(rodH * v) / 100}
                rx="3"
                fill={fill}
                fillOpacity={low ? 0.9 : 0.5 + 0.45 * (v / 100)}
                className="rc-shimmer"
                style={{ "--i": i % 12 } as React.CSSProperties}
              />
              <text x={CELL_W / 2} y={CELL_H - 7} textAnchor="middle" fontSize="9" fill={isMin ? C.amber : "rgba(255,255,255,0.6)"} fontFamily="var(--font-mono)">
                {fmtNum(raw)}
              </text>
            </g>
          );
        })}
      </svg>
      {compact ? (
        <p className="hud-muted mt-1.5 text-center text-[10px]">
          Average {fmtNum(avg, 1)}% · lowest rod {minIndex} at {fmtNum(minLevel)}%
        </p>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-4 gap-1.5">
            <Tile label="Rods" value={levels.length} />
            <Tile label="Average" value={fmtNum(avg, 1)} unit="%" tone="accent" />
            <Tile label="Lowest" value={fmtNum(minLevel)} unit="%" tone={minLevel < 25 ? "warning" : "plain"} />
            <Tile label="Highest" value={fmtNum(maxLevel)} unit="%" tone="accent" />
          </dl>
          <p className="hud-muted mt-1.5 text-[10px]">Lowest is rod {minIndex}. Each bar shows how much fuel is left.</p>
        </>
      )}
    </div>
  );
}

// ───────────────────────── coolant loops ─────────────────────────

const LOOP_NAMES = ["A", "B", "C", "D", "E"];
const speed = (flow: number | undefined) => (flow === undefined || flow <= 0 ? undefined : `${clamp(420 / flow, 0.7, 5).toFixed(2)}s`);

export function CoolantLoops({ d, compact = false }: { d: Reactor["coolant"]; compact?: boolean }) {
  const n = clamp(Math.max(d.names?.length ?? 0, d.temps?.length ?? 0, d.flows?.length ?? 0), 0, 5);
  const rpm = d.pumpRpm;
  if (n === 0 && rpm === undefined) return <Empty>Nothing yet. Send loopNames, loopTemps, loopFlows and pumpRpm.</Empty>;
  const loopY = (i: number) => 82 + i * 50;
  const height = n === 0 ? 70 : loopY(n - 1) + 17 + 8;
  const spin = rpm === undefined || rpm <= 0 ? undefined : `${clamp(1800 / rpm, 0.4, 6).toFixed(2)}s`;
  return (
    <div className="flex h-full flex-col justify-between">
      <svg viewBox={`0 0 300 ${height}`} className="mx-auto block w-full max-w-[30rem]" role="img" aria-label={`${n} coolant loops`}>
        {n > 0 && <line x1="38" y1="48" x2="38" y2={loopY(n - 1)} stroke="rgba(255,255,255,0.14)" strokeWidth="6" strokeLinecap="round" />}
        <circle cx="38" cy="32" r="17" fill="#181818" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <g transform="translate(38 32)">
          <g className={spin ? "rc-spin" : undefined} style={spin ? { animationDuration: spin } : undefined}>
            {[0, 90, 180, 270].map((a) => (
              <path key={a} d="M 0 0 L 3.5 -12 L -3.5 -12 Z" transform={`rotate(${a})`} fill={rpm === undefined ? "rgba(255,255,255,0.3)" : C.lime} fillOpacity="0.85" />
            ))}
          </g>
          <circle r="3" fill="#0a0a0a" stroke="rgba(255,255,255,0.5)" />
        </g>
        <text x="64" y="28" fontSize="8.5" letterSpacing="1.2" fill="rgba(255,255,255,0.4)">
          PUMP
        </text>
        <text x="64" y="43" fontSize="13" fontWeight="600" fill={rpm === undefined ? "rgba(255,255,255,0.3)" : "#e0f6c1"} fontFamily="var(--font-mono)">
          {rpm === undefined ? dash : fmtNum(rpm)}
          {rpm !== undefined && (
            <tspan fontSize="9" fill="rgba(255,255,255,0.5)" dx="3">
              rpm
            </tspan>
          )}
        </text>
        {Array.from({ length: n }, (_, i) => {
          const y = loopY(i);
          const flow = d.flows?.[i];
          const temp = d.temps?.[i];
          const color = tempColor(temp);
          const dur = speed(flow);
          const name = d.names?.[i] || LOOP_NAMES[i];
          return (
            <g key={i}>
              <title>{`Loop ${name}: ${flow === undefined ? "no flow data" : `${fmtNum(flow)} L/min`}${temp === undefined ? "" : `, ${fmtNum(temp, 1)} °C`}`}</title>
              <line x1="38" y1={y} x2="62" y2={y} stroke="rgba(255,255,255,0.14)" strokeWidth="6" />
              <rect x="62" y={y - 17} width="224" height="34" rx="17" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              <rect
                x="62"
                y={y - 17}
                width="224"
                height="34"
                rx="17"
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeOpacity={flow === undefined ? 0.35 : 0.95}
                strokeLinecap="round"
                className={dur ? "rc-flow" : undefined}
                style={dur ? { animationDuration: dur } : { strokeDasharray: "6 8" }}
              />
              <circle cx="38" cy={y} r="10" fill="#181818" stroke="rgba(255,255,255,0.3)" />
              <text x="38" y={y + 3.5} textAnchor="middle" fontSize="10" fontWeight="600" fill="#f4f4f4">
                {name.slice(0, 2)}
              </text>
              <text x="174" y={y - 1} textAnchor="middle" fontSize="11" fontWeight="600" fill="#f4f4f4" fontFamily="var(--font-mono)">
                {flow === undefined ? dash : `${fmtNum(flow)} L/min`}
              </text>
              <text x="174" y={y + 11} textAnchor="middle" fontSize="9" fill={color} fontFamily="var(--font-mono)">
                {temp === undefined ? dash : `${fmtNum(temp, 1)} °C`}
              </text>
            </g>
          );
        })}
      </svg>
      {compact ? (
        <p className="hud-muted mt-1.5 text-center text-[10px]">
          Total {d.totalFlow === undefined ? dash : fmtNum(d.totalFlow)} L/min · average {d.avgFlow === undefined ? dash : fmtNum(d.avgFlow, 1)}
        </p>
      ) : (
        <dl className="mt-2 grid grid-cols-3 gap-1.5">
          <Tile label="Total flow" value={d.totalFlow === undefined ? dash : fmtNum(d.totalFlow)} unit="L/min" tone="accent" />
          <Tile label="Average" value={d.avgFlow === undefined ? dash : fmtNum(d.avgFlow, 1)} unit="L/min" tone="accent" />
          <Tile label="Pump" value={rpm === undefined ? dash : fmtNum(rpm)} unit="rpm" />
        </dl>
      )}
    </div>
  );
}
