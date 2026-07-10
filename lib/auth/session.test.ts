import { describe, it, expect } from "vitest";
import { signSession, verifySession, type SessionPayload } from "@/lib/auth/session";

const SECRET = "test-secret";
const base: Omit<SessionPayload, "exp"> = { userId: "u1", username: "admin", name: "관리자", role: "ADMIN" };

describe("session token", () => {
  it("서명 후 검증하면 페이로드 복원", async () => {
    const token = await signSession({ ...base, exp: 2000 }, SECRET);
    const p = await verifySession(token, SECRET, 1000);
    expect(p?.userId).toBe("u1");
    expect(p?.role).toBe("ADMIN");
  });
  it("만료된 토큰은 null", async () => {
    const token = await signSession({ ...base, exp: 500 }, SECRET);
    expect(await verifySession(token, SECRET, 1000)).toBeNull();
  });
  it("변조된 서명은 null", async () => {
    const token = await signSession({ ...base, exp: 2000 }, SECRET);
    expect(await verifySession(token + "x", SECRET, 1000)).toBeNull();
  });
  it("다른 시크릿은 null", async () => {
    const token = await signSession({ ...base, exp: 2000 }, SECRET);
    expect(await verifySession(token, "other", 1000)).toBeNull();
  });
});
