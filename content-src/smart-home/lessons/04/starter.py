# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: capabilities as Protocols, and the last three devices.
from typing import Protocol, runtime_checkable


@runtime_checkable
class Switchable(Protocol):
    ...  # turn_on(self) -> None and turn_off(self) -> None, bodies are just "..."


@runtime_checkable
class Sensor(Protocol):
    ...  # read(self) -> float


class Speaker(Device):
    ...
    # playing (False) and volume (30); turn_on, turn_off, set_volume (0-100, ValueError otherwise)
    # state() -> {"playing": bool, "volume": int}
    # execute: "on", "off", "volume" (value = level); anything else raises UnsupportedAction


class MotionSensor(Device):
    ...
    # detected (False); trigger(); clear(); read() -> 1.0 while detected, else 0.0
    # state() -> {"detected": bool}
    # execute: "trigger" and "clear"; anything else raises UnsupportedAction


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


# register Kind.SPEAKER, Kind.MOTION and Kind.BLINDS in FACTORIES, then rebuild devices


def power_down(things):
    ...  # call turn_off() on everything Switchable (skip the rest); return how many were switched off


def active_sensors(sensors):
    ...  # the sensors whose read() is above zero, in the order given
