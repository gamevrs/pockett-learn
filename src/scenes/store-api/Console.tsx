"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Braces, Check, Database, FlaskConical, Play, RotateCcw, ScrollText, Send, ShieldCheck, X } from "lucide-react";
import {
  isRecord,
  header,
  prettyJson,
  type ApiSession,
  type LogEntry,
  type Snapshot,
} from "./session";
import { BTN, BTN_ON, Empty, GhostRows, INPUT, JsonView, Locked, MethodTag, Notice, PaneFrame, StatusChip, Tabs } from "./ui";

/** The API console pane: a request editor, the response, plus Database / Tests / Docs tabs. */

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

interface Preset {
  need: string;
  label: string;
  method: string;
  path: string;
  body?: unknown;
  raw?: string;
  headers?: string;
  auth?: boolean;
}

const NEW_PRODUCT = { sku: "TST-001", name: "Test Lamp", description: "Made in the console.", category: "lighting", price_cents: 2500, stock: 4 };
const CART = { items: [{ product_id: 1, quantity: 1 }] };

/** Ready-made requests. A group appears when its lesson's feature is unlocked. */
const PRESETS: Preset[] = [
  { need: "store-console", label: "Health check", method: "GET", path: "/health" },
  { need: "store-console", label: "Unknown path", method: "GET", path: "/nope" },
  { need: "store-routes", label: "Wrong method", method: "POST", path: "/health" },
  { need: "store-catalogue", label: "List products", method: "GET", path: "/products" },
  { need: "store-catalogue", label: "One product", method: "GET", path: "/products/1" },
  { need: "store-catalogue", label: "Missing product", method: "GET", path: "/products/9999" },
  { need: "store-search", label: "Search: lamp", method: "GET", path: "/products?q=lamp" },
  { need: "store-search", label: "Desk, $50 to $90", method: "GET", path: "/products?category=desk&min_price=5000&max_price=9000" },
  { need: "store-search", label: "SQL injection try", method: "GET", path: "/products?q=zzz%25'%20OR%201%3D1%20--" },
  { need: "store-search", label: "Bad price", method: "GET", path: "/products?min_price=abc" },
  { need: "store-paging", label: "Cheapest 4", method: "GET", path: "/products?sort=price&per_page=4" },
  { need: "store-paging", label: "Page 2", method: "GET", path: "/products?page=2" },
  { need: "store-paging", label: "Page 99", method: "GET", path: "/products?page=99" },
  { need: "store-paging", label: "Bad sort", method: "GET", path: "/products?sort=password" },
  { need: "store-create", label: "Create product", method: "POST", path: "/products", body: NEW_PRODUCT },
  { need: "store-create", label: "Invalid product", method: "POST", path: "/products", body: { name: "", category: "toys", price_cents: -5, color: "red" } },
  { need: "store-create", label: "Duplicate SKU", method: "POST", path: "/products", body: { ...NEW_PRODUCT, sku: "AUD-001" } },
  { need: "store-create", label: "Broken JSON", method: "POST", path: "/products", raw: '{"sku": "oops",' },
  { need: "store-modify", label: "PATCH price", method: "PATCH", path: "/products/1", body: { price_cents: 4900 } },
  { need: "store-modify", label: "PUT replace", method: "PUT", path: "/products/2", body: { sku: "AUD-002", name: "Pocket Speaker Pro", category: "audio", price_cents: 4500 } },
  { need: "store-modify", label: "DELETE", method: "DELETE", path: "/products/16" },
  { need: "store-auth", label: "Register", method: "POST", path: "/auth/register", body: { email: "kim@example.com", password: "kim-secret-1" }, auth: false },
  { need: "store-auth", label: "Wrong password", method: "POST", path: "/auth/login", body: { email: "sam@example.com", password: "nope" }, auth: false },
  { need: "store-auth", label: "Who am I?", method: "GET", path: "/me" },
  { need: "store-roles", label: "Write, no token", method: "POST", path: "/products", body: NEW_PRODUCT, auth: false },
  { need: "store-roles", label: "Write as session", method: "POST", path: "/products", body: { ...NEW_PRODUCT, sku: "TST-002" } },
  { need: "store-orders", label: "Place order", method: "POST", path: "/orders", body: CART },
  { need: "store-orders", label: "Out of stock", method: "POST", path: "/orders", body: { items: [{ product_id: 9, quantity: 1 }] } },
  { need: "store-orders", label: "My orders", method: "GET", path: "/orders" },
  { need: "store-ship", label: "Retry-safe order", method: "POST", path: "/orders", body: CART, headers: "Idempotency-Key: demo-key-1" },
  { need: "store-ship", label: "OpenAPI", method: "GET", path: "/openapi.json", auth: false },
];

const FEATURE_TITLE: Record<string, string> = {
  "store-console": "Basics",
  "store-routes": "Router",
  "store-catalogue": "Catalogue",
  "store-search": "Search & filters",
  "store-paging": "Sorting & pages",
  "store-create": "Create",
  "store-modify": "Edit & delete",
  "store-auth": "Accounts",
  "store-roles": "Roles",
  "store-orders": "Orders",
  "store-ship": "Idempotency & docs",
};

function parseHeaders(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const name = line.slice(0, i).trim();
    if (name) out[name] = line.slice(i + 1).trim();
  }
  return out;
}

function jsonState(text: string): "empty" | "valid" | "invalid" {
  if (!text.trim()) return "empty";
  try {
    JSON.parse(text);
    return "valid";
  } catch {
    return "invalid";
  }
}

// ───────────────────────── request tab ─────────────────────────

function Editor({
  session,
  snap,
  unlocked,
  focus,
  interactive,
  entry,
}: {
  session: ApiSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
  entry: LogEntry | null;
}) {
  const d = snap.draft;
  const [method, setMethod] = useState(d.method);
  const [path, setPath] = useState(d.path);
  const [headersText, setHeadersText] = useState(d.headers);
  const [bodyText, setBodyText] = useState(d.body);
  const [auth, setAuth] = useState(d.auth);
  const [part, setPart] = useState<"body" | "headers">(d.headers && !d.body ? "headers" : "body");
  const [shownId, setShownId] = useState<number | null>(d.entryId);
  const [resTab, setResTab] = useState<"body" | "headers">("body");

  const shown = snap.log.find((e) => e.id === shownId) ?? entry;
  const history = snap.log.filter((e) => e.source === "console").slice(0, 8);
  const presets = PRESETS.filter((p) => unlocked.has(p.need) || p.need === focus || (p.need === "store-console" && session.hasHandle));
  const groups = [...new Set(presets.map((p) => p.need))].map((need) => ({ need, title: FEATURE_TITLE[need] ?? need, items: presets.filter((p) => p.need === need) }));
  const focusGroup = groups.find((g) => g.need === focus);
  const spotlight = (focusGroup ?? groups[groups.length - 1])?.items ?? [];
  const json = jsonState(bodyText);
  const hasToken = !!snap.token;

  const send = () => {
    const sent = session.request(method, path.trim() || "/", {
      rawBody: bodyText.trim() === "" ? null : bodyText,
      headers: parseHeaders(headersText),
      auth,
      source: "console",
    });
    setShownId(sent.id);
    setResTab("body");
  };

  const loadPreset = (p: Preset) => {
    setMethod(p.method);
    setPath(p.path);
    setBodyText(p.raw ?? (p.body !== undefined ? prettyJson(p.body) : ""));
    setHeadersText(p.headers ?? "");
    setAuth(p.auth ?? true);
    setPart(p.body !== undefined || p.raw !== undefined ? "body" : p.headers ? "headers" : "body");
  };

  const signIn = (email: string, password: string) => {
    const e = session.login(email, password, "console");
    setShownId(e.id);
    setAuth(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      {/* request line */}
      <form
        className="flex min-w-0 gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <select aria-label="HTTP method" value={method} onChange={(e) => setMethod(e.target.value)} disabled={!interactive} className={`${INPUT} w-[4.6rem] shrink-0 cursor-pointer font-mono font-semibold`}>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          aria-label="Request path"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          disabled={!interactive}
          placeholder="/products?q=lamp"
          className={`${INPUT} flex-1 font-mono`}
        />
        <button type="submit" disabled={!interactive} className={BTN_ON}>
          <Send className="h-3 w-3" aria-hidden /> Send
        </button>
      </form>

      {/* ready-made requests */}
      <div className="space-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <select
            aria-label="Requests to try"
            value=""
            disabled={!interactive || presets.length === 0}
            onChange={(e) => {
              const p = presets.find((x) => `${x.need}:${x.label}` === e.target.value);
              if (p) loadPreset(p);
            }}
            className={`${INPUT} min-w-0 flex-1 cursor-pointer`}
          >
            <option value="">{presets.length ? "Try a request…" : "Run your code to get started"}</option>
            {groups.map((g) => (
              <optgroup key={g.need} label={g.title}>
                {g.items.map((p) => (
                  <option key={p.label} value={`${p.need}:${p.label}`}>
                    {p.method} {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {spotlight.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="hud-label mr-0.5">{focusGroup ? "This lesson" : "Latest"}</span>
            {spotlight.map((p) => (
              <button key={`${p.need}:${p.label}`} onClick={() => loadPreset(p)} disabled={!interactive} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-white/75 hover:bg-white/10 disabled:opacity-50">
                <MethodTag method={p.method} className="!text-[9px]" />
                {p.label}
              </button>
            ))}
          </div>
        )}
        {unlocked.has("store-auth") && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <span className="hud-label mr-0.5">Sign in</span>
            <button onClick={() => signIn("admin@pocketstore.test", "admin-pass-123")} disabled={!interactive} className={BTN}>
              as admin
            </button>
            <button onClick={() => signIn("sam@example.com", "sam-pass-456")} disabled={!interactive} className={BTN}>
              as Sam
            </button>
            {snap.user && <span className="hud-value hud-accent truncate text-[10.5px]">{snap.user.email}</span>}
          </div>
        )}
      </div>

      {/* body / headers */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-1 border-b border-white/[0.07] px-2 py-1">
          {(["body", "headers"] as const).map((k) => (
            <button key={k} onClick={() => setPart(k)} className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium ${part === k ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}>
              {k === "body" ? "JSON body" : "Headers"}
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/60" title={hasToken ? "Adds Authorization: Bearer <your session token>" : "Sign in first to get a token"}>
            <input type="checkbox" checked={auth && hasToken} disabled={!hasToken || !interactive} onChange={(e) => setAuth(e.target.checked)} className="h-3 w-3 accent-[#a3e635]" />
            send token
          </label>
        </div>
        {part === "body" ? (
          <div>
            <textarea
              aria-label="JSON body"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              spellCheck={false}
              disabled={!interactive}
              placeholder={'{"name": "Test"}'}
              rows={method === "GET" || method === "DELETE" ? 2 : 4}
              className="block w-full resize-y bg-transparent px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] text-white outline-none placeholder:text-white/25"
            />
            <div className="flex items-center gap-2 border-t border-white/[0.05] px-2 py-1 text-[10px]">
              <span className={json === "valid" ? "hud-accent" : json === "invalid" ? "text-[#fbbf24]" : "text-white/35"}>
                {json === "valid" ? "valid JSON" : json === "invalid" ? "not valid JSON (the API should answer 400)" : "no body"}
              </span>
              {json === "valid" && (
                <button className="ml-auto text-white/50 hover:text-white" onClick={() => setBodyText(prettyJson(JSON.parse(bodyText)))}>
                  format
                </button>
              )}
            </div>
          </div>
        ) : (
          <textarea
            aria-label="Request headers"
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            spellCheck={false}
            disabled={!interactive}
            placeholder={"Name: value (one per line)\nIdempotency-Key: abc-123"}
            rows={2}
            className="block w-full resize-y bg-transparent px-2 py-1.5 font-mono text-[10.5px] leading-[1.5] text-white outline-none placeholder:text-white/25"
          />
        )}
      </div>

      {/* response */}
      <div className="min-h-[7rem] rounded-lg border border-white/10 bg-black/30">
        {shown ? <ResponseView entry={shown} tab={resTab} setTab={setResTab} /> : <Empty>Send a request to see the response: status, headers, body and timing.</Empty>}
      </div>

      {/* history */}
      {history.length > 0 && (
        <div>
          <p className="hud-label mb-1">History</p>
          <div className="flex flex-wrap gap-1">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => {
                  setMethod(h.req.method);
                  setPath(h.req.path);
                  setBodyText(h.req.body ?? "");
                  setHeadersText(
                    Object.entries(h.req.headers)
                      .filter(([k]) => !["accept", "content-type", "authorization"].includes(k.toLowerCase()))
                      .map(([k, v]) => `${k}: ${v}`)
                      .join("\n"),
                  );
                  setShownId(h.id);
                }}
                className={`inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] hover:bg-white/10 ${h.id === shownId ? "border-[#a3e635]/50 bg-white/[0.06]" : "border-white/10 bg-white/[0.03]"}`}
              >
                <MethodTag method={h.req.method} className="!text-[9px]" />
                <span className="max-w-[9rem] truncate font-mono text-white/70">{h.req.path}</span>
                <StatusChip status={h.result.status} withText={false} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResponseView({ entry, tab, setTab }: { entry: LogEntry; tab: "body" | "headers"; setTab: (t: "body" | "headers") => void }) {
  const r = entry.result;
  if (!r.ok) {
    return (
      <div className="space-y-2 p-2.5">
        <div className="flex items-center gap-2">
          <StatusChip status={0} />
          <span className="hud-value hud-muted text-[10px]">{r.ms} ms</span>
        </div>
        <Notice tone="bad">
          <p className="mb-1 font-semibold">No usable response</p>
          <p className="break-words font-mono text-[10.5px]">{r.problem}</p>
        </Notice>
      </div>
    );
  }
  const text = prettyJson(r.body);
  const contentType = header(r.headers, "content-type");
  const headerRows = Object.entries(r.headers);
  return (
    <div className="space-y-2 p-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusChip status={r.status} />
        <span className="hud-value hud-muted text-[10px]">{r.ms} ms</span>
        <span className="hud-value hud-muted text-[10px]">{r.size} B</span>
        <div className="ml-auto flex gap-0.5">
          {(["body", "headers"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded px-1.5 py-0.5 text-[10.5px] ${tab === k ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"}`}>
              {k === "body" ? "Body" : `Headers (${headerRows.length})`}
            </button>
          ))}
        </div>
      </div>
      {entry.server && (
        <Notice tone="warn">
          <span className="font-semibold">Server log:</span> <span className="font-mono text-[10.5px]">{entry.server.type}: {entry.server.message}</span>
          <span className="block text-[10px] opacity-80">Your error middleware hid this from the client and logged it here.</span>
        </Notice>
      )}
      {tab === "body" ? (
        text ? (
          <div className="max-h-64 overflow-auto">
            <JsonView text={text} />
          </div>
        ) : (
          <p className="text-[11px] text-white/40">No body{r.status === 204 ? " (204 No Content, as it should be)" : ""}.</p>
        )
      ) : headerRows.length ? (
        <dl className="space-y-0.5 font-mono text-[10.5px]">
          {headerRows.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 text-white/50">{k}:</dt>
              <dd className="min-w-0 break-all text-white/85">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[11px] text-white/40">No headers.</p>
      )}
      {tab === "body" && r.body !== null && !contentType && <p className="text-[10px] text-[#fbbf24]">This response has a body but no Content-Type header.</p>}
    </div>
  );
}

// ───────────────────────── database tab ─────────────────────────

function DatabaseTab({ session, snap, interactive }: { session: ApiSession; snap: Snapshot; interactive: boolean }) {
  useEffect(() => {
    session.loadHook("db", "list_products");
  }, [session, snap.epoch]);
  const slot = snap.cache.db?.value as { value: unknown; problem: string | null } | undefined;
  const rows = Array.isArray(slot?.value) ? slot.value.filter(isRecord) : [];
  const cols = ["id", "sku", "name", "category", "price_cents", "stock"];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      <div className="flex items-center gap-2">
        <span className="hud-label">products</span>
        <span className="hud-value hud-muted text-[10px]">{rows.length} rows</span>
        <button disabled={!interactive} className={`${BTN} ml-auto`} onClick={() => session.resetData()} title="Runs your reset_db()">
          <RotateCcw className="h-3 w-3" aria-hidden /> Reset data
        </button>
      </div>
      {slot?.problem ? (
        <Empty tone="warn">{slot.problem}</Empty>
      ) : rows.length === 0 ? (
        <Empty>The table is empty. Is your seed running in reset_db()?</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-white/[0.04]">
                {cols.map((c) => (
                  <th key={c} scope="col" className={`whitespace-nowrap px-2 py-1 font-mono text-[9.5px] font-medium text-white/45 ${c === "price_cents" || c === "stock" || c === "id" ? "text-right" : "text-left"}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="hud-value">
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-white/[0.06]">
                  {cols.map((c) => {
                    const v = r[c];
                    const num = c === "price_cents" || c === "stock" || c === "id";
                    const low = c === "stock" && typeof v === "number" && v <= 3;
                    return (
                      <td key={c} className={`max-w-[10rem] truncate whitespace-nowrap px-2 py-[3px] tabular-nums ${num ? "text-right" : "text-left"} ${low ? "hud-warning" : ""}`}>
                        {v === null || v === undefined ? <span className="italic text-white/35">NULL</span> : String(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10.5px] leading-snug text-white/40">
        Read straight from your SQLite connection by your <code className="font-mono text-white/60">list_products()</code>. Changes made through the API show up here.
      </p>
    </div>
  );
}

// ───────────────────────── tests tab ─────────────────────────

function TestsTab({ session, snap, interactive }: { session: ApiSession; snap: Snapshot; interactive: boolean }) {
  const t = snap.tests;
  const passed = t ? t.rows.filter((r) => r.passed).length : 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      <div className="flex items-center gap-2">
        <button disabled={!interactive} className={BTN_ON} onClick={() => session.runTests()}>
          <Play className="h-3 w-3" aria-hidden /> Run my tests
        </button>
        {t && !t.problem && (
          <span className={`hud-value text-[11px] ${passed === t.rows.length && t.rows.length > 0 ? "hud-accent" : "hud-warning"}`}>
            {passed}/{t.rows.length} passed
          </span>
        )}
      </div>
      {!t && <Empty>Runs every test_ function from your file against a fresh database. (It signs you out of the shop, since the data is rebuilt.)</Empty>}
      {t?.problem && <Empty tone="warn">{t.problem}</Empty>}
      {t && !t.problem && t.rows.length === 0 && <Empty tone="warn">run_tests() returned no results. Write some test_ functions.</Empty>}
      {t && t.rows.length > 0 && (
        <ul className="space-y-1">
          {t.rows.map((r) => (
            <li key={r.name} className="rounded-md bg-white/[0.04] px-2 py-1.5">
              <div className="flex items-center gap-2">
                {r.passed ? <Check className="h-3 w-3 shrink-0 text-[#a3e635]" aria-label="passed" /> : <X className="h-3 w-3 shrink-0 text-[#f87171]" aria-label="failed" />}
                <span className="hud-value min-w-0 truncate text-[11px]">{r.name}</span>
              </div>
              {r.error && <p className="mt-1 break-words pl-5 font-mono text-[10px] leading-snug text-[#fca5a5]">{r.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── docs tab ─────────────────────────

interface DocRow {
  method: string;
  path: string;
  summary: string;
  secure: boolean;
  params: string[];
}

function readDocs(body: unknown): { title: string; version: string; rows: DocRow[] } | null {
  if (!isRecord(body) || !isRecord(body.paths)) return null;
  const info = isRecord(body.info) ? body.info : {};
  const rows: DocRow[] = [];
  for (const [path, ops] of Object.entries(body.paths)) {
    if (!isRecord(ops)) continue;
    for (const [method, op] of Object.entries(ops)) {
      if (!isRecord(op)) continue;
      const params = Array.isArray(op.parameters) ? op.parameters.flatMap((p) => (isRecord(p) && typeof p.name === "string" ? [p.name] : [])) : [];
      rows.push({
        method: method.toUpperCase(),
        path,
        summary: typeof op.summary === "string" ? op.summary : "",
        secure: Array.isArray(op.security) && op.security.length > 0,
        params,
      });
    }
  }
  const order = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  rows.sort((a, b) => a.path.localeCompare(b.path) || order.indexOf(a.method) - order.indexOf(b.method));
  return { title: String(info.title ?? "API"), version: String(info.version ?? ""), rows };
}

function DocsTab({ session, snap, interactive, openRequest }: { session: ApiSession; snap: Snapshot; interactive: boolean; openRequest: (method: string, path: string) => void }) {
  useEffect(() => {
    session.load("docs", { path: "/openapi.json", auth: false }, "docs");
  }, [session, snap.epoch]);
  const slot = snap.cache.docs?.value as { ok: boolean; status: number; body: unknown; problem?: string } | undefined;
  const docs = slot?.ok ? readDocs(slot.body) : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      {!slot ? (
        <Empty>Loading GET /openapi.json…</Empty>
      ) : !docs ? (
        <Empty tone="warn">
          {slot.ok ? `GET /openapi.json answered ${slot.status}. It should return an OpenAPI document with a "paths" object.` : slot.problem}
        </Empty>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <h4 className="hud-title">{docs.title}</h4>
            <span className="hud-value hud-muted text-[10px]">v{docs.version} · {docs.rows.length} operations</span>
          </div>
          <ul className="space-y-1">
            {docs.rows.map((r) => (
              <li key={`${r.method} ${r.path}`}>
                <button
                  disabled={!interactive}
                  onClick={() => openRequest(r.method, r.path.replace(/\{[^}]+\}/g, "1"))}
                  className="flex w-full min-w-0 items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5 text-left hover:bg-white/[0.08]"
                >
                  <MethodTag method={r.method} className="w-11" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[10.5px] text-white/90">{r.path}</span>
                    {r.summary && <span className="block truncate text-[10.5px] text-white/50">{r.summary}</span>}
                  </span>
                  {r.secure && <ShieldCheck className="h-3 w-3 shrink-0 text-[#fbbf24]" aria-label="needs a bearer token" />}
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[10.5px] leading-snug text-white/40">Generated by your build_openapi() from the same route table the router uses. Click a row to open it in the console.</p>
        </>
      )}
    </div>
  );
}

// ───────────────────────── pane ─────────────────────────

type ConsoleTab = "request" | "db" | "tests" | "docs";

export function ConsolePane({
  session,
  snap,
  unlocked,
  focus,
  interactive,
  fresh,
}: {
  session: ApiSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
  fresh: ReadonlySet<string>;
}) {
  const [tab, setTab] = useState<ConsoleTab>("request");
  const requestOn = (unlocked.has("store-console") || focus === "store-console") && session.hasHandle;
  const dbOn = unlocked.has("store-db");
  const testsOn = unlocked.has("store-tests");
  const docsOn = unlocked.has("store-ship");

  // when a new lesson unlocks a tab, jump there once so the learner sees it
  const freshTab: ConsoleTab | null = fresh.has("store-ship") ? "docs" : fresh.has("store-tests") ? "tests" : fresh.has("store-db") ? "db" : null;
  const [seenFresh, setSeenFresh] = useState<ConsoleTab | null>(null);
  if (freshTab && freshTab !== seenFresh) {
    setSeenFresh(freshTab);
    setTab(freshTab);
  }

  // loading a request from the log or the docs always shows the request tab
  const draftNonce = snap.draft.nonce;
  const [seenDraft, setSeenDraft] = useState(draftNonce);
  if (draftNonce !== seenDraft) {
    setSeenDraft(draftNonce);
    setTab("request");
  }

  const tabs = useMemo(
    () => [
      { id: "request" as const, label: "Request", locked: !requestOn },
      { id: "db" as const, label: "Database", locked: !dbOn },
      { id: "tests" as const, label: "Tests", locked: !testsOn },
      { id: "docs" as const, label: "Docs", locked: !docsOn },
    ],
    [requestOn, dbOn, testsOn, docsOn],
  );
  const freshIds = useMemo(() => new Set([...fresh].flatMap((f) => (f === "store-console" ? ["request"] : f === "store-db" ? ["db"] : f === "store-tests" ? ["tests"] : f === "store-ship" ? ["docs"] : []))), [fresh]);

  const lastConsole = snap.log.find((e) => e.source === "console") ?? null;

  let body: React.ReactNode;
  if (tab === "request") {
    body = requestOn ? (
      <Editor key={snap.draft.nonce} session={session} snap={snap} unlocked={unlocked} focus={focus} interactive={interactive} entry={lastConsole} />
    ) : (
      <div className="p-3">
        <Locked title="API console" need="handle(request)" lesson={1} spot={focus === "store-console"}>
          <div className="mt-2.5 flex gap-1.5" aria-hidden>
            <div className="h-6 w-14 rounded-md border border-dashed border-white/12" />
            <div className="h-6 flex-1 rounded-md border border-dashed border-white/12" />
            <div className="h-6 w-14 rounded-full bg-white/[0.06]" />
          </div>
          <GhostRows rows={4} />
        </Locked>
      </div>
    );
  } else if (tab === "db") {
    body = dbOn ? (
      <DatabaseTab session={session} snap={snap} interactive={interactive} />
    ) : (
      <div className="p-3">
        <Locked title="Database" need="reset_db() and list_products()" lesson={4} spot={focus === "store-db"}>
          <GhostRows rows={5} />
        </Locked>
      </div>
    );
  } else if (tab === "tests") {
    body = testsOn ? (
      <TestsTab session={session} snap={snap} interactive={interactive} />
    ) : (
      <div className="p-3">
        <Locked title="Test suite" need="run_tests()" lesson={13} spot={focus === "store-tests"}>
          <GhostRows rows={4} />
        </Locked>
      </div>
    );
  } else {
    body = docsOn ? (
      <DocsTab session={session} snap={snap} interactive={interactive} openRequest={(method, path) => session.openInConsole({ method, path, body: "", headers: "", auth: true })} />
    ) : (
      <div className="p-3">
        <Locked title="API docs" need="GET /openapi.json" lesson={14} spot={focus === "store-ship"}>
          <GhostRows rows={5} />
        </Locked>
      </div>
    );
  }

  return (
    <PaneFrame
      title="API console"
      icon={tab === "db" ? <Database className="h-3.5 w-3.5" /> : tab === "tests" ? <FlaskConical className="h-3.5 w-3.5" /> : tab === "docs" ? <ScrollText className="h-3.5 w-3.5" /> : <Braces className="h-3.5 w-3.5" />}
      meta={snap.token ? "token on" : undefined}
    >
      <Tabs tabs={tabs} value={tab} onChange={setTab} fresh={freshIds} />
      {body}
    </PaneFrame>
  );
}

