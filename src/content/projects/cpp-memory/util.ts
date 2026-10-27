/**
 * Authoring helpers for the C++ "Provenance" course.
 *
 *  - `cpp` is String.raw: C++ source goes through untouched, so \n, \" and \t stay exactly as written.
 *  - `md` is String.raw too, plus \` becomes a plain backtick, so lesson prose can show C++ with single
 *    backslashes and still contain inline code.
 *  - `js` is the same tag for the JavaScript check code (checks run over stdout, lines and scene).
 *  - `lab` is `js` with the shot / event helpers in front, so a check can say `lastShot()` or `ent(shot, "name")`.
 *
 * None of the tags may contain a bare backtick or the two characters ${.
 */
export const cpp = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

export const js = String.raw;

/** Helpers every lab check starts with (one line each so the failure line numbers stay small). */
export const LAB_PRELUDE = String.raw`
const shots = Object.keys(scene).filter((k) => /^shot[0-9]+$/.test(k)).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4))).map((k) => scene[k]);
const audit = scene.audit || null;
const lastShot = () => shots.length ? shots[shots.length - 1] : null;
const shotOf = (cap) => { for (let i = shots.length - 1; i >= 0; i--) if (shots[i].cap === cap) return shots[i]; return null; };
const ent = (shot, name) => (shot && shot.e ? shot.e.find((x) => x.n === name) : undefined) || null;
const blockOf = (shot, id) => (shot && shot.hp ? shot.hp.find((b) => b.id === id) : undefined) || null;
const allEvents = () => { const out = []; for (const s of shots) for (const e of (s.ev || [])) out.push(e); if (audit && audit.tail) for (const e of audit.tail) out.push(e); return out; };
const life = () => allEvents().filter((e) => e[0] !== "alloc" && e[0] !== "free" && e[0] !== "double-free");
const lifeText = () => life().map((e) => e[0] + " " + e[1]);
const needShot = (cap) => { const s = shotOf(cap); assert(s, 'No photo called "' + cap + '" yet. Take it with snap("' + cap + '"); after the peek lines.'); return s; };
`;

export function lab(strings: TemplateStringsArray, ...values: unknown[]): string {
  return LAB_PRELUDE + String.raw(strings, ...values);
}
