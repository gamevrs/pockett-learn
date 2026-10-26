/**
 * Shared pieces for the Pocket Store API lessons.
 *
 * Authoring notes: Python goes in String.raw (no backticks, no ${ inside). Lesson prose uses normal
 * template strings with escaped backticks and ~~~python / ~~~http fences.
 */
export const py = String.raw;

/**
 * Helpers every test can use. They start with an underscore so the scene snapshot ignores them.
 *  _c(method, path, body, token, headers) calls the learner's handle() and checks the response shape
 *  _hdr(response, name)                  case-insensitive header lookup
 *  _code(response)                       the error code in an error body, or None
 *  _login(email, password)               returns a bearer token
 */
export const CALL = py`import json as _json


def _c(method, path, body=None, token=None, headers=None):
    h = dict(headers or {})
    if token:
        h["Authorization"] = "Bearer " + token
    if body is not None and not isinstance(body, str):
        body = _json.dumps(body)
    r = handle({"method": method, "path": path, "headers": h, "body": body})
    assert isinstance(r, dict), "handle() must return a response dict, but it returned " + type(r).__name__ + ". Did a handler forget to return?"
    assert "status" in r and "headers" in r and "body" in r, "A response needs the keys status, headers and body"
    try:
        _json.dumps(r)
    except TypeError as e:
        assert False, "The response must be plain JSON data (use dict(row), not a sqlite3.Row): " + str(e)
    return r


def _hdr(r, name):
    return {k.lower(): v for k, v in r["headers"].items()}.get(name.lower())


def _code(r):
    body = r["body"]
    if isinstance(body, dict) and isinstance(body.get("error"), dict):
        return body["error"].get("code")
    return None


def _login(email, password):
    r = _c("POST", "/auth/login", {"email": email, "password": password})
    assert r["status"] == 200, "Logging in with a correct password should return 200, got " + str(r["status"])
    return r["body"]["token"]


def _admin():
    return _login("admin@pocketstore.test", "admin-pass-123")


def _sam():
    return _login("sam@example.com", "sam-pass-456")

`;

/** Prefixes a test body with the helpers above. */
export const T = (code: string) => CALL + code;

/** The catalogue seed. The same text is in the starter and the solution so ids and prices are stable. */
export const PRODUCTS_SEED = py`PRODUCTS_SEED = [
    # sku, name, description, category, price_cents, stock
    ("AUD-001", "Tide Earbuds", "Wireless earbuds with a 28 hour case.", "audio", 5900, 40),
    ("AUD-002", "Pocket Speaker", "Palm-sized speaker, loud for its size.", "audio", 3900, 25),
    ("AUD-003", "Studio Headphones", "Closed-back monitors for long sessions.", "audio", 12900, 8),
    ("DSK-001", "Walnut Laptop Stand", "Solid walnut that folds flat.", "desk", 4900, 3),
    ("DSK-002", "Mechanical Keyboard", "Hot-swap switches, 75 percent layout.", "desk", 8900, 15),
    ("DSK-003", "Felt Desk Mat", "Wool felt, 80 cm wide.", "desk", 2900, 60),
    ("DSK-004", "Cable Spool", "Keeps one cable exactly where you left it.", "desk", 1400, 120),
    ("LGT-001", "Arc Desk Lamp", "Warm dimmable light on a brass arm.", "lighting", 6400, 12),
    ("LGT-002", "Glow Cube", "Rechargeable table light.", "lighting", 2400, 0),
    ("LGT-003", "Clip Light", "Fastens to a shelf or a monitor.", "lighting", 1900, 33),
    ("BAG-001", "Commuter Backpack", "Water resistant, fits a 16 inch laptop.", "bags", 9400, 9),
    ("BAG-002", "Canvas Tote", "Heavy cotton canvas with a zip pocket.", "bags", 2200, 70),
    ("BAG-003", "Tech Pouch", "Cables, chargers and a spare battery.", "bags", 1700, 45),
    ("KIT-001", "Pour-over Kettle", "Gooseneck spout, 0.9 litre.", "kitchen", 5400, 18),
    ("KIT-002", "Ceramic Mug Set", "Four hand-glazed mugs.", "kitchen", 3100, 22),
    ("KIT-003", "Burr Grinder", "Hand grinder with 40 click settings.", "kitchen", 7900, 6),
]`;
