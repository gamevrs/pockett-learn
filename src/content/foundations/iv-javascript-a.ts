import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced JavaScript block for lesson prose. */
const js = (code: string) => "~~~js\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (timelines). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

// ── trace data ──
const COUNTER_CODE = ["function makeCounter() {", "  let count = 0", "  return () => ++count", "}", "const a = makeCounter()", "const b = makeCounter()", "a(); a(); b()"];
const SCOPES = [
  { id: "g", label: "global" },
  { id: "sa", label: "count (a)", parent: "g" },
  { id: "sb", label: "count (b)", parent: "g" },
];

const THIS_CODE = [
  '"use strict"',
  'const cat = { name: "cat", who() { return this } }',
  'const dog = { name: "dog" }',
  "cat.who()",
  "cat.who.call(dog)",
  "const w = cat.who; w()",
  "cat.who.bind(dog).call(cat)",
];

const REDUCE_CODE = ["let acc = arr[0]          (no initial value)", "for i from 1 to arr.length - 1:", "    acc = fn(acc, arr[i], i, arr)", "return acc"];

const FIB_TREE = [
  { id: "5", label: "5" },
  { id: "4", label: "4", parent: "5", side: "L" as const },
  { id: "3r", label: "3", parent: "5", side: "R" as const },
  { id: "3", label: "3", parent: "4", side: "L" as const },
  { id: "2r", label: "2", parent: "4", side: "R" as const },
  { id: "2", label: "2", parent: "3", side: "L" as const },
  { id: "1r", label: "1", parent: "3", side: "R" as const },
  { id: "1", label: "1", parent: "2", side: "L" as const },
  { id: "0", label: "0", parent: "2", side: "R" as const },
];
const MEMO_CODE = ["def fib(n):", "    if n < 2: return n", "    if n in memo: return memo[n]", "    memo[n] = fib(n - 1) + fib(n - 2)", "    return memo[n]"];

const CALLS = [0, 50, 80, 150, 400];

export const javascriptLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Closures ───────────────────────────────
  {
    id: "fnd-iv-javascript-1-closures",
    title: "Closures and counters",
    summary: "Functions that remember the variables around them: private state, factories and run-once wrappers.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A function with a backpack",
        body:
          "A **closure** is a function together with the variables that were in scope where it was created. The function keeps those variables alive and can read and change them later, even after the outer function has returned.\n\n" +
          js(`
function makeCounter() {
  let count = 0;              // lives on after makeCounter returns
  return () => ++count;
}
const next = makeCounter();
next(); // 1
next(); // 2
`) +
          "\nEach call to `makeCounter` creates a **new** `count`, so two counters never share state. Nobody outside can touch `count` except through the returned function: that is how JavaScript does **private state** without classes.\n\n" +
          "A closure captures the **variable**, not a copy of its value. If the variable changes, the closure sees the new value.\n\n" +
          "Elsewhere: Python closures work the same way (use `nonlocal` to assign); Java lambdas may only capture variables that never change (*effectively final*); Go closures capture variables too, and since Go 1.22 each loop iteration gets its own loop variable.\n\n" +
          "**How to spot it:** *counter*, *private*, *remember between calls*, *factory*, *run only once*, *what does this loop print?*",
      },
      {
        kind: "question",
        title: "Whose count is it?",
        body: "Step through two counters made by the same factory. Each tree node is a scope; tap the scope whose `count` changes.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Two closures, two scopes",
            frames: [
              { tree: { nodes: [SCOPES[0]], active: ["g"] }, code: COUNTER_CODE, line: 5, vars: { "a's count": "-", "b's count": "-" }, note: "The script runs in the global scope." },
              { tree: { nodes: SCOPES.slice(0, 2), active: ["sa"] }, line: 2, vars: { "a's count": 0, "b's count": "-" }, note: "`makeCounter()` runs and creates a scope with its own `count = 0`. The arrow it returns, now called `a`, keeps that scope alive." },
              { tree: { nodes: SCOPES, active: ["sb"] }, line: 6, vars: { "a's count": 0, "b's count": 0 }, note: "The second call creates a **second** scope with another `count`. That one belongs to `b`." },
              { tree: { active: [] }, line: 7, note: "Now `a()` runs.", pick: { prompt: "Which scope's `count` goes up?", answer: "sa" } },
              { tree: { active: ["sa"] }, line: 7, vars: { "a's count": 2, "b's count": 0 }, note: "Both `a()` calls bump the `count` in a's scope: 1, then 2." },
              { tree: { active: [] }, line: 7, note: "Now `b()` runs.", pick: { prompt: "Which scope's `count` goes up?", answer: "sb" } },
              { tree: { active: ["sb"] }, line: 7, vars: { "a's count": 2, "b's count": 1 }, note: "`b()` returns 1. The two counters are completely separate, and nothing else can reach either `count`." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A closure uses the scope from the call that created it." },
        explanation: "Every call of `makeCounter` makes a fresh scope. A closure is tied to the scope it was born in, so `a` and `b` each have their own private `count`.",
      },
      {
        kind: "question",
        title: "The classic loop",
        body: "What does this print?\n\n" + js(`
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
`),
        question: {
          type: "choice",
          options: ["0 1 2", "3 3 3", "2 2 2", "undefined undefined undefined"],
          answer: 1,
          feedback: {
            0: "That is what `let i` prints. With `var` there is a single `i` for the whole loop.",
            2: "The loop stops when `i < 3` fails, so `i` has gone one step further than 2.",
            3: "`i` is defined: every arrow sees the same variable, which exists after the loop too.",
          },
          hint: "The timers run after the loop has finished. How many `i` variables are there with `var`?",
        },
        explanation: "`var` makes **one** `i` for the whole function. The arrows capture that variable, and by the time the timers run the loop has left it at 3. With `let`, each iteration gets its own `i`, so it prints 0 1 2.",
      },
      {
        kind: "question",
        title: "Counting calls",
        body: "With the `makeCounter` from the first step, find what the last line returns.\n\n" + js(`
const c = makeCounter();
c(); c();
const d = makeCounter();
d();
c();
`),
        question: { type: "number", answer: 3, hint: "`d` has its own count; only calls of `c` move c's count." },
        explanation: "`c` has been called three times, so its count is **3**. Making `d` and calling it changes only d's own count.",
      },
      {
        kind: "code",
        title: "A counter with private state",
        body:
          "Write `makeCounter(start = 0)`. It returns an object with four methods:\n\n" +
          "- `increment()` adds 1 and returns the new value;\n- `decrement()` takes 1 off and returns the new value;\n- `reset()` goes back to `start`;\n- `value()` returns the current value.\n\n" +
          "Keep the count in a closure variable, not as a property of the object, so nothing outside can change it.",
        language: "javascript",
        starter: `function makeCounter(start = 0) {
  return {
    increment() {},
    decrement() {},
    reset() {},
    value() {
      return start;
    },
  };
}
`,
        solution: `function makeCounter(start = 0) {
  let count = start;
  return {
    increment() {
      return ++count;
    },
    decrement() {
      return --count;
    },
    reset() {
      count = start;
    },
    value() {
      return count;
    },
  };
}
`,
        tests: [
          { id: "t1", description: "counts up and down", assertionCode: 'const c = makeCounter();\nassertEqual([c.increment(), c.increment(), c.decrement()], [1, 2, 1], "increment and decrement return the new value");\nassertEqual(c.value(), 1, "value() after +1 +1 -1");' },
          { id: "t2", description: "counters are independent", assertionCode: 'const a = makeCounter(10), b = makeCounter();\na.increment();\nb.decrement();\nassertEqual([a.value(), b.value()], [11, -1], "Each counter has its own count: a starts at 10, b at 0");' },
          { id: "t3", description: "reset goes back to start", assertionCode: 'const c = makeCounter(3);\nc.increment();\nc.increment();\nassertEqual(c.value(), 5, "3 + 1 + 1");\nc.reset();\nassertEqual(c.value(), 3, "reset() goes back to the start value");\nassertEqual(c.increment(), 4, "and counting goes on from there");' },
          {
            id: "t4",
            description: "the count is private",
            assertionCode: 'const c = makeCounter(5);\nc.increment();\nassertEqual(c.value(), 6, "5 + 1");\nassert(Object.values(c).every((v) => typeof v === "function"), "The object should only hold the four methods; keep the count in a variable inside makeCounter");',
          },
        ],
        hints: ["Declare `let count = start;` inside `makeCounter`, before the `return`.", "Every method uses that same `count`: `return ++count;`, `count = start;` and so on."],
      },
      {
        kind: "code",
        title: "Run only once",
        body:
          "Write `once(fn)`. It returns a new function that calls `fn` **the first time only**, passing along its arguments and its `this`, and returns `fn`'s result. Every later call returns that same first result without calling `fn` again.\n\n" +
          js(`
const init = once(() => { console.log("setting up"); return 42; });
init(); // prints "setting up", returns 42
init(); // returns 42, prints nothing
`),
        language: "javascript",
        starter: `function once(fn) {
  return function (...args) {
    // call fn the first time only; always return its first result
  };
}
`,
        solution: `function once(fn) {
  let done = false;
  let result;
  return function (...args) {
    if (!done) {
      done = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
`,
        tests: [
          { id: "t1", description: "calls fn only once", assertionCode: 'let calls = 0;\nconst f = once(() => ++calls);\nassertEqual([f(), f(), f()], [1, 1, 1], "Every call returns the first result");\nassertEqual(calls, 1, "fn runs only the first time");' },
          { id: "t2", description: "passes the arguments of the first call", assertionCode: 'let calls = 0;\nconst add = once((a, b) => { calls++; return a + b; });\nassertEqual(add(2, 3), 5, "The first call adds its arguments");\nassertEqual(add(10, 20), 5, "Later calls ignore their arguments and return the first result");\nassertEqual(calls, 1, "fn runs once");' },
          {
            id: "t3",
            description: "keeps this",
            assertionCode: 'let calls = 0;\nconst shop = { rate: 2, price: once(function (x) { calls++; return this.rate * x; }) };\nassertEqual(shop.price(5), 10, "Called as shop.price(5), fn should see this === shop");\nassertEqual(shop.price(7), 10, "The second call returns the first result");\nassertEqual(calls, 1, "fn runs once");',
          },
          { id: "t4", description: "remembers a falsy first result", assertionCode: 'let calls = 0;\nconst f = once(() => { calls++; return 0; });\nf();\nf();\nassertEqual(f(), 0, "The first result was 0");\nassertEqual(calls, 1, "A result of 0 still counts as done: use a separate flag, not the result itself");' },
        ],
        hints: ["Keep two closure variables: a `done` flag and the saved `result`.", "Use `fn.apply(this, args)` inside a `function` (not an arrow) so `this` passes through."],
      },
      {
        kind: "recap",
        points: [
          "A **closure** is a function plus the variables in scope where it was made; it keeps them alive.",
          "Each call of a factory creates fresh variables, so every closure it returns has its own state.",
          "Closures capture **variables**, not values: `var` in a loop is one shared variable, `let` gives one per iteration.",
          "Private state, counters, `once`, memoize and debounce are all closures over a little bit of state.",
          "Track \"already done\" with its own flag, so falsy results like 0 still count.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. this, call, apply, bind ───────────────────────────────
  {
    id: "fnd-iv-javascript-2-this",
    title: "this, call, apply and bind",
    summary: "The four rules that decide what this is, arrow functions, and writing bind yourself.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Decided by the call, not the definition",
        body:
          "In most languages `this` is simply the object a method belongs to. In JavaScript, `this` is decided **each time a function is called**, by how it is called. Four rules, strongest first:\n\n" +
          "1. **`new`**: `new Point()` makes a fresh object and that is `this`.\n" +
          "2. **Explicit**: `f.call(obj, a, b)`, `f.apply(obj, [a, b])`, or a function made by `f.bind(obj)`. A bound function keeps its `this` even if you later use `call` on it.\n" +
          "3. **Method call**: `obj.f()` sets `this` to `obj`, the thing before the dot.\n" +
          "4. **Plain call**: `f()` gives `undefined` in strict mode (classes, ES modules, files starting with `\"use strict\"`), or the global object in old-style scripts.\n\n" +
          "**Arrow functions** have no `this` of their own; they use the `this` of the code around them. That makes them good callbacks inside methods, and bad methods.\n\n" +
          js(`
const player = {
  name: "Ada",
  hello() { return "hi " + this.name; },
};
const f = player.hello;
f();                 // plain call: this is undefined (strict), so it breaks
player.hello();      // "hi Ada"
setTimeout(player.hello, 0);       // loses this, same as f()
setTimeout(() => player.hello(), 0); // fine
`) +
          "\nCompare: Python passes `self` explicitly and `obj.method` is already bound to `obj`; in Java and C# `this` is always the instance; Go names the receiver in the method signature.\n\n" +
          "**How to spot it:** *implement bind*, *why is this undefined*, *a callback loses its object*, *call vs apply*.",
      },
      {
        kind: "question",
        title: "What is this?",
        body: "Step through each call in strict mode and tap what `this` is: `cat`, `dog`, or `none` (meaning `undefined`).",
        widget: {
          type: "iv-trace",
          props: {
            title: "Four calls of the same function",
            frames: [
              { array: ["cat", "dog", "none"], code: THIS_CODE, line: 2, note: "`who` simply returns `this`. Each tap below asks which object comes back." },
              { line: 4, note: "A method call: there is an object before the dot.", pick: { prompt: "What is `this` in `cat.who()`?", answer: 0 } },
              { line: 5, highlight: [0], note: "`cat.who()` gives **cat**. Next, `call` passes an object explicitly.", pick: { prompt: "What is `this` in `cat.who.call(dog)`?", answer: 1 } },
              { line: 6, highlight: [1], note: "**dog**: explicit beats the dot. Now the function is copied into `w` and called on its own.", pick: { prompt: "What is `this` in `w()`?", answer: 2 } },
              { line: 7, highlight: [2], note: "**undefined**: a plain call has no object, and `w` remembers nothing about `cat`. Last: a bound function, called with `call`.", pick: { prompt: "What is `this` here?", answer: 1 } },
              { line: 7, highlight: [1], note: "**dog**. `bind` fixes `this` for good; a later `call(cat)` cannot change it. Only `new` overrides a bound `this`." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all four picks.", hint: "Look at how each line calls the function: with a dot, with call, plain, or bound." },
        explanation: "The same function gives three different answers, because `this` comes from the call: the object before the dot, an explicit object from `call` or `bind`, or nothing for a plain call.",
      },
      {
        kind: "question",
        title: "Arrows inside methods",
        body: "What is `timer.secs` after the timeout has fired?\n\n" + js(`
const timer = {
  secs: 0,
  start() {
    setTimeout(() => { this.secs++; }, 1000);
  },
};
timer.start();
`),
        question: {
          type: "choice",
          options: ["1: the arrow uses the `this` of `start`", "0: `setTimeout` calls the arrow with no `this`", "NaN: `this` is the global object", "It throws: arrows cannot use `this`"],
          answer: 0,
          feedback: {
            1: "That would be true for a `function` callback. An arrow does not get a `this` from its caller at all.",
            2: "That happens with a `function () { this.secs++ }` callback in an old-style script, not with an arrow.",
            3: "Arrows can use `this`; they just borrow it from the surrounding code.",
          },
          hint: "An arrow has no `this` of its own. Where was this arrow written?",
        },
        explanation: "The arrow was written inside `start`, which was called as `timer.start()`, so `this` is `timer` there and in the arrow. The timer fires and `timer.secs` becomes **1**.",
      },
      {
        kind: "question",
        title: "call, apply or bind?",
        body: "`args` is an array of arguments. Which line calls `greet` **right away**, with `this` set to `user` and the arguments taken from `args`?",
        question: {
          type: "choice",
          options: ["greet.bind(user, args)", "greet.call(user, args)", "greet.apply(user, args)", "greet(user, ...args)"],
          answer: 2,
          feedback: {
            0: "`bind` does not call anything: it returns a new function for later.",
            1: "`call` takes the arguments one by one, so `greet` would get the whole array as its first argument.",
            3: "A plain call: `user` becomes the first argument and `this` is undefined.",
          },
          hint: "One takes a list of arguments, one takes an array, and one returns a function.",
        },
        explanation: "`apply(thisArg, array)` calls now with an **a**rray. `call(thisArg, a, b)` calls now with arguments one by one (`greet.call(user, ...args)` also works). `bind` returns a new function to call later.",
      },
      {
        kind: "code",
        title: "Write bind yourself",
        body:
          "Write `bindTo(fn, thisArg, ...preset)` without using `.bind`. It returns a new function that, when called with `(...more)`, calls `fn` with `this` set to `thisArg` and the arguments `preset` followed by `more`, and returns `fn`'s result.\n\n" +
          js(`
function add(a, b, c) { return this.base + a + b + c; }
const add5 = bindTo(add, { base: 100 }, 2, 3);
add5(10); // 115
`) +
          "\nThe file runs in strict mode, so a lost `this` really is `undefined`.",
        language: "javascript",
        starter: `"use strict";

function bindTo(fn, thisArg, ...preset) {
  return function (...more) {
    return fn(...more);
  };
}
`,
        solution: `"use strict";

function bindTo(fn, thisArg, ...preset) {
  return function (...more) {
    return fn.apply(thisArg, [...preset, ...more]);
  };
}
`,
        tests: [
          {
            id: "t1",
            description: "this is fixed",
            assertionCode: 'const obj = { name: "obj" };\nfunction whoAmI() { return this; }\nconst bound = bindTo(whoAmI, obj);\nassert(bound() === obj, "The bound function should call fn with this === thisArg");\nassert(!/\\.bind\\s*\\(/.test(String(bindTo)), "Build it with call or apply instead of .bind");',
          },
          {
            id: "t2",
            description: "preset arguments come first",
            assertionCode: 'function add(a, b, c) { return (this ? this.base : 0) + a + b + c; }\nconst add5 = bindTo(add, { base: 100 }, 2, 3);\nassertEqual(add5(10), 115, "this.base 100 + preset 2, 3 + later 10");\nassertEqual(bindTo(add, { base: 0 })(1, 2, 3), 6, "With no presets, all arguments come from the call");',
          },
          {
            id: "t3",
            description: "works as a callback",
            assertionCode: 'const tally = { total: 0, add(n) { if (this) this.total += n; return this ? this.total : -1; } };\nconst add = bindTo(tally.add, tally);\n[1, 2, 3].forEach((n) => add(n));\nassertEqual(tally.total, 6, "Even when passed around as a callback, the method updates tally");',
          },
          {
            id: "t4",
            description: "call cannot change a bound this",
            assertionCode: 'const a = { id: "a" }, b = { id: "b" };\nfunction id() { return this ? this.id : "none"; }\nassertEqual(bindTo(id, a).call(b), "a", "The bound this wins over a later call(b)");',
          },
        ],
        hints: ["Return a new function that collects `...more`, then calls `fn` with an explicit `this`.", "`fn.apply(thisArg, [...preset, ...more])` does the whole job."],
      },
      {
        kind: "recap",
        points: [
          "`this` is set by the **call**: `new` > explicit (`call`, `apply`, `bind`) > `obj.method()` > plain call.",
          "A plain call gives `undefined` in strict mode, so a method passed as a callback loses its object.",
          "Arrow functions have no `this`; they use the surrounding one, which makes them good callbacks.",
          "`call(this, a, b)` and `apply(this, [a, b])` call now; `bind` returns a new function with `this` (and maybe some arguments) fixed.",
          "Python binds `self` for you and Java's `this` is always the instance; JavaScript's flexibility is why `bind` exists.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Higher-order functions ───────────────────────────────
  {
    id: "fnd-iv-javascript-3-higher-order",
    title: "Higher-order functions: map, filter and reduce",
    summary: "Functions that take functions, and writing map, filter and reduce from scratch.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Functions as values",
        body:
          "In JavaScript a function is a value: you can store it, pass it and return it. A **higher-order function** takes a function or returns one. The three you will be asked to write:\n\n" +
          "- `map(fn)`: a **new** array of the same length, each element replaced by `fn(value, index, array)`.\n" +
          "- `filter(fn)`: a new array of the elements for which `fn(value, index, array)` is truthy.\n" +
          "- `reduce(fn, initial)`: folds the array into one value: `acc = fn(acc, value, index, array)` for each element, starting from `initial`.\n\n" +
          "The details interviewers check: the callback gets **three** arguments; nothing changes the input array; and `reduce` **without** an initial value starts from the first element and loops from index 1, and throws a `TypeError` on an empty array.\n\n" +
          js(`
const prices = [12, 5, 30, 8];
prices.filter((p) => p >= 10)        // [12, 30]
      .map((p) => p * 1.2)           // [14.4, 36]
      .reduce((sum, p) => sum + p, 0); // 50.4
`) +
          "\nElsewhere: Python has `map`, `filter`, `functools.reduce` and, more often, comprehensions; Java has streams (`stream().map(...).filter(...).reduce(...)`); Go has no built-in map or filter, so you write a loop (or a small generic helper).\n\n" +
          "**How to spot it:** *implement map / filter / reduce*, *polyfill*, *without using the built-in*, *transform every item*.",
      },
      {
        kind: "question",
        title: "Reduce with no initial value",
        body: "Step through `[4, 7, 1, 8].reduce((best, x) => (x > best ? x : best))`, with no initial value, and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Largest element with reduce",
            frames: [
              { array: [4, 7, 1, 8], code: REDUCE_CODE, line: 1, highlight: [0], vars: { acc: 4 }, note: "No initial value, so `acc` starts as the first element, **4**." },
              { line: 2, done: [0], vars: { acc: 4 }, note: "The loop starts after the element that became `acc`.", pick: { prompt: "Which element does the callback see first as `x`?", answer: 1 } },
              { line: 3, done: [0], highlight: [1], pointers: { i: 1 }, vars: { acc: 7, i: 1 }, note: "`fn(4, 7)`: 7 > 4, so `acc` becomes 7." },
              { line: 3, done: [0, 1], highlight: [2], pointers: { i: 2 }, vars: { acc: 7, i: 2 }, note: "`fn(7, 1)`: `acc` stays 7." },
              { line: 3, done: [0, 1, 2], pointers: { i: 3 }, vars: { acc: 7, i: 3 }, note: "One element left.", pick: { prompt: "After this call, which element's value is `acc`?", answer: 3 } },
              { line: 4, done: [0, 1, 2], highlight: [3], vars: { acc: 8, i: 3 }, note: "`fn(7, 8)` gives 8, the answer. The callback ran **3** times for 4 elements. On an empty array there is no first element at all, so this version throws a `TypeError`." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Without an initial value, the first element is used up as the starting accumulator." },
        explanation: "With no initial value, `reduce` uses the first element as `acc` and calls the callback from index 1. Give an initial value (`reduce(fn, -Infinity)`) and it calls the callback for every element and also works on an empty array.",
      },
      {
        kind: "question",
        title: "A small pipeline",
        body: "Find the value of this expression.\n\n" + js(`
[1, 2, 3, 4, 5, 6]
  .filter((x) => x % 2 === 0)
  .map((x) => x * 10)
  .reduce((a, b) => a + b, 0)
`),
        question: { type: "number", answer: 120, hint: "Do one stage at a time: which elements survive the filter, and what does map turn them into?" },
        explanation: "The filter keeps 2, 4, 6; map makes 20, 40, 60; reduce adds them up: **120**.",
      },
      {
        kind: "question",
        title: "The index argument",
        body: "What does `[\"1\", \"2\", \"3\"].map(parseInt)` return? (`parseInt(text, radix)` reads `text` in base `radix`; radix 0 means \"guess\", usually base 10.)",
        question: {
          type: "choice",
          options: ["[1, 2, 3]", "[NaN, NaN, NaN]", '["1", "2", "3"]', "[1, NaN, NaN]"],
          answer: 3,
          feedback: {
            0: "That is what `.map((s) => parseInt(s))` or `.map(Number)` gives. Plain `parseInt` also receives the index.",
            1: "The first call is `parseInt(\"1\", 0)`, and radix 0 reads it as base 10.",
            2: "`parseInt` returns numbers (or NaN), never strings.",
          },
          hint: "`map` calls its callback with `(value, index, array)`. What does `parseInt` do with the index?",
        },
        explanation: "`map` passes the index as the second argument, so the calls are `parseInt(\"1\", 0)` = 1, `parseInt(\"2\", 1)` = NaN (base 1 does not exist) and `parseInt(\"3\", 2)` = NaN (3 is not a binary digit).",
      },
      {
        kind: "code",
        title: "map, filter and reduce from scratch",
        body:
          "Write three functions with plain loops (no `.map`, `.filter`, `.reduce` or `.forEach`):\n\n" +
          "- `myMap(arr, fn)`: a new array of `fn(value, index, arr)`.\n" +
          "- `myFilter(arr, fn)`: a new array of the values where `fn(value, index, arr)` is truthy.\n" +
          "- `myReduce(arr, fn, initial)`: `acc = fn(acc, value, index, arr)` for each element. If `initial` is **not passed at all**, start from the first element and loop from index 1; if the array is also empty, throw a `TypeError`.\n\n" +
          "None of them may change `arr`.",
        language: "javascript",
        starter: `function myMap(arr, fn) {
  const out = [];
  // your loop here
  return out;
}

function myFilter(arr, fn) {
  const out = [];
  // your loop here
  return out;
}

function myReduce(arr, fn, ...rest) {
  // rest.length === 0 means no initial value was passed
}
`,
        solution: `function myMap(arr, fn) {
  const out = [];
  for (let i = 0; i < arr.length; i++) out.push(fn(arr[i], i, arr));
  return out;
}

function myFilter(arr, fn) {
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    if (fn(arr[i], i, arr)) out.push(arr[i]);
  }
  return out;
}

function myReduce(arr, fn, ...rest) {
  let i = 0;
  let acc;
  if (rest.length > 0) acc = rest[0];
  else {
    if (arr.length === 0) throw new TypeError("Reduce of empty array with no initial value");
    acc = arr[0];
    i = 1;
  }
  for (; i < arr.length; i++) acc = fn(acc, arr[i], i, arr);
  return acc;
}
`,
        tests: [
          {
            id: "t1",
            description: "myMap passes value, index and array",
            assertionCode:
              'const input = [5, 6, 7];\nconst out = myMap(input, (v, i, a) => v * 10 + i + (a === input ? 0 : 100));\nassertEqual(out, [50, 61, 72], "Each element becomes fn(value, index, array)");\nassertEqual(input, [5, 6, 7], "The input array must not change");\nassert(!/\\.(map|forEach)\\s*\\(/.test(String(myMap)), "Write the loop yourself instead of calling .map or .forEach");',
          },
          {
            id: "t2",
            description: "myFilter keeps truthy results",
            assertionCode: 'assertEqual(myFilter([3, 8, 1, 9, 4], (v) => v > 3), [8, 9, 4], "Keep the values where fn is truthy");\nassertEqual(myFilter(["a", "b", "c", "d"], (v, i) => i % 2 === 0), ["a", "c"], "fn also gets the index");\nassert(!/\\.(filter|forEach)\\s*\\(/.test(String(myFilter)), "Write the loop yourself instead of calling .filter");',
          },
          {
            id: "t3",
            description: "myReduce with and without an initial value",
            assertionCode:
              'assertEqual(myReduce([1, 2, 3], (a, b) => a + b, 10), 16, "Start from the initial value 10");\nconst seen = [];\nconst best = myReduce([4, 7, 1, 8], (acc, x, i) => { seen.push(i); return x > acc ? x : acc; });\nassertEqual(best, 8, "Without an initial value, the first element starts the fold");\nassertEqual(seen, [1, 2, 3], "...and fn is called from index 1");\nassertEqual(myReduce([1, 2], (a, b) => a + b, undefined), NaN, "Passing undefined on purpose IS an initial value: undefined + 1 + 2 is NaN");',
          },
          {
            id: "t4",
            description: "empty arrays",
            assertionCode: 'assertEqual(myReduce([], (a, b) => a + b, 0), 0, "An empty array with an initial value gives the initial value");\nassertThrows(() => myReduce([], (a, b) => a + b), "TypeError", "An empty array without an initial value should throw a TypeError");\nassertEqual(myMap([], (x) => x), [], "myMap of [] is []");',
          },
        ],
        hints: ["Each function is one `for` loop from 0 to `arr.length - 1`, calling `fn(arr[i], i, arr)`.", "For `myReduce`, check `rest.length` to tell \"no initial value\" apart from an initial value of `undefined`."],
      },
      {
        kind: "recap",
        points: [
          "A **higher-order function** takes or returns a function; map, filter and reduce are the classic three.",
          "Callbacks get `(value, index, array)`, which is why `map(parseInt)` surprises people.",
          "`reduce` without an initial value starts from the first element and throws on an empty array.",
          "None of them change the input; they build new arrays or values.",
          "Python uses comprehensions, Java streams, Go plain loops for the same jobs.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Memoize ───────────────────────────────
  {
    id: "fnd-iv-javascript-4-memoize",
    title: "Memoize",
    summary: "Cache results by their arguments, choose keys, and share one in-flight call for async work.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Remember the answers",
        body:
          "To **memoize** a function is to wrap it so it remembers its results: the first call with some arguments does the work and stores the result under a **key**; a later call with the same arguments returns the stored result.\n\n" +
          js(`
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key);
  };
}
`) +
          "\nThings to get right:\n\n" +
          "- Only memoize **pure** functions: same arguments, same result, no side effects.\n" +
          "- Choose the **key** with care. One primitive argument can be the key itself; several arguments need a combined key such as `JSON.stringify(args)`; objects compared by identity can use a `WeakMap`. Let callers pass a key function when they know better.\n" +
          "- Check with `cache.has(key)`, not `if (cache.get(key))`, or results like `0` and `\"\"` are recomputed every time.\n" +
          "- The cache grows forever unless you bound it (an LRU cache).\n" +
          "- For **async** functions, cache the **promise**, so callers who arrive while the first call is in flight share it, and delete it if it rejects so one failure is not remembered forever.\n\n" +
          "Elsewhere: Python `functools.cache` / `lru_cache`; Java `map.computeIfAbsent(key, fn)`; Go a map with a mutex, and `singleflight` for sharing in-flight calls.\n\n" +
          "**How to spot it:** *the same expensive call repeats*, *cache*, *avoid recomputing*, *overlapping subproblems*, *deduplicate requests*.",
      },
      {
        kind: "question",
        title: "Find the cache hits",
        body: "Here is the call tree of a memoized `fib(5)`. Each node is a call `fib(n)`, left child first. Base cases (n < 2) return at once and are not cached. Answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Memoized fib(5)",
            frames: [
              { tree: { nodes: FIB_TREE, active: ["5", "4", "3", "2"] }, code: MEMO_CODE, line: 4, vars: { memo: "{}" }, note: "`fib(5)` calls `fib(4)`, which calls `fib(3)`, which calls `fib(2)`: always the left child first." },
              { tree: { active: ["5", "4", "3"], done: ["2", "1", "0"] }, line: 4, vars: { memo: "{2: 1}" }, note: "`fib(2)` gets 1 + 0 from the base cases and stores **memo[2] = 1**." },
              { tree: { active: ["5", "4"], done: ["3", "2", "1", "0", "1r"] }, line: 5, vars: { memo: "{2: 1, 3: 2}" }, note: "`fib(3)` adds the base case `fib(1)` and stores memo[3] = 2." },
              { tree: { active: ["5", "4"], done: ["3", "2", "1", "0", "1r"] }, line: 3, note: "`fib(4)` makes its second call now.", pick: { prompt: "Which call is the first one answered from the cache?", answer: "2r" } },
              { tree: { active: ["5"], done: ["4", "3", "2", "1", "0", "1r", "2r"] }, line: 3, vars: { memo: "{2: 1, 3: 2, 4: 3}" }, note: "`fib(2)` was in the memo, so that call returns at once: no subtree under it." },
              { tree: { active: ["5"], done: ["4", "3", "2", "1", "0", "1r", "2r"] }, line: 3, note: "`fib(5)` makes its second call.", pick: { prompt: "Which call is the second cache hit?", answer: "3r" } },
              { tree: { done: FIB_TREE.map((n) => n.id) }, line: 5, vars: { memo: "{2: 1, 3: 2, 4: 3, 5: 5}" }, note: "`fib(5)` = 3 + 2 = **5**, in **9** calls. Without the memo the tree has **15** calls, and it roughly doubles with every n." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "A call is a hit when the same n has already finished somewhere to its left." },
        explanation: "The left branch computes every value once; every later call for the same n is a lookup. That turns exponential work into a linear number of calls: each `fib(k)` body runs once.",
      },
      {
        kind: "question",
        title: "Count the calls",
        body: "With the same memoized `fib` (base cases not cached), how many calls does `fib(6)` make in total, counting the first one? Find the number.",
        question: { type: "number", answer: 11, hint: "Each `fib(k)` for k from 2 to 6 runs its body once and makes two calls." },
        explanation: "Five bodies run (k = 6, 5, 4, 3, 2), each making 2 calls: 10 calls, plus the first call `fib(6)`: **11**. Without the memo it is 25.",
      },
      {
        kind: "question",
        title: "When not to memoize",
        body: "Which function is **wrong** to memoize?",
        question: {
          type: "choice",
          options: ["`slugify(title)`, which turns a title into a URL part", "`distance(a, b)` between two map points", "`unreadCount(userId)`, which reads the inbox", "`isPrime(n)` for a whole number n"],
          answer: 2,
          feedback: {
            0: "The same title always gives the same slug: a pure function, safe to cache.",
            1: "Distance depends only on the two points: pure, safe to cache.",
            3: "Whether n is prime never changes: a fine memo candidate.",
          },
          hint: "Which result can change while the arguments stay the same?",
        },
        explanation: "`unreadCount` depends on data that changes: new mail arrives with the same `userId`. A memo would keep returning the old count. Memoize pure functions only (or add an expiry).",
      },
      {
        kind: "code",
        title: "memoize",
        body:
          "Write `memoize(fn, keyFn)`. It returns a function that, for each distinct key, calls `fn(...args)` once and then returns the stored result.\n\n" +
          "The key is `keyFn(...args)` if `keyFn` is given, otherwise `JSON.stringify(args)`. Results such as `0`, `\"\"` or `undefined` must be cached too.",
        language: "javascript",
        starter: `function memoize(fn, keyFn) {
  return (...args) => fn(...args);
}
`,
        solution: `function memoize(fn, keyFn) {
  const cache = new Map();
  return (...args) => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key);
  };
}
`,
        tests: [
          { id: "t1", description: "calls fn once per argument", assertionCode: 'let calls = 0;\nconst square = memoize((n) => { calls++; return n * n; });\nassertEqual([square(4), square(4), square(5), square(4)], [16, 16, 25, 16], "Results stay correct");\nassertEqual(calls, 2, "fn runs once for 4 and once for 5");' },
          {
            id: "t2",
            description: "several arguments make one key",
            assertionCode: 'let calls = 0;\nconst add = memoize((a, b) => { calls++; return a + b; });\nassertEqual([add(1, 2), add(2, 1), add(1, 2), add(1, "2")], [3, 3, 3, "12"], "(1, 2), (2, 1) and (1, \\"2\\") are three different calls");\nassertEqual(calls, 3, "add(1, 2) a second time comes from the cache");',
          },
          {
            id: "t3",
            description: "a custom key function",
            assertionCode: 'let calls = 0;\nconst lookup = memoize((name) => { calls++; return name.trim().toLowerCase(); }, (name) => name.trim().toLowerCase());\nassertEqual([lookup("Ada"), lookup(" ada"), lookup("ADA ")], ["ada", "ada", "ada"], "Same key, same result");\nassertEqual(calls, 1, "All three names share one key, so fn runs once");',
          },
          { id: "t4", description: "falsy results are cached", assertionCode: 'let calls = 0;\nconst zero = memoize(() => { calls++; return 0; });\nzero();\nzero();\nconst nothing = memoize(() => { calls++; return undefined; });\nnothing();\nnothing();\nassertEqual(calls, 2, "A result of 0 or undefined is still a cached result: check with cache.has(key)");' },
        ],
        hints: ["Make a `Map` inside `memoize` and work out the key first on every call.", "Use `cache.has(key)` to decide whether to call `fn`, so falsy results count as cached."],
      },
      {
        kind: "code",
        title: "Share the request in flight",
        body:
          "Write `memoizeAsync(fn)` for an async `fn(key)` (one argument). It returns a function that:\n\n" +
          "- calls `fn` at most once per key, and gives every caller with that key the **same promise**, even callers who arrive while the first call is still running;\n" +
          "- **forgets** a key whose call rejects, so the next caller tries again.\n\n" +
          "The checks use the simulated clock: a call to the fake `fn` takes 100 ms.",
        language: "javascript",
        starter: `function memoizeAsync(fn) {
  return (key) => fn(key);
}
`,
        solution: `function memoizeAsync(fn) {
  const cache = new Map();
  return (key) => {
    if (!cache.has(key)) {
      const p = fn(key);
      cache.set(key, p);
      p.catch(() => cache.delete(key)); // do not remember failures
    }
    return cache.get(key);
  };
}
`,
        tests: [
          {
            id: "t1",
            description: "callers at the same time share one call",
            assertionCode:
              'let calls = 0;\nconst load = memoizeAsync((id) => { calls++; return new Promise((r) => setTimeout(() => r("user " + id), 100)); });\nconst t0 = sim.now();\nconst out = await Promise.all([load(7), load(7), load(8)]);\nassertEqual(out, ["user 7", "user 7", "user 8"], "Each caller gets its key\'s result");\nassertEqual(calls, 2, "Two callers for key 7 at once should share one call");\nassertEqual(sim.now() - t0, 100, "They run together and take 100 ms");',
          },
          {
            id: "t2",
            description: "later callers get the cached result at once",
            assertionCode:
              'let calls = 0;\nconst load = memoizeAsync((id) => { calls++; return new Promise((r) => setTimeout(() => r(id * 2), 100)); });\nassertEqual(await load(21), 42, "The first call resolves with fn\'s result");\nconst t1 = sim.now();\nassertEqual(await load(21), 42, "The second call returns the cached result");\nassertEqual(sim.now() - t1, 0, "A cached key should not wait another 100 ms");\nassertEqual(calls, 1, "fn ran once");',
          },
          {
            id: "t3",
            description: "a failure is not cached",
            assertionCode:
              'let calls = 0;\nconst load = memoizeAsync((id) => { calls++; const n = calls; return new Promise((res, rej) => setTimeout(() => (n === 1 ? rej(new Error("offline")) : res("ok " + id)), 100)); });\nconst first = load(1), second = load(1);\nawait assertRejects(first, "offline", "The first call fails");\nawait assertRejects(second, "offline", "A caller that joined the failing call gets the same failure");\nassertEqual(calls, 1, "Both callers shared one failing call");\nassertEqual(await load(1), "ok 1", "After a failure the next caller tries again");\nassertEqual(calls, 2, "...which calls fn a second time");',
          },
        ],
        hints: ["Store the promise in a Map the moment you call `fn`, before it resolves.", "Attach `p.catch(() => cache.delete(key))` so a rejected promise leaves the cache, but still return `p` itself to the caller."],
      },
      {
        kind: "recap",
        points: [
          "**Memoize** = cache results by a key made from the arguments; only for pure functions.",
          "Default key `JSON.stringify(args)`; accept a key function for cases like case-insensitive lookups.",
          "Use `cache.has(key)` so falsy results are cached too.",
          "For async work cache the **promise**: callers in flight share one call, and a rejection deletes the entry.",
          "Bound the cache (LRU) if the number of keys is unbounded; Python's `lru_cache` does both.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Debounce and throttle ───────────────────────────────
  {
    id: "fnd-iv-javascript-5-debounce-throttle",
    title: "Debounce and throttle",
    summary: "Run a busy handler only after things go quiet, or at most once per interval, timed to the millisecond.",
    minutes: 14,
    xp: 80,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Two ways to calm a noisy event",
        body:
          "Keystrokes, scrolls and resizes fire dozens of times a second. Running an expensive handler on every one is wasteful, so we wrap it.\n\n" +
          "- **Debounce(fn, wait)**: wait until the calls **stop**. Every call restarts a `wait` ms timer; `fn` runs once, `wait` ms after the **last** call, with the last call's arguments. Use it for search-as-you-type or autosave.\n" +
          "- **Throttle(fn, wait)**: run **at most once per `wait` ms** while calls keep coming. The first call runs right away and opens a window; calls inside the window are remembered, and when it closes the latest one runs and opens the next window. Use it for scroll position or progress updates.\n\n" +
          "Calls at 0, 50, 80, 150 and 400 ms with `wait = 100`:\n\n" +
          txt(`
calls        0   50  80      150                 400
debounce                             250 (150's args)       500
throttle     0           100 (80's)       200 (150's)   400
`) +
          "\nBoth are closures over a timer id and some saved arguments, built with `setTimeout` and `clearTimeout`. Keep `this` and the arguments of the call you forward. The same ideas appear as `debounceTime` and `throttleTime` in RxJS, `loop.call_later` in Python's asyncio and `time.AfterFunc` with `Reset` in Go.\n\n" +
          "**How to spot it:** *only after the user stops typing* (debounce), *at most once every N ms* (throttle), *rate-limit a handler*, *too many requests while scrolling*.",
      },
      {
        kind: "question",
        title: "Same calls, two wrappers",
        body: "Each cell is one call, labelled with its time in ms. The wrappers use `wait = 100`. Step through and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Debounce, then throttle",
            frames: [
              { array: CALLS, highlight: [0], vars: { wrapper: "debounce", now: 0, "fires at": 100 }, note: "**Debounce.** The call at 0 starts a 100 ms timer." },
              { highlight: [1], done: [0], vars: { wrapper: "debounce", now: 50, "fires at": 150 }, note: "The call at 50 cancels that timer and starts a new one: now due at 150." },
              { highlight: [2], done: [0, 1], vars: { wrapper: "debounce", now: 80, "fires at": 180 }, note: "80: restart again, due at 180." },
              { highlight: [3], done: [0, 1, 2], vars: { wrapper: "debounce", now: 150, "fires at": 250 }, note: "150: due at 250. Then nothing happens until 400." },
              { done: [0, 1, 2], vars: { wrapper: "debounce", now: 250, "fires at": 250 }, note: "The timer fires at 250.", pick: { prompt: "Whose arguments does `fn` get?", answer: 3 } },
              { highlight: [4], done: [0, 1, 2, 3], vars: { wrapper: "debounce", now: 400, "fires at": 500 }, note: "`fn` ran once at 250 with the 150 call's arguments. The call at 400 starts a new quiet period and `fn` runs again at **500**." },
              { highlight: [0], vars: { wrapper: "throttle", now: 0, window: "0–100", saved: "-" }, note: "**Throttle**, same calls. The call at 0 runs **right away** and opens a window until 100." },
              { highlight: [1, 2], done: [0], vars: { wrapper: "throttle", now: 80, window: "0–100", saved: "80's args" }, note: "50 and 80 land inside the window. They do not run; only the latest is kept." },
              { done: [0], vars: { wrapper: "throttle", now: 100, window: "0–100", saved: "80's args" }, note: "The window closes at 100.", pick: { prompt: "Which call's arguments run at 100?", answer: 2 } },
              { highlight: [3], done: [0, 1, 2], vars: { wrapper: "throttle", now: 150, window: "100–200", saved: "150's args" }, note: "80's call ran at 100 and opened a window to 200. The call at 150 is saved and runs at 200; at 300 nothing is saved, so the window closes." },
              { done: [0, 1, 2, 3], vars: { wrapper: "throttle", now: 400, window: "closed", saved: "-" }, note: "Calls after 0 have all waited so far.", pick: { prompt: "Which call runs the moment it is made?", answer: 4 } },
              { done: [0, 1, 2, 3, 4], vars: { wrapper: "throttle", now: 400, window: "400–500", saved: "-" }, note: "No window was open at 400, so it ran at once. Throttle ran at **0, 100, 200, 400**; debounce only at **250 and 500**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer all three picks.", hint: "Debounce waits for quiet and uses the last call; throttle runs at window edges with the latest saved call." },
        explanation: "Debounce collapses a burst into one run after it ends. Throttle keeps a steady beat during the burst (once per window) and never drops the last call.",
      },
      {
        kind: "question",
        title: "Pick the wrapper",
        body: "While the user scrolls, you want to save the scroll position **at most every 200 ms**, so it stays roughly up to date even during a long scroll. Which wrapper fits?",
        question: {
          type: "choice",
          options: ["throttle(save, 200)", "debounce(save, 200)", "setInterval(save, 200), started once", "once(save)"],
          answer: 0,
          feedback: {
            1: "Debounce waits until scrolling stops, so a long scroll saves nothing until the end.",
            2: "An interval keeps saving even when nobody scrolls, and needs clearing.",
            3: "`once` saves the first position and never again.",
          },
          hint: "Should it keep running during the scroll, or wait for the scroll to end?",
        },
        explanation: "Throttle runs at most once per 200 ms while events keep coming and catches the final position with its trailing call. Debounce suits *after they stop*, like search suggestions.",
      },
      {
        kind: "question",
        title: "Count the runs",
        body: "`const d = debounce(fn, 300)`, and `d()` is called at 0, 100, 250 and 700 ms. How many times does `fn` run?",
        question: { type: "number", answer: 2, hint: "Find the gaps of at least 300 ms after a call." },
        explanation: "The calls at 0, 100 and 250 are each less than 300 ms apart, so they form one burst: `fn` runs at 550. The call at 700 starts a new one and runs at 1000. That is **2** runs.",
      },
      {
        kind: "code",
        title: "debounce",
        body:
          "Write `debounce(fn, wait)`. It returns a function `d`:\n\n" +
          "- every call of `d` restarts a `wait` ms timer;\n- when the timer fires, `fn` runs **once** with the arguments and `this` of the **latest** call;\n- `d.cancel()` drops any pending run.\n\n" +
          "The checks move a simulated clock and look at exact times, so use `setTimeout` and `clearTimeout`.",
        language: "javascript",
        starter: `function debounce(fn, wait) {
  function d(...args) {
    // restart the timer; when it fires, call fn with the latest args and this
  }
  d.cancel = function () {
    // drop the pending call
  };
  return d;
}
`,
        solution: `function debounce(fn, wait) {
  let timer = null;
  function d(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  }
  d.cancel = function () {
    clearTimeout(timer);
    timer = null;
  };
  return d;
}
`,
        tests: [
          {
            id: "t1",
            description: "fires wait ms after the last call",
            assertionCode:
              'const runs = [];\nconst t0 = sim.now();\nconst d = debounce((q) => runs.push([sim.now() - t0, q]), 100);\nd("c"); await sim.tick(50);\nd("ca"); await sim.tick(30);\nd("cat");\nawait sim.tick(99);\nassertEqual(runs, [], "At 179 ms the last call (at 80) is only 99 ms old: nothing should have run");\nawait sim.tick(1);\nassertEqual(runs, [[180, "cat"]], "fn runs once at 180 ms with the latest arguments");\nawait sim.tick(500);\nassertEqual(runs.length, 1, "and only once");',
          },
          {
            id: "t2",
            description: "separate bursts run separately",
            assertionCode:
              'const runs = [];\nconst t0 = sim.now();\nconst d = debounce((x) => runs.push([sim.now() - t0, x]), 100);\nd(1); await sim.tick(500);\nd(2); await sim.tick(500);\nassertEqual(runs, [[100, 1], [600, 2]], "Two calls 500 ms apart give two runs, each 100 ms after its call");',
          },
          {
            id: "t3",
            description: "cancel drops the pending run",
            assertionCode:
              'const runs = [];\nconst t0 = sim.now();\nconst d = debounce((x) => runs.push([sim.now() - t0, x]), 100);\nd("a"); await sim.tick(50);\nd.cancel();\nassertEqual(sim.pending(), 0, "cancel() should clear the timer");\nawait sim.tick(500);\nd("b");\nawait sim.tick(100);\nassertEqual(runs, [[650, "b"]], "The cancelled call never runs; a later call still works");',
          },
          {
            id: "t4",
            description: "keeps this",
            assertionCode: 'let seen = null;\nconst form = { name: "signup", save: debounce(function () { seen = this; }, 10) };\nform.save();\nawait sim.tick(10);\nassert(seen === form, "Called as form.save(), fn should run with this === form");',
          },
        ],
        hints: ["Keep the timer id in a closure variable; each call does `clearTimeout(timer)` then sets a new one.", "Use an arrow inside `setTimeout` so `this` and `args` from the latest call of `d` reach `fn.apply(this, args)`."],
      },
      {
        kind: "code",
        title: "throttle",
        body:
          "Write `throttle(fn, wait)`. It returns a function `t`:\n\n" +
          "- if no window is open, a call runs `fn` **right away** and opens a `wait` ms window;\n" +
          "- calls during a window do not run; only the **latest** one (its arguments and `this`) is saved;\n" +
          "- when a window closes: if a call was saved, run it and open a new window; otherwise the window simply closes.\n\n" +
          "So `fn` runs at most once per `wait` ms, and the last call is never lost.",
        language: "javascript",
        starter: `function throttle(fn, wait) {
  return function (...args) {
    // run now and open a window, or save the latest call for the end of the window
  };
}
`,
        solution: `function throttle(fn, wait) {
  let timer = null;
  let saved = null; // { self, args } of the latest call inside the window

  function openWindow() {
    timer = setTimeout(() => {
      if (saved) {
        const { self, args } = saved;
        saved = null;
        fn.apply(self, args);
        openWindow();
      } else {
        timer = null;
      }
    }, wait);
  }

  return function (...args) {
    if (timer === null) {
      fn.apply(this, args);
      openWindow();
    } else {
      saved = { self: this, args };
    }
  };
}
`,
        tests: [
          {
            id: "t1",
            description: "the timeline from the lesson",
            assertionCode:
              'const runs = [];\nconst t0 = sim.now();\nconst t = throttle((x) => runs.push([sim.now() - t0, x]), 100);\nfor (const at of [0, 50, 80, 150, 400]) { await sim.tick(at - (sim.now() - t0)); t(at); }\nawait sim.tick(1000);\nassertEqual(runs, [[0, 0], [100, 80], [200, 150], [400, 400]], "Runs at 0 (leading), 100 (latest of 50 and 80), 200 (150) and 400 (no window open)");',
          },
          {
            id: "t2",
            description: "one call runs once, at once",
            assertionCode: 'const runs = [];\nconst t0 = sim.now();\nconst t = throttle((x) => runs.push([sim.now() - t0, x]), 100);\nt("only");\nassertEqual(runs, [[0, "only"]], "The first call runs right away");\nawait sim.tick(1000);\nassertEqual(runs.length, 1, "With nothing saved, the window closes without another run");',
          },
          {
            id: "t3",
            description: "a steady stream: once per window, last call kept",
            assertionCode:
              'const runs = [];\nconst t0 = sim.now();\nconst t = throttle((x) => runs.push([sim.now() - t0, x]), 100);\nfor (let at = 0; at <= 270; at += 30) { await sim.tick(at - (sim.now() - t0)); t(at); }\nawait sim.tick(1000);\nassertEqual(runs, [[0, 0], [100, 90], [200, 180], [300, 270]], "A call every 30 ms runs once per 100 ms window, each time with the latest call");',
          },
          {
            id: "t4",
            description: "keeps this of the saved call",
            assertionCode: 'const seen = [];\nconst a = { id: "a" }, b = { id: "b" };\nconst t = throttle(function () { seen.push(this ? this.id : "none"); }, 50);\nt.call(a);\nt.call(b);\nawait sim.tick(50);\nassertEqual(seen, ["a", "b"], "The leading run uses a; the trailing run uses the saved call\'s this, b");',
          },
        ],
        hints: ["Keep the window's timer id and the saved `{ self, args }` in closure variables; `timer === null` means no window is open.", "When the window timer fires with a saved call, run it and open a fresh window; with nothing saved, set the timer back to null."],
      },
      {
        kind: "recap",
        points: [
          "**Debounce** runs once, `wait` ms after the last call, with the last call's arguments: for *after they stop*.",
          "**Throttle** runs at most once per `wait` ms: right away, then the latest saved call at each window's end.",
          "Both are closures over a timer id (plus saved arguments), built with `setTimeout` and `clearTimeout`.",
          "Forward `this` and the arguments with `fn.apply(this, args)`, and offer `cancel()` to drop pending work.",
          "Test them with a fake clock: exact times like *not at 179 ms, yes at 180 ms* catch off-by-one timers.",
        ],
      },
    ],
  },
];
