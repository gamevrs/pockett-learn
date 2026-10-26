/**
 * Shared pieces for the Event Arena lessons.
 *
 * Authoring notes
 *  - Code (starters, solutions, checks) is written with the `js` tag and prose with the `md` tag.
 *    Both turn the broken bar ¦ into a backtick and \${ into ${, so template literals can appear
 *    in learner code without escaping gymnastics. Backslashes are otherwise kept exactly as typed.
 *  - Never put a backslash escape (like \n) in learner code; use a different approach.
 *  - Every lesson's code is appended to ONE file, so a top-level name is declared once in the whole
 *    course. Later lessons extend earlier ones with new classes and functions (never by editing).
 *  - Tests run inside the learner's scope as an async function: they can use await, sim.tick(ms),
 *    sim.network.failNext(...) and the assert helpers.
 */
const unescape = (raw: string) => raw.replaceAll("\\`", "`").replaceAll("¦", "`").replaceAll("\\${", "${");

export const js = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  unescape(strings.raw.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ""), ""));

export const md = js;

/** The event shape used across the course (also what the scene sends). */
export const EVENT_DOC = js`// An arena event looks like this:
//   { id: 7, type: "goal", team: "fal", teamName: "Falcons", player: "Ada Okoro", minute: 23, points: 1 }
//   type is "goal" | "foul" | "timeout" | "card"; a card also has detail: "yellow" | "red"`;

/** Test prelude: tiny builders so every test makes its own events. Names start with an underscore. */
export const PRELUDE = js`const _names = { fal: "Falcons", wol: "Wolves", orc: "Orcas", haw: "Hawks", lyn: "Lynx", bea: "Bears" };
let _nextId = 1;
const _ev = (type, team = "fal", minute = 10, extra = {}) => ({ id: _nextId++, type, team, teamName: _names[team], player: "Ada Okoro", minute, ...extra });
`;

/** Prefixes a test body with the prelude. */
export const T = (code: string) => PRELUDE + code;
