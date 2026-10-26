"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Lock, Minus, Package, Plus, RotateCcw, Search, ShoppingCart, Smartphone, Star, UserRound } from "lucide-react";
import {
  IDENTITIES,
  asArray,
  asNum,
  asStr,
  dig,
  isRecord,
  money,
  BROWSE_PAGE,
  type BrowseFilter,
  type GqlResult,
  type GqlSession,
  type IdentityId,
  type LogEntry,
  type Snapshot,
} from "./session";
import { ACCOUNTS_QUERY, ADMIN_QUERY, FEATURE_INFO, HOME_QUERY, MY_ORDERS_QUERY, SEARCH_QUERY, WHOAMI_QUERY, productPageQuery } from "./operations";
import { ErrorCard } from "./Explorer";
import { RestCompareCard } from "./Lab";
import { BTN, BTN_ON, CHIP, CHIP_ON, Empty, GhostGrid, GhostRows, INPUT, Locked, Notice, PaneFrame, Tabs } from "./ui";

/** The client app pane: a tiny mobile shop that only talks to your execute() through GraphQL. */

type Screen = "home" | "search" | "browse" | "orders" | "admin" | "product";
type TabId = "home" | "search" | "browse" | "orders" | "admin";

interface Props {
  session: GqlSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
  fresh: ReadonlySet<string>;
}

const slot = (snap: Snapshot, name: string): GqlResult | undefined => snap.cache[name]?.value;

// ───────────────────────── small pieces ─────────────────────────

function Tile({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-md bg-gradient-to-br from-white/[0.09] to-white/[0.02] ${className}`}>
      <Package className="h-[36%] w-[36%] min-h-5 min-w-5 text-white/40" strokeWidth={1.5} aria-hidden />
      {label && <span className="absolute left-1.5 top-1.5 rounded-full bg-black/40 px-1.5 py-px text-[8.5px] font-medium uppercase tracking-wide text-white/55">{label}</span>}
    </div>
  );
}

function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`inline-flex items-center gap-px text-[#fbbf24] ${className}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3 w-3 ${n <= full ? "fill-current" : "text-white/20"}`} aria-hidden />
      ))}
    </span>
  );
}

/** What went wrong with a load, in plain words. `friendly` lets a screen handle known error codes itself. */
function Failure({ result, title = "The server could not answer that", children }: { result: GqlResult; title?: string; children?: React.ReactNode }) {
  if (!result.ok) {
    return (
      <Notice tone="bad">
        <span className="font-medium">{title}.</span> {result.problem}
      </Notice>
    );
  }
  return (
    <div className="space-y-1.5">
      {children}
      {result.errors.slice(0, 4).map((e, i) => (
        <ErrorCard key={i} error={e} inspect={false} />
      ))}
    </div>
  );
}

interface ProductLite {
  id: string;
  name: string;
  priceCents: number;
  inStock: boolean | null;
}

function toProductLite(v: unknown): ProductLite | null {
  if (!isRecord(v)) return null;
  const id = asStr(v.id);
  if (!id) return null;
  return { id, name: asStr(v.name, `Product ${id}`), priceCents: asNum(v.priceCents), inStock: typeof v.inStock === "boolean" ? v.inStock : null };
}

function ProductCard({ p, onOpen, canOpen }: { p: ProductLite; onOpen: (id: string) => void; canOpen: boolean }) {
  return (
    <button
      onClick={() => onOpen(p.id)}
      disabled={!canOpen}
      title={canOpen ? undefined : "The product page unlocks in lesson 5"}
      className="group min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1.5 text-left transition-colors enabled:hover:border-white/20 enabled:hover:bg-white/[0.06] disabled:cursor-default"
    >
      <Tile className="aspect-[4/3]" />
      <div className="mt-1.5 truncate text-[11px] font-medium text-white/90">{p.name}</div>
      <div className="flex items-center justify-between gap-1">
        <span className="hud-value text-[11px] text-[#e0f6c1]">{money(p.priceCents)}</span>
        {p.inStock === false && <span className="text-[9.5px] font-medium text-[#f87171]">Sold out</span>}
      </div>
    </button>
  );
}

// ───────────────────────── screens ─────────────────────────

function HomeScreen({ session, snap, open, canOpen, goBrowse }: { session: GqlSession; snap: Snapshot; open: (id: string) => void; canOpen: boolean; goBrowse: ((category: string) => void) | null }) {
  useEffect(() => {
    session.load("home", { query: HOME_QUERY, name: "Home" }, "app");
  }, [session, snap.epoch, snap.identity]);
  const r = slot(snap, "home");
  if (!r) return <Empty>Loading…</Empty>;
  const cats = asArray(dig(r.data, "categories"));
  const items = asArray(dig(r.data, "newArrivals")).flatMap((v) => {
    const p = toProductLite(v);
    return p ? [p] : [];
  });
  return (
    <div className="space-y-3">
      {(!r.ok || r.errors.length > 0) && <Failure result={r} />}
      {cats.length > 0 && (
        <div>
          <div className="hud-label mb-1.5">Categories</div>
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c, i) => {
              const name = asStr(dig(c, "name"), "Category");
              return goBrowse ? (
                <button key={i} className={CHIP} onClick={() => goBrowse(asStr(dig(c, "slug"), name.toLowerCase()))}>
                  {name}
                </button>
              ) : (
                <span key={i} className={CHIP}>
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      )}
      <div>
        <div className="hud-label mb-1.5">New arrivals</div>
        {items.length === 0 ? (
          r.ok && r.errors.length === 0 ? (
            <Empty>newArrivals returned an empty list.</Empty>
          ) : null
        ) : (
          <div className="grid grid-cols-2 gap-2 @md:grid-cols-3 @2xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} p={p} onOpen={open} canOpen={canOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchScreen({ session, snap, open, canOpen }: { session: GqlSession; snap: Snapshot; open: (id: string) => void; canOpen: boolean }) {
  const [term, setTerm] = useState("desk");
  const [submitted, setSubmitted] = useState("desk");
  useEffect(() => {
    if (!submitted.trim()) return;
    session.load("search", { query: SEARCH_QUERY, variables: { term: submitted.trim() }, name: "Search" }, "app");
  }, [session, submitted, snap.epoch, snap.identity]);
  useEffect(() => {
    session.load("accounts", { query: ACCOUNTS_QUERY, name: "Accounts" }, "app");
  }, [session, snap.epoch, snap.identity]);
  const r = slot(snap, "search");
  const people = slot(snap, "accounts");
  const rows = asArray(dig(r?.data, "search"));
  return (
    <div className="space-y-3">
      <form
        className="flex min-w-0 gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(term);
        }}
      >
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products and categories" aria-label="Search term" className={`${INPUT} flex-1`} />
        <button type="submit" className={BTN_ON}>
          <Search className="h-3 w-3" aria-hidden /> Search
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {["desk", "lamp", "audio", "bag", "zzz"].map((t) => (
          <button
            key={t}
            className={CHIP}
            onClick={() => {
              setTerm(t);
              setSubmitted(t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {r && (!r.ok || r.errors.length > 0) && <Failure result={r} />}
      {r && r.ok && r.errors.length === 0 && rows.length === 0 && <Empty>Nothing matches “{submitted}”.</Empty>}
      {rows.length > 0 && (
        <ul className="space-y-1.5">
          {rows.map((row, i) => {
            const type = asStr(dig(row, "__typename"), "?");
            const p = type === "Product" ? toProductLite(row) : null;
            return (
              <li key={i} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
                <span className="rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-px font-mono text-[9.5px] text-white/60">{type}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-white/90">{asStr(dig(row, "name"), "(no name)")}</span>
                {p && <span className="hud-value shrink-0 text-[11px] text-[#e0f6c1]">{money(p.priceCents)}</span>}
                {p && canOpen && (
                  <button className="shrink-0 text-[10.5px] text-white/50 underline underline-offset-2 hover:text-white" onClick={() => open(p.id)}>
                    open
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <div className="hud-label mb-1.5">People (Account interface)</div>
        {people && (!people.ok || people.errors.length > 0) && <Failure result={people} />}
        <ul className="space-y-1.5">
          {asArray(dig(people?.data, "users")).map((u, i) => {
            const type = asStr(dig(u, "__typename"), "Account");
            const extra =
              type === "Customer"
                ? `${asNum(dig(u, "orderCount"))} order${asNum(dig(u, "orderCount")) === 1 ? "" : "s"}`
                : type === "Admin"
                  ? asArray(dig(u, "permissions")).map((x) => asStr(x)).join(", ") || "no permissions"
                  : "";
            return (
              <li key={i} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-semibold text-white/70">{asStr(dig(u, "name"), "?").slice(0, 1)}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-white/90">{asStr(dig(u, "name"), "(no name)")}</span>
                <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-px font-mono text-[9.5px] text-white/60">{type}</span>
                {extra && <span className="hidden max-w-[40%] shrink truncate text-[10.5px] text-white/45 @sm:block">{extra}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const SORTS = [
  { id: "NAME", label: "Name A–Z" },
  { id: "PRICE_ASC", label: "Price: low to high" },
  { id: "PRICE_DESC", label: "Price: high to low" },
  { id: "NEWEST", label: "Newest" },
];
const CATS = [
  { id: "", label: "All" },
  { id: "audio", label: "Audio" },
  { id: "desk", label: "Desk" },
  { id: "lighting", label: "Lighting" },
  { id: "bags", label: "Bags" },
  { id: "kitchen", label: "Kitchen" },
];
const PRICE_CAPS = [
  { id: "any", label: "Any price", cents: null as number | null },
  { id: "30", label: "Under $30", cents: 3000 },
  { id: "60", label: "Under $60", cents: 6000 },
  { id: "100", label: "Under $100", cents: 10000 },
];
function BrowseScreen({ session, snap, open, canOpen }: { session: GqlSession; snap: Snapshot; open: (id: string) => void; canOpen: boolean }) {
  const b = snap.browse;
  const filter = b.filter;
  const [search, setSearch] = useState(filter.search);
  const cap = PRICE_CAPS.find((c) => c.cents === filter.maxPriceCents)?.id ?? "any";
  const empty = b.pages === 0;
  useEffect(() => {
    // first load, and again after anything resets the list (identity change, reset data)
    if (empty) session.browseRun(session.getSnapshot().browse.filter, BROWSE_PAGE, false);
  }, [session, empty]);
  const apply = (patch: Partial<BrowseFilter>) => session.browseRun({ ...filter, ...patch }, BROWSE_PAGE, false);
  return (
    <div className="space-y-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply({ search })}
          onBlur={() => search !== filter.search && apply({ search })}
          placeholder="Search…"
          aria-label="Search products"
          className={`${INPUT} min-w-[7rem] flex-1`}
        />
        <select aria-label="Sort" value={filter.sort} onChange={(e) => apply({ sort: e.target.value })} className="h-7 min-w-0 rounded-md border border-white/12 bg-[#141414] px-1.5 text-[11px] text-white outline-none focus:border-[#c5ee8a]/60">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {CATS.map((c) => (
          <button key={c.id} className={`${CHIP} ${filter.category === c.id ? CHIP_ON : ""}`} onClick={() => apply({ category: c.id })}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <select aria-label="Price" value={cap} onChange={(e) => apply({ maxPriceCents: PRICE_CAPS.find((c) => c.id === e.target.value)?.cents ?? null })} className="h-6 rounded-md border border-white/12 bg-[#141414] px-1.5 text-[10.5px] text-white outline-none focus:border-[#c5ee8a]/60">
          {PRICE_CAPS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/65">
          <input type="checkbox" checked={filter.inStock} onChange={(e) => apply({ inStock: e.target.checked })} className="h-3 w-3 accent-[#c5ee8a]" />
          In stock only
        </label>
      </div>

      {b.result && (!b.result.ok || b.result.errors.length > 0) && <Failure result={b.result} />}
      {b.result?.ok && b.items.length === 0 && b.result.errors.length === 0 && <Empty>No products match these filters.</Empty>}
      <ul className="space-y-1.5">
        {b.items.map((it) => (
          <li key={`${it.id}-${it.cursor}`}>
            <button
              onClick={() => open(it.id)}
              disabled={!canOpen}
              className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-left enabled:hover:bg-white/[0.06] disabled:cursor-default"
            >
              <Tile className="h-8 w-8 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-medium text-white/90">{it.name}</span>
                <span className="block truncate text-[10px] text-white/40">{it.category || "–"}</span>
              </span>
              <span className="hud-value shrink-0 text-[11px] text-[#e0f6c1]">{money(it.priceCents)}</span>
            </button>
          </li>
        ))}
      </ul>
      {b.result?.ok && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1.5">
          <span className="hud-value text-[10.5px] text-white/70">
            {b.items.length} of {b.total ?? "?"}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-white/40" title={b.endCursor ?? ""}>
            {b.endCursor ? `endCursor ${b.endCursor}` : "no endCursor"}
          </span>
          <button className={BTN} disabled={!b.hasNext} onClick={() => session.browseRun(filter, BROWSE_PAGE, true)}>
            {b.hasNext ? "Load more" : "End of list"}
          </button>
        </div>
      )}
    </div>
  );
}

function OrdersScreen({ session, snap }: { session: GqlSession; snap: Snapshot }) {
  useEffect(() => {
    session.load("orders", { query: MY_ORDERS_QUERY, name: "MyOrders" }, "app");
  }, [session, snap.epoch, snap.identity]);
  const r = slot(snap, "orders");
  if (!r) return <Empty>Loading…</Empty>;
  const unauth = r.errors.find((e) => e.code === "UNAUTHENTICATED");
  if (unauth) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-dashed border-white/15 p-3 text-center">
          <UserRound className="mx-auto h-5 w-5 text-white/35" aria-hidden />
          <p className="mt-1.5 text-[12px] font-medium text-white/85">Sign in to see your orders</p>
          <p className="mt-0.5 text-[11px] text-white/45">Your server answered UNAUTHENTICATED because no valid token came with the request. Pick an identity above.</p>
        </div>
        <ErrorCard error={unauth} inspect={false} />
      </div>
    );
  }
  const orders = asArray(dig(r.data, "orders"));
  return (
    <div className="space-y-2">
      {(!r.ok || r.errors.length > 0) && <Failure result={r} />}
      {r.ok && r.errors.length === 0 && orders.length === 0 && <Empty>No orders yet for this account.</Empty>}
      {orders.map((o, i) => {
        const status = asStr(dig(o, "status"), "?");
        const tone = status === "SHIPPED" || status === "PAID" ? "text-[#d3f3a4] border-[#c5ee8a]/35" : status === "CANCELLED" ? "text-[#f87171] border-[#f87171]/35" : "text-[#fbbf24] border-[#fbbf24]/35";
        return (
          <div key={i} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-white/90">Order #{asStr(dig(o, "id"), "?")}</span>
              <span className={`rounded-full border px-1.5 py-px font-mono text-[9.5px] ${tone}`}>{status}</span>
              <span className="text-[10px] text-white/40">{asStr(dig(o, "createdAt")).slice(0, 10)}</span>
              <span className="hud-value ml-auto text-[11px] text-[#e0f6c1]">{money(asNum(dig(o, "totalCents")))}</span>
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {asArray(dig(o, "items")).map((it, j) => (
                <li key={j} className="flex gap-2 text-[10.5px] text-white/60">
                  <span className="hud-value w-6 shrink-0 text-white/45">{asNum(dig(it, "quantity"), 1)}×</span>
                  <span className="min-w-0 truncate">{asStr(dig(it, "product", "name"), "(unknown product)")}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AdminScreen({ session, snap }: { session: GqlSession; snap: Snapshot }) {
  useEffect(() => {
    session.load("admin", { query: ADMIN_QUERY, name: "AdminUsers" }, "app");
  }, [session, snap.epoch, snap.identity]);
  const r = slot(snap, "admin");
  if (!r) return <Empty>Loading…</Empty>;
  const forbidden = r.errors.find((e) => e.code === "FORBIDDEN" || e.code === "UNAUTHENTICATED");
  const users = asArray(dig(r.data, "users"));
  const orders = asArray(dig(r.data, "allOrders"));
  return (
    <div className="space-y-3">
      {forbidden && (
        <div className="rounded-lg border border-dashed border-[#f87171]/35 p-3">
          <p className="text-[12px] font-medium text-white/85">Admins only</p>
          <p className="mt-0.5 text-[11px] text-white/50">The back office asks for every user and every order. Your resolvers check the role in the context and refuse anyone else, field by field.</p>
        </div>
      )}
      {(!r.ok || r.errors.length > 0) && <Failure result={r} />}
      {users.length > 0 && (
        <div>
          <div className="hud-label mb-1.5">Users</div>
          <ul className="space-y-1.5">
            {users.map((u, i) => (
              <li key={i} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[11px]">
                <span className="min-w-0 flex-1 truncate text-white/90">{asStr(dig(u, "name"), "?")}</span>
                <span className="hidden min-w-0 max-w-[45%] truncate text-white/45 @sm:block">{dig(u, "email") == null ? "email hidden" : asStr(dig(u, "email"))}</span>
                <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-px font-mono text-[9.5px] text-white/60">{asStr(dig(u, "role"), "?")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {orders.length > 0 && (
        <div>
          <div className="hud-label mb-1.5">All orders</div>
          <ul className="space-y-1">
            {orders.map((o, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-white/70">
                <span className="w-16 shrink-0 text-white/90">#{asStr(dig(o, "id"), "?")}</span>
                <span className="font-mono text-[10px] text-white/50">{asStr(dig(o, "status"), "?")}</span>
                <span className="hud-value ml-auto text-[#e0f6c1]">{money(asNum(dig(o, "totalCents")))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── product page ─────────────────────────

function ProductScreen({ session, snap, unlocked, id, back }: { session: GqlSession; snap: Snapshot; unlocked: ReadonlySet<string>; id: string; back: () => void }) {
  const errorsOn = unlocked.has("gql-errors");
  const mutOn = unlocked.has("gql-mutations");
  const shipOn = unlocked.has("gql-ship");
  const [warehouse, setWarehouse] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [review, setReview] = useState<LogEntry | null>(null);
  const query = useMemo(() => productPageQuery({ reviews: true, rating: true, shipping: errorsOn, warehouse: errorsOn && warehouse }), [errorsOn, warehouse]);
  useEffect(() => {
    session.load(`product:${id}`, { query, variables: { id }, name: "ProductPage" }, "app");
  }, [session, id, query, snap.epoch, snap.identity]);
  const r = slot(snap, `product:${id}`);
  if (!r) return <Empty>Loading…</Empty>;
  const product = dig(r.data, "product");
  const backBtn = (
    <button onClick={back} className="mb-2 inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white">
      <ArrowLeft className="h-3 w-3" aria-hidden /> Back
    </button>
  );
  if (!isRecord(product)) {
    return (
      <div>
        {backBtn}
        {r.ok && r.errors.length === 0 ? (
          <Empty>No product with id {id}. The product field returned null, and that is not an error.</Empty>
        ) : (
          <Failure result={r} title="The product failed to load">
            {r.hasData && r.errors.length > 0 && (
              <Notice tone="warn">
                product came back <span className="font-mono">null</span>: a non-null field failed, so GraphQL nulled the nearest nullable parent.
              </Notice>
            )}
          </Failure>
        )}
      </div>
    );
  }
  const name = asStr(product.name, `Product ${id}`);
  const price = asNum(product.priceCents);
  const inStock = product.inStock !== false;
  const avg = typeof product.averageRating === "number" ? product.averageRating : null;
  const reviews = asArray(product.reviews);
  const shipErr = r.errors.find((e) => e.path.includes("shippingEstimate"));
  const otherErrors = r.errors.filter((e) => e !== shipErr);
  const ship = asStr(product.shippingEstimate);

  const submit = () => {
    const entry = session.createReview({ productId: id, rating, body: body.trim() });
    setReview(entry);
    const payload = dig(entry.result.data, "createReview");
    if (isRecord(dig(payload, "review")) && asArray(dig(payload, "userErrors")).length === 0) setBody("");
  };
  const reviewPayload = review ? dig(review.result.data, "createReview") : null;
  const userErrors = asArray(dig(reviewPayload, "userErrors"));

  return (
    <div className="space-y-3">
      {backBtn}
      <div className="grid gap-3 @md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        <Tile className="aspect-[16/7] @md:aspect-square" label={asStr(dig(product, "category", "name"))} />
        <div className="min-w-0">
          <h4 className="text-[14px] font-semibold leading-tight text-white">{name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="hud-value text-[14px] text-[#e0f6c1]">{money(price)}</span>
            <span className={`text-[10.5px] font-medium ${inStock ? "text-white/45" : "text-[#f87171]"}`}>{inStock ? "In stock" : "Sold out"}</span>
            {avg !== null && (
              <span className="flex items-center gap-1 text-[10.5px] text-white/55">
                <Stars value={avg} /> {avg.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-white/60">{asStr(product.description)}</p>
          {errorsOn && (
            <p className="mt-1.5 text-[11px] text-white/55">
              Shipping:{" "}
              {shipErr ? (
                <span className="text-[#fbbf24]" title={shipErr.message}>
                  estimate unavailable (the rest of the page still loaded)
                </span>
              ) : ship ? (
                <span className="text-white/80">{ship}</span>
              ) : (
                <span className="text-white/35">none</span>
              )}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {mutOn && (
              <button className={BTN_ON} disabled={!inStock} onClick={() => session.addToCart({ productId: id, name, priceCents: price })}>
                <ShoppingCart className="h-3 w-3" aria-hidden /> Add to cart
              </button>
            )}
            {errorsOn && (
              <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/55">
                <input type="checkbox" checked={warehouse} onChange={(e) => setWarehouse(e.target.checked)} className="h-3 w-3 accent-[#c5ee8a]" />
                also ask for <span className="font-mono">warehouse</span> (String!)
              </label>
            )}
          </div>
        </div>
      </div>

      {otherErrors.length > 0 && (
        <div className="space-y-1.5">
          {otherErrors.slice(0, 3).map((e, i) => (
            <ErrorCard key={i} error={e} inspect={errorsOn} />
          ))}
        </div>
      )}

      <div>
        <div className="hud-label mb-1.5">Reviews · {reviews.length}</div>
        {reviews.length === 0 && <Empty>No reviews yet.</Empty>}
        <ul className="space-y-1.5">
          {reviews.map((rv, i) => (
            <li key={i} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Stars value={asNum(dig(rv, "rating"))} />
                <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-white/80">{asStr(dig(rv, "author", "name"), "Anonymous")}</span>
                <span className="shrink-0 text-[10px] text-white/35">{asStr(dig(rv, "createdAt")).slice(0, 10)}</span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-white/65">{asStr(dig(rv, "body"))}</p>
            </li>
          ))}
        </ul>
      </div>

      {mutOn && (
        <div className="rounded-lg border border-white/[0.08] bg-black/20 p-2">
          <div className="hud-label mb-1.5">Write a review · createReview</div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <select aria-label="Rating" value={rating} onChange={(e) => setRating(Number(e.target.value))} className="h-7 rounded-md border border-white/12 bg-[#141414] px-1.5 text-[11px] text-white outline-none focus:border-[#c5ee8a]/60">
              {[5, 4, 3, 2, 1, 0, 9].map((n) => (
                <option key={n} value={n}>
                  {n === 0 || n === 9 ? `${n} (invalid)` : `${n} star${n === 1 ? "" : "s"}`}
                </option>
              ))}
            </select>
            <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you think?" aria-label="Review text" className={`${INPUT} min-w-[8rem] flex-1`} />
            <button className={BTN_ON} onClick={submit}>
              Post
            </button>
          </div>
          {review && (
            <div className="mt-2 space-y-1.5">
              {!review.result.ok && <Notice tone="bad">{review.result.problem}</Notice>}
              {review.result.errors.slice(0, 2).map((e, i) => (
                <ErrorCard key={i} error={e} inspect={errorsOn} />
              ))}
              {userErrors.length > 0 && (
                <ul className="rounded-md border border-[#fbbf24]/35 bg-[#fbbf24]/10 p-2 text-[11px] text-[#fcd34d]">
                  {userErrors.map((u, i) => (
                    <li key={i}>
                      <span className="font-mono text-[10.5px]">{asStr(dig(u, "field"), "input")}</span>: {asStr(dig(u, "message"))}
                    </li>
                  ))}
                </ul>
              )}
              {isRecord(dig(reviewPayload, "review")) && userErrors.length === 0 && (
                <Notice tone="ok">
                  <Check className="mr-1 inline h-3 w-3" aria-hidden />
                  Review posted as {asStr(dig(reviewPayload, "review", "author", "name"), "you")}.
                </Notice>
              )}
            </div>
          )}
        </div>
      )}

      {shipOn && <RestCompareCard session={session} snap={snap} productId={Number(id) || 1} fixedProduct />}
    </div>
  );
}

// ───────────────────────── cart bar ─────────────────────────

function CartBar({ session, snap, onOrdered }: { session: GqlSession; snap: Snapshot; onOrdered: (e: LogEntry) => void }) {
  const total = snap.cart.reduce((s, l) => s + l.priceCents * l.quantity, 0);
  const count = snap.cart.reduce((s, l) => s + l.quantity, 0);
  return (
    <div className="shrink-0 border-t border-white/[0.08] bg-black/30 p-2">
      <ul className="mb-1.5 max-h-24 space-y-1 overflow-y-auto [scrollbar-width:thin]">
        {snap.cart.map((l) => (
          <li key={l.productId} className="flex min-w-0 items-center gap-1.5 text-[11px]">
            <span className="min-w-0 flex-1 truncate text-white/80">{l.name}</span>
            <button className="grid h-5 w-5 place-items-center rounded-full border border-white/12 text-white/70 hover:bg-white/10" aria-label={`Fewer ${l.name}`} onClick={() => session.changeQuantity(l.productId, -1)}>
              <Minus className="h-2.5 w-2.5" aria-hidden />
            </button>
            <span className="hud-value w-4 text-center text-white/80">{l.quantity}</span>
            <button className="grid h-5 w-5 place-items-center rounded-full border border-white/12 text-white/70 hover:bg-white/10" aria-label={`More ${l.name}`} onClick={() => session.changeQuantity(l.productId, 1)}>
              <Plus className="h-2.5 w-2.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex min-w-0 items-center gap-2">
        <span className="hud-value min-w-0 flex-1 truncate text-[11px] text-white/70">
          Cart · {count} item{count === 1 ? "" : "s"} · {money(total)}
        </span>
        <button className={BTN} onClick={() => session.clearCart()}>
          Clear
        </button>
        <button
          className={BTN_ON}
          onClick={() => {
            const e = session.placeOrder();
            if (e) onOrdered(e);
          }}
        >
          Place order
        </button>
      </div>
    </div>
  );
}

function OrderResult({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  const payload = dig(entry.result.data, "placeOrder");
  const order = dig(payload, "order");
  const userErrors = asArray(dig(payload, "userErrors"));
  return (
    <div className="mb-2.5 space-y-1.5">
      {!entry.result.ok && <Notice tone="bad">{entry.result.problem}</Notice>}
      {entry.result.errors.slice(0, 2).map((e, i) => (
        <ErrorCard key={i} error={e} inspect />
      ))}
      {userErrors.length > 0 && (
        <ul className="rounded-md border border-[#fbbf24]/35 bg-[#fbbf24]/10 p-2 text-[11px] text-[#fcd34d]">
          {userErrors.map((u, i) => (
            <li key={i}>
              <span className="font-mono text-[10.5px]">{asStr(dig(u, "field"), "input")}</span>: {asStr(dig(u, "message"))}
            </li>
          ))}
        </ul>
      )}
      {isRecord(order) && userErrors.length === 0 && (
        <Notice tone="ok">
          <Check className="mr-1 inline h-3 w-3" aria-hidden />
          Order #{asStr(order.id)} is {asStr(order.status, "placed").toLowerCase()} · {money(asNum(order.totalCents))}
        </Notice>
      )}
      <button className="text-[10.5px] text-white/45 underline underline-offset-2 hover:text-white" onClick={onClose}>
        Dismiss
      </button>
    </div>
  );
}

// ───────────────────────── pane ─────────────────────────

const TAB_LOCK: Record<TabId, string> = {
  home: "gql-catalogue",
  search: "gql-search",
  browse: "gql-browse",
  orders: "gql-orders",
  admin: "gql-orders",
};

const GHOST: Record<TabId, React.ReactNode> = {
  home: <GhostGrid />,
  search: <GhostRows rows={4} />,
  browse: <GhostRows rows={5} />,
  orders: <GhostRows rows={3} />,
  admin: <GhostRows rows={4} />,
};

export function ClientAppPane({ session, snap, unlocked, focus, interactive, fresh }: Props) {
  const [screen, setScreen] = useState<Screen>("home");
  const [from, setFrom] = useState<TabId>("home");
  const [productId, setProductId] = useState("1");
  const [ordered, setOrdered] = useState<LogEntry | null>(null);

  const tab: TabId = screen === "product" ? from : screen;
  const idOn = unlocked.has("gql-identity");
  const mutOn = unlocked.has("gql-mutations");
  const canOpen = unlocked.has("gql-product");

  useEffect(() => {
    if (idOn) session.load("me", { query: WHOAMI_QUERY, name: "Me" }, "app");
  }, [session, idOn, snap.epoch, snap.identity]);

  const me = slot(snap, "me");
  const meRow = dig(me?.data, "me");
  const who = IDENTITIES.find((i) => i.id === snap.identity) ?? IDENTITIES[0];

  const open = (id: string) => {
    setProductId(id);
    setFrom(tab);
    setScreen("product");
  };

  const tabs: { id: TabId; label: string; locked: boolean }[] = [
    { id: "home", label: "Home", locked: !unlocked.has("gql-catalogue") },
    { id: "search", label: "Search", locked: !unlocked.has("gql-search") },
    { id: "browse", label: "Browse", locked: !unlocked.has("gql-browse") },
    { id: "orders", label: "Orders", locked: !unlocked.has("gql-orders") },
    { id: "admin", label: "Admin", locked: !unlocked.has("gql-orders") },
  ];
  const freshTabs = new Set(tabs.filter((t) => fresh.has(TAB_LOCK[t.id])).map((t) => t.id as string));

  const featureOfTab = TAB_LOCK[tab];
  const tabOn = unlocked.has(featureOfTab);
  const info = FEATURE_INFO[featureOfTab];
  const productOn = screen === "product" && unlocked.has("gql-product");

  return (
    <PaneFrame
      title="Pocket Store app"
      icon={<Smartphone className="h-3.5 w-3.5" aria-hidden />}
      hint="A mobile client that only speaks GraphQL. Each screen below is one operation sent to your execute()."
      actions={
        mutOn && session.hasHook("reset_db") ? (
          <button className={BTN} onClick={() => session.resetData()} title="Rebuild the database with your reset_db()">
            <RotateCcw className="h-3 w-3" aria-hidden /> Reset data
          </button>
        ) : null
      }
    >
      {/* who is signed in */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.07] px-3 py-1.5">
        {idOn ? (
          <>
            <UserRound className="h-3 w-3 shrink-0 text-[#c5ee8a]" aria-hidden />
            <select
              aria-label="Identity"
              value={snap.identity}
              onChange={(e) => session.setIdentity(e.target.value as IdentityId)}
              className="h-6 min-w-0 rounded-md border border-white/12 bg-[#141414] px-1.5 text-[10.5px] text-white outline-none focus:border-[#c5ee8a]/60"
            >
              {IDENTITIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
            <span className="min-w-0 flex-1 truncate text-[10.5px] text-white/45">
              {me && !me.ok ? "me() failed" : isRecord(meRow) ? `server says: ${asStr(meRow.name)} · ${asStr(meRow.role).toLowerCase()}` : me?.errors.length ? "server says: error" : "server says: not signed in"}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-[10.5px] text-white/40">
            <Lock className="h-3 w-3" aria-hidden /> Signed out · identity unlocks in lesson 5
          </span>
        )}
        <span className="sr-only">{who.label}</span>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={(id) => setScreen(id)} fresh={freshTabs} />

      {ordered && (
        <div className="shrink-0 border-b border-white/[0.07] px-2.5 pt-2.5">
          <OrderResult entry={ordered} onClose={() => setOrdered(null)} />
        </div>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5 [scrollbar-width:thin] ${interactive ? "" : "pointer-events-none"}`}>
        {screen === "product" ? (
          productOn ? (
            <ProductScreen session={session} snap={snap} unlocked={unlocked} id={productId} back={() => setScreen(from)} />
          ) : (
            <div>
              <button onClick={() => setScreen(from)} className="mb-2 inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white">
                <ArrowLeft className="h-3 w-3" aria-hidden /> Back
              </button>
              <Locked title={FEATURE_INFO["gql-product"].title} need={FEATURE_INFO["gql-product"].need} lesson={5} spot={focus === "gql-product"} />
            </div>
          )
        ) : !tabOn ? (
          <Locked title={info.title} need={info.need} lesson={info.lesson} spot={focus === featureOfTab}>
            {GHOST[tab]}
          </Locked>
        ) : tab === "home" ? (
          <HomeScreen
            session={session}
            snap={snap}
            open={open}
            canOpen={canOpen}
            goBrowse={
              unlocked.has("gql-browse")
                ? (c) => {
                    session.browseRun({ ...snap.browse.filter, category: c }, BROWSE_PAGE, false);
                    setScreen("browse");
                  }
                : null
            }
          />
        ) : tab === "search" ? (
          <SearchScreen session={session} snap={snap} open={open} canOpen={canOpen} />
        ) : tab === "browse" ? (
          <BrowseScreen session={session} snap={snap} open={open} canOpen={canOpen} />
        ) : tab === "orders" ? (
          <OrdersScreen session={session} snap={snap} />
        ) : (
          <AdminScreen session={session} snap={snap} />
        )}
      </div>

      {mutOn && snap.cart.length > 0 && <CartBar session={session} snap={snap} onOrdered={setOrdered} />}
    </PaneFrame>
  );
}
