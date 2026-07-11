import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    fileParallelism: false,
    // PostgreSQL은 SQLite보다 느리고, DB 쓰기 테스트는 afterAll에서 execSync("npm run db:seed")로
    // 재시드(수 초 소요)한다. 기본 5초 타임아웃을 간헐 초과하는 플레이크 방지를 위해 넉넉히 상향.
    testTimeout: 30_000,
    hookTimeout: 90_000,
    exclude: ["**/node_modules/**", "**/dist/**", "**/.{idea,git,cache,output,temp}/**", "e2e/**"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
