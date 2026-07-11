import { describe, it, expect } from "vitest";
import { parsePageParams, paginated } from "@/lib/api/pagination";

describe("parsePageParams", () => {
  it("기본값(page=1, pageSize=20, search=\"\")을 반환한다", () => {
    expect(parsePageParams(new URLSearchParams())).toEqual({ page: 1, pageSize: 20, search: "" });
  });

  it("page/pageSize/q 쿼리를 파싱한다", () => {
    const sp = new URLSearchParams({ page: "3", pageSize: "10", q: " 검색어 " });
    expect(parsePageParams(sp)).toEqual({ page: 3, pageSize: 10, search: "검색어" });
  });

  it("plain object 입력도 지원한다", () => {
    expect(parsePageParams({ page: "2", pageSize: "5", q: "abc" })).toEqual({ page: 2, pageSize: 5, search: "abc" });
  });

  it("page가 1 미만이거나 숫자가 아니면 1로 보정한다", () => {
    expect(parsePageParams(new URLSearchParams({ page: "0" })).page).toBe(1);
    expect(parsePageParams(new URLSearchParams({ page: "-5" })).page).toBe(1);
    expect(parsePageParams(new URLSearchParams({ page: "abc" })).page).toBe(1);
  });

  it("pageSize를 1~100 사이로 clamp한다", () => {
    expect(parsePageParams(new URLSearchParams({ pageSize: "0" })).pageSize).toBe(1);
    expect(parsePageParams(new URLSearchParams({ pageSize: "500" })).pageSize).toBe(100);
    expect(parsePageParams(new URLSearchParams({ pageSize: "-10" })).pageSize).toBe(1);
  });

  it("defaults.pageSize로 기본 pageSize를 재정의할 수 있다", () => {
    expect(parsePageParams(new URLSearchParams(), { pageSize: 50 }).pageSize).toBe(50);
  });

  it("defaults.pageSize도 1~100으로 clamp된다", () => {
    expect(parsePageParams(new URLSearchParams(), { pageSize: 1000 }).pageSize).toBe(100);
  });

  it("search 공백을 trim한다", () => {
    expect(parsePageParams(new URLSearchParams({ q: "   " })).search).toBe("");
  });
});

describe("paginated", () => {
  it("pageCount를 total/pageSize의 올림으로 계산한다", () => {
    const result = paginated(["a", "b"], 45, { page: 1, pageSize: 20, search: "" });
    expect(result).toEqual({ rows: ["a", "b"], total: 45, page: 1, pageSize: 20, pageCount: 3 });
  });

  it("total이 0이어도 pageCount는 최소 1이다", () => {
    const result = paginated([], 0, { page: 1, pageSize: 20, search: "" });
    expect(result.pageCount).toBe(1);
  });

  it("total이 pageSize로 나누어 떨어지는 경우", () => {
    const result = paginated([], 40, { page: 2, pageSize: 20, search: "" });
    expect(result.pageCount).toBe(2);
  });
});
