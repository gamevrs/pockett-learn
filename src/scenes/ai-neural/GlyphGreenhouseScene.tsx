"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SceneProps } from "@/engine/scene";
import { forwardPass, pct, readVars, type Vars } from "./data.ts";
import type { PanelCtx, Probe } from "./ctx.ts";
import { NetworkDiagram } from "./NetworkDiagram.tsx";
import { PadBody } from "./Pad.tsx";
import { ActivationsBody, GlyphsBody, InitBody, NeuronBody, SoftmaxBody } from "./panels-a.tsx";
import { BatchesBody, ChainBody, CheckBody, GradsBody, TrainingBody } from "./panels-b.tsx";
import { ConfusionBody, OverfitBody, ScheduleBody, ValidationBody } from "./panels-c.tsx";
import { ActiveContext, LockedPanel, Note, PANELS, PANEL, PanelFrame } from "./ui.tsx";
import { OVERVIEW_H, OVERVIEW_W, OverviewBottom, OverviewSide, isCompactStage } from "./overview.tsx";

/**
 * Glyph Greenhouse: a lab that grows a neural network, driven by the learner's Python.
 *
 * The scene reads the lists and numbers the learner published (see the header of
 * src/content/projects/ai-neural.ts), draws the network from their weights, and calls their predict()
 * from the draw pad. Each lesson unlocks one part; until then it is a dashed blueprint. Colour follows the
 * Pockett Stage system: neutral greys for structure, lime for what the learner's code produced, violet for
 * the opposite sign, amber and red for caution.
 */

/** Panels that live in the card column, in lesson order. The network and the draw pad are the hero. */
const CARD_IDS = PANELS.map((p) => p.id).filter((id) => id !== "gn-network" && id !== "gn-pad");

/** Space the stage shell keeps for its own label and expand button along the top edge. */
const SHELL_TOP = 44;
/** Space the stage shell keeps for its feature rail along the bottom edge. */
const SHELL_BOTTOM = 46;

function metaOf(id: string, v: Vars): React.ReactNode {
  switch (id) {
    case "gn-glyphs":
      return v.gallery.length ? `${v.gallery.length} glyphs` : undefined;
    case "gn-neuron":
      return v.stemRates ? `fires for ${pct(v.stemRates[1] ?? 0)} of 1s` : undefined;
    case "gn-softmax":
      return v.chanceLoss !== null ? `start ${v.chanceLoss.toFixed(2)}` : undefined;
    case "gn-check":
      return v.checkError !== null ? (v.checkError < 1e-4 ? "gradients agree" : "mismatch") : undefined;
    case "gn-training": {
      const r = v.runs[v.runs.length - 1];
      const e = r?.history.evalAcc;
      return e && e.length ? pct(e[e.length - 1], 1) : undefined;
    }
    case "gn-confusion": {
      const m = v.confusion;
      if (!m) return undefined;
      const total = m.flat().reduce((a, b) => a + b, 0) || 1;
      return `${pct(m.reduce((a, row, i) => a + row[i], 0) / total, 1)} right`;
    }
    case "gn-overfit":
      return v.gapFree !== null && v.gapDecay !== null ? `gap ${pct(v.gapFree)} → ${pct(v.gapDecay)}` : undefined;
    case "gn-validation":
      return v.bestLr !== null ? `rate ${v.bestLr}` : undefined;
    default:
      return undefined;
  }
}

export default function GlyphGreenhouseScene({ program, unlocked, focus, celebration, interactive, autoplay }: SceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState(true);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [sel, setSel] = useState(0);
  const [padPixels, setPadPixels] = useState<number[] | null>(null);
  const [spot, setSpot] = useState(0);
  const width = box?.w ?? 0;

  const vars = useMemo(() => readVars(program), [program]);
  const alive = (id: string) => !!program && unlocked.has(id);

  const netOn = alive("gn-network") ? vars.net : null;
  const count = vars.gallery.length;
  const index = Math.min(sel, Math.max(0, count - 1));
  const padOn = alive("gn-pad") && padPixels !== null;
  const pixels = padOn ? padPixels : (vars.gallery[index] ?? null);

  const guesses = useMemo(() => vars.gallery.map((p) => (netOn ? forwardPass(netOn, p).guess : null)), [vars.gallery, netOn]);
  const pass = useMemo(() => (netOn && pixels ? forwardPass(netOn, pixels) : null), [netOn, pixels]);
  const probe: Probe | null = pixels ? { source: padOn ? "pad" : "gallery", index, pixels, truth: padOn ? null : (vars.galleryLabels[index] ?? null), pass } : null;

  const selectGallery = useCallback((i: number) => {
    setSel(i);
    setPadPixels(null);
  }, []);
  const setPadProbe = useCallback((px: number[] | null) => setPadPixels(px), []);

  // The landing page and the hub card cycle through the test glyphs on their own.
  useEffect(() => {
    if ((interactive && !autoplay) || !active || count < 2) return;
    const id = setInterval(() => setSel((s) => (s + 1) % count), 2400);
    return () => clearInterval(id);
  }, [interactive, autoplay, active, count]);

  // Routes are kept alive hidden: stop animating while nobody can see the greenhouse.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

  const wide = width >= 768;
  const flash = new Set(celebration?.features ?? []);
  const liveCount = PANELS.filter((p) => alive(p.id)).length;

  const ctx: PanelCtx = { vars, probe, guesses, selectGallery, setPadProbe, interactive, autoplay: !!autoplay, program };

  const body = (id: string): React.ReactNode => {
    switch (id) {
      case "gn-glyphs":
        return <GlyphsBody ctx={ctx} />;
      case "gn-neuron":
        return <NeuronBody vars={vars} />;
      case "gn-activations":
        return <ActivationsBody vars={vars} />;
      case "gn-softmax":
        return <SoftmaxBody ctx={ctx} />;
      case "gn-init":
        return <InitBody ctx={ctx} />;
      case "gn-chain":
        return <ChainBody vars={vars} />;
      case "gn-grads":
        return <GradsBody vars={vars} />;
      case "gn-check":
        return <CheckBody vars={vars} />;
      case "gn-training":
        return <TrainingBody vars={vars} interactive={interactive} />;
      case "gn-batches":
        return <BatchesBody vars={vars} />;
      case "gn-confusion":
        return <ConfusionBody vars={vars} />;
      case "gn-overfit":
        return <OverfitBody vars={vars} />;
      case "gn-schedule":
        return <ScheduleBody vars={vars} interactive={interactive} autoplay={!!autoplay} />;
      case "gn-validation":
        return <ValidationBody vars={vars} />;
      default:
        return <PadBody ctx={ctx} />;
    }
  };

  const card = (id: string, className = "") => {
    if (!alive(id)) return <LockedPanel key={id} id={id} spot={focus === id} className={className} />;
    return (
      <PanelFrame key={flash.has(id) ? `${id}:${celebration?.nonce}` : id} id={id} meta={metaOf(id, vars)} focus={focus === id} flash={flash.has(id)} className={className}>
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

  const netTitle = probe?.pass ? (probe.source === "pad" ? "your drawing" : `glyph ${index + 1} of ${count}`) : undefined;
  const step = (d: number) => selectGallery(((index + d + count) % Math.max(1, count)) || 0);

  const networkCard = (compact = false) => {
    const on = alive("gn-network");
    const Icon = PANEL["gn-network"].icon;
    return (
      <section data-panel="gn-network" {...(!on ? { "data-locked": "" } : {})} className={`hud-panel min-w-0 px-3 py-2.5 ${compact ? "flex h-full flex-col" : ""} ${!on ? "!border-dashed" : ""} ${focus === "gn-network" ? "border-[#c5ee8a]/40" : ""} ${flash.has("gn-network") ? "pop-in" : ""}`}>
        <header className="mb-1.5 flex min-w-0 items-center gap-2">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${on ? "text-[#c5ee8a]" : "text-white/50"}`} aria-hidden />
          <h3 className="hud-title min-w-0 flex-1 truncate">The network</h3>
          {on && probe?.pass ? (
            <span className="hud-value shrink-0 text-[10px] text-white/70">
              {width < 440 ? (probe.source === "pad" ? "drawing" : `#${index + 1}`) : netTitle}
              {probe.truth !== null ? ` · truth ${probe.truth}` : ""} · guess <span className={probe.truth !== null && probe.pass.guess !== probe.truth ? "hud-danger" : "hud-accent"}>{probe.pass.guess}</span>
            </span>
          ) : (
            !on && <span className="hud-label shrink-0 !text-white/50">L4</span>
          )}
        </header>
        <div className={compact ? "flex min-h-0 flex-1 flex-col justify-center" : ""}>
        {on && !vars.net ? (
          <Note>
            Waiting for <span className="hud-warning">net_view</span> in your file. Run again once <code className="font-mono">params_to_lists</code> has filled it.
          </Note>
        ) : (
          <NetworkDiagram net={netOn} pixels={on ? pixels : null} pass={on ? pass : null} truth={probe?.truth ?? null} alive={on} asProbabilities={alive("gn-softmax")} vertical={width < 440 && !compact && interactive} caption={on && netTitle ? `The network reading ${netTitle}` : "The network blueprint"} />
        )}
        </div>
        {!on && <p className="mt-1 truncate font-mono text-[10px] text-white/55">{focus === "gn-network" ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}forward(X, params)</p>}
        {on && interactive && count > 1 && !compact && (
          <div className="mt-1 flex items-center justify-center gap-2">
            <button type="button" className="hud-btn !h-6 !w-6 !justify-center !px-0" onClick={() => step(-1)} aria-label="Previous glyph">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="font-mono text-[10px] text-white/70">pick a glyph here or in the bed</span>
            <button type="button" className="hud-btn !h-6 !w-6 !justify-center !px-0" onClick={() => step(1)} aria-label="Next glyph">
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
      </section>
    );
  };

  const header = (
    <div className="mb-3 flex min-w-0 shrink-0 items-baseline gap-x-3 gap-y-0.5 px-0.5">
      <h2 className="hud-title min-w-0 truncate">Glyph Greenhouse · Digit-reading network</h2>
      <span className="hud-value hidden shrink-0 text-[11px] text-white/60 @lg:inline">10 x 10 pixels · 24 sprouts · 10 digits</span>
      <span className="hud-label ml-auto shrink-0 !text-white/60">
        <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/60"}`}>{liveCount}</span>/{PANELS.length} parts live
      </span>
    </div>
  );

  const fitted = tour && wide;

  const spotlight = (
    <>
      {spotId ? (
        <div key={spotId} className="pop-in">
          {card(spotId)}
        </div>
      ) : (
        card("gn-glyphs")
      )}
      {aliveCards.length > 1 && (
        <div className="mt-2 flex justify-center gap-1" aria-hidden>
          {aliveCards.map((id) => (
            <span key={id} className={`h-1 rounded-full transition-all ${id === spotId ? "w-4 bg-[#c5ee8a]" : "w-1 bg-white/25"}`} />
          ))}
        </div>
      )}
    </>
  );

  // Short, wide stages (the project hub card): one scaled screen with the network and the headline numbers.
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
              <h2 className="hud-title !text-[13px] min-w-0 truncate">Glyph Greenhouse · Digit-reading network</h2>
              <span className="hud-label ml-auto shrink-0 !text-[11px] !text-white/60">
                <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/60"}`}>{liveCount}</span>/{PANELS.length} parts live
              </span>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] gap-2.5">
              <div className="h-full min-h-0 min-w-0">{networkCard(true)}</div>
              <OverviewSide ctx={ctx} alive={alive} focus={focus} flash={flash} />
            </div>
            <div className="mt-2.5">
              <OverviewBottom ctx={ctx} alive={alive} focus={focus} flash={flash} />
            </div>
          </div>
        </div>
      </ActiveContext.Provider>
    );
  }

  const heroColumn = (
    <div className="min-w-0 space-y-3 @4xl:sticky @4xl:top-2 @4xl:self-start">
      {networkCard()}
      {interactive && card("gn-pad")}
    </div>
  );

  return (
    <ActiveContext.Provider value={active}>
      <div ref={rootRef} className={`@container absolute inset-0 ${interactive ? "overflow-y-auto overscroll-contain" : "overflow-hidden"}`}>
        {fitted ? (
          <div className="flex h-full flex-col px-4 pb-3 pt-11">
            {header}
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3">
              <div className="min-h-0 min-w-0 overflow-hidden">{networkCard()}</div>
              <div className="min-h-0 min-w-0 overflow-hidden">{spotlight}</div>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-3 pt-11 @3xl:px-4">
            {header}
            <div className="grid gap-3 @3xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @3xl:items-start">
              {heroColumn}
              {tour ? <div className="min-w-0">{spotlight}</div> : <div className="grid min-w-0 gap-3 @xl:grid-cols-2 @3xl:grid-cols-1 @6xl:grid-cols-2">{ordered.map((id) => card(id))}</div>}
            </div>
          </div>
        )}
      </div>
    </ActiveContext.Provider>
  );
}
