# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: dependency injection.
SUNRISE = 6 * 60 + 30  # minutes after midnight
SUNSET = 18 * 60


def hhmm(minute):
    ...  # 75 -> "01:15", 0 -> "00:00", 1439 -> "23:59" (wrap past midnight with % 24)


def is_dark_at(minute, sunrise=SUNRISE, sunset=SUNSET):
    ...  # dark before sunrise and from sunset on


@runtime_checkable
class Clock(Protocol):
    ...  # now(self) -> int: minutes since midnight


class SimClock:
    ...  # starts at noon (12 * 60); now() reports it; set(minute) validates with _number, keeps it in 0-1439


@runtime_checkable
class Notifier(Protocol):
    ...  # send(self, title: str, body: str = "") -> None


class PhoneNotifier:
    ...  # __init__(clock, keep=30): outbox is a deque; send records {"at": hhmm(now), "title", "body"}


class Daylight:
    ...  # __init__(clock, sunrise=SUNRISE, sunset=SUNSET); is_dark() asks the clock EVERY time


class DoorWatch:
    ...
    # __init__(target_bus, daylight, notifier): subscribe to "door"
    # when payload["open"] is true and it is dark: notifier.send("Front door opened", "...")
    # close() unsubscribes


# The composition root: build the real pieces for the hub and keep them in these names
# clock, phone, daylight, door_watch   (the clock must follow "time" events: payload["minute"])


def notifications():
    ...  # the phone's outbox as a list, oldest first
