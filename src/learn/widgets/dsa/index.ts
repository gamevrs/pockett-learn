import type { WidgetRegistry } from "@/learn/widget";
import { ArrayList, checkArrayList } from "./ArrayList";
import { Bst, checkBst } from "./Bst";
import { Cards, checkCards } from "./Cards";
import { checkGraph, Graph } from "./Graph";
import { checkGridBfs, GridBfs } from "./GridBfs";
import { checkGrowth, Growth } from "./Growth";
import { checkGuess, Guess } from "./Guess";
import { checkHashMap, HashMap } from "./HashMap";
import { checkOpCount, OpCount } from "./OpCount";
import { checkSort, Sort } from "./Sort";
import { checkStackQueue, StackQueue } from "./StackQueue";

/** Widgets for the "Data structures and algorithms" module. Keys are prefixed with "dsa-" to stay unique. */
export const DSA_WIDGETS: WidgetRegistry = {
  "dsa-cards": { Component: Cards, check: checkCards },
  "dsa-growth": { Component: Growth, check: checkGrowth },
  "dsa-opcount": { Component: OpCount, check: checkOpCount },
  "dsa-arraylist": { Component: ArrayList, check: checkArrayList },
  "dsa-stackqueue": { Component: StackQueue, check: checkStackQueue },
  "dsa-hashmap": { Component: HashMap, check: checkHashMap },
  "dsa-guess": { Component: Guess, check: checkGuess },
  "dsa-sort": { Component: Sort, check: checkSort },
  "dsa-bst": { Component: Bst, check: checkBst },
  "dsa-grid": { Component: GridBfs, check: checkGridBfs },
  "dsa-graph": { Component: Graph, check: checkGraph },
};
