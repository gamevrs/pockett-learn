import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Origins the app talks to. Everything else is blocked by the Content-Security-Policy below. */
const SUPABASE = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://irrzwowbetnyppvxflvi.supabase.co").origin;
// The code editor (Monaco), Pyodide and sql.js are loaded from here, pinned to exact versions.
const CDN = "https://cdn.jsdelivr.net";
// micropip installs pinned pure-Python wheels (e.g. graphql-core) from PyPI.
const PYPI = "https://pypi.org https://files.pythonhosted.org";
// AdSense needs its own hosts, but only once ads are switched on.
const ADS = process.env.NEXT_PUBLIC_ADSENSE_CLIENT
  ? "https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.gstatic.com https://*.adtrafficquality.google"
  : "";

// Learner Python and JavaScript run in the page /frame, on a second hostname of this same deployment, so they can't reach the
// signed-in site's storage (see src/engine/frame/origin.ts). The site frames it; the frame can only be framed by the site.
const CONFIGURED_FRAME = process.env.NEXT_PUBLIC_CODE_FRAME_ORIGIN ? new URL(process.env.NEXT_PUBLIC_CODE_FRAME_ORIGIN) : null;
const FRAME_HOST = CONFIGURED_FRAME?.host ?? "pockett-zeta.vercel.app";
const FRAME_ORIGINS = [
  CONFIGURED_FRAME?.origin ?? "",
  "https://pockett-zeta.vercel.app",
  ...(isDev ? ["http://localhost:*", "http://127.0.0.1:*"] : []),
]
  .filter(Boolean)
  .join(" ");
const SITE_ORIGINS = "https://www.pockett.ai https://pockett.ai";

/**
 * Content-Security-Policy. Static (no nonces) so pages stay prerendered, which means inline scripts are allowed;
 * what it buys is that the page can only load code from, send data to and be framed by the origins listed here.
 *  - 'unsafe-eval': learner JavaScript and the lesson checks are compiled with the Function constructor.
 *  - 'wasm-unsafe-eval': Python (Pyodide) and SQL (sql.js) are WebAssembly.
 *  - connect-src is the one that matters most: code on the page can't send anything to a host not listed here.
 *  - frame-ancestors 'none': no other site can embed pockett (clickjacking). frame-src lists the code frame.
 * The code frame gets the same policy minus Supabase and ads (it never talks to either), and may be framed only by the site.
 */
function policy(frame: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${CDN} ${frame ? "" : ADS}`,
    `style-src 'self' 'unsafe-inline' ${CDN}`,
    `img-src 'self' data: blob: ${frame ? "" : ADS}`,
    `font-src 'self' data: ${CDN}`,
    "media-src 'self' data: blob:",
    frame
      ? `connect-src 'self' ${CDN} ${PYPI}${isDev ? " ws: http://localhost:* http://127.0.0.1:*" : ""}`
      : `connect-src 'self' ${SUPABASE} ${SUPABASE.replace(/^https:/, "wss:")} ${CDN} ${PYPI} ${ADS}${isDev ? " ws: http://localhost:*" : ""}`,
    `worker-src 'self' blob: data: ${CDN}`,
    frame ? "frame-src 'none'" : `frame-src 'self' ${FRAME_ORIGINS} ${ADS}`,
    frame ? `frame-ancestors 'self' ${SITE_ORIGINS}${isDev ? " http://localhost:* http://127.0.0.1:*" : ""}` : "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ]
    .map((d) => d.replace(/\s+/g, " ").trim())
    .join("; ");
}

const commonHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), display-capture=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const siteHeaders = [
  { key: "Content-Security-Policy", value: policy(false) },
  { key: "X-Frame-Options", value: "DENY" },
  ...commonHeaders,
];

// no X-Frame-Options here: the site frames this page, and frame-ancestors says who may
const frameHeaders = [
  { key: "Content-Security-Policy", value: policy(true) },
  // its own agent cluster, so it never shares a process-wide resource with the site's pages
  { key: "Origin-Agent-Cluster", value: "?1" },
  ...commonHeaders,
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // the dev server is reached as localhost and as 127.0.0.1 (the code frame is served from whichever the page is not on)
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      { source: "/", headers: siteHeaders },
      { source: "/:path((?!frame$|frame/).+)", headers: siteHeaders },
      { source: "/frame", headers: frameHeaders },
      { source: "/frame/:path*", headers: frameHeaders },
      // the build's own files are public: let the frame's fallback (an opaque origin) load the fonts too
      { source: "/_next/static/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
    ];
  },
  async redirects() {
    // The frame's hostname only ever serves /frame (and the assets it needs): everything else goes to the real site,
    // so that origin never shows the account page or the app.
    const onFrameHost = [{ type: "host" as const, value: FRAME_HOST }];
    return [
      { source: "/", has: onFrameHost, destination: "https://www.pockett.ai/", permanent: true },
      { source: "/:path((?!frame$|frame/|_next/|.*\\.).+)", has: onFrameHost, destination: "https://www.pockett.ai/:path", permanent: true },
    ];
  },
};

export default nextConfig;
