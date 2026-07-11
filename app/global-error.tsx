"use client";

// 루트 레이아웃 자체가 실패했을 때 대체되는 최후 방어선.
// app/layout.tsx의 폰트(next/font)·Provider·globals.css에 의존할 수 없으므로
// html/body를 직접 그리고, 인라인 스타일만 사용해 완전히 독립적으로 렌더링한다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0B0F14",
          color: "#E2E8F0",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', sans-serif",
          padding: 16,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 380,
            borderRadius: 8,
            border: "1px solid #26303D",
            background: "#121821",
            boxShadow: "0 12px 32px rgba(0,0,0,.5)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              margin: "0 auto 16px",
              display: "grid",
              placeItems: "center",
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "#2B1414",
              color: "#EF4444",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>심각한 오류가 발생했습니다</h1>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 4px", lineHeight: 1.5 }}>
            애플리케이션을 불러오는 중 문제가 발생했습니다. 새로고침해도 문제가 지속되면 관리자에게 문의하세요.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#64748B", margin: "8px 0 0" }}>오류 코드: {error.digest}</p>
          )}
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              width: "100%",
              height: 36,
              borderRadius: 6,
              border: "none",
              background: "#3B82F6",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            새로고침
          </button>
        </div>
      </body>
    </html>
  );
}
