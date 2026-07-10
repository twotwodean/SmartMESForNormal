"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { ConcessionStatus } from "@/lib/domain/types";
import type { ConcessionRow } from "@/lib/services/concession-service";

const STATUS_LABEL: Record<ConcessionStatus, string> = {
  REQUESTED: "요청",
  APPROVED: "승인",
  REJECTED: "반려",
};

function concessionTone(status: ConcessionStatus): Tone {
  const map: Record<ConcessionStatus, Tone> = {
    REQUESTED: "warn",
    APPROVED: "ok",
    REJECTED: "crit",
  };
  return map[status];
}

interface ItemBrief {
  id: string;
  code: string;
  name: string;
}

interface ConcessionInnerProps {
  concessions: ConcessionRow[];
  items: ItemBrief[];
}

function ConcessionInner({ concessions, items }: ConcessionInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  // 특채 요청 다이얼로그
  const [createOpen, setCreateOpen] = React.useState(false);
  const [itemId, setItemId] = React.useState<string>(items[0]?.id ?? "");
  const [qty, setQty] = React.useState(1);
  const [reason, setReason] = React.useState("");

  function resetCreateForm() {
    setItemId(items[0]?.id ?? "");
    setQty(1);
    setReason("");
  }

  async function submitCreate() {
    const res = await fetch("/api/concessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, qty, reason }),
    });
    if (res.ok) {
      toast({ title: "특채 요청됨", tone: "ok" });
      setCreateOpen(false);
      resetCreateForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "특채 요청은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "요청 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  async function handleDecide(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/concessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast({ title: action === "approve" ? "승인됨" : "반려됨", tone: "ok" });
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "승인/반려는 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "처리 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  const columns: ColumnDef<ConcessionRow>[] = [
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "reason", header: "사유" },
    {
      accessorKey: "status",
      header: "상태",
      cell: (c) => {
        const s = c.getValue<ConcessionStatus>();
        return <StatusPill tone={concessionTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
      },
    },
    { accessorKey: "requestedAt", header: "요청일", cell: (c) => <span className="num">{c.getValue<string>().slice(0, 10)}</span> },
    {
      accessorKey: "decidedAt",
      header: "결정일",
      cell: (c) => {
        const v = c.getValue<string | null>();
        return <span className="num">{v ? v.slice(0, 10) : "-"}</span>;
      },
    },
    {
      id: "act",
      header: "",
      cell: (c) => {
        const row = c.row.original;
        if (row.status !== "REQUESTED") return null;
        return (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleDecide(row.id, "approve")}>
              승인
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleDecide(row.id, "reject")}>
              반려
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <SectionHeader
        title="품질 · 특채(조건부 합격)"
        description="조건부 합격 요청 · 승인/반려"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreateOpen(true)}>특채 요청</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>특채 요청</DialogTitle>
                <DialogDescription>품목·수량·사유를 입력합니다.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">품목</span>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {items.map((it) => (
                        <SelectItem key={it.id} value={it.id}>{it.code} {it.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">수량</span>
                  <NumberStepper aria-label="수량" value={qty} onValueChange={setQty} min={1} max={99999} step={1} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">사유</span>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="조건부 합격 사유를 입력하세요" />
                </label>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">취소</Button>
                </DialogClose>
                <Button onClick={submitCreate}>요청</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader><CardTitle>특채 목록</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={concessions} enableFilter filterPlaceholder="품목·수량·사유 검색" />
        </CardContent>
      </Card>
    </>
  );
}

export function ConcessionClient({ concessions, items }: ConcessionInnerProps) {
  return (
    <ToastProvider>
      <ConcessionInner concessions={concessions} items={items} />
    </ToastProvider>
  );
}
