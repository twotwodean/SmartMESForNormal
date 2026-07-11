"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, equipmentTone, type Tone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { MaintenanceType, MaintenanceStatus } from "@/lib/domain/types";
import type {
  MaintenanceSummary,
  EquipmentRow,
  MaintenanceOrderRow,
  ScheduleRow,
} from "@/lib/services/equipment-service";

const TYPE_LABEL: Record<MaintenanceType, string> = {
  REPAIR: "수리",
  PREVENTIVE: "예방",
  PREDICTIVE: "예지보전",
};

const TYPE_OPTIONS: MaintenanceType[] = ["REPAIR", "PREVENTIVE"];

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  REQUESTED: "요청",
  IN_PROGRESS: "진행중",
  DONE: "완료",
};

function orderStatusTone(status: MaintenanceStatus): Tone {
  const map: Record<MaintenanceStatus, Tone> = { REQUESTED: "warn", IN_PROGRESS: "primary", DONE: "ok" };
  return map[status];
}

interface EquipmentBrief {
  id: string;
  code: string;
  name: string;
}

interface EquipmentInnerProps {
  summary: MaintenanceSummary;
  equipment: EquipmentRow[];
  orders: MaintenanceOrderRow[];
  schedules: ScheduleRow[];
  brief: EquipmentBrief[];
}

function EquipmentInner({ summary, equipment, orders, schedules, brief }: EquipmentInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [equipmentId, setEquipmentId] = React.useState<string>(brief[0]?.id ?? "");
  const [type, setType] = React.useState<MaintenanceType>("REPAIR");
  const [description, setDescription] = React.useState("");

  function resetForm() {
    setEquipmentId(brief[0]?.id ?? "");
    setType("REPAIR");
    setDescription("");
  }

  async function submit() {
    const res = await fetch("/api/maintenance-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipmentId, type, description }),
    });
    if (res.ok) {
      toast({ title: "수리 의뢰됨", tone: "ok" });
      setOpen(false);
      resetForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "수리 의뢰는 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  async function advance(id: string, action: "start" | "finish") {
    const res = await fetch(`/api/maintenance-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast({ title: "정비 상태 변경", tone: "ok" });
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "정비 상태 변경은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      toast({ title: "실패", tone: "crit" });
    }
  }

  const columns: ColumnDef<MaintenanceOrderRow>[] = [
    { accessorKey: "equipmentName", header: "설비" },
    {
      accessorKey: "type",
      header: "유형",
      cell: (c) => TYPE_LABEL[c.getValue<MaintenanceType>()],
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: (c) => {
        const s = c.getValue<MaintenanceStatus>();
        return <StatusPill tone={orderStatusTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
      },
    },
    {
      accessorKey: "repairMin",
      header: "수리시간",
      cell: (c) => {
        const v = c.getValue<number | null>();
        return <span className="num">{v != null ? `${v}분` : "—"}</span>;
      },
    },
    {
      accessorKey: "requestedAt",
      header: "요청일",
      cell: (c) => <span className="num">{c.getValue<string>().slice(0, 10)}</span>,
    },
    {
      id: "actions",
      header: "액션",
      cell: (c) => {
        const row = c.row.original;
        if (row.status === "REQUESTED") {
          return <Button size="sm" onClick={() => advance(row.id, "start")}>시작</Button>;
        }
        if (row.status === "IN_PROGRESS") {
          return <Button size="sm" onClick={() => advance(row.id, "finish")}>완료</Button>;
        }
        return null;
      },
    },
  ];

  const mtbfDays = Math.round(summary.mtbfMin / 1440);

  return (
    <>
      <SectionHeader
        title="설비 보전"
        description="설비 현황 · MTTR/MTBF · 정비주문 · 예방점검"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>수리 의뢰</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>수리 의뢰</DialogTitle>
                <DialogDescription>대상 설비·유형·설명을 입력합니다.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">설비</span>
                  <Select value={equipmentId} onValueChange={setEquipmentId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {brief.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.code} {b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">유형</span>
                  <Select value={type} onValueChange={(v) => setType(v as MaintenanceType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">설명</span>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="증상/요청 내용" />
                </label>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">취소</Button>
                </DialogClose>
                <Button onClick={submit}>등록</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPITile
          label="MTTR"
          value={summary.mttrMin.toLocaleString()}
          unit="분"
          tone={summary.mttrMin > 120 ? "warn" : "ok"}
        />
        <KPITile
          label="MTBF"
          value={mtbfDays.toLocaleString()}
          unit="일"
          tone="info"
        />
        <KPITile
          label="정비중"
          value={summary.openCount.toLocaleString()}
          unit="건"
          tone={summary.openCount > 0 ? "warn" : "ok"}
        />
        <KPITile
          label="완료 수리"
          value={summary.repairCount.toLocaleString()}
          unit="건"
          tone="neutral"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>설비 현황</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {equipment.map((eq) => (
              <div key={eq.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="num text-caption text-text-muted">{eq.code}</span>
                  <span className="text-body-sm font-semibold text-text">{eq.name}</span>
                  <span className="text-caption text-text-muted">{eq.center}</span>
                </div>
                <StatusPill tone={equipmentTone(eq.status)}>{eq.status === "REPAIR" ? "정비중" : "가동"}</StatusPill>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>정비주문</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={orders} enableFilter filterPlaceholder="설비 검색" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>예방점검</CardTitle></CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-body-sm text-text-muted">예방점검 일정 없음</p>
          ) : (
            <div className="flex flex-col gap-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Wrench size={14} className="text-text-muted" aria-hidden />
                    <span className="text-body-sm font-semibold text-text">{s.equipmentName}</span>
                    <span className="text-caption text-text-muted">주기 {s.intervalDays}일</span>
                  </div>
                  <span className="num text-body-sm text-text-muted">다음점검 {s.nextDate.slice(0, 10)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function EquipmentClient({ summary, equipment, orders, schedules, brief }: EquipmentInnerProps) {
  return (
    <ToastProvider>
      <EquipmentInner summary={summary} equipment={equipment} orders={orders} schedules={schedules} brief={brief} />
    </ToastProvider>
  );
}
