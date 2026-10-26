import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { ThreeContext } from "./three-kit";

/**
 * Pockett Stage: the design system for every 3D demo.
 *
 * One palette, one set of glow levels, one lighting rig and one post-processing baseline, so the
 * garage, the launch pad and the beat machine read as the same product. Scenes should take colours
 * from here instead of writing hex values inline. See docs/STAGE_DESIGN_SYSTEM.md for the rules.
 */

// ───────────────────────── colour ─────────────────────────

/** Neutral greys with no hue, dark → light. Structure, ground, chassis, trim. */
export const NEUTRAL = {
  950: "#0a0a0a",
  900: "#121212",
  850: "#181818",
  800: "#1f1f1f",
  700: "#2b2b2b",
  600: "#3b3b3b",
  500: "#555555",
  400: "#777777",
  300: "#9f9f9f",
  200: "#c8c8c8",
  100: "#e5e5e5",
  50: "#f4f4f4",
} as const;

/**
 * The single accent (pastel lime, hue ~85deg). Only for things the learner's code switched on.
 * 400 is the brand fill (same as --primary); 300 is its hover. 500-900 step down in lightness for
 * steady glows, deep rubber and shaded faces. 700 is also the light-theme text olive (--brand).
 */
export const ACCENT = {
  100: "#effbe0",
  200: "#e0f6c1",
  300: "#d3f3a4",
  400: "#c5ee8a", // brand
  500: "#abd373",
  600: "#83ab49",
  700: "#4b7411",
  800: "#354e12",
  900: "#19240a",
} as const;

/** Signals: state the learner must notice. Never decorative. */
export const SIGNAL = {
  danger: "#f87171",
  dangerDeep: "#b91c1c",
  warning: "#fbbf24",
  /** warm light sources: headlights, flames, engine glow */
  heat: "#ffb26b",
  heatCore: "#fff4dc",
  white: "#ffffff",
} as const;

/** Semantic roles. Prefer these over the raw ramps. */
export const ROLE = {
  void: NEUTRAL[950], // background + fog: every scene sits in the same darkness
  floor: "#0e0e0e",
  structure: NEUTRAL[700], // walls, posts, frames
  structureDark: NEUTRAL[800],
  surface: NEUTRAL[600], // panels, decks, road
  surfaceLight: NEUTRAL[300], // painted lines, light trim
  marking: NEUTRAL[200],
  label: NEUTRAL[50],
  blueprint: ACCENT[400], // wireframe before a part exists
  alive: ACCENT[400], // a part the learner's code powers
  aliveSoft: ACCENT[700],
  aliveBright: ACCENT[200],
} as const;

export const color = (hex: string) => new THREE.Color(hex);

// ───────────────────────── glow ─────────────────────────

/**
 * emissiveIntensity levels. Rules:
 *  - steady elements use at most `soft`; `medium` is for one focal element per scene
 *  - `strong` and `flash` only for transient events (< ~600 ms), then decay back
 */
export const GLOW = {
  none: 0,
  faint: 0.12,
  soft: 0.3,
  medium: 0.6,
  strong: 1.1,
  flash: 2.2,
} as const;
export type GlowLevel = keyof typeof GLOW;

/** Post-processing baseline. Scenes may add a transient `boost` for events, capped at +0.35. */
export const BLOOM = {
  strength: 0.3,
  radius: 0.4,
  threshold: 0.86,
  blueprintStrength: 0.45, // wireframe-only scenes have nothing bright, so allow a touch more
  maxBoost: 0.35,
} as const;

export const EXPOSURE = 1.0;

// ───────────────────────── materials ─────────────────────────

type Opts = Partial<THREE.MeshStandardMaterialParameters>;

export const material = {
  /** Unpolished: ground, rubber, fabric, concrete. */
  matte: (hex: string, o: Opts = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92, metalness: 0, ...o }),
  /** Painted or plastic parts. */
  satin: (hex: string, o: Opts = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.1, ...o }),
  /** Machined metal: rims, rails, engine bells. */
  metal: (hex: string = NEUTRAL[200], o: Opts = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.3, metalness: 0.85, ...o }),
  /** Car paint and other hero surfaces (the learner often picks this colour). */
  paint: (hex: string) => new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.5, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: NEUTRAL[950], metalness: 0.3, roughness: 0.06, clearcoat: 1 }),
  /** Self-lit element. The base colour is a darkened copy so it still reads when the glow is off. */
  glow: (hex: string, level: GlowLevel = "soft", o: Opts = {}) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex).multiplyScalar(0.35),
      emissive: hex,
      emissiveIntensity: GLOW[level],
      roughness: 0.5,
      ...o,
    }),
  /** Blueprint wireframe for parts that don't exist yet. */
  blueprint: (opacity = 0.14) => new THREE.MeshBasicMaterial({ color: ROLE.blueprint, wireframe: true, transparent: true, opacity, depthWrite: false }),
  /** Faint fill behind blueprint wireframes. */
  ghost: (opacity = 0.03) => new THREE.MeshBasicMaterial({ color: ROLE.blueprint, transparent: true, opacity, depthWrite: false }),
  line: (hex: string, opacity = 1) => new THREE.LineBasicMaterial({ color: hex, transparent: opacity < 1, opacity }),
};

// ───────────────────────── environment ─────────────────────────

export interface StageRig {
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  dispose(): void;
}

export interface StageRigOptions {
  /** Half-size of the area that needs shadows (scene units). */
  shadowExtent: number;
  /** Direction the key light comes from (normalised internally); defaults to high front-left. */
  keyFrom?: [number, number, number];
  /** FogExp2 density, or linear [near, far]. */
  fog?: number | [number, number];
  /** 0..1 strength of the image-based reflections (paint, metal). */
  reflections?: number;
}

/** Background, fog, reflections and the three-light rig every scene shares. */
export function setupStage(ctx: ThreeContext, opts: StageRigOptions): StageRig {
  const { scene, renderer } = ctx;
  renderer.toneMappingExposure = EXPOSURE;
  scene.background = color(ROLE.void);
  scene.fog = Array.isArray(opts.fog)
    ? new THREE.Fog(ROLE.void, opts.fog[0], opts.fog[1])
    : new THREE.FogExp2(ROLE.void, opts.fog ?? 0.0003);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;
  scene.environmentIntensity = opts.reflections ?? 0.35;

  const e = opts.shadowExtent;
  const hemi = new THREE.HemisphereLight(NEUTRAL[100], NEUTRAL[950], 0.5);
  const key = new THREE.DirectionalLight(SIGNAL.white, 1.6);
  const dir = new THREE.Vector3(...(opts.keyFrom ?? [-0.45, 0.85, 0.35])).normalize();
  key.position.copy(dir.multiplyScalar(e * 1.6));
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: e * 4 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = e / 900;
  const rim = new THREE.DirectionalLight(ACCENT[400], 0.22); // a whisper of brand on silhouettes
  rim.position.set(e * 0.8, e * 0.3, -e * 0.7);
  scene.add(hemi, key, rim);

  return {
    hemi,
    key,
    rim,
    dispose() {
      env.dispose();
    },
  };
}

/** Apply the bloom baseline, plus an optional transient boost (0..1 of the allowed maximum). */
export function applyBloom(ctx: ThreeContext, { blueprint = false, boost = 0 }: { blueprint?: boolean; boost?: number } = {}) {
  ctx.bloom.strength = (blueprint ? BLOOM.blueprintStrength : BLOOM.strength) + Math.min(1, Math.max(0, boost)) * BLOOM.maxBoost;
  ctx.bloom.radius = BLOOM.radius;
  ctx.bloom.threshold = BLOOM.threshold;
}

/**
 * A ground grid that doesn't shimmer: a tiled, mipmapped texture instead of GridHelper lines
 * (1px lines at grazing angles produce moiré). Lines are neutral white at low opacity.
 */
export function createFloor(
  ctx: ThreeContext,
  { size, cell, y = 0, majorEvery = 4 }: { size: number; cell: number; y?: number; majorEvery?: number },
) {
  const px = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const g = canvas.getContext("2d")!;
  g.fillStyle = ROLE.floor;
  g.fillRect(0, 0, px, px);
  const step = px / majorEvery;
  g.strokeStyle = "rgba(255,255,255,0.05)";
  g.lineWidth = 2;
  for (let i = 0; i <= majorEvery; i++) {
    g.beginPath();
    g.moveTo(i * step, 0);
    g.lineTo(i * step, px);
    g.moveTo(0, i * step);
    g.lineTo(px, i * step);
    g.stroke();
  }
  g.strokeStyle = "rgba(255,255,255,0.09)";
  g.lineWidth = 3;
  g.strokeRect(0, 0, px, px);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(size / (cell * majorEvery), size / (cell * majorEvery));
  tex.anisotropy = ctx.renderer.capabilities.getMaxAnisotropy();
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ color: SIGNAL.white, map: tex, roughness: 1, metalness: 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}
