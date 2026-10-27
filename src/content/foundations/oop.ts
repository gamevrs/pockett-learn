import type { Module, WidgetSpec } from "../../learn/types.ts";

// ── Widget setups shared by several steps ──

const PLAYER: WidgetSpec = {
  type: "oop-factory",
  props: {
    className: "Player",
    fields: [{ name: "name" }, { name: "hp" }],
    methods: [
      { name: "heal", field: "hp", add: 20 },
      { name: "take_hit", field: "hp", add: -30 },
    ],
    presets: [
      { var: "ana", name: "Ana", hp: 80 },
      { var: "ben", name: "Ben", hp: 50 },
      { var: "cy", name: "Cy", hp: 90 },
    ],
  },
};

const DOG = {
  className: "Dog",
  fields: [{ name: "name" }, { name: "age" }, { name: "tricks", init: 0 }],
  methods: [
    { name: "birthday", field: "age", add: 1 },
    { name: "learn_trick", field: "tricks", add: 1 },
    { name: "bark", says: "Woof! I'm {name}" },
  ],
  presets: [
    { var: "rex", name: "Rex", age: 3 },
    { var: "bella", name: "Bella", age: 5 },
    { var: "max", name: "Max", age: 1 },
  ],
};

const ANIMALS = [
  { name: "Animal", members: ["name", { name: "eat()", does: 'returns f"{self.name} eats"' }, { name: "speak()", does: 'returns "..."' }, "sleep()"] },
  { name: "Dog", parent: "Animal", members: [{ name: "speak()", does: 'returns "Woof"' }, "fetch()"] },
  { name: "Puppy", parent: "Dog", members: [{ name: "speak()", does: 'returns "Yip!"' }, "chew()"] },
  { name: "Cat", parent: "Animal", members: [{ name: "speak()", does: 'returns "Meow"' }, "climb()"] },
  { name: "Bird", parent: "Animal", members: [{ name: "speak()", does: 'returns "Tweet"' }, "fly()"] },
];

const SHAPES = [
  { cls: "Circle", label: "Circle(2)", reply: "12.57" },
  { cls: "Square", label: "Square(3)", reply: "9" },
  { cls: "Rectangle", label: "Rectangle(2, 5)", reply: "10" },
];

const HERO = {
  className: "Hero",
  obj: "hero",
  slots: [
    {
      id: "weapon",
      attr: "weapon",
      options: [
        { id: "sword", cls: "Sword", replies: { use: "Slash! 8 damage, up close" } },
        { id: "bow", cls: "Bow", replies: { use: "Thwip! 5 damage from 30 m away" } },
        { id: "staff", cls: "Staff", replies: { use: "Fireball! 12 damage, costs mana" } },
      ],
    },
    {
      id: "mover",
      attr: "mover",
      options: [
        { id: "walk", cls: "Walk", replies: { go: "Walks 5 m" } },
        { id: "fly", cls: "Fly", replies: { go: "Flies 20 m, over the wall" } },
        { id: "swim", cls: "Swim", replies: { go: "Swims 8 m across the river" } },
      ],
    },
  ],
  methods: [
    { name: "attack", slot: "weapon", partMethod: "use" },
    { name: "move", slot: "mover", partMethod: "go" },
  ],
};

const SOLID = ["Single responsibility", "Open/closed", "Liskov substitution", "Interface segregation", "Dependency inversion"];

/** Module 3: object-oriented programming, built around the four pillars. */
export const oopModule: Module = {
  id: "oop",
  part: "program",
  title: "Object-oriented programming",
  blurb: "Classes and objects, then the four pillars: encapsulation, abstraction, inheritance and polymorphism.",
  icon: "boxes",
  lessons: [
    // ─────────────────────────── 1 ───────────────────────────
    {
      id: "fnd-oop-1-why-objects",
      title: "Why objects?",
      summary: "Loose variables pile up fast. Objects keep data and behaviour together.",
      minutes: 5,
      xp: 40,
      steps: [
        {
          kind: "explain",
          title: "A game with three players",
          body: `Say you're writing a small game. Every player has a name, health points (hp) and a position, so you make variables:

~~~python
p1_name, p1_hp, p1_x = "Ana", 80, 0
p2_name, p2_hp, p2_x = "Ben", 50, 4
p3_name, p3_hp, p3_x = "Cy", 90, 9

def heal(hp):
    return hp + 20
~~~

Nine variables, and a function with no idea which player it's healing. It works. For now.`,
        },
        {
          kind: "question",
          title: "The pile grows",
          body: "Next week you add a **fourth player**, and every player also gets a **shield**. How many new variables do you need?",
          question: { type: "number", hint: "Count both: the new player's variables, and the new shield variable every player now needs.", answer: 7 },
          explanation: "Four for the new player (name, hp, x, shield) plus one shield for each of the three existing players: **7**. The pile grows with *players × properties*, and nothing in the code says which variables belong together.",
        },
        {
          kind: "question",
          title: "Spot the mix-up",
          body: `You meant to heal Ben:

~~~python
p2_hp = heal(p1_hp)
~~~

What actually happens?`,
          question: {
            type: "choice",
            options: [
              "Ben is healed: his 50 becomes 70",
              "Ben's hp becomes Ana's hp plus 20, so 100",
              "Ana is healed and Ben is unchanged",
              "Python raises an error because the names don't match",
            ],
            answer: 1,
          },
          explanation: "`heal()` just gets a number. It returned 80 + 20 = 100, which landed in `p2_hp`. Python can't catch the mistake because to Python these are unrelated numbers. Nothing says `p1_hp` *belongs to* Ana.",
        },
        {
          kind: "explain",
          title: "Bundle it up",
          body: "An **object** keeps one player's data together *with* the things a player can do. The data stored on an object are its **attributes**. The functions that belong to it are its **methods**.\n\nCreate a player, then tap `heal()`.",
          widget: PLAYER,
        },
        {
          kind: "question",
          title: "Heal the right one",
          body: "Create all three players, then heal **only Ben**, from 50 back up to 70.",
          widget: PLAYER,
          question: { type: "widget", hint: "Create all three players, then change only Ben's hp.", goal: { objects: 3, match: { name: "Ben", hp: 70 }, onlyMatchChanged: true } },
          explanation: "`ben.heal()` can only change Ben: a method works on the object it was called on. The mix-up from before is now much harder to make, because each player carries its own `hp`.",
        },
        {
          kind: "question",
          title: "Has or does?",
          body: "Which of these would be **methods** of a Player, not attributes?",
          question: { type: "choice", options: ["hp", "heal()", "name", "move(steps)", "position", "take_hit(damage)"], answer: [1, 3, 5] },
          explanation: "Attributes are what an object **has**: nouns like name, hp, position. Methods are what it **does**: verbs like heal, move, take_hit. Quick test: if it fits \"the player can ___\", it's a method.",
        },
        {
          kind: "question",
          title: "So what's the win?",
          body: "Why do programmers bundle data and behaviour into objects?",
          question: {
            type: "choice",
            options: [
              "Programs run faster",
              "Each object looks after its own data, so related things stay together and are hard to mix up",
              "It makes bugs impossible",
              "Python won't run code that isn't inside a class",
            ],
            answer: 1,
          },
          explanation: "Objects don't make code faster or bug-free, and Python is perfectly happy without classes. The win is **organisation**: data lives next to the code that uses it. The rest of this module, including the four pillars, builds on that.",
        },
        {
          kind: "recap",
          points: [
            "Loose variables don't say what belongs together, and the pile grows with every new thing and property.",
            "An **object** bundles data (**attributes**) with behaviour (**methods**).",
            "A method works on the object it's called on: `ben.heal()` changes only Ben.",
            "Attributes are what an object *has*; methods are what it can *do*.",
          ],
        },
      ],
    },

    // ─────────────────────────── 2 ───────────────────────────
    {
      id: "fnd-oop-2-classes",
      title: "Classes and objects",
      summary: "A class is the blueprint, objects are the things built from it. Meet __init__ and self.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Blueprint and buildings",
          body: "A **class** is a blueprint. It describes what every dog *has* and *can do*, but it isn't a dog. An **object** (also called an **instance**) is one real dog built from the class, with its own values.\n\nBuild a dog or two. Notice that the class itself never changes.",
          widget: { type: "oop-factory", props: { ...DOG, showCode: true } },
        },
        {
          kind: "question",
          title: "Same blueprint, separate dogs",
          body: "Build **Rex** and **Bella**, then give **only Rex** a birthday.",
          widget: { type: "oop-factory", props: DOG },
          question: { type: "widget", hint: "Build Rex and Bella from the same class, then give a birthday to Rex only.", goal: { objects: 2, match: { name: "Rex", age: 4 }, onlyMatchChanged: true } },
          explanation: "Both dogs came from one class, but each object has its own `age`. `rex.birthday()` changed Rex and left Bella alone. They even sit at different memory addresses: they really are two separate things.",
        },
        {
          kind: "explain",
          title: "__init__ and self",
          body: `Creating an object runs a special method, \`__init__\` (the **constructor**), which fills in the starting values:

~~~python
class Dog:
    def __init__(self, name, age):
        self.name = name     # store it on this object
        self.age = age

rex = Dog("Rex", 3)
~~~

\`Dog("Rex", 3)\` makes a new, empty object, then calls \`__init__\` with **\`self\` set to that new object**. So \`self.name = name\` means "store the name on *this* dog".`,
        },
        {
          kind: "question",
          title: "Who is self?",
          body: "Inside `rex.birthday()`, what is `self`?",
          question: { type: "choice", options: ["The Dog class itself", "rex: the object the method was called on", "A fresh copy of rex", "Every Dog object at once"], answer: 1 },
          explanation: "Python turns `rex.birthday()` into `Dog.birthday(rex)`, so `self` is whichever object is in front of the dot. That's how one method, written once, works for every dog.",
        },
        {
          kind: "question",
          title: "Twins",
          body: `What does this print?

~~~python
a = Dog("Rex", 3)
b = Dog("Rex", 3)
a.age = 10
print(b.age)
~~~`,
          question: { type: "choice", options: ["10", "3", "An error: two dogs can't share a name", "None"], answer: 1 },
          explanation: "Two calls to `Dog(...)` make two separate objects, even with identical values. Changing `a` doesn't touch `b`, so it prints **3**.",
        },
        {
          kind: "question",
          title: "Two names, one dog",
          body: `And this one?

~~~python
a = Dog("Rex", 3)
b = a
a.age = 10
print(b.age)
~~~`,
          question: { type: "choice", options: ["10", "3", "An error", "None"], answer: 0 },
          explanation: "`b = a` doesn't copy the dog. It gives the **same** object a second name. There's only one `Dog(...)` call, so there's only one dog, and it prints **10**. New objects come from calling the class, never from `=`.",
        },
        {
          kind: "question",
          title: "The forgotten self",
          body: `What happens here?

~~~python
class Dog:
    def __init__(self, name):
        name = name

rex = Dog("Rex")
print(rex.name)
~~~`,
          question: { type: "choice", options: ["It prints Rex", "AttributeError: 'Dog' object has no attribute 'name'", "It prints None", "It prints name"], answer: 1 },
          explanation: "Without `self.`, `name = name` just sets a local variable that vanishes when `__init__` ends. An attribute only sticks when you store it **on the object**: `self.name = name`.",
        },
        {
          kind: "code",
          title: "Write a class",
          body: "Finish the `Dog` class:\n\n- `__init__` stores `name` and `age` on the object.\n- `birthday()` adds 1 to **this** dog's age.\n- `describe()` returns text like `\"Rex is 3 years old\"`.",
          language: "python",
          starter: `class Dog:
    def __init__(self, name, age):
        # store name and age on the object (self)
        pass

    def birthday(self):
        # add 1 to this dog's age
        pass

    def describe(self):
        # return e.g. "Rex is 3 years old"
        return ""
`,
          solution: `class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def birthday(self):
        self.age += 1

    def describe(self):
        return f"{self.name} is {self.age} years old"
`,
          tests: [
            { id: "t1", description: "Dog(\"Rex\", 3) stores its name and age", assertionCode: `d = Dog("Rex", 3)\nassert getattr(d, "name", None) == "Rex" and getattr(d, "age", None) == 3, "Store them on the object: self.name = name and self.age = age"` },
            { id: "t2", description: "birthday() adds 1 to the age", assertionCode: `d = Dog("Rex", 3)\nd.birthday()\nassert getattr(d, "age", None) == 4, "After one birthday Rex should be 4"` },
            { id: "t3", description: "describe() returns \"Bella is 5 years old\"", assertionCode: `got = Dog("Bella", 5).describe()\nassert got == "Bella is 5 years old", f"Expected 'Bella is 5 years old', got {got!r}"` },
            { id: "t4", description: "Each dog keeps its own age", assertionCode: `a = Dog("A", 1)\nb = Dog("B", 7)\na.birthday()\nassert getattr(a, "age", None) == 2 and getattr(b, "age", None) == 7, "A birthday for one dog must not change another dog's age"` },
          ],
          hints: ["Inside a method, `self` is the dog. `self.age += 1` changes this dog only.", "An f-string can read attributes: `f\"{self.name} is {self.age} years old\"`."],
        },
        {
          kind: "recap",
          points: [
            "A **class** is a blueprint; an **object** (instance) is one thing built from it, with its own values.",
            "`__init__` runs when an object is created and sets its starting attributes.",
            "`self` is the object in front of the dot: `rex.birthday()` means `Dog.birthday(rex)`.",
            "Calling the class twice makes two objects. `b = a` just gives one object a second name.",
          ],
        },
      ],
    },

    // ─────────────────────────── 3 ───────────────────────────
    {
      id: "fnd-oop-3-encapsulation",
      title: "Encapsulation: guard the data",
      summary: "Pillar 1. Keep data inside the object and let only its methods change it.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "The four pillars",
          body: "Object-oriented programming rests on four ideas, known as the **four pillars**:\n\n- **Encapsulation**: an object guards its own data.\n- **Abstraction**: an object offers a simple interface and hides how it works.\n- **Inheritance**: a class can build on another class.\n- **Polymorphism**: one call can behave differently for different objects.\n\nOne lesson each, starting with encapsulation, and a bank account with no protection at all.",
        },
        {
          kind: "question",
          title: "Break the bank",
          body: "The bank has one rule: **a balance can never go below zero.** Run lines of outside code until you break it.",
          widget: { type: "oop-account", props: { mode: "open" } },
          question: { type: "widget", hint: "Run a line of outside code that takes out more than the balance.", goal: { negative: true } },
          explanation: "Nothing stopped you. `acct.balance = -999`, `withdraw(500)` and even `deposit(-40)` all go straight through, because any line anywhere in the program can change `balance`. In a 50,000-line app, good luck finding which one did it.",
        },
        {
          kind: "explain",
          title: "One door in",
          body: `**Encapsulation** means keeping an object's data inside it, and letting the outside world change that data only through methods that enforce the rules. A rule that must always hold is called an **invariant**.

~~~python
class BankAccount:
    def __init__(self, owner, balance):
        self._balance = balance      # internal

    @property
    def balance(self):               # can read, can't assign
        return self._balance

    def withdraw(self, amount):
        if amount <= 0 or amount > self._balance:
            raise ValueError("not allowed")
        self._balance -= amount
~~~

\`@property\` lets anyone *read* \`acct.balance\` but not assign to it. Changes have to go through \`deposit()\` and \`withdraw()\`, which check first.`,
        },
        {
          kind: "question",
          title: "Try to break it now",
          body: "Same account, now encapsulated. Get it to **refuse** a bad withdrawal, and **block** a direct edit.",
          widget: { type: "oop-account", props: { mode: "guarded" } },
          question: { type: "widget", hint: "Try the same bad withdrawal and the same direct edit again.", goal: { refused: 1, blocked: 1 } },
          explanation: "The rule now lives in one place, inside the class, and every change has to pass through it. Outside code can still *ask* for anything; the object decides.",
        },
        {
          kind: "question",
          title: "Where does the check live?",
          body: "Where should the \"never below zero\" check be written?",
          question: {
            type: "choice",
            options: [
              "Next to every line of code that withdraws money",
              "Inside withdraw(), the only way to change the balance",
              "In a comment that tells other developers the rule",
              "Nowhere: people should just be careful",
            ],
            answer: 1,
          },
          explanation: "Checks scattered across a program get forgotten, and the one place someone skipped becomes the bug. With encapsulation the check is written **once**, inside the object, and nobody can bypass it by accident.",
        },
        {
          kind: "question",
          title: "Python's honour system",
          body: "Python has no truly private attributes. A leading underscore, as in `_balance`, is a **convention** meaning \"internal: don't touch\". Run the underscore line and see what Python does.",
          widget: { type: "oop-account", props: { mode: "guarded", showCode: false, showUnderscore: true, actions: [{ kind: "withdraw", amount: 500 }, { kind: "set", amount: -999 }] } },
          question: { type: "widget", hint: "Run the underscore line and see that Python lets it through.", goal: { sneaky: 1 } },
          explanation: "It worked, and broke the rule. Python trusts developers: the underscore is a warning sign, not a lock. (A double underscore, `__balance`, renames the attribute to make accidents less likely, but it's still reachable.) In Python, encapsulation is a design the team respects, with tools like `@property` to back it up.",
        },
        {
          kind: "question",
          title: "Meanwhile, in Java",
          body: `Java can mark a field \`private\`:

~~~java
class BankAccount {
    private int balance;
}
~~~

Some other class writes \`acct.balance = -999;\`. What happens?`,
          question: { type: "choice", options: ["It works, just like in Python", "The program won't compile: balance is private", "It runs, but prints a warning", "Java silently ignores the line"], answer: 1 },
          explanation: "In Java, C# and C++, `private` is enforced by the compiler: code outside the class can't even mention the field. Python gets the same design from conventions (`_balance`) and properties. Same idea, different enforcement, and a good point to make in an interview.",
        },
        {
          kind: "code",
          title: "Protect the invariant",
          body: "Make the account refuse bad requests by raising `ValueError`:\n\n- `deposit()` refuses amounts that are 0 or negative.\n- `withdraw()` refuses amounts that are 0 or negative, or bigger than the balance.\n\nWatch out: without a check, `withdraw(-20)` would *add* $20.",
          language: "python",
          starter: `class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    @property
    def balance(self):
        return self._balance

    def deposit(self, amount):
        # refuse amounts that are 0 or negative
        self._balance += amount

    def withdraw(self, amount):
        # refuse amounts <= 0, and amounts bigger than the balance
        self._balance -= amount
`,
          solution: `class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self._balance = balance

    @property
    def balance(self):
        return self._balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self._balance += amount

    def withdraw(self, amount):
        if amount <= 0 or amount > self._balance:
            raise ValueError("not allowed")
        self._balance -= amount
`,
          tests: [
            { id: "t1", description: "Normal deposits and withdrawals still work", assertionCode: `a = BankAccount("Ana", 100)\na.deposit(50)\na.withdraw(30)\nassert a.balance == 120, f"100 + 50 - 30 should be 120, got {a.balance}"` },
            {
              id: "t2",
              description: "withdraw(500) on $100 raises ValueError and changes nothing",
              assertionCode: `a = BankAccount("Ana", 100)\ntry:\n    a.withdraw(500)\n    refused = False\nexcept ValueError:\n    refused = True\nassert refused, "withdraw(500) on a $100 account should raise ValueError"\nassert a.balance == 100, "A refused withdrawal must leave the balance alone"`,
            },
            {
              id: "t3",
              description: "deposit(-40) raises ValueError",
              assertionCode: `a = BankAccount("Ana", 100)\ntry:\n    a.deposit(-40)\n    refused = False\nexcept ValueError:\n    refused = True\nassert refused and a.balance == 100, "deposit(-40) should raise ValueError and leave the balance at 100"`,
            },
            {
              id: "t4",
              description: "withdraw(-20) raises ValueError (no free money)",
              assertionCode: `a = BankAccount("Ana", 100)\ntry:\n    a.withdraw(-20)\n    refused = False\nexcept ValueError:\n    refused = True\nassert refused and a.balance == 100, "withdraw(-20) should raise ValueError, not add $20"`,
            },
          ],
          hints: ["Check first, change second: `if amount <= 0: raise ValueError(\"...\")` before touching `_balance`.", "For withdraw, one condition covers both cases: `if amount <= 0 or amount > self._balance:`."],
        },
        {
          kind: "recap",
          points: [
            "**Encapsulation**: keep an object's data inside it, and let outsiders change it only through methods that check the rules.",
            "An **invariant** is a rule that must always hold, like \"balance ≥ 0\". Encapsulation puts its check in one place.",
            "In Python, `_name` means \"internal\" by convention and `@property` gives read-only access. Java and C# enforce `private` in the compiler.",
            "Encapsulation isn't \"a getter and a setter for every field\". It's about the object protecting its own rules.",
          ],
        },
      ],
    },

    // ─────────────────────────── 4 ───────────────────────────
    {
      id: "fnd-oop-4-abstraction",
      title: "Abstraction: hide the how",
      summary: "Pillar 2. A simple interface on top, the complicated machinery hidden below.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Press a button, get coffee",
          body: "You don't grind beans, heat water to 93 °C and pump it through at 9 bar. You press **latte**. That button is the **interface**: what you need to know to use the machine. The steps behind it are the **implementation**: how it works.\n\nMake a drink, then open the machine to see what you *didn't* have to do.",
          widget: { type: "oop-hood", props: { preset: "coffee" } },
        },
        {
          kind: "question",
          title: "Drive it",
          body: "Same idea in code. **Start** the car, **press the gas**, then open the hood.",
          widget: { type: "oop-hood", props: { preset: "car" } },
          question: { type: "widget", hint: "Press the three buttons in order: start, press the gas, then open the hood.", goal: { called: ["start", "press_gas"], hoodOpened: true } },
          explanation: "Your code called two methods and mentioned zero engine parts. That's **abstraction**: show callers *what* they can do and hide *how* it's done. Fewer things to know means fewer ways to get it wrong.",
        },
        {
          kind: "question",
          title: "Swap the engine",
          body: "Because callers only use the interface, the internals are free to change. **Press the gas with both engines.**",
          widget: { type: "oop-hood", props: { preset: "car", swap: true, open: true } },
          question: { type: "widget", hint: "Press the gas with the petrol engine, swap to the electric one, and press it again.", goal: { calledIn: ["petrol", "electric"], method: "press_gas" } },
          explanation: "Completely different parts, the same three buttons. Code written against `car.press_gas()` keeps working when the engine is replaced. That's how good abstractions let one team rebuild the internals without breaking everyone else's code.",
        },
        {
          kind: "explain",
          title: "Abstract classes: a written promise",
          body: `Python can write an interface down with an **abstract base class**:

~~~python
from abc import ABC, abstractmethod

class Engine(ABC):
    @abstractmethod
    def start(self): ...

    @abstractmethod
    def accelerate(self): ...

class ElectricEngine(Engine):
    def start(self):
        return "contactors closed"

    def accelerate(self):
        return "more current"
~~~

\`Engine\` says *what* every engine must offer, with no *how*. Each subclass fills in the how.`,
        },
        {
          kind: "question",
          title: "An engine of nothing",
          body: "What happens when you run `e = Engine()`?",
          question: {
            type: "choice",
            options: [
              "TypeError: Engine is abstract, so it can't be created",
              "You get an engine whose methods do nothing",
              "It works, and e.start() returns None",
              "SyntaxError, because the methods have no body",
            ],
            answer: 0,
          },
          explanation: "Python refuses: an abstract class is only a contract, so you can't create one directly. A subclass that implements every abstract method *can* be created. Forget one and you get the same TypeError, so the promise is checked for you.",
        },
        {
          kind: "question",
          title: "Abstraction or encapsulation?",
          body: "No two pillars get mixed up in interviews more often. Which of these is **abstraction**?",
          question: {
            type: "choice",
            options: [
              "Making the balance changeable only through withdraw(), so it can't go negative",
              "Offering send(message), so callers never deal with servers, retries or encryption",
              "Marking a field private so other classes can't touch it",
              "Checking an amount inside a setter before storing it",
            ],
            answer: 1,
          },
          explanation: "The other three all **protect data**: that's encapsulation. `send(message)` **hides complexity**: the caller says *what* they want and the details disappear. Abstraction is about a simple outside; encapsulation is about a guarded inside.",
        },
        {
          kind: "question",
          title: "The one-line difference",
          body: "Which summary is right?",
          question: {
            type: "choice",
            options: [
              "Abstraction hides complexity behind a simple interface; encapsulation protects an object's data by controlling access to it",
              "They're two names for the same thing",
              "Abstraction means using abstract classes; encapsulation means using classes",
              "Encapsulation hides complexity; abstraction hides data",
            ],
            answer: 0,
          },
          explanation: "They're easy to confuse because a well-built class usually does both. But they answer different questions. Abstraction: *what does the caller need to know?* Encapsulation: *who may change this data?* (Abstract classes are just one tool for abstraction. A well-named function is another.)",
        },
        {
          kind: "code",
          title: "Write the contract",
          body: "Two jobs:\n\n- Mark `Payment.pay` with `@abstractmethod`, so nobody can create a plain `Payment()`.\n- Give `CardPayment` a `pay(amount)` that returns text like `\"Paid 20 with card 4242\"`.\n\n`checkout()` only knows the interface, and that's the point.",
          language: "python",
          starter: `from abc import ABC, abstractmethod


class Payment(ABC):
    def pay(self, amount):
        pass


class CardPayment(Payment):
    def __init__(self, card):
        self.card = card

    # write pay(self, amount) here


def checkout(payment, amount):
    return payment.pay(amount)
`,
          solution: `from abc import ABC, abstractmethod


class Payment(ABC):
    @abstractmethod
    def pay(self, amount):
        pass


class CardPayment(Payment):
    def __init__(self, card):
        self.card = card

    def pay(self, amount):
        return f"Paid {amount} with card {self.card}"


def checkout(payment, amount):
    return payment.pay(amount)
`,
          tests: [
            {
              id: "t1",
              description: "Payment() can't be created",
              assertionCode: `try:\n    Payment()\n    made = True\nexcept TypeError:\n    made = False\nassert not made, "Payment() should raise TypeError: put @abstractmethod above pay"`,
            },
            { id: "t2", description: "CardPayment(\"4242\").pay(20) returns \"Paid 20 with card 4242\"", assertionCode: `got = CardPayment("4242").pay(20)\nassert got == "Paid 20 with card 4242", f"Expected 'Paid 20 with card 4242', got {got!r}"` },
            { id: "t3", description: "checkout() works through the interface", assertionCode: `got = checkout(CardPayment("1111"), 5)\nassert got == "Paid 5 with card 1111", f"checkout should return 'Paid 5 with card 1111', got {got!r}"` },
          ],
          hints: ["Put `@abstractmethod` on the line just above `def pay(self, amount):` in Payment.", "In CardPayment: `def pay(self, amount): return f\"Paid {amount} with card {self.card}\"`."],
        },
        {
          kind: "recap",
          points: [
            "**Abstraction**: offer a simple interface (the *what*) and hide the implementation (the *how*).",
            "Callers depend only on the interface, so the internals can be swapped without breaking them.",
            "An **abstract base class** (`ABC` + `@abstractmethod`) writes the interface down, and Python won't create an incomplete one.",
            "Abstraction is a simple outside (hide complexity). Encapsulation is a guarded inside (protect data).",
          ],
        },
      ],
    },

    // ─────────────────────────── 5 ───────────────────────────
    {
      id: "fnd-oop-5-inheritance",
      title: "Inheritance: is-a",
      summary: "Pillar 3. Build a class on top of another: base classes, overriding and super().",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Is-a",
          body: "**Inheritance** lets a new class build on an existing one. A Dog **is an** Animal, so `class Dog(Animal)` gets everything an Animal has for free, and only adds or changes what's different. `Animal` is the **base class** (parent); `Dog` is a **subclass** (child).\n\nTap each class. Lime tags are the class's **own** members; the rest are **inherited**.",
          widget: { type: "oop-tree", props: { classes: ANIMALS, isa: false } },
        },
        {
          kind: "question",
          title: "Find the borrower",
          body: "Which class can `fetch()` without defining `fetch()` itself? Select it.",
          widget: { type: "oop-tree", props: { classes: ANIMALS, isa: false } },
          question: { type: "widget", hint: "Find where fetch() is defined in the tree, then ask which class gets it for free from a parent.", goal: { selected: "Puppy" }, prompt: "Select the class in the tree, then check." },
          explanation: "Puppy never writes `fetch()`, but a Puppy is a Dog, so it inherits Dog's. Inheritance stacks up: Puppy also gets `eat()` and `name` from Animal, two levels up.",
        },
        {
          kind: "question",
          title: "Borrowed behaviour",
          body: `Dog doesn't define \`eat()\`. What happens?

~~~python
rex = Dog("Rex")
print(rex.eat())
~~~`,
          question: { type: "choice", options: ["It prints Rex eats", "AttributeError: Dog has no eat()", "It prints None", "It prints ..."], answer: 0 },
          explanation: "Python looks for `eat` on Dog, doesn't find it, and moves up to Animal, where it is. Inside it, `self` is still rex, so it uses Rex's name.",
        },
        {
          kind: "question",
          title: "Overriding",
          body: "A subclass can **override** a method: define its own version with the same name, which replaces the parent's for that class. Python searches the object's own class first, then its parent, then the parent's parent. Tap a member to watch the search.\n\nWhat does `Puppy(\"Bo\").speak()` return?",
          widget: { type: "oop-tree", props: { classes: ANIMALS, initial: "Puppy", isa: false } },
          question: { type: "choice", options: ["\"...\"", "\"Woof\"", "\"Yip!\"", "An error: speak() is defined in three places"], answer: 2 },
          explanation: "Python starts at Puppy, finds `speak()` right there and stops: the first match wins. Puppy's version beats Dog's and Animal's. A plain Dog still says \"Woof\", because overriding only affects the subclass.",
        },
        {
          kind: "explain",
          title: "super(): let the parent do its part",
          body: `When a subclass needs its own \`__init__\`, it should still let the parent set up the shared parts. \`super()\` gives you the parent's version:

~~~python
class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)   # Animal sets self.name
        self.breed = breed       # then Dog adds its own
~~~

You can call \`super()\` in any overriding method to *extend* the parent's behaviour instead of replacing it.`,
        },
        {
          kind: "question",
          title: "The missing super()",
          body: `Animal's \`eat()\` uses \`self.name\`. What happens?

~~~python
class Dog(Animal):
    def __init__(self, name, breed):
        self.breed = breed

rex = Dog("Rex", "collie")
print(rex.eat())
~~~`,
          question: { type: "choice", options: ["It prints Rex eats", "AttributeError: 'Dog' object has no attribute 'name'", "It prints collie eats", "TypeError: Dog() takes no arguments"], answer: 1 },
          explanation: "Dog's `__init__` replaced Animal's and never called `super().__init__(name)`, so `self.name` was never set. Overriding `__init__` and forgetting `super()` is one of the most common inheritance bugs.",
        },
        {
          kind: "question",
          title: "Is it really is-a?",
          body: "Inheritance should model an **is-a** relationship, not just borrow code. Which is a good use of it?",
          widget: { type: "oop-tree", props: { classes: [{ name: "BankAccount", members: ["balance", "deposit()", "withdraw()"] }, { name: "SavingsAccount", parent: "BankAccount", members: ["rate", "add_interest()"] }, { name: "Engine", members: ["start()"] }, { name: "Car", members: ["engine", "drive()"] }], initial: "SavingsAccount", isaPair: ["Car", "Engine"] } },
          question: {
            type: "choice",
            options: [
              "class Car(Engine), because a car needs an engine's start()",
              "class SavingsAccount(BankAccount): a savings account is a bank account that earns interest",
              "class Employee(Database), so employees can save themselves",
              "class Stack(list), just to reuse append()",
            ],
            answer: 1,
          },
          explanation: "A car **has** an engine; it isn't one. An employee isn't a database. And `Stack(list)` also inherits `insert()` and `sort()`, which let people break the stack's rules. Only SavingsAccount passes the test \"every X is a Y\", and it can stand in anywhere a BankAccount is expected. For *has-a*, use composition (two lessons from now).",
        },
        {
          kind: "code",
          title: "Write a subclass",
          body: "Write `Cat` as a subclass of `Animal`:\n\n- `__init__(self, name, indoor)` lets Animal store the name with `super()`, then stores `indoor`.\n- `speak()` overrides Animal's and returns `\"Meow\"`.\n\nDon't write `describe()`: Cat inherits it.",
          language: "python",
          starter: `class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

    def describe(self):
        return f"{self.name} says {self.speak()}"


class Cat:
    pass
`,
          solution: `class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

    def describe(self):
        return f"{self.name} says {self.speak()}"


class Cat(Animal):
    def __init__(self, name, indoor):
        super().__init__(name)
        self.indoor = indoor

    def speak(self):
        return "Meow"
`,
          tests: [
            { id: "t1", description: "Cat is a subclass of Animal", assertionCode: `assert issubclass(Cat, Animal), "Cat should inherit from Animal: class Cat(Animal):"` },
            { id: "t2", description: "Cat(\"Tom\", True) has a name and indoor", assertionCode: `c = Cat("Tom", True)\nassert getattr(c, "name", None) == "Tom", "Call super().__init__(name) so Animal stores the name"\nassert getattr(c, "indoor", None) is True, "Store indoor on the cat: self.indoor = indoor"` },
            { id: "t3", description: "Cat overrides speak() with \"Meow\"", assertionCode: `assert Cat("Tom", True).speak() == "Meow", "Cat's speak() should return 'Meow'"\nassert Animal("Generic").speak() == "...", "Don't change Animal: override speak() in Cat"` },
            { id: "t4", description: "Inherited describe() uses Cat's speak()", assertionCode: `got = Cat("Tom", False).describe()\nassert got == "Tom says Meow", f"Expected 'Tom says Meow', got {got!r}"` },
          ],
          hints: ["Start with `class Cat(Animal):`. The parent goes in the brackets.", "In `__init__`: `super().__init__(name)` first, then `self.indoor = indoor`."],
        },
        {
          kind: "recap",
          points: [
            "**Inheritance**: `class Dog(Animal)` builds on Animal. A Dog *is an* Animal and gets its attributes and methods for free.",
            "**Overriding** replaces a parent's method in the subclass. Python searches the object's class first, then up the chain.",
            "`super()` calls the parent's version, so a subclass can extend instead of replace (always in `__init__`).",
            "Use inheritance for a real *is-a* relationship, not just to reuse code.",
          ],
        },
      ],
    },

    // ─────────────────────────── 6 ───────────────────────────
    {
      id: "fnd-oop-6-polymorphism",
      title: "Polymorphism: one call, many behaviours",
      summary: "Pillar 4. The same message, sent to different objects, each answering its own way.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "One message, many answers",
          body: "**Polymorphism** (Greek for *many forms*) means one call can behave differently depending on which object receives it. The caller sends the same message, and each object answers in its own way.\n\nSend `speak()` to everyone.",
          widget: {
            type: "oop-dispatch",
            props: {
              message: "speak()",
              listName: "pets",
              varName: "p",
              objects: [
                { cls: "Dog", label: "Dog(\"Rex\")", reply: "\"Woof\"" },
                { cls: "Cat", label: "Cat(\"Tom\")", reply: "\"Meow\"" },
                { cls: "Duck", label: "Duck(\"Dot\")", reply: "\"Quack\"" },
              ],
            },
          },
        },
        {
          kind: "question",
          title: "A newcomer",
          body: "These shapes all have an `area()` method. Add a **Triangle**, a class the loop has never heard of, then send `area()` again.",
          widget: { type: "oop-dispatch", props: { message: "area()", listName: "shapes", varName: "s", objects: SHAPES, extras: [{ cls: "Triangle", label: "Triangle(4, 3)", reply: "6.0" }] } },
          question: { type: "widget", hint: "Add the Triangle class, then send area() to it just like the others.", goal: { sentKinds: ["Triangle"] } },
          explanation: "Triangle just worked. The loop never asks *what* each shape is; it trusts every shape to know its own area. New kinds of objects plug in without touching the code that uses them.",
        },
        {
          kind: "explain",
          title: "Life without it",
          body: "Here's the alternative: one `if` per type. Flip between the tabs and add both new shapes.",
          widget: {
            type: "oop-dispatch",
            props: {
              message: "area()",
              listName: "shapes",
              varName: "s",
              objects: SHAPES,
              extras: [
                { cls: "Triangle", label: "Triangle(4, 3)", reply: "6.0" },
                { cls: "Hexagon", label: "Hexagon(2)", reply: "10.39" },
              ],
              contrast: true,
            },
          },
        },
        {
          kind: "question",
          title: "One more shape",
          body: "You add a `Pentagon` class with its own `area()`. What has to change in the polymorphic loop?",
          question: { type: "choice", options: ["Add an elif for Pentagon", "Nothing", "Make Pentagon inherit from Triangle", "Rename area() to pentagon_area()"], answer: 1 },
          explanation: "Nothing. As long as Pentagon answers `area()`, the loop works. With the if-chain, you'd edit the chain, and every other place in the program that checks types. That's the payoff: code that's **open to new types without being edited**.",
        },
        {
          kind: "question",
          title: "Say it precisely",
          body: "Interviewers hear a lot of vague answers here. Which one describes polymorphism?",
          question: {
            type: "choice",
            options: [
              "Having many different classes in a program",
              "Code calls one method name, and each object runs its own version of it",
              "One class inheriting from several parents",
              "An object changing its class while the program runs",
            ],
            answer: 1,
          },
          explanation: "Lots of classes alone isn't polymorphism, and inheriting from several parents is *multiple inheritance*. Polymorphism is about the **call**: one interface (`area()`, `speak()`) with many implementations, and the object picks which one runs.",
        },
        {
          kind: "question",
          title: "Duck typing",
          body: `\`Pizza\` isn't a shape and inherits from nothing. What happens?

~~~python
class Pizza:
    def __init__(self, r):
        self.r = r

    def area(self):
        return 3.14 * self.r ** 2

for s in [Square(2), Pizza(10)]:
    print(s.area())
~~~`,
          question: { type: "choice", options: ["TypeError: Pizza is not a Shape", "It prints 4 and then 314.0", "It prints 4 and then None", "It only works if Pizza inherits from Square"], answer: 1 },
          explanation: "Python doesn't check family trees, only whether the method exists: if it walks like a duck and quacks like a duck, it's a duck. That's **duck typing**. Java or C# would need Pizza to declare a shared interface first; Python just makes the call.",
        },
        {
          kind: "question",
          title: "Overriding or overloading?",
          body: "Two words that sound alike. `Dog.speak()` replacing `Animal.speak()`, with the same name and the same parameters, in a subclass. What's that called?",
          question: { type: "choice", options: ["Overriding", "Overloading", "Encapsulation", "Composition"], answer: 0 },
          explanation: "**Overriding**: a subclass replaces a parent's method, and it's what powers polymorphism. **Overloading**: one class has several methods with the same name but different parameters, like Java's `add(int, int)` and `add(double, double)`. Python doesn't do classic overloading: a second `def area` simply replaces the first, so Python code uses default arguments instead.",
        },
        {
          kind: "code",
          title: "Make them polymorphic",
          body: "- Give `Circle` an `area()` method (use 3.14 for pi).\n- Write `total_area(shapes)`, which adds up `area()` for every shape. No `if`, no `isinstance`: just ask each shape.",
          language: "python",
          starter: `class Square:
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side * self.side


class Circle:
    def __init__(self, radius):
        self.radius = radius

    # give Circle an area() method too


def total_area(shapes):
    # add up shape.area() for every shape
    return 0
`,
          solution: `class Square:
    def __init__(self, side):
        self.side = side

    def area(self):
        return self.side * self.side


class Circle:
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return 3.14 * self.radius ** 2


def total_area(shapes):
    return sum(shape.area() for shape in shapes)
`,
          tests: [
            { id: "t1", description: "Circle(10).area() is 314.0", assertionCode: `assert hasattr(Circle(1), "area"), "Circle needs an area() method"\nassert abs(Circle(10).area() - 314.0) < 1e-6, f"3.14 * 10 ** 2 should be 314.0, got {Circle(10).area()}"` },
            { id: "t2", description: "total_area([Square(2), Circle(1)]) is 7.14", assertionCode: `got = total_area([Square(2), Circle(1)])\nassert abs(got - 7.14) < 1e-6, f"4 + 3.14 should be 7.14, got {got}"` },
            { id: "t3", description: "Works for any object with area() (duck typing)", assertionCode: `class Rug:\n    def area(self):\n        return 6\n\ngot = total_area([Rug(), Square(1)])\nassert abs(got - 7) < 1e-6, f"total_area should just call area() on each item; got {got}"` },
          ],
          hints: ["`return 3.14 * self.radius ** 2` inside Circle's `area(self)`.", "`sum(shape.area() for shape in shapes)` does the whole loop, or use a for loop and a running total."],
        },
        {
          kind: "recap",
          points: [
            "**Polymorphism**: one call, many behaviours. Each object runs its own version of the method.",
            "The caller doesn't check types, so new classes plug in without editing it: no growing `if` chains.",
            "Python uses **duck typing**: any object with the right method works, shared parent or not.",
            "**Overriding** = a subclass replaces a parent's method. **Overloading** = same name, different parameters (not really a Python thing).",
          ],
        },
      ],
    },

    // ─────────────────────────── 7 ───────────────────────────
    {
      id: "fnd-oop-7-composition",
      title: "Composition over inheritance",
      summary: "Has-a beats is-a more often than you'd think. Build objects from swappable parts.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Has-a",
          body: "Inheritance says **is-a**. **Composition** says **has-a**: build an object out of other objects (its parts), and let it hand the work to them. A hero *has* a weapon and *has* a way of moving.\n\nSwap the parts and try both methods.",
          widget: { type: "oop-compose", props: HERO },
        },
        {
          kind: "question",
          title: "Count the classes",
          body: "Now do it with inheritance alone: one subclass for each combination (SwordWalker, BowFlyer, StaffSwimmer…). With 3 weapons and 3 ways to move, how many hero subclasses do you need?",
          question: { type: "number", hint: "Inheritance needs one subclass for every pairing of a weapon with a way of moving.", answer: 9, unit: "classes" },
          explanation: "3 × 3 = **9**, and a fourth weapon makes it 12. With composition you write each part once: 3 + 3 = 6 small classes, and a new weapon is one more class. Combinations multiply; parts just add up.",
        },
        {
          kind: "question",
          title: "Build to order",
          body: "Build a hero that **flies** and fights with a **bow**, then attack.",
          widget: { type: "oop-compose", props: { ...HERO, showCount: true } },
          question: { type: "widget", hint: "Choose the bow and the flying parts, then press attack.", goal: { parts: { weapon: "bow", mover: "fly" }, called: "attack" } },
          explanation: "You changed the hero's behaviour while it was running, just by swapping a part. `hero.attack()` itself never changed: it always asks `self.weapon` to do the work. Handing work to a part like that is called **delegation**.",
        },
        {
          kind: "explain",
          title: "When inheritance hurts",
          body: `Family trees look tidy until reality disagrees:

~~~python
class Drive:
    def read(self):
        return "bytes from disk"

    def write(self, data):
        return "saved " + data

class ReadOnlyDrive(Drive):   # a read-only drive is a drive...
    pass

ReadOnlyDrive().write("report")   # ...which now claims it can save
~~~

Every Drive gets \`write()\`, including the ones that can't. And any change to a base class ripples into every subclass, wanted or not. This is the **fragile base class** problem.`,
        },
        {
          kind: "question",
          title: "Fix the read-only drive",
          body: "What's the cleanest fix?",
          question: {
            type: "choice",
            options: [
              "Override write() in ReadOnlyDrive to raise an error",
              "Give drives a list of abilities: a ReadOnlyDrive has Read, a DiskDrive has Read and Write",
              "Delete write() from Drive and paste a copy into every drive that can save",
              "Make ReadOnlyDrive inherit from Printer instead",
            ],
            answer: 1,
          },
          explanation: "Raising an error works, but breaks every piece of code that trusted \"every drive can write\". Copy-pasting duplicates code. A list of abilities says exactly what's true about each drive, instead of forcing one family tree to fit every case.",
        },
        {
          kind: "question",
          title: "Is-a or has-a?",
          body: "Which pairs are **has-a** (composition) rather than is-a?",
          question: { type: "choice", options: ["Car and Engine", "Manager and Employee", "Order and its list of Items", "Circle and Shape", "Computer and Keyboard"], answer: [0, 2, 4] },
          explanation: "A car has an engine, an order has items, a computer has a keyboard. A manager **is an** employee and a circle **is a** shape, so inheritance fits those. Quick test: say \"X is a Y\" out loud. If it sounds wrong, use composition.",
        },
        {
          kind: "explain",
          title: "Composition in code",
          body: `~~~python
class Car:
    def __init__(self, engine):
        self.engine = engine          # has-a

    def start(self):
        return self.engine.start()    # delegate the work

car = Car(PetrolEngine())
car.engine = ElectricEngine()         # swap a part at runtime
~~~

The rule of thumb **"favour composition over inheritance"** doesn't ban inheritance. It says: reach for parts first, and save inheritance for a true is-a.`,
        },
        {
          kind: "code",
          title: "Give the car an engine",
          body: "Finish `Car`:\n\n- Keep the engine as an attribute called `engine` (has-a).\n- `start()` hands the job to the engine and returns what it says.\n\nThen any engine works, even one written after `Car`.",
          language: "python",
          starter: `class PetrolEngine:
    def start(self):
        return "Vroom"


class ElectricEngine:
    def start(self):
        return "Hum"


class Car:
    def __init__(self, engine):
        # keep the engine as part of the car
        pass

    def start(self):
        # hand the job to the engine
        return ""
`,
          solution: `class PetrolEngine:
    def start(self):
        return "Vroom"


class ElectricEngine:
    def start(self):
        return "Hum"


class Car:
    def __init__(self, engine):
        self.engine = engine

    def start(self):
        return self.engine.start()
`,
          tests: [
            { id: "t1", description: "Car(PetrolEngine()).start() returns \"Vroom\"", assertionCode: `got = Car(PetrolEngine()).start()\nassert got == "Vroom", f"Expected 'Vroom', got {got!r}"` },
            { id: "t2", description: "Swapping car.engine changes what start() does", assertionCode: `car = Car(PetrolEngine())\ncar.engine = ElectricEngine()\ngot = car.start()\nassert got == "Hum", f"After swapping in an ElectricEngine, start() should return 'Hum', got {got!r}"` },
            { id: "t3", description: "A brand-new engine works without changing Car", assertionCode: `class HydrogenEngine:\n    def start(self):\n        return "Whoosh"\n\ngot = Car(HydrogenEngine()).start()\nassert got == "Whoosh", f"Car should delegate to any engine; got {got!r}"` },
          ],
          hints: ["`self.engine = engine` in `__init__`.", "`start()` is one line: `return self.engine.start()`."],
        },
        {
          kind: "recap",
          points: [
            "**Composition**: build objects from parts (*has-a*) and **delegate** work to them.",
            "Parts can be swapped while the program runs; an inheritance tree is fixed when you write it.",
            "Combinations multiply with inheritance (3 × 3 = 9 classes) but add up with composition (3 + 3 = 6).",
            "Deep hierarchies are fragile. Favour composition, and keep inheritance for a true *is-a*.",
          ],
        },
      ],
    },

    // ─────────────────────────── 8 ───────────────────────────
    {
      id: "fnd-oop-8-pillars",
      title: "The four pillars, side by side",
      summary: "Interview practice: one-sentence definitions, spot-the-pillar and the classic wrong answers.",
      minutes: 8,
      xp: 70,
      steps: [
        {
          kind: "explain",
          title: "Four sentences to remember",
          body: "When someone asks \"what are the four pillars of OOP?\", give the name, one sentence and an example:\n\n- **Encapsulation**: an object keeps its data inside and changes it only through its own methods, so its rules always hold. *A bank account that can't go negative.*\n- **Abstraction**: expose a simple interface and hide how it works. *`car.press_gas()`, not fuel injectors.*\n- **Inheritance**: a class builds on another, in an *is-a* relationship. *`class Dog(Animal)`.*\n- **Polymorphism**: one call, different behaviour for each object. *`shape.area()` for circles and squares.*",
        },
        {
          kind: "question",
          title: "Interview question 1",
          body: "\"What is encapsulation?\" Pick the strongest answer.",
          question: {
            type: "choice",
            options: [
              "Hiding complexity behind a simple interface",
              "Bundling data with the methods that use it, and restricting direct access so the object can protect its own rules",
              "Writing a getter and a setter for every field",
              "Putting your code inside a class",
            ],
            answer: 1,
          },
          explanation: "The first option is abstraction: the classic swap. A getter and setter for every field is a *mechanism*, and it can defeat the purpose: a setter that accepts anything protects nothing. The right answer names the data, the access control *and* why it matters.",
        },
        {
          kind: "question",
          title: "Spot the pillar",
          body: "Classify each snippet. A wrong pick tells you why.",
          widget: {
            type: "oop-spot",
            props: {
              items: [
                {
                  code: `class Thermostat:
    def __init__(self):
        self._target = 20

    def set_target(self, degrees):
        if not 5 <= degrees <= 30:
            raise ValueError("out of range")
        self._target = degrees`,
                  answer: "Encapsulation",
                  why: "The target is internal (`_target`) and only changes through set_target(), which enforces the 5 to 30 rule.",
                  hints: { Abstraction: "There's a simple method here, but the point is the rule guarding _target. Hiding complexity is abstraction; guarding data is encapsulation." },
                },
                {
                  code: `class Vehicle:
    def __init__(self, wheels):
        self.wheels = wheels

class Bike(Vehicle):
    def __init__(self):
        super().__init__(2)`,
                  answer: "Inheritance",
                  why: "Bike(Vehicle) builds on Vehicle and reuses its setup through super(). A bike is a vehicle.",
                },
                {
                  code: `for n in [EmailNotifier(), SmsNotifier(), PushNotifier()]:
    n.send("Your order shipped")`,
                  answer: "Polymorphism",
                  why: "One call, send(), and each notifier delivers in its own way. The loop never checks which kind it has.",
                  hints: { Inheritance: "These classes may well share a parent, but nothing here shows it. What the code shows is one call behaving three ways." },
                },
                {
                  code: `def upload(path):
    # chunking, retries, auth: all handled here
    ...

upload("photo.jpg")`,
                  answer: "Abstraction",
                  why: "The caller says what they want (upload this file) and every detail of how stays hidden.",
                  hints: { Encapsulation: "Nothing is being protected from changes here; complexity is being hidden. That's abstraction." },
                },
              ],
            },
          },
          question: { type: "widget", hint: "Ask what the snippet does: hide data, hide complexity, reuse a parent or work with many types.", goal: {}, prompt: "Get all four right, then check." },
          explanation: "Guarded data → encapsulation. A class built on a parent → inheritance. One call, many behaviours → polymorphism. A simple call hiding a lot of work → abstraction.",
        },
        {
          kind: "question",
          title: "Trickier ones",
          body: "Real code mixes pillars. Pick the **main** idea of each snippet.",
          widget: {
            type: "oop-spot",
            props: {
              prompt: "What's the main idea?",
              items: [
                {
                  code: `class Storage(ABC):
    @abstractmethod
    def save(self, key, data): ...`,
                  answer: "Abstraction",
                  why: "Storage defines what any storage must do, save(), with no how at all. Abstract base classes are a tool for abstraction.",
                  hints: { Inheritance: "Subclasses will inherit from it, but this class itself is defining an interface: the what, not the how." },
                },
                {
                  code: `class Order:
    def __init__(self):
        self._items = []

    def add(self, item):
        if item.price < 0:
            raise ValueError("no negative prices")
        self._items.append(item)`,
                  answer: "Encapsulation",
                  why: "The list is internal (`_items`), and the only way in is add(), which refuses bad items.",
                },
                {
                  code: `class Report:
    def render(self):
        return "plain text"

class HtmlReport(Report):
    def render(self):
        return "<h1>Report</h1>"

def show(report):
    print(report.render())`,
                  answer: "Polymorphism",
                  why: "show() calls render() without knowing which kind of report it got, and each kind renders itself. Overriding is what makes that work.",
                  hints: { Inheritance: "There is inheritance here, but look at show(): it calls render() without knowing which report it has. That one-call-many-behaviours idea is the point." },
                },
                {
                  code: `class Admin(User):
    def can_delete(self):
        return True`,
                  answer: "Inheritance",
                  why: "An Admin is a User: it inherits everything a user has and adds can_delete().",
                  hints: { Polymorphism: "If can_delete() were called across a mix of users and admins, that would be polymorphism. This code is about Admin building on User." },
                },
              ],
            },
          },
          question: { type: "widget", hint: "Pick the idea the snippet depends on most, even when others also appear.", goal: {}, prompt: "Get all four right, then check." },
          explanation: "When code shows several pillars, ask *what's the point of this snippet?* An abstract class is about the interface. A guarded list is about protecting data. A function calling one method on any report is about polymorphism.",
        },
        {
          kind: "question",
          title: "Interview question 2",
          body: "A candidate says: \"Inheritance is for reusing code.\" What's missing?",
          question: {
            type: "choice",
            options: [
              "Nothing, that's the full definition",
              "It should model an is-a relationship; for reuse alone, composition is usually better",
              "Inheritance only works with abstract classes",
              "Modern Python has deprecated inheritance",
            ],
            answer: 1,
          },
          explanation: "Reuse is a side effect, not the purpose. `class Car(Engine)` reuses code too, and it's wrong. A strong answer: \"Inheritance models *is-a*: a subclass can be used anywhere its parent is expected. If I only want to reuse behaviour, I use composition.\"",
        },
        {
          kind: "question",
          title: "Interview question 3",
          body: "`notify(user)` works for email, SMS and push notifiers without a single `if`. Which pillar makes that possible?",
          question: { type: "choice", options: ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism"], answer: 3 },
          explanation: "Each notifier runs its own `send()` behind one call: polymorphism. Inheritance or a shared interface often *enables* it, which is why people pick it, but the behaviour described, the same call giving different results, is polymorphism.",
        },
        {
          kind: "question",
          title: "All in one",
          body: `Which pillars appear in this code?

~~~python
class Shape(ABC):
    @abstractmethod
    def area(self): ...

class Circle(Shape):
    def __init__(self, r):
        if r <= 0:
            raise ValueError("radius must be positive")
        self._r = r

    def area(self):
        return 3.14 * self._r ** 2

shapes = [Circle(1), Square(2)]
print(sum(s.area() for s in shapes))
~~~`,
          question: { type: "choice", options: ["Encapsulation", "Abstraction", "Inheritance", "Polymorphism"], answer: [0, 1, 2, 3] },
          explanation: "All four, which is normal in real code. **Abstraction**: Shape declares `area()` with no how. **Inheritance**: `Circle(Shape)`. **Encapsulation**: `_r` is internal and the constructor refuses a bad radius. **Polymorphism**: `s.area()` runs each shape's own version.",
        },
        {
          kind: "recap",
          title: "Your interview answer",
          points: [
            "**Encapsulation**: guard the data; outsiders go through methods that keep the rules. *A bank account.*",
            "**Abstraction**: a simple interface over hidden complexity. *Car pedals.*",
            "**Inheritance**: build on a parent class for a true *is-a*. *`Dog(Animal)`.*",
            "**Polymorphism**: one call, each object's own behaviour. *`shape.area()`.*",
            "The formula: name it, one sentence, one example, and why it helps.",
          ],
        },
      ],
    },

    // ─────────────────────────── 9 ───────────────────────────
    {
      id: "fnd-oop-9-solid",
      title: "SOLID in plain words",
      summary: "Five rules of thumb for good classes, and the bridge to design patterns.",
      minutes: 6,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Five rules of thumb",
          body: "The pillars are what OOP *can* do. **SOLID** is five guidelines for doing it well, gathered by Robert C. Martin. In plain words:\n\n- **S**ingle responsibility: a class has one job, so it has one reason to change.\n- **O**pen/closed: add new behaviour by adding code, not by editing code that works.\n- **L**iskov substitution: a subclass must work anywhere its parent does.\n- **I**nterface segregation: don't force classes to implement methods they don't need.\n- **D**ependency inversion: depend on an interface you're handed, not a concrete class you build inside.",
        },
        {
          kind: "question",
          title: "Too many jobs",
          body: `A new email provider, a new PDF layout or a new database: each one means editing \`Invoice\`. Which principle does it break?

~~~python
class Invoice:
    def total(self): ...
    def to_pdf(self): ...
    def email_to_customer(self): ...
    def save_to_database(self): ...
~~~`,
          question: { type: "choice", options: SOLID, answer: 0 },
          explanation: "Four jobs, four reasons to change. Split it up: Invoice does the maths, and separate classes handle the PDF, the email and the storage.",
        },
        {
          kind: "question",
          title: "Edit, edit, edit",
          body: `Which principle does this break?

~~~python
def area(shape):
    if shape.kind == "circle": ...
    elif shape.kind == "square": ...
    # every new shape: edit this function again
~~~`,
          question: { type: "choice", options: SOLID, answer: 1 },
          explanation: "Every new shape means editing working code. Polymorphism fixes it: give each shape its own `area()`, and new shapes become additions instead of edits. You built exactly that in the polymorphism lesson.",
        },
        {
          kind: "question",
          title: "The drive that can't",
          body: "Code that takes any `Drive` and calls `write()` crashes when it's handed a `ReadOnlyDrive(Drive)` whose `write()` raises an error. Which principle is broken?",
          question: { type: "choice", options: SOLID, answer: 2 },
          explanation: "A subclass must keep its parent's promises. If a ReadOnlyDrive can't do what every Drive does, it shouldn't be a Drive subclass in this design. That's a sign to reach for composition.",
        },
        {
          kind: "question",
          title: "The fat interface",
          body: `A basic printer has to implement \`scan()\` and \`fax()\` just so it can raise errors from them. Which principle is broken?

~~~python
class Machine(ABC):
    @abstractmethod
    def print(self, doc): ...

    @abstractmethod
    def scan(self, doc): ...

    @abstractmethod
    def fax(self, doc): ...
~~~`,
          question: { type: "choice", options: SOLID, answer: 3 },
          explanation: "Split the fat interface into small ones (Printer, Scanner, Fax), so each class only promises what it can actually do.",
        },
        {
          kind: "question",
          title: "Built in, stuck in",
          body: `You can't test \`OrderService\` without a real MySQL server running. Which principle is broken?

~~~python
class OrderService:
    def __init__(self):
        self.db = MySQLDatabase()   # built right here
~~~`,
          question: { type: "choice", options: SOLID, answer: 4 },
          explanation: "Hand the storage in instead: `OrderService(storage)`, where storage is anything with `save()`. Tests can pass a fake, and switching databases never touches OrderService. Abstraction and polymorphism are doing the heavy lifting again.",
        },
        {
          kind: "question",
          title: "Mixed review",
          body: "Which principle is each sentence about?",
          widget: {
            type: "oop-spot",
            props: {
              prompt: "Which principle?",
              options: SOLID,
              optionHints: {
                "Single responsibility": "That one is about a class doing too many jobs. Count this class's reasons to change.",
                "Open/closed": "That one is about adding features without editing code that already works.",
                "Liskov substitution": "That one is about a subclass keeping its parent's promises.",
                "Interface segregation": "That one is about interfaces stuffed with methods some classes don't need.",
                "Dependency inversion": "That one is about receiving what you depend on instead of building it inside.",
              },
              items: [
                { text: "A UserManager class validates passwords, sends welcome emails and writes log files.", answer: "Single responsibility", why: "Three jobs in one class: a change to email, logging or password rules all land here." },
                { text: "To support PayPal you add a PayPalPayment class. The checkout code doesn't change at all.", answer: "Open/closed", why: "That's open/closed working as intended: extended by adding a class, with no edits to working code." },
                { text: "ReadOnlyList(list) raises an error from append(), so code that expects a normal list breaks.", answer: "Liskov substitution", why: "It can't stand in for its parent: anything expecting a list may call append()." },
                { text: "ReportService receives any Exporter in its constructor instead of creating a CsvExporter itself.", answer: "Dependency inversion", why: "It depends on an interface it's handed, so any exporter, or a fake one in tests, can be plugged in." },
              ],
            },
          },
          question: { type: "widget", goal: {}, prompt: "Get all four right, then check." },
          explanation: "Notice how often the fix is a pillar: polymorphism for open/closed, composition for Liskov problems, abstraction for dependency inversion. Design patterns, next, are proven recipes built from exactly these moves.",
        },
        {
          kind: "recap",
          points: [
            "**S**: one class, one job. **O**: extend by adding code, not editing it.",
            "**L**: a subclass must work wherever its parent does. **I**: keep interfaces small and focused.",
            "**D**: depend on interfaces handed to you, not concrete classes built inside.",
            "SOLID is the four pillars used well, and the bridge to design patterns.",
          ],
        },
      ],
    },
  ],
};
