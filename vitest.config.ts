import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
    env: { ELOFIK_DISABLE_FFMPEG: "1", ELOFIK_DATA_DIR: ".data-test", ELOFIK_DEMO_MODE: "1", SESSION_SECRET: "test-secret-test-secret-test-secret" },
  },
});
