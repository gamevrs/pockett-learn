"use client";

import React, { useMemo } from "react";
import { LIME, NEG, POS, PIXELS, SIZE, type Net, type Pass } from "./data.ts";

interface Layout {
  W: number;
  H: number;
  glyph: { x: number; y: number; s: number };
  hidden: (j: number, n: number) => [number, number];
  out: (k: number) => [number, number];
  fan: [number, number];
}

const WIDE: Layout = {
  W: 560,
  H: 300,
  glyph: { x: 14, y: 100, s: 100 },
  hidden: (j, n) => [300, 22 + (j / Math.max(1, n - 1)) * 256],
  out: (k) => [502, 30 + (k / 9) * 240],
  fan: [114, 150],
};

const TALL: Layout = {
  W: 300,
  H: 430,
  glyph: { x: 108, y: 22, s: 84 },
  hidden: (j, n) => [18 + (j / Math.max(1, n - 1)) * 264, 214],
  out: (k) => [26 + (k / 9) * 248, 372],
  fan: [150, 108],
};

/**
 * The network as a picture: the glyph on the left, the hidden sprouts in the middle and the ten digits on the right.
 * Fan lines show what each hidden sprout adds up from the pixels (lime = pushes it on, violet = pushes it down),
 * and the lines into the digits are coloured by the sign of the learned weight, brighter the more they carry for
 * this glyph. Without a network (or before it is unlocked) the same shape is drawn as a dashed blueprint.
 */
export function NetworkDiagram({
  net,
  pixels,
  pass,
  truth,
  alive,
  asProbabilities,
  vertical,
  caption,
}: {
  net: Net | null;
  pixels: number[] | null;
  pass: Pass | null;
  truth: number | null;
  alive: boolean;
  asProbabilities: boolean;
  vertical: boolean;
  caption?: string;
}) {
  const L = vertical ? TALL : WIDE;
  const n = net?.hidden ?? 24;
  const live = alive && net && pass && pixels;

  const geometry = useMemo(() => {
    const hid = Array.from({ length: n }, (_, j) => L.hidden(j, n));
    const out = Array.from({ length: 10 }, (_, k) => L.out(k));
    return { hid, out };
  }, [L, n]);

  const scene = useMemo(() => {
    if (!live) return null;
    const maxZ = Math.max(1e-9, ...pass.z1.map((v) => Math.abs(v)));
    const maxH = Math.max(1e-9, ...pass.h);
    let maxC = 1e-9;
    for (let j = 0; j < n; j++) for (let k = 0; k < 10; k++) maxC = Math.max(maxC, Math.abs(pass.h[j] * net.W2[j][k]));
    return { maxZ, maxH, maxC };
  }, [live, pass, net, n]);

  const px = L.glyph;
  const cell = px.s / SIZE;
  const outVals = pass ? (asProbabilities ? pass.probs : softScale(pass.z2)) : null;
  const guess = pass ? pass.guess : null;

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} className="block h-auto w-full" role="img" aria-label={caption ?? "The network: pixels, hidden sprouts and the ten digit outputs"}>
      {/* fan lines: pixels -> each hidden sprout */}
      <g>
        {geometry.hid.map(([x, y], j) => {
          const z = live ? pass.z1[j] : 0;
          const a = live && scene ? 0.08 + 0.75 * (Math.abs(z) / scene.maxZ) : 0.1;
          return <line key={`f${j}`} x1={L.fan[0]} y1={L.fan[1]} x2={x} y2={y} stroke={live ? (z >= 0 ? POS : NEG) : "rgba(255,255,255,0.4)"} strokeOpacity={a} strokeWidth={live ? 0.8 : 0.6} strokeDasharray={live ? undefined : "2 3"} />;
        })}
      </g>

      {/* weight lines: hidden -> digits */}
      <g>
        {geometry.hid.map(([x1, y1], j) =>
          geometry.out.map(([x2, y2], k) => {
            if (!live || !scene) return <line key={`w${j}-${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.4)" strokeOpacity="0.07" strokeWidth="0.5" strokeDasharray="2 3" />;
            const w = net.W2[j][k];
            const c = Math.abs(pass.h[j] * w) / scene.maxC;
            return <line key={`w${j}-${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={w >= 0 ? POS : NEG} strokeOpacity={0.05 + 0.8 * c} strokeWidth={0.5 + 1.1 * c} />;
          }),
        )}
      </g>

      {/* the glyph */}
      <g aria-hidden>
        <rect x={px.x - 2} y={px.y - 2} width={px.s + 4} height={px.s + 4} rx="4" fill="#0e0e0e" stroke={live ? "rgba(197,238,138,0.5)" : "rgba(255,255,255,0.25)"} strokeDasharray={live ? undefined : "3 3"} />
        {pixels
          ? Array.from({ length: PIXELS }, (_, i) => {
              const v = Math.min(1, Math.max(0, pixels[i] ?? 0));
              return v < 0.02 ? null : <rect key={i} x={px.x + (i % SIZE) * cell} y={px.y + Math.floor(i / SIZE) * cell} width={cell + 0.4} height={cell + 0.4} fill="#f4f4f4" fillOpacity={v} />;
            })
          : null}
      </g>

      {/* hidden sprouts */}
      <g>
        {geometry.hid.map(([x, y], j) => {
          const h = live ? pass.h[j] : 0;
          const t = live && scene ? h / scene.maxH : 0;
          return live ? (
            <circle key={`h${j}`} cx={x} cy={y} r={vertical ? 4.6 : 4.4} fill={h > 0 ? LIME : "#141414"} fillOpacity={h > 0 ? 0.25 + 0.75 * t : 1} stroke={h > 0 ? LIME : "rgba(255,255,255,0.35)"} strokeWidth="1" />
          ) : (
            <circle key={`h${j}`} cx={x} cy={y} r={vertical ? 4.6 : 4.4} fill="none" stroke="rgba(255,255,255,0.3)" strokeDasharray="2 2" />
          );
        })}
      </g>

      {/* digits */}
      <g>
        {geometry.out.map(([x, y], k) => {
          const v = outVals ? outVals[k] : 0;
          const isGuess = live && guess === k;
          const isTruth = live && truth === k;
          const fillOp = 0.12 + 0.7 * Math.min(1, Math.max(0, v));
          return (
            <g key={`o${k}`}>
              {isTruth && <circle cx={x} cy={y} r="14" fill="none" stroke="#f4f4f4" strokeWidth="1.2" strokeDasharray="3 2" />}
              <circle cx={x} cy={y} r="10.5" fill={live ? "#141414" : "none"} stroke={isGuess ? LIME : live ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.3)"} strokeWidth={isGuess ? 2 : 1} strokeDasharray={live ? undefined : "2 2"} />
              {live && <circle cx={x} cy={y} r="10.5" fill={LIME} fillOpacity={fillOp} />}
              <text x={x} y={y + 3.6} textAnchor="middle" fontSize="12" fontWeight="600" fontFamily="var(--font-mono)" fill={live && fillOp >= 0.55 ? "#0a0a0a" : live ? "#f4f4f4" : "rgba(255,255,255,0.6)"}>
                {k}
              </text>
              {live && asProbabilities && v >= 0.05 && (
                <text x={vertical ? x : x + 17} y={vertical ? y + 26 : y + 3.4} textAnchor={vertical ? "middle" : "start"} fontSize="10" fontFamily="var(--font-mono)" fill={isGuess ? "#d3f3a4" : "rgba(255,255,255,0.75)"}>
                  {Math.round(v * 100)}%
                </text>
              )}
            </g>
          );
        })}
      </g>
      {/* column titles */}
      <g fontSize="10" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.7)" letterSpacing="0.05em">
        {vertical ? (
          <>
            <text x="8" y="14">PIXELS · 100</text>
            <text x="8" y="188">HIDDEN SPROUTS · {n}</text>
            <text x="8" y="346">DIGITS · 10</text>
          </>
        ) : (
          <>
            <text x={px.x} y={px.y - 10}>PIXELS · 100</text>
            <text x="236" y="12">HIDDEN SPROUTS · {n}</text>
            <text x="480" y="14">DIGITS</text>
          </>
        )}
      </g>

    </svg>
  );
}

/** Squashes raw scores into 0-1 for shading, when there are no probabilities yet. */
function softScale(z: number[]): number[] {
  const lo = Math.min(...z);
  const hi = Math.max(...z);
  const span = hi - lo || 1;
  return z.map((v) => (v - lo) / span);
}
