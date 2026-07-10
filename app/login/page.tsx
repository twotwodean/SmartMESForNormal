"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
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
