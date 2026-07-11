import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("RBAC: viewer는 변경 작업에서 403", () => {
  test.beforeAll(() => reseed());

  test("특채 승인 시도 → 403 토스트, 상태 미변경", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/concession");

    const row = page.getByRole("row", { name: /기어박스/ });
    await row.getByRole("button", { name: "승인" }).click();

    await expect(page.getByText("권한 없음").first()).toBeVisible();

    await page.reload();
    const rowAfter = page.getByRole("row", { name: /기어박스/ });
    await expect(rowAfter.locator("td").nth(3)).toContainText("요청"); // status column
  });

  test("모델 등록 시도 → 403 토스트, 목록 미변경", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/catalog");

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "모델 등록" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("코드").fill("PM-TEST-001");
    await dialog.getByLabel("모델명").fill("테스트 모델");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("권한 없음").first()).toBeVisible();

    await page.reload();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
  });

  test("청구 발행 시도 → 403 토스트, 목록 미변경", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/billing");

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "청구 발행" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("청구액").fill("100000");
    await dialog.getByRole("button", { name: "발행" }).click();

    await expect(page.getByText("권한 없음").first()).toBeVisible();

    await page.reload();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
  });

  test("수금 시도 → 403 토스트, 청구 상태 미변경", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/billing");

    const row = page.getByRole("row", { name: /INV-2607-001/ });
    await row.getByRole("button", { name: "수금" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("권한 없음").first()).toBeVisible();

    await page.reload();
    const rowAfter = page.getByRole("row", { name: /INV-2607-001/ });
    await expect(rowAfter.locator("td").nth(5)).toHaveText("700,000"); // 미수금 불변
  });
});
