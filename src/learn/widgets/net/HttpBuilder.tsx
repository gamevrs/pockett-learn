"use client";

import React, { useState } from "react";
import { CornerDownRight, Send } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Segmented } from "./ui";

/**
 * Build an HTTP request (method, path, headers, body), send it to a pretend shop server, and read
 * the response: status line, headers, body. Logging in sets a cookie, which the browser then sends
 * with every request: that is how a stateless protocol remembers who you are.
 */

const HOST = "shop.example.com";
const SESSION = "7f3a9c";

interface Res {
  status: number;
  reason: string;
  headers: [string, string][];
  body: string;
}

const REASONS: Record<number, string> = {
  200: "OK",
  301: "Moved Permanently",
  400: "Bad Request",
  401: "Unauthorized",
  404: "Not Found",
  405: "Method Not Allowed",
  500: "Internal Server Error",
};

const GET_PAGES: Record<string, string> = {
  "/": "<h1>Welcome to the shop</h1>",
  "/about": "<h1>About us</h1>",
  "/login": "<form method=post>…</form>",
};

function serve(method: string, path: string, host: boolean, cookie: boolean, body: string): Res {
  const res = (status: number, b: string, extra: [string, string][] = []): Res => ({
    status,
    reason: REASONS[status],
    headers: [["Content-Type", "text/html; charset=utf-8"], ["Content-Length", String(new TextEncoder().encode(b).length)], ...extra],
    body: b,
  });
  if (!host) return res(400, "<h1>Bad request: which site? (no Host header)</h1>");
  if (path === "/api/report") return res(500, "<h1>Sorry, something broke on our side</h1>");
  if (path === "/old-about") return method === "GET" ? res(301, "", [["Location", "/about"]]) : res(405, "", [["Allow", "GET"]]);
  if (path === "/login" && method === "POST") {
    const user = /(?:^|&)user=([^&]+)/.exec(body)?.[1];
    if (!user) return res(400, "<h1>Missing user=…</h1>");
    return res(200, `<h1>Logged in as ${decodeURIComponent(user)}</h1>`, [["Set-Cookie", `session=${SESSION}; HttpOnly`]]);
  }
  if (path === "/account") {
    if (method !== "GET") return res(405, "", [["Allow", "GET"]]);
    return cookie ? res(200, "<h1>Your account: 2 orders</h1>") : res(401, "<h1>Please log in first</h1>");
  }
  if (GET_PAGES[path] !== undefined) return method === "GET" ? res(200, GET_PAGES[path]) : res(405, "", [["Allow", "GET"]]);
  return res(404, "<h1>No page here</h1>");
}

export interface HttpBuilderProps {
  paths?: string[];
  methods?: string[];
  initialPath?: string;
  initialMethod?: string;
  /** Show the Host header switch. Default true. */
  hostToggle?: boolean;
}

export interface HttpBuilderState {
  method: string;
  path: string;
  status: number | null;
  seen: number[];
  cookieSent: boolean;
  loggedIn: boolean;
}

export function HttpBuilder({ props, onChange, revealed }: WidgetProps<HttpBuilderProps>) {
  const paths = props.paths ?? ["/", "/about", "/old-about", "/nope", "/api/report"];
  const methods = props.methods ?? ["GET", "POST"];
  const [method, setMethod] = useState(props.initialMethod ?? methods[0]);
  const [path, setPath] = useState(props.initialPath ?? paths[0]);
  const [host, setHost] = useState(true);
  const [sendCookies, setSendCookies] = useState(true);
  const [body, setBody] = useState("user=sam");
  const [jar, setJar] = useState<string | null>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [sentReq, setSentReq] = useState<string | null>(null);
  const [seen, setSeen] = useState<number[]>([]);
  const [count, setCount] = useState(0);

  const hasBody = method === "POST";
  const cookieOn = Boolean(jar) && sendCookies;
  const reqLines = (m: string, p: string) => {
    const lines = [`${m} ${p} HTTP/1.1`];
    if (host) lines.push(`Host: ${HOST}`);
    lines.push("Accept: text/html");
    if (cookieOn) lines.push(`Cookie: ${jar}`);
    if (m === "POST") {
      lines.push("Content-Type: application/x-www-form-urlencoded");
      lines.push(`Content-Length: ${new TextEncoder().encode(body).length}`);
    }
    return lines.join("\n") + "\n\n" + (m === "POST" ? body : "");
  };

  const send = (m = method, p = path) => {
    if (revealed) return;
    const r = serve(m, p, host, cookieOn, m === "POST" ? body : "");
    const cookie = r.headers.find(([k]) => k === "Set-Cookie")?.[1].split(";")[0] ?? null;
    const nextJar = cookie ?? jar;
    if (cookie) setJar(cookie);
    const nextSeen = seen.includes(r.status) ? seen : [...seen, r.status];
    setRes(r);
    setSentReq(reqLines(m, p));
    setSeen(nextSeen);
    setCount(count + 1);
    onChange?.({ method: m, path: p, status: r.status, seen: nextSeen, cookieSent: cookieOn, loggedIn: Boolean(nextJar) } satisfies HttpBuilderState);
  };
  const follow = () => {
    const loc = res?.headers.find(([k]) => k === "Location")?.[1];
    if (!loc) return;
    setMethod("GET");
    setPath(loc);
    send("GET", loc);
  };

  const tone = !res ? "neutral" : res.status < 300 ? "good" : res.status < 400 ? "accent" : "bad";
  const location = res?.headers.find(([k]) => k === "Location")?.[1];

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {methods.length > 1 && (
            <Segmented label="Method" value={method} disabled={revealed} options={methods.map((m) => ({ id: m, label: m }))} onChange={(m) => setMethod(m)} />
          )}
          <div className="flex flex-wrap gap-1.5">
            {paths.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPath(p)}
                disabled={revealed}
                aria-pressed={path === p}
                className={`min-h-10 rounded-full border px-3 font-mono text-[12.5px] transition-colors disabled:cursor-default ${
                  path === p ? "border-transparent bg-primary font-semibold text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {(props.hostToggle ?? true) && (
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-ink-2">
              <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={host} onChange={(e) => setHost(e.target.checked)} disabled={revealed} />
              Host header
            </label>
          )}
          <label className={`inline-flex min-h-10 items-center gap-2 ${jar ? "cursor-pointer text-ink-2" : "text-ink-3"}`}>
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={sendCookies && Boolean(jar)} onChange={(e) => setSendCookies(e.target.checked)} disabled={revealed || !jar} />
            Send cookies {jar ? <span className="font-mono text-xs">({jar})</span> : <span className="text-xs">(none yet)</span>}
          </label>
          {hasBody && (
            <label className="inline-flex min-h-10 items-center gap-2 text-ink-2">
              Body
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={revealed}
                className="h-10 w-36 rounded-lg border border-line bg-surface px-2 font-mono text-[12.5px] text-ink outline-none focus:border-[var(--brand)]"
                aria-label="Request body"
              />
            </label>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-white/10 bg-[#0a0a0a] text-[#e5e5e5]">
          <div className="flex min-h-9 items-center justify-between gap-2 border-b border-white/10 px-3 font-mono text-[11px] text-white/55">
            <span>request</span>
            <button type="button" onClick={() => send()} disabled={revealed} className="btn btn-primary btn-sm !h-8">
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
          <pre className="overflow-x-auto px-3 py-2 font-mono text-[12px] leading-[1.6]">
            {reqLines(method, path)
              .split("\n")
              .map((l, i) => (
                <div key={i} className={i === 0 ? "font-semibold text-[#a3e635]" : l.includes(":") ? "text-[#e5e5e5]" : "text-white/70"}>
                  {l || " "}
                </div>
              ))}
          </pre>
        </div>

        <div className="min-w-0 rounded-xl border border-line bg-surface-2">
          <div className="flex min-h-9 items-center border-b border-line px-3 font-mono text-[11px] text-ink-3">response</div>
          {!res ? (
            <p className="px-3 py-4 text-sm text-ink-3">Press Send to make the request.</p>
          ) : (
            <pre key={count} className="pop-in whitespace-pre-wrap break-words px-3 py-2 font-mono text-[12px] leading-[1.6] text-ink">
              <div className={`font-semibold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-brand"}`}>
                HTTP/1.1 {res.status} {res.reason}
              </div>
              {res.headers.map(([k, v]) => (
                <div key={k} className={k === "Set-Cookie" || k === "Location" ? "text-brand" : "text-ink-2"}>
                  {k}: {v}
                </div>
              ))}
              <div> </div>
              <div className="whitespace-pre-wrap break-words">{res.body}</div>
            </pre>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-2" aria-live="polite">
        {location && (
          <Note tone="accent" className="flex flex-wrap items-center justify-between gap-2">
            <span>
              The page moved. A browser follows the <span className="font-mono">Location</span> header by itself.
            </span>
            <button type="button" className="btn !h-10" onClick={follow} disabled={revealed}>
              <CornerDownRight className="h-4 w-4" /> GET {location}
            </button>
          </Note>
        )}
        {seen.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Caption>Status codes seen</Caption>
            {[...seen].sort().map((s) => (
              <span key={s} className={`chip font-mono ${s < 300 ? "!text-good" : s >= 400 ? "!text-bad" : "!text-brand"}`}>
                {s}
              </span>
            ))}
          </div>
        )}
        {sentReq === null && <p className="text-xs text-ink-3">Server: {HOST}</p>}
      </div>
    </div>
  );
}

export function checkHttpBuilder(state: unknown, goal: Record<string, unknown>) {
  const st = state as HttpBuilderState | undefined;
  if (!st) return false;
  if (typeof goal.status === "number" && st.status !== goal.status) return false;
  if (typeof goal.path === "string" && st.path !== goal.path) return false;
  if (typeof goal.method === "string" && st.method !== goal.method) return false;
  if (Array.isArray(goal.seen) && !goal.seen.every((s) => st.seen.includes(Number(s)))) return false;
  if (goal.cookieSent === true && !st.cookieSent) return false;
  return st.status !== null;
}
