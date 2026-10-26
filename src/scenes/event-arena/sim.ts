/**
 * The stadium: a deterministic match simulator. The scene plays the real world; the learner's code
 * is the engine that reacts to what happens here. Nothing in this file touches the learner's program.
 */

export const TEAMS: Record<string, { name: string; city: string; short: string }> = {
  fal: { name: "Falcons", city: "Aberdeen", short: "FAL" },
  wol: { name: "Wolves", city: "Wrexham", short: "WOL" },
  orc: { name: "Orcas", city: "Oban", short: "ORC" },
  haw: { name: "Hawks", city: "Hull", short: "HAW" },
  lyn: { name: "Lynx", city: "Leeds", short: "LYN" },
  bea: { name: "Bears", city: "Bath", short: "BEA" },
};

export const TEAM_IDS = Object.keys(TEAMS);

export type EventType = "goal" | "foul" | "timeout" | "card";

export interface ArenaEvent {
  id: number;
  type: EventType;
  team: string;
  teamName: string;
  player: string;
  minute: number;
  detail?: "yellow" | "red";
  points?: number;
}

export interface MatchResult {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

const PLAYERS: Record<string, string[]> = {
  fal: ["Ada Okoro", "Ben Hartley", "Rhea Quinn"],
  wol: ["Cleo Marsh", "Dev Anand", "Tomas Reyes"],
  orc: ["Eli Brandt", "Fay Lindqvist", "Noor Haddad"],
  haw: ["Gus Moreno", "Hana Sato", "Pia Novak"],
  lyn: ["Ivo Petrov", "Jun Ito", "Sam Achebe"],
  bea: ["Kit Larkin", "Lena Voss", "Omar Reid"],
};

/** Fixtures the stadium plays through, one after another. */
export const FIXTURES: [string, string][] = [
  ["orc", "haw"],
  ["lyn", "bea"],
  ["fal", "orc"],
  ["wol", "haw"],
  ["lyn", "fal"],
  ["bea", "wol"],
  ["haw", "lyn"],
  ["orc", "wol"],
];

/** Results already on the board when the tournament day starts, so the table has something to say. */
export const SEED_RESULTS: MatchResult[] = [
  { home: "fal", away: "wol", homeGoals: 3, awayGoals: 1 },
  { home: "orc", away: "haw", homeGoals: 2, awayGoals: 2 },
  { home: "lyn", away: "haw", homeGoals: 2, awayGoals: 0 },
  { home: "bea", away: "orc", homeGoals: 0, awayGoals: 1 },
];

/** Small seeded generator (mulberry32) so the same fixture always unfolds the same way. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MATCH_MINUTES = 90;

let eventCounter = 1000;
export const nextEventId = () => ++eventCounter;

export class MatchSim {
  readonly home: string;
  readonly away: string;
  readonly fixture: number;
  minute = 0;
  goals = { home: 0, away: 0 };
  finished = false;
  private rand: () => number;

  constructor(fixture: number, salt = 0) {
    this.fixture = fixture;
    const [home, away] = FIXTURES[fixture % FIXTURES.length];
    this.home = home;
    this.away = away;
    this.rand = rng(1337 + fixture * 97 + salt);
  }

  private player(team: string) {
    const list = PLAYERS[team] ?? ["Unknown"];
    return list[Math.floor(this.rand() * list.length)];
  }

  private make(type: EventType, side: "home" | "away", extra: Partial<ArenaEvent> = {}): ArenaEvent {
    const team = side === "home" ? this.home : this.away;
    const event: ArenaEvent = { id: nextEventId(), type, team, teamName: TEAMS[team].name, player: this.player(team), minute: Math.min(this.minute, MATCH_MINUTES), ...extra };
    if (type === "goal") {
      event.points = 1;
      this.goals[side]++;
    }
    if (type === "card" && !event.detail) event.detail = this.rand() < 0.2 ? "red" : "yellow";
    return event;
  }

  /** Advance the match clock; the next thing that happens. Returns the seconds that passed and maybe an event. */
  step(): { seconds: number; event: ArenaEvent | null } {
    if (this.finished) return { seconds: 0, event: null };
    const jump = 1 + Math.floor(this.rand() * 4); // 1-4 minutes
    const before = this.minute;
    this.minute = Math.min(MATCH_MINUTES, this.minute + jump);
    const seconds = (this.minute - before) * 60;
    if (this.minute >= MATCH_MINUTES) {
      this.finished = true;
      return { seconds, event: null };
    }
    const roll = this.rand();
    const side: "home" | "away" = this.rand() < 0.5 ? "home" : "away";
    const type: EventType = roll < 0.2 ? "goal" : roll < 0.62 ? "foul" : roll < 0.78 ? "timeout" : "card";
    return { seconds, event: this.make(type, side) };
  }

  /** A manual event, as if it just happened. */
  inject(type: EventType, side: "home" | "away", extra: Partial<ArenaEvent> = {}): ArenaEvent {
    return this.make(type, side, extra);
  }

  get result(): MatchResult {
    return { home: this.home, away: this.away, homeGoals: this.goals.home, awayGoals: this.goals.away };
  }
}

/** Noise for the pipeline: a duplicate of an event, or a broken one. */
export function corrupt(event: ArenaEvent, roll: number): ArenaEvent | Record<string, unknown> {
  if (roll < 0.34) return { ...event }; // exact duplicate (same id)
  if (roll < 0.67) return { ...event, id: nextEventId(), team: "zzz" }; // unknown team
  return { type: event.type, team: event.team, minute: -5 }; // no id, impossible minute
}
