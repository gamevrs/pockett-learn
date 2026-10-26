/**
 * The sorting belt as a tiny simulation, separate from React.
 *
 * Fruit come from tomorrow's batch (the sensor rig with seed 99, the same batch the capstone lesson
 * checks), ride the conveyor under the scanner, get read by the learner's functions, and drop into
 * the bin their code chose. Positions change every frame and are written straight to the DOM by the
 * component; the React-visible snapshot only changes when something happens (a spawn, a scan result,
 * a drop), so the scene does not re-render sixty times a second.
 */
import { KINDS, type Kind, type Row } from "./data.ts";
import type { Inspection } from "./store.ts";
import { Rng, readSensors } from "./port.ts";

export const BELT_W = 640;
export const BELT_H = 176;
export const BELT_Y = 84; // top surface of the conveyor
export const SCAN_X = 232;
export const BIN_X: Record<Kind, number> = { apple: 430, pear: 508, plum: 586 };
export const BIN_TOP = 122;

export type Phase = "in" | "scan" | "carry" | "drop" | "done";

export interface BeltFruit {
  id: number;
  row: Row;
  r: number;
  x: number;
  y: number;
  vy: number;
  phase: Phase;
  t: number;
  opacity: number;
  insp: Inspection | null;
  target: Kind | null;
}

export interface BeltSnapshot {
  fruits: readonly BeltFruit[];
  counts: Record<Kind, { n: number; wrong: number }>;
  last: Inspection | null;
  total: number;
  wrong: number;
  /** bumps on every scan so the scanner flash can restart */
  scans: number;
}

const emptyCounts = (): BeltSnapshot["counts"] => ({ apple: { n: 0, wrong: 0 }, pear: { n: 0, wrong: 0 }, plum: { n: 0, wrong: 0 } });

let freshBatch: Row[] | null = null;
function tomorrow(): Row[] {
  freshBatch ??= readSensors(99).map((r) => ({ ...r }));
  return freshBatch;
}

export const radiusOf = (diameter: number) => Math.min(19, Math.max(10, diameter * 0.235));

export class BeltSim {
  private fruits: BeltFruit[] = [];
  private nextId = 1;
  private cursor = 0;
  private order: number[];
  private spawnIn = 0.3;
  private listeners = new Set<() => void>();
  private snap: BeltSnapshot;
  private counts = emptyCounts();
  private last: Inspection | null = null;
  private scans = 0;
  private total = 0;
  private wrong = 0;
  /** px per second along the belt */
  private speed = 86;
  private spawnEvery = 1.45;
  private enabled = false;

  /** Read one fruit with the learner's code. Supplied by the scene (it owns the store). */
  private inspect: (row: Row) => Inspection = (row) => ({ row, feats: null, label: null, predicted: null, source: "label", votes: null, prob: null, ripe: null, price: null });
  private onScan: (insp: Inspection) => void = () => {};

  configure(opts: { inspect?: (row: Row) => Inspection; onScan?: (insp: Inspection) => void; speed?: number; spawnEvery?: number; enabled?: boolean }) {
    if (opts.inspect) this.inspect = opts.inspect;
    if (opts.onScan) this.onScan = opts.onScan;
    if (opts.speed !== undefined) this.speed = opts.speed;
    if (opts.spawnEvery !== undefined) this.spawnEvery = opts.spawnEvery;
    if (opts.enabled !== undefined) this.enabled = opts.enabled;
  }

  constructor() {
    const rng = new Rng(5);
    const n = tomorrow().length;
    this.order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = rng.below(i + 1);
      [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    }
    this.snap = this.build();
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  getSnapshot = () => this.snap;

  private build(): BeltSnapshot {
    return { fruits: [...this.fruits], counts: { apple: { ...this.counts.apple }, pear: { ...this.counts.pear }, plum: { ...this.counts.plum } }, last: this.last, total: this.total, wrong: this.wrong, scans: this.scans };
  }
  private publish() {
    this.snap = this.build();
    this.listeners.forEach((l) => l());
  }

  /** A new program run (or a new unlock): start the batch over so the numbers mean something. */
  reset() {
    this.fruits = [];
    this.counts = emptyCounts();
    this.last = null;
    this.total = 0;
    this.wrong = 0;
    this.spawnIn = 0.4;
    this.publish();
  }

  /** Re-reads the fruit currently on the belt (the learner's code changed under them). */
  live() {
    return this.fruits;
  }

  step(dtRaw: number) {
    if (!this.enabled) return;
    const dt = Math.min(dtRaw, 0.08);
    let changed = false;
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = this.spawnEvery;
      const row = tomorrow()[this.order[this.cursor++ % this.order.length]];
      const r = radiusOf(row.diameter);
      this.fruits.push({ id: this.nextId++, row, r, x: -26, y: BELT_Y - r, vy: 0, phase: "in", t: 0, opacity: 1, insp: null, target: null });
      changed = true;
    }
    for (const f of this.fruits) {
      f.t += dt;
      if (f.phase === "in") {
        f.x += this.speed * dt;
        if (f.x >= SCAN_X) {
          f.phase = "scan";
          f.t = 0;
          const insp = this.inspect(f.row);
          f.insp = insp;
          f.target = insp.predicted ?? insp.label;
          this.last = insp;
          this.scans += 1;
          this.onScan(insp);
          changed = true;
        }
      } else if (f.phase === "scan") {
        f.x += this.speed * dt;
        if (f.t > 0.6) {
          f.phase = "carry";
          f.t = 0;
        }
      } else if (f.phase === "carry") {
        f.x += this.speed * dt;
        const bx = f.target ? BIN_X[f.target] : null;
        if (bx !== null && f.x >= bx) {
          f.x = bx;
          f.phase = "drop";
          f.t = 0;
          f.vy = 40;
          changed = true;
        } else if (bx === null && f.x > BELT_W + 30) {
          f.phase = "done";
          changed = true;
        }
      } else if (f.phase === "drop") {
        f.vy += 900 * dt;
        f.y += f.vy * dt;
        if (f.y >= BIN_TOP + 22) {
          f.phase = "done";
          if (f.target) {
            const wrong = f.row.kind !== f.target && f.insp?.source !== "label";
            this.counts[f.target].n += 1;
            if (wrong) {
              this.counts[f.target].wrong += 1;
              this.wrong += 1;
            }
            this.total += 1;
          }
          changed = true;
        }
      }
    }
    const before = this.fruits.length;
    this.fruits = this.fruits.filter((f) => f.phase !== "done");
    if (this.fruits.length !== before) changed = true;
    if (changed) this.publish();
  }

  /** True when the learner's code has not been asked to classify anything yet. */
  get idle() {
    return this.fruits.length === 0;
  }
}

export const BIN_KINDS = KINDS;
