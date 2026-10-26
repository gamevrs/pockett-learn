import { bearer, ensureToken, IPS, req, SEED_BIKE_IDS, stationIds, tokenFor, availableBikes } from "./access";
import type { DocklineDriver } from "./driver";
import { pick } from "./util";
import { RIDERS } from "./sim-data";
import type { RawRequest } from "./types";

/**
 * The traffic mix. Each tick picks one realistic request, but only from what the learner's
 * unlocked features can handle: no tokens before api-auth, no rentals before api-idempotency, and
 * so on. Weights are relative; the scheduled scenarios (bursts, outages, shutdowns) live in
 * actions.ts.
 */

type Planned = { req: RawRequest; label: string };
type Candidate = { w: number; make: () => Promise<Planned | null> | Planned | null };

const GRAPH_SAMPLES = [
  '{ stations(zone: "central") { name availableBikes } }',
  '{ station(id: "st-03") { name bikes(kind: "electric") { id battery } } }',
  "{ bikes(status: \"available\", limit: 3) { id kind station { name } } }",
];

const BAD_STATIONS = [
  { name: "", zone: "central", capacity: 12 },
  { name: "Pier Nine", zone: "moon", capacity: -3 },
  { name: "Quay Side", zone: "east", capacity: "twelve" },
];

const MISSES: [string, string][] = [
  ["GET", "/nope"],
  ["GET", "/v2/stations"],
  ["PUT", "/stations/st-01"],
  ["DELETE", "/health/live"],
];

export async function planNext(d: DocklineDriver): Promise<Planned | null> {
  const snap = d.getSnapshot();
  const life = snap.hooks.lifecycle?.state;
  const ip = () => (d.has("api-ratelimit") ? pickWeighted([[IPS[0], 4], [IPS[1], 4], [IPS[2], 1]]) : IPS[0]);
  const ids = () => stationIds(d);
  const get = (url: string, label: string, extra: Record<string, string> = {}): Planned => ({ req: req("GET", url, { ip: ip(), headers: extra }), label });
  const as = async (riderId: string, method: string, url: string, label: string, body?: unknown, headers: Record<string, string> = {}): Promise<Planned | null> => {
    if (!d.has("api-auth")) return null;
    const token = await ensureToken(d, riderId);
    if (!token) return null;
    return { req: req(method, url, { ip: ip(), body, headers: { ...bearer(token), ...headers } }), label };
  };

  if (life && life !== "running") return Math.random() < 0.4 ? get("/health/ready", "probe") : null;
  if (d.has("api-stations") && snap.board.stations.length === 0 && d.tickN % 3 === 1) return { req: req("GET", "/stations?limit=50", { ip: ip() }), label: "board-stations" };

  const c: Candidate[] = [
    { w: 3, make: () => get("/health/live", "probe") },
    { w: 2, make: () => get("/health/ready", "probe") },
  ];
  if (d.has("api-routes")) {
    c.push({ w: 3, make: () => get(`/stations/${pick(ids())}`, "browse") });
    c.push({ w: 2, make: () => get("/stations?limit=3", "browse") });
    c.push({ w: 1, make: () => { const [m, u] = pick(MISSES); return { req: req(m, u, { ip: ip() }), label: "miss" }; } });
  }
  if (d.has("api-stations")) {
    c.push({ w: 4, make: () => get(`/stations/${pick(ids())}/bikes`, "board") });
    c.push({ w: 1, make: () => ({ req: req("GET", "/stations?limit=50", { ip: ip() }), label: "board-stations" }) });
  }
  if (d.has("api-validation")) {
    c.push({ w: 1, make: async () => {
      const token = d.has("api-auth") ? await ensureToken(d, "u-root") : null;
      if (d.has("api-auth") && !token) return null;
      return { req: req("POST", "/stations", { ip: ip(), body: pick(BAD_STATIONS), headers: bearer(token) }), label: "invalid" };
    } });
  }
  if (d.has("api-problems")) {
    c.push({ w: 1, make: () => get("/stations/st-99", "miss") });
    c.push({ w: 0.6, make: () => get("/bikes?kind=tandem", "invalid") });
    c.push({ w: 0.4, make: async () => {
      const token = d.has("api-auth") ? await ensureToken(d, "u-root") : null;
      return { req: req("POST", "/stations", { ip: ip(), body: "{not json", headers: { "content-type": "application/json", ...bearer(token) } }), label: "invalid" };
    } });
  }
  if (d.has("api-paging")) {
    c.push({ w: 1.4, make: () => get(`/stations?zone=central&sort=-capacity,name&limit=1&offset=${Math.floor(Math.random() * 2)}`, "browse") });
    c.push({ w: 1.2, make: () => get("/bikes?limit=5", "browse") });
    c.push({ w: 1, make: () => get(`/bikes?stationId=${pick(["st-03", "st-07", "st-01"])}&kind=electric`, "browse") });
  }
  if (d.has("api-auth")) {
    const stale = RIDERS.filter((r) => !tokenFor(d, r.id));
    c.push({ w: stale.length > 0 ? 3 : 0.8, make: () => { const r = stale.length > 0 ? pick(stale) : pick(RIDERS); return { req: req("POST", "/auth/token", { ip: "10.0.2.1", body: { riderId: r.id, pin: r.pin } }), label: "login" }; } });
    c.push({ w: 0.3, make: () => ({ req: req("POST", "/auth/token", { ip: "10.0.2.1", body: { riderId: "u-ana", pin: "0000" } }), label: "login" }) });
  }
  if (d.has("api-authz")) {
    c.push({ w: 2.5, make: () => as(pick(["u-ana", "u-ben", "u-mia", "u-root"]), "GET", "/rentals?limit=3", "rentals") });
    c.push({ w: 1.5, make: () => {
      const known = d.knownRentals;
      const mine = known.length > 0 ? pick(known) : { id: "rt-1001", riderId: "u-ana" };
      const asId = Math.random() < 0.6 ? mine.riderId : pick(["u-ana", "u-ben"]);
      return as(asId, "GET", `/rentals/${mine.id}`, "rentals");
    } });
    c.push({ w: 0.5, make: () => as("u-ana", "POST", "/stations", "denied", { name: "Test Dock", zone: "park", capacity: 8 }) });
    c.push({ w: 0.5, make: () => as(pick(["u-ben", "u-mia"]), "PATCH", "/stations/st-01", "denied", { name: "Harbour Gate" }) });
  }
  if (d.has("api-idempotency")) {
    if (d.openRentals.length < 3) {
      c.push({ w: 1.6, make: async () => {
        const riderId = pick(["u-ana", "u-ben"]);
        const token = await ensureToken(d, riderId);
        if (!token) return null;
        const bikeId = pick(availableBikes(d).length ? availableBikes(d) : SEED_BIKE_IDS);
        return { req: req("POST", "/rentals", { ip: ip(), body: { bikeId }, headers: { ...bearer(token), "idempotency-key": `rent-${Math.random().toString(36).slice(2, 8)}` } }), label: "rent" };
      } });
    }
    if (d.openRentals.length > 0) {
      c.push({ w: 2.4, make: async () => {
        const open = d.openRentals.find((r) => d.tickN - r.tick >= 2);
        if (!open) return null;
        const token = await ensureToken(d, open.riderId || "u-ana");
        if (!token) return null;
        d.openRentals = d.openRentals.filter((r) => r.id !== open.id);
        return { req: req("POST", `/rentals/${open.id}/return`, { ip: ip(), body: { stationId: pick(ids()) }, headers: bearer(token) }), label: "return" };
      } });
    }
    const row = snap.ledger[snap.ledger.length - 1];
    if (row && row.attempts < 2 && row.status === 201) {
      c.push({ w: 1, make: async () => {
        const token = await ensureToken(d, row.riderId || "u-ana");
        if (!token) return null;
        return { req: req("POST", "/rentals", { ip: ip(), body: { bikeId: row.bikeId }, headers: { ...bearer(token), "idempotency-key": row.key } }), label: "retry" };
      } });
    }
  }
  if (d.has("api-cache")) {
    c.push({ w: 2.5, make: () => get("/stations/st-03", "revalidate") });
    c.push({ w: 1, make: () => get("/stations?limit=3", "revalidate") });
  }
  if (d.has("api-retry")) c.push({ w: 1.6, make: () => get(`/stations/${pick(ids())}/forecast`, "forecast") });
  if (d.has("api-graph")) {
    c.push({ w: 1.2, make: () => ({ req: req("POST", "/graphql", { ip: ip(), body: { query: pick(GRAPH_SAMPLES) } }), label: "graph" }) });
  }

  const total = c.reduce((n, x) => n + x.w, 0);
  for (let attempt = 0; attempt < 4; attempt++) {
    let r = Math.random() * total;
    const chosen = c.find((x) => (r -= x.w) < 0) ?? c[0];
    const planned = await chosen.make();
    if (planned) return conditional(d, planned);
  }
  return null;
}

/** Revalidate cached resources: send the ETag we saw, the way a client with a cache would. */
function conditional(d: DocklineDriver, p: Planned): Planned {
  if (d.has("api-cache") && p.req.method === "GET" && Math.random() < 0.6) {
    const tag = d.etags.get(p.req.url);
    if (tag) return { ...p, req: { ...p.req, headers: { ...p.req.headers, "if-none-match": tag } } };
  }
  return p;
}

function pickWeighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((n, [, w]) => n + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of items) if ((r -= w) < 0) return item;
  return items[0][0];
}
