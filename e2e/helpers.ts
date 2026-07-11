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

/** baseline로 e2e 스키마 재시드(각 spec 독립성) */
export function reseed(): void {
  execSync("npx tsx prisma/seed.ts", { stdio: "ignore", env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL } });
}
