### t1 | select keeps what a test function accepts
assert select(range(10), lambda n: n % 2 == 0) == [0, 2, 4, 6, 8], "select(items, where) should keep the items for which where(item) is true"
assert select([], lambda n: True) == [], "Selecting from nothing gives an empty list"
_words = ["lamp", "lock", "speaker"]
assert select(_words, lambda w: w.startswith("l")) == ["lamp", "lock"], "select must work on any items, and keep their order"
assert isinstance(select(iter(_words), lambda w: True), list), "select should return a list, even for a generator input"
### t2 | apply_to runs an action on every item
_seen = []
_n = apply_to(["a", "b", "c"], _seen.append)
assert _seen == ["a", "b", "c"], f"apply_to should call the action once per item, in order. The action saw {_seen}"
assert _n == 3, f"apply_to should return how many items it handled (3), got {_n!r}"
assert apply_to([], _seen.append) == 0, "No items means a count of 0"
_fleet = build_devices(CATALOG)
for _l in select(_fleet.values(), lambda d: d.spec.kind is Kind.LIGHT):
    _l.turn_on()
assert apply_to((d for d in _fleet.values() if isinstance(d, Light)), Light.turn_off) == 4, "A generator and an unbound method (Light.turn_off) should both work"
assert all(not d.is_on for d in _fleet.values() if isinstance(d, Light)), "Light.turn_off passed as the action should switch the lights off"
### t3 | by_kind builds a predicate
_fleet = build_devices(CATALOG)
_is_lock = by_kind(Kind.LOCK)
assert callable(_is_lock), "by_kind(kind) should return a function, not a bool"
assert _is_lock(_fleet["front_lock"]) is True and _is_lock(_fleet["thermostat"]) is False, "The predicate should be True only for devices of that kind"
_is_light = by_kind(Kind.LIGHT)
assert [d.id for d in select(_fleet.values(), _is_light)] == ["hall_light", "living_light", "kitchen_light", "bedroom_light"], "Predicates made by separate by_kind calls must not interfere with each other"
assert _is_lock(_fleet["hall_light"]) is False, "The lock predicate must stay a lock predicate after another one was created"
### t4 | The routines work on whatever devices they are given
_fleet = build_devices(CATALOG)
for _id in ("hall_light", "kitchen_light", "living_speaker"):
    _fleet[_id].execute("on")
_fleet["front_lock"].execute("unlock")
lights_off(_fleet)
assert all(not d.is_on for d in _fleet.values() if isinstance(d, Light)), "lights_off should switch every light off"
assert _fleet["living_speaker"].playing is True, "lights_off must only touch lights: the speaker keeps playing"
lock_up(_fleet)
assert _fleet["front_lock"].locked is True, "lock_up should lock the front door"
_fleet["front_lock"].execute("unlock")
_fleet["hall_light"].execute("on")
everything_off(_fleet)
assert _fleet["living_speaker"].playing is False and _fleet["hall_light"].level == 0, "everything_off should switch off every Switchable device"
assert _fleet["front_lock"].locked is False, "everything_off does not lock anything"
_fleet["hall_light"].execute("on")
_fleet["living_speaker"].execute("on")
goodnight(_fleet)
assert _fleet["front_lock"].locked and not _fleet["hall_light"].is_on and not _fleet["living_speaker"].playing, "goodnight should switch everything off and lock the door"
### t5 | ROUTINES stores the functions themselves
for _name in ("lights_off", "lock_up", "everything_off", "goodnight"):
    assert _name in ROUTINES, f"ROUTINES is missing {_name!r}"
assert ROUTINES["lock_up"] is lock_up and ROUTINES["goodnight"] is goodnight, "Store the functions without calling them: {'lock_up': lock_up}, not lock_up()"
assert all(callable(r) for r in ROUTINES.values()), "Every value in ROUTINES must be callable"
### t6 | run_routine looks a routine up and runs it
devices["hall_light"].execute("on")
devices["front_lock"].execute("unlock")
_res = run_routine("lights_off")
assert _res == {"ok": True, "routine": "lights_off"}, f"run_routine should report success as {{'ok': True, 'routine': name}}, got {_res}"
assert devices["hall_light"].level == 0, "run_routine should run the routine on the global devices"
run_routine("goodnight")
assert devices["front_lock"].locked is True, "run_routine('goodnight') should lock the door"
_bad = run_routine("self_destruct")
assert _bad.get("ok") is False and "self_destruct" in str(_bad.get("error")), f"An unknown routine should give ok False and mention its name, got {_bad}"
### t7 | routine_names follows the table
import json as _json
_names = routine_names()
assert _names == list(ROUTINES), "routine_names() should list the keys of ROUTINES in order"
_json.dumps(_names)
ROUTINES["_tmp"] = lambda devs: None
assert "_tmp" in routine_names() and run_routine("_tmp")["ok"] is True, "A routine added to the table later should be listed and runnable without any other change"
del ROUTINES["_tmp"]
