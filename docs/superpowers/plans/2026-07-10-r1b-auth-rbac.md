# R1-B 인증·RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.
> **동시성 규칙:** 리뷰/검증 에이전트와 구현 에이전트를 동시에 돌리지 않는다. 리뷰/검증 에이전트는 `git checkout`/`stash`/파일 이동 금지.

**Goal:** SEC-1(로그인/로그아웃·세션)·SEC-2(RBAC 라우트 가드) 구현 — 비밀번호 해시(scrypt), HMAC 서명 세션 쿠키, 역할 위계(ADMIN⊇OPERATOR⊇VIEWER), 미들웨어 라우트 보호, 로그인 페이지, 로그인/로그아웃 API.

**Architecture:** 외부 인증 라이브러리 없이 표준 기능만 사용. 비밀번호는 `node:crypto` scrypt(salt 포함, 로그인 라우트=Node 런타임에서만 사용). 세션은 **Web Crypto HMAC 서명 쿠키**(엣지 미들웨어에서도 검증 가능, 무상태). RBAC는 순수 함수 `canAccess`. 미들웨어가 `/mockups/*`·`/kiosk` 접근 시 세션 검증→미인증이면 `/login` 리다이렉트. 서버 컴포넌트는 `getCurrentUser()`로 세션 조회. 순수 로직(password·rbac·session)은 단위테스트.

**Tech Stack:** Next.js 14 (middleware + route handlers), node:crypto(scrypt), Web Crypto(HMAC), Vitest. (신규 외부 의존성 없음)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `lib/auth/password.ts` (+test) | scrypt 해시/검증 |
| `lib/auth/rbac.ts` (+test) | 역할 위계 `canAccess` |
| `lib/auth/session.ts` (+test) | Web Crypto HMAC 세션 토큰 sign/verify |
| `lib/auth/current-user.ts` | 서버 세션 조회(next/headers cookies) + 쿠키 상수 |
| `prisma/seed.ts` | (수정) 임시 SHA-256 → `hashPassword` 교체 |
| `app/api/auth/login/route.ts` | 로그인(자격검증→쿠키 설정) |
| `app/api/auth/logout/route.ts` | 로그아웃(쿠키 제거) |
| `middleware.ts` | 보호 경로 세션 가드→/login 리다이렉트 |
| `app/login/page.tsx` | 로그인 페이지(크롬 없음) |

SRS FR-SEC-1/2, NFR-SEC-1. AuditLog(SEC-3)는 R2.

---

### Task 1: 인증 도메인(password·rbac·session) + 테스트 (TDD)

**Files:** Create `lib/auth/password.ts`(+test), `lib/auth/rbac.ts`(+test), `lib/auth/session.ts`(+test).

- [ ] **Step 1: 실패 테스트 `lib/auth/password.test.ts`**
```ts
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
```
Run → FAIL. Then `lib/auth/password.ts`:
```ts
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/** scrypt(salt 포함) → "saltHex:hashHex" */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
```
Run → PASS (4).

- [ ] **Step 2: 실패 테스트 `lib/auth/rbac.test.ts`**
```ts
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
```
Run → FAIL. Then `lib/auth/rbac.ts`:
```ts
import type { UserRole } from "@/lib/domain/types";

const RANK: Record<UserRole, number> = { VIEWER: 1, OPERATOR: 2, ADMIN: 3 };

/** role이 required 이상 권한인가 (ADMIN⊇OPERATOR⊇VIEWER) */
export function canAccess(role: UserRole, required: UserRole): boolean {
  return RANK[role] >= RANK[required];
}
```
Run → PASS (3).

- [ ] **Step 3: 실패 테스트 `lib/auth/session.test.ts`**
```ts
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
```
Run → FAIL. Then `lib/auth/session.ts` (Web Crypto, 엣지/노드 공통):
```ts
import type { UserRole } from "@/lib/domain/types";

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  exp: number; // epoch ms
}

const encoder = new TextEncoder();

function toB64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** payload → "body.sig" (HMAC-SHA256 서명) */
export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = toB64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(body)));
  return `${body}.${toB64Url(sig)}`;
}

/** 서명·만료 검증 후 payload 반환. 실패 시 null. now=epoch ms */
export async function verifySession(token: string, secret: string, now: number): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64Url(sig), encoder.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
```
Run → PASS (4).

- [ ] **Step 4: 전체 확인 + Commit**
Run `npm test -- lib/auth` → 11 passed(password 4 + rbac 3 + session 4). Run `npx tsc --noEmit` (클린).
```bash
git add lib/auth
git commit -m "feat(r1): 인증 도메인(scrypt password·rbac·HMAC session) + 테스트"
```

---

### Task 2: seed 비밀번호 정식 해시로 교체

**Files:** Modify `prisma/seed.ts`.

- [ ] **Step 1: seed 수정**
`prisma/seed.ts`에서 로컬 `hash()` 함수(createHash sha256)와 `node:crypto` import를 제거하고, 대신:
```ts
import { hashPassword } from "../lib/auth/password";
```
user 생성부의 `passwordHash: hash("admin123")` 등을 `passwordHash: hashPassword("admin123")`로 교체(operator/viewer도 동일). 나머지 로직은 그대로.

- [ ] **Step 2: 재시드 + 확인**
Run `npm run db:seed` → "seed 완료" 출력. 로그인 검증용으로 admin 해시가 `saltHex:hashHex` 형식인지 확인:
Run (bash): `npx tsx -e "import{PrismaClient}from'@prisma/client';import{verifyPassword}from'./lib/auth/password';const p=new PrismaClient();p.user.findUnique({where:{username:'admin'}}).then(async u=>{console.log('verify admin123:', verifyPassword('admin123', u.passwordHash), 'wrong:', verifyPassword('nope', u.passwordHash));await p.\$disconnect();})"`
Expected: `verify admin123: true wrong: false`.

- [ ] **Step 3: Commit**
```bash
git add prisma/seed.ts
git commit -m "feat(r1): seed 비밀번호를 scrypt 해시로 교체"
```

---

### Task 3: 세션 조회 헬퍼 + 로그인/로그아웃 API

**Files:** Create `lib/auth/current-user.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`.

- [ ] **Step 1: `lib/auth/current-user.ts`**
```ts
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
```

- [ ] **Step 2: `app/api/auth/login/route.ts`** (Node 런타임 — scrypt 사용)
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/current-user";
import type { UserRole } from "@/lib/domain/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: "서버 설정 오류" }, { status: 500 });

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }
  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력하세요." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

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
```

- [ ] **Step 3: `app/api/auth/logout/route.ts`**
```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/current-user";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 4: 검증** — Run `npx tsc --noEmit` (클린), `npm run build` (성공 — /api/auth/login, /api/auth/logout 라우트 생성). Do NOT run dev server here.

- [ ] **Step 5: Commit**
```bash
git add lib/auth/current-user.ts app/api/auth
git commit -m "feat(r1): 세션 조회 헬퍼 + 로그인/로그아웃 API"
```

---

### Task 4: 미들웨어 라우트 가드 + 로그인 페이지

**Files:** Create `middleware.ts`, `app/login/page.tsx`.

- [ ] **Step 1: `middleware.ts`** (엣지 — Web Crypto 세션 검증)
```ts
import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

const SESSION_COOKIE = "smartmes_session";

// 보호 경로: 목업 앱 + 키오스크
const PROTECTED = ["/mockups", "/kiosk"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname === p);
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.SESSION_SECRET ?? "";
  const session = token ? await verifySession(token, secret, Date.now()) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/mockups/:path*", "/kiosk/:path*", "/kiosk"],
};
```

- [ ] **Step 2: `app/login/page.tsx`** (크롬 없음, 클라이언트)
```tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/mockups/manager";
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "로그인 실패");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex flex-col items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-[20px] text-primary-fg">▤</span>
            <h1 className="text-subtitle font-bold text-text">스마트 MES 로그인</h1>
          </div>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">아이디</span>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="username" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">비밀번호</span>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" autoComplete="current-password" />
            </label>
            {error && <p role="alert" className="text-body-sm text-crit">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-1">{loading ? "확인 중…" : "로그인"}</Button>
          </form>
          <p className="text-center text-caption text-text-faint">데모 계정: admin / admin123 · operator / oper123 · viewer / view123</p>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: 검증** — Run `npx tsc --noEmit` (클린), `npm run build` (성공 — middleware 컴파일, /login 라우트 생성). Do NOT run dev server here (실렌더는 Task 5).
> 주의: `Button`은 `type="submit"` 지원(기본 type="button"이므로 명시 필요 — 위 코드에 명시됨). middleware가 `@/lib/auth/session`(Web Crypto)만 import하고 node:crypto/prisma는 import하지 않는지 확인(엣지 런타임 제약).

- [ ] **Step 4: Commit**
```bash
git add middleware.ts app/login/page.tsx
git commit -m "feat(r1): 미들웨어 라우트 가드(/mockups·/kiosk) + 로그인 페이지"
```

---

### Task 5: 전체 검증 + 로그인 플로우 실렌더(Playwright)

- [ ] **Step 1: 게이트**
Run `npm test` (60 + auth 11 = 71 passed), `npx tsc --noEmit` (클린), `npm run build` (성공).

- [ ] **Step 2: 실렌더 (Next dev + Playwright)**
Start `npm run dev` (port 3001). Drive with Playwright(쿠키 유지 컨텍스트):
- 미인증 상태로 `http://localhost:3001/mockups/manager` 접속 → `/login`으로 리다이렉트되는지(URL이 /login, from=/mockups/manager) 확인.
- `/login`에서 admin/admin123 입력·제출 → /mockups/manager로 이동, 대시보드 렌더, 콘솔 에러 없음.
- 잘못된 비밀번호(admin/wrong) → 에러 메시지 "아이디 또는 비밀번호가 올바르지 않습니다." 표시(리다이렉트 안 됨).
- 로그인 상태에서 `/kiosk` 접속 가능(리다이렉트 안 됨).
- `POST /api/auth/logout` 호출(또는 쿠키 삭제) 후 `/mockups/manager` 재접속 → 다시 /login으로 리다이렉트.
Report ACTUAL observed(리다이렉트 URL·에러 텍스트·성공 이동). Stop dev server(`npx kill-port 3001`, no bulk node kill). Delete scratch files.

- [ ] **Step 3:** 이슈 수정 시 별도 커밋 후 재확인.

---

## Self-Review 결과

**Spec 커버리지:**
- FR-SEC-1 로그인/로그아웃·세션 → Task 3(API)+Task 4(로그인 페이지)+세션 쿠키 ✅
- FR-SEC-2 RBAC·라우트 가드(401/403) → Task 1(canAccess)+Task 4(미들웨어 401→리다이렉트); API 401 반환 ✅
- NFR-SEC-1 비밀정보 환경변수(SESSION_SECRET)·입력검증·해시 → Task 1·3 ✅
- 순수 로직 단위테스트 → Task 1(11) ✅

**플레이스홀더 스캔:** 없음.

**타입 일관성:** `UserRole`(domain/types) → rbac·session·login에서 재사용. `SESSION_COOKIE`/`SESSION_TTL_MS`는 current-user.ts에서 정의→login route에서 import. session sign/verify 시그니처가 테스트·미들웨어·현재사용자 헬퍼에서 동일.

**엣지 제약 주의:** 미들웨어는 Web Crypto 기반 session만 import(node:crypto/prisma 금지 — 엣지 런타임). 로그인 라우트만 `runtime="nodejs"`로 scrypt·prisma 사용. 비밀번호 검증은 미들웨어가 아니라 로그인 라우트에서만.

**범위:** R1-B(인증/RBAC). 이후 R1-C API(기준정보·생산 route/service/domain) → R1-D 목업 화면 실데이터 연동(로그인 사용자·RBAC UI 반영 포함).
