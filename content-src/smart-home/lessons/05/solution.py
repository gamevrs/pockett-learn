from collections.abc import Callable

Predicate = Callable[[Device], bool]
Action = Callable[[Device], None]
Routine = Callable[[dict[str, Device]], None]


def select(items: Iterable[Any], where: Callable[[Any], bool]) -> list[Any]:
    return [item for item in items if where(item)]


def apply_to(items: Iterable[Any], action: Callable[[Any], object]) -> int:
    count = 0
    for item in items:
        action(item)
        count += 1
    return count


def by_kind(kind: Kind) -> Predicate:
    def matches(device: Device) -> bool:
        return device.spec.kind is kind

    return matches


def lights_off(devs: dict[str, Device]) -> None:
    apply_to(select(devs.values(), by_kind(Kind.LIGHT)), lambda light: light.execute("off"))


def lock_up(devs: dict[str, Device]) -> None:
    apply_to(select(devs.values(), by_kind(Kind.LOCK)), lambda lock: lock.execute("lock"))


def everything_off(devs: dict[str, Device]) -> None:
    power_down(devs.values())


def goodnight(devs: dict[str, Device]) -> None:
    everything_off(devs)
    lock_up(devs)


ROUTINES: dict[str, Routine] = {
    "lights_off": lights_off,
    "lock_up": lock_up,
    "everything_off": everything_off,
    "goodnight": goodnight,
}


def run_routine(name: str) -> dict[str, Any]:
    routine = ROUTINES.get(name)
    if routine is None:
        return {"ok": False, "error": f"no routine called {name!r}"}
    routine(devices)
    return {"ok": True, "routine": name}


def routine_names() -> list[str]:
    return list(ROUTINES)
