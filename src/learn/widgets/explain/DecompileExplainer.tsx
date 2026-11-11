"use client";

import React from "react";
import type { WidgetProps } from "@/learn/widget";
import { Explainer, type ExplainScene } from "./Explainer";
import { ease, lerp, r2, seg } from "./anim";

/**
 * "Reading a program backwards" in four scenes: compiling throws things away, disassembly turns numbers
 * back into instructions, structure is found again, and a decompiler writes C-like code with invented
 * names. The machine is the practice CPU from the Assembly module (three numbers per instruction,
 * registers R0 to R3, same mnemonics and opcodes), so nothing here is a new instruction set.
 * `props.scenes` shows a subset, in the order given.
 */

const W = 360;
const H = 290;
const INK = "var(--ink)";
const INK2 = "var(--ink-2)";
const INK3 = "var(--ink-3)";
const BRAND = "var(--brand)";
const SURFACE = "var(--surface)";
const ORANGE = "#e8924a";

// ───────────────────────── shared data ─────────────────────────

/** The compiled function, as the practice CPU sees it: address, assembly and its three numbers. */
const CODE: { asm: string; num: [number, number, number]; note: string }[] = [
  { asm: "MOV R2, #0", num: [1, 2, 0], note: "1 means MOV register, number" },
  { asm: "CMP R1, #1", num: [10, 1, 1], note: "10 means CMP register, number" },
  { asm: "JLT 8", num: [14, 8, 0], note: "" },
  { asm: "LOAD R3, [R0]", num: [21, 3, 0], note: "" },
  { asm: "ADD R2, R3", num: [5, 2, 3], note: "" },
  { asm: "ADD R0, #1", num: [7, 0, 1], note: "" },
  { asm: "SUB R1, #1", num: [8, 1, 1], note: "" },
  { asm: "JMP 1", num: [11, 1, 0], note: "" },
  { asm: "MOV R0, R2", num: [2, 0, 2], note: "" },
  { asm: "RET", num: [20, 0, 0], note: "" },
];
const numText = (n: number[]) => n.join(" ");

const NAMES = new Set(["total", "prices", "n", "sum", "i"]);
const TYPES = new Set(["int"]);

type Cls = "plain" | "comment" | "name" | "type";
/** Cut a line of source into words, tagged so a scene can fade each kind on its own. */
function tokens(line: string, names: Set<string> = NAMES, types: Set<string> = TYPES): { s: string; cls: Cls; col: number }[] {
  if (line.trim().startsWith("//")) return [{ s: line, cls: "comment", col: 0 }];
  let col = 0;
  return (line.match(/\w+|\W+/g) ?? []).map((s) => {
    const tok = { s, col, cls: (types.has(s) ? "type" : names.has(s) ? "name" : "plain") as Cls };
    col += s.length;
    return tok;
  });
}

/** One line of monospace code, placed token by token (0.6 em per character) so highlights line up with the words. */
function CodeLine({ line, x, y, size = 14, cls, names, types }: { line: string; x: number; y: number; size?: number; cls?: (c: Cls) => { opacity: number; mark: number }; names?: Set<string>; types?: Set<string> }) {
  const cw = size * 0.6;
  return (
    <g>
      {tokens(line, names, types).map((tk, i) => {
        const st = cls ? cls(tk.cls) : { opacity: 1, mark: 0 };
        if (!tk.s.trim()) return null;
        const tx = x + tk.col * cw;
        return (
          <g key={i}>
            {st.mark > 0 && <rect x={r2(tx - 2)} y={y - size + 2} width={r2(tk.s.length * cw + 4)} height={size + 5} rx={4} fill={ORANGE} opacity={0.45 * st.mark} />}
            <text x={r2(tx)} y={y} fontSize={size} fill={INK} className="font-mono" opacity={st.opacity} style={{ whiteSpace: "pre" }}>
              {tk.s}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Fade a kind of word out inside the window [a, b]: it is flagged first, then falls away. */
function lose(t: number, a: number, b: number) {
  const u = seg(t, a, b);
  return { opacity: 1 - 0.88 * ease(seg(u, 0.35, 1)), mark: u <= 0 || u >= 1 ? 0 : Math.min(1, u * 3, (1 - u) * 3) };
}

// ───────────────────────── 1. compiling throws things away ─────────────────────────

const C_SOURCE = ["// add up the prices", "int total(int *prices, int n) {", "  int sum = 0;", "  for (int i = 0; i < n; i++)", "    sum += prices[i];", "  return sum;", "}"];

function compile(t: number): React.ReactNode {
  const comment = lose(t, 0.36, 0.5);
  const name = lose(t, 0.5, 0.64);
  const type = lose(t, 0.64, 0.76);
  const style = (c: Cls) => (c === "comment" ? comment : c === "name" ? name : c === "type" ? type : { opacity: 1, mark: 0 });
  return (
    <g>
      {C_SOURCE.map((l, i) => (
        <CodeLine key={i} line={l} x={14} y={22 + i * 18} cls={style} />
      ))}
      <g opacity={ease(seg(t, 0.06, 0.16))}>
        <text x={W / 2} y={160} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK}>
          ▼ compiler ▼
        </text>
      </g>
      <text x={W / 2} y={184} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK} opacity={ease(seg(t, 0.8, 0.9))}>
        lost: names, comments, types
      </text>
      <text x={14} y={210} fontSize={14} fill={INK2} opacity={ease(seg(t, 0.16, 0.24))}>
        machine code
      </text>
      {CODE.map((c, i) => {
        const x = 10 + (i % 5) * 69;
        const y = 238 + Math.floor(i / 5) * 30 - 4;
        const o = ease(seg(t, 0.18 + i * 0.016, 0.26 + i * 0.016));
        return (
          <g key={i} opacity={o}>
            <rect x={x} y={y - 18} width={64} height={26} rx={6} fill={SURFACE} stroke={BRAND} strokeWidth={1.5} />
            <text x={x + 32} y={y} textAnchor="middle" fontSize={14} fill={INK} className="font-mono">
              {numText(c.num)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ───────────────────────── 2. disassembly ─────────────────────────

const ROW = 22;
function disassemble(t: number): React.ReactNode {
  const list = ease(seg(t, 0, 0.08));
  const at = (i: number) => (i === 0 ? 0.1 : i === 1 ? 0.3 : 0.5 + (i - 2) * 0.05); // when row i starts decoding
  const cur = t < 0.3 ? 0 : t < 0.5 ? 1 : -1;
  const note = t >= 0.92 ? "Same numbers in, same instructions out. No guessing." : t >= 0.5 ? "…and every other group is read the same way." : CODE[cur === 1 || t >= 0.3 ? 1 : 0].note;
  return (
    <g>
      {CODE.map((c, i) => {
        const y = 28 + i * ROW;
        const dec = ease(seg(t, at(i), at(i) + 0.08));
        return (
          <g key={i}>
            {cur === i && t >= at(i) && <rect x={6} y={y - 17} width={W - 12} height={ROW - 1} rx={6} fill={BRAND} opacity={0.2} />}
            <text x={12} y={y} fontSize={14} fill={INK3} className="font-mono" opacity={list}>
              {i}
            </text>
            <text x={40} y={y} fontSize={14} fill={INK} className="font-mono" opacity={list} fontWeight={cur === i ? 700 : 400}>
              {numText(c.num)}
            </text>
            <text x={118} y={y} fontSize={14} fill={INK2} opacity={dec}>
              →
            </text>
            <text x={146} y={y} fontSize={14} fill={INK} className="font-mono" opacity={dec} fontWeight={600}>
              {c.asm}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 18} textAnchor="middle" fontSize={14} fill={INK} opacity={ease(seg(t, 0.1, 0.16))}>
        {note}
      </text>
    </g>
  );
}

// ───────────────────────── 3. finding the structure ─────────────────────────

interface Block {
  rows: number[]; // indexes into CODE
  gx: number;
  gy: number;
  gw: number;
}
const BLOCKS: Block[] = [
  { rows: [0], gx: 20, gy: 12, gw: 130 },
  { rows: [1, 2], gx: 20, gy: 84, gw: 130 },
  { rows: [3, 4, 5, 6, 7], gx: 214, gy: 70, gw: 136 },
  { rows: [8, 9], gx: 20, gy: 222, gw: 130 },
];
const gh = (n: number) => n * 20 + 12;

function Arrow({ x, y, dir, colour, opacity }: { x: number; y: number; dir: "down" | "right" | "left"; colour: string; opacity: number }) {
  const d = dir === "down" ? `M${x - 6} ${y - 9} L${x} ${y} L${x + 6} ${y - 9}` : dir === "right" ? `M${x - 9} ${y - 6} L${x} ${y} L${x - 9} ${y + 6}` : `M${x + 9} ${y - 6} L${x} ${y} L${x + 9} ${y + 6}`;
  return <path d={d} fill="none" stroke={colour} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
}

function Pill({ x, y, text, colour, opacity }: { x: number; y: number; text: string; colour: string; opacity: number }) {
  const w = text.length * 8 + 14;
  return (
    <g opacity={opacity}>
      <rect x={r2(x - w / 2)} y={y - 15} width={w} height={22} rx={11} fill={colour} fillOpacity={0.3} stroke={colour} strokeWidth={1.5} />
      <text x={x} y={y + 1} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK}>
        {text}
      </text>
    </g>
  );
}

function structure(t: number): React.ReactNode {
  const split = ease(seg(t, 0.12, 0.34));
  const move = ease(seg(t, 0.4, 0.72));
  const edges = ease(seg(t, 0.74, 0.86));
  const loop = ease(seg(t, 0.86, 0.96));
  const GAP = 10;
  return (
    <g>
      {BLOCKS.map((b, bi) => {
        const start = b.rows[0];
        const ly = 14 + start * 20 + bi * GAP * split;
        const lh = b.rows.length * 20 + 4;
        const x = lerp(8, b.gx, move);
        const y = lerp(ly - 2, b.gy, move);
        const w = lerp(160, b.gw, move);
        const h = lerp(lh, gh(b.rows.length), move);
        const showBox = Math.max(split, move);
        const isLoop = bi === 2;
        return (
          <g key={bi}>
            <rect x={r2(x)} y={r2(y)} width={r2(w)} height={r2(h)} rx={8} fill={SURFACE} fillOpacity={showBox} stroke={isLoop && loop > 0 ? ORANGE : BRAND} strokeOpacity={showBox} strokeWidth={isLoop && loop > 0 ? 2.5 : 1.5} />
            {b.rows.map((r, j) => (
              <text key={r} x={r2(lerp(18, b.gx + 10, move))} y={r2(lerp(ly + 16 + j * 20, b.gy + 22 + j * 20, move))} fontSize={14} fill={INK} className="font-mono">
                {CODE[r].asm}
              </text>
            ))}
          </g>
        );
      })}
      {/* edges */}
      <g opacity={edges}>
        <path d="M85 44 V84" stroke={INK2} strokeWidth={2} fill="none" />
        <Arrow x={85} y={84} dir="down" colour={INK2} opacity={1} />
        <path d="M150 100 H214" stroke={INK2} strokeWidth={2} fill="none" />
        <Arrow x={214} y={100} dir="right" colour={INK2} opacity={1} />
        <path d="M85 136 V222" stroke={INK2} strokeWidth={2} fill="none" />
        <Arrow x={85} y={222} dir="down" colour={INK2} opacity={1} />
      </g>
      <Pill x={182} y={86} text="else" colour={INK3} opacity={edges} />
      <Pill x={128} y={188} text="if n < 1" colour={BRAND} opacity={edges} />
      <g opacity={loop}>
        <path d="M282 182 V206 H178 V124 H150" stroke={ORANGE} strokeWidth={3.5} fill="none" strokeLinejoin="round" />
        <Arrow x={150} y={124} dir="left" colour={ORANGE} opacity={1} />
      </g>
      <Pill x={230} y={200} text="loop" colour={ORANGE} opacity={loop} />
    </g>
  );
}

// ───────────────────────── 4. decompiled C ─────────────────────────

const DECOMPILED = ["int sub_401000(int *a1, int a2) {", "  int v1 = 0;", "  while (a2 >= 1) {", "    v1 += *a1; a1++; a2--;", "  }", "  return v1;", "}"];
const ORIGINAL = ["int total(int *prices, int n) {", "  int sum = 0;", "  for (int i = 0; i < n; i++)", "    sum += prices[i];", "  return sum;", "}"];
const GENERIC = new Set(["sub_401000", "a1", "a2", "v1"]);
const REAL = new Set(["total", "prices", "n", "sum", "i"]);
/** Swap order of the invented names for human ones. */
const SWAPS: [string, string][] = [["sub_401000", "total"], ["a1", "prices"], ["a2", "n"], ["v1", "sum"]];

function decompile(t: number): React.ReactNode {
  const show = (i: number) => ease(seg(t, 0.02 + i * 0.03, 0.1 + i * 0.03));
  const mark = ease(seg(t, 0.46, 0.54)) * (1 - ease(seg(t, 0.64, 0.7)));
  const ren = seg(t, 0.62, 0.86); // names are swapped one after another
  const swapped = new Set(SWAPS.filter((_, i) => ren > 0.12 + i * 0.22).map(([a]) => a));
  const renamedLine = (l: string) => SWAPS.reduce((s, [a, b]) => (swapped.has(a) ? s.replace(new RegExp(`\\b${a}\\b`, "g"), b) : s), l);
  const orig = ease(seg(t, 0.26, 0.4));
  return (
    <g>
      <text x={14} y={18} fontSize={14} fill={INK2} fontWeight={600}>
        decompiled
      </text>
      {DECOMPILED.map((l, i) => {
        const line = renamedLine(l);
        const cls = (c: Cls) => ({ opacity: 1, mark: c === "name" ? mark * (swapped.size ? 0 : 1) : 0 });
        return (
          <g key={i} opacity={show(i)}>
            <CodeLine line={line} x={14} y={37 + i * 17} cls={cls} names={new Set([...GENERIC, ...REAL])} types={TYPES} />
          </g>
        );
      })}
      <g opacity={orig}>
        <text x={14} y={160} fontSize={14} fill={INK2} fontWeight={600}>
          original
        </text>
        {ORIGINAL.map((l, i) => (
          <CodeLine key={i} line={l} x={14} y={180 + i * 16} cls={(c) => ({ opacity: 1, mark: c === "name" ? mark : 0 })} />
        ))}
      </g>
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={14} fontWeight={600} fill={INK} opacity={ease(seg(t, 0.9, 0.98))}>
        a person (or an AI) adds the meaning back
      </text>
    </g>
  );
}

// ───────────────────────── the widget ─────────────────────────

const ALL: ExplainScene[] = [
  {
    id: "compile",
    title: "1. Compiling throws things away",
    caption: "A compiler turns your C into machine code: just numbers (this practice CPU uses three per instruction; real CPUs use bytes, same idea). On the way, the comment, the variable names and the types are not needed to run the program, so they are left behind. They are usually gone for good unless the build keeps extra debugging information.",
    durationMs: 11000,
    render: compile,
  },
  {
    id: "disassemble",
    title: "2. Numbers back into instructions",
    caption: "A disassembler reads the numbers in groups. The first number of each group is the opcode, which says which instruction it is, and the other two are what it works on: 1, 2, 0 is MOV R2, #0. This step is mechanical and exact: the same numbers always give the same instructions. What you get is assembly, still with no names.",
    durationMs: 11000,
    render: disassemble,
  },
  {
    id: "structure",
    title: "3. Finding the structure",
    caption: "Now the program is cut into blocks wherever there is a jump or something to jump to, and the blocks are drawn as a graph. A conditional jump (JLT) is an “if”: go one way or the other. A jump that goes back up to an earlier block is a loop. Spotting these shapes is how the structure of the original program comes back.",
    durationMs: 12000,
    render: structure,
  },
  {
    id: "decompile",
    title: "4. Decompiled C",
    caption: "A decompiler turns the graph into C-like code. The shape is right, but it has to invent names: a1 and a2 for the inputs, v1 for the sum. It is also an approximation: here the compiler had rewritten the for loop to walk along the list, so the result is a while loop rather than the original for. A person (or an AI) then reads it and renames things to put the meaning back.",
    durationMs: 13000,
    render: decompile,
  },
];

export interface DecompileExplainerProps {
  /** Show only these scenes, in this order: "compile", "disassemble", "structure", "decompile". Default all four. */
  scenes?: string[];
}

export function DecompileExplainer({ props }: WidgetProps<DecompileExplainerProps>) {
  const picked = props.scenes?.length ? props.scenes.map((id) => ALL.find((s) => s.id === id)).filter((s): s is ExplainScene => !!s) : ALL;
  const scenes = picked.length ? picked : ALL;
  return <Explainer key={scenes.map((s) => s.id).join()} scenes={scenes} width={W} height={H} label="Reading a program backwards, animated" />;
}
