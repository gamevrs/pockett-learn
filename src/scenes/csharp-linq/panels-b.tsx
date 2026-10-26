"use client";

import React from "react";
import { CheckCircle2, CircleAlert, OctagonAlert } from "lucide-react";
import { fmtNum, type PortData } from "./data";
import { hasValues } from "./panels-a";
import { BarRow, Cap, dash, Empty, IdChip, Lamp, Pill, Tile, type Tone } from "./ui";

/**
 * Panels for lessons 10 to 16: extension rack, vessel lookup, telegram parser, loading incidents,
 * JSON desk, validation inbox and the port report. Same rules as the first half: draw only what
 * the program sent, tolerate partial data, never throw.
 */

const show = (v: number | undefined, f: (n: number) => string = (n) => fmtNum(n)) => (v === undefined ? dash : f(v));
const entries = (r: Record<string, number> | undefined): [string, number][] => (r ? Object.entries(r) : []);

// ───────────────────────── lesson 10: extension rack ─────────────────────────

export function Ext({ d }: { d: PortData["ext"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send tonnes, perishableIds, pageTwo and summaryLine with Port.Show.</Empty>;
  return (
    <div className="space-y-3">
      {d.summaryLine !== undefined && (
        <div>
          <Cap>Summary line</Cap>
          <p className="rounded-md border-l-2 border-[#c5ee8a] bg-black/40 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-[#d3f3a4]">{d.summaryLine || dash}</p>
        </div>
      )}
      {d.tonnes && (
        <div>
          <Cap right={`${d.tonnes.length} values`}>.ToTonnes()</Cap>
          <div className="flex flex-wrap gap-1.5">
            {d.tonnes.length === 0 && <span className="hud-muted text-[11px]">Nothing converted yet.</span>}
            {d.tonnes.map((t, i) => (
              <IdChip key={`${t}:${i}`} tone="accent">
                {t}
              </IdChip>
            ))}
          </div>
        </div>
      )}
      {d.perishableIds && (
        <div>
          <Cap right={d.perishableIds.length}>.Perishable()</Cap>
          <div className="flex flex-wrap gap-1.5">
            {d.perishableIds.length === 0 && <span className="hud-muted text-[11px]">None flagged.</span>}
            {d.perishableIds.map((id, i) => (
              <IdChip key={`${id}:${i}`}>{id}</IdChip>
            ))}
          </div>
        </div>
      )}
      {d.pageTwo && (
        <div>
          <Cap right="page 2">.Page(2, 5)</Cap>
          <ol className="grid grid-cols-1 gap-0.5 @sm:grid-cols-2">
            {d.pageTwo.length === 0 && <li className="hud-muted text-[11px]">Page is empty.</li>}
            {d.pageTwo.map((id, i) => (
              <li key={`${id}:${i}`} className="flex min-w-0 items-center gap-2 rounded border border-white/[0.07] bg-white/[0.03] px-1.5 py-[2px]">
                <span className="hud-muted w-3 shrink-0 text-right font-mono text-[9.5px]">{i + 6}</span>
                <span className="min-w-0 truncate font-mono text-[10.5px] text-white/80">{id}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 11: vessel lookup ─────────────────────────

export function Lookup({ d }: { d: PortData["lookup"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send vesselLookups and bangCrash with Port.Show.</Empty>;
  const rows = d.vesselLookups ?? [];
  const found = rows.filter((r) => r.found === true).length;
  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div>
          <Cap right={`${found}/${rows.length} found`}>Lookups · TryGet</Cap>
          <ul className="overflow-hidden rounded-md border border-white/[0.07] bg-black/25">
            {rows.map((r, i) => (
              <li key={`${r.id}:${i}`} className="flex min-w-0 items-center gap-2 border-t border-white/[0.06] px-2 py-1 first:border-t-0">
                <Lamp on={r.found === undefined ? undefined : true} bad={r.found === false} size={7} />
                <span className="w-9 shrink-0 font-mono text-[10.5px] text-white/80">{r.id}</span>
                <span className={`min-w-0 flex-1 truncate text-[11px] ${r.name ? "text-white/90" : "italic text-white/40"}`}>{r.name ?? "no such vessel"}</span>
                <span className={`max-w-[40%] shrink-0 truncate font-mono text-[10px] ${r.found === false ? "hud-warning" : "text-white/55"}`} title="captain">
                  {r.captain ?? dash}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.bangCrash !== undefined && (
        <div role="note" className="rounded-md border border-[#f87171]/35 bg-[#2a0f0f]/55 px-2.5 py-1.5">
          <div className="mb-0.5 flex items-center gap-1.5">
            <OctagonAlert className="hud-danger h-3 w-3 shrink-0" aria-hidden />
            <span className="hud-label !text-[#fca5a5]">the ! operator crashed</span>
          </div>
          <p className="break-words font-mono text-[10.5px] leading-snug text-[#fecaca]">{d.bangCrash || dash}</p>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 12: telegram parser ─────────────────────────

export function Parser({ d }: { d: PortData["parser"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send telegrams, telegramRejects, regexParts and mentionedIds with Port.Show.</Empty>;
  const tel = d.telegrams ?? [];
  const rej = d.telegramRejects ?? [];
  const rp = d.regexParts;
  return (
    <div className="space-y-3">
      {d.telegrams && (
        <div>
          <Cap right={`${tel.length} parsed`}>Telegrams · TryParse</Cap>
          <div className="overflow-hidden rounded-md border border-white/[0.07] bg-black/25">
            <table className="w-full table-fixed border-collapse text-left text-[11px]">
              <colgroup>
                <col style={{ width: "4.2rem" }} />
                <col />
                <col style={{ width: "3.6rem" }} />
                <col style={{ width: "2rem" }} />
              </colgroup>
              <tbody>
                {tel.length === 0 && (
                  <tr>
                    <td colSpan={4} className="hud-muted px-2 py-1.5">
                      No telegram parsed yet.
                    </td>
                  </tr>
                )}
                {tel.map((t, i) => (
                  <tr key={`${t.id}:${i}`} className="border-t border-white/[0.06] first:border-t-0">
                    <td className="px-2 py-[3px] font-mono text-[10.5px] text-white/80">{t.id}</td>
                    <td className="truncate px-2 py-[3px] text-white/80">{t.cargo || dash}</td>
                    <td className="px-2 py-[3px] text-right font-mono text-[10.5px] tabular-nums text-white/70">{show(t.massKg)}</td>
                    <td className="px-2 py-[3px] text-right font-mono text-[10px] text-white/50">{t.priority === undefined ? dash : t.priority === 1 ? <span className="font-semibold text-[#fbbf24]">P1</span> : `P${t.priority}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {rej.length > 0 && (
        <div>
          <Cap right={`${rej.length} rejected`}>Rejected lines</Cap>
          <ul className="space-y-1">
            {rej.map((r, i) => (
              <li key={`${r.line}:${i}`} className="min-w-0 rounded-md border border-[#fbbf24]/25 bg-[#fbbf24]/[0.05] px-2 py-1">
                <p className="truncate font-mono text-[10.5px] text-white/85" title={r.line}>
                  {r.line === "" ? <span className="text-white/35">(blank line)</span> : r.line}
                </p>
                <p className="hud-warning mt-px break-words text-[10.5px] leading-snug">{r.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {rp && (rp.id || rp.mass || rp.unit) && (
        <div>
          <Cap>Regex groups</Cap>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["id", rp.id],
                ["mass", rp.mass],
                ["unit", rp.unit],
              ] as [string, string | undefined][]
            ).map(([k, v]) => (
              <span key={k} className="inline-flex items-baseline gap-1.5 rounded border border-white/10 bg-white/[0.04] px-1.5 py-[1px] font-mono text-[10.5px]">
                <span className="text-white/45">{k}</span>
                <span className={v ? "hud-accent" : "text-white/30"}>{v ?? dash}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {d.mentionedIds && (
        <div>
          <Cap right={d.mentionedIds.length}>Ids mentioned in prose</Cap>
          <div className="flex flex-wrap gap-1.5">
            {d.mentionedIds.length === 0 && <span className="hud-muted text-[11px]">No ids found.</span>}
            {d.mentionedIds.map((id, i) => (
              <IdChip key={`${id}:${i}`} tone="accent">
                {id}
              </IdChip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 13: loading incidents ─────────────────────────

const OUTCOME: Record<string, { tone: Tone; label: string }> = {
  loaded: { tone: "accent", label: "loaded" },
  deferred: { tone: "warning", label: "deferred" },
  rejected: { tone: "danger", label: "rejected" },
};

export function Faults({ d }: { d: PortData["faults"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send loadLog and loadAttempts with Port.Show.</Empty>;
  const log = d.loadLog ?? [];
  const count = (o: string) => log.filter((l) => l.outcome === o).length;
  return (
    <div className="space-y-3">
      {(d.loadLog || d.loadAttempts !== undefined) && (
        <dl className="grid grid-cols-2 gap-1.5">
          <Tile label="Loaded" value={d.loadLog ? count("loaded") : dash} tone="accent" />
          <Tile label="Deferred" value={d.loadLog ? count("deferred") : dash} tone={count("deferred") > 0 ? "warning" : "plain"} />
          <Tile label="Rejected" value={d.loadLog ? count("rejected") : dash} tone={count("rejected") > 0 ? "danger" : "plain"} />
          <Tile label="Attempts" value={show(d.loadAttempts)} />
        </dl>
      )}
      {log.length > 0 && (
        <div>
          <Cap right={`${log.length} entries`}>Load log</Cap>
          <ul className="overflow-hidden rounded-md border border-white/[0.07] bg-black/25">
            {log.map((l, i) => {
              const o = OUTCOME[l.outcome] ?? { tone: "plain" as Tone, label: l.outcome || "?" };
              return (
                <li key={`${l.id}:${i}`} className="border-t border-white/[0.06] px-2 py-1 first:border-t-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <Pill tone={o.tone} className="w-[3.9rem] justify-center">
                      {o.label}
                    </Pill>
                    <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-white/85">{l.id}</span>
                  </div>
                  {l.detail && <p className="mt-0.5 break-words pl-[4.4rem] text-[10.5px] leading-snug text-white/55">{l.detail}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 14: JSON desk ─────────────────────────

/** One line of pretty-printed JSON with the key and the value tinted apart. */
function JsonLine({ line }: { line: string }) {
  const m = /^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)(.*)$/.exec(line);
  const value = (v: string) => {
    const t = v.trim();
    const cls = /^"/.test(t) ? "text-[#d3f3a4]" : /^-?\d/.test(t) ? "text-[#fbbf24]" : /^(true|false|null)\b/.test(t) ? "text-[#93c5fd]" : "text-white/60";
    return <span className={cls}>{v}</span>;
  };
  if (m) {
    return (
      <>
        <span className="whitespace-pre">{m[1]}</span>
        <span className="text-white/85">{m[2]}</span>
        <span className="text-white/40">{m[3]}</span>
        {value(m[4])}
      </>
    );
  }
  const indent = /^(\s*)(.*)$/.exec(line) ?? ["", "", line];
  return (
    <>
      <span className="whitespace-pre">{indent[1]}</span>
      {/^[\]}[{,]+$/.test(indent[2]) ? <span className="text-white/45">{indent[2]}</span> : value(indent[2])}
    </>
  );
}

export function JsonPane({ text, interactive, maxLines = 40 }: { text: string; interactive: boolean; maxLines?: number }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const shown = lines.slice(0, maxLines);
  return (
    <div className={`rounded-md bg-black/45 py-1.5 font-mono text-[10.5px] leading-[1.55] ${interactive ? "max-h-52 overflow-auto" : "max-h-40 overflow-hidden"}`}>
      {shown.map((l, i) => (
        <div key={i} className="flex min-w-0 gap-2 px-2">
          <span aria-hidden className="w-4 shrink-0 select-none text-right text-white/25">
            {i + 1}
          </span>
          <span className="whitespace-pre">
            <JsonLine line={l} />
          </span>
        </div>
      ))}
      {lines.length > shown.length && <div className="px-2 pl-8 text-white/35">… {lines.length - shown.length} more lines</div>}
    </div>
  );
}

export function Json({ d, interactive }: { d: PortData["json"]; interactive: boolean }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send exportJson, notice, jsonError and jsonRejects with Port.Show.</Empty>;
  const { notice, jsonError, jsonRejects } = d;
  return (
    <div className="space-y-3">
      {d.exportJson !== undefined && (
        <div>
          <Cap right={`${d.exportJson.split("\n").length} lines`}>Export · Serialize</Cap>
          <JsonPane text={d.exportJson} interactive={interactive} />
        </div>
      )}
      {notice && (
        <div>
          <Cap>Notice · Deserialize</Cap>
          <dl className="grid grid-cols-3 gap-1.5">
            <Tile label="Vessel" value={notice.vesselId ?? dash} tone="accent" />
            <Tile label="Shipments" value={show(notice.shipments)} tone="accent" />
            <Tile label="Total" value={show(notice.totalKg)} unit="kg" tone="accent" />
          </dl>
        </div>
      )}
      {jsonError && (
        <div role="note" className="rounded-md border border-[#f87171]/35 bg-[#2a0f0f]/55 px-2.5 py-1.5">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <CircleAlert className="hud-danger h-3 w-3 shrink-0" aria-hidden />
            <span className="hud-label !text-[#fca5a5]">JsonException</span>
            {jsonError.line !== undefined && <Pill tone="danger">line {jsonError.line}</Pill>}
            {jsonError.position !== undefined && <Pill tone="danger">pos {jsonError.position}</Pill>}
            {jsonError.path && (
              <Pill tone="danger" title={jsonError.path} className="font-mono">
                <span className="truncate">{jsonError.path}</span>
              </Pill>
            )}
          </div>
          {jsonError.message && <p className="break-words font-mono text-[10.5px] leading-snug text-[#fecaca]">{jsonError.message}</p>}
        </div>
      )}
      {jsonRejects && jsonRejects.length > 0 && (
        <div>
          <Cap right={jsonRejects.length}>Rejected after parsing</Cap>
          <ul className="space-y-1">
            {jsonRejects.map((r, i) => (
              <li key={`${r.id}:${i}`} className="flex min-w-0 items-baseline gap-2 text-[11px]">
                <IdChip tone="warning">{r.id}</IdChip>
                <span className="min-w-0 flex-1 break-words text-white/70">{r.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 15: validation inbox ─────────────────────────

export function Inbox({ d, interactive }: { d: PortData["inbox"]; interactive: boolean }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send importReport, acceptedIds, rejects and rejectSummary with Port.Show.</Empty>;
  const accepted = d.importReport?.accepted ?? d.acceptedIds?.length;
  const rejected = d.importReport?.rejected ?? d.rejects?.length;
  const rejects = d.rejects ?? [];
  const reasons = entries(d.rejectSummary).sort((a, b) => b[1] - a[1]);
  const maxR = Math.max(1, ...reasons.map(([, v]) => v));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <div className="min-w-0 rounded-md border border-[#c5ee8a]/25 bg-[#c5ee8a]/[0.06] px-2.5 py-2">
          <div className="hud-label">Accepted</div>
          <div className="hud-value hud-accent mt-0.5 text-[20px] leading-none">{show(accepted)}</div>
        </div>
        <div className={`min-w-0 rounded-md border px-2.5 py-2 ${rejected ? "border-[#f87171]/30 bg-[#f87171]/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
          <div className="hud-label">Rejected</div>
          <div className={`hud-value mt-0.5 text-[20px] leading-none ${rejected ? "hud-danger" : ""}`}>{show(rejected)}</div>
        </div>
      </div>
      {rejects.length > 0 && (
        <div>
          <Cap right={`${rejects.length} rows`}>Rejected rows</Cap>
          <ul className={`space-y-1.5 ${interactive ? "max-h-64 overflow-auto" : "max-h-48 overflow-hidden"}`}>
            {rejects.map((r, i) => (
              <li key={`${r.line}:${i}`} className="min-w-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded bg-[#f87171]/15 px-1 font-mono text-[10px] text-[#fca5a5]">{r.line === undefined ? "line ?" : `line ${r.line}`}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-white/85" title={r.raw}>
                    {r.raw === "" ? <span className="text-white/35">(blank)</span> : r.raw}
                  </span>
                </div>
                {r.reasons.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.reasons.map((reason, j) => (
                      <Pill key={`${reason}:${j}`} tone="danger">
                        {reason}
                      </Pill>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {reasons.length > 0 && (
        <div>
          <Cap>Why they failed</Cap>
          <div className="space-y-1.5">
            {reasons.map(([reason, n], i) => (
              <BarRow key={reason} label={reason} text={n} pct={(n / maxR) * 100} tone="danger" index={i} />
            ))}
          </div>
        </div>
      )}
      {d.acceptedIds && d.acceptedIds.length > 0 && (
        <div>
          <Cap right={d.acceptedIds.length}>Accepted ids</Cap>
          <div className="flex flex-wrap gap-1.5">
            {d.acceptedIds.map((id, i) => (
              <IdChip key={`${id}:${i}`} tone="accent">
                {id}
              </IdChip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 16: port report ─────────────────────────

export function Report({ d, allLive, systems, interactive }: { d: PortData["report"]; allLive: boolean; systems: number; interactive: boolean }) {
  const r = d.portReport;
  return (
    <div className="space-y-3">
      {allLive && (
        <div role="status" className="flex min-w-0 items-center gap-2.5 rounded-md border border-[#c5ee8a]/45 bg-[#c5ee8a]/10 px-3 py-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#c5ee8a]" aria-hidden />
          <div className="min-w-0">
            <p className="hud-title hud-accent">All systems live</p>
            <p className="hud-muted text-[10.5px] leading-snug">{systems} of {systems} systems are running on your code. Halyard Port is open.</p>
          </div>
        </div>
      )}
      {!hasValues(d) ? (
        <Empty>Nothing yet. Send portReport and reportJson with Port.Show.</Empty>
      ) : (
        <>
          {r && (
            <dl className="grid grid-cols-2 gap-1.5">
              <Tile label="Shipments" value={show(r.shipments)} tone="accent" />
              <Tile label="Total kg" value={show(r.totalKg)} tone="accent" />
              <Tile label="Rejected" value={show(r.rejected)} tone={r.rejected ? "danger" : "plain"} />
              <Tile label="Busiest vessel" value={r.busiestVessel ?? dash} />
              <Tile label="Top category" value={r.topCategory ?? dash} />
              <Tile label="Crowded (80%+)" value={r.overloaded === undefined ? dash : r.overloaded.length === 0 ? "none" : r.overloaded.length} tone={r.overloaded && r.overloaded.length > 0 ? "warning" : "accent"} />
            </dl>
          )}
          {r?.overloaded && r.overloaded.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {r.overloaded.map((v, i) => (
                <IdChip key={`${v}:${i}`} tone="warning">
                  {v}
                </IdChip>
              ))}
            </div>
          )}
          {d.reportJson !== undefined && (
            <div>
              <Cap>Report JSON</Cap>
              <JsonPane text={d.reportJson} interactive={interactive} maxLines={14} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
