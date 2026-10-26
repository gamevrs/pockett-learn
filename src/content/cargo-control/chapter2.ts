import type { Chapter } from "@/engine/types";

/**
 * Cargo Control, chapter 2: Errors with meaning.
 * Raising, a custom exception hierarchy, chaining, and context managers (class and generator).
 */
const py = String.raw;

export const chapter2: Chapter = {
  id: "own-errors",
  title: "Errors with meaning",
  blurb: "Stop returning vague failures. Raise errors that say what went wrong, chain their causes, and guarantee cleanup.",
  lessons: [
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "cargo-control-4-custom-errors",
      title: "The depot's own errors",
      minutes: 22,
      xp: 110,
      concepts: ["raise", "custom exceptions", "exception hierarchy", "extra fields"],
      learn: `### Raising an error is saying "I cannot do my job"

\`raise\` creates an exception and stops the current function, just like a built-in failure would.

~~~python
def check_pieces(pieces):
    if pieces < 1:
        raise ValueError(f"pieces must be at least 1, got {pieces}")
    return pieces
~~~

Raise when a function **cannot do what its name promises** and has no sensible value to return. The alternative, returning \`None\` or \`-1\` or \`False\` as a secret signal, is how bugs hide: the caller has to remember to check, and the day they forget the failure travels on silently. A raised error cannot be ignored by accident.

A good message says *what* was wrong, *what* was expected and shows the *offending value*: \`"weight must be between 1 and 40000, got -5"\`, not \`"bad weight"\`.

### Built-in errors are not enough

\`ValueError\` says "something about a value was wrong", but a depot needs to tell a missing field from an overweight crate, and the code that *reacts* to those problems is different. So we give the program its own vocabulary: **custom exceptions**.

~~~python
class CargoError(Exception):
    """Base class for every problem the depot can describe."""
~~~

A custom exception is just a class that inherits from \`Exception\` (never from \`BaseException\`; that family is for things like Ctrl+C). It can carry **extra data** as attributes, and it can have **class attributes** that describe the whole category:

~~~python
class CargoError(Exception):
    disposition = "REJECT"          # what to do with a crate that causes this

    def __init__(self, message, crate_id=None, field=None):
        super().__init__(message)   # keeps str(exc) and exc.args working
        self.crate_id = crate_id
        self.field = field

class OverweightError(CargoError):
    disposition = "QUARANTINE"      # a subclass changes the category's default
~~~

### Why a hierarchy

Put one **base class** at the top of your own errors and make every specific error a subclass:

~~~text
Exception
  └─ CargoError
       ├─ MalformedManifestError
       ├─ MissingFieldError
       ├─ InvalidWeightError
       ├─ OverweightError
       └─ CustomsHoldError
~~~

Now callers pick the level of detail they want:

~~~python
try:
    check_manifest(manifest)
except OverweightError:        # only this specific problem
    send_for_reweigh()
except CargoError as exc:      # any other depot problem
    reject(exc)
~~~

Order matters: put the **specific** clauses first. Python takes the first match, and a \`CargoError\` clause above an \`OverweightError\` clause would catch everything and leave the specific one unreachable. Because everything is a \`CargoError\`, the rest of the program can write \`except CargoError\` to mean "any problem I know about" while real bugs (a \`TypeError\` from your own mistake, say) are *not* caught and stay visible.

A new subclass added next year does not break any existing \`except CargoError\`. That is the point of a hierarchy.

### Common mistakes

- Forgetting \`super().__init__(message)\`: then \`str(exc)\` is empty and tracebacks lose their message.
- Making a custom error that inherits from nothing (\`class MyError:\`). It cannot be raised, because raising needs an \`Exception\`.
- A different base class per error, so callers cannot catch "all depot errors" in one clause.
- Catching the base class where you meant a subclass, or the reverse.
- Putting the error's information only in the message text. Callers then parse strings. Store the data (\`exc.field\`) as attributes too.`,
      mission: `Built-in errors say *what Python complained about*. The depot needs errors that say *what is wrong with the crate* and *what to do about it*: reject it, or hold it for a human.

Build the depot's exception hierarchy, write the checks that raise it, and add \`triage\`, which catches the family and turns any problem into a routing decision. When you Run, the three routing bays open: LOAD, QUARANTINE and REJECT.`,
      tasks: [
        "CargoError base class with a disposition and crate_id / field attributes, plus five subclasses",
        "crate_id_of(manifest) and the three raising checks, wrapped by check_manifest",
        "triage(manifest): catch CargoError and return the routing decision as a dict",
        "Let real bugs pass through: catch CargoError only",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: give the depot its own vocabulary of errors, and use it to route crates.
MAX_GROSS_KG = 30480    # heavier than this needs a re-weigh      -> QUARANTINE
IMPOSSIBLE_KG = 40000   # heavier than this (or <= 0) is nonsense -> REJECT


class CargoError(Exception):
    # TODO: the base class for every depot problem.
    #   - class attribute: disposition = "REJECT"
    #   - __init__(self, message, crate_id=None, field=None): pass the message to
    #     super().__init__, and keep crate_id and field as attributes
    ...


# TODO: five subclasses of CargoError (a docstring or pass is enough for each):
#   MalformedManifestError, MissingFieldError, InvalidWeightError   -> keep the REJECT default
#   OverweightError, CustomsHoldError                               -> disposition = "QUARANTINE"


def crate_id_of(manifest):
    # TODO: the manifest's container_id, or None if the manifest is not a dict or has none.
    ...


def check_structure(manifest):
    # TODO: raise the FIRST problem you find, always passing crate_id and field:
    #   1. manifest is not a dict                         -> MalformedManifestError
    #   2. no "container_id" / no "weight_kg" key         -> MissingFieldError (field = the missing key)
    #   3. weight_kg is not a number (True/False do not count) -> InvalidWeightError
    #   4. weight_kg is <= 0, above IMPOSSIBLE_KG, nan or inf   -> InvalidWeightError
    #      (compare first, then test math.isfinite last: a huge int would break isfinite)
    ...


def check_weight_limit(manifest):
    # TODO: weight_kg above MAX_GROSS_KG -> OverweightError (assume check_structure already passed)
    ...


def check_customs(manifest):
    # TODO: manifest["customs"]["cleared"] must be exactly True.
    # A missing or non-dict "customs" counts as not cleared. Otherwise -> CustomsHoldError
    ...


def check_manifest(manifest):
    # TODO: run check_structure, check_weight_limit, then check_customs (in that order)
    ...


def triage(manifest):
    # TODO: call check_manifest. Catch CargoError ONLY and return
    #   {"decision": exc.disposition, "error": <class name>, "reason": str(exc),
    #    "field": exc.field, "crate_id": exc.crate_id}
    # When nothing is raised return
    #   {"decision": "LOAD", "error": None, "reason": "all clear", "field": None, "crate_id": crate_id_of(manifest)}
    ...
`,
      solutionAdd: py`MAX_GROSS_KG = 30480
IMPOSSIBLE_KG = 40000


class CargoError(Exception):
    """Base class for every problem the depot can describe."""

    disposition = "REJECT"

    def __init__(self, message, crate_id=None, field=None):
        super().__init__(message)
        self.crate_id = crate_id
        self.field = field


class MalformedManifestError(CargoError):
    """The manifest is not even the right shape."""


class MissingFieldError(CargoError):
    """A required field is absent."""


class InvalidWeightError(CargoError):
    """The weight is not a usable number."""


class OverweightError(CargoError):
    """Over the gross limit: weigh again before loading."""

    disposition = "QUARANTINE"


class CustomsHoldError(CargoError):
    """Customs has not cleared the crate."""

    disposition = "QUARANTINE"


def crate_id_of(manifest):
    return manifest.get("container_id") if isinstance(manifest, dict) else None


def check_structure(manifest):
    if not isinstance(manifest, dict):
        raise MalformedManifestError(f"manifest must be an object, got {type(manifest).__name__}")
    crate_id = crate_id_of(manifest)
    for field in ("container_id", "weight_kg"):
        if field not in manifest:
            raise MissingFieldError(f"missing field: {field}", crate_id, field)
    weight = manifest["weight_kg"]
    if isinstance(weight, bool) or not isinstance(weight, (int, float)):
        raise InvalidWeightError(f"weight_kg must be a number, got {type(weight).__name__}", crate_id, "weight_kg")
    if weight <= 0 or weight > IMPOSSIBLE_KG or not math.isfinite(weight):
        raise InvalidWeightError(f"impossible weight: {weight}", crate_id, "weight_kg")


def check_weight_limit(manifest):
    weight = manifest["weight_kg"]
    if weight > MAX_GROSS_KG:
        raise OverweightError(f"{weight} kg is over the {MAX_GROSS_KG} kg limit", crate_id_of(manifest), "weight_kg")


def check_customs(manifest):
    customs = manifest.get("customs")
    if not (isinstance(customs, dict) and customs.get("cleared") is True):
        raise CustomsHoldError("customs has not cleared this crate", crate_id_of(manifest), "customs")


def check_manifest(manifest):
    check_structure(manifest)
    check_weight_limit(manifest)
    check_customs(manifest)


def triage(manifest):
    try:
        check_manifest(manifest)
    except CargoError as exc:
        return {
            "decision": exc.disposition,
            "error": type(exc).__name__,
            "reason": str(exc),
            "field": exc.field,
            "crate_id": exc.crate_id,
        }
    return {"decision": "LOAD", "error": None, "reason": "all clear", "field": None, "crate_id": crate_id_of(manifest)}`,
      explanation:
        "The base class holds what every depot error shares (message, crate_id, field and the default disposition); each subclass states only what is different. check_structure raises the first problem it finds, with the data attached, so triage never has to parse a message: it reads exc.disposition, exc.field and exc.crate_id. triage catches CargoError only, so a genuine bug elsewhere is not disguised as a rejected crate.",
      hints: [
        {
          id: "h1",
          title: "The classes",
          content:
            'class CargoError(Exception): disposition = "REJECT"; def __init__(self, message, crate_id=None, field=None): super().__init__(message); self.crate_id = crate_id; self.field = field.  Then class OverweightError(CargoError): disposition = "QUARANTINE", and so on.',
        },
        {
          id: "h2",
          title: "The checks",
          content:
            'Use isinstance(manifest, dict) first. For the number test: isinstance(weight, bool) or not isinstance(weight, (int, float)). Always raise with the crate id and field: raise MissingFieldError(f"missing field: {field}", crate_id, field).',
        },
        {
          id: "h3",
          title: "triage",
          content:
            "try: check_manifest(manifest) / except CargoError as exc: return {...} using exc.disposition, type(exc).__name__, str(exc), exc.field, exc.crate_id. Put the LOAD dict after the try statement.",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "The hierarchy has a CargoError base with five subclasses",
          assertionCode: py`assert issubclass(CargoError, Exception), "CargoError must inherit from Exception"
for cls in (MalformedManifestError, MissingFieldError, InvalidWeightError, OverweightError, CustomsHoldError):
    assert issubclass(cls, CargoError), f"{cls.__name__} should be a subclass of CargoError"`,
        },
        {
          id: "t2",
          description: "Errors carry a message, crate_id and field",
          assertionCode: py`e = MissingFieldError("boom", "CSQU3054383", "weight_kg")
assert str(e) == "boom", "Pass the message to super().__init__ so str(exc) returns it"
assert e.crate_id == "CSQU3054383" and e.field == "weight_kg", "Keep crate_id and field as attributes"
e = CargoError("plain")
assert e.crate_id is None and e.field is None, "crate_id and field should default to None"`,
        },
        {
          id: "t3",
          description: "Each error class says what to do (disposition)",
          assertionCode: py`for cls in (CargoError, MalformedManifestError, MissingFieldError, InvalidWeightError):
    assert cls.disposition == "REJECT", f"{cls.__name__}.disposition should be 'REJECT'"
for cls in (OverweightError, CustomsHoldError):
    assert cls.disposition == "QUARANTINE", f"{cls.__name__}.disposition should be 'QUARANTINE'"
try:
    raise OverweightError("heavy")
except CargoError as exc:
    assert exc.disposition == "QUARANTINE"`,
        },
        {
          id: "t4",
          description: "check_structure raises the right error for each problem",
          assertionCode: py`def raised(m):
    try:
        check_structure(m)
    except CargoError as exc:
        return exc
    return None

e = raised(["not", "a", "dict"])
assert type(e) is MalformedManifestError, f"A list is not a manifest: expected MalformedManifestError, got {type(e).__name__}"
e = raised({"weight_kg": 10})
assert type(e) is MissingFieldError and e.field == "container_id", "A manifest without container_id should raise MissingFieldError with field='container_id'"
e = raised({"container_id": "CSQU3054383"})
assert type(e) is MissingFieldError and e.field == "weight_kg" and e.crate_id == "CSQU3054383", "A missing weight should raise MissingFieldError(field='weight_kg') and carry the crate_id"
for bad in ("heavy", None, True, [5]):
    e = raised({"container_id": "C1", "weight_kg": bad})
    assert type(e) is InvalidWeightError and e.field == "weight_kg", f"weight_kg={bad!r} is not a number: expected InvalidWeightError"
for bad in (0, -5, 40001, float("nan"), float("inf"), 10 ** 400):
    e = raised({"container_id": "C1", "weight_kg": bad})
    assert type(e) is InvalidWeightError, f"weight_kg={bad!r:.12} is impossible: expected InvalidWeightError"
assert raised({"container_id": "C1", "weight_kg": 35000}) is None, "35000 kg is heavy but physically possible: check_structure should accept it"`,
        },
        {
          id: "t5",
          description: "The policy checks raise the QUARANTINE errors",
          assertionCode: py`ok = {"container_id": "C1", "weight_kg": 1000, "customs": {"cleared": True}}
check_weight_limit(ok)
check_customs(ok)
try:
    check_weight_limit({"container_id": "C1", "weight_kg": 31000})
except OverweightError as exc:
    assert exc.field == "weight_kg" and exc.crate_id == "C1"
else:
    raise AssertionError("31000 kg is over MAX_GROSS_KG: expected OverweightError")
for customs in (None, {}, {"cleared": False}, {"cleared": "yes"}, "cleared", [True]):
    m = {"container_id": "C1", "weight_kg": 1000, "customs": customs}
    try:
        check_customs(m)
    except CustomsHoldError as exc:
        assert exc.field == "customs"
    else:
        raise AssertionError(f"customs={customs!r} is not a clear 'cleared': True, so expected CustomsHoldError")
try:
    check_customs({"container_id": "C1", "weight_kg": 1000})
except CustomsHoldError:
    pass
else:
    raise AssertionError("A manifest with no customs section counts as not cleared")`,
        },
        {
          id: "t6",
          description: "check_manifest runs the checks in order and passes clean crates",
          assertionCode: py`good = {"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": True}}
assert check_manifest(good) is None, "A clean manifest should pass without raising"
try:
    check_manifest({"container_id": "C1", "weight_kg": 31000})
except OverweightError:
    pass
else:
    raise AssertionError("Overweight AND no customs: the weight check comes first, so expect OverweightError")`,
        },
        {
          id: "t7",
          description: "triage routes crates and explains why",
          assertionCode: py`good = {"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": True}}
assert triage(good) == {"decision": "LOAD", "error": None, "reason": "all clear", "field": None, "crate_id": "CSQU3054383"}, f"A clean crate should be LOAD with reason 'all clear', got {triage(good)!r}"
r = triage({"container_id": "C2", "weight_kg": 31000, "customs": {"cleared": True}})
assert r["decision"] == "QUARANTINE" and r["error"] == "OverweightError" and r["field"] == "weight_kg" and r["crate_id"] == "C2" and "31000" in r["reason"], f"Overweight crate: got {r!r}"
r = triage({"container_id": "C3", "weight_kg": 500})
assert r["decision"] == "QUARANTINE" and r["error"] == "CustomsHoldError", f"No customs section: got {r!r}"
r = triage({"container_id": "C4", "weight_kg": "heavy"})
assert r["decision"] == "REJECT" and r["error"] == "InvalidWeightError", f"Text weight: got {r!r}"
r = triage(None)
assert r["decision"] == "REJECT" and r["error"] == "MalformedManifestError" and r["crate_id"] is None, f"None is not a manifest: got {r!r}"`,
        },
        {
          id: "t8",
          description: "triage does not hide real bugs",
          assertionCode: py`class Boom(dict):
    def __getitem__(self, key):
        raise RuntimeError("a genuine bug")
    def get(self, key, default=None):
        raise RuntimeError("a genuine bug")
    def __contains__(self, key):
        raise RuntimeError("a genuine bug")

try:
    triage(Boom())
except RuntimeError:
    pass
else:
    raise AssertionError("A RuntimeError is a bug, not a bad crate. triage should catch CargoError only and let it escape")`,
        },
      ],
      unlocks: ["cc-routing"],
      checks: [
        {
          prompt: "You write `except CargoError:` ABOVE `except OverweightError:` in the same try statement. What happens when an `OverweightError` is raised?",
          question: {
            type: "choice",
            options: [
              "The OverweightError clause runs, because it is more specific",
              "The CargoError clause runs, and the OverweightError clause can never be reached",
              "Python raises a SyntaxError",
              "Both clauses run, top to bottom",
            ],
            answer: 1,
          },
          explanation: "Python uses the first clause that matches, and an OverweightError *is a* CargoError. Always put specific exceptions before their parents.",
        },
        {
          prompt: "Why does a custom exception call `super().__init__(message)`?",
          question: {
            type: "choice",
            options: [
              "So the message is stored where str(exc) and tracebacks find it",
              "To make the exception faster",
              "It is required to be able to raise it",
              "To convert it to a built-in error",
            ],
            answer: 0,
          },
          explanation: "`Exception.__init__` stores the arguments in `exc.args`, which `str(exc)` and the traceback printer use. Without it your carefully written message vanishes.",
        },
        {
          prompt: "A function should do something that is impossible for the input it was given. Which is the better design?",
          question: {
            type: "choice",
            options: [
              "Return None and hope every caller checks",
              "Return the string \"ERROR\"",
              "Raise an exception with a clear message and the offending value",
              "Print a message and carry on",
            ],
            answer: 2,
          },
          explanation: "A raised exception cannot be ignored by accident: the failure travels up until something decides to handle it. Secret return values depend on every caller remembering to look.",
        },
      ],
    },

    // ───────────────────────── 5 ─────────────────────────
    {
      id: "cargo-control-5-chaining",
      title: "Re-raise and chain",
      minutes: 18,
      xp: 100,
      concepts: ["bare raise", "raise from", "__cause__", "exception chaining"],
      learn: `### Sometimes you can only handle half the problem

A handler may need to **do something and then let the error continue**: count it, log it, undo a change. A bare \`raise\` inside an \`except\` block re-raises the *same* exception, with its original traceback intact.

~~~python
try:
    weight = parse_weight(raw)
except InvalidWeightError:
    weight_failures += 1      # record it...
    raise                     # ...and let the caller decide what to do
~~~

Don't write \`raise exc\` for this (it works, but adds noise to the traceback) and never \`raise Exception(str(exc))\`, which throws away the type and the traceback.

### Translate errors at the boundary

\`float("heavy")\` raises \`ValueError\`. That is accurate but it is *Python's* vocabulary. The code that routes crates thinks in \`InvalidWeightError\`. A function at the boundary translates, but keeps the original as the **cause**:

~~~python
try:
    weight = float(raw)
except (ValueError, TypeError) as exc:
    raise InvalidWeightError(f"cannot read a weight from {raw!r}") from exc
~~~

\`raise X from exc\` sets \`X.__cause__ = exc\`, and the traceback tells the whole story:

~~~text
ValueError: could not convert string to float: 'heavy'

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  ...
InvalidWeightError: cannot read a weight from 'heavy'
~~~

Callers get a clean domain error to catch, and whoever debugs it still sees the real reason underneath.

### Three kinds of chaining

- **Explicit**: \`raise New from old\` sets \`__cause__\`. "This failed *because of* that."
- **Implicit**: if you raise a new exception *while handling* another (without \`from\`), Python records the old one in \`__context__\` and the traceback says "During handling of the above exception, another exception occurred". Usually that means your handler has a bug of its own.
- **Suppressed**: \`raise New from None\` hides the context. Use it rarely, when the original is pure noise and would only confuse the reader.

Each exception also has \`__suppress_context__\`, which is why a chain walk looks at \`__cause__\` first, then at \`__context__\` unless it was suppressed.

### Common mistakes

- \`raise NewError("failed")\` inside an \`except\` with no \`from\`: it chains implicitly, but with a misleading "another exception occurred" message. State the relationship with \`from exc\`.
- Catching an error just to raise a vaguer one, losing the details. Wrap to *add* meaning, never to remove it.
- Writing \`except Exception as exc: raise exc\`: that is just a noisier version of not catching it at all.
- Re-raising from deep inside a handler *after* doing work that might itself fail. Do the risky cleanup in a \`finally\` instead.`,
      mission: `Weights now arrive as text from older systems, and the gate swallows a mix of low-level Python errors that mean nothing to the foreman. The depot needs one clear story per rejection: what we saw, and what caused it.

Build a lenient weight reader that translates Python's errors into the depot's own, keeps a count of failures without hiding them, and walks the chain of causes. When you Run, the incident trace appears: each rejected crate shows its chain of causes.`,
      tasks: [
        "parse_weight(raw): translate float()'s ValueError/TypeError into InvalidWeightError, using raise ... from",
        "strict_weight(manifest): count failures, then re-raise the same error with a bare raise",
        "error_chain(exc): list \"Type: message\" for the error and every cause behind it",
        "weight_report(manifest): wrap it all in a dict the foreman can read",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: translate low-level errors, keep their causes, and walk the chain.
weight_failures = 0


def parse_weight(raw, crate_id=None):
    # TODO: lenient reader for weights that older systems send as text ("940", " 12.5 ").
    #   - float(raw) fails with ValueError or TypeError -> raise InvalidWeightError(
    #       f"cannot read a weight from {raw!r}", crate_id, "weight_kg") from exc
    #   - a result that is nan/inf or <= 0 -> InvalidWeightError (f"impossible weight: {weight}"), no cause
    #   - otherwise return the float
    ...


def strict_weight(manifest):
    # TODO: return parse_weight(manifest["weight_kg"], crate_id_of(manifest)), but count every failure
    # in the global weight_failures:
    #   - KeyError   -> add 1, raise MissingFieldError("missing field: weight_kg", crate_id, "weight_kg") from exc
    #   - TypeError  (the manifest is not subscriptable) -> add 1, raise MalformedManifestError(...) from exc
    #   - InvalidWeightError (already ours) -> add 1 and re-raise it with a BARE raise
    ...


def error_chain(exc):
    # TODO: ["OuterError: message", "CauseError: message", ...], outermost first.
    # Follow __cause__; if there is none, follow __context__ unless __suppress_context__ is True.
    # Guard against loops.
    ...


def weight_report(manifest):
    # TODO: try strict_weight(manifest); on CargoError return
    #   {"ok": False, "weight": None, "chain": error_chain(exc)}; on success
    #   {"ok": True, "weight": w, "chain": []}
    ...
`,
      solutionAdd: py`weight_failures = 0


def parse_weight(raw, crate_id=None):
    try:
        weight = float(raw)
    except (ValueError, TypeError) as exc:
        raise InvalidWeightError(f"cannot read a weight from {raw!r}", crate_id, "weight_kg") from exc
    if not math.isfinite(weight) or weight <= 0:
        raise InvalidWeightError(f"impossible weight: {weight}", crate_id, "weight_kg")
    return weight


def strict_weight(manifest):
    global weight_failures
    try:
        return parse_weight(manifest["weight_kg"], crate_id_of(manifest))
    except KeyError as exc:
        weight_failures += 1
        raise MissingFieldError("missing field: weight_kg", crate_id_of(manifest), "weight_kg") from exc
    except TypeError as exc:
        weight_failures += 1
        raise MalformedManifestError(f"manifest must be an object, got {type(manifest).__name__}") from exc
    except InvalidWeightError:
        weight_failures += 1
        raise


def error_chain(exc):
    chain = []
    seen = set()
    while exc is not None and id(exc) not in seen:
        seen.add(id(exc))
        chain.append(f"{type(exc).__name__}: {exc}")
        if exc.__cause__ is not None:
            exc = exc.__cause__
        elif not exc.__suppress_context__:
            exc = exc.__context__
        else:
            exc = None
    return chain


def weight_report(manifest):
    try:
        weight = strict_weight(manifest)
    except CargoError as exc:
        return {"ok": False, "weight": None, "chain": error_chain(exc)}
    return {"ok": True, "weight": weight, "chain": []}`,
      explanation:
        "parse_weight translates at the boundary and keeps the original error as __cause__ with 'from exc'. strict_weight does three different things on purpose: it translates a KeyError and a TypeError into depot errors (with 'from'), and for an error that is already ours it counts and then uses a bare raise, so the same exception object, with its cause and traceback, continues upward. error_chain walks __cause__ (or an unsuppressed __context__) with a loop guard, which is how a log or dashboard can show the full story.",
      hints: [
        { id: "h1", title: "parse_weight", content: "try: weight = float(raw) / except (ValueError, TypeError) as exc: raise InvalidWeightError(..., crate_id, \"weight_kg\") from exc. The nan/inf/<= 0 check goes AFTER the try statement." },
        { id: "h2", title: "strict_weight", content: "One try with three except clauses: KeyError as exc, TypeError as exc, and InvalidWeightError (no 'as' needed). The last one is: weight_failures += 1 then a line with just the word raise." },
        { id: "h3", title: "error_chain", content: "while exc is not None: append f'{type(exc).__name__}: {exc}', then move to exc.__cause__ if it is set, otherwise to exc.__context__ unless exc.__suppress_context__ is True." },
      ],
      tests: [
        {
          id: "t1",
          description: "parse_weight reads text and numbers",
          assertionCode: py`assert parse_weight("940") == 940.0 and type(parse_weight("940")) is float, "'940' should become the float 940.0"
assert parse_weight(" 12.5 ") == 12.5, "Surrounding spaces are fine"
assert parse_weight(7) == 7.0, "Numbers pass straight through as floats"`,
        },
        {
          id: "t2",
          description: "parse_weight translates errors and keeps the cause",
          assertionCode: py`try:
    parse_weight("heavy", "CSQU3054383")
except InvalidWeightError as exc:
    assert isinstance(exc.__cause__, ValueError), "Use 'raise ... from exc' so the original ValueError is kept as __cause__"
    assert exc.crate_id == "CSQU3054383" and exc.field == "weight_kg", "Pass crate_id and 'weight_kg' to the error"
    assert "heavy" in str(exc), "The message should show the offending value"
else:
    raise AssertionError("'heavy' should raise InvalidWeightError")
try:
    parse_weight(None)
except InvalidWeightError as exc:
    assert isinstance(exc.__cause__, TypeError), "None makes float() raise TypeError: keep it as the cause"
else:
    raise AssertionError("None should raise InvalidWeightError")`,
        },
        {
          id: "t3",
          description: "Impossible numbers are errors without a cause",
          assertionCode: py`for bad in ("nan", "inf", 0, "-4", -1.5):
    try:
        parse_weight(bad)
    except InvalidWeightError as exc:
        assert exc.__cause__ is None, f"{bad!r} converts fine; it is the VALUE that is impossible, so there is no underlying error to chain"
    else:
        raise AssertionError(f"{bad!r} is not a possible weight: expected InvalidWeightError")`,
        },
        {
          id: "t4",
          description: "strict_weight translates KeyError and TypeError",
          assertionCode: py`try:
    strict_weight({"container_id": "C1"})
except MissingFieldError as exc:
    assert isinstance(exc.__cause__, KeyError), "Translate with 'raise MissingFieldError(...) from exc'"
    assert exc.field == "weight_kg" and exc.crate_id == "C1"
else:
    raise AssertionError("A manifest without weight_kg should raise MissingFieldError")
try:
    strict_weight(["not", "a", "dict"])
except MalformedManifestError as exc:
    assert isinstance(exc.__cause__, TypeError), "Keep the TypeError as the cause"
else:
    raise AssertionError("A list is not a manifest: expected MalformedManifestError")
assert strict_weight({"container_id": "C1", "weight_kg": "940"}) == 940.0, "Good weights are returned as floats"`,
        },
        {
          id: "t5",
          description: "strict_weight re-raises our own errors unchanged and counts failures",
          assertionCode: py`start = weight_failures
try:
    strict_weight({"container_id": "C1", "weight_kg": "heavy"})
except InvalidWeightError as exc:
    assert type(exc.__cause__) is ValueError, "Use a bare 'raise' to re-raise the SAME error. Do not wrap it in a new one, or the original ValueError cause is buried"
else:
    raise AssertionError("'heavy' should raise InvalidWeightError")
assert weight_failures == start + 1, "Each failure should add 1 to weight_failures"
for m in ({}, ["x"]):
    try:
        strict_weight(m)
    except CargoError:
        pass
assert weight_failures == start + 3, "KeyError and TypeError failures must be counted too"
strict_weight({"container_id": "C1", "weight_kg": 5})
assert weight_failures == start + 3, "A success must not change the count"`,
        },
        {
          id: "t6",
          description: "error_chain lists the cause chain, outermost first",
          assertionCode: py`try:
    parse_weight("heavy")
except InvalidWeightError as exc:
    chain = error_chain(exc)
assert len(chain) == 2, f"Expected 2 entries (the error and its cause), got {chain!r}"
assert chain[0].startswith("InvalidWeightError: ") and chain[1].startswith("ValueError: "), f"Outermost first, formatted 'Type: message'. Got {chain!r}"
assert error_chain(ValueError("alone")) == ["ValueError: alone"], "An error with no cause is a chain of one"

try:
    try:
        1 / 0
    except ZeroDivisionError:
        raise KeyError("while handling")
except KeyError as exc:
    chain = error_chain(exc)
assert [c.split(":")[0] for c in chain] == ["KeyError", "ZeroDivisionError"], f"Follow __context__ too when there is no explicit cause. Got {chain!r}"

try:
    try:
        1 / 0
    except ZeroDivisionError:
        raise ValueError("outer") from None
except ValueError as exc:
    chain = error_chain(exc)
assert chain == ["ValueError: outer"], f"'from None' suppresses the context, so the chain stops. Got {chain!r}"`,
        },
        {
          id: "t7",
          description: "weight_report summarises success and failure",
          assertionCode: py`r = weight_report({"container_id": "C1", "weight_kg": "940"})
assert r == {"ok": True, "weight": 940.0, "chain": []}, f"Success should be ok with an empty chain, got {r!r}"
r = weight_report({"container_id": "C1", "weight_kg": "heavy"})
assert r["ok"] is False and r["weight"] is None, f"Failure should have ok False and weight None, got {r!r}"
assert [c.split(":")[0] for c in r["chain"]] == ["InvalidWeightError", "ValueError"], f"The chain should explain the cause, got {r['chain']!r}"
r = weight_report({})
assert [c.split(":")[0] for c in r["chain"]] == ["MissingFieldError", "KeyError"], f"A missing weight chains MissingFieldError <- KeyError, got {r['chain']!r}"`,
        },
      ],
      unlocks: ["cc-trace"],
      checks: [
        {
          prompt: "Inside an `except` block, what does a line containing only `raise` do?",
          question: {
            type: "choice",
            options: [
              "Raises a brand-new generic Exception",
              "Re-raises the exception being handled, with its original traceback",
              "Silences the exception",
              "Is a syntax error outside a function",
            ],
            answer: 1,
          },
          explanation: "A bare `raise` re-raises the current exception unchanged, so you can count or log it and still let the caller decide. `raise exc` also works but makes the traceback noisier.",
        },
        {
          prompt: "What does `raise InvalidWeightError(...) from exc` add that a plain `raise InvalidWeightError(...)` inside the handler does not?",
          question: {
            type: "choice",
            options: [
              "Nothing, they are identical",
              "It marks `exc` as the deliberate CAUSE (`__cause__`), so the traceback says \"direct cause\" instead of the vaguer \"during handling, another exception occurred\"",
              "It makes the new exception faster",
              "It deletes the original error",
            ],
            answer: 1,
          },
          explanation: "Both keep the old error around, but `from exc` states the relationship explicitly. Use `from None` only when the original is pure noise.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "cargo-control-6-context-managers",
      title: "Doors that always close",
      minutes: 20,
      xp: 110,
      concepts: ["with statement", "__enter__ / __exit__", "suppress vs propagate", "resource cleanup"],
      learn: `### The with statement

Whenever you **acquire** something that must be **released** (a file, a lock, a database transaction, a loading bay), the safe pattern is \`try\` / \`finally\`. Python has a tidier form of it: the \`with\` statement.

~~~python
with open("manifest.json") as f:
    text = f.read()
# f is closed here, even if read() raised
~~~

\`with\` works with any object that follows the **context manager protocol**: two special methods.

- \`__enter__(self)\` runs when the block starts. Whatever it **returns** is bound by \`as\`.
- \`__exit__(self, exc_type, exc, tb)\` runs when the block ends, however it ends. On a normal exit all three arguments are \`None\`. If the block raised, they describe the exception.

### Writing one as a class

~~~python
class Stopwatch:
    def __enter__(self):
        self.started = time.perf_counter()
        return self                      # this is what "as" receives

    def __exit__(self, exc_type, exc, tb):
        self.elapsed = time.perf_counter() - self.started
        return False                     # do not suppress anything
~~~

~~~python
with Stopwatch() as watch:
    do_the_work()
print(watch.elapsed)
~~~

### The return value of \`__exit__\`: suppress or propagate

This is the part everyone gets wrong at first.

- Return a **falsy** value (\`False\`, \`None\`, or just no return at all): the exception, if there was one, **propagates** after your cleanup. This is the default and almost always right.
- Return **\`True\`**: the exception is **suppressed**. Execution continues after the \`with\` block as if nothing happened.

Suppressing is powerful and dangerous. A good \`__exit__\` suppresses only the narrow family of errors it *understands*, which here is \`CargoError\`:

~~~python
def __exit__(self, exc_type, exc, tb):
    ...cleanup first...
    return exc_type is not None and issubclass(exc_type, CargoError)
~~~

An \`__exit__\` that always returns \`True\` swallows every bug in the block, including typos, and even \`KeyboardInterrupt\`.

### Other things worth knowing

- Do the cleanup **first** and make it hard to fail; an exception raised from \`__exit__\` replaces the original one.
- A database transaction manager is the classic example: commit if \`exc_type is None\`, otherwise roll back.
- \`contextlib.suppress(FileNotFoundError)\` is a ready-made manager for "ignore exactly this error".
- Several managers can share one statement: \`with A() as a, B() as b:\`. They exit in reverse order.

### Common mistakes

- Forgetting \`return self\` in \`__enter__\`: then \`as bay\` is \`None\`.
- A \`__exit__\` with the wrong number of parameters (it takes exactly three besides self).
- Returning a truthy value by accident (for example the result of a comparison you did not mean to return).
- Cleaning up only on success. The whole point is that cleanup also runs on failure.`,
      mission: `The depot has four loading bays. A crate that fails inspection while a bay is held used to leave the bay locked forever; after four bad crates the depot was jammed.

Write a \`DockBay\` context manager so a bay is **always** released, and so that depot problems end the visit without crashing the controller. When you Run, the dock board appears, and a "stuck bays" counter tells you whether your code ever leaks one.`,
      tasks: [
        "DockBay class with __enter__ and __exit__ (track bays in use, number bays 1 to 4 in turn)",
        "Suppress CargoError only: any other exception must propagate, after the bay is released",
        "dock(manifest): inspect a crate inside a bay and report the result",
        "bays_open(): how many bays are in use right now",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: a loading bay that is ALWAYS released.

class DockBay:
    in_use = 0       # bays currently occupied (shared by every DockBay)
    issued = 0       # how many bays have ever been handed out

    def __init__(self, crate_id):
        self.crate_id = crate_id
        self.number = None
        self.error = None

    def __enter__(self):
        # TODO: take a bay.
        #   - self.number = the next bay, cycling 1, 2, 3, 4, 1, ...   (use DockBay.issued)
        #   - add 1 to DockBay.issued and DockBay.in_use
        #   - return self (that is what "as bay" receives)
        ...

    def __exit__(self, exc_type, exc, tb):
        # TODO: release the bay no matter what.
        #   - subtract 1 from DockBay.in_use
        #   - if an exception happened, remember its class name in self.error
        #   - suppress it (return True) ONLY when it is a CargoError; propagate everything else
        ...


def dock(manifest):
    # TODO: inside "with DockBay(crate_id) as bay:" call check_manifest(manifest) and then set
    # loaded = True. A CargoError ends the visit early (the bay suppresses it).
    # Return {"bay": bay.number, "loaded": loaded, "error": bay.error, "in_use": DockBay.in_use}
    ...


def bays_open():
    # TODO: how many bays are in use right now?
    ...
`,
      solutionAdd: py`class DockBay:
    in_use = 0
    issued = 0

    def __init__(self, crate_id):
        self.crate_id = crate_id
        self.number = None
        self.error = None

    def __enter__(self):
        self.number = DockBay.issued % 4 + 1
        DockBay.issued += 1
        DockBay.in_use += 1
        return self

    def __exit__(self, exc_type, exc, tb):
        DockBay.in_use -= 1
        if exc_type is not None:
            self.error = exc_type.__name__
        return exc_type is not None and issubclass(exc_type, CargoError)


def dock(manifest):
    loaded = False
    with DockBay(crate_id_of(manifest)) as bay:
        check_manifest(manifest)
        loaded = True
    return {"bay": bay.number, "loaded": loaded, "error": bay.error, "in_use": DockBay.in_use}


def bays_open():
    return DockBay.in_use`,
      explanation:
        "__enter__ takes the bay and returns self so 'as bay' works. __exit__ always runs: it releases the bay first, records the error name for the report, and returns True only for CargoError, so depot problems end the visit quietly while genuine bugs (a RuntimeError, a KeyboardInterrupt) keep propagating after the bay is freed. In dock(), 'loaded = True' is the last statement of the block, so it is only reached when check_manifest raised nothing.",
      hints: [
        { id: "h1", title: "Taking a bay", content: "self.number = DockBay.issued % 4 + 1 gives 1, 2, 3, 4, 1, ... Then increase DockBay.issued and DockBay.in_use by one, and return self." },
        { id: "h2", title: "Releasing", content: "In __exit__: DockBay.in_use -= 1 first. Then if exc_type is not None, set self.error = exc_type.__name__. The return value is exc_type is not None and issubclass(exc_type, CargoError)." },
        { id: "h3", title: "dock()", content: "Start with loaded = False. Inside the with block: check_manifest(manifest) then loaded = True. Read bay.number and bay.error after the block." },
      ],
      tests: [
        {
          id: "t1",
          description: "A bay is taken on entry and released on exit",
          assertionCode: py`start = DockBay.in_use
with DockBay("CSQU3054383") as bay:
    assert isinstance(bay, DockBay), "__enter__ must return self so that 'as bay' receives the DockBay"
    assert DockBay.in_use == start + 1, "Entering should add 1 to DockBay.in_use"
    assert bay.number in (1, 2, 3, 4), "bay.number should be 1, 2, 3 or 4"
assert DockBay.in_use == start, "Leaving the block should release the bay (subtract 1)"
assert bay.error is None, "No exception happened, so bay.error stays None"
assert bay.crate_id == "CSQU3054383"`,
        },
        {
          id: "t2",
          description: "Bays are numbered in turn: 1, 2, 3, 4, 1, ...",
          assertionCode: py`numbers = []
for i in range(6):
    with DockBay(f"C{i}") as bay:
        numbers.append(bay.number)
for a, b in zip(numbers, numbers[1:]):
    assert b == a % 4 + 1, f"After bay {a} comes bay {a % 4 + 1}, but got {b}. All numbers: {numbers}"`,
        },
        {
          id: "t3",
          description: "A CargoError is suppressed and the bay still released",
          assertionCode: py`start = DockBay.in_use
reached = False
with DockBay("C1") as bay:
    raise OverweightError("too heavy", "C1", "weight_kg")
    reached = "never"
reached = True
assert reached is True, "A CargoError should be suppressed: the code after the with block must run"
assert bay.error == "OverweightError", f"bay.error should hold the class name 'OverweightError', got {bay.error!r}"
assert DockBay.in_use == start, "The bay must be released even though the block failed"`,
        },
        {
          id: "t4",
          description: "Other exceptions propagate, after the bay is released",
          assertionCode: py`start = DockBay.in_use
for exc_class in (RuntimeError, KeyError, ValueError):
    try:
        with DockBay("C1") as bay:
            raise exc_class("a bug, not a depot problem")
    except exc_class:
        pass
    else:
        raise AssertionError(f"A {exc_class.__name__} is a real bug: __exit__ must return a falsy value for it so it propagates")
    assert DockBay.in_use == start, f"The bay must be released even when a {exc_class.__name__} escapes"
    assert bay.error == exc_class.__name__`,
        },
        {
          id: "t5",
          description: "dock() reports what happened",
          assertionCode: py`start = DockBay.in_use
good = {"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": True}}
r = dock(good)
assert r["loaded"] is True and r["error"] is None and r["bay"] in (1, 2, 3, 4), f"A clean crate should be loaded with no error, got {r!r}"
r = dock({"container_id": "C2", "weight_kg": 31000, "customs": {"cleared": True}})
assert r["loaded"] is False and r["error"] == "OverweightError", f"An overweight crate is not loaded; error should be 'OverweightError', got {r!r}"
r = dock("not a manifest")
assert r["loaded"] is False and r["error"] == "MalformedManifestError", f"A string is not a manifest, got {r!r}"
assert r["in_use"] == start and DockBay.in_use == start, "dock() must leave no bay occupied"`,
        },
        {
          id: "t6",
          description: "dock() never leaks a bay, even on a genuine bug",
          assertionCode: py`class Boom(dict):
    def __getitem__(self, key):
        raise RuntimeError("a genuine bug")
    def get(self, key, default=None):
        raise RuntimeError("a genuine bug")
    def __contains__(self, key):
        raise RuntimeError("a genuine bug")

start = DockBay.in_use
try:
    dock(Boom())
except RuntimeError:
    pass
else:
    raise AssertionError("A RuntimeError is a bug and should escape dock()")
assert DockBay.in_use == start, "The bay must be released even when a bug escapes"
assert bays_open() == DockBay.in_use, "bays_open() should report DockBay.in_use"`,
        },
      ],
      unlocks: ["cc-docks"],
      checks: [
        {
          prompt: "What happens if `__exit__` returns `True` while the `with` block raised a `KeyError`?",
          question: {
            type: "choice",
            options: [
              "The KeyError propagates as usual",
              "The KeyError is suppressed and the program continues after the with block",
              "Python raises a second error",
              "The with block runs again",
            ],
            answer: 1,
          },
          explanation: "A truthy return value from `__exit__` tells Python the exception has been handled. That is why you return `True` only for the narrow set of errors you really mean to absorb.",
        },
        {
          prompt: "Why is an `__exit__` that always returns `True` dangerous?",
          question: {
            type: "choice",
            options: [
              "It is slower",
              "It silently swallows every error in the block, including genuine bugs",
              "It prevents the cleanup code from running",
              "It makes `__enter__` fail",
            ],
            answer: 1,
          },
          explanation: "Suppression hides failures from everything above. Absorb only the exceptions you understand and let the rest travel up after the cleanup.",
        },
        {
          prompt: "If `__enter__` forgets to `return self`, what does `with DockBay(x) as bay:` bind `bay` to?",
          question: { type: "text", answer: ["None", "none"], placeholder: "a value" },
          explanation: "Without a return statement a method returns `None`, and `as` binds exactly what `__enter__` returned.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "cargo-control-7-contextmanager",
      title: "Context managers, the short way",
      minutes: 18,
      xp: 100,
      concepts: ["contextlib.contextmanager", "yield", "try/finally around yield", "multiple context managers"],
      learn: `### A generator can be a context manager

Writing a class with two dunder methods is a lot of ceremony for a small job. \`contextlib.contextmanager\` turns a **generator function with exactly one \`yield\`** into a context manager:

~~~python
from contextlib import contextmanager

@contextmanager
def stopwatch(label):
    started = time.perf_counter()      # 1. runs on enter
    try:
        yield started                  # 2. the "with" body runs here; the value is bound by "as"
    finally:
        elapsed = time.perf_counter() - started
        print(label, elapsed)          # 3. runs on exit, always
~~~

~~~python
with stopwatch("load") as t0:
    load_everything()
~~~

The mapping to the class version is direct: code **before** \`yield\` is \`__enter__\`; the **yielded value** is what \`as\` receives; code **after** \`yield\` is \`__exit__\`.

### Exceptions arrive at the yield

If the body raises, Python **throws the exception into the generator at the \`yield\`**, exactly where it paused. That has two consequences:

1. Cleanup after \`yield\` only runs on failure if it is inside \`try\` / \`finally\` (or an \`except\`). Without them, an error in the body skips your cleanup. This is the most common mistake with \`@contextmanager\`.
2. Suppress or propagate is decided by what the generator does with the exception: **catch it and carry on** to suppress it, **re-raise it** (a bare \`raise\`) or let it escape to propagate.

~~~python
@contextmanager
def audited(crate_id):
    entry = {"crate_id": crate_id, "status": "open"}
    log.append(entry)
    try:
        yield entry
    except Exception as exc:
        entry["status"] = f"crashed: {type(exc).__name__}"
        raise                           # record it, then propagate
    else:
        entry["status"] = "closed"      # only when the body finished cleanly
    finally:
        entry["sealed"] = True          # always
~~~

Note \`except Exception\`, not a bare \`except\`: Ctrl+C and generator shutdown should pass through untouched.

### Class or generator?

Use the **generator** form for simple "set up, yield, tear down" needs; use the **class** when the manager has real state or needs to be reused and inspected afterwards (like \`DockBay\`, with its counters). They are interchangeable to the \`with\` statement.

### Several at once

~~~python
with audited(crate_id) as entry, DockBay(crate_id) as bay:
    ...
~~~

This is the same as nesting: \`audited\` is the outer manager and \`DockBay\` the inner. They exit in **reverse** order (bay first, then audit). Order matters when one of them suppresses: an inner manager that swallows an exception hides it from the outer one.

### The cleanup guarantee toolbox

- \`try\` / \`finally\`: the low-level tool.
- \`with\`: the readable, reusable version of the same promise.
- \`contextlib.suppress(E)\`: ignore exactly one kind of error around a block.
- \`contextlib.ExitStack\`: when the number of things to clean up is only known at run time.

### Common mistakes

- A \`yield\` outside \`try\` / \`finally\`: the cleanup is skipped on errors.
- Yielding more than once (the manager will complain at run time).
- Catching an exception in the generator and forgetting it is now **suppressed**. Add \`raise\` if it should continue upward.
- Doing work that can fail inside \`finally\` and masking the original error.`,
      mission: `The harbour authority wants a sealed paper trail: every crate that enters the depot must leave an audit record, even if the controller itself crashes halfway through.

Write the audit trail as a generator-based context manager, then combine it with your dock bay to build \`handle_crate\`, the first full "handle one crate" routine. When you Run, the audit trail appears with every record sealed.`,
      tasks: [
        "audited(crate_id): a @contextmanager that opens, closes or marks a record as crashed, and always seals it",
        "handle_crate(manifest): one with statement that uses audited and DockBay together",
        "recent_audit(n): the last few audit records",
        "Check: a crash inside the block still seals the record and releases the bay",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: a sealed audit record for every crate, built with @contextmanager.
from contextlib import contextmanager

audit_log = []    # every audit record, oldest first


@contextmanager
def audited(crate_id):
    # TODO: 1. create entry = {"crate_id": crate_id, "status": "open", "decision": None, "sealed": False}
    #          and append it to audit_log
    #       2. yield entry, inside a try statement:
    #            except Exception as exc -> entry["status"] = f"crashed: {type(exc).__name__}" then re-raise
    #            else                    -> entry["status"] = "closed"
    #            finally                 -> entry["sealed"] = True
    ...


def handle_crate(manifest):
    # TODO: one with statement, two managers: audited(crate_id) as entry, DockBay(crate_id) as bay.
    # Inside: verdict = triage(manifest) and entry["decision"] = verdict["decision"].
    # Return {"crate_id": crate_id, "decision": verdict["decision"], "reason": verdict["reason"],
    #         "bay": bay.number, "audit": entry["status"]}
    ...


def recent_audit(n=6):
    # TODO: the last n audit records (a list, oldest first)
    ...
`,
      solutionAdd: py`from contextlib import contextmanager

audit_log = []


@contextmanager
def audited(crate_id):
    entry = {"crate_id": crate_id, "status": "open", "decision": None, "sealed": False}
    audit_log.append(entry)
    try:
        yield entry
    except Exception as exc:
        entry["status"] = f"crashed: {type(exc).__name__}"
        raise
    else:
        entry["status"] = "closed"
    finally:
        entry["sealed"] = True


def handle_crate(manifest):
    crate_id = crate_id_of(manifest)
    with audited(crate_id) as entry, DockBay(crate_id) as bay:
        verdict = triage(manifest)
        entry["decision"] = verdict["decision"]
    return {
        "crate_id": crate_id,
        "decision": verdict["decision"],
        "reason": verdict["reason"],
        "bay": bay.number,
        "audit": entry["status"],
    }


def recent_audit(n=6):
    return audit_log[-n:]`,
      explanation:
        "Everything before the yield is setup; the yielded entry is what 'as entry' receives; try/except/else/finally around the yield is the exit logic. Because the exception is thrown into the generator at the yield, the except clause can record the crash and re-raise it with a bare raise (propagate), while finally seals the record on every path. handle_crate stacks two managers in one statement; triage never raises for depot problems, so the audit closes normally, but a genuine bug would be recorded as crashed and the bay still released.",
      hints: [
        { id: "h1", title: "Decorator", content: "@contextmanager goes directly above def audited(crate_id). The function has exactly one yield: yield entry." },
        { id: "h2", title: "Exit logic", content: 'try: yield entry / except Exception as exc: entry["status"] = f"crashed: {type(exc).__name__}"; raise / else: entry["status"] = "closed" / finally: entry["sealed"] = True' },
        { id: "h3", title: "Two managers", content: "with audited(crate_id) as entry, DockBay(crate_id) as bay: is allowed. Read bay.number and entry['status'] after the block ends." },
      ],
      tests: [
        {
          id: "t1",
          description: "audited is a context manager that yields an open record",
          assertionCode: py`cm = audited("CSQU3054383")
assert hasattr(cm, "__enter__") and hasattr(cm, "__exit__"), "audited must be decorated with @contextmanager"
start = len(audit_log)
with cm as entry:
    assert len(audit_log) == start + 1 and audit_log[-1] is entry, "The record must be added to audit_log as soon as the block starts"
    assert entry["crate_id"] == "CSQU3054383" and entry["status"] == "open" and entry["sealed"] is False and entry["decision"] is None, f"A fresh record should be open and unsealed, got {entry!r}"
assert entry["status"] == "closed" and entry["sealed"] is True, f"After a clean block the record should be closed and sealed, got {entry!r}"`,
        },
        {
          id: "t2",
          description: "A crash is recorded, sealed and propagated",
          assertionCode: py`try:
    with audited("C1") as entry:
        raise RuntimeError("controller failure")
except RuntimeError:
    pass
else:
    raise AssertionError("audited must re-raise: record the crash, then let the exception continue")
assert entry["status"] == "crashed: RuntimeError", f"The status should be 'crashed: RuntimeError', got {entry['status']!r}"
assert entry["sealed"] is True, "The record must be sealed even after a crash (finally)"`,
        },
        {
          id: "t3",
          description: "Depot errors are recorded the same way",
          assertionCode: py`try:
    with audited("C1") as entry:
        raise OverweightError("heavy", "C1", "weight_kg")
except OverweightError:
    pass
else:
    raise AssertionError("audited should not suppress exceptions")
assert entry["status"] == "crashed: OverweightError" and entry["sealed"], f"Got {entry!r}"`,
        },
        {
          id: "t4",
          description: "handle_crate combines audit, bay and triage",
          assertionCode: py`bays = DockBay.in_use
start = len(audit_log)
good = {"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": True}}
r = handle_crate(good)
assert r["crate_id"] == "CSQU3054383" and r["decision"] == "LOAD" and r["reason"] == "all clear", f"Got {r!r}"
assert r["bay"] in (1, 2, 3, 4) and r["audit"] == "closed", f"The bay number and a closed audit should be reported, got {r!r}"
assert len(audit_log) == start + 1 and audit_log[-1]["decision"] == "LOAD" and audit_log[-1]["sealed"], f"The audit record should hold the decision, got {audit_log[-1]!r}"
r = handle_crate({"container_id": "C2", "weight_kg": 31000, "customs": {"cleared": True}})
assert r["decision"] == "QUARANTINE" and "31000" in r["reason"], f"Got {r!r}"
r = handle_crate(["junk"])
assert r["decision"] == "REJECT" and r["crate_id"] is None, f"Got {r!r}"
assert DockBay.in_use == bays, "handle_crate must leave no bay occupied"`,
        },
        {
          id: "t5",
          description: "A genuine bug is audited and the bay still released",
          assertionCode: py`class Boom(dict):
    def __getitem__(self, key):
        if key == "container_id":
            return "BOOM1"
        raise RuntimeError("a genuine bug")
    def get(self, key, default=None):
        return "BOOM1" if key == "container_id" else default
    def __contains__(self, key):
        raise RuntimeError("a genuine bug")

bays = DockBay.in_use
start = len(audit_log)
try:
    handle_crate(Boom())
except RuntimeError:
    pass
else:
    raise AssertionError("A RuntimeError is a bug and should escape handle_crate")
assert DockBay.in_use == bays, "The bay must be released"
assert len(audit_log) == start + 1 and audit_log[-1]["status"] == "crashed: RuntimeError" and audit_log[-1]["sealed"], f"The crash must be recorded and sealed, got {audit_log[-1:]!r}"`,
        },
        {
          id: "t6",
          description: "recent_audit returns the last records",
          assertionCode: py`for i in range(10):
    handle_crate({"container_id": f"T{i}", "weight_kg": 10, "customs": {"cleared": True}})
last = recent_audit(3)
assert isinstance(last, list) and len(last) == 3, "recent_audit(3) should return a list of 3 records"
assert [e["crate_id"] for e in last] == ["T7", "T8", "T9"], f"Oldest first, newest last. Got {[e['crate_id'] for e in last]}"
assert len(recent_audit()) == 6, "The default is the last 6 records"
assert len(recent_audit(1000)) == len(audit_log), "Asking for more than exist returns them all"`,
        },
      ],
      unlocks: ["cc-audit"],
      checks: [
        {
          prompt: "In an `@contextmanager` function, where does the body of the `with` statement run?",
          question: {
            type: "choice",
            options: [
              "Before the generator function starts",
              "At the `yield`: the generator pauses there while the body runs",
              "After the generator function returns",
              "Inside the `finally` block",
            ],
            answer: 1,
          },
          explanation: "The generator runs until `yield`, pauses while the `with` body executes, then resumes. If the body raised, the exception is thrown in at that same `yield`.",
        },
        {
          prompt: "Why must the `yield` sit inside `try` / `finally` when the cleanup has to happen even on errors?",
          question: {
            type: "choice",
            options: [
              "Because yield is only allowed inside try",
              "Because an error in the with body is raised at the yield, and code after the yield is skipped unless a finally covers it",
              "Because finally makes the generator faster",
              "It does not matter; cleanup always runs",
            ],
            answer: 1,
          },
          explanation: "The exception propagates out of the generator at the `yield` line. Anything below it that is not in a `finally` (or handled by an `except`) never runs.",
        },
        {
          prompt: "`with A() as a, B() as b:` — which context manager exits FIRST?",
          question: { type: "text", answer: ["B", "b", "B()"], placeholder: "A or B" },
          explanation: "Multiple managers behave like nested `with` statements, so they exit in reverse order: B (the inner one) first, then A.",
        },
      ],
    },
  ],
};
