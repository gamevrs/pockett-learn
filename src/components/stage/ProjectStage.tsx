"use client";

import React from "react";
import type { Project } from "@/engine/types";
import { languageOf } from "@/engine/types";
import { usesCodeFrame } from "@/engine/frame/protocol";
import { StageFrame } from "./StageFrame";
import { StageShell } from "./StageShell";

type StageProps = React.ComponentProps<typeof StageShell>;

/**
 * The stage for a project's live program. Python and JavaScript programs run in the code frame, so their stage is drawn there
 * (StageFrame); every other language runs here in the page and uses the stage directly.
 */
export function ProjectStage({ project, ...rest }: Omit<StageProps, "project" | "hasAudio"> & { project: Project }) {
  if (usesCodeFrame(languageOf(project))) return <StageFrame project={project} {...rest} />;
  return <StageShell project={project} {...rest} />;
}
