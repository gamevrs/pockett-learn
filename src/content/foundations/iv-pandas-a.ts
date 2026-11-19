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
const RECORDS_CODE = ["records = [", '    {"name": "Ann", "qty": 2},', '    {"name": "Bo"},', '    {"name": "Cy", "qty": 5, "note": "gift"},', "]", "df = pd.DataFrame(records)"];
const recordsGrid = (rows: (string | number)[][]) => [["#", "name", "qty", "note"], ...[0, 1, 2].map((i) => [i, ...(rows[i] ?? ["", "", ""])])];

const PEOPLE_GRID = [
  ["idx", "name", "age", "city"],
  [10, "Ann", 34, "Oslo"],
  [20, "Bo", 19, "Rome"],
  [30, "Cy", 27, "Oslo"],
  [40, "Dee", 45, "Lima"],
];

const MAIL_GRID = [
  ["#", "mail", "pts"],
  [0, "a@x", 3],
  [1, "b@x", 5],
  [2, "a@x", 4],
  [3, "c@x", 1],
  [4, "b@x", 2],
];

const rankGrid = (cols: (number | string)[][]) => [["pts", "avg", "min", "dns", "1st"], ...[90, 85, 90, 70].map((p, i) => [p, ...cols.map((c) => c[i]), ...Array(4 - cols.length).fill("")])];

export const ivPandasLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Creating and inspecting ───────────────────────────────
  {
    id: "fnd-iv-pandas-1-dataframes",
    title: "Creating and inspecting DataFrames",
    summary: "Build a DataFrame from columns or records, and read its shape, dtypes and missing values.",
    minutes: 12,
    xp: 70,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A table of columns",
        body:
          "pandas is the Python library for tables. A **DataFrame** is a set of named columns that share one row label, the **index**. Each column is a **Series**: one value per row, all of one type (its **dtype**).\n\n" +
          py(`
import pandas as pd

# from columns: a dict of lists
df = pd.DataFrame({"item": ["pen", "ink", "cap"], "qty": [3, 1, 4]})

# from rows: a list of dicts ("records")
df = pd.DataFrame([{"item": "pen", "qty": 3}, {"item": "ink"}])
`) +
          "\n\nThe first questions to ask any DataFrame:\n\n" +
          "| you write | you get |\n|---|---|\n| `df.shape` | `(rows, columns)` |\n| `df.columns`, `df.index` | the labels |\n| `df.dtypes` | each column's type: `int64`, `float64`, `object` (text), `bool`, `datetime64` |\n| `df.head(3)`, `df.tail(3)` | the first / last rows |\n| `df.isna().sum()` | missing values per column |\n| `df[\"col\"].value_counts()` | how often each value appears |\n| `df.describe()` | count, mean, min, max … of the number columns |\n\nMissing values show as **NaN** (\"not a number\"). NaN is a float, so an integer column with a gap silently becomes `float64`.\n\n**How to spot it:** interview pandas problems usually hand you a DataFrame and ask for a new one. Step one is always: what are the columns, the dtypes, and where are the gaps?",
      },
      {
        kind: "explain",
        title: "Records with gaps",
        body: "Step through `pd.DataFrame(records)` when the dicts don't all have the same keys. The grid is the DataFrame being built; `#` is the index. At the stop, tap the cell that ends up missing.",
        widget: {
          type: "iv-trace",
          props: {
            title: "a list of dicts becomes a DataFrame",
            frames: [
              { grid: recordsGrid([]), code: RECORDS_CODE, line: 6, vars: { columns: "name, qty, note" }, note: "First pandas collects **every key** it sees, in order of first appearance: name, qty, note. Those are the columns." },
              { grid: recordsGrid([["Ann", 2, "NaN"]]), cells: rowN(1, 4, "active"), line: 2, note: "Ann has no `note`, so that cell is **NaN**." },
              { grid: recordsGrid([["Ann", 2, "NaN"], ["Bo", "", ""]]), cells: [...rowN(1, 4, "done"), cell(2, 0, "active"), cell(2, 1, "active")], line: 3, note: "Bo's dict has only a name.", pick: { prompt: "Which cell in the `qty` column will be NaN? Tap it.", answer: "2,2" } },
              { grid: recordsGrid([["Ann", 2, "NaN"], ["Bo", "NaN", "NaN"]]), cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "active")], line: 3, note: "Bo gets NaN for both qty and note." },
              { grid: recordsGrid([["Ann", 2, "NaN"], ["Bo", "NaN", "NaN"], ["Cy", 5, "gift"]]), cells: [...rowN(1, 4, "done"), ...rowN(2, 4, "done"), ...rowN(3, 4, "active")], line: 4, note: "Cy has every key." },
              { grid: recordsGrid([["Ann", "2.0", "NaN"], ["Bo", "NaN", "NaN"], ["Cy", "5.0", "gift"]]), cells: [cell(1, 2, "path"), cell(2, 2, "path"), cell(3, 2, "path")], vars: { shape: "(3, 3)", qty: "float64", note: "object" }, note: "Because NaN is a float, `qty` is **float64**: 2.0 and 5.0. `df.isna().sum()` gives qty 1, note 2." },
            ],
          },
        },
      },
      {
        kind: "question",
        title: "Shape",
        body: "A DataFrame has 4 rows and 2 columns. What is `df.shape`?",
        question: {
          type: "choice",
          options: ["(4, 2)", "(2, 4)", "8", "[4, 2]"],
          answer: 0,
          feedback: { 1: "Rows come first, like in a matrix.", 2: "That's `df.size`, the number of cells." },
          hint: "shape is a tuple: rows first, then columns.",
        },
        explanation: "`df.shape` is the tuple `(rows, columns)`, so `(4, 2)`. `len(df)` is the row count and `df.size` the number of cells.",
      },
      {
        kind: "question",
        title: "A gap in the numbers",
        body: "What is the dtype of `pd.Series([1, None, 3])`?",
        question: {
          type: "choice",
          options: ["int64", "float64", "object", "Int64 (nullable)"],
          answer: 1,
          feedback: { 0: "int64 has no way to store a missing value.", 3: "That type exists, but you only get it if you ask: `dtype=\"Int64\"`." },
          hint: "None becomes NaN. What type is NaN?",
        },
        explanation: "None turns into NaN, which is a float, so the whole column becomes `float64` (1.0, NaN, 3.0). After filling the gaps, `.astype(int)` turns it back.",
      },
      {
        kind: "question",
        title: "Most common value",
        body: "Find the value of `pd.Series([\"a\", \"b\", \"a\", \"c\", \"a\"]).value_counts().iloc[0]`.",
        question: { type: "number", answer: 3, hint: "value_counts sorts from most to least frequent; iloc[0] is the first count." },
        explanation: "`value_counts()` gives a Series of counts, most frequent first: a → 3, b → 1, c → 1. `.iloc[0]` is the top count, 3, and `.index[0]` would be its value, `\"a\"`.",
      },
      {
        kind: "code",
        title: "Orders from records",
        body:
          "An API gives you orders as a list of dicts. Some leave out `qty` (meaning 0) and some carry extra keys you don't want.\n\nWrite `make_orders(records)`: return a DataFrame with exactly the columns `id`, `item`, `qty` in that order, with missing quantities as `0` and `qty` stored as whole numbers (an int dtype). An empty list gives an empty DataFrame with those three columns.\n\n" +
          py(`
make_orders([{"id": 1, "item": "pen"}, {"id": 2, "item": "ink", "qty": 4, "gift": True}])
#    id item  qty
# 0   1  pen    0
# 1   2  ink    4
`),
        language: "python",
        packages: ["pandas"],
        setup: "import pandas as pd",
        starter: `import pandas as pd

def make_orders(records):
    # build the DataFrame, keep id, item, qty, fill missing qty with 0
    pass
`,
        solution: `import pandas as pd

def make_orders(records):
    df = pd.DataFrame(records, columns=["id", "item", "qty"])
    df["qty"] = df["qty"].fillna(0).astype(int)
    return df
`,
        tests: [
          { id: "t1", description: "the three columns, in order", assertionCode: `out = make_orders([{"id": 1, "item": "pen", "qty": 3}, {"id": 2, "item": "ink", "qty": 1}])\nassert isinstance(out, pd.DataFrame), "make_orders should return a DataFrame"\nassert list(out.columns) == ["id", "item", "qty"], f"columns should be id, item, qty, got {list(out.columns)}"\nassert out["qty"].tolist() == [3, 1], f"qty should be [3, 1], got {out['qty'].tolist()}"` },
          { id: "t2", description: "a missing qty becomes 0, stored as int", assertionCode: `out = make_orders([{"id": 1, "item": "pen"}, {"id": 2, "item": "ink", "qty": 4}])\nassert isinstance(out, pd.DataFrame), "make_orders should return a DataFrame"\nassert out["qty"].tolist() == [0, 4], f"a missing qty should become 0, got {out['qty'].tolist()}"\nassert str(out["qty"].dtype).startswith("int"), f"qty should be an int column, got {out['qty'].dtype}: NaN made it float, so fill it, then .astype(int)"` },
          { id: "t3", description: "extra keys are dropped", assertionCode: `out = make_orders([{"id": 3, "item": "cap", "qty": 2, "gift": True, "note": "hi"}])\nassert isinstance(out, pd.DataFrame), "make_orders should return a DataFrame"\nassert list(out.columns) == ["id", "item", "qty"], f"only id, item, qty should be kept, got {list(out.columns)}. pd.DataFrame(records, columns=[...]) picks columns"` },
          { id: "t4", description: "an empty list", assertionCode: `out = make_orders([])\nassert isinstance(out, pd.DataFrame), "make_orders([]) should still return a DataFrame"\nassert len(out) == 0 and list(out.columns) == ["id", "item", "qty"], f"expected 0 rows with columns id, item, qty, got {len(out)} rows and {list(out.columns)}"` },
        ],
        hints: ["`pd.DataFrame(records, columns=[\"id\", \"item\", \"qty\"])` keeps only those columns, in that order, and adds any missing one as NaN.", "`df[\"qty\"].fillna(0).astype(int)`"],
      },
      {
        kind: "code",
        title: "Profile a DataFrame",
        body:
          "`plants` is loaded for you:\n\n" +
          txt(`
    name   height  watered
0   fern     30.0  2026-05-01
1   cactus    NaN  NaN
2   ivy      12.0  2026-05-03
3   mint      NaN  2026-05-02
`) +
          "\nWrite `profile(df)`: return a dict with `\"rows\"` (the row count), `\"columns\"` (a list of the column names) and `\"missing\"` (a dict from column name to the number of missing values, **only for columns with at least one**). For `plants` that's `{\"rows\": 4, \"columns\": [\"name\", \"height\", \"watered\"], \"missing\": {\"height\": 2, \"watered\": 1}}`.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
plants = pd.DataFrame({"name": ["fern", "cactus", "ivy", "mint"], "height": [30.0, None, 12.0, None], "watered": ["2026-05-01", None, "2026-05-03", "2026-05-02"]})`,
        starter: `def profile(df):
    # rows, columns, and missing counts for columns that have gaps
    pass
`,
        solution: `def profile(df):
    missing = df.isna().sum()
    return {
        "rows": len(df),
        "columns": list(df.columns),
        "missing": {col: int(n) for col, n in missing.items() if n > 0},
    }
`,
        tests: [
          { id: "t1", description: "rows and columns", assertionCode: `out = profile(plants)\nassert isinstance(out, dict), "profile should return a dict"\nassert out.get("rows") == 4, f"plants has 4 rows, got {out.get('rows')}"\nassert out.get("columns") == ["name", "height", "watered"], f"columns should be a list of names in order, got {out.get('columns')}"` },
          { id: "t2", description: "missing counts, only where there are gaps", assertionCode: `out = profile(plants)\nassert isinstance(out, dict), "profile should return a dict"\nassert out.get("missing") == {"height": 2, "watered": 1}, f"expected {{'height': 2, 'watered': 1}} (name has no gaps, so leave it out), got {out.get('missing')}"` },
          { id: "t3", description: "a DataFrame with no gaps", assertionCode: `out = profile(pd.DataFrame({"a": [1, 2], "b": ["x", "y"]}))\nassert isinstance(out, dict), "profile should return a dict"\nassert out.get("missing") == {} and out.get("rows") == 2, f"no gaps means missing is {{}}, got {out.get('missing')}"` },
          { id: "t4", description: "an empty DataFrame", assertionCode: `out = profile(pd.DataFrame({"a": []}))\nassert isinstance(out, dict), "profile should return a dict"\nassert out.get("rows") == 0 and out.get("columns") == ["a"] and out.get("missing") == {}, f"an empty frame has 0 rows, its columns, and no gaps, got {out}"` },
        ],
        hints: ["`df.isna().sum()` is a Series: column name → number of NaN.", "Loop over `.items()` and keep the pairs where the count is above 0."],
      },
      {
        kind: "recap",
        points: [
          "A **DataFrame** is named columns (each a **Series** with one **dtype**) sharing an **index**.",
          "Build it from a dict of lists (columns) or a list of dicts (records); missing keys become **NaN**.",
          "Inspect first: `shape`, `dtypes`, `head()`, `isna().sum()`, `value_counts()`, `describe()`.",
          "NaN is a float, so an int column with gaps becomes `float64`: fill, then `astype(int)`.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Selecting and filtering ───────────────────────────────
  {
    id: "fnd-iv-pandas-2-selecting",
    title: "Selecting and filtering",
    summary: "Columns, loc versus iloc, boolean masks with & | ~, isin and between.",
    minutes: 13,
    xp: 70,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Labels, positions and masks",
        body:
          "Three ways to pick parts of a DataFrame:\n\n" +
          "| you write | picks by | notes |\n|---|---|---|\n| `df[\"age\"]`, `df[[\"name\", \"age\"]]` | column name | one name gives a Series, a list gives a DataFrame |\n| `df.loc[rows, cols]` | **labels** | slices include the end: `df.loc[10:30]` |\n| `df.iloc[rows, cols]` | **positions** 0, 1, 2 … | slices exclude the end, like Python |\n| `df[mask]` | a **boolean mask** | keeps rows where the mask is True |\n\n" +
          "A mask is a Series of True/False, one per row. Combine masks with `&` (and), `|` (or) and `~` (not), and **put each comparison in brackets**, because `&` binds tighter than `>`:\n\n" +
          py(`
adults_in_oslo = df[(df["age"] >= 18) & (df["city"] == "Oslo")]
nordic = df[df["city"].isin(["Oslo", "Bergen", "Turku"])]
twenties = df[df["age"].between(20, 29)]          # both ends included
df.loc[df["age"] < 18, "ticket"] = "child"         # set values on the matching rows
`) +
          "\n\nPython's `and` / `or` don't work on Series (they raise *the truth value of a Series is ambiguous*). To set values, use one `df.loc[mask, col] = …`: chained `df[mask][\"col\"] = …` writes to a temporary copy.\n\n**How to spot it:** *find the rows where …*, *only customers who …*, *return these columns*. That's a mask and a column list.",
      },
      {
        kind: "question",
        title: "loc or iloc?",
        body: "This DataFrame's index labels are 10, 20, 30, 40 (the `idx` column). Step through, and at each stop tap the cell the expression returns.",
        widget: {
          type: "iv-trace",
          props: {
            title: "labels versus positions",
            frames: [
              { grid: PEOPLE_GRID, code: ["df.loc[20:30, ['name', 'age']]"], line: 1, cells: [cell(2, 1, "active"), cell(2, 2, "active"), cell(3, 1, "active"), cell(3, 2, "active")], note: "`loc` uses labels, and its slice **includes** the end: labels 20 and 30." },
              { code: ["df.iloc[1:3]"], line: 1, cells: [...rowN(2, 4, "active"), ...rowN(3, 4, "active")], note: "`iloc` counts positions from 0 and **excludes** the end: positions 1 and 2. Here that happens to be the same rows." },
              { code: ["df.iloc[3, 0]"], line: 1, note: "Position 3 of the rows, position 0 of the columns. (The index is not a column.)", pick: { prompt: "Which cell is `df.iloc[3, 0]`? Tap it.", answer: "4,1" } },
              { code: ["df.loc[30, 'city']"], line: 1, note: "Now by label: the row labelled 30, the column named city.", pick: { prompt: "Which cell is `df.loc[30, 'city']`? Tap it.", answer: "3,3" } },
              { code: ["mask = (df['age'] > 20) & (df['city'] == 'Oslo')", "df[mask]"], line: 2, cells: [...rowN(1, 4, "path"), ...rowN(2, 4, "done"), ...rowN(3, 4, "path"), ...rowN(4, 4, "done")], vars: { mask: "True, False, True, False" }, note: "A mask keeps Ann and Cy. Bo fails the age test, Dee the city test. The result keeps the labels 10 and 30." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "iloc counts from 0 in both directions and ignores the labels; loc uses the labels and column names." },
        explanation: "`iloc[3, 0]` is the 4th row and 1st column: Dee. `loc[30, 'city']` is the row labelled 30 and the city column: Oslo. Mixing them up is the most common pandas bug once the index is not 0, 1, 2 … (after a filter or a sort).",
      },
      {
        kind: "question",
        title: "and versus &",
        body: "What happens when you run this?\n\n" + py('df[df["age"] > 20 and df["city"] == "Oslo"]'),
        question: {
          type: "choice",
          options: ["It keeps the rows where both tests are True", "It keeps the rows where either test is True", "ValueError: the truth value of a Series is ambiguous", "It returns an empty DataFrame"],
          answer: 2,
          feedback: { 0: "That's what `&` does. `and` asks Python for a single True or False for the whole Series." },
          hint: "`and` needs one True or False. Can a whole column of booleans be turned into one?",
        },
        explanation: "`and` calls `bool()` on a Series, which pandas refuses. Write `(df[\"age\"] > 20) & (df[\"city\"] == \"Oslo\")`, with the brackets.",
      },
      {
        kind: "question",
        title: "An inclusive slice",
        body: "With the same index labels 10, 20, 30, 40: how many rows does `df.loc[10:30]` return?",
        question: { type: "number", answer: 3, hint: "loc slices by label and keeps both ends." },
        explanation: "Labels 10, 20 and 30: three rows. `df.iloc[0:3]` would also give three (positions 0, 1, 2), but `df.iloc[0:2]` only two.",
      },
      {
        kind: "code",
        title: "Adults in some cities",
        body:
          "`people` is loaded for you:\n\n" +
          txt(`
   name  age  city
0  Ann    17  Oslo
1  Bo     18  Rome
2  Cy     40  Oslo
3  Dee    25  Lima
4  Eli    30  Rome
`) +
          "\nWrite `adults_in(df, cities)`: the rows with `age` of at least 18 **and** a `city` in the list `cities`, with only the columns `name` and `city`, in the original order.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
people = pd.DataFrame({"name": ["Ann", "Bo", "Cy", "Dee", "Eli"], "age": [17, 18, 40, 25, 30], "city": ["Oslo", "Rome", "Oslo", "Lima", "Rome"]})`,
        starter: `def adults_in(df, cities):
    # rows with age >= 18 and city in cities; columns name and city
    pass
`,
        solution: `def adults_in(df, cities):
    mask = (df["age"] >= 18) & df["city"].isin(cities)
    return df.loc[mask, ["name", "city"]]
`,
        tests: [
          { id: "t1", description: "age 18 counts as an adult", assertionCode: `out = adults_in(people, ["Oslo", "Rome"])\nassert out is not None and hasattr(out, "columns"), "adults_in should return a DataFrame"\nassert list(out["name"]) == ["Bo", "Cy", "Eli"], f"expected Bo, Cy, Eli (Ann is 17; Bo is exactly 18), got {list(out['name'])}"` },
          { id: "t2", description: "only name and city", assertionCode: `out = adults_in(people, ["Lima"])\nassert out is not None and hasattr(out, "columns"), "adults_in should return a DataFrame"\nassert list(out.columns) == ["name", "city"], f"keep only name and city, got {list(out.columns)}"\nassert list(out["name"]) == ["Dee"], f"only Dee lives in Lima, got {list(out['name'])}"` },
          { id: "t3", description: "an empty list of cities", assertionCode: `out = adults_in(people, [])\nassert out is not None and hasattr(out, "columns"), "adults_in should return a DataFrame"\nassert len(out) == 0, f"no cities means no rows, got {len(out)}"` },
        ],
        hints: ["`df[\"city\"].isin(cities)` is a mask; combine it with `(df[\"age\"] >= 18)` using `&`.", "`df.loc[mask, [\"name\", \"city\"]]` filters rows and picks columns in one go."],
      },
      {
        kind: "code",
        title: "Flag the regulars",
        body:
          "`shop` is loaded for you, with columns `customer`, `spend` and `visits`.\n\nWrite `flag_vip(df)`: return a **new** DataFrame with an extra boolean column `vip`, True when `spend` is **over** 100 **or** `visits` is at least 10. Don't change the DataFrame you were given.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
shop = pd.DataFrame({"customer": ["ana", "ben", "cy", "dee"], "spend": [150, 100, 40, 99], "visits": [2, 9, 12, 10]})`,
        starter: `def flag_vip(df):
    # a copy with a boolean vip column
    pass
`,
        solution: `def flag_vip(df):
    out = df.copy()
    out["vip"] = (out["spend"] > 100) | (out["visits"] >= 10)
    return out
`,
        tests: [
          { id: "t1", description: "vip values", assertionCode: `out = flag_vip(shop)\nassert out is not None and "vip" in out.columns, "flag_vip should return a DataFrame with a vip column"\nassert list(out["vip"]) == [True, False, True, True], f"ana spends over 100, cy and dee visit 10+ times, ben neither (100 is not over 100), got {list(out['vip'])}"` },
          { id: "t2", description: "the input is left alone", assertionCode: `before = list(shop.columns)\nout = flag_vip(shop)\nassert out is not None, "flag_vip should return a DataFrame"\nassert list(shop.columns) == before, "flag_vip added a column to the DataFrame it was given; work on df.copy()"` },
          { id: "t3", description: "another DataFrame", assertionCode: `d = pd.DataFrame({"customer": ["x", "y"], "spend": [101, 0], "visits": [0, 0]})\nout = flag_vip(d)\nassert out is not None and "vip" in out.columns, "flag_vip should return a DataFrame with a vip column"\nassert list(out["vip"]) == [True, False], f"101 is over 100; 0 and 0 is not a vip, got {list(out['vip'])}"` },
        ],
        hints: ["`(out[\"spend\"] > 100) | (out[\"visits\"] >= 10)` is the whole mask.", "Start with `out = df.copy()` so the caller's DataFrame doesn't change."],
      },
      {
        kind: "recap",
        points: [
          "`df[\"col\"]` gives a Series, `df[[\"a\", \"b\"]]` a DataFrame.",
          "`loc` selects by **label** (slices include the end); `iloc` by **position** (slices exclude it).",
          "Masks: `&`, `|`, `~`, with every comparison in brackets. Never `and` / `or`.",
          "`isin(list)` for membership, `between(a, b)` for inclusive ranges.",
          "Set values with one `df.loc[mask, \"col\"] = …`, and copy before changing a frame you were given.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Cleaning ───────────────────────────────
  {
    id: "fnd-iv-pandas-3-cleaning",
    title: "Cleaning data",
    summary: "Missing values, duplicates, wrong types, messy text and renaming columns.",
    minutes: 15,
    xp: 80,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "The cleaning toolbox",
        body:
          "Real data has gaps, repeats, numbers stored as text and stray spaces. Each problem has one tool:\n\n" +
          "| problem | tool |\n|---|---|\n| find gaps | `df.isna()`, `df[\"c\"].notna()` (never `== np.nan`) |\n| drop rows with gaps | `df.dropna(subset=[\"email\"])` |\n| fill gaps | `df.fillna({\"score\": 0, \"team\": \"none\"})` |\n| repeated rows | `df.drop_duplicates(subset=[\"email\"], keep=\"last\")`, `df.duplicated()` |\n| text that should be numbers | `pd.to_numeric(df[\"age\"], errors=\"coerce\")` (bad values → NaN) |\n| change a type | `df[\"qty\"].astype(int)` |\n| messy text | `df[\"email\"].str.strip().str.lower()` |\n| rename columns | `df.rename(columns={\"Old\": \"new\"})` or a function |\n\n" +
          "These return a **new** DataFrame; assign the result (`df = df.dropna(...)`). Order matters: normalise text **before** dropping duplicates, or `\" Ann@x.com\"` and `\"ann@x.com\"` both survive.\n\n" +
          py(`
df["email"] = df["email"].str.strip().str.lower()
df = df.dropna(subset=["email"]).drop_duplicates(subset="email", keep="last")
df = df.reset_index(drop=True)        # labels 0, 1, 2 … again
`) +
          "\n\n**How to spot it:** *clean*, *fix*, *deduplicate*, *invalid*, *standardise*, *keep the most recent*.",
      },
      {
        kind: "question",
        title: "Which row goes?",
        body: "Step through `df.drop_duplicates(subset=\"mail\")` (the default is `keep=\"first\"`). At the stop, tap the first row it drops.",
        widget: {
          type: "iv-trace",
          props: {
            title: "drop_duplicates, keep first",
            frames: [
              { grid: MAIL_GRID, code: ['df.drop_duplicates(subset="mail")'], line: 1, cells: rowN(1, 3, "active"), vars: { seen: "a@x" }, note: "Row 0: `a@x` is new. Keep it and remember it." },
              { cells: [...rowN(1, 3, "path"), ...rowN(2, 3, "active")], vars: { seen: "a@x b@x" }, note: "Row 1: `b@x` is new too.", pick: { prompt: "Which row is the first one dropped? Tap its mail.", answer: "3,1" } },
              { cells: [...rowN(1, 3, "path"), ...rowN(2, 3, "path"), ...rowN(3, 3, "done")], vars: { seen: "a@x b@x" }, note: "Row 2 repeats `a@x`: dropped, even though its pts differ. Only the subset columns are compared." },
              { cells: [...rowN(1, 3, "path"), ...rowN(2, 3, "path"), ...rowN(3, 3, "done"), ...rowN(4, 3, "path"), ...rowN(5, 3, "done")], vars: { seen: "a@x b@x c@x", kept: "0, 1, 3" }, note: "Row 3 is new, row 4 repeats `b@x`. Kept labels: **0, 1, 3**." },
              { code: ['df.drop_duplicates(subset="mail", keep="last")'], cells: [...rowN(1, 3, "done"), ...rowN(2, 3, "done"), ...rowN(3, 3, "path"), ...rowN(4, 3, "path"), ...rowN(5, 3, "path")], vars: { kept: "2, 3, 4" }, note: "With `keep=\"last\"` the **last** copy of each wins: labels 2, 3, 4. Use it when later rows are newer. `keep=False` drops every copy." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Walk down the mail column and drop a row only when its mail was already seen." },
        explanation: "`drop_duplicates` compares only the `subset` columns. With `keep=\"first\"` the first copy stays and later ones go; with `keep=\"last\"` it's the other way round.",
      },
      {
        kind: "question",
        title: "Testing for NaN",
        body: "`df[\"score\"]` has two NaN values. What does `(df[\"score\"] == np.nan).sum()` return?",
        question: {
          type: "choice",
          options: ["2, the number of NaN values", "It raises a TypeError", "The number of non-NaN values", "0, because NaN equals nothing"],
          answer: 3,
          feedback: { 0: "That's what `df[\"score\"].isna().sum()` returns." },
          hint: "Is NaN equal to NaN?",
        },
        explanation: "NaN is not equal to anything, itself included, so every comparison is False and the sum is 0. Use `isna()` / `notna()`.",
      },
      {
        kind: "question",
        title: "Coerce to numbers",
        body: "Find the value of\n\n" + py('pd.to_numeric(pd.Series(["3", "4.5", "n/a", "7"]), errors="coerce").sum()'),
        question: { type: "number", answer: 14.5, tolerance: 0.001, hint: "\"n/a\" can't be parsed, so it becomes NaN, and sum() skips NaN." },
        explanation: "The strings become 3.0, 4.5, NaN and 7.0; `sum()` skips NaN by default: 14.5. Without `errors=\"coerce\"` the call raises on \"n/a\".",
      },
      {
        kind: "question",
        title: "dropna drops too much",
        body: "A DataFrame has columns `email` and `nickname`. Most nicknames are missing. You want to drop the rows that have no email. Which call?",
        question: {
          type: "choice",
          options: ["df.dropna()", "df.dropna(subset=[\"email\"])", "df.dropna(axis=1)", "df.fillna(\"\").dropna()"],
          answer: 1,
          feedback: { 0: "With no subset it drops a row if any column is NaN, so nearly every row goes.", 2: "axis=1 drops columns, not rows.", 3: "After fillna nothing is missing, so nothing is dropped." },
          hint: "Tell dropna which column matters.",
        },
        explanation: "`dropna()` with no arguments drops a row if **any** column is missing. `subset=[\"email\"]` looks only at the email.",
      },
      {
        kind: "code",
        title: "Clean the sign-ups",
        body:
          "`signups` is loaded for you (all text, as it came from a form):\n\n" +
          txt(`
    name   email            age
0   Ann    " Ann@Mail.com"  31
1   Bo     "bo@mail.com"    x
2   ann b  "ann@mail.com "  32
3   Cy     None             40
4   Dee    "  "             22
`) +
          "\nWrite `clean_signups(df)` that returns a new DataFrame where:\n\n1. emails are stripped of spaces and lower-cased;\n2. rows with no email (missing, or empty after stripping) are dropped;\n3. `age` is numeric, with values that aren't numbers as NaN;\n4. only the **last** row for each email is kept;\n5. the index is 0, 1, 2 … again.\n\nDon't change the input.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
signups = pd.DataFrame({"name": ["Ann", "Bo", "ann b", "Cy", "Dee"], "email": [" Ann@Mail.com", "bo@mail.com", "ann@mail.com ", None, "  "], "age": ["31", "x", "32", "40", "22"]})`,
        starter: `import pandas as pd

def clean_signups(df):
    # strip + lower emails, drop empty ones, numeric age, keep the last per email
    pass
`,
        solution: `import pandas as pd

def clean_signups(df):
    out = df.copy()
    out["email"] = out["email"].str.strip().str.lower()
    out = out[out["email"].notna() & (out["email"] != "")].copy()
    out["age"] = pd.to_numeric(out["age"], errors="coerce")
    out = out.drop_duplicates(subset="email", keep="last")
    return out.reset_index(drop=True)
`,
        tests: [
          { id: "t1", description: "normalised emails, no blanks, one per address", assertionCode: `out = clean_signups(signups)\nassert out is not None and "email" in getattr(out, "columns", []), "clean_signups should return a DataFrame"\nassert list(out["email"]) == ["bo@mail.com", "ann@mail.com"], f"expected ['bo@mail.com', 'ann@mail.com'] (strip and lower first, then dedupe), got {list(out['email'])}"` },
          { id: "t2", description: "the last copy wins", assertionCode: `out = clean_signups(signups)\nassert out is not None and "name" in getattr(out, "columns", []), "clean_signups should return a DataFrame"\nassert list(out["name"]) == ["Bo", "ann b"], f"row 2 ('ann b') is the later sign-up for ann@mail.com, so it should be kept, got {list(out['name'])}"` },
          { id: "t3", description: "age is numeric", assertionCode: `out = clean_signups(signups)\nassert out is not None and "age" in getattr(out, "columns", []), "clean_signups should return a DataFrame"\nassert pd.api.types.is_numeric_dtype(out["age"]), f"age should be numeric, got dtype {out['age'].dtype}"\nages = out["age"].tolist()\nassert len(ages) == 2 and pd.isna(ages[0]) and ages[1] == 32, f"Bo's age 'x' becomes NaN and ann b's is 32, got {ages}"` },
          { id: "t4", description: "a fresh index, and the input is untouched", assertionCode: `out = clean_signups(signups)\nassert out is not None and hasattr(out, "index"), "clean_signups should return a DataFrame"\nassert list(out.index) == [0, 1], f"reset the index, got {list(out.index)}"\nassert signups["email"].iloc[0] == " Ann@Mail.com", "the input DataFrame was changed; work on a copy"` },
        ],
        hints: ["`out[\"email\"].str.strip().str.lower()` leaves None as NaN; then keep rows with `notna()` and `!= \"\"`.", "`pd.to_numeric(..., errors=\"coerce\")`, then `drop_duplicates(subset=\"email\", keep=\"last\")` and `reset_index(drop=True)`."],
      },
      {
        kind: "code",
        title: "Tidy names and gaps",
        body:
          "`raw` is loaded for you. Its column names came from a spreadsheet:\n\n" +
          txt(`
   " First Name"  "Team "  "Score"
0  Ann            red      3.0
1  NaN            NaN      5.0
2  Cy             blue     NaN
`) +
          "\nWrite `tidy(df)`: rename every column to lower case with the spaces around it removed and the spaces inside turned into `_` (`first_name`, `team`, `score`), then fill missing `team` with `\"none\"` and missing `score` with `0`. Leave other gaps (like the missing first name) alone.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
raw = pd.DataFrame({" First Name": ["Ann", None, "Cy"], "Team ": ["red", None, "blue"], "Score": [3.0, 5.0, None]})`,
        starter: `def tidy(df):
    # rename the columns, then fill team and score
    pass
`,
        solution: `def tidy(df):
    out = df.rename(columns=lambda c: c.strip().lower().replace(" ", "_"))
    return out.fillna({"team": "none", "score": 0})
`,
        tests: [
          { id: "t1", description: "column names", assertionCode: `out = tidy(raw)\nassert out is not None and hasattr(out, "columns"), "tidy should return a DataFrame"\nassert list(out.columns) == ["first_name", "team", "score"], f"expected first_name, team, score, got {list(out.columns)}"` },
          { id: "t2", description: "team and score are filled", assertionCode: `out = tidy(raw)\nassert out is not None and "team" in getattr(out, "columns", []) and "score" in out.columns, "tidy should return a DataFrame with team and score columns"\nassert list(out["team"]) == ["red", "none", "blue"], f"a missing team becomes 'none', got {list(out['team'])}"\nassert list(out["score"]) == [3.0, 5.0, 0.0], f"a missing score becomes 0, got {list(out['score'])}"` },
          { id: "t3", description: "other gaps stay", assertionCode: `out = tidy(raw)\nassert out is not None and "first_name" in getattr(out, "columns", []), "tidy should return a DataFrame with a first_name column"\nassert pd.isna(out["first_name"].iloc[1]), "the missing first name should stay missing; fill only team and score (a dict in fillna)"` },
        ],
        hints: ["`df.rename(columns=lambda c: c.strip().lower().replace(\" \", \"_\"))` renames every column with a function.", "`fillna({\"team\": \"none\", \"score\": 0})` fills each column with its own value."],
      },
      {
        kind: "recap",
        points: [
          "Find gaps with `isna()`; NaN never equals anything, itself included.",
          "`dropna(subset=…)` and `fillna({col: value})`: say which columns you mean.",
          "`pd.to_numeric(errors=\"coerce\")` turns bad text into NaN instead of failing.",
          "Normalise text (`str.strip().str.lower()`) **before** `drop_duplicates(subset=…, keep=…)`.",
          "Cleaning calls return new frames: assign them, and `reset_index(drop=True)` at the end.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Sorting and ranking ───────────────────────────────
  {
    id: "fnd-iv-pandas-4-sorting",
    title: "Sorting and ranking",
    summary: "sort_values on several keys, nlargest with ties, and the rank methods.",
    minutes: 13,
    xp: 80,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Order and places",
        body:
          "Sorting puts rows in order; **ranking** writes each row's place into a column.\n\n" +
          py(`
df.sort_values("points", ascending=False)                        # one key
df.sort_values(["team", "points"], ascending=[True, False])      # team A→Z, then points high→low
df.nlargest(3, "points", keep="all")                             # top 3, ties at the cut included
df["place"] = df["points"].rank(method="min", ascending=False)   # 1 = most points
`) +
          "\n\nThe `method` of `rank` says what ties get, the same choice as SQL's ranking functions:\n\n" +
          "| method | 90, 85, 90, 70 (high first) | like SQL |\n|---|---|---|\n| `\"average\"` (default) | 1.5, 3, 1.5, 4 | – |\n| `\"min\"` | 1, 3, 1, 4 | `RANK()` |\n| `\"dense\"` | 1, 2, 1, 3 | `DENSE_RANK()` |\n| `\"first\"` | 1, 3, 2, 4 | `ROW_NUMBER()` in row order |\n\n" +
          "`rank` returns floats (because of `\"average\"`); add `.astype(int)` for whole places. After a sort the index labels keep their old values, so `reset_index(drop=True)` if you'll use positions. Missing values sort last (`na_position=\"last\"`).\n\n**How to spot it:** *highest*, *top N*, *leaderboard*, *order by … then by …*, *position*, *rank*.",
      },
      {
        kind: "question",
        title: "Four ways to rank",
        body: "Step through `rank(ascending=False)` on the points 90, 85, 90, 70 with each method. At the stop, tap the row that `method=\"first\"` gives rank 1.",
        widget: {
          type: "iv-trace",
          props: {
            title: "the same points, four rank methods",
            frames: [
              { grid: rankGrid([]), code: ['df["pts"].rank(method=..., ascending=False)'], line: 1, note: "Two rows tie at 90. Each method decides differently what they get." },
              { grid: rankGrid([[1.5, 3, 1.5, 4]]), cells: [cell(1, 1, "active"), cell(3, 1, "active")], note: "`average`: the two 90s would be places 1 and 2, so both get **1.5**." },
              { grid: rankGrid([[1.5, 3, 1.5, 4], [1, 3, 1, 4]]), cells: [cell(1, 2, "active"), cell(3, 2, "active"), cell(2, 2, "path")], note: "`min`: both take the lower place, 1, and 85 is **3**: a gap, like a race." },
              { grid: rankGrid([[1.5, 3, 1.5, 4], [1, 3, 1, 4], [1, 2, 1, 3]]), cells: [cell(1, 3, "active"), cell(3, 3, "active"), cell(2, 3, "path")], note: "`dense`: both 1, and 85 is **2**: no gap." },
              { cells: [], note: "`first`: ties are broken by the order the rows appear in.", pick: { prompt: "Which row gets rank 1 with `method=\"first\"`? Tap its pts.", answer: "1,0" } },
              { grid: rankGrid([[1.5, 3, 1.5, 4], [1, 3, 1, 4], [1, 2, 1, 3], [1, 3, 2, 4]]), cells: [cell(1, 4, "active"), cell(3, 4, "active")], note: "The 90 that comes first gets 1, the later one 2. Every row gets a different number." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "With `first`, a tie goes to whichever row is higher up in the DataFrame." },
        explanation: "`first` numbers tied rows in the order they appear, so it never repeats a number. `min` and `dense` share a number on ties; `average` splits the difference.",
      },
      {
        kind: "question",
        title: "Rank with gaps",
        body: "What is `pd.Series([50, 80, 80, 60]).rank(method=\"min\", ascending=False).tolist()`?",
        question: {
          type: "choice",
          options: ["[3.0, 1.0, 1.0, 2.0]", "[4.0, 1.5, 1.5, 3.0]", "[4.0, 1.0, 1.0, 3.0]", "[4.0, 2.0, 1.0, 3.0]"],
          answer: 2,
          feedback: { 0: "That's dense: no gap after the tie.", 1: "That's the default average method.", 3: "That's first: ties broken by order, and the first 80 would get 1." },
          hint: "Highest first. Both 80s share the lower place, and the next value skips a place.",
        },
        explanation: "The two 80s take places 1 and 2 and both get the minimum, 1. Then 60 is 3rd and 50 is 4th: `[4.0, 1.0, 1.0, 3.0]`.",
      },
      {
        kind: "question",
        title: "Dense from the top",
        body: "Find the rank of the 3 in `pd.Series([7, 3, 7, 9]).rank(method=\"dense\", ascending=False)`.",
        question: { type: "number", answer: 3, hint: "List the distinct values from high to low and count to 3." },
        explanation: "Distinct values high to low: 9, 7, 3. So 9 → 1, both 7s → 2, 3 → 3.",
      },
      {
        kind: "question",
        title: "Top N with a tie at the cut",
        body: "Scores are 90, 85, 85 and 60. Which call returns the top 2 **and** every row tied with the 2nd?",
        question: {
          type: "choice",
          options: ["df.nlargest(2, \"score\", keep=\"all\")", "df.nlargest(2, \"score\")", "df.sort_values(\"score\").head(2)", "df.sort_values(\"score\").tail(2)"],
          answer: 0,
          feedback: { 1: "The default keep=\"first\" returns exactly 2 rows.", 2: "That sorts low to high: the two smallest.", 3: "Exactly two rows, and one 85 is lost." },
          hint: "nlargest has a keep option for ties at the boundary.",
        },
        explanation: "`keep=\"all\"` keeps every row tied with the last place, so you get 90, 85, 85: three rows. It's the pandas version of `DENSE_RANK`/`RANK ≤ N` at the cut-off.",
      },
      {
        kind: "code",
        title: "Leaderboard",
        body:
          "`results` is loaded for you:\n\n" +
          txt(`
   name  points  time
0  ana   30      12.5
1  bo    45      10.0
2  cy    30      11.0
3  dee   45      10.0
4  eli   10      20.0
`) +
          "\nWrite `leaderboard(df)`: sort by `points` (high first), then `time` (low first), then `name` (A→Z); add an int column `place` where tied points share the **lower** place number and the next place is skipped (1, 1, 3 …); return it with a fresh 0, 1, 2 … index.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
results = pd.DataFrame({"name": ["ana", "bo", "cy", "dee", "eli"], "points": [30, 45, 30, 45, 10], "time": [12.5, 10.0, 11.0, 10.0, 20.0]})`,
        starter: `def leaderboard(df):
    # sort by points desc, time asc, name asc; add place (ties share, then skip)
    pass
`,
        solution: `def leaderboard(df):
    out = df.sort_values(["points", "time", "name"], ascending=[False, True, True]).reset_index(drop=True)
    out["place"] = out["points"].rank(method="min", ascending=False).astype(int)
    return out
`,
        tests: [
          { id: "t1", description: "sorted on three keys", assertionCode: `out = leaderboard(results)\nassert out is not None and "name" in getattr(out, "columns", []), "leaderboard should return a DataFrame"\nassert list(out["name"]) == ["bo", "dee", "cy", "ana", "eli"], f"45s first (bo and dee tie on time, so by name), then cy (faster) before ana, got {list(out['name'])}"` },
          { id: "t2", description: "places with gaps", assertionCode: `out = leaderboard(results)\nassert out is not None and "place" in getattr(out, "columns", []), "add a place column"\nassert list(out["place"]) == [1, 1, 3, 3, 5], f"expected places 1, 1, 3, 3, 5 (method='min'), got {list(out['place'])}"` },
          { id: "t3", description: "place is an int, and the index is fresh", assertionCode: `out = leaderboard(results)\nassert out is not None and "place" in getattr(out, "columns", []), "add a place column"\nassert str(out["place"].dtype).startswith("int"), f"place should be an int column, got {out['place'].dtype}"\nassert list(out.index) == [0, 1, 2, 3, 4], f"reset the index after sorting, got {list(out.index)}"` },
        ],
        hints: ["`sort_values([\"points\", \"time\", \"name\"], ascending=[False, True, True])`", "`out[\"points\"].rank(method=\"min\", ascending=False).astype(int)`"],
      },
      {
        kind: "code",
        title: "Top k with ties",
        body:
          "`scores` is loaded for you, with columns `name` and `score`: a 70, b 90, c 85, d 85, e 60.\n\nWrite `top_k(df, k)`: the rows with the `k` highest scores, highest first, **including every row tied with the k-th**. `k` may be 0 or bigger than the number of rows.",
        language: "python",
        packages: ["pandas"],
        setup: `import pandas as pd
scores = pd.DataFrame({"name": ["a", "b", "c", "d", "e"], "score": [70, 90, 85, 85, 60]})`,
        starter: `def top_k(df, k):
    # the k highest scores, ties at the cut included
    pass
`,
        solution: `def top_k(df, k):
    return df.nlargest(k, "score", keep="all")
`,
        tests: [
          { id: "t1", description: "a tie at the cut keeps both", assertionCode: `out = top_k(scores, 2)\nassert out is not None and "name" in getattr(out, "columns", []), "top_k should return a DataFrame"\nassert list(out["name"]) == ["b", "c", "d"], f"top 2 is 90 and 85, and c and d tie at 85, got {list(out['name'])}"` },
          { id: "t2", description: "k bigger than the table", assertionCode: `out = top_k(scores, 10)\nassert out is not None and "score" in getattr(out, "columns", []), "top_k should return a DataFrame"\nassert list(out["score"]) == [90, 85, 85, 70, 60], f"all five rows, highest first, got {list(out['score'])}"` },
          { id: "t3", description: "k = 0", assertionCode: `out = top_k(scores, 0)\nassert out is not None and hasattr(out, "columns"), "top_k should return a DataFrame"\nassert len(out) == 0, f"k = 0 should return no rows, got {len(out)}"` },
          { id: "t4", description: "no tie at the cut", assertionCode: `out = top_k(scores, 1)\nassert out is not None and "name" in getattr(out, "columns", []), "top_k should return a DataFrame"\nassert list(out["name"]) == ["b"], f"only b has the top score, got {list(out['name'])}"` },
        ],
        hints: ["`nlargest(k, \"score\")` returns exactly k rows by default.", "Its `keep=\"all\"` option keeps every row tied with the last place."],
      },
      {
        kind: "recap",
        points: [
          "`sort_values([a, b], ascending=[False, True])` sorts on several keys, each with its own direction.",
          "`rank(method=…)`: `min` ≈ RANK, `dense` ≈ DENSE_RANK, `first` ≈ ROW_NUMBER, `average` is the default.",
          "`rank` returns floats; `.astype(int)` for whole places.",
          "`nlargest(n, col, keep=\"all\")` keeps ties at the cut-off.",
          "After sorting, `reset_index(drop=True)` if positions matter.",
        ],
      },
    ],
  },
];
