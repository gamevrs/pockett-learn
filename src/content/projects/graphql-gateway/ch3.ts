import type { Lesson } from "@/engine/types";
import { py, T } from "./shared.ts";

/** Chapter 3: Writes, errors and lists. Mutations, errors you can design, and cursor pagination. */
export const chapter3: Lesson[] = [
  // ───────────────────────────────────────── 8. mutations
  {
    id: "graphql-gateway-8-mutations",
    title: "Mutations and input validation",
    minutes: 45,
    xp: 200,
    concepts: ["mutation", "input types", "payloads", "userErrors", "validation layers", "transactions"],
    learn: `### Reads and writes

Everything so far was a **query**: it reads. To change data GraphQL has a second root type, **Mutation**. Technically a mutation is a query that is *allowed* to have side effects, with one execution difference that matters: the top-level fields of a mutation run **one after another, in the order written**, while query fields may run in any order. So \`mutation { a b }\` finishes \`a\` before it starts \`b\`.

~~~graphql
type Mutation {
  createReview(input: ReviewInput!): ReviewPayload!
  placeOrder(input: PlaceOrderInput!): PlaceOrderPayload!
}
~~~

### Input types

Arguments get complicated quickly, so mutations take one argument, conventionally called \`input\`, whose type is an **input object**:

~~~graphql
input ReviewInput {
  productId: ID!
  rating: Int!
  body: String!
}

input PlaceOrderInput {
  lines: [OrderLineInput!]!
}
input OrderLineInput { productId: ID!  quantity: Int! }
~~~

Input types are a separate kind of type: they may contain scalars, enums, lists and other input types, but never object types, interfaces, unions or resolvers. Output types describe what the server can return; input types describe what the client can send. In your resolver the input arrives as a plain dict (\`input["rating"]\`). Because a client changes an input object by adding an optional field, evolving them is easy.

### Payloads, not bare objects

Return a **payload type** instead of the bare object. It leaves room for more than one thing to come back:

~~~graphql
type ReviewPayload {
  review: Review          # null when something was invalid
  userErrors: [UserError!]!
}
type UserError { field: String!  message: String! }
~~~

### Three layers of validation

1. **GraphQL's type system** rejects shape mistakes automatically: \`rating: "five"\` never reaches your code.
2. **Your business rules** run in the resolver: rating between 1 and 5, body not blank, product exists, one review per person per product, stock available.
3. **The database** is the last line of defence (\`CHECK\`, \`UNIQUE\`, foreign keys). If you reach it, treat it as a bug in layer 2.

### Two ways to report problems

- **Expected, user-fixable problems** (a blank field, not enough stock) go in the payload as **\`userErrors\`**, with the *field* that is wrong. The client shows them beside the form fields. Nothing is broken, so the response has no top-level errors.
- **Request-level problems** (you are not signed in, a bug) raise a \`GraphQLError\` and appear in the top-level \`errors\` list with a machine-readable \`extensions.code\`. Lesson 9 covers that in depth.

A common rule: if a well-behaved UI could have prevented it by validating the form, use \`userErrors\`; if the request should never have been sent, use an error.

### All or nothing

Placing an order changes several tables: a new order, its items, and the stock of every product. Either all of it happens or none. Use a transaction, \`with db:\` in sqlite3 (commit on success, **rollback on exception**), and make the stock update itself safe against races:

~~~python
UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?
~~~

If \`rowcount\` is 0, someone else bought the last unit between your check and your write: raise, and the whole transaction rolls back. A check followed by an unconditional write is the classic race condition.

Also store the **unit price on the order item** (a snapshot). Tomorrow's price change must not rewrite yesterday's receipts.

### Naming and idempotency

Name mutations \`verbNoun\` (\`createReview\`, \`placeOrder\`), not generic \`update\`. A mutation that can be retried safely (idempotent) saves you after dropped connections; \`placeOrder\` is not, so real shops add an idempotency key. The REST version of this problem was in the Pocket Store API project.

### Common mistakes

- Taking the user id as an argument. The caller is in the **context**; never trust the client to say who it is.
- Updating stock with "read, check, write" instead of a guarded UPDATE.
- Forgetting the transaction and leaving a half-created order after an error.
- Returning \`userErrors\` with no \`field\`, so the UI cannot attach the message to anything.`,
    mission: `The shop wants customers to write reviews and place orders from the app. That is the first time your gateway **changes** data, so it must be strict: validate every input, never trust the client about who it is, and make orders atomic.

When you pass, the client app gets a review form and a cart with **Place order**, plus a **Reset data** button that calls your \`reset_db()\`.`,
    tasks: [
      "SDL: input ReviewInput, OrderLineInput and PlaceOrderInput; types UserError, ReviewPayload and PlaceOrderPayload; type Mutation with createReview and placeOrder",
      "require_login(info): the caller from the context, or a GraphQLError with code UNAUTHENTICATED",
      "createReview: rating 1..5, body not blank (max 500 chars), product must exist, one review per user and product; invalid input returns userErrors with the field name, otherwise insert and return the review",
      "placeOrder: validate each line (product exists, quantity 1..10, enough stock, no duplicate products); then in ONE transaction insert the order and items (unit price snapshot) and decrement stock safely; rebuild the schema",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: mutations.
from datetime import datetime, timezone

# 1) The write side of the schema.
TYPE_DEFS += """
"""


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def require_login(info):
    """The signed-in user row, or raise GraphQLError('...', extensions={'code': 'UNAUTHENTICATED'})."""
    ...


def user_error(field, message):
    return {"field": field, "message": message}


class OutOfStock(Exception):
    """Raised inside the order transaction when a guarded stock update changed nothing."""


# 2) @resolver("Mutation", "createReview") ... @resolver("Mutation", "placeOrder") ...
# Mutation arguments arrive as keyword arguments: def f(root, info, input): ...


schema = make_schema()
`,
    solutionAdd: py`from datetime import datetime, timezone

TYPE_DEFS += """
input ReviewInput {
  productId: ID!
  rating: Int!
  body: String!
}

input OrderLineInput {
  productId: ID!
  quantity: Int!
}

input PlaceOrderInput {
  lines: [OrderLineInput!]!
}

type UserError {
  field: String!
  message: String!
}

type ReviewPayload {
  review: Review
  userErrors: [UserError!]!
}

type PlaceOrderPayload {
  order: Order
  userErrors: [UserError!]!
}

type Mutation {
  createReview(input: ReviewInput!): ReviewPayload!
  placeOrder(input: PlaceOrderInput!): PlaceOrderPayload!
}
"""


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def require_login(info):
    """The signed-in user row, or raise GraphQLError('...', extensions={'code': 'UNAUTHENTICATED'})."""
    user = info.context.user
    if user is None:
        raise GraphQLError("You must be signed in.", extensions={"code": "UNAUTHENTICATED"})
    return user


def user_error(field, message):
    return {"field": field, "message": message}


class OutOfStock(Exception):
    """Raised inside the order transaction when a guarded stock update changed nothing."""


@resolver("Mutation", "createReview")
def resolve_create_review(root, info, input):
    user = require_login(info)
    db = info.context.db
    errors = []
    rating = input["rating"]
    body = input["body"].strip()
    if not 1 <= rating <= 5:
        errors.append(user_error("rating", "Rating must be between 1 and 5."))
    if not body:
        errors.append(user_error("body", "Write at least a few words."))
    elif len(body) > 500:
        errors.append(user_error("body", "Keep it under 500 characters."))
    product = fetch_one(db, "SELECT id FROM products WHERE id = ?", (input["productId"],))
    if product is None:
        errors.append(user_error("productId", "No product with that id."))
    elif fetch_one(db, "SELECT 1 AS found FROM reviews WHERE product_id = ? AND user_id = ?", (product["id"], user["id"])):
        errors.append(user_error("productId", "You have already reviewed this product."))
    if errors:
        return {"review": None, "userErrors": errors}
    with db:
        cursor = db.execute(
            "INSERT INTO reviews (product_id, user_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)",
            (product["id"], user["id"], rating, body, now()),
        )
    return {"review": fetch_one(db, "SELECT * FROM reviews WHERE id = ?", (cursor.lastrowid,)), "userErrors": []}


@resolver("Mutation", "placeOrder")
def resolve_place_order(root, info, input):
    user = require_login(info)
    db = info.context.db
    lines = input["lines"]
    if not lines:
        return {"order": None, "userErrors": [user_error("lines", "An order needs at least one line.")]}
    if len(lines) > 20:
        return {"order": None, "userErrors": [user_error("lines", "An order can have at most 20 lines.")]}
    errors, plan, seen = [], [], set()
    for index, line in enumerate(lines):
        where = f"lines.{index}"
        product = fetch_one(db, "SELECT * FROM products WHERE id = ?", (line["productId"],))
        if product is None:
            errors.append(user_error(where + ".productId", "No product with that id."))
            continue
        if product["id"] in seen:
            errors.append(user_error(where + ".productId", "This product is already on another line."))
            continue
        seen.add(product["id"])
        quantity = line["quantity"]
        if not 1 <= quantity <= 10:
            errors.append(user_error(where + ".quantity", "Quantity must be between 1 and 10."))
        elif quantity > product["stock"]:
            errors.append(user_error(where + ".quantity", f"Only {product['stock']} of {product['name']} left in stock."))
        else:
            plan.append((product, quantity))
    if errors:
        return {"order": None, "userErrors": errors}
    try:
        with db:  # one transaction: commit if the block finishes, roll back if it raises
            order_id = db.execute(
                "INSERT INTO orders (user_id, status, created_at) VALUES (?, 'PENDING', ?)", (user["id"], now())
            ).lastrowid
            for product, quantity in plan:
                updated = db.execute(
                    "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", (quantity, product["id"], quantity)
                )
                if updated.rowcount == 0:  # somebody bought it between our check and our write
                    raise OutOfStock(product["name"])
                db.execute(
                    "INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
                    (order_id, product["id"], quantity, product["price_cents"]),
                )
    except OutOfStock as sold_out:
        return {"order": None, "userErrors": [user_error("lines", f"{sold_out} just sold out.")]}
    return {"order": fetch_one(db, "SELECT * FROM orders WHERE id = ?", (order_id,)), "userErrors": []}


schema = make_schema()`,
    explanation:
      "A mutation is a write-capable root field whose top-level fields run in order. Input types keep arguments tidy, and a payload type leaves room for userErrors next to the result. The resolver validates in layers: GraphQL's types first, then your business rules (collected so the user sees all problems at once), with the database constraints as the last line of defence. The caller comes from the context, never from an argument. Placing an order is one transaction with a guarded stock update, so a lost race rolls everything back, and the unit price is copied onto each item so later price changes cannot rewrite history.",
    hints: [
      { id: "h1", title: "SDL", content: "Three input types (ReviewInput: productId: ID!, rating: Int!, body: String!; OrderLineInput: productId: ID!, quantity: Int!; PlaceOrderInput: lines: [OrderLineInput!]!), UserError { field: String! message: String! }, ReviewPayload { review: Review userErrors: [UserError!]! }, PlaceOrderPayload { order: Order userErrors: [UserError!]! } and type Mutation { createReview(input: ReviewInput!): ReviewPayload! placeOrder(input: PlaceOrderInput!): PlaceOrderPayload! }." },
      { id: "h2", title: "Collect errors", content: "Build errors = [] and append user_error(field, message) for every broken rule instead of returning at the first one. If errors is not empty return {\"review\": None, \"userErrors\": errors}. Fields: rating, body, productId. Duplicate check: SELECT 1 FROM reviews WHERE product_id = ? AND user_id = ? using user[\"id\"] from the context." },
      { id: "h3", title: "Inserting", content: 'with db: cursor = db.execute("INSERT INTO reviews (product_id, user_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)", (...)) then fetch_one(db, "SELECT * FROM reviews WHERE id = ?", (cursor.lastrowid,)). now() is provided for created_at.' },
      { id: "h4", title: "The order transaction", content: 'First validate every line (field names like "lines.0.quantity") without writing anything. Then with db: insert the order (status PENDING), and for each (product, quantity): UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?; if updated.rowcount == 0 raise OutOfStock(product["name"]); INSERT the order_items row with unit_price_cents = product["price_cents"]. Catch OutOfStock outside the with block so the rollback has happened.' },
    ],
    tests: [
      {
        id: "t1",
        description: "The Mutation type, inputs and payloads exist",
        assertionCode: T(py`from graphql import GraphQLInputObjectType
assert schema.mutation_type is not None and schema.mutation_type.name == "Mutation", "Add type Mutation (graphql-core finds it by name)"
m = schema.mutation_type.fields
assert str(m["createReview"].type) == "ReviewPayload!" and str(m["createReview"].args["input"].type) == "ReviewInput!", "createReview(input: ReviewInput!): ReviewPayload!"
assert str(m["placeOrder"].type) == "PlaceOrderPayload!" and str(m["placeOrder"].args["input"].type) == "PlaceOrderInput!", "placeOrder(input: PlaceOrderInput!): PlaceOrderPayload!"
ri = schema.type_map["ReviewInput"]
assert isinstance(ri, GraphQLInputObjectType) and str(ri.fields["rating"].type) == "Int!" and str(ri.fields["productId"].type) == "ID!", "ReviewInput is an input type with productId: ID! and rating: Int!"
assert str(schema.type_map["ReviewPayload"].fields["review"].type) == "Review", "review is nullable: it is null when the input is invalid"
assert str(schema.type_map["ReviewPayload"].fields["userErrors"].type) == "[UserError!]!", "userErrors: [UserError!]!"
assert str(schema.type_map["PlaceOrderInput"].fields["lines"].type) == "[OrderLineInput!]!"`),
      },
      {
        id: "t2",
        description: "createReview inserts a review for the signed-in user",
        assertionCode: T(py`_fresh()
q = "mutation Add($input: ReviewInput!) { createReview(input: $input) { review { id rating body author { name } product { name } } userErrors { field message } } }"
d = _data(_gql(q, {"input": {"productId": "2", "rating": 5, "body": "  Loud for its size.  "}}, token="sam-token"))["createReview"]
assert d["userErrors"] == [], "A valid review has no userErrors, got " + repr(d["userErrors"])
assert d["review"]["rating"] == 5 and d["review"]["body"] == "Loud for its size.", "The body should be trimmed, got " + repr(d["review"])
assert d["review"]["author"]["name"] == "Sam Carter" and d["review"]["product"]["name"] == "Pocket Speaker", "The author is the caller from the context"
rows = _data(_gql("{ product(id: 2) { reviews { body } averageRating } }"))["product"]
assert rows == {"reviews": [{"body": "Loud for its size."}], "averageRating": 5.0}, "The review must be stored, got " + repr(rows)`),
      },
      {
        id: "t3",
        description: "Invalid input comes back as userErrors with field names, and nothing is written",
        assertionCode: T(py`_fresh()
q = "mutation Add($input: ReviewInput!) { createReview(input: $input) { review { id } userErrors { field message } } }"
r = _gql(q, {"input": {"productId": "2", "rating": 6, "body": "   "}}, token="sam-token")
assert not r.get("errors"), "Bad form input is not a request error, got " + repr(r.get("errors"))
d = r["data"]["createReview"]
assert d["review"] is None, "review should be null when input is invalid"
assert sorted(e["field"] for e in d["userErrors"]) == ["body", "rating"], "Report ALL problems at once, with their field names, got " + repr(d["userErrors"])
assert all(isinstance(e["message"], str) and e["message"] for e in d["userErrors"]), "Each error needs a readable message"
d = _data(_gql(q, {"input": {"productId": "2", "rating": 0, "body": "x" * 501}}, token="sam-token"))["createReview"]
assert sorted(e["field"] for e in d["userErrors"]) == ["body", "rating"], "A 501 character body and rating 0 are both invalid"
assert fetch_one(DB, "SELECT COUNT(*) AS n FROM reviews")["n"] == 14, "Nothing may be inserted when validation fails"`),
      },
      {
        id: "t4",
        description: "Unknown products and duplicate reviews are userErrors on productId",
        assertionCode: T(py`_fresh()
q = "mutation Add($input: ReviewInput!) { createReview(input: $input) { review { id } userErrors { field } } }"
d = _data(_gql(q, {"input": {"productId": "999", "rating": 4, "body": "ok"}}, token="sam-token"))["createReview"]
assert d["userErrors"] == [{"field": "productId"}] and d["review"] is None, "An unknown product is a productId error, got " + repr(d)
d = _data(_gql(q, {"input": {"productId": "1", "rating": 4, "body": "again"}}, token="sam-token"))["createReview"]
assert d["userErrors"] == [{"field": "productId"}], "Sam already reviewed product 1: one review per person per product, got " + repr(d)
d = _data(_gql(q, {"input": {"productId": "1", "rating": 4, "body": "mine"}}, token="admin-token"))["createReview"]
assert d["userErrors"] == [] and d["review"]["id"], "Another user may still review product 1"`),
      },
      {
        id: "t5",
        description: "Anonymous callers get an UNAUTHENTICATED error",
        assertionCode: T(py`_fresh()
for q in ('mutation { createReview(input: {productId: 2, rating: 5, body: "hi"}) { review { id } } }',
          "mutation { placeOrder(input: {lines: [{productId: 2, quantity: 1}]}) { order { id } } }"):
    r = _gql(q)
    assert r.get("errors"), "A signed-out caller must not write: " + q
    assert _codes(r) == ["UNAUTHENTICATED"], "The error needs extensions.code UNAUTHENTICATED, got " + repr(_codes(r))
    assert r["data"] is None, "The payload field is non-null, so data becomes null, got " + repr(r["data"])
assert fetch_one(DB, "SELECT COUNT(*) AS n FROM reviews")["n"] == 14 and fetch_one(DB, "SELECT COUNT(*) AS n FROM orders")["n"] == 6, "Nothing was written"`),
      },
      {
        id: "t6",
        description: "placeOrder creates the order, snapshots prices and reduces stock",
        assertionCode: T(py`_fresh()
q = "mutation Buy($input: PlaceOrderInput!) { placeOrder(input: $input) { order { id status totalCents items { quantity unitPriceCents product { name } } } userErrors { field message } } }"
v = {"input": {"lines": [{"productId": "3", "quantity": 2}, {"productId": "2", "quantity": 1}]}}
d = _data(_gql(q, v, token="sam-token"))["placeOrder"]
assert d["userErrors"] == [], "A valid order has no userErrors, got " + repr(d["userErrors"])
o = d["order"]
assert o["id"] == "7" and o["status"] == "PENDING", "The new order is #7 and starts PENDING, got " + repr(o)
assert o["totalCents"] == 2 * 12900 + 3900, "Total should be 2 x 12900 + 3900 = 29700, got " + repr(o["totalCents"])
assert [(i["product"]["name"], i["quantity"], i["unitPriceCents"]) for i in o["items"]] == [("Studio Headphones", 2, 12900), ("Pocket Speaker", 1, 3900)], "Items keep the unit price at purchase time, got " + repr(o["items"])
stock = {p["id"]: p["stock"] for p in _data(_gql("{ products(limit: 3) { id stock } }"))["products"]}
assert stock == {"1": 40, "2": 24, "3": 6}, "Stock must go down by the ordered quantity (3: 8 -> 6, 2: 25 -> 24), got " + repr(stock)
mine = _data(_gql("{ me { ... on Customer { orderCount } } }", token="sam-token"))["me"]
assert mine == {"orderCount": 4}, "The order belongs to the caller from the context"`),
      },
      {
        id: "t7",
        description: "An order is all or nothing",
        assertionCode: T(py`_fresh()
q = "mutation Buy($input: PlaceOrderInput!) { placeOrder(input: $input) { order { id } userErrors { field message } } }"
v = {"input": {"lines": [{"productId": "2", "quantity": 1}, {"productId": "9", "quantity": 1}]}}
d = _data(_gql(q, v, token="sam-token"))["placeOrder"]
assert d["order"] is None, "Glow Cube has no stock, so the whole order fails"
assert [e["field"] for e in d["userErrors"]] == ["lines.1.quantity"], "The error should point at the line: lines.1.quantity, got " + repr(d["userErrors"])
assert "stock" in d["userErrors"][0]["message"].lower(), "Say it is a stock problem"
assert fetch_one(DB, "SELECT stock FROM products WHERE id = 2")["stock"] == 25, "The first line's stock must be untouched"
assert fetch_one(DB, "SELECT COUNT(*) AS n FROM orders")["n"] == 6, "No order row may be left behind"
# the guarded UPDATE: a raised OutOfStock inside the transaction rolls everything back
DB.execute("CREATE TRIGGER zz_block BEFORE UPDATE ON products WHEN NEW.id = 2 BEGIN SELECT RAISE(IGNORE); END")
d = _data(_gql(q, {"input": {"lines": [{"productId": "3", "quantity": 1}, {"productId": "2", "quantity": 1}]}}, token="sam-token"))["placeOrder"]
assert d["order"] is None and d["userErrors"], "If the guarded UPDATE changes no row the order must fail, got " + repr(d)
assert fetch_one(DB, "SELECT COUNT(*) AS n FROM orders")["n"] == 6 and fetch_one(DB, "SELECT stock FROM products WHERE id = 3")["stock"] == 8, "...and roll back everything it already did"
DB.execute("DROP TRIGGER zz_block")`),
      },
      {
        id: "t8",
        description: "Line rules: quantity, duplicates, unknown products, empty orders",
        assertionCode: T(py`_fresh()
q = "mutation Buy($input: PlaceOrderInput!) { placeOrder(input: $input) { order { id } userErrors { field } } }"
def fields(lines):
    return [e["field"] for e in _data(_gql(q, {"input": {"lines": lines}}, token="sam-token"))["placeOrder"]["userErrors"]]
assert fields([]) == ["lines"], "An order with no lines is an error on 'lines'"
assert fields([{"productId": "2", "quantity": 0}]) == ["lines.0.quantity"], "Quantity 0"
assert fields([{"productId": "2", "quantity": 11}]) == ["lines.0.quantity"], "Quantity above 10"
assert fields([{"productId": "999", "quantity": 1}]) == ["lines.0.productId"], "Unknown product"
assert fields([{"productId": "2", "quantity": 1}, {"productId": "2", "quantity": 1}]) == ["lines.1.productId"], "The same product twice"
assert fields([{"productId": "999", "quantity": 1}, {"productId": "2", "quantity": 0}]) == ["lines.0.productId", "lines.1.quantity"], "All line errors are reported together"
assert fetch_one(DB, "SELECT COUNT(*) AS n FROM orders")["n"] == 6, "No invalid order is stored"`),
      },
      {
        id: "t9",
        description: "Mutation fields run in order",
        assertionCode: T(py`_fresh()
q = """mutation Race {
  first: placeOrder(input: {lines: [{productId: 4, quantity: 3}]}) { order { id } userErrors { field } }
  second: placeOrder(input: {lines: [{productId: 4, quantity: 1}]}) { order { id } userErrors { field } }
}"""
d = _data(_gql(q, token="sam-token"))
assert d["first"]["order"] and d["first"]["order"]["id"] == "7", "The first alias runs first and takes the last 3 stands, got " + repr(d["first"])
assert d["second"]["order"] is None and d["second"]["userErrors"] == [{"field": "lines.0.quantity"}], "The second sees stock 0, so it must fail, got " + repr(d["second"])`),
      },
    ],
    unlocks: ["gql-mutations"],
    checks: [
      {
        prompt: "Two mutation fields appear in one request: `mutation { a: placeOrder(...) { ... } b: placeOrder(...) { ... } }`. In what order do they run?",
        question: {
          type: "choice",
          options: [
            "a completes before b starts, in the order written",
            "Both start at once; the faster one finishes first",
            "In alphabetical order",
            "Only the last one runs",
          ],
          answer: 0,
        },
        explanation:
          "The spec runs top-level mutation fields serially, so a client can rely on order (create an account, then log in). Query fields have no such guarantee because they have no side effects.",
      },
      {
        prompt: "A customer submits a review with rating 9. Where should that problem appear?",
        question: {
          type: "choice",
          options: [
            "In the payload's userErrors with field `rating`, so the form can show it next to the input",
            "As a 500 Internal Server Error",
            "Nowhere: the database CHECK constraint will reject it silently",
            "As a syntax error from the parser",
          ],
          answer: 0,
        },
        explanation:
          "This is an expected, user-fixable mistake: report it as data, tied to a field. The database constraint is a safety net you should never rely on for user feedback, and the type system cannot know the allowed range.",
      },
      {
        prompt: "Why does `placeOrder` copy `unit_price_cents` onto each order item instead of reading the product's price later?",
        question: {
          type: "choice",
          options: [
            "Prices change; an order must keep the price the customer actually agreed to",
            "It makes the query faster",
            "GraphQL cannot join two tables",
            "To avoid needing a products table",
          ],
          answer: 0,
        },
        explanation:
          "An order is a historical record. If it referenced the live product price, a sale next month would silently change last month's receipts. Snapshotting the price at purchase time keeps history stable.",
      },
    ],
  },

  // ───────────────────────────────────────── 9. errors
  {
    id: "graphql-gateway-9-errors",
    title: "Errors you can design",
    minutes: 40,
    xp: 190,
    concepts: ["errors array", "extensions.code", "partial results", "null propagation", "masking", "server log"],
    learn: `### Three kinds of failure

A GraphQL request can fail in three different places, and the response looks different for each:

1. **Before execution**: a syntax error or a failed validation. There is **no data** at all, just \`errors\`.
2. **During execution, in one field**: a resolver raises. That field becomes \`null\`, an entry is added to \`errors\`, and **everything else still comes back**. This is a *partial result*.
3. **A promise broken**: a non-null field ends up null, which the schema said could never happen. That causes null propagation (below).

### The shape of an error

~~~json
{
  "data": { "product": { "name": "Mechanical Keyboard", "shippingEstimate": null } },
  "errors": [
    {
      "message": "Internal server error",
      "locations": [{ "line": 1, "column": 35 }],
      "path": ["product", "shippingEstimate"],
      "extensions": { "code": "INTERNAL_SERVER_ERROR" }
    }
  ]
}
~~~

- \`message\`: human-readable.
- \`path\`: which **response field** failed (list indexes included: \`["products", 4, "shippingEstimate"]\`).
- \`locations\`: where in the query text.
- \`extensions\`: your own machine-readable details. The convention is a stable \`code\` (\`UNAUTHENTICATED\`, \`FORBIDDEN\`, \`BAD_USER_INPUT\`, \`NOT_FOUND\`, \`INTERNAL_SERVER_ERROR\`). **Clients branch on the code, never on the message text**, which you are free to reword or translate.

Raise an error with a code by subclassing:

~~~python
class ApiError(GraphQLError):
    def __init__(self, message, code, **details):
        super().__init__(message, extensions={"code": code, **details})
~~~

### Null propagation: why \`!\` has teeth

Say a resolver for a \`String!\` field raises. The field cannot be null, so GraphQL nulls the **parent object**. If the parent is also non-null (an item in a \`[Product!]!\`), *its* parent becomes null, and so on, up to the nearest nullable ancestor, or all the way to \`data: null\`.

- \`shippingEstimate: String\` fails: only that field is null. The product still renders. **Partial success.**
- \`warehouse: String!\` fails: \`product\` (nullable) becomes null. The whole product disappears.
- Same field, but fetched through \`products: [Product!]!\`: one broken product nulls the **entire list**, and \`data\` becomes \`null\`.

This is the practical rule behind "nullable by default": make a field non-null only when its failure would make the parent meaningless anyway. Flaky or remote-backed fields should be nullable so one slow service does not blank the screen.

### Never leak internals

An unexpected exception (a bug, a crashed dependency) carries text like \`no such table: warehouse_map\` or a host name. Showing it to clients helps attackers and confuses users. The professional pattern:

- **Expected** errors (your \`ApiError\`s and GraphQL's own validation errors) go out as written.
- **Unexpected** exceptions are replaced with \`"Internal server error"\` and code \`INTERNAL_SERVER_ERROR\`, while the real exception goes to a **server log** you can read.

Telling them apart is easy: each \`GraphQLError\` keeps the exception that caused it as \`error.original_error\`. If that is a plain Python exception (not a \`GraphQLError\`), it is a bug. graphql-core calls your \`format_error\` plug-in (lesson 3) to turn each error into JSON, which makes it the right place to mask.

### Errors versus userErrors

Lesson 8 used \`userErrors\` for form-level mistakes. Use real GraphQL errors for conditions the *request itself* should not have caused: not signed in, not allowed, not found where it must exist, bad arguments, and bugs. Clients then treat \`errors\` as "something is wrong" and \`userErrors\` as "show these under the fields".

### HTTP status

Most GraphQL servers answer **200** whenever they could produce a response, even a partial one with \`errors\`. Some return 400 for requests that never executed (syntax or validation failures) and 401/403 for authentication problems at the transport level. Whatever you choose, clients must read the body.

### Common mistakes

- Making everything \`!\` and then losing whole screens to one failing field.
- Matching on error *messages* in client code.
- Returning \`str(exception)\` to the client.
- Catching exceptions inside resolvers and returning \`None\` silently, so nobody notices the bug. Let it raise and let \`format_error\` mask and log it.`,
    mission: `The shipping and warehouse services are flaky, and today an error from them shows the customer a stack of internal details (even a SQL statement). Time to design the failure path: **machine-readable error codes**, **masked internals** and a **server log** the team can read.

Pass this lesson and the Explorer's error cards get codes and masked-error badges, a banner tells you when the data is only partial, and a **Server log** panel shows what really happened.`,
    tasks: [
      "class ApiError(GraphQLError) taking (message, code, **details) and putting them in extensions",
      "SERVER_LOG (a list kept to the latest 50 entries) and recent_errors() returning a copy; entries look like {type, message, path}",
      "public_error(error): our own ApiError and GraphQL's validation/coercion errors pass through untouched (error.formatted); any other exception is logged and replaced with 'Internal server error', code INTERNAL_SERVER_ERROR, keeping locations and path",
      "Install it with format_error = public_error and rebuild the schema (the flaky shippingEstimate and warehouse fields are provided)",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: errors you can design.
#
# PROVIDED: two fields backed by flaky "services". They fail for products 5, 10 and 15, with the kind of
# message you would never want a customer to see.
TYPE_DEFS += """
extend type Product {
  shippingEstimate: String
  warehouse: String!
}
"""


@resolver("Product", "shippingEstimate")
def resolve_shipping_estimate(product, info):
    if product["id"] % 5 == 0:
        raise RuntimeError("shipping-service timed out after 3000 ms (host=ship.internal:8443)")
    return "Ships in 2 days" if product["stock"] > 0 else "Back in stock soon"


@resolver("Product", "warehouse")
def resolve_warehouse(product, info):
    if product["id"] % 5 == 0:
        raise RuntimeError("warehouse lookup failed: SELECT location FROM warehouse_map WHERE sku = 'x' -> no such table: warehouse_map")
    return "WH-" + product["sku"][:3]


# ── your code starts here ──
class ApiError(GraphQLError):
    """An error the client may see: a message plus a stable machine-readable code."""

    ...


SERVER_LOG = []  # what really went wrong (for us, never for clients)


def recent_errors():
    """The hook behind the demo's Server log: a copy of SERVER_LOG."""
    ...


def public_error(error):
    """Format one GraphQLError for the client. Mask bugs, log them, keep our own errors."""
    ...


# format_error = public_error

schema = make_schema()
`,
    solutionAdd: py`TYPE_DEFS += """
extend type Product {
  shippingEstimate: String
  warehouse: String!
}
"""


@resolver("Product", "shippingEstimate")
def resolve_shipping_estimate(product, info):
    if product["id"] % 5 == 0:
        raise RuntimeError("shipping-service timed out after 3000 ms (host=ship.internal:8443)")
    return "Ships in 2 days" if product["stock"] > 0 else "Back in stock soon"


@resolver("Product", "warehouse")
def resolve_warehouse(product, info):
    if product["id"] % 5 == 0:
        raise RuntimeError("warehouse lookup failed: SELECT location FROM warehouse_map WHERE sku = 'x' -> no such table: warehouse_map")
    return "WH-" + product["sku"][:3]


class ApiError(GraphQLError):
    """An error the client may see: a message plus a stable machine-readable code."""

    def __init__(self, message, code, **details):
        super().__init__(message, extensions={"code": code, **details})


SERVER_LOG = []  # what really went wrong (for us, never for clients)


def recent_errors():
    """The hook behind the demo's Server log: a copy of SERVER_LOG."""
    return list(SERVER_LOG)


def public_error(error):
    """Format one GraphQLError for the client. Mask bugs, log them, keep our own errors."""
    original = error.original_error
    if original is None or isinstance(original, GraphQLError):
        return error.formatted  # validation errors, ApiError, non-null violations: safe and useful
    SERVER_LOG.append({"type": type(original).__name__, "message": str(original), "path": list(error.path or [])})
    del SERVER_LOG[:-50]  # keep the latest 50
    shown = {"message": "Internal server error", "extensions": {"code": "INTERNAL_SERVER_ERROR"}}
    if error.locations:
        shown["locations"] = [{"line": loc.line, "column": loc.column} for loc in error.locations]
    if error.path:
        shown["path"] = list(error.path)
    return shown


format_error = public_error

schema = make_schema()`,
    explanation:
      "GraphQL separates 'nothing ran' errors from field errors, and a failed nullable field only blanks itself, which is why flaky data belongs in nullable fields. Every error can carry a stable code in extensions for clients to branch on. A bug is recognisable because its original_error is a plain Python exception rather than a GraphQLError; format_error is the single choke point where we log the truth for ourselves and show the client a harmless, uniform message. The same function keeps path and locations so the client still knows which field failed.",
    hints: [
      { id: "h1", title: "ApiError", content: 'super().__init__(message, extensions={"code": code, **details}). It is a GraphQLError subclass, so graphql-core treats it as an intentional error.' },
      { id: "h2", title: "Telling bugs from intent", content: "error.original_error is the exception raised in the resolver (None for errors GraphQL itself found). If it is None or isinstance(original, GraphQLError) return error.formatted unchanged." },
      { id: "h3", title: "Masking", content: 'Otherwise append {"type": type(original).__name__, "message": str(original), "path": list(error.path or [])} to SERVER_LOG and trim with del SERVER_LOG[:-50]. Build the client error {"message": "Internal server error", "extensions": {"code": "INTERNAL_SERVER_ERROR"}} and copy locations as [{"line": l.line, "column": l.column} for l in error.locations] and path as list(error.path).' },
      { id: "h4", title: "Installing", content: "Our execute() calls format_error(error) for every error, so assign format_error = public_error." },
    ],
    tests: [
      {
        id: "t1",
        description: "ApiError is a GraphQLError with a code in extensions",
        assertionCode: T(py`e = ApiError("Nope", "NOT_FOUND", resource="order", id=7)
assert isinstance(e, GraphQLError), "ApiError must subclass GraphQLError"
assert e.message == "Nope", "message should be kept"
assert e.extensions == {"code": "NOT_FOUND", "resource": "order", "id": 7}, "extensions should hold code plus the extra details, got " + repr(e.extensions)`),
      },
      {
        id: "t2",
        description: "A failing nullable field gives a partial result with a masked error",
        assertionCode: T(py`_fresh()
SERVER_LOG.clear()
r = _gql("{ product(id: 5) { name shippingEstimate } }")
assert r["data"] == {"product": {"name": "Mechanical Keyboard", "shippingEstimate": None}}, "Only the failing field should be null; the rest still arrives, got " + repr(r["data"])
assert len(r["errors"]) == 1, "Exactly one error expected, got " + repr(r["errors"])
e = r["errors"][0]
assert e["message"] == "Internal server error", "The client must see a generic message, got " + repr(e["message"])
assert e["extensions"]["code"] == "INTERNAL_SERVER_ERROR", "...with code INTERNAL_SERVER_ERROR"
assert e["path"] == ["product", "shippingEstimate"], "The path says which field failed, got " + repr(e.get("path"))
assert e["locations"] and e["locations"][0]["line"] == 1, "Keep the locations"
text = _json.dumps(r)
for secret in ("timed out", "3000", "ship.internal"):
    assert secret not in text, "Internal detail leaked to the client: " + secret`),
      },
      {
        id: "t3",
        description: "The truth goes to the server log",
        assertionCode: T(py`_fresh()
SERVER_LOG.clear()
_gql("{ product(id: 10) { shippingEstimate } }")
log = recent_errors()
assert len(log) == 1, "One failure should be logged once, got " + repr(log)
assert log[0]["type"] == "RuntimeError" and "timed out" in log[0]["message"], "The log keeps the real exception type and message, got " + repr(log[0])
assert log[0]["path"] == ["product", "shippingEstimate"], "...and where it happened, got " + repr(log[0].get("path"))
log.append("x")
assert len(recent_errors()) == 1, "recent_errors() must return a copy"
for i in range(80):
    SERVER_LOG.append({"type": "X", "message": str(i), "path": []})
    del SERVER_LOG[:-50]
_gql("{ product(id: 5) { shippingEstimate } }")
assert len(SERVER_LOG) == 50, "The log is capped at 50 entries (keep the newest), got " + str(len(SERVER_LOG))
assert SERVER_LOG[-1]["message"].startswith("shipping-service"), "The newest entry is last"`),
      },
      {
        id: "t4",
        description: "Non-null propagation: a broken String! nulls the parent",
        assertionCode: T(py`_fresh()
SERVER_LOG.clear()
r = _gql("{ product(id: 5) { name warehouse } }")
assert r["data"] == {"product": None}, "warehouse is String!, so product (nullable) becomes null, got " + repr(r["data"])
assert r["errors"][0]["path"] == ["product", "warehouse"] and r["errors"][0]["message"] == "Internal server error", "Masked, with a path, got " + repr(r["errors"])
assert "warehouse_map" not in _json.dumps(r["errors"]) and "SELECT location" not in _json.dumps(r["errors"]), "The SQL text of the failure must not leak into errors"
r = _gql("{ products(limit: 6) { id warehouse } }")
assert r["data"] is None, "products is [Product!]!, so one broken item nulls the whole list and data, got " + repr(r["data"])
assert len(r["errors"]) >= 1`),
      },
      {
        id: "t5",
        description: "Healthy rows and many partial failures",
        assertionCode: T(py`_fresh()
ok = _data(_gql("{ product(id: 1) { shippingEstimate warehouse } }"))["product"]
assert ok == {"shippingEstimate": "Ships in 2 days", "warehouse": "WH-AUD"}, "Healthy products are unaffected, got " + repr(ok)
r = _gql("{ products(limit: 10) { id shippingEstimate } }")
items = r["data"]["products"]
assert len(items) == 10 and [p["id"] for p in items if p["shippingEstimate"] is None] == ["5", "10"], "Products 5 and 10 are null, the other eight still have estimates, got " + repr(items)
assert [e["path"] for e in r["errors"]] == [["products", 4, "shippingEstimate"], ["products", 9, "shippingEstimate"]], "Each failure has its own path including the list index, got " + repr([e["path"] for e in r["errors"]])`),
      },
      {
        id: "t6",
        description: "Our own errors and GraphQL's validation errors pass through untouched",
        assertionCode: T(py`_fresh()
SERVER_LOG.clear()
r = _gql("{ products(limit: 0) { id } }")
assert r["errors"][0]["message"] == "limit must be between 1 and 100." and _codes(r) == ["BAD_USER_INPUT"], "Intentional errors keep their message and code, got " + repr(r["errors"])
r = _gql("{ productz { id } }")
assert "Cannot query field" in r["errors"][0]["message"], "Validation errors keep GraphQL's message, got " + repr(r["errors"])
r = _gql("mutation { createReview(input: {productId: 1, rating: 5, body: \"x\"}) { review { id } } }")
assert _codes(r) == ["UNAUTHENTICATED"] and r["errors"][0]["message"] == "You must be signed in.", "The lesson 8 error is still readable, got " + repr(r["errors"])
assert SERVER_LOG == [], "Intentional errors are not bugs and must not be logged, got " + repr(SERVER_LOG)
RESOLVERS.setdefault("Query", {})["shopName"] = lambda root, info: (_ for _ in ()).throw(ApiError("Shop closed", "SHOP_CLOSED", reopensAt="09:00"))
try:
    s2 = make_schema()
    from graphql import graphql_sync
    res = graphql_sync(s2, "{ shopName }")
    assert res.errors and res.errors[0].original_error is not None
    shown = format_error(res.errors[0])
    assert shown["message"] == "Shop closed" and shown["extensions"] == {"code": "SHOP_CLOSED", "reopensAt": "09:00"}, "A resolver can raise ApiError and clients get message, code and details, got " + repr(shown)
finally:
    del RESOLVERS["Query"]["shopName"]`),
      },
    ],
    unlocks: ["gql-errors"],
    checks: [
      {
        prompt: "A client needs to show a login screen when the user's session has expired. Which part of the error should it use to decide?",
        question: {
          type: "choice",
          options: [
            "extensions.code (UNAUTHENTICATED), because codes are stable and messages are not",
            "The message text, matched with a regular expression",
            "The position in the errors array",
            "The HTTP status only",
          ],
          answer: 0,
        },
        explanation:
          "Messages are for humans and may change or be translated. A stable code is the contract between server and client.",
      },
      {
        prompt: "`Product.warehouse: String!` raises inside `products: [Product!]!`. What does the client's `data.products` contain?",
        question: {
          type: "choice",
          options: [
            "null, and so does data: the null travels up through every non-null ancestor",
            "The healthy products, with the broken one set to null",
            "An empty list",
            "The broken product with an empty string for warehouse",
          ],
          answer: 0,
        },
        explanation:
          "A non-null field cannot be null, so its parent becomes null. The parent is a non-null list item, so the list becomes null, and `products` itself is non-null, so `data` becomes null. Make flaky or remote-backed fields nullable to contain the damage.",
      },
      {
        prompt: "How does `public_error` decide that an exception is a bug that must be hidden?",
        question: {
          type: "choice",
          options: [
            "error.original_error exists and is not a GraphQLError",
            "The message is longer than 80 characters",
            "The error has a path",
            "The error happened inside a mutation",
          ],
          answer: 0,
        },
        explanation:
          "Errors you raise deliberately are GraphQLErrors; GraphQL's own validation errors have no original exception. Anything else is an unexpected Python exception (a bug or a failed dependency): log it, show only a generic message.",
      },
    ],
  },

  // ───────────────────────────────────────── 10. connections
  {
    id: "graphql-gateway-10-connections",
    title: "Filter, sort and paginate with cursors",
    minutes: 50,
    xp: 230,
    concepts: ["cursor pagination", "connections", "keyset", "input types", "sorting", "filtering", "PageInfo"],
    learn: `### Why not offset?

Lesson 3's \`products(limit, offset)\` is the simplest paging, and it has two flaws:

- **It shifts.** While you read page 1, someone adds a product. Page 2 (\`OFFSET 5\`) now starts one row later, so the last item of page 1 shows up **again**. Delete one and you **skip** an item.
- **It gets slower.** \`OFFSET 100000\` makes the database walk 100,000 rows to throw them away.

### Cursor (keyset) pagination

Instead of "skip N rows", say "give me the rows **after this one**". The client holds a **cursor** that identifies the last row it saw, and the server turns it into a condition:

~~~sql
WHERE (name, id) > ('Cable Spool', 7)   -- everything that sorts after that row
ORDER BY name, id
LIMIT 6
~~~

An index can jump straight there, and inserts or deletes elsewhere cannot move the boundary. Two details make it correct:

- **A unique tiebreaker.** Two products can share a price. Always sort by the column **and then by \`id\`**, otherwise rows with equal values could be skipped or repeated.
- **The cursor must contain every sort value**: here \`[sort_value, id]\`.

### Opaque cursors

Clients must not look inside a cursor or build one. Encode it (Base64 of a small JSON list) so it is an opaque string; that lets you change the format later. **Decode defensively**: a client can send anything, so a malformed cursor must produce a clear \`BAD_USER_INPUT\` error, never a stack trace.

### The connection shape

The Relay *Cursor Connections* specification is the common standard:

~~~graphql
type ProductConnection {
  totalCount: Int!
  pageInfo: PageInfo!
  edges: [ProductEdge!]!
}
type ProductEdge { cursor: String!  node: Product! }
type PageInfo { hasNextPage: Boolean!  endCursor: String }
~~~

- **edges** hold a \`node\` plus *its own cursor*, so a client can resume from any item.
- **pageInfo** tells the client whether to show "Load more" and what to send as \`after\`.
- **totalCount** is optional but popular; it costs an extra \`COUNT(*)\`, and it is the count of *all* matching rows, not just this page.

To compute \`hasNextPage\` cheaply, ask the database for **one more row than requested** and drop it.

Strawberry's \`relay.connection\`, Graphene-Django's \`DjangoConnectionField\` and Ariadne's recipes all generate this shape; now you know what is inside.

### Filtering and sorting with input types and enums

Instead of a dozen arguments, take a single \`filter\` input object and a \`sort\` enum:

~~~graphql
input ProductFilter { category: String  search: String  minPriceCents: Int  maxPriceCents: Int  inStock: Boolean }
enum ProductSort { NAME PRICE_ASC PRICE_DESC NEWEST }
~~~

Adding a filter field later does not break old clients. In SQL, build the \`WHERE\` clauses from **fixed fragments** and put every client value in the parameters tuple. The *column names* for sorting must come from a **whitelist** (a dict keyed by the enum), never from client text: placeholders cannot stand in for identifiers.

### Limits are part of the design

Cap \`first\` (we allow 1 to 50). An unbounded page is an easy way to hurt your database, and lesson 12 will build on this.

### Common mistakes

- Sorting by a non-unique column only, or cursoring on \`id\` while sorting by price.
- Putting a client string into \`ORDER BY\`.
- Computing \`totalCount\` from the page instead of the whole filtered set.
- Letting the cursor encode raw SQL or trust it without validation.`,
    mission: `The catalogue is growing and the app's "load more" list keeps repeating items. Replace offset paging with a proper **connection**: filters, a sort menu and cursors that stay correct while the data changes.

The client app gets a **Browse** screen with filter chips, a sort menu and a *Load more* button that sends your \`endCursor\`.`,
    tasks: [
      "SDL: enum ProductSort, input ProductFilter, types PageInfo, ProductEdge and ProductConnection, and Query.productsConnection(first: Int = 8, after: String, filter: ProductFilter, sort: ProductSort = NAME)",
      "encode_cursor(values) / decode_cursor(text): opaque Base64 JSON; a malformed cursor raises ApiError BAD_USER_INPUT",
      "filter_clauses(filter): WHERE fragments and parameters for category (slug), search, minPriceCents, maxPriceCents and inStock",
      "The resolver: first must be 1..50; keyset condition from the cursor for the chosen sort (with an id tiebreaker); fetch first + 1 rows to compute hasNextPage; totalCount ignores the cursor; rebuild the schema",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: filtering, sorting and cursor pagination.
import base64
import binascii
import json

# 1) The connection types.
TYPE_DEFS += """
"""

# The only column names that may appear in ORDER BY (they come from this whitelist, never from clients):
# sort enum value -> (column, direction, key in the row dict)
SORTS = {
    "NAME": ("products.name", "ASC", "name"),
    "PRICE_ASC": ("products.price_cents", "ASC", "price_cents"),
    "PRICE_DESC": ("products.price_cents", "DESC", "price_cents"),
    "NEWEST": ("products.id", "DESC", "id"),
}


def encode_cursor(values):
    """[sort_value, id] -> an opaque string."""
    ...


def decode_cursor(cursor):
    """The inverse. Raise ApiError('...', 'BAD_USER_INPUT') for anything that is not a [value, int id] list."""
    ...


def filter_clauses(filter):
    """(list of SQL conditions, list of parameters) for a ProductFilter dict. Only fixed SQL; values go in params."""
    ...


# @resolver("Query", "productsConnection")
# Keyset rule: for ASC sorts  (column, id) > (?, ?);  for DESC sorts  (column, id) < (?, ?);  NEWEST uses id < ?.
# Order by "column DIRECTION, products.id DIRECTION" so ties are stable.


schema = make_schema()
`,
    solutionAdd: py`import base64
import binascii
import json

TYPE_DEFS += """
enum ProductSort {
  NAME
  PRICE_ASC
  PRICE_DESC
  NEWEST
}

input ProductFilter {
  category: String
  search: String
  minPriceCents: Int
  maxPriceCents: Int
  inStock: Boolean
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type ProductEdge {
  cursor: String!
  node: Product!
}

type ProductConnection {
  totalCount: Int!
  pageInfo: PageInfo!
  edges: [ProductEdge!]!
}

extend type Query {
  productsConnection(first: Int = 8, after: String, filter: ProductFilter, sort: ProductSort = NAME): ProductConnection!
}
"""

# sort enum value -> (column, direction, key in the row dict). Only these names ever reach ORDER BY.
SORTS = {
    "NAME": ("products.name", "ASC", "name"),
    "PRICE_ASC": ("products.price_cents", "ASC", "price_cents"),
    "PRICE_DESC": ("products.price_cents", "DESC", "price_cents"),
    "NEWEST": ("products.id", "DESC", "id"),
}


def encode_cursor(values):
    """[sort_value, id] -> an opaque string."""
    return base64.urlsafe_b64encode(json.dumps(values).encode()).decode()


def decode_cursor(cursor):
    """The inverse. Raise ApiError('...', 'BAD_USER_INPUT') for anything that is not a [value, int id] list."""
    try:
        values = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        if isinstance(values, list) and len(values) == 2 and isinstance(values[1], int) and isinstance(values[0], (int, str)):
            return values
    except (ValueError, binascii.Error):
        pass
    raise ApiError("That cursor is not valid.", "BAD_USER_INPUT")


def filter_clauses(filter):
    """(list of SQL conditions, list of parameters) for a ProductFilter dict. Only fixed SQL; values go in params."""
    clauses, params = [], []
    if filter.get("category"):
        clauses.append("products.category_id IN (SELECT id FROM categories WHERE slug = ?)")
        params.append(filter["category"])
    if (filter.get("search") or "").strip():
        pattern = like_pattern(filter["search"].strip())
        clauses.append("(lower(products.name) LIKE ? ESCAPE '!' OR lower(products.description) LIKE ? ESCAPE '!')")
        params += [pattern, pattern]
    if filter.get("minPriceCents") is not None:
        clauses.append("products.price_cents >= ?")
        params.append(filter["minPriceCents"])
    if filter.get("maxPriceCents") is not None:
        clauses.append("products.price_cents <= ?")
        params.append(filter["maxPriceCents"])
    if filter.get("inStock") is not None:
        clauses.append("products.stock > 0" if filter["inStock"] else "products.stock = 0")
    return clauses, params


@resolver("Query", "productsConnection")
def resolve_products_connection(root, info, first=8, after=None, filter=None, sort="NAME"):
    if not 1 <= first <= 50:
        raise ApiError("first must be between 1 and 50.", "BAD_USER_INPUT")
    column, direction, key = SORTS[sort]
    clauses, params = filter_clauses(filter or {})
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    total = fetch_one(info.context.db, "SELECT COUNT(*) AS n FROM products" + where, params)["n"]  # ignores the cursor

    page_clauses, page_params = list(clauses), list(params)
    if after:
        last_value, last_id = decode_cursor(after)
        op = ">" if direction == "ASC" else "<"
        if column == "products.id":
            page_clauses.append(f"products.id {op} ?")
            page_params.append(last_id)
        else:
            page_clauses.append(f"({column}, products.id) {op} (?, ?)")
            page_params += [last_value, last_id]
    page_where = (" WHERE " + " AND ".join(page_clauses)) if page_clauses else ""
    rows = product_rows(info, f"{page_where} ORDER BY {column} {direction}, products.id {direction} LIMIT ?", page_params + [first + 1])
    has_next = len(rows) > first
    rows = rows[:first]
    edges = [{"cursor": encode_cursor([row[key], row["id"]]), "node": row} for row in rows]
    return {
        "totalCount": total,
        "pageInfo": {"hasNextPage": has_next, "endCursor": edges[-1]["cursor"] if edges else None},
        "edges": edges,
    }


schema = make_schema()`,
    explanation:
      "A connection answers 'what comes after this row?' with a keyset condition, so inserts and deletes elsewhere cannot make items repeat or vanish, and the database can seek instead of skipping. The cursor holds every sort value plus the id as a tiebreaker, and it is opaque and defensively decoded. Filters are fixed SQL fragments with parameters; sort columns come from a whitelist because identifiers cannot be bound as parameters. Fetching first + 1 rows is the cheap way to know whether another page exists, and the same product_rows helper keeps the batching from lesson 7 working for every item in the page.",
    hints: [
      { id: "h1", title: "SDL", content: "enum ProductSort { NAME PRICE_ASC PRICE_DESC NEWEST }, input ProductFilter { category: String search: String minPriceCents: Int maxPriceCents: Int inStock: Boolean }, type PageInfo { hasNextPage: Boolean! endCursor: String }, type ProductEdge { cursor: String! node: Product! }, type ProductConnection { totalCount: Int! pageInfo: PageInfo! edges: [ProductEdge!]! } and extend type Query { productsConnection(first: Int = 8, after: String, filter: ProductFilter, sort: ProductSort = NAME): ProductConnection! }." },
      { id: "h2", title: "Cursors", content: "encode: base64.urlsafe_b64encode(json.dumps(values).encode()).decode(). decode: json.loads(base64.urlsafe_b64decode(cursor.encode())), check it is a 2-item list with an int id, and wrap everything in try/except (ValueError, binascii.Error); raise ApiError(\"That cursor is not valid.\", \"BAD_USER_INPUT\") otherwise." },
      { id: "h3", title: "Filter and count", content: "Each filter field adds a fixed condition and its value to params: category -> products.category_id IN (SELECT id FROM categories WHERE slug = ?); search -> two LIKE conditions using like_pattern and ESCAPE '!'; min/max -> products.price_cents >= ? / <= ?; inStock true -> products.stock > 0, false -> products.stock = 0. totalCount counts with the same WHERE but WITHOUT the cursor condition." },
      { id: "h4", title: "Keyset condition", content: 'op = ">" if direction == "ASC" else "<". For NEWEST (column products.id) add products.id {op} ?. Otherwise add ({column}, products.id) {op} (?, ?) with the cursor\'s two values. Order by f"{column} {direction}, products.id {direction}", LIMIT first + 1, then hasNextPage = len(rows) > first and rows = rows[:first]. Each edge: {"cursor": encode_cursor([row[key], row["id"]]), "node": row}.' },
    ],
    tests: [
      {
        id: "t1",
        description: "The connection types exist with the Relay shape",
        assertionCode: T(py`from graphql import GraphQLEnumType, GraphQLInputObjectType
f = schema.query_type.fields["productsConnection"]
assert str(f.type) == "ProductConnection!", "productsConnection returns ProductConnection!"
assert set(f.args) == {"first", "after", "filter", "sort"}, "arguments: first, after, filter, sort, got " + repr(sorted(f.args))
assert f.args["first"].default_value == 8 and f.args["sort"].default_value == "NAME", "defaults: first = 8, sort = NAME"
assert isinstance(schema.type_map["ProductSort"], GraphQLEnumType) and set(schema.type_map["ProductSort"].values) == {"NAME", "PRICE_ASC", "PRICE_DESC", "NEWEST"}, "enum ProductSort"
assert isinstance(schema.type_map["ProductFilter"], GraphQLInputObjectType) and set(schema.type_map["ProductFilter"].fields) == {"category", "search", "minPriceCents", "maxPriceCents", "inStock"}, "input ProductFilter fields"
c = schema.type_map["ProductConnection"].fields
assert str(c["edges"].type) == "[ProductEdge!]!" and str(c["pageInfo"].type) == "PageInfo!" and str(c["totalCount"].type) == "Int!", "ProductConnection fields"
assert str(schema.type_map["ProductEdge"].fields["cursor"].type) == "String!" and str(schema.type_map["PageInfo"].fields["endCursor"].type) == "String", "ProductEdge.cursor: String!, PageInfo.endCursor: String"`),
      },
      {
        id: "t2",
        description: "The first page: sorted by name, with totalCount and hasNextPage",
        assertionCode: T(py`_fresh()
q = "query($first: Int, $after: String, $sort: ProductSort) { productsConnection(first: $first, after: $after, sort: $sort) { totalCount pageInfo { hasNextPage endCursor } edges { cursor node { id name } } } }"
d = _data(_gql(q, {"first": 5}))["productsConnection"]
names = sorted(p[1] for p in PRODUCTS)
assert [e["node"]["name"] for e in d["edges"]] == names[:5], "NAME sort, first 5: " + repr(names[:5]) + ", got " + repr([e["node"]["name"] for e in d["edges"]])
assert d["totalCount"] == 16 and d["pageInfo"]["hasNextPage"] is True, "16 products in total and more pages to come"
assert d["pageInfo"]["endCursor"] == d["edges"][-1]["cursor"], "endCursor is the cursor of the last edge"
assert all(isinstance(e["cursor"], str) and e["cursor"] for e in d["edges"]), "Every edge has its own cursor"
last = _data(_gql(q, {"first": 50}))["productsConnection"]
assert len(last["edges"]) == 16 and last["pageInfo"]["hasNextPage"] is False, "One big page has no next page"`),
      },
      {
        id: "t3",
        description: "Walking every page in every sort order visits each product exactly once",
        assertionCode: T(py`_fresh()
q = "query($first: Int, $after: String, $sort: ProductSort) { productsConnection(first: $first, after: $after, sort: $sort) { pageInfo { hasNextPage endCursor } edges { node { id } } } }"
def walk(sort, size):
    after, ids = None, []
    for _ in range(40):
        d = _data(_gql(q, {"first": size, "after": after, "sort": sort}))["productsConnection"]
        ids += [e["node"]["id"] for e in d["edges"]]
        if not d["pageInfo"]["hasNextPage"]:
            return ids
        after = d["pageInfo"]["endCursor"]
    assert False, "The pages never ended for sort " + sort
rows = [(i + 1, p) for i, p in enumerate(PRODUCTS)]
want = {
    "NAME": [str(i) for i, p in sorted(rows, key=lambda x: (x[1][1], x[0]))],
    "PRICE_ASC": [str(i) for i, p in sorted(rows, key=lambda x: (x[1][4], x[0]))],
    "PRICE_DESC": [str(i) for i, p in sorted(rows, key=lambda x: (-x[1][4], -x[0]))],
    "NEWEST": [str(i) for i, p in sorted(rows, key=lambda x: -x[0])],
}
for sort, size in (("NAME", 5), ("NAME", 3), ("NAME", 16), ("PRICE_ASC", 5), ("PRICE_DESC", 5), ("NEWEST", 5)):
    got = walk(sort, size)
    assert got == want[sort], "Sort " + sort + " with pages of " + str(size) + " should visit " + repr(want[sort]) + ", got " + repr(got)`),
      },
      {
        id: "t4",
        description: "Cursors stay correct when data changes between pages",
        assertionCode: T(py`_fresh()
q = "query($first: Int, $after: String) { productsConnection(first: $first, after: $after) { pageInfo { endCursor } edges { node { name } } } }"
one = _data(_gql(q, {"first": 5}))["productsConnection"]
DB.execute("INSERT INTO products (sku, name, description, category_id, price_cents, stock) VALUES ('NEW-001', 'Aardvark Plush', 'New this minute.', 4, 1000, 5)")
DB.commit()
two = _data(_gql(q, {"first": 5, "after": one["pageInfo"]["endCursor"]}))["productsConnection"]
names = sorted(p[1] for p in PRODUCTS)
assert [e["node"]["name"] for e in two["edges"]] == names[5:10], "Page 2 must continue exactly after page 1 even though a product was inserted before it (an OFFSET page would repeat '" + names[4] + "'), got " + repr([e["node"]["name"] for e in two["edges"]])`),
      },
      {
        id: "t5",
        description: "Filters narrow the set and totalCount follows",
        assertionCode: T(py`_fresh()
def run(flt, first=50):
    q = "query($f: ProductFilter, $first: Int) { productsConnection(first: $first, filter: $f) { totalCount edges { node { name } } } }"
    d = _data(_gql(q, {"f": flt, "first": first}))["productsConnection"]
    return d["totalCount"], [e["node"]["name"] for e in d["edges"]]
n, names = run({"category": "desk"})
assert n == 4 and names == sorted(["Walnut Laptop Stand", "Mechanical Keyboard", "Felt Desk Mat", "Cable Spool"]), "category desk has 4 products, got " + repr((n, names))
n, names = run({"minPriceCents": 8000})
assert n == 3 and names == ["Commuter Backpack", "Mechanical Keyboard", "Studio Headphones"], "min price 8000 -> 3 products, got " + repr((n, names))
n, names = run({"maxPriceCents": 1900})
assert names == ["Cable Spool", "Clip Light", "Tech Pouch"], "max price 1900 -> Cable Spool (1400), Clip Light (1900), Tech Pouch (1700), got " + repr((n, names))
n, names = run({"inStock": True})
assert n == 15 and "Glow Cube" not in names, "inStock true excludes the sold-out Glow Cube, got " + repr(n)
n, names = run({"inStock": False})
assert (n, names) == (1, ["Glow Cube"]), "inStock false gives only the sold-out product"
n, names = run({"search": "DESK"})
assert names == ["Arc Desk Lamp", "Felt Desk Mat"], "search is case-insensitive over name and description, got " + repr(names)
n, names = run({"category": "audio", "maxPriceCents": 5000})
assert names == ["Pocket Speaker"], "Filters combine with AND, got " + repr(names)
n, names = run({"category": "desk"}, first=2)
assert n == 4 and len(names) == 2, "totalCount counts the whole filtered set, not the page"
assert run({"search": "100%"})[0] == 0 and run({"search": "   "})[0] == 16, "Wildcards are escaped and a blank search is ignored"
assert run({"category": "x' OR 1=1 --"})[0] == 0, "Filter values are parameters, never SQL"
assert run({})[0] == 16 and run(None)[0] == 16, "No filter means everything"`),
      },
      {
        id: "t6",
        description: "Filters work together with cursors",
        assertionCode: T(py`_fresh()
q = "query($first: Int, $after: String) { productsConnection(first: $first, after: $after, filter: {category: \"bags\"}, sort: PRICE_DESC) { totalCount pageInfo { hasNextPage endCursor } edges { node { name priceCents } } } }"
a = _data(_gql(q, {"first": 2}))["productsConnection"]
assert [e["node"]["name"] for e in a["edges"]] == ["Commuter Backpack", "Canvas Tote"] and a["totalCount"] == 3 and a["pageInfo"]["hasNextPage"], "Bags by price descending, page 1, got " + repr(a)
b = _data(_gql(q, {"first": 2, "after": a["pageInfo"]["endCursor"]}))["productsConnection"]
assert [e["node"]["name"] for e in b["edges"]] == ["Tech Pouch"] and b["pageInfo"]["hasNextPage"] is False and b["totalCount"] == 3, "Page 2 holds the last bag and totalCount stays 3, got " + repr(b)
empty = _data(_gql("{ productsConnection(filter: {category: \"nope\"}) { totalCount pageInfo { hasNextPage endCursor } edges { cursor } } }"))["productsConnection"]
assert empty == {"totalCount": 0, "pageInfo": {"hasNextPage": False, "endCursor": None}, "edges": []}, "An empty result still has a complete shape, got " + repr(empty)`),
      },
      {
        id: "t7",
        description: "Bad pagination input is BAD_USER_INPUT",
        assertionCode: T(py`_fresh()
for first in (0, -1, 51):
    r = _gql("{ productsConnection(first: " + str(first) + ") { totalCount } }")
    assert _codes(r) == ["BAD_USER_INPUT"], "first: " + str(first) + " should be rejected with BAD_USER_INPUT, got " + repr(r.get("errors"))
for bad in ("!!!", "bm90LWpzb24=", encode_cursor("x"), encode_cursor([1]), encode_cursor(["a", "b"])):
    r = _gql("query($c: String) { productsConnection(after: $c) { totalCount } }", {"c": bad})
    assert _codes(r) == ["BAD_USER_INPUT"], "The cursor " + repr(bad) + " is malformed and should give BAD_USER_INPUT, got " + repr(r.get("errors"))
r = _gql('{ productsConnection(after: "") { totalCount } }')
assert not r.get("errors"), "An empty cursor means the first page"
assert decode_cursor(encode_cursor(["Cable Spool", 7])) == ["Cable Spool", 7], "decode_cursor undoes encode_cursor"
c = encode_cursor([1, 2])
assert isinstance(c, str) and "[" not in c and "," not in c, "Cursors are opaque strings, not readable JSON"`),
      },
      {
        id: "t8",
        description: "Pages are batched (no N+1 inside a page)",
        assertionCode: T(py`_fresh()
r = _gql("{ productsConnection(first: 16) { edges { node { name category { name } } } } }")
assert len(_data(r)["productsConnection"]["edges"]) == 16
assert r["extensions"]["stats"]["sql"] == 3, "COUNT + products + one batched categories query = 3 statements, got " + str(r["extensions"]["stats"]["sql"]) + ". Build the rows with product_rows(info, ...) so the loaders are primed."`),
      },
    ],
    unlocks: ["gql-browse"],
    checks: [
      {
        prompt: "Two products both cost 2900 cents. Sorting only by `price_cents` and cursoring on `price_cents` alone can skip one of them. What fixes it?",
        question: {
          type: "choice",
          options: [
            "Add the unique id as a second sort key and put it in the cursor",
            "Round the prices",
            "Use OFFSET instead",
            "Sort in Python after fetching",
          ],
          answer: 0,
        },
        explanation:
          "A cursor must identify one exact position in a total order. With ties, `price > 2900` skips the twin and `price >= 2900` repeats it. `(price, id) > (2900, 7)` is unambiguous.",
      },
      {
        prompt: "Why do we fetch `first + 1` rows from the database?",
        question: {
          type: "choice",
          options: [
            "To learn whether a next page exists without a second query",
            "To make the page one item bigger than requested",
            "Because SQLite LIMIT is zero-based",
            "To warm the cache",
          ],
          answer: 0,
        },
        explanation:
          "If the extra row comes back there is more data, so `hasNextPage` is true; then you drop that row and return only `first`. It is one query instead of count-and-compare.",
      },
      {
        prompt: "A client sends `sort: \"price_cents; DROP TABLE products\"`. Why can that not hurt the `ORDER BY`?",
        question: {
          type: "choice",
          options: [
            "sort is an enum; only the declared values are accepted, and the column then comes from our SORTS whitelist",
            "Python escapes semicolons automatically",
            "SQLite ignores everything after a semicolon in ORDER BY",
            "Placeholders can bind column names",
          ],
          answer: 0,
        },
        explanation:
          "The schema rejects any value that is not one of the enum names, and the SQL fragment is chosen from a fixed dictionary. Identifiers cannot be passed as `?` placeholders, so whitelisting is the right tool.",
      },
    ],
  },
];
