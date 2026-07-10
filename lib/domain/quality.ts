/** 불량 PPM = 불량수/총수 × 1,000,000 (총수 0이면 0, 반올림) */
export function ppm(defectQty: number, totalQty: number): number {
  if (totalQty <= 0) return 0;
  return Math.round((defectQty / totalQty) * 1_000_000);
}
