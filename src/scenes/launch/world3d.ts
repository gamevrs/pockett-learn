import * as THREE from "three";
import { BRAND, BRAND_LIGHT, type ThreeContext } from "@/engine/three-kit";

/**
 * Three.js rendering for Launch Control. Pure view: it never touches the learner program
 * or the flight sim. LaunchScene.tsx fills a `LaunchView` every frame and calls `frame()`,
 * plus `event()` for one-shot moments (separation, abort, crash...).
 *
 * World units: the rocket is ~14 units tall. Altitude and downrange are compressed
 * logarithmically so the pad, the clouds and orbit all fit one continuous camera move.
 * The planet is a big sphere under the pad; it rotates with downrange travel.
 */

export interface LaunchView {
  lit: boolean; // console unlocked: pad powered, colour world
  painted: boolean; // rocket unlocked: real materials
  engines: boolean; // nozzles real, flame allowed
  staged: boolean; // two-stage look
  tower: 0 | 1 | 2; // none / ghost / solid escape tower
  color: string;
  crew: number;
  flying: boolean; // a flight exists (on pad or in the air)
  altKm: number;
  downrange: number; // radians around the planet
  pitchDeg: number;
  throttle: number;
  firing: boolean;
  vacuum: number; // 0 at sea level, 1 in space (plume expansion)
  boosterAttached: boolean;
  hidden: boolean; // rocket destroyed (abort / crash)
  outro: number; // 0..1 trans-lunar cinematic
  pulseGhost: boolean; // spotlight the ghost parts of the current lesson
  reduced: boolean;
  trail: boolean;
}

export type WorldEvent = "reset" | "liftoff" | "stage_sep" | "abort" | "crash" | "celebrate";

const VIOLET_DEEP = new THREE.Color("#6440f0");
const BG = new THREE.Color("#07070c");
const SKY_TOP = new THREE.Color("#0b0c18");
const SKY_LOW = new THREE.Color("#22253a");
const SKY_BLUEPRINT = new THREE.Color("#0e0b1c");
const RE = 4200; // planet radius in world units
const PAD_TOP = 1;
const ROCKET_CENTER = 6; // rocket local origin sits this far above its base

const visY = (altM: number) => 400 * Math.log(1 + Math.max(0, altM) / 2000);
const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ───────────────────────── particles ─────────────────────────
const POINT_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
uniform float uScale;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const POINT_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float a = (1.0 - smoothstep(0.05, 0.5, r)) * vAlpha;
  gl_FragColor = vec4(vColor, a);
}`;

class ParticleField {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly max: Float32Array;
  private readonly base: Float32Array;
  private readonly grow: Float32Array;
  private readonly a0: Float32Array;
  private readonly drag: Float32Array;
  private readonly rise: Float32Array;
  private head = 0;
  private live = 0;

  constructor(n: number, additive: boolean) {
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n).fill(1);
    this.max = new Float32Array(n).fill(1);
    this.base = new Float32Array(n);
    this.grow = new Float32Array(n);
    this.a0 = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.rise = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.material = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      uniforms: { uScale: { value: 400 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, grow: number, r: number, g: number, b: number, alpha: number, drag: number, rise: number) {
    const i = this.head;
    this.head = (this.head + 1) % this.n;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.col[i * 3] = r;
    this.col[i * 3 + 1] = g;
    this.col[i * 3 + 2] = b;
    this.life[i] = 0;
    this.max[i] = life;
    this.base[i] = size;
    this.grow[i] = grow;
    this.a0[i] = alpha;
    this.drag[i] = drag;
    this.rise[i] = rise;
    this.live = this.n;
  }

  update(dt: number) {
    if (this.live === 0) return;
    let any = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] >= this.max[i]) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      any++;
      this.life[i] += dt;
      const t = this.life[i] / this.max[i];
      const k = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= k;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k + this.rise[i] * dt;
      this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.base[i] * (1 + this.grow[i] * t);
      this.alpha[i] = this.a0[i] * Math.min(1, t * 10) * (1 - t) * (1 - t * 0.3);
    }
    if (any === 0) this.live = 0;
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
  }

  clear() {
    this.life.fill(1);
    this.max.fill(1);
    this.alpha.fill(0);
    this.size.fill(0);
    this.live = 1;
    this.update(0);
  }
}

// ───────────────────────── procedural textures ─────────────────────────
function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) paint(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function earthTexture() {
  return canvasTexture(1024, 512, (g) => {
    const rnd = seeded(11);
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#151a30");
    grad.addColorStop(0.5, "#1c2340");
    grad.addColorStop(1, "#151a30");
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);
    // land masses: soft desaturated blobs
    for (let i = 0; i < 26; i++) {
      const x = rnd() * 1024;
      const y = 80 + rnd() * 352;
      const r = 20 + rnd() * 70;
      for (let j = 0; j < 9; j++) {
        g.fillStyle = `rgba(44,48,68,${0.35 + rnd() * 0.3})`;
        g.beginPath();
        g.ellipse(x + (rnd() - 0.5) * r * 1.6, y + (rnd() - 0.5) * r, r * (0.4 + rnd() * 0.6), r * (0.3 + rnd() * 0.5), rnd() * 3, 0, 7);
        g.fill();
      }
    }
    // cloud streaks
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(230,232,245,${0.05 + rnd() * 0.14})`;
      g.beginPath();
      g.ellipse(rnd() * 1024, rnd() * 512, 20 + rnd() * 90, 2 + rnd() * 6, (rnd() - 0.5) * 0.3, 0, 7);
      g.fill();
    }
  });
}

function moonTexture() {
  return canvasTexture(512, 256, (g) => {
    const rnd = seeded(5);
    g.fillStyle = "#9b9aa3";
    g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 140; i++) {
      const r = 2 + rnd() * rnd() * 30;
      g.fillStyle = `rgba(${rnd() < 0.5 ? "70,70,80" : "185,185,195"},${0.12 + rnd() * 0.2})`;
      g.beginPath();
      g.arc(rnd() * 512, rnd() * 256, r, 0, 7);
      g.fill();
    }
  });
}

function softDot() {
  return canvasTexture(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.5, "rgba(255,255,255,0.35)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
}

// ───────────────────────── the world ─────────────────────────
type Swappable = THREE.Mesh | THREE.InstancedMesh;

export class LaunchWorld {
  private readonly ctx: ThreeContext;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;

  private readonly ghost = new THREE.MeshBasicMaterial({ color: BRAND, wireframe: true, transparent: true, opacity: 0.5, depthWrite: false });
  private readonly paint = new THREE.MeshPhysicalMaterial({ color: "#f2f4fa", clearcoat: 1, clearcoatRoughness: 0.18, roughness: 0.36, metalness: 0.12 });
  private readonly sky: THREE.Mesh;
  private readonly skyTop = new THREE.Color();
  private readonly skyBottom = new THREE.Color();
  private readonly fog: THREE.FogExp2;

  private readonly earthPivot = new THREE.Group();
  private readonly atmosphere: THREE.Mesh;
  private readonly padGroup = new THREE.Group();
  private readonly grid: THREE.GridHelper;
  private readonly groundMat: THREE.MeshStandardMaterial;
  private readonly arms: THREE.Group[] = [];
  private readonly beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: BRAND, toneMapped: false }));
  private readonly padLights: THREE.PointLight[] = [];
  private readonly padBulbs = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.2), toneMapped: false });

  private readonly rocket = new THREE.Group(); // positioned at the rocket centre, rotated by pitch
  private readonly body = new THREE.Group(); // offset so its base sits at the origin of the stack
  private readonly boosterPart = new THREE.Group();
  private readonly upperPart = new THREE.Group();
  private readonly towerPart = new THREE.Group();
  private readonly interstage: THREE.Mesh;
  private readonly upperNozzle: THREE.Mesh;
  private readonly collar: THREE.Mesh;
  private readonly windows: THREE.MeshStandardMaterial;
  private readonly swap: { mesh: Swappable; real: THREE.Material; group: "rocket" | "engine" | "tower" | "pad" }[] = [];

  private readonly flame = new THREE.Group();
  private readonly flameMats: THREE.MeshBasicMaterial[] = [];
  private readonly flameLight: THREE.PointLight;
  private readonly rim: THREE.PointLight;
  private readonly key: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;

  private readonly smoke = new ParticleField(900, false);
  private readonly fire = new ParticleField(500, true);
  private readonly stars: THREE.Points;
  private readonly starMat: THREE.PointsMaterial;
  private readonly moon: THREE.Mesh;
  private readonly moonMat: THREE.MeshStandardMaterial;
  private readonly clouds: THREE.Sprite[] = [];
  private readonly cloudMat: THREE.SpriteMaterial;

  private readonly trail: THREE.Line;
  private readonly trailPos: Float32Array;
  private trailCount = 0;
  private trailTimer = 0;

  private readonly debris = new THREE.Group();
  private readonly debrisVel = new THREE.Vector3();
  private debrisSpin = 0;
  private debrisAge = -1;
  private readonly capsule = new THREE.Group();
  private readonly chute: THREE.Mesh;
  private readonly capsuleVel = new THREE.Vector3();
  private capsuleAge = -1;
  private readonly capsuleFlame: THREE.Mesh;

  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly lastRocket = new THREE.Vector3(0, PAD_TOP + ROCKET_CENTER, 0);
  private readonly rocketVel = new THREE.Vector3();
  private readonly shake = new THREE.Vector3();
  private readonly colorCache = new THREE.Color();
  private liftAge = -1;
  private flash = 0;
  private styleKey = "";
  private colorKey = "";
  private emit = 0;

  constructor(ctx: ThreeContext) {
    this.ctx = ctx;
    this.scene = ctx.scene;
    this.camera = ctx.camera;
    this.camera.near = 0.5;
    this.camera.far = 14000;
    this.camera.fov = 38;
    this.camera.updateProjectionMatrix();
    ctx.bloom.strength = 0.7;
    ctx.bloom.radius = 0.55;
    ctx.bloom.threshold = 0.82;

    const scene = this.scene;
    scene.background = BG.clone();
    this.fog = new THREE.FogExp2(0x1a1d2c, 0.004);
    scene.fog = this.fog;

    // ── sky dome (single-hue vertical gradient) ──
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(9000, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTop: { value: this.skyTop }, uBottom: { value: this.skyBottom } },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uBottom; varying vec3 vDir; void main(){ float t = smoothstep(-0.25, 0.55, vDir.y); gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0); }`,
      }),
    );
    this.sky.renderOrder = -10;
    scene.add(this.sky);

    // ── lights ──
    this.hemi = new THREE.HemisphereLight(0xb9bdd6, 0x15151c, 0.55);
    scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xfff4ea, 2.2);
    this.key.position.set(-40, 70, 45);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.camera.left = -30;
    this.key.shadow.camera.right = 30;
    this.key.shadow.camera.top = 30;
    this.key.shadow.camera.bottom = -10;
    this.key.shadow.camera.near = 10;
    this.key.shadow.camera.far = 200;
    this.key.shadow.bias = -0.0005;
    this.key.shadow.radius = 4;
    scene.add(this.key);
    scene.add(this.key.target);
    this.rim = new THREE.PointLight(BRAND, 60, 70, 1.6);
    scene.add(this.rim);
    this.flameLight = new THREE.PointLight(0xff9a4a, 0, 90, 1.5);
    scene.add(this.flameLight);

    // ── planet ──
    const earthGeo = new THREE.SphereGeometry(RE, 128, 64);
    earthGeo.rotateX(Math.PI / 2); // equator through the pad, so spinning about Z rolls the ground away
    const earth = new THREE.Mesh(earthGeo, new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.95, metalness: 0 }));
    earth.receiveShadow = false;
    this.earthPivot.position.set(0, -RE - 0.2, 0);
    this.earthPivot.add(earth);
    this.atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(RE * 1.035, 96, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        fog: false,
        uniforms: { uColor: { value: new THREE.Color("#7f6cff") }, uStrength: { value: 0 } },
        vertexShader: `varying vec3 vN; varying vec3 vView; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vView; void main(){ float f = pow(1.0 - abs(dot(vN, vView)), 3.0); gl_FragColor = vec4(uColor * f * 1.6, f * uStrength); }`,
      }),
    );
    this.earthPivot.add(this.atmosphere);
    scene.add(this.earthPivot);

    // ── pad (rides on the planet) ──
    this.padGroup.position.set(0, RE + 0.2, 0);
    this.earthPivot.add(this.padGroup);
    this.groundMat = new THREE.MeshStandardMaterial({ color: 0x0e0f17, roughness: 1, metalness: 0, transparent: true });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(420, 64), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.02;
    ground.receiveShadow = true;
    this.padGroup.add(ground);
    this.grid = new THREE.GridHelper(400, 100, BRAND, BRAND);
    const gridMat = this.grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.14;
    gridMat.depthWrite = false;
    this.grid.position.y = 0.06;
    this.padGroup.add(this.grid);
    this.buildPad();

    // ── rocket ──
    this.windows = new THREE.MeshStandardMaterial({ color: 0x10121c, emissive: BRAND_LIGHT, emissiveIntensity: 0.25, roughness: 0.2, metalness: 0.4 });
    const { interstage, upperNozzle, collar } = this.buildRocket();
    this.interstage = interstage;
    this.upperNozzle = upperNozzle;
    this.collar = collar;
    this.rocket.add(this.body);
    this.body.position.y = -ROCKET_CENTER;
    scene.add(this.rocket);

    // flame: three nested additive cones
    const flameGeo = new THREE.ConeGeometry(1, 1, 24, 1, true);
    flameGeo.rotateX(Math.PI); // tip down
    flameGeo.translate(0, -0.5, 0); // wide end at the nozzle (y = 0)
    const flameColors: [number, number, number, number][] = [
      [1.0, 0.42, 0.12, 0.42],
      [1.0, 0.68, 0.3, 0.6],
      [1.0, 0.95, 0.82, 0.85],
    ];
    flameColors.forEach(([r, g, b, o], i) => {
      const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(r * 3, g * 3, b * 3), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide });
      this.flameMats.push(m);
      const cone = new THREE.Mesh(flameGeo, m);
      const s = 1 - i * 0.28;
      cone.scale.set(s, 1 - i * 0.3, s);
      this.flame.add(cone);
    });
    this.body.add(this.flame);

    // debris booster and escape capsule share geometry and materials with the rocket
    this.buildDebris();
    this.debris.visible = false;
    scene.add(this.debris);
    const cap = this.buildCapsule();
    this.chute = cap.chute;
    this.capsuleFlame = cap.flame;
    this.capsule.visible = false;
    scene.add(this.capsule);

    // ── sky objects ──
    const rnd = seeded(3);
    const starPos = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const u = rnd() * 2 - 1;
      const th = rnd() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      starPos[i * 3] = Math.cos(th) * r * 8000;
      starPos[i * 3 + 1] = u * 8000;
      starPos[i * 3 + 2] = Math.sin(th) * r * 8000;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xe8e6ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.renderOrder = -9;
    scene.add(this.stars);

    this.moonMat = new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 1, emissive: 0x2a2838, emissiveIntensity: 0.6, transparent: true, opacity: 0, fog: false });
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(110, 48, 32), this.moonMat);
    scene.add(this.moon);

    this.cloudMat = new THREE.SpriteMaterial({ map: softDot(), color: 0xc9cbe0, transparent: true, opacity: 0.22, depthWrite: false });
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(this.cloudMat);
      const alt = 1200 + rnd() * 6000;
      s.position.set((rnd() - 0.5) * 360, visY(alt) + PAD_TOP, -40 - rnd() * 220);
      const w = 60 + rnd() * 110;
      s.scale.set(w, w * 0.28, 1);
      this.clouds.push(s);
      scene.add(s);
    }

    scene.add(this.smoke.points);
    scene.add(this.fire.points);

    this.trailPos = new Float32Array(1500 * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage));
    trailGeo.setDrawRange(0, 0);
    trailGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: BRAND_LIGHT, transparent: true, opacity: 0.75, fog: false }));
    this.trail.frustumCulled = false;
    this.earthPivot.add(this.trail);
  }

  // ───────── construction ─────────
  private track(mesh: Swappable, group: "rocket" | "engine" | "tower" | "pad") {
    this.swap.push({ mesh, real: mesh.material as THREE.Material, group });
    mesh.castShadow = group !== "pad" || mesh.castShadow;
    return mesh;
  }

  private buildPad() {
    const concrete = new THREE.MeshStandardMaterial({ color: 0x2b2c35, roughness: 0.92, metalness: 0.05 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x5d6170, roughness: 0.55, metalness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b0b10, roughness: 1 });

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, PAD_TOP, 40), concrete);
    pad.position.y = PAD_TOP / 2;
    pad.receiveShadow = true;
    pad.castShadow = true;
    this.padGroup.add(this.track(pad, "pad"));
    const trench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 16), dark);
    trench.position.set(0, PAD_TOP + 0.01, 4);
    this.padGroup.add(this.track(trench, "pad"));

    // lattice gantry: one InstancedMesh of beams
    const towerX = -4.2;
    const towerH = 16;
    const w = 1.6;
    const beams: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const add = (x: number, y: number, z: number, sx: number, sy: number, sz: number, rz = 0, rx = 0) => {
      q.setFromEuler(new THREE.Euler(rx, 0, rz));
      p.set(x, y, z);
      s.set(sx, sy, sz);
      beams.push(m.clone().compose(p, q, s));
    };
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(towerX + (dx * w) / 2, PAD_TOP + towerH / 2, (dz * w) / 2, 0.16, towerH, 0.16);
    for (let y = PAD_TOP + 1; y < PAD_TOP + towerH; y += 1.4) {
      add(towerX, y, -w / 2, w, 0.08, 0.08);
      add(towerX, y, w / 2, w, 0.08, 0.08);
      add(towerX - w / 2, y, 0, 0.08, 0.08, w);
      add(towerX + w / 2, y, 0, 0.08, 0.08, w);
      add(towerX, y + 0.7, w / 2, 0.06, 2.1, 0.06, 0.85);
      add(towerX, y + 0.7, -w / 2, 0.06, 2.1, 0.06, -0.85);
    }
    const lattice = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), steel, beams.length);
    beams.forEach((b, i) => lattice.setMatrixAt(i, b));
    lattice.castShadow = true;
    this.padGroup.add(this.track(lattice, "pad"));

    // swing arms (pivot at the tower)
    const armMat = new THREE.MeshStandardMaterial({ color: 0x3a3c48, roughness: 0.6, metalness: 0.5 });
    for (const y of [5.5, 9.5, 12.6]) {
      const pivot = new THREE.Group();
      pivot.position.set(towerX + w / 2, PAD_TOP + y, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, 0.6), armMat);
      arm.position.x = 1.6;
      arm.castShadow = true;
      pivot.add(this.track(arm, "pad"));
      this.arms.push(pivot);
      this.padGroup.add(pivot);
    }

    // beacon and light masts
    this.beacon.position.set(towerX, PAD_TOP + towerH + 0.4, 0);
    this.padGroup.add(this.beacon);
    for (const [x, z] of [[9, 5], [-9, -6]]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 9, 8), steel);
      mast.position.set(x, PAD_TOP + 4.5, z);
      mast.castShadow = true;
      this.padGroup.add(this.track(mast, "pad"));
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.4), this.padBulbs);
      bulb.position.set(x, PAD_TOP + 9.1, z);
      this.padGroup.add(bulb);
      const light = new THREE.PointLight(0xf2f0ff, 0, 45, 1.4);
      light.position.set(x * 0.85, PAD_TOP + 8.5, z * 0.85);
      this.padLights.push(light);
      this.padGroup.add(light);
    }
  }

  private lathe(points: [number, number][], segments = 40) {
    return new THREE.LatheGeometry(
      points.map(([r, y]) => new THREE.Vector2(r, y)),
      segments,
    );
  }

  private buildRocket(): { interstage: THREE.Mesh; upperNozzle: THREE.Mesh; collar: THREE.Mesh } {
    const metal = new THREE.MeshPhysicalMaterial({ color: 0x3a3d48, roughness: 0.32, metalness: 0.9, clearcoat: 0.3 });
    const band = new THREE.MeshStandardMaterial({ color: 0x16171e, roughness: 0.5, metalness: 0.3 });
    const white = new THREE.MeshPhysicalMaterial({ color: 0xd8dae4, roughness: 0.42, metalness: 0.1, clearcoat: 0.6 });
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd6, roughness: 0.4, metalness: 0.6 });

    const nozzleGeo = this.lathe([[0.13, 0.9], [0.16, 0.7], [0.24, 0.3], [0.31, 0]], 24);
    for (const [x, z] of [[0, 0.33], [0.29, -0.17], [-0.29, -0.17]]) {
      const n = new THREE.Mesh(nozzleGeo, metal);
      n.position.set(x, 0, z);
      this.boosterPart.add(this.track(n, "engine"));
    }
    const booster = new THREE.Mesh(this.lathe([[0.62, 0.9], [0.75, 1.0], [0.75, 6.4]], 48), this.paint);
    this.boosterPart.add(this.track(booster, "rocket"));
    for (const y of [1.5, 5.9]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.762, 0.762, 0.16, 48, 1, true), band);
      b.position.y = y;
      this.boosterPart.add(this.track(b, "rocket"));
    }
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.75, -0.25);
    finShape.lineTo(0.75, 0.25);
    finShape.lineTo(0, 1.9);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });
    finGeo.translate(0, 0, -0.03);
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(finGeo, band);
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      fin.position.set(Math.cos(a) * 0.7, 0.9, Math.sin(a) * 0.7);
      fin.rotation.y = -a;
      this.boosterPart.add(this.track(fin, "rocket"));
    }
    const interstage = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.75, 0.5, 48, 1, true), band);
    interstage.position.y = 6.65;
    this.boosterPart.add(this.track(interstage, "rocket"));
    // single-stage look: one continuous painted tube instead of the interstage
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.52, 48, 1, true), this.paint);
    collar.position.y = 6.65;
    this.boosterPart.add(this.track(collar, "rocket"));
    this.body.add(this.boosterPart);

    const upperNozzle = new THREE.Mesh(this.lathe([[0.16, 0.6], [0.2, 0.45], [0.36, 0]], 24), metal);
    upperNozzle.position.y = 6.3;
    this.upperPart.add(this.track(upperNozzle, "engine"));
    const upper = new THREE.Mesh(this.lathe([[0.55, 6.9], [0.62, 6.95], [0.62, 10.2]], 48), this.paint);
    this.upperPart.add(this.track(upper, "rocket"));
    const ub = new THREE.Mesh(new THREE.CylinderGeometry(0.632, 0.632, 0.14, 48, 1, true), band);
    ub.position.y = 7.2;
    this.upperPart.add(this.track(ub, "rocket"));
    const service = new THREE.Mesh(this.lathe([[0.62, 10.2], [0.6, 10.25], [0.6, 10.9]], 40), white);
    this.upperPart.add(this.track(service, "rocket"));
    const capsule = new THREE.Mesh(this.lathe([[0.62, 10.9], [0.6, 10.95], [0.24, 11.95], [0.17, 12.05], [0, 12.08]], 40), white);
    this.upperPart.add(this.track(capsule, "rocket"));
    for (let i = 0; i < 4; i++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), this.windows);
      const a = -0.6 + i * 0.4;
      win.position.set(Math.sin(a) * 0.47, 11.4, Math.cos(a) * 0.47);
      win.rotation.y = a;
      win.rotation.x = -0.35;
      win.userData.crewIndex = i;
      this.upperPart.add(this.track(win, "rocket"));
    }
    this.body.add(this.upperPart);

    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8), towerMat);
    rod.position.y = 12.8;
    this.towerPart.add(this.track(rod, "tower"));
    const motor = new THREE.Mesh(this.lathe([[0.0, 13.9], [0.12, 13.75], [0.16, 13.5], [0.16, 13.05], [0.1, 12.95]], 20), towerMat);
    this.towerPart.add(this.track(motor, "tower"));
    this.body.add(this.towerPart);
    return { interstage, upperNozzle, collar };
  }

  private buildDebris() {
    // a static copy of the booster section, used when it separates
    for (const child of this.boosterPart.children) {
      const mesh = child as THREE.Mesh;
      const copy = new THREE.Mesh(mesh.geometry, mesh.material);
      copy.position.copy(mesh.position);
      copy.rotation.copy(mesh.rotation);
      copy.position.y -= 3.6; // pivot the copy around the booster's middle
      copy.castShadow = true;
      this.debris.add(copy);
    }
  }

  private buildCapsule(): { chute: THREE.Mesh; flame: THREE.Mesh } {
    const white = new THREE.MeshPhysicalMaterial({ color: 0xd8dae4, roughness: 0.42, metalness: 0.1, clearcoat: 0.6 });
    const capsule = new THREE.Mesh(this.lathe([[0.62, 0], [0.6, 0.05], [0.24, 1.05], [0.17, 1.15], [0, 1.18]], 32), white);
    this.capsule.add(capsule);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0xc9ccd6, metalness: 0.6, roughness: 0.4 }));
    tower.position.y = 1.9;
    tower.name = "tower";
    this.capsule.add(tower);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 2.2, 16, 1, true).rotateX(Math.PI).translate(0, -1.1, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.8, 0.8), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    flame.position.y = 0;
    this.capsule.add(flame);
    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: BRAND_LIGHT, roughness: 0.6, side: THREE.DoubleSide, emissive: VIOLET_DEEP, emissiveIntensity: 0.25 }),
    );
    chute.position.y = 4.2;
    chute.visible = false;
    this.capsule.add(chute);
    return { chute, flame };
  }

  // ───────── per-frame ─────────
  resize(width: number, height: number) {
    const scale = (height * this.ctx.renderer.getPixelRatio()) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
    this.smoke.material.uniforms.uScale.value = scale;
    this.fire.material.uniforms.uScale.value = scale;
    this.ctx.bloom.resolution.set(Math.max(64, width / 2), Math.max(64, height / 2));
  }

  event(kind: WorldEvent) {
    switch (kind) {
      case "reset":
        this.smoke.clear();
        this.fire.clear();
        this.trailCount = 0;
        this.trail.geometry.setDrawRange(0, 0);
        this.debris.visible = false;
        this.debrisAge = -1;
        this.capsule.visible = false;
        this.capsuleAge = -1;
        this.liftAge = -1;
        this.lastRocket.set(0, PAD_TOP + ROCKET_CENTER, 0);
        this.rocketVel.set(0, 0, 0);
        break;
      case "liftoff":
        this.liftAge = 0;
        break;
      case "stage_sep": {
        this.rocket.updateMatrixWorld(true);
        this.boosterPart.getWorldPosition(this.tmp);
        this.debris.quaternion.copy(this.rocket.quaternion);
        this.tmp2.set(0, 3.6, 0).applyQuaternion(this.rocket.quaternion);
        this.debris.position.copy(this.tmp).add(this.tmp2);
        this.debrisVel.copy(this.rocketVel).multiplyScalar(0.55);
        this.debrisVel.y -= 2;
        this.debrisSpin = 0.5 + Math.random() * 0.4;
        this.debrisAge = 0;
        this.debris.visible = true;
        this.burst(this.debris.position, 40, 1.2, 0.7, 0.4, 7);
        break;
      }
      case "abort":
      case "crash": {
        this.rocket.updateMatrixWorld(true);
        this.tmp.copy(this.rocket.position);
        this.burst(this.tmp, 160, 3, 1.4, 0.5, 16);
        for (let i = 0; i < 70; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 2 + Math.random() * 8;
          this.smoke.spawn(this.tmp.x, this.tmp.y, this.tmp.z, Math.cos(a) * v, (Math.random() - 0.3) * v, Math.sin(a) * v, 3 + Math.random() * 2, 3, 3, 0.35, 0.35, 0.4, 0.7, 0.8, 0.4);
        }
        this.flash = 1;
        if (kind === "abort") {
          this.tmp2.set(0, 11 - ROCKET_CENTER, 0).applyQuaternion(this.rocket.quaternion);
          this.capsule.position.copy(this.rocket.position).add(this.tmp2);
          this.capsule.quaternion.copy(this.rocket.quaternion);
          this.capsuleVel.copy(this.rocketVel).multiplyScalar(0.3);
          this.capsuleVel.y += 4;
          this.capsuleAge = 0;
          this.capsule.visible = true;
          this.chute.visible = false;
        }
        break;
      }
      case "celebrate": {
        this.flash = 0.8;
        this.burst(this.rocket.position, 90, 0.56 * 2, 0.45 * 2, 1.0 * 2, 10);
        break;
      }
    }
  }

  private burst(at: THREE.Vector3, n: number, r: number, g: number, b: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const k = Math.sqrt(1 - u * u);
      const v = speed * (0.3 + Math.random() * 0.7);
      this.fire.spawn(at.x, at.y, at.z, Math.cos(th) * k * v, u * v, Math.sin(th) * k * v, 0.6 + Math.random() * 0.9, 1.4 + Math.random() * 1.6, -0.5, r, g, b, 1, 1.6, -1);
    }
  }

  private applyStyle(v: LaunchView, time: number) {
    const key = `${v.lit}|${v.painted}|${v.engines}|${v.staged}|${v.tower}`;
    if (key !== this.styleKey) {
      this.styleKey = key;
      for (const s of this.swap) {
        const real =
          s.group === "pad" ? v.lit : s.group === "rocket" ? v.lit && v.painted : s.group === "engine" ? v.lit && v.painted && v.engines : v.tower === 2 && v.painted && v.lit;
        s.mesh.material = real ? s.real : this.ghost;
        s.mesh.castShadow = real;
      }
      this.towerPart.visible = v.tower !== 0;
      this.interstage.visible = v.staged;
      this.collar.visible = !v.staged;
      this.upperPart.scale.set(v.staged ? 1 : 0.75 / 0.62, 1, v.staged ? 1 : 0.75 / 0.62);
      this.upperNozzle.visible = v.staged;
      (this.grid.material as THREE.Material).opacity = v.lit ? 0.035 : 0.3;
      this.groundMat.opacity = v.lit ? 1 : 0.85;
    }
    if (v.color !== this.colorKey) {
      this.colorKey = v.color;
      const ok = /^#[0-9a-fA-F]{6}$/.test(v.color.trim());
      this.paint.color.set(ok ? v.color.trim() : "#f2f4fa");
    }
    let i = 0;
    for (const child of this.upperPart.children) {
      if (child.userData.crewIndex !== undefined) {
        child.visible = i < Math.max(1, Math.min(4, v.crew));
        i++;
      }
    }
    this.ghost.opacity = v.pulseGhost ? 0.4 + 0.35 * Math.sin(time * 5) : 0.5;
  }

  frame(v: LaunchView, dt: number, time: number) {
    this.applyStyle(v, time);
    const alt = Math.max(0, v.altKm);
    const altM = alt * 1000;
    const space = smooth((alt - 20) / 60);

    // ── rocket placement ──
    const dr = v.downrange;
    const x = 60 * Math.log(1 + (dr * 640000) / 40000);
    this.tmp.set(x, PAD_TOP + ROCKET_CENTER + visY(altM), 0);
    if (dt > 0) {
      this.rocketVel.subVectors(this.tmp, this.lastRocket).divideScalar(dt);
      if (this.rocketVel.lengthSq() > 1e6) this.rocketVel.set(0, 0, 0);
    }
    this.lastRocket.copy(this.tmp);
    this.rocket.position.copy(this.tmp);
    this.rocket.rotation.z = (-v.pitchDeg * Math.PI) / 180;
    this.rocket.visible = !v.hidden;
    this.boosterPart.visible = v.boosterAttached;
    this.earthPivot.rotation.z = dr;

    // ── arms swing away after liftoff ──
    if (this.liftAge >= 0) this.liftAge += dt;
    const armOpen = this.liftAge < 0 ? 0 : smooth(this.liftAge / 1.5);
    for (const a of this.arms) a.rotation.y = armOpen * 1.3;

    // ── flame ──
    const fire = v.firing && v.engines && !v.hidden && v.throttle > 0.02;
    this.flame.visible = fire;
    const flick = 0.9 + 0.1 * Math.sin(time * 53) + 0.06 * Math.sin(time * 97 + 1.7);
    if (fire) {
      const len = (3.4 + 3.2 * v.throttle) * (1 + 0.5 * v.vacuum) * flick;
      const wid = (v.boosterAttached ? 0.62 : 0.4) * (1 + 1.4 * v.vacuum);
      this.flame.scale.set(wid, len, wid);
      this.flame.position.y = v.boosterAttached ? 0.02 : 6.32;
      const fade = 1 - 0.45 * v.vacuum;
      this.flameMats[0].opacity = 0.42 * fade;
      this.flameMats[1].opacity = 0.6 * fade;
      this.flameMats[2].opacity = 0.85 * fade;
    }
    this.flame.updateMatrixWorld(true);
    this.tmp2.set(0, 0, 0);
    this.flame.localToWorld(this.tmp2); // nozzle exit in world space
    this.flameLight.position.copy(this.tmp2);
    this.flameLight.intensity = fire ? 260 * v.throttle * flick * (1 - 0.7 * v.vacuum) : 0;

    // ── exhaust particles ──
    if (fire) {
      const p = (v.pitchDeg * Math.PI) / 180;
      const ex = -Math.sin(p); // exhaust direction
      const ey = -Math.cos(p);
      const nearGround = alt < 0.25;
      this.emit += dt * (nearGround ? 140 : 70 * (1 - v.vacuum * 0.7)) * v.throttle;
      while (this.emit >= 1) {
        this.emit -= 1;
        const j = (Math.random() - 0.5) * 2;
        const k = (Math.random() - 0.5) * 2;
        if (nearGround) {
          // billowing ground cloud pushed out sideways from the trench
          const a = Math.random() * Math.PI * 2;
          const sp = 8 + Math.random() * 14;
          this.smoke.spawn(this.tmp2.x + j, PAD_TOP + 0.6, this.tmp2.z + k, Math.cos(a) * sp, 1 + Math.random() * 3, Math.sin(a) * sp * 0.6 + 4, 3 + Math.random() * 2.5, 2.4, 3.2, 0.62, 0.62, 0.66, 0.55, 0.6, 0.4);
        } else {
          const sp = 10 + Math.random() * 6;
          this.smoke.spawn(this.tmp2.x + j * 0.4, this.tmp2.y, this.tmp2.z + k * 0.4, ex * sp + j * 1.5, ey * sp, k * 1.5, 2.5 + Math.random() * 2, 1.6, 4, 0.55, 0.55, 0.6, 0.5 * (1 - v.vacuum * 0.9), 0.4, 0);
        }
        this.fire.spawn(this.tmp2.x + j * 0.25, this.tmp2.y, this.tmp2.z + k * 0.25, ex * 18 + j * 2, ey * 18, k * 2, 0.25 + Math.random() * 0.2, 1.1, -0.5, 1.6, 0.8, 0.35, 0.9, 0.5, 0);
      }
    }
    this.smoke.update(dt);
    this.fire.update(dt);

    // ── debris + escape capsule ──
    if (this.debrisAge >= 0) {
      this.debrisAge += dt;
      this.debrisVel.y -= 6 * dt;
      this.debris.position.addScaledVector(this.debrisVel, dt);
      this.debris.rotation.z += this.debrisSpin * dt;
      this.debris.rotation.x += this.debrisSpin * 0.4 * dt;
      if (this.debrisAge > 10) {
        this.debris.visible = false;
        this.debrisAge = -1;
      }
    }
    if (this.capsuleAge >= 0) {
      this.capsuleAge += dt;
      const burn = this.capsuleAge < 1.1;
      this.capsuleFlame.visible = burn;
      if (burn) this.capsuleVel.y += 30 * dt;
      else this.capsuleVel.y -= 9 * dt;
      this.chute.visible = this.capsuleAge > 1.6;
      if (this.chute.visible) {
        this.capsuleVel.multiplyScalar(1 - Math.min(1, dt * 2.5));
        this.capsuleVel.y = Math.max(this.capsuleVel.y, -2);
        this.capsule.rotation.z *= 1 - Math.min(1, dt * 2);
        this.capsule.rotation.x *= 1 - Math.min(1, dt * 2);
        this.chute.scale.setScalar(Math.min(1, (this.capsuleAge - 1.6) * 2));
        (this.capsule.getObjectByName("tower") as THREE.Object3D).visible = false;
      }
      this.capsule.position.addScaledVector(this.capsuleVel, dt);
    }

    // ── trail ──
    if (v.trail && v.flying && alt > 0.05) {
      this.trailTimer += dt;
      if (this.trailTimer > 0.12 && this.trailCount < 1500) {
        this.trailTimer = 0;
        // stored in planet space, so the path rolls away with the ground and shows the curve
        this.earthPivot.updateMatrixWorld(true);
        this.tmp.copy(this.rocket.position);
        this.earthPivot.worldToLocal(this.tmp);
        this.trailPos[this.trailCount * 3] = this.tmp.x;
        this.trailPos[this.trailCount * 3 + 1] = this.tmp.y;
        this.trailPos[this.trailCount * 3 + 2] = this.tmp.z;
        this.trailCount++;
        this.trail.geometry.setDrawRange(0, this.trailCount);
        this.trail.geometry.attributes.position.needsUpdate = true;
      }
    }
    this.trail.visible = v.trail;

    // ── environment by altitude ──
    const lowSky = v.lit ? 1 - space : 0;
    this.skyTop.copy(SKY_TOP).lerp(BG, 1 - lowSky);
    this.skyBottom.copy(SKY_LOW).lerp(BG, 1 - lowSky);
    if (!v.lit) {
      this.skyTop.copy(BG);
      this.skyBottom.copy(SKY_BLUEPRINT);
    }
    this.fog.color.copy(this.skyBottom);
    this.fog.density = lerp(v.lit ? 0.0032 : 0.0045, 0.00002, smooth(alt / 25));
    (this.scene.background as THREE.Color).copy(this.skyTop);
    this.starMat.opacity = v.lit ? 0.12 + 0.88 * space : 0.08;
    const am = this.atmosphere.material as THREE.ShaderMaterial;
    // the shell only reads as a glowing limb from outside it
    const outside = smooth((this.camera.position.distanceTo(this.earthPivot.position) - RE * 1.035) / 300);
    am.uniforms.uStrength.value = outside * smooth((alt - 8) / 40) * (0.3 + 0.35 * space);
    this.cloudMat.opacity = v.lit ? 0.22 * (1 - smooth(alt / 14)) : 0;
    this.hemi.intensity = v.lit ? 0.55 : 0.25;
    this.key.intensity = v.lit ? 2.2 : 0.6;
    const blink = Math.sin(time * 3.5) > 0 ? 1 : 0.25;
    (this.beacon.material as THREE.MeshBasicMaterial).color.copy(BRAND).multiplyScalar(v.lit ? 1.6 * blink : 0.3);
    this.padBulbs.color.setRGB(v.lit ? 2.4 : 0.15, v.lit ? 2.35 : 0.15, v.lit ? 2.2 : 0.2);
    for (const l of this.padLights) l.intensity = v.lit ? 70 : 0;
    this.windows.emissiveIntensity = v.painted ? 0.6 : 0;

    // ── moon ──
    const moonA = v.lit ? smooth((alt - 35) / 40) : 0;
    this.moonMat.opacity = Math.max(moonA, v.outro);
    this.moon.visible = this.moonMat.opacity > 0.01;

    // ── camera ──
    const cam = this.camera;
    const viewH = 54;
    const baseD = viewH / 2 / Math.tan((cam.fov * Math.PI) / 360);
    const aspectBoost = cam.aspect < 0.62 ? 0.62 / cam.aspect : 1; // keep the gantry in narrow portraits
    const D = baseD * Math.min(1.5, aspectBoost) * lerp(1, 1.2, smooth(alt / 70)) * lerp(1, 2.6, v.outro);
    const viewAtD = 2 * D * Math.tan((cam.fov * Math.PI) / 360);
    this.target.copy(this.rocket.position);
    this.target.y += 0.15 * viewAtD * (1 - v.outro);
    const sway = v.reduced ? 0 : 0.1 * Math.sin(time * 0.07) + 0.04 * Math.sin(time * 0.19);
    const az = 0.5 + sway + v.outro * 0.6;
    const el = lerp(0.09, 0.62, smooth(alt / 60)) - v.outro * 0.25;
    this.camPos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(D).add(this.target);
    if (!v.reduced && fire && alt < 3) {
      const a = 0.12 * v.throttle * (1 - alt / 3);
      this.shake.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a, 0);
      this.camPos.add(this.shake);
    }
    cam.position.copy(this.camPos);
    cam.lookAt(this.target);

    // sky dome, stars and moon follow the camera
    this.sky.position.copy(cam.position);
    this.stars.position.copy(cam.position);
    // the moon hangs upper-right in view, and swings toward the centre during the outro
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements;
    const mx = lerp(0.42, 0.04, v.outro) * Math.min(1, cam.aspect);
    const my = lerp(0.3, -0.12, v.outro);
    const md = lerp(3400, 1500, v.outro);
    this.tmp.set(-e[8] + e[0] * mx + e[4] * my, -e[9] + e[1] * mx + e[5] * my, -e[10] + e[2] * mx + e[6] * my).normalize().multiplyScalar(md);
    this.moon.position.copy(cam.position).add(this.tmp);
    this.moon.rotation.y = time * 0.01;

    // key light + shadow box follow the rocket near the ground
    this.key.target.position.copy(this.rocket.position);
    this.key.position.copy(this.rocket.position).add(this.tmp.set(-40, 70, 45));
    this.rim.position.copy(this.rocket.position).add(this.tmp.set(-10, 8, -12));

    // flash
    this.flash = Math.max(0, this.flash - dt * 1.5);
    this.ctx.bloom.strength = 0.7 + (v.reduced ? 0 : this.flash * 1.2);
  }

  dispose() {
    // geometry/material cleanup is done by useThreeStage (disposeScene); nothing else is held
    this.styleKey = "";
  }
}
