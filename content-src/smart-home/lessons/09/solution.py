from dataclasses import dataclass, field

Payload = dict[str, Any]


@dataclass(frozen=True)
class Event:
    name: str
    payload: Payload = field(default_factory=dict)
    seq: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {"seq": self.seq, "name": self.name, "payload": dict(self.payload)}


Handler = Callable[[Event], None]


class _Subscription:
    """Given: one registration. active goes False when it is cancelled."""

    __slots__ = ("handler", "active")

    def __init__(self, handler: Handler) -> None:
        self.handler = handler
        self.active = True


class EventBus:
    def __init__(self, history_size: int = 200) -> None:
        self._subscriptions: dict[str, list[_Subscription]] = {}
        self._next_seq = 1
        self.history: deque[Event] = deque(maxlen=history_size)

    def subscribe(self, name: str, handler: Handler) -> Callable[[], None]:
        subscription = _Subscription(handler)
        self._subscriptions.setdefault(name, []).append(subscription)

        def unsubscribe() -> None:
            subscription.active = False
            listeners = self._subscriptions.get(name, [])
            if subscription in listeners:
                listeners.remove(subscription)

        return unsubscribe

    def listener_count(self, name: str) -> int:
        return len(self._subscriptions.get(name, []))

    def emit(self, name: str, payload: Payload | None = None) -> int:
        event = Event(name, dict(payload or {}), self._next_seq)
        self._next_seq += 1
        self.history.append(event)
        listeners = list(self._subscriptions.get(name, []))
        if name != "*":
            listeners += self._subscriptions.get("*", [])
        delivered = 0
        for subscription in listeners:
            if subscription.active and self._deliver(subscription, event):
                delivered += 1
        return delivered

    def _deliver(self, subscription: _Subscription, event: Event) -> bool:
        """Given: the one place a handler is called. Returns True when it ran."""
        subscription.handler(event)
        return True


bus = EventBus()


def world_event(name: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"ok": True, "delivered": bus.emit(name, payload)}


def event_log(limit: int = 40) -> list[dict[str, Any]]:
    return [event.to_dict() for event in list(bus.history)[-limit:]]


def lights_follow(event: Event) -> None:
    # deliberately strict: a payload without a known room raises KeyError (lesson 10 deals with that)
    devices[f"{event.payload['room']}_light"].execute("on")


def connect_lights(target: EventBus) -> Callable[[], None]:
    return target.subscribe("motion", lights_follow)


stop_following = connect_lights(bus)
