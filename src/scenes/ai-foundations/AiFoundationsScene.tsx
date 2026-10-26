"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SceneProps } from "@/engine/scene";
import { Belt } from "./Belt.tsx";
import { BeltSim } from "./belt.ts";
import { RegionPlot } from "./RegionPlot.tsx";
import { OrchardStore, type View } from "./store.ts";
import { ConfusionBody, MatrixBody, ScaleBody, SplitBody, StatsBody } from "./panels-a.tsx";
import { DescentBody, LineBody, PriceBody, RipeBody } from "./panels-b.tsx";
import { FeaturesBody, FitBody, SorterBody, ThresholdBody } from "./panels-c.tsx";
import { ActiveContext, LockedPanel, NeedsHook, PANELS, PanelFrame } from "./ui.tsx";
import { pct } from "./data.ts";
import { OverviewSide, OVERVIEW_H, OVERVIEW_W, isCompactStage } from "./overview.tsx";

/**
 * Orchard Vision: a fruit-sorting lab driven by the learner's Python.
 *
 * The scene owns the conveyor, tomorrow's batch of fruit and the plot; everything it shows about the
 * fruit (labels, decisions, prices, ripeness) comes from functions and variables the learner wrote,
 * read through the store in store.ts. Each lesson unlocks one part; until then it is a dashed
 * blueprint. Colour follows the Pockett Stage system: neutral greys for structure, lime for what the
 * learner's code produced, one hue per kind of fruit, amber and red for caution.
 */

/** Panels that live in the card column, in lesson order. The belt, the plot and its layers are the hero. */
const CARD_IDS = ["oa-stats", "oa-matrix", "oa-scale", "oa-split", "oa-confusion", "oa-line", "oa-descent", "oa-price", "oa-ripeness", "oa-threshold", "oa-fit", "oa-features", "oa-sorter"];

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;

/** Space the stage shell keeps for its feature rail along the bottom edge. */
const SHELL_BOTTOM = 46;

/** Features that change what the belt does, so the belt starts a fresh batch when they flip. */
const BELT_FEATURES = ["oa-belt", "oa-neighbour", "oa-knn", "oa-ripeness", "oa-threshold", "oa-price", "oa-sorter"];

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function metaOf(id: string, view: View): React.ReactNode {
  const v = view.vars;
  switch (id) {
    case "oa-split":
      return v.testAcc !== null ? `test ${pct(v.testAcc)}` : undefined;
    case "oa-confusion":
      return v.confusion ? `${v.confusion.flat().reduce((a, b) => a + b, 0)} fruit` : undefined;
    case "oa-line":
      return v.searchMse !== null ? `mse ${v.searchMse.toFixed(4)}` : undefined;
    case "oa-price":
      return v.priceTestMse !== null ? `mse ${v.priceTestMse.toFixed(4)}` : undefined;
    case "oa-ripeness":
      return v.ripeAcc !== null ? pct(v.ripeAcc) : undefined;
    case "oa-fit":
      return v.bestK !== null ? `k = ${v.bestK}` : undefined;
    case "oa-sorter":
      return v.report ? pct(v.report.accuracy) : undefined;
    case "oa-matrix":
      return v.nRows !== null ? `${v.nRows}×${v.nFeatures ?? 4}` : undefined;
    default:
      return undefined;
  }
}

export default function AiFoundationsScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const [store] = useState(() => new OrchardStore());
  const [sim] = useState(() => new BeltSim());
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastUnlocked = useRef<ReadonlySet<string>>(unlocked);
  const [active, setActive] = useState(true);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const width = box?.w ?? 0;
  const [spot, setSpot] = useState(0);

  // Calls into the learner's code happen in the store, never while rendering.
  useEffect(() => {
    if (!sameSet(lastUnlocked.current, unlocked)) lastUnlocked.current = unlocked;
    store.configure(program, lastUnlocked.current);
  }, [store, program, unlocked]);

  const alive = (id: string) => !!program && unlocked.has(id);
  const beltOn = alive("oa-belt") && view.vars.rows.length > 0;
  const beltSig = BELT_FEATURES.filter((id) => alive(id)).join();

  // The belt reads fruit through the store and tells it which fruit is under the scanner.
  useEffect(() => {
    sim.configure({ inspect: (row) => store.inspect(row), onScan: (insp) => store.setProbe(insp), speed: autoplay ? 104 : 86, spawnEvery: autoplay ? 1.5 : 1.75 });
  }, [sim, store, autoplay]);

  useEffect(() => {
    sim.configure({ enabled: beltOn && active });
  }, [sim, beltOn, active]);

  // A new run, or a new decision-maker on the belt: start the batch over so the tally means something.
  useEffect(() => {
    sim.reset();
  }, [sim, program, beltSig]);

  // Routes are kept alive hidden: stop asking the learner's code while nobody can see the lab.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      setActive(entry.isIntersecting);
      if (entry.isIntersecting) store.setVisible(true);
      else store.suspend();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      store.suspend();
    };
  }, [store]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = width < 560;
  const wide = width >= 768;
  const flash = new Set(celebration?.features ?? []);
  const live = PANELS.filter((p) => alive(p.id)).length;

  const body = (id: string): React.ReactNode => {
    const missing = view.missing[id];
    if (missing) return <NeedsHook name={missing} />;
    switch (id) {
      case "oa-stats":
        return <StatsBody view={view} />;
      case "oa-matrix":
        return <MatrixBody view={view} />;
      case "oa-scale":
        return <ScaleBody view={view} />;
      case "oa-split":
        return <SplitBody view={view} />;
      case "oa-confusion":
        return <ConfusionBody view={view} />;
      case "oa-line":
        return <LineBody view={view} />;
      case "oa-descent":
        return <DescentBody view={view} interactive={interactive} />;
      case "oa-price":
        return <PriceBody view={view} />;
      case "oa-ripeness":
        return <RipeBody view={view} />;
      case "oa-threshold":
        return <ThresholdBody view={view} interactive={interactive} autoplay={autoplay ?? false} />;
      case "oa-fit":
        return <FitBody view={view} />;
      case "oa-features":
        return <FeaturesBody view={view} />;
      default:
        return <SorterBody view={view} />;
    }
  };

  const card = (id: string, className = "") => {
    if (!alive(id)) return <LockedPanel key={id} id={id} spot={focus === id} className={className} />;
    return (
      <PanelFrame key={flash.has(id) ? `${id}:${celebration?.nonce}` : id} id={id} meta={metaOf(id, view)} focus={focus === id} flash={flash.has(id)} className={className}>
        {body(id)}
      </PanelFrame>
    );
  };

  // The current lesson's card comes first so it is on screen at any size; the rest keep lesson order.
  const focusedCard = CARD_IDS.includes(focus ?? "") ? (focus as string) : null;
  const ordered = focusedCard ? [focusedCard, ...CARD_IDS.filter((id) => id !== focusedCard)] : CARD_IDS;

  // The landing page has no scrolling and no pointer: its card column shows one live card at a time.
  const tour = !interactive;
  const aliveCards = CARD_IDS.filter((id) => alive(id));
  useEffect(() => {
    if (!tour || aliveCards.length < 2) return;
    const id = setInterval(() => setSpot((n) => n + 1), 5200);
    return () => clearInterval(id);
  }, [tour, aliveCards.length]);
  const spotId = aliveCards.length ? aliveCards[spot % aliveCards.length] : null;

  const beltEl = <Belt view={view} sim={sim} alive={beltOn} focus={focus === "oa-belt"} flash={flash.has("oa-belt")} narrow={narrow} />;
  const plotEl = (fill: boolean) => (
    <RegionPlot view={view} store={store} interactive={interactive} autoplay={autoplay ?? false} alive={alive("oa-belt")} focus={focus} narrow={narrow} fill={fill} />
  );
  const spotlight = (
    <>
      {spotId ? (
        <div key={spotId} className="pop-in">
          {card(spotId)}
        </div>
      ) : (
        card("oa-stats")
      )}
      {aliveCards.length > 1 && (
        <div className="mt-2 flex justify-center gap-1" aria-hidden>
          {aliveCards.map((id) => (
            <span key={id} className={`h-1 rounded-full transition-all ${id === spotId ? "w-4 bg-[#c5ee8a]" : "w-1 bg-white/20"}`} />
          ))}
        </div>
      )}
    </>
  );

  const header = (
    <div className="mb-3 flex min-w-0 shrink-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
      <h2 className="hud-title min-w-0 truncate">Orchard Vision · Fruit sorting lab</h2>
      <span className="hud-value hud-muted hidden shrink-0 text-[11px] @lg:inline">3 kinds · 4 measurements</span>
      <span className="hud-label ml-auto shrink-0">
        <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} parts live
      </span>
    </div>
  );

  // Landing page on a wide stage: the plot takes the left, the belt and one live card at a time take the right.
  const fitted = tour && wide;

  // Short, wide stages (the project hub card): one scaled screen with the belt, the plot and the headline numbers.
  if (box && isCompactStage(box)) {
    const availH = Math.max(box.h - SHELL_TOP - SHELL_BOTTOM, 120);
    const k = Math.min(box.w / OVERVIEW_W, availH / OVERVIEW_H);
    return (
      <ActiveContext.Provider value={active}>
        <div ref={rootRef} className="absolute inset-0 overflow-hidden">
          <div
            className="@container absolute flex flex-col"
            style={{ width: OVERVIEW_W, height: OVERVIEW_H, left: (box.w - OVERVIEW_W * k) / 2, top: SHELL_TOP + (availH - OVERVIEW_H * k) / 2, transform: `scale(${k})`, transformOrigin: "top left" }}
          >
            <div className="mb-2 flex min-w-0 shrink-0 items-baseline gap-x-3 px-0.5">
              <h2 className="hud-title !text-[13px] min-w-0 truncate">Orchard Vision · Fruit sorting lab</h2>
              <span className="hud-label ml-auto shrink-0 !text-[11px]">
                <span className={`hud-value ${live > 0 ? "hud-accent" : "text-white/45"}`}>{live}</span>/{PANELS.length} parts live
              </span>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] gap-2.5">
              <div className="min-h-0 min-w-0">{plotEl(true)}</div>
              <div className="flex min-h-0 min-w-0 flex-col gap-2.5">
                <div className="shrink-0">
                  <Belt view={view} sim={sim} alive={beltOn} focus={focus === "oa-belt"} flash={flash.has("oa-belt")} narrow />
                </div>
                <OverviewSide view={view} alive={alive} focus={focus} flash={flash} />
              </div>
            </div>
          </div>
        </div>
      </ActiveContext.Provider>
    );
  }

  return (
    <ActiveContext.Provider value={active}>
      <div ref={rootRef} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
        {fitted ? (
          <div className="flex h-full flex-col px-4 pb-3 pt-11">
            {header}
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3">
              {plotEl(true)}
              <div className="flex min-h-0 min-w-0 flex-col gap-3">
                {beltEl}
                <div className="min-h-0 flex-1 overflow-hidden">{spotlight}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-3 pt-11 @3xl:px-4">
            {header}
            <div className="grid gap-3 @3xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @3xl:items-start">
              <div className="min-w-0 space-y-3">
                {beltEl}
                {plotEl(false)}
              </div>
              {tour ? <div className="min-w-0">{spotlight}</div> : <div className="grid min-w-0 gap-3 @xl:grid-cols-2 @3xl:grid-cols-1">{ordered.map((id) => card(id))}</div>}
            </div>
          </div>
        )}
      </div>
    </ActiveContext.Provider>
  );
}
