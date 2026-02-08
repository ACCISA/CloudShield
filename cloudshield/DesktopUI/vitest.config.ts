import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "dist-electron/",
        "src/main.tsx",
        "src/App.tsx",
        "**/*.svg",
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "**/mocks/**",
        "**/models/**",
        "**/utils/**",
        "**/services/**",
      ],
    },
  },
});
