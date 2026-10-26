import type { WidgetRegistry } from "@/learn/widget";
import { Bucket, checkBucket } from "./Bucket";
import { checkDelivery, DeliverySim } from "./DeliverySim";
import { checkDlq, DlqSim } from "./DlqSim";
import { checkLimiter, Limiter } from "./Limiter";
import { checkLittles, Littles } from "./Littles";
import { checkQueue, QueueSim } from "./QueueSim";
import { checkShared, Shared } from "./Shared";
import { checkShed, ShedSim } from "./ShedSim";
import { checkUtil, Util } from "./Util";

/** Widgets for the "Too much at once" (traffic) module. Keys are prefixed with "trf-". */
export const TRAFFIC_WIDGETS: WidgetRegistry = {
  "trf-littles": { Component: Littles, check: checkLittles },
  "trf-util": { Component: Util, check: checkUtil },
  "trf-limiter": { Component: Limiter, check: checkLimiter },
  "trf-bucket": { Component: Bucket, check: checkBucket },
  "trf-shared": { Component: Shared, check: checkShared },
  "trf-queue": { Component: QueueSim, check: checkQueue },
  "trf-shed": { Component: ShedSim, check: checkShed },
  "trf-dlq": { Component: DlqSim, check: checkDlq },
  "trf-delivery": { Component: DeliverySim, check: checkDelivery },
};
