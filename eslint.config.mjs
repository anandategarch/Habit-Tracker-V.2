import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // examples/, skills/, mini-services/, tool-results/ adalah aset platform,
  // bukan kode aplikasi Rutina — jangan ikut di-lint.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "examples/**",
    "skills/**",
    "mini-services/**",
    "tool-results/**",
  ]),
]);
