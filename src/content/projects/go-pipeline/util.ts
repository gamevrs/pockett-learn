import { go, js, md } from "../go-basics/util.ts";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";

export { go, js, md, MAIN_DIVIDER };

/**
 * JavaScript helpers pasted at the top of the checks (the checks run as plain JavaScript over `scene`,
 * `stdout` and `lines`). `readingsFor` is the same formula as the Go function of the same name, so the
 * expected answers are worked out independently of the learner's program.
 */
export const READ = js`
const readingsFor = (b, n) => Array.from({ length: n }, (_, i) => { const s = i + 1; return { Buoy: b, Seq: s, Wave: 40 + (b * 37 + s * 53) % 160, Wind: 8 + (b * 11 + s * 29) % 70, Temp: 100 + (b * 13 + s * 7) % 90 }; });
const summaryOf = (b, n) => { const rs = readingsFor(b, n); return { Buoy: b, Count: rs.length, MaxWave: Math.max(...rs.map((r) => r.Wave)), WindSum: rs.reduce((a, r) => a + r.Wind, 0) }; };
`;
