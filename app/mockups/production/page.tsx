"use client";

import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Button } from "@/components/ui/button";
import { StatusPill, workOrderTone } from "@/components/ui/status-pill";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { WORK_ORDERS, DEFECT_CODES, type WorkOrder, type WorkOrderStatus } from "@/lib/mock-data";

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  WAITING: "대기", RUNNING: "진행", DONE: "완료", CANCELLED: "취소",
};

// 실적 등록 대상: 진행/대기 작업지시
const TARGETS = WORK_ORDERS.filter((w) => w.status === "RUNNING" || w.status === "WAITING");

function ProductionForm() {
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<WorkOrder>(TARGETS[0]);
  const [good, setGood] = React.useState(0);
  const [defect, setDefect] = React.useState(0);
  const [defectCode, setDefectCode] = React.useState<string>("");
  const [downtime, setDowntime] = React.useState(0);

  function submit() {
    toast({
      title: "실적 등록됨",
      description: `${selected.code} · 양품 ${good.toLocaleString()} / 불량 ${defect.toLocaleString()}`,
      tone: "ok",
    });
    setGood(0);
    setDefect(0);
    setDefectCode("");
    setDowntime(0);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* 좌: 작업지시 선택 */}
      <Card>
        <CardHeader><CardTitle>작업지시 선택</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-1 p-2">
          {TARGETS.map((w) => (
            <button
              key={w.code}
              type="button"
              onClick={() => setSelected(w)}
              className={cn(
                "flex flex-col gap-0.5 rounded-md border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                selected.code === w.code ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-elevated",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-caption text-text-muted">{w.code}</span>
                <StatusPill tone={workOrderTone(w.status)}>{STATUS_LABEL[w.status]}</StatusPill>
              </div>
              <span className="text-body-sm text-text">{w.item}</span>
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

          <label className="flex max-w-xs flex-col gap-1.5">
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

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setGood(0); setDefect(0); setDefectCode(""); setDowntime(0); }}>초기화</Button>
            <Button onClick={submit}>실적 등록</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductionPage() {
  return (
    <ToastProvider>
      <SectionHeader title="생산실적 입력" description="작업지시 선택 후 양품·불량·비가동 등록" />
      <ProductionForm />
    </ToastProvider>
  );
}
