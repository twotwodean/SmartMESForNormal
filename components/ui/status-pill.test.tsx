import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";

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
});
