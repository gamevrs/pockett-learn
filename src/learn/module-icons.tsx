import React from "react";
import { Activity, Binary, Bot, Boxes, CircuitBoard, Code, Cpu, Database, Gauge, LifeBuoy, ListTree, MemoryStick, Microchip, Network, Puzzle, Rocket, ShieldCheck, SquareTerminal, TrafficCone, type LucideIcon } from "lucide-react";

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
  database: Database,
  gauge: Gauge,
  rocket: Rocket,
  activity: Activity,
  lifebuoy: LifeBuoy,
  cone: TrafficCone,
  shield: ShieldCheck,
  bot: Bot,
};

export function ModuleIcon({ icon, className = "h-5 w-5" }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Binary;
  return <Icon className={className} aria-hidden />;
}
