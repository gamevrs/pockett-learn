import { availableBikes, bearer, ensureToken, IPS, login, once, req, SEED_STATION_IDS, stationIds, tokenFor } from "./access";
import type { DocklineDriver } from "./driver";
import type { Exchange } from "./state";
import { RIDERS } from "./sim-data";
import { isRecord, readBreaker, readGraph, readShutdown, readSuite, type GraphDocument, type RawRequest } from "./types";
import { pick, sleep, tamperToken } from "./util";

/** Everything the panels' buttons do, and the scenarios autoplay runs now and then. */

const FORECAST = (d: DocklineDriver) => `/stations/${pick(stationIds(d))}/forecast`;

// ───────────────────────── guard ─────────────────────────

export async function tamper(d: DocklineDriver, riderId: string) {
  const token = tokenFor(d, riderId) ?? (await ensureToken(d, riderId, "user"));
  if (!token) return;
  const ex = await d.send(req("GET", "/rentals?limit=1", { headers: bearer(tamperToken(token)), ip: "10.0.2.2" }), "tamper");
  d.update(() => ({ tampered: { riderId, status: ex.status } }));
}

export async function burst(d: DocklineDriver, ip: string = IPS[2], n = 16) {
  await once(d, `burst:${ip}`, async () => {
    const sent: Promise<Exchange>[] = [];
    for (let i = 0; i < n && !d.disposed; i++) {
      sent.push(d.send(req("GET", "/stations?limit=1", { ip }), "burst"));
      await sleep(45);
    }
    await Promise.all(sent);
  });
}

export async function rentBike(d: DocklineDriver, riderId = "u-ana", key?: string, bikeId?: string): Promise<Exchange | null> {
  const token = await ensureToken(d, riderId, "user");
  if (!token) return null;
  const bike = bikeId ?? pick(availableBikes(d));
  return d.send(req("POST", "/rentals", { body: { bikeId: bike }, headers: { ...bearer(token), "idempotency-key": key ?? `rent-${Math.random().toString(36).slice(2, 8)}` } }), "rent");
}

/** Send the same POST /rentals twice with one key, as an impatient double tap would. */
export async function doubleTap(d: DocklineDriver, riderId = "u-ben") {
  await once(d, "double", async () => {
    const key = `tap-${Math.random().toString(36).slice(2, 7)}`;
    const bike = pick(availableBikes(d));
    await rentBike(d, riderId, key, bike);
    await sleep(120);
    await rentBike(d, riderId, key, bike);
  });
}

/** Re-use the newest key with a different bike: the server must refuse with 422. */
export async function reuseKey(d: DocklineDriver) {
  await once(d, "reuse", async () => {
    const row = [...d.getSnapshot().ledger].reverse().find((r) => r.status === 201 || r.replay);
    if (!row) {
      const first = await rentBike(d, "u-ana");
      if (!first || first.status !== 201) return;
    }
    const base = row ?? d.getSnapshot().ledger[d.getSnapshot().ledger.length - 1];
    if (!base) return;
    const other = availableBikes(d).find((b) => b !== base.bikeId) ?? base.bikeId;
    await rentBike(d, base.riderId || "u-ana", base.key, other);
  });
}

export async function returnOpenRentals(d: DocklineDriver) {
  for (const r of [...d.openRentals]) {
    const token = await ensureToken(d, r.riderId || "u-ana");
    if (!token) continue;
    d.openRentals = d.openRentals.filter((x) => x.id !== r.id);
    await d.send(req("POST", `/rentals/${r.id}/return`, { body: { stationId: pick(stationIds(d)) }, headers: bearer(token) }), "return");
  }
}

export const MATRIX_ACTIONS = [
  { id: "own", label: "Read own rental" },
  { id: "other", label: "Read someone else's" },
  { id: "create", label: "Create station" },
  { id: "patch", label: "Patch station" },
  { id: "all", label: "List all rentals" },
] as const;

/** Run every rider against every action for real and record each status. */
export async function runMatrix(d: DocklineDriver) {
  await once(d, "matrix", async () => {
    d.update(() => ({ matrixBusy: true, matrix: {} }));
    const set = (rider: string, action: string, status: number | null, note?: string) => d.update((s) => ({ matrix: { ...s.matrix, [`${rider}:${action}`]: { status, note } } }));
    const rentalsAs = async (rider: string, ip: string) => {
      const ex = await d.send(req("GET", "/rentals?limit=50", { headers: bearer(tokenFor(d, rider)), ip }), "matrix");
      const items = isRecord(ex.body) && Array.isArray(ex.body.items) ? ex.body.items.filter(isRecord) : [];
      return { ex, items };
    };
    const all = (await ensureToken(d, "u-root", "user")) ? (await rentalsAs("u-root", "10.0.1.9")).items : [];
    for (const [i, rider] of RIDERS.entries()) {
      if (d.disposed) return;
      const ip = `10.0.1.${i + 1}`;
      const token = await ensureToken(d, rider.id, "user");
      if (!token) {
        for (const a of MATRIX_ACTIONS) set(rider.id, a.id, null, "no token");
        continue;
      }
      const auth = bearer(token);
      const mineList = await rentalsAs(rider.id, ip);
      const mine = mineList.items.find((r) => r.riderId === rider.id);
      if (mine && typeof mine.id === "string") set(rider.id, "own", (await d.send(req("GET", `/rentals/${mine.id}`, { headers: auth, ip }), "matrix")).status);
      else set(rider.id, "own", null, "no rentals");
      const other = all.find((r) => r.riderId !== rider.id);
      if (other && typeof other.id === "string") set(rider.id, "other", (await d.send(req("GET", `/rentals/${other.id}`, { headers: auth, ip }), "matrix")).status);
      else set(rider.id, "other", null, "none");
      const created = await d.send(req("POST", "/stations", { body: { name: "Matrix Test Dock", zone: "park", capacity: 8 }, headers: auth, ip }), "matrix");
      set(rider.id, "create", created.status);
      if (created.status === 201 && isRecord(created.body) && typeof created.body.id === "string") {
        await d.send(req("DELETE", `/stations/${created.body.id}`, { headers: bearer(tokenFor(d, "u-root")), ip }), "matrix");
      }
      set(rider.id, "patch", (await d.send(req("PATCH", "/stations/st-01", { body: { name: "Harbour Gate" }, headers: auth, ip }), "matrix")).status);
      set(rider.id, "all", mineList.ex.status);
    }
    d.update(() => ({ matrixBusy: false }));
  });
  d.update(() => ({ matrixBusy: false }));
}

// ───────────────────────── resources ─────────────────────────

export async function refreshBoard(d: DocklineDriver) {
  await once(d, "board", async () => {
    await d.send(req("GET", "/stations?limit=50"), "board-stations");
    for (const id of stationIds(d).slice(0, 14)) {
      if (d.disposed) return;
      await d.send(req("GET", `/stations/${id}/bikes`), "board");
      await sleep(60);
    }
  });
}

export async function createStation(d: DocklineDriver, body: unknown): Promise<Exchange | null> {
  const token = d.has("api-auth") ? await ensureToken(d, "u-root", "user") : null;
  if (d.has("api-auth") && !token) return null;
  const ex = await d.send(req("POST", "/stations", { body, headers: bearer(token) }), "create-station");
  if (ex.status === 201 && d.has("api-stations")) void refreshBoard(d);
  return ex;
}

export async function deleteStation(d: DocklineDriver, id: string): Promise<Exchange | null> {
  const token = d.has("api-auth") ? await ensureToken(d, "u-root", "user") : null;
  if (d.has("api-auth") && !token) return null;
  const ex = await d.send(req("DELETE", `/stations/${id}`, { headers: bearer(token) }), "delete-station");
  if (ex.status < 300) void refreshBoard(d);
  return ex;
}

/** Only stations added after the eight seeded ones can be removed from the board. */
export const isSeeded = (id: string) => SEED_STATION_IDS.includes(id);

export async function conditionalGet(d: DocklineDriver, url: string) {
  const tag = d.etags.get(url);
  return d.send(req("GET", url, { headers: tag ? { "if-none-match": tag } : {} }), "revalidate");
}

export async function changeStation(d: DocklineDriver) {
  const token = d.has("api-auth") ? await ensureToken(d, "u-root", "user") : null;
  const capacity = 14 + (Date.now() % 2);
  return d.send(req("PATCH", "/stations/st-03", { body: { capacity }, headers: bearer(token) }), "patch-station");
}

// ───────────────────────── resilience ─────────────────────────

export function failUpstream(d: DocklineDriver, times = 2) {
  d.program?.env?.network.failNext("/upstream/", times, 503);
}

export function toggleSlow(d: DocklineDriver) {
  const next = !d.getSnapshot().slow;
  d.program?.env?.network.configure({ slow: next ? 6 : 1 });
  d.update(() => ({ slow: next }));
}

export const callForecast = (d: DocklineDriver) => d.send(req("GET", FORECAST(d)), "forecast");

/** Make the upstream fail for a while and keep asking, so the breaker can open, probe and close again. */
export async function breakUpstream(d: DocklineDriver) {
  await once(d, "break", async () => {
    d.program?.env?.network.failNext("/upstream/", 8, 503);
    for (let i = 0; i < 18 && !d.disposed; i++) {
      await d.send(req("GET", FORECAST(d), { ip: IPS[0] }), "forecast");
      await sleep(900);
      const b = readBreaker(d.getSnapshot().hooks.breaker);
      if (i >= 7 && b && b.state === "closed") break;
    }
  });
}

export async function shutdownNow(d: DocklineDriver, auto = false) {
  const p = d.program;
  if (!p || !d.can("api-shutdown", "shutdown")) return;
  await once(d, "shutdown", async () => {
    const net = p.env?.network;
    const wasSlow = d.getSnapshot().slow;
    d.update(() => ({ shutdown: { phase: "draining", result: null, rejected: 0 } }));
    net?.configure({ slow: 5 });
    const inFlight = [0, 1, 2].map(() => d.send(req("GET", FORECAST(d), { ip: IPS[0] }), "in-flight"));
    await sleep(120);
    const closing = p.callAsync("shutdown");
    d.refreshHooks();
    await sleep(160);
    const late = await Promise.all([0, 1, 2].map(() => d.send(req("GET", `/stations/${pick(stationIds(d))}`, { ip: IPS[1] }), "late")));
    d.update((s) => ({ shutdown: { ...s.shutdown, rejected: late.filter((x) => x.status === 503).length } }));
    const result = readShutdown(await Promise.race([closing, sleep(6000).then(() => undefined)]));
    await Promise.all(inFlight);
    net?.configure({ slow: wasSlow ? 6 : 1 });
    d.update((s) => ({ shutdown: { ...s.shutdown, phase: "closed", result } }));
    d.refreshHooks();
    if (auto) {
      await sleep(3200);
      restartNow(d);
    }
  });
}

export function restartNow(d: DocklineDriver) {
  if (!d.program || !d.can("api-shutdown", "restart")) return;
  d.program.call("restart");
  d.update((s) => ({ shutdown: { ...s.shutdown, phase: "idle", result: null } }));
  d.refreshHooks();
}

// ───────────────────────── proof ─────────────────────────

export async function runSuiteNow(d: DocklineDriver) {
  const p = d.program;
  if (!p || !d.can("api-tests", "runSuite")) return;
  await once(d, "suite", async () => {
    d.update(() => ({ suiteBusy: true }));
    const raw = await Promise.race([p.callAsync("runSuite"), sleep(12000).then(() => undefined)]);
    const suite = readSuite(raw);
    d.update(() => ({ suite, suiteBusy: false, error: null }));
  });
}

export function parseQuery(d: DocklineDriver, source: string): { doc: GraphDocument | null; error: string | null } {
  const p = d.program;
  if (!p || !d.can("api-graph-query", "parseGraph")) return { doc: null, error: null };
  const raw = p.call("parseGraph", source);
  if (raw === undefined) {
    const msg = (p.lastError ?? "parseGraph() did not return a result").replace(/^parseGraph\(\)\s*/, "").replace(/^(Uncaught\s+)?SyntaxError:\s*/, "");
    return { doc: null, error: msg || "The query could not be parsed." };
  }
  const doc = readGraph(raw);
  return doc ? { doc, error: null } : { doc: null, error: "parseGraph() should return { operation, selections }." };
}

export async function runGraph(d: DocklineDriver, query: string) {
  return d.send(req("POST", "/graphql", { body: { query } }), "graph");
}

/** Anything the Send box asks for. */
export function sendCustom(d: DocklineDriver, method: string, url: string, body?: string) {
  let parsed: unknown = body;
  if (body && body.trim()) {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }
  } else parsed = undefined;
  const r: RawRequest = req(method, url.startsWith("/") ? url : `/${url}`, { body: parsed });
  return d.send(r, "custom");
}

// ───────────────────────── scheduled scenarios (autoplay) ─────────────────────────

/** Called from the traffic tick in autoplay mode: now and then something eventful happens. */
export function scenarios(d: DocklineDriver) {
  const n = d.tickN;
  if (d.has("api-ratelimit") && n % 26 === 14) void burst(d, IPS[2], 15);
  if (d.has("api-retry") && n % 17 === 9) failUpstream(d, 1 + (n % 2));
  if (d.has("api-breaker") && n % 52 === 30 && d.getSnapshot().hooks.breaker?.state !== "open") void breakUpstream(d);
  if (d.has("api-shutdown") && n % 96 === 70) void shutdownNow(d, true);
  if (d.has("api-authz") && n === 6) void runMatrix(d);
  if (d.has("api-tests") && (n === 4 || n % 90 === 0)) void runSuiteNow(d);
  if (d.has("api-idempotency") && n % 22 === 12) void doubleTap(d);
  if (d.has("api-stations") && (n === 2 || n % 40 === 0)) void refreshBoard(d);
  if (d.has("api-auth") && n === 3) void login(d, "u-ana", undefined, "auto");
}
