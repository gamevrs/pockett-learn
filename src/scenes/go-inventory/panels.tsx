"use client";

import React, { useState } from "react";
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react";
import {
  adviceFor,
  aisleOf,
  parseDiagnostics,
  runtimeAdvice,
  SENTINEL_OF,
  type Board,
  type BuildErr,
  type InboxRow,
  type LaneRow,
} from "./data";
import { AMBER, BarRow, clamp, Code, dash, Empty, LIME, Pill, RED, SectionLabel, TypePill, safeJson } from "./ui";

/**
 * The first half of the ledger board's cards (lessons 1 to 8): shelves, handler lane, type probe,
 * composition, printout, rejected inbox, error desk and stock index, plus the console. Each one
 * draws only what the learner's program sent, tolerates missing or odd values, and never throws.
 */

// ───────────────────────── console ─────────────────────────

function ErrorBlock({ error }: { error: BuildErr }) {
  const compile = error.type === "CompileError";
  const diags = compile ? parseDiagnostics(error.message) : [];
  const advice = compile ? diags.map((d) => adviceFor(d.text)).find((a) => a !== undefined) : runtimeAdvice(error.message);
  const lines = compile ? [] : error.message.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div role="alert" className="mb-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-2.5 py-2">
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        <AlertTriangle className="hud-danger h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hud-title hud-danger min-w-0 flex-1 truncate">{compile ? "Build failed" : "The program crashed"}</span>
        {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      </div>
      {compile ? (
        <ul className="space-y-1">
          {diags.map((d, i) => (
            <li key={i} className="flex min-w-0 items-baseline gap-2 font-mono text-[11px] leading-snug text-[#fecaca]">
              {d.where && <span className="shrink-0 rounded bg-[#f87171]/15 px-1 text-[10px] text-[#fca5a5]">L{d.where}</span>}
              <span className="min-w-0 break-words">{d.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-[#fecaca]">{lines.join("\n")}</pre>
      )}
      {advice && <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[11px] leading-snug text-white/70">{advice}</p>}
      <p className="hud-muted mt-1 text-[10px]">Fix it in the editor and press Run again.</p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-6 shrink-0 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${
        active ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function ConsolePanel({
  stdout,
  built,
  error,
  keys,
  live,
  interactive,
  focus,
  flash,
  locked,
}: {
  stdout: string;
  built: boolean;
  error: BuildErr | null;
  keys: [string, unknown][];
  live: boolean;
  interactive: boolean;
  focus: boolean;
  flash: boolean;
  locked: boolean;
}) {
  const [tab, setTab] = useState<"output" | "data">("output");
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const compileFailed = error?.type === "CompileError";
  const status = !built ? "Idle" : error ? (compileFailed ? "Build failed" : "Crashed") : "Build OK";
  const statusTone = !built ? "text-white/55" : error ? "hud-danger border-[#f87171]/40" : "hud-accent";
  return (
    <section data-panel="gi-console" className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="shrink-0 text-[#c5ee8a]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" x2="20" y1="19" y2="19" />
          </svg>
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">Control console</h3>
        <span className={`hud-tag shrink-0 ${statusTone}`}>{status}</span>
      </header>
      {error && <ErrorBlock error={error} />}
      {locked ? (
        <div>
          <div className="space-y-1.5">
            {[70, 45, 85, 30].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-1.5 w-2 shrink-0 rounded-sm bg-white/[0.05]" />
                <div className="h-1.5 rounded-sm bg-white/[0.05]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
          <p className="mt-2.5 truncate font-mono text-[10px] text-white/45">
            {focus ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
            fmt.Println(…)
          </p>
        </div>
      ) : (
        <>
          <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Console view">
            <Chip active={tab === "output"} onClick={() => setTab("output")}>
              Output{lines.length > 0 ? ` · ${lines.length}` : ""}
            </Chip>
            <Chip active={tab === "data"} onClick={() => setTab("data")}>
              Scene data{keys.length > 0 ? ` · ${keys.length}` : ""}
            </Chip>
          </div>
          {tab === "output" ? (
            <div className={`hud-log rounded-md bg-black/40 px-2 py-1.5 ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`} role="log" aria-label="Program output">
              {!built ? (
                <p className="hud-muted">Press Run to build and run your program.</p>
              ) : lines.length === 0 ? (
                <p className="hud-muted">{error ? "Nothing was printed before the problem." : "The program ran but printed nothing."}</p>
              ) : (
                lines.map((l, i) => (
                  <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                    {l === "" ? " " : l}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className={`rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] ${interactive ? "max-h-56 overflow-auto" : "max-h-40 overflow-hidden"}`}>
              {keys.length === 0 ? (
                <p className="hud-muted">{live ? "No values yet. Send one with scene(\"name\", value)" : "Run your program to see what it sent to the board."}</p>
              ) : (
                <dl className="space-y-0.5">
                  {keys.map(([k, v]) => (
                    <div key={k} className="flex min-w-0 gap-2">
                      <dt className="shrink-0 text-white/55">{k}</dt>
                      <dd className="hud-accent min-w-0 flex-1 break-all" title={safeJson(v)}>
                        {safeJson(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ───────────────────────── 1: shelves ─────────────────────────

/** The hero: every bin on the shelves, grouped by aisle, with a stock bar. */
export function Shelves({ d, compact = false }: { d: Board["shelves"]; compact?: boolean }) {
  const items = d.items;
  if (!items || items.length === 0) return <Empty>Nothing on the shelves yet. Send your depot slice with scene(&quot;shelves&quot;, depot).</Empty>;
  const max = Math.max(10, ...items.map((i) => i.qty ?? 0));
  const aisles = new Map<string, typeof items>();
  for (const it of [...items].sort((a, b) => a.bin.localeCompare(b.bin))) {
    const a = aisleOf(it.bin);
    aisles.set(a, [...(aisles.get(a) ?? []), it]);
  }
  const ordered = [...aisles.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const units = items.reduce((s, i) => s + (i.qty ?? 0), 0);
  return (
    <div>
      <div className={`grid gap-2 ${compact ? "grid-cols-4" : "grid-cols-2 @3xl:grid-cols-4"}`}>
        {ordered.map(([aisle, list]) => (
          <div key={aisle} className="min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1.5">
            <div className="mb-1 flex items-baseline justify-between px-0.5">
              <span className="hud-label">Aisle {aisle}</span>
              <span className="hud-muted font-mono text-[10px]">{list.reduce((s, i) => s + (i.qty ?? 0), 0)}</span>
            </div>
            <ul className="space-y-1">
              {list.map((it) => {
                const q = it.qty;
                const tone = q === undefined ? "plain" : q <= 0 ? "danger" : q <= 5 ? "warning" : "accent";
                const color = tone === "danger" ? RED : tone === "warning" ? AMBER : LIME;
                return (
                  <li key={it.sku + it.bin} data-bin={it.bin} className="rounded-md bg-white/[0.045] px-1.5 py-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[10px] text-white/60">{it.bin || dash}</span>
                      {tone === "danger" && <span className="hud-danger text-[9px] font-semibold uppercase tracking-wide">empty</span>}
                      {tone === "warning" && <span className="hud-warning text-[9px] font-semibold uppercase tracking-wide">low</span>}
                      <span className="hud-value ml-auto text-[13px] tabular-nums" style={{ color: q === undefined ? undefined : color }}>
                        {q === undefined ? dash : q}
                      </span>
                    </div>
                    <div className={`truncate text-[11px] text-white/85 ${compact ? "text-[10.5px]" : ""}`} title={it.name}>
                      {it.name || it.sku}
                    </div>
                    {compact ? (
                      <div className="hud-bar mt-0.5 h-1">
                        <span style={{ width: `${clamp(((q ?? 0) / max) * 100, 0, 100)}%`, background: color }} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-mono text-[9.5px] text-white/55">{it.sku}</span>
                        <div className="hud-bar ml-auto h-1 w-10 shrink-0">
                          <span style={{ width: `${clamp(((q ?? 0) / max) * 100, 0, 100)}%`, background: color }} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone="mute">{units} units on the shelves</Pill>
          {d.taken !== undefined && <Pill tone="accent">took {d.taken}</Pill>}
          {d.short !== undefined && (
            <Pill tone="warning" title="Take returns how many really left the shelf">
              Take(9) gave {d.short}
            </Pill>
          )}
          {d.copyLoopQty !== undefined && (
            <Pill tone="mute" title="A by-value range loop changes copies, not the shelf">
              copy loop left rope at {d.copyLoopQty}
            </Pill>
          )}
          {d.lowSKUs && d.lowSKUs.length > 0 && <Pill tone="warning">low: {d.lowSKUs.join(", ")}</Pill>}
        </div>
      )}
    </div>
  );
}

/** Ghost for the hero before lesson 1 is passed: four empty aisles. */
export function ShelvesGhost() {
  return (
    <div className="grid grid-cols-2 gap-2 @3xl:grid-cols-4">
      {["A", "B", "C", "D"].map((a) => (
        <div key={a} className="rounded-lg border border-dashed border-white/12 p-1.5">
          <div className="hud-label mb-1 px-0.5">Aisle {a}</div>
          {[0, 1].map((i) => (
            <div key={i} className="mb-1 rounded-md border border-dashed border-white/10 px-1.5 py-1.5">
              <div className="h-1.5 w-8 rounded-sm bg-white/[0.05]" />
              <div className="mt-1.5 h-2 w-16 rounded-sm bg-white/[0.05]" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── 2: handler lane ─────────────────────────

function LaneRowView({ r }: { r: LaneRow }) {
  const bad = r.ok === false;
  return (
    <li className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span className="w-5 shrink-0 text-right font-mono text-[10px] text-white/55">{r.line ?? ""}</span>
        <Pill tone="mute">{r.kind}</Pill>
        <span className="min-w-0 truncate font-mono text-[11px] text-white/90">
          {r.sku}
          {r.qty !== undefined && <span className="text-white/55"> ×{r.qty}</span>}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <ArrowRight className="h-3 w-3 text-white/40" aria-hidden />
          <TypePill type={r.handler} tone={bad ? "danger" : "accent"} />
          {bad ? <X className="hud-danger h-3 w-3" aria-label="refused" /> : <Check className="hud-accent h-3 w-3" aria-label="applied" />}
        </span>
      </div>
      {bad && r.error && <p className="ml-6 mt-0.5 truncate text-[10.5px] text-[#fecaca]" title={r.error}>{r.error}</p>}
    </li>
  );
}

export function Lane({ d }: { d: Board["lane"] }) {
  const rows = d.rows;
  if (!rows || rows.length === 0) return <Empty>No movements yet. Build a []map[string]any of rows and send it with scene(&quot;lane&quot;, lane).</Empty>;
  const byType = new Map<string, number>();
  for (const r of rows) byType.set(r.handler, (byType.get(r.handler) ?? 0) + 1);
  const shown = rows.slice(0, 14);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Pill tone="mute">interface Handler</Pill>
        <ArrowRight className="h-3 w-3 text-white/40" aria-hidden />
        {[...byType.entries()].map(([t, n]) => (
          <span key={t} className="inline-flex items-center gap-1">
            <TypePill type={t} />
            <span className="hud-value text-[10.5px]">×{n}</span>
          </span>
        ))}
      </div>
      <ul className="space-y-1.5">
        {shown.map((r, i) => (
          <LaneRowView key={i} r={r} />
        ))}
      </ul>
      {rows.length > shown.length && <p className="hud-muted mt-1.5 text-[10.5px]">+ {rows.length - shown.length} more movements</p>}
      {d.retired !== undefined && <p className="hud-muted mt-2 text-[10.5px]">The *Retirer has retired {d.retired} units so far.</p>}
    </div>
  );
}

// ───────────────────────── 3: type probe ─────────────────────────

function InterfaceBox({ type, value, tone }: { type: string; value: string; tone: "accent" | "mute" }) {
  const border = tone === "accent" ? "border-[#c5ee8a]/45" : "border-white/15";
  return (
    <span className={`inline-flex items-stretch overflow-hidden rounded-md border font-mono text-[10.5px] ${border}`}>
      <span className="border-r border-white/10 bg-white/[0.04] px-1.5 py-0.5">
        <span className="hud-muted mr-1 text-[9px] uppercase">type</span>
        <span className={tone === "accent" ? "hud-accent" : "text-white/55"}>{type}</span>
      </span>
      <span className="px-1.5 py-0.5">
        <span className="hud-muted mr-1 text-[9px] uppercase">value</span>
        <span className="text-white/80">{value}</span>
      </span>
    </span>
  );
}

export function Probe({ d }: { d: Board["probe"] }) {
  const { kinds, notes, qty } = d;
  if (!kinds && !qty && d.plainNil === undefined) return <Empty>Nothing yet. Send kinds, notes, qtyProbe and nilGotcha with scene().</Empty>;
  return (
    <div className="space-y-3">
      {kinds && (
        <div>
          <SectionLabel>kindOf(h) and noteOf(h)</SectionLabel>
          <ul className="space-y-1">
            {kinds.map((k, i) => (
              <li key={i} className="flex min-w-0 items-center gap-2">
                <Pill tone={k === "none" ? "mute" : "accent"}>{k}</Pill>
                <span className="min-w-0 truncate text-[11px] text-white/75" title={notes?.[i]}>
                  {notes?.[i] ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {qty && qty.length > 0 && (
        <div>
          <SectionLabel>toQty(any)</SectionLabel>
          <ul className="grid grid-cols-1 gap-1 @md:grid-cols-2">
            {qty.map((q, i) => (
              <li key={i} className="flex min-w-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1">
                <span className="min-w-0 truncate font-mono text-[11px] text-white/90">{q.input}</span>
                <Pill tone="mute">{q.type}</Pill>
                <ArrowRight className="h-3 w-3 shrink-0 text-white/40" aria-hidden />
                {q.ok ? <span className="hud-value hud-accent ml-auto text-[12px]">{q.qty}</span> : <X className="hud-danger ml-auto h-3 w-3" aria-label="not a quantity" />}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.plainNil !== undefined && d.typedNil !== undefined && (
        <div>
          <SectionLabel>The nil interface gotcha</SectionLabel>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <InterfaceBox type="nil" value="nil" tone="mute" />
              <span className="font-mono text-[11px] text-white/75">== nil</span>
              {d.plainNil ? <Check className="hud-accent h-3.5 w-3.5" aria-label="equal to nil" /> : <X className="hud-danger h-3.5 w-3.5" aria-label="not equal to nil" />}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InterfaceBox type="*Retirer" value="nil" tone="accent" />
              <span className="font-mono text-[11px] text-white/75">== nil</span>
              {d.typedNil ? <Check className="hud-accent h-3.5 w-3.5" aria-label="equal to nil" /> : <X className="hud-danger h-3.5 w-3.5" aria-label="not equal to nil" />}
            </div>
            <p className="hud-muted text-[10.5px]">An interface is nil only when its type AND its value are empty.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 4: composition ─────────────────────────

const ITEM_FIELDS = ["SKU", "Name", "Qty", "Bin"];

function FieldList({ obj, keys }: { obj: Record<string, unknown>; keys: string[] }) {
  return (
    <ul className="space-y-0.5 font-mono text-[10.5px]">
      {keys.map((k) => (
        <li key={k} className="flex min-w-0 gap-1.5">
          <span className="shrink-0 text-white/55">{k}</span>
          <span className="min-w-0 truncate text-white/90">{String(obj[k])}</span>
        </li>
      ))}
    </ul>
  );
}

export function Compose({ d }: { d: Board["compose"] }) {
  const rope = d.ropeJson;
  if (!rope && !d.labels && d.calls === undefined) return <Empty>Nothing yet. Send compose and labels with scene().</Empty>;
  const ownKeys = rope ? Object.keys(rope).filter((k) => !ITEM_FIELDS.includes(k)) : [];
  return (
    <div className="space-y-3">
      {rope && (
        <div>
          <SectionLabel>Rope embeds Item</SectionLabel>
          <div className="rounded-lg border border-[#c5ee8a]/30 p-2">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="hud-title">Rope</span>
              {d.ropeQty !== undefined && <Pill tone="accent">rope.Add(2) → Qty {d.ropeQty}</Pill>}
            </div>
            <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
              <div className="rounded-md border border-dashed border-white/20 p-1.5">
                <p className="hud-label mb-1">Item (embedded, promoted)</p>
                <FieldList obj={rope} keys={ITEM_FIELDS.filter((k) => k in rope)} />
              </div>
              <div className="rounded-md bg-white/[0.04] p-1.5">
                <p className="hud-label mb-1">The rope&apos;s own fields</p>
                <FieldList obj={rope} keys={ownKeys} />
              </div>
            </div>
          </div>
        </div>
      )}
      {d.labels && d.labels.length > 0 && (
        <div>
          <SectionLabel>Label() through the Labeler interface</SectionLabel>
          <ul className="space-y-1">
            {d.labels.map((l, i) => (
              <li key={i} className="truncate rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/90" title={l}>
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.calls !== undefined && (
        <div>
          <SectionLabel>Audited wraps any Handler</SectionLabel>
          <div className="space-y-1">
            <BarRow label="calls" value={d.calls} max={Math.max(d.calls, 1)} text={String(d.calls)} />
            <BarRow label="failed" value={d.failed ?? 0} max={Math.max(d.calls, 1)} text={String(d.failed ?? 0)} tone={(d.failed ?? 0) > 0 ? "warning" : "accent"} />
          </div>
          {d.auditHasNote !== undefined && (
            <p className="hud-muted mt-1.5 text-[10.5px]">
              Does the wrapper have Note? <span className={d.auditHasNote ? "hud-accent" : "text-white/85"}>{d.auditHasNote ? "yes" : "no: only Handle is promoted"}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 5: printout ─────────────────────────

export function Printout({ d }: { d: Board["printout"] }) {
  if (!d.table && !d.verbs) return <Empty>Nothing yet. Send tableLines and verbRows with scene().</Empty>;
  return (
    <div className="space-y-3">
      {d.table && d.table.length > 0 && (
        <div>
          <SectionLabel>text/tabwriter</SectionLabel>
          <Code>{d.table.join("\n")}</Code>
        </div>
      )}
      {d.verbs && d.verbs.length > 0 && (
        <div>
          <SectionLabel>fmt verbs</SectionLabel>
          <ul className="space-y-1">
            {d.verbs.map((v, i) => (
              <li key={i} className="flex min-w-0 items-baseline gap-2">
                <span className="w-9 shrink-0 font-mono text-[11px] hud-accent">{v.verb}</span>
                <span className="hud-muted w-[4.5rem] shrink-0 truncate text-[10.5px]">{v.value}</span>
                <span className="min-w-0 flex-1 break-words font-mono text-[10.5px] text-white/90">{v.out}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 6: rejected inbox ─────────────────────────

/** Short class badge text: the sentinel's name when we know it. */
const classBadge = (cls: string) => SENTINEL_OF[cls] ?? cls;

export function InboxRowView({ r, dense = false }: { r: InboxRow; dense?: boolean }) {
  const typed = !!r.badge && r.badge.startsWith("*");
  const label = r.badge ?? classBadge(r.cls);
  const where = r.text ?? [r.kind, r.sku].filter(Boolean).join(" ");
  return (
    <li className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {r.line !== undefined && <span className="shrink-0 rounded bg-white/10 px-1 font-mono text-[10px] text-white/80">L{r.line}</span>}
        <span className="min-w-0 truncate font-mono text-[11px] text-white/90" title={where}>
          {where}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <span className="hud-muted text-[9px] uppercase tracking-wide">{typed ? "As" : "Is"}</span>
          <Pill tone={typed ? "danger" : "warning"} solid={typed}>
            {label}
          </Pill>
        </span>
      </div>
      {!dense && r.message && <p className="mt-1 break-words text-[10.5px] leading-snug text-white/75">{r.message}</p>}
      {!dense && r.chain && r.chain.length > 1 && (
        <div className="mt-1 flex flex-wrap items-center gap-1" aria-label="error chain">
          {r.chain.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-2.5 w-2.5 text-white/35" aria-hidden />}
              <span className="max-w-[9rem] truncate rounded border border-white/10 px-1 font-mono text-[9.5px] text-white/65" title={c}>
                {i === 0 ? "wrapped" : i === r.chain!.length - 1 ? "sentinel" : "layer"}
              </span>
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

export function Inbox({ d }: { d: Board["inbox"] }) {
  const rows = d.rows;
  if (!rows) return <Empty>Nothing yet. Send the refused movements with scene(&quot;inbox&quot;, inbox).</Empty>;
  if (rows.length === 0) return <Empty>The inbox is empty: every movement was accepted.</Empty>;
  return (
    <div>
      <ul className="space-y-1.5">
        {rows.slice(0, 12).map((r, i) => (
          <InboxRowView key={i} r={r} />
        ))}
      </ul>
      {rows.length > 12 && <p className="hud-muted mt-1.5 text-[10.5px]">+ {rows.length - 12} more</p>}
      {d.directEq !== undefined && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone={d.directEq ? "accent" : "danger"} title="Comparing a wrapped error with ==">
            err == ErrShort: {String(d.directEq)}
          </Pill>
          <Pill tone={d.viaIs ? "accent" : "danger"} title="errors.Is walks the chain">
            errors.Is: {String(d.viaIs)}
          </Pill>
          {d.chainLen !== undefined && <Pill tone="mute">{d.chainLen} layers</Pill>}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 7: error desk ─────────────────────────

export function ErrorDesk({ d }: { d: Board["typed"] }) {
  const rows = d.rows;
  if (!rows) return <Empty>Nothing yet. Send errTypes with scene().</Empty>;
  if (rows.length === 0) return <Empty>No typed errors: every movement succeeded.</Empty>;
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const panic = r.badge.includes("Panic");
        const have = r.have ?? 0;
        const want = r.want ?? 0;
        const top = Math.max(want, have, 1);
        return (
          <li key={i} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {r.line !== undefined && <span className="rounded bg-white/10 px-1 font-mono text-[10px] text-white/80">L{r.line}</span>}
              <Pill tone="danger" solid>
                {r.badge}
              </Pill>
              {r.isShort && <Pill tone="warning" title="the type also answers errors.Is(err, ErrShort)">Is ErrShort</Pill>}
              {r.sku && <span className="ml-auto font-mono text-[10.5px] text-white/70">{r.sku}</span>}
            </div>
            {!panic && r.want !== undefined && (
              <div className="mt-1.5 space-y-1">
                <BarRow label="asked for" value={want} max={top} text={String(want)} tone="warning" />
                <BarRow label="on shelf" value={have} max={top} text={String(have)} />
                {r.shortBy !== undefined && <p className="hud-warning text-[10.5px]">short by {r.shortBy}</p>}
              </div>
            )}
            {panic && (
              <p className="mt-1.5 break-words rounded border border-[#f87171]/30 bg-[#2a0f0f]/60 px-1.5 py-1 font-mono text-[10.5px] leading-snug text-[#fecaca]">
                recovered at the boundary: {r.message.replace(/^line \d+: /, "")}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────── 8: stock index ─────────────────────────

function CopyVsAlias({ title, sub, map, slice, alias }: { title: string; sub: string; map: number | undefined; slice: number | undefined; alias: boolean }) {
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] p-2">
      <p className="hud-label truncate">{title}</p>
      <p className="hud-muted mb-1.5 truncate font-mono text-[10px]">{sub}</p>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded border border-white/10 px-1.5 py-1 text-center">
          <p className="hud-label !text-[9px]">map</p>
          <p className="hud-value text-[15px] hud-accent">{map ?? dash}</p>
        </div>
        <span className={`shrink-0 font-mono text-[10px] ${alias ? "hud-accent" : "hud-warning"}`} title={alias ? "the same memory" : "two separate copies"}>
          {alias ? "══" : "╌╌"}
        </span>
        <div className="min-w-0 flex-1 rounded border border-white/10 px-1.5 py-1 text-center">
          <p className="hud-label !text-[9px]">slice</p>
          <p className="hud-value text-[15px]">{slice ?? dash}</p>
        </div>
      </div>
      <p className={`mt-1 text-[10.5px] ${alias ? "hud-accent" : "hud-warning"}`}>{alias ? "one item, two ways in" : "a copy: the shelf never heard"}</p>
    </div>
  );
}

export function StockIndex({ d }: { d: Board["index"] }) {
  if (d.byQty === undefined && d.valueMapBAT === undefined) return <Empty>Nothing yet. Send indexView with scene().</Empty>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
        <CopyVsAlias title="map[string]Item" sub="BAT-0880 restocked +5" map={d.valueMapBAT} slice={d.sliceBAT} alias={d.valueMapBAT !== undefined && d.valueMapBAT === d.sliceBAT} />
        <CopyVsAlias title="map[string]*Item" sub="RAD-0031 restocked +3" map={d.ptrMapRAD} slice={d.sliceRAD} alias={d.ptrMapRAD !== undefined && d.ptrMapRAD === d.sliceRAD} />
      </div>
      {d.byQty && (
        <div>
          <SectionLabel>slices.SortFunc: quantity desc, then SKU</SectionLabel>
          <ol className="flex flex-wrap gap-1">
            {d.byQty.map((s, i) => (
              <li key={s} className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/85">
                <span className="text-white/50">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
      {d.keys && (
        <div>
          <SectionLabel>slices.Sorted(maps.Keys(m))</SectionLabel>
          <p className="break-words font-mono text-[10.5px] leading-relaxed text-white/80">{d.keys.join("  ")}</p>
        </div>
      )}
      {d.found !== undefined && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="mute">missing key, comma-ok found: {String(d.found)}</Pill>
          {d.missingPtrNil !== undefined && <Pill tone="mute">missing pointer is nil: {String(d.missingPtrNil)}</Pill>}
        </div>
      )}
    </div>
  );
}

