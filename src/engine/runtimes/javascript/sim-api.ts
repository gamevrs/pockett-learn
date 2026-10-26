import type { Route } from "./sim-network.ts";

/**
 * The tournament API every JavaScript sandbox can reach with `fetch("/api/...")`.
 * Small, deterministic and themed on the Event Arena project, but generic enough for any lesson
 * about promises, retries and pagination.
 */

export interface ApiTeam {
  id: string;
  name: string;
  city: string;
}

export const TEAMS: ApiTeam[] = [
  { id: "fal", name: "Falcons", city: "Aberdeen" },
  { id: "wol", name: "Wolves", city: "Wrexham" },
  { id: "orc", name: "Orcas", city: "Oban" },
  { id: "haw", name: "Hawks", city: "Hull" },
  { id: "lyn", name: "Lynx", city: "Leeds" },
  { id: "bea", name: "Bears", city: "Bath" },
];

export interface ApiMatch {
  id: number;
  home: string;
  away: string;
  status: "finished" | "live" | "scheduled";
  score: { home: number; away: number };
}

export const MATCHES: ApiMatch[] = [
  { id: 1, home: "fal", away: "wol", status: "finished", score: { home: 3, away: 1 } },
  { id: 2, home: "orc", away: "haw", status: "finished", score: { home: 2, away: 2 } },
  { id: 3, home: "lyn", away: "bea", status: "live", score: { home: 1, away: 0 } },
  { id: 4, home: "fal", away: "orc", status: "scheduled", score: { home: 0, away: 0 } },
];

export interface ApiEvent {
  id: number;
  matchId: number;
  minute: number;
  type: "goal" | "foul" | "timeout" | "card";
  team: string;
  player: string;
}

export const PLAYERS: { name: string; team: string }[] = [
  { name: "Ada Okoro", team: "fal" },
  { name: "Ben Hartley", team: "fal" },
  { name: "Cleo Marsh", team: "wol" },
  { name: "Dev Anand", team: "wol" },
  { name: "Eli Brandt", team: "orc" },
  { name: "Fay Lindqvist", team: "orc" },
  { name: "Gus Moreno", team: "haw" },
  { name: "Hana Sato", team: "haw" },
  { name: "Ivo Petrov", team: "lyn" },
  { name: "Jun Ito", team: "lyn" },
  { name: "Kit Larkin", team: "bea" },
  { name: "Lena Voss", team: "bea" },
];

export const STANDINGS = [
  { team: "fal", played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 7, goalsAgainst: 3, points: 7 },
  { team: "orc", played: 3, won: 1, drawn: 2, lost: 0, goalsFor: 6, goalsAgainst: 4, points: 5 },
  { team: "lyn", played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 4, goalsAgainst: 4, points: 4 },
  { team: "haw", played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 3, goalsAgainst: 5, points: 3 },
  { team: "wol", played: 3, won: 0, drawn: 2, lost: 1, goalsFor: 3, goalsAgainst: 5, points: 2 },
  { team: "bea", played: 3, won: 0, drawn: 2, lost: 1, goalsFor: 2, goalsAgainst: 4, points: 2 },
];

/** A fixed pseudo-random timeline for a match: goals match the final score, with fouls and timeouts between. */
export function eventsFor(match: ApiMatch): ApiEvent[] {
  let seed = match.id * 7919;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const roster = (team: string) => PLAYERS.filter((p) => p.team === team).map((p) => p.name);
  const out: Omit<ApiEvent, "id">[] = [];
  const add = (type: ApiEvent["type"], team: string) => {
    const names = roster(team);
    out.push({ matchId: match.id, minute: 1 + Math.floor(rand() * 88), type, team, player: names[Math.floor(rand() * names.length)] ?? "Unknown" });
  };
  for (let i = 0; i < match.score.home; i++) add("goal", match.home);
  for (let i = 0; i < match.score.away; i++) add("goal", match.away);
  if (match.status !== "scheduled") {
    for (let i = 0; i < 5; i++) add("foul", rand() < 0.5 ? match.home : match.away);
    add("timeout", match.home);
    add("timeout", match.away);
    add("card", rand() < 0.5 ? match.home : match.away);
  }
  return out.sort((a, b) => a.minute - b.minute).map((e, i) => ({ id: match.id * 100 + i + 1, ...e }));
}

const json = (body: unknown, status = 200) => ({ status, body });

export const DEFAULT_ROUTES: Route[] = [
  { method: "GET", path: "/api/teams", latency: 90, handle: () => json(TEAMS) },
  { method: "GET", path: "/api/matches", latency: 120, handle: () => json(MATCHES) },
  {
    method: "GET",
    path: "/api/matches/:id",
    latency: 110,
    handle: (_req, p) => {
      const match = MATCHES.find((m) => String(m.id) === p.id);
      return match ? json(match) : json({ error: `Match ${p.id} not found` }, 404);
    },
  },
  {
    method: "GET",
    path: "/api/matches/:id/events",
    latency: 80,
    handle: (req, p) => {
      const match = MATCHES.find((m) => String(m.id) === p.id);
      if (!match) return json({ error: `Match ${p.id} not found` }, 404);
      const all = eventsFor(match);
      const cursor = Math.max(0, Number(req.query.get("cursor") ?? 0) || 0);
      const limit = Math.min(50, Math.max(1, Number(req.query.get("limit") ?? 5) || 5));
      const items = all.slice(cursor, cursor + limit);
      const next = cursor + limit < all.length ? cursor + limit : null;
      return json({ items, next, total: all.length });
    },
  },
  { method: "GET", path: "/api/standings", latency: 180, handle: () => json(STANDINGS) },
  {
    method: "GET",
    path: "/api/players",
    latency: 150,
    handle: (req) => {
      const q = (req.query.get("q") ?? "").trim().toLowerCase();
      return json(q ? PLAYERS.filter((p) => p.name.toLowerCase().includes(q)) : PLAYERS);
    },
  },
  {
    method: "POST",
    path: "/api/reports",
    latency: 140,
    handle: (req) => {
      req.state.reports = (req.state.reports ?? 0) + 1;
      return json({ id: req.state.reports, received: req.body ?? null }, 201);
    },
  },
  // fails twice, then works: practice for retries (reset by the network's reset())
  {
    method: "GET",
    path: "/api/flaky",
    latency: 100,
    handle: (req) => {
      req.state.flaky = (req.state.flaky ?? 0) + 1;
      return req.state.flaky <= 2 ? json({ error: "Service Unavailable" }, 503) : json({ ok: true, attempts: req.state.flaky });
    },
  },
  { method: "GET", path: "/api/slow", latency: 3000, handle: () => json({ ok: true }) },
  // a partner weather feed for the bike-share API project: deterministic per zone
  {
    method: "GET",
    path: "/upstream/forecast/:zone",
    latency: 120,
    handle: (_req, p) => json(forecastFor(p.zone)),
  },
];

/** Deterministic pretend forecast for a zone name (the same zone always gets the same weather). */
export function forecastFor(zone: string): { zone: string; tempC: number; rain: boolean; windKph: number } {
  let h = 2166136261;
  for (let i = 0; i < zone.length; i++) h = Math.imul(h ^ zone.charCodeAt(i), 16777619) >>> 0;
  return { zone, tempC: 8 + (h % 15), rain: (h >>> 8) % 3 === 0, windKph: 4 + ((h >>> 12) % 26) };
}
