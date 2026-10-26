### t1 | on_motion registers callbacks room by room
_before_hall = len(motion_callbacks.get("hall", []))
_before_bed = len(motion_callbacks.get("bedroom", []))
def _spy_one(room):
    pass
def _spy_two(room):
    pass
on_motion("hall", _spy_one)
on_motion("hall", _spy_two)
assert len(motion_callbacks["hall"]) == _before_hall + 2, "on_motion should append: several callbacks per room are allowed"
assert motion_callbacks["hall"][-2:] == [_spy_one, _spy_two], "Callbacks must be stored in registration order, as the functions themselves (do not call them)"
assert len(motion_callbacks.get("bedroom", [])) == _before_bed, "Registering for the hall must not touch the bedroom"
motion_callbacks["hall"][-2:] = []
### t2 | motion_detected triggers the sensor and runs the callbacks in order
_log = []
on_motion("bedroom", lambda room: _log.append(("first", room)))
on_motion("bedroom", lambda room: _log.append(("second", room)))
_res = motion_detected("bedroom")
assert _log == [("first", "bedroom"), ("second", "bedroom")], f"Each callback should get the room name, in registration order. They saw {_log}"
assert devices["bedroom_motion"].detected is True, "motion_detected should trigger the room's motion sensor"
assert _res["ok"] is True and _res["room"] == "bedroom", f"Unexpected result {_res}"
assert _res["callbacks"] == len(motion_callbacks["bedroom"]), "callbacks should report how many callbacks ran"
motion_callbacks["bedroom"][-2:] = []
devices["bedroom_motion"].execute("clear")
devices["bedroom_light"].execute("off")
### t3 | an unknown room is reported, not raised
_res = motion_detected("garage")
assert _res.get("ok") is False and "garage" in str(_res.get("error")), f"A room without a sensor should return ok False and mention the room, got {_res}"
### t4 | lights follow you, wired with lambdas
for _room in Room:
    devices[f"{_room.value}_light"].execute("off")
motion_detected("kitchen")
assert devices["kitchen_light"].is_on, "Motion in the kitchen should switch the kitchen light on"
assert not devices["hall_light"].is_on and not devices["living_light"].is_on, "Only the room with motion should light up"
motion_detected("hall")
assert devices["hall_light"].is_on, "Every room needs its own wiring, not just the last one in the loop"
for _room in Room:
    devices[f"{_room.value}_light"].execute("off")
### t5 | count_visit tallies visits
visit_counts.update({r.value: 0 for r in Room})
motion_detected("hall")
motion_detected("hall")
motion_detected("living")
assert visit_counts == {"hall": 2, "living": 1, "kitchen": 0, "bedroom": 0}, f"Each motion should register exactly one visit for its room, counts are {visit_counts}"
count_visit("kitchen")
assert visit_counts["kitchen"] == 1, "count_visit(room) should add one"
for _room in Room:
    devices[f"{_room.value}_light"].execute("off")
### t6 | busiest_rooms ranks with a lambda key
import json as _json
_saved = dict(visit_counts)
visit_counts.update({"hall": 1, "living": 5, "kitchen": 5, "bedroom": 0})
_rank = busiest_rooms()
_json.dumps(_rank)
assert _rank == [{"room": "kitchen", "visits": 5}, {"room": "living", "visits": 5}, {"room": "hall", "visits": 1}, {"room": "bedroom", "visits": 0}], f"Rooms should be ordered by visits (most first), ties alphabetical. Got {_rank}"
visit_counts.update({"hall": 0, "living": 0, "kitchen": 0, "bedroom": 0})
assert [r["room"] for r in busiest_rooms()] == ["bedroom", "hall", "kitchen", "living"], "With all counts equal the order should be alphabetical"
visit_counts.update(_saved)
