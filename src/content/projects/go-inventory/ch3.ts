import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { BT, go, js, md } from "../go-basics/util.ts";

/**
 * Chapter 3: Reusable parts and outside data. Generic helpers, a generic container, decoding JSON
 * and validating what was decoded.
 */

/** A supplier's stock export, with problems on purpose. Provided as ready-made text in lesson 11. */
const messyStockConst = go`// messyStock is a supplier's stock export, with problems on purpose.
const messyStock = ${BT}{
  "depot": "Cairn Depot",
  "items": [
    {"sku": "ROP-0412", "name": "Dynamic rope 60 m", "qty": 6, "bin": "A1-03"},
    {"sku": "HAR-0210", "name": "Rescue harness M", "qty": "nine", "bin": "B2-01"},
    {"sku": "HEL-0107", "name": "Climbing helmet", "bin": "B2-05"},
    {"sku": "RAD-0031", "name": "Handheld radio", "qty": 0, "bin": "C1-02"},
    {"sku": "BAT-0880", "name": "Radio battery pack", "qty": 22, "bin": "C1-04", "colour": "yellow"},
    {"sku": "SPL-0044", "name": "Vacuum splint", "qty": 2.5, "bin": "D3-07"}
  ]
}${BT}`;

/** A draft record set for the validation lesson. */
const draftStockConst = go`// draftStock is a draft stock sheet that still has mistakes in it.
const draftStock = ${BT}{
  "depot": "Cairn Depot",
  "items": [
    {"sku": "ROP-0412", "name": "Dynamic rope 60 m", "qty": 6, "bin": "A1-03"},
    {"sku": "HAR-0210", "name": "", "qty": -2, "bin": "B2-01"},
    {"sku": "HEL-0107", "name": "Climbing helmet", "bin": ""},
    {"sku": "", "name": "Mystery crate", "qty": 3, "bin": "D3-01"},
    {"sku": "BAT-0880", "name": "Radio battery pack", "qty": 22, "bin": "C1-04"}
  ]
}${BT}`;

export const chapter3: Chapter = {
  id: "reusable-parts",
  title: "Reusable parts and outside data",
  blurb: "Write code once for many types with generics, then decode and validate the supplier's JSON.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "go-inventory-9-generics",
      title: "Generics: type parameters and constraints",
      minutes: 40,
      xp: 160,
      concepts: ["type parameters", "constraints", "any", "comparable", "cmp.Ordered", "~int unions", "type inference"],
      learn: md`### The copy-paste problem

You have written the same loop three times: *turn each item into its SKU*, *turn each item into its quantity*, *keep the low ones*. Only the types and the little function in the middle change. Before Go 1.18 the choices were copy and paste, or \`[]any\` and assertions everywhere. **Generics** let one function work for many types and still be checked at compile time.

~~~go
func Map[T, U any](xs []T, f func(T) U) []U {
	out := make([]U, 0, len(xs))
	for _, x := range xs {
		out = append(out, f(x))
	}
	return out
}
~~~

\`[T, U any]\` declares two **type parameters**. \`any\` is their **constraint**: what a type must be able to do to be allowed. Inside the function \`T\` and \`U\` act like ordinary types.

### Calling it: inference does the work

~~~go
skus := Map(stock, func(it Item) string { return it.SKU })   // []string
qtys := Map(stock, func(it Item) int { return it.Qty })      // []int
~~~

The compiler infers \`T = Item\` from the first argument and \`U = string\` from the function's result. You *can* write it out, \`Map[Item, string](stock, ...)\`, which you need only when nothing can be inferred. After inference the call is as type-safe as one you wrote by hand: \`skus\` really is a \`[]string\`.

### Constraints say what the body may do

With \`any\` you can store, pass and return values, and nothing else. This does not compile:

~~~go
func Sum[T any](xs []T) T {
	var total T
	for _, x := range xs {
		total += x    // invalid operation: operator + not defined on total (variable of type T constrained by any)
	}
	return total
}
~~~

You must tell the compiler which types are allowed so it knows \`+\` exists. A constraint is an interface; one that lists types is a **type set**:

~~~go
type Number interface {
	~int | ~int64 | ~float64
}

func Sum[T Number](xs []T) T {
	var total T          // the zero value of T: 0
	for _, x := range xs {
		total += x
	}
	return total
}
~~~

The \`~\` means "any type whose **underlying** type is this". Without it only \`int\` itself qualifies; with it your own \`type Metres int\` does too. Call it with something outside the set and the compiler says so:

~~~text
string does not satisfy Number (string missing in ~int | ~int64 | ~float64)
~~~

### The constraints you will use

- \`any\`: no requirement. Enough for containers, \`Map\` and \`Filter\`.
- \`comparable\`: values can be compared with \`==\` and \`!=\`. Required for map keys and for "is it in the list?" helpers.
- \`cmp.Ordered\` (package \`cmp\`): everything that supports \`<\` and \`>\`: integers, floats and strings. Use it to find a maximum or sort.
- Your own union like \`Number\`. The standard library's \`constraints\`-style sets now live in \`cmp\`, so a custom union is for when you need exactly your own set.

~~~go
func MaxBy[T any, K cmp.Ordered](xs []T, key func(T) K) (T, bool) {
	var best T
	if len(xs) == 0 {
		return best, false
	}
	best = xs[0]
	for _, x := range xs[1:] {
		if key(x) > key(best) {
			best = x
		}
	}
	return best, true
}
~~~

\`T\` can be anything; the *key* type \`K\` must be ordered because the body compares keys with \`>\`. Returning \`(zero value, false)\` for an empty slice is the standard shape.

### Generic or not?

The standard library already has generic helpers: \`slices.Contains\`, \`slices.Index\`, \`slices.Max\`, \`maps.Keys\`. Reach for those first. Write your own generic function when you have **repeated the same loop for different types**, not before. Lesson 10 returns to this question with generic *types*.

### Common mistakes

- Using \`any\` and then wanting to add, compare or order the values.
- Forgetting \`~\` and wondering why \`Metres\` is rejected.
- A generic function with type parameters that cannot be inferred and no explicit instantiation (*cannot infer U*).
- Writing a generic version of everything. Plain functions are easier to read when there is one type.`,
      mission: md`The stores clerk keeps asking the same sorts of questions of the stock: which SKUs do we hold, how many units in total, which lines are low, which line has the most, and how many metres of rope are there. Each question is the same loop with a different type.

Replace the repetition with four generic helpers, \`Map\`, \`Filter\`, \`Sum\` and \`MaxBy\`, and use them on the stock. When this lesson passes the **Generic helpers** panel lights up, including the types the compiler worked out for you.`,
      tasks: [
        "Write func Map[T, U any](xs []T, f func(T) U) []U and func Filter[T any](xs []T, keep func(T) bool) []T",
        "Declare type Number interface { ~int | ~int64 | ~float64 } and write func Sum[T Number](xs []T) T",
        "Write func MaxBy[T any, K cmp.Ordered](xs []T, key func(T) K) (T, bool)",
        "In main (on a fresh seedStock()) build genSKUs (Map to SKU strings), genQtys (Map to quantities), genLowSKUs (Filter IsLow(5) then Map to SKUs), genTotal (Sum of genQtys) and genBiggest (MaxBy quantity, take the SKU)",
        "Sum a []Metres{60, 100, 30} (Metres is provided) into genMetres and a []float64{0.5, 0.25, 0.25} into genFloat",
        "Send helpers, a map with skus, lowSKUs, totalUnits, totalMetres, floatSum, biggest and types (a map of fmt.Sprintf(\"%T\", ...) for skus, totalUnits, totalMetres and floatSum), with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: a named integer type, to see why the ~ matters.
type Metres int

// Lesson 9: write these.
//   func Map[T, U any](xs []T, f func(T) U) []U
//   func Filter[T any](xs []T, keep func(T) bool) []T
//   type Number interface { ~int | ~int64 | ~float64 }
//   func Sum[T Number](xs []T) T
//   func MaxBy[T any, K cmp.Ordered](xs []T, key func(T) K) (T, bool)

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: ask the stock questions with your helpers.
// 1. genStock := seedStock()
//    genSKUs := Map(genStock, func(it Item) string { return it.SKU })
//    genQtys := Map(genStock, func(it Item) int { return it.Qty })
//    genLowSKUs := Map(Filter(genStock, func(it Item) bool { return it.IsLow(5) }), ...)
//    genTotal := Sum(genQtys)
//    genBiggest, _ := MaxBy(genStock, func(it Item) int { return it.Qty })      then use genBiggest.SKU
// 2. genMetres := Sum([]Metres{60, 100, 30})      genFloat := Sum([]float64{0.5, 0.25, 0.25})
// 3. scene("helpers", map[string]any{"skus": genSKUs, "lowSKUs": genLowSKUs, "totalUnits": genTotal,
//        "totalMetres": genMetres, "floatSum": genFloat, "biggest": genBiggest.SKU,
//        "types": map[string]string{"skus": fmt.Sprintf("%T", genSKUs), "totalUnits": ..., "totalMetres": ..., "floatSum": ...}})`,
      solutionAdd: go`// Metres is a named integer type, to see why the ~ matters.
type Metres int

// Map turns every element into something else.
func Map[T, U any](xs []T, f func(T) U) []U {
	out := make([]U, 0, len(xs))
	for _, x := range xs {
		out = append(out, f(x))
	}
	return out
}

// Filter keeps the elements the function approves of.
func Filter[T any](xs []T, keep func(T) bool) []T {
	var out []T
	for _, x := range xs {
		if keep(x) {
			out = append(out, x)
		}
	}
	return out
}

// Number is the set of types Sum can add up. The ~ admits named types such as Metres.
type Number interface {
	~int | ~int64 | ~float64
}

// Sum adds up any slice of numbers.
func Sum[T Number](xs []T) T {
	var total T
	for _, x := range xs {
		total += x
	}
	return total
}

// MaxBy returns the element with the largest key, and false for an empty slice.
func MaxBy[T any, K cmp.Ordered](xs []T, key func(T) K) (T, bool) {
	var best T
	if len(xs) == 0 {
		return best, false
	}
	best = xs[0]
	for _, x := range xs[1:] {
		if key(x) > key(best) {
			best = x
		}
	}
	return best, true
}

${MAIN_DIVIDER}

// Lesson 9: ask the stock questions with your helpers.
genStock := seedStock()
genSKUs := Map(genStock, func(it Item) string { return it.SKU })
genQtys := Map(genStock, func(it Item) int { return it.Qty })
genLowSKUs := Map(Filter(genStock, func(it Item) bool { return it.IsLow(5) }), func(it Item) string { return it.SKU })
genTotal := Sum(genQtys)
genBiggest, _ := MaxBy(genStock, func(it Item) int { return it.Qty })
genMetres := Sum([]Metres{60, 100, 30})
genFloat := Sum([]float64{0.5, 0.25, 0.25})
fmt.Println(genSKUs, genTotal, genLowSKUs, genBiggest.SKU)
fmt.Printf("%T %T %T %T\n", genSKUs, genTotal, genMetres, genFloat)

scene("helpers", map[string]any{
	"skus":        genSKUs,
	"lowSKUs":     genLowSKUs,
	"totalUnits":  genTotal,
	"totalMetres": genMetres,
	"floatSum":    genFloat,
	"biggest":     genBiggest.SKU,
	"types": map[string]string{
		"skus":        fmt.Sprintf("%T", genSKUs),
		"totalUnits":  fmt.Sprintf("%T", genTotal),
		"totalMetres": fmt.Sprintf("%T", genMetres),
		"floatSum":    fmt.Sprintf("%T", genFloat),
	},
})`,
      explanation:
        "Map and Filter only move values around, so any is enough. Sum adds, so its constraint must be a set where + exists; the ~ lets the named type Metres (underlying int) in, which is why genMetres keeps the type main.Metres rather than becoming a plain int. MaxBy compares keys with >, so its key type needs cmp.Ordered, while the element type stays any. The compiler infers every type parameter from the arguments: genSKUs is a []string, genTotal an int, genFloat a float64. The seed stock holds 103 units, three lines at or below 5 (ROP-0518, RAD-0031, SPL-0044) and the biggest line is BLK-0150 with 40.",
      hints: [
        { id: "h1", title: "Map and Filter", content: "func Map[T, U any](xs []T, f func(T) U) []U { out := make([]U, 0, len(xs)); for _, x := range xs { out = append(out, f(x)) }; return out }. Filter has one type parameter and a keep func(T) bool; append x when keep(x) is true." },
        { id: "h2", title: "Sum and its constraint", content: "type Number interface { ~int | ~int64 | ~float64 }, then func Sum[T Number](xs []T) T { var total T; for _, x := range xs { total += x }; return total }. Without the ~, Metres would not be allowed." },
        { id: "h3", title: "MaxBy and the calls", content: "MaxBy[T any, K cmp.Ordered](xs []T, key func(T) K) (T, bool): start with best = xs[0] and replace it when key(x) > key(best); return the zero T and false for an empty slice. Use it as genBiggest, _ := MaxBy(genStock, func(it Item) int { return it.Qty })." },
      ],
      tests: [
        {
          id: "t1",
          description: "Map and Filter work on the stock",
          assertionCode: js`
assert(scene.helpers && typeof scene.helpers === "object", "Send helpers with scene(\"helpers\", ...).");
assertEqual(scene.helpers.skus, ["ROP-0412", "ROP-0518", "HAR-0210", "HEL-0107", "RAD-0031", "BAT-0880", "SPL-0044", "BLK-0150"], "skus (Map every Item to its SKU)");
assertEqual(scene.helpers.lowSKUs, ["ROP-0518", "RAD-0031", "SPL-0044"], "lowSKUs (Filter with IsLow(5), then Map to SKUs)");`,
        },
        {
          id: "t2",
          description: "Sum adds integers, floats and named numbers",
          assertionCode: js`
assertEqual(scene.helpers.totalUnits, 103, "totalUnits (Sum of all quantities)");
assertEqual(scene.helpers.totalMetres, 190, "totalMetres (Sum of 60, 100 and 30 metres)");
assertEqual(scene.helpers.floatSum, 1, "floatSum (0.5 + 0.25 + 0.25)");`,
        },
        {
          id: "t3",
          description: "MaxBy finds the largest line",
          assertionCode: js`
assertEqual(scene.helpers.biggest, "BLK-0150", "biggest (MaxBy quantity: the foil blankets, 40 units)");`,
        },
        {
          id: "t4",
          description: "The compiler inferred the right types",
          assertionCode: js`
assertEqual(scene.helpers.types, { skus: "[]string", totalUnits: "int", totalMetres: "main.Metres", floatSum: "float64" }, "types (%T of each result). Sum must return the same type it was given, so the ~ in Number matters for Metres.");`,
        },
      ],
      unlocks: ["gi-helpers"],
      checks: [
        {
          prompt: "`type Metres int` and `type Number interface{ int | float64 }` (no tilde). Does `Sum([]Metres{1, 2})` compile?",
          question: { type: "choice", options: ["Yes", "No: Metres is not exactly int", "Only with an explicit [Metres]", "Only for floats"], answer: 1 },
          explanation: "A union without ~ lists exact types. Metres has int as its underlying type but is a different type, so it needs ~int in the union.",
        },
        {
          prompt: "Which constraint lets a generic function use `<` on its values?",
          question: { type: "choice", options: ["any", "comparable", "cmp.Ordered", "fmt.Stringer"], answer: 2 },
          explanation: "comparable gives only == and !=. cmp.Ordered covers integers, floats and strings, which support ordering.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "go-inventory-10-generic-types",
      title: "Generic types and when not to use them",
      minutes: 35,
      xp: 140,
      concepts: ["generic struct", "methods on generic types", "zero value of T", "Stack[T]", "Ledger[K, V]", "when not to use generics"],
      learn: md`### Types can have type parameters too

Functions are half the story. A **container** is the classic case: a stack of movements to undo, a book that keeps entries in the order they were added. The logic is the same whatever it holds.

~~~go
type Stack[T any] struct {
	items []T
}

func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }

func (s *Stack[T]) Pop() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	last := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return last, true
}

func (s *Stack[T]) Len() int { return len(s.items) }
~~~

Things to see:

- The type is **declared** with \`[T any]\`, and every method repeats the parameter in the receiver, \`(s *Stack[T])\`, **without** a constraint. The methods cannot add new type parameters of their own.
- You must write the type argument when you create one, because nothing can infer it: \`undo := &Stack[Movement]{}\`.
- The **zero value** of a stack is an empty stack that is ready to use, as \`var zero T\` is the zero value of whatever \`T\` turns out to be: \`0\`, \`""\`, \`nil\` or an empty struct.
- The pop shape \`(value, ok)\` is the same comma-ok style you know from maps.

### A two-parameter type: Ledger[K, V]

~~~go
type Ledger[K comparable, V any] struct {
	order []K
	items map[K]V
}

func NewLedger[K comparable, V any]() *Ledger[K, V] {
	return &Ledger[K, V]{items: map[K]V{}}
}

func (l *Ledger[K, V]) Put(k K, v V) {
	if _, exists := l.items[k]; !exists {
		l.order = append(l.order, k)       // remember first-seen order
	}
	l.items[k] = v
}

func (l *Ledger[K, V]) Get(k K) (V, bool) {
	v, ok := l.items[k]
	return v, ok
}
~~~

\`K\` must be \`comparable\` because it is a map key. A plain map forgets the order you put things in; this tiny wrapper remembers it and gives it back with \`Keys()\`. A **constructor** like \`NewLedger[string, Item]()\` is needed here because the map inside must be created before \`Put\` writes to it. It is also the one place you spell out both type arguments.

~~~go
book := NewLedger[string, Item]()
book.Put("ROP-0412", rope)
it, ok := book.Get("ROP-0412")
~~~

\`fmt.Printf("%T", book)\` prints \`*main.Ledger[string,main.Item]\`: the compiler made a real, separate type for this combination.

### Common shapes

- \`Stack[T]\`, \`Queue[T]\`, \`Set[T comparable]\` (\`map[T]struct{}\` inside), \`Cache[K, V]\`, \`Pair[A, B]\`, \`Result[T]\`.
- Return a **pointer** from the constructor when methods change the state, as in lesson 1.

### When not to use generics

Generics are a tool for one job: *same algorithm, many element types*. Do **not** reach for them:

- **When an interface already says it.** If every type you handle has a \`Handle\` method, use \`Handler\`. A function that calls a method on its argument wants an interface, not a type parameter.
- **When there is only one type.** A \`Stack[Movement]\` that nothing else will ever use is just a more complicated \`[]Movement\`. Write the concrete code first. Make it generic the *second* time you need it.
- **To avoid writing a few lines.** Three similar loops cost less than one unreadable abstraction.
- **When the body needs to know the type.** Constantly switching on the type inside a generic function means it is not generic.
- **For method-level type parameters.** Go does not allow \`func (s *Stack[T]) MapTo[U any]()\`; use a plain generic function that takes the stack.

A good rule: if you cannot say what the type parameters *mean* in one sentence ("T is the thing on the stack"), step back.

### Common mistakes

- Forgetting the type argument: \`var s Stack\` gives *cannot use generic type Stack[T any] without instantiation*.
- Repeating the constraint in a method receiver (\`(s *Stack[T any])\` is a syntax error).
- Using a generic container with values of different types and wanting \`any\`: if you need that, you do not want a generic type.
- Returning the internal slice of a container, so callers can change it behind its back. Return a copy (\`slices.Clone\`).`,
      mission: md`Disputes are common: "I never took that rope." The depot needs an **undo stack** of the last movements so a clerk can walk back through them, and a **book** of stock lines that remembers the order they were entered. Both are exactly the kind of container Go generics are for, and both will be used with different element types later in the course.

Write \`Stack[T]\` and \`Ledger[K, V]\`, fill a book with the opening stock, and unwind a stack of movements. When this lesson passes the **Generic ledger** lights up.`,
      tasks: [
        "Write type Stack[T any] struct with Push, Pop() (T, bool) and Len() methods on *Stack[T]",
        "Write type Ledger[K comparable, V any] with unexported fields order []K and items map[K]V, the constructor NewLedger[K comparable, V any]() *Ledger[K, V], and the methods Put (a new key is appended to order; an existing key keeps its position), Get(k K) (V, bool), Keys() []K (a copy, slices.Clone) and Len() int",
        "In main: book := NewLedger[string, Item](); Put every item of seedStock() by SKU, then Put RAD-0031 again with Qty 99 (it must keep its position); read it back with Get, and Get the missing key NOPE-0000",
        "Make undoStack := &Stack[Movement]{}, Push the three given movements (lines 1, 2, 3), then Pop until empty collecting the Line numbers in undoOrder, and finally record the ok value of one more Pop as undoEmptyOK",
        "Send ledgerView, a map with keys, len, radioQty, foundMissing, type (fmt.Sprintf(\"%T\", book)), undoOrder and undoEmptyOK, with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 10: write these.
//   type Stack[T any] struct { items []T }            Push(v T)   Pop() (T, bool)   Len() int
//   type Ledger[K comparable, V any] struct { order []K; items map[K]V }
//   func NewLedger[K comparable, V any]() *Ledger[K, V]
//   Put(k K, v V)  Get(k K) (V, bool)  Keys() []K  Len() int      (methods on *Ledger[K, V])

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: a book and an undo stack.
// 1. book := NewLedger[string, Item]()
//    for _, it := range seedStock() { book.Put(it.SKU, it) }
//    book.Put("RAD-0031", Item{SKU: "RAD-0031", Name: "Handheld radio", Qty: 99, Bin: "C1-02"})
//    radio, _ := book.Get("RAD-0031")      _, foundMissing := book.Get("NOPE-0000")
// 2. undoStack := &Stack[Movement]{}
//    push {Line: 1, Kind: "ISSUE", SKU: "ROP-0412", Qty: 1}, {Line: 2, Kind: "RECEIVE", SKU: "BAT-0880", Qty: 5},
//    {Line: 3, Kind: "RETIRE", SKU: "HEL-0107", Qty: 1}; pop until empty -> undoOrder []int of Line numbers
//    _, undoEmptyOK := undoStack.Pop()
// 3. scene("ledgerView", map[string]any{"keys": book.Keys(), "len": book.Len(), "radioQty": radio.Qty,
//        "foundMissing": foundMissing, "type": fmt.Sprintf("%T", book), "undoOrder": undoOrder, "undoEmptyOK": undoEmptyOK})`,
      solutionAdd: go`// Stack is a last-in, first-out stack of anything. The zero value is an empty, usable stack.
type Stack[T any] struct {
	items []T
}

func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }

// Pop removes and returns the top value, or false when the stack is empty.
func (s *Stack[T]) Pop() (T, bool) {
	var zero T
	if len(s.items) == 0 {
		return zero, false
	}
	last := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]
	return last, true
}

func (s *Stack[T]) Len() int { return len(s.items) }

// Ledger is a keyed book that remembers the order entries were first added.
type Ledger[K comparable, V any] struct {
	order []K
	items map[K]V
}

// NewLedger builds an empty book. The map has to exist before Put can write to it.
func NewLedger[K comparable, V any]() *Ledger[K, V] {
	return &Ledger[K, V]{items: map[K]V{}}
}

// Put adds or replaces an entry. A replaced key keeps its original position.
func (l *Ledger[K, V]) Put(k K, v V) {
	if _, exists := l.items[k]; !exists {
		l.order = append(l.order, k)
	}
	l.items[k] = v
}

func (l *Ledger[K, V]) Get(k K) (V, bool) {
	v, ok := l.items[k]
	return v, ok
}

// Keys returns a copy of the keys in the order they were first added.
func (l *Ledger[K, V]) Keys() []K { return slices.Clone(l.order) }

func (l *Ledger[K, V]) Len() int { return len(l.order) }

${MAIN_DIVIDER}

// Lesson 10: a book and an undo stack.
book := NewLedger[string, Item]()
for _, it := range seedStock() {
	book.Put(it.SKU, it)
}
book.Put("RAD-0031", Item{SKU: "RAD-0031", Name: "Handheld radio", Qty: 99, Bin: "C1-02"})
radioEntry, _ := book.Get("RAD-0031")
_, foundMissing := book.Get("NOPE-0000")

undoStack := &Stack[Movement]{}
undoStack.Push(Movement{Line: 1, Kind: "ISSUE", SKU: "ROP-0412", Qty: 1})
undoStack.Push(Movement{Line: 2, Kind: "RECEIVE", SKU: "BAT-0880", Qty: 5})
undoStack.Push(Movement{Line: 3, Kind: "RETIRE", SKU: "HEL-0107", Qty: 1})
var undoOrder []int
for undoStack.Len() > 0 {
	m, _ := undoStack.Pop()
	undoOrder = append(undoOrder, m.Line)
}
_, undoEmptyOK := undoStack.Pop()
fmt.Println(book.Keys(), undoOrder)

scene("ledgerView", map[string]any{
	"keys":         book.Keys(),
	"len":          book.Len(),
	"radioQty":     radioEntry.Qty,
	"foundMissing": foundMissing,
	"type":         fmt.Sprintf("%T", book),
	"undoOrder":    undoOrder,
	"undoEmptyOK":  undoEmptyOK,
})`,
      explanation:
        "Stack[T] and Ledger[K, V] are written once and used with Movement, string and Item; each combination becomes its own type (%T prints *main.Ledger[string,main.Item]). Every method repeats the type parameters in its receiver without constraints, and NewLedger exists because the map inside must be created before Put writes to it. Put only appends a key to order the first time it is seen, so re-putting RAD-0031 replaces the item but keeps position 5. The stack is last-in, first-out: pushing lines 1, 2, 3 and popping gives 3, 2, 1, and popping an empty stack returns the zero Movement with ok false.",
      hints: [
        { id: "h1", title: "Stack", content: "type Stack[T any] struct { items []T }. Methods: func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }. Pop: var zero T; if len(s.items) == 0 { return zero, false }; take the last element, shrink the slice with s.items = s.items[:len(s.items)-1], return it with true." },
        { id: "h2", title: "Ledger", content: "type Ledger[K comparable, V any] struct { order []K; items map[K]V }. NewLedger returns &Ledger[K, V]{items: map[K]V{}}. In Put check _, exists := l.items[k]; only append to l.order when !exists, then always set l.items[k] = v. Keys can return slices.Clone(l.order)." },
        { id: "h3", title: "Using them", content: "book := NewLedger[string, Item]() (both type arguments are required here). &Stack[Movement]{} makes an empty stack. Pop in a loop: for undoStack.Len() > 0 { m, _ := undoStack.Pop(); undoOrder = append(undoOrder, m.Line) }, then one more Pop whose second result is undoEmptyOK." },
      ],
      tests: [
        {
          id: "t1",
          description: "The ledger keeps first-seen order and replaces in place",
          assertionCode: js`
assert(scene.ledgerView && typeof scene.ledgerView === "object", "Send ledgerView with scene(\"ledgerView\", ...).");
assertEqual(scene.ledgerView.keys, ["ROP-0412", "ROP-0518", "HAR-0210", "HEL-0107", "RAD-0031", "BAT-0880", "SPL-0044", "BLK-0150"], "keys (first-seen order; putting RAD-0031 a second time must not move it or add it twice)");
assertEqual(scene.ledgerView.len, 8, "len (8 distinct SKUs)");`,
        },
        {
          id: "t2",
          description: "Get returns the replaced value and (zero, false) for a missing key",
          assertionCode: js`
assertEqual(scene.ledgerView.radioQty, 99, "radioQty (the second Put replaced the entry)");
assertEqual(scene.ledgerView.foundMissing, false, "foundMissing (Get on a key that was never put)");`,
        },
        {
          id: "t3",
          description: "The stack pops in last-in, first-out order",
          assertionCode: js`
assertEqual(scene.ledgerView.undoOrder, [3, 2, 1], "undoOrder (pushed lines 1, 2, 3; a stack pops 3, 2, 1)");
assertEqual(scene.ledgerView.undoEmptyOK, false, "undoEmptyOK (Pop on an empty stack must report false)");`,
        },
        {
          id: "t4",
          description: "The compiler built a distinct type for this combination",
          assertionCode: js`
assert(String(scene.ledgerView.type).includes("Ledger[string,main.Item]"), "type (should print as *main.Ledger[string,main.Item]; create it with NewLedger[string, Item]())");`,
        },
      ],
      unlocks: ["gi-ledger"],
      checks: [
        {
          prompt: "Which of these is NOT allowed in Go?",
          question: {
            type: "choice",
            options: ["`func (s *Stack[T]) Len() int`", "`func (s *Stack[T]) MapTo[U any](f func(T) U) []U`", "`type Pair[A, B any] struct{ First A; Second B }`", "`func NewStack[T any]() *Stack[T]`"],
            answer: 1,
          },
          explanation: "Methods cannot declare their own type parameters. Write a plain generic function that takes the stack instead.",
        },
        {
          prompt: "Every concrete type in your program has a `Handle(it *Item, m Movement) error` method, and a function just calls it. Generics or an interface?",
          question: { type: "choice", options: ["Generics, because they are faster", "An interface: the function needs behaviour, not a type parameter", "Neither, use any", "Both together"], answer: 1 },
          explanation: "Generics are for the same algorithm over many element types. When the code calls a method on its argument, that is exactly what an interface describes, and it is simpler to read.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "go-inventory-11-json",
      title: "Decoding JSON",
      minutes: 40,
      xp: 160,
      concepts: ["encoding/json", "struct tags", "Unmarshal", "json.Decoder", "DisallowUnknownFields", "pointer fields", "json.RawMessage", "UnmarshalTypeError"],
      learn: md`### Outside data is untrusted data

In Gopher Post you wrote JSON out. Now JSON comes in: a supplier's stock export, typed by people and generated by other programs. It will contain wrong types, missing fields and fields you have never heard of. The question is not "how do I read it?" but "how do I read it **and know what I got**?".

### A separate type for the wire

Your \`Item\` is the depot's own type. The JSON has its own shape, and it is wise to give that shape its own struct, then convert to \`Item\` when it has been checked. Struct tags map JSON keys to fields:

~~~go
type rawItem struct {
	SKU  string \`json:"sku"\`
	Name string \`json:"name"\`
	Qty  *int   \`json:"qty"\`
	Bin  string \`json:"bin,omitempty"\`
}
~~~

(Lower-case type name: it is private to this program. The **fields** are capitalised because \`encoding/json\` can only see exported fields.)

### Missing versus zero

Look at \`Qty *int\`. With a plain \`int\`, the JSON \`"qty": 0\` and a record with **no** qty both leave \`Qty\` at \`0\`, and you cannot tell "the radios are all gone" from "the supplier forgot the number". A **pointer** field fixes it: absent means \`nil\`; present means it points at the value, even a \`0\`.

~~~go
if ri.Qty == nil { /* missing */ } else { fmt.Println(*ri.Qty) }
~~~

Related ideas: JSON \`null\` also decodes to a nil pointer. And when you need the exact digits of a number, decode into \`json.Number\` (turn it on with \`dec.UseNumber()\`), which keeps the text until you convert it.

### Unmarshal and the Decoder

~~~go
var doc stockDoc
err := json.Unmarshal([]byte(text), &doc)          // whole text in memory, one call
~~~

\`json.NewDecoder(r)\` reads from any \`io.Reader\` (a file, an HTTP body, a \`strings.NewReader\`) and has options \`Unmarshal\` lacks:

~~~go
dec := json.NewDecoder(strings.NewReader(text))
dec.DisallowUnknownFields()      // an unexpected key becomes an error
err := dec.Decode(&ri)
~~~

By default **unknown keys are silently ignored**. That is friendly but hides typos: a supplier who sends \`"quantity"\` instead of \`"qty"\` would leave every \`Qty\` nil without a word. For data you own the format of, switch the strictness on. Matching of keys to fields ignores letter case.

### What errors look like

~~~text
json: cannot unmarshal string into Go struct field rawItem.qty of type int
json: cannot unmarshal number 2.5 into Go struct field rawItem.qty of type int
json: unknown field "colour"
invalid character '}' looking for beginning of object key string
unexpected end of JSON input
~~~

The typed ones can be examined with \`errors.As\` (lesson 7 pays off): a \`*json.UnmarshalTypeError\` has \`Field\` and \`Value\`, a \`*json.SyntaxError\` has \`Offset\`. The unknown-field error is a plain error, so only its text identifies it. Note that on a type mismatch \`Unmarshal\` keeps going and fills the rest, then reports the first problem, so the struct may be partly filled when \`err != nil\`. Do not use it.

### One bad record must not sink the file

Decode the list of items as \`[]json.RawMessage\`: raw, still-undecoded pieces of JSON. Then decode each piece on its own, and keep a tally of which succeeded and which failed and why:

~~~go
type stockDoc struct {
	Depot string            \`json:"depot"\`
	Items []json.RawMessage \`json:"items"\`
}
~~~

This is the same idea as the error inbox: process what you can, report what you cannot.

### Encoding with the same tags

\`json.Marshal\` uses the tags in reverse. \`omitempty\` leaves a key out when the field is empty (an empty string, zero, nil), which is how you avoid sending \`"bin": ""\`. A nil \`*int\` encodes as \`null\` unless it has \`omitempty\`, in which case the key is dropped.

### Common mistakes

- A field decoded into a plain \`int\` when "missing" matters.
- Lower-case field names: they are skipped without a word.
- Trusting a struct after \`err != nil\`.
- Leaving unknown fields unchecked on data that must be exact.
- Using \`return\` or \`os.Exit\` in \`main\` after a failure. In this course every lesson shares one \`main\`; report the failure and carry on.`,
      mission: md`A supplier has emailed the first real **stock export**, as JSON, and it is a mess: one quantity is the word "nine", one record has no quantity at all, one has a field nobody expects, and one quantity is 2.5. Rejecting the whole file because of one bad line would leave the shelves empty, so you will decode record by record and keep a clear account: what decoded, what failed, and exactly which field was the problem.

When this lesson passes the **JSON import** panel lights up, showing decoded and failed fields side by side.`,
      tasks: [
        "Declare type rawItem struct with SKU, Name (strings), Qty (*int) and Bin (string, omitempty), all tagged json:\"sku\" and so on, and type stockDoc struct with Depot string and Items []json.RawMessage (tags depot and items)",
        "Write func decodeItem(raw json.RawMessage) (rawItem, error): a json.NewDecoder over strings.NewReader(string(raw)) with DisallowUnknownFields, decoding into a rawItem",
        "Write func badField(err error) string: use errors.As with *json.UnmarshalTypeError to return its Field; for an unknown-field error (text starts with \"json: unknown field \") return the quoted name without its quotes (strings.CutPrefix and strings.Trim); otherwise \"\"",
        "In main: json.Unmarshal the provided messyStock constant into an importDoc stockDoc, loop over its Items; failures go to importFailed (index, field, message), successes to importDecoded (index, sku, name, bin, hasQty and qty only when it is present)",
        "Marshal rawItem{SKU: \"HEL-0107\", Name: \"Climbing helmet\"} into importEcho (a string) to see tags and omitempty at work",
        "Send importDepot (the depot name), importDecoded, importFailed and importEcho with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
${messyStockConst}

// Lesson 11: write these.
//   type rawItem struct { SKU string; Name string; Qty *int; Bin string }   with json tags sku, name, qty, bin,omitempty
//   type stockDoc struct { Depot string; Items []json.RawMessage }          tags depot, items
//   func decodeItem(raw json.RawMessage) (rawItem, error)                   Decoder + DisallowUnknownFields
//   func badField(err error) string                                         errors.As(*json.UnmarshalTypeError) or the unknown-field text

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: decode the supplier's export.
// 1. var importDoc stockDoc; json.Unmarshal([]byte(messyStock), &importDoc) (print the error if there is one)
// 2. for i, raw := range importDoc.Items { ri, err := decodeItem(raw) ... }
//    failure -> importFailed row {"index": i, "field": badField(err), "message": err.Error()}
//    success -> importDecoded row {"index": i, "sku": ..., "name": ..., "bin": ..., "hasQty": ri.Qty != nil} (+ "qty": *ri.Qty when present)
// 3. echo, _ := json.Marshal(rawItem{SKU: "HEL-0107", Name: "Climbing helmet"})  and  importEcho := string(echo)
// 4. scene("importDepot", importDoc.Depot), scene("importDecoded", importDecoded), scene("importFailed", importFailed), scene("importEcho", importEcho)`,
      solutionAdd: go`${messyStockConst}

// rawItem is the shape of one record on the wire. Qty is a pointer so that "missing" and 0 differ.
type rawItem struct {
	SKU  string ${BT}json:"sku"${BT}
	Name string ${BT}json:"name"${BT}
	Qty  *int   ${BT}json:"qty"${BT}
	Bin  string ${BT}json:"bin,omitempty"${BT}
}

// stockDoc keeps each item as raw JSON so one bad record cannot fail the whole document.
type stockDoc struct {
	Depot string            ${BT}json:"depot"${BT}
	Items []json.RawMessage ${BT}json:"items"${BT}
}

// decodeItem decodes one record strictly: an unknown key is an error.
func decodeItem(raw json.RawMessage) (rawItem, error) {
	dec := json.NewDecoder(strings.NewReader(string(raw)))
	dec.DisallowUnknownFields()
	var ri rawItem
	err := dec.Decode(&ri)
	return ri, err
}

// badField names the field a decoding error is about.
func badField(err error) string {
	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		return typeErr.Field
	}
	if rest, ok := strings.CutPrefix(err.Error(), "json: unknown field "); ok {
		return strings.Trim(rest, "\"")
	}
	return ""
}

${MAIN_DIVIDER}

// Lesson 11: decode the supplier's export.
var importDoc stockDoc
if err := json.Unmarshal([]byte(messyStock), &importDoc); err != nil {
	fmt.Println("cannot read the document:", err)
}
var importDecoded, importFailed []map[string]any
for i, raw := range importDoc.Items {
	ri, err := decodeItem(raw)
	if err != nil {
		importFailed = append(importFailed, map[string]any{"index": i, "field": badField(err), "message": err.Error()})
		fmt.Println("record", i, "failed:", err)
		continue
	}
	row := map[string]any{"index": i, "sku": ri.SKU, "name": ri.Name, "bin": ri.Bin, "hasQty": ri.Qty != nil}
	if ri.Qty != nil {
		row["qty"] = *ri.Qty
	}
	importDecoded = append(importDecoded, row)
}
echo, _ := json.Marshal(rawItem{SKU: "HEL-0107", Name: "Climbing helmet"})
importEcho := string(echo)
fmt.Println(importEcho)

scene("importDepot", importDoc.Depot)
scene("importDecoded", importDecoded)
scene("importFailed", importFailed)
scene("importEcho", importEcho)`,
      explanation:
        "The tags map sku, name, qty and bin onto the exported fields. Qty is a *int, so the helmet record with no qty decodes to nil while the radio's explicit 0 decodes to a pointer to 0: hasQty tells them apart. Each record is decoded on its own from json.RawMessage with DisallowUnknownFields, so three records fail without touching the others: 'nine' (a string where an int is needed, field qty), the extra colour key (field colour, from the error text) and 2.5 (a fraction in an int, field qty). errors.As finds the *json.UnmarshalTypeError and its Field. Marshal runs the tags backwards: the helmet has no bin, so omitempty drops it, and the nil Qty is written as null.",
      hints: [
        { id: "h1", title: "The types", content: "Tags go after the type in backticks. In a Go raw string you would write them as json:\"qty\" inside backticks. Qty is *int so a missing key stays nil. stockDoc holds Items []json.RawMessage so each record can be decoded separately." },
        { id: "h2", title: "decodeItem and badField", content: "dec := json.NewDecoder(strings.NewReader(string(raw))); dec.DisallowUnknownFields(); var ri rawItem; err := dec.Decode(&ri); return ri, err. In badField: var typeErr *json.UnmarshalTypeError; if errors.As(err, &typeErr) { return typeErr.Field }; then strings.CutPrefix(err.Error(), \"json: unknown field \") and strings.Trim(rest, \"\\\"\")." },
        { id: "h3", title: "The loop", content: "for i, raw := range importDoc.Items { ri, err := decodeItem(raw); if err != nil { importFailed = append(...); continue }; row := map[string]any{...}; if ri.Qty != nil { row[\"qty\"] = *ri.Qty }; importDecoded = append(importDecoded, row) }. importEcho is string(echo) where echo comes from json.Marshal." },
      ],
      tests: [
        {
          id: "t1",
          description: "Records that decode are kept, with missing and zero told apart",
          assertionCode: js`
assert(Array.isArray(scene.importDecoded), "Send the decoded rows with scene(\"importDecoded\", importDecoded).");
assertEqual(scene.importDepot, "Cairn Depot", "importDepot (the 'depot' key of the document)");
assertEqual(scene.importDecoded.map((r) => r.index), [0, 2, 3], "decoded indexes (records 0, 2 and 3 decode cleanly)");
assertEqual(scene.importDecoded.map((r) => r.hasQty), [true, false, true], "hasQty (record 2 has no qty at all: Qty must be a *int that stays nil)");
assertEqual(scene.importDecoded[2].qty, 0, "qty of record 3 (an explicit 0 is present, not missing)");`,
        },
        {
          id: "t2",
          description: "Failures say which field was wrong",
          assertionCode: js`
assert(Array.isArray(scene.importFailed), "Send the failures with scene(\"importFailed\", importFailed).");
assertEqual(scene.importFailed.map((r) => r.index), [1, 4, 5], "failed indexes (a string qty, an unknown key and a fractional qty)");
assertEqual(scene.importFailed.map((r) => r.field), ["qty", "colour", "qty"], "failed fields (errors.As on *json.UnmarshalTypeError gives Field; for the unknown key read the name from the message)");`,
        },
        {
          id: "t3",
          description: "Marshal uses the same tags, and omitempty drops the empty bin",
          assertionCode: js`
assertEqual(scene.importEcho, '{"sku":"HEL-0107","name":"Climbing helmet","qty":null}', "importEcho (json.Marshal of the helmet rawItem: tags give the key names, omitempty drops the empty bin, a nil *int becomes null)");`,
        },
      ],
      unlocks: ["gi-import"],
      checks: [
        {
          prompt: "The JSON is `{\"sku\": \"ROP-0412\", \"qty\": 0}` and the struct field is `Qty int`. Can you tell \"qty is zero\" from \"qty is missing\"?",
          question: { type: "choice", options: ["Yes, the decoder reports it", "No: both leave Qty at 0", "Yes, with omitempty", "Only with Unmarshal, not Decoder"], answer: 1 },
          explanation: "A plain int has no way to say \"absent\". Use *int (nil when missing) or json.Number/another marker when the difference matters.",
        },
        {
          prompt: "By default, what does `encoding/json` do with a key that has no matching field?",
          question: { type: "choice", options: ["Returns an error", "Ignores it", "Panics", "Stores it in a map"], answer: 1 },
          explanation: "Unknown keys are skipped silently. Call DisallowUnknownFields on a json.Decoder to make them errors.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "go-inventory-12-validation",
      title: "Validating input and collecting errors",
      minutes: 35,
      xp: 140,
      concepts: ["validation", "errors.Join", "multiple errors", "Unwrap() []error", "FieldError", "fail-fast vs collect"],
      learn: md`### Decoded is not the same as valid

A record can decode perfectly and still be nonsense: an empty name, a negative quantity, a missing bin. Decoding checks **shape**; validation checks **meaning**. Keep them separate. The decoder in lesson 11 never decides that stock must not be negative; a \`Validate\` method does.

### First error or all errors?

The usual \`if err != nil { return err }\` stops at the first problem. That suits a program step that cannot continue. For **input checking** it is rude: the supplier fixes the first problem, resubmits, and is told about the second. Collect everything and report it once.

~~~go
func (r rawItem) Validate() error {
	var errs []error
	if strings.TrimSpace(r.SKU) == "" {
		errs = append(errs, &FieldError{"sku", "is required"})
	}
	if r.Qty == nil {
		errs = append(errs, &FieldError{"qty", "is missing"})
	} else if *r.Qty < 0 {
		errs = append(errs, &FieldError{"qty", "must not be negative"})
	}
	return errors.Join(errs...)
}
~~~

### errors.Join

\`errors.Join(errs...)\` (Go 1.20 and later) bundles any number of errors into one:

- it **drops nil** entries, and returns \`nil\` when nothing is left. So \`return errors.Join(errs...)\` with an empty list is a clean "no problems";
- its \`Error()\` text is each message on its own line;
- \`errors.Is\` and \`errors.As\` look through **all** the joined errors, not just one.

~~~go
joined := errors.Join(errA, errB)
errors.Is(joined, errB)       // true
~~~

To take it apart you use a small interface check from lesson 3: the joined error has an \`Unwrap() []error\` method (note the **slice**, unlike the single-error \`Unwrap\` of lesson 6):

~~~go
if multi, ok := err.(interface{ Unwrap() []error }); ok {
	for _, e := range multi.Unwrap() { /* each problem */ }
}
~~~

\`fmt.Errorf\` can wrap several errors too, with more than one \`%w\`.

### A field-level error type

Give each problem a small type so callers (and the board) can show which field it was about without parsing text:

~~~go
type FieldError struct{ Field, Problem string }

func (e *FieldError) Error() string { return e.Field + ": " + e.Problem }
~~~

(\`&FieldError{"sku", "is required"}\` uses positional fields; for a two-field struct in your own code that is fine, for anything bigger prefer names.)

### Design notes

- **Validate once, at the edge.** After conversion to \`Item\` everything inside the program can trust the data.
- **Keep messages for people and fields for programs.** A \`FieldError\` serves both.
- **Do not validate in the decoder** (custom \`UnmarshalJSON\` methods exist, but they hide rules where nobody looks).
- Empty means different things for different fields; decide on purpose. Here an empty bin means "no shelf yet", which is a problem for stock on hand.
- Limits matter: reject absurd numbers too, not only negatives. Real systems also bound string lengths.

### Common mistakes

- Returning at the first problem when the user needs the full list.
- Building the list and returning a non-nil but empty error. \`errors.Join\` of nothing is \`nil\`; a hand-made empty wrapper is not.
- Type-asserting a joined error to \`*FieldError\` and finding nothing: the join is a different type that **contains** the field errors. Use \`errors.As\` for one, or \`Unwrap() []error\` for all.
- Comparing messages instead of types.`,
      mission: md`The next export is a **draft sheet** that someone typed by hand. The clerk is not interested in the first mistake; they want the whole list so the sheet can be corrected in one go: every record, every bad field, and a reason for each.

Write \`Validate\` for \`rawItem\` using \`errors.Join\`, a \`FieldError\` type, and a helper that takes a joined error apart. When this lesson passes the **Validation** panel lights up with the problem list.`,
      tasks: [
        "Declare type FieldError struct { Field, Problem string } with a pointer-receiver Error() returning Field + \": \" + Problem",
        "Write func (r rawItem) Validate() error collecting FieldErrors into a []error and returning errors.Join(errs...): sku (is required when blank), name (is required when blank), qty (is missing when nil, must not be negative when below 0) and bin (is required when empty)",
        "Write func fieldErrors(err error) []*FieldError: nil for a nil err; for a joined error use the Unwrap() []error assertion and errors.As on each; for any other error use errors.As once",
        "In main: json.Unmarshal the provided draftStock into draftDoc, decode each item with decodeItem and Validate it; build problems rows (index, sku, fields, messages) for records with problems, and count validCount and totalProblems",
        "Show errors.Join behaviour: joinNil (errors.Join() with no errors == nil) and joinIs (errors.Is on a joined error finds the second error), plus joinText (the Error() text of a join of errors.New(\"a\") and errors.New(\"b\"))",
        "Send validation, a map with checked, valid, total, problems, joinNil, joinIs and joinText, with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
${draftStockConst}

// Lesson 12: write these.
//   type FieldError struct { Field, Problem string }        Error() on *FieldError
//   func (r rawItem) Validate() error                      collect every problem, return errors.Join(errs...)
//   func fieldErrors(err error) []*FieldError              Unwrap() []error + errors.As

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: validate the draft sheet.
// 1. var draftDoc stockDoc; json.Unmarshal([]byte(draftStock), &draftDoc)
// 2. for i, raw := range draftDoc.Items: ri, err := decodeItem(raw) (all five decode), then verr := ri.Validate()
//    no problems -> validCount++
//    problems -> fes := fieldErrors(verr); row {"index": i, "sku": ri.SKU, "fields": []string of fe.Field, "messages": []string of fe.Error()}; totalProblems += len(fes)
// 3. errA := errors.New("a"); errB := errors.New("b"); joined := errors.Join(errA, errB)
//    joinNil := errors.Join() == nil     joinIs := errors.Is(joined, errB)     joinText := joined.Error()
// 4. scene("validation", map[string]any{"checked": len(draftDoc.Items), "valid": validCount, "total": totalProblems,
//        "problems": problems, "joinNil": joinNil, "joinIs": joinIs, "joinText": joinText})`,
      solutionAdd: go`${draftStockConst}

// FieldError says which field of a record is wrong and why.
type FieldError struct{ Field, Problem string }

func (e *FieldError) Error() string { return e.Field + ": " + e.Problem }

// Validate collects every problem in the record instead of stopping at the first.
func (r rawItem) Validate() error {
	var errs []error
	if strings.TrimSpace(r.SKU) == "" {
		errs = append(errs, &FieldError{"sku", "is required"})
	}
	if strings.TrimSpace(r.Name) == "" {
		errs = append(errs, &FieldError{"name", "is required"})
	}
	if r.Qty == nil {
		errs = append(errs, &FieldError{"qty", "is missing"})
	} else if *r.Qty < 0 {
		errs = append(errs, &FieldError{"qty", "must not be negative"})
	}
	if r.Bin == "" {
		errs = append(errs, &FieldError{"bin", "is required"})
	}
	return errors.Join(errs...)
}

// fieldErrors takes a (possibly joined) error apart into its FieldErrors.
func fieldErrors(err error) []*FieldError {
	if err == nil {
		return nil
	}
	var out []*FieldError
	if multi, ok := err.(interface{ Unwrap() []error }); ok {
		for _, e := range multi.Unwrap() {
			var fe *FieldError
			if errors.As(e, &fe) {
				out = append(out, fe)
			}
		}
		return out
	}
	var fe *FieldError
	if errors.As(err, &fe) {
		out = append(out, fe)
	}
	return out
}

${MAIN_DIVIDER}

// Lesson 12: validate the draft sheet.
var draftDoc stockDoc
if err := json.Unmarshal([]byte(draftStock), &draftDoc); err != nil {
	fmt.Println("cannot read the draft:", err)
}
var problems []map[string]any
validCount, totalProblems := 0, 0
for i, raw := range draftDoc.Items {
	ri, err := decodeItem(raw)
	if err != nil {
		fmt.Println("record", i, "does not decode:", err)
		continue
	}
	verr := ri.Validate()
	if verr == nil {
		validCount++
		continue
	}
	fes := fieldErrors(verr)
	var fields, messages []string
	for _, fe := range fes {
		fields = append(fields, fe.Field)
		messages = append(messages, fe.Error())
	}
	totalProblems += len(fes)
	problems = append(problems, map[string]any{"index": i, "sku": ri.SKU, "fields": fields, "messages": messages})
	fmt.Printf("record %d:\n%v\n", i, verr)
}

errA := errors.New("a")
errB := errors.New("b")
joined := errors.Join(errA, errB)
joinNil := errors.Join() == nil
joinIs := errors.Is(joined, errB)
joinText := joined.Error()

scene("validation", map[string]any{
	"checked":  len(draftDoc.Items),
	"valid":    validCount,
	"total":    totalProblems,
	"problems": problems,
	"joinNil":  joinNil,
	"joinIs":   joinIs,
	"joinText": joinText,
})`,
      explanation:
        "Validate appends a *FieldError for every broken rule and returns errors.Join of the list, which is nil when the list is empty, so a clean record is simply nil. fieldErrors uses the Unwrap() []error assertion that a joined error satisfies, then errors.As on each element. The draft sheet has two valid records and three bad ones: record 1 has a blank name and a negative quantity, record 2 has no quantity and an empty bin, record 3 has no SKU, five problems in total. errors.Join() of nothing is nil, errors.Is looks through every joined error, and the joined text puts each message on its own line.",
      hints: [
        { id: "h1", title: "Validate", content: "var errs []error, then for each rule append(errs, &FieldError{\"qty\", \"is missing\"}). Check Qty == nil first, then *r.Qty < 0 in an else branch. End with return errors.Join(errs...): with no errors it returns nil." },
        { id: "h2", title: "Taking the join apart", content: "if multi, ok := err.(interface{ Unwrap() []error }); ok { for _, e := range multi.Unwrap() { var fe *FieldError; if errors.As(e, &fe) { out = append(out, fe) } } }. Return nil early when err is nil." },
        { id: "h3", title: "The loop and the join demo", content: "In the loop: ri, err := decodeItem(raw); verr := ri.Validate(); if verr == nil { validCount++; continue }; then fes := fieldErrors(verr) and build fields/messages string slices. For the demo: joined := errors.Join(errA, errB); joinNil := errors.Join() == nil; joinIs := errors.Is(joined, errB); joinText := joined.Error()." },
      ],
      tests: [
        {
          id: "t1",
          description: "Every problem is reported, not just the first",
          assertionCode: js`
assert(scene.validation && typeof scene.validation === "object", "Send validation with scene(\"validation\", ...).");
const v = scene.validation;
assertEqual([v.checked, v.valid, v.total], [5, 2, 5], "[checked, valid, total] (5 records, 2 clean, 5 problems in all)");
assertEqual(v.problems.map((p) => p.index), [1, 2, 3], "problem record indexes");`,
        },
        {
          id: "t2",
          description: "Each problem names its field and reason",
          assertionCode: js`
const p = scene.validation.problems;
assertEqual(p[0].fields, ["name", "qty"], "record 1 fields (blank name and a negative quantity)");
assertEqual(p[0].messages, ["name: is required", "qty: must not be negative"], "record 1 messages");
assertEqual(p[1].messages, ["qty: is missing", "bin: is required"], "record 2 messages (no qty at all, and an empty bin)");
assertEqual(p[2].messages, ["sku: is required"], "record 3 messages");`,
        },
        {
          id: "t3",
          description: "errors.Join drops nils, searches every error and joins lines",
          assertionCode: js`
assertEqual([scene.validation.joinNil, scene.validation.joinIs], [true, true], "[joinNil, joinIs] (errors.Join() with nothing is nil; errors.Is finds the second joined error)");
assertEqual(scene.validation.joinText, "a\nb", "joinText (each joined message on its own line)");`,
        },
      ],
      unlocks: ["gi-validate"],
      checks: [
        {
          prompt: "What does `errors.Join()` return when called with no arguments (or only nil errors)?",
          question: { type: "choice", options: ["An empty error value", "nil", "A panic", "An error saying nothing failed"], answer: 1 },
          explanation: "Join discards nils and returns nil when nothing is left, so `return errors.Join(errs...)` is a clean way to end a validator.",
        },
        {
          prompt: "Why not `if err := checkName(); err != nil { return err }` for every rule in a validator?",
          question: { type: "choice", options: ["It does not compile", "It reports only the first problem, so people fix and resubmit repeatedly", "It is slower", "It hides panics"], answer: 1 },
          explanation: "Fail-fast is right for steps that cannot continue. When checking input, collect all the problems so they can be fixed in one pass.",
        },
      ],
    },
  ],
};
