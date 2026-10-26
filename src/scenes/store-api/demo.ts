import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * A stand-in for a finished learner program: the same API the reference solution builds, written in
 * plain TypeScript so the landing page can run the Pocket Store scene without loading Python.
 * Statuses, headers and body shapes match the course (error objects, paging, 401/403, 409...).
 */

interface Req {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: unknown;
}
interface Res {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}
interface P {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
}
interface User {
  id: number;
  email: string;
  password: string;
  role: "admin" | "customer";
}
interface Order {
  id: number;
  user_id: number;
  total_cents: number;
  created_at: string;
  items: { product_id: number; name: string; quantity: number; unit_price_cents: number }[];
}

const SEED: [string, string, string, string, number, number][] = [
  ["AUD-001", "Tide Earbuds", "Wireless earbuds with a 28 hour case.", "audio", 5900, 40],
  ["AUD-002", "Pocket Speaker", "Palm-sized speaker, loud for its size.", "audio", 3900, 25],
  ["AUD-003", "Studio Headphones", "Closed-back monitors for long sessions.", "audio", 12900, 8],
  ["DSK-001", "Walnut Laptop Stand", "Solid walnut that folds flat.", "desk", 4900, 3],
  ["DSK-002", "Mechanical Keyboard", "Hot-swap switches, 75 percent layout.", "desk", 8900, 15],
  ["DSK-003", "Felt Desk Mat", "Wool felt, 80 cm wide.", "desk", 2900, 60],
  ["DSK-004", "Cable Spool", "Keeps one cable exactly where you left it.", "desk", 1400, 120],
  ["LGT-001", "Arc Desk Lamp", "Warm dimmable light on a brass arm.", "lighting", 6400, 12],
  ["LGT-002", "Glow Cube", "Rechargeable table light.", "lighting", 2400, 0],
  ["LGT-003", "Clip Light", "Fastens to a shelf or a monitor.", "lighting", 1900, 33],
  ["BAG-001", "Commuter Backpack", "Water resistant, fits a 16 inch laptop.", "bags", 9400, 9],
  ["BAG-002", "Canvas Tote", "Heavy cotton canvas with a zip pocket.", "bags", 2200, 70],
  ["BAG-003", "Tech Pouch", "Cables, chargers and a spare battery.", "bags", 1700, 45],
  ["KIT-001", "Pour-over Kettle", "Gooseneck spout, 0.9 litre.", "kitchen", 5400, 18],
  ["KIT-002", "Ceramic Mug Set", "Four hand-glazed mugs.", "kitchen", 3100, 22],
  ["KIT-003", "Burr Grinder", "Hand grinder with 40 click settings.", "kitchen", 7900, 6],
];

const CATEGORIES = ["audio", "bags", "desk", "kitchen", "lighting"];
const SORTABLE: Record<string, (a: P, b: P) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  price: (a, b) => a.price_cents - b.price_cents,
  stock: (a, b) => a.stock - b.stock,
  newest: (a, b) => a.id - b.id,
};

export function storeApiDemoProgram(): ProgramHandle {
  let products: P[] = [];
  let users: User[] = [];
  let orders: Order[] = [];
  let tokens = new Map<string, number>();
  let nextProduct = 1;
  let nextUser = 1;
  let nextOrder = 1;
  let tokenCounter = 0;
  const replay = new Map<string, { fp: string; res: Res }>();
  const errors: { type: string; message: string }[] = [];

  const reset = () => {
    products = SEED.map(([sku, name, description, category, price_cents, stock], i) => ({ id: i + 1, sku, name, description, category, price_cents, stock }));
    nextProduct = products.length + 1;
    users = [
      { id: 1, email: "admin@pocketstore.test", password: "admin-pass-123", role: "admin" },
      { id: 2, email: "sam@example.com", password: "sam-pass-456", role: "customer" },
    ];
    nextUser = 3;
    orders = [];
    nextOrder = 1;
    tokens = new Map();
    replay.clear();
    return true;
  };
  reset();

  const json = (status: number, body: unknown, headers: Record<string, string> = {}): Res => ({
    status,
    headers: body === null ? headers : { "Content-Type": "application/json", ...headers },
    body,
  });
  const fail = (status: number, code: string, message: string, details?: { field: string; message: string }[], headers?: Record<string, string>) =>
    json(status, { error: { code, message, ...(details ? { details } : {}) } }, headers);

  const readBody = (req: Req): Record<string, unknown> | Res => {
    let b = req.body;
    if (typeof b === "string") {
      try {
        b = JSON.parse(b);
      } catch {
        return fail(400, "invalid_json", "The request body is not valid JSON.");
      }
    }
    if (!b || typeof b !== "object" || Array.isArray(b)) return fail(400, "invalid_json", "The request body must be a JSON object.");
    return b as Record<string, unknown>;
  };
  const isRes = (v: unknown): v is Res => !!v && typeof v === "object" && "status" in (v as object) && "headers" in (v as object);

  const validate = (data: Record<string, unknown>, partial: boolean) => {
    const problems: { field: string; message: string }[] = [];
    const clean: Record<string, unknown> = {};
    const rules: Record<string, [(v: unknown) => boolean, string]> = {
      sku: [(v) => typeof v === "string" && /^[A-Z]{3}-[0-9]{3}$/.test(v), "must look like ABC-123"],
      name: [(v) => typeof v === "string" && v.trim().length >= 1 && v.trim().length <= 80, "must be 1 to 80 characters"],
      description: [(v) => typeof v === "string" && v.length <= 500, "must be at most 500 characters"],
      category: [(v) => typeof v === "string" && CATEGORIES.includes(v), `must be one of: ${CATEGORIES.join(", ")}`],
      price_cents: [(v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1_000_000, "must be a whole number of cents from 0 to 1000000"],
      stock: [(v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100_000, "must be a whole number from 0 to 100000"],
    };
    for (const k of Object.keys(data)) if (!(k in rules)) problems.push({ field: k, message: "is not a product field" });
    for (const [k, [ok, message]] of Object.entries(rules)) {
      if (k in data) {
        if (ok(data[k])) clean[k] = data[k];
        else problems.push({ field: k, message });
      } else if (["sku", "name", "category", "price_cents"].includes(k) && !partial) problems.push({ field: k, message: "is required" });
    }
    if (problems.length) return fail(422, "validation_error", "The product data is not valid.", problems);
    if (!partial) {
      clean.description ??= "";
      clean.stock ??= 0;
    }
    return clean;
  };

  const policy = (method: string, route: string): "public" | "user" | "admin" => {
    const pub = ["GET /health", "GET /products", "GET /products/:id", "POST /auth/register", "POST /auth/login", "GET /openapi.json"];
    const user = ["GET /me", "POST /orders", "GET /orders", "GET /orders/:id"];
    const key = `${method} ${route}`;
    return pub.includes(key) ? "public" : user.includes(key) ? "user" : "admin";
  };

  const handle = (req: Req): Res => {
    try {
      const method = String(req.method ?? "GET").toUpperCase();
      const url = new URL(req.path ?? "/", "http://x");
      const path = url.pathname;
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers ?? {})) headers[k.toLowerCase()] = String(v);
      const q = url.searchParams;

      // find the route
      type Hit = { key: string; id?: number };
      const table: [string, string][] = [
        ["GET", "/health"],
        ["GET", "/products"],
        ["POST", "/products"],
        ["GET", "/products/:id"],
        ["PUT", "/products/:id"],
        ["PATCH", "/products/:id"],
        ["DELETE", "/products/:id"],
        ["POST", "/auth/register"],
        ["POST", "/auth/login"],
        ["GET", "/me"],
        ["POST", "/orders"],
        ["GET", "/orders"],
        ["GET", "/orders/:id"],
        ["GET", "/openapi.json"],
      ];
      const idm = path.match(/^\/(products|orders)\/([0-9]+)$/);
      const shape = idm ? `/${idm[1]}/:id` : path;
      const sameShape = table.filter(([, p]) => p === shape);
      const hit: Hit | null = sameShape.find(([m]) => m === method) ? { key: shape, id: idm ? Number(idm[2]) : undefined } : null;
      if (!hit) {
        if (sameShape.length) return fail(405, "method_not_allowed", `${method} is not allowed on ${path}`, undefined, { Allow: sameShape.map(([m]) => m).sort().join(", "), "API-Version": "1" });
        return fail(404, "not_found", `No route for ${method} ${path}`, undefined, { "API-Version": "1" });
      }

      // who is calling
      const [scheme, token] = (headers.authorization ?? "").split(" ");
      const uid = scheme?.toLowerCase() === "bearer" && token ? tokens.get(token) : undefined;
      const user = users.find((u) => u.id === uid) ?? null;
      const need = policy(method, hit.key);
      let res: Res;
      if (need !== "public" && !user) res = fail(401, "unauthorized", "Sign in to continue.", undefined, { "WWW-Authenticate": "Bearer" });
      else if (need === "admin" && user?.role !== "admin") res = fail(403, "forbidden", "You do not have permission to do this.");
      else res = dispatch(method, hit, q, headers, req, user);
      res.headers["API-Version"] = "1";
      return res;
    } catch (e) {
      errors.push({ type: (e as Error).name, message: (e as Error).message });
      return fail(500, "internal_error", "Something went wrong on our side.", undefined, { "API-Version": "1" });
    }
  };

  const dispatch = (method: string, hit: { key: string; id?: number }, q: URLSearchParams, headers: Record<string, string>, req: Req, user: User | null): Res => {
    const key = `${method} ${hit.key}`;
    const int = (name: string, def: number | null, min: number, max = Infinity): number | null | Res => {
      const raw = q.get(name);
      if (raw === null || raw === "") return def;
      const n = Number(raw);
      if (!Number.isInteger(n)) return fail(400, "invalid_parameter", `Query parameter '${name}' must be a whole number.`, [{ field: name, message: "must be a whole number" }]);
      if (n < min || n > max) return fail(400, "invalid_parameter", `Query parameter '${name}' is out of range.`, [{ field: name, message: "out of range" }]);
      return n;
    };
    const find = (id?: number) => products.find((p) => p.id === id);
    const missing = (what: string, id?: number) => fail(404, "not_found", `${what} ${id} does not exist`);

    switch (key) {
      case "GET /health":
        return json(200, { status: "ok" });
      case "GET /products": {
        const page = int("page", 1, 1);
        const per = int("per_page", 8, 1, 50);
        const lo = int("min_price", null, 0);
        const hi = int("max_price", null, 0);
        for (const v of [page, per, lo, hi]) if (isRes(v)) return v;
        const sortRaw = q.get("sort") ?? "";
        const desc = sortRaw.startsWith("-");
        const sortKey = desc ? sortRaw.slice(1) : sortRaw;
        if (sortRaw && !SORTABLE[sortKey]) {
          const allowed = Object.keys(SORTABLE).sort().join(", ");
          return fail(400, "invalid_parameter", `Cannot sort by '${sortKey}'. Choose one of: ${allowed}.`, [{ field: "sort", message: `must be one of ${allowed}` }]);
        }
        const term = (q.get("q") ?? "").toLowerCase();
        const cat = q.get("category");
        let list = products.filter(
          (p) =>
            (!term || p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term)) &&
            (!cat || p.category === cat) &&
            (lo === null || p.price_cents >= (lo as number)) &&
            (hi === null || p.price_cents <= (hi as number)),
        );
        list = [...list].sort((a, b) => (sortKey ? (desc ? -1 : 1) * SORTABLE[sortKey](a, b) : 0) || a.id - b.id);
        const pg = page as number;
        const pp = per as number;
        return json(200, { items: list.slice((pg - 1) * pp, pg * pp), page: pg, per_page: pp, total: list.length, pages: Math.ceil(list.length / pp) });
      }
      case "GET /products/:id": {
        const p = find(hit.id);
        return p ? json(200, p) : missing("Product", hit.id);
      }
      case "POST /products": {
        const body = readBody(req);
        if (isRes(body)) return body;
        const clean = validate(body, false);
        if (isRes(clean)) return clean;
        if (products.some((p) => p.sku === clean.sku)) return fail(409, "conflict", "A record with this sku already exists.", [{ field: "sku", message: "must be unique" }]);
        const p = { id: nextProduct++, ...clean } as unknown as P;
        products.push(p);
        return json(201, p, { Location: `/products/${p.id}` });
      }
      case "PUT /products/:id":
      case "PATCH /products/:id": {
        const p = find(hit.id);
        if (!p) return missing("Product", hit.id);
        const body = readBody(req);
        if (isRes(body)) return body;
        const partial = method === "PATCH";
        const clean = validate(body, partial);
        if (isRes(clean)) return clean;
        if (partial && Object.keys(clean).length === 0) return fail(422, "validation_error", "Send at least one field to change.", [{ field: "(body)", message: "must contain at least one field" }]);
        if (clean.sku && products.some((o) => o.sku === clean.sku && o.id !== p.id)) return fail(409, "conflict", "A record with this sku already exists.", [{ field: "sku", message: "must be unique" }]);
        Object.assign(p, clean);
        return json(200, p);
      }
      case "DELETE /products/:id": {
        const p = find(hit.id);
        if (!p) return missing("Product", hit.id);
        if (orders.some((o) => o.items.some((i) => i.product_id === p.id))) return fail(409, "conflict", "This record is still referenced by other data, or points at something that does not exist.");
        products = products.filter((x) => x !== p);
        return json(204, null);
      }
      case "POST /auth/register": {
        const body = readBody(req);
        if (isRes(body)) return body;
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const problems: { field: string; message: string }[] = [];
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problems.push({ field: "email", message: "must be a valid email address" });
        if (password.length < 8) problems.push({ field: "password", message: "must be at least 8 characters" });
        if (problems.length) return fail(422, "validation_error", "The account data is not valid.", problems);
        if (users.some((u) => u.email === email)) return fail(409, "conflict", "A record with this email already exists.", [{ field: "email", message: "must be unique" }]);
        const u: User = { id: nextUser++, email, password, role: "customer" };
        users.push(u);
        return json(201, { id: u.id, email: u.email, role: u.role });
      }
      case "POST /auth/login": {
        const body = readBody(req);
        if (isRes(body)) return body;
        const u = users.find((x) => typeof body.email === "string" && x.email === body.email.trim().toLowerCase());
        if (!u || u.password !== body.password) return fail(401, "invalid_credentials", "Email or password is incorrect.", undefined, { "WWW-Authenticate": "Bearer" });
        const token = `demo-${(++tokenCounter).toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
        tokens.set(token, u.id);
        return json(200, { token, token_type: "Bearer", expires_in: 3600, user: { id: u.id, email: u.email, role: u.role } });
      }
      case "GET /me":
        return json(200, { id: user!.id, email: user!.email, role: user!.role });
      case "POST /orders": {
        const idemKey = headers["idempotency-key"];
        const scope = `${user!.id}|${idemKey}`;
        const body = readBody(req);
        if (isRes(body)) return body;
        const fingerprint = JSON.stringify(body);
        if (idemKey) {
          const saved = replay.get(scope);
          if (saved) {
            if (saved.fp !== fingerprint) return fail(422, "idempotency_key_reuse", "This Idempotency-Key was already used with a different request body.");
            return { ...saved.res, headers: { ...saved.res.headers, "Idempotent-Replayed": "true" } };
          }
        }
        const items = body.items;
        if (!Array.isArray(items) || items.length === 0) return fail(422, "validation_error", "An order needs at least one item.", [{ field: "items", message: "must be a non-empty list" }]);
        const problems: { field: string; message: string }[] = [];
        items.forEach((it, i) => {
          const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
          if (!Number.isInteger(o.product_id)) problems.push({ field: `items[${i}].product_id`, message: "must be a whole number" });
          if (!Number.isInteger(o.quantity) || (o.quantity as number) < 1 || (o.quantity as number) > 99) problems.push({ field: `items[${i}].quantity`, message: "must be a whole number from 1 to 99" });
        });
        if (problems.length) return fail(422, "validation_error", "The order is not valid.", problems);
        const taken = new Map<number, number>();
        const lines: Order["items"] = [];
        let total = 0;
        for (const [i, it] of (items as { product_id: number; quantity: number }[]).entries()) {
          const p = find(it.product_id);
          if (!p) return fail(422, "validation_error", "An item refers to a product that does not exist.", [{ field: `items[${i}].product_id`, message: "does not exist" }]);
          const already = taken.get(p.id) ?? 0;
          if (p.stock - already < it.quantity) return fail(409, "out_of_stock", `Not enough stock for ${p.name}.`, [{ field: `items[${i}].quantity`, message: "more than we have in stock" }]);
          taken.set(p.id, already + it.quantity);
          lines.push({ product_id: p.id, name: p.name, quantity: it.quantity, unit_price_cents: p.price_cents });
          total += it.quantity * p.price_cents;
        }
        for (const [id, n] of taken) find(id)!.stock -= n;
        const order: Order = { id: nextOrder++, user_id: user!.id, total_cents: total, created_at: new Date().toISOString().replace("T", " ").slice(0, 19), items: lines };
        orders.push(order);
        const res = json(201, order, { Location: `/orders/${order.id}` });
        if (idemKey) replay.set(scope, { fp: fingerprint, res });
        return { ...res, headers: { ...res.headers } };
      }
      case "GET /orders": {
        const mine = orders.filter((o) => user!.role === "admin" || o.user_id === user!.id).sort((a, b) => b.id - a.id);
        return json(200, { items: mine, total: mine.length });
      }
      case "GET /orders/:id": {
        const o = orders.find((x) => x.id === hit.id);
        if (!o || (o.user_id !== user!.id && user!.role !== "admin")) return missing("Order", hit.id);
        return json(200, o);
      }
      case "GET /openapi.json": {
        const paths: Record<string, Record<string, unknown>> = {};
        const add = (method: string, path: string, summary: string, secure: boolean) => {
          const params = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "integer" } }));
          (paths[path] ??= {})[method] = { summary, operationId: summary.toLowerCase().replace(/\W+/g, "_"), parameters: params, responses: { "200": { description: "Success" } }, ...(secure ? { security: [{ bearerAuth: [] }] } : {}) };
        };
        add("get", "/health", "Liveness probe: is the API up?", false);
        add("get", "/products", "List products: filter, sort and page.", false);
        add("post", "/products", "Create a product.", true);
        add("get", "/products/{product_id}", "Fetch one product by id.", false);
        add("put", "/products/{product_id}", "Replace a product completely.", true);
        add("patch", "/products/{product_id}", "Change some fields of a product.", true);
        add("delete", "/products/{product_id}", "Delete a product.", true);
        add("post", "/auth/register", "Create a customer account.", false);
        add("post", "/auth/login", "Exchange an email and password for a bearer token.", false);
        add("get", "/me", "Who am I?", true);
        add("post", "/orders", "Place an order for the signed-in user.", true);
        add("get", "/orders", "List my orders (an admin sees everyone's).", true);
        add("get", "/orders/{order_id}", "Fetch one order.", true);
        add("get", "/openapi.json", "The machine-readable description of this API (OpenAPI 3).", false);
        return json(200, { openapi: "3.0.3", info: { title: "Pocket Store API", version: "1" }, paths, components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } } });
      }
      default:
        return fail(404, "not_found", "No route");
    }
  };

  return createStaticProgram({
    vars: {},
    hooks: {
      handle: (req: Req) => handle(req),
      reset_db: () => reset(),
      list_products: () => products.map((p) => ({ ...p })),
      recent_errors: () => errors.slice(-20),
      run_tests: () =>
        [
          "test_create_then_fetch_a_product",
          "test_unknown_product_is_404",
          "test_invalid_product_is_422_and_stores_nothing",
          "test_duplicate_sku_is_409",
          "test_anonymous_cannot_write",
          "test_customer_cannot_write",
          "test_failed_checkout_leaves_stock_unchanged",
          "test_listing_is_paginated",
        ].map((name) => ({ name, passed: true, error: null })),
    },
  });
}
