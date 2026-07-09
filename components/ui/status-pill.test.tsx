import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill, workOrderTone, equipmentTone, inspectionTone, stockTone } from "@/components/ui/status-pill";

describe("StatusPill", () => {
  it("tone에 맞는 의미색 클래스를 적용한다", () => {
    render(<StatusPill tone="ok">완료</StatusPill>);
    const pill = screen.getByText("완료");
    expect(pill.className).toContain("text-ok");
    expect(pill.className).toContain("bg-ok-soft");
  });

  it("workOrderTone은 상태를 tone으로 매핑한다", () => {
    expect(workOrderTone("WAITING")).toBe("warn");
    expect(workOrderTone("RUNNING")).toBe("primary");
    expect(workOrderTone("DONE")).toBe("ok");
    expect(workOrderTone("CANCELLED")).toBe("neutral");
  });

  it("equipmentTone은 상태를 tone으로 매핑한다", () => {
    expect(equipmentTone("RUN")).toBe("ok");
    expect(equipmentTone("STOP")).toBe("neutral");
    expect(equipmentTone("REPAIR")).toBe("crit");
  });

  it("inspectionTone은 상태를 tone으로 매핑한다", () => {
    expect(inspectionTone("PASS")).toBe("ok");
    expect(inspectionTone("FAIL")).toBe("crit");
    expect(inspectionTone("SPECIAL")).toBe("warn");
  });

  it("stockTone은 상태를 tone으로 매핑한다", () => {
    expect(stockTone("NORMAL")).toBe("neutral");
    expect(stockTone("BELOW")).toBe("warn");
    expect(stockTone("NEGATIVE")).toBe("crit");
  });
});
