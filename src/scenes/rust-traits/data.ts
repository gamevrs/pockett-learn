import type { ProgramHandle } from "@/engine/program";
import { readAny, type BuildError } from "../rust-inventory/data";

export type { BuildError };

/**
 * What the Skerry Post fleet board reads from the learner's Rust program. A compiled program can't be
 * called back, so the board works from the values the program printed with `scene("key", value)` (each
 * one an `@scene {json}` line). Every value may be missing or the wrong type: the readers below return
 * `undefined` / empty lists instead of guessing, and never throw.
 *
 * A failed build arrives as `build_error` ({ type, message, line }) where `type` is the rustc error code
 * ("E0277"), "CompileError" for a syntax error without a code, or "Panic" for a crash.
 *
 * Pure module (no React).
 */

// ───────────────────────── safe readers ─────────────────────────

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const strList = (v: unknown): string[] | undefined => arr(v)?.map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)));
const numList = (v: unknown): number[] | undefined => arr(v)?.flatMap((x) => (num(x) === undefined ? [] : [x as number]));
const recs = (v: unknown): Record<string, unknown>[] | undefined => arr(v)?.filter(isRec);
const point = (v: unknown): [number, number] | undefined => {
  const l = numList(v);
  return l && l.length >= 2 ? [l[0], l[1]] : undefined;
};

// ───────────────────────── the model ─────────────────────────

export type Kind = "Sparrow" | "Heron" | "Glider" | "Unknown";

/** The kind of drone behind a callsign like "Heron-12". */
export function kindOf(callsign: string, hint?: string): Kind {
  const text = (hint ?? callsign).toLowerCase();
  if (text.startsWith("sparrow")) return "Sparrow";
  if (text.startsWith("heron")) return "Heron";
  if (text.startsWith("glider")) return "Glider";
  return "Unknown";
}

export interface DroneCard {
  kind: Kind;
  callsign: string;
  battery: number | undefined;
}

export interface CarrierCard {
  callsign: string;
  capacityKg: number | undefined;
  canLift6: boolean | undefined;
  note: string;
  overridden: boolean;
}

export interface CopyRow {
  copy: string;
  result: string;
}

export interface PlanRow {
  callsign: string;
  kg: number | undefined;
  ok: boolean;
  text: string;
}

export interface Choice {
  pads: string[];
  bays: number | undefined;
  totalCharge: number | undefined;
  callsigns: string[];
}

export interface ParcelCard {
  display: string;
  debug: string;
  equalToTwin: boolean | undefined;
  equalToHeavier: boolean | undefined;
}

export interface ViaRow {
  via: string;
  result: string;
}

export interface Harbour {
  depot: [number, number] | undefined;
  isle: [number, number] | undefined;
  reef: [number, number] | undefined;
  leg: [number, number] | undefined;
  roundTrip: [number, number] | undefined;
  home: [number, number] | undefined;
  landing: [number, number] | undefined;
  route: [number, number][];
  distanceToReef: number | undefined;
}

export interface BidRow {
  rank: number;
  callsign: string;
  distance: number | undefined;
  battery: number | undefined;
}

export interface Ranking {
  bids: BidRow[];
  best: string | undefined;
  urgencies: string[];
  loads: number[];
}

export interface Charging {
  from: number | undefined;
  readings: number[];
  hops: [number, number][];
}

export interface Adaptors {
  legs: number[];
  total: number | undefined;
  longLegs: number | undefined;
  plan: string[];
  stages: { stage: string; count: number }[];
}

export interface DepotView {
  name: string | undefined;
  docks: number | undefined;
  holders: string[];
  steps: { label: string; count: number }[];
}

export interface LedgerView {
  delivered: number | undefined;
  entries: string[];
  strongCount: number | undefined;
  whileReading: string | undefined;
  afterReader: string | undefined;
}

export interface RigRow {
  label: string;
  used: number;
  slots: number;
  first: string;
}

export interface DispatchDay {
  log: string[];
  delivered: number | undefined;
  total: number | undefined;
  deliveredKg: number | undefined;
  left: string[];
  runners: { name: string; deliveries: number }[];
  holders: number | undefined;
}

export interface Fleet {
  roster?: DroneCard[];
  carriers?: CarrierCard[];
  monomorphs?: CopyRow[];
  plans?: PlanRow[];
  standby?: string;
  hangar?: DroneCard[];
  lowBattery?: string[];
  choice?: Choice;
  parcelCard?: ParcelCard;
  conversions?: ViaRow[];
  harbour?: Harbour;
  ranking?: Ranking;
  charging?: Charging;
  adaptors?: Adaptors;
  depot?: DepotView;
  ledgerView?: LedgerView;
  rigs?: RigRow[];
  dispatchDay?: DispatchDay;
  error: BuildError | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "roster",
  "carriers",
  "monomorphs",
  "plans",
  "standby",
  "hangar",
  "lowBattery",
  "choice",
  "parcelCard",
  "conversions",
  "harbour",
  "ranking",
  "charging",
  "adaptors",
  "depot",
  "ledgerView",
  "rigs",
  "dispatchDay",
] as const;

function readDrones(v: unknown): DroneCard[] | undefined {
  return recs(v)?.map((r) => {
    const callsign = str(r.callsign) ?? "?";
    return { kind: kindOf(callsign, str(r.kind)), callsign, battery: num(r.battery) };
  });
}

export function readFleet(p: ProgramHandle | null): Fleet {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);

  const err = g("build_error");
  const error: BuildError | null = isRec(err) ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null } : null;

  const ch = g("choice");
  const pc = g("parcelCard");
  const hb = g("harbour");
  const rk = g("ranking");
  const cg = g("charging");
  const ad = g("adaptors");
  const dp = g("depot");
  const lv = g("ledgerView");
  const dd = g("dispatchDay");

  return {
    roster: readDrones(g("roster")),
    carriers: recs(g("carriers"))?.map((r) => ({
      callsign: str(r.callsign) ?? "?",
      capacityKg: num(r.capacityKg),
      canLift6: bool(r.canLift6),
      note: str(r.note) ?? "",
      overridden: bool(r.overridden) ?? false,
    })),
    monomorphs: recs(g("monomorphs"))?.map((r) => ({ copy: str(r.copy) ?? "?", result: str(r.result) ?? "" })),
    plans: recs(g("plans"))?.map((r) => ({ callsign: str(r.callsign) ?? "?", kg: num(r.kg), ok: bool(r.ok) ?? false, text: str(r.text) ?? "" })),
    standby: str(g("standby")),
    hangar: readDrones(g("hangar")),
    lowBattery: strList(g("lowBattery")),
    choice: isRec(ch) ? { pads: strList(ch.pads) ?? [], bays: num(ch.bays), totalCharge: num(ch.totalCharge), callsigns: strList(ch.callsigns) ?? [] } : undefined,
    parcelCard: isRec(pc) ? { display: str(pc.display) ?? "", debug: str(pc.debug) ?? "", equalToTwin: bool(pc.equalToTwin), equalToHeavier: bool(pc.equalToHeavier) } : undefined,
    conversions: recs(g("conversions"))?.map((r) => ({ via: str(r.via) ?? "?", result: str(r.result) ?? "" })),
    harbour: isRec(hb)
      ? {
          depot: point(hb.depot),
          isle: point(hb.isle),
          reef: point(hb.reef),
          leg: point(hb.leg),
          roundTrip: point(hb.roundTrip),
          home: point(hb.home),
          landing: point(hb.landing),
          route: (arr(hb.route) ?? []).flatMap((x) => {
            const q = point(x);
            return q ? [q] : [];
          }),
          distanceToReef: num(hb.distanceToReef),
        }
      : undefined,
    ranking: isRec(rk)
      ? {
          bids: (recs(rk.bids) ?? []).map((b) => ({ rank: num(b.rank) ?? 0, callsign: str(b.callsign) ?? "?", distance: num(b.distance), battery: num(b.battery) })),
          best: str(rk.best),
          urgencies: strList(rk.urgencies) ?? [],
          loads: numList(rk.loads) ?? [],
        }
      : undefined,
    charging: isRec(cg)
      ? {
          from: num(cg.from),
          readings: numList(cg.readings) ?? [],
          hops: (arr(cg.hops) ?? []).flatMap((x) => {
            const q = point(x);
            return q ? [q] : [];
          }),
        }
      : undefined,
    adaptors: isRec(ad)
      ? {
          legs: numList(ad.legs) ?? [],
          total: num(ad.total),
          longLegs: num(ad.longLegs),
          plan: strList(ad.plan) ?? [],
          stages: (recs(ad.stages) ?? []).map((s) => ({ stage: str(s.stage) ?? "?", count: num(s.count) ?? 0 })),
        }
      : undefined,
    depot: isRec(dp)
      ? {
          name: str(dp.name),
          docks: num(dp.docks),
          holders: strList(dp.holders) ?? [],
          steps: (recs(dp.steps) ?? []).map((s) => ({ label: str(s.label) ?? "?", count: num(s.count) ?? 0 })),
        }
      : undefined,
    ledgerView: isRec(lv)
      ? { delivered: num(lv.delivered), entries: strList(lv.entries) ?? [], strongCount: num(lv.strongCount), whileReading: str(lv.whileReading), afterReader: str(lv.afterReader) }
      : undefined,
    rigs: recs(g("rigs"))?.map((r) => ({ label: str(r.label) ?? "rig", used: num(r.used) ?? 0, slots: Math.max(1, num(r.slots) ?? 1), first: str(r.first) ?? "" })),
    dispatchDay: isRec(dd)
      ? {
          log: strList(dd.log) ?? [],
          delivered: num(dd.delivered),
          total: num(dd.total),
          deliveredKg: num(dd.deliveredKg),
          left: strList(dd.left) ?? [],
          runners: (recs(dd.runners) ?? []).map((r) => ({ name: str(r.name) ?? "?", deliveries: num(r.deliveries) ?? 0 })),
          holders: num(dd.holders),
        }
      : undefined,
    error,
  };
}

/** The drones the harbour map should show: the newest list the program sent. */
export function pickDrones(f: Fleet): DroneCard[] {
  return f.hangar && f.hangar.length > 0 ? f.hangar : (f.roster ?? []);
}

// ───────────────────────── panels ─────────────────────────

export interface Panel {
  id: string;
  title: string;
  short: string;
  lesson: number;
  /** What the learner writes to light it, shown on a locked panel. */
  clause: string;
}

export const PANELS: Panel[] = [
  { id: "df-roster", title: "Roster", short: "Roster", lesson: 1, clause: "trait Drone { fn callsign(&self) ... }" },
  { id: "df-abilities", title: "Carrier desk", short: "Carriers", lesson: 2, clause: "default methods and overrides" },
  { id: "df-generics", title: "Copies made", short: "Generics", lesson: 3, clause: "fn power_line<T: Drone>(d: &T)" },
  { id: "df-bounds", title: "Drop plans", short: "Bounds", lesson: 4, clause: "where T: Carrier + Beacon, impl Trait" },
  { id: "df-hangar", title: "Hangar", short: "Trait objects", lesson: 5, clause: "Vec<Box<dyn Drone>>" },
  { id: "df-choice", title: "Pads vs hangar", short: "dyn or generics", lesson: 6, clause: "Pad<T: Drone> and a dyn Hangar" },
  { id: "df-derives", title: "Parcel card", short: "Derive", lesson: 7, clause: "#[derive(Debug, Clone, PartialEq)], Display" },
  { id: "df-convert", title: "Conversions", short: "Default, From", lesson: 8, clause: "impl Default, impl From<T>" },
  { id: "df-harbour", title: "Harbour grid", short: "Operators", lesson: 9, clause: "impl Add, Sub, Mul, Neg, Index" },
  { id: "df-ranking", title: "Bid ranking", short: "Ordering", lesson: 10, clause: "impl Ord, derive PartialOrd" },
  { id: "df-charging", title: "Charging dock", short: "Iterator", lesson: 11, clause: "impl Iterator for Charging" },
  { id: "df-pipeline", title: "Route report", short: "Adaptors", lesson: 12, clause: "zip, filter, sum on your iterator" },
  { id: "df-depot", title: "Shared depot", short: "Rc", lesson: 13, clause: "Rc::new, Rc::clone" },
  { id: "df-ledger", title: "Ledger", short: "RefCell", lesson: 14, clause: "Rc<RefCell<Ledger>>" },
  { id: "df-rigs", title: "Rigs", short: "Assoc items", lesson: 15, clause: "const SLOTS, type Cargo" },
  { id: "df-board", title: "Dispatch board", short: "Dispatch day", lesson: 16, clause: "Box<dyn Worker> on a shared shelf" },
];

/** The first panel doubles as the console's unlock. */
export const CONSOLE_ID = "df-roster";

/** A short live value for a panel's chip in the overview, or undefined when there is nothing to say yet. */
export function tileValue(id: string, f: Fleet): string | undefined {
  switch (id) {
    case "df-roster":
      return f.roster ? `${f.roster.length} drones` : undefined;
    case "df-abilities":
      return f.carriers ? `${f.carriers.filter((c) => c.overridden).length} override` : undefined;
    case "df-generics":
      return f.monomorphs ? `${f.monomorphs.length} copies` : undefined;
    case "df-bounds":
      return f.plans ? `${f.plans.filter((p) => p.ok).length}/${f.plans.length} ok` : undefined;
    case "df-hangar":
      return f.hangar ? `${f.hangar.length} boxed` : undefined;
    case "df-choice":
      return f.choice?.totalCharge !== undefined ? `${f.choice.totalCharge}% total` : undefined;
    case "df-derives":
      return f.parcelCard ? f.parcelCard.display : undefined;
    case "df-convert":
      return f.conversions ? `${f.conversions.length} ways` : undefined;
    case "df-harbour":
      return f.harbour?.distanceToReef !== undefined ? `reef ${f.harbour.distanceToReef} cells` : undefined;
    case "df-ranking":
      return f.ranking?.best;
    case "df-charging":
      return f.charging && f.charging.readings.length > 0 ? `to ${f.charging.readings[f.charging.readings.length - 1]}%` : undefined;
    case "df-pipeline":
      return f.adaptors?.total !== undefined ? `${f.adaptors.total} cells` : undefined;
    case "df-depot":
      return f.depot ? `${f.depot.steps[f.depot.steps.length - 1]?.count ?? "?"} holders` : undefined;
    case "df-ledger":
      return f.ledgerView?.delivered !== undefined ? `${f.ledgerView.delivered} logged` : undefined;
    case "df-rigs":
      return f.rigs ? `${f.rigs.length} rigs` : undefined;
    case "df-board":
      return f.dispatchDay?.delivered !== undefined ? `${f.dispatchDay.delivered}/${f.dispatchDay.total ?? "?"} sent` : undefined;
    default:
      return undefined;
  }
}

export { outputLines, explainError } from "../rust-inventory/data";
