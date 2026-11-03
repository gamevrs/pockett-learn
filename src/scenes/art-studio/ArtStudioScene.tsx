"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lock, Minus, Plus } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { FeatureIcon } from "@/components/ui/icons";
import * as S from "./studio";
import type { Grid, RGB } from "./studio";

/**
 * Lantern Lane Print Shop: the press room.
 *
 * Everything on screen is produced by the learner's Python: the poster grids, the swatches, the labels.
 * The scene only draws what comes back and never decides a colour itself (it hands your functions a few
 * sample inputs, e.g. the shelf of inks, and shows the answers). A feature that is not unlocked yet is a
 * dashed blueprint. Lime means "your code made this".
 */

type TabId = "hand" | "checker" | "seeded" | "rings";
const TABS: { id: TabId; label: string; feature: string; hook: string | null }[] = [
  { id: "hand", label: "Hand-made", feature: "as-poster", hook: null },
  { id: "checker", label: "Checker", feature: "as-patterns", hook: "checker" },
  { id: "seeded", label: "Seeded", feature: "as-seed", hook: "random_poster" },
  { id: "rings", label: "Rings", feature: "as-radial", hook: "radial_grid" },
];

const PANEL_LESSON: Record<string, number> = {
  "as-swatch": 1, "as-tints": 2, "as-extremes": 3, "as-hex": 4, "as-poster": 5, "as-patterns": 6, "as-inks": 7, "as-legend": 8, "as-slices": 9,
  "as-banner": 10, "as-palette": 11, "as-report": 12, "as-pastel": 13, "as-ranking": 14, "as-seed": 15, "as-proof": 16, "as-radial": 17,
};

const GHOST_POSTER: Grid = Array.from({ length: 6 }, () => Array.from({ length: 8 }, () => [255, 255, 255] as RGB));

// ───────────────────────── small pieces ─────────────────────────

function Panel({ id, title, meta, focus, flash, children }: { id: string; title: string; meta?: React.ReactNode; focus: boolean; flash: boolean; children: React.ReactNode }) {
  return (
    <section data-panel={id} className={`hud-panel mb-3 break-inside-avoid px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <FeatureIcon id={id} className="h-3.5 w-3.5" />
        </span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function LockedPanel({ id, title, clause, spot }: { id: string; title: string; clause: string; spot: boolean }) {
  return (
    <section data-panel={id} className={`mb-3 break-inside-avoid rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
      <header className="flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{PANEL_LESSON[id]}</span>
      </header>
      <p className="mt-1.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

function Chip({ colour, caption, size = 34, ring = false }: { colour: RGB; caption?: string; size?: number; ring?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1" style={{ width: size + 14 }}>
      <span
        className={`block rounded-md border ${ring ? "border-[#c5ee8a] ring-2 ring-[#c5ee8a]/40" : "border-white/20"}`}
        style={{ width: size, height: size, background: S.cssColour(colour) }}
        title={S.hexOf(colour)}
      />
      {caption && <span className="w-full truncate text-center font-mono text-[9px] text-white/55">{caption}</span>}
    </div>
  );
}

function MiniGrid({ grid, onClick, active }: { grid: Grid; onClick?: () => void; active?: boolean }) {
  const cols = grid[0].length;
  const body = (
    <div className="grid gap-px overflow-hidden rounded-[4px]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, width: 64, aspectRatio: `${cols} / ${grid.length}` }}>
      {grid.flatMap((row, r) => row.map((c, i) => <span key={`${r}:${i}`} style={{ background: S.cssColour(c) }} />))}
    </div>
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-label="Use this seed" className={`rounded-md p-0.5 ${active ? "ring-2 ring-[#c5ee8a]" : "ring-1 ring-white/15 hover:ring-white/40"}`}>
      {body}
    </button>
  ) : (
    body
  );
}

function Lines({ lines, empty }: { lines: string[] | null; empty: string }) {
  if (!lines || lines.length === 0) return <p className="text-[11px] text-white/45">{empty}</p>;
  return (
    <div className="hud-log max-h-40 overflow-auto text-[10.5px]">
      {lines.map((l, i) => (
        <div key={`${i}:${l}`} className="hud-log-line whitespace-pre">
          {l}
        </div>
      ))}
    </div>
  );
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

// ───────────────────────── the press room ─────────────────────────

function Studio({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const live = !!program && unlocked.has("as-swatch");
  const [seed, setSeed] = useState(2024);
  const [userTab, setUserTab] = useState<TabId | null>(null);
  const [seenNonce, setSeenNonce] = useState<number | null>(celebration?.nonce ?? null);
  const [picked, setPicked] = useState<{ r: number; c: number } | null>(null);
  const [colourText, setColourText] = useState("240, 90, 60");
  const [sizeText, setSizeText] = useState("6x8");
  const [lookup, setLookup] = useState("poppy");

  const flashing = new Set(celebration?.features ?? []);
  const available = TABS.filter((t) => unlocked.has(t.feature));

  // A fresh unlock brings its poster tab to the front (adjusting state while rendering is allowed).
  if (celebration && celebration.nonce !== seenNonce) {
    setSeenNonce(celebration.nonce);
    const fresh = TABS.find((t) => celebration.features.includes(t.feature));
    if (fresh) setUserTab(fresh.id);
  }
  const tab: TabId | null = userTab && available.some((t) => t.id === userTab) ? userTab : (available[available.length - 1]?.id ?? null);

  // Demo mode: wander through the posters and seeds on its own.
  useEffect(() => {
    if (!autoplay || !live) return;
    const id = window.setInterval(() => {
      setSeed((s) => s + 1);
      setUserTab((cur) => {
        const ids = TABS.filter((t) => unlocked.has(t.feature)).map((t) => t.id);
        if (ids.length === 0) return cur;
        const at = cur ? ids.indexOf(cur) : -1;
        return ids[(at + 1) % ids.length];
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, [autoplay, live, unlocked]);

  const unlockKey = [...unlocked].sort().join(",");

  /** Everything the learner's variables and functions say, read once per run / unlock. */
  const facts = useMemo(() => {
    if (!program) return null;
    const call = <T,>(name: string, ...args: unknown[]): T | undefined => (program.hasHook(name) ? program.call<T>(name, ...args) : undefined);
    const has = (id: string) => unlocked.has(id);
    const ink = S.toColour(program.list("ink"));
    const swatchList = S.toColourList(program.list("swatches"));
    const palette: Record<string, RGB> = {};
    for (const [k, v] of Object.entries(program.dict("palette"))) {
      const c = S.toColour(v);
      if (c) palette[k] = c;
    }
    const paletteOn = has("as-palette") && Object.keys(palette).length > 0;
    const names = strings(program.list("shelf_names"));
    const shelfNames = names.length >= swatchList.length && names.length > 0 ? names : S.SHELF_NAMES;
    const shelf = swatchList.length > 0 ? swatchList : S.SHELF;
    const pool = paletteOn ? Object.values(palette) : shelf;
    const title = program.str("poster_title", "");
    const raw = program.str("raw_title", "");

    const strip: { colour: RGB; caption: string }[] = paletteOn
      ? Object.entries(palette).map(([n, c]) => ({ colour: c, caption: n }))
      : has("as-extremes") || has("as-hex")
        ? shelf.map((c, i) => ({ colour: c, caption: shelfNames[i] ?? "" }))
        : ink
          ? [{ colour: ink, caption: "ink" }]
          : [];

    const tints: { caption: string; colour: RGB }[] = [];
    if (ink && has("as-tints")) {
      tints.push({ caption: "ink", colour: ink });
      const a = S.toColour(call("tint", ink));
      if (a) tints.push({ caption: "tint(ink)", colour: a });
      const b = S.toColour(call("tint", ink, 0.5));
      if (b) tints.push({ caption: "tint 0.5", colour: b });
      const c = S.toColour(call("tint", ink, 0.75));
      if (c) tints.push({ caption: "tint 0.75", colour: c });
      const sh = S.toColour(program.list("shade"));
      if (sh) tints.push({ caption: "shade", colour: sh });
    }

    const ext = has("as-extremes") ? call<unknown[]>("extremes", shelf) : undefined;
    const extremes = Array.isArray(ext) && ext.length === 2 ? [S.toColour(ext[0]), S.toColour(ext[1])] : null;
    const bright = (c: RGB) => {
      const v = call<number>("brightness", c);
      return typeof v === "number" ? v : null;
    };
    const hexLines = has("as-hex") ? shelf.slice(0, 6).map((c, i) => call<string>("label", shelfNames[i] ?? `ink ${i + 1}`, c)).filter((l): l is string => typeof l === "string") : null;
    const legendLines = has("as-legend") ? call<string[]>("legend", shelfNames.slice(0, shelf.length), shelf) : undefined;
    const numbered = has("as-legend") ? call<string[]>("row_labels", shelfNames.slice(0, shelf.length)) : undefined;

    const slice = has("as-slices") && title
      ? {
          title,
          stamp: call<string>("stamp", title, 7),
          tail: call<string>("tail", title, 6),
          mirror: call<string>("mirror", title),
        }
      : null;

    const cleaned = has("as-banner") && raw ? call<string>("clean_title", raw) : undefined;
    const banner = typeof cleaned === "string" ? call<string>("banner", cleaned, 32) : undefined;
    const tag = typeof cleaned === "string" ? call<string>("hashtag", cleaned) : undefined;

    const report = has("as-report") && Object.keys(palette).length > 0
      ? { lines: call<string[]>("palette_lines", palette), dark: call<string[]>("dark_names", palette), average: call<number>("average_brightness", palette) }
      : null;

    const pastelRaw = has("as-pastel") && paletteOn ? call<Record<string, unknown>>("lighter_palette", palette) : undefined;
    const pastel: { colour: RGB; caption: string }[] = pastelRaw && typeof pastelRaw === "object" ? Object.entries(pastelRaw).flatMap(([n, v]) => (S.toColour(v) ? [{ colour: S.toColour(v) as RGB, caption: n }] : [])) : [];

    const rankedRaw = has("as-ranking") && paletteOn ? call<string[]>("ranked_names", palette) : undefined;
    const ranked = strings(rankedRaw).filter((n) => palette[n]);

    const hand = S.toGrid(program.list("poster"));
    const inksUsed = has("as-inks") ? S.toColourList(program.list("inks_used")) : [];
    const finalPoster = S.toGrid(program.list("final_poster"));
    const rows = program.num("rows", hand?.length ?? 0);
    const cols = program.num("cols", hand?.[0]?.length ?? 0);
    const corner = S.toColour(program.list("corner"));

    // Two sample colours for the pattern lab: the learner's ink and a lighter or darker partner.
    const c1 = ink ?? shelf[0];
    const c2 = S.toColour(program.list("shade")) ?? shelf[3];

    return { ink, shelf, shelfNames, pool, title, strip, tints, extremes, bright, hexLines, legendLines, numbered, slice, banner, tag, report, pastel, ranked, palette, paletteOn, hand, inksUsed, finalPoster, rows, cols, corner, c1, c2, call };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, program?.generation, unlockKey]);

  /** The grid on the big poster, from the learner's code. */
  const grid: Grid | null = useMemo(() => {
    if (!program || !facts || !tab) return null;
    if (tab === "hand") return facts.hand;
    if (tab === "checker") return S.toGrid(facts.call("checker", 8, 10, facts.c1, facts.c2));
    if (tab === "seeded") return S.toGrid(facts.call("random_poster", 8, 12, facts.pool, seed));
    return S.toGrid(facts.call("radial_grid", 11, 15, facts.pool));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, tab, seed]);

  const seedThumbs = useMemo(() => {
    if (!facts || !unlocked.has("as-seed")) return [];
    return [seed - 1, seed, seed + 1].map((s) => ({ s, grid: S.toGrid(facts.call("random_poster", 4, 6, facts.pool, s)) }));
  }, [facts, seed, unlocked]);

  const patternThumbs = useMemo(() => {
    if (!facts || !unlocked.has("as-patterns")) return [];
    return [S.toGrid(facts.call("checker", 4, 4, facts.c1, facts.c2)), S.toGrid(facts.call("checker", 4, 6, facts.c2, facts.c1))];
  }, [facts, unlocked]);

  const radialInfo = useMemo(() => {
    if (!facts || !unlocked.has("as-radial")) return null;
    const g = facts.finalPoster ?? S.toGrid(facts.call("radial_grid", 11, 15, facts.pool));
    // poster_summary() needs hashable cells (it builds a set), so read the learner's own `report` instead of feeding it JSON.
    const sum = program ? program.dict<unknown>("report") : {};
    return { grid: g, sum: typeof sum.rows === "number" && typeof sum.cols === "number" ? sum : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, unlocked]);

  const proof = useMemo(() => {
    if (!facts || !unlocked.has("as-proof")) return null;
    const c = facts.call("parse_colour", colourText);
    const s = facts.call("parse_size", sizeText);
    return { colour: c === undefined ? undefined : S.toColour(c), colourRaw: c, size: Array.isArray(s) ? s : s === undefined ? undefined : null };
  }, [facts, unlocked, colourText, sizeText]);

  const looked = useMemo(() => {
    if (!facts || !unlocked.has("as-palette")) return null;
    return S.toColour(facts.call("colour_for", lookup));
  }, [facts, unlocked, lookup]);

  const shown = live && grid ? grid : null;
  const cell = shown && picked && picked.r < shown.length && picked.c < shown[0].length ? shown[picked.r][picked.c] : null;
  const headline = facts?.banner ?? (facts?.slice ? facts.slice.title : null);
  const tabHook = TABS.find((t) => t.id === tab)?.hook;
  const missingHook = live && tab && tabHook && program && !program.hasHook(tabHook) ? tabHook : null;

  const panel = (id: string, title: string, clause: string, body: () => React.ReactNode, meta?: React.ReactNode) =>
    unlocked.has(id) && facts ? (
      <Panel id={id} title={title} meta={meta} focus={focus === id} flash={flashing.has(id)}>
        {body()}
      </Panel>
    ) : (
      <LockedPanel id={id} title={title} clause={clause} spot={focus === id} />
    );

  return (
    <div className="@container absolute inset-0 overflow-y-auto overscroll-contain">
      <div className="px-3 pb-3 pt-12">
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 px-0.5">
          <h2 className="hud-title min-w-0 truncate">Lantern Lane Print Shop</h2>
          {live && facts && (
            <span className="hud-label shrink-0">
              <span className="hud-value hud-accent">{facts.strip.length || 1}</span> {facts.strip.length === 1 ? "ink" : "inks"} on the bench
            </span>
          )}
        </div>

        {/* the poster */}
        <section className="hud-panel mb-3 px-3 py-3" data-panel="poster" aria-label="Poster">
          {headline && (
            <p className="mb-2 overflow-x-auto whitespace-pre text-center font-mono text-[11px] tracking-wide text-[#c5ee8a]" data-testid="banner-line">
              {headline}
            </p>
          )}
          {available.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Poster">
              {available.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`hud-btn !h-6 !px-2.5 text-[10.5px] ${tab === t.id ? "hud-btn-on" : ""}`}
                  onClick={() => interactive && setUserTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
              {tab === "seeded" && (
                <span className="ml-auto flex items-center gap-1">
                  <button type="button" className="hud-btn !h-6 !w-6 !px-0" aria-label="Previous seed" onClick={() => setSeed((s) => s - 1)}>
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="hud-value min-w-[5.5rem] text-center text-[10.5px] text-white/80">seed {seed}</span>
                  <button type="button" className="hud-btn !h-6 !w-6 !px-0" aria-label="Next seed" onClick={() => setSeed((s) => s + 1)}>
                    <Plus className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
          <div className="flex justify-center">
            {shown ? (
              <div
                className="grid gap-[2px] rounded-md bg-black/50 p-[2px]"
                style={{ gridTemplateColumns: `repeat(${shown[0].length}, 1fr)`, width: `min(100%, ${shown[0].length * 40}px)`, aspectRatio: `${shown[0].length} / ${shown.length}`, maxHeight: 380 }}
                role="img"
                aria-label={`Poster, ${shown.length} rows by ${shown[0].length} columns`}
                data-poster={`${shown.length}x${shown[0].length}`}
                key={`${tab}:${seed}`}
              >
                {shown.flatMap((row, r) =>
                  row.map((c, i) => (
                    <div
                      key={`${r}:${i}`}
                      className={`rounded-[2px] ${interactive ? "cursor-pointer" : ""} ${picked?.r === r && picked?.c === i ? "outline outline-2 outline-white" : ""}`}
                      style={{ background: S.cssColour(c) }}
                      title={`row ${r}, col ${i} · ${S.hexOf(c)}`}
                      onClick={() => interactive && setPicked({ r, c: i })}
                    />
                  )),
                )}
              </div>
            ) : (
              <div
                className="grid gap-[2px] rounded-md border border-dashed border-white/15 p-[2px]"
                style={{ gridTemplateColumns: "repeat(8, 1fr)", width: "min(100%, 320px)", aspectRatio: "8 / 6" }}
                aria-hidden
              >
                {GHOST_POSTER.flatMap((row, r) => row.map((_, i) => <div key={`${r}:${i}`} className="rounded-[2px] bg-white/[0.04]" />))}
              </div>
            )}
          </div>
          <p className="mt-2 min-h-[1rem] text-center font-mono text-[10.5px] text-white/50">
            {missingHook ? (
              <span className="hud-warning">Define {missingHook}() to see this poster.</span>
            ) : shown && cell && picked ? (
              <>
                grid[{picked.r}][{picked.c}] = {S.hexOf(cell)} · <span className="text-white/70">({cell.join(", ")})</span>
              </>
            ) : shown ? (
              interactive ? "Click a cell to read its row, column and colour" : `${shown.length} rows × ${shown[0].length} columns`
            ) : live ? (
              "Lesson 5 lays out the poster grid"
            ) : (
              "Run your code to open the press room"
            )}
          </p>
          {live && facts && facts.strip.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-x-1 gap-y-1" aria-label="Palette strip">
              {facts.strip.map((s, i) => (
                <Chip key={`${i}:${s.caption}`} colour={s.colour} caption={s.caption} size={26} />
              ))}
            </div>
          )}
        </section>

        <div className="gap-3 @2xl:columns-2 @6xl:columns-3">
          {panel("as-swatch", "Ink swatch", "ink = (r, g, b)", () =>
            facts?.ink ? (
              <div className="flex items-center gap-3">
                <span className="block h-14 w-14 shrink-0 rounded-lg border border-white/20" style={{ background: S.cssColour(facts.ink) }} />
                <div className="min-w-0 font-mono text-[11px]">
                  <p className="text-white/85">r {facts.ink[0]} · g {facts.ink[1]} · b {facts.ink[2]}</p>
                  <p className="text-white/50">{S.hexOf(facts.ink)}</p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Set ink = (r, g, b) to pour your first ink.</p>
            ),
          )}

          {panel("as-tints", "Tints and shades", "tint(colour, amount, target)", () =>
            facts && facts.tints.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {facts.tints.map((t) => (
                  <Chip key={t.caption} colour={t.colour} caption={t.caption} />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Write tint() to see lighter and darker inks.</p>
            ),
          )}

          {panel("as-extremes", "Shelf extremes", "return darkest, lightest", () =>
            facts?.extremes && facts.extremes[0] && facts.extremes[1] ? (
              <div className="flex flex-wrap gap-1.5">
                {facts.shelf.map((c, i) => {
                  const dark = c.join() === facts.extremes![0]!.join();
                  const light = c.join() === facts.extremes![1]!.join();
                  const b = facts.bright(c);
                  return <Chip key={i} colour={c} ring={dark || light} caption={dark ? "darkest" : light ? "lightest" : b !== null ? String(b) : ""} />;
                })}
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Write extremes(colours) to mark the darkest and lightest.</p>
            ),
          )}

          {panel("as-hex", "Hex labels", "f\"#{r:02x}...\" · {name:<10}", () => <Lines lines={facts?.hexLines ?? null} empty="Write hex_code() and label() to print the labels." />)}

          {panel(
            "as-poster",
            "The poster",
            "poster[row][col]",
            () => (
              <p className="font-mono text-[11px] text-white/70">
                {facts?.rows ? `${facts.rows} rows × ${facts.cols} columns` : "Build poster as a list of rows"}
                {facts?.corner && (
                  <>
                    {" "}
                    · corner <span style={{ color: S.cssColour(facts.corner) }}>■</span> {S.hexOf(facts.corner)}
                  </>
                )}
              </p>
            ),
            facts?.hand ? "grid" : undefined,
          )}

          {panel("as-patterns", "Pattern lab", "nested loops · (row + col) % 2", () =>
            patternThumbs.some(Boolean) ? (
              <div className="flex flex-wrap items-end gap-2">
                {patternThumbs.map((g, i) => (g ? <MiniGrid key={i} grid={g} /> : null))}
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Write checker(rows, cols, a, b).</p>
            ),
          )}

          {panel(
            "as-inks",
            "Ink tally",
            "a set of unique colours",
            () =>
              facts && facts.inksUsed.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {facts.inksUsed.map((c, i) => (
                    <Chip key={i} colour={c} caption={S.hexOf(c)} size={26} />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-white/45">Set inks_used = unique_colours(poster).</p>
              ),
            facts && facts.inksUsed.length > 0 ? `${facts.inksUsed.length} different` : undefined,
          )}

          {panel("as-legend", "Legend", "enumerate · zip", () => (
            <div className="grid grid-cols-2 gap-2">
              <Lines lines={facts?.numbered ?? null} empty="Write row_labels()." />
              <Lines lines={facts?.legendLines ?? null} empty="Write legend()." />
            </div>
          ))}

          {panel("as-slices", "Title cutter", "text[:n] · text[-n:] · text[::-1]", () =>
            facts?.slice ? (
              <dl className="space-y-1 font-mono text-[11px]">
                {(
                  [
                    ["title", facts.slice.title],
                    ["stamp(title, 7)", facts.slice.stamp],
                    ["tail(title, 6)", facts.slice.tail],
                    ["mirror(title)", facts.slice.mirror],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex min-w-0 gap-2">
                    <dt className="w-28 shrink-0 text-white/45">{k}</dt>
                    <dd className="min-w-0 flex-1 truncate text-white/85">{typeof v === "string" ? v : "…"}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-[11px] text-white/45">Set poster_title and write stamp(), tail() and mirror().</p>
            ),
          )}

          {panel("as-banner", "Banner press", "strip · replace · upper · split · join", () =>
            facts?.banner ? (
              <div className="font-mono text-[11px]">
                <p className="overflow-x-auto whitespace-pre text-[#c5ee8a]">{facts.banner}</p>
                <p className="mt-1 text-white/55">{facts.tag}</p>
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Write clean_title(), hashtag() and banner().</p>
            ),
          )}

          {panel("as-palette", "Palette", "dict · .get(name, default) · in", () => (
            <>
              <div className="flex flex-wrap gap-1.5">
                {facts &&
                  Object.entries(facts.palette).map(([n, c]) => (
                    <Chip key={n} colour={c} caption={n} />
                  ))}
              </div>
              {interactive && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value.slice(0, 24))}
                    aria-label="Ink name to look up"
                    spellCheck={false}
                    className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 font-mono text-[11px] text-white/85 outline-none focus:border-[#c5ee8a]/50"
                  />
                  <span className="shrink-0 font-mono text-[10.5px] text-white/55">colour_for →</span>
                  {looked ? <Chip colour={looked} size={22} /> : <span className="text-[10.5px] text-white/40">…</span>}
                </div>
              )}
            </>
          ))}

          {panel("as-report", "Day-end report", "items() · values() · keys()", () => (
            <>
              <Lines lines={facts?.report?.lines ?? null} empty="Write palette_lines(colours)." />
              {facts?.report && (
                <p className="mt-1.5 font-mono text-[10.5px] text-white/55">
                  dark: {strings(facts.report.dark).join(", ") || "none"} · average brightness {typeof facts.report.average === "number" ? facts.report.average : "…"}
                </p>
              )}
            </>
          ))}

          {panel("as-pastel", "Pastel palette", "{name: tint(c) for ...}", () =>
            facts && facts.pastel.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(facts.palette).map(([n, c]) => (
                    <Chip key={n} colour={c} size={22} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {facts.pastel.map((p) => (
                    <Chip key={p.caption} colour={p.colour} size={22} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Write lighter_palette() to lighten every ink at once.</p>
            ),
          )}

          {panel("as-ranking", "Ink ranking", "sorted(..., key=brightness)", () =>
            facts && facts.ranked.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {facts.ranked.map((n) => (
                  <Chip key={n} colour={facts.palette[n]} caption={n} size={26} />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Write ranked_names(colours), darkest first.</p>
            ),
          )}

          {panel(
            "as-seed",
            "Seed press",
            "Rng(seed) · same seed, same poster",
            () => (
              <div className="flex flex-wrap items-end gap-2">
                {seedThumbs.map((t) =>
                  t.grid ? (
                    <div key={t.s} className="flex flex-col items-center gap-1">
                      <MiniGrid grid={t.grid} active={t.s === seed} onClick={interactive ? () => { setSeed(t.s); setUserTab("seeded"); } : undefined} />
                      <span className="font-mono text-[9.5px] text-white/50">seed {t.s}</span>
                    </div>
                  ) : null,
                )}
                {seedThumbs.every((t) => !t.grid) && <p className="text-[11px] text-white/45">Write random_poster(rows, cols, colours, seed).</p>}
              </div>
            ),
            `seed ${seed}`,
          )}

          {panel("as-proof", "Order desk", "try / except ValueError", () => (
            <div className="space-y-2">
              <label className="block">
                <span className="hud-label">Colour order</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <input
                    value={colourText}
                    onChange={(e) => setColourText(e.target.value.slice(0, 40))}
                    aria-label="Colour order text"
                    spellCheck={false}
                    className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 font-mono text-[11px] text-white/85 outline-none focus:border-[#c5ee8a]/50"
                  />
                  {proof?.colour ? <Chip colour={proof.colour} size={22} /> : null}
                </div>
                <span className="mt-0.5 block font-mono text-[10.5px] text-white/55" data-testid="colour-result">
                  {proof?.colourRaw === undefined ? "parse_colour() has not answered" : proof.colour ? `(${proof.colour.join(", ")})` : "None, the order is not a valid colour"}
                </span>
              </label>
              <label className="block">
                <span className="hud-label">Size order (rows x columns)</span>
                <input
                  value={sizeText}
                  onChange={(e) => setSizeText(e.target.value.slice(0, 20))}
                  aria-label="Size order text"
                  spellCheck={false}
                  className="mt-0.5 h-7 w-full rounded-md border border-white/10 bg-black/40 px-2 font-mono text-[11px] text-white/85 outline-none focus:border-[#c5ee8a]/50"
                />
                <span className="mt-0.5 block font-mono text-[10.5px] text-white/55" data-testid="size-result">
                  {proof?.size === undefined ? "parse_size() has not answered" : proof.size ? `(${proof.size.join(", ")})` : "unexpected answer"}
                </span>
              </label>
            </div>
          ))}

          {panel("as-radial", "The finale", "import math · docstrings", () =>
            radialInfo?.grid ? (
              <div className="flex items-center gap-3">
                <MiniGrid grid={radialInfo.grid} />
                <p className="font-mono text-[11px] text-white/75">
                  {radialInfo.sum ? `${String(radialInfo.sum.rows)}x${String(radialInfo.sum.cols)} poster, ${String(radialInfo.sum.inks)} inks` : "Set report = poster_summary(final_poster)"}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Write radial_grid(rows, cols, colours).</p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default function ArtStudioScene(props: SceneProps) {
  // A new run starts a fresh press room (tabs, seed and clicks reset).
  return <Studio key={props.program?.generation ?? 0} {...props} />;
}
