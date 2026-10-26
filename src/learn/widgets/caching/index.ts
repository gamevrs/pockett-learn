import type { WidgetRegistry } from "@/learn/widget";
import { Latency, checkLatency } from "./Latency";
import { Patterns, checkPatterns } from "./Patterns";
import { Ttl, checkTtl } from "./Ttl";
import { Evict, checkEvict } from "./Evict";
import { Race, checkRace } from "./Race";
import { Stampede, checkStampede } from "./Stampede";
import { HitRate, checkHitRate } from "./HitRate";
import { Http, checkHttp } from "./Http";
import { Cdn, checkCdn } from "./Cdn";
import { Decide, checkDecide } from "./Decide";

/** Widgets for the "Remember the answer" (caching) module. Keys are prefixed with "cache-". */
export const CACHE_WIDGETS: WidgetRegistry = {
  "cache-latency": { Component: Latency, check: checkLatency },
  "cache-patterns": { Component: Patterns, check: checkPatterns },
  "cache-ttl": { Component: Ttl, check: checkTtl },
  "cache-evict": { Component: Evict, check: checkEvict },
  "cache-race": { Component: Race, check: checkRace },
  "cache-stampede": { Component: Stampede, check: checkStampede },
  "cache-hitrate": { Component: HitRate, check: checkHitRate },
  "cache-http": { Component: Http, check: checkHttp },
  "cache-cdn": { Component: Cdn, check: checkCdn },
  "cache-decide": { Component: Decide, check: checkDecide },
};
