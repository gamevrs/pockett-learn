import type { ConceptLesson, Module } from "../../learn/types.ts";
import { ivPointersLessonsA } from "./iv-pointers-a.ts";
import { ivPointersLessonsB } from "./iv-pointers-b.ts";

const lessons: ConceptLesson[] = [...ivPointersLessonsA, ...ivPointersLessonsB];

export const ivPointersModule: Module = {
  id: "iv-pointers",
  part: "interview",
  title: "Pointers, windows, stacks and lists",
  blurb: "Two pointers, sliding windows, stacks, monotonic stacks and queues, and linked lists.",
  icon: "code",
  lessons,
};
