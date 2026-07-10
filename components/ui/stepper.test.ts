import { describe, it, expect } from "vitest";
import { stepStatus } from "@/components/ui/stepper";

describe("stepStatus", () => {
  it("현재 이전은 done, 현재는 current, 이후는 upcoming", () => {
    expect(stepStatus(0, 2)).toBe("done");
    expect(stepStatus(1, 2)).toBe("done");
    expect(stepStatus(2, 2)).toBe("current");
    expect(stepStatus(3, 2)).toBe("upcoming");
  });
});
