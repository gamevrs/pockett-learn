import type { Lesson } from "@/engine/types";
import { py, T } from "./shared.ts";

/** Chapter 2: Resolvers and performance. The resolver chain, a per-request context, a query plan, the N+1 fix. */
export const chapter2: Lesson[] = [
  // ───────────────────────────────────────── 5. resolver chain + context
  {
    id: "graphql-gateway-5-resolvers",
    title: "The resolver chain and context",
    minutes: 40,
    xp: 180,
    concepts: ["parent", "info", "arguments", "context", "default resolver", "authentication", "nested fields"],
    learn: `### A query is a tree; resolution walks it

Take this query:

~~~graphql
{ product(id: 3) { name category { name } reviews { rating author { name } } } }
~~~

GraphQL does not run it as one big function. It resolves the **root field** first, then resolves each selected field of the result, then the fields of *those* results, and so on down the tree:

1. \`Query.product\` runs with \`parent = root_value\` and returns a product dict.
2. For that product the executor calls \`Product.name\` (default resolver), \`Product.category\` and \`Product.reviews\`, each with \`parent = the product dict\`.
3. \`Product.reviews\` returns a **list**; the executor calls \`Review.rating\` and \`Review.author\` once **per review**, each with \`parent = that review\`.
4. \`Review.author\` returns a user; \`Account.name\` runs on it. And so on.

This is the **resolver chain**: each resolver receives the value its parent field produced. A resolver never needs to know about the whole query. It answers only: "given this parent and these arguments, what is *my* value?" The same resolver therefore works for every query that mentions the field, in any nesting.

### The resolver signature

~~~python
def resolve_category(parent, info, **arguments): ...
~~~

- **parent**: the enclosing object (for root fields, the \`root_value\`).
- **info**: a \`GraphQLResolveInfo\` with \`field_name\`, \`parent_type\`, \`return_type\`, \`path\` (where in the response we are), \`operation\`, \`variable_values\`, \`field_nodes\` (the parsed selection, used for look-ahead) and, importantly, \`info.context\`.
- **arguments**: the field's arguments as keyword arguments, defaults filled in.

The **default resolver** is just a resolver that does \`parent[field_name]\`. Everything you have not written explicitly goes through it.

### Context: per-request state

Where does a resolver find the database connection, the current user or a cache? Not in globals: globals are shared between requests (so one user's data could leak into another's) and make tests hard (you cannot swap the database). GraphQL gives you a **context**: one object created for each request and handed to every resolver as \`info.context\`.

~~~python
class Context:
    def __init__(self, db, user=None):
        self.db = db            # the database connection for this request
        self.user = user        # who is calling (or None)
        self.loaders = {}       # per-request caches; lesson 7 fills this
~~~

You pass it as \`context_value\` when executing; our pipeline already calls \`build_context(request)\` for that. Typical contents: the DB session, the authenticated user, loaders, a request id, feature flags.

### Authentication belongs in the context

Authentication ("who are you?") happens **once per request**, before any resolver. The client sends a token in a header, you look it up and put the user in the context. Resolvers then ask \`info.context.user\` instead of parsing headers themselves. (Authorization, "may you do this?", is lesson 11.)

~~~python
Authorization: Bearer sam-token      # request["headers"]["Authorization"]
~~~

Header names are case-insensitive, so normalize them before lookup. An unknown or missing token is simply **anonymous** (\`user = None\`), not an error: lots of fields are public.

### Nested fields and relations

Relations are fields. \`Product.category\` takes the product's \`category_id\` and fetches the category. \`Category.products\` goes the other way. \`Review.author\` returns an \`Account\`: an interface, so the resolver tags the row exactly as in lesson 4. Because the graph can be walked in any direction, you can reach the same product from many paths. That flexibility is also a performance trap, and the next two lessons make it visible and fix it.

### Computing values

\`Order.totalCents\` is not stored: it is the sum of the order's items. \`OrderItem.lineTotalCents\` is \`quantity * unit_price_cents\`. \`Product.averageRating\` is an aggregate that is \`null\` when there are no reviews, so its type is plain \`Float\` rather than \`Float!\`. Derived fields keep the database simple and the schema friendly.

### Common mistakes

- Using a global connection or user inside resolvers instead of \`info.context\`.
- Parsing the Authorization header in several resolvers instead of once.
- Returning a Row object or \`None\` where the schema promised a non-null object.
- Assuming a resolver runs once. For list fields it runs once per item.`,
    mission: `The shop's graph needs depth: products belong to categories, have reviews written by accounts, and customers have orders made of items. Add those types and their resolvers, and give every request a **context** carrying the database and the signed-in user.

Run it, and the client app's **product page** opens (category, rating, reviews with authors from one query) and the Explorer gets a **Sign in as** switcher that changes who your API thinks is calling.`,
    tasks: [
      "SDL: enum OrderStatus, types Review, OrderItem and Order; extend Category (products), Product (category, reviews, averageRating) and Customer (orders); extend Query with me: Account",
      "class Context(db, user=None) with a loaders dict; current_user(db, headers) that reads a case-insensitive Authorization: Bearer <token> header via TOKENS; make_context(request) and build_context = make_context",
      "Resolvers for every new field, reading from info.context.db; Query.me returns the tagged user or None; Order.totalCents and OrderItem.lineTotalCents are computed",
      "Rebuild the schema with make_schema()",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: the resolver chain and the request context.

# 1) Grow the graph (use TYPE_DEFS += and extend type ...).
TYPE_DEFS += """
"""


# 2) The per-request context, and authentication from the Authorization header.
class Context:
    ...


def current_user(db, headers):
    """The user row for 'Authorization: Bearer <token>' (header name in any case), or None."""
    ...


def make_context(request):
    """One Context per request: the live database plus whoever is calling."""
    ...


build_context = make_context  # plug it into the pipeline from lesson 3


# 3) Resolvers. Take the connection from info.context.db, and use ? placeholders.
# Query.me, Product.category, Product.reviews, Product.averageRating, Review.author, Review.product,
# Category.products, Customer.orders, Order.items, Order.totalCents, OrderItem.product, OrderItem.lineTotalCents


schema = make_schema()
`,
    solutionAdd: py`TYPE_DEFS += """
enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  CANCELLED
}

type Review {
  id: ID!
  rating: Int!
  body: String!
  createdAt: String!
  author: Account!
  product: Product!
}

type OrderItem {
  id: ID!
  quantity: Int!
  unitPriceCents: Int!
  lineTotalCents: Int!
  product: Product!
}

type Order {
  id: ID!
  status: OrderStatus!
  createdAt: String!
  totalCents: Int!
  items: [OrderItem!]!
}

extend type Category {
  products: [Product!]!
}

extend type Product {
  category: Category!
  reviews: [Review!]!
  averageRating: Float
}

extend type Customer {
  orders: [Order!]!
}

extend type Query {
  me: Account
}
"""


class Context:
    """Everything a resolver may need about THIS request."""

    def __init__(self, db, user=None):
        self.db = db  # the database connection
        self.user = user  # the signed-in user row, or None for anonymous
        self.loaders = {}  # per-request caches (lesson 7)


def current_user(db, headers):
    """The user row for 'Authorization: Bearer <token>' (header name in any case), or None."""
    if not isinstance(headers, dict):
        return None
    value = {str(k).lower(): v for k, v in headers.items()}.get("authorization", "")
    scheme, _, token = str(value).partition(" ")
    user_id = TOKENS.get(token.strip()) if scheme.lower() == "bearer" else None
    if user_id is None:
        return None
    return fetch_one(db, "SELECT * FROM users WHERE id = ?", (user_id,))


def make_context(request):
    """One Context per request: the live database plus whoever is calling."""
    headers = request.get("headers") if isinstance(request, dict) else None
    return Context(DB, current_user(DB, headers))


build_context = make_context  # plug it into the pipeline from lesson 3


@resolver("Query", "me")
def resolve_me(root, info):
    user = info.context.user
    return tag_account(user) if user else None


@resolver("Product", "category")
def resolve_product_category(product, info):
    return fetch_one(info.context.db, "SELECT * FROM categories WHERE id = ?", (product["category_id"],))


@resolver("Product", "reviews")
def resolve_product_reviews(product, info):
    return fetch_all(info.context.db, "SELECT * FROM reviews WHERE product_id = ? ORDER BY id", (product["id"],))


@resolver("Product", "averageRating")
def resolve_average_rating(product, info):
    row = fetch_one(info.context.db, "SELECT AVG(rating) AS average FROM reviews WHERE product_id = ?", (product["id"],))
    return round(row["average"], 1) if row["average"] is not None else None


@resolver("Review", "author")
def resolve_review_author(review, info):
    return tag_account(fetch_one(info.context.db, "SELECT * FROM users WHERE id = ?", (review["user_id"],)))


@resolver("Review", "product")
def resolve_review_product(review, info):
    return fetch_one(info.context.db, "SELECT * FROM products WHERE id = ?", (review["product_id"],))


@resolver("Category", "products")
def resolve_category_products(category, info):
    return fetch_all(info.context.db, "SELECT * FROM products WHERE category_id = ? ORDER BY id", (category["id"],))


@resolver("Customer", "orders")
def resolve_customer_orders(user, info):
    return fetch_all(info.context.db, "SELECT * FROM orders WHERE user_id = ? ORDER BY id", (user["id"],))


@resolver("Order", "items")
def resolve_order_items(order, info):
    return fetch_all(info.context.db, "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", (order["id"],))


@resolver("Order", "totalCents")
def resolve_order_total(order, info):
    row = fetch_one(info.context.db, "SELECT COALESCE(SUM(quantity * unit_price_cents), 0) AS total FROM order_items WHERE order_id = ?", (order["id"],))
    return row["total"]


@resolver("OrderItem", "product")
def resolve_item_product(item, info):
    return fetch_one(info.context.db, "SELECT * FROM products WHERE id = ?", (item["product_id"],))


@resolver("OrderItem", "lineTotalCents")
def resolve_line_total(item, info):
    return item["quantity"] * item["unit_price_cents"]


schema = make_schema()`,
    explanation:
      "Each resolver answers one question: given my parent and my arguments, what is my value? The executor walks the tree and calls them for you, once per object for list fields. The context is created once per request and carries the connection and the caller, which keeps resolvers free of globals and makes it trivial to swap the database in a test. Authentication happens in one place (current_user) and an unknown token is just anonymous. Derived fields such as totalCents and averageRating keep the database normalized while the schema stays convenient.",
    hints: [
      { id: "h1", title: "SDL pieces", content: "enum OrderStatus { PENDING PAID SHIPPED CANCELLED }; type Review { id: ID! rating: Int! body: String! createdAt: String! author: Account! product: Product! }; type OrderItem { id: ID! quantity: Int! unitPriceCents: Int! lineTotalCents: Int! product: Product! }; type Order { id: ID! status: OrderStatus! createdAt: String! totalCents: Int! items: [OrderItem!]! }. Then extend type Category { products: [Product!]! }, extend type Product { category: Category! reviews: [Review!]! averageRating: Float }, extend type Customer { orders: [Order!]! }, extend type Query { me: Account }." },
      { id: "h2", title: "Context and the header", content: 'Context.__init__(self, db, user=None) stores db, user and self.loaders = {}. In current_user lower-case the header names: {str(k).lower(): v for k, v in headers.items()}.get("authorization", ""); value.partition(" ") gives scheme, _, token; accept only scheme.lower() == "bearer"; TOKENS.get(token) is a user id; then fetch_one the users row. make_context returns Context(DB, current_user(DB, headers)).' },
      { id: "h3", title: "Resolvers", content: "Every parent is a dict: product[\"category_id\"], review[\"user_id\"], order[\"id\"]... Use fetch_one / fetch_all with info.context.db. Review.author and Query.me return tag_account(row) because Account is an interface. averageRating: SELECT AVG(rating) ... and round(value, 1), or None when there are no reviews." },
      { id: "h4", title: "Totals", content: "Order.totalCents: SELECT COALESCE(SUM(quantity * unit_price_cents), 0) AS total FROM order_items WHERE order_id = ?. OrderItem.lineTotalCents needs no SQL: item[\"quantity\"] * item[\"unit_price_cents\"]." },
    ],
    tests: [
      {
        id: "t1",
        description: "The new types and relations exist with the right shapes",
        assertionCode: T(py`T = schema.type_map
for name, kind in (("Review", "object"), ("Order", "object"), ("OrderItem", "object")):
    assert name in T, "type " + name + " is missing"
assert str(T["Product"].fields["category"].type) == "Category!", "Product.category: Category!"
assert str(T["Product"].fields["reviews"].type) == "[Review!]!", "Product.reviews: [Review!]!"
assert str(T["Product"].fields["averageRating"].type) == "Float", "averageRating is a nullable Float (null when there are no reviews)"
assert str(T["Review"].fields["author"].type) == "Account!", "Review.author: Account!"
assert str(T["Category"].fields["products"].type) == "[Product!]!", "Category.products: [Product!]!"
assert str(T["Customer"].fields["orders"].type) == "[Order!]!", "Customer.orders: [Order!]!"
assert str(T["Order"].fields["items"].type) == "[OrderItem!]!" and str(T["Order"].fields["status"].type) == "OrderStatus!", "Order.items and Order.status"
assert set(T["OrderStatus"].values) == {"PENDING", "PAID", "SHIPPED", "CANCELLED"}, "OrderStatus values"
assert str(schema.query_type.fields["me"].type) == "Account", "me: Account (nullable, anonymous callers get null)"`),
      },
      {
        id: "t2",
        description: "A nested query follows the chain: product -> category, reviews -> author",
        assertionCode: T(py`_fresh()
q = "{ product(id: 1) { name averageRating category { name } reviews { rating body author { name } } } }"
p = _data(_gql(q))["product"]
assert p["name"] == "Tide Earbuds" and p["category"] == {"name": "Audio"}, "Product.category should resolve the category of the product, got " + repr(p)
assert [r["rating"] for r in p["reviews"]] == [5, 4, 4], "Tide Earbuds has three reviews (5, 4, 4) ordered by id, got " + repr(p["reviews"])
assert [r["author"]["name"] for r in p["reviews"]] == ["Sam Carter", "Priya Nair", "Leo Park"], "Review.author should be the reviewer"
assert p["averageRating"] == 4.3, "averageRating of 5, 4, 4 is 4.3 (rounded to one decimal), got " + repr(p["averageRating"])
assert _data(_gql("{ product(id: 2) { averageRating reviews { id } } }"))["product"] == {"averageRating": None, "reviews": []}, "A product with no reviews has averageRating null and reviews []"`),
      },
      {
        id: "t3",
        description: "The other direction: category -> products, review -> product",
        assertionCode: T(py`_fresh()
d = _data(_gql("{ categories { name products { name } } }"))["categories"]
assert [len(c["products"]) for c in d] == [3, 4, 3, 3, 3], "Products per category should be 3, 4, 3, 3, 3, got " + repr([len(c["products"]) for c in d])
assert d[0]["products"][0]["name"] == "Tide Earbuds"
r = _data(_gql("{ product(id: 5) { reviews { product { name } } } }"))["product"]["reviews"]
assert [x["product"]["name"] for x in r] == ["Mechanical Keyboard"] * 3, "Review.product should walk back to the product"`),
      },
      {
        id: "t4",
        description: "The context carries the database and the caller (case-insensitive header)",
        assertionCode: T(py`_fresh()
c = make_context({"headers": {}})
assert isinstance(c, Context) and c.db is DB, "make_context should return a Context whose db is the live DB"
assert c.user is None and c.loaders == {}, "Anonymous requests have user None, and a fresh empty loaders dict"
assert make_context({"headers": {"Authorization": "Bearer sam-token"}}).user["email"] == "sam@example.com", "Bearer sam-token is Sam"
assert make_context({"headers": {"authorization": "Bearer admin-token"}}).user["role"] == "ADMIN", "Header names are case-insensitive"
assert make_context({"headers": {"AUTHORIZATION": "bearer priya-token"}}).user["name"] == "Priya Nair", "The scheme is case-insensitive too"
for bad in ({"Authorization": "Bearer nope"}, {"Authorization": "Basic sam-token"}, {"Authorization": "sam-token"}, {"Authorization": ""}, None, {}):
    assert make_context({"headers": bad}).user is None, "Headers " + repr(bad) + " should be anonymous, not an error"
assert make_context({}).user is None and make_context(None).user is None, "A request without headers is anonymous"
assert build_context is make_context or build_context({"headers": {}}).db is DB, "build_context should now produce your Context"`),
      },
      {
        id: "t5",
        description: "me depends on who is calling",
        assertionCode: T(py`_fresh()
assert _data(_gql("{ me { name } }"))["me"] is None, "Anonymous: me is null"
assert _data(_gql("{ me { __typename name } }", token="sam-token"))["me"] == {"__typename": "Customer", "name": "Sam Carter"}
assert _data(_gql("{ me { __typename name role } }", token="admin-token"))["me"] == {"__typename": "Admin", "name": "Ada Admin", "role": "ADMIN"}
assert _data(_gql("{ me { name } }", token="bogus"))["me"] is None, "An unknown token is anonymous, not an error"`),
      },
      {
        id: "t6",
        description: "Order history: computed totals along the chain",
        assertionCode: T(py`_fresh()
q = "{ me { ... on Customer { orderCount orders { id status totalCents items { quantity unitPriceCents lineTotalCents product { name } } } } } }"
me = _data(_gql(q, token="sam-token"))["me"]
assert me["orderCount"] == 3 and [o["id"] for o in me["orders"]] == ["1", "2", "6"], "Sam's orders are 1, 2 and 6, got " + repr([o["id"] for o in me["orders"]])
first = me["orders"][0]
assert first["status"] == "SHIPPED" and first["totalCents"] == 8800, "Order 1 totals 5900 + 2900 = 8800, got " + repr(first)
assert [i["product"]["name"] for i in first["items"]] == ["Tide Earbuds", "Felt Desk Mat"]
last = me["orders"][2]
assert last["totalCents"] == 14100 and last["items"][1]["lineTotalCents"] == 6200, "Order 6: 7900 + 2 x 3100 = 14100; the second line is 6200, got " + repr(last)`),
      },
      {
        id: "t7",
        description: "Resolvers read the connection from info.context, so a test can swap it",
        assertionCode: T(py`_fresh()
other = connect()
other.execute("UPDATE categories SET name = 'Swapped' WHERE id = 1")
other.commit()
saved = build_context
build_context = lambda request: Context(other)
try:
    d = _data(_gql("{ product(id: 3) { category { name } reviews { rating } } }"))["product"]
finally:
    build_context = saved
assert d["category"]["name"] == "Swapped", "Product.category should query info.context.db (not the global DB), got " + repr(d["category"])
d = _data(_gql("{ product(id: 3) { category { name } } }"))["product"]
assert d["category"]["name"] == "Audio", "With the normal context the real database is used again"`),
      },
    ],
    unlocks: ["gql-product", "gql-identity"],
    checks: [
      {
        prompt: "For the query `{ products(limit: 3) { name category { name } } }`, how many times does the `Product.category` resolver run?",
        question: { type: "number", answer: 3 },
        explanation:
          "`Product.category` is resolved once for each product in the list, with `parent` set to that product. Resolvers are per object, not per query. This is exactly why list fields are where performance problems start.",
      },
      {
        prompt: "Why is the current user stored in a per-request **context** rather than a module-level global?",
        question: {
          type: "choice",
          options: [
            "Requests are handled one after another or at once; a global would leak one caller's identity into another's request",
            "Globals are not allowed in Python modules",
            "The context is faster to read",
            "GraphQL requires a context object to execute",
          ],
          answer: 0,
        },
        explanation:
          "State that belongs to one request must live and die with that request. A global is shared by everyone, so concurrent or sequential requests could see the wrong user. A context also makes tests easy: pass in a different one.",
      },
      {
        prompt: "A client sends an unknown token. What should `current_user` do?",
        question: {
          type: "choice",
          options: [
            "Treat the caller as anonymous (None); public fields still work and protected ones refuse later",
            "Raise an exception and fail the whole request",
            "Pick the first user in the table",
            "Return an admin so that nothing breaks",
          ],
          answer: 0,
        },
        explanation:
          "Authentication only establishes who you are. Many fields are public, so an unknown credential is just 'nobody'. Deciding what a caller may do is authorization, handled per field in lesson 11.",
      },
    ],
  },

  // ───────────────────────────────────────── 6. query plan / observability
  {
    id: "graphql-gateway-6-plan",
    title: "See the query plan: count resolvers and SQL",
    minutes: 35,
    xp: 170,
    concepts: ["middleware", "observability", "sqlite trace", "extensions", "N+1 symptom"],
    learn: `### You cannot fix what you cannot see

GraphQL hides a lot behind a tidy query. A client writes six lines; the server may run hundreds of resolvers and dozens of SQL statements. Before optimizing, measure. This lesson adds a **query plan** to every response: how many resolvers ran and exactly which SQL statements they sent.

### Two instruments

**1. Counting resolvers with middleware.** graphql-core accepts *middleware*: functions that wrap every resolver call.

~~~python
def count_resolvers(next_, root, info, **args):
    info.context.stats.resolvers += 1
    return next_(root, info, **args)      # run the real resolver
~~~

\`next_\` is the next layer (finally the resolver). Middleware can time fields, log, trace, enforce rules or catch errors, and it applies to *all* fields without editing them. Pass the list as \`middleware=...\` (our \`MIDDLEWARE\` plug-in already does).

**2. Counting SQL with sqlite's trace callback.** \`connection.set_trace_callback(fn)\` calls \`fn(statement)\` for every statement SQLite runs, with the values filled in. You count them by installing a callback that appends to a list:

~~~python
class Stats:
    def __init__(self):
        self.resolvers = 0
        self.queries = []
    def record_sql(self, statement):
        if statement.lstrip().upper().startswith(("SELECT", "INSERT", "UPDATE", "DELETE")):
            self.queries.append(statement)      # skip BEGIN, COMMIT, PRAGMA...
~~~

Real servers get the same data from SQLAlchemy events, Django's \`connection.queries\`, or OpenTelemetry.

### Putting it in the response: \`extensions\`

The GraphQL response has a third key, **extensions**, for non-standard extra data (tracing, cost, request ids). We add \`extensions.stats\` through a \`RESPONSE_HOOKS\` function (your lesson 3 plug-in):

~~~json
{ "data": { ... }, "extensions": { "stats": { "resolvers": 16, "sql": 6, "queries": ["SELECT ..."], "ms": 1.8 } } }
~~~

(Apollo Server and Strawberry have tracing extensions that do the same.) In production you would not expose raw SQL to every client; you would log it, or show it only when a debug flag is on. Here it powers the demo.

### The context builds the instruments

The stats object is per request, so it belongs in the context. Wrap your lesson 5 factory instead of rewriting it:

~~~python
def build_observed_context(request):
    context = make_context(request)       # the old factory
    context.stats = Stats()
    context.db.set_trace_callback(context.stats.record_sql)
    return context
~~~

Note the order: stats start counting *after* authentication, so they describe the work of the **query**, not of looking up the caller.

### What the numbers reveal

Run \`{ products(limit: 5) { name category { name } } }\`. The query reads like one lookup. The plan says **6 SQL statements**: one for the five products and five more, identical in shape, one per product for its category. Increase the limit and the count grows with it. That shape, **1 + N**, is the famous N+1 problem. You can now see it; lesson 7 removes it.

### Common mistakes

- Counting inside each resolver by hand. Middleware does it for every field automatically.
- Counting introspection (\`__schema\`, \`__typename\`) fields. They are not your resolvers.
- Forgetting that a trace callback stays installed on the connection. Install it per request and make it cheap.
- Leaking raw SQL to anonymous production clients.`,
    mission: `The mobile team says the home screen "feels slow" and nobody knows why. Give every response a **query plan**: resolver calls, SQL statements and time, measured by the gateway itself.

Run it and the **Plan** panel lights up in the scene. It groups repeated statements and flags suspicious repetition, so the next lesson's N+1 problem becomes visible on screen.`,
    tasks: [
      "class Stats with resolvers, queries, record_sql(statement) (only SELECT, INSERT, UPDATE and DELETE count) and summary() returning {resolvers, sql, queries, ms}",
      "Middleware count_resolvers that increments context.stats.resolvers for every field except introspection ones (field or parent type name starting with __), appended to MIDDLEWARE",
      "build_observed_context(request) wrapping make_context: attach a fresh Stats and install its record_sql as the connection's trace callback; make it the new build_context",
      "A RESPONSE_HOOKS function add_stats that stores context.stats.summary() under response['extensions']['stats']",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: a query plan on every response.
import time


class Stats:
    """What one request cost."""

    ...


def count_resolvers(next_, root, info, **args):
    """Middleware: count every real field resolution, then run the resolver."""
    ...


def build_observed_context(request):
    """The lesson 5 context plus a Stats object and a SQL trace callback."""
    ...


def add_stats(response, context):
    """Response hook: put the plan under response['extensions']['stats']."""
    ...


# plug everything in: MIDDLEWARE.append(...), build_context = ..., RESPONSE_HOOKS.append(...)
`,
    solutionAdd: py`import time


class Stats:
    """What one request cost."""

    def __init__(self):
        self.resolvers = 0
        self.queries = []
        self.started = time.perf_counter()

    def record_sql(self, statement):
        # BEGIN, COMMIT and PRAGMA are plumbing, not work done for the query
        if statement.lstrip().upper().startswith(("SELECT", "INSERT", "UPDATE", "DELETE")):
            self.queries.append(statement)

    def summary(self):
        return {
            "resolvers": self.resolvers,
            "sql": len(self.queries),
            "queries": list(self.queries),
            "ms": round((time.perf_counter() - self.started) * 1000, 2),
        }


def count_resolvers(next_, root, info, **args):
    """Middleware: count every real field resolution, then run the resolver."""
    if not info.field_name.startswith("__") and not info.parent_type.name.startswith("__"):
        info.context.stats.resolvers += 1  # introspection (__schema, __type, __Type.name...) is not your code
    return next_(root, info, **args)


def build_observed_context(request):
    """The lesson 5 context plus a Stats object and a SQL trace callback."""
    context = make_context(request)
    context.stats = Stats()
    context.db.set_trace_callback(context.stats.record_sql)
    return context


def add_stats(response, context):
    """Response hook: put the plan under response['extensions']['stats']."""
    stats = getattr(context, "stats", None)
    if stats is not None:
        response.setdefault("extensions", {})["stats"] = stats.summary()


MIDDLEWARE.append(count_resolvers)
build_context = build_observed_context
RESPONSE_HOOKS.append(add_stats)`,
    explanation:
      "Middleware wraps every resolver, so one small function counts all of them without touching any field. SQLite's trace callback reports every statement the connection runs, which gives an exact SQL count. Both write into a Stats object that lives on the per-request context and is returned under extensions, the standard place for non-data information. Wrapping make_context instead of editing it keeps each concern in its own function. The numbers now expose how a four-line query becomes six SQL statements.",
    hints: [
      { id: "h1", title: "Stats", content: "__init__ sets self.resolvers = 0, self.queries = [] and self.started = time.perf_counter(). record_sql appends only if statement.lstrip().upper().startswith((\"SELECT\", \"INSERT\", \"UPDATE\", \"DELETE\")). summary returns the four keys; sql is len(self.queries); ms is round((time.perf_counter() - self.started) * 1000, 2)." },
      { id: "h2", title: "Middleware", content: "Skip introspection: if not info.field_name.startswith(\"__\") and not info.parent_type.name.startswith(\"__\"): info.context.stats.resolvers += 1. Then return next_(root, info, **args). Register it with MIDDLEWARE.append(count_resolvers)." },
      { id: "h3", title: "The context", content: "context = make_context(request); context.stats = Stats(); context.db.set_trace_callback(context.stats.record_sql); return context. Then assign build_context = build_observed_context." },
      { id: "h4", title: "The hook", content: 'stats = getattr(context, "stats", None); if stats is not None: response.setdefault("extensions", {})["stats"] = stats.summary(). Add it with RESPONSE_HOOKS.append(add_stats).' },
    ],
    tests: [
      {
        id: "t1",
        description: "Responses carry extensions.stats with resolvers, sql, queries and ms",
        assertionCode: T(py`_fresh()
r = _gql("{ categories { name } }")
assert _data(r)["categories"][0] == {"name": "Audio"}, "The data must be unchanged"
s = (r.get("extensions") or {}).get("stats")
assert isinstance(s, dict), "The response needs extensions.stats, got extensions=" + repr(r.get("extensions"))
assert set(s) == {"resolvers", "sql", "queries", "ms"}, "stats keys should be resolvers, sql, queries and ms, got " + repr(sorted(s))
assert s["resolvers"] == 6, "categories (1) + five name fields = 6 resolver calls, got " + repr(s["resolvers"])
assert s["sql"] == 1 and len(s["queries"]) == 1, "One SELECT should have been counted, got " + repr(s["sql"])
assert s["queries"][0].lstrip().upper().startswith("SELECT"), "queries holds the SQL text"
assert isinstance(s["ms"], (int, float)) and s["ms"] >= 0, "ms is a number"`),
      },
      {
        id: "t2",
        description: "Each request starts from zero",
        assertionCode: T(py`_fresh()
a = _gql("{ product(id: 1) { name } }")["extensions"]["stats"]
b = _gql("{ product(id: 1) { name } }")["extensions"]["stats"]
assert a["sql"] == 1 and b["sql"] == 1, "One lookup each time (stats must not accumulate across requests), got " + repr((a["sql"], b["sql"]))
assert a["resolvers"] == 2 and b["resolvers"] == 2, "product + name = 2 resolvers each time, got " + repr((a["resolvers"], b["resolvers"]))
c = _gql("{ shopName }")["extensions"]["stats"]
assert c["sql"] == 0 and c["resolvers"] == 1, "A field that never touches the database costs 0 SQL, got " + repr(c)`),
      },
      {
        id: "t3",
        description: "The N+1 shape is visible: 5 products with categories cost 6 statements",
        assertionCode: T(py`_fresh()
r = _gql("{ products(limit: 5) { name category { name } } }")
assert len(_data(r)["products"]) == 5
s = r["extensions"]["stats"]
assert s["sql"] == 6, "1 query for the list + 1 per product for its category = 6 statements, got " + str(s["sql"]) + ". (This lesson expects the one-query-per-product Product.category resolver from lesson 5.)"
assert s["resolvers"] == 16, "products + 5 x (name, category, category.name) = 16 resolver calls, got " + str(s["resolvers"])
cat_queries = [q for q in s["queries"] if "categories" in q]
assert len(cat_queries) == 5, "Five of the statements should read the categories table, got " + str(len(cat_queries))`),
      },
      {
        id: "t4",
        description: "Introspection fields are not counted, and failed requests have no plan",
        assertionCode: T(py`_fresh()
r = _gql("{ __typename }")
assert r["extensions"]["stats"]["resolvers"] == 0, "__typename is meta, not one of your resolvers"
r = _gql("{ __schema { queryType { name } } }")
assert r["extensions"]["stats"]["resolvers"] == 0 and r["extensions"]["stats"]["sql"] == 0, "Introspection does no work of yours"
r = _gql("{ nothingHere }")
assert r.get("errors") and "extensions" not in r, "A request rejected by validation never executed, so it has no stats"`),
      },
      {
        id: "t5",
        description: "Only real work is counted as SQL",
        assertionCode: T(py`s = Stats()
for statement in ("BEGIN", "SELECT 1", "  insert into t values (1)", "COMMIT", "PRAGMA foreign_keys = ON", "UPDATE t SET a = 1", "delete from t"):
    s.record_sql(statement)
assert len(s.queries) == 4, "SELECT, INSERT, UPDATE and DELETE count (in any case, with leading spaces); BEGIN, COMMIT and PRAGMA do not. Got " + repr(s.queries)
summary = s.summary()
assert summary["sql"] == 4 and summary["queries"] == s.queries and summary["resolvers"] == 0, "summary() reports the counters, got " + repr(summary)
assert summary["queries"] is not s.queries, "summary() should hand out a copy of the list"`),
      },
      {
        id: "t6",
        description: "The caller's lookup is not part of the query's cost",
        assertionCode: T(py`_fresh()
anon = _gql("{ shopName }")["extensions"]["stats"]
authed = _gql("{ shopName }", token="sam-token")["extensions"]["stats"]
assert authed["sql"] == 0, "Looking up the user happens before stats start, so a field-free query is 0 SQL even when signed in, got " + str(authed["sql"])
assert authed["resolvers"] == anon["resolvers"] == 1`),
      },
    ],
    unlocks: ["gql-plan"],
    checks: [
      {
        prompt: "`{ products(limit: 20) { name category { name } } }` runs with a one-query-per-product `Product.category` resolver. How many SQL statements does the plan show?",
        question: { type: "number", answer: 21 },
        explanation:
          "One statement fetches the 20 products, then each of the 20 products triggers its own category lookup: 1 + 20 = 21. The cost grows with the page size, and nothing in the query text warns you. That is why a query plan is worth having.",
      },
      {
        prompt: "What does GraphQL middleware give you that editing each resolver does not?",
        question: {
          type: "choice",
          options: [
            "One place that sees every field, so timing, counting, logging and tracing don't touch field code",
            "Faster resolvers",
            "A way to avoid writing resolvers",
            "Automatic caching of results",
          ],
          answer: 0,
        },
        explanation:
          "Middleware is a cross-cutting hook around all resolvers. It can measure, trace or guard fields uniformly. It does not make anything faster by itself, but it tells you what is slow.",
      },
    ],
  },

  // ───────────────────────────────────────── 7. batching / dataloader
  {
    id: "graphql-gateway-7-batching",
    title: "Kill N+1 with a batch loader",
    minutes: 45,
    xp: 220,
    concepts: ["N+1", "DataLoader", "batching", "per-request cache", "priming", "IN (...) queries"],
    learn: `### The problem, in numbers

Lesson 6 showed it: a list of N products each asking for its category costs **1 + N** queries. Reviews with authors are worse: one query for the reviews of each product and one for the author of each review. For 16 products the home screen sends 17 statements where 2 would do. Latency adds up, the database sees pointless load, and the problem scales with the data, which is why it hides in development and appears in production.

### Why GraphQL makes it easy to cause

Each resolver is deliberately small and independent. \`Product.category\` knows nothing about its 15 siblings, so the only thing it can do is fetch *its own* category. The fix cannot live in one resolver. It needs something that sees **all the requests for the same kind of thing** and answers them together.

### The DataLoader pattern

A **loader** is a small object created for one request:

- You ask it for keys: \`loader.load(3)\`, \`loader.load(5)\`...
- It collects them, then calls a **batch function** once: \`batch([3, 5, 1])\` runs \`SELECT * FROM categories WHERE id IN (3, 5, 1)\` and returns the values **in the same order as the keys**.
- It **caches** each answer, so asking for key 3 again costs nothing.

The batch function has one contract: *one value per key, in key order* (use \`None\` when a key has no row). Loaders for one-to-many relations return a **list** for each key (an empty list if there are none).

### How Facebook's DataLoader batches, and how we do it

The original DataLoader (and Python's \`aiodataloader\`, used with Strawberry and async Ariadne) waits for **one tick of the event loop**: all \`load()\` calls made during that tick are batched. That relies on async execution. Our \`graphql_sync\` has no event loop, so a plain \`load()\` would fetch immediately and nothing would be batched.

The sync-friendly equivalent is **priming**. Whoever produces a *list of rows* already knows which keys their children will need. So when \`Query.products\` returns 16 products it tells the loaders: "category ids 1, 2, 3, 4, 5 are coming". The first \`load(2)\` then dispatches **one** batch for all primed keys, and every later \`load\` hits the cache.

~~~python
rows = fetch_all(...)
loader(context, "category").prime(row["category_id"] for row in rows)   # no query yet
...
loader(context, "category").load(product["category_id"])   # first call: ONE query for all primed keys
~~~

Nothing runs until the first \`load\`, so if the client never asks for \`category\` the batch never happens. Priming is lazy, like the real thing.

### Per request, never global

A loader's cache must live **only as long as one request**. A global loader would serve stale data forever, and worse, could show one user data that only another user is allowed to see. So loaders live on the context (the \`loaders\` dict from lesson 5) and are created on first use.

### Chaining batches

A batch can prime the next level. The reviews batch fetches many products' reviews in one statement; the **authors** of those reviews are then known, so it primes the author loader, and the first \`Review.author\` call fetches all authors at once. A three-level query costs three statements, no matter how many rows.

### Practical details

- **Keys must be hashable and consistent.** Use database integers (\`category_id\`), not the GraphQL \`ID\` string, on both sides.
- **\`IN (?, ?, ...)\` has a limit.** SQLite allows about 32,000 parameters, other databases fewer. Chunk huge key lists.
- **Order matters.** Build a dict from key to row, then return \`[found.get(k) for k in keys]\`. Never assume the SQL returned rows in key order.
- **Loaders are not an excuse to skip pagination.** Batching reduces round trips; it does not shrink an enormous result.
- Alternatives: eager loading with \`JOIN\` (look-ahead on \`info.field_nodes\`) works well in sync stacks too, at the price of coupling resolvers to the query shape.

### Common mistakes

- A module-level loader or cache shared between requests.
- A batch function that returns results in database order instead of key order.
- Passing different key types to \`prime\` and \`load\` (\`"3"\` versus \`3\`), so nothing ever matches.
- "Fixing" N+1 for one field and leaving the next (here: \`averageRating\`, which also looked up reviews per product).`,
    mission: `The home screen sends 17 SQL statements and the product list is the next to fall over. Build a **batch loader**, wire it into the context, and give the list resolvers the ability to *prime* it.

When you pass, the **N+1 lab** appears in the Plan panel. Run the catalogue query and watch the statement count fall from 17 to 2, then run reviews with authors (3 statements instead of dozens).`,
    tasks: [
      "class Loader(batch_fn) with prime(keys), load(key), load_many(keys), a per-instance cache and a batches counter; one batch_fn call serves every pending key, and a wrong-length result raises ValueError",
      "fetch_in(db, table, column, keys) (one IN query, ordered by id), loader(context, name), and batch functions: by_id(table) and grouped_by(table, column, after=None) registered in BATCH_FUNCTIONS for category, product, author, reviews, orders, items and category_products",
      "Redefine product_rows(info, ...) to read from info.context.db and prime the category and reviews loaders; the batches for reviews, orders and items prime the next level",
      "Re-register Query.categories (it primes category_products), Product.category, reviews and averageRating, Review.author and product, Category.products, Customer.orders, Order.items and totalCents and OrderItem.product so they use loaders; then rebuild the schema",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: batch loaders.


class Loader:
    """Collects keys, then answers all of them with ONE call to batch_fn(keys) -> values (same order)."""

    ...


def fetch_in(db, table, column, keys):
    """SELECT * FROM table WHERE column IN (?, ?, ...) ORDER BY id. table/column are constants from our code."""
    ...


def loader(context, name):
    """The request's loader called name, created on first use from BATCH_FUNCTIONS[name]."""
    ...


def by_id(table):
    """Batch function factory: key = a row id -> that row (or None)."""
    ...


def grouped_by(table, column, after=None):
    """Batch function factory: key = a parent id -> the LIST of rows that point at it ([] if none).
    after(context, rows), when given, runs on all fetched rows so it can prime the next level."""
    ...


BATCH_FUNCTIONS = {}  # name -> batch function(context, keys)


def prime_products(context, rows):
    """Tell the loaders which categories and reviews these product rows will need."""
    ...


def product_rows(info, tail="", params=()):
    """Replaces the lesson 2 version: reads from info.context.db and primes the loaders."""
    ...


# Re-register the relation resolvers so they call loader(info.context, name).load(key).

schema = make_schema()
`,
    solutionAdd: py`class Loader:
    """Collects keys, then answers all of them with ONE call to batch_fn(keys) -> values (same order)."""

    def __init__(self, batch_fn):
        self.batch_fn = batch_fn
        self.cache = {}  # key -> value (None is a legitimate value: "no such row")
        self.pending = {}  # keys primed or requested but not fetched yet (a dict keeps order, no duplicates)
        self.batches = 0  # how many times batch_fn ran

    def prime(self, keys):
        """Announce keys that will probably be loaded soon. Runs nothing."""
        for key in keys:
            if key not in self.cache:
                self.pending[key] = True

    def load(self, key):
        if key not in self.cache:
            self.pending[key] = True
            self.dispatch()
        return self.cache[key]

    def load_many(self, keys):
        keys = list(keys)
        self.prime(keys)
        if any(key not in self.cache for key in keys):
            self.dispatch()
        return [self.cache[key] for key in keys]

    def dispatch(self):
        keys = [key for key in self.pending if key not in self.cache]
        self.pending = {}
        if not keys:
            return
        values = self.batch_fn(keys)
        if len(values) != len(keys):
            raise ValueError("batch_fn must return exactly one value per key, in the same order as the keys")
        self.batches += 1
        self.cache.update(zip(keys, values))


def fetch_in(db, table, column, keys):
    """SELECT * FROM table WHERE column IN (?, ?, ...) ORDER BY id. table/column are constants from our code."""
    keys = list(keys)
    if not keys:
        return []
    marks = ", ".join("?" for _ in keys)
    return fetch_all(db, f"SELECT * FROM {table} WHERE {column} IN ({marks}) ORDER BY id", keys)


def loader(context, name):
    """The request's loader called name, created on first use from BATCH_FUNCTIONS[name]."""
    if name not in context.loaders:
        batch = BATCH_FUNCTIONS[name]
        context.loaders[name] = Loader(lambda keys: batch(context, keys))
    return context.loaders[name]


def by_id(table):
    """Batch function factory: key = a row id -> that row (or None)."""

    def batch(context, keys):
        found = {row["id"]: row for row in fetch_in(context.db, table, "id", keys)}
        return [found.get(key) for key in keys]

    return batch


def grouped_by(table, column, after=None):
    """Batch function factory: key = a parent id -> the LIST of rows that point at it ([] if none).
    after(context, rows), when given, runs on all fetched rows so it can prime the next level."""

    def batch(context, keys):
        groups = {key: [] for key in keys}
        rows = fetch_in(context.db, table, column, keys)
        for row in rows:
            groups[row[column]].append(row)
        if after:
            after(context, rows)
        return [groups[key] for key in keys]

    return batch


def prime_products(context, rows):
    """Tell the loaders which categories and reviews these product rows will need."""
    loader(context, "category").prime(row["category_id"] for row in rows)
    loader(context, "reviews").prime(row["id"] for row in rows)


BATCH_FUNCTIONS = {
    "category": by_id("categories"),
    "product": by_id("products"),
    "author": by_id("users"),
    "reviews": grouped_by("reviews", "product_id", after=lambda ctx, rows: loader(ctx, "author").prime(r["user_id"] for r in rows)),
    "category_products": grouped_by("products", "category_id", after=prime_products),
    "orders": grouped_by("orders", "user_id", after=lambda ctx, rows: loader(ctx, "items").prime(r["id"] for r in rows)),
    "items": grouped_by("order_items", "order_id", after=lambda ctx, rows: loader(ctx, "product").prime(r["product_id"] for r in rows)),
}


def product_rows(info, tail="", params=()):
    """Replaces the lesson 2 version: reads from info.context.db and primes the loaders."""
    context = info.context
    rows = fetch_all(context.db, "SELECT products.* FROM products " + tail, params)
    prime_products(context, rows)
    return rows


@resolver("Query", "categories")
def resolve_categories(root, info):
    rows = fetch_all(info.context.db, "SELECT * FROM categories ORDER BY id")
    loader(info.context, "category_products").prime(row["id"] for row in rows)
    return rows


@resolver("Product", "category")
def resolve_product_category(product, info):
    return loader(info.context, "category").load(product["category_id"])


@resolver("Product", "reviews")
def resolve_product_reviews(product, info):
    return loader(info.context, "reviews").load(product["id"])


@resolver("Product", "averageRating")
def resolve_average_rating(product, info):
    ratings = [review["rating"] for review in loader(info.context, "reviews").load(product["id"])]
    return round(sum(ratings) / len(ratings), 1) if ratings else None


@resolver("Review", "author")
def resolve_review_author(review, info):
    return tag_account(loader(info.context, "author").load(review["user_id"]))


@resolver("Review", "product")
def resolve_review_product(review, info):
    return loader(info.context, "product").load(review["product_id"])


@resolver("Category", "products")
def resolve_category_products(category, info):
    return loader(info.context, "category_products").load(category["id"])


@resolver("Customer", "orders")
def resolve_customer_orders(user, info):
    return loader(info.context, "orders").load(user["id"])


@resolver("Order", "items")
def resolve_order_items(order, info):
    return loader(info.context, "items").load(order["id"])


@resolver("Order", "totalCents")
def resolve_order_total(order, info):
    return sum(item["quantity"] * item["unit_price_cents"] for item in loader(info.context, "items").load(order["id"]))


@resolver("OrderItem", "product")
def resolve_item_product(item, info):
    return loader(info.context, "product").load(item["product_id"])


schema = make_schema()`,
    explanation:
      "The Loader turns many load(key) calls into one batch_fn(keys) call and remembers every answer, and because it lives on the per-request context it can never serve another request's data. In a sync executor nothing waits for an event-loop tick, so the code that produces a list primes the keys its children will ask for; the first load then fetches all of them at once. Batches prime the next level, so category, reviews and authors cost one statement per level instead of one per row. The fix is invisible in the schema and the query: the same queries return the same data with a fraction of the SQL.",
    hints: [
      { id: "h1", title: "Loader", content: "Keep self.cache = {}, self.pending = {} (a dict used as an ordered set) and self.batches = 0. prime(keys) adds keys that are not cached to pending. load(key): if not cached, add to pending and dispatch(); return self.cache[key]. dispatch(): keys = pending keys not in cache; clear pending; if none return; values = self.batch_fn(keys); check len(values) == len(keys) (ValueError otherwise); self.batches += 1; self.cache.update(zip(keys, values))." },
      { id: "h2", title: "Batch functions", content: 'fetch_in builds marks = ", ".join("?" for _ in keys) and runs f"SELECT * FROM {table} WHERE {column} IN ({marks}) ORDER BY id". by_id: found = {row["id"]: row for row in fetch_in(...)}; return [found.get(k) for k in keys]. grouped_by: groups = {k: [] for k in keys}; append each fetched row to groups[row[column]]; call after(context, rows) if given; return [groups[k] for k in keys]. loader(): create Loader(lambda keys: batch(context, keys)) the first time and store it in context.loaders[name].' },
      { id: "h3", title: "Priming and the registry", content: 'BATCH_FUNCTIONS maps "category" and "product" and "author" to by_id(...) for categories, products and users, and "reviews", "category_products", "orders", "items" to grouped_by(...). The "after" callbacks prime the next level: reviews -> author (r["user_id"]); orders -> items (r["id"]); items -> product (r["product_id"]); category_products -> prime_products. product_rows primes category and reviews for the rows it just fetched.' },
      { id: "h4", title: "Resolvers", content: 'Each relation resolver becomes one line, e.g. return loader(info.context, "category").load(product["category_id"]). Review.author must still return tag_account(...). averageRating and totalCents can reuse the already loaded reviews / items lists instead of running SQL.' },
    ],
    tests: [
      {
        id: "t1",
        description: "Loader batches pending keys into one call and caches answers",
        assertionCode: T(py`calls = []
def batch(keys):
    calls.append(list(keys))
    return [k * 10 for k in keys]
l = Loader(batch)
l.prime([1, 2, 3, 2])
assert calls == [], "prime() must not run the batch function"
assert l.load(2) == 20, "load(2) should return the batch value for key 2"
assert calls == [[1, 2, 3]], "The first load should dispatch every primed key once, in order, got " + repr(calls)
assert l.load(1) == 10 and l.load(3) == 30 and l.load(2) == 20, "Primed keys are now cached"
assert len(calls) == 1 and l.batches == 1, "Cached answers must not trigger new batches"
assert l.load(9) == 90 and calls[-1] == [9] and l.batches == 2, "An unprimed key triggers its own batch"
assert l.load_many([1, 9, 5]) == [10, 90, 50] and calls[-1] == [5], "load_many returns values in key order and fetches only the missing key"
l.prime([1, 2])
assert len(calls) == 3, "Priming keys that are already cached does nothing"`),
      },
      {
        id: "t2",
        description: "Missing keys are None; a batch function with the wrong length is a bug",
        assertionCode: T(py`l = Loader(lambda keys: [None for _ in keys])
assert l.load("x") is None and l.load("x") is None and l.batches == 1, "None is a cacheable answer (no row)"
bad = Loader(lambda keys: [1])
bad.prime([1, 2])
try:
    bad.load(1)
except ValueError:
    pass
else:
    assert False, "A batch function that returns the wrong number of values must raise ValueError"
c = Context(DB)
a = loader(c, "category")
assert loader(c, "category") is a and isinstance(a, Loader), "loader(context, name) creates a loader once per context"
assert loader(Context(DB), "category") is not a, "...and a different request gets its own loader"`),
      },
      {
        id: "t3",
        description: "Batch functions return values in key order, even with missing keys",
        assertionCode: T(py`_fresh()
c = Context(DB)
cats = loader(c, "category").load_many([3, 1, 99, 3])
assert [x and x["name"] for x in cats] == ["Lighting", "Audio", None, "Lighting"], "by_id should answer in key order with None for unknown ids, got " + repr(cats)
revs = loader(c, "reviews").load_many([1, 2, 5])
assert [len(x) for x in revs] == [3, 0, 3], "grouped_by returns a list per key ([] when none): expected [3, 0, 3], got " + repr([len(x) for x in revs])
assert [r["user_id"] for r in revs[0]] == [2, 3, 4], "Rows inside a group keep id order"`),
      },
      {
        id: "t4",
        description: "Products with categories: 17 statements become 2",
        assertionCode: T(py`_fresh()
r = _gql("{ products(limit: 16) { name category { name } } }")
d = _data(r)["products"]
assert len(d) == 16 and d[0] == {"name": "Tide Earbuds", "category": {"name": "Audio"}} and d[15]["category"]["name"] == "Kitchen", "The data must be the same as before, got " + repr(d[:2])
n = r["extensions"]["stats"]["sql"]
assert n == 2, "Expected 2 statements (one for the products, one batched categories query), got " + str(n) + ". Prime the category loader in product_rows and load through it in Product.category."`),
      },
      {
        id: "t5",
        description: "Reviews and their authors: three levels, three statements",
        assertionCode: T(py`_fresh()
r = _gql("{ products(limit: 16) { name reviews { rating author { name } } } }")
d = _data(r)["products"]
assert [x["author"]["name"] for x in d[0]["reviews"]] == ["Sam Carter", "Priya Nair", "Leo Park"], "Product 1's reviewers, got " + repr(d[0])
assert d[1]["reviews"] == [], "Products without reviews give []"
n = r["extensions"]["stats"]["sql"]
assert n == 3, "products + all reviews + all authors = 3 statements, got " + str(n) + ". The reviews batch should prime the author loader."`),
      },
      {
        id: "t6",
        description: "Priming is lazy: unused relations cost nothing",
        assertionCode: T(py`_fresh()
r = _gql("{ products(limit: 16) { name } }")
assert r["extensions"]["stats"]["sql"] == 1, "If the client never asks for category or reviews no batch should run, got " + str(r["extensions"]["stats"]["sql"])
r = _gql("{ products(limit: 16) { averageRating } }")
assert r["extensions"]["stats"]["sql"] == 2, "averageRating should reuse the batched reviews (2 statements), got " + str(r["extensions"]["stats"]["sql"])
assert _data(r)["products"][0]["averageRating"] == 4.3 and _data(r)["products"][1]["averageRating"] is None
r = _gql("{ categories { name products { name } } }")
assert r["extensions"]["stats"]["sql"] == 2, "categories + one batched products query = 2 statements, got " + str(r["extensions"]["stats"]["sql"])
assert [len(c["products"]) for c in _data(r)["categories"]] == [3, 4, 3, 3, 3]`),
      },
      {
        id: "t7",
        description: "Order history is batched too, and loaders never outlive a request",
        assertionCode: T(py`_fresh()
q = "{ me { ... on Customer { orders { id totalCents items { quantity product { name } } } } } }"
r = _gql(q, token="sam-token")
orders = _data(r)["me"]["orders"]
assert [o["id"] for o in orders] == ["1", "2", "6"] and orders[0]["totalCents"] == 8800, "Same data as before, got " + repr(orders[0])
assert [i["product"]["name"] for i in orders[2]["items"]] == ["Burr Grinder", "Ceramic Mug Set"]
assert r["extensions"]["stats"]["sql"] == 3, "orders + items + products = 3 statements, got " + str(r["extensions"]["stats"]["sql"])
q = "{ product(id: 1) { category { name } } }"
assert _data(_gql(q))["product"]["category"]["name"] == "Audio"
DB.execute("UPDATE categories SET name = 'Sound' WHERE id = 1")
DB.commit()
assert _data(_gql(q))["product"]["category"]["name"] == "Sound", "A loader's cache must be per request: the second request has to see the new name"`),
      },
    ],
    unlocks: ["gql-batching"],
    checks: [
      {
        prompt: "A batch function receives the keys `[7, 3, 5]` and the SQL returns the rows ordered `3, 5, 7`. What must the function return?",
        question: {
          type: "choice",
          options: [
            "The values for 7, 3, 5 in that order (rebuild the order from a dict)",
            "The values for 3, 5, 7 in the order the database gave them",
            "Only the values that were found, without placeholders",
            "A dict; the loader sorts it out",
          ],
          answer: 0,
        },
        explanation:
          "The loader hands the i-th result to the i-th key, so the result must line up with the keys. Databases promise no order for IN queries; build a dict from key to row and return `[found.get(k) for k in keys]`.",
      },
      {
        prompt: "Why must a loader be created **per request** rather than once for the whole process?",
        question: {
          type: "choice",
          options: [
            "Its cache would go stale, and could expose one user's data to another",
            "Loaders cannot be created more than once",
            "Per-request loaders use less memory than a global one",
            "GraphQL forbids module-level objects",
          ],
          answer: 0,
        },
        explanation:
          "A loader remembers every answer it has fetched. If it lived forever, edits would never show up and a row one user is allowed to see could be served to someone who is not. Scoping it to the request fixes both.",
      },
      {
        prompt: "Your sync executor has no event loop. Which technique gives the same batching benefit?",
        question: {
          type: "choice",
          options: [
            "Priming: the resolver that produces a list announces the keys its children will need",
            "Calling time.sleep(0) between resolvers",
            "Caching the whole response in a global dict",
            "Making every field nullable",
          ],
          answer: 0,
        },
        explanation:
          "An async DataLoader waits one tick to collect keys. Without an event loop, the parent that produced the rows already knows the keys, so it can register them with the loaders before any child asks.",
      },
    ],
  },
];
