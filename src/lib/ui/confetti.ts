import confetti from "canvas-confetti";

export function fireCelebrationConfetti() {
  if (typeof window === "undefined") return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Coursera Blue + Academic Gold & Emerald confetti colors
  const colors = ["#0056D2", "#2A73CC", "#FFB800", "#107C41", "#FFFFFF"];

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors,
  });

  fire(0.2, {
    spread: 60,
    colors,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors,
  });
}
