"use client";

import React from "react";
import {
  Bell,
  Clapperboard,
  DoorClosed,
  DoorOpen,
  Flame,
  Footprints,
  History,
  ListChecks,
  Lock,
  Moon,
  Pause,
  Play,
  Radio,
  ScrollText,
  ShieldAlert,
  Smartphone,
  Sun,
  Zap,
} from "lucide-react";
import { COLOR, KIND_FEATURE, ROOMS, ROOM_IDS, fmtTemp, fmtTime, isKind, isDarkAt, payloadText, type CatalogDevice, type DeviceState, type Place } from "./model";
import { dev, type HomeRuntime, type View } from "./runtime";

// ───────────────────────── frames ─────────────────────────

export function PanelFrame({
  id,
  title,
  icon,
  meta,
  focus,
  flash,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section data-panel={id} className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

const GHOST_BAR = "rounded-sm bg-white/[0.05]";

export function LockedPanel({ id, title, lesson, clause, spot }: { id: string; title: string; lesson: number; clause: string; spot: boolean }) {
  return (
    <section
      data-panel={id}
      data-locked=""
      className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}
    >
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`${GHOST_BAR} h-1.5 w-5 shrink-0`} />
            <div className={`${GHOST_BAR} h-1.5 flex-1`} style={{ maxWidth: `${88 - i * 18}%` }} />
          </div>
        ))}
      </div>
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="hud-muted py-1 text-[11px] leading-snug">{children}</p>;

const words = (s: string) => s.replace(/_/g, " ");

// ───────────────────────── status + world controls ─────────────────────────

export function StatusStrip({ view }: { view: View }) {
  const dark = isDarkAt(view.minute, view.sunrise, view.sunset);
  const heating = view.devices["thermostat"]?.heating === true;
  return (
    <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-0.5">
      <h2 className="hud-title shrink-0">12 Maple Street</h2>
      <span className="hud-value inline-flex shrink-0 items-center gap-1.5 text-[12px]">
        {dark ? <Moon className="h-3.5 w-3.5 text-white/60" aria-label="dark" /> : <Sun className="h-3.5 w-3.5 text-[#fbbf24]" aria-label="daylight" />}
        {fmtTime(view.minute)}
      </span>
      <span className="hud-value hud-muted shrink-0 text-[11px]">outside {fmtTemp(view.outdoor)}</span>
      <span className="hud-value shrink-0 text-[11px]">inside {fmtTemp(view.indoor)}</span>
      {heating && (
        <span className="hud-tag hud-warning gap-1 border-[#ffb26b]/30">
          <Flame className="h-3 w-3" aria-hidden /> heating
        </span>
      )}
    </div>
  );
}

const WALK: { place: Place; label: string }[] = [
  { place: "hall", label: "Hall" },
  { place: "living", label: "Living" },
  { place: "kitchen", label: "Kitchen" },
  { place: "bedroom", label: "Bedroom" },
  { place: "outside", label: "Outside" },
];

const TIME_PRESETS: { minute: number; label: string }[] = [
  { minute: 390, label: "Dawn 06:30" },
  { minute: 12 * 60, label: "Noon" },
  { minute: 18 * 60, label: "Dusk 18:00" },
  { minute: 21 * 60, label: "Evening" },
  { minute: 23 * 60, label: "Night 23:00" },
  { minute: 7 * 60 + 30, label: "Morning 07:30" },
];

export function WorldControls({ rt, view, unlocked }: { rt: HomeRuntime; view: View; unlocked: ReadonlySet<string> }) {
  const sunriseP = (view.sunrise / 1440) * 100;
  const sunsetP = (view.sunset / 1440) * 100;
  const strip =
    unlocked.has("sh-timeline") && view.dayMap.length > 1
      ? `linear-gradient(90deg, ${view.dayMap
          .map((d, i) => {
            const a = (i / view.dayMap.length) * 100;
            const b = ((i + 1) / view.dayMap.length) * 100;
            const c = d.dark ? "#1d2430" : "#d3f3a4";
            return `${c} ${a.toFixed(2)}% ${b.toFixed(2)}%`;
          })
          .join(",")})`
      : `linear-gradient(90deg, #1d2430 0% ${sunriseP}%, #55575a ${sunriseP}% ${sunsetP}%, #1d2430 ${sunsetP}% 100%)`;
  return (
    <section data-panel="world" className="hud-panel mb-3 px-3 py-2.5">
      <header className="mb-2 flex items-center gap-2">
        <span className="shrink-0 text-white/60">
          <Footprints className="h-3.5 w-3.5" />
        </span>
        <h3 className="hud-title flex-1">The world · you control it</h3>
      </header>

      <p className="hud-label mb-1">Walk to</p>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {WALK.map((w) => (
          <button
            key={w.place}
            type="button"
            className={`hud-btn !h-7 !px-2.5 !text-[11px] ${view.place === w.place ? "hud-btn-on" : ""}`}
            onClick={() => rt.walkTo(w.place)}
            aria-pressed={view.place === w.place}
          >
            {w.label}
          </button>
        ))}
        <button type="button" className={`hud-btn !h-7 !px-2.5 !text-[11px] ${view.doorOpen ? "hud-btn-on" : ""}`} onClick={() => rt.toggleDoor()} aria-pressed={view.doorOpen}>
          {view.doorOpen ? <DoorOpen className="h-3.5 w-3.5" /> : <DoorClosed className="h-3.5 w-3.5" />}
          {view.doorOpen ? "Close door" : "Open door"}
        </button>
      </div>

      <div className="mb-2.5">
        <div className="mb-1 flex items-center gap-2">
          <label htmlFor="sh-time" className="hud-label flex-1">
            Time of day
          </label>
          <span className="hud-value text-[12px]">{fmtTime(view.minute)}</span>
          <button type="button" className={`hud-btn !h-6 !px-2 !text-[10.5px] ${view.playing ? "hud-btn-on" : ""}`} onClick={() => rt.togglePlay()} aria-pressed={view.playing}>
            {view.playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" fill="currentColor" />}
            {view.playing ? "Pause" : "Play day"}
          </button>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full opacity-80" style={{ background: strip }} />
          <input
            id="sh-time"
            type="range"
            min={0}
            max={1439}
            step={5}
            value={Math.round(view.minute)}
            onChange={(e) => rt.setMinute(Number(e.target.value))}
            className="relative block h-5 w-full cursor-pointer appearance-none bg-transparent accent-[#c5ee8a] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {TIME_PRESETS.map((t) => (
            <button key={t.minute} type="button" className="hud-btn !h-6 !px-2 !text-[10.5px]" onClick={() => rt.setMinute(t.minute, true)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label htmlFor="sh-outdoor" className="hud-label">
          Outdoor temperature
        </label>
        <span className="hud-value text-[12px]">{fmtTemp(view.outdoor)}</span>
        <input
          id="sh-outdoor"
          type="range"
          min={-15}
          max={40}
          step={1}
          value={view.outdoor}
          onChange={(e) => rt.setOutdoor(Number(e.target.value))}
          className="h-5 min-w-[7rem] flex-1 cursor-pointer accent-[#c5ee8a]"
        />
        {unlocked.has("sh-eventlog") && (
          <button type="button" className="hud-btn !h-6 !px-2 !text-[10.5px]" onClick={() => rt.sendBrokenReading()} title="Publish a temperature event with no value">
            <ShieldAlert className="h-3 w-3" /> Send a broken reading
          </button>
        )}
      </div>
    </section>
  );
}

// ───────────────────────── device inspector ─────────────────────────

interface ActionSpec {
  label: string;
  action: string;
  value?: unknown;
}

function actionsFor(kind: string, state: DeviceState | undefined): ActionSpec[] {
  switch (kind) {
    case "light":
      return [
        { label: "On", action: "on" },
        { label: "Off", action: "off" },
        { label: "Dim 30", action: "dim", value: 30 },
        { label: "Dim 70", action: "dim", value: 70 },
      ];
    case "lock":
      return [
        { label: "Lock", action: "lock" },
        { label: "Unlock", action: "unlock" },
      ];
    case "thermostat":
      return [
        { label: "Target -1", action: "set_target", value: dev.target(state) - 1 },
        { label: "Target +1", action: "set_target", value: dev.target(state) + 1 },
      ];
    case "speaker":
      return [
        { label: "Play", action: "on" },
        { label: "Stop", action: "off" },
        { label: "Vol -20", action: "volume", value: dev.volume(state) - 20 },
        { label: "Vol +20", action: "volume", value: dev.volume(state) + 20 },
      ];
    case "blinds":
      return [
        { label: "Open", action: "open" },
        { label: "Close", action: "close" },
        { label: "Half", action: "position", value: 50 },
      ];
    case "motion":
      return [
        { label: "Trigger", action: "trigger" },
        { label: "Clear", action: "clear" },
      ];
    default:
      return [];
  }
}

const LESSON_FOR: Record<string, number> = { "sh-lights": 2, "sh-lock": 3, "sh-climate": 3, "sh-sensors": 4, "sh-comfort": 4 };

function stateText(state: DeviceState | undefined): string {
  if (!state) return "";
  return Object.entries(state)
    .filter(([k, v]) => !["id", "kind", "room"].includes(k) && (typeof v === "number" || typeof v === "boolean" || typeof v === "string"))
    .map(([k, v]) => `${k} ${typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(1)) : String(v)}`)
    .join(" · ");
}

export function Inspector({ rt, view, unlocked, selected }: { rt: HomeRuntime; view: View; unlocked: ReadonlySet<string>; selected: string | null }) {
  const device: CatalogDevice | undefined = view.catalog.find((d) => d.id === selected);
  const feature = device && isKind(device.kind) ? KIND_FEATURE[device.kind] : "sh-lights";
  const state = device ? view.devices[device.id] : undefined;
  const live = !!device && !!state && unlocked.has(feature) && view.hasProgram;
  return (
    <section data-panel="inspector" className="hud-panel mb-3 px-3 py-2.5">
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <Zap className="h-3.5 w-3.5" />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{device ? device.title : "Device inspector"}</h3>
        {device && <span className="hud-value hud-muted shrink-0 text-[10px]">{device.id}</span>}
      </header>
      <div className="mb-2 flex flex-wrap gap-1">
        {view.catalog.map((d) => {
          const f = isKind(d.kind) ? KIND_FEATURE[d.kind] : "sh-lights";
          const on = unlocked.has(f) && !!view.devices[d.id] && view.hasProgram;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => rt.selectDevice(selected === d.id ? null : d.id)}
              className={`hud-tag !h-5 cursor-pointer gap-1 !px-1.5 !text-[9.5px] font-medium ${selected === d.id ? "!border-white/60" : ""} ${on ? "" : "text-white/40"}`}
              aria-pressed={selected === d.id}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: on ? COLOR.lime : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1px #777" }} />
              {d.id.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>
      {!device ? (
        <Empty>Tap a device on the plan, or a chip above, to look at it and send it commands.</Empty>
      ) : live ? (
        <>
          <p className="hud-value mb-2 text-[11px]">
            <span className="hud-muted">{ROOMS[device.room as keyof typeof ROOMS]?.label ?? device.room} · </span>
            <span className="hud-accent">{stateText(state) || "no readings"}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {actionsFor(device.kind, state).map((a) => (
              <button key={a.label} type="button" className="hud-btn !h-6 !px-2 !text-[10.5px]" onClick={() => rt.command(device.id, a.action, a.value)}>
                {a.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Empty>
          {view.fromProgram ? `${device.title} is in your catalog but is not a real object yet.` : "This device appears on the plan once your catalog() runs."} It comes alive in lesson{" "}
          {LESSON_FOR[feature] ?? 2}.
        </Empty>
      )}
      {view.message && (
        <p className={`mt-2 text-[11px] leading-snug ${view.message.tone === "bad" ? "hud-danger" : view.message.tone === "warn" ? "hud-warning" : "hud-muted"}`} role="status">
          {view.message.text}
        </p>
      )}
    </section>
  );
}

// ───────────────────────── program panels ─────────────────────────

export function RoutinesPanel({ rt, view }: { rt: HomeRuntime; view: View }) {
  return (
    <>
      {view.routines.length === 0 ? (
        <Empty>routine_names() returned nothing yet.</Empty>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {view.routines.map((name) => (
            <button key={name} type="button" className="hud-btn !h-7 !px-2.5 !text-[11px]" onClick={() => rt.runRoutine(name)}>
              {words(name)}
            </button>
          ))}
        </div>
      )}
      <p className="hud-label mt-2 text-white/35">one button per key in ROUTINES</p>
    </>
  );
}

export function ScenesPanel({ rt, view }: { rt: HomeRuntime; view: View }) {
  return (
    <>
      {view.presets.length === 0 ? (
        <Empty>preset_names() returned nothing yet.</Empty>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {view.presets.map((name) => (
            <button key={name} type="button" className="hud-btn !h-7 !px-2.5 !text-[11px]" onClick={() => rt.runPreset(name)}>
              {words(name)}
              {(view.presetUses[name] ?? 0) > 0 && <span className="hud-value hud-accent text-[10px]">×{view.presetUses[name]}</span>}
            </button>
          ))}
        </div>
      )}
      <p className="hud-label mt-2 text-white/35">built by function factories</p>
    </>
  );
}

const FILTERS = ["", "motion", "motion_clear", "door", "temperature", "time", "heating", "rule.fired"];

export function EventLogPanel({ rt, view, unlocked }: { rt: HomeRuntime; view: View; unlocked: ReadonlySet<string> }) {
  const timeline = unlocked.has("sh-timeline");
  const lines = [...view.events].reverse().slice(0, 40);
  return (
    <>
      {timeline && (
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f || "all"}
              type="button"
              onClick={() => rt.setFilter(f)}
              aria-pressed={view.filter === f}
              className={`hud-tag !h-5 cursor-pointer !px-1.5 !text-[9.5px] font-medium ${view.filter === f ? "!border-transparent !bg-[#c5ee8a] !text-[#0a0a0a]" : "text-white/60"}`}
            >
              {f || "all"}
            </button>
          ))}
          <button type="button" className="hud-btn !h-5 !px-2 !text-[9.5px]" onClick={() => rt.checkUnread()} title="Calls your unread() and its EventCursor">
            <History className="h-3 w-3" /> What did I miss?
          </button>
        </div>
      )}
      {view.unread && (
        <div className="mb-2 rounded-md border border-[#c5ee8a]/25 bg-[#c5ee8a]/[0.05] px-2 py-1.5">
          <div className="flex items-center gap-2">
            <span className="hud-label hud-accent flex-1">Since you last looked: {view.unread.length} event{view.unread.length === 1 ? "" : "s"}</span>
            <button type="button" className="hud-label hover:text-white" onClick={() => rt.clearUnread()}>
              dismiss
            </button>
          </div>
          <p className="hud-value mt-0.5 break-words text-[10.5px] text-white/75">
            {view.unread.length === 0
              ? "Nothing new: the cursor remembers where you stopped."
              : Object.entries(
                  view.unread.reduce<Record<string, number>>((acc, e) => {
                    acc[e.name] = (acc[e.name] ?? 0) + 1;
                    return acc;
                  }, {}),
                )
                  .map(([n, c]) => `${n} ×${c}`)
                  .join(" · ")}
          </p>
        </div>
      )}
      {lines.length === 0 ? (
        <Empty>No events yet. Walk to another room, open the door or move the clock.</Empty>
      ) : (
        <ol className="hud-log max-h-[13rem] space-y-px overflow-y-auto pr-1 text-[10.5px]">
          {lines.map((e) => (
            <li key={e.seq} className="flex min-w-0 items-baseline gap-2">
              <span className="hud-muted w-8 shrink-0 text-right tabular-nums">#{e.seq}</span>
              <span className={`shrink-0 font-medium ${e.name === "rule.fired" ? "hud-accent" : e.name === "heating" ? "hud-warning" : "text-white/90"}`}>{e.name}</span>
              <span className="hud-muted min-w-0 truncate" title={JSON.stringify(e.payload)}>
                {payloadText(e.payload)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function DeadLettersPanel({ view }: { view: View }) {
  const lines = [...view.errors].reverse().slice(0, 8);
  if (lines.length === 0) return <Empty>No handler has failed. Try &ldquo;Send a broken reading&rdquo; in the controls, or walk to a room that does not exist.</Empty>;
  return (
    <ul className="space-y-1.5">
      {lines.map((e, i) => (
        <li key={`${e.seq}-${i}`} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
          <p className="hud-value truncate text-[11px]">
            <span className="hud-danger">{e.error}</span>
          </p>
          <p className="hud-muted truncate font-mono text-[10px]">
            {e.handler} · {e.event} #{e.seq}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function AuditPanel({ view }: { view: View }) {
  const lines = [...view.calls].reverse().slice(0, 14);
  if (lines.length === 0) return <Empty>Nothing has called your decorated functions yet. Tap a routine, a scene or a device command.</Empty>;
  return (
    <ol className="hud-log max-h-[11rem] space-y-px overflow-y-auto pr-1 text-[10.5px]">
      {lines.map((l, i) => (
        <li key={`${i}-${l}`} className="hud-log-line truncate" title={l}>
          {l}
        </li>
      ))}
    </ol>
  );
}

export function PhonePanel({ view }: { view: View }) {
  const lines = [...view.phone].reverse().slice(0, 6);
  if (lines.length === 0) return <Empty>No messages. Open the front door after dark and your DoorWatch will text you.</Empty>;
  return (
    <ul className="space-y-1.5">
      {lines.map((m, i) => (
        <li key={`${i}-${m.at}-${m.title}`} className="flex min-w-0 items-start gap-2 rounded-md bg-white/[0.05] px-2 py-1.5">
          <Bell className="mt-0.5 h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[11.5px] font-medium">{m.title}</span>
            {m.body && <span className="hud-muted block truncate text-[10.5px]">{m.body}</span>}
          </span>
          <span className="hud-value hud-muted shrink-0 text-[10px]">{m.at}</span>
        </li>
      ))}
    </ul>
  );
}

export function AutomationsPanel({ view }: { view: View }) {
  const decisions = [...view.decisions].reverse().slice(0, 6);
  if (view.rules.length === 0) return <Empty>No rules yet. Add rules to your RuleEngine and they will be listed here.</Empty>;
  return (
    <>
      <ul className="space-y-1.5">
        {view.rules.map((r) => (
          <li key={r.name} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: r.result === "fired" ? COLOR.lime : r.result === "failed" ? COLOR.danger : "transparent", boxShadow: r.result === "idle" || r.result === "skipped" ? "inset 0 0 0 1px #777" : "none" }}
              />
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">{r.name}</span>
              <span className="hud-tag !h-4 shrink-0 !px-1.5 !text-[9px] font-medium text-white/55">on {r.on || "?"}</span>
              <span className="hud-value shrink-0 text-[10px]">
                <span className="hud-accent">{r.fired}</span>
                <span className="hud-muted"> fired · {r.skipped} skipped</span>
                {r.failed > 0 && <span className="hud-danger"> · {r.failed} failed</span>}
              </span>
            </div>
            <p className={`mt-0.5 break-words font-mono text-[10px] leading-snug ${r.result === "fired" ? "text-white/80" : r.result === "failed" ? "hud-danger" : "hud-muted"}`}>
              {r.result === "fired" ? "because " : ""}
              {r.last || "waiting"}
            </p>
          </li>
        ))}
      </ul>
      {decisions.length > 0 && (
        <>
          <p className="hud-label mb-1 mt-2.5">Recent decisions</p>
          <ol className="hud-log space-y-px text-[10.5px]">
            {decisions.map((d, i) => (
              <li key={`${d.seq}-${i}`} className="min-w-0 truncate" title={`${d.rule}: ${d.why}`}>
                <span className={d.result === "fired" ? "hud-accent" : d.result === "failed" ? "hud-danger" : "hud-muted"}>{d.result}</span> <span className="text-white/85">{d.rule}</span>
                <span className="hud-muted"> · {d.why}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

export function TrafficBar({ view }: { view: View }) {
  const ranked = ROOM_IDS.map((r) => ({ r, n: view.visits[r] ?? 0 })).sort((a, b) => b.n - a.n);
  const total = ranked.reduce((s, x) => s + x.n, 0);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5">
      <span className="hud-label inline-flex items-center gap-1.5">
        <Footprints className="h-3 w-3 text-[#c5ee8a]" aria-hidden /> Busiest rooms
      </span>
      {total === 0 ? (
        <span className="hud-muted text-[11px]">no visits yet: walk about</span>
      ) : (
        ranked.map((x, i) => (
          <span key={x.r} className={`hud-value text-[11px] ${i === 0 ? "hud-accent" : x.n === 0 ? "hud-muted" : ""}`}>
            {ROOMS[x.r].label} {x.n}
          </span>
        ))
      )}
    </div>
  );
}

// ───────────────────────── panel catalogue ─────────────────────────

export const PANEL_DEFS = [
  { id: "sh-routines", title: "Routines", lesson: 5, clause: "ROUTINES = {name: function}", icon: <ListChecks className="h-3.5 w-3.5" /> },
  { id: "sh-scenes", title: "Scenes", lesson: 7, clause: "dim_lights(15) · chain(...)", icon: <Clapperboard className="h-3.5 w-3.5" /> },
  { id: "sh-automations", title: "Automations", lesson: 14, clause: "Rule(on, when, then)", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "sh-eventlog", title: "Event log", lesson: 9, clause: "bus.emit(name, payload)", icon: <Radio className="h-3.5 w-3.5" /> },
  { id: "sh-phone", title: "Phone", lesson: 12, clause: "Notifier.send(...)", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { id: "sh-resilience", title: "Dead letters", lesson: 10, clause: "ResilientBus._deliver", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  { id: "sh-audit", title: "Audit trail", lesson: 8, clause: "@logged", icon: <ScrollText className="h-3.5 w-3.5" /> },
] as const;

export type PanelId = (typeof PANEL_DEFS)[number]["id"];

export function panelMeta(id: PanelId, view: View): React.ReactNode {
  switch (id) {
    case "sh-routines":
      return `${view.routines.length}`;
    case "sh-scenes":
      return `${view.presets.length}`;
    case "sh-automations":
      return `${view.rules.length} rules`;
    case "sh-eventlog":
      return `${view.events.length} events`;
    case "sh-phone":
      return `${view.phone.length} msg`;
    case "sh-resilience":
      return `${view.errors.length}`;
    case "sh-audit":
      return `${view.calls.length} calls`;
  }
}

