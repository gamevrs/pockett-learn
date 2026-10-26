from collections.abc import Iterator
from itertools import islice


def matching(events: Iterable[Event], *names: str) -> Iterator[Event]:
    for event in events:
        if not names or event.name in names:
            yield event


def newest_first(source: EventBus) -> Iterator[Event]:
    yield from reversed(source.history)


def recent_events(name: str = "", limit: int = 12) -> list[dict[str, Any]]:
    stream = matching(newest_first(bus), name) if name else newest_first(bus)
    picked = list(islice(stream, max(0, int(limit))))
    picked.reverse()
    return [event.to_dict() for event in picked]


def _slots(step: int) -> Iterator[tuple[int, bool]]:
    for minute in range(0, 1440, step):
        yield minute, is_dark_at(minute)


def day_slots(step: int = 30) -> Iterator[tuple[int, bool]]:
    if step < 1:
        raise ValueError(f"step must be at least 1 minute, got {step}")
    return _slots(step)


def daylight_map(step: int = 30) -> list[dict[str, Any]]:
    return [{"minute": minute, "dark": dark} for minute, dark in day_slots(step)]


class EventCursor:
    def __init__(self, source: EventBus) -> None:
        self._source = source
        self._last_seq = 0

    def __iter__(self) -> "EventCursor":
        return self

    def __next__(self) -> Event:
        for event in self._source.history:
            if event.seq > self._last_seq:
                self._last_seq = event.seq
                return event
        raise StopIteration


reader = EventCursor(bus)


def unread() -> list[dict[str, Any]]:
    return [event.to_dict() for event in reader]
