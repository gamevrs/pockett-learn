import type { Module } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";

/** Module 4: design patterns. Each pattern: the pain first, then the mechanism, the roles, code, and when to use it. */
export const patternsModule: Module = {
  id: "patterns",
  part: "program",
  title: "Design patterns",
  blurb: "Proven shapes for code: Strategy, Observer, Factory, Decorator, Adapter, Command, State and more.",
  icon: "puzzle",
  lessons: [
    // ─────────────────────────────── 1. What a pattern is ───────────────────────────────
    {
      id: "fnd-patterns-1-what",
      title: "What a design pattern is",
      summary: "Named shapes of solution for problems that keep coming back.",
      minutes: 6,
      xp: 40,
      steps: [
        {
          kind: "explain",
          title: "The same problems keep coming back",
          body: "Write enough programs and you start meeting old friends. *One change has to reach several places.* *Users want to pick between ways of doing the same job.* *Every action needs an undo.*\n\nDevelopers solved these again and again, compared notes, and gave the good solutions **names**. A named, reusable shape of solution is a **design pattern**.",
        },
        {
          kind: "question",
          title: "What is it, exactly?",
          body: "Which of these best describes a design pattern?",
          question: {
            type: "choice",
            options: [
              "A library you install and import",
              "A named arrangement of classes and objects that solves a recurring problem, adapted to each program",
              "A finished function you paste unchanged into every project",
              "A rule of Python syntax, like indentation",
            ],
            answer: 1,
          },
          explanation: "A pattern is a **shape**, not a file. You never download Observer: you recognise the problem and arrange your own classes in that shape, with your own names.",
        },
        {
          kind: "explain",
          title: "A solution is a set of roles",
          body: "Patterns describe their solution as **roles**: jobs that classes take on, and how they talk to each other. Here are the roles of a pattern you'll meet in the next lesson. Tap each box to see its job.",
          widget: { type: "pattern-roles", props: { pattern: "strategy" } },
        },
        {
          kind: "question",
          title: "Problem, forces, solution",
          body: "Each pattern is written up the same way: the **problem** (the situation), the **forces** (the pressures that make it hard), the **solution** (the roles), and the **consequences** (what it costs you).\n\nWhich line below is a *force*?",
          question: {
            type: "choice",
            options: [
              "Orders need a shipping cost.",
              "New shipping options arrive every month, but the checkout code is tested and we'd rather not touch it.",
              "Put each shipping option in its own class behind one shared method.",
              "There are now more small classes to keep track of.",
            ],
            answer: 1,
          },
          explanation: "A force is a tension: *we need change here* pulling against *we don't want to edit that*. The first line is the problem, the third is the solution, and the last is a consequence.",
        },
        {
          kind: "explain",
          title: "Three families",
          body: "Classic patterns fall into three families:\n\n- **Creational**: how objects get made.\n- **Structural**: how objects fit together into bigger pieces.\n- **Behavioural**: how objects talk to each other and share the work.\n\nYou don't need to know the patterns yet to sort them: each one-line description gives it away.",
        },
        {
          kind: "question",
          title: "Sort them",
          body: "Tap a card, then tap its family.",
          widget: {
            type: "pattern-sorter",
            props: {
              buckets: [
                { id: "creational", label: "Creational", hint: "making objects" },
                { id: "structural", label: "Structural", hint: "fitting objects together" },
                { id: "behavioural", label: "Behavioural", hint: "objects talking" },
              ],
              items: [
                { id: "factory", text: "Factory: decides which class to build" },
                { id: "adapter", text: "Adapter: makes one interface fit another" },
                { id: "observer", text: "Observer: tells subscribers when something changes" },
                { id: "singleton", text: "Singleton: makes sure only one object exists" },
                { id: "decorator", text: "Decorator: wraps an object to add to it" },
                { id: "command", text: "Command: turns a request into an object" },
              ],
              answer: { factory: "creational", singleton: "creational", adapter: "structural", decorator: "structural", observer: "behavioural", command: "behavioural" },
            },
          },
          question: { type: "widget", hint: "Creational patterns build objects, structural ones connect them, behavioural ones coordinate what they do.", goal: { placed: { factory: "creational", singleton: "creational", adapter: "structural", decorator: "structural", observer: "behavioural", command: "behavioural" } } },
          explanation: "Factory and Singleton are about **making** objects. Adapter and Decorator are about **wrapping and fitting** objects together. Observer and Command are about **how objects communicate**.",
        },
        {
          kind: "explain",
          title: "Tools, not goals",
          body: "Patterns cost something: more classes, more indirection, more to read. Here is what happens when someone uses patterns because they can, not because there's a problem:\n\n" +
            py(`
class GreetingStrategy:
    def greet(self):
        raise NotImplementedError

class HelloStrategy(GreetingStrategy):
    def greet(self):
        return "Hello"

class GreeterFactory:
    def create(self):
        return HelloStrategy()

print(GreeterFactory().create().greet())
`) +
            "\n\nTen lines to do what `print(\"Hello\")` does. Nothing here ever varies, so the pattern solves no problem.",
        },
        {
          kind: "question",
          title: "Should we?",
          body: "A teammate wants to apply a pattern to a tax function. There's one way to calculate tax, and it hasn't changed in three years. Good idea?",
          question: {
            type: "choice",
            options: [
              "Yes: patterns always make code better.",
              "No: nothing varies yet, so a plain function is clearer. Add a pattern when a real need appears.",
              "Yes: more classes make code more object-oriented.",
              "No: patterns only work in Java.",
            ],
            answer: 1,
          },
          explanation: "Reach for a pattern when you **feel the pain it removes**. Until a second tax rule shows up, the simplest code wins. Refactoring into a pattern later is easy when the code is simple.",
        },
        {
          kind: "question",
          title: "A shared vocabulary",
          body: "Patterns also give a team words. In a code review, someone writes: *\"Make the logger an observer of the order.\"* What do they mean?",
          question: {
            type: "choice",
            options: [
              "Copy the logger's code into the Order class.",
              "The order keeps a list of listeners and tells each one when it changes; the logger is one of them.",
              "The logger should create orders.",
              "Delete the logger and print instead.",
            ],
            answer: 1,
          },
          explanation: "One word stands for a whole design: a list of subscribers, a subscribe method, and a notification on every change. That's the power of names.",
        },
        {
          kind: "recap",
          points: [
            "A design pattern is a **named, reusable shape** of solution to a problem that keeps coming back.",
            "Patterns are written as problem → forces → solution (roles) → consequences.",
            "Three families: **creational** (making objects), **structural** (fitting them together), **behavioural** (how they talk).",
            "Patterns are tools, not goals: use one when you feel the pain it removes.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 2. Strategy ───────────────────────────────
    {
      id: "fnd-patterns-2-strategy",
      title: "Strategy: swap the algorithm",
      summary: "Put each way of doing a job in its own object, and plug in the one you need.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "A function that keeps growing",
          body: "A shop's checkout works out shipping like this:\n\n" +
            py(`
def shipping_cost(kg, method):
    if method == "standard":
        return 5 + 1 * kg
    elif method == "express":
        return 12 + 2 * kg
    elif method == "pickup":
        return 0
    # next month: "drone", "overnight", "eco"...
`) +
            "\n\nIt works. But every new option means opening this function again, and a typo while adding one can break all the others.",
        },
        {
          kind: "question",
          title: "Adding drone delivery",
          body: "Marketing wants a **drone** option. With this design, what has to change?",
          question: {
            type: "choice",
            options: [
              "Nothing: it picks up new methods automatically.",
              "Only a new drone file, the function stays as it is.",
              "shipping_cost itself: another elif, and retesting every option that lives in it.",
              "Python has to be upgraded.",
            ],
            answer: 2,
          },
          explanation: "The function **knows every option**, so every option change is a change to it. The fix is to stop the checkout knowing about specific options at all.",
        },
        {
          kind: "explain",
          title: "Plug the option in",
          body: "**Strategy** pulls each option into its own small class, all with the same method: `cost(kg)`. The checkout holds *one* of them and asks it for the price.\n\nSwap strategies below. Watch the left pane: the checkout's code never changes.",
          widget: { type: "strategy", props: { adjustable: true } },
        },
        {
          kind: "question",
          title: "Cheapest to the door",
          body: "This parcel weighs 3 kg and the customer can't collect it. Plug in the **cheapest strategy that still delivers**.",
          widget: { type: "strategy", props: { weight: 3 } },
          question: { type: "widget", hint: "Only strategies that deliver to the door count. Pick the cheapest of those for a 3 kg parcel.", goal: { strategy: "flat" } },
          explanation: "Flat rate is $7.00, Standard is 5 + 3 = $8.00, Express is 12 + 6 = $18.00, and Pickup doesn't deliver. Notice you compared four algorithms without touching `Checkout` once.",
        },
        {
          kind: "explain",
          title: "The roles",
          body: "Three roles make up Strategy. The **context** holds a strategy and delegates to it. The **strategy** is the shared method every option promises to have. The **concrete strategies** are the options.\n\n(In Python a strategy can even be a plain function: the checkout would just call `self.strategy(kg)`.)",
          widget: { type: "pattern-roles", props: { pattern: "strategy", highlight: ["context"] } },
        },
        {
          kind: "question",
          title: "Where does drone go?",
          body: "Marketing still wants drone delivery: $20 flat. **Tap the role** where the new code goes.",
          widget: { type: "pattern-roles", props: { pattern: "strategy" } },
          question: { type: "widget", hint: "A new delivery option is a new concrete strategy; the other roles stay as they are.", goal: { selected: "concrete" } },
          explanation: "A new `Drone` class with a `cost(kg)` method joins the concrete strategies. The context and the shared interface stay exactly as they are: you **add** code instead of **editing** working code.",
        },
        {
          kind: "code",
          title: "Build it",
          body: "Finish `Express` (12 plus 2 per kg) and make `Checkout.shipping` ask its strategy instead of using if/elif. The tests also plug in a brand-new strategy your checkout has never seen.",
          language: "python",
          starter: `class Standard:
    def cost(self, kg):
        return 5 + 1 * kg


class Express:
    def cost(self, kg):
        # TODO: 12 plus 2 per kg
        pass


class Checkout:
    def __init__(self, strategy):
        self.strategy = strategy

    def shipping(self, kg):
        # TODO: ask the strategy for the cost
        pass
`,
          solution: `class Standard:
    def cost(self, kg):
        return 5 + 1 * kg


class Express:
    def cost(self, kg):
        return 12 + 2 * kg


class Checkout:
    def __init__(self, strategy):
        self.strategy = strategy

    def shipping(self, kg):
        return self.strategy.cost(kg)
`,
          tests: [
            { id: "t1", description: "Standard shipping for 3 kg is 8", assertionCode: `assert Checkout(Standard()).shipping(3) == 8, "Checkout(Standard()).shipping(3) should be 8: return self.strategy.cost(kg)"` },
            { id: "t2", description: "Express shipping for 3 kg is 18", assertionCode: `assert Checkout(Express()).shipping(3) == 18, "Express should cost 12 + 2 * kg"` },
            {
              id: "t3",
              description: "The strategy can be swapped on the same checkout",
              assertionCode: `c = Checkout(Standard())
c.strategy = Express()
assert c.shipping(1) == 14, "After swapping in Express, shipping(1) should be 14"`,
            },
            {
              id: "t4",
              description: "A new Drone strategy works without changing Checkout",
              assertionCode: `class Drone:
    def cost(self, kg):
        return 20
assert Checkout(Drone()).shipping(9) == 20, "Checkout should work with any object that has cost(kg)"`,
            },
          ],
          hints: ["`shipping` is one line: hand the weight to `self.strategy.cost(...)` and return what it gives back.", "Express: `return 12 + 2 * kg`."],
        },
        {
          kind: "question",
          title: "When does Strategy fit?",
          body: "Which situation is a good fit for Strategy?",
          question: {
            type: "choice",
            options: [
              "A report can be exported as PDF, CSV or HTML, and the user picks the format.",
              "A function always rounds prices to two decimals.",
              "The whole app must share exactly one database connection.",
              "Three screens need to refresh whenever the cart changes.",
            ],
            answer: 0,
          },
          explanation: "Several interchangeable ways to do **the same job**, chosen at runtime: that's Strategy. The rounding never varies, the connection is about *how many objects*, and refreshing screens on a change is Observer, coming next.",
        },
        {
          kind: "recap",
          points: [
            "Strategy replaces an if/elif over *ways of doing a job* with one object per way.",
            "The **context** holds a strategy and delegates; **concrete strategies** share one method.",
            "New option = new class. The context's code never changes.",
            "In Python a strategy can even be a plain function you pass in: the shape is what matters.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 3. Observer ───────────────────────────────
    {
      id: "fnd-patterns-3-observer",
      title: "Observer: tell everyone who cares",
      summary: "Let objects subscribe to changes instead of hard-wiring who gets told.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "A lighthouse that knows too much",
          body: "A lighthouse has to warn a passing ship, the harbour office and the keeper's logbook whenever the fog thickens:\n\n" +
            py(`
class Lighthouse:
    def set_fog(self, level):
        self.fog = level
        ship_radio.warn(level)
        harbour_office.refresh(level)
        logbook.write(level)
        # the ferry company wants these warnings too...
`) +
            "\n\nThe lighthouse is **hard-wired** to every receiver. It has to know their names and their methods.",
        },
        {
          kind: "question",
          title: "Quiet the ship",
          body: "The ship sails out of range and should stop receiving warnings while the program runs. With this code, what's needed?",
          question: {
            type: "choice",
            options: [
              "Nothing: ship_radio can just ignore the call.",
              "Edit set_fog, or add a flag check inside it, then redeploy.",
              "Delete the ship_radio object.",
              "Switch the lighthouse lamp off and on again.",
            ],
            answer: 1,
          },
          explanation: "Who gets told is **baked into the lighthouse's code**, so it can't change at runtime. Every new listener, and every listener that wants to stop, means editing the lighthouse.",
        },
        {
          kind: "explain",
          title: "Subscribe, publish",
          body: "**Observer** flips it around. The lighthouse keeps a plain **list of subscribers**. Anyone can subscribe or unsubscribe. When a new fog level comes in, the lighthouse loops over the list and calls `update(value)` on each one, without knowing what they are.\n\nSubscribe a few observers and publish.",
          widget: { type: "observer", props: { initial: ["ship", "logbook"] } },
        },
        {
          kind: "question",
          title: "Only these two",
          body: "Make the **next fog level** reach only the **harbour office** and the **logbook**. Change the subscriptions, then publish.",
          widget: { type: "observer", props: { initial: ["ship", "ferry"] } },
          question: { type: "widget", hint: "Change who is subscribed so only those two remain, then publish.", goal: { lastDelivered: ["harbour", "logbook"] } },
          explanation: "You rewired who hears the news **while the program ran**, and the lighthouse's code didn't change once. It just walks whatever list it has.",
        },
        {
          kind: "explain",
          title: "The roles",
          body: "The **subject** owns the list and the subscribe / unsubscribe / publish methods. The **observer** role is a single method, `update(value)`. Concrete observers each react in their own way.",
          widget: { type: "pattern-roles", props: { pattern: "observer", highlight: ["subject"] } },
        },
        {
          kind: "question",
          title: "Count the calls",
          body: py(`
lighthouse = Lighthouse()
lighthouse.subscribe(ship)
lighthouse.subscribe(logbook)
lighthouse.publish(21)
lighthouse.unsubscribe(ship)
lighthouse.publish(25)
`) + "\n\nHow many `update` calls happen in total?",
          question: { type: "number", hint: "Each publish calls update on whoever is subscribed at that moment.", answer: 3 },
          explanation: "The first publish reaches ship and logbook (2 calls). After ship unsubscribes, the second reaches only logbook (1 call). **2 + 1 = 3**.",
        },
        {
          kind: "code",
          title: "Build a subject",
          body: "Fill in `subscribe`, `unsubscribe` and `publish`. `publish` calls `update(value)` on every current subscriber. The tests subscribe an `Alarm` class your lighthouse has never heard of.",
          language: "python",
          starter: `class Lighthouse:
    def __init__(self):
        self.observers = []

    def subscribe(self, observer):
        # TODO: add it to the list
        pass

    def unsubscribe(self, observer):
        # TODO: take it out of the list
        pass

    def publish(self, value):
        # TODO: call update(value) on every subscriber
        pass


class Recorder:
    def __init__(self):
        self.seen = []

    def update(self, value):
        self.seen.append(value)
`,
          solution: `class Lighthouse:
    def __init__(self):
        self.observers = []

    def subscribe(self, observer):
        self.observers.append(observer)

    def unsubscribe(self, observer):
        self.observers.remove(observer)

    def publish(self, value):
        for observer in self.observers:
            observer.update(value)


class Recorder:
    def __init__(self):
        self.seen = []

    def update(self, value):
        self.seen.append(value)
`,
          tests: [
            {
              id: "t1",
              description: "Every subscriber gets the reading",
              assertionCode: `s = Lighthouse()
a = Recorder()
b = Recorder()
s.subscribe(a)
s.subscribe(b)
s.publish(21)
assert a.seen == [21] and b.seen == [21], "After publish(21), both recorders should have seen [21]"`,
            },
            {
              id: "t2",
              description: "Unsubscribed observers stop hearing",
              assertionCode: `s = Lighthouse()
a = Recorder()
b = Recorder()
s.subscribe(a)
s.subscribe(b)
s.publish(21)
s.unsubscribe(a)
s.publish(25)
assert a.seen == [21], "a unsubscribed, so it should only have seen 21"
assert b.seen == [21, 25], "b is still subscribed and should have seen both readings"`,
            },
            {
              id: "t3",
              description: "Any object with update() can subscribe",
              assertionCode: `class Alarm:
    def __init__(self):
        self.rang = False
    def update(self, value):
        if value > 30:
            self.rang = True
s = Lighthouse()
alarm = Alarm()
s.subscribe(alarm)
s.publish(35)
assert alarm.rang, "The lighthouse should call update() on any subscriber, not just Recorders"`,
            },
          ],
          hints: ["Lists have `append` and `remove`.", "publish: `for observer in self.observers:` then `observer.update(value)`."],
        },
        {
          kind: "question",
          title: "When does Observer fit?",
          body: "Which is a good fit for Observer?",
          question: {
            type: "choice",
            options: [
              "Pick one of three compression algorithms for a file.",
              "When the cart changes, the badge, the order summary and the analytics tracker all need to react.",
              "Make an old XML API look like your JSON interface.",
              "Build the right Shape class from a name.",
            ],
            answer: 1,
          },
          explanation: "One change, **many interested parties** that come and go: Observer. Picking one algorithm is Strategy, reshaping an interface is Adapter, and building by name is Factory.",
        },
        {
          kind: "question",
          title: "Leaving politely",
          body: "A fog-map screen subscribes to the lighthouse when it opens. The user closes the screen. What should the screen do?",
          question: {
            type: "choice",
            options: [
              "Nothing: closed screens are cleaned up automatically.",
              "Unsubscribe, or the lighthouse keeps calling it and keeps it alive in memory.",
              "Demolish the lighthouse.",
              "Publish a final reading.",
            ],
            answer: 1,
          },
          explanation: "The subject's list holds a reference to every subscriber. Forget to unsubscribe and the closed screen stays in memory and keeps receiving updates: a classic Observer bug, often called a *lapsed listener*.",
        },
        {
          kind: "recap",
          points: [
            "Observer replaces hard-wired calls with a **list of subscribers**.",
            "The **subject** has subscribe, unsubscribe and publish; observers only need `update(value)`.",
            "Listeners can come and go at runtime and the subject's code never changes: **loose coupling**.",
            "Remember to unsubscribe when a listener goes away.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 4. Factory ───────────────────────────────
    {
      id: "fnd-patterns-4-factory",
      title: "Factory: ask for it by name",
      summary: "Put object creation in one place so callers never pick classes themselves.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "The same if/elif, three times",
          body: "A drawing app creates shapes from a name in three places: the editor, the file importer and the toolbar. Each one has its own copy of this:\n\n" +
            py(`
if kind == "circle":
    s = Circle(1)
elif kind == "square":
    s = Square(1)
`) +
            "\n\nAdd a new shape and see what it costs.",
        },
        {
          kind: "question",
          title: "Count the edits",
          body: "Press **Add a hexagon shape** in both designs. How many files have to be edited **without** a factory?",
          widget: { type: "factory", props: { view: "change", mode: "without" } },
          question: { type: "number", hint: "Count the files that mention a shape by name in the design without a factory.", answer: 3, unit: "files" },
          explanation: "Every place that creates shapes knows every shape class, so every one of them changes. With a factory, only **one** file changes: the factory's list of shapes. Miss one call site and the hexagon works in the editor but crashes in the importer.",
        },
        {
          kind: "explain",
          title: "One place that builds",
          body: "A **factory** is the single place that knows which class goes with which name. Callers just ask: `make_shape(\"circle\")`. Try it, including a shape the factory doesn't know.",
          widget: { type: "factory", props: { view: "build" } },
        },
        {
          kind: "question",
          title: "Place an order",
          body: "Use the factory to build exactly **two circles and one triangle**. (Clear and start again if you need to.)",
          widget: { type: "factory", props: { view: "build", kinds: ["circle", "square", "triangle"] } },
          question: { type: "widget", hint: "Ask the factory for each shape by name: two circles and one triangle.", goal: { created: { circle: 2, triangle: 1 } } },
          explanation: "You never typed `Circle(...)` or `Triangle(...)`. The caller names *what* it wants; the factory decides *how* to build it.",
        },
        {
          kind: "explain",
          title: "The roles",
          body: "The **client** asks by name. The **factory** maps names to classes and builds them. Everything it returns follows the **product** interface (here, `Shape`), so the client can use any of them the same way.",
          widget: { type: "pattern-roles", props: { pattern: "factory", highlight: ["factory"] } },
        },
        {
          kind: "question",
          title: "What does the client know?",
          body: "With a factory in place, what does the editor need to know to get a shape?",
          question: {
            type: "choice",
            options: [
              "The class and constructor arguments of every shape.",
              "Only the name of the kind it wants, and what a Shape can do.",
              "How the factory stores its name-to-class table.",
              "Nothing at all, not even the name.",
            ],
            answer: 1,
          },
          explanation: "The client depends on a **name** and the **Shape interface**. Class names, constructor details and the registry all live inside the factory, which is why changes stay in one place.",
        },
        {
          kind: "code",
          title: "Build a factory",
          body: "Fill the `SHAPES` table and write `make_shape(kind, size)`: look the kind up and build it, or raise `ValueError` for a kind it doesn't know. The last test registers a new shape with a single line.",
          language: "python",
          starter: `class Circle:
    def __init__(self, size):
        self.size = size

    def area(self):
        return round(3.14159 * self.size ** 2, 2)


class Square:
    def __init__(self, size):
        self.size = size

    def area(self):
        return self.size ** 2


SHAPES = {}  # TODO: map "circle" and "square" to their classes


def make_shape(kind, size):
    # TODO: build SHAPES[kind] with this size,
    # or raise ValueError if kind is unknown
    pass
`,
          solution: `class Circle:
    def __init__(self, size):
        self.size = size

    def area(self):
        return round(3.14159 * self.size ** 2, 2)


class Square:
    def __init__(self, size):
        self.size = size

    def area(self):
        return self.size ** 2


SHAPES = {"circle": Circle, "square": Square}


def make_shape(kind, size):
    if kind not in SHAPES:
        raise ValueError("unknown shape: " + kind)
    return SHAPES[kind](size)
`,
          tests: [
            {
              id: "t1",
              description: 'make_shape("circle", 2) builds a Circle of size 2',
              assertionCode: `c = make_shape("circle", 2)
assert isinstance(c, Circle), "make_shape('circle', 2) should return a Circle"
assert c.size == 2, "The circle should have size 2"`,
            },
            { id: "t2", description: 'make_shape("square", 3) has area 9', assertionCode: `s = make_shape("square", 3)\nassert s is not None and s.area() == 9, "make_shape('square', 3).area() should be 9"` },
            {
              id: "t3",
              description: "Unknown kinds raise ValueError",
              assertionCode: `try:
    make_shape("star", 1)
    raised = False
except ValueError:
    raised = True
assert raised, "make_shape('star', 1) should raise ValueError"`,
            },
            {
              id: "t4",
              description: "A new shape needs only one new line in SHAPES",
              assertionCode: `class Triangle:
    def __init__(self, size):
        self.size = size
SHAPES["triangle"] = Triangle
assert isinstance(make_shape("triangle", 1), Triangle), "make_shape should use whatever is in SHAPES"`,
            },
          ],
          hints: ['SHAPES is a dictionary: `{"circle": Circle, "square": Square}` (the classes themselves, no brackets).', "`SHAPES[kind]` is a class, so `SHAPES[kind](size)` builds one."],
        },
        {
          kind: "question",
          title: "When does Factory fit?",
          body: "When does a factory pay off?",
          question: {
            type: "choice",
            options: [
              "When the class to build depends on data at runtime (a config value, a file type, user input) and several places need it.",
              "When you create one kind of object, in one place, and it never changes.",
              "When several objects need to hear about a change.",
              "When you want to add logging around a function.",
            ],
            answer: 0,
          },
          explanation: "A factory earns its keep when **which class** is decided by data, and creation would otherwise be repeated. For a single `Circle(1)` in one place, just call the constructor.",
        },
        {
          kind: "recap",
          points: [
            "A factory is the **one place** that turns a name into the right object.",
            "Callers ask by name and work with the **product interface**, never concrete classes.",
            "Adding a kind edits one table instead of every call site.",
            "Unknown names fail loudly in one spot (a `ValueError`), not in scattered code.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 5. Singleton ───────────────────────────────
    {
      id: "fnd-patterns-5-singleton",
      title: "Singleton, and why to be careful",
      summary: "One shared instance: handy, but often a global in disguise.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Two settings objects",
          body: "Two parts of an app both make a `Settings` object:\n\n" +
            py(`
# header.py
settings = Settings()
settings.theme = "dark"

# footer.py
settings = Settings()
print(settings.theme)
`) +
            "\n\nThe header switched to dark mode. Will the footer agree?",
        },
        {
          kind: "question",
          title: "What does the footer print?",
          body: "The header just set its own `Settings` object to `\"dark\"`. What does `print(settings.theme)` show in the footer?",
          question: { type: "choice", options: ['"dark"', '"light" (the default)', "An error", "None"], answer: 1 },
          explanation: "Each `Settings()` call builds a **brand-new object**. The header changed its own object; the footer got a fresh one with the default theme. Sometimes you really want everyone to share **one** object.",
        },
        {
          kind: "explain",
          title: "One instance, handed out forever",
          body: "A **Singleton** class makes sure only one instance exists. Instead of calling `Settings()`, everyone calls `Settings.get_instance()`, which builds the object the first time and returns that same one after.\n\nCall both versions a few times, then change the theme through `a`. Watch the object ids.",
          widget: { type: "singleton" },
        },
        {
          kind: "question",
          title: "Who turns dark?",
          body: "In the **normal class** column, make `a`, `b` and `c`, then set `a.theme = \"dark\"`. How many objects in memory are now dark?",
          widget: { type: "singleton", props: { only: "normal" } },
          question: { type: "number", hint: "In a normal class a, b and c are three separate objects, so changing a changes only a.", answer: 1 },
          explanation: "Three calls, three separate objects, and only `a`'s changed. With the singleton, `a`, `b` and `c` are three names for **one** object, so all of them read \"dark\".",
        },
        {
          kind: "code",
          title: "Write get_instance",
          body: "Right now `get_instance` builds a new object every time. Make it build one only on the **first** call, keep it in the class attribute `_instance`, and return that same object from then on.",
          language: "python",
          starter: `class Settings:
    _instance = None

    def __init__(self):
        self.theme = "light"

    @classmethod
    def get_instance(cls):
        # TODO: create the object only the first time,
        # store it in cls._instance, and return it every time
        return cls()
`,
          solution: `class Settings:
    _instance = None

    def __init__(self):
        self.theme = "light"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
`,
          tests: [
            { id: "t1", description: "Two calls return the very same object", assertionCode: `assert Settings.get_instance() is Settings.get_instance(), "get_instance() should return the same object every time (check with 'is')"` },
            {
              id: "t2",
              description: "A change made through one reference is seen by the next caller",
              assertionCode: `Settings.get_instance().theme = "dark"
assert Settings.get_instance().theme == "dark", "The next get_instance() call should see theme 'dark'"`,
            },
            { id: "t3", description: "It is still a Settings object", assertionCode: `assert isinstance(Settings.get_instance(), Settings), "get_instance() should return a Settings"` },
          ],
          hints: ["Check `if cls._instance is None:` before building.", "Assign `cls._instance = cls()` inside the if, then `return cls._instance` after it."],
        },
        {
          kind: "explain",
          title: "The catch: a global in disguise",
          body: "Any code, anywhere, can reach the singleton, read it and **change** it. Look at this function's signature:\n\n" +
            py(`
def price_with_tax(amount):
    rate = Settings.get_instance().tax_rate  # hidden input
    return amount * (1 + rate)
`) +
            "\n\nNothing says it depends on settings, yet its answer changes whenever *someone else* edits the shared object.",
          widget: { type: "pattern-roles", props: { pattern: "singleton", highlight: ["client", "client2"] } },
        },
        {
          kind: "question",
          title: "The leaky test",
          body: "One test sets `tax_rate = 0.5` through the singleton to check a special case, and forgets to put it back. What happens?",
          question: {
            type: "choice",
            options: [
              "Nothing: each test gets a fresh singleton.",
              "Python raises an error when the test ends.",
              "Later tests that call price_with_tax silently get the wrong rate, and which ones fail depends on the order tests run in.",
              "Only that one test is affected.",
            ],
            answer: 2,
          },
          explanation: "The singleton outlives the test, so its change **leaks** into every later test. Bugs that depend on test order are among the hardest to track down, and they're a typical singleton cost.",
        },
        {
          kind: "explain",
          title: "Usually better: pass it in",
          body: "You can keep **one** settings object without letting everyone grab it. Create it once at start-up and **pass it** to whoever needs it:\n\n" +
            py(`
def price_with_tax(amount, settings):
    return amount * (1 + settings.tax_rate)

settings = Settings()               # made once, in main
print(price_with_tax(100, settings))
`) +
            "\n\nNow the dependency is **visible** in the signature, and a test can pass its own `Settings` without touching anyone else's.",
        },
        {
          kind: "question",
          title: "Removing the hidden dependency",
          body: "Which change best removes the hidden dependency in `price_with_tax`?",
          question: {
            type: "choice",
            options: [
              "Rename get_instance to get.",
              "Store the settings in a global variable instead.",
              "Create the settings once at start-up and pass them into the functions and classes that need them.",
              "Make a second singleton for tax settings.",
            ],
            answer: 2,
          },
          explanation: "Passing the dependency in (often called **dependency injection**) keeps the single instance but makes it explicit and replaceable. A plain global or a second singleton has exactly the same hidden-input problem.",
        },
        {
          kind: "recap",
          points: [
            "A **Singleton** guarantees one instance, handed out by `get_instance()`.",
            "It's a creational pattern, and also a **global variable in disguise**: hidden inputs, shared state, leaky tests.",
            "Usually better: create one object at start-up and **pass it in** where it's needed.",
            "Keep Singleton for things that truly must be unique and hold no behaviour-changing state.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 6. Decorator ───────────────────────────────
    {
      id: "fnd-patterns-6-decorator",
      title: "Decorator: wrap to add",
      summary: "Add behaviour by wrapping an object in layers that share its interface.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "A class for every combination",
          body: "A courier models its shipments with inheritance:\n\n" +
            py(`
class Parcel: ...
class WrappedParcel(Parcel): ...
class TrackedParcel(Parcel): ...
class WrappedTrackedParcel(Parcel): ...
class WrappedInsuredParcel(Parcel): ...
class WrappedTrackedInsuredParcel(Parcel): ...
# ...and a customer wants a second layer of wrap
`) +
            "\n\nEvery new add-on doubles the number of classes.",
        },
        {
          kind: "question",
          title: "How bad does it get?",
          body: "The courier offers **5 label options**, and each can be on or off. Counting the plain parcel, how many classes would cover every combination?",
          question: { type: "number", hint: "Each of the 5 options is either on or off. Multiply the choices together.", answer: 32, unit: "classes" },
          explanation: "Each add-on doubles the count, just like bits: 2⁵ = **32**. And that's without repeats (two layers of wrap) or ordering. Inheritance fixes combinations at the time you write the code.",
        },
        {
          kind: "explain",
          title: "Wrap instead",
          body: "A **decorator** wraps a shipment and *is* a shipment itself: it has the same `cost()` and `description()`. Each wrapper asks the shipment inside, then adds its own bit. Because wrappers are shipments, you can wrap a wrapper.\n\nAdd layers, tap one to move or remove it, and watch the cost build from the inside out.",
          widget: { type: "decorator", props: { initial: ["wrap"] } },
        },
        {
          kind: "question",
          title: "Build a $3.10 order",
          body: "Start from a plain parcel ($2.00 postage) and wrap it until the label costs exactly **$3.10**.",
          widget: { type: "decorator", props: { addons: ["wrap", "track", "insure", "sign"] } },
          question: { type: "widget", hint: "Each wrapper adds to the cost. Try combinations until the label costs $3.10.", goal: { cost: 3.1 } },
          explanation: "Bubble wrap ($0.50) and a signature ($0.60) add up to $1.10 on top of $2.00. Two small classes covered a combination that would have needed its own subclass.",
        },
        {
          kind: "explain",
          title: "The roles",
          body: "The plain parcel and every label option share one **component** interface. The **decorator** holds an `inner` component, and its methods call `inner` and add to the result.",
          widget: { type: "pattern-roles", props: { pattern: "decorator", highlight: ["decorator"] } },
        },
        {
          kind: "question",
          title: "Order matters",
          body: "This label is `Insurance(HalfPrice(Parcel()))`: the half-price deal only halves the postage, so it costs $1.90. **Reorder the two layers** so the half-price deal covers the whole label.",
          widget: { type: "decorator", props: { addons: ["insure", "half"], initial: ["half", "insure"] } },
          question: { type: "widget", hint: "A wrapper only affects what is inside it, so the layer on the outside sees the inner result.", goal: { layers: ["insure", "half"] } },
          explanation: "`HalfPrice(Insurance(Parcel()))` halves everything inside it: (2.00 + 0.90) ÷ 2 = **$1.45**. Each layer only sees what's *inside* it, so the outer layers get the last word.",
        },
        {
          kind: "code",
          title: "Write a decorator",
          body: "`BubbleWrap` is done for you. Write `Tracking` the same way: it wraps an inner shipment, adds 0.70 to the cost and `\", tracking\"` to the description.",
          language: "python",
          starter: `class Parcel:
    def cost(self):
        return 2.0

    def description(self):
        return "Parcel"


class BubbleWrap:
    def __init__(self, inner):
        self.inner = inner

    def cost(self):
        return self.inner.cost() + 0.5

    def description(self):
        return self.inner.description() + ", bubble wrap"


class Tracking:
    # TODO: wrap an inner shipment like BubbleWrap does;
    # add 0.7 to the cost and ", tracking" to the description
    pass
`,
          solution: `class Parcel:
    def cost(self):
        return 2.0

    def description(self):
        return "Parcel"


class BubbleWrap:
    def __init__(self, inner):
        self.inner = inner

    def cost(self):
        return self.inner.cost() + 0.5

    def description(self):
        return self.inner.description() + ", bubble wrap"


class Tracking:
    def __init__(self, inner):
        self.inner = inner

    def cost(self):
        return self.inner.cost() + 0.7

    def description(self):
        return self.inner.description() + ", tracking"
`,
          tests: [
            {
              id: "t1",
              description: "Tracking(Parcel()) costs 2.70",
              assertionCode: `d = Tracking(Parcel())
assert round(d.cost(), 2) == 2.7, "Tracking(Parcel()).cost() should be 2.7"
assert d.description() == "Parcel, tracking", "description should be 'Parcel, tracking'"`,
            },
            {
              id: "t2",
              description: "Tracking can wrap BubbleWrap",
              assertionCode: `d = Tracking(BubbleWrap(Parcel()))
assert round(d.cost(), 2) == 3.2, "Tracking(BubbleWrap(Parcel())).cost() should be 3.2"
assert d.description() == "Parcel, bubble wrap, tracking", "description should be 'Parcel, bubble wrap, tracking'"`,
            },
            { id: "t3", description: "Two tracking layers stack", assertionCode: `assert round(Tracking(Tracking(Parcel())).cost(), 2) == 3.4, "Two tracking layers should cost 3.4"` },
          ],
          hints: ["Copy BubbleWrap's three methods into Tracking and change the numbers and the text.", "`cost` returns `self.inner.cost() + 0.7`."],
        },
        {
          kind: "question",
          title: "Python's @ is the same idea",
          body: "Python's `@decorator` syntax wraps a **function** in another function. What does this print?\n\n" +
            py(`
def shout(fn):
    def wrapper():
        return fn().upper() + "!"
    return wrapper

def polite(fn):
    def wrapper():
        return "please, " + fn()
    return wrapper

@shout
@polite
def ask():
    return "pass the salt"

print(ask())
`),
          question: {
            type: "choice",
            options: ["PLEASE, PASS THE SALT!", "please, PASS THE SALT!", "please, pass the salt", "PASS THE SALT!please, "],
            answer: 0,
          },
          explanation: "Decorators apply bottom-up, so `ask` is `shout(polite(ask))`. The inner wrapper makes \"please, pass the salt\", then the outer one upper-cases it and adds \"!\". Same rule as the parcel label: the **outer layer gets the last word**.",
        },
        {
          kind: "question",
          title: "When does Decorator fit?",
          body: "Which problem calls for a Decorator rather than more subclasses?",
          question: {
            type: "choice",
            options: [
              "Optional extras (gift wrap, insurance, express handling) that can be combined on any order at runtime.",
              "Turning an XML response into the JSON objects your app expects.",
              "Creating the right subclass from a name.",
              "Making sure there's only one order queue.",
            ],
            answer: 0,
          },
          explanation: "Optional, **combinable** additions to an object that keeps its interface: Decorator. Reshaping XML into JSON *changes* the interface, which is Adapter's job, next lesson.",
        },
        {
          kind: "recap",
          points: [
            "A decorator **wraps** an object and shares its interface, so wrappers can wrap wrappers.",
            "Each layer calls the inner object and adds its own behaviour.",
            "Stack and reorder layers at runtime instead of writing a class per combination; **order matters**.",
            "Python's `@decorator` applies the same idea to functions (logging, timing, retries).",
          ],
        },
      ],
    },

    // ─────────────────────────────── 7. Adapter ───────────────────────────────
    {
      id: "fnd-patterns-7-adapter",
      title: "Adapter: make it fit",
      summary: "Put a translator between code that expects one interface and code that offers another.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Wrong shape",
          body: "Your checkout is written against a simple interface used in 40 places:\n\n" +
            py(`
gateway.pay(12.50)    # dollars in, True or False out
`) +
            "\n\nThe company signs with an old bank whose SDK looks like this, and you can't edit it:\n\n" +
            py(`
bank.send_payment(1250, "USD")   # cents and a currency; returns 0 for OK
`) +
            "\n\nDifferent method name, different units, different return value.",
        },
        {
          kind: "question",
          title: "Why not just change the checkout?",
          body: "Why not replace all 40 `gateway.pay(...)` calls with `bank.send_payment(...)`?",
          question: {
            type: "choice",
            options: [
              "Python doesn't allow calling another library's methods.",
              "send_payment is slower than pay.",
              "It ties the checkout to this one vendor: 40 edits now, with unit conversions in each, and 40 more when you switch banks.",
              "The bank SDK is a Singleton.",
            ],
            answer: 2,
          },
          explanation: "The checkout's interface is a good one. The *bank* is the odd one out, so the fix belongs at the boundary, in **one** place, not spread across 40 call sites.",
        },
        {
          kind: "explain",
          title: "Plug in an adapter",
          body: "An **adapter** looks like what the client expects on the outside, with a `pay` method, and calls the old `send_payment` on the inside. Try paying with the bank plugged in directly, then through an adapter.",
          widget: { type: "adapter", props: { mappings: ["int", "cents"] } },
        },
        {
          kind: "question",
          title: "Wire the adapter",
          body: "Use an adapter and pick the body of `pay` that charges the customer **exactly $12.50**.",
          widget: { type: "adapter" },
          question: { type: "widget", hint: "Pick the body of pay that turns our amount into what the provider expects.", goal: { ok: true } },
          explanation: "`round(amount * 100)` turns dollars into whole cents, and the currency must be \"USD\". `int(amount)` drops the cents *and* forgets to convert; passing the raw amount sends a fraction the bank rejects. All of the translation lives in one small class.",
        },
        {
          kind: "explain",
          title: "The roles",
          body: "The **client** talks to the **target** interface. The **adapter** implements the target and holds the **adaptee**, translating every call. Neither the client nor the adaptee changes.",
          widget: { type: "pattern-roles", props: { pattern: "adapter", highlight: ["adapter"] } },
        },
        {
          kind: "code",
          title: "Write the adapter",
          body: "Finish `BankAdapter.pay(amount)`: convert dollars to whole cents with `round`, call `send_payment` in `\"USD\"`, and return `True` when the status is 0. Don't edit `LegacyBank`.",
          language: "python",
          starter: `class LegacyBank:
    """Vendor code: don't edit."""

    def __init__(self):
        self.sent = []

    def send_payment(self, cents, currency):
        if not isinstance(cents, int):
            raise TypeError("cents must be a whole number")
        self.sent.append((cents, currency))
        return 0  # 0 means OK


class BankAdapter:
    def __init__(self, bank):
        self.bank = bank

    def pay(self, amount):
        # TODO: dollars -> cents, send in "USD",
        # return True if the status is 0
        pass
`,
          solution: `class LegacyBank:
    """Vendor code: don't edit."""

    def __init__(self):
        self.sent = []

    def send_payment(self, cents, currency):
        if not isinstance(cents, int):
            raise TypeError("cents must be a whole number")
        self.sent.append((cents, currency))
        return 0  # 0 means OK


class BankAdapter:
    def __init__(self, bank):
        self.bank = bank

    def pay(self, amount):
        status = self.bank.send_payment(round(amount * 100), "USD")
        return status == 0
`,
          tests: [
            {
              id: "t1",
              description: "pay(12.5) sends 1250 cents in USD and returns True",
              assertionCode: `bank = LegacyBank()
assert BankAdapter(bank).pay(12.5) is True, "pay should return True when the bank returns 0"
assert bank.sent == [(1250, "USD")], "The bank should receive (1250, 'USD')"`,
            },
            {
              id: "t2",
              description: "pay(19.99) sends 1999 cents (no rounding errors)",
              assertionCode: `bank = LegacyBank()
BankAdapter(bank).pay(19.99)
assert bank.sent == [(1999, "USD")], "19.99 dollars should be 1999 cents: use round(), int() cuts 1998.9999 down to 1998"`,
            },
            {
              id: "t3",
              description: "A failed payment returns False",
              assertionCode: `class DownBank(LegacyBank):
    def send_payment(self, cents, currency):
        return 7
assert BankAdapter(DownBank()).pay(5) is False, "Any status other than 0 should make pay return False"`,
            },
            {
              id: "t4",
              description: "The checkout works through the adapter unchanged",
              assertionCode: `def checkout(gateway, total):
    return "paid" if gateway.pay(total) else "declined"
assert checkout(BankAdapter(LegacyBank()), 5) == "paid", "checkout should accept the adapter as its gateway"`,
            },
          ],
          hints: ["Cents: `round(amount * 100)` gives a whole number.", "Keep the status: `status = self.bank.send_payment(...)`, then `return status == 0`."],
        },
        {
          kind: "question",
          title: "Adapter or Decorator?",
          body: "Both wrap another object. What's the difference?",
          question: {
            type: "choice",
            options: [
              "Adapter adds behaviour; Decorator changes the interface.",
              "Adapter changes the interface to the one the client expects; Decorator keeps the same interface and adds behaviour.",
              "They're the same pattern with different names.",
              "Adapter can only wrap functions.",
            ],
            answer: 1,
          },
          explanation: "Ask *what the outside looks like*. A decorated parcel is still a parcel (same methods). An adapted bank looks like a **different thing**: a payment gateway.",
        },
        {
          kind: "question",
          title: "When does Adapter fit?",
          body: "Which is a job for Adapter?",
          question: {
            type: "choice",
            options: [
              "Your app reads temperatures with read_celsius(), but the new sensor library only offers get_temp_f().",
              "Let users pick between three sorting orders.",
              "Notify two screens when a file finishes downloading.",
              "Add timing to every database call.",
            ],
            answer: 0,
          },
          explanation: "Existing code expects one interface, the new code offers another: wrap the sensor in an adapter whose `read_celsius()` calls `get_temp_f()` and converts. The others are Strategy, Observer and Decorator.",
        },
        {
          kind: "recap",
          points: [
            "An adapter makes an **incompatible interface fit** the one your code expects.",
            "Roles: client → target interface ← adapter → adaptee.",
            "All the translation (names, units, return values) lives in one small class.",
            "Adapter changes the interface; Decorator keeps it and adds behaviour.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 8. Command ───────────────────────────────
    {
      id: "fnd-patterns-8-command",
      title: "Command: actions as objects",
      summary: "Turn each action into an object you can store, queue, log and undo.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Actions that vanish",
          body: "A text editor's buttons call methods directly:\n\n" +
            py(`
def on_type_click(text):
    doc.text += text

def on_upper_click():
    doc.text = doc.text.upper()
`) +
            "\n\nThe action happens and is gone. Now the boss wants an **Undo** button.",
        },
        {
          kind: "question",
          title: "What's missing for undo?",
          body: "The editor's buttons run the action and forget it. What does an **Undo** button need that the code above doesn't have?",
          question: {
            type: "choice",
            options: [
              "A faster computer.",
              "A record of what was done, and how to reverse each thing, kept in order.",
              "A second document to copy into.",
              "Nothing: Python remembers previous values automatically.",
            ],
            answer: 1,
          },
          explanation: "Undo needs a **history**: each action and enough information to reverse it. When an action is just a method call, nothing is left to put in that history.",
        },
        {
          kind: "explain",
          title: "Every press becomes an object",
          body: "With **Command**, a button doesn't do the work. It creates a command object with `execute()` and `undo()`, runs it, and pushes it onto a history list. Undo pops the last one and calls its `undo()`.\n\nType, uppercase, undo and redo. Watch the history.",
          widget: { type: "command" },
        },
        {
          kind: "question",
          title: "Back to the start of the sentence",
          body: "Someone typed and then shouted. Make the document read exactly **Hello world** again.",
          widget: { type: "command", props: { initial: ["Hello", " world", "!", "UPPER"] } },
          question: { type: "widget", hint: "Undo until the document reads Hello world again.", goal: { text: "Hello world" } },
          explanation: "Two undos: the `Uppercase` command restores the text it saved, then the `TypeText(\"!\")` command removes its \"!\". Each command knew how to reverse **itself**; the history just called `undo()` in reverse order.",
        },
        {
          kind: "question",
          title: "Undo, then something new",
          body: "Type **a**, **b**, **c**. Press **Undo** twice. Then type **d**. What do you get? Try it.",
          widget: { type: "command", props: { buttons: ["a", "b", "c", "d"] } },
          question: {
            type: "choice",
            options: [
              'The document reads "ad" and the redo steps for b and c are gone.',
              'The document reads "ad" and you can still redo b and c.',
              'The document reads "abcd".',
              'The document reads "d".',
            ],
            answer: 0,
          },
          explanation: "Running a new command after undoing **throws away the redo list**: \"b\" and \"c\" were undone, and redoing them on top of \"d\" would build a history that never happened. Almost every editor works this way.",
        },
        {
          kind: "explain",
          title: "The roles",
          body: "The **invoker** (a toolbar, a history, a scheduler) runs commands and keeps them. The **command** interface is `execute()` and `undo()`. **Concrete commands** remember what they need to reverse themselves. The **receiver** is the object that really changes, here the document.",
          widget: { type: "pattern-roles", props: { pattern: "command", highlight: ["command", "concrete"] } },
        },
        {
          kind: "code",
          title: "Undo, for real",
          body: "Finish `TypeText.undo` (remove the text this command added) and `History.undo` (undo the most recent command, if there is one). The tests also run a `Shout` command your history has never seen.",
          language: "python",
          starter: `class Document:
    def __init__(self):
        self.text = ""


class TypeText:
    def __init__(self, doc, text):
        self.doc = doc
        self.text = text

    def execute(self):
        self.doc.text += self.text

    def undo(self):
        # TODO: remove the text this command added
        pass


class History:
    def __init__(self):
        self.done = []

    def run(self, command):
        command.execute()
        self.done.append(command)

    def undo(self):
        # TODO: undo the most recent command, if there is one
        pass
`,
          solution: `class Document:
    def __init__(self):
        self.text = ""


class TypeText:
    def __init__(self, doc, text):
        self.doc = doc
        self.text = text

    def execute(self):
        self.doc.text += self.text

    def undo(self):
        keep = len(self.doc.text) - len(self.text)
        self.doc.text = self.doc.text[:keep]


class History:
    def __init__(self):
        self.done = []

    def run(self, command):
        command.execute()
        self.done.append(command)

    def undo(self):
        if self.done:
            self.done.pop().undo()
`,
          tests: [
            {
              id: "t1",
              description: "Undo removes the last typed text",
              assertionCode: `d = Document()
h = History()
h.run(TypeText(d, "Hi"))
h.run(TypeText(d, " there"))
assert d.text == "Hi there", "Running both commands should give 'Hi there'"
h.undo()
assert d.text == "Hi", "One undo should leave 'Hi'"`,
            },
            {
              id: "t2",
              description: "Undoing everything, and once more, is safe",
              assertionCode: `d = Document()
h = History()
h.run(TypeText(d, "Hi"))
h.undo()
assert d.text == "", "After undoing the only command the document should be empty"
h.undo()
assert d.text == "", "Undo with an empty history should do nothing (and not crash)"`,
            },
            {
              id: "t3",
              description: "History undoes any command object",
              assertionCode: `class Shout:
    def __init__(self, doc):
        self.doc = doc
    def execute(self):
        self.before = self.doc.text
        self.doc.text = self.doc.text.upper()
    def undo(self):
        self.doc.text = self.before
d = Document()
h = History()
h.run(TypeText(d, "hey"))
h.run(Shout(d))
assert d.text == "HEY", "Shout should upper-case the text"
h.undo()
assert d.text == "hey", "History.undo should call the last command's undo()"`,
            },
          ],
          hints: ["TypeText.undo: keep the first `len(self.doc.text) - len(self.text)` characters.", "History.undo: `if self.done:` then `self.done.pop().undo()`."],
        },
        {
          kind: "question",
          title: "When does Command fit?",
          body: "Which feature is a natural fit for Command?",
          question: {
            type: "choice",
            options: [
              "A smart-home app lets users schedule actions (\"lights off at 23:00\"), shows a log of what ran, and can undo the last one.",
              "A sensor reading must reach three displays.",
              "The app must use a vendor's API that has the wrong method names.",
              "Pick a discount rule based on the customer's membership level.",
            ],
            answer: 0,
          },
          explanation: "Scheduling, logging and undo all need actions you can **hold on to**. Once an action is an object you can put it in a queue, save it in a log or reverse it.",
        },
        {
          kind: "recap",
          points: [
            "Command turns an action into an **object** with `execute()` and `undo()`.",
            "An invoker keeps a history: undo pops and reverses, redo runs again.",
            "A new command after an undo clears the redo list.",
            "Objects can be **queued, scheduled, logged and replayed**, not just undone.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 9. State ───────────────────────────────
    {
      id: "fnd-patterns-9-state",
      title: "State: behaviour that changes with the stage",
      summary: "Give each stage its own object instead of if/elif on a mode string.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "The same if/elif in every button",
          body: "A music player keeps its mode in a string, and every button checks it:\n\n" +
            py(`
def press_play(self):
    if self.mode == "stopped":
        self.start_from_beginning()
        self.mode = "playing"
    elif self.mode == "paused":
        self.resume()
        self.mode = "playing"

def press_pause(self):
    if self.mode == "playing": ...   # and again

def press_stop(self):
    if self.mode != "stopped": ...   # and again
`) +
            "\n\nThe rules for *one* stage are scattered across *every* method.",
        },
        {
          kind: "question",
          title: "Add a stage",
          body: "Streaming arrives and the player needs a fourth mode, **buffering**. How many of the three button methods need a new branch?",
          question: { type: "number", hint: "Count the button methods: each one needs a branch for the new mode.", answer: 3 },
          explanation: "All **3**: every button has to decide what to do while buffering. With *n* buttons, each new stage means *n* edits in *n* places, and it's easy to miss one.",
        },
        {
          kind: "explain",
          title: "One object per stage",
          body: "In the **State** pattern each stage is its own class: `Stopped`, `Playing`, `Paused`. The player holds the current state object and forwards every button to it. The state decides what happens, and which state comes next.\n\nPress the buttons. The same button does different things depending on the state.",
          widget: { type: "state-machine", props: { machine: "player" } },
        },
        {
          kind: "question",
          title: "Buy a drink",
          body: "A vending machine works the same way. Get **one drink** out and leave the machine back in **Idle**, ready for the next customer.",
          widget: { type: "state-machine", props: { machine: "vending" } },
          question: { type: "widget", hint: "Insert money, choose a drink, and let the machine return to Idle.", goal: { state: "idle", drinks: 1 } },
          explanation: "Insert coin → press → take. Pressing the button in `Idle` just says *insert a coin first*: that refusal is `Idle`'s own behaviour, with no `if mode ==` anywhere.",
        },
        {
          kind: "explain",
          title: "The roles",
          body: "The **context** (the player) holds the current state and forwards calls. The **state** interface has one method per event. Each **concrete state** implements the behaviour for its stage and switches the context to the next state.",
          widget: { type: "pattern-roles", props: { pattern: "state", highlight: ["concrete"] } },
        },
        {
          kind: "question",
          title: "Who decides what's next?",
          body: "In the State pattern, who decides that pressing pause while playing leads to `Paused`?",
          question: {
            type: "choice",
            options: [
              "The player, with an if/elif on its mode.",
              "The current state object: Playing.pause() sets the player's state to Paused().",
              "The pause button.",
              "Python picks the next class automatically.",
            ],
            answer: 1,
          },
          explanation: "The transitions live **inside the states**. Everything about \"Playing\" (what each button does, where it leads) sits in one class, so adding `Buffering` means adding one class.",
        },
        {
          kind: "code",
          title: "A turnstile",
          body: "A turnstile is `Locked` until you insert a coin, then `Unlocked` until someone pushes through. `Locked` is done. Finish `Unlocked`: a coin keeps it open and returns `\"thanks, already open\"`; a push locks it again and returns `\"welcome\"`.",
          language: "python",
          starter: `class Locked:
    def coin(self, gate):
        gate.state = Unlocked()
        return "unlocked"

    def push(self, gate):
        return "locked: insert a coin"


class Unlocked:
    def coin(self, gate):
        # TODO: stay unlocked, return "thanks, already open"
        pass

    def push(self, gate):
        # TODO: switch the gate back to Locked(), return "welcome"
        pass


class Turnstile:
    def __init__(self):
        self.state = Locked()

    def coin(self):
        return self.state.coin(self)

    def push(self):
        return self.state.push(self)
`,
          solution: `class Locked:
    def coin(self, gate):
        gate.state = Unlocked()
        return "unlocked"

    def push(self, gate):
        return "locked: insert a coin"


class Unlocked:
    def coin(self, gate):
        return "thanks, already open"

    def push(self, gate):
        gate.state = Locked()
        return "welcome"


class Turnstile:
    def __init__(self):
        self.state = Locked()

    def coin(self):
        return self.state.coin(self)

    def push(self):
        return self.state.push(self)
`,
          tests: [
            {
              id: "t1",
              description: "Coin, then push: welcome, and locked again",
              assertionCode: `t = Turnstile()
assert t.coin() == "unlocked", "A coin should unlock the turnstile"
assert t.push() == "welcome", "Pushing an unlocked turnstile should return 'welcome'"
assert isinstance(t.state, Locked), "After someone walks through, the state should be Locked again"`,
            },
            {
              id: "t2",
              description: "A second coin keeps it open",
              assertionCode: `t = Turnstile()
t.coin()
assert t.coin() == "thanks, already open", "A coin while unlocked should return 'thanks, already open'"
assert isinstance(t.state, Unlocked), "It should still be Unlocked"`,
            },
            {
              id: "t3",
              description: "Pushing a locked turnstile is refused",
              assertionCode: `t = Turnstile()
assert t.push() == "locked: insert a coin", "Pushing while locked should be refused"
assert isinstance(t.state, Locked), "And it stays Locked"`,
            },
          ],
          hints: ["Unlocked.coin doesn't change the state: just return the message.", "Unlocked.push: `gate.state = Locked()` then `return \"welcome\"`."],
        },
        {
          kind: "question",
          title: "State or Strategy?",
          body: "Their diagrams look almost the same: a context holding a swappable object. Which of these is **State**?",
          question: {
            type: "choice",
            options: [
              "A shop lets the customer choose to sort products by price or by rating.",
              "A document moves itself from Draft to In review to Published, and edit() is allowed in some stages but refused in others.",
              "A game lets the player pick an easy or hard AI before the match.",
              "A report can be exported as PDF or CSV.",
            ],
            answer: 1,
          },
          explanation: "With **Strategy**, someone outside picks the algorithm and it usually stays put. With **State**, the object **moves itself** from stage to stage as events happen, and each stage changes how it behaves.",
        },
        {
          kind: "recap",
          points: [
            "State gives each stage its **own class** instead of if/elif on a mode string.",
            "The context forwards every event to its current state object.",
            "States hold their behaviour **and** their transitions; adding a stage means adding a class.",
            "Strategy is chosen from outside; State changes itself as things happen.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 10. Choosing ───────────────────────────────
    {
      id: "fnd-patterns-10-choosing",
      title: "Choosing a pattern",
      summary: "Start from the problem, ask what varies, and know when to use none.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Start from the pain",
          body: "Don't ask *\"where can I use a pattern?\"*. Ask **\"what keeps changing, and what does it hurt?\"**\n\n- The **way** a job is done varies → **Strategy**\n- Many parts must **hear about** a change → **Observer**\n- **Which class** to build depends on data → **Factory**\n- Optional extras get **combined** → **Decorator**\n- An interface **doesn't fit** yours → **Adapter**\n- Actions must be **stored, queued or undone** → **Command**\n- Behaviour depends on the **stage** something is in → **State**\n- Exactly **one** is needed → create it once and **pass it in**\n- Nothing varies → **no pattern**",
        },
        {
          kind: "question",
          title: "Match the problem (1 of 2)",
          body: "Tap a problem, then the pattern that fits it.",
          widget: {
            type: "pattern-sorter",
            props: {
              buckets: [
                { id: "strategy", label: "Strategy" },
                { id: "observer", label: "Observer" },
                { id: "adapter", label: "Adapter" },
                { id: "command", label: "Command" },
              ],
              items: [
                { id: "rank", text: "Users choose how search results are ranked: by price, rating or distance." },
                { id: "match", text: "When a match ends, the scoreboard, the replay saver and the achievements system all react." },
                { id: "map", text: "Your code calls place.coordinates(), but a vendor's place objects only have get_lat() and get_lng()." },
                { id: "draw", text: "A drawing app needs undo, and a way to replay the last ten actions." },
              ],
              answer: { rank: "strategy", match: "observer", map: "adapter", draw: "command" },
            },
          },
          question: { type: "widget", hint: "Ask what changes: the algorithm, who needs to know, the interface or the action.", goal: { placed: { rank: "strategy", match: "observer", map: "adapter", draw: "command" } } },
          explanation: "Ranking rules are interchangeable algorithms (Strategy). Many systems reacting to one event is Observer. A vendor object with the wrong methods needs an Adapter. Undo and replay need actions as objects (Command).",
        },
        {
          kind: "question",
          title: "Match the problem (2 of 2)",
          body: "Tap a problem, then the pattern that fits it. One of these needs no pattern at all.",
          widget: {
            type: "pattern-sorter",
            props: {
              buckets: [
                { id: "factory", label: "Factory" },
                { id: "decorator", label: "Decorator" },
                { id: "state", label: "State" },
                { id: "none", label: "No pattern" },
              ],
              items: [
                { id: "reader", text: "A loader builds a CsvReader, JsonReader or XmlReader depending on the file's extension." },
                { id: "notify", text: "Sending a message can be retried, rate-limited and logged, in any combination." },
                { id: "order", text: "An order is New, Paid, Shipped or Cancelled, and cancel() refunds in one stage but is refused in another." },
                { id: "sum", text: "A script reads two numbers and prints their sum." },
              ],
              answer: { reader: "factory", notify: "decorator", order: "state", sum: "none" },
            },
          },
          question: { type: "widget", hint: "One problem is simple enough that a pattern would only add ceremony.", goal: { placed: { reader: "factory", notify: "decorator", order: "state", sum: "none" } } },
          explanation: "Choosing a class from data is Factory. Combinable wrappers around the same interface are Decorator. Stage-dependent behaviour is State. And a two-number script has nothing that varies: adding a pattern would only add code.",
        },
        {
          kind: "question",
          title: "Strategy or Observer?",
          body: "An app can send alerts by email, SMS or push notification. The user picks **one** in their settings. Which pattern fits?",
          question: { type: "choice", options: ["Observer", "Strategy", "Singleton", "Adapter"], answer: 1 },
          explanation: "It's tempting to think *notifications → Observer*, but nothing is broadcasting to many listeners here. It's **one job (send the alert) with interchangeable ways to do it**, picked at runtime: Strategy. If the user could tick several channels at once, Observer would start to make sense.",
        },
        {
          kind: "question",
          title: "The 200-line if/elif",
          body: "A game character behaves differently while Idle, Running, Jumping or Stunned. The input handler is a 200-line if/elif on `self.mode`, repeated for every button. Which pattern untangles it?",
          question: { type: "choice", options: ["Decorator", "Factory", "State", "Command"], answer: 2 },
          explanation: "Behaviour that depends on the **stage**, with an if/elif on a mode string in every method, is the signature of **State**: one class per mode, each handling every button.",
        },
        {
          kind: "question",
          title: "Over-engineering alert",
          body: "A function converts Celsius to Fahrenheit. A colleague proposes a `ConverterFactory`, a `ConversionStrategy` interface and an observer that logs every result. What's the right call?",
          question: {
            type: "choice",
            options: [
              "Use all three: more patterns, more flexible.",
              "Just the Factory, it's the simplest.",
              "None: one small function does the job, and nothing about it varies.",
              "Make the converter a Singleton.",
            ],
            answer: 2,
          },
          explanation: "`def to_f(c): return c * 9 / 5 + 32` is the whole program. Patterns pay for themselves only when they remove a real pain; here they'd only add places for bugs to hide.",
        },
        {
          kind: "question",
          title: "Two at once",
          body: "A text editor needs every edit to be undoable, and after each edit both the word count and the \"unsaved changes\" dot must update. Which **two** patterns fit?",
          question: { type: "choice", options: ["Command", "Observer", "Singleton", "Adapter"], answer: [0, 1] },
          explanation: "Edits as **Command** objects give you undo. The document then **publishes** each change, and the word count and save indicator subscribe as **Observers**. Real programs often combine patterns like this.",
        },
        {
          kind: "question",
          title: "Name that shape",
          body: "Here's part of a design with the role names hidden. Tap around, then decide which pattern it is.",
          widget: {
            type: "pattern-roles",
            props: {
              examplesOnly: true,
              hideTitle: true,
              rows: [
                {
                  boxes: [{ id: "remote", name: "Invoker", example: "RemoteControl", kind: "client", members: ["press(slot)", "undo_last()"], job: "Runs whatever is in each slot and keeps a list of what it ran." }],
                  link: "calls",
                },
                {
                  boxes: [{ id: "action", name: "Command", example: "Action", kind: "interface", members: ["execute()", "undo()"], job: "Every slot holds one of these." }],
                  link: "implemented by",
                },
                {
                  boxes: [{ id: "concrete", name: "Concrete commands", example: "LightOn · VolumeUp", kind: "class", many: true, members: ["execute()", "undo()"], job: "Each remembers which device it acts on and how to reverse itself." }],
                  link: "act on",
                },
                { boxes: [{ id: "devices", name: "Receivers", example: "Light · Speaker", kind: "class", job: "The devices that really change. They know nothing about the remote." }] },
              ],
            },
          },
          question: { type: "choice", options: ["Strategy", "Command", "Observer", "Adapter"], answer: 1 },
          explanation: "Actions packed into objects with `execute()` **and `undo()`**, run and remembered by an invoker: that's **Command**. Strategy looks similar on paper, but a strategy is an algorithm you plug in, not an action you store and reverse.",
        },
        {
          kind: "question",
          title: "Patterns don't need class names",
          body: py(`
class Thermostat:
    def __init__(self):
        self._listeners = []

    def on_change(self, fn):
        self._listeners.append(fn)

    def set(self, temp):
        self.temp = temp
        for fn in self._listeners:
            fn(temp)
`) + "\n\nNo class here is called *Subject* or *Observer*. Which pattern is it?",
          question: { type: "choice", options: ["Command", "Decorator", "Observer", "Factory"], answer: 2 },
          explanation: "A list of listeners, a way to join it, and a loop that calls each one on change: **Observer**, using plain functions as subscribers. Recognise patterns by their **shape**, not their names.",
        },
        {
          kind: "recap",
          title: "You finished Foundations",
          points: [
            "Pick a pattern by asking **what varies** and what that change hurts.",
            "Look-alikes differ in intent: Strategy vs State, Adapter vs Decorator, Strategy vs Observer.",
            "Real designs often **combine** patterns, like Command + Observer in an editor.",
            "Recognise patterns by their shape, not class names, and use **none** when nothing varies.",
          ],
        },
      ],
    },
  ],
};
