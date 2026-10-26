### t1 | ResilientBus is still a normal bus
assert issubclass(ResilientBus, EventBus), "ResilientBus should extend EventBus so everything from lesson 9 still works"
_b = ResilientBus(history_size=2)
_seen = []
_b.subscribe("x", _seen.append)
assert _b.emit("x", {"n": 1}) == 1 and _seen[0].payload == {"n": 1}, "Normal delivery should work exactly as before"
_b.emit("x")
_b.emit("x")
assert len(_b.history) == 2, "The history_size argument should still reach the base class"
assert len(_b.errors) == 0, "No failures yet, so errors should be empty"
### t2 | A failing handler does not stop the others
_b = ResilientBus()
_order = []
def _good_before(e):
    _order.append("before")
def _bad(e):
    _order.append("bad")
    raise ValueError("boom")
def _good_after(e):
    _order.append("after")
_b.subscribe("x", _good_before)
_b.subscribe("x", _bad)
_b.subscribe("x", _good_after)
try:
    _delivered = _b.emit("x")
except ValueError:
    raise AssertionError("emit must not let a handler's exception escape: catch it in _deliver")
assert _order == ["before", "bad", "after"], f"All three handlers should run, in order. Got {_order}"
assert _delivered == 2, f"emit should count only the handlers that finished without error (2), got {_delivered}"
### t3 | Failures are recorded as data
assert len(_b.errors) == 1, f"One handler failed, so errors should hold one record, it holds {len(_b.errors)}"
_rec = _b.errors[0]
assert _rec["event"] == "x" and _rec["seq"] == 1, f"The record should name the event and its sequence number, got {_rec}"
assert "_bad" in _rec["handler"], f"The record should name the failing handler, got {_rec['handler']!r}"
assert _rec["error"] == "ValueError: boom", f"The error should read 'ValueError: boom', got {_rec['error']!r}"
import json as _json
_json.dumps(list(_b.errors))
### t4 | The dead-letter box is bounded
_b = ResilientBus()
_b.subscribe("x", lambda e: 1 / 0)
for _n in range(80):
    _b.emit("x")
assert len(_b.errors) == 50, f"Keep only the newest 50 failures, errors has {len(_b.errors)}"
assert _b.errors[-1]["seq"] == 80 and _b.errors[0]["seq"] == 31, "The oldest failures should be dropped first"
### t5 | Only Exception is caught
_b = ResilientBus()
def _stop_everything(e):
    raise KeyboardInterrupt()
_b.subscribe("x", _stop_everything)
try:
    _b.emit("x")
except KeyboardInterrupt:
    pass
else:
    raise AssertionError("Catch Exception, not BaseException: a KeyboardInterrupt (or this platform's timeout) must still get through")
### t6 | A weak subscription does not keep its owner alive
import gc as _gc, weakref as _weakref
class _Panel:
    def __init__(self):
        self.seen = []
    def on_event(self, event):
        self.seen.append(event.name)
_b = ResilientBus()
_panel = _Panel()
_ref = _weakref.ref(_panel)
_b.subscribe_weak("x", _panel.on_event)
_b.emit("x")
assert _panel.seen == ["x"], "While the panel is alive it should receive the event"
del _panel
_gc.collect()
assert _ref() is None, "A weak subscription must not keep the panel alive. Hold only weakref.WeakMethod(method) and never the bound method itself"
_b.emit("x")
assert _b.listener_count("x") == 0, f"Once the owner is gone the forwarding subscription should remove itself, listener_count is {_b.listener_count('x')}"
assert len(_b.errors) == 0, "A dead target is not an error"
### t7 | Weak subscriptions can still be cancelled, and work for plain functions
_b = ResilientBus()
_panel = _Panel()
_stop = _b.subscribe_weak("x", _panel.on_event)
_stop()
_b.emit("x")
assert _panel.seen == [] and _b.listener_count("x") == 0, "The returned function should cancel a weak subscription too"
_calls = []
def _plain(event):
    _calls.append(event.name)
_b.subscribe_weak("y", _plain)
_b.emit("y")
assert _calls == ["y"], "A plain function can be subscribed weakly too (use weakref.ref for it)"
### t8 | The hub uses the resilient bus
assert isinstance(bus, ResilientBus), "Create the hub's bus with bus = ResilientBus()"
devices["kitchen_light"].execute("off")
_res = world_event("motion", {"room": "kitchen"})
assert devices["kitchen_light"].is_on and _res["ok"] is True, "Reconnect the lights to the new bus: stop_following = connect_lights(bus)"
_before = len(bus_errors())
_res = world_event("motion", {"room": "attic"})
assert _res["ok"] is True and _res["delivered"] == 0, f"A strict handler failing on an unknown room should not break world_event, got {_res}"
_errors = bus_errors()
_json.dumps(_errors)
assert len(_errors) == _before + 1 and "lights_follow" in _errors[-1]["handler"] and "attic_light" in _errors[-1]["error"], f"bus_errors() should show the KeyError from lights_follow, got {_errors[-1:]}"
assert _errors[-1]["event"] == "motion", "The record should say which event failed"
devices["kitchen_light"].execute("off")
