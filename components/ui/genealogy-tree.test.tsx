import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { countNodes, GenealogyTree, type GenealogyNode } from "@/components/ui/genealogy-tree";

const tree: GenealogyNode = {
  id: "L1",
  label: "LOT-A",
  children: [
    { id: "L2", label: "LOT-B", children: [{ id: "L4", label: "LOT-D" }] },
    { id: "L3", label: "LOT-C" },
  ],
};

describe("countNodes", () => {
  it("전체 노드 수를 센다", () => {
    expect(countNodes(tree)).toBe(4);
  });
  it("단일 노드는 1", () => {
    expect(countNodes({ id: "x", label: "x" })).toBe(1);
  });
});

describe("GenealogyTree", () => {
  it("모든 노드를 렌더한다", () => {
    render(<GenealogyTree root={tree} />);
    expect(screen.getByText("LOT-A")).toBeInTheDocument();
    expect(screen.getByText("LOT-D")).toBeInTheDocument();
  });
  it("노드 클릭 시 onSelect가 호출된다", async () => {
    const user = userEvent.setup();
    let selected = "";
    render(<GenealogyTree root={tree} onSelect={(id) => (selected = id)} />);
    await user.click(screen.getByText("LOT-C"));
    expect(selected).toBe("L3");
  });
});
