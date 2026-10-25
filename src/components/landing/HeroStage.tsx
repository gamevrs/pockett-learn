"use client";

import React, { useState } from "react";
import { garage } from "@/content/projects/garage";
import type { ProgramHandle } from "@/engine/program";
import { DEMO_PROGRAMS } from "@/scenes/demos";
import { StageShell } from "@/components/stage/StageShell";

const ALL = new Set(garage.features.map((f) => f.id));

/** The finished Turbo Garage, driving itself. No Python is loaded on the landing page. */
export function HeroStage() {
  // A static program holds no resources, so there is nothing to dispose.
  const [program] = useState<ProgramHandle>(() => DEMO_PROGRAMS.garage());

  return (
    <StageShell project={garage} program={program} unlocked={ALL} autoplayScene interactive hideControls className="!rounded-none !border-0" />
  );
}
