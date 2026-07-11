"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Button } from "@/components/ui/button";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import { DataTable } from "@/components/ui/data-table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { DEFECT_CODES } from "@/lib/mock-data";
import type { WorkOrderRow } from "@/lib/services/work-order-service";
import type { OperatorRow, ShiftRow, DowntimeReasonRow } from "@/lib/services/master-service";
import type { RecentResultRow } from "@/lib/services/production-service";
import type { WorkOrderStatus } from "@/lib/domain/types";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

const NO_OPERATOR = "__NONE__";
const NO_SHIFT = "__NONE__";
const NO_REASON = "__NONE__";

interface ProductionFormProps {
  targets: WorkOrderRow[];
  operators: OperatorRow[];
  shifts: ShiftRow[];
  downtimeReasons: DowntimeReasonRow[];
}

function ProductionForm({ targets, operators, shifts, downtimeReasons }: ProductionFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [selected, setSelected] = React.useState<WorkOrderRow>(targets[0]);
  const [good, setGood] = React.useState(0);
  const [defect, setDefect] = React.useState(0);
  const [defectCode, setDefectCode] = React.useState<string>("");
  const [downtime, setDowntime] = React.useState(0);
  const [operatorId, setOperatorId] = React.useState<string>(NO_OPERATOR);
  const [shiftId, setShiftId] = React.useState<string>(NO_SHIFT);
  const [downtimeReasonId, setDowntimeReasonId] = React.useState<string>(NO_REASON);

  function resetForm() {
    setGood(0);
    setDefect(0);
    setDefectCode("");
    setDowntime(0);
    setOperatorId(NO_OPERATOR);
    setShiftId(NO_SHIFT);
    setDowntimeReasonId(NO_REASON);
  }

  async function submit() {
    const res = await fetch("/api/production/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workOrderId: selected.id,
        goodQty: good,
        defectQty: defect,
        downtimeMin: downtime,
        operatorId: operatorId === NO_OPERATOR ? undefined : operatorId,
        shiftId: shiftId === NO_SHIFT ? undefined : shiftId,
        downtimeReasonId: downtimeReasonId === NO_REASON ? undefined : downtimeReasonId,
      }),
    });
    if (res.ok) {
      toast({ title: "실적 등록됨", description: `${selected.code} · 양품 ${good.toLocaleString()}`, tone: "ok" });
      resetForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "실적 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* 좌: 작업지시 선택 */}
      <Card>
        <CardHeader><CardTitle>작업지시 선택</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1 p-2">
          {targets.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w)}
              className={cn(
                "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                selected.id === w.id ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-elevated",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-caption text-text-muted">{w.code}</span>
                <StatusPill tone={workOrderTone(w.status)}>{STATUS_LABEL[w.status]}</StatusPill>
              </div>
              <span className="text-body-sm text-text">{w.itemName}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* 우: 실적 폼 */}
      <Card>
        <CardHeader><CardTitle>실적 입력 — {selected.code}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-8">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">양품 수량</span>
              <NumberStepper aria-label="양품 수량" value={good} onValueChange={setGood} min={0} max={99999} step={10} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">불량 수량</span>
              <NumberStepper aria-label="불량 수량" value={defect} onValueChange={setDefect} min={0} max={99999} step={1} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">비가동(분)</span>
              <NumberStepper aria-label="비가동 분" value={downtime} onValueChange={setDowntime} min={0} max={480} step={5} />
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex max-w-xs flex-1 flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">불량코드</span>
              <Select value={defectCode} onValueChange={setDefectCode}>
                <SelectTrigger><SelectValue placeholder="불량코드 선택" /></SelectTrigger>
                <SelectContent>
                  {DEFECT_CODES.map((d) => (
                    <SelectItem key={d.code} value={d.code}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex max-w-xs flex-1 flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">작업자</span>
              <Select value={operatorId} onValueChange={setOperatorId}>
                <SelectTrigger><SelectValue placeholder="작업자 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_OPERATOR}>미지정</SelectItem>
                  {operators.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.code} {o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex max-w-xs flex-1 flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">근무조</span>
              <Select value={shiftId} onValueChange={setShiftId}>
                <SelectTrigger><SelectValue placeholder="근무조 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SHIFT}>미지정</SelectItem>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex max-w-xs flex-1 flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">정지사유</span>
              <Select value={downtimeReasonId} onValueChange={setDowntimeReasonId}>
                <SelectTrigger><SelectValue placeholder="정지사유 선택" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REASON}>미지정</SelectItem>
                  {downtimeReasons.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={resetForm}>초기화</Button>
            <Button onClick={submit}>실적 등록</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const recentColumns: ColumnDef<RecentResultRow>[] = [
  { accessorKey: "workOrderCode", header: "작업지시", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
  { accessorKey: "goodQty", header: "양품", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  { accessorKey: "defectQty", header: "불량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  { accessorKey: "downtimeMin", header: "정지(분)", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
  { accessorKey: "operatorName", header: "작업자", cell: (c) => c.getValue<string | null>() ?? "-" },
  { accessorKey: "shiftName", header: "근무조", cell: (c) => c.getValue<string | null>() ?? "-" },
  { accessorKey: "downtimeReasonLabel", header: "정지사유", cell: (c) => c.getValue<string | null>() ?? "-" },
  { accessorKey: "createdAt", header: "일시", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>().slice(0, 19).replace("T", " ")}</span> },
];

interface ProductionClientProps {
  targets: WorkOrderRow[];
  operators: OperatorRow[];
  shifts: ShiftRow[];
  downtimeReasons: DowntimeReasonRow[];
  recentResults: RecentResultRow[];
}

export function ProductionClient({ targets, operators, shifts, downtimeReasons, recentResults }: ProductionClientProps) {
  return (
    <ToastProvider>
      <SectionHeader title="생산실적 입력" description="작업지시 선택 후 양품·불량·비가동 등록" />
      {targets.length === 0 ? (
        <p className="text-body-sm text-text-muted">등록 대상 작업지시가 없습니다.</p>
      ) : (
        <ProductionForm targets={targets} operators={operators} shifts={shifts} downtimeReasons={downtimeReasons} />
      )}

      <Card>
        <CardHeader><CardTitle>최근 생산실적 목록</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={recentColumns} data={recentResults} enablePagination pageSize={10} emptyMessage="등록된 실적이 없습니다." />
        </CardContent>
      </Card>
    </ToastProvider>
  );
}
