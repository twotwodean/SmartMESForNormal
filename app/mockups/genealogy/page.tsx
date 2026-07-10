"use client";

import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GenealogyTree, countNodes, type GenealogyNode } from "@/components/ui/genealogy-tree";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";

const LOT_TREE: GenealogyNode = {
  id: "P1", label: "완제품 LOT-2600714", sub: "기어박스 GB-2500", tone: "ok",
  children: [
    { id: "S1", label: "반제품 LOT-2600712", sub: "샤프트 SUS-304", tone: "primary",
      children: [{ id: "R1", label: "원자재 LOT-2600701", sub: "환봉 Ø50", tone: "neutral" }] },
    { id: "S2", label: "반제품 LOT-2600713", sub: "하우징 M3", tone: "warn",
      children: [{ id: "R2", label: "원자재 LOT-2600705", sub: "알루미늄 6061", tone: "neutral" }] },
  ],
};

interface LotDetail {
  process: string;
  inspection: string;
  qty: string;
  date: string;
}
const DETAILS: Record<string, LotDetail> = {
  P1: { process: "포장 완료", inspection: "합격", qty: "120 EA", date: "2026-07-14" },
  S1: { process: "가공 완료", inspection: "합격", qty: "450 EA", date: "2026-07-12" },
  S2: { process: "성형 완료", inspection: "특채", qty: "800 EA", date: "2026-07-13" },
  R1: { process: "입고", inspection: "합격", qty: "1,200 kg", date: "2026-07-01" },
  R2: { process: "입고", inspection: "합격", qty: "300 kg", date: "2026-07-05" },
};

function findNode(node: GenealogyNode, id: string): GenealogyNode | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

export default function GenealogyPage() {
  const [sel, setSel] = React.useState<string>("S1");
  const node = findNode(LOT_TREE, sel);
  const detail = DETAILS[sel];

  return (
    <>
      <SectionHeader title="Lot 추적" description={`정·역 계보 · 총 ${countNodes(LOT_TREE)}개 Lot`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>계보 트리</CardTitle></CardHeader>
          <CardContent>
            <GenealogyTree root={LOT_TREE} selectedId={sel} onSelect={setSel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>LOT 상세</CardTitle></CardHeader>
          <CardContent>
            {node && detail ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <StatusPill tone={node.tone ?? "neutral"}>{detail.inspection}</StatusPill>
                  <span className="text-body-sm font-medium text-text">{node.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-body-sm">
                  <dt className="text-text-muted">품목</dt><dd className="text-text">{node.sub}</dd>
                  <dt className="text-text-muted">공정</dt><dd className="text-text">{detail.process}</dd>
                  <dt className="text-text-muted">수량</dt><dd className="num text-text">{detail.qty}</dd>
                  <dt className="text-text-muted">일자</dt><dd className="num text-text">{detail.date}</dd>
                </dl>
              </div>
            ) : (
              <EmptyState title="Lot을 선택하세요" description="트리에서 Lot 노드를 클릭하면 상세가 표시됩니다." />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
