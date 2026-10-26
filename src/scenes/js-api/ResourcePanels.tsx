"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Send } from "lucide-react";
import { createStation } from "./actions";
import { req } from "./access";
import { Feature, NeedsHook, type PanelCtx } from "./feature";
import { KLASSES, type Exchange } from "./state";
import { asNum, asStr, isRecord, problemSlug, readProblem } from "./types";
import { BTN, BTN_ON, Chip, Code, INPUT, KLASS_COLOR, Notice } from "./ui";

/** L6-L8: the bad-request inspector, the error dashboard and the list explorer. */

// ───────────────────────── L6 bad-request inspector ─────────────────────────

const PRESETS: { label: string; values: [string, string, string] }[] = [
  { label: "Valid", values: ["Pier Nine", "waterfront", "12"] },
  { label: "No name", values: ["", "central", "12"] },
  { label: "Bad zone", values: ["Pier Nine", "moon", "12"] },
  { label: "Capacity −3", values: ["Pier Nine", "park", "-3"] },
  { label: "Capacity “twelve”", values: ["Pier Nine", "park", "twelve"] },
];

export function BadRequestInspector({ ctx }: { ctx: PanelCtx }) {
  const [name, setName] = useState("Pier Nine");
  const [zone, setZone] = useState("moon");
  const [capacity, setCapacity] = useState("twelve");
  const [result, setResult] = useState<Exchange | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const n = Number(capacity);
    const ex = await createStation(ctx.driver, { name, zone, capacity: capacity.trim() !== "" && Number.isFinite(n) ? n : capacity });
    setResult(ex);
    setBusy(false);
  };
  const problem = result ? readProblem(result.body) : null;
  const errors = problem?.errors ?? [];
  const errFor = (f: string) => errors.filter((e) => e.field === f);
  const loose = errors.filter((e) => !["name", "zone", "capacity"].includes(e.field));
  const created = result?.status === 201 && isRecord(result.body);

  const field = (id: string, label: string, value: string, set: (v: string) => void) => {
    const es = errFor(id);
    return (
      <label className="block min-w-0">
        <span className="hud-label !text-white/65">{label}</span>
        <input
          value={value}
          onChange={(e) => set(e.target.value)}
          aria-invalid={es.length > 0}
          aria-describedby={`dl-err-${id}`}
          spellCheck={false}
          className={`${INPUT} mt-0.5 w-full ${es.length ? "!border-[#f87171]/70" : ""}`}
        />
        <span id={`dl-err-${id}`} className="mt-0.5 block min-h-[14px] text-[10.5px] leading-tight text-[#fca5a5]">
          {es.map((e) => e.message).join(" · ")}
        </span>
      </label>
    );
  };

  return (
    <Feature id="api-validation" ctx={ctx} meta="POST /stations">
      <NeedsHook ctx={ctx} hook="handle">
        <div className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={BTN}
                onClick={() => {
                  setName(p.values[0]);
                  setZone(p.values[1]);
                  setCapacity(p.values[2]);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <form
            className="mt-2 grid grid-cols-1 gap-x-2 @sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)]"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {field("name", "Name", name, setName)}
            {field("zone", "Zone", zone, setZone)}
            {field("capacity", "Capacity", capacity, setCapacity)}
            <div className="col-span-full flex items-center gap-2">
              <button type="submit" disabled={busy || !ctx.interactive} className={BTN_ON} aria-label="Send the new station to the API">
                <Send className="h-3 w-3" aria-hidden /> Create station
              </button>
              {result && <Code ex={result} />}
              {problem && <span className="min-w-0 truncate text-[11px] text-white/75">{problem.title}</span>}
              {created && <span className="min-w-0 truncate text-[11px] text-[#e0f6c1]">Created {asStr((result.body as Record<string, unknown>).id)} · {asStr((result.body as Record<string, unknown>).name)}</span>}
            </div>
          </form>
          {result && result.outcome !== "ok" && (
            <div className="mt-2">
              <Notice tone="bad">No usable reply from handle().</Notice>
            </div>
          )}
          {result && result.status >= 400 && !problem && (
            <div className="mt-2">
              <Notice tone="warn">The body is not a problem document yet. Try the Error dashboard lesson’s shape.</Notice>
            </div>
          )}
          {problem && errors.length === 0 && problem.detail && <p className="mt-2 text-[11px] text-white/75">{problem.detail}</p>}
          {loose.length > 0 && (
            <ul className="mt-2 space-y-1">
              {loose.map((e, i) => (
                <li key={i} className="text-[11px] text-[#fca5a5]">
                  <code className="font-mono">{e.field}</code>: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L7 error dashboard ─────────────────────────

export function ErrorDashboard({ ctx }: { ctx: PanelCtx }) {
  const { snap } = ctx;
  const total = Math.max(1, snap.total);
  const types = Object.entries(snap.problemTypes).sort((a, b) => b[1] - a[1]);
  const maxType = Math.max(1, ...types.map(([, n]) => n));
  const last = [...snap.problems].reverse().slice(0, 3);
  return (
    <Feature id="api-problems" ctx={ctx} meta={`${snap.counts["4xx"] + snap.counts["5xx"]} errors of ${snap.total}`}>
      <NeedsHook ctx={ctx} hook="handle">
        <div className="px-3 py-2">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={KLASSES.map((k) => `${snap.counts[k]} ${k}`).join(", ")}>
            {KLASSES.map((k) => (
              <span key={k} style={{ width: `${(snap.counts[k] / total) * 100}%`, background: KLASS_COLOR[k] }} />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {KLASSES.map((k) => (
              <span key={k} className="flex items-center gap-1 text-[11px] text-white/80">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: KLASS_COLOR[k] }} />
                <span className="font-mono">{k}</span>
                <span className="hud-value text-[11px]">{snap.counts[k]}</span>
              </span>
            ))}
          </div>

          <div className="hud-label mt-3 !text-white/60">By problem type</div>
          {types.length === 0 ? (
            <p className="mt-1 text-[11px] text-white/60">No errors yet. Bad input, missing resources and misses show up here.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {types.slice(0, 6).map(([slug, n]) => (
                <li key={slug} className="grid min-w-0 grid-cols-[minmax(0,1fr)_4rem_1.6rem] items-center gap-x-2">
                  <span className={`min-w-0 truncate font-mono text-[11px] ${slug === "no problem document" ? "text-[#fde68a]" : "text-white/90"}`}>{slug}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
                    <span className="block h-full rounded-full bg-[#fbbf24]" style={{ width: `${(n / maxType) * 100}%` }} />
                  </span>
                  <span className="hud-value text-right text-[10px] text-white/80">{n}</span>
                </li>
              ))}
            </ul>
          )}

          {last.length > 0 && <div className="hud-label mt-3 !text-white/60">Latest problem documents</div>}
          <ul className="mt-1 space-y-1.5">
            {last.map(({ ex, doc }) => {
              const typeOk = (ex.headers["content-type"] ?? "").includes("application/problem+json");
              return (
                <li key={ex.id} className="rounded-md bg-white/[0.05] px-2.5 py-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <Chip tone={doc.status >= 500 ? "bad" : "warn"}>{doc.status}</Chip>
                    <span className="min-w-0 truncate text-[11.5px] font-medium text-white">{doc.title || problemSlug(doc.type)}</span>
                    <Chip tone={typeOk ? "ok" : "warn"} title={ex.headers["content-type"] ?? "no content-type"}>
                      {typeOk ? "problem+json" : "not problem+json"}
                    </Chip>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/75">{doc.detail}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-white/60">
                    {doc.instance} · requestId {doc.requestId || "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </NeedsHook>
    </Feature>
  );
}

// ───────────────────────── L8 list explorer ─────────────────────────

const PAGE = 3;

interface OffsetPage {
  items: { id: string; name: string; zone: string; capacity: number }[];
  total: number | null;
  offset: number;
  ex: Exchange;
}

interface CursorPage {
  items: { id: string; kind: string; status: string; stationId: string }[];
  next: string | null;
  after: string | null;
  ex: Exchange;
}

export function ListExplorer({ ctx }: { ctx: PanelCtx }) {
  const { driver } = ctx;
  const [page, setPage] = useState<OffsetPage | null>(null);
  const [cursor, setCursor] = useState<CursorPage | null>(null);
  const alive = useRef(true);
  const source = ctx.autoplay ? "auto" : "user";

  const loadOffset = async (offset: number) => {
    const ex = await driver.send(req("GET", `/stations?limit=${PAGE}&offset=${offset}`), "page", source);
    if (!alive.current) return;
    const b = ex.body;
    const items = isRecord(b) && Array.isArray(b.items) ? (b.items.filter(isRecord) as unknown as OffsetPage["items"]) : [];
    const total = isRecord(b) && isRecord(b.page) && typeof b.page.total === "number" ? b.page.total : null;
    setPage({ items, total, offset, ex });
  };
  const loadCursor = async (after: string | null) => {
    const ex = await driver.send(req("GET", `/bikes?limit=5${after ? `&after=${encodeURIComponent(after)}` : ""}`), "page", source);
    if (!alive.current) return;
    const b = ex.body;
    const items = isRecord(b) && Array.isArray(b.items) ? (b.items.filter(isRecord) as unknown as CursorPage["items"]) : [];
    setCursor({ items, next: isRecord(b) && typeof b.next === "string" ? b.next : null, after, ex });
  };

  const enabled = ctx.unlocked.has("api-paging") && ctx.snap.hasProgram;
  const pageRef = useRef(page);
  const cursorRef = useRef(cursor);
  useEffect(() => {
    pageRef.current = page;
    cursorRef.current = cursor;
  });
  useEffect(() => {
    alive.current = true;
    if (!enabled) return;
    void loadOffset(0);
    void loadCursor(null);
    // in autoplay, turn the pages by themselves
    const t = ctx.autoplay
      ? setInterval(() => {
          const p = pageRef.current;
          const c = cursorRef.current;
          const nextOffset = p && p.total !== null && p.offset + PAGE < p.total ? p.offset + PAGE : 0;
          void loadOffset(nextOffset);
          void loadCursor(c?.next ?? null);
        }, 4200)
      : undefined;
    return () => {
      alive.current = false;
      if (t) clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, driver, ctx.autoplay]);

  const from = page ? page.offset + 1 : 0;
  const to = page ? page.offset + page.items.length : 0;
  return (
    <Feature id="api-paging" ctx={ctx} meta="offset · cursor">
      <NeedsHook ctx={ctx} hook="handle">
        <div className="grid min-w-0 gap-3 px-3 py-2 @lg:grid-cols-2">
          <section aria-label="Offset pages" className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="hud-label !text-white/70">Stations · offset</span>
              {page && <Code ex={page.ex} />}
              <span className="ml-auto flex gap-1">
                <button type="button" className={BTN} aria-label="Previous page" disabled={!page || page.offset === 0} onClick={() => page && void loadOffset(Math.max(0, page.offset - PAGE))}>
                  <ChevronLeft className="h-3 w-3" aria-hidden />
                </button>
                <button type="button" className={BTN} aria-label="Next page" disabled={!page || page.total === null || page.offset + PAGE >= page.total} onClick={() => page && void loadOffset(page.offset + PAGE)}>
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </button>
              </span>
            </div>
            {page && page.items.length > 0 ? (
              <>
                <ul className="mt-1.5 space-y-1">
                  {page.items.map((s) => (
                    <li key={s.id} className="flex min-w-0 items-center gap-2 rounded bg-white/[0.05] px-2 py-1 text-[11px]">
                      <span className="font-mono text-white/65">{asStr(s.id)}</span>
                      <span className="min-w-0 flex-1 truncate text-white/95">{asStr(s.name)}</span>
                      <span className="shrink-0 text-white/65">cap {asNum(s.capacity)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-mono text-[10.5px] text-white/75">
                  {from}–{to} of {page.total ?? "?"} <span className="text-white/60">· page.total from your response</span>
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] text-white/60">{page ? "No items in this page." : "Loading…"}</p>
            )}
          </section>
          <section aria-label="Cursor pages" className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="hud-label !text-white/70">Bikes · cursor</span>
              {cursor && <Code ex={cursor.ex} />}
              <span className="ml-auto flex gap-1">
                <button type="button" className={BTN} aria-label="Start over" onClick={() => void loadCursor(null)}>
                  <RotateCcw className="h-3 w-3" aria-hidden />
                </button>
                <button type="button" className={BTN} aria-label="Next page of bikes" disabled={!cursor?.next} onClick={() => cursor?.next && void loadCursor(cursor.next)}>
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </button>
              </span>
            </div>
            {cursor && cursor.items.length > 0 ? (
              <>
                <ul className="mt-1.5 space-y-1">
                  {cursor.items.map((b) => (
                    <li key={b.id} className="flex min-w-0 items-center gap-2 rounded bg-white/[0.05] px-2 py-1 text-[11px]">
                      <span className="font-mono text-white/95">{asStr(b.id)}</span>
                      <span className="min-w-0 flex-1 truncate text-white/75">
                        {asStr(b.kind)} · {asStr(b.stationId)}
                      </span>
                      <Chip tone={b.status === "available" ? "ok" : b.status === "service" ? "warn" : "dim"}>{asStr(b.status)}</Chip>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 truncate font-mono text-[10.5px] text-white/75">
                  next: {cursor.next ? <span className="text-[#e0f6c1]">{cursor.next}</span> : "null (last page)"}
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] text-white/60">{cursor ? "No bikes in this page." : "Loading…"}</p>
            )}
          </section>
        </div>
      </NeedsHook>
    </Feature>
  );
}
