import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./stories/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        border: "var(--border)",
        text: { DEFAULT: "var(--text)", muted: "var(--muted)", faint: "var(--faint)" },
        primary: { DEFAULT: "var(--primary)", fg: "var(--primary-fg)", soft: "var(--primary-soft)" },
        ok: { DEFAULT: "var(--ok)", soft: "var(--ok-soft)" },
        warn: { DEFAULT: "var(--warn)", soft: "var(--warn-soft)" },
        crit: { DEFAULT: "var(--crit)", soft: "var(--crit-soft)" },
        info: { DEFAULT: "var(--info)", soft: "var(--info-soft)" },
        neutral: { DEFAULT: "var(--neutral)", soft: "var(--neutral-soft)" },
      },
      borderRadius: { sm: "4px", md: "6px", lg: "8px" },
      fontFamily: { sans: ["var(--font-pretendard)", "system-ui", "sans-serif"] },
      fontSize: {
        label: "11px", caption: "12px", "body-sm": "13px", body: "14px",
        subtitle: "16px", h3: "20px", h2: "24px", h1: "30px",
      },
      boxShadow: {
        card: "var(--shadow)",
        modal: "var(--shadow-lg)",
      },
      transitionDuration: { DEFAULT: "150ms" },
    },
  },
  plugins: [],
};

export default config;
