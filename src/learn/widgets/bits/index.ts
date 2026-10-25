import type { WidgetRegistry } from "@/learn/widget";
import { Bits, checkBits } from "./Bits";
import { Counter, checkCounter } from "./Counter";
import { Nibbles, checkNibbles } from "./Nibbles";
import { SizeScale, checkSizeScale } from "./SizeScale";
import { TextBytes, checkTextBytes } from "./TextBytes";
import { RgbMixer, checkRgbMixer } from "./RgbMixer";
import { PixelGrid, checkPixelGrid } from "./PixelGrid";
import { LogicGate, checkLogicGate } from "./LogicGate";
import { HalfAdder, checkHalfAdder } from "./HalfAdder";

/** Module 1 widgets: how computers store information. */
export const BITS_WIDGETS: WidgetRegistry = {
  bits: { Component: Bits, check: checkBits },
  counter: { Component: Counter, check: checkCounter },
  nibbles: { Component: Nibbles, check: checkNibbles },
  sizes: { Component: SizeScale, check: checkSizeScale },
  "text-bytes": { Component: TextBytes, check: checkTextBytes },
  rgb: { Component: RgbMixer, check: checkRgbMixer },
  pixels: { Component: PixelGrid, check: checkPixelGrid },
  gate: { Component: LogicGate, check: checkLogicGate },
  "half-adder": { Component: HalfAdder, check: checkHalfAdder },
};
