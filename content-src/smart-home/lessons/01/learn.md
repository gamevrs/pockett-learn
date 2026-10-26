### Model the house before you teach it to behave

Every smart home starts as a list: *what is in this house, and where?* Before any behaviour, we want that list to be **precise**: no typos like `"livingroom"` vs `"living_room"`, no half-filled records. Python gives you two tools for that.

### Enums: a closed set of named choices

An `Enum` is a class whose members are the only legal values.

~~~python
from enum import Enum

class Mode(Enum):
    HEAT = "heat"
    COOL = "cool"

Mode.HEAT              # <Mode.HEAT: 'heat'>
Mode.HEAT.value        # 'heat' (what you store or send)
Mode.HEAT.name         # 'HEAT'
Mode("cool")           # Mode.COOL (look up by value)
list(Mode)             # [Mode.HEAT, Mode.COOL]
Mode("warm")           # ValueError: not a valid Mode
~~~

A misspelt `Mode.HAET` fails immediately with an `AttributeError`; a misspelt string `"haet"` silently flows through your program until something odd happens. Compare members with `is` (`mode is Mode.HEAT`). Note that `Mode.HEAT == "heat"` is `False`: a member is not its value.

### Dataclasses: records without the boilerplate

A `@dataclass` writes `__init__`, `__repr__` and `__eq__` for you from the annotated fields.

~~~python
from dataclasses import dataclass, field

@dataclass(frozen=True)
class Point:
    x: float
    y: float
    # a default: fields with defaults come last
    label: str = ""

p = Point(1.5, 2.0)
p == Point(1.5, 2.0)   # True: compared field by field
p.x = 9                # FrozenInstanceError
{p: "start"}           # works: frozen means hashable
~~~

Use `frozen=True` for **facts** that should never change (a device's id and room). Use a plain `@dataclass` for things that evolve. For a mutable default you must use a factory, because one shared default object would leak between instances:

~~~python
@dataclass
class Playlist:
    name: str
    # a fresh list per instance
    tracks: list[str] = field(default_factory=list)
    # tracks: list[str] = []   <- ValueError: mutable default is not allowed
~~~

### Type hints say what you meant

`id: str`, `list[DeviceSpec]`, `-> dict[str, str]` are **hints**. Python does not enforce them at runtime, but your editor, your teammates and the next lesson's code all read them. Write them on every public function.

### Properties: computed, read-only attributes

`@property` lets a method be read like a field, so `spec.title` has no parentheses and cannot be assigned to by accident.

~~~python
@dataclass(frozen=True)
class Point:
    x: float
    y: float

    @property
    def distance(self) -> float:
        return (self.x ** 2 + self.y ** 2) ** 0.5
~~~

### The JSON boundary

The live house on the right receives data from your code as **JSON**: strings, numbers, booleans, lists and dicts. Enum members and dataclass instances are none of those, so a function that serves the scene must convert: `spec.kind.value`, not `spec.kind`. Python's `dataclasses.asdict` is *not* enough, because it leaves the enum members in place.

### Common mistakes

- Comparing a member to its value: `Room.HALL == "hall"` is `False`. Use `Room.HALL.value == "hall"` or `Room("hall") is Room.HALL`.
- A field without a default after one with a default: `TypeError: non-default argument follows default argument`.
- Putting an Enum member in a `dict` that you hand to JSON: it won't serialise. Convert with `.value`.
- Forgetting that `frozen=True` only freezes the *attributes*: a list stored inside is still mutable.

### The road ahead

This course has four chapters. **Blueprint** (this one) models the house and gives every device a contract. **Delegates** treats functions as values: callbacks, closures, decorators. **Observer** builds an event bus. **The brain** injects dependencies, streams events lazily and composes automations. Each lesson switches on a new part of the house.
