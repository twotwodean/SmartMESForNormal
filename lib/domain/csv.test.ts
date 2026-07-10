import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/domain/csv";

describe("toCsv", () => {
  it("헤더+행을 CSV로 만든다", () => {
    const csv = toCsv([{ a: "x", b: 1 }, { a: "y", b: 2 }], [{ key: "a", label: "A" }, { key: "b", label: "B" }]);
    expect(csv).toBe("A,B\r\nx,1\r\ny,2");
  });
  it("쉼표·따옴표·개행은 큰따옴표로 감싸고 이스케이프한다", () => {
    const csv = toCsv([{ a: 'he said "hi", ok' }], [{ key: "a", label: "A" }]);
    expect(csv).toBe('A\r\n"he said ""hi"", ok"');
  });
});
