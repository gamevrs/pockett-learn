### Everything at once

Automations like "when there is motion in a room and it is dark, turn that room's light on" sound simple, yet writing them as a pile of `if` statements inside handlers makes them rigid and opaque: you cannot list the rules, explain why one fired, or add one without editing code. This lesson builds a tiny **rule engine** out of everything you have learned, so each rule becomes data built from small functions.

A rule has four parts:

- **on**: the event name that wakes it up (`motion`, `time`, `door`...)
- **when**: zero or more *conditions*, each a function `Context -> bool`
- **then**: an *effect*, a function `Context -> None` that does something
- **name**: for humans and for the dashboard

~~~python
Rule(
    "Welcome light",
    on="motion",
    when=(after_dark(),),
    then=light_on(60),
)
~~~

### Where each idea shows up

- **Functions as values**: conditions and effects are plain callables stored in a dataclass.
- **Closures and factories**: `after_dark()`, `between(start, end)`, `light_on(level)` and `notify(title)` return configured functions, exactly like `dim_lights(level)`.
- **Decorators with arguments**: `@condition("it is dark")` attaches a human description to a function without wrapping it. The description is how the dashboard explains *why*.
- **Dataclasses**: `Rule` and the `Context` handed to every condition and effect are frozen records.
- **Dependency injection**: conditions never call a real clock. They ask the `Context`, which carries the injected `Daylight`, clock, devices and notifier. A test passes fakes and gets exact answers.
- **Observer**: the engine subscribes to `"*"` on the bus; rules run in response to events.
- **Interfaces**: `Clock` and `Notifier` stay protocols; the engine neither knows nor cares what they are.

### Explaining decisions

A rule engine you cannot interrogate is a black box. So `evaluate()` returns *both* the verdict and a reason:

~~~python
# fired: all conditions held
(True,  "motion event and it is dark")
# skipped: this one failed
(False, "needs: it is dark")
~~~

Stopping at the first failing condition makes the reason precise. The dashboard shows the latest reason for every rule, so "why didn't the light come on?" has a one-glance answer.

### Rules for rule engines

- **Ignore your own announcements.** When a rule fires, the engine publishes `rule.fired` so it shows up in the event log. Because the engine listens to *every* event, it must skip events named `rule.`, or it would react to its own announcement forever.
- **Make conditions idempotent.** A "goodnight" rule that runs on every `time` event after 23:00 must check that something is actually still on or unlocked. Otherwise it fires again and again. Compare *state*, not just the clock.
- **Isolate rules from each other.** One rule whose effect raises must not stop the rest. Catch it, record it as `failed`, continue.
- **Order is a decision.** Rules run in the order they were added. If two rules fight (one turns a light on, another off), the later one wins; avoid overlap by giving each rule a narrow job.
- **Wake-up thresholds are fuzzy.** The clock reports time in steps. "At 23:00" really means "at or after 23:00 and still not done", which is another reason for idempotent conditions.

### A custom condition

Writing your own takes four lines with the decorator:

~~~python
@condition("something is still on or unlocked")
def house_awake(ctx):
    return any(
        d.state().get("on") or d.state().get("playing") or d.state().get("locked") is False
        for d in ctx.devices.values()
    )
~~~

### Common mistakes

- Evaluating conditions that need data the event does not carry. Check `payload.get(...)` instead of indexing.
- A condition that changes state. Conditions should only look.
- Forgetting to add the new rule to the engine, and then wondering why nothing fires.
- Rules that emit events they themselves listen to.
