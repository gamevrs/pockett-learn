import type { WidgetRegistry } from "@/learn/widget";
import { ClassFactory, checkFactory } from "./ClassFactory";
import { AccountSandbox, checkAccount } from "./AccountSandbox";
import { AbstractionHood, checkHood } from "./AbstractionHood";
import { InheritanceTree, checkTree } from "./InheritanceTree";
import { PolyDispatch, checkDispatch } from "./PolyDispatch";
import { ComposeBuilder, checkCompose } from "./ComposeBuilder";
import { SpotThePillar, checkSpot } from "./SpotThePillar";

/** Module 3 widgets: object-oriented programming. */
export const OOP_WIDGETS: WidgetRegistry = {
  "oop-factory": { Component: ClassFactory, check: checkFactory },
  "oop-account": { Component: AccountSandbox, check: checkAccount },
  "oop-hood": { Component: AbstractionHood, check: checkHood },
  "oop-tree": { Component: InheritanceTree, check: checkTree },
  "oop-dispatch": { Component: PolyDispatch, check: checkDispatch },
  "oop-compose": { Component: ComposeBuilder, check: checkCompose },
  "oop-spot": { Component: SpotThePillar, check: checkSpot },
};
