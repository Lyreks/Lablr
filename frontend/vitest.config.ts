import { defineConfig } from "vitest/config";

// Separate from vite.config.ts to keep the React Router plugin out of tests.
export default defineConfig({
  test: {
    include: ["app/**/*.test.ts"],
  },
});
