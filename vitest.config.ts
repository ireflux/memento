import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: {
      SERVER_SECRET: "test-secret-for-vitest",
      IMGBED_BASE_URL: "https://imgbed.example.com",
      IMGBED_TOKEN: "test-token",
    },
  },
});
