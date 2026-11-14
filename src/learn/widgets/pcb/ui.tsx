"use client";

import type React from "react";

/** Shared kit for the PCB widgets: the computer module's controls, the AI module's slider and meter, and the GPU module's wrapping Seg. */
export { Btn, Caption, Field, Note, Readout, Stepper } from "../computer/ui";
export { Meter, Slider } from "../ai/ui";
export { Seg, ORANGE, BLUE } from "../gpu/ui";

/** A one-line "this is a toy model" notice that every simulator shows. */
export function ToyNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-center text-xs text-ink-3">{children}</p>;
}
