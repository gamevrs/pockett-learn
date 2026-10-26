import type { Lesson } from "@/engine/types";
import { py, T, PRODUCTS_SEED } from "./shared.ts";

/** Chapter 2: The catalogue. A real SQLite database, read endpoints, safe search, paging. */
export const chapter2: Lesson[] = [
  // ───────────────────────────────────────── 4. sqlite
  {
    id: "store-api-4-sqlite",
    title: "The shop database",
    minutes: 30,
    xp: 140,
    concepts: ["sqlite3", "schema design", "constraints", "placeholders", "row_factory", "transactions"],
    learn: `### Why a database?

Variables vanish when the program stops, cannot be searched efficiently and cannot defend their own rules. A database stores data durably, answers questions fast and **enforces constraints** no matter which code path wrote the data. Python ships with **SQLite**, a complete SQL database in one library, in the \`sqlite3\` module. Here we use an in-memory database (\`":memory:"\`), which behaves like a file database but starts empty each time.

### Connect, execute, fetch

~~~python
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
conn.execute("INSERT INTO tags (name) VALUES (?)", ("sale",))
cursor = conn.execute("SELECT id, name FROM tags WHERE name = ?", ("sale",))
cursor.fetchone()      # (1, 'sale')  or None when nothing matches
cursor.fetchall()      # a list of rows
~~~

### Rows you can read by name

By default rows are plain tuples. Set \`conn.row_factory = sqlite3.Row\` and a row works like a read-only mapping: \`row["name"]\`. \`dict(row)\` turns it into a normal dict, which is **JSON-able**, so it can go straight into a response body. (A \`sqlite3.Row\` itself cannot be serialised.)

### Placeholders: values travel separately

The \`?\` marks a hole for a value, and the value goes in a tuple. The driver sends the SQL text and the values separately, so a value can never be mistaken for SQL. This is how you stay safe from SQL injection (you will attack a vulnerable version in lesson 6). Never build SQL by gluing values in with f-strings.

~~~python
conn.execute("SELECT * FROM tags WHERE id = ?", (7,))    # a tuple of one value needs the comma
conn.execute("SELECT * FROM tags WHERE id = ?", (7))     # wrong: (7) is just the number 7
~~~

Placeholders carry **values**. They cannot stand in for a table or column name; that comes up again when we add sorting.

### Transactions

Python opens a transaction when you run an INSERT, UPDATE or DELETE, and the change is not permanent until \`conn.commit()\`. The tidy way is a \`with\` block on the connection:

~~~python
with conn:
    conn.execute("INSERT INTO tags (name) VALUES (?)", ("new",))
    conn.execute("INSERT INTO tags (name) VALUES (?)", (None,))   # NOT NULL fails
# the block hit an exception, so BOTH inserts were rolled back
~~~

\`with conn\` commits if the block finishes and **rolls back** if it raises. It does not close the connection.

### Constraints: the database as last line of defence

- \`PRIMARY KEY\`, \`NOT NULL\`, \`UNIQUE\` (no two products share a SKU), \`CHECK (price_cents >= 0)\` and \`FOREIGN KEY ... REFERENCES\` (an order item must point at a real product).
- A violation raises \`sqlite3.IntegrityError\`. Later you will map those onto HTTP: a duplicate SKU is a **409**, a rule broken by the data is a **422**.
- SQLite ships with foreign keys **off**. Run \`PRAGMA foreign_keys = ON\` on every new connection, before any transaction.

### Money is whole numbers

Store prices as integer **cents**. Floats cannot represent 0.1 exactly, and \`0.1 + 0.2\` is \`0.30000000000000004\`. The API sends \`price_cents\` and the client formats it.

### The plan for this database

You will grow it in steps: \`products\` now, \`users\` and \`tokens\` for authentication, \`orders\` and \`order_items\` for checkout. Each step is a function registered with \`@on_reset\`, so \`reset_db()\` can rebuild the whole thing from nothing in the same order. A reproducible database is what makes tests and demos reliable.

### Frameworks and ORMs

Django's ORM and SQLAlchemy generate this SQL for you and take care of placeholders, connection handling and migrations. You still need to understand what happens underneath: transactions, constraints, and what an N+1 query is.

### Common mistakes

- Forgetting \`commit\` (or the \`with conn\` block) so writes vanish.
- \`(id)\` instead of \`(id,)\` for a single parameter.
- Building SQL with f-strings.
- Leaving foreign keys off and wondering why bad references are accepted.`,
    mission: `A shop needs somewhere to keep its stock. Build the database layer: a connection factory, the products table with real constraints, a seed catalogue of 16 products, and the first two queries.

When you Run, the **Database** tab shows your table. The demo can rebuild everything from scratch with your \`reset_db()\`.`,
    tasks: [
      "on_reset() collects rebuild steps; connect() returns an in-memory connection with Row access and foreign keys ON",
      "create_product_schema(): products with id, sku (unique), name, description, category, price_cents (>= 0), stock (>= 0)",
      "seed_products(): insert PRODUCTS_SEED with executemany inside a transaction",
      "reset_db(), get_db() (connects lazily), list_products() and get_product(product_id), both returning plain dicts and using placeholders",
    ],
    starterAdd: `# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: the shop database.
import sqlite3

${PRODUCTS_SEED}

RESET_STEPS = []  # functions that build the database; reset_db() runs them in order
db = None  # the current connection (reset_db replaces it)


def on_reset(step):
    """Decorator: remember a function that (re)builds one slice of the database. Return it unchanged."""
    ...


def connect():
    """A new in-memory connection: rows as sqlite3.Row, and PRAGMA foreign_keys = ON."""
    ...


@on_reset
def create_product_schema(conn):
    """CREATE TABLE products:
    id INTEGER PRIMARY KEY, sku TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)"""
    ...


@on_reset
def seed_products(conn):
    """Insert every PRODUCTS_SEED row (executemany, with ? placeholders) in one transaction."""
    ...


def reset_db():
    """Start from nothing: new connection into the global db, run every reset step, return it."""
    ...


def get_db():
    """The current connection. If there is none yet, call reset_db() first."""
    ...


def list_products():
    """Every product as a list of dicts, ordered by id."""
    ...


def get_product(product_id):
    """One product as a dict, or None. Use a ? placeholder."""
    ...
`,
    solutionAdd: `import sqlite3

${PRODUCTS_SEED}

RESET_STEPS = []  # functions that build the database; reset_db() runs them in order
db = None  # the current connection (reset_db replaces it)


def on_reset(step):
    """Decorator: remember a function that (re)builds one slice of the database."""
    RESET_STEPS.append(step)
    return step


def connect():
    """A new in-memory connection with named columns and enforced foreign keys."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@on_reset
def create_product_schema(conn):
    conn.execute(
        """
        CREATE TABLE products (
            id          INTEGER PRIMARY KEY,
            sku         TEXT    NOT NULL UNIQUE,
            name        TEXT    NOT NULL,
            description TEXT    NOT NULL DEFAULT '',
            category    TEXT    NOT NULL,
            price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
            stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
        )
        """
    )


@on_reset
def seed_products(conn):
    with conn:
        conn.executemany(
            "INSERT INTO products (sku, name, description, category, price_cents, stock) VALUES (?, ?, ?, ?, ?, ?)",
            PRODUCTS_SEED,
        )


def reset_db():
    """Rebuild the whole database from scratch (used by tests and the demo's reset button)."""
    global db
    db = connect()
    for step in RESET_STEPS:
        step(db)
    return db


def get_db():
    """The current connection, created on first use."""
    if db is None:
        reset_db()
    return db


def list_products():
    rows = get_db().execute("SELECT * FROM products ORDER BY id")
    return [dict(row) for row in rows]


def get_product(product_id):
    row = get_db().execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    return dict(row) if row else None`,
    explanation:
      "connect() is the one place that decides how every connection behaves: named columns and enforced foreign keys. The schema carries the rules (UNIQUE sku, non-negative price and stock), so even a buggy handler cannot store a negative price. get_product binds the id as a parameter, so a value like '1 OR 1=1' is just a value that matches nothing. reset_db() replays the registered steps in order, which is what lets later lessons add users and orders without touching this code.",
    hints: [
      { id: "h1", title: "Connection setup", content: 'conn = sqlite3.connect(":memory:"); conn.row_factory = sqlite3.Row; conn.execute("PRAGMA foreign_keys = ON"); return conn' },
      { id: "h2", title: "reset_db and get_db", content: "reset_db: `global db`, then db = connect(), then `for step in RESET_STEPS: step(db)`, then return db. get_db: if db is None: reset_db(); return db." },
      { id: "h3", title: "Queries", content: 'get_db().execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone() gives a Row or None. Convert with dict(row). For the list: [dict(row) for row in get_db().execute("SELECT * FROM products ORDER BY id")].' },
    ],
    tests: [
      {
        id: "t1",
        description: "reset_db builds and seeds the products table",
        assertionCode: T(py`reset_db()
rows = list_products()
assert isinstance(rows, list) and len(rows) == 16, "After reset_db(), list_products() should return the 16 seeded products, got " + str(len(rows))
assert isinstance(rows[0], dict), "Return plain dicts (use dict(row)), not sqlite3.Row objects"
assert rows[0]["sku"] == "AUD-001" and rows[0]["price_cents"] == 5900 and rows[0]["stock"] == 40, "The first product should be AUD-001 priced 5900 cents with 40 in stock"
assert [r["id"] for r in rows] == list(range(1, 17)), "Products should be ordered by id (1 to 16)"
assert set(rows[0]) == {"id", "sku", "name", "description", "category", "price_cents", "stock"}, "Each product dict should have exactly the table's seven columns"`),
      },
      {
        id: "t2",
        description: "get_product returns a dict, or None when missing",
        assertionCode: T(py`reset_db()
p = get_product(2)
assert p is not None and p["name"] == "Pocket Speaker", "get_product(2) should return the Pocket Speaker"
assert isinstance(p, dict), "get_product should return a dict"
assert get_product(9999) is None, "get_product of an id that does not exist should return None"`),
      },
      {
        id: "t3",
        description: "Connections use Row access and enforce foreign keys",
        assertionCode: T(py`import sqlite3
reset_db()
row = get_db().execute("SELECT 1 AS n").fetchone()
assert isinstance(row, sqlite3.Row), "Set conn.row_factory = sqlite3.Row in connect()"
assert row["n"] == 1
assert get_db().execute("PRAGMA foreign_keys").fetchone()[0] == 1, "Run PRAGMA foreign_keys = ON in connect(), before anything else"`),
      },
      {
        id: "t4",
        description: "Constraints reject duplicate SKUs, negative prices and missing names",
        assertionCode: T(py`import sqlite3
reset_db()
conn = get_db()
insert = "INSERT INTO products (sku, name, category, price_cents) VALUES (?, ?, ?, ?)"
for args, why in [
    (("AUD-001", "Dup", "audio", 100), "a duplicate sku (make sku UNIQUE)"),
    (("NEW-001", "Cheap", "audio", -5), "a negative price (add CHECK (price_cents >= 0))"),
    (("NEW-002", None, "audio", 100), "a missing name (make name NOT NULL)"),
]:
    try:
        conn.execute(insert, args)
    except sqlite3.IntegrityError:
        continue
    assert False, "The database should reject " + why
conn.rollback()
try:
    conn.execute("INSERT INTO products (sku, name, category, price_cents, stock) VALUES ('NEW-003', 'X', 'audio', 100, -1)")
    assert False, "The database should reject negative stock (add CHECK (stock >= 0))"
except sqlite3.IntegrityError:
    pass`),
      },
      {
        id: "t5",
        description: "reset_db starts again from a clean, seeded database",
        assertionCode: T(py`reset_db()
with get_db() as conn:
    conn.execute("DELETE FROM products")
assert list_products() == [], "(setup) the table should be empty after the delete"
reset_db()
assert len(list_products()) == 16, "reset_db() should rebuild a fresh database with 16 products"
first = get_db()
reset_db()
assert get_db() is not first, "reset_db() should create a new connection each time"
assert RESET_STEPS and all(callable(s) for s in RESET_STEPS), "Register your schema and seed functions with @on_reset"`),
      },
      {
        id: "t6",
        description: "Lookups use placeholders, so odd input is just a value",
        assertionCode: T(py`reset_db()
assert get_product("1 OR 1=1") is None, "get_product('1 OR 1=1') must not match anything: bind the id with a ? placeholder"
assert get_product("1; DROP TABLE products") is None
assert len(list_products()) == 16, "The table must still be intact"`),
      },
      {
        id: "t7",
        description: "get_db connects lazily",
        assertionCode: T(py`db = None
assert len(list_products()) == 16, "With no connection yet, get_db() should call reset_db() for you"
assert get_db() is db, "get_db() should return the global connection"`),
      },
    ],
    unlocks: ["store-db"],
    checks: [
      {
        prompt: "Which call safely looks up a product by an id that came from a request?",
        question: {
          type: "choice",
          options: [
            "`conn.execute(\"SELECT * FROM products WHERE id = ?\", (product_id,))`",
            "`conn.execute(f\"SELECT * FROM products WHERE id = {product_id}\")`",
            "`conn.execute(\"SELECT * FROM products WHERE id = \" + str(product_id))`",
            "`conn.execute(\"SELECT * FROM products WHERE id = ?\", (product_id))`",
          ],
          answer: 0,
        },
        explanation:
          "Only the first keeps the value separate from the SQL text. The f-string and the concatenation build SQL out of user input. The last one forgets the comma, so `(product_id)` is not a tuple.",
      },
      {
        prompt: "Inside `with conn:`, the second INSERT raises `IntegrityError`. What happens to the first INSERT?",
        question: {
          type: "choice",
          options: [
            "It is rolled back together with the second one",
            "It stays committed",
            "It is committed only if it came first",
            "It stays pending until you call commit()",
          ],
          answer: 0,
        },
        explanation:
          "A transaction is all-or-nothing. When the `with` block exits through an exception, the connection rolls back everything done inside it. You rely on this for orders later.",
      },
      {
        prompt: "Why store `price_cents` as an integer instead of a float price like `19.99`?",
        question: {
          type: "choice",
          options: [
            "Floats cannot represent most decimals exactly, so sums drift",
            "Integers are faster to type",
            "SQLite has no float type",
            "JSON cannot carry floats",
          ],
          answer: 0,
        },
        explanation:
          "Binary floats store 0.1 only approximately, which is how `0.1 + 0.2` becomes `0.30000000000000004`. Whole cents add up exactly. Format as dollars only at the edge.",
      },
    ],
  },

  // ───────────────────────────────────────── 5. read routes
  {
    id: "store-api-5-read",
    title: "Read the catalogue",
    minutes: 20,
    xp: 100,
    concepts: ["resources", "GET", "path parameters", "404", "response envelopes"],
    learn: `### Collections and members

The two read endpoints of almost every REST API are:

~~~http
GET /products          the collection: a list
GET /products/3        one member, addressed by id
~~~

Use **plural nouns**, keep ids in the path (they identify the resource), and leave verbs to the HTTP method. A good URL is stable, readable and says nothing about your database layout or implementation language.

### Show the resource, not the table row

What you return is a **representation**: a JSON document you choose to publish. Today it matches the products row, but keep the distinction in mind. Later the \`users\` table will have a \`password_hash\`, and that must never reach a response. The rule: build responses from fields you chose to expose.

### Wrap lists in an object

Return \`{"items": [...], "total": 16}\`, not a bare list \`[...]\`. An object can grow (paging info, links, warnings) without breaking clients. A bare array cannot.

### Empty is not missing

\`GET /products\` on an empty shop is a perfectly good **200** with \`"items": []\`. A **404** is for a *specific* resource that does not exist: \`GET /products/9999\`. Mixing those up forces clients to special-case empty results.

### The not-found path

Here the error handling you built pays off. The handler does not build a 404 response; it **raises** \`ApiError(404, ...)\` and the middleware answers. Give the message the id so a human reading a log knows which one.

~~~python
product = get_product(product_id)
if product is None:
    raise ApiError(404, "not_found", f"Product {product_id} does not exist")
~~~

### Mapping to frameworks

~~~python
# Flask
@app.get("/products/<int:product_id>")
def show(product_id):
    product = get_product(product_id) or abort(404)
    return jsonify(product)

# FastAPI
@app.get("/products/{product_id}")
def show(product_id: int):
    product = get_product(product_id)
    if product is None:
        raise HTTPException(404, "not found")
    return product
~~~

### Common mistakes

- Returning \`200\` with \`null\` for a missing product.
- Returning \`404\` for an empty list.
- Forgetting that path parameters are converted by the router: \`product_id\` is already an \`int\` here.
- Verbs in URLs: \`/getProducts\`, \`/products/delete/3\`.`,
    mission: `The Database tab proves your SQL works, but a shop front cannot read it. Expose the catalogue over HTTP: list all products and fetch a single one.

When these two routes work, the **storefront** wakes up: a product grid fed by \`GET /products\`, and a product page for each item you click.`,
    tasks: [
      "GET /products returns 200 with {\"items\": [...], \"total\": n}",
      "GET /products/{product_id:int} returns the product",
      "A missing id raises ApiError(404, \"not_found\", ...) with the id in the message",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: read the catalogue over HTTP.


@app.get("/products")
def index_products(request):
    """List every product as {"items": [...], "total": n}."""
    ...


@app.get("/products/{product_id:int}")
def show_product(request):
    """One product, or ApiError 404 with code "not_found" when the id does not exist."""
    ...
`,
    solutionAdd: py`@app.get("/products")
def index_products(request):
    """List the catalogue."""
    items = list_products()
    return json_response(200, {"items": items, "total": len(items)})


@app.get("/products/{product_id:int}")
def show_product(request):
    """Fetch one product by id."""
    product_id = request["params"]["product_id"]
    product = get_product(product_id)
    if product is None:
        raise ApiError(404, "not_found", f"Product {product_id} does not exist")
    return json_response(200, product)`,
    explanation:
      "The router already extracted and converted product_id, so the handler is two lines of logic: ask the data layer, and raise ApiError if nothing came back. The error middleware from lesson 3 turns that into the shared error shape. The list is wrapped in an object so metadata can be added later without breaking any client.",
    hints: [
      { id: "h1", title: "List", content: 'items = list_products() then return json_response(200, {"items": items, "total": len(items)}).' },
      { id: "h2", title: "Where the id is", content: 'The router puts converted path parameters in request["params"], so request["params"]["product_id"] is an int.' },
      { id: "h3", title: "Not found", content: 'if product is None: raise ApiError(404, "not_found", f"Product {product_id} does not exist")' },
    ],
    tests: [
      {
        id: "t1",
        description: "GET /products lists everything in an envelope",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products")
assert r["status"] == 200, "GET /products should return 200, got " + str(r["status"])
assert isinstance(r["body"], dict) and "items" in r["body"], 'Wrap the list: {"items": [...], "total": n}'
assert len(r["body"]["items"]) == 16 and r["body"]["total"] == 16, "All 16 seeded products should be listed, with total 16"
assert _hdr(r, "Content-Type") == "application/json"
assert r["body"]["items"][0]["sku"] == "AUD-001" and type(r["body"]["items"][0]["price_cents"]) is int`),
      },
      {
        id: "t2",
        description: "GET /products/{id} returns that product",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products/4")
assert r["status"] == 200, "GET /products/4 should return 200, got " + str(r["status"])
assert r["body"]["sku"] == "DSK-001" and r["body"]["name"] == "Walnut Laptop Stand", "Product 4 is the Walnut Laptop Stand"
assert r["body"]["id"] == 4`),
      },
      {
        id: "t3",
        description: "A missing product is a 404 with the id in the message",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products/9999")
assert r["status"] == 404, "A product that does not exist should return 404, got " + str(r["status"])
assert _code(r) == "not_found", 'The error code should be "not_found"'
assert "9999" in r["body"]["error"]["message"], "Mention the id in the message"
assert _c("GET", "/products/0")["status"] == 404`),
      },
      {
        id: "t4",
        description: "A non-numeric id never reaches the handler (404), other methods are 405",
        assertionCode: T(py`reset_db()
assert _c("GET", "/products/abc")["status"] == 404, "/products/abc has no matching route, so 404"
r = _c("DELETE", "/products/1")
assert r["status"] == 405 and _hdr(r, "Allow") == "GET", "Nothing deletes products yet, so DELETE /products/1 is 405 with Allow: GET"`),
      },
      {
        id: "t5",
        description: "An empty shop is 200 with an empty list, not 404",
        assertionCode: T(py`reset_db()
with get_db() as conn:
    conn.execute("DELETE FROM products")
r = _c("GET", "/products")
assert r["status"] == 200, "An empty collection is still a successful answer (200), got " + str(r["status"])
assert r["body"]["items"] == [] and r["body"]["total"] == 0`),
      },
    ],
    unlocks: ["store-catalogue"],
    checks: [
      {
        prompt: "The shop has no products yet. What should `GET /products` return?",
        question: {
          type: "choice",
          options: [
            "200 with {\"items\": [], \"total\": 0}",
            "404, because there is nothing there",
            "204 with no body",
            "500, because the table is empty",
          ],
          answer: 0,
        },
        explanation:
          "The collection exists, it just has no members. 404 means a specific resource is missing. Clients should be able to loop over `items` without checking for an error.",
      },
      {
        prompt: "Which URL follows REST conventions for fetching product 3?",
        question: {
          type: "choice",
          options: ["`GET /products/3`", "`GET /getProduct?id=3`", "`POST /products/get/3`", "`GET /product_detail/3.php`"],
          answer: 0,
        },
        explanation:
          "A plural noun names the collection, the id names the member, and the HTTP method (GET) says what to do. Verbs in paths and file extensions leak implementation and make the API harder to learn.",
      },
    ],
  },

  // ───────────────────────────────────────── 6. search + injection
  {
    id: "store-api-6-search",
    title: "Query strings and safe search",
    minutes: 30,
    xp: 160,
    concepts: ["query parameters", "SQL injection", "parameterized queries", "filtering", "400 Bad Request"],
    learn: `### Query strings refine a collection

The path says *which resource*, the query string says *how to view it*:

~~~http
GET /products?q=lamp&category=lighting&max_price=5000
~~~

Query parameters are optional, order does not matter, and values are percent-encoded (\`%20\` or \`+\` for a space). You do not split them by hand: the standard library does it.

~~~python
from urllib.parse import parse_qsl

parse_qsl("q=blue%20mug&category=desk&empty=")
# [('q', 'blue mug'), ('category', 'desk')]    blank values are dropped by default
dict(parse_qsl("a=1&a=2"))                     # {'a': '2'}  the last repeat wins
~~~

### The attack: SQL injection

Look at this search written the obvious way:

~~~python
def search(term):
    sql = "SELECT * FROM products WHERE name LIKE '%" + term + "%'"
    return conn.execute(sql).fetchall()

search("lamp")                    # fine
search("zzz%' OR 1=1 --")         # returns EVERY product
~~~

The attacker's text closes your quote, adds their own condition and uses \`--\` to comment out the rest. The database ran *their* SQL. With a different payload they can \`UNION SELECT\` rows from any table, such as \`sqlite_master\` (your whole schema) or a \`users\` table full of password hashes. SQLite's \`execute()\` refuses more than one statement, but \`executescript()\` does not, and there \`'; DROP TABLE products; --\` really deletes your data. This is one of the most common and most damaging web vulnerabilities.

### The fix: let the driver carry the value

~~~python
conn.execute("SELECT * FROM products WHERE name LIKE ?", (f"%{term}%",))
~~~

The SQL text is fixed and the value travels separately. Whatever the user typed, including quotes, is just data compared against \`name\`.

### Dynamic filters, still safe

Filters are optional, so the WHERE clause is built from *your own fixed fragments*, while the values go into a parameter list:

~~~python
clauses, params = [], []
if category:
    clauses.append("category = ?")
    params.append(category)
where = " WHERE " + " AND ".join(clauses) if clauses else ""
rows = conn.execute("SELECT * FROM products" + where, params)
~~~

The only strings concatenated are literals from your source code, never user input.

### LIKE has its own wildcards

In a \`LIKE\`, \`%\` and \`_\` are wildcards. Searching for \`100%\` would match everything. That is not an injection, but it surprises users, so escape them and declare the escape character with \`ESCAPE\`.

### Bad parameters are a 400

If \`max_price=abc\`, the request itself is malformed. Answer **400 Bad Request** with a message that names the parameter, instead of crashing or silently ignoring it.

### In frameworks

~~~python
# Flask:   request.args.get("q")
# FastAPI: def index(q: str | None = None, max_price: int | None = None)   # type + 422 for free
# Django:  request.GET.get("q")
~~~

ORMs (Django ORM, SQLAlchemy) bind parameters for you, but raw SQL escape hatches (\`text()\`, \`.extra()\`, \`.raw()\`) can still be injected if you format strings into them.

### Common mistakes

- Validating by stripping quotes instead of using placeholders. That always loses to a cleverer payload.
- Using a placeholder for a column or table name (it won't work; see the next lesson).
- Forgetting that \`parse_qsl\` gives strings: numbers need converting and checking.`,
    mission: `Shoppers need to find things. Add search and filters to the catalogue: text, category and price range.

Careful: the starter's search was written in a hurry and it is **injectable**. Run it first and watch it leak the entire catalogue (the console shows the count), then fix it properly. The storefront gets a search box, category chips and a price filter.`,
    tasks: [
      "parse_query(query_string): a dict of decoded parameters, blank values dropped",
      "Rewrite search_products(term, category, min_price, max_price) with ? placeholders: text matches name or description (case-insensitive, LIKE wildcards escaped)",
      "int_param(query, name, default, minimum, maximum): a whole number or ApiError(400, \"invalid_parameter\")",
      "GET /products reads q, category, min_price and max_price and returns {\"items\", \"total\"}",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: query strings and safe search.
from urllib.parse import parse_qsl


def parse_query(query_string):
    """'q=blue%20mug&page=2&x=' -> {'q': 'blue mug', 'page': '2'} (blank values dropped)."""
    ...


def search_products(term="", category=None, min_price=None, max_price=None):
    # DANGER: user text is glued straight into the SQL, so anyone can rewrite the query.
    # Rewrite it with ? placeholders. term matches name OR description, case-insensitively;
    # min_price / max_price compare price_cents. Build the WHERE clause from fixed fragments.
    sql = "SELECT * FROM products WHERE name LIKE '%" + term + "%'"
    if category:
        sql += " AND category = '" + category + "'"
    sql += " ORDER BY id"
    return [dict(row) for row in get_db().execute(sql)]


# Watch the attack work. The Run output should say 0 products leaked once you fix it:
print("attack leaked", len(search_products("zzz%' OR 1=1 --")), "of 16 products")


def int_param(query, name, default=None, minimum=None, maximum=None):
    """query[name] as an int; default when it is absent. Not a whole number, or outside
    minimum..maximum -> raise ApiError(400, "invalid_parameter", message, [{"field": name, "message": ...}])."""
    ...


@app.get("/products")
def index_products(request):
    """Search and filter: q, category, min_price, max_price. Replaces the lesson 5 version."""
    ...
`,
    solutionAdd: py`from urllib.parse import parse_qsl


def parse_query(query_string):
    """'q=blue%20mug&page=2&x=' -> {'q': 'blue mug', 'page': '2'}. Blank values are dropped."""
    return dict(parse_qsl(query_string))


def escape_like(text):
    """Make %, _ and the escape character match themselves inside LIKE."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def build_filters(term="", category=None, min_price=None, max_price=None):
    """Return (' WHERE ...', params). Only fixed fragments are concatenated; values go in params."""
    clauses, params = [], []
    if term:
        like = f"%{escape_like(term)}%"
        clauses.append("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')")
        params += [like, like]
    if category:
        clauses.append("category = ?")
        params.append(category)
    if min_price is not None:
        clauses.append("price_cents >= ?")
        params.append(min_price)
    if max_price is not None:
        clauses.append("price_cents <= ?")
        params.append(max_price)
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    return where, params


def search_products(term="", category=None, min_price=None, max_price=None):
    where, params = build_filters(term, category, min_price, max_price)
    rows = get_db().execute(f"SELECT * FROM products{where} ORDER BY id", params)
    return [dict(row) for row in rows]


def int_param(query, name, default=None, minimum=None, maximum=None):
    """Read a whole-number query parameter, or raise a 400 that names it."""
    raw = query.get(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise ApiError(400, "invalid_parameter", f"Query parameter '{name}' must be a whole number.", [{"field": name, "message": "must be a whole number"}])
    if (minimum is not None and value < minimum) or (maximum is not None and value > maximum):
        low = "" if minimum is None else f"at least {minimum}"
        high = "" if maximum is None else f"at most {maximum}"
        rule = " and ".join(part for part in (low, high) if part)
        raise ApiError(400, "invalid_parameter", f"Query parameter '{name}' must be {rule}.", [{"field": name, "message": f"must be {rule}"}])
    return value


@app.get("/products")
def index_products(request):
    """Search the catalogue by text, category and price range."""
    query = parse_query(request["query_string"])
    items = search_products(
        query.get("q", ""),
        query.get("category"),
        int_param(query, "min_price", minimum=0),
        int_param(query, "max_price", minimum=0),
    )
    return json_response(200, {"items": items, "total": len(items)})`,
    explanation:
      "The vulnerable version let the attacker's text become part of the SQL. The fixed version never concatenates user input: build_filters assembles the WHERE clause only from literals in your code and collects the values in a list that the driver binds separately. Escaping % and _ keeps a search for '100%' literal. int_param turns a malformed query parameter into a precise 400 instead of a crash or a silent default.",
    hints: [
      { id: "h1", title: "Parsing", content: "dict(parse_qsl(query_string)) already decodes %20 and +, and drops blank values." },
      { id: "h2", title: "Placeholders", content: 'clauses.append("category = ?"); params.append(category). At the end: conn.execute("SELECT * FROM products" + where + " ORDER BY id", params). For the text search use name LIKE ? OR description LIKE ? with the same f"%{term}%" value twice.' },
      { id: "h3", title: "Escaping LIKE", content: "Replace \\ then % then _ with a backslash version and add ESCAPE '\\' after each LIKE ?. Without it, searching for % matches everything." },
    ],
    tests: [
      {
        id: "t1",
        description: "parse_query decodes values and drops blanks",
        assertionCode: T(py`assert parse_query("") == {}, "An empty query string should give {}"
assert parse_query("q=blue%20mug&category=desk") == {"q": "blue mug", "category": "desk"}, "%20 should decode to a space"
assert parse_query("q=a+b") == {"q": "a b"}, "+ should decode to a space"
assert parse_query("q=&category=desk") == {"category": "desk"}, "Blank values should be dropped"`),
      },
      {
        id: "t2",
        description: "search_products filters by text, category and price",
        assertionCode: T(py`reset_db()
assert [p["sku"] for p in search_products(category="desk")] == ["DSK-001", "DSK-002", "DSK-003", "DSK-004"], "category='desk' should return the four desk products in id order"
assert [p["sku"] for p in search_products("lamp")] == ["LGT-001"], "Searching 'lamp' should find the Arc Desk Lamp"
assert [p["sku"] for p in search_products("LIGHT")] == ["LGT-001", "LGT-002", "LGT-003"], "Text search is case-insensitive and also looks in descriptions"
assert [p["id"] for p in search_products(min_price=5000, max_price=7000)] == [1, 8, 14], "Prices between 5000 and 7000 cents are products 1, 8 and 14"
assert [p["sku"] for p in search_products("desk", category="lighting")] == ["LGT-001"], "Filters combine with AND"
assert len(search_products()) == 16, "No filters returns everything"`),
      },
      {
        id: "t3",
        description: "SQL injection payloads find nothing and break nothing",
        assertionCode: T(py`reset_db()
payloads = [
    "zzz%' OR 1=1 --",
    "zzz' OR '1'='1",
    "x%' UNION SELECT 1,'x',name,sql,'x',0,0 FROM sqlite_master --",
]
for evil in payloads:
    try:
        found = search_products(evil)
    except Exception as e:
        assert False, "search_products crashed on " + repr(evil) + " (" + type(e).__name__ + "). Use ? placeholders so quotes are just data."
    assert found == [], "SQL injection! search_products(" + repr(evil) + ") leaked " + str(len(found)) + " rows. Pass user text as a ? parameter."
assert search_products("x", category="desk' OR '1'='1") == [], "The category filter must be parameterized too"
assert len(list_products()) == 16`),
      },
      {
        id: "t4",
        description: "Apostrophes work and LIKE wildcards are literal",
        assertionCode: T(py`reset_db()
with get_db() as conn:
    conn.execute("INSERT INTO products (sku, name, category, price_cents) VALUES (?, ?, ?, ?)", ("MUG-001", "Joe's Mug", "kitchen", 1200))
assert [p["sku"] for p in search_products("Joe's")] == ["MUG-001"], "A product with an apostrophe should be searchable"
assert search_products("%") == [], "A literal % matches nothing here: escape % and _ and add ESCAPE to the LIKE"
assert search_products("_") == [], "A literal _ is not a wildcard either"`),
      },
      {
        id: "t5",
        description: "int_param validates whole numbers and ranges",
        assertionCode: T(py`assert int_param({"n": "5"}, "n") == 5
assert int_param({}, "n") is None and int_param({}, "n", default=7) == 7, "A missing parameter returns the default"
for bad, kw in [("abc", {}), ("1.5", {}), ("-1", {"minimum": 0}), ("99", {"maximum": 50})]:
    try:
        int_param({"n": bad}, "n", **kw)
    except ApiError as e:
        assert e.status == 400 and e.code == "invalid_parameter", "A bad value should raise ApiError(400, 'invalid_parameter', ...)"
        assert e.details and e.details[0]["field"] == "n", "details should name the field: [{'field': 'n', 'message': ...}]"
    else:
        assert False, "int_param should reject " + repr(bad)`),
      },
      {
        id: "t6",
        description: "GET /products filters through the query string",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products?category=desk")
assert r["status"] == 200 and r["body"]["total"] == 4 and len(r["body"]["items"]) == 4, "?category=desk should list the 4 desk products"
r = _c("GET", "/products?q=lamp")
assert [p["sku"] for p in r["body"]["items"]] == ["LGT-001"], "?q=lamp should find one product"
r = _c("GET", "/products?min_price=5000&max_price=7000")
assert [p["id"] for p in r["body"]["items"]] == [1, 8, 14], "min_price and max_price compare price_cents"
r = _c("GET", "/products?q=")
assert r["body"]["total"] == 16, "A blank q means no text filter"
r = _c("GET", "/products?category=toys")
assert r["status"] == 200 and r["body"]["items"] == [] and r["body"]["total"] == 0, "A category with no products is an empty list, not an error"
r = _c("GET", "/products?q=blue%20mug")
assert r["status"] == 200, "Encoded query values should work"`),
      },
      {
        id: "t7",
        description: "Malformed numbers are a 400 that names the parameter",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products?min_price=abc")
assert r["status"] == 400, "min_price=abc is a malformed request: answer 400, got " + str(r["status"])
assert _code(r) == "invalid_parameter" and r["body"]["error"]["details"][0]["field"] == "min_price", "The error should name the field min_price"
assert _c("GET", "/products?max_price=-5")["status"] == 400, "Negative prices are not valid filters"`),
      },
      {
        id: "t8",
        description: "Injection through the HTTP route is harmless too",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products?q=zzz%25%27%20OR%201%3D1%20--")
assert r["status"] == 200 and r["body"]["total"] == 0, "q=zzz%' OR 1=1 -- must match nothing. Got total " + str(r["body"].get("total"))
r = _c("GET", "/products?category=desk%27%20OR%20%271%27%3D%271")
assert r["status"] == 200 and r["body"]["total"] == 0, "The category parameter must be bound as a value, too"
assert _c("GET", "/products")["body"]["total"] == 16`),
      },
    ],
    unlocks: ["store-search"],
    checks: [
      {
        prompt: "Why does `LIKE '%' + term + '%'` let an attacker read other rows?",
        question: {
          type: "choice",
          options: [
            "Their text can close the quote and add SQL of their own, because it becomes part of the statement",
            "LIKE is slow, so the database gives up and returns everything",
            "Python strings cannot contain quotes",
            "The database always returns all rows when the pattern has a % sign",
          ],
          answer: 0,
        },
        explanation:
          "When user text is concatenated into the statement, the database cannot tell your SQL from theirs. With a placeholder the statement is fixed and the value is only ever compared as data.",
      },
      {
        prompt: "A teammate proposes fixing injection by deleting every `'` from the user's text. What is the best response?",
        question: {
          type: "choice",
          options: [
            "Use placeholders. Escaping by hand misses cases, and it breaks real names like O'Brien",
            "Good idea, quotes are the only danger",
            "Also remove semicolons and it will be completely safe",
            "Switch to executescript() so it is easier to filter",
          ],
          answer: 0,
        },
        explanation:
          "Blacklists lose to the next trick (encodings, numeric contexts, comments), and they corrupt legitimate data. Parameterized queries remove the entire class of problem.",
      },
      {
        prompt: "`GET /products?max_price=abc` arrives. Which status fits best?",
        question: { type: "choice", options: ["400 Bad Request", "404 Not Found", "500 Internal Server Error", "200 OK with all products"], answer: 0 },
        explanation:
          "The request itself is malformed, so it is a 4xx. It is not a server fault (500). Ignoring it silently (200) hides the client's bug.",
      },
    ],
  },

  // ───────────────────────────────────────── 7. paging + sorting
  {
    id: "store-api-7-paging",
    title: "Pagination and sorting",
    minutes: 30,
    xp: 160,
    concepts: ["pagination", "LIMIT / OFFSET", "ORDER BY whitelist", "stable ordering", "API limits"],
    learn: `### Never return "everything"

A catalogue of 16 products is fine. A catalogue of 2 million is not: the query is slow, the response is huge, and the page cannot show it anyway. A collection endpoint needs **pagination**, and the server enforces sane limits no matter what the client asks for.

~~~http
GET /products?page=2&per_page=5&sort=-price
~~~

~~~text
{ "items": [ ... 5 products ... ], "page": 2, "per_page": 5, "total": 16, "pages": 4 }
~~~

### LIMIT and OFFSET

~~~sql
SELECT * FROM products ORDER BY id LIMIT 5 OFFSET 5     -- page 2 of size 5
~~~

\`OFFSET = (page - 1) * per_page\`. Count the matching rows separately with \`SELECT COUNT(*) ... WHERE (same filters)\` to report \`total\`, and compute \`pages = ceil(total / per_page)\`. Asking for a page past the end is not an error: it is a **200** with an empty \`items\` list.

### Defaults and caps

Give \`page\` and \`per_page\` defaults, validate them (\`page >= 1\`, \`1 <= per_page <= 50\`), and answer a **400** otherwise. Without a cap, \`per_page=10000000\` is a cheap way to knock your server over.

### Stable ordering

SQL does not promise an order unless you ask. Without \`ORDER BY\`, rows may shuffle between pages. When you sort by something that can tie (many products cost the same), add a unique tie-breaker (\`id\`), or items will be skipped or repeated across pages.

### Sorting safely: the whitelist

You cannot write \`ORDER BY ?\`. A placeholder becomes a *string value*, so \`ORDER BY 'price_cents'\` sorts by a constant and silently does nothing. Column names are **identifiers**, not values, so they have to be written into the SQL text. That is exactly where injection creeps back in, if you paste the client's \`sort\` in.

The answer is a **whitelist**: map what the client may ask for onto column names *you* wrote, and reject everything else.

~~~python
SORTABLE = {"name": "name", "price": "price_cents"}
column = SORTABLE.get(requested)        # None for anything unexpected
if column is None:
    raise ApiError(400, ...)            # never use 'requested' itself in SQL
~~~

The f-string that builds the query then contains only text from your dict. A leading \`-\` (as in \`sort=-price\`) is a common convention for descending.

### Beyond offsets

OFFSET gets slow on huge tables (the database still walks past the skipped rows) and can duplicate or skip items when data changes between requests. **Keyset pagination** (\`WHERE id > :last_id ORDER BY id LIMIT 20\`, with an opaque \`next\` cursor) fixes both at the cost of jumping to arbitrary pages. Use offsets for small admin lists, cursors for feeds.

### In the frameworks

~~~python
# Django REST Framework: PageNumberPagination(page_size=8)
# FastAPI:  page: int = Query(1, ge=1), per_page: int = Query(8, ge=1, le=50)
# Flask-SQLAlchemy:  query.paginate(page=page, per_page=per_page)
~~~

### Common mistakes

- Sorting without a tie-breaker, so pages overlap.
- Pasting \`request.args["sort"]\` into the query.
- No upper bound on \`per_page\`.
- Counting with one set of filters and listing with another, so \`total\` lies.`,
    mission: `The storefront has to show 8 products at a time, sorted by price or name, with a pager that knows how many pages exist. And the admin list must never be able to ask for a million rows.

Build pagination and a whitelisted sort on top of your filters. The shop grows a sort menu and page buttons.`,
    tasks: [
      "parse_sort(value): '-price' becomes 'price_cents DESC, id ASC'; unknown keys raise a 400; default 'id ASC'",
      "query_products(...) returns (items, total): same filters for the count and the page, LIMIT and OFFSET as parameters",
      "GET /products accepts page, per_page (1 to 50, default 8) and sort, and returns items, page, per_page, total and pages",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: pagination and sorting.
DEFAULT_PER_PAGE = 8
MAX_PER_PAGE = 50
# what the client may sort by -> the real column (the ONLY text that may reach ORDER BY)
SORTABLE = {"name": "name", "price": "price_cents", "stock": "stock", "newest": "id"}


def parse_sort(value):
    """None -> 'id ASC'. 'price' -> 'price_cents ASC, id ASC'. '-price' -> 'price_cents DESC, id ASC'.
    A key that is not in SORTABLE raises ApiError(400, "invalid_parameter", ...) listing the allowed keys."""
    ...


def query_products(where_args, order_by, page, per_page):
    """Return (items, total). where_args are the arguments for build_filters(...)
    (a tuple); total counts ALL matches, items is just this page."""
    ...


@app.get("/products")
def index_products(request):
    """Filter, sort and page. Replaces the lesson 6 version.
    Body: {"items": [...], "page": n, "per_page": n, "total": n, "pages": n}"""
    ...
`,
    solutionAdd: py`import math

DEFAULT_PER_PAGE = 8
MAX_PER_PAGE = 50
# what the client may sort by -> the real column (the ONLY text that may reach ORDER BY)
SORTABLE = {"name": "name", "price": "price_cents", "stock": "stock", "newest": "id"}


def parse_sort(value):
    """'-price' -> 'price_cents DESC, id ASC'. Only whitelisted columns ever reach the SQL text."""
    if not value:
        return "id ASC"
    descending = value.startswith("-")
    key = value[1:] if descending else value
    column = SORTABLE.get(key)
    if column is None:
        allowed = ", ".join(sorted(SORTABLE))
        raise ApiError(400, "invalid_parameter", f"Cannot sort by '{key}'. Choose one of: {allowed}.", [{"field": "sort", "message": f"must be one of {allowed}"}])
    return f"{column} {'DESC' if descending else 'ASC'}, id ASC"  # id breaks ties so pages never overlap


def query_products(where_args, order_by, page, per_page):
    where, params = build_filters(*where_args)
    conn = get_db()
    total = conn.execute(f"SELECT COUNT(*) FROM products{where}", params).fetchone()[0]
    rows = conn.execute(
        f"SELECT * FROM products{where} ORDER BY {order_by} LIMIT ? OFFSET ?",
        [*params, per_page, (page - 1) * per_page],
    )
    return [dict(row) for row in rows], total


@app.get("/products")
def index_products(request):
    """List products: filter, sort and page."""
    query = parse_query(request["query_string"])
    page = int_param(query, "page", 1, minimum=1)
    per_page = int_param(query, "per_page", DEFAULT_PER_PAGE, minimum=1, maximum=MAX_PER_PAGE)
    filters = (
        query.get("q", ""),
        query.get("category"),
        int_param(query, "min_price", minimum=0),
        int_param(query, "max_price", minimum=0),
    )
    items, total = query_products(filters, parse_sort(query.get("sort")), page, per_page)
    return json_response(
        200,
        {"items": items, "page": page, "per_page": per_page, "total": total, "pages": math.ceil(total / per_page)},
    )`,
    explanation:
      "The sort key never touches SQL: parse_sort looks it up in a dict of columns you wrote and refuses anything else, so the f-string only ever contains your own text. The id tie-breaker makes the order total, which keeps pages from overlapping. query_products counts with exactly the same WHERE clause it lists with, and passes LIMIT and OFFSET as bound parameters. A page past the end simply yields an empty list.",
    hints: [
      { id: "h1", title: "parse_sort", content: 'descending = value.startswith("-"); key = value[1:] if descending else value; column = SORTABLE.get(key). If column is None raise ApiError(400, ...). Return f"{column} {\'DESC\' if descending else \'ASC\'}, id ASC".' },
      { id: "h2", title: "Same filters twice", content: 'where, params = build_filters(*where_args) once; use it in both SELECT COUNT(*) FROM products{where} and SELECT * FROM products{where} ORDER BY {order_by} LIMIT ? OFFSET ?, adding [per_page, offset] to params.' },
      { id: "h3", title: "Pages", content: "offset = (page - 1) * per_page and pages = math.ceil(total / per_page). int_param(query, 'per_page', DEFAULT_PER_PAGE, minimum=1, maximum=MAX_PER_PAGE) validates the range." },
    ],
    tests: [
      {
        id: "t1",
        description: "parse_sort maps keys to columns and rejects the rest",
        assertionCode: T(py`assert parse_sort(None) == "id ASC", "No sort means 'id ASC'"
assert parse_sort("price") == "price_cents ASC, id ASC", "'price' sorts by the price_cents column, ascending, with id as tie-breaker"
assert parse_sort("-name") == "name DESC, id ASC", "A leading '-' means descending"
for bad in ["password", "price; DROP TABLE products", "id) --", "-", "PRICE"]:
    try:
        parse_sort(bad)
    except ApiError as e:
        assert e.status == 400 and e.code == "invalid_parameter", "Unknown sort keys raise ApiError(400, 'invalid_parameter', ...)"
    else:
        assert False, "parse_sort should reject " + repr(bad)`),
      },
      {
        id: "t2",
        description: "Defaults: 8 per page, with page counts",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products")
b = r["body"]
assert r["status"] == 200, "GET /products should return 200"
assert (b["page"], b["per_page"], b["total"], b["pages"]) == (1, 8, 16, 2), "Expected page=1, per_page=8, total=16, pages=2 but got " + str((b.get("page"), b.get("per_page"), b.get("total"), b.get("pages")))
assert [p["id"] for p in b["items"]] == list(range(1, 9)), "Page 1 holds products 1 to 8"
b2 = _c("GET", "/products?page=2")["body"]
assert [p["id"] for p in b2["items"]] == list(range(9, 17)), "Page 2 holds products 9 to 16"`),
      },
      {
        id: "t3",
        description: "Custom page sizes and pages past the end",
        assertionCode: T(py`reset_db()
sizes = [len(_c("GET", "/products?per_page=5&page=" + str(n))["body"]["items"]) for n in (1, 2, 3, 4)]
assert sizes == [5, 5, 5, 1], "16 products at 5 per page should make pages of 5, 5, 5, 1 but got " + str(sizes)
assert _c("GET", "/products?per_page=5")["body"]["pages"] == 4
r = _c("GET", "/products?page=99")
assert r["status"] == 200 and r["body"]["items"] == [] and r["body"]["total"] == 16, "A page past the end is 200 with an empty list, and total is still 16"`),
      },
      {
        id: "t4",
        description: "Invalid page and per_page values are 400",
        assertionCode: T(py`reset_db()
for q in ["page=0", "page=-1", "page=x", "per_page=0", "per_page=1000", "per_page=abc"]:
    r = _c("GET", "/products?" + q)
    assert r["status"] == 400 and _code(r) == "invalid_parameter", q + " should be answered with 400 invalid_parameter, got " + str(r["status"])`),
      },
      {
        id: "t5",
        description: "Sorting by price, name and stock works in both directions",
        assertionCode: T(py`reset_db()
def prices(q):
    return [p["price_cents"] for p in _c("GET", "/products?per_page=50&" + q)["body"]["items"]]
up = prices("sort=price")
assert up == sorted(up) and len(up) == 16, "sort=price should be ascending"
assert prices("sort=-price") == sorted(up, reverse=True), "sort=-price should be descending"
names = [p["name"] for p in _c("GET", "/products?per_page=50&sort=name")["body"]["items"]]
assert names == sorted(names), "sort=name should be alphabetical"
assert _c("GET", "/products?sort=-newest")["body"]["items"][0]["id"] == 16, "sort=-newest puts the highest id first"
first = _c("GET", "/products?sort=-price&per_page=3")["body"]["items"]
assert [p["sku"] for p in first] == ["AUD-003", "BAG-001", "DSK-002"], "The three most expensive products are AUD-003, BAG-001, DSK-002"`),
      },
      {
        id: "t6",
        description: "Unknown or hostile sort keys are rejected before reaching SQL",
        assertionCode: T(py`reset_db()
for s in ["bogus", "price;DROP%20TABLE%20products--", "name%20DESC", "sku"]:
    r = _c("GET", "/products?sort=" + s)
    assert r["status"] == 400, "sort=" + s + " should be rejected with 400, got " + str(r["status"])
assert "name" in _c("GET", "/products?sort=bogus")["body"]["error"]["message"], "The message should list the allowed sort keys"
assert len(list_products()) == 16`),
      },
      {
        id: "t7",
        description: "Filters, sorting and paging work together",
        assertionCode: T(py`reset_db()
b = _c("GET", "/products?category=desk&sort=-price&per_page=2")["body"]
assert b["total"] == 4 and b["pages"] == 2, "4 desk products at 2 per page is 2 pages (total must count the filtered rows)"
assert [p["sku"] for p in b["items"]] == ["DSK-002", "DSK-001"], "The two priciest desk items come first"
b = _c("GET", "/products?category=desk&sort=-price&per_page=2&page=2")["body"]
assert [p["sku"] for p in b["items"]] == ["DSK-003", "DSK-004"]
b = _c("GET", "/products?category=toys")["body"]
assert b["items"] == [] and b["total"] == 0 and b["pages"] == 0, "No matches: no items, total 0, pages 0"`),
      },
    ],
    unlocks: ["store-paging"],
    checks: [
      {
        prompt: "A client sends `sort=price`. Which approach is safe?",
        question: {
          type: "choice",
          options: [
            "Look the key up in a dict of known columns and use the dict's value in the SQL",
            "Use `ORDER BY ?` and pass the client's text as the parameter",
            "Put the client's text straight into the f-string",
            "Strip spaces and semicolons from the client's text",
          ],
          answer: 0,
        },
        explanation:
          "Column names are identifiers, so a placeholder cannot carry them (`ORDER BY ?` sorts by a constant string). A whitelist keeps the SQL text under your control. Stripping characters is a blacklist and will eventually miss something.",
      },
      {
        prompt: "`GET /products?page=999` where only 2 pages exist. What should the API return?",
        question: {
          type: "choice",
          options: [
            "200 with an empty items list",
            "404 Not Found",
            "500 Internal Server Error",
            "The last page",
          ],
          answer: 0,
        },
        explanation:
          "The collection exists; that window of it is simply empty. A 404 is for missing resources, and silently returning another page would confuse a client that loops until `items` is empty.",
      },
      {
        prompt: "Why add `id` as a final ORDER BY column even when sorting by price?",
        question: {
          type: "choice",
          options: [
            "Products with equal prices need a fixed order, or items can repeat or vanish between pages",
            "It makes the query use an index",
            "SQLite requires two sort columns",
            "To sort the ids alphabetically",
          ],
          answer: 0,
        },
        explanation:
          "If rows tie, the database may return them in any order, and the order can differ between the query for page 1 and the query for page 2. A unique tie-breaker makes the order total and stable.",
      },
    ],
  },
];
