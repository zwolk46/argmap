// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import argmapDeterminism from "eslint-plugin-argmap-determinism";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "eslint-plugin-argmap-determinism/tests/**",
      "docs/**",
      "*.html",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "scripts/**/*.mjs",
      "*.config.js",
      "*.config.mjs",
      "eslint-plugin-argmap-determinism/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        URL: "readonly",
        console: "readonly",
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "react-hooks": reactHooks,
      "argmap-determinism": argmapDeterminism,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
  // State module boundary: src/state/ imports from @/schema, @/runtime, @/persistence only.
  {
    files: ["src/state/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/ui",
                "@/ui/*",
                "@/llm-hooks",
                "@/llm-hooks/*",
                "@/modes",
                "@/modes/*",
                "@/layout",
                "@/layout/*",
              ],
              message:
                "src/state/ may only import from @/schema, @/runtime, @/persistence, react, and zustand.",
            },
          ],
        },
      ],
    },
  },
  // Persistence module boundary: src/persistence/ imports only @/schema and built-ins.
  // Cross-document resolution note #1 / F-015.
  {
    files: ["src/persistence/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/runtime",
                "@/runtime/*",
                "@/ui",
                "@/ui/*",
                "@/state",
                "@/state/*",
                "@/llm-hooks",
                "@/llm-hooks/*",
                "@/modes",
                "@/modes/*",
                "@/layout",
                "@/layout/*",
              ],
              message:
                "src/persistence/ may only import from @/schema and third-party libraries (Cross-document resolution note #1, F-015).",
            },
          ],
        },
      ],
    },
  },
  // Runtime module boundary: src/runtime/ imports only @/schema and built-ins.
  // Article II § 2 / I.1 buildkit "Module boundary".
  {
    files: ["src/runtime/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/persistence",
                "@/persistence/*",
                "@/ui",
                "@/ui/*",
                "@/state",
                "@/state/*",
                "@/llm-hooks",
                "@/llm-hooks/*",
                "@/modes",
                "@/modes/*",
                "@/layout",
                "@/layout/*",
              ],
              message:
                "src/runtime/ may only import from @/schema and standard built-ins (Article II § 2).",
            },
            {
              group: ["react", "react-dom", "dexie", "zustand", "elkjs", "@xyflow/react"],
              message:
                "src/runtime/ may not import application dependencies that read the clock, DOM, or environment (Article II § 2).",
            },
          ],
        },
      ],
      "argmap-determinism/no-unsorted-iteration": "error",
    },
  },
  // Layout module: sorted-iteration housekeeping (matches runtime rule; layout
  // is off the Article II § 2 boundary but the practical-determinism property
  // benefits from the same mechanical enforcement — spec I.7 recommendation).
  {
    files: ["src/layout/**/*.{ts,tsx}"],
    rules: {
      "argmap-determinism/no-unsorted-iteration": "error",
    },
  },
  // LLM-hooks module: sorted-iteration for audit-trail reproducibility.
  {
    files: ["src/llm-hooks/**/*.{ts,tsx}"],
    rules: {
      "argmap-determinism/no-unsorted-iteration": "error",
    },
  },
  // UI module boundary: may import react, @xyflow/react, @/state, @/schema, @/layout.
  // Type-only imports from @/llm-hooks are allowed; value imports are forbidden.
  // Forbidden: @/runtime (values), @/persistence, @/modes.
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/runtime", "@/runtime/*"],
              message:
                "src/ui/ may not import values from @/runtime. Use type-only imports if needed.",
              allowTypeImports: true,
            },
            {
              group: ["@/persistence", "@/persistence/*"],
              message: "src/ui/ may not import from @/persistence.",
            },
            {
              group: ["@/modes", "@/modes/*"],
              message: "src/ui/ may not import from @/modes.",
            },
            {
              group: ["@/llm-hooks", "@/llm-hooks/*"],
              message:
                "src/ui/ may only type-import from @/llm-hooks (SuggestionResult, ConfirmationDecision, HookId, HookInvocationRecord). No value imports.",
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];
