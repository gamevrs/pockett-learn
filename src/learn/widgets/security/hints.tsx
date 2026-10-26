"use client";

import React from "react";
import type { WidgetDef, WidgetProps } from "@/learn/widget";
import { Note } from "./ui";

type Goal = Record<string, unknown>;

/**
 * Wraps a widget so that after a wrong Check it shows a nudge under it, written from the goal.
 * The player only says "Not quite"; the widget knows what the task was and can say where to look.
 */
export function withHint(def: WidgetDef, hint: (goal: Goal) => string): WidgetDef {
  const Inner = def.Component;
  function Hinted(p: WidgetProps) {
    return (
      <div className="w-full max-w-2xl">
        <Inner {...p} />
        {p.status === "wrong" && p.goal && (
          <Note tone="bad" className="mt-2" >
            <span role="status">{hint(p.goal)}</span>
          </Note>
        )}
      </div>
    );
  }
  return { Component: Hinted, check: def.check };
}

export const HINTS = {
  threat: () => "Not quite. For each flow ask: does it start or end somewhere we do not control? A flow between two of our own systems does not cross the line.",
  gate: () => "Some rows are not right yet. 401 means the server does not know who is asking; 403 means it knows and says no; 200 means go ahead.",
  session: (g: Goal) =>
    g.mode === "token"
      ? "Not yet. Run the story in order: Log in, Attacker copies it, End Dana's access, then Attacker sends it, and read the result."
      : "Not yet. Run the story in order: Log in, Attacker copies it, End Dana's access, then Attacker sends it. Is the copy refused?",
  cookie: () => "Not yet. Each attack falls to one control: HttpOnly, Secure, SameSite Lax or Strict, the idle timeout, or a new id at login. Turn them on, then press Run all.",
  oauth: (g: Goal) =>
    g.pkce ? "Not yet. Switch on both PKCE and Interceptor, then press Run to the end." : g.attacker ? "Not yet. Switch the Interceptor on and press Run to the end." : "Not yet. Keep pressing Next, or Run to the end, until the flow finishes.",
  idor: () => "Not yet. Keep changing the id (or opening the forwarded link) until a booking marked NOT yours appears. With a check on, you should see none.",
  perms: () => "Not yet. A red cross means a job is missing a permission; a red chip means a permission nobody needs. Aim for no red.",
  supply: () => "Not yet. Look for the builds that ran version 2.3.2 or tampered files. There are three, across the policies and days.",
  inject: (g: Goal) =>
    g.outcome === "hidden" ? "Not yet. Use the example that starts with a quote and ends with two dashes, in the version that glues text into the query." : g.safe === true ? "Not yet. Keep the attack text in the box and switch the fix on." : "Not yet. Try the examples, then flip the switch.",
  tenant: (g: Goal) => (g.rls ? "Not yet. Switch row-level security on, then press Run all." : "Not yet. Rows with a red border are labelled wrongly. Run a query to see whose rows come back."),
  audit: (g: Goal) => (g.covered ? "Not yet. Tamper with an entry, switch on both options, then press Verify." : "Not yet. Tamper with the entry the task names, then press Verify the chain."),
};
