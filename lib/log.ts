// 서버 전용 구조적 로거. 외부 의존성 없이 JSON Lines(한 줄에 JSON 1개) 형식으로
// stdout(또는 error는 stderr)에 기록한다.

export type Level = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [k: string]: unknown;
}

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function minLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") return raw;
  return "info";
}

/**
 * 레벨/메시지/부가 필드를 JSON 한 줄로 기록한다.
 * error 레벨은 stderr로, 그 외는 stdout으로 출력한다.
 * process.env.LOG_LEVEL(기본값 "info")보다 낮은 레벨은 무시된다.
 */
export function log(level: Level, msg: string, fields?: LogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return;

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });

  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => log("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => log("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => log("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => log("error", msg, fields),
};

/**
 * 예기치 못한 에러를 error 레벨로 기록한다.
 * 프로덕션이 아닐 때만 스택 트레이스를 포함한다.
 */
export function logError(context: string, err: unknown, fields?: LogFields): void {
  const isError = err instanceof Error;
  const errorName = isError ? err.name : typeof err;
  const errorMessage = isError ? err.message : String(err);
  const stack = isError && process.env.NODE_ENV !== "production" ? err.stack : undefined;

  log("error", context, {
    ...fields,
    errorName,
    errorMessage,
    ...(stack ? { stack } : {}),
  });
}
