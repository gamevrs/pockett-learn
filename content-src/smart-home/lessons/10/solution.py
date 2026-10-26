import inspect
import weakref


class ResilientBus(EventBus):
    def __init__(self, history_size: int = 200) -> None:
        super().__init__(history_size)
        self.errors: deque[dict[str, Any]] = deque(maxlen=50)

    def _deliver(self, subscription: _Subscription, event: Event) -> bool:
        try:
            subscription.handler(event)
        except Exception as err:
            handler = subscription.handler
            self.errors.append(
                {
                    "event": event.name,
                    "seq": event.seq,
                    "handler": getattr(handler, "__qualname__", repr(handler)),
                    "error": f"{type(err).__name__}: {err}",
                }
            )
            return False
        return True

    def subscribe_weak(self, name: str, method: Handler) -> Callable[[], None]:
        reference = weakref.WeakMethod(method) if inspect.ismethod(method) else weakref.ref(method)
        unsubscribe: Callable[[], None]

        def forward(event: Event) -> None:
            target = reference()
            if target is None:
                unsubscribe()
            else:
                target(event)

        unsubscribe = self.subscribe(name, forward)
        return unsubscribe


bus = ResilientBus()
stop_following = connect_lights(bus)


def bus_errors() -> list[dict[str, Any]]:
    return list(bus.errors)
