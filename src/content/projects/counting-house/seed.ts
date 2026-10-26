/**
 * Counting House: the hidden platform database.
 *
 * `buildPlatform()` simulates two months of trading for three co-op marketplaces with a seeded
 * random generator, so every learner (and every check) sees exactly the same rows. Only integer
 * arithmetic and Math.floor are used, which is bit-for-bit identical in Node and every browser.
 *
 * What the learner finds in it, on purpose:
 *   - a chart of accounts per tenant, member wallets and seller payables that must never go negative
 *   - orders whose stored fee was truncated by the old checkout (a few cents short)
 *   - a processor settlement file with a missing row, an unknown row, a short-paid row and a duplicate
 *   - a stream of payout requests where clients retry (and two keys are re-used with a different body)
 *   - a job queue snapshot taken mid-morning: live leases, expired leases, a poison job
 *   - card attempts with late arrivals, for hourly and daily roll-ups
 */

export interface Rng {
  next(): number;
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), pick: (items) => items[Math.floor(next() * items.length)] };
}

type Cell = string | number | null;
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const lit = (v: Cell) => (v === null ? "NULL" : typeof v === "number" ? String(v) : q(v));

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** 2026-01-01 is day 0. Returns "YYYY-MM-DD HH:MM:SS" (UTC, no zone suffix). */
export function stamp(day: number, secondOfDay: number): string {
  const d = new Date(Date.UTC(2026, 0, 1 + day, 0, 0, 0) + secondOfDay * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** Offsets a stamp by whole seconds. */
function shift(day: number, secondOfDay: number, delta: number): string {
  const total = day * 86400 + secondOfDay + delta;
  return stamp(Math.floor(total / 86400), total % 86400);
}

// ───────────────────────── people ─────────────────────────

interface Tenant {
  id: number;
  slug: string;
  name: string;
  currency: string;
}

const TENANTS: Tenant[] = [
  { id: 1, slug: "fernhollow", name: "Fernhollow Co-op Market", currency: "USD" },
  { id: 2, slug: "saltmarsh", name: "Saltmarsh Mutual Market", currency: "EUR" },
  { id: 3, slug: "kiln-street", name: "Kiln Street Makers", currency: "GBP" },
];

interface Person {
  id: number;
  tenant: number;
  handle: string;
  name: string;
  role: "buyer" | "seller";
  joined: string;
}

const PEOPLE: Person[] = [
  { id: 1, tenant: 1, handle: "odalys", name: "Odalys Brandt", role: "buyer", joined: "2025-11-03" },
  { id: 2, tenant: 1, handle: "mateo", name: "Mateo Quill", role: "buyer", joined: "2025-11-09" },
  { id: 3, tenant: 1, handle: "ines", name: "Ines Farrow", role: "buyer", joined: "2025-11-21" },
  { id: 4, tenant: 1, handle: "tobias", name: "Tobias Winthrop", role: "buyer", joined: "2025-12-02" },
  { id: 5, tenant: 1, handle: "priya", name: "Priya Nandakumar", role: "buyer", joined: "2025-12-14" },
  { id: 6, tenant: 1, handle: "hollis", name: "Hollis Greer", role: "buyer", joined: "2025-12-29" },
  { id: 7, tenant: 1, handle: "marlowe", name: "Marlowe Orchard", role: "seller", joined: "2025-10-12" },
  { id: 8, tenant: 1, handle: "brindle", name: "Brindle Bakehouse", role: "seller", joined: "2025-10-12" },
  { id: 9, tenant: 1, handle: "kestrel", name: "Kestrel Honey Co", role: "seller", joined: "2025-10-19" },
  { id: 10, tenant: 1, handle: "tansy", name: "Tansy & Thread", role: "seller", joined: "2025-11-30" },
  { id: 11, tenant: 2, handle: "jonas", name: "Jonas Eik", role: "buyer", joined: "2025-11-15" },
  { id: 12, tenant: 2, handle: "maren", name: "Maren Voss", role: "buyer", joined: "2025-11-27" },
  { id: 13, tenant: 2, handle: "sunniva", name: "Sunniva Dahl", role: "buyer", joined: "2025-12-08" },
  { id: 14, tenant: 2, handle: "oysters", name: "Saltmarsh Oysters", role: "seller", joined: "2025-10-30" },
  { id: 15, tenant: 2, handle: "dunhill", name: "Dunhill Cheese", role: "seller", joined: "2025-11-04" },
  { id: 16, tenant: 3, handle: "edie", name: "Edie Pomfret", role: "buyer", joined: "2025-12-01" },
  { id: 17, tenant: 3, handle: "rufus", name: "Rufus Lamb", role: "buyer", joined: "2025-12-12" },
  { id: 18, tenant: 3, handle: "kilnpots", name: "Kiln Street Pots", role: "seller", joined: "2025-11-11" },
  { id: 19, tenant: 3, handle: "wren", name: "Wren Candles", role: "seller", joined: "2025-11-19" },
];

/** Typical basket sizes (cents) per seller. */
const PRICES: Record<number, number[]> = {
  7: [450, 695, 1299, 1850, 2450, 3199],
  8: [350, 575, 825, 1495, 2250, 2799],
  9: [899, 1250, 1795, 2599, 4175],
  10: [1850, 2495, 3999, 5750, 9495],
  14: [1450, 2200, 3650, 5995],
  15: [799, 1699, 2480, 3395],
  18: [1250, 2600, 4200, 6850],
  19: [999, 1799, 2599, 3499],
};

// ───────────────────────── the simulation ─────────────────────────

export interface Order {
  id: number;
  tenant: number;
  buyer: number;
  seller: number;
  gross: number;
  fee: number;
  placedDay: number;
  placedSec: number;
  placedAt: string;
  status: "paid" | "refunded" | "cancelled";
  refundedAt: string | null;
}

export interface Topup {
  id: number;
  tenant: number;
  member: number;
  amount: number;
  at: string;
  ref: string;
  day: number;
}

export interface Platform {
  orders: Order[];
  topups: Topup[];
  settlements: Cell[][];
  payoutRequests: Cell[][];
  attempts: Cell[][];
  jobs: Cell[][];
}

/** The fee the platform charges: 5.00%, rounded half up. */
export const feeHalfUp = (gross: number) => Math.floor((gross * 500 + 5000) / 10000);
/** What the old checkout did: it truncated. */
const feeTruncated = (gross: number) => Math.floor((gross * 500) / 10000);

/** Small deterministic fingerprint for a request body (the gateway computes this in real life). */
function fingerprint(seller: number, amount: number): string {
  let h = 2166136261;
  for (const ch of `${seller}:${amount}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return "b" + h.toString(16).padStart(8, "0");
}

export function buildPlatform(): Platform {
  const rng = makeRng(20260302);

  // ── orders ──
  interface Draft {
    tenant: number;
    buyer: number;
    seller: number;
    gross: number;
    day: number;
    sec: number;
  }
  const drafts: Draft[] = [];
  const plan: [number, number, number, number, number][] = [
    // tenant, firstDay, lastDay, perDayMax (Jan), perDayMax (Feb)
    [1, 4, 57, 2, 3],
    [2, 9, 56, 1, 1],
    [3, 14, 55, 1, 1],
  ];
  for (const [tenant, first, last, janMax, febMax] of plan) {
    const buyers = PEOPLE.filter((p) => p.tenant === tenant && p.role === "buyer");
    const sellers = PEOPLE.filter((p) => p.tenant === tenant && p.role === "seller");
    for (let day = first; day <= last; day++) {
      const max = day < 31 ? janMax : febMax;
      // tenants 2 and 3 only trade on some days
      const roll = rng.next();
      const n = tenant === 1 ? (roll < 0.18 ? 0 : rng.int(1, max)) : roll < 0.62 ? 0 : 1;
      for (let k = 0; k < n; k++) {
        const seller = rng.pick(sellers);
        drafts.push({
          tenant,
          buyer: rng.pick(buyers).id,
          seller: seller.id,
          gross: rng.pick(PRICES[seller.id]) + (rng.next() < 0.35 ? rng.pick([0, 0, 500, 1000]) : 0),
          day,
          sec: rng.int(8 * 3600, 20 * 3600),
        });
      }
    }
  }
  drafts.sort((a, b) => a.day - b.day || a.sec - b.sec || a.tenant - b.tenant);

  // statuses: every 19th order is refunded (from day 20 on), every 17th is cancelled
  let paidSeen = 0;
  const orders: Order[] = drafts.map((d, i) => {
    let status: Order["status"] = "paid";
    if (i % 17 === 8) status = "cancelled";
    else if (d.day >= 14 && d.day <= 54) {
      paidSeen++;
      // Hollis (member 6) is the member who later leaves: his history stays simple and his wallet ends at exactly zero
      if (paidSeen % 11 === 0 && d.buyer !== 6) status = "refunded";
    }
    // the old checkout (before 2026-01-20) truncated the 5% fee; the new one rounds half up
    const fee = d.day < 19 ? feeTruncated(d.gross) : feeHalfUp(d.gross);
    const gap = rng.int(1, 3) * 86400 + rng.int(0, 7200);
    return {
      id: i + 1,
      tenant: d.tenant,
      buyer: d.buyer,
      seller: d.seller,
      gross: d.gross,
      fee,
      placedDay: d.day,
      placedSec: d.sec,
      placedAt: stamp(d.day, d.sec),
      status,
      refundedAt: status === "refunded" ? shift(d.day, d.sec, gap) : null,
    };
  });

  // ── top-ups: a buyer tops up (in $25 steps) just before an order they cannot afford ──
  const topups: Topup[] = [];
  const wallet = new Map<number, number>();
  const refs = new Set<string>();
  const addTopup = (tenant: number, member: number, amount: number, day: number, sec: number) => {
    let ref = `PX-${20000 + rng.int(0, 9000)}`;
    while (refs.has(ref)) ref = `PX-${20000 + rng.int(0, 9000)}`;
    refs.add(ref);
    topups.push({ id: topups.length + 1, tenant, member, amount, at: stamp(day, sec), ref, day });
    wallet.set(member, (wallet.get(member) ?? 0) + amount);
  };
  // everybody funds a first wallet in early January (these sit before their first order)
  for (const p of PEOPLE.filter((p) => p.role === "buyer" && p.id !== 6)) {
    const firstOrder = orders.find((o) => o.buyer === p.id && o.status !== "cancelled");
    const day = Math.max(1, (firstOrder?.placedDay ?? 6) - 1);
    addTopup(p.tenant, p.id, 2500 * rng.int(1, 3), day, rng.int(7 * 3600, 9 * 3600));
  }
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    let have = wallet.get(o.buyer) ?? 0;
    const exact = o.buyer === 6;
    if (have < o.gross + (exact ? 0 : 200)) {
      const need = o.gross + (exact ? 0 : 200) - have;
      const amount = exact ? need : Math.ceil((need + rng.int(500, 2500)) / 2500) * 2500;
      addTopup(o.tenant, o.buyer, amount, o.placedDay, Math.max(3600, o.placedSec - rng.int(1800, 5400)));
      have = wallet.get(o.buyer) ?? 0;
    }
    wallet.set(o.buyer, have - o.gross);
  }
  topups.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id - b.id));
  topups.forEach((t, i) => (t.id = i + 1));

  // ── processor settlements: next-day payout of each top-up, 2.9% + 30c ──
  const settlements: Cell[][] = [];
  const processorFee = (gross: number) => Math.floor((gross * 29 + 500) / 1000) + 30;
  const t1 = topups.filter((t) => t.tenant === 1);
  const shortPaid = t1.find((t) => t.day >= 33 && t.day <= 40 && t.amount >= 5000)?.id ?? -1;
  const duplicated = t1.find((t) => t.day >= 41 && t.day <= 47 && t.id !== shortPaid)?.id ?? -1;
  for (const t of topups) {
    if (t.day >= 55) continue; // received on or after 2026-02-25: the processor has not paid these out yet
    const gross = t.id === shortPaid ? t.amount - 100 : t.amount;
    const fee = processorFee(gross);
    const row: Cell[] = [t.tenant, t.ref, stamp(t.day + 1, 0).slice(0, 10), gross, fee, gross - fee];
    settlements.push(row);
    if (t.id === duplicated) settlements.push([...row]);
  }
  settlements.push([1, "PX-90417", "2026-02-19", 3000, processorFee(3000), 3000 - processorFee(3000)]);
  settlements.sort((a, b) => (a[2] as string).localeCompare(b[2] as string) || (a[1] as string).localeCompare(b[1] as string));

  // ── payout requests: clients retry; two keys are reused with a different body ──
  const earned = new Map<number, number>();
  for (const o of orders) if (o.status === "paid") earned.set(o.seller, (earned.get(o.seller) ?? 0) + o.gross - o.fee);
  const payoutRequests: Cell[][] = [];
  const share = (seller: number, pct: number) => Math.floor(((earned.get(seller) ?? 0) * pct) / 100 / 100) * 100;
  const s = (seller: number, pct: number) => Math.max(1000, share(seller, pct));
  // [tenant, key, seller, amount, day, retries(seconds after the first try)]
  const stream: [number, string, number, number, number, number[]][] = [
    [1, "po-7-0201", 7, s(7, 20), 31, [0, 6, 31]],
    [1, "po-8-0203", 8, s(8, 25), 33, [0, 9]],
    [1, "po-9-0204", 9, s(9, 30), 34, [0]],
    [1, "po-10-0205", 10, s(10, 15), 35, [0, 4, 12, 20]],
    [1, "po-7-0209", 7, s(7, 15), 39, [0, 22]],
    [2, "po-14-0210", 14, s(14, 30), 40, [0, 5]],
    [1, "po-8-0212", 8, s(8, 20), 42, [0]],
    [1, "po-9-0216", 9, s(9, 20), 46, [0, 8, 17]],
    [1, "po-10-0219", 10, s(10, 20), 49, [0]],
    [2, "po-15-0220", 15, s(15, 25), 50, [0, 11]],
    [1, "po-7-0224", 7, s(7, 20), 54, [0, 3]],
    [1, "po-8-0226", 8, s(8, 15), 56, [0, 13, 29]],
    [1, "po-9-0227", 9, s(9, 10), 57, [0]],
  ];
  const secs = [10 * 3600 + 410, 11 * 3600 + 1290, 13 * 3600 + 2200, 9 * 3600 + 905, 15 * 3600 + 60, 10 * 3600 + 2040, 16 * 3600 + 500, 12 * 3600 + 777, 14 * 3600 + 1500, 9 * 3600 + 3000, 11 * 3600 + 45, 17 * 3600 + 900, 10 * 3600 + 1800];
  const rows: { tenant: number; key: string; seller: number; amount: number; day: number; at: number; hash: string }[] = [];
  stream.forEach(([tenant, key, seller, amount, day, tries], i) => {
    for (const t of tries) rows.push({ tenant, key, seller, amount, day, at: secs[i] + t, hash: fingerprint(seller, amount) });
  });
  // a buggy client re-sends two keys with a different amount: a conflict, not a retry
  rows.push({ tenant: 1, key: "po-8-0203", seller: 8, amount: s(8, 25) + 1500, day: 33, at: secs[1] + 40, hash: fingerprint(8, s(8, 25) + 1500) });
  rows.push({ tenant: 1, key: "po-10-0219", seller: 10, amount: s(10, 20) + 2500, day: 49, at: secs[8] + 75, hash: fingerprint(10, s(10, 20) + 2500) });
  rows.sort((a, b) => a.day - b.day || a.at - b.at);
  for (const r of rows) payoutRequests.push([r.tenant, r.key, r.seller, r.amount, r.hash, stamp(r.day, r.at)]);

  // ── card attempts: 7 days of traffic with a few late arrivals ──
  const attempts: Cell[][] = [];
  const hourWeight = [1, 1, 1, 1, 1, 2, 3, 5, 7, 9, 10, 11, 11, 10, 10, 9, 9, 10, 11, 9, 6, 4, 2, 1];
  for (let day = 53; day <= 59; day++) {
    for (let h = 0; h < 24; h++) {
      const n = Math.floor(hourWeight[h] * (day >= 57 ? 1.4 : 1) * 0.9) + rng.int(0, 2);
      for (let k = 0; k < n; k++) {
        const tenant = rng.next() < 0.84 ? 1 : 2;
        const r = rng.next();
        const status = r < 0.915 ? "ok" : r < 0.975 ? "declined" : "error";
        const sec = h * 3600 + rng.int(0, 3599);
        const late = rng.next() < 0.06;
        const lag = late ? rng.int(2 * 3600, 30 * 3600) : rng.int(1, 4);
        const latency = status === "error" ? rng.int(900, 2400) : rng.int(80, 780);
        const amount = status === "ok" ? rng.int(5, 140) * 100 - (rng.next() < 0.5 ? 1 : 0) : rng.int(5, 140) * 100;
        // everything has arrived by 07:00 on 2026-03-02, so the last roll-up sees all of it
        const arrived = Math.min(day * 86400 + sec + lag, 60 * 86400 + 7 * 3600);
        attempts.push([tenant, stamp(day, sec), stamp(Math.floor(arrived / 86400), arrived % 86400), status, amount, latency]);
      }
    }
  }

  // ── job queue snapshot, taken at 2026-03-02 09:00:00 ──
  const recent = orders.filter((o) => o.tenant === 1 && o.status === "paid" && o.placedDay >= 50);
  const pick = (i: number) => recent[recent.length - 1 - i]?.id ?? 1;
  const job = (
    id: number,
    kind: string,
    payload: Record<string, unknown>,
    dedupe: string | null,
    state: string,
    priority: number,
    attempts: number,
    max: number,
    runAt: string,
    lockedBy: string | null,
    lease: string | null,
    err: string | null,
    created: string,
    finished: string | null,
  ): Cell[] => [id, 1, kind, JSON.stringify(payload), dedupe, state, priority, attempts, max, runAt, lockedBy, lease, err, created, finished];
  const jobs: Cell[][] = [
    job(1, "send_receipt", { order_id: pick(0) }, `receipt:${pick(0)}`, "done", 5, 1, 5, "2026-03-02 07:10:00", null, null, null, "2026-03-02 07:10:00", "2026-03-02 07:10:04"),
    job(2, "send_receipt", { order_id: pick(1) }, `receipt:${pick(1)}`, "done", 5, 1, 5, "2026-03-02 07:10:00", null, null, null, "2026-03-02 07:10:00", "2026-03-02 07:10:05"),
    job(3, "render_statement", { member_id: 1, month: "2026-01" }, "stmt:1:2026-01", "done", 3, 1, 3, "2026-03-02 06:00:00", null, null, null, "2026-03-02 06:00:00", "2026-03-02 06:00:41"),
    job(4, "sync_directory", { tenant_id: 1 }, "sync:1:2026-03-02", "done", 5, 1, 5, "2026-03-02 06:30:00", null, null, null, "2026-03-02 06:30:00", "2026-03-02 06:30:09"),
    job(5, "render_statement", { member_id: 2, month: "2026-01" }, "stmt:2:2026-01", "running", 3, 1, 3, "2026-03-02 08:50:00", "worker-a", "2026-03-02 09:20:00", null, "2026-03-02 08:50:00", null),
    job(6, "send_receipt", { order_id: pick(2) }, `receipt:${pick(2)}`, "running", 5, 1, 5, "2026-03-02 08:20:00", "worker-b", "2026-03-02 08:41:00", null, "2026-03-02 08:20:00", null),
    job(7, "render_statement", { member_id: 3, month: "2026-01" }, "stmt:3:2026-01", "running", 3, 3, 5, "2026-03-02 08:05:00", "worker-b", "2026-03-02 08:36:00", "lease expired", "2026-03-02 08:00:00", null),
    job(8, "send_receipt", { order_id: pick(3) }, `receipt:${pick(3)}`, "running", 5, 5, 5, "2026-03-02 07:40:00", "worker-c", "2026-03-02 08:22:00", "smtp 550: mailbox does not exist", "2026-03-02 07:00:00", null),
    job(9, "render_statement", { member_id: 4, month: "2026-01" }, "stmt:4:2026-01", "running", 3, 3, 3, "2026-03-02 07:50:00", "worker-c", "2026-03-02 08:27:00", "template v2: missing field 'opening'", "2026-03-02 07:00:00", null),
    job(10, "send_receipt", { order_id: pick(4) }, `receipt:${pick(4)}`, "queued", 5, 0, 5, "2026-03-02 08:58:00", null, null, null, "2026-03-02 08:58:00", null),
    job(11, "send_receipt", { order_id: pick(5) }, `receipt:${pick(5)}`, "queued", 8, 0, 5, "2026-03-02 08:59:00", null, null, null, "2026-03-02 08:59:00", null),
    job(12, "sync_directory", { tenant_id: 2 }, "sync:2:2026-03-02", "queued", 5, 0, 5, "2026-03-02 08:30:00", null, null, null, "2026-03-02 08:30:00", null),
    job(13, "send_receipt", { order_id: pick(6) }, `receipt:${pick(6)}`, "queued", 5, 1, 5, "2026-03-02 09:30:00", null, null, "smtp 421: try again later", "2026-03-02 08:20:00", null),
    job(14, "render_statement", { member_id: 5, month: "2026-01" }, "stmt:5:2026-01", "queued", 2, 0, 3, "2026-03-02 08:40:00", null, null, null, "2026-03-02 08:40:00", null),
  ];

  return { orders, topups, settlements, payoutRequests, attempts, jobs };
}

// ───────────────────────── rendering ─────────────────────────

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const insert = (table: string, cols: string, rows: Cell[][]) =>
  chunks(rows, 300)
    .map((c) => `INSERT INTO ${table} (${cols}) VALUES\n${c.map((r) => `(${r.map(lit).join(", ")})`).join(",\n")};`)
    .join("\n\n");

export function buildSetup(): string {
  return renderSetup(buildPlatform());
}

export function renderSetup(p: Platform): string {
  const accounts: Cell[][] = [];
  const add = (tenant: number, code: string, name: string, kind: string, role: string, owner: number | null, allowNegative: number) =>
    accounts.push([accounts.length + 1, tenant, code, name, kind, role, owner, allowNegative]);
  for (const t of TENANTS) {
    add(t.id, "1000", "Bank", "asset", "bank", null, 1);
    add(t.id, "1100", "Card processor clearing", "asset", "clearing", null, 0);
    for (const m of PEOPLE.filter((x) => x.tenant === t.id && x.role === "buyer")) add(t.id, "2100", `Wallet · ${m.name}`, "liability", "wallet", m.id, 0);
    for (const m of PEOPLE.filter((x) => x.tenant === t.id && x.role === "seller")) add(t.id, "2200", `Payable · ${m.name}`, "liability", "payable", m.id, 0);
    add(t.id, "2900", "Suspense (unidentified receipts)", "liability", "suspense", null, 1);
    add(t.id, "3000", "Founders' equity", "equity", "equity", null, 1);
    add(t.id, "4000", "Marketplace fees", "revenue", "fees", null, 1);
    add(t.id, "5000", "Card processing fees", "expense", "processing", null, 1);
    add(t.id, "5100", "Member credits", "expense", "credits", null, 1);
  }

  const parts: string[] = [
    `PRAGMA foreign_keys = ON;`,
    `CREATE TABLE tenants (
  tenant_id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL
);`,
    insert("tenants", "tenant_id, slug, name, currency", TENANTS.map((t) => [t.id, t.slug, t.name, t.currency])),
    `CREATE TABLE currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  minor_units INTEGER NOT NULL,
  divisor INTEGER NOT NULL
);`,
    `INSERT INTO currencies VALUES
('USD', 'US dollar', 2, 100),
('EUR', 'Euro', 2, 100),
('GBP', 'Pound sterling', 2, 100),
('JPY', 'Japanese yen', 0, 1),
('KWD', 'Kuwaiti dinar', 3, 1000);`,
    `CREATE TABLE clock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  now TEXT NOT NULL
);
INSERT INTO clock VALUES (1, '2026-03-02 09:00:00');`,
    `CREATE TABLE session_ctx (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  actor TEXT NOT NULL,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id)
);
INSERT INTO session_ctx VALUES (1, 'system:console', 1);`,
    `CREATE TABLE members (
  member_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  handle TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'seller')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  payout_method TEXT,
  joined_on TEXT NOT NULL
);`,
    insert(
      "members",
      "member_id, tenant_id, handle, display_name, email, role, status, payout_method, joined_on",
      PEOPLE.map((m) => [m.id, m.tenant, m.handle, m.name, `${m.handle}@example.test`, m.role, "active", m.role === "seller" ? "bank_transfer" : null, m.joined]),
    ),
    `CREATE TABLE accounts (
  account_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  role TEXT NOT NULL,
  owner_member_id INTEGER REFERENCES members(member_id),
  allow_negative INTEGER NOT NULL DEFAULT 1,
  normal_side TEXT GENERATED ALWAYS AS (CASE WHEN kind IN ('asset', 'expense') THEN 'D' ELSE 'C' END) VIRTUAL
);`,
    insert("accounts", "account_id, tenant_id, code, name, kind, role, owner_member_id, allow_negative", accounts),
    `CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  buyer_id INTEGER NOT NULL REFERENCES members(member_id),
  seller_id INTEGER NOT NULL REFERENCES members(member_id),
  gross_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  placed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'refunded', 'cancelled')),
  refunded_at TEXT
);`,
    insert(
      "orders",
      "order_id, tenant_id, buyer_id, seller_id, gross_cents, fee_cents, placed_at, status, refunded_at",
      p.orders.map((o) => [o.id, o.tenant, o.buyer, o.seller, o.gross, o.fee, o.placedAt, o.status, o.refundedAt]),
    ),
    `CREATE TABLE topups (
  topup_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  member_id INTEGER NOT NULL REFERENCES members(member_id),
  amount_cents INTEGER NOT NULL,
  received_at TEXT NOT NULL,
  processor_ref TEXT NOT NULL
);`,
    insert("topups", "topup_id, tenant_id, member_id, amount_cents, received_at, processor_ref", p.topups.map((t) => [t.id, t.tenant, t.member, t.amount, t.at, t.ref])),
    `CREATE TABLE processor_settlements (
  settlement_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  processor_ref TEXT NOT NULL,
  settled_on TEXT NOT NULL,
  gross_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL
);`,
    insert("processor_settlements", "tenant_id, processor_ref, settled_on, gross_cents, fee_cents, net_cents", p.settlements),
    `CREATE TABLE payout_requests (
  req_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  idem_key TEXT NOT NULL,
  seller_id INTEGER NOT NULL REFERENCES members(member_id),
  amount_cents INTEGER NOT NULL,
  body_hash TEXT NOT NULL,
  requested_at TEXT NOT NULL
);`,
    insert("payout_requests", "tenant_id, idem_key, seller_id, amount_cents, body_hash, requested_at", p.payoutRequests),
    `CREATE TABLE card_attempts (
  attempt_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'declined', 'error')),
  amount_cents INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL
);`,
    insert("card_attempts", "tenant_id, at, received_at, status, amount_cents, latency_ms", p.attempts),
    `CREATE TABLE jobs (
  job_id INTEGER PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  dedupe_key TEXT,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'done', 'dead')),
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  run_at TEXT NOT NULL,
  locked_by TEXT,
  lease_until TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  finished_at TEXT
);
CREATE UNIQUE INDEX jobs_dedupe ON jobs (tenant_id, dedupe_key) WHERE dedupe_key IS NOT NULL;`,
    insert("jobs", "job_id, tenant_id, kind, payload, dedupe_key, state, priority, attempts, max_attempts, run_at, locked_by, lease_until, last_error, created_at, finished_at", p.jobs),
  ];
  return parts.join("\n\n") + "\n";
}
