import type { WidgetRegistry } from "@/learn/widget";
import { Backoff, checkBackoff } from "./Backoff";
import { Breaker, checkBreaker } from "./Breaker";
import { Bulkhead, checkBulkhead } from "./Bulkhead";
import { Client, checkClient } from "./Client";
import { Deadline, checkDeadline } from "./Deadline";
import { Degrade, checkDegrade } from "./Degrade";
import { Hang, checkHang } from "./Hang";
import { Idem, checkIdem } from "./Idem";
import { SlowDead, checkSlowDead } from "./SlowDead";
import { Sort, checkSort } from "./Sort";
import { Storm, checkStorm } from "./Storm";

/** Widgets for the "Failure is normal" (reliability) module. Keys are prefixed with "rel-". */
export const RELIABILITY_WIDGETS: WidgetRegistry = {
  "rel-slowdead": { Component: SlowDead, check: checkSlowDead },
  "rel-hang": { Component: Hang, check: checkHang },
  "rel-deadline": { Component: Deadline, check: checkDeadline },
  "rel-sort": { Component: Sort, check: checkSort },
  "rel-backoff": { Component: Backoff, check: checkBackoff },
  "rel-storm": { Component: Storm, check: checkStorm },
  "rel-idem": { Component: Idem, check: checkIdem },
  "rel-breaker": { Component: Breaker, check: checkBreaker },
  "rel-bulkhead": { Component: Bulkhead, check: checkBulkhead },
  "rel-degrade": { Component: Degrade, check: checkDegrade },
  "rel-client": { Component: Client, check: checkClient },
};
