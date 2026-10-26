### A function is just another value

In Python a function is an object, like a number or a string. You can put it in a variable, a list or a dictionary, pass it to another function, and return it from one. The only thing that *runs* it is the call syntax: parentheses.

~~~python
def shout(text):
    return text.upper() + "!"

# no parentheses: this is the function itself
loud = shout
loud("hi")             # 'HI!' (now we call it)

tools = [str.title, shout, len]
for tool in tools:
    print(tool("hello"))     # Hello / HELLO! / 5
~~~

`shout` and `shout("hi")` are different things: the first is a recipe, the second is the dish.

### This is what "delegates" are

If you know C#, a **delegate** is a typed reference to a method, and `Action<T>` and `Func<T, R>` are the ready-made ones. In Java the same job is done by functional interfaces such as `Runnable`, `Consumer<T>`, `Function<T, R>` and `Predicate<T>`. Python needs none of that machinery: *every callable is already a delegate*. You only describe its type with `Callable[[arguments], return_type]`.

- `Action<Device>` or `Consumer<Device>` becomes `Callable[[Device], None]`
- `Func<Device, bool>` or `Predicate<Device>` becomes `Callable[[Device], bool]`
- `Func<int, string>` or `Function<Integer, String>` becomes `Callable[[int], str]`
- a **bound method** such as `light.turn_on` is a delegate that has captured `light`, like a C# method group conversion
- a **multicast delegate** (`handler += other`) is simply a list of callables that you loop over

A type alias gives such a type a name, like a `delegate` declaration:

~~~python
from collections.abc import Callable

Predicate = Callable[[Device], bool]
Action = Callable[[Device], None]
~~~

### Higher-order functions

A function that takes or returns functions is *higher-order*. You already use them: `sorted(items, key=len)`, `max(items, key=...)`, `map`, `filter`. You can write your own:

~~~python
def select(items, where):
    return [item for item in items if where(item)]

# returns a function
def by_kind(kind):
    def matches(device):
        return device.spec.kind is kind
    return matches

lights = select(devices.values(), by_kind(Kind.LIGHT))
~~~

The inner `matches` remembers `kind` after `by_kind` has returned. That trick is called a closure and gets its own lesson soon; for now just use it.

### Dispatch tables replace if/elif ladders

~~~python
# a ladder: grows, and every new case edits this function
if name == "lights_off": ...
elif name == "lock_up": ...

# a table: new behaviour is just a new entry
ROUTINES = {"lights_off": lights_off, "lock_up": lock_up}
ROUTINES[name](devices)
~~~

The table is data. You can list its keys (the scene will build a button for each), add to it at runtime, or test one entry on its own. Use `.get(name)` and handle `None` so an unknown name gives a clear error rather than a `KeyError`.

### Common mistakes

- Calling instead of passing: `apply_to(lights, turn_off())` runs `turn_off` *now* and passes its result (`None`). Write `apply_to(lights, turn_off)`.
- Storing a call in the table: `{"lock_up": lock_up()}` has the same problem.
- Forgetting the parentheses when you do want to run it: `action` alone does nothing.
- Methods are functions too: `Light.turn_off` is a plain function whose first argument is the light, so `apply_to(lights, Light.turn_off)` works.
