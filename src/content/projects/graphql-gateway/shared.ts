/**
 * Shared pieces for the Graph Gateway lessons.
 *
 * Authoring notes: Python goes in String.raw (no backticks, no ${ inside). Lesson prose uses normal
 * template strings with escaped backticks and ~~~python / ~~~graphql / ~~~json fences. SDL inside
 * Python uses """ strings, so GraphQL descriptions must use the single-line "..." form or '''.
 */
export const py = String.raw;

/**
 * Helpers every test can use. They start with an underscore so the scene snapshot ignores them.
 *  _gql(query, variables, token, operation_name)  runs the learner's execute() and checks the shape
 *  _data(response)                                the data, asserting there were no errors
 *  _msgs(response) / _codes(response)             error messages / extensions.code values
 *  _fresh()                                       rebuild the database (from lesson 2 on)
 */
export const CALL = py`import json as _json


def _gql(query, variables=None, token=None, operation_name=None):
    headers = {"Authorization": "Bearer " + token} if token else {}
    r = execute({"query": query, "variables": variables, "operationName": operation_name, "headers": headers})
    assert isinstance(r, dict), "execute() must return a dict like {\"data\": ..., \"errors\": ...}, but it returned " + type(r).__name__ + ". Did it forget to return?"
    assert "data" in r or "errors" in r, "The response needs a \"data\" key, an \"errors\" key, or both"
    try:
        _json.dumps(r)
    except TypeError as e:
        assert False, "The response must be plain JSON data (no GraphQL objects, sets or datetimes): " + str(e)
    return r


def _msgs(r):
    return [e.get("message") for e in (r.get("errors") or [])]


def _codes(r):
    return [(e.get("extensions") or {}).get("code") for e in (r.get("errors") or [])]


def _data(r):
    assert not r.get("errors"), "Expected a clean response but got errors: " + "; ".join(str(m) for m in _msgs(r))
    return r["data"]


def _fresh():
    reset_db()

`;

/** Prefixes a test body with the helpers above. */
export const T = (code: string) => CALL + code;

/**
 * The shop database, provided in lesson 2 (read it, do not change it). It is the SQLite database
 * from the Pocket Store API project, with a few more tables so the graph has something to walk.
 */
export const DB_CODE = py`import sqlite3

SCHEMA_SQL = """
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    stock INTEGER NOT NULL CHECK (stock >= 0)
);
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'CUSTOMER'))
);
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (product_id, user_id)
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'CANCELLED')),
    created_at TEXT NOT NULL
);
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL
);
"""

CATEGORIES = [(1, "audio", "Audio"), (2, "desk", "Desk"), (3, "lighting", "Lighting"), (4, "bags", "Bags"), (5, "kitchen", "Kitchen")]

PRODUCTS = [
    # sku, name, description, category_id, price_cents, stock
    ("AUD-001", "Tide Earbuds", "Wireless earbuds with a 28 hour case.", 1, 5900, 40),
    ("AUD-002", "Pocket Speaker", "Palm-sized speaker, loud for its size.", 1, 3900, 25),
    ("AUD-003", "Studio Headphones", "Closed-back monitors for long sessions.", 1, 12900, 8),
    ("DSK-001", "Walnut Laptop Stand", "Solid walnut that folds flat.", 2, 4900, 3),
    ("DSK-002", "Mechanical Keyboard", "Hot-swap switches, 75 percent layout.", 2, 8900, 15),
    ("DSK-003", "Felt Desk Mat", "Wool felt, 80 cm wide.", 2, 2900, 60),
    ("DSK-004", "Cable Spool", "Keeps one cable exactly where you left it.", 2, 1400, 120),
    ("LGT-001", "Arc Desk Lamp", "Warm dimmable light on a brass arm.", 3, 6400, 12),
    ("LGT-002", "Glow Cube", "Rechargeable table light.", 3, 2400, 0),
    ("LGT-003", "Clip Light", "Fastens to a shelf or a monitor.", 3, 1900, 33),
    ("BAG-001", "Commuter Backpack", "Water resistant, fits a 16 inch laptop.", 4, 9400, 9),
    ("BAG-002", "Canvas Tote", "Heavy cotton canvas with a zip pocket.", 4, 2200, 70),
    ("BAG-003", "Tech Pouch", "Cables, chargers and a spare battery.", 4, 1700, 45),
    ("KIT-001", "Pour-over Kettle", "Gooseneck spout, 0.9 litre.", 5, 5400, 18),
    ("KIT-002", "Ceramic Mug Set", "Four hand-glazed mugs.", 5, 3100, 22),
    ("KIT-003", "Burr Grinder", "Hand grinder with 40 click settings.", 5, 7900, 6),
]

USERS = [
    (1, "admin@pocketstore.test", "Ada Admin", "ADMIN"),
    (2, "sam@example.com", "Sam Carter", "CUSTOMER"),
    (3, "priya@example.com", "Priya Nair", "CUSTOMER"),
    (4, "leo@example.com", "Leo Park", "CUSTOMER"),
]

REVIEWS = [
    # product_id, user_id, rating, body, created_at
    (1, 2, 5, "Battery lasts all week.", "2025-02-03T09:30:00Z"),
    (1, 3, 4, "Great sound, case is a bit big.", "2025-02-11T18:05:00Z"),
    (1, 4, 4, "Comfortable for long calls.", "2025-03-01T12:40:00Z"),
    (3, 2, 5, "Clear and balanced.", "2025-02-14T20:10:00Z"),
    (3, 3, 3, "Pads get warm after an hour.", "2025-03-05T08:55:00Z"),
    (5, 3, 5, "Typing feel is superb.", "2025-01-20T14:25:00Z"),
    (5, 4, 4, "Wish it had a numpad.", "2025-02-02T10:00:00Z"),
    (5, 2, 5, "Hot-swap made it mine.", "2025-03-09T16:45:00Z"),
    (8, 2, 4, "Warm light, sturdy arm.", "2025-02-18T19:20:00Z"),
    (8, 4, 3, "Dimmer is a little fiddly.", "2025-03-12T11:15:00Z"),
    (11, 3, 5, "Fits everything, stays dry.", "2025-01-28T07:50:00Z"),
    (14, 4, 4, "Pours exactly where I aim.", "2025-02-25T09:05:00Z"),
    (16, 2, 5, "Even grind, quiet.", "2025-03-15T13:35:00Z"),
    (6, 3, 4, "Soft and does not slide.", "2025-02-08T17:30:00Z"),
]

ORDERS = [
    # user_id, status, created_at
    (2, "SHIPPED", "2025-02-20T10:00:00Z"),
    (2, "PAID", "2025-03-10T15:30:00Z"),
    (3, "SHIPPED", "2025-02-12T09:15:00Z"),
    (3, "PENDING", "2025-03-14T21:05:00Z"),
    (4, "CANCELLED", "2025-03-01T08:20:00Z"),
    (2, "PENDING", "2025-03-16T12:00:00Z"),
]

ORDER_ITEMS = [
    # order_id, product_id, quantity, unit_price_cents
    (1, 1, 1, 5900),
    (1, 6, 1, 2900),
    (2, 5, 1, 8900),
    (3, 3, 1, 12900),
    (3, 4, 2, 4900),
    (4, 11, 1, 9400),
    (4, 13, 1, 1700),
    (5, 8, 1, 6400),
    (6, 16, 1, 7900),
    (6, 15, 2, 3100),
]

# Pretend sign-in: the token a client sends in "Authorization: Bearer <token>" -> a user id.
TOKENS = {"admin-token": 1, "sam-token": 2, "priya-token": 3}


def connect():
    """A fresh in-memory shop database with the seed data loaded."""
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    db.executescript(SCHEMA_SQL)
    db.executemany("INSERT INTO categories (id, slug, name) VALUES (?, ?, ?)", CATEGORIES)
    db.executemany("INSERT INTO products (sku, name, description, category_id, price_cents, stock) VALUES (?, ?, ?, ?, ?, ?)", PRODUCTS)
    db.executemany("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)", USERS)
    db.executemany("INSERT INTO reviews (product_id, user_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)", REVIEWS)
    db.executemany("INSERT INTO orders (user_id, status, created_at) VALUES (?, ?, ?)", ORDERS)
    db.executemany("INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)", ORDER_ITEMS)
    db.commit()
    return db


DB = connect()


def reset_db():
    """Throw the database away and rebuild it from the seed (the demo's Reset button calls this)."""
    global DB
    DB = connect()


def fetch_all(db, sql, params=()):
    """Run a SELECT and return a list of plain dicts."""
    return [dict(row) for row in db.execute(sql, params)]


def fetch_one(db, sql, params=()):
    """Run a SELECT and return the first row as a dict, or None."""
    row = db.execute(sql, params).fetchone()
    return dict(row) if row else None`;
