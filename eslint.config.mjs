import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // the native app (Expo) has its own package.json, toolchain and eslint config (mobile/README.md)
    "mobile/**",
    // Git worktrees and other agent state; never lint these.
    ".claude/**",
  ]),
]);

export default eslintConfig;
