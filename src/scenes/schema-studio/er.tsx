"use client";

import React from "react";
import { KeyRound, Link2, Zap } from "lucide-react";
import { buildGraph, clip, estHeight, isJunction, parseChecks, plural, type Edge, type Entity, type Flags, type Graph, type SketchLink, type TableInfo } from "./model";
import { Ghost, Pill } from "./ui";

/**
 * The hero of the scene: a live ER diagram.
 *
 * Cards are ordinary flow layout (so text never overlaps and wraps naturally); the arrows are an SVG
 * drawn behind them from positions measured off the DOM (offsetLeft / offsetTop, which ignore any
 * CSS scale the compact overview applies). Layers follow foreign-key depth: parents on the left.
 * Narrow containers get stacked compact cards instead of arrows.
 */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Geom {
  w: number;
  h: number;
  cards: Record<string, Box>;
  rows: Record<string, number>;
}

const EMPTY: Geom = { w: 0, h: 0, cards: {}, rows: {} };

function sameGeom(a: Geom, b: Geom): boolean {
  if (a.w !== b.w || a.h !== b.h) return false;
  const ka = Object.keys(a.cards);
  if (ka.length !== Object.keys(b.cards).length) return false;
  for (const k of ka) {
    const p = a.cards[k];
    const q = b.cards[k];
    if (!q || p.x !== q.x || p.y !== q.y || p.w !== q.w || p.h !== q.h) return false;
  }
  const kr = Object.keys(a.rows);
  if (kr.length !== Object.keys(b.rows).length) return false;
  return kr.every((k) => a.rows[k] === b.rows[k]);
}

/** Measures the card and row positions inside an element, and re-measures when anything resizes or is added. */
function useGeom(): [Geom, (el: HTMLElement | null) => void | (() => void)] {
  const [geom, setGeom] = React.useState<Geom>(EMPTY);
  const ref = React.useCallback((el: HTMLElement | null) => {
    if (!el) return;
    let raf = 0;
    const watched = new Set<Element>();
    const ro = new ResizeObserver(() => schedule());
    const measure = () => {
      raf = 0;
      const cards: Record<string, Box> = {};
      const rows: Record<string, number> = {};
      el.querySelectorAll<HTMLElement>("[data-er-card]").forEach((c) => {
        cards[c.dataset.erCard ?? ""] = { x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight };
        if (!watched.has(c)) {
          watched.add(c);
          ro.observe(c);
        }
      });
      el.querySelectorAll<HTMLElement>("[data-er-row]").forEach((r) => {
        rows[r.dataset.erRow ?? ""] = r.offsetTop + r.offsetHeight / 2;
      });
      const next: Geom = { w: el.offsetWidth, h: el.offsetHeight, cards, rows };
      setGeom((prev) => (sameGeom(prev, next) ? prev : next));
    };
    function schedule() {
      if (!raf) raf = requestAnimationFrame(measure);
    }
    ro.observe(el);
    const mo = new MutationObserver(schedule);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    schedule();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return [geom, ref];
}

// ───────────────────────── card pieces ─────────────────────────

const TYPE_SHORT: Record<string, string> = { INTEGER: "int", TEXT: "text", REAL: "real", BLOB: "blob", ANY: "any", NUMERIC: "num" };
const typeShort = (t: string) => TYPE_SHORT[t.toUpperCase()] ?? t.toLowerCase();

interface FkInfo {
  action: string;
  parent: string;
}

function fkOf(t: TableInfo, col: string): FkInfo | null {
  const fk = t.foreignKeys.find((f) => f.from.includes(col));
  return fk ? { action: fk.onDelete, parent: fk.table } : null;
}

function actionTone(action: string): string {
  if (action === "CASCADE") return "text-[#abd373]";
  if (action === "SET NULL") return "text-[#fbbf24]";
  return "text-white/70";
}

function footChips(t: TableInfo, flags: Flags): { text: string; tone: "plain" | "accent" | "warning"; title?: string }[] {
  const chips: { text: string; tone: "plain" | "accent" | "warning"; title?: string }[] = [];
  if (flags.checks) {
    const cks = parseChecks(t.sql);
    cks.slice(0, 3).forEach((c) => chips.push({ text: `CK ${clip(c.name ?? c.expr, 18)}`, tone: "plain", title: c.expr }));
    if (cks.length > 3) chips.push({ text: `+${cks.length - 3} CK`, tone: "plain" });
  }
  if (flags.smart) {
    for (const ix of t.indexes) {
      if (ix.origin !== "c") continue;
      const expr = ix.columns.includes("<expr>");
      if (!ix.partial && !expr) continue;
      const text = `${ix.unique ? "UQ·" : ""}${ix.partial ? "partial" : "expr"}`;
      chips.push({ text, tone: "accent", title: `${ix.name} (${ix.columns.join(", ")})` });
    }
  }
  if (flags.junction && isJunction(t)) chips.unshift({ text: "junction", tone: "accent", title: "a junction table: it joins two tables many-to-many" });
  if (flags.audit && t.triggers.length > 0) chips.push({ text: `${t.triggers.length} trigger${t.triggers.length === 1 ? "" : "s"}`, tone: "warning", title: t.triggers.map((g) => g.name).join(", ") });
  return chips;
}

function Row({ t, c, flags }: { t: TableInfo; c: TableInfo["columns"][number]; flags: Flags }) {
  const fk = flags.links ? fkOf(t, c.name) : null;
  const isPk = flags.keys && c.pk > 0;
  const uq = flags.keys && t.indexes.some((i) => i.unique && !i.partial && i.origin !== "pk" && i.columns.length === 1 && i.columns[0] === c.name);
  const label = fk && fk.action !== "NO ACTION" ? fk.action : null;
  return (
    <div data-er-row={`${t.name}.${c.name}`} className="flex h-[15px] min-w-0 items-center gap-1 px-2 font-mono text-[10.5px] leading-none">
      <span className="flex w-[11px] shrink-0 items-center justify-center">
        {isPk ? <KeyRound className="h-2.5 w-2.5 text-[#c5ee8a]" aria-label="primary key" /> : fk ? <Link2 className="h-2.5 w-2.5 text-white/55" aria-label="foreign key" /> : null}
      </span>
      <span className={`min-w-0 truncate ${c.generated ? "italic text-white/70" : isPk ? "text-white" : "text-white/85"}`} title={c.dflt !== null ? `${c.name} · default ${c.dflt}` : c.name}>
        {c.generated && <span className="pr-0.5 text-[#abd373]">fx</span>}
        {c.name}
        {c.notNull && c.pk === 0 && <span className="text-[#c5ee8a]/60" title="NOT NULL"> *</span>}
      </span>
      {uq && <span className="shrink-0 rounded-sm bg-[#c5ee8a]/15 px-[3px] py-px text-[10px] font-bold text-[#d3f3a4]">UQ</span>}
      <span className={`ml-auto shrink-0 pl-1 text-[10px] ${label ? actionTone(label) : "text-white/40"}`}>
        {label ? label : typeShort(c.type)}
        {!label && c.dflt !== null && <span title={`default ${c.dflt}`}> =</span>}
      </span>
    </div>
  );
}

function FullCard({ e, flags, spot }: { e: Entity; flags: Flags; spot: boolean }) {
  const t = e.table;
  if (!t) return <GhostCard e={e} flags={flags} />;
  const chips = footChips(t, flags);
  return (
    <div data-er-card={t.name} className={`relative z-10 min-w-0 overflow-hidden rounded-lg border bg-[#0d0d0d] ${spot ? "border-[#c5ee8a]/45" : "border-white/12"}`}>
      <div className="flex min-w-0 items-center gap-1.5 border-b border-white/[0.07] px-2 py-1">
        <span className="hud-value min-w-0 flex-1 truncate text-[11.5px] font-semibold text-white">{t.name}</span>
        <span className="hud-value shrink-0 text-[10px] tabular-nums text-white/45" title={plural(t.rowCount, "row")}>
          {t.rowCount.toLocaleString("en-US")}
        </span>
      </div>
      <div className="py-1">
        {t.columns.map((c) => (
          <Row key={c.name} t={t} c={c} flags={flags} />
        ))}
      </div>
      {chips.length > 0 && (
        <div className="flex min-w-0 flex-wrap gap-1 border-t border-white/[0.07] px-2 py-1">
          {chips.map((c, i) => (
            <Pill key={i} tone={c.tone} title={c.title} className="!h-[15px] !text-[10px]">
              {c.text.startsWith("CK") || !c.text.includes("trigger") ? c.text : <><Zap className="mr-0.5 h-2.5 w-2.5" />{c.text}</>}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

function GhostCard({ e, flags }: { e: Entity; flags: Flags }) {
  return (
    <div data-er-card={e.name} className="relative z-10 min-w-0 rounded-lg border border-dashed border-[#c5ee8a]/45 bg-[#0d0d0d] px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="hud-value min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[#d3f3a4]/80">{e.name}</span>
        {flags.tables && <span className="shrink-0 font-mono text-[10px] text-white/40">to build</span>}
      </div>
    </div>
  );
}

function MiniCard({ e }: { e: Entity }) {
  const t = e.table;
  if (!t) {
    return (
      <div data-er-card={e.name} className="relative z-10 flex min-w-0 items-center rounded-md border border-dashed border-[#c5ee8a]/45 bg-[#0d0d0d] px-1.5 py-1">
        <span className="hud-value min-w-0 flex-1 truncate text-[10.5px] font-semibold text-[#d3f3a4]/80">{e.name}</span>
      </div>
    );
  }
  return (
    <div data-er-card={t.name} className="relative z-10 flex min-w-0 items-center gap-1 rounded-md border border-white/14 bg-[#0d0d0d] px-1.5 py-1">
      <span className="hud-value min-w-0 flex-1 truncate text-[10.5px] font-semibold text-white" title={`${t.name} · ${plural(t.rowCount, "row")}`}>
        {t.name}
      </span>
    </div>
  );
}

/** Stacked card for narrow screens: no arrows, links written out as chips. */
function PhoneCard({ e, flags }: { e: Entity; flags: Flags }) {
  const t = e.table;
  if (!t) {
    return (
      <div className="min-w-0 rounded-lg border border-dashed border-[#c5ee8a]/45 px-2 py-1.5">
        <span className="hud-value text-[11.5px] font-semibold text-[#d3f3a4]/80">{e.name}</span>
        {flags.tables && <span className="ml-2 font-mono text-[10px] text-white/40">to build</span>}
      </div>
    );
  }
  const chips = footChips(t, flags);
  return (
    <div className="min-w-0 rounded-lg border border-white/12 bg-[#0d0d0d] px-2 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="hud-value min-w-0 flex-1 truncate text-[11.5px] font-semibold text-white">{t.name}</span>
        <span className="hud-value shrink-0 text-[10px] tabular-nums text-white/45">{t.rowCount.toLocaleString("en-US")}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 font-mono text-[10.5px] leading-snug">
        {t.columns.map((c) => (
          <span key={c.name} className={`inline-flex items-center gap-0.5 ${c.generated ? "italic text-white/70" : "text-white/75"}`}>
            {flags.keys && c.pk > 0 && <KeyRound className="h-2.5 w-2.5 text-[#c5ee8a]" />}
            {c.name}
          </span>
        ))}
      </div>
      {flags.links && t.foreignKeys.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {t.foreignKeys.map((f, i) => (
            <Pill key={i} tone={f.onDelete === "SET NULL" ? "warning" : f.onDelete === "CASCADE" ? "accent" : "plain"}>
              → {f.table}.{f.to[0] || "id"}
              {f.onDelete !== "NO ACTION" ? ` · ${f.onDelete}` : ""}
            </Pill>
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {chips.map((c, i) => (
            <Pill key={i} tone={c.tone} title={c.title}>
              {c.text}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── arrows ─────────────────────────

function route(a: Box, ay: number, b: Box, by: number) {
  if (a.x + a.w + 4 <= b.x) {
    const x1 = a.x + a.w;
    const x2 = b.x;
    const mid = (x1 + x2) / 2;
    return { d: `M${x1} ${ay} C${mid} ${ay} ${mid} ${by} ${x2} ${by}`, x1, x2, dirA: 1, dirB: -1, mx: mid, my: (ay + by) / 2 };
  }
  if (b.x + b.w + 4 <= a.x) {
    const x1 = a.x;
    const x2 = b.x + b.w;
    const mid = (x1 + x2) / 2;
    return { d: `M${x1} ${ay} C${mid} ${ay} ${mid} ${by} ${x2} ${by}`, x1, x2, dirA: -1, dirB: 1, mx: mid, my: (ay + by) / 2 };
  }
  const x1 = a.x + a.w;
  const x2 = b.x + b.w;
  const bulge = 24;
  return { d: `M${x1} ${ay} C${x1 + bulge} ${ay} ${x2 + bulge} ${by} ${x2} ${by}`, x1, x2, dirA: 1, dirB: 1, mx: Math.max(x1, x2) + bulge * 0.75, my: (ay + by) / 2 };
}

function Arrows({ geom, edges, mini }: { geom: Geom; edges: Edge[]; mini: boolean }) {
  return (
    <svg className="pointer-events-none absolute left-0 top-0 z-0" width={geom.w} height={geom.h} aria-hidden>
      {edges.map((e, i) => {
        const a = geom.cards[e.parent];
        const b = geom.cards[e.child];
        if (!a || !b) return null;
        const ay = (e.parentCol && geom.rows[`${e.parent}.${e.parentCol}`]) || a.y + 13;
        const by = (e.childCol && geom.rows[`${e.child}.${e.childCol}`]) || b.y + 13;
        const r = route(a, ay, b, by);
        const sketch = e.kind === "sketch";
        const nm = e.cardinality === "N:M";
        const stroke = sketch ? "rgba(255,255,255,0.4)" : "rgba(197,238,138,0.78)";
        return (
          <g key={i}>
            <path d={r.d} fill="none" stroke={stroke} strokeWidth={e.junction ? 2.4 : sketch ? 1.3 : 1.4} strokeDasharray={sketch ? "4 4" : undefined} />
            {!mini && (
              <>
                <text x={r.x1 + r.dirA * 7} y={ay - 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill={sketch ? "rgba(255,255,255,0.6)" : "rgba(211,243,164,0.9)"}>
                  {nm ? "N" : "1"}
                </text>
                <text x={r.x2 + r.dirB * 7} y={by - 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill={sketch ? "rgba(255,255,255,0.6)" : "rgba(211,243,164,0.9)"}>
                  N
                </text>
              </>
            )}
            {nm && !mini && (
              <g>
                <rect x={r.mx - 15} y={r.my - 8} width="30" height="16" rx="8" fill="#0d0d0d" stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
                <text x={r.mx} y={r.my + 3.5} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.75)">
                  N:M
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ───────────────────────── the diagram ─────────────────────────

function drawnEdges(graph: Graph, flags: Flags): Edge[] {
  const real = new Set(graph.entities.filter((e) => e.table).map((e) => e.name));
  const fk = graph.edges.filter((e) => e.kind === "fk");
  const linked = (a: string, b: string) => fk.some((e) => (e.parent === a && e.child === b) || (e.parent === b && e.child === a));
  const joined = (a: string, b: string) => graph.entities.some((x) => x.table && x.table.foreignKeys.some((f) => f.table === a) && x.table.foreignKeys.some((f) => f.table === b));
  const out: Edge[] = [];
  if (flags.links) out.push(...fk);
  for (const e of graph.edges) {
    if (e.kind !== "sketch") continue;
    const both = real.has(e.parent) && real.has(e.child);
    if (e.cardinality === "N:M") {
      if (both && joined(e.parent, e.child)) continue;
    } else if (both && flags.links && linked(e.parent, e.child)) continue;
    out.push(e);
  }
  return out;
}

export function ErDiagram({
  tables,
  sketch,
  flags,
  mode = "full",
  fixedWidth,
  focus,
}: {
  tables: TableInfo[];
  sketch: SketchLink[];
  flags: Flags;
  mode?: "full" | "mini";
  fixedWidth?: number;
  focus?: string | null;
}) {
  const graph = buildGraph(tables, sketch, flags);
  const [geom, ref] = useGeom();
  const mini = mode === "mini";
  const w = fixedWidth ?? geom.w;
  const L = graph.layers.length;

  if (graph.entities.length === 0) return null;

  // phone: stacked cards, no arrows
  if (!mini && w > 0 && w < 520) {
    const ordered = [...graph.layers.flat(), ...graph.standalone];
    return (
      <div ref={ref}>
        <ErDiagram tables={tables} sketch={sketch} flags={flags} mode="mini" />
        <div className="mt-3 grid items-start gap-2" style={{ gridTemplateColumns: w >= 330 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)" }}>
          {ordered.map((e) => (
            <PhoneCard key={e.name} e={e} flags={flags} />
          ))}
        </div>
      </div>
    );
  }

  const G = mini ? 26 : 38;
  const minCard = mini ? 80 : 150;
  let C = Math.max(L, 1);
  if (w > 0) C = Math.max(L, Math.min(8, Math.floor((w + G) / (minCard + G))));
  const k = Array.from({ length: L }, () => 1);
  const height = (l: number) => graph.layers[l].reduce((n, e) => n + estHeight(e, mode), 0);
  for (let extra = C - L; extra > 0; extra--) {
    let best = -1;
    let bestH = 0;
    for (let l = 0; l < L; l++) {
      const h = height(l) / k[l];
      if (graph.layers[l].length > k[l] && h > bestH && h > (mini ? 120 : 420)) {
        best = l;
        bestH = h;
      }
    }
    if (best < 0) break;
    k[best]++;
  }
  const columns: Entity[][] = [];
  graph.layers.forEach((layer, l) => {
    const cols: Entity[][] = Array.from({ length: k[l] }, () => []);
    const heights = cols.map(() => 0);
    for (const e of layer) {
      let target = 0;
      for (let c = 1; c < cols.length; c++) if (heights[c] < heights[target]) target = c;
      cols[target].push(e);
      heights[target] += estHeight(e, mode) + 10;
    }
    columns.push(...cols);
  });
  const used = Math.max(columns.length, 1);
  const template = { gridTemplateColumns: `repeat(${used}, minmax(0, ${mini ? 130 : 230}px))`, columnGap: G, justifyContent: "center" } as const;
  const edges = drawnEdges(graph, flags);
  const card = (e: Entity) => (mini ? <MiniCard key={e.name} e={e} /> : <FullCard key={e.name} e={e} flags={flags} spot={focus === e.name} />);

  return (
    <div ref={ref} className="relative isolate" style={fixedWidth ? { width: fixedWidth } : undefined}>
      <Arrows geom={geom} edges={edges} mini={mini} />
      <div className="grid items-start" style={template}>
        {columns.map((col, ci) => (
          <div key={ci} className={`flex min-w-0 flex-col ${mini ? "gap-1.5" : "gap-2.5"}`} style={{ gridColumn: ci + 1 }}>
            {col.map(card)}
          </div>
        ))}
      </div>
      {graph.standalone.length > 0 && (
        <div className={`grid items-start ${mini ? "mt-2 gap-y-1.5" : "mt-3 gap-y-2.5"}`} style={template}>
          {graph.standalone.map((e) => card(e))}
        </div>
      )}
    </div>
  );
}

export function ErLegend({ flags }: { flags: Flags }) {
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/45">
      <span>
        <span className="text-[#c5ee8a]/70">*</span> NOT NULL
      </span>
      <span>= has DEFAULT</span>
      {flags.keys && (
        <span className="inline-flex items-center gap-1">
          <KeyRound className="h-2.5 w-2.5 text-[#c5ee8a]" /> primary key · UQ unique
        </span>
      )}
      {flags.links && (
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-2.5 w-2.5 text-white/55" /> foreign key
        </span>
      )}
      {flags.junction && <span>fx generated</span>}
    </p>
  );
}

export function ErGhost({ message, tall = false }: { message: string; tall?: boolean }) {
  return (
    <div className={tall ? "[&_svg]:h-48" : ""}>
      <Ghost kind="er" />
      <p className="mt-2 text-center font-mono text-[10.5px] text-white/45">{message}</p>
    </div>
  );
}
