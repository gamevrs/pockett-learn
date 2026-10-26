import type { Chapter } from "@/engine/types";

/**
 * Cargo Control, chapter 1: Crashes.
 * Reading a traceback, catching exceptions on purpose, and guaranteeing cleanup.
 *
 * Authoring notes: Python goes in String.raw (no backticks and no ${ inside). Prose uses normal
 * templates, so inline-code backticks are escaped and backslashes are doubled.
 */
const py = String.raw;

export const chapter1: Chapter = {
  id: "crashes",
  title: "Crashes",
  blurb: "Read what a crash is telling you, then teach the gate to survive it.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "cargo-control-1-tracebacks",
      title: "Read the crash",
      minutes: 14,
      xp: 70,
      concepts: ["tracebacks", "error types", "call stack"],
      learn: `### A crash is a message, not a mystery

When Python cannot do what you asked, it stops and **raises an exception**. If nothing handles it, the program dies and prints a **traceback**: a report of what happened and where. Learning to read one quickly is the most useful debugging skill there is.

~~~python
def crate_weight(manifest):
    return float(manifest["weight_kg"])

crate_weight({"container_id": "CSQU3054383"})
~~~

~~~text
Traceback (most recent call last):
  File "main.py", line 4, in <module>
    crate_weight({"container_id": "CSQU3054383"})
  File "main.py", line 2, in crate_weight
    return float(manifest["weight_kg"])
KeyError: 'weight_kg'
~~~

Read it **from the bottom up**:

1. **The last line** is the verdict: the *error type* (\`KeyError\`) and its *message* (\`'weight_kg'\`, the key that was missing).
2. **The line above it** is the exact code that failed, with its file, line number and function name.
3. **Everything higher up** is the *call stack*: how the program got there. \`<module>\` means top-level code. Each frame is a function that was waiting for the one below it.

Newer Pythons may also draw \`^^^^\` marks under the part of the line that failed. They are a bonus pointer; the rules above do not change.

### The usual suspects

The error type tells you *what kind* of problem it was before you read a single word of the message:

- \`KeyError\`: you asked a dict for a key it does not have.
- \`IndexError\`: you asked a list for a position past its end.
- \`TypeError\`: the value is the wrong *kind* of thing (\`None + 1\`, indexing a number, calling a function with the wrong arguments).
- \`ValueError\`: the right kind of thing, but an unusable value (\`float("heavy")\`, \`int("12,5")\`).
- \`AttributeError\`: the object has no such attribute or method (\`None.strip()\`).
- \`NameError\`: you used a name that was never defined, often a typo.
- \`ZeroDivisionError\`, \`FileNotFoundError\`, \`ImportError\`, \`RecursionError\`: what they say.
- \`SyntaxError\`: the file is not valid Python, so nothing runs at all.

### One line, three different crashes

Look at \`float(manifest["weight_kg"])\`. It is two operations, and each can fail on its own:

~~~python
float(manifest["weight_kg"])
~~~

- **Step 1, the lookup** \`manifest["weight_kg"]\` raises \`KeyError\` if the key is missing (or \`TypeError\` if \`manifest\` is not a dict at all).
- **Step 2, the conversion** \`float(...)\` raises \`ValueError\` for text like \`"heavy"\` and \`TypeError\` for \`None\` or a list.

It also *works* on some surprising inputs: \`float(" 940 ")\` is \`940.0\` (spaces are ignored), \`float("1e3")\` is \`1000.0\`, \`float(True)\` is \`1.0\`, and \`float("nan")\` happily gives you a not-a-number. Real data from outside your program is full of such cases, which is exactly why this project exists.

### Errors have a family tree

Every error is a class, and the classes form a hierarchy: \`KeyError\` and \`IndexError\` are both kinds of \`LookupError\`; almost everything you will catch is a kind of \`Exception\`. You will lean on this in lesson 4 when you build your own.

### Common mistakes

- Reading from the top. The top is where the program *started*; the answer is at the bottom.
- Skipping the message. \`KeyError: 'weight_kg'\` literally names the missing key.
- Blaming the line that raised. The bug is sometimes in the *caller* that passed the bad value, one frame up.
- Fixing by guessing. Say out loud what the error type means before you touch any code.`,
      mission: `The depot gate is dark: a conveyor, a scanner and a stack of crates, each with a manifest. Before anything gets loaded the gate has to read a weight off every manifest.

Write the simplest possible weigh function, on purpose with **no safety net**, and watch real crates break it. Then practise reading crash reports until the error type tells you the story at a glance. When you Run, the belt starts and the real errors your code raises appear on the gate.`,
      tasks: [
        "Write crate_weight(manifest): the manifest's weight_kg as a float, with no error handling",
        "Predict what crate_weight does for each of the 7 sample crates (an error name, or \"none\")",
        "Read the night shift's crash report and fill in crash_type, crash_function and crash_line",
        "Run it and watch the gate: bad crates will take it down. That is the lesson!",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: weigh a crate, then learn to read what happens when it goes wrong.

def crate_weight(manifest):
    # TODO: return the manifest's "weight_kg" as a float.
    # Do NOT add any error handling yet. We want to see how it fails.
    ...


# Seven manifests came off the belt. WITHOUT running anything, predict what
# crate_weight() does with each one: the exact name of the error it raises
# ("KeyError", "ValueError", ...) or "none" if it works fine.
crates = [
    {"container_id": "CSQU3054383", "weight_kg": 18250.5},
    {"container_id": "MSKU3395635"},
    {"container_id": "TGHU1581761", "weight_kg": "heavy"},
    {"container_id": "HLXU4140023", "weight_kg": None},
    {"container_id": "OOLU6825541", "weight_kg": " 940 "},
    ["not", "a", "manifest"],
    {"container_id": "ZIMU0506317", "weight_kg": "12,5"},
]
predicted = ["?", "?", "?", "?", "?", "?", "?"]  # replace each "?"


# The night shift left this crash report. Read it from the bottom up.
REPORT = """Traceback (most recent call last):
  File "main.py", line 21, in <module>
    print(report_total(manifests))
  File "main.py", line 15, in report_total
    return sum(net_weight(m) for m in manifests)
  File "main.py", line 15, in <genexpr>
    return sum(net_weight(m) for m in manifests)
  File "main.py", line 12, in net_weight
    return float(m["weight_kg"]) - TARE
NameError: name 'TARE' is not defined"""

crash_type = "?"       # the kind of error, e.g. "KeyError"
crash_function = "?"   # the function that was running when it blew up
crash_line = 0         # the line number of the failing line
`,
      solutionAdd: py`def crate_weight(manifest):
    return float(manifest["weight_kg"])


crates = [
    {"container_id": "CSQU3054383", "weight_kg": 18250.5},
    {"container_id": "MSKU3395635"},
    {"container_id": "TGHU1581761", "weight_kg": "heavy"},
    {"container_id": "HLXU4140023", "weight_kg": None},
    {"container_id": "OOLU6825541", "weight_kg": " 940 "},
    ["not", "a", "manifest"],
    {"container_id": "ZIMU0506317", "weight_kg": "12,5"},
]
predicted = ["none", "KeyError", "ValueError", "TypeError", "none", "TypeError", "ValueError"]


REPORT = """Traceback (most recent call last):
  File "main.py", line 21, in <module>
    print(report_total(manifests))
  File "main.py", line 15, in report_total
    return sum(net_weight(m) for m in manifests)
  File "main.py", line 15, in <genexpr>
    return sum(net_weight(m) for m in manifests)
  File "main.py", line 12, in net_weight
    return float(m["weight_kg"]) - TARE
NameError: name 'TARE' is not defined"""

crash_type = "NameError"
crash_function = "net_weight"
crash_line = 12`,
      explanation:
        "crate_weight is a single expression that can fail in three places: the key lookup (KeyError for a missing key; TypeError if the manifest is not even a dict) and the conversion (ValueError for text like 'heavy', TypeError for None). Strings such as ' 940 ' are fine because float() ignores surrounding spaces. In the crash report, the bottom line names the error (NameError, an undefined name), the frame just above it names the function that was running (net_weight) and the failing line (12). The frames higher up only explain how the program got there.",
      hints: [
        { id: "h1", title: "The function", content: 'It is one line: return float(manifest["weight_kg"]). Do not wrap it in try/except yet.' },
        {
          id: "h2",
          title: "Predicting",
          content:
            'Split float(manifest["weight_kg"]) into two steps. Step 1, the lookup, fails with KeyError when the key is missing (and TypeError when the manifest is not a dict). Step 2, float(), fails with ValueError for text it cannot parse and TypeError for None. Some text parses fine!',
        },
        {
          id: "h3",
          title: "The crash report",
          content:
            'Go to the very last line of REPORT: the word before the colon is the type. The frame just above it ("in net_weight") is the function, and its "line N" is crash_line.',
        },
      ],
      tests: [
        {
          id: "t1",
          description: "crate_weight returns the weight as a float",
          assertionCode: py`w = crate_weight({"weight_kg": 18250.5})
assert w == 18250.5, "crate_weight({'weight_kg': 18250.5}) should return 18250.5"
w = crate_weight({"weight_kg": "940"})
assert w == 940.0 and type(w) is float, "A weight written as text like '940' should come back as the float 940.0"`,
        },
        {
          id: "t2",
          description: "A missing weight raises KeyError (no safety net yet)",
          assertionCode: py`try:
    crate_weight({"container_id": "CSQU3054383"})
except KeyError:
    pass
except Exception as exc:
    raise AssertionError("A manifest without weight_kg should raise KeyError, but got " + type(exc).__name__)
else:
    raise AssertionError("crate_weight({}) should crash with KeyError for now. Leave out any try/except in this lesson.")`,
        },
        {
          id: "t3",
          description: "Text that is not a number raises ValueError, None raises TypeError",
          assertionCode: py`try:
    crate_weight({"weight_kg": "heavy"})
except ValueError:
    pass
else:
    raise AssertionError("'heavy' cannot be converted by float(), so crate_weight should let the ValueError escape")
try:
    crate_weight({"weight_kg": None})
except TypeError:
    pass
else:
    raise AssertionError("None cannot be converted by float(), so crate_weight should let the TypeError escape")`,
        },
        {
          id: "t4",
          description: "predicted has the right answer for every crate",
          assertionCode: py`def _truth(m):
    try:
        float(m["weight_kg"])
        return "none"
    except Exception as exc:
        return type(exc).__name__

assert isinstance(predicted, list) and len(crates) == 7 and len(predicted) == 7, "predicted needs exactly one answer for each of the 7 crates"
for i, (m, p) in enumerate(zip(crates, predicted)):
    assert p == _truth(m), f"Crate #{i + 1}: you predicted {p!r}, which is not what happens. Walk through float(manifest['weight_kg']) one step at a time: first the lookup, then the conversion."`,
        },
        {
          id: "t5",
          description: "The crash report is read correctly",
          assertionCode: py`assert crash_type == "NameError", "crash_type: the very last line of the report starts with the error type"
assert crash_function == "net_weight", "crash_function: look at the frame directly above the error line (the last 'in ...' name), not at <module>"
assert crash_line == 12, "crash_line: use the line number of that same last frame"`,
        },
      ],
      unlocks: ["cc-gate"],
      checks: [
        {
          prompt: "In a traceback, where do you look FIRST to learn what kind of problem it was?",
          question: {
            type: "choice",
            options: ["The first line, \"Traceback (most recent call last)\"", "The last line, with the error type and message", "The first File line, because that is where it started", "The longest line"],
            answer: 1,
          },
          explanation:
            "The last line is the verdict: error type, then message. The frames above it are the call stack, useful for *where* and *how we got there*, but the type tells you what kind of problem to look for.",
        },
        {
          prompt: "`float(\"12,5\")` raises `ValueError`, but `float(None)` raises `TypeError`. Why the different types?",
          question: {
            type: "choice",
            options: [
              "Python picks the error type at random",
              "A string is the right kind of thing but this value is unusable (ValueError); None is the wrong kind of thing entirely (TypeError)",
              "None is shorter than \"12,5\"",
              "TypeError only happens inside functions",
            ],
            answer: 1,
          },
          explanation:
            "`float()` accepts text and numbers, so `\"12,5\"` is an acceptable *type* with a bad *value* (ValueError). `None` is not something `float()` can ever convert, so it is a TypeError. Knowing the split helps you guess the right error type before you run anything.",
        },
        {
          prompt: "A traceback lists three frames: `<module>`, `report_total`, then `net_weight`. Which function was running when the error was raised?",
          question: { type: "text", answer: ["net_weight"], placeholder: "function name" },
          explanation: "The bottom-most frame is where the exception was raised. The frames above are callers, each still waiting for the one below.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "cargo-control-2-try-except",
      title: "Catch what you expect",
      minutes: 16,
      xp: 80,
      concepts: ["try / except", "specific exceptions", "exception object", "bare except"],
      learn: `### try / except: plan for the failure

A \`try\` block runs normally. If an exception is raised inside it, Python stops that block immediately, looks for an \`except\` clause that matches, and runs it instead. Then the program carries on after the whole statement.

~~~python
try:
    weight = float(manifest["weight_kg"])
except KeyError:
    weight = None          # the key was missing; we know what to do about that
~~~

Nothing is "swallowed" here: we named the one failure we understand and decided what it means.

### Catch specific exceptions

Several errors can share one handler by listing them in a tuple, or you can write separate \`except\` clauses (Python checks them top to bottom and uses the first match):

~~~python
try:
    weight = float(manifest["weight_kg"])
except (KeyError, ValueError, TypeError):
    weight = None
~~~

~~~python
try:
    weight = float(manifest["weight_kg"])
except KeyError:
    print("no weight on this manifest")
except (ValueError, TypeError):
    print("the weight is not a number")
~~~

### The exception object

Add \`as name\` to get the exception itself, a normal object you can inspect:

~~~python
try:
    float("heavy")
except ValueError as exc:
    print(type(exc).__name__)   # ValueError
    print(exc)                  # could not convert string to float: 'heavy'
    print(exc.args)             # ("could not convert string to float: 'heavy'",)
~~~

\`exc\` only exists inside the \`except\` block. Use \`type(exc).__name__\` for the class name and \`str(exc)\` (or \`f"{exc}"\`) for the message.

### Why a bare \`except:\` is a bad idea

~~~python
try:
    weight = float(manifset["weight_kg"])   # typo: manifset
except:
    weight = None
~~~

That typo is a \`NameError\`, a *bug in your program*. The bare \`except:\` hides it, and every crate now silently weighs nothing. Worse, a bare \`except:\` even catches \`KeyboardInterrupt\` and \`SystemExit\`, so you cannot stop the program with Ctrl+C. Even \`except Exception:\` catches every ordinary bug.

The rule: **catch the exceptions you can meaningfully handle, and let everything else crash loudly.** A loud crash during development is a gift; a silent wrong answer in production is a disaster.

### Keep the try block small

Put only the risky line in \`try\`. If the block holds twenty lines, an unrelated bug on line fifteen can be misreported as a bad crate.

### Two numbers that look fine but are not

\`float("nan")\` and \`float("inf")\` succeed, but a crate cannot weigh "not a number". \`math.isfinite(x)\` is \`False\` for both, so check it after converting.

### Common mistakes

- \`except: pass\`: a silent failure with no trace. If you ignore an error on purpose, say why in a comment.
- Catching a *parent* class when you meant one child (\`except Exception\` to handle a missing key).
- Using the message text to decide what to do. Messages can change; branch on the *type*.
- Returning \`None\` for "failed" and forgetting that the caller must check for it. (Lesson 3 gives you a better shape.)`,
      mission: `Last shift, one bad manifest took the whole gate down. The foreman's rule is simple: the gate must keep working when a manifest is wrong.

Build the safe scale. It reads what it can, reports what it cannot, and above all does **not** hide mistakes in the program itself. When you Run, the gate stops crashing: unreadable crates show as unreadable and the belt keeps moving.`,
      tasks: [
        "safe_weight(manifest): the float weight, or None for any crate whose weight cannot be read (including nan and inf)",
        "explain_weight(manifest): \"ok: 940.0 kg\" or \"ErrorName: message\" built from the exception object",
        "total_weight(manifests): the sum of all readable weights, skipping the rest",
        "Catch only KeyError, ValueError and TypeError. Real bugs must still crash",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: make the scale survive bad manifests, but only the ones you expect.
import math

def safe_weight(manifest):
    # TODO: return the weight as a float, or None when it cannot be read.
    #   - catch ONLY KeyError, ValueError and TypeError (no bare except!)
    #   - float("nan") and float("inf") work in Python but make no sense: return None for them too
    ...


def explain_weight(manifest):
    # TODO: return "ok: 940.0 kg" when the weight reads fine.
    # When float(manifest["weight_kg"]) fails, return "<ErrorName>: <message>"
    # built from the exception object, e.g. "KeyError: 'weight_kg'".
    ...


def total_weight(manifests):
    # TODO: add up every readable weight and skip the rest (reuse safe_weight).
    ...
`,
      solutionAdd: py`import math


def safe_weight(manifest):
    try:
        weight = float(manifest["weight_kg"])
    except (KeyError, ValueError, TypeError):
        return None
    return weight if math.isfinite(weight) else None


def explain_weight(manifest):
    try:
        weight = float(manifest["weight_kg"])
    except (KeyError, ValueError, TypeError) as exc:
        return f"{type(exc).__name__}: {exc}"
    return f"ok: {weight} kg"


def total_weight(manifests):
    total = 0.0
    for manifest in manifests:
        weight = safe_weight(manifest)
        if weight is not None:
            total += weight
    return total`,
      explanation:
        "The try block holds just the risky expression, and the except clause names exactly the three failures we understand. Anything else (a typo, a broken object) still propagates, which is what you want. explain_weight shows the exception object: type(exc).__name__ gives the class, and f-string formatting of exc gives its message. total_weight reuses safe_weight, so the 'what counts as readable' rule lives in one place.",
      hints: [
        { id: "h1", title: "Shape of safe_weight", content: 'try: weight = float(manifest["weight_kg"])  except (KeyError, ValueError, TypeError): return None  and then check the weight with math.isfinite(weight).' },
        { id: "h2", title: "The exception object", content: 'Write "except (KeyError, ValueError, TypeError) as exc:" and build the text with f"{type(exc).__name__}: {exc}".' },
        { id: "h3", title: "total_weight", content: "Loop over the manifests, call safe_weight on each one, and add it to the total only when the result is not None. A weight of 0.0 is still a valid number, so test 'is not None', not 'if weight'." },
      ],
      tests: [
        {
          id: "t1",
          description: "safe_weight reads good weights as floats",
          assertionCode: py`assert safe_weight({"weight_kg": 18250.5}) == 18250.5, "A normal weight should come back unchanged"
w = safe_weight({"weight_kg": "940"})
assert w == 940.0 and type(w) is float, "Text like '940' should be converted to the float 940.0"
assert safe_weight({"weight_kg": 0}) == 0.0, "0 is a number, so it should come back as 0.0 (not None)"`,
        },
        {
          id: "t2",
          description: "safe_weight returns None instead of crashing",
          assertionCode: py`bad = [{}, {"weight_kg": "heavy"}, {"weight_kg": None}, {"weight_kg": [1, 2]}, ["not", "a", "manifest"], None]
for m in bad:
    assert safe_weight(m) is None, f"safe_weight({m!r}) should return None, not crash"`,
        },
        {
          id: "t3",
          description: "nan and inf are rejected",
          assertionCode: py`for value in ("nan", "inf", "-inf", float("nan"), float("inf")):
    assert safe_weight({"weight_kg": value}) is None, f"{value!r} converts to a float, but it is not a real weight. Use math.isfinite() and return None"`,
        },
        {
          id: "t4",
          description: "Unexpected errors are NOT hidden",
          assertionCode: py`class Exploding:
    def __getitem__(self, key):
        raise RuntimeError("scale exploded")

class Interrupt:
    def __getitem__(self, key):
        raise KeyboardInterrupt()

try:
    safe_weight(Exploding())
except RuntimeError:
    pass
else:
    raise AssertionError("A RuntimeError is a real bug, not a bad manifest. safe_weight must only catch KeyError, ValueError and TypeError")
try:
    safe_weight(Interrupt())
except KeyboardInterrupt:
    pass
else:
    raise AssertionError("A bare 'except:' even swallows KeyboardInterrupt. Name the exceptions you expect instead")`,
        },
        {
          id: "t5",
          description: "explain_weight reports what happened",
          assertionCode: py`assert explain_weight({"weight_kg": 940}) == "ok: 940.0 kg", "A readable weight should give 'ok: 940.0 kg'"
assert explain_weight({}) == "KeyError: 'weight_kg'", "A missing weight should give \"KeyError: 'weight_kg'\" (type name, colon, message)"
r = explain_weight({"weight_kg": "heavy"})
assert r.startswith("ValueError: ") and "heavy" in r, "'heavy' should give 'ValueError: ...' with Python's own message"
r = explain_weight({"weight_kg": None})
assert r.startswith("TypeError: "), "None should give 'TypeError: ...'"`,
        },
        {
          id: "t6",
          description: "total_weight sums only the readable weights",
          assertionCode: py`batch = [{"weight_kg": 1000}, {"weight_kg": "250.5"}, {}, {"weight_kg": "heavy"}, {"weight_kg": 0}, ["x"]]
assert total_weight(batch) == 1250.5, "total_weight should add 1000 + 250.5 and skip the unreadable crates"
assert total_weight([]) == 0, "No crates means a total of 0"
assert total_weight([{}, {"weight_kg": None}]) == 0, "If nothing is readable the total is 0"`,
        },
      ],
      unlocks: ["cc-scale"],
      checks: [
        {
          prompt: "Why is `except:` with nothing after it considered harmful?",
          question: {
            type: "choice",
            options: [
              "It is a syntax error",
              "It catches every error, including real bugs like typos, and hides them",
              "It makes the program slower",
              "It only works once per program",
            ],
            answer: 1,
          },
          explanation: "A bare except turns *every* failure into 'handled', so bugs (a misspelled name, a broken object) look like bad data. Catch only what you can meaningfully handle and let the rest crash loudly.",
        },
        {
          prompt: "Inside `except ValueError as exc:`, which expression gives you the *name* of the error class as text?",
          question: { type: "text", answer: ["type(exc).__name__", "exc.__class__.__name__"], placeholder: "an expression using exc" },
          explanation: "`type(exc)` is the class and `.__name__` is its name. `str(exc)` would give the message, not the class.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "cargo-control-3-else-finally",
      title: "Always clean up",
      minutes: 18,
      xp: 90,
      concepts: ["else", "finally", "EAFP vs LBYL", "outcome objects"],
      learn: `### The full shape of try

~~~python
try:
    ...        # the risky part (keep it small)
except SomeError:
    ...        # runs only if the try block raised SomeError
else:
    ...        # runs only if the try block raised nothing
finally:
    ...        # runs no matter what
~~~

**\`else\`** is for the code that should happen *only on success*, but that you do not want protected by the \`except\`. If a bug in that code raises \`KeyError\`, you want to see it, not have your handler quietly absorb it.

~~~python
try:
    weight = float(manifest["weight_kg"])
except (KeyError, ValueError, TypeError):
    return None
else:
    weighed_count += 1        # a bug here will NOT be caught by the except above
    return weight
~~~

**\`finally\`** is the cleanup guarantee. It runs when the block finishes normally, when an exception is handled, when an exception is *not* handled (it runs, then the exception keeps travelling up), and even when the block executes \`return\`.

~~~python
scale_busy = True
try:
    weight = float(manifest["weight_kg"])
finally:
    scale_busy = False        # the scale is released whatever happens above
~~~

Use it for anything that must not be left half-done: releasing a lock, closing a file, resetting a flag. (Lesson 6 shows an even nicer tool for this.) One trap: never put \`return\` inside \`finally\`. It would silently cancel an exception that was on its way up.

### Ask forgiveness, not permission (EAFP)

There are two styles for dealing with data that might be wrong.

**LBYL**, *look before you leap*: check first, then act.

~~~python
if "weight_kg" in manifest and isinstance(manifest["weight_kg"], (int, float)):
    weight = manifest["weight_kg"]
else:
    weight = None
~~~

**EAFP**, *easier to ask forgiveness than permission*: just try it and handle the failure.

~~~python
try:
    weight = float(manifest["weight_kg"])
except (KeyError, ValueError, TypeError):
    weight = None
~~~

Python programmers lean towards EAFP because the LBYL checks tend to be incomplete (it forgot that \`"940"\` and \`" 12 "\` are fine, and it wrongly accepts \`True\`), they repeat work, and between the check and the action the world can change (a file you checked exists may be deleted before you open it: a *race condition*). EAFP lets the operation itself be the authority.

LBYL is the better choice when the check is cheap and the answer is a friendly message (validating a form, as you will in chapter 3), or when raising and catching would happen constantly in a hot loop (raising is slow compared with a simple \`if\`).

### Say WHY it failed: outcome objects

Returning \`None\` tells the caller *that* something failed but not *why*. A small dict does both:

~~~python
{"ok": False, "weight": None, "error": "ValueError", "detail": "could not convert string to float: 'heavy'"}
~~~

Now a dashboard can count errors by type, and an operator can read the reason.

### Common mistakes

- Putting success-path code in the \`try\` block, so its bugs get caught by accident. Move it to \`else\`.
- Forgetting that \`finally\` also runs when you \`return\` early. That is a feature.
- Writing LBYL checks that are longer than the operation and still wrong.
- Using exceptions for normal flow in a loop that fails 99% of the time. EAFP is for when failure is the exception.`,
      mission: `The foreman wants numbers: how many crates were weighed, which errors happen most, and a guarantee that the scale is never left locked when something goes wrong (a locked scale blocks the whole conveyor).

Upgrade the scale to report a full outcome for every crate. When you Run, the gate's error tally comes alive: every unreadable crate is counted by the type of error that stopped it.`,
      tasks: [
        "weigh_crate(manifest): an outcome dict with ok, weight, error and detail",
        "Use EAFP: try the lookup, do not check with \"in\" first",
        "Count successful weighings in the else clause (weighed_count)",
        "Use finally so scale_busy is always False again afterwards",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: a scale that says WHY a weighing failed, and always frees itself.
scale_busy = False     # True while a crate is on the scale
weighed_count = 0      # how many crates were weighed successfully

def weigh_crate(manifest):
    # TODO: use EAFP (just try it; do not test with "in" first).
    #   - set scale_busy = True before weighing           (you will need: global scale_busy, weighed_count)
    #   - success -> {"ok": True, "weight": w, "error": None, "detail": "ok"}
    #                and add 1 to weighed_count (put that in an else: clause)
    #   - KeyError -> {"ok": False, "weight": None, "error": "KeyError", "detail": "missing field: weight_kg"}
    #   - ValueError / TypeError -> error is the exception's class name, detail is str(exc)
    #   - nan / inf: raise ValueError("weight must be a finite number") inside the try so it is handled like any other
    #   - whatever happens, scale_busy must be False afterwards (finally:)
    ...
`,
      solutionAdd: py`scale_busy = False
weighed_count = 0


def weigh_crate(manifest):
    global scale_busy, weighed_count
    scale_busy = True
    try:
        weight = float(manifest["weight_kg"])
        if not math.isfinite(weight):
            raise ValueError("weight must be a finite number")
    except KeyError:
        return {"ok": False, "weight": None, "error": "KeyError", "detail": "missing field: weight_kg"}
    except (ValueError, TypeError) as exc:
        return {"ok": False, "weight": None, "error": type(exc).__name__, "detail": str(exc)}
    else:
        weighed_count += 1
        return {"ok": True, "weight": weight, "error": None, "detail": "ok"}
    finally:
        scale_busy = False`,
      explanation:
        "The try block holds only the lookup and the conversion. The two except clauses turn expected failures into outcome dicts; the else clause (success only) bumps the counter, so a bug there would not be mistaken for a bad crate; and finally releases the scale on every path, including an unexpected exception that keeps travelling upward. Raising ValueError inside the try for nan/inf shows that your own raise statements can feed the same handlers.",
      hints: [
        { id: "h1", title: "Frame", content: "global scale_busy, weighed_count first. Then: scale_busy = True, then try / except / except / else / finally. The finally block is just scale_busy = False." },
        { id: "h2", title: "Failures", content: 'except KeyError: return {... "error": "KeyError", "detail": "missing field: weight_kg"}  and  except (ValueError, TypeError) as exc: ... type(exc).__name__ and str(exc).' },
        { id: "h3", title: "Non-finite numbers", content: "After float(...) add: if not math.isfinite(weight): raise ValueError('weight must be a finite number'). Because it sits inside the try, the ValueError clause catches it." },
      ],
      tests: [
        {
          id: "t1",
          description: "A readable weight gives an ok outcome",
          assertionCode: py`r = weigh_crate({"weight_kg": "940"})
assert r == {"ok": True, "weight": 940.0, "error": None, "detail": "ok"}, f"Expected the ok outcome for weight '940', got {r!r}"`,
        },
        {
          id: "t2",
          description: "Failures say which error stopped them",
          assertionCode: py`r = weigh_crate({"container_id": "X"})
assert r["ok"] is False and r["weight"] is None and r["error"] == "KeyError", f"A missing weight should give error 'KeyError', got {r!r}"
assert "weight_kg" in r["detail"], "detail should mention the missing field weight_kg"
r = weigh_crate({"weight_kg": "heavy"})
assert r["ok"] is False and r["error"] == "ValueError" and "heavy" in r["detail"], f"'heavy' should give error 'ValueError' with Python's message in detail, got {r!r}"
r = weigh_crate({"weight_kg": None})
assert r["ok"] is False and r["error"] == "TypeError", f"None should give error 'TypeError', got {r!r}"
r = weigh_crate({"weight_kg": "nan"})
assert r["ok"] is False and r["error"] == "ValueError", f"nan should be reported as a ValueError, got {r!r}"`,
        },
        {
          id: "t3",
          description: "weighed_count only counts successes (else clause)",
          assertionCode: py`before = weighed_count
weigh_crate({"weight_kg": 10})
weigh_crate({"weight_kg": "20"})
weigh_crate({})
weigh_crate({"weight_kg": "heavy"})
weigh_crate({"weight_kg": None})
assert weighed_count - before == 2, f"Two crates were weighed successfully but weighed_count went up by {weighed_count - before}"`,
        },
        {
          id: "t4",
          description: "The scale is always released (finally)",
          assertionCode: py`class Exploding:
    def __getitem__(self, key):
        raise RuntimeError("scale exploded")

for m in [{"weight_kg": 5}, {}, {"weight_kg": "heavy"}, {"weight_kg": None}]:
    weigh_crate(m)
    assert scale_busy is False, f"scale_busy is still True after weighing {m!r}. Reset it in a finally block"
try:
    weigh_crate(Exploding())
except RuntimeError:
    pass
else:
    raise AssertionError("A RuntimeError is a real bug and should still escape weigh_crate")
assert scale_busy is False, "Even when an unexpected error escapes, finally must release the scale"`,
        },
        {
          id: "t5",
          description: "EAFP: it tries the lookup instead of checking with 'in'",
          assertionCode: py`class NoLookBeforeLeap(dict):
    def __contains__(self, key):
        raise AssertionError("Don't look before you leap: remove the 'in' check and let the lookup raise KeyError instead")

r = weigh_crate(NoLookBeforeLeap(weight_kg=12))
assert r["ok"] is True and r["weight"] == 12.0, "A normal weight should still work"
r = weigh_crate(NoLookBeforeLeap(owner="x"))
assert r["error"] == "KeyError", "A missing weight should still report KeyError"`,
        },
      ],
      unlocks: ["cc-tally"],
      checks: [
        {
          prompt: "When does the `finally` block run?",
          question: {
            type: "choice",
            options: [
              "Only when no exception was raised",
              "Only when an exception was raised and handled",
              "Always: after success, after a handled error, and even while an unhandled error is travelling up",
              "Only when the try block ends with return",
            ],
            answer: 2,
          },
          explanation: "`finally` is the cleanup guarantee. It runs on every path out of the statement, which is why releasing locks and resetting flags belongs there.",
        },
        {
          prompt: "Which line of a `try` statement is best placed in the `else` clause?",
          question: {
            type: "choice",
            options: [
              "The risky conversion that might fail",
              "Code that should only run on success, but whose own bugs you do not want the except clauses to catch",
              "Cleanup that must always run",
              "The error message",
            ],
            answer: 1,
          },
          explanation: "`else` runs only when the `try` block raised nothing, and exceptions raised inside `else` are *not* handled by the `except` clauses of the same statement. That keeps the protected region as small as possible.",
        },
        {
          prompt: "Which style is EAFP?",
          question: {
            type: "choice",
            options: [
              "`if \"weight_kg\" in m: w = m[\"weight_kg\"]`",
              "`try: w = m[\"weight_kg\"]` then `except KeyError: ...`",
              "`w = m.get(\"weight_kg\")`",
              "Calling `isinstance()` on every field first",
            ],
            answer: 1,
          },
          explanation: "EAFP (easier to ask forgiveness than permission) performs the operation and handles the failure. The `in` check and `isinstance()` are LBYL (look before you leap). `.get()` is a convenient third option that avoids the question for dicts.",
        },
      ],
    },
  ],
};
