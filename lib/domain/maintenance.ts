export interface RepairSpan {
  startedAt: number | null;
  finishedAt: number | null;
}

/** 평균 수리시간(완료된 수리의 finished-started 평균). 완료 없으면 0 */
export function mttr(orders: RepairSpan[]): number {
  const spans = orders
    .filter((o) => o.startedAt !== null && o.finishedAt !== null)
    .map((o) => (o.finishedAt as number) - (o.startedAt as number));
  if (spans.length === 0) return 0;
  return Math.round(spans.reduce((a, b) => a + b, 0) / spans.length);
}

/** 평균 고장간격 = 기간/고장횟수. 고장 0이면 기간 전체 */
export function mtbf(failures: number, periodMin: number): number {
  if (failures <= 0) return periodMin;
  return Math.round(periodMin / failures);
}
