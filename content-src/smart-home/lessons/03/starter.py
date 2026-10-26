# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: two more devices, and code that works for all of them.
class DoorLock(Device):
    ...
    # starts locked; state() -> {"locked": bool}
    # execute: "lock" and "unlock", otherwise UnsupportedAction


class Thermostat(Device):
    ...
    # target (default 21.0), current (starts at target), heating (starts False)
    # measure(temperature): store it, then heating = True at or below target - 0.5,
    #                       False at or above target, otherwise unchanged
    # set_target(target): 10-30 only (ValueError otherwise), then re-evaluate with measure(self.current)
    # state() -> {"target": ..., "current": rounded to 1 decimal, "heating": bool}
    # execute: "set_target" and "measure"; anything else raises UnsupportedAction


# register both classes in FACTORIES, then rebuild devices from CATALOG


def broadcast(items, action, value=None):
    ...  # try the action on every device: {"done": [ids that did it], "skipped": [ids that refused]}
