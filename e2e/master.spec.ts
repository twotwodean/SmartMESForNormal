import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("기준정보(MDM): 품목 CRUD · BOM·라우팅 편집 · 중복 코드 · 참조 삭제 차단 · RBAC", () => {
  test.beforeAll(() => reseed());

  test("admin: 품목 생성 → 수정 → 삭제", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "품목" }).click();

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "품목 등록" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("코드").fill("E2E-ITEM-01");
    await dialog.getByLabel("품목명").fill("E2E 테스트 품목");
    await dialog.getByLabel("단위").fill("EA");
    await dialog.getByLabel("안전재고").fill("15");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("등록됨").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before + 1);
    await expect(page.locator("table tbody")).toContainText("E2E-ITEM-01");

    const row = page.getByRole("row", { name: /E2E-ITEM-01/ });
    await row.getByRole("button", { name: "수정" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("품목명").fill("E2E 테스트 품목 수정됨");
    await dialog.getByLabel("안전재고").fill("77");
    await dialog.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("수정됨").first()).toBeVisible();
    await expect(page.locator("table tbody")).toContainText("E2E 테스트 품목 수정됨");
    await expect(page.locator("table tbody")).toContainText("77");

    const row2 = page.getByRole("row", { name: /E2E-ITEM-01/ });
    await row2.getByRole("button", { name: "삭제" }).click();
    const confirmDialog = page.getByRole("dialog");
    await confirmDialog.getByRole("button", { name: "삭제" }).click();

    await expect(page.getByText("삭제됨").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
    await expect(page.locator("table tbody")).not.toContainText("E2E-ITEM-01");
  });

  test("admin: 중복 코드로 등록 시도 → 이미 존재 토스트, 목록 미변경", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "품목" }).click();

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "품목 등록" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("코드").fill("RM-SUS304");
    await dialog.getByLabel("품목명").fill("중복 코드 테스트");
    await dialog.getByLabel("단위").fill("EA");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("이미 존재하는 코드입니다").first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
  });

  test("admin: 참조 품목(RM-SUS304) 삭제 시도 → 사용 중 토스트, 목록 유지", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "품목" }).click();

    const before = await page.locator("table tbody tr").count();

    const row = page.getByRole("row", { name: /RM-SUS304/ });
    await row.getByRole("button", { name: "삭제" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "삭제" }).click();

    await expect(page.getByText("사용 중이라 삭제할 수 없습니다", { exact: false }).first()).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
    await expect(page.locator("table tbody")).toContainText("RM-SUS304");
  });

  test("viewer: 품목 등록 시도 → 403 토스트(권한 없음), 목록 미변경", async ({ page }) => {
    await loginAs(page, "viewer");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "품목" }).click();

    const before = await page.locator("table tbody tr").count();

    await page.getByRole("button", { name: "품목 등록" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("코드").fill("E2E-RBAC-01");
    await dialog.getByLabel("품목명").fill("권한 테스트 품목");
    await dialog.getByLabel("단위").fill("EA");
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("권한 없음").first()).toBeVisible();

    await page.reload();
    await page.getByRole("tab", { name: "품목" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(before);
    await expect(page.locator("table tbody")).not.toContainText("E2E-RBAC-01");
  });

  test("admin: BOM 상위=FG-GB2500 → SF-SHAFT 표시, 하위 추가/삭제", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "BOM" }).click();

    await page.locator("label", { hasText: "상위품목" }).locator("button").click();
    await page.getByRole("option", { name: /FG-GB2500/ }).click();
    await expect(page.getByRole("row", { name: /SF-SHAFT/ })).toBeVisible();

    await page.getByRole("button", { name: "하위 추가" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("label", { hasText: "하위품목" }).locator("button").click();
    await page.getByRole("option", { name: /RM-AL6061/ }).click();
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("하위 추가됨").first()).toBeVisible();
    await expect(page.getByRole("row", { name: /RM-AL6061/ })).toBeVisible();

    await page.getByRole("row", { name: /RM-AL6061/ }).getByRole("button", { name: "삭제" }).click();
    await expect(page.getByText("삭제됨").first()).toBeVisible();
    await expect(page.locator("table tbody")).not.toContainText("RM-AL6061");
  });

  test("admin: 순환 BOM 차단 — 상위=RM-SUS304에 FG-GB2500 추가 시도", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "BOM" }).click();

    await page.locator("label", { hasText: "상위품목" }).locator("button").click();
    await page.getByRole("option", { name: /RM-SUS304/ }).click();

    await page.getByRole("button", { name: "하위 추가" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("label", { hasText: "하위품목" }).locator("button").click();
    await page.getByRole("option", { name: /FG-GB2500/ }).click();
    await dialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("순환 BOM은 등록할 수 없습니다").first()).toBeVisible();
    await dialog.getByRole("button", { name: "취소" }).click();
    await expect(page.locator("table tbody")).not.toContainText("FG-GB2500");
  });

  test("admin: 라우팅 추가 + 공정 추가(작업장 미지정) → 스텝에 작업장 '-' 표시", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/master");
    await page.getByRole("tab", { name: "라우팅" }).click();

    await page.locator("label", { hasText: "품목" }).locator("button").click();
    await page.getByRole("option", { name: /RM-AL6061/ }).click();

    await page.getByRole("button", { name: "라우팅 추가" }).click();
    const routingDialog = page.getByRole("dialog");
    await routingDialog.locator("input").fill("E2E라우팅");
    await routingDialog.getByRole("button", { name: "등록" }).click();
    await expect(page.getByText("라우팅 추가됨").first()).toBeVisible();

    await page.getByRole("button", { name: "공정 추가" }).click();
    const stepDialog = page.getByRole("dialog");
    await stepDialog.locator("label", { hasText: "공정" }).locator("button").click();
    await page.getByRole("option", { name: /절단/ }).click();
    // 작업장은 기본값(미지정) 그대로 둔다
    await stepDialog.getByRole("button", { name: "등록" }).click();

    await expect(page.getByText("공정 추가됨").first()).toBeVisible();
    const stepRow = page.getByRole("row", { name: /절단/ });
    await expect(stepRow).toBeVisible();
    await expect(stepRow.locator("td").nth(2)).toHaveText("-");

    // 정리: 스텝/라우팅 삭제
    await stepRow.getByRole("button", { name: "삭제" }).click();
    await expect(page.getByText("삭제됨").first()).toBeVisible();
    await page.getByRole("button", { name: "라우팅 삭제" }).click();
    await expect(page.getByText("라우팅 삭제됨").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("E2E라우팅");
  });

  for (const role of ["operator", "viewer"] as const) {
    test(`${role}: BOM 하위 추가 시도 → 403 토스트(권한 없음)`, async ({ page }) => {
      await loginAs(page, role);
      await page.goto("/mockups/master");
      await page.getByRole("tab", { name: "BOM" }).click();

      await page.locator("label", { hasText: "상위품목" }).locator("button").click();
      await page.getByRole("option", { name: /FG-GB2500/ }).click();

      await page.getByRole("button", { name: "하위 추가" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("label", { hasText: "하위품목" }).locator("button").click();
      await page.getByRole("option", { name: /RM-AL6061/ }).click();
      await dialog.getByRole("button", { name: "등록" }).click();

      await expect(page.getByText("권한 없음").first()).toBeVisible();
      await expect(page.locator("table tbody")).not.toContainText("RM-AL6061");
    });
  }
});
