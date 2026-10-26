### t1 | wire_home returns the unsubscribe handles
_b, _devs = ResilientBus(), build_devices(CATALOG)
_handles = wire_home(_b, _devs)
assert isinstance(_handles, list) and len(_handles) >= 3 and all(callable(h) for h in _handles), "wire_home should return a list of unsubscribe functions (one per subscription)"
assert _b.listener_count("motion") >= 1 and _b.listener_count("motion_clear") == 1 and _b.listener_count("temperature") == 1, "Subscribe to motion, motion_clear and temperature on the bus that was passed in"
### t2 | Sensors follow motion events
_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_b.emit("motion", {"room": "kitchen"})
assert _devs["kitchen_motion"].detected is True, "A motion event should trigger that room's sensor"
assert not any(_devs[f"{r}_motion"].detected for r in ("hall", "living", "bedroom")), "Only the sensor in the event's room should trigger"
_b.emit("motion_clear", {"room": "kitchen"})
assert _devs["kitchen_motion"].detected is False, "motion_clear should reset the sensor"
_b.emit("motion", {"room": "attic"})
_b.emit("motion")
assert len(_b.errors) == 0, "Unknown rooms and missing payloads are ignored quietly, not recorded as errors"
### t3 | Visits are counted from the bus
_saved = dict(visit_counts)
visit_counts.update({r.value: 0 for r in Room})
_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_b.emit("motion", {"room": "hall"})
_b.emit("motion", {"room": "hall"})
_b.emit("motion", {"room": "living"})
_b.emit("motion", {"room": "attic"})
assert visit_counts == {"hall": 2, "living": 1, "kitchen": 0, "bedroom": 0}, f"Each motion event should count one visit, rooms that don't exist are ignored. Counts: {visit_counts}"
visit_counts.clear()
visit_counts.update(_saved)
### t4 | The thermostat reacts to temperature and announces changes
_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_heard = []
_b.subscribe("heating", lambda e: _heard.append(e.payload))
_b.emit("temperature", {"value": 17})
_t = _devs["thermostat"]
assert _t.current == 17.0 and _t.heating is True, "A temperature event should be passed to the thermostat as a measurement"
assert _heard == [{"on": True}], f"Switching the heating on should publish a 'heating' event with {{'on': True}}. Heard {_heard}"
_b.emit("temperature", {"value": 17.2})
assert _heard == [{"on": True}], "A new reading that does not change the heating must not publish another event"
_b.emit("temperature", {"value": 22})
assert _heard == [{"on": True}, {"on": False}], f"Reaching the target should publish {{'on': False}}. Heard {_heard}"
### t5 | A broken reading is isolated, not fatal
_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_later = []
_b.subscribe("temperature", lambda e: _later.append("ran"))
_b.emit("temperature", {})
assert _devs["thermostat"].current == 21.0, "A reading without a value must not change the thermostat"
assert len(_b.errors) == 1 and _b.errors[0]["error"].startswith("KeyError"), f"The missing value should be filed as a KeyError in the dead-letter box, got {list(_b.errors)}"
assert _later == ["ran"], "Handlers after the failing one must still run"
_b.emit("temperature", {"value": "hot"})
assert len(_b.errors) == 2 and _b.errors[1]["error"].startswith("ValueError"), "A non-numeric reading should be rejected by the thermostat (ValueError) and recorded"
### t6 | The handles undo the wiring
_b, _devs = ResilientBus(), build_devices(CATALOG)
_handles = wire_home(_b, _devs)
for _stop in _handles:
    _stop()
_b.emit("motion", {"room": "hall"})
_b.emit("temperature", {"value": 5})
assert _devs["hall_motion"].detected is False and _devs["thermostat"].current == 21.0, "After calling every handle the devices must stop reacting"
assert _b.listener_count("motion") == 0 and _b.listener_count("temperature") == 0, "All subscriptions should be gone"
### t7 | The hub is wired
devices["kitchen_light"].execute("off")
for _room in ("hall", "living", "kitchen", "bedroom"):
    devices[f"{_room}_motion"].execute("clear")
visit_counts.update({r.value: 0 for r in Room})
world_event("motion", {"room": "kitchen"})
assert devices["kitchen_motion"].detected is True, "Connect the hub: wiring = wire_home(bus, devices)"
assert visit_counts["kitchen"] == 1, f"One motion event must count exactly one visit (not two), got {visit_counts['kitchen']}"
world_event("motion_clear", {"room": "kitchen"})
assert devices["kitchen_motion"].detected is False, "motion_clear should clear the hub's sensor"
world_event("temperature", {"value": 15})
assert devices["thermostat"].heating is True and devices["thermostat"].current == 15.0, "temperature events should reach the hub's thermostat"
_names = [e["name"] for e in event_log()]
assert _names[-2:] == ["temperature", "heating"], f"The log should show the reading and then the heating event it caused, got {_names[-4:]}"
_before = len(bus_errors())
world_event("temperature", {})
assert len(bus_errors()) == _before + 1 and "KeyError" in bus_errors()[-1]["error"], "A temperature event with no value should appear in bus_errors()"
devices["kitchen_light"].execute("off")
devices["thermostat"].execute("measure", 21)
