"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill, inspectionTone, type Tone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { NumberStepper } from "@/components/ui/number-stepper";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { toCsv } from "@/lib/domain/csv";
import { downloadCsv } from "@/components/app/download-csv";
import type { InspectionType, InspectionResult } from "@/lib/domain/types";
import type { QualitySummary, InspectionRow, NonconformanceRow } from "@/lib/services/quality-service";

const TYPE_LABEL: Record<InspectionType, string> = {
  RECEIVING: "인수",
  PROCESS: "공정",
  SHIPPING: "출하",
};

const RESULT_LABEL: Record<InspectionResult, string> = {
  PASS: "합격",
  FAIL: "불합격",
  SPECIAL: "특채",
};

const TYPE_OPTIONS: InspectionType[] = ["RECEIVING", "PROCESS", "SHIPPING"];
const RESULT_OPTIONS: InspectionResult[] = ["PASS", "FAIL", "SPECIAL"];

function ppmTone(n: number): Tone {
  return n >= 10000 ? "crit" : n >= 3000 ? "warn" : "ok";
}

function ncTone(status: string): Tone {
  const map: Record<string, Tone> = { OPEN: "warn", ACTION: "primary", CLOSED: "neutral" };
  return map[status] ?? "neutral";
}

interface ItemBrief {
  id: string;
  code: string;
  name: string;
}

interface QualityInnerProps {
  summary: QualitySummary;
  inspections: InspectionRow[];
  nonconformances: NonconformanceRow[];
  items: ItemBrief[];
}

function QualityInner({ summary, inspections, nonconformances, items }: QualityInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<InspectionType>("PROCESS");
  const [result, setResult] = React.useState<InspectionResult>("PASS");
  const [itemId, setItemId] = React.useState<string>(items[0]?.id ?? "");
  const [qty, setQty] = React.useState(0);
  const [defectQty, setDefectQty] = React.useState(0);

  function resetForm() {
    setType("PROCESS");
    setResult("PASS");
    setItemId(items[0]?.id ?? "");
    setQty(0);
    setDefectQty(0);
  }

  async function submit() {
    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, result, itemId, qty, defectQty }),
    });
    if (res.ok) {
      toast({ title: "검사 등록됨", tone: "ok" });
      setOpen(false);
      resetForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "검사 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  function exportInspectionsCsv() {
    downloadCsv("inspections.csv", toCsv(
      inspections.map((i) => ({
        ...i,
        type: TYPE_LABEL[i.type],
        result: RESULT_LABEL[i.result],
        inspectedAt: i.inspectedAt.slice(0, 10),
      })),
      [
        { key: "type", label: "유형" },
        { key: "result", label: "판정" },
        { key: "itemName", label: "품목" },
        { key: "qty", label: "수량" },
        { key: "defectQty", label: "불량" },
        { key: "ppm", label: "PPM" },
        { key: "inspectedAt", label: "일자" },
      ],
    ));
  }

  function exportNonconformancesCsv() {
    downloadCsv("nonconformances.csv", toCsv(
      nonconformances.map((n) => ({ ...n, action: n.action ?? "-", createdAt: n.createdAt.slice(0, 10) })),
      [
        { key: "defectLabel", label: "부적합 유형" },
        { key: "qty", label: "수량" },
        { key: "status", label: "상태" },
        { key: "action", label: "조치" },
        { key: "createdAt", label: "등록일" },
      ],
    ));
  }

  const columns: ColumnDef<InspectionRow>[] = [
    {
      accessorKey: "type",
      header: "유형",
      cell: (c) => TYPE_LABEL[c.getValue<InspectionType>()],
    },
    {
      accessorKey: "result",
      header: "판정",
      cell: (c) => {
        const r = c.getValue<InspectionResult>();
        return <StatusPill tone={inspectionTone(r)}>{RESULT_LABEL[r]}</StatusPill>;
      },
    },
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "qty", header: "수량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "defectQty", header: "불량", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    { accessorKey: "ppm", header: "PPM", cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span> },
    {
      accessorKey: "inspectedAt",
      header: "일자",
      cell: (c) => <span className="num">{c.getValue<string>().slice(0, 10)}</span>,
    },
  ];

  return (
    <>
      <SectionHeader
        title="품질 검사"
        description="인수·공정·출하 검사 · PPM · 부적합"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>검사 등록</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>검사 등록</DialogTitle>
                <DialogDescription>검사유형·판정·품목·수량·불량 수량을 입력합니다.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">검사유형</span>
                  <Select value={type} onValueChange={(v) => setType(v as InspectionType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-body-sm text-text-muted">판정</span>
                  <Select value={result} onValueChange={(v) => setResult(v as InspectionResult)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RESULT_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{RESULT_LABEL[r]}</SelectItem>
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
                <div className="flex flex-wrap gap-8">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-body-sm text-text-muted">수량</span>
                    <NumberStepper aria-label="수량" value={qty} onValueChange={setQty} min={0} max={99999} step={10} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-body-sm text-text-muted">불량</span>
                    <NumberStepper aria-label="불량" value={defectQty} onValueChange={setDefectQty} min={0} max={99999} step={1} />
                  </label>
                </div>
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
          label="전체 PPM"
          value={summary.overallPpm.toLocaleString()}
          unit="PPM"
          tone={ppmTone(summary.overallPpm)}
        />
        {summary.byType.map((t) => (
          <KPITile
            key={t.type}
            label={`${TYPE_LABEL[t.type]} PPM`}
            value={t.ppm.toLocaleString()}
            note={`${t.defect}/${t.qty}`}
            tone={ppmTone(t.ppm)}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="justify-between">
          <CardTitle>검사 목록</CardTitle>
          <Button variant="secondary" size="sm" onClick={exportInspectionsCsv}>CSV</Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={inspections} enableFilter filterPlaceholder="품목 검색" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="justify-between">
          <CardTitle>부적합</CardTitle>
          <Button variant="secondary" size="sm" onClick={exportNonconformancesCsv}>CSV</Button>
        </CardHeader>
        <CardContent>
          {nonconformances.length === 0 ? (
            <p className="text-body-sm text-text-muted">부적합 없음</p>
          ) : (
            <div className="flex flex-col gap-2">
              {nonconformances.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm font-semibold text-text">{n.defectLabel}</span>
                    <span className="num text-caption text-text-muted">{n.qty.toLocaleString()}</span>
                    <StatusPill tone={ncTone(n.status)}>{n.status}</StatusPill>
                  </div>
                  <span className="text-body-sm text-text-muted">{n.action ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export function QualityClient({ summary, inspections, nonconformances, items }: QualityInnerProps) {
  return (
    <ToastProvider>
      <QualityInner summary={summary} inspections={inspections} nonconformances={nonconformances} items={items} />
    </ToastProvider>
  );
}
