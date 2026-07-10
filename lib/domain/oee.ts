export interface OeeInput {
  plannedMin: number;
  downtimeMin: number;
  idealCycleMin: number;
  totalCount: number;
  goodCount: number;
}
export interface OeeResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

/** OEE = 가용성 × 성능 × 품질 (각 0~1). 분모 0은 0 처리 */
export function oee({ plannedMin, downtimeMin, idealCycleMin, totalCount, goodCount }: OeeInput): OeeResult {
  const runMin = plannedMin - downtimeMin;
  const availability = plannedMin > 0 ? runMin / plannedMin : 0;
  const performance = runMin > 0 ? (totalCount * idealCycleMin) / runMin : 0;
  const quality = totalCount > 0 ? goodCount / totalCount : 0;
  return { availability, performance, quality, oee: availability * performance * quality };
}
