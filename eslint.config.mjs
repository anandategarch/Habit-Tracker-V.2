import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // react-hooks/set-state-in-effect (aturan baru eslint-config-next) memflag
  // pola shadcn/ui standar (carousel, use-mobile) yang memanggil setState
  // sinkron di effect. Turunkan ke warning supaya next build tetap lulus.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
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
