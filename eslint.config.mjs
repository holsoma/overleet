import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
export default defineConfig([
  globalIgnores([".next/**", ".cache/**", "lib/generated/**", "next-env.d.ts", "tmp/**", "coverage/**", "test-results/**", "playwright-report/**", "video/**"]),
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ["**/*.{ts,tsx}"], plugins: { "react-hooks": reactHooks }, rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" } }
]);
