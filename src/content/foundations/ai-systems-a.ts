import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (formulas, tables). */
const txt = (code: string) => "~~~text\n" + code.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 4 of "Shipping AI features": embeddings, vector search, choosing an index, filters. */
export const aiLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Meaning as coordinates ───────────────────────────────
  {
    id: "fnd-ai-1-meaning",
    title: "Meaning as coordinates",
    summary: "Embeddings turn text into lists of numbers where nearby means similar. Cosine similarity and top-k, from scratch.",
    minutes: 9,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Search that understands",
        body: P(
          "Picture a school library chatbot. A student types **“my book is late”**. The library’s own help page is called *Overdue items and fines*. It never uses the word “late”, so a keyword search finds nothing, even though any person would match them instantly.",
          "An **embedding model** closes that gap. It reads a piece of text and returns a **list of numbers**: a few hundred to a few thousand of them. The model was trained so that texts used in similar ways produce lists that sit close together. “My book is late” and “overdue items” land near each other without sharing a single word.",
          "Real embeddings have hundreds of dimensions. This one has two, so you can see it. Every phrase is an arrow from the centre; its **direction** is what it is about. Tap a dot to make it the query and watch the others rank.",
        ),
        widget: { type: "ai-space", props: {} },
      },
      {
        kind: "question",
        title: "Who is nearest?",
        body: "Make **flat tyre** the query (pick it from the list or tap its dot). Which phrase is its nearest neighbour?",
        widget: { type: "ai-space", props: { k: 1, fixedK: true }, live: true },
        question: { type: "choice", options: ["puncture patch", "inner tube", "brake pads", "late fee"], answer: 0 },
        explanation: "**Puncture patch** points almost the same way as flat tyre. Inner tube is close too, but it sits a few degrees further round. Notice what is *not* needed: the two phrases share no words, only a topic.",
      },
      {
        kind: "explain",
        title: "Direction is meaning",
        body: P(
          "How do you score “how close” two arrows are? **Cosine similarity** measures the **angle** between them:",
          txt(`
cosine(a, b) = (a · b) / (|a| × |b|)

 1.0  same direction  (very similar)
 0.0  right angle     (unrelated)
-1.0  opposite        (opposite)
`),
          "`a · b` is the dot product (multiply matching numbers, add them up) and `|a|` is the length of an arrow. Dividing by the lengths means **only the direction counts**. Many embedding models already return arrows of length 1, in which case the dot product and cosine give the same answer.",
          "Flip the switch to *Distance* and compare. Straight-line distance cares about length too, so it can rank things differently.",
        ),
        widget: { type: "ai-space", props: { query: "overdue book", k: 3, metricToggle: true } },
      },
      {
        kind: "question",
        title: "Keep three",
        body: "Make **overdue book** the query and keep **k = 3** neighbours, measured by *Angle*. Are all three about the library?",
        widget: { type: "ai-space", props: { k: 3, metricToggle: true, fixedK: true } },
        question: { type: "widget", goal: { query: "overdue book", k: 3, metric: "cosine", pure: true } },
        explanation: "Borrow a novel, renew a loan and late fee all point within about 15 degrees of overdue book. **k** is how many neighbours you keep. Next you will see what a bigger k does.",
      },
      {
        kind: "question",
        title: "Too many neighbours",
        body: "Same query. Raise **k** until a neighbour from the *wrong* topic sneaks into the list.",
        widget: { type: "ai-space", props: { query: "overdue book", k: 3, metricToggle: true } },
        question: { type: "widget", goal: { query: "overdue book", pure: false } },
        explanation: "Around k = 5 the list reaches **damaged book**, which is half about libraries and half about repairs. There is always a neighbour list of length k, even when only two items are really relevant. Asking for more than exists buys noise, and in a RAG system that noise goes into the prompt.",
      },
      {
        kind: "question",
        title: "Cosine by hand",
        body: "Two arrows: `a = (3, 4)` and `b = (4, 3)`. Work out `a · b`, divide by `|a| × |b|` (each length is 5). What is the cosine similarity?",
        question: { type: "number", answer: 0.96, tolerance: 0.01 },
        explanation: "`a · b = 3×4 + 4×3 = 24`, and `5 × 5 = 25`, so the cosine is **24 ÷ 25 = 0.96**. The arrows are about 16 degrees apart: very similar, but not identical.",
      },
      {
        kind: "question",
        title: "Longer is not closer",
        body: "Two phrases point in **exactly the same direction**, but one arrow is three times as long as the other. What does cosine similarity say?",
        question: { type: "choice", options: ["1.0: same direction", "0.33: one third as similar", "3.0: three times as similar", "0: they differ in length"], answer: 0 },
        explanation: "Cosine divides the lengths away, so scaling an arrow never changes it: the answer is **1.0**. That is the point. A short phrase and a long paragraph about the same topic should still match.",
      },
      {
        kind: "code",
        title: "Write cosine similarity",
        body: P(
          "Finish `cosine(a, b)` for two lists of numbers of the same length. Use `math.sqrt` for the lengths.",
          "`zip(a, b)` pairs up matching numbers, and `sum(...)` adds a generator of products.",
        ),
        language: "python",
        starter: "import math\n\n\ndef cosine(a, b):\n    # dot product divided by the product of the two lengths\n    return 0.0\n",
        solution: "import math\n\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    length_a = math.sqrt(sum(x * x for x in a))\n    length_b = math.sqrt(sum(y * y for y in b))\n    return dot / (length_a * length_b)\n",
        tests: [
          { id: "same", description: "an arrow with itself is 1", assertionCode: `assert abs(cosine([1, 0], [1, 0]) - 1) < 1e-9, "same direction should be 1"` },
          { id: "right", description: "perpendicular arrows give 0", assertionCode: `assert abs(cosine([1, 0], [0, 1])) < 1e-9, "right angle should be 0"` },
          { id: "scale", description: "length does not matter", assertionCode: `assert abs(cosine([3, 4], [6, 8]) - 1) < 1e-9, "(3,4) and (6,8) point the same way"` },
          { id: "opp", description: "opposite arrows give -1", assertionCode: `assert abs(cosine([1, 1], [-1, -1]) + 1) < 1e-9, "opposite should be -1"` },
          { id: "hand", description: "the worked example is 0.96", assertionCode: `assert abs(cosine([3, 4], [4, 3]) - 0.96) < 1e-9, f"got {cosine([3, 4], [4, 3])}"` },
        ],
        hints: ["`dot = sum(x * y for x, y in zip(a, b))`", "The length of a is `math.sqrt(sum(x * x for x in a))`. Return `dot / (length_a * length_b)`."],
      },
      {
        kind: "code",
        title: "Find the nearest k",
        body: P(
          "`cosine` is already written. Finish `top_k(query, items, k)`: `items` maps a name to its vector, and you return the **names** of the `k` most similar items, best first.",
          "`sorted(items, key=..., reverse=True)` sorts the names by whatever the key function returns for each one.",
        ),
        language: "python",
        starter:
          "import math\n\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))\n\n\ndef top_k(query, items, k):\n    # return the k names whose vectors are most similar to query, best first\n    return []\n",
        solution:
          "import math\n\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))\n\n\ndef top_k(query, items, k):\n    ranked = sorted(items, key=lambda name: cosine(query, items[name]), reverse=True)\n    return ranked[:k]\n",
        tests: [
          {
            id: "two",
            description: "the two bike phrases are nearest to a bike query",
            assertionCode: `items = {"tyre": [8, 4], "patch": [6, 5], "late fee": [-1, 6], "visit": [-7, -3]}\nassert top_k([7, 4], items, 2) == ["tyre", "patch"], f"got {top_k([7, 4], items, 2)}"`,
          },
          {
            id: "one",
            description: "k = 1 returns just the best match",
            assertionCode: `items = {"tyre": [8, 4], "patch": [6, 5], "late fee": [-1, 6], "visit": [-7, -3]}\nassert top_k([-2, 5], items, 1) == ["late fee"], f"got {top_k([-2, 5], items, 1)}"`,
          },
          {
            id: "all",
            description: "a k bigger than the collection returns everything, in order",
            assertionCode: `items = {"tyre": [8, 4], "patch": [6, 5], "late fee": [-1, 6], "visit": [-7, -3]}\nassert top_k([7, 4], items, 10) == ["tyre", "patch", "late fee", "visit"], f"got {top_k([7, 4], items, 10)}"`,
          },
        ],
        hints: ["Sort the names with `key=lambda name: cosine(query, items[name])` and `reverse=True`.", "Then slice: `ranked[:k]`."],
      },
      {
        kind: "recap",
        points: [
          "An **embedding** is a list of numbers that places a piece of text in a space where **nearby means similar in meaning**.",
          "**Cosine similarity** compares directions: 1 for the same, 0 for unrelated, −1 for opposite. Length is divided away.",
          "**Top-k** returns the k nearest items. A bigger k pulls in weaker matches, so choose it on purpose.",
          "Use **one embedding model** for both the documents and the queries; vectors from different models cannot be compared.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Searching vectors ───────────────────────────────
  {
    id: "fnd-ai-2-searching",
    title: "Searching vectors",
    summary: "Exact search is honest but slow. Approximate search trades a little recall for a lot of speed: layered graphs and clusters.",
    minutes: 10,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "The honest way is slow",
        body: P(
          "The simplest vector search compares the query with **every stored vector** and keeps the best k. It is called **exact** (or brute-force) search, and it is always right.",
          "The cost is the problem. Each comparison multiplies one number per dimension, so a query costs about **N × d** multiplications for N vectors of d dimensions. It grows in a straight line with the collection: ten times the books, ten times the work for every single question.",
        ),
      },
      {
        kind: "question",
        title: "How much work?",
        body: "A school district indexes **2,000,000** passages, each a vector of **512** numbers. Roughly how many multiplications does one exact query need? Answer in **billions**.",
        question: { type: "number", answer: 1.024, tolerance: 0.05, unit: "billion" },
        explanation: "2,000,000 × 512 = 1,024,000,000, about **1 billion** multiplications per query. A modern CPU core can manage that in a few hundred milliseconds. Fine for one query; painful for a hundred a second.",
      },
      {
        kind: "explain",
        title: "Good-enough neighbours",
        body: P(
          "**Approximate nearest neighbour (ANN)** search gives up the guarantee. It looks at a small, well-chosen part of the collection and returns neighbours that are *usually* the true ones.",
          "How often it is right is called **recall**: of the true 5 nearest neighbours, how many did the method find? 100% means all of them. You pay for it with **distance checks**: how many vectors had to be compared.",
          "Here is a cloud of 80 points. **Scan everything** is exact; **Layered graph** walks from point to point towards the query. Tap the plot to move the query, and raise *ef* (how many candidates the walk keeps in mind) to see recall rise.",
        ),
        widget: { type: "ai-ann", props: { methods: ["brute", "hnsw"], method: "hnsw" } },
      },
      {
        kind: "question",
        title: "Fast and right",
        body: "Use the **layered graph** on **query A**. Get **recall to 100%** while checking **fewer than half** of the 80 points.",
        widget: { type: "ai-ann", props: { methods: ["hnsw"], method: "hnsw" } },
        question: { type: "widget", goal: { method: "hnsw", query: "A", recall: 1, maxChecks: 39 } },
        explanation: "With ef = 1 the walk follows one path and stops at the first dead end, so it misses neighbours. Keeping more candidates (ef = 8) finds all five after roughly a third of the checks. **ef is the dial** between speed and recall.",
      },
      {
        kind: "explain",
        title: "Why a graph works",
        body: P(
          "A proximity graph links every vector to a few near neighbours. To search, start somewhere, look at the neighbours, and hop to whichever is closest to the query. Repeat until no neighbour is closer. It is like asking the person next to you who knows the way.",
          "On its own, that walk is slow when you start far from the answer. **HNSW** (hierarchical navigable small world) adds **layers**: a sparse top layer with a handful of points and long links, a denser middle layer, and the full base layer. Think of finding a classroom in a school you have never visited: reception points you to the right wing, signs lead to the right corridor, and door numbers do the rest.",
          "Switch the graph layers on below. The lime line is the walk: a few long hops on top, then short careful ones at the bottom.",
        ),
        widget: { type: "ai-ann", props: { methods: ["hnsw"], method: "hnsw", showLayer: 2 } },
      },
      {
        kind: "question",
        title: "Why start on top?",
        body: "Why does the search begin in the **sparse top layer** and work its way down?",
        question: {
          type: "choice",
          options: [
            "Long links there cross the map in a few hops, so you arrive in the right neighbourhood before the careful search",
            "The top layer stores the most accurate version of each vector",
            "It lets the index skip the distance calculation altogether",
            "Upper layers are searched in parallel on different machines",
          ],
          answer: 0,
        },
        explanation: "Each layer is a coarser map of the one below. Starting on the coarse map means the expensive, detailed search begins **near** the answer instead of at a random point. Only the base layer is searched thoroughly, which is where *ef* applies.",
      },
      {
        kind: "explain",
        title: "The other way: clusters",
        body: P(
          "**IVF** (inverted file) takes a different route. First, group the vectors into **clusters** with an algorithm like k-means; each cluster has a centre. To search, compare the query with the **centres only**, pick the closest few clusters, and scan just the vectors inside them.",
          "The dial is **nprobe**: how many clusters you visit. Visit one and you are fast but can miss neighbours that live just across a boundary; visit them all and you have rebuilt exact search.",
        ),
        widget: { type: "ai-ann", props: { methods: ["ivf"], method: "ivf" } },
      },
      {
        kind: "question",
        title: "Cross the boundary",
        body: "Use the **clusters** method on **query B**, which sits between groups. Raise **nprobe** until recall is 100%.",
        widget: { type: "ai-ann", props: { methods: ["ivf"], method: "ivf" } },
        question: { type: "widget", goal: { method: "ivf", query: "B", recall: 1 } },
        explanation: "One cluster misses neighbours that belong to the next cell over. Visiting more cells fixes recall, but notice the distance checks creeping back towards 80: **the cost of recall is visible.** Pick the smallest setting that meets your target.",
      },
      {
        kind: "question",
        title: "Which index is which?",
        body: "Tap a card, then tap the index it describes.",
        widget: {
          type: "pattern-sorter",
          props: {
            buckets: [
              { id: "hnsw", label: "Layered graph", hint: "HNSW: walk the links" },
              { id: "ivf", label: "Clusters", hint: "IVF: visit the nearest cells" },
            ],
            items: [
              { id: "edges", text: "Stores a list of neighbours for every vector (extra memory)" },
              { id: "kmeans", text: "Needs a clustering (k-means) pass before it can be searched" },
              { id: "ef", text: "Main dial: how many candidates to keep (ef)" },
              { id: "nprobe", text: "Main dial: how many clusters to visit (nprobe)" },
              { id: "border", text: "A neighbour just over a cell boundary can be missed" },
              { id: "stale", text: "The cluster centres go stale as data changes, so you re-train now and then" },
            ],
            answer: { edges: "hnsw", kmeans: "ivf", ef: "hnsw", nprobe: "ivf", border: "ivf", stale: "ivf" },
          },
        },
        question: { type: "widget", goal: { placed: { edges: "hnsw", kmeans: "ivf", ef: "hnsw", nprobe: "ivf", border: "ivf", stale: "ivf" } } },
        explanation: "A graph pays in **memory** (the links) and gives high recall at low latency. Clusters pay in **recall at the borders** and need centres that stay representative, but they are cheaper to build and easy to compress. The next lesson puts numbers on that.",
      },
      {
        kind: "recap",
        points: [
          "**Exact search** compares the query with every vector: perfect recall, cost grows with N × d.",
          "**ANN** checks only part of the collection. **Recall@k** says how many true neighbours it found.",
          "**HNSW** walks a layered graph: sparse layers for long hops, the base layer for detail. Dial: **ef**.",
          "**IVF** visits the nearest clusters only. Dial: **nprobe**. Neighbours across a border are its blind spot.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Choosing and sizing an index ───────────────────────────────
  {
    id: "fnd-ai-3-index",
    title: "Choosing and sizing an index",
    summary: "Recall, latency, memory and build time pull against each other. Do the sums, and know when a plain column is enough.",
    minutes: 10,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Four numbers pull against each other",
        body: P(
          "Every vector index trades four things:",
          "- **Recall**: how often it finds the true neighbours.\n- **Latency**: how long one query takes.\n- **Memory**: how much RAM (or disk) the index needs.\n- **Build time**: how long to create it, and to rebuild it when data changes.",
          "You can improve any of them by spending another. Faster usually costs recall or memory; smaller costs recall; higher recall costs time. The skill is not knowing a favourite index, it is **writing down your requirements first** and checking designs against them.",
        ),
      },
      {
        kind: "question",
        title: "Do the memory sum",
        body: "Vectors are stored as 4-byte floats. How much memory do **1,000,000 vectors of 768 numbers** take, before any index structure? Answer in GB.",
        question: { type: "number", answer: 3.07, tolerance: 0.1, unit: "GB" },
        explanation: "1,000,000 × 768 × 4 bytes = 3,072,000,000 bytes, about **3 GB**. Ten million vectors would be 30 GB, which no longer fits on a small server. The sum takes ten seconds and rules out half the options.",
      },
      {
        kind: "explain",
        title: "The simplest design that works",
        body: P(
          "A plain database column holding the vectors, searched exactly, has real virtues: no new system to run, the data lives next to your other rows, filters are ordinary `WHERE` clauses, and recall is perfect.",
          "Below is a school library with 20,000 passages. The planner estimates each design against three requirements. A green tick means the design meets them all; red numbers show what breaks. (The numbers are a rough model for one machine, but the *shape* is real.)",
        ),
        widget: { type: "ai-index", props: { n: 20000, dims: 768, budgetMs: 100, ramGb: 16, minRecall: 0.95 } },
      },
      {
        kind: "question",
        title: "Don’t over-build",
        body: "Two designs tick every box for 20,000 passages. Pick the **simpler** one.",
        widget: { type: "ai-index", props: { n: 20000, dims: 768, budgetMs: 100, ramGb: 16, minRecall: 0.95 } },
        question: { type: "widget", goal: { meets: true, method: "exact" } },
        explanation: "An exact scan of 20,000 vectors takes a few milliseconds and loses nothing. A graph or cluster index would add a build step, tuning dials and a recall below 100% to solve a problem you do not have.",
      },
      {
        kind: "question",
        title: "A clinic’s help bot",
        body: P(
          "A clinic keeps **150,000** passages of **384** numbers each in its existing Postgres database. At peak there are 5 questions a second, and answers must come back within 100 ms. An exact scan costs about 14 ms per query.",
          "What is the sensible move?",
        ),
        question: {
          type: "choice",
          options: [
            "Keep the exact scan in Postgres: 14 ms is well inside the budget, and 5 queries a second use under a tenth of one core",
            "Deploy a dedicated vector database, because 150,000 is too many to scan",
            "Switch to a cluster index with nprobe = 1 to make it as fast as possible",
            "Cache every possible question in advance",
          ],
          answer: 0,
        },
        explanation: "Measure first. 14 ms × 5 per second is about 7% of a core, and recall stays at 100%. Move to an ANN index when the numbers say so: more data, tighter latency, or more traffic than one machine can scan.",
      },
      {
        kind: "question",
        title: "When it outgrows the column",
        body: P(
          "A district-wide assistant has **2,000,000** passages of **1,536** numbers. Queries must take under **20 ms**, the server has **32 GB** of RAM, and recall must stay **at least 95%**.",
          "Exact scanning is hundreds of milliseconds. Pick the design that satisfies everything.",
        ),
        widget: { type: "ai-index", props: { n: 2000000, dims: 1536, budgetMs: 20, ramGb: 32, minRecall: 0.95 } },
        question: { type: "widget", goal: { meets: true, method: "hnsw" } },
        explanation: "The graph keeps recall near 97% and answers in a few milliseconds, and its 12 GB fits in RAM. Plain IVF falls just short of 95% recall at its default setting. The graph’s price is memory and a slow build.",
      },
      {
        kind: "question",
        title: "When memory is the limit",
        body: P(
          "Now a national catalogue: **50,000,000** passages of **768** numbers, a **50 ms** budget, **64 GB** of RAM, and recall of at least **80%** is acceptable.",
          "Full vectors would need over 150 GB. Which design survives?",
        ),
        widget: { type: "ai-index", props: { n: 50000000, dims: 768, budgetMs: 50, ramGb: 64, minRecall: 0.8 } },
        question: { type: "widget", goal: { meets: true, method: "ivfpq" } },
        explanation: "**Product quantization** compresses each vector into a short code (here about 64 bytes instead of 3 KB), at some cost in recall. Combined with clusters it is the way a very large collection fits in memory. A common refinement is to re-score the top few hundred candidates with the original vectors.",
      },
      {
        kind: "code",
        title: "Write the planner",
        body: P(
          "Turn the rules of thumb into code. `plan_index(n, dims, budget_ms, ram_gb)` returns one of three strings:",
          "- `\"exact\"` if an exact scan fits the time budget (`n * dims / 4_000_000` milliseconds) **and** the raw vectors fit in RAM (`n * dims * 4` bytes; one GB is `1e9` bytes),\n- else `\"hnsw\"` if a graph fits in RAM (`n * (dims * 4 + 128)` bytes),\n- else `\"ivfpq\"`.",
        ),
        language: "python",
        starter: "def plan_index(n, dims, budget_ms, ram_gb):\n    # exact scan if it is fast enough and fits; otherwise hnsw if it fits in RAM; otherwise ivfpq\n    return \"exact\"\n",
        solution:
          "def plan_index(n, dims, budget_ms, ram_gb):\n    ram = ram_gb * 1e9\n    if n * dims / 4_000_000 <= budget_ms and n * dims * 4 <= ram:\n        return \"exact\"\n    if n * (dims * 4 + 128) <= ram:\n        return \"hnsw\"\n    return \"ivfpq\"\n",
        tests: [
          { id: "small", description: "20,000 passages need nothing fancy", assertionCode: `assert plan_index(20000, 768, 100, 16) == "exact", f"got {plan_index(20000, 768, 100, 16)!r}"` },
          { id: "mid", description: "2 million vectors at 20 ms need a graph", assertionCode: `assert plan_index(2000000, 1536, 20, 32) == "hnsw", f"got {plan_index(2000000, 1536, 20, 32)!r}"` },
          { id: "big", description: "50 million vectors only fit compressed", assertionCode: `assert plan_index(50000000, 768, 50, 64) == "ivfpq", f"got {plan_index(50000000, 768, 50, 64)!r}"` },
          { id: "tight", description: "a tight time budget rules out exact scanning", assertionCode: `assert plan_index(1000000, 384, 5, 8) == "hnsw", f"got {plan_index(1000000, 384, 5, 8)!r}"` },
        ],
        hints: ["Compute the RAM in bytes first: `ram = ram_gb * 1e9`.", "Check exact first (time and memory), then hnsw (memory), and fall back to `\"ivfpq\"`."],
      },
      {
        kind: "question",
        title: "Changing the embedding model",
        body: P(
          "A new embedding model arrives, and it is better. **Vectors from different models cannot be compared**, so the whole collection has to be embedded again. Put the safe migration in order.",
        ),
        question: {
          type: "order",
          items: [
            "Embed everything with the new model into a new column or index, next to the old one",
            "Run your regression questions against both and compare recall",
            "Switch live queries to the new index (embedding queries with the new model too)",
            "Keep the old index for a few days in case you need to roll back",
            "Delete the old vectors",
          ],
        },
        explanation: "Never overwrite in place: for a while half your vectors would be from each model, and neither side would match anything. Build beside, **prove** it on real questions, switch, keep a way back, and clean up last. The same plan works for changing chunk sizes.",
      },
      {
        kind: "recap",
        points: [
          "Write down **recall, latency, memory and build time** requirements, then check designs against them.",
          "Memory is a quick sum: **vectors × dimensions × 4 bytes**, plus the index’s own overhead.",
          "A **plain column with exact search** is often enough for tens or hundreds of thousands of vectors.",
          "Graphs (**HNSW**) buy low latency and high recall with memory; clusters (**IVF**) are cheaper; **quantization** compresses to fit.",
          "Changing the embedding model means **re-embedding everything**: build beside, prove it, then switch.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Filters and tenants ───────────────────────────────
  {
    id: "fnd-ai-4-filters",
    title: "Filters and tenants",
    summary: "Real searches come with conditions. Filtering before or after the vector search changes the results, and sometimes the security.",
    minutes: 9,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Nearest is not the whole question",
        body: P(
          "Real searches arrive with conditions: *only articles from my shop*, *only 2025 policies*, *only in French*, *only things this user may see*. Each vector therefore carries **metadata** next to it, and the search must honour the conditions as well as the distance.",
          "Our example is a help-centre service shared by **four bike shops**. Their articles live in one index (the dots below), and the colours say whose they are. When a shop’s assistant searches, only that shop’s articles should ever be shown.",
        ),
        widget: { type: "ai-filter", props: { modes: ["none"] } },
      },
      {
        kind: "question",
        title: "See the leak",
        body: "Search as **Quarry Road Co-op** with **no filter**. Watch whose articles come back.",
        widget: { type: "ai-filter", props: { modes: ["none"], tenant: "orchard" } },
        question: { type: "widget", goal: { mode: "none", tenant: "quarry", leaked: true } },
        explanation: "Quarry Road owns 5% of the collection, so **all five** results belong to other shops. Pure similarity does not know about owners. In a real product this is a data breach: one shop’s private pricing or customer notes served to a competitor.",
      },
      {
        kind: "explain",
        title: "Filter after: simple, but hollow",
        body: P(
          "The first fix is natural: run the vector search, then throw away results that belong to someone else. This is **post-filtering**. It is safe from leaks, but it only filters the *k* results it fetched.",
          "If your shop owns a thin slice of the space, most of the nearest neighbours are not yours, and after the filter little is left. You can **over-fetch** (ask for 4× or 10× as many) before filtering, at a cost.",
        ),
        widget: { type: "ai-filter", props: { modes: ["post"], tenant: "hilltop" } },
      },
      {
        kind: "question",
        title: "Make it come up short",
        body: "Search as **Hilltop Hub** with **filter after** and no over-fetch (×1). Find a query where you get fewer than 5 results.",
        widget: { type: "ai-filter", props: { modes: ["post"], tenant: "hilltop" } },
        question: { type: "widget", goal: { mode: "post", tenant: "hilltop", short: true } },
        explanation: "Query A returns **zero** results: the five nearest articles all belong to other shops, and the filter removes them. The user sees an empty page even though Hilltop has relevant articles slightly further away.",
      },
      {
        kind: "question",
        title: "How much to over-fetch?",
        body: "A tenant owns **2%** of the collection. You need **10** results for them. About how many nearest neighbours must you fetch before filtering to *expect* 10 survivors?",
        question: { type: "number", answer: 500, tolerance: 1 },
        explanation: "10 ÷ 0.02 = **500**. If neighbours are spread evenly, only 2 in every 100 fetched belong to the tenant. The thinner the slice (the more **selective** the filter), the more you must over-fetch, and the slower and less reliable the search becomes.",
      },
      {
        kind: "explain",
        title: "Filter first",
        body: P(
          "**Pre-filtering** restricts the search to the matching vectors, then finds the nearest *among those*. You always get a full page, and a leak is impossible by construction.",
          "Vector engines do this in different ways: filtering **during** the graph walk, keeping a **separate index per tenant**, or, when the filter is very selective, simply **scanning the few matching vectors exactly**. For a slice under about 1% of the data, an exact scan of the matching rows is often both fastest and most accurate, because a graph walk would wander through thousands of neighbours that fail the filter.",
        ),
        widget: { type: "ai-filter", props: { modes: ["pre"], tenant: "quarry" } },
      },
      {
        kind: "question",
        title: "A full, clean page",
        body: "Search as **Quarry Road Co-op** with **filter first**. You want a full page of 5 and nothing from other shops.",
        widget: { type: "ai-filter", props: { modes: ["none", "post", "pre"], tenant: "orchard" } },
        question: { type: "widget", goal: { mode: "pre", tenant: "quarry", full: true, leaked: false } },
        explanation: "Quarry Road has only six articles in the whole index, but filter-first still finds the five nearest of them. The price is that the engine must support filtering efficiently, which is why the choice of engine and index matters.",
      },
      {
        kind: "question",
        title: "Where does the filter live?",
        body: "Who should be responsible for restricting results to the current shop?",
        question: {
          type: "choice",
          options: [
            "The query to the index, with the shop id taken from the signed-in session on the server",
            "The prompt: tell the model “only answer about shop X”",
            "The browser, which hides articles that are not the user’s",
            "The model, which can tell whose article is whose",
          ],
          answer: 0,
        },
        explanation: "A prompt is a request, not a lock: the model has already *seen* the other shop’s text. A hiding browser has already *received* it. The boundary must be enforced where the data is fetched, with an id the user cannot edit. The Security module’s lesson on multi-tenant isolation goes deeper.",
      },
      {
        kind: "code",
        title: "Filter first, in Python",
        body: P(
          "`docs` is a list of dicts like `{\"id\": \"a1\", \"tenant\": \"orchard\", \"vec\": [3, 4]}`. Write `filtered_top_k(query, docs, tenant, k)` that returns the **ids** of the `k` nearest documents **belonging to that tenant**, best first. Use the `cosine` helper.",
        ),
        language: "python",
        starter:
          "import math\n\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))\n\n\ndef filtered_top_k(query, docs, tenant, k):\n    # keep only this tenant's documents, THEN rank them by cosine similarity\n    ranked = sorted(docs, key=lambda d: cosine(query, d[\"vec\"]), reverse=True)\n    return [d[\"id\"] for d in ranked[:k]]\n",
        solution:
          "import math\n\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))\n\n\ndef filtered_top_k(query, docs, tenant, k):\n    mine = [d for d in docs if d[\"tenant\"] == tenant]\n    ranked = sorted(mine, key=lambda d: cosine(query, d[\"vec\"]), reverse=True)\n    return [d[\"id\"] for d in ranked[:k]]\n",
        tests: [
          {
            id: "isolation",
            description: "never returns another tenant’s document, even a closer one",
            assertionCode: `docs = [{"id": "x1", "tenant": "other", "vec": [1, 0]}, {"id": "o1", "tenant": "orchard", "vec": [0, 1]}, {"id": "o2", "tenant": "orchard", "vec": [1, 1]}]\nassert filtered_top_k([1, 0], docs, "orchard", 2) == ["o2", "o1"], f"got {filtered_top_k([1, 0], docs, 'orchard', 2)}"`,
          },
          {
            id: "full",
            description: "still returns a full page from a small tenant",
            assertionCode: `docs = [{"id": "n%d" % i, "tenant": "big", "vec": [1, i]} for i in range(10)] + [{"id": "q1", "tenant": "quarry", "vec": [0, 1]}, {"id": "q2", "tenant": "quarry", "vec": [1, 0]}]\nassert sorted(filtered_top_k([1, 0], docs, "quarry", 5)) == ["q1", "q2"], "a small tenant should get all its documents"`,
          },
          {
            id: "none",
            description: "a tenant with no documents gets an empty list",
            assertionCode: `assert filtered_top_k([1, 0], [{"id": "a", "tenant": "t", "vec": [1, 0]}], "nobody", 3) == []`,
          },
        ],
        hints: ["Build `mine = [d for d in docs if d[\"tenant\"] == tenant]` first.", "Rank `mine`, not `docs`."],
      },
      {
        kind: "recap",
        points: [
          "Vectors carry **metadata**; real searches combine distance with conditions such as tenant, date and language.",
          "**No filter** means nearest-by-meaning from anyone: a leak between tenants.",
          "**Post-filtering** is safe but can come back short; **pre-filtering** always fills the page. The thinner the slice, the worse post-filtering gets.",
          "Very selective filters are often best served by an **exact scan of the matching rows**.",
          "Enforce the tenant in the **query**, with an id from the **server-side session**, never in the prompt or the browser.",
        ],
      },
    ],
  },
];
