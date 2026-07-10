import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password", () => {
  it("해시 후 검증 성공", () => {
    const h = hashPassword("secret123");
    expect(h).toContain(":");
    expect(verifyPassword("secret123", h)).toBe(true);
  });
  it("틀린 비밀번호는 실패", () => {
    expect(verifyPassword("wrong", hashPassword("secret123"))).toBe(false);
  });
  it("동일 비밀번호도 salt로 매번 다른 해시", () => {
    expect(hashPassword("a")).not.toBe(hashPassword("a"));
  });
  it("형식이 깨진 저장값은 false", () => {
    expect(verifyPassword("x", "garbage")).toBe(false);
  });
});
