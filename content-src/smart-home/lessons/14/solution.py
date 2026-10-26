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


def condition(description: str) -> Callable[[Condition], Condition]:
    def mark(func: Condition) -> Condition:
        func.description = description  # type: ignore[attr-defined]
        return func

    return mark


def describe(check: Callable[..., Any]) -> str:
    return getattr(check, "description", getattr(check, "__name__", "condition"))


def after_dark() -> Condition:
    @condition("it is dark")
    def check(ctx: Context) -> bool:
        return ctx.daylight.is_dark()

    return check


def between(start: int, end: int) -> Condition:
    @condition(f"the time is between {hhmm(start)} and {hhmm(end)}")
    def check(ctx: Context) -> bool:
        now = ctx.clock.now()
        if start <= end:
            return start <= now < end
        return now >= start or now < end

    return check


def device_is(device_id: str, **expected: Any) -> Condition:
    wanted = ", ".join(f"{key}={value}" for key, value in expected.items())

    @condition(f"{device_id} has {wanted}")
    def check(ctx: Context) -> bool:
        device = ctx.devices.get(device_id)
        if device is None:
            return False
        state = device.state()
        return all(state.get(key) == value for key, value in expected.items())

    return check


def payload_is(key: str, value: Any) -> Condition:
    @condition(f"{key} is {value}")
    def check(ctx: Context) -> bool:
        return ctx.event.payload.get(key) == value

    return check


@dataclass(frozen=True)
class Rule:
    name: str
    on: str
    when: tuple[Condition, ...]
    then: Effect

    def evaluate(self, ctx: Context) -> tuple[bool, str]:
        for check in self.when:
            if not check(ctx):
                return False, f"needs: {describe(check)}"
        return True, " and ".join([f"{self.on} event", *(describe(check) for check in self.when)])


def light_on(level: int = 60, room: str | None = None) -> Effect:
    def effect(ctx: Context) -> None:
        light = ctx.devices.get(f"{room or ctx.event.payload.get('room')}_light")
        if light is not None:
            light.execute("dim", level)

    return effect


def light_off(room: str | None = None) -> Effect:
    def effect(ctx: Context) -> None:
        light = ctx.devices.get(f"{room or ctx.event.payload.get('room')}_light")
        if light is not None:
            light.execute("off")

    return effect


def run(name: str) -> Effect:
    def effect(ctx: Context) -> None:
        routine = ROUTINES.get(name) or PRESETS.get(name)
        if routine is None:
            raise KeyError(f"no routine or preset called {name!r}")
        routine(ctx.devices)

    return effect


def notify(title: str, body: str = "") -> Effect:
    def effect(ctx: Context) -> None:
        ctx.notifier.send(title, body)

    return effect


class RuleEngine:
    def __init__(self, target: EventBus, devs: dict[str, Device], daylight: Daylight, clock: Clock, notifier: Notifier) -> None:
        self._bus = target
        self._devs = devs
        self._daylight = daylight
        self._clock = clock
        self._notifier = notifier
        self.rules: list[Rule] = []
        self.status: dict[str, dict[str, Any]] = {}
        self.log: deque[dict[str, Any]] = deque(maxlen=60)
        self._stop = target.subscribe("*", self._on_event)

    def add(self, rule: Rule) -> None:
        if rule.name in self.status:
            raise ValueError(f"there is already a rule called {rule.name!r}")
        self.rules.append(rule)
        self.status[rule.name] = {
            "name": rule.name,
            "on": rule.on,
            "fired": 0,
            "skipped": 0,
            "failed": 0,
            "result": "idle",
            "last": f"waiting for a {rule.on} event",
        }

    def _on_event(self, event: Event) -> None:
        if event.name.startswith("rule."):
            return  # never react to our own announcements
        ctx = Context(event, self._devs, self._daylight, self._clock, self._notifier)
        for rule in self.rules:
            if rule.on != event.name:
                continue
            fired, why = rule.evaluate(ctx)
            result = "fired" if fired else "skipped"
            if fired:
                try:
                    rule.then(ctx)
                except Exception as err:
                    result, why = "failed", f"{type(err).__name__}: {err}"
            status = self.status[rule.name]
            status[result] += 1
            status["result"] = result
            status["last"] = why
            self.log.append({"seq": event.seq, "rule": rule.name, "result": result, "why": why, "event": event.name})
            if result == "fired":
                self._bus.emit("rule.fired", {"rule": rule.name, "why": why, "event": event.name, "seq": event.seq})


ROUTINES["bedtime"] = chain(goodnight, blinds_to(0))
ROUTINES["sunrise"] = blinds_to(100)


@condition("something is still on or unlocked")
def house_awake(ctx: Context) -> bool:
    return any(
        d.state().get("on") or d.state().get("playing") or d.state().get("locked") is False
        for d in ctx.devices.values()
    )


engine = RuleEngine(bus, devices, daylight, clock, phone)
engine.add(Rule("Welcome light", on="motion", when=(after_dark(),), then=light_on(60)))
engine.add(Rule("Lights off when empty", on="motion_clear", when=(), then=light_off()))
engine.add(Rule("Welcome home", on="door", when=(payload_is("open", True), after_dark()), then=light_on(70, room="hall")))
engine.add(Rule("Goodnight", on="time", when=(between(23 * 60, 5 * 60), house_awake), then=run("bedtime")))
engine.add(Rule("Sunrise blinds", on="time", when=(between(7 * 60, 10 * 60), device_is("living_blinds", position=0)), then=run("sunrise")))
engine.add(Rule("Heating notice", on="heating", when=(payload_is("on", True),), then=notify("Heating on", "The house fell below its target temperature.")))


def automations() -> dict[str, Any]:
    return {"rules": [dict(status) for status in engine.status.values()], "log": list(engine.log)}
