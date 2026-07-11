import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "node:child_process";

import { prisma } from "@/lib/db";
import { listInvoices, recordPayment } from "@/lib/services/billing-service";

afterAll(() => { execSync("npm run db:seed", { stdio: "ignore" }); });

describe("billing-service", () => {
  it("seed 청구가 수금합·미수금과 함께 조회된다(INV-2607-001 = 1,200,000 / 500,000 수금 → 700,000 미수, PARTIAL)", async () => {
    const rows = await listInvoices();
    const inv = rows.find((r) => r.code === "INV-2607-001")!;
    expect(inv.paid).toBe(500_000);
    expect(inv.outstanding).toBe(700_000);
    expect(inv.status).toBe("PARTIAL");
  });
  it("수금 등록 시 상태가 PAID로 갱신된다", async () => {
    const inv = await prisma.invoice.findFirstOrThrow({ where: { code: "INV-2607-001" } });
    const { invoice } = await recordPayment({ invoiceId: inv.id, amount: 700_000 }); // 500k+700k=1.2M → PAID
    expect(invoice.status).toBe("PAID");
    const row = (await listInvoices()).find((r) => r.code === "INV-2607-001")!;
    expect(row.outstanding).toBe(0);
  });
});
