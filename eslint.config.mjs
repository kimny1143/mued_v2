import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      // Build outputs
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      // Test outputs
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      // Scripts (CommonJS, require() is intentional)
      "scripts/mcp/*.js",
      "scripts/test-*.js",
      // Generated files
      "*.min.js",
      "*.bundle.js",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Change any type errors to warnings
      "@typescript-eslint/no-unused-vars": "warn", // Change unused vars to warnings
      "react-hooks/exhaustive-deps": "warn", // Change hook deps to warnings
    },
  },
];

export default eslintConfig;
