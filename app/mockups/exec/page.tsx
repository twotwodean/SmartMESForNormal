import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { KPIS, LINES, ALARMS } from "@/lib/mock-data";

export default function ExecDashboard() {
  return (
    <>
      <SectionHeader title="경영 현황" description="전사 요약 · 오늘 · 2공장 통합" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => (
          <KPITile
            key={k.key}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            direction={k.direction}
            upIsGood={k.upIsGood}
            tone={k.tone}
            spark={k.spark}
            note={k.note}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>라인별 설비종합효율</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap justify-around gap-4">
            {LINES.map((l) => (
              <GaugeTile key={l.name} label={l.name} value={l.oee} tone={l.tone} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>주요 알람 요약</CardTitle><span className="ml-auto text-caption text-text-faint">활성 {ALARMS.length}</span></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ALARMS.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <StatusPill tone={a.tone}>{a.tone === "crit" ? "이상" : a.tone === "warn" ? "주의" : "정보"}</StatusPill>
                <span className="text-body-sm text-text">{a.title}</span>
                <span className="ml-auto text-caption text-text-faint">{a.ago}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
