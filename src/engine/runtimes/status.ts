"use client";

import { useSyncExternalStore } from "react";
import type { LanguageId } from "../types";

/**
 * Whether a language engine that has to be downloaded (Pyodide for Python, sql.js for SQL) is ready.
 * Everyone who cares (Run buttons, the sandbox, the stage) reads the same state, so a download that
 * was started by a background preload still shows its progress, and a blocked CDN shows one clear
 * message with a Retry instead of an endless "Loading…".
 */

export type RuntimePhase = "idle" | "loading" | "ready" | "failed";
export interface RuntimeState {
  phase: RuntimePhase;
  /** Plain-language progress ("Starting Python…") or failure reason. */
  message: string;
}

const IDLE: RuntimeState = { phase: "idle", message: "" };
const READY: RuntimeState = { phase: "ready", message: "" };
const states = new Map<LanguageId, RuntimeState>();
const listeners = new Set<() => void>();

export function getRuntimeState(language: LanguageId): RuntimeState {
  return states.get(language) ?? IDLE;
}

export function reportRuntime(language: LanguageId, phase: RuntimePhase, message = "") {
  const prev = getRuntimeState(language);
  if (prev.phase === phase && prev.message === message) return;
  states.set(language, phase === "ready" ? READY : { phase, message });
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Live state of a language's engine. Languages with nothing to download are always "ready". */
export function useRuntimeState(language: LanguageId): RuntimeState {
  return useSyncExternalStore(subscribe, () => getRuntimeState(language), () => IDLE);
}

/** True for languages whose engine is a download that can fail (everything else is ready from the start). */
export function needsEngineDownload(language: LanguageId): boolean {
  return language === "python" || language === "sql";
}
