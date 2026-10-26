import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished C# Foundations program prints (the real output of the reference solution,
 * frozen), so the landing page can show the depot board without calling the code runner.
 */

const STDOUT = [
  "Cinder Street Depot",
  "Robots online: 3",
  'Rex says "ready"',
  "Parcels today: 42",
  "Rex | battery 80/100 | speed 1.5 m/s | online: True | grade A",
  "8 trips, 5 parcels left over",
  "Average 3.32 kg, fee 20.00",
  "MO-012 | Mika Okafor -> HARBOUR LIBRARY",
  "Cleared for delivery",
  "Standard parcel, Evening shift, Ready, Half day",
  "Patrol stop 8",
  "6 laps before recharge (10% left)",
  "########",
  "#......#",
  "#......#",
  "#......#",
  "########",
  "Queue (3): Lamp, Chair, Mirror",
  "SOFA is not stocked",
  "Dock -> A3 | 8 m | 5.3 min",
  "A3 -> B1 | 6 m | 4.0 min",
  "B1 -> Dock | 6 m | 4.0 min",
  "P-999: unclaimed",
  "Pip: 15% after 40 m (needs charge)",
  "P-100 was Loaded, now Delivered",
  "Loading dock closed",
  "Delivered: 4 | Rejected: 2 | Revenue: 16.50 | Busiest stop: Library",
].join("\n");

const VARS: Record<string, unknown> = {
  robotName: "Rex", battery: 80, maxBattery: 100, speed: 1.5, online: true, grade: "A", chargeCycles: 12,
  parcels: 47, crateSize: 6, trips: 8, leftover: 5, avgKg: 3.32, fee: 20, wrapped: -2147483648, safe: 2147483648,
  customer: "Mika Okafor", destination: "HARBOUR LIBRARY", weightKg: 12, code: "MO-012", extraText: "7x", extraOk: false,
  tier: "Standard", shiftName: "Evening", chargeState: "Ready", canDeliver: true, hours: "Half day",
  meters: 24, lapsOnCharge: 6, floorMap: "########\n#......#\n#......#\n#......#\n########\n", docksVisited: 7,
  slots: ["Lamp", "Desk", null, null, "Chair", null], filled: 3, queue: ["Lamp", "Chair", "Mirror"], weights: [3, 4, 7, 9, 12, 25], heaviest: 25, totalWeight: 60,
  stock: { LAMP: 12, DESK: 7, CHAIR: 0, MIRROR: 5 }, lowStock: ["CHAIR", "MIRROR"],
  legs: ["Dock -> A3 | 8 m | 5.3 min", "A3 -> B1 | 6 m | 4.0 min", "B1 -> Dock | 6 m | 4.0 min"], totalMeters: 20, totalMinutes: 13.3, fastMinutes: 10,
  scans: ["P-100: Mika", "P-999: unclaimed", "P-101: Jo"], unclaimed: 1, noteLength: 0,
  fleet: [
    { name: "Rex", battery: 65, meters: 30, needsCharge: false },
    { name: "Pip", battery: 15, meters: 40, needsCharge: true },
    { name: "Dot", battery: 95, meters: 10, needsCharge: false },
    { name: "Bit", battery: 0, meters: 100, needsCharge: true },
  ],
  parcelList: [
    { id: "P-100", destination: "Library", kg: 4.5, status: "Delivered" },
    { id: "P-101", destination: "Harbour", kg: 12, status: "Waiting" },
    { id: "P-102", destination: "School", kg: 7.2, status: "Waiting" },
    { id: "P-103", destination: "Market", kg: 26.5, status: "Waiting" },
    { id: "P-104", destination: "Library", kg: 3, status: "Delivered" },
  ],
  statusCounts: { Waiting: 3, Loaded: 0, Delivered: 2, Lost: 0 }, sameValues: true,
  incidents: [
    { kind: "Bad input", message: '"12kg" is not a whole number' },
    { kind: "Overweight", message: "P-103 is 26.5 kg, over the 25 kg limit" },
    { kind: "Overweight", message: "P-202 is 31 kg, over the 25 kg limit" },
    { kind: "Bad input", message: '"x" is not a whole number' },
  ],
  loaded: 2,
  report: { delivered: 4, rejected: 2, revenue: 16.5, busiestStop: "Library" },
};

export function csharpBasicsDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
