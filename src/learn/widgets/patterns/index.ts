import type { WidgetRegistry } from "@/learn/widget";
import { Adapter, checkAdapter } from "./Adapter";
import { checkCommand, Command } from "./Command";
import { checkDecorator, Decorator } from "./Decorator";
import { checkFactory, Factory } from "./Factory";
import { checkObserver, Observer } from "./Observer";
import { checkRoles, Roles } from "./Roles";
import { checkSingleton, Singleton } from "./Singleton";
import { checkSorter, Sorter } from "./Sorter";
import { checkStateMachine, StateMachine } from "./StateMachine";
import { checkStrategy, Strategy } from "./Strategy";

/** Module 4 widgets: design patterns. */
export const PATTERNS_WIDGETS: WidgetRegistry = {
  "pattern-roles": { Component: Roles, check: checkRoles },
  "pattern-sorter": { Component: Sorter, check: checkSorter },
  strategy: { Component: Strategy, check: checkStrategy },
  observer: { Component: Observer, check: checkObserver },
  factory: { Component: Factory, check: checkFactory },
  singleton: { Component: Singleton, check: checkSingleton },
  decorator: { Component: Decorator, check: checkDecorator },
  adapter: { Component: Adapter, check: checkAdapter },
  command: { Component: Command, check: checkCommand },
  "state-machine": { Component: StateMachine, check: checkStateMachine },
};
