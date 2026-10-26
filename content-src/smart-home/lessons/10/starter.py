# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 10: a bus that survives failing handlers and forgotten listeners.
import inspect
import weakref


class ResilientBus(EventBus):
    def __init__(self, history_size=200):
        ...  # call the parent __init__, then create errors: a deque holding the last 50 failures

    def _deliver(self, subscription, event):
        ...
        # call the handler inside try/except Exception.
        # on failure append {"event": event name, "seq": ..., "handler": the handler's __qualname__
        # (or repr), "error": "ErrorType: message"} to self.errors and return False. Otherwise True.

    def subscribe_weak(self, name, method):
        ...
        # like subscribe, but hold only a weak reference to the target:
        # WeakMethod for bound methods (inspect.ismethod), weakref.ref for plain functions.
        # A forwarding closure calls the target, or unsubscribes itself once the target is gone.
        # Return the unsubscribe function.


# Swap the hub over to the new bus: assign bus = ResilientBus() and reconnect the lights with
# stop_following = connect_lights(bus), because subscriptions do not carry over.
# Then add the hook the scene reads to show failures.


def bus_errors():
    ...  # the recorded failures as a list, oldest first
