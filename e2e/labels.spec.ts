import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("라벨 발행: 로트 선택 → 바코드 라벨 인쇄(/print/labels)", () => {
  test.beforeAll(() => reseed());

  test("admin: 로트 2건 선택 → 선택 라벨 발행 → 새 탭에 바코드+로트번호 표시", async ({ page, context }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/labels");

    await expect(page.getByRole("heading", { name: "라벨 발행" })).toBeVisible();

    const rowRaw = page.getByRole("row", { name: /LOT-2600701/ });
    const rowSemi = page.getByRole("row", { name: /LOT-2600712/ });
    await rowRaw.getByRole("checkbox").click();
    await rowSemi.getByRole("checkbox").click();

    await expect(page.getByText("선택됨 2건", { exact: false })).toBeVisible();

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /선택 라벨 발행/ }).click(),
    ]);
    await popup.waitForLoadState();

    expect(popup.url()).toContain("/print/labels?ids=");
    expect(popup.url()).toContain("type=lot");

    await expect(popup.locator("svg")).toHaveCount(2);
    await expect(popup.locator("body")).toContainText("LOT-2600701");
    await expect(popup.locator("body")).toContainText("LOT-2600712");

    await popup.close();
  });

  test("admin: 행별 '라벨' 버튼 → 해당 로트만 바코드 인쇄", async ({ page, context }) => {
    await loginAs(page, "admin");
    await page.goto("/mockups/labels");

    const row = page.getByRole("row", { name: /LOT-2600701/ });
    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      row.getByRole("button", { name: "라벨" }).click(),
    ]);
    await popup.waitForLoadState();

    expect(popup.url()).toContain("/print/labels?ids=");
    await expect(popup.locator("svg")).toHaveCount(1);
    await expect(popup.locator("body")).toContainText("LOT-2600701");
    await expect(popup.locator("body")).not.toContainText("LOT-2600712");

    await popup.close();
  });
});
