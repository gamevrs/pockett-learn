import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Reef Station program prints (the real output of the reference solution,
 * frozen), so the landing page can show Halcyon Reef Station without calling the code runner.
 */

const STDOUT = [
  "Halcyon Reef Station",
  "Crew aboard: 6",
  "Depth 42 m, pressure 5.2 bar",
  "Oxygen: 87.50%",
  "Hatch label: \"B-7\"",
  "Pump {3} is online",
  "Halcyon | crew 6 | depth 42 m | oxygen 87.5% | pumps true | hatch B",
  "Overflow: wrapped 4, capped 255, checked None",
  "Pressure at 42 m: 5.20 bar",
  "Dive time: 2 h 15 min",
  "Air per diver: 333.3 L",
  "Casts: 3, 44, 4294967295",
  "\"40m\" is not a whole number: invalid digit found in string",
  "Dive request: Mara Okoye -> deep-ledge at 35 m",
  "Zone: deep",
  "Oxygen: OK",
  "Watch: full watch",
  "Dive status: GO",
  "Passing 10 m",
  "Passing 20 m",
  "Passing 30 m",
  "Reserve reached after 3 h (50.0%)",
  "Ballast full after 7 cycles",
  "Leak found at row 2, seal 3 after 7 checks",
  "Readings: [41, 42, 42, 44, 41, 40]",
  "Highest 44, lowest 40, average 41.67",
  "Beacon: (12, -4, 42), depth field 42",
  "Spare slots: [0, 0, 0, 0] (4 slots)",
  "5 dives logged, deepest 35 m",
  "Dive #2 is Some(25)",
  "No dive #8 in the log yet",
  "Log in depth order: [12, 18, 25, 31, 35] (shallowest 12 m)",
  "Vault sealed: coral core 7",
  "coral core 7 [stamped]",
  "Original log: 5 entries, extended copy: 6 entries",
  "42 and 42 are both usable",
  "Average depth 24.2 m -> 24.8 m (6 dives)",
  "Oxygen topped up to 100.0%",
  "SURFACE says: 6 words, all clear: true",
  "SURFACE: WEATHER CLEAR, SEA STATE 2",
  "\"18°C\" is 5 bytes but 4 characters",
  "Manta: 85% battery at 30 m",
  "Pip: 15% battery at 170 m",
  "Drone { name: \"Pip\", battery_pct: 15, depth_m: 170, active: true }",
  "Spare: 85% battery at 30 m",
  "Manta dives 40 m",
  "Manta scans deep-ledge",
  "Manta charges for 30 min",
  "Manta surfaces",
  "Pip health: Critical",
  "Pip must return to charge",
  "Sample 103: sponge from 31 m",
  "Sample 999 is not catalogued",
  "Weights: Some(420) None None",
  "Manifest weight for 102: 0 g",
  "Catalogue weighs 570 g, 1 sample not weighed yet",
  "Accepted #104: kelp",
  "Rejected 105,urchin,deep,40 -> \"deep\" is not a valid number",
  "Rejected 106,anemone -> expected 4 fields, found 2",
  "Rejected 107,shell,-5,10 -> depth -5 is negative",
  "Accepted #108: sponge",
  "Intake: 2 accepted, 3 rejected",
  "=== Halcyon station report ===",
  "Dives: 6 logged, deepest 35 m, average 24.8 m",
  "Samples: 5 catalogued (brain coral, sea fan, sponge, kelp, sponge)",
  "Weighed: 725 g, 1 from the deep zone",
  "Zones:",
  "  shallow: 2",
  "  mid-water: 2",
  "  deep: 1",
  "Drones needing charge: Pip",
].join("\n");

const VARS: Record<string, unknown> = {
  "station": "Halcyon",
  "crew": 6,
  "depthM": 42,
  "oxygenPct": 100,
  "pumpsOnline": true,
  "hatch": "B",
  "tanks": 8,
  "wrappedLevel": 4,
  "cappedLevel": 255,
  "pressureBar": 5.2,
  "hours": 2,
  "minutes": 15,
  "litresEach": 333.3333333333333,
  "cutOff": 3,
  "wrappedByte": 44,
  "negativeWrap": 4294967295,
  "diver": "Mara Okoye",
  "plannedDepth": 35,
  "site": "deep-ledge",
  "badText": "40m",
  "bonusDepth": 0,
  "zone": "deep",
  "o2Status": "OK",
  "watch": "full watch",
  "cleared": true,
  "verdict": "GO",
  "markersPassed": 3,
  "hoursToReserve": 3,
  "reservePct": 50,
  "fullAfter": 7,
  "checked": 7,
  "leakRow": 2,
  "leakSeal": 3,
  "readings": [
    41,
    42,
    42,
    44,
    41,
    40
  ],
  "highest": 44,
  "lowest": 40,
  "average": 41.666666666666664,
  "beacon": [
    12,
    -4,
    42
  ],
  "diveLog": [
    12,
    18,
    25,
    31,
    35,
    28
  ],
  "diveCount": 5,
  "deepest": 35,
  "shallowest": 12,
  "sealedChars": 12,
  "stamped": "coral core 7 [stamped]",
  "originalLen": 5,
  "extendedLen": 6,
  "copiedDepth": 42,
  "avgBefore": 24.2,
  "avgAfter": 24.833333333333332,
  "message": "SURFACE: weather clear, sea state 2",
  "sender": "SURFACE",
  "wordCount": 6,
  "shout": "SURFACE: WEATHER CLEAR, SEA STATE 2",
  "allClear": true,
  "readingBytes": 5,
  "readingChars": 4,
  "summary": "SURFACE says: 6 words, all clear: true",
  "fleet": [
    {
      "name": "Manta",
      "battery": 95,
      "depthM": 0,
      "active": true,
      "needsCharge": false
    },
    {
      "name": "Pip",
      "battery": 15,
      "depthM": 170,
      "active": true,
      "needsCharge": true
    },
    {
      "name": "Spare",
      "battery": 85,
      "depthM": 30,
      "active": true,
      "needsCharge": false
    }
  ],
  "commands": [
    "Dive(40)",
    "Scan(\"deep-ledge\")",
    "Charge { minutes: 30 }",
    "Surface"
  ],
  "reports": [
    "Manta dives 40 m",
    "Manta scans deep-ledge",
    "Manta charges for 30 min",
    "Manta surfaces"
  ],
  "pipHealth": "Critical",
  "mantaBattery": 95,
  "catalogue": [
    {
      "id": 101,
      "name": "brain coral",
      "depthM": 18,
      "weightG": 420
    },
    {
      "id": 102,
      "name": "sea fan",
      "depthM": 25,
      "weightG": null
    },
    {
      "id": 103,
      "name": "sponge",
      "depthM": 31,
      "weightG": 150
    }
  ],
  "weight101": 420,
  "weight102": null,
  "totalWeightG": 570,
  "unweighed": 1,
  "intake": [
    {
      "id": 104,
      "name": "kelp",
      "depthM": 12,
      "weightG": 90
    },
    {
      "id": 108,
      "name": "sponge",
      "depthM": 22,
      "weightG": 65
    }
  ],
  "problems": [
    "105,urchin,deep,40 -> \"deep\" is not a valid number",
    "106,anemone -> expected 4 fields, found 2",
    "107,shell,-5,10 -> depth -5 is negative"
  ],
  "acceptedCount": 2,
  "zoneCounts": {
    "shallow": 2,
    "mid-water": 2,
    "deep": 1
  },
  "needsCharge": [
    "Pip"
  ],
  "report": {
    "dives": 6,
    "deepest": 35,
    "meanDepth": 24.833333333333332,
    "samples": 5,
    "weighedG": 725,
    "deepSamples": 1,
    "needsCharge": 1
  }
};

export function rustBasicsDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
