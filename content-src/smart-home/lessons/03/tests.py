### t1 | DoorLock locks and unlocks
_lock = DoorLock(DeviceSpec("t_lock", Kind.LOCK, Room.HALL))
assert isinstance(_lock, Device), "DoorLock should extend Device"
assert _lock.state() == {"locked": True}, f"A new lock starts locked, got {_lock.state()}"
_lock.execute("unlock")
assert _lock.state() == {"locked": False}, 'execute("unlock") should leave the lock unlocked'
_lock.execute("lock")
assert _lock.locked is True, 'execute("lock") should lock it again'
try:
    _lock.execute("dim", 50)
except UnsupportedAction:
    pass
else:
    raise AssertionError("A lock cannot dim: it should raise UnsupportedAction")
### t2 | The thermostat uses hysteresis
_t = Thermostat(DeviceSpec("t_stat", Kind.THERMOSTAT, Room.LIVING))
assert (_t.target, _t.current, _t.heating) == (21.0, 21.0, False), f"Defaults should be target 21.0, current 21.0, heating False, got {_t.state()}"
_t.measure(19)
assert _t.heating is True, "At 19 with target 21 the heating should switch on"
_t.measure(20.7)
assert _t.heating is True, "20.7 is inside the dead band (between target - 0.5 and target): keep heating"
_t.measure(21)
assert _t.heating is False, "Reaching the target should switch the heating off"
_t.measure(20.7)
assert _t.heating is False, "20.7 is inside the dead band: stay off, do not flicker back on"
_t.measure(20.5)
assert _t.heating is True, "At target - 0.5 the heating should start again"
### t3 | Targets are validated and re-evaluated
_t = Thermostat(DeviceSpec("t_stat", Kind.THERMOSTAT, Room.LIVING))
_t.set_target(23)
assert _t.target == 23.0 and _t.heating is True, "Raising the target to 23 while it is 21 inside should start the heating immediately (set_target should call measure again)"
for _bad in (5, 31, "warm", None):
    try:
        _t.set_target(_bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"set_target({_bad!r}) should raise ValueError (targets are numbers from 10 to 30)")
assert _t.target == 23.0, "A rejected target must not change the thermostat"
_t.execute("measure", 24)
assert _t.state() == {"target": 23.0, "current": 24.0, "heating": False}, f"Unexpected thermostat state {_t.state()}"
try:
    _t.execute("measure", "hot")
except ValueError:
    assert _t.current == 24.0, "A rejected reading must not overwrite the last good one"
else:
    raise AssertionError("A reading that is not a number should raise ValueError")
try:
    _t.execute("unlock")
except UnsupportedAction:
    pass
else:
    raise AssertionError("A thermostat cannot unlock: raise UnsupportedAction")
### t4 | The factories know every kind built so far
assert FACTORIES.get(Kind.LOCK) is DoorLock and FACTORIES.get(Kind.THERMOSTAT) is Thermostat, "Add Kind.LOCK and Kind.THERMOSTAT to FACTORIES"
assert len(devices) == 6, f"devices should now hold 4 lights, the lock and the thermostat (6), it has {len(devices)}"
assert isinstance(devices["front_lock"], DoorLock) and isinstance(devices["thermostat"], Thermostat), "Rebuild devices with build_devices(CATALOG) after registering the new classes"
### t5 | snapshot() includes the new devices
import json as _json
_snap = snapshot()
_json.dumps(_snap)
assert _snap["front_lock"] == {"id": "front_lock", "kind": "lock", "room": "hall", "locked": True}, f"Unexpected front_lock snapshot: {_snap.get('front_lock')}"
assert _snap["thermostat"] == {"id": "thermostat", "kind": "thermostat", "room": "living", "target": 21.0, "current": 21.0, "heating": False}, f"Unexpected thermostat snapshot: {_snap.get('thermostat')}"
### t6 | broadcast separates doers from refusers
_fleet = build_devices(CATALOG)
for _light in ("hall_light", "kitchen_light"):
    _fleet[_light].execute("on")
_res = broadcast(_fleet.values(), "off")
assert sorted(_res["done"]) == ["bedroom_light", "hall_light", "kitchen_light", "living_light"], f"Only the four lights can switch off, but done was {_res['done']}"
assert sorted(_res["skipped"]) == ["front_lock", "thermostat"], f"The lock and thermostat should be skipped, got {_res['skipped']}"
assert all(not _fleet[i].is_on for i in _res["done"]), "The lights should really be off afterwards"
_res = broadcast(_fleet.values(), "lock")
assert _res["done"] == ["front_lock"] and len(_res["skipped"]) == 5, f"Only the lock understands 'lock', got {_res}"
### t7 | broadcast does not swallow real mistakes
_fleet = build_devices(CATALOG)
try:
    broadcast(_fleet.values(), "dim", 999)
except ValueError:
    pass
else:
    raise AssertionError("A bad value is the caller's mistake: broadcast should only catch UnsupportedAction, so ValueError must come through")
### t8 | command() works on the new devices
_res = command("front_lock", "unlock")
assert _res == {"ok": True, "state": {"id": "front_lock", "kind": "lock", "room": "hall", "locked": False}}, f"Unexpected result {_res}"
_res = command("thermostat", "set_target", 40)
assert _res.get("ok") is False and "40" in _res.get("error", ""), f"An out-of-range target should come back as an error dict, got {_res}"
assert command("thermostat", "set_target", 23)["state"]["heating"] is True, "Raising the target above the current temperature should start heating"
devices["front_lock"].execute("lock")
devices["thermostat"].execute("set_target", 21)
