import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { ThreeApp, ThreeContext } from "@/engine/three-kit";
import { ACCENT, GLOW, NEUTRAL, ROLE, SIGNAL, applyBloom, color, createFloor, material, setupStage } from "@/engine/stage-style";
import { STEPS, TRACK_IDS, clamp, sectionLevel, type TrackId } from "./sequencer";
import { trackAlive, type PatternId, type Runtime } from "./runtime";

/**
 * Beat Lab in 3D: a drum machine on a plinth. Rows of rounded pads (one InstancedMesh)
 * press down and light up on hits, a playhead sweeps across, a spectrum ring breathes around
 * the machine, bass notes send up a short-lived spark, and the mixer is a strip of real faders.
 * All text is HTML: the stage only positions the label elements it is handed.
 *
 * Look (Pockett Stage, see docs/STAGE_DESIGN_SYSTEM.md): a dark anodized chassis with neutral
 * rubber pads. Programmed steps glow lime at `soft`, the playhead column is the one `medium`
 * element, hits flash `strong` and decay, and everything locked is a faint blueprint outline.
 *
 * Landscape: one block of 16 columns, a fader at the end of each row.
 * Portrait: two blocks of 8 (steps 1-8 above 9-16) with the mixer strip behind them.
 *
 * Hardening notes: stacked surfaces have real gaps (plus polygonOffset on the flat overlays),
 * additive layers never write depth and draw after the solids, every smoothing is
 * frame-rate independent, nothing is allocated per frame, instance buffers are only
 * re-uploaded for the pads that actually changed, and label positioning only writes
 * transforms (and only when they move).
 */

export interface StageLabels {
  rows: (HTMLElement | null)[];
  mixer: (HTMLElement | null)[];
}

export interface BeatStage extends ThreeApp {
  /** Which unlocked instrument row is under this canvas-pixel position, if any. */
  pick(x: number, y: number): TrackId | null;
  /** Screen distance between two instrument rows, so the HUD can drop sub-labels when they would collide. */
  rowSpacing(): number;
}

// ───────────────────────── HUD sizing shared with the React overlay ─────────────────────────

export type HudMode = "tiny" | "small" | "full";

/** How much HUD fits: tiny = one-line panels, small = title + one console line, full = three console lines. */
export function hudMode(width: number, height: number): HudMode {
  if (height < 360) return "tiny";
  if (height < 520 || width < 440) return "small";
  return "full";
}

/** Pixels from the top of the stage that the HUD panels occupy (the 3D machine is framed below this). */
export function hudTopPx(mode: HudMode): number {
  return mode === "tiny" ? 82 : mode === "small" ? 118 : 148;
}

/** Screen gutter kept clear on the left (the row labels are printed on the chassis, left of the pads). */
export function rowLabelPx(mode: HudMode): number {
  return mode === "full" ? 16 : 10;
}

const HUD_BOTTOM_PX = 48; // Play button + sound chip

// ───────────────────────── dimensions ─────────────────────────

const PAD = 0.9;
const PAD_H = 0.3;
const PAD_LIFT = 0.02; // pads float a hair above the deck: no coplanar faces
const PITCH = 1.1;
const ROW_PITCH = 1.1;
const GROUP_GAP = 0.34;
const BLOCK_GAP = 0.7;
const MIX_D = 2.0;
const MIX_W = 3.0;
const PLINTH_H = 0.55;
const DECK_H = 0.45;
const TOP = PLINTH_H + DECK_H;
/** Chassis margin left of the pads: the row labels live here. */
const LABEL_MARGIN = 2.3;
const LABEL_MARGIN_PORTRAIT = 1.9;
const ORBS = 8;
const ORB_LIFE = 0.55; // bass sparks are hit feedback: gone well inside a beat
const ORB_RISE = 1.1;
const RING_BARS = 72;
const RING_MAX_H = 1.5;
const RING_GAP = 1.2;
const N_PADS = TRACK_IDS.length * STEPS;

/** Linear-space colours from the stage tokens (instance colours and additive layers mix in linear). */
const C = {
  pad: color(NEUTRAL[700]), // unlit rubber pad
  padBeat: color(NEUTRAL[700]).lerp(color(NEUTRAL[600]), 0.45), // first pad of each group of four
  padMuted: color(NEUTRAL[500]), // programmed step on a muted row: neutral, never lime
  padOn: color(ACCENT[800]), // programmed step body: deep lime rubber, the glow on top does the talking
  padAccent: color(ACCENT[700]),
  lit: color(ACCENT[400]), // glow on programmed steps
  hit: color(ACCENT[300]), // flash on hits, playhead
  neutralLight: color(NEUTRAL[100]),
  blueprint: color(ROLE.blueprint),
  ringLo: color(NEUTRAL[600]),
  ringHi: color(ACCENT[700]),
  led: color(ACCENT[300]),
  ledOff: color(NEUTRAL[400]),
  danger: color(SIGNAL.danger),
  black: new THREE.Color(0, 0, 0),
};

interface Layout {
  portrait: boolean;
  cols: number;
  blocks: number;
  w: number;
  d: number;
  x0: number;
  z0: number;
  blockD: number;
  padsW: number;
  /** Portrait: mixer strip behind the pads (z = mixZ). Landscape: one channel at the end of each row (x = mixX). */
  mixZ: number;
  mixX: number;
}

function makeLayout(portrait: boolean): Layout {
  const cols = portrait ? 8 : 16;
  const blocks = portrait ? 2 : 1;
  const padsW = cols * PITCH + (cols / 4 - 1) * GROUP_GAP;
  const blockD = 5 * ROW_PITCH;
  const padsD = blocks * blockD + (blocks - 1) * BLOCK_GAP;
  const left = portrait ? LABEL_MARGIN_PORTRAIT : LABEL_MARGIN;
  const back = portrait ? MIX_D + 0.4 : 0;
  const side = portrait ? 0 : MIX_W + 0.4;
  const w = left + padsW + side + 0.7;
  const d = 0.7 + back + padsD + 0.8;
  const x0 = -w / 2 + left;
  return { portrait, cols, blocks, w, d, x0, z0: -d / 2 + 0.7 + back, blockD, padsW, mixZ: -d / 2 + 0.7 + MIX_D / 2, mixX: x0 + padsW + 0.4 };
}

function padX(L: Layout, step: number): number {
  const col = L.portrait ? step % 8 : step;
  return L.x0 + col * PITCH + Math.floor(col / 4) * GROUP_GAP + PITCH / 2;
}

function blockOf(L: Layout, step: number): number {
  return L.portrait && step >= 8 ? 1 : 0;
}

function rowZ(L: Layout, row: number, block: number): number {
  return L.z0 + block * (L.blockD + BLOCK_GAP) + row * ROW_PITCH + ROW_PITCH / 2;
}

/** Points that must stay on screen: machine box, spectrum ring footprint + height, rising sparks. */
function framePoints(L: Layout): Float32Array {
  const pts: number[] = [];
  const hx = L.w / 2 + 0.45;
  const hz = L.d / 2 + 0.45;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, TOP + 0.4]) pts.push(sx * hx, y, sz * hz);
  const rx = L.w / 2 + RING_GAP + 0.15;
  const rz = L.d / 2 + RING_GAP + 0.15;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(Math.cos(a) * rx, 0, Math.sin(a) * rz, Math.cos(a) * rx, RING_MAX_H, Math.sin(a) * rz);
  }
  const bassZ = rowZ(L, TRACK_IDS.indexOf("bass"), L.blocks - 1);
  const orbTop = TOP + PAD_H + 0.3 + ORB_RISE + 0.3;
  pts.push(L.x0, orbTop, bassZ, L.x0 + L.padsW, orbTop, bassZ, L.x0, orbTop, rowZ(L, TRACK_IDS.indexOf("bass"), 0));
  return new Float32Array(pts);
}

/** Frame-rate independent exponential smoothing factor. */
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

function bandAt(f: number, c: number, w: number, a: number): number {
  const x = (f - c) / w;
  return a * Math.exp(-x * x);
}

export function createBeatStage(ctx: ThreeContext, rt: Runtime, labels: StageLabels): BeatStage {
  const { scene, camera } = ctx;

  // ───── per-frame scratch (no allocations in the loop) ─────
  const m4 = new THREE.Matrix4();
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const glow = new THREE.Color();
  const tmp = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP);
  const hitPoint = new THREE.Vector3();
  const target = new THREE.Vector3(0, TOP * 0.6, 0);
  const ringRadius = new THREE.Vector2(10, 6);
  const aliveFn = (f: string) => rt.isAlive(f);
  let celebScale = 20;
  let rowSpacingPx = 30;
  let dist = 30;
  let elev = 0.85;
  let azim = -0.3;

  // ───── world: the shared stage rig (void background, fog, reflections, key + fill + rim) ─────
  const rig = setupStage(ctx, { shadowExtent: 16, fog: [30, 80], reflections: 0.35 });
  const key = rig.key;
  scene.add(createFloor(ctx, { size: 240, cell: PITCH }));

  // ───── materials ─────
  const additive = (c: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) =>
    new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, ...extra });
  const scaled = (c: THREE.Color, k: number) => c.clone().multiplyScalar(k);
  const ghostLineMat = material.line(ROLE.blueprint, 0.4);
  ghostLineMat.depthWrite = false;
  const ghostFillMat = material.ghost(0.08);
  Object.assign(ghostFillMat, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const ghostShellMat = material.ghost(0.015);
  const plinthMat = material.satin(NEUTRAL[850], { roughness: 0.5, metalness: 0.3 });
  const deckMat = material.satin(NEUTRAL[800], { roughness: 0.38, metalness: 0.45 }); // anodized top plate
  const padMat = material.satin(SIGNAL.white, { roughness: 0.62, metalness: 0 }); // rubber; the colour is per instance
  const glowMat = additive(SIGNAL.white, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const ghostPadMat = additive(SIGNAL.white, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const stripMat = material.glow(ACCENT[400], "faint");
  const playMat = additive(scaled(C.hit, GLOW.medium));
  const bandMat = additive(scaled(C.lit, 0.06), { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const ringMat = material.satin(SIGNAL.white, { roughness: 0.5, metalness: 0.2 }); // colour is per bar
  const celebMat = additive(scaled(C.hit, GLOW.strong), { side: THREE.DoubleSide });
  const slotMat = material.matte(NEUTRAL[950]);
  const faderMat = material.metal(NEUTRAL[200]);
  const knobMat = material.satin(NEUTRAL[700], { roughness: 0.4, metalness: 0.5 });
  const tickMat = new THREE.MeshBasicMaterial({ color: NEUTRAL[100] });
  const orbMats: THREE.MeshBasicMaterial[] = [];

  // ───── machine ─────
  const machine = new THREE.Group();
  scene.add(machine);
  const plinth = new THREE.Mesh(new THREE.BufferGeometry(), plinthMat);
  plinth.castShadow = plinth.receiveShadow = true;
  const deck = new THREE.Mesh(new THREE.BufferGeometry(), deckMat);
  deck.castShadow = deck.receiveShadow = true;
  // blueprint body: just the outline edges of plinth and deck (a full wireframe was far too busy)
  const ghostBody = new THREE.LineSegments(new THREE.BufferGeometry(), ghostLineMat);
  ghostBody.renderOrder = 2;
  // ...plus a barely-there fill so the outline reads as a solid that isn't built yet
  const ghostShell = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostShellMat);
  ghostShell.renderOrder = 1;
  const frontLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), stripMat);
  machine.add(plinth, deck, ghostBody, ghostShell, frontLine);

  const pads = new THREE.InstancedMesh(new RoundedBoxGeometry(PAD, PAD_H, PAD, 2, 0.06), padMat, N_PADS);
  pads.castShadow = true;
  pads.receiveShadow = true;
  const capGeo = new THREE.PlaneGeometry(PAD * 0.78, PAD * 0.78);
  capGeo.rotateX(-Math.PI / 2);
  const caps = new THREE.InstancedMesh(capGeo, glowMat, N_PADS);
  caps.renderOrder = 3;
  // locked pads: a flat outline frame on the deck (clean blueprint look, no triangle diagonals)
  const frameShape = new THREE.Shape();
  const hp = PAD / 2;
  frameShape.moveTo(-hp, -hp).lineTo(hp, -hp).lineTo(hp, hp).lineTo(-hp, hp).lineTo(-hp, -hp);
  const hole = new THREE.Path();
  const inner = hp - 0.05;
  hole.moveTo(-inner, -inner).lineTo(-inner, inner).lineTo(inner, inner).lineTo(inner, -inner).lineTo(-inner, -inner);
  frameShape.holes.push(hole);
  const frameGeo = new THREE.ShapeGeometry(frameShape);
  frameGeo.rotateX(-Math.PI / 2);
  const ghostPads = new THREE.InstancedMesh(frameGeo, ghostPadMat, N_PADS);
  ghostPads.renderOrder = 2;
  for (const im of [pads, caps, ghostPads]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false; // instances move; a cached bounding sphere would cull them wrongly
    for (let i = 0; i < N_PADS; i++) im.setColorAt(i, C.black);
    if (im.instanceColor) im.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }
  machine.add(pads, caps, ghostPads);

  const playhead = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), playMat);
  playhead.renderOrder = 4;
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), bandMat);
  band.renderOrder = 3;
  machine.add(playhead, band);

  // spectrum ring on the floor around the plinth: solid neutral bars, tinted lime only at their peaks
  const barGeo = new THREE.BoxGeometry(0.2, 1, 0.2);
  barGeo.translate(0, 0.5, 0);
  const ring = new THREE.InstancedMesh(barGeo, ringMat, RING_BARS);
  ring.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ring.frustumCulled = false;
  for (let i = 0; i < RING_BARS; i++) ring.setColorAt(i, C.ringLo);
  scene.add(ring);
  const ringLevels = new Float32Array(RING_BARS);

  // bass sparks: one per bass hit, gone within ORB_LIFE
  const orbGeo = new THREE.SphereGeometry(0.13, 20, 14);
  const orbs = Array.from({ length: ORBS }, () => {
    const mat = additive(scaled(C.hit, GLOW.strong));
    orbMats.push(mat);
    const mesh = new THREE.Mesh(orbGeo, mat);
    mesh.visible = false;
    mesh.renderOrder = 5;
    machine.add(mesh);
    return { mesh, mat, life: 0, x: 0, z: 0, active: false };
  });
  let orbNext = 0;
  let lastBassSerial = rt.bassSerial;

  // mixer: neutral metal faders and knobs, one small LED per channel
  const slotGeo = new THREE.BoxGeometry(0.16, 0.04, 1.6);
  const faderGeo = new RoundedBoxGeometry(0.62, 0.24, 0.32, 2, 0.06);
  const knobGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.2, 28);
  const tickGeo = new THREE.BoxGeometry(0.04, 0.03, 0.16);
  tickGeo.translate(0, 0.11, -0.1);
  const ledGeo = new THREE.SphereGeometry(0.08, 14, 10);
  const channels = TRACK_IDS.map(() => {
    const slot = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(slotGeo, slotMat);
    const fader = new THREE.Mesh(faderGeo, faderMat);
    fader.castShadow = true;
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.castShadow = true;
    knob.add(new THREE.Mesh(tickGeo, tickMat));
    const ledMat = material.glow(ACCENT[300], "faint");
    const led = new THREE.Mesh(ledGeo, ledMat);
    machine.add(slot, fader, knob, led);
    return { slot, fader, knob, led, ledMat, vol: 0.75, pan: 0 };
  });

  const celebRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96), celebMat);
  celebRing.rotation.x = -Math.PI / 2;
  celebRing.position.y = 0.05;
  celebRing.renderOrder = 6;
  scene.add(celebRing);

  // ───── per-instance change tracking (upload only what moved) ─────
  const padY = new Float32Array(N_PADS).fill(NaN);
  const padSY = new Float32Array(N_PADS).fill(NaN);
  const padRGB = new Float32Array(N_PADS * 3).fill(NaN);
  const capRGB = new Float32Array(N_PADS * 3).fill(NaN);
  const ghostRGB = new Float32Array(N_PADS * 3).fill(NaN);
  const range = { pm: [Infinity, -1], pc: [Infinity, -1], cm: [Infinity, -1], cc: [Infinity, -1], gc: [Infinity, -1] };
  const touch = (r: number[], i: number) => {
    if (i < r[0]) r[0] = i;
    if (i > r[1]) r[1] = i;
  };
  const flush = (attr: THREE.BufferAttribute | null, r: number[], itemSize: number) => {
    if (!attr || r[1] < 0) return;
    // ranges accumulate until the renderer uploads them (three clears them after each upload)
    attr.addUpdateRange(r[0] * itemSize, (r[1] - r[0] + 1) * itemSize);
    attr.needsUpdate = true;
    r[0] = Infinity;
    r[1] = -1;
  };
  const colorChanged = (store: Float32Array, i: number, c: THREE.Color) => {
    const j = i * 3;
    if (Math.abs(store[j] - c.r) < 0.002 && Math.abs(store[j + 1] - c.g) < 0.002 && Math.abs(store[j + 2] - c.b) < 0.002) return false;
    store[j] = c.r;
    store[j + 1] = c.g;
    store[j + 2] = c.b;
    return true;
  };
  const resetTracking = () => {
    padY.fill(NaN);
    padSY.fill(NaN);
    padRGB.fill(NaN);
    capRGB.fill(NaN);
    ghostRGB.fill(NaN);
  };

  // ───── layout ─────
  let L = makeLayout(false);
  let built = false;

  const rebuild = (portrait: boolean) => {
    if (built && L.portrait === portrait) return;
    built = true;
    L = makeLayout(portrait);
    resetTracking();
    plinth.geometry.dispose();
    plinth.geometry = new RoundedBoxGeometry(L.w + 0.9, PLINTH_H, L.d + 0.9, 3, 0.12);
    plinth.position.y = PLINTH_H / 2;
    deck.geometry.dispose();
    deck.geometry = new RoundedBoxGeometry(L.w, DECK_H, L.d, 3, 0.2);
    deck.position.y = PLINTH_H + DECK_H / 2 - 0.01; // sunk 1cm into the plinth: no shared face
    ghostBody.geometry.dispose();
    const plinthEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(L.w + 0.9, PLINTH_H, L.d + 0.9));
    const deckEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(L.w, DECK_H, L.d));
    const merged: number[] = [];
    const pa = plinthEdges.getAttribute("position");
    for (let i = 0; i < pa.count; i++) merged.push(pa.getX(i), pa.getY(i) + PLINTH_H / 2, pa.getZ(i));
    const da = deckEdges.getAttribute("position");
    for (let i = 0; i < da.count; i++) merged.push(da.getX(i), da.getY(i) + PLINTH_H + DECK_H / 2, da.getZ(i));
    plinthEdges.dispose();
    deckEdges.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(merged, 3));
    ghostBody.geometry = g;
    ghostShell.scale.set(L.w + 0.9, TOP, L.d + 0.9);
    ghostShell.position.y = TOP / 2;
    frontLine.scale.set(L.w - 0.5, 1, 1);
    frontLine.position.set(0, TOP - 0.07, L.d / 2 + 0.05); // stands proud of the deck face

    // ghost frames never move: set them once per layout, just above the deck
    for (let row = 0; row < TRACK_IDS.length; row++) {
      for (let s = 0; s < STEPS; s++) {
        m4.makeTranslation(padX(L, s), TOP + 0.012, rowZ(L, row, blockOf(L, s)));
        ghostPads.setMatrixAt(row * STEPS + s, m4);
      }
    }
    ghostPads.instanceMatrix.addUpdateRange(0, N_PADS * 16);
    ghostPads.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < channels.length; i++) {
      const c = channels[i];
      if (L.portrait) {
        const x = L.x0 + ((i + 0.5) * L.padsW) / 5;
        c.slot.rotation.y = 0;
        c.slot.position.set(x, TOP + 0.022, L.mixZ);
        c.knob.position.set(x + 0.75, TOP + 0.105, L.mixZ - 0.45);
        c.led.position.set(x + 0.75, TOP + 0.085, L.mixZ + 0.4);
        c.fader.rotation.y = 0;
      } else {
        const z = rowZ(L, i, 0);
        c.slot.rotation.y = Math.PI / 2;
        c.slot.position.set(L.mixX + 1.25, TOP + 0.022, z);
        c.knob.position.set(L.mixX + 2.6, TOP + 0.105, z);
        c.led.position.set(L.mixX + 0.15, TOP + 0.085, z);
        c.fader.rotation.y = Math.PI / 2;
      }
    }

    // fit the shared key light's shadow to this layout
    const span = Math.max(L.w, L.d);
    key.position.set(-span * 0.35, span * 0.9 + 6, span * 0.55 + 4);
    const cam = key.shadow.camera;
    cam.left = -span * 0.75;
    cam.right = span * 0.75;
    cam.top = span * 0.75;
    cam.bottom = -span * 0.75;
    cam.near = 1;
    cam.far = span * 3 + 20;
    cam.updateProjectionMatrix();
    key.shadow.normalBias = 0.03;
    ringRadius.set(L.w / 2 + RING_GAP, L.d / 2 + RING_GAP);
    celebScale = (Math.max(L.w, L.d) * 0.62 + 2) * 1.6;
    ringLevels.fill(0);
  };

  // ───── camera framing ─────
  const placeCamera = (d: number, az: number) => {
    camera.position.set(target.x + d * Math.cos(elev) * Math.sin(az), target.y + d * Math.sin(elev), target.z + d * Math.cos(elev) * Math.cos(az));
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };

  const fit = (width: number, height: number) => {
    camera.clearViewOffset();
    const mode = hudMode(width, height);
    // free screen area in NDC: below the HUD panels, above the Play button, inside the left gutter
    const yTop = 1 - (2 * hudTopPx(mode)) / height;
    const yBot = -1 + (2 * HUD_BOTTOM_PX) / height;
    const xL = -1 + (2 * rowLabelPx(mode)) / width;

    const solve = (portrait: boolean) => {
      const lay = makeLayout(portrait);
      const pts = framePoints(lay);
      const xR = 1 - (2 * (portrait ? 10 : 34)) / width; // landscape: volume tags right of each fader
      // tall stages look down more steeply so the 8+8 grid uses the height
      elev = portrait ? (height > width * 1.6 ? 1.3 : 1.12) : 0.7;
      azim = portrait ? -0.12 : -0.28;
      let minX = 0;
      let maxX = 0;
      let minY = 0;
      let maxY = 0;
      const measure = (d: number) => {
        placeCamera(d, azim);
        minX = minY = Infinity;
        maxX = maxY = -Infinity;
        for (let i = 0; i < pts.length; i += 3) {
          tmp.set(pts[i], pts[i + 1], pts[i + 2]).project(camera);
          if (tmp.x < minX) minX = tmp.x;
          if (tmp.x > maxX) maxX = tmp.x;
          if (tmp.y < minY) minY = tmp.y;
          if (tmp.y > maxY) maxY = tmp.y;
        }
      };
      let lo = 6;
      let hi = 600;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        measure(mid);
        // 4% slack so the slow camera drift never pushes anything out of frame
        if (maxX - minX <= (xR - xL) * 0.96 && maxY - minY <= (yTop - yBot) * 0.96) hi = mid;
        else lo = mid;
      }
      measure(hi);
      return {
        portrait,
        d: hi,
        offX: ((minX + maxX) / 2 - (xL + xR) / 2) * (width / 2),
        offY: ((yTop + yBot) / 2 - (minY + maxY) / 2) * (height / 2),
      };
    };
    // whichever layout shows the pads bigger; prefer the classic 16-wide row when it is close
    const wide = solve(false);
    const tall = solve(true);
    const best = wide.d <= tall.d * 1.12 ? wide : tall;
    solve(best.portrait); // leaves elev / azim set for the chosen layout
    rebuild(best.portrait);
    dist = best.d;
    // tightest depth range that holds the whole scene: better depth precision, no flicker
    const radius = Math.hypot(L.w / 2 + RING_GAP + 1, L.d / 2 + RING_GAP + 1, 6);
    camera.near = Math.max(1, dist - radius - 2);
    camera.far = dist * 2.8 + radius;
    camera.setViewOffset(width, height, best.offX, best.offY, width, height); // also updates the projection
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = dist * 0.9;
      scene.fog.far = dist * 2.6;
    }
    placeCamera(dist, azim);
  };

  // ───── HTML labels: write transforms only, and only when they moved ─────
  const lastLabel = new Float32Array(16 * 3).fill(NaN);
  const place = (slot: number, el: HTMLElement | null, x: number, y: number, z: number, opacity: number, anchor: string) => {
    if (!el) return;
    const j = slot * 3;
    tmp.set(x, y, z).project(camera);
    const o = tmp.z > 1 || opacity <= 0.01 ? 0 : Math.round(opacity * 20) / 20;
    if (o !== lastLabel[j + 2]) {
      el.style.opacity = String(o);
      lastLabel[j + 2] = o;
    }
    if (o === 0) return;
    const px = Math.round((tmp.x * 0.5 + 0.5) * ctx.size.width * 2) / 2;
    const py = Math.round((-tmp.y * 0.5 + 0.5) * ctx.size.height * 2) / 2;
    if (px === lastLabel[j] && py === lastLabel[j + 1]) return;
    lastLabel[j] = px;
    lastLabel[j + 1] = py;
    el.style.transform = `translate3d(${px}px,${py}px,0) ${anchor}`;
  };

  // ───── frame ─────
  const frame = (dt: number, time: number) => {
    rt.update(dt);
    const model = rt.model;
    const powered = !!rt.props.program && rt.isAlive("power");
    const playing = rt.playing && rt.step >= 0 && powered;
    const showSection = playing && rt.isAlive("arranger");
    const focus = rt.props.focus && !rt.isAlive(rt.props.focus) ? rt.props.focus : null;
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);

    // gentle drift: a function of time, so it is identical at 60, 120 or 144 Hz
    placeCamera(dist, azim + Math.sin(time * 0.13) * 0.045);

    plinth.visible = deck.visible = frontLine.visible = powered;
    ghostBody.visible = ghostShell.visible = !powered;
    // power strip: steady and quiet, with a small tick on each beat
    stripMat.emissiveIntensity = GLOW.faint + rt.beat * (GLOW.soft - GLOW.faint);
    ghostLineMat.opacity = 0.4 + (focus === "power" ? 0.35 * pulse : 0);
    // crash and celebration add a short bloom boost that decays with them
    applyBloom(ctx, { blueprint: !powered, boost: rt.crashFlash * 0.6 + rt.celebrate });

    // ── pads ──
    for (let row = 0; row < TRACK_IDS.length; row++) {
      const id = TRACK_IDS[row];
      const on = powered && trackAlive(id, aliveFn);
      const muted = on && !!model && model.mix[id].mute;
      const focused = !on && (focus === id || (focus === "snare" && id === "clap"));
      const flashes = rt.flash[id];
      for (let s = 0; s < STEPS; s++) {
        const i = row * STEPS + s;
        const x = padX(L, s);
        const z = rowZ(L, row, blockOf(L, s));

        // ghost frame (locked) — black is invisible with additive blending
        if (on) col.copy(C.black);
        else col.copy(C.blueprint).multiplyScalar(focused ? 0.18 + 0.32 * pulse : powered ? 0.14 : 0.24);
        if (colorChanged(ghostRGB, i, col)) {
          ghostPads.setColorAt(i, col);
          touch(range.gc, i);
        }

        if (!on) {
          if (padSY[i] !== 0) {
            padSY[i] = 0;
            padY[i] = NaN;
            m4.makeScale(0, 0, 0);
            pads.setMatrixAt(i, m4);
            caps.setMatrixAt(i, m4);
            touch(range.pm, i);
            touch(range.cm, i);
          }
          continue;
        }

        const raw = id === "bass" ? ((model?.notes[s] ?? 0) > 0 ? 1 : 0) : (model?.patterns[id as PatternId][s] ?? 0);
        const level = showSection ? sectionLevel(rt.section, id, s, raw) : raw;
        const fl = muted ? 0 : flashes[s];
        const isNow = playing && rt.step === s;

        // pressed pad: shorter and lower, top face tracked exactly by the glow cap
        const sy = 1 - fl * 0.35;
        const y = TOP + PAD_LIFT + (PAD_H * sy) / 2;
        if (!(Math.abs(y - padY[i]) <= 1e-4 && Math.abs(sy - padSY[i]) <= 1e-4)) { // NaN (never set) counts as changed
          padY[i] = y;
          padSY[i] = sy;
          m4.makeScale(1, sy, 1).setPosition(x, y, z);
          pads.setMatrixAt(i, m4);
          m4.makeTranslation(x, TOP + PAD_LIFT + PAD_H * sy + 0.012, z);
          caps.setMatrixAt(i, m4);
          touch(range.pm, i);
          touch(range.cm, i);
        }

        // body: neutral rubber; programmed steps take the deep lime (velocity sets how much)
        if (level <= 0) col.copy(s % 4 === 0 ? C.padBeat : C.pad);
        else if (muted) col.copy(C.padMuted);
        else col.copy(C.pad).lerp(C.padOn, clamp(0.45 + level * 0.45, 0, 0.9)).lerp(C.padAccent, clamp((level - 1.2) / 0.8, 0, 1) * 0.6);
        if (colorChanged(padRGB, i, col)) {
          pads.setColorAt(i, col);
          touch(range.pc, i);
        }

        // glow: soft when programmed (faint for ghost notes), medium under the playhead, strong on a hit
        let k = 0;
        if (level > 0 && !muted) {
          k = isNow ? GLOW.medium : GLOW.faint + (GLOW.soft - GLOW.faint) * clamp((level - 0.25) / 0.75, 0, 1);
          glow.copy(C.lit);
          if (fl > 0) {
            k += (GLOW.strong - k) * fl;
            glow.lerp(C.hit, fl);
          }
        } else if (isNow) {
          k = GLOW.faint * 0.5; // empty pads in the playhead column: a neutral lift, not lime
          glow.copy(C.neutralLight);
        }
        glow.multiplyScalar(k);
        if (colorChanged(capRGB, i, glow)) {
          caps.setColorAt(i, glow);
          touch(range.cc, i);
        }
      }
    }
    flush(pads.instanceMatrix, range.pm, 16);
    flush(caps.instanceMatrix, range.cm, 16);
    flush(pads.instanceColor, range.pc, 3);
    flush(caps.instanceColor, range.cc, 3);
    flush(ghostPads.instanceColor, range.gc, 3);

    // ── playhead: position comes from the audio clock (step + phase), so it glides at any frame rate ──
    playhead.visible = band.visible = playing;
    if (playing) {
      const s = rt.step;
      const next = (s + 1) % STEPS;
      const b = blockOf(L, s);
      let x = padX(L, s);
      if (blockOf(L, next) === b && next > s) x += (padX(L, next) - x) * rt.stepPhase();
      const zc = L.z0 + b * (L.blockD + BLOCK_GAP) + L.blockD / 2;
      playhead.position.set(x + PITCH * 0.5, TOP + PAD_LIFT + PAD_H + 0.08, zc);
      playhead.scale.set(0.07, 0.05, L.blockD + 0.3);
      band.position.set(padX(L, s), TOP + 0.008, zc);
      band.scale.set(PITCH * 0.98, 1, L.blockD + 0.2);
    }

    // ── spectrum ring ──
    ring.visible = powered;
    if (powered) {
      const live = rt.readSpectrum();
      const e = rt.energy;
      const half = RING_BARS / 2;
      const up = ease(38, dt);
      const down = ease(7, dt);
      for (let i = 0; i < RING_BARS; i++) {
        const f = i < half ? i / half : (RING_BARS - i) / half; // mirrored so the ring is symmetric
        let v: number;
        if (live) {
          const bin = Math.min(100, Math.floor(Math.pow(f, 1.6) * 90));
          v = Math.pow((rt.spectrum[bin] ?? 0) / 255, 1.3);
        } else {
          v = bandAt(f, 0.08, 0.12, e.kick) + bandAt(f, 0.18, 0.1, e.bass * 0.9) + bandAt(f, 0.45, 0.14, e.snare) + bandAt(f, 0.58, 0.14, e.clap * 0.9) + bandAt(f, 0.86, 0.2, e.hats * 0.8);
          v = clamp(v * (0.8 + 0.2 * Math.sin(time * 13 + i * 1.7)) + 0.04 + 0.03 * Math.sin(time * 1.7 + i * 0.5), 0, 1);
        }
        const prev = ringLevels[i];
        const cur = prev + (v - prev) * (v > prev ? up : down);
        ringLevels[i] = cur;
        const a = (i / RING_BARS) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * ringRadius.x, 0.012, Math.sin(a) * ringRadius.y);
        dummy.rotation.set(0, -a, 0);
        dummy.scale.set(1, 0.05 + cur * (RING_MAX_H - 0.05), 1);
        dummy.updateMatrix();
        ring.setMatrixAt(i, dummy.matrix);
        ring.setColorAt(i, col.copy(C.ringLo).lerp(C.ringHi, clamp((cur - 0.45) / 0.55, 0, 1) * 0.6)); // neutral metal, lime only near peaks
      }
      ring.instanceMatrix.needsUpdate = true;
      if (ring.instanceColor) ring.instanceColor.needsUpdate = true;
    }

    // ── bass sparks (the note name + Hz lives in the BASS row label, so no floating tags to collide) ──
    if (rt.bassSerial !== lastBassSerial) {
      lastBassSerial = rt.bassSerial;
      if (powered && rt.isAlive("bass")) {
        const o = orbs[orbNext];
        orbNext = (orbNext + 1) % ORBS;
        o.active = true;
        o.life = 0;
        o.x = padX(L, rt.bassStep);
        o.z = rowZ(L, TRACK_IDS.indexOf("bass"), blockOf(L, rt.bassStep));
      }
    }
    for (let i = 0; i < ORBS; i++) {
      const o = orbs[i];
      if (!o.active) continue;
      o.life += dt;
      const k = o.life / ORB_LIFE;
      if (k >= 1 || !powered) {
        o.active = false;
        o.mesh.visible = false;
        continue;
      }
      o.mesh.visible = true;
      o.mesh.position.set(o.x, TOP + PAD_H + 0.3 + (1 - (1 - k) * (1 - k)) * ORB_RISE, o.z);
      o.mesh.scale.setScalar(1 + k * 0.5);
      o.mat.opacity = (1 - k) * (1 - k);
    }

    // ── mixer ──
    const mixerOn = powered && rt.isAlive("mixer");
    const mixEase = ease(8, dt);
    // landscape volume tags sit one per row at the far end: only when the rows there are far enough apart
    tmp.set(L.mixX + 3, TOP, rowZ(L, 0, 0)).project(camera);
    const ty = tmp.y;
    tmp.set(L.mixX + 3, TOP, rowZ(L, 1, 0)).project(camera);
    const tagsOk = L.portrait || Math.abs(tmp.y - ty) * 0.5 * ctx.size.height >= 18; // tags are 16px pills
    for (let i = 0; i < channels.length; i++) {
      const c = channels[i];
      const id = TRACK_IDS[i];
      const mix = model?.mix[id];
      c.vol += ((mixerOn && mix ? mix.volume : 0.75) - c.vol) * mixEase;
      c.pan += ((mixerOn && mix ? mix.pan : 0) - c.pan) * mixEase;
      // locked: only a translucent slot remains (no busy wireframe faders)
      c.slot.material = mixerOn ? slotMat : ghostFillMat;
      c.fader.visible = c.knob.visible = c.led.visible = mixerOn;
      if (L.portrait) c.fader.position.set(c.slot.position.x, TOP + 0.135, L.mixZ + 0.7 - c.vol * 1.4);
      else c.fader.position.set(L.mixX + 0.55 + c.vol * 1.4, TOP + 0.135, c.slot.position.z);
      c.knob.rotation.y = -c.pan * 2.3;
      if (mixerOn && mix && model) {
        // channel LED: a lime meter on hits, neutral when muted, red when the row's code is broken
        const broken = model.rawLen[id] < 0 || (id === "bass" && model.hzBad);
        const led = broken ? C.danger : mix.mute ? C.ledOff : C.led;
        c.ledMat.emissive.copy(led);
        c.ledMat.color.copy(led).multiplyScalar(0.35);
        c.ledMat.emissiveIntensity = broken ? GLOW.soft : mix.mute ? GLOW.faint : GLOW.faint + rt.energy[id] * (GLOW.strong - GLOW.faint);
      }
      if (L.portrait) place(5 + i, labels.mixer[i], c.slot.position.x, TOP + 0.1, L.mixZ - 0.95, mixerOn ? 1 : 0, "translate(-50%,-100%)");
      else place(5 + i, labels.mixer[i], L.mixX + 3.0, TOP + 0.1, c.slot.position.z, mixerOn && tagsOk ? 1 : 0, "translate(0,-50%)");
    }
    if (!mixerOn) ghostFillMat.opacity = focus === "mixer" ? 0.08 + 0.2 * pulse : 0.08;

    // ── row labels: on the chassis margin, right-aligned just short of the first pad column ──
    tmp.set(L.x0, TOP, rowZ(L, 0, 0)).project(camera);
    const y0 = tmp.y;
    tmp.set(L.x0, TOP, rowZ(L, 1, 0)).project(camera);
    rowSpacingPx = Math.abs(tmp.y - y0) * 0.5 * ctx.size.height;
    for (let row = 0; row < TRACK_IDS.length; row++) {
      place(row, labels.rows[row], L.x0 - 0.15, TOP, rowZ(L, row, 0), rowSpacingPx >= 11 ? 1 : 0, "translate(-100%,-50%)");
    }

    // ── celebration: one expanding ring, fading out with the runtime's decay ──
    celebRing.visible = rt.celebrate > 0;
    if (rt.celebrate > 0) {
      celebRing.scale.setScalar(2 + (1 - rt.celebrate) * celebScale);
      celebMat.opacity = rt.celebrate * rt.celebrate;
    }
  };

  return {
    frame,
    resize: (w, h) => fit(w, h),
    rowSpacing: () => rowSpacingPx,
    pick(x, y) {
      ndc.set((x / ctx.size.width) * 2 - 1, -(y / ctx.size.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
      // the label margin counts too: tapping a row's name auditions it
      if (hitPoint.x < L.x0 - (L.portrait ? LABEL_MARGIN_PORTRAIT : LABEL_MARGIN) || hitPoint.x > L.x0 + L.padsW) return null;
      for (let b = 0; b < L.blocks; b++) {
        const z0 = L.z0 + b * (L.blockD + BLOCK_GAP);
        const row = Math.floor((hitPoint.z - z0) / ROW_PITCH);
        if (row >= 0 && row < TRACK_IDS.length) {
          const id = TRACK_IDS[row];
          return trackAlive(id, aliveFn) ? id : null;
        }
      }
      return null;
    },
    dispose() {
      rig.dispose();
      for (const m of [ghostLineMat, ghostFillMat, ghostShellMat, plinthMat, deckMat, padMat, glowMat, ghostPadMat, stripMat, playMat, bandMat, ringMat, celebMat, slotMat, faderMat, knobMat, tickMat, ...orbMats]) m.dispose();
      for (const c of channels) c.ledMat.dispose();
    },
  };
}

export function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${hz < 100 ? hz.toFixed(1) : Math.round(hz)} Hz`;
}
