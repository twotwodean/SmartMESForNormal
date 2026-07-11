"use client";

export function PrintButton() {
  return (
    <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--primary)",
          color: "var(--primary-fg)",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        인쇄
      </button>
      <button
        type="button"
        onClick={() => window.history.back()}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          cursor: "pointer",
        }}
      >
        닫기
      </button>
    </div>
  );
}
