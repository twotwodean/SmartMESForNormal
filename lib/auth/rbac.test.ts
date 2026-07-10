import { describe, it, expect } from "vitest";
import { canAccess } from "@/lib/auth/rbac";

describe("canAccess (ADMIN⊇OPERATOR⊇VIEWER)", () => {
  it("상위 역할은 하위 요구를 만족", () => {
    expect(canAccess("ADMIN", "OPERATOR")).toBe(true);
    expect(canAccess("OPERATOR", "VIEWER")).toBe(true);
  });
  it("동일 역할 허용", () => {
    expect(canAccess("VIEWER", "VIEWER")).toBe(true);
  });
  it("하위 역할은 상위 요구 불만족", () => {
    expect(canAccess("VIEWER", "OPERATOR")).toBe(false);
    expect(canAccess("OPERATOR", "ADMIN")).toBe(false);
  });
});
