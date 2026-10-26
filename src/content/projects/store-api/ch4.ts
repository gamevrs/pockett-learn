import type { Lesson } from "@/engine/types";
import { py, T } from "./shared.ts";

/** Chapter 4: Orders and production. Transactions, a test client, idempotency, docs and versioning. */
export const chapter4: Lesson[] = [
  // ───────────────────────────────────────── 12. orders
  {
    id: "store-api-12-orders",
    title: "Orders and transactions",
    minutes: 40,
    xp: 220,
    concepts: ["transactions", "atomicity", "rollback", "foreign keys", "object-level authorization", "never trust client prices"],
    learn: `### Checkout changes many things at once

Placing an order touches several rows: a new \`orders\` row, one \`order_items\` row per product, and a lower \`stock\` on each product. If the third item turns out to be out of stock, you must **not** leave a half-built order and two products with reduced stock. That is **atomicity**: all of it happens, or none of it.

A database **transaction** gives you exactly that. In Python:

~~~python
with conn:                       # BEGIN ... COMMIT, or ROLLBACK if anything raises
    order_id = conn.execute("INSERT INTO orders (user_id, total_cents) VALUES (?, 0)", (user_id,)).lastrowid
    for line in lines:
        ...                      # decrease stock, add order_items
        if problem:
            raise ApiError(409, ...)   # leaving the block through an exception rolls everything back
~~~

Raise the error *inside* the \`with\`. The connection undoes every statement of the block, and your error middleware then answers the request.

### The schema

Two tables joined by a foreign key:

- \`orders(id, user_id -> users, total_cents, created_at)\`
- \`order_items(id, order_id -> orders, product_id -> products, quantity, unit_price_cents)\`

\`unit_price_cents\` is a **snapshot**: the price at the time of purchase. If the shop changes a price next month, last month's orders must still show what the customer paid.

The foreign key from \`order_items\` to \`products\` also protects history: deleting a product that has been ordered fails with an \`IntegrityError\`, which your middleware already turns into **409**.

### Never trust the client with money

The request says *which* products and *how many*. It does not get to say what they cost. Read the price from the database inside the transaction, compute the total on the server, and ignore any \`price\` or \`total\` field the client sent. (This is a classic real-world exploit: edit the JSON in the browser, pay one cent.)

### Stock, safely

The obvious code reads stock, checks it in Python, then writes it back. Two requests can read the same value and both succeed, overselling. Make the **database** do the check and the change in one statement:

~~~sql
UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?
~~~

\`cursor.rowcount\` tells you how many rows changed. Zero means either the product doesn't exist or there was not enough stock, and since you've already read the product you know which. Not enough stock is a **409** (\`out_of_stock\`): the request is fine, the state says no. An unknown product id is a **422**.

### Whose order is it?

Roles aren't enough here. Every customer is allowed to call \`GET /orders/{id}\`, but only for **their own** orders. Without a check, customer A can read customer B's order by changing a number in the URL. That mistake (broken object-level authorization) is the number one item in OWASP's API security list. Make the rule: a customer sees only their orders, an admin sees all, and somebody else's order looks like it **does not exist** (404), so ids can't be probed.

### The N+1 query problem

Listing orders by calling \`get_order\` per order means 1 query for the list plus N for the items. It is fine for a demo and slow at scale; the fix is one \`JOIN\` or one \`WHERE order_id IN (...)\` query. ORMs call the fix "eager loading" (\`select_related\`, \`joinedload\`).

### In frameworks

~~~python
# Django:      with transaction.atomic(): ...
# SQLAlchemy:  with session.begin(): ...
# FastAPI/Flask: the same ideas, via your database library
~~~

### Common mistakes

- No transaction, so a failure halfway leaves partial data.
- Computing totals from client-supplied prices.
- Checking stock in Python, then updating it.
- Returning another user's order (or a 403 that proves it exists).`,
    mission: `The shop can finally take money. Build checkout: a signed-in customer posts a cart, and the API creates the order, decreases stock and totals the price, all in one transaction. If one item can't be fulfilled, nothing at all must change.

The storefront cart now has a Checkout button, and an Orders screen lists what you bought.`,
    tasks: [
      "orders and order_items tables (registered with @on_reset)",
      "parse_order_items(data): a non-empty list of {product_id, quantity 1 to 99} or a 422 naming each bad field",
      "place_order(user_id, lines): one transaction, a conditional stock UPDATE, prices read from the database; unknown product 422, not enough stock 409 out_of_stock; get_order() and list_orders()",
      "POST /orders (201 + Location), GET /orders (mine; admins see all) and GET /orders/{order_id:int} (someone else's is a 404); add them to POLICY as 'user'",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: orders, transactions and ownership.
MAX_LINE_QUANTITY = 99


@on_reset
def create_order_schema(conn):
    """orders: id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
               total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
               created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    order_items: id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                 product_id INTEGER NOT NULL REFERENCES products(id),
                 quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price_cents INTEGER NOT NULL"""
    ...


def parse_order_items(data):
    """data["items"] must be a non-empty list of {"product_id": int, "quantity": int 1..MAX_LINE_QUANTITY}.
    Return the clean list; otherwise raise ApiError(422, "validation_error", ..., details) naming every bad
    field like "items[0].quantity". Extra keys (a client-supplied price, say) are ignored."""
    ...


def get_order(order_id):
    """The order dict plus "items": [{"product_id", "name", "quantity", "unit_price_cents"}], or None."""
    ...


def list_orders(user_id=None):
    """Orders (newest id first) for one user, or everyone's when user_id is None."""
    ...


def place_order(user_id, lines):
    """ONE transaction (with get_db() as conn): insert the order, then for each line read the product's
    current price, run UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?, insert the
    order_item with that price, add to the total. Unknown product -> ApiError 422. rowcount 0 ->
    ApiError(409, "out_of_stock", ...). Store the total and return get_order(order_id)."""
    ...


@app.post("/orders")
def create_order(request):
    """201 with the order and a Location header. The owner is request["user"]."""
    ...


@app.get("/orders")
def index_orders(request):
    """{"items": [...], "total": n}: the caller's orders, or everyone's for an admin."""
    ...


@app.get("/orders/{order_id:int}")
def show_order(request):
    """The order if it is yours (or you are an admin); otherwise ApiError 404 as if it did not exist."""
    ...


# TODO: add the three order routes to POLICY (any signed-in user may call them)
`,
    solutionAdd: py`MAX_LINE_QUANTITY = 99


@on_reset
def create_order_schema(conn):
    conn.executescript(
        """
        CREATE TABLE orders (
            id          INTEGER PRIMARY KEY,
            user_id     INTEGER NOT NULL REFERENCES users(id),
            total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
            created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE order_items (
            id               INTEGER PRIMARY KEY,
            order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            product_id       INTEGER NOT NULL REFERENCES products(id),
            quantity         INTEGER NOT NULL CHECK (quantity > 0),
            unit_price_cents INTEGER NOT NULL
        );
        """
    )


def parse_order_items(data):
    """Validate the cart. Client prices and totals are never read."""
    items = data.get("items")
    if not isinstance(items, list) or not items:
        raise ApiError(422, "validation_error", "An order needs at least one item.", [{"field": "items", "message": "must be a non-empty list"}])
    problems, lines = [], []
    for index, item in enumerate(items):
        item = item if isinstance(item, dict) else {}
        product_id, quantity = item.get("product_id"), item.get("quantity")
        if type(product_id) is not int:
            problems.append({"field": f"items[{index}].product_id", "message": "must be a whole number"})
        if type(quantity) is not int or not 1 <= quantity <= MAX_LINE_QUANTITY:
            problems.append({"field": f"items[{index}].quantity", "message": f"must be a whole number from 1 to {MAX_LINE_QUANTITY}"})
        lines.append({"product_id": product_id, "quantity": quantity})
    if problems:
        raise ApiError(422, "validation_error", "The order is not valid.", problems)
    return lines


def get_order(order_id):
    conn = get_db()
    order = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    if order is None:
        return None
    lines = conn.execute(
        "SELECT oi.product_id, p.name, oi.quantity, oi.unit_price_cents "
        "FROM order_items oi JOIN products p ON p.id = oi.product_id "
        "WHERE oi.order_id = ? ORDER BY oi.id",
        (order_id,),
    )
    return {**dict(order), "items": [dict(line) for line in lines]}


def list_orders(user_id=None):
    if user_id is None:
        ids = get_db().execute("SELECT id FROM orders ORDER BY id DESC")
    else:
        ids = get_db().execute("SELECT id FROM orders WHERE user_id = ? ORDER BY id DESC", (user_id,))
    return [get_order(row["id"]) for row in ids.fetchall()]  # N+1 queries: fine here, join in production


def place_order(user_id, lines):
    """Everything inside the with-block commits together, or is rolled back together."""
    with get_db() as conn:
        order_id = conn.execute("INSERT INTO orders (user_id, total_cents) VALUES (?, 0)", (user_id,)).lastrowid
        total = 0
        for index, line in enumerate(lines):
            product = conn.execute("SELECT id, name, price_cents FROM products WHERE id = ?", (line["product_id"],)).fetchone()
            if product is None:
                raise ApiError(422, "validation_error", "An item refers to a product that does not exist.", [{"field": f"items[{index}].product_id", "message": "does not exist"}])
            # the database checks and changes stock in ONE statement, so two buyers can't both take the last one
            taken = conn.execute(
                "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
                (line["quantity"], product["id"], line["quantity"]),
            )
            if taken.rowcount == 0:
                raise ApiError(409, "out_of_stock", f"Not enough stock for {product['name']}.", [{"field": f"items[{index}].quantity", "message": "more than we have in stock"}])
            conn.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
                (order_id, product["id"], line["quantity"], product["price_cents"]),  # price from the database
            )
            total += line["quantity"] * product["price_cents"]
        conn.execute("UPDATE orders SET total_cents = ? WHERE id = ?", (total, order_id))
    return get_order(order_id)


@app.post("/orders")
def create_order(request):
    """Place an order for the signed-in user."""
    lines = parse_order_items(read_json(request))
    order = place_order(request["user"]["id"], lines)
    return json_response(201, order, {"Location": f"/orders/{order['id']}"})


@app.get("/orders")
def index_orders(request):
    """List my orders (an admin sees everyone's)."""
    user = request["user"]
    orders = list_orders(None if user["role"] == "admin" else user["id"])
    return json_response(200, {"items": orders, "total": len(orders)})


@app.get("/orders/{order_id:int}")
def show_order(request):
    """Fetch one order. Other people's orders look like they do not exist."""
    user = request["user"]
    order_id = request["params"]["order_id"]
    order = get_order(order_id)
    if order is None or (order["user_id"] != user["id"] and user["role"] != "admin"):
        raise ApiError(404, "not_found", f"Order {order_id} does not exist")
    return json_response(200, order)


POLICY.update(
    {
        ("POST", "/orders"): "user",
        ("GET", "/orders"): "user",
        ("GET", "/orders/{order_id:int}"): "user",
    }
)`,
    explanation:
      "place_order is the whole lesson in one function: everything happens inside one 'with' block, so an ApiError raised for item three rolls back the order row and the stock changes made for items one and two. Stock is checked and changed by a single conditional UPDATE, so concurrent buyers can't oversell; prices and the total come from the database, never from the request. show_order treats someone else's order exactly like a missing one, so ids can't be probed. POLICY says who may call the endpoints; the handler says whose data they may see.",
    hints: [
      { id: "h1", title: "One transaction", content: "Wrap everything in `with get_db() as conn:` and raise ApiError from inside the block. The exception leaves the block, so SQLite rolls back all the INSERTs and UPDATEs made so far." },
      { id: "h2", title: "Stock", content: 'taken = conn.execute("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", (qty, pid, qty)); if taken.rowcount == 0: raise ApiError(409, "out_of_stock", ...). Read price_cents from the product row you just selected.' },
      { id: "h3", title: "Ownership", content: 'In show_order: if order is None or (order["user_id"] != user["id"] and user["role"] != "admin"): raise the same 404 for both cases. And remember POLICY.update({...}) so signed-in users may reach the routes at all.' },
    ],
    tests: [
      {
        id: "t1",
        description: "The schema links orders to users and items to products",
        assertionCode: T(py`import sqlite3
reset_db()
names = {r[0] for r in get_db().execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
assert {"orders", "order_items"} <= names, "Create the orders and order_items tables with @on_reset"
try:
    get_db().execute("INSERT INTO orders (user_id, total_cents) VALUES (999, 0)")
    assert False, "An order for a user that does not exist should be rejected (REFERENCES users(id))"
except sqlite3.IntegrityError:
    pass
get_db().rollback()
try:
    get_db().execute("INSERT INTO orders (user_id, total_cents) VALUES (1, 0)")
    get_db().execute("INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (1, 1, 0, 100)")
    assert False, "A quantity of 0 should be rejected (CHECK (quantity > 0))"
except sqlite3.IntegrityError:
    pass`),
      },
      {
        id: "t2",
        description: "parse_order_items validates the cart and reports every bad field",
        assertionCode: T(py`assert parse_order_items({"items": [{"product_id": 1, "quantity": 2}, {"product_id": 3, "quantity": 1, "price_cents": 1}]}) == [{"product_id": 1, "quantity": 2}, {"product_id": 3, "quantity": 1}], "Return clean lines with only product_id and quantity (ignore client prices)"
for bad in [None, [], "x", {"a": 1}]:
    try:
        parse_order_items({"items": bad})
    except ApiError as e:
        assert e.status == 422, "items must be a non-empty list: 422"
    else:
        assert False, "items=" + repr(bad) + " should be rejected"
try:
    parse_order_items({"items": [{"product_id": "1", "quantity": 0}, {"quantity": 2}, "oops", {"product_id": 2, "quantity": 100}]})
except ApiError as e:
    fields = {d["field"] for d in e.details}
    assert fields == {"items[0].product_id", "items[0].quantity", "items[1].product_id", "items[2].product_id", "items[2].quantity", "items[3].quantity"}, "Name every bad field like 'items[0].quantity', got " + str(sorted(fields))
else:
    assert False, "Bad lines should raise ApiError"
try:
    parse_order_items({"items": [{"product_id": True, "quantity": 1}]})
    assert False, "True is not a product id"
except ApiError:
    pass`),
      },
      {
        id: "t3",
        description: "Placing an order needs a signed-in user",
        assertionCode: T(py`reset_db()
body = {"items": [{"product_id": 1, "quantity": 1}]}
assert _c("POST", "/orders", body)["status"] == 401, "POST /orders without a token should be 401. Did you add the routes to POLICY?"
assert _c("GET", "/orders")["status"] == 401
assert _c("GET", "/orders/1")["status"] == 401
assert _c("POST", "/orders", body, token=_sam())["status"] == 201, "A customer may place an order"
assert _c("POST", "/orders", body, token=_admin())["status"] == 201, "An admin is a user too"`),
      },
      {
        id: "t4",
        description: "A valid order is created, totalled and takes stock",
        assertionCode: T(py`reset_db()
sam = _sam()
r = _c("POST", "/orders", {"items": [{"product_id": 1, "quantity": 2}, {"product_id": 6, "quantity": 1}]}, token=sam)
assert r["status"] == 201, "Expected 201 Created, got " + str(r["status"]) + " " + str(r["body"])
o = r["body"]
assert o["user_id"] == 2, "The order belongs to the signed-in user (Sam is user 2)"
assert o["total_cents"] == 2 * 5900 + 2900, "Total should be 2 x 5900 + 2900 = 14700, got " + str(o["total_cents"])
assert [(i["product_id"], i["quantity"], i["unit_price_cents"], i["name"]) for i in o["items"]] == [(1, 2, 5900, "Tide Earbuds"), (6, 1, 2900, "Felt Desk Mat")], "items should list product_id, quantity, unit_price_cents and name. Got " + str(o["items"])
assert _hdr(r, "Location") == "/orders/" + str(o["id"]), "Location should point at the new order"
assert _c("GET", "/products/1")["body"]["stock"] == 38, "Ordering 2 of product 1 should leave 38 in stock"
assert _c("GET", "/products/6")["body"]["stock"] == 59`),
      },
      {
        id: "t5",
        description: "Prices always come from the database",
        assertionCode: T(py`reset_db()
r = _c("POST", "/orders", {"total_cents": 1, "items": [{"product_id": 1, "quantity": 1, "price_cents": 1, "unit_price_cents": 1}]}, token=_sam())
assert r["status"] == 201
assert r["body"]["total_cents"] == 5900 and r["body"]["items"][0]["unit_price_cents"] == 5900, "Never trust prices sent by the client. The total must be 5900, got " + str(r["body"]["total_cents"])
_c("PATCH", "/products/1", {"price_cents": 100}, token=_admin())
o = _c("GET", "/orders/" + str(r["body"]["id"]), token=_sam())["body"]
assert o["items"][0]["unit_price_cents"] == 5900 and o["total_cents"] == 5900, "Orders keep the price paid at the time, even when the product price changes later"`),
      },
      {
        id: "t6",
        description: "Not enough stock is a 409 and changes nothing",
        assertionCode: T(py`reset_db()
sam = _sam()
r = _c("POST", "/orders", {"items": [{"product_id": 9, "quantity": 1}]}, token=sam)
assert r["status"] == 409 and _code(r) == "out_of_stock", "An item with 0 stock is 409 out_of_stock, got " + str(r["status"]) + " " + str(_code(r))
r = _c("POST", "/orders", {"items": [{"product_id": 4, "quantity": 4}]}, token=sam)
assert r["status"] == 409, "Wanting 4 when 3 are left is 409"
assert r["body"]["error"]["details"][0]["field"] == "items[0].quantity"
assert _c("GET", "/products/4")["body"]["stock"] == 3, "Stock must be untouched"
r = _c("POST", "/orders", {"items": [{"product_id": 4, "quantity": 3}]}, token=sam)
assert r["status"] == 201 and _c("GET", "/products/4")["body"]["stock"] == 0, "Buying exactly what is left works"
assert _c("POST", "/orders", {"items": [{"product_id": 4, "quantity": 1}]}, token=sam)["status"] == 409, "...and then it is sold out"`),
      },
      {
        id: "t7",
        description: "A failure halfway rolls everything back",
        assertionCode: T(py`reset_db()
sam = _sam()
r = _c("POST", "/orders", {"items": [{"product_id": 1, "quantity": 5}, {"product_id": 6, "quantity": 2}, {"product_id": 4, "quantity": 99}]}, token=sam)
assert r["status"] == 409, "The third item is out of stock: 409, got " + str(r["status"])
assert _c("GET", "/products/1")["body"]["stock"] == 40, "Stock taken for item 1 must be given back (rolled back). Is everything inside one 'with get_db() as conn' block?"
assert _c("GET", "/products/6")["body"]["stock"] == 60
conn = get_db()
assert conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 0, "No order row may be left behind"
assert conn.execute("SELECT COUNT(*) FROM order_items").fetchone()[0] == 0, "No order_items may be left behind"
r = _c("POST", "/orders", {"items": [{"product_id": 1, "quantity": 1}, {"product_id": 9999, "quantity": 1}]}, token=sam)
assert r["status"] == 422, "An unknown product is 422, got " + str(r["status"])
assert _c("GET", "/products/1")["body"]["stock"] == 40, "...and it also rolls back item 1"`),
      },
      {
        id: "t8",
        description: "Bad carts are 422 or 400",
        assertionCode: T(py`reset_db()
sam = _sam()
for payload in [{}, {"items": []}, {"items": [{"product_id": 1, "quantity": 0}]}, {"items": [{"product_id": 1, "quantity": "2"}]}, {"items": [{"quantity": 1}]}, {"items": "all of it"}]:
    r = _c("POST", "/orders", payload, token=sam)
    assert r["status"] == 422, "Cart " + str(payload) + " should be 422, got " + str(r["status"])
assert _c("POST", "/orders", "{not json", token=sam)["status"] == 400
assert _c("GET", "/products/1")["body"]["stock"] == 40`),
      },
      {
        id: "t9",
        description: "Customers only see their own orders; admins see all",
        assertionCode: T(py`reset_db()
sam = _sam()
admin = _admin()
_c("POST", "/auth/register", {"email": "bob@example.com", "password": "bob-pass-789"})
bob = _login("bob@example.com", "bob-pass-789")
o1 = _c("POST", "/orders", {"items": [{"product_id": 2, "quantity": 1}]}, token=sam)["body"]
o2 = _c("POST", "/orders", {"items": [{"product_id": 3, "quantity": 1}]}, token=bob)["body"]
assert _c("GET", "/orders/" + str(o1["id"]), token=sam)["status"] == 200, "You can read your own order"
r = _c("GET", "/orders/" + str(o1["id"]), token=bob)
assert r["status"] == 404, "Bob must not be able to read Sam's order. Answer 404 (as if it did not exist), got " + str(r["status"])
assert _c("GET", "/orders/" + str(o1["id"]), token=admin)["status"] == 200, "Admins can read any order"
assert _c("GET", "/orders/9999", token=sam)["status"] == 404
mine = _c("GET", "/orders", token=sam)["body"]
assert mine["total"] == 1 and mine["items"][0]["id"] == o1["id"], "GET /orders lists only the caller's orders"
assert _c("GET", "/orders", token=bob)["body"]["total"] == 1
everyone = _c("GET", "/orders", token=admin)["body"]
assert everyone["total"] == 2 and [o["id"] for o in everyone["items"]] == [o2["id"], o1["id"]], "Admins see everyone's orders, newest first"`),
      },
      {
        id: "t10",
        description: "Products that were ordered cannot be deleted (409)",
        assertionCode: T(py`reset_db()
admin = _admin()
_c("POST", "/orders", {"items": [{"product_id": 1, "quantity": 1}]}, token=_sam())
r = _c("DELETE", "/products/1", token=admin)
assert r["status"] == 409 and _code(r) == "conflict", "Deleting an ordered product breaks the foreign key: 409, got " + str(r["status"])
assert _c("GET", "/products/1")["status"] == 200, "The product must still be there"
assert _c("DELETE", "/products/2", token=admin)["status"] == 204, "A product that was never ordered can still be deleted"`),
      },
    ],
    unlocks: ["store-orders"],
    checks: [
      {
        prompt: "Item 3 of a 3-item order is out of stock, after items 1 and 2 already decreased their stock. What guarantees the stock is restored?",
        question: {
          type: "choice",
          options: [
            "All the statements ran in one transaction, and the exception rolled it back",
            "Python undoes variable changes when an exception happens",
            "The client retries and fixes it",
            "A nightly job recounts stock",
          ],
          answer: 0,
        },
        explanation:
          "A transaction is atomic: leaving the `with conn:` block through an exception rolls back every statement inside it. Nothing in your Python variables matters; it is the database that undoes the writes.",
      },
      {
        prompt: "The cart JSON contains `\"price_cents\": 1` for a product that costs 5900. Which price does the order use?",
        question: {
          type: "choice",
          options: ["The one in the products table", "The client's, since it is the buyer's request", "The lower of the two", "Whatever was sent last"],
          answer: 0,
        },
        explanation:
          "The server owns prices. Anything the client sends about money is a suggestion at best and an attack at worst.",
      },
      {
        prompt: "Customer Bob requests `GET /orders/7`, which belongs to Sam. Best response?",
        question: {
          type: "choice",
          options: [
            "404 Not Found, the same as for an order that doesn't exist",
            "200 with Sam's order, since Bob is signed in",
            "403 Forbidden with the owner's email",
            "401 Unauthorized",
          ],
          answer: 0,
        },
        explanation:
          "Being signed in is not the same as owning the data. A 404 avoids confirming that order 7 exists, so ids can't be enumerated. (Some APIs prefer 403; never return the data.)",
      },
    ],
  },

  // ───────────────────────────────────────── 13. tests
  {
    id: "store-api-13-tests",
    title: "A test client and a safety net",
    minutes: 35,
    xp: 200,
    concepts: ["test client", "fixtures", "error-path tests", "isolation", "mutation checking"],
    learn: `### Why test an API in-process

You have a lot of behaviour now: validation, constraints, roles, transactions. Every change risks breaking something far away. Tests are the safety net, and an API is easy to test: **\`handle(request)\` is just a function**. Build a request dict, call it, assert on the response dict. No server, no ports, no network, so a test takes a millisecond. SQLite in memory also means the tests exercise the real constraints and transactions instead of mocks that quietly disagree with the database.

Every framework ships this idea:

~~~python
# Flask:    client = app.test_client();      client.get("/products")
# FastAPI:  client = TestClient(app);        client.get("/products")
# Django:   client = Client();               client.get("/products/")
~~~

### A small test client

A **test client** wraps request-building so tests read like intent, and wraps the response so assertions are short:

~~~python
client = TestClient(handle)
client.login("sam@example.com", "sam-pass-456")      # remembers the bearer token
reply = client.post("/orders", {"items": [{"product_id": 1, "quantity": 1}]})
assert reply.status == 201
assert reply.json["total_cents"] == 5900
~~~

### Every test starts from a known state

Tests must not depend on each other or on running order. Before each one, rebuild the database from scratch (\`reset_db()\`). This is called a **fixture** (pytest: \`@pytest.fixture\`; Django: \`TestCase\` wraps each test in a transaction it rolls back). Your runner will do it for every function whose name starts with \`test_\`.

### Test the unhappy paths

A suite that only checks that good requests work protects the least valuable half. The bugs and the security holes live in the error paths:

- a missing product returns **404**, not a crash and not an empty 200,
- invalid data returns **422** and *stores nothing*,
- a duplicate SKU returns **409**,
- anonymous callers get **401**, customers get **403**,
- a failed checkout leaves stock unchanged.

Assert on the **contract**: status, error \`code\`, and the shape of the body. Don't assert on whole message strings or generated timestamps; that makes tests brittle without making them better.

### Arrange, act, assert

~~~python
def test_deleting_a_product_twice_is_404_the_second_time():
    client = TestClient(handle)                      # arrange
    client.login(*ADMIN)
    client.delete("/products/5")                     # act
    again = client.delete("/products/5")
    assert again.status == 404                       # assert
~~~

One behaviour per test, and a name that says what that behaviour is. When it fails at 2 a.m. the name should already tell you what broke.

### Can your tests fail?

A test that cannot fail is worse than no test, because it gives false confidence. A quick sanity check is **mutation testing**: deliberately break the code (open up the admin routes, skip the 404 check) and see whether the suite notices. If everything still passes, a test is missing. The checker for this lesson does exactly that to your suite.

### In pytest

Plain \`assert\` statements, fixtures for setup, \`@pytest.mark.parametrize\` for tables of cases, and tools like \`mutmut\` automate mutation testing. The structure you build today maps one-to-one.

### Common mistakes

- Tests that share state or need a certain order.
- Only testing 200s.
- Asserting incidental details (exact message text, row order you did not specify).
- Mocking the database, then shipping a bug the real database would have caught.`,
    mission: `Your API is large enough to break itself. Give it a safety net: a test client, a tiny runner, and a suite that covers the happy path **and** the failures.

The demo gets a **Tests** tab that runs your suite against the live API and lists every test. The checker also sabotages your code on purpose to see if your suite catches it. (The Tests tab calls run_tests() under a 0.25 second limit, so keep the suite lean: a handful of focused tests is plenty.)`,
    tasks: [
      "Reply wraps a response: status, json (the body), headers (lower-case names)",
      "TestClient(handler): get / post / put / patch / delete, login() that remembers the bearer token",
      "run_tests(): run every function named test_*, rebuilding the database first; return [{name, passed, error}]",
      "Write at least 6 tests that cover: create then fetch, 404, 422, 409, 401 and 403, and a rolled-back order",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: a test client and a safety net.


class Reply:
    """A response with attribute access: reply.status, reply.json (the body), reply.headers (lower-case names)."""

    def __init__(self, response):
        ...


class TestClient:
    """Calls a handler like a browser would. TestClient(handle).get("/products")"""

    def __init__(self, handler):
        self.handler = handler
        self.token = None

    def request(self, method, path, json_body=None, headers=None):
        """Build {"method", "path", "headers", "body"} (body = json.dumps(json_body) when given;
        add Authorization: Bearer <token> when self.token is set), call the handler, return a Reply."""
        ...

    def get(self, path, headers=None):
        return self.request("GET", path, None, headers)

    def post(self, path, json_body=None, headers=None):
        return self.request("POST", path, json_body, headers)

    def put(self, path, json_body=None, headers=None):
        return self.request("PUT", path, json_body, headers)

    def patch(self, path, json_body=None, headers=None):
        return self.request("PATCH", path, json_body, headers)

    def delete(self, path, headers=None):
        return self.request("DELETE", path, None, headers)

    def login(self, email, password):
        """POST /auth/login; on success remember the token for later requests. Return the Reply."""
        ...


def run_tests():
    """Run every module-level function whose name starts with test_ (in definition order).
    Before each one call reset_db(). Return [{"name": ..., "passed": True/False, "error": None or text}].
    An AssertionError's message (or 'assertion failed') or "TypeName: message" of any other exception is the error."""
    ...


# TODO: write at least 6 tests, each a function named test_something() that builds a TestClient(handle):
#   create then fetch (201, Location header, GET returns the same)   | unknown product is 404
#   invalid body is 422 and creates nothing                          | duplicate sku is 409
#   anonymous write is 401, a customer's write is 403                | a failed checkout leaves stock unchanged
`,
    solutionAdd: py`class Reply:
    """A response with attribute access, so assertions read well."""

    def __init__(self, response):
        self.status = response["status"]
        self.json = response["body"]
        self.headers = {name.lower(): value for name, value in response["headers"].items()}

    @property
    def error_code(self):
        error = self.json.get("error") if isinstance(self.json, dict) else None
        return error.get("code") if isinstance(error, dict) else None


class TestClient:
    """Calls a handler like a browser would: TestClient(handle).get("/products")."""

    __test__ = False  # not a test class, in case a test runner scans this module

    def __init__(self, handler):
        self.handler = handler
        self.token = None

    def request(self, method, path, json_body=None, headers=None):
        headers = dict(headers or {})
        if self.token:
            headers.setdefault("Authorization", f"Bearer {self.token}")
        body = None if json_body is None else json.dumps(json_body)
        return Reply(self.handler({"method": method, "path": path, "headers": headers, "body": body}))

    def get(self, path, headers=None):
        return self.request("GET", path, None, headers)

    def post(self, path, json_body=None, headers=None):
        return self.request("POST", path, json_body, headers)

    def put(self, path, json_body=None, headers=None):
        return self.request("PUT", path, json_body, headers)

    def patch(self, path, json_body=None, headers=None):
        return self.request("PATCH", path, json_body, headers)

    def delete(self, path, headers=None):
        return self.request("DELETE", path, None, headers)

    def login(self, email, password):
        reply = self.request("POST", "/auth/login", {"email": email, "password": password})
        if reply.status == 200:
            self.token = reply.json["token"]
        return reply


def run_tests():
    """Run every test_* function against a fresh database and report each result."""
    results = []
    for name, function in list(globals().items()):
        if not (name.startswith("test_") and callable(function)):
            continue
        reset_db()  # fixture: every test starts from the same known state
        try:
            function()
            results.append({"name": name, "passed": True, "error": None})
        except AssertionError as exc:
            results.append({"name": name, "passed": False, "error": str(exc) or "assertion failed"})
        except Exception as exc:
            results.append({"name": name, "passed": False, "error": f"{type(exc).__name__}: {exc}"})
    reset_db()
    return results


ADMIN = ("admin@pocketstore.test", "admin-pass-123")
SAM = ("sam@example.com", "sam-pass-456")
NEW_PRODUCT = {"sku": "TST-001", "name": "Test Lamp", "category": "lighting", "price_cents": 2500}


def signed_in(account):
    client = TestClient(handle)
    assert client.login(*account).status == 200, "test setup: could not sign in"
    return client


def test_create_then_fetch_a_product():
    admin = signed_in(ADMIN)
    created = admin.post("/products", NEW_PRODUCT)
    assert created.status == 201, f"expected 201, got {created.status}"
    assert created.headers["location"] == f"/products/{created.json['id']}"
    assert TestClient(handle).get(created.headers["location"]).json == created.json


def test_unknown_product_is_404():
    reply = TestClient(handle).get("/products/9999")
    assert reply.status == 404 and reply.error_code == "not_found"


def test_invalid_product_is_422_and_stores_nothing():
    admin = signed_in(ADMIN)
    reply = admin.post("/products", {**NEW_PRODUCT, "price_cents": -5, "category": "toys"})
    assert reply.status == 422 and reply.error_code == "validation_error"
    assert {d["field"] for d in reply.json["error"]["details"]} == {"price_cents", "category"}
    assert admin.get("/products").json["total"] == 16


def test_duplicate_sku_is_409():
    admin = signed_in(ADMIN)
    reply = admin.post("/products", {**NEW_PRODUCT, "sku": "AUD-001"})
    assert reply.status == 409 and reply.error_code == "conflict"


def test_anonymous_cannot_write():
    anonymous = TestClient(handle)
    for reply in (anonymous.post("/products", NEW_PRODUCT), anonymous.delete("/products/1")):
        assert reply.status == 401, f"expected 401, got {reply.status}"
    assert anonymous.get("/products").json["total"] == 16


def test_customer_cannot_write():
    sam = signed_in(SAM)
    assert sam.post("/products", NEW_PRODUCT).status == 403
    assert sam.patch("/products/1", {"stock": 0}).status == 403
    assert sam.get("/products/1").json["stock"] == 40


def test_failed_checkout_leaves_stock_unchanged():
    sam = signed_in(SAM)
    reply = sam.post("/orders", {"items": [{"product_id": 1, "quantity": 2}, {"product_id": 9, "quantity": 1}]})
    assert reply.status == 409 and reply.error_code == "out_of_stock"
    assert sam.get("/products/1").json["stock"] == 40, "stock for item 1 should have been rolled back"
    assert sam.get("/orders").json["total"] == 0


def test_listing_is_paginated():
    page = TestClient(handle).get("/products?per_page=5&sort=-price").json
    assert (page["page"], page["per_page"], page["total"], page["pages"]) == (1, 5, 16, 4)
    assert [p["price_cents"] for p in page["items"]] == sorted((p["price_cents"] for p in page["items"]), reverse=True)`,
    explanation:
      "The client builds a request dict, calls the handler and wraps the answer in a Reply, so a test reads like a user story. run_tests rebuilds the database before every test, which is what makes them independent of each other. The suite deliberately includes the failure paths (404, 422, 409, 401, 403 and a rolled-back checkout) because those are the behaviours most likely to regress and the ones attackers probe. The checker sabotages the API in several ways to prove your suite would notice.",
    hints: [
      { id: "h1", title: "Reply", content: 'self.status = response["status"]; self.json = response["body"]; self.headers = {name.lower(): value for name, value in response["headers"].items()}' },
      { id: "h2", title: "run_tests", content: 'for name, function in list(globals().items()): keep names starting with "test_" that are callable. Call reset_db(), then try: function(); passed. except AssertionError as exc: failed with str(exc). except Exception as exc: failed with f"{type(exc).__name__}: {exc}".' },
      { id: "h3", title: "What to test", content: "Log in with client.login(...) first for admin-only calls. For each error path assert both the status and Reply.json['error']['code'] when you can, and check that nothing changed afterwards (the total of /products, a product's stock)." },
    ],
    tests: [
      {
        id: "t1",
        description: "TestClient talks to the handler and wraps replies",
        assertionCode: T(py`reset_db()
client = TestClient(handle)
r = client.get("/health")
assert isinstance(r, Reply), "client.get should return a Reply"
assert r.status == 200 and r.json == {"status": "ok"}, "reply.status and reply.json should expose the response status and body"
assert r.headers["content-type"] == "application/json", "reply.headers has lower-case header names"
r = client.request("GET", "/products?per_page=2")
assert r.status == 200 and len(r.json["items"]) == 2, "request(method, path) should work with a query string"
r = client.post("/products", {"sku": "TST-001"})
assert r.status == 401, "Without logging in, writes are 401"
assert client.get("/nope").status == 404`),
      },
      {
        id: "t2",
        description: "login() remembers the token and JSON bodies are sent",
        assertionCode: T(py`reset_db()
client = TestClient(handle)
r = client.login("sam@example.com", "wrong")
assert r.status == 401 and client.token is None, "A failed login stores no token"
r = client.login("admin@pocketstore.test", "admin-pass-123")
assert r.status == 200 and client.token, "A successful login should keep the token in client.token"
assert client.get("/me").json["role"] == "admin", "Later requests should send the bearer token automatically"
created = client.post("/products", {"sku": "TST-001", "name": "Test", "category": "desk", "price_cents": 100})
assert created.status == 201, "post(path, dict) should send the dict as a JSON body, got " + str(created.status)
assert client.put("/products/" + str(created.json["id"]), {"sku": "TST-001", "name": "Test 2", "category": "desk", "price_cents": 200}).json["name"] == "Test 2"
assert client.patch("/products/" + str(created.json["id"]), {"stock": 3}).json["stock"] == 3
assert client.delete("/products/" + str(created.json["id"])).status == 204
other = TestClient(handle)
assert other.get("/me").status == 401, "Each client has its own token"
assert other.get("/me", headers={"Authorization": "Bearer " + client.token}).status == 200, "Extra headers can be passed"`),
      },
      {
        id: "t3",
        description: "run_tests runs test_* functions on a fresh database and reports failures",
        assertionCode: T(py`calls = []

def test_zz_wipes_data():
    with get_db() as conn:
        conn.execute("DELETE FROM products")
    calls.append("wiped")

def test_zz_sees_clean_data():
    calls.append("checked")
    assert len(list_products()) == 16, "the database should have been reset before this test"

def test_zz_fails():
    assert 1 == 2, "nope, on purpose"

def test_zz_crashes():
    {}["x"]

def not_a_test_zz():
    raise RuntimeError("must not run")

results = run_tests()
by_name = {r["name"]: r for r in results}
for name in ["test_zz_wipes_data", "test_zz_sees_clean_data", "test_zz_fails", "test_zz_crashes"]:
    assert name in by_name, "run_tests() should report " + name + ". It collects functions named test_*"
assert "not_a_test_zz" not in by_name, "Functions whose names do not start with test_ must not run"
assert by_name["test_zz_wipes_data"]["passed"] is True and by_name["test_zz_sees_clean_data"]["passed"] is True, "reset_db() must run before each test so tests do not leak state: " + str(by_name["test_zz_sees_clean_data"])
assert by_name["test_zz_fails"]["passed"] is False and "nope, on purpose" in by_name["test_zz_fails"]["error"], "A failing assertion should be reported with its message"
assert by_name["test_zz_crashes"]["passed"] is False and "KeyError" in by_name["test_zz_crashes"]["error"], "Any other exception is reported as 'TypeName: message'"
assert set(by_name["test_zz_fails"]) == {"name", "passed", "error"} and by_name["test_zz_wipes_data"]["error"] is None
assert len(list_products()) == 16, "Leave a clean database behind"
for n in ["test_zz_wipes_data", "test_zz_sees_clean_data", "test_zz_fails", "test_zz_crashes", "not_a_test_zz"]:
    del globals()[n]`),
      },
      {
        id: "t4",
        description: "Your suite has at least 6 tests and they all pass",
        assertionCode: T(py`results = run_tests()
assert len(results) >= 6, "Write at least 6 test_* functions (found " + str(len(results)) + ")"
failing = [r["name"] + ": " + str(r["error"]) for r in results if not r["passed"]]
assert not failing, "These of your tests fail against the real API: " + "; ".join(failing)
assert len({r["name"] for r in results}) == len(results), "Each test needs its own unique name"`),
      },
      {
        id: "t5",
        description: "Your suite notices when anyone (or any customer) can write products",
        assertionCode: T(py`WRITES = [("POST", "/products"), ("PUT", "/products/{product_id:int}"), ("PATCH", "/products/{product_id:int}"), ("DELETE", "/products/{product_id:int}")]
assert all(r["passed"] for r in run_tests()), "Your suite must pass on the correct code first"
saved = {k: POLICY[k] for k in WRITES}
try:
    for level, story in [("public", "anonymous visitors can write products"), ("user", "any customer can write products")]:
        for k in WRITES:
            POLICY[k] = level
        failed = [r for r in run_tests() if not r["passed"]]
        assert failed, "Your suite still passes when " + story + ". Add a test that expects " + ("401 for an anonymous write" if level == "public" else "403 for a customer's write") + "."
finally:
    POLICY.update(saved)
    reset_db()`),
      },
      {
        id: "t6",
        description: "Your suite notices a missing 404 and a missing 409",
        assertionCode: T(py`assert all(r["passed"] for r in run_tests()), "Your suite must pass on the correct code first"
real_get = get_product
real_middleware = list(app.middleware)
try:
    globals()["get_product"] = lambda product_id: {"id": product_id, "sku": "FAKE-000", "name": "Fake", "description": "", "category": "desk", "price_cents": 1, "stock": 1}
    assert [r for r in run_tests() if not r["passed"]], "Your suite still passes when every id 'exists'. Add a test that expects 404 for a product that does not exist."
finally:
    globals()["get_product"] = real_get
    reset_db()
try:
    app.middleware[:] = [m for m in real_middleware if m is not integrity_middleware]
    assert [r for r in run_tests() if not r["passed"]], "Your suite still passes when duplicate SKUs are no longer turned into 409. Add a test that expects 409 for a duplicate sku."
finally:
    app.middleware[:] = real_middleware
    reset_db()`),
      },
      {
        id: "t7",
        description: "Your suite notices when validation stops working",
        assertionCode: T(py`assert all(r["passed"] for r in run_tests()), "Your suite must pass on the correct code first"
real_validate = validate_product
counter = [0]

def always_accepts(data, partial=False):
    counter[0] += 1
    if partial:
        return {"stock": 1}
    return {"sku": "MUT-%03d" % counter[0], "name": "Mutant", "description": "", "category": "desk", "price_cents": 100, "stock": 1}

try:
    globals()["validate_product"] = always_accepts
    failed = [r for r in run_tests() if not r["passed"]]
    assert failed, "Your suite still passes when validation accepts anything. Add a test that sends an invalid product and expects 422 (and that nothing was created)."
finally:
    globals()["validate_product"] = real_validate
    reset_db()`),
      },
    ],
    unlocks: ["store-tests"],
    checks: [
      {
        prompt: "Why call `handle(request)` directly in tests instead of starting a server and sending real HTTP?",
        question: {
          type: "choice",
          options: [
            "It is fast and deterministic: no ports, no network, and each test can start from a fresh database",
            "Real HTTP cannot be used with SQLite",
            "Servers always ignore test requests",
            "It tests more code than a real request does",
          ],
          answer: 0,
        },
        explanation:
          "An in-process call exercises the same routing, middleware and SQL, without startup time or flaky networking. You'd still smoke-test a deployed server, but most tests belong here.",
      },
      {
        prompt: "Your suite passes even after you delete the 401 check from the auth middleware. What does that tell you?",
        question: {
          type: "choice",
          options: [
            "No test covers the unauthenticated case, so a regression there would go unnoticed",
            "The middleware was not needed",
            "The tests are very thorough",
            "SQLite is hiding the bug",
          ],
          answer: 0,
        },
        explanation:
          "A good suite fails when the behaviour it protects breaks. Deliberately breaking code to see whether a test notices (mutation testing) finds the gaps in coverage.",
      },
      {
        prompt: "Which test is the most robust?",
        question: {
          type: "choice",
          options: [
            "`assert reply.status == 404 and reply.error_code == \"not_found\"`",
            "`assert reply.json[\"error\"][\"message\"] == \"Product 9999 does not exist\"`",
            "`assert str(reply.json) == \"{...whole body...}\"`",
            "`assert reply.status != 200`",
          ],
          answer: 0,
        },
        explanation:
          "Status and error code are the API's contract. Exact message text changes whenever someone improves the wording, and `!= 200` would pass for a crash (500) too.",
      },
    ],
  },

  // ───────────────────────────────────────── 14. ship it
  {
    id: "store-api-14-ship",
    title: "Ship it: idempotency, docs and versions",
    minutes: 40,
    xp: 240,
    concepts: ["idempotency keys", "retries", "OpenAPI", "API versioning", "rate limiting"],
    learn: `### Retries are normal, duplicates are not

A phone on a train sends "place order". The connection drops before the reply arrives. The app can't know whether the order was placed, so it retries. Or the shopper double-clicks. \`POST\` is not idempotent, so without protection you now have two orders and two charges.

The industry answer is the **idempotency key**. The client generates a unique value for each *logical* operation (a UUID) and sends it in a header:

~~~http
POST /orders
Idempotency-Key: 6f1c3a52-9b0e-4d0c-8a1c-2f0d5c4b7e11
~~~

The server remembers the first response for that key and **replays** it on every retry, without repeating the work. Rules worth copying:

- Scope the key to the caller (and route), so two users picking the same string can't collide.
- Compare a fingerprint of the body: the same key with a *different* payload is a client bug, so answer **422** instead of silently replaying the wrong thing.
- Here only successful responses are remembered, so a client can fix an error (say, remove the sold-out item) and retry.
- In production the memory is a table or Redis with a time-to-live (a day or so), and concurrent duplicates need a lock or unique insert.

### Rate limiting (a close cousin)

Another middleware: count requests per caller in a window and answer **429 Too Many Requests** with a \`Retry-After\` header when they exceed it. It protects login forms from password guessing and the server from runaway clients. A token bucket is the usual algorithm.

### Documenting the API: OpenAPI

Clients need to know what exists. **OpenAPI** is a standard JSON description of an API (paths, methods, parameters, security) that tools turn into documentation sites (Swagger UI, Redoc), client libraries and contract tests. FastAPI generates \`/openapi.json\` and an interactive \`/docs\` page automatically from your routes and type hints; Flask uses extensions like apispec or flask-smorest; Django REST Framework has drf-spectacular.

You already hold everything needed: the route table, the path patterns, the docstrings and the security policy. A generator walks the routes and builds the document, so the documentation **cannot drift** from the code:

~~~python
{"openapi": "3.0.3",
 "info": {"title": "Pocket Store API", "version": "1"},
 "paths": {"/products/{product_id}": {"get": {"summary": "Fetch one product by id",
           "parameters": [{"name": "product_id", "in": "path", "required": True, "schema": {"type": "integer"}}]}}}}
~~~

Note OpenAPI writes \`{product_id}\`, without our \`:int\` suffix. The type goes into the parameter's schema instead.

### Versioning: planning for change

Once other people depend on your API, changes can break them. **Safe (additive) changes**: a new endpoint, a new optional field in a response, a new optional query parameter. **Breaking changes**: removing or renaming a field, changing a type or the meaning of a value, making a parameter required, changing a status code.

Strategies: a URL prefix (\`/v1/products\`, the most visible), a header (\`Accept-Version\`, or a media type), or per-account pinning. Whichever you choose: keep old versions alive for a announced period, mark them with \`Deprecation\` and \`Sunset\` headers, and keep **error codes** stable because clients branch on them. Here every response carries an \`API-Version\` header, including errors, which means the middleware has to be the *outermost* layer.

### Middleware order matters

You now have five layers. The order is a design decision: version stamping outermost (it must see everything), then error handling, constraint translation, authentication, and idempotency innermost (it needs the user that authentication found).

### Common mistakes

- Idempotency keys shared between users, or never expiring.
- Replaying a stored response when the request body is different.
- Docs written by hand, which are stale within a month.
- Renaming a response field "because it's nicer" without a version.`,
    mission: `The API works, now make it production-minded. Stop duplicate orders on network retries, publish a machine-readable description of every endpoint, and stamp every response with its API version.

The storefront checkout sends an Idempotency-Key and gets a button to simulate a double-click, and a **Docs** tab lists every endpoint your router knows about.`,
    tasks: [
      "idempotency_middleware: for POST requests with an Idempotency-Key header, replay the saved 2xx response (header Idempotent-Replayed: true); same key with a different body is a 422; scoped per user and route; cleared by reset_db; register it last (after auth)",
      "build_openapi(app) and GET /openapi.json (public): paths without :int, path parameters with a type, summary from the docstring, bearer security for non-public routes",
      "version_middleware: API-Version: 1 on every response, even errors and 404s; insert it as the outermost layer",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: idempotency, documentation and versions.
import copy

API_VERSION = "1"
IDEMPOTENCY_CACHE = {}  # (user id, route, key) -> {"fingerprint": ..., "response": ...}


@on_reset
def clear_idempotency_cache(conn):
    """A reset starts with no remembered keys."""
    ...


def request_fingerprint(request):
    """A stable text for the request body: parse JSON text, then json.dumps(..., sort_keys=True)."""
    ...


def idempotency_middleware(request, call_next):
    """Only for POST with an 'idempotency-key' header (others just continue).
    Known scope + same fingerprint -> deep copy of the saved response plus header Idempotent-Replayed: true.
    Known scope + different fingerprint -> ApiError(422, "idempotency_key_reuse", ...).
    New -> call_next, and remember the response only if its status is 2xx."""
    ...


# TODO: register idempotency_middleware with app.use (after auth_middleware: it needs request["user"])


def openapi_path(pattern):
    """'/products/{product_id:int}' -> '/products/{product_id}'"""
    ...


def build_openapi(application):
    """An OpenAPI 3 dict: {"openapi": "3.0.3", "info": {"title", "version": API_VERSION}, "paths": {...},
    "components": {"securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}}}}.
    Each operation: summary (first line of the handler docstring, else the function name), operationId,
    parameters (path params: name, in "path", required, schema integer for :int else string), responses,
    and "security": [{"bearerAuth": []}] unless POLICY says public."""
    ...


@app.get("/openapi.json")
def openapi_document(request):
    """The machine-readable description of this API (OpenAPI 3)."""
    ...


# TODO: make GET /openapi.json public in POLICY


def version_middleware(request, call_next):
    """Add the header API-Version to whatever response comes back."""
    ...


# TODO: put version_middleware at the front of app.middleware so it is the outermost layer
`,
    solutionAdd: py`import copy

API_VERSION = "1"
IDEMPOTENCY_CACHE = {}  # (user id, route, key) -> {"fingerprint": ..., "response": ...}


@on_reset
def clear_idempotency_cache(conn):
    IDEMPOTENCY_CACHE.clear()


def request_fingerprint(request):
    body = request.get("body")
    if isinstance(body, (str, bytes)):
        try:
            body = json.loads(body)
        except ValueError:
            pass  # not JSON: compare the raw text
    return json.dumps(body, sort_keys=True, default=str)


def idempotency_middleware(request, call_next):
    """Replay the first response when a client retries a POST with the same Idempotency-Key."""
    key = request["headers"].get("idempotency-key")
    if request["method"] != "POST" or not key:
        return call_next(request)
    user = request["user"]
    scope = (user["id"] if user else None, request["route"], key)
    fingerprint = request_fingerprint(request)
    saved = IDEMPOTENCY_CACHE.get(scope)
    if saved:
        if saved["fingerprint"] != fingerprint:
            raise ApiError(422, "idempotency_key_reuse", "This Idempotency-Key was already used with a different request body.")
        replay = copy.deepcopy(saved["response"])
        replay["headers"]["Idempotent-Replayed"] = "true"
        return replay
    response = call_next(request)
    if 200 <= response["status"] < 300:  # failures are not remembered, so the client can fix and retry
        IDEMPOTENCY_CACHE[scope] = {"fingerprint": fingerprint, "response": copy.deepcopy(response)}
    return response


app.use(idempotency_middleware)


def openapi_path(pattern):
    return re.sub(r"\{(\w+):\w+\}", r"{\1}", pattern)


def build_openapi(application):
    """Describe every registered route. The docs are generated, so they cannot drift from the code."""
    paths = {}
    for route in application.routes:
        handler = route["handler"]
        lines = (handler.__doc__ or "").strip().splitlines()
        operation = {
            "summary": lines[0].strip() if lines else handler.__name__.replace("_", " "),
            "operationId": handler.__name__,
            "parameters": [
                {"name": name, "in": "path", "required": True, "schema": {"type": "integer" if kind == "int" else "string"}}
                for name, kind in re.findall(r"\{(\w+)(?::(\w+))?\}", route["pattern"])
            ],
            "responses": {"200": {"description": "Success"}},
        }
        if POLICY.get((route["method"], route["pattern"]), "admin") != "public":
            operation["security"] = [{"bearerAuth": []}]
        paths.setdefault(openapi_path(route["pattern"]), {})[route["method"].lower()] = operation
    return {
        "openapi": "3.0.3",
        "info": {"title": "Pocket Store API", "version": API_VERSION},
        "paths": paths,
        "components": {"securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer"}}},
    }


@app.get("/openapi.json")
def openapi_document(request):
    """The machine-readable description of this API (OpenAPI 3)."""
    return json_response(200, build_openapi(app))


POLICY[("GET", "/openapi.json")] = "public"


def version_middleware(request, call_next):
    """Stamp every response with the API version, including errors and 404s."""
    response = call_next(request)
    response["headers"]["API-Version"] = API_VERSION
    return response


app.middleware.insert(0, version_middleware)  # outermost: it must see the error responses too`,
    explanation:
      "The idempotency middleware keys on who is calling, which route and the client's key, and stores a fingerprint of the body: a retry replays the first answer without touching the database, while the same key with a different body is rejected as a client bug. build_openapi walks the same route table the router uses, so documentation is generated from the code. version_middleware has to be outermost to see the error responses, which is why it is inserted at position 0 instead of appended.",
    hints: [
      { id: "h1", title: "Idempotency scope", content: 'scope = (user["id"] if user else None, request["route"], key). Look it up in IDEMPOTENCY_CACHE. Found with the same fingerprint: copy.deepcopy(saved["response"]) and add the header. Not found: response = call_next(request), then store a deepcopy if 200 <= response["status"] < 300.' },
      { id: "h2", title: "OpenAPI", content: 'Loop over application.routes. For every pattern find parameters with re.findall(r"\\{(\\w+)(?::(\\w+))?\\}", pattern). Collect operations into paths.setdefault(openapi_path(pattern), {})[method.lower()] = operation.' },
      { id: "h3", title: "Order", content: "app.use appends (innermost). app.middleware.insert(0, version_middleware) puts it first, so it wraps everything, including errors_middleware." },
    ],
    tests: [
      {
        id: "t1",
        description: "A retried POST with the same key replays the first response",
        assertionCode: T(py`reset_db()
sam = _sam()
cart = {"items": [{"product_id": 1, "quantity": 1}]}
first = _c("POST", "/orders", cart, token=sam, headers={"Idempotency-Key": "k-1"})
again = _c("POST", "/orders", cart, token=sam, headers={"Idempotency-Key": "k-1"})
assert first["status"] == 201 and again["status"] == 201, "Both attempts should answer 201, got " + str(first["status"]) + " and " + str(again["status"])
assert again["body"] == first["body"], "The retry must get the very same order back"
assert _hdr(again, "Idempotent-Replayed") == "true", "A replayed response carries Idempotent-Replayed: true"
assert _hdr(first, "Idempotent-Replayed") is None, "The first response is not a replay"
assert _c("GET", "/products/1")["body"]["stock"] == 39, "The stock must only drop once"
assert get_db().execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 1, "Only one order may exist"`),
      },
      {
        id: "t2",
        description: "Different or missing keys make separate orders",
        assertionCode: T(py`reset_db()
sam = _sam()
cart = {"items": [{"product_id": 1, "quantity": 1}]}
a = _c("POST", "/orders", cart, token=sam, headers={"Idempotency-Key": "k-1"})
b = _c("POST", "/orders", cart, token=sam, headers={"Idempotency-Key": "k-2"})
c = _c("POST", "/orders", cart, token=sam)
d = _c("POST", "/orders", cart, token=sam)
ids = [a["body"]["id"], b["body"]["id"], c["body"]["id"], d["body"]["id"]]
assert len(set(ids)) == 4, "New keys, and requests without a key, are never replayed. Got ids " + str(ids)`),
      },
      {
        id: "t3",
        description: "Reusing a key with a different body is a 422",
        assertionCode: T(py`reset_db()
sam = _sam()
_c("POST", "/orders", {"items": [{"product_id": 1, "quantity": 1}]}, token=sam, headers={"Idempotency-Key": "k-1"})
r = _c("POST", "/orders", {"items": [{"product_id": 2, "quantity": 5}]}, token=sam, headers={"Idempotency-Key": "k-1"})
assert r["status"] == 422 and _code(r) == "idempotency_key_reuse", "Same key, different body: 422 idempotency_key_reuse, got " + str(r["status"])
assert get_db().execute("SELECT COUNT(*) FROM orders").fetchone()[0] == 1, "...and nothing new is created"
r = _c("POST", "/orders", '{"items": [{"quantity": 1, "product_id": 1}]}', token=sam, headers={"Idempotency-Key": "k-1"})
assert r["status"] == 201 and _hdr(r, "Idempotent-Replayed") == "true", "The same body with different key order / spacing is still the same request"`),
      },
      {
        id: "t4",
        description: "Keys are per user, failures are not remembered, reset clears them",
        assertionCode: T(py`reset_db()
sam, admin = _sam(), _admin()
cart = {"items": [{"product_id": 1, "quantity": 1}]}
s = _c("POST", "/orders", cart, token=sam, headers={"Idempotency-Key": "shared"})
a = _c("POST", "/orders", cart, token=admin, headers={"Idempotency-Key": "shared"})
assert a["body"]["id"] != s["body"]["id"] and _hdr(a, "Idempotent-Replayed") is None, "The same key from a different user must not replay someone else's order"
bad = _c("POST", "/orders", {"items": [{"product_id": 9, "quantity": 1}]}, token=sam, headers={"Idempotency-Key": "k-fail"})
assert bad["status"] == 409
fixed = _c("POST", "/orders", cart, token=sam, headers={"Idempotency-Key": "k-fail"})
assert fixed["status"] == 201 and _hdr(fixed, "Idempotent-Replayed") is None, "Only successful responses are remembered, so a client can fix the request and retry with the same key"
reset_db()
sam = _sam()
fresh = _c("POST", "/orders", cart, token=sam, headers={"Idempotency-Key": "shared"})
assert fresh["status"] == 201 and _hdr(fresh, "Idempotent-Replayed") is None, "reset_db() must clear the remembered keys"
assert idempotency_middleware in app.middleware and app.middleware.index(auth_middleware) < app.middleware.index(idempotency_middleware), "Register idempotency_middleware after auth_middleware"`),
      },
      {
        id: "t5",
        description: "GET /openapi.json describes the API",
        assertionCode: T(py`reset_db()
r = _c("GET", "/openapi.json")
assert r["status"] == 200, "GET /openapi.json should be public and return 200, got " + str(r["status"])
doc = r["body"]
assert doc["openapi"].startswith("3."), "openapi should be a 3.x version string"
assert doc["info"]["title"] and doc["info"]["version"] == "1"
paths = doc["paths"]
assert set(paths["/products"]) == {"get", "post"}, "/products has GET and POST, got " + str(sorted(paths.get("/products", {})))
assert set(paths["/products/{product_id}"]) == {"get", "put", "patch", "delete"}, "Path templates drop the ':int' suffix: /products/{product_id}"
import json
assert ":int" not in json.dumps(doc), "No ':int' may appear in the document"
param = paths["/products/{product_id}"]["get"]["parameters"][0]
assert param == {"name": "product_id", "in": "path", "required": True, "schema": {"type": "integer"}}, "Path parameters need name, in, required and a schema, got " + str(param)
assert "/orders" in paths and "/orders/{order_id}" in paths and "/openapi.json" in paths`),
      },
      {
        id: "t6",
        description: "Summaries come from docstrings; security from the policy",
        assertionCode: T(py`a = App()

@a.get("/things/{thing_id:int}/notes/{slug}")
def show_note(request):
    """Fetch one note.

    Longer text that should not become the summary."""
    return json_response(200, {})

@a.post("/things")
def undocumented_thing(request):
    return json_response(201, {})

doc = build_openapi(a)
op = doc["paths"]["/things/{thing_id}/notes/{slug}"]["get"]
assert op["summary"] == "Fetch one note.", "summary is the first line of the docstring, got " + repr(op["summary"])
assert [(p["name"], p["schema"]["type"]) for p in op["parameters"]] == [("thing_id", "integer"), ("slug", "string")], "int parameters are integers, the rest strings"
assert doc["paths"]["/things"]["post"]["summary"], "A handler without a docstring still gets a summary (use its function name)"
assert doc["paths"]["/things"]["post"]["operationId"] == "undocumented_thing"
full = _c("GET", "/openapi.json")["body"]["paths"]
assert "security" not in full["/products"]["get"], "Public routes need no security entry"
assert full["/products"]["post"]["security"] == [{"bearerAuth": []}], "Protected routes list the bearerAuth scheme"
assert full["/orders"]["get"]["security"] == [{"bearerAuth": []}]
assert "bearerAuth" in _c("GET", "/openapi.json")["body"]["components"]["securitySchemes"]`),
      },
      {
        id: "t7",
        description: "Every response, even errors, carries API-Version",
        assertionCode: T(py`reset_db()
checks = [
    _c("GET", "/health"),
    _c("GET", "/nope"),
    _c("PUT", "/health"),
    _c("POST", "/products", {"sku": "x"}),
    _c("POST", "/products", {"sku": "x"}, token=_sam()),
    _c("POST", "/products", {"sku": "x"}, token=_admin()),
    _c("GET", "/products/9999"),
]
assert [r["status"] for r in checks] == [200, 404, 405, 401, 403, 422, 404], "Unexpected statuses: " + str([r["status"] for r in checks])
for r in checks:
    assert _hdr(r, "API-Version") == "1", "A " + str(r["status"]) + " response is missing the header API-Version: 1"
assert app.middleware[0] is version_middleware, "Insert version_middleware at position 0 so it is the outermost layer"
assert app.middleware.index(version_middleware) < app.middleware.index(errors_middleware)`),
      },
    ],
    unlocks: ["store-ship"],
    checks: [
      {
        prompt: "A mobile app retries `POST /orders` after a timeout. How does an idempotency key stop a double order?",
        question: {
          type: "choice",
          options: [
            "The server remembers the first result for that key and replays it instead of creating another order",
            "The server blocks the client's IP address for a minute",
            "The database refuses two orders from the same user",
            "The client must wait for the reply before sending anything else",
          ],
          answer: 0,
        },
        explanation:
          "The key identifies the *intent*, not the request. Any number of retries with the same key give the same result, which is how payment APIs stay safe over unreliable networks.",
      },
      {
        prompt: "Which of these is a **breaking** change to a published API?",
        question: {
          type: "choice",
          options: [
            "Renaming the response field `price_cents` to `price`",
            "Adding a new optional response field `weight_grams`",
            "Adding a new endpoint `GET /categories`",
            "Adding an optional query parameter `in_stock`",
          ],
          answer: 0,
        },
        explanation:
          "Existing clients read `price_cents`; renaming it breaks them. Additive changes (new endpoint, new optional field or parameter) are safe because well-behaved clients ignore what they don't know. Breaking changes need a new version or a long deprecation period.",
      },
      {
        prompt: "Why is `version_middleware` inserted at position 0 instead of added with `app.use`?",
        question: {
          type: "choice",
          options: [
            "Only the outermost layer sees the error responses that errors_middleware builds",
            "Position 0 makes the middleware run faster",
            "app.use cannot add headers",
            "Middleware must always be first alphabetically",
          ],
          answer: 0,
        },
        explanation:
          "Layers further in only see what the layers outside them let through. Errors are turned into responses by `errors_middleware`; a layer inside it never sees those. Putting the version stamp outside makes it universal.",
      },
    ],
  },
];
