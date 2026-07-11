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
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { toCsv } from "@/lib/domain/csv";
import { downloadCsv } from "@/components/app/download-csv";
import type { ProductModelRow, DocumentRow } from "@/lib/services/catalog-service";

const NO_ITEM = "__NONE__";

interface ItemBrief {
  id: string;
  code: string;
  name: string;
}

interface CatalogInnerProps {
  models: ProductModelRow[];
  documents: DocumentRow[];
  items: ItemBrief[];
}

function CatalogInner({ models, documents, items }: CatalogInnerProps) {
  const { toast } = useToast();
  const router = useRouter();

  // 모델 등록 다이얼로그
  const [modelOpen, setModelOpen] = React.useState(false);
  const [modelItemId, setModelItemId] = React.useState<string>(items[0]?.id ?? "");
  const [modelCode, setModelCode] = React.useState("");
  const [modelName, setModelName] = React.useState("");
  const [modelSpec, setModelSpec] = React.useState("");

  function resetModelForm() {
    setModelItemId(items[0]?.id ?? "");
    setModelCode("");
    setModelName("");
    setModelSpec("");
  }

  async function submitModel() {
    const res = await fetch("/api/product-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: modelItemId, code: modelCode, name: modelName, spec: modelSpec || undefined }),
    });
    if (res.ok) {
      toast({ title: "모델 등록됨", tone: "ok" });
      setModelOpen(false);
      resetModelForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "모델 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  // 도면 등록 다이얼로그
  const [docOpen, setDocOpen] = React.useState(false);
  const [docName, setDocName] = React.useState("");
  const [docRev, setDocRev] = React.useState("A");
  const [docItemId, setDocItemId] = React.useState<string>(NO_ITEM);
  const [docNote, setDocNote] = React.useState("");

  function resetDocForm() {
    setDocName("");
    setDocRev("A");
    setDocItemId(NO_ITEM);
    setDocNote("");
  }

  async function submitDocument() {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: docName,
        rev: docRev || undefined,
        note: docNote || undefined,
        itemId: docItemId === NO_ITEM ? undefined : docItemId,
      }),
    });
    if (res.ok) {
      toast({ title: "도면 등록됨", tone: "ok" });
      setDocOpen(false);
      resetDocForm();
      router.refresh();
    } else if (res.status === 403) {
      toast({ title: "권한 없음", description: "도면 등록은 작업자 이상만 가능합니다.", tone: "crit" });
    } else {
      const d = await res.json().catch(() => ({}));
      toast({ title: "등록 실패", description: d.error ?? "", tone: "crit" });
    }
  }

  function exportModelsCsv() {
    downloadCsv("catalog-models.csv", toCsv(
      models.map((m) => ({ ...m, spec: m.spec ?? "-" })),
      [
        { key: "code", label: "코드" },
        { key: "name", label: "모델명" },
        { key: "itemName", label: "품목" },
        { key: "spec", label: "사양" },
      ],
    ));
  }

  function exportDocumentsCsv() {
    downloadCsv("catalog-documents.csv", toCsv(
      documents.map((d) => ({
        ...d,
        itemName: d.itemName ?? "-",
        note: d.note ?? "-",
        createdAt: d.createdAt.slice(0, 10),
      })),
      [
        { key: "name", label: "문서명" },
        { key: "rev", label: "리비전" },
        { key: "itemName", label: "품목" },
        { key: "note", label: "비고" },
        { key: "createdAt", label: "등록일" },
      ],
    ));
  }

  const modelColumns: ColumnDef<ProductModelRow>[] = [
    { accessorKey: "code", header: "코드", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>()}</span> },
    { accessorKey: "name", header: "모델명" },
    { accessorKey: "itemName", header: "품목" },
    { accessorKey: "spec", header: "사양", cell: (c) => c.getValue<string | null>() ?? "-" },
  ];

  const documentColumns: ColumnDef<DocumentRow>[] = [
    { accessorKey: "name", header: "문서명" },
    { accessorKey: "rev", header: "리비전" },
    { accessorKey: "itemName", header: "품목", cell: (c) => c.getValue<string | null>() ?? "-" },
    { accessorKey: "note", header: "비고", cell: (c) => c.getValue<string | null>() ?? "-" },
    { accessorKey: "createdAt", header: "등록일", cell: (c) => <span className="num">{c.getValue<string>().slice(0, 10)}</span> },
  ];

  return (
    <>
      <SectionHeader title="기준정보 · 모델/도면" description="제품 모델 · 도면/문서 리비전" />

      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">모델</TabsTrigger>
          <TabsTrigger value="documents">도면</TabsTrigger>
        </TabsList>
        <TabsContent value="models">
          <Card>
            <CardHeader className="justify-between">
              <CardTitle>모델 목록</CardTitle>
              <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportModelsCsv}>CSV</Button>
              <Dialog open={modelOpen} onOpenChange={setModelOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setModelOpen(true)}>모델 등록</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>모델 등록</DialogTitle>
                    <DialogDescription>품목·코드·모델명·사양을 입력합니다.</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">품목</span>
                      <Select value={modelItemId} onValueChange={setModelItemId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {items.map((it) => (
                            <SelectItem key={it.id} value={it.id}>{it.code} {it.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">코드</span>
                      <Input value={modelCode} onChange={(e) => setModelCode(e.target.value)} placeholder="예: PM-GB2500-A" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">모델명</span>
                      <Input value={modelName} onChange={(e) => setModelName(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">사양</span>
                      <Input value={modelSpec} onChange={(e) => setModelSpec(e.target.value)} placeholder="선택 입력" />
                    </label>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">취소</Button>
                    </DialogClose>
                    <Button onClick={submitModel}>등록</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={modelColumns} data={models} enableFilter filterPlaceholder="코드·모델명·품목 검색" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card>
            <CardHeader className="justify-between">
              <CardTitle>도면 목록</CardTitle>
              <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={exportDocumentsCsv}>CSV</Button>
              <Dialog open={docOpen} onOpenChange={setDocOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setDocOpen(true)}>도면 등록</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>도면 등록</DialogTitle>
                    <DialogDescription>문서명·리비전·품목(선택)·비고를 입력합니다.</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">문서명</span>
                      <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">리비전</span>
                      <Input value={docRev} onChange={(e) => setDocRev(e.target.value)} placeholder="A" />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">품목</span>
                      <Select value={docItemId} onValueChange={setDocItemId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_ITEM}>미지정</SelectItem>
                          {items.map((it) => (
                            <SelectItem key={it.id} value={it.id}>{it.code} {it.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-body-sm text-text-muted">비고</span>
                      <Input value={docNote} onChange={(e) => setDocNote(e.target.value)} placeholder="선택 입력" />
                    </label>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="secondary">취소</Button>
                    </DialogClose>
                    <Button onClick={submitDocument}>등록</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={documentColumns} data={documents} enableFilter filterPlaceholder="문서명·리비전·품목 검색" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

export function CatalogClient({ models, documents, items }: CatalogInnerProps) {
  return (
    <ToastProvider>
      <CatalogInner models={models} documents={documents} items={items} />
    </ToastProvider>
  );
}
