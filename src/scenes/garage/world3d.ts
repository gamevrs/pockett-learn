import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { BRAND, BRAND_LIGHT, fitDistance, type ThreeContext } from "@/engine/three-kit";
import { SENSOR_ANGLE, SENSOR_RANGE, WORLD_H, WORLD_W, type CarState, type Sensors, type SimEvent, type Track } from "./sim";

/**
 * Turbo Garage in 3D. The 2D sim (x right, y down) maps onto the ground plane as
 * X = x - 500, Z = y - 300 (Y up). A sim heading θ becomes rotation.y = -θ.
 */

export type CameraMode = "overview" | "chase";

export interface GarageView {
  car: CarState;
  lit: boolean; // ignition
  painted: boolean;
  paint: string;
  turbo: boolean;
  roadAlive: boolean; // steering unlocked: the circuit is "real"
  gates: number[];
  gateFlash: Record<number, number>;
  sensors: Sensors | null;
  power: number;
  events: SimEvent[];
  camera: CameraMode;
}

const toX = (x: number) => x - WORLD_W / 2;
const toZ = (y: number) => y - WORLD_H / 2;
const WALL_OFFSET = 12; // sim wall is at halfWidth + 12

export interface GarageWorld {
  update(view: GarageView, dt: number, time: number): void;
  resize(width: number, height: number): void;
  /** Screen position of the car's name tag, in CSS pixels. */
  labelPosition(): { x: number; y: number; visible: boolean };
  /** Burst of sparkles + an expanding ring around the car (new feature unlocked). */
  celebrate(): void;
  dispose(): void;
}

// ───────────────────────── geometry helpers ─────────────────────────

/** A flat strip following the track between two lateral offsets (+ = right of travel). */
function ribbon(track: Track, inner: number, outer: number, y: number, include?: (i: number) => boolean, vScale = 1 / 40) {
  const N = track.pts.length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let arc = 0;
  for (let i = 0; i <= N; i++) {
    const k = i % N;
    const p = track.pts[k];
    const th = track.tangent[k];
    const nx = -Math.sin(th);
    const nz = Math.cos(th);
    if (i > 0) {
      const q = track.pts[(i - 1) % N];
      arc += Math.hypot(p.x - q.x, p.y - q.y);
    }
    pos.push(toX(p.x + nx * inner), y, toZ(p.y + nz * inner), toX(p.x + nx * outer), y, toZ(p.y + nz * outer));
    uv.push(0, arc * vScale, 1, arc * vScale);
    if (i < N && (!include || include(i))) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  // Make every triangle face up (+Y) regardless of which way the track turns.
  for (let t = 0; t < idx.length; t += 3) {
    const [i0, i1, i2] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
    const ux = pos[i1] - pos[i0];
    const uz = pos[i1 + 2] - pos[i0 + 2];
    const vx = pos[i2] - pos[i0];
    const vz = pos[i2 + 2] - pos[i0 + 2];
    if (uz * vx - ux * vz < 0) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** A low wall (rectangular tube) following the track at lateral offsets a..b. */
function wall(track: Track, a: number, b: number, height: number) {
  const N = track.pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const k = i % N;
    const p = track.pts[k];
    const th = track.tangent[k];
    const nx = -Math.sin(th);
    const nz = Math.cos(th);
    for (const [off, y] of [
      [a, 0],
      [a, height],
      [b, height],
      [b, 0],
    ] as const) {
      pos.push(toX(p.x + nx * off), y, toZ(p.y + nz * off));
    }
    if (i < N) {
      const s = i * 4;
      for (let f = 0; f < 3; f++) idx.push(s + f, s + 4 + f, s + f + 1, s + f + 1, s + 4 + f, s + 5 + f);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function curvatureRadius(track: Track, i: number) {
  const N = track.pts.length;
  const a = track.pts[(i - 6 + N) % N];
  const b = track.pts[i];
  const c = track.pts[(i + 6) % N];
  const ab = Math.hypot(b.x - a.x, b.y - a.y);
  const bc = Math.hypot(c.x - b.x, c.y - b.y);
  const ca = Math.hypot(a.x - c.x, a.y - c.y);
  const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  return area > 1e-6 ? (ab * bc * ca) / (4 * area) : Infinity;
}

function noiseTexture(size = 256, base = 196, spread = 48) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = base + Math.random() * spread;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v + 3;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function checkerTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 16;
  const g = c.getContext("2d")!;
  for (let x = 0; x < 16; x++)
    for (let y = 0; y < 4; y++) {
      g.fillStyle = (x + y) % 2 ? "#c9c9d3" : "#15151b";
      g.fillRect(x * 4, y * 4, 4, 4);
    }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ───────────────────────── the world ─────────────────────────

export function createGarageWorld(ctx: ThreeContext, track: Track): GarageWorld {
  const { scene, camera, renderer } = ctx;
  const hw = track.halfWidth;

  scene.background = new THREE.Color("#07070c");
  scene.fog = new THREE.FogExp2("#07070c", 0.00028);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.35;

  // lights
  const hemi = new THREE.HemisphereLight("#cfc8ff", "#08080d", 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffffff", 1.7);
  sun.position.set(-320, 620, 260);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -560, right: 560, top: 360, bottom: -360, near: 10, far: 1600 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(BRAND, 0.9);
  rim.position.set(420, 160, -380);
  scene.add(rim);

  // ground + grid
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ color: "#0c0d12", roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(2400, 80, BRAND, BRAND);
  const gridMat = grid.material as THREE.LineBasicMaterial;
  gridMat.transparent = true;
  gridMat.opacity = 0.07;
  gridMat.depthWrite = false;
  grid.position.y = 0.05;
  scene.add(grid);

  // ── circuit ──
  const blueprintMat = new THREE.MeshBasicMaterial({ color: BRAND, wireframe: true, transparent: true, opacity: 0.22 });
  const ghostMat = new THREE.MeshBasicMaterial({ color: BRAND, transparent: true, opacity: 0.07, depthWrite: false });
  const asphaltTex = noiseTexture();
  asphaltTex.repeat.set(1, 1);
  const asphaltMat = new THREE.MeshStandardMaterial({ color: "#30313b", map: asphaltTex, roughness: 0.86, metalness: 0 });
  const lineMat = new THREE.MeshStandardMaterial({ color: "#9d9daa", roughness: 0.7 });
  const kerbLightMat = new THREE.MeshStandardMaterial({ color: "#8c8c9a", roughness: 0.7 });
  const kerbDarkMat = new THREE.MeshStandardMaterial({ color: "#3b3550", roughness: 0.5 });
  const runoffMat = new THREE.MeshStandardMaterial({ color: "#14151b", roughness: 1 });
  const wallMat = new THREE.MeshStandardMaterial({ color: "#2c2c36", roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide });
  const neonMat = new THREE.MeshStandardMaterial({ color: BRAND, emissive: BRAND, emissiveIntensity: 1.25, roughness: 0.4 });
  const checkerMat = new THREE.MeshStandardMaterial({ map: checkerTexture(), roughness: 0.6 });

  const N = track.pts.length;
  const corner = Array.from({ length: N }, (_, i) => curvatureRadius(track, i) < 190);

  const trackParts: { mesh: THREE.Mesh; lit: THREE.Material }[] = [];
  const addPart = (geo: THREE.BufferGeometry, mat: THREE.Material, shadow = false) => {
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    m.castShadow = shadow;
    scene.add(m);
    trackParts.push({ mesh: m, lit: mat });
    return m;
  };
  addPart(ribbon(track, -hw - 12, hw + 12, 0.15), runoffMat);
  addPart(ribbon(track, -hw, hw, 0.3, undefined, 1 / 60), asphaltMat);
  addPart(ribbon(track, -hw + 2.5, -hw + 4.2, 0.45), lineMat);
  addPart(ribbon(track, hw - 4.2, hw - 2.5, 0.45), lineMat);
  addPart(ribbon(track, -0.9, 0.9, 0.45, (i) => i % 8 < 4), lineMat);
  for (const side of [-1, 1]) {
    const a = side < 0 ? -hw - 9 : hw;
    const b = side < 0 ? -hw : hw + 9;
    addPart(ribbon(track, a, b, 0.55, (i) => corner[i] && Math.floor(i / 3) % 2 === 0), kerbLightMat);
    addPart(ribbon(track, a, b, 0.55, (i) => corner[i] && Math.floor(i / 3) % 2 === 1), kerbDarkMat);
    const wa = side < 0 ? -hw - WALL_OFFSET - 3 : hw + WALL_OFFSET;
    const wb = side < 0 ? -hw - WALL_OFFSET : hw + WALL_OFFSET + 3;
    addPart(wall(track, wa, wb, 6), wallMat, true);
    addPart(ribbon(track, (wa + wb) / 2 - 0.7, (wa + wb) / 2 + 0.7, 6.15), neonMat);
  }
  // start / finish: checker band + gantry
  const startIdx = (i: number) => i < 2 || i > N - 3;
  addPart(ribbon(track, -hw, hw, 0.5, startIdx, 1 / 19), checkerMat);
  const gantry = new THREE.Group();
  const p0 = track.pts[0];
  gantry.position.set(toX(p0.x), 0, toZ(p0.y));
  gantry.rotation.y = -track.tangent[0];
  const postGeo = new THREE.BoxGeometry(3, 34, 3);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, wallMat);
    post.position.set(0, 17, s * (hw + WALL_OFFSET + 2));
    post.castShadow = true;
    gantry.add(post);
  }
  const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(4, 6, (hw + WALL_OFFSET + 2) * 2 + 3), wallMat);
  gantryBeam.position.y = 35;
  gantryBeam.castShadow = true;
  gantry.add(gantryBeam);
  const banner = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.2, (hw + WALL_OFFSET) * 2), neonMat);
  banner.position.y = 35;
  gantry.add(banner);
  scene.add(gantry);

  // light posts along the outer wall (instanced)
  const lampCount = 24;
  const lampPost = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.8, 1, 26, 6), wallMat, lampCount);
  const lampHead = new THREE.InstancedMesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshStandardMaterial({ color: "#000000", emissive: BRAND_LIGHT, emissiveIntensity: 1.3 }), lampCount);
  {
    const m = new THREE.Matrix4();
    for (let l = 0; l < lampCount; l++) {
      const i = Math.floor((l / lampCount) * N + 6) % N;
      const p = track.pts[i];
      const th = track.tangent[i];
      // outside of the loop: pick the side farther from the circuit centre
      const nx = -Math.sin(th);
      const nz = Math.cos(th);
      const cx = p.x - WORLD_W / 2;
      const cz = p.y - WORLD_H / 2;
      const side = nx * cx + nz * cz > 0 ? 1 : -1;
      const off = side * (hw + WALL_OFFSET + 10);
      const x = toX(p.x + nx * off);
      const z = toZ(p.y + nz * off);
      m.makeTranslation(x, 13, z);
      lampPost.setMatrixAt(l, m);
      m.makeTranslation(x, 27, z);
      lampHead.setMatrixAt(l, m);
    }
  }
  lampPost.castShadow = true;
  scene.add(lampPost, lampHead);

  // ── gates ──
  const gateGroup = new THREE.Group();
  scene.add(gateGroup);
  const gatePostGeo = new THREE.CylinderGeometry(1.1, 1.1, 24, 10);
  const gateBeamGeo = new THREE.BoxGeometry(1.6, 1.6, hw * 2 + 10);
  let gateKey = "";
  const gateMeshes = new Map<number, THREE.MeshStandardMaterial>();
  const rebuildGates = (gates: number[]) => {
    for (const child of [...gateGroup.children]) {
      gateGroup.remove(child);
    }
    for (const mat of gateMeshes.values()) mat.dispose();
    gateMeshes.clear();
    for (const g of gates) {
      if (gateMeshes.has(g)) continue;
      const i = Math.round((Math.min(100, Math.max(0, g)) / 100) * N) % N;
      const p = track.pts[i];
      const arch = new THREE.Group();
      arch.position.set(toX(p.x), 0, toZ(p.y));
      arch.rotation.y = -track.tangent[i];
      const mat = new THREE.MeshStandardMaterial({ color: "#d8d8e2", emissive: "#ffffff", emissiveIntensity: 0.05, roughness: 0.4 });
      for (const s of [-1, 1]) {
        const post = new THREE.Mesh(gatePostGeo, mat);
        post.position.set(0, 12, s * (hw + 5));
        arch.add(post);
      }
      const top = new THREE.Mesh(gateBeamGeo, mat);
      top.position.y = 24;
      arch.add(top);
      gateGroup.add(arch);
      gateMeshes.set(g, mat);
    }
  };

  // ── car ──
  const car = new THREE.Group();
  scene.add(car);
  const paintMat = new THREE.MeshPhysicalMaterial({ color: "#8a8f9c", metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: "#0b0d14", metalness: 0.3, roughness: 0.06, clearcoat: 1 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#121218", roughness: 0.6, metalness: 0.3 });
  const tireMat = new THREE.MeshStandardMaterial({ color: "#0d0d10", roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: "#b7b7c4", metalness: 0.9, roughness: 0.25 });
  const headMat = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff6e3", emissiveIntensity: 0 });
  const tailMat = new THREE.MeshStandardMaterial({ color: "#2a0a10", emissive: "#ff3355", emissiveIntensity: 0.4 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.4, transparent: true, opacity: 0.75 });

  const carParts: { mesh: THREE.Mesh; lit: THREE.Material }[] = [];
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = car) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    carParts.push({ mesh: m, lit: mat });
    return m;
  };
  part(new RoundedBoxGeometry(36, 7, 19, 3, 3), paintMat, 0, 6.5, 0);
  part(new RoundedBoxGeometry(17, 6.5, 15, 3, 2.6), glassMat, -2.5, 12.2, 0);
  part(new THREE.BoxGeometry(33, 0.3, 3), stripeMat, 0, 10.1, 0);
  part(new THREE.BoxGeometry(3, 2, 18), trimMat, 17.5, 3.2, 0);
  [-6, 6].forEach((z) => part(new THREE.BoxGeometry(1.2, 1.6, 4), headMat, 18.1, 7.3, z));
  [-6.5, 6.5].forEach((z) => part(new THREE.BoxGeometry(1.2, 1.4, 4.4), tailMat, -18.1, 7.6, z));

  const wing = new THREE.Group();
  part(new THREE.BoxGeometry(5, 0.8, 21), paintMat, -16.5, 15, 0, wing);
  part(new THREE.BoxGeometry(1.2, 5, 1.2), trimMat, -16, 12, -6, wing);
  part(new THREE.BoxGeometry(1.2, 5, 1.2), trimMat, -16, 12, 6, wing);
  car.add(wing);

  const wheelGeo = new THREE.CylinderGeometry(4.6, 4.6, 4, 24);
  const rimGeo = new THREE.CylinderGeometry(2.7, 2.7, 4.3, 12);
  const spinners: THREE.Group[] = [];
  const steerPivots: THREE.Group[] = [];
  for (const [x, z] of [
    [11.5, -9.8],
    [11.5, 9.8],
    [-11.5, -9.8],
    [-11.5, 9.8],
  ] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 4.6, z);
    const spin = new THREE.Group();
    pivot.add(spin);
    const tire = part(wheelGeo, tireMat, 0, 0, 0, spin);
    tire.rotation.x = Math.PI / 2;
    const rimMesh = part(rimGeo, rimMat, 0, 0, 0, spin);
    rimMesh.rotation.x = Math.PI / 2;
    car.add(pivot);
    spinners.push(spin);
    if (x > 0) steerPivots.push(pivot);
  }

  const flameMat = new THREE.MeshBasicMaterial({ color: "#ffb26b", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(1.6, 9, 10), flameMat);
  flame.rotation.z = Math.PI / 2;
  flame.position.set(-23, 5, 0);
  car.add(flame);

  const beam = new THREE.SpotLight("#fff4dc", 0, 260, 0.42, 0.65, 1.2);
  beam.position.set(18, 8, 0);
  beam.target.position.set(90, 0, 0);
  car.add(beam, beam.target);
  const underglow = new THREE.PointLight(BRAND, 0, 60, 1.6);
  underglow.position.set(0, 2, 0);
  car.add(underglow);

  // ── sensors ──
  const sensorGeo = new THREE.BufferGeometry();
  const sensorPos = new Float32Array(18);
  sensorGeo.setAttribute("position", new THREE.BufferAttribute(sensorPos, 3));
  const sensorLines = new THREE.LineSegments(sensorGeo, new THREE.LineBasicMaterial({ color: BRAND_LIGHT, transparent: true, opacity: 0.85 }));
  sensorLines.frustumCulled = false;
  scene.add(sensorLines);
  const hitGeo = new THREE.SphereGeometry(2.2, 10, 8);
  const hitMats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: BRAND_LIGHT }));
  const hits = hitMats.map((m) => {
    const s = new THREE.Mesh(hitGeo, m);
    scene.add(s);
    return s;
  });

  // ── particles (additive points; fading = darkening) ──
  const PCOUNT = 260;
  const pPos = new Float32Array(PCOUNT * 3);
  const pCol = new Float32Array(PCOUNT * 3);
  const pVel = new Float32Array(PCOUNT * 3);
  const pLife = new Float32Array(PCOUNT);
  const pMax = new Float32Array(PCOUNT).fill(1);
  const pBase = new Float32Array(PCOUNT * 3);
  const pGrav = new Float32Array(PCOUNT);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ size: 4, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
  );
  points.frustumCulled = false;
  scene.add(points);
  let pNext = 0;
  const emit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, color: THREE.Color, gravity = 90) => {
    const i = pNext;
    pNext = (pNext + 1) % PCOUNT;
    pPos.set([x, y, z], i * 3);
    pVel.set([vx, vy, vz], i * 3);
    pBase.set([color.r, color.g, color.b], i * 3);
    pLife[i] = 0;
    pMax[i] = life;
    pGrav[i] = gravity;
  };
  for (let i = 0; i < PCOUNT; i++) pLife[i] = 99;

  // celebration ring
  const ringMat = new THREE.MeshBasicMaterial({ color: BRAND_LIGHT, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), ringMat);
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  let ringT = 1;

  // ── look switching ──
  let lookKey = "";
  const applyLook = (view: GarageView) => {
    const key = `${view.lit}|${view.painted}|${view.paint}|${view.roadAlive}`;
    if (key === lookKey) return;
    lookKey = key;
    for (const p of trackParts) {
      p.mesh.material = !view.lit ? blueprintMat : view.roadAlive ? p.lit : ghostMat;
      // blueprint: only the road surface, as a clean wireframe; ghost: just the outline of the road
      p.mesh.visible = view.lit ? view.roadAlive || p.lit === asphaltMat : p.lit === asphaltMat;
    }
    gantry.visible = view.roadAlive;
    lampPost.visible = lampHead.visible = view.lit && view.roadAlive;
    for (const c of carParts) c.mesh.material = view.lit ? c.lit : blueprintMat;
    paintMat.color.set(view.painted ? safeColor(view.paint) : "#8a8f9c");
    hemi.intensity = view.lit ? 0.55 : 0.15;
    sun.intensity = view.lit ? 1.7 : 0.25;
    gridMat.opacity = view.lit ? 0.06 : 0.16;
    ctx.bloom.strength = view.lit ? 0.55 : 0.9;
    ctx.bloom.threshold = view.lit ? 0.92 : 0.6;
    ctx.bloom.radius = 0.45;
  };

  // ── camera ──
  const camPos = new THREE.Vector3(0, 700, 600);
  const camLook = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const overviewFor = (time: number) => {
    const portrait = camera.aspect < 0.9;
    const elevation = THREE.MathUtils.degToRad(portrait ? 58 : 52);
    const spanW = portrait ? 560 : 920;
    const spanD = portrait ? 920 : 560;
    const dist = fitDistance(camera, spanW, spanD * Math.sin(elevation) + 60, 1.05);
    const az = (portrait ? Math.PI / 2 : 0) + Math.sin(time * 0.12) * 0.05;
    tmpV.set(Math.sin(az) * Math.cos(elevation) * dist, Math.sin(elevation) * dist, Math.cos(az) * Math.cos(elevation) * dist);
    return tmpV;
  };

  const label = new THREE.Vector3();
  let labelVisible = false;
  let snapped = false;

  return {
    update(view, dt, time) {
      applyLook(view);
      const c = view.car;
      const x = toX(c.x);
      const z = toZ(c.y);
      const fx = Math.cos(c.heading);
      const fz = Math.sin(c.heading);

      // car transform
      car.position.set(x, 0, z);
      car.rotation.y = -c.heading;
      car.position.y = view.lit ? Math.sin(time * 30) * 0.08 * Math.min(1, c.kmh / 60 + 0.2) : 0;
      for (const p of steerPivots) p.rotation.y = THREE.MathUtils.degToRad(-c.wheel);
      const roll = ((c.kmh * 1.55) / 4.6) * dt;
      for (const s of spinners) s.rotation.z -= roll;
      wing.visible = view.painted && view.turbo;
      headMat.emissiveIntensity = view.lit ? 2.2 : 0;
      tailMat.emissiveIntensity = view.lit ? (c.braking ? 4 : 0.5) : 0;
      beam.intensity = view.lit ? 420 : 0;
      underglow.intensity = view.lit ? 50 : 0;
      const boost = view.painted && view.turbo ? Math.max(0, view.power - 0.55) * 2.2 : 0;
      flame.visible = boost > 0.05;
      flame.scale.set(1, 0.4 + boost + Math.random() * 0.3, 1);

      // gates
      const key = view.gates.join(",");
      if (key !== gateKey) {
        gateKey = key;
        rebuildGates(view.gates);
      }
      for (const [g, mat] of gateMeshes) {
        const passed = c.gatesPassed.includes(g);
        const flash = view.gateFlash[g] ?? 0;
        mat.color.copy(passed ? BRAND : GATE_IDLE);
        mat.emissive.copy(passed ? BRAND : WHITE);
        mat.emissiveIntensity = passed ? 1.4 + flash * 4 : 0.05;
      }

      // sensors
      sensorLines.visible = !!view.sensors;
      for (let r = 0; r < 3; r++) hits[r].visible = !!view.sensors;
      if (view.sensors) {
        const vals = [view.sensors.left, view.sensors.front, view.sensors.right];
        const angs = [-SENSOR_ANGLE, 0, SENSOR_ANGLE];
        for (let r = 0; r < 3; r++) {
          const a = c.heading + angs[r];
          const d = vals[r] * SENSOR_RANGE;
          const hx = toX(c.x + Math.cos(a) * d);
          const hz = toZ(c.y + Math.sin(a) * d);
          sensorPos.set([x, 6, z, hx, 6, hz], r * 6);
          hits[r].position.set(hx, 6, hz);
          hitMats[r].color.copy(vals[r] < 0.35 ? DANGER : BRAND_LIGHT);
        }
        sensorGeo.attributes.position.needsUpdate = true;
      }

      // particles: tyre smoke, wall sparks
      if (view.lit && c.sliding && c.kmh > 25) {
        for (const s of [-1, 1]) emit(x - fx * 14 - fz * s * 9, 2, z - fz * 14 + fx * s * 9, (Math.random() - 0.5) * 8, 4 + Math.random() * 4, (Math.random() - 0.5) * 8, 0.9, SMOKE, 0);
      }
      for (const e of view.events) {
        if (e.kind === "wall")
          for (let k = 0; k < 14; k++) emit(x, 6, z, (Math.random() - 0.5) * 120, Math.random() * 60, (Math.random() - 0.5) * 120, 0.5, WHITE);
        if (e.kind === "lap")
          for (let k = 0; k < 40; k++) emit(x, 10, z, (Math.random() - 0.5) * 160, 40 + Math.random() * 80, (Math.random() - 0.5) * 160, 1.2, BRAND_LIGHT);
      }
      for (let i = 0; i < PCOUNT; i++) {
        pLife[i] += dt;
        const k = Math.max(0, 1 - pLife[i] / pMax[i]);
        pPos[i * 3] += pVel[i * 3] * dt;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
        pVel[i * 3 + 1] -= pGrav[i] * dt;
        pCol[i * 3] = pBase[i * 3] * k;
        pCol[i * 3 + 1] = pBase[i * 3 + 1] * k;
        pCol[i * 3 + 2] = pBase[i * 3 + 2] * k;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;

      // celebration ring
      ringT = Math.min(1, ringT + dt * 0.8);
      ring.position.set(x, 1, z);
      ring.scale.setScalar(20 + ringT * 160);
      ringMat.opacity = (1 - ringT) * 0.9;

      // camera
      if (view.camera === "chase") {
        tmpV.set(x - fx * 120, 58, z - fz * 120);
        camLook.lerp(lookTarget.set(x + fx * 45, 4, z + fz * 45), 1 - Math.exp(-dt * 6));
      } else {
        overviewFor(time);
        camLook.lerp(lookTarget.set(0, 0, 10), 1 - Math.exp(-dt * 3));
      }
      if (!snapped) {
        // first frame: start exactly where the camera wants to be (no fly-in)
        camPos.copy(tmpV);
        camLook.copy(lookTarget);
        snapped = true;
      }
      camPos.lerp(tmpV, 1 - Math.exp(-dt * (view.camera === "chase" ? 4 : 2.5)));
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      label.set(x, 26, z);
      label.project(camera);
      labelVisible = label.z < 1;
    },
    resize() {
      // the kit updated the aspect; jump straight to the new framing instead of drifting there
      snapped = false;
    },
    labelPosition() {
      return {
        x: ((label.x + 1) / 2) * ctx.size.width,
        y: ((1 - label.y) / 2) * ctx.size.height,
        visible: labelVisible,
      };
    },
    dispose() {
      envTex.dispose();
      pmrem.dispose();
      for (const m of [blueprintMat, ghostMat, asphaltMat, lineMat, kerbLightMat, kerbDarkMat, runoffMat, wallMat, neonMat, checkerMat]) m.dispose();
    },
    celebrate() {
      ringT = 0;
      for (let k = 0; k < 60; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 120;
        emit(car.position.x, 8, car.position.z, Math.cos(a) * sp, 50 + Math.random() * 90, Math.sin(a) * sp, 1.4, BRAND_LIGHT);
      }
    },
  };
}

const WHITE = new THREE.Color("#ffffff");
const GATE_IDLE = new THREE.Color("#d8d8e2");
const SMOKE = new THREE.Color("#5a5a66");
const DANGER = new THREE.Color("#f87171");

/** Learner-provided colour: hex or a CSS colour name; anything else falls back to the brand violet. */
function safeColor(value: string): THREE.Color {
  const v = value.trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(v) || v in THREE.Color.NAMES) return new THREE.Color(v);
  return new THREE.Color("#8f74ff");
}
