"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NumberStepper } from "@/components/ui/number-stepper";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { PurchaseOrderStatus } from "@/lib/domain/types";
import type { PurchaseOrderRow, SupplierRow } from "@/lib/services/procurement-service";

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  ORDERED: "발주",
  PARTIAL: "부분입고",
  RECEIVED: "입고완료",
  CANCELLED: "취소",
};

function poTone(status: PurchaseOrderStatus): Tone {
  const map: Record<PurchaseOrderStatus, Tone> = {
    ORDERED: "neutral",
    PARTIAL: "warn",
    RECEIVED: "ok",
    CANCELLED: "neutral",
  };
  return map[status];
}

interface ItemBrief {
  id: string;
  code: string;
  name: string;
}

interface ProcurementInnerProps {
  orders: PurchaseOrderRow[];
  suppliers: SupplierRow[];
  items: ItemBrief[];
}

function ProcurementInner({ orders, suppliers, items }: ProcurementInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  // 발주 등록 다이얼로그
  const [createOpen, setCreateOpen] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState<string>(suppliers[0]?.id ?? "");
  const [itemId, setItemId] = React.useState<string>(items[0]?.id ?? "");
  const [createQty, setCreateQty] = React.useState(1);

  // 입고 처리 다이얼로그
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [receiveTarget, setReceiveTarget] = React.useState<PurchaseOrderRow | null>(null);
  const [receiveQty, setReceiveQty] = React.useState(1);

  function openReceive(po: PurchaseOrderRow) {
    setReceiveTarget(po);
    setReceiveQty(Math.max(1, po.qty - po.received));
    setReceiveOpen(true);
  }

  function resetCreateForm() {
    setSupplierId(suppliers[0]?.id ?? "");
    setItemId(items[0]?.id ?? "");
    setCreateQty(1);
  }

  async function submitCreate() {
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId, itemId, qty: createQty }),
    });
    if (res.ok) {
      toast({ title: "발주 등록됨", tone: "ok" });
      setCreateOpen(false);
      resetCreateForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "발주 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  async function submitReceive() {
    if (!receiveTarget) return;
    const res = await fetch("/api/goods-receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseOrderId: receiveTarget.id, qty: receiveQty }),
    });
    if (res.ok) {
      toast({ title: "입고 처리됨", tone: "ok" });
      setReceiveOpen(false);
      setReceiveTarget(null);
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "입고 처리는 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "처리 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  const receivedCount = orders.filter((o) => o.status === "RECEIVED").length;
  const partialCount = orders.filter((o) => o.status === "PARTIAL").length;
  const orderedCount = orders.filter((o) => o.status === "ORDERED").length;

  const columns: ColumnDef<PurchaseOrderRow>[] = [
    { accessorKey: "code", header: "발주번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "supplierName", header: "거래처" },
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "qty", header: "발주량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "received", header: "입고량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    {
      accessorKey: "progress",
      header: "진척",
      cell: (c) => {
        const row = c.row.original;
        return (
          <div className="flex items-center gap-2">
            <ProgressBar value={row.progress} tone={poTone(row.status)} className="w-24" />
            <span className="num text-caption text-text-muted">{row.progress}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: (c) => {
        const s = c.getValue<PurchaseOrderStatus>();
        return <StatusPill tone={poTone(s)}>{STATUS_LABEL[s]}</StatusPill>;
      },
    },
    {
      id: "act",
      header: "",
      cell: (c) => {
        const row = c.row.original;
        if (row.status === "RECEIVED" || row.status === "CANCELLED") return null;
        return (
          <Button variant="secondary" size="sm" onClick={() => openReceive(row)}>
            입고
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <SectionHeader
        title="구매 · 발주"
        description="발주 현황 · 입고 처리 · 발주대비 입고"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreateOpen(true)}>발주 등록</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>발주 등록</DialogTitle>
                <DialogDescription>거래처·품목·수량을 입력합니다.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">거래처</span>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.code} {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
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
                  <NumberStepper aria-label="수량" value={createQty} onValueChange={setCreateQty} min={1} max={99999} step={10} />
                </label>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">취소</Button>
                </DialogClose>
                <Button onClick={submitCreate}>등록</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPITile label="발주 총" value={orders.length.toLocaleString()} tone="primary" />
        <KPITile label="입고완료" value={receivedCount.toLocaleString()} tone="ok" />
        <KPITile label="부분입고" value={partialCount.toLocaleString()} tone="warn" />
        <KPITile label="미입고" value={orderedCount.toLocaleString()} tone="neutral" />
      </div>

      <Card>
        <CardHeader><CardTitle>발주 목록</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={orders} enableFilter filterPlaceholder="발주·거래처·품목 검색" />
        </CardContent>
      </Card>

      <Dialog open={receiveOpen} onOpenChange={(o) => { setReceiveOpen(o); if (!o) setReceiveTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>입고 처리 — {receiveTarget?.code}</DialogTitle>
            <DialogDescription>
              남은 수량 {receiveTarget ? (receiveTarget.qty - receiveTarget.received).toLocaleString() : 0} 중 입고할 수량을 입력합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">입고 수량</span>
              <NumberStepper aria-label="입고 수량" value={receiveQty} onValueChange={setReceiveQty} min={1} max={99999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">취소</Button>
            </DialogClose>
            <Button onClick={submitReceive}>입고</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProcurementClient({ orders, suppliers, items }: ProcurementInnerProps) {
  return (
    <ToastProvider>
      <ProcurementInner orders={orders} suppliers={suppliers} items={items} />
    </ToastProvider>
  );
}
