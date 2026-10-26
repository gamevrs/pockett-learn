"use client";

import React, { useEffect, useRef, useState } from "react";
import { FastForward, RotateCcw, ShieldAlert, ShieldCheck, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Note, Segmented, Toggle } from "./ui";

/**
 * "Sign in with RideVault" for a cycling app called SpokeLog, as a four-lane sequence: the
 * browser, the app, the authorization server and the API. The authorization code flow is shown
 * step by step, with switches for PKCE and for an attacker who intercepts the redirect. A second
 * mode replays the retired implicit flow, where the token itself travels in the address bar.
 */

type Lane = "browser" | "app" | "auth" | "api";
const LANES: { id: Lane; label: string }[] = [
  { id: "browser", label: "Browser" },
  { id: "app", label: "App" },
  { id: "auth", label: "Auth server" },
  { id: "api", label: "API" },
];
const laneIndex = (l: Lane) => LANES.findIndex((x) => x.id === l);

type Row =
  | { kind: "msg"; from: Lane; to: Lane; label: string; title: string; detail: string; tone?: "good" | "bad" }
  | { kind: "note"; lane: Lane; label: string; title: string; detail: string; tone?: "good" | "bad" };

const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

export function buildRows(flow: "code" | "implicit", pkce: boolean, attacker: boolean, openid: boolean): Row[] {
  const scope = openid ? "openid rides:read" : "rides:read";
  const scopeQ = openid ? "openid%20rides:read" : "rides:read";
  const rows: Row[] = [];
  const authorize = (type: "code" | "token") =>
    `GET https://accounts.ridevault.example/authorize\n  ?response_type=${type}\n  &client_id=spokelog\n  &redirect_uri=https://spokelog.example/cb\n  &scope=${scopeQ}\n  &state=x7Qe` + (type === "code" && pkce ? `\n  &code_challenge=${CHALLENGE}\n  &code_challenge_method=S256` : "");

  if (flow === "implicit") {
    rows.push(
      { kind: "msg", from: "app", to: "browser", label: "redirect to /authorize", title: "The app sends the browser away", detail: authorize("token") + "\n\nresponse_type=token asks for the access token directly, with no code in between." },
      { kind: "msg", from: "browser", to: "auth", label: "GET /authorize", title: "The browser asks the authorization server", detail: authorize("token") },
      { kind: "note", lane: "auth", label: "You sign in and approve", title: "Sign-in and consent", detail: `You log in here, with your password and second factor, and approve SpokeLog reading your rides (${scope}).` },
      { kind: "msg", from: "auth", to: "browser", label: "302 → /cb#access_token=…", title: "The token comes back in the address bar", detail: "HTTP/1.1 302 Found\nLocation: https://spokelog.example/cb#access_token=eyJhbGciOi…&expires_in=3600&state=x7Qe", tone: "bad" },
      { kind: "note", lane: "browser", label: "Token now sits in the URL", title: "Where the token has been written", detail: "The page's JavaScript reads the token out of the address bar. Meanwhile it is in the browser history, perhaps in a screenshot or a pasted link, and in reach of every script and extension on the page. Nothing proves the app that receives it is the one that asked.", tone: "bad" },
    );
    if (attacker) {
      rows.push(
        { kind: "msg", from: "browser", to: "api", label: "attacker: GET /rides", title: "Anyone holding the token is you", detail: "GET /rides\nAuthorization: Bearer eyJhbGciOi…\n\nThe attacker copied the token from the history, a log or a malicious script. The API cannot tell whose hands it is in.", tone: "bad" },
        { kind: "msg", from: "api", to: "browser", label: "200 OK, your rides", title: "The attacker reads your rides", detail: "HTTP/1.1 200 OK\n[ every ride you ever logged ]", tone: "bad" },
      );
    } else {
      rows.push(
        { kind: "msg", from: "browser", to: "api", label: "GET /rides (Bearer)", title: "The app calls the API", detail: "GET /rides\nAuthorization: Bearer eyJhbGciOi…" },
        { kind: "msg", from: "api", to: "browser", label: "200 OK, your rides", title: "The API answers", detail: "HTTP/1.1 200 OK\n[ your rides ]" },
      );
    }
    return rows;
  }

  rows.push(
    pkce
      ? { kind: "note", lane: "app", label: "make verifier + challenge", title: "The app makes a secret it will prove later", detail: `The app invents a long random string, the code_verifier, and keeps it. It sends only its SHA-256 hash, the code_challenge:\n\n  code_challenge = BASE64URL( SHA256( code_verifier ) )\n\nA hash cannot be turned back into the verifier.` }
      : { kind: "note", lane: "app", label: "make a state value", title: "The app makes a random state", detail: "The app invents a random state value (x7Qe) and remembers it, so it can recognise its own round trip when the user comes back." },
    { kind: "msg", from: "app", to: "browser", label: "redirect to /authorize", title: "The app sends the browser to sign in", detail: authorize("code") },
    { kind: "msg", from: "browser", to: "auth", label: "GET /authorize", title: "The browser asks the authorization server", detail: authorize("code") },
    { kind: "note", lane: "auth", label: "You sign in and approve", title: "Sign-in and consent happen here", detail: `You enter your password and second factor on RideVault's own page. The app never sees them. Then you approve exactly what was asked: "SpokeLog wants to ${openid ? "know who you are and " : ""}read your rides" (${scope}).` },
    { kind: "msg", from: "auth", to: "browser", label: "302 → /cb?code=…", title: "A short-lived code, not a token", detail: "HTTP/1.1 302 Found\nLocation: https://spokelog.example/cb?code=Zx81Pa&state=x7Qe\n\nThe code is single-use and expires in about a minute. On its own it opens nothing." },
    { kind: "msg", from: "browser", to: "app", label: "GET /cb?code=…", title: "The browser hands the code to the app", detail: "GET https://spokelog.example/cb?code=Zx81Pa&state=x7Qe\n\nThe app checks that state matches the one it made. If not, this is not a reply to its own request, and it stops." },
  );
  if (attacker) {
    rows.push({
      kind: "msg",
      from: "browser",
      to: "auth",
      label: "attacker: POST /token",
      title: "An interceptor presents the stolen code first",
      detail: `A look-alike app on the same phone, or a snooping browser extension, copied the code out of the redirect and races to redeem it:\n\nPOST /token\n  grant_type=authorization_code\n  &code=Zx81Pa\n  &client_id=spokelog\n  &redirect_uri=https://spokelog.example/cb` + (pkce ? "\n  (no code_verifier: the attacker never had it)" : ""),
      tone: "bad",
    });
    if (pkce) {
      rows.push(
        { kind: "note", lane: "auth", label: "hash(verifier) ≠ challenge", title: "The server asks for the verifier", detail: "The code was issued against a code_challenge, so the server needs a code_verifier whose SHA-256 hash matches it. The attacker has no verifier and cannot invent one.", tone: "good" },
        { kind: "msg", from: "auth", to: "browser", label: "400 invalid_grant", title: "The attacker is turned away", detail: "HTTP/1.1 400 Bad Request\n{\"error\":\"invalid_grant\"}\n\nA stolen code is useless without the verifier that only the real app holds.", tone: "good" },
      );
    } else {
      rows.push(
        { kind: "msg", from: "auth", to: "browser", label: "200 access_token", title: "The attacker is handed your access", detail: "HTTP/1.1 200 OK\n{\"access_token\":\"eyJhbGciOi…\",\"expires_in\":900}\n\nNothing ties the code to the app that asked for it, so whoever redeems it first wins. The attacker can now read your rides.", tone: "bad" },
        { kind: "note", lane: "browser", label: "attacker holds a token", title: "Breach", detail: "The real app's own request now fails because the code is already used, and an attacker holds a working access token.", tone: "bad" },
      );
      return rows;
    }
  }
  rows.push(
    { kind: "msg", from: "app", to: "auth", label: "POST /token", title: "The app redeems the code, directly", detail: "POST https://accounts.ridevault.example/token   (server to server, not through the browser)\n  grant_type=authorization_code\n  &code=Zx81Pa\n  &redirect_uri=https://spokelog.example/cb\n  &client_id=spokelog" + (pkce ? "\n  &code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" : "") },
    { kind: "note", lane: "auth", label: pkce ? "hash(verifier) = challenge" : "check code and client", title: "The server checks the redemption", detail: pkce ? "It hashes the code_verifier it just received and compares it with the code_challenge stored with this code. They match, so the party redeeming is the one that started the flow. The code is marked used." : "It checks the code is valid, unused, unexpired, and issued to this client and redirect_uri. The code is marked used.", tone: "good" },
    { kind: "msg", from: "auth", to: "app", label: openid ? "200 access + id token" : "200 access_token", title: "Tokens, delivered over the back channel", detail: `HTTP/1.1 200 OK\n{ "access_token": "eyJhbGciOi…",   (for the API, about 15 minutes)\n  "refresh_token": "8Rk2…",      (to get new ones later)` + (openid ? `\n  "id_token": "eyJraWQiOi…",       (who just signed in, for the app)` : "") + `\n  "scope": "${scope}" }` },
    { kind: "msg", from: "app", to: "api", label: "GET /rides (Bearer)", title: "The app calls the API", detail: "GET https://api.ridevault.example/rides\nAuthorization: Bearer eyJhbGciOi…" },
    { kind: "msg", from: "api", to: "app", label: "200 OK, your rides", title: "The API checks the token and answers", detail: "The API verifies the token's signature and expiry, and that its scope includes rides:read. Only then:\n\nHTTP/1.1 200 OK\n[ your rides ]", tone: "good" },
  );
  return rows;
}

export interface OAuthFlowProps {
  flow?: "code" | "implicit";
  /** Show the Code/Implicit switch. */
  flowToggle?: boolean;
  pkce?: boolean;
  attacker?: boolean;
  /** Which switches to show: any of "pkce", "attacker". */
  toggles?: string[];
  /** Add the openid scope: the server also returns an ID token. */
  openid?: boolean;
}

export interface OAuthFlowState {
  flow: "code" | "implicit";
  pkce: boolean;
  attacker: boolean;
  shown: number;
  finished: boolean;
  /** The attacker's stolen code was refused. */
  blocked: boolean;
  /** The attacker walked away with a token. */
  breached: boolean;
}

const stateOf = (flow: "code" | "implicit", pkce: boolean, attacker: boolean, openid: boolean, shown: number): OAuthFlowState => {
  const rows = buildRows(flow, pkce, attacker, openid);
  const finished = shown >= rows.length;
  const safe = flow === "code" && pkce;
  return { flow, pkce, attacker, shown, finished, blocked: attacker && safe && finished, breached: attacker && !safe && finished };
};

function Arrow({ row, fresh }: { row: Extract<Row, { kind: "msg" }>; fresh: boolean }) {
  const a = laneIndex(row.from);
  const b = laneIndex(row.to);
  const right = b > a;
  const left = Math.min(a, b) * 25 + 12.5;
  const width = Math.abs(b - a) * 25;
  const color = row.tone === "bad" ? "var(--bad)" : row.tone === "good" ? "var(--good)" : "var(--brand)";
  return (
    <div className={`relative h-11 ${fresh ? "pop-in" : ""}`}>
      <p className={`absolute top-0 truncate text-center font-mono text-[10.5px] font-medium text-ink sm:text-[11.5px] ${row.tone === "bad" ? "text-bad" : ""}`} style={{ left: `${left}%`, width: `${width}%` }}>
        {row.label}
      </p>
      <div className="absolute top-[27px] h-[2px] rounded-full" style={{ left: `${left}%`, width: `${width}%`, background: color }} />
      <span
        className="absolute top-[22px] h-0 w-0 border-y-[6px] border-y-transparent"
        style={right ? { left: `calc(${left + width}% - 8px)`, borderLeft: `8px solid ${color}` } : { left: `${left}%`, borderRight: `8px solid ${color}` }}
      />
    </div>
  );
}

function NoteRow({ row, fresh }: { row: Extract<Row, { kind: "note" }>; fresh: boolean }) {
  const i = laneIndex(row.lane);
  const center = i * 25 + 12.5;
  // keep the box inside the container whichever lane it belongs to
  const half = 24;
  const mid = Math.min(100 - half, Math.max(half, center));
  return (
    <div className={`relative h-[38px] ${fresh ? "pop-in" : ""}`}>
      <span
        className={`absolute top-1 inline-flex -translate-x-1/2 items-center justify-center rounded-lg border bg-surface px-2 py-1 text-center text-[10.5px] leading-tight text-ink sm:text-[11.5px] ${
          row.tone === "bad" ? "border-[var(--bad)]/55" : row.tone === "good" ? "border-[var(--good)]/50" : "border-[var(--brand)]/45"
        }`}
        style={{ left: `${mid}%`, width: "47%" }}
      >
        {row.label}
      </span>
    </div>
  );
}

export function OAuthFlow({ props, onChange, revealed }: WidgetProps<OAuthFlowProps>) {
  const openid = props.openid ?? false;
  const toggles = props.toggles ?? [];
  const [flow, setFlow] = useState<"code" | "implicit">(props.flow ?? "code");
  const [pkce, setPkce] = useState(props.pkce ?? false);
  const [attacker, setAttacker] = useState(props.attacker ?? false);
  const [shown, setShown] = useState(0);
  const rows = buildRows(flow, pkce, attacker, openid);
  const finished = shown >= rows.length;
  const visible = rows.slice(0, shown);
  const last = visible[visible.length - 1];
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown, flow, pkce, attacker]);

  const emit = (f: "code" | "implicit", p: boolean, a: boolean, s: number) => onChange?.(stateOf(f, p, a, openid, s));
  const reset = (f = flow, p = pkce, a = attacker) => {
    setShown(0);
    emit(f, p, a, 0);
  };
  const next = () => {
    if (revealed || finished) return;
    setShown(shown + 1);
    emit(flow, pkce, attacker, shown + 1);
  };
  const all = () => {
    if (revealed) return;
    setShown(rows.length);
    emit(flow, pkce, attacker, rows.length);
  };
  const st = stateOf(flow, pkce, attacker, openid, shown);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {props.flowToggle && (
          <Segmented
            label="Flow"
            value={flow}
            disabled={revealed}
            options={[
              { id: "code", label: "Authorization code" },
              { id: "implicit", label: "Implicit (retired)" },
            ]}
            onChange={(f) => {
              if (revealed) return;
              setFlow(f);
              reset(f, pkce, attacker);
            }}
          />
        )}
        {toggles.includes("pkce") && flow === "code" && (
          <Toggle
            on={pkce}
            disabled={revealed}
            onClick={() => {
              setPkce(!pkce);
              reset(flow, !pkce, attacker);
            }}
          >
            PKCE
          </Toggle>
        )}
        {toggles.includes("attacker") && (
          <Toggle
            on={attacker}
            disabled={revealed}
            onClick={() => {
              setAttacker(!attacker);
              reset(flow, pkce, !attacker);
            }}
          >
            Interceptor
          </Toggle>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2 sm:p-3">
        <div className="grid grid-cols-4">
          {LANES.map((l) => (
            <Caption key={l.id} className="truncate text-center">
              {l.id === "auth" ? (
                <>
                  <span className="sm:hidden">Auth</span>
                  <span className="hidden sm:inline">Auth server</span>
                </>
              ) : (
                l.label
              )}
            </Caption>
          ))}
        </div>
        <div ref={scroller} className="mt-1 max-h-[340px] overflow-y-auto">
          <div className="relative min-h-[110px] pb-1">
            {LANES.map((l, i) => (
              <div key={l.id} className="pointer-events-none absolute inset-y-0 w-px bg-[var(--line-strong)]" style={{ left: `${i * 25 + 12.5}%` }} />
            ))}
            {visible.length === 0 && <p className="relative py-9 text-center text-sm text-ink-3">Press Next to start the sign-in.</p>}
            {visible.map((r, i) =>
              r.kind === "msg" ? <Arrow key={`${flow}${pkce}${attacker}${i}`} row={r} fresh={i === visible.length - 1} /> : <NoteRow key={`${flow}${pkce}${attacker}${i}`} row={r} fresh={i === visible.length - 1} />,
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-3" aria-live="polite">
        {last ? (
          <div className="pop-in grid gap-1.5" key={`${shown}${flow}`}>
            <p className="text-sm font-semibold text-ink">
              {shown}. {last.title}
            </p>
            <Mono tone={last.tone} className="whitespace-pre-wrap text-[11.5px]">
              {last.detail}
            </Mono>
          </div>
        ) : (
          <p className="text-sm text-ink-3">Each step explains what is sent and why.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={next} disabled={revealed || finished}>
          <StepForward className="h-4 w-4" /> Next
        </button>
        <button type="button" className="btn !h-10" onClick={all} disabled={revealed || finished}>
          <FastForward className="h-4 w-4" /> Run to the end
        </button>
        <button type="button" className="btn !h-10" onClick={() => reset()} disabled={revealed || shown === 0}>
          <RotateCcw className="h-4 w-4" /> Replay
        </button>
      </div>

      {finished && (
        <Note tone={st.breached ? "bad" : "good"} className="pop-in mt-2">
          <span className="inline-flex items-start gap-1.5">
            {st.breached ? <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-bad" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-good" />}
            <span>
              {st.breached
                ? flow === "implicit"
                  ? "The token was exposed the moment it appeared in the address bar. That is why this flow was retired."
                  : "Without PKCE, whoever redeems the stolen code first gets the token."
                : st.blocked
                  ? "The stolen code was useless: only the app holding the verifier could redeem it."
                  : "SpokeLog can read your rides, and it never saw your password."}
            </span>
          </span>
        </Note>
      )}
    </div>
  );
}

export function checkOAuthFlow(state: unknown, goal: Record<string, unknown>) {
  const st = state as OAuthFlowState | undefined;
  if (!st) return false;
  if (typeof goal.flow === "string" && st.flow !== goal.flow) return false;
  if (typeof goal.pkce === "boolean" && st.pkce !== goal.pkce) return false;
  if (typeof goal.attacker === "boolean" && st.attacker !== goal.attacker) return false;
  if (goal.finished === true && !st.finished) return false;
  if (goal.blocked === true && !st.blocked) return false;
  if (goal.breached === true && !st.breached) return false;
  return true;
}
