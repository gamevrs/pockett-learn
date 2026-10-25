import React from "react";
import { Binary, Boxes, Cpu, Puzzle, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { binary: Binary, cpu: Cpu, boxes: Boxes, puzzle: Puzzle };

export function ModuleIcon({ icon, className = "h-5 w-5" }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Binary;
  return <Icon className={className} aria-hidden />;
}
