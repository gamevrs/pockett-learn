"use client";

import React from "react";
import { AlertTriangle, Radio, Send, Skull } from "lucide-react";
import type { ArenaDriver, ArenaSnapshot } from "./driver";
import { BTN, Chip, Locked, Notice, Panel, TYPE_STYLE, TypeDot } from "./ui";

interface Props {
  snap: ArenaSnapshot;
  driver: ArenaDriver;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
  hasProgram: boolean;
}

const ROWS = ["goal", "foul", "timeout", "card", "*"];

export function BusPanel({ snap, driver, unlocked, focus, interactive, hasProgram }: Props) {
  const on = unlocked.has("arena-bus");
  const hard = unlocked.has("arena-resilience");
  const { bus } = snap;
  const noGoalListener = on && hasProgram && (bus.counts.goal ?? 0) === 0 && (bus.emitted.goal ?? 0) > 0;

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <Panel title="Event bus" icon={<Radio className="h-3.5 w-3.5" />} meta={on ? "arena" : "locked"} className={focus === "arena-bus" ? "pulse-ring" : ""}>
        {!on && (
          <div className="p-2">
            <Locked feature="arena-bus" title="Event bus" need="class EventEmitter, arena.emit()" spot={focus === "arena-bus"}>
              <div className="mt-2 space-y-1.5" aria-hidden>
                {ROWS.slice(0, 4).map((r) => (
                  <div key={r} className="flex items-center gap-2">
                    <div className="h-1.5 w-12 rounded-sm bg-white/[0.07]" />
                    <div className="h-1.5 flex-1 rounded-sm bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </Locked>
          </div>
        )}
        {on && (
          <div className="space-y-2.5 p-3">
            <p className="text-[11px] leading-snug text-white/55">
              Every event now goes through <code className="font-mono text-white/80">arena.emit(type, event)</code>. The scoreboard and the stats desk only change because <em>your listeners</em> run.
            </p>
            <ul className="space-y-1.5">
              {ROWS.map((type) => {
                const n = bus.counts[type] ?? 0;
                const emitted = bus.emitted[type] ?? 0;
                const hot = bus.last?.type === type;
                return (
                  <li key={type} className="flex min-w-0 items-center gap-2">
                    <span className="flex w-[4.5rem] shrink-0 items-center gap-1.5 text-[11px] text-white/80">
                      {type === "*" ? <span className="hud-value w-1.5 text-center text-white/50">*</span> : <TypeDot type={type} />}
                      {type === "*" ? "wildcard" : TYPE_STYLE[type].label}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-[3px]" aria-label={`${n} listeners`}>
                      {Array.from({ length: Math.min(n, 14) }).map((_, i) => (
                        <span key={hot ? `${i}-${bus.last?.nonce}` : i} className={`h-2.5 w-2.5 rounded-[3px] bg-[#c5ee8a] ${hot ? "arena-flash" : "opacity-80"}`} />
                      ))}
                      {n === 0 && <span className="text-[10.5px] text-white/30">no listeners</span>}
                      {n > 14 && <span className="hud-value text-[10px] text-white/50">+{n - 14}</span>}
                    </span>
                    <span className="hud-value w-8 shrink-0 text-right text-[10.5px] text-white/50" title="listeners">
                      {n}
                    </span>
                    <span className="hud-value w-9 shrink-0 text-right text-[10.5px] text-white/35" title="events emitted">
                      ×{emitted}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-white/45">
              {bus.last ? (
                <>
                  last emit <Chip>{bus.last.type}</Chip> {bus.last.ran !== null && <>ran <Chip tone="ok">{bus.last.ran}</Chip> listeners</>}
                </>
              ) : (
                "waiting for the first event…"
              )}
            </div>
            {noGoalListener && (
              <Notice tone="warn">
                Goals are being emitted but nobody listens for <code className="font-mono">&quot;goal&quot;</code>. Did you call <code className="font-mono">wireArena(arena)</code>?
              </Notice>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Dead letters & leak watch" icon={<Skull className="h-3.5 w-3.5" />} meta={hard ? `${bus.letters.length} letters · ${bus.warnings.length} warnings` : "locked"} className={focus === "arena-resilience" ? "pulse-ring" : ""}>
        {!hard && (
          <div className="p-2">
            <Locked feature="arena-resilience" title="Resilience" need="class ArenaBus, deadLetters(), busWarnings()" spot={focus === "arena-resilience"} />
          </div>
        )}
        {hard && (
          <div className="space-y-2.5 p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" className={BTN} onClick={() => driver.sendMalformed()} disabled={!interactive || !hasProgram}>
                <Send className="h-3 w-3" />
                Send a malformed goal
              </button>
              <button type="button" className={BTN} onClick={() => driver.emitErrorEvent()} disabled={!interactive || !hasProgram}>
                <AlertTriangle className="h-3 w-3" />
                Emit an &quot;error&quot; event
              </button>
            </div>
            <p className="text-[10.5px] leading-snug text-white/40">The malformed goal makes your scoreboard throw. A sturdy bus catches it and files a dead letter; an unhandled &quot;error&quot; event throws.</p>
            {snap.error && <Notice tone="bad">{snap.error}</Notice>}
            <div>
              <div className="hud-label mb-1">Dead letters</div>
              {bus.letters.length === 0 ? (
                <p className="text-[11px] text-white/35">None. Every listener behaved.</p>
              ) : (
                <ul className="space-y-1">
                  {bus.letters.slice(-5).reverse().map((l, i) => (
                    <li key={i} className="flex min-w-0 items-start gap-2 text-[11px]">
                      <Chip tone="bad">{l.type}</Chip>
                      <span className="min-w-0 break-words text-white/75">{l.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="hud-label mb-1">Leak warnings</div>
              {bus.warnings.length === 0 ? (
                <p className="text-[11px] text-white/35">None. No event type has an unusual number of listeners.</p>
              ) : (
                bus.warnings.map((w, i) => (
                  <p key={i} className="text-[11px] text-[#fcd34d]">
                    {w}
                  </p>
                ))
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
