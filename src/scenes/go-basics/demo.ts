import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Gopher Post program prints (the real output of the reference solution,
 * frozen), so the landing page can show the sorting floor without calling the code runner.
 */

const STDOUT = "Gopher Post Central Hub\nBelts online: 4\nParcels today: 42\nNorth   |   12|  87.5%\n\"ready\" is a string\nGopher Post Central Hub | shift 1 | belt 1.5 m/s | open: true\nzero values: 0 \"\" false\nregions: Region(4) | West is West\nstring int float64 bool\n8 vans, last one carries 5 parcels\nAverage 3.32 kg, fee $20.00\n7 / 2 = 3 | 7.0 / 2 = 3.5 | -7 / 2 = -3\n0.30000000000000004 -128\nlabel: PK-1001 | north | 2400 g\n\"24kg\" -> strconv.Atoi: parsing \"24kg\": invalid syntax\nPK-1001 -> chute A, Standard, by hand\nBelt starts in 3\nBelt starts in 2\nBelt starts in 1\nBelt running\nchecking chute North\nchecking chute South\nchecking chute East\nchecking chute West\nprocessed 13 lines, 2 unreadable, 70060 g in total\n13 11 11 16 Z A -1 19500 4 11 4 6\neast   3 parcels, 37300 g\nnorth  3 parcels, 10350 g\nsouth  2 parcels, 1360 g\nwest   2 parcels, 20750 g\nmap[east:3 north:3 south:2 west:2] 0 false\nPK-2001 2400 true false\n11 parcels, 70.06 kg, heaviest 31000 g\nREJECT: PK-2006: \"moon\": no chute for that region\nREJECT: PK-2007: 31000 g, parcel is over the weight limit\nREJECT: PK-2008: weight is not a whole number (strconv.Atoi: parsing \"abc\": invalid syntax)\nREJECT: PK-2013: row is not 'id region grams'\n{Name:Van 1 Region:north Limit:20000 Loaded:10350 Parcels:[PK-2001 PK-2005 PK-2010]}\nNorth West <East> PK-2001 (north, 2400 g)\nSouth 1 South\n[PK-2004 PK-2010 PK-2003 PK-2001 PK-2012 PK-2009 PK-2002 PK-2005 PK-2011] [PK-2003 PK-2012 PK-2010 PK-2001 PK-2005 PK-2002 PK-2011 PK-2004 PK-2009] [SLOT-01 SLOT-02 SLOT-03] [PK-2003 PK-2004 PK-2010]\n[closing doors locked lamps off belts stopped]\n[recovered: mustRegion: unknown region moon recovered: runtime error: invalid memory address or nil pointer dereference recovered: runtime error: index out of range [99] with length 13]\n{\n  \"hub\": \"Gopher Post Central Hub\",\n  \"shift\": 1,\n  \"entries\": [\n    {\n      \"id\": \"PK-2001\",\n      \"chute\": \"A\",\n      \"lane\": \"standard\",\n      \"kg\": 2.4\n    },\n    {\n      \"id\": \"PK-2002\",\n      \"chute\": \"B\",\n      \"lane\": \"express\",\n      \"kg\": 0.8\n    },\n    {\n      \"id\": \"PK-2003\",\n      \"chute\": \"C\",\n      \"lane\": \"standard\",\n      \"kg\": 4.1\n    },\n    {\n      \"id\": \"PK-2004\",\n      \"chute\": \"D\",\n      \"lane\": \"freight\",\n      \"kg\": 19.5\n    },\n    {\n      \"id\": \"PK-2005\",\n      \"chute\": \"A\",\n      \"lane\": \"express\",\n      \"kg\": 0.65\n    },\n    {\n      \"id\": \"PK-2009\",\n      \"chute\": \"D\",\n      \"lane\": \"standard\",\n      \"kg\": 1.25\n    },\n    {\n      \"id\": \"PK-2010\",\n      \"chute\": \"A\",\n      \"lane\": \"standard\",\n      \"kg\": 7.3\n    },\n    {\n      \"id\": \"PK-2011\",\n      \"chute\": \"B\",\n      \"lane\": \"express\",\n      \"kg\": 0.56\n    },\n    {\n      \"id\": \"PK-2012\",\n      \"chute\": \"C\",\n      \"lane\": \"standard\",\n      \"kg\": 2.2\n    }\n  ],\n  \"overflow\": [\n    \"PK-2009\"\n  ],\n  \"rejected\": 4\n}\n{\"id\":\"PK-2001\",\"chute\":\"A\",\"lane\":\"standard\",\"kg\":2.4} true invalid character 'o' looking for beginning of object key string\n===== Shift 1 report: Gopher Post Central Hub =====\nSorted     8\nRejected   4\nOverflow   1\nRevenue    $41.70\nHeaviest   PK-2004\nChute A    3\nChute B    2\nChute C    2\nChute D    1\nevery manifest line accounted for: true";

const VARS: Record<string, unknown> = {
  "hubName": "Gopher Post Central Hub",
  "shift": 1,
  "beltSpeed": 1.5,
  "open": true,
  "maxGrams": 25000,
  "regionCount": 4,
  "regionCodes": {
    "East": 2,
    "North": 0,
    "South": 1,
    "West": 3
  },
  "processed": 13,
  "rejected": 4,
  "note": "",
  "jammed": false,
  "kinds": {
    "beltSpeed": "float64",
    "hubName": "string",
    "open": "bool",
    "shift": "int"
  },
  "bayParcels": 47,
  "vanSize": 6,
  "vansNeeded": 8,
  "lastLoad": 5,
  "avgKg": 3.32,
  "feeCents": 2000,
  "feeText": "$20.00",
  "tiny": -128,
  "floatSum": 0.30000000000000004,
  "parcelID": "PK-1001",
  "region": "north",
  "grams": 2400,
  "badText": "24kg",
  "badError": "strconv.Atoi: parsing \"24kg\": invalid syntax",
  "handling": "by hand",
  "class": "Standard",
  "chute": "A",
  "lane": "mainline",
  "accepted": true,
  "unreadable": 2,
  "totalGrams": 70060,
  "heaviest": 31000,
  "digits": 4,
  "rampSteps": 3,
  "rows": 13,
  "queue": [
    "PK-2001",
    "PK-2002",
    "PK-2003",
    "PK-2004",
    "PK-2005",
    "PK-2006",
    "PK-2007",
    "PK-2009",
    "PK-2010",
    "PK-2011",
    "PK-2012"
  ],
  "weights": [
    2400,
    800,
    4100,
    19500,
    650,
    300,
    31000,
    1250,
    7300,
    560,
    2200
  ],
  "capSteps": [
    1,
    2,
    4,
    4,
    8,
    8,
    8,
    8,
    16,
    16,
    16
  ],
  "chuteLabels": [
    "A",
    "B",
    "C",
    "D"
  ],
  "backupFirst": "Z",
  "leaked": -1,
  "untouched": 19500,
  "tally": {
    "east": 3,
    "north": 3,
    "south": 2,
    "west": 2
  },
  "gramsBy": {
    "east": 37300,
    "north": 10350,
    "south": 1360,
    "west": 20750
  },
  "unknown": {
    "moon": 1
  },
  "sortedNames": [
    "east",
    "north",
    "south",
    "west"
  ],
  "missing": 0,
  "known": false,
  "classCounts": {
    "Envelope": 1,
    "Freight": 1,
    "Overweight": 1,
    "Small": 4,
    "Standard": 4
  },
  "batchCount": 11,
  "batchTotal": 70060,
  "batchHeaviest": 31000,
  "batchKg": 70.06,
  "firstOK": true,
  "badOK": false,
  "rejects": [
    {
      "id": "PK-2006",
      "message": "PK-2006: \"moon\": no chute for that region",
      "reason": "unknown-region"
    },
    {
      "id": "PK-2007",
      "message": "PK-2007: 31000 g, parcel is over the weight limit",
      "reason": "overweight"
    },
    {
      "id": "PK-2008",
      "message": "PK-2008: weight is not a whole number (strconv.Atoi: parsing \"abc\": invalid syntax)",
      "reason": "bad-weight"
    },
    {
      "id": "PK-2013",
      "message": "PK-2013: row is not 'id region grams'",
      "reason": "malformed"
    }
  ],
  "reasons": {
    "bad-weight": 1,
    "malformed": 1,
    "overweight": 1,
    "unknown-region": 1
  },
  "passed": 9,
  "sameDirect": false,
  "sameIs": true,
  "parcels": [
    {
      "ID": "PK-2001",
      "Region": "north",
      "Grams": 2400
    },
    {
      "ID": "PK-2002",
      "Region": "south",
      "Grams": 800
    },
    {
      "ID": "PK-2003",
      "Region": "east",
      "Grams": 4100
    },
    {
      "ID": "PK-2004",
      "Region": "west",
      "Grams": 19500
    },
    {
      "ID": "PK-2005",
      "Region": "north",
      "Grams": 650
    },
    {
      "ID": "PK-2009",
      "Region": "west",
      "Grams": 1250
    },
    {
      "ID": "PK-2010",
      "Region": "north",
      "Grams": 7300
    },
    {
      "ID": "PK-2011",
      "Region": "south",
      "Grams": 560
    },
    {
      "ID": "PK-2012",
      "Region": "east",
      "Grams": 2200
    }
  ],
  "vans": [
    {
      "Name": "Van 1",
      "Region": "north",
      "Limit": 20000,
      "Loaded": 10350,
      "Parcels": [
        "PK-2001",
        "PK-2005",
        "PK-2010"
      ]
    },
    {
      "Name": "Van 2",
      "Region": "south",
      "Limit": 20000,
      "Loaded": 1360,
      "Parcels": [
        "PK-2002",
        "PK-2011"
      ]
    },
    {
      "Name": "Van 3",
      "Region": "east",
      "Limit": 20000,
      "Loaded": 6300,
      "Parcels": [
        "PK-2003",
        "PK-2012"
      ]
    },
    {
      "Name": "Van 4",
      "Region": "west",
      "Limit": 20000,
      "Loaded": 19500,
      "Parcels": [
        "PK-2004"
      ]
    }
  ],
  "overflow": [
    "PK-2009"
  ],
  "trialLoaded": 0,
  "trialLoadedPtr": 2400,
  "routes": [
    {
      "chute": "A",
      "id": "PK-2001",
      "lane": "standard"
    },
    {
      "chute": "B",
      "id": "PK-2002",
      "lane": "express"
    },
    {
      "chute": "C",
      "id": "PK-2003",
      "lane": "standard"
    },
    {
      "chute": "D",
      "id": "PK-2004",
      "lane": "freight"
    },
    {
      "chute": "A",
      "id": "PK-2005",
      "lane": "express"
    },
    {
      "chute": "D",
      "id": "PK-2009",
      "lane": "standard"
    },
    {
      "chute": "A",
      "id": "PK-2010",
      "lane": "standard"
    },
    {
      "chute": "B",
      "id": "PK-2011",
      "lane": "express"
    },
    {
      "chute": "C",
      "id": "PK-2012",
      "lane": "standard"
    }
  ],
  "regionNames": [
    "North",
    "South",
    "East",
    "West"
  ],
  "byWeight": [
    "PK-2004",
    "PK-2010",
    "PK-2003",
    "PK-2001",
    "PK-2012",
    "PK-2009",
    "PK-2002",
    "PK-2005",
    "PK-2011"
  ],
  "byRegion": [
    "PK-2003",
    "PK-2012",
    "PK-2010",
    "PK-2001",
    "PK-2005",
    "PK-2002",
    "PK-2011",
    "PK-2004",
    "PK-2009"
  ],
  "tags": [
    "SLOT-01",
    "SLOT-02",
    "SLOT-03"
  ],
  "bigIDs": [
    "PK-2003",
    "PK-2004",
    "PK-2010"
  ],
  "closeSteps": [
    "closing",
    "doors locked",
    "lamps off",
    "belts stopped"
  ],
  "caught": [
    "recovered: mustRegion: unknown region moon",
    "recovered: runtime error: invalid memory address or nil pointer dereference",
    "recovered: runtime error: index out of range [99] with length 13"
  ],
  "manifest": {
    "hub": "Gopher Post Central Hub",
    "shift": 1,
    "entries": [
      {
        "id": "PK-2001",
        "chute": "A",
        "lane": "standard",
        "kg": 2.4
      },
      {
        "id": "PK-2002",
        "chute": "B",
        "lane": "express",
        "kg": 0.8
      },
      {
        "id": "PK-2003",
        "chute": "C",
        "lane": "standard",
        "kg": 4.1
      },
      {
        "id": "PK-2004",
        "chute": "D",
        "lane": "freight",
        "kg": 19.5
      },
      {
        "id": "PK-2005",
        "chute": "A",
        "lane": "express",
        "kg": 0.65
      },
      {
        "id": "PK-2009",
        "chute": "D",
        "lane": "standard",
        "kg": 1.25
      },
      {
        "id": "PK-2010",
        "chute": "A",
        "lane": "standard",
        "kg": 7.3
      },
      {
        "id": "PK-2011",
        "chute": "B",
        "lane": "express",
        "kg": 0.56
      },
      {
        "id": "PK-2012",
        "chute": "C",
        "lane": "standard",
        "kg": 2.2
      }
    ],
    "overflow": [
      "PK-2009"
    ],
    "rejected": 4
  },
  "jsonBytes": 1005,
  "roundTrip": true,
  "compact": "{\"id\":\"PK-2001\",\"chute\":\"A\",\"lane\":\"standard\",\"kg\":2.4}",
  "report": {
    "hub": "Gopher Post Central Hub",
    "shift": 1,
    "sorted": 8,
    "rejected": 4,
    "overflow": 1,
    "revenue": "$41.70",
    "heaviest": "PK-2004",
    "perChute": {
      "A": 3,
      "B": 2,
      "C": 2,
      "D": 1
    },
    "reasons": {
      "bad-weight": 1,
      "malformed": 1,
      "overweight": 1,
      "unknown-region": 1
    }
  },
  "balanced": true
};

export function goBasicsDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
