import type { Lesson } from "@/engine/types";
import { py, T } from "./shared.ts";

/** Chapter 3: Writes and security. Create, update, delete, then who may do what. */
export const chapter3: Lesson[] = [
  // ───────────────────────────────────────── 8. create
  {
    id: "store-api-8-create",
    title: "Create with POST",
    minutes: 35,
    xp: 180,
    concepts: ["POST", "JSON bodies", "validation", "201 Created", "422 vs 400 vs 409", "constraints to HTTP"],
    learn: `### POST creates

\`POST /products\` with a JSON body adds a product to the collection. A good create response has three parts:

- status **201 Created** (not 200),
- a **\`Location\`** header with the address of the new resource (\`/products/17\`),
- the new resource as the body, including the **server-generated** fields such as \`id\`.

\`POST\` is neither safe nor idempotent: sending it twice creates two products (unless a constraint stops you, or you use idempotency keys, which come at the end of the course).

### Reading the body

A request body is *text* on the wire. Parse it, and be ready for it to be broken. A body that is not valid JSON, or valid JSON of the wrong kind (a list instead of an object), is a **400 Bad Request** with the code \`invalid_json\`.

### Never trust the client: validate

Whatever arrives from outside is untrusted until checked. For each field decide the **type**, whether it is **required**, its **range or length** and its **format**. Two habits make an API pleasant to use:

- **Report every problem at once**, not just the first, so a form can highlight all bad fields in one round trip.
- **Reject unknown fields.** A client that sends \`"price"\` instead of \`"price_cents"\` should be told, not silently ignored.

A classic Python trap: \`bool\` is a subclass of \`int\`, so \`isinstance(True, int)\` is \`True\`. For a price, check \`type(value) is int\`.

A table-driven design keeps the rules in one readable place:

~~~python
RULES = {
    "name":  (lambda v: isinstance(v, str) and 1 <= len(v.strip()) <= 80, "must be 1 to 80 characters"),
    "stock": (lambda v: type(v) is int and 0 <= v <= 100_000,            "must be a whole number from 0 to 100000"),
}
~~~

### The error body

The error object you have used since lesson 2 has an optional \`details\` list. For validation it names each bad field:

~~~text
422  {"error": {"code": "validation_error", "message": "The product data is not valid.",
            "details": [{"field": "price_cents", "message": "must be a whole number of cents..."}]}}
~~~

### 400, 422 or 409?

- **400**: the request cannot be understood at all (broken JSON, wrong content shape).
- **422**: understood, but the *data* is not acceptable (a missing name, a negative price).
- **409**: the data is fine on its own but **clashes with existing state** (that SKU is already taken).

Some APIs use 400 for all validation. Either is defensible; the rule is to be consistent and document it.

### Let the database say no, too

Checking "is this SKU free?" and then inserting has a race: another request can insert between your check and your insert. The only reliable guard is the \`UNIQUE\` constraint, which fails the INSERT with \`sqlite3.IntegrityError\`. Rather than catching it in every handler, translate it once, in a middleware that sits *inside* your error middleware:

- message starts with \`UNIQUE\` becomes **409** (and name the field),
- \`FOREIGN KEY\` becomes **409** (the row is still in use, or points at nothing),
- \`NOT NULL\` / \`CHECK\` become **422**.

The raised \`ApiError\` travels outward and the error middleware answers it. That is the onion at work.

### Insert safely

Column names in your INSERT come from \`RULES\`, which only contains names you wrote, never from the client's JSON keys. Values always go in as \`?\` parameters. And remember \`with conn:\` so a failed insert rolls back.

### In frameworks

FastAPI validates with **Pydantic** models and answers 422 itself. Django REST Framework uses **serializers**, Flask often uses marshmallow. They all do what you are writing: describe fields, check them, report every problem.

### Common mistakes

- Returning 200 for a creation, or forgetting \`Location\`.
- Trusting JSON types: \`"price_cents": "12"\` or \`true\`.
- Building the INSERT column list from the client's keys.
- Returning the 409 detail straight from SQLite ("UNIQUE constraint failed: products.sku") instead of a friendly message.`,
    mission: `Time to let the admin stock the shelves. \`POST /products\` must accept a JSON body, validate every field, create the product and answer \`201\` with a \`Location\` header. And it must fail properly: broken JSON, bad fields, duplicate SKUs.

The storefront gets an **Admin** panel with a New product form that talks to your endpoint (for now anyone can use it; lesson 11 locks it down).`,
    tasks: [
      "read_json(request): the body as a dict, or ApiError 400 invalid_json (not JSON, or not an object)",
      "RULES + validate_product(data, partial=False): check every field, report all problems at once as ApiError 422 with details; reject unknown fields; apply defaults",
      "insert_product() and POST /products returning 201, the new product and a Location header",
      "integrity_middleware: UNIQUE becomes 409, FOREIGN KEY 409, NOT NULL / CHECK 422; register it with app.use",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: create products with POST.
import json
import sqlite3

CATEGORIES = ("audio", "bags", "desk", "kitchen", "lighting")
REQUIRED = ("sku", "name", "category", "price_cents")  # must be present on create
DEFAULTS = {"description": "", "stock": 0}  # used when an optional field is omitted

# TODO: RULES maps each field to (is_valid(value), "message shown when it is not valid"):
#   sku          text like ABC-123 (three capital letters, a dash, three digits)
#   name         text, 1 to 80 characters (ignoring surrounding spaces)
#   description  text, at most 500 characters
#   category     one of CATEGORIES
#   price_cents  a whole number from 0 to 1000000 (type(v) is int, so True is rejected)
#   stock        a whole number from 0 to 100000
RULES = {}


def read_json(request):
    """The request body as a dict. Text is parsed with json.loads; an already-parsed dict is accepted.
    Broken JSON, or JSON that is not an object -> ApiError(400, "invalid_json", ...)."""
    ...


def validate_product(data, partial=False):
    """Return the clean dict, or raise ApiError(422, "validation_error", "The product data is not valid.", problems)
    where problems is a list of {"field": ..., "message": ...} covering EVERY problem found.
    Unknown fields are problems. Required fields must be present unless partial=True.
    Without partial, fill in DEFAULTS for omitted optional fields."""
    ...


def insert_product(clean):
    """INSERT the validated fields (column names come from RULES, values are ? parameters)
    and return the new product as a dict."""
    ...


@app.post("/products")
def create_product(request):
    """Validate the body, insert it, answer 201 with the product and a Location header."""
    ...


def integrity_middleware(request, call_next):
    """Translate sqlite3.IntegrityError into ApiError: UNIQUE -> 409 "conflict" naming the field,
    FOREIGN KEY -> 409 "conflict", anything else (NOT NULL, CHECK) -> 422 "constraint_violation"."""
    ...


# TODO: register integrity_middleware with app.use (after errors_middleware, so it is the inner layer)
`,
    solutionAdd: py`import json
import sqlite3

CATEGORIES = ("audio", "bags", "desk", "kitchen", "lighting")
REQUIRED = ("sku", "name", "category", "price_cents")  # must be present on create
DEFAULTS = {"description": "", "stock": 0}  # used when an optional field is omitted

# field -> (is_valid(value), message shown when it is not valid)
RULES = {
    "sku": (lambda v: isinstance(v, str) and re.fullmatch(r"[A-Z]{3}-[0-9]{3}", v) is not None, "must look like ABC-123"),
    "name": (lambda v: isinstance(v, str) and 1 <= len(v.strip()) <= 80, "must be 1 to 80 characters"),
    "description": (lambda v: isinstance(v, str) and len(v) <= 500, "must be at most 500 characters"),
    "category": (lambda v: v in CATEGORIES, "must be one of: " + ", ".join(CATEGORIES)),
    "price_cents": (lambda v: type(v) is int and 0 <= v <= 1_000_000, "must be a whole number of cents from 0 to 1000000"),
    "stock": (lambda v: type(v) is int and 0 <= v <= 100_000, "must be a whole number from 0 to 100000"),
}


def read_json(request):
    """The request body as a dict; broken JSON or a non-object is a 400."""
    body = request.get("body")
    if isinstance(body, (str, bytes)):
        try:
            body = json.loads(body)
        except ValueError:
            raise ApiError(400, "invalid_json", "The request body is not valid JSON.")
    if not isinstance(body, dict):
        raise ApiError(400, "invalid_json", "The request body must be a JSON object.")
    return body


def validate_product(data, partial=False):
    """Check a product payload: return clean values or raise a 422 that lists every problem."""
    problems = []
    clean = {}
    for field in data:
        if field not in RULES:
            problems.append({"field": str(field), "message": "is not a product field"})
    for field, (is_valid, message) in RULES.items():
        if field in data:
            if is_valid(data[field]):
                clean[field] = data[field]
            else:
                problems.append({"field": field, "message": message})
        elif field in REQUIRED and not partial:
            problems.append({"field": field, "message": "is required"})
    if problems:
        raise ApiError(422, "validation_error", "The product data is not valid.", problems)
    if not partial:
        for field, default in DEFAULTS.items():
            clean.setdefault(field, default)
    return clean


def insert_product(clean):
    columns = ", ".join(clean)  # these names come from RULES, never from the client
    marks = ", ".join("?" for _ in clean)
    with get_db() as conn:
        cursor = conn.execute(f"INSERT INTO products ({columns}) VALUES ({marks})", list(clean.values()))
    return get_product(cursor.lastrowid)


@app.post("/products")
def create_product(request):
    """Create a product."""
    product = insert_product(validate_product(read_json(request)))
    return json_response(201, product, {"Location": f"/products/{product['id']}"})


def integrity_middleware(request, call_next):
    """Translate database constraint failures into the matching HTTP errors."""
    try:
        return call_next(request)
    except sqlite3.IntegrityError as exc:
        message = str(exc)
        if message.startswith("UNIQUE"):
            field = message.rsplit(".", 1)[-1]
            raise ApiError(409, "conflict", f"A record with this {field} already exists.", [{"field": field, "message": "must be unique"}])
        if message.startswith("FOREIGN KEY"):
            raise ApiError(409, "conflict", "This record is still referenced by other data, or points at something that does not exist.")
        raise ApiError(422, "constraint_violation", "The data breaks a database rule.")


app.use(integrity_middleware)`,
    explanation:
      "read_json isolates 'is this even JSON?' (a 400) from 'is the data acceptable?' (a 422). validate_product walks the rule table, collects every problem and raises once, so a client sees all mistakes together; type(v) is int rejects True and floats. insert_product only builds column names from validated keys. The database constraint stays the final guard against a duplicate SKU, and integrity_middleware turns that low-level failure into a clear 409 without any handler needing to know.",
    hints: [
      { id: "h1", title: "read_json", content: 'If body is a str, try json.loads(body) and catch ValueError. After that, `if not isinstance(body, dict)` raise the "must be a JSON object" error. None and lists fall into that branch.' },
      { id: "h2", title: "validate_product", content: 'First loop over data and add a problem for every key not in RULES. Then loop over RULES.items(): present and valid -> clean[field] = value; present and invalid -> a problem with the rule message; absent and in REQUIRED (and not partial) -> "is required". Raise once at the end if problems is not empty.' },
      { id: "h3", title: "integrity_middleware", content: 'try: return call_next(request)  except sqlite3.IntegrityError as exc: look at str(exc). It starts with "UNIQUE constraint failed: products.sku" for duplicates; exc text rsplit(".", 1)[-1] gives the column name. Raise ApiError, do not return a response: errors_middleware, one layer out, will answer it.' },
    ],
    tests: [
      {
        id: "t1",
        description: "read_json parses text and rejects broken or non-object bodies",
        assertionCode: T(py`assert read_json({"body": '{"a": 1}'}) == {"a": 1}, "A JSON text body should be parsed into a dict"
assert read_json({"body": {"a": 1}}) == {"a": 1}, "A body that is already a dict should be accepted"
for bad in ["{oops", "", None, "[1, 2]", "42", "null"]:
    try:
        read_json({"body": bad})
    except ApiError as e:
        assert e.status == 400 and e.code == "invalid_json", "Bad body " + repr(bad) + " should raise ApiError(400, 'invalid_json', ...)"
    else:
        assert False, "read_json should reject " + repr(bad)`),
      },
      {
        id: "t2",
        description: "validate_product returns clean values with defaults",
        assertionCode: T(py`clean = validate_product({"sku": "TST-001", "name": "Test", "category": "desk", "price_cents": 1000})
assert clean == {"sku": "TST-001", "name": "Test", "category": "desk", "price_cents": 1000, "description": "", "stock": 0}, "Missing optional fields should get their defaults (description '', stock 0). Got " + str(clean)
clean = validate_product({"sku": "TST-002", "name": "T", "category": "bags", "price_cents": 0, "stock": 5, "description": "ok"})
assert clean["stock"] == 5 and clean["price_cents"] == 0, "Given values are kept (a price of 0 is allowed)"`),
      },
      {
        id: "t3",
        description: "validate_product reports every problem at once",
        assertionCode: T(py`try:
    validate_product({"name": "  ", "price_cents": True, "bogus": 1, "category": "toys", "stock": -1})
except ApiError as e:
    assert e.status == 422 and e.code == "validation_error", "Validation failures are ApiError(422, 'validation_error', ...)"
    fields = {d["field"] for d in e.details}
    assert fields == {"sku", "name", "price_cents", "bogus", "category", "stock"}, "Expected a problem for sku (missing), name (blank), price_cents (True is not a number), bogus (unknown), category and stock, but got " + str(sorted(fields))
    assert all(isinstance(d["message"], str) and d["message"] for d in e.details), "Each problem needs a message"
else:
    assert False, "That payload is invalid and should raise ApiError"
for bad_price in ["12", 9.99, None, [1], -1, 1000001]:
    try:
        validate_product({"sku": "TST-001", "name": "T", "category": "desk", "price_cents": bad_price})
    except ApiError:
        continue
    assert False, "price_cents=" + repr(bad_price) + " should be rejected (whole numbers from 0 to 1000000 only)"
for bad_sku in ["abc-123", "AB-1234", "ABC123", 5]:
    try:
        validate_product({"sku": bad_sku, "name": "T", "category": "desk", "price_cents": 1})
    except ApiError:
        continue
    assert False, "sku=" + repr(bad_sku) + " should be rejected"`),
      },
      {
        id: "t4",
        description: "partial validation only checks what is sent",
        assertionCode: T(py`assert validate_product({"price_cents": 500}, partial=True) == {"price_cents": 500}, "With partial=True, missing fields are fine and no defaults are added"
assert validate_product({}, partial=True) == {}
try:
    validate_product({"price_cents": -5}, partial=True)
except ApiError as e:
    assert e.details[0]["field"] == "price_cents"
else:
    assert False, "A bad value is still rejected when partial=True"
try:
    validate_product({"id": 7}, partial=True)
except ApiError as e:
    assert e.details[0]["field"] == "id", "Clients cannot set id: it is not a product field"
else:
    assert False, "Unknown fields are rejected even when partial=True"`),
      },
      {
        id: "t5",
        description: "POST /products creates a product (201 + Location)",
        assertionCode: T(py`reset_db()
body = {"sku": "TST-001", "name": "Test Lamp", "description": "A lamp.", "category": "lighting", "price_cents": 2500, "stock": 4}
r = _c("POST", "/products", body)
assert r["status"] == 201, "Creating should return 201 Created, got " + str(r["status"]) + " " + str(r["body"])
p = r["body"]
assert p["id"] == 17 and p["sku"] == "TST-001" and p["price_cents"] == 2500 and p["stock"] == 4, "The body should be the new product, including its generated id (17)"
assert _hdr(r, "Location") == "/products/17", "Location should be /products/17, got " + repr(_hdr(r, "Location"))
g = _c("GET", "/products/17")
assert g["status"] == 200 and g["body"] == p, "GET after POST should return the same product"
assert _c("GET", "/products")["body"]["total"] == 17`),
      },
      {
        id: "t6",
        description: "Invalid bodies are 422 and change nothing",
        assertionCode: T(py`reset_db()
r = _c("POST", "/products", {"name": "No sku", "category": "desk", "price": 10})
assert r["status"] == 422, "A body with missing/unknown fields is 422, got " + str(r["status"])
assert _code(r) == "validation_error"
fields = {d["field"] for d in r["body"]["error"]["details"]}
assert {"sku", "price_cents", "price"} <= fields, "details should name sku (missing), price_cents (missing) and price (unknown), got " + str(sorted(fields))
r = _c("POST", "/products", {"sku": "TST-001", "name": "Minus", "category": "desk", "price_cents": -100})
assert r["status"] == 422
assert _c("GET", "/products")["body"]["total"] == 16, "Rejected requests must not create anything"`),
      },
      {
        id: "t7",
        description: "Broken JSON is 400; a duplicate SKU is 409",
        assertionCode: T(py`reset_db()
r = _c("POST", "/products", "{this is not json")
assert r["status"] == 400 and _code(r) == "invalid_json", "A broken JSON body is 400 invalid_json, got " + str(r["status"])
assert _c("POST", "/products", [1, 2, 3])["status"] == 400, "A JSON array is not an object: 400"
assert _c("POST", "/products")["status"] == 400, "No body at all: 400"
dup = {"sku": "AUD-001", "name": "Clone", "category": "audio", "price_cents": 100}
r = _c("POST", "/products", dup)
assert r["status"] == 409, "A SKU that already exists should return 409 Conflict, got " + str(r["status"])
assert _code(r) == "conflict" and r["body"]["error"]["details"][0]["field"] == "sku", "The conflict error should have code 'conflict' and name the sku field"
assert "UNIQUE" not in r["body"]["error"]["message"], "Write a friendly message, not SQLite's raw text"
assert _c("GET", "/products")["body"]["total"] == 16`),
      },
      {
        id: "t8",
        description: "integrity_middleware maps constraint failures",
        assertionCode: T(py`import sqlite3
assert integrity_middleware in app.middleware, "Register it with app.use(integrity_middleware)"
assert app.middleware.index(errors_middleware) < app.middleware.index(integrity_middleware), "errors_middleware must stay the outer layer"
def run(message):
    a = App()
    a.use(errors_middleware)
    a.use(integrity_middleware)
    @a.get("/x")
    def x(request):
        raise sqlite3.IntegrityError(message)
    return a.handle({"method": "GET", "path": "/x"})
assert run("UNIQUE constraint failed: users.email")["status"] == 409, "UNIQUE failures are 409"
assert run("UNIQUE constraint failed: users.email")["body"]["error"]["details"][0]["field"] == "email", "Name the column that clashed"
assert run("FOREIGN KEY constraint failed")["status"] == 409, "FOREIGN KEY failures are 409"
assert run("NOT NULL constraint failed: products.name")["status"] == 422, "NOT NULL failures are 422"
assert run("CHECK constraint failed: price_cents >= 0")["status"] == 422, "CHECK failures are 422"`),
      },
    ],
    unlocks: ["store-create"],
    checks: [
      {
        prompt: "Which response best fits a successful `POST /products`?",
        question: {
          type: "choice",
          options: [
            "201 Created, a Location header and the new product in the body",
            "200 OK with {\"success\": true}",
            "204 No Content",
            "202 Accepted with no Location",
          ],
          answer: 0,
        },
        explanation:
          "201 says a new resource exists, `Location` tells the client where, and returning the representation spares it a second request and includes the server-generated `id`.",
      },
      {
        prompt: "Match the situation to the status: the body is `{\"sku\": \"AUD-001\", ...}`, the JSON is valid, every field is fine, but AUD-001 already exists.",
        question: { type: "choice", options: ["409 Conflict", "400 Bad Request", "422 Unprocessable", "404 Not Found"], answer: 0 },
        explanation:
          "The data is acceptable in isolation, it just clashes with the current state of the system. 400 means unparseable, 422 means the values themselves are not valid.",
      },
      {
        prompt: "Why isn't \"look up the SKU, then insert if it is free\" enough to prevent duplicates?",
        question: {
          type: "choice",
          options: [
            "Another request can insert the same SKU between your check and your insert; only the UNIQUE constraint is atomic",
            "SQLite cannot run SELECT before INSERT",
            "SKUs are case-insensitive",
            "The check is too slow",
          ],
          answer: 0,
        },
        explanation:
          "Check-then-act is a race condition. The database applies the UNIQUE rule atomically at insert time, so keep the constraint as the final guard and just translate its error.",
      },
    ],
  },

  // ───────────────────────────────────────── 9. modify
  {
    id: "store-api-9-modify",
    title: "Update and delete",
    minutes: 30,
    xp: 160,
    concepts: ["PUT vs PATCH", "DELETE", "204 No Content", "idempotency", "mass assignment"],
    learn: `### Three ways to change a product

- **\`PUT /products/3\`** replaces the resource with the document you send. Send the whole thing; anything you leave out goes back to its default. Because the result depends only on the body, PUT is **idempotent**.
- **\`PATCH /products/3\`** changes only the fields you send. Great for "set the price" without re-sending everything. In practice it is idempotent too when it sets values (it would not be if it said "add 1 to stock").
- **\`DELETE /products/3\`** removes it. Success is **204 No Content**: nothing to send back.

~~~http
PUT    /products/3  {"sku": "DSK-001", "name": "Walnut Stand", "category": "desk", "price_cents": 5200}
PATCH  /products/3  {"price_cents": 4500}
DELETE /products/3
~~~

### Idempotent does not mean the same status

Delete product 3 twice: the first returns 204, the second 404, because it is gone. That is still idempotent: the *state of the server* after one call and after ten is the same. Idempotency is about effect, not about the response.

### Order of checks

1. Does the resource exist? If not, **404**, whatever the body says.
2. Is the body parseable and valid? **400 / 422**.
3. Does it clash with other data? **409** (from the constraint).

That ordering stops a client from learning anything about products that do not exist, and keeps errors predictable.

### Only change what may change

Two safety ideas:

- **Mass assignment.** If you copy every key of the incoming JSON into an UPDATE, a client can set fields you never meant to expose (\`id\`, later \`role\` or \`is_admin\`). Your validator only accepts names in \`RULES\`, and only those become column names.
- **The id is not editable.** It comes from the URL. A body containing \`"id": 9\` is rejected as an unknown field.

### Building an UPDATE

The SET list is the keys you validated, joined as \`col = ?\`, and the values travel as parameters:

~~~python
assignments = ", ".join(f"{column} = ?" for column in fields)
conn.execute(f"UPDATE products SET {assignments} WHERE id = ?", [*fields.values(), product_id])
~~~

The f-string holds only names from \`RULES\`. The values (and the id) are parameters.

### Lost updates (a peek ahead)

Two admins edit the same product from the same page and the second save silently wipes the first. Real APIs prevent that with **optimistic concurrency**: send a version or \`ETag\` back with the resource, and require \`If-Match\` on update; a mismatch is **412 Precondition Failed** (or 409).

### Hard delete or soft delete?

\`DELETE\` here removes the row. Many systems instead set a \`deleted_at\` column and filter it out, which keeps history and allows undo. Foreign keys matter too: a product that appears in an order cannot simply vanish; you will see that arrive as a **409** in lesson 12.

### In frameworks

\`\`\`python
# Flask:   @app.route("/products/<int:id>", methods=["PUT", "PATCH", "DELETE"])
# FastAPI: @app.put("/products/{id}"), @app.patch(...), @app.delete(..., status_code=204)
# Django REST Framework: ModelViewSet gives you update (PUT), partial_update (PATCH) and destroy (DELETE)
\`\`\`

### Common mistakes

- Implementing PATCH as a PUT, or PUT as a PATCH.
- Answering 200 with an empty body for DELETE (204 says it clearly).
- Letting a body overwrite \`id\`.
- Validating before checking the resource exists.`,
    mission: `Prices change, stock runs out, products retire. Finish the CRUD set: replace a product with PUT, adjust a few fields with PATCH, and remove one with DELETE.

The admin panel in the storefront gains Edit and Delete buttons, and the list refreshes from your API after every change.`,
    tasks: [
      "require_product(product_id): the product, or ApiError 404; update_product(product_id, fields) runs a parameterized UPDATE",
      "PUT /products/{product_id:int}: replace completely (omitted optional fields go back to their defaults)",
      "PATCH /products/{product_id:int}: change only the fields sent; an empty body is a 422",
      "DELETE /products/{product_id:int}: 204 with no body; deleting a missing product is a 404",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: update and delete.


def require_product(product_id):
    """The product dict, or raise ApiError(404, "not_found", ...)."""
    ...


def update_product(product_id, fields):
    """UPDATE the given fields (a dict of already validated column -> value) and return the product.
    The SET list is built from the dict's keys; the values and the id are ? parameters."""
    ...


@app.put("/products/{product_id:int}")
def replace_product(request):
    """Replace a product completely: 404 first, then validate the full body (validate_product)."""
    ...


@app.patch("/products/{product_id:int}")
def patch_product(request):
    """Change some fields: validate_product(..., partial=True). An empty change is a 422."""
    ...


@app.delete("/products/{product_id:int}")
def delete_product(request):
    """Remove the product and answer 204 with no body."""
    ...
`,
    solutionAdd: py`def require_product(product_id):
    """The product dict, or a 404."""
    product = get_product(product_id)
    if product is None:
        raise ApiError(404, "not_found", f"Product {product_id} does not exist")
    return product


def update_product(product_id, fields):
    assignments = ", ".join(f"{column} = ?" for column in fields)  # column names come from RULES
    with get_db() as conn:
        conn.execute(f"UPDATE products SET {assignments} WHERE id = ?", [*fields.values(), product_id])
    return get_product(product_id)


@app.put("/products/{product_id:int}")
def replace_product(request):
    """Replace a product completely."""
    product_id = request["params"]["product_id"]
    require_product(product_id)
    fields = validate_product(read_json(request))
    return json_response(200, update_product(product_id, fields))


@app.patch("/products/{product_id:int}")
def patch_product(request):
    """Change some fields of a product."""
    product_id = request["params"]["product_id"]
    require_product(product_id)
    changes = validate_product(read_json(request), partial=True)
    if not changes:
        raise ApiError(422, "validation_error", "Send at least one field to change.", [{"field": "(body)", "message": "must contain at least one field"}])
    return json_response(200, update_product(product_id, changes))


@app.delete("/products/{product_id:int}")
def delete_product(request):
    """Delete a product."""
    product_id = request["params"]["product_id"]
    require_product(product_id)
    with get_db() as conn:
        conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
    return json_response(204)`,
    explanation:
      "All three handlers check that the product exists before looking at the body, so a missing resource is always a 404. PUT validates the full document, which re-applies the defaults and therefore resets omitted optional fields; PATCH validates with partial=True and updates only what was sent. update_product builds its SET list from validated keys only, so no client text becomes SQL. DELETE returns 204 with no body, and deleting again is a 404 while the server state stays the same.",
    hints: [
      { id: "h1", title: "Shared helper", content: "require_product(product_id) is the same 404 check as in show_product. Call it first in every handler." },
      { id: "h2", title: "Dynamic SET", content: 'assignments = ", ".join(f"{column} = ?" for column in fields) then conn.execute(f"UPDATE products SET {assignments} WHERE id = ?", [*fields.values(), product_id]) inside "with get_db() as conn".' },
      { id: "h3", title: "204", content: "return json_response(204): no body, so no Content-Type. For PATCH, `if not changes:` raise a 422 before calling update_product with an empty dict." },
    ],
    tests: [
      {
        id: "t1",
        description: "PUT replaces the product and resets omitted optional fields",
        assertionCode: T(py`reset_db()
new = {"sku": "DSK-001", "name": "Walnut Stand", "category": "desk", "price_cents": 5200}
r = _c("PUT", "/products/4", new)
assert r["status"] == 200, "PUT should return 200 with the updated product, got " + str(r["status"]) + " " + str(r["body"])
p = r["body"]
assert p["name"] == "Walnut Stand" and p["price_cents"] == 5200 and p["id"] == 4, "The fields sent should be stored and the id kept"
assert p["description"] == "" and p["stock"] == 0, "PUT replaces the whole resource, so omitted optional fields go back to their defaults (description '', stock 0). Got " + str(p)
assert _c("GET", "/products/4")["body"] == p
r2 = _c("PUT", "/products/4", new)
assert r2["body"] == p, "PUT is idempotent: sending it again changes nothing"`),
      },
      {
        id: "t2",
        description: "PUT validates, and a missing product is 404 first",
        assertionCode: T(py`reset_db()
r = _c("PUT", "/products/4", {"name": "Only a name"})
assert r["status"] == 422, "PUT needs the full document: missing sku/category/price_cents is 422, got " + str(r["status"])
assert _c("GET", "/products/4")["body"]["name"] == "Walnut Laptop Stand", "A rejected PUT must not change anything"
r = _c("PUT", "/products/9999", {"sku": "ZZZ-999", "name": "Ghost", "category": "desk", "price_cents": 1})
assert r["status"] == 404, "PUT on a product that does not exist is 404, got " + str(r["status"])
r = _c("PUT", "/products/9999", {"bad": "body"})
assert r["status"] == 404, "Check that the product exists before validating the body"
r = _c("PUT", "/products/4", {"id": 99, "sku": "DSK-001", "name": "X", "category": "desk", "price_cents": 1})
assert r["status"] == 422, "A client may not set the id"`),
      },
      {
        id: "t3",
        description: "PATCH changes only the fields sent",
        assertionCode: T(py`reset_db()
before = _c("GET", "/products/2")["body"]
r = _c("PATCH", "/products/2", {"price_cents": 3500})
assert r["status"] == 200, "PATCH should return 200, got " + str(r["status"]) + " " + str(r["body"])
after = r["body"]
assert after["price_cents"] == 3500, "The price should change"
assert {k: v for k, v in after.items() if k != "price_cents"} == {k: v for k, v in before.items() if k != "price_cents"}, "Every other field must stay exactly as it was"
r = _c("PATCH", "/products/2", {"stock": 0, "name": "Pocket Speaker Mini"})
assert r["body"]["stock"] == 0 and r["body"]["name"] == "Pocket Speaker Mini" and r["body"]["price_cents"] == 3500`),
      },
      {
        id: "t4",
        description: "PATCH rejects empty, invalid and unknown changes",
        assertionCode: T(py`reset_db()
r = _c("PATCH", "/products/2", {})
assert r["status"] == 422, "PATCH with nothing to change is 422, got " + str(r["status"])
r = _c("PATCH", "/products/2", {"price_cents": -1})
assert r["status"] == 422, "A bad value is 422"
r = _c("PATCH", "/products/2", {"id": 50})
assert r["status"] == 422, "The id cannot be patched"
assert _c("GET", "/products/2")["body"]["price_cents"] == 3900, "Nothing should have changed"
assert _c("PATCH", "/products/9999", {"stock": 1})["status"] == 404
assert _c("PATCH", "/products/2", "{broken")["status"] == 400`),
      },
      {
        id: "t5",
        description: "Changing a SKU to one that exists is a 409",
        assertionCode: T(py`reset_db()
r = _c("PATCH", "/products/2", {"sku": "AUD-001"})
assert r["status"] == 409, "Taking another product's SKU should be 409 Conflict, got " + str(r["status"])
assert _code(r) == "conflict"
assert _c("GET", "/products/2")["body"]["sku"] == "AUD-002", "The failed update must be rolled back"
r = _c("PATCH", "/products/2", {"sku": "AUD-002"})
assert r["status"] == 200, "Setting a product's own SKU to itself is fine"`),
      },
      {
        id: "t6",
        description: "DELETE answers 204 and the product is gone",
        assertionCode: T(py`reset_db()
r = _c("DELETE", "/products/5")
assert r["status"] == 204, "DELETE should return 204 No Content, got " + str(r["status"])
assert r["body"] is None, "A 204 has no body"
assert _hdr(r, "Content-Type") is None, "No body, so no Content-Type"
assert _c("GET", "/products/5")["status"] == 404, "The product should be gone"
assert _c("GET", "/products")["body"]["total"] == 15
r = _c("DELETE", "/products/5")
assert r["status"] == 404, "Deleting something already deleted is a 404, got " + str(r["status"])
assert _c("GET", "/products")["body"]["total"] == 15, "...and the state is the same as after the first delete"`),
      },
    ],
    unlocks: ["store-modify"],
    checks: [
      {
        prompt: "Which pair of statements is correct?",
        question: {
          type: "choice",
          options: [
            "PUT replaces the whole resource; PATCH changes only the fields you send",
            "PUT changes only some fields; PATCH replaces the whole resource",
            "PUT creates and PATCH deletes",
            "They are interchangeable",
          ],
          answer: 0,
        },
        explanation:
          "PUT is a full replacement, which is why omitted fields revert to defaults. PATCH is a partial update. Using one for the other surprises clients.",
      },
      {
        prompt: "`DELETE /products/3` returns 204 the first time and 404 the second time. Is DELETE still idempotent?",
        question: {
          type: "choice",
          options: [
            "Yes: idempotency is about the server's state afterwards, which is the same after one call or many",
            "No: idempotent calls must always return the same status",
            "No: only GET is idempotent",
            "It depends on the database",
          ],
          answer: 0,
        },
        explanation:
          "After the first call the product is gone, and further calls leave it gone. The status differs because the situation differs, but nothing else changes.",
      },
      {
        prompt: "A client sends `PATCH /products/3` with `{\"id\": 99, \"price_cents\": 100}`. Why must the server not simply copy every key into the UPDATE?",
        question: {
          type: "choice",
          options: [
            "That lets clients set fields they should not control (mass assignment), like ids or later roles",
            "Because UPDATE can only set one column",
            "Because JSON keys are case-sensitive",
            "Because it would be slower",
          ],
          answer: 0,
        },
        explanation:
          "Treat the writable fields as an allow-list. Copying whatever arrives lets a client change anything the table has, which is how accounts get promoted to admin.",
      },
    ],
  },

  // ───────────────────────────────────────── 10. auth
  {
    id: "store-api-10-auth",
    title: "Who are you? Passwords and tokens",
    minutes: 40,
    xp: 200,
    concepts: ["authentication", "password hashing", "salt", "hmac", "bearer tokens", "401"],
    learn: `### Authentication answers "who is this?"

Until now anyone could create products. To change that you first need to know who is calling. The flow most APIs use:

1. The user sends **credentials** once (\`POST /auth/login\`, email and password).
2. The server checks them and returns a **token**: a long random string.
3. Every later request carries it in a header: \`Authorization: Bearer <token>\`.

The server never needs the password again, and (HTTP being stateless) each request proves itself.

### Never store a password

If the table holds passwords and it leaks (it will, one day, somewhere), every account is lost, plus every other site where people reused that password. So you store a **hash**: a one-way fingerprint. On login you hash the attempt and compare.

A good password hash is:

- **Salted**: a random value stored beside the hash and mixed in, so identical passwords produce different hashes and precomputed tables are useless. Generate it with \`secrets.token_bytes(16)\`, one per user.
- **Slow on purpose**: a *key derivation function* repeats its work many thousands of times, so checking one guess costs milliseconds for you but trying billions of guesses is hopelessly expensive for an attacker. The number of repetitions is the **work factor** (iterations).
- **Compared in constant time** with \`hmac.compare_digest\`, not \`==\`, so timing does not leak how many characters matched.

Never use a plain fast hash (MD5, SHA-1, one round of SHA-256): GPUs test billions of those per second. Python's standard library gives you \`hashlib.pbkdf2_hmac\` (PBKDF2, a long-standing standard) and \`hashlib.scrypt\`. Production frameworks often go one step further with **argon2id** or **bcrypt**: Django defaults to PBKDF2 and supports argon2 and bcrypt, and Flask and FastAPI projects usually add \`argon2-cffi\`, \`bcrypt\` or \`passlib\`. The structure you write here is the same for all of them.

~~~python
import hashlib, secrets

salt = secrets.token_bytes(16)
digest = hashlib.pbkdf2_hmac("sha256", b"hunter2", salt, 20_000)
stored = "$".join(["pbkdf2_sha256", "20000", salt.hex(), digest.hex()])   # algorithm$iterations$salt$hash
~~~

Storing the algorithm and the iteration count *inside the string* is what lets you raise the work factor later: old hashes keep verifying with their own count, and you can re-hash at the next login. To verify, split the stored string, recompute with its salt and count, and compare with \`hmac.compare_digest\`.

**How many iterations?** Current security guidance (OWASP's password storage cheat sheet) asks for **600,000** iterations of PBKDF2-HMAC-SHA256, tuned so one check takes a noticeable fraction of a second on your server, and revisited every few years as hardware gets faster. The reason is simple: your cost per login and the attacker's cost per guess scale together, so you spend as much time as your users will tolerate. This demo uses **20,000** so that signing in, rebuilding the database and running your test suite all fit the time limit of a lesson in the browser (a hash takes about 10 ms here). Treat the number as configuration, and never ship it that low.

*Hashing is not encryption*: there is no key that gets the password back. That is the point.

### Tokens: random, expiring, hashed at rest

A token must be unguessable, so generate it with \`secrets.token_urlsafe(24)\` (never the \`random\` module, which is predictable). Store it with an **expiry time**. And store only its **SHA-256 hash**, like a password: if someone reads your database they cannot use the tokens inside it. The raw token is shown to the client exactly once, in the login response.

Compared with signed tokens (JWT), these *opaque* tokens are looked up in the database. That costs a query per request, but logging someone out is just deleting a row.

### Login errors that don't help attackers

Unknown email and wrong password must give the **same** answer: **401** with the same message (\`"Email or password is incorrect."\`). Otherwise your login form tells attackers which emails have accounts. Add a \`WWW-Authenticate: Bearer\` header so clients know what scheme the API uses.

### Registration

\`POST /auth/register\` validates email and password (length, at least), lower-cases the email, stores the hash, and returns the **public** view of the user: id, email, role. Never \`password_hash\`. The role comes from the server (new accounts are \`customer\`), never from the request body; that is the mass-assignment trap from last lesson with much worse consequences. A duplicate email trips the UNIQUE constraint, and your middleware already makes that a 409.

### In frameworks

\`\`\`python
# Django: ships PBKDF2/Argon2 hashers, make_password() / check_password(), sessions
# Flask: Flask-Login (sessions) or Flask-JWT-Extended
# FastAPI: OAuth2PasswordBearer + a dependency that reads the Authorization header
\`\`\`

### Common mistakes

- MD5, SHA-1 or a single unsalted SHA-256 for passwords.
- Comparing hashes with \`==\`.
- Tokens from \`random\`, tokens in URLs (they end up in logs), logging the \`Authorization\` header.
- Different errors for "no such user" and "bad password".`,
    mission: `Every shop needs accounts. Add users and sessions: registration, login with a properly hashed password, and an expiring bearer token that is stored hashed too.

The storefront gains an **Account** screen: sign in as the demo admin or customer, register a new account, and see who the API thinks you are. (Writing products is still open to everyone until the next lesson.)`,
    tasks: [
      "hash_password(password, salt=None, iterations) and verify_password(password, stored): PBKDF2-HMAC-SHA256 with a random per-user salt, stored as algorithm$iterations$salt$hash, compared with hmac.compare_digest",
      "Schema + seed: users (UNIQUE email, hash, role) and tokens (hash of token, expiry), registered with @on_reset",
      "POST /auth/register (validate, role is always customer) and POST /auth/login (same 401 for unknown email and wrong password)",
      "bearer_token(), user_for_token() (hash lookup, expiry) and GET /me",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: accounts, password hashing and bearer tokens.
import hashlib
import hmac
import secrets
import time

PBKDF2_ITERATIONS = 20_000  # OWASP asks for 600_000+; kept small so a browser lesson stays fast
TOKEN_TTL = 3600  # seconds a login token stays valid

# demo accounts (a seed script is the one place plain passwords may appear; never in real data)
USERS_SEED = [
    ("admin@pocketstore.test", "admin-pass-123", "admin"),
    ("sam@example.com", "sam-pass-456", "customer"),
]
SEED_HASHES = {}  # email -> hash, computed once per page so rebuilding the database stays instant


def hash_password(password, salt=None, iterations=PBKDF2_ITERATIONS):
    """'pbkdf2_sha256$iterations$salt_hex$hash_hex'. salt is bytes; default secrets.token_bytes(16).
    The hash is hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations).hex()."""
    ...


def verify_password(password, stored):
    """Split the stored string, re-hash the attempt with ITS salt and iteration count, and compare with
    hmac.compare_digest. A malformed or unknown-algorithm string is simply False, never an exception."""
    ...


def hash_token(token):
    """SHA-256 hex digest of the token (only this is stored)."""
    ...


@on_reset
def create_auth_schema(conn):
    """users: id, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
             role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin'))
    tokens: token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at REAL NOT NULL"""
    ...


@on_reset
def seed_users(conn):
    """Insert USERS_SEED with hashed passwords (hash each one only once: reuse SEED_HASHES)."""
    ...


def public_user(row):
    """Only id, email and role: never the hash."""
    ...


def bearer_token(request):
    """The token from 'Authorization: Bearer <token>' (scheme is case-insensitive), or None."""
    ...


def user_for_token(token):
    """The public user dict for a token that exists and has not expired, else None."""
    ...


@app.post("/auth/register")
def register(request):
    """email (valid-looking) and password (8+ characters) -> 201 with the public user, role customer.
    Problems are a 422 listing each field. A duplicate email is caught by integrity_middleware."""
    ...


@app.post("/auth/login")
def login(request):
    """Correct credentials -> 200 {"token", "token_type": "Bearer", "expires_in", "user"}.
    Anything wrong -> ApiError 401 "invalid_credentials", same message for every failure,
    with the header WWW-Authenticate: Bearer."""
    ...


@app.get("/me")
def me(request):
    """The signed-in user, or ApiError 401 "unauthorized" (with WWW-Authenticate: Bearer)."""
    ...
`,
    solutionAdd: py`import hashlib
import hmac
import secrets
import time

PBKDF2_ITERATIONS = 20_000  # OWASP asks for 600_000+; kept small so a browser lesson stays fast
TOKEN_TTL = 3600  # seconds a login token stays valid

# demo accounts (a seed script is the one place plain passwords may appear; never in real data)
USERS_SEED = [
    ("admin@pocketstore.test", "admin-pass-123", "admin"),
    ("sam@example.com", "sam-pass-456", "customer"),
]
SEED_HASHES = {}  # email -> hash, computed once per page so rebuilding the database stays instant
EMAIL_PATTERN = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


def hash_password(password, salt=None, iterations=PBKDF2_ITERATIONS):
    """'pbkdf2_sha256$iterations$salt_hex$hash_hex': slow, salted and self-describing."""
    salt = salt if salt is not None else secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return "$".join(("pbkdf2_sha256", str(iterations), salt.hex(), digest.hex()))


def verify_password(password, stored):
    try:
        algorithm, iterations, salt_hex, _ = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        expected = hash_password(password, bytes.fromhex(salt_hex), int(iterations))
    except ValueError:
        return False  # a malformed record must never crash a login
    return hmac.compare_digest(expected, stored)  # constant-time compare


def hash_token(token):
    return hashlib.sha256(token.encode()).hexdigest()


@on_reset
def create_auth_schema(conn):
    conn.executescript(
        """
        CREATE TABLE users (
            id            INTEGER PRIMARY KEY,
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin'))
        );
        CREATE TABLE tokens (
            token_hash TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at REAL NOT NULL
        );
        """
    )


@on_reset
def seed_users(conn):
    with conn:
        for email, password, role in USERS_SEED:
            if email not in SEED_HASHES:  # hashing is slow on purpose: do it once, not on every rebuild
                SEED_HASHES[email] = hash_password(password)
            conn.execute(
                "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                (email, SEED_HASHES[email], role),
            )


def public_user(row):
    """What the outside world may see of a user."""
    return {"id": row["id"], "email": row["email"], "role": row["role"]}


def bearer_token(request):
    scheme, _, token = request["headers"].get("authorization", "").partition(" ")
    token = token.strip()
    return token if scheme.lower() == "bearer" and token else None


def issue_token(user_id):
    token = secrets.token_urlsafe(24)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (hash_token(token), user_id, time.time() + TOKEN_TTL),
        )
    return token  # the only time the raw token exists


def user_for_token(token):
    row = get_db().execute(
        "SELECT users.id, users.email, users.role FROM tokens JOIN users ON users.id = tokens.user_id "
        "WHERE tokens.token_hash = ? AND tokens.expires_at > ?",
        (hash_token(token), time.time()),
    ).fetchone()
    return public_user(row) if row else None


def unauthorized(code, message):
    return ApiError(401, code, message, headers={"WWW-Authenticate": "Bearer"})


@app.post("/auth/register")
def register(request):
    """Create a customer account."""
    data = read_json(request)
    email, password = data.get("email"), data.get("password")
    problems = []
    if not isinstance(email, str) or not EMAIL_PATTERN.fullmatch(email.strip()):
        problems.append({"field": "email", "message": "must be a valid email address"})
    if not isinstance(password, str) or len(password) < 8:
        problems.append({"field": "password", "message": "must be at least 8 characters"})
    if problems:
        raise ApiError(422, "validation_error", "The account data is not valid.", problems)
    with get_db() as conn:
        # the role is decided here, never taken from the request body
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'customer')",
            (email.strip().lower(), hash_password(password)),
        )
    row = get_db().execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return json_response(201, public_user(row))


@app.post("/auth/login")
def login(request):
    """Exchange an email and password for a bearer token."""
    data = read_json(request)
    email, password = data.get("email"), data.get("password")
    row = None
    if isinstance(email, str):
        row = get_db().execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
    # one message for every failure: do not reveal which emails have accounts
    if row is None or not isinstance(password, str) or not verify_password(password, row["password_hash"]):
        raise unauthorized("invalid_credentials", "Email or password is incorrect.")
    token = issue_token(row["id"])
    return json_response(200, {"token": token, "token_type": "Bearer", "expires_in": TOKEN_TTL, "user": public_user(row)})


@app.get("/me")
def me(request):
    """Who am I?"""
    token = bearer_token(request)
    user = user_for_token(token) if token else None
    if user is None:
        raise unauthorized("unauthorized", "Sign in to continue.")
    return json_response(200, user)`,
    explanation:
      "Passwords are stored as salt$hash, never in the clear: the salt makes equal passwords differ, the many rounds make guessing expensive, and compare_digest avoids timing leaks. Login gives one identical 401 for an unknown email and a wrong password. The token is random, expires, and only its hash is stored, so a database leak does not hand out live sessions. Registration decides the role on the server; the request body can never promote an account.",
    hints: [
      { id: "h1", title: "Hashing", content: 'salt = salt if salt is not None else secrets.token_bytes(16); digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations); join "pbkdf2_sha256", str(iterations), salt.hex() and digest.hex() with "$". To verify: split on "$", recompute with that salt and iteration count, then hmac.compare_digest against the stored string.' },
      { id: "h2", title: "Tokens", content: "token = secrets.token_urlsafe(24); store hash_token(token) with expires_at = time.time() + TOKEN_TTL; return the raw token once. To look up: WHERE token_hash = ? AND expires_at > ? with (hash_token(token), time.time())." },
      { id: "h3", title: "Login", content: 'Fetch the user by lower-cased email. If there is no row OR verify_password fails, raise the SAME ApiError(401, "invalid_credentials", ...) with headers={"WWW-Authenticate": "Bearer"}. Only then issue_token.' },
    ],
    tests: [
      {
        id: "t1",
        description: "Passwords are salted, stretched and verified",
        assertionCode: T(py`import hashlib
a = hash_password("hunter2")
b = hash_password("hunter2")
assert "hunter2" not in a, "The stored value must not contain the password"
parts = a.split("$")
assert len(parts) == 4 and parts[0] == "pbkdf2_sha256", "Format is algorithm$iterations$salt$hash and starts with pbkdf2_sha256, got " + a
assert int(parts[1]) >= 10000, "Use a high iteration count (at least 10000 here; production uses far more)"
assert len(bytes.fromhex(parts[2])) >= 16, "The salt must be at least 16 random bytes (stored hex-encoded)"
assert parts[3] == hashlib.pbkdf2_hmac("sha256", b"hunter2", bytes.fromhex(parts[2]), int(parts[1])).hex(), "The last part must be hashlib.pbkdf2_hmac('sha256', password, salt, iterations).hex()"
assert a != b, "Two hashes of the same password must differ (a new random salt each time)"
salt = bytes(range(16))
assert hash_password("hunter2", salt) == hash_password("hunter2", salt), "With the same salt the result is repeatable"
assert hash_password("hunter2", salt) != hash_password("hunter2", bytes(range(1, 17))), "A different salt gives a different hash"
assert hash_password("hunter2", salt, 1000).split("$")[1] == "1000", "The iterations argument must be used and recorded in the string"
assert verify_password("hunter2", a) is True, "The right password must verify"
assert verify_password("hunter3", a) is False and verify_password("", a) is False, "A wrong password must not verify"
assert verify_password("pässwörd✓", hash_password("pässwörd✓")) is True, "Unicode passwords should work"`),
      },
      {
        id: "t1b",
        description: "verify_password uses the stored iteration count and survives bad records",
        assertionCode: T(py`old = hash_password("hunter2", bytes(16), 1000)
assert verify_password("hunter2", old) is True, "A hash made with 1000 iterations must still verify: read the count from the stored string, not from the constant"
assert verify_password("wrong", old) is False
for junk in ["", "plaintext", "a$b$c", "md5$1000$00$00", "pbkdf2_sha256$x$00$00", "pbkdf2_sha256$1000$zz$00"]:
    assert verify_password("hunter2", junk) is False, "A malformed or unknown hash record " + repr(junk) + " must verify as False, not raise"`),
      },
      {
        id: "t2",
        description: "Users are stored with hashes, never plain passwords",
        assertionCode: T(py`reset_db()
rows = get_db().execute("SELECT email, password_hash, role FROM users ORDER BY id").fetchall()
assert [r["email"] for r in rows] == ["admin@pocketstore.test", "sam@example.com"], "Seed both demo users in USERS_SEED order"
assert [r["role"] for r in rows] == ["admin", "customer"]
for r in rows:
    assert "pass" not in r["password_hash"] and "$" in r["password_hash"], "password_hash must be a salt$hash value, not the password"
assert verify_password("admin-pass-123", rows[0]["password_hash"]), "The seeded admin password should verify"`),
      },
      {
        id: "t3",
        description: "Login returns a token and the public user",
        assertionCode: T(py`import json
reset_db()
r = _c("POST", "/auth/login", {"email": "sam@example.com", "password": "sam-pass-456"})
assert r["status"] == 200, "Correct credentials should return 200, got " + str(r["status"]) + " " + str(r["body"])
b = r["body"]
assert isinstance(b["token"], str) and len(b["token"]) >= 20, "token should be a long random string"
assert b["token_type"] == "Bearer" and b["expires_in"] == 3600, "Include token_type 'Bearer' and expires_in 3600"
assert b["user"] == {"id": 2, "email": "sam@example.com", "role": "customer"}, "user should be the public view {id, email, role}, got " + str(b["user"])
assert "password" not in json.dumps(r["body"]), "Never send the password or hash back"
assert r["body"]["token"] != _c("POST", "/auth/login", {"email": "sam@example.com", "password": "sam-pass-456"})["body"]["token"], "Every login makes a new token"
assert _c("POST", "/auth/login", {"email": " SAM@Example.com ", "password": "sam-pass-456"})["status"] == 200, "Emails are case-insensitive"`),
      },
      {
        id: "t4",
        description: "Failed logins are 401 and reveal nothing",
        assertionCode: T(py`reset_db()
wrong = _c("POST", "/auth/login", {"email": "sam@example.com", "password": "nope"})
ghost = _c("POST", "/auth/login", {"email": "ghost@example.com", "password": "nope"})
assert wrong["status"] == 401 and ghost["status"] == 401, "Bad credentials are 401, got " + str(wrong["status"]) + " and " + str(ghost["status"])
assert wrong["body"] == ghost["body"], "Unknown email and wrong password must give the identical error, or attackers can find which emails exist"
assert _code(wrong) == "invalid_credentials"
assert _hdr(wrong, "WWW-Authenticate") == "Bearer", "401 responses should say which scheme to use: WWW-Authenticate: Bearer"
assert _c("POST", "/auth/login", {})["status"] == 401, "Missing fields cannot log in"
assert _c("POST", "/auth/login", {"email": 5, "password": ["x"]})["status"] == 401, "Wrong types cannot log in"
assert _c("POST", "/auth/login", "{broken")["status"] == 400, "A broken JSON body is still a 400"`),
      },
      {
        id: "t5",
        description: "GET /me needs a valid bearer token",
        assertionCode: T(py`reset_db()
token = _sam()
r = _c("GET", "/me", token=token)
assert r["status"] == 200 and r["body"]["email"] == "sam@example.com", "A valid token should identify the user, got " + str(r["status"])
assert _c("GET", "/me", headers={"authorization": "bearer " + token})["status"] == 200, "The scheme name is case-insensitive"
r = _c("GET", "/me")
assert r["status"] == 401 and _code(r) == "unauthorized" and _hdr(r, "WWW-Authenticate") == "Bearer", "No token: 401 'unauthorized' with WWW-Authenticate"
assert _c("GET", "/me", token="not-a-real-token")["status"] == 401, "An unknown token is 401"
assert _c("GET", "/me", headers={"Authorization": "Basic c2FtOnBhc3M="})["status"] == 401, "Only the Bearer scheme is accepted"
assert _c("GET", "/me", headers={"Authorization": "Bearer"})["status"] == 401, "A Bearer header without a token is 401"`),
      },
      {
        id: "t6",
        description: "Tokens are stored hashed and expire",
        assertionCode: T(py`import hashlib
reset_db()
token = _sam()
stored = [r[0] for r in get_db().execute("SELECT token_hash FROM tokens").fetchall()]
assert token not in stored and len(stored) == 1, "Never store the raw token in the database"
assert stored[0] == hashlib.sha256(token.encode()).hexdigest(), "Store the SHA-256 hex digest of the token"
with get_db() as conn:
    conn.execute("UPDATE tokens SET expires_at = 0")
r = _c("GET", "/me", token=token)
assert r["status"] == 401, "An expired token must be rejected, got " + str(r["status"])`),
      },
      {
        id: "t7",
        description: "Registration validates, hashes and never grants a role",
        assertionCode: T(py`reset_db()
r = _c("POST", "/auth/register", {"email": "New@Example.com", "password": "correct-horse"})
assert r["status"] == 201, "Registering should return 201, got " + str(r["status"]) + " " + str(r["body"])
assert r["body"] == {"id": 3, "email": "new@example.com", "role": "customer"}, "Return the public user with a lower-cased email and role customer, got " + str(r["body"])
assert _login("new@example.com", "correct-horse"), "The new account should be able to log in"
hacker = _c("POST", "/auth/register", {"email": "evil@example.com", "password": "long-enough-1", "role": "admin"})
assert hacker["status"] in (201, 422), "A role field is either ignored or rejected"
if hacker["status"] == 201:
    assert hacker["body"]["role"] == "customer", "The role must come from the server, never the request body"
r = _c("POST", "/auth/register", {"email": "SAM@example.com", "password": "another-pass-1"})
assert r["status"] == 409 and _code(r) == "conflict", "A duplicate email is 409 conflict (case-insensitive), got " + str(r["status"])
r = _c("POST", "/auth/register", {"email": "not-an-email", "password": "short"})
assert r["status"] == 422, "Bad email and short password: 422"
assert {d["field"] for d in r["body"]["error"]["details"]} == {"email", "password"}, "Report both problems"`),
      },
    ],
    unlocks: ["store-auth"],
    checks: [
      {
        prompt: "Why are passwords stored as salted hashes instead of encrypted?",
        question: {
          type: "choice",
          options: [
            "A hash cannot be reversed, so a leaked table does not reveal passwords; the salt stops precomputed attacks",
            "Hashes are shorter to store",
            "Encryption is illegal for passwords",
            "Salt makes login faster",
          ],
          answer: 0,
        },
        explanation:
          "Encryption can be undone with the key, and the key tends to leak along with the data. A salted, slow hash gives attackers nothing to reverse, and each guess costs work.",
      },
      {
        prompt: "A login for an unknown email says \"No account with that email\", and a wrong password says \"Wrong password\". What is wrong with that?",
        question: {
          type: "choice",
          options: [
            "It lets attackers discover which emails have accounts (account enumeration)",
            "The messages are too long",
            "It should return 403",
            "Nothing: friendly errors are better",
          ],
          answer: 0,
        },
        explanation:
          "Telling the cases apart turns your login form into a directory of your customers. Use one identical 401 message, and be just as careful with password-reset forms.",
      },
      {
        prompt: "Which should you use to create a login token?",
        question: {
          type: "choice",
          options: [
            "`secrets.token_urlsafe()`",
            "`random.random()` converted to text",
            "The user's email plus the current time",
            "An incrementing counter",
          ],
          answer: 0,
        },
        explanation:
          "`secrets` draws from the operating system's cryptographic random source. `random` is predictable, and anything derived from known values (email, time, counters) can be guessed.",
      },
    ],
  },

  // ───────────────────────────────────────── 11. roles
  {
    id: "store-api-11-roles",
    title: "Admin only: 401, 403 and roles",
    minutes: 30,
    xp: 180,
    concepts: ["authorization", "401 vs 403", "RBAC", "deny by default", "middleware"],
    learn: `### Authentication is not authorization

Lesson 10 answered "who are you?". Now: **"are you allowed to do this?"** Two different failures, two different statuses:

- **401 Unauthorized**: no credentials, or bad ones. The name is unfortunate; it really means *unauthenticated*. The client's fix: sign in. Include \`WWW-Authenticate\`.
- **403 Forbidden**: we know exactly who you are, and the answer is no. Signing in again will not help; you need a different account or role.

Mixing them up misleads clients. A web app might redirect to the login page on 401 but show "you don't have access" on 403.

### Roles

Each user has a **role** (\`customer\` or \`admin\`), stored in the database. Each endpoint requires a minimum: \`public\` (anyone), \`user\` (anyone signed in) or \`admin\`. This is **role-based access control (RBAC)**. Crucially the role comes from your database, looked up through the token, never from anything the client claims.

### One policy table, enforced in one place

Scattering \`if user.role != "admin"\` through every handler guarantees that you forget one. Instead keep a single table of *who may call what* and enforce it in a middleware:

~~~python
POLICY = {
    ("GET",  "/products"): "public",
    ("POST", "/products"): "admin",
    ("GET",  "/me"):       "user",
}
needed = POLICY.get((request["method"], request["route"]), "admin")
~~~

\`request["route"]\` is the route *pattern* the router matched (like \`/products/{product_id:int}\`), so ids in the URL don't matter. A table is also easy to review: it is your API's security map.

### Fail closed

Look at that \`.get(..., "admin")\`. A route nobody wrote a rule for is **admin-only**, not public. When you add an endpoint and forget the policy, the worst case is a 403 you notice immediately instead of an open door you never notice. **Deny by default** is a core security habit.

The middleware attaches \`request["user"]\` for every request that has a valid token, so handlers can use it (orders will need to know who is calling). A bad token on a *public* route is simply ignored: browsing the catalogue should not break because an old token expired.

### Object-level permissions

Roles say which *kind* of endpoint you may use. They don't say *whose data* you may touch: a customer may call \`GET /orders/7\`, but only if order 7 is theirs. That check lives in the handler (next lesson). Forgetting it is the most common serious API bug (called BOLA or IDOR in OWASP's lists).

### In frameworks

\`\`\`python
# Flask:   @login_required, @roles_required("admin") (Flask-Login / Flask-Security)
# FastAPI: def admin_only(user = Depends(current_user)) -> user, raising HTTPException(403)
# Django:  @permission_required("shop.change_product"), or DRF permission_classes
\`\`\`

### Common mistakes

- 403 for "not signed in" or 401 for "not allowed".
- Reading the role from the request (a header, a JSON field, a JWT claim you never verified).
- Checking permissions in some handlers but not others.
- Default-allow: forgetting a new route leaves it public.`,
    mission: `Right now any visitor can rewrite your catalogue. Lock it down: browsing stays public, but creating, changing and deleting products needs an **admin** token.

In the storefront the Admin panel now checks your session: signed out you see a 401 prompt, signed in as a customer you get a real 403, and only the admin account can edit products.`,
    tasks: [
      "POLICY: a (method, route pattern) -> 'public' / 'user' / 'admin' table covering every route so far",
      "auth_middleware: attach request['user'] from a valid bearer token; enforce the policy (no route match passes through to the 404/405; unlisted routes are admin-only)",
      "Missing or bad credentials raise 401 with WWW-Authenticate; a signed-in user without the role raises 403 \"forbidden\"",
      "Register it with app.use (inside errors_middleware)",
    ],
    starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: who may do what.

# TODO: (method, route pattern) -> required access: "public", "user" (any signed-in account) or "admin".
#   Public: GET /health, GET /products, GET /products/{product_id:int}, POST /auth/register, POST /auth/login
#   Signed in: GET /me
#   Admin: POST /products, PUT / PATCH / DELETE /products/{product_id:int}
POLICY = {}


def auth_middleware(request, call_next):
    """1. Attach request["user"] when a valid token is sent (otherwise leave it None).
    2. A request that matched no route (request["route"] is None) just continues, so the router can answer 404/405.
    3. Look up the needed access with POLICY.get((method, route), "admin"): unlisted routes fail closed.
    4. public -> continue. No user -> ApiError 401 "unauthorized" + WWW-Authenticate: Bearer.
       Needs admin but the user is a customer -> ApiError 403 "forbidden"."""
    ...


# TODO: register auth_middleware with app.use
`,
    solutionAdd: py`# (method, route pattern) -> who may call it. Routes missing from this table are admin-only.
POLICY = {
    ("GET", "/health"): "public",
    ("GET", "/products"): "public",
    ("GET", "/products/{product_id:int}"): "public",
    ("POST", "/auth/register"): "public",
    ("POST", "/auth/login"): "public",
    ("GET", "/me"): "user",
    ("POST", "/products"): "admin",
    ("PUT", "/products/{product_id:int}"): "admin",
    ("PATCH", "/products/{product_id:int}"): "admin",
    ("DELETE", "/products/{product_id:int}"): "admin",
}


def auth_middleware(request, call_next):
    """Identify the caller, then enforce POLICY. 401 = who are you? 403 = not allowed."""
    token = bearer_token(request)
    request["user"] = user_for_token(token) if token else None
    if request["route"] is None:
        return call_next(request)  # no such route: let the router answer 404 or 405
    needed = POLICY.get((request["method"], request["route"]), "admin")  # fail closed
    if needed == "public":
        return call_next(request)
    user = request["user"]
    if user is None:
        raise unauthorized("unauthorized", "Sign in to continue.")
    if needed == "admin" and user["role"] != "admin":
        raise ApiError(403, "forbidden", "You do not have permission to do this.")
    return call_next(request)


app.use(auth_middleware)`,
    explanation:
      "One table describes the API's security, and one middleware enforces it, so no handler can forget a check. The middleware first identifies the caller (request['user']), then compares what the route needs with who is calling: no user is 401, wrong role is 403. Routes missing from the table are admin-only, so a forgotten entry fails safe. Because it sits inside errors_middleware, the ApiErrors it raises become normal JSON responses.",
    hints: [
      { id: "h1", title: "Identify first", content: 'token = bearer_token(request); request["user"] = user_for_token(token) if token else None. Do this for every request, even public ones.' },
      { id: "h2", title: "Fail closed", content: 'needed = POLICY.get((request["method"], request["route"]), "admin"). Then: "public" -> return call_next(request); user is None -> raise 401; needed == "admin" and user["role"] != "admin" -> raise 403.' },
      { id: "h3", title: "Reuse", content: 'You already have unauthorized(code, message) from last lesson: it builds the 401 ApiError with the WWW-Authenticate header. For 403 use ApiError(403, "forbidden", "...").' },
    ],
    tests: [
      {
        id: "t1",
        description: "Public routes work without a token",
        assertionCode: T(py`reset_db()
assert _c("GET", "/health")["status"] == 200, "/health is public"
assert _c("GET", "/products")["status"] == 200, "Browsing the catalogue is public"
assert _c("GET", "/products/1")["status"] == 200
assert _c("POST", "/auth/login", {"email": "sam@example.com", "password": "sam-pass-456"})["status"] == 200, "Logging in cannot require a login"
assert _c("POST", "/auth/register", {"email": "z@example.com", "password": "long-enough-1"})["status"] == 201, "Registering is public"
assert _c("GET", "/nope")["status"] == 404, "Unknown routes are still 404 (not 401)"
assert _c("PUT", "/health")["status"] == 405, "Wrong methods are still 405"`),
      },
      {
        id: "t2",
        description: "Anonymous writes are 401 with WWW-Authenticate",
        assertionCode: T(py`reset_db()
body = {"sku": "TST-001", "name": "Test", "category": "desk", "price_cents": 100}
for method, path, payload in [("POST", "/products", body), ("PUT", "/products/1", body), ("PATCH", "/products/1", {"stock": 1}), ("DELETE", "/products/1", None), ("GET", "/me", None)]:
    r = _c(method, path, payload)
    assert r["status"] == 401, method + " " + path + " without a token should be 401, got " + str(r["status"])
    assert _code(r) == "unauthorized" and _hdr(r, "WWW-Authenticate") == "Bearer"
assert _c("GET", "/products")["body"]["total"] == 16, "Nothing may have changed"
assert _c("POST", "/products", body, token="garbage")["status"] == 401, "An invalid token is 401 too"`),
      },
      {
        id: "t3",
        description: "A customer is signed in but forbidden: 403",
        assertionCode: T(py`reset_db()
sam = _sam()
body = {"sku": "TST-001", "name": "Test", "category": "desk", "price_cents": 100}
for method, path, payload in [("POST", "/products", body), ("PUT", "/products/1", body), ("PATCH", "/products/1", {"stock": 1}), ("DELETE", "/products/1", None)]:
    r = _c(method, path, payload, token=sam)
    assert r["status"] == 403, "A customer calling " + method + " " + path + " should be 403 Forbidden, got " + str(r["status"])
    assert _code(r) == "forbidden"
assert _c("GET", "/me", token=sam)["status"] == 200, "Customers can use user-level routes"
assert _c("GET", "/products/1")["body"]["name"] == "Tide Earbuds", "Nothing may have changed"`),
      },
      {
        id: "t4",
        description: "The admin can write",
        assertionCode: T(py`reset_db()
admin = _admin()
body = {"sku": "TST-001", "name": "Test", "category": "desk", "price_cents": 100}
r = _c("POST", "/products", body, token=admin)
assert r["status"] == 201, "The admin can create products, got " + str(r["status"]) + " " + str(r["body"])
pid = r["body"]["id"]
assert _c("PATCH", "/products/" + str(pid), {"stock": 9}, token=admin)["status"] == 200
assert _c("PUT", "/products/" + str(pid), body, token=admin)["status"] == 200
assert _c("DELETE", "/products/" + str(pid), token=admin)["status"] == 204`),
      },
      {
        id: "t5",
        description: "A bad token on a public route is ignored",
        assertionCode: T(py`reset_db()
r = _c("GET", "/products", token="expired-or-garbage")
assert r["status"] == 200, "Public routes must not fail because of a bad token, got " + str(r["status"])
r = _c("GET", "/products/1", headers={"Authorization": "Basic abc"})
assert r["status"] == 200`),
      },
      {
        id: "t6",
        description: "request['user'] is available to handlers; unlisted routes fail closed",
        assertionCode: T(py`reset_db()
seen = {}

@app.get("/__whoami")
def whoami(request):
    seen["user"] = request["user"]
    return json_response(200, {"ok": True})

POLICY[("GET", "/__whoami")] = "public"
_c("GET", "/__whoami")
assert seen["user"] is None, "request['user'] should be None for anonymous callers"
_c("GET", "/__whoami", token=_sam())
assert seen["user"] == {"id": 2, "email": "sam@example.com", "role": "customer"}, "request['user'] should be the public user dict, got " + str(seen["user"])
del POLICY[("GET", "/__whoami")]
assert _c("GET", "/__whoami")["status"] == 401, "A route with no POLICY entry must NOT be public: anonymous gets 401"
assert _c("GET", "/__whoami", token=_sam())["status"] == 403, "...and a customer gets 403. Unlisted routes are admin-only (fail closed)"
assert _c("GET", "/__whoami", token=_admin())["status"] == 200
app.routes = [r for r in app.routes if r["pattern"] != "/__whoami"]`),
      },
      {
        id: "t7",
        description: "auth_middleware is registered inside errors_middleware",
        assertionCode: T(py`assert auth_middleware in app.middleware, "Register it with app.use(auth_middleware)"
assert app.middleware.index(errors_middleware) < app.middleware.index(auth_middleware), "errors_middleware must be the outer layer so the ApiErrors raised here become responses"
required = {("GET", "/health"), ("GET", "/products"), ("POST", "/products"), ("GET", "/me"), ("POST", "/auth/login")}
assert required <= set(POLICY), "POLICY is missing entries: " + str(sorted(required - set(POLICY)))
assert set(POLICY.values()) <= {"public", "user", "admin"}, "Access levels are public, user and admin"`),
      },
    ],
    unlocks: ["store-roles"],
    checks: [
      {
        prompt: "A signed-in customer calls `DELETE /products/3`. Which response is correct?",
        question: { type: "choice", options: ["403 Forbidden", "401 Unauthorized", "404 Not Found", "400 Bad Request"], answer: 0 },
        explanation:
          "The server knows who the caller is, and the answer is no. 401 would suggest signing in (they already did). Use 401 only when credentials are missing or invalid.",
      },
      {
        prompt: "You add `GET /reports` and forget to put it in `POLICY`. With `POLICY.get(..., \"admin\")`, what happens?",
        question: {
          type: "choice",
          options: [
            "It is admin-only until someone adds a rule: a safe failure you will notice",
            "It is public until someone adds a rule",
            "The server crashes at startup",
            "It returns 404",
          ],
          answer: 0,
        },
        explanation:
          "Failing closed turns a forgotten rule into an annoying 403 instead of a silent data leak. The opposite default (public) would turn every oversight into a vulnerability.",
      },
      {
        prompt: "Where should the user's role come from?",
        question: {
          type: "choice",
          options: [
            "Your database, found via the verified token",
            "A header such as X-Role sent by the client",
            "A field in the request body",
            "The user's email domain",
          ],
          answer: 0,
        },
        explanation:
          "Anything the client sends can be forged. The server must derive identity and role from data it controls.",
      },
    ],
  },
];
