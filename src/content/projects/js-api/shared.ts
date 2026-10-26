/**
 * Shared pieces for the Dockline lessons.
 *
 * Authoring notes
 *  - Code (starters, solutions, checks) is written with the `js` tag and prose with the `md` tag.
 *    Both turn the broken bar ¦ into a backtick and \${ into ${, so template literals can appear
 *    in learner code without escaping gymnastics. Backslashes are otherwise kept exactly as typed.
 *  - Every lesson's code is appended to ONE file, so a top-level name is declared once in the whole
 *    course. Later lessons extend earlier ones with new classes, functions and `router.before(...)`
 *    policies (never by editing). Where a lesson needs to change earlier behaviour it reassigns a
 *    `let` seam (pipeline, stationListView, loadForecast) that the earlier lesson announced.
 *  - Tests run inside the learner's scope as an async function: they can use await, sim.tick(ms),
 *    sim.network.failNext(...) and the assert helpers. They may call handle(raw) like the control
 *    room does: handle({ method, url, headers, body, ip }) -> { status, headers, body, trace }.
 */
const unescape = (raw: string) => raw.replaceAll("\\`", "`").replaceAll("¦", "`").replaceAll("\\${", "${");

export const js = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  unescape(strings.raw.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ""), ""));

export const md = js;

/**
 * Test prelude: small helpers so every check builds its own requests.
 *  call(method, url, { headers, body, ip, as })   -> the plain response (as = a rider id logs in first)
 *  tokenFor(riderId)                              -> a bearer token string
 */
export const PRELUDE = js`const _pins = { "u-ana": "4821", "u-ben": "7390", "u-mia": "1156", "u-root": "9034" };
let _ipCounter = 0;
const tokenFor = async (riderId) => {
  const res = await handle({ method: "POST", url: "/auth/token", headers: {}, body: { riderId, pin: _pins[riderId] }, ip: "10.250.0." + (++_ipCounter % 250) });
  if (res.status !== 200) throw new Error("test helper: login for " + riderId + " answered " + res.status);
  return res.body.token;
};
const call = async (method, url, { headers = {}, body, ip, as } = {}) => {
  const h = { ...headers };
  if (as) h.authorization = "Bearer " + (await tokenFor(as));
  return handle({ method, url, headers: h, body, ip: ip ?? "10.99.0." + (++_ipCounter % 250) });
};
`;

/** Prefixes a test body with the prelude. */
export const T = (code: string) => PRELUDE + code;
