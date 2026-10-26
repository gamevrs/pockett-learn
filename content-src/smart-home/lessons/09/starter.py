# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: the event bus (observer pattern).
from dataclasses import dataclass, field

Payload = dict[str, Any]


@dataclass(frozen=True)
class Event:
    ...
    # name: str, payload: a fresh dict by default (field(default_factory=dict)), seq: int = 0
    # to_dict() -> {"seq": ..., "name": ..., "payload": a copy of the payload}


Handler = Callable[[Event], None]


class _Subscription:
    """Given: one registration. active goes False when it is cancelled."""

    __slots__ = ("handler", "active")

    def __init__(self, handler: Handler) -> None:
        self.handler = handler
        self.active = True


class EventBus:
    def __init__(self, history_size: int = 200) -> None:
        ...  # subscriptions per event name, the next sequence number (starts at 1), and history: a deque with maxlen

    def subscribe(self, name, handler):
        ...  # register; return an unsubscribe() function (cancels this registration, safe to call twice)

    def listener_count(self, name):
        ...  # how many active subscriptions exist for that name

    def emit(self, name, payload=None):
        ...
        # build an Event (copy the payload, next seq), record it in history, then deliver it:
        # a COPY of the listeners for the name, followed by the "*" listeners (unless name is "*"),
        # skipping any whose active flag is False. Return how many were delivered.

    def _deliver(self, subscription: _Subscription, event: Event) -> bool:
        """Given: the one place a handler is called. Returns True when it ran."""
        subscription.handler(event)
        return True


bus = EventBus()


def world_event(name, payload=None):
    ...  # what the scene calls: emit on the bus -> {"ok": True, "delivered": n}


def event_log(limit=40):
    ...  # the newest "limit" events from bus.history as dicts (to_dict), oldest first


def lights_follow(event):
    ...  # switch on the light of the room named in event.payload["room"]. Keep it strict: no checks, a bad room may raise


def connect_lights(target):
    ...  # subscribe lights_follow to "motion" on that bus; return the unsubscribe function


stop_following = connect_lights(bus)
