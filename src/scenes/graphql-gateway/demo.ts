import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * A stand-in for a finished learner program: the same gateway the course builds, answered by
 * plain TypeScript so the landing page can run the scene without loading Python. It understands
 * the scene's own operations (by operation name) and says so when asked for anything else.
 */

type Json = Record<string, unknown>;

const CATEGORIES = [
  { id: "1", slug: "audio", name: "Audio" },
  { id: "2", slug: "desk", name: "Desk" },
  { id: "3", slug: "lighting", name: "Lighting" },
  { id: "4", slug: "bags", name: "Bags" },
  { id: "5", slug: "kitchen", name: "Kitchen" },
];
const CAT_BY_SLUG: Record<string, number> = { audio: 1, desk: 2, lighting: 3, bags: 4, kitchen: 5 };

// name, description, category slug, price cents, stock
const SEED: [string, string, string, number, number][] = [
  ["Tide Earbuds", "Wireless earbuds with a 28 hour case.", "audio", 5900, 40],
  ["Pocket Speaker", "Palm-sized speaker, loud for its size.", "audio", 3900, 25],
  ["Studio Headphones", "Closed-back monitors for long sessions.", "audio", 12900, 8],
  ["Walnut Laptop Stand", "Solid walnut that folds flat.", "desk", 4900, 3],
  ["Mechanical Keyboard", "Hot-swap switches, 75 percent layout.", "desk", 8900, 15],
  ["Felt Desk Mat", "Wool felt, 80 cm wide.", "desk", 2900, 60],
  ["Cable Spool", "Keeps one cable exactly where you left it.", "desk", 1400, 120],
  ["Arc Desk Lamp", "Warm dimmable light on a brass arm.", "lighting", 6400, 12],
  ["Glow Cube", "Rechargeable table light.", "lighting", 2400, 0],
  ["Clip Light", "Fastens to a shelf or a monitor.", "lighting", 1900, 33],
  ["Commuter Backpack", "Water resistant, fits a 16 inch laptop.", "bags", 9400, 9],
  ["Canvas Tote", "Heavy cotton canvas with a zip pocket.", "bags", 2200, 70],
  ["Tech Pouch", "Cables, chargers and a spare battery.", "bags", 1700, 45],
  ["Pour-over Kettle", "Gooseneck spout, 0.9 litre.", "kitchen", 5400, 18],
  ["Ceramic Mug Set", "Four hand-glazed mugs.", "kitchen", 3100, 22],
  ["Burr Grinder", "Hand grinder with 40 click settings.", "kitchen", 7900, 6],
];

interface Product {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  priceCents: number;
  stock: number;
}
const PRODUCTS: Product[] = SEED.map(([name, description, cat, priceCents, stock], i) => ({ id: i + 1, name, description, categoryId: CAT_BY_SLUG[cat], priceCents, stock }));

const USERS = [
  { id: 1, name: "Ada Admin", email: "admin@pocketstore.test", role: "ADMIN" },
  { id: 2, name: "Sam Carter", email: "sam@example.com", role: "CUSTOMER" },
  { id: 3, name: "Priya Nair", email: "priya@example.com", role: "CUSTOMER" },
  { id: 4, name: "Leo Park", email: "leo@example.com", role: "CUSTOMER" },
];
const TOKENS: Record<string, number> = { "admin-token": 1, "sam-token": 2, "priya-token": 3 };

interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  body: string;
  createdAt: string;
}
const REVIEWS0: Review[] = [
  [1, 1, 2, 5, "Battery lasts all week.", "2025-02-03"],
  [2, 1, 3, 4, "Great sound, case is a bit big.", "2025-02-11"],
  [3, 1, 4, 4, "Comfortable for long calls.", "2025-03-01"],
  [4, 3, 2, 5, "Clear and balanced.", "2025-02-14"],
  [5, 3, 3, 3, "Pads get warm after an hour.", "2025-03-05"],
  [6, 5, 3, 5, "Typing feel is superb.", "2025-01-20"],
  [7, 5, 4, 4, "Wish it had a numpad.", "2025-02-02"],
  [8, 5, 2, 5, "Hot-swap made it mine.", "2025-03-09"],
  [9, 8, 2, 4, "Warm light, sturdy arm.", "2025-02-18"],
  [10, 8, 4, 3, "Dimmer is a little fiddly.", "2025-03-12"],
  [11, 11, 3, 5, "Fits everything, stays dry.", "2025-01-28"],
  [12, 14, 4, 4, "Pours exactly where I aim.", "2025-02-25"],
  [13, 16, 2, 5, "Even grind, quiet.", "2025-03-15"],
  [14, 6, 3, 4, "Soft and does not slide.", "2025-02-08"],
].map(([id, productId, userId, rating, body, d]) => ({ id: id as number, productId: productId as number, userId: userId as number, rating: rating as number, body: body as string, createdAt: `${d}T09:30:00Z` }));

interface Order {
  id: number;
  userId: number;
  status: string;
  createdAt: string;
  items: { productId: number; quantity: number; unit: number }[];
}
const ORDERS0: Order[] = [
  { id: 1, userId: 2, status: "SHIPPED", createdAt: "2025-02-20", items: [{ productId: 1, quantity: 1, unit: 5900 }, { productId: 6, quantity: 1, unit: 2900 }] },
  { id: 2, userId: 2, status: "PAID", createdAt: "2025-03-10", items: [{ productId: 5, quantity: 1, unit: 8900 }] },
  { id: 3, userId: 3, status: "SHIPPED", createdAt: "2025-02-12", items: [{ productId: 3, quantity: 1, unit: 12900 }, { productId: 4, quantity: 2, unit: 4900 }] },
  { id: 4, userId: 3, status: "PENDING", createdAt: "2025-03-14", items: [{ productId: 11, quantity: 1, unit: 9400 }, { productId: 13, quantity: 1, unit: 1700 }] },
  { id: 5, userId: 4, status: "CANCELLED", createdAt: "2025-03-01", items: [{ productId: 8, quantity: 1, unit: 6400 }] },
  { id: 6, userId: 2, status: "PENDING", createdAt: "2025-03-16", items: [{ productId: 16, quantity: 1, unit: 7900 }, { productId: 15, quantity: 2, unit: 3100 }] },
];

const FLAKY = new Set([5, 10, 15]);

// ───────────────────────── tiny introspection ─────────────────────────

type F = [name: string, type: string, args?: [string, string][], desc?: string];
const SCHEMA_TYPES: { kind: string; name: string; desc: string; fields?: F[]; values?: string[]; members?: string[]; implementsIface?: string[] }[] = [
  {
    kind: "OBJECT",
    name: "Query",
    desc: "Everything a client may ask for.",
    fields: [
      ["shopName", "String!", [], "The shop's display name."],
      ["categories", "[Category!]!"],
      ["products", "[Product!]!", [["category", "String"], ["limit", "Int"]]],
      ["product", "Product", [["id", "ID!"]]],
      ["search", "[SearchResult!]!", [["term", "String!"]]],
      ["productsConnection", "ProductConnection!", [["first", "Int"], ["after", "String"], ["filter", "ProductFilter"], ["sort", "ProductSort"]]],
      ["me", "Account"],
      ["orders", "[Order!]!"],
    ],
  },
  { kind: "OBJECT", name: "Mutation", desc: "Everything a client may change.", fields: [["createReview", "ReviewPayload!", [["input", "ReviewInput!"]]], ["placeOrder", "OrderPayload!", [["input", "PlaceOrderInput!"]]]] },
  { kind: "OBJECT", name: "Product", desc: "Something the shop sells.", fields: [["id", "ID!"], ["name", "String!"], ["priceCents", "Int!", [], "Money is whole cents."], ["inStock", "Boolean!"], ["category", "Category!"], ["reviews", "[Review!]!"]] },
  { kind: "OBJECT", name: "Category", desc: "A shelf in the shop.", fields: [["id", "ID!"], ["slug", "String!"], ["name", "String!"], ["products", "[Product!]!"]] },
  { kind: "OBJECT", name: "Review", desc: "A customer's opinion.", fields: [["id", "ID!"], ["rating", "Int!"], ["body", "String!"], ["author", "User!"]] },
  { kind: "OBJECT", name: "Order", desc: "A placed order.", fields: [["id", "ID!"], ["status", "OrderStatus!"], ["totalCents", "Int!"]] },
  { kind: "OBJECT", name: "User", desc: "A person with an account.", fields: [["id", "ID!"], ["name", "String!"]] },
  { kind: "INTERFACE", name: "Account", desc: "Anyone who can sign in.", fields: [["id", "ID!"], ["name", "String!"], ["email", "String"], ["role", "Role!"]], members: ["Customer", "Admin"] },
  { kind: "OBJECT", name: "Customer", desc: "A shopper.", fields: [["id", "ID!"], ["name", "String!"], ["orderCount", "Int!"]], implementsIface: ["Account"] },
  { kind: "OBJECT", name: "Admin", desc: "A back-office user.", fields: [["id", "ID!"], ["name", "String!"], ["permissions", "[String!]!"]], implementsIface: ["Account"] },
  { kind: "UNION", name: "SearchResult", desc: "What search can find.", members: ["Product", "Category"] },
  { kind: "ENUM", name: "Role", desc: "", values: ["ADMIN", "CUSTOMER"] },
  { kind: "ENUM", name: "OrderStatus", desc: "", values: ["PENDING", "PAID", "SHIPPED", "CANCELLED"] },
  { kind: "ENUM", name: "ProductSort", desc: "", values: ["NAME", "PRICE_ASC", "PRICE_DESC", "NEWEST"] },
  { kind: "INPUT_OBJECT", name: "ProductFilter", desc: "Narrow a product list.", fields: [["category", "String"], ["search", "String"], ["minPriceCents", "Int"], ["maxPriceCents", "Int"], ["inStock", "Boolean"]] },
  { kind: "INPUT_OBJECT", name: "ReviewInput", desc: "", fields: [["productId", "ID!"], ["rating", "Int!"], ["body", "String"]] },
  { kind: "OBJECT", name: "ProductConnection", desc: "A page of products.", fields: [["totalCount", "Int!"], ["pageInfo", "PageInfo!"], ["edges", "[ProductEdge!]!"]] },
];
const SCALAR_NAMES = new Set(["String", "Int", "Float", "Boolean", "ID"]);
const KINDS = new Map(SCHEMA_TYPES.map((t) => [t.name, t.kind]));

function typeRef(spec: string): Json {
  if (spec.endsWith("!")) return { kind: "NON_NULL", name: null, ofType: typeRef(spec.slice(0, -1)) };
  if (spec.startsWith("[")) return { kind: "LIST", name: null, ofType: typeRef(spec.slice(1, -1)) };
  return { kind: SCALAR_NAMES.has(spec) ? "SCALAR" : (KINDS.get(spec) ?? "OBJECT"), name: spec, ofType: null };
}

function introspection(): Json {
  const named = (n: string) => typeRef(n);
  const types = [
    ...SCHEMA_TYPES.map((t) => ({
      kind: t.kind,
      name: t.name,
      description: t.desc || null,
      fields: t.kind === "OBJECT" || t.kind === "INTERFACE" ? (t.fields ?? []).map(([name, type, args, desc]) => ({ name, description: desc ?? null, args: (args ?? []).map(([an, at]) => ({ name: an, description: null, type: typeRef(at), defaultValue: null })), type: typeRef(type), isDeprecated: false, deprecationReason: null })) : null,
      inputFields: t.kind === "INPUT_OBJECT" ? (t.fields ?? []).map(([name, type]) => ({ name, description: null, type: typeRef(type), defaultValue: null })) : null,
      interfaces: t.kind === "OBJECT" ? (t.implementsIface ?? []).map(named) : null,
      enumValues: t.kind === "ENUM" ? (t.values ?? []).map((name) => ({ name, description: null, isDeprecated: false, deprecationReason: null })) : null,
      possibleTypes: t.kind === "UNION" || t.kind === "INTERFACE" ? (t.members ?? []).map(named) : null,
    })),
    ...[...SCALAR_NAMES].map((name) => ({ kind: "SCALAR", name, description: null, fields: null, inputFields: null, interfaces: null, enumValues: null, possibleTypes: null })),
  ];
  return { __schema: { queryType: { name: "Query" }, mutationType: { name: "Mutation" }, types } };
}

// ───────────────────────── the program ─────────────────────────

interface Req {
  query?: string;
  variables?: Json | null;
  operationName?: string | null;
  headers?: Record<string, string>;
}

const gqlError = (message: string, code: string, path?: (string | number)[]) => ({ message, ...(path ? { path } : {}), extensions: { code } });

export function graphqlGatewayDemoProgram(): ProgramHandle {
  let reviews: Review[] = REVIEWS0.map((r) => ({ ...r }));
  let orders: Order[] = ORDERS0.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) }));
  let introspectionOn = true;
  const serverLog: { type: string; message: string }[] = [];

  const cat = (id: number) => CATEGORIES.find((c) => Number(c.id) === id)!;
  const user = (id: number) => USERS.find((u) => u.id === id);
  const productCard = (p: Product) => ({ id: String(p.id), name: p.name, priceCents: p.priceCents, inStock: p.stock > 0 });
  const reviewsOf = (pid: number) => reviews.filter((r) => r.productId === pid);
  const avg = (pid: number) => {
    const rs = reviewsOf(pid);
    return rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : null;
  };
  const orderTotal = (o: Order) => o.items.reduce((s, i) => s + i.quantity * i.unit, 0);
  const orderJson = (o: Order) => ({
    id: String(o.id),
    status: o.status,
    createdAt: `${o.createdAt}T10:15:00Z`,
    totalCents: orderTotal(o),
    items: o.items.map((i) => ({ quantity: i.quantity, product: { id: String(i.productId), name: PRODUCTS[i.productId - 1].name } })),
  });
  const who = (headers?: Record<string, string>) => {
    const h = headers ?? {};
    const raw = Object.entries(h).find(([k]) => k.toLowerCase() === "authorization")?.[1] ?? "";
    const id = TOKENS[raw.replace(/^Bearer\s+/i, "")];
    return id ? (user(id) ?? null) : null;
  };

  const productPage = (p: Product, query: string, path: (string | number)[]) => {
    const errors: ReturnType<typeof gqlError>[] = [];
    const out: Json = { id: String(p.id), name: p.name, description: p.description, priceCents: p.priceCents, inStock: p.stock > 0, category: { name: cat(p.categoryId).name } };
    if (query.includes("averageRating")) out.averageRating = avg(p.id);
    if (query.includes("reviews")) out.reviews = reviewsOf(p.id).map((r) => ({ id: String(r.id), rating: r.rating, body: r.body, createdAt: r.createdAt, author: { name: user(r.userId)?.name ?? "?" } }));
    if (query.includes("shippingEstimate")) {
      if (FLAKY.has(p.id)) {
        out.shippingEstimate = null;
        errors.push(gqlError("Internal server error", "INTERNAL_SERVER_ERROR", [...path, "shippingEstimate"]));
        serverLog.push({ type: "TimeoutError", message: `shipping service did not answer for product ${p.id}` });
      } else out.shippingEstimate = p.stock > 20 ? "Ships tomorrow" : "Ships in 3 days";
    }
    return { out, errors };
  };

  const execute = (req: Req) => {
    const query = typeof req?.query === "string" ? req.query : "";
    const vars: Json = req?.variables && typeof req.variables === "object" ? req.variables : {};
    if (!query.trim()) return { data: null, errors: [gqlError("The request must include a non-empty query string.", "BAD_REQUEST")] };
    const name = req.operationName || /(?:query|mutation)\s+(\w+)/.exec(query)?.[1] || "";
    const me = who(req.headers);
    const stat = (resolvers: number, sql: number, queries: string[] = []) => ({ stats: { resolvers, sql, queries, ms: 1.8 + sql * 0.7 } });
    const reply = (data: unknown, resolvers: number, sql: number, queries?: string[], errors?: unknown[]) => ({ data, ...(errors && errors.length ? { errors } : {}), extensions: stat(resolvers, sql, queries) });

    switch (name) {
      case "Hello":
        return reply({ shopName: "Pocket Store", tagline: "Small things for big desks", openingHours: ["Mon-Fri 9-17", "Sat 10-14"] }, 3, 0);
      case "Home":
        return reply({ categories: CATEGORIES.map(({ id, name }) => ({ id, name })), newArrivals: [...PRODUCTS].reverse().slice(0, 6).map(productCard) }, 20, 2, ["SELECT * FROM categories", "SELECT * FROM products ORDER BY id DESC LIMIT 6"]);
      case "ProductsInCategory": {
        const limit = typeof vars.limit === "number" ? vars.limit : 4;
        const slugVar = typeof vars.category === "string" ? vars.category : "audio";
        const pick = (slug: string, n: number) => PRODUCTS.filter((p) => cat(p.categoryId).slug === slug).slice(0, n).map(({ id, name, priceCents }) => ({ id: String(id), name, priceCents }));
        return reply({ cheap: pick(slugVar, limit), desk: pick("desk", 2) }, 14, 2);
      }
      case "Search": {
        const term = String(vars.term ?? "").toLowerCase();
        const hits: Json[] = [
          ...CATEGORIES.filter((c) => c.name.toLowerCase().includes(term)).map((c) => ({ __typename: "Category", id: c.id, name: c.name })),
          ...PRODUCTS.filter((p) => p.name.toLowerCase().includes(term) || cat(p.categoryId).slug.includes(term)).map((p) => ({ __typename: "Product", id: String(p.id), name: p.name, priceCents: p.priceCents })),
        ];
        return reply({ search: hits }, 2 + hits.length * 3, 2);
      }
      case "Accounts":
        return reply(
          { users: USERS.map((u) => (u.role === "ADMIN" ? { __typename: "Admin", id: String(u.id), name: u.name, permissions: ["MANAGE_PRODUCTS", "VIEW_ALL_ORDERS"] } : { __typename: "Customer", id: String(u.id), name: u.name, orderCount: orders.filter((o) => o.userId === u.id).length })) },
          18,
          1,
        );
      case "ProductPage": {
        const id = Number(vars.id);
        const p = PRODUCTS.find((x) => x.id === id);
        if (!p) return reply({ product: null }, 1, 1);
        if (query.includes("warehouse") && FLAKY.has(p.id)) {
          serverLog.push({ type: "TimeoutError", message: `warehouse service did not answer for product ${p.id}` });
          return { data: { product: null }, errors: [gqlError("Internal server error", "INTERNAL_SERVER_ERROR", ["product", "warehouse"])], extensions: stat(3, 1) };
        }
        const { out, errors } = productPage(p, query, ["product"]);
        return reply({ product: out }, 6 + reviewsOf(p.id).length * 4, 3, ["SELECT * FROM products WHERE id = ?", "SELECT * FROM categories WHERE id IN (?)", "SELECT * FROM reviews WHERE product_id IN (?)"], errors);
      }
      case "Me":
        return reply({ me: me ? { id: String(me.id), name: me.name, role: me.role } : null }, 4, me ? 1 : 0);
      case "WhoAmI": {
        if (!me) return reply({ me: null }, 1, 0);
        const base: Json = { __typename: me.role === "ADMIN" ? "Admin" : "Customer", id: String(me.id), name: me.name, email: me.email, role: me.role };
        if (me.role !== "ADMIN") base.orders = orders.filter((o) => o.userId === me.id).map((o) => ({ id: String(o.id), status: o.status }));
        return reply({ me: base }, 8, 2);
      }
      case "CatalogueWithCategories":
        return reply({ products: PRODUCTS.map((p) => ({ name: p.name, category: { name: cat(p.categoryId).name } })) }, 1 + PRODUCTS.length * 3, 2, ["SELECT * FROM products LIMIT 16", "SELECT * FROM categories WHERE id IN (1, 2, 3, 4, 5)"]);
      case "ReviewsWithAuthors":
        return reply(
          { products: PRODUCTS.map((p) => ({ name: p.name, reviews: reviewsOf(p.id).map((r) => ({ rating: r.rating, author: { name: user(r.userId)?.name ?? "?" } })) })) },
          1 + PRODUCTS.length * 2 + reviews.length * 3,
          3,
          ["SELECT * FROM products LIMIT 16", "SELECT * FROM reviews WHERE product_id IN (1, 2, 3)", "SELECT * FROM users WHERE id IN (2, 3, 4)"],
        );
      case "MyOrders":
        if (!me) return { data: null, errors: [gqlError("Sign in to see your orders.", "UNAUTHENTICATED", ["orders"])], extensions: stat(1, 0) };
        return reply({ orders: orders.filter((o) => o.userId === me.id).map(orderJson) }, 10, 2);
      case "AdminUsers":
        if (!me) return { data: null, errors: [gqlError("Sign in first.", "UNAUTHENTICATED", ["users"])], extensions: stat(1, 0) };
        if (me.role !== "ADMIN") return { data: null, errors: [gqlError("Only admins may list every user.", "FORBIDDEN", ["users"])], extensions: stat(1, 0) };
        return reply({ users: USERS.map((u) => ({ __typename: u.role === "ADMIN" ? "Admin" : "Customer", id: String(u.id), name: u.name, email: u.email, role: u.role })), allOrders: orders.map((o) => ({ id: String(o.id), status: o.status, totalCents: orderTotal(o) })) }, 20, 2);
      case "Flaky": {
        const errors: unknown[] = [];
        const rows = PRODUCTS.slice(0, 10).map((p, i) => {
          if (FLAKY.has(p.id)) {
            errors.push(gqlError("Internal server error", "INTERNAL_SERVER_ERROR", ["products", i, "shippingEstimate"]));
            serverLog.push({ type: "TimeoutError", message: `shipping service did not answer for product ${p.id}` });
            return { id: String(p.id), name: p.name, shippingEstimate: null };
          }
          return { id: String(p.id), name: p.name, shippingEstimate: "Ships in 3 days" };
        });
        return reply({ products: rows }, 31, 1, undefined, errors);
      }
      case "FlakyNonNull":
        serverLog.push({ type: "TimeoutError", message: "warehouse service did not answer for product 5" });
        return { data: { product: null }, errors: [gqlError("Internal server error", "INTERNAL_SERVER_ERROR", ["product", "warehouse"])], extensions: stat(3, 1) };
      case "Browse": {
        const filter = (vars.filter ?? {}) as Json;
        let list = [...PRODUCTS];
        if (typeof filter.category === "string" && filter.category) list = list.filter((p) => cat(p.categoryId).slug === filter.category);
        if (typeof filter.search === "string" && filter.search) list = list.filter((p) => p.name.toLowerCase().includes(String(filter.search).toLowerCase()));
        if (typeof filter.maxPriceCents === "number") list = list.filter((p) => p.priceCents <= (filter.maxPriceCents as number));
        if (filter.inStock === true) list = list.filter((p) => p.stock > 0);
        const sort = String(vars.sort ?? "NAME");
        list.sort(sort === "PRICE_ASC" ? (a, b) => a.priceCents - b.priceCents : sort === "PRICE_DESC" ? (a, b) => b.priceCents - a.priceCents : sort === "NEWEST" ? (a, b) => b.id - a.id : (a, b) => a.name.localeCompare(b.name));
        const enc = (i: number) => (typeof btoa === "function" ? btoa(`offset:${i}`) : `offset:${i}`);
        const start = typeof vars.after === "string" && vars.after ? Number((typeof atob === "function" ? atob(vars.after) : vars.after).replace("offset:", "")) + 1 : 0;
        const first = typeof vars.first === "number" ? vars.first : 6;
        const page = list.slice(start, start + first);
        return reply(
          {
            productsConnection: {
              totalCount: list.length,
              pageInfo: { hasNextPage: start + first < list.length, endCursor: page.length ? enc(start + page.length - 1) : null },
              edges: page.map((p, i) => ({ cursor: enc(start + i), node: { id: String(p.id), name: p.name, priceCents: p.priceCents, category: { name: cat(p.categoryId).name } } })),
            },
          },
          4 + page.length * 5,
          3,
        );
      }
      case "AddReview": {
        if (!me) return { data: { createReview: null }, errors: [gqlError("Sign in to write a review.", "UNAUTHENTICATED", ["createReview"])], extensions: stat(1, 0) };
        const input = (vars.input ?? {}) as Json;
        const rating = Number(input.rating);
        const pid = Number(input.productId);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return reply({ createReview: { review: null, userErrors: [{ field: "rating", message: "Rating must be a whole number from 1 to 5." }] } }, 4, 0);
        if (!PRODUCTS.find((p) => p.id === pid)) return reply({ createReview: { review: null, userErrors: [{ field: "productId", message: "No such product." }] } }, 4, 1);
        const r: Review = { id: reviews.length + 1, productId: pid, userId: me.id, rating, body: String(input.body ?? ""), createdAt: new Date().toISOString() };
        reviews = [...reviews, r];
        return reply({ createReview: { review: { id: String(r.id), rating: r.rating, body: r.body, author: { name: me.name } }, userErrors: [] } }, 8, 3);
      }
      case "PlaceOrder": {
        if (!me) return { data: { placeOrder: null }, errors: [gqlError("Sign in to place an order.", "UNAUTHENTICATED", ["placeOrder"])], extensions: stat(1, 0) };
        const lines = ((vars.input as Json | undefined)?.lines ?? []) as { productId: string; quantity: number }[];
        const userErrors: { field: string; message: string }[] = [];
        const items: Order["items"] = [];
        lines.forEach((l, i) => {
          const p = PRODUCTS.find((x) => x.id === Number(l.productId));
          if (!p) userErrors.push({ field: `lines.${i}.productId`, message: "No such product." });
          else if (!(l.quantity >= 1)) userErrors.push({ field: `lines.${i}.quantity`, message: "Quantity must be at least 1." });
          else if (l.quantity > p.stock) userErrors.push({ field: `lines.${i}.quantity`, message: `Only ${p.stock} of ${p.name} in stock.` });
          else items.push({ productId: p.id, quantity: l.quantity, unit: p.priceCents });
        });
        if (userErrors.length || items.length === 0) return reply({ placeOrder: { order: null, userErrors: userErrors.length ? userErrors : [{ field: "lines", message: "An order needs at least one line." }] } }, 6, 1);
        const o: Order = { id: orders.length + 1, userId: me.id, status: "PENDING", createdAt: new Date().toISOString().slice(0, 10), items };
        orders = [...orders, o];
        return reply({ placeOrder: { order: { id: String(o.id), status: o.status, totalCents: orderTotal(o) }, userErrors: [] } }, 10, 4);
      }
      case "IntrospectionQuery":
      case "IntrospectionHead":
      case "IntrospectionTypes": {
        if (!introspectionOn) return { data: null, errors: [gqlError("GraphQL introspection has been disabled, but the requested query contained the field '__schema'.", "INTROSPECTION_DISABLED")] };
        const full = introspection() as { __schema: { queryType: Json; mutationType: Json; types: { name: string }[] } };
        if (name === "IntrospectionQuery") return { data: full };
        if (name === "IntrospectionHead") return { data: { __schema: { ...full.__schema, types: full.__schema.types.map((t) => ({ name: t.name })) } } };
        const out: Record<string, unknown> = {};
        for (const m of query.matchAll(/(t\d+): __type\(name: "([^"]+)"\)/g)) out[m[1]] = full.__schema.types.find((t) => t.name === m[2]) ?? null;
        return { data: out };
      }
      case "DeepCycle":
        return { data: null, errors: [gqlError("Query depth 8 exceeds the maximum of 6.", "DEPTH_LIMIT_EXCEEDED")] };
      case "AliasBomb":
        return { data: null, errors: [gqlError("Query cost 3100 exceeds the maximum of 1000.", "COMPLEXITY_LIMIT_EXCEEDED")] };
      case "HugePage":
        return { data: null, errors: [gqlError("limit must be between 1 and 100.", "BAD_USER_INPUT")] };
      case "LegitHeavy":
        return reply({ products: PRODUCTS.map((p) => ({ name: p.name, category: { name: cat(p.categoryId).name }, reviews: reviewsOf(p.id).map((r) => ({ rating: r.rating, author: { name: user(r.userId)?.name ?? "?" } })) })) }, 120, 3);
      default:
        return { data: null, errors: [gqlError("The demo server only knows the preset operations. Run the real thing by completing the lessons.", "DEMO")] };
    }
  };

  return createStaticProgram({
    hooks: {
      execute: execute as never,
      reset_db: (() => {
        reviews = REVIEWS0.map((r) => ({ ...r }));
        orders = ORDERS0.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) }));
        serverLog.length = 0;
        return true;
      }) as never,
      recent_errors: (() => serverLog.slice(-20)) as never,
      set_introspection: ((enabled: boolean) => {
        introspectionOn = enabled !== false;
        return introspectionOn;
      }) as never,
      run_tests: (() =>
        [
          "hello query returns the shop name",
          "unknown field is rejected with a validation error",
          "products resolve their category through the loader",
          "createReview rejects a rating of 9 with a userError",
          "anonymous orders query is UNAUTHENTICATED",
          "a query nested 9 levels deep is rejected",
        ].map((name) => ({ name, passed: true, error: null }))) as never,
      compare_rest: ((productId: number) => {
        const p = PRODUCTS.find((x) => x.id === Number(productId)) ?? PRODUCTS[0];
        const rs = reviewsOf(p.id);
        const authors = [...new Set(rs.map((r) => r.userId))];
        const calls = [
          { path: `/products/${p.id}`, bytes: JSON.stringify({ id: p.id, sku: "SKU", name: p.name, description: p.description, category_id: p.categoryId, price_cents: p.priceCents, stock: p.stock, created_at: "2025-01-01T00:00:00Z" }).length },
          { path: `/categories/${p.categoryId}`, bytes: 96 },
          { path: `/products/${p.id}/reviews`, bytes: 40 + rs.length * 138 },
          ...authors.map((u) => ({ path: `/users/${u}`, bytes: 148 })),
        ];
        const page = productPage(p, "averageRating reviews", ["product"]).out;
        return {
          rest: { requests: calls.length, bytes: calls.reduce((s, c) => s + c.bytes, 0), calls },
          graphql: { requests: 1, bytes: JSON.stringify({ data: { product: page } }).length },
        };
      }) as never,
    },
  });
}
