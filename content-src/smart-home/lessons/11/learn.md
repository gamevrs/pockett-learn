### Wiring is its own job

So far the scene has poked devices directly: "trigger this sensor", "give the thermostat a reading", "bump the visit counter". That works, but the knowledge of *who needs to hear what* is smeared across the scene and your hooks. The bus lets you gather it in one place: a **wiring** function that connects each device to the events it cares about.

~~~python
def wire_home(target, devs):
    def on_motion(event): ...
    def on_temperature(event): ...
    return [
        target.subscribe("motion", on_motion),
        target.subscribe("temperature", on_temperature),
    ]
~~~

Notice what the function takes as parameters: the bus and the devices it should wire. It does not reach for the global `bus`. Passing them in makes it trivial to test with a fresh bus and fresh devices, and you will use that idea deliberately in lesson 12.

### Events and who owns them

Events fall into two families:

- **Facts from the outside world**: `motion`, `motion_clear`, `door`, `temperature`, `time`. The scene reports them; nobody asked for them.
- **Facts that your devices announce**: when the thermostat switches the heating on or off, it publishes `heating` with `{"on": true}`. Other parts of the house can react without the thermostat knowing they exist.

Name events for what *happened* (`motion`, `heating`), not for what you want done (`turn_on_light`). A fact can have many consequences; a command only has one.

### Fail fast inside, isolate at the edge

`on_temperature` reads `event.payload["value"]`. If a buggy sender forgets the value, that line raises `KeyError`. You could litter every handler with defensive checks, or you can let the handler fail and rely on the bus to catch it and file it in the dead-letter box (lesson 10). The second style keeps the handlers short and puts error handling in exactly one place. Defend where bad data *enters the system*; trust it afterwards.

### Setup and teardown come in pairs

Every `subscribe` returns an unsubscribe function. `wire_home` returns the whole list so the caller can undo the wiring:

~~~python
handles = wire_home(bus, devices)
...
for stop in handles:
    stop()
~~~

If you create connections, you own their cleanup. That one habit prevents most listener leaks.

### Changing behaviour by changing wiring

Look at what just happened to your architecture. The thermostat class did not change. Neither did the bus. Behaviour changed because the *connections* did. This is the real payoff of the observer pattern: you can add, remove or reorder reactions without editing the things that produce events.

### Common mistakes

- Wiring the same device twice (once through the old callback registry, once through the bus), so everything happens double. Keep one path.
- Handlers that capture the wrong bus or the wrong devices dictionary. Passing them as parameters avoids hidden globals.
- Publishing `heating` on every reading instead of only when it *changes*, which floods the log. Compare before and after.
- Emitting from inside a handler an event that the same handler subscribes to: an infinite loop.
