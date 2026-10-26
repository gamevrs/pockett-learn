import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Reactor Core program prints (the real output of the reference solution,
 * abbreviated and frozen), so the landing page can show the Helios-1 board without calling the
 * code runner.
 */

const STDOUT = [
  "Helios-1 control software",
  "Core status: STANDBY",
  "Coolant loops: 3",
  "Fuel rods: 24",
  'Operator says "ready"',
  "Systems check complete",
  "Helios-1 | core 420.5 C | max 650 | rods 24 | plasma: true | mode R",
  "Trays needed: 4, empty slots: 2",
  "Efficiency: 33.3%",
  "Net power: 1620 kW",
  "Operator: Dana Whitlock (level 3)",
  "Setpoint: 412.5 C",
  "Welcome, Dana Whitlock (night shift)",
  "Alarm level: WARNING",
  "Coolant OK: true",
  "Start permitted: true",
  "Mode: Run",
  "Warm-up took 9 ticks, peak 425 C",
  "T-3",
  "T-2",
  "T-1",
  "Ignition!",
  "########",
  "#......#",
  "#..**..#",
  "#......#",
  "########",
  "Rods: 24",
  "Average level: 59.3",
  "Lowest: rod 13 at 12%",
  "Loop A: 288 L/min",
  "Loop B: 252 L/min",
  "Loop C: 352 L/min",
  "Average flow: 297.3 L/min",
  "[RUN] 412.5 C, 24 rods",
  "Packets: 2 good, 3 bad",
  "Neutron flux: 7.2 / 8 (90%)",
  "TEMP_HIGH x5 (most common)",
  "First warning: Coolant out",
  "R1: 55% inserted, reactivity 0.45",
  "State: Running",
  "ALARM OVER_LIMIT: Core temp at 700.0 exceeds limit 650.0",
  "ALARM BAD_DATA: Pressure reading -1.0 is not physical",
  "Shift report for Dana Whitlock (night shift)",
  "Grade: B",
].join("\n");

const ALARM_MESSAGES = [
  "Core temp at 700.0 exceeds limit 650.0",
  "Pressure reading -1.0 is not physical",
  "Coolant out at 455.0 exceeds limit 450.0",
  "Vessel wall has no valid limit (0.0)",
];

const VARS: Record<string, unknown> = {
  reactorName: "Helios-1", coreTemp: 420.5, maxTemp: 650, fuelRods: 24, plasmaOn: true, mode: "R", pressure: 2.4, loops: 3,
  pellets: 30, trayCapacity: 8, trays: 4, emptySlots: 2, thermalKw: 5400, electricKw: 1800, efficiency: 33.3, netKw: 1620,
  refills: 4, deviation: 8, fluxGain: 3.375, wrapped: 4, energyJ: 5000000000,
  operatorName: "Dana Whitlock", clearance: 3, setpoint: 412.5, shift: "night shift", nameLength: 13, initial: "D", welcome: "Welcome, Dana Whitlock (night shift)",
  probeTemp: 548, alarmLevel: "WARNING", flowLpm: 310, minFlow: 250, coolantOk: true, canStart: true, modeName: "Run", scramNeeded: false,
  rampStart: 20, rampTicks: 9, rampPeak: 425, primeCycles: 3, skipped: 2, lastTick: 11, heatTotal: 540,
  coreMap: "########\n#......#\n#..**..#\n#......#\n########\n",
  rodLevels: [40, 77, 59, 41, 78, 60, 42, 79, 61, 43, 80, 62, 44, 12, 63, 45, 82, 64, 46, 83, 65, 47, 84, 66],
  rodCount: 24, avgLevel: 59.3, minLevel: 12, minIndex: 13, maxLevel: 84,
  loopNames: ["A", "B", "C"], loopTemps: [412, 388.5, 455], loopFlows: [288, 252, 352], pumpRpm: 1500, totalFlow: 892, avgFlow: 297.3,
  packet: "T=412.5;P=2.4;S=RUN;R=24", packetTemp: 412.5, packetPressure: 2.4, packetState: "RUN", packetRods: 24, goodPackets: 2, badPackets: 3, logLine: "[RUN] 412.5 C, 24 rods",
  sensorNames: ["Core temp", "Coolant in", "Coolant out", "Pressure", "Neutron flux", "Vessel wall"],
  sensorValues: [420.5, 288, 355.5, 2.4, 7.2, 188], sensorLimits: [650, 400, 450, 5, 8, 300], overCount: 1, closestName: "Neutron flux",
  tally: { FLUX_SPIKE: 3, PUMP_START: 3, SCRAM_TEST: 1, TEMP_HIGH: 5, VALVE_OPEN: 2 }, mostCommon: "TEMP_HIGH", mostCommonCount: 5, distinctEvents: 5, pressureLimit: 5,
  rankedNames: ["Neutron flux", "Coolant out", "Coolant in", "Core temp", "Vessel wall", "Pressure"], firstWarning: "Coolant out", warnCount: 3, medianRod: 62,
  controlNames: ["R1", "R2", "R3", "R4"], controlInsertions: [55, 100, 50, 100], controlReactivity: [0.45, 0, 0.5, 0], totalReactivity: 0.95, fullyInserted: 2,
  state: "Running", stateCode: 3, history: ["Offline", "Standby", "WarmUp", "Running"], rejected: 2,
  alarmCodes: ["OVER_LIMIT", "BAD_DATA", "OVER_LIMIT", "BAD_DATA"], alarmMessages: ALARM_MESSAGES, alarmCount: 4, acceptedReadings: 2,
  shiftLog: [
    "Hour 1: 418.0 C NORMAL",
    "Hour 2: 436.5 C NORMAL",
    "Hour 3: 472.0 C NORMAL",
    "Hour 4: sensor fault, reading skipped",
    "Hour 5: 531.5 C WARNING",
    "Hour 6: 562.0 C WARNING",
    "Hour 7: 498.5 C NORMAL",
    "Hour 8: 455.0 C NORMAL",
  ],
  shiftPeak: 562, shiftAverage: 481.9, shiftWarnings: 2, shiftBadReadings: 1, shiftGrade: "B", shiftState: "Running", shiftLevels: { NORMAL: 5, WARNING: 2 },
};

export function cppBasicsDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
