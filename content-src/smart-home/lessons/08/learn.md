### Wrapping a function without touching it

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

`*args, **kwargs` means "accept anything and pass it along", so one decorator fits functions with any signature. Other languages reach the same goal with different tools: middleware pipelines and `DispatchProxy` in C#, annotations handled by a proxy (Spring AOP) in Java, and the classic *decorator pattern*, a wrapper with the same interface as the thing it wraps. Python just makes the wrapper a one-line `@` away.

### Keep the original's identity: `functools.wraps`

Without help, the wrapper *replaces* the function, including its name and docstring, which confuses logs, tracebacks and `help()`. One line fixes it:

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

- **Logging**: record the arguments and the result. If the original raises, record that too and re-raise with a bare `raise` so the caller still sees the real error.
- **Timing**: note the start, call, and report the elapsed time in a `finally` block so it is recorded even when the function fails. Use `time.perf_counter()` for durations.
- **Retrying**: call in a loop, catch the failures you expect, and give up (re-raise) after the last attempt.

### Decorators with arguments

`@retry(times=3)` first *calls* `retry(3)`, which must return the real decorator. So there are three layers: a factory taking the options, the decorator taking the function, and the wrapper taking the call.

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

It is the closure lesson again: `times` and `func` are captured by the layers inside.

### Stacking order

~~~python
# same as: send = logged(timed(send))
@logged
@timed
def send(...): ...
~~~

Decorators are *applied* from the bottom up, so `timed` wraps `send` first and `logged` wraps that. When you call it, the outermost wrapper runs first. Think of layers of wrapping paper: you open the outside layer first. Swapping the two lines changes which one measures the other.

### Decorating something that already exists

`command = logged(command)` is exactly what `@logged` would have done had the decorator been available earlier. It is how you add behaviour to a function from another module, or one defined earlier in the same file.

### Common mistakes

- Forgetting `return result` in the wrapper, so every decorated function suddenly returns `None`.
- Forgetting `return wrapper` at the end of the decorator.
- Writing `@retry` when you meant `@retry()` or `@retry(times=3)`: the function becomes the `times` argument.
- Swallowing exceptions in the wrapper: a logging decorator should log and re-raise, not hide the failure.
- Retrying an action that is not safe to repeat (charging a card, sending an email). Retry things that are *idempotent*.
- Leaving out `functools.wraps`, then wondering why every function in your logs is called `wrapper`.
