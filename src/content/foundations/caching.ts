import type { Module } from "../../learn/types.ts";
import { cachingLessonsA } from "./caching-a.ts";
import { cachingLessonsB } from "./caching-b.ts";
import { cachingLessonsC } from "./caching-c.ts";

/**
 * Module: caching. Why caches exist, the four wiring patterns, expiry and eviction, invalidation
 * races, stampedes, reading hit rate, HTTP caching, shared caches and CDNs, and when not to cache.
 * Scenarios: a concert-ticket site (Encore) and a recipe app (Pantry).
 */
export const cachingModule: Module = {
  id: "caching",
  part: "systems",
  title: "Remember the answer",
  blurb: "Latency, cache-aside and write-through, TTLs and eviction, invalidation races, stampedes, HTTP caching and CDNs, and when a cache is the wrong tool.",
  icon: "gauge",
  lessons: [...cachingLessonsA, ...cachingLessonsB, ...cachingLessonsC],
};
