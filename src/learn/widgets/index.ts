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
import { RELIABILITY_WIDGETS } from "./reliability";
import { TRAFFIC_WIDGETS } from "./traffic";
import { CACHE_WIDGETS } from "./caching";
import { DATA_WIDGETS } from "./data";
import { SHIP_WIDGETS } from "./ship";
import { OBS_WIDGETS } from "./obs";
import { SECURITY_WIDGETS } from "./security";
import { AI_WIDGETS } from "./ai";

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
  ...RELIABILITY_WIDGETS,
  ...TRAFFIC_WIDGETS,
  ...CACHE_WIDGETS,
  ...DATA_WIDGETS,
  ...SHIP_WIDGETS,
  ...OBS_WIDGETS,
  ...SECURITY_WIDGETS,
  ...AI_WIDGETS,
};

export function getWidget(type: string): WidgetDef | undefined {
  return WIDGETS[type];
}
