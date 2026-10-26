### t1 | dim_lights remembers its level
_fleet = build_devices(CATALOG)
_movie, _bright = dim_lights(20), dim_lights(80)
assert callable(_movie) and _movie is not _bright, "dim_lights(level) should return a new routine each time"
_movie(_fleet)
assert [d.level for d in _fleet.values() if isinstance(d, Light)] == [20, 20, 20, 20], "A routine made with dim_lights(20) should dim every light to 20"
_bright(_fleet)
_movie(_fleet)
assert all(d.level == 20 for d in _fleet.values() if isinstance(d, Light)), "Making dim_lights(80) must not change what the first routine does: each closure keeps its own level"
assert _fleet["living_blinds"].position == 100 and _fleet["living_speaker"].playing is False, "dim_lights must only touch lights"
### t2 | blinds_to sets every blinds device
_fleet = build_devices(CATALOG)
blinds_to(0)(_fleet)
assert _fleet["living_blinds"].position == 0 and _fleet["bedroom_blinds"].position == 0, "blinds_to(0) should close both blinds"
blinds_to(40)(_fleet)
assert _fleet["living_blinds"].position == 40 and _fleet["bedroom_blinds"].position == 40, "blinds_to(40) should set both blinds to 40"
assert all(d.level == 0 for d in _fleet.values() if isinstance(d, Light)), "blinds_to must not touch the lights"
### t3 | chain runs routines in order
_order = []
def _make_step(label):
    def step(devs):
        _order.append((label, len(devs)))
    return step
_fleet = build_devices(CATALOG)
_both = chain(_make_step("a"), _make_step("b"), _make_step("c"))
assert callable(_both), "chain(...) should return a routine"
assert _order == [], "chain() must not run anything until the routine it returns is called"
_both(_fleet)
assert _order == [("a", 13), ("b", 13), ("c", 13)], f"The routines should run in order, each receiving the devices dict. Got {_order}"
chain()(_fleet)
_nested = chain(chain(_make_step("x")), _make_step("y"))
_order.clear()
_nested(_fleet)
assert [label for label, _ in _order] == ["x", "y"], "A chain can contain other chains"
### t4 | make_counter keeps private state
_a, _b = make_counter(), make_counter()
assert [_a(), _a(), _a()] == [1, 2, 3], "A counter should return 1, 2, 3 ... on successive calls (you need nonlocal)"
assert _b() == 1, "Each counter has its own count"
assert _a() == 4, "Using b must not disturb a"
### t5 | One toggle per room, none mixed up
_dev_ids = [f"{r}_light" for r in ("hall", "living", "kitchen", "bedroom")]
for _i in _dev_ids:
    devices[_i].execute("off")
assert set(ROOM_TOGGLES) == {"hall", "living", "kitchen", "bedroom"}, f"ROOM_TOGGLES needs one entry per room, got {sorted(ROOM_TOGGLES)}"
assert ROOM_TOGGLES["bedroom"]() is True, "Toggling an off light should switch it on and return True"
assert [devices[i].is_on for i in _dev_ids] == [False, False, False, True], "Only the bedroom light should have changed. If every toggle hits the same room you have fallen into late binding: build each toggle with make_toggle"
assert ROOM_TOGGLES["hall"]() is True and ROOM_TOGGLES["bedroom"]() is False, "Toggle again to switch off and return False"
for _i in _dev_ids:
    devices[_i].execute("off")
### t6 | The presets do what they say
_expected = {"movie": (15, 0), "reading": (70, None), "morning": (40, 100), "night_light": (5, 0)}
for _name, (_lights, _blinds) in _expected.items():
    assert _name in PRESETS, f"PRESETS is missing {_name!r}"
    _fleet = build_devices(CATALOG)
    PRESETS[_name](_fleet)
    _levels = {d.level for d in _fleet.values() if isinstance(d, Light)}
    assert _levels == {_lights}, f"{_name}: every light should be at {_lights}, got {_levels}"
    if _blinds is not None:
        assert _fleet["living_blinds"].position == _blinds, f"{_name}: the blinds should be at {_blinds}"
### t7 | run_preset counts uses per preset
_first = run_preset("movie")
assert _first == {"ok": True, "preset": "movie", "times": 1}, f"The first run of a preset should report times 1, got {_first}"
assert devices["kitchen_light"].level == 15 and devices["living_blinds"].position == 0, "run_preset should apply the preset to the global devices"
assert run_preset("movie")["times"] == 2, "The second run should report times 2"
assert run_preset("reading")["times"] == 1, "Each preset has its own counter: reading was only used once"
assert run_preset("movie")["times"] == 3, "Using reading must not disturb the movie counter"
devices["living_blinds"].execute("open")
for _i in ("hall_light", "living_light", "kitchen_light", "bedroom_light"):
    devices[_i].execute("off")
### t8 | Unknown presets and the name list
import json as _json
_res = run_preset("disco")
assert _res.get("ok") is False and "disco" in str(_res.get("error")), f"An unknown preset should return ok False and mention the name, got {_res}"
assert preset_names() == list(PRESETS) and len(preset_names()) == 4, "preset_names() should list the keys of PRESETS"
_json.dumps(preset_names())
