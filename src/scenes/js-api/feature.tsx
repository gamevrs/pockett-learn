"use client";

import React from "react";
import type { DocklineDriver } from "./driver";
import type { Snap } from "./state";
import { Empty, Locked, Panel } from "./ui";

/** What every panel receives. */
export interface PanelCtx {
  snap: Snap;
  driver: DocklineDriver;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  fresh: ReadonlySet<string>;
  interactive: boolean;
  autoplay: boolean;
}

/** A feature's panel: a dashed blueprint until its lesson is passed, a frame once it is live. */
export function Feature({
  id,
  ctx,
  meta,
  actions,
  className = "",
  bodyClassName = "",
  children,
}: {
  id: string;
  ctx: PanelCtx;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  if (!ctx.unlocked.has(id)) return <Locked id={id} spot={ctx.focus === id} className={className} />;
  const live = ctx.snap.hasProgram;
  return (
    <Panel
      key={ctx.fresh.has(id) ? `${id}:fresh` : id}
      id={id}
      meta={live ? meta : undefined}
      actions={live ? actions : undefined}
      focus={ctx.focus === id}
      flash={ctx.fresh.has(id)}
      className={className}
      bodyClassName={bodyClassName}
    >
      {live ? children : <Empty>Press Run and your API starts taking traffic here.</Empty>}
    </Panel>
  );
}

/** A hook this panel needs is missing: say which, instead of drawing nothing. */
export function NeedsHook({ ctx, hook, children }: { ctx: PanelCtx; hook: string; children: React.ReactNode }) {
  if (ctx.driver.program?.hasHook(hook)) return <>{children}</>;
  return (
    <Empty>
      Waiting for <code className="rounded bg-white/[0.08] px-1 py-px font-mono text-[10.5px] text-white/85">{hook}</code> in your program.
    </Empty>
  );
}
