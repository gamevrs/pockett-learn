import type { GhostKind } from "./ui";

/** The systems of Halyard Port: one per lesson, plus the console that opens with lesson 1. */

export interface PanelSpec {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
}

export const CONSOLE: PanelSpec = { id: "hp-console", title: "Port console", lesson: 1, clause: "Console.WriteLine", ghost: "console" };
export const BOARD: PanelSpec = { id: "hp-board", title: "Manifest board", lesson: 2, clause: "Where · Select · OrderBy", ghost: "table" };

export const JOINS: PanelSpec = { id: "hp-joins", title: "Vessel loads", lesson: 4, clause: "Join · GroupJoin · SelectMany", ghost: "bars" };

/** Every panel except the manifest board (the hero) and the console, in lesson order. */
export const PANELS: PanelSpec[] = [
  { id: "hp-structures", title: "Dock structures", lesson: 1, clause: "HashSet · Queue · Stack · SortedDictionary", ghost: "chips" },
  { id: "hp-groups", title: "Category chart", lesson: 3, clause: "GroupBy · Sum · ToDictionary", ghost: "bars" },
  JOINS,
  { id: "hp-lazy", title: "Execution tracer", lesson: 5, clause: "deferred vs immediate", ghost: "timeline" },
  { id: "hp-records", title: "Amendment desk", lesson: 6, clause: "records · with", ghost: "compare" },
  { id: "hp-lanes", title: "Triage lanes", lesson: 7, clause: "switch expressions · patterns", ghost: "lanes" },
  { id: "hp-contracts", title: "Load contracts", lesson: 8, clause: "interfaces · IComparable", ghost: "rows" },
  { id: "hp-generics", title: "Generic toolkit", lesson: 9, clause: "generics · where T :", ghost: "cards" },
  { id: "hp-ext", title: "Extension rack", lesson: 10, clause: "extension methods", ghost: "chips" },
  { id: "hp-lookup", title: "Vessel lookup", lesson: 11, clause: "T? · TryGet · ??", ghost: "rows" },
  { id: "hp-parser", title: "Telegram parser", lesson: 12, clause: "Split · TryParse · Regex", ghost: "table" },
  { id: "hp-faults", title: "Loading incidents", lesson: 13, clause: "custom exceptions · filters", ghost: "rows" },
  { id: "hp-json", title: "JSON desk", lesson: 14, clause: "System.Text.Json", ghost: "json" },
  { id: "hp-inbox", title: "Validation inbox", lesson: 15, clause: "CSV import · reasons", ghost: "inbox" },
  { id: "hp-report", title: "Port report", lesson: 16, clause: "the whole pipeline", ghost: "tiles" },
];

export const ALL_IDS = [CONSOLE.id, BOARD.id, ...PANELS.map((p) => p.id)];
export const TOTAL_SYSTEMS = ALL_IDS.length;
