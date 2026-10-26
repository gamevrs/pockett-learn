SUNRISE = 6 * 60 + 30  # minutes after midnight
SUNSET = 18 * 60


def hhmm(minute: int) -> str:
    return f"{minute // 60 % 24:02d}:{minute % 60:02d}"


def is_dark_at(minute: int, sunrise: int = SUNRISE, sunset: int = SUNSET) -> bool:
    return minute < sunrise or minute >= sunset


@runtime_checkable
class Clock(Protocol):
    def now(self) -> int: ...


class SimClock:
    def __init__(self, minute: int = 12 * 60) -> None:
        self.minute = minute % 1440

    def now(self) -> int:
        return self.minute

    def set(self, minute: Any) -> None:
        self.minute = int(_number(minute, "minute")) % 1440


@runtime_checkable
class Notifier(Protocol):
    def send(self, title: str, body: str = "") -> None: ...


class PhoneNotifier:
    def __init__(self, clock: Clock, keep: int = 30) -> None:
        self._clock = clock
        self.outbox: deque[dict[str, str]] = deque(maxlen=keep)

    def send(self, title: str, body: str = "") -> None:
        self.outbox.append({"at": hhmm(self._clock.now()), "title": title, "body": body})


class Daylight:
    def __init__(self, clock: Clock, sunrise: int = SUNRISE, sunset: int = SUNSET) -> None:
        self._clock = clock
        self._sunrise = sunrise
        self._sunset = sunset

    def is_dark(self) -> bool:
        return is_dark_at(self._clock.now(), self._sunrise, self._sunset)


class DoorWatch:
    def __init__(self, target: EventBus, daylight: Daylight, notifier: Notifier) -> None:
        self._daylight = daylight
        self._notifier = notifier
        self._stop = target.subscribe("door", self._on_door)

    def _on_door(self, event: Event) -> None:
        if event.payload.get("open") and self._daylight.is_dark():
            self._notifier.send("Front door opened", "The front door opened after dark.")

    def close(self) -> None:
        self._stop()


clock = SimClock()
phone = PhoneNotifier(clock)
daylight = Daylight(clock)
door_watch = DoorWatch(bus, daylight, phone)
follow_time = bus.subscribe("time", lambda event: clock.set(event.payload["minute"]))


def notifications() -> list[dict[str, str]]:
    return list(phone.outbox)
