### One message, many behaviours

**Polymorphism** means "many shapes": you send the same message to different objects and each responds in its own way. A loop over devices calls `device.execute("off")`, and a light dims to zero while a lock refuses politely. The loop never asks *what kind of thing is this?*

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

Code like that must be reopened every time a device type is added. Code that only relies on the contract is **open for extension, closed for modification**: write a `Blinds` class next week and every existing loop already works with it.

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

Notice what is **not** caught: a `ValueError` for a bad value such as `dim 999` should surface, because it signals a mistake by the caller, not a capability gap. Catch the narrowest exception that describes the situation you expect.

### Honouring the contract (Liskov in plain words)

A subclass should be usable anywhere its base class is. That means your new devices must follow the *same rules*: `state()` returns plain values, `execute()` raises `UnsupportedAction` for unknown actions (never quietly ignores them), and invalid values raise `ValueError`. If one subclass broke those rules, every loop over devices would need special cases and the polymorphism would be gone.

### The thermostat and the dead band

A naive thermostat that switches on below the target and off at or above it would flicker constantly around the target. Real ones use **hysteresis**: heating starts when the room is half a degree *below* the target and stops only when the target is *reached*. Between those two values the thermostat keeps doing whatever it was already doing, so it carries a little memory (`self.heating`).

~~~python
if current <= target - 0.5:
    heating = True
elif current >= target:
    heating = False
# otherwise: unchanged
~~~

### Common mistakes

- Catching bare `Exception` around `execute()`: you would also hide real bugs inside a device.
- Raising `NotImplementedError` in a subclass for an action it should simply refuse: use the contract's `UnsupportedAction`.
- Letting a setter validate *after* it stores the value, so a rejected value still changes the object. Validate first, assign after.
