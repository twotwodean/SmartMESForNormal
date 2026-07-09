import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { SEMANTIC_COLORS, TYPE_SCALE } from "@/lib/design-tokens";

function Tokens() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section>
        <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--faint)" }}>의미색</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {Object.keys(SEMANTIC_COLORS).map((key) => (
            <div key={key} style={{ width: 76 }}>
              <div style={{ height: 40, borderRadius: 6, border: "1px solid var(--border)", background: `var(--${key})` }} />
              <span style={{ fontSize: 11, color: "var(--muted)", display: "block", marginTop: 4 }}>{key}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--faint)" }}>타이포 스케일</h2>
        <div style={{ marginTop: 8 }}>
          {Object.entries(TYPE_SCALE).map(([name, size]) => (
            <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 12, borderBottom: "1px solid var(--border)", padding: "5px 0" }}>
              <span style={{ fontSize: 11, color: "var(--faint)", width: 84, fontFamily: "monospace" }}>{name} / {size}</span>
              <span style={{ fontSize: size }}>생산 통합 현황 12,340</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof Tokens> = { title: "Foundations/Design Tokens", component: Tokens };
export default meta;
type Story = StoryObj<typeof Tokens>;
export const All: Story = {};
