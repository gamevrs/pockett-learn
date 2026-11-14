import type { WidgetRegistry } from "@/learn/widget";
import { Boot, checkBoot } from "./Boot";
import { Cache, DBuf, Dma, checkCache, checkDBuf, checkDma } from "./Dma";
import { Debounce, Gpio, checkDebounce, checkGpio } from "./Gpio";
import { Irq, Race, checkIrq, checkRace } from "./Irq";
import { Blink, MemMap, Mcu, checkBlink, checkMcu, checkMemMap } from "./Mcu";
import { Proto, checkProto } from "./Proto";
import { Pwm, checkPwm } from "./Pwm";
import { Reg, Volatile, checkReg, checkVolatile } from "./Reg";
import { Power, Rtos, checkPower, checkRtos } from "./Rtos";
import { Soc, checkSoc } from "./Soc";

/**
 * Widgets for the "Programming chips: firmware, MCUs and SoCs" module. Every key MUST be prefixed "emb-" so it stays unique
 * across the per-module registries. They share one toy microcontroller model in ./sim.ts (pure, checked under Node).
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "emb-name": { Component: Name, check: checkName },
 */
export const EMB_WIDGETS: WidgetRegistry = {
  "emb-mcu": { Component: Mcu, check: checkMcu },
  "emb-blink": { Component: Blink, check: checkBlink },
  "emb-memmap": { Component: MemMap, check: checkMemMap },
  "emb-reg": { Component: Reg, check: checkReg },
  "emb-volatile": { Component: Volatile, check: checkVolatile },
  "emb-gpio": { Component: Gpio, check: checkGpio },
  "emb-debounce": { Component: Debounce, check: checkDebounce },
  "emb-pwm": { Component: Pwm, check: checkPwm },
  "emb-irq": { Component: Irq, check: checkIrq },
  "emb-race": { Component: Race, check: checkRace },
  "emb-proto": { Component: Proto, check: checkProto },
  "emb-dma": { Component: Dma, check: checkDma },
  "emb-dbuf": { Component: DBuf, check: checkDBuf },
  "emb-cache": { Component: Cache, check: checkCache },
  "emb-boot": { Component: Boot, check: checkBoot },
  "emb-rtos": { Component: Rtos, check: checkRtos },
  "emb-power": { Component: Power, check: checkPower },
  "emb-soc": { Component: Soc, check: checkSoc },
};
