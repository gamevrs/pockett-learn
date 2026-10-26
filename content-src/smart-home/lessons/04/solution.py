from typing import Protocol, runtime_checkable


@runtime_checkable
class Switchable(Protocol):
    def turn_on(self) -> None: ...
    def turn_off(self) -> None: ...


@runtime_checkable
class Sensor(Protocol):
    def read(self) -> float: ...


class Speaker(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.playing = False
        self.volume = 30

    def turn_on(self) -> None:
        self.playing = True

    def turn_off(self) -> None:
        self.playing = False

    def set_volume(self, volume: Any) -> None:
        number = _number(volume, "volume")
        if not 0 <= number <= 100:
            raise ValueError(f"volume must be between 0 and 100, got {volume}")
        self.volume = round(number)

    def state(self) -> dict[str, Any]:
        return {"playing": self.playing, "volume": self.volume}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "on":
            self.turn_on()
        elif action == "off":
            self.turn_off()
        elif action == "volume":
            self.set_volume(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


class MotionSensor(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.detected = False

    def trigger(self) -> None:
        self.detected = True

    def clear(self) -> None:
        self.detected = False

    def read(self) -> float:
        return 1.0 if self.detected else 0.0

    def state(self) -> dict[str, Any]:
        return {"detected": self.detected}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "trigger":
            self.trigger()
        elif action == "clear":
            self.clear()
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


class Blinds(Device):
    """Given: study it, it follows the same pattern. position 0 = closed, 100 = open."""

    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.position = 100

    def set_position(self, position: Any) -> None:
        number = _number(position, "blinds position")
        if not 0 <= number <= 100:
            raise ValueError(f"blinds position must be between 0 and 100, got {position}")
        self.position = round(number)

    def state(self) -> dict[str, Any]:
        return {"position": self.position}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "open":
            self.position = 100
        elif action == "close":
            self.position = 0
        elif action == "position":
            self.set_position(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


FACTORIES.update({Kind.SPEAKER: Speaker, Kind.MOTION: MotionSensor, Kind.BLINDS: Blinds})
devices = build_devices(CATALOG)


def power_down(things: Iterable[object]) -> int:
    switched_off = 0
    for thing in things:
        if isinstance(thing, Switchable):
            thing.turn_off()
            switched_off += 1
    return switched_off


def active_sensors(sensors: Iterable[Sensor]) -> list[Sensor]:
    return [sensor for sensor in sensors if sensor.read() > 0]
