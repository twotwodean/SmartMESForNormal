import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("MRP 소요량 산출", () => {
  test.beforeAll(() => reseed());

  test("RM-SUS304: 총소요 1,200 / 현재고 180 / 안전 250 / 입고예정 500 / 순소요 770 / 제안 구매", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/mrp");

    const row = page.getByRole("row", { name: /RM-SUS304/ });
    await expect(row.locator("td").nth(2)).toHaveText("1,200"); // 총소요
    await expect(row.locator("td").nth(3)).toHaveText("180"); // 현재고
    await expect(row.locator("td").nth(4)).toHaveText("250"); // 안전재고
    await expect(row.locator("td").nth(5)).toHaveText("500"); // 입고예정
    await expect(row.locator("td").nth(6)).toHaveText("770"); // 순소요
    await expect(row.locator("td").nth(7)).toContainText("구매"); // 제안
  });

  test("FG-GB2500: 제안 생산", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/mrp");

    const row = page.getByRole("row", { name: /FG-GB2500/ });
    await expect(row.locator("td").nth(7)).toContainText("생산"); // 제안
  });
});
