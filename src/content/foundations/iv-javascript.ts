import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivJavascriptModule: Module = {
  id: "iv-javascript",
  part: "interview",
  title: "JavaScript interview problems",
  blurb: "Closures, this, promises from scratch, debounce and throttle, memoize, event emitters and utilities.",
  icon: "code",
  lessons,
};
