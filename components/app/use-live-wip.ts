"use client";

import * as React from "react";

import type { WipBoard } from "@/lib/services/wip-service";

export type LiveStatus = "connecting" | "live" | "offline";

export interface UseLiveWipResult {
  board: WipBoard;
  status: LiveStatus;
}

/**
 * SSE(/api/wip/stream)로 실시간 재공(WIP) 보드 스냅샷을 구독한다.
 * 연결 실패 시에도 초기값(서버 렌더 결과)을 그대로 노출해 화면이 깨지지 않는다.
 */
export function useLiveWip(initial: WipBoard): UseLiveWipResult {
  const [board, setBoard] = React.useState<WipBoard>(initial);
  const [status, setStatus] = React.useState<LiveStatus>("connecting");

  React.useEffect(() => {
    const es = new EventSource("/api/wip/stream");

    es.onopen = () => setStatus("live");

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as WipBoard;
        setBoard(parsed);
        setStatus("live");
      } catch {
        // 잘못된 페이로드는 무시하고 기존 상태 유지
      }
    };

    es.onerror = () => {
      // EventSource가 자동 재연결을 시도하므로 여기서는 상태만 갱신한다.
      setStatus("offline");
    };

    return () => {
      es.close();
    };
  }, []);

  return { board, status };
}
