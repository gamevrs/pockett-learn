### t1 | logged records the call and passes the result through
@logged
def _add(a, b=0):
    return a + b
assert _add(2, b=3) == 5, "A logged function must still return its result"
assert call_log()[-1] == "_add(2, b=3) -> 5", f"Expected the audit line '_add(2, b=3) -> 5', got {call_log()[-1:]}"
_add("x", "y")
assert call_log()[-1] == "_add('x', 'y') -> 'xy'", f"Arguments and results are shown with repr(), got {call_log()[-1:]}"
### t2 | logged records failures and re-raises them
@logged
def _boom(n):
    raise ValueError(f"bad {n}")
try:
    _boom(7)
except ValueError as _err:
    assert str(_err) == "bad 7", "The original exception should reach the caller unchanged"
else:
    raise AssertionError("logged must re-raise: the caller still has to see the error")
assert call_log()[-1] == "_boom(7) raised ValueError: bad 7", f"Expected '_boom(7) raised ValueError: bad 7', got {call_log()[-1:]}"
### t3 | Long values are shortened and wraps keeps the identity
@logged
def _shout(text):
    """Make some noise."""
    return text.upper()
_shout("a" * 500)
assert len(call_log()[-1]) < 200, f"Long arguments and results should be cut short with _brief (the line was {len(call_log()[-1])} characters)"
assert call_log()[-1].endswith("..."), "A shortened result should end with ..."
assert _shout.__name__ == "_shout" and _shout.__doc__ == "Make some noise.", "Use @functools.wraps(func) so the wrapper keeps the name and docstring"
assert _shout.__wrapped__("q") == "Q", "functools.wraps should also expose the original as __wrapped__"
### t4 | timed reports a duration, even on failure
@timed
def _quick():
    return "done"
assert _quick() == "done", "A timed function must still return its result"
assert call_log()[-1].startswith("_quick took ") and call_log()[-1].endswith(" ms"), f"Expected '_quick took 0.01 ms' style, got {call_log()[-1:]}"
@timed
def _fails():
    raise RuntimeError("oops")
try:
    _fails()
except RuntimeError:
    pass
else:
    raise AssertionError("timed must not swallow exceptions")
assert call_log()[-1].startswith("_fails took "), "timed should report the duration even when the function raises (use try/finally)"
### t5 | retry tries again for the errors it is told about
_calls = []
@retry(times=3, on=(ConnectionError,))
def _flaky():
    _calls.append(1)
    if len(_calls) < 3:
        raise ConnectionError("radio dropped")
    return "sent"
assert _flaky() == "sent" and len(_calls) == 3, f"Two failures then success should return the value after 3 calls, calls={len(_calls)}"
assert any("failed (radio dropped); retry 1/2" in line for line in call_log()), "Each failed attempt should be audited as 'name failed (message); retry 1/2'"
_calls.clear()
@retry(times=2, on=(ConnectionError,))
def _always():
    _calls.append(1)
    raise ConnectionError("still down")
try:
    _always()
except ConnectionError as _err:
    assert str(_err) == "still down", "After the last attempt the original error should be raised"
else:
    raise AssertionError("When every attempt fails, retry must re-raise")
assert len(_calls) == 2, f"times=2 means exactly two attempts, got {len(_calls)}"
### t6 | retry ignores other errors and validates its options
_calls.clear()
@retry(times=5, on=(ConnectionError,))
def _wrong():
    _calls.append(1)
    raise KeyError("not a radio problem")
try:
    _wrong()
except KeyError:
    pass
else:
    raise AssertionError("Errors outside 'on' should be raised immediately")
assert len(_calls) == 1, f"A KeyError is not in on=(ConnectionError,), so there should be no retries (calls={len(_calls)})"
try:
    retry(times=0)
except ValueError:
    pass
else:
    raise AssertionError("retry(times=0) should raise ValueError straight away")
@retry()
def _plain():
    return 42
assert _plain() == 42 and _plain.__name__ == "_plain", "retry() with defaults should work and keep the name"
### t7 | The order of stacked decorators matters
@logged
@timed
def _inner_timed():
    return 1
_inner_timed()
_lines = call_log()[-2:]
assert _lines[0].startswith("_inner_timed took ") and _lines[1] == "_inner_timed() -> 1", f"With @logged above @timed, timed finishes first, then logged. Got {_lines}"
@timed
@logged
def _inner_logged():
    return 2
_inner_logged()
_lines = call_log()[-2:]
assert _lines[0] == "_inner_logged() -> 2" and _lines[1].startswith("_inner_logged took "), f"With @timed above @logged, logged finishes first. Got {_lines}"
### t8 | The hub's entry points leave an audit trail
import json as _json
devices["kitchen_light"].execute("off")
_res = command("kitchen_light", "dim", 30)
assert _res["ok"] is True and _res["state"]["level"] == 30, "Decorating command must not change what it returns"
assert call_log()[-1].startswith("command('kitchen_light', 'dim', 30) -> "), f"command should be logged, last line: {call_log()[-1:]}"
assert command.__name__ == "command", "command should keep its name after decoration"
run_routine("lights_off")
assert call_log()[-1] == "run_routine('lights_off') -> {'ok': True, 'routine': 'lights_off'}", f"run_routine should be logged too, got {call_log()[-1:]}"
run_preset("reading")
assert call_log()[-1].startswith("run_preset('reading')"), "run_preset should be logged"
motion_detected("hall")
assert call_log()[-1].startswith("motion_detected('hall')"), "motion_detected should be logged"
devices["hall_light"].execute("off")
devices["living_blinds"].execute("open")
for _i in ("living_light", "kitchen_light", "bedroom_light"):
    devices[_i].execute("off")
_json.dumps(call_log())
for _n in range(100):
    audit(f"line {_n}")
assert len(call_log()) <= 60 and call_log()[-1] == "line 99", "The audit trail should keep only the newest 60 lines"
