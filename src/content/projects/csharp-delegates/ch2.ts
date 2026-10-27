import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

export const chapter2: Chapter = {
  id: "events-and-types",
  title: "Events, observers and generics",
  blurb: "Let components talk without knowing each other, and let the type system keep them honest.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "csharp-delegates-5-events",
      title: "Events",
      minutes: 35,
      xp: 200,
      concepts: ["event keyword", "EventHandler<T>", "EventArgs", "raising safely", "+= and -=", "lapsed listeners"],
      learn: md`### A board that must not know its audience

Tonight's cue board at Lantern Hall has to tell the house lights, the sound desk and Odile Marsh's prompt screen whenever a cue fires. The tempting first draft simply names all three:

~~~csharp
class CueBoard
{
    HouseLights house = new();
    SoundDesk sound = new();
    PromptScreen prompt = new();

    public void Fire(int number, string name)
    {
        house.OnCue(name);
        sound.OnCue(name);
        prompt.OnCue(name);
    }
}
~~~

Every new listener means editing \`CueBoard\`, and you cannot test the board without building all three listeners. You already own the cure from chapter 1: a multicast delegate is a list of methods to call. An **event** is exactly that list, with a fence around it.

### What the \`event\` keyword adds

Compare two members:

~~~csharp
public Action<string>? Fired;              // a public delegate field
public event Action<string>? FiredSafely;  // an event
~~~

With the public field, *any* code can write \`board.Fired = null\` (silently throwing away every subscriber) or call \`board.Fired("x")\` (pretending the board fired). With \`event\`, code outside the class gets exactly two operations, \`+=\` and \`-=\`. Only the declaring class can read the list or invoke it. The compiler builds an event out of a private delegate field plus a pair of \`add\` and \`remove\` methods, which is why an event is often described as a property for delegates. Everything else is a build error:

~~~text
Program.cs(12,7): error CS0070: The event 'CueBoard.CueFired' can only appear on the left hand side of += or -= (except when used from within the type 'CueBoard')
~~~

That one rule is the whole point. The publisher decides *when* something happened; subscribers only decide whether to listen.

### The standard shape: EventHandler<TEventArgs>

By convention, an event's delegate type is \`EventHandler<TEventArgs>\`, which means "a method returning \`void\` with two parameters":

~~~csharp
delegate void EventHandler<TEventArgs>(object? sender, TEventArgs e);
~~~

- \`sender\` is the publisher that raised the event (\`this\`). It is \`object?\` because the publisher can be anything, and static events pass \`null\`.
- \`e\` is the payload, packed into a class so you can add a field later without changing every handler's signature.

Our payload derives from \`EventArgs\`, the empty base class that conventionally marks "event data". It is a **class**, not a record: a record may only inherit from another record, and trying gives \`error CS8864: Records may only inherit from object or another record\`.

~~~csharp
class CueFiredEventArgs : EventArgs
{
    public int Number { get; }
    public string Name { get; }

    public CueFiredEventArgs(int number, string name)
    {
        Number = number;
        Name = name;
    }
}
~~~

Handlers return \`void\`, so they cannot answer the publisher. If a handler really must influence the outcome (a "cancel this" flag, say), the usual trick is a settable property on the args object, used sparingly.

### Raising an event safely

Inside the publisher, the event name is an ordinary delegate that may be \`null\` (no subscriber has ever attached, or the last one left). Invoke it with the null-conditional operator:

~~~csharp
protected virtual void OnCueFired(CueFiredEventArgs e)
{
    CueFired?.Invoke(this, e);
}
~~~

Two details are worth knowing. First, \`?.\` reads the field **once** into a temporary before testing it, so another thread unsubscribing the last handler between "is it null?" and "call it" cannot cause a crash; the older spelling \`if (CueFired != null) CueFired(this, e);\` reads the field twice and has that race. Second, forgetting the guard is a classic latent bug, because it only fails when nobody listens, and your own tests probably always have a listener:

~~~text
NullReferenceException: Object reference not set to an instance of an object.
~~~

The \`protected virtual On...\` wrapper is a convention worth following. A subclass of \`CueBoard\` can override \`OnCueFired\` to add behaviour (log every cue) or to suppress the event, and \`Fire\` stays short: build the args, call \`OnCueFired\`.

### Handlers run on your call stack

Raising an event is a plain method call chain, not a message left in a mailbox. Every handler runs **synchronously, on the publisher's thread, in the order it subscribed**, and the next one does not start until the previous one returns. That has consequences that surprise people:

~~~csharp
gate.Opened += (s, e) => Console.WriteLine("first heard");
gate.Opened += (s, e) => throw new InvalidOperationException("second handler broke");
gate.Opened += (s, e) => Console.WriteLine("third heard");
gate.Open();
~~~

The output is \`first heard\`, then \`Open()\` throws \`second handler broke\` back at the publisher, and *the third handler never runs*. A slow handler slows the publisher; a throwing handler breaks it. You met the defence in lesson 4: walk \`GetInvocationList()\` yourself and catch per handler.

### Subscribing, unsubscribing and delegate equality

\`+=\` adds a handler; \`-=\` removes the **last** matching one. "Matching" means delegate equality: same method and same target object. A method group works naturally:

~~~csharp
board.CueFired += OnHouse;
board.CueFired -= OnHouse;   // removed
~~~

A lambda does not. Each lambda expression creates its own delegate object, so this removes nothing:

~~~csharp
gate.Opened += (s, e) => Console.WriteLine("ping");
gate.Opened -= (s, e) => Console.WriteLine("ping");   // a lookalike, not the same delegate
// listeners afterwards: still 1
~~~

If you ever need to unsubscribe a lambda, store it in a variable first (that is what \`onSound\` is for in this lesson), then use the variable on both sides. Unsubscribing something that was never subscribed is silently ignored, which is why the bug above produces no error at all.

### The lapsed listener

An event stores a reference to every subscriber's delegate, and a delegate holds a reference to its target object. So **the publisher keeps every subscriber alive**. Imagine a \`PromptScreen\` window that subscribes to \`CueFired\` in its constructor and is closed after Act One. If nobody unsubscribes, the board still points at it: the garbage collector cannot free it, and it keeps reacting to cues, updating a window nobody can see. Multiply by every scene change and you have a memory leak with a very confusing symptom (ghost handlers running). A static event is the worst case, because the publisher lives as long as the process.

The defences are boring and reliable: unsubscribe when the subscriber's job ends (in \`Dispose\`, which lesson 16 builds on), keep the subscriber's lifetime no longer than the publisher's, or hand out a subscription token you can dispose, which is exactly what lesson 6's \`IObservable<T>\` does. That is also why \`CueBoard\` here exposes \`Listeners\`: a cheap diagnostic that makes a leak visible.

### Common mistakes

- Invoking or assigning the event from outside the class: \`error CS0070\`, shown above. The same error appears for \`board.CueFired = null;\`.
- A handler with the wrong shape. A method group with the wrong parameters gives \`error CS0123: No overload for 'WrongShape' matches delegate 'EventHandler<CueFiredEventArgs>'\`; a lambda with the wrong parameter count gives \`error CS1593: Delegate 'EventHandler<CueFiredEventArgs>' does not take 3 arguments\`.
- Calling the protected raiser from outside: \`error CS0122: 'CueBoard.OnCueFired(CueFiredEventArgs)' is inaccessible due to its protection level\`. Outside code should call \`Fire\`, not the raiser.
- Raising with \`CueFired.Invoke(this, e)\` and no \`?\`: a \`NullReferenceException\` the day nobody is subscribed.
- Trying to unsubscribe with a second, identical-looking lambda.
- Expecting handlers to run in parallel, or to be isolated from each other's exceptions. They are neither.`,
      mission: md`Odile Marsh calls the show from a clipboard, and tonight her cue board is held together with copy-pasted method calls: add a new screen backstage and somebody has to open the board's source. She wants the board to simply announce "cue fired" and let anyone who cares listen in.

You will turn the board into a proper publisher. House lights and the sound desk subscribe, the sound desk later leaves, and every delivery is written to a log so you can see exactly who heard what.

Pass this lesson and the **Event bus** panel on the board powers on: your publisher on one side, subscribers on the other, and each delivery drawn as it travelled.`,
      tasks: [
        "Under the divider declare class CueFiredEventArgs : EventArgs with get-only properties int Number and string Name, both set by a constructor (int number, string name)",
        "Under the divider declare class CueBoard with public event EventHandler<CueFiredEventArgs>? CueFired; an int property Listeners (the number of attached handlers, 0 when the event is null); public void Fire(int number, string name); and protected virtual void OnCueFired(CueFiredEventArgs e) which raises the event with ?.Invoke(this, e)",
        "Above the divider create List<object> busLog and CueBoard board. Write a local function OnHouse(object? sender, CueFiredEventArgs e) and a variable EventHandler<CueFiredEventArgs> onSound (a lambda). Each adds new { publisher = \"CueBoard\", eventName = \"CueFired\", subscriber = ..., payload = e.Name } to busLog, with subscriber \"HouseLights\" for OnHouse and \"SoundDesk\" for onSound",
        "Run the scenario in this order. board.Fire(0, \"preset\") and print 0 listeners, nothing happened (build the number from board.Listeners). Subscribe OnHouse and onSound, print 2 listeners, then board.Fire(1, \"house-down\"). Unsubscribe onSound, print 1 listener left, then board.Fire(2, \"curtain-up\"). Print 3 deliveries logged",
        "Send everything to the board with Desk.Show(\"bus\", new { log = busLog, listeners = board.Listeners });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: events. The cue board announces; other parts of the desk listen.
// Statements (above the divider):
// 1. List<object> busLog = new();   CueBoard board = new();
// 2. A local function  void OnHouse(object? sender, CueFiredEventArgs e)  that adds
//      new { publisher = "CueBoard", eventName = "CueFired", subscriber = "HouseLights", payload = e.Name }
//    to busLog.
// 3. A variable  EventHandler<CueFiredEventArgs> onSound = (sender, e) => { ... };  doing the same with
//    subscriber = "SoundDesk". (A variable, so you can unsubscribe it later.)
// 4. board.Fire(0, "preset");                          then print:  0 listeners, nothing happened
//    board.CueFired += OnHouse;  board.CueFired += onSound;   print:  2 listeners
//    board.Fire(1, "house-down");
//    board.CueFired -= onSound;                        print:  1 listener left
//    board.Fire(2, "curtain-up");                      print:  3 deliveries logged
//    (use board.Listeners and busLog.Count to build the numbers in the lines)
// 5. Desk.Show("bus", new { log = busLog, listeners = board.Listeners });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the event types here.
//   class CueFiredEventArgs : EventArgs
//       get-only int Number and string Name, set by a constructor (int number, string name)
//   class CueBoard
//       public event EventHandler<CueFiredEventArgs>? CueFired;
//       public int Listeners   -> how many handlers are attached (0 when CueFired is null)
//       public void Fire(int number, string name)   -> builds the args and calls OnCueFired
//       protected virtual void OnCueFired(CueFiredEventArgs e)   -> CueFired?.Invoke(this, e);`,
      solutionAdd: cs`// Lesson 5: events.
List<object> busLog = new();
CueBoard board = new();

void OnHouse(object? sender, CueFiredEventArgs e)
{
    busLog.Add(new { publisher = "CueBoard", eventName = "CueFired", subscriber = "HouseLights", payload = e.Name });
}

EventHandler<CueFiredEventArgs> onSound = (sender, e) =>
{
    busLog.Add(new { publisher = "CueBoard", eventName = "CueFired", subscriber = "SoundDesk", payload = e.Name });
};

board.Fire(0, "preset");
Console.WriteLine($"{board.Listeners} listeners, nothing happened");

board.CueFired += OnHouse;
board.CueFired += onSound;
Console.WriteLine($"{board.Listeners} listeners");
board.Fire(1, "house-down");

board.CueFired -= onSound;
Console.WriteLine($"{board.Listeners} listener left");
board.Fire(2, "curtain-up");
Console.WriteLine($"{busLog.Count} deliveries logged");

Desk.Show("bus", new { log = busLog, listeners = board.Listeners });

${TYPES_DIVIDER}

class CueFiredEventArgs : EventArgs
{
    public int Number { get; }
    public string Name { get; }

    public CueFiredEventArgs(int number, string name)
    {
        Number = number;
        Name = name;
    }
}

class CueBoard
{
    public event EventHandler<CueFiredEventArgs>? CueFired;

    public int Listeners
    {
        get { return CueFired?.GetInvocationList().Length ?? 0; }
    }

    public void Fire(int number, string name)
    {
        OnCueFired(new CueFiredEventArgs(number, name));
    }

    protected virtual void OnCueFired(CueFiredEventArgs e)
    {
        CueFired?.Invoke(this, e);
    }
}`,
      explanation:
        "CueBoard owns the event, so only it can raise it; everyone else can only attach and detach with += and -=. Fire builds the payload and hands it to OnCueFired, which raises with ?.Invoke so a board nobody is listening to simply does nothing (that is why the first Fire prints no deliveries). Subscribing OnHouse and onSound puts two delegates on the invocation list, in that order, so the first Fire logs HouseLights then SoundDesk. onSound is kept in a variable, so board.CueFired -= onSound hands back the very same delegate and removes it; the second Fire reaches only HouseLights. Three deliveries in total, and Listeners reports 1 at the end because it counts the invocation list.",
      hints: [
        { id: "h1", title: "Start from the types", content: "Write the types under the divider first: the args class with its constructor, then CueBoard. Fire should only build a CueFiredEventArgs and call OnCueFired; all the null-safety lives in that one raiser method." },
        { id: "h2", title: "The shape of the board", content: "The event is declared as: public event EventHandler<CueFiredEventArgs>? CueFired; The raiser body is a single line: CueFired?.Invoke(this, e); And Listeners can be: CueFired?.GetInvocationList().Length ?? 0 (written as a get-only property)." },
        { id: "h3", title: "Near-complete scenario", content: "EventHandler<CueFiredEventArgs> onSound = (sender, e) => { busLog.Add(new { publisher = \"CueBoard\", eventName = \"CueFired\", subscriber = \"SoundDesk\", payload = e.Name }); }; Then: board.Fire(0, \"preset\"); print the zero line; board.CueFired += OnHouse; board.CueFired += onSound; print Listeners; board.Fire(1, \"house-down\"); board.CueFired -= onSound; and so on. Build each printed number with an interpolated string such as $\"{board.Listeners} listeners\"." },
      ],
      tests: [
        {
          id: "t1",
          description: "firing with nobody listening is harmless",
          assertionCode: js`assert(lines.includes("0 listeners, nothing happened"), 'No line is exactly "0 listeners, nothing happened". Call board.Fire(0, "preset") before anyone subscribes and print $"{board.Listeners} listeners, nothing happened". If the program crashed instead, raise the event with CueFired?.Invoke(this, e) so a null event is skipped.');`,
        },
        {
          id: "t2",
          description: "the listener count follows += and -=",
          assertionCode: js`
const two = lines.indexOf("2 listeners");
const one = lines.indexOf("1 listener left");
assert(two >= 0, 'Print "2 listeners" after subscribing OnHouse and onSound (use board.Listeners, which counts the invocation list).');
assert(one >= 0, 'Print "1 listener left" after board.CueFired -= onSound. If it still says 2, check that you removed the same delegate variable you added.');
assert(two < one, "Print the lines in the order of the scenario: 2 listeners first, then 1 listener left.");`,
        },
        {
          id: "t3",
          description: "every delivery lands in the log",
          assertionCode: js`assert(lines.includes("3 deliveries logged"), 'No line is exactly "3 deliveries logged". Cue 1 reaches two handlers and cue 2 reaches one, so busLog should hold three entries.');`,
        },
        {
          id: "t4",
          description: "the bus log records who heard what, in subscription order",
          assertionCode: js`
assert(scene.bus && Array.isArray(scene.bus.log), 'Send the log with Desk.Show("bus", new { log = busLog, listeners = board.Listeners });');
const log = scene.bus.log;
assertEqual(log.length, 3, "bus.log entries (cue 1 reaches HouseLights and SoundDesk, cue 2 only HouseLights)");
assertEqual(log.map((d) => d.subscriber), ["HouseLights", "SoundDesk", "HouseLights"], "subscribers in delivery order (handlers run in the order they subscribed)");
assertEqual(log.map((d) => d.payload), ["house-down", "house-down", "curtain-up"], "payload (e.Name) of each delivery");`,
        },
        {
          id: "t5",
          description: "entries name the publisher and the event; one listener remains",
          assertionCode: js`
const log = scene.bus?.log ?? [];
assert(log.length > 0 && log.every((d) => d.publisher === "CueBoard" && d.eventName === "CueFired"), 'Each log entry needs publisher = "CueBoard" and eventName = "CueFired".');
assertEqual(scene.bus.listeners, 1, "bus.listeners (only OnHouse is still subscribed at the end)");`,
        },
      ],
      unlocks: ["fl-bus"],
      checks: [
        {
          prompt: "A class exposes `public event EventHandler? Opened;`. What can code OUTSIDE that class do with `Opened`?",
          question: {
            type: "choice",
            options: [
              "Only attach and detach handlers with += and -=",
              "Attach handlers and also invoke it, but not assign null",
              "Anything a public delegate field allows",
              "Nothing: outside code cannot touch it at all",
            ],
            answer: 0,
          },
          explanation: "The `event` keyword narrows the public surface to subscribe and unsubscribe. Raising, clearing and replacing the invocation list are reserved for the declaring class, and anything else is `error CS0070`.",
        },
        {
          prompt: "You write `gate.Opened += (s, e) => Log(\"ping\");` and later `gate.Opened -= (s, e) => Log(\"ping\");`. What happens?",
          question: {
            type: "choice",
            options: [
              "Nothing is removed: the second lambda is a different delegate object",
              "The first handler is removed, because the code is identical",
              "A compile error, lambdas cannot be used with -=",
              "Every handler on the event is removed",
            ],
            answer: 0,
          },
          explanation: "`-=` compares delegates by method and target. Two lambda expressions produce two delegate objects, so the subscription stays and no error is reported. Store the lambda in a variable and use that variable on both sides.",
        },
        {
          prompt: "After `board.CueFired += A; board.CueFired += B; board.CueFired -= A; board.CueFired += A;`, in what order do the handlers run when the board fires?",
          question: {
            type: "choice",
            options: ["B, then A", "A, then B", "Whichever was written first in the file", "In an unspecified order"],
            answer: 0,
          },
          explanation: "Handlers run in invocation-list order, and `+=` always appends. Removing A and adding it again puts it at the end, so B runs first.",
        },
      ],
    },
    // ───────────────────────── 6 ─────────────────────────
    {
      id: "csharp-delegates-6-observers",
      title: "Observers",
      minutes: 35,
      xp: 210,
      concepts: ["observer pattern", "IObservable<T>", "IObserver<T>", "subscription token", "completion", "snapshot iteration"],
      learn: md`### What an event cannot say

Events are perfect for "this thing just happened". Tobias, the sound operator, wants something slightly bigger: a level meter and an alarm that both watch the dimmer's readings, 30, 60, 95 and so on, until the show ends. Try to say that with an event and four gaps appear:

- **No ending.** Subscribers cannot tell "no more readings tonight" from "no reading yet".
- **No failure channel.** If the dimmer board breaks, there is nowhere to report it except an exception thrown at whoever happened to be raising.
- **The subscription is not a value.** To leave you must still hold the exact handler and the exact publisher, and call \`-=\`.
- **The stream is not an object.** You cannot pass "the dimmer readings" to a method or return it, because it only exists as an event member on one specific class.

The **observer pattern** keeps the idea (a publisher pushes values to whoever signed up) and fixes those gaps by making the stream itself an object. The base library ships the two interfaces for it, and you can implement them with no extra packages.

### Two small interfaces

~~~csharp
interface IObservable<out T>
{
    IDisposable Subscribe(IObserver<T> observer);
}

interface IObserver<in T>
{
    void OnNext(T value);
    void OnError(Exception error);
    void OnCompleted();
}
~~~

The stream (\`IObservable<T>\`) has one method. The listener (\`IObserver<T>\`) has three, one per thing a stream can say: a value, a failure, the end. (Ignore the \`out\` and \`in\` words for now; lesson 7 explains them.) The informal contract is a little grammar: **any number of \`OnNext\` calls, then at most one terminal call (\`OnError\` or \`OnCompleted\`), then silence.** Compare this with \`IEnumerable<T>\`, which you will write by hand in lesson 8: there the consumer *pulls* values when it wants them; here the producer *pushes* them when they happen.

\`Subscribe\` returns an \`IDisposable\`. That token is the subscription: dispose it and you have left. It can be stored in a field, handed to a caller, or disposed by whoever owns the listener. Lesson 16 shows how \`using\` and \`Dispose\` make that tidy.

### Writing a Subject

A *subject* is a stream you can push into yourself. It is the smallest useful implementation of the pattern:

~~~csharp
class Subject<T> : IObservable<T>
{
    readonly List<IObserver<T>> observers = new();

    public int Count
    {
        get { return observers.Count; }
    }

    public IDisposable Subscribe(IObserver<T> observer)
    {
        observers.Add(observer);
        return new Unsubscriber(() => observers.Remove(observer));
    }

    public void OnNext(T value)
    {
        foreach (IObserver<T> observer in observers.ToArray())
        {
            observer.OnNext(value);
        }
    }
    // OnCompleted: the same loop calling observer.OnCompleted(), then observers.Clear()
}
~~~

Three decisions in there deserve a closer look.

**Notify a snapshot.** Observers are allowed to unsubscribe from inside their own \`OnNext\` ("I have seen enough"). If the loop walked the live list, the removal would change the list under the loop and .NET would stop it:

~~~text
Collection was modified; enumeration operation may not execute.
~~~

\`observers.ToArray()\` copies the list first, so the loop runs over a stable array while the real list changes freely. The price is one small array per notification; the benefit is that nobody has to remember a rule.

**The token must be safe to dispose twice.** Calling code often disposes defensively, and a second \`Remove\` could take out some *other* registration of an equal observer. A private \`Unsubscriber\` with a \`done\` flag runs the removal at most once.

**The subject finishes cleanly.** \`OnCompleted\` tells everyone, then clears the list, because nothing may follow a terminal call. A fuller implementation would also remember that it is finished and complete late subscribers immediately.

### Observers made from lambdas

Implementing \`IObserver<T>\` as a class for every little listener is clumsy. This is where chapter 1 pays off: a small adapter takes delegates and implements the interface.

~~~csharp
class DelegateObserver<T> : IObserver<T>
{
    readonly Action<T> next;
    readonly Action completed;

    public DelegateObserver(Action<T> next, Action completed)
    {
        this.next = next;
        this.completed = completed;
    }

    public void OnNext(T value) { next(value); }
    public void OnError(Exception error) { throw error; }
    public void OnCompleted() { completed(); }
}
~~~

Now a listener is two lambdas, and an interface with three methods collapsed into the shape you already know. (The \`OnError\` that rethrows is deliberate: this stream never reports errors, and silently swallowing one would hide a bug.) The separate Reactive Extensions library goes much further with this idea and adds ready-made operators such as filtering and throttling over \`IObservable<T>\`; you do not need it here, and in chapter 3 you will build the pull-based cousins of those operators yourself.

### Doing observers right

- **Dispose what you subscribe.** A subscription you never dispose is the same lapsed-listener leak as an event you never unsubscribe from. Let the object that created the subscription own the token.
- **Never assume order or count.** The publisher notifies "whoever is there". Code that works only because the meter happens to subscribe before the alarm is a bug waiting for a refactor.
- **Notify outside any lock.** If your subject is shared between threads, lock only while changing the list, copy it, release, and then call observers. Calling foreign code while holding a lock is how you get deadlocks when an observer calls back in.
- **Keep \`OnNext\` fast.** It runs on the publisher's thread. Heavy work belongs elsewhere; lesson 13's channel is the tool for handing it off.
- **Respect the grammar.** Nothing after \`OnCompleted\` or \`OnError\`.

**Event or \`IObservable<T>\`?** Use an event for a plain "something happened" tied to an object's lifetime, especially in UI-style code. Reach for \`IObservable<T>\` when the thing is a *stream* with a beginning and an end, when you want to hand the stream around as a value, or when a subscription token will make clean-up easier.

### Common mistakes

- Forgetting a member of the interface. The compiler lists exactly what is missing, for example \`error CS0535: 'Subject<T>' does not implement interface member 'IObservable<T>.Subscribe(IObserver<T>)'\` or \`error CS0535: 'Meter' does not implement interface member 'IObserver<int>.OnError(Exception)'\`.
- Looping over the live \`observers\` list, then watching a perfectly normal \`Dispose\` crash with \`Collection was modified; enumeration operation may not execute.\`
- Never disposing the token, so a "temporary" observer keeps receiving values for the rest of the show.
- Calling \`OnNext\` after \`OnCompleted\`. Our subject has cleared its list, so the call does nothing, which can hide a logic error in the publisher.
- Letting an observer's exception escape \`OnNext\`: it travels back to the publisher and the observers after it never hear that value.`,
      mission: md`Tobias sits at the sound desk with a mug of tea and two jobs: watch the dimmer levels, and shout if anything goes above 90. At the moment he does it by squinting. Odile would like two small listeners instead: a meter that records every reading, and an alarm that raises its voice, and that Tobias can switch off once the dangerous scene has passed.

You will build the stream, the adapter and the two listeners. The alarm leaves part-way through, so you can prove that disposing the token really stops the deliveries, and the meter stays long enough to hear the show end.

Pass this lesson and the **Light meters** panel on the board powers on, showing what each observer saw and who was told the show had finished.`,
      tasks: [
        "Under the divider declare class Subject<T> : IObservable<T> with a get-only int Count, a Subscribe that returns an IDisposable removing the observer (harmless if disposed twice), OnNext(T value) and OnCompleted(), both notifying over observers.ToArray(); OnCompleted also clears the list afterwards",
        "Under the divider declare class DelegateObserver<T> : IObserver<T> with a constructor (Action<T> next, Action completed). OnNext calls next, OnCompleted calls completed and OnError rethrows the exception",
        "Above the divider create Subject<int> dimmerReadings, List<int> meterSeen, List<int> alarmSeen and List<string> completed. Subscribe two DelegateObserver<int>s, keeping the tokens in IDisposable meter and IDisposable alarm: meter adds each reading to meterSeen and \"meter\" to completed when the stream ends; alarm adds to alarmSeen, prints ALARM: reading over 90 when a reading is above 90, and adds \"alarm\" to completed on completion",
        "Print 2 subscribers (from dimmerReadings.Count), then OnNext(30) and OnNext(60). Call alarm.Dispose(), store the count in int stillSubscribed and print alarm unsubscribed, 1 left. Then OnNext(95) and OnCompleted()",
        "Print meter saw: 30, 60, 95 then alarm saw: 30, 60 then completed for: meter (join with string.Join(\", \", ...)) and send Desk.Show(\"observers\", new { meter = meterSeen, alarm = alarmSeen, completed, stillSubscribed });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: observers. A stream you can subscribe to, and a subscription you can dispose.
// Statements (above the divider):
// 1. Subject<int> dimmerReadings = new();   List<int> meterSeen = new();   List<int> alarmSeen = new();
//    List<string> completed = new();
// 2. IDisposable meter = dimmerReadings.Subscribe(new DelegateObserver<int>(
//        reading => meterSeen.Add(reading),
//        () => completed.Add("meter")));
// 3. IDisposable alarm = ... the same idea: add to alarmSeen, and when reading > 90 print
//        ALARM: reading over 90      (a statement lambda with { } is handy), "alarm" on completion.
// 4. Print:  2 subscribers            (use dimmerReadings.Count)
//    dimmerReadings.OnNext(30);  dimmerReadings.OnNext(60);
//    alarm.Dispose();   int stillSubscribed = dimmerReadings.Count;   print:  alarm unsubscribed, 1 left
//    dimmerReadings.OnNext(95);  dimmerReadings.OnCompleted();
// 5. Print:  meter saw: 30, 60, 95
//            alarm saw: 30, 60
//            completed for: meter
//    Desk.Show("observers", new { meter = meterSeen, alarm = alarmSeen, completed, stillSubscribed });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the observer types here.
//   class Subject<T> : IObservable<T>
//       a List<IObserver<T>>, get-only int Count, Subscribe (returns an IDisposable that removes the observer once),
//       OnNext(T value) and OnCompleted() that loop over observers.ToArray(); OnCompleted then clears the list.
//   class DelegateObserver<T> : IObserver<T>
//       constructor (Action<T> next, Action completed); OnNext calls next; OnCompleted calls completed;
//       OnError(Exception error) rethrows it.`,
      solutionAdd: cs`// Lesson 6: the observer pattern.
Subject<int> dimmerReadings = new();
List<int> meterSeen = new();
List<int> alarmSeen = new();
List<string> completed = new();

IDisposable meter = dimmerReadings.Subscribe(new DelegateObserver<int>(
    reading => meterSeen.Add(reading),
    () => completed.Add("meter")));

IDisposable alarm = dimmerReadings.Subscribe(new DelegateObserver<int>(
    reading =>
    {
        alarmSeen.Add(reading);
        if (reading > 90)
        {
            Console.WriteLine("ALARM: reading over 90");
        }
    },
    () => completed.Add("alarm")));

Console.WriteLine($"{dimmerReadings.Count} subscribers");
dimmerReadings.OnNext(30);
dimmerReadings.OnNext(60);
alarm.Dispose();
int stillSubscribed = dimmerReadings.Count;
Console.WriteLine($"alarm unsubscribed, {stillSubscribed} left");
dimmerReadings.OnNext(95);
dimmerReadings.OnCompleted();

Console.WriteLine($"meter saw: {string.Join(", ", meterSeen)}");
Console.WriteLine($"alarm saw: {string.Join(", ", alarmSeen)}");
Console.WriteLine($"completed for: {string.Join(", ", completed)}");

Desk.Show("observers", new { meter = meterSeen, alarm = alarmSeen, completed, stillSubscribed });

${TYPES_DIVIDER}

class Subject<T> : IObservable<T>
{
    readonly List<IObserver<T>> observers = new();

    public int Count
    {
        get { return observers.Count; }
    }

    public IDisposable Subscribe(IObserver<T> observer)
    {
        observers.Add(observer);
        return new Unsubscriber(() => observers.Remove(observer));
    }

    public void OnNext(T value)
    {
        foreach (IObserver<T> observer in observers.ToArray())
        {
            observer.OnNext(value);
        }
    }

    public void OnCompleted()
    {
        foreach (IObserver<T> observer in observers.ToArray())
        {
            observer.OnCompleted();
        }
        observers.Clear();
    }

    sealed class Unsubscriber : IDisposable
    {
        readonly Action undo;
        bool done;

        public Unsubscriber(Action undo)
        {
            this.undo = undo;
        }

        public void Dispose()
        {
            if (!done)
            {
                done = true;
                undo();
            }
        }
    }
}

class DelegateObserver<T> : IObserver<T>
{
    readonly Action<T> next;
    readonly Action completed;

    public DelegateObserver(Action<T> next, Action completed)
    {
        this.next = next;
        this.completed = completed;
    }

    public void OnNext(T value)
    {
        next(value);
    }

    public void OnError(Exception error)
    {
        throw error;
    }

    public void OnCompleted()
    {
        completed();
    }
}`,
      explanation:
        "Subject is the stream: Subscribe stores the observer and returns a token whose Dispose removes it exactly once, so alarm.Dispose() really stops deliveries (the ALARM line never appears, because 95 arrives after the alarm has left). OnNext and OnCompleted loop over a ToArray() snapshot so an observer may leave in the middle of a notification without breaking the loop. DelegateObserver turns two lambdas into an IObserver<int>, which is how meter and alarm are built. meter stays subscribed for all three readings and is told about completion; alarm saw only 30 and 60 and was never told the show ended. stillSubscribed records the count immediately after alarm left, before OnCompleted cleared the list.",
      hints: [
        { id: "h1", title: "Two classes, one adapter", content: "Subject<T> keeps a List<IObserver<T>> and implements Subscribe, OnNext and OnCompleted. The adapter DelegateObserver<T> is just a constructor that stores two delegates plus three one-line methods. Do the adapter first; it is the easy half." },
        { id: "h2", title: "The unsubscribe token", content: "Subscribe must return an IDisposable. Give Subject a small private nested class (say Unsubscriber) that takes an Action in its constructor, has a bool done field, and in Dispose runs the action only if done is still false: observers.Remove(observer) is the action. Loop over observers.ToArray() when notifying." },
        { id: "h3", title: "Wiring the listeners", content: "IDisposable alarm = dimmerReadings.Subscribe(new DelegateObserver<int>(reading => { alarmSeen.Add(reading); if (reading > 90) { Console.WriteLine(\"ALARM: reading over 90\"); } }, () => completed.Add(\"alarm\"))); The meter is the same shape without the if. After 30 and 60, call alarm.Dispose() before sending 95." },
      ],
      tests: [
        {
          id: "t1",
          description: "the subject counts its subscribers before and after the alarm leaves",
          assertionCode: js`
const before = lines.indexOf("2 subscribers");
const after = lines.indexOf("alarm unsubscribed, 1 left");
assert(before >= 0, 'No line is exactly "2 subscribers". Subscribe meter and alarm, then print $"{dimmerReadings.Count} subscribers" (Count is the number of observers in the subject list).');
assert(after >= 0, 'No line is exactly "alarm unsubscribed, 1 left". Call alarm.Dispose(), then print the count again; if it still says 2, the token returned by Subscribe is not removing the observer.');
assert(before < after, "Print 2 subscribers first, then the line after alarm.Dispose().");`,
        },
        {
          id: "t2",
          description: "the meter hears every reading, the alarm only those before it left",
          assertionCode: js`
assert(lines.includes("meter saw: 30, 60, 95"), 'No line is exactly "meter saw: 30, 60, 95". The meter stays subscribed for all three readings.');
assert(lines.includes("alarm saw: 30, 60"), 'No line is exactly "alarm saw: 30, 60". The alarm was disposed before 95 was sent, so it must not see it.');`,
        },
        {
          id: "t3",
          description: "a disposed observer is really silent",
          assertionCode: js`assert(lines.includes("alarm saw: 30, 60"), "Run the program first: this check only means something once the alarm has heard the readings before it was disposed.");
assert(!lines.includes("ALARM: reading over 90"), "The alarm printed ALARM for 95, but it had already been disposed. Subscribe must return a token whose Dispose removes the observer from the list before OnNext(95).");`,
        },
        {
          id: "t4",
          description: "only the observer still subscribed hears the show end",
          assertionCode: js`assert(lines.includes("completed for: meter"), 'No line is exactly "completed for: meter". OnCompleted should reach only the observers still subscribed, which is just meter.');`,
        },
        {
          id: "t5",
          description: "the observers data is sent to the board",
          assertionCode: js`
assert(scene.observers && typeof scene.observers === "object", 'Send the data with Desk.Show("observers", new { meter = meterSeen, alarm = alarmSeen, completed, stillSubscribed });');
assertEqual(scene.observers.meter, [30, 60, 95], "observers.meter");
assertEqual(scene.observers.alarm, [30, 60], "observers.alarm");
assertEqual(scene.observers.completed, ["meter"], "observers.completed");
assertEqual(scene.observers.stillSubscribed, 1, "observers.stillSubscribed (the count right after alarm.Dispose())");`,
        },
      ],
      unlocks: ["fl-observers"],
      checks: [
        {
          prompt: "Which of these can an `IObservable<T>` stream express that a plain C# `event` cannot?",
          question: {
            type: "choice",
            options: [
              "A clear end of the stream and a failure signal, plus a subscription you can hold and dispose",
              "Delivering values to more than one subscriber",
              "Delivering values synchronously",
              "Passing a payload object to the subscribers",
            ],
            answer: 0,
          },
          explanation: "Events can already fan out to many subscribers, run synchronously and carry a payload. What they lack is a built-in way to say \"finished\" or \"failed\", and a subscription that is a value you can store and dispose. The observer interfaces add exactly those.",
        },
        {
          prompt: "Why does `Subject<T>.OnNext` loop over `observers.ToArray()` instead of over `observers` itself?",
          question: {
            type: "choice",
            options: [
              "An observer may unsubscribe during OnNext, and removing from a list that is being enumerated throws",
              "ToArray sorts the observers so they are notified in a fair order",
              "foreach cannot enumerate a List<T> of interfaces",
              "It makes the notification run on another thread",
            ],
            answer: 0,
          },
          explanation: "Enumerating a list while it changes ends in `Collection was modified; enumeration operation may not execute.` The snapshot is a stable array, so observers can join or leave mid-notification safely.",
        },
        {
          prompt: "Which sequence of calls on one observer breaks the observer contract?",
          question: {
            type: "choice",
            options: [
              "OnNext, OnNext, OnCompleted, OnNext",
              "OnNext, OnNext, OnCompleted",
              "OnCompleted",
              "OnNext, OnError",
            ],
            answer: 0,
          },
          explanation: "The grammar is any number of OnNext, then at most one terminal call (OnError or OnCompleted), then nothing. A value after OnCompleted violates it; the other sequences are all legal.",
        },
      ],
    },
    // ───────────────────────── 7 ─────────────────────────
    {
      id: "csharp-delegates-7-generics",
      title: "Generics and variance",
      minutes: 40,
      xp: 230,
      concepts: ["generic types", "generic methods", "constraints", "invariance", "covariance (out)", "contravariance (in)", "delegate variance"],
      learn: md`### One shelf, many kinds of prop

Wen, the fly crew lead, keeps the props on labelled shelves: one for lanterns, one for swords. Before generics, the obvious C# shelf was a shelf of \`object\`:

~~~csharp
class ObjectShelf
{
    List<object> items = new();
    public void Add(object item) { items.Add(item); }
    public object Get(int i) { return items[i]; }
}
// every caller writes (Lantern)shelf.Get(0) and hopes
~~~

Nothing stops a sword landing on the lantern shelf, and you find out at run time, with an \`InvalidCastException\`, in somebody else's code. A **generic** type moves that mistake to build time. \`Shelf<T>\` is a recipe with a hole in it; \`Shelf<Lantern>\` and \`Shelf<Sword>\` are two different, fully checked types made from it. (Under the hood the runtime builds a specialised version for each value type you use, and shares one version between all reference types. You rarely need to care.)

### Constraints: promises about T

Inside a generic method, \`T\` is a stranger. You can store it and pass it around, but you may not read \`.Weight\` from it, because nothing says it has one. A **constraint** is a promise the caller must keep, and the promise is what unlocks members for you:

~~~csharp
T Heaviest<T>(IEnumerable<T> props) where T : Prop
{
    T best = props.First();
    foreach (T prop in props)
    {
        if (prop.Weight > best.Weight) best = prop;   // legal: every T is a Prop
    }
    return best;
}
~~~

Note the return type is \`T\`, not \`Prop\`. Hand it a list of lanterns and you get a \`Lantern\` back, with its \`Lumens\` intact. That is the other half of the deal: the caller keeps the precise type.

The constraints you will actually meet:

- \`where T : SomeBaseClass\` or \`where T : ISomeInterface\`: T is that type or derives from or implements it. \`where T : IComparable<T>\` is how a generic \`LargestOf\` is allowed to call \`CompareTo\`.
- \`where T : class\` / \`where T : struct\`: T must be a reference type / a non-nullable value type.
- \`where T : notnull\`: T cannot be a nullable type.
- \`where T : new()\`: T has a public parameterless constructor, which is the only way \`new T()\` is allowed.
- \`where T : unmanaged\`: a value type with no references inside, for low-level code.
- Several together: the \`class\` or \`struct\` one comes first and \`new()\` comes last, for example \`where T : class, IComparable<T>, new()\`.
- Modern C# also lets an interface demand *static* members, which is how \`INumber<T>\` lets one generic method add numbers of any numeric type. Think of it as a constraint on what the type can do with itself rather than on its instances.

Break a promise and the compiler stops you at the call site, naming the constraint:

~~~text
Program.cs(4,7): error CS0311: The type 'string' cannot be used as type parameter 'T' in the generic type or method 'Shelf<T>'. There is no implicit reference conversion from 'string' to 'Prop'.
~~~

Ask for more than you promised and it stops you inside the generic code:

~~~text
Program.cs(7,16): error CS0304: Cannot create an instance of the variable type 'T' because it does not have the new() constraint
~~~

### Invariance: a shelf of lanterns is not a shelf of props

Every lantern is a prop, so surely a \`Shelf<Lantern>\` can be used as a \`Shelf<Prop>\`? Try it:

~~~text
Program.cs(2,20): error CS0029: Cannot implicitly convert type 'Shelf<Lantern>' to 'Shelf<Prop>'
~~~

The compiler is protecting you. If the conversion were allowed, you could call \`Add(new Sword(...))\` through the \`Shelf<Prop>\` reference and a sword would land on the lantern shelf. Generic types are **invariant** by default: \`Shelf<Lantern>\` and \`Shelf<Prop>\` are unrelated, whatever \`Lantern\` and \`Prop\` are to each other. The same applies to \`List<Lantern>\` and \`List<Prop>\`.

Arrays are the historical cautionary tale. They *are* covariant, and the price is paid at run time:

~~~csharp
Prop[] rack = new Lantern[2];       // compiles
rack[1] = new Sword("Prop sabre", 2);  // ArrayTypeMismatchException
~~~

~~~text
Attempted to access an element as a type incompatible with the array.
~~~

### Covariance (\`out\`): safe to read

The danger above came from *writing* through the wider type. If a type only ever hands out T and never accepts one, the danger disappears, and you can say so with the \`out\` keyword:

~~~csharp
interface IShelfView<out T>
{
    int Count { get; }
    IReadOnlyList<T> Items { get; }
}
~~~

Now a view of lanterns is a view of props: \`IShelfView<Prop> asProps = lanterns;\` compiles. You cannot hurt the shelf through a view that has no \`Add\`. The compiler checks the promise: put a method that takes \`T\` into an \`out\` interface and it refuses with

~~~text
Program.cs(26,14): error CS1961: Invalid variance: The type parameter 'T' must be contravariantly valid on 'IBadSource<T>.Put(T)'. 'T' is covariant.
~~~

You already use covariance: \`IEnumerable<out T>\`, \`IReadOnlyList<out T>\` and \`Func<out TResult>\` are all declared with \`out\`. That is why a \`List<Lantern>\` can be passed to a method that wants an \`IEnumerable<Prop>\`.

### Contravariance (\`in\`): safe to feed

Now flip it. A judge that can assess *any* prop can certainly assess a lantern:

~~~csharp
interface IPropJudge<in T>
{
    string Judge(T prop);
}

IPropJudge<Lantern> judge = new WeightJudge();   // WeightJudge : IPropJudge<Prop>
~~~

The direction reverses: a consumer of the wide type can stand in for a consumer of the narrow type. Types that only take T in (comparers, handlers, judges) get the \`in\` keyword; \`IComparer<in T>\`, \`IEqualityComparer<in T>\` and \`Action<in T>\` are the familiar ones. Use the wrong direction and the compiler explains politely:

~~~text
Program.cs(6,26): error CS0266: Cannot implicitly convert type 'IPropJudge<Lantern>' to 'IPropJudge<Prop>'. An explicit conversion exists (are you missing a cast?)
~~~

And a method that returns \`T\` inside an \`in\` interface gets \`error CS1961\` again, this time "must be covariantly valid".

A memory aid: **\`out\` means T only comes out, \`in\` means T only goes in.** If a type does both (like \`Shelf<T>\` with its \`Add\` and \`Items\`) it has to stay invariant.

### Variance and delegates

Delegates are variant too, and they are why this belongs in a chapter about them. \`Func<out TResult>\` is covariant and \`Action<in T>\` is contravariant:

~~~csharp
Func<Lantern> makeLantern = () => new Lantern("Spare", 2, 20);
Func<Prop> makeProp = makeLantern;            // a lantern maker is a prop maker

Action<Prop> tag = prop => Console.WriteLine($"tagged {prop.Name}");
Action<Lantern> tagLantern = tag;             // something that tags any prop can tag a lantern
~~~

Last lesson's \`IObservable<out T>\` and \`IObserver<in T>\` were declared exactly this way. A stream of lanterns is a stream of props, and an observer of props can listen to a stream of lanterns. Two limits to remember: variance works only on **interfaces and delegates** (never on classes such as \`Shelf<T>\`), and only when the type arguments are **reference types**. \`IEnumerable<int>\` is not an \`IEnumerable<object>\`.

### Common mistakes

- Expecting \`Shelf<Lantern>\` to convert to \`Shelf<Prop>\`: \`error CS0029\`. The same message appears for \`List<Prop> plain = new List<Lantern>();\`. Pass an \`IEnumerable<Prop>\` or an \`out\` interface instead.
- Passing a type that breaks the constraint, in a class or a method: \`error CS0311\`, "The type 'string' cannot be used as type parameter 'T' in the generic type or method 'Heaviest<T>(IEnumerable<T>)'".
- Using \`new T()\` or \`.Weight\` without the constraint that allows it (\`error CS0304\` for \`new T()\`, \`error CS1061\` when you read a member the constraint never promised).
- Adding \`out\` or \`in\` to an interface that uses T in both directions (\`error CS1961\`).
- Reaching for array covariance. It compiles and then fails with \`ArrayTypeMismatchException\`.
- Casting away the problem. If you find yourself writing \`(Shelf<Prop>)(object)lanterns\`, the model is wrong, not the compiler.`,
      mission: md`Wen has asked for a proper prop register. Lanterns, swords and the odd prop sabre are weighed, shelved and handed to the fly crew, and last week a sword was loaded onto a rig meant for lanterns. Nobody was hurt, but the rig's safety margin was.

Your job is to make that mistake impossible to write: a shelf that only accepts props of one kind, a function that finds the heaviest item and gives back the *same* kind, and a read-only view and a judge that may safely be used through wider and narrower types.

Pass this lesson and the **Prop shelves** panel powers on, showing your lantern shelf, its heaviest item and the judgements.`,
      tasks: [
        "Under the divider declare abstract record Prop(string Name, int Weight), record Lantern(string Name, int Weight, int Lumens) : Prop(Name, Weight) and record Sword(string Name, int Weight) : Prop(Name, Weight). Also declare interface IShelfView<out T> (int Count { get; } and IReadOnlyList<T> Items { get; }) and interface IPropJudge<in T> (string Judge(T prop);)",
        "Under the divider declare class Shelf<T> : IShelfView<T> where T : Prop with a private List<T>, Count, Items and an Add(T prop) method. Declare class WeightJudge : IPropJudge<Prop> whose Judge returns \"{Name}: heavy\" when Weight is above 5 and \"{Name}: light\" otherwise",
        "Above the divider write the generic local function T Heaviest<T>(IEnumerable<T> props) where T : Prop. Create Shelf<Lantern> lanterns holding Lantern(\"Oil lamp\", 3, 40), Lantern(\"Storm lantern\", 6, 120) and Lantern(\"Candle lamp\", 1, 10). Print 3 lanterns, heaviest: Storm lantern",
        "Assign IShelfView<Prop> asProps = lanterns and print seen as props: 3. Assign IPropJudge<Lantern> judge = new WeightJudge(), judge each lantern into a List<string> judged and print the results joined with \" | \" (Oil lamp: light | Storm lantern: heavy | Candle lamp: light)",
        "Make a Func<Lantern> makeLantern returning Lantern(\"Spare\", 2, 20) and assign it to Func<Prop> makeProp. Make Action<Prop> tag printing tagged and the name, assign it to Action<Lantern> tagLantern, call tagLantern(new Lantern(\"Pilot light\", 1, 5)) and print made a Lantern using makeProp().GetType().Name. Finish with Desk.Show(\"props\", new { shelf = ..., heaviest = ..., viewed = asProps.Count, judged }) where shelf is a list of new { name, kind, weight } objects (kind is the runtime type name)",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: generics in depth. A shelf that only takes one kind of prop.
// Statements (above the divider):
// 1. A generic local function:   T Heaviest<T>(IEnumerable<T> props) where T : Prop   (the prop with the largest Weight)
// 2. Shelf<Lantern> lanterns = new();  add Lantern("Oil lamp", 3, 40), Lantern("Storm lantern", 6, 120),
//    Lantern("Candle lamp", 1, 10).    Print:  3 lanterns, heaviest: Storm lantern
// 3. IShelfView<Prop> asProps = lanterns;     Print:  seen as props: 3
// 4. IPropJudge<Lantern> judge = new WeightJudge();   List<string> judged = new();
//    judge each lantern in lanterns.Items and add the text to judged.
//    Print them joined with " | ":   Oil lamp: light | Storm lantern: heavy | Candle lamp: light
// 5. Func<Lantern> makeLantern = () => new Lantern("Spare", 2, 20);   Func<Prop> makeProp = makeLantern;
//    Action<Prop> tag = prop => Console.WriteLine($"tagged {prop.Name}");   Action<Lantern> tagLantern = tag;
//    tagLantern(new Lantern("Pilot light", 1, 5));      Print:  made a Lantern     (makeProp().GetType().Name)
// 6. Desk.Show("props", new { shelf = (a list of new { name, kind, weight }), heaviest = (the name),
//                             viewed = asProps.Count, judged });     kind = the runtime type name of each item

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the prop types here.
//   abstract record Prop(string Name, int Weight);
//   record Lantern(string Name, int Weight, int Lumens) : Prop(Name, Weight);
//   record Sword(string Name, int Weight) : Prop(Name, Weight);
//   interface IShelfView<out T> { int Count { get; }  IReadOnlyList<T> Items { get; } }
//   interface IPropJudge<in T>  { string Judge(T prop); }
//   class Shelf<T> : IShelfView<T> where T : Prop      (a private List<T>, Count, Items, Add(T prop))
//   class WeightJudge : IPropJudge<Prop>               (Judge: "<Name>: heavy" when Weight > 5, otherwise "<Name>: light")`,
      solutionAdd: cs`// Lesson 7: generics in depth.
T Heaviest<T>(IEnumerable<T> props) where T : Prop
{
    T best = props.First();
    foreach (T prop in props)
    {
        if (prop.Weight > best.Weight)
        {
            best = prop;
        }
    }
    return best;
}

Shelf<Lantern> lanterns = new();
lanterns.Add(new Lantern("Oil lamp", 3, 40));
lanterns.Add(new Lantern("Storm lantern", 6, 120));
lanterns.Add(new Lantern("Candle lamp", 1, 10));
Console.WriteLine($"{lanterns.Count} lanterns, heaviest: {Heaviest(lanterns.Items).Name}");

IShelfView<Prop> asProps = lanterns;
Console.WriteLine($"seen as props: {asProps.Count}");

IPropJudge<Lantern> judge = new WeightJudge();
List<string> judged = new();
foreach (Lantern lantern in lanterns.Items)
{
    judged.Add(judge.Judge(lantern));
}
Console.WriteLine(string.Join(" | ", judged));

Func<Lantern> makeLantern = () => new Lantern("Spare", 2, 20);
Func<Prop> makeProp = makeLantern;
Action<Prop> tag = prop => Console.WriteLine($"tagged {prop.Name}");
Action<Lantern> tagLantern = tag;
tagLantern(new Lantern("Pilot light", 1, 5));
Console.WriteLine($"made a {makeProp().GetType().Name}");

Desk.Show("props", new
{
    shelf = lanterns.Items.Select(l => new { name = l.Name, kind = l.GetType().Name, weight = l.Weight }),
    heaviest = Heaviest(lanterns.Items).Name,
    viewed = asProps.Count,
    judged,
});

${TYPES_DIVIDER}

abstract record Prop(string Name, int Weight);

record Lantern(string Name, int Weight, int Lumens) : Prop(Name, Weight);

record Sword(string Name, int Weight) : Prop(Name, Weight);

interface IShelfView<out T>
{
    int Count { get; }
    IReadOnlyList<T> Items { get; }
}

interface IPropJudge<in T>
{
    string Judge(T prop);
}

class Shelf<T> : IShelfView<T> where T : Prop
{
    readonly List<T> items = new();

    public int Count
    {
        get { return items.Count; }
    }

    public IReadOnlyList<T> Items
    {
        get { return items; }
    }

    public void Add(T prop)
    {
        items.Add(prop);
    }
}

class WeightJudge : IPropJudge<Prop>
{
    public string Judge(Prop prop)
    {
        return prop.Weight > 5 ? $"{prop.Name}: heavy" : $"{prop.Name}: light";
    }
}`,
      explanation:
        "Heaviest<T> is constrained to Prop, so it may read Weight, and because it returns T the caller gets a Lantern back (which is why .Name on the result works and the storm lantern wins). Shelf<T> is invariant (it has Add), so Shelf<Lantern> cannot become Shelf<Prop>; but IShelfView<out T> only hands T out, so lanterns can be assigned to IShelfView<Prop> and Count still reads 3. IPropJudge<in T> only takes T in, so a WeightJudge written for any Prop can be used as a judge of Lanterns, and the judgements follow the 5 kg threshold. The same two rules apply to delegates: Func<Lantern> converts to Func<Prop> (covariant result) and Action<Prop> converts to Action<Lantern> (contravariant parameter).",
      hints: [
        { id: "h1", title: "Start with the vocabulary", content: "Declare the three records, the two interfaces and the two classes under the divider first. Only the interfaces carry the keywords: out T on IShelfView and in T on IPropJudge. The class Shelf<T> must say where T : Prop." },
        { id: "h2", title: "Shape of Shelf and Heaviest", content: "Shelf<T> keeps a readonly List<T>; Count returns items.Count; Items returns the list as IReadOnlyList<T>; Add appends. Heaviest<T> starts with props.First() and walks the sequence, replacing best whenever prop.Weight is larger, then returns best (a T, not a Prop)." },
        { id: "h3", title: "Which assignment goes where", content: "IShelfView<Prop> asProps = lanterns; (covariance: reading only). IPropJudge<Lantern> judge = new WeightJudge(); (contravariance: the judge accepts any Prop). Func<Prop> makeProp = makeLantern; and Action<Lantern> tagLantern = tag; are the same two ideas on delegates. For shelf in the Desk.Show call, select each lantern into new { name = l.Name, kind = l.GetType().Name, weight = l.Weight }." },
      ],
      tests: [
        {
          id: "t1",
          description: "a constrained generic method returns the precise type",
          assertionCode: js`assert(lines.includes("3 lanterns, heaviest: Storm lantern"), 'No line is exactly "3 lanterns, heaviest: Storm lantern". Heaviest<T> should return a T (here a Lantern) so you can print .Name of the result; the heaviest of the three is the 6 kg storm lantern.');`,
        },
        {
          id: "t2",
          description: "a shelf of lanterns is viewed as a shelf of props",
          assertionCode: js`assert(lines.includes("seen as props: 3"), 'No line is exactly "seen as props: 3". Declare IShelfView<out T> and assign the Shelf<Lantern> to an IShelfView<Prop> variable; if the compiler refuses, check the out keyword on the interface.');`,
        },
        {
          id: "t3",
          description: "a judge of any prop judges lanterns",
          assertionCode: js`assert(lines.includes("Oil lamp: light | Storm lantern: heavy | Candle lamp: light"), 'No line is exactly "Oil lamp: light | Storm lantern: heavy | Candle lamp: light". Judge each lantern with an IPropJudge<Lantern> that is really a WeightJudge, then join the results with " | ". Heavy means a Weight above 5.');`,
        },
        {
          id: "t4",
          description: "delegate variance works in both directions",
          assertionCode: js`
assert(lines.includes("tagged Pilot light"), 'No line is exactly "tagged Pilot light". Assign the Action<Prop> to an Action<Lantern> variable and call it with new Lantern("Pilot light", 1, 5).');
assert(lines.includes("made a Lantern"), 'No line is exactly "made a Lantern". Assign the Func<Lantern> to a Func<Prop> and print makeProp().GetType().Name.');`,
        },
        {
          id: "t5",
          description: "the shelf is sent to the board",
          assertionCode: js`
assert(scene.props && Array.isArray(scene.props.shelf), 'Send the data with Desk.Show("props", new { shelf = ..., heaviest = ..., viewed = asProps.Count, judged });');
const shelf = scene.props.shelf;
assertEqual(shelf.map((s) => s.name), ["Oil lamp", "Storm lantern", "Candle lamp"], "props.shelf names, in shelf order");
assertEqual(shelf.map((s) => s.kind), ["Lantern", "Lantern", "Lantern"], "props.shelf kinds (the runtime type name, GetType().Name)");
assertEqual(shelf.map((s) => s.weight), [3, 6, 1], "props.shelf weights");
assertEqual(scene.props.heaviest, "Storm lantern", "props.heaviest");
assertEqual(scene.props.viewed, 3, "props.viewed");
assertEqual(scene.props.judged, ["Oil lamp: light", "Storm lantern: heavy", "Candle lamp: light"], "props.judged");`,
        },
      ],
      unlocks: ["fl-props"],
      checks: [
        {
          prompt: "Given `class Lantern : Prop`, which of these assignments compiles?",
          question: {
            type: "choice",
            options: [
              "`IEnumerable<Prop> a = new List<Lantern>();`",
              "`List<Prop> a = new List<Lantern>();`",
              "`Shelf<Prop> a = new Shelf<Lantern>();` (Shelf is a generic class)",
              "Assigning an `Action<Lantern>` variable to an `Action<Prop>` variable",
            ],
            answer: 0,
          },
          explanation: "`IEnumerable<out T>` is covariant, so a sequence of lanterns is a sequence of props. `List<T>` and any generic class are invariant, and the last option has the contravariant direction backwards: `Action<Prop>` may be used as `Action<Lantern>`, not the other way round.",
        },
        {
          prompt: "Why must `Shelf<T>` (with an `Add(T)` method) stay invariant, while a read-only `IShelfView<out T>` can be covariant?",
          question: {
            type: "choice",
            options: [
              "Through a wider reference, `Add` could put a Sword on a shelf of lanterns; a view that only hands items out cannot do that",
              "Classes are slower than interfaces, so they are not allowed to vary",
              "Covariance only works when the type has a constructor",
              "Because `Add` returns void",
            ],
            answer: 0,
          },
          explanation: "Variance is safe exactly when T travels in one direction only. Writing through a wider type breaks the shelf's promise, reading through one never does. The compiler checks the direction for you (error CS1961 if an `out` interface accepts a T).",
        },
        {
          prompt: "`IComparer<in T>` compares two values of type T. Which statement is true?",
          question: {
            type: "choice",
            options: [
              "An `IComparer<Prop>` can be used wherever an `IComparer<Lantern>` is required",
              "An `IComparer<Lantern>` can be used wherever an `IComparer<Prop>` is required",
              "Both directions are allowed",
              "Neither, because IComparer is invariant",
            ],
            answer: 0,
          },
          explanation: "A comparer only consumes T, so it is contravariant: something that can compare any two props can compare two lanterns. The reverse is unsafe, because a lantern comparer might be handed a sword.",
        },
      ],
    },
  ],
};
