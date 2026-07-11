// Next.js 서버 컴포넌트(Node 런타임)에서 실행되므로 Node 전용 빌드를 명시적으로 사용한다.
// (패키지의 "." export는 조건부(browser/node/electron)라 TS bundler 해상도에서
//  타입을 못 찾는 경우가 있어, 타입이 최상위로 노출된 "bwip-js/node" 서브패스를 사용한다.)
import * as bwipjs from "bwip-js/node";

export interface BarcodeOptions {
  height?: number; // 바코드 막대 높이(mm)
  scale?: number; // 확대 배율
  includetext?: boolean; // 사람이 읽을 수 있는 텍스트 포함 여부
}

const DEFAULT_HEIGHT = 12;
const DEFAULT_SCALE = 2;

/**
 * 서버 사이드에서 Code128 바코드를 인라인 SVG 문자열로 생성한다.
 * bwip-js(v4)의 `toSVG`는 DOM 없이 순수 JS로 SVG 마크업을 반환하므로
 * Next.js 서버 컴포넌트에서 그대로 사용할 수 있고, CSP(img-src 'self' data:)에
 * 걸리지 않는다(외부 요청/이미지 로드가 전혀 없음).
 */
export function barcodeSvg(text: string, opts: BarcodeOptions = {}): string {
  if (!text || text.trim().length === 0) {
    throw new Error("barcodeSvg: text는 비어 있을 수 없습니다.");
  }

  const svg = bwipjs.toSVG({
    bcid: "code128",
    text,
    scale: opts.scale ?? DEFAULT_SCALE,
    height: opts.height ?? DEFAULT_HEIGHT,
    includetext: opts.includetext ?? true,
    textxalign: "center",
  });

  // bwip-js가 반환하는 SVG는 viewBox만 있고 width/height 속성이 없어
  // 일부 브라우저에서 100%(부모 폭)로 늘어나 버릴 수 있다.
  // viewBox 크기를 그대로 width/height(px)로 명시해 고유 크기를 보존한다.
  const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (viewBoxMatch && !/<svg[^>]*\swidth="/.test(svg)) {
    const [, w, h] = viewBoxMatch;
    return svg.replace("<svg ", `<svg width="${w}" height="${h}" `);
  }
  return svg;
}
