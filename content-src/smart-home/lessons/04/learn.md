### Interfaces without inheritance

An abstract base class says "you must *be* a `Device`". Sometimes that is the wrong demand. A speaker and a lamp both have `turn_on()` and `turn_off()`, but a vendor's smart plug, a test double, or a class from a library you cannot edit might too, and none of them will ever inherit from your base class. What you care about is the **shape**: can it do these things?

That is a **structural** interface, and Python spells it `typing.Protocol`. If you know Go interfaces or TypeScript types, this is the same idea. It is *duck typing made explicit*: if it walks like a duck and quacks like a duck, a Protocol lets you write the duck down.

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

- Protocol members are written as signatures with `...` as the body; they describe, they do not implement.
- A type checker (mypy, pyright, your editor) uses the protocol to verify calls statically. At **runtime** Python normally does nothing, which is why plain duck typing keeps working.
- `@runtime_checkable` additionally lets `isinstance()` check that the methods *exist*. It does not check signatures or return types, so treat it as a quick capability test, not proof.
- Keep protocols **small and role-shaped** (`Switchable`, `Sensor`, `Notifier`). A class can satisfy many of them. This is the *interface segregation* principle: no consumer should depend on methods it does not use.

### ABC or Protocol?

**Reach for an ABC when**

- you own the family and want shared code and shared state in the base class;
- you want a hard error the moment someone forgets a method (it fires at instantiation);
- the relationship really is "is-a" and belongs in the class hierarchy.

**Reach for a Protocol when**

- you need to accept things you do not control: library classes, vendor gadgets, fakes in tests;
- the interface is a narrow capability that cuts across unrelated classes;
- you want classes to qualify just by having the right methods.

*Nominal* (ABC) interfaces are joined by name: you must inherit. *Structural* (Protocol) interfaces are joined by shape. C# and Java interfaces are nominal, so an ABC is the closer match there. In real programs you often use both, exactly as this lesson does: `Device` is the family contract, `Switchable` and `Sensor` are capabilities that some devices happen to have.

### A rule of thumb

Define the interface where it is **used**, not where it is implemented. The code that wants to switch things off declares `Switchable`; the light never needs to know that interface exists. That keeps dependencies pointing the right way and makes fakes trivial: any tiny class with the right methods will do.

### Common mistakes

- Forgetting `@runtime_checkable` and then calling `isinstance(x, Switchable)`: you get a `TypeError`.
- Trusting `isinstance` against a protocol to prove the *signatures* match. It only checks the names.
- Making a protocol for a single class that you own. If there is one implementation and no tests need a fake, you do not need an interface yet.
- Writing protocol bodies with real code. Use `...`.
