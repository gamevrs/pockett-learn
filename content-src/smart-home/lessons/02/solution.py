from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import Any


class UnsupportedAction(ValueError):
    """Raised when a device is asked to do something it cannot do."""


def _number(value: Any, name: str) -> float:
    """A real number, or ValueError. (bool is rejected: True is not a level.)"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number, got {value!r}")
    return float(value)


class Device(ABC):
    """The contract every device in the house must honour."""

    def __init__(self, spec: DeviceSpec) -> None:
        self.spec = spec

    @property
    def id(self) -> str:
        return self.spec.id

    @property
    def room(self) -> Room:
        return self.spec.room

    @abstractmethod
    def state(self) -> dict[str, Any]:
        """The device's readings as plain, JSON-friendly values."""

    @abstractmethod
    def execute(self, action: str, value: Any = None) -> None:
        """Carry out an action. Raise UnsupportedAction for anything unknown."""

    def describe(self) -> dict[str, Any]:
        """Identity plus state: what the dashboard shows."""
        return {"id": self.id, "kind": self.spec.kind.value, "room": self.room.value, **self.state()}


class Light(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.level = 0

    @property
    def is_on(self) -> bool:
        return self.level > 0

    def turn_on(self) -> None:
        self.level = 100

    def turn_off(self) -> None:
        self.level = 0

    def set_level(self, level: Any) -> None:
        number = _number(level, "light level")
        if not 0 <= number <= 100:
            raise ValueError(f"light level must be between 0 and 100, got {level}")
        self.level = round(number)

    def state(self) -> dict[str, Any]:
        return {"on": self.is_on, "level": self.level}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "on":
            self.turn_on()
        elif action == "off":
            self.turn_off()
        elif action == "dim":
            self.set_level(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


FACTORIES: dict[Kind, type[Device]] = {Kind.LIGHT: Light}


def build_devices(specs: Iterable[DeviceSpec]) -> dict[str, Device]:
    return {spec.id: FACTORIES[spec.kind](spec) for spec in specs if spec.kind in FACTORIES}


devices = build_devices(CATALOG)


def snapshot() -> dict[str, dict[str, Any]]:
    return {device.id: device.describe() for device in devices.values()}


def command(device_id: str, action: str, value: Any = None) -> dict[str, Any]:
    device = devices.get(device_id)
    if device is None:
        return {"ok": False, "error": f"unknown device {device_id!r}"}
    try:
        device.execute(action, value)
    except ValueError as err:  # includes UnsupportedAction
        return {"ok": False, "error": str(err)}
    return {"ok": True, "state": device.describe()}
