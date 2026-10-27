import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { go, js, md } from "../go-basics/util.ts";

/**
 * Chapter 2: Reading the ledger. Stringer and fmt, errors as values (sentinels and wrapping), typed
 * errors with errors.As (and panics caught at a boundary), and maps and sorting.
 */

export const chapter2: Chapter = {
  id: "reading-the-ledger",
  title: "Reading the ledger",
  blurb: "Print stock so people can read it, refuse bad movements with errors that explain themselves, and index the shelves.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "go-inventory-5-printing",
      title: "Stringer, verbs and tables",
      minutes: 30,
      xp: 120,
      concepts: ["fmt.Stringer", "%v %+v %#v %T %q", "pointer receiver String", "promoted String", "io.Writer", "text/tabwriter"],
      learn: md`### Printing is a conversation with the type

\`fmt\` decides how to show a value by asking it questions in a fixed order. Knowing the order explains every "why does it print like that?" you will meet.

For \`%v\` (and \`Println\`, \`%s\`) the order is: does the value have an **\`Error()\`** method (an error)? Does it have a **\`String()\`** method (a \`fmt.Stringer\`)? Otherwise print the raw structure. Gopher Post made \`Region\` print its name. Here you add \`String\` to a struct and see how far that reaches.

~~~go
func (it Item) String() string {
	return fmt.Sprintf("%s x%d @%s", it.SKU, it.Qty, it.Bin)
}

fmt.Println(item)        // RAD-0031 x5 @C1-02
~~~

### The verbs that show structure

~~~go
item := Item{SKU: "RAD-0031", Name: "Handheld radio", Qty: 5, Bin: "C1-02"}
move := Movement{Line: 6, Kind: "ISSUE", SKU: "RAD-0031", Qty: 6}   // no String method

fmt.Printf("%v\n", item)    // RAD-0031 x5 @C1-02     String() wins
fmt.Printf("%+v\n", item)   // RAD-0031 x5 @C1-02     String() wins here too
fmt.Printf("%#v\n", item)   // main.Item{SKU:"RAD-0031", Name:"Handheld radio", Qty:5, Bin:"C1-02"}
fmt.Printf("%T\n", item)    // main.Item
fmt.Printf("%q\n", item)    // "RAD-0031 x5 @C1-02"   the String() result, quoted

fmt.Printf("%v\n", move)    // {6 ISSUE RAD-0031 6 }
fmt.Printf("%+v\n", move)   // {Line:6 Kind:ISSUE SKU:RAD-0031 Qty:6 Bin:}
~~~

- \`%v\` is the default look, \`%+v\` adds **field names**, \`%#v\` is **Go syntax** you could paste back into code (it ignores \`String\`), \`%T\` is the type, \`%q\` quotes strings and runes.
- A \`String\` method hides the structure from \`%v\` **and** \`%+v\`. When you need the fields, use \`%#v\`.
- \`%v\` on a pointer to a struct prints \`&{...}\`, on a slice \`[a b c]\`, on a map \`map[k:v]\`, on \`nil\` \`<nil>\`.
- Width and alignment from Gopher Post still apply: \`%-10s\`, \`%5d\`, \`%6.2f\`. A \`*\` takes the width from an argument: \`%*d\`.

### Two traps with String

**1. Receiver kind.** The method set rule from lesson 1 applies. If \`String\` has a *pointer* receiver, only pointers use it:

~~~go
func (r *Retirer) String() string { return fmt.Sprintf("Retirer(%d retired)", r.Retired) }

r := &Retirer{Retired: 2}
fmt.Println(r)    // Retirer(2 retired)
fmt.Println(*r)   // {2}      the value has no String method
~~~

**2. Promotion.** Embedding promotes \`String\` too (lesson 4). A \`Rope\` has no \`String\` of its own, so \`fmt.Println(rope)\` quietly uses \`Item.String\` and **hides** \`LengthM\` and \`Falls\`. If an outer type adds fields, give it its own \`String\`.

And the one from Gopher Post: never format the receiver with \`%v\` or \`%s\` inside its own \`String\`; that calls \`String\` again, forever.

### Aligned tables with text/tabwriter

Padding with \`%-20s\` works when you know the longest value. \`text/tabwriter\` works it out for you: write cells separated by **tab characters**, and it lines the columns up when you flush.

~~~go
tw := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
fmt.Fprintln(tw, "SKU\tITEM\tQTY\tBIN")
fmt.Fprintf(tw, "%s\t%s\t%d\t%s\n", "ROP-0412", "Dynamic rope 60 m", 10, "A1-03")
tw.Flush()
~~~

The arguments are: output, minimum cell width, tab width, **padding** (spaces added after the widest cell), the pad character and flags (\`tabwriter.AlignRight\` right-aligns). Details that surprise people:

- A cell is text **terminated by a tab**. The last value on a line is not followed by a tab, so it is not part of a column.
- Nothing is written until \`Flush\`. Forget it and the table is empty.
- Columns are measured over consecutive lines, so an empty line starts a new block.

### Accept an io.Writer

\`fmt.Fprintf\` writes to any \`io.Writer\`, an interface with one method, \`Write([]byte) (int, error)\`. \`os.Stdout\`, files, network connections and \`*strings.Builder\` all fit. So write the table function to accept a writer and use it for the console *and* for capturing text:

~~~go
func renderTable(w io.Writer, items []Item) { /* tabwriter around w */ }

renderTable(os.Stdout, stock)   // print it
var sb strings.Builder
renderTable(&sb, stock)         // capture it (note the &: Write has a pointer receiver)
~~~

This is the "accept interfaces" rule from lesson 2 in everyday use.

### Common mistakes

- Expecting \`%+v\` to show field names for a type that has a \`String\` method.
- A pointer-receiver \`String\`, then printing a value (or a slice of values) and wondering why it is ignored.
- Forgetting \`tw.Flush()\`, or ending the last cell with a tab.
- Passing a \`strings.Builder\` by value instead of \`&sb\` (*copylocks* style vet warnings, or a panic when it is copied after use).`,
      mission: md`The safety officer has asked for a **printout**: a clean stock table for the notice board, and a few lines of debugging output that the team can paste into a bug report without squinting. Right now \`Println(item)\` shows \`{RAD-0031 Handheld radio 5 C1-02}\` and nobody can tell what the numbers mean.

Give \`Item\` a \`String\`, add a pointer-receiver \`String\` to \`Retirer\` to see the trap, write a table renderer that accepts any writer, and record how each verb shows each value. When this lesson passes the **Printout** lights up.`,
      tasks: [
        "Add func (it Item) String() string returning fmt.Sprintf(\"%s x%d @%s\", it.SKU, it.Qty, it.Bin), and func (r *Retirer) String() string returning fmt.Sprintf(\"Retirer(%d retired)\", r.Retired)",
        "Write func renderTable(w io.Writer, items []Item) with text/tabwriter (tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)): a header line SKU, ITEM, QTY, BIN separated by tabs, then one line per item, then Flush",
        "In main: print the table to os.Stdout; capture it with a strings.Builder and split it into tableLines (strings.Split after strings.TrimRight of the newline)",
        "Build verbRows ([]map[string]string with verb, value and out) for the exact ten combinations given in the comments, using fmt.Sprintf",
        "Send tableLines and verbRows with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 5: write these.
//   func (it Item) String() string          "RAD-0031 x5 @C1-02"
//   func (r *Retirer) String() string       "Retirer(2 retired)"   (pointer receiver on purpose)
//   func renderTable(w io.Writer, items []Item)
//       tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
//       header "SKU\tITEM\tQTY\tBIN", then one Fprintf per item, then tw.Flush()

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: print the stock nicely.
// 1. renderTable(os.Stdout, seedStock())
//    var tb strings.Builder; renderTable(&tb, seedStock())
//    tableLines := strings.Split(strings.TrimRight(tb.String(), "\n"), "\n")
// 2. Values to format:
//      fmtItem := Item{SKU: "RAD-0031", Name: "Handheld radio", Qty: 5, Bin: "C1-02"}
//      fmtMove := Movement{Line: 6, Kind: "ISSUE", SKU: "RAD-0031", Qty: 6}
//      fmtRetirer := &Retirer{Retired: 2}
//      fmtRope := Rope{Item: Item{SKU: "ROP-0412", Name: "Dynamic rope 60 m", Qty: 8, Bin: "A1-03"}, LengthM: 60, Falls: 2}
//    verbRows []map[string]string, keys verb / value / out, in this order:
//      %v %+v %#v %T %q of fmtItem (value "Item"); %v %+v of fmtMove (value "Movement");
//      %v of fmtRetirer (value "*Retirer"); %v of *fmtRetirer (value "Retirer"); %v of fmtRope (value "Rope")
// 3. scene("tableLines", tableLines), scene("verbRows", verbRows)`,
      solutionAdd: go`// String makes Item print as one short stock line with %v, %s and Println.
func (it Item) String() string {
	return fmt.Sprintf("%s x%d @%s", it.SKU, it.Qty, it.Bin)
}

// String on a pointer receiver: only a *Retirer has it, a Retirer value does not.
func (r *Retirer) String() string {
	return fmt.Sprintf("Retirer(%d retired)", r.Retired)
}

// renderTable writes the stock as aligned columns to any writer.
func renderTable(w io.Writer, items []Item) {
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "SKU\tITEM\tQTY\tBIN")
	for _, it := range items {
		fmt.Fprintf(tw, "%s\t%s\t%d\t%s\n", it.SKU, it.Name, it.Qty, it.Bin)
	}
	tw.Flush()
}

${MAIN_DIVIDER}

// Lesson 5: print the stock nicely.
renderTable(os.Stdout, seedStock())
var tableBuf strings.Builder
renderTable(&tableBuf, seedStock())
tableLines := strings.Split(strings.TrimRight(tableBuf.String(), "\n"), "\n")

fmtItem := Item{SKU: "RAD-0031", Name: "Handheld radio", Qty: 5, Bin: "C1-02"}
fmtMove := Movement{Line: 6, Kind: "ISSUE", SKU: "RAD-0031", Qty: 6}
fmtRetirer := &Retirer{Retired: 2}
fmtRope := Rope{Item: Item{SKU: "ROP-0412", Name: "Dynamic rope 60 m", Qty: 8, Bin: "A1-03"}, LengthM: 60, Falls: 2}
verbRows := []map[string]string{
	{"verb": "%v", "value": "Item", "out": fmt.Sprintf("%v", fmtItem)},
	{"verb": "%+v", "value": "Item", "out": fmt.Sprintf("%+v", fmtItem)},
	{"verb": "%#v", "value": "Item", "out": fmt.Sprintf("%#v", fmtItem)},
	{"verb": "%T", "value": "Item", "out": fmt.Sprintf("%T", fmtItem)},
	{"verb": "%q", "value": "Item", "out": fmt.Sprintf("%q", fmtItem)},
	{"verb": "%v", "value": "Movement", "out": fmt.Sprintf("%v", fmtMove)},
	{"verb": "%+v", "value": "Movement", "out": fmt.Sprintf("%+v", fmtMove)},
	{"verb": "%v", "value": "*Retirer", "out": fmt.Sprintf("%v", fmtRetirer)},
	{"verb": "%v", "value": "Retirer", "out": fmt.Sprintf("%v", *fmtRetirer)},
	{"verb": "%v", "value": "Rope", "out": fmt.Sprintf("%v", fmtRope)},
}
for _, r := range verbRows {
	fmt.Printf("%-4s %-9s %s\n", r["verb"], r["value"], r["out"])
}
scene("tableLines", tableLines)
scene("verbRows", verbRows)`,
      explanation:
        "Item.String makes %v, %+v and Println show the short stock line, while %#v ignores it and prints Go syntax, and %q quotes the String result. Movement has no String method, so %v shows the bare values and %+v adds field names. The Retirer String has a pointer receiver, so the pointer prints Retirer(2 retired) but the value prints {2}. Rope embeds Item, so Item.String is promoted and %v of a Rope hides its length and falls. renderTable accepts an io.Writer, so the same code prints to os.Stdout and fills a strings.Builder; tabwriter pads each column to its widest cell plus 2 and nothing appears until Flush.",
      hints: [
        { id: "h1", title: "The two Strings", content: "func (it Item) String() string { return fmt.Sprintf(\"%s x%d @%s\", it.SKU, it.Qty, it.Bin) } and func (r *Retirer) String() string { return fmt.Sprintf(\"Retirer(%d retired)\", r.Retired) }. The second has a pointer receiver on purpose." },
        { id: "h2", title: "renderTable", content: "tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0); fmt.Fprintln(tw, \"SKU\\tITEM\\tQTY\\tBIN\"); loop with fmt.Fprintf(tw, \"%s\\t%s\\t%d\\t%s\\n\", it.SKU, it.Name, it.Qty, it.Bin); finish with tw.Flush(). To capture it: var tb strings.Builder; renderTable(&tb, seedStock())." },
        { id: "h3", title: "The verb rows", content: "Each row is a map[string]string: {\"verb\": \"%+v\", \"value\": \"Item\", \"out\": fmt.Sprintf(\"%+v\", fmtItem)}. For the value Retirer use *fmtRetirer, for the pointer use fmtRetirer itself. Keep the order from the comments." },
      ],
      tests: [
        {
          id: "t1",
          description: "Item prints as a short stock line through String",
          assertionCode: js`
assert(Array.isArray(scene.verbRows), "Send the rows with scene(\"verbRows\", verbRows).");
const row = (verb, value) => scene.verbRows.find((r) => r.verb === verb && r.value === value)?.out;
assertEqual(row("%v", "Item"), "RAD-0031 x5 @C1-02", "%v of an Item (it needs func (it Item) String() string)");
assertEqual(row("%q", "Item"), '"RAD-0031 x5 @C1-02"', "%q of an Item (the String result, in quotes)");`,
        },
        {
          id: "t2",
          description: "%#v and %T show Go syntax and the type, %+v shows field names",
          assertionCode: js`
const row2 = (verb, value) => scene.verbRows.find((r) => r.verb === verb && r.value === value)?.out;
assertEqual(row2("%T", "Item"), "main.Item", "%T of an Item");
assertEqual(row2("%#v", "Item"), 'main.Item{SKU:"RAD-0031", Name:"Handheld radio", Qty:5, Bin:"C1-02"}', "%#v of an Item (Go syntax ignores String)");
assertEqual(row2("%+v", "Movement"), "{Line:6 Kind:ISSUE SKU:RAD-0031 Qty:6 Bin:}", "%+v of a Movement (no String method, so field names appear)");`,
        },
        {
          id: "t3",
          description: "Pointer receivers and promotion change what prints",
          assertionCode: js`
const row3 = (verb, value) => scene.verbRows.find((r) => r.verb === verb && r.value === value)?.out;
assertEqual(row3("%v", "*Retirer"), "Retirer(2 retired)", "%v of a *Retirer (String has a pointer receiver)");
assertEqual(row3("%v", "Retirer"), "{2}", "%v of a Retirer VALUE (the value has no String method)");
assertEqual(row3("%v", "Rope"), "ROP-0412 x8 @A1-03", "%v of a Rope (Item.String is promoted and hides LengthM and Falls)");`,
        },
        {
          id: "t4",
          description: "renderTable aligns the columns with tabwriter",
          assertionCode: js`
assert(Array.isArray(scene.tableLines), "Send the table lines with scene(\"tableLines\", tableLines).");
assertEqual(scene.tableLines.length, 9, "tableLines (a header plus 8 stock lines)");
const head = scene.tableLines[0];
assert(head.startsWith("SKU") && head.includes("ITEM") && head.includes("QTY") && head.includes("BIN"), "The first line should be the header SKU, ITEM, QTY, BIN.");
const col = head.indexOf("BIN");
assert(scene.tableLines.slice(1).every((l) => l[col] !== " " && l[col - 1] === " "), "The BIN column should start at the same position on every line. Write cells separated by \\t, use tabwriter.NewWriter(w, 0, 0, 2, ' ', 0) and call Flush.");`,
        },
      ],
      unlocks: ["gi-printout"],
      checks: [
        {
          prompt: "`Item` has `func (it Item) String() string`. What does `fmt.Printf(\"%+v\", item)` print?",
          question: { type: "choice", options: ["Field names and values: {SKU:... Qty:...}", "The String() result", "A compile error", "main.Item"], answer: 1 },
          explanation: "%v and %+v both ask for String first. To see the fields of a type that has a String method, use %#v.",
        },
        {
          prompt: "Why does `tabwriter` print nothing if you forget `Flush`?",
          question: { type: "choice", options: ["It needs the whole table to measure the columns", "Flush opens the file", "Println is required", "It does not; it prints immediately"], answer: 0 },
          explanation: "Column widths depend on every line of the block, so the writer buffers cells until you flush.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "go-inventory-6-errors",
      title: "Errors as values: wrapping and Is",
      minutes: 35,
      xp: 140,
      concepts: ["sentinel errors", "fmt.Errorf %w", "errors.Is", "errors.Unwrap", "error chains", "== vs errors.Is"],
      learn: md`### An error is just a value, so it can carry a story

In Gopher Post you created errors, wrapped one with \`%w\` and tested it with \`errors.Is\`. In a real program the interesting question is **where the context goes**. A shortage deep in a handler is useless if all the log says is *not enough stock*. Which line? Which SKU? Which movement?

The Go answer: every layer that has context **wraps** the error on the way up, adding its own sentence and keeping the original reachable:

~~~go
func lookup(stock []Item, sku string) (*Item, error) {
	if it := find(stock, sku); it != nil {
		return it, nil
	}
	return nil, fmt.Errorf("lookup %q: %w", sku, ErrUnknownSKU)
}

func process(stock []Item, handlers map[string]Handler, m Movement) error {
	// ...
	it, err := lookup(stock, m.SKU)
	if err != nil {
		return fmt.Errorf("line %d: %w", m.Line, err)
	}
	// ...
}
~~~

The final message reads like a stack trace in plain English, from outermost to innermost:

~~~text
line 3: lookup "ZZZ-9999": unknown SKU
~~~

### How the chain works

\`%w\` makes the new error remember the one it wrapped. The new error has an \`Unwrap() error\` method that returns it. \`errors.Unwrap(err)\` takes one step down; keep stepping and you reach the sentinel at the bottom:

~~~go
for err != nil {
	fmt.Println(err)
	err = errors.Unwrap(err)
}
~~~

You will rarely write that loop. \`errors.Is\` and \`errors.As\` (next lesson) walk the chain for you.

### Sentinel errors

A **sentinel** is a package-level error variable that callers can recognise:

~~~go
var (
	ErrUnknownSKU  = errors.New("unknown SKU")
	ErrUnknownKind = errors.New("unknown movement kind")
)
~~~

Name them \`ErrSomething\`. Their text is lower case with no trailing full stop, because they are meant to be embedded inside longer messages. A sentinel is part of your package's contract: callers will write code against it, so add them sparingly.

### == versus errors.Is

~~~go
err := process(stock, handlers, m)
err == ErrShort              // false: err is a wrapper around it
errors.Is(err, ErrShort)     // true: walks the chain
~~~

Comparing with \`==\` only works when nobody has wrapped the error. The moment a layer adds context, only \`errors.Is\` still finds the sentinel. Make \`errors.Is\` your habit, and a \`switch { case errors.Is(...): ... }\` your classification tool:

~~~go
func classify(err error) string {
	switch {
	case err == nil:
		return "ok"
	case errors.Is(err, ErrShort):
		return "short"
	case errors.Is(err, ErrUnknownSKU):
		return "unknown-sku"
	}
	return "other"
}
~~~

### Choosing %w or %v

\`%w\` keeps the cause **reachable**, which makes it part of your API: callers may depend on it. \`%v\` keeps only the text. Use \`%w\` when callers might want to test the cause; use \`%v\` when the cause is an implementation detail you want to hide. More than one \`%w\` in a format is allowed (Go 1.20 and later), and \`errors.Is\` finds any of them.

### Good error messages

- Say **what failed**, then the cause: \`lookup "ZZZ-9999": unknown SKU\`.
- Add context where you have it (a line number, an ID), not everywhere. Do not repeat what the cause already says.
- Lower case, no full stop, no "failed to" noise. They get chained, so they should read like clauses.
- Never both log an error **and** return it: the caller will log it again.

### Common mistakes

- \`if err == ErrShort\` after the error has been wrapped.
- Wrapping with \`%v\`: the message looks identical but \`errors.Is\` can no longer find the cause.
- Creating a fresh \`errors.New("not enough stock")\` at the point of use instead of reusing the sentinel. Two errors with the same text are different values.
- Returning \`nil\` for the value and the error both, so the caller dereferences a nil pointer.`,
      mission: md`Whenever a movement is refused, a human has to find out why. The paper system lost these entirely; yours will put every refusal in an **inbox** with its full story: which line, which gear, what exactly went wrong, and a short class badge so the team can filter.

Write \`lookup\` and \`process\` so they wrap errors with context on the way up, \`classify\` sorts the result with \`errors.Is\`, and \`chain\` walks the layers. When this lesson passes the **Rejected inbox** lights up with the refusals from a seven-line log.`,
      tasks: [
        "Write func lookup(stock []Item, sku string) (*Item, error): use find; for a missing SKU return fmt.Errorf(\"lookup %q: %w\", sku, ErrUnknownSKU)",
        "Write func process(stock []Item, handlers map[string]Handler, m Movement) error: an unknown kind returns fmt.Errorf(\"line %d: %q: %w\", m.Line, m.Kind, ErrUnknownKind); a lookup failure is wrapped as \"line %d: %w\"; a handler failure is wrapped as \"line %d: %s %s: %w\" with the kind and SKU",
        "Write func classify(err error) string using errors.Is in a tagless switch: \"ok\" for nil, \"short\", \"unknown-sku\", \"unknown-kind\", otherwise \"other\"",
        "Write func chain(err error) []string that collects err.Error() for every layer using errors.Unwrap",
        "In main: run the seven given inboxMoves through process with newHandlers() and a fresh seedStock(); for every failure append a row to inbox (line, kind, sku, class, message, chain) and remember the first shortage as firstShort",
        "Build errCompare with directEq (firstShort == ErrShort), viaIs (errors.Is(firstShort, ErrShort)) and chainLen; send inbox and errCompare with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: two more sentinels and a ready-made handler table.
var (
	ErrUnknownSKU  = errors.New("unknown SKU")
	ErrUnknownKind = errors.New("unknown movement kind")
)

// newHandlers returns the handler table used from now on: RETURN is handled like RECEIVE.
func newHandlers() map[string]Handler {
	return map[string]Handler{"RECEIVE": Receiver{}, "RETURN": Receiver{}, "ISSUE": Issuer{}, "RETIRE": &Retirer{}}
}

// Lesson 6: write these.
//   func lookup(stock []Item, sku string) (*Item, error)                       wraps ErrUnknownSKU
//   func process(stock []Item, handlers map[string]Handler, m Movement) error  wraps everything with context
//   func classify(err error) string                                            errors.Is in a switch
//   func chain(err error) []string                                             errors.Unwrap loop

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: fill the rejected inbox.
//   inboxStock := seedStock()
//   inboxHandlers := newHandlers()
//   inboxMoves := []Movement{
//     {Line: 1, Kind: "ISSUE", SKU: "RAD-0031", Qty: 2},
//     {Line: 2, Kind: "ISSUE", SKU: "RAD-0031", Qty: 6},
//     {Line: 3, Kind: "ISSUE", SKU: "ZZZ-9999", Qty: 1},
//     {Line: 4, Kind: "LOAN", SKU: "HAR-0210", Qty: 1},
//     {Line: 5, Kind: "RETIRE", SKU: "HEL-0107", Qty: 2},
//     {Line: 6, Kind: "RECEIVE", SKU: "BAT-0880", Qty: 10},
//     {Line: 7, Kind: "ISSUE", SKU: "SPL-0044", Qty: 9},
//   }
// For each failure append to inbox (a []map[string]any): line, kind, sku, class, message, chain.
// Remember the first shortage as firstShort. Then
//   errCompare := map[string]any{"directEq": firstShort == ErrShort, "viaIs": errors.Is(firstShort, ErrShort), "chainLen": len(chain(firstShort))}
// scene("inbox", inbox), scene("errCompare", errCompare)`,
      solutionAdd: go`// Two more sentinels: part of this package's contract with its callers.
var (
	ErrUnknownSKU  = errors.New("unknown SKU")
	ErrUnknownKind = errors.New("unknown movement kind")
)

// newHandlers returns the handler table used from now on: RETURN is handled like RECEIVE.
func newHandlers() map[string]Handler {
	return map[string]Handler{"RECEIVE": Receiver{}, "RETURN": Receiver{}, "ISSUE": Issuer{}, "RETIRE": &Retirer{}}
}

// lookup finds an item or says which SKU was unknown, keeping the sentinel reachable with %w.
func lookup(stock []Item, sku string) (*Item, error) {
	if it := find(stock, sku); it != nil {
		return it, nil
	}
	return nil, fmt.Errorf("lookup %q: %w", sku, ErrUnknownSKU)
}

// process applies one movement. Every failure is wrapped with the context available at that layer.
func process(stock []Item, handlers map[string]Handler, m Movement) error {
	h, ok := handlers[m.Kind]
	if !ok {
		return fmt.Errorf("line %d: %q: %w", m.Line, m.Kind, ErrUnknownKind)
	}
	it, err := lookup(stock, m.SKU)
	if err != nil {
		return fmt.Errorf("line %d: %w", m.Line, err)
	}
	if err := h.Handle(it, m); err != nil {
		return fmt.Errorf("line %d: %s %s: %w", m.Line, m.Kind, m.SKU, err)
	}
	return nil
}

// classify puts an error in a bucket by asking errors.Is, which looks through every wrapper.
func classify(err error) string {
	switch {
	case err == nil:
		return "ok"
	case errors.Is(err, ErrShort):
		return "short"
	case errors.Is(err, ErrUnknownSKU):
		return "unknown-sku"
	case errors.Is(err, ErrUnknownKind):
		return "unknown-kind"
	}
	return "other"
}

// chain lists the message of every layer, outermost first.
func chain(err error) []string {
	var layers []string
	for err != nil {
		layers = append(layers, err.Error())
		err = errors.Unwrap(err)
	}
	return layers
}

${MAIN_DIVIDER}

// Lesson 6: fill the rejected inbox.
inboxStock := seedStock()
inboxHandlers := newHandlers()
inboxMoves := []Movement{
	{Line: 1, Kind: "ISSUE", SKU: "RAD-0031", Qty: 2},
	{Line: 2, Kind: "ISSUE", SKU: "RAD-0031", Qty: 6},
	{Line: 3, Kind: "ISSUE", SKU: "ZZZ-9999", Qty: 1},
	{Line: 4, Kind: "LOAN", SKU: "HAR-0210", Qty: 1},
	{Line: 5, Kind: "RETIRE", SKU: "HEL-0107", Qty: 2},
	{Line: 6, Kind: "RECEIVE", SKU: "BAT-0880", Qty: 10},
	{Line: 7, Kind: "ISSUE", SKU: "SPL-0044", Qty: 9},
}
var inbox []map[string]any
var firstShort error
for _, m := range inboxMoves {
	err := process(inboxStock, inboxHandlers, m)
	if err == nil {
		continue
	}
	if firstShort == nil && errors.Is(err, ErrShort) {
		firstShort = err
	}
	fmt.Println("refused:", err)
	inbox = append(inbox, map[string]any{"line": m.Line, "kind": m.Kind, "sku": m.SKU, "class": classify(err), "message": err.Error(), "chain": chain(err)})
}
errCompare := map[string]any{"directEq": firstShort == ErrShort, "viaIs": errors.Is(firstShort, ErrShort), "chainLen": len(chain(firstShort))}
scene("inbox", inbox)
scene("errCompare", errCompare)`,
      explanation:
        "lookup, process and handler errors each add a clause with %w, so a refusal reads like 'line 2: ISSUE RAD-0031: not enough stock: RAD-0031 has 3, asked for 6' and the sentinel stays reachable through three layers. classify uses errors.Is, which walks the chain, so it finds ErrShort even though the error was wrapped twice; comparing with == would say false. chain steps down with errors.Unwrap: three layers for the shortage and the unknown SKU, two for the unknown kind (there is no deeper layer than the sentinel). The first movement succeeds, so it never reaches the inbox.",
      hints: [
        { id: "h1", title: "lookup and process", content: "lookup: if it := find(stock, sku); it != nil { return it, nil }; return nil, fmt.Errorf(\"lookup %q: %w\", sku, ErrUnknownSKU). In process look the handler up first (h, ok := handlers[m.Kind]), then lookup, then h.Handle(it, m); wrap each failure with fmt.Errorf(\"line %d: ...: %w\", m.Line, ...) using %w, not %v." },
        { id: "h2", title: "classify and chain", content: "switch { case err == nil: return \"ok\"; case errors.Is(err, ErrShort): return \"short\"; ... } return \"other\". For chain: var layers []string; for err != nil { layers = append(layers, err.Error()); err = errors.Unwrap(err) }." },
        { id: "h3", title: "The inbox loop", content: "for _, m := range inboxMoves { err := process(inboxStock, inboxHandlers, m); if err == nil { continue } ... }. Row: map[string]any{\"line\": m.Line, \"kind\": m.Kind, \"sku\": m.SKU, \"class\": classify(err), \"message\": err.Error(), \"chain\": chain(err)}. Set firstShort the first time errors.Is(err, ErrShort) is true and firstShort is still nil." },
      ],
      tests: [
        {
          id: "t1",
          description: "Each refusal is classified through the wrapped error",
          assertionCode: js`
assert(Array.isArray(scene.inbox), "Send the refusals with scene(\"inbox\", inbox).");
assertEqual(scene.inbox.map((r) => r.line), [2, 3, 4, 7], "inbox lines (movements 2, 3, 4 and 7 fail; 1, 5 and 6 succeed)");
assertEqual(scene.inbox.map((r) => r.class), ["short", "unknown-sku", "unknown-kind", "short"], "classes (use errors.Is in classify; the errors are wrapped, so == would not work)");`,
        },
        {
          id: "t2",
          description: "Messages carry the context added at each layer",
          assertionCode: js`
assertEqual(scene.inbox[0].message, "line 2: ISSUE RAD-0031: not enough stock: RAD-0031 has 3, asked for 6", "message of line 2 (process adds 'line N: KIND SKU: ' in front of the handler's error)");
assertEqual(scene.inbox[1].message, 'line 3: lookup "ZZZ-9999": unknown SKU', "message of line 3 (lookup wraps ErrUnknownSKU, process adds the line)");
assertEqual(scene.inbox[2].message, 'line 4: "LOAN": unknown movement kind', "message of line 4");`,
        },
        {
          id: "t3",
          description: "chain walks the layers with errors.Unwrap",
          assertionCode: js`
assertEqual(scene.inbox.map((r) => r.chain.length), [3, 3, 2, 3], "chain lengths (shortage: process, handler, sentinel; unknown SKU: process, lookup, sentinel; unknown kind: process, sentinel)");
assertEqual(scene.inbox[0].chain[2], "not enough stock", "the last layer of a shortage is the sentinel text");`,
        },
        {
          id: "t4",
          description: "== misses a wrapped sentinel, errors.Is finds it",
          assertionCode: js`
assertEqual(scene.errCompare, { directEq: false, viaIs: true, chainLen: 3 }, "errCompare (firstShort == ErrShort is false once wrapped; errors.Is(firstShort, ErrShort) is true; chain length 3)");`,
        },
      ],
      unlocks: ["gi-inbox"],
      checks: [
        {
          prompt: "`err := fmt.Errorf(\"line 3: %v\", ErrShort)`. What does `errors.Is(err, ErrShort)` return?",
          question: { type: "choice", options: ["true", "false", "A panic", "It depends on the message"], answer: 1 },
          explanation: "%v only copies the text, so the new error does not know about ErrShort. Only %w records the cause for errors.Is to find.",
        },
        {
          prompt: "Which is the better message for a wrapper?",
          question: {
            type: "choice",
            options: ["`Failed to process movement: error: Not Enough Stock.`", "`line 2: ISSUE RAD-0031: not enough stock`", "`ERROR!!! see log`", "`process`"],
            answer: 1,
          },
          explanation: "Wrapped messages are read as one sentence, outermost context first: lower case, no full stop, with just the facts you have at that layer.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "go-inventory-7-error-types",
      title: "Custom errors, errors.As and panics",
      minutes: 40,
      xp: 160,
      concepts: ["custom error type", "errors.As", "Is method", "pointer vs value error", "panic vs error", "recover boundary"],
      learn: md`### When the caller needs the numbers, not just the category

A sentinel says *what kind* of thing went wrong. Sometimes the caller needs the details: **how many** were asked for, **how many** exist. You could parse the message, but that is fragile. Instead make the error a **type** with fields.

~~~go
type StockError struct {
	SKU        string
	Want, Have int
}

func (e *StockError) Error() string {
	return fmt.Sprintf("%s: asked for %d, only %d on the shelf", e.SKU, e.Want, e.Have)
}
~~~

Anything with an \`Error() string\` method is an \`error\` (the interface from lesson 2, built in). Return it like any error:

~~~go
return &StockError{SKU: it.SKU, Want: m.Qty, Have: it.Qty}
~~~

### errors.As: find a type in the chain

\`errors.Is\` asks "is this exact value in the chain?". \`errors.As\` asks "is there a value of **this type** in the chain, and if so give it to me":

~~~go
wrapped := fmt.Errorf("line %d: %w", m.Line, err)

var se *StockError
if errors.As(wrapped, &se) {
	fmt.Println("short by", se.Want-se.Have)      // se now points at the StockError
}
~~~

Details to get right:

- The second argument is a **pointer to a variable of the target type**: \`&se\` where \`se\` is a \`*StockError\`. If the error is returned as a pointer (it was \`&StockError{}\`), the variable must be a pointer. Mix them up and \`As\` simply never matches.
- It must be a non-nil pointer to a type that implements \`error\` (or to any interface). Anything else makes \`errors.As\` **panic** (a programming error, caught by \`go vet\`).
- Like \`Is\`, it walks every wrapper, so the type is found however many layers sit on top.
- The target can be an interface: \`var t interface{ Timeout() bool }; errors.As(err, &t)\` finds any error in the chain with that method.

### Making Is work for your type too

A typed error can still answer \`errors.Is\` for a sentinel, by defining an \`Is\` method. The old code that tests \`errors.Is(err, ErrShort)\` keeps working while new code reaches for the numbers:

~~~go
func (e *StockError) Is(target error) bool { return target == ErrShort }
~~~

If your error wraps another one, add \`Unwrap() error\` so the chain continues through it.

### Choosing: sentinel, type or neither

- A **sentinel** when the caller only needs to branch on the kind.
- A **type** when the caller needs data from the failure (numbers, a field name, a line number).
- Neither: plain \`fmt.Errorf\` text when the only reader is a human.

### panic and recover: not for ordinary failures

A **panic** stops the current function, runs deferred calls, and unwinds the stack. Go programmers return errors for anything that can reasonably go wrong with real data: bad input, a missing record, a refused request. They panic only when the program itself is wrong: a "can't happen" branch, an invalid constant such as \`regexp.MustCompile\` of a pattern in your own source (lesson 13), an index bug.

\`recover\` (only meaningful inside a deferred function) stops a panic. Use it at a **boundary** where one bad item must not take down everything: the loop that handles each movement, an HTTP request handler. Turn the panic into an ordinary error and keep going:

~~~go
type PanicError struct{ Value any }

func (p *PanicError) Error() string { return fmt.Sprintf("handler panicked: %v", p.Value) }

func guard(h Handler, it *Item, m Movement) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = &PanicError{Value: r}      // the named result is how a deferred function returns
		}
	}()
	return h.Handle(it, m)
}
~~~

Do not use \`recover\` to hide bugs inside your own code, and do not wrap every function in one. A recovered runtime panic means *something is wrong in a handler*: record it loudly, which is exactly what the error desk below is for.

### Common mistakes

- Declaring \`var se StockError\` (a value) but returning \`&StockError{}\`: \`errors.As\` never matches.
- Giving \`Error()\` a value receiver but returning pointers, or the other way round, and then confusing yourself about what \`%T\` shows.
- Calling \`errors.As\` with a non-pointer: a panic.
- Using panic for bad input. A malformed line in a log is not a reason to crash.
- Calling \`recover()\` outside a deferred function: it just returns nil.`,
      mission: md`Two kinds of trouble now reach the desk. A shortage needs **numbers**: the stores clerk must see "asked for 9, only 5 on the shelf, short by 4". And one old handler, \`Flaky\`, has a bug that makes it panic on large quantities, and a single bad handler must not stop the rest of the log.

Add the typed error, a stricter issuer that returns it, and a \`guard\` that turns panics into errors. When this lesson passes the **Error desk** lights up with typed badges for each failure.`,
      tasks: [
        "Declare type StockError struct { SKU string; Want, Have int } with a pointer-receiver Error() (\"%s: asked for %d, only %d on the shelf\") and an Is method so errors.Is(err, ErrShort) is true",
        "Declare StrictIssuer{} whose Handle returns &StockError{...} when m.Qty > it.Qty and otherwise takes the stock; add var _ Handler = StrictIssuer{}",
        "Flaky (the buggy handler) is provided. Declare type PanicError struct{ Value any } with an Error() method, and write guard(h Handler, it *Item, m Movement) (err error) that recovers a panic into &PanicError{Value: r}",
        "In main run the four given typedMoves through guard; for every failure wrap it with fmt.Errorf(\"line %d: %w\", ...) and build a row in errTypes: line, sku, isShort, message and, from errors.As, badge (fmt.Sprintf(\"%T\", target)) plus want, have and shortBy for a StockError",
        "Print a line after the loop proving the program survived (still running after the panic), and send errTypes with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: a handler with a bug. It indexes a 3-slot slice with the quantity.
type Flaky struct{}

func (Flaky) Handle(it *Item, m Movement) error {
	slots := []int{1, 2, 3}
	it.Add(slots[m.Qty]) // BUG: panics when m.Qty is 3 or more
	return nil
}

var _ Handler = Flaky{}

// Lesson 7: write these.
//   type StockError struct { SKU string; Want, Have int }   Error() and Is(target) on *StockError
//   type StrictIssuer struct{}                              returns &StockError{...} on a shortage
//   type PanicError struct{ Value any }                     Error() on *PanicError
//   func guard(h Handler, it *Item, m Movement) (err error) defer + recover -> &PanicError{Value: r}
//   var _ Handler = StrictIssuer{}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: the error desk.
//   typedStock := seedStock()
//   typedHandlers := map[string]Handler{"ISSUE": StrictIssuer{}, "FLAKY": Flaky{}}
//   typedMoves := []Movement{
//     {Line: 1, Kind: "ISSUE", SKU: "RAD-0031", Qty: 9},
//     {Line: 2, Kind: "ISSUE", SKU: "HEL-0107", Qty: 20},
//     {Line: 3, Kind: "ISSUE", SKU: "HAR-0210", Qty: 2},
//     {Line: 4, Kind: "FLAKY", SKU: "RAD-0031", Qty: 5},
//   }
// For each move: err := guard(typedHandlers[m.Kind], find(typedStock, m.SKU), m). On failure:
//   wrapped := fmt.Errorf("line %d: %w", m.Line, err)
//   row (map[string]any): line, sku, isShort (errors.Is(wrapped, ErrShort)), message (wrapped.Error())
//   var se *StockError / var pe *PanicError, then errors.As(wrapped, &se) -> badge %T, want, have, shortBy
// After the loop: fmt.Println("still running after the panic"), then scene("errTypes", errTypes)`,
      solutionAdd: go`// Flaky is a handler with a bug. It indexes a 3-slot slice with the quantity.
type Flaky struct{}

func (Flaky) Handle(it *Item, m Movement) error {
	slots := []int{1, 2, 3}
	it.Add(slots[m.Qty]) // BUG: panics when m.Qty is 3 or more
	return nil
}

var _ Handler = Flaky{}

// StockError carries the numbers behind a shortage.
type StockError struct {
	SKU        string
	Want, Have int
}

func (e *StockError) Error() string {
	return fmt.Sprintf("%s: asked for %d, only %d on the shelf", e.SKU, e.Want, e.Have)
}

// Is keeps errors.Is(err, ErrShort) working for callers that only care about the category.
func (e *StockError) Is(target error) bool { return target == ErrShort }

// StrictIssuer is Issuer with a typed error.
type StrictIssuer struct{}

func (StrictIssuer) Handle(it *Item, m Movement) error {
	if m.Qty > it.Qty {
		return &StockError{SKU: it.SKU, Want: m.Qty, Have: it.Qty}
	}
	it.Take(m.Qty)
	return nil
}

var _ Handler = StrictIssuer{}

// PanicError is what a recovered panic becomes.
type PanicError struct{ Value any }

func (p *PanicError) Error() string { return fmt.Sprintf("handler panicked: %v", p.Value) }

// guard runs one handler call and turns a panic into an ordinary error.
func guard(h Handler, it *Item, m Movement) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = &PanicError{Value: r}
		}
	}()
	return h.Handle(it, m)
}

${MAIN_DIVIDER}

// Lesson 7: the error desk.
typedStock := seedStock()
typedHandlers := map[string]Handler{"ISSUE": StrictIssuer{}, "FLAKY": Flaky{}}
typedMoves := []Movement{
	{Line: 1, Kind: "ISSUE", SKU: "RAD-0031", Qty: 9},
	{Line: 2, Kind: "ISSUE", SKU: "HEL-0107", Qty: 20},
	{Line: 3, Kind: "ISSUE", SKU: "HAR-0210", Qty: 2},
	{Line: 4, Kind: "FLAKY", SKU: "RAD-0031", Qty: 5},
}
var errTypes []map[string]any
for _, m := range typedMoves {
	err := guard(typedHandlers[m.Kind], find(typedStock, m.SKU), m)
	if err == nil {
		continue
	}
	wrapped := fmt.Errorf("line %d: %w", m.Line, err)
	row := map[string]any{"line": m.Line, "sku": m.SKU, "isShort": errors.Is(wrapped, ErrShort), "message": wrapped.Error()}
	var se *StockError
	var pe *PanicError
	switch {
	case errors.As(wrapped, &se):
		row["badge"] = fmt.Sprintf("%T", se)
		row["want"], row["have"], row["shortBy"] = se.Want, se.Have, se.Want-se.Have
	case errors.As(wrapped, &pe):
		row["badge"] = fmt.Sprintf("%T", pe)
	}
	errTypes = append(errTypes, row)
	fmt.Println(wrapped)
}
fmt.Println("still running after the panic")
scene("errTypes", errTypes)`,
      explanation:
        "StockError is an error type with numbers in it; StrictIssuer returns it as a pointer, so the variable handed to errors.As has to be a *StockError. The Is method answers true for ErrShort, so older code that only tests the sentinel still works. guard defers a function that calls recover and stores the panic in the named result err, so Flaky's index-out-of-range becomes a *PanicError and the loop carries on to print 'still running after the panic'. Wrapping with %w before the lookups proves errors.As and errors.Is both see through the extra layer: the two shortages report shortBy 4 and 6, and the panic row has the PanicError badge and is not a shortage.",
      hints: [
        { id: "h1", title: "The error type", content: "type StockError struct { SKU string; Want, Have int } and func (e *StockError) Error() string { return fmt.Sprintf(\"%s: asked for %d, only %d on the shelf\", e.SKU, e.Want, e.Have) }. Add func (e *StockError) Is(target error) bool { return target == ErrShort }. StrictIssuer returns &StockError{SKU: it.SKU, Want: m.Qty, Have: it.Qty} when m.Qty > it.Qty." },
        { id: "h2", title: "guard", content: "func guard(h Handler, it *Item, m Movement) (err error) { defer func() { if r := recover(); r != nil { err = &PanicError{Value: r} } }(); return h.Handle(it, m) }. The named result err is what lets the deferred function change what guard returns." },
        { id: "h3", title: "errors.As in the loop", content: "var se *StockError; var pe *PanicError; switch { case errors.As(wrapped, &se): ... case errors.As(wrapped, &pe): ... }. Pass the ADDRESS of the pointer variable. badge := fmt.Sprintf(\"%T\", se) gives \"*main.StockError\". shortBy is se.Want - se.Have." },
      ],
      tests: [
        {
          id: "t1",
          description: "errors.As pulls the numbers out of a wrapped StockError",
          assertionCode: js`
assert(Array.isArray(scene.errTypes), "Send the rows with scene(\"errTypes\", errTypes).");
assertEqual(scene.errTypes.length, 3, "errTypes (moves 1, 2 and 4 fail; move 3 succeeds)");
assertEqual(scene.errTypes.slice(0, 2).map((r) => [r.line, r.sku, r.want, r.have, r.shortBy]), [[1, "RAD-0031", 9, 5, 4], [2, "HEL-0107", 20, 14, 6]], "[line, sku, want, have, shortBy] for the two shortages (read them from the StockError found with errors.As)");`,
        },
        {
          id: "t2",
          description: "Each failure carries its typed badge",
          assertionCode: js`
assertEqual(scene.errTypes.map((r) => r.badge), ["*main.StockError", "*main.StockError", "*main.PanicError"], "badges (fmt.Sprintf(\"%T\", target) on the pointer variable errors.As filled in)");`,
        },
        {
          id: "t3",
          description: "The typed error still answers errors.Is for the sentinel",
          assertionCode: js`
assertEqual(scene.errTypes.map((r) => r.isShort), [true, true, false], "isShort (the StockError has an Is method for ErrShort; the panic is not a shortage)");`,
        },
        {
          id: "t4",
          description: "A panic in a handler is recovered at the boundary",
          assertionCode: js`
const last = scene.errTypes[scene.errTypes.length - 1];
assert(String(last.message).includes("handler panicked") && String(last.message).includes("index out of range"), "The panic row's message should say 'handler panicked: runtime error: index out of range ...'. Recover in a deferred function inside guard and store &PanicError{Value: r} in the named result.");
assert(lines.includes("still running after the panic"), 'No line is exactly "still running after the panic". Print it after the loop to show that the panic did not stop the program.');`,
        },
      ],
      unlocks: ["gi-typed"],
      checks: [
        {
          prompt: "`var se StockError` (a value) and `errors.As(err, &se)` where the chain holds a `*StockError`. What happens?",
          question: { type: "choice", options: ["It matches", "It never matches: the types differ", "Compile error", "Panic"], answer: 1 },
          explanation: "As looks for an error whose type is assignable to the target's element type. A *StockError is not a StockError, so there is no match. Declare the variable with the same type you return.",
        },
        {
          prompt: "A line of the movement log has a quantity of `x`. Panic or return an error?",
          question: { type: "choice", options: ["Panic: the input is wrong", "Return an error: bad input is expected", "Either is fine", "Ignore it silently"], answer: 1 },
          explanation: "Bad data from outside is an ordinary failure that the caller can report and move past. Panics are for programmer errors and broken invariants.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "go-inventory-8-indexes",
      title: "Maps of structs, pointers and sorting",
      minutes: 35,
      xp: 140,
      concepts: ["map of structs", "map of pointers", "copy gotcha", "aliasing", "slices.SortFunc", "cmp.Compare", "maps.Keys"],
      learn: md`### Why index the shelves at all

Finding an item with \`find\` walks the whole slice. Fine for eight lines; at the busiest hour the depot checks thousands. A **map from SKU to item** gives a direct lookup. The decision that matters is what the map holds: **structs** or **pointers to structs**.

### A map of structs holds copies

~~~go
byVal := map[string]Item{}
for _, it := range stock {
	byVal[it.SKU] = it         // a copy
}
~~~

Reading gives you another copy. Two consequences:

~~~go
byVal["BAT-0880"].Qty += 5     // compile error: cannot assign to struct field byVal["BAT-0880"].Qty in map
byVal["BAT-0880"].Add(5)       // compile error: cannot call pointer method Add on Item
~~~

Map entries can move in memory when the map grows, so Go will not give you a place to write into. You must **read, change, store back**:

~~~go
v := byVal["BAT-0880"]
v.Add(5)
byVal["BAT-0880"] = v
~~~

And since the map holds copies, the original slice is **not** affected: the stock lines on the shelf still say 22.

### A map of pointers aliases the original

~~~go
byPtr := map[string]*Item{}
for i := range stock {
	byPtr[stock[i].SKU] = &stock[i]   // the address of the real element
}
byPtr["RAD-0031"].Add(3)              // changes stock[4] itself
~~~

Now there is **one** item and several ways to reach it. That is fast and convenient, and it is also a source of surprises: change it through the map and the slice changes too. Two cautions:

- **Take the address of the element, not of the loop variable.** Since Go 1.22 \`&it\` inside \`for _, it := range\` would point at a per-pass copy, so the map would hold pointers to copies and the slice would still not change. Use \`&stock[i]\`.
- **The pointer points at a slot, not at "that item".** If the slice is re-sorted or grown with \`append\` (which may move it to new memory), your pointers keep pointing at the old slot. Sort a **clone**, or build the index after sorting.

### Missing keys

A lookup of a missing key returns the **zero value** with no error:

~~~go
v := byVal["NOPE-0000"]          // Item{} : Qty 0, SKU ""
_, found := byVal["NOPE-0000"]   // found == false : the comma-ok form tells you
p := byPtr["NOPE-0000"]          // nil: byPtr["NOPE-0000"].Add(1) panics (nil pointer dereference)
~~~

Always use the comma-ok form when "missing" and "zero" mean different things, as they do for stock.

### Which one?

- **Small, plain data you only read** (names, settings): a map of structs. No aliasing worries.
- **Objects you update in place, big structs, or things with identity** (a handler's state, a stock line that many parts of the program touch): a map of pointers, with a clear owner for the memory.
- If the map is only a lookup *into* a slice you keep, store **indexes** (\`map[string]int\`). They survive re-sorting only if you rebuild them, but they never alias.

### Sorting

\`sort.Slice\` (from Gopher Post) still works. Since Go 1.21 the \`slices\` package has generic versions that need no index juggling:

~~~go
sorted := slices.Clone(stock)               // sort a copy, keep the original order
slices.SortFunc(sorted, func(a, b Item) int {
	return cmp.Or(
		cmp.Compare(b.Qty, a.Qty),          // biggest quantity first
		strings.Compare(a.SKU, b.SKU),      // ties by SKU
	)
})
~~~

The comparison function returns a negative number, zero or a positive number (like \`strings.Compare\`). \`cmp.Compare(a, b)\` does that for any ordered type; swap the arguments for descending order. \`cmp.Or\` returns its first non-zero argument, which makes multi-key sorts one expression. For ties that must keep their earlier order use \`slices.SortStableFunc\`.

Map iteration order is random, so to list keys in order:

~~~go
keys := slices.Sorted(maps.Keys(byVal))     // Go 1.23 and later
~~~

\`maps.Keys\` yields the keys, \`slices.Sorted\` collects and sorts them.

### Common mistakes

- Trying to modify a struct field inside a map element.
- Building a pointer map from \`&it\` of a range variable.
- Sorting a slice that a pointer map points into, then trusting the pointers.
- Ranging a map and expecting any particular order.
- Forgetting that \`byPtr[missing]\` is \`nil\` before calling a method on it.`,
      mission: md`The dispatcher now looks up gear by SKU all day, and some callers must change stock through the index. Two clerks disagree on which map to use, so you will build both and **see the difference on the board**: the value index silently forgets changes unless you store them back, while the pointer index changes the real shelves.

Build both indexes, restock one battery pack through each style of index, and produce the two sorted views the stores wall chart needs. When this lesson passes the **Stock index** lights up.`,
      tasks: [
        "Write func indexByValue(items []Item) map[string]Item and func indexByPtr(items []Item) map[string]*Item (the pointers must point at the slice elements, &items[i])",
        "In main: mapStock := seedStock(); byVal := indexByValue(mapStock); byPtr := indexByPtr(mapStock)",
        "Restock BAT-0880 by 5 through byVal (read it into a variable, call Add, store it back) and add 3 to RAD-0031 through byPtr",
        "Record valueMapBAT (byVal's BAT-0880 Qty), sliceBAT (the slice's BAT-0880 Qty, still 22), ptrMapRAD and sliceRAD (both 8)",
        "Sort a clone of mapStock by Qty descending then SKU ascending with slices.SortFunc, cmp.Compare and cmp.Or, and collect the SKUs as byQty; collect sorted keys of byVal as keys with slices.Sorted(maps.Keys(byVal))",
        "Check a missing key both ways (found, missingPtrNil) and send indexView, a map with all of these, with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 8: write these.
//   func indexByValue(items []Item) map[string]Item        copies
//   func indexByPtr(items []Item) map[string]*Item         &items[i], NOT &it

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: two indexes over the same shelves.
// 1. mapStock := seedStock(); byVal := indexByValue(mapStock); byPtr := indexByPtr(mapStock)
// 2. byVal: v := byVal["BAT-0880"]; v.Add(5); byVal["BAT-0880"] = v      byPtr["RAD-0031"].Add(3)
// 3. sorted := slices.Clone(mapStock); slices.SortFunc(sorted, ...) by Qty desc, then SKU asc -> byQty []string of SKUs
//    keys := slices.Sorted(maps.Keys(byVal))
// 4. _, found := byVal["NOPE-0000"]    missingPtrNil := byPtr["NOPE-0000"] == nil
// 5. scene("indexView", map[string]any{"valueMapBAT": ..., "sliceBAT": ..., "ptrMapRAD": ..., "sliceRAD": ...,
//        "byQty": byQty, "keys": keys, "found": found, "missingPtrNil": missingPtrNil})`,
      solutionAdd: go`// indexByValue copies every item into a map. Changes to the map never reach the slice.
func indexByValue(items []Item) map[string]Item {
	index := make(map[string]Item, len(items))
	for _, it := range items {
		index[it.SKU] = it
	}
	return index
}

// indexByPtr points at the real elements of the slice, so changes through the map reach the shelves.
func indexByPtr(items []Item) map[string]*Item {
	index := make(map[string]*Item, len(items))
	for i := range items {
		index[items[i].SKU] = &items[i]
	}
	return index
}

${MAIN_DIVIDER}

// Lesson 8: two indexes over the same shelves.
mapStock := seedStock()
byVal := indexByValue(mapStock)
byPtr := indexByPtr(mapStock)

batCopy := byVal["BAT-0880"]
batCopy.Add(5)
byVal["BAT-0880"] = batCopy // a map of structs needs the write-back
byPtr["RAD-0031"].Add(3)    // a map of pointers changes the real item

sortedStock := slices.Clone(mapStock)
slices.SortFunc(sortedStock, func(a, b Item) int {
	return cmp.Or(cmp.Compare(b.Qty, a.Qty), strings.Compare(a.SKU, b.SKU))
})
var byQty []string
for _, it := range sortedStock {
	byQty = append(byQty, it.SKU)
}
keys := slices.Sorted(maps.Keys(byVal))
_, found := byVal["NOPE-0000"]
missingPtrNil := byPtr["NOPE-0000"] == nil
fmt.Println("by quantity:", byQty)

scene("indexView", map[string]any{
	"valueMapBAT":   byVal["BAT-0880"].Qty,
	"sliceBAT":      find(mapStock, "BAT-0880").Qty,
	"ptrMapRAD":     byPtr["RAD-0031"].Qty,
	"sliceRAD":      find(mapStock, "RAD-0031").Qty,
	"byQty":         byQty,
	"keys":          keys,
	"found":         found,
	"missingPtrNil": missingPtrNil,
})`,
      explanation:
        "indexByValue stores copies, so changing a copy needs the read, change, write-back dance, and the slice still says 22 batteries while the map says 27. indexByPtr stores &items[i], the address of the real slot, so byPtr[\"RAD-0031\"].Add(3) changes the slice too (both read 8). Sorting a Clone keeps mapStock (and the pointers into it) untouched: cmp.Or tries the quantity comparison first (arguments swapped for descending) and falls back to the SKU. slices.Sorted(maps.Keys(byVal)) gives the keys in order despite the random map order. A missing key gives found == false for the value map and a nil pointer for the pointer map.",
      hints: [
        { id: "h1", title: "The two index functions", content: "Both start with make(map[...]..., len(items)). By value: for _, it := range items { index[it.SKU] = it }. By pointer: for i := range items { index[items[i].SKU] = &items[i] } — the address of the element, not of the loop variable." },
        { id: "h2", title: "Changing through each map", content: "Value map: v := byVal[\"BAT-0880\"]; v.Add(5); byVal[\"BAT-0880\"] = v. Pointer map: byPtr[\"RAD-0031\"].Add(3) works directly because the map holds the pointer. Read the slice values with find(mapStock, \"BAT-0880\").Qty." },
        { id: "h3", title: "Sorting", content: "sorted := slices.Clone(mapStock); slices.SortFunc(sorted, func(a, b Item) int { return cmp.Or(cmp.Compare(b.Qty, a.Qty), strings.Compare(a.SKU, b.SKU)) }). For keys: slices.Sorted(maps.Keys(byVal)). The comma-ok lookup: _, found := byVal[\"NOPE-0000\"]." },
      ],
      tests: [
        {
          id: "t1",
          description: "A map of structs holds copies; a map of pointers aliases the shelf",
          assertionCode: js`
assert(scene.indexView && typeof scene.indexView === "object", "Send indexView with scene(\"indexView\", ...).");
const v = scene.indexView;
assertEqual([v.valueMapBAT, v.sliceBAT], [27, 22], "[valueMapBAT, sliceBAT] (the value map was restocked and stored back, but the slice holds its own copy of the item)");
assertEqual([v.ptrMapRAD, v.sliceRAD], [8, 8], "[ptrMapRAD, sliceRAD] (the pointer map points at the slice element, so both show 5 + 3)");`,
        },
        {
          id: "t2",
          description: "Sorting a clone by quantity then SKU",
          assertionCode: js`
assertEqual(scene.indexView.byQty, ["BLK-0150", "BAT-0880", "HEL-0107", "HAR-0210", "RAD-0031", "ROP-0412", "SPL-0044", "ROP-0518"], "byQty (largest quantity first; the slice has BAT 22 and RAD 8 at this point)");`,
        },
        {
          id: "t3",
          description: "Keys come out in order, missing keys are reported",
          assertionCode: js`
assertEqual(scene.indexView.keys, ["BAT-0880", "BLK-0150", "HAR-0210", "HEL-0107", "RAD-0031", "ROP-0412", "ROP-0518", "SPL-0044"], "keys (slices.Sorted(maps.Keys(byVal)))");
assertEqual([scene.indexView.found, scene.indexView.missingPtrNil], [false, true], "[found, missingPtrNil] for the key NOPE-0000");`,
        },
      ],
      unlocks: ["gi-index"],
      checks: [
        {
          prompt: "Why does `for _, it := range stock { idx[it.SKU] = &it }` (Go 1.22 and later) not make the slice change when you modify through `idx`?",
          question: { type: "choice", options: ["Maps copy pointers", "&it is the address of a per-iteration copy, not of the slice element", "Slices are immutable", "The loop never runs"], answer: 1 },
          explanation: "range gives you a copy of each element. Its address points at that copy. Take the address of the element itself: &stock[i].",
        },
        {
          prompt: "What does `byVal[\"NOPE-0000\"]` give when the key is missing, for `map[string]Item`?",
          question: { type: "choice", options: ["A panic", "An error", "The zero Item", "nil"], answer: 2 },
          explanation: "A map lookup never fails: a missing key yields the zero value. Use the comma-ok form (v, ok := m[k]) to tell \"missing\" from \"present but zero\".",
        },
      ],
    },
  ],
};
