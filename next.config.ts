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

/**
 * Content-Security-Policy. Static (no nonces) so pages stay prerendered, which means inline scripts are allowed;
 * what it buys is that the page can only load code from, send data to and be framed by the origins listed here.
 *  - 'unsafe-eval': learner JavaScript and the lesson checks are compiled with the Function constructor.
 *  - 'wasm-unsafe-eval': Python (Pyodide) and SQL (sql.js) are WebAssembly.
 *  - connect-src is the one that matters most: code on the page can't send anything to a host not listed here.
 *  - frame-ancestors 'none': no other site can embed pockett (clickjacking).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${CDN} ${ADS}`,
  `style-src 'self' 'unsafe-inline' ${CDN}`,
  `img-src 'self' data: blob: ${ADS}`,
  `font-src 'self' data: ${CDN}`,
  "media-src 'self' data: blob:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE.replace(/^https:/, "wss:")} ${CDN} ${PYPI} ${ADS}${isDev ? " ws: http://localhost:*" : ""}`,
  `worker-src 'self' blob: data: ${CDN}`,
  `frame-src ${ADS || "'none'"}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), display-capture=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
