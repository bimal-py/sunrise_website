import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler's experimental rule fires on legitimate, intentional
      // patterns used here (one-time mount gates, layout measurement that sets
      // size/position state from a ResizeObserver/rAF, and resets on re-layout).
      // Keep it visible as a warning rather than a hard error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // Text from the dashboard is compiled only through lib/mdx/compile.ts, which removes unsafe JSX.
    ignores: ["lib/mdx/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [{ name: "next-mdx-remote/rsc", message: "Use compileSafeMdx from @/lib/mdx/compile." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
