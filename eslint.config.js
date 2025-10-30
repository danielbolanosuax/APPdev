// ESLint 9 – Flat config para React + TypeScript + Vite
// - Sin .eslintignore (los ignores van aquí)
// - Hooks y React Refresh registrados
// - Compatible con Vite y Fast Refresh

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Sustituye a .eslintignore en ESLint 9
  globalIgnores(["dist", "build", "coverage", "node_modules"]),

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    // Base + TS + Hooks + Vite/React Refresh
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      // Para proyectos con Vite (habilita allowConstantExport)
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
  },
]);
