/**
 * Python-side half of the engine. It is exec'd once into every fresh learner
 * namespace, before their code. The TypeScript host talks to it through a few
 * `_`-prefixed functions that exchange JSON strings, which keeps the JS <-> Python
 * boundary trivial (no proxies to leak, no dict/JsProxy conversion surprises).
 *
 * No imports from the app: scripts/validate-content.mjs loads this file directly.
 */
export const ENGINE_PRELUDE = String.raw`
import sys as _sys, time as _time, json as _json, io as _io
import contextlib as _ctx, traceback as _tb, builtins as _builtins

class _Timeout(BaseException):
    """Raised by the watchdog. BaseException so a learner's bare 'except Exception' can't hide it."""

def _guarded(fn, limit):
    deadline = _time.monotonic() + limit
    ticks = [0]
    def tracer(frame, event, arg):
        ticks[0] += 1
        if ticks[0] % 400 == 0 and _time.monotonic() > deadline:
            raise _Timeout()
        if event == "call" and frame.f_code.co_filename not in ("main.py", "<test>"):
            return None  # library code (e.g. graphql-core): count calls but skip the costly per-line tracing
        return tracer
    previous = _sys.gettrace()
    _sys.settrace(tracer)
    try:
        return fn()
    finally:
        _sys.settrace(previous)

def _jsonable(value):
    try:
        # allow_nan=False: NaN/Infinity are not valid JSON and would break JSON.parse on the JS side.
        _json.dumps(value, allow_nan=False)
        return value
    except Exception:
        pass
    if isinstance(value, (set, frozenset)):
        return _jsonable(sorted(value, key=repr))
    return None

def _describe(exc, filename):
    line = None
    for frame in _tb.extract_tb(exc.__traceback__):
        if frame.filename == filename:
            line = frame.lineno
    if isinstance(exc, SyntaxError):
        line = exc.lineno
        message = exc.msg
    elif isinstance(exc, _Timeout):
        message = "This ran for too long. Is there a loop that never ends?"
    else:
        message = str(exc)
    return {"type": "TimeoutError" if isinstance(exc, _Timeout) else type(exc).__name__, "message": message, "line": line}

def _run_user(source):
    buffer = _io.StringIO()
    error = None
    try:
        code = compile(source, "main.py", "exec")
        with _ctx.redirect_stdout(buffer), _ctx.redirect_stderr(buffer):
            _guarded(lambda: exec(code, globals()), 4.0)
    except BaseException as exc:
        error = _describe(exc, "main.py")
    return _json.dumps({"stdout": buffer.getvalue(), "error": error})

def _snapshot():
    skip = {"__name__", "__builtins__", "__doc__"}
    variables = {}
    callables = []
    for name, value in list(globals().items()):
        if name.startswith("_") or name in skip:
            continue
        if isinstance(value, type(_sys)):
            continue
        if callable(value):
            callables.append(name)
            continue
        safe = _jsonable(value)
        if safe is not None or value is None:
            variables[name] = safe
    return _json.dumps({"vars": variables, "callables": callables})

def _resolve(path):
    parts = path.split(".")
    target = globals()[parts[0]]
    for part in parts[1:]:
        target = getattr(target, part)
    return target

def _has_hook(path):
    try:
        return callable(_resolve(path))
    except Exception:
        return False

_HOOK_LIMITS = {"run_tests": 2.0}  # a learner's whole test suite may legitimately take longer than one frame

def _call(path, args_json):
    sink = _io.StringIO()
    try:
        function = _resolve(path)
        args = _json.loads(args_json)
        with _ctx.redirect_stdout(sink), _ctx.redirect_stderr(sink):
            value = _guarded(lambda: function(*args), _HOOK_LIMITS.get(path, 0.25))
        return _json.dumps({"ok": True, "value": _jsonable(value)})
    except BaseException as exc:
        info = _describe(exc, "main.py")
        return _json.dumps({"ok": False, "error": path + "() " + info["type"] + ": " + info["message"], "line": info["line"]})

def _run_test(assertion_code, stdout):
    globals()["__stdout__"] = stdout
    try:
        code = compile(assertion_code, "<test>", "exec")
        _guarded(lambda: exec(code, globals()), 2.0)
        return _json.dumps({"ok": True})
    except AssertionError as exc:
        return _json.dumps({"ok": False, "error": str(exc) or "Assertion failed"})
    except BaseException as exc:
        info = _describe(exc, "<test>")
        return _json.dumps({"ok": False, "error": info["type"] + ": " + info["message"]})
`;
