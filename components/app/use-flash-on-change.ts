"use client";

import * as React from "react";

const FLASH_DURATION_MS = 800;

/**
 * 값이 렌더 사이에 바뀌면(리마운트 시 초기값은 제외) 짧게 true를 반환한다.
 * `animate-flash` 클래스를 조건부로 붙여 SSE로 갱신되는 숫자가 "방금 바뀌었다"는 것을
 * 시각적으로 인지시키기 위한 훅이다.
 */
export function useFlashOnChange(value: number | string): boolean {
  const [flashing, setFlashing] = React.useState(false);
  const prevRef = React.useRef<number | string | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;

    // 초기 마운트(prev === null)에는 flash하지 않는다.
    if (prev === null || prev === value) return;

    setFlashing(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setFlashing(false), FLASH_DURATION_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value]);

  return flashing;
}
