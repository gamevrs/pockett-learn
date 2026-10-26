MotionCallback = Callable[[str], None]

motion_callbacks: dict[str, list[MotionCallback]] = {}
visit_counts = {room.value: 0 for room in Room}


def on_motion(room: str, callback: MotionCallback) -> None:
    motion_callbacks.setdefault(room, []).append(callback)


def motion_detected(room: str) -> dict[str, Any]:
    sensor = devices.get(f"{room}_motion")
    if sensor is None:
        return {"ok": False, "error": f"no motion sensor in {room!r}"}
    sensor.execute("trigger")
    callbacks = motion_callbacks.get(room, [])
    for callback in callbacks:
        callback(room)
    return {"ok": True, "room": room, "callbacks": len(callbacks)}


def count_visit(room: str) -> None:
    visit_counts[room] = visit_counts.get(room, 0) + 1


for room in Room:
    on_motion(room.value, count_visit)
    on_motion(room.value, lambda name: devices[f"{name}_light"].execute("on"))


def busiest_rooms() -> list[dict[str, Any]]:
    ranked = sorted(visit_counts, key=lambda name: (-visit_counts[name], name))
    return [{"room": name, "visits": visit_counts[name]} for name in ranked]
