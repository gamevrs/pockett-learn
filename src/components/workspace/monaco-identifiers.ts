/**
 * Gives names their own token types in Monaco's stock Monarch grammars, so the theme can colour them:
 *
 *   variable             plain names                         total, price, car_name
 *   variable.parameter   parameters in a Python def line     def move(dx, dy)
 *   variable.language    self / cls
 *   function             names followed by "("               move(...), WriteLine(...)
 *   type                 Capitalised names                   Car, Vec, Dictionary
 *   constant             ALL_CAPS names                      MAX_SPEED
 *   predefined           built-ins                           print, len, Console, Math, fmt, std, println!
 *
 * The stock grammars already route every name through one `cases` rule that ends in
 * "@default": "identifier" (after checking keywords). We keep that rule exactly as it is, but change its
 * default to `variable` and put a few narrower rules in front of it that reuse the same cases (so keywords and
 * state transitions such as C#'s @qualified keep working) with a different default.
 */

type Rule = unknown;
type Grammar = { tokenizer: Record<string, Rule[]> } & Record<string, unknown>;

const w = (s: string) => s.split(" ");

const BUILTINS: Record<string, string[]> = {
  python: w("print len range input int float str bool list dict set tuple type abs min max sum sorted reversed enumerate zip map filter any all round open isinstance issubclass repr chr ord pow divmod iter next format hex bin oct id hash dir vars getattr setattr hasattr delattr super callable bytes bytearray frozenset slice property staticmethod classmethod object globals locals exec eval compile exit quit help math random json re os sys datetime collections itertools statistics numpy np Exception BaseException ValueError TypeError KeyError IndexError AttributeError ZeroDivisionError NameError RuntimeError StopIteration NotImplementedError OSError FileNotFoundError ImportError AssertionError KeyboardInterrupt"),
  javascript: w("console Math JSON Object Array String Number Boolean Date Promise Map Set WeakMap WeakSet RegExp Error TypeError RangeError Symbol BigInt Intl parseInt parseFloat isNaN isFinite fetch setTimeout setInterval clearTimeout clearInterval requestAnimationFrame document window localStorage sessionStorage navigator require module exports process globalThis alert prompt structuredClone queueMicrotask"),
  csharp: w("Console Math Convert Environment Array Enumerable Path File Directory Thread"),
  go: w("fmt strings strconv math sort errors time os bufio sync io rand bytes unicode regexp json len cap append make new panic recover copy delete close print println min max clear complex real imag"),
  rust: w("std io fs env mem thread"),
  cpp: w("std cout cin cerr endl make_unique make_shared make_pair sort find reverse accumulate max min swap move to_string stoi stod getline format println print printf scanf malloc free strlen sizeof"),
  sql: [],
};

/** Lower-case names that are types (the Capitalised rule cannot see them). */
const BUILTIN_TYPES: Record<string, string[]> = {
  cpp: w("string wstring vector map unordered_map set unordered_set deque list array pair tuple optional unique_ptr shared_ptr size_t"),
};

/** Names Python treats as language, not user, names. */
const PY_KEYWORDS = w("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None");

interface Options {
  /** name( -> function */
  calls: boolean;
  /** Capitalised name followed by "(" is a constructor call (type) rather than a function. */
  capsCallIsType: boolean;
  /** ALL_CAPS -> constant, Capitalised -> type */
  caps: boolean;
}

const OPTIONS: Record<string, Options> = {
  python: { calls: true, capsCallIsType: true, caps: true },
  javascript: { calls: true, capsCallIsType: true, caps: true },
  typescript: { calls: true, capsCallIsType: true, caps: true },
  csharp: { calls: true, capsCallIsType: false, caps: true },
  go: { calls: true, capsCallIsType: false, caps: true },
  rust: { calls: true, capsCallIsType: true, caps: true },
  cpp: { calls: true, capsCallIsType: true, caps: true },
  sql: { calls: false, capsCallIsType: false, caps: false },
};

type Cases = Record<string, unknown>;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof RegExp);

/** The `cases` object of a rule's action, when that action ends in "@default": "identifier". */
function identifierCases(rule: Rule): Cases | null {
  if (!Array.isArray(rule) || rule.length < 2) return null;
  const action = rule[1];
  if (!isObj(action) || !isObj(action.cases)) return null;
  const def = action.cases["@default"];
  const token = typeof def === "string" ? def : isObj(def) ? def.token : undefined;
  return token === "identifier" ? (action.cases as Cases) : null;
}

/** Copy of `cases` with the default token replaced and "@builtins" slotted in before it. */
function withDefault(cases: Cases, token: string, builtins: boolean, extra: Cases = {}): Cases {
  const out: Cases = {};
  for (const [k, v] of Object.entries(cases)) {
    if (k === "@default") continue;
    out[k] = v;
  }
  if (builtins) out["@builtins"] = "predefined";
  Object.assign(out, extra);
  const def = cases["@default"];
  out["@default"] = isObj(def) ? { ...def, token } : token;
  return out;
}

export function applyIdentifierTokens(language: string, g: Grammar): Grammar {
  const opt = OPTIONS[language];
  if (!opt) return g;
  const builtins = BUILTINS[language] ?? [];
  const hasBuiltins = builtins.length > 0;
  if (hasBuiltins) g.builtins = builtins;
  const selfExtra: Cases = language === "python" ? { "@selfwords": "variable.language" } : {};
  if (BUILTIN_TYPES[language]) {
    g.typewords = BUILTIN_TYPES[language];
    selfExtra["@typewords"] = "type";
  }
  if (language === "python") {
    g.selfwords = ["self", "cls"];
    // the stock list mixes real keywords with built-in functions (print, len, ...); only the keywords stay keywords
    g.keywords = PY_KEYWORDS;
  }
  if (language === "rust") {
    // println! & co. are built-ins, not language keywords
    for (const rules of Object.values(g.tokenizer)) {
      for (const r of rules) {
        if (Array.isArray(r) && isObj(r[1]) && isObj(r[1].cases) && "@supportMacros" in r[1].cases) r[1].cases["@supportMacros"] = "predefined";
      }
    }
  }

  for (const state of Object.keys(g.tokenizer)) {
    const rules = g.tokenizer[state];
    for (let i = 0; i < rules.length; i++) {
      const cases = identifierCases(rules[i]);
      if (!cases) continue;
      const rule = rules[i] as unknown[];
      const source = rule[0] instanceof RegExp ? rule[0].source : String(rule[0]);
      const extra: Rule[] = [];
      const make = (re: RegExp, token: string) => [re, { cases: withDefault(cases, token, hasBuiltins, selfExtra) }];
      // after a dot (C#'s @qualified state) a Capitalised name is a member, not a type
      const member = state === "qualified";
      if (opt.caps && opt.capsCallIsType && !member) extra.push(make(/[A-Z][\w$]*(?=\s*\()/, "type"));
      if (opt.calls) extra.push(make(new RegExp(`(?:${source})(?=\\s*\\()`), "function"));
      if (opt.caps && !member) {
        extra.push(make(/[A-Z][A-Z0-9_]+(?![\w$])/, "constant"));
        extra.push(make(/[A-Z][\w$]*/, "type"));
      }
      rules.splice(i, 0, ...extra);
      i += extra.length;
      // the stock rule stays, but plain names become `variable`
      const stock = rules[i] as unknown[];
      stock[1] = { cases: withDefault(cases, "variable", hasBuiltins, selfExtra) };
    }
  }

  if (language === "python") addPythonParameters(g);
  if (language === "csharp") g.tokenizer.root.unshift([/(new)(\s+)([A-Za-z_]\w*)/, ["keyword.new", "white", "type"]]);
  return g;
}

/** `def name(a, b=1, *args)`: colour the name as a function and the names in the list as parameters. */
function addPythonParameters(g: Grammar) {
  g.tokenizer.pyParams = [
    [/\)/, { token: "delimiter.parenthesis", next: "@pop" }],
    [/[A-Za-z_]\w*(?=\s*[,)=:])/, { cases: { "@selfwords": "variable.language", "@default": "variable.parameter" } }],
    { include: "@pyCommon" },
  ];
  g.tokenizer.root.unshift([/(def)(\s+)([A-Za-z_]\w*)(\s*)(\()/, ["keyword", "white", "function", "white", { token: "delimiter.parenthesis", next: "@pyParams" }]]);
}
