import type { WidgetDef, WidgetRegistry } from "@/learn/widget";
import { BITS_WIDGETS } from "./bits";
import { PROGRAMS_WIDGETS } from "./programs";
import { OOP_WIDGETS } from "./oop";
import { PATTERNS_WIDGETS } from "./patterns";
import { COMPUTER_WIDGETS } from "./computer";
import { ASM_WIDGETS } from "./asm";
import { CMEM_WIDGETS } from "./cmem";
import { UNIX_WIDGETS } from "./unix";
import { NET_WIDGETS } from "./net";
import { DSA_WIDGETS } from "./dsa";

/** Every widget a concept lesson can use, keyed by WidgetSpec.type. One registry per module. */
export const WIDGETS: WidgetRegistry = {
  ...BITS_WIDGETS,
  ...COMPUTER_WIDGETS,
  ...ASM_WIDGETS,
  ...CMEM_WIDGETS,
  ...UNIX_WIDGETS,
  ...NET_WIDGETS,
  ...PROGRAMS_WIDGETS,
  ...DSA_WIDGETS,
  ...OOP_WIDGETS,
  ...PATTERNS_WIDGETS,
};

export function getWidget(type: string): WidgetDef | undefined {
  return WIDGETS[type];
}
