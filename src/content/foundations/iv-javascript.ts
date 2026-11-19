import type { Module } from "../../learn/types.ts";
import { javascriptLessonsA } from "./iv-javascript-a.ts";
import { javascriptLessonsB } from "./iv-javascript-b.ts";

export const ivJavascriptModule: Module = {
  id: "iv-javascript",
  part: "interview",
  title: "JavaScript interview problems",
  blurb: "Closures, this, promises from scratch, debounce and throttle, memoize, event emitters and utilities.",
  icon: "code",
  lessons: [...javascriptLessonsA, ...javascriptLessonsB],
};
