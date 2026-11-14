"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { MEMORY_MAP, PERIPHERALS, GPIO_REGS, lookupAddr, parseAddr, toHexGrouped } from "./sim";
import { Btn, Caption, Note, Readout, Seg, Slider, ToyNote } from "./ui";

/** Locks a group of controls (the Seg from ui.tsx has no disabled prop). */
function Lock({ disabled, children }: { disabled?: boolean; children: React.ReactNode }) {
  return (
    <fieldset disabled={disabled} className={`m-0 min-w-0 border-0 p-0 ${disabled ? "opacity-60" : ""}`}>
      {children}
    </fieldset>
  );
}

// ───────────────────────────── emb-mcu: block diagram ─────────────────────────────

interface Block {
  id: string;
  name: string;
  does: string;
  typical: string;
  pc: string;
}

const BLOCKS: Block[] = [
  { id: "cpu", name: "CPU core", does: "Runs your program: it fetches an instruction, decodes it and executes it. Small MCU cores are simple: usually one core, often no cache.", typical: "typical: 48–480 MHz", pc: "the CPU, but at MHz rather than GHz, and one core instead of many." },
  { id: "flash", name: "Flash", does: "Holds your program and its constants, and keeps them with the power off. The CPU can run code straight from it.", typical: "typical: 32 KB to 2 MB", pc: "the SSD, but the MCU runs code straight from flash." },
  { id: "sram", name: "SRAM", does: "Working memory for variables and the stack. It is fast and simple, and everything in it is lost when the power goes.", typical: "typical: 8 KB to 1 MB", pc: "RAM, but kilobytes, not gigabytes." },
  { id: "bus", name: "Bus matrix", does: "Wires and switches that link the CPU, memories, DMA and peripherals. Every address goes through it, so one memory map covers everything.", typical: "typical: 32 bits wide, at the core clock", pc: "the chipset and PCIe links, but all inside one chip." },
  { id: "nvic", name: "Interrupt controller", does: "Lets hardware events interrupt your program. It picks the most urgent request and makes the CPU jump to its handler.", typical: "typical: 16 to 240 sources, a few priority levels", pc: "the interrupt controller (APIC), which the OS hides from you." },
  { id: "dma", name: "DMA", does: "Copies data between peripherals and memory without the CPU. The CPU is free to do other work meanwhile.", typical: "typical: 4 to 16 channels", pc: "DMA engines inside disk and network controllers." },
  { id: "clock", name: "Clocks", does: "Makes the beat that steps everything: an internal oscillator or a crystal, multiplied up by a PLL. Each peripheral can be switched off to save power.", typical: "typical: 8–25 MHz crystal, core at 48–480 MHz", pc: "also a PLL, but you rarely touch it." },
  { id: "debug", name: "Debug port", does: "Lets a probe halt the core, read memory and set breakpoints through a few pins (SWD or JTAG). It is also how you load your program.", typical: "typical: 2 wires (SWD)", pc: "no direct equivalent: a PC debugger is software on the same machine." },
  { id: "gpio", name: "GPIO", does: "General-purpose pins you control bit by bit: read a button, drive an LED. Each pin has its own mode, pull and output settings.", typical: "typical: 16 to 100+ pins", pc: "no direct equivalent: pins you control bit by bit." },
  { id: "timers", name: "Timers", does: "Counters that run from the clock. They time events, count pulses and make PWM waveforms.", typical: "typical: 2 to 15 timers, 16 or 32 bits", pc: "high-resolution timers, but not ones that drive pins directly." },
  { id: "serial", name: "UART · I²C · SPI", does: "Ways to talk to other chips: UART (two wires, point to point), I²C (two shared wires, many devices) and SPI (four wires, fast).", typical: "typical: UART 9.6–115.2 kbaud, I²C 100–400 kHz, SPI 1–50 MHz", pc: "USB and Ethernet fill a similar role, with a controller doing the work." },
  { id: "adc", name: "ADC", does: "Turns a voltage into a number, so the chip can read sensors. A 12-bit ADC splits its range into 4096 steps.", typical: "typical: 12 bits, up to a few million samples per second", pc: "the sound-card input is the closest thing." },
];

const GROUPS: { title: string; ids: string[] }[] = [
  { title: "Core side", ids: ["cpu", "nvic", "debug", "clock"] },
  { title: "Memories", ids: ["flash", "sram"] },
  { title: "The bus", ids: ["bus", "dma"] },
  { title: "Peripherals", ids: ["gpio", "timers", "serial", "adc"] },
];

const COMPARE: { what: string; mcu: string; pc: string }[] = [
  { what: "Clock", mcu: "tens to hundreds of MHz", pc: "a few GHz" },
  { what: "Program storage", mcu: "KB to MB of flash", pc: "TB of SSD" },
  { what: "RAM", mcu: "KB", pc: "GB" },
  { what: "Power", mcu: "milliwatts", pc: "tens to hundreds of W" },
  { what: "OS", mcu: "none, or a small RTOS", pc: "Windows, macOS, Linux" },
  { what: "Start-up", mcu: "milliseconds", pc: "seconds" },
  { what: "Price", mcu: "cents to a few dollars", pc: "hundreds of dollars" },
];

export interface McuProps {
  task?: string;
  initial?: string;
  view?: "explore" | "compare";
}

export interface McuState {
  selected: string | null;
  visited: string[];
  view: "explore" | "compare";
}

export function Mcu({ props, onChange, revealed }: WidgetProps<McuProps>) {
  const first = BLOCKS.some((b) => b.id === props.initial) ? (props.initial as string) : null;
  const [selected, setSelected] = useState<string | null>(first);
  const [visited, setVisited] = useState<string[]>(first ? [first] : []);
  const [view, setView] = useState<"explore" | "compare">(props.view ?? "explore");
  const locked = Boolean(revealed);
  const block = BLOCKS.find((b) => b.id === selected) ?? null;

  const pick = (id: string) => {
    const nv = visited.includes(id) ? visited : [...visited, id];
    setSelected(id);
    setVisited(nv);
    onChange?.({ selected: id, visited: nv, view } satisfies McuState);
  };
  const pickView = (v: "explore" | "compare") => {
    setView(v);
    onChange?.({ selected, visited, view: v } satisfies McuState);
  };

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-center text-[0.9rem] text-ink-2">{props.task}</p>}
      <div className="flex justify-center">
        <Seg
          label="View"
          value={view}
          onChange={pickView}
          options={[
            { value: "explore", label: "Explore" },
            { value: "compare", label: "MCU vs PC" },
          ]}
        />
      </div>

      {view === "explore" ? (
        <>
          <Lock disabled={locked}>
            <div className="mt-3 rounded-2xl border-2 border-[var(--line-strong)] bg-surface p-2.5">
              <Caption className="mb-2 text-center">One chip</Caption>
              <div className="flex flex-col gap-2.5">
                {GROUPS.map((g) => (
                  <div key={g.title}>
                    <p className="mb-1 text-[0.78rem] font-medium text-ink-3">{g.title}</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {g.ids.map((id) => {
                        const b = BLOCKS.find((x) => x.id === id)!;
                        const on = selected === id;
                        const seen = visited.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => pick(id)}
                            className={`min-h-12 rounded-xl border px-2 py-1.5 text-left text-[0.85rem] font-medium leading-tight transition-colors disabled:cursor-not-allowed ${
                              on ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface-2 text-ink hover:border-[var(--line-strong)]"
                            }`}
                          >
                            {b.name}
                            {seen && !on && <span className="ml-1 text-[0.75rem] text-ink-2">· seen</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Lock>
          <div className="mt-3">
            {block ? (
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-[0.95rem] font-semibold text-ink">{block.name}</p>
                <p className="mt-1 text-[0.88rem] leading-snug text-ink-2">{block.does}</p>
                <p className="mt-2 font-mono text-[0.82rem] text-ink">{block.typical}</p>
                <p className="mt-1 text-[0.85rem] leading-snug text-ink-2">
                  <b className="text-ink">In a PC:</b> {block.pc}
                </p>
              </div>
            ) : (
              <Note>Tap a block to see what it does.</Note>
            )}
          </div>
          <div className="mt-2 flex justify-center">
            <Readout label="Blocks seen" value={`${visited.length} of ${BLOCKS.length}`} />
          </div>
        </>
      ) : (
        <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
          <table className="w-full table-fixed border-collapse text-left text-[0.8rem] leading-snug">
            <caption className="sr-only">Typical microcontroller against typical PC</caption>
            <thead>
              <tr className="text-ink">
                <th scope="col" className="w-[26%] pb-1.5 pr-1 font-semibold">
                  Typical
                </th>
                <th scope="col" className="w-[38%] pb-1.5 pr-1 font-semibold">
                  Microcontroller
                </th>
                <th scope="col" className="w-[36%] pb-1.5 font-semibold">
                  PC
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.what} className="border-t border-line align-top text-ink-2">
                  <th scope="row" className="break-words py-1.5 pr-1 font-medium text-ink">
                    {r.what}
                  </th>
                  <td className="break-words py-1.5 pr-1">{r.mcu}</td>
                  <td className="break-words py-1.5">{r.pc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ToyNote>Block diagram of a generic Arm Cortex-M class chip; real parts have more blocks, and every figure here is typical, not exact.</ToyNote>
    </div>
  );
}

/** goal: { selected?: string, visited?: string[] } */
export function checkMcu(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as McuState | undefined;
  if (!s) return false;
  if (typeof goal.selected === "string" && s.selected !== goal.selected) return false;
  if (Array.isArray(goal.visited) && !goal.visited.every((id) => s.visited.includes(id as string))) return false;
  return true;
}

// ───────────────────────────── emb-blink ─────────────────────────────

const DELAYS = [50, 100, 125, 250, 500, 1000];
const GLOW = "var(--elec-glow, #f5c518)";

export interface BlinkProps {
  delayMs?: number;
  bug?: boolean;
}

export interface BlinkState {
  delayMs: number;
  secondDelay: boolean;
  freqHz: number;
  appearsOn: boolean;
}

const blinkState = (delayMs: number, secondDelay: boolean): BlinkState => ({
  delayMs,
  secondDelay,
  freqHz: secondDelay ? 1000 / (2 * delayMs) : 0,
  appearsOn: !secondDelay,
});

const fx = (n: number) => n.toFixed(1);

export function Blink({ props, onChange, revealed }: WidgetProps<BlinkProps>) {
  const [delayMs, setDelayMs] = useState(DELAYS.includes(props.delayMs ?? 500) ? (props.delayMs ?? 500) : 500);
  // The "bug" variant starts with the second delay deleted, as the lesson describes.
  const [secondDelay, setSecondDelay] = useState(!props.bug);
  const [time, setTime] = useState(600);
  const locked = Boolean(revealed);

  const report = (d: number, s: boolean) => onChange?.(blinkState(d, s));
  const pickDelay = (d: number) => {
    setDelayMs(d);
    report(d, secondDelay);
  };
  const toggleSecond = () => {
    setSecondDelay(!secondDelay);
    report(delayMs, !secondDelay);
  };

  // pin trace over 0..2000 ms
  const X0 = 100;
  const W = 248;
  const xOf = (t: number) => X0 + (t / 2000) * W;
  const yHi = 22;
  const yLo = 50;
  let d = `M${fx(X0)} ${yHi}`;
  if (secondDelay) {
    const period = 2 * delayMs;
    for (let t = 0; t < 2000; t += period) {
      const tOff = Math.min(t + delayMs, 2000);
      const tEnd = Math.min(t + period, 2000);
      d += `L${fx(xOf(t))} ${yHi}L${fx(xOf(tOff))} ${yHi}`;
      if (tOff < 2000) d += `L${fx(xOf(tOff))} ${yLo}L${fx(xOf(tEnd))} ${yLo}`;
      if (tEnd < 2000) d += `L${fx(xOf(tEnd))} ${yHi}`;
    }
  } else {
    d += `L${fx(X0 + W)} ${yHi}`;
  }
  const on = secondDelay ? time % (2 * delayMs) < delayMs : true;
  const freq = secondDelay ? 1000 / (2 * delayMs) : 0;
  const cx = xOf(time);
  const ticks = [0, 500, 1000, 1500, 2000];

  const codeLines: { text: string; struck?: boolean }[] = [
    { text: "int main(void) {" },
    { text: "  led_init();  // pin = output" },
    { text: "  while (1) {" },
    { text: "    led_on();" },
    { text: `    delay_ms(${delayMs});` },
    { text: "    led_off();" },
    { text: `    delay_ms(${delayMs});`, struck: !secondDelay },
    { text: "  }" },
    { text: "}" },
  ];

  return (
    <div className="w-full">
      <pre className="overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-2 p-3 font-mono text-[0.8rem] leading-relaxed text-ink" aria-label="The blink program in C">
        {codeLines.map((l, i) => (
          <span key={i} className={`block ${l.struck ? "text-ink-2 line-through" : ""}`}>
            {l.text}
          </span>
        ))}
      </pre>

      <Lock disabled={locked}>
        <div className="mt-3 flex flex-col items-center gap-2">
          <Seg label="Delay in milliseconds" value={delayMs} onChange={pickDelay} options={DELAYS.map((v) => ({ value: v, label: `${v} ms` }))} />
          {props.bug && (
            <Btn on={secondDelay} onClick={toggleSecond}>
              Second delay: {secondDelay ? "on" : "off"}
            </Btn>
          )}
        </div>
        <Slider className="mt-2" label="Time" value={time} min={0} max={2000} step={10} onChange={setTime} format={(v) => `${(v / 1000).toFixed(2)} s`} />
      </Lock>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 112" className="w-full" role="img" aria-label={`Pin level over 2 seconds with a ${delayMs} millisecond delay${secondDelay ? `: a square wave at ${+freq.toFixed(2)} hertz` : " and no second delay: the pin stays high"}. At ${(time / 1000).toFixed(2)} seconds the LED is ${on ? "on" : "off"}.`}>
          <circle cx={24} cy={36} r={14} fill={on ? GLOW : "var(--surface-2)"} stroke="var(--line-strong)" strokeWidth={2} />
          {on && <circle cx={24} cy={36} r={19} fill="none" stroke={GLOW} strokeWidth={2} opacity={0.5} />}
          <text x={X0 - 8} y={yHi + 5} textAnchor="end" fontSize={14} fill="var(--ink-2)">
            high
          </text>
          <text x={X0 - 8} y={yLo + 5} textAnchor="end" fontSize={14} fill="var(--ink-2)">
            low
          </text>
          <line x1={X0} y1={yHi} x2={X0 + W} y2={yHi} stroke="var(--line-strong)" strokeDasharray="2 4" />
          <line x1={X0} y1={yLo} x2={X0 + W} y2={yLo} stroke="var(--line-strong)" strokeDasharray="2 4" />
          <path d={d} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
          <line x1={X0} y1={64} x2={X0 + W} y2={64} stroke="var(--ink-3)" />
          {ticks.map((t, i) => (
            <g key={t}>
              <line x1={xOf(t)} y1={64} x2={xOf(t)} y2={70} stroke="var(--ink-3)" />
              <text x={xOf(t)} y={90} textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"} fontSize={14} fill="var(--ink-2)">
                {t === 0 ? "0" : t === 2000 ? "2 s" : `${t / 1000}`}
              </text>
            </g>
          ))}
          <line x1={cx} y1={10} x2={cx} y2={70} stroke="var(--ink)" strokeWidth={1.5} />
          <text x={24} y={76} textAnchor="middle" fontSize={14} fill="var(--ink)">
            {on ? "on" : "off"}
          </text>
          <text x={X0 + W / 2} y={108} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
            time
          </text>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Period" value={secondDelay ? `${2 * delayMs} ms` : `${delayMs} ms`} accent />
        <Readout label="Blink rate" value={secondDelay ? `${+freq.toFixed(2)} Hz` : "none you can see"} />
        <Readout label="On" value={secondDelay ? "50%" : "about 100%"} />
      </div>
      <div className="mt-2">
        <Note>{secondDelay ? `The LED is on for ${delayMs} ms, then off for ${delayMs} ms. A full blink takes ${2 * delayMs} ms.` : "Off for about 1 µs each loop: far too short to see, so the LED looks always on."}</Note>
      </div>
      <ToyNote>Simplified: led_on/led_off and the loop itself take about a microsecond, ignored here.</ToyNote>
    </div>
  );
}

/** goal: { freqHz?: number, secondDelay?: boolean } */
export function checkBlink(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as BlinkState | undefined;
  if (!s) return false;
  if (typeof goal.freqHz === "number" && Math.abs(s.freqHz - goal.freqHz) > 1e-9) return false;
  if (typeof goal.secondDelay === "boolean" && s.secondDelay !== goal.secondDelay) return false;
  return true;
}

// ───────────────────────────── emb-memmap ─────────────────────────────

const DEFAULT_PRESETS = [0x0000_0000, 0x2000_0000, 0x4002_0014, 0xe000_e100, 0x1000_0000];
const MAP_ORDER = ["system", "periph", "sram", "flash"];

export interface MemMapProps {
  address?: number;
  presets?: number[];
  showRegs?: boolean;
  task?: string;
}

export interface MemMapState {
  address: number;
  region: string | null;
  peripheral: string | null;
  reg: string | null;
}

const memState = (addr: number): MemMapState => {
  const i = lookupAddr(addr);
  return { address: i.addr, region: i.region?.id ?? null, peripheral: i.peripheral?.id ?? null, reg: i.reg };
};

export function MemMap({ props, onChange, revealed }: WidgetProps<MemMapProps>) {
  const start = props.address ?? 0x2000_0000;
  const presets = props.presets ?? DEFAULT_PRESETS;
  const [addr, setAddr] = useState(start);
  const [text, setText] = useState(toHexGrouped(start));
  const [bad, setBad] = useState(false);
  const locked = Boolean(revealed);
  const info = lookupAddr(addr);

  const go = (a: number) => {
    setAddr(a);
    setText(toHexGrouped(a));
    setBad(false);
    onChange?.(memState(a));
  };
  const submit = () => {
    const a = parseAddr(text);
    if (a === null) {
      setBad(true);
      return;
    }
    go(a);
  };

  const gpioa = PERIPHERALS.find((p) => p.id === "gpioa")!;
  const regPeriph = info.peripheral ?? (props.showRegs ? gpioa : null);
  const showRegs = props.showRegs !== false && regPeriph !== null;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-center text-[0.9rem] text-ink-2">{props.task}</p>}
      <Lock disabled={locked}>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="min-w-0 flex-1 basis-40">
            <span className="text-xs text-ink-3">Address (hex)</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x4002_0014"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={bad}
              className="mt-1 block min-h-10 w-full rounded-lg border border-line bg-surface px-3 font-mono text-[0.9rem] text-ink"
            />
          </label>
          <Btn primary onClick={submit}>
            Look up
          </Btn>
        </form>
        {bad && (
          <p className="mt-1 text-[0.85rem] text-[var(--bad)]" role="alert">
            Type a hex address like 0x2000_0000
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-pressed={p === addr}
              className={`min-h-10 rounded-full border px-3 font-mono text-[0.78rem] transition-colors ${p === addr ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
            >
              {toHexGrouped(p)}
            </button>
          ))}
        </div>
      </Lock>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
        <Caption className="mb-1.5">Memory map (not to scale), high addresses at the top</Caption>
        <div className="flex flex-col gap-1">
          {MAP_ORDER.map((id, i) => {
            const r = MEMORY_MAP.find((x) => x.id === id)!;
            const hit = info.region?.id === id;
            return (
              <React.Fragment key={id}>
                {i > 0 && <div className="py-0.5 text-center text-[0.78rem] text-ink-2">· · · unmapped · · ·</div>}
                <div className={`rounded-lg border px-2.5 py-1.5 ${hit ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2"}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-[0.88rem] font-semibold text-ink">{r.name}</span>
                    {hit && <span className="text-[0.8rem] font-semibold text-ink">◀ your address</span>}
                  </div>
                  <div className="font-mono text-[0.75rem] text-ink-2">
                    {toHexGrouped(r.start)} – {toHexGrouped(r.end)}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          {!info.region && <div className="mt-1 rounded-lg border border-[var(--bad)] px-2.5 py-1.5 text-[0.85rem] font-semibold text-ink">◀ your address {toHexGrouped(addr)} is in an unmapped gap</div>}
        </div>
      </div>

      <div className="mt-3">
        {info.region ? (
          <div className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[0.95rem] font-semibold text-ink">
              {info.region.name} <span className="font-mono text-[0.8rem] font-normal text-ink-2">{toHexGrouped(addr)}</span>
            </p>
            <p className="mt-1 text-[0.88rem] leading-snug text-ink-2">{info.region.note}</p>
            {info.peripheral ? (
              <ul className="mt-2 space-y-0.5 text-[0.85rem] text-ink-2">
                <li>
                  Peripheral: <b className="text-ink">{info.peripheral.name}</b>
                </li>
                <li>
                  Base: <span className="font-mono text-ink">{toHexGrouped(info.peripheral.base)}</span>, offset <span className="font-mono text-ink">0x{info.offset.toString(16).toUpperCase()}</span>
                </li>
                <li>{info.reg ? <>Register: <b className="text-ink">{info.reg}</b>: {info.regDesc}</> : "No register at exactly this offset (reserved or inside a register)."}</li>
              </ul>
            ) : (
              info.region.kind === "periph" && <p className="mt-2 text-[0.85rem] text-ink-2">No peripheral starts here: this part of the peripheral area is empty.</p>
            )}
          </div>
        ) : (
          <Note tone="accent">Nothing lives here: a read or write causes a bus fault (on Arm Cortex-M, a HardFault).</Note>
        )}
      </div>

      {showRegs && regPeriph && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
          <Caption className="mb-1.5">{regPeriph.name} registers (address = base + offset). Tap one.</Caption>
          <ul className="flex flex-col gap-1">
            {(regPeriph.id === "gpioa" ? GPIO_REGS : regPeriph.regs).map((r) => {
              const a = regPeriph.base + r.offset;
              return (
                <li key={r.name}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => go(a)}
                    aria-pressed={a === addr}
                    className={`flex min-h-10 w-full flex-wrap items-center justify-between gap-x-2 rounded-lg border px-2.5 py-1 text-left transition-colors disabled:cursor-not-allowed ${a === addr ? "border-[var(--brand)] bg-tint" : "border-line bg-surface-2 hover:border-[var(--line-strong)]"}`}
                  >
                    <span className="text-[0.85rem] font-semibold text-ink">
                      {r.name} <span className="font-mono text-[0.75rem] font-normal text-ink-2">+0x{r.offset.toString(16).toUpperCase().padStart(2, "0")}</span>
                    </span>
                    <span className="font-mono text-[0.75rem] text-ink-2">{toHexGrouped(a)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ToyNote>Toy map: the big blocks follow the Arm Cortex-M layout, but sizes and peripheral addresses are a typical small part, not one vendor&rsquo;s chip.</ToyNote>
    </div>
  );
}

/** goal: { address?, region?: string | null, peripheral?: string, reg?: string } */
export function checkMemMap(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as MemMapState | undefined;
  if (!s) return false;
  if (typeof goal.address === "number" && s.address !== goal.address) return false;
  if ("region" in goal && goal.region !== undefined && s.region !== goal.region) return false;
  if (typeof goal.peripheral === "string") {
    const want = goal.peripheral.toLowerCase();
    const p = PERIPHERALS.find((x) => x.id === s.peripheral);
    if (!p || (p.id !== want && p.name.toLowerCase() !== want)) return false;
  }
  if (typeof goal.reg === "string" && s.reg !== goal.reg) return false;
  return true;
}
