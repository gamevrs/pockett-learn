/**
 * What the finished Halyard Port program prints: the real output of the reference solution,
 * frozen (generated from lesson 16's solution). demo.ts is the only consumer.
 */

export const DEMO_STDOUT: string = "Distinct origins: 3\nLuna Gate was new: False\nDocking: V-14\nNext in line: V-11\nUnloading H-3013\nUnloading H-3010\nUnloading H-3006\nUnloading H-3005\nUnloading H-3001\nAgri: 2180 kg\nFuel: 6000 kg\nMachinery: 4940 kg\nMail: 450 kg\nMedical: 850 kg\nSupply: 2500 kg\nUrgent: H-3002, H-3007, H-3010, H-3013\nHeavy: H-3003, H-3004, H-3006, H-3010, H-3012\nBoard top 3: H-3010, H-3007, H-3013\nAny mail: True\nAll under 5000 kg: True\nMedical shipments: 3\nFirst fuel: H-3003\nHazmat found: False\nFuel: count 2, 6000 kg, avg 3000, heaviest H-3003\nMachinery: count 3, 4940 kg, avg 1646.7, heaviest H-3004\nSupply: count 1, 2500 kg, avg 2500, heaviest H-3006\nAgri: count 3, 2180 kg, avg 726.7, heaviest H-3008\nMedical: count 3, 850 kg, avg 283.3, heaviest H-3007\nMail: count 2, 450 kg, avg 225, heaviest H-3005\nCeres Yard: 6630 kg\nLuna Gate: 2430 kg\nVesta Dock: 7860 kg\nV-11 carries 5 shipments\nV-12 carries 4 shipments\nV-14 carries 5 shipments\nV-15 carries 0 shipments\nTotal 16920 kg, average 1208.6 kg, heaviest H-3003\nManifest rows: 14\nFirst row: H-3001 on Pelican Run\nPelican Run: 5 shipments, 5710 of 9000 kg (63.4%)\nMarrow Lantern: 4 shipments, 2890 of 6000 kg (48.2%)\nQuiet Kestrel: 5 shipments, 8320 of 12000 kg (69.3%)\nSaltmarsh: 0 shipments, 0 of 4000 kg (0%)\nEmpty vessels: Saltmarsh\nCrew on duty: 10\nAfter defining the query: 0 evaluations\nAfter two Count() calls: 28 evaluations (5 heavy shipments)\nAfter ToList and two reads: 14 evaluations\nLight shipments: 5 before the new arrival, 6 after, snapshot still 5\nScan passes: 2 without a snapshot, 1 with one\nSame values: True\nSame object: False\nBerth { Dock = A, Slot = 3 }\nDock A, slot 3\nOriginal: Berth { Dock = A, Slot = 3 }\nMoved: Berth { Dock = A, Slot = 7 }\nDistinct berths: 2\nOccupant of A3: Pelican Run\nH-3001: priority 2 -> 1\nSame shipment after amendment: False\nCopy sharing the crew array equals original: True\nCopy with a cloned crew array equals original: False\nExpress: 4\nHeavy lift: 2\nMail run: 2\nStandard: 6\nUrgent and heavy: 1\nBands: light 6, medium 5, heavy 3\nHandling: Cold storage 6, Pressure dock 1, Heavy crane 1, Fuel dock 1, Open bay 5\nRoute: no stops\nRoute: Ceres Yard only\nRoute: Ceres Yard to Vesta Dock, direct\nRoute: Luna Gate to Phobos Spur via 2 stops\nH-3001 Seed vault trays: 820 kg\nOkonkwo party of 3: 285 kg\nH-3002 Insulin cold packs: 140 kg\nBoarding mass: 1245 kg\nHeaviest crates: H-3003, H-3004, H-3006, H-3010, H-3012\nDuplicate crate added: False\nCrates kept: 14\nHeaviest on the cabin manifest: H-3001 Seed vault trays\nHeaviest crate: H-3003 Reactor coolant\nLargest number: 93\nLast crew name alphabetically: Wren Castellano\nLast crate in sort order: H-3002\nHold of 5000 kg: 6 accepted, 8 refused, 4890 kg loaded\nLast 3 arrivals: V-15, V-12, V-14\nGrouped by hand: Agri 3, Medical 3, Fuel 2, Machinery 3, Mail 2, Supply 1\nHeavy loads: 4.2 t, 3.1 t, 2.5 t, 1.8 t, 1.2 t\nPerishable: H-3001, H-3002, H-3007, H-3008, H-3011, H-3013\nPage 2: H-3006, H-3007, H-3008, H-3009, H-3010\nAll: 14 shipments, 16.9 t\nPerishable summary: 6 shipments, 3.0 t\nV-14 -> Quiet Kestrel, captain Priya Natarajan\nV-99 -> unknown vessel, captain unassigned\nV-15 -> Saltmarsh, captain Wren Castellano\nH-3003: Pressure seal inspected\nH-3004: (no note)\nH-3009: (no note)\nShipments without a note: 13\nUsing ! on a missing vessel: Object reference not set to an instance of an object.\nGuard: Value cannot be null. (Parameter 'label')\nH-4001 -> 1250 kg, priority 1\nH-4002 -> 980 kg, priority 3\nH-4003 rejected: mass \"12O kg\" is not a number\nH-4004 -> 75 kg, priority 3\nH-4005 -> 1200 kg, priority 2\nH-4006 rejected: expected 4 fields, found 3\nParsed 4, rejected 2\nRegex read H-4001: 1250 kg\nRegex accepts 4 of 6 lines\nMentioned: H-4001, H-4005\nH-3006 loaded: now 2500 kg aboard\nH-3004 rejected: H-3004 is 1600 kg over capacity\nH-3005 loaded: now 2760 kg aboard\nH-3010 deferred: 560 kg over, waits for the next launch\nH-3014 loaded: now 2950 kg aboard\nH-3008 loaded: now 3860 kg aboard\nH-3012 rejected: H-3012 is 1060 kg over capacity\nLoad attempts closed: 7\nSaltmarsh carries 3860 of 4000 kg\nSpare check: 190 kg would fit: False (50 kg over)\nWrapped: Bad mass text \"12O\" for H-4003 (inner FormatException)\n{\n  \"id\": \"V-11\",\n  \"name\": \"Pelican Run\",\n  \"operator\": \"Tern Freight\",\n  \"capacityKg\": 9000,\n  \"crew\": [\n    \"Ada Ruiz\",\n    \"Joss Teller\",\n    \"Mina Oyelaran\"\n  ]\n}\nNotice: V-12 arrives in 45 min with 4 shipments, 1125 kg\nRejected H-5003: mass must be positive, got -20\nRejected H-5004: priority must be 1 to 3, got 7\nAccepted 2 of 4 shipments\nJSON error at line 3, position 29, path $.arrivesInMinutes\nAccepted 4, rejected 8\nLine 5: vessel: unknown \"V-99\"\nLine 6: mass: \"abc\" is not a whole number\nLine 7: id: duplicate of an earlier row\nLine 8: category: unknown \"Biohazard\"\nLine 9: row: expected 7 fields, found 6\nLine 10: id: missing\nLine 11: category: unknown \"Pantry\"; mass: must be positive, got -50\nLine 12: priority: must be 1 to 3, got 4\nReasons by field: mass 2, id 2, category 2, vessel 1, row 1, priority 1\nPelican Run: 64.8% steady\nMarrow Lantern: 49.8% light\nQuiet Kestrel: 81.8% crowded\nSaltmarsh: 0% light\nPort report: 18 shipments, 18.6 t\nBusiest vessel: Quiet Kestrel (9820 kg, 81.8% full)\nTop category: Fuel (6000 kg)\nRejected imports: 8\nCrowded vessels: Quiet Kestrel\nRound trip total: 18635";

export const DEMO_VARS: Record<string, unknown> = {
  "origins": [
    "Ceres Yard",
    "Luna Gate",
    "Vesta Dock"
  ],
  "docked": "V-14",
  "dockQueue": [
    "V-11",
    "V-15",
    "V-12"
  ],
  "unloadOrder": [
    "H-3013",
    "H-3010",
    "H-3006",
    "H-3005",
    "H-3001"
  ],
  "tonnageByCategory": {
    "Agri": 2180,
    "Fuel": 6000,
    "Machinery": 4940,
    "Mail": 450,
    "Medical": 850,
    "Supply": 2500
  },
  "board": [
    {
      "id": "H-3010",
      "cargo": "Fusion pellets",
      "category": "Fuel",
      "massKg": 1800,
      "priority": 1
    },
    {
      "id": "H-3007",
      "cargo": "Surgical lamps",
      "category": "Medical",
      "massKg": 380,
      "priority": 1
    },
    {
      "id": "H-3013",
      "cargo": "Antibiotic crates",
      "category": "Medical",
      "massKg": 330,
      "priority": 1
    },
    {
      "id": "H-3002",
      "cargo": "Insulin cold packs",
      "category": "Medical",
      "massKg": 140,
      "priority": 1
    },
    {
      "id": "H-3003",
      "cargo": "Reactor coolant",
      "category": "Fuel",
      "massKg": 4200,
      "priority": 2
    },
    {
      "id": "H-3012",
      "cargo": "Solar film rolls",
      "category": "Machinery",
      "massKg": 1200,
      "priority": 2
    },
    {
      "id": "H-3008",
      "cargo": "Hydroponic nutrients",
      "category": "Agri",
      "massKg": 910,
      "priority": 2
    },
    {
      "id": "H-3001",
      "cargo": "Seed vault trays",
      "category": "Agri",
      "massKg": 820,
      "priority": 2
    },
    {
      "id": "H-3009",
      "cargo": "Rotor bearings",
      "category": "Machinery",
      "massKg": 640,
      "priority": 2
    },
    {
      "id": "H-3004",
      "cargo": "Hull plating",
      "category": "Machinery",
      "massKg": 3100,
      "priority": 3
    },
    {
      "id": "H-3006",
      "cargo": "Water ice blocks",
      "category": "Supply",
      "massKg": 2500,
      "priority": 3
    },
    {
      "id": "H-3011",
      "cargo": "Orchard saplings",
      "category": "Agri",
      "massKg": 450,
      "priority": 3
    },
    {
      "id": "H-3005",
      "cargo": "Letters and parcels",
      "category": "Mail",
      "massKg": 260,
      "priority": 3
    },
    {
      "id": "H-3014",
      "cargo": "Parcel sacks",
      "category": "Mail",
      "massKg": 190,
      "priority": 3
    }
  ],
  "urgentIds": [
    "H-3002",
    "H-3007",
    "H-3010",
    "H-3013"
  ],
  "heavyIds": [
    "H-3003",
    "H-3004",
    "H-3006",
    "H-3010",
    "H-3012"
  ],
  "medicalCount": 3,
  "firstFuel": "H-3003",
  "hazmatFound": false,
  "anyMail": true,
  "categoryStats": [
    {
      "category": "Fuel",
      "count": 2,
      "totalKg": 6000,
      "avgKg": 3000,
      "heaviest": "H-3003"
    },
    {
      "category": "Machinery",
      "count": 3,
      "totalKg": 4940,
      "avgKg": 1646.7,
      "heaviest": "H-3004"
    },
    {
      "category": "Supply",
      "count": 1,
      "totalKg": 2500,
      "avgKg": 2500,
      "heaviest": "H-3006"
    },
    {
      "category": "Agri",
      "count": 3,
      "totalKg": 2180,
      "avgKg": 726.7,
      "heaviest": "H-3008"
    },
    {
      "category": "Medical",
      "count": 3,
      "totalKg": 850,
      "avgKg": 283.3,
      "heaviest": "H-3007"
    },
    {
      "category": "Mail",
      "count": 2,
      "totalKg": 450,
      "avgKg": 225,
      "heaviest": "H-3005"
    }
  ],
  "originTotals": {
    "Ceres Yard": 6630,
    "Luna Gate": 2430,
    "Vesta Dock": 7860
  },
  "perVessel": {
    "V-11": 5,
    "V-12": 4,
    "V-14": 5,
    "V-15": 0
  },
  "totals": {
    "count": 14,
    "totalKg": 16920,
    "avgKg": 1208.6,
    "heaviest": "H-3003"
  },
  "manifest": [
    {
      "id": "H-3001",
      "vessel": "Pelican Run",
      "massKg": 820
    },
    {
      "id": "H-3002",
      "vessel": "Marrow Lantern",
      "massKg": 140
    },
    {
      "id": "H-3003",
      "vessel": "Quiet Kestrel",
      "massKg": 4200
    },
    {
      "id": "H-3004",
      "vessel": "Quiet Kestrel",
      "massKg": 3100
    },
    {
      "id": "H-3005",
      "vessel": "Pelican Run",
      "massKg": 260
    },
    {
      "id": "H-3006",
      "vessel": "Pelican Run",
      "massKg": 2500
    },
    {
      "id": "H-3007",
      "vessel": "Quiet Kestrel",
      "massKg": 380
    },
    {
      "id": "H-3008",
      "vessel": "Marrow Lantern",
      "massKg": 910
    },
    {
      "id": "H-3009",
      "vessel": "Marrow Lantern",
      "massKg": 640
    },
    {
      "id": "H-3010",
      "vessel": "Pelican Run",
      "massKg": 1800
    },
    {
      "id": "H-3011",
      "vessel": "Quiet Kestrel",
      "massKg": 450
    },
    {
      "id": "H-3012",
      "vessel": "Marrow Lantern",
      "massKg": 1200
    },
    {
      "id": "H-3013",
      "vessel": "Pelican Run",
      "massKg": 330
    },
    {
      "id": "H-3014",
      "vessel": "Quiet Kestrel",
      "massKg": 190
    }
  ],
  "vesselLoads": [
    {
      "vessel": "Pelican Run",
      "shipments": 5,
      "loadKg": 5710,
      "capacityKg": 9000,
      "usedPct": 63.4
    },
    {
      "vessel": "Marrow Lantern",
      "shipments": 4,
      "loadKg": 2890,
      "capacityKg": 6000,
      "usedPct": 48.2
    },
    {
      "vessel": "Quiet Kestrel",
      "shipments": 5,
      "loadKg": 8320,
      "capacityKg": 12000,
      "usedPct": 69.3
    },
    {
      "vessel": "Saltmarsh",
      "shipments": 0,
      "loadKg": 0,
      "capacityKg": 4000,
      "usedPct": 0
    }
  ],
  "crew": [
    "Ada Ruiz (Pelican Run)",
    "Joss Teller (Pelican Run)",
    "Mina Oyelaran (Pelican Run)",
    "Kofi Bannerman (Marrow Lantern)",
    "Lio Chen (Marrow Lantern)",
    "Priya Natarajan (Quiet Kestrel)",
    "Sven Aldous (Quiet Kestrel)",
    "Tamsin Hale (Quiet Kestrel)",
    "Uzo Eze (Quiet Kestrel)",
    "Wren Castellano (Saltmarsh)"
  ],
  "crewCount": 10,
  "executionTrace": [
    {
      "step": "query defined",
      "evaluations": 0
    },
    {
      "step": "first Count()",
      "evaluations": 14
    },
    {
      "step": "second Count()",
      "evaluations": 28
    },
    {
      "step": "ToList()",
      "evaluations": 14
    },
    {
      "step": "reads of the list",
      "evaluations": 14
    }
  ],
  "sourceChange": {
    "before": 5,
    "after": 6,
    "snapshot": 5
  },
  "passes": {
    "naive": 2,
    "snapshot": 1
  },
  "berthCompare": {
    "equal": true,
    "sameReference": false,
    "text": "Berth { Dock = A, Slot = 3 }"
  },
  "berthMove": {
    "before": "Berth { Dock = A, Slot = 3 }",
    "after": "Berth { Dock = A, Slot = 7 }"
  },
  "berthKeys": {
    "distinct": 2,
    "occupant": "Pelican Run"
  },
  "amendment": {
    "before": {
      "id": "H-3001",
      "cargo": "Seed vault trays",
      "category": "Agri",
      "origin": "Ceres Yard",
      "vesselId": "V-11",
      "massKg": 820,
      "priority": 2
    },
    "after": {
      "id": "H-3001",
      "cargo": "Seed vault trays",
      "category": "Agri",
      "origin": "Ceres Yard",
      "vesselId": "V-11",
      "massKg": 820,
      "priority": 1
    }
  },
  "lanes": [
    {
      "id": "H-3001",
      "lane": "Standard"
    },
    {
      "id": "H-3002",
      "lane": "Express"
    },
    {
      "id": "H-3003",
      "lane": "Heavy lift"
    },
    {
      "id": "H-3004",
      "lane": "Heavy lift"
    },
    {
      "id": "H-3005",
      "lane": "Mail run"
    },
    {
      "id": "H-3006",
      "lane": "Standard"
    },
    {
      "id": "H-3007",
      "lane": "Express"
    },
    {
      "id": "H-3008",
      "lane": "Standard"
    },
    {
      "id": "H-3009",
      "lane": "Standard"
    },
    {
      "id": "H-3010",
      "lane": "Express"
    },
    {
      "id": "H-3011",
      "lane": "Standard"
    },
    {
      "id": "H-3012",
      "lane": "Standard"
    },
    {
      "id": "H-3013",
      "lane": "Express"
    },
    {
      "id": "H-3014",
      "lane": "Mail run"
    }
  ],
  "laneCounts": {
    "Standard": 6,
    "Express": 4,
    "Heavy lift": 2,
    "Mail run": 2
  },
  "bandCounts": {
    "medium": 5,
    "light": 6,
    "heavy": 3
  },
  "handlingCounts": {
    "Cold storage": 6,
    "Pressure dock": 1,
    "Heavy crane": 1,
    "Open bay": 5,
    "Fuel dock": 1
  },
  "routeSummaries": [
    "no stops",
    "Ceres Yard only",
    "Ceres Yard to Vesta Dock, direct",
    "Luna Gate to Phobos Spur via 2 stops"
  ],
  "loadables": [
    {
      "label": "H-3001 Seed vault trays",
      "massKg": 820
    },
    {
      "label": "Okonkwo party of 3",
      "massKg": 285
    },
    {
      "label": "H-3002 Insulin cold packs",
      "massKg": 140
    }
  ],
  "boardingKg": 1245,
  "heaviestCrates": [
    "H-3003",
    "H-3004",
    "H-3006",
    "H-3010",
    "H-3012"
  ],
  "crateDedupe": {
    "offered": 15,
    "kept": 14
  },
  "largest": {
    "number": 93,
    "name": "Wren Castellano",
    "crate": "H-3002"
  },
  "hold": {
    "capacityKg": 5000,
    "accepted": [
      "H-3001",
      "H-3002",
      "H-3004",
      "H-3005",
      "H-3007",
      "H-3014"
    ],
    "refused": [
      "H-3003",
      "H-3006",
      "H-3008",
      "H-3009",
      "H-3010",
      "H-3011",
      "H-3012",
      "H-3013"
    ],
    "totalKg": 4890
  },
  "recent": [
    "V-15",
    "V-12",
    "V-14"
  ],
  "grouped": {
    "Agri": 3,
    "Medical": 3,
    "Fuel": 2,
    "Machinery": 3,
    "Mail": 2,
    "Supply": 1
  },
  "tonnes": [
    "4.2 t",
    "3.1 t",
    "2.5 t",
    "1.8 t",
    "1.2 t"
  ],
  "perishableIds": [
    "H-3001",
    "H-3002",
    "H-3007",
    "H-3008",
    "H-3011",
    "H-3013"
  ],
  "pageTwo": [
    "H-3006",
    "H-3007",
    "H-3008",
    "H-3009",
    "H-3010"
  ],
  "summaryLine": "14 shipments, 16.9 t",
  "vesselLookups": [
    {
      "id": "V-14",
      "found": true,
      "name": "Quiet Kestrel",
      "captain": "Priya Natarajan"
    },
    {
      "id": "V-99",
      "found": false,
      "name": null,
      "captain": "unassigned"
    },
    {
      "id": "V-15",
      "found": true,
      "name": "Saltmarsh",
      "captain": "Wren Castellano"
    }
  ],
  "bangCrash": "Object reference not set to an instance of an object.",
  "telegrams": [
    {
      "id": "H-4001",
      "cargo": "Fusion pellets",
      "massKg": 1250,
      "priority": 1
    },
    {
      "id": "H-4002",
      "cargo": "Ice cores",
      "massKg": 980,
      "priority": 3
    },
    {
      "id": "H-4004",
      "cargo": "Mail sacks",
      "massKg": 75,
      "priority": 3
    },
    {
      "id": "H-4005",
      "cargo": "Solar film",
      "massKg": 1200,
      "priority": 2
    }
  ],
  "telegramRejects": [
    {
      "line": "H-4003 | Dental drills | 12O kg | P2",
      "reason": "mass \"12O kg\" is not a number"
    },
    {
      "line": "H-4006 | Ration crates | 640 kg",
      "reason": "expected 4 fields, found 3"
    }
  ],
  "regexParts": {
    "id": "H-4001",
    "mass": "1250",
    "unit": "kg"
  },
  "mentionedIds": [
    "H-4001",
    "H-4005"
  ],
  "loadLog": [
    {
      "id": "H-3006",
      "outcome": "loaded",
      "detail": "now 2500 kg aboard"
    },
    {
      "id": "H-3004",
      "outcome": "rejected",
      "detail": "H-3004 is 1600 kg over capacity"
    },
    {
      "id": "H-3005",
      "outcome": "loaded",
      "detail": "now 2760 kg aboard"
    },
    {
      "id": "H-3010",
      "outcome": "deferred",
      "detail": "560 kg over, waits for the next launch"
    },
    {
      "id": "H-3014",
      "outcome": "loaded",
      "detail": "now 2950 kg aboard"
    },
    {
      "id": "H-3008",
      "outcome": "loaded",
      "detail": "now 3860 kg aboard"
    },
    {
      "id": "H-3012",
      "outcome": "rejected",
      "detail": "H-3012 is 1060 kg over capacity"
    }
  ],
  "loadAttempts": 7,
  "exportJson": "{\r\n  \"id\": \"V-11\",\r\n  \"name\": \"Pelican Run\",\r\n  \"operator\": \"Tern Freight\",\r\n  \"capacityKg\": 9000,\r\n  \"crew\": [\r\n    \"Ada Ruiz\",\r\n    \"Joss Teller\",\r\n    \"Mina Oyelaran\"\r\n  ]\r\n}",
  "notice": {
    "vesselId": "V-12",
    "shipments": 4,
    "totalKg": 1125
  },
  "jsonRejects": [
    {
      "id": "H-5003",
      "reason": "mass must be positive, got -20"
    },
    {
      "id": "H-5004",
      "reason": "priority must be 1 to 3, got 7"
    }
  ],
  "jsonError": {
    "message": "The JSON value could not be converted to ArrivalNotice. Path: $.arrivesInMinutes | LineNumber: 2 | BytePositionInLine: 28.",
    "line": 3,
    "position": 29,
    "path": "$.arrivesInMinutes"
  },
  "importReport": {
    "accepted": 4,
    "rejected": 8
  },
  "acceptedIds": [
    "H-6001",
    "H-6002",
    "H-6003",
    "H-6010"
  ],
  "rejects": [
    {
      "line": 5,
      "raw": "H-6004,Fusion pellets,Fuel,Ceres Yard,V-99,1500,1",
      "reasons": [
        "vessel: unknown \"V-99\""
      ]
    },
    {
      "line": 6,
      "raw": "H-6005,Rotor shims,Machinery,Vesta Dock,V-14,abc,2",
      "reasons": [
        "mass: \"abc\" is not a whole number"
      ]
    },
    {
      "line": 7,
      "raw": "H-6002,Gyro housings,Machinery,Vesta Dock,V-14,860,2",
      "reasons": [
        "id: duplicate of an earlier row"
      ]
    },
    {
      "line": 8,
      "raw": "H-6006,Sample jars,Biohazard,Luna Gate,V-12,40,1",
      "reasons": [
        "category: unknown \"Biohazard\""
      ]
    },
    {
      "line": 9,
      "raw": "H-6007,Mail sacks,Mail,Luna Gate,V-11,80",
      "reasons": [
        "row: expected 7 fields, found 6"
      ]
    },
    {
      "line": 10,
      "raw": ",Loose cargo,Supply,Vesta Dock,V-11,300,3",
      "reasons": [
        "id: missing"
      ]
    },
    {
      "line": 11,
      "raw": "H-6008,Water filters,Pantry,Ceres Yard,V-12,-50,3",
      "reasons": [
        "category: unknown \"Pantry\"",
        "mass: must be positive, got -50"
      ]
    },
    {
      "line": 12,
      "raw": "H-6009,Greenhouse glass,Machinery,Ceres Yard,V-11,2200,4",
      "reasons": [
        "priority: must be 1 to 3, got 4"
      ]
    }
  ],
  "rejectSummary": {
    "mass": 2,
    "id": 2,
    "category": 2,
    "vessel": 1,
    "row": 1,
    "priority": 1
  },
  "portReport": {
    "shipments": 18,
    "totalKg": 18635,
    "rejected": 8,
    "busiestVessel": "Quiet Kestrel",
    "topCategory": "Fuel",
    "overloaded": [
      "Quiet Kestrel"
    ]
  },
  "reportJson": "{\"shipments\":18,\"totalKg\":18635,\"rejected\":8,\"busiestVessel\":\"Quiet Kestrel\",\"topCategory\":\"Fuel\",\"overloaded\":[\"Quiet Kestrel\"]}"
};
