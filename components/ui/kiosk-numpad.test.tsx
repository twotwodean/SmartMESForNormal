import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { applyKey, KioskNumpad } from "@/components/ui/kiosk-numpad";

describe("applyKey", () => {
  it("숫자를 뒤에 붙인다", () => {
    expect(applyKey("12", "3")).toBe("123");
  });
  it("선행 0을 대체한다", () => {
    expect(applyKey("0", "5")).toBe("5");
  });
  it("back은 마지막 글자를 지운다", () => {
    expect(applyKey("123", "back")).toBe("12");
  });
  it("clear는 비운다", () => {
    expect(applyKey("123", "clear")).toBe("");
  });
});

describe("KioskNumpad", () => {
  it("숫자 버튼을 누르면 값이 쌓인다", async () => {
    const user = userEvent.setup();
    let value = 0;
    render(<KioskNumpad value={value} onChange={(v) => (value = v)} aria-label="수량" />);
    await user.click(screen.getByRole("button", { name: "1" }));
    expect(value).toBe(1);
  });
});
