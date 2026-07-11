import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("인증", () => {
  test("비로그인 상태로 보호 경로 접근 시 /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/mockups/manager");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin 로그인 후 관리 현황 진입", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page).toHaveURL(/\/mockups\/manager/);
    await expect(page.getByText("관리자", { exact: false }).first()).toBeVisible();
  });

  test("로그아웃 후 보호 경로 재접근 시 리다이렉트", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page).toHaveURL(/\/mockups\/manager/);
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/mockups/manager");
    await expect(page).toHaveURL(/\/login/);
  });
});
