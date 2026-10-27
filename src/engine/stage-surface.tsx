"use client";

import { createContext, useContext } from "react";

/**
 * Where a stage is shown. Only the lesson workspace has Run and Submit buttons; the project hub and
 * the landing page show the same scenes without them, so hints like "Press Run" must not appear there.
 */
export type StageSurface = "workspace" | "hub" | "landing";

const StageSurfaceContext = createContext<StageSurface>("workspace");

export const StageSurfaceProvider = StageSurfaceContext.Provider;

export function useStageSurface(): StageSurface {
  return useContext(StageSurfaceContext);
}
