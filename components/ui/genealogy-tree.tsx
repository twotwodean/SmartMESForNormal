import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/components/ui/status-pill";

export interface GenealogyNode {
  id: string;
  label: string;
  sub?: string;
  tone?: Tone;
  children?: GenealogyNode[];
}

/** 서브트리의 전체 노드 수(자신 포함) */
export function countNodes(node: GenealogyNode): number {
  return 1 + (node.children?.reduce((sum, c) => sum + countNodes(c), 0) ?? 0);
}

const DOT: Record<Tone, string> = {
  primary: "bg-primary",
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  neutral: "bg-neutral",
};

interface TreeProps {
  root: GenealogyNode;
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

function Node({
  node,
  selectedId,
  onSelect,
}: {
  node: GenealogyNode;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const selected = node.id === selectedId;
  return (
    <li className="relative pl-5">
      {/* 세로/가로 연결선 */}
      <span aria-hidden className="absolute left-0 top-0 h-full w-px bg-border" />
      <span aria-hidden className="absolute left-0 top-3.5 h-px w-4 bg-border" />
      <button
        type="button"
        onClick={() => onSelect?.(node.id)}
        className={cn(
          "relative my-1 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
          selected ? "border-primary bg-primary-soft" : "border-border bg-surface hover:bg-elevated",
        )}
      >
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", DOT[node.tone ?? "neutral"])} />
        <span className="text-body-sm font-medium text-text">{node.label}</span>
        {node.sub && <span className="text-caption text-text-muted">{node.sub}</span>}
      </button>
      {node.children && node.children.length > 0 && (
        <ul className="ml-1">
          {node.children.map((c) => (
            <Node key={c.id} node={c} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function GenealogyTree({ root, selectedId, onSelect, className }: TreeProps) {
  return (
    <ul className={cn("text-body-sm", className)}>
      <Node node={root} selectedId={selectedId} onSelect={onSelect} />
    </ul>
  );
}
