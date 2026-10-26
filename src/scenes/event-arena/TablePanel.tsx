"use client";

import React from "react";
import { BarChart3, Trophy } from "lucide-react";
import { TEAMS } from "./sim";
import type { ArenaSnapshot } from "./driver";
import { Empty, Locked, Panel } from "./ui";

interface Props {
  snap: ArenaSnapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function StandingsPanel({ snap, unlocked, focus }: Props) {
  const on = unlocked.has("arena-standings");
  const rows = snap.standings;
  const playing = new Set([snap.home, snap.away]);
  return (
    <Panel title="League table" icon={<Trophy className="h-3.5 w-3.5" />} meta={on && rows ? `${snap.results.length} results` : "locked"} className={focus === "arena-standings" ? "pulse-ring" : ""}>
      {!on && (
        <div className="p-2">
          <Locked feature="arena-standings" title="Standings" need="standings(results)" spot={focus === "arena-standings"}>
            <div className="mt-2 space-y-1.5" aria-hidden>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-1.5 w-3 rounded-sm bg-white/[0.06]" />
                  <div className="h-1.5 w-16 rounded-sm bg-white/[0.07]" />
                  <div className="h-1.5 flex-1 rounded-sm bg-white/[0.04]" />
                  <div className="h-1.5 w-5 rounded-sm bg-white/[0.07]" />
                </div>
              ))}
            </div>
          </Locked>
        </div>
      )}
      {on && !rows && <Empty>standings(results) did not return a list of rows. Check what it returns.</Empty>}
      {on && rows && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[300px] border-collapse text-[11px]">
            <thead>
              <tr className="hud-label text-left">
                <th className="w-6 px-2 py-1.5 font-medium">#</th>
                <th className="px-1 py-1.5 font-medium">Team</th>
                {["P", "W", "D", "L", "GD"].map((h) => (
                  <th key={h} className="w-7 px-1 py-1.5 text-right font-medium">
                    {h}
                  </th>
                ))}
                <th className="w-9 px-2 py-1.5 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={String(row.team)} className={`border-t border-white/[0.05] ${playing.has(String(row.team)) ? "bg-white/[0.04]" : ""}`}>
                  <td className="hud-value px-2 py-1 text-white/45">{i + 1}</td>
                  <td className="px-1 py-1 text-white/90">
                    <span className="mr-1.5 font-mono text-[9.5px] text-white/40">{TEAMS[String(row.team)]?.short ?? "—"}</span>
                    {String(row.name ?? row.team)}
                  </td>
                  {[row.played, row.won, row.drawn, row.lost, row.goalDifference].map((v, j) => (
                    <td key={j} className="hud-value px-1 py-1 text-right text-white/65">
                      {j === 4 && num(v) > 0 ? "+" : ""}
                      {num(v)}
                    </td>
                  ))}
                  <td className="hud-value hud-accent px-2 py-1 text-right font-semibold">{num(row.points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const COLUMNS: { key: string; label: string; get: (s: Record<string, unknown>, team: string) => number }[] = [
  { key: "goals", label: "Goals", get: (s, t) => num(isRecord(s.goals) ? s.goals[t] : 0) },
  { key: "fouls", label: "Fouls", get: (s, t) => num(isRecord(s.discipline) && isRecord(s.discipline.fouls) ? s.discipline.fouls[t] : 0) },
  { key: "yellow", label: "Yellow", get: (s, t) => num(isRecord(s.discipline) && isRecord(s.discipline.yellow) ? s.discipline.yellow[t] : 0) },
  { key: "red", label: "Red", get: (s, t) => num(isRecord(s.discipline) && isRecord(s.discipline.red) ? s.discipline.red[t] : 0) },
  { key: "timeouts", label: "T/O", get: (s, t) => num(isRecord(s.timeouts) ? s.timeouts[t] : 0) },
];

export function StatsPanel({ snap, unlocked, focus }: Props) {
  const on = unlocked.has("arena-stats");
  const stats = snap.stats;
  const names = stats ? Object.keys(stats) : [];
  const extras = names.filter((n) => !["goals", "discipline", "timeouts"].includes(n));
  return (
    <Panel title="Stats desk" icon={<BarChart3 className="h-3.5 w-3.5" />} meta={on && stats ? `${names.length} reporters` : "locked"} className={focus === "arena-stats" ? "pulse-ring" : ""}>
      {!on && (
        <div className="p-2">
          <Locked feature="arena-stats" title="Reporters" need="reporters, reportAll(event), summaries()" spot={focus === "arena-stats"} />
        </div>
      )}
      {on && !stats && <Empty>summaries() did not return an object. Each reporter&apos;s summary() should appear under its name.</Empty>}
      {on && stats && (
        <div className="space-y-2 p-2.5">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="hud-label text-right">
                <th className="px-1 py-1 text-left font-medium">This match</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-1 py-1 font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[snap.home, snap.away].map((team) => (
                <tr key={team} className="border-t border-white/[0.05]">
                  <td className="px-1 py-1 text-white/90">{TEAMS[team]?.name}</td>
                  {COLUMNS.map((c) => {
                    const v = c.get(stats, team);
                    return (
                      <td key={c.key} className={`hud-value px-1 py-1 text-right ${v > 0 ? "hud-accent" : "text-white/35"}`}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {extras.length > 0 && (
            <div className="space-y-1">
              {extras.map((name) => (
                <div key={name} className="flex min-w-0 gap-2 text-[10.5px]">
                  <span className="hud-label shrink-0">{name}</span>
                  <span className="hud-value min-w-0 truncate text-white/60">{JSON.stringify(stats[name])}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10.5px] text-white/35">Registered reporters: {names.join(", ") || "none"}</p>
        </div>
      )}
    </Panel>
  );
}
