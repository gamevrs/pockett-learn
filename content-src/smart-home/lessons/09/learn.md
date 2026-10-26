### From callbacks to an event bus

Last chapter ended with a list of weaknesses: callbacks cannot be removed, there is one registry per kind of event, and one failure ruins the rest. The **observer pattern** fixes that by putting a small object in the middle. Publishers announce *what happened*; subscribers say *what they care about*; neither knows the other exists.

~~~python
# "tell me when motion happens"
bus.subscribe("motion", lights_follow)
# "motion happened in the kitchen"
bus.emit("motion", {"room": "kitchen"})
~~~

The motion sensor does not know the light exists. You can add a logger, a heating rule or a mobile alert tomorrow without touching the sensor. This is the same idea as C# events (`sensor.Motion += handler`, or `IObservable<T>`), Java's listeners and `Flow.Subscriber`, and JavaScript's `emitter.on(...)` / `emitter.emit(...)`. Python's standard library has no general-purpose one, so you are going to write it. It is under fifty lines.

### Events are data

An event is *what happened*, not a command. Model it as a small immutable record: a name, a payload and a sequence number the bus assigns.

~~~python
@dataclass(frozen=True)
class Event:
    name: str
    # fresh dict per event
    payload: dict = field(default_factory=dict)
    seq: int = 0
~~~

Keep payloads JSON-friendly (strings, numbers, booleans, lists, dicts). Then they can be logged, shown on a dashboard, or sent over a network without conversion.

### The bus

Three operations matter:

- `subscribe(name, handler)` registers a handler and returns an **unsubscribe function**. A function that removes *this* registration is more reliable than `off(handler)`, because the same lambda or function can be registered twice, and an anonymous lambda cannot be found again to remove it.
- `emit(name, payload)` creates the event, records it in a bounded `history` (so a log can show it), calls every handler and returns how many were called.
- `"*"` is a wildcard name: handlers subscribed to `"*"` receive every event. Useful for logs and rule engines.

### Delivery rules (decide them on purpose)

Every bus must answer these questions. Writing the answers down is what separates a bus from a pile of callbacks.

- **Order**: handlers for an event run in subscription order; wildcard handlers run after the named ones.
- **Synchronous**: `emit` returns after all handlers ran. A handler that emits another event runs that event's handlers right away (depth-first), but sequence numbers still show which came first.
- **Changes during delivery**: handlers may subscribe or unsubscribe while an event is being delivered. Iterating over the live list while it changes is a classic bug. Take a **copy** of the listeners at the start. Then: a handler added during delivery does *not* see the current event, and one removed during delivery is *skipped* (check an `active` flag before calling).
- **Isolation of data**: copy the payload dictionary so a publisher that mutates its dict afterwards cannot rewrite history.
- **Failing handlers**: for now an exception inside a handler escapes `emit` and the remaining handlers never run. The `lights_follow` handler below is deliberately strict (a bad room raises `KeyError`) so you can watch that happen. Lesson 10 makes the bus survive it.

### One kind of event, many kinds of listener

~~~python
# keep the return value
stop = bus.subscribe("door", on_door)
...
# later: no more door events for on_door
stop()
# calling twice is harmless
stop()
~~~

The returned `stop` is a closure over the subscription, exactly like the counters from lesson 7.

### Common mistakes

- Modifying the handler list while looping over it, so a handler gets skipped or called twice.
- Handlers that emit the event they listen to: an endless loop. Guard against it by design (different event names), not by hope.
- Forgetting that handlers run on the publisher's turn: a slow handler slows every `emit`.
- Putting objects that are not plain data in payloads.
- Assuming order across *different* events. Only the order of one `emit` call is guaranteed.
