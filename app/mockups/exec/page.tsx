import * as React from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { KPITile } from "@/components/ui/kpi-tile";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GaugeTile } from "@/components/ui/gauge-tile";
import { StatusPill, type Tone } from "@/components/ui/status-pill";
import { KPIS, LINES } from "@/lib/mock-data";
import { getDashboard } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function ExecDashboard() {
  const dashboard = await getDashboard();
  const stockWarnCount = dashboard.stockWarnings.length;
  const overallPpm = dashboard.quality.overallPpm;
  const ppmTone: Tone = overallPpm >= 10000 ? "crit" : overallPpm >= 3000 ? "warn" : "ok";

  return (
    <>
      <SectionHeader title="경영 현황" description="전사 요약 · 오늘 · 2공장 통합" />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k) => {
          if (k.key === "stock") {
            return <KPITile key={k.key} label={k.label} value={String(stockWarnCount)} unit={k.unit} tone={k.tone} note={k.note} />;
          }
          if (k.key === "ppm") {
            // 불량 PPM: 실데이터(quality-service) 연동
            return <KPITile key={k.key} label={k.label} value={overallPpm.toLocaleString()} tone={ppmTone} />;
          }
          // R3: 계획대비실적·OEE·가동설비 실데이터 연동 예정
          return (
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
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* R3: 라인별 OEE 실데이터 예정 */}
        <Card>
          <CardHeader><CardTitle>라인별 설비종합효율</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap justify-around gap-4">
            {LINES.map((l) => (
              <GaugeTile key={l.name} label={l.name} value={l.oee} tone={l.tone} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>주요 알람 요약</CardTitle><span className="ml-auto text-caption text-text-faint">활성 {dashboard.alarms.length}</span></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {dashboard.alarms.length === 0 && (
              <div className="text-center text-caption text-text-faint">활성 알람 없음</div>
            )}
            {dashboard.alarms.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <StatusPill tone={a.tone}>{a.tone === "crit" ? "이상" : a.tone === "warn" ? "주의" : "정보"}</StatusPill>
                <span className="text-body-sm text-text">{a.title}</span>
                <span className="ml-auto text-caption text-text-faint">{a.createdAt.slice(0, 16).replace("T", " ")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
