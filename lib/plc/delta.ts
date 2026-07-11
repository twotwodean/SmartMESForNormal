/**
 * PLC-4: 누적 카운터(good_count/defect_count)의 증가분(delta) 계산(순수 함수).
 *
 * PLC의 카운터는 항상 증가만 하는 누적값이지만, 설비 재기동/PLC 리셋 등으로
 * 값이 이전 읽기보다 작아질 수 있다(카운터 리셋/롤오버). 이 경우 음수 델타를
 * 만들지 않고, 리셋 이후 새로 쌓인 값(curr) 전체를 델타로 취급한다.
 */
export function counterDelta(prev: number, curr: number): number {
  if (curr < prev) return curr;
  return curr - prev;
}
