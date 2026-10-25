"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ACCENT, BLOOM, EXPOSURE } from "./stage-style";

/**
 * Shared three.js plumbing for scenes: renderer, tone mapping, soft shadows, bloom,
 * resize handling, pausing while off-screen/hidden, and full GPU cleanup on unmount
 * (routes stay mounted-but-hidden under React Activity, so cleanup really matters).
 */

export interface ThreeContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  bloom: UnrealBloomPass;
  /** CSS pixel size of the canvas */
  size: { width: number; height: number };
}

export interface ThreeApp {
  /** Called every visible frame with seconds since last frame and total elapsed time. */
  frame(dt: number, time: number): void;
  /** Called after the canvas changes size (camera aspect is already updated). */
  resize?(width: number, height: number): void;
  dispose?(): void;
}

export const BRAND = new THREE.Color(ACCENT[400]);
export const BRAND_LIGHT = new THREE.Color(ACCENT[200]);

export function useThreeStage(canvasRef: RefObject<HTMLCanvasElement | null>, create: (ctx: ThreeContext) => ThreeApp) {
  const createRef = useRef(create);
  useEffect(() => {
    createRef.current = create;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      return; // no WebGL: the scene simply stays blank
    }
    // 1.5 keeps edges crisp while costing ~45% fewer pixels than 2x on retina/4K screens
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = EXPOSURE;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    // near=4 (not 1) gives far better depth precision: no z-fighting between stacked surfaces
    const camera = new THREE.PerspectiveCamera(38, 1, 4, 6000);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM.strength, BLOOM.radius, BLOOM.threshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const ctx: ThreeContext = { renderer, scene, camera, bloom, size: { width: 1, height: 1 } };
    const app = createRef.current(ctx);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      if (width === ctx.size.width && height === ctx.size.height) return;
      ctx.size = { width, height };
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      app.resize?.(width, height);
    };

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);
    // Resizing reallocates the bloom render targets, so apply it at most once per frame
    // (dragging a panel splitter fires the observer continuously).
    let resizePending = false;
    const ro = new ResizeObserver(() => {
      resizePending = true;
    });
    ro.observe(canvas);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible || document.hidden) return;
      if (resizePending) {
        resizePending = false;
        resize();
      }
      if (ctx.size.width < 2) return;
      app.frame(dt, clock.elapsedTime);
      composer.render();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      app.dispose?.();
      disposeScene(scene);
      composer.dispose();
      renderer.dispose();
    };
  }, [canvasRef]);
}

export function disposeScene(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    mesh.geometry?.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats) {
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) value.dispose();
      m.dispose();
    }
  });
}

/** Fit a perspective camera so a box of the given size (on the ground plane) fills the view. */
export function fitDistance(camera: THREE.PerspectiveCamera, width: number, depth: number, margin = 1.12) {
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const byHeight = (depth * margin) / 2 / Math.tan(vFov / 2);
  const byWidth = (width * margin) / 2 / Math.tan(hFov / 2);
  return Math.max(byHeight, byWidth);
}
