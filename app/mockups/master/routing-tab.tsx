"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { useToast } from "@/components/ui/toast";
import type {
  ItemRow, WorkCenterRow, ProcessStageRow, RoutingRow, RoutingStepRow,
} from "@/lib/services/master-service";
import { handleDetailResponse } from "./detail-response";

/** 작업장 선택 안 함(선택 항목) — Radix Select는 SelectItem에 빈 문자열 value를 허용하지 않아 sentinel 사용 */
const NO_WORK_CENTER = "__NONE__";

interface RoutingTabProps {
  items: ItemRow[];
  workCenters: WorkCenterRow[];
  processStages: ProcessStageRow[];
}

export function RoutingTab({ items, workCenters, processStages }: RoutingTabProps) {
  const { toast } = useToast();

  const [itemId, setItemId] = React.useState("");
  const [routings, setRoutings] = React.useState<RoutingRow[]>([]);

  const fetchRoutings = React.useCallback(async (id: string) => {
    if (!id) {
      setRoutings([]);
      return;
    }
    const res = await fetch(`/api/routings?itemId=${id}`);
    setRoutings(res.ok ? await res.json() : []);
  }, []);

  function onItemChange(id: string) {
    setItemId(id);
    void fetchRoutings(id);
  }

  // ========================================================================
  // 라우팅 추가 / 삭제
  // ========================================================================
  const [routingAddOpen, setRoutingAddOpen] = React.useState(false);
  const [routingName, setRoutingName] = React.useState("");

  function openRoutingAdd() {
    setRoutingName("");
    setRoutingAddOpen(true);
  }

  async function submitRoutingAdd() {
    if (!itemId || !routingName.trim()) return;
    const res = await fetch("/api/routings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, name: routingName }),
    });
    await handleDetailResponse(res, toast, "라우팅 추가됨", async () => {
      setRoutingAddOpen(false);
      await fetchRoutings(itemId);
    });
  }

  async function deleteRouting(id: string) {
    const res = await fetch(`/api/routings/${id}`, { method: "DELETE" });
    await handleDetailResponse(res, toast, "라우팅 삭제됨", () => fetchRoutings(itemId));
  }

  // ========================================================================
  // 공정 추가 / 삭제
  // ========================================================================
  const [stepAddOpen, setStepAddOpen] = React.useState(false);
  const [stepRoutingId, setStepRoutingId] = React.useState<string | null>(null);
  const [stepProcessStageId, setStepProcessStageId] = React.useState("");
  const [stepWorkCenterId, setStepWorkCenterId] = React.useState(NO_WORK_CENTER);
  const [stepSeq, setStepSeq] = React.useState(0);
  const [stepStdTime, setStepStdTime] = React.useState(0);

  function openStepAdd(routing: RoutingRow) {
    setStepRoutingId(routing.id);
    setStepProcessStageId("");
    setStepWorkCenterId(NO_WORK_CENTER);
    setStepSeq(routing.steps.length);
    setStepStdTime(0);
    setStepAddOpen(true);
  }

  async function submitStepAdd() {
    if (!stepRoutingId || !stepProcessStageId) return;
    const res = await fetch("/api/routing-steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routingId: stepRoutingId,
        processStageId: stepProcessStageId,
        workCenterId: stepWorkCenterId === NO_WORK_CENTER ? undefined : stepWorkCenterId,
        seq: stepSeq,
        stdTimeMin: stepStdTime,
      }),
    });
    await handleDetailResponse(res, toast, "공정 추가됨", async () => {
      setStepAddOpen(false);
      await fetchRoutings(itemId);
    });
  }

  async function deleteStep(id: string) {
    const res = await fetch(`/api/routing-steps/${id}`, { method: "DELETE" });
    await handleDetailResponse(res, toast, "삭제됨", () => fetchRoutings(itemId));
  }

  const stepColumns: ColumnDef<RoutingStepRow>[] = [
    { accessorKey: "seq", header: "순서", cell: (c) => <span className="num">{c.getValue<number>()}</span> },
    { accessorKey: "processName", header: "공정" },
    {
      accessorKey: "workCenterName",
      header: "작업장",
      cell: (c) => c.getValue<string | null>() ?? "-",
    },
    {
      accessorKey: "stdTimeMin",
      header: "표준시간(분)",
      cell: (c) => <span className="num">{c.getValue<number>()}</span>,
    },
    {
      id: "act",
      header: "액션",
      cell: (c) => (
        <Button variant="secondary" size="sm" onClick={() => deleteStep(c.row.original.id)}>삭제</Button>
      ),
    },
  ];

  const selectedItem = items.find((i) => i.id === itemId);

  return (
    <Card>
      <CardHeader className="justify-between">
        <CardTitle>라우팅 편집</CardTitle>
        {itemId && <Button size="sm" onClick={openRoutingAdd}>라우팅 추가</Button>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex max-w-sm flex-col gap-1.5">
          <span className="text-body-sm text-text-muted">품목</span>
          <Select value={itemId} onValueChange={onItemChange}>
            <SelectTrigger><SelectValue placeholder="품목 선택" /></SelectTrigger>
            <SelectContent>
              {items.map((it) => (
                <SelectItem key={it.id} value={it.id}>{it.code} {it.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {!itemId && <p className="text-body-sm text-text-muted">품목을 선택하세요.</p>}

        {itemId && routings.length === 0 && (
          <p className="text-body-sm text-text-muted">등록된 라우팅이 없습니다.</p>
        )}

        {routings.map((r) => (
          <div key={r.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-body font-semibold text-text">{r.name}</h3>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openStepAdd(r)}>공정 추가</Button>
                <Button variant="secondary" size="sm" onClick={() => deleteRouting(r.id)}>라우팅 삭제</Button>
              </div>
            </div>
            <DataTable columns={stepColumns} data={r.steps} emptyMessage="등록된 공정 단계가 없습니다." />
          </div>
        ))}
      </CardContent>

      {/* 라우팅 추가 */}
      <Dialog open={routingAddOpen} onOpenChange={setRoutingAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>라우팅 추가</DialogTitle>
            <DialogDescription>
              {selectedItem ? `"${selectedItem.code} · ${selectedItem.name}"의 라우팅을 등록합니다.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">이름</span>
              <Input value={routingName} onChange={(e) => setRoutingName(e.target.value)} placeholder="예: 기본 라우팅" />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitRoutingAdd} disabled={!routingName.trim()}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공정 추가 */}
      <Dialog open={stepAddOpen} onOpenChange={setStepAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공정 추가</DialogTitle>
            <DialogDescription>공정 · 작업장(선택) · 순서 · 표준시간을 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">공정</span>
              <Select value={stepProcessStageId} onValueChange={setStepProcessStageId}>
                <SelectTrigger><SelectValue placeholder="공정 선택" /></SelectTrigger>
                <SelectContent>
                  {processStages.map((ps) => (
                    <SelectItem key={ps.id} value={ps.id}>{ps.code} {ps.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">작업장</span>
              <Select value={stepWorkCenterId} onValueChange={setStepWorkCenterId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_WORK_CENTER}>미지정</SelectItem>
                  {workCenters.map((wc) => (
                    <SelectItem key={wc.id} value={wc.id}>{wc.code} {wc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">순서</span>
              <NumberStepper aria-label="순서" value={stepSeq} onValueChange={setStepSeq} min={0} max={999} step={1} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">표준시간(분)</span>
              <NumberStepper aria-label="표준시간(분)" value={stepStdTime} onValueChange={setStepStdTime} min={0} max={9999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitStepAdd} disabled={!stepProcessStageId}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
