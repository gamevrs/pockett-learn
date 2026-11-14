// Pure model for chip-domains: a small SoC with power domains, and the special cells each signal crossing needs. No UI.
//
//   isolation cell   needed when the SOURCE domain can be switched off while the receiving domain stays on
//                    (an unpowered output floats; the isolation cell clamps it to a known value)
//   level shifter    needed when the two domains can sit at different voltages (fixed and different, or one of
//                    them moving with DVFS). Toy rule: every such crossing gets one, in either direction.
//
// Toy SoC, numbers illustrative.

export type DomainId = "cpu" | "radio" | "aon" | "io";

export interface Domain {
  id: DomainId;
  name: string;
  /** Can be power-gated (switched off). */
  switchable: boolean;
  /** Supply range in volts; a range with min < max means DVFS. */
  vMin: number;
  vMax: number;
}

export const DOMAINS: Domain[] = [
  { id: "cpu", name: "CPU", switchable: true, vMin: 0.6, vMax: 0.9 },
  { id: "radio", name: "Radio", switchable: true, vMin: 0.8, vMax: 0.8 },
  { id: "aon", name: "Always-on", switchable: false, vMin: 0.8, vMax: 0.8 },
  { id: "io", name: "I/O ring", switchable: false, vMin: 1.8, vMax: 1.8 },
];

export const domainOf = (id: DomainId) => DOMAINS.find((d) => d.id === id)!;

export interface Crossing {
  id: string;
  from: DomainId;
  to: DomainId;
  signal: string;
}

export const CROSSINGS: Crossing[] = [
  { id: "c1", from: "cpu", to: "aon", signal: "irq_ack" },
  { id: "c2", from: "aon", to: "cpu", signal: "wake" },
  { id: "c3", from: "radio", to: "aon", signal: "rx_ready" },
  { id: "c4", from: "aon", to: "radio", signal: "tx_enable" },
  { id: "c5", from: "aon", to: "io", signal: "uart_tx" },
  { id: "c6", from: "radio", to: "cpu", signal: "rx_data" },
];

export type Cells = "none" | "iso" | "ls" | "both";
export const CELL_OPTIONS: Cells[] = ["none", "iso", "ls", "both"];
export const CELL_LABEL: Record<Cells, string> = { none: "Nothing", iso: "Isolation", ls: "Level shifter", both: "Both" };
/** Toy area per cell (µm²), so over-protecting has a visible cost. */
export const ISO_AREA = 1.2;
export const LS_AREA = 3.5;

export const needsIso = (c: Crossing) => domainOf(c.from).switchable;
export function needsLs(c: Crossing): boolean {
  const a = domainOf(c.from);
  const b = domainOf(c.to);
  const fixedSame = a.vMin === a.vMax && b.vMin === b.vMax && a.vMin === b.vMin;
  return !fixedSame;
}

export function required(c: Crossing): Cells {
  const iso = needsIso(c);
  const ls = needsLs(c);
  return iso && ls ? "both" : iso ? "iso" : ls ? "ls" : "none";
}

const hasIso = (x: Cells) => x === "iso" || x === "both";
const hasLs = (x: Cells) => x === "ls" || x === "both";

export interface Verdict {
  ok: boolean;
  missingIso: boolean;
  missingLs: boolean;
  extraIso: boolean;
  extraLs: boolean;
}

export function verdict(c: Crossing, chosen: Cells): Verdict {
  const need = required(c);
  const missingIso = hasIso(need) && !hasIso(chosen);
  const missingLs = hasLs(need) && !hasLs(chosen);
  const extraIso = !hasIso(need) && hasIso(chosen);
  const extraLs = !hasLs(need) && hasLs(chosen);
  return { ok: !missingIso && !missingLs && !extraIso && !extraLs, missingIso, missingLs, extraIso, extraLs };
}

export function areaOf(choice: Record<string, Cells>): number {
  let a = 0;
  for (const c of CROSSINGS) {
    const x = choice[c.id] ?? "none";
    if (hasIso(x)) a += ISO_AREA;
    if (hasLs(x)) a += LS_AREA;
  }
  return Math.round(a * 10) / 10;
}

export interface DomainsState {
  cells: Record<string, Cells>;
  isoCount: number;
  lsCount: number;
  areaUm2: number;
}

export function stateOfDomains(cells: Record<string, Cells>): DomainsState {
  let iso = 0;
  let ls = 0;
  for (const c of CROSSINGS) {
    const x = cells[c.id] ?? "none";
    if (hasIso(x)) iso++;
    if (hasLs(x)) ls++;
  }
  return { cells: { ...cells }, isoCount: iso, lsCount: ls, areaUm2: areaOf(cells) };
}

/** goal: { allCorrect: true } — every crossing gets exactly the cells it needs (nothing missing, nothing extra). */
export function checkDomains(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<DomainsState> | undefined;
  if (!s || typeof s.cells !== "object" || s.cells === null) return false;
  const cells = s.cells as Record<string, unknown>;
  let any = false;
  if (goal.allCorrect === true) {
    any = true;
    for (const c of CROSSINGS) {
      const x = cells[c.id];
      if (typeof x !== "string" || !(CELL_OPTIONS as string[]).includes(x)) return false;
      if (!verdict(c, x as Cells).ok) return false;
    }
  }
  return any;
}
