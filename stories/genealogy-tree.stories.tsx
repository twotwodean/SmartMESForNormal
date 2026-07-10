import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { GenealogyTree, type GenealogyNode } from "@/components/ui/genealogy-tree";

const root: GenealogyNode = {
  id: "P1", label: "완제품 LOT-2600714", sub: "기어박스 GB-2500", tone: "ok",
  children: [
    { id: "S1", label: "반제품 LOT-2600712", sub: "샤프트 SUS-304", tone: "primary",
      children: [{ id: "R1", label: "원자재 LOT-2600701", sub: "환봉 Ø50", tone: "neutral" }] },
    { id: "S2", label: "반제품 LOT-2600713", sub: "하우징 M3", tone: "warn",
      children: [{ id: "R2", label: "원자재 LOT-2600705", sub: "알루미늄 6061", tone: "neutral" }] },
  ],
};

const meta: Meta<typeof GenealogyTree> = { title: "MES/GenealogyTree", component: GenealogyTree };
export default meta;
type Story = StoryObj<typeof GenealogyTree>;

export const Lineage: Story = {
  render: () => {
    const [sel, setSel] = React.useState<string | undefined>("S1");
    return <GenealogyTree root={root} selectedId={sel} onSelect={setSel} />;
  },
};
