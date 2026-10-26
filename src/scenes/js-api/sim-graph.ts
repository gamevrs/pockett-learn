import type { Store } from "./sim-data.ts";
import type { GraphDocument, GraphSelection } from "./types.ts";

/** A tiny GraphQL-style query parser and executor over the Dockline data. */

type Tok = { t: "punct" | "name" | "num" | "str" | "eof"; v: string; line: number; col: number };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const adv = (n = 1) => {
    for (let k = 0; k < n; k++) {
      if (src[i] === "\n") {
        line++;
        col = 1;
      } else col++;
      i++;
    }
  };
  while (i < src.length) {
    const ch = src[i];
    if (/[\s,]/.test(ch)) {
      adv();
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src[i] !== "\n") adv();
      continue;
    }
    const at = { line, col };
    if ("{}():".includes(ch)) {
      out.push({ t: "punct", v: ch, ...at });
      adv();
    } else if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: "name", v: src.slice(i, j), ...at });
      adv(j - i);
    } else if (/[0-9-]/.test(ch)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const text = src.slice(i, j);
      if (Number.isNaN(Number(text))) throw new SyntaxError(`Invalid number "${text}" at ${line}:${col}`);
      out.push({ t: "num", v: text, ...at });
      adv(j - i);
    } else if (ch === '"') {
      let j = i + 1;
      let text = "";
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\" && j + 1 < src.length) j++;
        if (src[j] === "\n") break;
        text += src[j++];
      }
      if (src[j] !== '"') throw new SyntaxError(`Unterminated string at ${line}:${col}`);
      out.push({ t: "str", v: text, ...at });
      adv(j + 1 - i);
    } else {
      throw new SyntaxError(`Unexpected character "${ch}" at ${line}:${col}`);
    }
  }
  out.push({ t: "eof", v: "", line, col });
  return out;
}

export function parseGraph(source: string): GraphDocument {
  const toks = tokenize(String(source ?? ""));
  let p = 0;
  const peek = () => toks[p];
  const fail = (expected: string): never => {
    const t = peek();
    throw new SyntaxError(`Expected ${expected} but found ${t.t === "eof" ? "the end of the query" : `"${t.v}"`} at ${t.line}:${t.col}`);
  };
  const punct = (c: string) => {
    if (peek().t === "punct" && peek().v === c) return toks[p++];
    return fail(`"${c}"`);
  };
  const isPunct = (c: string) => peek().t === "punct" && peek().v === c;

  function value(): string | number | boolean {
    const t = peek();
    if (t.t === "str") return toks[p++].v;
    if (t.t === "num") return Number(toks[p++].v);
    if (t.t === "name") {
      p++;
      return t.v === "true" ? true : t.v === "false" ? false : t.v;
    }
    return fail("a value");
  }

  function selectionSet(): GraphSelection[] {
    punct("{");
    const items: GraphSelection[] = [];
    while (!isPunct("}")) {
      if (peek().t === "eof") fail('"}"');
      items.push(selection());
    }
    if (items.length === 0) fail("a field name");
    punct("}");
    return items;
  }

  function selection(): GraphSelection {
    if (peek().t !== "name") fail("a field name");
    const name = toks[p++].v;
    const args: GraphSelection["args"] = {};
    if (isPunct("(")) {
      p++;
      while (!isPunct(")")) {
        if (peek().t !== "name") fail("an argument name");
        const key = toks[p++].v;
        punct(":");
        args[key] = value();
      }
      p++;
    }
    return { name, args, selections: isPunct("{") ? selectionSet() : [] };
  }

  if (peek().t === "name" && peek().v === "query") {
    p++;
    if (peek().t === "name") p++;
  }
  const selections = selectionSet();
  if (peek().t !== "eof") fail("the end of the query");
  return { operation: "query", selections };
}

// ───────────────────────── execution ─────────────────────────

export interface GraphError {
  message: string;
  path?: (string | number)[];
}

type Obj = Record<string, unknown>;
type FieldDef = { kind: "scalar" } | { kind: "object"; type: "Station" | "Bike"; list: boolean; resolve: (src: Obj, args: GraphSelection["args"], store: Store) => unknown };

const STATION_SCALARS = ["id", "name", "zone", "capacity", "x", "y"];
const BIKE_SCALARS = ["id", "stationId", "kind", "battery", "status"];

function fieldsOf(type: string): Record<string, FieldDef> {
  const f: Record<string, FieldDef> = {};
  if (type === "Station") {
    for (const s of STATION_SCALARS) f[s] = { kind: "scalar" };
    f.availableBikes = { kind: "scalar" };
    f.bikes = {
      kind: "object",
      type: "Bike",
      list: true,
      resolve: (src, args, store) => store.bikes.filter((b) => b.stationId === src.id && b.status !== "rented" && (args.kind === undefined || b.kind === args.kind) && (args.status === undefined || b.status === args.status)),
    };
  } else {
    for (const s of BIKE_SCALARS) f[s] = { kind: "scalar" };
    f.station = { kind: "object", type: "Station", list: false, resolve: (src, _a, store) => store.stations.find((s) => s.id === src.stationId) ?? null };
  }
  return f;
}

const ROOTS: Record<string, { type: "Station" | "Bike"; list: boolean; args: string[]; resolve: (a: GraphSelection["args"], store: Store) => unknown }> = {
  stations: {
    type: "Station",
    list: true,
    args: ["zone", "minCapacity", "limit"],
    resolve: (a, s) => s.stations.filter((st) => (a.zone === undefined || st.zone === a.zone) && (a.minCapacity === undefined || st.capacity >= Number(a.minCapacity))).slice(0, a.limit === undefined ? 50 : Math.max(0, Number(a.limit))),
  },
  station: { type: "Station", list: false, args: ["id"], resolve: (a, s) => s.stations.find((st) => st.id === a.id) ?? null },
  bikes: {
    type: "Bike",
    list: true,
    args: ["stationId", "kind", "status", "limit"],
    resolve: (a, s) => s.bikes.filter((b) => (a.stationId === undefined || b.stationId === a.stationId) && (a.kind === undefined || b.kind === a.kind) && (a.status === undefined || b.status === a.status)).slice(0, a.limit === undefined ? 50 : Math.max(0, Number(a.limit))),
  },
  bike: { type: "Bike", list: false, args: ["id"], resolve: (a, s) => s.bikes.find((b) => b.id === a.id) ?? null },
};

export function executeGraph(doc: GraphDocument, store: Store): { data: Obj | null; errors: GraphError[] } {
  const errors: GraphError[] = [];

  function project(type: "Station" | "Bike", src: Obj, sels: GraphSelection[], path: (string | number)[]): Obj {
    const defs = fieldsOf(type);
    const out: Obj = {};
    for (const sel of sels) {
      const def = defs[sel.name];
      const here = [...path, sel.name];
      if (!def) {
        errors.push({ message: `Cannot query field "${sel.name}" on type "${type}".`, path: here });
        out[sel.name] = null;
      } else if (def.kind === "scalar") {
        if (sel.selections.length > 0) {
          errors.push({ message: `Field "${sel.name}" is a scalar and cannot have a selection.`, path: here });
          out[sel.name] = null;
        } else if (sel.name === "availableBikes") {
          out[sel.name] = store.bikes.filter((b) => b.stationId === src.id && b.status === "available").length;
        } else {
          out[sel.name] = src[sel.name] ?? null;
        }
      } else if (sel.selections.length === 0) {
        errors.push({ message: `Field "${sel.name}" of type "${def.type}" must have a selection of subfields.`, path: here });
        out[sel.name] = null;
      } else {
        const v = def.resolve(src, sel.args, store);
        out[sel.name] = Array.isArray(v) ? v.map((item, i) => project(def.type, item as Obj, sel.selections, [...here, i])) : v ? project(def.type, v as Obj, sel.selections, here) : null;
      }
    }
    return out;
  }

  const data: Obj = {};
  for (const sel of doc.selections) {
    const root = ROOTS[sel.name];
    if (!root) {
      errors.push({ message: `Cannot query field "${sel.name}" on type "Query".`, path: [sel.name] });
      data[sel.name] = null;
      continue;
    }
    const unknownArg = Object.keys(sel.args).find((a) => !root.args.includes(a));
    if (unknownArg) {
      errors.push({ message: `Unknown argument "${unknownArg}" on field "Query.${sel.name}".`, path: [sel.name] });
      data[sel.name] = null;
      continue;
    }
    if (sel.selections.length === 0) {
      errors.push({ message: `Field "${sel.name}" of type "${root.type}" must have a selection of subfields.`, path: [sel.name] });
      data[sel.name] = null;
      continue;
    }
    const v = root.resolve(sel.args, store);
    data[sel.name] = Array.isArray(v) ? v.map((item, i) => project(root.type, item as Obj, sel.selections, [sel.name, i])) : v ? project(root.type, v as Obj, sel.selections, [sel.name]) : null;
  }
  return { data, errors };
}
