/**
 * Pure simulation logic for the "Programming chips" widgets: a small toy microcontroller. No imports and no UI, so it
 * runs under plain Node. Register names and addresses are generic, modelled on common 32-bit MCUs (Arm Cortex-M class
 * parts), not any one vendor's chip. Every model here is simplified and the widgets say so on screen.
 */

// ───────────────────────────── bits and registers ─────────────────────────────

export const u32 = (v: number) => v >>> 0;
export const setBit = (v: number, n: number) => u32(v | (1 << n));
export const clearBit = (v: number, n: number) => u32(v & ~(1 << n));
export const toggleBit = (v: number, n: number) => u32(v ^ (1 << n));
export const readBit = (v: number, n: number) => (v >>> n) & 1;
/** A mask of `width` ones starting at bit `pos`. */
export const fieldMask = (pos: number, width: number) => u32(((width >= 32 ? 0xffffffff : (1 << width) - 1) << pos) >>> 0);
export const getField = (v: number, pos: number, width: number) => (u32(v) & fieldMask(pos, width)) >>> pos;
/** Clear the field, then OR in the new value (the classic read-modify-write). */
export const setField = (v: number, pos: number, width: number, val: number) => u32((u32(v) & ~fieldMask(pos, width)) | ((val << pos) & fieldMask(pos, width)));

export const toHex = (v: number, digits = 8) => "0x" + u32(v).toString(16).toUpperCase().padStart(digits, "0");
/** Hex with an underscore every 4 digits for 8-digit values: 0x4002_0014. */
export const toHexGrouped = (v: number) => {
  const h = u32(v).toString(16).toUpperCase().padStart(8, "0");
  return `0x${h.slice(0, 4)}_${h.slice(4)}`;
};
export const toBin = (v: number, bits = 8) => (u32(v) & (bits >= 32 ? 0xffffffff : (1 << bits) - 1)).toString(2).padStart(bits, "0");

/** Parse "0x4002_0014", "40020014h", "4002 0014" or a decimal string; null if it is not a number in 0..2^32-1. */
export function parseAddr(text: string): number | null {
  let t = text.trim().replace(/[_\s]/g, "").toLowerCase();
  if (!t) return null;
  let hex = false;
  if (t.startsWith("0x")) {
    hex = true;
    t = t.slice(2);
  } else if (t.endsWith("h")) {
    hex = true;
    t = t.slice(0, -1);
  } else if (/[a-f]/.test(t)) hex = true;
  if (!t || !(hex ? /^[0-9a-f]+$/ : /^[0-9]+$/).test(t)) return null;
  const n = hex ? parseInt(t, 16) : parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 && n <= 0xffffffff ? n : null;
}

// ───────────────────────────── memory map ─────────────────────────────

export type RegionKind = "flash" | "sram" | "periph" | "system";

export interface Region {
  id: string;
  name: string;
  kind: RegionKind;
  start: number;
  /** Inclusive. */
  end: number;
  note: string;
}

/**
 * The toy MCU's memory map. The big blocks follow the Arm Cortex-M architectural layout (code at 0x0000_0000, SRAM at
 * 0x2000_0000, peripherals at 0x4000_0000, the core's own registers at 0xE000_0000); the sizes are a typical small part.
 */
export const MEMORY_MAP: Region[] = [
  { id: "flash", name: "Flash", kind: "flash", start: 0x0000_0000, end: 0x0007_ffff, note: "512 KiB of flash: the program and its constants. Kept with the power off; erased and written in blocks, not byte by byte." },
  { id: "sram", name: "SRAM", kind: "sram", start: 0x2000_0000, end: 0x2001_ffff, note: "128 KiB of SRAM: variables, the stack and the heap. Fast, byte-addressable, and lost when the power goes." },
  { id: "periph", name: "Peripherals", kind: "periph", start: 0x4000_0000, end: 0x5fff_ffff, note: "Not memory at all: every address here is a register inside a peripheral (GPIO, timers, UART…). Reading or writing one talks to hardware." },
  { id: "system", name: "Core registers", kind: "system", start: 0xe000_0000, end: 0xe00f_ffff, note: "The CPU core's own registers: the interrupt controller, the system tick timer and the debug unit." },
];

export interface Peripheral {
  id: string;
  name: string;
  base: number;
  /** Size of its register block in bytes. */
  size: number;
  regs: { name: string; offset: number; desc: string }[];
}

/** GPIO register layout, modelled on common MCUs (names and offsets vary by vendor). */
export const GPIO_REGS = [
  { name: "MODER", offset: 0x00, desc: "Mode: 2 bits per pin (00 input, 01 output, 10 alternate function, 11 analog)" },
  { name: "OTYPER", offset: 0x04, desc: "Output type: 1 bit per pin (0 push-pull, 1 open-drain)" },
  { name: "PUPDR", offset: 0x0c, desc: "Pull-up / pull-down: 2 bits per pin (00 none, 01 pull-up, 10 pull-down)" },
  { name: "IDR", offset: 0x10, desc: "Input data: read the level on each pin (read-only)" },
  { name: "ODR", offset: 0x14, desc: "Output data: the level each output pin drives" },
  { name: "BSRR", offset: 0x18, desc: "Bit set/reset: write 1s to set (bits 0–15) or clear (bits 16–31) pins in one write" },
];

export const PERIPHERALS: Peripheral[] = [
  { id: "tim2", name: "TIM2 (timer)", base: 0x4000_0000, size: 0x400, regs: [
    { name: "CR1", offset: 0x00, desc: "Control: bit 0 starts the counter" },
    { name: "CNT", offset: 0x24, desc: "The counter itself" },
    { name: "PSC", offset: 0x28, desc: "Prescaler: the counter ticks at clock ÷ (PSC + 1)" },
    { name: "ARR", offset: 0x2c, desc: "Auto-reload: the counter wraps to 0 after reaching ARR" },
    { name: "CCR1", offset: 0x34, desc: "Compare value for channel 1 (sets the PWM duty)" },
  ] },
  { id: "i2c1", name: "I2C1", base: 0x4000_5400, size: 0x400, regs: [
    { name: "CR1", offset: 0x00, desc: "Control" },
    { name: "DR", offset: 0x10, desc: "Data register" },
  ] },
  { id: "uart1", name: "UART1", base: 0x4001_1000, size: 0x400, regs: [
    { name: "SR", offset: 0x00, desc: "Status: TX empty, RX not empty, errors" },
    { name: "DR", offset: 0x04, desc: "Data: write a byte to send it, read to receive" },
    { name: "BRR", offset: 0x08, desc: "Baud-rate divider" },
  ] },
  { id: "spi1", name: "SPI1", base: 0x4001_3000, size: 0x400, regs: [
    { name: "CR1", offset: 0x00, desc: "Control: mode (CPOL, CPHA), speed, enable" },
    { name: "DR", offset: 0x0c, desc: "Data register" },
  ] },
  { id: "gpioa", name: "GPIOA", base: 0x4002_0000, size: 0x400, regs: GPIO_REGS },
  { id: "gpiob", name: "GPIOB", base: 0x4002_0400, size: 0x400, regs: GPIO_REGS },
  { id: "dma1", name: "DMA1", base: 0x4002_6000, size: 0x400, regs: [
    { name: "CCR1", offset: 0x08, desc: "Channel 1 config: direction, increment, circular, enable" },
    { name: "CNDTR1", offset: 0x0c, desc: "Channel 1: items left to transfer" },
    { name: "CPAR1", offset: 0x10, desc: "Channel 1 peripheral address" },
    { name: "CMAR1", offset: 0x14, desc: "Channel 1 memory address" },
  ] },
];

export interface AddrInfo {
  addr: number;
  region: Region | null;
  peripheral: Peripheral | null;
  /** Register name inside the peripheral, if the address hits one exactly. */
  reg: string | null;
  regDesc: string | null;
  /** Byte offset inside the region (or peripheral). */
  offset: number;
}

export function lookupAddr(addr: number): AddrInfo {
  const a = u32(addr);
  const region = MEMORY_MAP.find((r) => a >= r.start && a <= r.end) ?? null;
  const peripheral = region?.kind === "periph" ? (PERIPHERALS.find((p) => a >= p.base && a < p.base + p.size) ?? null) : null;
  const off = peripheral ? a - peripheral.base : region ? a - region.start : 0;
  const r = peripheral?.regs.find((x) => x.offset === off) ?? null;
  return { addr: a, region, peripheral, reg: r?.name ?? null, regDesc: r?.desc ?? null, offset: off };
}

// ───────────────────────────── GPIO pin model ─────────────────────────────

export const VDD = 3.3;
/** Typical internal pull resistor (datasheets give roughly 30 to 50 kΩ). */
export const INTERNAL_PULL_OHMS = 40_000;

export type PinMode = "input" | "output";
export type PinOType = "push-pull" | "open-drain";
export type PinPull = "none" | "up" | "down";
/** What is wired to the pin from outside: nothing, a button to ground (pressed or not), or a button to 3.3 V. */
export type PinExternal = "none" | "btn-gnd-open" | "btn-gnd-pressed" | "btn-vdd-open" | "btn-vdd-pressed";

export interface PinConfig {
  mode: PinMode;
  otype: PinOType;
  pull: PinPull;
  /** ODR bit (only matters for outputs). */
  out: 0 | 1;
  external: PinExternal;
}

export interface PinResult {
  /** The level on the wire: 0, 1, "float" (nothing drives it) or "conflict" (two drivers fight: a short). */
  level: 0 | 1 | "float" | "conflict";
  /** What IDR reads: a clean 0/1, or "?" for a floating or fighting pin. */
  read: 0 | 1 | "?";
  /** Who sets the level, in words. */
  driver: string;
  /** Current through the internal pull resistor, amps (0 when none flows). */
  pullCurrent: number;
}

/** Resolve one pin's level from its configuration and what is wired to it. Toy model: ideal drivers and buttons. */
export function resolvePin(c: PinConfig): PinResult {
  const ext: 0 | 1 | null = c.external === "btn-gnd-pressed" ? 0 : c.external === "btn-vdd-pressed" ? 1 : null;
  const pull: 0 | 1 | null = c.pull === "up" ? 1 : c.pull === "down" ? 0 : null;
  // The chip's own strong driver, if any.
  let chip: 0 | 1 | null = null;
  if (c.mode === "output") chip = c.otype === "push-pull" ? c.out : c.out === 0 ? 0 : null;
  if (chip !== null && ext !== null && chip !== ext) {
    return { level: "conflict", read: "?", driver: `the pin drives ${chip ? "high" : "low"} while the button ties it ${ext ? "high" : "low"}: a short circuit through the pin`, pullCurrent: 0 };
  }
  let level: 0 | 1 | "float";
  let driver: string;
  if (chip !== null) {
    level = chip;
    driver = c.mode === "output" && c.otype === "open-drain" ? "the open-drain transistor pulls it low" : `the pin's output driver (push-pull, ${chip ? "high" : "low"})`;
  } else if (ext !== null) {
    level = ext;
    driver = ext ? "the pressed button ties it to 3.3 V" : "the pressed button ties it to ground";
  } else if (pull !== null) {
    level = pull;
    driver = pull ? "the pull-up resistor (nothing else drives it)" : "the pull-down resistor (nothing else drives it)";
  } else {
    level = "float";
    driver = c.mode === "output" ? "nothing: the open-drain output is released and there is no pull resistor" : "nothing: the pin floats and picks up noise";
  }
  // Current through the pull resistor: it flows when the resistor's far end differs from the pin level.
  const pullCurrent = pull !== null && level !== "float" && level !== pull ? VDD / INTERNAL_PULL_OHMS : 0;
  return { level, read: level === "float" ? "?" : level, driver, pullCurrent };
}

// ───────────────────────────── button bounce and debouncing ─────────────────────────────

/** A deterministic pseudo-random generator (LCG), so the bounce looks the same on server and client. */
export function lcg(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface Edge {
  /** Time in ms. */
  t: number;
  level: 0 | 1;
}

/**
 * The raw pin level of an active-low button (pull-up: idle 1, pressed 0) that is pressed at `pressAt` and released at
 * `releaseAt`, with contact bounce lasting up to `bounceMs` after each change. Returns the level changes (starting at
 * t = 0 with level 1). Times are rounded to 0.1 ms.
 */
export function bounceEdges(pressAt: number, releaseAt: number, bounceMs: number, seed = 7): Edge[] {
  const rnd = lcg(seed);
  const edges: Edge[] = [{ t: 0, level: 1 }];
  const burst = (at: number, final: 0 | 1) => {
    let t = at;
    let lv: 0 | 1 = final;
    edges.push({ t: r1(t), level: lv });
    if (bounceMs > 0) {
      // A few short flips back and forth, getting shorter, all inside the bounce window.
      const flips = 2 + Math.floor(rnd() * 3) * 2; // even, so the burst ends on `final`
      for (let k = 0; k < flips; k++) {
        const gap = (bounceMs / (flips + 1)) * (0.5 + rnd());
        t = Math.min(at + bounceMs, t + gap);
        lv = lv === 1 ? 0 : 1;
        edges.push({ t: r1(t), level: lv });
      }
      if (lv !== final) edges.push({ t: r1(Math.min(at + bounceMs, t + 0.1)), level: final });
    }
  };
  burst(pressAt, 0);
  burst(releaseAt, 1);
  // Clean up: sorted, strictly increasing times, no repeated levels.
  const out: Edge[] = [];
  for (const e of edges.sort((a, b) => a.t - b.t)) {
    if (out.length && out[out.length - 1].t >= e.t) e.t = r1(out[out.length - 1].t + 0.1);
    if (out.length && out[out.length - 1].level === e.level) continue;
    out.push(e);
  }
  return out;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** The level at time t given a list of edges. */
export function levelAt(edges: Edge[], t: number): 0 | 1 {
  let lv: 0 | 1 = edges[0]?.level ?? 1;
  for (const e of edges) {
    if (e.t <= t) lv = e.level;
    else break;
  }
  return lv;
}

/** Number of falling edges (1 → 0): each one is a "press" to naive code. */
export const fallingEdges = (edges: Edge[]) => edges.filter((e, i) => i > 0 && e.level === 0 && edges[i - 1].level === 1).length;

export interface DebounceResult {
  /** Sample times (ms) and the raw level read at each. */
  samples: { t: number; raw: 0 | 1 }[];
  /** The accepted (debounced) level changes. */
  edges: Edge[];
  /** Presses seen by the debounced signal. */
  presses: number;
  /** Presses seen by naive code that reacts to every raw falling edge. */
  rawPresses: number;
  /** Delay from the first raw press edge to the accepted press, ms (null if never accepted). */
  delayMs: number | null;
}

/**
 * Software debounce: read the pin every `sampleMs`, and accept a new level only after `stable` samples in a row agree
 * with it. With stable = 1 every sample is believed (no debouncing beyond the sampling itself).
 */
export function debounce(raw: Edge[], sampleMs: number, stable: number, totalMs: number): DebounceResult {
  const samples: { t: number; raw: 0 | 1 }[] = [];
  let accepted: 0 | 1 = raw[0]?.level ?? 1;
  const edges: Edge[] = [{ t: 0, level: accepted }];
  let run = 0;
  for (let k = 1; k * sampleMs <= totalMs + 1e-9; k++) {
    const t = r1(k * sampleMs);
    const lv = levelAt(raw, t);
    samples.push({ t, raw: lv });
    if (lv !== accepted) {
      run++;
      if (run >= stable) {
        accepted = lv;
        edges.push({ t, level: lv });
        run = 0;
      }
    } else run = 0;
  }
  const firstRaw = raw.find((e, i) => i > 0 && e.level === 0);
  const firstAcc = edges.find((e, i) => i > 0 && e.level === 0);
  return {
    samples,
    edges,
    presses: fallingEdges(edges),
    rawPresses: fallingEdges(raw),
    delayMs: firstRaw && firstAcc ? r1(firstAcc.t - firstRaw.t) : null,
  };
}

// ───────────────────────────── timers and PWM ─────────────────────────────

export interface PwmResult {
  /** Counter tick rate, Hz: clock ÷ (PSC + 1). */
  tickHz: number;
  /** PWM frequency, Hz: clock ÷ ((PSC + 1) × (ARR + 1)). */
  freqHz: number;
  periodS: number;
  /** Fraction of each period the output is high: CCR ÷ (ARR + 1), capped at 1. */
  duty: number;
  highS: number;
  /** Distinct duty steps available: ARR + 1. */
  steps: number;
}

/**
 * Edge-aligned PWM as on most MCU timers ("PWM mode 1", counting up): the counter runs 0..ARR, the output is high while
 * the counter is below CCR. So the period is (ARR + 1) ticks and the high time CCR ticks.
 */
export function pwm(clockHz: number, psc: number, arr: number, ccr: number): PwmResult {
  const tickHz = clockHz / (psc + 1);
  const steps = arr + 1;
  const freqHz = tickHz / steps;
  const duty = Math.min(Math.max(ccr, 0), steps) / steps;
  return { tickHz, freqHz, periodS: 1 / freqHz, duty, highS: duty / freqHz, steps };
}

/** Typical hobby-servo mapping: a pulse every 20 ms (50 Hz); 1.0 ms = 0°, 1.5 ms = 90°, 2.0 ms = 180°. Real servos vary. */
export const SERVO_MIN_MS = 1.0;
export const SERVO_MAX_MS = 2.0;
export function servoAngle(pulseMs: number): number {
  const a = ((pulseMs - SERVO_MIN_MS) / (SERVO_MAX_MS - SERVO_MIN_MS)) * 180;
  return Math.min(180, Math.max(0, a));
}

/** Average LED brightness from PWM: the eye averages, so brightness ≈ duty (perceived brightness is not linear). */
export const ledBrightness = (duty: number) => Math.min(1, Math.max(0, duty));

// ───────────────────────────── interrupts ─────────────────────────────

export interface IrqDef {
  id: string;
  name: string;
  /** Priority number: LOWER number = MORE urgent (the Arm Cortex-M convention). */
  prio: number;
  /** ISR body length, µs. */
  duration: number;
  /** Times (µs) the interrupt is requested. */
  raiseAt: number[];
}

export interface IrqSegment {
  start: number;
  end: number;
  /** "main", an IRQ id, "entry" or "exit" (saving / restoring registers). */
  who: string;
  /** Nesting depth (0 = main). */
  depth: number;
}

export interface IrqRecord {
  irq: string;
  raisedAt: number;
  /** When its ISR body started (null if it never ran). */
  startedAt: number | null;
  endedAt: number | null;
  /** startedAt − raisedAt: from the request to the first instruction of the ISR. */
  latency: number | null;
  /** True if a second request came while this one was still pending and was merged into it (lost). */
  merged?: boolean;
}

export interface IrqSim {
  segments: IrqSegment[];
  records: IrqRecord[];
  /** Highest nesting depth reached. */
  maxDepth: number;
  /** Requests lost because the same interrupt was already pending. */
  lost: number;
}

/**
 * Toy interrupt controller, stepped in whole µs. Each ISR costs `entry` µs to start (registers saved) and `exit` µs to
 * return. With `nesting` on, a pending interrupt with a strictly more urgent priority preempts a running ISR; equal or
 * lower priority waits. A request for an interrupt that is already pending is merged (one pending bit per interrupt).
 * Not modelled: tail-chaining, late arrival and other real-controller optimisations.
 */
export function simulateIrq(irqs: IrqDef[], opts: { total: number; nesting: boolean; entry?: number; exit?: number }): IrqSim {
  const entry = opts.entry ?? 1;
  const exit = opts.exit ?? 1;
  const byId = new Map(irqs.map((d) => [d.id, d]));
  const records: IrqRecord[] = [];
  const pending: IrqRecord[] = [];
  const stack: { rec: IrqRecord; left: number; prio: number }[] = [];
  let overhead: { kind: "entry" | "exit"; left: number; rec: IrqRecord } | null = null;
  const timeline: { who: string; depth: number }[] = [];
  let lost = 0;
  let maxDepth = 0;

  for (let t = 0; t < opts.total; t++) {
    for (const d of irqs) {
      if (d.raiseAt.includes(t)) {
        const rec: IrqRecord = { irq: d.id, raisedAt: t, startedAt: null, endedAt: null, latency: null };
        if (pending.some((p) => p.irq === d.id)) {
          rec.merged = true;
          lost++;
          records.push(rec);
        } else {
          records.push(rec);
          pending.push(rec);
        }
      }
    }
    if (!overhead) {
      // Can the most urgent pending interrupt start now?
      const cand = pending.slice().sort((a, b) => byId.get(a.irq)!.prio - byId.get(b.irq)!.prio || a.raisedAt - b.raisedAt)[0];
      if (cand) {
        const p = byId.get(cand.irq)!.prio;
        const top = stack[stack.length - 1];
        if (!top || (opts.nesting && p < top.prio)) {
          pending.splice(pending.indexOf(cand), 1);
          overhead = { kind: "entry", left: entry, rec: cand };
        }
      }
    }
    if (overhead) {
      const depth = overhead.kind === "entry" ? stack.length + 1 : stack.length;
      timeline.push({ who: overhead.kind, depth });
      overhead.left--;
      if (overhead.left <= 0) {
        if (overhead.kind === "entry") {
          const d = byId.get(overhead.rec.irq)!;
          stack.push({ rec: overhead.rec, left: d.duration, prio: d.prio });
          overhead.rec.startedAt = t + 1;
          overhead.rec.latency = t + 1 - overhead.rec.raisedAt;
          maxDepth = Math.max(maxDepth, stack.length);
        } else {
          stack.pop();
        }
        overhead = null;
      }
      continue;
    }
    const top = stack[stack.length - 1];
    if (top) {
      timeline.push({ who: top.rec.irq, depth: stack.length });
      top.left--;
      if (top.left <= 0) {
        top.rec.endedAt = t + 1;
        overhead = exit > 0 ? { kind: "exit", left: exit, rec: top.rec } : null;
        if (exit <= 0) stack.pop();
      }
    } else timeline.push({ who: "main", depth: 0 });
  }
  // Merge the per-µs timeline into segments.
  const segments: IrqSegment[] = [];
  timeline.forEach((s, t) => {
    const last = segments[segments.length - 1];
    if (last && last.who === s.who && last.depth === s.depth && last.end === t) last.end = t + 1;
    else segments.push({ start: t, end: t + 1, who: s.who, depth: s.depth });
  });
  return { segments, records, maxDepth, lost };
}

// ───────────────────────────── a race on shared data ─────────────────────────────

export type RaceFix = "none" | "volatile" | "disable" | "atomic";

export interface RaceStep {
  who: "main" | "isr";
  text: string;
  /** Value of the shared `count` in memory after this step. */
  mem: number;
  /** main's register r0 after this step (null if not loaded yet). */
  r0: number | null;
}

export interface RaceResult {
  steps: RaceStep[];
  final: number;
  /** What it should be: both increments counted. */
  expected: number;
  /** How long the interrupt had to wait, in main's instruction slots (0 = served at once). */
  delayedBy: number;
  /** Times main had to retry its atomic sequence. */
  retries: number;
}

/**
 * `count++` in the main loop is three instructions: load, add, store. An ISR that also does `count++` fires after main
 * has done `irqAfter` of them (0 to 3). The ISR runs to completion before main continues (it cannot be interrupted by
 * main). Fixes:
 * - "volatile": the compiler must do the load and store every time, but the three steps are still separate: no help.
 * - "disable": main turns interrupts off around its three steps; the ISR is held pending until they are re-enabled.
 * - "atomic": an exclusive load/store pair (as Arm's LDREX/STREX): an interrupt in between makes the store fail and the
 *   sequence is retried.
 */
export function simulateRace(fix: RaceFix, irqAfter: number, start = 5): RaceResult {
  const steps: RaceStep[] = [];
  let mem = start;
  let r0: number | null = null;
  let retries = 0;
  let fired = false;
  const isr = () => {
    fired = true;
    mem += 1;
    steps.push({ who: "isr", text: "ISR runs: count++ (load, add, store, all at once)", mem, r0 });
  };
  const m = (text: string) => steps.push({ who: "main", text, mem, r0 });
  const load = (text = "LOAD r0, count") => {
    r0 = mem;
    m(text);
  };
  const add = () => {
    r0 = (r0 ?? 0) + 1;
    m("ADD r0, r0, #1");
  };
  const store = (text = "STORE r0, count") => {
    mem = r0 ?? 0;
    m(text);
  };
  if (fix === "disable") {
    // A request that arrives inside the critical section stays pending until interrupts are enabled again.
    if (irqAfter === 0) isr();
    m("disable interrupts");
    load();
    add();
    store();
    m("enable interrupts");
    if (!fired) isr();
    return { steps, final: mem, expected: start + 2, delayedBy: irqAfter === 0 ? 0 : 4 - irqAfter, retries };
  }
  if (fix === "atomic") {
    // Exclusive load/store: an interrupt between them clears the exclusive monitor, the store fails, main retries.
    for (;;) {
      if (!fired && irqAfter === 0) isr();
      load("LDREX r0, count (exclusive load)");
      const firedBefore: boolean = fired;
      if (!fired && irqAfter === 1) isr();
      add();
      if (!fired && irqAfter === 2) isr();
      if (fired !== firedBefore) {
        m("STREX fails (an interrupt came in between): try again");
        retries++;
        continue;
      }
      store("STREX r0, count (exclusive store succeeds)");
      break;
    }
    if (!fired) isr();
    return { steps, final: mem, expected: start + 2, delayedBy: 0, retries };
  }
  // "none" and "volatile" behave the same at run time: three separate instructions.
  const tag = fix === "volatile" ? " (volatile: a real memory read)" : "";
  if (irqAfter === 0) isr();
  load("LOAD r0, count" + tag);
  if (irqAfter === 1) isr();
  add();
  if (irqAfter === 2) isr();
  store("STORE r0, count" + (fix === "volatile" ? " (volatile: a real memory write)" : ""));
  if (!fired) isr();
  return { steps, final: mem, expected: start + 2, delayedBy: 0, retries };
}

// ───────────────────────────── serial protocols ─────────────────────────────

/** UART frame: start bit 0, data bits LSB first, optional parity, stop bit(s) 1. The line idles high. */
export function uartFrame(byte: number, opts: { parity?: "none" | "even" | "odd"; stopBits?: 1 | 2; dataBits?: 7 | 8 } = {}): { bit: 0 | 1; label: string }[] {
  const n = opts.dataBits ?? 8;
  const out: { bit: 0 | 1; label: string }[] = [{ bit: 0, label: "start" }];
  let ones = 0;
  for (let i = 0; i < n; i++) {
    const b = ((byte >> i) & 1) as 0 | 1;
    ones += b;
    out.push({ bit: b, label: `D${i}` });
  }
  const parity = opts.parity ?? "none";
  if (parity !== "none") {
    // Even parity: the parity bit makes the total number of 1s (data + parity) even.
    const p = (parity === "even" ? ones % 2 : (ones + 1) % 2) as 0 | 1;
    out.push({ bit: p, label: "P" });
  }
  for (let i = 0; i < (opts.stopBits ?? 1); i++) out.push({ bit: 1, label: "stop" });
  return out;
}

/** Bytes per second at a baud rate for a given number of line bits per byte (10 for 8N1). */
export const uartBytesPerSec = (baud: number, bitsPerFrame = 10) => baud / bitsPerFrame;

export type I2cSym =
  | { kind: "start" }
  | { kind: "stop" }
  | { kind: "bit"; value: 0 | 1; by: "controller" | "target"; role: "addr" | "rw" | "data"; index: number; byte: number }
  | { kind: "ack"; ack: boolean; by: "controller" | "target"; byte: number };

export interface I2cTransaction {
  symbols: I2cSym[];
  /** The bytes on the wire: [address byte, data...]. */
  bytes: number[];
  /** Did the target answer its address? */
  addrAck: boolean;
}

/**
 * One I²C transaction with a 7-bit address: START, address (7 bits, MSB first) + R/W bit (1 = read), ACK, then data
 * bytes each followed by an ACK bit, then STOP. ACK means the receiver pulls SDA LOW during the 9th clock; NACK leaves it
 * high (the pull-up wins). When reading, the controller NACKs the last byte to say "that's enough". If no device has
 * the address, nobody pulls SDA low: a NACK, and the controller stops.
 */
export function i2cTransaction(addr7: number, read: boolean, data: number[], devicePresent = true): I2cTransaction {
  const sym: I2cSym[] = [{ kind: "start" }];
  const addrByte = ((addr7 & 0x7f) << 1) | (read ? 1 : 0);
  for (let i = 7; i >= 0; i--) {
    const v = ((addrByte >> i) & 1) as 0 | 1;
    sym.push({ kind: "bit", value: v, by: "controller", role: i === 0 ? "rw" : "addr", index: 7 - i, byte: 0 });
  }
  sym.push({ kind: "ack", ack: devicePresent, by: "target", byte: 0 });
  const bytes = [addrByte];
  if (devicePresent) {
    data.forEach((d, k) => {
      const by = read ? "target" : "controller";
      for (let i = 7; i >= 0; i--) sym.push({ kind: "bit", value: ((d >> i) & 1) as 0 | 1, by, role: "data", index: 7 - i, byte: k + 1 });
      const last = k === data.length - 1;
      sym.push({ kind: "ack", ack: read ? !last : true, by: read ? "controller" : "target", byte: k + 1 });
      bytes.push(d & 0xff);
    });
  }
  sym.push({ kind: "stop" });
  return { symbols: sym, bytes, addrAck: devicePresent };
}

/** SDA/SCL levels for an I²C transaction, 4 samples per bit (plus START/STOP), for a logic-analyser trace. */
export function i2cWave(tr: I2cTransaction): { scl: (0 | 1)[]; sda: (0 | 1)[]; marks: { at: number; label: string }[] } {
  const scl: (0 | 1)[] = [1, 1];
  const sda: (0 | 1)[] = [1, 1];
  const marks: { at: number; label: string }[] = [];
  for (const s of tr.symbols) {
    if (s.kind === "start") {
      // SDA falls while SCL is high, then SCL falls.
      scl.push(1, 1);
      sda.push(1, 0);
      marks.push({ at: scl.length - 1, label: "S" });
      scl.push(0);
      sda.push(0);
    } else if (s.kind === "stop") {
      // SDA low, SCL rises, then SDA rises while SCL is high.
      scl.push(0, 1, 1, 1);
      sda.push(0, 0, 1, 1);
      marks.push({ at: scl.length - 2, label: "P" });
    } else {
      const v: 0 | 1 = s.kind === "bit" ? s.value : s.ack ? 0 : 1;
      // SDA changes only while SCL is low; it is read while SCL is high.
      scl.push(0, 1, 1, 0);
      sda.push(v, v, v, v);
      marks.push({ at: scl.length - 3, label: s.kind === "ack" ? (s.ack ? "A" : "N") : String(v) });
    }
  }
  return { scl, sda, marks };
}

export interface SpiWave {
  /** Half-bit samples. */
  sclk: (0 | 1)[];
  mosi: (0 | 1 | null)[];
  miso: (0 | 1 | null)[];
  cs: (0 | 1)[];
  /** Sample indexes (into the arrays) of the edges where both sides READ (sample) the data. */
  sampleAt: number[];
  /** The bits as the receiver samples them, MSB first. */
  mosiBits: (0 | 1)[];
  misoBits: (0 | 1)[];
}

/**
 * SPI, MSB first, 8 bits. Mode = CPOL·2 + CPHA. CPOL is the clock's idle level. CPHA = 0: each bit is put on the line
 * before the clock's first (leading) edge and sampled ON the leading edge. CPHA = 1: each bit is put on the line at the
 * leading edge and sampled on the trailing edge. Two samples per bit, plus one idle sample before and after.
 */
export function spiWave(mosiByte: number, misoByte: number, mode: 0 | 1 | 2 | 3): SpiWave {
  const cpol = (mode >> 1) as 0 | 1;
  const cpha = mode & 1;
  const idle = cpol;
  const active = (1 - cpol) as 0 | 1;
  const bitsOf = (b: number) => Array.from({ length: 8 }, (_, i) => ((b >> (7 - i)) & 1) as 0 | 1);
  const mo = bitsOf(mosiByte);
  const mi = bitsOf(misoByte);
  const sclk: (0 | 1)[] = [idle];
  const mosi: (0 | 1 | null)[] = [null];
  const miso: (0 | 1 | null)[] = [null];
  const cs: (0 | 1)[] = [1];
  const sampleAt: number[] = [];
  // CS goes low; for CPHA = 0 the first bit is already on the line.
  sclk.push(idle);
  cs.push(0);
  mosi.push(cpha === 0 ? mo[0] : null);
  miso.push(cpha === 0 ? mi[0] : null);
  for (let i = 0; i < 8; i++) {
    if (cpha === 0) {
      // first half: leading edge (sample), clock active; second half: trailing edge, clock idle, next bit shifted out
      sclk.push(active);
      mosi.push(mo[i]);
      miso.push(mi[i]);
      cs.push(0);
      sampleAt.push(sclk.length - 1);
      sclk.push(idle);
      mosi.push(i < 7 ? mo[i + 1] : mo[i]);
      miso.push(i < 7 ? mi[i + 1] : mi[i]);
      cs.push(0);
    } else {
      // leading edge: bit shifted out, clock active; trailing edge: sample, clock idle
      sclk.push(active);
      mosi.push(mo[i]);
      miso.push(mi[i]);
      cs.push(0);
      sclk.push(idle);
      mosi.push(mo[i]);
      miso.push(mi[i]);
      cs.push(0);
      sampleAt.push(sclk.length - 1);
    }
  }
  sclk.push(idle);
  mosi.push(null);
  miso.push(null);
  cs.push(1);
  return { sclk, mosi, miso, cs, sampleAt, mosiBits: mo, misoBits: mi };
}

/** Which clock edge a mode samples on: modes 0 and 3 sample on rising edges, modes 1 and 2 on falling edges. */
export const spiSampleEdge = (mode: 0 | 1 | 2 | 3): "rising" | "falling" => (mode === 0 || mode === 3 ? "rising" : "falling");

/**
 * Do a controller and a device agree? Same mode: yes. Different sampling edges: the device samples on the edge where
 * the controller changes the data, so bits are unreliable (often shifted by one). Modes 0 and 3 (or 1 and 2) sample on
 * the same edge and differ only in the clock's idle level: many devices accept either, but the datasheet decides.
 */
export function spiCompat(controller: 0 | 1 | 2 | 3, device: 0 | 1 | 2 | 3): "match" | "idle-only" | "wrong-edge" {
  if (controller === device) return "match";
  return spiSampleEdge(controller) === spiSampleEdge(device) ? "idle-only" : "wrong-edge";
}

// ───────────────────────────── DMA ─────────────────────────────

/** Toy costs, in CPU cycles, for moving samples from a peripheral (say an ADC) into RAM. */
export const DMA_COSTS = {
  /** Interrupt entry + handler that reads one sample and stores it + exit. */
  perSampleIsr: 60,
  /** One interrupt per half buffer when DMA does the moving (bookkeeping only). */
  perBlockIsr: 100,
};

export type MoveMethod = "poll" | "irq" | "dma";

export interface MoveResult {
  /** Share of the CPU's time spent moving samples (1 = all of it). Polling is 1 by definition (the CPU just waits). */
  cpuLoad: number;
  /** True if the method cannot keep up (more than 100% of the CPU needed): samples get lost. */
  overloaded: boolean;
  cyclesPerSample: number;
}

/** CPU load of moving `rateHz` samples a second on a `clockHz` CPU, with a DMA buffer of `buffer` samples. */
export function moveCost(method: MoveMethod, rateHz: number, clockHz: number, buffer = 256): MoveResult {
  const cyclesBetween = clockHz / rateHz;
  if (method === "poll") return { cpuLoad: 1, overloaded: cyclesBetween < 10, cyclesPerSample: cyclesBetween };
  const per = method === "irq" ? DMA_COSTS.perSampleIsr : DMA_COSTS.perBlockIsr / (buffer / 2);
  const load = per / cyclesBetween;
  return { cpuLoad: Math.min(load, 1), overloaded: load > 1, cyclesPerSample: per };
}

export interface DbufResult {
  /** Time for DMA to fill one half (or the whole single buffer), ms. */
  fillMs: number;
  processMs: number;
  /** Double buffering keeps up if processing a half takes no longer than filling the other. */
  ok: boolean;
  /** Single buffer: samples missed while the CPU processes (DMA stopped). Double: samples overwritten per block if too slow. */
  lostPerBlock: number;
  /** Events for a timeline over `blocks` blocks: who does what, when. */
  events: { lane: "dma" | "cpu"; start: number; end: number; half: 0 | 1; bad?: boolean }[];
}

/**
 * Double (ping-pong) buffering: DMA fills half A while the CPU processes half B, then they swap (a circular buffer with
 * half-transfer and transfer-complete interrupts). Single buffering: DMA fills the buffer, stops, the CPU processes it,
 * then DMA restarts, so samples that arrive meanwhile are missed.
 */
export function doubleBuffer(mode: "single" | "double", halfSamples: number, rateHz: number, processMs: number, blocks = 4): DbufResult {
  const fillMs = (halfSamples / rateHz) * 1000;
  const events: DbufResult["events"] = [];
  if (mode === "single") {
    let t = 0;
    for (let b = 0; b < blocks; b++) {
      events.push({ lane: "dma", start: t, end: t + fillMs, half: 0 });
      events.push({ lane: "cpu", start: t + fillMs, end: t + fillMs + processMs, half: 0 });
      t += fillMs + processMs;
    }
    return { fillMs, processMs, ok: processMs === 0, lostPerBlock: Math.round((processMs / 1000) * rateHz), events };
  }
  const ok = processMs <= fillMs + 1e-9;
  for (let b = 0; b < blocks; b++) {
    const half = (b % 2) as 0 | 1;
    events.push({ lane: "dma", start: b * fillMs, end: (b + 1) * fillMs, half });
    // The CPU processes block b while DMA fills block b + 1; it is late if it is still busy when DMA comes back to it.
    events.push({ lane: "cpu", start: (b + 1) * fillMs, end: (b + 1) * fillMs + processMs, half, bad: !ok });
  }
  const overMs = Math.max(0, processMs - fillMs);
  return { fillMs, processMs, ok, lostPerBlock: Math.round((overMs / 1000) * rateHz), events };
}

// ───────────────────────────── DMA and the data cache ─────────────────────────────

/** A 4-character buffer that lives in one cache line: what RAM holds and what the CPU's data cache holds. */
export interface CacheState {
  ram: string;
  /** null = the line is not in the cache. */
  cache: string | null;
  dirty: boolean;
  /** What the last DMA transmit sent, or what the CPU last read. */
  sent: string | null;
  read: string | null;
  log: string[];
}

export type CacheAction = "cpu-write" | "clean" | "invalidate" | "dma-tx" | "dma-rx" | "cpu-read";

/** Both scenarios start with the buffer's old contents in RAM and a clean copy in the cache (the CPU touched it earlier). */
export const cacheStart = (): CacheState => ({ ram: "····", cache: "····", dirty: false, sent: null, read: null, log: [] });

/**
 * A write-back data cache in front of RAM, and a DMA engine that only sees RAM (it is not coherent with the cache, as on
 * many MCUs with a data cache, e.g. Cortex-M7 class parts). Clean = write dirty data back to RAM. Invalidate = throw the
 * cached copy away so the next read goes to RAM.
 */
export function cacheStep(s: CacheState, a: CacheAction, payload = "HI!!"): CacheState {
  const n = { ...s, log: s.log.slice() };
  switch (a) {
    case "cpu-write":
      n.cache = payload;
      n.dirty = true;
      n.log.push(`CPU writes "${payload}": it lands in the cache (write-back); RAM still holds "${n.ram}".`);
      break;
    case "clean":
      if (n.cache !== null && n.dirty) {
        n.ram = n.cache;
        n.dirty = false;
        n.log.push(`Clean: the dirty line is written back. RAM now holds "${n.ram}".`);
      } else n.log.push("Clean: nothing dirty to write back.");
      break;
    case "invalidate":
      if (n.cache !== null && n.dirty) n.log.push(`Invalidate: the cached "${n.cache}" is thrown away (it was never written back!).`);
      else n.log.push("Invalidate: the cached copy is dropped; the next CPU read goes to RAM.");
      n.cache = null;
      n.dirty = false;
      break;
    case "dma-tx":
      n.sent = n.ram;
      n.log.push(`DMA reads RAM and sends "${n.ram}" to the UART.`);
      break;
    case "dma-rx":
      n.ram = payload;
      n.log.push(`DMA writes the received "${payload}" into RAM. The cache is not told.`);
      break;
    case "cpu-read":
      if (n.cache === null) {
        n.cache = n.ram;
        n.dirty = false;
        n.read = n.ram;
        n.log.push(`CPU reads: cache miss, the line is fetched from RAM: "${n.read}".`);
      } else {
        n.read = n.cache;
        n.log.push(`CPU reads: cache hit, it gets the cached "${n.read}"${n.cache !== n.ram ? ` (RAM holds "${n.ram}")` : ""}.`);
      }
      break;
  }
  return n;
}

// ───────────────────────────── boot and the linker map ─────────────────────────────

export interface SectionSizes {
  vectors: number;
  text: number;
  rodata: number;
  data: number;
  bss: number;
  heap: number;
  stack: number;
}

export interface Placed {
  name: string;
  /** Where it lives at run time (VMA). */
  vma: number;
  /** Where its bytes are stored in flash (LMA); equals vma for sections that run from flash. */
  lma: number;
  size: number;
  mem: "flash" | "ram";
  note: string;
}

export interface LinkResult {
  ok: boolean;
  error: string | null;
  flash: Placed[];
  ram: Placed[];
  flashUsed: number;
  ramUsed: number;
  flashSize: number;
  ramSize: number;
  /** Initial stack pointer (the first word of the vector table): the top of RAM. */
  initialSp: number;
  /** Reset handler address (the second word), the start of .text in this toy layout. */
  resetVector: number;
}

const align4 = (n: number) => (n + 3) & ~3;

/**
 * A minimal linker script's layout. FLASH holds the vector table, .text, .rodata, and the INITIAL VALUES of .data (its
 * load address, LMA). RAM holds .data at its run address (VMA), .bss, the heap, and the stack at the top growing down.
 */
export function linkLayout(sz: SectionSizes, flashBase = 0x0000_0000, flashSize = 512 * 1024, ramBase = 0x2000_0000, ramSize = 128 * 1024): LinkResult {
  const flash: Placed[] = [];
  const ram: Placed[] = [];
  let f = flashBase;
  const putF = (name: string, size: number, note: string) => {
    flash.push({ name, vma: f, lma: f, size, mem: "flash", note });
    f += align4(size);
  };
  putF(".isr_vector", sz.vectors, "The vector table: initial stack pointer, then the address of every handler.");
  putF(".text", sz.text, "Machine code.");
  putF(".rodata", sz.rodata, "Constants and string literals (const data).");
  const dataLma = f;
  f += align4(sz.data);
  let r = ramBase;
  ram.push({ name: ".data", vma: r, lma: dataLma, size: sz.data, mem: "ram", note: "Initialised variables. Run address in RAM; initial values stored in flash and copied at startup." });
  flash.push({ name: ".data (initial values)", vma: r, lma: dataLma, size: sz.data, mem: "flash", note: "The bytes the startup code copies into .data in RAM." });
  r += align4(sz.data);
  ram.push({ name: ".bss", vma: r, lma: r, size: sz.bss, mem: "ram", note: "Zero-initialised variables. Takes no flash: the startup code just clears it." });
  r += align4(sz.bss);
  ram.push({ name: "heap", vma: r, lma: r, size: sz.heap, mem: "ram", note: "For malloc, if used. Grows up." });
  r += align4(sz.heap);
  const top = ramBase + ramSize;
  ram.push({ name: "stack", vma: top - sz.stack, lma: top - sz.stack, size: sz.stack, mem: "ram", note: "Grows down from the top of RAM." });
  const flashUsed = f - flashBase;
  const ramUsed = r - ramBase + sz.stack;
  let error: string | null = null;
  if (flashUsed > flashSize) error = `region FLASH overflowed by ${flashUsed - flashSize} bytes`;
  else if (ramUsed > ramSize) error = `region RAM overflowed by ${ramUsed - ramSize} bytes`;
  return { ok: !error, error, flash, ram, flashUsed, ramUsed, flashSize, ramSize, initialSp: top, resetVector: flashBase + align4(sz.vectors) };
}

export const BOOT_STEPS = [
  "Reset: the CPU loads the stack pointer from the first word of the vector table",
  "It loads the program counter from the second word: the reset handler",
  "The startup code copies .data's initial values from flash to RAM",
  "It fills .bss with zeros",
  "It sets up the clocks (and, on some chips, the FPU and memory)",
  "It calls main()",
] as const;

// ───────────────────────────── RTOS scheduling and priority inversion ─────────────────────────────

export interface RtosTask {
  id: string;
  name: string;
  /** Higher number = more important (FreeRTOS convention; other RTOSes vary). */
  prio: number;
  arrive: number;
  /** Total work, ticks. */
  work: number;
  /** [from, to): work ticks during which the task holds the shared mutex (counted in its own work). */
  lock?: [number, number];
}

export interface RtosResult {
  /** Per tick: id of the running task, or "idle". */
  run: string[];
  /** Per tick, per task: "run" | "ready" | "blocked" | "done" | "-" (not arrived). */
  states: Record<string, string[]>;
  /** Per tick: effective priority of each task (shows inheritance). */
  effPrio: Record<string, number[]>;
  finish: Record<string, number | null>;
  /** finish − arrive. */
  response: Record<string, number | null>;
}

/**
 * A preemptive fixed-priority scheduler, one tick at a time: the highest-priority ready task runs. A task that needs the
 * mutex while another holds it blocks. With `inherit`, the holder temporarily runs at the highest priority of the tasks
 * waiting for it (priority inheritance). Ties go to the task that arrived first.
 */
export function simulateRtos(tasks: RtosTask[], opts: { inherit: boolean; total: number }): RtosResult {
  const done: Record<string, number> = {};
  const finish: Record<string, number | null> = {};
  const states: Record<string, string[]> = {};
  const effPrio: Record<string, number[]> = {};
  for (const t of tasks) {
    done[t.id] = 0;
    finish[t.id] = null;
    states[t.id] = [];
    effPrio[t.id] = [];
  }
  let holder: string | null = null;
  const run: string[] = [];
  const needsLock = (t: RtosTask) => !!t.lock && done[t.id] >= t.lock[0] && done[t.id] < t.lock[1];
  for (let tick = 0; tick < opts.total; tick++) {
    const live = tasks.filter((t) => t.arrive <= tick && done[t.id] < t.work);
    const blocked = new Set(live.filter((t) => needsLock(t) && holder !== null && holder !== t.id).map((t) => t.id));
    const eff = (t: RtosTask) => {
      let p = t.prio;
      if (opts.inherit && holder === t.id) for (const w of live) if (blocked.has(w.id)) p = Math.max(p, w.prio);
      return p;
    };
    const ready = live.filter((t) => !blocked.has(t.id));
    ready.sort((a, b) => eff(b) - eff(a) || a.arrive - b.arrive);
    const cur = ready[0];
    for (const t of tasks) {
      effPrio[t.id].push(eff(t));
      states[t.id].push(t.arrive > tick ? "-" : done[t.id] >= t.work ? "done" : cur?.id === t.id ? "run" : blocked.has(t.id) ? "blocked" : "ready");
    }
    if (!cur) {
      run.push("idle");
      continue;
    }
    run.push(cur.id);
    if (needsLock(cur)) holder = cur.id;
    done[cur.id]++;
    if (cur.lock && done[cur.id] >= cur.lock[1] && holder === cur.id) holder = null;
    if (done[cur.id] >= cur.work) {
      finish[cur.id] = tick + 1;
      if (holder === cur.id) holder = null;
    }
  }
  const response: Record<string, number | null> = {};
  for (const t of tasks) response[t.id] = finish[t.id] === null ? null : finish[t.id]! - t.arrive;
  return { run, states, effPrio, finish, response };
}

// ───────────────────────────── low power ─────────────────────────────

export interface SleepMode {
  id: string;
  name: string;
  /** Typical current in that mode, mA, for a small Cortex-M class MCU (order of magnitude; real parts vary a lot). */
  mA: number;
  /** Typical time to wake and be running again, ms. */
  wakeMs: number;
  keeps: string;
  wakes: string;
}

export const SLEEP_MODES: SleepMode[] = [
  { id: "run", name: "Never sleep", mA: 5, wakeMs: 0, keeps: "Everything", wakes: "Never sleeps: it spins in a delay loop" },
  { id: "sleep", name: "Sleep", mA: 1.5, wakeMs: 0.001, keeps: "Everything: only the CPU clock stops", wakes: "Any interrupt" },
  { id: "stop", name: "Deep sleep", mA: 0.005, wakeMs: 0.01, keeps: "RAM and registers; most clocks off", wakes: "RTC alarm, a pin, some peripherals" },
  { id: "standby", name: "Standby", mA: 0.0005, wakeMs: 1, keeps: "Almost nothing: RAM lost, wakes up through a reset", wakes: "RTC alarm or a wake-up pin" },
];

/** Average current, mA, for a duty cycle `duty` (share of time active) between active and sleep currents. */
export const avgCurrent = (activeMa: number, sleepMa: number, duty: number) => duty * activeMa + (1 - duty) * sleepMa;

/** Ideal battery life in hours: capacity ÷ average current. Ignores self-discharge, temperature and ageing. */
export function batteryHours(capacityMah: number, activeMa: number, sleepUa: number, duty: number): number {
  return capacityMah / avgCurrent(activeMa, sleepUa / 1000, duty);
}

export interface PowerPlan {
  modeId: string;
  /** Time awake per wake-up, ms (doing the real work). */
  activeMs: number;
  /** Time between wake-ups, s. */
  periodS: number;
  capacityMah: number;
  /** Current while awake, mA. */
  activeMa?: number;
}

export interface PowerResult {
  duty: number;
  avgMa: number;
  hours: number;
  days: number;
  /** Share of the charge spent asleep. */
  sleepShare: number;
}

/** The wake time counts as active time (the chip runs at full current while it wakes up). */
export function powerPlan(p: PowerPlan): PowerResult {
  const mode = SLEEP_MODES.find((m) => m.id === p.modeId) ?? SLEEP_MODES[0];
  const act = p.activeMa ?? SLEEP_MODES[0].mA;
  const periodMs = p.periodS * 1000;
  const awakeMs = Math.min(periodMs, p.activeMs + mode.wakeMs);
  const duty = mode.id === "run" ? 1 : awakeMs / periodMs;
  const sleepMa = mode.id === "run" ? act : mode.mA;
  const avg = avgCurrent(act, sleepMa, duty);
  const hours = p.capacityMah / avg;
  return { duty, avgMa: avg, hours, days: hours / 24, sleepShare: avg > 0 ? ((1 - duty) * sleepMa) / avg : 0 };
}
