import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("클래스들을 합친다", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("falsy 값을 무시한다", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
  it("Tailwind 충돌은 뒤 값이 이긴다", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
