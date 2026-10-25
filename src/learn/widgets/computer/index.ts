import type { WidgetRegistry } from "@/learn/widget";
import { Bus, checkBus } from "./Bus";
import { Cache, checkCache } from "./Cache";
import { checkClock, Clock } from "./Clock";
import { checkCpu, Cpu } from "./Cpu";
import { checkInterrupts, Interrupts } from "./Interrupts";
import { checkJourney, Journey } from "./Journey";
import { checkLatency, Latency } from "./Latency";
import { checkMachine, Machine } from "./Machine";
import { checkMemory, Memory } from "./Memory";
import { checkPower, Power } from "./Power";

/** Widgets for the "Inside the computer" module. Keys are prefixed with "computer-" to stay unique. */
export const COMPUTER_WIDGETS: WidgetRegistry = {
  "computer-machine": { Component: Machine, check: checkMachine },
  "computer-memory": { Component: Memory, check: checkMemory },
  "computer-power": { Component: Power, check: checkPower },
  "computer-cpu": { Component: Cpu, check: checkCpu },
  "computer-clock": { Component: Clock, check: checkClock },
  "computer-bus": { Component: Bus, check: checkBus },
  "computer-latency": { Component: Latency, check: checkLatency },
  "computer-cache": { Component: Cache, check: checkCache },
  "computer-interrupts": { Component: Interrupts, check: checkInterrupts },
  "computer-journey": { Component: Journey, check: checkJourney },
};
