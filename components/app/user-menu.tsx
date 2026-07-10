"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

const ROLE_LABEL: Record<string, string> = { ADMIN: "관리자", OPERATOR: "작업자", VIEWER: "조회자" };

export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = React.useState<{ name: string; role: string } | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => setUser(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!user) return null;
  return (
    <div className="flex items-center gap-2 text-body-sm">
      <span className="text-text">{user.name} <span className="text-text-faint">({ROLE_LABEL[user.role] ?? user.role})</span></span>
      <button
        type="button"
        onClick={logout}
        aria-label="로그아웃"
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <LogOut size={14} aria-hidden /> 로그아웃
      </button>
    </div>
  );
}
