import type { Chapter } from "@/engine/types";

/**
 * Cargo Bay, chapter 4: Control room.
 * Operational logging, then the finished parse -> validate -> decide -> log pipeline.
 */
const py = String.raw;

export const chapter4: Chapter = {
  id: "control-room",
  title: "Control room",
  blurb: "Keep an operations log, then wire every piece into one pipeline that survives anything.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "cargo-control-13-logging",
      title: "The operations log",
      minutes: 22,
      xp: 120,
      concepts: ["logging levels", "loggers & handlers", "formatters", "log.exception"],
      learn: `### Why not just print?

\`print\` is perfect for exploring. For a system that runs unattended it falls short. When something fails at 3 a.m. you need to know **when** it happened, **how serious** it was, **which part** of the program said it, and you need to be able to turn the chatter up or down without editing code. That is what the \`logging\` module is for.

~~~python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("depot.gate")

log.info("crate %s loaded", "CSQU3054383")
log.warning("crate %s is overweight", "MSKU3395635")
~~~

~~~text
INFO depot.gate: crate CSQU3054383 loaded
WARNING depot.gate: crate MSKU3395635 is overweight
~~~

### Levels say how serious it is

- \`DEBUG\` (10): detail for developers.
- \`INFO\` (20): normal events worth recording ("crate loaded").
- \`WARNING\` (30): something unusual that was handled ("crate quarantined").
- \`ERROR\` (40): an operation failed ("crate rejected", "unexpected failure").
- \`CRITICAL\` (50): the whole system is in trouble.

A logger only emits records **at or above its level**. The default is \`WARNING\`, which is why a fresh \`log.info(...)\` seems to do nothing until you set \`level=logging.INFO\`.

### Four moving parts

- A **logger** is what your code calls (\`log.info(...)\`). Loggers have dotted names that form a tree: \`depot.gate\` is a child of \`depot\`, and records bubble up to the root logger's handlers.
- A **handler** decides *where* a record goes: the console, a file, memory, a network service.
- A **formatter** decides *how* it looks (\`%(asctime)s\`, \`%(levelname)s\`, \`%(name)s\`, \`%(message)s\`).
- The **level** decides *whether* it is emitted at all.

\`logging.basicConfig(level=..., format=..., handlers=[...])\` sets up the root logger in one call. Applications configure logging **once at start-up**; libraries only create loggers and never configure them. (Your page re-runs this file again and again, which is why we pass \`force=True\`: it replaces the old handlers instead of stacking duplicates.)

### Log with arguments, not f-strings

~~~python
log.info("crate %s -> %s", crate_id, decision)   # formatted only if the record is emitted
log.info(f"crate {crate_id} -> {decision}")      # formatted always, even when INFO is switched off
~~~

The first form is cheaper, and tools can group identical message templates. Many teams enforce it.

### Log the traceback when you handle an unexpected error

Inside an \`except\` block, \`log.exception("message")\` logs at \`ERROR\` level **and appends the full traceback**. It is what lets you debug a failure you did not see happen.

~~~python
try:
    risky()
except Exception:
    log.exception("risky() failed")
~~~

### Writing a handler

A handler is any subclass of \`logging.Handler\` that implements \`emit(record)\`:

~~~python
class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.lines = []

    def emit(self, record):
        try:
            self.lines.append(self.format(record))
        except Exception:
            self.handleError(record)   # logging must never crash the program
~~~

Tests use exactly this trick to assert on what was logged.

### What to log, and what not to

- Log decisions and failures with the identifiers someone will search for (the crate ID).
- Do **not** log secrets, passwords, tokens or personal data.
- Don't "log and raise" at every layer: the same failure shows up five times. Log where the error is *handled*.
- Don't use log messages as an API. Programs should rely on return values and exceptions, not on log text.

### Common mistakes

- \`print\` for operational messages.
- Logging at the wrong level: everything \`ERROR\`, or failures hidden at \`DEBUG\`.
- Calling \`basicConfig\` in a library, or twice without \`force=True\` (the second call does nothing).
- \`log.error(str(exc))\` inside \`except\`: it loses the traceback. Use \`log.exception\`.`,
      mission: `So far the depot has been silent. When the night-shift supervisor asks "why was crate MSKU... quarantined at 03:12?", nobody can say.

Give the depot a proper operations log: one record per decision, at the right level, and a record with the full traceback for anything unexpected. When you Run, the ops log panel fills with your lines as crates are processed.`,
      tasks: [
        "LogBook: a logging.Handler that keeps the newest 200 formatted lines in memory",
        "Configure logging once (INFO level, handler = logbook, force=True) and a logger named depot.gate",
        "log_verdict(crate_id, decision, reasons): INFO / WARNING / ERROR by decision",
        "guarded(fn, *args): call fn, and on an ordinary exception log it with its traceback and return None",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: a real operations log instead of print().
import logging


class LogBook(logging.Handler):
    # TODO: a handler that keeps its formatted lines in memory.
    #   __init__: call super().__init__() and start with self.lines = []
    #   emit(self, record): append self.format(record) to self.lines (inside try/except Exception:
    #       self.handleError(record)), then keep only the newest 200 lines
    ...


logbook = LogBook()
# TODO: give logbook this formatter:  logging.Formatter("%(levelname)s %(name)s: %(message)s")
# TODO: configure the root logger once: logging.basicConfig(level=logging.INFO, handlers=[logbook], force=True)
log = logging.getLogger("depot.gate")


def log_lines(n=8):
    # TODO: the newest n lines (a new list, so callers cannot change the log).
    ...


def log_verdict(crate_id, decision, reasons):
    # TODO: ONE record per call, using %s arguments (not f-strings):
    #   LOAD       -> log.info("crate %s -> LOAD", crate_id)
    #   QUARANTINE -> log.warning("crate %s -> QUARANTINE: %s", crate_id, summary)
    #   anything else (REJECT) -> log.error("crate %s -> %s: %s", crate_id, decision, summary)
    # where summary is the reasons joined with "; ".
    ...


def guarded(fn, *args):
    # TODO: return fn(*args). If it raises an ordinary Exception, call log.exception(...) with a short
    # message naming the function, and return None. KeyboardInterrupt and friends must not be caught.
    ...
`,
      solutionAdd: py`import logging


class LogBook(logging.Handler):
    """Keeps recent log lines in memory so the control room can show them."""

    def __init__(self):
        super().__init__()
        self.lines = []

    def emit(self, record):
        try:
            self.lines.append(self.format(record))
        except Exception:
            self.handleError(record)
        del self.lines[:-200]


logbook = LogBook()
logbook.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[logbook], force=True)
log = logging.getLogger("depot.gate")


def log_lines(n=8):
    return logbook.lines[-n:]


def log_verdict(crate_id, decision, reasons):
    summary = "; ".join(reasons)
    if decision == "LOAD":
        log.info("crate %s -> LOAD", crate_id)
    elif decision == "QUARANTINE":
        log.warning("crate %s -> QUARANTINE: %s", crate_id, summary)
    else:
        log.error("crate %s -> %s: %s", crate_id, decision, summary)


def guarded(fn, *args):
    try:
        return fn(*args)
    except Exception:
        log.exception("unexpected error in %s", getattr(fn, "__name__", "a function"))
        return None`,
      explanation:
        "The handler is a tiny adapter: emit formats the record and stores the text, and handleError keeps a logging problem from becoming a program crash. basicConfig with force=True is the single place where destination and level are decided; everything else just calls log.info, log.warning or log.error with %s arguments. log_verdict maps the decision to the level an operator would filter on, and guarded uses log.exception so the traceback is saved, while catching only Exception so Ctrl+C and exit requests still work.",
      hints: [
        { id: "h1", title: "The handler", content: "class LogBook(logging.Handler): __init__ calls super().__init__() then self.lines = []. emit appends self.format(record). To trim: del self.lines[:-200]." },
        { id: "h2", title: "Configuration", content: 'logbook.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s")) and then logging.basicConfig(level=logging.INFO, handlers=[logbook], force=True).' },
        { id: "h3", title: "guarded", content: 'try: return fn(*args) / except Exception: log.exception("unexpected error in %s", fn.__name__) / return None. log.exception only works inside an except block.' },
      ],
      tests: [
        {
          id: "t1",
          description: "LogBook is a handler that stores formatted lines",
          assertionCode: py`import logging as _lg
assert issubclass(LogBook, _lg.Handler), "LogBook must inherit from logging.Handler"
book = LogBook()
book.setFormatter(_lg.Formatter("%(levelname)s|%(message)s"))
lg = _lg.getLogger("lesson13.probe")
lg.propagate = False
lg.setLevel(_lg.DEBUG)
lg.addHandler(book)
try:
    lg.warning("hello %s", "world")
    lg.error("second")
finally:
    lg.removeHandler(book)
assert book.lines == ["WARNING|hello world", "ERROR|second"], f"emit should store the formatted line, got {book.lines!r}"`,
        },
        {
          id: "t2",
          description: "LogBook keeps only the newest 200 lines",
          assertionCode: py`import logging as _lg
book = LogBook()
book.setFormatter(_lg.Formatter("%(message)s"))
lg = _lg.getLogger("lesson13.cap")
lg.propagate = False
lg.setLevel(_lg.DEBUG)
lg.addHandler(book)
try:
    for i in range(250):
        lg.info("msg%d", i)
finally:
    lg.removeHandler(book)
assert len(book.lines) == 200, f"Only the newest 200 lines should be kept, but there are {len(book.lines)}"
assert book.lines[0] == "msg50" and book.lines[-1] == "msg249", "The OLDEST lines are the ones to drop"`,
        },
        {
          id: "t3",
          description: "Logging is configured once, at INFO, into the logbook",
          assertionCode: py`import logging as _lg
root = _lg.getLogger()
assert root.level == _lg.INFO, f"The root logger should be at INFO, but it is at {_lg.getLevelName(root.level)}. Use basicConfig(level=logging.INFO, ...)"
assert logbook in root.handlers, "logbook should be a handler of the root logger: basicConfig(handlers=[logbook], force=True)"
assert log.name == "depot.gate", "The logger should be called 'depot.gate'"
logbook.lines.clear()
log.info("probe %s", 1)
assert logbook.lines == ["INFO depot.gate: probe 1"], f"The format should be '%(levelname)s %(name)s: %(message)s', got {logbook.lines!r}"
log.debug("hidden")
assert len(logbook.lines) == 1, "DEBUG records should be filtered out at INFO level"`,
        },
        {
          id: "t4",
          description: "log_lines returns the newest lines as a copy",
          assertionCode: py`logbook.lines.clear()
for i in range(12):
    log.info("line %d", i)
assert log_lines() == [f"INFO depot.gate: line {i}" for i in range(4, 12)], f"The default is the newest 8 lines, oldest first. Got {log_lines()!r}"
assert log_lines(2) == ["INFO depot.gate: line 10", "INFO depot.gate: line 11"], "log_lines(2) is the newest two"
got = log_lines()
got.clear()
assert len(logbook.lines) == 12, "log_lines must return a copy: changing the result must not change the log"`,
        },
        {
          id: "t5",
          description: "log_verdict uses the right level, one record per call",
          assertionCode: py`logbook.lines.clear()
log_verdict("CSQU3054383", "LOAD", [])
assert logbook.lines == ["INFO depot.gate: crate CSQU3054383 -> LOAD"], f"LOAD is an INFO line, got {logbook.lines!r}"
logbook.lines.clear()
log_verdict("MSKU3395635", "QUARANTINE", ["too heavy", "customs hold"])
assert logbook.lines == ["WARNING depot.gate: crate MSKU3395635 -> QUARANTINE: too heavy; customs hold"], f"QUARANTINE is a WARNING with the reasons joined by '; ', got {logbook.lines!r}"
logbook.lines.clear()
log_verdict(None, "REJECT", ["not JSON"])
assert logbook.lines == ["ERROR depot.gate: crate None -> REJECT: not JSON"], f"REJECT is an ERROR line (None is fine as an id), got {logbook.lines!r}"`,
        },
        {
          id: "t6",
          description: "guarded logs the traceback instead of crashing",
          assertionCode: py`logbook.lines.clear()
assert guarded(lambda a, b: a + b, 2, 3) == 5, "guarded should return the function's result"
assert logbook.lines == [], "Nothing is logged when nothing goes wrong"
def explode(x):
    return 1 / x
assert guarded(explode, 0) is None, "An ordinary exception should be turned into None"
assert len(logbook.lines) == 1, f"Exactly one record should be logged, got {len(logbook.lines)}"
line = logbook.lines[0]
assert line.startswith("ERROR depot.gate: ") and "explode" in line, f"Log at ERROR level and name the function, got {line[:80]!r}"
assert "Traceback" in line and "ZeroDivisionError" in line, "Use log.exception so the traceback is included"
def interrupt():
    raise KeyboardInterrupt()
try:
    guarded(interrupt)
except KeyboardInterrupt:
    pass
else:
    raise AssertionError("guarded must only catch Exception, never KeyboardInterrupt")`,
        },
      ],
      unlocks: ["cc-oplog"],
      checks: [
        {
          prompt: "Your code calls `log.info(\"crate loaded\")` but nothing appears. Logging has not been configured. Why?",
          question: {
            type: "choice",
            options: [
              "info is not a real method",
              "The default level is WARNING, so INFO records are dropped",
              "info only works inside functions",
              "Logging needs a file name first",
            ],
            answer: 1,
          },
          explanation: "Out of the box the root logger only emits WARNING and above. `basicConfig(level=logging.INFO)` lowers the threshold.",
        },
        {
          prompt: "Inside `except Exception:` you want to record the error AND where it happened. Which call is best?",
          question: {
            type: "choice",
            options: ["`print(\"error\")`", "`log.error(str(exc))`", "`log.exception(\"processing failed\")`", "`log.info(\"failed\")`"],
            answer: 2,
          },
          explanation: "`log.exception` logs at ERROR level and attaches the full traceback automatically. `log.error(str(exc))` loses the traceback.",
        },
        {
          prompt: "Which is better and why? `log.info(\"crate %s -> %s\", cid, decision)` or `log.info(f\"crate {cid} -> {decision}\")`",
          question: {
            type: "choice",
            options: [
              "The f-string, because it is shorter",
              "The %s form: the text is only built if the record will actually be emitted, and identical message templates can be grouped by tools",
              "They are identical in every way",
              "The f-string, because %s is deprecated",
            ],
            answer: 1,
          },
          explanation: "Passing arguments lets `logging` skip the formatting work for suppressed levels and keeps the template constant. (f-strings are common and work, but this is the form the library is designed around.)",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "cargo-control-14-pipeline",
      title: "The gate that never crashes",
      minutes: 30,
      xp: 200,
      concepts: ["pipeline design", "fail closed", "top-level boundary", "robustness testing"],
      learn: `### Putting it together

You now own every piece of a robust input pipeline. The last step is the one professionals spend the most care on: **composing them so the system as a whole behaves**.

~~~text
 raw text ──► parse ──► validate ──► decide ──► log ──► verdict
             (JSON)    (schema)     (policy)   (ops)
~~~

Each stage has a clear contract. \`read_manifest\` turns text into a dict or raises a depot error. \`validate\` / \`ensure_valid\` turns a dict into "safe to use" or raises a \`ValidationError\` with every problem. \`decide\` applies business policy to data that is *known to be well-formed*, which is why it can be so simple. Logging records the outcome.

Notice how much simpler the policy code is because the boundary did its job: \`decide\` never asks "is weight a number?". It just uses the number.

### One top-level boundary, three layers of except

The outermost function is where the catching happens, in three tiers, **most specific first**:

~~~python
try:
    manifest = read_manifest(text)
    ensure_valid(manifest, SCHEMA)
    verdict = decide(manifest)
except ValidationError as exc:      # 1. a specific, expected problem: report all details
    ...
except CargoError as exc:           # 2. any other depot problem we planned for
    ...
except Exception:                   # 3. the unexpected: a bug, a weird input nobody imagined
    log.exception("unexpected failure")
    ...
~~~

Tier 3 looks like the "catch everything" habit we warned about, and normally it is. At the **top boundary of a long-running system** it is exactly right, for three reasons: it **logs the full traceback** (so the bug is never silent), it still **returns a controlled answer**, and it catches \`Exception\` only, so \`KeyboardInterrupt\` and \`SystemExit\` still work. Anywhere else in the program, catch only what you can handle.

### Fail closed

What decision should an *internal error* get? Not LOAD (we are not sure it is safe) and not a quiet REJECT (we might destroy a valid crate for our own bug). The safe answer is **QUARANTINE: hold it for a human**. When a system is unsure, it should end in the state that is least harmful, not the most convenient one. Security people call this *failing closed*.

### Results are data

Return a plain dictionary (decision, reasons, error type, crate ID, the validation problems). It can be logged, shown on a dashboard, sent over a network, stored, compared in a test. No exceptions leak out of the function, so the caller needs no \`try\`.

### Testing robustness

How do you know it never crashes? You cannot list every bad input, so also throw **garbage** at it: \`None\`, numbers, empty strings, half a JSON document, ten thousand nested brackets, huge numbers, binary junk. The property to assert is simple: *for any input, the function returns a valid verdict and does not raise.* This idea is called **fuzzing** (random or hostile inputs) and **property-based testing** (libraries like Hypothesis generate the inputs for you).

### What you built, and where to go next

- Reading errors and tracebacks, and the exception family tree.
- \`try\` / \`except\` / \`else\` / \`finally\`, catching narrowly; EAFP vs LBYL.
- Raising, custom exception hierarchies with extra data, re-raising and \`raise ... from\`.
- Context managers, as classes and with \`contextlib\`.
- JSON in and out, with \`default=\` for your own types.
- Validation at the boundary: collecting all errors, regex formats, check digits, schema as data.
- Logging instead of print.

In production you would reach for **pydantic** or **JSON Schema** instead of your own validator, **structlog** or JSON-formatted logs for structured output, and **pytest** with **Hypothesis** for the testing. You now know what they are doing for you.

### Common mistakes

- Putting the catch-all deep inside the program instead of at the top boundary.
- A catch-all that doesn't log. Silent failure is the worst outcome.
- Letting an internal error become LOAD (or an accidental REJECT).
- Returning a different shape on failure, so the caller needs special cases.
- Putting validation inside \`decide\`, where it is repeated and forgotten.`,
      mission: `Everything comes together. Manifests arrive as raw text, from anywhere, in any state. The gate has to read them, check them, route them, record the decision and above all **never go down**. The harbour master will test it with the worst input she can think of.

Write \`decide\` and \`process_manifest\`. When you Run, the gate is complete: press **Throw chaos** and watch a barrage of broken manifests hit your pipeline while the crash counter stays at zero.`,
      tasks: [
        "decide(manifest): LOAD, or QUARANTINE with every policy reason, for data that already passed validation",
        "process_manifest(text): parse, validate, decide and log, returning one result dict",
        "Three except tiers: ValidationError, CargoError, then Exception (logged with log.exception, QUARANTINE)",
        "Survive anything: no input may make it raise",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: the whole pipeline, robust to anything.

def decide(manifest):
    # TODO: policy for a manifest that ALREADY passed validation. Run check_weight_limit and
    # check_customs (each raises a QUARANTINE CargoError) and collect EVERY reason.
    # Return {"decision": "QUARANTINE", "reasons": [...], "error": <class name of the first one>}
    # or {"decision": "LOAD", "reasons": [], "error": None}.
    ...


def process_manifest(text):
    # TODO: raw text in, verdict out, and NEVER an exception.
    #   manifest = read_manifest(text); crate_id = crate_id_of(manifest)
    #   ensure_valid(manifest, SCHEMA)  -> verdict = decide(manifest)
    #   except ValidationError as exc   -> decision exc.disposition, reasons "<field> <message>" for each problem,
    #                                      error "ValidationError", problems = exc.problems
    #   except CargoError as exc        -> decision exc.disposition, reasons [str(exc)], error = class name,
    #                                      and line/column from the error when it has them (getattr)
    #   except Exception                -> log.exception(...); QUARANTINE, error "InternalError",
    #                                      reasons ["internal error: a person should look at this crate"]
    # Then call log_verdict once, and return
    #   {"decision", "reasons", "error", "crate_id", "problems", "line", "column"}
    # (problems is [] , line and column are None unless set above).
    ...
`,
      solutionAdd: py`def decide(manifest):
    reasons = []
    error = None
    for check in (check_weight_limit, check_customs):
        try:
            check(manifest)
        except CargoError as exc:
            reasons.append(str(exc))
            error = error or type(exc).__name__
    if reasons:
        return {"decision": "QUARANTINE", "reasons": reasons, "error": error}
    return {"decision": "LOAD", "reasons": [], "error": None}


def process_manifest(text):
    crate_id = None
    problems = []
    line = column = None
    try:
        manifest = read_manifest(text)
        crate_id = crate_id_of(manifest)
        ensure_valid(manifest, SCHEMA)
        verdict = decide(manifest)
    except ValidationError as exc:
        problems = exc.problems
        verdict = {
            "decision": exc.disposition,
            "reasons": [f"{p['field']} {p['message']}" for p in problems],
            "error": "ValidationError",
        }
    except CargoError as exc:
        line = getattr(exc, "line", None)
        column = getattr(exc, "column", None)
        verdict = {"decision": exc.disposition, "reasons": [str(exc)], "error": type(exc).__name__}
    except Exception:
        log.exception("unexpected failure while processing a manifest")
        verdict = {
            "decision": "QUARANTINE",
            "reasons": ["internal error: a person should look at this crate"],
            "error": "InternalError",
        }
    log_verdict(crate_id, verdict["decision"], verdict["reasons"])
    return {**verdict, "crate_id": crate_id, "problems": problems, "line": line, "column": column}`,
      explanation:
        "decide stays tiny because validation already guaranteed the shape: it runs each policy check, collects every reason, and reports the first error class for the dashboard. process_manifest has one try statement with three tiers of except, most specific first (ValidationError is a CargoError, so it must come before it). The last tier is the only broad catch in the program: it logs the traceback with log.exception and fails closed to QUARANTINE, so an internal bug neither loads an unchecked crate nor destroys a good one. Because the function always builds a verdict dict and logs it once, the caller never needs a try statement.",
      hints: [
        { id: "h1", title: "decide", content: "reasons = []; for check in (check_weight_limit, check_customs): try: check(manifest) / except CargoError as exc: reasons.append(str(exc)). Remember the first exception's class name for 'error'." },
        { id: "h2", title: "The three tiers", content: "In process_manifest: except ValidationError first, then except CargoError, then except Exception. If CargoError came first, ValidationError would never be reached. Each branch assigns a verdict dict." },
        { id: "h3", title: "Always log, always return", content: "After the try statement (not inside it) call log_verdict(crate_id, verdict['decision'], verdict['reasons']) and return {**verdict, 'crate_id': crate_id, 'problems': problems, 'line': line, 'column': column}." },
      ],
      tests: [
        {
          id: "t1",
          description: "decide collects every policy reason",
          assertionCode: py`ok = {"container_id": "CSQU3054383", "weight_kg": 18250.5, "customs": {"cleared": True}}
assert decide(ok) == {"decision": "LOAD", "reasons": [], "error": None}, f"A clean crate is LOAD, got {decide(ok)!r}"
r = decide({"container_id": "C1", "weight_kg": 31000, "customs": {"cleared": True}})
assert r["decision"] == "QUARANTINE" and len(r["reasons"]) == 1 and r["error"] == "OverweightError", f"Overweight only: got {r!r}"
r = decide({"container_id": "C1", "weight_kg": 100})
assert r["decision"] == "QUARANTINE" and len(r["reasons"]) == 1 and r["error"] == "CustomsHoldError", f"No customs only: got {r!r}"
r = decide({"container_id": "C1", "weight_kg": 31000, "customs": {"cleared": False}})
assert r["decision"] == "QUARANTINE" and len(r["reasons"]) == 2 and r["error"] == "OverweightError", f"Two reasons: both must be collected, with the first error class. Got {r!r}"`,
        },
        {
          id: "t2",
          description: "A good manifest is loaded and logged",
          assertionCode: py`import json as _j
good = {"container_id": "CSQU3054383", "owner": "Northwind Freight", "contact": "dock@northwind.example", "weight_kg": 18250.5, "category": "general", "pieces": 40, "customs": {"cleared": True}}
logbook.lines.clear()
r = process_manifest(_j.dumps(good))
assert r == {"decision": "LOAD", "reasons": [], "error": None, "crate_id": "CSQU3054383", "problems": [], "line": None, "column": None}, f"Got {r!r}"
assert logbook.lines == ["INFO depot.gate: crate CSQU3054383 -> LOAD"], f"Exactly one INFO line should be logged, got {logbook.lines!r}"`,
        },
        {
          id: "t3",
          description: "Policy problems are quarantined with their reasons",
          assertionCode: py`import json as _j
base = {"container_id": "MSKU3395635", "owner": "N", "contact": "a@b.c", "weight_kg": 100, "category": "bulk", "pieces": 2}
logbook.lines.clear()
r = process_manifest(_j.dumps({**base, "weight_kg": 31000, "customs": {"cleared": True}}))
assert r["decision"] == "QUARANTINE" and r["error"] == "OverweightError" and r["problems"] == [] and "31000" in r["reasons"][0], f"Overweight: got {r!r}"
assert logbook.lines[-1].startswith("WARNING depot.gate: crate MSKU3395635 -> QUARANTINE"), f"QUARANTINE is logged as a WARNING, got {logbook.lines[-1]!r}"
r = process_manifest(_j.dumps({**base, "weight_kg": 31000}))
assert r["decision"] == "QUARANTINE" and len(r["reasons"]) == 2, f"Overweight AND no customs section: expected two reasons, got {r!r}"`,
        },
        {
          id: "t4",
          description: "Broken or malformed text is rejected with details",
          assertionCode: py`logbook.lines.clear()
r = process_manifest('{\n  "container_id": "C1",\n}')
assert r["decision"] == "REJECT" and r["error"] == "InvalidJSONError", f"Broken JSON: got {r!r}"
assert r["line"] == 3 and isinstance(r["column"], int), f"The line and column of the break should be reported, got {r['line']!r}/{r['column']!r}"
assert r["problems"] == [] and r["crate_id"] is None and len(r["reasons"]) == 1, f"Got {r!r}"
assert logbook.lines[-1].startswith("ERROR depot.gate: crate None -> REJECT"), f"REJECT is logged as an ERROR, got {logbook.lines[-1]!r}"
for text, name in (("[1, 2]", "MalformedManifestError"), ("null", "MalformedManifestError"), (None, "MalformedManifestError"), (42, "MalformedManifestError")):
    r = process_manifest(text)
    assert r["decision"] == "REJECT" and r["error"] == name and r["line"] is None, f"{text!r}: expected a REJECT with error {name}, got {r!r}"`,
        },
        {
          id: "t5",
          description: "Validation failures list every problem",
          assertionCode: py`import json as _j
r = process_manifest(_j.dumps({"container_id": "CSQU3054384", "weight_kg": "heavy", "category": "toys"}))
assert r["decision"] == "REJECT" and r["error"] == "ValidationError", f"Got {r!r}"
assert sorted(p["field"] for p in r["problems"]) == ["category", "contact", "container_id", "owner", "pieces", "weight_kg"], f"All six problems should be in 'problems', got {sorted(p['field'] for p in r['problems'])}"
assert len(r["reasons"]) == 6 and any(x.startswith("weight_kg ") for x in r["reasons"]), f"There is one reason per problem, formatted '<field> <message>'. Got {r['reasons']!r}"
assert r["crate_id"] == "CSQU3054384", "The crate_id is known even though the manifest is rejected"`,
        },
        {
          id: "t6",
          description: "It survives garbage: it never raises",
          assertionCode: py`import json as _j
chaos = [
    None, 0, 1.5, True, [], {}, (), b"{}", "", " ", "\n", "{", "}", "[", "]", "null", "true", "42", '"text"', "[]", "{}",
    '{"container_id": 5}', '{"weight_kg": NaN}', '{"weight_kg": Infinity, "container_id": "x"}', '{"weight_kg": -Infinity}',
    '{"a": ' * 50 + "1" + "}" * 50, "[" * 100000, '{"weight_kg": ' + "9" * 5000 + "}", "\x00\x01\x02", "{'single': 'quotes'}",
    "<html>502 Bad Gateway</html>", '{"container_id": "CSQU3054383", "owner": "N", "contact": "a@b.c", "weight_kg": 1e999, "category": "bulk", "pieces": 1}',
    '{"container_id": "CSQU3054383", "owner": "N", "contact": "a@b.c", "weight_kg": 5, "category": "bulk", "pieces": 99999999999999999999999}',
    '{"container_id": "‮CSQU3054383", "owner": "\U0001F4E6", "contact": "a@b.c", "weight_kg": 5, "category": "bulk", "pieces": 1}',
    '{"route": {"origin": null}, "customs": []}', '{"weight_kg": [[[[]]]], "pieces": {}}', "x" * 100000,
]
for item in chaos:
    try:
        r = process_manifest(item)
    except Exception as exc:
        raise AssertionError(f"process_manifest crashed with {type(exc).__name__}: {exc} for input {str(item)[:40]!r}")
    assert r["decision"] in ("LOAD", "QUARANTINE", "REJECT"), f"Bad decision {r['decision']!r} for {str(item)[:40]!r}"
    assert isinstance(r["reasons"], list) and all(isinstance(x, str) for x in r["reasons"]), f"reasons must be a list of text for {str(item)[:40]!r}"
    if r["decision"] != "LOAD":
        assert r["reasons"], f"A {r['decision']} needs at least one reason ({str(item)[:40]!r})"
    _j.dumps(r)   # the result must be plain JSON-able data`,
        },
        {
          id: "t7",
          description: "Unexpected failures are logged and fail closed",
          assertionCode: py`original = read_manifest
def broken(text):
    raise ZeroDivisionError("a genuine bug")
globals()["read_manifest"] = broken
try:
    logbook.lines.clear()
    r = process_manifest('{"container_id": "C1"}')
finally:
    globals()["read_manifest"] = original
assert r["decision"] == "QUARANTINE" and r["error"] == "InternalError", f"An internal error should fail closed to QUARANTINE, got {r!r}"
assert len(r["reasons"]) == 1 and "internal error" in r["reasons"][0], f"Got {r['reasons']!r}"
text = "\n".join(logbook.lines)
assert "Traceback" in text and "ZeroDivisionError" in text, "The unexpected error must be logged WITH its traceback (log.exception)"`,
        },
        {
          id: "t8",
          description: "It only catches Exception, never KeyboardInterrupt",
          assertionCode: py`original = read_manifest
def interrupt(text):
    raise KeyboardInterrupt()
globals()["read_manifest"] = interrupt
try:
    try:
        process_manifest("{}")
    except KeyboardInterrupt:
        pass
    else:
        raise AssertionError("A KeyboardInterrupt (Ctrl+C) must pass straight through: catch Exception, not everything")
finally:
    globals()["read_manifest"] = original`,
        },
      ],
      unlocks: ["cc-chaos"],
      checks: [
        {
          prompt: "Why is `except Exception:` acceptable in `process_manifest` when it was discouraged earlier in the course?",
          question: {
            type: "choice",
            options: [
              "It is never acceptable",
              "It is the top boundary: it logs the full traceback, returns a controlled result and still lets Ctrl+C through",
              "Because the code is shorter",
              "Because exceptions are rare",
            ],
            answer: 1,
          },
          explanation: "A broad catch is dangerous when it hides bugs. At the outermost boundary of a service it is the safety net, as long as it logs everything and fails to a safe state.",
        },
        {
          prompt: "An unexpected internal error occurs while processing a crate. What should the decision be, and why?",
          question: {
            type: "choice",
            options: [
              "LOAD, so the belt keeps moving",
              "REJECT, so the crate is gone",
              "QUARANTINE: hold it for a person, because we neither know it is safe nor that it is bad",
              "Crash, so someone notices",
            ],
            answer: 2,
          },
          explanation: "When unsure, fail closed: take the action that does the least harm and can be undone. Loading an unchecked crate is unsafe; discarding a valid one because of our own bug is wasteful.",
        },
        {
          prompt: "In the `try` statement, why must `except ValidationError` come BEFORE `except CargoError`?",
          question: {
            type: "choice",
            options: [
              "Alphabetical order",
              "ValidationError is a kind of CargoError, so the broader clause would catch it first and the specific one would never run",
              "Python requires subclasses first for speed",
              "It does not matter",
            ],
            answer: 1,
          },
          explanation: "Python runs the first matching clause. Put the most specific exceptions first and the general ones after.",
        },
      ],
    },
  ],
};
