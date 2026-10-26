import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 2: Resources and rules. A repository and CRUD, validation, problem-details errors, and lists. */
export const chapter2: Lesson[] = [
  // ───────────────────────────────────────── 5. Repository and CRUD
  {
    id: "js-api-5-stations",
    title: "A repository and stations CRUD",
    minutes: 45,
    xp: 200,
    concepts: ["REST resources", "status codes", "repository pattern", "defensive copies", "compare-and-set", "409 Conflict"],
    learn: md`### Resources, not actions

REST describes an API as a set of **resources** (nouns) that you act on with a small, fixed set of **methods**. For Dockline the nouns are stations, bikes and rentals:

- ¦GET /stations¦: list, answers 200.
- ¦GET /stations/st-03¦: read one, 200, or 404.
- ¦POST /stations¦: create, **201** plus a ¦Location¦ header, or 400 / 409.
- ¦PUT /stations/st-03¦: replace the whole record, 200, or 400 / 404.
- ¦PATCH /stations/st-03¦: change some fields, 200, or 400 / 404.
- ¦DELETE /stations/st-03¦: remove, **204** (no body), or 404 / 409.

The status code is part of the contract. 201 tells the client something new exists and the ¦Location¦ header says where. 204 says "done, nothing to show". 404 means the thing is not there. **409 Conflict** means the request is fine but clashes with the current state: deleting a station that still has bikes docked is the textbook case.

### Safe, idempotent, neither

Methods carry promises that clients, proxies and retry logic rely on:

- **Safe** methods (¦GET¦) do not change anything, so they can be repeated, prefetched and cached freely.
- **Idempotent** methods (¦GET¦, ¦PUT¦, ¦DELETE¦) have the same *effect* when repeated: replacing a station with the same data ten times leaves one station; deleting twice leaves it deleted (the second call may answer 404, the *state* is the same).
- ¦POST¦ is neither: two identical creates make two things. Lesson 11 deals with that.

¦PUT¦ replaces the entire representation (leave a field out and it is gone or defaulted); ¦PATCH¦ changes only the fields you send. Both must ignore fields a client should not control, above all ¦id¦: the server chooses ids.

### Why a repository layer

Handlers should say *what* they need ("the station with this id"), not *how* it is stored. A **repository** hides the storage behind a few methods (¦list¦, ¦get¦, ¦create¦, ¦update¦, ¦replace¦, ¦remove¦). Today it is a ¦Map¦ in memory; tomorrow it is a database, and no handler changes. It is also the one place to enforce rules that must always hold:

- **Return copies.** If ¦get¦ handed out the stored object, any caller could mutate the database by accident (or a response serialiser could, later). ¦structuredClone¦ on the way in and out keeps the store private.
- **Be asynchronous from day one.** Real storage is I/O. The repository awaits a small delay (the given ¦sleep¦) so every handler is written the realistic way, and so races become possible - and testable.
- **Compare-and-set.** Check-then-write across an ¦await¦ is a race: two riders can both see a bike as available and both claim it. ¦updateWhere(id, predicate, patch)¦ checks and writes in one synchronous step *after* the delay, so exactly one caller wins. Lesson 10 uses it to rent bikes.

### Handler habits

- Look the record up, and throw an ¦HttpError(404)¦ when it is missing. Never answer 200 with ¦null¦.
- Build the record from a **whitelist** of fields (¦pickStation¦ below), never from the raw body. Spreading ¦req.body¦ into the database is *mass assignment*: a caller adds ¦"id"¦ or ¦"isAdmin": true¦ and you store it.
- Read input from ¦req.valid ?? req.body¦. Lesson 6 puts a validated, cleaned copy on ¦req.valid¦; until then the raw body is all there is.

### A seam for the next lessons

¦stationListView¦ is a ¦let¦: a function that turns the full list into the response body. Lesson 8 reassigns it to add filtering, sorting and pages without touching the route.

### Common mistakes

- Returning the stored object itself and discovering aliasing bugs weeks later.
- 200 for everything, with the real outcome buried in the body.
- Using ¦DELETE¦ on a record other things point at, with no 409.
- Letting clients choose ids.`,
    mission: md`Stations are the heart of Dockline: each one has a name, a zone, a capacity and a spot on the city map. The kiosks read them; the operations team creates, edits and retires them.

Build the repository that stores them and the REST routes in front of it. Seed data for eight stations, twenty-four bikes and seven past rentals is already in the scaffold. When it works, the city map on the right fills with live bike counts read through your API.`,
    tasks: [
      "class Repository: async list / get / create / update / replace / updateWhere / remove, all returning copies, plus reset()",
      "ids are chosen by the repository (client-supplied ids are ignored); update and replace never change the id",
      "routes: GET /stations, GET /stations/:id, POST (201 + Location), PUT, PATCH (whitelisted fields), DELETE (204, 404, 409 when bikes are docked)",
      "GET /stations/:id/bikes lists the bikes docked at a station (404 for an unknown station)",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: a repository and the stations resource.

// ── given: seed data ──
const station = (id, name, zone, capacity, x, y) => ({ id, name, zone, capacity, x, y });
const SEED_STATIONS = [
  station("st-01", "Harbour Gate", "waterfront", 12, 14, 30),
  station("st-02", "Mill Lane", "old-town", 10, 34, 16),
  station("st-03", "Tram Depot", "central", 14, 50, 46),
  station("st-04", "Botanic Steps", "park", 8, 30, 74),
  station("st-05", "Foundry Square", "east", 10, 82, 26),
  station("st-06", "Lantern Bridge", "waterfront", 12, 20, 54),
  station("st-07", "University Row", "campus", 16, 72, 70),
  station("st-08", "Rail Hall", "central", 20, 62, 38),
];

const bike = (id, stationId, kind, battery, status = "available") => ({ id, stationId, kind, battery, status });
const SEED_BIKES = [
  bike("bk-101", "st-01", "classic", null), bike("bk-102", "st-01", "electric", 88), bike("bk-103", "st-01", "classic", null), bike("bk-104", "st-01", "electric", 41),
  bike("bk-105", "st-02", "classic", null), bike("bk-106", "st-02", "electric", 93), bike("bk-107", "st-02", "classic", null, "service"),
  bike("bk-108", "st-03", "electric", 76), bike("bk-109", "st-03", "classic", null), bike("bk-110", "st-03", "classic", null), bike("bk-111", "st-03", "electric", 12), bike("bk-112", "st-03", "electric", 100),
  bike("bk-113", "st-04", "classic", null), bike("bk-114", "st-04", "electric", 67),
  bike("bk-115", "st-05", "classic", null), bike("bk-116", "st-05", "electric", 55), bike("bk-117", "st-05", "classic", null),
  bike("bk-118", "st-06", "electric", 90), bike("bk-119", "st-06", "classic", null), bike("bk-120", "st-06", "classic", null),
  bike("bk-121", "st-07", "electric", 72), bike("bk-122", "st-07", "classic", null),
  bike("bk-123", "st-08", "electric", 34), bike("bk-124", "st-08", "classic", null),
];

const rental = (id, riderId, bikeId, fromStationId, toStationId, startedAt, returnedAt) => ({ id, riderId, bikeId, fromStationId, toStationId, startedAt, returnedAt });
const SEED_RENTALS = [
  rental("rt-1001", "u-ana", "bk-110", "st-03", "st-08", "2026-01-14T07:52:00.000Z", "2026-01-14T08:09:00.000Z"),
  rental("rt-1002", "u-ben", "bk-102", "st-01", "st-06", "2026-01-14T08:15:00.000Z", "2026-01-14T08:31:00.000Z"),
  rental("rt-1003", "u-ana", "bk-113", "st-04", "st-04", "2026-01-14T12:40:00.000Z", "2026-01-14T13:25:00.000Z"),
  rental("rt-1004", "u-mia", "bk-121", "st-07", "st-03", "2026-01-14T14:02:00.000Z", "2026-01-14T14:20:00.000Z"),
  rental("rt-1005", "u-ben", "bk-117", "st-05", "st-08", "2026-01-14T17:30:00.000Z", "2026-01-14T17:52:00.000Z"),
  rental("rt-1006", "u-ana", "bk-105", "st-02", "st-01", "2026-01-14T18:05:00.000Z", "2026-01-14T18:24:00.000Z"),
  rental("rt-1007", "u-ben", "bk-119", "st-06", "st-02", "2026-01-14T19:10:00.000Z", "2026-01-14T19:33:00.000Z"),
];

// Storage is I/O: every repository call waits a moment first.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A tiny in-memory store with the shape of a real data layer.
//   new Repository("stations", SEED_STATIONS, { latencyMs: 5, nextNumber: 9, makeId: (n) => "st-" + n })
// Defaults: latencyMs 5, nextNumber = seed.length + 1, makeId = (n) => name + "-" + n.
// Rules for every async method: wait latencyMs first (await sleep(...)); never hand out or keep the caller's objects (structuredClone).
class Repository {
  constructor(name, seed, options = {}) {
    // TODO: keep a copy of the seed and call this.reset()
  }

  // Restore the seed records and the id counter. Synchronous.
  reset() {
    // TODO
  }

  // How many records exist right now (synchronous getter).
  get size() {
    // TODO
  }

  // All records, in insertion order (copies).
  async list() {
    // TODO
  }

  // One record (a copy), or undefined.
  async get(id) {
    // TODO
  }

  // Store a new record. The repository picks the id with makeId(counter++): an id inside data is ignored. Return a copy.
  async create(data) {
    // TODO
  }

  // Shallow-merge patch into the record; the id can never change. Return a copy, or undefined if the id does not exist.
  async update(id, patch) {
    // TODO
  }

  // Replace everything except the id. Return a copy, or undefined if missing.
  async replace(id, data) {
    // TODO
  }

  // Compare-and-set: AFTER the delay, in one synchronous step, check predicate(copy of the record) and, if it is true, apply patch.
  // Returns the updated copy; null when the predicate said no; undefined when the record does not exist.
  async updateWhere(id, predicate, patch) {
    // TODO
  }

  // true if something was removed.
  async remove(id) {
    // TODO
  }
}

// ── given: the database ──
const db = {
  stations: new Repository("stations", SEED_STATIONS, { nextNumber: 9, makeId: (n) => ¦st-\${String(n).padStart(2, "0")}¦ }),
  bikes: new Repository("bikes", SEED_BIKES, { nextNumber: 125, makeId: (n) => ¦bk-\${n}¦ }),
  rentals: new Repository("rentals", SEED_RENTALS, { nextNumber: 1008, makeId: (n) => ¦rt-\${n}¦ }),
  // Put everything back to the seed (tests and the control room use this).
  reset() {
    for (const repo of Object.values(this)) if (repo instanceof Repository) repo.reset();
  },
};

// ── given: field whitelist and the seam lesson 8 will replace ──
const STATION_FIELDS = ["name", "zone", "capacity", "x", "y"];
const pickStation = (input) => Object.fromEntries(STATION_FIELDS.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
let stationListView = (req, items) => ({ items });
const stationNotFound = (id) => new HttpError(404, ¦Station \${id} does not exist¦, { code: "not_found" });

// ── the routes ──
// Read input from (req.valid ?? req.body ?? {}). Look records up with db.stations / db.bikes.

// 200 with stationListView(req, every station)
router.get("/stations", async function listStations(req, res) {
  // TODO
});

// 200 with the station, or stationNotFound(req.params.id)
router.get("/stations/:id", async function getStation(req, res) {
  // TODO
});

// 201 with the new station and a location header "/stations/<id>". Defaults for x and y: 50. Only whitelisted fields (pickStation).
router.post("/stations", async function createStation(req, res) {
  // TODO
});

// 200 with the replaced station (x and y default to 50 when omitted), or 404. Whitelisted fields only.
router.put("/stations/:id", async function replaceStation(req, res) {
  // TODO
});

// 200 with the updated station, or 404. Whitelisted fields only.
router.patch("/stations/:id", async function patchStation(req, res) {
  // TODO
});

// 404 when missing; 409 (code "station_not_empty") when any bike has this stationId; otherwise remove it and answer 204 with no body.
router.delete("/stations/:id", async function deleteStation(req, res) {
  // TODO
});

// 200 with the bikes whose stationId matches (an array), or 404 when the station does not exist.
router.get("/stations/:id/bikes", async function listStationBikes(req, res) {
  // TODO
});
`,
    solutionAdd: js`const station = (id, name, zone, capacity, x, y) => ({ id, name, zone, capacity, x, y });
const SEED_STATIONS = [
  station("st-01", "Harbour Gate", "waterfront", 12, 14, 30),
  station("st-02", "Mill Lane", "old-town", 10, 34, 16),
  station("st-03", "Tram Depot", "central", 14, 50, 46),
  station("st-04", "Botanic Steps", "park", 8, 30, 74),
  station("st-05", "Foundry Square", "east", 10, 82, 26),
  station("st-06", "Lantern Bridge", "waterfront", 12, 20, 54),
  station("st-07", "University Row", "campus", 16, 72, 70),
  station("st-08", "Rail Hall", "central", 20, 62, 38),
];

const bike = (id, stationId, kind, battery, status = "available") => ({ id, stationId, kind, battery, status });
const SEED_BIKES = [
  bike("bk-101", "st-01", "classic", null), bike("bk-102", "st-01", "electric", 88), bike("bk-103", "st-01", "classic", null), bike("bk-104", "st-01", "electric", 41),
  bike("bk-105", "st-02", "classic", null), bike("bk-106", "st-02", "electric", 93), bike("bk-107", "st-02", "classic", null, "service"),
  bike("bk-108", "st-03", "electric", 76), bike("bk-109", "st-03", "classic", null), bike("bk-110", "st-03", "classic", null), bike("bk-111", "st-03", "electric", 12), bike("bk-112", "st-03", "electric", 100),
  bike("bk-113", "st-04", "classic", null), bike("bk-114", "st-04", "electric", 67),
  bike("bk-115", "st-05", "classic", null), bike("bk-116", "st-05", "electric", 55), bike("bk-117", "st-05", "classic", null),
  bike("bk-118", "st-06", "electric", 90), bike("bk-119", "st-06", "classic", null), bike("bk-120", "st-06", "classic", null),
  bike("bk-121", "st-07", "electric", 72), bike("bk-122", "st-07", "classic", null),
  bike("bk-123", "st-08", "electric", 34), bike("bk-124", "st-08", "classic", null),
];

const rental = (id, riderId, bikeId, fromStationId, toStationId, startedAt, returnedAt) => ({ id, riderId, bikeId, fromStationId, toStationId, startedAt, returnedAt });
const SEED_RENTALS = [
  rental("rt-1001", "u-ana", "bk-110", "st-03", "st-08", "2026-01-14T07:52:00.000Z", "2026-01-14T08:09:00.000Z"),
  rental("rt-1002", "u-ben", "bk-102", "st-01", "st-06", "2026-01-14T08:15:00.000Z", "2026-01-14T08:31:00.000Z"),
  rental("rt-1003", "u-ana", "bk-113", "st-04", "st-04", "2026-01-14T12:40:00.000Z", "2026-01-14T13:25:00.000Z"),
  rental("rt-1004", "u-mia", "bk-121", "st-07", "st-03", "2026-01-14T14:02:00.000Z", "2026-01-14T14:20:00.000Z"),
  rental("rt-1005", "u-ben", "bk-117", "st-05", "st-08", "2026-01-14T17:30:00.000Z", "2026-01-14T17:52:00.000Z"),
  rental("rt-1006", "u-ana", "bk-105", "st-02", "st-01", "2026-01-14T18:05:00.000Z", "2026-01-14T18:24:00.000Z"),
  rental("rt-1007", "u-ben", "bk-119", "st-06", "st-02", "2026-01-14T19:10:00.000Z", "2026-01-14T19:33:00.000Z"),
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Repository {
  #items = new Map();
  #seed;
  #latencyMs;
  #makeId;
  #firstNumber;
  #next;

  constructor(name, seed, options = {}) {
    this.name = name;
    this.#seed = structuredClone(seed);
    this.#latencyMs = options.latencyMs ?? 5;
    this.#firstNumber = options.nextNumber ?? seed.length + 1;
    this.#makeId = options.makeId ?? ((n) => ¦\${name}-\${n}¦);
    this.reset();
  }

  reset() {
    this.#items = new Map(structuredClone(this.#seed).map((record) => [record.id, record]));
    this.#next = this.#firstNumber;
  }

  get size() {
    return this.#items.size;
  }

  async list() {
    await sleep(this.#latencyMs);
    return [...this.#items.values()].map((record) => structuredClone(record));
  }

  async get(id) {
    await sleep(this.#latencyMs);
    const record = this.#items.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async create(data) {
    await sleep(this.#latencyMs);
    const record = { ...structuredClone(data), id: this.#makeId(this.#next++) };
    this.#items.set(record.id, record);
    return structuredClone(record);
  }

  async update(id, patch) {
    await sleep(this.#latencyMs);
    const current = this.#items.get(id);
    if (!current) return undefined;
    const next = { ...current, ...structuredClone(patch), id };
    this.#items.set(id, next);
    return structuredClone(next);
  }

  async replace(id, data) {
    await sleep(this.#latencyMs);
    if (!this.#items.has(id)) return undefined;
    const next = { ...structuredClone(data), id };
    this.#items.set(id, next);
    return structuredClone(next);
  }

  async updateWhere(id, predicate, patch) {
    await sleep(this.#latencyMs);
    const current = this.#items.get(id);
    if (!current) return undefined;
    if (!predicate(structuredClone(current))) return null;
    const next = { ...current, ...structuredClone(patch), id };
    this.#items.set(id, next);
    return structuredClone(next);
  }

  async remove(id) {
    await sleep(this.#latencyMs);
    return this.#items.delete(id);
  }
}

const db = {
  stations: new Repository("stations", SEED_STATIONS, { nextNumber: 9, makeId: (n) => ¦st-\${String(n).padStart(2, "0")}¦ }),
  bikes: new Repository("bikes", SEED_BIKES, { nextNumber: 125, makeId: (n) => ¦bk-\${n}¦ }),
  rentals: new Repository("rentals", SEED_RENTALS, { nextNumber: 1008, makeId: (n) => ¦rt-\${n}¦ }),
  reset() {
    for (const repo of Object.values(this)) if (repo instanceof Repository) repo.reset();
  },
};

const STATION_FIELDS = ["name", "zone", "capacity", "x", "y"];
const pickStation = (input) => Object.fromEntries(STATION_FIELDS.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));
let stationListView = (req, items) => ({ items });
const stationNotFound = (id) => new HttpError(404, ¦Station \${id} does not exist¦, { code: "not_found" });

router.get("/stations", async function listStations(req, res) {
  res.json(stationListView(req, await db.stations.list()));
});

router.get("/stations/:id", async function getStation(req, res) {
  const found = await db.stations.get(req.params.id);
  if (!found) throw stationNotFound(req.params.id);
  res.json(found);
});

router.post("/stations", async function createStation(req, res) {
  const input = req.valid ?? req.body ?? {};
  const created = await db.stations.create({ x: 50, y: 50, ...pickStation(input) });
  res.status(201).set("location", ¦/stations/\${created.id}¦).json(created);
});

router.put("/stations/:id", async function replaceStation(req, res) {
  const input = req.valid ?? req.body ?? {};
  const replaced = await db.stations.replace(req.params.id, { x: 50, y: 50, ...pickStation(input) });
  if (!replaced) throw stationNotFound(req.params.id);
  res.json(replaced);
});

router.patch("/stations/:id", async function patchStation(req, res) {
  const input = req.valid ?? req.body ?? {};
  const updated = await db.stations.update(req.params.id, pickStation(input));
  if (!updated) throw stationNotFound(req.params.id);
  res.json(updated);
});

router.delete("/stations/:id", async function deleteStation(req, res) {
  const id = req.params.id;
  if (!(await db.stations.get(id))) throw stationNotFound(id);
  const docked = (await db.bikes.list()).filter((b) => b.stationId === id);
  if (docked.length > 0) {
    throw new HttpError(409, ¦Station \${id} still has \${docked.length} bike(s) docked¦, { code: "station_not_empty" });
  }
  await db.stations.remove(id);
  res.status(204).end();
});

router.get("/stations/:id/bikes", async function listStationBikes(req, res) {
  const id = req.params.id;
  if (!(await db.stations.get(id))) throw stationNotFound(id);
  res.json((await db.bikes.list()).filter((b) => b.stationId === id));
});`,
    explanation:
      "The Repository keeps a private Map and a private copy of the seed. Every method waits for the I/O delay and clones data on the way in and out, so no caller can alias the store. create overrides any supplied id with makeId(counter++); update and replace force the id back; updateWhere runs the predicate and the write in the same synchronous step after the delay, which makes the check-then-set atomic. The routes only talk to the repository, build records from the whitelist, and use HttpError(404/409) for missing or conflicting state. DELETE refuses to remove a station that still has bikes docked, and answers 204 without a body when it succeeds.",
    hints: [
      { id: "h1", title: "Repository state", content: "Fields: #items (a Map id -> record), #seed (structuredClone(seed)), #latencyMs, #makeId, #firstNumber, #next. reset() rebuilds #items from a fresh structuredClone of the seed and sets #next = #firstNumber. Each async method starts with await sleep(this.#latencyMs) and returns structuredClone(record)." },
      { id: "h2", title: "Writes", content: "create: const record = { ...structuredClone(data), id: this.#makeId(this.#next++) } (the id comes last so it wins). update: { ...current, ...structuredClone(patch), id }. replace: { ...structuredClone(data), id }. updateWhere: after the sleep, get current, return undefined if missing, null if !predicate(structuredClone(current)), otherwise write like update, all without another await." },
      { id: "h3", title: "Routes", content: "Handlers: const input = req.valid ?? req.body ?? {}; create with { x: 50, y: 50, ...pickStation(input) }; respond res.status(201).set(\"location\", \"/stations/\" + created.id).json(created). Missing -> throw stationNotFound(id). For DELETE, list the bikes first and throw the 409 HttpError if any has stationId === id; on success res.status(204).end()." },
    ],
    tests: [
      {
        id: "t1",
        description: "Repository: list, get and create",
        assertionCode: T(js`const repo = new Repository("things", [{ id: "a", n: 1 }, { id: "b", n: 2 }]);
assertEqual((await repo.list()).map((r) => r.id), ["a", "b"], "list keeps insertion order");
assertEqual(await repo.get("b"), { id: "b", n: 2 });
assertEqual(await repo.get("nope"), undefined, "a missing record is undefined");
const made = await repo.create({ n: 3, id: "hacker" });
assertEqual(made, { n: 3, id: "things-3" }, "the repository picks the id (default name-number) and ignores the caller's");
assertEqual(repo.size, 3);
const custom = new Repository("c", [], { nextNumber: 40, makeId: (n) => "x" + n });
assertEqual((await custom.create({})).id, "x40", "makeId and nextNumber are respected");`),
      },
      {
        id: "t2",
        description: "Repository: update, replace and remove",
        assertionCode: T(js`const repo = new Repository("things", [{ id: "a", n: 1, keep: true }]);
assertEqual(await repo.update("a", { n: 10, id: "stolen" }), { id: "a", n: 10, keep: true }, "update merges and cannot change the id");
assertEqual(await repo.update("zzz", { n: 1 }), undefined, "updating a missing record gives undefined");
assertEqual(await repo.replace("a", { other: 1 }), { id: "a", other: 1 }, "replace drops the old fields but keeps the id");
assertEqual(await repo.replace("zzz", {}), undefined);
assertEqual(await repo.remove("a"), true);
assertEqual(await repo.remove("a"), false, "removing twice: false the second time");
assertEqual(repo.size, 0);`),
      },
      {
        id: "t3",
        description: "Repository: nothing leaks in or out",
        assertionCode: T(js`const input = { tags: ["x"] };
const repo = new Repository("things", [{ id: "a", tags: ["seed"] }]);
const created = await repo.create(input);
input.tags.push("changed after create");
assertEqual((await repo.get(created.id)).tags, ["x"], "changing the object you passed in must not change the store");
const got = await repo.get("a");
got.tags.push("hacked");
assertEqual((await repo.get("a")).tags, ["seed"], "changing a returned record must not change the store");
const listed = await repo.list();
listed[0].tags.length = 0;
assertEqual((await repo.get("a")).tags, ["seed"], "list() returns copies too");`),
      },
      {
        id: "t4",
        description: "Repository: updateWhere is an atomic compare-and-set",
        assertionCode: T(js`const repo = new Repository("bikes", [{ id: "b1", status: "available" }]);
assertEqual(await repo.updateWhere("zzz", () => true, {}), undefined, "missing record");
const results = await Promise.all([
  repo.updateWhere("b1", (b) => b.status === "available", { status: "rented", by: "ana" }),
  repo.updateWhere("b1", (b) => b.status === "available", { status: "rented", by: "ben" }),
]);
assertEqual(results.filter((r) => r !== null).length, 1, "exactly one of two simultaneous claims wins");
assertEqual(results.filter((r) => r === null).length, 1, "the loser gets null");
const winner = results.find((r) => r);
assertEqual((await repo.get("b1")).by, winner.by, "the stored record belongs to the winner");
assertEqual(await repo.updateWhere("b1", (b) => b.status === "available", { status: "x" }), null, "predicate false -> null");`),
      },
      {
        id: "t5",
        description: "Repository: calls take time, reset() restores the seed",
        assertionCode: T(js`const repo = new Repository("things", [{ id: "a", n: 1 }], { latencyMs: 25 });
const before = Date.now();
await repo.get("a");
assert(Date.now() - before >= 25, "each call waits latencyMs (virtual time passes), got " + (Date.now() - before));
await repo.create({ n: 2 });
await repo.remove("a");
repo.reset();
assertEqual(repo.size, 1);
assertEqual(await repo.get("a"), { id: "a", n: 1 }, "the seed record is back");
assertEqual((await repo.create({})).id, "things-2", "and the id counter restarted");
db.reset();
assertEqual(db.stations.size, 8, "the app database is seeded with eight stations");
assertEqual([db.bikes.size, db.rentals.size], [24, 7]);`),
      },
      {
        id: "t6",
        description: "GET routes: list, one, bikes at a station, and 404s",
        assertionCode: T(js`db.reset();
const list = await call("GET", "/stations");
assertEqual(list.status, 200);
assertEqual(list.body.items.length, 8, "all stations, wrapped in items by stationListView");
assertEqual(list.body.items[2], { id: "st-03", name: "Tram Depot", zone: "central", capacity: 14, x: 50, y: 46 });
const one = await call("GET", "/stations/st-05");
assertEqual([one.status, one.body.name], [200, "Foundry Square"]);
const missing = await call("GET", "/stations/st-99");
assertEqual(missing.status, 404, "an unknown station is a 404");
assert(JSON.stringify(missing.body).includes("st-99"), "the message names the station");
const bikes = await call("GET", "/stations/st-03/bikes");
assertEqual(bikes.status, 200);
assertEqual(bikes.body.map((b) => b.id), ["bk-108", "bk-109", "bk-110", "bk-111", "bk-112"], "five bikes dock at Tram Depot");
assertEqual((await call("GET", "/stations/st-99/bikes")).status, 404, "bikes of an unknown station: 404");
assert(one.trace.includes("getStation"), "the trace shows the handler");`),
      },
      {
        id: "t7",
        description: "POST, PUT and PATCH: status codes, ids and whitelisted fields",
        assertionCode: T(js`db.reset();
const created = await call("POST", "/stations", { body: { name: "Canal Steps", zone: "old-town", capacity: 9, id: "st-hack", isAdmin: true } });
assertEqual(created.status, 201, "create answers 201");
assertEqual(created.body, { id: "st-09", name: "Canal Steps", zone: "old-town", capacity: 9, x: 50, y: 50 }, "server-chosen id, defaults for x and y, unknown fields dropped");
assertEqual(created.headers.location, "/stations/st-09", "the Location header says where it lives");
assertEqual((await call("GET", "/stations/st-09")).body.name, "Canal Steps", "and it can be read back");
const put = await call("PUT", "/stations/st-09", { body: { name: "Canal Steps East", zone: "east", capacity: 11 } });
assertEqual([put.status, put.body.name, put.body.zone, put.body.id], [200, "Canal Steps East", "east", "st-09"], "PUT replaces");
assertEqual((await call("PUT", "/stations/st-77", { body: { name: "Nowhere", zone: "east", capacity: 5 } })).status, 404, "PUT never creates at a client-chosen id");
const patch = await call("PATCH", "/stations/st-09", { body: { capacity: 12, id: "st-00", hacked: 1 } });
assertEqual([patch.status, patch.body.capacity, patch.body.name, patch.body.id, patch.body.hacked], [200, 12, "Canal Steps East", "st-09", undefined], "PATCH changes only what was sent, whitelisted");
assertEqual((await call("PATCH", "/stations/st-77", { body: { capacity: 5 } })).status, 404);`),
      },
      {
        id: "t8",
        description: "DELETE: 204, 404 and 409",
        assertionCode: T(js`db.reset();
const busy = await call("DELETE", "/stations/st-03");
assertEqual(busy.status, 409, "Tram Depot still has bikes docked");
assert(JSON.stringify(busy.body).includes("5"), "the message says how many bikes");
assertEqual((await call("GET", "/stations/st-03")).status, 200, "the station survived");
const fresh = await call("POST", "/stations", { body: { name: "Empty Dock", zone: "park", capacity: 6 } });
const gone = await call("DELETE", "/stations/" + fresh.body.id);
assertEqual(gone.status, 204, "an empty station can go");
assertEqual(gone.body, null, "204 has no body");
assertEqual((await call("DELETE", "/stations/" + fresh.body.id)).status, 404, "deleting again: 404");
assertEqual((await call("GET", "/stations/" + fresh.body.id)).status, 404, "it is gone");
assertEqual((await call("GET", "/stations")).body.items.length, 8, "back to the original eight");
assertEqual(typeof stationListView, "function", "stationListView is the seam lesson 8 replaces");`),
      },
    ],
    unlocks: ["api-stations"],
    checks: [
      {
        prompt: md`A client sends the same ¦DELETE /stations/st-09¦ twice. The first answers 204, the second 404. Is ¦DELETE¦ still idempotent?`,
        question: {
          type: "choice",
          options: ["No: idempotent means the status code must be identical every time", "Yes: idempotent is about the effect on the server, and the station is gone after one call or two", "No: DELETE is never idempotent", "Only if the second call returns 204 as well"],
          answer: 1,
        },
        explanation: md`Idempotency promises the same resulting state, not the same response. After one delete or ten the station does not exist. (Some APIs answer 204 both times to keep clients simpler; both designs are defensible.)`,
      },
      {
        prompt: md`Why does ¦updateWhere¦ check the predicate and write inside one synchronous step instead of ¦get¦ then ¦update¦?`,
        question: {
          type: "choice",
          options: [
            "It is faster",
            "Between an awaited get and a later update another request can change the record, so two callers could both pass the check; doing both without an await in between makes the claim atomic",
            "update cannot be called after get",
            "Predicates are only allowed in synchronous code",
          ],
          answer: 1,
        },
        explanation: md`JavaScript runs one synchronous stretch at a time, but every ¦await¦ is a gap where other requests run. A check and its write belong in the same gap-free stretch.`,
      },
    ],
  },

  // ───────────────────────────────────────── 6. Validation
  {
    id: "js-api-6-validation",
    title: "Validating input",
    minutes: 45,
    xp: 200,
    concepts: ["schema validation", "400 Bad Request", "collecting all errors", "unknown fields", "mass assignment", "JSON parsing"],
    learn: md`### Never trust the edge

Everything that crosses the API boundary is untrusted: types, ranges, shapes, even whether it is valid JSON. Check it once, at the boundary, and let the rest of the code assume clean data. If validation is missing, the failures show up deep inside: a ¦TypeError¦ in a repository, a ¦NaN¦ saved as a capacity, a string where a number was expected, and the rider sees a bare 500.

Validation answers a different question from authorisation. This lesson asks "is this request well-formed and sensible?", and the answer is **400 Bad Request** (some APIs use 422 for "well-formed but semantically wrong"; what matters is picking one and keeping it).

### A schema is data

Instead of a pile of ¦if¦ statements per route, describe the allowed shape as an object and write the checking code once:

~~~js
const stationSchema = {
  name:     { type: "string", required: true, trim: true, min: 2, max: 40 },
  zone:     { type: "string", required: true, oneOf: ZONES },
  capacity: { type: "integer", required: true, min: 4, max: 40 },
  x:        { type: "number", min: 0, max: 100, default: 50 },
};
~~~

The rules your validator understands: ¦type¦ (string, number, integer, boolean, array, object), ¦required¦, ¦nullable¦, ¦default¦, ¦trim¦, ¦min¦ and ¦max¦ (string/array **length**, number **value**), ¦pattern¦, ¦oneOf¦, ¦items¦ (the rule for each array element), ¦fields¦ (nested objects) and ¦custom(value, whole)¦ returning an error message or nothing.

### Report every problem at once

A form that reveals one error per submit is miserable. ¦validate¦ collects errors for **all** fields (but only the first problem of each field: a name that is too short does not also need to be told it lacks a letter) as ¦{ field, code, message }¦ and returns ¦{ ok, value, errors }¦. The ¦field¦ is a path (¦address.city¦, ¦tags[2]¦) so a client can highlight the right input; the ¦code¦ (¦required¦, ¦type¦, ¦min¦, ¦max¦, ¦pattern¦, ¦oneOf¦, ¦unknown¦, ¦custom¦) is for programs; the ¦message¦ is for people.

### Unknown fields are errors

Rejecting keys the schema does not mention protects against **mass assignment** (a caller adds ¦"role": "admin"¦ and a careless ¦Object.assign¦ stores it) and catches typos (¦capcity¦). The validated ¦value¦ you return contains only declared fields, trimmed and defaulted: handlers read ¦req.valid¦, never the raw body.

### Partial mode for PATCH

A PATCH may contain any subset of fields, so in ¦partial¦ mode ¦required¦ and defaults do not apply (a missing field means "leave it alone"), but every field that *is* present is still fully checked, and an empty body is itself an error.

### Coercion for query strings

Bodies are JSON and keep their types; query strings are always text. With ¦coerce: true¦ a string is converted to the declared type before checking (¦"12"¦ becomes ¦12¦, ¦"true"¦ becomes ¦true¦), and anything that does not convert becomes a normal ¦type¦ error. Lesson 8 uses it.

### Parsing comes first

A body can arrive as a **string** (the raw text of a request). The ¦jsonBody¦ middleware parses it: malformed JSON becomes a clear ¦400¦ (code ¦malformed_json¦), a body labelled with some non-JSON content type becomes ¦415 Unsupported Media Type¦. Only then does validation run. Keeping those steps separate gives callers precise errors: "this isn't JSON" is a different mistake from "capacity must be an integer".

### Where it plugs in

¦validateBody(schema, options)¦ returns a middleware: validate, put the cleaned copy on ¦req.valid¦, or throw a ¦ValidationError¦. You attach it to routes with the router's ¦before¦ hook, so the handlers you wrote last lesson stay untouched.

### Common mistakes

- Validating in the handler after half the work is done.
- Returning only the first error.
- Trusting ¦typeof x === "number"¦ (¦NaN¦ is a number; ¦Infinity¦ too).
- Echoing the raw input into the error message (reflected injection).
- Forgetting length limits: an unbounded string is a storage and memory problem.`,
    mission: md`The ops dashboard just created a station called ¦" "¦ with capacity ¦"lots"¦, and three kiosks crashed rendering it. From now on bad input never reaches the repository.

Write the validator, the JSON body parser and the middleware that guards the station routes. The control room's inspector shows what a rejected request looks like, field by field.`,
    tasks: [
      "validate(schema, data, { partial, coerce }): types, required, defaults, trim, min/max, pattern, oneOf, items, nested fields, custom; collects all errors; rejects unknown fields",
      "class ValidationError (status 400, code validation_failed, details.errors) and validateBody(schema, options) middleware that sets req.valid",
      "jsonBody middleware: parse string bodies; malformed -> 400 malformed_json; wrong content type -> 415",
      "station schema, attached with router.before to POST, PUT and PATCH (partial) of the station routes",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: validate everything that comes in.

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Words for the "must be ..." messages.
const TYPE_WORDS = { string: "a string", number: "a number", integer: "an integer", boolean: "a boolean", array: "an array", object: "an object" };

// Check data (an object) against schema (an object of field rules). Returns { ok, value, errors }.
//   errors: [{ field, code, message }] - message starts with the field: "name must be at least 2 characters".
//   value:  only the declared fields that passed (after trim / default / coercion); undefined when data is not an object.
// Rules, in this order for each field present in data:
//   null          -> allowed only with nullable: true, otherwise a "type" error
//   coerce option -> a string is converted for number / integer ("12" -> 12) and boolean ("true" / "false") before checking
//   type          -> code "type", message "<field> must be <TYPE_WORDS[type]>"; numbers must be finite; integers must be integers
//   trim: true    -> trim strings before the other checks
//   min / max     -> string and array LENGTH, number VALUE. Codes "min" / "max"
//   pattern       -> a RegExp the string must match. Code "pattern"
//   oneOf         -> value must be one of the listed values. Code "oneOf"
//   items         -> a rule applied to every array element; the element's field is "<field>[<index>]"
//   fields        -> for type "object": validate the nested object recursively, fields named "<field>.<child>"
//   custom        -> custom(value, data) returns an error message string (code "custom") or nothing
// A field reports only its FIRST problem (a name that is too short is not also "missing a letter"); array items and nested fields report their own.
// Field absent (undefined): "required" error if rule.required and not partial; otherwise apply rule.default (unless partial).
// Keys in data that the schema does not declare: code "unknown", message "<field> is not a known field".
// options.partial: required and defaults do not apply, and an empty top-level object is one error { field: "body", code: "empty" }.
// data that is not an object: one error { field: "body", code: "type", message: "body must be an object" } (nested: the field's own path).
// prefix (internal): text put in front of field names when validating a nested object ("address.").
function validate(schema, data, options = {}, prefix = "") {
  // TODO
}

// A 400 carrying every field error. status 400, code "validation_failed", message "Request validation failed",
// details { errors } (so the error body gets an "errors" array), and an errors property with the same array.
class ValidationError extends HttpError {
  constructor(errors) {
    // TODO
  }
}

// Middleware factory: validateBody(schema, { partial }) -> a middleware named validateBody that
// validates req.body (treat null as "no body"), throws ValidationError on failure and otherwise sets req.valid to the cleaned value.
function validateBody(schema, options = {}) {
  // TODO
}

// Global middleware: when req.body is a string, parse it as JSON.
//   - content-type present and not JSON (no "json" in it) -> HttpError 415, code "unsupported_media_type"
//   - invalid JSON -> HttpError 400, "Request body is not valid JSON", code "malformed_json"
// Bodies that are already objects (or null) pass straight through.
function jsonBody(req, res, next) {
  // TODO
}

// TODO: app.use(jsonBody);

// ── the station rules ──
const ZONES = ["waterfront", "old-town", "central", "park", "east", "campus"];

// TODO: stationSchema with
//   name      string, required, trim, 2..40 characters, and custom: must contain a letter ("must contain a letter")
//   zone      string, required, one of ZONES
//   capacity  integer, required, 4..40
//   x, y      number, 0..100, default 50 (custom on x: ¦x and y must be given together¦ when only one of them is present)

// TODO: attach with router.before:
//   POST /stations and PUT /stations/:id -> validateBody(stationSchema)
//   PATCH /stations/:id                  -> validateBody(stationSchema, { partial: true })
`,
    solutionAdd: js`const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const TYPE_WORDS = { string: "a string", number: "a number", integer: "an integer", boolean: "a boolean", array: "an array", object: "an object" };

function coerceText(text, type) {
  if (type === "number" || type === "integer") return text.trim() === "" ? text : Number(text);
  if (type === "boolean") return text === "true" ? true : text === "false" ? false : text;
  return text;
}

function checkValue(input, rule, field, options, errors, whole) {
  const fail = (code, message) => errors.push({ field, code, message: ¦\${field} \${message}¦ });
  let value = input;
  if (options.coerce && typeof value === "string") value = coerceText(value, rule.type);
  const type = rule.type;
  const typeOk =
    type === "string" ? typeof value === "string"
    : type === "number" ? typeof value === "number" && Number.isFinite(value)
    : type === "integer" ? Number.isInteger(value)
    : type === "boolean" ? typeof value === "boolean"
    : type === "array" ? Array.isArray(value)
    : type === "object" ? isPlainObject(value)
    : true;
  if (!typeOk) {
    fail("type", ¦must be \${TYPE_WORDS[type] ?? type}¦);
    return { ok: false };
  }
  const before = errors.length;
  const ok = () => errors.length === before;
  if (type === "string" && rule.trim) value = value.trim();
  const size = type === "string" || type === "array" ? value.length : value;
  const unit = type === "string" ? " characters" : type === "array" ? " items" : "";
  if (ok() && rule.min !== undefined && size < rule.min) fail("min", ¦must be at least \${rule.min}\${unit}¦);
  if (ok() && rule.max !== undefined && size > rule.max) fail("max", ¦must be at most \${rule.max}\${unit}¦);
  if (ok() && rule.pattern && !rule.pattern.test(value)) fail("pattern", "has the wrong format");
  if (ok() && rule.oneOf && !rule.oneOf.includes(value)) fail("oneOf", ¦must be one of: \${rule.oneOf.join(", ")}¦);
  if (type === "array" && rule.items) {
    value = value.map((element, i) => {
      const inner = checkValue(element, rule.items, ¦\${field}[\${i}]¦, options, errors, whole);
      return inner.ok ? inner.value : element;
    });
  }
  if (type === "object" && rule.fields) {
    const nested = validate(rule.fields, value, options, ¦\${field}.¦);
    errors.push(...nested.errors);
    if (nested.ok) value = nested.value;
  }
  if (ok() && rule.custom) {
    const message = rule.custom(value, whole);
    if (message) fail("custom", message);
  }
  return { ok: errors.length === before, value };
}

function validate(schema, data, options = {}, prefix = "") {
  const errors = [];
  if (!isPlainObject(data)) {
    const field = prefix.replace(/\.$/, "") || "body";
    return { ok: false, value: undefined, errors: [{ field, code: "type", message: ¦\${field} must be an object¦ }] };
  }
  const value = {};
  for (const key of Object.keys(data)) {
    if (!Object.hasOwn(schema, key)) errors.push({ field: prefix + key, code: "unknown", message: ¦\${prefix + key} is not a known field¦ });
  }
  if (options.partial && !prefix && Object.keys(data).length === 0) {
    errors.push({ field: "body", code: "empty", message: "body must contain at least one field" });
  }
  for (const [key, rule] of Object.entries(schema)) {
    const field = prefix + key;
    const input = data[key];
    if (input === undefined) {
      if (rule.required && !options.partial) errors.push({ field, code: "required", message: ¦\${field} is required¦ });
      else if (rule.default !== undefined && !options.partial) value[key] = structuredClone(rule.default);
      continue;
    }
    if (input === null) {
      if (rule.nullable) value[key] = null;
      else errors.push({ field, code: "type", message: ¦\${field} must be \${TYPE_WORDS[rule.type] ?? rule.type}¦ });
      continue;
    }
    const checked = checkValue(input, rule, field, options, errors, data);
    if (checked.ok) value[key] = checked.value;
  }
  return { ok: errors.length === 0, value, errors };
}

class ValidationError extends HttpError {
  constructor(errors) {
    super(400, "Request validation failed", { code: "validation_failed", details: { errors } });
    this.errors = errors;
  }
}

function validateBody(schema, options = {}) {
  return function validateBody(req, res, next) {
    const result = validate(schema, req.body ?? undefined, options);
    if (!result.ok) throw new ValidationError(result.errors);
    req.valid = result.value;
    return next();
  };
}

function jsonBody(req, res, next) {
  if (typeof req.body === "string") {
    const type = req.header("content-type");
    if (type && !type.toLowerCase().includes("json")) {
      throw new HttpError(415, "The body must be sent as application/json", { code: "unsupported_media_type" });
    }
    try {
      req.body = JSON.parse(req.body);
    } catch {
      throw new HttpError(400, "Request body is not valid JSON", { code: "malformed_json" });
    }
  }
  return next();
}

app.use(jsonBody);

const ZONES = ["waterfront", "old-town", "central", "park", "east", "campus"];

const stationSchema = {
  name: { type: "string", required: true, trim: true, min: 2, max: 40, custom: (v) => (/[A-Za-z]/.test(v) ? undefined : "must contain a letter") },
  zone: { type: "string", required: true, oneOf: ZONES },
  capacity: { type: "integer", required: true, min: 4, max: 40 },
  x: { type: "number", min: 0, max: 100, default: 50, custom: (v, whole) => (whole.y === undefined ? "x and y must be given together" : undefined) },
  y: { type: "number", min: 0, max: 100, default: 50, custom: (v, whole) => (whole.x === undefined ? "x and y must be given together" : undefined) },
};

router.before("POST", "/stations", validateBody(stationSchema));
router.before("PUT", "/stations/:id", validateBody(stationSchema));
router.before("PATCH", "/stations/:id", validateBody(stationSchema, { partial: true }));`,
    explanation:
      "checkValue validates one value against one rule and appends to a shared error list, so arrays and nested objects can call it recursively with their own field paths. validate walks the declared fields (required, defaults, null handling), then reports undeclared keys, and returns only the cleaned declared values. Because the checks keep going after a failure, a caller learns about every problem at once. ValidationError is just an HttpError with the error list in details, which the error handler spreads into the body. jsonBody separates 'is this JSON' (400/415) from 'is this valid' (400 with fields), and router.before wires the middleware to the existing routes so the handlers do not change.",
    hints: [
      { id: "h1", title: "Structure", content: "Write a helper checkValue(input, rule, field, options, errors, whole) that does the coercion, type check, trim, min/max, pattern, oneOf, items, nested fields and custom for ONE value and pushes to errors. validate then loops over Object.entries(schema), handles absent and null values, calls checkValue, and also flags keys of data that are missing from the schema (Object.hasOwn)." },
      { id: "h2", title: "min and max", content: "For strings and arrays compare value.length, for numbers compare the value itself. Message: field + \" must be at least \" + min + (strings: \" characters\" / arrays: \" items\"). Do trim BEFORE the length checks, and apply coercion BEFORE the type check." },
      { id: "h3", title: "Plumbing", content: "ValidationError: super(400, \"Request validation failed\", { code: \"validation_failed\", details: { errors } }); this.errors = errors. validateBody returns a function NAMED validateBody that runs validate(schema, req.body ?? undefined, options), throws on !ok and sets req.valid = result.value. jsonBody: JSON.parse inside try/catch, throwing the two HttpErrors from the comments." },
    ],
    tests: [
      {
        id: "t1",
        description: "validate: required, defaults, types and the cleaned value",
        assertionCode: T(js`const schema = { name: { type: "string", required: true }, age: { type: "integer" }, active: { type: "boolean", default: true }, ratio: { type: "number" } };
let r = validate(schema, { name: "Ana", age: 30 });
assertEqual(r.ok, true);
assertEqual(r.value, { name: "Ana", age: 30, active: true }, "the default is applied to the cleaned value");
r = validate(schema, {});
assertEqual(r.ok, false);
assertEqual(r.errors, [{ field: "name", code: "required", message: "name is required" }]);
r = validate(schema, { name: 5, age: 1.5, active: "yes", ratio: NaN });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["name:type", "age:type", "active:type", "ratio:type"], "every wrong type is reported, NaN is not a number");
assertEqual(r.errors[1].message, "age must be an integer");
assertEqual(r.errors[0].message, "name must be a string");
r = validate(schema, { name: "x", age: null });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["age:type"], "null is not allowed unless nullable");
assertEqual(validate({ n: { type: "integer", nullable: true } }, { n: null }).value, { n: null });`),
      },
      {
        id: "t2",
        description: "validate: strings, numbers, patterns and oneOf",
        assertionCode: T(js`const schema = {
  name: { type: "string", trim: true, min: 2, max: 5 },
  code: { type: "string", pattern: /^[A-Z]{3}$/ },
  zone: { type: "string", oneOf: ["north", "south"] },
  n: { type: "number", min: 0, max: 10 },
};
let r = validate(schema, { name: "  Ana  ", code: "ABC", zone: "north", n: 10 });
assertEqual(r.ok, true);
assertEqual(r.value.name, "Ana", "trim happens before the checks and in the result");
r = validate(schema, { name: " a ", code: "abc", zone: "west", n: 11 });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["name:min", "code:pattern", "zone:oneOf", "n:max"]);
assertEqual(r.errors[0].message, "name must be at least 2 characters");
assertEqual(r.errors[3].message, "n must be at most 10");
assert(r.errors[2].message.includes("north") && r.errors[2].message.includes("south"), "oneOf lists the choices");
assertEqual(validate(schema, { name: "toolong" }).errors[0].code, "max");
assertEqual(validate(schema, { n: -1 }).errors[0].code, "min", "number min compares the value");`),
      },
      {
        id: "t3",
        description: "validate: arrays, nested objects and custom rules",
        assertionCode: T(js`const schema = {
  tags: { type: "array", min: 1, max: 3, items: { type: "string", max: 4 } },
  home: { type: "object", fields: { city: { type: "string", required: true }, floor: { type: "integer", min: 0 } } },
  end: { type: "integer", custom: (v, whole) => (whole.start !== undefined && v < whole.start ? "must not be before start" : undefined) },
  start: { type: "integer" },
};
let r = validate(schema, { tags: ["a", "toolong", 5], home: { city: "", floor: -1 }, start: 5, end: 2 });
const got = r.errors.map((e) => e.field + ":" + e.code);
assertEqual(got, ["tags[1]:max", "tags[2]:type", "home.floor:min", "end:custom"], "paths show exactly where each problem is");
assertEqual(r.errors[3].message, "end must not be before start");
r = validate(schema, { tags: [], home: {} });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["tags:min", "home.city:required"]);
r = validate(schema, { tags: ["ok"], home: "nope" });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["home:type"], "a non-object where an object is expected");
r = validate(schema, { tags: ["ok", "yes"], home: { city: "Hull", floor: 2 } });
assertEqual(r.value, { tags: ["ok", "yes"], home: { city: "Hull", floor: 2 } });`),
      },
      {
        id: "t4",
        description: "validate: unknown fields, partial mode and non-objects",
        assertionCode: T(js`const schema = { name: { type: "string", required: true }, n: { type: "integer", default: 1 } };
let r = validate(schema, { name: "a", role: "admin", capcity: 3 });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["role:unknown", "capcity:unknown"], "undeclared keys are rejected (mass assignment, typos)");
assertEqual(r.errors[0].message, "role is not a known field");
r = validate(schema, { n: 5 }, { partial: true });
assertEqual([r.ok, r.value], [true, { n: 5 }], "partial: required does not apply and defaults are not added");
r = validate(schema, {}, { partial: true });
assertEqual(r.errors.map((e) => e.code), ["empty"], "an empty partial body is an error");
r = validate(schema, { n: "x" }, { partial: true });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["n:type"], "present fields are still fully checked");
for (const bad of [undefined, null, "text", 5, ["a"]]) {
  const out = validate(schema, bad);
  assertEqual([out.ok, out.errors.length, out.errors[0].field, out.errors[0].code], [false, 1, "body", "type"], "non-object input " + JSON.stringify(bad));
}
const evil = JSON.parse('{"name":"a","__proto__":{"admin":true}}');
assertEqual(validate(schema, evil).errors.map((e) => e.code), ["unknown"], "a __proto__ key in JSON is just an unknown field");
assertEqual(({}).admin, undefined);`),
      },
      {
        id: "t5",
        description: "validate: coercion for query-string style input",
        assertionCode: T(js`const schema = { limit: { type: "integer", min: 1 }, ratio: { type: "number" }, flag: { type: "boolean" }, q: { type: "string" } };
let r = validate(schema, { limit: "25", ratio: "0.5", flag: "true", q: "12" }, { coerce: true });
assertEqual([r.ok, r.value], [true, { limit: 25, ratio: 0.5, flag: true, q: "12" }], "strings convert to the declared type; string fields stay strings");
r = validate(schema, { limit: "abc", ratio: "", flag: "maybe" }, { coerce: true });
assertEqual(r.errors.map((e) => e.field + ":" + e.code), ["limit:type", "ratio:type", "flag:type"], "things that do not convert are type errors");
r = validate(schema, { limit: "0" }, { coerce: true });
assertEqual(r.errors.map((e) => e.code), ["min"], "converted values are range-checked");
r = validate(schema, { limit: "5" });
assertEqual(r.errors.map((e) => e.code), ["type"], "without coerce a string is not an integer");`),
      },
      {
        id: "t6",
        description: "ValidationError and validateBody",
        assertionCode: T(js`const errors = [{ field: "n", code: "type", message: "n must be an integer" }];
const e = new ValidationError(errors);
assert(e instanceof HttpError, "it is an HttpError");
assertEqual([e.status, e.code, e.message], [400, "validation_failed", "Request validation failed"]);
assertEqual(e.details, { errors });
assertEqual(e.errors, errors);
const mw = validateBody({ n: { type: "integer", required: true, default: 1 } });
assertEqual(mw.name, "validateBody", "the middleware is named so the trace shows it");
const req = new HttpRequest({ method: "POST", url: "/", body: { n: 3 } });
let nexted = false;
await mw(req, new HttpResponse(), () => { nexted = true; });
assertEqual([nexted, req.valid], [true, { n: 3 }], "valid input: req.valid is set and next() is called");
const bad = new HttpRequest({ method: "POST", url: "/", body: { n: "x" } });
assertThrows(() => mw(bad, new HttpResponse(), () => {}), "Request validation failed");
const none = new HttpRequest({ method: "POST", url: "/" });
const thrown = assertThrows(() => mw(none, new HttpResponse(), () => {}), "validation");
assertEqual(thrown.errors[0].field, "body", "no body at all is a body error");
const partial = validateBody({ n: { type: "integer", required: true } }, { partial: true });
const preq = new HttpRequest({ method: "PATCH", url: "/", body: { } });
assertThrows(() => partial(preq, new HttpResponse(), () => {}), "validation");`),
      },
      {
        id: "t7",
        description: "jsonBody parses text bodies and rejects bad ones",
        assertionCode: T(js`const run = async (body, headers = {}) => { const req = new HttpRequest({ method: "POST", url: "/", body, headers }); await jsonBody(req, new HttpResponse(), () => {}); return req.body; };
assertEqual(await run('{"a":1}'), { a: 1 }, "a JSON string is parsed");
assertEqual(await run('{"a":1}', { "content-type": "application/json; charset=utf-8" }), { a: 1 });
assertEqual(await run({ a: 1 }), { a: 1 }, "an object body passes through");
assertEqual(await run(undefined), null, "no body stays null");
const bad = assertThrows(() => jsonBody(new HttpRequest({ body: "{oops" }), new HttpResponse(), () => {}), "not valid JSON");
assertEqual([bad.status, bad.code], [400, "malformed_json"]);
const wrong = assertThrows(() => jsonBody(new HttpRequest({ body: "a=1", headers: { "Content-Type": "text/plain" } }), new HttpResponse(), () => {}), "application/json");
assertEqual([wrong.status, wrong.code], [415, "unsupported_media_type"]);
assert(listMiddleware().includes("jsonBody"), "register jsonBody with app.use");`),
      },
      {
        id: "t8",
        description: "The station routes reject bad input with field errors",
        assertionCode: T(js`db.reset();
const bad = await call("POST", "/stations", { body: { name: " ", zone: "moon", capacity: "lots", colour: "red" } });
assertEqual(bad.status, 400);
const byField = Object.fromEntries(bad.body.errors.map((e) => [e.field, e.code]));
assertEqual(byField, { name: "min", zone: "oneOf", capacity: "type", colour: "unknown" }, "four problems, all reported");
assertEqual(bad.body.error, "Request validation failed", "the body carries the message and the errors array");
assertEqual((await call("GET", "/stations")).body.items.length, 8, "nothing was stored");
const noBody = await call("POST", "/stations");
assertEqual(noBody.status, 400);
assertEqual(noBody.body.errors[0].field, "body");
const good = await call("POST", "/stations", { body: { name: "  Canal Steps  ", zone: "old-town", capacity: 9 } });
assertEqual([good.status, good.body.name, good.body.x, good.body.y], [201, "Canal Steps", 50, 50], "trimmed, defaults applied, stored");
assertEqual((await call("POST", "/stations", { body: { name: "Half Placed", zone: "park", capacity: 6, x: 10 } })).body.errors[0].field, "x", "x without y is rejected by the custom rule");
assertEqual((await call("POST", "/stations", { body: "{broken", headers: { "content-type": "application/json" } })).status, 400, "malformed JSON text");
assertEqual((await call("POST", "/stations", { body: '{"name":"Text Body","zone":"park","capacity":8}', headers: { "content-type": "application/json" } })).status, 201, "a valid JSON text body works end to end");
assert(good.trace.includes("validateBody") && good.trace.includes("jsonBody"), "both middleware show in the trace");`),
      },
      {
        id: "t9",
        description: "PUT needs the full record, PATCH needs at least one valid field",
        assertionCode: T(js`db.reset();
const put = await call("PUT", "/stations/st-02", { body: { name: "Mill Lane", zone: "old-town" } });
assertEqual(put.status, 400, "PUT without capacity");
assertEqual(put.body.errors.map((e) => e.field), ["capacity"]);
const patch = await call("PATCH", "/stations/st-02", { body: { capacity: 11 } });
assertEqual([patch.status, patch.body.capacity, patch.body.name], [200, 11, "Mill Lane"], "PATCH with one valid field");
assertEqual((await call("PATCH", "/stations/st-02", { body: {} })).body.errors[0].code, "empty");
assertEqual((await call("PATCH", "/stations/st-02", { body: { capacity: 1 } })).body.errors[0].code, "min");
assertEqual((await call("PATCH", "/stations/st-02", { body: { id: "st-00" } })).body.errors[0].code, "unknown", "ids cannot be patched");
assertEqual((await call("GET", "/stations/st-02")).body.capacity, 11, "failed patches changed nothing");`),
      },
    ],
    unlocks: ["api-validation"],
    checks: [
      {
        prompt: md`A caller posts ¦{ "name": "Dock", "zone": "park", "capacity": 8, "role": "admin" }¦. The schema has no ¦role¦. Why is it better to reject this than to silently ignore ¦role¦?`,
        question: {
          type: "choice",
          options: [
            "Silently ignoring is always better because it is more forgiving",
            "A rejected unknown field exposes typos and stops mass-assignment mistakes from ever storing attacker-chosen data, and the caller learns the field has no effect",
            "JSON does not allow extra keys",
            "It makes the response smaller",
          ],
          answer: 1,
        },
        explanation: md`Strict inputs make an API honest: what you send is what is used. Silent dropping hides bugs on the client, and a future change that starts honouring the field would suddenly turn old requests into privilege escalation.`,
      },
      {
        prompt: md`Why is parsing JSON (¦jsonBody¦) a separate step from validating the parsed value?`,
        question: {
          type: "choice",
          options: [
            "They are the same step",
            "So callers get the right error: 'this is not JSON' (400/415) is a different mistake from 'this field has the wrong type', and validation always starts from a real object",
            "Because JSON.parse cannot run inside middleware",
            "Because validation needs the raw text",
          ],
          answer: 1,
        },
        explanation: md`Layering produces precise messages and keeps each piece small and testable.`,
      },
    ],
  },

  // ───────────────────────────────────────── 7. Problem details
  {
    id: "js-api-7-problems",
    title: "One shape for every error",
    minutes: 35,
    xp: 170,
    concepts: ["problem details", "error taxonomy", "no information leaks", "Retry-After", "error codes vs messages"],
    learn: md`### Errors are part of the API

Clients spend more code handling failures than successes: show the right message, retry or not, highlight a field, ask the user to log in again. If every failure has its own shape (¦{ error }¦ here, ¦{ message, errors }¦ there, an HTML page for a crash) that code becomes a pile of special cases.

The standard answer is a **problem document**: one JSON shape, served as ¦application/problem+json¦, for every error the API can produce. Ours has these members:

~~~json
{
  "type": "https://dockline.example/problems/validation-failed",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/stations",
  "requestId": "req-000042",
  "errors": [{ "field": "capacity", "code": "type", "message": "capacity must be an integer" }]
}
~~~

- **type**: a stable identifier clients can switch on (a URL, so it can be documented). It changes only when the *kind* of problem changes.
- **title**: a short human summary of the status. The same for every problem of one status.
- **status**: the HTTP status, repeated in the body so the document makes sense on its own (in logs, in a queue).
- **detail**: what happened this time, written for a developer.
- **instance**: which request (here, the path).
- Extra members are allowed. We add ¦requestId¦ (so a user can quote it to support) and ¦errors¦ for validation.

Clients should branch on **type** (or on the status), never on the ¦detail¦ text, which can be reworded at any time.

### Two kinds of failure

1. **Expected failures** are your own ¦HttpError¦s: not found, conflict, rate limited. Their status, message and headers are part of the design, and they are safe to show.
2. **Unexpected failures** are bugs: a ¦TypeError¦, a failed assertion, a dead database. The caller must learn almost nothing: status 500, generic text, the request id. Everything else (message, stack) goes to the **log**, where your team can read it with the same request id. Leaking an exception message can reveal table names, file paths or secrets.

### Headers travel with the error

Some errors need headers: ¦Allow¦ on a 405, ¦Retry-After¦ on a 429 or 503, ¦WWW-Authenticate¦ on a 401. ¦HttpError¦ already carries them; the handler copies them on.

### Not everything thrown is an Error

JavaScript lets you ¦throw "oops"¦ or ¦throw { code: 5 }¦. Normalise whatever arrives into an ¦Error¦ first so the rest of the handler never has to guess.

### One more rule: do not answer twice

If the response was already sent (a bug elsewhere), the handler must not try to send a second one; it would only throw again inside the error path.

### Common mistakes

- Different shapes for validation errors, 404s and crashes.
- Copying ¦err.message¦ of unknown errors into the response.
- Using the title or detail text as the thing clients match on.
- Forgetting to log the real error, so a 500 leaves no evidence.`,
    mission: md`The mobile team has seven different ¦if¦ branches to read your errors, and support cannot connect a rider's screenshot to a log line. Give every failure the same shape, with the request id inside, and make sure a crash tells the caller nothing it should not know.

Replace the pipeline's error handler. The control room's error dashboard tallies the problems by class and shows the latest documents.`,
    tasks: [
      "toProblem(err, req): turns any thrown value into { status, headers, body } with type, title, status, detail, instance, requestId (+ errors)",
      "unexpected errors become a generic 500 and are logged with their message and stack",
      "problemHandler(err, req, res) writes it as application/problem+json and is installed with app.onError",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: problem documents for every error.

const PROBLEM_BASE = "https://dockline.example/problems/";
const STATUS_TITLES = {
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 409: "Conflict",
  412: "Precondition Failed", 415: "Unsupported Media Type", 422: "Unprocessable Content", 429: "Too Many Requests",
  500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout",
};
// What "type" ends with when an HttpError has no code of its own.
const STATUS_SLUGS = {
  400: "bad-request", 401: "unauthorized", 403: "forbidden", 404: "not-found", 405: "method-not-allowed", 409: "conflict",
  412: "precondition-failed", 415: "unsupported-media-type", 422: "unprocessable", 429: "rate-limited",
  500: "internal-error", 502: "bad-gateway", 503: "unavailable", 504: "gateway-timeout",
};

// Describe a failure as { status, headers, body }.
//  - an HttpError: its status; its headers; detail = its message; type slug = its code with "_" turned into "-" (or STATUS_SLUGS[status]);
//    its details object (for example { errors }) is spread into the body, but the standard members always win
//  - anything else (a bug): status 500, no headers, detail "Something went wrong on our side. Quote the request id if you contact support.", type slug "internal-error"
//  body: { ...extras, type: PROBLEM_BASE + slug, title: STATUS_TITLES[status] ?? "Error", status, detail, instance: req.path, requestId: req.id ?? null }
function toProblem(err, req) {
  // TODO
}

// The error handler:
//  - if the response was already sent, do nothing
//  - turn a thrown non-Error (a string, an object...) into new Error(String(value)) first
//  - for anything that is NOT an HttpError, log it: req.log?.error("unhandled error", { error: err.message, stack: err.stack })
//  - set the status and the problem's headers, send the body as JSON, then set the content-type to "application/problem+json"
function problemHandler(err, req, res) {
  // TODO
}

// TODO: install it: app.onError(problemHandler);
`,
    solutionAdd: js`const PROBLEM_BASE = "https://dockline.example/problems/";
const STATUS_TITLES = {
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 409: "Conflict",
  412: "Precondition Failed", 415: "Unsupported Media Type", 422: "Unprocessable Content", 429: "Too Many Requests",
  500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout",
};
const STATUS_SLUGS = {
  400: "bad-request", 401: "unauthorized", 403: "forbidden", 404: "not-found", 405: "method-not-allowed", 409: "conflict",
  412: "precondition-failed", 415: "unsupported-media-type", 422: "unprocessable", 429: "rate-limited",
  500: "internal-error", 502: "bad-gateway", 503: "unavailable", 504: "gateway-timeout",
};

function toProblem(err, req) {
  const known = err instanceof HttpError;
  const status = known ? err.status : 500;
  const slug = known ? (err.code ? err.code.replaceAll("_", "-") : (STATUS_SLUGS[status] ?? "error")) : "internal-error";
  return {
    status,
    headers: known ? err.headers : {},
    body: {
      ...(known ? err.details : {}),
      type: PROBLEM_BASE + slug,
      title: STATUS_TITLES[status] ?? "Error",
      status,
      detail: known ? err.message : "Something went wrong on our side. Quote the request id if you contact support.",
      instance: req.path,
      requestId: req.id ?? null,
    },
  };
}

function problemHandler(err, req, res) {
  if (res.sent) return;
  const error = err instanceof Error ? err : new Error(String(err));
  if (!(error instanceof HttpError)) req.log?.error("unhandled error", { error: error.message, stack: error.stack });
  const problem = toProblem(error, req);
  res.status(problem.status);
  for (const [name, value] of Object.entries(problem.headers)) res.set(name, value);
  res.json(problem.body);
  res.set("content-type", "application/problem+json");
}

app.onError(problemHandler);`,
    explanation:
      "toProblem is a pure function from (thrown value, request) to a response description, which makes it trivially testable. It distinguishes designed failures (HttpError: status, message, headers and details are safe to expose) from bugs (a generic 500 that reveals nothing). The standard members are written last in the object literal so extra details can never overwrite them. problemHandler wraps it: it normalises non-Error throws, logs bugs with their real message and stack under the request id, and sets the problem+json content type after res.json because json() sets a generic one.",
    hints: [
      { id: "h1", title: "toProblem", content: "const known = err instanceof HttpError; const status = known ? err.status : 500. The slug: known ? (err.code ? err.code.replaceAll(\"_\", \"-\") : STATUS_SLUGS[status] ?? \"error\") : \"internal-error\". Return { status, headers: known ? err.headers : {}, body: { ...(known ? err.details : {}), type, title, status, detail, instance, requestId } } with the standard members after the spread." },
      { id: "h2", title: "The handler", content: "Start with if (res.sent) return. const error = err instanceof Error ? err : new Error(String(err)). Log only when !(error instanceof HttpError). Then res.status(...), copy headers with res.set, res.json(body), and finally res.set(\"content-type\", \"application/problem+json\")." },
      { id: "h3", title: "Install", content: "app.onError(problemHandler); replaces the default handler, so 404, 405, validation errors and crashes all come out in the same shape." },
    ],
    tests: [
      {
        id: "t1",
        description: "toProblem: designed failures keep their status, headers and details",
        assertionCode: T(js`const req = new HttpRequest({ url: "/stations/st-99" });
req.id = "req-000042";
const p = toProblem(new HttpError(404, "Station st-99 does not exist", { code: "not_found" }), req);
assertEqual(p.status, 404);
assertEqual(p.body, { type: "https://dockline.example/problems/not-found", title: "Not Found", status: 404, detail: "Station st-99 does not exist", instance: "/stations/st-99", requestId: "req-000042" });
const v = toProblem(new ValidationError([{ field: "a", code: "type", message: "a must be an integer" }]), req);
assertEqual(v.body.type, "https://dockline.example/problems/validation-failed", "underscores in codes become hyphens");
assertEqual(v.body.errors, [{ field: "a", code: "type", message: "a must be an integer" }], "details are spread into the body");
const limited = toProblem(new HttpError(429, "Slow down", { headers: { "retry-after": "3" } }), req);
assertEqual([limited.headers, limited.body.type, limited.body.title], [{ "retry-after": "3" }, "https://dockline.example/problems/rate-limited", "Too Many Requests"], "no code: the status decides the type; headers are carried");
const sneaky = toProblem(new HttpError(409, "x", { details: { status: 200, title: "Fine", type: "x", extra: 1 } }), req);
assertEqual([sneaky.body.status, sneaky.body.title, sneaky.body.extra], [409, "Conflict", 1], "details can add members but never replace the standard ones");
assertEqual(toProblem(new HttpError(418, "teapot"), req).body.type, "https://dockline.example/problems/error", "an unknown status falls back to a generic slug");
const anon = toProblem(new HttpError(404, "x"), new HttpRequest({ url: "/" }));
assertEqual(anon.body.requestId, null, "no request id yet: null");`),
      },
      {
        id: "t2",
        description: "toProblem: bugs reveal nothing",
        assertionCode: T(js`const req = new HttpRequest({ url: "/x" });
req.id = "req-000007";
const p = toProblem(new TypeError("Cannot read properties of undefined (reading 'password') at /srv/db.js:88"), req);
assertEqual(p.status, 500);
assertEqual(p.headers, {});
assertEqual([p.body.type, p.body.title], ["https://dockline.example/problems/internal-error", "Internal Server Error"]);
const text = JSON.stringify(p.body);
assert(!text.includes("password") && !text.includes("/srv"), "the exception message must not appear in the response");
assertEqual(p.body.requestId, "req-000007", "but the request id does, so support can find the log line");
assert(p.body.detail.length > 10, "there is still a human sentence");`),
      },
      {
        id: "t3",
        description: "problemHandler: content type, headers, logging and double sends",
        assertionCode: T(js`const entries = [];
const probe = new Logger({ sink: (e) => entries.push(e) });
const mk = () => { const req = new HttpRequest({ url: "/z" }); req.id = "req-000001"; req.log = probe; return req; };
let res = new HttpResponse();
problemHandler(new HttpError(405, "no", { code: "method_not_allowed", headers: { allow: "GET" } }), mk(), res);
let out = res.toPlain();
assertEqual([out.status, out.headers["content-type"], out.headers.allow], [405, "application/problem+json", "GET"]);
assertEqual(out.body.title, "Method Not Allowed");
assertEqual(entries.length, 0, "designed failures are not logged as unhandled errors");
res = new HttpResponse();
problemHandler(new Error("db exploded"), mk(), res);
assertEqual(res.toPlain().status, 500);
assertEqual(entries.length, 1, "a bug is logged once");
assertEqual([entries[0].level, entries[0].msg, entries[0].reqId, entries[0].error], ["error", "unhandled error", undefined, "db exploded"], "with its message");
assert(String(entries[0].stack).includes("db exploded"), "and its stack");
res = new HttpResponse();
problemHandler("just a string", mk(), res);
assertEqual([res.toPlain().status, entries.at(-1).error], [500, "just a string"], "non-Error throws are normalised");
res = new HttpResponse();
res.status(200).json({ done: true });
problemHandler(new Error("late"), mk(), res);
assertEqual(res.toPlain().body, { done: true }, "an already sent response is left alone");`),
      },
      {
        id: "t4",
        description: "Every error from the real app now has one shape",
        assertionCode: T(js`db.reset();
const check = (res, status, slug) => {
  assertEqual(res.status, status);
  assertEqual(res.headers["content-type"], "application/problem+json");
  assertEqual(res.body.type, "https://dockline.example/problems/" + slug);
  assertEqual(res.body.status, status);
  assertEqual(res.body.requestId, res.headers["x-request-id"], "the document and the header carry the same id");
  for (const key of ["title", "detail", "instance"]) assert(typeof res.body[key] === "string", key + " must be a string");
};
const missing = await call("GET", "/stations/st-99");
check(missing, 404, "not-found");
assertEqual(missing.body.instance, "/stations/st-99");
const route = await call("GET", "/no/such/route");
check(route, 404, "not-found");
const wrong = await call("POST", "/health/live");
check(wrong, 405, "method-not-allowed");
assertEqual(wrong.headers.allow, "GET");
const bad = await call("POST", "/stations", { body: { name: "x" } });
check(bad, 400, "validation-failed");
assert(bad.body.errors.length >= 2, "the validation errors are still there");
const conflict = await call("DELETE", "/stations/st-03");
check(conflict, 409, "station-not-empty");
const bom = await call("POST", "/stations", { body: "{nope", headers: { "content-type": "application/json" } });
check(bom, 400, "malformed-json");`),
      },
      {
        id: "t5",
        description: "A crash inside a handler: 500 problem, nothing leaked, logged under the request id",
        assertionCode: T(js`logBuffer.length = 0;
const original = db.stations.list;
db.stations.list = async () => { throw new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2"); };
let res;
try { res = await call("GET", "/stations"); } finally { db.stations.list = original; }
assertEqual(res.status, 500);
assertEqual(res.body.type, "https://dockline.example/problems/internal-error");
assert(!JSON.stringify(res).includes("hunter2") && !JSON.stringify(res).includes("ECONNREFUSED"), "no internals in the response");
const entry = recentLogs(10).find((e) => e.msg === "unhandled error");
assert(entry, "the real error must be in the log");
assertEqual(entry.reqId, res.headers["x-request-id"], "stamped with the same request id");
assert(entry.error.includes("ECONNREFUSED"), "the log has the real message");
const done = recentLogs(10).find((e) => e.msg === "request completed" && e.reqId === entry.reqId);
assertEqual([done.status, done.level], [500, "error"], "and the access log records the 500");
logBuffer.length = 0;`),
      },
    ],
    unlocks: ["api-problems"],
    checks: [
      {
        prompt: md`A client library wants to show a "please log in again" dialog. Which part of a problem document should it match on?`,
        question: { type: "choice", options: ["The detail text", "The type (or the status), which are stable identifiers", "The instance path", "The request id"], answer: 1 },
        explanation: md`¦type¦ and ¦status¦ are part of the contract. ¦detail¦ is prose for developers and can change in any release.`,
      },
      {
        prompt: md`A database driver throws ¦connect ECONNREFUSED 10.0.0.5:5432¦. What should the caller see and what should the log contain?`,
        question: {
          type: "choice",
          options: [
            "The caller sees the message so they can report it; the log is empty",
            "The caller sees a generic 500 problem with the request id; the log has the real message and stack under the same id",
            "The caller sees a 404",
            "Nothing is returned at all",
          ],
          answer: 1,
        },
        explanation: md`Internal addresses and messages are reconnaissance for an attacker and noise for a rider. The request id links the two worlds: public face generic, private log precise.`,
      },
    ],
  },

  // ───────────────────────────────────────── 8. Lists
  {
    id: "js-api-8-lists",
    title: "Filter, sort and page",
    minutes: 50,
    xp: 220,
    concepts: ["offset pagination", "cursor pagination", "filtering", "sort allow-lists", "limit caps", "opaque cursors"],
    learn: md`### Never return "everything"

A list endpoint that returns every record works on day one and takes the service down on day 400. Every list needs three things: **filters** (which records), **sorting** (what order) and **paging** (how many at a time, and how to get the next ones).

### Query-string design

~~~
GET /stations?zone=central&minCapacity=10&sort=-capacity,name&limit=5&offset=5
~~~

- Filters are named after the thing they filter. Each one has a type and an operator (¦zone¦ equals, ¦minCapacity¦ greater-or-equal, ¦name¦ contains).
- ¦sort¦ is a comma-separated list; a leading ¦-¦ means descending.
- ¦limit¦ has a **default** and a **hard cap**. A client asking for ¦limit=1000000¦ gets the cap, not an out-of-memory error.
- Everything is validated like a request body (your ¦validate¦ with ¦coerce: true¦), and unknown parameters are rejected, so a typo such as ¦?zon=central¦ is an error instead of silently returning the unfiltered list.

### Sorting: allow-list, stable, tie-broken

Sort only by fields you list. Letting a caller sort by any field is an information leak (sorting by ¦passwordHash¦ reveals order) and can be slow. Sorting must also be **stable and total**: when two records tie on the chosen keys, break the tie by ¦id¦, otherwise the same query can return pages in different orders and rows appear twice or never.

### Offset pagination

¦limit¦ and ¦offset¦ are easy to build and let users jump to page 7. The response says how big the whole result is: ¦page: { total, limit, offset }¦. Offsets have two weaknesses: deep offsets get slower (the database still walks the skipped rows), and if records are inserted or removed between requests, rows are **skipped or repeated**. Fine for small, slowly changing lists like stations.

### Cursor (keyset) pagination

For large or fast-changing collections use a **cursor**: "give me the ten records after *this* one". The server returns ¦next¦, an opaque token naming the last record seen, and the client sends it back as ¦after¦. The query becomes "records with id greater than X, in order, take limit+1" - always cheap, and unaffected by inserts earlier in the list. The trade-off is that you cannot jump to page 7.

Make the cursor **opaque**: encode it (here base64url of a small JSON object) so clients treat it as a token rather than building their own, and so you can change its contents later. Never trust it either: a cursor is client input and must be decoded defensively, answering ¦400 invalid_cursor¦ for garbage.

Fetch ¦limit + 1¦ records (or compare against the full list, as we do in memory) to know whether a next page exists. ¦next: null¦ means "that was the last page".

### Base64url

Base64 uses ¦+¦ and ¦/¦, which are awkward in URLs. **base64url** swaps them for ¦-¦ and ¦_¦ and drops the ¦=¦ padding. In JavaScript: bytes to a binary string with ¦String.fromCharCode¦, ¦btoa¦, then fix the three characters. The reverse restores the padding. Lesson 9 reuses these helpers for tokens.

### Common mistakes

- No cap on ¦limit¦.
- Sorting without a tie-breaker.
- Counting ¦total¦ with a different filter than the page used.
- Exposing a cursor that is just the raw database id, so clients start doing arithmetic on it.
- Accepting unknown query parameters.`,
    mission: md`The kiosks want only the waterfront stations, biggest first, five at a time. The fleet screen walks through hundreds of bikes while riders keep returning them. One needs offsets and totals; the other needs a cursor that never skips or repeats a bike.

Teach your API to list properly. The control room's explorer pages through stations by offset and bikes by cursor against your endpoints.`,
    tasks: [
      "base64url helpers: bytesToBase64Url, textToBase64Url, base64UrlToText",
      "parseListQuery(query, spec): validate with coerce, cap the limit, parse sort against an allow-list, build filters",
      "applyFilters, sortItems (stable with id tie-break) and paginateOffset giving { items, page: { total, limit, offset } }",
      "encodeCursor / decodeCursor and paginateAfter giving { items, next }; GET /bikes with filters and a cursor; stationListView upgraded",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: filtering, sorting and pagination.

// ── base64url (also used by lesson 9) ──
// Bytes -> base64url text: btoa(String.fromCharCode(...bytes)), then "+" -> "-", "/" -> "_" and strip the "=" padding.
function bytesToBase64Url(bytes) {
  // TODO
}
function textToBase64Url(text) {
  // TODO: encode the text as UTF-8 bytes (TextEncoder) first
}
// Reverse: restore + / and the padding, atob, then decode the bytes as UTF-8 (TextDecoder). May throw on garbage.
function base64UrlToText(text) {
  // TODO
}

// A natural id order: shorter ids first, then alphabetical ("bk-999" < "bk-1000").
const byId = (a, b) => a.id.length - b.id.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// A spec says what a list endpoint accepts.
const STATION_QUERY = {
  filters: {
    zone: { type: "string", oneOf: ["waterfront", "old-town", "central", "park", "east", "campus"], field: "zone", op: "eq" },
    minCapacity: { type: "integer", min: 0, field: "capacity", op: "gte" },
    name: { type: "string", max: 40, field: "name", op: "contains" },
  },
  sortable: ["name", "capacity", "zone"],
  defaultSort: [{ field: "name", dir: 1 }],
  defaultLimit: 10,
  maxLimit: 50,
};
const BIKE_QUERY = {
  cursor: true, // cursor paging: after / limit, no sort, no offset
  filters: {
    stationId: { type: "string", max: 20, field: "stationId", op: "eq" },
    kind: { type: "string", oneOf: ["classic", "electric"], field: "kind", op: "eq" },
    status: { type: "string", oneOf: ["available", "rented", "service"], field: "status", op: "eq" },
  },
  defaultLimit: 10,
  maxLimit: 50,
};

// Validate a request's query against a spec and return
//   { filters: [{ field, op, value }], sort: [{ field, dir }], limit, offset, after }
// - build a validate() schema from spec.filters (type / oneOf / min / max) plus limit (integer >= 1),
//   and either after (string, cursor specs) or offset (integer >= 0) and sort (string, offset specs); run it on { ...query } with { coerce: true }
//   (unknown parameters become "unknown" errors, repeated parameters become type errors)
// - sort "-capacity,name" -> [{ field: "capacity", dir: -1 }, { field: "name", dir: 1 }]; a field not in spec.sortable adds
//   { field: "sort", code: "oneOf", message: "sort can only use: name, capacity, zone" }; no sort -> spec.defaultSort
// - limit defaults to spec.defaultLimit and is capped at spec.maxLimit; offset defaults to 0
// - any error: throw new ValidationError(errors) (all of them at once)
function parseListQuery(query, spec) {
  // TODO
}

// Keep the items that satisfy every filter. Ops: eq (===), gte (>=), lte (<=), contains (case-insensitive substring).
function applyFilters(items, filters) {
  // TODO
}

// A sorted COPY. Compare the sort keys in order (strings with < and >, numbers numerically, dir flips the sign); ties fall back to byId.
function sortItems(items, sort) {
  // TODO
}

// { items: the slice, page: { total: items.length, limit, offset } }
function paginateOffset(items, { limit, offset }) {
  // TODO
}

// A cursor is base64url of JSON like {"id":"bk-112"}.
function encodeCursor(id) {
  // TODO
}
// Back to the id. Anything that is not a valid cursor: throw new HttpError(400, "The cursor is not valid. Use the next value from a previous response.", { code: "invalid_cursor" })
function decodeCursor(text) {
  // TODO
}

// Keyset paging over items in byId order: skip everything up to and including afterId (when given), take limit.
//   { items: [...], next: encodeCursor(lastIdOfThisPage) or null when there is nothing after this page }
function paginateAfter(items, { afterId, limit }) {
  // TODO
}

// Switch the stations list to filters + sorting + offset pages (replace the seam from lesson 5).
// TODO: stationListView = (req, items) => ...

// GET /bikes: 200 { items, next } filtered by the query and paged with the cursor.
router.get("/bikes", async function listBikes(req, res) {
  // TODO
});
`,
    solutionAdd: js`function bytesToBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function textToBase64Url(text) {
  return bytesToBase64Url(new TextEncoder().encode(text));
}
function base64UrlToText(text) {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

const byId = (a, b) => a.id.length - b.id.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const STATION_QUERY = {
  filters: {
    zone: { type: "string", oneOf: ["waterfront", "old-town", "central", "park", "east", "campus"], field: "zone", op: "eq" },
    minCapacity: { type: "integer", min: 0, field: "capacity", op: "gte" },
    name: { type: "string", max: 40, field: "name", op: "contains" },
  },
  sortable: ["name", "capacity", "zone"],
  defaultSort: [{ field: "name", dir: 1 }],
  defaultLimit: 10,
  maxLimit: 50,
};
const BIKE_QUERY = {
  cursor: true,
  filters: {
    stationId: { type: "string", max: 20, field: "stationId", op: "eq" },
    kind: { type: "string", oneOf: ["classic", "electric"], field: "kind", op: "eq" },
    status: { type: "string", oneOf: ["available", "rented", "service"], field: "status", op: "eq" },
  },
  defaultLimit: 10,
  maxLimit: 50,
};

function parseListQuery(query, spec) {
  const schema = { limit: { type: "integer", min: 1 } };
  if (spec.cursor) schema.after = { type: "string", max: 200 };
  else {
    schema.offset = { type: "integer", min: 0 };
    schema.sort = { type: "string", max: 100 };
  }
  for (const [param, rule] of Object.entries(spec.filters)) {
    schema[param] = { type: rule.type };
    for (const key of ["oneOf", "min", "max"]) if (rule[key] !== undefined) schema[param][key] = rule[key];
  }
  const checked = validate(schema, { ...query }, { coerce: true });
  const errors = [...checked.errors];
  const value = checked.value ?? {};
  let sort = [];
  if (!spec.cursor && typeof value.sort === "string") {
    for (const part of value.sort.split(",").filter(Boolean)) {
      const field = part.replace(/^[-+]/, "");
      if (spec.sortable.includes(field)) sort.push({ field, dir: part.startsWith("-") ? -1 : 1 });
      else if (!errors.some((e) => e.field === "sort")) errors.push({ field: "sort", code: "oneOf", message: ¦sort can only use: \${spec.sortable.join(", ")}¦ });
    }
  }
  if (errors.length > 0) throw new ValidationError(errors);
  const filters = Object.entries(spec.filters)
    .filter(([param]) => value[param] !== undefined)
    .map(([param, rule]) => ({ field: rule.field, op: rule.op, value: value[param] }));
  return {
    filters,
    sort: sort.length > 0 ? sort : (spec.defaultSort ?? []),
    limit: Math.min(value.limit ?? spec.defaultLimit, spec.maxLimit),
    offset: value.offset ?? 0,
    after: value.after,
  };
}

function applyFilters(items, filters) {
  return items.filter((item) =>
    filters.every(({ field, op, value }) => {
      const actual = item[field];
      if (op === "eq") return actual === value;
      if (op === "gte") return actual >= value;
      if (op === "lte") return actual <= value;
      if (op === "contains") return String(actual).toLowerCase().includes(String(value).toLowerCase());
      return true;
    }),
  );
}

function sortItems(items, sort) {
  return [...items].sort((a, b) => {
    for (const { field, dir } of sort) {
      if (a[field] < b[field]) return -dir;
      if (a[field] > b[field]) return dir;
    }
    return byId(a, b);
  });
}

function paginateOffset(items, { limit, offset }) {
  return { items: items.slice(offset, offset + limit), page: { total: items.length, limit, offset } };
}

function encodeCursor(id) {
  return textToBase64Url(JSON.stringify({ id }));
}
function decodeCursor(text) {
  try {
    const parsed = JSON.parse(base64UrlToText(text));
    if (typeof parsed?.id !== "string") throw new Error("no id");
    return parsed.id;
  } catch {
    throw new HttpError(400, "The cursor is not valid. Use the next value from a previous response.", { code: "invalid_cursor" });
  }
}

function paginateAfter(items, { afterId, limit }) {
  const ordered = [...items].sort(byId);
  const rest = afterId === undefined ? ordered : ordered.filter((item) => byId(item, { id: afterId }) > 0);
  const page = rest.slice(0, limit);
  return { items: page, next: rest.length > limit ? encodeCursor(page[page.length - 1].id) : null };
}

stationListView = (req, items) => {
  const q = parseListQuery(req.query, STATION_QUERY);
  return paginateOffset(sortItems(applyFilters(items, q.filters), q.sort), q);
};

router.get("/bikes", async function listBikes(req, res) {
  const q = parseListQuery(req.query, BIKE_QUERY);
  const bikes = applyFilters(await db.bikes.list(), q.filters);
  res.json(paginateAfter(bikes, { afterId: q.after === undefined ? undefined : decodeCursor(q.after), limit: q.limit }));
});`,
    explanation:
      "The base64url helpers are the usual btoa/atob dance with three character swaps and padding handling, going through UTF-8 bytes so any text works. parseListQuery reuses the validator from lesson 6 (coerce turns the query strings into numbers) and then handles the one thing a schema cannot express, the comma-separated sort list checked against an allow-list. Filtering, sorting and slicing are small pure functions; sorting always ends in byId so equal records have a fixed order. The cursor stores the last id seen, and paginateAfter filters 'after that id' and looks one item past the page to decide whether to hand back a next cursor, which is what makes it stable when bikes are added or removed between requests.",
    hints: [
      { id: "h1", title: "base64url", content: "bytesToBase64Url: btoa(String.fromCharCode(...bytes)).replaceAll(\"+\", \"-\").replaceAll(\"/\", \"_\").replace(/=+$/, \"\"). The reverse: swap the characters back, text.padEnd(Math.ceil(text.length / 4) * 4, \"=\"), atob, then new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))." },
      { id: "h2", title: "parseListQuery", content: "Build schema = { limit: { type: \"integer\", min: 1 }, ... } and copy each filter's type / oneOf / min / max. Run validate(schema, { ...query }, { coerce: true }). Split value.sort on commas; for each part strip a leading - or + with replace(/^[-+]/, \"\"), check spec.sortable.includes(field) and push { field, dir }. Throw new ValidationError(errors) if there are any; otherwise return limit: Math.min(value.limit ?? spec.defaultLimit, spec.maxLimit)." },
      { id: "h3", title: "Cursor paging", content: "paginateAfter: const ordered = [...items].sort(byId); const rest = afterId === undefined ? ordered : ordered.filter((it) => byId(it, { id: afterId }) > 0); const page = rest.slice(0, limit); next is encodeCursor(page.at(-1).id) when rest.length > limit, else null. decodeCursor wraps base64UrlToText + JSON.parse in try/catch and throws the invalid_cursor HttpError." },
    ],
    tests: [
      {
        id: "t1",
        description: "base64url: round trips, URL-safe, no padding",
        assertionCode: T(js`assertEqual(textToBase64Url("hello"), "aGVsbG8", "no = padding");
assertEqual(base64UrlToText("aGVsbG8"), "hello");
const tricky = bytesToBase64Url(new Uint8Array([251, 255, 254]));
assertEqual(tricky, "-__-", "+ and / become - and _");
for (const text of ["", "a", "ab", "abc", '{"id":"bk-112"}', "Café ☕ ünïcode"]) {
  const enc = textToBase64Url(text);
  assert(/^[A-Za-z0-9_-]*$/.test(enc), "URL safe alphabet only: " + enc);
  assertEqual(base64UrlToText(enc), text, "round trip of " + JSON.stringify(text));
}`),
      },
      {
        id: "t2",
        description: "parseListQuery: defaults, coercion, caps and sort parsing",
        assertionCode: T(js`let q = parseListQuery({}, STATION_QUERY);
assertEqual(q, { filters: [], sort: [{ field: "name", dir: 1 }], limit: 10, offset: 0, after: undefined }, "defaults");
q = parseListQuery({ zone: "central", minCapacity: "10", limit: "3", offset: "6", sort: "-capacity,name" }, STATION_QUERY);
assertEqual(q.filters, [{ field: "zone", op: "eq", value: "central" }, { field: "capacity", op: "gte", value: 10 }], "typed filters in schema order");
assertEqual(q.sort, [{ field: "capacity", dir: -1 }, { field: "name", dir: 1 }]);
assertEqual([q.limit, q.offset], [3, 6], "numbers, not strings");
assertEqual(parseListQuery({ limit: "100000" }, STATION_QUERY).limit, 50, "the limit is capped, not rejected");
assertEqual(parseListQuery({ sort: "+zone" }, STATION_QUERY).sort, [{ field: "zone", dir: 1 }]);
const cursor = parseListQuery({ after: "abc", kind: "electric" }, BIKE_QUERY);
assertEqual([cursor.after, cursor.filters, cursor.sort], ["abc", [{ field: "kind", op: "eq", value: "electric" }], []], "cursor specs have no sort");`),
      },
      {
        id: "t3",
        description: "parseListQuery: bad queries are 400s with every problem listed",
        assertionCode: T(js`const fail = (query, spec = STATION_QUERY) => assertThrows(() => parseListQuery(query, spec), "validation").errors;
assertEqual(fail({ limit: "abc" }).map((e) => e.field + ":" + e.code), ["limit:type"]);
assertEqual(fail({ limit: "0" }).map((e) => e.code), ["min"]);
assertEqual(fail({ offset: "-1" }).map((e) => e.field), ["offset"]);
assertEqual(fail({ zon: "central" }).map((e) => e.field + ":" + e.code), ["zon:unknown"], "a typo is an error, not an ignored filter");
assertEqual(fail({ zone: "moon" }).map((e) => e.code), ["oneOf"]);
const sort = fail({ sort: "passwordHash" });
assertEqual([sort[0].field, sort[0].code], ["sort", "oneOf"]);
assert(sort[0].message.includes("name, capacity, zone"), "the message lists the sortable fields: " + sort[0].message);
assertEqual(fail({ limit: "x", zone: "moon", extra: "1", sort: "nope" }).length, 4, "all problems at once");
assertEqual(fail({ zone: ["central", "east"] }).map((e) => e.code), ["type"], "a repeated parameter is a type error");
assertEqual(fail({ offset: "5" }, BIKE_QUERY).map((e) => e.code), ["unknown"], "bikes use a cursor, not an offset");`),
      },
      {
        id: "t4",
        description: "applyFilters, sortItems and paginateOffset",
        assertionCode: T(js`const items = [
  { id: "a-1", n: 5, name: "Alpha Dock" }, { id: "a-2", n: 9, name: "beta dock" }, { id: "a-3", n: 5, name: "Gamma" }, { id: "a-10", n: 9, name: "Delta Dock" },
];
assertEqual(applyFilters(items, [{ field: "n", op: "gte", value: 9 }]).map((i) => i.id), ["a-2", "a-10"]);
assertEqual(applyFilters(items, [{ field: "n", op: "lte", value: 5 }]).map((i) => i.id), ["a-1", "a-3"]);
assertEqual(applyFilters(items, [{ field: "name", op: "contains", value: "DOCK" }]).map((i) => i.id), ["a-1", "a-2", "a-10"], "contains ignores case");
assertEqual(applyFilters(items, [{ field: "n", op: "eq", value: 5 }, { field: "name", op: "eq", value: "Gamma" }]).map((i) => i.id), ["a-3"], "all filters must hold");
assertEqual(applyFilters(items, []).length, 4);
const copy = [...items];
assertEqual(sortItems(items, [{ field: "n", dir: -1 }]).map((i) => i.id), ["a-2", "a-10", "a-1", "a-3"], "descending by n; ties fall back to id order (a-2 before a-10)");
assertEqual(sortItems(items, [{ field: "name", dir: 1 }]).map((i) => i.id), ["a-1", "a-10", "a-3", "a-2"], "plain string order is case-sensitive: capitals first");
assertEqual(items.map((i) => i.id), copy.map((i) => i.id), "the input array is not reordered");
assertEqual(paginateOffset(items, { limit: 2, offset: 1 }), { items: items.slice(1, 3), page: { total: 4, limit: 2, offset: 1 } });
assertEqual(paginateOffset(items, { limit: 2, offset: 10 }), { items: [], page: { total: 4, limit: 2, offset: 10 } }, "past the end: empty page, honest total");`),
      },
      {
        id: "t5",
        description: "Cursors are opaque, validated and give stable pages",
        assertionCode: T(js`const c = encodeCursor("bk-112");
assert(/^[A-Za-z0-9_-]+$/.test(c) && !c.includes("bk-112"), "an opaque URL-safe token, not the raw id: " + c);
assertEqual(decodeCursor(c), "bk-112");
for (const junk of ["", "!!!", "bm90IGpzb24", textToBase64Url('{"no":"id"}'), textToBase64Url('{"id":5}'), textToBase64Url("[1]")]) {
  const err = assertThrows(() => decodeCursor(junk), "cursor");
  assertEqual([err.status, err.code], [400, "invalid_cursor"], "junk cursor " + JSON.stringify(junk));
}
const bikes = Array.from({ length: 12 }, (_, i) => ({ id: "bk-" + (101 + i) }));
const seen = [];
let afterId;
let pages = 0;
for (;;) {
  const page = paginateAfter(bikes, { afterId, limit: 5 });
  seen.push(...page.items.map((b) => b.id));
  pages++;
  if (!page.next) break;
  afterId = decodeCursor(page.next);
}
assertEqual(seen, bikes.map((b) => b.id), "walking all pages visits every item once, in order");
assertEqual(pages, 3);
assertEqual(paginateAfter(bikes, { limit: 12 }).next, null, "a page that holds everything has no next");
const first = paginateAfter(bikes, { limit: 5 });
bikes.unshift({ id: "bk-100" });
const second = paginateAfter(bikes, { afterId: decodeCursor(first.next), limit: 5 });
assertEqual(second.items.map((b) => b.id), ["bk-106", "bk-107", "bk-108", "bk-109", "bk-110"], "an insert before the cursor shifts nothing: no repeats, no skips");
assertEqual(paginateAfter([{ id: "bk-999" }, { id: "bk-1000" }], { limit: 1 }).items[0].id, "bk-999", "shorter ids sort first");`),
      },
      {
        id: "t6",
        description: "GET /stations: filters, sorting and offset pages",
        assertionCode: T(js`db.reset();
const central = await call("GET", "/stations?zone=central&sort=-capacity");
assertEqual(central.status, 200);
assertEqual(central.body.items.map((s) => s.id), ["st-08", "st-03"], "Rail Hall (20) before Tram Depot (14)");
assertEqual(central.body.page, { total: 2, limit: 10, offset: 0 });
const page2 = await call("GET", "/stations?sort=name&limit=3&offset=3");
assertEqual(page2.body.items.map((s) => s.name), ["Lantern Bridge", "Mill Lane", "Rail Hall"], "alphabetical, second page of three");
assertEqual(page2.body.page, { total: 8, limit: 3, offset: 3 });
const big = await call("GET", "/stations?minCapacity=12&sort=capacity,name");
assertEqual(big.body.items.map((s) => s.capacity), [12, 12, 14, 16, 20]);
assertEqual((await call("GET", "/stations?limit=9999")).body.page.limit, 50, "limit is capped at 50");
assertEqual((await call("GET", "/stations?name=gate")).body.items.map((s) => s.id), ["st-01"]);
const bad = await call("GET", "/stations?sort=secret&limit=abc");
assertEqual(bad.status, 400);
assertEqual(bad.body.errors.map((e) => e.field).sort(), ["limit", "sort"]);
assertEqual((await call("GET", "/stations")).body.items.length, 8, "the default page is everything while there are fewer than ten stations");`),
      },
      {
        id: "t7",
        description: "GET /bikes: filters and a cursor that walks the whole fleet",
        assertionCode: T(js`db.reset();
const first = await call("GET", "/bikes?kind=electric&limit=4");
assertEqual(first.status, 200);
assertEqual(first.body.items.map((b) => b.id), ["bk-102", "bk-104", "bk-106", "bk-108"]);
assert(typeof first.body.next === "string", "there is a next cursor");
const ids = [...first.body.items.map((b) => b.id)];
let next = first.body.next;
let guard = 0;
while (next && guard++ < 10) {
  const page = await call("GET", "/bikes?kind=electric&limit=4&after=" + next);
  assertEqual(page.status, 200);
  ids.push(...page.body.items.map((b) => b.id));
  next = page.body.next;
}
assertEqual(ids, ["bk-102", "bk-104", "bk-106", "bk-108", "bk-111", "bk-112", "bk-114", "bk-116", "bk-118", "bk-121", "bk-123"], "eleven electric bikes, once each");
assertEqual(next, null, "the last page has next: null");
const service = await call("GET", "/bikes?status=service");
assertEqual(service.body.items.map((b) => b.id), ["bk-107"]);
assertEqual(service.body.next, null);
assertEqual((await call("GET", "/bikes?stationId=st-03")).body.items.length, 5);
const junk = await call("GET", "/bikes?after=not-a-cursor");
assertEqual([junk.status, junk.body.type], [400, "https://dockline.example/problems/invalid-cursor"]);
assertEqual((await call("GET", "/bikes?kind=tandem")).status, 400);
assertEqual((await call("GET", "/bikes")).body.items.length, 10, "default limit is 10");`),
      },
    ],
    unlocks: ["api-paging"],
    checks: [
      {
        prompt: md`While a client walks through ¦/stations?limit=5&offset=5¦, two new stations are inserted at the start of the sorted list. What happens on the next page request?`,
        question: {
          type: "choice",
          options: ["Nothing: pages are snapshots", "Two rows from the previous page appear again, because everything shifted", "The server returns 409", "Two rows are lost forever"],
          answer: 1,
        },
        explanation: md`Offsets count rows from the start, so inserting before the current position pushes rows to later pages. Cursors name the last row seen and are immune to that shift.`,
      },
      {
        prompt: md`Why must sorting add a final tie-break on ¦id¦?`,
        question: {
          type: "choice",
          options: [
            "Ids are the fastest field to compare",
            "Without a total order, records that tie can come back in a different order on each request, so pages can repeat or miss rows",
            "Because sort is only allowed on ids",
            "To hide the sort field from clients",
          ],
          answer: 1,
        },
        explanation: md`Paging assumes the same query always yields the same order. A unique tie-breaker makes the order total.`,
      },
    ],
  },
];
