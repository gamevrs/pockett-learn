import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (DataFrames the learner cannot see because they live in a hidden setup). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

type Tone = "active" | "done" | "path";
/** Tones for a whole grid row of `n` columns. */
const rowN = (r: number, n: number, tone: Tone) => Array.from({ length: n }, (_, c) => ({ r, c, tone }));
const cell = (r: number, c: number, tone: Tone) => ({ r, c, tone });

// ── trace data ──
const groupGrid = (means: (number | string)[]) => [["#", "k", "v", "mean"], ...[["A", 2], ["B", 9], ["A", 4], ["B", 3], ["A", 6]].map((r, i) => [i, ...r, means[i] ?? ""])];
const GROUP_CODE = ['df.groupby("k")["v"].mean()', 'df["mean"] = df.groupby("k")["v"].transform("mean")'];

const CUST_GRID = [
  ["#", "cid", "name"],
  [0, 1, "ana"],
  [1, 2, "ben"],
  [2, 3, "cy"],
];
const MERGE_CODE = ['customers.merge(orders, on="cid",', '                how="left", indicator=True)'];

const WIDE_GRID = [
  ["who", "jan", "feb"],
  ["Ann", 3, 5],
  ["Bo", 2, 4],
];
const MELT_CODE = ['wide.melt(id_vars="who", var_name="mon",', '          value_name="n")'];

const EMAILS = ["an@m.io", "bo.w.io", "cy@w.io"];

export const ivPandasLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. groupby and aggregation ───────────────────────────────
  {
    id: "fnd-iv-pandas-5-groupby",
    title: "groupby and aggregation",
    summary: "Split, apply, combine: named aggregations, size versus count, and transform for per-row group values.",
    minutes: 15,
    xp: 80,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Split, apply, combine",
        body:
          "`df.groupby(\"team\")` **splits** the rows into one group per team, **applies** a function to each group, and **combines** the answers. It's SQL's GROUP BY with more outputs:\n\n" +
          py(`
df.groupby("team")["points"].sum()                    # a Series: team -> total
df.groupby("team", as_index=False).agg(               # a DataFrame with named columns
    players=("player", "size"),
    total=("points", "sum"),
    best=("points", "max"),
)
df["team_total"] = df.groupby("team")["points"].transform("sum")   # one value per ROW
df.groupby("team").filter(lambda g: len(g) >= 3)                    # keep whole groups
`) +
          "\n\n| you want | use |\n|---|---|\n| one row per group | `.sum()`, `.mean()`, `.agg(name=(col, func))` |\n| rows in a group | `size` (counts every row) |\n| non-missing values | `count` (skips NaN) |\n| different values | `nunique` |\n| the group's value on **every row** | `.transform(func)`: same length as `df` |\n| keep or drop whole groups | `.filter(func)`, like HAVING |\n\n" +
          "The group keys become the **index** of the result; `as_index=False` or `.reset_index()` turns them back into a column. Groups come out sorted by key, and rows whose key is NaN are **left out** unless you pass `dropna=False`.\n\n**How to spot it:** *per*, *for each*, *total by*, *average per*, *share of its group*, *compared with the group average* (that last one is `transform`).",
      },
      {
        kind: "question",
        title: "Aggregate or transform?",
        body: "Step through the split, the means, and then `transform`, which writes each group's mean back onto its rows. At the stop, tap the group whose mean lands in row 3.",
        widget: {
          type: "iv-trace",
          props: {
            title: "groupby: mean versus transform",
            frames: [
              { grid: groupGrid([]), code: GROUP_CODE, line: 1, cells: [...rowN(1, 3, "path"), ...rowN(3, 3, "path"), ...rowN(5, 3, "path")], vars: { A: "2, 4, 6" }, note: "**Split**: rows 0, 2 and 4 have k = A." },
              { cells: [...rowN(2, 3, "active"), ...rowN(4, 3, "active")], vars: { A: "2, 4, 6", B: "9, 3" }, line: 1, note: "Rows 1 and 3 form group B." },
              { array: ["A 4", "B 6"], vars: { A: "(2+4+6)/3 = 4", B: "(9+3)/2 = 6" }, line: 1, note: "**Apply** the mean to each group and **combine**: a Series with one row per group, indexed by k." },
              { cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "done"), ...rowN(3, 4, "done")], grid: groupGrid([4, 6, 4]), line: 2, note: "`transform(\"mean\")` instead writes the group's mean onto **every row** of the group, in the original order." },
              { cells: rowN(4, 4, "active"), line: 2, note: "Row 3 is next.", pick: { prompt: "Which group's mean goes into row 3?", answer: 1, on: "array" } },
              { grid: groupGrid([4, 6, 4, 6, 4]), cells: [cell(1, 3, "path"), cell(2, 3, "path"), cell(3, 3, "path"), cell(4, 3, "path"), cell(5, 3, "path")], line: 2, note: "Five rows in, five values out: now `df[\"v\"] > df[\"mean\"]` finds rows above their group's average." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Row 3 has k = B, and transform gives every row its own group's value." },
        explanation: "Aggregating returns one value per group; `transform` returns one value per row (the group's value broadcast back), so it lines up with the original DataFrame and can be used in a mask or a new column.",
      },
      {
        kind: "question",
        title: "size or count?",
        body: "Group `a` has 3 rows, and one of them has a NaN in `v`. What are `df.groupby(\"k\")[\"v\"].size()` and `.count()` for group `a`?",
        question: {
          type: "choice",
          options: ["3 and 3", "2 and 3", "2 and 2", "3 and 2"],
          answer: 3,
          feedback: { 1: "Backwards: size counts rows, count skips NaN." },
          hint: "One of them counts rows, the other counts values that are present, like COUNT(*) and COUNT(col).",
        },
        explanation: "`size` counts rows (3), like `COUNT(*)`. `count` counts non-missing values (2), like `COUNT(v)`.",
      },
      {
        kind: "question",
        title: "Broadcast the mean",
        body: "`g` has `k` = a, b, a, b, a and `v` = 1, 8, 5, 2, 3.\n\nFind the value of `g.groupby(\"k\")[\"v\"].transform(\"mean\").iloc[3]`.",
        question: { type: "number", answer: 5, hint: "Row 3 belongs to group b. Average b's values." },
        explanation: "Row 3 has k = b, and b's values are 8 and 2, so its mean is 5. Group a's mean is (1 + 5 + 3) / 3 = 3.",
      },
      {
        kind: "question",
        title: "Missing keys",
        body: "Some rows have `team` = NaN. What happens to them in `df.groupby(\"team\")[\"pts\"].sum()`?",
        question: {
          type: "choice",
          options: ["They form a group labelled NaN", "They're left out of the result", "They raise a ValueError", "They join the first group"],
          answer: 1,
          feedback: { 0: "Only with `groupby(\"team\", dropna=False)`." },
          hint: "groupby has a dropna option. What is its default?",
        },
        explanation: "`dropna=True` is the default, so rows with a NaN key silently disappear from every aggregate. Pass `dropna=False` (or fill the key) when they matter.",
      },
      {
        kind: "code",
        title: "Team table",
        body:
          "`players` is loaded for you:\n\n" +
          txt(`
   team   player  points
0  red    ana     12
1  blue   ben     31
2  red    cy      8
3  green  dee     15
4  blue   eli     10
5  red    fay     21
`) +
          "\nWrite `team_stats(df)`: one row per team with the columns `team`, `players` (rows in the team), `total` (sum of points) and `best` (highest points), sorted by `total` high to low, ties by team name, with a fresh index.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
players = pd.DataFrame({"team": ["red", "blue", "red", "green", "blue", "red"], "player": ["ana", "ben", "cy", "dee", "eli", "fay"], "points": [12, 31, 8, 15, 10, 21]})`,
        starter: `def team_stats(df):
    # team, players, total, best; biggest total first
    pass
`,
        solution: `def team_stats(df):
    out = df.groupby("team", as_index=False).agg(
        players=("player", "size"),
        total=("points", "sum"),
        best=("points", "max"),
    )
    return out.sort_values(["total", "team"], ascending=[False, True]).reset_index(drop=True)
`,
        tests: [
          { id: "t1", description: "columns and team order", assertionCode: `out = team_stats(players)\nassert out is not None and hasattr(out, "columns"), "team_stats should return a DataFrame"\nassert list(out.columns) == ["team", "players", "total", "best"], f"columns should be team, players, total, best, got {list(out.columns)}"\nassert list(out["team"]) == ["blue", "red", "green"], f"blue and red both total 41, so blue comes first by name; then green, got {list(out['team'])}"` },
          { id: "t2", description: "counts, totals and bests", assertionCode: `out = team_stats(players)\nassert out is not None and "players" in getattr(out, "columns", []), "team_stats should return a DataFrame with a players column"\nassert out.to_dict("records") == [\n    {"team": "blue", "players": 2, "total": 41, "best": 31},\n    {"team": "red", "players": 3, "total": 41, "best": 21},\n    {"team": "green", "players": 1, "total": 15, "best": 15},\n], f"got {out.to_dict('records')}"` },
          { id: "t3", description: "a fresh index", assertionCode: `out = team_stats(players)\nassert out is not None and hasattr(out, "index"), "team_stats should return a DataFrame"\nassert list(out.index) == [0, 1, 2], f"reset the index after sorting, got {list(out.index)}"` },
        ],
        hints: ["`df.groupby(\"team\", as_index=False).agg(players=(\"player\", \"size\"), total=(\"points\", \"sum\"), best=(\"points\", \"max\"))`", "Sort with `[\"total\", \"team\"]` and `ascending=[False, True]`, then `reset_index(drop=True)`."],
      },
      {
        kind: "code",
        title: "Share of the team",
        body:
          "Same `players` as before. Write `share_of_team(df)`: a copy of the DataFrame with a new column `share`, each player's points divided by their team's total, rounded to 2 decimals. Keep every row, in the original order and with the original index.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
players = pd.DataFrame({"team": ["red", "blue", "red", "green", "blue", "red"], "player": ["ana", "ben", "cy", "dee", "eli", "fay"], "points": [12, 31, 8, 15, 10, 21]})`,
        starter: `def share_of_team(df):
    # points / team total, on every row
    pass
`,
        solution: `def share_of_team(df):
    out = df.copy()
    out["share"] = (out["points"] / out.groupby("team")["points"].transform("sum")).round(2)
    return out
`,
        tests: [
          { id: "t1", description: "shares", assertionCode: `out = share_of_team(players)\nassert out is not None and "share" in getattr(out, "columns", []), "share_of_team should return a DataFrame with a share column"\nassert list(out["share"]) == [0.29, 0.76, 0.2, 1.0, 0.24, 0.51], f"red totals 41, blue 41, green 15; got {list(out['share'])}"` },
          { id: "t2", description: "every row, in place", assertionCode: `out = share_of_team(players)\nassert out is not None and hasattr(out, "index"), "share_of_team should return a DataFrame"\nassert list(out.index) == [0, 1, 2, 3, 4, 5] and list(out["player"]) == ["ana", "ben", "cy", "dee", "eli", "fay"], "keep the original rows and order: transform, not an aggregate"\nassert "share" not in players.columns, "don't add the column to the input; work on a copy"` },
          { id: "t3", description: "another DataFrame", assertionCode: `d = pd.DataFrame({"team": ["x", "y", "x"], "player": ["p", "q", "r"], "points": [1, 5, 3]})\nout = share_of_team(d)\nassert out is not None and "share" in getattr(out, "columns", []), "share_of_team should return a DataFrame with a share column"\nassert list(out["share"]) == [0.25, 1.0, 0.75], f"x totals 4: 1/4 and 3/4; y is alone, got {list(out['share'])}"` },
        ],
        hints: ["`df.groupby(\"team\")[\"points\"].transform(\"sum\")` gives each row its team's total.", "Divide, then `.round(2)`."],
      },
      {
        kind: "recap",
        points: [
          "`groupby` splits, applies and combines; the keys become the index unless `as_index=False`.",
          "Named aggregation: `.agg(new_name=(column, \"func\"))` gives clean column names in one step.",
          "`size` counts rows, `count` skips NaN, `nunique` counts different values.",
          "`transform` returns one value per **row**: shares, differences from the group mean, ranks within a group.",
          "NaN keys are dropped by default (`dropna=True`).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Merging and joining ───────────────────────────────
  {
    id: "fnd-iv-pandas-6-merging",
    title: "Merging and joining",
    summary: "merge with how, on and left_on/right_on, indicator for anti-joins, suffixes, and duplicate keys.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "SQL joins, pandas spelling",
        body:
          "`merge` is a SQL join:\n\n" +
          py(`
orders.merge(customers, left_on="customer_id", right_on="id", how="left")
customers.merge(orders, on="cid", how="left", indicator=True)   # adds a _merge column
pd.concat([jan, feb], ignore_index=True)                         # stack rows (UNION ALL)
`) +
          "\n\n| argument | means |\n|---|---|\n| `how=\"inner\"` (default) | only matching keys |\n| `how=\"left\"` / `\"right\"` | keep every row of that side; NaN where nothing matches |\n| `how=\"outer\"` | keep everything from both |\n| `on=` / `left_on=`, `right_on=` | the key columns (same name / different names) |\n| `indicator=True` | `_merge` says `both`, `left_only` or `right_only` |\n| `suffixes=(\"_x\", \"_y\")` | added to clashing column names |\n| `validate=\"many_to_one\"` | raise if the right keys aren't unique |\n\n" +
          "The SQL lessons apply unchanged: duplicate keys **multiply** rows, and a left join that finds nothing fills NaN, which turns int columns into floats. The **anti-join** (rows with no match) is `indicator=True` then `_merge == \"left_only\"`, or simply `~left[\"id\"].isin(right[\"customer_id\"])`.\n\n**How to spot it:** two DataFrames and *for each … its …*, *who never …*, *combine*, *look up*.",
      },
      {
        kind: "question",
        title: "Follow the merge",
        body: "The grid is `customers`; the `orders` (order id → cid) are in the variables box. Step through a left merge with `indicator=True`. Answer both picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "customers.merge(orders, how=\"left\")",
            frames: [
              { grid: CUST_GRID, code: MERGE_CODE, vars: { "order 7": "cid 1", "order 8": "cid 3", "order 9": "cid 1" }, array: [], line: 1, note: "Each customer row looks up every order with the same `cid`." },
              { note: "Before stepping: one customer has two orders.", pick: { prompt: "Which customer comes out twice? Tap their name.", answer: "1,2", on: "grid" } },
              { cells: rowN(1, 3, "active"), array: ["ana 7 both", "ana 9 both"], line: 1, note: "ana (cid 1) matches orders 7 and 9: **two** rows, `_merge = both`." },
              { cells: [...rowN(1, 3, "done"), ...rowN(2, 3, "active")], note: "ben is cid 2. No order has cid 2.", pick: { prompt: "Which customer will be `left_only`? Tap their name.", answer: "2,2", on: "grid" } },
              { cells: [...rowN(1, 3, "done"), ...rowN(2, 3, "active")], array: ["ana 7 both", "ana 9 both", "ben NaN left_only"], line: 2, note: "ben is kept with NaN for the order: `left_only`. Order ids become floats (7.0, 9.0) because of that NaN." },
              { cells: [...rowN(1, 3, "done"), ...rowN(2, 3, "path"), ...rowN(3, 3, "done")], array: ["ana 7 both", "ana 9 both", "ben NaN left_only", "cy 8 both"], line: 2, note: "cy matches order 8. Keep only `_merge == \"left_only\"` and you have the customers who never ordered: an **anti-join**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Count each customer's matching cids in the orders box. Zero matches is left_only." },
        explanation: "A left merge keeps every left row once per match (ana twice) and once with NaN when there's none (ben). The `_merge` column from `indicator=True` labels which is which.",
      },
      {
        kind: "question",
        title: "Rows after an outer merge",
        body: "`l` has key values 1, 2, 3. `r` has key values 2, 3, 3, 4. How many rows does `l.merge(r, on=\"k\", how=\"outer\")` have?",
        question: { type: "number", answer: 5, hint: "Count matches per key: 1 only on the left, 2 once, 3 twice, 4 only on the right." },
        explanation: "Key 1 (left only), key 2 (one match), key 3 (two matches) and key 4 (right only): 1 + 1 + 2 + 1 = 5 rows.",
      },
      {
        kind: "question",
        title: "Clashing names",
        body: "Both DataFrames have columns `id` and `name`. What are the columns of `a.merge(b, on=\"id\")`?",
        question: {
          type: "choice",
          options: ["id, name_x, name_y", "id, name, name", "id, name_left, name_right", "It raises a MergeError"],
          answer: 0,
          feedback: { 2: "Those would need `suffixes=(\"_left\", \"_right\")`." },
          hint: "The key appears once. The other clashing column needs telling apart, with the default suffixes.",
        },
        explanation: "Non-key columns that exist on both sides get the suffixes `_x` (left) and `_y` (right). Pass `suffixes=(\"_a\", \"_b\")` for clearer names, or rename before merging.",
      },
      {
        kind: "question",
        title: "Spot the anti-join rows",
        body: "After `left.merge(right, on=\"k\", how=\"left\", indicator=True)`, which `_merge` value marks the left rows that found **no** match?",
        question: {
          type: "choice",
          options: ["\"both\"", "\"right_only\"", "\"left_only\"", "NaN"],
          answer: 2,
          feedback: { 1: "right_only rows only appear in a right or outer merge.", 3: "_merge is never missing; it's a category with three values." },
          hint: "The row exists only on one side. Which one?",
        },
        explanation: "`left_only` means the key was only in the left DataFrame. Filter on it, then drop `_merge` and the right-hand columns.",
      },
      {
        kind: "code",
        title: "Customers who never ordered",
        body:
          "`customers` and `orders` are loaded for you:\n\n" +
          txt(`
customers                    orders
   id  name  city               order_id  customer_id  amount
0   1  ana   Oslo            0       100            1      20
1   2  ben   Rome            1       101            3      35
2   3  cy    Oslo            2       102            1      15
3   4  dee   Lima            3       103            5      50
4   5  eli   Rome            4       104            9      99
`) +
          "\nWrite `never_ordered(customers, orders)`: the customers with **no** orders, with exactly the customers' columns, sorted by `id`, with a fresh index. (Order 104 is for a customer that doesn't exist; it shouldn't matter.)",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
customers = pd.DataFrame({"id": [1, 2, 3, 4, 5], "name": ["ana", "ben", "cy", "dee", "eli"], "city": ["Oslo", "Rome", "Oslo", "Lima", "Rome"]})
orders = pd.DataFrame({"order_id": [100, 101, 102, 103, 104], "customer_id": [1, 3, 1, 5, 9], "amount": [20, 35, 15, 50, 99]})`,
        starter: `def never_ordered(customers, orders):
    # customers whose id never appears in orders.customer_id
    pass
`,
        solution: `def never_ordered(customers, orders):
    m = customers.merge(
        orders[["customer_id"]].drop_duplicates(),
        how="left", left_on="id", right_on="customer_id", indicator=True,
    )
    out = m.loc[m["_merge"] == "left_only", list(customers.columns)]
    return out.sort_values("id").reset_index(drop=True)
`,
        tests: [
          { id: "t1", description: "the right customers", assertionCode: `out = never_ordered(customers, orders)\nassert out is not None and "id" in getattr(out, "columns", []), "never_ordered should return a DataFrame"\nassert list(out["id"]) == [2, 4], f"ben (2) and dee (4) have no orders, got {list(out['id'])}"` },
          { id: "t2", description: "only the customers' columns, fresh index", assertionCode: `out = never_ordered(customers, orders)\nassert out is not None and hasattr(out, "columns"), "never_ordered should return a DataFrame"\nassert list(out.columns) == ["id", "name", "city"], f"drop helper columns like _merge and customer_id, got {list(out.columns)}"\nassert list(out.index) == list(range(len(out))), f"reset the index, got {list(out.index)}"` },
          { id: "t3", description: "no orders at all", assertionCode: `out = never_ordered(customers, orders.iloc[0:0])\nassert out is not None and "id" in getattr(out, "columns", []), "never_ordered should return a DataFrame"\nassert list(out["id"]) == [1, 2, 3, 4, 5], f"with no orders every customer qualifies, got {list(out['id'])}"` },
          { id: "t4", description: "everyone ordered", assertionCode: `everyone = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "customer_id": [5, 4, 3, 2, 1, 1], "amount": [1, 1, 1, 1, 1, 1]})\nout = never_ordered(customers, everyone)\nassert out is not None and hasattr(out, "columns"), "never_ordered should return a DataFrame"\nassert len(out) == 0, f"every customer has an order, so nobody qualifies, got {len(out)} rows"` },
        ],
        hints: ["A left merge with `indicator=True`, then keep `_merge == \"left_only\"`.", "Or skip the merge: `customers[~customers[\"id\"].isin(orders[\"customer_id\"])]`. Either way, then sort and reset the index."],
      },
      {
        kind: "code",
        title: "Revenue by city",
        body:
          "Same `customers` and `orders`. Write `revenue_by_city(orders, customers)`: a DataFrame with columns `city` and `revenue` (the sum of order amounts from customers in that city). **Every** city in `customers` appears, with 0 when nobody there ordered; orders for unknown customers are ignored. Sort by revenue high to low, ties by city, with a fresh index.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
customers = pd.DataFrame({"id": [1, 2, 3, 4, 5], "name": ["ana", "ben", "cy", "dee", "eli"], "city": ["Oslo", "Rome", "Oslo", "Lima", "Rome"]})
orders = pd.DataFrame({"order_id": [100, 101, 102, 103, 104], "customer_id": [1, 3, 1, 5, 9], "amount": [20, 35, 15, 50, 99]})`,
        starter: `def revenue_by_city(orders, customers):
    # join orders to customers, total the amounts per city
    pass
`,
        solution: `def revenue_by_city(orders, customers):
    m = customers.merge(orders, how="left", left_on="id", right_on="customer_id")
    out = m.groupby("city", as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    return out.sort_values(["revenue", "city"], ascending=[False, True]).reset_index(drop=True)
`,
        tests: [
          { id: "t1", description: "every city, biggest first", assertionCode: `out = revenue_by_city(orders, customers)\nassert out is not None and "city" in getattr(out, "columns", []), "revenue_by_city should return a DataFrame with a city column"\nassert list(out["city"]) == ["Oslo", "Rome", "Lima"], f"Oslo 70, Rome 50, Lima 0. A plain inner merge loses Lima, got {list(out['city'])}"` },
          { id: "t2", description: "revenues", assertionCode: `out = revenue_by_city(orders, customers)\nassert out is not None and "revenue" in getattr(out, "columns", []), "name the total column revenue"\nassert list(out["revenue"]) == [70, 50, 0], f"ana's 20 + 15 and cy's 35 make Oslo 70; eli's 50 is Rome; order 104 belongs to no customer, got {list(out['revenue'])}"` },
          { id: "t3", description: "columns and index", assertionCode: `out = revenue_by_city(orders, customers)\nassert out is not None and hasattr(out, "columns"), "revenue_by_city should return a DataFrame"\nassert list(out.columns) == ["city", "revenue"] and list(out.index) == [0, 1, 2], f"expected columns city, revenue and index 0..2, got {list(out.columns)} and {list(out.index)}"` },
        ],
        hints: ["Start from customers: `customers.merge(orders, how=\"left\", left_on=\"id\", right_on=\"customer_id\")`.", "`groupby(\"city\", as_index=False)[\"amount\"].sum()` treats NaN as nothing, so Lima sums to 0. Then rename and sort."],
      },
      {
        kind: "recap",
        points: [
          "`merge` = SQL join: `how` picks inner/left/right/outer, `on` or `left_on`/`right_on` the keys.",
          "Duplicate keys multiply rows; `validate=\"many_to_one\"` catches surprises.",
          "Anti-join: `indicator=True` and `_merge == \"left_only\"`, or `~a[\"id\"].isin(b[\"key\"])`.",
          "Clashing column names get `_x` / `_y`; a left merge with misses turns ints into floats.",
          "Start a left merge from the side whose every row must survive.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Reshaping ───────────────────────────────
  {
    id: "fnd-iv-pandas-7-reshaping",
    title: "Reshaping: pivot and melt",
    summary: "Long versus wide tables, pivot_table with aggfunc and fill_value, and melt back to long.",
    minutes: 14,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Long and wide",
        body:
          "The same data can be **long** (one row per observation: store, month, amount) or **wide** (one row per store, one column per month). Long is easy to filter and group; wide is easy to read and compare.\n\n" +
          py(`
# long -> wide
wide = sales.pivot_table(index="store", columns="month", values="amount",
                         aggfunc="sum", fill_value=0)
# wide -> long
long = wide.reset_index().melt(id_vars="store", var_name="month", value_name="amount")
`) +
          "\n\n- `pivot(index, columns, values)` only reshapes: if a (store, month) pair appears twice it raises `ValueError`. `pivot_table` **aggregates** duplicates with `aggfunc` (default `\"mean\"`!) and `fill_value` fills empty cells.\n- The pivoted result has `store` as its **index** and the month labels as **columns**, sorted. `reset_index()` brings `store` back as a column.\n- `melt(id_vars=…)` keeps those columns and turns every other column into two: the old column name (`var_name`) and its value (`value_name`). It walks **column by column**.\n- `pd.crosstab(df.a, df.b)` is a quick count table; `stack()` / `unstack()` move a level between index and columns.\n\n**How to spot it:** *one column per …*, *a row per X with …*, *turn the columns into rows*, *report by month across the top*.",
      },
      {
        kind: "question",
        title: "In what order does melt walk?",
        body: "Step through `melt` on a wide table. At the stop, tap the cell that becomes the **third** long row.",
        widget: {
          type: "iv-trace",
          props: {
            title: "wide.melt(id_vars=\"who\")",
            frames: [
              { grid: WIDE_GRID, code: MELT_CODE, array: [], line: 1, note: "`who` stays as an identifier. The other columns, jan and feb, get unpivoted." },
              { cells: [cell(1, 0, "path"), cell(1, 1, "active")], array: ["Ann jan 3"], line: 1, note: "Long row 0: Ann, `mon` = jan, `n` = 3." },
              { cells: [cell(2, 0, "path"), cell(2, 1, "active")], array: ["Ann jan 3", "Bo jan 2"], line: 1, note: "Long row 1: Bo, jan, 2." },
              { cells: [cell(1, 1, "done"), cell(2, 1, "done")], line: 1, note: "The jan column is done.", pick: { prompt: "Which cell becomes the third long row (row 2)? Tap it.", answer: "1,2" } },
              { cells: [cell(1, 0, "path"), cell(1, 2, "active"), cell(1, 1, "done"), cell(2, 1, "done")], array: ["Ann jan 3", "Bo jan 2", "Ann feb 5"], line: 2, note: "melt finishes a whole column before the next: Ann's feb comes after **all** of jan." },
              { cells: [cell(1, 1, "done"), cell(2, 1, "done"), cell(1, 2, "done"), cell(2, 2, "active")], array: ["Ann jan 3", "Bo jan 2", "Ann feb 5", "Bo feb 4"], line: 2, note: "2 rows × 2 value columns = 4 long rows. Sort afterwards (`sort_values([\"who\", \"mon\"])`) if you need them grouped by person." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "melt takes every row of the first value column, then every row of the next one." },
        explanation: "melt stacks the value columns one under the other: all of jan, then all of feb. So row 2 is Ann's feb value, 5.",
      },
      {
        kind: "question",
        title: "pivot with duplicates",
        body: "`sales` has two rows for (`north`, `jan`). What does `sales.pivot(index=\"store\", columns=\"month\", values=\"amount\")` do?",
        question: {
          type: "choice",
          options: ["Keeps the first of the two values", "Adds the two values up", "Keeps the last of the two values", "Raises ValueError (duplicate entries)"],
          answer: 3,
          feedback: { 1: "That's `pivot_table(..., aggfunc=\"sum\")`. pivot itself never aggregates." },
          hint: "pivot only moves values around. What if two values want the same cell?",
        },
        explanation: "`pivot` raises *Index contains duplicate entries, cannot reshape*. Use `pivot_table` with an explicit `aggfunc` (its default is the mean, rarely what a report wants).",
      },
      {
        kind: "question",
        title: "Count the long rows",
        body: "A wide DataFrame has 3 rows, one `id_vars` column and 4 other columns. How many rows does `melt(id_vars=…)` produce?",
        question: { type: "number", answer: 12, hint: "Every (row, value column) pair becomes one long row." },
        explanation: "3 rows × 4 value columns = 12 long rows. (Drop the NaN ones afterwards if missing values shouldn't count.)",
      },
      {
        kind: "code",
        title: "Monthly sales grid",
        body:
          "`sales` is loaded for you (long format, and north has two January rows):\n\n" +
          txt(`
   store  month  amount
0  north  jan    10
1  south  jan    5
2  north  feb    7
3  north  jan    3
4  south  mar    8
5  east   feb    4
`) +
          "\nWrite `monthly_grid(sales)`: a wide DataFrame with one row per `store` (as the index), one column per `month`, holding the **total** amount, and 0 where a store sold nothing that month.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
sales = pd.DataFrame({"store": ["north", "south", "north", "north", "south", "east"], "month": ["jan", "jan", "feb", "jan", "mar", "feb"], "amount": [10, 5, 7, 3, 8, 4]})`,
        starter: `def monthly_grid(sales):
    # stores down the side, months across the top, totals inside
    pass
`,
        solution: `def monthly_grid(sales):
    return sales.pivot_table(index="store", columns="month", values="amount", aggfunc="sum", fill_value=0)
`,
        tests: [
          { id: "t1", description: "stores down, months across", assertionCode: `out = monthly_grid(sales)\nassert out is not None and hasattr(out, "index"), "monthly_grid should return a DataFrame"\nassert sorted(out.index) == ["east", "north", "south"], f"one row per store as the index, got {list(out.index)}"\nassert sorted(out.columns) == ["feb", "jan", "mar"], f"one column per month, got {list(out.columns)}"` },
          { id: "t2", description: "duplicates are added up", assertionCode: `out = monthly_grid(sales)\nassert out is not None and hasattr(out, "loc"), "monthly_grid should return a DataFrame"\nassert out.loc["north", "jan"] == 13, f"north sold 10 + 3 in jan, got {out.loc['north', 'jan']} (pivot_table's default aggfunc is the mean)"\nassert out.loc["south", "mar"] == 8 and out.loc["east", "feb"] == 4, "south mar is 8 and east feb is 4"` },
          { id: "t3", description: "empty cells are 0", assertionCode: `out = monthly_grid(sales)\nassert out is not None and hasattr(out, "loc"), "monthly_grid should return a DataFrame"\nassert out.isna().sum().sum() == 0, "there should be no NaN: use fill_value=0"\nassert out.loc["east", "jan"] == 0 and out.loc["north", "mar"] == 0, "east sold nothing in jan, north nothing in mar"` },
        ],
        hints: ["`pivot` can't handle the two north/jan rows. `pivot_table` can.", "`pivot_table(index=\"store\", columns=\"month\", values=\"amount\", aggfunc=\"sum\", fill_value=0)`"],
      },
      {
        kind: "code",
        title: "Marks to long format",
        body:
          "`marks` is loaded for you (wide, with gaps where a subject wasn't taken):\n\n" +
          txt(`
   student  math  art   bio
0  zoe      80.0  NaN   70
1  al       NaN   95.0  60
`) +
          "\nWrite `to_long(df)`: a long DataFrame with columns `student`, `subject`, `score`, leaving out the missing scores, sorted by student then subject, with a fresh index.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
marks = pd.DataFrame({"student": ["zoe", "al"], "math": [80, None], "art": [None, 95], "bio": [70, 60]})`,
        starter: `def to_long(df):
    # one row per (student, subject) that has a score
    pass
`,
        solution: `def to_long(df):
    out = df.melt(id_vars="student", var_name="subject", value_name="score")
    out = out.dropna(subset=["score"])
    return out.sort_values(["student", "subject"]).reset_index(drop=True)
`,
        tests: [
          { id: "t1", description: "the columns", assertionCode: `out = to_long(marks)\nassert out is not None and hasattr(out, "columns"), "to_long should return a DataFrame"\nassert list(out.columns) == ["student", "subject", "score"], f"expected student, subject, score, got {list(out.columns)}"` },
          { id: "t2", description: "missing scores are left out", assertionCode: `out = to_long(marks)\nassert out is not None and hasattr(out, "columns"), "to_long should return a DataFrame"\nassert len(out) == 4, f"6 cells minus 2 gaps = 4 rows, got {len(out)}"\nassert out["score"].notna().all(), "no NaN scores should be left"` },
          { id: "t3", description: "sorted, with a fresh index", assertionCode: `out = to_long(marks)\nassert out is not None and hasattr(out, "columns"), "to_long should return a DataFrame"\nrows = [(r["student"], r["subject"], r["score"]) for r in out.to_dict("records")]\nassert rows == [("al", "art", 95), ("al", "bio", 60), ("zoe", "bio", 70), ("zoe", "math", 80)], f"got {rows}"\nassert list(out.index) == [0, 1, 2, 3], f"reset the index, got {list(out.index)}"` },
        ],
        hints: ["`df.melt(id_vars=\"student\", var_name=\"subject\", value_name=\"score\")`", "Then `dropna(subset=[\"score\"])`, sort by `[\"student\", \"subject\"]` and `reset_index(drop=True)`."],
      },
      {
        kind: "recap",
        points: [
          "**Long**: one row per observation, good for grouping. **Wide**: one column per category, good for reading.",
          "`pivot` reshapes and fails on duplicates; `pivot_table` aggregates (`aggfunc`, default mean) and fills (`fill_value`).",
          "The pivot's row keys are the index; `reset_index()` makes them a column again.",
          "`melt(id_vars=…, var_name=…, value_name=…)` unpivots, one whole column at a time.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. String and date columns ───────────────────────────────
  {
    id: "fnd-iv-pandas-8-strings-dates",
    title: "String and date columns",
    summary: "The .str accessor with regular expressions, to_datetime, the .dt accessor and time differences.",
    minutes: 15,
    xp: 90,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Accessors for text and time",
        body:
          "Text and date columns have their own toolkits, reached through **accessors**: `.str` and `.dt`. They work on the whole column at once and pass missing values through as NaN.\n\n" +
          py(`
df["email"].str.lower().str.strip()
df["email"].str.contains("@mail", na=False)            # a mask; NaN counts as False
df["email"].str.extract(r"@([\\w.]+)$")                  # regex group -> a new column
df["name"].str.split(" ", expand=True)                  # split into columns
df["code"].str.len(), df["code"].str.startswith("EU")

df["ts"] = pd.to_datetime(df["ts"], format="%Y-%m-%d %H:%M", errors="coerce")
df["ts"].dt.year, df["ts"].dt.month, df["ts"].dt.day_name()
df["ts"].dt.strftime("%Y-%m")                           # a month key, like SQL's strftime
(df["shipped"] - df["ordered"]).dt.days                 # Timedelta -> whole days
`) +
          "\n\n- `str.extract` returns NaN where the pattern doesn't match, which makes it a parser and a validator at once.\n- Give `to_datetime` a `format`: without one, `\"03/04/2026\"` is read month first (4 March). `errors=\"coerce\"` turns unparseable values into **NaT**, the date version of NaN.\n- Subtracting two dates gives a **Timedelta**; `.dt.days` turns it into an int.\n\n**How to spot it:** *the domain of each email*, *names starting with*, *valid format*, *per month*, *within N days*, *weekday*.",
      },
      {
        kind: "question",
        title: "Which email doesn't match?",
        body: "Step through `str.extract(r\"@(\\w+)\\.\")` (the word between `@` and the next dot). At the stop, tap the email that comes out as NaN.",
        widget: {
          type: "iv-trace",
          props: {
            title: "extract a domain with a regex",
            frames: [
              { array: EMAILS, code: ['s.str.extract(r"@(\\w+)\\.")[0]'], line: 1, vars: { pattern: "@ (word) ." }, note: "The capture group `(\\w+)` is what comes out; a value with no match gives NaN." },
              { array: EMAILS, highlight: [0], vars: { "0": "m" }, line: 1, note: "`an@m.io`: `@`, then `m`, then a dot. Out comes **m**." },
              { array: EMAILS, done: [0], vars: { "0": "m" }, line: 1, note: "Look at the other two.", pick: { prompt: "Which value comes out as NaN?", answer: 1 } },
              { array: EMAILS, done: [0], highlight: [1], vars: { "0": "m", "1": "NaN" }, line: 1, note: "`bo.w.io` has no `@` at all: no match, **NaN**." },
              { array: EMAILS, done: [0, 1], highlight: [2], vars: { "0": "m", "1": "NaN", "2": "w" }, line: 1, note: "`cy@w.io` gives **w**. Now `.dropna()` keeps the valid ones, and `.value_counts()` counts them." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "The pattern needs an `@` followed by letters and a dot." },
        explanation: "`str.extract` returns the first capture group where the regex matches and NaN where it doesn't, so one call both pulls out the domain and flags the invalid values.",
      },
      {
        kind: "question",
        title: "A mask with gaps",
        body: "`df[df[\"email\"].str.contains(\"@mail\")]` raises *Cannot mask with non-boolean array containing NA / NaN values*, because some emails are missing. What's the fix?",
        question: {
          type: "choice",
          options: ["str.contains(\"@mail\", regex=False)", "str.contains(\"@mail\", na=False)", "str.contains(\"@mail\").astype(int)", "str.contains(\"@mail\", case=False)"],
          answer: 1,
          feedback: { 0: "That changes how the pattern is read, not what happens to NaN.", 2: "NaN can't be turned into an int; that raises too.", 3: "Case doesn't matter here: the NaN does." },
          hint: "Missing values give NaN instead of True or False. Which argument decides what they become?",
        },
        explanation: "`na=False` treats missing values as \"doesn't contain\", so the mask is all booleans. Without it, NaN rows give NaN and the mask can't be used.",
      },
      {
        kind: "question",
        title: "Days between",
        body: "Find the value of `(pd.Timestamp(\"2026-03-01\") - pd.Timestamp(\"2026-02-20\")).days`.",
        question: { type: "number", answer: 9, hint: "February 2026 has 28 days. Count from the 20th to the 1st." },
        explanation: "From 20 February to 28 February is 8 days, plus one more to 1 March: 9. On a column, the same thing is `(b - a).dt.days`.",
      },
      {
        kind: "question",
        title: "Which date is it?",
        body: "Without a `format`, what does `pd.to_datetime(\"03/04/2026\")` give?",
        question: {
          type: "choice",
          options: ["3 April 2026", "An error: the date is ambiguous", "4 March 2026", "3 March 2026"],
          answer: 2,
          feedback: { 0: "That's the day-first reading; pandas only does that with `dayfirst=True` or a format." },
          hint: "pandas reads slashed dates the American way unless told otherwise.",
        },
        explanation: "pandas reads `03/04/2026` month first: 4 March 2026. Pass `format=\"%d/%m/%Y\"` (or `dayfirst=True`) for European data, and prefer ISO dates (`2026-04-03`) whenever you control the input.",
      },
      {
        kind: "code",
        title: "Users per email domain",
        body:
          "`users` is loaded for you:\n\n" +
          txt(`
   email
0  Ann@Mail.com
1  bo@work.io
2  cy@mail.com
3  not-an-email
4  None
5  dee@WORK.io
6  eli@mail.com
`) +
          "\nWrite `domain_counts(df)`: a dict from domain (the part after `@`, lower-cased) to the number of users with it. Values without exactly one `@` (and missing values) are ignored. For `users`: `{\"mail.com\": 3, \"work.io\": 2}`.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
users = pd.DataFrame({"email": ["Ann@Mail.com", "bo@work.io", "cy@mail.com", "not-an-email", None, "dee@WORK.io", "eli@mail.com"]})`,
        starter: `def domain_counts(df):
    # {domain: number of users}, lower-cased, invalid emails ignored
    pass
`,
        solution: `def domain_counts(df):
    domains = df["email"].str.lower().str.extract(r"^[^@\\s]+@([^@\\s]+)$")[0]
    return domains.dropna().value_counts().to_dict()
`,
        tests: [
          { id: "t1", description: "counts per domain, case-insensitive", assertionCode: `out = domain_counts(users)\nassert isinstance(out, dict), "domain_counts should return a dict"\nassert out == {"mail.com": 3, "work.io": 2}, f"expected {{'mail.com': 3, 'work.io': 2}} (Mail.com and WORK.io are lower-cased), got {out}"` },
          { id: "t2", description: "invalid values are ignored", assertionCode: `d = pd.DataFrame({"email": ["a@b.c", "a@@b.c", "@b.c", "ab.c", None, "x@b.c"]})\nout = domain_counts(d)\nassert isinstance(out, dict), "domain_counts should return a dict"\nassert out == {"b.c": 2}, f"only a@b.c and x@b.c are valid (one @, something on both sides), got {out}"` },
          { id: "t3", description: "no rows", assertionCode: `out = domain_counts(pd.DataFrame({"email": pd.Series([], dtype=object)}))\nassert out == {}, f"an empty column gives an empty dict, got {out}"` },
        ],
        hints: ["`str.extract(r\"^[^@\\s]+@([^@\\s]+)$\")` matches 'something, one @, something' and captures the part after the @.", "Lower-case first, then `.dropna().value_counts().to_dict()`."],
      },
      {
        kind: "code",
        title: "Monthly active users",
        body:
          "`events` is loaded for you; `ts` is text, and one row was logged badly:\n\n" +
          txt(`
   user  ts
0  a     2026-01-05 10:00
1  b     2026-01-20 09:00
2  a     2026-01-28 12:00
3  c     2026-02-02 08:30
4  a     2026-02-14 19:00
5  b     not logged
6  d     2026-03-01 00:00
`) +
          "\nWrite `monthly_active(events)`: a dict from month (`\"2026-01\"`) to the number of **different** users with an event that month. Rows whose `ts` can't be parsed are ignored.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
events = pd.DataFrame({"user": ["a", "b", "a", "c", "a", "b", "d"], "ts": ["2026-01-05 10:00", "2026-01-20 09:00", "2026-01-28 12:00", "2026-02-02 08:30", "2026-02-14 19:00", "not logged", "2026-03-01 00:00"]})`,
        starter: `import pandas as pd

def monthly_active(events):
    # {"YYYY-MM": number of different users}
    pass
`,
        solution: `import pandas as pd

def monthly_active(events):
    ts = pd.to_datetime(events["ts"], format="%Y-%m-%d %H:%M", errors="coerce")
    valid = events.assign(month=ts.dt.strftime("%Y-%m"))[ts.notna()]
    return valid.groupby("month")["user"].nunique().to_dict()
`,
        tests: [
          { id: "t1", description: "distinct users per month", assertionCode: `out = monthly_active(events)\nassert isinstance(out, dict), "monthly_active should return a dict"\nassert out.get("2026-01") == 2, f"January has a, b and a again: 2 different users, got {out.get('2026-01')}"\nassert out == {"2026-01": 2, "2026-02": 2, "2026-03": 1}, f"got {out}"` },
          { id: "t2", description: "an unparseable time is ignored", assertionCode: `d = pd.DataFrame({"user": ["x", "y"], "ts": ["2026-05-01 10:00", "soon"]})\nout = monthly_active(d)\nassert isinstance(out, dict), "monthly_active should return a dict"\nassert out == {"2026-05": 1}, f"'soon' isn't a time; use errors='coerce' and drop NaT, got {out}"` },
          { id: "t3", description: "no events", assertionCode: `out = monthly_active(events.iloc[0:0])\nassert out == {}, f"no events gives an empty dict, got {out}"` },
        ],
        hints: ["`pd.to_datetime(events[\"ts\"], format=\"%Y-%m-%d %H:%M\", errors=\"coerce\")` gives NaT for the bad row.", "Make a month key with `.dt.strftime(\"%Y-%m\")`, keep the parsed rows, then `groupby(month)[\"user\"].nunique()`."],
      },
      {
        kind: "recap",
        points: [
          "`.str` works on a whole text column: `lower`, `strip`, `contains(…, na=False)`, `extract(regex)`, `split(expand=True)`.",
          "`str.extract` returns NaN where the pattern fails: parse and validate in one step.",
          "`pd.to_datetime(…, format=…, errors=\"coerce\")`: say the format, and get NaT for bad values.",
          "`.dt` gives parts (`year`, `month`, `day_name()`, `strftime`); date minus date is a Timedelta, `.dt.days` an int.",
          "Without a format, slashed dates are read month first.",
        ],
      },
    ],
  },
];
