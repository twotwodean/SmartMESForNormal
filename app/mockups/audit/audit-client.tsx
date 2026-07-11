"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AuditRow } from "@/lib/services/audit-service";
import type { Paginated } from "@/lib/api/pagination";

export function AuditClient({ result, q }: { result: Paginated<AuditRow>; q: string }) {
  const router = useRouter();
  const [search, setSearch] = React.useState(q);

  const columns: ColumnDef<AuditRow>[] = [
    { accessorKey: "createdAt", header: "일시", cell: (c) => <span className="font-mono text-caption">{c.getValue<string>().slice(0, 19).replace("T", " ")}</span> },
    { accessorKey: "userName", header: "사용자", cell: (c) => c.getValue<string | null>() ?? "-" },
    { accessorKey: "action", header: "액션" },
    { accessorKey: "entity", header: "엔티티" },
    { accessorKey: "entityId", header: "대상", cell: (c) => c.getValue<string | null>() ?? "-" },
  ];

  const goto = (page: number, nextQ: string) => {
    const sp = new URLSearchParams();
    if (nextQ) sp.set("q", nextQ);
    sp.set("page", String(page));
    router.push(`/mockups/audit?${sp.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goto(1, search.trim());
  };

  return (
    <>
      <SectionHeader title="감사 로그" description="주요 변경 이력(생성·수정) 추적" />
      <Card>
        <CardContent>
          <div className="flex flex-col gap-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="액션·엔티티·사용자 검색"
                className="max-w-xs"
              />
              <Button type="submit" variant="secondary" size="sm">검색</Button>
            </form>
            <DataTable columns={columns} data={result.rows} enablePagination={false} />
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-muted num">
                {result.page} / {result.pageCount} 페이지 · 총 {result.total}건
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goto(result.page - 1, q)}
                  disabled={result.page <= 1}
                >
                  이전
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goto(result.page + 1, q)}
                  disabled={result.page >= result.pageCount}
                >
                  다음
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
