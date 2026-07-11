import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("입고/출하/반품 → 재고 반영", () => {
  test.beforeAll(() => reseed());

  test("PO-2607-002 잔량 입고 처리 → RM-AL6061 재고 증가", async ({ page }) => {
    await loginAs(page, "operator");

    await page.goto("/mockups/procurement");
    const poRow = page.getByRole("row", { name: /PO-2607-002/ });
    await poRow.getByRole("button", { name: "입고" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "입고 처리 — PO-2607-002" })).toBeVisible();
    await expect(dialog.getByText("남은 수량 100", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "입고" }).click();

    await expect(page.getByText("입고 처리됨").first()).toBeVisible();

    await page.goto("/mockups/inventory");
    const stockRow = page.getByRole("row", { name: /RM-AL6061/ });
    await expect(stockRow.locator("td").nth(2)).toHaveText("400"); // 기존 300 + 입고 100
  });

  test("SH-2607-001 출하 처리 → FG-GB2500 재고 감소, 반품 → 재고 복원", async ({ page }) => {
    await loginAs(page, "operator");

    await page.goto("/mockups/sales");
    await page.getByRole("tab", { name: "출하" }).click();

    const shipRow = page.getByRole("row", { name: /SH-2607-001/ });
    await shipRow.getByRole("button", { name: "출하" }).click();
    await expect(page.getByText("출하 처리됨").first()).toBeVisible();
    await expect(shipRow.getByText("출하완료")).toBeVisible();

    await page.goto("/mockups/inventory");
    let stockRow = page.getByRole("row", { name: /FG-GB2500/ });
    await expect(stockRow.locator("td").nth(2)).toHaveText("0"); // 기존 120 - 출하 120 = 0

    await page.goto("/mockups/sales");
    await page.getByRole("tab", { name: "출하" }).click();
    const shipRow2 = page.getByRole("row", { name: /SH-2607-001/ });
    await shipRow2.getByRole("button", { name: "반품" }).click();
    await expect(page.getByText("반품 처리됨").first()).toBeVisible();

    await page.goto("/mockups/inventory");
    stockRow = page.getByRole("row", { name: /FG-GB2500/ });
    await expect(stockRow.locator("td").nth(2)).toHaveText("120"); // 반품 복원
  });
});
