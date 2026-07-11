"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";

import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { ItemType } from "@/lib/domain/types";
import type { ItemRow, WorkCenterRow, ProcessStageRow } from "@/lib/services/master-service";
import { BomTab } from "./bom-tab";
import { RoutingTab } from "./routing-tab";

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  FINISHED: "완제품",
  SEMI: "반제품",
  RAW: "원자재",
  SUB: "부자재",
};
const ITEM_TYPES: ItemType[] = ["FINISHED", "SEMI", "RAW", "SUB"];

interface MasterInnerProps {
  items: ItemRow[];
  workCenters: WorkCenterRow[];
  processStages: ProcessStageRow[];
}

function MasterInner({ items, workCenters, processStages }: MasterInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  /** POST/PATCH/DELETE 공통 응답 처리 — ok:토스트+onOk 콜백+refresh, 403:권한 안내, 그 외:서버 메시지 crit 토스트 */
  const handleResponse = React.useCallback(
    async (res: Response, okTitle: string, onOk?: () => void) => {
      if (res.ok) {
        toast({ title: okTitle, tone: "ok" });
        onOk?.();
        router.refresh();
        return;
      }
      if (res.status === 403) {
        toast({ title: "권한 없음", description: "관리자 전용입니다.", tone: "crit" });
        return;
      }
      const d: { error?: string } = await res.json().catch(() => ({}));
      toast({ title: "처리 실패", description: d.error ?? "알 수 없는 오류입니다.", tone: "crit" });
    },
    [toast, router],
  );

  // ========================================================================
  // 품목
  // ========================================================================
  const [itemCreateOpen, setItemCreateOpen] = React.useState(false);
  const [itemCode, setItemCode] = React.useState("");
  const [itemName, setItemName] = React.useState("");
  const [itemType, setItemType] = React.useState<ItemType>("RAW");
  const [itemUom, setItemUom] = React.useState("EA");
  const [itemSafetyStock, setItemSafetyStock] = React.useState(0);

  function resetItemCreateForm() {
    setItemCode("");
    setItemName("");
    setItemType("RAW");
    setItemUom("EA");
    setItemSafetyStock(0);
  }

  async function submitItemCreate() {
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: itemCode, name: itemName, type: itemType, uom: itemUom, safetyStock: itemSafetyStock }),
    });
    await handleResponse(res, "등록됨", () => {
      setItemCreateOpen(false);
      resetItemCreateForm();
    });
  }

  const [itemEditOpen, setItemEditOpen] = React.useState(false);
  const [itemEditTarget, setItemEditTarget] = React.useState<ItemRow | null>(null);
  const [itemEditName, setItemEditName] = React.useState("");
  const [itemEditType, setItemEditType] = React.useState<ItemType>("RAW");
  const [itemEditUom, setItemEditUom] = React.useState("");
  const [itemEditSafetyStock, setItemEditSafetyStock] = React.useState(0);

  function openItemEdit(row: ItemRow) {
    setItemEditTarget(row);
    setItemEditName(row.name);
    setItemEditType(row.type);
    setItemEditUom(row.uom);
    setItemEditSafetyStock(row.safetyStock);
    setItemEditOpen(true);
  }

  async function submitItemEdit() {
    if (!itemEditTarget) return;
    const res = await fetch(`/api/items/${itemEditTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: itemEditName, type: itemEditType, uom: itemEditUom, safetyStock: itemEditSafetyStock }),
    });
    await handleResponse(res, "수정됨", () => setItemEditOpen(false));
  }

  const [itemDeleteOpen, setItemDeleteOpen] = React.useState(false);
  const [itemDeleteTarget, setItemDeleteTarget] = React.useState<ItemRow | null>(null);

  function openItemDelete(row: ItemRow) {
    setItemDeleteTarget(row);
    setItemDeleteOpen(true);
  }

  async function submitItemDelete() {
    if (!itemDeleteTarget) return;
    const res = await fetch(`/api/items/${itemDeleteTarget.id}`, { method: "DELETE" });
    await handleResponse(res, "삭제됨", () => setItemDeleteOpen(false));
  }

  const itemColumns: ColumnDef<ItemRow>[] = [
    { accessorKey: "code", header: "코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "품목명" },
    { accessorKey: "type", header: "유형", cell: (c) => ITEM_TYPE_LABEL[c.getValue<ItemType>()] },
    { accessorKey: "uom", header: "단위" },
    {
      accessorKey: "safetyStock",
      header: "안전재고",
      cell: (c) => <span className="num">{c.getValue<number>().toLocaleString()}</span>,
    },
    {
      id: "act",
      header: "액션",
      cell: (c) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openItemEdit(c.row.original)}>수정</Button>
          <Button variant="secondary" size="sm" onClick={() => openItemDelete(c.row.original)}>삭제</Button>
        </div>
      ),
    },
  ];

  // ========================================================================
  // 작업장
  // ========================================================================
  const [wcCreateOpen, setWcCreateOpen] = React.useState(false);
  const [wcCode, setWcCode] = React.useState("");
  const [wcName, setWcName] = React.useState("");

  function resetWcCreateForm() {
    setWcCode("");
    setWcName("");
  }

  async function submitWcCreate() {
    const res = await fetch("/api/work-centers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: wcCode, name: wcName }),
    });
    await handleResponse(res, "등록됨", () => {
      setWcCreateOpen(false);
      resetWcCreateForm();
    });
  }

  const [wcEditOpen, setWcEditOpen] = React.useState(false);
  const [wcEditTarget, setWcEditTarget] = React.useState<WorkCenterRow | null>(null);
  const [wcEditName, setWcEditName] = React.useState("");

  function openWcEdit(row: WorkCenterRow) {
    setWcEditTarget(row);
    setWcEditName(row.name);
    setWcEditOpen(true);
  }

  async function submitWcEdit() {
    if (!wcEditTarget) return;
    const res = await fetch(`/api/work-centers/${wcEditTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wcEditName }),
    });
    await handleResponse(res, "수정됨", () => setWcEditOpen(false));
  }

  const [wcDeleteOpen, setWcDeleteOpen] = React.useState(false);
  const [wcDeleteTarget, setWcDeleteTarget] = React.useState<WorkCenterRow | null>(null);

  function openWcDelete(row: WorkCenterRow) {
    setWcDeleteTarget(row);
    setWcDeleteOpen(true);
  }

  async function submitWcDelete() {
    if (!wcDeleteTarget) return;
    const res = await fetch(`/api/work-centers/${wcDeleteTarget.id}`, { method: "DELETE" });
    await handleResponse(res, "삭제됨", () => setWcDeleteOpen(false));
  }

  const wcColumns: ColumnDef<WorkCenterRow>[] = [
    { accessorKey: "code", header: "코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "명" },
    {
      id: "act",
      header: "액션",
      cell: (c) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openWcEdit(c.row.original)}>수정</Button>
          <Button variant="secondary" size="sm" onClick={() => openWcDelete(c.row.original)}>삭제</Button>
        </div>
      ),
    },
  ];

  // ========================================================================
  // 공정
  // ========================================================================
  const [psCreateOpen, setPsCreateOpen] = React.useState(false);
  const [psCode, setPsCode] = React.useState("");
  const [psName, setPsName] = React.useState("");
  const [psSeq, setPsSeq] = React.useState(0);

  function resetPsCreateForm() {
    setPsCode("");
    setPsName("");
    setPsSeq(0);
  }

  async function submitPsCreate() {
    const res = await fetch("/api/process-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: psCode, name: psName, seq: psSeq }),
    });
    await handleResponse(res, "등록됨", () => {
      setPsCreateOpen(false);
      resetPsCreateForm();
    });
  }

  const [psEditOpen, setPsEditOpen] = React.useState(false);
  const [psEditTarget, setPsEditTarget] = React.useState<ProcessStageRow | null>(null);
  const [psEditName, setPsEditName] = React.useState("");
  const [psEditSeq, setPsEditSeq] = React.useState(0);

  function openPsEdit(row: ProcessStageRow) {
    setPsEditTarget(row);
    setPsEditName(row.name);
    setPsEditSeq(row.seq);
    setPsEditOpen(true);
  }

  async function submitPsEdit() {
    if (!psEditTarget) return;
    const res = await fetch(`/api/process-stages/${psEditTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: psEditName, seq: psEditSeq }),
    });
    await handleResponse(res, "수정됨", () => setPsEditOpen(false));
  }

  const [psDeleteOpen, setPsDeleteOpen] = React.useState(false);
  const [psDeleteTarget, setPsDeleteTarget] = React.useState<ProcessStageRow | null>(null);

  function openPsDelete(row: ProcessStageRow) {
    setPsDeleteTarget(row);
    setPsDeleteOpen(true);
  }

  async function submitPsDelete() {
    if (!psDeleteTarget) return;
    const res = await fetch(`/api/process-stages/${psDeleteTarget.id}`, { method: "DELETE" });
    await handleResponse(res, "삭제됨", () => setPsDeleteOpen(false));
  }

  const psColumns: ColumnDef<ProcessStageRow>[] = [
    { accessorKey: "code", header: "코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "명" },
    { accessorKey: "seq", header: "순서", cell: (c) => <span className="num">{c.getValue<number>()}</span> },
    {
      id: "act",
      header: "액션",
      cell: (c) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => openPsEdit(c.row.original)}>수정</Button>
          <Button variant="secondary" size="sm" onClick={() => openPsDelete(c.row.original)}>삭제</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SectionHeader title="기준정보 · 관리" description="품목 · 작업장 · 공정 등록/수정/삭제" />

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">품목</TabsTrigger>
          <TabsTrigger value="workCenters">작업장</TabsTrigger>
          <TabsTrigger value="processStages">공정</TabsTrigger>
          <TabsTrigger value="bom">BOM</TabsTrigger>
          <TabsTrigger value="routing">라우팅</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardHeader className="justify-between">
              <CardTitle>품목 목록</CardTitle>
              <Button size="sm" onClick={() => setItemCreateOpen(true)}>품목 등록</Button>
            </CardHeader>
            <CardContent>
              <DataTable columns={itemColumns} data={items} enableFilter filterPlaceholder="코드·품목명 검색" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workCenters">
          <Card>
            <CardHeader className="justify-between">
              <CardTitle>작업장 목록</CardTitle>
              <Button size="sm" onClick={() => setWcCreateOpen(true)}>작업장 등록</Button>
            </CardHeader>
            <CardContent>
              <DataTable columns={wcColumns} data={workCenters} enableFilter filterPlaceholder="코드·명 검색" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processStages">
          <Card>
            <CardHeader className="justify-between">
              <CardTitle>공정 목록</CardTitle>
              <Button size="sm" onClick={() => setPsCreateOpen(true)}>공정 등록</Button>
            </CardHeader>
            <CardContent>
              <DataTable columns={psColumns} data={processStages} enableFilter filterPlaceholder="코드·명 검색" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bom">
          <BomTab items={items} />
        </TabsContent>

        <TabsContent value="routing">
          <RoutingTab items={items} workCenters={workCenters} processStages={processStages} />
        </TabsContent>
      </Tabs>

      {/* 품목 등록 */}
      <Dialog open={itemCreateOpen} onOpenChange={setItemCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>품목 등록</DialogTitle>
            <DialogDescription>코드·품목명·유형·단위·안전재고를 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">코드</span>
              <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="예: RM-STEEL01" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">품목명</span>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">유형</span>
              <Select value={itemType} onValueChange={(v) => setItemType(v as ItemType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{ITEM_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">단위</span>
              <Input value={itemUom} onChange={(e) => setItemUom(e.target.value)} placeholder="예: EA, kg" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">안전재고</span>
              <NumberStepper aria-label="안전재고" value={itemSafetyStock} onValueChange={setItemSafetyStock} min={0} max={999999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitItemCreate}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 품목 수정 */}
      <Dialog open={itemEditOpen} onOpenChange={setItemEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>품목 수정</DialogTitle>
            <DialogDescription>코드는 변경할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">코드</span>
              <Input value={itemEditTarget?.code ?? ""} disabled />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">품목명</span>
              <Input value={itemEditName} onChange={(e) => setItemEditName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">유형</span>
              <Select value={itemEditType} onValueChange={(v) => setItemEditType(v as ItemType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{ITEM_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">단위</span>
              <Input value={itemEditUom} onChange={(e) => setItemEditUom(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">안전재고</span>
              <NumberStepper aria-label="안전재고" value={itemEditSafetyStock} onValueChange={setItemEditSafetyStock} min={0} max={999999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitItemEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 품목 삭제 확인 */}
      <Dialog open={itemDeleteOpen} onOpenChange={setItemDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>품목 삭제</DialogTitle>
            <DialogDescription>
              {itemDeleteTarget ? `"${itemDeleteTarget.code} · ${itemDeleteTarget.name}"을(를) ` : ""}삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button variant="danger" onClick={submitItemDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작업장 등록 */}
      <Dialog open={wcCreateOpen} onOpenChange={setWcCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작업장 등록</DialogTitle>
            <DialogDescription>코드·명을 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">코드</span>
              <Input value={wcCode} onChange={(e) => setWcCode(e.target.value)} placeholder="예: WC-CNC01" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">명</span>
              <Input value={wcName} onChange={(e) => setWcName(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitWcCreate}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작업장 수정 */}
      <Dialog open={wcEditOpen} onOpenChange={setWcEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작업장 수정</DialogTitle>
            <DialogDescription>코드는 변경할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">코드</span>
              <Input value={wcEditTarget?.code ?? ""} disabled />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">명</span>
              <Input value={wcEditName} onChange={(e) => setWcEditName(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitWcEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작업장 삭제 확인 */}
      <Dialog open={wcDeleteOpen} onOpenChange={setWcDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작업장 삭제</DialogTitle>
            <DialogDescription>
              {wcDeleteTarget ? `"${wcDeleteTarget.code} · ${wcDeleteTarget.name}"을(를) ` : ""}삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button variant="danger" onClick={submitWcDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공정 등록 */}
      <Dialog open={psCreateOpen} onOpenChange={setPsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공정 등록</DialogTitle>
            <DialogDescription>코드·명·순서를 입력합니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">코드</span>
              <Input value={psCode} onChange={(e) => setPsCode(e.target.value)} placeholder="예: PS-CUTTING" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">명</span>
              <Input value={psName} onChange={(e) => setPsName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">순서</span>
              <NumberStepper aria-label="순서" value={psSeq} onValueChange={setPsSeq} min={0} max={999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitPsCreate}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공정 수정 */}
      <Dialog open={psEditOpen} onOpenChange={setPsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공정 수정</DialogTitle>
            <DialogDescription>코드는 변경할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">코드</span>
              <Input value={psEditTarget?.code ?? ""} disabled />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">명</span>
              <Input value={psEditName} onChange={(e) => setPsEditName(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-text-muted">순서</span>
              <NumberStepper aria-label="순서" value={psEditSeq} onValueChange={setPsEditSeq} min={0} max={999} step={1} />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button onClick={submitPsEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공정 삭제 확인 */}
      <Dialog open={psDeleteOpen} onOpenChange={setPsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>공정 삭제</DialogTitle>
            <DialogDescription>
              {psDeleteTarget ? `"${psDeleteTarget.code} · ${psDeleteTarget.name}"을(를) ` : ""}삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="secondary">취소</Button></DialogClose>
            <Button variant="danger" onClick={submitPsDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MasterClient(props: MasterInnerProps) {
  return (
    <ToastProvider>
      <MasterInner {...props} />
    </ToastProvider>
  );
}
