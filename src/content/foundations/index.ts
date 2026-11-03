import { trackLessons, type ConceptLesson, type Module, type Track } from "../../learn/types.ts";
import { bitsModule } from "./bits.ts";
import { programsModule } from "./programs.ts";
import { oopModule } from "./oop.ts";
import { patternsModule } from "./patterns.ts";
import { computerModule } from "./computer.ts";
import { assemblyModule } from "./assembly.ts";
import { cModule } from "./c.ts";
import { unixModule } from "./unix.ts";
import { networkModule } from "./network.ts";
import { dsaModule } from "./dsa.ts";
import { observabilityModule } from "./observability.ts";
import { reliabilityModule } from "./reliability.ts";
import { trafficModule } from "./traffic.ts";
import { cachingModule } from "./caching.ts";
import { dataModule } from "./data.ts";
import { shippingModule } from "./shipping.ts";
import { securityModule } from "./security.ts";
import { aiSystemsModule } from "./ai-systems.ts";

/** The Foundations track: from a single bit to design patterns, every step interactive. */
export const FOUNDATIONS: Track = {
  slug: "foundations",
  title: "Foundations",
  tagline: "How code really works, from a single bit to the systems behind the apps you use.",
  parts: [
    { id: "start", title: "Start here: bits, the computer and your first programs", blurb: "Begin with a single bit, meet the computer that runs everything, then write your first programs in Python." },
    { id: "hood", title: "Under the hood: assembly, C, the OS and the network", blurb: "Go below Python: the machine's own language, a small and speedy language called C, the operating system, and how computers talk to each other." },
    { id: "building", title: "Building well: data structures, OOP and patterns", blurb: "Learn how to organise data, shape code into objects, and reuse ideas that good programmers have trusted for years." },
    { id: "systems", title: "How production systems work", blurb: "Timeouts, retries, rate limits, caches, databases, deploys, observability, security and AI systems: what it takes for software to survive real traffic." },
  ],
  modules: [
    bitsModule,
    computerModule,
    programsModule,
    assemblyModule,
    cModule,
    unixModule,
    networkModule,
    dsaModule,
    oopModule,
    patternsModule,
    reliabilityModule,
    trafficModule,
    cachingModule,
    dataModule,
    shippingModule,
    observabilityModule,
    securityModule,
    aiSystemsModule,
  ],
};

export interface ConceptContext {
  lesson: ConceptLesson;
  module: Module;
  index: number;
  total: number;
  prev: ConceptLesson | null;
  next: ConceptLesson | null;
}

export function getConceptContext(lessonId: string): ConceptContext | undefined {
  const lessons = trackLessons(FOUNDATIONS);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index < 0) return undefined;
  const owner = FOUNDATIONS.modules.find((m) => m.lessons.some((l) => l.id === lessonId))!;
  return { lesson: lessons[index], module: owner, index, total: lessons.length, prev: lessons[index - 1] ?? null, next: lessons[index + 1] ?? null };
}
