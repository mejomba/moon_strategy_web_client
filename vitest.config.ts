import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirror the `@/*` path alias from tsconfig so tests import like app code.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
