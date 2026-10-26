"use client";

import React, { useState } from "react";
import { Flag } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, sameSet } from "./ui";

/**
 * A leak hunt. Four places a secret tends to end up in (code, logs, an image recipe, docs): tap
 * every line that gives away something an attacker could use. Some lines look alarming and are
 * not (public identifiers, placeholders, a git hash), which is half the skill.
 */

interface Line {
  id: string;
  text: string;
  secret: boolean;
  why: string;
}
interface File {
  id: string;
  name: string;
  lines: Line[];
}

const FILES: File[] = [
  {
    id: "code",
    name: "settings.py",
    lines: [
      { id: "c1", text: 'SITE_URL = "https://dovetail.example"', secret: false, why: "A public address. Nothing to steal." },
      { id: "c2", text: 'SMS_API_KEY = "pkt_live_51Hq8vLm2Zt9XcQ"', secret: true, why: "A live API key written into source. Anyone who can read the repository can send texts as the clinic, and git remembers it forever." },
      { id: "c3", text: 'DATABASE_URL = "postgres://app:Tr0ub4dor-x@db.internal/clinic"', secret: true, why: "A database password inside a connection string." },
      { id: "c4", text: 'MAPS_CLIENT_ID = "8841-clinic.apps.example.com"', secret: false, why: "A client id is a public name, like a username. It is not a credential on its own." },
      { id: "c5", text: 'SESSION_SECRET = os.environ["SESSION_SECRET"]', secret: false, why: "The value is read from the environment at start-up. The code names the secret but does not contain it." },
    ],
  },
  {
    id: "log",
    name: "app.log",
    lines: [
      { id: "l1", text: "12:01:07 INFO  booking created id=118 patient=41", secret: false, why: "Ids, not credentials. (Still personal data, so be thoughtful about who reads logs.)" },
      { id: "l2", text: "12:01:09 DEBUG calling sms provider headers={'Authorization': 'Bearer eyJhbGciOiJIUzI1NiJ9…'}", secret: true, why: "A bearer token in a log line. Logs are copied to many places and read by many people." },
      { id: "l3", text: "12:01:12 INFO  login ok user=dana ip=203.0.113.9", secret: false, why: "Who and from where, no password or token. Exactly what a log should say." },
      { id: "l4", text: "12:01:20 INFO  reset mail sent link=https://dovetail.example/reset?token=9d2f7a41c0b8", secret: true, why: "A working password-reset token. Anyone reading the log can take over that account." },
      { id: "l5", text: "12:02:03 INFO  deployed build 4f2a9c1e", secret: false, why: "A commit hash looks random but is just a label." },
    ],
  },
  {
    id: "docker",
    name: "Dockerfile",
    lines: [
      { id: "d1", text: "FROM python:3.12-slim", secret: false, why: "A base image name." },
      { id: "d2", text: "ENV PAYMENTS_SECRET=pkt_live_4eC39HqLyjWDar", secret: true, why: "ENV bakes the value into the image. Everyone who can pull the image can read it with a single command." },
      { id: "d3", text: "ARG APP_VERSION=1.4.2", secret: false, why: "A version number." },
      { id: "d4", text: "COPY id_rsa /root/.ssh/id_rsa", secret: true, why: "A private SSH key copied into an image layer. Deleting it in a later layer does not remove it from the earlier one." },
    ],
  },
  {
    id: "docs",
    name: "README.md",
    lines: [
      { id: "r1", text: "Copy .env.example to .env and fill it in.", secret: false, why: "Instructions, not secrets." },
      { id: "r2", text: "SMS_API_KEY=replace-me", secret: false, why: "An obvious placeholder. Example files should look like this." },
      { id: "r3", text: 'curl "https://api.dovetail.example/export?api_key=live_8c1f52a7e9d3"', secret: true, why: "A live key pasted into the docs, inside a URL where it will also land in server logs and browser history." },
      { id: "r4", text: "Public site key (safe to expose): pkt_pub_TYooMQauvdEDq54", secret: false, why: "Published on purpose: this kind of key is designed to sit in the web page, and it can only do harmless things." },
    ],
  },
];

export interface SecretsHuntProps {
  /** Restrict to some files by id. */
  files?: string[];
}

export interface SecretsHuntState {
  flagged: string[];
  /** Number of flagged lines that really are secrets. */
  hits: number;
  falseAlarms: number;
  missed: number;
  exact: boolean;
}

export function SecretsHunt({ props, onChange, revealed, status }: WidgetProps<SecretsHuntProps>) {
  const files = props.files ? FILES.filter((f) => props.files!.includes(f.id)) : FILES;
  const [tab, setTab] = useState(files[0].id);
  const [flagged, setFlagged] = useState<string[]>([]);
  const lines = files.flatMap((f) => f.lines);
  const truth = lines.filter((l) => l.secret).map((l) => l.id);

  const summarize = (f: string[]): SecretsHuntState => ({
    flagged: f,
    hits: f.filter((id) => truth.includes(id)).length,
    falseAlarms: f.filter((id) => !truth.includes(id)).length,
    missed: truth.filter((id) => !f.includes(id)).length,
    exact: sameSet(f, truth),
  });
  const toggle = (id: string) => {
    if (revealed) return;
    const next = flagged.includes(id) ? flagged.filter((x) => x !== id) : [...flagged, id];
    setFlagged(next);
    onChange?.(summarize(next));
  };

  const file = files.find((f) => f.id === tab) ?? files[0];
  const showAll = revealed || status === "revealed";

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap gap-1.5">
        {files.map((f) => {
          const n = f.lines.filter((l) => flagged.includes(l.id)).length;
          return (
            <Pill key={f.id} on={tab === f.id} onClick={() => setTab(f.id)}>
              <span className="font-mono text-[13px]">{f.name}</span>
              {n > 0 && <span className="rounded-full bg-black/10 px-1.5 text-[11px] dark:bg-white/15">{n}</span>}
            </Pill>
          );
        })}
      </div>
      <Caption className="mt-3 mb-1.5">Tap every line that leaks a secret</Caption>
      <ul className="grid gap-1.5">
        {file.lines.map((l, i) => {
          const on = flagged.includes(l.id);
          const wrong = showAll && on !== l.secret;
          const rightHit = showAll && l.secret;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => toggle(l.id)}
                aria-pressed={on}
                disabled={revealed}
                className={`flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:cursor-default ${
                  wrong ? "border-[var(--bad)]/60 bg-[var(--bad)]/[0.07]" : on ? "border-[var(--brand)] bg-tint" : rightHit ? "border-[var(--brand)]/60 bg-surface" : "border-line bg-surface hover:border-[var(--line-strong)]"
                }`}
              >
                <span className="mt-0.5 w-4 shrink-0 text-right font-mono text-[11px] text-ink-3">{i + 1}</span>
                <span className="min-w-0 flex-1 break-all font-mono text-[12px] leading-snug text-ink">{l.text}</span>
                {on && <Flag className="mt-0.5 h-4 w-4 shrink-0 text-brand" />}
              </button>
              {showAll && <p className="pop-in px-1 pt-1 text-[12.5px] leading-snug text-ink-2">{l.why}</p>}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-3">
        {flagged.length} line{flagged.length === 1 ? "" : "s"} flagged across {files.length} file{files.length === 1 ? "" : "s"}
        {status === "wrong" ? ". Not quite: some are missing, or some are not really secrets." : ""}
      </p>
      {status === "revealed" && <Note tone="accent" className="mt-2">Public identifiers, placeholders, hashes and environment lookups are not secrets. Live keys, passwords, tokens and private keys are.</Note>}
    </div>
  );
}

export function checkSecretsHunt(state: unknown, goal: Record<string, unknown>) {
  const st = state as SecretsHuntState | undefined;
  if (!st) return false;
  if (goal.exact === true && !st.exact) return false;
  return true;
}
