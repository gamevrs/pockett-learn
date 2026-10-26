import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 4: Failures, formats and the pipeline. Custom exceptions, JSON in and out, a validating
 * CSV importer, and the capstone that runs it all.
 */

/** The CSV the importer reads (lesson 15 copies it from the starter; lesson 16 reuses the variable). */
const CSV_TEXT = cs`id,cargo,category,origin,vessel,massKg,priority
H-6001,Lettuce seed,Agri,Ceres Yard,V-11,120,2
H-6002,Gyro housings,Machinery,Vesta Dock,V-14,860,2
H-6003,Cold packs,Medical,Luna Gate,V-12,95,1
H-6004,Fusion pellets,Fuel,Ceres Yard,V-99,1500,1
H-6005,Rotor shims,Machinery,Vesta Dock,V-14,abc,2
H-6002,Gyro housings,Machinery,Vesta Dock,V-14,860,2
H-6006,Sample jars,Biohazard,Luna Gate,V-12,40,1
H-6007,Mail sacks,Mail,Luna Gate,V-11,80
,Loose cargo,Supply,Vesta Dock,V-11,300,3
H-6008,Water filters,Pantry,Ceres Yard,V-12,-50,3
H-6009,Greenhouse glass,Machinery,Ceres Yard,V-11,2200,4
H-6010,Ration crates,Supply,Vesta Dock,V-14,640,3`;

export const chapter4: Chapter = {
  id: "failures-formats-pipeline",
  title: "Failures, formats and the pipeline",
  blurb: "Fail with meaning, read and write JSON, import messy files with proper error reports, and run it all as one pipeline.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "csharp-linq-13-exceptions",
      title: "Custom exceptions and failing well",
      minutes: 30,
      xp: 180,
      concepts: ["custom exceptions", "throw", "try/catch/finally", "exception filters", "InnerException", "throw vs return a result", "rethrowing"],
      learn: md`### What an exception carries

When something goes wrong that the current method cannot fix, it **throws** an exception object. The runtime unwinds the call stack looking for a \`catch\` that accepts that type, running any \`finally\` blocks on the way. An exception object is more than a message:

- **Type**: \`InvalidOperationException\`, \`FormatException\`, your own type. Catching by type is how callers react differently to different problems.
- **\`Message\`**: text for people.
- **\`StackTrace\`**: where it happened (with your \`Program.cs:line N\` frames).
- **\`InnerException\`**: the original problem, when this one was raised because of another.

### Your own exception types

Create one when callers need to **react differently** or when the exception should **carry data**:

~~~csharp
class ManifestException : Exception
{
    public ManifestException(string message, string shipmentId, Exception? inner = null)
        : base(message, inner)
    {
        ShipmentId = shipmentId;
    }

    public string ShipmentId { get; }
}

class OverCapacityException : ManifestException
{
    public OverCapacityException(string shipmentId, int excessKg)
        : base($"{shipmentId} is {excessKg} kg over capacity", shipmentId)
    {
        ExcessKg = excessKg;
    }

    public int ExcessKg { get; }
}
~~~

Conventions: derive from \`Exception\` (or a more specific base of your own), end the name with \`Exception\`, pass the message and inner exception up with \`base(...)\`, and expose useful facts as read-only properties so a \`catch\` block does not have to parse the message text. A small hierarchy (one base type for your area, a few specific children) lets a caller catch broadly or narrowly.

### try, catch, when, finally

~~~csharp
try
{
    LoadOnto(vessel, shipment);
}
catch (OverCapacityException ex) when (ex.ExcessKg > 1000)
{
    // far too heavy: reject it
}
catch (OverCapacityException ex)
{
    // slightly over: defer it
}
catch (ManifestException ex)
{
    // any other manifest problem
}
finally
{
    attempts++;      // runs whether or not something was thrown, even on return
}
~~~

- **Order matters.** Catch blocks are tried top to bottom, so put the specific types first. A broader type above a narrower one is a compile error: \`CS0160: A previous catch clause already catches all exceptions of this or of a super type ('ManifestException')\`.
- **\`when\` is an exception filter.** The catch is only taken if the condition is true, and, unlike an \`if\` inside the block, a filter that is false leaves the stack untouched so the next handler (or a debugger) sees the original problem. Keep filters free of side effects.
- **\`finally\`** is for cleanup that must happen (close, release, count). Do not throw from it and do not \`return\` from it.
- **Do not catch \`Exception\` casually.** A catch-all that logs and continues turns bugs into silent wrong answers. Catch what you can actually handle.

### Rethrowing without losing the story

~~~csharp
catch (FormatException ex)
{
    throw new ManifestException($"Bad mass text for {id}", id, ex);   // wrap: keep the original as InnerException
}
catch (Exception)
{
    Log("failed");
    throw;                      // rethrow the SAME exception, stack trace intact
}
~~~

\`throw;\` rethrows as it was. \`throw ex;\` throws the same object but **resets the stack trace** to this line, hiding where it really started: avoid it. Wrapping adds context ("while loading H-3004") without hiding the cause, which is available in \`InnerException\`.

### Throw, or return a result?

Exceptions are for situations the current code **cannot reasonably continue from**, and for bugs (a null argument, a broken invariant). They are slow compared with a normal return and they jump through the code in a way that is hard to follow. When "no" is an **expected, frequent answer**, return it as data instead:

- a \`bool\` with an \`out\` value (the Try pattern): \`bool WouldFit(..., out int excessKg)\`
- a nullable value: \`Shipment? Find(string id)\`
- a small result type (\`record Outcome(bool Ok, string? Reason)\`)

A file that does not exist, a user's typo, a shipment that does not fit this time: ask first, with a method that returns \`false\`, and let the throwing version guard the rare case that slipped through.

### Unhandled exceptions

If nothing catches an exception the program ends. You see the type, the message and a stack trace such as \`at Program.<Main>$(String[] args) in Program.cs:line 118\`; the number is **your** line. Read the top first, then the first frame that names your file.

### Common mistakes

- Catching \`Exception\` and ignoring it (\`catch { }\`).
- \`throw ex;\` instead of \`throw;\`.
- Using exceptions for ordinary control flow, like exiting a loop.
- Putting information only in the message text and forcing callers to parse it. Add a property.
- Forgetting that a \`catch\` for the base type above the derived one will not compile.`,
      mission: md`The little freighter *Saltmarsh* (capacity 4000 kg) is being loaded with cargo from several docks. Sometimes a crate fits, sometimes it is a little too heavy and could wait for the next launch, sometimes it is so far over that it has to be rejected outright, and every attempt must be counted for the loading log whatever happens.

You will model the failures as a small family of exception types that carry their own data, react to them differently with a filter, count every attempt in a \`finally\`, ask politely first with a Try method, and wrap a parsing failure without losing its cause. When this lesson passes, the **Loading incidents** panel shows the log.`,
      tasks: [
        "Under the divider declare class ManifestException : Exception (ctor: message, shipmentId, optional inner; property ShipmentId), class OverCapacityException : ManifestException (ctor: shipmentId, excessKg; message \"<id> is <n> kg over capacity\"; property ExcessKg) and record LoadEntry(string Id, string Outcome, string Detail)",
        "Above: Vessel saltmarsh = vessels.First(...V-15...), int aboardKg = 0, int attempts = 0 and a local function void LoadOnto(Vessel vessel, Shipment shipment) that throws OverCapacityException with the exact excess when aboardKg + MassKg > capacity, otherwise adds the mass. Loop over the ids H-3006, H-3004, H-3005, H-3010, H-3014, H-3008, H-3012 (find each in shipments) with try/catch/finally: a when filter sends an excess over 1000 kg to outcome \"rejected\" (detail = ex.Message), other OverCapacityException goes to \"deferred\" (detail \"<n> kg over, waits for the next launch\"), success is \"loaded\" (detail \"now <aboard> kg aboard\"). finally increments attempts. Add each LoadEntry to List<LoadEntry> loadLog and print lines like H-3006 loaded: now 2500 kg aboard. Then print Load attempts closed: 7 and Saltmarsh carries 3860 of 4000 kg",
        "Write bool WouldFit(int capacityKg, int aboardKg, int massKg, out int excessKg) (the non-throwing check) and print Spare check: 190 kg would fit: False (50 kg over) for the capacity 4000, aboard 3860, mass 190",
        "Write int ReadMass(string id, string text): int.Parse inside a try, and catch FormatException to throw new ManifestException($\"Bad mass text \\\"{text}\\\" for {id}\", id, ex). Call ReadMass(\"H-4003\", \"12O\") in a try/catch for ManifestException and print Wrapped: Bad mass text \"12O\" for H-4003 (inner FormatException). Port.Show loadLog and loadAttempts",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: fail with meaning.
// 1. Vessel saltmarsh = vessels.First(vessel => vessel.Id == "V-15");   int aboardKg = 0;   int attempts = 0;   List<LoadEntry> loadLog = new();
//    void LoadOnto(Vessel vessel, Shipment shipment) -> throw new OverCapacityException(shipment.Id, excess) when aboardKg + shipment.MassKg > vessel.CapacityKg; otherwise aboardKg += shipment.MassKg;
// 2. foreach id in { "H-3006", "H-3004", "H-3005", "H-3010", "H-3014", "H-3008", "H-3012" }:
//      try { LoadOnto(...); loaded entry }
//      catch (OverCapacityException ex) when (ex.ExcessKg > 1000) { "rejected", ex.Message }
//      catch (OverCapacityException ex) { "deferred", $"{ex.ExcessKg} kg over, waits for the next launch" }
//      finally { attempts++; }
//    print  H-3006 loaded: now 2500 kg aboard   (or  H-3004 rejected: H-3004 is 1600 kg over capacity   or   H-3010 deferred: 560 kg over, waits for the next launch)
//    then  Load attempts closed: 7   and   Saltmarsh carries 3860 of 4000 kg
// 3. bool WouldFit(int capacityKg, int aboardKg, int massKg, out int excessKg)      print  Spare check: 190 kg would fit: False (50 kg over)
// 4. int ReadMass(string id, string text) wraps FormatException in ManifestException (keep ex as the inner exception)
//    print  Wrapped: Bad mass text "12O" for H-4003 (inner FormatException)
// Port.Show: loadLog, loadAttempts

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the exception types and the log record here.
//   class ManifestException : Exception { ... }          (message, ShipmentId, optional inner)
//   class OverCapacityException : ManifestException { ... }   (ExcessKg)
//   record LoadEntry(string Id, string Outcome, string Detail);
`,
      solutionAdd: cs`// Lesson 13: custom exceptions.
Vessel saltmarsh = vessels.First(vessel => vessel.Id == "V-15");
int aboardKg = 0;
int attempts = 0;
List<LoadEntry> loadLog = new();

void LoadOnto(Vessel vessel, Shipment shipment)
{
    int excess = aboardKg + shipment.MassKg - vessel.CapacityKg;
    if (excess > 0)
    {
        throw new OverCapacityException(shipment.Id, excess);
    }
    aboardKg += shipment.MassKg;
}

foreach (string loadId in new[] { "H-3006", "H-3004", "H-3005", "H-3010", "H-3014", "H-3008", "H-3012" })
{
    Shipment candidate = shipments.First(shipment => shipment.Id == loadId);
    LoadEntry entry;
    try
    {
        LoadOnto(saltmarsh, candidate);
        entry = new LoadEntry(loadId, "loaded", $"now {aboardKg} kg aboard");
    }
    catch (OverCapacityException ex) when (ex.ExcessKg > 1000)
    {
        entry = new LoadEntry(loadId, "rejected", ex.Message);
    }
    catch (OverCapacityException ex)
    {
        entry = new LoadEntry(loadId, "deferred", $"{ex.ExcessKg} kg over, waits for the next launch");
    }
    finally
    {
        attempts++;
    }
    loadLog.Add(entry);
    Console.WriteLine($"{entry.Id} {entry.Outcome}: {entry.Detail}");
}
Console.WriteLine($"Load attempts closed: {attempts}");
Console.WriteLine($"Saltmarsh carries {aboardKg} of {saltmarsh.CapacityKg} kg");

bool WouldFit(int capacityKg, int aboardNow, int massKg, out int excessKg)
{
    excessKg = Math.Max(0, aboardNow + massKg - capacityKg);
    return excessKg == 0;
}
bool spareFits = WouldFit(saltmarsh.CapacityKg, aboardKg, 190, out int spareExcess);
Console.WriteLine($"Spare check: 190 kg would fit: {spareFits} ({spareExcess} kg over)");

int ReadMass(string id, string text)
{
    try
    {
        return int.Parse(text);
    }
    catch (FormatException ex)
    {
        throw new ManifestException($"Bad mass text \"{text}\" for {id}", id, ex);
    }
}
try
{
    ReadMass("H-4003", "12O");
}
catch (ManifestException ex)
{
    Console.WriteLine($"Wrapped: {ex.Message} (inner {ex.InnerException?.GetType().Name})");
}

Port.Show("loadLog", loadLog);
Port.Show("loadAttempts", attempts);

${TYPES_DIVIDER}

// Anything that goes wrong with a manifest entry. Carries the shipment it is about.
class ManifestException : Exception
{
    public ManifestException(string message, string shipmentId, Exception? inner = null)
        : base(message, inner)
    {
        ShipmentId = shipmentId;
    }

    public string ShipmentId { get; }
}

// The shipment does not fit; says by how much, so callers can decide what to do.
class OverCapacityException : ManifestException
{
    public OverCapacityException(string shipmentId, int excessKg)
        : base($"{shipmentId} is {excessKg} kg over capacity", shipmentId)
    {
        ExcessKg = excessKg;
    }

    public int ExcessKg { get; }
}

// One line of the loading log.
record LoadEntry(string Id, string Outcome, string Detail);`,
      explanation:
        "LoadOnto throws OverCapacityException carrying the exact excess, and the caller reacts by type and by value: the first catch has a when filter so a shipment more than 1000 kg over is rejected, a shipment slightly over falls through to the second catch and is deferred, and the loaded ones never reach a catch at all. The finally block runs once per attempt whichever path was taken, so attempts ends at 7. WouldFit is the same rule as a Try method: the expected 'no' becomes false plus an out value, with no exception cost. ReadMass wraps the FormatException in the port's own ManifestException and passes the original along as InnerException, so the context is added without losing the cause.",
      hints: [
        { id: "h1", title: "Exceptions that carry data", content: "class OverCapacityException : ManifestException { public OverCapacityException(string shipmentId, int excessKg) : base($\"{shipmentId} is {excessKg} kg over capacity\", shipmentId) { ExcessKg = excessKg; } public int ExcessKg { get; } } and ManifestException passes message and inner to base(message, inner)." },
        { id: "h2", title: "Specific first, with a filter", content: "catch (OverCapacityException ex) when (ex.ExcessKg > 1000) { ... } must come BEFORE the plain catch (OverCapacityException ex). Declare LoadEntry entry; before the try and assign it in every branch, then loadLog.Add(entry) after the finally. finally { attempts++; }" },
        { id: "h3", title: "Out values and wrapping", content: "bool WouldFit(int capacityKg, int aboardNow, int massKg, out int excessKg) { excessKg = Math.Max(0, aboardNow + massKg - capacityKg); return excessKg == 0; } For the wrap: catch (FormatException ex) { throw new ManifestException(\"...\", id, ex); } and read ex.InnerException?.GetType().Name." },
      ],
      tests: [
        {
          id: "t1",
          description: "each outcome is chosen by the exception's type and data",
          assertionCode: js`
assert(Array.isArray(scene.loadLog) && scene.loadLog.length === 7, 'Send the seven LoadEntry records with Port.Show("loadLog", loadLog);');
assertEqual(scene.loadLog.map((e) => e.outcome), ["loaded", "rejected", "loaded", "deferred", "loaded", "loaded", "rejected"], "outcomes in attempt order (loaded / rejected for more than 1000 kg over / deferred for a smaller excess)");
assertEqual(scene.loadLog[1], { id: "H-3004", outcome: "rejected", detail: "H-3004 is 1600 kg over capacity" }, "the H-3004 entry (use ex.Message as the detail)");
assertEqual(scene.loadLog[3].detail, "560 kg over, waits for the next launch", "the deferred H-3010 detail");
assert(lines.includes("H-3006 loaded: now 2500 kg aboard"), 'Print "H-3006 loaded: now 2500 kg aboard".');`,
        },
        {
          id: "t2",
          description: "finally runs for every attempt",
          assertionCode: js`
assert(lines.includes("Load attempts closed: 7"), 'Print "Load attempts closed: 7": increment the counter in a finally block, so it runs for loaded, deferred and rejected attempts alike.');
assertEqual(scene.loadAttempts, 7, "loadAttempts");
assert(lines.includes("Saltmarsh carries 3860 of 4000 kg"), 'Print "Saltmarsh carries 3860 of 4000 kg": only the four loaded shipments count.');`,
        },
        {
          id: "t3",
          description: "an expected 'no' is returned, not thrown",
          assertionCode: js`assert(lines.includes("Spare check: 190 kg would fit: False (50 kg over)"), 'Print "Spare check: 190 kg would fit: False (50 kg over)": WouldFit(4000, 3860, 190, out excess) returns false and reports the excess through the out parameter.');`,
        },
        {
          id: "t4",
          description: "a parse failure is wrapped with context and keeps its cause",
          assertionCode: js`assert(lines.includes('Wrapped: Bad mass text "12O" for H-4003 (inner FormatException)'), 'Print Wrapped: Bad mass text "12O" for H-4003 (inner FormatException): catch the FormatException from int.Parse and throw a ManifestException that passes it on as the inner exception.');`,
        },
      ],
      unlocks: ["hp-faults"],
      checks: [
        {
          prompt: "Which `catch` order compiles?",
          question: {
            type: "choice",
            options: [
              "`catch (OverCapacityException) { }` then `catch (ManifestException) { }`",
              "`catch (ManifestException) { }` then `catch (OverCapacityException) { }`",
              "Both orders compile",
              "Neither: only one `catch` is allowed",
            ],
            answer: 0,
          },
          explanation: "Handlers are tried top to bottom. `OverCapacityException` derives from `ManifestException`, so a base-type handler placed first would swallow it and the second one could never run, which the compiler rejects (CS0160).",
        },
        {
          prompt: "In a `catch` block, what is the difference between `throw;` and `throw ex;`?",
          question: {
            type: "choice",
            options: [
              "`throw;` rethrows the original with its stack trace; `throw ex;` resets the trace to the current line",
              "No difference",
              "`throw ex;` is faster",
              "`throw;` creates a brand new exception",
            ],
            answer: 0,
          },
          explanation: "Resetting the stack trace hides where the problem really began. Use `throw;` to pass an exception on unchanged, or wrap it in a new exception and keep the original as `InnerException`.",
        },
        {
          prompt: "A user mistypes a vessel id in a search box about once an hour. What is the better design?",
          question: {
            type: "choice",
            options: [
              "A `TryFindVessel` method (or `Vessel?`) that returns \"not found\" as an ordinary answer",
              "Throw `VesselNotFoundException` and catch it in the UI",
              "Call `Environment.Exit`",
              "Ignore the typo",
            ],
            answer: 0,
          },
          explanation: "A mistyped id is an expected event. Returning it as data keeps the code simple and fast; keep exceptions for conditions the caller cannot sensibly continue from.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "csharp-linq-14-json",
      title: "JSON with System.Text.Json",
      minutes: 30,
      xp: 190,
      concepts: ["System.Text.Json", "JsonSerializer", "JsonSerializerOptions", "naming policy", "JsonException", "validation after deserializing", "raw string literals"],
      learn: md`### JSON in one minute

**JSON** is the plain-text format almost everything on the internet uses to move data: objects \`{ "name": value }\`, arrays \`[ ... ]\`, strings, numbers, \`true\`/\`false\` and \`null\`. In .NET the built-in tool is \`System.Text.Json\`. You describe the data with a normal C# type (a record is perfect) and let the serializer do the conversion in both directions.

~~~csharp
string text = JsonSerializer.Serialize(vessel, options);                    // object -> JSON text
ArrivalNotice? notice = JsonSerializer.Deserialize<ArrivalNotice>(json, options);   // JSON text -> object
~~~

### Options, created once

\`JsonSerializerOptions\` controls the details. Build it **once** and reuse it (the serializer caches type information in it, so creating a new one for every call is slow):

~~~csharp
JsonSerializerOptions jsonOptions = new()
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,   // CapacityKg  ->  "capacityKg"
    PropertyNameCaseInsensitive = true,                  // accept "CAPACITYKG" or "capacityKg" when reading
    WriteIndented = true,                                // pretty print (omit for compact output)
};
~~~

JSON by convention uses camelCase names while C# uses PascalCase; the naming policy translates. Other useful switches: \`DefaultIgnoreCondition\` (skip nulls), \`Converters\` with \`JsonStringEnumConverter\` (write enums as names instead of numbers) and \`UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow\` (reject unknown properties instead of ignoring them). Attributes override per property: \`[JsonPropertyName("vessel_id")]\`, \`[JsonIgnore]\`.

### What deserializing does and does not do

- Positional **records** work: the serializer finds the constructor and matches JSON properties to its parameters.
- A property that is **missing** from the JSON quietly becomes its default: \`0\`, \`null\`, \`false\`. A **wrong type** (\`"soon"\` where a number belongs) throws. An **unknown** property is ignored unless you ask otherwise.
- Numbers like \`-20\` or \`7\` are perfectly good JSON integers, so the serializer is happy with a negative mass or a priority of 7. **Deserializing proves the text had the right shape, not that the values make sense.** Always validate afterwards: ranges, required fields, cross-checks. This is the single most important habit in this lesson.
- \`Deserialize<T>\` can return \`null\` (when the JSON text is the literal \`null\`), so its result is nullable.

### Errors are values you can report

Malformed or mismatched JSON throws \`JsonException\`. Its message names the problem and its \`Path\`, \`LineNumber\` and \`BytePositionInLine\` properties say where, which is what you want in an error report:

~~~csharp
try
{
    var notice = JsonSerializer.Deserialize<ArrivalNotice>(json, jsonOptions);
}
catch (JsonException ex)
{
    Console.WriteLine($"{ex.Message}");                 // The JSON value could not be converted to ArrivalNotice. Path: $.arrivesInMinutes | LineNumber: 2 | BytePositionInLine: 28.
    Console.WriteLine($"line {ex.LineNumber + 1}, path {ex.Path}");
}
~~~

\`LineNumber\` and \`BytePositionInLine\` are zero-based and nullable (they are \`long?\`), so add one for people and use \`?? 0\` where they might be missing. \`Path\` uses a JSONPath-like form: \`$.shipments[2].massKg\`.

### Writing JSON by hand in C#: raw string literals

C# 11 added **raw string literals**: start and end with three or more double quotes, and everything inside is taken literally, with no escaping. The indentation of the closing \`"""\` is removed from every line:

~~~csharp
string json = """
    { "vesselId": "V-12", "arrivesInMinutes": 45 }
    """;
~~~

That is far easier than escaping every quote (\`"{ \"vesselId\": ... }"\`).

### When you do not know the shape: \`JsonDocument\`

For input you only want to peek into, \`JsonDocument.Parse(json)\` gives a read-only tree: \`doc.RootElement.TryGetProperty("vesselId", out var element)\`. It avoids defining a type, at the cost of manual checks. Prefer typed records whenever the shape is known.

### Common mistakes

- Trusting deserialized values without validating.
- A new \`JsonSerializerOptions\` per call.
- Forgetting the naming policy so the JSON has \`"VesselId"\` while the other side sends \`"vesselId"\`. (Case-insensitive reading hides it on input but not on output.)
- Serializing fields instead of properties (the default ignores public fields).
- Catching \`Exception\` instead of \`JsonException\`, and thereby hiding real bugs.`,
      mission: md`Arrival notices reach the port from outside systems as JSON documents, and the port publishes its own vessel records the same way. Outsiders are unreliable: one notice has a negative mass, another a priority of 7, another is not even valid JSON.

You will export a vessel with tidy camelCase JSON, read an incoming notice into a record, validate every shipment inside it and keep the reasons for the ones you refuse, and report a broken document with the exact place of the fault. When this lesson passes, the **JSON desk** shows the document you exported and the notice you imported.`,
      tasks: [
        "Create the reusable JsonSerializerOptions jsonOptions (CamelCase naming, case-insensitive reading, WriteIndented). Serialize vessels[0] into string exportJson, print it with Console.WriteLine and Port.Show it",
        "Under the divider declare record ArrivalNotice(string VesselId, int ArrivesInMinutes, List<Shipment> Shipments). Copy the notice JSON from the starter into a raw string literal noticeJson, deserialize it (null means a failure) and print Notice: V-12 arrives in 45 min with 4 shipments, 1125 kg. Port.Show notice as new { VesselId, Shipments = count, TotalKg }",
        "Validate each shipment in the notice: MassKg must be above 0 (reason mass must be positive, got -20) and Priority must be 1 to 3 (reason priority must be 1 to 3, got 7). Collect the rejects as List<object> jsonRejects of new { Id, Reason } and print Accepted 2 of 4 shipments, then Rejected H-5003: mass must be positive, got -20 and the other reject. Port.Show jsonRejects",
        "Write ArrivalNotice? ReadNotice(string json, out string? error) with a try/catch (JsonException) that returns null and an error text. Feed it the broken document from the starter (a string where a number belongs) and print JSON error at line 3, position 29, path $.arrivesInMinutes (use LineNumber + 1 and BytePositionInLine + 1). Port.Show jsonError as new { Message, Line, Position, Path }",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: JSON in and out.
// 1. JsonSerializerOptions jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true, WriteIndented = true };
//    string exportJson = JsonSerializer.Serialize(vessels[0], jsonOptions);   Console.WriteLine(exportJson);   Port.Show("exportJson", exportJson);
// 2. record ArrivalNotice(string VesselId, int ArrivesInMinutes, List<Shipment> Shipments);   (under the divider)
//    string noticeJson = """ ... """;   ArrivalNotice? notice = JsonSerializer.Deserialize<ArrivalNotice>(noticeJson, jsonOptions);
//    print  Notice: V-12 arrives in 45 min with 4 shipments, 1125 kg      Port.Show("notice", new { VesselId, Shipments, TotalKg });
// 3. validate: MassKg > 0 ("mass must be positive, got -20"), Priority 1..3 ("priority must be 1 to 3, got 7")
//    List<object> jsonRejects of new { Id, Reason };   print  Accepted 2 of 4 shipments   and   Rejected H-5003: mass must be positive, got -20
// 4. ArrivalNotice? ReadNotice(string json, out string? error) -> catch (JsonException ex);  use the broken document below
//    print  JSON error at line 3, position 29, path $.arrivesInMinutes      Port.Show("jsonError", new { Message, Line, Position, Path });
string noticeJson = """
{
  "vesselId": "V-12",
  "arrivesInMinutes": 45,
  "shipments": [
    { "id": "H-5001", "cargo": "Cobalt rods", "category": "Machinery", "origin": "Vesta Dock", "vesselId": "V-12", "massKg": 700, "priority": 2 },
    { "id": "H-5002", "cargo": "Sample vials", "category": "Medical", "origin": "Luna Gate", "vesselId": "V-12", "massKg": 35, "priority": 1 },
    { "id": "H-5003", "cargo": "Ballast sand", "category": "Supply", "origin": "Ceres Yard", "vesselId": "V-12", "massKg": -20, "priority": 3 },
    { "id": "H-5004", "cargo": "Moss panels", "category": "Agri", "origin": "Luna Gate", "vesselId": "V-12", "massKg": 410, "priority": 7 }
  ]
}
""";
string brokenJson = """
{
  "vesselId": "V-12",
  "arrivesInMinutes": "soon",
  "shipments": []
}
""";

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the notice record here.
//   record ArrivalNotice(string VesselId, int ArrivesInMinutes, List<Shipment> Shipments);
`,
      solutionAdd: cs`// Lesson 14: JSON in and out.
JsonSerializerOptions jsonOptions = new()
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
    WriteIndented = true,
};

string exportJson = JsonSerializer.Serialize(vessels[0], jsonOptions);
Console.WriteLine(exportJson);
Port.Show("exportJson", exportJson);

string noticeJson = """
{
  "vesselId": "V-12",
  "arrivesInMinutes": 45,
  "shipments": [
    { "id": "H-5001", "cargo": "Cobalt rods", "category": "Machinery", "origin": "Vesta Dock", "vesselId": "V-12", "massKg": 700, "priority": 2 },
    { "id": "H-5002", "cargo": "Sample vials", "category": "Medical", "origin": "Luna Gate", "vesselId": "V-12", "massKg": 35, "priority": 1 },
    { "id": "H-5003", "cargo": "Ballast sand", "category": "Supply", "origin": "Ceres Yard", "vesselId": "V-12", "massKg": -20, "priority": 3 },
    { "id": "H-5004", "cargo": "Moss panels", "category": "Agri", "origin": "Luna Gate", "vesselId": "V-12", "massKg": 410, "priority": 7 }
  ]
}
""";
string brokenJson = """
{
  "vesselId": "V-12",
  "arrivesInMinutes": "soon",
  "shipments": []
}
""";

ArrivalNotice? notice = JsonSerializer.Deserialize<ArrivalNotice>(noticeJson, jsonOptions);
if (notice is null)
{
    throw new InvalidOperationException("The notice was empty.");
}
int noticeKg = notice.Shipments.Sum(shipment => shipment.MassKg);
Console.WriteLine($"Notice: {notice.VesselId} arrives in {notice.ArrivesInMinutes} min with {notice.Shipments.Count} shipments, {noticeKg} kg");
Port.Show("notice", new { notice.VesselId, Shipments = notice.Shipments.Count, TotalKg = noticeKg });

List<object> jsonRejects = new();
int noticeAccepted = 0;
foreach (Shipment incoming in notice.Shipments)
{
    string? problem = incoming switch
    {
        { MassKg: <= 0 } => $"mass must be positive, got {incoming.MassKg}",
        { Priority: < 1 or > 3 } => $"priority must be 1 to 3, got {incoming.Priority}",
        _ => null,
    };
    if (problem is null)
    {
        noticeAccepted++;
    }
    else
    {
        jsonRejects.Add(new { incoming.Id, Reason = problem });
        Console.WriteLine($"Rejected {incoming.Id}: {problem}");
    }
}
Console.WriteLine($"Accepted {noticeAccepted} of {notice.Shipments.Count} shipments");
Port.Show("jsonRejects", jsonRejects);

ArrivalNotice? ReadNotice(string json, out string? error)
{
    try
    {
        error = null;
        return JsonSerializer.Deserialize<ArrivalNotice>(json, jsonOptions);
    }
    catch (JsonException ex)
    {
        error = $"JSON error at line {ex.LineNumber + 1}, position {ex.BytePositionInLine + 1}, path {ex.Path}";
        Port.Show("jsonError", new { ex.Message, Line = ex.LineNumber + 1, Position = ex.BytePositionInLine + 1, ex.Path });
        return null;
    }
}
ArrivalNotice? brokenNotice = ReadNotice(brokenJson, out string? readError);
Console.WriteLine(readError);

${TYPES_DIVIDER}

// An arrival notice as the outside systems send it.
record ArrivalNotice(string VesselId, int ArrivesInMinutes, List<Shipment> Shipments);`,
      explanation:
        "One reusable options object translates PascalCase C# names to camelCase JSON in both directions, and WriteIndented makes the exported vessel readable. The notice deserializes into the record, shipments and all, because the serializer matches JSON properties to the positional constructor. It also happily accepts a mass of -20 and a priority of 7, since both are valid JSON numbers, so the validation step afterwards (a switch expression with property patterns) is what actually keeps those two out. The broken document throws JsonException because a string cannot become an int, and the exception's own Path, LineNumber and BytePositionInLine become a precise error report.",
      hints: [
        { id: "h1", title: "Options once", content: "JsonSerializerOptions jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true, WriteIndented = true }; then JsonSerializer.Serialize(vessels[0], jsonOptions). Declare record ArrivalNotice(...) under the divider." },
        { id: "h2", title: "Deserialize, then validate", content: "ArrivalNotice? notice = JsonSerializer.Deserialize<ArrivalNotice>(noticeJson, jsonOptions); the result may be null. The serializer does not check ranges, so loop over notice.Shipments and test MassKg <= 0 and Priority < 1 || Priority > 3 yourself." },
        { id: "h3", title: "Reading a JsonException", content: "catch (JsonException ex) { ... ex.LineNumber + 1 ... ex.BytePositionInLine + 1 ... ex.Path ... } LineNumber and BytePositionInLine are nullable long values counted from zero. Path for the broken document is $.arrivesInMinutes." },
      ],
      tests: [
        {
          id: "t1",
          description: "a vessel is exported as indented camelCase JSON",
          assertionCode: js`
assert(typeof scene.exportJson === "string", 'Send the text with Port.Show("exportJson", exportJson);');
assert(lines.includes('  "capacityKg": 9000,'), 'Print the exported JSON: with CamelCase naming and WriteIndented the vessel has a line  "capacityKg": 9000,  (two spaces of indent).');
assert(scene.exportJson.includes('"name": "Pelican Run"') && !scene.exportJson.includes('"Name"'), "The exported property names must be camelCase (name, not Name).");`,
        },
        {
          id: "t2",
          description: "an incoming notice is deserialized into a record",
          assertionCode: js`
assert(lines.includes("Notice: V-12 arrives in 45 min with 4 shipments, 1125 kg"), 'Print "Notice: V-12 arrives in 45 min with 4 shipments, 1125 kg" from the deserialized ArrivalNotice.');
assertEqual(scene.notice, { vesselId: "V-12", shipments: 4, totalKg: 1125 }, "notice (VesselId, Shipments, TotalKg)");`,
        },
        {
          id: "t3",
          description: "values the serializer cannot judge are validated afterwards, with reasons",
          assertionCode: js`
assert(lines.includes("Accepted 2 of 4 shipments"), 'Print "Accepted 2 of 4 shipments": H-5003 (mass -20) and H-5004 (priority 7) must be refused.');
assert(lines.includes("Rejected H-5003: mass must be positive, got -20"), 'Print "Rejected H-5003: mass must be positive, got -20".');
assertEqual(scene.jsonRejects, [{ id: "H-5003", reason: "mass must be positive, got -20" }, { id: "H-5004", reason: "priority must be 1 to 3, got 7" }], "jsonRejects (Id, Reason)");`,
        },
        {
          id: "t4",
          description: "a broken document is reported with its exact position",
          assertionCode: js`
assert(lines.includes("JSON error at line 3, position 29, path $.arrivesInMinutes"), 'Print "JSON error at line 3, position 29, path $.arrivesInMinutes": use LineNumber + 1, BytePositionInLine + 1 and Path from the JsonException.');
assertEqual(scene.jsonError.path, "$.arrivesInMinutes", "jsonError.path");
assertEqual(scene.jsonError.line, 3, "jsonError.line");
assert(typeof scene.jsonError.message === "string" && scene.jsonError.message.includes("could not be converted"), "jsonError.message should be the exception's Message.");`,
        },
      ],
      unlocks: ["hp-json"],
      checks: [
        {
          prompt: "The JSON `{ \"vesselId\": \"V-12\" }` is deserialized into `record ArrivalNotice(string VesselId, int ArrivesInMinutes, List<Shipment> Shipments)`. What are `ArrivesInMinutes` and `Shipments`?",
          question: {
            type: "choice",
            options: [
              "`0` and `null`: missing properties quietly get their default values",
              "An exception is always thrown for missing properties",
              "`-1` and an empty list",
              "The serializer asks for the missing values",
            ],
            answer: 0,
          },
          explanation: "By default missing properties become `default(T)`. That is why a `Shipments` list can be null after reading, and why you validate the result (or mark properties `required`).",
        },
        {
          prompt: "Why should a `JsonSerializerOptions` object be created once and reused?",
          question: {
            type: "choice",
            options: [
              "The serializer caches type metadata inside it, so a new one per call repeats that work",
              "Options cannot be changed after creation",
              "Only one options object may exist per program",
              "It makes the JSON smaller",
            ],
            answer: 0,
          },
          explanation: "Building and warming the metadata for a type is the expensive part. A single static options instance pays that cost once.",
        },
        {
          prompt: "JSON arrives with `\"massKg\": -20`. Does `Deserialize<Shipment>` throw?",
          question: {
            type: "choice",
            options: [
              "No: -20 is a valid integer, so you must validate the range yourself",
              "Yes: mass cannot be negative",
              "Yes, a `FormatException`",
              "No, and the value becomes 0",
            ],
            answer: 0,
          },
          explanation: "The serializer checks shape and types, not meaning. Business rules (ranges, required combinations) are your code's job after deserializing.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "csharp-linq-15-importer",
      title: "A validating CSV importer",
      minutes: 35,
      xp: 200,
      concepts: ["CSV parsing", "validation rules", "collecting all problems", "error reports", "HashSet for duplicates", "ReplaceLineEndings", "ImportResult"],
      learn: md`### Importing is mostly about the bad rows

Reading a clean file is easy. A real importer earns its keep on the rows that are wrong: it must **not crash on the first one**, must **not silently skip anything**, and must tell the person fixing the file *which row* and *what is wrong*. That gives a design with two outputs, not one:

~~~csharp
record RejectedRow(int Line, string Raw, List<string> Reasons);
record ImportResult(List<Shipment> Accepted, List<RejectedRow> Rejected);
~~~

Every input row ends up in exactly one list. That is also a property you can test: \`accepted + rejected == rows in the file\`.

### The shape of the code

1. **Split the text into lines**, keeping line numbers. Windows files use \`\r\n\` and others use \`\n\`; \`text.ReplaceLineEndings("\n").Split('\n')\` handles both. Remember that line 1 is the header, and that humans count from 1, so \`lineNumber = index + 1\`. Skip blank lines but still count them.
2. **Split each line into fields.** \`line.Split(',')\` is enough for simple files. A real CSV may quote a field that contains a comma (\`"Hull plating, reinforced"\`); a plain \`Split\` then finds one field too many. Our importer simply rejects such a row (\`expected 7 fields, found 8\`) instead of guessing, and a production system would use a proper CSV parser.
3. **Check the field count first**, because indexing a missing field would throw.
4. **Apply the rules**, one by one, and **collect every problem**, not just the first. If a row has two faults, the person editing the file would otherwise fix one, re-run, and discover the second.
5. **Build the record only if the list of problems is empty.**

### Rules as small checks

~~~csharp
List<string> reasons = new();
if (!idRule.IsMatch(id)) reasons.Add(id == "" ? "id: missing" : $"id: \"{id}\" is not like H-0000");
else if (!seenIds.Add(id)) reasons.Add("id: duplicate of an earlier row");
if (!knownCategories.Contains(category)) reasons.Add($"category: unknown \"{category}\"");
if (!knownVessels.Contains(vessel)) reasons.Add($"vessel: unknown \"{vessel}\"");
if (!int.TryParse(massText, out int massKg)) reasons.Add($"mass: \"{massText}\" is not a whole number");
else if (massKg <= 0) reasons.Add($"mass: must be positive, got {massKg}");
~~~

Details worth noticing:

- A **HashSet<string>** answers "have I seen this id already?" in one step: \`seenIds.Add(id)\` returns \`false\` for a repeat, and it records the id for the next row at the same time. Only add an id to the set for rows you are going to accept or at least read in full, and decide deliberately which of two duplicates counts as the "earlier" one.
- A **prefix** like \`id:\` or \`mass:\` on each reason is a cheap way to make reasons groupable: \`reason.Split(':')[0]\` gives the field.
- When one fact decides another (the mass is not a number, so asking whether it is positive makes no sense), use \`else if\` so you do not report a nonsense second problem.

### Reports that people can use

After the loop, summarise: how many accepted, how many rejected, and *why*, grouped:

~~~csharp
var byField = result.Rejected
    .SelectMany(row => row.Reasons)
    .GroupBy(reason => reason.Split(':')[0])
    .Select(group => new { Field = group.Key, Count = group.Count() });
~~~

Print each rejected row with its line number and reasons, plus a final tally. The raw text of the failed row belongs in the report too, so nobody has to open the file to see what you saw.

### Common mistakes

- Throwing on the first bad row and losing the rest of the file.
- Reporting positions that count from 0, or that ignore the header.
- Forgetting to trim fields (\`" Agri "\` is not \`"Agri"\`).
- Validating with the value you intended to store instead of what is in the file.
- Letting a row appear in neither list (a \`continue\` in the wrong place).`,
      mission: md`The cargo office sends a CSV every night, typed by hand in four different spreadsheets. Last night's file has twelve rows and, as usual, plenty of faults: an unknown vessel, a weight that says \`abc\`, a duplicate row, a missing id, a row with a category nobody has heard of *and* a negative weight.

You will build the importer so that every row is either loaded or sent to a validation inbox with a line number and plain-words reasons. When this lesson passes, the **Validation inbox** lights up and shows the rejected rows with their reasons.`,
      tasks: [
        "Under the divider declare record RejectedRow(int Line, string Raw, List<string> Reasons) and record ImportResult(List<Shipment> Accepted, List<RejectedRow> Rejected). Above, copy the CSV text from the starter into a raw string literal csv",
        "Write local function ImportManifest(string csvText) returning ImportResult. Split with ReplaceLineEndings, skip the header and blank lines, keep line numbers (index + 1). A row needs exactly 7 fields (Trim each): otherwise add the reason row: expected 7 fields, found N and reject it",
        "Collect every problem of a row with these exact reason texts: id (a regex H- and four digits): id: missing / id: \"x\" is not like H-0000 / id: duplicate of an earlier row (use a HashSet of seen ids); category (must be one of Agri, Fuel, Machinery, Mail, Medical, Supply): category: unknown \"Pantry\"; vessel (must be a vessel id from vessels): vessel: unknown \"V-99\"; mass: mass: \"abc\" is not a whole number or mass: must be positive, got -50; priority: priority: must be 1 to 3, got 4. A row with no problems becomes a Shipment (Id, Cargo, Category, Origin, VesselId, MassKg, Priority) in Accepted",
        "Call it and print Accepted 4, rejected 8, then one line per rejected row like Line 5: vessel: unknown \"V-99\" (reasons joined with \"; \"), then Reasons by field: ... counted with SelectMany and GroupBy on the text before the colon, biggest count first. Port.Show importReport (new { Accepted, Rejected } counts), acceptedIds, rejects and rejectSummary (field to count)",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: import the nightly CSV, rejecting bad rows with reasons.
string csv = """
${CSV_TEXT}
""";
// 1. record RejectedRow(int Line, string Raw, List<string> Reasons);  record ImportResult(List<Shipment> Accepted, List<RejectedRow> Rejected);   (under the divider)
// 2. ImportResult ImportManifest(string csvText) { ... }   lines = csvText.ReplaceLineEndings("\n").Split('\n'); skip the header (index 0) and blank lines; Line = index + 1
//    7 fields (id, cargo, category, origin, vessel, massKg, priority), each Trim()med; wrong count -> reason  row: expected 7 fields, found N
// 3. reasons (all of them, per row):  id: missing | id: "x" is not like H-0000 | id: duplicate of an earlier row
//    category: unknown "Pantry" | vessel: unknown "V-99" | mass: "abc" is not a whole number | mass: must be positive, got -50 | priority: must be 1 to 3, got 4
//    No reasons -> new Shipment(id, cargo, category, origin, vessel, massKg, priority) in Accepted, otherwise a RejectedRow(line, rawLine, reasons)
// 4. print  Accepted 4, rejected 8     Line 5: vessel: unknown "V-99"   ...     Reasons by field: ...
// Port.Show: importReport (new { Accepted, Rejected } as counts), acceptedIds, rejects, rejectSummary

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the importer's two result records here.
//   record RejectedRow(int Line, string Raw, List<string> Reasons);
//   record ImportResult(List<Shipment> Accepted, List<RejectedRow> Rejected);
`,
      solutionAdd: cs`// Lesson 15: the validating importer.
string csv = """
${CSV_TEXT}
""";

ImportResult ImportManifest(string csvText)
{
    HashSet<string> knownCategories = new() { "Agri", "Fuel", "Machinery", "Mail", "Medical", "Supply" };
    HashSet<string> knownVessels = vessels.Select(vessel => vessel.Id).ToHashSet();
    HashSet<string> seenIds = new();
    Regex idRule = new(@"^H-\d{4}$");
    List<Shipment> accepted = new();
    List<RejectedRow> rejected = new();

    string[] csvLines = csvText.ReplaceLineEndings("\n").Split('\n');
    for (int index = 1; index < csvLines.Length; index++)
    {
        string rawLine = csvLines[index];
        if (string.IsNullOrWhiteSpace(rawLine))
        {
            continue;
        }

        int lineNumber = index + 1;
        string[] fields = rawLine.Split(',', StringSplitOptions.TrimEntries);
        List<string> reasons = new();
        if (fields.Length != 7)
        {
            reasons.Add($"row: expected 7 fields, found {fields.Length}");
            rejected.Add(new RejectedRow(lineNumber, rawLine, reasons));
            continue;
        }

        string id = fields[0];
        string cargo = fields[1];
        string category = fields[2];
        string origin = fields[3];
        string vesselId = fields[4];

        if (id == "")
        {
            reasons.Add("id: missing");
        }
        else if (!idRule.IsMatch(id))
        {
            reasons.Add($"id: \"{id}\" is not like H-0000");
        }
        else if (!seenIds.Add(id))
        {
            reasons.Add("id: duplicate of an earlier row");
        }

        if (!knownCategories.Contains(category))
        {
            reasons.Add($"category: unknown \"{category}\"");
        }
        if (!knownVessels.Contains(vesselId))
        {
            reasons.Add($"vessel: unknown \"{vesselId}\"");
        }

        int massKg = 0;
        if (!int.TryParse(fields[5], out massKg))
        {
            reasons.Add($"mass: \"{fields[5]}\" is not a whole number");
        }
        else if (massKg <= 0)
        {
            reasons.Add($"mass: must be positive, got {massKg}");
        }

        if (!int.TryParse(fields[6], out int priority) || priority is < 1 or > 3)
        {
            reasons.Add($"priority: must be 1 to 3, got {fields[6]}");
        }

        if (reasons.Count == 0)
        {
            accepted.Add(new Shipment(id, cargo, category, origin, vesselId, massKg, priority));
        }
        else
        {
            rejected.Add(new RejectedRow(lineNumber, rawLine, reasons));
        }
    }
    return new ImportResult(accepted, rejected);
}

ImportResult importResult = ImportManifest(csv);
Console.WriteLine($"Accepted {importResult.Accepted.Count}, rejected {importResult.Rejected.Count}");
foreach (RejectedRow row in importResult.Rejected)
{
    Console.WriteLine($"Line {row.Line}: {string.Join("; ", row.Reasons)}");
}

var rejectSummary = importResult.Rejected
    .SelectMany(row => row.Reasons)
    .GroupBy(reason => reason.Split(':')[0])
    .OrderByDescending(bucket => bucket.Count())
    .ToDictionary(bucket => bucket.Key, bucket => bucket.Count());
Console.WriteLine($"Reasons by field: {string.Join(", ", rejectSummary.Select(pair => $"{pair.Key} {pair.Value}"))}");

Port.Show("importReport", new { Accepted = importResult.Accepted.Count, Rejected = importResult.Rejected.Count });
Port.Show("acceptedIds", importResult.Accepted.Select(shipment => shipment.Id));
Port.Show("rejects", importResult.Rejected);
Port.Show("rejectSummary", rejectSummary);

${TYPES_DIVIDER}

// A row the importer refused: where it was, what it said, and every reason it was refused.
record RejectedRow(int Line, string Raw, List<string> Reasons);

// What an import produces: the shipments that passed and the rows that did not.
record ImportResult(List<Shipment> Accepted, List<RejectedRow> Rejected);`,
      explanation:
        "Every row lands in exactly one of two lists. The loop keeps the real line number (index + 1, with the header on line 1), checks the field count before indexing, then applies each rule and appends a reason instead of stopping, so H-6008's two faults (an unknown category and a negative mass) are both reported. The HashSet seenIds.Add(id) both tests and records an id in one call, so the second H-6002 is flagged as a duplicate while the first is accepted. The else-if chains avoid nonsense reasons (no 'must be positive' for text that is not a number). The prefix before the colon in each reason makes them groupable, so SelectMany + GroupBy turns the nine reasons into a per-field tally.",
      hints: [
        { id: "h1", title: "Lines and numbers", content: "string[] csvLines = csvText.ReplaceLineEndings(\"\\n\").Split('\\n'); for (int index = 1; index < csvLines.Length; index++) starts after the header; int lineNumber = index + 1; Skip lines where string.IsNullOrWhiteSpace(rawLine). Split fields with rawLine.Split(',', StringSplitOptions.TrimEntries) and check Length != 7 before touching fields[5]." },
        { id: "h2", title: "Collect, do not stop", content: "Make List<string> reasons = new(); and add to it for each failed rule instead of continuing. Use else-if where one check makes the next meaningless (not a number, so no positive check). seenIds.Add(id) is false for a repeated id. At the end: reasons.Count == 0 means accepted." },
        { id: "h3", title: "The summary", content: "importResult.Rejected.SelectMany(row => row.Reasons).GroupBy(reason => reason.Split(':')[0]).OrderByDescending(bucket => bucket.Count()).ToDictionary(bucket => bucket.Key, bucket => bucket.Count()) gives the field tally; rejects is just importResult.Rejected." },
      ],
      tests: [
        {
          id: "t1",
          description: "good rows are accepted, bad rows are counted, nothing is lost",
          assertionCode: js`
assert(lines.includes("Accepted 4, rejected 8"), 'Print "Accepted 4, rejected 8": every one of the 12 data rows must end up in exactly one of the two lists.');
assertEqual(scene.importReport, { accepted: 4, rejected: 8 }, "importReport");
assertEqual(scene.acceptedIds, ["H-6001", "H-6002", "H-6003", "H-6010"], "acceptedIds (the first H-6002 is kept, the repeat is refused)");`,
        },
        {
          id: "t2",
          description: "each rejected row has its real line number, raw text and reasons",
          assertionCode: js`
assert(Array.isArray(scene.rejects) && scene.rejects.length === 8, 'Send the eight RejectedRow records with Port.Show("rejects", importResult.Rejected);');
assertEqual(scene.rejects[0], { line: 5, raw: "H-6004,Fusion pellets,Fuel,Ceres Yard,V-99,1500,1", reasons: ['vessel: unknown "V-99"'] }, "first rejected row (Line counts the header as line 1)");
assertEqual(scene.rejects.map((r) => r.line), [5, 6, 7, 8, 9, 10, 11, 12], "line numbers of the rejects");
assert(lines.includes('Line 5: vessel: unknown "V-99"'), 'Print lines like Line 5: vessel: unknown "V-99"');`,
        },
        {
          id: "t3",
          description: "all problems of a row are collected, with the exact reason texts",
          assertionCode: js`
const byLine = Object.fromEntries(scene.rejects.map((r) => [r.line, r.reasons]));
assertEqual(byLine[6], ['mass: "abc" is not a whole number'], "line 6");
assertEqual(byLine[7], ["id: duplicate of an earlier row"], "line 7 (the repeated H-6002)");
assertEqual(byLine[8], ['category: unknown "Biohazard"'], "line 8");
assertEqual(byLine[9], ["row: expected 7 fields, found 6"], "line 9 (a short row: check the field count before indexing)");
assertEqual(byLine[10], ["id: missing"], "line 10");
assertEqual(byLine[11], ['category: unknown "Pantry"', "mass: must be positive, got -50"], "line 11 has TWO problems; report both, in this order");
assertEqual(byLine[12], ["priority: must be 1 to 3, got 4"], "line 12");`,
        },
        {
          id: "t4",
          description: "the reasons are tallied by field",
          assertionCode: js`
assertEqual(scene.rejectSummary, { id: 2, mass: 2, category: 2, vessel: 1, row: 1, priority: 1 }, "rejectSummary (reason text before the colon, with counts)");
assert(lines.some((l) => l.startsWith("Reasons by field:")), 'Print a line that starts with "Reasons by field:" followed by the tally.');
const counts = Object.values(scene.rejectSummary);
assert(counts.every((c, i) => i === 0 || counts[i - 1] >= c), "List the biggest count first (OrderByDescending) so the summary reads from the common faults to the rare ones.");`,
        },
      ],
      unlocks: ["hp-inbox"],
      checks: [
        {
          prompt: "A row has two faults: an unknown category and a negative mass. What should the importer report?",
          question: {
            type: "choice",
            options: [
              "Both reasons for that row",
              "Only the first fault, then continue with the next row",
              "Nothing, it should be loaded anyway",
              "An exception that stops the whole import",
            ],
            answer: 0,
          },
          explanation: "A person fixing the file would otherwise correct one problem, re-run, and find the next. Collecting all reasons per row saves round trips. The import itself must never stop at the first bad row.",
        },
        {
          prompt: "`seenIds.Add(id)` on a `HashSet<string>` returns `false` for the second `\"H-6002\"`. Why is that handy in an importer?",
          question: {
            type: "choice",
            options: [
              "It detects the duplicate and records the id in a single call",
              "It deletes the first row",
              "It sorts the ids",
              "It throws, so the loop stops",
            ],
            answer: 0,
          },
          explanation: "`Add` returns whether the set changed, so the check and the bookkeeping are one step. Which of two duplicate rows counts as the original is decided by the order you read them.",
        },
        {
          prompt: "Why does the importer split with `ReplaceLineEndings(\"\\n\")` before `Split('\\n')`?",
          question: {
            type: "choice",
            options: [
              "Files from Windows end lines with two characters (`\\r\\n`), others with one; this makes both behave the same",
              "To remove blank lines",
              "To translate the text to uppercase",
              "Because `Split` cannot handle `\\n`",
            ],
            answer: 0,
          },
          explanation: "Splitting a Windows file on `\\n` alone leaves a stray `\\r` at the end of every line, which then ends up inside your last field. Normalising the line endings first avoids that whole class of bugs.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "csharp-linq-16-pipeline",
      title: "Capstone: the manifest pipeline",
      minutes: 40,
      xp: 260,
      concepts: ["composition", "pipeline design", "LINQ", "records", "pattern matching", "JSON", "decomposition"],
      learn: md`### Everything you have in one place

Your file now holds every stage of a real data job: *read* (the telegrams and the CSV), *validate* (rules and reasons), *model* (records, interfaces, generics), *query* (LINQ), *report* (formatted output and JSON). The last skill is **composition**: wiring the stages so that each does one thing and hands a clean result to the next.

### A way to approach it

1. **Say what goes in and what comes out.** In: the shipments already on the manifest and the nightly CSV text. Out: one \`PortReport\` record and a few printed lines.
2. **Reuse the stages you built.** \`ImportManifest\` already validates and splits good from bad. Do not copy its logic; call it.
3. **Keep each stage a function with a clear signature.** \`ImportResult ImportManifest(string)\` takes text and returns a result. A new \`PortReport BuildReport(List<Shipment>, string)\` takes the old manifest and the text and returns the report. A function whose inputs and outputs are all in its signature is easy to test and to change.
4. **Query, do not loop.** Group by vessel, sum the loads, pick the busiest, label each vessel with a switch expression. Each of those is one LINQ step.
5. **Put the result in a type.** A record such as \`PortReport\` documents the shape of the answer, prints well, and serializes to JSON in one call.
6. **Test the awkward cases first.** An empty import, a vessel with no cargo (it must still appear in the report), a threshold exactly on the boundary (80 % is "crowded", 79.9 % is not).

### A vessel status as a pattern

~~~csharp
string StatusFor(double usedPct) => usedPct switch
{
    >= 80 => "crowded",
    >= 50 => "steady",
    _ => "light",
};
~~~

### Reports that round-trip

Once the report is a record, \`JsonSerializer.Serialize(report, options)\` is the export and \`Deserialize<PortReport>\` is the import. Compare a few fields after a round trip rather than the whole record: if the record contains a \`List<string>\`, record equality compares the list by reference (lesson 6), so \`reportBack == report\` would be false even though every value matches.

### Before you call it done

- Do the numbers add up? Accepted plus rejected rows should equal the rows in the file; the vessel loads should add up to the total mass.
- Does an empty vessel still appear?
- Are the names clear (\`crowded\`, \`busiest\`, not \`flag2\`)?
- Is any query enumerated twice for no reason (lesson 5)?
- If it crashes, which line does the stack trace name?

### Where next

You can now model data, query it, validate untrusted input and report on it. The next steps on the C# path are delegates and events (functions as values, which LINQ's lambdas already were), async code, and then web APIs with dependency injection. All of them build on the habits in this file.`,
      mission: md`It is the end of the night shift. The nightly CSV has arrived, the manifest is on screen, and the duty officer wants one report: how many shipments are now on the manifest, how much they weigh, how many rows were turned away, which vessel is carrying the most, which category dominates, and which vessels are above 80 % of their capacity.

This is the lesson where your code runs the port. When it passes, the **Port report** lights up, all seventeen systems are live, and the board shows your whole pipeline.`,
      tasks: [
        "Under the divider declare record PortReport(int Shipments, int TotalKg, int Rejected, string BusiestVessel, string TopCategory, List<string> Overloaded) (the key name Overloaded is kept for the board, but fill it with the vessels that are crowded: 80 percent of capacity or more)",
        "Write local function PortReport BuildReport(List<Shipment> existing, string csvText). Call ImportManifest(csvText), merge existing and the accepted shipments with Concat, compute each vessel's load with GroupJoin (name, load, used percent to 1 decimal), find the busiest vessel by load (MaxBy), the category with the most mass (GroupBy, then MaxBy on the sum) and the crowded vessels via a switch expression StatusFor(usedPct) that returns \"crowded\" at 80 or more, \"steady\" at 50 or more, otherwise \"light\"",
        "Call BuildReport(shipments, csv) and print Port report: 18 shipments, 18.6 t (use your Summarise extension on the merged list or ToTonnes), Busiest vessel: Quiet Kestrel (9820 kg, 81.8% full), Top category: Fuel (6000 kg), Rejected imports: 8 and Crowded vessels: Quiet Kestrel. Print each vessel as <name>: <used>% <status>, for example Saltmarsh: 0% light",
        "Serialize the report with your jsonOptions (compact: make a copy of the options with WriteIndented = false, or use new JsonSerializerOptions(jsonOptions) { WriteIndented = false }) into string reportJson, deserialize it back and print Round trip total: 18635. Port.Show portReport and reportJson",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: the manifest pipeline, import -> validate -> query -> report.
// 1. record PortReport(int Shipments, int TotalKg, int Rejected, string BusiestVessel, string TopCategory, List<string> Overloaded);   (under the divider)
// 2. PortReport BuildReport(List<Shipment> existing, string csvText)
//      ImportResult import = ImportManifest(csvText);   var all = existing.Concat(import.Accepted).ToList();
//      per-vessel loads with GroupJoin (name, loadKg, capacity, usedPct to 1 decimal);  busiest = MaxBy(loadKg)
//      top category = all.GroupBy(Category).MaxBy(bucket => bucket.Sum(MassKg)) ;  crowded vessels via  string StatusFor(double usedPct) => usedPct switch { >= 80 => "crowded", >= 50 => "steady", _ => "light" };
// 3. PortReport report = BuildReport(shipments, csv);   print
//      Port report: 18 shipments, 18.6 t
//      Busiest vessel: Quiet Kestrel (9820 kg, 81.8% full)
//      Top category: Fuel (6000 kg)
//      Rejected imports: 8
//      Crowded vessels: Quiet Kestrel
//    and one line per vessel:  Pelican Run: 64.8% steady   ...   Saltmarsh: 0% light
// 4. string reportJson = JsonSerializer.Serialize(report, <compact options>);   PortReport? back = Deserialize...;   print  Round trip total: 18635
// Port.Show: portReport, reportJson
`,
      solutionAdd: cs`// Lesson 16: the manifest pipeline.
string StatusFor(double usedPct) => usedPct switch
{
    >= 80 => "crowded",
    >= 50 => "steady",
    _ => "light",
};

PortReport BuildReport(List<Shipment> existing, string csvText)
{
    ImportResult import = ImportManifest(csvText);
    List<Shipment> all = existing.Concat(import.Accepted).ToList();

    var loads = vessels
        .GroupJoin(
            all,
            vessel => vessel.Id,
            shipment => shipment.VesselId,
            (vessel, cargo) =>
            {
                int loadKg = cargo.Sum(shipment => shipment.MassKg);
                return new
                {
                    vessel.Name,
                    LoadKg = loadKg,
                    UsedPct = Math.Round(loadKg * 100.0 / vessel.CapacityKg, 1),
                };
            })
        .ToList();

    foreach (var load in loads)
    {
        Console.WriteLine($"{load.Name}: {load.UsedPct}% {StatusFor(load.UsedPct)}");
    }

    var busiest = loads.MaxBy(load => load.LoadKg)!;
    var topCategory = all
        .GroupBy(shipment => shipment.Category)
        .Select(bucket => new { Category = bucket.Key, TotalKg = bucket.Sum(shipment => shipment.MassKg) })
        .MaxBy(stat => stat.TotalKg)!;
    List<string> crowded = loads.Where(load => StatusFor(load.UsedPct) == "crowded").Select(load => load.Name).ToList();

    Console.WriteLine($"Port report: {all.Summarise()}");
    Console.WriteLine($"Busiest vessel: {busiest.Name} ({busiest.LoadKg} kg, {busiest.UsedPct}% full)");
    Console.WriteLine($"Top category: {topCategory.Category} ({topCategory.TotalKg} kg)");
    Console.WriteLine($"Rejected imports: {import.Rejected.Count}");
    Console.WriteLine($"Crowded vessels: {string.Join(", ", crowded)}");

    return new PortReport(all.Count, all.Sum(shipment => shipment.MassKg), import.Rejected.Count, busiest.Name, topCategory.Category, crowded);
}

PortReport report = BuildReport(shipments, csv);

JsonSerializerOptions compactOptions = new(jsonOptions) { WriteIndented = false };
string reportJson = JsonSerializer.Serialize(report, compactOptions);
PortReport? reportBack = JsonSerializer.Deserialize<PortReport>(reportJson, compactOptions);
Console.WriteLine($"Round trip total: {reportBack?.TotalKg}");

Port.Show("portReport", report);
Port.Show("reportJson", reportJson);

${TYPES_DIVIDER}

// The night shift's answer, in one value.
record PortReport(int Shipments, int TotalKg, int Rejected, string BusiestVessel, string TopCategory, List<string> Overloaded);`,
      explanation:
        "BuildReport is the pipeline in one function: it calls the importer instead of repeating it, merges the accepted rows with the existing manifest, and every summary after that is one LINQ step. GroupJoin keeps Saltmarsh in the report with 0 kg, MaxBy picks the busiest vessel (Quiet Kestrel at 9820 kg, 81.8 % of 12000), a GroupBy plus MaxBy on the summed mass finds Fuel as the heaviest category, and the switch expression StatusFor turns each percentage into a label, with relational patterns so 80 exactly counts as crowded. The result is a PortReport record, which prints, serializes and round-trips in a line each; the test reads the total after the round trip rather than comparing the whole record, because the List<string> inside it compares by reference.",
      hints: [
        { id: "h1", title: "Reuse, merge, group", content: "ImportResult import = ImportManifest(csvText); List<Shipment> all = existing.Concat(import.Accepted).ToList(); Then vessels.GroupJoin(all, vessel => vessel.Id, shipment => shipment.VesselId, (vessel, cargo) => ...) like lesson 4, so empty vessels still appear." },
        { id: "h2", title: "Busiest and top category", content: "loads.MaxBy(load => load.LoadKg)!.Name for the vessel. For the category: all.GroupBy(shipment => shipment.Category).Select(bucket => new { Category = bucket.Key, TotalKg = bucket.Sum(shipment => shipment.MassKg) }).MaxBy(stat => stat.TotalKg)!" },
        { id: "h3", title: "Compact JSON round trip", content: "JsonSerializerOptions compactOptions = new(jsonOptions) { WriteIndented = false }; string reportJson = JsonSerializer.Serialize(report, compactOptions); PortReport? reportBack = JsonSerializer.Deserialize<PortReport>(reportJson, compactOptions); then print reportBack?.TotalKg." },
      ],
      tests: [
        {
          id: "t1",
          description: "the report counts the merged manifest and the refused rows",
          assertionCode: js`
assert(scene.portReport && typeof scene.portReport === "object", 'Send the report with Port.Show("portReport", report);');
assertEqual(scene.portReport.shipments, 18, "portReport.shipments (14 on the manifest plus the 4 accepted rows)");
assertEqual(scene.portReport.totalKg, 18635, "portReport.totalKg (16920 + 1715)");
assertEqual(scene.portReport.rejected, 8, "portReport.rejected");
assert(lines.includes("Port report: 18 shipments, 18.6 t"), 'Print "Port report: 18 shipments, 18.6 t" (your Summarise extension on the merged list does this).');
assert(lines.includes("Rejected imports: 8"), 'Print "Rejected imports: 8".');`,
        },
        {
          id: "t2",
          description: "the busiest vessel and the top category come from grouped queries",
          assertionCode: js`
assertEqual(scene.portReport.busiestVessel, "Quiet Kestrel", "portReport.busiestVessel (8320 + 860 + 640 = 9820 kg)");
assertEqual(scene.portReport.topCategory, "Fuel", "portReport.topCategory (6000 kg)");
assert(lines.includes("Busiest vessel: Quiet Kestrel (9820 kg, 81.8% full)"), 'Print "Busiest vessel: Quiet Kestrel (9820 kg, 81.8% full)".');
assert(lines.includes("Top category: Fuel (6000 kg)"), 'Print "Top category: Fuel (6000 kg)".');`,
        },
        {
          id: "t3",
          description: "a switch expression labels each vessel, including the empty one",
          assertionCode: js`
assertEqual(scene.portReport.overloaded, ["Quiet Kestrel"], "the crowded vessels (80 percent of capacity or more)");
assert(lines.includes("Crowded vessels: Quiet Kestrel"), 'Print "Crowded vessels: Quiet Kestrel".');
assert(lines.includes("Pelican Run: 64.8% steady"), 'Print "Pelican Run: 64.8% steady" (5830 of 9000 kg).');
assert(lines.includes("Marrow Lantern: 49.8% light"), 'Print "Marrow Lantern: 49.8% light" (2985 of 6000 kg, under the 50 percent line).');
assert(lines.includes("Saltmarsh: 0% light"), 'Print "Saltmarsh: 0% light": GroupJoin keeps the empty vessel.');`,
        },
        {
          id: "t4",
          description: "the report serializes to JSON and reads back",
          assertionCode: js`
assert(typeof scene.reportJson === "string" && scene.reportJson.startsWith("{") && !scene.reportJson.includes("\n"), 'Send compact JSON (one line) with Port.Show("reportJson", reportJson);');
const back = JSON.parse(scene.reportJson);
assertEqual(back.totalKg, 18635, "reportJson.totalKg (camelCase names)");
assertEqual(back.busiestVessel, "Quiet Kestrel", "reportJson.busiestVessel");
assert(lines.includes("Round trip total: 18635"), 'Print "Round trip total: 18635" read from the deserialized report.');`,
        },
      ],
      unlocks: ["hp-report"],
      checks: [
        {
          prompt: "Why does the report keep Saltmarsh, which carries nothing, when the vessel loads are built with `GroupJoin` but would lose it with `Join`?",
          question: {
            type: "choice",
            options: [
              "`GroupJoin` pairs every vessel with a (possibly empty) group of cargo; `Join` drops left items with no match",
              "`GroupJoin` ignores capacity",
              "`Join` sorts the vessels",
              "Saltmarsh has crew, so it always stays",
            ],
            answer: 0,
          },
          explanation: "An inner join keeps only matching pairs. For a report that must list every vessel, start from the vessels and group the matches, so an empty group simply sums to zero.",
        },
        {
          prompt: "Two `PortReport` records hold the same numbers and the same text, but their `List<string> Overloaded` fields are two separate lists with the same contents. What does `==` say?",
          question: {
            type: "choice",
            options: [
              "`false`: record equality compares the list by reference",
              "`true`: records always compare deeply",
              "It does not compile",
              "It throws",
            ],
            answer: 0,
          },
          explanation: "Record equality is shallow: each field is compared with its own `Equals`, and a `List<T>` only equals itself. This is why the round trip is checked by reading a value back rather than comparing whole records.",
        },
        {
          prompt: "`BuildReport` calls `ImportManifest` instead of repeating its row-checking code. What is the main benefit?",
          question: {
            type: "choice",
            options: [
              "One tested piece of logic serves both, so a rule change happens in one place",
              "The program runs faster",
              "C# forbids long functions",
              "It avoids writing a record",
            ],
            answer: 0,
          },
          explanation: "Duplicated rules drift apart: someone fixes one copy and forgets the other. A function with a clear input and output is reused, tested and changed once.",
        },
      ],
    },
  ],
};
