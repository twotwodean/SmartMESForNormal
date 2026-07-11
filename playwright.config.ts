import { defineConfig } from "@playwright/test";

import { E2E_DATABASE_URL } from "./e2e/db-url";

const PORT = 3001;
// localhost는 ::1(IPv6)로 먼저 해석될 수 있어 dev 서버(IPv4 바인딩)와 어긋나면
// apiRequestContext가 ECONNREFUSED ::1 로 간헐 실패한다. 127.0.0.1로 고정해 결정적 보장.
const HOST = "127.0.0.1";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1, // 격리된 e2e 스키마 + 직렬 실행으로 결정적 보장
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  outputDir: "test-results", // 영상·트레이스·스크린샷 저장 위치
  reporter: [
    ["list"],
    ["./e2e/progress-reporter.ts"], // 테스트별 진행 로그(test-results/e2e-progress.log|jsonl)
    ["html", { open: "never", outputFolder: "playwright-report" }], // 영상 임베드된 HTML 리포트
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    // 로컬은 전량 녹화(테스트 영상 남기기), CI는 실패건만 보관(용량 절약)
    video: isCI ? "retain-on-failure" : "on",
    trace: isCI ? "on-first-retry" : "on",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: `http://${HOST}:${PORT}/login`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: { DATABASE_URL: E2E_DATABASE_URL, SESSION_SECRET: "e2e-secret" },
  },
});
