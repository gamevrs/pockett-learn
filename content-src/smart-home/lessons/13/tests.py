### t1 | matching is a lazy filter
import inspect as _inspect
_pool = [Event("door", {}, 1), Event("motion", {}, 2), Event("temperature", {}, 3), Event("door", {}, 4)]
_g = matching(_pool, "door")
assert _inspect.isgenerator(_g), "matching should be a generator function (use yield)"
assert [e.seq for e in _g] == [1, 4], "matching(events, 'door') should keep only the door events, in order"
assert [e.seq for e in matching(_pool, "door", "temperature")] == [1, 3, 4], "Several names are allowed"
assert [e.seq for e in matching(_pool)] == [1, 2, 3, 4], "With no names every event passes"
def _forever():
    n = 0
    while True:
        n += 1
        yield Event("a" if n % 2 else "b", {}, n)
assert next(matching(_forever(), "b")).seq == 2, "matching must be lazy: it should find the first 'b' in an endless stream without reading it all"
### t2 | newest_first walks the history backwards
_b = EventBus()
for _n in ("one", "two", "three"):
    _b.emit(_n)
_g = newest_first(_b)
assert _inspect.isgenerator(_g), "newest_first should be a generator"
assert [e.name for e in _g] == ["three", "two", "one"], "The newest event should come first"
_b.emit("four")
assert next(newest_first(_b)).name == "four", "Each call starts from the current history"
assert list(newest_first(EventBus())) == [], "An empty history gives an empty stream"
### t3 | recent_events takes the newest matches, oldest first
import json as _json
for _n in range(6):
    bus.emit("probe_a", {"n": _n})
    bus.emit("probe_b", {"n": _n})
_two = recent_events("probe_a", 2)
_json.dumps(_two)
assert [e["payload"]["n"] for e in _two] == [4, 5] and all(e["name"] == "probe_a" for e in _two), f"recent_events('probe_a', 2) should return the last two probe_a events, oldest first. Got {_two}"
assert len(recent_events("probe_b", 100)) >= 6 and recent_events("probe_b", 100)[-1]["payload"]["n"] == 5, "A big limit just returns what exists"
assert recent_events("no_such_event") == [], "An unknown name gives an empty list"
assert recent_events("probe_a", 0) == [] and recent_events("probe_a", -3) == [], "A limit below 1 gives an empty list"
_all = recent_events(limit=3)
assert _all == event_log()[-3:], "With no name, recent_events(limit=3) should equal the last three entries of event_log()"
### t4 | day_slots is a lazy walk through the day
_s = day_slots()
assert _inspect.isgenerator(_s) or hasattr(_s, "__next__"), "day_slots should return an iterator"
assert next(_s) == (0, True) and next(_s) == (30, True), "The day starts at minute 0, in the dark, and steps by 30"
_half_hours = list(day_slots(30))
assert len(_half_hours) == 48 and _half_hours[13] == (390, False) and _half_hours[36] == (1080, True), f"Expected 48 half-hour slots with light from 06:30 to 18:00, got {len(_half_hours)}"
assert len(list(day_slots(60))) == 24 and len(list(day_slots(1440))) == 1, "step controls how many slots there are"
for _bad in (0, -5):
    try:
        day_slots(_bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"day_slots({_bad}) should raise ValueError as soon as it is called, not when iteration starts (validate in a normal function and return the generator)")
### t5 | daylight_map feeds the scene
_map = daylight_map()
_json.dumps(_map)
assert len(_map) == 48 and _map[0] == {"minute": 0, "dark": True} and _map[24] == {"minute": 720, "dark": False}, f"daylight_map should list {{'minute', 'dark'}} dicts, got {_map[:2]}"
assert all(m["dark"] == is_dark_at(m["minute"]) for m in _map), "The dark flags must agree with is_dark_at"
assert len(daylight_map(120)) == 12, "daylight_map(step) should pass the step on"
### t6 | EventCursor is a resumable iterator
_b = EventBus()
_cur = EventCursor(_b)
assert iter(_cur) is _cur, "An iterator's __iter__ returns itself"
assert next(_cur, "empty") == "empty", "A cursor on an empty bus has nothing to give"
_b.emit("a")
_b.emit("b")
assert [e.name for e in _cur] == ["a", "b"], "The first pass should yield everything emitted so far, in order"
assert list(_cur) == [], "A second pass finds nothing new"
_b.emit("c")
assert [e.name for e in _cur] == ["c"], "Unlike a generator, the cursor resumes: it yields only what arrived since last time"
_other = EventCursor(_b)
assert [e.name for e in _other] == ["a", "b", "c"], "Each cursor keeps its own place"
try:
    next(_cur)
except StopIteration:
    pass
else:
    raise AssertionError("next() on a drained cursor must raise StopIteration")
### t7 | The hub's unread() only reports new events
unread()
assert unread() == [], "Right after reading, nothing is unread"
world_event("probe_c", {"x": 1})
world_event("probe_d")
_new = unread()
_json.dumps(_new)
assert [e["name"] for e in _new] == ["probe_c", "probe_d"] and _new[0]["payload"] == {"x": 1}, f"unread() should return only the two new events as dicts, got {_new}"
assert unread() == [], "They should not be reported twice"
assert isinstance(reader, EventCursor), "reader should be an EventCursor on the hub's bus"
