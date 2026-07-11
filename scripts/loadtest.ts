/**
 * 부하/동시성 실측 하니스 (SmartMES).
 *
 * ⚠️ 이 스크립트는 대상 DB에 실제로 쓰기(주문/출하/청구 생성 등)를 수행한다.
 *    반드시 폐기 가능한 DB(예: prisma/load.db)를 대상으로 실행할 것 — dev.db/e2e.db 금지.
 *
 * 목적: SQLite 쓰기 직렬화 한계 정량화 + 출하(Shipment) 상태 전이의
 *       낙관적 락 부재로 인한 경쟁 상태(동시 출하 처리 시 재고 이중 차감) 노출.
 *
 * 실행 예:
 *   DATABASE_URL="file:./load.db" LOAD_URL=http://localhost:3001 \
 *   LOAD_CONCURRENCY=20 LOAD_REQUESTS=200 SCENARIO=all npx tsx scripts/loadtest.ts
 *
 * env:
 *   LOAD_URL          대상 서버 base URL (기본 http://localhost:3001)
 *   LOAD_CONCURRENCY  동시 요청 수 (기본 20)
 *   LOAD_REQUESTS     시나리오별 총 요청 수 (기본 200)
 *   SCENARIO          "read" | "writeThroughput" | "shipRace" | "all" (기본 "all")
 *   DATABASE_URL      결과 검증용 Prisma 접속 대상 (앱과 동일 DB를 가리켜야 함)
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

// ── 설정 ──────────────────────────────────────────────────────────────
const LOAD_URL = process.env.LOAD_URL ?? "http://localhost:3001";
const LOAD_CONCURRENCY = Number(process.env.LOAD_CONCURRENCY ?? 20);
const LOAD_REQUESTS = Number(process.env.LOAD_REQUESTS ?? 200);
const SCENARIO = process.env.SCENARIO ?? "all";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const RESULTS_DIR = path.join(process.cwd(), "test-results");

const prisma = new PrismaClient();

// ── 공통 타입 ─────────────────────────────────────────────────────────
interface RequestResult {
  status: number;
  ms: number;
  errorText: string | null;
  isLockError: boolean;
}

interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  min: number;
  avg: number;
}

interface ScenarioSummary {
  scenario: string;
  totalRequests: number;
  concurrency: number;
  ok: number;
  failed: number;
  errorBreakdown: Record<string, number>;
  lockErrorCount: number;
  latencyMs: LatencyStats;
  durationSec: number;
  throughputReqPerSec: number;
  extra?: Record<string, unknown>;
}

const LOCK_PATTERNS = [/locked/i, /SQLITE_BUSY/i, /busy/i, /database is locked/i];

function detectLockError(text: string | null): boolean {
  if (!text) return false;
  return LOCK_PATTERNS.some((re) => re.test(text));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function computeLatencyStats(msList: number[]): LatencyStats {
  if (msList.length === 0) {
    return { p50: 0, p95: 0, p99: 0, max: 0, min: 0, avg: 0 };
  }
  const sorted = [...msList].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1],
    min: sorted[0],
    avg: Math.round((sum / sorted.length) * 100) / 100,
  };
}

/** 동시성 제한 풀 러너: tasks를 concurrency 캡으로 소비하며 실행 */
async function runPool<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const idx = cursor;
      cursor += 1;
      if (idx >= tasks.length) return;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function timedFetch(url: string, init: RequestInit): Promise<RequestResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const ms = performance.now() - start;
    let bodyText: string | null = null;
    try {
      bodyText = await res.text();
    } catch {
      bodyText = null;
    }
    const errorText = res.ok ? null : bodyText;
    return { status: res.status, ms, errorText, isLockError: detectLockError(bodyText) };
  } catch (e) {
    const ms = performance.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 0, ms, errorText: msg, isLockError: detectLockError(msg) };
  }
}

function summarize(scenario: string, concurrency: number, results: RequestResult[], durationSec: number, extra?: Record<string, unknown>): ScenarioSummary {
  const ok = results.filter((r) => r.status >= 200 && r.status < 300).length;
  const failed = results.length - ok;
  const errorBreakdown: Record<string, number> = {};
  let lockErrorCount = 0;
  for (const r of results) {
    if (r.status < 200 || r.status >= 300) {
      const key = String(r.status || "NETWORK_ERROR");
      errorBreakdown[key] = (errorBreakdown[key] ?? 0) + 1;
    }
    if (r.isLockError) lockErrorCount += 1;
  }
  const latencyMs = computeLatencyStats(results.map((r) => r.ms));
  const throughputReqPerSec = durationSec > 0 ? Math.round((results.length / durationSec) * 100) / 100 : 0;
  return {
    scenario,
    totalRequests: results.length,
    concurrency,
    ok,
    failed,
    errorBreakdown,
    lockErrorCount,
    latencyMs,
    durationSec: Math.round(durationSec * 1000) / 1000,
    throughputReqPerSec,
    extra,
  };
}

function printSummary(s: ScenarioSummary): void {
  console.log(`\n=== [${s.scenario}] 결과 ===`);
  console.log(`요청 수: ${s.totalRequests} (동시성 ${s.concurrency}) / 소요: ${s.durationSec}s / 처리량: ${s.throughputReqPerSec} req/s`);
  console.log(`성공: ${s.ok} / 실패: ${s.failed} / 락(lock/busy) 에러: ${s.lockErrorCount}`);
  if (Object.keys(s.errorBreakdown).length > 0) {
    console.log(`에러 분포: ${JSON.stringify(s.errorBreakdown)}`);
  }
  console.log(
    `지연(ms) p50=${s.latencyMs.p50.toFixed(1)} p95=${s.latencyMs.p95.toFixed(1)} p99=${s.latencyMs.p99.toFixed(1)} max=${s.latencyMs.max.toFixed(1)} min=${s.latencyMs.min.toFixed(1)} avg=${s.latencyMs.avg.toFixed(1)}`,
  );
  if (s.extra) {
    console.log(`추가 정보: ${JSON.stringify(s.extra, null, 2)}`);
  }
}

function writeJson(scenario: string, data: unknown): void {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const file = path.join(RESULTS_DIR, `loadtest-${scenario}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  console.log(`결과 저장: ${file}`);
}

// ── 로그인 & 쿠키 ─────────────────────────────────────────────────────
async function login(): Promise<string> {
  const res = await fetch(`${LOAD_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`로그인 실패: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("로그인 응답에 Set-Cookie가 없습니다.");
  // "smartmes_session=xxx; Path=/; HttpOnly; SameSite=Lax" → 앞부분만 취해 재사용
  const cookiePair = setCookie.split(";")[0];
  return cookiePair;
}

// ── 테스트용 기준 데이터 조회 ───────────────────────────────────────────
interface SeedRefs {
  customerId: string;
  finishedItemId: string;
}

async function loadSeedRefs(): Promise<SeedRefs> {
  const customer = await prisma.supplier.findUnique({ where: { code: "CUS-001" } });
  if (!customer) throw new Error("CUS-001 고객을 찾을 수 없습니다. seed가 적용된 DB인지 확인하세요.");
  const item = await prisma.item.findUnique({ where: { code: "FG-GB2500" } });
  if (!item) throw new Error("FG-GB2500 품목을 찾을 수 없습니다. seed가 적용된 DB인지 확인하세요.");
  return { customerId: customer.id, finishedItemId: item.id };
}

// ── 시나리오 1: read ──────────────────────────────────────────────────
async function scenarioRead(cookie: string): Promise<ScenarioSummary> {
  const tasks = Array.from({ length: LOAD_REQUESTS }, () => async () =>
    timedFetch(`${LOAD_URL}/api/mrp`, { headers: { cookie } }),
  );
  const start = performance.now();
  const results = await runPool(tasks, LOAD_CONCURRENCY);
  const durationSec = (performance.now() - start) / 1000;
  const summary = summarize("read", LOAD_CONCURRENCY, results, durationSec, { endpoint: "GET /api/mrp" });
  printSummary(summary);
  writeJson("read", summary);
  return summary;
}

// ── 시나리오 2: writeThroughput ───────────────────────────────────────
async function scenarioWriteThroughput(cookie: string, refs: SeedRefs): Promise<ScenarioSummary> {
  const marker = `LOADTEST-WT-${Date.now()}`;
  const tasks = Array.from({ length: LOAD_REQUESTS }, (_, i) => async () =>
    timedFetch(`${LOAD_URL}/api/invoices`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ customerId: refs.customerId, amount: 1000 + (i % 50) }),
    }),
  );
  const start = performance.now();
  const results = await runPool(tasks, LOAD_CONCURRENCY);
  const durationSec = (performance.now() - start) / 1000;

  // 생성된 invoice code 중복 여부 확인 (전체 스캔 후 이번 라운드 이후 issuedAt 기준 최근 N건이 아니라
  // code 형식이 시간 기반이라 전체 invoice에서 code 중복 여부를 그룹핑해 검사)
  const invoices = await prisma.invoice.findMany({ select: { code: true } });
  const codeCounts = new Map<string, number>();
  for (const inv of invoices) codeCounts.set(inv.code, (codeCounts.get(inv.code) ?? 0) + 1);
  const dupCodes = [...codeCounts.entries()].filter(([, c]) => c > 1);
  const dupCount = dupCodes.reduce((acc, [, c]) => acc + c, 0);

  const summary = summarize("writeThroughput", LOAD_CONCURRENCY, results, durationSec, {
    endpoint: "POST /api/invoices",
    marker,
    totalInvoicesInDb: invoices.length,
    duplicateCodeGroups: dupCodes.length,
    duplicateCodeRows: dupCount,
    duplicateCodeSamples: dupCodes.slice(0, 5).map(([code, count]) => ({ code, count })),
  });
  printSummary(summary);
  writeJson("writeThroughput", summary);
  return summary;
}

// ── 시나리오 3: shipRace (핵심) ───────────────────────────────────────
interface ShipRaceRound {
  round: number;
  shipmentId: string;
  shipmentCode: string;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  expectedStockDelta: number;
  actualStockDelta: number;
  http2xxCount: number;
  httpErrorCount: number;
  outTxnCount: number;
  raceConfirmed: boolean;
  concurrentRequests: number;
  latenciesMs: number[];
}

async function currentStock(itemId: string): Promise<number> {
  const agg = await prisma.inventoryTxn.aggregate({ where: { itemId }, _sum: { qty: true } });
  return agg._sum.qty ?? 0;
}

async function scenarioShipRace(cookie: string, refs: SeedRefs, rounds: number, concurrentPerRound: number): Promise<{ summary: ScenarioSummary; rounds: ShipRaceRound[] }> {
  const roundResults: ShipRaceRound[] = [];
  const qty = 5;

  for (let round = 1; round <= rounds; round++) {
    // SETUP: 신규 수주 + REQUESTED 출하 1건 생성
    const soRes = await timedFetch(`${LOAD_URL}/api/sales-orders`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({
        customerId: refs.customerId,
        itemId: refs.finishedItemId,
        qty,
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      }),
    });
    if (soRes.status < 200 || soRes.status >= 300) {
      throw new Error(`shipRace setup: 수주 생성 실패 (round ${round}) status=${soRes.status} ${soRes.errorText}`);
    }
    const so = await prisma.salesOrder.findFirst({ where: { itemId: refs.finishedItemId, qty }, orderBy: { createdAt: "desc" } });
    if (!so) throw new Error(`shipRace setup: 방금 만든 수주를 찾지 못했습니다 (round ${round})`);

    const shRes = await timedFetch(`${LOAD_URL}/api/shipments`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ salesOrderId: so.id, qty }),
    });
    if (shRes.status < 200 || shRes.status >= 300) {
      throw new Error(`shipRace setup: 출하 생성 실패 (round ${round}) status=${shRes.status} ${shRes.errorText}`);
    }
    const shipment = await prisma.shipment.findFirst({ where: { salesOrderId: so.id }, orderBy: { createdAt: "desc" } });
    if (!shipment) throw new Error(`shipRace setup: 방금 만든 출하를 찾지 못했습니다 (round ${round})`);

    const stockBefore = await currentStock(refs.finishedItemId);

    // ATTACK: 같은 shipment.id에 대해 동시 PATCH ship
    const tasks = Array.from({ length: concurrentPerRound }, () => async () =>
      timedFetch(`${LOAD_URL}/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ action: "ship" }),
      }),
    );
    const results = await runPool(tasks, concurrentPerRound);

    const stockAfter = await currentStock(refs.finishedItemId);
    const outTxns = await prisma.inventoryTxn.findMany({ where: { itemId: refs.finishedItemId, type: "OUT", ref: shipment.code } });
    const http2xxCount = results.filter((r) => r.status >= 200 && r.status < 300).length;
    const httpErrorCount = results.length - http2xxCount;
    const expectedStockDelta = -qty;
    const actualStockDelta = stockAfter - stockBefore;
    const raceConfirmed = outTxns.length > 1 || actualStockDelta !== expectedStockDelta;

    const roundResult: ShipRaceRound = {
      round,
      shipmentId: shipment.id,
      shipmentCode: shipment.code,
      qty,
      stockBefore,
      stockAfter,
      expectedStockDelta,
      actualStockDelta,
      http2xxCount,
      httpErrorCount,
      outTxnCount: outTxns.length,
      raceConfirmed,
      concurrentRequests: concurrentPerRound,
      latenciesMs: results.map((r) => Math.round(r.ms * 100) / 100),
    };
    roundResults.push(roundResult);

    console.log(
      `[shipRace round ${round}] shipment=${shipment.code} 2xx=${http2xxCount}/${concurrentPerRound} OUT건수=${outTxns.length} 재고변화=${actualStockDelta}(기대 ${expectedStockDelta}) ${raceConfirmed ? "★ RACE CONFIRMED ★" : "정상(1회만 처리)"}`,
    );
  }

  const allLatencies = roundResults.flatMap((r) => r.latenciesMs);
  const raceCount = roundResults.filter((r) => r.raceConfirmed).length;
  const summary = summarize("shipRace", concurrentPerRound, allLatencies.map((ms) => ({ status: 200, ms, errorText: null, isLockError: false })), 0, {
    rounds: roundResults.length,
    raceConfirmedRounds: raceCount,
    raceFrequency: `${raceCount}/${roundResults.length}`,
    perRound: roundResults.map((r) => ({
      round: r.round,
      shipmentCode: r.shipmentCode,
      http2xx: r.http2xxCount,
      outTxnCount: r.outTxnCount,
      expectedStockDelta: r.expectedStockDelta,
      actualStockDelta: r.actualStockDelta,
      raceConfirmed: r.raceConfirmed,
    })),
  });
  printSummary(summary);
  writeJson("shipRace", { summary, rounds: roundResults });
  return { summary, rounds: roundResults };
}

// ── 메인 ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("⚠️  주의: 이 스크립트는 대상 DB에 실제로 데이터를 기록합니다. 폐기 가능한 DB(load.db)에서만 실행하세요.");
  console.log(`대상: ${LOAD_URL} / 동시성=${LOAD_CONCURRENCY} / 요청수=${LOAD_REQUESTS} / 시나리오=${SCENARIO}`);

  const cookie = await login();
  console.log("로그인 성공, 세션 쿠키 확보.");

  const refs = await loadSeedRefs();

  const runAll = SCENARIO === "all";

  if (runAll || SCENARIO === "read") {
    await scenarioRead(cookie);
  }
  if (runAll || SCENARIO === "writeThroughput") {
    await scenarioWriteThroughput(cookie, refs);
  }
  if (runAll || SCENARIO === "shipRace") {
    const rounds = Number(process.env.LOAD_SHIPRACE_ROUNDS ?? 5);
    const k = Number(process.env.LOAD_SHIPRACE_K ?? 10);
    await scenarioShipRace(cookie, refs, rounds, k);
  }

  await prisma.$disconnect();
  console.log("\n완료.");
}

main().catch(async (e) => {
  console.error("loadtest 실패:", e);
  await prisma.$disconnect();
  process.exit(1);
});
