import type { WidgetRegistry } from "@/learn/widget";
import { Btree, checkBtree } from "./Btree";
import { Indexes, checkIndexes } from "./Indexes";
import { Inverted, checkInverted } from "./Inverted";
import { Brin, checkBrin } from "./Brin";
import { Plan, checkPlan } from "./Plan";
import { Isolation, checkIsolation } from "./Isolation";
import { Pool, checkPool } from "./Pool";
import { Migrate, checkMigrate } from "./Migrate";
import { Replica, checkReplica } from "./Replica";
import { Regions, checkRegions } from "./Regions";
import { Outbox, checkOutbox } from "./Outbox";
import { Workflow, checkWorkflow } from "./Workflow";
import { Boring, checkBoring } from "./Boring";

/** Widgets for the "Databases under load" module. Keys are prefixed with "data-" to stay unique. */
export const DATA_WIDGETS: WidgetRegistry = {
  "data-btree": { Component: Btree, check: checkBtree },
  "data-indexes": { Component: Indexes, check: checkIndexes },
  "data-inverted": { Component: Inverted, check: checkInverted },
  "data-brin": { Component: Brin, check: checkBrin },
  "data-plan": { Component: Plan, check: checkPlan },
  "data-isolation": { Component: Isolation, check: checkIsolation },
  "data-pool": { Component: Pool, check: checkPool },
  "data-migrate": { Component: Migrate, check: checkMigrate },
  "data-replica": { Component: Replica, check: checkReplica },
  "data-regions": { Component: Regions, check: checkRegions },
  "data-outbox": { Component: Outbox, check: checkOutbox },
  "data-workflow": { Component: Workflow, check: checkWorkflow },
  "data-boring": { Component: Boring, check: checkBoring },
};
