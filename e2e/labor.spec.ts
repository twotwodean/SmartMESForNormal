import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("기준정보(MDM): 작업자·근무조·정지사유 CRUD · 중복 코드 · RBAC", () => {
  test.beforeAll(() => reseed());

  test("admin: 작업자 생성 → 수정 → 삭제", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "작업자" }).click();

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "작업자 등록" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("사번").fill("E2E-OP-01");
    await dialog.getByLabel("이름").fill("E2E 테스트 작업자");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("등록됨").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before + 1);
    await expect(page.locator("table tbody")).toContainText("E2E-OP-01");

    let row = page.getByRole("row", { name: /E2E-OP-01/ });
    await expect(row.locator("td").nth(2)).toHaveText("사용");

    await row.getByRole("button", { name: "수정" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("이름").fill("E2E 테스트 작업자 수정됨");
    await dialog.getByLabel("사용").click();
    await dialog.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("수정됨").first()).toBeVisible();
    row = page.getByRole("row", { name: /E2E-OP-01/ });
    await expect(row).toContainText("E2E 테스트 작업자 수정됨");
    await expect(row.locator("td").nth(2)).toHaveText("미사용");

    await row.getByRole("button", { name: "삭제" }).click();
    const confirmDialog = page.getByRole("dialog");
    await confirmDialog.getByRole("button", { name: "삭제" }).click();

    await expect(page.getByText("삭제됨").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
    await expect(page.locator("table tbody")).not.toContainText("E2E-OP-01");
  });

  test("admin: 중복 사번(OP-001)으로 작업자 등록 시도 → 이미 존재 토스트, 목록 미변경", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "작업자" }).click();

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "작업자 등록" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("사번").fill("OP-001");
    await dialog.getByLabel("이름").fill("중복 코드 테스트");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("이미 존재하는 코드입니다").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
  });

  test("admin: 정지사유 생성(구분=계획) → 목록에 구분 라벨 표시 후 정리", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "정지사유" }).click();

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "정지사유 등록" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("코드").fill("E2E-DR-01");
    await dialog.getByLabel("사유").fill("E2E 정지사유");
    await dialog.locator("label", { hasText: "구분" }).locator("button").click();
    await page.getByRole("option", { name: "계획", exact: true }).click();
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("등록됨").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before + 1);

    const row = page.getByRole("row", { name: /E2E-DR-01/ });
    await expect(row).toContainText("E2E 정지사유");
    await expect(row.locator("td").nth(2)).toHaveText("계획");

    // 정리
    await row.getByRole("button", { name: "삭제" }).click();
    const confirmDialog = page.getByRole("dialog");
    await confirmDialog.getByRole("button", { name: "삭제" }).click();
    await expect(page.getByText("삭제됨").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
  });

  test("viewer: 작업자 등록 시도 → 403 토스트(권한 없음), 목록 미변경", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "작업자" }).click();

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "작업자 등록" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("사번").fill("E2E-RBAC-OP-01");
    await dialog.getByLabel("이름").fill("권한 테스트 작업자");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("권한 없음").first()).toBeVisible();

    await page.reload();
    await page.getByRole("tab", { name: "작업자" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
    await expect(page.locator("table tbody")).not.toContainText("E2E-RBAC-OP-01");
  });
});
