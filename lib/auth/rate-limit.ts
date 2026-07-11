/**
 * 로그인 시도용 인메모리 슬라이딩 윈도우 rate limiter.
 *
 * NOTE: 이 구현은 단일 Node.js 프로세스 내 Map을 사용한다.
 * 멀티 인스턴스(여러 서버 프로세스/컨테이너/서버리스 인스턴스)로 수평 확장하는 경우
 * 인스턴스마다 카운터가 독립적이라 정확한 전역 제한이 되지 않으므로,
 * Redis 등 공유 스토어 기반 구현으로 교체해야 한다.
 */

const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

const attempts = new Map<string, RateLimitEntry>();

/**
 * key(예: `${ip}:${username}`)에 대한 시도 횟수를 증가시키고 허용 여부를 반환한다.
 * now를 인자로 받아 순수 함수로 동작하므로 테스트에서 시간 흐름을 직접 제어할 수 있다.
 */
export function checkAndConsume(key: string, now: number): RateLimitResult {
  const entry = attempts.get(key);

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSec: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { allowed: true, remaining: Math.max(0, MAX_ATTEMPTS - entry.count), retryAfterSec: 0 };
}

/** 로그인 성공 시 해당 key의 카운터를 즉시 초기화한다. */
export function resetKey(key: string): void {
  attempts.delete(key);
}

/** 테스트 전용: 전체 상태 초기화. */
export function _clearAll(): void {
  attempts.clear();
}
