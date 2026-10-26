import type { Chapter } from "@/engine/types";

/**
 * Cargo Bay, chapter 3: Paperwork.
 * Reading and writing JSON, then validating what comes in: collecting every problem,
 * checking formats with regular expressions, and driving it all from a schema.
 */
const py = String.raw;

export const chapter3: Chapter = {
  id: "paperwork",
  title: "Paperwork",
  blurb: "Manifests arrive as JSON text. Read it safely, write it back out, and check every field at the door.",
  lessons: [
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "cargo-control-8-json-read",
      title: "Reading JSON",
      minutes: 22,
      xp: 110,
      concepts: ["json.loads", "JSON ↔ Python types", "JSONDecodeError", "safe nested access"],
      learn: `### JSON is text

Manifests do not arrive as Python dicts. They arrive as **text** in a format called JSON (JavaScript Object Notation), the common language of web APIs, config files and message queues. \`json.loads(text)\` (the *s* is for *string*) turns it into Python values; \`json.dumps(value)\` goes the other way.

~~~python
import json

text = '{"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": true}}'
manifest = json.loads(text)
print(manifest["customs"]["cleared"])   # True
~~~

### The type mapping

JSON has six kinds of value, and each has a Python twin:

- object \`{...}\` ↔ \`dict\`
- array \`[...]\` ↔ \`list\`
- string \`"..."\` ↔ \`str\`
- number \`12\` ↔ \`int\`; number \`12.5\` or \`1e3\` ↔ \`float\`
- \`true\` / \`false\` ↔ \`True\` / \`False\`
- \`null\` ↔ \`None\`

JSON is **stricter** than Python: strings use double quotes only, keys must be strings, there are no trailing commas, no comments, and the literals are lower-case. Python's own \`print(manifest)\` shows single quotes, \`True\` and \`None\`: that is *not* JSON.

### When the text is broken: JSONDecodeError

~~~python
json.loads('{"weight_kg": 18250.5,}')
~~~

~~~text
json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 1 column 24 (char 23)
~~~

\`JSONDecodeError\` is a kind of \`ValueError\`, and it carries exact details: \`exc.msg\` (what), \`exc.lineno\` and \`exc.colno\` (where), \`exc.pos\` (character offset). Catch it **specifically** and report the location; "invalid JSON" with no position makes people hunt through a file by eye.

Common causes: a trailing comma, single quotes, an unquoted key, a missing closing bracket, a comment, truncated text, or something that is not JSON at all (an HTML error page).

### Valid JSON is not the same as the shape you expect

\`json.loads\` happily returns whatever the text holds: \`"[]"\` gives a list, \`"42"\` an int, \`"null"\` gives \`None\`. Always check that the top level is what you need (a dict) before using it. Python's parser is also more generous than the standard: it accepts \`NaN\` and \`Infinity\`, which are *not* valid JSON. And \`JSONDecodeError\` is **not the only way \`json.loads\` can fail**: a document nested thousands of levels deep raises \`RecursionError\`, and an integer with more than 4300 digits raises a plain \`ValueError\` (Python limits this on purpose, to stop denial-of-service attacks). Hostile or broken input finds these edges, so treat parsed data as untrusted.

### Nested access without crashing

~~~python
manifest["route"]["origin"]                 # KeyError or TypeError if anything is missing or null
manifest.get("route", {}).get("origin")     # better...
~~~

...but \`.get("route", {})\` only uses the default when the key is **absent**. If the JSON says \`"route": null\`, you get \`None\` back and the next \`.get\` crashes with \`AttributeError\`. A small helper that walks the path and gives up gracefully is more robust than chained \`.get\` calls, and it is easy to test.

### Common mistakes

- Passing a dict to \`json.loads\` (it wants text) or text to \`dict\` operations (it is still a string!).
- Forgetting \`json.loads\` returns \`float\` for \`1.0\` and \`int\` for \`1\`: the distinction survives.
- Using \`eval()\` on JSON-looking text. Never: it runs arbitrary code.
- Catching \`Exception\` around \`json.loads\` instead of the specific errors it can raise.
- Putting \`except ValueError\` *before* \`except json.JSONDecodeError\`: the decode error is a kind of \`ValueError\`, so the specific clause would never run.
- Reporting only the message and dropping \`lineno\` / \`colno\`.`,
      mission: `Real manifests do not arrive pre-parsed: they come off the wire as raw text, and a surprising amount of it is not JSON at all. Trailing commas, single quotes, truncated transmissions, an HTML error page, an empty string.

Build the depot's reader: parse safely, point at exactly where broken text goes wrong, and refuse anything that is not a manifest. When you Run, the scanner shows raw text and highlights the exact line and column where broken JSON stops making sense.`,
      tasks: [
        "InvalidJSONError (a MalformedManifestError that remembers line and column) and read_manifest(text), including absurdly deep or long input",
        "safe_read(text): a result dict for the scene instead of an exception",
        "dig(data, *path, default=None): nested lookups that never crash",
        "value_types(text): the Python type name of every top-level value",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: read raw manifest text, safely.
import json


class InvalidJSONError(MalformedManifestError):
    # TODO: __init__(self, message, line, column) -> super().__init__(message) and keep line and column
    ...


def read_manifest(text):
    # TODO: turn manifest text into a dict.
    #   - text that is not a str                -> raise MalformedManifestError (do not let json.loads raise TypeError)
    #   - json.JSONDecodeError (as exc)         -> raise InvalidJSONError(
    #         f"{exc.msg} (line {exc.lineno}, column {exc.colno})", exc.lineno, exc.colno) from exc
    #   - RecursionError or ValueError from json.loads (too deeply nested, or a number with thousands of digits)
    #                                           -> MalformedManifestError("manifest is nested too deeply or holds an absurdly long number") from exc
    #                                              (JSONDecodeError is a ValueError, so its clause must come FIRST)
    #   - valid JSON that is not an object      -> MalformedManifestError(f"manifest must be a JSON object, got {type(data).__name__}")
    ...


def safe_read(text):
    # TODO: call read_manifest and never raise a CargoError. Return
    #   {"ok": True,  "manifest": data, "error": None, "message": None, "line": None, "column": None}
    # or, on CargoError:
    #   {"ok": False, "manifest": None, "error": <class name>, "message": str(exc),
    #    "line": <exc.line or None>, "column": <exc.column or None>}
    ...


def dig(data, *path, default=None):
    # TODO: follow the path through dicts (string keys) and lists (int indexes), e.g.
    #   dig(manifest, "route", "origin")  or  dig(manifest, "items", 0, "name")
    # Return default when anything on the way is missing, out of range, null or the wrong kind of container.
    # A JSON null at the end also counts as missing. (Strings are NOT containers here.)
    ...


def value_types(text):
    # TODO: parse the JSON object in text and return {key: type(value).__name__} for every top-level key.
    ...
`,
      solutionAdd: py`import json


class InvalidJSONError(MalformedManifestError):
    """The text is not valid JSON; line and column say where it breaks."""

    def __init__(self, message, line, column):
        super().__init__(message)
        self.line = line
        self.column = column


def read_manifest(text):
    if not isinstance(text, str):
        raise MalformedManifestError(f"manifest text expected, got {type(text).__name__}")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise InvalidJSONError(f"{exc.msg} (line {exc.lineno}, column {exc.colno})", exc.lineno, exc.colno) from exc
    except (RecursionError, ValueError) as exc:
        raise MalformedManifestError("manifest is nested too deeply or holds an absurdly long number") from exc
    if not isinstance(data, dict):
        raise MalformedManifestError(f"manifest must be a JSON object, got {type(data).__name__}")
    return data


def safe_read(text):
    try:
        manifest = read_manifest(text)
    except CargoError as exc:
        return {
            "ok": False,
            "manifest": None,
            "error": type(exc).__name__,
            "message": str(exc),
            "line": getattr(exc, "line", None),
            "column": getattr(exc, "column", None),
        }
    return {"ok": True, "manifest": manifest, "error": None, "message": None, "line": None, "column": None}


def dig(data, *path, default=None):
    current = data
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        elif isinstance(current, list) and isinstance(key, int) and not isinstance(key, bool) and -len(current) <= key < len(current):
            current = current[key]
        else:
            return default
    return default if current is None else current


def value_types(text):
    return {key: type(value).__name__ for key, value in json.loads(text).items()}`,
      explanation:
        "read_manifest turns four different failures into depot errors: not text (MalformedManifestError), broken JSON (InvalidJSONError, chained from the JSONDecodeError and carrying line and column), input so extreme that json.loads raises RecursionError or a plain ValueError (note the order: JSONDecodeError is a ValueError, so it is caught first), and valid JSON of the wrong shape. safe_read converts the exception into plain data for callers that cannot use exceptions, using getattr so one except clause serves every CargoError. dig checks the kind of container at each step instead of trusting it, so null, missing keys, wrong types and bad indexes all fall back to the default. value_types shows the mapping directly: 1 is int, 1.5 float, true bool, null NoneType.",
      hints: [
        { id: "h1", title: "read_manifest", content: "isinstance(text, str) first. Then try: data = json.loads(text) / except json.JSONDecodeError as exc: raise InvalidJSONError(...) from exc. Add a second except clause for (RecursionError, ValueError) AFTER the JSONDecodeError one. Check isinstance(data, dict) after the try statement." },
        { id: "h2", title: "safe_read", content: 'try: manifest = read_manifest(text) / except CargoError as exc: return {...}. getattr(exc, "line", None) works for every CargoError, even those without a line attribute.' },
        { id: "h3", title: "dig", content: "Loop over path. If current is a dict and key in current: current = current[key]. If it is a list and key is an int in range: index it. Otherwise return default. After the loop, return default if current is None." },
      ],
      tests: [
        {
          id: "t1",
          description: "read_manifest parses a good manifest",
          assertionCode: py`text = '{"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": true}}'
m = read_manifest(text)
assert m == {"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": True}}, f"Expected the parsed dict, got {m!r}"`,
        },
        {
          id: "t2",
          description: "Broken JSON raises InvalidJSONError with line and column",
          assertionCode: py`import json as _json
assert issubclass(InvalidJSONError, MalformedManifestError), "InvalidJSONError should inherit from MalformedManifestError"
bad = '{\n  "container_id": "C1",\n  "weight_kg": 10,\n}'
try:
    _json.loads(bad)
except _json.JSONDecodeError as _truth:
    truth = _truth
try:
    read_manifest(bad)
except InvalidJSONError as exc:
    assert exc.line == truth.lineno and exc.column == truth.colno, f"line/column should be {truth.lineno}/{truth.colno} (where the parser gave up), got {exc.line}/{exc.column}"
    assert isinstance(exc.__cause__, _json.JSONDecodeError), "Use 'raise ... from exc' so the JSONDecodeError stays as the cause"
    assert f"line {truth.lineno}" in str(exc), "The message should mention the line"
else:
    raise AssertionError("A trailing comma is not valid JSON: expected InvalidJSONError")
for junk in ("", "{", "{'a': 1}", "<html>502 Bad Gateway</html>", '{"a": }'):
    try:
        read_manifest(junk)
    except InvalidJSONError:
        pass
    else:
        raise AssertionError(f"{junk!r} is not valid JSON: expected InvalidJSONError")`,
        },
        {
          id: "t3",
          description: "Valid JSON of the wrong shape, or non-text, is malformed",
          assertionCode: py`for text in ("[]", "42", "null", '"hello"', "true", "[1, 2]"):
    try:
        read_manifest(text)
    except MalformedManifestError as exc:
        assert not isinstance(exc, InvalidJSONError), f"{text!r} is valid JSON, so it should be a plain MalformedManifestError"
    else:
        raise AssertionError(f"{text!r} is not a JSON object: expected MalformedManifestError")
for value in (None, 123, ["{}"], {"a": 1}):
    try:
        read_manifest(value)
    except MalformedManifestError:
        pass
    else:
        raise AssertionError(f"{value!r} is not text: expected MalformedManifestError (not a TypeError from json.loads)")`,
        },
        {
          id: "t4",
          description: "Extreme input is rejected, not crashed",
          assertionCode: py`for text in ("[" * 100000, '{"weight_kg": ' + "9" * 5000 + "}"):
    try:
        read_manifest(text)
    except InvalidJSONError:
        raise AssertionError("This text is not a syntax error: a more specific clause (JSONDecodeError) must not catch it")
    except MalformedManifestError as exc:
        assert exc.__cause__ is not None, "Chain the original error with 'from exc'"
    else:
        raise AssertionError("This input cannot be a manifest: expected MalformedManifestError")
r = safe_read("[" * 100000)
assert r["ok"] is False and r["error"] == "MalformedManifestError", f"safe_read must never raise, got {r!r}"`,
        },
        {
          id: "t5",
          description: "safe_read returns data instead of raising",
          assertionCode: py`r = safe_read('{"container_id": "C1"}')
assert r == {"ok": True, "manifest": {"container_id": "C1"}, "error": None, "message": None, "line": None, "column": None}, f"A good read should look like the example in the task, got {r!r}"
r = safe_read('{\n  "a": 1,\n  "b": ,\n}')
assert r["ok"] is False and r["manifest"] is None and r["error"] == "InvalidJSONError", f"Broken JSON: got {r!r}"
assert r["line"] == 3 and isinstance(r["column"], int) and "line 3" in r["message"], f"The failure is on line 3, got {r!r}"
r = safe_read("[1, 2, 3]")
assert r["ok"] is False and r["error"] == "MalformedManifestError" and r["line"] is None and r["column"] is None, f"A list: got {r!r}"
r = safe_read(None)
assert r["ok"] is False and r["error"] == "MalformedManifestError", f"None is not text: got {r!r}"`,
        },
        {
          id: "t6",
          description: "dig walks nested data safely",
          assertionCode: py`m = {"route": {"origin": "Hamburg", "stops": ["Antwerp", "Rotterdam"]}, "customs": None, "note": "hi", "n": 0}
assert dig(m, "route", "origin") == "Hamburg", "Follow dict keys"
assert dig(m, "route", "stops", 1) == "Rotterdam", "Follow a list index"
assert dig(m, "route", "stops", -1) == "Rotterdam", "Negative indexes work like in Python"
assert dig(m, "n") == 0, "A falsy value like 0 is a real value, not missing"
assert dig(m, "missing") is None and dig(m, "missing", default="?") == "?", "Missing keys give the default"
assert dig(m, "customs", "cleared", default=False) is False, "customs is null, so the whole path is missing"
assert dig(m, "route", "stops", 5, default="none") == "none", "An index out of range gives the default"
assert dig(m, "note", 0, default="x") == "x", "A string is not a container: don't index into it"
assert dig(m, "route", "origin", "deeper", default=1) == 1, "Going deeper than the data allows gives the default"
assert dig(["a"], 0) == "a", "The data itself may be a list"
assert dig(None, "a", default=3) == 3, "None as data just gives the default"
assert dig(m) == m, "An empty path returns the data itself"`,
        },
        {
          id: "t7",
          description: "value_types shows the JSON-to-Python mapping",
          assertionCode: py`text = '{"id": "A", "count": 3, "ratio": 1.5, "sci": 1e3, "ok": true, "none": null, "tags": ["x"], "box": {"w": 1}}'
assert value_types(text) == {"id": "str", "count": "int", "ratio": "float", "sci": "float", "ok": "bool", "none": "NoneType", "tags": "list", "box": "dict"}, f"Got {value_types(text)!r}"`,
        },
      ],
      unlocks: ["cc-reader"],
      checks: [
        {
          prompt: "Which Python values does `json.loads('{\"ok\": true, \"owner\": null, \"pieces\": 3.0}')` produce for those three keys?",
          question: {
            type: "choice",
            options: ["True, None, 3.0", "\"true\", \"null\", \"3.0\"", "true, null, 3", "True, \"\", 3"],
            answer: 0,
          },
          explanation: "`true` becomes `True`, `null` becomes `None`, and `3.0` stays a `float` because it has a decimal point. JSON `3` would become an `int`.",
        },
        {
          prompt: "`json.loads('{\"customs\": null}').get(\"customs\", {})` returns...",
          question: {
            type: "choice",
            options: ["{}", "None", "A KeyError", "\"null\""],
            answer: 1,
          },
          explanation: "The default in `.get(key, default)` is used only when the key is **absent**. Here the key exists with the value `None`, so you get `None` back, and a chained `.get()` on it would crash with `AttributeError`.",
        },
        {
          prompt: "Which exception class do you catch to handle invalid JSON text specifically?",
          question: { type: "text", answer: ["json.JSONDecodeError", "JSONDecodeError", "json.decoder.JSONDecodeError"], placeholder: "exception class" },
          explanation: "`json.JSONDecodeError` (a subclass of `ValueError`). Catching it by name keeps real bugs visible and gives you `lineno` and `colno`.",
        },
      ],
    },

    // ───────────────────────── 9 ─────────────────────────
    {
      id: "cargo-control-9-json-write",
      title: "Writing JSON",
      minutes: 20,
      xp: 100,
      concepts: ["json.dumps", "indent & sort_keys", "default=", "dataclasses"],
      learn: `### From Python values to JSON text

\`json.dumps(value)\` returns a string. Its options matter more than they look:

~~~python
data = {"decision": "LOAD", "weight_kg": 18250.5, "reasons": []}

json.dumps(data)                       # compact: '{"decision": "LOAD", "weight_kg": 18250.5, "reasons": []}'
json.dumps(data, indent=2)             # pretty, for humans and diffs
json.dumps(data, sort_keys=True)       # keys in alphabetical order
json.dumps(data, separators=(",", ":"))  # the most compact form, for the wire
~~~

\`sort_keys=True\` makes the output **deterministic**, which matters whenever text is compared, diffed, hashed or snapshot-tested. \`ensure_ascii=False\` keeps non-English characters readable instead of writing \`\\u00fc\` escapes.

### What does not survive the trip

JSON only has six kinds of value, so some Python values change or fail:

- a \`tuple\` becomes an array, and comes back as a \`list\`
- dict keys become strings: \`{1: "a"}\` round-trips as \`{"1": "a"}\`
- \`NaN\` and \`inf\` are written as non-standard tokens that other programs reject. Use \`allow_nan=False\` so Python refuses to write invalid JSON
- a \`set\`, a \`date\`, a \`datetime\`, a \`Decimal\` or your own class raise \`TypeError: Object of type ... is not JSON serializable\`

### Teaching dumps new types: default=

\`default\` is a function that \`dumps\` calls **only for values it cannot handle**. Return something JSON-able, or raise \`TypeError\` for what you still do not support:

~~~python
def encode_extra(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()              # "2026-03-14"
    if isinstance(obj, (set, frozenset)):
        return sorted(obj)                  # sets have no order, so sort for stable output
    raise TypeError(f"{type(obj).__name__} is not JSON serializable")

json.dumps({"day": date(2026, 3, 14)}, default=encode_extra)
~~~

The final \`raise TypeError\` is important. If you return \`str(obj)\` for everything, a bug (say, a function accidentally stored in the data) turns into a weird string instead of an error.

### Dataclasses

A \`@dataclass\` is a class that writes its own \`__init__\` and \`__repr__\` from a list of annotated fields. It is the tidy way to model "a record":

~~~python
from dataclasses import dataclass, asdict, is_dataclass

@dataclass
class Receipt:
    crate_id: str
    decision: str
    weight_kg: float | None = None      # fields with defaults come last

asdict(Receipt("C1", "LOAD"))           # {'crate_id': 'C1', 'decision': 'LOAD', 'weight_kg': None}
~~~

\`dumps\` does not know dataclasses, but \`asdict\` turns one (and any dataclasses nested inside it) into a plain dict, so your \`default\` function can call it.

### Common mistakes

- Treating the string from \`dumps\` as a dict (it is text; use \`loads\` to go back).
- Forgetting that \`json.dump\` / \`json.load\` (no *s*) work with **files**, while \`dumps\` / \`loads\` work with **strings**.
- Returning \`str(obj)\` from \`default\` for every unknown type, which hides bugs.
- Comparing JSON text from two programs without \`sort_keys\`: the same data can produce different strings.
- Writing secrets (passwords, tokens) into JSON that gets logged or shared.`,
      mission: `Every crate that is handled needs a receipt: a tidy, sorted JSON document for the shipping company, the harbour authority and the archive. The receipt includes a date and a list of reasons, and Python's \`json\` does not know what a \`date\` is.

Teach it. When you Run, a receipt appears for every inspected crate, sorted and indented like a real archive copy.`,
      tasks: [
        "A Receipt dataclass (crate_id, decision, reasons, received date, optional weight_kg)",
        "encode_extra(obj): dates, sets and dataclasses; anything else must raise TypeError",
        "to_json(data): sorted keys, 2-space indent, and never invalid JSON",
        "stamp(manifest, received=None): decide with triage and return the receipt as JSON text",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: write receipts as clean JSON.
from dataclasses import dataclass, asdict, is_dataclass
from datetime import date, datetime


# TODO: a @dataclass called Receipt with the fields
#   crate_id (str or None), decision (str), reasons (list), received (date), weight_kg (float or None, default None)
...


def encode_extra(obj):
    # TODO: the default= function for json.dumps.
    #   - date / datetime        -> obj.isoformat()
    #   - set / frozenset        -> sorted(obj)
    #   - a dataclass INSTANCE   -> asdict(obj)   (is_dataclass is also True for classes, so exclude types)
    #   - anything else          -> raise TypeError(f"{type(obj).__name__} is not JSON serializable")
    ...


def to_json(data):
    # TODO: json.dumps with indent=2, sorted keys, default=encode_extra, and allow_nan=False
    ...


def stamp(manifest, received=None):
    # TODO: verdict = triage(manifest), then build a Receipt:
    #   crate_id and decision from the verdict, reasons=[verdict["reason"]],
    #   received = the received argument, or date.today() when it is None,
    #   weight_kg = safe_weight(manifest)
    # and return it as JSON text with to_json.
    ...
`,
      solutionAdd: py`from dataclasses import dataclass, asdict, is_dataclass
from datetime import date, datetime


@dataclass
class Receipt:
    crate_id: str | None
    decision: str
    reasons: list
    received: date
    weight_kg: float | None = None


def encode_extra(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    if isinstance(obj, (set, frozenset)):
        return sorted(obj)
    if is_dataclass(obj) and not isinstance(obj, type):
        return asdict(obj)
    raise TypeError(f"{type(obj).__name__} is not JSON serializable")


def to_json(data):
    return json.dumps(data, indent=2, sort_keys=True, default=encode_extra, allow_nan=False)


def stamp(manifest, received=None):
    verdict = triage(manifest)
    receipt = Receipt(
        crate_id=verdict["crate_id"],
        decision=verdict["decision"],
        reasons=[verdict["reason"]],
        received=received or date.today(),
        weight_kg=safe_weight(manifest),
    )
    return to_json(receipt)`,
      explanation:
        "to_json fixes the output format in one place: indent for humans, sort_keys for stable diffs, allow_nan=False so invalid JSON can never be written. encode_extra is only called for values json cannot handle, converts the types we want to support, and raises TypeError for everything else so mistakes stay visible. The dataclass branch relies on asdict, which also converts nested dataclasses, after which json calls encode_extra again for the date inside. stamp is the whole story in miniature: decide, build a typed record, serialize it.",
      hints: [
        { id: "h1", title: "The dataclass", content: "Put @dataclass above class Receipt: and list the fields as 'name: type' lines. The field with a default (weight_kg: float | None = None) must come last." },
        { id: "h2", title: "default=", content: "json.dumps(data, indent=2, sort_keys=True, default=encode_extra, allow_nan=False). Inside encode_extra, finish with raise TypeError(...) rather than returning something." },
        { id: "h3", title: "stamp", content: "Receipt(crate_id=verdict['crate_id'], decision=..., reasons=[verdict['reason']], received=received or date.today(), weight_kg=safe_weight(manifest)) and then to_json(receipt)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Receipt is a dataclass with the right fields",
          assertionCode: py`from dataclasses import fields as _fields, is_dataclass as _is_dc
assert _is_dc(Receipt), "Receipt must be decorated with @dataclass"
assert [f.name for f in _fields(Receipt)] == ["crate_id", "decision", "reasons", "received", "weight_kg"], "Fields, in order: crate_id, decision, reasons, received, weight_kg"
r = Receipt("C1", "LOAD", [], date(2026, 3, 14))
assert r.weight_kg is None, "weight_kg should default to None"`,
        },
        {
          id: "t2",
          description: "to_json is sorted, indented and exact",
          assertionCode: py`out = to_json({"b": 1, "a": [1, 2]})
assert out == '{\n  "a": [\n    1,\n    2\n  ],\n  "b": 1\n}', f"Expected 2-space indentation and sorted keys, got {out!r}"
assert to_json({"x": {"z": 1, "y": 2}}).index('"y"') < to_json({"x": {"z": 1, "y": 2}}).index('"z"'), "Nested keys must be sorted too"`,
        },
        {
          id: "t3",
          description: "Dates and sets are encoded",
          assertionCode: py`import json as _j
out = _j.loads(to_json({"day": date(2026, 3, 14), "moment": datetime(2026, 3, 14, 9, 30), "tags": {"b", "a", "c"}}))
assert out["day"] == "2026-03-14", f"A date should become its ISO text, got {out['day']!r}"
assert out["moment"] == "2026-03-14T09:30:00", f"A datetime should become ISO text, got {out['moment']!r}"
assert out["tags"] == ["a", "b", "c"], f"A set should become a SORTED list, got {out['tags']!r}"`,
        },
        {
          id: "t4",
          description: "Dataclasses are encoded, including nested ones",
          assertionCode: py`import json as _j
r = Receipt("C1", "QUARANTINE", ["too heavy"], date(2026, 3, 14), 31000.0)
out = _j.loads(to_json(r))
assert out == {"crate_id": "C1", "decision": "QUARANTINE", "reasons": ["too heavy"], "received": "2026-03-14", "weight_kg": 31000.0}, f"Got {out!r}"
out = _j.loads(to_json({"receipts": [r]}))
assert out["receipts"][0]["received"] == "2026-03-14", "A dataclass inside a list inside a dict should work too"`,
        },
        {
          id: "t5",
          description: "Unknown types and invalid JSON are refused",
          assertionCode: py`for bad in (object(), lambda: 1, 3 + 4j):
    try:
        to_json({"x": bad})
    except TypeError:
        pass
    else:
        raise AssertionError(f"{type(bad).__name__} cannot be written as JSON: encode_extra must raise TypeError, not guess")
try:
    encode_extra(object())
except TypeError as exc:
    assert "object" in str(exc), "The message should name the type that failed"
else:
    raise AssertionError("encode_extra(object()) should raise TypeError")
try:
    to_json({"w": float("nan")})
except ValueError:
    pass
else:
    raise AssertionError("NaN is not valid JSON: to_json should refuse to write it (allow_nan=False)")`,
        },
        {
          id: "t6",
          description: "stamp writes a receipt for a crate",
          assertionCode: py`import json as _j
good = {"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": True}}
text = stamp(good, date(2026, 3, 14))
assert isinstance(text, str), "stamp returns JSON text, not a dict"
_keys = list(_j.loads(text).keys())
assert _keys == sorted(_keys), "Keys should be sorted in the output text"
assert _j.loads(text) == {"crate_id": "CSQU3054383", "decision": "LOAD", "reasons": ["all clear"], "received": "2026-03-14", "weight_kg": 18250.5}, f"Got {_j.loads(text)!r}"
r = _j.loads(stamp({"container_id": "C2", "weight_kg": 31000, "customs": {"cleared": True}}, date(2026, 3, 14)))
assert r["decision"] == "QUARANTINE" and r["weight_kg"] == 31000.0, f"Got {r!r}"
r = _j.loads(stamp(["junk"], date(2026, 3, 14)))
assert r["decision"] == "REJECT" and r["crate_id"] is None and r["weight_kg"] is None, f"A non-manifest still gets a receipt, with nulls. Got {r!r}"
assert _j.loads(stamp(good))["received"] == date.today().isoformat(), "Without a date, use today's date"`,
        },
      ],
      unlocks: ["cc-receipt"],
      checks: [
        {
          prompt: "`json.dumps` meets a `date` object and has no idea what to do. When is your `default=` function called?",
          question: {
            type: "choice",
            options: [
              "For every value, before dumps looks at it",
              "Only for values dumps cannot serialize on its own",
              "Once, at the very end",
              "Never: default= is for dictionaries only",
            ],
            answer: 1,
          },
          explanation: "Plain strings, numbers, lists and dicts never reach `default`. It is a fallback for the types JSON has no equivalent for, and it should raise `TypeError` for the ones you still do not support.",
        },
        {
          prompt: "Why use `sort_keys=True` when writing JSON that other people (or tests) will compare?",
          question: {
            type: "choice",
            options: [
              "It makes the file smaller",
              "It makes the output deterministic: the same data always gives the same text",
              "It is required for valid JSON",
              "It makes loads faster",
            ],
            answer: 1,
          },
          explanation: "Dicts remember insertion order, so two programs can write the same data in different orders. Sorted keys give stable text for diffs, hashes, caches and snapshot tests.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "cargo-control-10-validation",
      title: "Check everything at the door",
      minutes: 24,
      xp: 120,
      concepts: ["validation at the boundary", "collecting all errors", "types & ranges", "enums"],
      learn: `### Validate at the boundary

Everything that comes from outside your program (a file, a network request, a form, another team's system) is **untrusted**. It can be missing fields, the wrong type, out of range, or hostile. The professional pattern is to **check it once, at the boundary, and then trust it inside**. After the door, the rest of the code can assume \`weight_kg\` is a real positive number, instead of sprinkling defensive \`if\` statements (and \`try\` blocks) through every function.

Validation protects you from crashes, from corrupt data being stored, and from security problems (a number where you expected a string is how many injection bugs begin).

### Invalid input is expected, so return data

A caller handing you a bad manifest is not an exceptional event; it is Tuesday. Raising on the first problem (as \`check_manifest\` does) means a person must fix one error, resubmit, find the next one, and repeat. Better: check *everything* and return **all** the problems at once.

~~~python
def validate_manifest(manifest):
    problems = []
    if manifest.get("owner") is None:
        problems.append({"field": "owner", "message": "is required"})
    ...
    return problems          # an empty list means valid
~~~

Each problem is a small dict: a **field** (so a program can highlight it) and a **message** (so a human can fix it).

### What to check, for each field

1. **Required?** Missing key and \`null\` both mean "not given".
2. **Type.** Is it a string, a number, a whole number, a list?
3. **Range or size.** A weight between 1 and 40000 kg; a string that is not empty.
4. **Allowed values (enum).** \`category\` must be one of a short list.
5. **Format.** Is an ID or an email shaped properly? (Next lesson.)

Check type *before* range: comparing \`"heavy" > 0\` is a \`TypeError\`. And only run later checks on a field if the earlier ones passed, so one mistake gives one clear problem instead of three confusing ones.

### Python's type-checking traps

- \`True\` and \`False\` are \`int\`s: \`isinstance(True, int)\` is \`True\`. A "pieces: true" must not count as the number 1.
- \`float("nan")\` is a float and fails every comparison (\`nan > 0\` and \`nan < 0\` are both \`False\`), so a range check silently *passes* it. Test \`math.isfinite\`.
- JSON \`3.0\` is a \`float\`, not an \`int\`. Decide whether that is acceptable.
- A whitespace-only string looks present but is empty. \`.strip()\` before testing.
- Membership tests like \`value in ("a", "b")\` are safe for any value; with a *set* or dict key an unhashable value (a list) would raise \`TypeError\`.

### Don't write all this forever

Hand-rolled validation like this is the best way to learn the ideas, and perfectly fine for a small, fixed shape. For real systems people use a standard: **JSON Schema** (a language-neutral vocabulary for describing JSON, used by OpenAPI, editors and many languages) or **pydantic** (Python classes with type hints that parse *and* validate, and report every error). You will build the core idea of both two lessons from now.

### Common mistakes

- Stopping at the first error.
- Validating deep inside the program instead of at the boundary, and doing it differently in three places.
- Trusting \`isinstance(x, int)\` for booleans.
- Letting an error message say only "invalid input", with no field name.
- Mutating or "fixing" bad data silently. Report it, or normalise it in one deliberate place.`,
      mission: `Until now your gate stopped at the first thing wrong with a crate. But a clerk who corrects one problem and resubmits, only to find another, will not be a happy clerk. The harbour authority wants the **complete** list of what is wrong with each manifest, in one go.

Write the first-line validator. When you Run, rejected crates show every problem at once, and the offending lines in the manifest light up.`,
      tasks: [
        "problem(field, message) and is_number(value): small helpers (no bool, no nan)",
        "validate_manifest(manifest): required fields, types, ranges and the category enum",
        "Collect every problem: never stop at the first",
        "A manifest that is not even an object gets one \"(root)\" problem",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: report EVERY problem with a manifest, not just the first.
CATEGORIES = ("general", "refrigerated", "hazardous", "bulk")
MIN_KG = 1                      # the max is IMPOSSIBLE_KG from lesson 4
REQUIRED_FIELDS = ("container_id", "owner", "contact", "weight_kg", "category", "pieces")


def problem(field, message):
    # TODO: return {"field": field, "message": message}
    ...


def is_number(value):
    # TODO: True for a real JSON number: an int or float that is NOT a bool and NOT nan/inf.
    # (Careful: math.isfinite() cannot take a huge int, so only call it on floats.)
    ...


def validate_manifest(manifest):
    # TODO: return a LIST of problems (empty when the manifest is fine). One problem per bad field.
    #   - manifest is not a dict       -> a single problem with field "(root)"
    #   - required fields: a missing key or a null value -> "is required"
    #   - container_id, owner, contact: when present they must be non-empty strings (strip first)
    #   - weight_kg: when present, a number (is_number) between MIN_KG and IMPOSSIBLE_KG inclusive
    #   - category: when present, one of CATEGORIES
    #   - pieces: when present, a whole number (int, not bool) of at least 1
    ...
`,
      solutionAdd: py`CATEGORIES = ("general", "refrigerated", "hazardous", "bulk")
MIN_KG = 1
REQUIRED_FIELDS = ("container_id", "owner", "contact", "weight_kg", "category", "pieces")


def problem(field, message):
    return {"field": field, "message": message}


def is_number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return isinstance(value, int) or math.isfinite(value)


def validate_manifest(manifest):
    if not isinstance(manifest, dict):
        return [problem("(root)", f"must be an object, got {type(manifest).__name__}")]
    problems = []

    for field in REQUIRED_FIELDS:
        if manifest.get(field) is None:
            problems.append(problem(field, "is required"))

    for field in ("container_id", "owner", "contact"):
        value = manifest.get(field)
        if value is not None and (not isinstance(value, str) or not value.strip()):
            problems.append(problem(field, "must be a non-empty string"))

    weight = manifest.get("weight_kg")
    if weight is not None:
        if not is_number(weight):
            problems.append(problem("weight_kg", "must be a number"))
        elif not MIN_KG <= weight <= IMPOSSIBLE_KG:
            problems.append(problem("weight_kg", f"must be between {MIN_KG} and {IMPOSSIBLE_KG} kg"))

    category = manifest.get("category")
    if category is not None and category not in CATEGORIES:
        problems.append(problem("category", "must be one of: " + ", ".join(CATEGORIES)))

    pieces = manifest.get("pieces")
    if pieces is not None and (isinstance(pieces, bool) or not isinstance(pieces, int) or pieces < 1):
        problems.append(problem("pieces", "must be a whole number of at least 1"))

    return problems`,
      explanation:
        "Each field is checked independently and appends to one list, so a manifest with five faults yields five problems. 'Required' is checked first; the later checks run only when a value is present, and the type check comes before the range check (the elif) so a string weight never reaches a numeric comparison. is_number rejects bool (an int subclass) and calls isfinite only on floats so huge ints cannot raise OverflowError. The result is plain data, a list of {field, message} dicts, which the scene can highlight and a person can read.",
      hints: [
        { id: "h1", title: "Helpers", content: "problem is a one-line dict. is_number: if isinstance(value, bool) or not isinstance(value, (int, float)): return False; then return isinstance(value, int) or math.isfinite(value)." },
        { id: "h2", title: "Shape", content: "problems = [] at the top, then one small block per field that appends. Return problems at the end. Use if weight is not None: ... if not is_number(weight): ... elif not (MIN_KG <= weight <= IMPOSSIBLE_KG): ..." },
        { id: "h3", title: "pieces", content: "isinstance(True, int) is True, so exclude bool explicitly: isinstance(pieces, bool) or not isinstance(pieces, int) or pieces < 1." },
      ],
      tests: [
        {
          id: "t1",
          description: "helpers: problem and is_number",
          assertionCode: py`assert problem("owner", "is required") == {"field": "owner", "message": "is required"}, "problem(field, message) returns a dict with those two keys"
for ok in (0, 1, -3, 2.5, 10 ** 400):
    assert is_number(ok) is True, f"{ok!r:.12} is a number"
for bad in (True, False, "5", None, [1], float("nan"), float("inf"), -float("inf")):
    assert is_number(bad) is False, f"{bad!r} must not count as a number"`,
        },
        {
          id: "t2",
          description: "A good manifest has no problems",
          assertionCode: py`good = {"container_id": "CSQU3054383", "owner": "Northwind Freight", "contact": "dock@northwind.example", "weight_kg": 18250.5, "category": "general", "pieces": 40}
assert validate_manifest(good) == [], f"A valid manifest should give an empty list, got {validate_manifest(good)!r}"`,
        },
        {
          id: "t3",
          description: "ALL problems are collected, not just the first",
          assertionCode: py`r = validate_manifest({})
assert isinstance(r, list) and {p["field"] for p in r} == {"container_id", "owner", "contact", "weight_kg", "category", "pieces"}, f"An empty manifest is missing six fields, got {[p['field'] for p in r]}"
assert len(r) == 6, "One problem per field: do not report the same field twice"
assert all(isinstance(p["message"], str) and p["message"] for p in r), "Every problem needs a message"
messy = {"container_id": "", "owner": 42, "contact": "a@b.c", "weight_kg": "heavy", "category": "toys", "pieces": 0}
r = validate_manifest(messy)
assert {p["field"] for p in r} == {"container_id", "owner", "weight_kg", "category", "pieces"}, f"Five fields are wrong: got {sorted(p['field'] for p in r)}"
assert len(r) == 5, f"Expected one problem for each of the 5 bad fields, got {len(r)}"`,
        },
        {
          id: "t4",
          description: "Weight checks: type, range, nan and bool",
          assertionCode: py`base = {"container_id": "C1", "owner": "N", "contact": "x@y.z", "category": "bulk", "pieces": 1}
def weight_problems(w):
    return [p for p in validate_manifest({**base, "weight_kg": w}) if p["field"] == "weight_kg"]
for good in (1, 1.0, 40000, 18250.5):
    assert weight_problems(good) == [], f"{good!r} kg is acceptable"
for bad in (0, 0.5, -5, 40001, "12", None, True, [5], float("nan"), float("inf"), 10 ** 400):
    assert len(weight_problems(bad)) == 1, f"weight_kg={bad!r:.14} should give exactly one weight_kg problem"`,
        },
        {
          id: "t5",
          description: "Category and pieces checks",
          assertionCode: py`base = {"container_id": "C1", "owner": "N", "contact": "x@y.z", "weight_kg": 10, "category": "bulk", "pieces": 1}
def fields_of(**changes):
    return sorted(p["field"] for p in validate_manifest({**base, **changes}))
for ok in ("general", "refrigerated", "hazardous", "bulk"):
    assert fields_of(category=ok) == [], f"category {ok!r} is allowed"
for bad in ("toys", "", 3, ["bulk"], "BULK"):
    assert fields_of(category=bad) == ["category"], f"category={bad!r} is not in CATEGORIES: expected exactly one category problem"
for ok in (1, 2, 500):
    assert fields_of(pieces=ok) == [], f"pieces={ok} is fine"
for bad in (0, -2, 2.5, 3.0, True, "3", [3]):
    assert fields_of(pieces=bad) == ["pieces"], f"pieces={bad!r} must be a whole number of at least 1"`,
        },
        {
          id: "t6",
          description: "Strings, null and non-objects",
          assertionCode: py`base = {"container_id": "C1", "owner": "N", "contact": "x@y.z", "weight_kg": 10, "category": "bulk", "pieces": 1}
r = validate_manifest({**base, "owner": "   "})
assert [p["field"] for p in r] == ["owner"], "A whitespace-only owner is empty"
r = validate_manifest({**base, "contact": None})
assert [p["field"] for p in r] == ["contact"] and "required" in r[0]["message"], "null counts as missing"
for junk in (None, [], "text", 42):
    r = validate_manifest(junk)
    assert len(r) == 1 and r[0]["field"] == "(root)", f"{junk!r} is not an object: expected a single '(root)' problem, got {r!r}"`,
        },
      ],
      unlocks: ["cc-fields"],
      checks: [
        {
          prompt: "Why collect ALL validation problems instead of raising at the first one?",
          question: {
            type: "choice",
            options: [
              "It is faster",
              "The person fixing the data sees everything wrong in one go instead of finding problems one resubmit at a time",
              "Python cannot raise exceptions in loops",
              "Exceptions are not allowed in validation code",
            ],
            answer: 1,
          },
          explanation: "A full list is a better experience for users and operators, and it is data, which a UI can highlight field by field. (Raising early is still right for *programming* errors.)",
        },
        {
          prompt: "`isinstance(True, int)` evaluates to...",
          question: {
            type: "choice",
            options: ["True, because bool is a subclass of int", "False", "A TypeError", "It depends on the Python version"],
            answer: 0,
          },
          explanation: "`bool` inherits from `int`, so `True == 1`. When a field must be a number or a whole number, exclude booleans explicitly.",
        },
        {
          prompt: "Why does `validate_manifest` check the type of `weight_kg` BEFORE comparing it to the limits?",
          question: {
            type: "choice",
            options: [
              "Comparing text with a number raises TypeError, and one bad field should not crash the whole validator",
              "Because type checks are faster",
              "Because Python requires it",
              "It does not matter what order the checks run in",
            ],
            answer: 0,
          },
          explanation: "`\"heavy\" >= 1` raises `TypeError`. A validator must never crash on bad data, so later checks only run when the earlier ones established it is safe to ask them.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "cargo-control-11-formats",
      title: "Is it really a container ID?",
      minutes: 22,
      xp: 120,
      concepts: ["regex fullmatch", "format validation", "check digits", "email checks"],
      learn: `### Some fields have a shape

A type check cannot tell \`"CSQU3054383"\` from \`"hello"\`; both are strings. IDs, emails, postcodes and phone numbers have a **format**, and regular expressions are the standard tool for describing one.

Real container IDs follow the international standard ISO 6346: **three owner letters, one category letter (\`U\`, \`J\` or \`Z\`), six serial digits and one check digit**: \`CSQU 305438 3\`.

~~~python
import re

CONTAINER_RE = re.compile(r"[A-Z]{3}[UJZ][0-9]{7}")
CONTAINER_RE.fullmatch("CSQU3054383")     # a match object (truthy)
CONTAINER_RE.fullmatch("CSQU3054383 ")    # None: trailing space
~~~

### match, search or fullmatch?

- \`re.search\` finds the pattern **anywhere** in the text.
- \`re.match\` requires it at the **start**, but allows anything after it.
- \`re.fullmatch\` requires the **whole string** to match.

For validation you almost always want \`fullmatch\`. With \`match\`, \`"CSQU3054383-DROP TABLE"\` passes. If you anchor with \`^...$\` instead, remember that \`$\` also matches just *before a trailing newline*, so \`"CSQU3054383\\n"\` slips through. \`fullmatch\` has neither problem.

### Regex pitfalls for validation

- Use **raw strings** (\`r"..."\`) so backslashes reach the regex engine untouched.
- \`\\d\` matches digits from *every* script (Arabic-Indic digits like \`٣\` too), and \`int("٣")\` even works. For strict ASCII digits use \`[0-9]\`.
- \`re.fullmatch(pattern, 123)\` raises \`TypeError\`: check \`isinstance(value, str)\` first, or a bad type crashes your validator.
- Keep patterns simple and inputs short. Nested quantifiers like \`(a+)+\` can take exponential time on crafted input ("ReDoS"), a real denial-of-service route. Put a length cap before the regex.
- Regex checks *shape*, not *truth*. \`CSQU3054380\` has the right shape. That is what the check digit is for.

### Check digits catch typos

The last character of a container ID is computed from the other ten. Give each of the first ten characters a value (digits are themselves; letters are mapped to 10, 12, 13, ... skipping multiples of 11), multiply by 2 to the power of its position, add them up, and take the total modulo 11, then modulo 10. If anyone mistypes a digit or swaps two, the check fails with high probability. Credit-card numbers (Luhn) and ISBNs work the same way. The function \`check_digit\` below is given to you; read it and see how it uses \`enumerate\`.

### Emails: be pragmatic

The full email grammar (RFC 5322) is enormous, and a regex that accepts only "truly valid" addresses will reject real ones. Use a **sanity** pattern: something, an \`@\`, something, a dot, something, with no spaces. The only real proof an address works is to send a message to it.

~~~python
EMAIL_RE = re.compile(r"[^@\\s]+@[^@\\s]+\\.[^@\\s]+")
~~~

### Common mistakes

- \`re.match\` or \`$\` instead of \`fullmatch\`.
- Forgetting that the format check must also accept (or skip) a missing field. "Missing" is the required-field check's job.
- Writing a clever email regex that rejects \`name+tag@example.co.uk\`.
- Running a regex on a non-string.`,
      mission: `A weight can be perfectly valid while the container ID is a typo, and a typo'd ID means a crate loaded onto the wrong ship. Real IDs have a built-in error check. The shipping line's contact must also be reachable.

Add format checks for IDs and emails. When you Run, the format checker lights up, and it can tell apart "this is not shaped like an ID" from "this is shaped right but the check digit is wrong".`,
      tasks: [
        "CONTAINER_RE and EMAIL_RE as compiled patterns (use the strict [0-9] and fullmatch)",
        "valid_container_id(value): shape AND check digit, False for anything that is not text",
        "valid_email(value): sanity pattern, at most 254 characters",
        "format_problems(manifest): problems for a bad container_id or contact (skip missing ones)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: container IDs and emails have a format, so check it.
import re

# ISO 6346 letter values: A=10, B=12, C=13, ... (multiples of 11 are skipped)
LETTER_VALUES = {
    "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16, "G": 17, "H": 18, "I": 19, "J": 20,
    "K": 21, "L": 23, "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29, "S": 30, "T": 31,
    "U": 32, "V": 34, "W": 35, "X": 36, "Y": 37, "Z": 38,
}


def check_digit(code):
    """The ISO 6346 check digit for the first 10 characters of a container ID (given)."""
    total = 0
    for position, char in enumerate(code):
        value = LETTER_VALUES[char] if char.isalpha() else int(char)
        total += value * 2 ** position
    return total % 11 % 10


CONTAINER_RE = ...   # TODO: 3 letters A-Z, one of U J Z, then 7 digits written [0-9] (6 serial + check digit)
EMAIL_RE = ...       # TODO: sanity pattern: no spaces or @ in the parts, one @, and a dot in the domain


def valid_container_id(value):
    # TODO: True only for a str that fully matches CONTAINER_RE AND whose last digit equals
    # check_digit(value[:10]). Anything that is not a str -> False (never raise).
    ...


def valid_email(value):
    # TODO: True only for a str of at most 254 characters that fully matches EMAIL_RE.
    ...


def format_problems(manifest):
    # TODO: a list of problems (reuse problem()) for fields that are PRESENT but badly formed.
    #   - not a dict                 -> []
    #   - container_id present (not None) and wrong shape  -> message mentions "must look like MSKU1234567"
    #   - container_id right shape but wrong check digit   -> message mentions "check digit"
    #   - contact present and not valid_email              -> "is not a valid email address"
    # A missing field is NOT a format problem (validate_manifest already reports it).
    ...
`,
      solutionAdd: py`import re

LETTER_VALUES = {
    "A": 10, "B": 12, "C": 13, "D": 14, "E": 15, "F": 16, "G": 17, "H": 18, "I": 19, "J": 20,
    "K": 21, "L": 23, "M": 24, "N": 25, "O": 26, "P": 27, "Q": 28, "R": 29, "S": 30, "T": 31,
    "U": 32, "V": 34, "W": 35, "X": 36, "Y": 37, "Z": 38,
}


def check_digit(code):
    """The ISO 6346 check digit for the first 10 characters of a container ID."""
    total = 0
    for position, char in enumerate(code):
        value = LETTER_VALUES[char] if char.isalpha() else int(char)
        total += value * 2 ** position
    return total % 11 % 10


CONTAINER_RE = re.compile(r"[A-Z]{3}[UJZ][0-9]{7}")
EMAIL_RE = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")


def valid_container_id(value):
    if not isinstance(value, str) or not CONTAINER_RE.fullmatch(value):
        return False
    return check_digit(value[:10]) == int(value[10])


def valid_email(value):
    return isinstance(value, str) and len(value) <= 254 and EMAIL_RE.fullmatch(value) is not None


def format_problems(manifest):
    if not isinstance(manifest, dict):
        return []
    problems = []
    container_id = manifest.get("container_id")
    if container_id is not None:
        if not isinstance(container_id, str) or not CONTAINER_RE.fullmatch(container_id):
            problems.append(problem("container_id", "must look like MSKU1234567 (3 letters, U/J/Z, 7 digits)"))
        elif check_digit(container_id[:10]) != int(container_id[10]):
            problems.append(problem("container_id", "has the right shape but the check digit does not match"))
    contact = manifest.get("contact")
    if contact is not None and not valid_email(contact):
        problems.append(problem("contact", "is not a valid email address"))
    return problems`,
      explanation:
        "fullmatch is the right anchor for validation: it needs the whole string to fit, with none of the trailing-newline loopholes of $. [0-9] keeps the digits ASCII, so a look-alike digit cannot slip through. valid_container_id first confirms the value is text and shaped right, and only then computes the check digit (which assumes valid input). format_problems splits the same test into 'wrong shape' and 'wrong check digit' so the message tells the user what to fix, and it skips missing fields, because 'required' is another check's job.",
      hints: [
        { id: "h1", title: "Patterns", content: 'CONTAINER_RE = re.compile(r"[A-Z]{3}[UJZ][0-9]{7}")  and  EMAIL_RE = re.compile(r"[^@\\s]+@[^@\\s]+\\.[^@\\s]+"). Always use a raw string.' },
        { id: "h2", title: "valid_container_id", content: "First: if not isinstance(value, str) or not CONTAINER_RE.fullmatch(value): return False. Then compare check_digit(value[:10]) with int(value[10])." },
        { id: "h3", title: "format_problems", content: 'Handle container_id with an if / elif: shape first, then check digit. Compare with "is not None" so an empty string still gets reported as a bad shape.' },
      ],
      tests: [
        {
          id: "t1",
          description: "Real container IDs pass",
          assertionCode: py`for good in ("CSQU3054383", "MSKU3395635", "TGHU1581761", "ZIMU0506317", "OOLU6825541"):
    assert valid_container_id(good) is True, f"{good} is a real, correctly check-digited ID"`,
        },
        {
          id: "t2",
          description: "Wrong shape or wrong check digit fails",
          assertionCode: py`bad_shape = ["CSQ3054383", "csqu3054383", "CSQU30543831", "CSQU305438", "XXXX1234567", "CSQX3054383", "CSQU3054383 ", " CSQU3054383", "CSQU3054383\n", "CSQU30543-3", "", "hello"]
for bad in bad_shape:
    assert valid_container_id(bad) is False, f"{bad!r} is not the right shape for a container ID"
for bad in ("CSQU3054384", "CSQU3054380", "MSKU3395630"):
    assert valid_container_id(bad) is False, f"{bad} has the right shape but the wrong check digit"`,
        },
        {
          id: "t3",
          description: "Non-text and look-alike digits never crash or pass",
          assertionCode: py`for junk in (None, 123, 3054383.0, ["CSQU3054383"], {"id": 1}, b"CSQU3054383", True):
    assert valid_container_id(junk) is False, f"{junk!r} is not text: valid_container_id should return False, not crash"
    assert valid_email(junk) is False, f"{junk!r} is not text: valid_email should return False, not crash"
assert valid_container_id("CSQU305438" + chr(0x0663)) is False, "An Arabic-Indic digit is not an ASCII digit. Use [0-9] instead of \\d"`,
        },
        {
          id: "t4",
          description: "valid_email accepts sane addresses only",
          assertionCode: py`for good in ("ops@maersk.example", "a.b+tag@sub.example.co.uk", "x@y.z"):
    assert valid_email(good) is True, f"{good} looks like a normal address"
for bad in ("no-at.example", "two@@example.com", "spaces in@example.com", "x@nodot", "x@example.", "@example.com", "a@b@c.com", "ops@example.com\n", "", "a@" + "b" * 260 + ".com"):
    assert valid_email(bad) is False, f"{bad[:30]!r} should be rejected"`,
        },
        {
          id: "t5",
          description: "format_problems tells shape from check digit",
          assertionCode: py`assert format_problems({"container_id": "CSQU3054383", "contact": "ops@maersk.example"}) == [], "Good formats give no problems"
r = format_problems({"container_id": "CSQ3054383"})
assert [p["field"] for p in r] == ["container_id"] and "MSKU1234567" in r[0]["message"], f"A wrong shape should say how an ID looks, got {r!r}"
r = format_problems({"container_id": "CSQU3054384"})
assert [p["field"] for p in r] == ["container_id"] and "check digit" in r[0]["message"], f"A wrong check digit should mention the check digit, got {r!r}"
r = format_problems({"contact": "nope"})
assert [p["field"] for p in r] == ["contact"], f"A bad email should give a contact problem, got {r!r}"
r = format_problems({"container_id": 12345, "contact": 99})
assert sorted(p["field"] for p in r) == ["contact", "container_id"], f"Non-text values are wrongly formed too, got {r!r}"`,
        },
        {
          id: "t6",
          description: "Missing fields and non-objects are not format problems",
          assertionCode: py`assert format_problems({}) == [], "Missing fields are reported by validate_manifest, not here"
assert format_problems({"container_id": None, "contact": None}) == [], "null counts as missing too"
for junk in (None, [], "CSQU3054383", 7):
    assert format_problems(junk) == [], f"{junk!r} is not an object, so there are no fields to check"
r = format_problems({"container_id": "", "contact": ""})
assert sorted(p["field"] for p in r) == ["contact", "container_id"], "An EMPTY string is present but badly formed"`,
        },
      ],
      unlocks: ["cc-formats"],
      checks: [
        {
          prompt: "You validate with `re.match(r\"[A-Z]{4}[0-9]{7}\", value)`. Which input wrongly PASSES?",
          question: {
            type: "choice",
            options: ["`\"CSQU3054383\"`", "`\"CSQU3054383-and-more-junk\"`", "`\"csqu3054383\"`", "`\"\"`"],
            answer: 1,
          },
          explanation: "`re.match` only anchors the *start*, so trailing junk is accepted. `re.fullmatch` requires the whole string to fit.",
        },
        {
          prompt: "What does the check digit in a container ID protect against?",
          question: {
            type: "choice",
            options: [
              "Hackers guessing IDs",
              "Typing mistakes: a single wrong or swapped character almost always makes the check fail",
              "Two companies using the same owner code",
              "Containers that are too heavy",
            ],
            answer: 1,
          },
          explanation: "A check digit is a cheap checksum. It cannot prove the container exists, but it catches most transcription errors before they cause damage.",
        },
        {
          prompt: "Why is it risky to run `re.fullmatch(pattern, value)` without first checking that `value` is a string?",
          question: {
            type: "choice",
            options: [
              "It would return a wrong match",
              "A number or None makes it raise TypeError, crashing a validator that should handle bad input",
              "It would be slower",
              "Regular expressions only work on ASCII",
            ],
            answer: 1,
          },
          explanation: "`re` functions require str or bytes. Untrusted data can be any JSON type, so check the type first and treat a wrong type as a failed validation.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "cargo-control-12-schema",
      title: "Rules as data",
      minutes: 26,
      xp: 140,
      concepts: ["schema as data", "generic validator", "recursion", "JSON Schema & pydantic"],
      learn: `### The problem with 'if' chains

\`validate_manifest\` and \`format_problems\` work, but look at them: every new field means more code, the rules for one field are scattered across two functions, and a non-programmer (or the front-end team) cannot read them to see what the rules are. And there is a deeper smell: **the rules are logic you cannot inspect.** You cannot list them, print them, send them to a browser or diff them between versions.

### Rules can be data

Describe the rules **as a dictionary**, and write *one* generic function that applies any such dictionary to any data:

~~~python
SCHEMA = {
    "owner":     {"type": "string",  "required": True, "min_length": 1},
    "weight_kg": {"type": "number",  "required": True, "min": 1, "max": 40000},
    "category":  {"type": "string",  "required": True, "enum": ["general", "bulk"]},
    "route": {"type": "object", "fields": {            # nested rules
        "origin":      {"type": "string", "required": True},
        "destination": {"type": "string", "required": True},
    }},
}
~~~

~~~python
def validate(data, schema, path=""):
    problems = []
    for name, rules in schema.items():
        value = data.get(name)
        ...                       # one generic loop applies every kind of rule
    return problems
~~~

Adding a field is now one line of data, not new code. The schema can be shown to users, generated into documentation, shared with a browser form, stored in a database, or unit-tested on its own. The engine is written, tested and trusted once.

### Nested rules need recursion

When a rule has \`"fields"\`, the engine calls **itself** on the nested object with the nested rules, passing a longer path (\`"route."\`) so problems report as \`route.origin\`. A function that calls itself on a smaller piece of the problem is *recursion*.

### Code in the data? Use a registry

A JSON-friendly schema cannot hold a function, but some rules (like the check digit) are logic. The standard answer is a **registry**: a dict from names to functions, with the schema holding only the *name*.

~~~python
CHECKS = {"iso6346": valid_container_id}
SCHEMA = {"container_id": {"type": "string", "check": "iso6346"}}
~~~

### Two kinds of error, kept apart

A bad **manifest** is expected: report it as a problem. A bad **schema** (a typo like \`"type": "strng"\`) is a programmer bug: raise \`ValueError\` loudly, don't quietly report every manifest as invalid.

### Problems as data, errors as flow

Sometimes a caller wants a list; sometimes it wants an exception to jump to the nearest handler. Offer both: \`validate\` returns the list, and a thin \`ensure_valid\` raises a \`ValidationError\` that *carries* the list as an attribute.

### What the real world uses

You have just built the heart of two standard tools:

- **JSON Schema** is exactly this idea, standardised: \`"type"\`, \`"required"\`, \`"minimum"\`, \`"maximum"\`, \`"enum"\`, \`"pattern"\`, nested \`"properties"\`. It is language-neutral (the same schema can validate in Python, JavaScript and your editor), and it underlies OpenAPI. In Python the \`jsonschema\` package implements it.
- **pydantic** takes the opposite route: you write a class with type hints, and it *parses and validates* incoming data into typed objects, with detailed error lists. It powers FastAPI.

Both exist because validation at the boundary is so universal. The principle is the same one you applied here: **check once at the door, produce clear errors, and trust the data inside.**

### Common mistakes

- Hard-coding field names inside the engine (then it is not generic).
- Silently skipping rule keys it doesn't recognise, so a misspelt rule does nothing.
- Putting a function object in a schema you want to serialize.
- Forgetting that nested problems need the full path.`,
      mission: `The authority keeps changing its rules: a new category here, a stricter weight limit there. Each change means editing and re-testing code. Your supervisor wants the rules written down as a table that she can read, and a single engine that enforces whatever the table says.

Replace the hand-written checks with a schema and a generic validator. When you Run, the rule book appears beside the crate: the scene draws it straight from your SCHEMA variable, and marks which rule each crate broke.`,
      tasks: [
        "SCHEMA: a plain dict describing every manifest field (including nested route and customs)",
        "validate(data, schema, path=\"\"): a generic engine for type, required, min, max, min_length, enum, pattern, check and nested fields",
        "Unknown schema types or checks are bugs: raise ValueError",
        "ValidationError carrying the problems, and ensure_valid(data, schema)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: the rules become data, and one engine enforces them.

# What each "type" word means (given). is_number from lesson 10 rejects bool and nan.
TYPE_CHECKS = {
    "string": lambda v: isinstance(v, str),
    "number": is_number,
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
}

# Named custom checks: the schema holds the NAME, the code lives here (given).
CHECKS = {"iso6346": valid_container_id}

# TODO: finish the schema. Keys you can use in a rule: type, required, min, max, min_length,
# enum (a list), pattern (a regex string, applied with fullmatch), check (a name from CHECKS)
# and fields (nested rules for an object). Plain data only: no functions!
SCHEMA = {
    "container_id": {"type": "string", "required": True, "pattern": "[A-Z]{3}[UJZ][0-9]{7}", "check": "iso6346"},
    "owner": {"type": "string", "required": True, "min_length": 1},
    # TODO: contact (required string shaped like an email), weight_kg (required number 1..40000),
    #       category (required string from CATEGORIES), pieces (required integer, at least 1)
    # TODO: route (optional object; origin and destination are required strings when route is present)
    # TODO: customs (optional object with an optional boolean "cleared")
}


def validate(data, schema, path=""):
    # TODO: return the list of problems for data (a dict) against schema.
    #   - data is not a dict -> [problem(path without its trailing dot or "(root)", "must be an object, got ...")]
    #   - for each field name and rules in the schema, let value = data.get(name) and where = path + name:
    #       * value is None: add problem(where, "is required") if rules.get("required"); then skip the rest
    #       * "type": an unknown type name -> raise ValueError (schema bug); a failed TYPE_CHECK -> problem, skip the rest
    #       * "min" / "max" (numbers), "min_length" (strings, after strip), "enum", "pattern", "check"
    #         (an unknown check name -> raise ValueError)
    #       * "fields": extend with validate(value, rules["fields"], where + ".")
    ...


class ValidationError(CargoError):
    # TODO: __init__(self, problems, crate_id=None): the message is a count plus the problems joined
    # by "; " ("2 problems: weight_kg must be a number; pieces is required"), and keep problems as an attribute.
    ...


def ensure_valid(data, schema):
    # TODO: return data when validate() finds no problems; otherwise raise ValidationError(problems, crate_id_of(data)).
    ...
`,
      solutionAdd: py`TYPE_CHECKS = {
    "string": lambda v: isinstance(v, str),
    "number": is_number,
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "object": lambda v: isinstance(v, dict),
    "array": lambda v: isinstance(v, list),
}

CHECKS = {"iso6346": valid_container_id}

SCHEMA = {
    "container_id": {"type": "string", "required": True, "pattern": "[A-Z]{3}[UJZ][0-9]{7}", "check": "iso6346"},
    "owner": {"type": "string", "required": True, "min_length": 1},
    "contact": {"type": "string", "required": True, "pattern": r"[^@\s]+@[^@\s]+\.[^@\s]+"},
    "weight_kg": {"type": "number", "required": True, "min": 1, "max": 40000},
    "category": {"type": "string", "required": True, "enum": ["general", "refrigerated", "hazardous", "bulk"]},
    "pieces": {"type": "integer", "required": True, "min": 1},
    "route": {
        "type": "object",
        "fields": {
            "origin": {"type": "string", "required": True, "min_length": 1},
            "destination": {"type": "string", "required": True, "min_length": 1},
        },
    },
    "customs": {"type": "object", "fields": {"cleared": {"type": "boolean"}}},
}


def validate(data, schema, path=""):
    if not isinstance(data, dict):
        return [problem(path.rstrip(".") or "(root)", f"must be an object, got {type(data).__name__}")]
    problems = []
    for name, rules in schema.items():
        where = path + name
        value = data.get(name)
        if value is None:
            if rules.get("required"):
                problems.append(problem(where, "is required"))
            continue

        expected = rules.get("type")
        if expected is not None:
            if expected not in TYPE_CHECKS:
                raise ValueError(f"schema error at {where}: unknown type {expected!r}")
            if not TYPE_CHECKS[expected](value):
                problems.append(problem(where, f"must be of type {expected}"))
                continue

        if "min" in rules and is_number(value) and value < rules["min"]:
            problems.append(problem(where, f"must be at least {rules['min']}"))
        if "max" in rules and is_number(value) and value > rules["max"]:
            problems.append(problem(where, f"must be at most {rules['max']}"))
        if "min_length" in rules and isinstance(value, str) and len(value.strip()) < rules["min_length"]:
            problems.append(problem(where, f"must have at least {rules['min_length']} characters"))
        if "enum" in rules and value not in rules["enum"]:
            problems.append(problem(where, "must be one of: " + ", ".join(str(option) for option in rules["enum"])))
        if "pattern" in rules and not (isinstance(value, str) and re.fullmatch(rules["pattern"], value)):
            problems.append(problem(where, "has the wrong format"))
        if "check" in rules:
            check = CHECKS.get(rules["check"])
            if check is None:
                raise ValueError(f"schema error at {where}: unknown check {rules['check']!r}")
            if not check(value):
                problems.append(problem(where, f"failed the {rules['check']} check"))
        if "fields" in rules:
            problems.extend(validate(value, rules["fields"], where + "."))
    return problems


class ValidationError(CargoError):
    """A manifest broke one or more rules. The details are in .problems."""

    def __init__(self, problems, crate_id=None):
        summary = "; ".join(f"{p['field']} {p['message']}" for p in problems)
        count = f"{len(problems)} problem" + ("" if len(problems) == 1 else "s")
        super().__init__(f"{count}: {summary}", crate_id)
        self.problems = problems


def ensure_valid(data, schema):
    problems = validate(data, schema)
    if problems:
        raise ValidationError(problems, crate_id_of(data))
    return data`,
      explanation:
        "The schema holds all the knowledge (what fields exist and what each must satisfy) as plain data, and validate is a generic loop over it: nothing in the engine mentions 'weight_kg'. Each rule key is a small independent check, nested objects recurse with a longer path so problems read 'route.origin', and the 'continue' after a failed type check keeps one mistake from producing a pile of follow-on problems. Unknown schema words raise ValueError because they are programmer bugs, not data problems. ValidationError wraps the same list for callers that prefer exceptions.",
      hints: [
        { id: "h1", title: "SCHEMA", content: 'Each field is a dict of rules, e.g. "weight_kg": {"type": "number", "required": True, "min": 1, "max": 40000}. "route" has a "fields" key holding another dict of rules.' },
        { id: "h2", title: "validate: skeleton", content: "problems = []; for name, rules in schema.items(): value = data.get(name); if value is None: (required?) ...; continue. Then handle type (with continue on failure), then each other key with `if \"min\" in rules and ...`." },
        { id: "h3", title: "Recursion and ValidationError", content: 'if "fields" in rules: problems.extend(validate(value, rules["fields"], where + ".")). For ValidationError call super().__init__(message, crate_id) and set self.problems = problems.' },
      ],
      tests: [
        {
          id: "t1",
          description: "SCHEMA is plain data and a good manifest passes",
          assertionCode: py`import json as _j
assert isinstance(SCHEMA, dict) and SCHEMA, "SCHEMA should be a dict of rules"
_j.dumps(SCHEMA)   # raises TypeError if a function sneaked in
good = {"container_id": "CSQU3054383", "owner": "Northwind Freight", "contact": "dock@northwind.example", "weight_kg": 18250.5, "category": "general", "pieces": 40, "route": {"origin": "Hamburg", "destination": "Rotterdam"}, "customs": {"cleared": True}}
assert validate(good, SCHEMA) == [], f"A valid manifest should give no problems, got {validate(good, SCHEMA)!r}"
minimal = {k: good[k] for k in ("container_id", "owner", "contact", "weight_kg", "category", "pieces")}
assert validate(minimal, SCHEMA) == [], "route and customs are optional"`,
        },
        {
          id: "t2",
          description: "validate collects every problem with its field",
          assertionCode: py`r = validate({}, SCHEMA)
assert sorted(p["field"] for p in r) == ["category", "contact", "container_id", "owner", "pieces", "weight_kg"], f"An empty manifest is missing the six required fields, got {sorted(p['field'] for p in r)}"
messy = {"container_id": "CSQU3054384", "owner": "  ", "contact": "nope", "weight_kg": 50000, "category": "toys", "pieces": 0}
r = validate(messy, SCHEMA)
assert sorted(p["field"] for p in r) == ["category", "contact", "container_id", "owner", "pieces", "weight_kg"], f"All six fields break a rule, got {sorted(p['field'] for p in r)}"
assert len(r) == 6 and all(p["message"] for p in r), "One problem per field, each with a message"`,
        },
        {
          id: "t3",
          description: "Types: bool is not a number, nan is not a number",
          assertionCode: py`base = {"container_id": "CSQU3054383", "owner": "N", "contact": "x@y.z", "weight_kg": 10, "category": "bulk", "pieces": 1}
def fields_for(**changes):
    return [p["field"] for p in validate({**base, **changes}, SCHEMA)]
assert fields_for(weight_kg="12") == ["weight_kg"], "A text weight is the wrong type: one problem, not several"
assert fields_for(weight_kg=True) == ["weight_kg"], "A bool is not a number"
assert fields_for(weight_kg=float("nan")) == ["weight_kg"], "nan is not a number"
assert fields_for(pieces=2.5) == ["pieces"] and fields_for(pieces=True) == ["pieces"], "pieces must be a real integer"
assert fields_for(owner=5) == ["owner"], "A number is not a string, and the string rules must not run (no TypeError)"`,
        },
        {
          id: "t4",
          description: "Nested rules report the full path",
          assertionCode: py`base = {"container_id": "CSQU3054383", "owner": "N", "contact": "x@y.z", "weight_kg": 10, "category": "bulk", "pieces": 1}
r = validate({**base, "route": {"origin": "Hamburg"}}, SCHEMA)
assert [p["field"] for p in r] == ["route.destination"], f"A missing nested field is reported as route.destination, got {r!r}"
r = validate({**base, "route": {"origin": "", "destination": 5}, "customs": {"cleared": "yes"}}, SCHEMA)
assert sorted(p["field"] for p in r) == ["customs.cleared", "route.destination", "route.origin"], f"Got {sorted(p['field'] for p in r)}"
r = validate({**base, "route": "Hamburg"}, SCHEMA)
assert [p["field"] for p in r] == ["route"], f"A non-object route is a single problem on 'route', got {r!r}"
assert validate({**base, "route": None, "customs": None}, SCHEMA) == [], "null for an optional field means 'not given'"`,
        },
        {
          id: "t5",
          description: "The engine is generic: it works on any schema",
          assertionCode: py`schema = {
    "name": {"type": "string", "required": True, "min_length": 3},
    "age": {"type": "integer", "min": 0, "max": 150},
    "ratio": {"type": "number", "min": 0, "max": 1},
    "mode": {"enum": ["fast", "slow"]},
    "code": {"type": "string", "pattern": "[a-z]{2}-[0-9]{2}"},
    "tags": {"type": "array"},
    "extra": {"type": "boolean"},
}
good = {"name": "Ada", "age": 36, "ratio": 0.5, "mode": "fast", "code": "ab-12", "tags": [], "extra": False}
assert validate(good, schema) == [], f"Got {validate(good, schema)!r}"
bad = {"name": "Al", "age": -1, "ratio": 1.5, "mode": "medium", "code": "ab-123", "tags": "x", "extra": 1}
r = validate(bad, schema)
assert sorted(p["field"] for p in r) == ["age", "code", "extra", "mode", "name", "ratio", "tags"], f"Seven fields break their rules, got {sorted(p['field'] for p in r)}"
assert [p["field"] for p in validate({"age": 3}, schema)] == ["name"], "Only 'name' is required in this schema"
assert len(validate({}, {})) == 0, "An empty schema accepts anything"
assert validate(good, {"name": {"type": "string", "required": True, "check": "iso6346"}})[0]["field"] == "name", "The iso6346 check should run for a 'check' rule"`,
        },
        {
          id: "t6",
          description: "A broken schema is a bug, not a data problem",
          assertionCode: py`for bad_schema in ({"x": {"type": "strng"}}, {"x": {"type": "string", "check": "no_such_check"}}):
    try:
        validate({"x": "value"}, bad_schema)
    except ValueError:
        pass
    else:
        raise AssertionError(f"{bad_schema!r} is a mistake in the schema itself: raise ValueError instead of reporting a problem")
r = validate("not a dict", SCHEMA)
assert len(r) == 1 and r[0]["field"] == "(root)", f"Non-dict data gives one (root) problem, got {r!r}"
r = validate({"route": [1]}, {"route": {"type": "object", "fields": {"a": {"type": "string"}}}})
assert [p["field"] for p in r] == ["route"], "A list where an object is declared is a single problem"`,
        },
        {
          id: "t7",
          description: "The schema agrees with the hand-written checks",
          assertionCode: py`samples = [
    {},
    {"container_id": "CSQU3054383", "owner": "N", "contact": "a@b.c", "weight_kg": 5, "category": "bulk", "pieces": 1},
    {"container_id": "CSQU3054384", "owner": "N", "contact": "a@b.c", "weight_kg": 5, "category": "bulk", "pieces": 1},
    {"container_id": "bad", "owner": "", "contact": "x", "weight_kg": "9", "category": "x", "pieces": "1"},
    {"container_id": 7, "owner": 7, "contact": 7, "weight_kg": 0, "category": 7, "pieces": 0},
    {"container_id": "MSKU3395635", "owner": "N", "contact": "a@b.c", "weight_kg": 50000, "category": "general", "pieces": 3},
    {"container_id": "MSKU3395635", "owner": "N", "contact": None, "weight_kg": float("nan"), "category": None, "pieces": True},
]
for s in samples:
    old = {p["field"] for p in validate_manifest(s)} | {p["field"] for p in format_problems(s)}
    new = {p["field"] for p in validate(s, SCHEMA)}
    assert old == new, f"The schema and the old checks disagree for {s!r}: the old checks flag {sorted(old)}, the schema flags {sorted(new)}"`,
        },
        {
          id: "t8",
          description: "ValidationError and ensure_valid",
          assertionCode: py`assert issubclass(ValidationError, CargoError) and ValidationError.disposition == "REJECT", "ValidationError is a CargoError that rejects"
good = {"container_id": "CSQU3054383", "owner": "N", "contact": "a@b.c", "weight_kg": 5, "category": "bulk", "pieces": 1}
assert ensure_valid(good, SCHEMA) is good, "ensure_valid returns the data when it is valid"
try:
    ensure_valid({"container_id": "CSQU3054383", "weight_kg": "heavy", "pieces": 0}, SCHEMA)
except ValidationError as exc:
    assert exc.crate_id == "CSQU3054383", "Pass crate_id_of(data) to the error"
    assert sorted(p["field"] for p in exc.problems) == ["category", "contact", "owner", "pieces", "weight_kg"], f"The problems should travel with the error, got {exc.problems!r}"
    assert str(exc).startswith("5 problems: ") and "weight_kg must be of type number" in str(exc), f"The message is a count plus the problems, got {str(exc)!r}"
else:
    raise AssertionError("Invalid data should raise ValidationError")`,
        },
      ],
      unlocks: ["cc-schema"],
      checks: [
        {
          prompt: "What is the main advantage of describing validation rules as a data structure plus one generic function?",
          question: {
            type: "choice",
            options: [
              "It runs faster than if statements",
              "Rules can be read, listed, shared and changed without touching the engine, which is written and tested once",
              "Python requires schemas for dictionaries",
              "It removes the need for any validation",
            ],
            answer: 1,
          },
          explanation: "Data can be inspected, serialized, documented and versioned. Adding a rule becomes a data change rather than a code change.",
        },
        {
          prompt: "A schema contains `\"type\": \"strng\"` (a typo). What should the validator do?",
          question: {
            type: "choice",
            options: [
              "Report every manifest as invalid",
              "Ignore the rule",
              "Raise an error: the schema itself is wrong, which is a programmer bug and should be loud",
              "Convert it to \"string\"",
            ],
            answer: 2,
          },
          explanation: "Bad data is expected and gets reported; a bad schema is a bug in your program. Raising `ValueError` makes the typo impossible to miss instead of silently doing the wrong thing.",
        },
        {
          prompt: "Which two real-world tools implement the same idea you just built?",
          question: {
            type: "choice",
            options: ["JSON Schema and pydantic", "regex and re", "logging and json", "dataclasses and contextlib"],
            answer: 0,
          },
          explanation: "JSON Schema is the standard vocabulary for describing JSON (the `jsonschema` package validates it), and pydantic validates and parses data into typed Python classes. Use them in production; build the idea once to understand them.",
        },
      ],
    },
  ],
};
