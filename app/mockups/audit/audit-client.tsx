"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import type { AuditRow } from "@/lib/services/audit-service";

export function AuditClient({ logs }: { logs: AuditRow[] }) {
  const columns: ColumnDef<AuditRow>[] = [
    { accessorKey: "createdAt", header: "일시", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>().slice(0, 19).replace("T", " ")}</span> },
    { accessorKey: "userName", header: "사용자", cell: (c) => c.getValue<string | null>() ?? "-" },
    { accessorKey: "action", header: "액션" },
    { accessorKey: "entity", header: "엔티티" },
    { accessorKey: "entityId", header: "대상", cell: (c) => c.getValue<string | null>() ?? "-" },
  ];
  return (
    <>
      <SectionHeader title="감사 로그" description="주요 변경 이력(생성·수정) 추적" />
      <Card><CardContent><DataTable columns={columns} data={logs} enableFilter filterPlaceholder="액션·엔티티 검색" /></CardContent></Card>
    </>
  );
}
