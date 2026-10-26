### t1 | hhmm formats minutes as a clock face
assert hhmm(0) == "00:00" and hhmm(75) == "01:15" and hhmm(1439) == "23:59", f"hhmm(0), hhmm(75), hhmm(1439) should be 00:00, 01:15, 23:59, got {hhmm(0)}, {hhmm(75)}, {hhmm(1439)}"
assert hhmm(12 * 60 + 5) == "12:05", "Minutes need a leading zero: 12:05"
assert hhmm(1500) == "01:00", "Past midnight should wrap around (use % 24 on the hour)"
### t2 | Day and night boundaries
assert (SUNRISE, SUNSET) == (390, 1080), "SUNRISE is 06:30 (390) and SUNSET is 18:00 (1080), in minutes after midnight"
assert is_dark_at(0) and is_dark_at(389) and is_dark_at(1080) and is_dark_at(1439), "Before sunrise and from sunset on it is dark"
assert not is_dark_at(390) and not is_dark_at(720) and not is_dark_at(1079), "From sunrise until just before sunset it is light"
assert is_dark_at(500, sunrise=600, sunset=900) and not is_dark_at(700, sunrise=600, sunset=900), "Custom sunrise and sunset should be honoured"
### t3 | SimClock is a settable Clock
_c = SimClock()
assert isinstance(_c, Clock), "SimClock needs a now() method to satisfy the Clock protocol"
assert _c.now() == 720, "A SimClock starts at noon (720)"
_c.set(23 * 60 + 15)
assert _c.now() == 1395, "set() should change what now() reports"
_c.set(1500)
assert _c.now() == 60, "set() keeps the time inside one day (1500 wraps to 60)"
_c.set(90.0)
assert _c.now() == 90 and isinstance(_c.now(), int), "A float minute should be stored as a whole number"
for _bad in ("noon", None, True):
    try:
        _c.set(_bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"set({_bad!r}) should raise ValueError")
assert _c.now() == 90, "A rejected time must not change the clock"
### t4 | PhoneNotifier stamps messages using the injected clock
class _FixedClock:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
_fc = _FixedClock(8 * 60 + 5)
_p = PhoneNotifier(_fc)
assert isinstance(_p, Notifier), "PhoneNotifier needs send(title, body) to satisfy Notifier"
_p.send("Hello", "World")
_p.send("Only a title")
assert list(_p.outbox) == [{"at": "08:05", "title": "Hello", "body": "World"}, {"at": "08:05", "title": "Only a title", "body": ""}], f"Unexpected outbox {list(_p.outbox)}"
_fc.minute = 9 * 60
_p.send("Later")
assert _p.outbox[-1]["at"] == "09:00", "The time stamp should come from the injected clock at the moment of sending"
_small = PhoneNotifier(_fc, keep=2)
for _n in range(5):
    _small.send(f"m{_n}")
assert [m["title"] for m in _small.outbox] == ["m3", "m4"], "keep should limit the outbox to the newest messages"
### t5 | Daylight asks its clock every time
_fc = _FixedClock(12 * 60)
_d = Daylight(_fc)
assert _d.is_dark() is False, "At noon it is light"
_fc.minute = 23 * 60
assert _d.is_dark() is True, "Daylight must ask the clock each time, not remember the time it was built with"
_fc.minute = 390
assert _d.is_dark() is False, "At sunrise (06:30) it is light"
assert Daylight(_FixedClock(500), sunrise=600, sunset=900).is_dark() is True, "Custom sunrise and sunset should reach is_dark_at"
_sim = SimClock(10)
_d2 = Daylight(_sim)
assert _d2.is_dark() is True
_sim.set(900)
assert _d2.is_dark() is False, "Daylight should follow a SimClock as it is set"
### t6 | DoorWatch is testable with fakes
class _Recorder:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
_b = EventBus()
_rec = _Recorder()
_clk = _FixedClock(23 * 60)
_w = DoorWatch(_b, Daylight(_clk), _rec)
_b.emit("door", {"open": True})
assert len(_rec.sent) == 1 and _rec.sent[0][0] == "Front door opened", f"An opening after dark should send one 'Front door opened' message, got {_rec.sent}"
_b.emit("door", {"open": False})
_b.emit("door", {})
_b.emit("motion", {"room": "hall"})
assert len(_rec.sent) == 1, "Closing the door, missing payloads and other events must not notify"
_clk.minute = 12 * 60
_b.emit("door", {"open": True})
assert len(_rec.sent) == 1, "In daylight an opening is not worth a message"
_clk.minute = 3 * 60
_b.emit("door", {"open": True})
assert len(_rec.sent) == 2, "At 03:00 it is dark again, so a message is expected"
_w.close()
_b.emit("door", {"open": True})
assert len(_rec.sent) == 2 and _b.listener_count("door") == 0, "close() should unsubscribe the watcher"
### t7 | The hub's clock follows time events
import json as _json
world_event("time", {"minute": 23 * 60 + 15})
assert clock.now() == 1395, "Subscribe to 'time' events and call clock.set(event.payload['minute'])"
assert daylight.is_dark() is True, "At 23:15 the hub's daylight should say dark"
_n = len(notifications())
world_event("door", {"open": True})
_msgs = notifications()
assert len(_msgs) == _n + 1 and _msgs[-1]["title"] == "Front door opened" and _msgs[-1]["at"] == "23:15", f"Opening the door at 23:15 should message the phone with the time, got {_msgs[-1:]}"
_json.dumps(_msgs)
world_event("time", {"minute": 12 * 60})
world_event("door", {"open": True})
assert len(notifications()) == _n + 1, "At noon the hub must stay quiet"
_before = len(bus_errors())
world_event("time", {})
assert clock.now() == 720 and len(bus_errors()) == _before + 1, "A time event without a minute should be a dead letter and leave the clock alone"
