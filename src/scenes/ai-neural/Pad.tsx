"use client";

import React, { useEffect, useRef, useState } from "react";
import { BAD, LIME, PIXELS, SIZE, finite, pct } from "./data.ts";
import type { PanelCtx } from "./ctx.ts";
import { Label, Note, PixelGrid } from "./ui.tsx";

type Pt = [number, number];

const CANVAS = 240;
/** Half the pen thickness used when the drawing is turned into the 10 x 10 picture. The glyph generator draws between 0.045 and 0.085. */
const PEN = 0.065;

/**
 * Turns the drawn strokes into the 100 numbers predict() receives. The drawing is first centred and scaled
 * to the size the training glyphs have (a tidy-up any digit reader does), then each pixel's ink comes from
 * its distance to the nearest stroke, exactly like the glyph generator draws it.
 */
export function rasterise(strokes: Pt[][], tidy = true): number[] | null {
  const pts = strokes.flat();
  if (pts.length === 0) return null;
  let [x0, y0, x1, y1] = [1, 1, 0, 0];
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const span = Math.max(x1 - x0, y1 - y0);
  const k = tidy && span > 0.06 ? 0.72 / span : 1;
  const ox = tidy ? 0.5 - ((x0 + x1) / 2) * k : 0;
  const oy = tidy ? 0.5 - ((y0 + y1) / 2) * k : 0;
  const segs: [number, number, number, number][] = [];
  for (const s of strokes) {
    if (s.length === 1) segs.push([s[0][0] * k + ox, s[0][1] * k + oy, s[0][0] * k + ox, s[0][1] * k + oy]);
    for (let i = 1; i < s.length; i++) segs.push([s[i - 1][0] * k + ox, s[i - 1][1] * k + oy, s[i][0] * k + ox, s[i][1] * k + oy]);
  }
  const out = new Array<number>(PIXELS).fill(0);
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const px = (c + 0.5) / SIZE;
      const py = (r + 0.5) / SIZE;
      let best = Infinity;
      for (const [ax, ay, bx, by] of segs) {
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 < 1e-9 ? 0 : Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2));
        const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
        if (d < best) best = d;
      }
      out[r * SIZE + c] = Math.round(Math.min(1, Math.max(0, (PEN - best) / 0.06 + 0.5)) * 0.9 * 1000) / 1000;
    }
  }
  return out;
}

function probsOf(v: unknown): number[] | null {
  if (Array.isArray(v) && v.length === 10 && v.every(finite)) return v as number[];
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 9) return Array.from({ length: 10 }, (_, d) => (d === v ? 1 : 0));
  return null;
}

export function PadBody({ ctx }: { ctx: PanelCtx }) {
  const { program, vars } = ctx;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [loaded, setLoaded] = useState<{ pixels: number[]; truth: number } | null>(null);
  const [pixels, setPixels] = useState<number[] | null>(null);
  const [result, setResult] = useState<number[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const hasHook = !!program && vars.hasPredict;

  const commit = (next: number[] | null) => {
    setPixels(next);
    ctx.setPadProbe(next);
  };

  // Ask the learner's predict() (debounced, so a fast stroke makes few calls).
  useEffect(() => {
    if (!pixels || !program || !hasHook) return;
    const id = setTimeout(() => {
      const out = program.call<unknown>("predict", pixels);
      const probs = probsOf(out);
      setResult(probs);
      setProblem(probs ? null : (program.lastError ?? "predict() did not return ten probabilities"));
    }, 70);
    return () => clearTimeout(id);
  }, [pixels, program, hasHook, tick]);

  // A fresh run replaces the program: ask again for whatever is on the pad.
  useEffect(() => {
    const id = setTimeout(() => setTick((t) => t + 1), 0);
    return () => clearTimeout(id);
  }, [program]);

  // Paint the strokes.
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx2 = cv?.getContext("2d");
    if (!cv || !ctx2) return;
    ctx2.clearRect(0, 0, CANVAS, CANVAS);
    ctx2.fillStyle = "#101010";
    ctx2.fillRect(0, 0, CANVAS, CANVAS);
    ctx2.strokeStyle = "rgba(255,255,255,0.05)";
    ctx2.lineWidth = 1;
    for (let i = 1; i < SIZE; i++) {
      const p = (i / SIZE) * CANVAS;
      ctx2.beginPath();
      ctx2.moveTo(p, 0);
      ctx2.lineTo(p, CANVAS);
      ctx2.moveTo(0, p);
      ctx2.lineTo(CANVAS, p);
      ctx2.stroke();
    }
    ctx2.strokeStyle = LIME;
    ctx2.fillStyle = LIME;
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    ctx2.lineWidth = PEN * 2 * CANVAS;
    for (const s of strokes) {
      if (s.length === 1) {
        ctx2.beginPath();
        ctx2.arc(s[0][0] * CANVAS, s[0][1] * CANVAS, PEN * CANVAS, 0, Math.PI * 2);
        ctx2.fill();
        continue;
      }
      ctx2.beginPath();
      s.forEach(([x, y], i) => (i ? ctx2.lineTo(x * CANVAS, y * CANVAS) : ctx2.moveTo(x * CANVAS, y * CANVAS)));
      ctx2.stroke();
    }
  }, [strokes]);

  const where = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  const update = (next: Pt[][]) => {
    setStrokes(next);
    setLoaded(null);
    commit(rasterise(next));
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!hasHook) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    update([...strokes, [where(e)]]);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = where(e);
    const last = strokes[strokes.length - 1];
    if (!last) return;
    const q = last[last.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.012) return;
    update([...strokes.slice(0, -1), [...last, p]]);
  };
  const onUp = () => {
    drawing.current = false;
  };

  const clear = () => {
    setStrokes([]);
    setLoaded(null);
    setResult(null);
    commit(null);
  };

  const nextGlyph = () => {
    const g = vars.gallery;
    if (g.length === 0) return;
    const i = loaded ? (vars.gallery.findIndex((p) => p === loaded.pixels) + 1) % g.length : 0;
    const px = g[i];
    setStrokes([]);
    setLoaded({ pixels: px, truth: vars.galleryLabels[i] });
    commit(px);
  };

  const probs = pixels ? result : null;
  const guess = probs ? probs.indexOf(Math.max(...probs)) : null;
  const sum = probs ? probs.reduce((a, b) => a + b, 0) : 0;

  if (!hasHook) {
    return (
      <Note>
        Waiting for <span className="hud-warning">predict</span> in your file. Run again once <code className="font-mono">predict(pixels)</code> is defined.
      </Note>
    );
  }

  return (
    <div className="grid gap-3 @md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
      <div className="min-w-0">
        <canvas
          ref={canvasRef}
          width={CANVAS}
          height={CANVAS}
          role="img"
          aria-label="Drawing pad: draw a digit with the mouse or a finger"
          data-pad
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="block aspect-square w-full max-w-[15rem] cursor-crosshair touch-none rounded-lg border border-white/15"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" className="hud-btn !h-7 !px-3 !text-[11px]" onClick={clear}>
            Clear
          </button>
          <button type="button" className="hud-btn !h-7 !px-3 !text-[11px]" onClick={nextGlyph} disabled={vars.gallery.length === 0}>
            Try a test glyph
          </button>
        </div>
      </div>
      <div className="min-w-0 space-y-2">
        {probs && guess !== null ? (
          <>
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[#c5ee8a]/40 bg-[#c5ee8a]/10 font-mono text-[34px] font-semibold leading-none text-[#d3f3a4]" aria-live="polite" aria-label={`Your predict function says ${guess}`}>
                {guess}
              </div>
              <div className="min-w-0">
                <p className="hud-title">predict() says {guess}</p>
                <p className="font-mono text-[11px] text-white/75">
                  {pct(probs[guess], 1)} sure{loaded ? ` · truth ${loaded.truth}` : ""}
                  {Math.abs(sum - 1) > 0.01 ? <span style={{ color: BAD }}> · sums to {sum.toFixed(2)}</span> : null}
                </p>
              </div>
              {pixels && (
                <div className="ml-auto w-12 shrink-0">
                  <PixelGrid values={pixels} label="what predict() receives: your drawing as 10 by 10 pixels" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-10 items-end gap-1" style={{ height: 56 }} role="img" aria-label="Probability for each digit">
              {probs.map((p, d) => (
                <div key={d} className="flex h-full min-w-0 flex-col justify-end" title={`${d}: ${pct(p, 1)}`}>
                  <div className="rounded-sm transition-[height] duration-200" style={{ height: `${Math.max(2, p * 100)}%`, background: d === guess ? LIME : "rgba(255,255,255,0.4)" }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-10 gap-1 text-center font-mono text-[9px] text-white/70">
              {probs.map((_, d) => (
                <span key={d} style={d === guess ? { color: LIME } : undefined}>
                  {d}
                </span>
              ))}
            </div>
          </>
        ) : problem && pixels ? (
          <Note>
            <span className="hud-warning">predict() problem:</span> {problem}
          </Note>
        ) : (
          <div className="space-y-1">
            <Label>your reader is waiting</Label>
            <p className="text-[11px] leading-snug text-white/75">Draw a digit on the pad, one stroke or several. Your predict() receives it as 100 numbers between 0 and 1 and the bars show its ten probabilities.</p>
          </div>
        )}
      </div>
    </div>
  );
}
