# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: closures and function factories.
def dim_lights(level):
    ...  # return a routine (takes devs) that dims every light to level


def blinds_to(position):
    ...  # return a routine that sets every blinds device to position


def chain(*routines):
    ...  # return ONE routine that runs the given routines in order


def make_counter():
    ...  # return a function that returns 1, then 2, then 3 ... (use nonlocal)


def make_toggle(device_id):
    ...  # return a function that flips that light and returns whether it is now on


ROOM_TOGGLES = {}  # room name -> toggle for that room's light, built with make_toggle


PRESETS = {}  # "movie": lights 15 + blinds closed, "reading": lights 70,
#               "morning": lights 40 + blinds open, "night_light": lights 5 + blinds closed
preset_uses = {}  # preset name -> its own counter


def run_preset(name):
    ...  # run the preset on devices -> {"ok": True, "preset": name, "times": n}; unknown -> {"ok": False, ...}


def preset_names():
    ...
