import React from "react";
import { Binary, Boxes, CircuitBoard, Code, Cpu, ListTree, MemoryStick, Microchip, Network, Puzzle, SquareTerminal, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  binary: Binary,
  cpu: Cpu,
  code: Code,
  boxes: Boxes,
  puzzle: Puzzle,
  circuit: CircuitBoard,
  microchip: Microchip,
  memory: MemoryStick,
  terminal: SquareTerminal,
  network: Network,
  tree: ListTree,
};

export function ModuleIcon({ icon, className = "h-5 w-5" }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Binary;
  return <Icon className={className} aria-hidden />;
}
