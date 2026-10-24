import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/logic/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "localStorage",
        "requestAnimationFrame",
      ],
      "max-lines-per-function": ["error", 40],
      "no-restricted-imports": ["error", { patterns: ["**/render/*"] }],
    },
  },
);
