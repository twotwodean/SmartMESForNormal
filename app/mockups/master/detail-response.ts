import type { ToastOptions } from "@/components/ui/toast";

/**
 * BOM·라우팅 편집 탭 전용 응답 처리 헬퍼.
 * 품목 선택 시 클라이언트에서 fetch하는 상세 데이터(BOM 구성/라우팅)는 서버 컴포넌트 재검증(router.refresh)으로는
 * 갱신되지 않으므로, 성공 시 onOk 콜백에서 해당 GET을 다시 호출해 로컬 상태를 갱신한다.
 * - ok: 성공 토스트 + onOk 콜백(재조회)
 * - 403: "권한 없음" 안내(관리자 전용)
 * - 그 외: 서버가 보낸 오류 메시지(순환 BOM·중복 등록 등)를 그대로 crit 토스트로 노출
 */
export async function handleDetailResponse(
  res: Response,
  toast: (opts: ToastOptions) => void,
  okTitle: string,
  onOk?: () => void | Promise<void>,
): Promise<void> {
  if (res.ok) {
    toast({ title: okTitle, tone: "ok" });
    await onOk?.();
    return;
  }
  if (res.status === 403) {
    toast({ title: "권한 없음", description: "관리자 전용입니다.", tone: "crit" });
    return;
  }
  const d: { error?: string } = await res.json().catch(() => ({}));
  toast({ title: "처리 실패", description: d.error ?? "알 수 없는 오류입니다.", tone: "crit" });
}
