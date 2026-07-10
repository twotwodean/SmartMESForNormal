export interface CsvColumn<T> {
  key: keyof T;
  label: string;
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 객체 배열 → CSV 문자열(CRLF 구분) */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(",")).join("\r\n");
  return body ? `${header}\r\n${body}` : header;
}
