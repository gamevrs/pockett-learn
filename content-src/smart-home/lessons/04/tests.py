### t1 | Switchable and Sensor are runtime-checkable Protocols
import typing as _typing
for _proto in (Switchable, Sensor):
    assert getattr(_proto, "_is_protocol", False), f"{_proto.__name__} should inherit from typing.Protocol"
_lamp = Light(DeviceSpec("t_lamp", Kind.LIGHT, Room.HALL))
_lock = DoorLock(DeviceSpec("t_lock", Kind.LOCK, Room.HALL))
try:
    _is_switchable = isinstance(_lamp, Switchable)
except TypeError:
    raise AssertionError("Add @runtime_checkable above Switchable (and Sensor) so isinstance() can be used")
assert _is_switchable, "A Light has turn_on() and turn_off(), so it is Switchable without inheriting from it"
assert not isinstance(_lock, Switchable), "A DoorLock has no turn_on()/turn_off(): it is not Switchable"
assert not isinstance(_lamp, Sensor), "A Light has no read(): it is not a Sensor"
### t2 | Speaker plays and has a volume
_sp = Speaker(DeviceSpec("t_speaker", Kind.SPEAKER, Room.LIVING))
assert isinstance(_sp, Device) and isinstance(_sp, Switchable), "Speaker should extend Device and satisfy Switchable"
assert _sp.state() == {"playing": False, "volume": 30}, f"A new speaker is silent at volume 30, got {_sp.state()}"
_sp.execute("on")
_sp.execute("volume", 55)
assert _sp.state() == {"playing": True, "volume": 55}, f"Unexpected speaker state {_sp.state()}"
_sp.execute("off")
assert _sp.playing is False, 'execute("off") should stop the music'
for _bad in (101, -5, "loud", None):
    try:
        _sp.execute("volume", _bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"volume {_bad!r} should raise ValueError (0 to 100)")
assert _sp.volume == 55, "A rejected volume must not change the speaker"
try:
    _sp.execute("lock")
except UnsupportedAction:
    pass
else:
    raise AssertionError("A speaker cannot lock: raise UnsupportedAction")
### t3 | MotionSensor is a Sensor
_ms = MotionSensor(DeviceSpec("t_motion", Kind.MOTION, Room.HALL))
assert isinstance(_ms, Device) and isinstance(_ms, Sensor), "MotionSensor should extend Device and satisfy Sensor (it needs read())"
assert not isinstance(_ms, Switchable), "A motion sensor cannot be switched on and off"
assert _ms.read() == 0.0 and _ms.state() == {"detected": False}, "A new sensor sees nothing"
_ms.execute("trigger")
assert _ms.read() == 1.0 and _ms.state() == {"detected": True}, "After trigger the sensor should read 1.0"
_ms.execute("clear")
assert _ms.read() == 0.0, "After clear it should read 0.0 again"
try:
    _ms.execute("dim", 3)
except UnsupportedAction:
    pass
else:
    raise AssertionError("A motion sensor cannot dim: raise UnsupportedAction")
### t4 | All six kinds are registered
assert set(FACTORIES) == set(Kind), f"FACTORIES should cover every Kind, it is missing {set(Kind) - set(FACTORIES)}"
assert FACTORIES[Kind.SPEAKER] is Speaker and FACTORIES[Kind.MOTION] is MotionSensor and FACTORIES[Kind.BLINDS] is Blinds, "Register the classes themselves (not instances) in FACTORIES"
assert len(devices) == 13, f"devices should now hold all 13 devices, it has {len(devices)}. Rebuild it after registering"
assert isinstance(devices["living_blinds"], Blinds) and isinstance(devices["kitchen_motion"], MotionSensor), "devices should hold Blinds and MotionSensor objects"
### t5 | The snapshot shows every device
import json as _json
_snap = snapshot()
_json.dumps(_snap)
assert len(_snap) == 13, f"snapshot() should list 13 devices, got {len(_snap)}"
assert _snap["living_blinds"] == {"id": "living_blinds", "kind": "blinds", "room": "living", "position": 100}, f"Unexpected blinds snapshot {_snap.get('living_blinds')}"
assert _snap["hall_motion"] == {"id": "hall_motion", "kind": "motion", "room": "hall", "detected": False}, f"Unexpected motion snapshot {_snap.get('hall_motion')}"
assert _snap["living_speaker"]["playing"] is False, "The speaker starts silent"
### t6 | power_down switches off anything Switchable
class _Plug:
    """A vendor gadget: no base class, but the right shape."""
    def __init__(self):
        self.on = True
    def turn_on(self):
        self.on = True
    def turn_off(self):
        self.on = False
_plug = _Plug()
_lamp = Light(DeviceSpec("t_lamp", Kind.LIGHT, Room.HALL))
_lamp.execute("on")
_sp = Speaker(DeviceSpec("t_speaker", Kind.SPEAKER, Room.LIVING))
_sp.execute("on")
_lock = DoorLock(DeviceSpec("t_lock", Kind.LOCK, Room.HALL))
_lock.execute("unlock")
_count = power_down([_lamp, _lock, _plug, "not a device", _sp])
assert _count == 3, f"Three things were Switchable (the light, the plug and the speaker), power_down returned {_count}"
assert _lamp.level == 0 and _plug.on is False and _sp.playing is False, "Everything switchable should be off afterwards"
assert _lock.locked is False, "power_down must leave non-switchable devices alone"
assert power_down([]) == 0, "power_down of nothing should return 0"
### t7 | active_sensors keeps the sensors that read above zero
class _Probe:
    def __init__(self, value):
        self.value = value
    def read(self):
        return self.value
_a = MotionSensor(DeviceSpec("t_a", Kind.MOTION, Room.HALL))
_b = MotionSensor(DeviceSpec("t_b", Kind.MOTION, Room.LIVING))
_b.trigger()
_cold, _warm = _Probe(0), _Probe(21.5)
_found = active_sensors([_a, _b, _cold, _warm])
assert _found == [_b, _warm], f"Expected the triggered sensor and the warm probe, in order, got {_found}"
assert active_sensors([]) == [], "No sensors means no active sensors"
### t8 | The old helpers still work with the new devices
_fleet = build_devices(CATALOG)
_fleet["living_speaker"].execute("on")
_fleet["hall_light"].execute("on")
assert power_down(_fleet.values()) == 5, "Four lights and the speaker are Switchable"
_res = broadcast(_fleet.values(), "close")
assert sorted(_res["done"]) == ["bedroom_blinds", "living_blinds"], f"Only the blinds understand 'close', got {_res['done']}"
