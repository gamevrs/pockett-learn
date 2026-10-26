# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: callbacks and lambdas.
MotionCallback = Callable[[str], None]  # receives the room name

motion_callbacks: dict[str, list[MotionCallback]] = {}
visit_counts = {room.value: 0 for room in Room}


def on_motion(room, callback):
    ...  # remember the callback for that room (several callbacks per room are allowed)


def motion_detected(room):
    ...
    # find the sensor f"{room}_motion" (unknown room -> {"ok": False, "error": ...}),
    # trigger it, then call every callback registered for the room, in order, passing the room.
    # return {"ok": True, "room": room, "callbacks": how many ran}


def count_visit(room):
    ...  # add one to visit_counts[room]


# For every room: register count_visit, and a LAMBDA that switches that room's light on.
# The lambda receives the room name as its argument.


def busiest_rooms():
    ...
    # [{"room": ..., "visits": ...}] most visited first, ties alphabetical.
    # Use sorted() with a lambda key.
