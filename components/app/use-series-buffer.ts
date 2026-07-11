"use client";

import * as React from "react";

const DEFAULT_CAP = 40;

/**
 * SSE로 들어오는 값(예: 설비 온도/부하)을 클라이언트 메모리에 누적해 최근 `cap`개를
 * 유지하는 링 버퍼 훅. 서버 히스토리 조회 없이 "지금부터 보이는" 추세만 그리므로
 * 새로고침 시 버퍼는 초기화된다.
 *
 * `value`가 유한한 숫자로 바뀔 때마다 버퍼에 추가하고, `cap`을 넘으면 가장 오래된 값을 버린다.
 * null/undefined/NaN은 무시한다(설비 미가동 등으로 텔레메트리가 없을 때).
 * 훅을 여러 번 호출하면(설비 카드마다 하나씩) 각각 독립된 버퍼를 갖는다.
 */
export function useSeriesBuffer(value: number | null | undefined, cap: number = DEFAULT_CAP): number[] {
  const bufferRef = React.useRef<number[]>([]);
  const [series, setSeries] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;

    const next = [...bufferRef.current, value];
    if (next.length > cap) {
      next.splice(0, next.length - cap);
    }
    bufferRef.current = next;
    setSeries(next);
  }, [value, cap]);

  return series;
}
