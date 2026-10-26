import type { ProgramHandle } from "@/engine/program";
import {
  DEFAULT_CATALOG,
  DEFAULT_SUNRISE,
  DEFAULT_SUNSET,
  KIND_FEATURE,
  OUTSIDE,
  PLACE_POINT,
  ROOMS,
  ROOM_IDS,
  asBool,
  asNum,
  asStr,
  clamp,
  isKind,
  isRec,
  parseAutomations,
  parseCatalog,
  parseDayMap,
  parseErrors,
  parseEvents,
  parsePhone,
  parseSnapshot,
  parseStrings,
  parseVisits,
  walkSteps,
  type BusError,
  type CatalogDevice,
  type DeviceState,
  type LogLine,
  type PhoneMessage,
  type Place,
  type Point,
  type RoomId,
  type RuleDecision,
  type RuleStatus,
  type Step,
} from "./model";

/**
 * The runtime behind the Smart Home scene: the physical world (a person walking about, the clock,
 * the weather, the front door) plus the plumbing that reports it to the learner's program and reads
 * their program's answers back.
 *
 * The world is the scene's. The house (devices, bus, rules) is the learner's: every light level,
 * lock state, log line and rule verdict shown on the plan came out of a hook call. A feature that
 * has not been unlocked yet is never called, and every call is guarded by `hasHook`.
 */

type Tone = "info" | "warn" | "bad";

export interface View {
  hasProgram: boolean;
  minute: number;
  playing: boolean;
  sunrise: number;
  sunset: number;
  outdoor: number;
  indoor: number;
  person: Point;
  place: Place;
  walking: boolean;
  doorOpen: boolean;
  selected: string | null;
  fromProgram: boolean;
  catalog: CatalogDevice[];
  devices: Record<string, DeviceState>;
  visits: Record<string, number>;
  events: LogLine[];
  filter: string;
  errors: BusError[];
  phone: PhoneMessage[];
  rules: RuleStatus[];
  decisions: RuleDecision[];
  calls: string[];
  routines: string[];
  presets: string[];
  presetUses: Record<string, number>;
  dayMap: { minute: number; dark: boolean }[];
  unread: LogLine[] | null;
  message: { text: string; tone: Tone } | null;
}

const WALK_SPEED = 230; // plan units per second
const TEMP_STEP = 0.5; // report the indoor temperature when it moved this much
const PLAY_MINUTES_PER_MS = 0.03; // 30 simulated minutes per second
const REFRESH_MS = 400;

export const TOUR: (Place | "door")[] = ["kitchen", "living", "hall", "bedroom", "hall", "door", "living", "kitchen", "living", "hall", "bedroom"];

export interface Inputs {
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  interactive: boolean;
  autoplay: boolean;
}

export class HomeRuntime {
  private inputs: Inputs = { program: null, unlocked: new Set(), interactive: true, autoplay: false };
  private generation = -2;

  // the physical world
  private minute = 12 * 60;
  private playing = false;
  private outdoor = 9;
  private indoor = 21;
  private lastSentTemp = 21;
  private place: Place = "living";
  private person: Point = { ...ROOMS.living.center };
  private path: Step[] = [];
  private doorOpen = false;
  private selected: string | null = null;
  private lastBoundary = -1;
  private pendingTimeAt = 0;
  private tourAt = 0;
  private tourIndex = 0;
  private sinceRefresh = REFRESH_MS;

  // what the learner's program last told us
  private catalog: CatalogDevice[] | null = null;
  private devices: Record<string, DeviceState> = {};
  private visits: Record<string, number> = {};
  private events: LogLine[] = [];
  private filter = "";
  private errors: BusError[] = [];
  private phone: PhoneMessage[] = [];
  private rules: RuleStatus[] = [];
  private decisions: RuleDecision[] = [];
  private calls: string[] = [];
  private routines: string[] = [];
  private presets: string[] = [];
  private presetUses: Record<string, number> = {};
  private dayMap: { minute: number; dark: boolean }[] = [];
  private unread: LogLine[] | null = null;
  private message: { text: string; tone: Tone; until: number } | null = null;
  private now = 0;
  private timers = new Set<number>();

  setInputs(next: Inputs) {
    const prevProgram = this.inputs.program;
    const unlockedChanged = next.unlocked !== this.inputs.unlocked;
    this.inputs = next;
    if (unlockedChanged) this.sinceRefresh = REFRESH_MS;
    const gen = next.program ? next.program.generation : -1;
    if (gen !== this.generation) {
      this.generation = gen;
      this.resetProgramState();
      if (next.program || prevProgram) this.resetWorld();
      this.sinceRefresh = REFRESH_MS;
    }
  }

  private resetProgramState() {
    this.catalog = null;
    this.devices = {};
    this.visits = {};
    this.events = [];
    this.filter = "";
    this.errors = [];
    this.phone = [];
    this.rules = [];
    this.decisions = [];
    this.calls = [];
    this.routines = [];
    this.presets = [];
    this.presetUses = {};
    this.dayMap = [];
    this.unread = null;
    this.message = null;
  }

  private resetWorld() {
    this.minute = 12 * 60;
    this.playing = false;
    this.indoor = 21;
    this.lastSentTemp = 21;
    this.place = "living";
    this.person = { ...ROOMS.living.center };
    this.path = [];
    this.doorOpen = false;
    this.lastBoundary = -1;
    this.pendingTimeAt = 0;
    this.tourAt = 0;
    this.tourIndex = 0;
  }

  // ───────────────────────── hook plumbing ─────────────────────────

  private alive(feature: string): boolean {
    return !!this.inputs.program && this.inputs.unlocked.has(feature);
  }

  private has(hook: string): boolean {
    return !!this.inputs.program && this.inputs.program.hasHook(hook);
  }

  /** Call a hook only if its feature is unlocked and the function exists. */
  private call<T>(feature: string, hook: string, ...args: unknown[]): T | undefined {
    if (!this.alive(feature) || !this.has(hook)) return undefined;
    return this.inputs.program!.call<T>(hook, ...args);
  }

  private num(name: string, fallback: number): number {
    return this.inputs.program ? this.inputs.program.num(name, fallback) : fallback;
  }

  private get sunrise() {
    return clamp(this.num("SUNRISE", DEFAULT_SUNRISE), 0, 1439);
  }
  private get sunset() {
    return clamp(this.num("SUNSET", DEFAULT_SUNSET), 0, 1439);
  }

  private say(text: string, tone: Tone = "info", ms = 3200) {
    this.message = { text, tone, until: this.now + ms };
  }

  /** Re-read everything the unlocked features show. Cheap enough to call after every action. */
  refresh() {
    if (!this.inputs.program) return;
    if (this.catalog === null) {
      const raw = this.call<unknown>("sh-blueprint", "catalog");
      if (raw !== undefined) this.catalog = parseCatalog(raw);
    }
    const snap = this.call<unknown>("sh-lights", "snapshot");
    if (snap !== undefined) this.devices = parseSnapshot(snap);

    const routines = this.call<unknown>("sh-routines", "routine_names");
    if (routines !== undefined) this.routines = parseStrings(routines);
    const presets = this.call<unknown>("sh-scenes", "preset_names");
    if (presets !== undefined) this.presets = parseStrings(presets);
    const visits = this.call<unknown>("sh-traffic", "busiest_rooms");
    if (visits !== undefined) this.visits = parseVisits(visits);
    const calls = this.call<unknown>("sh-audit", "call_log");
    if (calls !== undefined) this.calls = parseStrings(calls).slice(-40);

    if (this.filter && this.alive("sh-timeline") && this.has("recent_events")) {
      const ev = this.call<unknown>("sh-timeline", "recent_events", this.filter, 30);
      if (ev !== undefined) this.events = parseEvents(ev);
    } else {
      const ev = this.call<unknown>("sh-eventlog", "event_log", 60);
      if (ev !== undefined) this.events = parseEvents(ev);
    }
    const errors = this.call<unknown>("sh-resilience", "bus_errors");
    if (errors !== undefined) this.errors = parseErrors(errors);
    const phone = this.call<unknown>("sh-phone", "notifications");
    if (phone !== undefined) this.phone = parsePhone(phone);
    const auto = this.call<unknown>("sh-automations", "automations");
    if (auto !== undefined) {
      const parsed = parseAutomations(auto);
      this.rules = parsed.rules;
      this.decisions = parsed.log;
    }
    if (this.alive("sh-timeline") && this.dayMap.length === 0) {
      const map = this.call<unknown>("sh-timeline", "daylight_map", 30);
      if (map !== undefined) this.dayMap = parseDayMap(map);
    }
  }

  // ───────────────────────── reporting the world ─────────────────────────

  /** Report something that happened in the physical world, the best way the program can hear it. */
  private deliver(name: string, payload: Record<string, unknown>) {
    if (!this.inputs.program) return;
    if (this.alive("sh-eventlog") && this.has("world_event")) this.inputs.program.call("world_event", name, payload);
    // Until lesson 11 wires the devices to the bus, talk to them directly.
    if (!this.alive("sh-wiring")) this.legacy(name, payload);
  }

  private legacy(name: string, payload: Record<string, unknown>) {
    const room = asStr(payload.room);
    if (name === "motion" && room) {
      if (this.alive("sh-traffic") && this.has("motion_detected")) this.inputs.program!.call("motion_detected", room);
      else this.call("sh-sensors", "command", `${room}_motion`, "trigger");
    } else if (name === "motion_clear" && room) {
      this.call("sh-sensors", "command", `${room}_motion`, "clear");
    } else if (name === "temperature") {
      const value = payload.value;
      if (typeof value === "number") this.call("sh-climate", "command", "thermostat", "measure", value);
    }
  }

  // ───────────────────────── actions the UI calls ─────────────────────────

  walkTo(target: Place) {
    if (!this.inputs.interactive && !this.inputs.autoplay) return;
    const steps = walkSteps(this.place, target);
    if (steps.length === 0) {
      // already there: wave about, so the sensor fires again (handy for retesting a rule)
      if (target !== "outside") {
        this.deliver("motion", { room: target });
        this.refresh();
      }
      return;
    }
    const lock = this.devices["front_lock"];
    if (this.place === "outside" && this.alive("sh-lock") && lock && lock.locked === true && !this.inputs.autoplay) {
      this.say("Locked out! Unlock the front door in the inspector, then try again.", "warn", 4200);
      return;
    }
    this.path = steps;
  }

  selectDevice(id: string | null) {
    this.selected = id;
  }

  toggleDoor() {
    this.setDoor(!this.doorOpen);
    this.refresh();
  }

  private setDoor(open: boolean) {
    if (this.doorOpen === open) return;
    this.doorOpen = open;
    this.deliver("door", { open });
  }

  setMinute(minute: number, emitNow = false) {
    this.minute = ((Math.round(minute) % 1440) + 1440) % 1440;
    this.lastBoundary = Math.floor(this.minute / 30);
    if (emitNow) {
      this.pendingTimeAt = 0;
      this.deliver("time", { minute: this.minute });
      this.refresh();
    } else this.pendingTimeAt = this.now + 160;
  }

  togglePlay() {
    this.playing = !this.playing;
    this.lastBoundary = Math.floor(this.minute / 30);
  }

  setOutdoor(t: number) {
    this.outdoor = clamp(Math.round(t), -15, 40);
  }

  sendBrokenReading() {
    this.deliver("temperature", {});
    this.say("Sent a temperature event with no value. Watch what your handler does.", "info", 4200);
    this.refresh();
  }

  command(id: string, action: string, value?: unknown) {
    const dev = this.catalogList().find((d) => d.id === id);
    const feature = dev && isKind(dev.kind) ? KIND_FEATURE[dev.kind] : "sh-lights";
    const res = this.call<unknown>(feature, "command", id, action, value === undefined ? null : value);
    if (isRec(res) && res.ok === false) this.say(asStr(res.error, "That did not work."), "warn", 4200);
    this.refresh();
  }

  runRoutine(name: string) {
    const res = this.call<unknown>("sh-routines", "run_routine", name);
    if (isRec(res) && res.ok === false) this.say(asStr(res.error, "That did not work."), "warn", 4200);
    this.refresh();
  }

  runPreset(name: string) {
    const res = this.call<unknown>("sh-scenes", "run_preset", name);
    if (isRec(res)) {
      if (res.ok === false) this.say(asStr(res.error, "That did not work."), "warn", 4200);
      else this.presetUses[name] = asNum(res.times, (this.presetUses[name] ?? 0) + 1);
    }
    this.refresh();
  }

  setFilter(name: string) {
    this.filter = name;
    this.refresh();
  }

  checkUnread() {
    const raw = this.call<unknown>("sh-timeline", "unread");
    if (raw !== undefined) this.unread = parseEvents(raw);
    this.refresh();
  }

  clearUnread() {
    this.unread = null;
  }

  private catalogList(): CatalogDevice[] {
    return this.catalog && this.catalog.length ? this.catalog : DEFAULT_CATALOG;
  }

  // ───────────────────────── the clock ─────────────────────────

  tick(dtMs: number) {
    this.now += dtMs;
    const dt = Math.min(dtMs, 250) / 1000;
    if (this.message && this.now > this.message.until) this.message = null;

    // time of day
    if (this.playing) {
      this.minute = (this.minute + dtMs * PLAY_MINUTES_PER_MS) % 1440;
      const boundary = Math.floor(this.minute / 30);
      if (boundary !== this.lastBoundary) {
        this.lastBoundary = boundary;
        this.deliver("time", { minute: boundary * 30 });
      }
    }
    if (this.pendingTimeAt && this.now >= this.pendingTimeAt) {
      this.pendingTimeAt = 0;
      this.deliver("time", { minute: Math.round(this.minute) });
    }

    // indoor temperature: leaks towards the outdoor temperature, and the learner's heating adds heat
    const heating = this.alive("sh-climate") && this.devices["thermostat"]?.heating === true;
    this.indoor = clamp(this.indoor + ((this.outdoor - this.indoor) * 0.006 + (heating ? 0.2 : 0)) * dt, -20, 45);
    if (Math.abs(this.indoor - this.lastSentTemp) >= TEMP_STEP) {
      this.lastSentTemp = this.indoor;
      this.deliver("temperature", { value: Math.round(this.indoor * 10) / 10 });
    }

    // walking
    if (this.path.length > 0) {
      const target = this.path[0];
      const dx = target.x - this.person.x;
      const dy = target.y - this.person.y;
      const dist = Math.hypot(dx, dy);
      const stride = WALK_SPEED * dt;
      if (dist <= stride) {
        this.person = { x: target.x, y: target.y };
        this.path.shift();
        this.arrive(target);
      } else this.person = { x: this.person.x + (dx / dist) * stride, y: this.person.y + (dy / dist) * stride };
    } else if (this.inputs.autoplay && this.inputs.program) this.tour();

    // read the program back
    this.sinceRefresh += dtMs;
    if (this.sinceRefresh >= REFRESH_MS) {
      this.sinceRefresh = 0;
      this.refresh();
    }
  }

  private arrive(step: Step) {
    if (step.door === true) this.setDoor(true);
    if (step.leave && step.leave !== "outside") this.deliver("motion_clear", { room: step.leave });
    if (step.enter) {
      this.place = step.enter;
      if (step.enter !== "outside") this.deliver("motion", { room: step.enter });
    }
    if (step.door === false) this.setDoor(false);
    this.refresh();
  }

  /** Landing page: wander through the house and let the day run, so the demo shows itself. */
  private tour() {
    if (this.now < this.tourAt) return;
    if (!this.playing) this.playing = true;
    const next = TOUR[this.tourIndex % TOUR.length];
    this.tourIndex += 1;
    this.tourAt = this.now + 2600;
    if (next === "door") {
      this.setDoor(true);
      this.tourAt = this.now + 900;
      const id = window.setTimeout(() => {
        this.timers.delete(id);
        this.setDoor(false);
      }, 800);
      this.timers.add(id);
    } else this.walkTo(next);
  }

  dispose() {
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers.clear();
  }

  // ───────────────────────── the picture ─────────────────────────

  view(): View {
    const p = this.inputs.program;
    const catalog = this.catalog && this.catalog.length ? this.catalog : DEFAULT_CATALOG;
    return {
      hasProgram: !!p,
      minute: Math.round(this.minute * 10) / 10,
      playing: this.playing,
      sunrise: this.sunrise,
      sunset: this.sunset,
      outdoor: this.outdoor,
      indoor: Math.round(this.indoor * 10) / 10,
      person: { x: Math.round(this.person.x * 10) / 10, y: Math.round(this.person.y * 10) / 10 },
      place: this.place,
      walking: this.path.length > 0,
      doorOpen: this.doorOpen,
      selected: this.selected,
      fromProgram: !!this.catalog && this.catalog.length > 0,
      catalog,
      devices: this.devices,
      visits: this.visits,
      events: this.events,
      filter: this.filter,
      errors: this.errors,
      phone: this.phone,
      rules: this.rules,
      decisions: this.decisions,
      calls: this.calls,
      routines: this.routines,
      presets: this.presets,
      presetUses: this.presetUses,
      dayMap: this.dayMap,
      unread: this.unread,
      message: this.message ? { text: this.message.text, tone: this.message.tone } : null,
    };
  }
}

/** Device state helpers for the renderer (everything may be missing or the wrong type). */
export const dev = {
  on: (d: DeviceState | undefined) => !!d && asBool(d.on),
  level: (d: DeviceState | undefined) => (d ? clamp(asNum(d.level, asBool(d.on) ? 100 : 0), 0, 100) : 0),
  locked: (d: DeviceState | undefined) => (d ? d.locked === true : true),
  detected: (d: DeviceState | undefined) => !!d && d.detected === true,
  playing: (d: DeviceState | undefined) => !!d && d.playing === true,
  volume: (d: DeviceState | undefined) => (d ? clamp(asNum(d.volume, 30), 0, 100) : 0),
  position: (d: DeviceState | undefined) => (d ? clamp(asNum(d.position, 100), 0, 100) : 100),
  target: (d: DeviceState | undefined) => (d ? asNum(d.target, 21) : 21),
  current: (d: DeviceState | undefined) => (d ? asNum(d.current, 21) : 21),
  heating: (d: DeviceState | undefined) => !!d && d.heating === true,
};

export { OUTSIDE, PLACE_POINT, ROOM_IDS };
export type { RoomId };
