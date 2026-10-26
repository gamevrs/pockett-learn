# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: generators and iterators.
from collections.abc import Iterator
from itertools import islice


def matching(events, *names):
    ...  # a GENERATOR: yield the events whose name is in names (every event if no names are given)


def newest_first(source):
    ...  # a generator over source.history, newest event first (yield from + reversed)


def recent_events(name="", limit=12):
    ...
    # the newest `limit` events with that name (any name if empty), as dicts, OLDEST first.
    # Stream newest_first through matching and islice, do not copy the whole history.
    # limit below 1 gives []


def day_slots(step=30):
    ...
    # (minute, is_dark) for 0, step, 2*step ... below 1440, produced lazily.
    # step below 1 must raise ValueError immediately when day_slots(...) is CALLED,
    # so validate in this function and return a separate generator.


def daylight_map(step=30):
    ...  # [{"minute": m, "dark": bool}, ...] built from day_slots


class EventCursor:
    ...
    # A resumable iterator over a bus's history: __iter__ returns self, __next__ returns the next event
    # whose seq is above the last one handed out, and raises StopIteration when there are none left.


reader = ...  # an EventCursor on the hub's bus


def unread():
    ...  # the events since the last call, as dicts (just iterate the reader)
