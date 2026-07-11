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
import { NumberStepper } from "@/components/ui/number-stepper";
import { useToast } from "@/components/ui/toast";
import type { ItemRow, BomChildRow } from "@/lib/services/master-service";
import { handleDetailResponse } from "./detail-response";

interface BomTabProps {
  items: ItemRow[];
}

export function BomTab({ items }: BomTabProps) {
  const { toast } = useToast();

  const [parentId, setParentId] = React.useState("");
  const [rows, setRows] = React.useState<BomChildRow[]>([]);

  const fetchRows = React.useCallback(async (id: string) => {
    if (!id) {
      setRows([]);
      return;
    }
    const res = await fetch(`/api/bom-components?parentId=${id}`);
    setRows(res.ok ? await res.json() : []);
  }, []);

  function onParentChange(id: string) {
    setParentId(id);
    void fetchRows(id);
  }

  // ========================================================================
  // 하위 추가
  // ========================================================================
  const [addOpen, setAddOpen] = React.useState(false);
  const [addChildId, setAddChildId] = React.useState("");
  const [addQty, setAddQty] = React.useState(1);

  function openAdd() {
    setAddChildId("");
    setAddQty(1);
    setAddOpen(true);
  }

  async function submitAdd() {
    if (!parentId || !addChildId) return;
    const res = await fetch("/api/bom-components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, childId: addChildId, qtyPer: addQty }),
    });
    await handleDetailResponse(res, toast, "하위 추가됨", async () => {
      setAddOpen(false);
      await fetchRows(parentId);
    });
  }

  // ========================================================================
  // 소요량 수정
  // ========================================================================
  const [editOpen, setEditOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<BomChildRow | null>(null);
  const [editQty, setEditQty] = React.useState(1);

  function openEdit(row: BomChildRow) {
    setEditTarget(row);
    setEditQty(row.qtyPer);
    setEditOpen(true);
  }

  async function submitEdit() {
    if (!editTarget) return;
    const res = await fetch(`/api/bom-components/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qtyPer: editQty }),
    });
    await handleDetailResponse(res, toast, "수정됨", async () => {
      setEditOpen(false);
      await fetchRows(parentId);
    });
  }

  // ========================================================================
  // 삭제
  // ========================================================================
  async function submitDelete(row: BomChildRow) {
    const res = await fetch(`/api/bom-components/${row.id}`, { method: "DELETE" });
    await handleDetailResponse(res, toast, "삭제됨", () => fetchRows(parentId));
  }

  const columns: ColumnDef<BomChildRow>[] = [
    {
      accessorKey: "childCode",
      header: "하위코드",
      cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span>,
    },
    { accessorKey: "childName", header: "하위명" },
    { accessorKey: "qtyPer", header: "소요량", cell: (c) => <span className="num">{c.getValue<number>()}</span> },
    {
      id: "act",
      header: "액션",
      cell: (c) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openEdit(c.row.original)}>수정</Button>
          <Button variant="secondary" size="sm" onClick={() => submitDelete(c.row.original)}>삭제</Button>
        </div>
      ),
    },
  ];

  const selectedParent = items.find((i) => i.id === parentId);

  return (
    <Card>
      <CardHeader className="justify-between">
        <CardTitle>BOM 편집</CardTitle>
        {parentId && <Button size="sm" onClick={openAdd}>하위 추가</Button>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex max-w-sm flex-col gap-1.5">
          <span className="text-body-sm text-text-muted">상위품목</span>
          <Select value={parentId} onValueChange={onParentChange}>
            <SelectTrigger><SelectValue placeholder="상위품목 선택" /></SelectTrigger>
            <SelectContent>
              {items.map((it) => (
                <SelectItem key={it.id} value={it.id}>{it.code} {it.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {parentId ? (
          <DataTable columns={columns} data={rows} emptyMessage="등록된 하위 품목이 없습니다." />
        ) : (
          <p className="text-body-sm text-text-muted">상위품목을 선택하세요.</p>
        )}
      </CardContent>

      {/* 하위 추가 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>하위 품목 추가</DialogTitle>
            <DialogDescription>
              {selectedParent ? `"${selectedParent.code} · ${selectedParent.name}"의 하위 품목을 등록합니다.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">하위품목</span>
              <Select value={addChildId} onValueChange={setAddChildId}>
                <SelectTrigger><SelectValue placeholder="하위품목 선택" /></SelectTrigger>
                <SelectContent>
                  {items.filter((it) => it.id !== parentId).map((it) => (
                    <SelectItem key={it.id} value={it.id}>{it.code} {it.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">소요량</span>
              <NumberStepper aria-label="소요량" value={addQty} onValueChange={setAddQty} min={1} max={999999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitAdd} disabled={!addChildId}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 소요량 수정 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>소요량 수정</DialogTitle>
            <DialogDescription>
              {editTarget ? `"${editTarget.childCode} · ${editTarget.childName}"의 소요량을 수정합니다.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">소요량</span>
              <NumberStepper aria-label="소요량" value={editQty} onValueChange={setEditQty} min={1} max={999999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
