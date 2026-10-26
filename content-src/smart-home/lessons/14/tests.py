### t1 | condition() attaches a description and returns the same function
@condition("always true")
def _yes(ctx):
    return True
assert _yes(None) is True, "condition(...) must return the original function so it can still be called"
assert _yes.description == "always true", "The decorator should store its argument as func.description"
assert describe(_yes) == "always true", "describe() should return the description"
def _plain(ctx):
    return False
assert describe(_plain) == "_plain", "Without a description, describe() falls back to the function's name"
assert callable(condition("x")), "condition('text') has to return a decorator, so it can be used as @condition('text')"
### t2 | The built-in conditions read the context
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
def _ctx(name="motion", payload=None, minute=720, devs=None, rec=None):
    clk = _Clk(minute)
    return Context(Event(name, payload or {}, 1), devs if devs is not None else build_devices(CATALOG), Daylight(clk), clk, rec if rec is not None else _Rec())
_dark = after_dark()
assert _dark(_ctx(minute=23 * 60)) is True and _dark(_ctx(minute=12 * 60)) is False, "after_dark() should ask ctx.daylight"
assert describe(_dark) == "it is dark", "after_dark() is described as 'it is dark'"
_night = between(23 * 60, 5 * 60)
for _minute, _want in [(23 * 60, True), (23 * 60 + 30, True), (2 * 60, True), (4 * 60 + 59, True), (5 * 60, False), (12 * 60, False), (22 * 60 + 59, False)]:
    assert _night(_ctx(minute=_minute)) is _want, f"between(23:00, 05:00) at minute {_minute} should be {_want}: the start is included, the end is not, and the window wraps past midnight"
_morning = between(7 * 60, 10 * 60)
assert _morning(_ctx(minute=8 * 60)) is True and _morning(_ctx(minute=6 * 60)) is False and _morning(_ctx(minute=10 * 60)) is False, "A window that does not wrap should be start <= now < end"
assert describe(_night) == "the time is between 23:00 and 05:00", f"Unexpected description {describe(_night)!r}"
_c = _ctx(payload={"open": True})
assert device_is("front_lock", locked=True)(_c) is True and device_is("front_lock", locked=False)(_c) is False, "device_is should compare the device's state()"
assert device_is("thermostat", target=21.0, heating=False)(_c) is True and device_is("thermostat", target=21.0, heating=True)(_c) is False, "Every expected key must match"
assert device_is("garage_door", open=True)(_c) is False, "A device that does not exist never matches"
assert describe(device_is("front_lock", locked=False)) == "front_lock has locked=False", f"Unexpected description {describe(device_is('front_lock', locked=False))!r}"
assert payload_is("open", True)(_c) is True and payload_is("open", False)(_c) is False and payload_is("room", "hall")(_c) is False, "payload_is compares one payload key; a missing key never matches"
assert describe(payload_is("open", True)) == "open is True", "payload_is describes itself as 'open is True'"
### t3 | Rule.evaluate gives a verdict and a reason
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
def _ctx(name="motion", payload=None, minute=720, devs=None, rec=None):
    clk = _Clk(minute)
    return Context(Event(name, payload or {}, 1), devs if devs is not None else build_devices(CATALOG), Daylight(clk), clk, rec if rec is not None else _Rec())
_r = Rule("r", on="motion", when=(after_dark(), device_is("hall_light", on=False)), then=lambda ctx: None)
assert _r.evaluate(_ctx(minute=23 * 60)) == (True, "motion event and it is dark and hall_light has on=False"), f"Unexpected result {_r.evaluate(_ctx(minute=23 * 60))}"
assert _r.evaluate(_ctx(minute=12 * 60)) == (False, "needs: it is dark"), f"A failing condition should explain itself, got {_r.evaluate(_ctx(minute=12 * 60))}"
_lit = build_devices(CATALOG)
_lit["hall_light"].execute("on")
assert _r.evaluate(_ctx(minute=23 * 60, devs=_lit)) == (False, "needs: hall_light has on=False"), "The reason should name the first condition that failed"
assert Rule("n", "x", (), lambda ctx: None).evaluate(_ctx()) == (True, "x event"), "A rule with no conditions always passes"
import dataclasses as _dc
try:
    _r.name = "other"
except _dc.FrozenInstanceError:
    pass
else:
    raise AssertionError("Rule should be a frozen dataclass")
### t4 | Effects are configured functions
class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
def _ctx(name="motion", payload=None, minute=720, devs=None, rec=None):
    clk = _Clk(minute)
    return Context(Event(name, payload or {}, 1), devs if devs is not None else build_devices(CATALOG), Daylight(clk), clk, rec if rec is not None else _Rec())
_devs = build_devices(CATALOG)
_c = _ctx(payload={"room": "kitchen"}, devs=_devs)
light_on()(_c)
assert _devs["kitchen_light"].level == 60, "light_on() should default to level 60 in the event's room"
light_on(25)(_c)
assert _devs["kitchen_light"].level == 25, "light_on(25) should dim that light to 25"
light_on(70, room="hall")(_c)
assert _devs["hall_light"].level == 70 and _devs["kitchen_light"].level == 25, "An explicit room overrides the event's room"
light_off()(_c)
assert _devs["kitchen_light"].level == 0 and _devs["hall_light"].level == 70, "light_off() switches off the event's room only"
light_off("hall")(_c)
assert _devs["hall_light"].level == 0, "light_off('hall') should switch off the hall light"
light_on()(_ctx(payload={"room": "attic"}, devs=_devs))
light_on()(_ctx(payload={}, devs=_devs))
assert all(d.level == 0 for d in _devs.values() if isinstance(d, Light)), "Unknown rooms and missing rooms are ignored quietly"
run("movie")(_c)
assert _devs["kitchen_light"].level == 15, "run('movie') should find the preset by name and run it on the context's devices"
_devs["front_lock"].execute("unlock")
run("goodnight")(_c)
assert _devs["front_lock"].locked is True and _devs["kitchen_light"].level == 0, "run('goodnight') should run the routine"
try:
    run("self_destruct")(_c)
except KeyError:
    pass
else:
    raise AssertionError("run(name) should raise KeyError for a name that is neither a routine nor a preset")
_rec = _Rec()
notify("Hello", "World")(_ctx(rec=_rec))
notify("Only title")(_ctx(rec=_rec))
assert _rec.sent == [("Hello", "World"), ("Only title", "")], f"notify should send through the context's notifier, got {_rec.sent}"
### t5 | New routines bedtime and sunrise exist
_devs = build_devices(CATALOG)
_devs["hall_light"].execute("on")
_devs["front_lock"].execute("unlock")
assert "bedtime" in ROUTINES and "sunrise" in ROUTINES, "Add ROUTINES['bedtime'] and ROUTINES['sunrise']"
ROUTINES["bedtime"](_devs)
assert _devs["hall_light"].level == 0 and _devs["front_lock"].locked and _devs["living_blinds"].position == 0 and _devs["bedroom_blinds"].position == 0, "bedtime should do goodnight and close the blinds (use chain)"
ROUTINES["sunrise"](_devs)
assert _devs["living_blinds"].position == 100 and _devs["bedroom_blinds"].position == 100, "sunrise should open the blinds"
assert "bedtime" in routine_names(), "routine_names() should list the new routines too"
### t6 | The engine fires, skips and explains
class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
import json as _json
_b, _devs, _clk, _rec = ResilientBus(), build_devices(CATALOG), _Clk(23 * 60), _Rec()
_eng = RuleEngine(_b, _devs, Daylight(_clk), _clk, _rec)
_eng.add(Rule("Welcome", on="motion", when=(after_dark(),), then=light_on(60)))
_b.emit("motion", {"room": "kitchen"})
assert _devs["kitchen_light"].level == 60, "At night the Welcome rule should switch the kitchen light to 60"
_st = _eng.status["Welcome"]
assert (_st["fired"], _st["skipped"], _st["result"], _st["last"]) == (1, 0, "fired", "motion event and it is dark"), f"Unexpected status {_st}"
_fired = [e for e in _b.history if e.name == "rule.fired"]
assert len(_fired) == 1 and _fired[0].payload["rule"] == "Welcome" and _fired[0].payload["why"] == "motion event and it is dark", "A fired rule should announce rule.fired with the rule name and the reason, exactly once"
_clk.minute = 12 * 60
_devs["kitchen_light"].execute("off")
_b.emit("motion", {"room": "kitchen"})
assert _devs["kitchen_light"].level == 0, "In daylight the rule must not run its effect"
assert (_st["fired"], _st["skipped"], _st["result"], _st["last"]) == (1, 1, "skipped", "needs: it is dark"), f"The skip should be counted and explained, got {_st}"
_b.emit("door", {"open": True})
_b.emit("rule.fired", {"rule": "fake"})
assert (_st["fired"], _st["skipped"]) == (1, 1), "Events the rule is not 'on' must not count, and rule.* events must be ignored"
assert len([e for e in _b.history if e.name == "rule.fired"]) == 2, "The engine must not react to its own rule.fired announcements (only the earlier real one and the fake we emitted)"
_json.dumps(list(_eng.log))
assert [(e["rule"], e["result"]) for e in _eng.log] == [("Welcome", "fired"), ("Welcome", "skipped")] and set(_eng.log[0]) == {"seq", "rule", "result", "why", "event"}, f"Unexpected log {list(_eng.log)}"
try:
    _eng.add(Rule("Welcome", on="x", when=(), then=lambda ctx: None))
except ValueError:
    pass
else:
    raise AssertionError("Adding a second rule with the same name should raise ValueError")
### t7 | One failing rule cannot stop the others
class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
def _explode(ctx):
    raise RuntimeError("kaput")
_b, _devs, _clk = ResilientBus(), build_devices(CATALOG), _Clk(12 * 60)
_eng = RuleEngine(_b, _devs, Daylight(_clk), _clk, _Rec())
_eng.add(Rule("Broken", on="motion", when=(), then=_explode))
_eng.add(Rule("After", on="motion", when=(), then=light_on(30)))
try:
    _b.emit("motion", {"room": "hall"})
except Exception as _err:
    raise AssertionError(f"The engine must catch a failing effect itself instead of raising {_err!r}")
assert _eng.status["Broken"]["failed"] == 1 and _eng.status["Broken"]["result"] == "failed" and _eng.status["Broken"]["last"] == "RuntimeError: kaput", f"The failure should be recorded in the rule's status, got {_eng.status['Broken']}"
assert _eng.status["After"]["fired"] == 1 and _devs["hall_light"].level == 30, "Rules after a failing one must still run"
assert len(_b.errors) == 0, "The engine handled the failure itself, so nothing should reach the bus's dead letters"
assert [e.payload["rule"] for e in _b.history if e.name == "rule.fired"] == ["After"], "A failed rule must not announce rule.fired"
### t8 | The hub tells a story
import json as _json
for _i in ("hall_light", "living_light", "kitchen_light", "bedroom_light"):
    devices[_i].execute("off")
devices["front_lock"].execute("lock")
world_event("time", {"minute": 12 * 60})
world_event("motion", {"room": "hall"})
assert devices["hall_light"].level == 0, "By day, motion should not switch the light on"
_welcome = [r for r in automations()["rules"] if r["name"] == "Welcome light"]
assert _welcome and _welcome[0]["last"] == "needs: it is dark" and _welcome[0]["skipped"] >= 1, f"The Welcome light rule should report why it did not fire, got {_welcome}"
world_event("time", {"minute": 21 * 60})
world_event("motion", {"room": "kitchen"})
assert devices["kitchen_light"].level == 60, "After dark, motion should set the kitchen light to 60 (dimmed by the rule, not the old always-on listener)"
world_event("motion_clear", {"room": "kitchen"})
assert devices["kitchen_light"].level == 0, "When the room empties its light should go off"
_n = len(notifications())
world_event("door", {"open": True})
assert devices["hall_light"].level == 70, "Opening the door after dark should light the hall at 70"
assert len(notifications()) == _n + 1, "The door watcher from lesson 12 should still notify"
devices["living_speaker"].execute("on")
world_event("time", {"minute": 23 * 60 + 30})
assert all(devices[f"{r}_light"].level == 0 for r in ("hall", "living", "kitchen", "bedroom")) and devices["living_speaker"].playing is False, "Goodnight should switch everything off"
assert devices["front_lock"].locked is True and devices["living_blinds"].position == 0 and devices["bedroom_blinds"].position == 0, "Goodnight should lock the door and close the blinds"
world_event("time", {"minute": 23 * 60 + 45})
_good = [r for r in automations()["rules"] if r["name"] == "Goodnight"][0]
assert _good["fired"] == 1 and _good["result"] == "skipped" and _good["last"] == "needs: something is still on or unlocked", f"Goodnight must fire once and then wait until something changes, got {_good}"
world_event("time", {"minute": 7 * 60 + 30})
assert devices["living_blinds"].position == 100 and devices["bedroom_blinds"].position == 100, "At 07:30 the Sunrise blinds rule should open the blinds"
_before = len(notifications())
world_event("temperature", {"value": 12})
assert len(notifications()) == _before + 1 and notifications()[-1]["title"] == "Heating on", "When the heating switches on, the phone should hear about it"
_names = [e["name"] for e in event_log(limit=200)]
assert "rule.fired" in _names, "Fired rules should show up in the event log as rule.fired"
devices["thermostat"].execute("measure", 21)
### t9 | automations() describes every rule
_report = automations()
_json.dumps(_report)
assert isinstance(engine, RuleEngine), "Keep the hub's engine in a variable called engine"
_names = [r["name"] for r in _report["rules"]]
assert _names == ["Welcome light", "Lights off when empty", "Welcome home", "Goodnight", "Sunrise blinds", "Heating notice"], f"Add the six rules in this order with these names, got {_names}"
assert all({"name", "on", "fired", "skipped", "failed", "result", "last"} <= set(r) for r in _report["rules"]), "Each rule entry needs name, on, fired, skipped, failed, result and last"
assert all({"seq", "rule", "result", "why", "event"} <= set(e) for e in _report["log"]) and len(_report["log"]) >= 3, "The log should hold the recent decisions"
_report["rules"][0]["fired"] = 999
assert automations()["rules"][0]["fired"] != 999, "automations() should return copies so the scene cannot change the engine's counters"
