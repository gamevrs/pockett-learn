### Functions that remember

When `by_kind(kind)` returned `matches`, something subtle happened: `matches` kept using `kind` long after `by_kind` had finished. A function that carries variables from the scope where it was created is a **closure**.

~~~python
def make_counter():
    # lives in make_counter's scope...
    count = 0
    def bump():
        # ...and bump may rebind it
        nonlocal count
        count += 1
        return count
    return bump

a = make_counter()
b = make_counter()
a(); a()               # 1, 2
b()                    # 1 (b has its own count)
~~~

Each call to `make_counter` creates a fresh `count` and a fresh `bump`, so the two counters never interfere. A closure is private, long-lived state without a class.

### `nonlocal`

Python decides a name is *local* if you assign to it anywhere in the function. Reading an outer variable needs no declaration; **rebinding** one does:

~~~python
def bump():
    # UnboundLocalError: count is treated as local here
    count += 1

def bump():
    # "this name belongs to the enclosing function"
    nonlocal count
    count += 1
~~~

Mutating an outer list or dict (`items.append(x)`, `data[key] = y`) is not rebinding, so it needs no `nonlocal`.

### Function factories

A factory takes configuration and returns a function ready to use. They are how you make families of similar behaviour without copy-paste.

~~~python
def dim_lights(level):
    def routine(devs):
        for light in lights_in(devs):
            # level is captured
            light.execute("dim", level)
    return routine

movie = dim_lights(15)
reading = dim_lights(70)
~~~

`movie` and `reading` are two different functions. This is also how you build a **multicast delegate**: `chain(*routines)` returns one routine that runs a whole list in order, the Python cousin of `+=` on a C# delegate.

### The late-binding trap

A closure captures the **variable**, not the value it had when the closure was created. A `for` loop reuses one variable, so every function made in the loop sees its final value:

~~~python
toggles = []
for room in ["hall", "living", "kitchen"]:
    toggles.append(lambda: print("toggling", room))

toggles[0]()      # toggling kitchen   <- not hall!
~~~

By the time you call them, the loop is over and `room` is `"kitchen"`. (C# and Java avoid part of this: C# gives each `foreach` iteration a fresh variable, and Java only lets you capture variables that never change.) There are three standard fixes:

~~~python
# 1. A factory function: each call gets its own parameter (the best habit)
def make_toggle(room):
    return lambda: print("toggling", room)

# 2. A default argument: evaluated right now, at definition time
toggles.append(lambda room=room: print("toggling", room))

# 3. functools.partial: pre-fills the argument
toggles.append(functools.partial(print, "toggling", room))
~~~

### Common mistakes

- Creating callbacks in a loop and forgetting the trap above. If every button does the same thing, suspect late binding.
- Forgetting `nonlocal` when a closure assigns to a captured variable.
- Using a closure when a class would be clearer. Two or three bits of state with several operations usually want a class; a single counter or a configured function is a perfect closure.
- Capturing a mutable object and then being surprised that all closures share it.
