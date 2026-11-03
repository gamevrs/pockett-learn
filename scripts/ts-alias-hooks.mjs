// Node resolve hook: maps "@/x" to src/x and resolves extensionless / directory imports to .ts/.tsx/index.ts(x).
import { existsSync, statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const SRC = process.env.PL_SRC ? path.resolve(process.env.PL_SRC) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const EXTS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];
function tryResolve(abs) {
  for (const e of EXTS) {
    const p = abs + e;
    if (existsSync(p) && statSync(p).isFile()) return pathToFileURL(p).href;
  }
  return null;
}
export async function resolve(specifier, context, next) {
  let abs = null;
  if (specifier.startsWith("@/")) abs = path.join(SRC, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    abs = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (abs) {
    const url = tryResolve(abs);
    if (url) return next(url, context);
  }
  return next(specifier, context);
}
