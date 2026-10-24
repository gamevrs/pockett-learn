import confetti from "canvas-confetti";

export function fireCelebrationConfetti(colors: string[] = ["#8f74ff", "#b9a8ff", "#ffffff"]) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const shot = (ratio: number, opts: confetti.Options) =>
    confetti({ origin: { y: 0.7 }, zIndex: 9999, colors, ...opts, particleCount: Math.floor(220 * ratio) });

  shot(0.25, { spread: 26, startVelocity: 55 });
  shot(0.2, { spread: 60 });
  shot(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  shot(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  shot(0.1, { spread: 120, startVelocity: 45 });
}
