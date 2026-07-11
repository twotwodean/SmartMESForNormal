import { barcodeSvg } from "@/lib/labels/barcode";
import { getLotLabels, getRecentLotLabels, type LotLabel } from "@/lib/services/label-service";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

interface SearchParams {
  ids?: string;
  type?: string; // 예약: "lot"(기본) 외 라벨 유형 확장용
}

function parseIds(ids: string | undefined): string[] {
  if (!ids) return [];
  return ids
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function LabelCard({ lot }: { lot: LotLabel }) {
  const svg = barcodeSvg(lot.code, { height: 12, scale: 2, includetext: false });
  return (
    <div
      className="label-card"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 6,
        background: "var(--surface)",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "50mm",
        minHeight: "30mm",
      }}
    >
      <div
        style={{ width: "100%", display: "flex", justifyContent: "center" }}
        // 우리(bwip-js)가 서버에서 생성한 SVG만 주입한다 — 외부 리소스 없음, CSP 안전.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, textAlign: "center" }}>{lot.code}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
        {lot.itemCode} · {lot.itemName}
      </div>
      <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
        <span>수량 {lot.qty}</span>
        <span>{lot.status}</span>
      </div>
      <div style={{ fontSize: 10, color: "var(--faint)", textAlign: "right" }}>
        {lot.createdAt.toISOString().slice(0, 10)}
      </div>
    </div>
  );
}

export default async function PrintLabelsPage({ searchParams }: { searchParams: SearchParams }) {
  const ids = parseIds(searchParams.ids);
  const labels = ids.length > 0 ? await getLotLabels(ids) : await getRecentLotLabels();

  return (
    <div style={{ padding: 24, background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .label-card { break-inside: avoid; page-break-inside: avoid; border-color: #000 !important; }
          .label-grid { gap: 4mm !important; }
        }
      `}</style>

      <PrintButton />

      <h1 className="no-print" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
        로트 라벨 인쇄
      </h1>
      <p className="no-print" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
        {ids.length > 0 ? `선택된 로트 ${labels.length}건` : `최근 로트 ${labels.length}건 (id 미지정)`}
      </p>

      {labels.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>표시할 로트 라벨이 없습니다. ?ids=lotId1,lotId2 형식으로 접근하세요.</p>
      ) : (
        <div
          className="label-grid"
          style={{ display: "flex", flexWrap: "wrap", gap: "6mm" }}
        >
          {labels.map((lot) => (
            <LabelCard key={lot.id} lot={lot} />
          ))}
        </div>
      )}
    </div>
  );
}
