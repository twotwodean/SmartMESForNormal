"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, stockTone } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NumberStepper } from "@/components/ui/number-stepper";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { toCsv } from "@/lib/domain/csv";
import { downloadCsv } from "@/components/app/download-csv";
import type { StockRow, TxnRow } from "@/lib/services/inventory-service";
import type { Paginated } from "@/lib/api/pagination";
import type { StockStatus, InventoryTxnType } from "@/lib/domain/types";

const STATUS_LABEL: Record<StockStatus, string> = { NORMAL: "정상", BELOW: "미달", NEGATIVE: "음수" };

type TxnFormType = "IN" | "OUT" | "ADJUST";
const TXN_TYPE_LABEL: Record<TxnFormType, string> = { IN: "입고", OUT: "출고", ADJUST: "조정" };

function InventoryInner({ rows }: { rows: StockRow[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [itemId, setItemId] = React.useState<string>(rows[0]?.itemId ?? "");
  const [type, setType] = React.useState<TxnFormType>("IN");
  const [qty, setQty] = React.useState(0);

  // ========================================================================
  // 수불 이력(품목별, 서버사이드 페이지네이션 - 클라이언트 재조회)
  // ========================================================================
  const [txnItemId, setTxnItemId] = React.useState<string>(rows[0]?.itemId ?? "");
  const [txnSearchInput, setTxnSearchInput] = React.useState("");
  const [txnQuery, setTxnQuery] = React.useState<{ page: number; search: string }>({ page: 1, search: "" });
  const [txnResult, setTxnResult] = React.useState<Paginated<TxnRow> | null>(null);
  const [txnLoading, setTxnLoading] = React.useState(false);

  const fetchTxns = React.useCallback(async (id: string, page: number, search: string) => {
    if (!id) {
      setTxnResult(null);
      return;
    }
    setTxnLoading(true);
    try {
      const sp = new URLSearchParams({ itemId: id, page: String(page) });
      if (search) sp.set("q", search);
      const res = await fetch(`/api/inventory/txns?${sp.toString()}`);
      setTxnResult(res.ok ? await res.json() : null);
    } finally {
      setTxnLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchTxns(txnItemId, txnQuery.page, txnQuery.search);
  }, [txnItemId, txnQuery, fetchTxns]);

  function onTxnItemChange(id: string) {
    setTxnItemId(id);
    setTxnSearchInput("");
    setTxnQuery({ page: 1, search: "" });
  }

  function submitTxnSearch(e: React.FormEvent) {
    e.preventDefault();
    setTxnQuery({ page: 1, search: txnSearchInput.trim() });
  }

  function gotoTxnPage(page: number) {
    setTxnQuery((q) => ({ ...q, page }));
  }

  const txnColumns: ColumnDef<TxnRow>[] = [
    { accessorKey: "createdAt", header: "일시", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>().slice(0, 19).replace("T", " ")}</span> },
    { accessorKey: "type", header: "유형" },
    { accessorKey: "qty", header: "수량", cell: (c) => { const v = c.getValue<number>(); return <span className={`num ${v < 0 ? "text-crit font-semibold" : "text-text"}`}>{v.toLocaleString()}</span>; } },
    { accessorKey: "ref", header: "참조", cell: (c) => c.getValue<string | null>() ?? "-" },
  ];

  const warn = rows.filter((r) => r.status !== "NORMAL").length;
  const columns: ColumnDef<StockRow>[] = [
    { accessorKey: "code", header: "품목코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "품목명" },
    { accessorKey: "qty", header: "현재고", cell: (c) => { const v = c.getValue<number>(); return <span className={`num ${v < 0 ? "text-crit font-semibold" : "text-text"}`}>{v.toLocaleString()}</span>; } },
    { accessorKey: "safety", header: "안전재고", cell: (c) => <span className="num text-text-muted">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "uom", header: "단위" },
    { accessorKey: "status", header: "상태", cell: (c) => { const s = c.getValue<StockStatus>(); return <StatusPill tone={stockTone(s)}>{STATUS_LABEL[s]}</StatusPill>; } },
  ];

  function exportCsv() {
    downloadCsv("inventory.csv", toCsv(rows, [
      { key: "code", label: "품목코드" },
      { key: "name", label: "품목명" },
      { key: "qty", label: "현재고" },
      { key: "safety", label: "안전재고" },
      { key: "uom", label: "단위" },
      { key: "status", label: "상태" },
    ]));
  }

  function resetForm() {
    setItemId(rows[0]?.itemId ?? "");
    setType("IN");
    setQty(0);
  }

  async function submitTxn() {
    const signedQty = type === "OUT" ? -qty : qty;
    const res = await fetch("/api/inventory/txns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, type: type as InventoryTxnType, qty: signedQty }),
    });
    if (res.ok) {
      toast({ title: "수불 등록됨", tone: "ok" });
      setOpen(false);
      resetForm();
      router.refresh();
      if (itemId === txnItemId) void fetchTxns(txnItemId, txnQuery.page, txnQuery.search);
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "수불 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  return (
    <>
      <SectionHeader
        title="재고 현황"
        description="실시간 파생 현재고(수불 합계) · 안전재고 대비"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv}>CSV 내보내기</Button>
            <Button size="sm" onClick={() => setOpen(true)}>수불 등록</Button>
          </>
        }
      />
      {warn > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-body-sm font-medium text-warn">
          ⚠ 재고 경고 {warn}건 — 안전재고 미달·음수 품목이 있습니다.
        </div>
      )}
      <Card><CardContent><DataTable columns={columns} data={rows} enableFilter filterPlaceholder="품목 검색" /></CardContent></Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-body-sm font-semibold text-text">수불 이력</h3>
          <label className="flex max-w-sm flex-col gap-1.5">
            <span className="text-body-sm text-text-muted">품목</span>
            <Select value={txnItemId} onValueChange={onTxnItemChange}>
              <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
              <SelectContent>
                {rows.map((r) => (
                  <SelectItem key={r.itemId} value={r.itemId}>{r.code} {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <form onSubmit={submitTxnSearch} className="flex gap-2">
            <Input
              value={txnSearchInput}
              onChange={(e) => setTxnSearchInput(e.target.value)}
              placeholder="참조·유형 검색"
              className="max-w-xs"
            />
            <Button type="submit" variant="secondary" size="sm">검색</Button>
          </form>
          {txnLoading ? (
            <p className="text-body-sm text-text-muted">불러오는 중…</p>
          ) : txnResult ? (
            <>
              <DataTable columns={txnColumns} data={txnResult.rows} enablePagination={false} emptyMessage="수불 이력이 없습니다." />
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-muted num">
                  {txnResult.page} / {txnResult.pageCount} 페이지 · 총 {txnResult.total}건
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => gotoTxnPage(txnResult.page - 1)}
                    disabled={txnResult.page <= 1}
                  >
                    이전
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => gotoTxnPage(txnResult.page + 1)}
                    disabled={txnResult.page >= txnResult.pageCount}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-body-sm text-text-muted">품목을 선택하세요.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수불 등록</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">품목</span>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
                <SelectContent>
                  {rows.map((r) => (
                    <SelectItem key={r.itemId} value={r.itemId}>{r.code} {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">유형</span>
              <Select value={type} onValueChange={(v) => setType(v as TxnFormType)}>
                <SelectTrigger><SelectValue placeholder="유형 선택" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TXN_TYPE_LABEL) as TxnFormType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TXN_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">수량</span>
              <NumberStepper aria-label="수량" value={qty} onValueChange={setQty} min={0} max={99999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>취소</Button>
            <Button onClick={submitTxn} disabled={!itemId}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InventoryClient({ rows }: { rows: StockRow[] }) {
  return (
    <ToastProvider>
      <InventoryInner rows={rows} />
    </ToastProvider>
  );
}
