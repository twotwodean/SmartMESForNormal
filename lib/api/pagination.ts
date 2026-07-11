const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface PageParams {
  page: number;
  pageSize: number;
  search: string;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * URLSearchParams(또는 { page, pageSize, q } 형태)를 정규화된 PageParams로 변환한다.
 * - page: 1 이상 정수(기본 1)
 * - pageSize: 1~100 사이로 clamp(기본 20, defaults.pageSize로 재정의 가능)
 * - search: 공백 trim(기본 "")
 */
export function parsePageParams(
  sp: URLSearchParams | { page?: string; pageSize?: string; q?: string },
  defaults?: { pageSize?: number },
): PageParams {
  const get = (key: "page" | "pageSize" | "q"): string | null =>
    sp instanceof URLSearchParams ? sp.get(key) : (sp[key] ?? null);

  const defaultPageSize = defaults?.pageSize ?? DEFAULT_PAGE_SIZE;

  const rawPage = Number.parseInt(get("page") ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  const rawPageSize = Number.parseInt(get("pageSize") ?? "", 10);
  const pageSize = Number.isFinite(rawPageSize)
    ? Math.min(Math.max(rawPageSize, 1), MAX_PAGE_SIZE)
    : Math.min(Math.max(defaultPageSize, 1), MAX_PAGE_SIZE);

  const search = (get("q") ?? "").trim();

  return { page, pageSize, search };
}

/** rows(현재 페이지 슬라이스)와 total(전체 건수)로 Paginated<T> 응답을 구성한다. */
export function paginated<T>(rows: T[], total: number, p: PageParams): Paginated<T> {
  return {
    rows,
    total,
    page: p.page,
    pageSize: p.pageSize,
    pageCount: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}
