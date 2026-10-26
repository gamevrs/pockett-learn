import type { Project } from "@/engine/types";

/**
 * Smart Home Hub: build the brain of a house in Python and watch it run a floor plan.
 *
 * Authoring notes:
 *  - Python goes in String.raw`...` (no backticks, no ${ inside). Prose goes in normal templates.
 *  - The scene (src/scenes/smart-home) reads these names from the learner's program:
 *      vars:   SUNRISE, SUNSET (minutes after midnight)
 *      hooks:  catalog(), snapshot(), command(id, action, value), routine_names(), run_routine(name),
 *              motion_detected(room), busiest_rooms(), preset_names(), run_preset(name), call_log(),
 *              world_event(name, payload), event_log(), bus_errors(), notifications(),
 *              recent_events(name, limit), daylight_map(), automations()
 *  - Every lesson's tests build their own objects, so they never depend on the order they run in.
 */
const py = String.raw;

export const smartHome: Project = {
  slug: "smart-home",
  title: "Smart Home Hub",
  tagline: "Wire up devices with callbacks, interfaces and the observer pattern.",
  pitch:
    "You are the brain of a house. Describe its devices, give them a contract, pass behaviour around as functions, then let a real event bus tie sensors, lights, locks and a thermostat together. By the end, rules like \"motion after sunset turns the hall light on\" run on code you wrote, and an automation panel shows which rule fired and why.",
  emoji: "🏠",
  difficulty: "Advanced",
  hours: 7,
  sceneId: "smart-home",
  prerequisites: ["cargo-control"],
  accent: { from: "#34d399", to: "#0d9488" },
  controls: ["Click a room to walk there","Click a device to inspect it","Drag the clock to change the hour","Slide the outdoor temperature"],
  skills: ["enums & dataclasses","ABCs & Protocols","functions as values","callbacks & lambdas","closures","decorators","observer pattern","dependency injection","generators & iterators","rule engines"],
  features: [
    { "id": "sh-blueprint", "title": "Floor plan", "blurb": "Every device in your catalog appears on the plan.", "emoji": "🗺️" },
    { "id": "sh-lights", "title": "Smart lights", "blurb": "Your Light objects glow in their rooms and obey commands.", "emoji": "💡" },
    { "id": "sh-lock", "title": "Door lock", "blurb": "The front door lock is a real object that locks and unlocks.", "emoji": "🔒" },
    { "id": "sh-climate", "title": "Thermostat", "blurb": "Your thermostat heats the house and decides when to switch on.", "emoji": "🌡️" },
    { "id": "sh-sensors", "title": "Motion sensors", "blurb": "Walk through the house and watch your sensors react.", "emoji": "📡" },
    { "id": "sh-comfort", "title": "Speaker & blinds", "blurb": "Music and blinds join the house, through small interfaces.", "emoji": "🔊" },
    { "id": "sh-routines", "title": "Routines", "blurb": "One tap runs a function from your routine table.", "emoji": "🧰" },
    { "id": "sh-traffic", "title": "Traffic map", "blurb": "Callbacks count visits and light the rooms you use most.", "emoji": "👣" },
    { "id": "sh-scenes", "title": "Scenes", "blurb": "Movie, Reading and Morning: functions built by function factories.", "emoji": "🎬" },
    { "id": "sh-audit", "title": "Audit trail", "blurb": "A decorator records every command the house receives.", "emoji": "📜" },
    { "id": "sh-eventlog", "title": "Event log", "blurb": "Every event on your bus streams into the log.", "emoji": "📻" },
    { "id": "sh-resilience", "title": "Dead letters", "blurb": "Handlers that crash are caught and shown, and the rest carry on.", "emoji": "🛟" },
    { "id": "sh-wiring", "title": "Live wiring", "blurb": "Sensors and thermostat now react to events, not special cases.", "emoji": "🔌" },
    { "id": "sh-phone", "title": "Phone & clock", "blurb": "Injected clock, daylight and notifier: alerts land on the phone.", "emoji": "📱" },
    { "id": "sh-timeline", "title": "Timeline filters", "blurb": "Generators stream filtered history and draw the day and night strip.", "emoji": "⏱️" },
    { "id": "sh-automations", "title": "Automations", "blurb": "Rules fire from events, and the panel shows which fired and why.", "emoji": "⚡" },
  ],
  chapters: [
    {
      id: "blueprint",
      title: "Blueprint",
      blurb: "Model the house with enums and dataclasses, then give every device a contract.",
      lessons: [
        {
          id: "smart-home-1-blueprint",
          title: "Describe the house",
          minutes: 15,
          xp: 90,
          concepts: ["Enum","dataclass","frozen","type hints","properties"],
          learn: `### Model the house before you teach it to behave

Every smart home starts as a list: *what is in this house, and where?* Before any behaviour, we want that list to be **precise**: no typos like \`"livingroom"\` vs \`"living_room"\`, no half-filled records. Python gives you two tools for that.

### Enums: a closed set of named choices

An \`Enum\` is a class whose members are the only legal values.

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

A misspelt \`Mode.HAET\` fails immediately with an \`AttributeError\`; a misspelt string \`"haet"\` silently flows through your program until something odd happens. Compare members with \`is\` (\`mode is Mode.HEAT\`). Note that \`Mode.HEAT == "heat"\` is \`False\`: a member is not its value.

### Dataclasses: records without the boilerplate

A \`@dataclass\` writes \`__init__\`, \`__repr__\` and \`__eq__\` for you from the annotated fields.

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

Use \`frozen=True\` for **facts** that should never change (a device's id and room). Use a plain \`@dataclass\` for things that evolve. For a mutable default you must use a factory, because one shared default object would leak between instances:

~~~python
@dataclass
class Playlist:
    name: str
    # a fresh list per instance
    tracks: list[str] = field(default_factory=list)
    # tracks: list[str] = []   <- ValueError: mutable default is not allowed
~~~

### Type hints say what you meant

\`id: str\`, \`list[DeviceSpec]\`, \`-> dict[str, str]\` are **hints**. Python does not enforce them at runtime, but your editor, your teammates and the next lesson's code all read them. Write them on every public function.

### Properties: computed, read-only attributes

\`@property\` lets a method be read like a field, so \`spec.title\` has no parentheses and cannot be assigned to by accident.

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

The live house on the right receives data from your code as **JSON**: strings, numbers, booleans, lists and dicts. Enum members and dataclass instances are none of those, so a function that serves the scene must convert: \`spec.kind.value\`, not \`spec.kind\`. Python's \`dataclasses.asdict\` is *not* enough, because it leaves the enum members in place.

### Common mistakes

- Comparing a member to its value: \`Room.HALL == "hall"\` is \`False\`. Use \`Room.HALL.value == "hall"\` or \`Room("hall") is Room.HALL\`.
- A field without a default after one with a default: \`TypeError: non-default argument follows default argument\`.
- Putting an Enum member in a \`dict\` that you hand to JSON: it won't serialise. Convert with \`.value\`.
- Forgetting that \`frozen=True\` only freezes the *attributes*: a list stored inside is still mutable.

### The road ahead

This course has four chapters. **Blueprint** (this one) models the house and gives every device a contract. **Delegates** treats functions as values: callbacks, closures, decorators. **Observer** builds an event bus. **The brain** injects dependencies, streams events lazily and composes automations. Each lesson switches on a new part of the house.`,
          mission: `You have been hired to program the brain of a small house: a hall with a front door, a living room, a kitchen and a bedroom. Right now the floor plan on the right is empty blueprint paper.

Describe the house in code: the rooms, the kinds of device, and a **catalog** listing every device with its id, kind and room. The moment you Run, the scene reads your catalog and places each device on the plan.`,
          tasks: [
            "Room and Kind enums with lowercase string values",
            "DeviceSpec: a frozen dataclass (id, kind, room, label defaulting to \"\") with a read-only title property",
            "CATALOG: five hand-written specs plus the lights and motion sensors built by comprehensions",
            "catalog(): the same list as plain JSON-friendly dicts, for the scene",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: describe the house.
from dataclasses import dataclass
from enum import Enum


class Room(Enum):
    ...  # HALL, LIVING, KITCHEN, BEDROOM: each value is the lowercase name, e.g. "hall"


class Kind(Enum):
    ...  # LIGHT, THERMOSTAT, LOCK, MOTION, SPEAKER, BLINDS: lowercase values too


@dataclass(frozen=True)
class DeviceSpec:
    ...  # fields: id: str, kind: Kind, room: Room, label: str = ""
    # then a read-only property called title: the label, or the id made readable


CATALOG = []
# 1. add the five one-off devices (thermostat, front_lock, living_speaker, living_blinds, bedroom_blinds)
# 2. add one light and one motion sensor per room with two comprehensions over Room


def catalog():
    ...  # a list of plain dicts: id, kind, room, title (all strings)
`,
          solutionAdd: py`from dataclasses import dataclass
from enum import Enum


class Room(Enum):
    HALL = "hall"
    LIVING = "living"
    KITCHEN = "kitchen"
    BEDROOM = "bedroom"


class Kind(Enum):
    LIGHT = "light"
    THERMOSTAT = "thermostat"
    LOCK = "lock"
    MOTION = "motion"
    SPEAKER = "speaker"
    BLINDS = "blinds"


@dataclass(frozen=True)
class DeviceSpec:
    id: str
    kind: Kind
    room: Room
    label: str = ""

    @property
    def title(self) -> str:
        return self.label or self.id.replace("_", " ").title()


CATALOG: list[DeviceSpec] = [
    DeviceSpec("thermostat", Kind.THERMOSTAT, Room.LIVING),
    DeviceSpec("front_lock", Kind.LOCK, Room.HALL, label="Front door lock"),
    DeviceSpec("living_speaker", Kind.SPEAKER, Room.LIVING),
    DeviceSpec("living_blinds", Kind.BLINDS, Room.LIVING),
    DeviceSpec("bedroom_blinds", Kind.BLINDS, Room.BEDROOM),
]
CATALOG += [DeviceSpec(f"{room.value}_light", Kind.LIGHT, room) for room in Room]
CATALOG += [DeviceSpec(f"{room.value}_motion", Kind.MOTION, room) for room in Room]


def catalog() -> list[dict[str, str]]:
    return [
        {"id": spec.id, "kind": spec.kind.value, "room": spec.room.value, "title": spec.title}
        for spec in CATALOG
    ]`,
          explanation: `Enums make the set of rooms and device kinds closed, so a typo is an error instead of a silent bug. A frozen dataclass gives every spec equality, hashing and a readable repr for free. The scene only understands JSON, so catalog() converts the enum members with .value on the way out. That conversion step (domain objects inside, plain data at the boundary) comes back in every chapter.`,
          hints: [
            { id: "h1", title: "Enum members", content: `Each member is NAME = "value", for example HALL = "hall" inside class Room(Enum). The test checks the order HALL, LIVING, KITCHEN, BEDROOM.` },
            { id: "h2", title: "The dataclass", content: `Put @dataclass(frozen=True) above the class and list the fields with type hints: id: str, kind: Kind, room: Room, then label: str = "" (the field with a default goes last). For title, add @property and return self.label or self.id.replace("_", " ").title().` },
            { id: "h3", title: "Comprehensions and the hook", content: `CATALOG += [DeviceSpec(f"{room.value}_light", Kind.LIGHT, room) for room in Room] adds the four lights. catalog() is a list comprehension building {"id": spec.id, "kind": spec.kind.value, "room": spec.room.value, "title": spec.title} for each spec.` },
          ],
          tests: [
            {
              id: "t1",
              description: "Room names the four rooms",
              assertionCode: py`assert [r.value for r in Room] == ["hall", "living", "kitchen", "bedroom"], "Room should hold HALL, LIVING, KITCHEN, BEDROOM in that order, each with the lowercase name as its value"
assert Room("kitchen") is Room.KITCHEN, 'Room("kitchen") should find Room.KITCHEN. Give each member its lowercase name as the value'`,
            },
            {
              id: "t2",
              description: "Kind names the six device kinds",
              assertionCode: py`assert {k.value for k in Kind} == {"light", "thermostat", "lock", "motion", "speaker", "blinds"}, "Kind should have LIGHT, THERMOSTAT, LOCK, MOTION, SPEAKER and BLINDS, each with the lowercase name as its value"
assert Kind.LIGHT.name == "LIGHT" and Kind.LIGHT.value == "light", "Kind.LIGHT should have the value 'light'"`,
            },
            {
              id: "t3",
              description: "DeviceSpec is a frozen dataclass with a default label",
              assertionCode: py`import dataclasses as _dc
assert _dc.is_dataclass(DeviceSpec), "Decorate DeviceSpec with @dataclass(frozen=True)"
_spec = DeviceSpec("hall_light", Kind.LIGHT, Room.HALL)
assert _spec.label == "", "label should default to an empty string"
try:
    _spec.label = "changed"
except _dc.FrozenInstanceError:
    pass
else:
    raise AssertionError("A DeviceSpec should be read-only: use @dataclass(frozen=True)")
assert DeviceSpec("a", Kind.LIGHT, Room.HALL) == DeviceSpec("a", Kind.LIGHT, Room.HALL), "Two specs with the same fields should be equal (that is what @dataclass gives you)"
assert len({_spec, DeviceSpec("hall_light", Kind.LIGHT, Room.HALL)}) == 1, "Frozen dataclasses are hashable, so equal specs should collapse in a set"`,
            },
            {
              id: "t4",
              description: "title falls back to a readable name",
              assertionCode: py`assert DeviceSpec("living_room_lamp", Kind.LIGHT, Room.LIVING).title == "Living Room Lamp", "With no label, title should turn the id into words: living_room_lamp -> Living Room Lamp"
assert DeviceSpec("lamp", Kind.LIGHT, Room.LIVING, label="Reading lamp").title == "Reading lamp", "When a label is given, title should return the label unchanged"`,
            },
            {
              id: "t5",
              description: "CATALOG lists all thirteen devices once",
              assertionCode: py`assert len(CATALOG) == 13, f"CATALOG should hold 13 devices (5 one-offs + 4 lights + 4 motion sensors), it has {len(CATALOG)}"
assert all(isinstance(s, DeviceSpec) for s in CATALOG), "Every CATALOG entry should be a DeviceSpec"
assert len({s.id for s in CATALOG}) == 13, "Every device id must be unique"
_by_id = {s.id: s for s in CATALOG}
for _id, _kind, _room in [("thermostat", Kind.THERMOSTAT, Room.LIVING), ("front_lock", Kind.LOCK, Room.HALL), ("living_speaker", Kind.SPEAKER, Room.LIVING), ("living_blinds", Kind.BLINDS, Room.LIVING), ("bedroom_blinds", Kind.BLINDS, Room.BEDROOM)]:
    assert _id in _by_id, f"CATALOG is missing the device {_id!r}"
    assert _by_id[_id].kind is _kind and _by_id[_id].room is _room, f"{_id} should be a {_kind.name} in the {_room.name} room"
assert _by_id["front_lock"].label == "Front door lock", 'Give front_lock the label "Front door lock"'`,
            },
            {
              id: "t6",
              description: "Every room has a light and a motion sensor",
              assertionCode: py`_by_id = {s.id: s for s in CATALOG}
for _room in Room:
    for _suffix, _kind in (("light", Kind.LIGHT), ("motion", Kind.MOTION)):
        _id = f"{_room.value}_{_suffix}"
        assert _id in _by_id, f"CATALOG is missing {_id!r}. Build the lights and sensors with a comprehension over Room"
        assert _by_id[_id].kind is _kind and _by_id[_id].room is _room, f"{_id} should be a {_kind.name} in the {_room.name} room"`,
            },
            {
              id: "t7",
              description: "catalog() hands the scene plain JSON",
              assertionCode: py`import json as _json
_data = catalog()
assert isinstance(_data, list) and len(_data) == 13, "catalog() should return a list with one dict per device (13 in total)"
try:
    _json.dumps(_data)
except TypeError as _err:
    raise AssertionError(f"catalog() must contain only JSON-friendly values: convert enum members with .value ({_err})")
_lock = [d for d in _data if d.get("id") == "front_lock"]
assert _lock and _lock[0] == {"id": "front_lock", "kind": "lock", "room": "hall", "title": "Front door lock"}, "The front_lock entry should be {'id': 'front_lock', 'kind': 'lock', 'room': 'hall', 'title': 'Front door lock'}"`,
            },
          ],
          unlocks: ["sh-blueprint"],
          checks: [
            {
              prompt: `Given \`class Room(Enum): HALL = "hall"\`, what does \`Room.HALL == "hall"\` evaluate to?`,
              question: {"type":"choice","options":["It raises a TypeError","It depends on the Python version","True","False"],"answer":3},
              explanation: `An Enum member is an object in its own right, not its value, so it is not equal to the plain string. Use \`Room.HALL.value == "hall"\` or look the member up with \`Room("hall")\`.`,
            },
            {
              prompt: `Which of these dataclass fields is a bug waiting to happen?`,
              question: {"type":"choice","options":["`items: list[str] = []`","`tags: tuple[str, ...] = ()`","`name: str = \"\"`","`count: int = 0`"],"answer":0},
              explanation: `A list default would be one shared object for every instance, so dataclasses refuse it with a ValueError. Write \`field(default_factory=list)\` to get a fresh list each time. Strings, ints and tuples are immutable, so sharing them is harmless.`,
            },
            {
              prompt: `Why does \`catalog()\` return \`spec.kind.value\` instead of \`spec.kind\`?`,
              question: {"type":"choice","options":["The scene needs JSON, and an Enum member is not a JSON value","`.value` makes the id unique","Enum members are slower to send","Python forbids returning an Enum from a function"],"answer":0},
              explanation: `Everything that crosses from your code to the scene travels as JSON: strings, numbers, booleans, lists, dicts. Domain objects such as enum members are for the code inside; plain values are for the boundary.`,
            },
          ],
        },
        {
          id: "smart-home-2-contract",
          title: "Devices and the Device contract",
          minutes: 20,
          xp: 120,
          concepts: ["abc.ABC","@abstractmethod","template method","factory registry","custom exceptions"],
          learn: `### A contract every device must honour

A smart home controls lamps, locks and thermostats that have almost nothing in common, yet the hub wants to treat them uniformly: *give me your state, do this action*. That shared promise is an **interface**. In C# you would write \`interface IDevice\`, in Java \`interface Device\`. Python's version of a *nominal* interface (one you join by naming it) is an **abstract base class**.

~~~python
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        """Every shape must be able to compute its area."""

    # concrete: shared by all shapes
    def describe(self) -> str:
        return f"{type(self).__name__} with area {self.area():.1f}"

class Square(Shape):
    def __init__(self, side: float) -> None:
        self.side = side

    def area(self) -> float:
        return self.side ** 2

Square(3).describe()   # 'Square with area 9.0'
Shape()                # TypeError: can't instantiate abstract class
~~~

Three things to notice:

- **The check happens when you create an object**, not when you define the class. A subclass that forgets one abstract method is perfectly legal to *write*, but \`Subclass()\` raises \`TypeError\` and names the missing method.
- **An ABC can hold real code.** \`describe()\` is written once and works for every shape. It calls the abstract \`area()\`, and each subclass decides what that means. This is the *template method* idea: the base class fixes the skeleton, subclasses fill in the blanks.
- **Signatures are not checked.** Python only checks that a method with that name exists. Keep the parameters consistent yourself, and write type hints so tools can help.

### Taking a contract to the smart home

Every device will promise two things: \`state()\` (its readings as plain values) and \`execute(action, value)\` (do something). The base class adds shared behaviour such as \`describe()\`, which combines identity with state.

An unknown action should fail loudly but *specifically*. A custom exception that inherits from \`ValueError\` lets callers catch the whole family (\`except ValueError\`) or just this case.

~~~python
class UnsupportedAction(ValueError):
    """Raised when a device is asked to do something it cannot do."""
~~~

### Classes are values too

A registry dict such as \`{Kind.LIGHT: Light}\` maps a *kind* to the **class** that builds it. \`FACTORIES[spec.kind](spec)\` looks up a class and calls it. Adding a new device type means adding one entry, not editing a chain of \`if/elif\`. You will use the same trick with functions in chapter 2.

### Do not let exceptions cross the boundary

\`command()\` is called by the scene, a different program. If a device raises, the dashboard should show a clear error, not crash. So \`command()\` catches \`ValueError\` and **returns** \`{"ok": False, "error": "..."}\`. Inside your code, raise; at the boundary, report.

### Common mistakes

- Forgetting \`super().__init__(spec)\` in a subclass, so \`self.spec\` never exists.
- Putting \`@abstractmethod\` on a method but inheriting from a plain class: without \`ABC\` (or \`metaclass=ABCMeta\`) nothing is enforced.
- Validating with \`if not level:\` when \`0\` is a legal value. Compare against \`None\` or a range explicitly.
- Combining decorators: \`@property\` goes on the outside, \`@abstractmethod\` on the inside.`,
          mission: `The plan lists devices, but they are only labels. To bring one to life it needs behaviour, and the hub needs one way to talk to all of them.

Write the \`Device\` contract, then the first real device: a \`Light\` with a dimmer. Build every light in the catalog from your \`FACTORIES\` table and expose a \`snapshot()\` the scene can poll. The lights glow in their rooms, and you can click one to switch it.`,
          tasks: [
            "Device(ABC): abstract state() and execute(), plus a concrete describe() every subclass inherits",
            "Light(Device): a 0-100 level with turn_on, turn_off, set_level, and execute for on / off / dim",
            "FACTORIES, build_devices(specs) and devices: build objects by looking classes up in a dict",
            "snapshot() and command(): the two functions the scene calls, which never raise",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: the Device contract and the first device, a Light.
from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import Any


class UnsupportedAction(ValueError):
    """Raised when a device is asked to do something it cannot do."""


def _number(value: Any, name: str) -> float:
    """A real number, or ValueError. (bool is rejected: True is not a level.)"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number, got {value!r}")
    return float(value)


class Device(ABC):
    ...
    # __init__(self, spec: DeviceSpec) stores self.spec
    # properties id and room come from the spec
    # abstract: state() -> dict, execute(action, value=None)
    # concrete: describe() -> {"id", "kind", "room", **self.state()} using .value for kind and room


class Light(Device):
    ...
    # level 0-100 (starts at 0); is_on property; turn_on() -> 100; turn_off() -> 0
    # set_level(level) validates 0-100 with _number and raises ValueError otherwise
    # state() -> {"on": bool, "level": int}
    # execute: "on", "off", "dim" (value = level); anything else raises UnsupportedAction


FACTORIES = {}  # Kind -> the class that builds it


def build_devices(specs):
    ...  # {spec.id: FACTORIES[spec.kind](spec)} for every spec whose kind has a factory


devices = {}


def snapshot():
    ...  # {device id: device.describe()} for every device


def command(device_id, action, value=None):
    ...  # {"ok": True, "state": ...} or {"ok": False, "error": "..."}; never raises
`,
          solutionAdd: py`from abc import ABC, abstractmethod
from collections.abc import Iterable
from typing import Any


class UnsupportedAction(ValueError):
    """Raised when a device is asked to do something it cannot do."""


def _number(value: Any, name: str) -> float:
    """A real number, or ValueError. (bool is rejected: True is not a level.)"""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number, got {value!r}")
    return float(value)


class Device(ABC):
    """The contract every device in the house must honour."""

    def __init__(self, spec: DeviceSpec) -> None:
        self.spec = spec

    @property
    def id(self) -> str:
        return self.spec.id

    @property
    def room(self) -> Room:
        return self.spec.room

    @abstractmethod
    def state(self) -> dict[str, Any]:
        """The device's readings as plain, JSON-friendly values."""

    @abstractmethod
    def execute(self, action: str, value: Any = None) -> None:
        """Carry out an action. Raise UnsupportedAction for anything unknown."""

    def describe(self) -> dict[str, Any]:
        """Identity plus state: what the dashboard shows."""
        return {"id": self.id, "kind": self.spec.kind.value, "room": self.room.value, **self.state()}


class Light(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.level = 0

    @property
    def is_on(self) -> bool:
        return self.level > 0

    def turn_on(self) -> None:
        self.level = 100

    def turn_off(self) -> None:
        self.level = 0

    def set_level(self, level: Any) -> None:
        number = _number(level, "light level")
        if not 0 <= number <= 100:
            raise ValueError(f"light level must be between 0 and 100, got {level}")
        self.level = round(number)

    def state(self) -> dict[str, Any]:
        return {"on": self.is_on, "level": self.level}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "on":
            self.turn_on()
        elif action == "off":
            self.turn_off()
        elif action == "dim":
            self.set_level(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


FACTORIES: dict[Kind, type[Device]] = {Kind.LIGHT: Light}


def build_devices(specs: Iterable[DeviceSpec]) -> dict[str, Device]:
    return {spec.id: FACTORIES[spec.kind](spec) for spec in specs if spec.kind in FACTORIES}


devices = build_devices(CATALOG)


def snapshot() -> dict[str, dict[str, Any]]:
    return {device.id: device.describe() for device in devices.values()}


def command(device_id: str, action: str, value: Any = None) -> dict[str, Any]:
    device = devices.get(device_id)
    if device is None:
        return {"ok": False, "error": f"unknown device {device_id!r}"}
    try:
        device.execute(action, value)
    except ValueError as err:  # includes UnsupportedAction
        return {"ok": False, "error": str(err)}
    return {"ok": True, "state": device.describe()}`,
          explanation: `The ABC turns the contract into something Python enforces: you cannot create a Device, or a subclass that forgets part of the contract. describe() is written once in the base class and relies on each subclass's state(). FACTORIES maps a Kind to a class, so adding a device type later is one dictionary entry. command() is the boundary: it converts ValueErrors into an error dict so the dashboard never sees a traceback.`,
          hints: [
            { id: "h1", title: "The base class", content: `class Device(ABC): put @abstractmethod above def state(self) and def execute(self, action, value=None). __init__ stores self.spec = spec. describe() returns {"id": self.id, "kind": self.spec.kind.value, "room": self.room.value, **self.state()}.` },
            { id: "h2", title: "The light", content: `Call super().__init__(spec) then set self.level = 0. execute() is an if/elif chain on action: "on" calls turn_on(), "off" calls turn_off(), "dim" calls set_level(value), and else raises UnsupportedAction(f"{self.id} cannot {action!r}"). set_level converts with _number(level, "light level"), checks 0 <= n <= 100, and stores round(n).` },
            { id: "h3", title: "Factory and boundary", content: `FACTORIES = {Kind.LIGHT: Light}. build_devices returns {spec.id: FACTORIES[spec.kind](spec) for spec in specs if spec.kind in FACTORIES}. command() looks the device up with devices.get(device_id), returns an error dict if it is None, then wraps device.execute(action, value) in try/except ValueError.` },
          ],
          tests: [
            {
              id: "t1",
              description: "Device is an abstract contract",
              assertionCode: py`import abc as _abc
assert issubclass(Device, _abc.ABC), "Make Device inherit from ABC"
try:
    Device(CATALOG[0])
except TypeError:
    pass
else:
    raise AssertionError("Device should be abstract: mark state() and execute() with @abstractmethod so Device(...) raises TypeError")
assert {"state", "execute"} <= set(Device.__abstractmethods__), "Both state() and execute() must be abstract methods"
assert "describe" not in Device.__abstractmethods__, "describe() should be a normal method that every device inherits"`,
            },
            {
              id: "t2",
              description: "A subclass must fill in the whole contract",
              assertionCode: py`class _HalfDevice(Device):
    def state(self):
        return {}
try:
    _HalfDevice(CATALOG[0])
except TypeError:
    pass
else:
    raise AssertionError("A subclass that skips execute() must not be creatable")
class _FullDevice(Device):
    def state(self):
        return {"ok": 1}
    def execute(self, action, value=None):
        pass
_full = _FullDevice(DeviceSpec("probe", Kind.MOTION, Room.HALL))
assert _full.id == "probe" and _full.room is Room.HALL, "id and room should come from the spec"
assert _full.describe() == {"id": "probe", "kind": "motion", "room": "hall", "ok": 1}, f"describe() should merge identity and state, got {_full.describe()}"`,
            },
            {
              id: "t3",
              description: "A Light switches and dims",
              assertionCode: py`_light = Light(DeviceSpec("t_light", Kind.LIGHT, Room.HALL))
assert _light.state() == {"on": False, "level": 0}, f"A new light should be off at level 0, got {_light.state()}"
_light.execute("on")
assert _light.state() == {"on": True, "level": 100}, 'execute("on") should set the level to 100'
_light.execute("dim", 35)
assert _light.state() == {"on": True, "level": 35}, 'execute("dim", 35) should set the level to 35'
_light.execute("dim", 0)
assert _light.is_on is False, "Dimming to 0 means the light is off"
_light.execute("on")
_light.execute("off")
assert _light.level == 0, 'execute("off") should set the level to 0'`,
            },
            {
              id: "t4",
              description: "A Light rejects bad requests",
              assertionCode: py`_light = Light(DeviceSpec("t_light", Kind.LIGHT, Room.HALL))
for _bad in (140, -1, "bright", None, True):
    try:
        _light.execute("dim", _bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"dim with {_bad!r} should raise ValueError (levels are numbers from 0 to 100)")
assert _light.level == 0, "A rejected dim must not change the level"
try:
    _light.execute("explode")
except UnsupportedAction as _err:
    assert "explode" in str(_err), "The message should mention the action that was refused"
else:
    raise AssertionError("An unknown action should raise UnsupportedAction")
assert issubclass(UnsupportedAction, ValueError), "UnsupportedAction should inherit from ValueError"`,
            },
            {
              id: "t5",
              description: "build_devices builds one object per known kind",
              assertionCode: py`_built = build_devices(CATALOG)
assert len(_built) == 4, f"Only lights have a factory so far: expected 4 devices, got {len(_built)}"
assert set(_built) == {"hall_light", "living_light", "kitchen_light", "bedroom_light"}, "The devices should be keyed by spec id"
assert all(isinstance(d, Light) for d in _built.values()), "Each light spec should produce a Light object"
assert FACTORIES.get(Kind.LIGHT) is Light, "Register the class itself in FACTORIES: {Kind.LIGHT: Light}"
assert len(devices) == 4 and all(isinstance(d, Device) for d in devices.values()), "devices should be build_devices(CATALOG)"`,
            },
            {
              id: "t6",
              description: "snapshot() is plain JSON keyed by device id",
              assertionCode: py`import json as _json
devices["kitchen_light"].execute("dim", 40)
_snap = snapshot()
try:
    _json.dumps(_snap)
except TypeError as _err:
    raise AssertionError(f"snapshot() must be JSON-friendly (use describe(), which converts enums): {_err}")
assert _snap["kitchen_light"] == {"id": "kitchen_light", "kind": "light", "room": "kitchen", "on": True, "level": 40}, f"Unexpected kitchen_light snapshot: {_snap.get('kitchen_light')}"
assert _snap["hall_light"]["on"] is False, "Lights you have not touched stay off"
devices["kitchen_light"].execute("off")`,
            },
            {
              id: "t7",
              description: "command() reports instead of crashing",
              assertionCode: py`_ok = command("living_light", "dim", 60)
assert _ok.get("ok") is True and _ok["state"]["level"] == 60, f"A good command should return ok True and the new state, got {_ok}"
for _args, _word in ((("nope", "on"), "nope"), (("living_light", "melt"), "melt"), (("living_light", "dim", 999), "999")):
    _res = command(*_args)
    assert _res.get("ok") is False, f"command{_args} should return ok False, not raise or succeed"
    assert _word in str(_res.get("error")), f"The error for command{_args} should mention {_word!r}, got {_res.get('error')!r}"
devices["living_light"].execute("off")`,
            },
          ],
          unlocks: ["sh-lights"],
          checks: [
            {
              prompt: `You write \`class Dimmer(Device)\` and forget to implement \`execute()\`. When does Python complain?`,
              question: {"type":"choice","options":["When you first call `execute()`","When the class statement runs","Never: abstract methods are only a convention","When you create a `Dimmer(...)` object"],"answer":3},
              explanation: `Abstract methods are enforced at instantiation: \`Dimmer(spec)\` raises \`TypeError: Can't instantiate abstract class ...\` and names the missing method. Defining the class is allowed, which is what lets you build a chain of partly-abstract helper classes.`,
            },
            {
              prompt: `\`describe()\` is defined once on \`Device\` but returns different data for a \`Light\` and a \`DoorLock\`. What makes that work?`,
              question: {"type":"choice","options":["Python picks the data based on the class name","describe() is copied into each subclass","describe() calls self.state(), which each subclass implements differently","describe() uses isinstance() to check the type"],"answer":2},
              explanation: `This is the template-method idea. The base class fixes the shared skeleton (identity first, state after) and delegates the varying part to an abstract method. \`self.state()\` runs the *subclass's* version because \`self\` is the real object.`,
            },
          ],
        },
        {
          id: "smart-home-3-polymorphism",
          title: "Polymorphism: one call, many devices",
          minutes: 18,
          xp: 110,
          concepts: ["polymorphism","Liskov substitution","EAFP","try / except / else","hysteresis"],
          learn: `### One message, many behaviours

**Polymorphism** means "many shapes": you send the same message to different objects and each responds in its own way. A loop over devices calls \`device.execute("off")\`, and a light dims to zero while a lock refuses politely. The loop never asks *what kind of thing is this?*

~~~python
for device in devices.values():
    # works for lights, locks, anything new
    print(device.describe())
~~~

The anti-pattern is the type ladder:

~~~python
# every new device type edits this function
if isinstance(device, Light):
    ...
elif isinstance(device, DoorLock):
    ...
elif isinstance(device, Thermostat):
    ...
~~~

Code like that must be reopened every time a device type is added. Code that only relies on the contract is **open for extension, closed for modification**: write a \`Blinds\` class next week and every existing loop already works with it.

### Ask forgiveness, not permission

Some devices cannot do some actions: you cannot "dim" a lock. There are two ways to handle that. *Look before you leap* means checking the type or a list of supported actions first. Python usually prefers *easier to ask forgiveness than permission*: just try, and handle the specific failure.

~~~python
try:
    device.execute(action, value)
except UnsupportedAction:
    # this device doesn't speak that action
    skipped.append(device.id)
else:
    # runs only if the try block raised nothing
    done.append(device.id)
~~~

Notice what is **not** caught: a \`ValueError\` for a bad value such as \`dim 999\` should surface, because it signals a mistake by the caller, not a capability gap. Catch the narrowest exception that describes the situation you expect.

### Honouring the contract (Liskov in plain words)

A subclass should be usable anywhere its base class is. That means your new devices must follow the *same rules*: \`state()\` returns plain values, \`execute()\` raises \`UnsupportedAction\` for unknown actions (never quietly ignores them), and invalid values raise \`ValueError\`. If one subclass broke those rules, every loop over devices would need special cases and the polymorphism would be gone.

### The thermostat and the dead band

A naive thermostat that switches on below the target and off at or above it would flicker constantly around the target. Real ones use **hysteresis**: heating starts when the room is half a degree *below* the target and stops only when the target is *reached*. Between those two values the thermostat keeps doing whatever it was already doing, so it carries a little memory (\`self.heating\`).

~~~python
if current <= target - 0.5:
    heating = True
elif current >= target:
    heating = False
# otherwise: unchanged
~~~

### Common mistakes

- Catching bare \`Exception\` around \`execute()\`: you would also hide real bugs inside a device.
- Raising \`NotImplementedError\` in a subclass for an action it should simply refuse: use the contract's \`UnsupportedAction\`.
- Letting a setter validate *after* it stores the value, so a rejected value still changes the object. Validate first, assign after.`,
          mission: `The lights obey, but a house needs more than lights. Add a **door lock** and a **thermostat**, two devices with completely different state and actions, and prove they slot into the same hub without touching it.

The scene feeds the thermostat the indoor temperature (it simulates heat loss and your heating switching on), so a cold day will show your hysteresis logic working.`,
          tasks: [
            "DoorLock: locked by default, with lock and unlock actions",
            "Thermostat: target, current and heating, with a dead band so it never flickers",
            "Register both in FACTORIES and rebuild devices (no other function should need to change)",
            "broadcast(items, action, value): try an action on every device and report who did it and who refused",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: two more devices, and code that works for all of them.
class DoorLock(Device):
    ...
    # starts locked; state() -> {"locked": bool}
    # execute: "lock" and "unlock", otherwise UnsupportedAction


class Thermostat(Device):
    ...
    # target (default 21.0), current (starts at target), heating (starts False)
    # measure(temperature): store it, then heating = True at or below target - 0.5,
    #                       False at or above target, otherwise unchanged
    # set_target(target): 10-30 only (ValueError otherwise), then re-evaluate with measure(self.current)
    # state() -> {"target": ..., "current": rounded to 1 decimal, "heating": bool}
    # execute: "set_target" and "measure"; anything else raises UnsupportedAction


# register both classes in FACTORIES, then rebuild devices from CATALOG


def broadcast(items, action, value=None):
    ...  # try the action on every device: {"done": [ids that did it], "skipped": [ids that refused]}
`,
          solutionAdd: py`class DoorLock(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.locked = True

    def state(self) -> dict[str, Any]:
        return {"locked": self.locked}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "lock":
            self.locked = True
        elif action == "unlock":
            self.locked = False
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


class Thermostat(Device):
    def __init__(self, spec: DeviceSpec, target: float = 21.0) -> None:
        super().__init__(spec)
        self.target = float(target)
        self.current = self.target
        self.heating = False

    def measure(self, temperature: Any) -> None:
        self.current = _number(temperature, "temperature")
        if self.current <= self.target - 0.5:
            self.heating = True
        elif self.current >= self.target:
            self.heating = False

    def set_target(self, target: Any) -> None:
        number = _number(target, "target")
        if not 10 <= number <= 30:
            raise ValueError(f"target must be between 10 and 30, got {target}")
        self.target = number
        self.measure(self.current)

    def state(self) -> dict[str, Any]:
        return {"target": self.target, "current": round(self.current, 1), "heating": self.heating}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "set_target":
            self.set_target(value)
        elif action == "measure":
            self.measure(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


FACTORIES.update({Kind.LOCK: DoorLock, Kind.THERMOSTAT: Thermostat})
devices = build_devices(CATALOG)


def broadcast(items: Iterable[Device], action: str, value: Any = None) -> dict[str, list[str]]:
    done: list[str] = []
    skipped: list[str] = []
    for device in items:
        try:
            device.execute(action, value)
        except UnsupportedAction:
            skipped.append(device.id)
        else:
            done.append(device.id)
    return {"done": done, "skipped": skipped}`,
          explanation: `snapshot() and command() were written for lights and now serve a lock and a thermostat without a single edit: that is polymorphism paying off. broadcast() relies on the contract (UnsupportedAction means 'not my kind of action') and lets everything else, such as a bad value, propagate. The thermostat's dead band is a tiny state machine: heating only changes at the two thresholds.`,
          hints: [
            { id: "h1", title: "DoorLock", content: `super().__init__(spec), then self.locked = True. state() returns {"locked": self.locked}. execute() sets self.locked = True for "lock", False for "unlock", else raises UnsupportedAction.` },
            { id: "h2", title: "Thermostat logic", content: `In measure(): self.current = _number(temperature, "temperature"); if self.current <= self.target - 0.5: self.heating = True; elif self.current >= self.target: self.heating = False. In set_target(): validate with 10 <= number <= 30 first, then assign self.target, then call self.measure(self.current).` },
            { id: "h3", title: "Registering and broadcasting", content: `FACTORIES.update({Kind.LOCK: DoorLock, Kind.THERMOSTAT: Thermostat}) then devices = build_devices(CATALOG). In broadcast(): for each device, try: device.execute(action, value) / except UnsupportedAction: skipped.append(device.id) / else: done.append(device.id).` },
          ],
          tests: [
            {
              id: "t1",
              description: "DoorLock locks and unlocks",
              assertionCode: py`_lock = DoorLock(DeviceSpec("t_lock", Kind.LOCK, Room.HALL))
assert isinstance(_lock, Device), "DoorLock should extend Device"
assert _lock.state() == {"locked": True}, f"A new lock starts locked, got {_lock.state()}"
_lock.execute("unlock")
assert _lock.state() == {"locked": False}, 'execute("unlock") should leave the lock unlocked'
_lock.execute("lock")
assert _lock.locked is True, 'execute("lock") should lock it again'
try:
    _lock.execute("dim", 50)
except UnsupportedAction:
    pass
else:
    raise AssertionError("A lock cannot dim: it should raise UnsupportedAction")`,
            },
            {
              id: "t2",
              description: "The thermostat uses hysteresis",
              assertionCode: py`_t = Thermostat(DeviceSpec("t_stat", Kind.THERMOSTAT, Room.LIVING))
assert (_t.target, _t.current, _t.heating) == (21.0, 21.0, False), f"Defaults should be target 21.0, current 21.0, heating False, got {_t.state()}"
_t.measure(19)
assert _t.heating is True, "At 19 with target 21 the heating should switch on"
_t.measure(20.7)
assert _t.heating is True, "20.7 is inside the dead band (between target - 0.5 and target): keep heating"
_t.measure(21)
assert _t.heating is False, "Reaching the target should switch the heating off"
_t.measure(20.7)
assert _t.heating is False, "20.7 is inside the dead band: stay off, do not flicker back on"
_t.measure(20.5)
assert _t.heating is True, "At target - 0.5 the heating should start again"`,
            },
            {
              id: "t3",
              description: "Targets are validated and re-evaluated",
              assertionCode: py`_t = Thermostat(DeviceSpec("t_stat", Kind.THERMOSTAT, Room.LIVING))
_t.set_target(23)
assert _t.target == 23.0 and _t.heating is True, "Raising the target to 23 while it is 21 inside should start the heating immediately (set_target should call measure again)"
for _bad in (5, 31, "warm", None):
    try:
        _t.set_target(_bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"set_target({_bad!r}) should raise ValueError (targets are numbers from 10 to 30)")
assert _t.target == 23.0, "A rejected target must not change the thermostat"
_t.execute("measure", 24)
assert _t.state() == {"target": 23.0, "current": 24.0, "heating": False}, f"Unexpected thermostat state {_t.state()}"
try:
    _t.execute("measure", "hot")
except ValueError:
    assert _t.current == 24.0, "A rejected reading must not overwrite the last good one"
else:
    raise AssertionError("A reading that is not a number should raise ValueError")
try:
    _t.execute("unlock")
except UnsupportedAction:
    pass
else:
    raise AssertionError("A thermostat cannot unlock: raise UnsupportedAction")`,
            },
            {
              id: "t4",
              description: "The factories know every kind built so far",
              assertionCode: py`assert FACTORIES.get(Kind.LOCK) is DoorLock and FACTORIES.get(Kind.THERMOSTAT) is Thermostat, "Add Kind.LOCK and Kind.THERMOSTAT to FACTORIES"
assert len(devices) == 6, f"devices should now hold 4 lights, the lock and the thermostat (6), it has {len(devices)}"
assert isinstance(devices["front_lock"], DoorLock) and isinstance(devices["thermostat"], Thermostat), "Rebuild devices with build_devices(CATALOG) after registering the new classes"`,
            },
            {
              id: "t5",
              description: "snapshot() includes the new devices",
              assertionCode: py`import json as _json
_snap = snapshot()
_json.dumps(_snap)
assert _snap["front_lock"] == {"id": "front_lock", "kind": "lock", "room": "hall", "locked": True}, f"Unexpected front_lock snapshot: {_snap.get('front_lock')}"
assert _snap["thermostat"] == {"id": "thermostat", "kind": "thermostat", "room": "living", "target": 21.0, "current": 21.0, "heating": False}, f"Unexpected thermostat snapshot: {_snap.get('thermostat')}"`,
            },
            {
              id: "t6",
              description: "broadcast separates doers from refusers",
              assertionCode: py`_fleet = build_devices(CATALOG)
for _light in ("hall_light", "kitchen_light"):
    _fleet[_light].execute("on")
_res = broadcast(_fleet.values(), "off")
assert sorted(_res["done"]) == ["bedroom_light", "hall_light", "kitchen_light", "living_light"], f"Only the four lights can switch off, but done was {_res['done']}"
assert sorted(_res["skipped"]) == ["front_lock", "thermostat"], f"The lock and thermostat should be skipped, got {_res['skipped']}"
assert all(not _fleet[i].is_on for i in _res["done"]), "The lights should really be off afterwards"
_res = broadcast(_fleet.values(), "lock")
assert _res["done"] == ["front_lock"] and len(_res["skipped"]) == 5, f"Only the lock understands 'lock', got {_res}"`,
            },
            {
              id: "t7",
              description: "broadcast does not swallow real mistakes",
              assertionCode: py`_fleet = build_devices(CATALOG)
try:
    broadcast(_fleet.values(), "dim", 999)
except ValueError:
    pass
else:
    raise AssertionError("A bad value is the caller's mistake: broadcast should only catch UnsupportedAction, so ValueError must come through")`,
            },
            {
              id: "t8",
              description: "command() works on the new devices",
              assertionCode: py`_res = command("front_lock", "unlock")
assert _res == {"ok": True, "state": {"id": "front_lock", "kind": "lock", "room": "hall", "locked": False}}, f"Unexpected result {_res}"
_res = command("thermostat", "set_target", 40)
assert _res.get("ok") is False and "40" in _res.get("error", ""), f"An out-of-range target should come back as an error dict, got {_res}"
assert command("thermostat", "set_target", 23)["state"]["heating"] is True, "Raising the target above the current temperature should start heating"
devices["front_lock"].execute("lock")
devices["thermostat"].execute("set_target", 21)`,
            },
          ],
          unlocks: ["sh-lock","sh-climate"],
          checks: [
            {
              prompt: `A new \`Blinds\` class is added next month. Which of these functions has to change so it works with the blinds?`,
              question: {"type":"choice","options":["`command()`","`snapshot()`","None of them: only FACTORIES gets a new entry","`broadcast()`"],"answer":2},
              explanation: `All three only use the contract (\`describe()\`, \`execute()\`), so they are closed for modification and open for extension. If they had an \`isinstance\` ladder, each would need editing.`,
            },
            {
              prompt: `Why does \`broadcast()\` catch \`UnsupportedAction\` but let a \`ValueError\` for \`dim 999\` escape?`,
              question: {"type":"choice","options":["An unsupported action is a normal fact about a device; a bad value is a mistake the caller should hear about","ValueError cannot be caught in a loop","Python only allows one except clause","UnsupportedAction is faster"],"answer":0},
              explanation: `Catch the narrowest exception that describes a situation you *expect*. Silently skipping a bad value would hide a bug; skipping a device that doesn't speak the action is the whole point of broadcasting.`,
            },
          ],
        },
        {
          id: "smart-home-4-protocols",
          title: "Protocols: interfaces by shape",
          minutes: 20,
          xp: 130,
          concepts: ["typing.Protocol","@runtime_checkable","structural typing","ABC vs Protocol","interface segregation"],
          learn: `### Interfaces without inheritance

An abstract base class says "you must *be* a \`Device\`". Sometimes that is the wrong demand. A speaker and a lamp both have \`turn_on()\` and \`turn_off()\`, but a vendor's smart plug, a test double, or a class from a library you cannot edit might too, and none of them will ever inherit from your base class. What you care about is the **shape**: can it do these things?

That is a **structural** interface, and Python spells it \`typing.Protocol\`. If you know Go interfaces or TypeScript types, this is the same idea. It is *duck typing made explicit*: if it walks like a duck and quacks like a duck, a Protocol lets you write the duck down.

~~~python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Switchable(Protocol):
    def turn_on(self) -> None: ...
    def turn_off(self) -> None: ...

# no base class, never heard of Switchable
class VendorPlug:
    def turn_on(self) -> None: ...
    def turn_off(self) -> None: ...

def power_down(things: list[Switchable]) -> None:
    for thing in things:
        thing.turn_off()

# fine: it has the right shape
power_down([VendorPlug()])
isinstance(VendorPlug(), Switchable)   # True
~~~

Points worth knowing:

- Protocol members are written as signatures with \`...\` as the body; they describe, they do not implement.
- A type checker (mypy, pyright, your editor) uses the protocol to verify calls statically. At **runtime** Python normally does nothing, which is why plain duck typing keeps working.
- \`@runtime_checkable\` additionally lets \`isinstance()\` check that the methods *exist*. It does not check signatures or return types, so treat it as a quick capability test, not proof.
- Keep protocols **small and role-shaped** (\`Switchable\`, \`Sensor\`, \`Notifier\`). A class can satisfy many of them. This is the *interface segregation* principle: no consumer should depend on methods it does not use.

### ABC or Protocol?

**Reach for an ABC when**

- you own the family and want shared code and shared state in the base class;
- you want a hard error the moment someone forgets a method (it fires at instantiation);
- the relationship really is "is-a" and belongs in the class hierarchy.

**Reach for a Protocol when**

- you need to accept things you do not control: library classes, vendor gadgets, fakes in tests;
- the interface is a narrow capability that cuts across unrelated classes;
- you want classes to qualify just by having the right methods.

*Nominal* (ABC) interfaces are joined by name: you must inherit. *Structural* (Protocol) interfaces are joined by shape. C# and Java interfaces are nominal, so an ABC is the closer match there. In real programs you often use both, exactly as this lesson does: \`Device\` is the family contract, \`Switchable\` and \`Sensor\` are capabilities that some devices happen to have.

### A rule of thumb

Define the interface where it is **used**, not where it is implemented. The code that wants to switch things off declares \`Switchable\`; the light never needs to know that interface exists. That keeps dependencies pointing the right way and makes fakes trivial: any tiny class with the right methods will do.

### Common mistakes

- Forgetting \`@runtime_checkable\` and then calling \`isinstance(x, Switchable)\`: you get a \`TypeError\`.
- Trusting \`isinstance\` against a protocol to prove the *signatures* match. It only checks the names.
- Making a protocol for a single class that you own. If there is one implementation and no tests need a fake, you do not need an interface yet.
- Writing protocol bodies with real code. Use \`...\`.`,
          mission: `The house still has gaps: a living-room speaker, two sets of blinds and a motion sensor in every room. They have different jobs, but the hub needs two simple questions to work across them: *can you be switched on and off?* and *can you give me a reading?*

Write those as Protocols, finish the last three device classes, and add \`power_down()\`, which switches off anything switchable, even gadgets that never heard of your code. The speaker plays, the blinds slide, and the sensors ping when someone walks by.`,
          tasks: [
            "Switchable and Sensor: two small runtime-checkable Protocols",
            "Speaker and MotionSensor as Devices (Blinds is given); register all three and rebuild devices",
            "power_down(things): switch off everything Switchable, including objects that never inherit from anything",
            "active_sensors(sensors): the sensors currently reading above zero",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: capabilities as Protocols, and the last three devices.
from typing import Protocol, runtime_checkable


@runtime_checkable
class Switchable(Protocol):
    ...  # turn_on(self) -> None and turn_off(self) -> None, bodies are just "..."


@runtime_checkable
class Sensor(Protocol):
    ...  # read(self) -> float


class Speaker(Device):
    ...
    # playing (False) and volume (30); turn_on, turn_off, set_volume (0-100, ValueError otherwise)
    # state() -> {"playing": bool, "volume": int}
    # execute: "on", "off", "volume" (value = level); anything else raises UnsupportedAction


class MotionSensor(Device):
    ...
    # detected (False); trigger(); clear(); read() -> 1.0 while detected, else 0.0
    # state() -> {"detected": bool}
    # execute: "trigger" and "clear"; anything else raises UnsupportedAction


class Blinds(Device):
    """Given: study it, it follows the same pattern. position 0 = closed, 100 = open."""

    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.position = 100

    def set_position(self, position: Any) -> None:
        number = _number(position, "blinds position")
        if not 0 <= number <= 100:
            raise ValueError(f"blinds position must be between 0 and 100, got {position}")
        self.position = round(number)

    def state(self) -> dict[str, Any]:
        return {"position": self.position}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "open":
            self.position = 100
        elif action == "close":
            self.position = 0
        elif action == "position":
            self.set_position(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


# register Kind.SPEAKER, Kind.MOTION and Kind.BLINDS in FACTORIES, then rebuild devices


def power_down(things):
    ...  # call turn_off() on everything Switchable (skip the rest); return how many were switched off


def active_sensors(sensors):
    ...  # the sensors whose read() is above zero, in the order given
`,
          solutionAdd: py`from typing import Protocol, runtime_checkable


@runtime_checkable
class Switchable(Protocol):
    def turn_on(self) -> None: ...
    def turn_off(self) -> None: ...


@runtime_checkable
class Sensor(Protocol):
    def read(self) -> float: ...


class Speaker(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.playing = False
        self.volume = 30

    def turn_on(self) -> None:
        self.playing = True

    def turn_off(self) -> None:
        self.playing = False

    def set_volume(self, volume: Any) -> None:
        number = _number(volume, "volume")
        if not 0 <= number <= 100:
            raise ValueError(f"volume must be between 0 and 100, got {volume}")
        self.volume = round(number)

    def state(self) -> dict[str, Any]:
        return {"playing": self.playing, "volume": self.volume}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "on":
            self.turn_on()
        elif action == "off":
            self.turn_off()
        elif action == "volume":
            self.set_volume(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


class MotionSensor(Device):
    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.detected = False

    def trigger(self) -> None:
        self.detected = True

    def clear(self) -> None:
        self.detected = False

    def read(self) -> float:
        return 1.0 if self.detected else 0.0

    def state(self) -> dict[str, Any]:
        return {"detected": self.detected}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "trigger":
            self.trigger()
        elif action == "clear":
            self.clear()
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


class Blinds(Device):
    """Given: study it, it follows the same pattern. position 0 = closed, 100 = open."""

    def __init__(self, spec: DeviceSpec) -> None:
        super().__init__(spec)
        self.position = 100

    def set_position(self, position: Any) -> None:
        number = _number(position, "blinds position")
        if not 0 <= number <= 100:
            raise ValueError(f"blinds position must be between 0 and 100, got {position}")
        self.position = round(number)

    def state(self) -> dict[str, Any]:
        return {"position": self.position}

    def execute(self, action: str, value: Any = None) -> None:
        if action == "open":
            self.position = 100
        elif action == "close":
            self.position = 0
        elif action == "position":
            self.set_position(value)
        else:
            raise UnsupportedAction(f"{self.id} cannot {action!r}")


FACTORIES.update({Kind.SPEAKER: Speaker, Kind.MOTION: MotionSensor, Kind.BLINDS: Blinds})
devices = build_devices(CATALOG)


def power_down(things: Iterable[object]) -> int:
    switched_off = 0
    for thing in things:
        if isinstance(thing, Switchable):
            thing.turn_off()
            switched_off += 1
    return switched_off


def active_sensors(sensors: Iterable[Sensor]) -> list[Sensor]:
    return [sensor for sensor in sensors if sensor.read() > 0]`,
          explanation: `A Protocol describes a capability by its shape, so Light, Speaker and a vendor plug all satisfy Switchable without sharing a base class. power_down() asks each object for the capability and ignores the rest, which is what makes it work for code you do not control. Device stays an ABC because it is a family you own with shared code; Switchable and Sensor are roles that cut across families.`,
          hints: [
            { id: "h1", title: "Writing a Protocol", content: `Inherit from Protocol and write signatures with ... as the body: def turn_on(self) -> None: ... and def turn_off(self) -> None: ... Keep @runtime_checkable above the class.` },
            { id: "h2", title: "The two devices", content: `Speaker mirrors Light: __init__ sets playing = False and volume = 30; execute handles "on", "off" and "volume". MotionSensor has detected = False, trigger() sets it True, clear() sets it False, and read() returns 1.0 if self.detected else 0.0.` },
            { id: "h3", title: "Helpers", content: `power_down: loop over things, and when isinstance(thing, Switchable) call thing.turn_off() and add one to a counter, then return the counter. active_sensors is a list comprehension: [s for s in sensors if s.read() > 0]. Don't forget FACTORIES.update(...) and devices = build_devices(CATALOG).` },
          ],
          tests: [
            {
              id: "t1",
              description: "Switchable and Sensor are runtime-checkable Protocols",
              assertionCode: py`import typing as _typing
for _proto in (Switchable, Sensor):
    assert getattr(_proto, "_is_protocol", False), f"{_proto.__name__} should inherit from typing.Protocol"
_lamp = Light(DeviceSpec("t_lamp", Kind.LIGHT, Room.HALL))
_lock = DoorLock(DeviceSpec("t_lock", Kind.LOCK, Room.HALL))
try:
    _is_switchable = isinstance(_lamp, Switchable)
except TypeError:
    raise AssertionError("Add @runtime_checkable above Switchable (and Sensor) so isinstance() can be used")
assert _is_switchable, "A Light has turn_on() and turn_off(), so it is Switchable without inheriting from it"
assert not isinstance(_lock, Switchable), "A DoorLock has no turn_on()/turn_off(): it is not Switchable"
assert not isinstance(_lamp, Sensor), "A Light has no read(): it is not a Sensor"`,
            },
            {
              id: "t2",
              description: "Speaker plays and has a volume",
              assertionCode: py`_sp = Speaker(DeviceSpec("t_speaker", Kind.SPEAKER, Room.LIVING))
assert isinstance(_sp, Device) and isinstance(_sp, Switchable), "Speaker should extend Device and satisfy Switchable"
assert _sp.state() == {"playing": False, "volume": 30}, f"A new speaker is silent at volume 30, got {_sp.state()}"
_sp.execute("on")
_sp.execute("volume", 55)
assert _sp.state() == {"playing": True, "volume": 55}, f"Unexpected speaker state {_sp.state()}"
_sp.execute("off")
assert _sp.playing is False, 'execute("off") should stop the music'
for _bad in (101, -5, "loud", None):
    try:
        _sp.execute("volume", _bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"volume {_bad!r} should raise ValueError (0 to 100)")
assert _sp.volume == 55, "A rejected volume must not change the speaker"
try:
    _sp.execute("lock")
except UnsupportedAction:
    pass
else:
    raise AssertionError("A speaker cannot lock: raise UnsupportedAction")`,
            },
            {
              id: "t3",
              description: "MotionSensor is a Sensor",
              assertionCode: py`_ms = MotionSensor(DeviceSpec("t_motion", Kind.MOTION, Room.HALL))
assert isinstance(_ms, Device) and isinstance(_ms, Sensor), "MotionSensor should extend Device and satisfy Sensor (it needs read())"
assert not isinstance(_ms, Switchable), "A motion sensor cannot be switched on and off"
assert _ms.read() == 0.0 and _ms.state() == {"detected": False}, "A new sensor sees nothing"
_ms.execute("trigger")
assert _ms.read() == 1.0 and _ms.state() == {"detected": True}, "After trigger the sensor should read 1.0"
_ms.execute("clear")
assert _ms.read() == 0.0, "After clear it should read 0.0 again"
try:
    _ms.execute("dim", 3)
except UnsupportedAction:
    pass
else:
    raise AssertionError("A motion sensor cannot dim: raise UnsupportedAction")`,
            },
            {
              id: "t4",
              description: "All six kinds are registered",
              assertionCode: py`assert set(FACTORIES) == set(Kind), f"FACTORIES should cover every Kind, it is missing {set(Kind) - set(FACTORIES)}"
assert FACTORIES[Kind.SPEAKER] is Speaker and FACTORIES[Kind.MOTION] is MotionSensor and FACTORIES[Kind.BLINDS] is Blinds, "Register the classes themselves (not instances) in FACTORIES"
assert len(devices) == 13, f"devices should now hold all 13 devices, it has {len(devices)}. Rebuild it after registering"
assert isinstance(devices["living_blinds"], Blinds) and isinstance(devices["kitchen_motion"], MotionSensor), "devices should hold Blinds and MotionSensor objects"`,
            },
            {
              id: "t5",
              description: "The snapshot shows every device",
              assertionCode: py`import json as _json
_snap = snapshot()
_json.dumps(_snap)
assert len(_snap) == 13, f"snapshot() should list 13 devices, got {len(_snap)}"
assert _snap["living_blinds"] == {"id": "living_blinds", "kind": "blinds", "room": "living", "position": 100}, f"Unexpected blinds snapshot {_snap.get('living_blinds')}"
assert _snap["hall_motion"] == {"id": "hall_motion", "kind": "motion", "room": "hall", "detected": False}, f"Unexpected motion snapshot {_snap.get('hall_motion')}"
assert _snap["living_speaker"]["playing"] is False, "The speaker starts silent"`,
            },
            {
              id: "t6",
              description: "power_down switches off anything Switchable",
              assertionCode: py`class _Plug:
    """A vendor gadget: no base class, but the right shape."""
    def __init__(self):
        self.on = True
    def turn_on(self):
        self.on = True
    def turn_off(self):
        self.on = False
_plug = _Plug()
_lamp = Light(DeviceSpec("t_lamp", Kind.LIGHT, Room.HALL))
_lamp.execute("on")
_sp = Speaker(DeviceSpec("t_speaker", Kind.SPEAKER, Room.LIVING))
_sp.execute("on")
_lock = DoorLock(DeviceSpec("t_lock", Kind.LOCK, Room.HALL))
_lock.execute("unlock")
_count = power_down([_lamp, _lock, _plug, "not a device", _sp])
assert _count == 3, f"Three things were Switchable (the light, the plug and the speaker), power_down returned {_count}"
assert _lamp.level == 0 and _plug.on is False and _sp.playing is False, "Everything switchable should be off afterwards"
assert _lock.locked is False, "power_down must leave non-switchable devices alone"
assert power_down([]) == 0, "power_down of nothing should return 0"`,
            },
            {
              id: "t7",
              description: "active_sensors keeps the sensors that read above zero",
              assertionCode: py`class _Probe:
    def __init__(self, value):
        self.value = value
    def read(self):
        return self.value
_a = MotionSensor(DeviceSpec("t_a", Kind.MOTION, Room.HALL))
_b = MotionSensor(DeviceSpec("t_b", Kind.MOTION, Room.LIVING))
_b.trigger()
_cold, _warm = _Probe(0), _Probe(21.5)
_found = active_sensors([_a, _b, _cold, _warm])
assert _found == [_b, _warm], f"Expected the triggered sensor and the warm probe, in order, got {_found}"
assert active_sensors([]) == [], "No sensors means no active sensors"`,
            },
            {
              id: "t8",
              description: "The old helpers still work with the new devices",
              assertionCode: py`_fleet = build_devices(CATALOG)
_fleet["living_speaker"].execute("on")
_fleet["hall_light"].execute("on")
assert power_down(_fleet.values()) == 5, "Four lights and the speaker are Switchable"
_res = broadcast(_fleet.values(), "close")
assert sorted(_res["done"]) == ["bedroom_blinds", "living_blinds"], f"Only the blinds understand 'close', got {_res['done']}"`,
            },
          ],
          unlocks: ["sh-sensors","sh-comfort"],
          checks: [
            {
              prompt: `A third-party \`SmartPlug\` class has \`turn_on()\` and \`turn_off()\` methods but knows nothing about your code. Which statement is true?`,
              question: {"type":"choice","options":["It must be wrapped in a Device subclass before power_down() can use it","It cannot be used until it inherits from Switchable","It already satisfies Switchable, because the Protocol only cares about its shape","power_down() raises a TypeError for it"],"answer":2},
              explanation: `Structural typing: \`isinstance(SmartPlug(), Switchable)\` is \`True\` because the methods exist, with no inheritance needed. That is exactly why Protocols are the right tool for libraries and test fakes.`,
            },
            {
              prompt: `Which design choice fits an ABC better than a Protocol?`,
              question: {"type":"choice","options":["Letting unrelated classes opt in just by having a method","Describing a single method a third-party library already has","A family of classes you own that share code and state (describe(), self.spec)","Accepting a fake clock in a unit test"],"answer":2},
              explanation: `ABCs shine when you control the hierarchy and want shared implementation plus an instantiation-time check. Protocols shine at the edges, where you can't or won't force inheritance.`,
            },
          ],
        },
      ],
    },
    {
      id: "delegates",
      title: "Delegates",
      blurb: "Functions are values: pass them, store them, return them, wrap them.",
      lessons: [
        {
          id: "smart-home-5-first-class",
          title: "Functions as values: your first delegates",
          minutes: 22,
          xp: 140,
          concepts: ["first-class functions","Callable","delegates","higher-order functions","dispatch table"],
          learn: `### A function is just another value

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

\`shout\` and \`shout("hi")\` are different things: the first is a recipe, the second is the dish.

### This is what "delegates" are

If you know C#, a **delegate** is a typed reference to a method, and \`Action<T>\` and \`Func<T, R>\` are the ready-made ones. In Java the same job is done by functional interfaces such as \`Runnable\`, \`Consumer<T>\`, \`Function<T, R>\` and \`Predicate<T>\`. Python needs none of that machinery: *every callable is already a delegate*. You only describe its type with \`Callable[[arguments], return_type]\`.

- \`Action<Device>\` or \`Consumer<Device>\` becomes \`Callable[[Device], None]\`
- \`Func<Device, bool>\` or \`Predicate<Device>\` becomes \`Callable[[Device], bool]\`
- \`Func<int, string>\` or \`Function<Integer, String>\` becomes \`Callable[[int], str]\`
- a **bound method** such as \`light.turn_on\` is a delegate that has captured \`light\`, like a C# method group conversion
- a **multicast delegate** (\`handler += other\`) is simply a list of callables that you loop over

A type alias gives such a type a name, like a \`delegate\` declaration:

~~~python
from collections.abc import Callable

Predicate = Callable[[Device], bool]
Action = Callable[[Device], None]
~~~

### Higher-order functions

A function that takes or returns functions is *higher-order*. You already use them: \`sorted(items, key=len)\`, \`max(items, key=...)\`, \`map\`, \`filter\`. You can write your own:

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

The inner \`matches\` remembers \`kind\` after \`by_kind\` has returned. That trick is called a closure and gets its own lesson soon; for now just use it.

### Dispatch tables replace if/elif ladders

~~~python
# a ladder: grows, and every new case edits this function
if name == "lights_off": ...
elif name == "lock_up": ...

# a table: new behaviour is just a new entry
ROUTINES = {"lights_off": lights_off, "lock_up": lock_up}
ROUTINES[name](devices)
~~~

The table is data. You can list its keys (the scene will build a button for each), add to it at runtime, or test one entry on its own. Use \`.get(name)\` and handle \`None\` so an unknown name gives a clear error rather than a \`KeyError\`.

### Common mistakes

- Calling instead of passing: \`apply_to(lights, turn_off())\` runs \`turn_off\` *now* and passes its result (\`None\`). Write \`apply_to(lights, turn_off)\`.
- Storing a call in the table: \`{"lock_up": lock_up()}\` has the same problem.
- Forgetting the parentheses when you do want to run it: \`action\` alone does nothing.
- Methods are functions too: \`Light.turn_off\` is a plain function whose first argument is the light, so \`apply_to(lights, Light.turn_off)\` works.`,
          mission: `Tapping each device is fine for a demo, but nobody wants to walk around switching every lamp. Give the house **routines**: named behaviours such as "Lights off", "Lock up" and "Goodnight".

Build them from small reusable pieces: a \`select\` that takes a test function, an \`apply_to\` that takes an action function, and a table of routines. The scene's Routines panel builds one button per entry in your \`ROUTINES\` table, so adding a routine adds a button.`,
          tasks: [
            "select(items, where) and apply_to(items, action): take a function as an argument",
            "by_kind(kind): return a function (a predicate) instead of a value",
            "lights_off, lock_up, everything_off, goodnight: routines built from the pieces above",
            "ROUTINES table, run_routine(name) and routine_names(): replace an if/elif ladder with a dictionary of functions",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: functions as values.
from collections.abc import Callable

Predicate = Callable[[Device], bool]          # like Func<Device, bool>
Action = Callable[[Device], None]             # like Action<Device>
Routine = Callable[[dict[str, Device]], None]  # takes the whole devices dict


def select(items, where):
    ...  # a list of the items for which where(item) is true


def apply_to(items, action):
    ...  # call action(item) for every item, in order; return how many there were


def by_kind(kind):
    ...  # return a function that answers: is this device of that Kind?


def lights_off(devs):
    ...  # switch every light off, using select, by_kind and apply_to


def lock_up(devs):
    ...  # lock every lock


def everything_off(devs):
    ...  # power_down every device (lesson 4)


def goodnight(devs):
    ...  # everything_off, then lock_up: routines can call routines


ROUTINES = {}  # name -> routine function: "lights_off", "lock_up", "everything_off", "goodnight"


def run_routine(name):
    ...  # {"ok": True, "routine": name} after running it on the devices dict, or {"ok": False, "error": ...}


def routine_names():
    ...  # the names in the table, as a list
`,
          solutionAdd: py`from collections.abc import Callable

Predicate = Callable[[Device], bool]
Action = Callable[[Device], None]
Routine = Callable[[dict[str, Device]], None]


def select(items: Iterable[Any], where: Callable[[Any], bool]) -> list[Any]:
    return [item for item in items if where(item)]


def apply_to(items: Iterable[Any], action: Callable[[Any], object]) -> int:
    count = 0
    for item in items:
        action(item)
        count += 1
    return count


def by_kind(kind: Kind) -> Predicate:
    def matches(device: Device) -> bool:
        return device.spec.kind is kind

    return matches


def lights_off(devs: dict[str, Device]) -> None:
    apply_to(select(devs.values(), by_kind(Kind.LIGHT)), lambda light: light.execute("off"))


def lock_up(devs: dict[str, Device]) -> None:
    apply_to(select(devs.values(), by_kind(Kind.LOCK)), lambda lock: lock.execute("lock"))


def everything_off(devs: dict[str, Device]) -> None:
    power_down(devs.values())


def goodnight(devs: dict[str, Device]) -> None:
    everything_off(devs)
    lock_up(devs)


ROUTINES: dict[str, Routine] = {
    "lights_off": lights_off,
    "lock_up": lock_up,
    "everything_off": everything_off,
    "goodnight": goodnight,
}


def run_routine(name: str) -> dict[str, Any]:
    routine = ROUTINES.get(name)
    if routine is None:
        return {"ok": False, "error": f"no routine called {name!r}"}
    routine(devices)
    return {"ok": True, "routine": name}


def routine_names() -> list[str]:
    return list(ROUTINES)`,
          explanation: `select() and apply_to() know nothing about devices: the behaviour arrives as an argument, which is exactly what a delegate is in other languages. by_kind() returns a function, and goodnight() is a routine that calls other routines. ROUTINES is a dispatch table, so run_routine() has no branches and the scene can build a button for every key.`,
          hints: [
            { id: "h1", title: "Taking functions", content: `select is [item for item in items if where(item)]. apply_to loops over items, calls action(item) and counts. Remember to call the function you were handed: where(item), not where.` },
            { id: "h2", title: "Returning a function", content: `Define an inner function inside by_kind: def matches(device): return device.spec.kind is kind, and return matches without parentheses. lights_off can then be apply_to(select(devs.values(), by_kind(Kind.LIGHT)), lambda light: light.execute("off")).` },
            { id: "h3", title: "The table", content: `ROUTINES = {"lights_off": lights_off, ...} stores the functions without calling them. run_routine: routine = ROUTINES.get(name); if routine is None, return an error dict; otherwise call routine(devices) and return {"ok": True, "routine": name}.` },
          ],
          tests: [
            {
              id: "t1",
              description: "select keeps what a test function accepts",
              assertionCode: py`assert select(range(10), lambda n: n % 2 == 0) == [0, 2, 4, 6, 8], "select(items, where) should keep the items for which where(item) is true"
assert select([], lambda n: True) == [], "Selecting from nothing gives an empty list"
_words = ["lamp", "lock", "speaker"]
assert select(_words, lambda w: w.startswith("l")) == ["lamp", "lock"], "select must work on any items, and keep their order"
assert isinstance(select(iter(_words), lambda w: True), list), "select should return a list, even for a generator input"`,
            },
            {
              id: "t2",
              description: "apply_to runs an action on every item",
              assertionCode: py`_seen = []
_n = apply_to(["a", "b", "c"], _seen.append)
assert _seen == ["a", "b", "c"], f"apply_to should call the action once per item, in order. The action saw {_seen}"
assert _n == 3, f"apply_to should return how many items it handled (3), got {_n!r}"
assert apply_to([], _seen.append) == 0, "No items means a count of 0"
_fleet = build_devices(CATALOG)
for _l in select(_fleet.values(), lambda d: d.spec.kind is Kind.LIGHT):
    _l.turn_on()
assert apply_to((d for d in _fleet.values() if isinstance(d, Light)), Light.turn_off) == 4, "A generator and an unbound method (Light.turn_off) should both work"
assert all(not d.is_on for d in _fleet.values() if isinstance(d, Light)), "Light.turn_off passed as the action should switch the lights off"`,
            },
            {
              id: "t3",
              description: "by_kind builds a predicate",
              assertionCode: py`_fleet = build_devices(CATALOG)
_is_lock = by_kind(Kind.LOCK)
assert callable(_is_lock), "by_kind(kind) should return a function, not a bool"
assert _is_lock(_fleet["front_lock"]) is True and _is_lock(_fleet["thermostat"]) is False, "The predicate should be True only for devices of that kind"
_is_light = by_kind(Kind.LIGHT)
assert [d.id for d in select(_fleet.values(), _is_light)] == ["hall_light", "living_light", "kitchen_light", "bedroom_light"], "Predicates made by separate by_kind calls must not interfere with each other"
assert _is_lock(_fleet["hall_light"]) is False, "The lock predicate must stay a lock predicate after another one was created"`,
            },
            {
              id: "t4",
              description: "The routines work on whatever devices they are given",
              assertionCode: py`_fleet = build_devices(CATALOG)
for _id in ("hall_light", "kitchen_light", "living_speaker"):
    _fleet[_id].execute("on")
_fleet["front_lock"].execute("unlock")
lights_off(_fleet)
assert all(not d.is_on for d in _fleet.values() if isinstance(d, Light)), "lights_off should switch every light off"
assert _fleet["living_speaker"].playing is True, "lights_off must only touch lights: the speaker keeps playing"
lock_up(_fleet)
assert _fleet["front_lock"].locked is True, "lock_up should lock the front door"
_fleet["front_lock"].execute("unlock")
_fleet["hall_light"].execute("on")
everything_off(_fleet)
assert _fleet["living_speaker"].playing is False and _fleet["hall_light"].level == 0, "everything_off should switch off every Switchable device"
assert _fleet["front_lock"].locked is False, "everything_off does not lock anything"
_fleet["hall_light"].execute("on")
_fleet["living_speaker"].execute("on")
goodnight(_fleet)
assert _fleet["front_lock"].locked and not _fleet["hall_light"].is_on and not _fleet["living_speaker"].playing, "goodnight should switch everything off and lock the door"`,
            },
            {
              id: "t5",
              description: "ROUTINES stores the functions themselves",
              assertionCode: py`for _name in ("lights_off", "lock_up", "everything_off", "goodnight"):
    assert _name in ROUTINES, f"ROUTINES is missing {_name!r}"
assert ROUTINES["lock_up"] is lock_up and ROUTINES["goodnight"] is goodnight, "Store the functions without calling them: {'lock_up': lock_up}, not lock_up()"
assert all(callable(r) for r in ROUTINES.values()), "Every value in ROUTINES must be callable"`,
            },
            {
              id: "t6",
              description: "run_routine looks a routine up and runs it",
              assertionCode: py`devices["hall_light"].execute("on")
devices["front_lock"].execute("unlock")
_res = run_routine("lights_off")
assert _res == {"ok": True, "routine": "lights_off"}, f"run_routine should report success as {{'ok': True, 'routine': name}}, got {_res}"
assert devices["hall_light"].level == 0, "run_routine should run the routine on the global devices"
run_routine("goodnight")
assert devices["front_lock"].locked is True, "run_routine('goodnight') should lock the door"
_bad = run_routine("self_destruct")
assert _bad.get("ok") is False and "self_destruct" in str(_bad.get("error")), f"An unknown routine should give ok False and mention its name, got {_bad}"`,
            },
            {
              id: "t7",
              description: "routine_names follows the table",
              assertionCode: py`import json as _json
_names = routine_names()
assert _names == list(ROUTINES), "routine_names() should list the keys of ROUTINES in order"
_json.dumps(_names)
ROUTINES["_tmp"] = lambda devs: None
assert "_tmp" in routine_names() and run_routine("_tmp")["ok"] is True, "A routine added to the table later should be listed and runnable without any other change"
del ROUTINES["_tmp"]`,
            },
          ],
          unlocks: ["sh-routines"],
          checks: [
            {
              prompt: `What goes wrong in \`apply_to(lights, turn_off())\`?`,
              question: {"type":"choice","options":["Python raises a SyntaxError","turn_off() runs immediately and its return value (None) is passed instead of the function","apply_to receives a copy of turn_off","Nothing, the parentheses are optional"],"answer":1},
              explanation: `Parentheses mean *call it now*. To hand over the function itself, leave them off: \`apply_to(lights, turn_off)\`.`,
            },
            {
              prompt: `Which Python type hint matches a C# \`Func<Device, bool>\` (or a Java \`Predicate<Device>\`)?`,
              question: {"type":"choice","options":["`list[Device]`","`Callable[[bool], Device]`","`Callable[[Device], bool]`","`Callable[[Device], None]`"],"answer":2},
              explanation: `\`Callable[[arguments], return_type]\`: one argument of type \`Device\`, returning \`bool\`. An \`Action<Device>\` has no return value, so it maps to \`Callable[[Device], None]\`.`,
            },
            {
              prompt: `Why is \`ROUTINES.get(name)\` followed by a \`None\` check friendlier than \`ROUTINES[name]\` in \`run_routine\`?`,
              question: {"type":"choice","options":["An unknown name produces a clear message from us instead of a raw KeyError","Dictionaries cannot be indexed with strings","It lets the routine run twice","It is faster"],"answer":0},
              explanation: `The scene may send any name. With \`.get\` you decide what an unknown name looks like (\`{'ok': False, 'error': ...}\`) instead of leaking a \`KeyError\` across the boundary.`,
            },
          ],
        },
        {
          id: "smart-home-6-callbacks",
          title: "Callbacks and lambdas",
          minutes: 20,
          xp: 130,
          concepts: ["callbacks","lambda","sorted(key=)","inversion of control","limits of lambdas"],
          learn: `### "Don't call us, we'll call you"

A **callback** is a function you hand to someone else so *they* can call it when the moment comes. You have already passed functions to \`select\` and \`apply_to\`, which call them immediately. An **event callback** is called later, when something happens: a button is pressed, a download finishes, motion is detected.

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

The motion code never mentions lights, counters or speakers. Whoever cares registers a function. In C# this is \`sensor.Motion += handler\` with an \`Action<string>\` delegate; in Java it is a listener or a \`Consumer<String>\`; in JavaScript it is \`addEventListener\`.

### Lambdas: small anonymous functions

\`lambda args: expression\` creates a function without naming it. It is the same as C#'s \`x => ...\` or Java's \`x -> ...\`, with one big limit: the body is **one expression**, nothing else.

~~~python
# same as: def square(n): return n * n
square = lambda n: n * n
sorted(words, key=lambda w: (len(w), w)) # sort by length, then alphabetically

on_motion("hall", lambda room: print("movement in", room))
~~~

Lambdas shine as tiny adapters passed straight into another call (\`key=\`, short callbacks). Reach for \`def\` instead when:

- you need a statement: assignment, \`raise\`, \`try\`, a loop, \`return\` in the middle (a lambda cannot contain any);
- you want a docstring, annotations or a meaningful name in tracebacks (a lambda always shows as \`<lambda>\`);
- the same logic is needed twice, or you want to test it on its own;
- it has grown past a short line. If you have to squint, name it.

Also remember that a lambda can use a variable from the code around it, which is handy but has a trap that the next lesson explains.

### \`sorted\` with a key

\`key\` is a function that turns each item into the value to compare. To rank rooms by visits (most first), then by name for ties, return a tuple. A leading minus flips the order of a number:

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

- Passing the result instead of the function: \`on_motion("hall", turn_on(light))\` registers \`None\`. Pass \`turn_on\` (or a lambda that calls it).
- A callback that expects different arguments from the ones the caller supplies: the call fails with \`TypeError\` at the moment of the event, far from where you registered it.
- Writing long lambdas. If it does not fit on one short line, it wants a name.`,
          mission: `Time to make the house notice people. When someone walks into a room, its motion sensor fires, and anything interested should be told, without the sensor knowing who is listening.

Build the callback registry, wire up "lights follow you" with a lambda, count visits with a named callback, and rank the rooms. In the scene, click a room to walk there: the light comes on, and a lime bar under each room grows with its visits.`,
          tasks: [
            "on_motion(room, callback) and motion_detected(room): a registry of callbacks, run in order",
            "count_visit as a named callback and a lambda that switches a room's light on, registered for every room",
            "busiest_rooms(): rank the rooms with sorted() and a lambda key",
            "Walk through the house in the scene and watch the lights follow you",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: callbacks and lambdas.
MotionCallback = Callable[[str], None]  # receives the room name

motion_callbacks: dict[str, list[MotionCallback]] = {}
visit_counts = {room.value: 0 for room in Room}


def on_motion(room, callback):
    ...  # remember the callback for that room (several callbacks per room are allowed)


def motion_detected(room):
    ...
    # find the sensor f"{room}_motion" (unknown room -> {"ok": False, "error": ...}),
    # trigger it, then call every callback registered for the room, in order, passing the room.
    # return {"ok": True, "room": room, "callbacks": how many ran}


def count_visit(room):
    ...  # add one to visit_counts[room]


# For every room: register count_visit, and a LAMBDA that switches that room's light on.
# The lambda receives the room name as its argument.


def busiest_rooms():
    ...
    # [{"room": ..., "visits": ...}] most visited first, ties alphabetical.
    # Use sorted() with a lambda key.
`,
          solutionAdd: py`MotionCallback = Callable[[str], None]

motion_callbacks: dict[str, list[MotionCallback]] = {}
visit_counts = {room.value: 0 for room in Room}


def on_motion(room: str, callback: MotionCallback) -> None:
    motion_callbacks.setdefault(room, []).append(callback)


def motion_detected(room: str) -> dict[str, Any]:
    sensor = devices.get(f"{room}_motion")
    if sensor is None:
        return {"ok": False, "error": f"no motion sensor in {room!r}"}
    sensor.execute("trigger")
    callbacks = motion_callbacks.get(room, [])
    for callback in callbacks:
        callback(room)
    return {"ok": True, "room": room, "callbacks": len(callbacks)}


def count_visit(room: str) -> None:
    visit_counts[room] = visit_counts.get(room, 0) + 1


for room in Room:
    on_motion(room.value, count_visit)
    on_motion(room.value, lambda name: devices[f"{name}_light"].execute("on"))


def busiest_rooms() -> list[dict[str, Any]]:
    ranked = sorted(visit_counts, key=lambda name: (-visit_counts[name], name))
    return [{"room": name, "visits": visit_counts[name]} for name in ranked]`,
          explanation: `The sensor code never mentions lights or counters: it just calls whatever was registered, which is inversion of control. The lambda is the right size for a one-line adapter, while count_visit got a name because you may want to test or reuse it. busiest_rooms() uses a tuple key (-visits, name) to sort most-visited first with alphabetical tie-breaks. The limits you listed (no removal, one failure breaks the rest) are the reasons the observer pattern exists.`,
          hints: [
            { id: "h1", title: "The registry", content: `on_motion: motion_callbacks.setdefault(room, []).append(callback). In motion_detected, look up devices.get(f"{room}_motion"), return an error dict if it is None, call sensor.execute("trigger"), then loop over motion_callbacks.get(room, []) calling callback(room).` },
            { id: "h2", title: "Wiring every room", content: `for room in Room: on_motion(room.value, count_visit) and on_motion(room.value, lambda name: devices[f"{name}_light"].execute("on")). The lambda uses its own parameter name, which is why it is safe inside the loop.` },
            { id: "h3", title: "Ranking", content: `ranked = sorted(visit_counts, key=lambda name: (-visit_counts[name], name)) gives the room names in order. Then build [{"room": name, "visits": visit_counts[name]} for name in ranked].` },
          ],
          tests: [
            {
              id: "t1",
              description: "on_motion registers callbacks room by room",
              assertionCode: py`_before_hall = len(motion_callbacks.get("hall", []))
_before_bed = len(motion_callbacks.get("bedroom", []))
def _spy_one(room):
    pass
def _spy_two(room):
    pass
on_motion("hall", _spy_one)
on_motion("hall", _spy_two)
assert len(motion_callbacks["hall"]) == _before_hall + 2, "on_motion should append: several callbacks per room are allowed"
assert motion_callbacks["hall"][-2:] == [_spy_one, _spy_two], "Callbacks must be stored in registration order, as the functions themselves (do not call them)"
assert len(motion_callbacks.get("bedroom", [])) == _before_bed, "Registering for the hall must not touch the bedroom"
motion_callbacks["hall"][-2:] = []`,
            },
            {
              id: "t2",
              description: "motion_detected triggers the sensor and runs the callbacks in order",
              assertionCode: py`_log = []
on_motion("bedroom", lambda room: _log.append(("first", room)))
on_motion("bedroom", lambda room: _log.append(("second", room)))
_res = motion_detected("bedroom")
assert _log == [("first", "bedroom"), ("second", "bedroom")], f"Each callback should get the room name, in registration order. They saw {_log}"
assert devices["bedroom_motion"].detected is True, "motion_detected should trigger the room's motion sensor"
assert _res["ok"] is True and _res["room"] == "bedroom", f"Unexpected result {_res}"
assert _res["callbacks"] == len(motion_callbacks["bedroom"]), "callbacks should report how many callbacks ran"
motion_callbacks["bedroom"][-2:] = []
devices["bedroom_motion"].execute("clear")
devices["bedroom_light"].execute("off")`,
            },
            {
              id: "t3",
              description: "an unknown room is reported, not raised",
              assertionCode: py`_res = motion_detected("garage")
assert _res.get("ok") is False and "garage" in str(_res.get("error")), f"A room without a sensor should return ok False and mention the room, got {_res}"`,
            },
            {
              id: "t4",
              description: "lights follow you, wired with lambdas",
              assertionCode: py`for _room in Room:
    devices[f"{_room.value}_light"].execute("off")
motion_detected("kitchen")
assert devices["kitchen_light"].is_on, "Motion in the kitchen should switch the kitchen light on"
assert not devices["hall_light"].is_on and not devices["living_light"].is_on, "Only the room with motion should light up"
motion_detected("hall")
assert devices["hall_light"].is_on, "Every room needs its own wiring, not just the last one in the loop"
for _room in Room:
    devices[f"{_room.value}_light"].execute("off")`,
            },
            {
              id: "t5",
              description: "count_visit tallies visits",
              assertionCode: py`visit_counts.update({r.value: 0 for r in Room})
motion_detected("hall")
motion_detected("hall")
motion_detected("living")
assert visit_counts == {"hall": 2, "living": 1, "kitchen": 0, "bedroom": 0}, f"Each motion should register exactly one visit for its room, counts are {visit_counts}"
count_visit("kitchen")
assert visit_counts["kitchen"] == 1, "count_visit(room) should add one"
for _room in Room:
    devices[f"{_room.value}_light"].execute("off")`,
            },
            {
              id: "t6",
              description: "busiest_rooms ranks with a lambda key",
              assertionCode: py`import json as _json
_saved = dict(visit_counts)
visit_counts.update({"hall": 1, "living": 5, "kitchen": 5, "bedroom": 0})
_rank = busiest_rooms()
_json.dumps(_rank)
assert _rank == [{"room": "kitchen", "visits": 5}, {"room": "living", "visits": 5}, {"room": "hall", "visits": 1}, {"room": "bedroom", "visits": 0}], f"Rooms should be ordered by visits (most first), ties alphabetical. Got {_rank}"
visit_counts.update({"hall": 0, "living": 0, "kitchen": 0, "bedroom": 0})
assert [r["room"] for r in busiest_rooms()] == ["bedroom", "hall", "kitchen", "living"], "With all counts equal the order should be alphabetical"
visit_counts.update(_saved)`,
            },
          ],
          unlocks: ["sh-traffic"],
          checks: [
            {
              prompt: `Which of these CANNOT be written as a lambda?`,
              question: {"type":"choice","options":["`lambda room: room.upper()`","`lambda: None`","`lambda a, b: a if a > b else b`","A function whose body assigns to a variable and then returns it"],"answer":3},
              explanation: `A lambda body is a single expression. Assignments, \`raise\`, \`try\`, loops and multi-step logic are statements, so they need a \`def\`. The conditional expression \`a if a > b else b\` is still one expression, which is why the second option is fine.`,
            },
            {
              prompt: `Three callbacks are registered for the hall. The second one raises an exception. With the simple registry from this lesson, what happens?`,
              question: {"type":"choice","options":["The exception propagates out of motion_detected and the third callback never runs","The third callback still runs and the error is logged","All three callbacks are cancelled and then re-run","Python retries the second callback"],"answer":0},
              explanation: `A plain \`for callback in callbacks: callback(room)\` loop has no protection. Making an event system robust to bad listeners is one of the jobs of the event bus you will build in chapter 3.`,
            },
          ],
        },
        {
          id: "smart-home-7-closures",
          title: "Closures and function factories",
          minutes: 22,
          xp: 150,
          concepts: ["closures","nonlocal","function factories","late binding","functools.partial","multicast chain"],
          learn: `### Functions that remember

When \`by_kind(kind)\` returned \`matches\`, something subtle happened: \`matches\` kept using \`kind\` long after \`by_kind\` had finished. A function that carries variables from the scope where it was created is a **closure**.

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

Each call to \`make_counter\` creates a fresh \`count\` and a fresh \`bump\`, so the two counters never interfere. A closure is private, long-lived state without a class.

### \`nonlocal\`

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

Mutating an outer list or dict (\`items.append(x)\`, \`data[key] = y\`) is not rebinding, so it needs no \`nonlocal\`.

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

\`movie\` and \`reading\` are two different functions. This is also how you build a **multicast delegate**: \`chain(*routines)\` returns one routine that runs a whole list in order, the Python cousin of \`+=\` on a C# delegate.

### The late-binding trap

A closure captures the **variable**, not the value it had when the closure was created. A \`for\` loop reuses one variable, so every function made in the loop sees its final value:

~~~python
toggles = []
for room in ["hall", "living", "kitchen"]:
    toggles.append(lambda: print("toggling", room))

toggles[0]()      # toggling kitchen   <- not hall!
~~~

By the time you call them, the loop is over and \`room\` is \`"kitchen"\`. (C# and Java avoid part of this: C# gives each \`foreach\` iteration a fresh variable, and Java only lets you capture variables that never change.) There are three standard fixes:

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
- Forgetting \`nonlocal\` when a closure assigns to a captured variable.
- Using a closure when a class would be clearer. Two or three bits of state with several operations usually want a class; a single counter or a configured function is a perfect closure.
- Capturing a mutable object and then being surprised that all closures share it.`,
          mission: `Movie night, reading, a gentle morning: people think in **scenes**, not individual lamps. Each scene is a routine you configure once ("dim to 15, close the blinds") and trigger later.

Write the factories that stamp those routines out, a \`chain\` to combine them, and a counter that remembers how often each scene is used. The Scenes row in the scene shows a chip for every preset in your table, with the usage count your closures keep.`,
          tasks: [
            "dim_lights(level) and blinds_to(position): factories that return routines",
            "chain(*routines): combine routines into one, like a multicast delegate",
            "make_counter() with nonlocal, and make_toggle(device_id) with ROOM_TOGGLES built safely in a loop",
            "PRESETS, preset_uses (one counter each), run_preset(name) and preset_names()",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: closures and function factories.
def dim_lights(level):
    ...  # return a routine (takes devs) that dims every light to level


def blinds_to(position):
    ...  # return a routine that sets every blinds device to position


def chain(*routines):
    ...  # return ONE routine that runs the given routines in order


def make_counter():
    ...  # return a function that returns 1, then 2, then 3 ... (use nonlocal)


def make_toggle(device_id):
    ...  # return a function that flips that light and returns whether it is now on


ROOM_TOGGLES = {}  # room name -> toggle for that room's light, built with make_toggle


PRESETS = {}  # "movie": lights 15 + blinds closed, "reading": lights 70,
#               "morning": lights 40 + blinds open, "night_light": lights 5 + blinds closed
preset_uses = {}  # preset name -> its own counter


def run_preset(name):
    ...  # run the preset on devices -> {"ok": True, "preset": name, "times": n}; unknown -> {"ok": False, ...}


def preset_names():
    ...
`,
          solutionAdd: py`def dim_lights(level: int) -> Routine:
    def routine(devs: dict[str, Device]) -> None:
        apply_to(select(devs.values(), by_kind(Kind.LIGHT)), lambda light: light.execute("dim", level))

    return routine


def blinds_to(position: int) -> Routine:
    def routine(devs: dict[str, Device]) -> None:
        apply_to(select(devs.values(), by_kind(Kind.BLINDS)), lambda blinds: blinds.execute("position", position))

    return routine


def chain(*routines: Routine) -> Routine:
    def combined(devs: dict[str, Device]) -> None:
        for routine in routines:
            routine(devs)

    return combined


def make_counter() -> Callable[[], int]:
    count = 0

    def bump() -> int:
        nonlocal count
        count += 1
        return count

    return bump


def make_toggle(device_id: str) -> Callable[[], bool]:
    def toggle() -> bool:
        light = devices[device_id]
        light.execute("off" if light.is_on else "on")
        return light.is_on

    return toggle


ROOM_TOGGLES = {room.value: make_toggle(f"{room.value}_light") for room in Room}

PRESETS: dict[str, Routine] = {
    "movie": chain(dim_lights(15), blinds_to(0)),
    "reading": dim_lights(70),
    "morning": chain(dim_lights(40), blinds_to(100)),
    "night_light": chain(dim_lights(5), blinds_to(0)),
}
preset_uses = {name: make_counter() for name in PRESETS}


def run_preset(name: str) -> dict[str, Any]:
    preset = PRESETS.get(name)
    if preset is None:
        return {"ok": False, "error": f"no preset called {name!r}"}
    preset(devices)
    return {"ok": True, "preset": name, "times": preset_uses[name]()}


def preset_names() -> list[str]:
    return list(PRESETS)`,
          explanation: `dim_lights(15) and dim_lights(70) are two different functions because each call to the factory creates a new level variable for its routine to capture. make_counter relies on nonlocal so bump can rebind count. ROOM_TOGGLES goes through make_toggle on purpose: a lambda written directly in the loop would share one variable and every toggle would hit the last room.`,
          hints: [
            { id: "h1", title: "Factories", content: `def dim_lights(level): define an inner def routine(devs) that does apply_to(select(devs.values(), by_kind(Kind.LIGHT)), lambda light: light.execute("dim", level)), then return routine (no parentheses). blinds_to is the same with Kind.BLINDS and "position".` },
            { id: "h2", title: "State and chaining", content: `make_counter: count = 0 outside, def bump(): nonlocal count; count += 1; return count, and return bump. chain(*routines) defines def combined(devs): for routine in routines: routine(devs) and returns combined. make_toggle(device_id) returns a toggle() that flips devices[device_id].` },
            { id: "h3", title: "Tables", content: `ROOM_TOGGLES = {room.value: make_toggle(f"{room.value}_light") for room in Room}. PRESETS maps names to chain(dim_lights(15), blinds_to(0)) and friends. preset_uses = {name: make_counter() for name in PRESETS}; run_preset calls preset_uses[name]() for the count.` },
          ],
          tests: [
            {
              id: "t1",
              description: "dim_lights remembers its level",
              assertionCode: py`_fleet = build_devices(CATALOG)
_movie, _bright = dim_lights(20), dim_lights(80)
assert callable(_movie) and _movie is not _bright, "dim_lights(level) should return a new routine each time"
_movie(_fleet)
assert [d.level for d in _fleet.values() if isinstance(d, Light)] == [20, 20, 20, 20], "A routine made with dim_lights(20) should dim every light to 20"
_bright(_fleet)
_movie(_fleet)
assert all(d.level == 20 for d in _fleet.values() if isinstance(d, Light)), "Making dim_lights(80) must not change what the first routine does: each closure keeps its own level"
assert _fleet["living_blinds"].position == 100 and _fleet["living_speaker"].playing is False, "dim_lights must only touch lights"`,
            },
            {
              id: "t2",
              description: "blinds_to sets every blinds device",
              assertionCode: py`_fleet = build_devices(CATALOG)
blinds_to(0)(_fleet)
assert _fleet["living_blinds"].position == 0 and _fleet["bedroom_blinds"].position == 0, "blinds_to(0) should close both blinds"
blinds_to(40)(_fleet)
assert _fleet["living_blinds"].position == 40 and _fleet["bedroom_blinds"].position == 40, "blinds_to(40) should set both blinds to 40"
assert all(d.level == 0 for d in _fleet.values() if isinstance(d, Light)), "blinds_to must not touch the lights"`,
            },
            {
              id: "t3",
              description: "chain runs routines in order",
              assertionCode: py`_order = []
def _make_step(label):
    def step(devs):
        _order.append((label, len(devs)))
    return step
_fleet = build_devices(CATALOG)
_both = chain(_make_step("a"), _make_step("b"), _make_step("c"))
assert callable(_both), "chain(...) should return a routine"
assert _order == [], "chain() must not run anything until the routine it returns is called"
_both(_fleet)
assert _order == [("a", 13), ("b", 13), ("c", 13)], f"The routines should run in order, each receiving the devices dict. Got {_order}"
chain()(_fleet)
_nested = chain(chain(_make_step("x")), _make_step("y"))
_order.clear()
_nested(_fleet)
assert [label for label, _ in _order] == ["x", "y"], "A chain can contain other chains"`,
            },
            {
              id: "t4",
              description: "make_counter keeps private state",
              assertionCode: py`_a, _b = make_counter(), make_counter()
assert [_a(), _a(), _a()] == [1, 2, 3], "A counter should return 1, 2, 3 ... on successive calls (you need nonlocal)"
assert _b() == 1, "Each counter has its own count"
assert _a() == 4, "Using b must not disturb a"`,
            },
            {
              id: "t5",
              description: "One toggle per room, none mixed up",
              assertionCode: py`_dev_ids = [f"{r}_light" for r in ("hall", "living", "kitchen", "bedroom")]
for _i in _dev_ids:
    devices[_i].execute("off")
assert set(ROOM_TOGGLES) == {"hall", "living", "kitchen", "bedroom"}, f"ROOM_TOGGLES needs one entry per room, got {sorted(ROOM_TOGGLES)}"
assert ROOM_TOGGLES["bedroom"]() is True, "Toggling an off light should switch it on and return True"
assert [devices[i].is_on for i in _dev_ids] == [False, False, False, True], "Only the bedroom light should have changed. If every toggle hits the same room you have fallen into late binding: build each toggle with make_toggle"
assert ROOM_TOGGLES["hall"]() is True and ROOM_TOGGLES["bedroom"]() is False, "Toggle again to switch off and return False"
for _i in _dev_ids:
    devices[_i].execute("off")`,
            },
            {
              id: "t6",
              description: "The presets do what they say",
              assertionCode: py`_expected = {"movie": (15, 0), "reading": (70, None), "morning": (40, 100), "night_light": (5, 0)}
for _name, (_lights, _blinds) in _expected.items():
    assert _name in PRESETS, f"PRESETS is missing {_name!r}"
    _fleet = build_devices(CATALOG)
    PRESETS[_name](_fleet)
    _levels = {d.level for d in _fleet.values() if isinstance(d, Light)}
    assert _levels == {_lights}, f"{_name}: every light should be at {_lights}, got {_levels}"
    if _blinds is not None:
        assert _fleet["living_blinds"].position == _blinds, f"{_name}: the blinds should be at {_blinds}"`,
            },
            {
              id: "t7",
              description: "run_preset counts uses per preset",
              assertionCode: py`_first = run_preset("movie")
assert _first == {"ok": True, "preset": "movie", "times": 1}, f"The first run of a preset should report times 1, got {_first}"
assert devices["kitchen_light"].level == 15 and devices["living_blinds"].position == 0, "run_preset should apply the preset to the global devices"
assert run_preset("movie")["times"] == 2, "The second run should report times 2"
assert run_preset("reading")["times"] == 1, "Each preset has its own counter: reading was only used once"
assert run_preset("movie")["times"] == 3, "Using reading must not disturb the movie counter"
devices["living_blinds"].execute("open")
for _i in ("hall_light", "living_light", "kitchen_light", "bedroom_light"):
    devices[_i].execute("off")`,
            },
            {
              id: "t8",
              description: "Unknown presets and the name list",
              assertionCode: py`import json as _json
_res = run_preset("disco")
assert _res.get("ok") is False and "disco" in str(_res.get("error")), f"An unknown preset should return ok False and mention the name, got {_res}"
assert preset_names() == list(PRESETS) and len(preset_names()) == 4, "preset_names() should list the keys of PRESETS"
_json.dumps(preset_names())`,
            },
          ],
          unlocks: ["sh-scenes"],
          checks: [
            {
              prompt: `What does this print?

~~~python
fns = []
for n in [1, 2, 3]:
    fns.append(lambda: n)
print([f() for f in fns])
~~~`,
              question: {"type":"choice","options":["It raises a NameError","[1, 2, 3]","[3, 3, 3]","[0, 0, 0]"],"answer":2},
              explanation: `Each lambda captures the *variable* \`n\`, not its value at that moment. After the loop \`n\` is 3, so every call returns 3. Fix it with a factory, \`lambda n=n: n\`, or \`functools.partial\`.`,
            },
            {
              prompt: `When is \`nonlocal\` required inside a closure?`,
              question: {"type":"choice","options":["When the closure rebinds (assigns to) an outer variable","Whenever the closure reads an outer variable","When the closure calls an outer function","When the closure appends to an outer list"],"answer":0},
              explanation: `Reading, calling and mutating (\`items.append(...)\`) all work without a declaration. Only assignment such as \`count += 1\` makes Python treat the name as local, so you must say \`nonlocal count\` to rebind the outer one.`,
            },
          ],
        },
        {
          id: "smart-home-8-decorators",
          title: "Decorators: logging, timing, retry",
          minutes: 25,
          xp: 160,
          concepts: ["decorators","functools.wraps","*args / **kwargs","decorators with arguments","stacking order","try / finally"],
          learn: `### Wrapping a function without touching it

Suppose you want every command the house receives to be written to an audit trail, timed, or retried when the radio drops a message. Pasting logging code into each function would bury what they actually do. A **decorator** adds that behaviour from the outside: it takes a function and returns a new function that does extra work around the original.

~~~python
def logged(func):
    def wrapper(*args, **kwargs):
        print("calling", func.__name__)
        # run the original
        result = func(*args, **kwargs)
        print("done")
        # hand back what it returned
        return result
    # the replacement
    return wrapper

@logged
def lights_on():
    ...

# the @ line is just shorthand for:  lights_on = logged(lights_on)
~~~

\`*args, **kwargs\` means "accept anything and pass it along", so one decorator fits functions with any signature. Other languages reach the same goal with different tools: middleware pipelines and \`DispatchProxy\` in C#, annotations handled by a proxy (Spring AOP) in Java, and the classic *decorator pattern*, a wrapper with the same interface as the thing it wraps. Python just makes the wrapper a one-line \`@\` away.

### Keep the original's identity: \`functools.wraps\`

Without help, the wrapper *replaces* the function, including its name and docstring, which confuses logs, tracebacks and \`help()\`. One line fixes it:

~~~python
import functools

def logged(func):
    # copies __name__, __doc__, and sets __wrapped__
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        ...
    return wrapper
~~~

### Do the work around the call

A wrapper can run code before, after, instead of, or around the original:

- **Logging**: record the arguments and the result. If the original raises, record that too and re-raise with a bare \`raise\` so the caller still sees the real error.
- **Timing**: note the start, call, and report the elapsed time in a \`finally\` block so it is recorded even when the function fails. Use \`time.perf_counter()\` for durations.
- **Retrying**: call in a loop, catch the failures you expect, and give up (re-raise) after the last attempt.

### Decorators with arguments

\`@retry(times=3)\` first *calls* \`retry(3)\`, which must return the real decorator. So there are three layers: a factory taking the options, the decorator taking the function, and the wrapper taking the call.

~~~python
def retry(times=3):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            ...
        return wrapper
    return decorator

# retry(5) returns decorator, which then wraps the function
@retry(times=5)
def send(...): ...
~~~

It is the closure lesson again: \`times\` and \`func\` are captured by the layers inside.

### Stacking order

~~~python
# same as: send = logged(timed(send))
@logged
@timed
def send(...): ...
~~~

Decorators are *applied* from the bottom up, so \`timed\` wraps \`send\` first and \`logged\` wraps that. When you call it, the outermost wrapper runs first. Think of layers of wrapping paper: you open the outside layer first. Swapping the two lines changes which one measures the other.

### Decorating something that already exists

\`command = logged(command)\` is exactly what \`@logged\` would have done had the decorator been available earlier. It is how you add behaviour to a function from another module, or one defined earlier in the same file.

### Common mistakes

- Forgetting \`return result\` in the wrapper, so every decorated function suddenly returns \`None\`.
- Forgetting \`return wrapper\` at the end of the decorator.
- Writing \`@retry\` when you meant \`@retry()\` or \`@retry(times=3)\`: the function becomes the \`times\` argument.
- Swallowing exceptions in the wrapper: a logging decorator should log and re-raise, not hide the failure.
- Retrying an action that is not safe to repeat (charging a card, sending an email). Retry things that are *idempotent*.
- Leaving out \`functools.wraps\`, then wondering why every function in your logs is called \`wrapper\`.`,
          mission: `The family wants to know who (or what) told the lights to turn on at 3 a.m. Every command that reaches the hub should leave a trace, and flaky radios should not make a command fail on the first dropped message.

Write the decorators once and apply them to the hub's entry points. The scene's Audit trail shows each call as it happens: the function, its arguments and what it returned.`,
          tasks: [
            "audit(line) and call_log(): a bounded trail of the newest 60 lines",
            "logged: record name(args) -> result, or the error, and keep the function's identity with functools.wraps",
            "timed (with try/finally) and retry(times, on): a decorator that takes arguments",
            "Apply logged to command, run_routine, run_preset and motion_detected, then use the scene and read the trail",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: decorators.
import functools
import time
from collections import deque

call_entries: deque[str] = deque(maxlen=60)  # the newest 60 audit lines


def audit(line):
    ...  # remember one audit line


def call_log():
    ...  # the audit lines as a list, oldest first


def _brief(value, limit=60):
    ...  # repr(value), cut to limit characters with "..." at the end if it is longer


def logged(func):
    ...
    # wrapper(*args, **kwargs) -> audit "name(arg1, key=value) -> result" using _brief for each part;
    # if func raises, audit "name(...) raised ErrorType: message" and re-raise. Keep func's identity.


def timed(func):
    ...  # audit "name took 0.12 ms" after every call, even if func raises; return func's result


def retry(times=3, on=(Exception,)):
    ...
    # decorator with arguments: try up to "times" times, retrying only the exceptions listed in "on".
    # audit "name failed (message); retry 1/2" before each retry; after the last attempt re-raise.
    # times below 1 is a ValueError (raised when retry(...) is called).


# Decorate the hub's entry points (a decorator is just a function: x = logged(x))
`,
          solutionAdd: py`import functools
import time
from collections import deque

call_entries: deque[str] = deque(maxlen=60)


def audit(line: str) -> None:
    call_entries.append(line)


def call_log() -> list[str]:
    return list(call_entries)


def _brief(value: Any, limit: int = 60) -> str:
    text = repr(value)
    return text if len(text) <= limit else text[: limit - 3] + "..."


def logged(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        shown = ", ".join([_brief(arg) for arg in args] + [f"{key}={_brief(val)}" for key, val in kwargs.items()])
        try:
            result = func(*args, **kwargs)
        except Exception as err:
            audit(f"{func.__name__}({shown}) raised {type(err).__name__}: {err}")
            raise
        audit(f"{func.__name__}({shown}) -> {_brief(result)}")
        return result

    return wrapper


def timed(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        started = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            elapsed_ms = (time.perf_counter() - started) * 1000
            audit(f"{func.__name__} took {elapsed_ms:.2f} ms")

    return wrapper


def retry(times: int = 3, on: tuple[type[BaseException], ...] = (Exception,)):
    if times < 1:
        raise ValueError("times must be at least 1")

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except on as err:
                    if attempt == times:
                        raise
                    audit(f"{func.__name__} failed ({err}); retry {attempt}/{times - 1}")

        return wrapper

    return decorator


command = logged(command)
run_routine = logged(run_routine)
run_preset = logged(run_preset)
motion_detected = logged(motion_detected)`,
          explanation: `logged() wraps a function without changing its signature, because *args and **kwargs pass everything through. functools.wraps keeps the name and docstring so the audit lines say command, not wrapper. retry(times, on) has three layers (options, decorator, wrapper) and each captures what it needs, which is the closure lesson in action. Stacking order matters because the outermost wrapper sees the results of everything inside it.`,
          hints: [
            { id: "h1", title: "The trail", content: `audit appends to call_entries and call_log returns list(call_entries). _brief: text = repr(value); return text if len(text) <= limit else text[:limit - 3] + "...".` },
            { id: "h2", title: "logged", content: `Put @functools.wraps(func) above def wrapper(*args, **kwargs). Build shown = ", ".join([_brief(a) for a in args] + [f"{k}={_brief(v)}" for k, v in kwargs.items()]). try: result = func(*args, **kwargs) / except Exception as err: audit the failure and use a bare raise / then audit the result and return it.` },
            { id: "h3", title: "retry and applying", content: `retry has three layers: def retry(times=3, on=(Exception,)): def decorator(func): def wrapper(*args, **kwargs): for attempt in range(1, times + 1): try: return func(...) except on as err: if attempt == times: raise; audit(...). Return wrapper, then decorator. Apply with command = logged(command) and the same for the other three.` },
          ],
          tests: [
            {
              id: "t1",
              description: "logged records the call and passes the result through",
              assertionCode: py`@logged
def _add(a, b=0):
    return a + b
assert _add(2, b=3) == 5, "A logged function must still return its result"
assert call_log()[-1] == "_add(2, b=3) -> 5", f"Expected the audit line '_add(2, b=3) -> 5', got {call_log()[-1:]}"
_add("x", "y")
assert call_log()[-1] == "_add('x', 'y') -> 'xy'", f"Arguments and results are shown with repr(), got {call_log()[-1:]}"`,
            },
            {
              id: "t2",
              description: "logged records failures and re-raises them",
              assertionCode: py`@logged
def _boom(n):
    raise ValueError(f"bad {n}")
try:
    _boom(7)
except ValueError as _err:
    assert str(_err) == "bad 7", "The original exception should reach the caller unchanged"
else:
    raise AssertionError("logged must re-raise: the caller still has to see the error")
assert call_log()[-1] == "_boom(7) raised ValueError: bad 7", f"Expected '_boom(7) raised ValueError: bad 7', got {call_log()[-1:]}"`,
            },
            {
              id: "t3",
              description: "Long values are shortened and wraps keeps the identity",
              assertionCode: py`@logged
def _shout(text):
    """Make some noise."""
    return text.upper()
_shout("a" * 500)
assert len(call_log()[-1]) < 200, f"Long arguments and results should be cut short with _brief (the line was {len(call_log()[-1])} characters)"
assert call_log()[-1].endswith("..."), "A shortened result should end with ..."
assert _shout.__name__ == "_shout" and _shout.__doc__ == "Make some noise.", "Use @functools.wraps(func) so the wrapper keeps the name and docstring"
assert _shout.__wrapped__("q") == "Q", "functools.wraps should also expose the original as __wrapped__"`,
            },
            {
              id: "t4",
              description: "timed reports a duration, even on failure",
              assertionCode: py`@timed
def _quick():
    return "done"
assert _quick() == "done", "A timed function must still return its result"
assert call_log()[-1].startswith("_quick took ") and call_log()[-1].endswith(" ms"), f"Expected '_quick took 0.01 ms' style, got {call_log()[-1:]}"
@timed
def _fails():
    raise RuntimeError("oops")
try:
    _fails()
except RuntimeError:
    pass
else:
    raise AssertionError("timed must not swallow exceptions")
assert call_log()[-1].startswith("_fails took "), "timed should report the duration even when the function raises (use try/finally)"`,
            },
            {
              id: "t5",
              description: "retry tries again for the errors it is told about",
              assertionCode: py`_calls = []
@retry(times=3, on=(ConnectionError,))
def _flaky():
    _calls.append(1)
    if len(_calls) < 3:
        raise ConnectionError("radio dropped")
    return "sent"
assert _flaky() == "sent" and len(_calls) == 3, f"Two failures then success should return the value after 3 calls, calls={len(_calls)}"
assert any("failed (radio dropped); retry 1/2" in line for line in call_log()), "Each failed attempt should be audited as 'name failed (message); retry 1/2'"
_calls.clear()
@retry(times=2, on=(ConnectionError,))
def _always():
    _calls.append(1)
    raise ConnectionError("still down")
try:
    _always()
except ConnectionError as _err:
    assert str(_err) == "still down", "After the last attempt the original error should be raised"
else:
    raise AssertionError("When every attempt fails, retry must re-raise")
assert len(_calls) == 2, f"times=2 means exactly two attempts, got {len(_calls)}"`,
            },
            {
              id: "t6",
              description: "retry ignores other errors and validates its options",
              assertionCode: py`_calls.clear()
@retry(times=5, on=(ConnectionError,))
def _wrong():
    _calls.append(1)
    raise KeyError("not a radio problem")
try:
    _wrong()
except KeyError:
    pass
else:
    raise AssertionError("Errors outside 'on' should be raised immediately")
assert len(_calls) == 1, f"A KeyError is not in on=(ConnectionError,), so there should be no retries (calls={len(_calls)})"
try:
    retry(times=0)
except ValueError:
    pass
else:
    raise AssertionError("retry(times=0) should raise ValueError straight away")
@retry()
def _plain():
    return 42
assert _plain() == 42 and _plain.__name__ == "_plain", "retry() with defaults should work and keep the name"`,
            },
            {
              id: "t7",
              description: "The order of stacked decorators matters",
              assertionCode: py`@logged
@timed
def _inner_timed():
    return 1
_inner_timed()
_lines = call_log()[-2:]
assert _lines[0].startswith("_inner_timed took ") and _lines[1] == "_inner_timed() -> 1", f"With @logged above @timed, timed finishes first, then logged. Got {_lines}"
@timed
@logged
def _inner_logged():
    return 2
_inner_logged()
_lines = call_log()[-2:]
assert _lines[0] == "_inner_logged() -> 2" and _lines[1].startswith("_inner_logged took "), f"With @timed above @logged, logged finishes first. Got {_lines}"`,
            },
            {
              id: "t8",
              description: "The hub's entry points leave an audit trail",
              assertionCode: py`import json as _json
devices["kitchen_light"].execute("off")
_res = command("kitchen_light", "dim", 30)
assert _res["ok"] is True and _res["state"]["level"] == 30, "Decorating command must not change what it returns"
assert call_log()[-1].startswith("command('kitchen_light', 'dim', 30) -> "), f"command should be logged, last line: {call_log()[-1:]}"
assert command.__name__ == "command", "command should keep its name after decoration"
run_routine("lights_off")
assert call_log()[-1] == "run_routine('lights_off') -> {'ok': True, 'routine': 'lights_off'}", f"run_routine should be logged too, got {call_log()[-1:]}"
run_preset("reading")
assert call_log()[-1].startswith("run_preset('reading')"), "run_preset should be logged"
motion_detected("hall")
assert call_log()[-1].startswith("motion_detected('hall')"), "motion_detected should be logged"
devices["hall_light"].execute("off")
devices["living_blinds"].execute("open")
for _i in ("living_light", "kitchen_light", "bedroom_light"):
    devices[_i].execute("off")
_json.dumps(call_log())
for _n in range(100):
    audit(f"line {_n}")
assert len(call_log()) <= 60 and call_log()[-1] == "line 99", "The audit trail should keep only the newest 60 lines"`,
            },
          ],
          unlocks: ["sh-audit"],
          checks: [
            {
              prompt: `With this stacking, which wrapper runs *first* when \`send()\` is called?

~~~python
@logged
@timed
def send(): ...
~~~`,
              question: {"type":"choice","options":["send itself","logged's wrapper","They run at the same time","timed's wrapper"],"answer":1},
              explanation: `\`@logged @timed def send\` means \`send = logged(timed(send))\`. The outermost wrapper (\`logged\`) is entered first and calls the one inside it. They are *applied* bottom-up but *entered* top-down.`,
            },
            {
              prompt: `You write \`@retry\` (no parentheses) above a function, but \`retry\` is defined as \`def retry(times=3): ...\`. What happens?`,
              question: {"type":"choice","options":["times defaults to 3 and the function runs 3 times","It works exactly like @retry()","Python raises a SyntaxError","The function is passed as `times`, so the name is rebound to the inner decorator instead of the wrapped function"],"answer":3},
              explanation: `A decorator with arguments is a factory: you must call it, \`@retry()\` or \`@retry(times=3)\`. Without the call, your function ends up as \`times\`, and the decorated name now refers to the inner \`decorator\` function, which is a classic hard-to-spot bug.`,
            },
            {
              prompt: `What breaks if a \`logged\` wrapper forgets \`return result\`?`,
              question: {"type":"choice","options":["Python raises an error at decoration time","Every decorated function silently returns None","Nothing: the original function's return value is kept automatically","Only functions with arguments are affected"],"answer":1},
              explanation: `The wrapper *replaces* the function, so whatever it returns is what callers get. Always return the original's result (and re-raise errors rather than swallowing them).`,
            },
          ],
        },
      ],
    },
    {
      id: "observer",
      title: "Observer",
      blurb: "Build an event bus so the house reacts without everything knowing everything.",
      lessons: [
        {
          id: "smart-home-9-event-bus",
          title: "The observer pattern: an event bus",
          minutes: 28,
          xp: 190,
          concepts: ["observer pattern","publish / subscribe","unsubscribe handles","delivery order","frozen dataclass events","wildcards"],
          learn: `### From callbacks to an event bus

Last chapter ended with a list of weaknesses: callbacks cannot be removed, there is one registry per kind of event, and one failure ruins the rest. The **observer pattern** fixes that by putting a small object in the middle. Publishers announce *what happened*; subscribers say *what they care about*; neither knows the other exists.

~~~python
# "tell me when motion happens"
bus.subscribe("motion", lights_follow)
# "motion happened in the kitchen"
bus.emit("motion", {"room": "kitchen"})
~~~

The motion sensor does not know the light exists. You can add a logger, a heating rule or a mobile alert tomorrow without touching the sensor. This is the same idea as C# events (\`sensor.Motion += handler\`, or \`IObservable<T>\`), Java's listeners and \`Flow.Subscriber\`, and JavaScript's \`emitter.on(...)\` / \`emitter.emit(...)\`. Python's standard library has no general-purpose one, so you are going to write it. It is under fifty lines.

### Events are data

An event is *what happened*, not a command. Model it as a small immutable record: a name, a payload and a sequence number the bus assigns.

~~~python
@dataclass(frozen=True)
class Event:
    name: str
    # fresh dict per event
    payload: dict = field(default_factory=dict)
    seq: int = 0
~~~

Keep payloads JSON-friendly (strings, numbers, booleans, lists, dicts). Then they can be logged, shown on a dashboard, or sent over a network without conversion.

### The bus

Three operations matter:

- \`subscribe(name, handler)\` registers a handler and returns an **unsubscribe function**. A function that removes *this* registration is more reliable than \`off(handler)\`, because the same lambda or function can be registered twice, and an anonymous lambda cannot be found again to remove it.
- \`emit(name, payload)\` creates the event, records it in a bounded \`history\` (so a log can show it), calls every handler and returns how many were called.
- \`"*"\` is a wildcard name: handlers subscribed to \`"*"\` receive every event. Useful for logs and rule engines.

### Delivery rules (decide them on purpose)

Every bus must answer these questions. Writing the answers down is what separates a bus from a pile of callbacks.

- **Order**: handlers for an event run in subscription order; wildcard handlers run after the named ones.
- **Synchronous**: \`emit\` returns after all handlers ran. A handler that emits another event runs that event's handlers right away (depth-first), but sequence numbers still show which came first.
- **Changes during delivery**: handlers may subscribe or unsubscribe while an event is being delivered. Iterating over the live list while it changes is a classic bug. Take a **copy** of the listeners at the start. Then: a handler added during delivery does *not* see the current event, and one removed during delivery is *skipped* (check an \`active\` flag before calling).
- **Isolation of data**: copy the payload dictionary so a publisher that mutates its dict afterwards cannot rewrite history.
- **Failing handlers**: for now an exception inside a handler escapes \`emit\` and the remaining handlers never run. The \`lights_follow\` handler below is deliberately strict (a bad room raises \`KeyError\`) so you can watch that happen. Lesson 10 makes the bus survive it.

### One kind of event, many kinds of listener

~~~python
# keep the return value
stop = bus.subscribe("door", on_door)
...
# later: no more door events for on_door
stop()
# calling twice is harmless
stop()
~~~

The returned \`stop\` is a closure over the subscription, exactly like the counters from lesson 7.

### Common mistakes

- Modifying the handler list while looping over it, so a handler gets skipped or called twice.
- Handlers that emit the event they listen to: an endless loop. Guard against it by design (different event names), not by hope.
- Forgetting that handlers run on the publisher's turn: a slow handler slows every \`emit\`.
- Putting objects that are not plain data in payloads.
- Assuming order across *different* events. Only the order of one \`emit\` call is guaranteed.`,
          mission: `Time to replace the pile of callbacks with a real **event bus**. Everything that happens in the house (movement, doors, temperature, the clock) becomes an event with a name and a payload, and anything can listen.

Build the bus, give it a log, and attach the first listener. In the scene, the Event log streams every message as you walk, open the door or move the clock.`,
          tasks: [
            "Event: a frozen dataclass (name, payload with a default factory, seq) with to_dict()",
            "EventBus.subscribe (returns an unsubscribe function), listener_count and a bounded history",
            "EventBus.emit: copy the payload, number the event, deliver to named handlers then \"*\" handlers, skipping cancelled ones",
            "bus, world_event, event_log and a first listener, lights_follow, connected with connect_lights",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 9: the event bus (observer pattern).
from dataclasses import dataclass, field

Payload = dict[str, Any]


@dataclass(frozen=True)
class Event:
    ...
    # name: str, payload: a fresh dict by default (field(default_factory=dict)), seq: int = 0
    # to_dict() -> {"seq": ..., "name": ..., "payload": a copy of the payload}


Handler = Callable[[Event], None]


class _Subscription:
    """Given: one registration. active goes False when it is cancelled."""

    __slots__ = ("handler", "active")

    def __init__(self, handler: Handler) -> None:
        self.handler = handler
        self.active = True


class EventBus:
    def __init__(self, history_size: int = 200) -> None:
        ...  # subscriptions per event name, the next sequence number (starts at 1), and history: a deque with maxlen

    def subscribe(self, name, handler):
        ...  # register; return an unsubscribe() function (cancels this registration, safe to call twice)

    def listener_count(self, name):
        ...  # how many active subscriptions exist for that name

    def emit(self, name, payload=None):
        ...
        # build an Event (copy the payload, next seq), record it in history, then deliver it:
        # a COPY of the listeners for the name, followed by the "*" listeners (unless name is "*"),
        # skipping any whose active flag is False. Return how many were delivered.

    def _deliver(self, subscription: _Subscription, event: Event) -> bool:
        """Given: the one place a handler is called. Returns True when it ran."""
        subscription.handler(event)
        return True


bus = EventBus()


def world_event(name, payload=None):
    ...  # what the scene calls: emit on the bus -> {"ok": True, "delivered": n}


def event_log(limit=40):
    ...  # the newest "limit" events from bus.history as dicts (to_dict), oldest first


def lights_follow(event):
    ...  # switch on the light of the room named in event.payload["room"]. Keep it strict: no checks, a bad room may raise


def connect_lights(target):
    ...  # subscribe lights_follow to "motion" on that bus; return the unsubscribe function


stop_following = connect_lights(bus)
`,
          solutionAdd: py`from dataclasses import dataclass, field

Payload = dict[str, Any]


@dataclass(frozen=True)
class Event:
    name: str
    payload: Payload = field(default_factory=dict)
    seq: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {"seq": self.seq, "name": self.name, "payload": dict(self.payload)}


Handler = Callable[[Event], None]


class _Subscription:
    """Given: one registration. active goes False when it is cancelled."""

    __slots__ = ("handler", "active")

    def __init__(self, handler: Handler) -> None:
        self.handler = handler
        self.active = True


class EventBus:
    def __init__(self, history_size: int = 200) -> None:
        self._subscriptions: dict[str, list[_Subscription]] = {}
        self._next_seq = 1
        self.history: deque[Event] = deque(maxlen=history_size)

    def subscribe(self, name: str, handler: Handler) -> Callable[[], None]:
        subscription = _Subscription(handler)
        self._subscriptions.setdefault(name, []).append(subscription)

        def unsubscribe() -> None:
            subscription.active = False
            listeners = self._subscriptions.get(name, [])
            if subscription in listeners:
                listeners.remove(subscription)

        return unsubscribe

    def listener_count(self, name: str) -> int:
        return len(self._subscriptions.get(name, []))

    def emit(self, name: str, payload: Payload | None = None) -> int:
        event = Event(name, dict(payload or {}), self._next_seq)
        self._next_seq += 1
        self.history.append(event)
        listeners = list(self._subscriptions.get(name, []))
        if name != "*":
            listeners += self._subscriptions.get("*", [])
        delivered = 0
        for subscription in listeners:
            if subscription.active and self._deliver(subscription, event):
                delivered += 1
        return delivered

    def _deliver(self, subscription: _Subscription, event: Event) -> bool:
        """Given: the one place a handler is called. Returns True when it ran."""
        subscription.handler(event)
        return True


bus = EventBus()


def world_event(name: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"ok": True, "delivered": bus.emit(name, payload)}


def event_log(limit: int = 40) -> list[dict[str, Any]]:
    return [event.to_dict() for event in list(bus.history)[-limit:]]


def lights_follow(event: Event) -> None:
    # deliberately strict: a payload without a known room raises KeyError (lesson 10 deals with that)
    devices[f"{event.payload['room']}_light"].execute("on")


def connect_lights(target: EventBus) -> Callable[[], None]:
    return target.subscribe("motion", lights_follow)


stop_following = connect_lights(bus)`,
          explanation: `The bus is the only thing that knows both sides: publishers call emit(), subscribers call subscribe(), and neither imports the other. emit() works on a copy of the listener list and checks each subscription's active flag, so handlers can safely subscribe or unsubscribe while an event is in flight. History is written before delivery, which is why a log shows an event before the events its handlers cause.`,
          hints: [
            { id: "h1", title: "Building blocks", content: `In __init__: self._subscriptions = {}, self._next_seq = 1, self.history = deque(maxlen=history_size). subscribe: create _Subscription(handler), append it with setdefault(name, []).append(...), and return an inner unsubscribe() that sets active = False and removes it from the list if still present.` },
            { id: "h2", title: "emit", content: `event = Event(name, dict(payload or {}), self._next_seq); bump _next_seq; append to history; listeners = list(self._subscriptions.get(name, [])); if name != "*": listeners += self._subscriptions.get("*", []); loop and count each subscription that is active and for which self._deliver(subscription, event) is True.` },
            { id: "h3", title: "The hooks", content: `world_event returns {"ok": True, "delivered": bus.emit(name, payload)}. event_log returns [e.to_dict() for e in list(bus.history)[-limit:]]. lights_follow is one strict line: devices[f"{event.payload['room']}_light"].execute("on"). connect_lights returns target.subscribe("motion", lights_follow).` },
          ],
          tests: [
            {
              id: "t1",
              description: "Event is a frozen dataclass with safe defaults",
              assertionCode: py`import dataclasses as _dc
assert _dc.is_dataclass(Event), "Decorate Event with @dataclass(frozen=True)"
_e1, _e2 = Event("a"), Event("b")
assert _e1.payload == {} and _e1.seq == 0, "payload should default to an empty dict and seq to 0"
assert _e1.payload is not _e2.payload, "Each Event needs its own default payload: use field(default_factory=dict)"
try:
    _e1.name = "other"
except _dc.FrozenInstanceError:
    pass
else:
    raise AssertionError("Events are facts about the past: make the dataclass frozen")
assert Event("motion", {"room": "hall"}, 7).to_dict() == {"seq": 7, "name": "motion", "payload": {"room": "hall"}}, "to_dict() should give {'seq', 'name', 'payload'}"`,
            },
            {
              id: "t2",
              description: "subscribe and emit deliver events to handlers",
              assertionCode: py`_b = EventBus()
_seen = []
_b.subscribe("door", _seen.append)
_count = _b.emit("door", {"open": True})
assert _count == 1, f"emit should return how many handlers received the event (1), got {_count!r}"
assert len(_seen) == 1 and isinstance(_seen[0], Event), "The handler should receive an Event object"
assert (_seen[0].name, _seen[0].payload, _seen[0].seq) == ("door", {"open": True}, 1), f"Unexpected event {_seen[0]}"
assert _b.emit("motion", {"room": "hall"}) == 0 and len(_seen) == 1, "Handlers only hear the event names they subscribed to"
assert _b.emit("door") == 1 and _seen[1].payload == {}, "A missing payload should become an empty dict"`,
            },
            {
              id: "t3",
              description: "Sequence numbers, history and payload copies",
              assertionCode: py`_b = EventBus(history_size=3)
_data = {"room": "hall"}
for _n in range(5):
    _b.emit("motion", _data)
_data["room"] = "changed afterwards"
assert [e.seq for e in _b.history] == [3, 4, 5], f"history should keep only the newest 3 events and seq should count 1, 2, 3 ... Got {[e.seq for e in _b.history]}"
assert all(e.payload == {"room": "hall"} for e in _b.history), "emit must copy the payload so later changes to the publisher's dict can't rewrite history"
assert EventBus().emit("x") == 0, "An event nobody listens to is still fine (0 delivered)"
_fresh = EventBus()
_fresh.emit("x")
assert [e.seq for e in _fresh.history] == [1], "Every bus counts its own sequence from 1"`,
            },
            {
              id: "t4",
              description: "unsubscribe stops delivery",
              assertionCode: py`_b = EventBus()
_a, _c = [], []
_stop_a = _b.subscribe("x", _a.append)
_b.subscribe("x", _c.append)
assert callable(_stop_a), "subscribe should return an unsubscribe function"
assert _b.listener_count("x") == 2 and _b.listener_count("nope") == 0, "listener_count should count active subscriptions"
_b.emit("x")
_stop_a()
_stop_a()
assert _b.listener_count("x") == 1, "Unsubscribing removes exactly that registration, and calling it twice is harmless"
_b.emit("x")
assert len(_a) == 1 and len(_c) == 2, "After unsubscribe the handler hears nothing more; the others are unaffected"`,
            },
            {
              id: "t5",
              description: "Order: subscription order, wildcard last",
              assertionCode: py`_order = []
_b = EventBus()
_b.subscribe("*", lambda e: _order.append("wild"))
_b.subscribe("x", lambda e: _order.append("first"))
_b.subscribe("x", lambda e: _order.append("second"))
_b.subscribe("y", lambda e: _order.append("other"))
assert _b.emit("x") == 3, "Two named handlers and the wildcard make 3 deliveries"
assert _order == ["first", "second", "wild"], f"Named handlers run in subscription order, then wildcard handlers. Got {_order}"
_order.clear()
_b.emit("*")
assert _order == ["wild"], "Emitting '*' itself must not deliver twice"`,
            },
            {
              id: "t6",
              description: "Changes during delivery are safe",
              assertionCode: py`_b = EventBus()
_log = []
_cancel = {}
def _first(e):
    _log.append("first")
    _cancel["second"]()
    _b.subscribe("x", lambda e2: _log.append("late"))
_b.subscribe("x", _first)
_cancel["second"] = _b.subscribe("x", lambda e: _log.append("second"))
_b.emit("x")
assert _log == ["first"], f"A handler cancelled during delivery must be skipped, and one added during delivery must wait for the next event. Got {_log}"
_b.emit("x")
assert _log == ["first", "first", "late"], f"On the next emit the new handler runs. Got {_log}"`,
            },
            {
              id: "t7",
              description: "Handlers may emit events too",
              assertionCode: py`_b = EventBus()
_trace = []
def _on_a(e):
    _trace.append(f"a{e.seq}")
    _b.emit("b")
    _trace.append("a done")
_b.subscribe("a", _on_a)
_b.subscribe("b", lambda e: _trace.append(f"b{e.seq}"))
_b.emit("a")
assert _trace == ["a1", "b2", "a done"], f"A nested emit is delivered immediately, with the next sequence number. Got {_trace}"
assert [e.name for e in _b.history] == ["a", "b"], "History should list events in the order they were emitted"`,
            },
            {
              id: "t8",
              description: "The hub's bus, hooks and first listener",
              assertionCode: py`import json as _json
for _i in ("hall_light", "kitchen_light", "living_light"):
    devices[_i].execute("off")
_res = world_event("motion", {"room": "kitchen"})
assert _res["ok"] is True and _res["delivered"] >= 1, f"world_event should report ok and how many handlers heard it, got {_res}"
assert devices["kitchen_light"].is_on and not devices["hall_light"].is_on, "lights_follow should switch on the light of the room in the payload"
world_event("motion", {"room": "hall"})
world_event("motion", {"room": "living"})
_log = event_log()
_json.dumps(_log)
assert [e["name"] for e in _log[-3:]] == ["motion"] * 3 and _log[-3]["payload"] == {"room": "kitchen"}, f"event_log should list recent events as dicts, oldest first. Got {_log[-3:]}"
assert len(event_log(limit=2)) == 2 and event_log(limit=2) == _log[-2:], "event_log(limit) should return only the newest events"
stop_following()
devices["kitchen_light"].execute("off")
world_event("motion", {"room": "kitchen"})
assert not devices["kitchen_light"].is_on, "stop_following() should disconnect the lights"
_other = EventBus()
_stop = connect_lights(_other)
_other.emit("motion", {"room": "hall"})
assert devices["hall_light"].is_on and callable(_stop), "connect_lights(bus) should work on any bus and return an unsubscribe function"
devices["hall_light"].execute("off")`,
            },
          ],
          unlocks: ["sh-eventlog"],
          checks: [
            {
              prompt: `Why does \`emit()\` loop over a *copy* of the listeners list?`,
              question: {"type":"choice","options":["Python forbids looping over the original list","A handler may subscribe or unsubscribe during delivery, and changing a list while looping over it skips or repeats items","So that handlers receive a copy of the event","Copies are faster to iterate"],"answer":1},
              explanation: `Mutating a list you are iterating is a classic source of skipped handlers. A snapshot taken at the start makes the rules simple: who is called is decided when \`emit\` begins, and an \`active\` flag lets cancelled subscriptions opt out.`,
            },
            {
              prompt: `What is the main advantage of \`subscribe()\` returning an unsubscribe *function* instead of offering \`bus.off(handler)\`?`,
              question: {"type":"choice","options":["It prevents the handler from ever being called again by any bus","It removes exactly the registration you made, even for anonymous lambdas or a function subscribed twice","It is the only way Python can remove an item from a list","It makes emit() faster"],"answer":1},
              explanation: `\`off(handler)\` needs to find the handler again, which is impossible for a lambda you did not keep a reference to and ambiguous if the same function was registered twice. The returned closure remembers the exact subscription.`,
            },
            {
              prompt: `Which statement about the observer pattern is true?`,
              question: {"type":"choice","options":["Subscribers are called in random order","Observers can only watch one publisher","Publishers and subscribers only share event names and payloads, so either side can change without the other noticing","Publishers must keep a list of every subscriber's class"],"answer":2},
              explanation: `That decoupling is the whole point: the motion sensor emits \`motion\`, and lights, counters and alarms can come and go without editing it.`,
            },
          ],
        },
        {
          id: "smart-home-10-resilient-bus",
          title: "A bus that survives: failures and leaks",
          minutes: 28,
          xp: 190,
          concepts: ["exception isolation","dead-letter queue","subclassing a seam","weakref","WeakMethod","lapsed listeners"],
          learn: `### Two ways an event bus goes wrong

**1. A handler crashes.** With the bus from lesson 9, if the second of three handlers raises, the exception escapes \`emit()\`: the third handler never hears the event, and the code that merely *published* it now has to deal with someone else's bug. (This is also how C# multicast delegates and plain Java listener loops behave.) A bus should be a good host: one rude guest must not end the party.

**2. A handler never dies.** The bus keeps a reference to every handler. If the handler is a bound method such as \`panel.on_event\`, that reference keeps \`panel\` alive, even if everything else in the program let go of it. The object is gone as far as you are concerned, yet it still receives events and still uses memory. This is the **lapsed listener** leak, a classic cause of slowly growing programs.

### Isolating failures

Catch the exception where the handler is called, record it, and carry on. Because lesson 9 funnelled every call through one method, \`_deliver\`, you can change this behaviour in a subclass without touching the rest:

~~~python
class ResilientBus(EventBus):
    def __init__(self, history_size=200):
        super().__init__(history_size)
        # a "dead letter" box
        self.errors = deque(maxlen=50)

    def _deliver(self, subscription, event):
        try:
            subscription.handler(event)
        except Exception as err:
            # what failed, for whom, and why
            self.errors.append({...})
            # it did not run to completion
            return False
        return True
~~~

Details that matter:

- Catch \`Exception\`, **not** \`BaseException\` or a bare \`except:\`. \`KeyboardInterrupt\`, \`SystemExit\` and this platform's own timeout are \`BaseException\`s; swallowing them would make your program impossible to stop.
- Do not just \`print\` the failure. Keep it as data (event name, sequence number, handler name, message) so a dashboard can show it. That is called a **dead-letter queue** in messaging systems.
- Keep it bounded (\`deque(maxlen=...)\`) so a handler that fails a million times cannot eat the memory.
- Errors in *your own* code should still be loud somewhere. The bus isolates failures; it does not hide them.

### Subclassing to change one behaviour

Extending a class by overriding a single method, while \`super().__init__\` sets up the rest, is a normal use of inheritance. It works here because lesson 9 left a deliberate seam. Designing the seam first is what makes later changes small.

### Weak references

A **weak reference** points at an object *without keeping it alive*. When the last normal reference disappears, the object is freed and the weak reference starts returning \`None\`.

~~~python
import weakref

class Panel:
    def on_event(self, event): ...

panel = Panel()
ref = weakref.ref(panel)
ref() is panel         # True
del panel
# CPython frees it at once (cycles need gc.collect())
ref()                  # None
~~~

There is one trap. \`panel.on_event\` builds a *new* bound-method object every time you evaluate it, so \`weakref.ref(panel.on_event)\` would die at once. \`weakref.WeakMethod\` was made for this: it holds weak references to the instance and the function and rebuilds the method on demand.

A weak subscription is then a small forwarding closure: look the target up each time; if it is gone, unsubscribe yourself.

~~~python
def subscribe_weak(self, name, method):
    reference = weakref.WeakMethod(method)
    def forward(event):
        target = reference()
        if target is None:
            # owner is gone: tidy up
            unsubscribe()
        else:
            target(event)
    unsubscribe = self.subscribe(name, forward)
    return unsubscribe
~~~

### Weak or explicit?

Explicit \`unsubscribe()\` (or a \`close()\` method that calls it) is predictable and should be your default: you decide exactly when the link ends. Weak subscriptions are a safety net for listeners whose lifetime you cannot control. They are not magic: a weakly subscribed **lambda** that nothing else references is freed immediately and never fires.

### Common mistakes

- \`except Exception: pass\`: errors vanish. Record them.
- \`weakref.ref(obj.method)\` instead of \`WeakMethod\`.
- Relying on garbage collection timing in tests without \`gc.collect()\`.
- Subscribing in \`__init__\` and never unsubscribing in a \`close()\`.`,
          mission: `Real houses are messy. Try sending the bus a motion event for a room that does not exist: your strict \`lights_follow\` raises, and the failure bounces back to whoever published the event. Meanwhile any panel or widget that subscribes and is later thrown away would keep listening forever.

Make the bus resilient: isolate handler failures into a dead-letter box and support weak subscriptions. The scene's Dead letters panel lists every handler that crashed, while the rest of the house carries on.`,
          tasks: [
            "ResilientBus(EventBus): override _deliver so a handler's exception is caught and recorded in a bounded errors deque",
            "Catch Exception only, so interrupts and timeouts still stop the program",
            "subscribe_weak(name, method): subscribe through a forwarding closure that holds only a weak reference",
            "Replace the hub's bus, reconnect the lights, and add bus_errors() for the scene",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
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
`,
          solutionAdd: py`import inspect
import weakref


class ResilientBus(EventBus):
    def __init__(self, history_size: int = 200) -> None:
        super().__init__(history_size)
        self.errors: deque[dict[str, Any]] = deque(maxlen=50)

    def _deliver(self, subscription: _Subscription, event: Event) -> bool:
        try:
            subscription.handler(event)
        except Exception as err:
            handler = subscription.handler
            self.errors.append(
                {
                    "event": event.name,
                    "seq": event.seq,
                    "handler": getattr(handler, "__qualname__", repr(handler)),
                    "error": f"{type(err).__name__}: {err}",
                }
            )
            return False
        return True

    def subscribe_weak(self, name: str, method: Handler) -> Callable[[], None]:
        reference = weakref.WeakMethod(method) if inspect.ismethod(method) else weakref.ref(method)
        unsubscribe: Callable[[], None]

        def forward(event: Event) -> None:
            target = reference()
            if target is None:
                unsubscribe()
            else:
                target(event)

        unsubscribe = self.subscribe(name, forward)
        return unsubscribe


bus = ResilientBus()
stop_following = connect_lights(bus)


def bus_errors() -> list[dict[str, Any]]:
    return list(bus.errors)`,
          explanation: `Because every call goes through _deliver, one overridden method adds isolation to the whole bus. Failures become data (event, sequence, handler, message) in a bounded box instead of exceptions thrown at the publisher. A weak subscription stores only a WeakMethod; its forwarding closure unsubscribes itself the first time it finds the owner gone, so forgotten listeners clean up after themselves.`,
          hints: [
            { id: "h1", title: "Isolating failures", content: `def _deliver(self, subscription, event): try: subscription.handler(event) except Exception as err: self.errors.append({"event": event.name, "seq": event.seq, "handler": getattr(subscription.handler, "__qualname__", repr(subscription.handler)), "error": f"{type(err).__name__}: {err}"}); return False. After the try/except, return True. In __init__ call super().__init__(history_size) and create self.errors = deque(maxlen=50).` },
            { id: "h2", title: "Weak subscriptions", content: `reference = weakref.WeakMethod(method) if inspect.ismethod(method) else weakref.ref(method). Define def forward(event): target = reference(); if target is None: unsubscribe() else: target(event). Then unsubscribe = self.subscribe(name, forward) and return unsubscribe. forward can use unsubscribe because it is only called after the assignment.` },
            { id: "h3", title: "Swapping the bus", content: `bus = ResilientBus() then stop_following = connect_lights(bus), because the old bus's subscriptions do not move. bus_errors() is list(bus.errors). world_event and event_log keep working unchanged because they look up the global name bus each time they run.` },
          ],
          tests: [
            {
              id: "t1",
              description: "ResilientBus is still a normal bus",
              assertionCode: py`assert issubclass(ResilientBus, EventBus), "ResilientBus should extend EventBus so everything from lesson 9 still works"
_b = ResilientBus(history_size=2)
_seen = []
_b.subscribe("x", _seen.append)
assert _b.emit("x", {"n": 1}) == 1 and _seen[0].payload == {"n": 1}, "Normal delivery should work exactly as before"
_b.emit("x")
_b.emit("x")
assert len(_b.history) == 2, "The history_size argument should still reach the base class"
assert len(_b.errors) == 0, "No failures yet, so errors should be empty"`,
            },
            {
              id: "t2",
              description: "A failing handler does not stop the others",
              assertionCode: py`_b = ResilientBus()
_order = []
def _good_before(e):
    _order.append("before")
def _bad(e):
    _order.append("bad")
    raise ValueError("boom")
def _good_after(e):
    _order.append("after")
_b.subscribe("x", _good_before)
_b.subscribe("x", _bad)
_b.subscribe("x", _good_after)
try:
    _delivered = _b.emit("x")
except ValueError:
    raise AssertionError("emit must not let a handler's exception escape: catch it in _deliver")
assert _order == ["before", "bad", "after"], f"All three handlers should run, in order. Got {_order}"
assert _delivered == 2, f"emit should count only the handlers that finished without error (2), got {_delivered}"`,
            },
            {
              id: "t3",
              description: "Failures are recorded as data",
              assertionCode: py`assert len(_b.errors) == 1, f"One handler failed, so errors should hold one record, it holds {len(_b.errors)}"
_rec = _b.errors[0]
assert _rec["event"] == "x" and _rec["seq"] == 1, f"The record should name the event and its sequence number, got {_rec}"
assert "_bad" in _rec["handler"], f"The record should name the failing handler, got {_rec['handler']!r}"
assert _rec["error"] == "ValueError: boom", f"The error should read 'ValueError: boom', got {_rec['error']!r}"
import json as _json
_json.dumps(list(_b.errors))`,
            },
            {
              id: "t4",
              description: "The dead-letter box is bounded",
              assertionCode: py`_b = ResilientBus()
_b.subscribe("x", lambda e: 1 / 0)
for _n in range(80):
    _b.emit("x")
assert len(_b.errors) == 50, f"Keep only the newest 50 failures, errors has {len(_b.errors)}"
assert _b.errors[-1]["seq"] == 80 and _b.errors[0]["seq"] == 31, "The oldest failures should be dropped first"`,
            },
            {
              id: "t5",
              description: "Only Exception is caught",
              assertionCode: py`_b = ResilientBus()
def _stop_everything(e):
    raise KeyboardInterrupt()
_b.subscribe("x", _stop_everything)
try:
    _b.emit("x")
except KeyboardInterrupt:
    pass
else:
    raise AssertionError("Catch Exception, not BaseException: a KeyboardInterrupt (or this platform's timeout) must still get through")`,
            },
            {
              id: "t6",
              description: "A weak subscription does not keep its owner alive",
              assertionCode: py`import gc as _gc, weakref as _weakref
class _Panel:
    def __init__(self):
        self.seen = []
    def on_event(self, event):
        self.seen.append(event.name)
_b = ResilientBus()
_panel = _Panel()
_ref = _weakref.ref(_panel)
_b.subscribe_weak("x", _panel.on_event)
_b.emit("x")
assert _panel.seen == ["x"], "While the panel is alive it should receive the event"
del _panel
_gc.collect()
assert _ref() is None, "A weak subscription must not keep the panel alive. Hold only weakref.WeakMethod(method) and never the bound method itself"
_b.emit("x")
assert _b.listener_count("x") == 0, f"Once the owner is gone the forwarding subscription should remove itself, listener_count is {_b.listener_count('x')}"
assert len(_b.errors) == 0, "A dead target is not an error"`,
            },
            {
              id: "t7",
              description: "Weak subscriptions can still be cancelled, and work for plain functions",
              assertionCode: py`_b = ResilientBus()
_panel = _Panel()
_stop = _b.subscribe_weak("x", _panel.on_event)
_stop()
_b.emit("x")
assert _panel.seen == [] and _b.listener_count("x") == 0, "The returned function should cancel a weak subscription too"
_calls = []
def _plain(event):
    _calls.append(event.name)
_b.subscribe_weak("y", _plain)
_b.emit("y")
assert _calls == ["y"], "A plain function can be subscribed weakly too (use weakref.ref for it)"`,
            },
            {
              id: "t8",
              description: "The hub uses the resilient bus",
              assertionCode: py`assert isinstance(bus, ResilientBus), "Create the hub's bus with bus = ResilientBus()"
devices["kitchen_light"].execute("off")
_res = world_event("motion", {"room": "kitchen"})
assert devices["kitchen_light"].is_on and _res["ok"] is True, "Reconnect the lights to the new bus: stop_following = connect_lights(bus)"
_before = len(bus_errors())
_res = world_event("motion", {"room": "attic"})
assert _res["ok"] is True and _res["delivered"] == 0, f"A strict handler failing on an unknown room should not break world_event, got {_res}"
_errors = bus_errors()
_json.dumps(_errors)
assert len(_errors) == _before + 1 and "lights_follow" in _errors[-1]["handler"] and "attic_light" in _errors[-1]["error"], f"bus_errors() should show the KeyError from lights_follow, got {_errors[-1:]}"
assert _errors[-1]["event"] == "motion", "The record should say which event failed"
devices["kitchen_light"].execute("off")`,
            },
          ],
          unlocks: ["sh-resilience"],
          checks: [
            {
              prompt: `Why should \`_deliver\` catch \`Exception\` rather than use a bare \`except:\`?`,
              question: {"type":"choice","options":["A bare except is slower","Python does not allow a bare except inside a method","Exception catches more error types than a bare except","A bare except also catches KeyboardInterrupt, SystemExit and timeouts, so the program could not be stopped"],"answer":3},
              explanation: `Those signals derive from \`BaseException\`, not \`Exception\`. They exist so you can interrupt a program; a handler wrapper should isolate ordinary bugs, not make the whole process unkillable.`,
            },
            {
              prompt: `A dashboard object subscribes \`self.refresh\` to the bus in \`__init__\`, and later the program drops every reference to the dashboard. With a normal (strong) subscription, what happens?`,
              question: {"type":"choice","options":["Python raises an error when the last reference is dropped","The bus automatically unsubscribes it","The bus's reference to the bound method keeps the dashboard alive and it keeps receiving events","The dashboard is freed and stops receiving events"],"answer":2},
              explanation: `A bound method holds its instance, and the bus holds the bound method, so the instance can never be collected. Fix it with an explicit \`close()\` that calls unsubscribe, or a weak subscription.`,
            },
            {
              prompt: `Why is \`weakref.ref(panel.on_event)\` almost useless for a weak subscription?`,
              question: {"type":"choice","options":["weakref cannot refer to methods at all","It works fine; WeakMethod is only a shortcut","`panel.on_event` creates a fresh bound-method object each time, and nothing else holds it, so it is freed immediately","Weak references only work on classes"],"answer":2},
              explanation: `Each evaluation of \`panel.on_event\` builds a temporary bound-method object. Using \`weakref.WeakMethod\` stores weak references to the instance and function separately and rebuilds the method when asked.`,
            },
          ],
        },
        {
          id: "smart-home-11-wiring",
          title: "Wiring the house to the bus",
          minutes: 22,
          xp: 160,
          concepts: ["wiring / composition","events vs commands","fail fast and isolate","setup and teardown","publishing derived events"],
          learn: `### Wiring is its own job

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

Notice what the function takes as parameters: the bus and the devices it should wire. It does not reach for the global \`bus\`. Passing them in makes it trivial to test with a fresh bus and fresh devices, and you will use that idea deliberately in lesson 12.

### Events and who owns them

Events fall into two families:

- **Facts from the outside world**: \`motion\`, \`motion_clear\`, \`door\`, \`temperature\`, \`time\`. The scene reports them; nobody asked for them.
- **Facts that your devices announce**: when the thermostat switches the heating on or off, it publishes \`heating\` with \`{"on": true}\`. Other parts of the house can react without the thermostat knowing they exist.

Name events for what *happened* (\`motion\`, \`heating\`), not for what you want done (\`turn_on_light\`). A fact can have many consequences; a command only has one.

### Fail fast inside, isolate at the edge

\`on_temperature\` reads \`event.payload["value"]\`. If a buggy sender forgets the value, that line raises \`KeyError\`. You could litter every handler with defensive checks, or you can let the handler fail and rely on the bus to catch it and file it in the dead-letter box (lesson 10). The second style keeps the handlers short and puts error handling in exactly one place. Defend where bad data *enters the system*; trust it afterwards.

### Setup and teardown come in pairs

Every \`subscribe\` returns an unsubscribe function. \`wire_home\` returns the whole list so the caller can undo the wiring:

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
- Publishing \`heating\` on every reading instead of only when it *changes*, which floods the log. Compare before and after.
- Emitting from inside a handler an event that the same handler subscribes to: an infinite loop.`,
          mission: `Right now the scene still pokes sensors and the thermostat directly. Move that knowledge into your code: when \`motion\` arrives the room's sensor triggers, when \`motion_clear\` arrives it resets, when \`temperature\` arrives the thermostat measures and announces \`heating\` if it switched.

After this lesson the scene only talks to the bus. Walk around, drag the outdoor temperature down and watch the heating events appear in the log. Use the "Send a bad reading" button to see the dead-letter box catch a broken event.`,
          tasks: [
            "wire_home(target, devs): subscribe handlers for motion, motion_clear and temperature on whatever bus and devices are passed in",
            "The thermostat handler publishes a heating event, but only when the heating state changes",
            "Count visits from motion events and return the list of unsubscribe handles",
            "Connect the hub's own bus and devices, then drive the house from the scene and read the log",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 11: wire the devices to the bus.
def wire_home(target, devs):
    ...
    # Subscribe handlers on "target" (the bus passed in) that act on "devs" (the devices passed in):
    #   "motion"        -> trigger the sensor f"{room}_motion" (ignore rooms that have none)
    #   "motion"        -> count the visit with count_visit, but only for rooms in visit_counts
    #   "motion_clear"  -> clear that room's sensor
    #   "temperature"   -> thermostat.execute("measure", payload["value"]); if the heating state
    #                      changed, target.emit("heating", {"on": new_state})
    # Return the list of unsubscribe functions.


# Connect the hub's own bus and devices. Keep the result so the wiring can be undone.
`,
          solutionAdd: py`def wire_home(target: EventBus, devs: dict[str, Device]) -> list[Callable[[], None]]:
    """Connect each device to the events it cares about. Returns the unsubscribe handles."""

    def sensor_for(event: Event) -> Device | None:
        return devs.get(f"{event.payload.get('room')}_motion")

    def on_motion(event: Event) -> None:
        sensor = sensor_for(event)
        if sensor is not None:
            sensor.execute("trigger")

    def on_motion_clear(event: Event) -> None:
        sensor = sensor_for(event)
        if sensor is not None:
            sensor.execute("clear")

    def on_visit(event: Event) -> None:
        room = event.payload.get("room")
        if room in visit_counts:
            count_visit(room)

    def on_temperature(event: Event) -> None:
        thermostat = devs.get("thermostat")
        if thermostat is None:
            return
        was_heating = thermostat.heating
        thermostat.execute("measure", event.payload["value"])
        if thermostat.heating != was_heating:
            target.emit("heating", {"on": thermostat.heating})

    return [
        target.subscribe("motion", on_motion),
        target.subscribe("motion", on_visit),
        target.subscribe("motion_clear", on_motion_clear),
        target.subscribe("temperature", on_temperature),
    ]


wiring = wire_home(bus, devices)`,
          explanation: `wire_home takes the bus and devices as parameters, so the same function wires the real hub and the throwaway objects the tests create. The handlers are short because the resilient bus catches their failures: a reading with no value becomes one KeyError in the dead-letter box instead of defensive code everywhere. Publishing heating only on change keeps the log meaningful, and returning the handles gives the caller a clean way to undo everything.`,
          hints: [
            { id: "h1", title: "The motion handlers", content: `Inside wire_home define def on_motion(event): sensor = devs.get(f"{event.payload.get('room')}_motion"); if sensor is not None: sensor.execute("trigger"). on_motion_clear is the same with "clear". For visits, check room in visit_counts before calling count_visit(room).` },
            { id: "h2", title: "The thermostat handler", content: `thermostat = devs.get("thermostat"); return if it is None. Remember was_heating = thermostat.heating, call thermostat.execute("measure", event.payload["value"]), and if thermostat.heating != was_heating emit target.emit("heating", {"on": thermostat.heating}).` },
            { id: "h3", title: "Returning handles", content: `End wire_home with return [target.subscribe("motion", on_motion), target.subscribe("motion", on_visit), target.subscribe("motion_clear", on_motion_clear), target.subscribe("temperature", on_temperature)]. Outside the function: wiring = wire_home(bus, devices).` },
          ],
          tests: [
            {
              id: "t1",
              description: "wire_home returns the unsubscribe handles",
              assertionCode: py`_b, _devs = ResilientBus(), build_devices(CATALOG)
_handles = wire_home(_b, _devs)
assert isinstance(_handles, list) and len(_handles) >= 3 and all(callable(h) for h in _handles), "wire_home should return a list of unsubscribe functions (one per subscription)"
assert _b.listener_count("motion") >= 1 and _b.listener_count("motion_clear") == 1 and _b.listener_count("temperature") == 1, "Subscribe to motion, motion_clear and temperature on the bus that was passed in"`,
            },
            {
              id: "t2",
              description: "Sensors follow motion events",
              assertionCode: py`_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_b.emit("motion", {"room": "kitchen"})
assert _devs["kitchen_motion"].detected is True, "A motion event should trigger that room's sensor"
assert not any(_devs[f"{r}_motion"].detected for r in ("hall", "living", "bedroom")), "Only the sensor in the event's room should trigger"
_b.emit("motion_clear", {"room": "kitchen"})
assert _devs["kitchen_motion"].detected is False, "motion_clear should reset the sensor"
_b.emit("motion", {"room": "attic"})
_b.emit("motion")
assert len(_b.errors) == 0, "Unknown rooms and missing payloads are ignored quietly, not recorded as errors"`,
            },
            {
              id: "t3",
              description: "Visits are counted from the bus",
              assertionCode: py`_saved = dict(visit_counts)
visit_counts.update({r.value: 0 for r in Room})
_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_b.emit("motion", {"room": "hall"})
_b.emit("motion", {"room": "hall"})
_b.emit("motion", {"room": "living"})
_b.emit("motion", {"room": "attic"})
assert visit_counts == {"hall": 2, "living": 1, "kitchen": 0, "bedroom": 0}, f"Each motion event should count one visit, rooms that don't exist are ignored. Counts: {visit_counts}"
visit_counts.clear()
visit_counts.update(_saved)`,
            },
            {
              id: "t4",
              description: "The thermostat reacts to temperature and announces changes",
              assertionCode: py`_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_heard = []
_b.subscribe("heating", lambda e: _heard.append(e.payload))
_b.emit("temperature", {"value": 17})
_t = _devs["thermostat"]
assert _t.current == 17.0 and _t.heating is True, "A temperature event should be passed to the thermostat as a measurement"
assert _heard == [{"on": True}], f"Switching the heating on should publish a 'heating' event with {{'on': True}}. Heard {_heard}"
_b.emit("temperature", {"value": 17.2})
assert _heard == [{"on": True}], "A new reading that does not change the heating must not publish another event"
_b.emit("temperature", {"value": 22})
assert _heard == [{"on": True}, {"on": False}], f"Reaching the target should publish {{'on': False}}. Heard {_heard}"`,
            },
            {
              id: "t5",
              description: "A broken reading is isolated, not fatal",
              assertionCode: py`_b, _devs = ResilientBus(), build_devices(CATALOG)
wire_home(_b, _devs)
_later = []
_b.subscribe("temperature", lambda e: _later.append("ran"))
_b.emit("temperature", {})
assert _devs["thermostat"].current == 21.0, "A reading without a value must not change the thermostat"
assert len(_b.errors) == 1 and _b.errors[0]["error"].startswith("KeyError"), f"The missing value should be filed as a KeyError in the dead-letter box, got {list(_b.errors)}"
assert _later == ["ran"], "Handlers after the failing one must still run"
_b.emit("temperature", {"value": "hot"})
assert len(_b.errors) == 2 and _b.errors[1]["error"].startswith("ValueError"), "A non-numeric reading should be rejected by the thermostat (ValueError) and recorded"`,
            },
            {
              id: "t6",
              description: "The handles undo the wiring",
              assertionCode: py`_b, _devs = ResilientBus(), build_devices(CATALOG)
_handles = wire_home(_b, _devs)
for _stop in _handles:
    _stop()
_b.emit("motion", {"room": "hall"})
_b.emit("temperature", {"value": 5})
assert _devs["hall_motion"].detected is False and _devs["thermostat"].current == 21.0, "After calling every handle the devices must stop reacting"
assert _b.listener_count("motion") == 0 and _b.listener_count("temperature") == 0, "All subscriptions should be gone"`,
            },
            {
              id: "t7",
              description: "The hub is wired",
              assertionCode: py`devices["kitchen_light"].execute("off")
for _room in ("hall", "living", "kitchen", "bedroom"):
    devices[f"{_room}_motion"].execute("clear")
visit_counts.update({r.value: 0 for r in Room})
world_event("motion", {"room": "kitchen"})
assert devices["kitchen_motion"].detected is True, "Connect the hub: wiring = wire_home(bus, devices)"
assert visit_counts["kitchen"] == 1, f"One motion event must count exactly one visit (not two), got {visit_counts['kitchen']}"
world_event("motion_clear", {"room": "kitchen"})
assert devices["kitchen_motion"].detected is False, "motion_clear should clear the hub's sensor"
world_event("temperature", {"value": 15})
assert devices["thermostat"].heating is True and devices["thermostat"].current == 15.0, "temperature events should reach the hub's thermostat"
_names = [e["name"] for e in event_log()]
assert _names[-2:] == ["temperature", "heating"], f"The log should show the reading and then the heating event it caused, got {_names[-4:]}"
_before = len(bus_errors())
world_event("temperature", {})
assert len(bus_errors()) == _before + 1 and "KeyError" in bus_errors()[-1]["error"], "A temperature event with no value should appear in bus_errors()"
devices["kitchen_light"].execute("off")
devices["thermostat"].execute("measure", 21)`,
            },
          ],
          unlocks: ["sh-wiring"],
          checks: [
            {
              prompt: `Which event name follows the "name what happened" convention?`,
              question: {"type":"choice","options":["`turn_on_hall_light`","`please_lock_door`","`do_goodnight`","`heating`"],"answer":3},
              explanation: `Events are facts (\`heating\` changed, \`motion\` was seen). Names like \`turn_on_hall_light\` are commands: they presume exactly one consequence and tie the publisher to the receiver.`,
            },
            {
              prompt: `\`on_temperature\` reads \`event.payload["value"]\` without checking that the key exists. Why is that acceptable here?`,
              question: {"type":"choice","options":["The resilient bus catches and records the failure, so the handler can stay short and fail fast","KeyError can never happen","Python silently supplies a default","The payload is validated by the scene before sending"],"answer":0},
              explanation: `Handlers trust their input; the boundary (the bus) deals with the rare bad event by filing it as a dead letter. Defensive checks in every handler would duplicate that work.`,
            },
          ],
        },
      ],
    },
    {
      id: "brain",
      title: "The brain",
      blurb: "Inject dependencies, stream events lazily, and compose rules into automations.",
      lessons: [
        {
          id: "smart-home-12-injection",
          title: "Dependency injection: clock, daylight, phone",
          minutes: 25,
          xp: 180,
          concepts: ["dependency injection","test doubles / fakes","Protocol as a dependency contract","composition root","constants"],
          learn: `### The problem with reaching out

Imagine a door alarm that should only notify you after dark. The quick version looks inside itself for everything it needs:

~~~python
class DoorAlarm:
    def on_door(self, event):
        # hidden dependency on the real clock
        hour = datetime.now().hour
        if event.payload["open"] and hour >= 18:
            # hidden dependency on the real phone
            send_push_notification("Door opened")
~~~

How do you test it? You would have to run the test after 18:00, and your test would send a real push notification. Two hidden dependencies make the class impossible to check on its own. They also make it impossible to *reuse* with a different clock or a different way of alerting.

### Dependency injection: pass collaborators in

**Dependency injection** (DI) is simply this: a class receives the things it depends on from outside instead of creating or looking them up itself.

~~~python
class DoorWatch:
    def __init__(self, bus, daylight, notifier):
        # "something that can tell me if it is dark"
        self._daylight = daylight
        # "something that can send a message"
        self._notifier = notifier
        ...
~~~

Now \`DoorWatch\` has no idea whether the clock is real, simulated or frozen at 02:00, and no idea whether the notifier pushes to a phone or writes to a list. It only knows the **shape** it needs, and a \`Protocol\` is the perfect way to write that shape down:

~~~python
class Clock(Protocol):
    # minutes since midnight
    def now(self) -> int: ...

class Notifier(Protocol):
    def send(self, title: str, body: str = "") -> None: ...
~~~

This is the same idea as constructor injection with \`IClock\` / \`TimeProvider\` in .NET, or Spring and Guice in Java. Python needs no framework for it: an argument is an injection.

### Fakes make tests tiny and exact

Anything with the right shape can be injected, so tests use deliberately dumb stand-ins called **test doubles**:

~~~python
class FixedClock:
    def __init__(self, minute): self.minute = minute
    def now(self): return self.minute

class RecordingNotifier:
    def __init__(self): self.sent = []
    def send(self, title, body=""): self.sent.append(title)
~~~

A test builds \`DoorWatch(bus, Daylight(FixedClock(23 * 60)), RecordingNotifier())\`, emits a door event, and checks \`sent\`. No waiting, no patching, no real phone, and the answer is identical on every run and every machine.

### Where do the real objects get built?

Somewhere must decide which clock and which notifier the actual house uses. Do that in **one place**, usually the bottom of the program or \`main()\`, called the *composition root*:

~~~python
clock = SimClock()
phone = PhoneNotifier(clock)
door_watch = DoorWatch(bus, Daylight(clock), phone)
~~~

Everything above it receives what it needs; only the root knows the concrete classes.

### Tips and traps

- **Inject the abstraction, create the detail at the edge.** Classes ask for a \`Clock\`; the root decides it is a \`SimClock\`.
- A \`Daylight\` object that holds the *clock* (and asks it each time) stays correct as time moves. One that stored the current minute at construction would go stale: inject the thing that changes, not a snapshot.
- Do not give a parameter a default that is evaluated once, such as \`def f(now=time.time())\`. The default is computed when the function is *defined*, not on each call.
- A constructor that needs six dependencies is telling you the class does too much.
- Avoid hidden globals (\`from app import clock\`) inside methods. They look convenient and quietly bring the testing problem back.

### Common mistakes

- Injecting a concrete class instead of a Protocol, so fakes need inheritance.
- Faking the code under test instead of its collaborators.
- Forgetting that two objects built from the same fake share its state.
- Letting the "real" implementation be the default argument everywhere. A required parameter is clearer.`,
          mission: `The house needs to know what time it is, whether it is dark, and how to reach you. Build those as small pieces that are *handed* to the code that uses them: a clock the scene can set, a day/night judge, a phone for alerts, and a door watcher that texts you when the front door opens after dark.

Drag the time slider and your \`SimClock\` follows. Open the door at night and a notification lands on the phone panel; open it at noon and nothing happens.`,
          tasks: [
            "hhmm, is_dark_at and the SUNRISE / SUNSET constants",
            "Clock and Notifier protocols, a settable SimClock and a PhoneNotifier that reads time from an injected clock",
            "Daylight(clock) and DoorWatch(bus, daylight, notifier): nothing created inside, everything handed in",
            "The composition root: build clock, phone, daylight and door_watch for the hub, make the clock follow time events, and add notifications()",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 12: dependency injection.
SUNRISE = 6 * 60 + 30  # minutes after midnight
SUNSET = 18 * 60


def hhmm(minute):
    ...  # 75 -> "01:15", 0 -> "00:00", 1439 -> "23:59" (wrap past midnight with % 24)


def is_dark_at(minute, sunrise=SUNRISE, sunset=SUNSET):
    ...  # dark before sunrise and from sunset on


@runtime_checkable
class Clock(Protocol):
    ...  # now(self) -> int: minutes since midnight


class SimClock:
    ...  # starts at noon (12 * 60); now() reports it; set(minute) validates with _number, keeps it in 0-1439


@runtime_checkable
class Notifier(Protocol):
    ...  # send(self, title: str, body: str = "") -> None


class PhoneNotifier:
    ...  # __init__(clock, keep=30): outbox is a deque; send records {"at": hhmm(now), "title", "body"}


class Daylight:
    ...  # __init__(clock, sunrise=SUNRISE, sunset=SUNSET); is_dark() asks the clock EVERY time


class DoorWatch:
    ...
    # __init__(target_bus, daylight, notifier): subscribe to "door"
    # when payload["open"] is true and it is dark: notifier.send("Front door opened", "...")
    # close() unsubscribes


# The composition root: build the real pieces for the hub and keep them in these names
# clock, phone, daylight, door_watch   (the clock must follow "time" events: payload["minute"])


def notifications():
    ...  # the phone's outbox as a list, oldest first
`,
          solutionAdd: py`SUNRISE = 6 * 60 + 30  # minutes after midnight
SUNSET = 18 * 60


def hhmm(minute: int) -> str:
    return f"{minute // 60 % 24:02d}:{minute % 60:02d}"


def is_dark_at(minute: int, sunrise: int = SUNRISE, sunset: int = SUNSET) -> bool:
    return minute < sunrise or minute >= sunset


@runtime_checkable
class Clock(Protocol):
    def now(self) -> int: ...


class SimClock:
    def __init__(self, minute: int = 12 * 60) -> None:
        self.minute = minute % 1440

    def now(self) -> int:
        return self.minute

    def set(self, minute: Any) -> None:
        self.minute = int(_number(minute, "minute")) % 1440


@runtime_checkable
class Notifier(Protocol):
    def send(self, title: str, body: str = "") -> None: ...


class PhoneNotifier:
    def __init__(self, clock: Clock, keep: int = 30) -> None:
        self._clock = clock
        self.outbox: deque[dict[str, str]] = deque(maxlen=keep)

    def send(self, title: str, body: str = "") -> None:
        self.outbox.append({"at": hhmm(self._clock.now()), "title": title, "body": body})


class Daylight:
    def __init__(self, clock: Clock, sunrise: int = SUNRISE, sunset: int = SUNSET) -> None:
        self._clock = clock
        self._sunrise = sunrise
        self._sunset = sunset

    def is_dark(self) -> bool:
        return is_dark_at(self._clock.now(), self._sunrise, self._sunset)


class DoorWatch:
    def __init__(self, target: EventBus, daylight: Daylight, notifier: Notifier) -> None:
        self._daylight = daylight
        self._notifier = notifier
        self._stop = target.subscribe("door", self._on_door)

    def _on_door(self, event: Event) -> None:
        if event.payload.get("open") and self._daylight.is_dark():
            self._notifier.send("Front door opened", "The front door opened after dark.")

    def close(self) -> None:
        self._stop()


clock = SimClock()
phone = PhoneNotifier(clock)
daylight = Daylight(clock)
door_watch = DoorWatch(bus, daylight, phone)
follow_time = bus.subscribe("time", lambda event: clock.set(event.payload["minute"]))


def notifications() -> list[dict[str, str]]:
    return list(phone.outbox)`,
          explanation: `None of DoorWatch, Daylight or PhoneNotifier creates what it depends on, so the tests could hand them a FixedClock and a Recorder and check exact behaviour without waiting for evening or sending anything. Only the composition root at the bottom knows the real classes. Daylight stores the clock, not the time, which is why it stays correct when the scene drags the slider.`,
          hints: [
            { id: "h1", title: "Small functions", content: `hhmm: f"{minute // 60 % 24:02d}:{minute % 60:02d}". is_dark_at: return minute < sunrise or minute >= sunset. SimClock.set: self.minute = int(_number(minute, "minute")) % 1440.` },
            { id: "h2", title: "The injected classes", content: `PhoneNotifier.__init__ stores the clock and creates self.outbox = deque(maxlen=keep); send appends {"at": hhmm(self._clock.now()), "title": title, "body": body}. Daylight.is_dark returns is_dark_at(self._clock.now(), self._sunrise, self._sunset). DoorWatch subscribes self._on_door in __init__ and keeps the unsubscribe function for close().` },
            { id: "h3", title: "The composition root", content: `clock = SimClock(); phone = PhoneNotifier(clock); daylight = Daylight(clock); door_watch = DoorWatch(bus, daylight, phone). Then make the clock follow the world: follow_time = bus.subscribe("time", lambda event: clock.set(event.payload["minute"])). notifications() returns list(phone.outbox).` },
          ],
          tests: [
            {
              id: "t1",
              description: "hhmm formats minutes as a clock face",
              assertionCode: py`assert hhmm(0) == "00:00" and hhmm(75) == "01:15" and hhmm(1439) == "23:59", f"hhmm(0), hhmm(75), hhmm(1439) should be 00:00, 01:15, 23:59, got {hhmm(0)}, {hhmm(75)}, {hhmm(1439)}"
assert hhmm(12 * 60 + 5) == "12:05", "Minutes need a leading zero: 12:05"
assert hhmm(1500) == "01:00", "Past midnight should wrap around (use % 24 on the hour)"`,
            },
            {
              id: "t2",
              description: "Day and night boundaries",
              assertionCode: py`assert (SUNRISE, SUNSET) == (390, 1080), "SUNRISE is 06:30 (390) and SUNSET is 18:00 (1080), in minutes after midnight"
assert is_dark_at(0) and is_dark_at(389) and is_dark_at(1080) and is_dark_at(1439), "Before sunrise and from sunset on it is dark"
assert not is_dark_at(390) and not is_dark_at(720) and not is_dark_at(1079), "From sunrise until just before sunset it is light"
assert is_dark_at(500, sunrise=600, sunset=900) and not is_dark_at(700, sunrise=600, sunset=900), "Custom sunrise and sunset should be honoured"`,
            },
            {
              id: "t3",
              description: "SimClock is a settable Clock",
              assertionCode: py`_c = SimClock()
assert isinstance(_c, Clock), "SimClock needs a now() method to satisfy the Clock protocol"
assert _c.now() == 720, "A SimClock starts at noon (720)"
_c.set(23 * 60 + 15)
assert _c.now() == 1395, "set() should change what now() reports"
_c.set(1500)
assert _c.now() == 60, "set() keeps the time inside one day (1500 wraps to 60)"
_c.set(90.0)
assert _c.now() == 90 and isinstance(_c.now(), int), "A float minute should be stored as a whole number"
for _bad in ("noon", None, True):
    try:
        _c.set(_bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"set({_bad!r}) should raise ValueError")
assert _c.now() == 90, "A rejected time must not change the clock"`,
            },
            {
              id: "t4",
              description: "PhoneNotifier stamps messages using the injected clock",
              assertionCode: py`class _FixedClock:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
_fc = _FixedClock(8 * 60 + 5)
_p = PhoneNotifier(_fc)
assert isinstance(_p, Notifier), "PhoneNotifier needs send(title, body) to satisfy Notifier"
_p.send("Hello", "World")
_p.send("Only a title")
assert list(_p.outbox) == [{"at": "08:05", "title": "Hello", "body": "World"}, {"at": "08:05", "title": "Only a title", "body": ""}], f"Unexpected outbox {list(_p.outbox)}"
_fc.minute = 9 * 60
_p.send("Later")
assert _p.outbox[-1]["at"] == "09:00", "The time stamp should come from the injected clock at the moment of sending"
_small = PhoneNotifier(_fc, keep=2)
for _n in range(5):
    _small.send(f"m{_n}")
assert [m["title"] for m in _small.outbox] == ["m3", "m4"], "keep should limit the outbox to the newest messages"`,
            },
            {
              id: "t5",
              description: "Daylight asks its clock every time",
              assertionCode: py`_fc = _FixedClock(12 * 60)
_d = Daylight(_fc)
assert _d.is_dark() is False, "At noon it is light"
_fc.minute = 23 * 60
assert _d.is_dark() is True, "Daylight must ask the clock each time, not remember the time it was built with"
_fc.minute = 390
assert _d.is_dark() is False, "At sunrise (06:30) it is light"
assert Daylight(_FixedClock(500), sunrise=600, sunset=900).is_dark() is True, "Custom sunrise and sunset should reach is_dark_at"
_sim = SimClock(10)
_d2 = Daylight(_sim)
assert _d2.is_dark() is True
_sim.set(900)
assert _d2.is_dark() is False, "Daylight should follow a SimClock as it is set"`,
            },
            {
              id: "t6",
              description: "DoorWatch is testable with fakes",
              assertionCode: py`class _Recorder:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
_b = EventBus()
_rec = _Recorder()
_clk = _FixedClock(23 * 60)
_w = DoorWatch(_b, Daylight(_clk), _rec)
_b.emit("door", {"open": True})
assert len(_rec.sent) == 1 and _rec.sent[0][0] == "Front door opened", f"An opening after dark should send one 'Front door opened' message, got {_rec.sent}"
_b.emit("door", {"open": False})
_b.emit("door", {})
_b.emit("motion", {"room": "hall"})
assert len(_rec.sent) == 1, "Closing the door, missing payloads and other events must not notify"
_clk.minute = 12 * 60
_b.emit("door", {"open": True})
assert len(_rec.sent) == 1, "In daylight an opening is not worth a message"
_clk.minute = 3 * 60
_b.emit("door", {"open": True})
assert len(_rec.sent) == 2, "At 03:00 it is dark again, so a message is expected"
_w.close()
_b.emit("door", {"open": True})
assert len(_rec.sent) == 2 and _b.listener_count("door") == 0, "close() should unsubscribe the watcher"`,
            },
            {
              id: "t7",
              description: "The hub's clock follows time events",
              assertionCode: py`import json as _json
world_event("time", {"minute": 23 * 60 + 15})
assert clock.now() == 1395, "Subscribe to 'time' events and call clock.set(event.payload['minute'])"
assert daylight.is_dark() is True, "At 23:15 the hub's daylight should say dark"
_n = len(notifications())
world_event("door", {"open": True})
_msgs = notifications()
assert len(_msgs) == _n + 1 and _msgs[-1]["title"] == "Front door opened" and _msgs[-1]["at"] == "23:15", f"Opening the door at 23:15 should message the phone with the time, got {_msgs[-1:]}"
_json.dumps(_msgs)
world_event("time", {"minute": 12 * 60})
world_event("door", {"open": True})
assert len(notifications()) == _n + 1, "At noon the hub must stay quiet"
_before = len(bus_errors())
world_event("time", {})
assert clock.now() == 720 and len(bus_errors()) == _before + 1, "A time event without a minute should be a dead letter and leave the clock alone"`,
            },
          ],
          unlocks: ["sh-phone"],
          checks: [
            {
              prompt: `Why is it better for \`DoorWatch\` to receive a \`Daylight\` object than to call \`datetime.now()\` itself?`,
              question: {"type":"choice","options":["A test can inject a clock fixed at 02:00, so the result is exact and independent of when the test runs","It lets DoorWatch change the system time","datetime.now() is deprecated","Daylight objects are faster"],"answer":0},
              explanation: `Hidden calls to the real clock make behaviour depend on when the code runs. An injected dependency can be replaced by a fake that returns whatever the test needs.`,
            },
            {
              prompt: `What is the "composition root"?`,
              question: {"type":"choice","options":["A package manager feature","A decorator that injects arguments","A class that every other class inherits from","The one place in the program that creates the real objects and passes them to the code that needs them"],"answer":3},
              explanation: `Keeping object creation in one place means everything else just *receives* its collaborators. Changing the clock or the notifier for the whole house is then a one-line edit.`,
            },
            {
              prompt: `\`Daylight.__init__\` stores the *clock* rather than the current minute. What would go wrong if it stored the minute?`,
              question: {"type":"choice","options":["Nothing, they are equivalent","It would raise a TypeError","The clock could never be set","It would keep answering for the minute it was constructed at, even after the clock moves"],"answer":3},
              explanation: `Inject the thing that *changes* (a collaborator you can ask), not a snapshot of its value.`,
            },
          ],
        },
        {
          id: "smart-home-13-generators",
          title: "Generators and iterators: lazy event streams",
          minutes: 25,
          xp: 180,
          concepts: ["generators","yield / yield from","islice","lazy evaluation","__iter__ / __next__","StopIteration"],
          learn: `### How a \`for\` loop really works

A \`for\` loop asks an **iterable** for an **iterator**, then keeps asking the iterator for the next item until it signals "no more" with \`StopIteration\`.

~~~python
numbers = [10, 20]
it = iter(numbers)        # list -> iterator
next(it)                  # 10
next(it)                  # 20
next(it)                  # StopIteration
~~~

Anything that has \`__iter__\` (returning an iterator) is iterable. An **iterator** has \`__next__\` too, and its \`__iter__\` returns itself. Lists, dicts, files, \`range\` and \`deque\` are iterable; once you start walking one with \`next\`, you are holding an iterator.

### Lazy beats eager

A list holds every item right now. A **generator** produces items one at a time, only when asked, and forgets them afterwards. It uses \`yield\` instead of \`return\`:

~~~python
def evens(limit):
    for n in range(0, limit, 2):
        # pause here, hand the value out, resume on the next request
        yield n

gen = evens(10)
next(gen)              # 0
next(gen)              # 2
list(gen)              # [4, 6, 8] (what is left)
~~~

Why bother?

- **Memory**: a million events can flow through a pipeline without ever existing as a list.
- **Early exit**: "give me the first three matches" stops scanning after finding them.
- **Infinite streams** are possible, because nothing is computed until requested.
- **Pipelines** compose: each stage pulls from the one before. A generator expression, \`(e for e in events if e.name == "door")\`, is the one-line version.

\`yield from other\` hands over everything another iterable produces. \`itertools.islice(stream, n)\` takes at most \`n\` items without turning the stream into a list. If you know LINQ's deferred execution (\`IEnumerable\`, \`yield return\`), Java streams, or JavaScript generators, this is the same family of ideas.

### Generators are single-use and start late

~~~python
stream = evens(6)
list(stream)           # [0, 2, 4]
list(stream)           # [] exhausted: no rewind
~~~

Two more surprises:

- **The body does not run when you call the function.** Calling \`evens(6)\` only builds the generator object; the first line of the body runs on the first \`next()\`. So a \`raise ValueError\` at the top of a generator function is delayed until someone starts iterating. If you want bad arguments to fail immediately, validate in an ordinary function that returns the generator.
- **Do not change a collection while a generator walks it.** Iterating a \`deque\` that another piece of code appends to raises \`RuntimeError\`. Consume the stream (for example into a list) before events can be emitted.

### Writing an iterator by hand

Sometimes you want an iterator that can **resume**: a bookmark in a log that you read now, and again later, picking up where you left off. A generator is exhausted for good; a small class can keep its position.

~~~python
class Countdown:
    def __init__(self, start):
        self.n = start

    def __iter__(self):
        # an iterator is its own iterator
        return self

    def __next__(self):
        if self.n <= 0:
            raise StopIteration
        self.n -= 1
        return self.n + 1
~~~

\`for x in Countdown(3)\` calls \`__iter__\` once, then \`__next__\` repeatedly until \`StopIteration\`. Prefer a generator when you can (shorter, harder to get wrong). Reach for a class when you need state that outlives one pass or extra methods.

### Common mistakes

- Calling \`len()\` on a generator or indexing it: it has neither.
- Looping over the same generator twice and being surprised the second loop is empty.
- Forgetting \`StopIteration\` in \`__next__\`, producing an endless loop.
- Building a list "to be safe" when the next step only needs the first few items.`,
          mission: `The event history is growing, and nobody wants to read all of it. People ask things like "show me the last three door events" or "what happened since I last looked?". Day and night also need drawing: the scene wants a strip of dark and light hours.

Answer both with lazy streams: generators that filter events and walk the day, plus a small resumable iterator that remembers where you stopped reading. The event log gains filter chips, the time slider gets a day-and-night strip, and "What did I miss?" shows only new events.`,
          tasks: [
            "matching(events, *names) and newest_first(source): generator functions that stream events",
            "recent_events(name, limit): newest matches via islice, returned oldest first, without copying the history",
            "day_slots(step) validated eagerly (return an inner generator) and daylight_map(step) for the scene",
            "EventCursor: an iterator class that resumes where it stopped, plus reader and unread()",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 13: generators and iterators.
from collections.abc import Iterator
from itertools import islice


def matching(events, *names):
    ...  # a GENERATOR: yield the events whose name is in names (every event if no names are given)


def newest_first(source):
    ...  # a generator over source.history, newest event first (yield from + reversed)


def recent_events(name="", limit=12):
    ...
    # the newest "limit" events with that name (any name if empty), as dicts, OLDEST first.
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
`,
          solutionAdd: py`from collections.abc import Iterator
from itertools import islice


def matching(events: Iterable[Event], *names: str) -> Iterator[Event]:
    for event in events:
        if not names or event.name in names:
            yield event


def newest_first(source: EventBus) -> Iterator[Event]:
    yield from reversed(source.history)


def recent_events(name: str = "", limit: int = 12) -> list[dict[str, Any]]:
    stream = matching(newest_first(bus), name) if name else newest_first(bus)
    picked = list(islice(stream, max(0, int(limit))))
    picked.reverse()
    return [event.to_dict() for event in picked]


def _slots(step: int) -> Iterator[tuple[int, bool]]:
    for minute in range(0, 1440, step):
        yield minute, is_dark_at(minute)


def day_slots(step: int = 30) -> Iterator[tuple[int, bool]]:
    if step < 1:
        raise ValueError(f"step must be at least 1 minute, got {step}")
    return _slots(step)


def daylight_map(step: int = 30) -> list[dict[str, Any]]:
    return [{"minute": minute, "dark": dark} for minute, dark in day_slots(step)]


class EventCursor:
    def __init__(self, source: EventBus) -> None:
        self._source = source
        self._last_seq = 0

    def __iter__(self) -> "EventCursor":
        return self

    def __next__(self) -> Event:
        for event in self._source.history:
            if event.seq > self._last_seq:
                self._last_seq = event.seq
                return event
        raise StopIteration


reader = EventCursor(bus)


def unread() -> list[dict[str, Any]]:
    return [event.to_dict() for event in reader]`,
          explanation: `A pipeline of generators (newest_first, then matching, then islice) only touches as many events as it needs to find the answer. day_slots splits into an eager checker and a lazy worker because the body of a generator does not run until the first next(). EventCursor shows the iterator protocol by hand: __iter__ returns self, __next__ raises StopIteration, and the saved sequence number makes it resumable, which a generator never is.`,
          hints: [
            { id: "h1", title: "Generators", content: `def matching(events, *names): for event in events: if not names or event.name in names: yield event. newest_first is a single line: yield from reversed(source.history).` },
            { id: "h2", title: "Pipelines and the day", content: `recent_events: stream = matching(newest_first(bus), name) if name else newest_first(bus); picked = list(islice(stream, max(0, int(limit)))); picked.reverse(); then return [e.to_dict() for e in picked]. day_slots checks step < 1 and raises ValueError, then returns _slots(step), a separate generator with for minute in range(0, 1440, step): yield minute, is_dark_at(minute).` },
            { id: "h3", title: "The cursor", content: `__init__ stores the bus and self._last_seq = 0. __iter__ returns self. __next__ loops over self._source.history; for the first event with seq > self._last_seq, update _last_seq and return it; after the loop raise StopIteration. reader = EventCursor(bus); unread is [e.to_dict() for e in reader].` },
          ],
          tests: [
            {
              id: "t1",
              description: "matching is a lazy filter",
              assertionCode: py`import inspect as _inspect
_pool = [Event("door", {}, 1), Event("motion", {}, 2), Event("temperature", {}, 3), Event("door", {}, 4)]
_g = matching(_pool, "door")
assert _inspect.isgenerator(_g), "matching should be a generator function (use yield)"
assert [e.seq for e in _g] == [1, 4], "matching(events, 'door') should keep only the door events, in order"
assert [e.seq for e in matching(_pool, "door", "temperature")] == [1, 3, 4], "Several names are allowed"
assert [e.seq for e in matching(_pool)] == [1, 2, 3, 4], "With no names every event passes"
def _forever():
    n = 0
    while True:
        n += 1
        yield Event("a" if n % 2 else "b", {}, n)
assert next(matching(_forever(), "b")).seq == 2, "matching must be lazy: it should find the first 'b' in an endless stream without reading it all"`,
            },
            {
              id: "t2",
              description: "newest_first walks the history backwards",
              assertionCode: py`_b = EventBus()
for _n in ("one", "two", "three"):
    _b.emit(_n)
_g = newest_first(_b)
assert _inspect.isgenerator(_g), "newest_first should be a generator"
assert [e.name for e in _g] == ["three", "two", "one"], "The newest event should come first"
_b.emit("four")
assert next(newest_first(_b)).name == "four", "Each call starts from the current history"
assert list(newest_first(EventBus())) == [], "An empty history gives an empty stream"`,
            },
            {
              id: "t3",
              description: "recent_events takes the newest matches, oldest first",
              assertionCode: py`import json as _json
for _n in range(6):
    bus.emit("probe_a", {"n": _n})
    bus.emit("probe_b", {"n": _n})
_two = recent_events("probe_a", 2)
_json.dumps(_two)
assert [e["payload"]["n"] for e in _two] == [4, 5] and all(e["name"] == "probe_a" for e in _two), f"recent_events('probe_a', 2) should return the last two probe_a events, oldest first. Got {_two}"
assert len(recent_events("probe_b", 100)) >= 6 and recent_events("probe_b", 100)[-1]["payload"]["n"] == 5, "A big limit just returns what exists"
assert recent_events("no_such_event") == [], "An unknown name gives an empty list"
assert recent_events("probe_a", 0) == [] and recent_events("probe_a", -3) == [], "A limit below 1 gives an empty list"
_all = recent_events(limit=3)
assert _all == event_log()[-3:], "With no name, recent_events(limit=3) should equal the last three entries of event_log()"`,
            },
            {
              id: "t4",
              description: "day_slots is a lazy walk through the day",
              assertionCode: py`_s = day_slots()
assert _inspect.isgenerator(_s) or hasattr(_s, "__next__"), "day_slots should return an iterator"
assert next(_s) == (0, True) and next(_s) == (30, True), "The day starts at minute 0, in the dark, and steps by 30"
_half_hours = list(day_slots(30))
assert len(_half_hours) == 48 and _half_hours[13] == (390, False) and _half_hours[36] == (1080, True), f"Expected 48 half-hour slots with light from 06:30 to 18:00, got {len(_half_hours)}"
assert len(list(day_slots(60))) == 24 and len(list(day_slots(1440))) == 1, "step controls how many slots there are"
for _bad in (0, -5):
    try:
        day_slots(_bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"day_slots({_bad}) should raise ValueError as soon as it is called, not when iteration starts (validate in a normal function and return the generator)")`,
            },
            {
              id: "t5",
              description: "daylight_map feeds the scene",
              assertionCode: py`_map = daylight_map()
_json.dumps(_map)
assert len(_map) == 48 and _map[0] == {"minute": 0, "dark": True} and _map[24] == {"minute": 720, "dark": False}, f"daylight_map should list {{'minute', 'dark'}} dicts, got {_map[:2]}"
assert all(m["dark"] == is_dark_at(m["minute"]) for m in _map), "The dark flags must agree with is_dark_at"
assert len(daylight_map(120)) == 12, "daylight_map(step) should pass the step on"`,
            },
            {
              id: "t6",
              description: "EventCursor is a resumable iterator",
              assertionCode: py`_b = EventBus()
_cur = EventCursor(_b)
assert iter(_cur) is _cur, "An iterator's __iter__ returns itself"
assert next(_cur, "empty") == "empty", "A cursor on an empty bus has nothing to give"
_b.emit("a")
_b.emit("b")
assert [e.name for e in _cur] == ["a", "b"], "The first pass should yield everything emitted so far, in order"
assert list(_cur) == [], "A second pass finds nothing new"
_b.emit("c")
assert [e.name for e in _cur] == ["c"], "Unlike a generator, the cursor resumes: it yields only what arrived since last time"
_other = EventCursor(_b)
assert [e.name for e in _other] == ["a", "b", "c"], "Each cursor keeps its own place"
try:
    next(_cur)
except StopIteration:
    pass
else:
    raise AssertionError("next() on a drained cursor must raise StopIteration")`,
            },
            {
              id: "t7",
              description: "The hub's unread() only reports new events",
              assertionCode: py`unread()
assert unread() == [], "Right after reading, nothing is unread"
world_event("probe_c", {"x": 1})
world_event("probe_d")
_new = unread()
_json.dumps(_new)
assert [e["name"] for e in _new] == ["probe_c", "probe_d"] and _new[0]["payload"] == {"x": 1}, f"unread() should return only the two new events as dicts, got {_new}"
assert unread() == [], "They should not be reported twice"
assert isinstance(reader, EventCursor), "reader should be an EventCursor on the hub's bus"`,
            },
          ],
          unlocks: ["sh-timeline"],
          checks: [
            {
              prompt: `What does this print?

~~~python
def count_up():
    print("start")
    yield 1

g = count_up()
print("made it")
next(g)
~~~`,
              question: {"type":"choice","options":["start, then made it","Only start","made it, then start","Only made it"],"answer":2},
              explanation: `Calling a generator function builds a generator object without running its body. \`start\` is printed on the first \`next()\`. That is also why an argument check at the top of a generator function is delayed.`,
            },
            {
              prompt: `Why is \`recent_events\` built from \`newest_first\` + \`matching\` + \`islice\` instead of filtering a full list copy?`,
              question: {"type":"choice","options":["It only walks as far back through the history as it needs to find the requested number of matches","Generators are required by the scene","islice sorts the events","A list cannot be filtered in Python"],"answer":0},
              explanation: `Lazy pipelines pull items one at a time, so asking for the last 3 door events stops after finding them, however long the history is.`,
            },
            {
              prompt: `You loop over a generator twice. What does the second loop do?`,
              question: {"type":"choice","options":["Raises a RuntimeError","Restarts and recomputes lazily","Repeats all the items","Produces nothing: the generator is exhausted"],"answer":3},
              explanation: `A generator is a one-way stream. If you need to pass over the data again, create a new generator, or keep a resumable iterator object like \`EventCursor\` when you want to pick up where you left off.`,
            },
          ],
        },
        {
          id: "smart-home-14-automations",
          title: "Automations: rules from everything you built",
          minutes: 35,
          xp: 260,
          concepts: ["rule engine","decorator with arguments","closure factories","dependency injection","observer","dataclasses","explainability"],
          learn: `### Everything at once

Automations like "when there is motion in a room and it is dark, turn that room's light on" sound simple, yet writing them as a pile of \`if\` statements inside handlers makes them rigid and opaque: you cannot list the rules, explain why one fired, or add one without editing code. This lesson builds a tiny **rule engine** out of everything you have learned, so each rule becomes data built from small functions.

A rule has four parts:

- **on**: the event name that wakes it up (\`motion\`, \`time\`, \`door\`...)
- **when**: zero or more *conditions*, each a function \`Context -> bool\`
- **then**: an *effect*, a function \`Context -> None\` that does something
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
- **Closures and factories**: \`after_dark()\`, \`between(start, end)\`, \`light_on(level)\` and \`notify(title)\` return configured functions, exactly like \`dim_lights(level)\`.
- **Decorators with arguments**: \`@condition("it is dark")\` attaches a human description to a function without wrapping it. The description is how the dashboard explains *why*.
- **Dataclasses**: \`Rule\` and the \`Context\` handed to every condition and effect are frozen records.
- **Dependency injection**: conditions never call a real clock. They ask the \`Context\`, which carries the injected \`Daylight\`, clock, devices and notifier. A test passes fakes and gets exact answers.
- **Observer**: the engine subscribes to \`"*"\` on the bus; rules run in response to events.
- **Interfaces**: \`Clock\` and \`Notifier\` stay protocols; the engine neither knows nor cares what they are.

### Explaining decisions

A rule engine you cannot interrogate is a black box. So \`evaluate()\` returns *both* the verdict and a reason:

~~~python
# fired: all conditions held
(True,  "motion event and it is dark")
# skipped: this one failed
(False, "needs: it is dark")
~~~

Stopping at the first failing condition makes the reason precise. The dashboard shows the latest reason for every rule, so "why didn't the light come on?" has a one-glance answer.

### Rules for rule engines

- **Ignore your own announcements.** When a rule fires, the engine publishes \`rule.fired\` so it shows up in the event log. Because the engine listens to *every* event, it must skip events named \`rule.\`, or it would react to its own announcement forever.
- **Make conditions idempotent.** A "goodnight" rule that runs on every \`time\` event after 23:00 must check that something is actually still on or unlocked. Otherwise it fires again and again. Compare *state*, not just the clock.
- **Isolate rules from each other.** One rule whose effect raises must not stop the rest. Catch it, record it as \`failed\`, continue.
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

- Evaluating conditions that need data the event does not carry. Check \`payload.get(...)\` instead of indexing.
- A condition that changes state. Conditions should only look.
- Forgetting to add the new rule to the engine, and then wondering why nothing fires.
- Rules that emit events they themselves listen to.`,
          mission: `The finale: make the house smart. Retire the crude "lights always follow you" listener and replace it with real automations: welcome lights after dark, lights off when a room empties, a goodnight at 23:00, sunrise blinds at 07:00, a heads-up when the heating kicks in.

Every rule is built from conditions and effects you write, runs from events on your bus, and explains itself. The Automations panel lists each rule with how often it fired or was skipped, and the reason, so you can watch "motion + after dark" work, then change the hour and watch it refuse.`,
          tasks: [
            "condition(description), describe(), after_dark(), between(start, end), device_is(id, **expected) and payload_is(key, value)",
            "Rule (frozen dataclass) whose evaluate() returns a verdict and a reason; effects light_on, light_off, run and notify",
            "RuleEngine: subscribe to \"*\", skip rule.* events, evaluate matching rules, isolate failures, keep status and a log, announce rule.fired",
            "Add the bedtime and sunrise routines and six rules named Welcome light, Lights off when empty, Welcome home, Goodnight, Sunrise blinds and Heating notice, plus the automations() hook",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
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
`,
          solutionAdd: py`stop_following()  # retire the crude "lights always follow you" listener from lesson 9


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
    return {"rules": [dict(status) for status in engine.status.values()], "log": list(engine.log)}`,
          explanation: `Each rule is plain data: an event name, conditions that only look, and an effect that acts. The conditions and effects come from factories (after_dark(), light_on(60)), the descriptions come from a decorator with arguments, and the clock arrives through the injected context, so the same engine runs against fakes in tests. The engine is just another observer on the bus: it ignores its own announcements, catches failures per rule, and records why each decision was made.`,
          hints: [
            { id: "h1", title: "Conditions", content: `condition(description) returns mark(func) which sets func.description = description and returns func. after_dark builds @condition("it is dark") def check(ctx): return ctx.daylight.is_dark() and returns check. between: if start <= end return start <= now < end, otherwise return now >= start or now < end, using ctx.clock.now().` },
            { id: "h2", title: "Rule and effects", content: `evaluate loops over self.when: if not check(ctx): return False, f"needs: {describe(check)}". At the end return True, " and ".join([f"{self.on} event", *(describe(c) for c in self.when)]). light_on(level, room) returns effect(ctx) which finds ctx.devices.get(f"{room or ctx.event.payload.get('room')}_light") and executes "dim".` },
            { id: "h3", title: "The engine", content: `In _on_event: return early if event.name.startswith("rule."); build a Context; for each rule with rule.on == event.name evaluate it, run rule.then(ctx) inside try/except Exception when it fired, update self.status[rule.name], append to self.log, and emit rule.fired after a real fire. Routines: ROUTINES["bedtime"] = chain(goodnight, blinds_to(0)) and ROUTINES["sunrise"] = blinds_to(100).` },
          ],
          tests: [
            {
              id: "t1",
              description: "condition() attaches a description and returns the same function",
              assertionCode: py`@condition("always true")
def _yes(ctx):
    return True
assert _yes(None) is True, "condition(...) must return the original function so it can still be called"
assert _yes.description == "always true", "The decorator should store its argument as func.description"
assert describe(_yes) == "always true", "describe() should return the description"
def _plain(ctx):
    return False
assert describe(_plain) == "_plain", "Without a description, describe() falls back to the function's name"
assert callable(condition("x")), "condition('text') has to return a decorator, so it can be used as @condition('text')"`,
            },
            {
              id: "t2",
              description: "The built-in conditions read the context",
              assertionCode: py`class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
def _ctx(name="motion", payload=None, minute=720, devs=None, rec=None):
    clk = _Clk(minute)
    return Context(Event(name, payload or {}, 1), devs if devs is not None else build_devices(CATALOG), Daylight(clk), clk, rec if rec is not None else _Rec())
_dark = after_dark()
assert _dark(_ctx(minute=23 * 60)) is True and _dark(_ctx(minute=12 * 60)) is False, "after_dark() should ask ctx.daylight"
assert describe(_dark) == "it is dark", "after_dark() is described as 'it is dark'"
_night = between(23 * 60, 5 * 60)
for _minute, _want in [(23 * 60, True), (23 * 60 + 30, True), (2 * 60, True), (4 * 60 + 59, True), (5 * 60, False), (12 * 60, False), (22 * 60 + 59, False)]:
    assert _night(_ctx(minute=_minute)) is _want, f"between(23:00, 05:00) at minute {_minute} should be {_want}: the start is included, the end is not, and the window wraps past midnight"
_morning = between(7 * 60, 10 * 60)
assert _morning(_ctx(minute=8 * 60)) is True and _morning(_ctx(minute=6 * 60)) is False and _morning(_ctx(minute=10 * 60)) is False, "A window that does not wrap should be start <= now < end"
assert describe(_night) == "the time is between 23:00 and 05:00", f"Unexpected description {describe(_night)!r}"
_c = _ctx(payload={"open": True})
assert device_is("front_lock", locked=True)(_c) is True and device_is("front_lock", locked=False)(_c) is False, "device_is should compare the device's state()"
assert device_is("thermostat", target=21.0, heating=False)(_c) is True and device_is("thermostat", target=21.0, heating=True)(_c) is False, "Every expected key must match"
assert device_is("garage_door", open=True)(_c) is False, "A device that does not exist never matches"
assert describe(device_is("front_lock", locked=False)) == "front_lock has locked=False", f"Unexpected description {describe(device_is('front_lock', locked=False))!r}"
assert payload_is("open", True)(_c) is True and payload_is("open", False)(_c) is False and payload_is("room", "hall")(_c) is False, "payload_is compares one payload key; a missing key never matches"
assert describe(payload_is("open", True)) == "open is True", "payload_is describes itself as 'open is True'"`,
            },
            {
              id: "t3",
              description: "Rule.evaluate gives a verdict and a reason",
              assertionCode: py`class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
def _ctx(name="motion", payload=None, minute=720, devs=None, rec=None):
    clk = _Clk(minute)
    return Context(Event(name, payload or {}, 1), devs if devs is not None else build_devices(CATALOG), Daylight(clk), clk, rec if rec is not None else _Rec())
_r = Rule("r", on="motion", when=(after_dark(), device_is("hall_light", on=False)), then=lambda ctx: None)
assert _r.evaluate(_ctx(minute=23 * 60)) == (True, "motion event and it is dark and hall_light has on=False"), f"Unexpected result {_r.evaluate(_ctx(minute=23 * 60))}"
assert _r.evaluate(_ctx(minute=12 * 60)) == (False, "needs: it is dark"), f"A failing condition should explain itself, got {_r.evaluate(_ctx(minute=12 * 60))}"
_lit = build_devices(CATALOG)
_lit["hall_light"].execute("on")
assert _r.evaluate(_ctx(minute=23 * 60, devs=_lit)) == (False, "needs: hall_light has on=False"), "The reason should name the first condition that failed"
assert Rule("n", "x", (), lambda ctx: None).evaluate(_ctx()) == (True, "x event"), "A rule with no conditions always passes"
import dataclasses as _dc
try:
    _r.name = "other"
except _dc.FrozenInstanceError:
    pass
else:
    raise AssertionError("Rule should be a frozen dataclass")`,
            },
            {
              id: "t4",
              description: "Effects are configured functions",
              assertionCode: py`class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
def _ctx(name="motion", payload=None, minute=720, devs=None, rec=None):
    clk = _Clk(minute)
    return Context(Event(name, payload or {}, 1), devs if devs is not None else build_devices(CATALOG), Daylight(clk), clk, rec if rec is not None else _Rec())
_devs = build_devices(CATALOG)
_c = _ctx(payload={"room": "kitchen"}, devs=_devs)
light_on()(_c)
assert _devs["kitchen_light"].level == 60, "light_on() should default to level 60 in the event's room"
light_on(25)(_c)
assert _devs["kitchen_light"].level == 25, "light_on(25) should dim that light to 25"
light_on(70, room="hall")(_c)
assert _devs["hall_light"].level == 70 and _devs["kitchen_light"].level == 25, "An explicit room overrides the event's room"
light_off()(_c)
assert _devs["kitchen_light"].level == 0 and _devs["hall_light"].level == 70, "light_off() switches off the event's room only"
light_off("hall")(_c)
assert _devs["hall_light"].level == 0, "light_off('hall') should switch off the hall light"
light_on()(_ctx(payload={"room": "attic"}, devs=_devs))
light_on()(_ctx(payload={}, devs=_devs))
assert all(d.level == 0 for d in _devs.values() if isinstance(d, Light)), "Unknown rooms and missing rooms are ignored quietly"
run("movie")(_c)
assert _devs["kitchen_light"].level == 15, "run('movie') should find the preset by name and run it on the context's devices"
_devs["front_lock"].execute("unlock")
run("goodnight")(_c)
assert _devs["front_lock"].locked is True and _devs["kitchen_light"].level == 0, "run('goodnight') should run the routine"
try:
    run("self_destruct")(_c)
except KeyError:
    pass
else:
    raise AssertionError("run(name) should raise KeyError for a name that is neither a routine nor a preset")
_rec = _Rec()
notify("Hello", "World")(_ctx(rec=_rec))
notify("Only title")(_ctx(rec=_rec))
assert _rec.sent == [("Hello", "World"), ("Only title", "")], f"notify should send through the context's notifier, got {_rec.sent}"`,
            },
            {
              id: "t5",
              description: "New routines bedtime and sunrise exist",
              assertionCode: py`_devs = build_devices(CATALOG)
_devs["hall_light"].execute("on")
_devs["front_lock"].execute("unlock")
assert "bedtime" in ROUTINES and "sunrise" in ROUTINES, "Add ROUTINES['bedtime'] and ROUTINES['sunrise']"
ROUTINES["bedtime"](_devs)
assert _devs["hall_light"].level == 0 and _devs["front_lock"].locked and _devs["living_blinds"].position == 0 and _devs["bedroom_blinds"].position == 0, "bedtime should do goodnight and close the blinds (use chain)"
ROUTINES["sunrise"](_devs)
assert _devs["living_blinds"].position == 100 and _devs["bedroom_blinds"].position == 100, "sunrise should open the blinds"
assert "bedtime" in routine_names(), "routine_names() should list the new routines too"`,
            },
            {
              id: "t6",
              description: "The engine fires, skips and explains",
              assertionCode: py`class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
import json as _json
_b, _devs, _clk, _rec = ResilientBus(), build_devices(CATALOG), _Clk(23 * 60), _Rec()
_eng = RuleEngine(_b, _devs, Daylight(_clk), _clk, _rec)
_eng.add(Rule("Welcome", on="motion", when=(after_dark(),), then=light_on(60)))
_b.emit("motion", {"room": "kitchen"})
assert _devs["kitchen_light"].level == 60, "At night the Welcome rule should switch the kitchen light to 60"
_st = _eng.status["Welcome"]
assert (_st["fired"], _st["skipped"], _st["result"], _st["last"]) == (1, 0, "fired", "motion event and it is dark"), f"Unexpected status {_st}"
_fired = [e for e in _b.history if e.name == "rule.fired"]
assert len(_fired) == 1 and _fired[0].payload["rule"] == "Welcome" and _fired[0].payload["why"] == "motion event and it is dark", "A fired rule should announce rule.fired with the rule name and the reason, exactly once"
_clk.minute = 12 * 60
_devs["kitchen_light"].execute("off")
_b.emit("motion", {"room": "kitchen"})
assert _devs["kitchen_light"].level == 0, "In daylight the rule must not run its effect"
assert (_st["fired"], _st["skipped"], _st["result"], _st["last"]) == (1, 1, "skipped", "needs: it is dark"), f"The skip should be counted and explained, got {_st}"
_b.emit("door", {"open": True})
_b.emit("rule.fired", {"rule": "fake"})
assert (_st["fired"], _st["skipped"]) == (1, 1), "Events the rule is not 'on' must not count, and rule.* events must be ignored"
assert len([e for e in _b.history if e.name == "rule.fired"]) == 2, "The engine must not react to its own rule.fired announcements (only the earlier real one and the fake we emitted)"
_json.dumps(list(_eng.log))
assert [(e["rule"], e["result"]) for e in _eng.log] == [("Welcome", "fired"), ("Welcome", "skipped")] and set(_eng.log[0]) == {"seq", "rule", "result", "why", "event"}, f"Unexpected log {list(_eng.log)}"
try:
    _eng.add(Rule("Welcome", on="x", when=(), then=lambda ctx: None))
except ValueError:
    pass
else:
    raise AssertionError("Adding a second rule with the same name should raise ValueError")`,
            },
            {
              id: "t7",
              description: "One failing rule cannot stop the others",
              assertionCode: py`class _Rec:
    def __init__(self):
        self.sent = []
    def send(self, title, body=""):
        self.sent.append((title, body))
class _Clk:
    def __init__(self, minute):
        self.minute = minute
    def now(self):
        return self.minute
def _explode(ctx):
    raise RuntimeError("kaput")
_b, _devs, _clk = ResilientBus(), build_devices(CATALOG), _Clk(12 * 60)
_eng = RuleEngine(_b, _devs, Daylight(_clk), _clk, _Rec())
_eng.add(Rule("Broken", on="motion", when=(), then=_explode))
_eng.add(Rule("After", on="motion", when=(), then=light_on(30)))
try:
    _b.emit("motion", {"room": "hall"})
except Exception as _err:
    raise AssertionError(f"The engine must catch a failing effect itself instead of raising {_err!r}")
assert _eng.status["Broken"]["failed"] == 1 and _eng.status["Broken"]["result"] == "failed" and _eng.status["Broken"]["last"] == "RuntimeError: kaput", f"The failure should be recorded in the rule's status, got {_eng.status['Broken']}"
assert _eng.status["After"]["fired"] == 1 and _devs["hall_light"].level == 30, "Rules after a failing one must still run"
assert len(_b.errors) == 0, "The engine handled the failure itself, so nothing should reach the bus's dead letters"
assert [e.payload["rule"] for e in _b.history if e.name == "rule.fired"] == ["After"], "A failed rule must not announce rule.fired"`,
            },
            {
              id: "t8",
              description: "The hub tells a story",
              assertionCode: py`import json as _json
for _i in ("hall_light", "living_light", "kitchen_light", "bedroom_light"):
    devices[_i].execute("off")
devices["front_lock"].execute("lock")
world_event("time", {"minute": 12 * 60})
world_event("motion", {"room": "hall"})
assert devices["hall_light"].level == 0, "By day, motion should not switch the light on"
_welcome = [r for r in automations()["rules"] if r["name"] == "Welcome light"]
assert _welcome and _welcome[0]["last"] == "needs: it is dark" and _welcome[0]["skipped"] >= 1, f"The Welcome light rule should report why it did not fire, got {_welcome}"
world_event("time", {"minute": 21 * 60})
world_event("motion", {"room": "kitchen"})
assert devices["kitchen_light"].level == 60, "After dark, motion should set the kitchen light to 60 (dimmed by the rule, not the old always-on listener)"
world_event("motion_clear", {"room": "kitchen"})
assert devices["kitchen_light"].level == 0, "When the room empties its light should go off"
_n = len(notifications())
world_event("door", {"open": True})
assert devices["hall_light"].level == 70, "Opening the door after dark should light the hall at 70"
assert len(notifications()) == _n + 1, "The door watcher from lesson 12 should still notify"
devices["living_speaker"].execute("on")
world_event("time", {"minute": 23 * 60 + 30})
assert all(devices[f"{r}_light"].level == 0 for r in ("hall", "living", "kitchen", "bedroom")) and devices["living_speaker"].playing is False, "Goodnight should switch everything off"
assert devices["front_lock"].locked is True and devices["living_blinds"].position == 0 and devices["bedroom_blinds"].position == 0, "Goodnight should lock the door and close the blinds"
world_event("time", {"minute": 23 * 60 + 45})
_good = [r for r in automations()["rules"] if r["name"] == "Goodnight"][0]
assert _good["fired"] == 1 and _good["result"] == "skipped" and _good["last"] == "needs: something is still on or unlocked", f"Goodnight must fire once and then wait until something changes, got {_good}"
world_event("time", {"minute": 7 * 60 + 30})
assert devices["living_blinds"].position == 100 and devices["bedroom_blinds"].position == 100, "At 07:30 the Sunrise blinds rule should open the blinds"
_before = len(notifications())
world_event("temperature", {"value": 12})
assert len(notifications()) == _before + 1 and notifications()[-1]["title"] == "Heating on", "When the heating switches on, the phone should hear about it"
_names = [e["name"] for e in event_log(limit=200)]
assert "rule.fired" in _names, "Fired rules should show up in the event log as rule.fired"
devices["thermostat"].execute("measure", 21)`,
            },
            {
              id: "t9",
              description: "automations() describes every rule",
              assertionCode: py`_report = automations()
_json.dumps(_report)
assert isinstance(engine, RuleEngine), "Keep the hub's engine in a variable called engine"
_names = [r["name"] for r in _report["rules"]]
assert _names == ["Welcome light", "Lights off when empty", "Welcome home", "Goodnight", "Sunrise blinds", "Heating notice"], f"Add the six rules in this order with these names, got {_names}"
assert all({"name", "on", "fired", "skipped", "failed", "result", "last"} <= set(r) for r in _report["rules"]), "Each rule entry needs name, on, fired, skipped, failed, result and last"
assert all({"seq", "rule", "result", "why", "event"} <= set(e) for e in _report["log"]) and len(_report["log"]) >= 3, "The log should hold the recent decisions"
_report["rules"][0]["fired"] = 999
assert automations()["rules"][0]["fired"] != 999, "automations() should return copies so the scene cannot change the engine's counters"`,
            },
          ],
          unlocks: ["sh-automations"],
          checks: [
            {
              prompt: `Why must \`RuleEngine._on_event\` ignore events whose name starts with \`rule.\`?`,
              question: {"type":"choice","options":["The engine listens to every event and emits rule.fired itself, so it would react to its own announcements and could loop forever","Those events are slower to process","The scene cannot display them otherwise","Python reserves the prefix rule."],"answer":0},
              explanation: `A wildcard subscriber sees everything, including what it publishes. Naming a family of internal events and excluding them is the standard way to avoid a feedback loop.`,
            },
            {
              prompt: `The Goodnight rule has a condition "something is still on or unlocked". What problem does it solve?`,
              question: {"type":"choice","options":["It is only there for the dashboard","Time events keep arriving after 23:00, so without a state check the rule would fire again on every one","It makes the rule run faster","It prevents the lock from opening"],"answer":1},
              explanation: `Time-based rules should also check state. The clock stays past 23:00 for hours, but once the house is shut down there is nothing left to do, so the rule skips and says why.`,
            },
            {
              prompt: `Which earlier idea does \`@condition("it is dark")\` rely on?`,
              question: {"type":"choice","options":["weakref.WeakMethod","A decorator with arguments (a factory that returns the real decorator)","A generator expression","An abstract base class"],"answer":1},
              explanation: `\`condition(text)\` runs first and returns \`mark\`, which then receives the function: three layers of closures, just like \`retry(times=3)\`.`,
            },
          ],
        },
      ],
    },
  ],
};
