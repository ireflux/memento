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
    // 集成用例打的是远程 Neon：每个用例要跑多次往返 + 真实的 scrypt（~100ms/次），
    // 5s 默认值会偶发超时。单元测试毫秒级完成，不受影响。
    testTimeout: 30_000,
    env: {
      SERVER_SECRET: "test-secret-for-vitest",
      IMGBED_BASE_URL: "https://imgbed.example.com",
      IMGBED_TOKEN: "test-token",
    },
  },
});
