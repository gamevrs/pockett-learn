### The problem with reaching out

Imagine a door alarm that should only notify you after dark. The quick version looks inside itself for everything it needs:

~~~python
class DoorAlarm:
    def on_door(self, event):
        # hidden dependency on the real clock
        hour = datetime.now().hour
        if event.payload["open"] and hour >= 18:
            # hidden dependency on the real phone
            send_push_notification("Door opened")
~~~

How do you test it? You would have to run the test after 18:00, and your test would send a real push notification. Two hidden dependencies make the class impossible to check on its own. They also make it impossible to *reuse* with a different clock or a different way of alerting.

### Dependency injection: pass collaborators in

**Dependency injection** (DI) is simply this: a class receives the things it depends on from outside instead of creating or looking them up itself.

~~~python
class DoorWatch:
    def __init__(self, bus, daylight, notifier):
        # "something that can tell me if it is dark"
        self._daylight = daylight
        # "something that can send a message"
        self._notifier = notifier
        ...
~~~

Now `DoorWatch` has no idea whether the clock is real, simulated or frozen at 02:00, and no idea whether the notifier pushes to a phone or writes to a list. It only knows the **shape** it needs, and a `Protocol` is the perfect way to write that shape down:

~~~python
class Clock(Protocol):
    # minutes since midnight
    def now(self) -> int: ...

class Notifier(Protocol):
    def send(self, title: str, body: str = "") -> None: ...
~~~

This is the same idea as constructor injection with `IClock` / `TimeProvider` in .NET, or Spring and Guice in Java. Python needs no framework for it: an argument is an injection.

### Fakes make tests tiny and exact

Anything with the right shape can be injected, so tests use deliberately dumb stand-ins called **test doubles**:

~~~python
class FixedClock:
    def __init__(self, minute): self.minute = minute
    def now(self): return self.minute

class RecordingNotifier:
    def __init__(self): self.sent = []
    def send(self, title, body=""): self.sent.append(title)
~~~

A test builds `DoorWatch(bus, Daylight(FixedClock(23 * 60)), RecordingNotifier())`, emits a door event, and checks `sent`. No waiting, no patching, no real phone, and the answer is identical on every run and every machine.

### Where do the real objects get built?

Somewhere must decide which clock and which notifier the actual house uses. Do that in **one place**, usually the bottom of the program or `main()`, called the *composition root*:

~~~python
clock = SimClock()
phone = PhoneNotifier(clock)
door_watch = DoorWatch(bus, Daylight(clock), phone)
~~~

Everything above it receives what it needs; only the root knows the concrete classes.

### Tips and traps

- **Inject the abstraction, create the detail at the edge.** Classes ask for a `Clock`; the root decides it is a `SimClock`.
- A `Daylight` object that holds the *clock* (and asks it each time) stays correct as time moves. One that stored the current minute at construction would go stale: inject the thing that changes, not a snapshot.
- Do not give a parameter a default that is evaluated once, such as `def f(now=time.time())`. The default is computed when the function is *defined*, not on each call.
- A constructor that needs six dependencies is telling you the class does too much.
- Avoid hidden globals (`from app import clock`) inside methods. They look convenient and quietly bring the testing problem back.

### Common mistakes

- Injecting a concrete class instead of a Protocol, so fakes need inheritance.
- Faking the code under test instead of its collaborators.
- Forgetting that two objects built from the same fake share its state.
- Letting the "real" implementation be the default argument everywhere. A required parameter is clearer.
