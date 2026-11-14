/**
 * Pure logic for the "Building real products" widgets (no React). The running example is "Sprout", a
 * battery-powered plant monitor. All part prices, currents and rates here are ILLUSTRATIVE round numbers for
 * teaching, not data for a real product.
 */

// ───────────── requirements ─────────────

const UNITS = new Set([
  "month", "months", "year", "years", "day", "days", "hour", "hours", "minute", "minutes", "min", "second", "seconds", "s", "ms",
  "mm", "cm", "m", "g", "kg", "%", "$", "usd", "ma", "ua", "mah", "v", "c", "°c", "steps", "taps", "units",
]);
const VAGUE = ["long", "small", "cheap", "easy", "fast", "good", "robust", "reliable", "friendly", "simple", "compact", "low", "high", "better", "nice", "lightweight", "strong", "durable", "outdoor", "very"];

/** A deliberately simple keyword rule: a requirement is "measurable" if it has a number and a unit (or count word). */
export function isMeasurable(text: string): { ok: boolean; reason: string } {
  const words = text.toLowerCase().replace(/[(),;]/g, " ").split(/\s+/).filter(Boolean);
  const hasNumber = words.some((w) => /\d/.test(w));
  const hasUnit = words.some((w) => UNITS.has(w.replace(/[\d.\-]/g, "")));
  const vague = words.find((w) => VAGUE.includes(w.replace(/[^a-z]/g, "")));
  if (!text.trim()) return { ok: false, reason: "Type a requirement to test." };
  if (hasNumber && hasUnit) return { ok: true, reason: "Has a number and a unit, so two people could test it and agree." };
  if (vague && !hasNumber) return { ok: false, reason: `"${vague}" is a judgement, not a number. How long, how small, how cheap?` };
  if (!hasNumber) return { ok: false, reason: "No number, so there is nothing to test against." };
  return { ok: false, reason: "There is a number but no unit (months? mm? dollars?), so it is not testable yet." };
}

// ───────────── battery ─────────────

export interface BatteryModel {
  /** Rated capacity, mAh (typical datasheet figure). */
  capacityMah: number;
  /** Fraction of the capacity you can count on (temperature, cut-off voltage, ageing). */
  usable: number;
  /** Everything that stays on while asleep (MCU, regulator, sensor leakage), microamps. */
  sleepUa: number;
  /** Seconds between reports. */
  intervalS: number;
  /** Measurement: duration (ms) and current (mA). */
  measureMs: number;
  measureMa: number;
  /** Radio burst per report: duration (ms) and average current (mA). */
  radioMs: number;
  radioMa: number;
}

/** Charge per cycle in mA·s, split by what spent it. */
export function cycleCharge(m: BatteryModel) {
  const awakeS = (m.measureMs + m.radioMs) / 1000;
  const sleepS = Math.max(0, m.intervalS - awakeS);
  const sleep = (m.sleepUa / 1000) * sleepS;
  const measure = m.measureMa * (m.measureMs / 1000);
  const radio = m.radioMa * (m.radioMs / 1000);
  return { sleep, measure, radio, total: sleep + measure + radio };
}

export function avgCurrentMa(m: BatteryModel): number {
  return cycleCharge(m).total / m.intervalS;
}

export function batteryDays(m: BatteryModel): number {
  const avg = avgCurrentMa(m);
  return (m.capacityMah * m.usable) / avg / 24;
}

export const monthsOf = (days: number) => days / 30.4375;

// ───────────── BOM ─────────────

export interface PartLine {
  name: string;
  count: number;
  /** price breaks: [min quantity bought, unit price] ascending */
  breaks: [number, number][];
}

export function bomCost(parts: PartLine[], qty: number): number {
  let total = 0;
  for (const p of parts) {
    const need = p.count * qty;
    let price = p.breaks[0][1];
    for (const [min, pr] of p.breaks) if (need >= min) price = pr;
    total += p.count * price;
  }
  return Math.round(total * 100) / 100;
}

// ───────────── first pass yield ─────────────

export function firstPassYield(rates: number[]): number {
  return rates.reduce((a, r) => a * r, 1);
}

// ───────────── Pareto ─────────────

export function paretoShare(counts: number[], k: number): number {
  const sorted = counts.slice().sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  return sorted.slice(0, k).reduce((a, b) => a + b, 0) / total;
}

// ───────────── bring-up ─────────────

/** Adjustable regulator: Vout = Vref · (1 + R1/R2). Vref ~0.8 V is a typical value, check the datasheet. */
export const VREF = 0.8;
export const regulatorOut = (r1: number, r2: number) => VREF * (1 + r1 / r2);

export type Fault = "good" | "short" | "wrongreg" | "noclock";

export interface BoardModel {
  fault: Fault;
  /** equivalent resistance the board presents to the 3.0 V supply, ohms */
  loadOhms: number;
  r1: number;
  r2: number;
  /** resistance 3V3 to GND measured unpowered */
  railToGnd: string;
}

export const SUPPLY_V = 3.0;

export function board(fault: Fault): BoardModel {
  switch (fault) {
    case "short":
      return { fault, loadOhms: 0.2, r1: 316e3, r2: 100e3, railToGnd: "0.2 Ω" };
    case "wrongreg":
      return { fault, loadOhms: SUPPLY_V / 0.0016, r1: 100e3, r2: 100e3, railToGnd: "climbs past 10 kΩ" };
    case "noclock":
      return { fault, loadOhms: SUPPLY_V / 0.0004, r1: 316e3, r2: 100e3, railToGnd: "climbs past 10 kΩ" };
    default:
      return { fault, loadOhms: SUPPLY_V / 0.0031, r1: 316e3, r2: 100e3, railToGnd: "climbs past 10 kΩ" };
  }
}

/** A current-limited bench supply feeding a resistive load. limitMa = Infinity means no limit. */
export function supplyResponse(vSet: number, limitMa: number, loadOhms: number) {
  const wanted = vSet / loadOhms; // A
  const limit = limitMa / 1000;
  if (wanted <= limit) return { mode: "CV" as const, volts: vSet, amps: wanted, wanted };
  return { mode: "CC" as const, volts: limit * loadOhms, amps: limit, wanted };
}

// ───────────── detective: brown-out ─────────────

export interface SagModel {
  vOpen: number;
  rInt: number;
  iBurst: number;
  burstS: number;
  capF: number;
}

/** Battery (open-circuit voltage + internal resistance) feeding a bulk capacitor and a load that draws iBurst for burstS. Returns the supply-rail voltage over time. */
export function sagTrace(m: SagModel, tEnd: number, n: number): { t: number[]; v: number[] } {
  const t: number[] = [];
  const v: number[] = [];
  let vc = m.vOpen;
  const t0 = tEnd * 0.2;
  for (let k = 0; k <= n; k++) {
    const tt = (k / n) * tEnd;
    const iLoad = tt >= t0 && tt < t0 + m.burstS ? m.iBurst : 0;
    const dt = tEnd / n;
    if (m.capF > 0) {
      // implicit step keeps it stable for tiny capacitors too
      const g = 1 / m.rInt;
      vc = (vc + (dt / m.capF) * (g * m.vOpen - iLoad)) / (1 + (dt / m.capF) * g);
    } else {
      vc = m.vOpen - m.rInt * iLoad;
    }
    t.push(tt);
    v.push(vc);
  }
  return { t, v };
}

export const minOf = (a: number[]) => a.reduce((x, y) => Math.min(x, y), Infinity);

// ───────────── detective: I²C ─────────────

/** First byte on the wire for a 7-bit address: address in the top 7 bits, R/W in bit 0. */
export const i2cAddrByte = (addr7: number, read: boolean) => ((addr7 << 1) | (read ? 1 : 0)) & 0xff;

// ───────────── firmware state machine ─────────────

export type FsmState = "sleep" | "wake" | "measure" | "send" | "backoff";

export interface FsmRun {
  state: FsmState;
  attempt: number;
  maxAttempts: number;
  gaveUp: boolean;
  cycles: number;
  charge: Record<FsmState, number>;
  log: string[];
}

export const FSM_PARAMS: Record<FsmState, { ms: number; ma: number }> = {
  sleep: { ms: 0, ma: 0.008 },
  wake: { ms: 2, ma: 3 },
  measure: { ms: 100, ma: 2 },
  send: { ms: 300, ma: 9 },
  backoff: { ms: 2000, ma: 0.008 },
};

export function fsmStart(maxAttempts = 3): FsmRun {
  return { state: "sleep", attempt: 0, maxAttempts, gaveUp: false, cycles: 0, charge: { sleep: 0, wake: 0, measure: 0, send: 0, backoff: 0 }, log: ["boot: reason=power-on"] };
}

/** Advance one transition. `phoneNear` decides whether a send succeeds. Charge in mA·s is booked to the state we just spent time in. */
export function fsmStep(r: FsmRun, phoneNear: boolean, intervalS = 900): FsmRun {
  const n: FsmRun = { ...r, charge: { ...r.charge }, log: r.log.slice(-5) };
  const spend = (s: FsmState, seconds?: number) => {
    const p = FSM_PARAMS[s];
    n.charge[s] += p.ma * (seconds ?? p.ms / 1000);
  };
  switch (r.state) {
    case "sleep":
      n.state = "wake";
      n.gaveUp = false;
      n.attempt = 0;
      n.log.push("rtc: wake");
      break;
    case "wake":
      spend("wake");
      n.state = "measure";
      n.log.push("clock ok, sensors on");
      break;
    case "measure":
      spend("measure");
      n.state = "send";
      n.log.push("sample: moisture 41%, light 320 lx");
      break;
    case "send":
      spend("send");
      n.attempt = r.attempt + 1;
      if (phoneNear) {
        n.state = "sleep";
        spend("sleep", intervalS);
        n.cycles = r.cycles + 1;
        n.log.push(`ble: sent (attempt ${n.attempt})`);
      } else if (n.attempt >= r.maxAttempts) {
        n.state = "sleep";
        spend("sleep", intervalS);
        n.gaveUp = true;
        n.cycles = r.cycles + 1;
        n.log.push(`ble: no phone, giving up, sample stored (attempt ${n.attempt})`);
      } else {
        n.state = "backoff";
        n.log.push(`ble: no phone (attempt ${n.attempt}), back off`);
      }
      break;
    case "backoff":
      spend("backoff");
      n.state = "send";
      n.log.push("retry");
      break;
  }
  return n;
}

// ───────────── OTA ─────────────

export type OtaScenario = "good" | "tampered" | "crash" | "power";

export interface OtaStep {
  title: string;
  detail: string;
  /** state of slots after this step */
  a: string;
  b: string;
  active: "A" | "B";
  done?: boolean;
}

export function otaSteps(s: OtaScenario): OtaStep[] {
  const head: OtaStep[] = [
    { title: "Running v1.0 from slot A", detail: "Slot B is the spare. The device keeps working while the update arrives.", a: "v1.0 (running)", b: "empty or old", active: "A" },
    { title: "Download v1.1 into slot B", detail: "The new image is written to the slot that is NOT running, so the working copy is never touched.", a: "v1.0 (running)", b: "v1.1 (downloading)", active: "A" },
  ];
  if (s === "power") {
    return [...head, { title: "Battery dies mid-download", detail: "Slot B holds half an image. Slot A was never touched, so on the next power-up the bootloader still boots v1.0. Nothing is bricked.", a: "v1.0 (running)", b: "v1.1 (incomplete, ignored)", active: "A", done: true }];
  }
  const verify: OtaStep = {
    title: "Verify hash and signature",
    detail: "Check the image is complete (hash) and signed by the maker's private key (checked with a public key stored in the device).",
    a: "v1.0 (running)",
    b: s === "tampered" ? "v1.1 (BAD signature)" : "v1.1 (verified)",
    active: "A",
  };
  if (s === "tampered") {
    return [...head, verify, { title: "Reject the image", detail: "The signature does not match, so the image is thrown away and never booted. This is what stops someone else's firmware being installed.", a: "v1.0 (running)", b: "erased", active: "A", done: true }];
  }
  const tail: OtaStep[] = [
    verify,
    { title: "Mark B as 'try once' and reboot", detail: "The bootloader is told to try slot B one time. If B does not confirm itself, the next boot falls back to A.", a: "v1.0 (fallback)", b: "v1.1 (on trial)", active: "B" },
  ];
  if (s === "crash") {
    return [
      ...head,
      ...tail,
      { title: "v1.1 crashes; the watchdog resets", detail: "The new firmware never confirmed itself, so the bootloader rolls back and boots v1.0 from slot A. The bad update cost a few minutes, not a returned product.", a: "v1.0 (running)", b: "v1.1 (failed, marked bad)", active: "A", done: true },
    ];
  }
  return [
    ...head,
    ...tail,
    { title: "v1.1 passes its self-test and confirms", detail: "After checking that the sensors, radio and storage work, the new firmware tells the bootloader 'I am fine'. Slot B becomes the default; slot A is kept as the fallback for next time.", a: "v1.0 (fallback)", b: "v1.1 (running, confirmed)", active: "B", done: true },
  ];
}

// ───────────── certification planner ─────────────

export interface CertInput {
  radio: "module" | "chipdown";
  power: "aa" | "coin" | "liion";
  markets: number;
}

export interface CertItem {
  id: string;
  title: string;
  detail: string;
  saves?: string;
  effort: number;
}

export function certPlan(c: CertInput): CertItem[] {
  const items: CertItem[] = [];
  items.push({
    id: "radio",
    title: "Radio approval (intentional radiator)",
    detail: "Each market has its own rules for radio equipment: FCC (US), ISED (Canada), CE under the RED (EU) and UKCA (UK) are examples. A test lab measures power, frequency and spurious emissions.",
    saves: c.radio === "module" ? "A pre-certified module brings its own radio test results. You re-use them if you follow its integration rules (antenna, labelling, layout)." : undefined,
    effort: c.radio === "module" ? 1 : 3 + c.markets,
  });
  items.push({
    id: "emc",
    title: "EMC of the whole product",
    detail: "The finished product must not emit more noise than the limits allow, and must keep working when disturbed (immunity). Your own board's emissions are tested even when the radio is a module.",
    effort: 2 + (c.markets > 2 ? 1 : 0),
  });
  items.push({
    id: "safety",
    title: "Electrical and battery safety",
    detail:
      c.power === "liion"
        ? "A rechargeable lithium-ion pack needs a protection circuit and a safety-tested cell or pack (IEC 62133 is an example standard), plus a safe charger design."
        : "Low-voltage primary cells (alkaline or coin) are the easiest case. Still check the product-safety standard for your category and market.",
    effort: c.power === "liion" ? 3 : 1,
  });
  if (c.power !== "aa") {
    items.push({
      id: "transport",
      title: "Shipping lithium batteries",
      detail: "Lithium cells and batteries are regulated for transport. UN 38.3 is the test series for lithium cells and packs; carriers also have packaging and labelling rules. Cell makers can supply test summaries, but ask your carrier and a test lab what applies to your product.",
      effort: c.power === "liion" ? 3 : 1,
    });
  }
  items.push({
    id: "env",
    title: "Materials and end-of-life rules",
    detail: "Examples: RoHS limits on hazardous substances, battery and waste-electronics rules, and product marking. Your component suppliers' declarations feed this.",
    effort: 1,
  });
  return items;
}

export const certEffort = (items: CertItem[]) => items.reduce((a, i) => a + i.effort, 0);
