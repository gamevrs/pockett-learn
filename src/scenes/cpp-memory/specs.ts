import type { GhostKind } from "../cpp-basics/ui";
import { allEvents, doubleOwned, elementBlocks, frameGroups, isCopy, isLife, isMove, resolveTarget, sNum, totals, type Lab, type Shot } from "./data";

/** The sixteen systems of the board, in lesson order. */
export interface PanelSpec {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
}

export const PANELS: PanelSpec[] = [
  { id: "pv-bench", title: "Workbench", lesson: 1, clause: "& · * · nullptr · references", ghost: "rows" },
  { id: "pv-shelf", title: "Shelf", lesson: 2, clause: "arrays · pointer arithmetic · const", ghost: "rodgrid" },
  { id: "pv-frames", title: "Call frames", lesson: 3, clause: "stack · lifetimes · dangling", ghost: "rows" },
  { id: "pv-vault", title: "Vault", lesson: 4, clause: "new · delete · leaks", ghost: "tiles" },
  { id: "pv-logbook", title: "Logbook", lesson: 5, clause: "RAII · constructors · destructors", ghost: "log" },
  { id: "pv-custody", title: "Custody", lesson: 6, clause: "rule of three · deep copy", ghost: "cards" },
  { id: "pv-casts", title: "Casting room", lesson: 7, clause: "copy assignment · copy-and-swap", ghost: "bars" },
  { id: "pv-handover", title: "Handover desk", lesson: 8, clause: "std::move · move constructor", ghost: "bars" },
  { id: "pv-rules", title: "Rule board", lesson: 9, clause: "rule of five · rule of zero", ghost: "pills" },
  { id: "pv-storeroom", title: "Storeroom", lesson: 10, clause: "std::unique_ptr", ghost: "columns" },
  { id: "pv-operators", title: "Operator bench", lesson: 11, clause: "== · < · << · += · []", ghost: "pills" },
  { id: "pv-glass", title: "Glass case", lesson: 12, clause: "const members · const&", ghost: "cards" },
  { id: "pv-manifest", title: "Manifest desk", lesson: 13, clause: "getline · istringstream", ghost: "rows" },
  { id: "pv-faults", title: "Fault drill", lesson: 14, clause: "exceptions · safety guarantees", ghost: "columns" },
  { id: "pv-registry", title: "Registry", lesson: 15, clause: "owner · borrowed handles", ghost: "rows" },
  { id: "pv-report", title: "Final report", lesson: 16, clause: "zero leaks · copies vs moves", ghost: "log" },
];

export const PANEL_IDS = PANELS.map((p) => p.id);

export type ChipTone = "plain" | "accent" | "warning" | "danger";
export interface ChipSpec {
  id: string;
  title: string;
  lesson: number;
  value: string | undefined;
  tone: ChipTone;
}

const hasArr = (s: Shot) => s.entries.some((e) => e.kind === "arr");
const hasOwner = (s: Shot) => s.entries.some((e) => e.kind === "own" || e.kind === "vec" || e.role === "owner");

/** One status chip per system: what it found, in a few words. */
export function chipSpecs(lab: Lab): ChipSpec[] {
  const t = totals(lab);
  const maxFrames = lab.shots.reduce((n, s) => Math.max(n, frameGroups(s).length), 0);
  const dangling = lab.shots.some((s) => s.entries.some((e) => (e.kind === "ptr" || e.kind === "own") && resolveTarget(lab, s, e).kind === "dangling"));
  const double = lab.shots.some((s) => doubleOwned(s).length > 0);
  const lifeLines = allEvents(lab).filter((x) => isLife(x.ev.kind)).length;
  const leaks = lab.audit?.leakCount;
  const plaques = new Set(allEvents(lab).filter((x) => /^Plaque/.test(x.ev.who) && (isCopy(x.ev.kind) || isMove(x.ev.kind))).map((x) => x.ev.who));
  const storeShot = [...lab.shots].reverse().find((s) => s.entries.some((e) => e.kind === "vec" && elementBlocks(e).some((b) => b !== null)));
  const storeVec = storeShot?.entries.find((e) => e.kind === "vec");
  const accepted = Array.isArray(lab.scalars.intakeIds) ? lab.scalars.intakeIds.length : undefined;
  const refused = Array.isArray(lab.scalars.rejectLines) ? lab.scalars.rejectLines.length : undefined;
  const basic = sNum(lab.scalars.basicHeld);
  const strong = sNum(lab.scalars.strongHeld);
  const runCopies = sNum(lab.scalars.runCopies);
  const runMoves = sNum(lab.scalars.runMoves);
  const carried = sNum(lab.scalars.carriedGrams);
  const constCopies = sNum(lab.scalars.constCopies);
  const reg = sNum(lab.scalars.registrySize);
  return [
    { id: "pv-bench", title: "Workbench", lesson: 1, value: lab.shots.length > 0 ? `${lab.shots.length} photo${lab.shots.length === 1 ? "" : "s"}` : undefined, tone: "accent" },
    { id: "pv-shelf", title: "Shelf", lesson: 2, value: lab.shots.some(hasArr) ? (sNum(lab.scalars.slotTotal) !== undefined ? `sums to ${sNum(lab.scalars.slotTotal)}` : "array photographed") : undefined, tone: "plain" },
    { id: "pv-frames", title: "Call frames", lesson: 3, value: maxFrames > 0 ? `${maxFrames} deep${dangling ? " · 1 dangling" : ""}` : undefined, tone: dangling ? "warning" : "plain" },
    { id: "pv-vault", title: "Vault", lesson: 4, value: lab.audit ? `${lab.audit.counters.allocs} taken · ${leaks} left` : lab.shots.some((s) => s.blocks.length > 0) ? "bays in use" : undefined, tone: leaks && leaks > 0 ? "danger" : "accent" },
    { id: "pv-logbook", title: "Logbook", lesson: 5, value: lifeLines > 0 ? `${lifeLines} lifecycle lines` : undefined, tone: "plain" },
    { id: "pv-custody", title: "Custody", lesson: 6, value: lab.shots.some(hasOwner) || lab.shots.some((s) => s.entries.some((e) => e.role === "owner")) ? (double ? "two owners!" : "one owner each") : undefined, tone: double ? "danger" : "accent" },
    { id: "pv-casts", title: "Casting room", lesson: 7, value: lab.audit || lab.shots.length > 0 ? `${t.copies} cop${t.copies === 1 ? "y" : "ies"}` : undefined, tone: "plain" },
    { id: "pv-handover", title: "Handover desk", lesson: 8, value: lab.audit || lab.shots.length > 0 ? `${t.moves} move${t.moves === 1 ? "" : "s"}` : undefined, tone: "accent" },
    { id: "pv-rules", title: "Rule board", lesson: 9, value: plaques.size > 0 ? `${plaques.size} classes compared` : undefined, tone: "plain" },
    { id: "pv-storeroom", title: "Storeroom", lesson: 10, value: storeVec ? `${storeVec.len ?? 0} slots` : undefined, tone: "plain" },
    { id: "pv-operators", title: "Operators", lesson: 11, value: carried !== undefined ? `carried ${carried} g` : undefined, tone: "plain" },
    { id: "pv-glass", title: "Glass case", lesson: 12, value: constCopies !== undefined ? `${constCopies} copies` : undefined, tone: constCopies === 0 ? "accent" : "warning" },
    { id: "pv-manifest", title: "Manifest", lesson: 13, value: accepted !== undefined ? `${accepted} in · ${refused ?? 0} refused` : undefined, tone: (refused ?? 0) > 0 ? "warning" : "accent" },
    { id: "pv-faults", title: "Fault drill", lesson: 14, value: basic !== undefined && strong !== undefined ? `basic ${basic} · strong ${strong}` : undefined, tone: "plain" },
    { id: "pv-registry", title: "Registry", lesson: 15, value: reg !== undefined ? `${reg} pieces` : undefined, tone: "accent" },
    { id: "pv-report", title: "Final report", lesson: 16, value: runCopies !== undefined && runMoves !== undefined ? `${runCopies} copy · ${runMoves} moves` : undefined, tone: "accent" },
  ];
}
