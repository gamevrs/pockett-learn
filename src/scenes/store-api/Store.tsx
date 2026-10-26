"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Backpack,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Headphones,
  KeyRound,
  Lamp,
  Laptop,
  LogOut,
  Minus,
  Package,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  describeFailure,
  header,
  isRecord,
  money,
  readError,
  toProduct,
  toProductPage,
  type ApiResult,
  type ApiSession,
  type Product,
  type Snapshot,
} from "./session";
import { BTN, BTN_ON, Empty, GhostGrid, GhostRows, INPUT, Locked, Notice, PaneFrame, StatusChip, Tabs } from "./ui";

/** The storefront pane: a shop that only works through the learner's API. */

type Screen = "shop" | "product" | "cart" | "orders" | "admin" | "account";

const CATEGORIES = ["audio", "bags", "desk", "kitchen", "lighting"];

const CATEGORY_ICON: Record<string, LucideIcon> = {
  audio: Headphones,
  bags: Backpack,
  desk: Laptop,
  kitchen: Coffee,
  lighting: Lamp,
};

const BANDS = [
  { id: "all", label: "Any price" },
  { id: "lt25", label: "Under $25", max: 2500 },
  { id: "25-60", label: "$25 to $60", min: 2500, max: 6000 },
  { id: "gt60", label: "$60 and up", min: 6000 },
];

const SORTS = [
  { id: "", label: "Featured" },
  { id: "price", label: "Price: low to high" },
  { id: "-price", label: "Price: high to low" },
  { id: "name", label: "Name: A to Z" },
  { id: "-newest", label: "Newest first" },
];

interface Filters {
  q: string;
  category: string;
  band: string;
  sort: string;
  page: number;
}

const DEFAULT_FILTERS: Filters = { q: "", category: "", band: "all", sort: "", page: 1 };

function listPath(f: Filters, search: boolean, paging: boolean): string {
  const p = new URLSearchParams();
  if (search) {
    if (f.q.trim()) p.set("q", f.q.trim());
    if (f.category) p.set("category", f.category);
    const band = BANDS.find((b) => b.id === f.band);
    if (band && "min" in band && band.min !== undefined) p.set("min_price", String(band.min));
    if (band && "max" in band && band.max !== undefined) p.set("max_price", String(band.max));
  }
  if (paging) {
    if (f.sort) p.set("sort", f.sort);
    if (f.page > 1) p.set("page", String(f.page));
  }
  const qs = p.toString();
  return qs ? `/products?${qs}` : "/products";
}

const slot = (snap: Snapshot, name: string) => snap.cache[name]?.value as ApiResult | undefined;

const newKey = () => `ck-${Math.random().toString(36).slice(2, 10)}`;

// ───────────────────────── small pieces ─────────────────────────

function Tile({ category, className = "" }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICON[category] ?? Package;
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-md bg-gradient-to-br from-white/[0.09] to-white/[0.02] ${className}`}>
      <Icon className="h-[38%] w-[38%] min-h-5 min-w-5 text-white/45" strokeWidth={1.5} aria-hidden />
      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/40 px-1.5 py-px text-[8.5px] font-medium uppercase tracking-wide text-white/55">{category || "item"}</span>
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="text-[10px] font-medium text-[#f87171]">Sold out</span>;
  if (stock <= 5) return <span className="text-[10px] font-medium text-[#fbbf24]">Only {stock} left</span>;
  return <span className="text-[10px] text-white/40">{stock} in stock</span>;
}

function FailureBox({ result, onConsole, title }: { result: ApiResult; onConsole?: () => void; title?: string }) {
  const err = result.ok ? readError(result.body) : null;
  return (
    <div className="rounded-lg border border-[#f87171]/35 bg-[#f87171]/[0.06] p-2.5 text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={result.status} />
        <span className="font-medium text-white/90">{title ?? "The API said no"}</span>
      </div>
      <p className="mt-1.5 break-words leading-snug text-[#fca5a5]">{result.ok ? (err ? err.message || err.code : `Unexpected answer: ${result.status}`) : result.problem}</p>
      {err && err.details.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-white/65">
          {err.details.map((d, i) => (
            <li key={i}>
              <span className="font-mono text-[10.5px] text-white/85">{d.field}</span> {d.message}
            </li>
          ))}
        </ul>
      )}
      {onConsole && (
        <button onClick={onConsole} className="mt-2 text-[10.5px] text-white/55 underline decoration-white/25 underline-offset-2 hover:text-white">
          Open in the console
        </button>
      )}
    </div>
  );
}

interface CartLine {
  id: number;
  name: string;
  category: string;
  price_cents: number;
  stock: number;
  qty: number;
}

// ───────────────────────── shop ─────────────────────────

function Card({ p, onOpen, canAdd, onAdd }: { p: Product; onOpen: () => void; canAdd: boolean; onAdd: () => void }) {
  return (
    <li className="group flex min-w-0 flex-col rounded-lg border border-white/10 bg-white/[0.03] p-1.5 transition-colors hover:border-white/20">
      <button onClick={onOpen} className="block text-left" aria-label={`Open ${p.name}`}>
        <Tile category={p.category} className="aspect-[16/10] w-full" />
        <p className="mt-1.5 truncate text-[11.5px] font-medium leading-tight text-white/90">{p.name}</p>
      </button>
      <div className="mt-0.5 flex items-baseline justify-between gap-1">
        <span className="hud-value hud-accent text-[12px]">{money(p.price_cents)}</span>
        <StockBadge stock={p.stock} />
      </div>
      <button
        disabled={!canAdd || p.stock <= 0}
        onClick={onAdd}
        className="mt-1.5 inline-flex h-6 items-center justify-center gap-1 rounded-full border border-white/12 text-[10.5px] font-medium text-white/80 transition-colors enabled:hover:bg-[#a3e635] enabled:hover:text-[#0a0a0a] disabled:opacity-40"
        title={canAdd ? "Add to cart" : "The cart switches on with POST /orders (lesson 12)"}
      >
        <Plus className="h-3 w-3" aria-hidden /> {canAdd ? "Add" : "Cart: lesson 12"}
      </button>
    </li>
  );
}

function ShopView({
  session,
  snap,
  unlocked,
  focus,
  interactive,
  filters,
  setFilters,
  openProduct,
  addToCart,
}: {
  session: ApiSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  openProduct: (id: number) => void;
  addToCart: (p: Product) => void;
}) {
  const searchOn = unlocked.has("store-search");
  const pagingOn = unlocked.has("store-paging");
  const ordersOn = unlocked.has("store-orders");
  const [qDraft, setQDraft] = useState(filters.q);
  const result = slot(snap, "list");
  const page = result?.ok && result.status === 200 ? toProductPage(result.body) : null;

  const update = (patch: Partial<Filters>) => setFilters({ ...filters, page: 1, ...patch });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      {/* search + filters */}
      {searchOn ? (
        <div className="space-y-2">
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: qDraft });
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/35" aria-hidden />
              <input aria-label="Search products" value={qDraft} onChange={(e) => setQDraft(e.target.value)} disabled={!interactive} placeholder="Search products" className={`${INPUT} w-full pl-7`} />
            </div>
            <button type="submit" disabled={!interactive} className={BTN}>
              Search
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-1">
            {["", ...CATEGORIES].map((c) => (
              <button
                key={c || "all"}
                disabled={!interactive}
                onClick={() => update({ category: c })}
                className={`rounded-full border px-2 py-0.5 text-[10.5px] capitalize transition-colors ${filters.category === c ? "border-transparent bg-[#a3e635] font-semibold text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10"}`}
              >
                {c || "All"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`rounded-lg border border-dashed px-2.5 py-2 ${focus === "store-search" ? "pulse-ring border-[#a3e635]/60" : "border-white/12"}`}>
          <div className="flex gap-1.5" aria-hidden>
            <div className="h-7 flex-1 rounded-md bg-white/[0.04]" />
            <div className="h-7 w-14 rounded-full bg-white/[0.05]" />
          </div>
          <p className="mt-1.5 text-[10.5px] text-white/40">
            {focus === "store-search" ? <span className="hud-accent">Pass this lesson to switch on search · </span> : "Search and filters · "}needs <code className="font-mono text-white/60">?q= ?category= ?min_price=</code> (lesson 6)
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {searchOn && (
          <select aria-label="Price range" value={filters.band} disabled={!interactive} onChange={(e) => update({ band: e.target.value })} className={`${INPUT} cursor-pointer`}>
            {BANDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        )}
        {pagingOn ? (
          <select aria-label="Sort" value={filters.sort} disabled={!interactive} onChange={(e) => update({ sort: e.target.value })} className={`${INPUT} cursor-pointer`}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={`rounded-md border border-dashed px-2 py-1 text-[10px] text-white/40 ${focus === "store-paging" ? "pulse-ring border-[#a3e635]/60" : "border-white/12"}`}>
            Sort &amp; pages · needs ?sort= ?page= (lesson 7)
          </span>
        )}
        {page && <span className="hud-value hud-muted ml-auto text-[10px]">{page.total} product{page.total === 1 ? "" : "s"}</span>}
      </div>

      {/* results */}
      {!result ? (
        <GhostGrid cards={6} />
      ) : !result.ok || result.status !== 200 ? (
        <FailureBox result={result} title="GET /products failed" onConsole={() => session.openInConsole({ method: "GET", path: listPath(filters, searchOn, pagingOn), body: "", headers: "" })} />
      ) : !page ? (
        <Notice tone="warn">
          GET /products answered 200 but the body is not shaped like <code className="font-mono">{'{"items": [...]}'}</code>. The shop needs a list of products in <code className="font-mono">items</code>.
        </Notice>
      ) : page.items.length === 0 ? (
        <Empty>No products match. {filters.q || filters.category || filters.band !== "all" ? "Try clearing the filters." : "The catalogue is empty."}</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-2 @lg:grid-cols-3 @3xl:grid-cols-4">
          {page.items.map((p) => (
            <Card key={p.id} p={p} onOpen={() => openProduct(p.id)} canAdd={ordersOn} onAdd={() => addToCart(p)} />
          ))}
        </ul>
      )}

      {/* pager */}
      {pagingOn && page && (page.pages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2 pt-0.5">
          <button aria-label="Previous page" disabled={!interactive || filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className={BTN}>
            <ChevronLeft className="h-3 w-3" aria-hidden />
          </button>
          <span className="hud-value text-[11px] text-white/70">
            Page {page.page ?? filters.page} of {page.pages}
          </span>
          <button aria-label="Next page" disabled={!interactive || filters.page >= (page.pages ?? 1)} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className={BTN}>
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

function ProductView({
  session,
  snap,
  interactive,
  productId,
  back,
  canAdd,
  addToCart,
}: {
  session: ApiSession;
  snap: Snapshot;
  interactive: boolean;
  productId: number;
  back: () => void;
  canAdd: boolean;
  addToCart: (p: Product, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const result = slot(snap, "product");
  const product = result?.ok && result.status === 200 ? toProduct(result.body) : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-3">
      <button onClick={back} className="inline-flex w-fit items-center gap-1 text-[11px] text-white/55 hover:text-white">
        <ArrowLeft className="h-3 w-3" aria-hidden /> All products
      </button>
      {!result ? (
        <GhostRows rows={4} />
      ) : !product ? (
        <FailureBox
          result={result}
          title={`GET /products/${productId}`}
          onConsole={() => session.openInConsole({ method: "GET", path: `/products/${productId}`, body: "", headers: "" })}
        />
      ) : (
        <div className="grid gap-3 @lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
          <Tile category={product.category} className="aspect-[4/3] w-full" />
          <div className="min-w-0 space-y-2">
            <div>
              <p className="hud-label">{product.category || "product"} · {product.sku}</p>
              <h4 className="mt-0.5 text-[15px] font-semibold leading-tight text-white">{product.name}</h4>
            </div>
            <p className="text-[11.5px] leading-relaxed text-white/60">{product.description || "No description."}</p>
            <div className="flex items-baseline gap-3">
              <span className="hud-value hud-accent text-[18px]">{money(product.price_cents)}</span>
              <StockBadge stock={product.stock} />
            </div>
            {canAdd ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-full border border-white/12">
                  <button aria-label="Fewer" disabled={!interactive || qty <= 1} onClick={() => setQty(qty - 1)} className="grid h-7 w-7 place-items-center text-white/70 hover:text-white disabled:opacity-40">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="hud-value w-6 text-center text-[11px]">{qty}</span>
                  <button aria-label="More" disabled={!interactive || qty >= Math.max(1, product.stock)} onClick={() => setQty(qty + 1)} className="grid h-7 w-7 place-items-center text-white/70 hover:text-white disabled:opacity-40">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button disabled={!interactive || product.stock <= 0} onClick={() => addToCart(product, qty)} className={BTN_ON}>
                  <ShoppingCart className="h-3 w-3" aria-hidden /> Add to cart
                </button>
              </div>
            ) : (
              <p className="text-[10.5px] text-white/40">The cart switches on with POST /orders (lesson 12).</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── cart + orders ─────────────────────────

interface Checkout {
  entryId: number;
  key: string | null;
}

function CartView({
  session,
  snap,
  unlocked,
  interactive,
  cart,
  setCart,
  goto,
}: {
  session: ApiSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  interactive: boolean;
  cart: CartLine[];
  setCart: (c: CartLine[]) => void;
  goto: (s: Screen) => void;
}) {
  const shipOn = unlocked.has("store-ship");
  const authOn = unlocked.has("store-auth");
  const [key, setKey] = useState(newKey);
  const [last, setLast] = useState<Checkout | null>(null);
  const [replay, setReplay] = useState<{ entryId: number } | null>(null);
  const entry = last ? snap.log.find((e) => e.id === last.entryId) : null;
  const replayEntry = replay ? snap.log.find((e) => e.id === replay.entryId) : null;
  const total = cart.reduce((sum, l) => sum + l.price_cents * l.qty, 0);

  const checkout = () => {
    const sent = session.request("POST", "/orders", {
      json: { items: cart.map((l) => ({ product_id: l.id, quantity: l.qty })) },
      headers: shipOn ? { "Idempotency-Key": key } : undefined,
      source: "cart",
    });
    setLast({ entryId: sent.id, key: shipOn ? key : null });
    setReplay(null);
    if (sent.result.ok && sent.result.status === 201) {
      setCart([]);
      setKey(newKey());
      session.bump();
    }
  };

  const retry = () => {
    if (!entry) return;
    const again = session.call({ ...entry.req }, "cart");
    setReplay({ entryId: again.id });
    if (again.result.ok && again.result.status === 201) session.bump();
  };

  const setQty = (id: number, qty: number) => setCart(cart.flatMap((l) => (l.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(qty, Math.max(1, l.stock || qty)) }])));

  const created = entry && entry.result.ok && entry.result.status === 201 ? entry.result.body : null;
  const order = isRecord(created) ? created : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-3">
      {cart.length === 0 ? (
        !order && <Empty>Your cart is empty. Add something from the shop.</Empty>
      ) : (
        <>
          <ul className="space-y-1.5">
            {cart.map((l) => (
              <li key={l.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
                <Tile category={l.category} className="h-10 w-12 shrink-0 [&>span]:hidden" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium text-white/90">{l.name}</p>
                  <p className="hud-value hud-muted text-[10px]">{money(l.price_cents)} each</p>
                </div>
                <div className="flex shrink-0 items-center rounded-full border border-white/12">
                  <button aria-label={`Fewer ${l.name}`} disabled={!interactive} onClick={() => setQty(l.id, l.qty - 1)} className="grid h-6 w-6 place-items-center text-white/70 hover:text-white">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="hud-value w-5 text-center text-[11px]">{l.qty}</span>
                  <button aria-label={`More ${l.name}`} disabled={!interactive} onClick={() => setQty(l.id, l.qty + 1)} className="grid h-6 w-6 place-items-center text-white/70 hover:text-white">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
            <div>
              <p className="hud-label">Estimated total</p>
              <p className="hud-value text-[14px]">{money(total)}</p>
            </div>
            <button disabled={!interactive} onClick={checkout} className={BTN_ON}>
              <ShoppingCart className="h-3 w-3" aria-hidden /> Check out
            </button>
          </div>
          <p className="text-[10px] leading-snug text-white/35">The server computes the real total from its own prices. {shipOn && <>This checkout sends <code className="font-mono">Idempotency-Key: {key}</code>.</>}</p>
        </>
      )}

      {entry && !created && <FailureBox result={entry.result} title="Checkout failed" onConsole={() => session.openInConsole({ method: "POST", path: "/orders", body: entry.req.body ?? "", headers: shipOn && last?.key ? `Idempotency-Key: ${last.key}` : "", entryId: entry.id })} />}
      {entry && !created && entry.result.status === 401 && authOn && (
        <button onClick={() => goto("account")} className={`${BTN_ON} w-fit`}>
          <KeyRound className="h-3 w-3" aria-hidden /> Sign in first
        </button>
      )}

      {order && entry && (
        <div className="pop-in rounded-lg border border-[#a3e635]/35 bg-[#a3e635]/[0.07] p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip status={entry.result.status} />
            <p className="text-[12px] font-semibold text-white">Order #{String(order.id ?? "?")} placed</p>
            <span className="hud-value hud-accent ml-auto text-[12px]">{typeof order.total_cents === "number" ? money(order.total_cents) : ""}</span>
          </div>
          {Array.isArray(order.items) && (
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-white/70">
              {order.items.filter(isRecord).map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">
                    {String(it.quantity ?? "?")} × {String(it.name ?? `product ${String(it.product_id ?? "?")}`)}
                  </span>
                  <span className="hud-value shrink-0">{typeof it.unit_price_cents === "number" ? money(it.unit_price_cents) : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 font-mono text-[10px] text-white/40">Location: {header(entry.result.headers, "location") ?? "(none: send 201 with a Location header)"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button onClick={() => goto("orders")} className={BTN}>
              <Receipt className="h-3 w-3" aria-hidden /> My orders
            </button>
            {shipOn && last?.key && (
              <button disabled={!interactive} onClick={retry} className={BTN} title="Sends the exact same request again, like a network retry or a double click">
                Retry the same request
              </button>
            )}
          </div>
          {replayEntry && (
            <div className="mt-2">
              {replayEntry.result.ok && replayEntry.result.status === 201 ? (
                header(replayEntry.result.headers, "idempotent-replayed") === "true" ? (
                  <Notice tone="ok">Same Idempotency-Key, so the server replayed order #{String(isRecord(replayEntry.result.body) ? replayEntry.result.body.id : "?")}. No duplicate order, no second charge.</Notice>
                ) : (
                  <Notice tone="warn">A second order was created (#{String(isRecord(replayEntry.result.body) ? replayEntry.result.body.id : "?")}). Without a working idempotency middleware a retry duplicates the order.</Notice>
                )
              ) : (
                <FailureBox result={replayEntry.result} title="The retry was refused" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrdersView({ session, snap, unlocked, goto }: { session: ApiSession; snap: Snapshot; unlocked: ReadonlySet<string>; goto: (s: Screen) => void }) {
  const result = slot(snap, "orders");
  const items = result?.ok && result.status === 200 && isRecord(result.body) && Array.isArray(result.body.items) ? result.body.items.filter(isRecord) : null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3">
      {!result ? (
        <GhostRows rows={3} />
      ) : items ? (
        items.length === 0 ? (
          <Empty>No orders yet. Check something out first.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {items.map((o) => (
              <li key={String(o.id)} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="hud-value text-[11.5px]">Order #{String(o.id)}</span>
                  <span className="hud-value hud-accent text-[11.5px]">{typeof o.total_cents === "number" ? money(o.total_cents) : ""}</span>
                </div>
                {Array.isArray(o.items) && (
                  <p className="mt-0.5 truncate text-[10.5px] text-white/55">
                    {o.items
                      .filter(isRecord)
                      .map((it) => `${String(it.quantity)} × ${String(it.name ?? it.product_id)}`)
                      .join(", ")}
                  </p>
                )}
                {typeof o.created_at === "string" && <p className="hud-value mt-0.5 text-[9.5px] text-white/30">{o.created_at}</p>}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <FailureBox result={result} title="GET /orders" onConsole={() => session.openInConsole({ method: "GET", path: "/orders", body: "", headers: "" })} />
          {result.status === 401 && unlocked.has("store-auth") && (
            <button onClick={() => goto("account")} className={`${BTN_ON} w-fit`}>
              <KeyRound className="h-3 w-3" aria-hidden /> Sign in
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────────── admin ─────────────────────────

interface FormState {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
}

const EMPTY_FORM: FormState = { sku: "", name: "", description: "", category: "desk", price: "", stock: "" };

function formFrom(p: Product): FormState {
  return { sku: p.sku, name: p.name, description: p.description, category: p.category || "desk", price: (p.price_cents / 100).toFixed(2), stock: String(p.stock) };
}

/** A price typed in dollars becomes cents. Text that is not a number is sent as-is so the API can reject it. */
function cents(price: string): number | string {
  const n = Number(price);
  return price.trim() !== "" && Number.isFinite(n) ? Math.round(n * 100) : price;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="hud-label">{label}</span>
      <div className="mt-0.5">{children}</div>
      {error && <span className="mt-0.5 block text-[10px] leading-snug text-[#f87171]">{error}</span>}
    </label>
  );
}

function AdminView({
  session,
  snap,
  unlocked,
  interactive,
  focus,
}: {
  session: ApiSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  interactive: boolean;
  focus: string | null;
}) {
  const createOn = unlocked.has("store-create");
  const modifyOn = unlocked.has("store-modify");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [usePut, setUsePut] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<{ entryId: number; label: string } | null>(null);
  const result = slot(snap, "admin");
  const page = result?.ok && result.status === 200 ? toProductPage(result.body) : null;
  const outEntry = outcome ? snap.log.find((e) => e.id === outcome.entryId) : null;
  const err = outEntry?.result.ok ? readError(outEntry.result.body) : null;
  const fieldError = (...names: string[]) => err?.details.find((d) => names.includes(d.field))?.message;

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm(formFrom(p));
    setOutcome(null);
  };
  const reset = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const submit = () => {
    const price = cents(form.price);
    if (!editing) {
      const body: Record<string, unknown> = { sku: form.sku, name: form.name, category: form.category, price_cents: price };
      if (form.description.trim()) body.description = form.description;
      if (form.stock.trim()) body.stock = Number.isFinite(Number(form.stock)) ? Number(form.stock) : form.stock;
      const sent = session.request("POST", "/products", { json: body, source: "admin" });
      setOutcome({ entryId: sent.id, label: "POST /products" });
      if (sent.result.ok && sent.result.status === 201) {
        session.bump();
        reset();
      }
      return;
    }
    const stock = form.stock.trim() === "" ? undefined : Number.isFinite(Number(form.stock)) ? Number(form.stock) : form.stock;
    let sent;
    if (usePut) {
      const body: Record<string, unknown> = { sku: form.sku, name: form.name, category: form.category, price_cents: price };
      if (form.description.trim()) body.description = form.description;
      if (stock !== undefined) body.stock = stock;
      sent = session.request("PUT", `/products/${editing.id}`, { json: body, source: "admin" });
      setOutcome({ entryId: sent.id, label: `PUT /products/${editing.id}` });
    } else {
      const diff: Record<string, unknown> = {};
      if (form.sku !== editing.sku) diff.sku = form.sku;
      if (form.name !== editing.name) diff.name = form.name;
      if (form.description !== editing.description) diff.description = form.description;
      if (form.category !== editing.category) diff.category = form.category;
      if (price !== editing.price_cents) diff.price_cents = price;
      if (stock !== undefined && stock !== editing.stock) diff.stock = stock;
      sent = session.request("PATCH", `/products/${editing.id}`, { json: diff, source: "admin" });
      setOutcome({ entryId: sent.id, label: `PATCH /products/${editing.id}` });
    }
    if (sent.result.ok && sent.result.status === 200) {
      session.bump();
      reset();
    }
  };

  const remove = (p: Product) => {
    if (confirm !== p.id) {
      setConfirm(p.id);
      return;
    }
    setConfirm(null);
    const sent = session.request("DELETE", `/products/${p.id}`, { source: "admin" });
    setOutcome({ entryId: sent.id, label: `DELETE /products/${p.id}` });
    if (sent.result.ok && sent.result.status === 204) session.bump();
  };

  const who = snap.user ? `${snap.user.email} (${snap.user.role})` : snap.token ? "signed in" : "anonymous";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px]">
        <span className="hud-label">Acting as</span>
        <span className={`hud-value ${snap.user?.role === "admin" ? "hud-accent" : "text-white/70"}`}>{who}</span>
        {unlocked.has("store-roles") && snap.user?.role !== "admin" && <span className="text-white/40">Admin routes should answer 401/403 for you.</span>}
      </div>

      {/* form */}
      {createOn || editing ? (
        <form
          className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-2">
            <h4 className="hud-title">{editing ? `Edit #${editing.id}` : "New product"}</h4>
            {editing && (
              <button type="button" onClick={reset} className="ml-auto text-[10.5px] text-white/50 hover:text-white">
                Cancel
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="SKU" error={fieldError("sku")}>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={!interactive} placeholder="ABC-123" className={`${INPUT} w-full font-mono`} />
            </Field>
            <Field label="Category" error={fieldError("category")}>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={!interactive} className={`${INPUT} w-full cursor-pointer`}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Name" error={fieldError("name")}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!interactive} placeholder="Product name" className={`${INPUT} w-full`} />
          </Field>
          <Field label="Description" error={fieldError("description")}>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!interactive} placeholder="Optional" className={`${INPUT} w-full`} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Price (USD)" error={fieldError("price_cents")}>
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={!interactive} inputMode="decimal" placeholder="24.00" className={`${INPUT} w-full font-mono`} />
            </Field>
            <Field label="Stock" error={fieldError("stock")}>
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} disabled={!interactive} inputMode="numeric" placeholder="0" className={`${INPUT} w-full font-mono`} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" disabled={!interactive} className={BTN_ON}>
              {editing ? (usePut ? "PUT: replace" : "PATCH: save changes") : "Create product"}
            </button>
            {editing && (
              <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-white/60" title="PUT sends the whole product; blank optional fields reset to their defaults">
                <input type="checkbox" checked={usePut} onChange={(e) => setUsePut(e.target.checked)} className="h-3 w-3 accent-[#a3e635]" />
                use PUT (replace everything)
              </label>
            )}
          </div>
        </form>
      ) : (
        <Locked title="New product" need="POST /products" lesson={8} spot={focus === "store-create"} compact>
          <GhostRows rows={2} />
        </Locked>
      )}

      {outEntry && (
        <div>
          {outEntry.result.ok && outEntry.result.status < 400 ? (
            <Notice tone="ok">
              <span className="font-mono text-[10.5px]">{outcome?.label}</span> → {outEntry.result.status}
              {header(outEntry.result.headers, "location") ? ` · Location: ${header(outEntry.result.headers, "location")}` : ""}
            </Notice>
          ) : (
            <FailureBox result={outEntry.result} title={outcome?.label} onConsole={() => session.openInConsole({ method: outEntry.req.method, path: outEntry.req.path, body: outEntry.req.body ?? "", headers: "", entryId: outEntry.id })} />
          )}
        </div>
      )}

      {/* table */}
      {!result ? (
        <GhostRows rows={4} />
      ) : !page ? (
        <FailureBox result={result} title="GET /products" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/10">
          <ul>
            {page.items.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center gap-2 border-t border-white/[0.06] px-2 py-1.5 first:border-t-0">
                <span className="hud-value hud-muted w-5 shrink-0 text-right text-[10px]">{p.id}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] text-white/90">{p.name}</span>
                  <span className="hud-value block truncate text-[9.5px] text-white/35">
                    {p.sku} · {money(p.price_cents)} · {p.stock} in stock
                  </span>
                </span>
                {modifyOn ? (
                  <span className="flex shrink-0 gap-1">
                    <button aria-label={`Edit ${p.name}`} disabled={!interactive} onClick={() => startEdit(p)} className="grid h-6 w-6 place-items-center rounded-full border border-white/12 text-white/70 hover:bg-white/10">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      aria-label={confirm === p.id ? `Confirm delete ${p.name}` : `Delete ${p.name}`}
                      disabled={!interactive}
                      onClick={() => remove(p)}
                      onBlur={() => setConfirm((c) => (c === p.id ? null : c))}
                      className={`grid h-6 place-items-center rounded-full border text-[10px] font-medium ${confirm === p.id ? "border-[#f87171]/50 bg-[#f87171]/15 px-2 text-[#fca5a5]" : "w-6 border-white/12 text-white/70 hover:bg-white/10"}`}
                    >
                      {confirm === p.id ? "Delete?" : <Trash2 className="h-3 w-3" />}
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {!modifyOn && (
            <p className={`border-t border-dashed px-2 py-1.5 text-[10px] text-white/40 ${focus === "store-modify" ? "pulse-ring border-[#a3e635]/60" : "border-white/12"}`}>
              Edit &amp; delete buttons need PUT · PATCH · DELETE (lesson 9)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── account ─────────────────────────

function AccountView({ session, snap, interactive }: { session: ApiSession; snap: Snapshot; interactive: boolean }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const entry = snap.log.find((e) => e.id === shown) ?? null;
  const me = slot(snap, "me");

  const doLogin = (e: string, p: string) => {
    const sent = session.login(e, p, "account");
    setShown(sent.id);
  };
  const submit = () => {
    if (mode === "in") return doLogin(email, password);
    const sent = session.request("POST", "/auth/register", { json: { email, password }, source: "account", auth: false });
    setShown(sent.id);
    if (sent.result.ok && sent.result.status === 201) {
      doLogin(email, password);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-3">
      {snap.token ? (
        <div className="space-y-2 rounded-lg border border-[#a3e635]/30 bg-[#a3e635]/[0.05] p-2.5">
          <p className="hud-label">Signed in</p>
          <p className="hud-value hud-accent text-[13px]">{snap.user?.email ?? "(unknown user)"}</p>
          <p className="text-[11px] text-white/60">
            role <span className="hud-value text-white/90">{snap.user?.role ?? "?"}</span> · token <span className="hud-value text-white/70">…{snap.token.slice(-6)}</span>
          </p>
          {me && (
            <p className="text-[10.5px] text-white/50">
              GET /me → <StatusChip status={me.status} withText={false} /> {me.ok && isRecord(me.body) ? `${String(me.body.email)} (${String(me.body.role)})` : describeFailure(me)}
            </p>
          )}
          <button disabled={!interactive} onClick={() => session.signOut()} className={BTN}>
            <LogOut className="h-3 w-3" aria-hidden /> Sign out
          </button>
        </div>
      ) : (
        <form
          className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex gap-1">
            {(["in", "up"] as const).map((m) => (
              <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${mode === m ? "bg-white/12 text-white" : "text-white/50 hover:text-white/80"}`}>
                {m === "in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!interactive} autoComplete="off" placeholder="you@example.com" className={`${INPUT} w-full`} />
          </Field>
          <Field label="Password">
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" disabled={!interactive} autoComplete="off" placeholder="8+ characters" className={`${INPUT} w-full`} />
          </Field>
          <button type="submit" disabled={!interactive} className={BTN_ON}>
            {mode === "in" ? "Sign in" : "Register"}
          </button>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.07] pt-2">
            <span className="hud-label">Demo accounts</span>
            <button type="button" disabled={!interactive} onClick={() => doLogin("admin@pocketstore.test", "admin-pass-123")} className={BTN}>
              Admin
            </button>
            <button type="button" disabled={!interactive} onClick={() => doLogin("sam@example.com", "sam-pass-456")} className={BTN}>
              Sam (customer)
            </button>
          </div>
        </form>
      )}
      {entry && !(entry.result.ok && entry.result.status < 300 && snap.token) && (
        entry.result.ok && entry.result.status < 400 ? (
          <Notice tone="ok">{entry.req.method} {entry.req.path} → {entry.result.status}</Notice>
        ) : (
          <FailureBox result={entry.result} title={`${entry.req.method} ${entry.req.path}`} onConsole={() => session.openInConsole({ method: entry.req.method, path: entry.req.path, body: entry.req.body ?? "", headers: "", entryId: entry.id, auth: false })} />
        )
      )}
    </div>
  );
}

// ───────────────────────── pane ─────────────────────────

export function StorePane({
  session,
  snap,
  unlocked,
  focus,
  interactive,
  autoplay,
  fresh,
}: {
  session: ApiSession;
  snap: Snapshot;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  interactive: boolean;
  autoplay: boolean;
  fresh: ReadonlySet<string>;
}) {
  const [screen, setScreen] = useState<Screen>("shop");
  const [productId, setProductId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [cart, setCart] = useState<CartLine[]>([]);

  const live = session.hasHandle;
  const catalogue = unlocked.has("store-catalogue");
  const searchOn = unlocked.has("store-search");
  const pagingOn = unlocked.has("store-paging");
  const adminOn = unlocked.has("store-create");
  const authOn = unlocked.has("store-auth");
  const ordersOn = unlocked.has("store-orders");

  const path = useMemo(() => listPath(filters, searchOn, pagingOn), [filters, searchOn, pagingOn]);
  const adminPath = pagingOn ? "/products?per_page=50" : "/products";
  const token = snap.token;

  useEffect(() => {
    if (!live) return;
    if (screen === "shop" && catalogue) session.load("list", { path }, "shop");
    else if (screen === "product" && catalogue && productId !== null) session.load("product", { path: `/products/${productId}` }, "shop");
    else if (screen === "orders" && ordersOn) session.load("orders", { path: "/orders" }, "cart");
    else if (screen === "admin" && adminOn) session.load("admin", { path: adminPath }, "admin");
    else if (screen === "account" && authOn && token) session.load("me", { path: "/me" }, "account");
  }, [session, live, screen, catalogue, path, productId, ordersOn, adminOn, adminPath, authOn, token, snap.epoch]);

  // demo mode: browse categories on its own
  useEffect(() => {
    if (!autoplay || !searchOn) return;
    const order = ["", "audio", "desk", "lighting", "bags", "kitchen"];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % order.length;
      setScreen("shop");
      setFilters((f) => ({ ...f, category: order[i], page: 1 }));
    }, 3600);
    return () => clearInterval(t);
  }, [autoplay, searchOn]);

  const addToCart = (p: Product, qty = 1) =>
    setCart((c) => {
      const found = c.find((l) => l.id === p.id);
      if (found) return c.map((l) => (l.id === p.id ? { ...l, qty: Math.min(l.qty + qty, Math.max(1, p.stock)) } : l));
      return [...c, { id: p.id, name: p.name, category: p.category, price_cents: p.price_cents, stock: p.stock, qty: Math.min(qty, Math.max(1, p.stock)) }];
    });

  const count = cart.reduce((n, l) => n + l.qty, 0);
  const tabs = [
    { id: "shop" as const, label: "Shop", locked: !catalogue },
    { id: "cart" as const, label: "Cart", locked: !ordersOn, badge: count },
    { id: "orders" as const, label: "Orders", locked: !ordersOn },
    { id: "admin" as const, label: "Admin", locked: !adminOn },
    { id: "account" as const, label: "Account", locked: !authOn },
  ];
  const tab: Screen = screen === "product" ? "shop" : screen;
  const freshIds = new Set([...fresh].flatMap((f) => (f === "store-catalogue" ? ["shop"] : f === "store-orders" ? ["cart", "orders"] : f === "store-create" ? ["admin"] : f === "store-auth" ? ["account"] : [])));

  let body: React.ReactNode;
  const gate = (ok: boolean, title: string, need: string, lesson: number, feature: string, grid = false) =>
    ok ? null : (
      <div className="p-3">
        <Locked title={title} need={need} lesson={lesson} spot={focus === feature}>
          {grid ? <GhostGrid cards={4} /> : <GhostRows rows={4} />}
        </Locked>
      </div>
    );

  if (!live) {
    body = (
      <div className="p-3">
        <Locked title="Storefront" need="handle(request)" lesson={1} spot={false}>
          <GhostGrid cards={4} />
        </Locked>
        <p className="mt-2 px-1 text-[11px] text-white/40">Run your code to wake the shop up. It can only show what your API returns.</p>
      </div>
    );
  } else if (tab === "shop") {
    body =
      gate(catalogue, "Product grid", "GET /products", 5, "store-catalogue", true) ??
      (screen === "product" && productId !== null ? (
        <ProductView session={session} snap={snap} interactive={interactive} productId={productId} back={() => setScreen("shop")} canAdd={ordersOn} addToCart={addToCart} />
      ) : (
        <ShopView
          session={session}
          snap={snap}
          unlocked={unlocked}
          focus={focus}
          interactive={interactive}
          filters={filters}
          setFilters={setFilters}
          openProduct={(id) => {
            setProductId(id);
            setScreen("product");
          }}
          addToCart={addToCart}
        />
      ));
  } else if (tab === "cart") {
    body = gate(ordersOn, "Cart & checkout", "POST /orders", 12, "store-orders") ?? <CartView session={session} snap={snap} unlocked={unlocked} interactive={interactive} cart={cart} setCart={setCart} goto={setScreen} />;
  } else if (tab === "orders") {
    body = gate(ordersOn, "My orders", "GET /orders", 12, "store-orders") ?? <OrdersView session={session} snap={snap} unlocked={unlocked} goto={setScreen} />;
  } else if (tab === "admin") {
    body = gate(adminOn, "Admin panel", "POST /products", 8, "store-create") ?? <AdminView session={session} snap={snap} unlocked={unlocked} interactive={interactive} focus={focus} />;
  } else {
    body = gate(authOn, "Account", "POST /auth/login", 10, "store-auth") ?? <AccountView session={session} snap={snap} interactive={interactive} />;
  }

  return (
    <PaneFrame
      title="Pocket Store"
      icon={<Store className="h-3.5 w-3.5" />}
      meta={snap.user ? snap.user.email : token ? "signed in" : live && authOn ? "anonymous" : undefined}
      actions={
        ordersOn ? (
          <button onClick={() => setScreen("cart")} className={`${BTN} relative`} aria-label={`Cart, ${count} items`}>
            <ShoppingCart className="h-3 w-3" aria-hidden />
            <span className="hud-value">{count}</span>
          </button>
        ) : undefined
      }
    >
      <Tabs tabs={tabs} value={tab} onChange={(t) => setScreen(t)} fresh={freshIds} />
      {body}
    </PaneFrame>
  );
}
