### A contract every device must honour

A smart home controls lamps, locks and thermostats that have almost nothing in common, yet the hub wants to treat them uniformly: *give me your state, do this action*. That shared promise is an **interface**. In C# you would write `interface IDevice`, in Java `interface Device`. Python's version of a *nominal* interface (one you join by naming it) is an **abstract base class**.

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

- **The check happens when you create an object**, not when you define the class. A subclass that forgets one abstract method is perfectly legal to *write*, but `Subclass()` raises `TypeError` and names the missing method.
- **An ABC can hold real code.** `describe()` is written once and works for every shape. It calls the abstract `area()`, and each subclass decides what that means. This is the *template method* idea: the base class fixes the skeleton, subclasses fill in the blanks.
- **Signatures are not checked.** Python only checks that a method with that name exists. Keep the parameters consistent yourself, and write type hints so tools can help.

### Taking a contract to the smart home

Every device will promise two things: `state()` (its readings as plain values) and `execute(action, value)` (do something). The base class adds shared behaviour such as `describe()`, which combines identity with state.

An unknown action should fail loudly but *specifically*. A custom exception that inherits from `ValueError` lets callers catch the whole family (`except ValueError`) or just this case.

~~~python
class UnsupportedAction(ValueError):
    """Raised when a device is asked to do something it cannot do."""
~~~

### Classes are values too

A registry dict such as `{Kind.LIGHT: Light}` maps a *kind* to the **class** that builds it. `FACTORIES[spec.kind](spec)` looks up a class and calls it. Adding a new device type means adding one entry, not editing a chain of `if/elif`. You will use the same trick with functions in chapter 2.

### Do not let exceptions cross the boundary

`command()` is called by the scene, a different program. If a device raises, the dashboard should show a clear error, not crash. So `command()` catches `ValueError` and **returns** `{"ok": False, "error": "..."}`. Inside your code, raise; at the boundary, report.

### Common mistakes

- Forgetting `super().__init__(spec)` in a subclass, so `self.spec` never exists.
- Putting `@abstractmethod` on a method but inheriting from a plain class: without `ABC` (or `metaclass=ABCMeta`) nothing is enforced.
- Validating with `if not level:` when `0` is a legal value. Compare against `None` or a range explicitly.
- Combining decorators: `@property` goes on the outside, `@abstractmethod` on the inside.
