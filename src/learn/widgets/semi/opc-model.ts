// Pure logic for the semi-opc widget: a mask grid, a Gaussian-blurred "aerial image", and a threshold "resist". No UI imports.

export const OPC = {
  /** Grid size in cells. */
  nx: 64,
  ny: 40,
  /** Target line: centred on row boundary yc, width wt cells, from the left edge to the line end xe. */
  wt: 6,
  xe: 46,
  yc: 20,
  /** Gaussian sigma of the optics, cells. */
  sigma: 3.8,
  /** The hammerhead's wide part spans this many cells back from the line end (plus the extension). */
  head: 6,
  /** Column where the width is measured, far from the end. */
  probeX: 16,
  /** Tolerance, cells. */
  tol: 0.5,
  threshold: 0.5,
};

/** Slider ranges and steps. */
export const OPC_RANGE = { bias: [0, 3, 0.5], ext: [0, 6, 1], head: [0, 4, 1] };

function kernel(sigma: number): number[] {
  const r = Math.ceil(3 * sigma);
  const k: number[] = [];
  let s = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k.push(v);
    s += v;
  }
  return k.map((v) => v / s);
}
const K = kernel(OPC.sigma);
const R = (K.length - 1) / 2;

/**
 * Mask transmission per cell, 0..1 (1 = fully clear). A cell the drawn shape only partly covers gets its covered
 * fraction, so half-cell biases work.
 */
export function buildMask(bias: number, ext: number, head: number): Float32Array {
  const { nx, ny, wt, xe, yc, head: lh } = OPC;
  const m = new Float32Array(nx * ny);
  const hw = wt / 2 + bias;
  for (let x = 0; x < nx; x++) {
    if (x + 1 > xe + ext + 1e-9) continue;
    const half = head > 0 && x + 0.5 > xe - lh ? hw + head : hw;
    for (let y = 0; y < ny; y++) {
      const lo = Math.max(y - yc, -half);
      const hi = Math.min(y + 1 - yc, half);
      m[y * nx + x] = Math.max(0, hi - lo);
    }
  }
  return m;
}

/** Separable Gaussian blur, zero outside the grid. */
export function blur(mask: Float32Array): Float32Array {
  const { nx, ny } = OPC;
  const tmp = new Float32Array(nx * ny);
  const out = new Float32Array(nx * ny);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      let s = 0;
      for (let i = -R; i <= R; i++) {
        const xx = x + i;
        if (xx >= 0 && xx < nx) s += K[i + R] * mask[y * nx + xx];
      }
      tmp[y * nx + x] = s;
    }
  }
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      let s = 0;
      for (let i = -R; i <= R; i++) {
        const yy = y + i;
        if (yy >= 0 && yy < ny) s += K[i + R] * tmp[yy * nx + x];
      }
      out[y * nx + x] = s;
    }
  }
  return out;
}

/** Printed tip position along the centre row (sub-cell, linear interpolation), in cell-edge coordinates. */
export function tipX(img: Float32Array): number {
  const { nx, yc, xe, threshold: th } = OPC;
  const row = yc; // row just below the centre line; the picture is symmetric about it
  let x = Math.min(nx - 2, Math.floor(xe + 8));
  while (x > 0 && img[row * nx + x] < th) x--;
  const a = img[row * nx + x];
  const b = img[row * nx + x + 1];
  return x + 0.5 + (a - th) / (a - b || 1e-9);
}

/** Printed half-width at column probeX (sub-cell), measured outward from the centre line. */
export function halfWidth(img: Float32Array): number {
  const { nx, ny, yc, probeX, threshold: th } = OPC;
  let y = yc;
  while (y < ny - 1 && img[(y + 1) * nx + probeX] >= th) y++;
  const a = img[y * nx + probeX];
  const b = img[Math.min(ny - 1, y + 1) * nx + probeX];
  return y + 0.5 - yc + (a - th) / (a - b || 1e-9);
}

export interface OpcResult {
  mask: Float32Array;
  img: Float32Array;
  endEpe: number;
  widthEpe: number;
}

export function simulate(bias: number, ext: number, head: number): OpcResult {
  const mask = buildMask(bias, ext, head);
  const img = blur(mask);
  return { mask, img, endEpe: tipX(img) - OPC.xe, widthEpe: halfWidth(img) - OPC.wt / 2 };
}

export const withinTol = (v: number) => Math.abs(v) <= OPC.tol;
