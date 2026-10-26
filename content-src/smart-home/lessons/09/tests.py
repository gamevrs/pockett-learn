### t1 | Event is a frozen dataclass with safe defaults
import dataclasses as _dc
assert _dc.is_dataclass(Event), "Decorate Event with @dataclass(frozen=True)"
_e1, _e2 = Event("a"), Event("b")
assert _e1.payload == {} and _e1.seq == 0, "payload should default to an empty dict and seq to 0"
assert _e1.payload is not _e2.payload, "Each Event needs its own default payload: use field(default_factory=dict)"
try:
    _e1.name = "other"
except _dc.FrozenInstanceError:
    pass
else:
    raise AssertionError("Events are facts about the past: make the dataclass frozen")
assert Event("motion", {"room": "hall"}, 7).to_dict() == {"seq": 7, "name": "motion", "payload": {"room": "hall"}}, "to_dict() should give {'seq', 'name', 'payload'}"
### t2 | subscribe and emit deliver events to handlers
_b = EventBus()
_seen = []
_b.subscribe("door", _seen.append)
_count = _b.emit("door", {"open": True})
assert _count == 1, f"emit should return how many handlers received the event (1), got {_count!r}"
assert len(_seen) == 1 and isinstance(_seen[0], Event), "The handler should receive an Event object"
assert (_seen[0].name, _seen[0].payload, _seen[0].seq) == ("door", {"open": True}, 1), f"Unexpected event {_seen[0]}"
assert _b.emit("motion", {"room": "hall"}) == 0 and len(_seen) == 1, "Handlers only hear the event names they subscribed to"
assert _b.emit("door") == 1 and _seen[1].payload == {}, "A missing payload should become an empty dict"
### t3 | Sequence numbers, history and payload copies
_b = EventBus(history_size=3)
_data = {"room": "hall"}
for _n in range(5):
    _b.emit("motion", _data)
_data["room"] = "changed afterwards"
assert [e.seq for e in _b.history] == [3, 4, 5], f"history should keep only the newest 3 events and seq should count 1, 2, 3 ... Got {[e.seq for e in _b.history]}"
assert all(e.payload == {"room": "hall"} for e in _b.history), "emit must copy the payload so later changes to the publisher's dict can't rewrite history"
assert EventBus().emit("x") == 0, "An event nobody listens to is still fine (0 delivered)"
_fresh = EventBus()
_fresh.emit("x")
assert [e.seq for e in _fresh.history] == [1], "Every bus counts its own sequence from 1"
### t4 | unsubscribe stops delivery
_b = EventBus()
_a, _c = [], []
_stop_a = _b.subscribe("x", _a.append)
_b.subscribe("x", _c.append)
assert callable(_stop_a), "subscribe should return an unsubscribe function"
assert _b.listener_count("x") == 2 and _b.listener_count("nope") == 0, "listener_count should count active subscriptions"
_b.emit("x")
_stop_a()
_stop_a()
assert _b.listener_count("x") == 1, "Unsubscribing removes exactly that registration, and calling it twice is harmless"
_b.emit("x")
assert len(_a) == 1 and len(_c) == 2, "After unsubscribe the handler hears nothing more; the others are unaffected"
### t5 | Order: subscription order, wildcard last
_order = []
_b = EventBus()
_b.subscribe("*", lambda e: _order.append("wild"))
_b.subscribe("x", lambda e: _order.append("first"))
_b.subscribe("x", lambda e: _order.append("second"))
_b.subscribe("y", lambda e: _order.append("other"))
assert _b.emit("x") == 3, "Two named handlers and the wildcard make 3 deliveries"
assert _order == ["first", "second", "wild"], f"Named handlers run in subscription order, then wildcard handlers. Got {_order}"
_order.clear()
_b.emit("*")
assert _order == ["wild"], "Emitting '*' itself must not deliver twice"
### t6 | Changes during delivery are safe
_b = EventBus()
_log = []
_cancel = {}
def _first(e):
    _log.append("first")
    _cancel["second"]()
    _b.subscribe("x", lambda e2: _log.append("late"))
_b.subscribe("x", _first)
_cancel["second"] = _b.subscribe("x", lambda e: _log.append("second"))
_b.emit("x")
assert _log == ["first"], f"A handler cancelled during delivery must be skipped, and one added during delivery must wait for the next event. Got {_log}"
_b.emit("x")
assert _log == ["first", "first", "late"], f"On the next emit the new handler runs. Got {_log}"
### t7 | Handlers may emit events too
_b = EventBus()
_trace = []
def _on_a(e):
    _trace.append(f"a{e.seq}")
    _b.emit("b")
    _trace.append("a done")
_b.subscribe("a", _on_a)
_b.subscribe("b", lambda e: _trace.append(f"b{e.seq}"))
_b.emit("a")
assert _trace == ["a1", "b2", "a done"], f"A nested emit is delivered immediately, with the next sequence number. Got {_trace}"
assert [e.name for e in _b.history] == ["a", "b"], "History should list events in the order they were emitted"
### t8 | The hub's bus, hooks and first listener
import json as _json
for _i in ("hall_light", "kitchen_light", "living_light"):
    devices[_i].execute("off")
_res = world_event("motion", {"room": "kitchen"})
assert _res["ok"] is True and _res["delivered"] >= 1, f"world_event should report ok and how many handlers heard it, got {_res}"
assert devices["kitchen_light"].is_on and not devices["hall_light"].is_on, "lights_follow should switch on the light of the room in the payload"
world_event("motion", {"room": "hall"})
world_event("motion", {"room": "living"})
_log = event_log()
_json.dumps(_log)
assert [e["name"] for e in _log[-3:]] == ["motion"] * 3 and _log[-3]["payload"] == {"room": "kitchen"}, f"event_log should list recent events as dicts, oldest first. Got {_log[-3:]}"
assert len(event_log(limit=2)) == 2 and event_log(limit=2) == _log[-2:], "event_log(limit) should return only the newest events"
stop_following()
devices["kitchen_light"].execute("off")
world_event("motion", {"room": "kitchen"})
assert not devices["kitchen_light"].is_on, "stop_following() should disconnect the lights"
_other = EventBus()
_stop = connect_lights(_other)
_other.emit("motion", {"room": "hall"})
assert devices["hall_light"].is_on and callable(_stop), "connect_lights(bus) should work on any bus and return an unsubscribe function"
devices["hall_light"].execute("off")
