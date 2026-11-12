"use client";

import React from "react";
import type { WidgetProps } from "@/learn/widget";
import { Explainer, type ExplainScene } from "../explain/Explainer";
import { ease, lerp, r2, seg } from "../explain/anim";

/**
 * "The graphics pipeline" in three scenes: vertices are placed on the screen, the triangle is turned into the pixels
 * it covers (rasterising), and every covered pixel is coloured by the same tiny program. A toy: one triangle on a
 * 13 × 8 pixel screen, where a real screen has millions of pixels and a scene has millions of triangles.
 */

const W = 360;
const H = 240;
const INK = "var(--ink)";
const INK2 = "var(--ink-2)";
const BRAND = "var(--brand)";
const LINE = "var(--line-strong)";
const SURFACE = "var(--surface)";

const CELL = 24;
const COLS = 13;
const ROWS = 8;
const X0 = 24;
const Y0 = 14;

/** The triangle's corners in pixel units, and the colour each corner carries. */
const V: { x: number; y: number; name: string; rgb: [number, number, number] }[] = [
  { x: 3.0, y: 1.2, name: "A", rgb: [232, 146, 74] },
  { x: 11.2, y: 3.4, name: "B", rgb: [79, 163, 223] },
  { x: 5.4, y: 7.3, name: "C", rgb: [124, 194, 67] },
];
/** Where each vertex starts: all bunched near the middle, as it is in the model before the vertex shader places it. */
const START = [
  { x: 6.0, y: 3.4 },
  { x: 7.0, y: 3.2 },
  { x: 6.4, y: 4.4 },
];

const px = (cx: number) => r2(X0 + cx * CELL);
const py = (cy: number) => r2(Y0 + cy * CELL);

function bary(x: number, y: number) {
  const [a, b, c] = V;
  const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / d;
  const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / d;
  return [l1, l2, 1 - l1 - l2] as const;
}

interface Frag {
  col: number;
  row: number;
  fill: string;
}
/** Every pixel whose centre is inside the triangle, in reading order, with its interpolated colour. */
const FRAGS: Frag[] = (() => {
  const out: Frag[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const [l1, l2, l3] = bary(col + 0.5, row + 0.5);
      if (l1 >= 0 && l2 >= 0 && l3 >= 0) {
        const rgb = [0, 1, 2].map((k) => Math.round(V[0].rgb[k] * l1 + V[1].rgb[k] * l2 + V[2].rgb[k] * l3));
        out.push({ col, row, fill: `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})` });
      }
    }
  }
  return out;
})();

function Screen() {
  return (
    <g>
      <rect x={X0} y={Y0} width={COLS * CELL} height={ROWS * CELL} rx={4} fill={SURFACE} stroke={LINE} strokeWidth={1.5} />
      {Array.from({ length: COLS - 1 }, (_, i) => (
        <line key={`v${i}`} x1={X0 + (i + 1) * CELL} y1={Y0} x2={X0 + (i + 1) * CELL} y2={Y0 + ROWS * CELL} stroke={LINE} strokeWidth={0.6} opacity={0.6} />
      ))}
      {Array.from({ length: ROWS - 1 }, (_, i) => (
        <line key={`h${i}`} x1={X0} y1={Y0 + (i + 1) * CELL} x2={X0 + COLS * CELL} y2={Y0 + (i + 1) * CELL} stroke={LINE} strokeWidth={0.6} opacity={0.6} />
      ))}
    </g>
  );
}

function Outline({ opacity = 1, dash }: { opacity?: number; dash?: string }) {
  return <path d={`M${px(V[0].x)} ${py(V[0].y)} L${px(V[1].x)} ${py(V[1].y)} L${px(V[2].x)} ${py(V[2].y)} Z`} fill="none" stroke={BRAND} strokeWidth={2} strokeLinejoin="round" strokeDasharray={dash} opacity={opacity} />;
}

// ───────────────────────── 1. vertices ─────────────────────────

function vertices(t: number): React.ReactNode {
  const move = ease(seg(t, 0.1, 0.5));
  const edges = ease(seg(t, 0.55, 0.85));
  const label = seg(t, 0.5, 0.62);
  const pts = V.map((v, i) => ({ x: lerp(START[i].x, v.x, move), y: lerp(START[i].y, v.y, move) }));
  const edgePairs: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 0],
  ];
  return (
    <g>
      <Screen />
      {edgePairs.map(([a, b], i) => {
        const u = ease(seg(edges, i / 3, (i + 1) / 3));
        return <line key={i} x1={px(pts[a].x)} y1={py(pts[a].y)} x2={r2(lerp(px(pts[a].x), px(pts[b].x), u))} y2={r2(lerp(py(pts[a].y), py(pts[b].y), u))} stroke={BRAND} strokeWidth={2} strokeLinecap="round" />;
      })}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={px(p.x)} cy={py(p.y)} r={7} fill={`rgb(${V[i].rgb.join(" ")})`} stroke={INK} strokeWidth={1.5} />
          <text x={px(p.x) + (i === 1 ? 12 : -12)} y={py(p.y) - 8} textAnchor={i === 1 ? "start" : "end"} fontSize={15} fill={INK} opacity={label} className="font-mono">
            {V[i].name}
          </text>
        </g>
      ))}
      <text x={W / 2} y={230} textAnchor="middle" fontSize={14} fill={INK2}>
        {t < 0.55 ? "vertex shader: one tiny program per corner" : "three corners joined: a triangle"}
      </text>
    </g>
  );
}

// ───────────────────────── 2. rasterise ─────────────────────────

function raster(t: number): React.ReactNode {
  const n = FRAGS.length;
  const shown = Math.round(n * ease(seg(t, 0.12, 0.88)));
  return (
    <g>
      <Screen />
      {FRAGS.slice(0, shown).map((f) => (
        <rect key={`${f.col}-${f.row}`} x={X0 + f.col * CELL + 1} y={Y0 + f.row * CELL + 1} width={CELL - 2} height={CELL - 2} rx={3} fill={BRAND} opacity={0.4} />
      ))}
      <Outline />
      <text x={W / 2} y={230} textAnchor="middle" fontSize={15} fill={INK} className="font-mono">
        {shown} of {n} pixels covered
      </text>
    </g>
  );
}

// ───────────────────────── 3. shade ─────────────────────────

function shade(t: number): React.ReactNode {
  // all the fragments start together, in waves of columns: the point is that they are independent
  const waves = FRAGS.map((f) => ease(seg(t, 0.1 + (f.col / COLS) * 0.35, 0.3 + (f.col / COLS) * 0.35)));
  const ready = FRAGS.filter((_, i) => waves[i] >= 1).length;
  const out = ease(seg(t, 0.72, 0.95));
  return (
    <g>
      <Screen />
      {FRAGS.map((f, i) => (
        <rect key={`${f.col}-${f.row}`} x={X0 + f.col * CELL + 1} y={Y0 + f.row * CELL + 1} width={CELL - 2} height={CELL - 2} rx={3} fill={f.fill} opacity={0.15 + 0.85 * waves[i]} />
      ))}
      <Outline opacity={1 - out} />
      <text x={W / 2} y={230} textAnchor="middle" fontSize={14} fill={INK2}>
        {out < 0.5 ? `same program, ${ready} of ${FRAGS.length} pixels shaded` : `${FRAGS.length} pixels coloured: ready for the screen`}
      </text>
    </g>
  );
}

const ALL: ExplainScene[] = [
  {
    id: "vertices",
    title: "1. Place the corners",
    caption:
      "A 3D scene is built from triangles, and a triangle is just three corner points called vertices. A tiny program called the vertex shader runs once for every vertex, all at the same time, and works out where on the screen that corner lands. Then the three corners are joined into a triangle.",
    durationMs: 9000,
    render: vertices,
  },
  {
    id: "raster",
    title: "2. Find the pixels it covers",
    caption:
      "The screen is a grid of pixels. Rasterising asks, for every pixel, “is its centre inside the triangle?” Each pixel that says yes becomes a fragment: a pixel-sized piece of the triangle that still needs a colour. Every pixel can be tested on its own, which is why this step suits thousands of tiny cores.",
    durationMs: 9000,
    render: raster,
  },
  {
    id: "shade",
    title: "3. Colour every pixel",
    caption:
      "A second tiny program, the fragment shader (also called a pixel shader), runs once per fragment. Here it blends the three corner colours (orange, blue and green) by how close the pixel is to each corner. No fragment needs another one's answer, so they all run at once. The results are written into the frame that goes to the screen.",
    durationMs: 10000,
    render: shade,
  },
];

export interface PipelineExplainerProps {
  /** Show only these scenes, in this order: "vertices", "raster", "shade". Default all three. */
  scenes?: string[];
}

export function PipelineExplainer({ props }: WidgetProps<PipelineExplainerProps>) {
  const picked = props.scenes?.length ? props.scenes.map((id) => ALL.find((s) => s.id === id)).filter((s): s is ExplainScene => !!s) : ALL;
  const scenes = picked.length ? picked : ALL;
  return <Explainer key={scenes.map((s) => s.id).join()} scenes={scenes} width={W} height={H} label="The graphics pipeline, animated" />;
}
