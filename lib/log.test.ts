import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { log, logger, logError } from "@/lib/log";

describe("log", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("info는 console.log에 JSON 한 줄로 기록된다", () => {
    log("info", "hello", { foo: "bar" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const line = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: "info", msg: "hello", foo: "bar" });
    expect(typeof parsed.ts).toBe("string");
    expect(new Date(parsed.ts).toString()).not.toBe("Invalid Date");
  });

  it("error는 console.error에 기록된다", () => {
    log("error", "boom");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.level).toBe("error");
    expect(parsed.msg).toBe("boom");
  });

  it("LOG_LEVEL보다 낮은 레벨은 무시한다", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    log("info", "should be filtered");
    log("debug", "should be filtered too");
    expect(logSpy).not.toHaveBeenCalled();
    log("warn", "should pass");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("기본 최소 레벨은 info이다 (debug는 무시)", () => {
    log("debug", "hidden");
    expect(logSpy).not.toHaveBeenCalled();
    log("info", "shown");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("logger 편의 함수는 log()를 올바른 레벨로 위임한다", () => {
    logger.info("info-msg");
    logger.warn("warn-msg");
    expect(logSpy).toHaveBeenCalledTimes(2);
    logger.error("error-msg");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("logError는 context/에러 이름/메시지를 기록한다", () => {
    vi.stubEnv("NODE_ENV", "development");
    logError("test context", new Error("에러 발생"), { routeId: "abc" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.msg).toBe("test context");
    expect(parsed.errorName).toBe("Error");
    expect(parsed.errorMessage).toBe("에러 발생");
    expect(parsed.routeId).toBe("abc");
    expect(typeof parsed.stack).toBe("string");
  });

  it("logError는 production에서 stack을 생략한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    logError("prod context", new Error("에러"));
    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.stack).toBeUndefined();
  });

  it("logError는 Error가 아닌 값도 처리한다", () => {
    logError("non-error context", "그냥 문자열");
    const parsed = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(parsed.errorMessage).toBe("그냥 문자열");
    expect(parsed.errorName).toBe("string");
  });
});
