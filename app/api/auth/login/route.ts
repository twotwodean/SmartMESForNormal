import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/current-user";
import { checkAndConsume, resetKey } from "@/lib/auth/rate-limit";
import { parseBody } from "@/lib/api/validate";
import { LoginSchema } from "@/lib/api/schemas";
import type { UserRole } from "@/lib/domain/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });

  const p = await parseBody(req, LoginSchema);
  if ("res" in p) return p.res;
  const { username, password } = p.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateKey = `${ip}:${username.toLowerCase()}`;
  const rate = checkAndConsume(rateKey, Date.now());
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "로그인 시도가 많습니다. 잠시 후 다시 시도하세요." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  resetKey(rateKey);

  const exp = Date.now() + SESSION_TTL_MS;
  const token = await signSession(
    { userId: user.id, username: user.username, name: user.name, role: user.role as UserRole, exp },
    secret,
  );

  const res = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
