### How a `for` loop really works

A `for` loop asks an **iterable** for an **iterator**, then keeps asking the iterator for the next item until it signals "no more" with `StopIteration`.

~~~python
numbers = [10, 20]
it = iter(numbers)        # list -> iterator
next(it)                  # 10
next(it)                  # 20
next(it)                  # StopIteration
~~~

Anything that has `__iter__` (returning an iterator) is iterable. An **iterator** has `__next__` too, and its `__iter__` returns itself. Lists, dicts, files, `range` and `deque` are iterable; once you start walking one with `next`, you are holding an iterator.

### Lazy beats eager

A list holds every item right now. A **generator** produces items one at a time, only when asked, and forgets them afterwards. It uses `yield` instead of `return`:

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
- **Pipelines** compose: each stage pulls from the one before. A generator expression, `(e for e in events if e.name == "door")`, is the one-line version.

`yield from other` hands over everything another iterable produces. `itertools.islice(stream, n)` takes at most `n` items without turning the stream into a list. If you know LINQ's deferred execution (`IEnumerable`, `yield return`), Java streams, or JavaScript generators, this is the same family of ideas.

### Generators are single-use and start late

~~~python
stream = evens(6)
list(stream)           # [0, 2, 4]
list(stream)           # [] exhausted: no rewind
~~~

Two more surprises:

- **The body does not run when you call the function.** Calling `evens(6)` only builds the generator object; the first line of the body runs on the first `next()`. So a `raise ValueError` at the top of a generator function is delayed until someone starts iterating. If you want bad arguments to fail immediately, validate in an ordinary function that returns the generator.
- **Do not change a collection while a generator walks it.** Iterating a `deque` that another piece of code appends to raises `RuntimeError`. Consume the stream (for example into a list) before events can be emitted.

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

`for x in Countdown(3)` calls `__iter__` once, then `__next__` repeatedly until `StopIteration`. Prefer a generator when you can (shorter, harder to get wrong). Reach for a class when you need state that outlives one pass or extra methods.

### Common mistakes

- Calling `len()` on a generator or indexing it: it has neither.
- Looping over the same generator twice and being surprised the second loop is empty.
- Forgetting `StopIteration` in `__next__`, producing an endless loop.
- Building a list "to be safe" when the next step only needs the first few items.
