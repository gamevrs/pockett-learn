"use client";

import React from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { splitTestName, type Board, type SkuRow, type TestRow } from "./data";
import { BarRow, Code, dash, Empty, Pill, SectionLabel, Tile, TypePill } from "./ui";
import { InboxRowView } from "./panels";

/**
 * The second half of the ledger board's cards (lessons 9 to 16): generic helpers, the generic
 * ledger, the JSON import, validation, the SKU strip, the movement log, test results and the
 * close-out. Same rules as the first half: draw what the program sent, never throw.
 */

// ───────────────────────── 9: generic helpers ─────────────────────────

function HelperRow({ call, type, value }: { call: string; type: string | undefined; value: React.ReactNode }) {
  return (
    <li className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 truncate font-mono text-[11px] text-white/90" title={call}>
          {call}
        </span>
        <ArrowRight className="h-3 w-3 shrink-0 text-white/40" aria-hidden />
        {type && <TypePill type={type} />}
      </div>
      <div className="mt-1 break-words font-mono text-[10.5px] leading-snug hud-accent">{value}</div>
    </li>
  );
}

export function Helpers({ d }: { d: Board["helpers"] }) {
  if (d.skus === undefined && d.totalUnits === undefined) return <Empty>Nothing yet. Send helpers with scene().</Empty>;
  const t = d.types ?? {};
  const list = (xs: string[] | undefined) => (xs ? `[${xs.join(" ")}]` : dash);
  return (
    <div className="space-y-2.5">
      <ul className="space-y-1.5">
        <HelperRow call="Map(stock, func(it Item) string)" type={t.skus ?? "[]string"} value={list(d.skus)} />
        <HelperRow call="Map(Filter(stock, IsLow(5)), …)" type={t.skus ?? "[]string"} value={list(d.lowSKUs)} />
        <HelperRow call="Sum(qtys)" type={t.totalUnits} value={d.totalUnits ?? dash} />
        <HelperRow call="Sum([]Metres{60, 100, 30})" type={t.totalMetres} value={d.totalMetres ?? dash} />
        <HelperRow call="Sum([]float64{0.5, 0.25, 0.25})" type={t.floatSum} value={d.floatSum ?? dash} />
        <HelperRow call="MaxBy(stock, quantity)" type="main.Item" value={d.biggest ?? dash} />
      </ul>
      <p className="hud-muted text-[10.5px]">The type on each row is what the compiler inferred, with no type written at the call.</p>
    </div>
  );
}

// ───────────────────────── 10: generic ledger ─────────────────────────

export function LedgerPanel({ d }: { d: Board["ledger"] }) {
  if (d.keys === undefined && d.undoOrder === undefined) return <Empty>Nothing yet. Send ledgerView with scene().</Empty>;
  return (
    <div className="space-y-3">
      {d.type && (
        <div className="flex flex-wrap items-center gap-1.5">
          <TypePill type={d.type} />
          {d.len !== undefined && <Pill tone="mute">{d.len} entries</Pill>}
        </div>
      )}
      {d.keys && (
        <div>
          <SectionLabel>Keys in first-seen order</SectionLabel>
          <ol className="grid grid-cols-2 gap-1">
            {d.keys.map((k, i) => (
              <li key={k} className="flex min-w-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-1.5 py-1">
                <span className="w-3 shrink-0 text-right font-mono text-[9.5px] text-white/50">{i + 1}</span>
                <span className="truncate font-mono text-[10.5px] text-white/90" title={k}>
                  {k}
                </span>
              </li>
            ))}
          </ol>
          {d.radioQty !== undefined && <p className="hud-muted mt-1.5 text-[10.5px]">RAD-0031 was replaced with Qty {d.radioQty} and kept its place.</p>}
        </div>
      )}
      {d.undoOrder && (
        <div>
          <SectionLabel>Stack[Movement]: pops come out last-in, first-out</SectionLabel>
          <div className="flex flex-wrap items-center gap-1.5">
            {d.undoOrder.map((line, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {i > 0 && <ArrowRight className="h-3 w-3 text-white/40" aria-hidden />}
                <span className="rounded-md border border-[#c5ee8a]/40 bg-[#c5ee8a]/10 px-2 py-1 font-mono text-[11px] text-[#e0f6c1]">pop L{line}</span>
              </span>
            ))}
            {d.undoEmptyOK !== undefined && (
              <span className="inline-flex items-center gap-1.5">
                <ArrowRight className="h-3 w-3 text-white/40" aria-hidden />
                <span className="rounded-md border border-white/15 px-2 py-1 font-mono text-[11px] text-white/70">pop → ok={String(d.undoEmptyOK)}</span>
              </span>
            )}
          </div>
        </div>
      )}
      {d.foundMissing !== undefined && <Pill tone="mute">Get on a missing key: found = {String(d.foundMissing)}</Pill>}
    </div>
  );
}

// ───────────────────────── 11: JSON import ─────────────────────────

export function Importer({ d }: { d: Board["importer"] }) {
  const { decoded, failed } = d;
  if (!decoded && !failed) return <Empty>Nothing yet. Send importDecoded and importFailed with scene().</Empty>;
  const ok = decoded?.length ?? 0;
  const bad = failed?.length ?? 0;
  const total = Math.max(ok + bad, 1);
  return (
    <div className="space-y-2.5">
      <div>
        <div className="mb-1 flex items-baseline gap-2">
          {d.depot && <span className="hud-value hud-accent text-[13px]">{d.depot}</span>}
          <span className="hud-muted text-[10.5px]">
            {ok} decoded · {bad} failed
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`${ok} decoded, ${bad} failed`}>
          <span style={{ width: `${(ok / total) * 100}%`, background: "#c5ee8a" }} />
          <span style={{ width: `${(bad / total) * 100}%`, background: "#f87171" }} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        <div className="min-w-0">
          <SectionLabel>Decoded</SectionLabel>
          <ul className="space-y-1">
            {(decoded ?? []).map((r, i) => (
              <li key={i} className="flex min-w-0 items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1">
                <Check className="hud-accent h-3 w-3 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-white/90" title={r.name}>
                  #{r.index ?? "?"} {r.sku}
                </span>
                {r.hasQty === false ? (
                  <Pill tone="warning" title="the *int stayed nil: the field was missing">
                    qty missing
                  </Pill>
                ) : (
                  <Pill tone={r.qty === 0 ? "mute" : "accent"} title={r.qty === 0 ? "present, and zero" : undefined}>
                    qty {r.qty ?? dash}
                  </Pill>
                )}
              </li>
            ))}
            {(decoded ?? []).length === 0 && <li className="hud-muted text-[11px]">Nothing decoded.</li>}
          </ul>
        </div>
        <div className="min-w-0">
          <SectionLabel>Failed</SectionLabel>
          <ul className="space-y-1">
            {(failed ?? []).map((r, i) => (
              <li key={i} className="min-w-0 rounded-md border border-[#f87171]/25 bg-[#2a0f0f]/40 px-2 py-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <X className="hud-danger h-3 w-3 shrink-0" aria-hidden />
                  <span className="font-mono text-[10.5px] text-white/90">#{r.index ?? "?"}</span>
                  {r.field && (
                    <Pill tone="danger" solid>
                      {r.field}
                    </Pill>
                  )}
                </div>
                <p className="mt-0.5 break-words text-[10px] leading-snug text-[#fecaca]">{r.message.replace(/^json: /, "")}</p>
              </li>
            ))}
            {(failed ?? []).length === 0 && <li className="hud-muted text-[11px]">No failures.</li>}
          </ul>
        </div>
      </div>
      {d.echo && (
        <div>
          <SectionLabel>json.Marshal with the same tags</SectionLabel>
          <Code>{d.echo}</Code>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 12: validation ─────────────────────────

export function Validation({ d }: { d: Board["validation"] }) {
  if (d.checked === undefined) return <Empty>Nothing yet. Send validation with scene().</Empty>;
  return (
    <div className="space-y-2.5">
      <dl className="grid grid-cols-3 gap-1.5">
        <Tile label="Checked" value={d.checked ?? dash} />
        <Tile label="Clean" value={d.valid ?? dash} tone="accent" />
        <Tile label="Problems" value={d.total ?? dash} tone={(d.total ?? 0) > 0 ? "warning" : "accent"} />
      </dl>
      <ul className="space-y-1.5">
        {(d.problems ?? []).map((p, i) => (
          <li key={i} className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="rounded bg-white/10 px-1 font-mono text-[10px] text-white/80">#{p.index ?? "?"}</span>
              <span className="font-mono text-[10.5px] text-white/85">{p.sku || "(no SKU)"}</span>
              <span className="ml-auto flex flex-wrap gap-1">
                {p.fields.map((f) => (
                  <Pill key={f} tone="warning">
                    {f}
                  </Pill>
                ))}
              </span>
            </div>
            <ul className="mt-1 space-y-0.5">
              {p.messages.map((m, j) => (
                <li key={j} className="font-mono text-[10.5px] text-white/75">
                  {m}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {d.joinText !== undefined && (
        <div>
          <SectionLabel>errors.Join prints one message per line</SectionLabel>
          <Code>{d.joinText}</Code>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {d.joinNil !== undefined && <Pill tone="mute">Join() of nothing is nil: {String(d.joinNil)}</Pill>}
            {d.joinIs !== undefined && <Pill tone="mute">errors.Is sees inside: {String(d.joinIs)}</Pill>}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 13: SKU strip ─────────────────────────

const SKU_RE = /^([A-Z]{3})(-)(\d{4})(?:(-)([A-Z]))?$/;
const BIN_RE = /^([A-D])([1-6])(-)(\d{2})$/;

/** The code with each regexp group in its own tint. */
function Coloured({ value, ok, kind }: { value: string; ok: boolean; kind: "sku" | "bin" }) {
  if (!ok) return <span className="font-mono text-[11.5px] text-[#fecaca]">{value.length === 0 ? "(empty)" : value.replace(/ /g, "·")}</span>;
  const m = (kind === "sku" ? SKU_RE : BIN_RE).exec(value);
  if (!m) return <span className="font-mono text-[11.5px] hud-accent">{value}</span>;
  const tints = kind === "sku" ? ["#c5ee8a", "#8a8a8a", "#f4f4f4", "#8a8a8a", "#fbbf24"] : ["#c5ee8a", "#f4f4f4", "#8a8a8a", "#fbbf24"];
  return (
    <span className="font-mono text-[11.5px]">
      {m.slice(1).map((g, i) => (g ? <span key={i} style={{ color: tints[i] }}>{g}</span> : null))}
    </span>
  );
}

function CodeRows({ rows, kind }: { rows: SkuRow[]; kind: "sku" | "bin" }) {
  return (
    <ul className="grid grid-cols-1 gap-1">
      {rows.map((r, i) => (
        <li key={i} className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md px-2 py-1 ${r.ok ? "bg-white/[0.04]" : "border border-[#f87171]/25 bg-[#2a0f0f]/40"}`}>
          {r.ok ? <Check className="hud-accent h-3 w-3 shrink-0" aria-label="valid" /> : <X className="hud-danger h-3 w-3 shrink-0" aria-label="rejected" />}
          <Coloured value={r.value} ok={r.ok} kind={kind} />
          <span className="flex w-full shrink-0 flex-wrap gap-1 pl-[18px] empty:hidden">
            {r.parts.map(([k, v]) => (
              <span key={k} className="rounded bg-white/[0.07] px-1 font-mono text-[9.5px] text-white/75">
                {k} {v}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function SkuStrip({ d }: { d: Board["sku"] }) {
  if (!d.skus && !d.bins && !d.found) return <Empty>Nothing yet. Send skuStrip and binStrip with scene().</Empty>;
  const pieces = d.masked ? d.masked.split("<SKU>") : [];
  return (
    <div className="space-y-3">
      {d.skus && (
        <div>
          <SectionLabel>ParseSKU: ^(?P&lt;cat&gt;…)-(?P&lt;num&gt;…)(?:-(?P&lt;rev&gt;…))?$</SectionLabel>
          <CodeRows rows={d.skus} kind="sku" />
        </div>
      )}
      {d.bins && (
        <div>
          <SectionLabel>ParseBin: aisle A-D, shelf 1-6, slot</SectionLabel>
          <CodeRows rows={d.bins} kind="bin" />
        </div>
      )}
      {d.masked && (
        <div>
          <SectionLabel>FindAllString and ReplaceAllString</SectionLabel>
          <p className="break-words rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-relaxed text-white/80">
            {pieces.map((p, i) => (
              <React.Fragment key={i}>
                {p}
                {i < pieces.length - 1 && <mark className="rounded bg-[#c5ee8a]/20 px-0.5 text-[#e0f6c1]">{d.found?.[i] ?? "<SKU>"}</mark>}
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 14: movement log ─────────────────────────

export function LogPanel({ d }: { d: Board["log"] }) {
  if (d.lines === undefined) return <Empty>Nothing yet. Send logRead with scene().</Empty>;
  const good = new Set(d.moveLines ?? []);
  const bad = new Set((d.rejected ?? []).flatMap((r) => (r.line === undefined ? [] : [r.line])));
  const cells = Array.from({ length: Math.min(d.lines, 120) }, (_, i) => i + 1);
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone="mute">{d.lines} lines</Pill>
        <Pill tone="accent">{d.movements ?? good.size} movements</Pill>
        <Pill tone={bad.size > 0 ? "danger" : "mute"}>{bad.size} rejected</Pill>
      </div>
      <div>
        <SectionLabel>The log, one cell per line</SectionLabel>
        <div className="flex flex-wrap gap-[3px]" role="img" aria-label={`${good.size} good lines, ${bad.size} rejected lines`}>
          {cells.map((n) => (
            <span
              key={n}
              title={`line ${n}: ${good.has(n) ? "movement" : bad.has(n) ? "rejected" : "comment or blank"}`}
              className="flex h-5 w-5 items-center justify-center rounded-[4px] font-mono text-[9px] tabular-nums"
              style={
                good.has(n)
                  ? { background: "rgba(197,238,138,0.2)", color: "#e0f6c1", border: "1px solid rgba(197,238,138,0.45)" }
                  : bad.has(n)
                    ? { background: "rgba(248,113,113,0.2)", color: "#fecaca", border: "1px solid rgba(248,113,113,0.5)" }
                    : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {n}
            </span>
          ))}
        </div>
      </div>
      {d.rejected && d.rejected.length > 0 && (
        <ul className="space-y-1.5">
          {d.rejected.map((r, i) => (
            <InboxRowView key={i} r={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── 15: test results ─────────────────────────

function groupTests(rows: TestRow[]): { suite: string; rows: TestRow[] }[] {
  const out: { suite: string; rows: TestRow[] }[] = [];
  for (const r of rows) {
    const { suite } = splitTestName(r.name);
    const g = out.find((x) => x.suite === suite);
    if (g) g.rows.push(r);
    else out.push({ suite, rows: [r] });
  }
  return out;
}

export function Tests({ d, gateLabel = "Release gate" }: { d: Board["tests"]; gateLabel?: string }) {
  const main = d.rows;
  const gate = d.gate;
  if (!main && !gate) return <Empty>Nothing yet. Send tests with scene().</Empty>;
  const all = [...(main ?? []), ...(gate ?? [])];
  const passed = all.filter((r) => r.pass).length;
  const failed = all.length - passed;
  const groups = [...groupTests(main ?? []), ...groupTests(gate ?? []).map((g) => ({ ...g, suite: `${g.suite}` }))];
  return (
    <div className="space-y-2.5">
      <div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="hud-value hud-accent text-[13px]">{passed} passed</span>
          <span className={`hud-value text-[13px] ${failed > 0 ? "hud-danger" : "hud-muted"}`}>{failed} failed</span>
          {gate && gate.length > 0 && <span className="hud-muted ml-auto text-[10px]">includes the {gateLabel.toLowerCase()}</span>}
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`${passed} tests passed, ${failed} failed`}>
          <span style={{ width: `${(passed / Math.max(all.length, 1)) * 100}%`, background: "#c5ee8a" }} />
          <span style={{ width: `${(failed / Math.max(all.length, 1)) * 100}%`, background: "#f87171" }} />
        </div>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-0.5" tabIndex={0} aria-label="Test results">
        {groups.map((g) => {
          const ok = g.rows.filter((r) => r.pass).length;
          return (
            <div key={g.suite}>
              <div className="mb-0.5 flex items-center gap-2">
                <span className="font-mono text-[11px] text-white/90">{g.suite}</span>
                <span className={`font-mono text-[10px] ${ok === g.rows.length ? "hud-accent" : "hud-warning"}`}>
                  {ok}/{g.rows.length}
                </span>
              </div>
              <ul className="space-y-0.5">
                {g.rows.map((r, i) => (
                  <li
                    key={i}
                    className="min-w-0 rounded px-1.5 py-[3px]"
                    style={r.pass ? { background: "rgba(197,238,138,0.07)" } : { background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)" }}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      {r.pass ? <Check className="hud-accent h-3 w-3 shrink-0" aria-label="pass" /> : <X className="hud-danger h-3 w-3 shrink-0" aria-label="fail" />}
                      <span className={`min-w-0 truncate font-mono text-[10.5px] ${r.pass ? "text-white/80" : "text-[#fecaca]"}`}>{splitTestName(r.name).test}</span>
                      <span className={`ml-auto shrink-0 font-mono text-[9.5px] uppercase ${r.pass ? "hud-accent" : "hud-danger"}`}>{r.pass ? "pass" : "fail"}</span>
                    </div>
                    {!r.pass && r.msg && <p className="mt-0.5 break-words pl-[18px] font-mono text-[10px] leading-snug text-[#fecaca]">{r.msg}</p>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── 16: close-out ─────────────────────────

function Term({ label, value, sign, tone }: { label: string; value: number | undefined; sign?: string; tone?: "accent" | "plain" }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {sign && <span className="font-mono text-[15px] text-white/50">{sign}</span>}
      <div className="min-w-0 rounded-md bg-white/[0.05] px-2 py-1 text-center">
        <p className="hud-label !text-[9px]">{label}</p>
        <p className={`hud-value text-[15px] tabular-nums ${tone === "accent" ? "hud-accent" : ""}`}>{value ?? dash}</p>
      </div>
    </div>
  );
}

export function CloseOut({ d }: { d: Board["close"] }) {
  if (d.opening === undefined && d.closing === undefined) return <Empty>Nothing yet. Send closeout with scene().</Empty>;
  const top = Math.max(d.opening ?? 0, d.closing ?? 0, 1);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <Term label="Opening" value={d.opening} />
        <Term label="Received" value={d.received} sign="+" />
        <Term label="Returned" value={d.returned} sign="+" />
        <Term label="Issued" value={d.issued} sign="−" />
        <Term label="Retired" value={d.retired} sign="−" />
        <Term label="Closing" value={d.closing} sign="=" tone="accent" />
      </div>
      <div className="space-y-1">
        <BarRow label="opening" value={d.opening ?? 0} max={top} text={String(d.opening ?? dash)} tone="plain" />
        <BarRow label="closing" value={d.closing ?? 0} max={top} text={String(d.closing ?? dash)} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold ${
            d.balanced === undefined ? "border-white/15 text-white/60" : d.balanced ? "border-[#c5ee8a]/60 bg-[#c5ee8a]/12 text-[#e0f6c1]" : "border-[#f87171]/60 bg-[#f87171]/12 text-[#fecaca]"
          }`}
        >
          {d.balanced === undefined ? "not checked" : d.balanced ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
          {d.balanced === undefined ? "" : d.balanced ? "Books balance" : "Books do NOT balance"}
        </span>
        {d.applied !== undefined && <Pill tone="accent">{d.applied} applied</Pill>}
        {d.rejected !== undefined && <Pill tone={d.rejected > 0 ? "warning" : "mute"}>{d.rejected} refused</Pill>}
        {d.calls !== undefined && <Pill tone="mute">audited issues: {d.calls} calls, {d.failed ?? 0} failed</Pill>}
      </div>
    </div>
  );
}

