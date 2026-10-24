import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BRAND, BRAND_LIGHT, type ThreeApp, type ThreeContext } from "@/engine/three-kit";
import { STEPS, TRACK_IDS, clamp, midiName, sectionLevel, type TrackId } from "./sequencer";
import { trackAlive, type PatternId, type Runtime } from "./runtime";

/**
 * Beat Lab in 3D: a drum machine on a plinth. Rows of rounded pads (one InstancedMesh)
 * press down and glow on hits, a playhead sweeps across, a spectrum ring breathes around
 * the machine, bass notes rise as glowing orbs, and the mixer is a strip of real faders.
 * All text is HTML: the stage only positions the label elements it is handed.
 *
 * Landscape: one block of 16 columns. Portrait: two blocks of 8 (steps 1-8 above 9-16).
 */

export interface StageLabels {
  rows: (HTMLElement | null)[];
  mixer: (HTMLElement | null)[];
  orbs: (HTMLElement | null)[];
}

export interface BeatStage extends ThreeApp {
  /** Which unlocked instrument row is under this canvas-pixel position, if any. */
  pick(x: number, y: number): TrackId | null;
  /** Screen distance between two instrument rows, so the HUD can drop sub-labels when they would collide. */
  rowSpacing(): number;
}

const PAD = 0.9;
const PAD_H = 0.3;
const PITCH = 1.1;
const ROW_PITCH = 1.1;
const GROUP_GAP = 0.34;
const BLOCK_GAP = 0.7;
const MIX_D = 2.0;
const MIX_W = 3.0;
const PLINTH_H = 0.55;
const DECK_H = 0.45;
const TOP = PLINTH_H + DECK_H;
const ORBS = 8;
const RING_BARS = 72;
const N_PADS = TRACK_IDS.length * STEPS;

const DEEP = new THREE.Color("#6440f0");
const DANGER = new THREE.Color("#f87171");
const PAD_OFF = new THREE.Color("#22222c");
const PAD_OFF_BEAT = new THREE.Color("#2b2b38");

/** Each instrument is a different shade of the one violet. */
const ROW_COLOR: Record<TrackId, THREE.Color> = {
  kick: BRAND.clone(),
  snare: BRAND.clone().lerp(BRAND_LIGHT, 0.45),
  clap: BRAND_LIGHT.clone(),
  hats: new THREE.Color("#a7a2c9"),
  bass: DEEP.clone(),
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
  const left = 0.7;
  const back = portrait ? MIX_D + 0.4 : 0;
  const side = portrait ? 0 : MIX_W + 0.4;
  const w = left + padsW + side + 0.7;
  const d = 0.7 + back + padsD + 0.8;
  const x0 = -w / 2 + left;
  return {
    portrait,
    cols,
    blocks,
    w,
    d,
    x0,
    z0: -d / 2 + 0.7 + back,
    blockD,
    padsW,
    mixZ: -d / 2 + 0.7 + MIX_D / 2,
    mixX: x0 + padsW + 0.4,
  };
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

export function createBeatStage(ctx: ThreeContext, rt: Runtime, labels: StageLabels): BeatStage {
  const { scene, camera, renderer } = ctx;

  // ───── per-frame scratch (no allocations in the loop) ─────
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  const glow = new THREE.Color();
  const tmp = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP);
  const hitPoint = new THREE.Vector3();
  const ringRadius = new THREE.Vector2(10, 6);
  let celebScale = 20;
  const aliveFn = (f: string) => rt.isAlive(f);
  let rowSpacingPx = 30;

  // ───── world ─────
  scene.background = new THREE.Color("#07070c");
  scene.fog = new THREE.Fog("#07070c", 30, 80);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;

  const hemi = new THREE.HemisphereLight("#cfc8ff", "#08080d", 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#ffffff", 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.PointLight(BRAND, 0, 0, 0);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ color: "#0a0a10", roughness: 0.92, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const grid = new THREE.GridHelper(120, 120, BRAND, BRAND);
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.1;
  gridMat.depthWrite = false;
  grid.position.y = 0.002;
  scene.add(grid);

  // ───── materials ─────
  const ghostMat = new THREE.MeshBasicMaterial({ color: BRAND, wireframe: true, transparent: true, opacity: 0.5, depthWrite: false });
  const plinthMat = new THREE.MeshPhysicalMaterial({ color: "#101017", roughness: 0.5, metalness: 0.25, clearcoat: 0.5, clearcoatRoughness: 0.4 });
  const deckMat = new THREE.MeshPhysicalMaterial({ color: "#17171f", roughness: 0.32, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.18 });
  const padMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.36, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const glowMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ghostPadMat = new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const lineMat = new THREE.MeshBasicMaterial({ color: BRAND_LIGHT.clone().multiplyScalar(1.6), toneMapped: false });
  const playMat = new THREE.MeshBasicMaterial({ color: BRAND_LIGHT.clone().multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const bandMat = new THREE.MeshBasicMaterial({ color: BRAND.clone().multiplyScalar(0.22), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const celebMat = new THREE.MeshBasicMaterial({ color: BRAND_LIGHT.clone().multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const slotMat = new THREE.MeshStandardMaterial({ color: "#050508", roughness: 0.8 });
  const faderMat = new THREE.MeshPhysicalMaterial({ color: "#d9d6e8", roughness: 0.3, metalness: 0.6, clearcoat: 1 });
  const knobMat = new THREE.MeshPhysicalMaterial({ color: "#1d1d27", roughness: 0.4, metalness: 0.5, clearcoat: 0.8 });
  const tickMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });

  // ───── machine ─────
  const machine = new THREE.Group();
  scene.add(machine);
  const plinth = new THREE.Mesh(new THREE.BufferGeometry(), plinthMat);
  plinth.castShadow = plinth.receiveShadow = true;
  const deck = new THREE.Mesh(new THREE.BufferGeometry(), deckMat);
  deck.castShadow = deck.receiveShadow = true;
  const ghostBody = new THREE.Mesh(new THREE.BufferGeometry(), ghostMat);
  const frontLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), lineMat);
  machine.add(plinth, deck, ghostBody, frontLine);

  const padGeo = new RoundedBoxGeometry(PAD, PAD_H, PAD, 2, 0.09);
  const pads = new THREE.InstancedMesh(padGeo, padMat, N_PADS);
  pads.castShadow = true;
  pads.receiveShadow = true;
  pads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const capGeo = new THREE.PlaneGeometry(PAD * 0.8, PAD * 0.8);
  capGeo.rotateX(-Math.PI / 2);
  const caps = new THREE.InstancedMesh(capGeo, glowMat, N_PADS);
  caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const ghostPads = new THREE.InstancedMesh(new THREE.BoxGeometry(PAD, PAD_H, PAD), ghostPadMat, N_PADS);
  // instance matrices change every frame, so the cached bounding spheres would cull them wrongly
  pads.frustumCulled = caps.frustumCulled = ghostPads.frustumCulled = false;
  machine.add(pads, caps, ghostPads);

  const playhead = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), playMat);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bandMat);
  machine.add(playhead, band);

  // spectrum ring on the floor around the plinth
  const barGeo = new THREE.BoxGeometry(0.2, 1, 0.2);
  barGeo.translate(0, 0.5, 0);
  const ring = new THREE.InstancedMesh(barGeo, ringMat, RING_BARS);
  ring.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ring.frustumCulled = false;
  scene.add(ring);
  const ringLevels = new Float32Array(RING_BARS);

  // bass orbs
  const orbGeo = new THREE.SphereGeometry(0.2, 20, 14);
  const orbs = Array.from({ length: ORBS }, () => {
    const mat = new THREE.MeshBasicMaterial({ color: BRAND_LIGHT.clone().multiplyScalar(2.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(orbGeo, mat);
    mesh.visible = false;
    machine.add(mesh);
    return { mesh, mat, life: 0, x: 0, z: 0, active: false };
  });
  let orbNext = 0;
  let lastBassSerial = rt.bassSerial;

  // mixer strip
  const slotGeo = new THREE.BoxGeometry(0.16, 0.04, 1.6);
  const faderGeo = new RoundedBoxGeometry(0.62, 0.24, 0.32, 2, 0.06);
  const knobGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.2, 28);
  const tickGeo = new THREE.BoxGeometry(0.04, 0.03, 0.16);
  tickGeo.translate(0, 0.11, -0.1);
  const ledGeo = new THREE.SphereGeometry(0.08, 14, 10);
  const channels = TRACK_IDS.map(() => {
    const slot = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(slotGeo, slotMat);
    const fader = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(faderGeo, faderMat);
    fader.castShadow = true;
    const knob = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(knobGeo, knobMat);
    knob.castShadow = true;
    const tick = new THREE.Mesh(tickGeo, tickMat);
    knob.add(tick);
    const ledMat = new THREE.MeshBasicMaterial({ color: BRAND.clone().multiplyScalar(1.5), toneMapped: false });
    const led = new THREE.Mesh(ledGeo, ledMat);
    machine.add(slot, fader, knob, led);
    return { slot, fader, knob, tick, led, ledMat, vol: 1, pan: 0 };
  });

  const celebRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 96), celebMat);
  celebRing.rotation.x = -Math.PI / 2;
  celebRing.position.y = 0.03;
  scene.add(celebRing);

  // ───── layout ─────
  let L = makeLayout(false);
  let built = false;

  const rebuild = (portrait: boolean) => {
    elev = portrait ? 1.12 : 0.7;
    azim = portrait ? -0.12 : -0.28;
    if (built && L.portrait === portrait) return;
    built = true;
    L = makeLayout(portrait);
    plinth.geometry.dispose();
    plinth.geometry = new RoundedBoxGeometry(L.w + 0.9, PLINTH_H, L.d + 0.9, 3, 0.12);
    plinth.position.y = PLINTH_H / 2;
    deck.geometry.dispose();
    deck.geometry = new RoundedBoxGeometry(L.w, DECK_H, L.d, 3, 0.2);
    deck.position.y = PLINTH_H + DECK_H / 2;
    ghostBody.geometry.dispose();
    ghostBody.geometry = new THREE.BoxGeometry(L.w, TOP, L.d, Math.round(L.w / 1.5), 2, Math.round(L.d / 1.5));
    ghostBody.position.y = TOP / 2;
    frontLine.scale.set(L.w - 0.5, 1, 1);
    frontLine.position.set(0, TOP - 0.06, L.d / 2 + 0.01);

    // ghost pads never move: set them once per layout
    TRACK_IDS.forEach((_, row) => {
      for (let s = 0; s < STEPS; s++) {
        dummy.position.set(padX(L, s), TOP + PAD_H / 2, rowZ(L, row, blockOf(L, s)));
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        ghostPads.setMatrixAt(row * STEPS + s, dummy.matrix);
      }
    });
    ghostPads.instanceMatrix.needsUpdate = true;

    TRACK_IDS.forEach((_, i) => {
      const c = channels[i];
      const x = L.x0 + ((i + 0.5) * L.padsW) / 5;
      if (L.portrait) {
        c.slot.rotation.y = 0;
        c.slot.position.set(x, TOP + 0.02, L.mixZ);
        c.knob.position.set(x + 0.75, TOP + 0.1, L.mixZ - 0.45);
        c.led.position.set(x + 0.75, TOP + 0.08, L.mixZ + 0.4);
      } else {
        const z = rowZ(L, i, 0);
        c.slot.rotation.y = Math.PI / 2;
        c.slot.position.set(L.mixX + 1.25, TOP + 0.02, z);
        c.knob.position.set(L.mixX + 2.6, TOP + 0.1, z);
        c.led.position.set(L.mixX + 0.15, TOP + 0.08, z);
      }
    });

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
    rim.position.set(0, 5, -L.d / 2 - 5);
  };

  // ───── camera framing ─────
  const target = new THREE.Vector3(0, TOP * 0.6, 0);
  let dist = 30;
  let elev = 0.85;
  let azim = -0.3;
  const corner = new THREE.Vector3();

  const placeCamera = (d: number, az: number) => {
    camera.position.set(target.x + d * Math.cos(elev) * Math.sin(az), target.y + d * Math.sin(elev), target.z + d * Math.cos(elev) * Math.cos(az));
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };

  const fit = (width: number, height: number) => {
    camera.clearViewOffset();
    const measure = (lay: Layout, d: number) => {
      placeCamera(d, azim);
      const hx = lay.w / 2 + 0.6;
      const hxLeft = lay.w / 2 + 2.2; // room for the HTML row labels
      const hz = lay.d / 2 + 0.6;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          for (const y of [0, TOP + 0.5]) {
            corner.set(sx < 0 ? -hxLeft : hx, y, sz * hz).project(camera);
            minX = Math.min(minX, corner.x);
            maxX = Math.max(maxX, corner.x);
            minY = Math.min(minY, corner.y);
            maxY = Math.max(maxY, corner.y);
          }
      return { minX, maxX, minY, maxY };
    };
    // Frame one layout: the closest camera distance that keeps the machine inside the free area.
    const solve = (portrait: boolean) => {
      const lay = makeLayout(portrait);
      elev = portrait ? 1.12 : 0.7;
      azim = portrait ? -0.12 : -0.28;
      // the glass HUD panels may overlap the back of the machine a little; keep the Play button clear
      const topPx = 44 + (portrait ? Math.min(70, height * 0.12) : height < 380 ? 18 : 40);
      const yTop = 1 - (2 * topPx) / height;
      const yBot = -1 + (2 * 46) / height;
      let lo = 4;
      let hi = 400;
      for (let i = 0; i < 28; i++) {
        const mid = (lo + hi) / 2;
        const m = measure(lay, mid);
        if (m.maxX - m.minX <= 1.9 && m.maxY - m.minY <= (yTop - yBot) * 0.97) hi = mid;
        else lo = mid;
      }
      const m = measure(lay, hi);
      return { portrait, d: hi, offX: ((m.minX + m.maxX) / 2) * (width / 2), offY: ((yTop + yBot) / 2 - (m.minY + m.maxY) / 2) * (height / 2) };
    };
    // Pick whichever layout shows the pads bigger; prefer the classic 16-wide row when it is close.
    const wide = solve(false);
    const tall = solve(true);
    const best = wide.d <= tall.d * 1.12 ? wide : tall;
    if (best === wide) solve(false);
    rebuild(best.portrait);
    dist = best.d;
    camera.setViewOffset(width, height, best.offX, best.offY, width, height);
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = dist * 0.9;
      scene.fog.far = dist * 2.6;
    }
    const r = Math.max(L.w, L.d) * 0.62 + 2;
    for (let i = 0; i < RING_BARS; i++) ringLevels[i] = 0;
    ringRadius.set(L.w / 2 + 1.6, L.d / 2 + 1.6);
    celebScale = r * 1.6;
  };


  const place = (el: HTMLElement | null, x: number, y: number, z: number, opacity: number, anchor: string) => {
    if (!el) return;
    tmp.set(x, y, z).project(camera);
    if (tmp.z > 1 || opacity <= 0.01) {
      el.style.opacity = "0";
      return;
    }
    const px = (tmp.x * 0.5 + 0.5) * ctx.size.width;
    const py = (-tmp.y * 0.5 + 0.5) * ctx.size.height;
    el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) ${anchor}`;
    el.style.opacity = opacity.toFixed(2);
  };

  const frame = (dt: number, time: number) => {
    rt.update(dt);
    const model = rt.model;
    const powered = !!rt.props.program && rt.isAlive("power");
    const playing = rt.playing && rt.step >= 0 && powered;
    const arranger = rt.isAlive("arranger");
    const focus = rt.props.focus && !rt.isAlive(rt.props.focus) ? rt.props.focus : null;
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);

    // gentle camera drift
    placeCamera(dist, azim + Math.sin(time * 0.13) * 0.05);

    // blueprint vs. built
    plinth.visible = deck.visible = powered;
    ghostBody.visible = !powered;
    frontLine.visible = powered;
    lineMat.color.copy(BRAND_LIGHT).multiplyScalar(0.8 + rt.beat * 1.6);
    gridMat.opacity = powered ? 0.07 : 0.22;
    ghostMat.opacity = 0.35 + (focus === "power" ? 0.35 * pulse : 0);

    rim.intensity = powered ? 0.25 + rt.beat * 0.5 + rt.crashFlash * 1.2 : 0;
    ctx.bloom.strength = 0.5 + rt.crashFlash * 0.4 + rt.celebrate * 0.6;

    // ── pads ──
    const showSection = playing && arranger;
    TRACK_IDS.forEach((id, row) => {
      const on = powered && trackAlive(id, aliveFn);
      const mix = model?.mix[id];
      const muted = on && !!mix?.mute;
      const base = ROW_COLOR[id];
      const focused = !on && (focus === id || (focus === "snare" && id === "clap"));
      for (let s = 0; s < STEPS; s++) {
        const i = row * STEPS + s;
        const x = padX(L, s);
        const z = rowZ(L, row, blockOf(L, s));
        if (!on) {
          dummy.position.set(x, -50, z);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          pads.setMatrixAt(i, dummy.matrix);
          caps.setMatrixAt(i, dummy.matrix);
          ghostPads.setColorAt(i, col.copy(BRAND).multiplyScalar(focused ? 0.45 + 0.55 * pulse : powered ? 0.32 : 0.45));
          continue;
        }
        ghostPads.setColorAt(i, col.setRGB(0, 0, 0));
        const raw = id === "bass" ? ((model?.notes[s] ?? 0) > 0 ? 1 : 0) : (model?.patterns[id as PatternId][s] ?? 0);
        const level = showSection ? sectionLevel(rt.section, id, s, raw) : raw;
        const fl = muted ? 0 : rt.flash[id][s];
        const isNow = playing && rt.step === s;

        dummy.position.set(x, TOP + PAD_H / 2 - fl * 0.11, z);
        dummy.scale.set(1, 1 - fl * 0.35, 1);
        dummy.updateMatrix();
        pads.setMatrixAt(i, dummy.matrix);

        if (level > 0) col.copy(DEEP).lerp(base, clamp(level / 1.2, 0, 1)).lerp(BRAND_LIGHT, clamp((level - 1.2) / 0.8, 0, 1) * 0.45).multiplyScalar(0.8);
        else col.copy(s % 4 === 0 ? PAD_OFF_BEAT : PAD_OFF);
        if (level > 0 && level < 0.6) col.multiplyScalar(0.55 + level * 0.6);
        if (muted) col.multiplyScalar(0.35);
        pads.setColorAt(i, col);

        let k = fl * 2.4 * (level > 0 ? 0.6 + Math.min(level, 2) * 0.35 : 0.4);
        if (isNow) k += level > 0 ? 0.55 : 0.12;
        if (level > 0 && !muted) k += 0.06 + level * 0.04;
        if (muted) k *= 0.3;
        glow.copy(level > 0 ? base : BRAND_LIGHT).multiplyScalar(k);
        dummy.position.set(x, TOP + PAD_H - fl * 0.22 + 0.006, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        caps.setMatrixAt(i, dummy.matrix);
        caps.setColorAt(i, glow);
      }
    });
    pads.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    if (pads.instanceColor) pads.instanceColor.needsUpdate = true;
    if (caps.instanceColor) caps.instanceColor.needsUpdate = true;
    if (ghostPads.instanceColor) ghostPads.instanceColor.needsUpdate = true;

    // ── playhead ──
    playhead.visible = band.visible = playing;
    if (playing) {
      const s = rt.step;
      const next = (s + 1) % STEPS;
      const phase = rt.stepPhase();
      const b = blockOf(L, s);
      let x = padX(L, s);
      if (blockOf(L, next) === b && next > s) x += (padX(L, next) - x) * phase;
      const zc = L.z0 + b * (L.blockD + BLOCK_GAP) + L.blockD / 2;
      playhead.position.set(x + PITCH * 0.5, TOP + PAD_H + 0.06, zc);
      playhead.scale.set(0.07, 0.05, L.blockD + 0.3);
      band.position.set(padX(L, s), TOP + PAD_H + 0.02, zc);
      band.scale.set(PITCH * 0.98, 0.02, L.blockD + 0.2);
      playMat.color.copy(BRAND_LIGHT).multiplyScalar(1.2 + rt.beat * 0.8);
    }

    // ── spectrum ring ──
    ring.visible = powered;
    if (powered) {
      const live = rt.readSpectrum();
      const e = rt.energy;
      const half = RING_BARS / 2;
      for (let i = 0; i < RING_BARS; i++) {
        const f = i < half ? i / half : (RING_BARS - i) / half; // mirrored so the ring is symmetric
        let v: number;
        if (live) {
          const bin = Math.min(100, Math.floor(Math.pow(f, 1.6) * 90));
          v = Math.pow((rt.spectrum[bin] ?? 0) / 255, 1.3);
        } else {
          const bandAt = (c: number, w: number, a: number) => a * Math.exp(-(((f - c) / w) ** 2));
          v = bandAt(0.08, 0.12, e.kick) + bandAt(0.18, 0.1, e.bass * 0.9) + bandAt(0.45, 0.14, e.snare) + bandAt(0.58, 0.14, e.clap * 0.9) + bandAt(0.86, 0.2, e.hats * 0.8);
          v = clamp(v * (0.8 + 0.2 * Math.sin(time * 13 + i * 1.7)) + 0.04 + 0.03 * Math.sin(time * 1.7 + i * 0.5), 0, 1);
        }
        const prev = ringLevels[i];
        const cur = v > prev ? prev + (v - prev) * 0.6 : prev + (v - prev) * 0.15;
        ringLevels[i] = cur;
        const a = (i / RING_BARS) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * ringRadius.x, 0, Math.sin(a) * ringRadius.y);
        dummy.rotation.set(0, -a, 0);
        dummy.scale.set(1, 0.05 + cur * 2.4, 1);
        dummy.updateMatrix();
        ring.setMatrixAt(i, dummy.matrix);
        ring.setColorAt(i, col.copy(DEEP).lerp(BRAND_LIGHT, cur).multiplyScalar(0.25 + cur * 1.3));
      }
      dummy.rotation.set(0, 0, 0);
      ring.instanceMatrix.needsUpdate = true;
      if (ring.instanceColor) ring.instanceColor.needsUpdate = true;
    }

    // ── bass orbs ──
    if (rt.bassSerial !== lastBassSerial) {
      lastBassSerial = rt.bassSerial;
      if (powered && rt.isAlive("bass")) {
        const o = orbs[orbNext];
        orbNext = (orbNext + 1) % ORBS;
        const bassRow = TRACK_IDS.indexOf("bass");
        o.active = true;
        o.life = 0;
        o.x = padX(L, rt.bassStep);
        o.z = rowZ(L, bassRow, blockOf(L, rt.bassStep));
        const el = labels.orbs[orbs.indexOf(o)];
        const m = rt.model;
        if (el && m) {
          const n = m.notes[rt.bassStep];
          el.textContent = n > 0 ? `${midiName(n)} · ${formatHz(m.hz[rt.bassStep])}` : "";
        }
      }
    }
    orbs.forEach((o, idx) => {
      const el = labels.orbs[idx];
      if (!o.active) {
        o.mesh.visible = false;
        if (el) el.style.opacity = "0";
        return;
      }
      o.life += dt;
      const k = o.life / 1.6;
      if (k >= 1) {
        o.active = false;
        o.mesh.visible = false;
        if (el) el.style.opacity = "0";
        return;
      }
      const y = TOP + PAD_H + 0.3 + k * 3.2;
      o.mesh.visible = true;
      o.mesh.position.set(o.x, y, o.z);
      o.mesh.scale.setScalar(1 + k * 0.8);
      o.mat.opacity = 1 - k;
      place(el, o.x, y + 0.45, o.z, k < 0.45 ? 1 - k / 0.45 : 0, "translate(-50%, -100%)");
    });

    // ── mixer ──
    const mixerOn = powered && rt.isAlive("mixer");
    channels.forEach((c, i) => {
      const id = TRACK_IDS[i];
      const mix = model?.mix[id];
      const vol = mixerOn && mix ? mix.volume : 0.75;
      const pan = mixerOn && mix ? mix.pan : 0;
      c.vol += (vol - c.vol) * Math.min(1, dt * 8);
      c.pan += (pan - c.pan) * Math.min(1, dt * 8);
      const mat = mixerOn ? null : ghostMat;
      c.fader.material = mat ?? faderMat;
      c.knob.material = mat ?? knobMat;
      c.slot.material = mat ?? slotMat;
      c.tick.visible = mixerOn;
      c.led.visible = mixerOn;
      c.fader.rotation.y = L.portrait ? 0 : Math.PI / 2;
      if (L.portrait) c.fader.position.set(c.slot.position.x, TOP + 0.13, L.mixZ + 0.7 - c.vol * 1.4);
      else c.fader.position.set(L.mixX + 0.55 + c.vol * 1.4, TOP + 0.13, c.slot.position.z);
      c.knob.rotation.y = -c.pan * 2.3;
      if (mixerOn && mix) {
        const lit = mix.mute ? 1 : 0.6 + rt.energy[id] * 1.8;
        c.ledMat.color.copy(mix.mute ? DANGER : BRAND_LIGHT).multiplyScalar(lit * 1.4);
      }
      const ghostPulse = !mixerOn && focus === "mixer";
      if (ghostPulse) ghostMat.opacity = 0.35 + 0.35 * pulse;
      if (L.portrait) place(labels.mixer[i], c.slot.position.x, TOP + 0.1, L.mixZ - 0.95, powered ? 1 : 0.5, "translate(-50%, -100%)");
      else place(labels.mixer[i], L.mixX + 3.05, TOP + 0.1, c.slot.position.z, mixerOn ? 1 : 0, "translate(0, -50%)");
    });

    // ── row labels ──
    tmp.set(L.x0, TOP, rowZ(L, 0, 0)).project(camera);
    const y0 = tmp.y;
    tmp.set(L.x0, TOP, rowZ(L, 1, 0)).project(camera);
    rowSpacingPx = Math.abs(tmp.y - y0) * 0.5 * ctx.size.height;
    TRACK_IDS.forEach((_, row) => {
      place(labels.rows[row], L.x0 - 0.15, TOP + 0.2, rowZ(L, row, 0), rowSpacingPx >= 12 ? 1 : 0, "translate(-100%, -50%)");
    });

    // ── celebration ──
    celebRing.visible = rt.celebrate > 0;
    if (rt.celebrate > 0) {
      const k = 1 - rt.celebrate;
      celebRing.scale.setScalar(2 + k * celebScale);
      celebMat.opacity = rt.celebrate;
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
      if (hitPoint.x < L.x0 - 1.5 || hitPoint.x > L.x0 + L.padsW) return null;
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
      envTex.dispose();
      pmrem.dispose();
      for (const m of [ghostMat, plinthMat, deckMat, padMat, glowMat, ghostPadMat, lineMat, playMat, bandMat, ringMat, celebMat, slotMat, faderMat, knobMat, tickMat]) m.dispose();
    },
  };
}

export function formatHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${hz < 100 ? hz.toFixed(1) : Math.round(hz)} Hz`;
}
