import type { WidgetDef, WidgetRegistry } from "@/learn/widget";
import { BITS_WIDGETS } from "./bits";
import { PROGRAMS_WIDGETS } from "./programs";
import { OOP_WIDGETS } from "./oop";
import { PATTERNS_WIDGETS } from "./patterns";

/** Every widget a concept lesson can use, keyed by WidgetSpec.type. One registry per module. */
export const WIDGETS: WidgetRegistry = { ...BITS_WIDGETS, ...PROGRAMS_WIDGETS, ...OOP_WIDGETS, ...PATTERNS_WIDGETS };

export function getWidget(type: string): WidgetDef | undefined {
  return WIDGETS[type];
}
