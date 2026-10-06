import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The calculation core must stay a pure module: no UI, no framework, no browser APIs.
    files: ["src/domain/**/*.ts", "src/contract/**/*.ts", "src/config/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["react", "react-dom", "next", "next/*", "next-intl", "next-intl/*", "zustand", "@/ui/*", "@/features/*", "@/state/*", "@/services/*"] },
      ],
      "no-restricted-globals": ["error", "window", "document", "localStorage", "sessionStorage", "fetch"],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "api/**", ".claude/**", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
