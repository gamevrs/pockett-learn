import type { Chapter } from "@/engine/types";
import { t } from "./tag.ts";

/**
 * Form Forge, chapter 1: Data in hand.
 * Arrays, objects and strings: the three shapes every piece of form input arrives in.
 *
 * Authoring notes: everything is written with the `t` tag (see tag.ts): backslashes are literal,
 * ^^ is a backtick and $\{ is ${. Each lesson's code is appended to ONE file, so a name is
 * declared exactly once in the whole course.
 */

export const chapter1: Chapter = {
  id: "data-in-hand",
  title: "Data in hand",
  blurb: "Arrays, objects and strings: the shapes every piece of form input arrives in.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "form-forge-1-array-basics",
      title: "Fields are data",
      minutes: 25,
      xp: 90,
      concepts: ["map", "filter", "find", "some / every", "includes", "at"],
      learn: t`### A form is a list of facts

Open any sign-up page and you are looking at a list: name, email, password, and so on. A well-built form engine does not hard-code those fields into twenty ^^if^^ statements. It keeps **one array of field descriptions**, and every feature (drawing the form, starring the required fields, validating, building the request) is a question asked of that array.

~~~js
const fields = [
  { name: "fullName", label: "Full name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: false },
];
~~~

JavaScript arrays come with a toolbox of methods that take a **callback**: a small function that the method calls once per item. Learning the toolbox well means you almost never write a counting loop again.

### Transform and select

~~~js
// map: one output per input, same length
fields.map((field) => field.label);          // ["Full name", "Email", "Phone"]

// filter: keep the items the callback says yes to
fields.filter((field) => field.required);    // the first two fields

// chain them: filter first, then map what is left
fields.filter((f) => f.required).map((f) => f.name);   // ["fullName", "email"]
~~~

The callback is usually an **arrow function**. With a short body, the result of the expression is returned automatically. Add curly braces and you must write ^^return^^ yourself:

~~~js
const double = (n) => n * 2;          // returns n * 2
const broken = (n) => { n * 2; };     // returns undefined: braces need "return"
~~~

### Look for one item, or ask a yes/no question

~~~js
fields.find((f) => f.name === "email");    // the email object, or undefined if none matches
fields.findIndex((f) => f.name === "email"); // 1, or -1 if none matches
fields.some((f) => f.type === "tel");      // true: at least one item passes
fields.every((f) => f.required);           // false: not all of them pass
~~~

- ^^find^^ gives back the **item itself** (the very same object, not a copy), or ^^undefined^^. It stops at the first match.
- ^^some^^ and ^^every^^ answer with a boolean, and they also stop early once the answer is known.
- Both have an easy-to-forget edge case on an **empty array**: ^^[].some(...)^^ is ^^false^^ (nothing passed), but ^^[].every(...)^^ is ^^true^^ (nothing failed). Logicians call this *vacuous truth*, and it matters when a form has no required fields.

### includes and at

~~~js
const types = ["text", "email", "tel"];
types.includes("email");     // true. Uses strict equality for the comparison
types.at(0);                 // "text"
types.at(-1);                // "tel"  (negative counts from the end)
types[types.length - 1];     // the old way to say the same thing
~~~

^^includes^^ compares with ^^===^^ (with the one quirk that it finds ^^NaN^^). That is perfect for strings and numbers, but two *different* objects that look identical are never equal, so ^^list.includes({ a: 1 })^^ is ^^false^^ even if the list contains a lookalike. For objects, reach for ^^some^^.

### Destructuring in the callback

You can unpack the argument right in the parameter list. Both lines do the same thing:

~~~js
fields.filter((field) => field.required);
fields.filter(({ required }) => required);
~~~

### Common mistakes

- **Braces without ^^return^^.** ^^map((x) => { x.name })^^ gives an array of ^^undefined^^.
- **Using ^^map^^ just to loop.** If you do not use the new array, you wanted ^^forEach^^ or ^^for...of^^.
- **Treating ^^find^^ like ^^indexOf^^.** A miss is ^^undefined^^, not ^^-1^^ and not ^^null^^.
- **Filtering on truthiness by accident.** ^^filter((f) => f.required)^^ keeps anything truthy, including the string ^^"false"^^. Compare with ^^=== true^^ when the data comes from outside.
- **Mutating while you iterate.** Methods like ^^filter^^ and ^^map^^ return new arrays. Prefer them to editing the array you are looping over.`,
      mission: t`Checkout is a conveyor belt of text boxes, and the checkout team has handed you the blueprint: a list of field descriptions, one object per box. Before any validation, you need an engine that can *read* that blueprint.

Write five small questions the form will ask over and over: which fields are required, where is the field called X, is there a phone box at all, are all required boxes filled in, and which required field comes last. When you Run, the blueprint becomes a live form: required fields get a star, and a status chip tells the shopper when every starred box is filled.`,
      tasks: [
        "requiredFields(fields): the names of the required fields, in order (filter + map)",
        "findField(fields, name) and hasType(fields, type): find one field, and ask whether any field has a type",
        "allFilled(names, values): true when every named value is a non-blank string (every)",
        "lastRequired(fields): the name of the last required field (at)",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: teach the engine to read the form's list of fields.
// A field looks like { name, label, type, required }.

// A small list to experiment with. Try console.log(requiredFields(SAMPLE_FIELDS)).
const SAMPLE_FIELDS = [
  { name: "fullName", label: "Full name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: false },
];

// 1. The NAMES of the fields where required is true, in the same order.
//    Hint: filter the fields, then map each one to its name.
function requiredFields(fields) {
  // TODO
}

// 2. The field object whose name matches, or undefined when there is none.
function findField(fields, name) {
  // TODO
}

// 3. true if at least one field has this type (for example "password").
function hasType(fields, type) {
  // TODO
}

// 4. true when EVERY name in names has a value in values that is a string
//    with something in it (spaces alone do not count).
function allFilled(names, values) {
  // TODO
}

// 5. The name of the last required field, or undefined if nothing is required.
function lastRequired(fields) {
  // TODO
}
`,
      solutionAdd: t`const SAMPLE_FIELDS = [
  { name: "fullName", label: "Full name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: false },
];

function requiredFields(fields) {
  return fields.filter((field) => field.required === true).map((field) => field.name);
}

function findField(fields, name) {
  return fields.find((field) => field.name === name);
}

function hasType(fields, type) {
  return fields.some((field) => field.type === type);
}

function allFilled(names, values) {
  return names.every((name) => {
    const value = values?.[name];
    return typeof value === "string" && value.trim() !== "";
  });
}

function lastRequired(fields) {
  return requiredFields(fields).at(-1);
}`,
      explanation:
        "requiredFields is a filter followed by a map: the filter decides which fields stay, the map turns each survivor into just its name. find returns the original object (or undefined), some answers a yes/no question and stops at the first yes, and every is true only if no item fails, which is why an empty list of names counts as 'all filled'. Notice that allFilled checks typeof value === 'string' before calling trim(): form data from outside is not guaranteed to be text. lastRequired reuses requiredFields and takes the final item with at(-1), so the answer lives in one place.",
      hints: [
        {
          id: "h1",
          title: "Filter then map",
          content:
            "requiredFields: fields.filter((field) => field.required === true) gives the required field objects. Chain .map((field) => field.name) onto the end to keep only the names. Do not forget the word return.",
        },
        {
          id: "h2",
          title: "find, some, every",
          content:
            "findField: fields.find((field) => field.name === name). hasType: fields.some((field) => field.type === type). allFilled: names.every((name) => ...) where the callback looks up values[name], checks typeof value === 'string' and that value.trim() is not ''.",
        },
        {
          id: "h3",
          title: "The last one",
          content:
            "lastRequired can call requiredFields(fields) and then use .at(-1) on the result. On an empty array, at(-1) gives undefined, which is exactly the answer you want.",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "requiredFields returns the names of required fields in order",
          assertionCode: t`const fields = [
  { name: "fullName", type: "text", required: true },
  { name: "email", type: "email", required: true },
  { name: "phone", type: "tel", required: false },
  { name: "password", type: "password", required: true },
  { name: "note", type: "textarea", required: false },
];
const result = requiredFields(fields);
assert(Array.isArray(result), "requiredFields should return an array (did you forget the return?)");
assertEqual(result, ["fullName", "email", "password"], "requiredFields(fields)");`,
        },
        {
          id: "t2",
          description: "requiredFields handles empty and sloppy input without changing it",
          assertionCode: t`assertEqual(requiredFields([]), [], "An empty list has no required fields");
const odd = [{ name: "a" }, { name: "b", required: "yes" }, { name: "c", required: true }];
const copy = JSON.stringify(odd);
assertEqual(requiredFields(odd), ["c"], "Only required: true counts (a missing flag and the string 'yes' do not)");
assert(JSON.stringify(odd) === copy, "requiredFields must not modify the list it was given");`,
        },
        {
          id: "t3",
          description: "findField returns the very same object, or undefined",
          assertionCode: t`const email = { name: "email", type: "email" };
const fields = [{ name: "fullName" }, email];
assert(findField(fields, "email") === email, "findField should return the field object itself");
assert(findField(fields, "zip") === undefined, "A missing field should give undefined (not null, false or -1)");
assert(findField([], "email") === undefined, "An empty list never contains the field");`,
        },
        {
          id: "t4",
          description: "hasType answers with a real boolean",
          assertionCode: t`const fields = [{ name: "a", type: "text" }, { name: "b", type: "password" }];
assert(hasType(fields, "password") === true, "hasType(fields, 'password') should be true");
assert(hasType(fields, "tel") === false, "hasType(fields, 'tel') should be false");
assert(hasType([], "text") === false, "An empty list has no fields of any type");`,
        },
        {
          id: "t5",
          description: "allFilled needs every named value to be a non-blank string",
          assertionCode: t`assert(allFilled(["a", "b"], { a: "x", b: "y" }) === true, "Both values are filled, expected true");
assert(allFilled(["a", "b"], { a: "x", b: "" }) === false, "An empty string is not filled");
assert(allFilled(["a", "b"], { a: "x", b: "   " }) === false, "Spaces alone are not filled (use trim())");
assert(allFilled(["a", "b"], { a: "x" }) === false, "A missing value is not filled");
assert(allFilled(["a"], { a: 42 }) === false, "A number is not a string, so it does not count as filled text");
assert(allFilled([], {}) === true, "With no names to check, every() is true");
assert(allFilled(["a"], undefined) === false, "Missing values object: nothing is filled (but it must not crash)");`,
        },
        {
          id: "t6",
          description: "lastRequired picks the final required field",
          assertionCode: t`const fields = [
  { name: "a", required: true },
  { name: "b", required: false },
  { name: "c", required: true },
  { name: "d", required: false },
];
assert(lastRequired(fields) === "c", "The last required field is 'c'");
assert(lastRequired([{ name: "x", required: false }]) === undefined, "No required fields means undefined");
assert(lastRequired([]) === undefined, "An empty list means undefined");`,
        },
      ],
      checks: [
        {
          prompt: t`What does ^^[].every((n) => n > 0)^^ return?`,
          question: { type: "choice", options: ["true", "false", "undefined", "It throws a TypeError"], answer: 0 },
          explanation:
            "every() is true when no item fails the test. An empty array has no items to fail, so the answer is true (vacuous truth). The opposite holds for some(): [].some(...) is false. Keep this in mind whenever a list can be empty.",
        },
        {
          prompt: t`What is ^^[1, 2, 3].map((n) => { n * 2 })^^ ?`,
          question: { type: "choice", options: ["[2, 4, 6]", "[undefined, undefined, undefined]", "[1, 2, 3]", "6"], answer: 1 },
          explanation:
            "Curly braces turn the arrow function's body into a block, and a block returns nothing unless you write return. Either remove the braces ((n) => n * 2) or add return n * 2.",
        },
        {
          prompt: t`^^fields.find(...)^^ matches nothing. What do you get back?`,
          question: { type: "choice", options: ["-1", "null", "undefined", "An empty array"], answer: 2 },
          explanation: "find() returns undefined on a miss. -1 is what indexOf and findIndex return, and filter returns an empty array. Mixing these up is a classic bug.",
        },
      ],
      unlocks: ["ff-form"],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "form-forge-2-array-shaping",
      title: "Totals, sorting and lookups",
      minutes: 30,
      xp: 110,
      concepts: ["reduce", "flatMap", "sort with a comparator", "copying arrays", "Set", "Array.from"],
      learn: t`### Folding a list into one value with reduce

Checkout does more than check boxes: it has a basket. The total price is one number made from many items, and that is the job of **reduce**.

~~~js
const prices = [1200, 450, 300];
const total = prices.reduce((sum, price) => sum + price, 0);   // 1950
~~~

The callback receives the **accumulator** (the running result so far) and the current item, and whatever it returns becomes the next accumulator. The second argument, ^^0^^, is where the accumulator starts. Always supply it: ^^[].reduce((a, b) => a + b)^^ with no starting value throws a ^^TypeError^^ the first time a basket is empty.

Reduce is not limited to numbers. The accumulator can be an object, which makes it the standard way to tally things:

~~~js
const types = ["text", "email", "text", "tel", "text"];
const counts = types.reduce((tally, type) => {
  tally[type] = (tally[type] ?? 0) + 1;
  return tally;                     // forget this line and the next round gets undefined
}, {});
// { text: 3, email: 1, tel: 1 }
~~~

(Money tip: store prices as whole **cents**. ^^0.1 + 0.2^^ is ^^0.30000000000000004^^ in JavaScript, and nobody wants that on a receipt.)

### flatMap: map, then flatten one level

Each basket item can carry add-ons (a gift wrap, a longer warranty). To get *every* SKU, items and add-ons together, ^^map^^ would give you an array of arrays. ^^flatMap^^ maps and then flattens one level:

~~~js
const items = [
  { sku: "KB-01", addOns: [{ sku: "WR-02" }] },
  { sku: "MS-07", addOns: [] },
];
items.map((i) => [i.sku, ...i.addOns.map((a) => a.sku)]);       // [["KB-01", "WR-02"], ["MS-07"]]
items.flatMap((i) => [i.sku, ...i.addOns.map((a) => a.sku)]);   // ["KB-01", "WR-02", "MS-07"]
~~~

The ^^...^^ in the middle is the **spread** operator: it unpacks an array's items in place. You will meet it again for objects in the next lesson. To remove duplicates, wrap a list in a **Set** (a collection of unique values) and spread it back out:

~~~js
[...new Set(["a", "b", "a"])];   // ["a", "b"]  (first-seen order is kept)
~~~

### sort: powerful, mutating, and surprising

~~~js
[10, 9, 1].sort();                 // [1, 10, 9]   !!
~~~

With no comparator, ^^sort^^ turns every item into a *string* and compares those, so ^^"10"^^ comes before ^^"9"^^. For anything but plain text you must pass a **comparator**: a function ^^(a, b)^^ that returns a negative number if ^^a^^ should come first, a positive number if ^^b^^ should, and ^^0^^ if they tie.

~~~js
prices.sort((a, b) => a - b);      // ascending numbers
prices.sort((a, b) => b - a);      // descending numbers
names.sort((a, b) => a.localeCompare(b));   // text, in the user's alphabet rules
~~~

Two more facts. First, **^^sort^^ changes the array it is called on** (so does ^^reverse^^). If the array belongs to somebody else, such as the form's data, copy it first: ^^[...items].sort(...)^^. Newer runtimes also have ^^toSorted^^, which returns a sorted copy. Second, sorting is **stable**: items that tie keep their original order, so you can sort by several keys by returning the first non-zero difference:

~~~js
[...items].sort((a, b) => b.priceCents - a.priceCents || a.name.localeCompare(b.name));
~~~

A comparator that returns a *boolean* (^^(a, b) => a > b^^) is a common bug: ^^true^^ and ^^false^^ become 1 and 0, and "less than" is never reported.

### Array.from builds arrays

~~~js
Array.from({ length: 3 }, (_, i) => i * 10);   // [0, 10, 20]
Array.from("abc");                              // ["a", "b", "c"]
~~~

The first form is how you make an array of a given size when you have no source to map over. The same trick works with ^^[...text]^^ for strings.

### A real-world fold: the Luhn check

Card numbers end with a **check digit** so typos are caught before the payment network ever sees them. The Luhn algorithm: from the right, double every second digit (subtracting 9 if the result passes 9), add everything up, and the total must be divisible by 10. It is a tidy exercise in chaining array methods.

### Common mistakes

- **No initial value for ^^reduce^^**, which crashes on empty input and gives the wrong shape for non-numbers.
- **Forgetting to return the accumulator** from the callback.
- **Sorting numbers without a comparator**, or returning a boolean from one.
- **Sorting a shared array in place.** Copy first.
- **Calling ^^flat^^ or ^^flatMap^^ and expecting deep flattening.** They go one level by default.`,
      mission: t`The shopper's basket is on screen, and the checkout page has to turn it into facts: what is the total, which item is the priciest, which SKUs are involved, and how many of each field type does the form contain. It also has to catch mistyped card numbers before they are sent anywhere.

Write the basket helpers and the Luhn checker. When you Run, the order summary appears: the basket sorted by price, its total, and every SKU on the order.`,
      tasks: [
        "orderTotal(items): total in cents, counting add-ons on every unit (reduce)",
        "countByType(fields): how many fields have each type, as an object (reduce into an object)",
        "sortByPrice(items): a NEW array, priciest first, ties alphabetical by name (sort with a comparator)",
        "allSkus(items): every distinct SKU including add-ons (flatMap + Set), and luhnCheck(digits)",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: the basket helpers.
// An item looks like:
//   { sku: "KB-01", name: "Keyboard", priceCents: 8900, qty: 1,
//     addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] }
// (addOns may be missing. Prices are whole cents.)

// 1. Total in cents. Each unit costs its price PLUS all of its add-ons;
//    multiply that by qty, and add the lines up. An empty basket costs 0.
function orderTotal(items) {
  // TODO (reduce, and don't forget the starting value)
}

// 2. How many fields have each type: { text: 5, email: 1, ... }
function countByType(fields) {
  // TODO (reduce with an object as the accumulator)
}

// 3. A NEW array sorted by priceCents, highest first.
//    Items with the same price are sorted by name, A to Z (localeCompare).
//    The original array must stay exactly as it was.
function sortByPrice(items) {
  // TODO
}

// 4. Every distinct SKU on the order: each item's sku followed by its add-ons' skus,
//    duplicates removed, first-seen order kept.
function allSkus(items) {
  // TODO (flatMap, then new Set)
}

// 5. The Luhn check for a string of digits. Returns false for "" or anything that is
//    not purely digits. Doubling starts at the second digit FROM THE RIGHT.
function luhnCheck(digits) {
  // TODO
}
`,
      solutionAdd: t`function orderTotal(items) {
  return items.reduce((total, { priceCents, qty, addOns = [] }) => {
    const unit = priceCents + addOns.reduce((sum, addOn) => sum + addOn.priceCents, 0);
    return total + unit * qty;
  }, 0);
}

function countByType(fields) {
  return fields.reduce((counts, { type }) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

function sortByPrice(items) {
  return [...items].sort((a, b) => b.priceCents - a.priceCents || a.name.localeCompare(b.name));
}

function allSkus(items) {
  const skus = items.flatMap((item) => [item.sku, ...(item.addOns ?? []).map((addOn) => addOn.sku)]);
  return [...new Set(skus)];
}

function luhnCheck(digits) {
  if (typeof digits !== "string" || digits === "") return false;
  if ([...digits].some((ch) => ch < "0" || ch > "9")) return false;
  const total = [...digits]
    .reverse()
    .map(Number)
    .map((digit, i) => {
      if (i % 2 === 0) return digit;
      const doubled = digit * 2;
      return doubled > 9 ? doubled - 9 : doubled;
    })
    .reduce((sum, digit) => sum + digit, 0);
  return total % 10 === 0;
}`,
      explanation:
        "orderTotal folds the basket into one number: for each line it adds the add-ons to the unit price (a reduce inside a reduce) and multiplies by the quantity. countByType uses an object as the accumulator and returns it every round. sortByPrice copies with spread before sorting because sort mutates, and its comparator returns the first non-zero difference (price, then name). allSkus uses flatMap so each item contributes a variable number of SKUs, and a Set removes repeats while keeping first-seen order. luhnCheck spreads the string into digits, reverses the copy, doubles every second one, and reduces to a sum; a quick some() beforehand rejects anything that is not a digit.",
      hints: [
        {
          id: "h1",
          title: "orderTotal",
          content:
            "items.reduce((total, item) => ..., 0). Inside, work out the unit price: item.priceCents plus the sum of the add-ons' priceCents (another reduce, starting at 0, over item.addOns ?? []). Then return total + unit * item.qty.",
        },
        {
          id: "h2",
          title: "Counting and sorting",
          content:
            "countByType: reduce into {} and do counts[type] = (counts[type] ?? 0) + 1; return counts. sortByPrice: [...items].sort((a, b) => b.priceCents - a.priceCents || a.name.localeCompare(b.name)). The || only falls through to the name when the price difference is 0.",
        },
        {
          id: "h3",
          title: "SKUs and Luhn",
          content:
            "allSkus: items.flatMap((item) => [item.sku, ...(item.addOns ?? []).map((a) => a.sku)]) and wrap the result in [...new Set(...)]. luhnCheck: [...digits].reverse().map(Number), then for odd indexes (1, 3, 5...) double the digit and subtract 9 if it is over 9, then sum with reduce and check total % 10 === 0.",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "orderTotal adds up lines and add-ons",
          assertionCode: t`const items = [
  { sku: "KB-01", name: "Keyboard", priceCents: 8900, qty: 1, addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] },
  { sku: "MS-07", name: "Mouse", priceCents: 2950, qty: 2, addOns: [] },
  { sku: "CB-12", name: "Cable", priceCents: 1200, qty: 3, addOns: [{ sku: "WR-02", name: "Wrist rest", priceCents: 1500 }] },
];
assertEqual(orderTotal(items), 24400, "Keyboard 10400 + mice 5900 + cables 8100");`,
        },
        {
          id: "t2",
          description: "orderTotal copes with an empty basket and missing addOns",
          assertionCode: t`assert(orderTotal([]) === 0, "An empty basket should cost 0 (give reduce a starting value)");
assert(orderTotal([{ sku: "X", priceCents: 500, qty: 2 }]) === 1000, "An item without addOns still counts: 500 x 2");
const items = [{ sku: "X", name: "x", priceCents: 100, qty: 1, addOns: [] }];
const before = JSON.stringify(items);
orderTotal(items);
assert(JSON.stringify(items) === before, "orderTotal must not change the basket");`,
        },
        {
          id: "t3",
          description: "countByType tallies field types into an object",
          assertionCode: t`const fields = [{ type: "text" }, { type: "email" }, { type: "text" }, { type: "tel" }, { type: "text" }];
assertEqual(countByType(fields), { text: 3, email: 1, tel: 1 }, "countByType(fields)");
assertEqual(countByType([]), {}, "No fields means an empty object");`,
        },
        {
          id: "t4",
          description: "sortByPrice sorts a copy, priciest first, ties by name",
          assertionCode: t`const items = [
  { name: "b-cable", priceCents: 100 },
  { name: "mouse", priceCents: 2950 },
  { name: "a-cable", priceCents: 100 },
  { name: "keyboard", priceCents: 8900 },
];
const names = items.map((i) => i.name).join();
const sorted = sortByPrice(items);
assert(sorted !== items, "sortByPrice should return a new array, not the same one");
assert(items.map((i) => i.name).join() === names, "The original array was reordered: copy it before you sort");
assertEqual(sorted.map((i) => i.name), ["keyboard", "mouse", "a-cable", "b-cable"], "Order should be by price descending, then name");
assertEqual(sortByPrice([{ name: "x", priceCents: 10 }, { name: "y", priceCents: 9 }, { name: "z", priceCents: 1000 }]).map((i) => i.priceCents), [1000, 10, 9], "Numbers must be compared as numbers (10 comes before 9, but 1000 before both)");`,
        },
        {
          id: "t5",
          description: "allSkus flattens items and add-ons without repeats",
          assertionCode: t`const items = [
  { sku: "KB-01", addOns: [{ sku: "WR-02" }] },
  { sku: "MS-07", addOns: [] },
  { sku: "CB-12", addOns: [{ sku: "WR-02" }] },
  { sku: "MS-07" },
];
assertEqual(allSkus(items), ["KB-01", "WR-02", "MS-07", "CB-12"], "Each SKU once, in first-seen order");
assertEqual(allSkus([]), [], "No items, no SKUs");`,
        },
        {
          id: "t6",
          description: "luhnCheck accepts real test numbers and rejects typos",
          assertionCode: t`assert(luhnCheck("4242424242424242") === true, "4242424242424242 is a valid test number");
assert(luhnCheck("4111111111111111") === true, "4111111111111111 is a valid test number");
assert(luhnCheck("79927398713") === true, "79927398713 is the classic valid Luhn example");
assert(luhnCheck("4242424242424241") === false, "Changing the last digit breaks the check");
assert(luhnCheck("4242424242424224") === false, "Swapping two digits breaks the check");`,
        },
        {
          id: "t7",
          description: "luhnCheck rejects empty and non-digit input safely",
          assertionCode: t`assert(luhnCheck("") === false, "An empty string is not a card number");
assert(luhnCheck("4242 4242 4242 4242") === false, "Spaces are not digits (clean the text first)");
assert(luhnCheck("abcd") === false, "Letters are not digits");
assert(luhnCheck(null) === false && luhnCheck(undefined) === false && luhnCheck(4242424242424242) === false, "Anything that is not a string should be false, without crashing");`,
        },
      ],
      checks: [
        {
          prompt: t`What does ^^[10, 9, 1].sort()^^ return?`,
          question: { type: "choice", options: ["[1, 9, 10]", "[1, 10, 9]", "[10, 9, 1]", "[9, 10, 1]"], answer: 1 },
          explanation: "Without a comparator, sort converts items to strings and compares them as text. As strings, '1' < '10' < '9'. Always pass (a, b) => a - b for numbers.",
        },
        {
          prompt: t`What happens with ^^[].reduce((a, b) => a + b)^^ (no starting value)?`,
          question: { type: "choice", options: ["It returns 0", "It returns undefined", "It throws a TypeError", "It returns an empty array"], answer: 2 },
          explanation: "With no starting value, reduce uses the first item as the accumulator, and an empty array has no first item, so it throws. Passing 0 (or {}, or []) as the second argument makes empty input safe.",
        },
        {
          prompt: t`You must show a sorted list but keep the original order available. Which is the safe pattern?`,
          question: {
            type: "choice",
            options: ["list.sort(compare)", "[...list].sort(compare)", "list.reverse().sort(compare)", "list.map(compare)"],
            answer: 1,
          },
          explanation: "sort and reverse change the array they are called on. Copying first with [...list] (or using toSorted) leaves the original untouched.",
        },
      ],
      unlocks: ["ff-order"],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "form-forge-3-objects",
      title: "Objects: defaults, copies and secrets",
      minutes: 30,
      xp: 120,
      concepts: ["destructuring", "defaults & renaming", "spread & rest", "Object.entries / fromEntries", "?. and ??", "shallow vs deep copy", "structuredClone"],
      learn: t`### Objects are the form's other half

Fields are a list; the *values* shoppers type are an object: ^^{ fullName: "Ada", email: "ada@example.com" }^^. Real data is messy: keys are missing, values are ^^null^^, and nested pieces (like an address) may not exist at all. This lesson is the toolkit for handling that calmly.

### Destructuring: unpack what you need

~~~js
const user = { fullName: "Ada Lovelace", email: "ada@example.com", plan: "pro" };

const { fullName, email } = user;              // two variables, named after the keys
const { plan: tier } = user;                   // rename: the key is plan, the variable is tier
const { phone = "none" } = user;               // default: used only when the value is undefined
const { address: { city } = {} } = user;       // nested, with a default object so it cannot crash
~~~

You can destructure straight in a function's parameter list, which documents what the function needs:

~~~js
function greet({ fullName, plan = "free" }) {
  return ^^Hello $\{fullName} ($\{plan})^^;
}
~~~

**A default only replaces ^^undefined^^.** It does *not* replace ^^null^^, ^^""^^ or ^^0^^. That detail causes a lot of real bugs, which is why the next tool exists.

### Optional chaining and nullish coalescing

~~~js
const order = { shipping: null };

order.shipping.address.city;                    // TypeError: cannot read properties of null
order.shipping?.address?.city;                  // undefined: ?. stops at the first null or undefined
order.shipping?.address?.city ?? "unknown";     // "unknown": ?? supplies a fallback
~~~

^^?.^^ short-circuits to ^^undefined^^ when the thing before it is ^^null^^ or ^^undefined^^ (it also works for calls, ^^obj.method?.()^^, and for indexes, ^^list?.[0]^^). ^^??^^ picks the right side **only** when the left side is ^^null^^ or ^^undefined^^.

Compare it with the older ^^||^^:

~~~js
const quantity = 0;
quantity || 1;      // 1   ← wrong: 0 is falsy, so || throws away a legitimate zero
quantity ?? 1;      // 0   ← right: 0 is a real value
~~~

Use ^^??^^ for defaults, and ^^||^^ only when you really mean "any falsy value".

### Spread and rest

Three dots do two opposite jobs. In an object literal they **spread** an object's properties in; in a destructuring pattern they **collect the rest**.

~~~js
const base = { country: "US", note: "" };
const merged = { ...base, country: "GB" };       // later keys win: { country: "GB", note: "" }

const { password, ...safe } = { email: "a@b.co", password: "hunter2" };
// password === "hunter2"; safe === { email: "a@b.co" }  (a handy way to drop a key)
~~~

Neither one changes the original object: they build new ones.

### Object.entries, Object.fromEntries

Turn an object into a list of ^^[key, value]^^ pairs, use all the array methods you already know, and turn it back:

~~~js
const values = { fullName: "Ada", note: "", phone: null };

Object.keys(values);      // ["fullName", "note", "phone"]
Object.values(values);    // ["Ada", "", null]
Object.entries(values);   // [["fullName", "Ada"], ["note", ""], ["phone", null]]

Object.fromEntries(
  Object.entries(values).filter(([, value]) => value !== null && value !== ""),
);                        // { fullName: "Ada" }
~~~

^^[, value]^^ destructures each pair and skips the key. To check that an object has its own key (as opposed to inheriting one such as ^^toString^^), use ^^Object.hasOwn(obj, "key")^^.

### Copies: shallow versus deep

Spread and ^^Object.assign^^ make **shallow** copies. The top level is new, but anything nested is still the *same object*:

~~~js
const saved = { email: "a@b.co", address: { city: "Leeds" } };
const draft = { ...saved };
draft.address.city = "York";
saved.address.city;          // "York" !! both point at one address
~~~

For a **deep** copy use ^^structuredClone^^, built into browsers and Node:

~~~js
const safeDraft = structuredClone(saved);
safeDraft.address.city = "York";
saved.address.city;          // "Leeds"
~~~

^^structuredClone^^ copies nested objects, arrays, Dates, Maps and Sets, and it survives cycles. It *cannot* copy functions (it throws a ^^DataCloneError^^), and it drops class prototypes. The old trick ^^JSON.parse(JSON.stringify(x))^^ also deep copies, but it silently turns Dates into strings and loses ^^undefined^^ and ^^NaN^^. Prefer ^^structuredClone^^.

### Common mistakes

- **Mutating an argument.** ^^function f(values) { values.country = "US"; }^^ edits the caller's data. Return a new object instead.
- **Using ^^||^^ for defaults** on data that can legitimately be ^^0^^, ^^false^^ or ^^""^^.
- **Destructuring a ^^null^^.** ^^const { city } = null^^ throws. A default of ^^{}^^ only helps for ^^undefined^^; use ^^?.^^ when ^^null^^ is possible.
- **Believing a spread copy is a deep copy.**
- **Looking up user-supplied keys with ^^obj[key]^^.** A key like ^^"constructor"^^ finds something on every object. We will fix this properly with ^^Object.hasOwn^^ later in the course.`,
      mission: t`Values arrive from the page as a loose bag of properties: some missing, some ^^null^^, some blank, and some of them secrets you must never write into a log. The engine needs to describe a customer in one line, fill in missing values without trampling real ones, keep only what was actually filled, strip secrets, and edit a saved draft without corrupting the saved copy.

When you Run, a live **state panel** appears beside the form: it shows what your code sees as the shopper types.`,
      tasks: [
        "summarize(customer): one readable line using destructuring with defaults, renaming and ?.",
        "withDefaults(values, defaults) and compact(values): fill gaps with ??, and drop blanks with entries / fromEntries",
        "withoutSecrets(values): drop password, confirm, cvc and cardNumber with rest destructuring",
        "editDraft(saved, changes): a deep-copied draft with the changes applied, leaving saved untouched",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: handle messy values calmly.

// What every form field is when nothing has been typed yet.
const DEFAULTS = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  confirm: "",
  phone: "",
  address: "",
  city: "",
  postcode: "",
  country: "US",
  note: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

// 1. One readable line: "Ada Lovelace <ada@example.com> · London"
//    Destructure the parameter: fullName (default "Anonymous"), email (default "no email"),
//    and address. The city comes from address, which may be missing OR null:
//    use ?. and ?? "unknown city".
function summarize(customer = {}) {
  // TODO
}

// 2a. A NEW object with exactly the keys of defaults. Each value is values[key],
//     or the default when that is null or undefined. A blank "" is a real value: keep it.
//     Keys that are not in defaults are dropped. Neither argument may change.
function withDefaults(values, defaults = DEFAULTS) {
  // TODO (Object.entries / map / Object.fromEntries and ??)
}

// 2b. A copy without the blank entries: remove values that are null, undefined,
//     or a string that is empty after trim(). Keep 0 and false.
function compact(values) {
  // TODO
}

// 3. A copy without password, confirm, cvc and cardNumber (rest destructuring).
function withoutSecrets(values) {
  // TODO
}

// 4. A new object: a DEEP copy of saved with the keys of changes laid over the top.
//    Editing the result's nested objects must never touch saved.
function editDraft(saved, changes) {
  // TODO (structuredClone, then spread)
}
`,
      solutionAdd: t`const DEFAULTS = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  confirm: "",
  phone: "",
  address: "",
  city: "",
  postcode: "",
  country: "US",
  note: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
};

function summarize({ fullName = "Anonymous", email = "no email", address } = {}) {
  const city = address?.city ?? "unknown city";
  return ^^$\{fullName} <$\{email}> · $\{city}^^;
}

function withDefaults(values, defaults = DEFAULTS) {
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, values?.[key] ?? fallback]));
}

function compact(values) {
  return Object.fromEntries(
    Object.entries(values ?? {}).filter(([, value]) => value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "")),
  );
}

function withoutSecrets(values) {
  const { password, confirm, cvc, cardNumber, ...safe } = values;
  return safe;
}

function editDraft(saved, changes) {
  return { ...structuredClone(saved), ...changes };
}`,
      explanation:
        "summarize destructures in the parameter list, renames nothing but supplies defaults for missing values, and reads the city with ?. and ?? so a missing or null address cannot crash it. withDefaults turns the defaults object into entries, swaps in the caller's value when ?? says it exists, and rebuilds an object, which also drops unknown keys; a blank string survives because ?? only reacts to null and undefined. compact is the same entries / filter / fromEntries pattern with a stricter filter. withoutSecrets pulls four keys out with rest destructuring and returns what is left. editDraft deep copies first (structuredClone) and then spreads the changes on top, so nested objects are never shared with the saved copy.",
      hints: [
        {
          id: "h1",
          title: "summarize",
          content: t`Destructure in the parameter: function summarize({ fullName = 'Anonymous', email = 'no email', address } = {}). Then const city = address?.city ?? 'unknown city'; and return a template literal with backticks: ^^$\{fullName} <$\{email}> · $\{city}^^.`,
        },
        {
          id: "h2",
          title: "entries, map, fromEntries",
          content:
            "withDefaults: Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, values?.[key] ?? fallback])). For compact, filter the entries instead: .filter(([, value]) => ...) keeping a pair when value is not null/undefined and not a blank string.",
        },
        {
          id: "h3",
          title: "Rest and clone",
          content:
            "const { password, confirm, cvc, cardNumber, ...safe } = values; return safe; (the four names are unused on purpose). For editDraft: return { ...structuredClone(saved), ...changes };",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "summarize builds the one-line description",
          assertionCode: t`assertEqual(summarize({ fullName: "Ada Lovelace", email: "ada@example.com", address: { city: "London" } }), "Ada Lovelace <ada@example.com> · London", "summarize(a full customer)");`,
        },
        {
          id: "t2",
          description: "summarize survives missing and null pieces",
          assertionCode: t`assertEqual(summarize({ fullName: "Bo", email: "bo@x.org" }), "Bo <bo@x.org> · unknown city", "A missing address should say unknown city");
assertEqual(summarize({ fullName: "Bo", email: "bo@x.org", address: null }), "Bo <bo@x.org> · unknown city", "A null address must not crash (destructuring defaults do not cover null; use ?.)");
assertEqual(summarize({ address: {} }), "Anonymous <no email> · unknown city", "Missing name and email should use the defaults");
assertEqual(summarize(), "Anonymous <no email> · unknown city", "Calling with no argument at all should still work");`,
        },
        {
          id: "t3",
          description: "withDefaults fills gaps but keeps real values, blanks included",
          assertionCode: t`const input = { email: "a@b.co", country: null, city: "", extra: "ignore me" };
const copy = JSON.stringify(input);
const result = withDefaults(input);
assert(result.email === "a@b.co", "A real value should be kept");
assert(result.country === "US", "null should fall back to the default country, US");
assert(result.city === "", "An empty string is a real value; ?? must keep it (|| would not)");
assert(result.fullName === "", "A missing key should take its default");
assert(!("extra" in result), "Keys that are not in the defaults should be dropped");
assertEqual(Object.keys(result), Object.keys(DEFAULTS), "The result should have exactly the keys of DEFAULTS");
assert(JSON.stringify(input) === copy, "withDefaults must not modify its input");
assert(DEFAULTS.country === "US" && DEFAULTS.email === "", "withDefaults must not modify DEFAULTS");`,
        },
        {
          id: "t4",
          description: "withDefaults accepts a custom defaults object",
          assertionCode: t`assertEqual(withDefaults({ a: 1 }, { a: 0, b: 2 }), { a: 1, b: 2 }, "withDefaults({ a: 1 }, { a: 0, b: 2 })");
assertEqual(withDefaults(undefined, { a: 5 }), { a: 5 }, "Missing values should just give the defaults");`,
        },
        {
          id: "t5",
          description: "compact removes only the blank entries",
          assertionCode: t`const result = compact({ a: "x", b: "", c: "   ", d: null, e: undefined, f: 0, g: false });
assertEqual(result, { a: "x", f: 0, g: false }, "compact should drop '', '   ', null and undefined but keep 0 and false");
assertEqual(compact({}), {}, "compact of an empty object");`,
        },
        {
          id: "t6",
          description: "withoutSecrets drops the four secret keys and nothing else",
          assertionCode: t`const input = { email: "a@b.co", password: "hunter2", confirm: "hunter2", cvc: "123", cardNumber: "4242424242424242", city: "Leeds" };
const copy = JSON.stringify(input);
assertEqual(withoutSecrets(input), { email: "a@b.co", city: "Leeds" }, "withoutSecrets(input)");
assert(JSON.stringify(input) === copy, "withoutSecrets must leave the original object alone");
assertEqual(withoutSecrets({}), {}, "Nothing to remove");`,
        },
        {
          id: "t7",
          description: "editDraft makes a deep copy and never touches the saved object",
          assertionCode: t`const saved = { email: "a@b.co", address: { city: "Leeds", lines: ["1 High St"] } };
const draft = editDraft(saved, { email: "new@b.co" });
assert(draft.email === "new@b.co", "The changes should be applied");
assert(saved.email === "a@b.co", "The saved object must keep its old email");
assert(draft !== saved && draft.address !== saved.address, "address must be a separate copy (a spread copy is only shallow)");
draft.address.city = "York";
draft.address.lines.push("Flat 2");
assert(saved.address.city === "Leeds" && saved.address.lines.length === 1, "Editing the draft's nested data changed the saved object: use structuredClone");`,
        },
      ],
      checks: [
        {
          prompt: t`^^const qty = 0;^^ What are ^^qty || 1^^ and ^^qty ?? 1^^ ?`,
          question: { type: "choice", options: ["1 and 1", "1 and 0", "0 and 1", "0 and 0"], answer: 1 },
          explanation: "|| replaces any falsy value, so 0 becomes 1. ?? replaces only null and undefined, so 0 survives. For defaults on data that can be 0, false or '', use ??.",
        },
        {
          prompt: t`After ^^const copy = { ...saved }^^ you run ^^copy.address.city = "York"^^. What happens to ^^saved.address.city^^ ?`,
          question: { type: "choice", options: ["Nothing: copy is independent", "It also becomes 'York'", "It becomes undefined", "It throws a TypeError"], answer: 1 },
          explanation: "Spread copies only the top level. copy.address and saved.address are the same object, so a change through one is visible through the other. structuredClone(saved) gives a fully independent copy.",
        },
        {
          prompt: t`Which of these safely reads a city when ^^order.shipping^^ might be ^^null^^ ?`,
          question: {
            type: "choice",
            options: ["order.shipping.city", "order.shipping?.city", "order.shipping || .city", "order[shipping][city]"],
            answer: 1,
          },
          explanation: "order.shipping?.city stops and gives undefined when shipping is null or undefined. The plain dot version throws a TypeError in that case.",
        },
      ],
      unlocks: ["ff-state"],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "form-forge-4-strings",
      title: "Strings: clean what people type",
      minutes: 30,
      xp: 130,
      concepts: ["template literals", "trim / padStart / split / replaceAll", "normalize", "UTF-16 and code points", "slice vs substring"],
      learn: t`### Text is the hardest data type

Everything a person types arrives as a string, and strings are full of surprises: invisible spaces, accents that can be written two ways, emoji that count as two characters. A form engine earns its keep by turning that mess into one predictable shape.

### Template literals

Backticks make a **template literal**: it can span several lines and embeds any expression inside ^^$\{ }^^.

~~~js
const name = "Ada";
const total = 1999;
^^$\{name} owes $$\{(total / 100).toFixed(2)}^^;     // "Ada owes $19.99"
~~~

Use them instead of gluing pieces together with ^^+^^. (The ^^$^^ before ^^$\{^^ in that example is just a dollar sign.)

### Strings never change

Every string method **returns a new string**. The original is untouched, so call and *use* the result:

~~~js
let text = "  hi  ";
text.trim();            // returns "hi", but text is still "  hi  "
text = text.trim();     // now text is "hi"
~~~

### The cleaning toolbox

~~~js
"  Ada  ".trim();                       // "Ada"  (trimStart / trimEnd trim one side)
"7".padStart(2, "0");                   // "07"   (padEnd pads on the right)
"a,b,c".split(",");                     // ["a", "b", "c"]
["a", "b"].join(" - ");                 // "a - b"
"a-b-c".replaceAll("-", "");            // "abc"  (replace changes only the FIRST match)
"Hello".toUpperCase();                  // "HELLO"
"Hello".slice(1, 3);                    // "el"   (slice(-2) takes the last two characters)
"Hello".startsWith("He");               // true   (also endsWith and includes)
"ab".repeat(3);                         // "ababab"
~~~

Prefer ^^slice^^ over ^^substring^^ and the deprecated ^^substr^^: it has the simplest rules, including negative positions.

Splitting on a *pattern* needs a regular expression. ^^/\s+/^^ means "one or more whitespace characters", and ^^text.split(/\s+/)^^ splits on any run of spaces, tabs or newlines. You will learn regular expressions properly in the next chapter. For now, treat ^^/\s+/^^ as a spell.

### Strings are UTF-16 code units

JavaScript counts the *pieces* of a string in 16-bit units, not letters.

~~~js
"cafe".length;          // 4
"👍".length;             // 2 !!  one emoji, two code units
[..."👍"].length;        // 1    spreading (or for...of) walks whole code points
~~~

Spreading gives you whole **code points**, which fixes most emoji. A few visible "characters" (a family emoji, or a letter plus a combining accent) are *several* code points glued together; to count those as a person would, use ^^Intl.Segmenter^^. When you limit lengths or slice user text, spread first, or you may cut an emoji in half.

### The same word, written two ways

The letter é can be one character (U+00E9) or an e followed by a combining accent (U+0065 U+0301). They look identical and compare as **different**:

~~~js
"caf\u00e9" === "cafe\u0301";                          // false
"caf\u00e9" === "cafe\u0301".normalize("NFC");         // true
~~~

^^normalize("NFC")^^ puts text into the composed form. Do it to every piece of user text *before* comparing, storing or validating it, or two "identical" usernames can coexist.

### Do not over-clean

Cleaning is about removing **noise** (stray spaces, invisible characters, formatting), not about editing meaning. Do not title-case people's names: "McDonald", "de la Cruz", "van der Berg" and "ʻAbdullāh" are all correct as typed. A city, on the other hand, is reasonable to tidy. And **never trim or alter passwords**: a space may be part of a passphrase.

### Common mistakes

- **Expecting a method to change the string** (^^text.trim();^^ on its own line does nothing).
- **Using ^^replace^^ with a string** and wondering why only the first match changed: use ^^replaceAll^^.
- **Trusting ^^.length^^** for "how many characters", or slicing emoji in half.
- **Comparing without normalizing**, and forgetting case: for comparisons use ^^a.toLowerCase() === b.toLowerCase()^^ or ^^localeCompare^^.
- **Calling a string method on ^^undefined^^**: form data may be ^^null^^, so coerce first: ^^String(value ?? "")^^.`,
      mission: t`Shoppers paste card numbers with spaces, type their names with double spaces, and shout their city names. The engine has to turn all that into tidy, predictable text, show a card number the way a card looks, and mask it so only the last four digits ever appear on screen or in a log.

Write the string toolkit. When you Run, the form starts tidying values live: a cleaned name and city appear under the boxes, the card number is formatted and masked as you type, and the basket total is printed as real money.`,
      tasks: [
        "cleanText(value): always a string, NFC-normalized, trimmed, with runs of whitespace collapsed to one space",
        "titleCase(text) for city names, and digitsOnly(value) that keeps just 0-9",
        "formatCardNumber(value) (groups of four) and maskCard(value) (only the last four digits visible)",
        "formatMoney(cents): 1234567 becomes $12,345.67 (padStart for the cents)",
      ],
      starterAdd: t`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: clean and format text.

// 1. Always returns a string:
//    - null / undefined become "", other values are turned into text
//    - normalized to NFC, trimmed, and any run of whitespace becomes a single space
//    "  Ada \t Lovelace " -> "Ada Lovelace"
function cleanText(value) {
  // TODO
}

// 2a. Each word starts with a capital letter and continues in lowercase.
//     "LOS angeles" -> "Los Angeles". Use cleanText first. Take the first character
//     with destructuring so emoji and accents are safe:  const [first = "", ...rest] = word
function titleCase(text) {
  // TODO
}

// 2b. Keep only the characters 0-9 (as a string). Ignore everything else.
function digitsOnly(value) {
  // TODO (spread the string, filter, join)
}

// Helper (given): chunk("abcdefg", 3) -> ["abc", "def", "g"]
function chunk(text, size) {
  return Array.from({ length: Math.ceil(text.length / size) }, (_, i) => text.slice(i * size, (i + 1) * size));
}

// 3a. Digits only, at most 19 of them, in groups of four separated by single spaces.
//     "4242-4242 4242" -> "4242 4242 4242"
function formatCardNumber(value) {
  // TODO
}

// 3b. Hide everything except the last four digits: "4242 4242 4242 4242" -> "•••• •••• •••• 4242"
//     - up to four digits: all bullets, one per digit ("12" -> "••", "" -> "")
//     - otherwise: groups of "•••• " (one per started group of four hidden digits) + last four
//       (16 digits -> 3 groups, 15 digits -> 3 groups: ceil((length - 4) / 4))
function maskCard(value) {
  // TODO
}

// 4. Whole cents to dollars: 1234567 -> "$12,345.67", 5 -> "$0.05", -250 -> "-$2.50".
//    Round fractional cents first; anything that is not a finite number gives "$0.00".
//    Use padStart for the cents and toLocaleString("en-US") for the thousands separators.
function formatMoney(cents) {
  // TODO
}
`,
      solutionAdd: t`function cleanText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .split(/\s+/)
    .join(" ");
}

function titleCase(text) {
  return cleanText(text)
    .split(" ")
    .map((word) => {
      const [first = "", ...rest] = word;
      return first.toUpperCase() + rest.join("").toLowerCase();
    })
    .join(" ");
}

function digitsOnly(value) {
  return [...String(value ?? "")].filter((ch) => ch >= "0" && ch <= "9").join("");
}

function chunk(text, size) {
  return Array.from({ length: Math.ceil(text.length / size) }, (_, i) => text.slice(i * size, (i + 1) * size));
}

function formatCardNumber(value) {
  return chunk(digitsOnly(value).slice(0, 19), 4).join(" ");
}

function maskCard(value) {
  const digits = digitsOnly(value);
  if (digits.length <= 4) return "•".repeat(digits.length);
  return "•••• ".repeat(Math.ceil((digits.length - 4) / 4)) + digits.slice(-4);
}

function formatMoney(cents) {
  if (!Number.isFinite(cents)) return "$0.00";
  const sign = cents < 0 ? "-" : "";
  const whole = Math.abs(Math.round(cents));
  const dollars = Math.floor(whole / 100);
  return ^^$\{sign}$$\{dollars.toLocaleString("en-US")}.$\{String(whole % 100).padStart(2, "0")}^^;
}`,
      explanation:
        "cleanText coerces first (String(value ?? '')) so nothing downstream ever sees null, normalizes to NFC so accents compare equal, trims, and collapses whitespace by splitting on /\\s+/ and joining with one space. titleCase builds on it and uses array destructuring on each word so the first code point (not the first UTF-16 unit) is capitalised. digitsOnly spreads the string into characters and keeps only 0-9, which also rejects non-ASCII digits. formatCardNumber and maskCard share the digit cleaning; the mask never reveals more than the last four. formatMoney rounds, splits into dollars and cents, and pads the cents with padStart so 5 becomes '05'.",
      hints: [
        {
          id: "h1",
          title: "cleanText",
          content:
            "Chain it: String(value ?? '').normalize('NFC').trim().split(/\\s+/).join(' '). Splitting an empty string gives [''], which joins back to '', so the empty case works by itself.",
        },
        {
          id: "h2",
          title: "titleCase and digitsOnly",
          content:
            "titleCase: cleanText(text).split(' ').map(word => { const [first = '', ...rest] = word; return first.toUpperCase() + rest.join('').toLowerCase(); }).join(' '). digitsOnly: [...String(value ?? '')].filter(ch => ch >= '0' && ch <= '9').join('').",
        },
        {
          id: "h3",
          title: "Card and money",
          content:
            "formatCardNumber: chunk(digitsOnly(value).slice(0, 19), 4).join(' '). maskCard: if digits.length <= 4 return '•'.repeat(digits.length); otherwise '•••• '.repeat(Math.ceil((digits.length - 4) / 4)) + digits.slice(-4). formatMoney: sign, whole = Math.abs(Math.round(cents)), dollars = Math.floor(whole / 100), and String(whole % 100).padStart(2, '0') for the cents.",
        },
      ],
      tests: [
        {
          id: "t1",
          description: "cleanText trims, collapses whitespace and always returns a string",
          assertionCode: t`assertEqual(cleanText("  Ada   Lovelace \t"), "Ada Lovelace", "Spaces and tabs between words should become one space");
assertEqual(cleanText("a\n\n b"), "a b", "Newlines are whitespace too");
assertEqual(cleanText(""), "", "Empty stays empty");
assertEqual(cleanText(null), "", "null should become an empty string");
assertEqual(cleanText(undefined), "", "undefined should become an empty string");
assertEqual(cleanText(42), "42", "Numbers should be turned into text");`,
        },
        {
          id: "t2",
          description: "cleanText normalizes accents to one canonical form",
          assertionCode: t`const composed = "caf\u00e9";
const decomposed = "cafe\u0301";
assert(composed !== decomposed, "(setup) the two spellings differ before cleaning");
assert(cleanText(decomposed) === composed, "cleanText should normalize to NFC so both spellings become the same string");
assert(cleanText(decomposed).length === 4, "After NFC the word is 4 characters long");`,
        },
        {
          id: "t3",
          description: "titleCase capitalises each word and is emoji-safe",
          assertionCode: t`assertEqual(titleCase("new   york"), "New York", "titleCase('new   york')");
assertEqual(titleCase("LOS angeles"), "Los Angeles", "The rest of each word should be lowercased");
assertEqual(titleCase(""), "", "Empty stays empty");
assertEqual(titleCase("élan vital"), "Élan Vital", "Accented first letters should be capitalised");
assertEqual(titleCase("😀 party"), "😀 Party", "An emoji first character must not be broken in half");`,
        },
        {
          id: "t4",
          description: "digitsOnly keeps only the digits 0-9",
          assertionCode: t`assertEqual(digitsOnly("(555) 123-4567"), "5551234567", "digitsOnly('(555) 123-4567')");
assertEqual(digitsOnly("abc"), "", "No digits means an empty string");
assertEqual(digitsOnly(null), "", "null should give an empty string");
assertEqual(digitsOnly(1234.5), "12345", "Numbers are converted to text first");
assertEqual(digitsOnly("٣٤"), "", "Only the ASCII digits 0-9 count (Arabic-Indic digits are not kept)");`,
        },
        {
          id: "t5",
          description: "formatCardNumber groups digits in fours (max 19 digits)",
          assertionCode: t`assertEqual(formatCardNumber("4242424242424242"), "4242 4242 4242 4242", "A 16-digit number");
assertEqual(formatCardNumber("4242-4242 42"), "4242 4242 42", "Dashes and spaces are ignored, then regrouped");
assertEqual(formatCardNumber(""), "", "Empty stays empty");
assertEqual(formatCardNumber("1".repeat(25)), "1111 1111 1111 1111 111", "No more than 19 digits are kept");`,
        },
        {
          id: "t6",
          description: "maskCard hides everything but the last four digits",
          assertionCode: t`assertEqual(maskCard("4242 4242 4242 4242"), "•••• •••• •••• 4242", "A 16-digit number");
assertEqual(maskCard("378282246310005"), "•••• •••• •••• 0005", "A 15-digit number still shows only 4 digits");
assertEqual(maskCard("4242"), "••••", "With four digits nothing may be shown");
assertEqual(maskCard("12"), "••", "One bullet per digit when there are four or fewer");
assertEqual(maskCard(""), "", "Empty stays empty");
const masked = maskCard("4242424242424242");
assert(!masked.includes("4242 4242"), "Never show more than the last four digits");`,
        },
        {
          id: "t7",
          description: "formatMoney turns cents into dollars with separators",
          assertionCode: t`assertEqual(formatMoney(24400), "$244.00", "formatMoney(24400)");
assertEqual(formatMoney(5), "$0.05", "Cents below ten need a leading zero (padStart)");
assertEqual(formatMoney(123456789), "$1,234,567.89", "Thousands separators");
assertEqual(formatMoney(0), "$0.00", "Zero");
assertEqual(formatMoney(-250), "-$2.50", "Negative amounts put the minus sign first");
assertEqual(formatMoney(1999.6), "$20.00", "Fractional cents are rounded");
assertEqual(formatMoney(NaN), "$0.00", "NaN should not leak onto a receipt");
assertEqual(formatMoney("12"), "$0.00", "Only real numbers are money (a string is not)");`,
        },
      ],
      checks: [
        {
          prompt: t`What is ^^"👍".length^^ in JavaScript?`,
          question: { type: "number", answer: 2 },
          explanation: "JavaScript measures strings in UTF-16 code units, and this emoji needs two of them. [...'👍'].length is 1 because spreading walks whole code points. Some emoji sequences are several code points, so for human-style counting you need Intl.Segmenter.",
        },
        {
          prompt: t`^^const text = " ".repeat(2) + "hi" + " ".repeat(2); text.trim(); console.log(text.length);^^ What does it print?`,
          question: { type: "number", answer: 6 },
          explanation: "trim() returns a new string and leaves text alone, and the result was thrown away. text is still '  hi  ', six characters. Write text = text.trim() or use the returned value.",
        },
        {
          prompt: t`Why normalize user text to NFC before comparing usernames?`,
          question: {
            type: "choice",
            options: [
              "It makes the text lowercase",
              "The same visible text can be stored as different code point sequences that compare as unequal",
              "It removes emoji",
              "It makes strings faster to search",
            ],
            answer: 1,
          },
          explanation: "An accented letter can be one code point or a letter plus a combining mark. They render identically but are not === equal, so without normalization two 'identical' names could both be registered.",
        },
      ],
      unlocks: ["ff-clean"],
    },
  ],
};
