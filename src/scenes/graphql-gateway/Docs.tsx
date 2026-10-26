"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, ShieldOff } from "lucide-react";
import { asArray, asStr, dig, isRecord, type GqlResult, type GqlSession, type Snapshot } from "./session";
import { FEATURE_INFO } from "./operations";
import { ErrorCard } from "./Explorer";
import { BTN, Empty, GhostRows, Locked, Notice, PaneFrame, SectionLabel } from "./ui";

/** The Docs pane: a schema browser built only from what your server says about itself (introspection). */

interface TypeRef {
  kind: string;
  name: string | null;
  ofType: TypeRef | null;
}
interface InputValue {
  name: string;
  description: string;
  type: TypeRef;
  defaultValue: string | null;
}
interface Field {
  name: string;
  description: string;
  args: InputValue[];
  type: TypeRef;
  deprecated: string | null;
}
interface GType {
  kind: string;
  name: string;
  description: string;
  fields: Field[];
  inputFields: InputValue[];
  interfaces: TypeRef[];
  enumValues: { name: string; description: string; deprecated: string | null }[];
  possibleTypes: TypeRef[];
}
interface SchemaDoc {
  types: Map<string, GType>;
  queryName: string | null;
  mutationName: string | null;
}

function toRef(v: unknown): TypeRef {
  if (!isRecord(v)) return { kind: "SCALAR", name: "?", ofType: null };
  return { kind: asStr(v.kind, "SCALAR"), name: typeof v.name === "string" ? v.name : null, ofType: isRecord(v.ofType) ? toRef(v.ofType) : null };
}

function toInput(v: unknown): InputValue | null {
  if (!isRecord(v) || typeof v.name !== "string") return null;
  return { name: v.name, description: asStr(v.description), type: toRef(v.type), defaultValue: typeof v.defaultValue === "string" ? v.defaultValue : null };
}

function parseSchema(data: unknown): SchemaDoc | null {
  const schema = dig(data, "__schema");
  if (!isRecord(schema)) return null;
  const types = new Map<string, GType>();
  for (const t of asArray(schema.types)) {
    if (!isRecord(t) || typeof t.name !== "string") continue;
    types.set(t.name, {
      kind: asStr(t.kind),
      name: t.name,
      description: asStr(t.description),
      fields: asArray(t.fields).flatMap((f) =>
        isRecord(f) && typeof f.name === "string"
          ? [
              {
                name: f.name,
                description: asStr(f.description),
                args: asArray(f.args).flatMap((a) => {
                  const i = toInput(a);
                  return i ? [i] : [];
                }),
                type: toRef(f.type),
                deprecated: f.isDeprecated === true ? asStr(f.deprecationReason, "deprecated") || "deprecated" : null,
              },
            ]
          : [],
      ),
      inputFields: asArray(t.inputFields).flatMap((a) => {
        const i = toInput(a);
        return i ? [i] : [];
      }),
      interfaces: asArray(t.interfaces).map(toRef),
      enumValues: asArray(t.enumValues).flatMap((e) =>
        isRecord(e) && typeof e.name === "string" ? [{ name: e.name, description: asStr(e.description), deprecated: e.isDeprecated === true ? asStr(e.deprecationReason, "deprecated") || "deprecated" : null }] : [],
      ),
      possibleTypes: asArray(t.possibleTypes).map(toRef),
    });
  }
  return { types, queryName: asStr(dig(schema, "queryType", "name")) || null, mutationName: asStr(dig(schema, "mutationType", "name")) || null };
}

function typeString(r: TypeRef): string {
  if (r.kind === "NON_NULL") return `${r.ofType ? typeString(r.ofType) : "?"}!`;
  if (r.kind === "LIST") return `[${r.ofType ? typeString(r.ofType) : "?"}]`;
  return r.name ?? "?";
}

function namedOf(r: TypeRef): string | null {
  let cur: TypeRef | null = r;
  while (cur && !cur.name) cur = cur.ofType;
  return cur?.name ?? null;
}

const SCALARS = new Set(["String", "Int", "Float", "Boolean", "ID"]);

const KIND_LABEL: Record<string, string> = {
  OBJECT: "type",
  INTERFACE: "interface",
  UNION: "union",
  ENUM: "enum",
  INPUT_OBJECT: "input",
  SCALAR: "scalar",
};

function TypeLink({ r, go, doc }: { r: TypeRef; go: (name: string) => void; doc: SchemaDoc }) {
  const name = namedOf(r);
  const text = typeString(r);
  if (!name || SCALARS.has(name) || !doc.types.has(name)) return <span className="font-mono text-[#fcd34d]">{text}</span>;
  const i = text.indexOf(name);
  return (
    <span className="font-mono">
      <span className="text-white/50">{text.slice(0, i)}</span>
      <button onClick={() => go(name)} className="text-[#f9a8d4] underline decoration-white/20 underline-offset-2 hover:text-white">
        {name}
      </button>
      <span className="text-white/50">{text.slice(i + name.length)}</span>
    </span>
  );
}

function FieldRow({ f, go, doc }: { f: Field; go: (n: string) => void; doc: SchemaDoc }) {
  return (
    <li className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1.5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-[11px]">
        <span className={`font-mono font-medium ${f.deprecated ? "text-white/40 line-through" : "text-white"}`}>{f.name}</span>
        {f.args.length > 0 && (
          <span className="font-mono text-white/55">
            (
            {f.args.map((a, i) => (
              <span key={a.name}>
                {i > 0 && ", "}
                <span className="text-white/80">{a.name}</span>: <TypeLink r={a.type} go={go} doc={doc} />
                {a.defaultValue !== null && <span className="text-white/35"> = {a.defaultValue}</span>}
              </span>
            ))}
            )
          </span>
        )}
        <span className="font-mono text-white/40">:</span>
        <TypeLink r={f.type} go={go} doc={doc} />
        {f.deprecated && <span className="ml-1 rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-1.5 py-px text-[9px] font-medium text-[#fbbf24]">deprecated</span>}
      </div>
      {f.description && <p className="mt-0.5 text-[10.5px] leading-snug text-white/50">{f.description}</p>}
      {f.deprecated && f.deprecated !== "deprecated" && <p className="mt-0.5 text-[10.5px] leading-snug text-[#fbbf24]/80">{f.deprecated}</p>}
    </li>
  );
}

function TypeView({ t, go, doc }: { t: GType; go: (n: string) => void; doc: SchemaDoc }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-px font-mono text-[9.5px] text-white/60">{KIND_LABEL[t.kind] ?? t.kind.toLowerCase()}</span>
          <h4 className="min-w-0 truncate font-mono text-[13px] font-semibold text-white">{t.name}</h4>
        </div>
        {t.description ? <p className="mt-1 text-[11px] leading-snug text-white/60">{t.description}</p> : <p className="mt-1 text-[10.5px] text-white/30">No description. Add one in your SDL and it shows up here.</p>}
        {t.interfaces.length > 0 && (
          <p className="mt-1 text-[10.5px] text-white/50">
            implements{" "}
            {t.interfaces.map((r, i) => (
              <span key={i}>
                {i > 0 && ", "}
                <TypeLink r={r} go={go} doc={doc} />
              </span>
            ))}
          </p>
        )}
      </div>
      {t.fields.length > 0 && (
        <div>
          <SectionLabel>Fields · {t.fields.length}</SectionLabel>
          <ul className="space-y-1.5">
            {t.fields.map((f) => (
              <FieldRow key={f.name} f={f} go={go} doc={doc} />
            ))}
          </ul>
        </div>
      )}
      {t.inputFields.length > 0 && (
        <div>
          <SectionLabel>Input fields · {t.inputFields.length}</SectionLabel>
          <ul className="space-y-1.5">
            {t.inputFields.map((f) => (
              <li key={f.name} className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1.5 text-[11px]">
                <span className="font-mono font-medium text-white">{f.name}</span>
                <span className="font-mono text-white/40">: </span>
                <TypeLink r={f.type} go={go} doc={doc} />
                {f.defaultValue !== null && <span className="font-mono text-white/35"> = {f.defaultValue}</span>}
                {f.description && <p className="mt-0.5 text-[10.5px] leading-snug text-white/50">{f.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {t.enumValues.length > 0 && (
        <div>
          <SectionLabel>Values · {t.enumValues.length}</SectionLabel>
          <ul className="space-y-1.5">
            {t.enumValues.map((v) => (
              <li key={v.name} className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1.5 text-[11px]">
                <span className={`font-mono font-medium ${v.deprecated ? "text-white/40 line-through" : "text-white"}`}>{v.name}</span>
                {v.deprecated && <span className="ml-1.5 rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-1.5 py-px text-[9px] font-medium text-[#fbbf24]">deprecated</span>}
                {v.description && <p className="mt-0.5 text-[10.5px] leading-snug text-white/50">{v.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {t.possibleTypes.length > 0 && (
        <div>
          <SectionLabel>{t.kind === "UNION" ? "Members" : "Implemented by"}</SectionLabel>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {t.possibleTypes.map((r, i) => (
              <span key={i} className="rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5">
                <TypeLink r={r} go={go} doc={doc} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RootView({ doc, go }: { doc: SchemaDoc; go: (n: string) => void }) {
  const roots = [doc.queryName, doc.mutationName].flatMap((n) => (n && doc.types.get(n) ? [doc.types.get(n)!] : []));
  const rest = [...doc.types.values()].filter((t) => !t.name.startsWith("__") && !roots.includes(t) && !SCALARS.has(t.name));
  const kinds = ["OBJECT", "INTERFACE", "UNION", "ENUM", "INPUT_OBJECT", "SCALAR"];
  return (
    <div className="space-y-3.5">
      {roots.map((t) => (
        <div key={t.name}>
          <SectionLabel
            right={
              <button onClick={() => go(t.name)} className="text-[10.5px] text-white/45 underline underline-offset-2 hover:text-white">
                open {t.name}
              </button>
            }
          >
            {t.name === doc.queryName ? "Query: what you can ask" : "Mutation: what you can change"}
          </SectionLabel>
          <ul className="space-y-1.5">
            {t.fields.map((f) => (
              <FieldRow key={f.name} f={f} go={go} doc={doc} />
            ))}
          </ul>
        </div>
      ))}
      <div>
        <SectionLabel>All types · {rest.length}</SectionLabel>
        <div className="space-y-2">
          {kinds.map((k) => {
            const list = rest.filter((t) => t.kind === k);
            if (!list.length) return null;
            return (
              <div key={k} className="flex flex-wrap items-center gap-1.5">
                <span className="hud-label w-14 shrink-0">{KIND_LABEL[k]}</span>
                {list.map((t) => (
                  <button key={t.name} onClick={() => go(t.name)} className="rounded-full border border-white/12 bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] text-white/80 hover:bg-white/10">
                    {t.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props {
  session: GqlSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
}

export function DocsPane({ session, snap, unlocked, focus }: Props) {
  const on = unlocked.has("gql-docs");
  const info = FEATURE_INFO["gql-docs"];
  const [path, setPath] = useState<string[]>([]);
  const intro = snap.introspection;

  useEffect(() => {
    if (on) session.loadIntrospection("introspection");
    // reload when the production toggle flips; data changes do not alter the schema
  }, [session, on, intro, snap.identity]);

  const r: GqlResult | undefined = snap.cache["introspection"]?.value;
  const doc = useMemo(() => (r?.ok ? parseSchema(r.data) : null), [r]);
  const current = path.length ? doc?.types.get(path[path.length - 1]) : undefined;
  const go = (name: string) => setPath((p) => [...p, name]);
  const disabledErr = r?.errors.find((e) => /introspection/i.test(e.message));

  return (
    <PaneFrame
      title="Docs"
      icon={<BookOpen className="h-3.5 w-3.5" aria-hidden />}
      hint="A schema browser built from introspection: the server describes itself, no separate docs to maintain."
      actions={
        on ? (
          <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/60" title="Calls your set_introspection(enabled)">
            <input
              type="checkbox"
              className="h-3 w-3 accent-[#c5ee8a]"
              checked={!intro}
              disabled={!session.hasHook("set_introspection")}
              onChange={(e) => {
                setPath([]);
                session.setIntrospection(!e.target.checked);
              }}
            />
            Production mode
          </label>
        ) : null
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:thin]">
        {!on ? (
          <Locked title={info.title} need={info.need} lesson={info.lesson} spot={focus === "gql-docs"}>
            <GhostRows rows={5} />
          </Locked>
        ) : !r ? (
          <Empty>Asking your server to describe itself…</Empty>
        ) : !r.ok ? (
          <Notice tone="bad">{r.problem}</Notice>
        ) : disabledErr ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-dashed border-white/15 p-3 text-center">
              <ShieldOff className="mx-auto h-5 w-5 text-white/35" aria-hidden />
              <p className="mt-1.5 text-[12px] font-medium text-white/85">Introspection is disabled</p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/50">Production mode hides the schema from strangers. Your own tools and tests still know it. Uncheck Production mode to browse again.</p>
            </div>
            <ErrorCard error={disabledErr} inspect={false} />
          </div>
        ) : !doc ? (
          <div className="space-y-2">
            {r.errors.slice(0, 3).map((e, i) => (
              <ErrorCard key={i} error={e} inspect={false} />
            ))}
            <Empty tone="warn">The introspection query did not return a __schema. If you added a depth or cost limit, make sure introspection is exempt from it.</Empty>
          </div>
        ) : (
          <div>
            <nav aria-label="Breadcrumb" className="mb-2.5 flex flex-wrap items-center gap-1 text-[10.5px]">
              <button onClick={() => setPath([])} className={path.length ? "text-white/55 hover:text-white" : "font-medium text-white"}>
                Schema
              </button>
              {path.map((n, i) => (
                <React.Fragment key={`${n}-${i}`}>
                  <ChevronRight className="h-3 w-3 text-white/25" aria-hidden />
                  <button onClick={() => setPath(path.slice(0, i + 1))} className={`font-mono ${i === path.length - 1 ? "font-medium text-white" : "text-white/55 hover:text-white"}`}>
                    {n}
                  </button>
                </React.Fragment>
              ))}
              {path.length > 0 && (
                <button onClick={() => setPath(path.slice(0, -1))} className={`${BTN} ml-auto !h-6`}>
                  Back
                </button>
              )}
            </nav>
            {current ? <TypeView t={current} go={go} doc={doc} /> : path.length ? <Empty>No type named {path[path.length - 1]}.</Empty> : <RootView doc={doc} go={go} />}
            <p className="mt-3 text-[10px] text-white/30">{doc.types.size} types discovered through __schema</p>
          </div>
        )}
      </div>
    </PaneFrame>
  );
}
