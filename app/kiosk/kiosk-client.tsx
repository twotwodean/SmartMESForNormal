"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { KioskNumpad } from "@/components/ui/kiosk-numpad";
import { Button } from "@/components/ui/button";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { WorkOrderRow } from "@/lib/services/work-order-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

function KioskEntry({ targets }: { targets: WorkOrderRow[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [wo, setWo] = React.useState<WorkOrderRow>(targets[0]);
  const [good, setGood] = React.useState(0);

  async function register() {
    const res = await fetch("/api/production/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workOrderId: wo.id, goodQty: good }),
    });
    if (res.ok) {
      toast({ title: "실적 등록됨", description: `${wo.code} · 양품 ${good.toLocaleString()} EA`, tone: "ok" });
      setGood(0);
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "실적 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 font-bold text-text">현장 실적 등록</h1>
        <Link href="/mockups/manager" className="inline-flex items-center gap-1 text-body-sm text-text-muted hover:text-text">
          <ChevronLeft size={16} aria-hidden /> 관리자 화면
        </Link>
      </div>

      {/* 작업지시 선택 — 대형 터치 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {targets.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setWo(w)}
            className={cn(
              "flex min-h-[72px] flex-col justify-center gap-1 rounded-xl border-2 px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              wo.id === w.id ? "border-primary bg-primary-soft" : "border-border bg-surface",
            )}
          >
            <span className="font-mono text-body-sm text-text-muted">{w.code}</span>
            <span className="text-subtitle font-semibold text-text">{w.itemName}</span>
          </button>
        ))}
      </div>

      {/* 선택 작업 + 대형 상태 */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-4">
        <div>
          <div className="text-body-sm text-text-muted">선택된 작업지시</div>
          <div className="text-h3 font-bold text-text">{wo.itemName}</div>
        </div>
        <StatusPill tone={workOrderTone(wo.status)}>{STATUS_LABEL[wo.status]}</StatusPill>
      </div>

      {/* 대형 키패드 + 등록 */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-body-sm text-text-muted">양품 수량</span>
          <KioskNumpad aria-label="양품 수량" value={good} onChange={setGood} />
        </div>
        <Button size="lg" className="h-16 w-full px-10 text-[20px] sm:w-auto" onClick={register}>등록</Button>
      </div>
    </div>
  );
}

export function KioskClient({ targets }: { targets: WorkOrderRow[] }) {
  return (
    <ToastProvider>
      {targets.length === 0 ? (
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-h2 font-bold text-text">현장 실적 등록</h1>
            <Link href="/mockups/manager" className="inline-flex items-center gap-1 text-body-sm text-text-muted hover:text-text">
              <ChevronLeft size={16} aria-hidden /> 관리자 화면
            </Link>
          </div>
          <p className="text-body-sm text-text-muted">등록 대상 작업지시가 없습니다.</p>
        </div>
      ) : (
        <KioskEntry targets={targets} />
      )}
    </ToastProvider>
  );
}
