"use client";

import React from "react";
import type { PanelCtx } from "./feature";
import { AccessGuard, IdempotencyLedger, RateLimitBuckets, RiderTokens } from "./GuardPanels";
import { GraphConsole, QueryParser, TestLab } from "./ProofPanels";
import { BreakerPanel, CachePanel, RetryPanel, ShutdownPanel } from "./ResiliencePanels";
import { BadRequestInspector, ErrorDashboard, ListExplorer } from "./ResourcePanels";
import { StationBoard } from "./StationBoard";
import { Lanes, RequestLog, RouteMap, StructuredLog } from "./TrafficPanels";

/** The five tabs. Panels are laid out in a container-query grid: two columns once there is room. */

const GRID = "@container grid grid-cols-1 content-start items-start gap-2 @2xl:grid-cols-2";
const FULL = "min-w-0 @2xl:col-span-2";
const HALF = "min-w-0";

export function TrafficTab({ ctx }: { ctx: PanelCtx }) {
  return (
    <div className={GRID}>
      <div className={FULL}><RequestLog ctx={ctx} /></div>
      <div className={HALF}><Lanes ctx={ctx} /></div>
      <div className={HALF}><RouteMap ctx={ctx} /></div>
      <div className={FULL}><StructuredLog ctx={ctx} /></div>
    </div>
  );
}

export function ResourcesTab({ ctx }: { ctx: PanelCtx }) {
  return (
    <div className={GRID}>
      <div className={FULL}><StationBoard ctx={ctx} /></div>
      <div className={HALF}><BadRequestInspector ctx={ctx} /></div>
      <div className={HALF}><ErrorDashboard ctx={ctx} /></div>
      <div className={FULL}><ListExplorer ctx={ctx} /></div>
    </div>
  );
}

export function GuardTab({ ctx }: { ctx: PanelCtx }) {
  return (
    <div className={GRID}>
      <div className={FULL}><RiderTokens ctx={ctx} /></div>
      <div className={FULL}><AccessGuard ctx={ctx} /></div>
      <div className={HALF}><IdempotencyLedger ctx={ctx} /></div>
      <div className={HALF}><RateLimitBuckets ctx={ctx} /></div>
    </div>
  );
}

export function ResilienceTab({ ctx }: { ctx: PanelCtx }) {
  return (
    <div className={GRID}>
      <div className={HALF}><CachePanel ctx={ctx} /></div>
      <div className={HALF}><ShutdownPanel ctx={ctx} /></div>
      <div className={FULL}><RetryPanel ctx={ctx} /></div>
      <div className={FULL}><BreakerPanel ctx={ctx} /></div>
    </div>
  );
}

export function ProofTab({ ctx }: { ctx: PanelCtx }) {
  return (
    <div className={GRID}>
      <div className={FULL}><TestLab ctx={ctx} /></div>
      <div className={HALF}><QueryParser ctx={ctx} /></div>
      <div className={HALF}><GraphConsole ctx={ctx} /></div>
    </div>
  );
}
