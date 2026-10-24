import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/** What the finished Python program would expose, written in plain JS so the landing page needs no Python runtime. */
export function launchDemoProgram(): ProgramHandle {
  return createStaticProgram({
    stdout: "LAUNCH CONTROL ONLINE\nALL SYSTEMS NOMINAL\nPAD A READY\n5\n4\n3\n2\n1\nLIFTOFF!",
    vars: {
      mission_name: "Moonshot-1",
      rocket_name: "Pathfinder",
      rocket_color: "#f2f4fa",
      crew: 3,
      fuel_tons: 80.0,
      has_escape_tower: true,
      countdown: [5, 4, 3, 2, 1],
      dry_mass_t: 45.0,
      thrust_kn: 2400.0,
      mass_t: 125.0,
      twr: 1.96,
      payload_t: 14.0,
      stages: [
        { name: "Booster", thrust_kn: 2600, burn_seconds: 65, dry_t: 14.0 },
        { name: "Upper stage", thrust_kn: 800, burn_seconds: 150, dry_t: 5.0 },
      ],
    },
    hooks: {
      throttle_program: (t: number) => Math.min(1.0, 0.7 + t * 0.03),
      abort_check: (altitudeKm: number, speed: number, fuelPct: number) => (altitudeKm < 25 && speed > 1200) || (fuelPct < 2 && altitudeKm < 70),
      "guidance.pitch": (altitudeKm: number) => (altitudeKm <= 1 ? 0 : Math.min((altitudeKm - 1) * 2, 90)),
    },
  });
}
