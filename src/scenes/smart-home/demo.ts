import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import { DEFAULT_CATALOG, DEFAULT_SUNRISE, DEFAULT_SUNSET, ROOM_IDS, fmtTime, isDarkAt } from "./model";

/**
 * What the finished Smart Home Hub exposes, written in plain JS so the landing page needs no Python
 * runtime. It mirrors the reference solution: same devices, same events, same six rules, the same
 * reasons for firing or skipping.
 */

type Payload = Record<string, unknown>;
interface Ev {
  seq: number;
  name: string;
  payload: Payload;
}
interface Rule {
  name: string;
  on: string;
  needs: { text: string; ok: () => boolean }[];
  then: (ev: Ev) => void;
}

export function smartHomeDemoProgram(): ProgramHandle {
  let minute = 12 * 60;
  let seq = 1;
  const history: Ev[] = [];
  const phone: { at: string; title: string; body: string }[] = [];
  const calls: string[] = [];
  const errors: { event: string; seq: number; handler: string; error: string }[] = [];
  const visits: Record<string, number> = Object.fromEntries(ROOM_IDS.map((r) => [r, 0]));
  const uses: Record<string, number> = {};

  const state: Record<string, Record<string, unknown>> = {};
  for (const d of DEFAULT_CATALOG) {
    const base: Record<string, unknown> = { id: d.id, kind: d.kind, room: d.room };
    if (d.kind === "light") Object.assign(base, { on: false, level: 0 });
    if (d.kind === "lock") Object.assign(base, { locked: true });
    if (d.kind === "thermostat") Object.assign(base, { target: 21, current: 21, heating: false });
    if (d.kind === "motion") Object.assign(base, { detected: false });
    if (d.kind === "speaker") Object.assign(base, { playing: false, volume: 30 });
    if (d.kind === "blinds") Object.assign(base, { position: 100 });
    state[d.id] = base;
  }
  const ids = Object.keys(state);
  const ofKind = (kind: string) => ids.filter((id) => state[id].kind === kind);
  const setLight = (id: string, level: number) => {
    if (!state[id]) return;
    state[id].level = level;
    state[id].on = level > 0;
  };
  const dark = () => isDarkAt(minute, DEFAULT_SUNRISE, DEFAULT_SUNSET);
  const stamp = () => fmtTime(minute);
  const send = (title: string, body = "") => {
    phone.push({ at: stamp(), title, body });
    if (phone.length > 30) phone.shift();
  };
  const between = (a: number, b: number) => (a <= b ? minute >= a && minute < b : minute >= a || minute < b);
  const houseAwake = () => ids.some((id) => state[id].on === true || state[id].playing === true || state[id].locked === false);
  const bedtime = () => {
    for (const id of [...ofKind("light"), ...ofKind("speaker")]) {
      state[id].on = false;
      if (state[id].kind === "light") state[id].level = 0;
      else state[id].playing = false;
    }
    state["front_lock"].locked = true;
    for (const id of ofKind("blinds")) state[id].position = 0;
  };

  const rules: Rule[] = [
    { name: "Welcome light", on: "motion", needs: [{ text: "it is dark", ok: dark }], then: (e) => setLight(`${e.payload.room}_light`, 60) },
    { name: "Lights off when empty", on: "motion_clear", needs: [], then: (e) => setLight(`${e.payload.room}_light`, 0) },
    { name: "Welcome home", on: "door", needs: [{ text: "open is true", ok: () => true }, { text: "it is dark", ok: dark }], then: () => setLight("hall_light", 70) },
    {
      name: "Goodnight",
      on: "time",
      needs: [{ text: "the time is between 23:00 and 05:00", ok: () => between(23 * 60, 5 * 60) }, { text: "something is still on or unlocked", ok: houseAwake }],
      then: bedtime,
    },
    {
      name: "Sunrise blinds",
      on: "time",
      needs: [{ text: "the time is between 07:00 and 10:00", ok: () => between(7 * 60, 10 * 60) }, { text: "living_blinds has position=0", ok: () => state["living_blinds"].position === 0 }],
      then: () => ofKind("blinds").forEach((id) => (state[id].position = 100)),
    },
    { name: "Heating notice", on: "heating", needs: [{ text: "on is true", ok: () => true }], then: () => send("Heating on", "The house fell below its target temperature.") },
  ];
  const status = rules.map((r) => ({ name: r.name, on: r.on, fired: 0, skipped: 0, failed: 0, result: "idle", last: `waiting for a ${r.on} event` }));
  const decisions: { seq: number; rule: string; result: string; why: string; event: string }[] = [];

  function emit(name: string, payload: Payload = {}): number {
    const ev: Ev = { seq: seq++, name, payload: { ...payload } };
    history.push(ev);
    if (history.length > 200) history.shift();
    let delivered = 0;
    const room = String(payload.room ?? "");
    if (name === "motion") {
      if (state[`${room}_motion`]) state[`${room}_motion`].detected = true;
      if (room in visits) visits[room] += 1;
      delivered += 2;
    } else if (name === "motion_clear") {
      if (state[`${room}_motion`]) state[`${room}_motion`].detected = false;
      delivered += 1;
    } else if (name === "temperature") {
      const t = state["thermostat"];
      if (typeof payload.value === "number") {
        const was = t.heating;
        t.current = payload.value;
        if (payload.value <= (t.target as number) - 0.5) t.heating = true;
        else if (payload.value >= (t.target as number)) t.heating = false;
        if (t.heating !== was) emit("heating", { on: t.heating });
      } else errors.push({ event: name, seq: ev.seq, handler: "wire_home.<locals>.on_temperature", error: "KeyError: 'value'" });
      delivered += 1;
    } else if (name === "time") {
      if (typeof payload.minute === "number") minute = ((Math.round(payload.minute) % 1440) + 1440) % 1440;
      delivered += 1;
    } else if (name === "door") {
      if (payload.open === true && dark()) send("Front door opened", "The front door opened after dark.");
      delivered += 1;
    }
    if (name.startsWith("rule.")) return delivered;
    rules.forEach((rule, i) => {
      if (rule.on !== name) return;
      if (name === "door" && payload.open !== true && rule.name === "Welcome home") {
        status[i].skipped += 1;
        status[i].result = "skipped";
        status[i].last = "needs: open is true";
        return;
      }
      const failing = rule.needs.find((n) => !n.ok());
      const fired = !failing;
      if (fired) rule.then(ev);
      status[i][fired ? "fired" : "skipped"] += 1;
      status[i].result = fired ? "fired" : "skipped";
      const why = fired ? [`${rule.on} event`, ...rule.needs.map((n) => n.text)].join(" and ") : `needs: ${failing!.text}`;
      status[i].last = why;
      decisions.push({ seq: ev.seq, rule: rule.name, result: fired ? "fired" : "skipped", why, event: name });
      if (decisions.length > 60) decisions.shift();
      if (fired) emit("rule.fired", { rule: rule.name, why, event: name, seq: ev.seq });
    });
    return delivered;
  }

  const audit = (line: string) => {
    calls.push(line);
    if (calls.length > 60) calls.shift();
  };
  const routines: Record<string, () => void> = {
    lights_off: () => ofKind("light").forEach((id) => setLight(id, 0)),
    lock_up: () => (state["front_lock"].locked = true),
    everything_off: () => {
      ofKind("light").forEach((id) => setLight(id, 0));
      state["living_speaker"].playing = false;
    },
    goodnight: () => {
      routines.everything_off();
      state["front_lock"].locked = true;
    },
    bedtime,
    sunrise: () => ofKind("blinds").forEach((id) => (state[id].position = 100)),
  };
  const presets: Record<string, [number, number | null]> = { movie: [15, 0], reading: [70, null], morning: [40, 100], night_light: [5, 0] };

  return createStaticProgram({
    vars: { SUNRISE: DEFAULT_SUNRISE, SUNSET: DEFAULT_SUNSET },
    hooks: {
      catalog: () => DEFAULT_CATALOG.map((d) => ({ id: d.id, kind: d.kind, room: d.room, title: d.title })),
      snapshot: () => JSON.parse(JSON.stringify(state)),
      command: (id: string, action: string, value: unknown) => {
        const d = state[id];
        let result: Record<string, unknown> = { ok: true };
        if (!d) result = { ok: false, error: `unknown device '${id}'` };
        else if (d.kind === "light" && (action === "on" || action === "off")) setLight(id, action === "on" ? 100 : 0);
        else if (d.kind === "light" && action === "dim" && typeof value === "number") setLight(id, Math.round(value));
        else if (d.kind === "lock" && (action === "lock" || action === "unlock")) d.locked = action === "lock";
        else if (d.kind === "speaker" && (action === "on" || action === "off")) d.playing = action === "on";
        else if (d.kind === "blinds" && action === "open") d.position = 100;
        else if (d.kind === "blinds" && action === "close") d.position = 0;
        else if (d.kind === "blinds" && action === "position" && typeof value === "number") d.position = Math.round(value);
        else if (d.kind === "thermostat" && action === "set_target" && typeof value === "number") d.target = value;
        else if (d.kind === "thermostat" && action === "measure" && typeof value === "number") d.current = value;
        else result = { ok: false, error: `${id} cannot '${action}'` };
        audit(`command('${id}', '${action}', ${JSON.stringify(value ?? null)}) -> ${JSON.stringify(result).slice(0, 40)}`);
        return result;
      },
      routine_names: () => Object.keys(routines),
      run_routine: (name: string) => {
        const r = routines[name];
        if (!r) return { ok: false, error: `no routine called '${name}'` };
        r();
        audit(`run_routine('${name}') -> {'ok': True, 'routine': '${name}'}`);
        return { ok: true, routine: name };
      },
      motion_detected: (room: string) => ({ ok: true, room }),
      busiest_rooms: () => ROOM_IDS.map((r) => ({ room: r, visits: visits[r] })).sort((a, b) => b.visits - a.visits || a.room.localeCompare(b.room)),
      preset_names: () => Object.keys(presets),
      run_preset: (name: string) => {
        const p = presets[name];
        if (!p) return { ok: false, error: `no preset called '${name}'` };
        ofKind("light").forEach((id) => setLight(id, p[0]));
        if (p[1] !== null) ofKind("blinds").forEach((id) => (state[id].position = p[1] as number));
        uses[name] = (uses[name] ?? 0) + 1;
        audit(`run_preset('${name}') -> {'ok': True, 'preset': '${name}', 'times': ${uses[name]}}`);
        return { ok: true, preset: name, times: uses[name] };
      },
      call_log: () => [...calls],
      world_event: (name: string, payload: Payload | null) => ({ ok: true, delivered: emit(name, payload ?? {}) }),
      event_log: (limit: number) => history.slice(-(limit || 40)),
      bus_errors: () => [...errors],
      notifications: () => [...phone],
      recent_events: (name: string, limit: number) => history.filter((e) => !name || e.name === name).slice(-Math.max(0, limit)),
      daylight_map: (step: number) => Array.from({ length: Math.floor(1440 / (step || 30)) }, (_, i) => ({ minute: i * (step || 30), dark: isDarkAt(i * (step || 30), DEFAULT_SUNRISE, DEFAULT_SUNSET) })),
      automations: () => ({ rules: status.map((s) => ({ ...s })), log: [...decisions] }),
      unread: () => [],
    },
  });
}
