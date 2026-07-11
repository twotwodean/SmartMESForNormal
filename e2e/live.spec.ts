import { test, expect } from "@playwright/test";
import { loginAs, reseed } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("실시간 대시보드(SSE)", () => {
  test.beforeAll(() => reseed());

  test("EventSource 연결 → 실시간 배지 표시 → 정비 등록 시 5초 내 KPI 갱신", async ({ page }) => {
    await loginAs(page, "admin");

    const liveBadge = page.getByText("실시간", { exact: true });
    await expect(liveBadge).toBeVisible({ timeout: 10_000 });

    const mttrNote = page.getByText(/정비중 \d+건/);
    const before = await mttrNote.textContent();

    const eqRes = await page.request.get("/api/equipment");
    const equipment = await eqRes.json();
    const equipmentId = equipment[0].id;

    const createRes = await page.request.post("/api/maintenance-orders", {
      data: { equipmentId, type: "REPAIR", description: "E2E 실시간 검증용 정비" },
    });
    expect(createRes.ok()).toBe(true);

    await expect(mttrNote).not.toHaveText(before ?? "", { timeout: 8_000 });
  });
});
