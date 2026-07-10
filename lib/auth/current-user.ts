import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "@/lib/auth/session";

export const SESSION_COOKIE = "smartmes_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8시간

/** 현재 요청의 세션 사용자(없거나 무효면 null) */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return verifySession(token, secret, Date.now());
}
