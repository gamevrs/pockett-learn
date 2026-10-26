### "Don't call us, we'll call you"

A **callback** is a function you hand to someone else so *they* can call it when the moment comes. You have already passed functions to `select` and `apply_to`, which call them immediately. An **event callback** is called later, when something happens: a button is pressed, a download finishes, motion is detected.

The point is to keep the thing that notices separate from the thing that reacts:

~~~python
def on_motion(room, callback):
    motion_callbacks.setdefault(room, []).append(callback)

def motion_detected(room):
    sensor.trigger()
    for callback in motion_callbacks.get(room, []):
        # the sensor has no idea what these do
        callback(room)
~~~

The motion code never mentions lights, counters or speakers. Whoever cares registers a function. In C# this is `sensor.Motion += handler` with an `Action<string>` delegate; in Java it is a listener or a `Consumer<String>`; in JavaScript it is `addEventListener`.

### Lambdas: small anonymous functions

`lambda args: expression` creates a function without naming it. It is the same as C#'s `x => ...` or Java's `x -> ...`, with one big limit: the body is **one expression**, nothing else.

~~~python
# same as: def square(n): return n * n
square = lambda n: n * n
sorted(words, key=lambda w: (len(w), w)) # sort by length, then alphabetically

on_motion("hall", lambda room: print("movement in", room))
~~~

Lambdas shine as tiny adapters passed straight into another call (`key=`, short callbacks). Reach for `def` instead when:

- you need a statement: assignment, `raise`, `try`, a loop, `return` in the middle (a lambda cannot contain any);
- you want a docstring, annotations or a meaningful name in tracebacks (a lambda always shows as `<lambda>`);
- the same logic is needed twice, or you want to test it on its own;
- it has grown past a short line. If you have to squint, name it.

Also remember that a lambda can use a variable from the code around it, which is handy but has a trap that the next lesson explains.

### `sorted` with a key

`key` is a function that turns each item into the value to compare. To rank rooms by visits (most first), then by name for ties, return a tuple. A leading minus flips the order of a number:

~~~python
sorted(counts, key=lambda room: (-counts[room], room))
~~~

### What plain callbacks cannot do (yet)

The registry above works, but look at its weak points. They are exactly why the next chapter introduces the *observer pattern*:

- **No way to remove** a callback once registered.
- **One bad callback breaks the rest**: if the second of three raises, the third never runs and the caller sees the exception.
- **Global state**: the registry is one shared dictionary.
- **One kind of event**: it only knows "motion in a room". Doors, temperature and time would each need their own registry.

Hold on to that list. It is the design brief for lesson 9.

### Common mistakes

- Passing the result instead of the function: `on_motion("hall", turn_on(light))` registers `None`. Pass `turn_on` (or a lambda that calls it).
- A callback that expects different arguments from the ones the caller supplies: the call fails with `TypeError` at the moment of the event, far from where you registered it.
- Writing long lambdas. If it does not fit on one short line, it wants a name.
