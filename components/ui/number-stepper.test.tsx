import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { stepValue, NumberStepper } from "@/components/ui/number-stepper";

describe("stepValue", () => {
  it("step만큼 증감한다", () => {
    expect(stepValue(10, +1, { min: 0, max: 100, step: 5 })).toBe(15);
    expect(stepValue(10, -1, { min: 0, max: 100, step: 5 })).toBe(5);
  });
  it("min/max로 클램프한다", () => {
    expect(stepValue(2, -1, { min: 0, max: 100, step: 5 })).toBe(0);
    expect(stepValue(98, +1, { min: 0, max: 100, step: 5 })).toBe(100);
  });
});

describe("NumberStepper", () => {
  it("＋ 버튼 클릭 시 값이 증가한다", async () => {
    const user = userEvent.setup();
    render(<NumberStepper defaultValue={10} step={5} min={0} max={100} aria-label="양품 수량" />);
    await user.click(screen.getByRole("button", { name: "증가" }));
    expect(screen.getByRole("spinbutton")).toHaveValue(15);
  });
});
