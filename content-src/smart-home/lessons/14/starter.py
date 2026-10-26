# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 14: automations. Build rules from everything so far.
stop_following()  # retire the crude "lights always follow you" listener from lesson 9


@dataclass(frozen=True)
class Context:
    """Given: everything a condition or effect may look at."""

    event: Event
    devices: dict[str, Device]
    daylight: Daylight
    clock: Clock
    notifier: Notifier


Condition = Callable[[Context], bool]
Effect = Callable[[Context], None]


def condition(description):
    ...  # a decorator WITH ARGUMENTS: stores description on the function (func.description) and returns the same function


def describe(check):
    ...  # the function's description, or its __name__ when it has none


def after_dark():
    ...  # a described condition: ctx.daylight.is_dark(), described as "it is dark"


def between(start, end):
    ...  # true from start (inclusive) to end (exclusive) on ctx.clock.now(); wraps past midnight (23:00-05:00)
    # description: "the time is between 23:00 and 05:00" (use hhmm)


def device_is(device_id, **expected):
    ...  # true when that device exists and its state() has every expected key=value
    # description: "front_lock has locked=False"


def payload_is(key, value):
    ...  # true when ctx.event.payload.get(key) == value; description: "open is True"


@dataclass(frozen=True)
class Rule:
    name: str
    on: str
    when: tuple
    then: Effect

    def evaluate(self, ctx):
        ...
        # (False, "needs: <description of the first failing condition>") or
        # (True, "<on> event and <description>..."), joined with " and ". No conditions: (True, "<on> event")


def light_on(level=60, room=None):
    ...  # an effect: dim the light of room (default: the event's payload room) to level; ignore unknown rooms


def light_off(room=None):
    ...  # an effect: switch that light off


def run(name):
    ...  # an effect: run the routine or preset with that name on ctx.devices (KeyError if there is none)


def notify(title, body=""):
    ...  # an effect: ctx.notifier.send(title, body)


class RuleEngine:
    ...
    # __init__(target_bus, devs, daylight, clock, notifier): subscribe to "*"
    # rules list, status dict per rule name, log deque (60)
    # add(rule): duplicate names -> ValueError; creates its status
    # on each event (ignoring names that start with "rule."): for each rule whose .on matches,
    # evaluate; run the effect if it fired (a failing effect is recorded, never raised);
    # update status counts and "last" reason, log the decision, and emit "rule.fired" after a fire.


# Add two routines for the engine to use, create the engine and your six rules, and add the hook.
