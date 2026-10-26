# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: the Device contract and the first device, a Light.
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
    ...
    # __init__(self, spec: DeviceSpec) stores self.spec
    # properties id and room come from the spec
    # abstract: state() -> dict, execute(action, value=None)
    # concrete: describe() -> {"id", "kind", "room", **self.state()} using .value for kind and room


class Light(Device):
    ...
    # level 0-100 (starts at 0); is_on property; turn_on() -> 100; turn_off() -> 0
    # set_level(level) validates 0-100 with _number and raises ValueError otherwise
    # state() -> {"on": bool, "level": int}
    # execute: "on", "off", "dim" (value = level); anything else raises UnsupportedAction


FACTORIES = {}  # Kind -> the class that builds it


def build_devices(specs):
    ...  # {spec.id: FACTORIES[spec.kind](spec)} for every spec whose kind has a factory


devices = {}


def snapshot():
    ...  # {device id: device.describe()} for every device


def command(device_id, action, value=None):
    ...  # {"ok": True, "state": ...} or {"ok": False, "error": "..."}; never raises
