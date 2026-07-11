import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

/**
 * 테스트별 진행 상황을 파일과 콘솔에 남기는 커스텀 리포터.
 * - 사람이 읽는 라인 로그: test-results/e2e-progress.log
 * - 기계 판독용 JSONL:    test-results/e2e-progress.jsonl
 * 각 테스트의 시작/종료(상태·소요시간·에러)와 주요 스텝(test.step·expect)을 기록해
 * 실행 중/후에 진행사항을 유추할 수 있게 한다.
 */
const LOG = "test-results/e2e-progress.log";
const JSONL = "test-results/e2e-progress.jsonl";

function ts(): string {
  // 리포터는 일반 Node 컨텍스트 → Date 사용 가능
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

function ensureDir(file: string): void {
  mkdirSync(dirname(file), { recursive: true });
}

function line(msg: string): void {
  const row = `[${ts()}] ${msg}`;
  // eslint-disable-next-line no-console
  console.log(row);
  appendFileSync(LOG, row + "\n");
}

function jsonl(obj: Record<string, unknown>): void {
  appendFileSync(JSONL, JSON.stringify({ ts: ts(), ...obj }) + "\n");
}

/** "파일 > 제목" 형태의 테스트 식별자 */
function label(test: TestCase): string {
  const file = test.location.file.split(/[\\/]/).pop() ?? "";
  return `${file} › ${test.title}`;
}

export default class ProgressReporter implements Reporter {
  private total = 0;
  private done = 0;
  private passed = 0;
  private failed = 0;
  private skipped = 0;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.total = suite.allTests().length;
    ensureDir(LOG);
    // 실행마다 새로 시작
    writeFileSync(LOG, "");
    writeFileSync(JSONL, "");
    line(`▶ E2E 시작 — 총 ${this.total}개 테스트`);
    jsonl({ event: "run_begin", total: this.total });
  }

  onTestBegin(test: TestCase): void {
    line(`  ▷ 시작 (${this.done + 1}/${this.total}) ${label(test)}`);
    jsonl({ event: "test_begin", test: label(test), index: this.done + 1, total: this.total });
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    // 노이즈 방지: 명시적 test.step 과 expect 단계만 기록
    if (step.category === "test.step" || step.category === "expect") {
      line(`      · ${step.category === "expect" ? "검증" : "단계"}: ${step.title}`);
      jsonl({ event: "step", test: label(test), category: step.category, title: step.title });
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.done += 1;
    const dur = `${result.duration}ms`;
    if (result.status === "passed") {
      this.passed += 1;
      line(`  ✓ 통과 (${this.done}/${this.total}) ${label(test)} — ${dur}`);
    } else if (result.status === "skipped") {
      this.skipped += 1;
      line(`  ⊘ 건너뜀 (${this.done}/${this.total}) ${label(test)}`);
    } else {
      this.failed += 1;
      const err = (result.error?.message ?? "").split("\n")[0];
      line(`  ✗ 실패 (${this.done}/${this.total}) ${label(test)} — ${dur} :: ${err}`);
    }
    const video = result.attachments.find((a) => a.name === "video")?.path;
    const trace = result.attachments.find((a) => a.name === "trace")?.path;
    if (video) line(`      🎬 영상: ${video}`);
    jsonl({
      event: "test_end",
      test: label(test),
      status: result.status,
      durationMs: result.duration,
      retry: result.retry,
      error: result.error?.message ?? null,
      video: video ?? null,
      trace: trace ?? null,
    });
  }

  onEnd(result: FullResult): Promise<void> | void {
    line(
      `■ E2E 종료 — ${result.status} · 통과 ${this.passed} / 실패 ${this.failed} / 건너뜀 ${this.skipped} (총 ${this.total})`,
    );
    line("  📊 HTML 리포트(영상 포함): npx playwright show-report");
    jsonl({
      event: "run_end",
      status: result.status,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      total: this.total,
    });
  }
}
