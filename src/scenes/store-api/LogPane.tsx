"use client";

import React, { useState } from "react";
import { RotateCcw, ScrollText, Trash2 } from "lucide-react";
import { statusTone, timeLabel, TONE_TEXT, type ApiSession, type LogEntry, type Snapshot } from "./session";
import { BTN, Empty, MethodTag, PaneFrame, StatusChip } from "./ui";

/** The request log pane: every call from the console, the shop, the cart and the admin panel. */

const SOURCE_LABEL: Record<LogEntry["source"], string> = {
  console: "console",
  shop: "shop",
  cart: "cart",
  admin: "admin",
  account: "account",
  docs: "docs",
};

function Row({ entry, session, interactive }: { entry: LogEntry; session: ApiSession; interactive: boolean }) {
  const r = entry.result;
  const open = () =>
    session.openInConsole({
      method: entry.req.method,
      path: entry.req.path,
      body: entry.req.body ?? "",
      headers: Object.entries(entry.req.headers)
        .filter(([k]) => !["accept", "content-type", "authorization"].includes(k.toLowerCase()))
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
      auth: Object.keys(entry.req.headers).some((k) => k.toLowerCase() === "authorization"),
      entryId: entry.id,
    });
  return (
    <li className="border-t border-white/[0.06] first:border-t-0">
      <button
        onClick={open}
        disabled={!interactive}
        title="Open in the console"
        className="grid w-full min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-1.5 text-left hover:bg-white/[0.04]"
      >
        <span className="hud-value hud-muted w-[3.6rem] text-[9.5px] tabular-nums">{timeLabel(entry.at)}</span>
        <MethodTag method={entry.req.method} className="w-9" />
        <span className="min-w-0 truncate font-mono text-[10.5px] text-white/85">{entry.req.path}</span>
        <span className="flex items-center gap-1.5">
          <span className="hud-value hidden text-[9.5px] text-white/35 @xs:inline">{r.ms}ms</span>
          <StatusChip status={r.status} withText={false} />
        </span>
        <span className="col-span-4 mt-0.5 flex min-w-0 items-center gap-1.5 pl-[3.6rem] text-[9.5px] text-white/35">
          <span className="rounded bg-white/[0.06] px-1 py-px uppercase tracking-wide">{SOURCE_LABEL[entry.source]}</span>
          {r.ok ? <span className={`truncate ${TONE_TEXT[statusTone(r.status)]} opacity-80`}>{errorLine(entry)}</span> : <span className="truncate text-[#f87171]">{r.problem?.split("\n")[0]}</span>}
        </span>
        {entry.server && (
          <span className="col-span-4 mt-0.5 truncate pl-[3.6rem] font-mono text-[9.5px] text-[#fbbf24]">
            server log: {entry.server.type}: {entry.server.message}
          </span>
        )}
      </button>
    </li>
  );
}

function errorLine(entry: LogEntry): string {
  const body = entry.result.body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const err = (body as Record<string, unknown>).error;
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      return `${String(e.code ?? "")} ${e.message ? "· " + String(e.message) : ""}`.trim();
    }
  }
  const loc = Object.entries(entry.result.headers).find(([k]) => k.toLowerCase() === "location");
  if (loc) return `Location: ${loc[1]}`;
  return "";
}

export function LogPane({ session, snap, interactive, canReset }: { session: ApiSession; snap: Snapshot; interactive: boolean; canReset: boolean }) {
  const [errorsOnly, setErrorsOnly] = useState(false);
  const all = snap.log;
  const counts = { ok: 0, warn: 0, bad: 0 };
  for (const e of all) {
    const t = statusTone(e.result.status);
    if (t === "ok" || t === "info") counts.ok++;
    else if (t === "warn") counts.warn++;
    else counts.bad++;
  }
  const rows = (errorsOnly ? all.filter((e) => statusTone(e.result.status) === "warn" || statusTone(e.result.status) === "bad") : all).slice(0, 60);

  return (
    <PaneFrame
      title="Request log"
      icon={<ScrollText className="h-3.5 w-3.5" />}
      meta={all.length ? `${all.length} request${all.length === 1 ? "" : "s"}` : undefined}
      actions={
        <>
          {canReset && (
            <button disabled={!interactive} onClick={() => session.resetData()} className={BTN} title="Runs your reset_db()">
              <RotateCcw className="h-3 w-3" aria-hidden />
              <span className="hidden @xs:inline">Reset data</span>
            </button>
          )}
          <button disabled={!interactive || all.length === 0} onClick={() => session.clearLog()} className={BTN} aria-label="Clear the log">
            <Trash2 className="h-3 w-3" aria-hidden />
          </button>
        </>
      }
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-3 py-1.5 text-[10px]">
        <span className="hud-value hud-accent">{counts.ok} ok</span>
        <span className={`hud-value ${counts.warn ? "text-[#fbbf24]" : "text-white/35"}`}>{counts.warn} client errors</span>
        <span className={`hud-value ${counts.bad ? "text-[#f87171]" : "text-white/35"}`}>{counts.bad} server errors</span>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-white/55">
          <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} className="h-3 w-3 accent-[#c5ee8a]" />
          errors only
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rows.length === 0 ? (
          <div className="p-3">
            <Empty>{all.length === 0 ? "Every request the shop, the cart or the console sends shows up here with its status colour. Click a row to open it in the console." : "No errors. Nice."}</Empty>
          </div>
        ) : (
          <ul>
            {rows.map((e) => (
              <Row key={e.id} entry={e} session={session} interactive={interactive} />
            ))}
          </ul>
        )}
      </div>
    </PaneFrame>
  );
}
