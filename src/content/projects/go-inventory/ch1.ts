import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { go, js, md } from "../go-basics/util.ts";

/**
 * Chapter 1: Shaping the stock. Methods and receivers, interfaces as small contracts, type
 * switches and assertions, and embedding.
 *
 * Lesson 1's starter and solution carry the whole file (package, imports, the provided `scene`
 * helper, a scaffold that keeps unused imports legal, the provided Item type and seedStock, and
 * `func main()`). From lesson 2 on, a lesson's text may hold package-level declarations above
 * MAIN_DIVIDER (engine/compose.ts inserts them before `func main`); everything below the divider is
 * appended to the end of main's body.
 */

/** The shelves every lesson starts from. Provided to the learner as ready-made code in lesson 1. */
const seedStockFn = go`// seedStock returns a fresh copy of the opening stock, so every lesson can start from the same shelves.
func seedStock() []Item {
	return []Item{
		{SKU: "ROP-0412", Name: "Dynamic rope 60 m", Qty: 6, Bin: "A1-03"},
		{SKU: "ROP-0518", Name: "Static line 100 m", Qty: 3, Bin: "A1-04"},
		{SKU: "HAR-0210", Name: "Rescue harness M", Qty: 9, Bin: "B2-01"},
		{SKU: "HEL-0107", Name: "Climbing helmet", Qty: 14, Bin: "B2-05"},
		{SKU: "RAD-0031", Name: "Handheld radio", Qty: 5, Bin: "C1-02"},
		{SKU: "BAT-0880", Name: "Radio battery pack", Qty: 22, Bin: "C1-04"},
		{SKU: "SPL-0044", Name: "Vacuum splint", Qty: 4, Bin: "D3-07"},
		{SKU: "BLK-0150", Name: "Foil blanket", Qty: 40, Bin: "D3-09"},
	}
}`;

/** The skeleton every lesson builds on (see engine/compose.ts: it must end with the closing brace of main). */
const skeleton = (middle: string, body: string, marker: string) => go`${marker}package main

import (
	"bufio"
	"cmp"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"maps"
	"os"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"text/tabwriter"
)

// Provided by pockett: sends one value to the live ledger board beside your editor.
// From lesson 1 on you call scene("name", value). Leave this function as it is.
func scene(key string, v any) {
	data, err := json.Marshal(map[string]any{key: v})
	if err != nil {
		fmt.Println("scene: cannot send", key+":", err)
		return
	}
	fmt.Println("@scene " + string(data))
}

// Course scaffold. Go refuses to build a file that imports a package it never uses, but this
// course adds one idea per lesson. Each line below counts as "using" a package until the lesson
// that really needs it. You never need to edit this block.
var (
	_ = bufio.NewScanner         // lesson 14
	_ = cmp.Compare[int]         // lesson 8
	_ = errors.New               // lesson 2
	_ = io.EOF                   // lesson 5
	_ = maps.Clone[map[int]int]  // lesson 8
	_ = os.Stdin                 // lesson 14
	_ = regexp.MustCompile       // lesson 13
	_ = slices.Sort[[]int]       // lesson 8
	_ = sort.Strings             // lesson 8
	_ = strconv.Atoi             // lesson 3
	_ = strings.TrimSpace        // lesson 3
	_ = tabwriter.NewWriter      // lesson 5
)

// Item is one line of stock on the depot's shelves.
type Item struct {
	SKU  string // stock code, like ROP-0412
	Name string
	Qty  int
	Bin  string // where it lives, like A1-03
}

${seedStockFn}
${middle}
func main() {
${body}
}`;

export const chapter1: Chapter = {
  id: "shaping-the-stock",
  title: "Shaping the stock",
  blurb: "Give the depot's types real behaviour: methods, small interfaces, type switches and embedding.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "go-inventory-1-methods",
      title: "Methods and receivers",
      minutes: 30,
      xp: 120,
      concepts: ["methods", "value receiver", "pointer receiver", "method sets", "addressability", "range copies"],
      learn: md`### Behaviour that lives with the data

You wrote methods in Gopher Post. This lesson is about the part that bites people later: **which receiver kind to choose, and what Go lets you call on what**. Everything in the next fifteen lessons (interfaces, embedding, generics) leans on it.

A method is a function with a receiver in front of its name. The receiver is just a parameter with special call syntax:

~~~go
func (it *Item) Add(n int)       { it.Qty += n }   // pointer receiver
func (it Item) IsLow(level int) bool { return it.Qty <= level } // value receiver
~~~

### Value receiver = a copy

A value receiver gets its own copy of the struct, exactly like any other argument. Changes to it vanish when the method returns, so a value receiver is a promise: *I only read*.

A pointer receiver gets the address of the real value, so it can change it. Use a pointer receiver when:

- **the method must change the value** (an \`Add\` that adds to a copy does nothing at all, and the compiler will not warn you);
- **the struct is big**, so copying it on every call is wasteful;
- **the struct holds something that must not be copied**, such as a \`sync.Mutex\` (you will meet it in the Advanced course);
- **the type already has pointer-receiver methods.** Mixing the two on one type is legal, but it makes the type's behaviour harder to predict, and most Go teams pick one kind per type. This course mixes them in \`Item\` on purpose, once, so you can see the difference. Real code usually does not.

### What you can call on what

Go is generous with variables: if \`it\` is an addressable variable, \`it.Add(1)\` is silently rewritten to \`(&it).Add(1)\`. Slice elements are addressable too, so this works:

~~~go
depot[0].Add(4)     // fine: depot[0] has an address, Go takes it for you
~~~

But some values have **no address** to take, and then a pointer-receiver method is a compile error:

~~~go
seedStock()[0].Add(1)        // a function result: no address
stockByName["rope"].Add(1)   // a map element: map entries can move, so Go forbids pointers to them
~~~

~~~text
./main.go:41:2: cannot call pointer method Add on Item
~~~

You will meet the map version again in lesson 8. Value-receiver methods have no such limit: they only need a value, and any value will do.

### Method sets (the rule behind lesson 2)

Each type has a **method set**, the methods you can call on a value of that type *without* help:

- the method set of \`Item\` holds the **value**-receiver methods;
- the method set of \`*Item\` holds **both** kinds.

Interfaces look at method sets, not at the variable-taking convenience above. So an \`Item\` value does not satisfy an interface that needs \`Add\`, but a \`*Item\` does. Remember this sentence; lesson 2 depends on it.

### The range trap

~~~go
for _, it := range depot {
	it.Add(100)        // it is a COPY of the element
}
~~~

\`range\` hands you a copy of each element on every pass. \`it.Add(100)\` is legal (the copy is addressable), runs perfectly, and changes nothing on the shelf. When you need to change elements, range over the **index** and use \`depot[i]\`:

~~~go
for i := range depot {
	depot[i].Add(100)  // the real element
}
~~~

### Small things worth knowing

- A method **value** like \`add := depot[0].Add\` is a function with the receiver already bound. A pointer-receiver method value binds the *address*, so later calls change the real item.
- A pointer-receiver method can be called on a \`nil\` pointer. It only fails if it touches a field. Some types use that on purpose; most do not.
- Method names and field names share one namespace on a type: you cannot have a field \`Label\` and a method \`Label\`.

### Common mistakes

- Using a value receiver for a method that is supposed to change the struct. The call "works" and nothing changes.
- Changing elements through \`for _, x := range\`.
- Calling a pointer method on a map element or a function result (*cannot call pointer method*).
- Mixing receiver kinds without noticing, then wondering why a value does not satisfy an interface.`,
      mission: md`Welcome to **Cairn Depot**, the gear store of the valley's mountain-rescue team. Ropes, harnesses, helmets, radios and splints sit in numbered bins, and every call-out empties some of them. The books are kept on paper, which is why a rope was once issued that had never been counted in.

You are going to write the depot's ledger in Go, one growing program. The \`Item\` type and the opening stock are already in your file. Teach \`Item\` to take stock in and out, and to say when it is running low. When this lesson passes the **Control console** powers on and the **Shelves** appear on the board: every bin, with its stock.`,
      tasks: [
        "Write func (it *Item) Add(n int), which adds n to Qty (a pointer receiver, so the real item changes)",
        "Write func (it *Item) Take(n int) int, which removes up to n units, never going below zero, and returns how many really left the shelf",
        "Write func (it Item) IsLow(level int) bool, a value receiver that is true when Qty is at or below level",
        "In main: depot[0].Add(4); taken := depot[2].Take(3); short := depot[4].Take(9) (only 5 radios are on the shelf)",
        "Range over depot by value and call it.Add(100) on each copy, then record copyLoopQty := depot[0].Qty to prove nothing changed",
        "Collect the SKUs of the items where IsLow(5) is true into lowSKUs (range over the index)",
        "Send shelves (depot), taken, short, copyLoopQty and lowSKUs with scene",
      ],
      starterAdd: skeleton(
        go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 1: write the three methods here, below the Item type.
//   func (it *Item) Add(n int)             adds n to Qty
//   func (it *Item) Take(n int) int        removes up to n (never below 0), returns how many left
//   func (it Item) IsLow(level int) bool   Qty <= level
`,
        `	// Provided: the opening stock and a first line of output.
	depot := seedStock()
	fmt.Println("Cairn Depot opens with", len(depot), "stock lines")

	// ─── ✏️ YOUR TURN ───────────────────────────
	// Lesson 1: use your methods.
	// 1. depot[0].Add(4)
	//    taken := depot[2].Take(3)
	//    short := depot[4].Take(9)        (only 5 radios exist)
	// 2. for _, it := range depot { it.Add(100) }  then  copyLoopQty := depot[0].Qty
	// 3. lowSKUs: loop over the INDEX and collect depot[i].SKU where depot[i].IsLow(5)
	// 4. scene("shelves", depot), scene("taken", taken), scene("short", short),
	//    scene("copyLoopQty", copyLoopQty), scene("lowSKUs", lowSKUs)`,
        `// ─── ✏️ YOUR TURN: lesson 1, scroll down to the methods and to func main ───────────────\n`,
      ),
      solutionAdd: skeleton(
        go`// Add puts n more units on the shelf. Pointer receiver: it changes the real Item.
func (it *Item) Add(n int) { it.Qty += n }

// Take removes up to n units and returns how many really left the shelf.
func (it *Item) Take(n int) int {
	if n > it.Qty {
		n = it.Qty
	}
	it.Qty -= n
	return n
}

// IsLow reports whether stock is at or under the reorder level. Value receiver: it only reads.
func (it Item) IsLow(level int) bool { return it.Qty <= level }
`,
        `	// Provided: the opening stock and a first line of output.
	depot := seedStock()
	fmt.Println("Cairn Depot opens with", len(depot), "stock lines")

	// Lesson 1: methods change and read stock.
	depot[0].Add(4)
	taken := depot[2].Take(3)
	short := depot[4].Take(9)
	fmt.Println("taken:", taken, "short:", short)

	for _, it := range depot {
		it.Add(100) // changes a copy, not the shelf
	}
	copyLoopQty := depot[0].Qty
	fmt.Println("after the copy loop, rope stock is still", copyLoopQty)

	var lowSKUs []string
	for i := range depot {
		if depot[i].IsLow(5) {
			lowSKUs = append(lowSKUs, depot[i].SKU)
		}
	}
	fmt.Println("running low:", lowSKUs)

	scene("shelves", depot)
	scene("taken", taken)
	scene("short", short)
	scene("copyLoopQty", copyLoopQty)
	scene("lowSKUs", lowSKUs)`,
        ``,
      ),
      explanation:
        "Add and Take use pointer receivers, so depot[0].Add(4) changes the real element (Go takes the slice element's address for you). Take clamps n to what is on the shelf and returns the amount that really left, which is why asking for 9 radios gives 5. IsLow only reads, so a value receiver is fine. The by-value range loop adds 100 to copies, so depot[0].Qty is still 10 afterwards (6 + 4). Ranging over the index and calling depot[i].IsLow(5) reads the real elements: ROP-0518 (3), RAD-0031 (0 after the radios were taken) and SPL-0044 (4).",
      hints: [
        { id: "h1", title: "The three methods", content: "func (it *Item) Add(n int) { it.Qty += n }. For Take, first clamp: if n > it.Qty { n = it.Qty }, then it.Qty -= n and return n. IsLow is func (it Item) IsLow(level int) bool { return it.Qty <= level }. Pointer receivers have a * in front of Item; the value receiver does not." },
        { id: "h2", title: "Calls and the copy loop", content: "depot[0].Add(4) works on a slice element directly. taken := depot[2].Take(3) and short := depot[4].Take(9). The copy loop is for _, it := range depot { it.Add(100) }; afterwards read depot[0].Qty: it is still 10." },
        { id: "h3", title: "Low stock and scene", content: "for i := range depot { if depot[i].IsLow(5) { lowSKUs = append(lowSKUs, depot[i].SKU) } }. Then scene(\"shelves\", depot), scene(\"taken\", taken), scene(\"short\", short), scene(\"copyLoopQty\", copyLoopQty), scene(\"lowSKUs\", lowSKUs)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Add changes the real element in the slice",
          assertionCode: js`
assert(Array.isArray(scene.shelves), "Send the shelves with scene(\"shelves\", depot).");
assertEqual(scene.shelves.length, 8, "shelves (the depot has 8 stock lines)");
const rope = scene.shelves.find((s) => s.SKU === "ROP-0412");
assert(rope, "The shelves should still hold ROP-0412.");
assertEqual(rope.Qty, 10, "ROP-0412 quantity (6 on the shelf plus depot[0].Add(4); Add needs a pointer receiver so it changes the real item)");`,
        },
        {
          id: "t2",
          description: "Take returns how many really left the shelf",
          assertionCode: js`
assertEqual(scene.taken, 3, "taken (depot[2].Take(3) with 9 harnesses on the shelf)");
assertEqual(scene.short, 5, "short (asking for 9 radios when only 5 exist must return 5)");
const radio = scene.shelves.find((s) => s.SKU === "RAD-0031");
assertEqual(radio.Qty, 0, "radio quantity after taking them all (Take must never go below zero)");`,
        },
        {
          id: "t3",
          description: "Ranging by value changes only copies",
          assertionCode: js`
assertEqual(scene.copyLoopQty, 10, "copyLoopQty (the by-value range loop adds 100 to copies, so the rope stock stays 10)");`,
        },
        {
          id: "t4",
          description: "IsLow finds the thin bins",
          assertionCode: js`
assertEqual(scene.lowSKUs, ["ROP-0518", "RAD-0031", "SPL-0044"], "lowSKUs (items with Qty at or below 5 after the changes; loop over the index and use IsLow(5))");`,
        },
      ],
      unlocks: ["gi-console", "gi-shelves"],
      checks: [
        {
          prompt: "`func (it Item) Add(n int) { it.Qty += n }` compiles. What does `depot[0].Add(4)` do to the shelf?",
          question: {
            type: "choice",
            options: ["Adds 4 to depot[0].Qty", "Nothing: it adds 4 to a copy", "A compile error", "A panic"],
            answer: 1,
          },
          explanation: "A value receiver is a copy, so the method changes the copy and returns. Go does not warn, which is why methods that change state need a pointer receiver.",
        },
        {
          prompt: "Which of these is a compile error?\n\n~~~go\nstock := map[string]Item{\"a\": {}}\n~~~",
          question: {
            type: "choice",
            options: ["`stock[\"a\"].IsLow(3)`", "`stock[\"a\"].Add(1)` where Add has a pointer receiver", "`it := stock[\"a\"]; it.Add(1)`", "`fmt.Println(stock[\"a\"].Qty)`"],
            answer: 1,
          },
          explanation: "A map element has no stable address, so Go refuses to take it for a pointer-receiver call (*cannot call pointer method Add on Item*). Copying the element into a variable first is fine, though you then have to store it back.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "go-inventory-2-interfaces",
      title: "Small interfaces",
      minutes: 35,
      xp: 140,
      concepts: ["interface", "implicit satisfaction", "method sets", "accept interfaces, return structs", "map of interfaces", "%T"],
      learn: md`### The ledger needs more than one way to move stock

A movement log has several kinds of line. \`RECEIVE\` puts stock on a shelf, \`ISSUE\` takes it out for a call-out, \`RETIRE\` takes a condemned rope out of service for good. Three kinds, three rules, but the loop that reads the log should not care which is which. It should just say "handle this".

An interface is how Go writes down "just say handle this":

~~~go
type Handler interface {
	Handle(it *Item, m Movement) error
}
~~~

Gopher Post introduced interfaces with two routers. Here the goal is **design**: what a good interface looks like and where to put it.

### Satisfaction is implicit, and the compiler checks it where you use it

~~~go
type Receiver struct{}

func (Receiver) Handle(it *Item, m Movement) error {
	it.Add(m.Qty)
	return nil
}
~~~

\`Receiver\` never says it is a \`Handler\`. Having the method is enough. So an interface can be added *after* the types exist, and it can describe types from packages you do not own.

### Method sets decide who qualifies

Remember lesson 1: the method set of \`T\` has only value-receiver methods, and the method set of \`*T\` has both. A handler that keeps a counter needs a pointer receiver, and then **only the pointer** is a \`Handler\`:

~~~go
type Retirer struct{ Retired int }

func (r *Retirer) Handle(it *Item, m Movement) error { /* ... r.Retired += ... */ return nil }

var a Handler = &Retirer{}   // fine
var b Handler = Retirer{}    // compile error
~~~

~~~text
cannot use Retirer{} (value of struct type Retirer) as Handler value in variable declaration:
Retirer does not implement Handler (method Handle has pointer receiver)
~~~

A forgotten method gives a different message, *missing method Handle*. Pin the promise right next to the type, so the error appears where you wrote the type and not three files away:

~~~go
var _ Handler = Receiver{}
var _ Handler = Issuer{}
var _ Handler = (*Retirer)(nil)    // a typed nil pointer: no allocation needed
~~~

### What an interface value is

A variable of interface type holds **two things**: the concrete type and a value of that type. \`fmt.Printf("%T", h)\` prints the type half: \`main.Receiver\`, \`*main.Retirer\`. A call \`h.Handle(...)\` looks at the type and runs that type's method. That lookup is the polymorphism, and it happens while the program runs.

### Keep it small, define it where it is used

- **One or two methods.** \`io.Reader\` has one. Small interfaces are easy to satisfy, easy to fake in tests and easy to understand. If you are tempted to list eight methods, you are describing a type, not a behaviour.
- **Define the interface in the code that uses it**, not next to the implementations. The consumer knows what it needs.
- **Accept interfaces, return structs.** A function that *takes* a \`Handler\` works with anything that fits. A function that *returns* a concrete \`*Retirer\` lets callers use every field and method without a type assertion (lesson 3). Return an interface only when the concrete type should stay hidden.
- Name one-method interfaces after the action: \`Handler\`, \`Reader\`, \`Stringer\`.

### Dispatch with a map

An interface value is a normal value, so it fits in a map:

~~~go
byKind := map[string]Handler{
	"RECEIVE": Receiver{},
	"ISSUE":   Issuer{},
	"RETIRE":  &Retirer{},
}
h, ok := byKind[m.Kind]    // ok is false for a kind nobody handles
~~~

Adding a new movement kind later means one new type and one new map entry. The loop never changes.

### Common mistakes

- Putting a pointer-receiver type into an interface by value (\`Retirer{}\` instead of \`&Retirer{}\`).
- Declaring a big interface "just in case". Add methods when a caller needs them.
- Returning an interface from a constructor for no reason; callers lose access to the real type.
- Forgetting that a map lookup of a missing key gives the **zero value**, which for an interface is \`nil\`. Calling a method on it panics, so check \`ok\`.`,
      mission: md`The first movement log has landed. Six lines: a delivery of rope, two issues, a retirement and two more. Each kind has its own rule, and next week there will be a new one. You are building the **handler lane**: a table of handlers that the loop dispatches through one interface.

Write the \`Handler\` interface and three handlers, run the six movements through them, and record which **concrete type** handled each one. When this lesson passes the **Handler lane** lights up on the board.`,
      tasks: [
        "Declare type Handler interface { Handle(it *Item, m Movement) error }",
        "Receiver (an empty struct) adds m.Qty to the item. Issuer returns an error wrapping ErrShort when m.Qty > it.Qty (use fmt.Errorf with %w), otherwise takes the stock. Retirer has a field Retired int and a pointer receiver: it works like Issuer and also adds the units taken to Retired",
        "Add compile-time checks: var _ Handler = Receiver{}, var _ Handler = Issuer{} and var _ Handler = (*Retirer)(nil)",
        "In main: stock for the lane is laneStock := seedStock(); build byKind (RECEIVE: Receiver{}, ISSUE: Issuer{}, RETIRE: laneRetirer where laneRetirer := &Retirer{}); run the six laneMoves (given in the comments) with find(laneStock, m.SKU), skipping any kind with no handler",
        "For each movement append a row map to lane: line, kind, sku, qty, handler (fmt.Sprintf(\"%T\", h)), ok (err == nil) and, on failure, error (err.Error())",
        "Send lane, laneStock and retired (laneRetirer.Retired) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: a movement record, a lookup helper and the sentinel error for a shortage.
type Movement struct {
	Line int
	Kind string
	SKU  string
	Qty  int
	Bin  string
}

// find returns a pointer to the stock line with this SKU, or nil when there is none.
func find(stock []Item, sku string) *Item {
	for i := range stock {
		if stock[i].SKU == sku {
			return &stock[i]
		}
	}
	return nil
}

// ErrShort is wrapped by every shortage error, so callers can recognise one with errors.Is.
var ErrShort = errors.New("not enough stock")

// Lesson 2: write these.
//   type Handler interface { Handle(it *Item, m Movement) error }
//   type Receiver struct{}              adds m.Qty
//   type Issuer struct{}                takes m.Qty, or fmt.Errorf("%w: ...", ErrShort, ...) when there is not enough
//   type Retirer struct{ Retired int }  like Issuer, pointer receiver, counts what it retired
//   var _ Handler = Receiver{}   var _ Handler = Issuer{}   var _ Handler = (*Retirer)(nil)

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: run the first movement log through the handlers.
//   laneStock := seedStock()
//   laneRetirer := &Retirer{}
//   byKind := map[string]Handler{"RECEIVE": Receiver{}, "ISSUE": Issuer{}, "RETIRE": laneRetirer}
//   laneMoves := []Movement{
//     {Line: 1, Kind: "RECEIVE", SKU: "ROP-0412", Qty: 4},
//     {Line: 2, Kind: "ISSUE", SKU: "HAR-0210", Qty: 3},
//     {Line: 3, Kind: "ISSUE", SKU: "RAD-0031", Qty: 8},
//     {Line: 4, Kind: "RETIRE", SKU: "HEL-0107", Qty: 2},
//     {Line: 5, Kind: "RECEIVE", SKU: "BAT-0880", Qty: 10},
//     {Line: 6, Kind: "ISSUE", SKU: "SPL-0044", Qty: 4},
//   }
// For each move: h, ok := byKind[m.Kind]; err := h.Handle(find(laneStock, m.SKU), m).
// Append a map row to lane: line, kind, sku, qty, handler (%T), ok and, on failure, error.
// scene("lane", lane), scene("laneStock", laneStock), scene("retired", laneRetirer.Retired)`,
      solutionAdd: go`// Provided: a movement record, a lookup helper and the sentinel error for a shortage.
type Movement struct {
	Line int
	Kind string
	SKU  string
	Qty  int
	Bin  string
}

// find returns a pointer to the stock line with this SKU, or nil when there is none.
func find(stock []Item, sku string) *Item {
	for i := range stock {
		if stock[i].SKU == sku {
			return &stock[i]
		}
	}
	return nil
}

// ErrShort is wrapped by every shortage error, so callers can recognise one with errors.Is.
var ErrShort = errors.New("not enough stock")

// Handler applies one kind of movement to an item. It is small on purpose: one method.
type Handler interface {
	Handle(it *Item, m Movement) error
}

// Receiver puts stock on the shelf.
type Receiver struct{}

func (Receiver) Handle(it *Item, m Movement) error {
	it.Add(m.Qty)
	return nil
}

// Issuer takes stock off the shelf for a call-out, or reports a shortage.
type Issuer struct{}

func (Issuer) Handle(it *Item, m Movement) error {
	if m.Qty > it.Qty {
		return fmt.Errorf("%w: %s has %d, asked for %d", ErrShort, it.SKU, it.Qty, m.Qty)
	}
	it.Take(m.Qty)
	return nil
}

// Retirer takes condemned gear out of service for good and keeps count, so it needs a pointer receiver.
type Retirer struct{ Retired int }

func (r *Retirer) Handle(it *Item, m Movement) error {
	if m.Qty > it.Qty {
		return fmt.Errorf("%w: %s has %d, asked to retire %d", ErrShort, it.SKU, it.Qty, m.Qty)
	}
	r.Retired += it.Take(m.Qty)
	return nil
}

// The compiler checks these promises next to the types.
var _ Handler = Receiver{}
var _ Handler = Issuer{}
var _ Handler = (*Retirer)(nil)

${MAIN_DIVIDER}

// Lesson 2: run the first movement log through the handlers.
laneStock := seedStock()
laneRetirer := &Retirer{}
byKind := map[string]Handler{"RECEIVE": Receiver{}, "ISSUE": Issuer{}, "RETIRE": laneRetirer}
laneMoves := []Movement{
	{Line: 1, Kind: "RECEIVE", SKU: "ROP-0412", Qty: 4},
	{Line: 2, Kind: "ISSUE", SKU: "HAR-0210", Qty: 3},
	{Line: 3, Kind: "ISSUE", SKU: "RAD-0031", Qty: 8},
	{Line: 4, Kind: "RETIRE", SKU: "HEL-0107", Qty: 2},
	{Line: 5, Kind: "RECEIVE", SKU: "BAT-0880", Qty: 10},
	{Line: 6, Kind: "ISSUE", SKU: "SPL-0044", Qty: 4},
}
var lane []map[string]any
for _, m := range laneMoves {
	h, ok := byKind[m.Kind]
	if !ok {
		continue
	}
	err := h.Handle(find(laneStock, m.SKU), m)
	row := map[string]any{"line": m.Line, "kind": m.Kind, "sku": m.SKU, "qty": m.Qty, "handler": fmt.Sprintf("%T", h), "ok": err == nil}
	if err != nil {
		row["error"] = err.Error()
		fmt.Println("line", m.Line, "refused:", err)
	}
	lane = append(lane, row)
}
fmt.Println("retired so far:", laneRetirer.Retired)
scene("lane", lane)
scene("laneStock", laneStock)
scene("retired", laneRetirer.Retired)`,
      explanation:
        "Handler has a single method, so Receiver, Issuer and *Retirer qualify just by having it; the var _ lines make the compiler confirm that next to the types. Retirer keeps a counter, so its method has a pointer receiver and the map stores &Retirer (the value Retirer{} would not be a Handler). The loop never mentions a concrete type: byKind[m.Kind] hands back whichever handler fits, and %T shows main.Receiver, main.Issuer or *main.Retirer. Issuer wraps ErrShort with %w, so the radio request for 8 (only 5 on the shelf) fails with a message that still contains the sentinel.",
      hints: [
        { id: "h1", title: "The interface and the first two types", content: "type Handler interface { Handle(it *Item, m Movement) error }. Receiver is type Receiver struct{} with func (Receiver) Handle(it *Item, m Movement) error { it.Add(m.Qty); return nil }. Issuer checks if m.Qty > it.Qty and returns fmt.Errorf(\"%w: %s has %d, asked for %d\", ErrShort, it.SKU, it.Qty, m.Qty) before calling it.Take(m.Qty)." },
        { id: "h2", title: "Retirer needs a pointer", content: "type Retirer struct{ Retired int } and func (r *Retirer) Handle(...). Inside, do the same shortage check and then r.Retired += it.Take(m.Qty). Because the method has a pointer receiver, store &Retirer{} in the map: Retirer{} would not compile as a Handler." },
        { id: "h3", title: "The lane loop", content: "for _, m := range laneMoves { h, ok := byKind[m.Kind]; if !ok { continue }; err := h.Handle(find(laneStock, m.SKU), m); ... }. Build each row with map[string]any{\"line\": m.Line, ...}, use fmt.Sprintf(\"%T\", h) for handler and add row[\"error\"] = err.Error() when err != nil." },
      ],
      tests: [
        {
          id: "t1",
          description: "Each movement is handled by the right concrete type",
          assertionCode: js`
assert(Array.isArray(scene.lane), "Send the lane rows with scene(\"lane\", lane).");
assertEqual(scene.lane.length, 6, "lane (one row per movement)");
assertEqual(scene.lane.map((r) => r.handler), ["main.Receiver", "main.Issuer", "main.Issuer", "*main.Retirer", "main.Receiver", "main.Issuer"], "handler types (use fmt.Sprintf(\"%T\", h) on the Handler you looked up in byKind)");`,
        },
        {
          id: "t2",
          description: "A shortage is refused with an error, the rest succeed",
          assertionCode: js`
assertEqual(scene.lane.map((r) => r.ok), [true, true, false, true, true, true], "ok flags (only the radio request for 8, with 5 on the shelf, should fail)");
assert(String(scene.lane[2].error || "").includes("not enough stock"), "The failed row needs error text that includes the ErrShort message (wrap ErrShort with %w).");`,
        },
        {
          id: "t3",
          description: "The handlers changed the stock and Retirer kept count",
          assertionCode: js`
const q = (sku) => (scene.laneStock || []).find((s) => s.SKU === sku)?.Qty;
assertEqual(q("ROP-0412"), 10, "ROP-0412 after the delivery of 4");
assertEqual(q("HAR-0210"), 6, "HAR-0210 after issuing 3");
assertEqual(q("RAD-0031"), 5, "RAD-0031 (the request for 8 was refused, so nothing leaves the shelf)");
assertEqual(q("HEL-0107"), 12, "HEL-0107 after retiring 2");
assertEqual(q("SPL-0044"), 0, "SPL-0044 after issuing all 4");
assertEqual(scene.retired, 2, "retired (the *Retirer counts the units it took out of service)");`,
        },
      ],
      unlocks: ["gi-lane"],
      checks: [
        {
          prompt: "`type Retirer struct{ Retired int }` with `func (r *Retirer) Handle(...)`. Which line compiles?",
          question: {
            type: "choice",
            options: ["`var h Handler = Retirer{}`", "`var h Handler = &Retirer{}`", "Both", "Neither"],
            answer: 1,
          },
          explanation: "The method set of Retirer (the value) has no pointer-receiver methods, so only *Retirer satisfies Handler. Using the value gives *Retirer does not implement Handler (method Handle has pointer receiver)*.",
        },
        {
          prompt: "A function needs to call `Handle` on whatever it is given, and also wants to give back the thing it built. Which signature follows 'accept interfaces, return structs'?",
          question: {
            type: "choice",
            options: ["`func build(h Handler) Handler`", "`func build(h Handler) *Retirer`", "`func build(h *Retirer) Handler`", "`func build(h *Retirer) *Retirer`"],
            answer: 1,
          },
          explanation: "Taking the interface keeps the function open to every handler; returning the concrete pointer lets the caller use Retired and any other field without a type assertion.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "go-inventory-3-assertions",
      title: "Type switches and assertions",
      minutes: 35,
      xp: 140,
      concepts: ["type switch", "type assertion", "comma-ok", "optional interfaces", "any", "nil interface gotcha"],
      learn: md`### Looking inside an interface

An interface value hides its concrete type. Usually that is the point. Sometimes you need to look: to print a friendly name, to ask for an optional extra, or to pick apart a value of type \`any\` that came from outside (decoded JSON is the classic case, lesson 11).

### The type switch

~~~go
func kindOf(h Handler) string {
	switch v := h.(type) {
	case nil:
		return "none"
	case Receiver:
		return "receiver"
	case *Retirer:
		return fmt.Sprintf("retirer(%d)", v.Retired)   // v is a *Retirer here
	default:
		return fmt.Sprintf("other %T", v)               // v is still a Handler here
	}
}
~~~

Read \`h.(type)\` as "the dynamic type of h". In each \`case\`, \`v\` has that case's type, so you can use its fields. With several types in one case (\`case int, int64:\`) \`v\` keeps the interface type. \`case nil\` matches an interface that holds nothing at all. A \`default\` is a good habit: new handlers get added later.

### The type assertion, and why to use comma-ok

~~~go
r := h.(*Retirer)         // panics if h does not hold a *Retirer
r, ok := h.(*Retirer)     // never panics: ok is false and r is the zero value
~~~

The one-value form is a promise that you *know* the type. If you are wrong, the program dies with *interface conversion: main.Handler is main.Receiver, not *main.Retirer*. Use the comma-ok form for anything you are not certain about. It also works on a nil interface (\`ok\` is false), where it never panics.

### Asking for an optional extra

You can assert to **another interface**. This is how the standard library lets a type offer more than its main contract: \`io.Writer\`s that also have a \`Flush\`, readers that also know their size.

~~~go
type Noter interface{ Note() string }

func noteOf(h Handler) string {
	if n, ok := h.(Noter); ok {
		return n.Note()
	}
	return "(no note)"
}
~~~

\`Handler\` itself stays small; handlers that can describe themselves just add a \`Note\` method. No registration, no base class.

### Values of type any

\`any\` is an alias for the empty interface \`interface{}\`: every value satisfies it. Data from outside often arrives as \`any\`, so a type switch is the safe way in:

~~~go
func toQty(v any) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case float64:                       // JSON numbers decode to float64
		if n == float64(int(n)) { return int(n), true }
		return 0, false
	case string:
		q, err := strconv.Atoi(strings.TrimSpace(n))
		return q, err == nil
	}
	return 0, false                      // nil, bool, anything else
}
~~~

### The nil interface gotcha

An interface is two words: a type and a value. It is \`nil\` only when **both** are empty. A function that returns a *nil pointer* inside an interface gives you something that is **not** \`nil\`:

~~~go
func lookupRetirer(want bool) Handler {
	var r *Retirer          // a nil pointer of type *Retirer
	if want {
		return r            // the interface now holds (type *Retirer, value nil)
	}
	return nil              // the interface holds nothing
}

lookupRetirer(true) == nil   // false!
~~~

\`fmt.Printf("%T", h)\` prints \`*main.Retirer\` for the first and \`<nil>\` for the second. The usual cause is a function that declares a typed variable, forgets to fill it, and returns it as an interface. The fix: return a literal \`nil\` on the failure path, or return the concrete pointer type and let the caller check that.

### Common mistakes

- The one-value assertion on something that might not be that type.
- Forgetting that \`switch v := x.(type)\` declares \`v\` in every clause; an unused \`v\` is *declared and not used* only if no clause uses it.
- Returning a typed nil pointer as an \`error\` or other interface and then testing \`err != nil\`: this makes "successful" calls look like failures.
- Using \`any\` when a small interface would do. A type switch on \`any\` is a last resort, not a design.`,
      mission: md`Auditors want a one-line label for each handler on the lane, and some handlers can say more about themselves than others. Meanwhile the movement log will soon be read from a JSON export, where every number arrives as \`any\`.

Add the probes: a type switch that names a handler, an optional \`Noter\` interface, a forgiving \`toQty\` for values of type \`any\`, and a demonstration of the typed-nil trap. When this lesson passes the **Type probe** lights up.`,
      tasks: [
        "Declare type Noter interface { Note() string }. Receiver's Note returns \"adds to a bin\"; (*Retirer).Note returns fmt.Sprintf(\"retired %d so far\", r.Retired)",
        "func kindOf(h Handler) string with a type switch: nil gives \"none\", Receiver \"receiver\", Issuer \"issuer\", *Retirer fmt.Sprintf(\"retirer(%d)\", v.Retired), anything else \"other \" + %T",
        "func noteOf(h Handler) string: use the comma-ok assertion h.(Noter); return its note or \"(no note)\"",
        "func toQty(v any) (int, bool): int as is; float64 only when it is a whole number; string through strconv.Atoi after strings.TrimSpace; everything else (0, false)",
        "func lookupRetirer(want bool) Handler that returns a nil *Retirer inside the interface when want is true, and a plain nil otherwise",
        "In main: build kinds and notes for the probe handlers (Receiver{}, Issuer{}, &Retirer{Retired: 3}, nil), the qtyProbe rows for the inputs 7, 12.0, 2.5, \"9\", \"nine\", nil, and nilGotcha = {plainNilIsNil, typedNilIsNil}; send kinds, notes, qtyProbe and nilGotcha with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 3: write these.
//   type Noter interface { Note() string }
//   func (Receiver) Note() string          "adds to a bin"
//   func (r *Retirer) Note() string        "retired 3 so far"
//   func kindOf(h Handler) string          type switch
//   func noteOf(h Handler) string          comma-ok assertion to Noter
//   func toQty(v any) (int, bool)          type switch on int, float64, string
//   func lookupRetirer(want bool) Handler  returns a typed nil pointer when want is true

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: probe the handlers.
// 1. probeHandlers := []Handler{Receiver{}, Issuer{}, &Retirer{Retired: 3}, nil}
//    kinds and notes: one entry per probe handler (call kindOf and noteOf)
// 2. probeInputs := []any{7, 12.0, 2.5, "9", "nine", nil}
//    qtyProbe: one map per input: in (fmt.Sprint), type (%T), qty, ok
// 3. plain := lookupRetirer(false); typed := lookupRetirer(true)
//    nilGotcha := map[string]bool{"plainNilIsNil": plain == nil, "typedNilIsNil": typed == nil}
// 4. scene("kinds", kinds), scene("notes", notes), scene("qtyProbe", qtyProbe), scene("nilGotcha", nilGotcha)`,
      solutionAdd: go`// Noter is an optional extra: a handler that can describe its own state.
type Noter interface{ Note() string }

func (Receiver) Note() string   { return "adds to a bin" }
func (r *Retirer) Note() string { return fmt.Sprintf("retired %d so far", r.Retired) }

// kindOf names a handler by looking at the concrete type inside the interface.
func kindOf(h Handler) string {
	switch v := h.(type) {
	case nil:
		return "none"
	case Receiver:
		return "receiver"
	case Issuer:
		return "issuer"
	case *Retirer:
		return fmt.Sprintf("retirer(%d)", v.Retired)
	default:
		return fmt.Sprintf("other %T", v)
	}
}

// noteOf asks any handler for a note if it can give one.
func noteOf(h Handler) string {
	if n, ok := h.(Noter); ok {
		return n.Note()
	}
	return "(no note)"
}

// toQty reads a quantity out of a value of unknown type.
func toQty(v any) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case float64:
		if n == float64(int(n)) {
			return int(n), true
		}
		return 0, false
	case string:
		q, err := strconv.Atoi(strings.TrimSpace(n))
		return q, err == nil
	}
	return 0, false
}

// lookupRetirer shows the trap: with want true it returns a nil *Retirer inside a non-nil interface.
func lookupRetirer(want bool) Handler {
	var r *Retirer
	if want {
		return r
	}
	return nil
}

${MAIN_DIVIDER}

// Lesson 3: probe the handlers.
probeHandlers := []Handler{Receiver{}, Issuer{}, &Retirer{Retired: 3}, nil}
var kinds, notes []string
for _, h := range probeHandlers {
	kinds = append(kinds, kindOf(h))
	notes = append(notes, noteOf(h))
}
fmt.Println(kinds, notes)

probeInputs := []any{7, 12.0, 2.5, "9", "nine", nil}
var qtyProbe []map[string]any
for _, in := range probeInputs {
	q, ok := toQty(in)
	qtyProbe = append(qtyProbe, map[string]any{"in": fmt.Sprint(in), "type": fmt.Sprintf("%T", in), "qty": q, "ok": ok})
}

plain := lookupRetirer(false)
typed := lookupRetirer(true)
nilGotcha := map[string]bool{"plainNilIsNil": plain == nil, "typedNilIsNil": typed == nil}
fmt.Printf("%T %v | %T %v\n", plain, plain == nil, typed, typed == nil)

scene("kinds", kinds)
scene("notes", notes)
scene("qtyProbe", qtyProbe)
scene("nilGotcha", nilGotcha)`,
      explanation:
        "The type switch lists the concrete types you care about, and in the *Retirer case v is a *Retirer so v.Retired is reachable; case nil catches an interface that holds nothing. noteOf uses the comma-ok assertion h.(Noter): Receiver and *Retirer have a Note method, Issuer does not, and a nil Handler gives ok false instead of a panic. toQty switches on the dynamic type of an any: float64 is accepted only when it is a whole number, and strings go through Atoi. lookupRetirer(true) returns a nil pointer wrapped in an interface, so the interface has a type and is NOT nil; the plain nil one is.",
      hints: [
        { id: "h1", title: "kindOf and noteOf", content: "switch v := h.(type) { case nil: ... case Receiver: ... case Issuer: ... case *Retirer: return fmt.Sprintf(\"retirer(%d)\", v.Retired) default: return fmt.Sprintf(\"other %T\", v) }. noteOf: if n, ok := h.(Noter); ok { return n.Note() }; return \"(no note)\". Remember the two Note methods: func (Receiver) Note() string and func (r *Retirer) Note() string." },
        { id: "h2", title: "toQty", content: "switch n := v.(type) with three cases. int returns n, true. float64: if n == float64(int(n)) return int(n), true else 0, false. string: q, err := strconv.Atoi(strings.TrimSpace(n)); return q, err == nil. After the switch return 0, false." },
        { id: "h3", title: "The typed nil", content: "func lookupRetirer(want bool) Handler { var r *Retirer; if want { return r }; return nil }. Compare: plain := lookupRetirer(false) is == nil, typed := lookupRetirer(true) is NOT == nil. For the qtyProbe rows use map[string]any{\"in\": fmt.Sprint(in), \"type\": fmt.Sprintf(\"%T\", in), \"qty\": q, \"ok\": ok}." },
      ],
      tests: [
        {
          id: "t1",
          description: "kindOf names each handler, including the nil one",
          assertionCode: js`
assertEqual(scene.kinds, ["receiver", "issuer", "retirer(3)", "none"], "kinds (a type switch with cases for nil, Receiver, Issuer and *Retirer)");`,
        },
        {
          id: "t2",
          description: "noteOf uses a comma-ok assertion to the optional interface",
          assertionCode: js`
assertEqual(scene.notes, ["adds to a bin", "(no note)", "retired 3 so far", "(no note)"], "notes (Receiver and *Retirer have Note, Issuer and nil do not)");`,
        },
        {
          id: "t3",
          description: "toQty reads quantities out of values of unknown type",
          assertionCode: js`
assert(Array.isArray(scene.qtyProbe), "Send the rows with scene(\"qtyProbe\", qtyProbe).");
assertEqual(scene.qtyProbe.map((r) => r.ok), [true, true, false, true, false, false], "ok flags for 7, 12.0, 2.5, \"9\", \"nine\", nil");
assertEqual(scene.qtyProbe.map((r) => r.qty), [7, 12, 0, 9, 0, 0], "quantities for 7, 12.0, 2.5, \"9\", \"nine\", nil");`,
        },
        {
          id: "t4",
          description: "A nil pointer inside an interface is not a nil interface",
          assertionCode: js`
assertEqual(scene.nilGotcha, { plainNilIsNil: true, typedNilIsNil: false }, "nilGotcha (lookupRetirer(false) returns a plain nil; lookupRetirer(true) returns a nil *Retirer inside the interface)");`,
        },
      ],
      unlocks: ["gi-kinds"],
      checks: [
        {
          prompt: "`var r *Retirer; var h Handler = r`. What is `h == nil`?",
          question: { type: "choice", options: ["true", "false", "A compile error", "A panic"], answer: 1 },
          explanation: "The interface holds the type *Retirer and a nil pointer. An interface is nil only when both its type and its value are empty, so this one is not nil, and calling methods on it can reach a nil receiver.",
        },
        {
          prompt: "Why prefer `r, ok := h.(*Retirer)` over `r := h.(*Retirer)` when you are not sure?",
          question: {
            type: "choice",
            options: ["It is faster", "The one-value form panics when h holds another type", "The one-value form does not compile", "No reason, they are the same"],
            answer: 1,
          },
          explanation: "The one-value assertion panics with *interface conversion* when the type is wrong. The comma-ok form reports failure through ok and returns the zero value instead.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "go-inventory-4-embedding",
      title: "Embedding and composition",
      minutes: 35,
      xp: 140,
      concepts: ["struct embedding", "method promotion", "shadowing", "embedded interface", "decorator", "composition over inheritance"],
      learn: md`### Go has no inheritance

A rope is an item with a length and a fall count. A radio is an item with a channel. In many languages you would write \`class Rope extends Item\`. Go gives you **embedding** instead: put a type in a struct without giving it a field name.

~~~go
type Rope struct {
	Item            // embedded: no field name
	LengthM int
	Falls   int
}
~~~

\`Item\` becomes a field named \`Item\`, and everything on it is **promoted** to \`Rope\`: the fields (\`rope.Qty\`, \`rope.SKU\`) and the methods (\`rope.Add(2)\`, \`rope.IsLow(5)\`). It reads like inheritance, but nothing is inherited: the call \`rope.Add(2)\` is shorthand for \`rope.Item.Add(2)\`, and \`Add\` still receives the \`Item\` inside, not the \`Rope\`.

~~~go
rope := Rope{
	Item:    Item{SKU: "ROP-0412", Name: "Dynamic rope 60 m", Qty: 6, Bin: "A1-03"},
	LengthM: 60,
	Falls:   2,
}
rope.Add(2)               // promoted, and rope is addressable so *Item's method works
fmt.Println(rope.Qty)     // 8
~~~

### Shadowing: overriding without virtual methods

If \`Rope\` declares its own \`Label\`, that wins over the promoted one. The embedded one is still reachable by its full name:

~~~go
func (it Item) Label() string { return it.SKU + " " + it.Name }

func (r Rope) Label() string {
	return fmt.Sprintf("%s (%d m, %d falls)", r.Item.Label(), r.LengthM, r.Falls)
}
~~~

There is **no dynamic dispatch back down**: if \`Item\` had another method that calls \`it.Label()\`, it would still call \`Item.Label\`, never the \`Rope\` one. Embedding is syntax for forwarding, not a class hierarchy.

### Promotion makes interfaces work

Promoted methods count for method sets. Because \`Item\` has a value-receiver \`Label\`, so do \`Rope\` and \`Radio\`, and all three satisfy \`Labeler\` (\`interface{ Label() string }\`) with no extra code. Pointer-receiver methods are promoted to \`*Rope\`, and to \`Rope\` too when the field is addressable.

### Embedding an interface: the decorator

You can embed an **interface** in a struct. The struct then has all of its methods and can wrap any implementation:

~~~go
type Audited struct {
	Handler            // any Handler
	Calls, Failed int
}

func (a *Audited) Handle(it *Item, m Movement) error {
	a.Calls++
	err := a.Handler.Handle(it, m)    // call the wrapped one
	if err != nil { a.Failed++ }
	return err
}
~~~

\`Audited\` adds counting to any handler without knowing which. Notice what is **not** promoted: only the methods of the embedded *interface type* (\`Handle\`). If the wrapped handler also has a \`Note\` method, \`Audited\` does not, because \`Handler\` does not list it. Embedding exposes the interface you embedded, nothing more.

### When two embedded types collide

If two embedded types both have a method \`Label\`, then \`x.Label()\` is **ambiguous** and the compiler says so (*ambiguous selector x.Label*), but only if you actually use it. A method declared on the outer struct always resolves the clash.

### Composition over inheritance

Prefer small types that **have** other types over deep chains where one **is** another. You build behaviour by combining pieces, each with a single job, and you can change one piece without touching the others. Use embedding when the outer type really wants to expose the inner type's whole API. If you only need one or two methods, use a normal named field (\`item Item\`) and write the forwarding methods yourself.

### JSON and embedding (a preview)

A struct embedded without a tag is **flattened** by \`encoding/json\`: \`Rope\` encodes as one object with \`SKU\`, \`Name\`, \`Qty\`, \`Bin\`, \`LengthM\` and \`Falls\` side by side. You will see it in the board's data.

### Common mistakes

- Thinking embedding is inheritance and expecting the embedded type's methods to call the outer ones.
- Embedding a pointer type and leaving it \`nil\`: the first promoted call dereferences nil.
- Embedding when a plain field would do, which leaks the inner type's whole API.
- Forgetting the field name when building a literal: it is \`Rope{Item: Item{...}}\`, the type name is the field name.`,
      mission: md`The depot's gear is not all alike. Ropes have a length and a count of falls (a rope that has caught a real fall is retired), radios have a channel. Both are still stock lines and must keep every \`Item\` behaviour. And the safety officer wants every handler wrapped in a counter that records how often it was called and how often it said no, without touching the handlers.

Build \`Rope\` and \`Radio\` by embedding \`Item\`, give \`Rope\` its own label, and write the \`Audited\` wrapper. When this lesson passes the **Composition** panel lights up.`,
      tasks: [
        "Add func (it Item) Label() string returning SKU + \" \" + Name (a method on Item, from lesson 1)",
        "Declare type Rope struct { Item; LengthM int; Falls int } and type Radio struct { Item; Channel int }, then give Rope its own Label that returns fmt.Sprintf(\"%s (%d m, %d falls)\", r.Item.Label(), r.LengthM, r.Falls)",
        "Declare type Labeler interface { Label() string } and var _ Labeler = Rope{}",
        "Declare type Audited struct { Handler; Calls, Failed int } with func (a *Audited) Handle(it *Item, m Movement) error that counts the call, forwards to a.Handler and counts a failure; add var _ Handler = (*Audited)(nil)",
        "In main: build rope (ROP-0412, qty 6, bin A1-03, 60 m, 2 falls) and radio (RAD-0031, qty 5, bin C1-02, channel 7), call rope.Add(2), and put rope, radio and seedStock()[0] in a []Labeler to collect their labels",
        "Wrap Issuer{} in &Audited, run the four given audit moves on a fresh seedStock(), and check whether the audited handler is also a Noter (comma-ok on Handler(auditedIssuer).(Noter))",
        "Send compose (a map with rope, radio, ropeQty, audit {calls, failed} and auditHasNote) and labels with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 4: write these.
//   func (it Item) Label() string                       SKU + " " + Name
//   type Rope struct { Item; LengthM int; Falls int }
//   type Radio struct { Item; Channel int }
//   func (r Rope) Label() string                        uses r.Item.Label()
//   type Labeler interface { Label() string }           var _ Labeler = Rope{}
//   type Audited struct { Handler; Calls, Failed int }  func (a *Audited) Handle(...)  var _ Handler = (*Audited)(nil)

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: compose the gear.
// 1. rope := Rope{Item: Item{SKU: "ROP-0412", Name: "Dynamic rope 60 m", Qty: 6, Bin: "A1-03"}, LengthM: 60, Falls: 2}
//    radio := Radio{Item: Item{SKU: "RAD-0031", Name: "Handheld radio", Qty: 5, Bin: "C1-02"}, Channel: 7}
//    rope.Add(2)
// 2. fleet := []Labeler{rope, radio, seedStock()[0]}   then labels: one Label() per entry
// 3. auditedIssuer := &Audited{Handler: Issuer{}}; auditStock := seedStock()
//    run: ISSUE ROP-0412 2, ISSUE HAR-0210 20, ISSUE HEL-0107 4, ISSUE RAD-0031 5 (use find and Movement{...})
//    _, auditHasNote := Handler(auditedIssuer).(Noter)
// 4. scene("compose", map[string]any{"rope": rope, "radio": radio, "ropeQty": rope.Qty,
//        "audit": map[string]int{"calls": auditedIssuer.Calls, "failed": auditedIssuer.Failed}, "auditHasNote": auditHasNote})
//    scene("labels", labels)`,
      solutionAdd: go`// Label is a one-line description of any stock line.
func (it Item) Label() string { return it.SKU + " " + it.Name }

// Rope is an Item with a length and a fall count. Embedding promotes Item's fields and methods.
type Rope struct {
	Item
	LengthM int
	Falls   int
}

// Radio is an Item with a channel.
type Radio struct {
	Item
	Channel int
}

// Label shadows the promoted Item.Label and still reaches it by its full name.
func (r Rope) Label() string {
	return fmt.Sprintf("%s (%d m, %d falls)", r.Item.Label(), r.LengthM, r.Falls)
}

// Labeler is anything with a one-line label.
type Labeler interface{ Label() string }

var _ Labeler = Rope{}

// Audited wraps any Handler and counts the calls it forwards.
type Audited struct {
	Handler
	Calls  int
	Failed int
}

func (a *Audited) Handle(it *Item, m Movement) error {
	a.Calls++
	err := a.Handler.Handle(it, m)
	if err != nil {
		a.Failed++
	}
	return err
}

var _ Handler = (*Audited)(nil)

${MAIN_DIVIDER}

// Lesson 4: compose the gear.
rope := Rope{Item: Item{SKU: "ROP-0412", Name: "Dynamic rope 60 m", Qty: 6, Bin: "A1-03"}, LengthM: 60, Falls: 2}
radio := Radio{Item: Item{SKU: "RAD-0031", Name: "Handheld radio", Qty: 5, Bin: "C1-02"}, Channel: 7}
rope.Add(2)

fleet := []Labeler{rope, radio, seedStock()[0]}
var labels []string
for _, l := range fleet {
	labels = append(labels, l.Label())
}
fmt.Println(labels)

auditedIssuer := &Audited{Handler: Issuer{}}
auditStock := seedStock()
auditMoves := []Movement{
	{Line: 1, Kind: "ISSUE", SKU: "ROP-0412", Qty: 2},
	{Line: 2, Kind: "ISSUE", SKU: "HAR-0210", Qty: 20},
	{Line: 3, Kind: "ISSUE", SKU: "HEL-0107", Qty: 4},
	{Line: 4, Kind: "ISSUE", SKU: "RAD-0031", Qty: 5},
}
for _, m := range auditMoves {
	_ = auditedIssuer.Handle(find(auditStock, m.SKU), m)
}
_, auditHasNote := Handler(auditedIssuer).(Noter)
fmt.Println("audited calls:", auditedIssuer.Calls, "failed:", auditedIssuer.Failed, "has Note:", auditHasNote)

scene("compose", map[string]any{
	"rope":         rope,
	"radio":        radio,
	"ropeQty":      rope.Qty,
	"audit":        map[string]int{"calls": auditedIssuer.Calls, "failed": auditedIssuer.Failed},
	"auditHasNote": auditHasNote,
})
scene("labels", labels)`,
      explanation:
        "Rope and Radio embed Item, so Qty, Add, IsLow and Label are promoted: rope.Add(2) is rope.Item.Add(2) and takes the rope from 6 to 8. Rope declares its own Label, which shadows the promoted one and calls r.Item.Label() for the first part; Radio keeps the plain Item label, and all three satisfy Labeler without saying so. Audited embeds the Handler interface, overrides Handle to count and forwards to the wrapped handler. Only Handle is promoted from the embedded interface, so the wrapper does not have the wrapped handler's Note method and the comma-ok assertion to Noter is false. The four audit moves make 4 calls and 1 failure (20 harnesses do not exist).",
      hints: [
        { id: "h1", title: "Embedding syntax", content: "A field with only a type is embedded: type Rope struct { Item; LengthM int; Falls int }. In a literal the type name is the field name: Rope{Item: Item{SKU: ...}, LengthM: 60, Falls: 2}. Rope's own Label can call the promoted one as r.Item.Label()." },
        { id: "h2", title: "The wrapper", content: "type Audited struct { Handler; Calls, Failed int }. func (a *Audited) Handle(it *Item, m Movement) error { a.Calls++; err := a.Handler.Handle(it, m); if err != nil { a.Failed++ }; return err }. Build it with &Audited{Handler: Issuer{}}." },
        { id: "h3", title: "Collecting the labels", content: "fleet := []Labeler{rope, radio, seedStock()[0]} and loop with l.Label(). Run the audit moves with auditedIssuer.Handle(find(auditStock, m.SKU), m). For the optional interface use _, auditHasNote := Handler(auditedIssuer).(Noter): it is false, because only Handle is promoted from the embedded interface." },
      ],
      tests: [
        {
          id: "t1",
          description: "Promoted methods change the embedded Item",
          assertionCode: js`
assert(scene.compose && typeof scene.compose === "object", "Send compose with scene(\"compose\", ...).");
assertEqual(scene.compose.ropeQty, 8, "ropeQty (6 plus rope.Add(2); Add is promoted from the embedded Item)");
assertEqual(scene.compose.rope.LengthM, 60, "the rope's own LengthM");
assertEqual(scene.compose.rope.SKU, "ROP-0412", "the embedded Item's SKU appears flattened in the rope's data");`,
        },
        {
          id: "t2",
          description: "Rope shadows Label, Radio and Item use the promoted one",
          assertionCode: js`
assertEqual(scene.labels, ["ROP-0412 Dynamic rope 60 m (60 m, 2 falls)", "RAD-0031 Handheld radio", "ROP-0412 Dynamic rope 60 m"], "labels (Rope has its own Label that builds on r.Item.Label(); Radio and Item use the promoted/plain one)");`,
        },
        {
          id: "t3",
          description: "The decorator counts calls and failures",
          assertionCode: js`
assertEqual(scene.compose.audit, { calls: 4, failed: 1 }, "audit counts (4 movements went through the wrapper; the request for 20 harnesses fails)");`,
        },
        {
          id: "t4",
          description: "An embedded interface promotes only its own methods",
          assertionCode: js`
assertEqual(scene.compose.auditHasNote, false, "auditHasNote (Audited embeds the Handler interface, so only Handle is promoted; Note is not)");`,
        },
      ],
      unlocks: ["gi-compose"],
      checks: [
        {
          prompt: "`Rope` embeds `Item`, and `Item` has `func (it Item) Describe() string { return it.Label() }`. `Rope` also defines its own `Label`. What does `rope.Describe()` call?",
          question: { type: "choice", options: ["Rope.Label", "Item.Label", "Both", "It does not compile"], answer: 1 },
          explanation: "Describe runs with the embedded Item as its receiver, so it.Label() is Item.Label. Go has no virtual dispatch back down to the outer type; if you want Rope's label, call rope.Label() yourself.",
        },
        {
          prompt: "`Audited` embeds the `Handler` interface and `Receiver` also has a `Note` method. Does `Audited` have `Note`?",
          question: { type: "choice", options: ["Yes, everything of the wrapped value is promoted", "No, only the methods of the embedded interface type are promoted", "Yes, but only for pointer receivers", "It depends on gofmt"], answer: 1 },
          explanation: "Embedding an interface promotes the interface's methods. The wrapped value may have more, but the wrapper only knows what the interface type lists.",
        },
      ],
    },
  ],
};
