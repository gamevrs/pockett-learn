import { DocklineSim } from "./sim.ts";
import { parseGraph } from "./sim-graph.ts";
import type { ApiResponse, SuiteCase, SuiteResult } from "./types.ts";

/**
 * The stand-in program's own test suite: ~12 named cases, each run against a fresh Dockline with a
 * fixed clock and an upstream that the case controls. Used by the demo's runSuite().
 */

interface World {
  api: DocklineSim;
  clock: { t: number };
  upstreamDown: { on: boolean };
  call: (method: string, url: string, o?: { body?: unknown; headers?: Record<string, string>; ip?: string }) => Promise<ApiResponse>;
  login: (riderId: string, pin: string) => Promise<string>;
}

function world(): World {
  const clock = { t: Date.UTC(2026, 5, 1, 9, 0, 0) };
  const upstreamDown = { on: false };
  const api = new DocklineSim({
    now: () => clock.t,
    sleep: async (ms) => {
      clock.t += ms;
    },
    work: 0,
    upstream: async (path) => {
      if (upstreamDown.on) throw new TypeError("Failed to fetch");
      return { status: 200, body: { zone: path.split("/").pop(), tempC: 14, rain: false, windKph: 9 } };
    },
  });
  const call: World["call"] = (method, url, o = {}) => api.handle({ method, url, headers: o.headers, body: o.body, ip: o.ip ?? "10.9.9.9" });
  const login = async (riderId: string, pin: string) => {
    const r = await call("POST", "/auth/token", { body: { riderId, pin } });
    return String((r.body as { token?: string }).token);
  };
  return { api, clock, upstreamDown, call, login };
}

type Check = (w: World, expect: (ok: boolean, message: string) => void) => Promise<void>;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
const field = (r: ApiResponse, name: string) => ((r.body as { errors?: { field: string }[] }).errors ?? []).some((e) => e.field === name);

const CASES: [string, Check][] = [
  ["health check answers 200", async (w, expect) => {
    const r = await w.call("GET", "/health/live");
    expect(r.status === 200, `expected 200, got ${r.status}`);
  }],
  ["unknown route is a 404 problem document", async (w, expect) => {
    const r = await w.call("GET", "/nope");
    expect(r.status === 404, `expected 404, got ${r.status}`);
    expect(r.headers["content-type"] === "application/problem+json", "content-type should be application/problem+json");
  }],
  ["wrong method is a 405 with an Allow header", async (w, expect) => {
    const r = await w.call("DELETE", "/health/live");
    expect(r.status === 405, `expected 405, got ${r.status}`);
    expect(!!r.headers.allow, "missing allow header");
  }],
  ["bad station input lists the failing fields", async (w, expect) => {
    const token = await w.login("u-root", "9034");
    const r = await w.call("POST", "/stations", { headers: bearer(token), body: { name: "", zone: "moon", capacity: "many" } });
    expect(r.status === 400, `expected 400, got ${r.status}`);
    expect(field(r, "name") && field(r, "zone") && field(r, "capacity"), "errors[] should name name, zone and capacity");
  }],
  ["paging honours limit and offset", async (w, expect) => {
    const r = await w.call("GET", "/stations?limit=3&offset=3");
    const body = r.body as { items: unknown[]; page: { total: number } };
    expect(body.items.length === 3, `expected 3 items, got ${body.items?.length}`);
    expect(body.page.total === 8, `expected total 8, got ${body.page?.total}`);
  }],
  ["login returns a signed token, a wrong PIN is refused", async (w, expect) => {
    const token = await w.login("u-ana", "4821");
    expect(token.split(".").length === 3, "token should have three parts");
    const bad = await w.call("POST", "/auth/token", { body: { riderId: "u-ana", pin: "0000" } });
    expect(bad.status === 401, `expected 401, got ${bad.status}`);
  }],
  ["a tampered token is rejected", async (w, expect) => {
    const token = await w.login("u-ana", "4821");
    const [h, , s] = token.split(".");
    const forged = `${h}.${btoa(JSON.stringify({ sub: "u-ana", role: "admin", exp: 4102444800 })).replace(/=+$/, "")}.${s}`;
    const r = await w.call("GET", "/rentals", { headers: bearer(forged) });
    expect(r.status === 401, `expected 401, got ${r.status}`);
  }],
  ["a rider cannot create stations", async (w, expect) => {
    const token = await w.login("u-ben", "7390");
    const r = await w.call("POST", "/stations", { headers: bearer(token), body: { name: "Test Dock", zone: "park", capacity: 8 } });
    expect(r.status === 403, `expected 403, got ${r.status}`);
  }],
  ["someone else's rental looks like a 404", async (w, expect) => {
    const token = await w.login("u-ben", "7390");
    const r = await w.call("GET", "/rentals/rt-1001", { headers: bearer(token) });
    expect(r.status === 404, `expected 404, got ${r.status}`);
  }],
  ["a repeated Idempotency-Key replays the first answer", async (w, expect) => {
    const token = await w.login("u-ana", "4821");
    const send = () => w.call("POST", "/rentals", { headers: { ...bearer(token), "idempotency-key": "k-1" }, body: { bikeId: "bk-101" } });
    const first = await send();
    const second = await send();
    expect(first.status === 201, `expected 201, got ${first.status}`);
    expect(second.headers["x-idempotent-replay"] === "true", "replay should set x-idempotent-replay");
    expect(JSON.stringify(first.body) === JSON.stringify(second.body), "replay should return the same body");
  }],
  ["the same key with another body is a 422", async (w, expect) => {
    const token = await w.login("u-ana", "4821");
    await w.call("POST", "/rentals", { headers: { ...bearer(token), "idempotency-key": "k-2" }, body: { bikeId: "bk-103" } });
    const r = await w.call("POST", "/rentals", { headers: { ...bearer(token), "idempotency-key": "k-2" }, body: { bikeId: "bk-104" } });
    expect(r.status === 422, `expected 422, got ${r.status}`);
  }],
  ["a conditional GET revalidates with 304", async (w, expect) => {
    const first = await w.call("GET", "/stations/st-03");
    const again = await w.call("GET", "/stations/st-03", { headers: { "if-none-match": first.headers.etag ?? "" } });
    expect(!!first.headers.etag, "first response needs an etag");
    expect(again.status === 304, `expected 304, got ${again.status}`);
  }],
  ["the rate limit trips after the burst", async (w, expect) => {
    let last = 0;
    for (let i = 0; i < 14; i++) last = (await w.call("GET", "/stations", { ip: "10.1.1.1" })).status;
    expect(last === 429, `expected 429 at the end of a burst, got ${last}`);
    const r = await w.call("GET", "/stations", { ip: "10.1.1.1" });
    expect(!!r.headers["retry-after"], "429 needs retry-after");
  }],
  ["the forecast falls back and the breaker opens", async (w, expect) => {
    w.upstreamDown.on = true;
    let source = "";
    for (let i = 0; i < 3; i++) source = String(((await w.call("GET", "/stations/st-01/forecast")).body as { source?: string }).source);
    expect(source === "fallback", `expected fallback, got ${source}`);
    expect(w.api.breakerState().state === "open", `breaker should be open, is ${w.api.breakerState().state}`);
  }],
  ["graph queries return nested data", async (w, expect) => {
    const r = await w.call("POST", "/graphql", { body: { query: '{ stations(zone: "central") { name bikes { id } } }' } });
    const data = (r.body as { data?: { stations?: { bikes: unknown[] }[] } }).data;
    expect(r.status === 200 && (data?.stations?.length ?? 0) === 2, "expected the two central stations");
    expect((data?.stations?.[0]?.bikes.length ?? 0) > 0, "stations should carry their bikes");
    expect(parseGraph("{ a { b } }").selections[0].selections[0].name === "b", "parser should nest selections");
  }],
];

export async function runSuite(): Promise<SuiteResult> {
  const results: SuiteCase[] = [];
  for (const [name, check] of CASES) {
    const failures: string[] = [];
    try {
      await check(world(), (ok, message) => {
        if (!ok) failures.push(message);
      });
    } catch (err) {
      failures.push(`threw: ${(err as Error).message}`);
    }
    results.push({ name, ok: failures.length === 0, failures });
  }
  return { total: results.length, passed: results.filter((r) => r.ok).length, results };
}
