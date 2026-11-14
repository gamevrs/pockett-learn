/** Pure logic for the pcb-reflow and pcb-fabfiles widgets. Typical figures from paste datasheets, simplified. */

// ───────────────────────────── reflow profile ─────────────────────────────

export const LIQUIDUS_C = 217; // SAC305, about 217 to 220 C
export const AMBIENT_C = 25;
export const PREHEAT_END_C = 150;
export const SOAK_END_C = 200;
export const PREHEAT_RATE = 2; // C/s, typical 1 to 3
const RISE_SHARE = 0.4; // share of the time above liquidus spent climbing to the peak
const COOL_BELOW = 3; // C/s below liquidus

export interface ReflowParams {
  peakC: number;
  talS: number;
  soakS: number;
}

export interface Pt {
  t: number;
  c: number;
}

export interface Profile {
  points: Pt[];
  /** Time above liquidus actually produced by the curve (0 if the peak stays under it). */
  tal: number;
  /** Climb rate above liquidus and cooling rate just after the peak, C/s. */
  riseRate: number;
  coolRate: number;
  end: number;
}

export function profile(p: ReflowParams): Profile {
  const pts: Pt[] = [{ t: 0, c: AMBIENT_C }];
  const t1 = (PREHEAT_END_C - AMBIENT_C) / PREHEAT_RATE;
  pts.push({ t: t1, c: PREHEAT_END_C });
  const t2 = t1 + p.soakS;
  pts.push({ t: t2, c: SOAK_END_C });
  if (p.peakC <= LIQUIDUS_C) {
    const top = Math.max(p.peakC, SOAK_END_C);
    const t3 = t2 + (top - SOAK_END_C) / 2;
    pts.push({ t: t3, c: top });
    const t4 = t3 + (top - AMBIENT_C) / COOL_BELOW;
    pts.push({ t: t4, c: AMBIENT_C });
    return { points: pts, tal: 0, riseRate: 2, coolRate: COOL_BELOW, end: t4 };
  }
  const tL = t2 + (LIQUIDUS_C - SOAK_END_C) / 2;
  pts.push({ t: tL, c: LIQUIDUS_C });
  const d = p.peakC - LIQUIDUS_C;
  const tPeak = tL + RISE_SHARE * p.talS;
  pts.push({ t: tPeak, c: p.peakC });
  const tDown = tPeak + (1 - RISE_SHARE) * p.talS;
  pts.push({ t: tDown, c: LIQUIDUS_C });
  const tEnd = tDown + (LIQUIDUS_C - AMBIENT_C) / COOL_BELOW;
  pts.push({ t: tEnd, c: AMBIENT_C });
  return { points: pts, tal: p.talS, riseRate: d / (RISE_SHARE * p.talS), coolRate: d / ((1 - RISE_SHARE) * p.talS), end: tEnd };
}

export type Tone = "good" | "warn" | "bad";
export interface Verdict {
  tone: Tone;
  text: string;
}

export function peakVerdict(peak: number): Verdict {
  if (peak < 230) return { tone: "bad", text: "Too cool: the paste may not melt fully, so cold or incomplete joints are likely." };
  if (peak < 235) return { tone: "warn", text: "A little low: joints on big, heavy parts may stay cold." };
  if (peak <= 250) return { tone: "good", text: "In the typical lead-free window (about 235 to 250 °C)." };
  if (peak <= 255) return { tone: "warn", text: "A little high: less margin for parts rated to 260 °C." };
  return { tone: "bad", text: "Too hot: components and the board risk damage (J-STD-020 parts are rated up to about 260 °C)." };
}

export function talVerdict(tal: number): Verdict {
  if (tal < 45) return { tone: "bad", text: "Too short above liquidus: poor wetting, the solder may not flow and bond." };
  if (tal < 60) return { tone: "warn", text: "Short: typical is about 60 to 90 s above 217 °C." };
  if (tal <= 90) return { tone: "good", text: "Typical (about 60 to 90 s above liquidus)." };
  if (tal <= 120) return { tone: "warn", text: "Long: a thicker, more brittle intermetallic layer grows." };
  return { tone: "bad", text: "Too long: excessive intermetallic growth and stress on parts and board." };
}

export function soakVerdict(soak: number): Verdict {
  if (soak < 60) return { tone: "bad", text: "Short soak: the board is not evenly warm, so tombstoning and voids become more likely." };
  if (soak <= 120) return { tone: "good", text: "Typical soak (about 60 to 120 s from 150 to 200 °C)." };
  return { tone: "warn", text: "Long soak: the flux can be used up before melting, hurting wetting." };
}

export type VerdictKey = "ok" | "cold" | "hot" | "wetting" | "intermetallic" | "soak" | "marginal";

export function overall(p: ReflowParams): { key: VerdictKey; ok: boolean } {
  if (p.peakC > 255) return { key: "hot", ok: false };
  if (p.peakC < 230) return { key: "cold", ok: false };
  if (p.talS < 45) return { key: "wetting", ok: false };
  if (p.talS > 120) return { key: "intermetallic", ok: false };
  if (p.soakS < 60) return { key: "soak", ok: false };
  const ok = peakVerdict(p.peakC).tone === "good" && talVerdict(p.talS).tone === "good" && soakVerdict(p.soakS).tone === "good";
  return { key: ok ? "ok" : "marginal", ok };
}

// ───────────────────────────── panelisation ─────────────────────────────

export const RAIL_MM = 5; // typical rail width
export const ROUTE_GAP_MM = 2; // typical router bit gap between tab-routed boards

export type Separation = "vscore" | "tabs";

export interface PanelResult {
  count: number;
  cols: number;
  rows: number;
  /** Boards laid out turned 90 degrees. */
  rotated: boolean;
  bw: number;
  bh: number;
  gap: number;
  usableW: number;
  usableH: number;
}

function fit(bw: number, bh: number, uw: number, uh: number, gap: number) {
  const cols = Math.max(0, Math.floor((uw + gap) / (bw + gap)));
  const rows = Math.max(0, Math.floor((uh + gap) / (bh + gap)));
  return { cols, rows, count: cols * rows };
}

/** Rails run along the top and bottom edges (each RAIL_MM). V-score boards touch; tab-routed boards leave a router gap. */
export function panelFit(boardW: number, boardH: number, panelW: number, panelH: number, sep: Separation): PanelResult {
  const gap = sep === "tabs" ? ROUTE_GAP_MM : 0;
  const uw = panelW;
  const uh = panelH - 2 * RAIL_MM;
  const a = fit(boardW, boardH, uw, uh, gap);
  const b = fit(boardH, boardW, uw, uh, gap);
  const rot = b.count > a.count;
  const best = rot ? b : a;
  return { ...best, rotated: rot, bw: rot ? boardH : boardW, bh: rot ? boardW : boardH, gap, usableW: uw, usableH: uh };
}

// ───────────────────────────── manufacturing files ─────────────────────────────

export type Bucket = "fab" | "assembly" | "none";

export const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "fab", label: "Fab (bare board)" },
  { id: "assembly", label: "Assembly" },
  { id: "none", label: "Not sent" },
];

export interface FileCard {
  id: string;
  name: string;
  what: string;
  bucket: Bucket;
  why: string;
}

/** Listed in a mixed order on purpose. */
export const FILE_CARDS: FileCard[] = [
  { id: "bom", name: "BOM (bill of materials)", what: "Every part: quantity, reference designators, value, manufacturer part number.", bucket: "assembly", why: "The assembler buys and loads parts from it. Manufacturer part numbers (not just \"100 nF\") let them find the exact part or an approved alternate." },
  { id: "cu-outer", name: "Gerber: top and bottom copper", what: "One file per outer copper layer.", bucket: "fab", why: "These are the copper patterns the fab etches. No copper files, no board." },
  { id: "project", name: "Native design project (a KiCad or Altium project, say)", what: "The editable source of your design.", bucket: "none", why: "Fabs generally cannot use it (a few accept some formats, so check). Export Gerbers instead and keep the project in version control." },
  { id: "pnp", name: "Pick-and-place (centroid) file", what: "X, Y, rotation and side for every reference designator.", bucket: "assembly", why: "The placement machine reads it to put each part at the right spot and angle. The bare board does not need it." },
  { id: "mask", name: "Gerber: solder mask, top and bottom", what: "Where the coating is left open over pads.", bucket: "fab", why: "The fab applies the mask to the bare board and leaves the pads open." },
  { id: "render", name: "3D render of the board", what: "A picture or STEP model.", bucket: "none", why: "Good for reviews and for checking the enclosure fit, but neither the fab nor the assembler builds from it." },
  { id: "drill", name: "Excellon drill file (plated and non-plated)", what: "Hole positions and sizes for vias, pins and mounting holes.", bucket: "fab", why: "The fab drills the holes before plating. Plated and non-plated holes are usually separate files." },
  { id: "paste", name: "Gerber: solder paste (top)", what: "Openings where paste is printed on the pads.", bucket: "assembly", why: "It becomes the stencil that prints paste, which is an assembly step. Many fabs sell the stencil with the board, but it is still an assembly item (nuance: you may order it from either)." },
  { id: "asm", name: "Assembly drawing (PDF)", what: "A picture of where each part goes, with reference designators.", bucket: "assembly", why: "People use it to check placement, polarity marks and special instructions during assembly and inspection." },
  { id: "outline", name: "Board outline (Edge.Cuts or a mechanical layer)", what: "The shape of the board, plus cut-outs and slots.", bucket: "fab", why: "The fab routes the board to this shape. Without it the fab has to guess the size." },
  { id: "inner", name: "Gerber: inner copper layers", what: "One file per inner copper layer of a 4-layer or larger board.", bucket: "fab", why: "The fab makes the inner planes and traces before the layers are pressed together." },
  { id: "sch", name: "Schematic PDF", what: "The circuit diagram as a document.", bucket: "none", why: "Useful to reviewers and for your records, but neither fab nor assembler needs it to build the board. Send it only if they ask." },
  { id: "silk", name: "Gerber: silkscreen, top and bottom", what: "Reference designators, outlines and logos printed on the board.", bucket: "fab", why: "The fab prints the legend onto the bare board." },
  { id: "fabdraw", name: "Fab drawing and notes", what: "Stackup, finish, board thickness, impedance requirements.", bucket: "fab", why: "It tells the fab what Gerbers cannot: layer order, thickness, surface finish, controlled-impedance targets and tolerances." },
  { id: "ipc", name: "IPC-2581 or ODB++ package", what: "One file with layers, drills, stackup and often the BOM.", bucket: "fab", why: "A single-file alternative to the Gerber set plus drill file, mostly sent to the fab (some assemblers use its extra data too). Some fabs accept it, not all." },
];

export function scoreSort(assigned: Record<string, Bucket | undefined>): number {
  let n = 0;
  for (const c of FILE_CARDS) if (assigned[c.id] === c.bucket) n++;
  return n;
}
