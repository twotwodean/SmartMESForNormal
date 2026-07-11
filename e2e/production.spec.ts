import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("생산실적(POP) → 재고 반영", () => {
  test.beforeAll(() => reseed());

  test("작업지시 WO-260709-011에 양품 실적 등록 → FG-GB2500 재고 증가", async ({ page }) => {
    await loginAs(page, "operator");

    await page.goto("/mockups/production");
    await expect(page.getByRole("heading", { name: "실적 입력 — WO-260709-011" })).toBeVisible();

    await page.getByLabel("양품 수량").fill("50");
    await page.getByRole("button", { name: "실적 등록" }).click();

    await expect(page.getByText("실적 등록됨").first()).toBeVisible();

    await page.goto("/mockups/inventory");
    const row = page.getByRole("row", { name: /FG-GB2500/ });
    await expect(row.locator("td").nth(2)).toHaveText("170"); // 기존 120 + 양품 50
  });
});
