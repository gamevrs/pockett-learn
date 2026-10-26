/**
 * A small pure-TypeScript SHA-256 / HMAC / base64url, enough to issue and verify real HS256 tokens
 * without any platform crypto. The round constants come from the first primes, so there is no table
 * to mistype.
 */

const primes = (n: number): number[] => {
  const out: number[] = [];
  for (let c = 2; out.length < n; c++) if (out.every((p) => c % p !== 0)) out.push(c);
  return out;
};
const frac = (x: number) => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
const K = primes(64).map((p) => frac(Math.cbrt(p)));
const H0 = primes(8).map((p) => frac(Math.sqrt(p)));

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 4294967296));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const h = Uint32Array.from(H0);
  const w = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  h.forEach((v, i) => ov.setUint32(i * 4, v));
  return out;
}

export function hmacSha256(key: Uint8Array, msg: Uint8Array): Uint8Array {
  const k = new Uint8Array(64);
  k.set(key.length > 64 ? sha256(key) : key);
  const inner = new Uint8Array(64 + msg.length);
  const outer = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) {
    inner[i] = k[i] ^ 0x36;
    outer[i] = k[i] ^ 0x5c;
  }
  inner.set(msg, 64);
  outer.set(sha256(inner), 64);
  return sha256(outer);
}

const utf8 = (s: string) => new TextEncoder().encode(s);
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function b64urlBytes(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += ALPHABET[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += ALPHABET[n & 63];
  }
  return out;
}

export function b64urlDecode(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9_-]/g, "");
  const out: number[] = [];
  let bits = 0;
  let acc = 0;
  for (const ch of clean) {
    acc = (acc << 6) | ALPHABET.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export const b64urlText = (s: string) => b64urlBytes(utf8(s));
export const b64urlToText = (s: string) => new TextDecoder().decode(b64urlDecode(s));

export interface Claims {
  sub: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
}

export function signJwt(claims: Claims, secret: string): string {
  const head = b64urlText(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64urlText(JSON.stringify(claims));
  const sig = b64urlBytes(hmacSha256(utf8(secret), utf8(`${head}.${body}`)));
  return `${head}.${body}.${sig}`;
}

export type JwtCheck = { ok: true; claims: Claims } | { ok: false; reason: "malformed" | "signature" | "expired" };

export function verifyJwt(token: string, secret: string, nowSeconds: number): JwtCheck {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const expected = b64urlBytes(hmacSha256(utf8(secret), utf8(`${parts[0]}.${parts[1]}`)));
  let diff = expected.length ^ parts[2].length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (parts[2].charCodeAt(i) || 0);
  if (diff !== 0) return { ok: false, reason: "signature" };
  try {
    const claims = JSON.parse(b64urlToText(parts[1])) as Claims;
    if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return { ok: false, reason: "malformed" };
    if (claims.exp <= nowSeconds) return { ok: false, reason: "expired" };
    return { ok: true, claims };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

/** 32-bit FNV-1a as 8 hex digits: a cheap, stable fingerprint for ETags and request bodies. */
export function fingerprint(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16).padStart(8, "0");
}
