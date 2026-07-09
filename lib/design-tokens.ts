// 디자인 토큰 단일 진실원. globals.css / tailwind.config.ts가 이 값을 참조한다.

export const NEUTRAL_COLORS = {
  dark: {
    bg: "#0B0F14",
    surface: "#121821",
    elevated: "#1A2230",
    border: "#26303D",
    text: "#E2E8F0",
    "text-muted": "#94A3B8",
    "text-faint": "#64748B",
  },
  light: {
    bg: "#F6F8FA",
    surface: "#FFFFFF",
    elevated: "#FFFFFF",
    border: "#E3E8EF",
    text: "#0F172A",
    "text-muted": "#52607A",
    "text-faint": "#8A97AD",
  },
} as const;

export const SEMANTIC_COLORS = {
  primary: { dark: "#3B82F6", light: "#2563EB", darkSoft: "#17233C", lightSoft: "#E5EDFF" },
  ok: { dark: "#22C55E", light: "#16A34A", darkSoft: "#12281B", lightSoft: "#DCFCE7" },
  warn: { dark: "#F59E0B", light: "#D97706", darkSoft: "#2B2110", lightSoft: "#FEF3C7" },
  crit: { dark: "#EF4444", light: "#DC2626", darkSoft: "#2B1414", lightSoft: "#FEE2E2" },
  info: { dark: "#38BDF8", light: "#0EA5E9", darkSoft: "#0E2430", lightSoft: "#E0F2FE" },
  neutral: { dark: "#64748B", light: "#64748B", darkSoft: "#1B2430", lightSoft: "#EEF2F7" },
} as const;

export const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48] as const;

export const RADIUS = { sm: 4, md: 6, lg: 8 } as const;

export const TYPE_SCALE = {
  label: 11,
  caption: 12,
  "body-sm": 13,
  body: 14,
  subtitle: 16,
  h3: 20,
  h2: 24,
  h1: 30,
} as const;

// 상태 → 의미색 매핑 (고정). UI 컴포넌트가 참조.
export const STATUS_COLOR = {
  wo: { WAITING: "warn", RUNNING: "primary", DONE: "ok", CANCELLED: "neutral" },
  equipment: { RUN: "ok", STOP: "neutral", REPAIR: "crit" },
  inspection: { PASS: "ok", FAIL: "crit", SPECIAL: "warn" },
  stock: { NORMAL: "neutral", BELOW: "warn", NEGATIVE: "crit" },
} as const;
