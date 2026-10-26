"use client";

import React, { useState } from "react";
import { Pause, Play, SkipForward, StepForward, Star } from "lucide-react";
import { TEAMS } from "./sim";
import type { ArenaDriver, ArenaSnapshot, FeedItem } from "./driver";
import { BTN, BTN_ON, Chip, Locked, Panel, TYPE_STYLE, TypeDot } from "./ui";

interface Props {
  snap: ArenaSnapshot;
  driver: ArenaDriver;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
  fresh: ReadonlySet<string>;
}

function Crest({ id, className = "" }: { id: string; className?: string }) {
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] font-mono text-[10px] font-semibold tracking-wider text-white/80 ${className}`} aria-hidden>
      {TEAMS[id]?.short ?? "???"}
    </span>
  );
}

export function Scoreboard({ snap, unlocked, focus }: Pick<Props, "snap" | "unlocked" | "focus">) {
  const scoreOn = unlocked.has("arena-scoreboard");
  const clockOn = unlocked.has("arena-clock");
  const home = snap.scores?.[snap.home];
  const away = snap.scores?.[snap.away];
  const mismatch = scoreOn && snap.scores !== null && (home !== snap.truth.home || away !== snap.truth.away);

  const score = (value: number | undefined, key: string) => (
    <span key={`${key}-${value ?? "x"}`} className={`hud-value block min-w-[1.6ch] text-center text-[34px] leading-none ${scoreOn && value !== undefined ? "hud-accent arena-pop" : "text-white/20"}`}>
      {scoreOn && value !== undefined ? value : "–"}
    </span>
  );

  return (
    <div className={`hud-panel !p-3 ${focus === "arena-scoreboard" || focus === "arena-clock" ? "pulse-ring" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="hud-label">Semi-final · pitch 1</span>
        <Chip tone={snap.status === "live" ? "ok" : "plain"}>{snap.status === "live" ? "● LIVE" : "FULL TIME"}</Chip>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Crest id={snap.home} />
          <div className="min-w-0">
            <div className="hud-title truncate">{TEAMS[snap.home]?.name}</div>
            <div className="hud-label truncate">Home</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {score(home, "h")}
          <span className="text-white/25">:</span>
          {score(away, "a")}
        </div>
        <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
          <Crest id={snap.away} />
          <div className="min-w-0">
            <div className="hud-title truncate">{TEAMS[snap.away]?.name}</div>
            <div className="hud-label truncate">Away</div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <span className={`hud-value text-[15px] ${clockOn && snap.clock ? "hud-accent" : "text-white/25"}`}>{clockOn && snap.clock ? snap.clock : "--:--"}</span>
        <span className="hud-label">{snap.minute}′ of 90</span>
      </div>
      {!scoreOn && (
        <p className="mt-1.5 text-center text-[10.5px] text-white/40">
          Scores wait for <code className="font-mono text-white/60">createScoreboard()</code> · lesson 2{unlocked.has("arena-clock") ? "" : " · clock: lesson 3"}
        </p>
      )}
      {scoreOn && !clockOn && <p className="mt-1.5 text-center text-[10.5px] text-white/40">The clock waits for <code className="font-mono text-white/60">matchClock.display()</code> · lesson 3</p>}
      {mismatch && (
        <p className="mt-1.5 text-center text-[10.5px] text-[#fbbf24]">
          Stadium count is {snap.truth.home}–{snap.truth.away}: your scoreboard disagrees. Is every goal reaching <code className="font-mono">scoreboard.add()</code>?
        </p>
      )}
    </div>
  );
}

function Controls({ snap, driver, interactive }: Pick<Props, "snap" | "driver" | "interactive">) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={snap.running ? BTN : BTN_ON} onClick={() => driver.setRunning(!snap.running)} disabled={!interactive} aria-label={snap.running ? "Pause the match" : "Play the match"}>
        {snap.running ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        {snap.running ? "Pause" : "Play"}
      </button>
      <div className="flex rounded-full border border-white/12 p-0.5" role="group" aria-label="Speed">
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            disabled={!interactive}
            onClick={() => driver.setSpeed(s)}
            aria-pressed={snap.speed === s}
            className={`h-6 rounded-full px-2 font-mono text-[10.5px] font-semibold transition-colors ${snap.speed === s ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"}`}
          >
            {s}×
          </button>
        ))}
      </div>
      <button type="button" className={BTN} onClick={() => driver.stepOnce()} disabled={!interactive || snap.status === "full-time"}>
        <StepForward className="h-3 w-3" />
        Step
      </button>
      <button type="button" className={BTN} onClick={() => driver.newMatch()} disabled={!interactive}>
        <SkipForward className="h-3 w-3" />
        Next match
      </button>
    </div>
  );
}

function Injectors({ snap, driver, interactive }: Pick<Props, "snap" | "driver" | "interactive">) {
  const disabled = !interactive || snap.status === "full-time";
  const row = (side: "home" | "away") => {
    const team = side === "home" ? snap.home : snap.away;
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <span className="hud-label w-9 shrink-0">{TEAMS[team]?.short}</span>
        {(["goal", "foul", "timeout", "card"] as const).map((type) => (
          <button key={type} type="button" disabled={disabled} onClick={() => driver.inject(type, side)} className={`${BTN} !h-6 !px-2 !text-[10.5px]`} title={`Make ${TEAMS[team]?.name} cause a ${type}`}>
            <TypeDot type={type} />
            {TYPE_STYLE[type].label}
          </button>
        ))}
        <button type="button" disabled={disabled} onClick={() => driver.inject("card", side, { detail: "red" })} className={`${BTN} !h-6 !px-2 !text-[10.5px]`} title="Show a red card">
          <span className="h-2 w-1.5 rounded-[1px] bg-[#f87171]" aria-hidden />
          Red
        </button>
      </div>
    );
  };
  return (
    <div className="space-y-1">
      <div className="hud-label">Make something happen</div>
      {row("home")}
      {row("away")}
    </div>
  );
}

function FeedRow({ item, ghost }: { item: FeedItem; ghost: boolean }) {
  const { event } = item;
  return (
    <li className="arena-slide flex min-w-0 items-start gap-2 border-b border-white/[0.05] px-3 py-1.5 last:border-b-0">
      <span className="hud-value w-8 shrink-0 text-right text-[10.5px] text-white/50">{event.minute}′</span>
      <TypeDot type={event.type} className="mt-[5px]" />
      <div className="min-w-0 flex-1">
        {ghost ? (
          <span className="block truncate font-mono text-[11px] text-white/25">
            {event.type} · {event.team}
            {event.player ? ` · ${event.player}` : ""}
          </span>
        ) : (
          <span className={`block break-words text-[11.5px] leading-snug ${item.line === null ? "text-white/30" : "text-white/90"}`}>{item.line ?? "…"}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {item.highlight && <Star className="h-3 w-3 fill-[#c5ee8a] text-[#c5ee8a]" aria-label="highlight" />}
        {item.ran !== null && <Chip>→ {item.ran}</Chip>}
        {item.outcome && <Chip tone={item.outcome === "delivered" ? "ok" : item.outcome === "dropped" ? "warn" : "bad"}>{item.outcome}</Chip>}
      </div>
    </li>
  );
}

export function MatchPanel({ snap, driver, unlocked, focus, interactive, fresh }: Props) {
  const feedOn = unlocked.has("arena-feed");
  const reelOn = unlocked.has("arena-highlights");
  const [only, setOnly] = useState(false);
  const showReel = reelOn && only;
  const items = showReel ? snap.reel : snap.feed;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <Scoreboard snap={snap} unlocked={unlocked} focus={focus} />
      <div className="hud-panel !p-2.5 space-y-2">
        <Controls snap={snap} driver={driver} interactive={interactive} />
        <Injectors snap={snap} driver={driver} interactive={interactive} />
      </div>
      <Panel
        title="Live feed"
        className={`flex-1 ${focus === "arena-feed" || focus === "arena-highlights" ? "pulse-ring" : ""}`}
        bodyClassName="flex min-h-0 flex-col"
        meta={feedOn ? `${snap.feed.length} lines` : "locked"}
        actions={
          reelOn ? (
            <div className="flex rounded-full border border-white/12 p-0.5" role="group" aria-label="Feed filter">
              <button type="button" aria-pressed={!only} onClick={() => setOnly(false)} className={`h-5 rounded-full px-2 text-[10px] font-medium ${!only ? "bg-white/15 text-white" : "text-white/50"}`}>
                All
              </button>
              <button type="button" aria-pressed={only} onClick={() => setOnly(true)} className={`flex h-5 items-center gap-1 rounded-full px-2 text-[10px] font-medium ${only ? "bg-white/15 text-white" : "text-white/50"}`}>
                <Star className="h-2.5 w-2.5 fill-current" />
                {snap.reel.length}
              </button>
            </div>
          ) : null
        }
      >
        {!feedOn && (
          <div className="p-2">
            <Locked feature="arena-feed" title="Commentary" need="describeEvent(event)" spot={focus === "arena-feed"} compact />
          </div>
        )}
        {feedOn && !reelOn && (
          <p className="px-3 pt-1.5 text-[10.5px] text-white/35">
            Highlight star &amp; reel: <code className="font-mono text-white/55">isHighlight()</code> · lesson 4
          </p>
        )}
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          {items.length === 0 && <li className="px-3 py-3 text-[11px] text-white/40">{showReel ? "No highlights yet. A goal, a red card or anything after 85′ qualifies." : "Waiting for the first event…"}</li>}
          {items.map((item) => (
            <FeedRow key={item.key} item={item} ghost={!feedOn} />
          ))}
        </ul>
        {fresh.has("arena-feed") && <span className="sr-only">Commentary just switched on</span>}
      </Panel>
    </div>
  );
}
