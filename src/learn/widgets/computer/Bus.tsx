"use client";

import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Send } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { bin, Btn, Caption, clamp, Icon, Note, Seg, Stepper } from "./ui";

export interface BusProps {
  /** Starting RAM values for addresses 0–13. */
  ram?: number[];
  /** Attach a screen at address 14 and a keyboard at address 15. Default true. */
  devices?: boolean;
  /** Starting request in the CPU's panel. */
  initial?: { op?: "read" | "write"; addr?: number; data?: number };
}

interface Txn {
  op: "read" | "write";
  addr: number;
  data: number;
  device: "ram" | "screen" | "keyboard" | "none";
}

export interface BusState {
  last: Txn | null;
  count: number;
  ram: number[];
  /** Codes written to the screen so far. */
  screen: number[];
  /** The value the CPU received from its latest read. */
  cpuGot: number | null;
}

const RAM_SIZE = 14;
const SCREEN = 14;
const ch = (c: number) => (c >= 32 && c < 127 ? String.fromCharCode(c) : "·");

/** CPU ↔ memory and devices over a shared bus: address lines, data lines and a control line. */
export function Bus({ props, onChange, revealed }: WidgetProps<BusProps>) {
  const devices = props.devices ?? true;
  const [op, setOp] = useState<"read" | "write">(props.initial?.op ?? "read");
  const [addr, setAddr] = useState(props.initial?.addr ?? 0);
  const [data, setData] = useState(String(props.initial?.data ?? ""));
  const [ram, setRam] = useState<number[]>(() => Array.from({ length: RAM_SIZE }, (_, i) => clamp(props.ram?.[i] ?? 0, 0, 255)));
  const [screen, setScreen] = useState<number[]>([]);
  const [key, setKey] = useState<number>(0);
  const [cpuGot, setCpuGot] = useState<number | null>(null);
  const [last, setLast] = useState<Txn | null>(null);
  const [count, setCount] = useState(0);
  const [anim, setAnim] = useState(0); // 0 idle · 1 address · 2 control · 3 data (done)
  const locked = Boolean(revealed);
  const maxAddr = devices ? 15 : RAM_SIZE - 1;

  useEffect(() => {
    if (anim === 0 || anim >= 3) return;
    const t = setTimeout(() => setAnim(anim + 1), 700);
    return () => clearTimeout(t);
  }, [anim]);

  const num = Number(data);
  const valid = op === "read" || (data.trim() !== "" && Number.isInteger(num) && num >= 0 && num <= 255);
  const deviceFor = (a: number): Txn["device"] => (a < RAM_SIZE ? "ram" : !devices ? "none" : a === SCREEN ? "screen" : "keyboard");

  const send = () => {
    if (locked || !valid) return;
    const device = deviceFor(addr);
    let nextRam = ram;
    let nextScreen = screen;
    let got = cpuGot;
    let value = 0;
    if (op === "write") {
      value = num;
      if (device === "ram") {
        nextRam = ram.slice();
        nextRam[addr] = value;
      } else if (device === "screen") nextScreen = [...screen, value].slice(-12);
    } else {
      value = device === "ram" ? ram[addr] : device === "keyboard" ? key : 0;
      got = value;
    }
    const txn: Txn = { op, addr, data: value, device };
    setRam(nextRam);
    setScreen(nextScreen);
    setCpuGot(got);
    setLast(txn);
    setCount(count + 1);
    setAnim(1);
    onChange?.({ last: txn, count: count + 1, ram: nextRam, screen: nextScreen, cpuGot: got } satisfies BusState);
  };

  const show = last && anim > 0 ? last : null;
  const addrBits = show && anim >= 1 ? bin(show.addr, 4) : null;
  const ctl = show && anim >= 2 ? show.op : null;
  const dataBits = show && anim >= 3 ? bin(show.data, 8) : null;
  const target = show && anim >= 1 ? show.device : null;

  const caption = (() => {
    if (!show) return "Choose Read or Write, an address and (for a write) a value. Then send the request over the bus.";
    const a = show.addr;
    if (anim === 1) return `The CPU puts address ${a} on the address lines (${bin(a, 4)}). Every device on the bus sees it, but only the owner of address ${a} will answer.`;
    if (anim === 2) return `The CPU sets the control line to ${show.op.toUpperCase()}, so the owner knows what is wanted.`;
    if (show.op === "write") {
      if (show.device === "ram") return `The CPU puts ${show.data} on the data lines and memory stores it at address ${a}. Done.`;
      if (show.device === "screen") return `Address 14 isn't memory: it belongs to the screen. It takes ${show.data} off the data lines and draws “${ch(show.data)}”.`;
      if (show.device === "keyboard") return "Address 15 belongs to the keyboard, which ignores writes. Nothing changes.";
      return `Nothing owns address ${a}, so the write goes nowhere.`;
    }
    if (show.device === "ram") return `Memory puts the value at address ${a} (${show.data}) on the data lines, and the CPU copies it in.`;
    if (show.device === "keyboard") return show.data ? `Address 15 belongs to the keyboard. It puts the code of the last key pressed, ${show.data} (“${ch(show.data)}”), on the data lines.` : "Address 15 belongs to the keyboard. No key has been pressed, so it answers 0.";
    return `Address ${a} belongs to the screen, which has nothing to send back: the CPU reads 0.`;
  })();

  return (
    <div className="w-full">
      {/* CPU panel */}
      <div className={`rounded-2xl border p-3 transition-colors ${show && anim < 3 ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface-2"}`}>
        <div className="flex items-center gap-2">
          <span className="text-brand">
            <Icon name="cpu" className="h-5 w-5" />
          </span>
          <p className="font-semibold text-ink">CPU</p>
          <span className="ml-auto text-xs text-ink-3">
            last read: <b className="font-mono text-ink">{cpuGot ?? "–"}</b>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end justify-center gap-x-4 gap-y-3">
          <div className="flex flex-col items-center gap-1">
            <Caption>Request</Caption>
            <Seg
              label="Read or write"
              value={op}
              disabled={locked}
              onChange={setOp}
              options={[
                { value: "read", label: "Read" },
                { value: "write", label: "Write" },
              ]}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <Caption>Address</Caption>
            <Stepper label="Address" value={addr} min={0} max={maxAddr} disabled={locked} onChange={setAddr} />
          </div>
          {op === "write" && (
            <div className="flex flex-col items-center gap-1">
              <Caption>Data (0–255)</Caption>
              <input
                className="input !h-10 w-24 text-center font-mono font-semibold"
                inputMode="numeric"
                value={data}
                disabled={locked}
                aria-label="Data to write"
                placeholder="0–255"
                onChange={(e) => setData(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
              />
            </div>
          )}
          <Btn primary onClick={send} disabled={locked || !valid || (anim > 0 && anim < 3)}>
            <Send className="h-4 w-4" /> Send
          </Btn>
        </div>
      </div>

      {/* bus lanes */}
      <div className="relative mx-auto my-2 grid gap-1.5 rounded-xl border border-line bg-surface px-3 py-2.5">
        <Lane label="Address" sub="4 lines" bits={addrBits} width={4} value={show && anim >= 1 ? String(show.addr) : null} arrow={addrBits ? "down" : null} />
        <Lane label="Data" sub="8 lines" bits={dataBits} width={8} value={show && anim >= 3 ? String(show.data) : null} arrow={dataBits ? (show!.op === "write" ? "down" : "up") : null} />
        <div className="flex items-center gap-2">
          <div className="w-[3.4rem] shrink-0 sm:w-[4.2rem]">
            <p className="text-[12px] font-semibold text-ink">Control</p>
            <p className="text-[10px] text-ink-3">read/write</p>
          </div>
          <div className="flex gap-1.5">
            {(["read", "write"] as const).map((c) => (
              <span key={c} className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold uppercase ${ctl === c ? "bg-primary text-primary-ink" : "border border-line text-ink-3"}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* devices on the bus */}
      <div className={`grid gap-2 ${devices ? "sm:grid-cols-[1fr_auto]" : ""}`}>
        <Device title="Memory" sub="addr 0–13" icon="ram" on={target === "ram"}>
          <div className="grid grid-cols-7 gap-1">
            {ram.map((v, i) => {
              const hit = show && anim >= 1 && show.addr === i;
              return (
                <span key={i} className={`flex min-h-10 flex-col items-center justify-center rounded-md border font-mono ${hit ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
                  <span className="text-[9px] leading-none text-ink-3">{i}</span>
                  <span className="text-[0.85rem] font-semibold leading-tight text-ink">{v}</span>
                </span>
              );
            })}
          </div>
        </Device>
        {devices && (
          <div className="grid grid-cols-2 gap-2 sm:w-[15rem] sm:grid-cols-1">
            <Device title="Screen" sub="addr 14" icon="screen" on={target === "screen"}>
              <div className="flex h-10 items-center overflow-hidden rounded-md bg-[#0a0a0a] px-2 font-mono text-[0.95rem] font-semibold tracking-wider text-[#a3e635]">
                {screen.map(ch).join("")}
                <span className="ml-px inline-block h-4 w-2 animate-pulse bg-[#a3e635]/70" />
              </div>
            </Device>
            <Device title="Keyboard" sub="addr 15" icon="keyboard" on={target === "keyboard"}>
              <div className="flex gap-1">
                {["A", "B", "C"].map((k) => {
                  const c = k.charCodeAt(0);
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={locked}
                      onClick={() => setKey(c)}
                      aria-pressed={key === c}
                      className={`h-10 flex-1 rounded-md border font-mono text-sm font-semibold transition-colors ${key === c ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </Device>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Note tone={show ? "accent" : "plain"}>{caption}</Note>
      </div>
    </div>
  );
}

function Lane({ label, sub, bits, width, value, arrow }: { label: string; sub: string; bits: string | null; width: number; value: string | null; arrow: "up" | "down" | null }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-[3.4rem] shrink-0 sm:w-[4.2rem]">
        <p className="text-[12px] font-semibold text-ink">{label}</p>
        <p className="text-[10px] text-ink-3">{sub}</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-[2px] sm:gap-1.5">
        {Array.from({ length: width }, (_, i) => {
          const on = bits?.[i] === "1";
          return (
            <span key={i} className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[9px] sm:h-7 sm:w-7 sm:text-[10px] font-semibold transition-colors ${on ? "bg-primary text-primary-ink shadow-[0_0_0_3px_var(--brand-soft)]" : bits ? "bg-surface-2 text-ink-3" : "bg-surface-2 text-transparent"}`}>
              {bits ? bits[i] : "0"}
            </span>
          );
        })}
      </div>
      <span className="flex w-11 shrink-0 items-center justify-end gap-0.5 font-mono text-sm font-semibold text-ink sm:w-14 sm:gap-1">
        {arrow === "down" && <ArrowDown className="h-3.5 w-3.5 text-brand" aria-label="from the CPU" />}
        {arrow === "up" && <ArrowUp className="h-3.5 w-3.5 text-brand" aria-label="to the CPU" />}
        {value ?? ""}
      </span>
    </div>
  );
}

function Device({ title, sub, icon, on, children }: { title: string; sub: string; icon: string; on: boolean; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 rounded-xl border p-2.5 transition-colors ${on ? "border-[var(--brand)] bg-tint shadow-[0_0_0_3px_var(--brand-soft)]" : "border-line bg-surface-2"}`}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className={on ? "text-brand" : "text-ink-3"}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <p className="text-[0.8rem] font-semibold text-ink">{title}</p>
        <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-ink-3">{sub}</span>
      </div>
      {children}
    </div>
  );
}

/** goal: { last: { op, addr, data? } } (the latest transaction), { screen: "A" } (screen text ends with it) and/or { ram: { addr: v } }. */
export function checkBus(state: unknown, goal: Record<string, unknown>) {
  const s = state as BusState | undefined;
  if (!s) return false;
  let any = false;
  if (goal.last && typeof goal.last === "object") {
    any = true;
    const g = goal.last as Partial<Txn>;
    if (!s.last) return false;
    if (g.op !== undefined && s.last.op !== g.op) return false;
    if (g.addr !== undefined && s.last.addr !== g.addr) return false;
    if (g.data !== undefined && s.last.data !== g.data) return false;
  }
  if (typeof goal.screen === "string") {
    any = true;
    if (!s.screen.map(ch).join("").endsWith(goal.screen)) return false;
  }
  if (goal.ram && typeof goal.ram === "object") {
    any = true;
    for (const [a, v] of Object.entries(goal.ram as Record<string, number>)) if (s.ram[Number(a)] !== v) return false;
  }
  return any;
}
