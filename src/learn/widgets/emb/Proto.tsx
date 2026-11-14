"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { i2cTransaction, i2cWave, spiCompat, spiSampleEdge, spiWave, toHex, uartBytesPerSec, uartFrame } from "./sim";
import { Caption, Note, ORANGE, Readout, Seg, ToyNote, Trace, clamp, fmtSec } from "./ui";

// ───────────────────────────── emb-proto: a logic-analyser view of UART, I²C and SPI ─────────────────────────────

type ProtoId = "uart" | "i2c" | "spi";
type Parity = "none" | "even" | "odd";
type Mode = 0 | 1 | 2 | 3;

export interface ProtoProps {
  protocols?: ProtoId[];
  proto?: string;
  byte?: number;
  addr?: number;
  read?: boolean;
  data?: number[];
  present?: boolean;
  mode?: number;
  deviceMode?: number;
  lockDevice?: boolean;
  /** SPI bytes (extra, not in the lesson spec): MOSI default 0xA5, MISO default 0x3C. */
  mosi?: number;
  miso?: number;
  task?: string;
}

export interface ProtoState {
  proto: ProtoId;
  byte: number;
  parity: Parity;
  baud: number;
  frameBits: string;
  addr: number;
  read: boolean;
  present: boolean;
  data: number[];
  addrByte: number;
  acks: boolean[];
  mode: Mode;
  deviceMode: Mode;
  compat: "match" | "idle-only" | "wrong-edge";
  mosi: number;
  miso: number;
}

type Vals = Pick<ProtoState, "proto" | "byte" | "parity" | "baud" | "addr" | "read" | "present" | "data" | "mode" | "deviceMode" | "mosi" | "miso">;

const f1 = (n: number) => n.toFixed(1);

/** Seg that can be locked: a disabled fieldset disables every button inside it. */
function LSeg<T extends string | number>({ disabled, ...rest }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0">
      <Seg {...rest} />
    </fieldset>
  );
}
const MONO = "var(--font-mono, monospace)";
const asMode = (n: number | undefined, d: Mode): Mode => (n === 0 || n === 1 || n === 2 || n === 3 ? n : d);

function toState(v: Vals): ProtoState {
  const frame = uartFrame(v.byte, { parity: v.parity });
  const tr = i2cTransaction(v.addr, v.read, v.data, v.present);
  return {
    ...v,
    frameBits: frame.map((f) => f.bit).join(""),
    addrByte: tr.bytes[0],
    acks: tr.symbols.filter((s) => s.kind === "ack").map((s) => (s.kind === "ack" ? s.ack : false)),
    compat: spiCompat(v.mode, v.deviceMode),
  };
}

function parseHex(text: string, min: number, max: number): number | null {
  const t = text.trim().replace(/^0x/i, "").replace(/_/g, "");
  if (!/^[0-9a-f]{1,2}$/i.test(t)) return null;
  const n = parseInt(t, 16);
  return n >= min && n <= max ? n : null;
}

/** A hex-byte box that keeps what you type until you leave it. */
function HexField({ label, value, onCommit, min = 0, max = 255, disabled, hint }: { label: string; value: number; onCommit: (n: number) => void; min?: number; max?: number; disabled?: boolean; hint?: string }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const parsed = draft === null ? null : parseHex(draft, min, max);
  const shown = draft !== null && parsed === value ? draft : toHex(value, 2);
  const bad = draft !== null && draft.trim() !== "" && parsed === null;
  return (
    <div className="flex flex-col items-start gap-1">
      <label htmlFor={id} className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        value={shown}
        disabled={disabled}
        aria-invalid={bad}
        onChange={(e) => {
          const t = e.target.value;
          setDraft(t);
          const n = parseHex(t, min, max);
          if (n !== null) onCommit(n);
        }}
        onBlur={() => setDraft(null)}
        className={`min-h-10 w-24 rounded-lg border bg-surface px-2 text-center font-mono text-sm text-ink disabled:opacity-60 ${bad ? "border-[var(--bad)]" : "border-line"}`}
      />
      {bad && <span className="text-[0.78rem] text-[var(--bad)]">{hint ?? `Type a hex byte like 0x41`}</span>}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Caption>{label}</Caption>
      {children}
    </div>
  );
}

const printable = (b: number) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : null);

// ───────────────────────────── UART ─────────────────────────────

function UartView({ v, set, locked }: { v: Vals; set: (p: Partial<Vals>) => void; locked: boolean }) {
  const frame = uartFrame(v.byte, { parity: v.parity });
  const slots = frame.length + 2;
  const X0 = 40;
  const W = 316;
  const dx = W / slots;
  const xs = (i: number) => X0 + i * dx;
  const levels: (0 | 1)[] = [1, ...frame.map((f) => f.bit), 1];
  const short = (l: string) => (l === "start" ? "St" : l === "stop" ? "Sp" : l);
  const dataEnd = frame.findIndex((f) => f.label === "P" || f.label === "stop");
  const ch = printable(v.byte);
  const bitTime = 1 / v.baud;
  const bits = frame.length;
  const decoded = `${toHex(v.byte, 2)}${ch ? ` '${ch}'` : ""}`;
  const aria = `UART frame on the TX line at ${v.baud} baud, ${bits} bits: ${frame.map((f) => `${short(f.label)} ${f.bit}`).join(", ")}. Decoded ${decoded}.`;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <HexField label="Byte (hex)" value={v.byte} onCommit={(n) => set({ byte: n })} disabled={locked} />
        <Labelled label="or one character">
          <input
            type="text"
            aria-label="Character to send"
            autoComplete="off"
            spellCheck={false}
            disabled={locked}
            value={ch ?? ""}
            onChange={(e) => {
              const last = Array.from(e.target.value).pop();
              if (last && last.charCodeAt(0) < 256) set({ byte: last.charCodeAt(0) });
            }}
            className="min-h-10 w-16 rounded-lg border border-line bg-surface px-2 text-center font-mono text-sm text-ink disabled:opacity-60"
          />
        </Labelled>
        <Labelled label="Parity">
          <LSeg
            label="Parity"
            value={v.parity}
            onChange={(p) => set({ parity: p })}
            disabled={locked}
            options={[
              { value: "none", label: "None" },
              { value: "even", label: "Even" },
              { value: "odd", label: "Odd" },
            ]}
          />
        </Labelled>
        <Labelled label="Baud">
          <LSeg
            label="Baud rate"
            value={v.baud}
            onChange={(b) => set({ baud: b })}
            disabled={locked}
            options={[
              { value: 9600, label: "9600" },
              { value: 115200, label: "115200" },
            ]}
          />
        </Labelled>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 160" className="w-full" role="img" aria-label={aria}>
          <rect x={f1(xs(1 + 1))} y={20} width={f1(dx * (dataEnd - 1))} height={60} fill="color-mix(in srgb, var(--brand) 14%, transparent)" />
          {Array.from({ length: slots + 1 }, (_, i) => (
            <line key={i} x1={f1(xs(i))} x2={f1(xs(i))} y1={20} y2={80} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="2 3" />
          ))}
          <Trace levels={levels} x={X0} y={42} width={W} h={26} label="TX" />
          {frame.map((f, i) => (
            <g key={i}>
              <text x={f1(xs(i + 1) + dx / 2)} y={36} fontSize={14} textAnchor="middle" fill="var(--ink)" fontFamily={MONO}>
                {f.bit}
              </text>
              <text x={f1(xs(i + 1) + dx / 2)} y={100} fontSize={14} textAnchor="middle" fill="var(--ink-2)" fontFamily={MONO}>
                {short(f.label)}
              </text>
            </g>
          ))}
          <text x={f1(xs(2) + (dx * (dataEnd - 1)) / 2)} y={122} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
            LSB first →
          </text>
          <text x={180} y={150} fontSize={16} textAnchor="middle" fill="var(--ink)" fontFamily={MONO} fontWeight={700}>
            decoded: {decoded}
          </text>
        </svg>
        <p className="px-1 text-[0.8rem] leading-snug text-ink-3">St = start bit (always 0), D0 to D7 = data bits, P = parity bit, Sp = stop bit (always 1). The line idles high.</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Bits on the wire" value={bits} accent />
        <Readout label="Bit time" value={fmtSec(bitTime)} />
        <Readout label="Frame time" value={fmtSec(bits * bitTime)} />
        <Readout label="Max bytes/s" value={Math.round(uartBytesPerSec(v.baud, bits)).toLocaleString("en-US")} />
      </div>
      <div className="mt-3">
        <Note>LSB first: the byte&apos;s bit 0 goes out right after the start bit.</Note>
      </div>
    </div>
  );
}

// ───────────────────────────── I²C ─────────────────────────────

function I2cView({ v, set, locked }: { v: Vals; set: (p: Partial<Vals>) => void; locked: boolean }) {
  const nData = v.data.length;
  const tr = i2cTransaction(v.addr, v.read, v.data, v.present);
  const wave = i2cWave(tr);
  const syms = tr.symbols;

  // sample ranges of every symbol inside the wave arrays (2 idle samples, START = 3, everything else = 4)
  const ranges: [number, number][] = [];
  let pos = 2;
  for (const s of syms) {
    const size = s.kind === "start" ? 3 : 4;
    ranges.push([pos, pos + size]);
    pos += size;
  }
  // rows: one per byte (start + address first); STOP joins the last row
  const rows: number[][] = [];
  let cur: number[] = [];
  syms.forEach((s, i) => {
    cur.push(i);
    if (s.kind === "ack") {
      rows.push(cur);
      cur = [];
    }
  });
  if (cur.length) {
    if (rows.length) rows[rows.length - 1].push(...cur);
    else rows.push(cur);
  }

  const X0 = 40;
  const dx = 7.6;
  const ROWH = 116;
  const H = rows.length * ROWH + 6;
  const colOf = (s: (typeof syms)[number]) => (s.kind === "start" || s.kind === "stop" ? "var(--brand)" : s.kind === "bit" ? (s.by === "controller" ? "var(--brand)" : ORANGE) : s.ack ? (s.by === "controller" ? "var(--brand)" : ORANGE) : "var(--ink-3)");

  const aria = `I²C transaction at address ${toHex(v.addr, 2)}, ${v.read ? "read" : "write"}. Address byte ${toHex(tr.bytes[0], 2)}. ${tr.addrAck ? "The device acknowledges." : "No device answers: NACK."} ${tr.bytes.length > 1 ? `Data ${tr.bytes.slice(1).map((b) => toHex(b, 2)).join(", ")}.` : ""}`;

  const acks: { l: string; v: string }[] = [];
  syms.forEach((s) => {
    if (s.kind !== "ack") return;
    acks.push({ l: s.byte === 0 ? "Address" : `Data ${s.byte}`, v: s.ack ? "ACK" : "NACK" });
  });

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <HexField label="7-bit address (hex)" value={v.addr} min={0x08} max={0x77} onCommit={(n) => set({ addr: n })} disabled={locked} hint="Type a hex address from 0x08 to 0x77" />
        <Labelled label="Direction">
          <LSeg
            label="Direction"
            value={v.read ? "r" : "w"}
            onChange={(x) => set({ read: x === "r" })}
            disabled={locked}
            options={[
              { value: "w", label: "Write" },
              { value: "r", label: "Read" },
            ]}
          />
        </Labelled>
        <Labelled label="Device at that address">
          <LSeg
            label="Device at that address"
            value={v.present ? "yes" : "no"}
            onChange={(x) => set({ present: x === "yes" })}
            disabled={locked}
            options={[
              { value: "yes", label: "Present" },
              { value: "no", label: "Absent" },
            ]}
          />
        </Labelled>
        <Labelled label="Data bytes">
          <LSeg
            label="Number of data bytes"
            value={nData}
            onChange={(n) => set({ data: n === 1 ? v.data.slice(0, 1) : [v.data[0] ?? 0x1f, v.data[1] ?? 0x2a] })}
            disabled={locked}
            options={[
              { value: 1, label: "1" },
              { value: 2, label: "2" },
            ]}
          />
        </Labelled>
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-3">
        {v.data.map((d, i) => (
          <HexField key={i} label={`${v.read ? "Device sends" : "You send"} byte ${i + 1}`} value={d} onCommit={(n) => set({ data: v.data.map((x, k) => (k === i ? n : x)) })} disabled={locked} />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox={`0 0 360 ${H}`} className="w-full" role="img" aria-label={aria}>
          {rows.map((row, r) => {
            const oy = r * ROWH;
            const first = r === 0 ? 0 : ranges[row[0]][0];
            const last = ranges[row[row.length - 1]][1];
            const ns = last - first;
            const xAt = (i: number) => X0 + (i - first) * dx;
            const yS = oy + 22; // SCL top
            const yD = oy + 62; // SDA top
            const lv = (i: number) => (wave.sda[i] === 1 ? yD : yD + 16);
            const sdaSeg = (a: number, b: number) => {
              let d = `M${f1(xAt(a))} ${lv(a - 1 >= 0 ? a - 1 : a)}`;
              for (let i = a; i < b; i++) d += ` L${f1(xAt(i))} ${lv(i)} L${f1(xAt(i + 1))} ${lv(i)}`;
              return d;
            };
            // groups for the brackets
            const groups: { a: number; b: number; text: string }[] = [];
            row.forEach((si) => {
              const s = syms[si];
              let text = "";
              if (s.kind === "bit") text = s.role === "addr" ? "address" : s.role === "rw" ? "R/W" : `data ${s.byte}`;
              else if (s.kind === "ack") text = s.ack ? "ACK" : "NACK";
              if (!text) return;
              const g = groups[groups.length - 1];
              if (g && g.text === text && s.kind === "bit") g.b = ranges[si][1];
              else groups.push({ a: ranges[si][0], b: ranges[si][1], text });
            });
            return (
              <g key={r}>
                <Trace levels={wave.scl.slice(first, last)} x={X0} y={yS} width={ns * dx} h={16} label="SCL" color="var(--ink-2)" />
                <text x={X0 - 6} y={yD + 13} textAnchor="end" fontSize={14} fill="var(--ink-2)" fontFamily={MONO}>
                  SDA
                </text>
                {r === 0 && <path d={sdaSeg(0, 2)} fill="none" stroke="var(--ink-3)" strokeWidth={2.5} />}
                {row.map((si) => (
                  <path key={si} d={sdaSeg(ranges[si][0], ranges[si][1])} fill="none" stroke={colOf(syms[si])} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray={syms[si].kind === "ack" && !(syms[si] as { ack: boolean }).ack ? "4 3" : undefined} />
                ))}
                {row.map((si) => {
                  const s = syms[si];
                  const [a, b] = ranges[si];
                  return (
                    <text key={`t${si}`} x={f1((xAt(a) + xAt(b)) / 2)} y={yD - 8} fontSize={14} textAnchor="middle" fill="var(--ink)" fontFamily={MONO} fontWeight={s.kind === "bit" ? 400 : 700}>
                      {wave.marks[si].label}
                    </text>
                  );
                })}
                {groups.map((g, k) => (
                  <g key={k}>
                    <path d={`M${f1(xAt(g.a) + 2)} ${yD + 28} L${f1(xAt(g.a) + 2)} ${yD + 33} L${f1(xAt(g.b) - 2)} ${yD + 33} L${f1(xAt(g.b) - 2)} ${yD + 28}`} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} />
                    <text x={f1((xAt(g.a) + xAt(g.b)) / 2)} y={yD + 50} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
                      {g.text}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-1 text-[0.8rem] text-ink-2">
          <span>
            <span aria-hidden className="mr-1.5 inline-block h-2.5 w-4 rounded-sm align-middle" style={{ background: "var(--brand)" }} />
            Controller drives SDA
          </span>
          <span>
            <span aria-hidden className="mr-1.5 inline-block h-2.5 w-4 rounded-sm align-middle" style={{ background: ORANGE }} />
            Target drives SDA
          </span>
          <span>
            <span aria-hidden className="mr-1.5 inline-block h-2.5 w-4 rounded-sm align-middle" style={{ background: "var(--ink-3)" }} />
            Nobody (pulled high)
          </span>
        </div>
        <p className="px-1 pb-1 text-[0.8rem] leading-snug text-ink-3">S = START, P = STOP, A = ACK, N = NACK. Each bit is read while SCL is high.</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Address byte" value={toHex(tr.bytes[0], 2)} accent />
        {acks.map((a) => (
          <Readout key={a.l} label={a.l} value={a.v} />
        ))}
      </div>
      <p className="mt-1.5 text-center text-[0.8rem] text-ink-3">
        {toHex(v.addr, 2)} shifted left by one, then the R/W bit ({v.read ? "1 = read" : "0 = write"}) = {toHex(tr.bytes[0], 2)}.
      </p>
      <div className="mt-3 space-y-2">
        <Note>ACK = the receiver pulls SDA low on the 9th clock. Nobody answering leaves SDA high (the pull-up): a NACK.</Note>
        <Note>SDA and SCL are open-drain with pull-up resistors.</Note>
      </div>
    </div>
  );
}

// ───────────────────────────── SPI ─────────────────────────────

function SpiView({ v, set, locked, lockDevice }: { v: Vals; set: (p: Partial<Vals>) => void; locked: boolean; lockDevice: boolean }) {
  const w = spiWave(v.mosi, v.miso, v.mode);
  const compat = spiCompat(v.mode, v.deviceMode);
  const n = w.sclk.length; // 19
  const X0 = 46;
  const W = 308;
  const dx = W / n;
  const xAt = (i: number) => X0 + i * dx;
  const cpha = v.mode & 1;
  const cpol = v.mode >> 1;
  const dCpha = v.deviceMode & 1;
  const dCpol = v.deviceMode >> 1;
  const idleTxt = (c: number) => (c ? "high" : "low");
  const edgeTxt = (m: Mode) => spiSampleEdge(m);
  const yCS = 20;
  const ySCK = 54;
  const yMO = 104;
  const yMI = 154;
  const dev: number[] = [];
  if (compat === "wrong-edge") {
    const wantRising = edgeTxt(v.deviceMode) === "rising";
    for (let i = 2; i < n - 1; i++) if (w.sclk[i] !== w.sclk[i - 1] && (w.sclk[i] === 1) === wantRising) dev.push(i);
  }
  const bitX = w.sampleAt.map((s) => xAt(s));
  const stroke = { stroke: "var(--surface)", strokeWidth: 4, paintOrder: "stroke" } as const;
  const aria = `SPI byte exchange in mode ${v.mode}: CS goes low, SCLK idles ${idleTxt(cpol)}, MOSI carries ${toHex(v.mosi, 2)} and MISO carries ${toHex(v.miso, 2)}, most significant bit first, sampled on the ${edgeTxt(v.mode)} edge. Device expects mode ${v.deviceMode}: ${compat}.`;

  return (
    <div>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <Labelled label="Controller mode">
          <LSeg
            label="Controller mode"
            value={v.mode}
            onChange={(m) => set({ mode: m as Mode })}
            disabled={locked}
            options={[0, 1, 2, 3].map((m) => ({ value: m, label: String(m) }))}
          />
        </Labelled>
        {!lockDevice && (
          <Labelled label="Device expects">
            <LSeg label="Device expects mode" value={v.deviceMode} onChange={(m) => set({ deviceMode: m as Mode })} disabled={locked} options={[0, 1, 2, 3].map((m) => ({ value: m, label: String(m) }))} />
          </Labelled>
        )}
        <HexField label="MOSI byte (hex)" value={v.mosi} onCommit={(b) => set({ mosi: b })} disabled={locked} />
        <HexField label="MISO byte (hex)" value={v.miso} onCommit={(b) => set({ miso: b })} disabled={locked} />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 210" className="w-full" role="img" aria-label={aria}>
          {bitX.map((x, i) => (
            <line key={i} x1={f1(x)} x2={f1(x)} y1={ySCK + 8} y2={yMI + 18} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="3 3" />
          ))}
          <Trace levels={w.cs} x={X0} y={yCS} width={W} h={16} label="CS" color="var(--ink-2)" />
          <Trace levels={w.sclk} x={X0} y={ySCK} width={W} h={16} label="SCLK" color="var(--ink)" />
          <Trace levels={w.mosi} x={X0} y={yMO} width={W} h={16} label="MOSI" />
          <Trace levels={w.miso} x={X0} y={yMI} width={W} h={16} label="MISO" color={ORANGE} />
          {bitX.map((x, i) => (
            <circle key={`d${i}`} cx={f1(x)} cy={ySCK + 8} r={4} fill="var(--brand)" stroke="var(--surface)" strokeWidth={1.5} />
          ))}
          {dev.map((i) => (
            <circle key={`x${i}`} cx={f1(xAt(i))} cy={ySCK + 8} r={8} fill="none" stroke="var(--bad)" strokeWidth={2} />
          ))}
          {bitX.map((x, i) => (
            <g key={`b${i}`}>
              <text x={f1(x)} y={yMO - 7} fontSize={14} textAnchor="middle" fill="var(--ink)" fontFamily={MONO} {...stroke}>
                {w.mosiBits[i]}
              </text>
              <text x={f1(x)} y={yMI - 7} fontSize={14} textAnchor="middle" fill="var(--ink)" fontFamily={MONO} {...stroke}>
                {w.misoBits[i]}
              </text>
            </g>
          ))}
          <text x={f1(bitX[0])} y={200} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
            MSB
          </text>
          <text x={f1(bitX[7])} y={200} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
            LSB
          </text>
        </svg>
        <p className="px-1 pb-1 text-[0.8rem] leading-snug text-ink-3">
          Green dots = where the controller samples. {compat === "wrong-edge" ? "Red rings = where the device samples with its mode: not where the data is stable. " : ""}CS low = this device is selected. Bits go out MSB first.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Controller" value={`mode ${v.mode}`} accent />
        <Readout label="CPOL" value={`${cpol} (idle ${idleTxt(cpol)})`} />
        <Readout label="CPHA" value={`${cpha} (${cpha ? "2nd" : "1st"} edge)`} />
        <Readout label="Samples on" value={`${edgeTxt(v.mode)} edge`} />
      </div>
      {!lockDevice ? null : (
        <p className="mt-2 text-center text-[0.82rem] text-ink-2">
          The device expects mode {v.deviceMode} (CPOL {dCpol}, CPHA {dCpha}).
        </p>
      )}
      <div className="mt-3">
        {compat === "match" && <Note tone="accent">✓ Match: controller and device use the same mode, so both sample the bits where they are stable.</Note>}
        {compat === "idle-only" && <Note>Same sampling edge, different idle level: many devices accept both, but follow the datasheet.</Note>}
        {compat === "wrong-edge" && (
          <p className="rounded-xl border border-[var(--bad)] bg-surface px-3.5 py-2.5 text-[0.88rem] leading-snug text-ink" aria-live="polite">
            <b className="text-[var(--bad)]">Wrong edge:</b> the device samples on the edge where your controller changes the data: bits come out wrong (often shifted by one).
          </p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── the widget ─────────────────────────────

export function Proto({ props, onChange, revealed }: WidgetProps<ProtoProps>) {
  const locked = Boolean(revealed);
  const protocols: ProtoId[] = (props.protocols ?? ["uart", "i2c", "spi"]).filter((p): p is ProtoId => p === "uart" || p === "i2c" || p === "spi");
  const list: ProtoId[] = protocols.length ? protocols : ["uart", "i2c", "spi"];
  const startProto: ProtoId = list.includes(props.proto as ProtoId) ? (props.proto as ProtoId) : list[0];
  const byte8 = (n: number | undefined, d: number) => clamp(Math.round(n ?? d), 0, 255);
  const [vals, setVals] = useState<Vals>({
    proto: startProto,
    byte: byte8(props.byte, 0x41),
    parity: "none",
    baud: 9600,
    addr: clamp(Math.round(props.addr ?? 0x48), 0x08, 0x77),
    read: props.read ?? false,
    present: props.present ?? true,
    data: (props.data && props.data.length ? props.data.slice(0, 2) : [0x1f]).map((d) => byte8(d, 0)),
    mode: asMode(props.mode, 0),
    deviceMode: asMode(props.deviceMode, 0),
    mosi: byte8(props.mosi, 0xa5),
    miso: byte8(props.miso, 0x3c),
  });
  const set = (p: Partial<Vals>) => {
    const next = { ...vals, ...p };
    setVals(next);
    onChange?.(toState(next));
  };

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}
      {list.length > 1 && (
        <div className="mb-3">
          <LSeg
            label="Protocol"
            value={vals.proto}
            onChange={(p) => set({ proto: p })}
            options={list.map((p) => ({ value: p, label: p === "uart" ? "UART" : p === "i2c" ? "I²C" : "SPI" }))}
          />
        </div>
      )}
      {vals.proto === "uart" && <UartView v={vals} set={set} locked={locked} />}
      {vals.proto === "i2c" && <I2cView v={vals} set={set} locked={locked} />}
      {vals.proto === "spi" && <SpiView v={vals} set={set} locked={locked} lockDevice={Boolean(props.lockDevice)} />}
      <ToyNote>Idealised logic levels and timing; real lines have rise times, and I²C runs at 100 or 400 kHz (standard / fast mode, typical).</ToyNote>
    </div>
  );
}

/** goal: { proto, byte, parity, addr, read, present, addrByte, compat, mode } */
export function checkProto(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as ProtoState | undefined;
  if (!s || typeof s.proto !== "string") return false;
  for (const k of ["proto", "byte", "parity", "addr", "read", "present", "addrByte", "compat", "mode"] as const) {
    if (k in goal && goal[k] !== undefined && s[k] !== goal[k]) return false;
  }
  return true;
}
