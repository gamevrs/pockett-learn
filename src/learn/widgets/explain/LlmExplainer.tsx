"use client";

import React from "react";
import type { WidgetProps } from "@/learn/widget";
import { Explainer, type ExplainScene } from "./Explainer";
import { ease, lerp, r2, seg } from "./anim";

/**
 * "How a language model works" in four scenes: embeddings, the transformer's layers, training and
 * next-token prediction. Everything is a toy at toy scale (2 numbers instead of thousands, 3 layers
 * instead of dozens) but the moves are the real ones. `props.scenes` shows a subset, in the order given.
 */

const W = 360;
const H = 240;
const INK = "var(--ink)";
const INK2 = "var(--ink-2)";
const INK3 = "var(--ink-3)";
const BRAND = "var(--brand)";
const LINE = "var(--line-strong)";
const SURFACE = "var(--surface)";
const BLUE = "#4fa3df";
const ORANGE = "#e8924a";

/** A word on a rounded tag, centred on (x, y). Monospace so its width is easy to know. */
function Tag({ word, x, y, fill = SURFACE, stroke = LINE, opacity = 1, size = 15 }: { word: string; x: number; y: number; fill?: string; stroke?: string; opacity?: number; size?: number }) {
  const w = word.length * size * 0.62 + 16;
  return (
    <g opacity={opacity}>
      <rect x={r2(x - w / 2)} y={y - 12} width={r2(w)} height={24} rx={7} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={size} fill={INK} className="font-mono">
        {word}
      </text>
    </g>
  );
}

// ───────────────────────── 1. embeddings ─────────────────────────

interface Word {
  w: string;
  from: [number, number];
  to: [number, number];
  group: "animal" | "vehicle";
}
const WORDS: Word[] = [
  { w: "cat", from: [60, 40], to: [238, 62], group: "animal" },
  { w: "car", from: [150, 205], to: [78, 150], group: "vehicle" },
  { w: "kitten", from: [300, 190], to: [284, 98], group: "animal" },
  { w: "truck", from: [315, 30], to: [128, 188], group: "vehicle" },
  { w: "dog", from: [30, 140], to: [208, 112], group: "animal" },
];
const GROUP_COLOUR = { animal: BRAND, vehicle: ORANGE };
const VECTOR = ["0.9", "0.2", "-0.4"];

function embeddings(t: number): React.ReactNode {
  const intro = 1 - seg(t, 0.28, 0.4); // the word-to-numbers panel fades out as the map comes in
  const map = seg(t, 0.3, 0.42);
  return (
    <g>
      <g opacity={intro}>
        <Tag word="cat" x={62} y={96} />
        <text x={112} y={102} textAnchor="middle" fontSize={20} fill={INK2}>
          →
        </text>
        {VECTOR.map((n, i) => (
          <g key={n} opacity={ease(seg(t, 0.06 + i * 0.07, 0.14 + i * 0.07))}>
            <rect x={140 + i * 70} y={78} width={62} height={36} rx={8} fill={SURFACE} stroke={BRAND} strokeWidth={1.5} />
            <text x={171 + i * 70} y={102} textAnchor="middle" fontSize={16} fill={INK} className="font-mono">
              {n}
            </text>
          </g>
        ))}
        <text x={W / 2} y={150} textAnchor="middle" fontSize={14} fill={INK2} opacity={ease(seg(t, 0.2, 0.26))}>
          a word becomes a list of numbers
        </text>
      </g>

      <g opacity={map}>
        <rect x={12} y={14} width={W - 24} height={H - 28} rx={12} fill="none" stroke={LINE} strokeWidth={1.5} strokeDasharray="4 5" />
        <ellipse cx={250} cy={86} rx={64} ry={46} fill={BRAND} opacity={0.14 * seg(t, 0.88, 0.98)} />
        <ellipse cx={104} cy={170} rx={62} ry={38} fill={ORANGE} opacity={0.16 * seg(t, 0.88, 0.98)} />
        <text x={250} y={142} textAnchor="middle" fontSize={14} fill={INK2} opacity={seg(t, 0.9, 1)}>
          animals
        </text>
        <text x={104} y={221} textAnchor="middle" fontSize={14} fill={INK2} opacity={seg(t, 0.9, 1)}>
          vehicles
        </text>
        {WORDS.map((d, i) => {
          const u = ease(seg(t, 0.42 + i * 0.06, 0.72 + i * 0.06));
          return <Tag key={d.w} word={d.w} x={r2(lerp(d.from[0], d.to[0], u))} y={r2(lerp(d.from[1], d.to[1], u))} stroke={u > 0.99 ? GROUP_COLOUR[d.group] : LINE} />;
        })}
      </g>
    </g>
  );
}

// ───────────────────────── 2. transformer layers ─────────────────────────

const TOKENS = ["The", "cat", "sat", "on", "the"];
const COL_X = TOKENS.map((_, i) => 40 + i * 70);
const ROW_Y = [190, 140, 90, 40]; // vector rows: input, after layer 1, 2, 3
const HUES = [205, 170, 105, 38]; // each layer shifts the colour a little
const SAT = 2;
/** Attention from "sat" to the others, per layer (the weights differ layer by layer). */
const ATTN: number[][] = [
  [0.2, 0.55, 0, 0.35, 0.2],
  [0.25, 0.9, 0, 0.4, 0.3],
  [0.1, 0.6, 0, 0.8, 0.5],
];

const hsl = (h: number) => `hsl(${h} 70% 52%)`;

function transformer(t: number, reduced: boolean): React.ReactNode {
  const tokensIn = ease(seg(t, 0, 0.1));
  const LAYER_START = 0.12;
  const LAYER_LEN = 0.25;
  return (
    <g>
      {[0, 1, 2].map((k) => {
        const a = LAYER_START + k * LAYER_LEN;
        const active = t >= a && t < a + LAYER_LEN;
        return <rect key={k} x={14} y={ROW_Y[k + 1] - 4} width={W - 28} height={ROW_Y[k] - ROW_Y[k + 1] - 24} rx={10} fill={BRAND} opacity={active ? 0.16 : 0.05} stroke={LINE} strokeWidth={1} />;
      })}
      {[0, 1, 2].map((k) => {
        const a = LAYER_START + k * LAYER_LEN;
        // the finished picture keeps every layer's attention lines, as the caption describes them
        const attn = reduced ? 1 : ease(seg(t, a, a + 0.1)) * (1 - ease(seg(t, a + 0.17, a + LAYER_LEN)));
        const y = ROW_Y[k];
        return (
          <g key={k}>
            {ATTN[k].map((wgt, j) =>
              j === SAT ? null : (
                <path
                  key={j}
                  d={`M${COL_X[SAT]} ${y - 9} Q${(COL_X[SAT] + COL_X[j]) / 2} ${y - 52} ${COL_X[j]} ${y - 9}`}
                  fill="none"
                  stroke={BRAND}
                  strokeWidth={r2(1 + wgt * 5)}
                  strokeLinecap="round"
                  opacity={attn * (0.35 + wgt * 0.65)}
                />
              ),
            )}
          </g>
        );
      })}
      {ROW_Y.map((y, k) => {
        const appear = k === 0 ? tokensIn : ease(seg(t, LAYER_START + (k - 1) * LAYER_LEN + 0.14, LAYER_START + k * LAYER_LEN));
        return COL_X.map((x, i) => (
          <circle key={`${k}-${i}`} cx={x} cy={y} r={8} fill={hsl(HUES[k])} stroke={SURFACE} strokeWidth={2} opacity={k === 0 ? appear : 0.15 + 0.85 * appear} />
        ));
      })}
      {TOKENS.map((w, i) => (
        <Tag key={w + i} word={w} x={COL_X[i]} y={222} opacity={tokensIn} stroke={i === SAT ? BRAND : LINE} />
      ))}
      <text x={14} y={17} fontSize={14} fill={INK2}>
        {t < LAYER_START ? "Words go in as vectors" : t < LAYER_START + LAYER_LEN ? "Layer 1" : t < LAYER_START + 2 * LAYER_LEN ? "Layer 2" : t < LAYER_START + 3 * LAYER_LEN ? "Layer 3" : "Out: vectors that know the context"}
      </text>
    </g>
  );
}

// ───────────────────────── 3. training ─────────────────────────

const STEPS = [
  { title: "Predict", sub: "guess a word" },
  { title: "Compare", sub: "vs the truth" },
  { title: "Nudge", sub: "tweak weights" },
];
const CHART = { x: 44, y: 102, w: 296, h: 110 };

/** Loss after fraction s of training: falls fast, then flattens, with noise that shrinks. */
function loss(s: number) {
  const noise = Math.sin(s * 91) * 0.5 + Math.sin(s * 37 + 1) * 0.35 + Math.sin(s * 173 + 2) * 0.2;
  return 0.22 + 3.1 * Math.exp(-5.5 * s) + noise * (0.45 * Math.exp(-3.2 * s) + 0.03);
}
const MAX_LOSS = 3.6;

function training(t: number): React.ReactNode {
  const grow = seg(t, 0.03, 1);
  const n = Math.max(2, Math.round(grow * 120));
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const s = (i / 120);
    pts.push(`${r2(CHART.x + s * CHART.w)} ${r2(CHART.y + CHART.h - Math.max(0, Math.min(1, loss(s) / MAX_LOSS)) * CHART.h)}`);
  }
  const head = pts[pts.length - 1].split(" ");
  const cycle = t >= 1 || t < 0.03 ? -1 : Math.floor(grow * 30) % 3;
  const stepCount = Math.round(grow * grow * 150000 * (0.4 + 0.6 * grow));
  return (
    <g>
      {STEPS.map((s, i) => {
        const x = 10 + i * 116;
        const on = cycle === i;
        return (
          <g key={s.title}>
            <rect x={x} y={12} width={108} height={50} rx={10} fill={on ? BRAND : SURFACE} fillOpacity={on ? 0.28 : 1} stroke={on ? BRAND : LINE} strokeWidth={on ? 2 : 1.5} />
            <text x={x + 54} y={34} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK}>
              {i + 1} {s.title}
            </text>
            <text x={x + 54} y={52} textAnchor="middle" fontSize={14} fill={INK2}>
              {s.sub}
            </text>
          </g>
        );
      })}
      <text x={10} y={90} fontSize={14} fill={INK2}>
        step
      </text>
      <text x={48} y={90} fontSize={15} fill={INK} className="font-mono" fontWeight={600}>
        {stepCount.toLocaleString("en-US")}
      </text>
      <text x={W - 10} y={90} textAnchor="end" fontSize={14} fill={INK2}>
        loss{" "}
        <tspan fill={INK} className="font-mono" fontWeight={600}>
          {(loss(grow) < 0 ? 0 : loss(grow)).toFixed(2)}
        </tspan>
      </text>
      <line x1={CHART.x} y1={CHART.y} x2={CHART.x} y2={CHART.y + CHART.h} stroke={INK3} strokeWidth={1.5} />
      <line x1={CHART.x} y1={CHART.y + CHART.h} x2={CHART.x + CHART.w} y2={CHART.y + CHART.h} stroke={INK3} strokeWidth={1.5} />
      <text x={CHART.x + CHART.w} y={CHART.y + CHART.h + 17} textAnchor="end" fontSize={14} fill={INK3}>
        more training →
      </text>
      <text x={CHART.x - 6} y={CHART.y + 10} textAnchor="end" fontSize={14} fill={INK3}>
        high
      </text>
      <text x={CHART.x - 6} y={CHART.y + CHART.h} textAnchor="end" fontSize={14} fill={INK3}>
        low
      </text>
      <polyline points={pts.join(" ")} fill="none" stroke={BRAND} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={head[0]} cy={head[1]} r={5} fill={BRAND} stroke={SURFACE} strokeWidth={2} />
    </g>
  );
}

// ───────────────────────── 4. next-token prediction ─────────────────────────

interface Pass {
  context: string;
  options: [string, number][];
  pick: string;
}
const PASSES: Pass[] = [
  { context: "The cat sat on the", options: [["mat", 0.46], ["floor", 0.24], ["sofa", 0.14], ["roof", 0.09]], pick: "mat" },
  { context: "The cat sat on the mat", options: [[".", 0.52], ["and", 0.22], [",", 0.14], ["while", 0.08]], pick: "." },
];
const CH = 9.6; // width of one 16px monospace character (estimate, used only for the chip's flight path)
const SX = 14;
const BAR_Y = 92;
const BAR_STEP = 34;
const isPunct = (w: string) => /^[.,!?;:]$/.test(w);

function nextToken(at: number, reduced: boolean): React.ReactNode {
  const t = reduced ? 0.42 : at; // the finished picture is the first pass, the one the caption describes
  return (
    <g>
      {PASSES.map((p, pi) => {
        if (pi !== (t < 0.5 ? 0 : 1)) return null; // one pass on screen at a time
        const base = pi * 0.5;
        const u = seg(t, base, base + 0.5);
        const bars = ease(seg(u, 0.08, 0.4));
        const pickedAt = seg(u, 0.5, 0.72);
        const fade = pi === 0 ? 1 - seg(u, 0.88, 1) : 1;
        const punct = isPunct(p.pick);
        const blankX = SX + (p.context.length + (punct ? 0 : 1)) * CH;
        const idx = p.options.findIndex(([w]) => w === p.pick);
        const pe = ease(pickedAt);
        const chipW = p.pick.length * 9.3 + 16;
        const chipX = lerp(SX + 4 + chipW / 2, blankX + chipW / 2 - 4, pe);
        const chipY = lerp(BAR_Y + idx * BAR_STEP, 38, pe);
        const done = pe >= 1;
        return (
          <g key={pi}>
            {/* the sentence so far: one text, so the picked word lands with exact spacing */}
            <text x={SX} y={44} fontSize={16} fill={INK} className="font-mono" style={{ whiteSpace: "pre" }}>
              {p.context}
              {done && (
                <tspan fontWeight={700}>
                  {punct ? "" : " "}
                  {p.pick}
                </tspan>
              )}
            </text>
            {!done && <line x1={r2(blankX)} y1={52} x2={r2(blankX + (punct ? 14 : 40))} y2={52} stroke={BRAND} strokeWidth={2.5} strokeLinecap="round" />}
            <text x={SX} y={20} fontSize={14} fill={INK3}>
              next word probabilities
            </text>
            <g opacity={fade}>
              {p.options.map(([w, prob], i) => {
                const y = BAR_Y + i * BAR_STEP;
                const chosen = w === p.pick;
                const len = prob * 400 * bars;
                const glow = chosen && u > 0.42 ? ease(seg(u, 0.42, 0.5)) : 0;
                return (
                  <g key={w}>
                    <text x={SX} y={y + 5} fontSize={16} fill={INK} className="font-mono" opacity={chosen && pickedAt > 0 ? 0.75 : 1}>
                      {w}
                    </text>
                    <rect x={76} y={y - 11} width={r2(Math.max(2, len))} height={24} rx={6} fill={chosen ? BRAND : BLUE} fillOpacity={chosen ? 0.55 + 0.45 * glow : 0.5} stroke={chosen ? BRAND : "none"} strokeWidth={glow * 2} />
                    <text x={r2(76 + Math.max(2, len) + 8)} y={y + 5} fontSize={14} fill={INK2} className="font-mono" opacity={bars}>
                      {Math.round(prob * 100)}%
                    </text>
                  </g>
                );
              })}
            </g>
            {pickedAt > 0 && !done && <Tag word={p.pick} x={r2(chipX)} y={r2(chipY)} fill={BRAND} stroke={BRAND} size={16} />}
          </g>
        );
      })}
      <text x={W - 10} y={H - 10} textAnchor="end" fontSize={14} fill={INK3} opacity={reduced ? 1 : seg(t, 0.9, 1)}>
        add it, then predict again
      </text>
    </g>
  );
}

// ───────────────────────── the widget ─────────────────────────

const ALL: ExplainScene[] = [
  {
    id: "embeddings",
    title: "1. Words become numbers with a meaning",
    caption: "Each word is turned into a short list of numbers, its vector. Words used in similar ways get similar numbers, so on a map of meaning cat, kitten and dog end up together and car and truck end up somewhere else. Real vectors have hundreds or thousands of numbers; this map has two so you can see it.",
    durationMs: 9000,
    render: embeddings,
  },
  {
    id: "transformer",
    title: "2. Layers mix the words together",
    caption: "The sentence goes up through a stack of layers. In each layer every word can look at the others: the lines show “sat” paying attention to “cat”, “on” and the rest, thicker lines meaning more attention. After each layer the vectors change (the colour shifts), carrying more of the sentence’s context.",
    durationMs: 11000,
    render: transformer,
  },
  {
    id: "training",
    title: "3. Training: guess, check, nudge",
    caption: "Training repeats three moves billions of times: predict the next word of a real text, compare the guess with the word that really came next, and nudge the model’s weights so that guess gets a bit better. The loss, a score for how wrong it is, falls quickly at first, wobbles, then flattens as there is less left to learn.",
    durationMs: 12000,
    render: training,
  },
  {
    id: "next-token",
    title: "4. Pick the next word, then repeat",
    caption: "Given “The cat sat on the”, the finished model gives every possible next word a probability: mat is the most likely, then floor, sofa and roof. One is picked (temperature decides how adventurous the pick is), added to the text, and the whole thing runs again for the word after that.",
    durationMs: 12000,
    render: nextToken,
  },
];

export interface LlmExplainerProps {
  /** Show only these scenes, in this order: "embeddings", "transformer", "training", "next-token". Default all four. */
  scenes?: string[];
}

export function LlmExplainer({ props }: WidgetProps<LlmExplainerProps>) {
  const picked = props.scenes?.length ? props.scenes.map((id) => ALL.find((s) => s.id === id)).filter((s): s is ExplainScene => !!s) : ALL;
  const scenes = picked.length ? picked : ALL;
  // changing the subset remounts the player, so its scene index never points past the end
  return <Explainer key={scenes.map((s) => s.id).join()} scenes={scenes} width={W} height={H} label="How a language model works, animated" />;
}
