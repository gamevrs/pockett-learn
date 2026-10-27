"use client";

import React, { useState } from "react";
import { ArrowDown, Check, Link2, X } from "lucide-react";
import { MODULE_ITEMS, MODULE_TREE, fmtNum, plural, sliceByBytes, textAtBytes, type ErrSample, type FunnelRow, type Peak, type StarRec } from "./data";
import { C, Empty, Pill } from "./ui";

/** Panels of chapter 1 (borrowed text) and the first half of chapter 2 (errors): lessons 1 to 6. */

const enc = new TextEncoder();

// ───────────────────────── 1. input buffer ─────────────────────────

const RANGE_COLORS = ["rgba(138,164,255,0.38)", "rgba(196,168,255,0.34)", "rgba(138,164,255,0.2)", "rgba(196,168,255,0.2)"];

export function InputBuffer({ s, interactive }: { s: Peak; interactive: boolean }) {
  const buffer = s.buffer;
  if (buffer === undefined) return <Empty>No buffer yet. Send your text with scene(&quot;buffer&quot;, &amp;buffer);</Empty>;

  // Slices the learner reported; with none (and no separate fileText), fall back to the records' borrowed fields.
  const reported = (s.slices ?? []).filter((x) => x.start !== undefined);
  const fits = reported.every((x) => {
    const t = textAtBytes(buffer, x.start as number, x.len);
    if (t === undefined || t.includes("\n")) return false;
    if (x.label === "name" && s.records && s.records.length > 0) return s.records.some((r) => r.name === t);
    return true;
  });
  const fromSlices = fits && reported.length > 0;
  const ranges: { start: number; len: number; label: string }[] = fromSlices
    ? reported.map((x) => ({ start: x.start as number, len: x.len, label: x.label }))
    : (s.fileText !== undefined ? [] : (s.records ?? [])).flatMap((r) => {
        const out: { start: number; len: number; label: string }[] = [];
        if (r.nameStart !== undefined) out.push({ start: r.nameStart, len: enc.encode(r.name).length, label: "name" });
        if (r.conStart !== undefined) out.push({ start: r.conStart, len: enc.encode(r.constellation).length, label: "constellation" });
        return out;
      });
  const pieces = sliceByBytes(buffer, ranges);
  const total = enc.encode(buffer).length;

  return (
    <div className="space-y-2.5">
      <div className="flex min-w-0 items-center gap-2 text-[10px] text-white/70">
        <Pill tone="plain">String</Pill>
        <span className="min-w-0 truncate">owns {fmtNum(total)} bytes on the heap</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: C.blue }} /> borrowed
        </span>
      </div>
      <pre className={`whitespace-pre-wrap break-words rounded-md bg-black/40 px-2.5 py-2 font-mono text-[11px] leading-[1.7] text-white/80 ${interactive ? "max-h-52 overflow-auto" : "max-h-36 overflow-hidden"}`} aria-label="The input text">
        {pieces.map((p, i) =>
          p.range < 0 ? (
            <React.Fragment key={i}>{p.text}</React.Fragment>
          ) : (
            <mark key={i} className="rounded-[3px] px-[1px] text-[#e6ecff]" style={{ background: RANGE_COLORS[p.range % RANGE_COLORS.length], boxShadow: "inset 0 -1.5px 0 #8aa4ff" }} title={`${ranges[p.range]?.label ?? "slice"} (bytes ${ranges[p.range]?.start}..${(ranges[p.range]?.start ?? 0) + (ranges[p.range]?.len ?? 0)})`}>
              {p.text}
            </mark>
          ),
        )}
      </pre>

      {fromSlices && (s.slices ?? []).length > 0 && (
        <ul className="space-y-1">
          {(s.slices ?? []).map((x, i) => {
            const inside = x.start !== undefined;
            const text = inside && fits ? textAtBytes(buffer, x.start as number, x.len) : undefined;
            return (
              <li key={i} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-white/[0.04] px-2 py-1.5">
                <Pill tone={inside ? "blue" : "warning"}>&amp;str</Pill>
                <span className="font-mono text-[11px] text-[#f4f4f4]">{x.label}</span>
                <span className="font-mono text-[10.5px] text-white/65">{inside ? `ptr = buffer + ${x.start}, len = ${x.len}` : "not inside the buffer"}</span>
                {text !== undefined && <span className="ml-auto min-w-0 truncate font-mono text-[11px] text-[#b3c3ff]">&quot;{text}&quot;</span>}
              </li>
            );
          })}
        </ul>
      )}
      {!fromSlices && (s.slices ?? []).length > 0 && <p className="text-[10px] text-white/60">The highlights show the names and constellations your records borrowed from this text.</p>}

      {((s.copies ?? []).length > 0 || s.label !== undefined) && (
        <div className="space-y-1">
          {(s.copies ?? []).map((c, i) => (
            <div key={i} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-dashed border-[#c5ee8a]/40 px-2 py-1.5">
              <Pill tone="accent">String</Pill>
              <span className="font-mono text-[11px] text-[#d3f3a4]">&quot;{c}&quot;</span>
              <span className="min-w-0 text-[10.5px] text-white/65">a copy: its own allocation, not inside the buffer</span>
            </div>
          ))}
          {s.label !== undefined && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-dashed border-[#c5ee8a]/40 px-2 py-1.5">
              <Pill tone="accent">String</Pill>
              <span className="font-mono text-[11px] text-[#d3f3a4]">&quot;{s.label}&quot;</span>
              <span className="min-w-0 text-[10.5px] text-white/65">built new with format!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 2. lifetime scopes ─────────────────────────

export function LifetimeScopes({ s }: { s: Peak }) {
  const d = s.lifetime;
  if (!d) return <Empty>No data yet. Send it with scene(&quot;lifetimeDemo&quot;, …);</Empty>;
  const total = s.buffer ? enc.encode(s.buffer).length : 0;
  const markX = d.winnerStart !== undefined && total > 0 ? 10 + Math.min(1, d.winnerStart / total) * 340 : undefined;
  const t = { fontSize: 10, fontFamily: "var(--font-mono), monospace" } as const;
  return (
    <div className="space-y-2">
      <svg viewBox="0 0 360 192" className="block w-full" role="img" aria-label="Lifetime scopes: two borrows from the buffer, and a result limited to the inner block">
        <text x="10" y="13" {...t} fill="rgba(255,255,255,0.7)">buffer owns the text</text>
        <rect x="10" y="17" width="340" height="8" rx="4" fill="rgba(255,255,255,0.14)" />
        {markX !== undefined && <path d={`M${markX} 25 l-5 8 h10 z`} fill={C.blue} />}

        <rect x="150" y="38" width="172" height="126" rx="6" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.55)" strokeDasharray="4 3" />
        <text x="328" y="52" {...t} fontSize={11} fill={C.amber}>&apos;a</text>

        <text x="10" y="50" {...t} fill={C.blueSoft}>first   &quot;{d.first ?? "?"}&quot;</text>
        <rect x="24" y="54" width="326" height="7" rx="3.5" fill="rgba(138,164,255,0.55)" />
        <text x="10" y="78" {...t} fill={C.blueSoft}>second  &quot;{d.second ?? "?"}&quot;</text>
        <rect x="24" y="82" width="326" height="7" rx="3.5" fill="rgba(138,164,255,0.55)" />

        <rect x="150" y="98" width="172" height="66" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
        <text x="157" y="112" {...t} fill="rgba(255,255,255,0.7)">inner block {"{ }"}</text>
        <text x="157" y="132" {...t} fill={C.limeSoft}>scratch &quot;{d.scratch ?? "?"}&quot;</text>
        <rect x="157" y="137" width="158" height="7" rx="3.5" fill="rgba(197,238,138,0.55)" />
        <text x="157" y="157" {...t} fontSize={9.5} fill={C.amber}>result lives only this long</text>

        <text x="10" y="182" {...t} fill={C.limeSoft}>kept &quot;{d.kept ?? "?"}&quot; (a copy)</text>
      </svg>
      <ul className="space-y-1 text-[11px] leading-snug text-white/80">
        <li className="flex gap-1.5">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.blue }} />
          <span>
            <span className="font-mono text-[#f4f4f4]">brighter(first, second)</span> picked <span className="font-mono text-[#b3c3ff]">{d.winner ?? "?"}</span>
            {d.winnerStart !== undefined ? `, a slice starting at byte ${d.winnerStart} of the buffer.` : "."}
          </span>
        </li>
        <li className="flex gap-1.5">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.amber }} />
          <span>
            One input lives only in the inner block, so the compiler shrinks <span className="font-mono text-[#fbbf24]">&apos;a</span> to that block.
          </span>
        </li>
        <li className="flex gap-1.5">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.lime }} />
          <span>
            <span className="font-mono text-[#d3f3a4]">{d.kept ?? "?"}</span> was copied out with <span className="font-mono">.to_string()</span> before the block ended, so it survives.
          </span>
        </li>
      </ul>
    </div>
  );
}

// ───────────────────────── 3. parse pipeline ─────────────────────────

function lineAround(buffer: string, start: number): { text: string; offset: number } | undefined {
  const bytes = enc.encode(buffer);
  if (!Number.isInteger(start) || start < 0 || start >= bytes.length) return undefined;
  let a = start;
  while (a > 0 && bytes[a - 1] !== 10) a--;
  let b = start;
  while (b < bytes.length && bytes[b] !== 10) b++;
  return { text: new TextDecoder().decode(bytes.slice(a, b)), offset: a };
}

function PipelineRow({ r, buffer }: { r: StarRec; buffer: string | undefined }) {
  const nameLen = enc.encode(r.name).length;
  const conLen = enc.encode(r.constellation).length;
  const around = buffer !== undefined && r.nameStart !== undefined ? lineAround(buffer, r.nameStart) : undefined;
  const raw =
    around ??
    ({ text: `${r.name}|${r.constellation}|${fmtNum(r.ra)}|${fmtNum(r.dec)}|${fmtNum(r.mag)}|${r.dist ?? "?"}`, offset: -1 } as const);
  const ranges: { start: number; len: number }[] = [];
  if (around && r.nameStart !== undefined) ranges.push({ start: r.nameStart - around.offset, len: nameLen });
  if (around && r.conStart !== undefined) ranges.push({ start: r.conStart - around.offset, len: conLen });
  const pieces = sliceByBytes(raw.text, ranges);
  const borrowed = (label: string, text: string, start: number | undefined, len: number) => (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-md border border-[#8aa4ff]/55 bg-[#8aa4ff]/10 px-1.5 py-0.5 font-mono text-[10.5px] text-[#dbe3ff]">
      <span className="text-[#8aa4ff]">{label}</span>
      <span className="truncate">{text}</span>
      <span className="shrink-0 text-[9.5px] text-[#b3c3ff]">{start !== undefined ? `buf ${start}..${start + len}` : "copy"}</span>
    </span>
  );
  const owned = (label: string, text: string) => (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#c5ee8a]/45 bg-[#c5ee8a]/8 px-1.5 py-0.5 font-mono text-[10.5px] text-[#e4f7c6]">
      <span className="text-[#c5ee8a]">{label}</span>
      {text}
    </span>
  );
  return (
    <li className="min-w-0 rounded-md bg-white/[0.04] px-2 py-1.5">
      <p className="break-all font-mono text-[10.5px] leading-snug text-white/70">
        {pieces.map((p, i) =>
          p.range < 0 ? (
            <React.Fragment key={i}>{p.text}</React.Fragment>
          ) : (
            <mark key={i} className="rounded-[2px] px-[1px] text-[#e6ecff]" style={{ background: "rgba(138,164,255,0.35)", boxShadow: "inset 0 -1.5px 0 #8aa4ff" }}>
              {p.text}
            </mark>
          ),
        )}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {borrowed("name", r.name, r.nameStart, nameLen)}
        {borrowed("constellation", r.constellation, r.conStart, conLen)}
        {owned("ra", fmtNum(r.ra))}
        {owned("dec", fmtNum(r.dec))}
        {owned("mag", fmtNum(r.mag))}
        {r.dist !== undefined && owned("ly", String(r.dist))}
      </div>
    </li>
  );
}

export function ParsePipeline({ s, interactive }: { s: Peak; interactive: boolean }) {
  const recs = s.records;
  if (!recs) return <Empty>No records yet. Send them with scene(&quot;records&quot;, …);</Empty>;
  const shown = recs.slice(0, interactive ? 24 : 4);
  return (
    <div className="space-y-2">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-white/70">
        <li className="rounded-full border border-white/15 px-2 py-0.5 font-mono">raw lines</li>
        <li aria-hidden>→</li>
        <li className="rounded-full border border-white/15 px-2 py-0.5 font-mono">split(&apos;|&apos;) tokens</li>
        <li aria-hidden>→</li>
        <li className="rounded-full border border-[#c5ee8a]/45 px-2 py-0.5 font-mono text-[#d3f3a4]">Record&lt;&apos;a&gt;</li>
        <li className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: C.blue }} /> &amp;&apos;a str points into the buffer
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: C.lime }} /> parsed copy
          </span>
        </li>
      </ol>
      <ul className={`space-y-1.5 ${interactive ? "max-h-72 overflow-auto pr-0.5" : ""}`}>
        {shown.map((r, i) => (
          <PipelineRow key={`${r.name}-${i}`} r={r} buffer={s.fileText ?? s.buffer} />
        ))}
      </ul>
      {recs.length > shown.length && <p className="text-[10px] text-white/60">+ {recs.length - shown.length} more records</p>}
    </div>
  );
}

// ───────────────────────── 4. module map ─────────────────────────

export function ModuleMap({ s }: { s: Peak }) {
  const reported = new Set(s.modules ?? []);
  const live = (path: string) => (path === "main" ? reported.size > 0 : reported.has(path));
  const firstLive = MODULE_TREE.slice().reverse().find((p) => reported.has(p)) ?? "main::sky::light";
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? firstLive;
  const parts = selected.split("::");
  const parent = parts.length > 1 ? parts.slice(0, -1).join("::") : undefined;
  const items = MODULE_ITEMS[selected] ?? [];
  const extra = [...reported].filter((p) => !MODULE_TREE.includes(p));
  const tree = [...MODULE_TREE, ...extra];

  return (
    <div className="space-y-2.5">
      <ul className="space-y-0.5" role="tree" aria-label="Module tree">
        {tree.map((path) => {
          const p = path.split("::");
          const depth = p.length - 1;
          const on = live(path);
          const sel = path === selected;
          return (
            <li key={path} role="treeitem" aria-selected={sel} style={{ paddingLeft: depth * 16 }}>
              <button
                type="button"
                onClick={() => setPicked(path)}
                className={`flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1 text-left font-mono text-[11px] transition-colors ${
                  sel ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/10" : "border-transparent hover:bg-white/[0.06]"
                } ${on ? "text-[#f4f4f4]" : "border-dashed !border-white/15 text-white/60"}`}
              >
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: on ? C.lime : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1px rgba(255,255,255,0.35)" }} />
                <span className="min-w-0 truncate">{depth === 0 ? "main (the crate)" : `mod ${p[p.length - 1]}`}</span>
                <span className="ml-auto shrink-0 text-[10px] text-white/60">{path}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-md bg-black/35 px-2.5 py-2">
        <p className="hud-label !text-white/65">Paths seen from <span className="font-mono normal-case text-[#d3f3a4]">{selected}</span></p>
        <dl className="mt-1 space-y-0.5 font-mono text-[10.5px]">
          <div className="flex min-w-0 gap-2">
            <dt className="w-14 shrink-0 text-[#b3c3ff]">self::</dt>
            <dd className="min-w-0 truncate text-white/85">{selected}</dd>
          </div>
          <div className="flex min-w-0 gap-2">
            <dt className="w-14 shrink-0 text-[#b3c3ff]">super::</dt>
            <dd className="min-w-0 truncate text-white/85">{parent ?? "(none: this is the crate root)"}</dd>
          </div>
          <div className="flex min-w-0 gap-2">
            <dt className="w-14 shrink-0 text-[#b3c3ff]">crate::</dt>
            <dd className="min-w-0 truncate text-white/85">main</dd>
          </div>
        </dl>
        {items.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {items.map((it) => (
              <li key={it.name} title={it.note}>
                <Pill tone={it.pub ? "accent" : "warning"}>
                  {it.pub ? "pub " : "private "}
                  {it.name}
                </Pill>
              </li>
            ))}
          </ul>
        )}
        {items.some((i) => i.note) && (
          <ul className="mt-1.5 space-y-0.5 text-[10.5px] text-white/70">
            {items
              .filter((i) => i.note)
              .map((i) => (
                <li key={i.name}>
                  <span className="font-mono text-[#f4f4f4]">{i.name}</span>: {i.note}
                </li>
              ))}
          </ul>
        )}
      </div>

      {(s.moduleChecks ?? []).length > 0 && (
        <ul className="space-y-0.5 font-mono text-[10.5px]">
          {(s.moduleChecks ?? []).map((c, i) => {
            const at = c.lastIndexOf(" = ");
            return (
              <li key={i} className="flex min-w-0 gap-2">
                <span className="min-w-0 truncate text-white/70">{at > 0 ? c.slice(0, at) : c}</span>
                {at > 0 && <span className="ml-auto shrink-0 text-[#d3f3a4]">{c.slice(at + 3)}</span>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[10px] text-white/60">In a real crate each module can live in its own file (sky/coords.rs); here they are written inline.</p>
    </div>
  );
}

// ───────────────────────── 5. error ledger ─────────────────────────

export function ErrorLedger({ s }: { s: Peak }) {
  const list = s.errorSamples;
  if (!list) return <Empty>No errors yet. Send them with scene(&quot;errorSamples&quot;, …);</Empty>;
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10.5px] text-white/70">enum CatalogError {"{"} {plural(list.length, "variant")} {"}"}</p>
      <ul className="grid gap-1.5 @xl:grid-cols-2">
        {list.map((e: ErrSample, i) => (
          <li key={`${e.kind}-${i}`} className="min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate font-mono text-[11.5px] font-semibold text-[#f4f4f4]">{e.kind}</span>
              {e.hasSource && (
                <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-[#b3c3ff]" title="source() returns the error it wraps">
                  <Link2 className="h-3 w-3" aria-hidden /> source
                </span>
              )}
            </div>
            <p className="mt-1 break-words text-[11.5px] leading-snug text-[#e4f7c6]">{e.message}</p>
            <p className="mt-1 break-all font-mono text-[10px] leading-snug text-white/60">{e.debug}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── 6. error funnel ─────────────────────────

const SOURCE_OF: Record<string, string> = { BadInt: "ParseIntError", BadFloat: "ParseFloatError" };

export function ErrorFunnel({ s }: { s: Peak }) {
  const rows = s.funnel;
  if (!rows) return <Empty>No runs yet. Send them with scene(&quot;funnel&quot;, …);</Empty>;
  const rowH = 30;
  const top = 22;
  const h = top + rows.length * rowH + 8;
  const variants = [...new Set(rows.map((r) => r.variant))];
  const varY = (v: string) => top + (variants.indexOf(v) + 0.5) * ((rows.length * rowH) / Math.max(1, variants.length));
  const t = { fontSize: 10, fontFamily: "var(--font-mono), monospace" } as const;
  const colorOf = (r: FunnelRow) => (r.via === "From" ? C.amber : r.via === "built" ? "#e8e8e8" : C.lime);
  const clip = (text: string, n: number) => (text.length > n ? text.slice(0, n - 1) + "…" : text);
  return (
    <div className="space-y-2.5">
      <svg viewBox={`0 0 360 ${h}`} className="block w-full" role="img" aria-label="Error funnel: inputs flow through the question-mark operator into CatalogError variants">
        <text x="4" y="12" {...t} fill="rgba(255,255,255,0.65)">input</text>
        <text x="176" y="12" {...t} textAnchor="middle" fill={C.amber}>?  +  From</text>
        <text x="356" y="12" {...t} textAnchor="end" fill="rgba(255,255,255,0.65)">CatalogError</text>
        <rect x="156" y={top - 4} width="40" height={rows.length * rowH + 4} rx="8" fill="rgba(251,191,36,0.1)" stroke="rgba(251,191,36,0.5)" strokeDasharray="3 3" />
        {rows.map((r, i) => {
          const y = top + i * rowH + rowH / 2;
          const ty = r.variant === "Ok" ? y : varY(r.variant);
          const col = colorOf(r);
          return (
            <g key={i}>
              <rect x="2" y={y - 10} width="96" height="20" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" />
              <text x="8" y={y + 3.5} {...t} fill="#f4f4f4">{clip(`"${r.input}"`, 14)}</text>
              <path d={`M98 ${y} C 130 ${y}, 140 ${y}, 156 ${y} ${r.via === "built" ? "" : `L196 ${y}`} C 230 ${y}, 240 ${ty}, 262 ${ty}`} fill="none" stroke={col} strokeWidth="1.6" strokeDasharray={r.via === "built" ? "4 3" : undefined} opacity="0.95" />
              {r.via === "From" && <circle cx="176" cy={y} r="3.5" fill={C.amber} />}
            </g>
          );
        })}
        {variants.map((v) => {
          const y = varY(v);
          const bad = v !== "Ok";
          return (
            <g key={v}>
              <rect x="262" y={y - 11} width="94" height="22" rx="5" fill={bad ? "rgba(248,113,113,0.12)" : "rgba(197,238,138,0.12)"} stroke={bad ? "rgba(248,113,113,0.6)" : "rgba(197,238,138,0.6)"} />
              <text x="309" y={y + 3.5} {...t} textAnchor="middle" fill={bad ? "#fecaca" : C.limeSoft}>{clip(v, 14)}</text>
            </g>
          );
        })}
      </svg>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <Pill tone={r.via === "From" ? "warning" : r.via === "built" ? "plain" : "accent"}>{r.via === "From" ? "converted by ?" : r.via === "built" ? "built here" : "ok"}</Pill>
            <span className="font-mono text-[#f4f4f4]">&quot;{r.input}&quot;</span>
            {r.via === "From" && SOURCE_OF[r.variant] && <span className="font-mono text-[10px] text-white/65">{SOURCE_OF[r.variant]} → {r.variant}</span>}
            <span className="min-w-0 break-words text-white/80">{r.message}</span>
          </li>
        ))}
      </ul>

      {(s.quickChecks ?? []).length > 0 && (
        <div className="rounded-md bg-black/35 px-2.5 py-2">
          <p className="hud-label !text-white/65">
            Box&lt;dyn Error&gt; <ArrowDown className="inline h-3 w-3" aria-hidden /> any error fits, the variant is lost
          </p>
          <ul className="mt-1.5 space-y-1">
            {(s.quickChecks ?? []).map((q, i) => (
              <li key={i} className="flex min-w-0 items-start gap-1.5 text-[11px]">
                {q.ok ? <Check className="mt-[2px] h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden /> : <X className="mt-[2px] h-3 w-3 shrink-0 text-[#f87171]" aria-hidden />}
                <span className="shrink-0 font-mono text-[#f4f4f4]">{q.label}</span>
                <span className="min-w-0 break-words text-white/75">{q.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
