import { describe, it, expect, beforeEach } from "vitest";
import { checkAndConsume, resetKey, _clearAll } from "@/lib/auth/rate-limit";

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

describe("rate-limit: checkAndConsume", () => {
  beforeEach(() => {
    _clearAll();
  });

  it("MAX_ATTEMPTS(5) 이내는 모두 허용", () => {
    const key = "1.2.3.4:admin";
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const res = checkAndConsume(key, i);
      expect(res.allowed).toBe(true);
    }
  });

  it("MAX_ATTEMPTS 초과 시 거부하고 retryAfterSec > 0 반환", () => {
    const key = "1.2.3.4:admin";
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkAndConsume(key, i);
    }
    const blocked = checkAndConsume(key, MAX_ATTEMPTS);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("윈도우가 지나면 카운터가 초기화되어 다시 허용된다", () => {
    const key = "1.2.3.4:admin";
    const start = 0;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkAndConsume(key, start + i);
    }
    const blocked = checkAndConsume(key, start + MAX_ATTEMPTS);
    expect(blocked.allowed).toBe(false);

    const afterWindow = start + WINDOW_MS + 1;
    const res = checkAndConsume(key, afterWindow);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(MAX_ATTEMPTS - 1);
  });

  it("resetKey 호출 시 즉시 초기화된다", () => {
    const key = "1.2.3.4:admin";
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkAndConsume(key, i);
    }
    resetKey(key);
    const res = checkAndConsume(key, MAX_ATTEMPTS);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(MAX_ATTEMPTS - 1);
  });

  it("서로 다른 key는 독립적으로 카운트된다", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      checkAndConsume("a-key", i);
    }
    const other = checkAndConsume("b-key", 0);
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(MAX_ATTEMPTS - 1);
  });
});
