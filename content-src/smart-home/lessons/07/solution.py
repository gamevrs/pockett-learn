def dim_lights(level: int) -> Routine:
    def routine(devs: dict[str, Device]) -> None:
        apply_to(select(devs.values(), by_kind(Kind.LIGHT)), lambda light: light.execute("dim", level))

    return routine


def blinds_to(position: int) -> Routine:
    def routine(devs: dict[str, Device]) -> None:
        apply_to(select(devs.values(), by_kind(Kind.BLINDS)), lambda blinds: blinds.execute("position", position))

    return routine


def chain(*routines: Routine) -> Routine:
    def combined(devs: dict[str, Device]) -> None:
        for routine in routines:
            routine(devs)

    return combined


def make_counter() -> Callable[[], int]:
    count = 0

    def bump() -> int:
        nonlocal count
        count += 1
        return count

    return bump


def make_toggle(device_id: str) -> Callable[[], bool]:
    def toggle() -> bool:
        light = devices[device_id]
        light.execute("off" if light.is_on else "on")
        return light.is_on

    return toggle


ROOM_TOGGLES = {room.value: make_toggle(f"{room.value}_light") for room in Room}

PRESETS: dict[str, Routine] = {
    "movie": chain(dim_lights(15), blinds_to(0)),
    "reading": dim_lights(70),
    "morning": chain(dim_lights(40), blinds_to(100)),
    "night_light": chain(dim_lights(5), blinds_to(0)),
}
preset_uses = {name: make_counter() for name in PRESETS}


def run_preset(name: str) -> dict[str, Any]:
    preset = PRESETS.get(name)
    if preset is None:
        return {"ok": False, "error": f"no preset called {name!r}"}
    preset(devices)
    return {"ok": True, "preset": name, "times": preset_uses[name]()}


def preset_names() -> list[str]:
    return list(PRESETS)
