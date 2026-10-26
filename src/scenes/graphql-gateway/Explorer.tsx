"use client";

import React, { useMemo, useState } from "react";
import { Lock, Play, ShieldAlert, Terminal, TriangleAlert, UserRound } from "lucide-react";
import { IDENTITIES, prettyJson, type GqlError, type GqlSession, type IdentityId, type LogEntry, type Snapshot } from "./session";
import { FEATURE_INFO, PRESETS, operationNames } from "./operations";
import { AREA, BTN_ON, CHIP, CHIP_ON, Empty, JsonView, Locked, Notice, PaneFrame } from "./ui";

/** The Explorer pane: a GraphiQL-style editor, a variables pane and the response with errors highlighted. */

interface Props {
  session: GqlSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
}

// ───────────────────────── shared response view ─────────────────────────

export function ErrorCard({ error, inspect }: { error: GqlError; inspect: boolean }) {
  const masked = inspect && error.code === "INTERNAL_SERVER_ERROR";
  return (
    <div className="rounded-lg border border-[#f87171]/35 bg-[#f87171]/[0.07] p-2 text-[11px]">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {error.code && <span className="rounded-full border border-[#f87171]/40 bg-[#f87171]/10 px-1.5 py-px font-mono text-[9.5px] font-semibold text-[#fca5a5]">{error.code}</span>}
        {masked && <span className="rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-px text-[9.5px] font-medium text-white/65">masked for the client</span>}
        {error.path.length > 0 && <span className="min-w-0 truncate font-mono text-[10px] text-white/50">at {error.path.join(".")}</span>}
        {error.line !== null && (
          <span className="font-mono text-[10px] text-white/35">
            {error.line}:{error.column ?? 0}
          </span>
        )}
      </div>
      <p className="mt-1 break-words leading-snug text-[#fecaca]">{error.message}</p>
      {masked && <p className="mt-1 leading-snug text-white/45">The real exception stays on the server. Check the Server log in the Lab tab.</p>}
    </div>
  );
}

function countNullAtErrors(errors: GqlError[]): number {
  return new Set(errors.filter((e) => e.path.length > 0).map((e) => e.path.join("."))).size;
}

/** The response of one request: banners, error cards, the data and the raw JSON. */
export function ResultView({ entry, inspect, empty }: { entry: LogEntry | null; inspect: boolean; empty?: string }) {
  if (!entry) return <Empty>{empty ?? "Run an operation to see the response."}</Empty>;
  const r = entry.result;
  if (!r.ok) {
    return (
      <Notice tone="bad">
        <span className="font-medium">No usable response.</span> {r.problem}
      </Notice>
    );
  }
  const partial = r.hasData && r.errors.length > 0;
  const nulls = countNullAtErrors(r.errors);
  return (
    <div className="space-y-2">
      {partial && inspect && (
        <Notice tone="warn">
          Partial result: <span className="font-medium">data</span> arrived, and {nulls || r.errors.length} field{(nulls || r.errors.length) === 1 ? "" : "s"} became null with an entry in <span className="font-mono">errors</span>. A GraphQL server still answers with HTTP 200.
        </Notice>
      )}
      {!r.hasData && r.errors.length > 0 && (
        <Notice tone="bad">
          <span className="font-medium">data is null</span>: the request failed before or while running, so the errors list explains why.
        </Notice>
      )}
      {r.errors.length > 0 && (
        <div className="space-y-1.5">
          <div className="hud-label hud-danger">errors · {r.errors.length}</div>
          {r.errors.slice(0, 6).map((e, i) => (
            <ErrorCard key={i} error={e} inspect={inspect} />
          ))}
          {r.errors.length > 6 && <p className="text-[10.5px] text-white/45">…and {r.errors.length - 6} more errors.</p>}
        </div>
      )}
      {r.hasData && (
        <div>
          <div className="hud-label mb-1">data</div>
          <div className="max-h-[22rem] overflow-auto rounded-md border border-white/[0.08] bg-black/25 p-2 [scrollbar-width:thin]">
            <JsonView text={prettyJson(r.data)} />
          </div>
        </div>
      )}
      <details className="group">
        <summary className="cursor-pointer text-[10.5px] text-white/45 hover:text-white/70">Raw response · {r.size.toLocaleString()} bytes</summary>
        <div className="mt-1 max-h-60 overflow-auto rounded-md border border-white/[0.08] bg-black/25 p-2 [scrollbar-width:thin]">
          <JsonView text={prettyJson(r.raw)} />
        </div>
      </details>
    </div>
  );
}

// ───────────────────────── editor ─────────────────────────

function Editor({ session, snap, unlocked, focus, interactive, fresh }: Props & { fresh: boolean }) {
  const d = snap.draft;
  // the draft is only read when this editor mounts (it remounts on every new draft nonce)
  const [initial] = useState(() => {
    if (d.query) return { query: d.query, variables: d.variables, operationName: d.operationName };
    const first = PRESETS.find((p) => unlocked.has(p.feature)) ?? PRESETS[0];
    return { query: first.query, variables: first.variables ? JSON.stringify(first.variables, null, 2) : "", operationName: "" };
  });
  const [query, setQuery] = useState(initial.query);
  const [variables, setVariables] = useState(initial.variables);
  const [opName, setOpName] = useState(initial.operationName);
  const [localProblem, setLocalProblem] = useState<string | null>(null);

  const varsOn = unlocked.has("gql-variables");
  const names = useMemo(() => operationNames(query), [query]);
  const activeOp = names.includes(opName) ? opName : (names[0] ?? "");
  const entry = snap.log.find((e) => e.source === "explorer") ?? null;

  const run = () => {
    setLocalProblem(null);
    let vars: Record<string, unknown> | null = null;
    if (varsOn && variables.trim()) {
      try {
        const parsed: unknown = JSON.parse(variables);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Variables must be a JSON object, like {\"id\": \"1\"}.");
        vars = parsed as Record<string, unknown>;
      } catch (err) {
        setLocalProblem(`The variables pane is not valid JSON, so nothing was sent. ${(err as Error).message}`);
        return;
      }
    }
    session.run({ query, variables: vars, operationName: varsOn && activeOp ? activeOp : null }, "explorer");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  };

  const loadPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setLocalProblem(null);
    setQuery(p.query);
    setVariables(p.variables ? JSON.stringify(p.variables, null, 2) : "");
    setOpName("");
  };

  const available = PRESETS.filter((p) => unlocked.has(p.feature));
  const lockedCount = PRESETS.length - available.length;
  const preset = PRESETS.find((p) => p.query === query);
  const idOn = unlocked.has("gql-identity");
  const who = IDENTITIES.find((i) => i.id === snap.identity) ?? IDENTITIES[0];

  return (
    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:thin]">
      {/* identity */}
      {idOn ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="hud-label flex shrink-0 items-center gap-1" htmlFor="gql-identity">
            <UserRound className="h-3 w-3 text-[#c5ee8a]" aria-hidden /> Identity
          </label>
          <select
            id="gql-identity"
            value={snap.identity}
            onChange={(e) => session.setIdentity(e.target.value as IdentityId)}
            className="h-7 min-w-0 flex-1 rounded-md border border-white/12 bg-[#141414] px-2 text-[11px] text-white outline-none focus:border-[#c5ee8a]/60"
          >
            {IDENTITIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
                {i.role ? ` · ${i.role.toLowerCase()}` : ""}
              </option>
            ))}
          </select>
          <code className="hidden max-w-full truncate rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-white/50 @md:block">
            {who.token ? `Authorization: Bearer ${who.token}` : "no Authorization header"}
          </code>
          {fresh && <span className="h-1.5 w-1.5 rounded-full bg-[#c5ee8a]" aria-label="new" />}
        </div>
      ) : (
        <div data-locked="" className={`flex items-center gap-2 rounded-lg border border-dashed px-2.5 py-1.5 ${focus === "gql-identity" ? "pulse-ring border-[#c5ee8a]/60" : "border-white/12"}`}>
          <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
          <span className="hud-label min-w-0 flex-1 truncate">Identity · who is asking</span>
          <span className="hud-label shrink-0 text-white/30">L5</span>
        </div>
      )}

      {/* presets */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {available.map((p) => (
            <button key={p.id} onClick={() => loadPreset(p.id)} className={`${CHIP} ${preset?.id === p.id ? CHIP_ON : ""}`} disabled={!interactive}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10.5px] leading-snug text-white/45">
          {preset ? preset.note : "Edit freely: this is your own operation."}
          {lockedCount > 0 && <span className="text-white/30"> {lockedCount} more starter operations unlock with later lessons.</span>}
        </p>
      </div>

      {/* operation */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h4 className="hud-label flex-1">Operation</h4>
          {varsOn && names.length > 1 && (
            <label className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-white/50">
              run
              <select
                value={activeOp}
                onChange={(e) => setOpName(e.target.value)}
                className="h-6 min-w-0 max-w-[10rem] rounded-md border border-white/12 bg-[#141414] px-1.5 font-mono text-[10.5px] text-white outline-none focus:border-[#c5ee8a]/60"
              >
                {names.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <textarea
          aria-label="GraphQL operation"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          rows={Math.min(14, Math.max(6, query.split("\n").length + 1))}
          className={AREA}
          disabled={!interactive}
        />
      </div>

      {/* variables */}
      {varsOn ? (
        <div>
          <h4 className="hud-label mb-1">Variables (JSON)</h4>
          <textarea
            aria-label="Variables as JSON"
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            rows={Math.min(8, Math.max(2, variables.split("\n").length))}
            placeholder='{ "id": "1" }'
            className={AREA}
            disabled={!interactive}
          />
        </div>
      ) : (
        <div data-locked="" className={`flex items-center gap-2 rounded-lg border border-dashed px-2.5 py-1.5 ${focus === "gql-variables" ? "pulse-ring border-[#c5ee8a]/60" : "border-white/12"}`}>
          <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
          <span className="hud-label min-w-0 flex-1 truncate">Variables &amp; operation picker</span>
          <span className="hud-label shrink-0 text-white/30">L3</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={run} className={BTN_ON} disabled={!interactive || !session.hasExecute}>
          <Play className="h-3 w-3" aria-hidden /> Run
        </button>
        <span className="hidden text-[10.5px] text-white/35 @sm:inline">Ctrl/⌘ + Enter</span>
        {entry && entry.result.ok && (
          <span className="hud-value ml-auto text-[10.5px] text-white/50">
            {entry.result.ms} ms · {entry.result.size.toLocaleString()} B
          </span>
        )}
        {!session.hasExecute && <span className="ml-auto text-[10.5px] text-[#fbbf24]">Define execute(request) to answer requests.</span>}
      </div>

      {localProblem && <Notice tone="warn">{localProblem}</Notice>}

      <ResultView entry={entry} inspect={unlocked.has("gql-errors")} />
    </div>
  );
}

export function ExplorerPane(props: Props & { fresh: ReadonlySet<string> }) {
  const { snap, unlocked, focus, fresh } = props;
  const on = unlocked.has("gql-explorer");
  const info = FEATURE_INFO["gql-explorer"];
  const last = snap.log.find((e) => e.source === "explorer");
  return (
    <PaneFrame
      title="Explorer"
      icon={<Terminal className="h-3.5 w-3.5" aria-hidden />}
      hint="Write a GraphQL operation, press Run, and your execute() answers it."
      meta={last ? (last.result.errors.length ? `${last.result.errors.length} error${last.result.errors.length === 1 ? "" : "s"}` : "ok") : undefined}
      actions={on && last?.result.errors.length ? <TriangleAlert className="h-3.5 w-3.5 text-[#f87171]" aria-hidden /> : on ? undefined : <ShieldAlert className="h-3.5 w-3.5 text-white/30" aria-hidden />}
    >
      {on ? (
        <Editor key={snap.draft.nonce} {...props} fresh={fresh.has("gql-identity")} />
      ) : (
        <div className="p-2.5">
          <Locked title={info.title} need={info.need} lesson={info.lesson} spot={focus === "gql-explorer"}>
            <div className="mt-2.5 space-y-1.5" aria-hidden>
              <div className="h-16 rounded-md border border-dashed border-white/10 bg-white/[0.02] p-2 font-mono text-[10px] leading-snug text-white/20">
                {"{"}
                <br />
                &nbsp;&nbsp;shopName
                <br />
                {"}"}
              </div>
              <div className="h-1.5 w-1/3 rounded-sm bg-white/[0.06]" />
              <div className="h-12 rounded-md border border-dashed border-white/10" />
            </div>
          </Locked>
        </div>
      )}
    </PaneFrame>
  );
}
