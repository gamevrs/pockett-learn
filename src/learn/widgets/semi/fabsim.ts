/**
 * A toy process-flow model for the fab widget: a cross-section of COLS columns of a silicon wafer, each a stack of
 * one-unit layers. One mask, with an opening over columns OPEN_FROM..OPEN_TO, is used for every exposure.
 * Simplified on purpose: every film is one unit thick, the etch is perfectly directional and stops on silicon,
 * oxide only grows on bare silicon, and deposition fills to a flat top. No React here, so it runs in Node.
 */

export const COLS = 12;
export const OPEN_FROM = 4;
export const OPEN_TO = 7;
export const isOpen = (c: number) => c >= OPEN_FROM && c <= OPEN_TO;

/** ox = silicon dioxide, res = photoresist, resx = exposed resist, metal = copper. */
export type Layer = "ox" | "res" | "resx" | "metal";

export interface Wafer {
  cols: Layer[][];
  doped: boolean[];
}

export type OpId = "oxidize" | "coat" | "expose" | "develop" | "etch" | "strip" | "implant" | "deposit" | "cmp";

export const OPS: { id: OpId; label: string; what: string }[] = [
  { id: "oxidize", label: "Oxidise", what: "grow silicon dioxide on bare silicon in a hot furnace" },
  { id: "coat", label: "Coat resist", what: "spin a thin film of light-sensitive photoresist over the wafer" },
  { id: "expose", label: "Expose", what: "shine light through the mask; the open part of the mask lets it through" },
  { id: "develop", label: "Develop", what: "wash the wafer in developer, which dissolves exposed resist" },
  { id: "etch", label: "Etch", what: "a directional plasma etch removes the top film wherever resist does not cover it" },
  { id: "strip", label: "Strip resist", what: "remove all remaining resist" },
  { id: "implant", label: "Implant", what: "fire dopant ions at the wafer; they dope bare silicon and stop in anything on top" },
  { id: "deposit", label: "Deposit metal", what: "coat the wafer with copper, filling any holes" },
  { id: "cmp", label: "Polish (CMP)", what: "chemical-mechanical polishing grinds the top flat, down to the oxide" },
];

export const freshWafer = (): Wafer => ({ cols: Array.from({ length: COLS }, () => []), doped: Array(COLS).fill(false) });

const top = (col: Layer[]) => col[col.length - 1];
const hasResist = (w: Wafer) => w.cols.some((c) => c.some((l) => l === "res" || l === "resx"));

export interface OpResult {
  wafer: Wafer;
  /** What happened, in a sentence the learner reads. */
  note: string;
  /** True when the step did something a real engineer would call a mistake (or did nothing). */
  mistake: boolean;
}

/** Apply one process step to a wafer (pure). */
export function applyOp(w: Wafer, op: OpId): OpResult {
  const cols = w.cols.map((c) => c.slice());
  const doped = w.doped.slice();
  const maxH = Math.max(...cols.map((c) => c.length));
  const done = (note: string, mistake = false): OpResult => ({ wafer: { cols, doped }, note, mistake });

  switch (op) {
    case "oxidize": {
      if (hasResist(w)) {
        for (const c of cols) for (let i = c.length - 1; i >= 0; i--) if (c[i] === "res" || c[i] === "resx") c.splice(i, 1);
        return done("Resist is a plastic: in a furnace at around 1,000 °C it burns. The resist is gone and the pattern with it. Strip resist before any hot step.", true);
      }
      let grew = 0;
      cols.forEach((c) => {
        if (c.length === 0) {
          c.push("ox");
          grew++;
        }
      });
      return grew ? done(`Oxide grew on ${grew === COLS ? "the whole wafer" : `${grew} columns of bare silicon`}. Oxide only grows where silicon is exposed to the hot oxygen.`) : done("No bare silicon to oxidise: everything is already covered.", true);
    }
    case "coat": {
      if (hasResist(w)) return done("The wafer is already coated with resist.", true);
      cols.forEach((c) => {
        while (c.length < maxH + 1) c.push("res");
      });
      return done("Resist spun on: a smooth light-sensitive film covers everything.");
    }
    case "expose": {
      if (!hasResist(w)) return done("There is no resist to record the light. The pattern passed straight over the wafer and left nothing behind.", true);
      let hit = 0;
      cols.forEach((c, i) => {
        if (!isOpen(i)) return;
        for (let k = 0; k < c.length; k++)
          if (c[k] === "res") {
            c[k] = "resx";
            hit++;
          }
      });
      return hit ? done("Light through the mask's opening changed the resist under it (shown striped). Nothing visible has been removed yet.") : done("Nothing new to expose: the resist under the mask opening is already exposed or already gone.", true);
    }
    case "develop": {
      const any = cols.some((c) => c.includes("resx"));
      if (!any) return done(hasResist(w) ? "Nothing dissolves: no resist has been exposed yet, so the developer has nothing to remove." : "There is no resist on the wafer to develop.", true);
      cols.forEach((c) => {
        for (let i = c.length - 1; i >= 0; i--) if (c[i] === "resx") c.splice(i, 1);
      });
      return done("The exposed resist washed away. The resist now has a window: the mask's pattern is on the wafer.");
    }
    case "etch": {
      const resist = hasResist(w);
      let removed = 0;
      let covered = 0;
      cols.forEach((c) => {
        const t = top(c);
        if (t === "res" || t === "resx") {
          covered++;
          return;
        }
        if (t === "ox" || t === "metal") {
          while (c.length && top(c) === t) c.pop();
          removed++;
        }
      });
      if (!removed) return done(covered ? "Nothing etched: resist covers every column. Expose and develop first to open a window." : "Nothing to etch: the etch stops on bare silicon.", true);
      if (!resist) return done(`No resist to protect anything: the etch stripped the top film from ${removed === COLS ? "the whole wafer" : `every column that had one (${removed})`}.`, true);
      return done(`The etch removed the film in the ${removed} uncovered column${removed > 1 ? "s" : ""}; resist protected the rest.`);
    }
    case "strip": {
      if (!hasResist(w)) return done("There is no resist to strip.", true);
      // the resist held a pattern only if developing opened a window in it somewhere
      const patterned = w.cols.some((c) => !c.includes("res") && !c.includes("resx"));
      cols.forEach((c) => {
        for (let i = c.length - 1; i >= 0; i--) if (c[i] === "res" || c[i] === "resx") c.splice(i, 1);
      });
      return patterned ? done("Resist stripped. Only the films underneath are left.") : done("Resist stripped before it was patterned: it never did anything.", true);
    }
    case "implant": {
      let hit = 0;
      cols.forEach((c, i) => {
        if (c.length === 0 && !doped[i]) {
          doped[i] = true;
          hit++;
        }
      });
      const bare = cols.filter((c) => c.length === 0).length;
      if (!hit) return done(bare ? "Those columns were already doped." : "Every column is covered, so the ions stopped in the films on top. No silicon was doped.", true);
      if (bare === COLS) return done("Nothing on the wafer blocked the ions: the whole surface is doped.", true);
      return done(`Dopant ions reached ${hit} column${hit > 1 ? "s" : ""} of bare silicon; oxide and resist stopped them everywhere else.`);
    }
    case "deposit": {
      cols.forEach((c) => {
        while (c.length < maxH + 1) c.push("metal");
      });
      return done("Copper now covers the wafer and fills every hole, with a flat layer on top.");
    }
    case "cmp": {
      const oxTop = Math.max(0, ...cols.map((c) => c.lastIndexOf("ox") + 1));
      const level = oxTop > 0 ? oxTop : Math.min(...cols.map((c) => c.length));
      let cut = 0;
      cols.forEach((c) => {
        while (c.length > level) {
          c.pop();
          cut++;
        }
      });
      if (!cut) return done("Polished, but nothing stood above the oxide: the wafer was already flat.", true);
      return done(oxTop > 0 ? "Polished down to the top of the oxide: the copper is left only inside the holes." : "Polished flat.");
    }
  }
}

/** Replay a recipe from a fresh wafer. */
export function runRecipe(recipe: OpId[]): { wafer: Wafer; results: OpResult[] } {
  let w = freshWafer();
  const results: OpResult[] = [];
  for (const op of recipe) {
    const r = applyOp(w, op);
    results.push(r);
    w = r.wafer;
  }
  return { wafer: w, results };
}

export type TaskId = "window" | "dope" | "wire";

export const TASKS: Record<TaskId, { title: string; goal: string; target: Wafer }> = {
  window: {
    title: "Open a window in the oxide",
    goal: "Oxide everywhere except over the mask opening, where the silicon is bare. No resist left.",
    target: { cols: Array.from({ length: COLS }, (_, i) => (isOpen(i) ? [] : ["ox" as Layer])), doped: Array(COLS).fill(false) },
  },
  dope: {
    title: "Dope only the window",
    goal: "The silicon under the mask opening is doped and nowhere else. No resist left (oxide may stay).",
    target: { cols: Array.from({ length: COLS }, (_, i) => (isOpen(i) ? [] : ["ox" as Layer])), doped: Array.from({ length: COLS }, (_, i) => isOpen(i)) },
  },
  wire: {
    title: "Inlay a copper wire",
    goal: "Copper inside the opening, flush with the oxide around it, and no copper or resist anywhere else.",
    target: { cols: Array.from({ length: COLS }, (_, i) => (isOpen(i) ? ["metal" as Layer] : ["ox" as Layer])), doped: Array(COLS).fill(false) },
  },
};

const same = (a: Layer[], b: Layer[]) => a.length === b.length && a.every((l, i) => l === b[i]);

/** Does this wafer meet the task? ("dope" accepts the oxide stripped or kept, as long as no resist is left.) */
export function meetsTask(w: Wafer, task: TaskId): boolean {
  const t = TASKS[task].target;
  if (w.cols.some((c) => c.includes("res") || c.includes("resx"))) return false;
  if (!w.doped.every((d, i) => d === t.doped[i])) return false;
  if (task === "dope") return w.cols.every((c, i) => (isOpen(i) ? c.length === 0 : same(c, ["ox"]) || c.length === 0));
  return w.cols.every((c, i) => same(c, t.cols[i]));
}
