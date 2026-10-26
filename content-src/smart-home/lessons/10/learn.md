### Two ways an event bus goes wrong

**1. A handler crashes.** With the bus from lesson 9, if the second of three handlers raises, the exception escapes `emit()`: the third handler never hears the event, and the code that merely *published* it now has to deal with someone else's bug. (This is also how C# multicast delegates and plain Java listener loops behave.) A bus should be a good host: one rude guest must not end the party.

**2. A handler never dies.** The bus keeps a reference to every handler. If the handler is a bound method such as `panel.on_event`, that reference keeps `panel` alive, even if everything else in the program let go of it. The object is gone as far as you are concerned, yet it still receives events and still uses memory. This is the **lapsed listener** leak, a classic cause of slowly growing programs.

### Isolating failures

Catch the exception where the handler is called, record it, and carry on. Because lesson 9 funnelled every call through one method, `_deliver`, you can change this behaviour in a subclass without touching the rest:

~~~python
class ResilientBus(EventBus):
    def __init__(self, history_size=200):
        super().__init__(history_size)
        # a "dead letter" box
        self.errors = deque(maxlen=50)

    def _deliver(self, subscription, event):
        try:
            subscription.handler(event)
        except Exception as err:
            # what failed, for whom, and why
            self.errors.append({...})
            # it did not run to completion
            return False
        return True
~~~

Details that matter:

- Catch `Exception`, **not** `BaseException` or a bare `except:`. `KeyboardInterrupt`, `SystemExit` and this platform's own timeout are `BaseException`s; swallowing them would make your program impossible to stop.
- Do not just `print` the failure. Keep it as data (event name, sequence number, handler name, message) so a dashboard can show it. That is called a **dead-letter queue** in messaging systems.
- Keep it bounded (`deque(maxlen=...)`) so a handler that fails a million times cannot eat the memory.
- Errors in *your own* code should still be loud somewhere. The bus isolates failures; it does not hide them.

### Subclassing to change one behaviour

Extending a class by overriding a single method, while `super().__init__` sets up the rest, is a normal use of inheritance. It works here because lesson 9 left a deliberate seam. Designing the seam first is what makes later changes small.

### Weak references

A **weak reference** points at an object *without keeping it alive*. When the last normal reference disappears, the object is freed and the weak reference starts returning `None`.

~~~python
import weakref

class Panel:
    def on_event(self, event): ...

panel = Panel()
ref = weakref.ref(panel)
ref() is panel         # True
del panel
# CPython frees it at once (cycles need gc.collect())
ref()                  # None
~~~

There is one trap. `panel.on_event` builds a *new* bound-method object every time you evaluate it, so `weakref.ref(panel.on_event)` would die at once. `weakref.WeakMethod` was made for this: it holds weak references to the instance and the function and rebuilds the method on demand.

A weak subscription is then a small forwarding closure: look the target up each time; if it is gone, unsubscribe yourself.

~~~python
def subscribe_weak(self, name, method):
    reference = weakref.WeakMethod(method)
    def forward(event):
        target = reference()
        if target is None:
            # owner is gone: tidy up
            unsubscribe()
        else:
            target(event)
    unsubscribe = self.subscribe(name, forward)
    return unsubscribe
~~~

### Weak or explicit?

Explicit `unsubscribe()` (or a `close()` method that calls it) is predictable and should be your default: you decide exactly when the link ends. Weak subscriptions are a safety net for listeners whose lifetime you cannot control. They are not magic: a weakly subscribed **lambda** that nothing else references is freed immediately and never fires.

### Common mistakes

- `except Exception: pass`: errors vanish. Record them.
- `weakref.ref(obj.method)` instead of `WeakMethod`.
- Relying on garbage collection timing in tests without `gc.collect()`.
- Subscribing in `__init__` and never unsubscribing in a `close()`.
