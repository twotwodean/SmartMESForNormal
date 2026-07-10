"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NumberStepper } from "@/components/ui/number-stepper";
import { DatePicker } from "@/components/ui/date-picker";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { SalesOrderStatus, ShipmentStatus } from "@/lib/domain/types";
import type { SalesOrderRow, ShipmentRow } from "@/lib/services/sales-service";
import type { SupplierRow } from "@/lib/services/procurement-service";

const SO_LABEL: Record<SalesOrderStatus, string> = {
  ORDERED: "수주",
  PRODUCING: "생산중",
  SHIPPED: "출하완료",
  CANCELLED: "취소",
};

function soTone(status: SalesOrderStatus): Tone {
  const map: Record<SalesOrderStatus, Tone> = {
    ORDERED: "neutral",
    PRODUCING: "primary",
    SHIPPED: "ok",
    CANCELLED: "neutral",
  };
  return map[status];
}

const SH_LABEL: Record<ShipmentStatus, string> = {
  REQUESTED: "요청",
  SHIPPED: "출하완료",
  RETURNED: "반품",
};

function shTone(status: ShipmentStatus): Tone {
  const map: Record<ShipmentStatus, Tone> = {
    REQUESTED: "warn",
    SHIPPED: "ok",
    RETURNED: "neutral",
  };
  return map[status];
}

interface ItemBrief {
  id: string;
  code: string;
  name: string;
}

interface SalesInnerProps {
  orders: SalesOrderRow[];
  shipments: ShipmentRow[];
  customers: SupplierRow[];
  items: ItemBrief[];
}

function SalesInner({ orders, shipments, customers, items }: SalesInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  // 수주 등록 다이얼로그
  const [createOpen, setCreateOpen] = React.useState(false);
  const [customerId, setCustomerId] = React.useState<string>(customers[0]?.id ?? "");
  const [itemId, setItemId] = React.useState<string>(items[0]?.id ?? "");
  const [createQty, setCreateQty] = React.useState(1);
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined);

  // 출하요청 다이얼로그
  const [shipReqOpen, setShipReqOpen] = React.useState(false);
  const [shipReqTarget, setShipReqTarget] = React.useState<SalesOrderRow | null>(null);
  const [shipReqQty, setShipReqQty] = React.useState(1);

  function openShipRequest(so: SalesOrderRow) {
    setShipReqTarget(so);
    setShipReqQty(Math.max(1, so.qty));
    setShipReqOpen(true);
  }

  function resetCreateForm() {
    setCustomerId(customers[0]?.id ?? "");
    setItemId(items[0]?.id ?? "");
    setCreateQty(1);
    setDueDate(undefined);
  }

  async function submitCreate() {
    if (!dueDate) {
      toast({ title: "납기를 선택하세요", tone: "crit" });
      return;
    }
    const res = await fetch("/api/sales-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, itemId, qty: createQty, dueDate: dueDate.toISOString() }),
    });
    if (res.ok) {
      toast({ title: "수주 등록됨", tone: "ok" });
      setCreateOpen(false);
      resetCreateForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "수주 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  async function submitShipRequest() {
    if (!shipReqTarget) return;
    const res = await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salesOrderId: shipReqTarget.id, qty: shipReqQty }),
    });
    if (res.ok) {
      toast({ title: "출하 요청됨", tone: "ok" });
      setShipReqOpen(false);
      setShipReqTarget(null);
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "출하 요청은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "요청 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  async function handleShipmentAction(id: string, action: "ship" | "return") {
    const res = await fetch(`/api/shipments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast({ title: action === "ship" ? "출하 처리됨" : "반품 처리됨", tone: "ok" });
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "처리 권한이 없습니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "처리 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  const orderColumns: ColumnDef<SalesOrderRow>[] = [
    { accessorKey: "code", header: "수주번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "customerName", header: "고객" },
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    {
      accessorKey: "status",
      header: "상태",
      cell: (c) => {
        const s = c.getValue<SalesOrderStatus>();
        return <StatusPill tone={soTone(s)}>{SO_LABEL[s]}</StatusPill>;
      },
    },
    { accessorKey: "dueDate", header: "납기", cell: (c) => <span className="num">{c.getValue<string>().slice(0, 10)}</span> },
    {
      id: "act",
      header: "",
      cell: (c) => {
        const row = c.row.original;
        if (row.status === "SHIPPED" || row.status === "CANCELLED") return null;
        return (
          <Button variant="secondary" size="sm" onClick={() => openShipRequest(row)}>
            출하요청
          </Button>
        );
      },
    },
  ];

  const shipmentColumns: ColumnDef<ShipmentRow>[] = [
    { accessorKey: "code", header: "출하번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "salesOrderCode", header: "수주", cell: (c) => c.getValue<string | null>() ?? "-" },
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    {
      accessorKey: "status",
      header: "상태",
      cell: (c) => {
        const s = c.getValue<ShipmentStatus>();
        return <StatusPill tone={shTone(s)}>{SH_LABEL[s]}</StatusPill>;
      },
    },
    { accessorKey: "shippedAt", header: "출하일", cell: (c) => { const v = c.getValue<string | null>(); return <span className="num">{v ? v.slice(0, 10) : "-"}</span>; } },
    {
      id: "act",
      header: "",
      cell: (c) => {
        const row = c.row.original;
        if (row.status === "REQUESTED") {
          return (
            <Button variant="secondary" size="sm" onClick={() => handleShipmentAction(row.id, "ship")}>
              출하
            </Button>
          );
        }
        if (row.status === "SHIPPED") {
          return (
            <Button variant="secondary" size="sm" onClick={() => handleShipmentAction(row.id, "return")}>
              반품
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <>
      <SectionHeader
        title="영업 · 수주/출하"
        description="수주 · 출하요청 · 출하등록/반품"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreateOpen(true)}>수주 등록</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>수주 등록</DialogTitle>
                <DialogDescription>고객·품목·수량·납기를 입력합니다.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">고객</span>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} {c.name}</SelectItem>
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
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">납기</span>
                  <DatePicker aria-label="납기" value={dueDate} onChange={setDueDate} />
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

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">수주</TabsTrigger>
          <TabsTrigger value="shipments">출하</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <Card>
            <CardHeader><CardTitle>수주 목록</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={orderColumns} data={orders} enableFilter filterPlaceholder="수주·고객·품목 검색" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="shipments">
          <Card>
            <CardHeader><CardTitle>출하 목록</CardTitle></CardHeader>
            <CardContent>
              <DataTable columns={shipmentColumns} data={shipments} enableFilter filterPlaceholder="출하·수주·품목 검색" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={shipReqOpen} onOpenChange={(o) => { setShipReqOpen(o); if (!o) setShipReqTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>출하요청 — {shipReqTarget?.code}</DialogTitle>
            <DialogDescription>출하할 수량을 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">수량</span>
              <NumberStepper aria-label="수량" value={shipReqQty} onValueChange={setShipReqQty} min={1} max={99999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">취소</Button>
            </DialogClose>
            <Button onClick={submitShipRequest}>요청</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SalesClient({ orders, shipments, customers, items }: SalesInnerProps) {
  return (
    <ToastProvider>
      <SalesInner orders={orders} shipments={shipments} customers={customers} items={items} />
    </ToastProvider>
  );
}
