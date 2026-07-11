import { describe, it, expect } from "vitest";

import { invoiceStatusFor, outstanding } from "@/lib/domain/billing";

describe("invoiceStatusFor", () => {
  it("수금액에 따라 상태", () => {
    expect(invoiceStatusFor(1000, 0)).toBe("ISSUED");
    expect(invoiceStatusFor(1000, 400)).toBe("PARTIAL");
    expect(invoiceStatusFor(1000, 1000)).toBe("PAID");
    expect(invoiceStatusFor(1000, 1200)).toBe("PAID");
  });
});

describe("outstanding", () => {
  it("미수금 = 청구액 - 수금액, 음수 방지", () => {
    expect(outstanding(1000, 300)).toBe(700);
    expect(outstanding(1000, 1000)).toBe(0);
    expect(outstanding(1000, 1500)).toBe(0);
  });
});
