"use client";

import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { LotRef, LotTree } from "@/lib/services/lot-service";

function lotTone(status: string): Tone {
  if (status === "PASSED") return "ok";
  if (status === "FAILED") return "crit";
  if (status === "IN_PROGRESS") return "primary";
  return "neutral";
}

function LotRow({ lot }: { lot: LotRef }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-border px-4 py-2.5 first:border-t-0">
      <span className="font-mono text-caption text-text-muted">{lot.code}</span>
      <span className="min-w-0 truncate text-body-sm text-text">{lot.itemName}</span>
      <StatusPill tone={lotTone(lot.status)} className="ml-auto">{lot.status}</StatusPill>
    </div>
  );
}

export function GenealogyClient({ lots }: { lots: LotRef[] }) {
  const [selCode, setSelCode] = React.useState<string | undefined>(lots[0]?.code);
  const [tree, setTree] = React.useState<LotTree | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!selCode) {
      setTree(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/lots/${selCode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LotTree | null) => {
        if (!cancelled) setTree(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selCode]);

  return (
    <>
      <SectionHeader title="Lot 추적" description={`정·역 계보 · 총 ${lots.length}개 Lot`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Lot 목록</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1 p-2">
            {lots.length === 0 ? (
              <EmptyState title="Lot이 없습니다" description="등록된 Lot이 없습니다." />
            ) : (
              lots.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelCode(l.code)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    selCode === l.code ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-elevated",
                  )}
                >
                  <span className="font-mono text-caption text-text-muted">{l.code}</span>
                  <span className="min-w-0 truncate text-body-sm text-text">{l.itemName}</span>
                  <StatusPill tone={lotTone(l.status)} className="ml-auto">{l.status}</StatusPill>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>LOT 상세</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-body-sm text-text-muted">불러오는 중…</p>
              ) : tree ? (
                <div className="flex items-center gap-2">
                  <StatusPill tone={lotTone(tree.status)}>{tree.status}</StatusPill>
                  <span className="font-mono text-caption text-text-muted">{tree.code}</span>
                  <span className="text-body-sm font-medium text-text">{tree.itemName}</span>
                </div>
              ) : (
                <EmptyState title="Lot을 선택하세요" description="목록에서 Lot을 클릭하면 상세가 표시됩니다." />
              )}
            </CardContent>
          </Card>

          {tree && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>조상</CardTitle><span className="ml-auto text-caption text-text-faint">{tree.ancestors.length}건</span></CardHeader>
                <CardContent className="p-0">
                  {tree.ancestors.length === 0 ? (
                    <p className="px-4 py-3 text-caption text-text-faint">조상 Lot이 없습니다.</p>
                  ) : (
                    tree.ancestors.map((a) => <LotRow key={a.id} lot={a} />)
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>후손</CardTitle><span className="ml-auto text-caption text-text-faint">{tree.descendants.length}건</span></CardHeader>
                <CardContent className="p-0">
                  {tree.descendants.length === 0 ? (
                    <p className="px-4 py-3 text-caption text-text-faint">후손 Lot이 없습니다.</p>
                  ) : (
                    tree.descendants.map((d) => <LotRow key={d.id} lot={d} />)
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
