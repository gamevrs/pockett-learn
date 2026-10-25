import React from "react";
import {
  Activity,
  AudioWaveform,
  Bot,
  Car,
  Circle,
  CircleDot,
  Compass,
  Disc3,
  Drum,
  Flag,
  Flame,
  Gauge,
  KeyRound,
  Layers,
  ListMusic,
  Navigation,
  Palette,
  Power,
  Rocket,
  ShieldAlert,
  SlidersHorizontal,
  Terminal,
  Timer,
  Waves,
  type LucideIcon,
} from "lucide-react";

/**
 * Line icons for projects and unlockable features. The UI uses these instead of emoji so the
 * product reads consistently and professionally. Content keeps its `emoji` field for exports.
 */

const PROJECT_ICONS: Record<string, LucideIcon> = {
  garage: Car,
  launch: Rocket,
  beatlab: AudioWaveform,
  "pixel-pet": Bot,
  rover: Compass,
  "art-studio": Palette,
};

const FEATURE_ICONS: Record<string, LucideIcon> = {
  // Turbo Garage
  ignition: KeyRound,
  paint: Palette,
  engine: Gauge,
  throttle: SlidersHorizontal,
  steering: Navigation,
  checkpoints: Flag,
  tires: Disc3,
  autopilot: Bot,
  // Launch Control
  console: Terminal,
  rocket: Rocket,
  countdown: Timer,
  engines: Flame,
  safety: ShieldAlert,
  staging: Layers,
  guidance: Compass,
  // Beat Lab
  power: Power,
  tempo: Activity,
  kick: Drum,
  snare: CircleDot,
  hats: Waves,
  bass: AudioWaveform,
  mixer: SlidersHorizontal,
  arranger: ListMusic,
};

export function ProjectIcon({ slug, className = "h-4 w-4" }: { slug: string; className?: string }) {
  const Icon = PROJECT_ICONS[slug] ?? Circle;
  return <Icon className={className} aria-hidden />;
}

export function FeatureIcon({ id, className = "h-3.5 w-3.5" }: { id: string; className?: string }) {
  const Icon = FEATURE_ICONS[id] ?? Circle;
  return <Icon className={className} aria-hidden />;
}
