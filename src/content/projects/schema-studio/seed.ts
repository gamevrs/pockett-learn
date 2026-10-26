/**
 * Schema Studio: the hidden starting database.
 *
 * Lantern Yard is a community workshop that has run for two years on a shared spreadsheet and a
 * badge reader. The learner starts with only those two relics, both hidden here:
 *
 *   legacy_sheet  one spreadsheet row per tool session, with every flaw a spreadsheet grows
 *                 (repeated member and tool details, a list in one cell, e-mail typed three ways,
 *                 a price that disagrees with itself, three double-booked sessions)
 *   door_log      9,000 badge swipes from the door controller, no indexes
 *
 * Everything is generated from a seeded random generator and plain arithmetic, so every run and
 * every check sees the same rows. The real schema (plan, workshop, member, tool, booking...) is
 * what the learner designs, lesson by lesson.
 */

interface Rng {
  next(): number;
  int(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
}

function makeRng(seed: number): Rng {
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

const q = (s: string | null) => (s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`);

export const PLANS = [
  { name: "Drop-in", fee: 0, minutes: 0 },
  { name: "Casual", fee: 2500, minutes: 240 },
  { name: "Maker", fee: 4500, minutes: 600 },
  { name: "Studio", fee: 8500, minutes: 1800 },
] as const;

export const WORKSHOPS = [
  { code: "WOOD", name: "Woodshop" },
  { code: "METL", name: "Metal Bay" },
  { code: "FAB", name: "Fab Lab" },
  { code: "TEXT", name: "Textile Loft" },
  { code: "CLAY", name: "Clay Room" },
] as const;

export const TOOLS = [
  { tag: "WD-01", name: "Table saw", shop: "WOOD", rate: 1800, induction: true },
  { tag: "WD-02", name: "Band saw", shop: "WOOD", rate: 1200, induction: true },
  { tag: "MT-01", name: "MIG welder", shop: "METL", rate: 2200, induction: true },
  { tag: "MT-02", name: "Metal lathe", shop: "METL", rate: 2000, induction: true },
  { tag: "FB-01", name: "Laser cutter", shop: "FAB", rate: 2500, induction: true },
  { tag: "FB-02", name: "3D printer", shop: "FAB", rate: 600, induction: false },
  { tag: "FB-03", name: "CNC router", shop: "FAB", rate: 3000, induction: true },
  { tag: "TX-01", name: "Industrial sewing machine", shop: "TEXT", rate: 500, induction: false },
  { tag: "TX-02", name: "Embroidery machine", shop: "TEXT", rate: 700, induction: false },
  { tag: "CL-01", name: "Pottery wheel", shop: "CLAY", rate: 400, induction: false },
  { tag: "CL-02", name: "Kiln", shop: "CLAY", rate: 1000, induction: true },
] as const;

interface Person {
  name: string;
  plan: (typeof PLANS)[number]["name"];
  weight: number;
  phone: string | null;
}

const PEOPLE: Person[] = [
  { name: "Odile Mercer", plan: "Studio", weight: 7, phone: "555-0101" },
  { name: "Kofi Adeyemi", plan: "Maker", weight: 6, phone: "555-0102" },
  { name: "Priya Ranganathan", plan: "Maker", weight: 6, phone: "555-0103" },
  { name: "Tomasz Wrona", plan: "Casual", weight: 3, phone: null },
  { name: "Imani Okoye", plan: "Maker", weight: 5, phone: "555-0105" },
  { name: "Lucas Brandt", plan: "Drop-in", weight: 1, phone: "555-0106" },
  { name: "Sunniva Aas", plan: "Studio", weight: 7, phone: "555-0107" },
  { name: "Mateo Quispe", plan: "Casual", weight: 3, phone: "555-0108" },
  { name: "Hana Takeda", plan: "Maker", weight: 5, phone: null },
  { name: "Dmitri Volkov", plan: "Casual", weight: 3, phone: "555-0110" },
  { name: "Aisha Rahman", plan: "Studio", weight: 7, phone: "555-0111" },
  { name: "Callum Reid", plan: "Drop-in", weight: 1, phone: "555-0112" },
  { name: "Noor Haddad", plan: "Maker", weight: 5, phone: "555-0113" },
  { name: "Ines Duarte", plan: "Casual", weight: 3, phone: "555-0114" },
  { name: "Jonas Lindqvist", plan: "Maker", weight: 5, phone: null },
  { name: "Zainab Bello", plan: "Drop-in", weight: 1, phone: "555-0116" },
  { name: "Felix Moreau", plan: "Maker", weight: 4, phone: "555-0117" },
  { name: "Yuki Nakamura", plan: "Studio", weight: 6, phone: "555-0118" },
  { name: "Rosalind Pike", plan: "Casual", weight: 2, phone: "555-0119" },
  { name: "Amara Nwosu", plan: "Maker", weight: 4, phone: "555-0120" },
  { name: "Bram de Vries", plan: "Casual", weight: 2, phone: "555-0121" },
  { name: "Leila Farouk", plan: "Drop-in", weight: 1, phone: null },
  { name: "Soren Falk", plan: "Maker", weight: 4, phone: "555-0123" },
  { name: "Tamsin Ellery", plan: "Casual", weight: 2, phone: "555-0124" },
];

const emailOf = (name: string) => name.toLowerCase().replace(/[^a-z ]/g, "").replace(/ +/g, ".") + "@mail.example";

interface Session {
  date: string;
  start: string;
  minutes: number;
  person: number;
  tool: number;
  note: string | null;
}

const BASE = Date.UTC(2026, 0, 5);
const dateOf = (offset: number) => new Date(BASE + offset * 86400000).toISOString().slice(0, 10);
const clock = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

function build() {
  const rng = makeRng(20260105);
  const inductionTools = TOOLS.map((t, i) => (t.induction ? i : -1)).filter((i) => i >= 0);
  // who holds which induction certificate
  const certs: number[][] = PEOPLE.map((p) => {
    const target = p.plan === "Drop-in" ? rng.int(0, 1) : p.plan === "Casual" ? rng.int(1, 2) : rng.int(2, 4);
    const pool = inductionTools.slice();
    const mine: number[] = [];
    while (mine.length < target && pool.length) mine.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    return mine.sort((x, y) => x - y);
  });
  const allowed = (person: number) => TOOLS.map((t, i) => i).filter((i) => !TOOLS[i].induction || certs[person].includes(i));

  const sessions: Session[] = [];
  const busy = (tool: number, day: number, from: number, to: number) =>
    sessions.some((s) => s.tool === tool && s.date === dateOf(day) && !(to <= toMin(s.start) || from >= toMin(s.start) + s.minutes));
  const personBusy = (person: number, day: number, from: number, to: number) =>
    sessions.some((s) => s.person === person && s.date === dateOf(day) && !(to <= toMin(s.start) || from >= toMin(s.start) + s.minutes));
  const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const weights = PEOPLE.flatMap((p, i) => Array(p.weight).fill(i) as number[]);

  const DURATIONS = [30, 60, 60, 90, 120, 120, 180];
  let guard = 0;
  while (sessions.length < 123 && guard++ < 20000) {
    const person = rng.pick(weights);
    const tool = rng.pick(allowed(person));
    let day = rng.int(0, 81);
    if (new Date(BASE + day * 86400000).getUTCDay() === 0) day += 1; // closed on Sundays
    const minutes = rng.pick(DURATIONS);
    const from = rng.int(18, 36) * 30; // 09:00 .. 18:00
    if (busy(tool, day, from, from + minutes) || personBusy(person, day, from, from + minutes)) continue;
    sessions.push({ date: dateOf(day), start: clock(from), minutes, person, tool, note: null });
  }

  // three double-booked sessions on the paper calendar: a second member on the same tool, overlapping
  const planted = [10, 47, 90];
  for (const idx of planted) {
    const base = sessions[(idx * 7) % 118];
    let other = base.person;
    let tries = 0;
    while ((other === base.person || !allowed(other).includes(base.tool)) && tries++ < 400) other = rng.pick(weights);
    const from = toMin(base.start) + (base.minutes > 30 ? 30 : 0);
    sessions.push({ date: base.date, start: clock(from), minutes: 60, person: other, tool: base.tool, note: null });
  }

  sessions.sort((a, b) => (a.date + a.start < b.date + b.start ? -1 : a.date + a.start > b.date + b.start ? 1 : a.tool - b.tool));
  // a few cancelled and no-show sessions (never the double-booked ones: those stay "completed" in the sheet)
  const quiet = sessions.map((s, i) => i).filter((i) => !sessions.some((o, j) => j !== i && o.tool === sessions[i].tool && o.date === sessions[i].date && !(toMin(o.start) + o.minutes <= toMin(sessions[i].start) || toMin(o.start) >= toMin(sessions[i].start) + sessions[i].minutes)));
  for (let k = 0; k < 6; k++) sessions[quiet.splice(rng.int(0, quiet.length - 1), 1)[0]].note = "cancelled by member";
  for (let k = 0; k < 3; k++) sessions[quiet.splice(rng.int(0, quiet.length - 1), 1)[0]].note = "no show";

  return { certs, sessions };
}

const SHEET_COLUMNS = `entry_id INTEGER,
  session_date TEXT,
  start_time TEXT,
  minutes INTEGER,
  member_name TEXT,
  member_email TEXT,
  member_phone TEXT,
  badge_no TEXT,
  plan_name TEXT,
  plan_fee_cents INTEGER,
  certified_tools TEXT,
  workshop_code TEXT,
  workshop_name TEXT,
  tool_tag TEXT,
  tool_name TEXT,
  tool_rate_cents INTEGER,
  note TEXT`;

export function buildSetup(): string {
  const { certs, sessions } = build();
  const rng = makeRng(77);
  // e-mail typed three ways: as registered, UPPER-case first letters, or with a trailing space
  const emailVariant = (e: string) => {
    const r = rng.next();
    if (r < 0.1) return e.replace(/(^|\.)([a-z])/g, (_m, p, c) => p + c.toUpperCase());
    if (r < 0.18) return e + " ";
    return e;
  };
  // the stale price: three Maker rows were typed with last year's 48.00
  const makerRows = sessions.map((s, i) => (PEOPLE[s.person].plan === "Maker" ? i : -1)).filter((i) => i >= 0);
  const stale = new Set([makerRows[4], makerRows[19], makerRows[33]]);
  // the one typo in a certificate list: "FB-1" instead of "FB-01"
  const typoPerson = certs.findIndex((c, i) => c.includes(4) && i > 4);

  const rows = sessions.map((s, i) => {
    const p = PEOPLE[s.person];
    const tool = TOOLS[s.tool];
    const shop = WORKSHOPS.find((w) => w.code === tool.shop)!;
    const plan = PLANS.find((x) => x.name === p.plan)!;
    const tags = certs[s.person].map((ti) => (s.person === typoPerson && ti === 4 ? "FB-1" : TOOLS[ti].tag));
    const list = tags.length === 0 ? null : tags.join(s.person % 3 === 0 ? ", " : ",");
    return [
      i + 1,
      q(s.date),
      q(s.start),
      s.minutes,
      q(p.name),
      q(emailVariant(emailOf(p.name))),
      q(p.phone),
      q(`B-${1001 + s.person}`),
      q(p.plan),
      stale.has(i) ? 4800 : plan.fee,
      q(list),
      q(shop.code),
      q(shop.name),
      q(tool.tag),
      q(tool.name),
      tool.rate,
      q(s.note),
    ];
  });

  const chunks: string[] = [];
  for (let i = 0; i < rows.length; i += 30) {
    chunks.push(`INSERT INTO legacy_sheet VALUES\n${rows.slice(i, i + 30).map((r) => `  (${r.join(", ")})`).join(",\n")};`);
  }

  return [
    `-- Lantern Yard's two relics: the shared spreadsheet and the door controller's log.`,
    `CREATE TABLE legacy_sheet (\n  ${SHEET_COLUMNS}\n);`,
    ...chunks,
    `CREATE TABLE door_log (
  id INTEGER PRIMARY KEY,
  badge_no TEXT NOT NULL,
  swiped_at TEXT NOT NULL,
  direction TEXT NOT NULL,
  reader TEXT NOT NULL
);`,
    // 9,000 swipes over 84 days, 07:00 to 22:00, in time order; every 29th swipe is a visitor card
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 9000)
INSERT INTO door_log (badge_no, swiped_at, direction, reader)
SELECT
  CASE WHEN i % 29 = 0 THEN 'V-' || printf('%03d', i % 7 + 1) ELSE 'B-' || (1001 + (i * 17 + i / 5) % 24) END,
  datetime('2026-01-05 07:00:00', '+' || (((i - 1) / 107) * 86400 + ((i - 1) % 107) * 504 + (i * 37) % 300) || ' seconds'),
  CASE WHEN (i * 7 + i / 3) % 2 = 0 THEN 'in' ELSE 'out' END,
  CASE (i * 5 + i / 11) % 4 WHEN 0 THEN 'front' WHEN 1 THEN 'woodshop' WHEN 2 THEN 'fab-lab' ELSE 'back-door' END
FROM n;`,
  ].join("\n\n");
}
