### t1 | Room names the four rooms
assert [r.value for r in Room] == ["hall", "living", "kitchen", "bedroom"], "Room should hold HALL, LIVING, KITCHEN, BEDROOM in that order, each with the lowercase name as its value"
assert Room("kitchen") is Room.KITCHEN, 'Room("kitchen") should find Room.KITCHEN. Give each member its lowercase name as the value'
### t2 | Kind names the six device kinds
assert {k.value for k in Kind} == {"light", "thermostat", "lock", "motion", "speaker", "blinds"}, "Kind should have LIGHT, THERMOSTAT, LOCK, MOTION, SPEAKER and BLINDS, each with the lowercase name as its value"
assert Kind.LIGHT.name == "LIGHT" and Kind.LIGHT.value == "light", "Kind.LIGHT should have the value 'light'"
### t3 | DeviceSpec is a frozen dataclass with a default label
import dataclasses as _dc
assert _dc.is_dataclass(DeviceSpec), "Decorate DeviceSpec with @dataclass(frozen=True)"
_spec = DeviceSpec("hall_light", Kind.LIGHT, Room.HALL)
assert _spec.label == "", "label should default to an empty string"
try:
    _spec.label = "changed"
except _dc.FrozenInstanceError:
    pass
else:
    raise AssertionError("A DeviceSpec should be read-only: use @dataclass(frozen=True)")
assert DeviceSpec("a", Kind.LIGHT, Room.HALL) == DeviceSpec("a", Kind.LIGHT, Room.HALL), "Two specs with the same fields should be equal (that is what @dataclass gives you)"
assert len({_spec, DeviceSpec("hall_light", Kind.LIGHT, Room.HALL)}) == 1, "Frozen dataclasses are hashable, so equal specs should collapse in a set"
### t4 | title falls back to a readable name
assert DeviceSpec("living_room_lamp", Kind.LIGHT, Room.LIVING).title == "Living Room Lamp", "With no label, title should turn the id into words: living_room_lamp -> Living Room Lamp"
assert DeviceSpec("lamp", Kind.LIGHT, Room.LIVING, label="Reading lamp").title == "Reading lamp", "When a label is given, title should return the label unchanged"
### t5 | CATALOG lists all thirteen devices once
assert len(CATALOG) == 13, f"CATALOG should hold 13 devices (5 one-offs + 4 lights + 4 motion sensors), it has {len(CATALOG)}"
assert all(isinstance(s, DeviceSpec) for s in CATALOG), "Every CATALOG entry should be a DeviceSpec"
assert len({s.id for s in CATALOG}) == 13, "Every device id must be unique"
_by_id = {s.id: s for s in CATALOG}
for _id, _kind, _room in [("thermostat", Kind.THERMOSTAT, Room.LIVING), ("front_lock", Kind.LOCK, Room.HALL), ("living_speaker", Kind.SPEAKER, Room.LIVING), ("living_blinds", Kind.BLINDS, Room.LIVING), ("bedroom_blinds", Kind.BLINDS, Room.BEDROOM)]:
    assert _id in _by_id, f"CATALOG is missing the device {_id!r}"
    assert _by_id[_id].kind is _kind and _by_id[_id].room is _room, f"{_id} should be a {_kind.name} in the {_room.name} room"
assert _by_id["front_lock"].label == "Front door lock", 'Give front_lock the label "Front door lock"'
### t6 | Every room has a light and a motion sensor
_by_id = {s.id: s for s in CATALOG}
for _room in Room:
    for _suffix, _kind in (("light", Kind.LIGHT), ("motion", Kind.MOTION)):
        _id = f"{_room.value}_{_suffix}"
        assert _id in _by_id, f"CATALOG is missing {_id!r}. Build the lights and sensors with a comprehension over Room"
        assert _by_id[_id].kind is _kind and _by_id[_id].room is _room, f"{_id} should be a {_kind.name} in the {_room.name} room"
### t7 | catalog() hands the scene plain JSON
import json as _json
_data = catalog()
assert isinstance(_data, list) and len(_data) == 13, "catalog() should return a list with one dict per device (13 in total)"
try:
    _json.dumps(_data)
except TypeError as _err:
    raise AssertionError(f"catalog() must contain only JSON-friendly values: convert enum members with .value ({_err})")
_lock = [d for d in _data if d.get("id") == "front_lock"]
assert _lock and _lock[0] == {"id": "front_lock", "kind": "lock", "room": "hall", "title": "Front door lock"}, "The front_lock entry should be {'id': 'front_lock', 'kind': 'lock', 'room': 'hall', 'title': 'Front door lock'}"
