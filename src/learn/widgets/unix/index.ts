import type { WidgetRegistry } from "@/learn/widget";
import { Terminal, checkTerminal } from "./Terminal";
import { Paths, checkPaths } from "./Paths";
import { Perms, checkPerms } from "./Perms";
import { Scheduler, checkScheduler } from "./Scheduler";
import { Kernel, checkKernel } from "./Kernel";
import { Procs, checkProcs } from "./Procs";

/** Widgets for the "Operating systems and the Unix shell" module. Keys are prefixed with "unix-" to stay unique. */
export const UNIX_WIDGETS: WidgetRegistry = {
  "unix-terminal": { Component: Terminal, check: checkTerminal },
  "unix-paths": { Component: Paths, check: checkPaths },
  "unix-perms": { Component: Perms, check: checkPerms },
  "unix-scheduler": { Component: Scheduler, check: checkScheduler },
  "unix-kernel": { Component: Kernel, check: checkKernel },
  "unix-procs": { Component: Procs, check: checkProcs },
};
