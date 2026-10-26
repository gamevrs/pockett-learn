# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: functions as values.
from collections.abc import Callable

Predicate = Callable[[Device], bool]          # like Func<Device, bool>
Action = Callable[[Device], None]             # like Action<Device>
Routine = Callable[[dict[str, Device]], None]  # takes the whole devices dict


def select(items, where):
    ...  # a list of the items for which where(item) is true


def apply_to(items, action):
    ...  # call action(item) for every item, in order; return how many there were


def by_kind(kind):
    ...  # return a function that answers: is this device of that Kind?


def lights_off(devs):
    ...  # switch every light off, using select, by_kind and apply_to


def lock_up(devs):
    ...  # lock every lock


def everything_off(devs):
    ...  # power_down every device (lesson 4)


def goodnight(devs):
    ...  # everything_off, then lock_up: routines can call routines


ROUTINES = {}  # name -> routine function: "lights_off", "lock_up", "everything_off", "goodnight"


def run_routine(name):
    ...  # {"ok": True, "routine": name} after running it on the devices dict, or {"ok": False, "error": ...}


def routine_names():
    ...  # the names in the table, as a list
