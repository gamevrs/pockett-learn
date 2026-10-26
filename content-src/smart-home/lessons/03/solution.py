class DoorLock(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.locked = True

    def state(self) -> dict[str, Any]:
        return {"locked": self.locked}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "lock":
            self.locked = True
        elif action == "unlock":
            self.locked = False
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


class Thermostat(Device):
    def __init__(self, spec: DeviceSpec, target: float = 21.0) -> None:
        super().__init__(spec)
        self.target = float(target)
        self.current = self.target
        self.heating = False

    def measure(self, temperature: Any) -> None:
        self.current = _number(temperature, "temperature")
        if self.current <= self.target - 0.5:
            self.heating = True
        elif self.current >= self.target:
            self.heating = False

    def set_target(self, target: Any) -> None:
        number = _number(target, "target")
        if not 10 <= number <= 30:
            raise ValueError(f"target must be between 10 and 30, got {target}")
        self.target = number
        self.measure(self.current)

    def state(self) -> dict[str, Any]:
        return {"target": self.target, "current": round(self.current, 1), "heating": self.heating}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "set_target":
            self.set_target(value)
        elif action == "measure":
            self.measure(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


FACTORIES.update({Kind.LOCK: DoorLock, Kind.THERMOSTAT: Thermostat})
devices = build_devices(CATALOG)


def broadcast(items: Iterable[Device], action: str, value: Any = None) -> dict[str, list[str]]:
    done: list[str] = []
    skipped: list[str] = []
    for device in items:
        try:
            device.execute(action, value)
        except UnsupportedAction:
            skipped.append(device.id)
        else:
            done.append(device.id)
    return {"done": done, "skipped": skipped}
