### t1 | Device is an abstract contract
import abc as _abc
assert issubclass(Device, _abc.ABC), "Make Device inherit from ABC"
try:
    Device(CATALOG[0])
except TypeError:
    pass
else:
    raise AssertionError("Device should be abstract: mark state() and execute() with @abstractmethod so Device(...) raises TypeError")
assert {"state", "execute"} <= set(Device.__abstractmethods__), "Both state() and execute() must be abstract methods"
assert "describe" not in Device.__abstractmethods__, "describe() should be a normal method that every device inherits"
### t2 | A subclass must fill in the whole contract
class _HalfDevice(Device):
    def state(self):
        return {}
try:
    _HalfDevice(CATALOG[0])
except TypeError:
    pass
else:
    raise AssertionError("A subclass that skips execute() must not be creatable")
class _FullDevice(Device):
    def state(self):
        return {"ok": 1}
    def execute(self, action, value=None):
        pass
_full = _FullDevice(DeviceSpec("probe", Kind.MOTION, Room.HALL))
assert _full.id == "probe" and _full.room is Room.HALL, "id and room should come from the spec"
assert _full.describe() == {"id": "probe", "kind": "motion", "room": "hall", "ok": 1}, f"describe() should merge identity and state, got {_full.describe()}"
### t3 | A Light switches and dims
_light = Light(DeviceSpec("t_light", Kind.LIGHT, Room.HALL))
assert _light.state() == {"on": False, "level": 0}, f"A new light should be off at level 0, got {_light.state()}"
_light.execute("on")
assert _light.state() == {"on": True, "level": 100}, 'execute("on") should set the level to 100'
_light.execute("dim", 35)
assert _light.state() == {"on": True, "level": 35}, 'execute("dim", 35) should set the level to 35'
_light.execute("dim", 0)
assert _light.is_on is False, "Dimming to 0 means the light is off"
_light.execute("on")
_light.execute("off")
assert _light.level == 0, 'execute("off") should set the level to 0'
### t4 | A Light rejects bad requests
_light = Light(DeviceSpec("t_light", Kind.LIGHT, Room.HALL))
for _bad in (140, -1, "bright", None, True):
    try:
        _light.execute("dim", _bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"dim with {_bad!r} should raise ValueError (levels are numbers from 0 to 100)")
assert _light.level == 0, "A rejected dim must not change the level"
try:
    _light.execute("explode")
except UnsupportedAction as _err:
    assert "explode" in str(_err), "The message should mention the action that was refused"
else:
    raise AssertionError("An unknown action should raise UnsupportedAction")
assert issubclass(UnsupportedAction, ValueError), "UnsupportedAction should inherit from ValueError"
### t5 | build_devices builds one object per known kind
_built = build_devices(CATALOG)
assert len(_built) == 4, f"Only lights have a factory so far: expected 4 devices, got {len(_built)}"
assert set(_built) == {"hall_light", "living_light", "kitchen_light", "bedroom_light"}, "The devices should be keyed by spec id"
assert all(isinstance(d, Light) for d in _built.values()), "Each light spec should produce a Light object"
assert FACTORIES.get(Kind.LIGHT) is Light, "Register the class itself in FACTORIES: {Kind.LIGHT: Light}"
assert len(devices) == 4 and all(isinstance(d, Device) for d in devices.values()), "devices should be build_devices(CATALOG)"
### t6 | snapshot() is plain JSON keyed by device id
import json as _json
devices["kitchen_light"].execute("dim", 40)
_snap = snapshot()
try:
    _json.dumps(_snap)
except TypeError as _err:
    raise AssertionError(f"snapshot() must be JSON-friendly (use describe(), which converts enums): {_err}")
assert _snap["kitchen_light"] == {"id": "kitchen_light", "kind": "light", "room": "kitchen", "on": True, "level": 40}, f"Unexpected kitchen_light snapshot: {_snap.get('kitchen_light')}"
assert _snap["hall_light"]["on"] is False, "Lights you have not touched stay off"
devices["kitchen_light"].execute("off")
### t7 | command() reports instead of crashing
_ok = command("living_light", "dim", 60)
assert _ok.get("ok") is True and _ok["state"]["level"] == 60, f"A good command should return ok True and the new state, got {_ok}"
for _args, _word in ((("nope", "on"), "nope"), (("living_light", "melt"), "melt"), (("living_light", "dim", 999), "999")):
    _res = command(*_args)
    assert _res.get("ok") is False, f"command{_args} should return ok False, not raise or succeed"
    assert _word in str(_res.get("error")), f"The error for command{_args} should mention {_word!r}, got {_res.get('error')!r}"
devices["living_light"].execute("off")
