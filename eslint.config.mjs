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
      // Scripts (CommonJS / standalone, require() is intentional)
      "scripts/**/*.js",
      "scripts/**/*.cjs",
      "scripts/**/*.ts",
      // Generated files
      "*.min.js",
      "*.bundle.js",
      // Test utilities (CommonJS)
      "tests/mcp/**/*.js",
      // Sub-apps (separate projects with own configs)
      "apps/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // Change any type errors to warnings
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_", // Ignore unused args that start with underscore
          varsIgnorePattern: "^_", // Ignore unused vars that start with underscore
          destructuredArrayIgnorePattern: "^_", // Ignore unused destructured items that start with underscore
        },
      ],
      "react-hooks/exhaustive-deps": "warn", // Change hook deps to warnings
    },
  },
];

export default eslintConfig;
