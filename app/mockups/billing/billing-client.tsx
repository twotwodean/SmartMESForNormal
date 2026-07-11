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
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { toCsv } from "@/lib/domain/csv";
import { downloadCsv } from "@/components/app/download-csv";
import type { InvoiceStatus } from "@/lib/domain/types";
import type { InvoiceRow } from "@/lib/services/billing-service";
import type { SupplierRow } from "@/lib/services/procurement-service";
import type { ShipmentRow } from "@/lib/services/sales-service";

const NO_SHIPMENT = "__NONE__";

const INVOICE_LABEL: Record<InvoiceStatus, string> = {
  ISSUED: "미수금",
  PARTIAL: "부분수금",
  PAID: "완납",
};

function invoiceTone(status: InvoiceStatus): Tone {
  const map: Record<InvoiceStatus, Tone> = {
    ISSUED: "warn",
    PARTIAL: "primary",
    PAID: "ok",
  };
  return map[status];
}

interface BillingInnerProps {
  invoices: InvoiceRow[];
  customers: SupplierRow[];
  shipments: ShipmentRow[];
}

function BillingInner({ invoices, customers, shipments }: BillingInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  // 청구 발행 다이얼로그
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [customerId, setCustomerId] = React.useState<string>(customers[0]?.id ?? "");
  const [shipmentId, setShipmentId] = React.useState<string>(NO_SHIPMENT);
  const [issueAmount, setIssueAmount] = React.useState(0);

  // 수금 다이얼로그
  const [payOpen, setPayOpen] = React.useState(false);
  const [payTarget, setPayTarget] = React.useState<InvoiceRow | null>(null);
  const [payAmount, setPayAmount] = React.useState(0);

  function resetIssueForm() {
    setCustomerId(customers[0]?.id ?? "");
    setShipmentId(NO_SHIPMENT);
    setIssueAmount(0);
  }

  function openPay(inv: InvoiceRow) {
    setPayTarget(inv);
    setPayAmount(inv.outstanding);
    setPayOpen(true);
  }

  async function submitIssue() {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        amount: issueAmount,
        shipmentId: shipmentId === NO_SHIPMENT ? undefined : shipmentId,
      }),
    });
    if (res.ok) {
      toast({ title: "청구 발행됨", tone: "ok" });
      setIssueOpen(false);
      resetIssueForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "청구 발행은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "발행 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  async function submitPay() {
    if (!payTarget) return;
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: payTarget.id, amount: payAmount }),
    });
    if (res.ok) {
      toast({ title: "수금 등록됨", tone: "ok" });
      setPayOpen(false);
      setPayTarget(null);
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "수금 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  function exportCsv() {
    downloadCsv("invoices.csv", toCsv(
      invoices.map((i) => ({
        ...i,
        shipmentCode: i.shipmentCode ?? "-",
        status: INVOICE_LABEL[i.status],
        issuedAt: i.issuedAt.slice(0, 10),
      })),
      [
        { key: "code", label: "청구번호" },
        { key: "customerName", label: "고객" },
        { key: "shipmentCode", label: "출하" },
        { key: "amount", label: "청구액" },
        { key: "paid", label: "수금액" },
        { key: "outstanding", label: "미수금" },
        { key: "status", label: "상태" },
        { key: "issuedAt", label: "발행일" },
      ],
    ));
  }

  const columns: ColumnDef<InvoiceRow>[] = [
    { accessorKey: "code", header: "청구번호", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "customerName", header: "고객" },
    { accessorKey: "shipmentCode", header: "출하", cell: (c) => c.getValue<string | null>() ?? "-" },
    { accessorKey: "amount", header: "청구액", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "paid", header: "수금액", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    {
      accessorKey: "outstanding",
      header: "미수금",
      cell: (c) => <span className="num font-semibold text-text">{c.getValue<number>().toLocaleString()}</span>,
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: (c) => {
        const s = c.getValue<InvoiceStatus>();
        return <StatusPill tone={invoiceTone(s)}>{INVOICE_LABEL[s]}</StatusPill>;
      },
    },
    { accessorKey: "issuedAt", header: "발행일", cell: (c) => <span className="num">{c.getValue<string>().slice(0, 10)}</span> },
    {
      id: "act",
      header: "",
      cell: (c) => {
        const row = c.row.original;
        if (row.status === "PAID") return null;
        return (
          <Button variant="secondary" size="sm" onClick={() => openPay(row)}>
            수금
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <SectionHeader
        title="영업 · 매출/수금"
        description="청구 발행 · 수금 등록 · 미수금"
        actions={
          <>
          <Button variant="secondary" size="sm" onClick={exportCsv}>CSV</Button>
          <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIssueOpen(true)}>청구 발행</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>청구 발행</DialogTitle>
                <DialogDescription>고객·출하(선택)·청구액을 입력합니다.</DialogDescription>
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
                  <span className="text-body-sm text-text-muted">출하 (선택)</span>
                  <Select value={shipmentId} onValueChange={setShipmentId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_SHIPMENT}>미지정</SelectItem>
                      {shipments.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">청구액</span>
                  <Input
                    type="number"
                    min={1}
                    value={issueAmount}
                    onChange={(e) => setIssueAmount(Number(e.target.value))}
                  />
                </label>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">취소</Button>
                </DialogClose>
                <Button onClick={submitIssue}>발행</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </>
        }
      />

      <Card>
        <CardHeader><CardTitle>청구 목록</CardTitle></CardHeader>
        <CardContent>
          <DataTable columns={columns} data={invoices} enableFilter filterPlaceholder="청구·고객·출하 검색" />
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={(o) => { setPayOpen(o); if (!o) setPayTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수금 등록 — {payTarget?.code}</DialogTitle>
            <DialogDescription>수금액을 입력합니다. (미수금 {payTarget?.outstanding.toLocaleString()})</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">수금액</span>
              <Input
                type="number"
                min={1}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
              />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">취소</Button>
            </DialogClose>
            <Button onClick={submitPay}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BillingClient({ invoices, customers, shipments }: BillingInnerProps) {
  return (
    <ToastProvider>
      <BillingInner invoices={invoices} customers={customers} shipments={shipments} />
    </ToastProvider>
  );
}
