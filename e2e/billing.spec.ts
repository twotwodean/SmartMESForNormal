import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("청구/수금", () => {
  test.beforeAll(() => reseed());

  test("INV-2607-001 부분수금 → 완납, 미수금 0, 수금 버튼 사라짐", async ({ page }) => {
    await loginAs(page, "operator");

    await page.goto("/mockups/billing");
    const row = page.getByRole("row", { name: /INV-2607-001/ });
    await expect(row.locator("td").nth(4)).toHaveText("500,000"); // 수금액
    await expect(row.locator("td").nth(5)).toHaveText("700,000"); // 미수금

    await row.getByRole("button", { name: "수금" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "수금 등록 — INV-2607-001" })).toBeVisible();
    await expect(dialog.getByText("미수금 700,000", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("수금 등록됨").first()).toBeVisible();

    const updatedRow = page.getByRole("row", { name: /INV-2607-001/ });
    await expect(updatedRow.locator("td").nth(5)).toHaveText("0"); // 미수금 0
    await expect(updatedRow.locator("td").nth(6)).toContainText("완납");
    await expect(updatedRow.getByRole("button", { name: "수금" })).toHaveCount(0);
  });

  test("청구 발행(출하 미지정) → 목록 증가", async ({ page }) => {
    await loginAs(page, "operator");

    await page.goto("/mockups/billing");
    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "청구 발행" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("청구액").fill("100000");
    await dialog.getByRole("button", { name: "발행" }).click();

    await expect(page.getByText("청구 발행됨").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before + 1);
  });
});
