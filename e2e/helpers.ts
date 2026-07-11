import { execSync } from "node:child_process";
import type { Page } from "@playwright/test";

import { E2E_DATABASE_URL } from "./db-url";

export const CREDENTIALS = {
  admin: { username: "admin", password: "admin123" },
  operator: { username: "operator", password: "oper123" },
  viewer: { username: "viewer", password: "view123" },
} as const;

/**
 * API 로그인 후 세션 쿠키를 브라우저 컨텍스트에 주입.
 * `page.request`는 page와 동일한 BrowserContext의 쿠키 저장소를 공유하므로,
 * 로그인 응답의 Set-Cookie가 이후 page.goto()에 자동 반영된다(실측 확인됨).
 */
export async function loginAs(page: Page, role: keyof typeof CREDENTIALS): Promise<void> {
  const res = await page.request.post("/api/auth/login", { data: CREDENTIALS[role] });
  if (!res.ok()) throw new Error(`login failed: ${role} ${res.status()}`);
  await page.goto("/mockups/manager");
}

/** 동기 대기(외부 의존 없음) — 재시도 사이 백오프용 */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * baseline로 e2e 스키마 재시드(각 spec 독립성).
 * SSE 스트림이 e2e DB를 조회하는 중 seed의 deleteMany가 겹치거나, 부하가 큰 머신에서
 * tsx 프로세스 스폰이 간헐 실패할 수 있다. 오류를 표출(stdio:pipe)하고 최대 3회 재시도한다.
 */
export function reseed(): void {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync("npx tsx prisma/seed.ts", { stdio: "pipe", env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL } });
      return;
    } catch (e) {
      lastErr = e;
      if (attempt < 3) sleepSync(500 * attempt);
    }
  }
  const err = lastErr as { stderr?: Buffer } | undefined;
  throw new Error(`reseed 실패(3회 시도): ${err?.stderr?.toString().slice(-500) ?? String(lastErr)}`);
}
