import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Corvid Peak program prints (the real output of the reference solution, frozen),
 * so the hub and the landing page can show Corvid Peak Observatory without calling the code runner.
 * Regenerate with scratchpad/rust-mid/gen-demo.mjs.
 */

const STDOUT = [
  "Sirius is in Canis Major",
  "Label: Sirius (Canis Major)",
  "Offsets: Some(0) Some(7) None",
  "Brighter of the two: Arcturus",
  "Kept after the scratch note was dropped: Nova",
  "Sirius in Canis Major: mag -1.46, 9 ly",
  "Canopus in Carina: mag -0.74, 310 ly",
  "Arcturus in Bootes: mag -0.05, 37 ly",
  "Vega in Lyra: mag 0.03, 25 ly",
  "Rigel in Orion: mag 0.13, 860 ly",
  "Altair in Aquila: mag 0.76, 17 ly",
  "The name outlived its record: Sirius",
  "First name in the list: Sirius",
  "Sirius: RA 6.75 h = 101.25 degrees",
  "Sirius band: brilliant",
  "RA 25.14 h valid: false",
  "A magnitude 7.1 star is visible to the naked eye: false",
  "Bearing for Vega via super: 279.3",
  "Modules: main::rules, main::sky, main::sky::coords, main::sky::light",
  "WrongFieldCount: expected 6 fields, found 5",
  "EmptyName: the star has no name",
  "BadInt: not a whole number (invalid digit found in string)",
  "BadFloat: not a decimal number (invalid float literal)",
  "OutOfRange: declination 99.26 is out of range",
  "Duplicate: Vega is already in the catalogue",
  "BadInt(ParseIntError { kind: InvalidDigit })",
  "BadInt has a source: true",
  "EmptyName has a source: false",
  "By hand: not a whole number (invalid digit found in string)",
  "26OO -> BadInt via From: not a whole number (invalid digit found in string)",
  "two -> BadFloat via From: not a decimal number (invalid float literal)",
  "99.26 -> OutOfRange via built: declination 99.26 is out of range",
  "9 -> Ok(9)",
  "quick_check Sirius: Ok(-16.72)",
  "quick_check Deneb: invalid digit found in string",
  "quick_check Polaris: declination 99.26 is out of range",
  "quick_check Ghost: a distance of zero light years",
  "line 1: ok, Vega at 18.62 h",
  "line 2: expected 6 fields, found 5",
  "line 3: the star has no name",
  "line 4: not a whole number (invalid digit found in string)",
  "line 5: not a decimal number (invalid float literal)",
  "line 6: declination 99.26 is out of range",
  "line 7: right ascension 25.14 is out of range",
  "Brilliant stars (magnitude below 0.5): 5",
  "Inspected 6 stars, 2 within 20 light years",
  "Vega sits at 279.3 degrees",
  "Sealed title: Corvid Peak, night 1",
  "Filter brilliant: 5 stars",
  "Filter near: 2 stars",
  "Filter northern: 3 stars",
  "Pipeline: 15 lines -> 12 data -> 11 records -> 7 bright -> 3 shortlisted",
  "Shortlist: Sirius, Capella, Rigel",
  "2. Capella",
  "3. Rigel",
  "4. Procyon",
  "First two and last two: Sirius, Capella, Regulus, Alnilam",
  "Total distance 4098 ly, nearest 9 ly, farthest 2000 ly",
  "Nearest star: Sirius; faintest star: Alnilam",
  "Aquila: Altair",
  "Auriga: Capella",
  "Canis Major: Sirius, Adhara",
  "Canis Minor: Procyon",
  "Gemini: Pollux",
  "Leo: Regulus",
  "Orion: Rigel, Betelgeuse, Alnilam",
  "Taurus: Aldebaran",
  "7 bright, 4 dim",
  "Tidy batch: all 3 lines parsed",
  "Smudged batch: stopped: expected 6 fields, found 5",
  "The sweep visits 24 hours, from 0 to 23",
  "Quarter marks: [0, 6, 12, 18]",
  " 4 h: 1 star(s)",
  " 5 h: 4 star(s)",
  " 6 h: 2 star(s)",
  " 7 h: 2 star(s)",
  "10 h: 1 star(s)",
  "19 h: 1 star(s)",
  "Busiest hour: 5 h",
  "STAR       CONSTELLATION   MAG  DISTANCE",
  "Sirius     Canis Major   -1.46      9 ly",
  "Capella    Auriga         0.08     43 ly",
  "Rigel      Orion          0.13    860 ly",
  "Procyon    Canis Minor    0.34     11 ly",
  "---------- Night 41 ----------",
  "stars                       11",
  "nearest                 Sirius",
  "faintest               Alnilam",
  "total                  4098 ly",
  "Record { name: \"Sirius\", constellation: \"Canis Major\", ra_hours: 6.75, dec_deg: -16.72, magnitude: -1.46, distance_ly: 9 }",
  "NightSummary {",
  "    night: 41,",
  "    stars: 11,",
  "    nearest: \"Sirius\",",
  "    faintest: \"Alnilam\",",
  "    total_ly: 4098,",
  "}",
  "[      Altair] [Altair      ] [   Altair   ]",
  "Ranked: Sirius, Procyon, Capella, Betelgeuse, Rigel, Altair, Pollux, Aldebaran, Regulus, Adhara, Alnilam",
  "Farthest three: Alnilam, Rigel, Betelgeuse",
  "Brilliant comes before Dim: true",
  "Same star seen twice: true",
  "NightTotals { stars: 11, total_ly: 4098, nearest: Some(\"Sirius\"), brilliant: 5, notes: [] }",
  "NightTotals { stars: 0, total_ly: 0, nearest: None, brilliant: 0, notes: [] }",
  "test parses_a_good_line ... ok",
  "test a_short_line_is_rejected ... ok",
  "test an_empty_name_is_rejected ... ok",
  "test a_bad_distance_is_converted ... ok",
  "test declination_is_range_checked ... ok",
  "test bands_sort_brightest_first ... ok",
  "test result: 6 passed; 0 failed",
  "Read 26 lines: 3 comments, 2 blank, 21 candidates",
  "16 records accepted, 5 lines rejected",
  "  line 15: expected 6 fields, found 5",
  "  line 19: not a whole number (invalid digit found in string)",
  "  line 21: the star has no name",
  "  line 22: declination 99.26 is out of range",
  "  line 24: not a decimal number (invalid float literal)",
  "Self-test: 6/6 checks passed",
  "Dropped: Vega is already in the catalogue",
  "===== Corvid Peak, night 42 ======",
  "lines read                      26",
  "stars accepted                  15",
  "lines rejected                   6",
  "nearest                     Sirius",
  "faintest                   Alnitak",
  "mean distance             370.0 ly",
  "Aquila          *",
  "Auriga          *",
  "Bootes          *",
  "Canis Major     *",
  "Canis Minor     *",
  "Carina          *",
  "Gemini          *",
  "Leo             *",
  "Lyra            *",
  "Orion           ****",
  "Taurus          *",
  "Virgo           *",
  "==================================",
  "Importer finished: 15 stars, 6 problems, all checks green",
].join("\n");

const VARS: Record<string, unknown> = {
  "buffer": "Sirius|Canis Major|6.75|-16.72|-1.46|9\nCanopus|Carina|6.40|-52.70|-0.74|310\nArcturus|Bootes|14.26|19.18|-0.05|37\nVega|Lyra|18.62|38.78|0.03|25\nRigel|Orion|5.24|-8.20|0.13|860\nAltair|Aquila|19.85|8.87|0.76|17",
  "slices": [
    {
      "label": "name",
      "start": 0,
      "len": 6
    },
    {
      "label": "constellation",
      "start": 7,
      "len": 11
    }
  ],
  "copies": [
    "Sirius"
  ],
  "label": "Sirius (Canis Major)",
  "lifetimeDemo": {
    "first": "Vega",
    "second": "Arcturus",
    "winner": "Arcturus",
    "winnerStart": 76,
    "scratch": "Nova",
    "kept": "Nova"
  },
  "records": [
    {
      "name": "Sirius",
      "constellation": "Canis Major",
      "ra": 6.75,
      "dec": -16.72,
      "mag": -1.46,
      "dist": 9,
      "nameStart": 169,
      "conStart": 176
    },
    {
      "name": "Canopus",
      "constellation": "Carina",
      "ra": 6.4,
      "dec": -52.7,
      "mag": -0.74,
      "dist": 310,
      "nameStart": 208,
      "conStart": 216
    },
    {
      "name": "Arcturus",
      "constellation": "Bootes",
      "ra": 14.26,
      "dec": 19.18,
      "mag": -0.05,
      "dist": 37,
      "nameStart": 245,
      "conStart": 254
    },
    {
      "name": "Vega",
      "constellation": "Lyra",
      "ra": 18.62,
      "dec": 38.78,
      "mag": 0.03,
      "dist": 25,
      "nameStart": 282,
      "conStart": 287
    },
    {
      "name": "Capella",
      "constellation": "Auriga",
      "ra": 5.28,
      "dec": 46,
      "mag": 0.08,
      "dist": 43,
      "nameStart": 312,
      "conStart": 320
    },
    {
      "name": "Rigel",
      "constellation": "Orion",
      "ra": 5.24,
      "dec": -8.2,
      "mag": 0.13,
      "dist": 860,
      "nameStart": 348,
      "conStart": 354
    },
    {
      "name": "Procyon",
      "constellation": "Canis Minor",
      "ra": 7.65,
      "dec": 5.22,
      "mag": 0.34,
      "dist": 11,
      "nameStart": 380,
      "conStart": 388
    },
    {
      "name": "Betelgeuse",
      "constellation": "Orion",
      "ra": 5.92,
      "dec": 7.41,
      "mag": 0.42,
      "dist": 550,
      "nameStart": 418,
      "conStart": 429
    },
    {
      "name": "Altair",
      "constellation": "Aquila",
      "ra": 19.85,
      "dec": 8.87,
      "mag": 0.76,
      "dist": 17,
      "nameStart": 454,
      "conStart": 461
    },
    {
      "name": "Aldebaran",
      "constellation": "Taurus",
      "ra": 4.6,
      "dec": 16.51,
      "mag": 0.86,
      "dist": 65,
      "nameStart": 487,
      "conStart": 497
    },
    {
      "name": "Spica",
      "constellation": "Virgo",
      "ra": 13.42,
      "dec": -11.16,
      "mag": 0.97,
      "dist": 250,
      "nameStart": 594,
      "conStart": 600
    },
    {
      "name": "Pollux",
      "constellation": "Gemini",
      "ra": 7.76,
      "dec": 28.03,
      "mag": 1.14,
      "dist": 34,
      "nameStart": 629,
      "conStart": 636
    },
    {
      "name": "Regulus",
      "constellation": "Leo",
      "ra": 10.14,
      "dec": 11.97,
      "mag": 1.35,
      "dist": 79,
      "nameStart": 697,
      "conStart": 705
    },
    {
      "name": "Alnitak",
      "constellation": "Orion",
      "ra": 5.68,
      "dec": -1.94,
      "mag": 1.77,
      "dist": 1260,
      "nameStart": 796,
      "conStart": 804
    },
    {
      "name": "Alnilam",
      "constellation": "Orion",
      "ra": 5.6,
      "dec": -1.2,
      "mag": 1.69,
      "dist": 2000,
      "nameStart": 867,
      "conStart": 875
    }
  ],
  "modules": [
    "main::rules",
    "main::sky",
    "main::sky::coords",
    "main::sky::light"
  ],
  "moduleChecks": [
    "rules::ra_ok(25.14) = false",
    "sky::light::band(-1.46) = brilliant",
    "sky::light::naked_eye(7.1) = false",
    "sky::light::bearing_for(18.62) = 279.3"
  ],
  "errorSamples": [
    {
      "kind": "WrongFieldCount",
      "message": "expected 6 fields, found 5",
      "debug": "WrongFieldCount { found: 5 }",
      "hasSource": false
    },
    {
      "kind": "EmptyName",
      "message": "the star has no name",
      "debug": "EmptyName",
      "hasSource": false
    },
    {
      "kind": "BadInt",
      "message": "not a whole number (invalid digit found in string)",
      "debug": "BadInt(ParseIntError { kind: InvalidDigit })",
      "hasSource": true
    },
    {
      "kind": "BadFloat",
      "message": "not a decimal number (invalid float literal)",
      "debug": "BadFloat(ParseFloatError { kind: Invalid })",
      "hasSource": true
    },
    {
      "kind": "OutOfRange",
      "message": "declination 99.26 is out of range",
      "debug": "OutOfRange { field: \"declination\", value: 99.26 }",
      "hasSource": false
    },
    {
      "kind": "Duplicate",
      "message": "Vega is already in the catalogue",
      "debug": "Duplicate { name: \"Vega\" }",
      "hasSource": false
    }
  ],
  "funnel": [
    {
      "input": "26OO",
      "variant": "BadInt",
      "via": "From",
      "message": "not a whole number (invalid digit found in string)"
    },
    {
      "input": "two",
      "variant": "BadFloat",
      "via": "From",
      "message": "not a decimal number (invalid float literal)"
    },
    {
      "input": "99.26",
      "variant": "OutOfRange",
      "via": "built",
      "message": "declination 99.26 is out of range"
    },
    {
      "input": "9",
      "variant": "Ok",
      "via": "none",
      "message": "accepted 9"
    }
  ],
  "quickChecks": [
    {
      "label": "Sirius",
      "ok": true,
      "text": "declination -16.72"
    },
    {
      "label": "Deneb",
      "ok": false,
      "text": "invalid digit found in string"
    },
    {
      "label": "Polaris",
      "ok": false,
      "text": "declination 99.26 is out of range"
    },
    {
      "label": "Ghost",
      "ok": false,
      "text": "a distance of zero light years"
    }
  ],
  "lineResults": [
    {
      "line": 1,
      "text": "Vega|Lyra|18.62|38.78|0.03|25",
      "ok": true,
      "error": null
    },
    {
      "line": 2,
      "text": "Pollux|Gemini|7.76|28.03|1.14",
      "ok": false,
      "error": "line 2: expected 6 fields, found 5"
    },
    {
      "line": 3,
      "text": "|Orion|5.60|-1.20|1.69|2000",
      "ok": false,
      "error": "line 3: the star has no name"
    },
    {
      "line": 4,
      "text": "Deneb|Cygnus|20.69|45.28|1.25|26OO",
      "ok": false,
      "error": "line 4: not a whole number (invalid digit found in string)"
    },
    {
      "line": 5,
      "text": "Mizar|Ursa Major|13.40|54.93|two|83",
      "ok": false,
      "error": "line 5: not a decimal number (invalid float literal)"
    },
    {
      "line": 6,
      "text": "Polaris|Ursa Minor|2.53|99.26|1.98|430",
      "ok": false,
      "error": "line 6: declination 99.26 is out of range"
    },
    {
      "line": 7,
      "text": "Regulus|Leo|25.14|11.97|1.35|79",
      "ok": false,
      "error": "line 7: right ascension 25.14 is out of range"
    }
  ],
  "closures": [
    {
      "name": "is_brilliant",
      "kind": "Fn",
      "captures": "cutoff by reference",
      "result": "5 stars"
    },
    {
      "name": "inspect",
      "kind": "FnMut",
      "captures": "inspected and near_count by mutable reference",
      "result": "6 inspected, 2 near"
    },
    {
      "name": "to_degrees",
      "kind": "Fn",
      "captures": "factor moved into a Box",
      "result": "279.3"
    },
    {
      "name": "seal",
      "kind": "FnOnce",
      "captures": "report_title moved out",
      "result": "Corvid Peak, night 1"
    }
  ],
  "rack": [
    {
      "filter": "brilliant",
      "matches": 5
    },
    {
      "filter": "near",
      "matches": 2
    },
    {
      "filter": "northern",
      "matches": 3
    }
  ],
  "chain": [
    {
      "stage": "lines()",
      "count": 15
    },
    {
      "stage": "filter: data lines",
      "count": 12
    },
    {
      "stage": "filter_map: parse",
      "count": 11
    },
    {
      "stage": "filter: magnitude < 1.0",
      "count": 7
    },
    {
      "stage": "take(3)",
      "count": 3
    }
  ],
  "shortlist": [
    "Sirius",
    "Capella",
    "Rigel"
  ],
  "totalLy": 4098,
  "nearest": "Sirius",
  "faintest": "Alnilam",
  "byConstellation": {
    "Aquila": [
      "Altair"
    ],
    "Auriga": [
      "Capella"
    ],
    "Canis Major": [
      "Sirius",
      "Adhara"
    ],
    "Canis Minor": [
      "Procyon"
    ],
    "Gemini": [
      "Pollux"
    ],
    "Leo": [
      "Regulus"
    ],
    "Orion": [
      "Rigel",
      "Betelgeuse",
      "Alnilam"
    ],
    "Taurus": [
      "Aldebaran"
    ]
  },
  "brightNames": [
    "Sirius",
    "Capella",
    "Rigel",
    "Procyon",
    "Betelgeuse",
    "Altair",
    "Aldebaran"
  ],
  "dimNames": [
    "Adhara",
    "Pollux",
    "Alnilam",
    "Regulus"
  ],
  "allOrNothing": {
    "tidy": "all 3 lines parsed",
    "smudged": "stopped: expected 6 fields, found 5"
  },
  "sweepHours": [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23
  ],
  "hourStars": [
    {
      "hour": 4,
      "stars": 1
    },
    {
      "hour": 5,
      "stars": 4
    },
    {
      "hour": 6,
      "stars": 2
    },
    {
      "hour": 7,
      "stars": 2
    },
    {
      "hour": 10,
      "stars": 1
    },
    {
      "hour": 19,
      "stars": 1
    }
  ],
  "rows": [
    "Sirius     Canis Major   -1.46      9 ly",
    "Capella    Auriga         0.08     43 ly",
    "Rigel      Orion          0.13    860 ly",
    "Procyon    Canis Minor    0.34     11 ly",
    "Betelgeuse Orion          0.42    550 ly",
    "Altair     Aquila         0.76     17 ly",
    "Aldebaran  Taurus         0.86     65 ly",
    "Adhara     Canis Major    1.50    430 ly",
    "Pollux     Gemini         1.14     34 ly",
    "Alnilam    Orion          1.69   2000 ly",
    "Regulus    Leo            1.35     79 ly"
  ],
  "summaryCard": "---------- Night 41 ----------\nstars                       11\nnearest                 Sirius\nfaintest               Alnilam\ntotal                  4098 ly",
  "debugLine": "Record { name: \"Sirius\", constellation: \"Canis Major\", ra_hours: 6.75, dec_deg: -16.72, magnitude: -1.46, distance_ly: 9 }",
  "ranking": [
    {
      "rank": 1,
      "name": "Sirius",
      "band": "Brilliant",
      "mag": -1.46,
      "dist": 9
    },
    {
      "rank": 2,
      "name": "Procyon",
      "band": "Brilliant",
      "mag": 0.34,
      "dist": 11
    },
    {
      "rank": 3,
      "name": "Capella",
      "band": "Brilliant",
      "mag": 0.08,
      "dist": 43
    },
    {
      "rank": 4,
      "name": "Betelgeuse",
      "band": "Brilliant",
      "mag": 0.42,
      "dist": 550
    },
    {
      "rank": 5,
      "name": "Rigel",
      "band": "Brilliant",
      "mag": 0.13,
      "dist": 860
    },
    {
      "rank": 6,
      "name": "Altair",
      "band": "Bright",
      "mag": 0.76,
      "dist": 17
    },
    {
      "rank": 7,
      "name": "Pollux",
      "band": "Bright",
      "mag": 1.14,
      "dist": 34
    },
    {
      "rank": 8,
      "name": "Aldebaran",
      "band": "Bright",
      "mag": 0.86,
      "dist": 65
    },
    {
      "rank": 9,
      "name": "Regulus",
      "band": "Bright",
      "mag": 1.35,
      "dist": 79
    },
    {
      "rank": 10,
      "name": "Adhara",
      "band": "Dim",
      "mag": 1.5,
      "dist": 430
    },
    {
      "rank": 11,
      "name": "Alnilam",
      "band": "Dim",
      "mag": 1.69,
      "dist": 2000
    }
  ],
  "farthest": [
    "Alnilam",
    "Rigel",
    "Betelgeuse"
  ],
  "totals": {
    "stars": 11,
    "totalLy": 4098,
    "nearest": "Sirius",
    "brilliant": 5,
    "notes": 0
  },
  "tests": [
    {
      "name": "parses_a_good_line",
      "ok": true,
      "message": ""
    },
    {
      "name": "a_short_line_is_rejected",
      "ok": true,
      "message": ""
    },
    {
      "name": "an_empty_name_is_rejected",
      "ok": true,
      "message": ""
    },
    {
      "name": "a_bad_distance_is_converted",
      "ok": true,
      "message": ""
    },
    {
      "name": "declination_is_range_checked",
      "ok": true,
      "message": ""
    },
    {
      "name": "bands_sort_brightest_first",
      "ok": true,
      "message": ""
    }
  ],
  "testSummary": {
    "passed": 6,
    "failed": 0
  },
  "fileLines": [
    {
      "n": 1,
      "kind": "comment",
      "text": "# Corvid Peak Observatory: night log, copied from the observers' notebooks"
    },
    {
      "n": 2,
      "kind": "comment",
      "text": "# name | constellation | right ascension (h) | declination (deg) | magnitude | distance (ly)"
    },
    {
      "n": 3,
      "kind": "blank",
      "text": ""
    },
    {
      "n": 4,
      "kind": "record",
      "text": "Sirius|Canis Major|6.75|-16.72|-1.46|9"
    },
    {
      "n": 5,
      "kind": "record",
      "text": "Canopus|Carina|6.40|-52.70|-0.74|310"
    },
    {
      "n": 6,
      "kind": "record",
      "text": "Arcturus|Bootes|14.26|19.18|-0.05|37"
    },
    {
      "n": 7,
      "kind": "record",
      "text": "Vega|Lyra|18.62|38.78|0.03|25"
    },
    {
      "n": 8,
      "kind": "record",
      "text": "Capella|Auriga|5.28|46.00|0.08|43"
    },
    {
      "n": 9,
      "kind": "record",
      "text": "  Rigel|Orion|5.24|-8.20|0.13|860"
    },
    {
      "n": 10,
      "kind": "record",
      "text": "Procyon|Canis Minor|7.65|5.22|0.34|11"
    },
    {
      "n": 11,
      "kind": "record",
      "text": "Betelgeuse|Orion|5.92|7.41|0.42|550"
    },
    {
      "n": 12,
      "kind": "record",
      "text": "Altair|Aquila|19.85|8.87|0.76|17"
    },
    {
      "n": 13,
      "kind": "record",
      "text": "Aldebaran|Taurus|4.60|16.51|0.86|65"
    },
    {
      "n": 14,
      "kind": "comment",
      "text": "# the next line was smudged by rain"
    },
    {
      "n": 15,
      "kind": "error",
      "text": "Antares|Scorpius|16.49|-26.43|1.06"
    },
    {
      "n": 16,
      "kind": "record",
      "text": "Spica|Virgo|13.42|-11.16|0.97|250"
    },
    {
      "n": 17,
      "kind": "blank",
      "text": ""
    },
    {
      "n": 18,
      "kind": "record",
      "text": "Pollux|Gemini|7.76|28.03|1.14|34"
    },
    {
      "n": 19,
      "kind": "error",
      "text": "Deneb|Cygnus|20.69|45.28|1.25|26OO"
    },
    {
      "n": 20,
      "kind": "record",
      "text": "Regulus|Leo|10.14|11.97|1.35|79"
    },
    {
      "n": 21,
      "kind": "error",
      "text": "|Orion|5.53|-0.30|2.23|1200"
    },
    {
      "n": 22,
      "kind": "error",
      "text": "Polaris|Ursa Minor|2.53|99.26|1.98|430"
    },
    {
      "n": 23,
      "kind": "record",
      "text": "Alnitak|Orion|5.68|-1.94|1.77|1260"
    },
    {
      "n": 24,
      "kind": "error",
      "text": "Mizar|Ursa Major|13.40|54.93|two|83"
    },
    {
      "n": 25,
      "kind": "record",
      "text": "Alnilam|Orion|5.60|-1.20|1.69|2000"
    },
    {
      "n": 26,
      "kind": "record",
      "text": "Vega|Lyra|18.62|38.78|0.03|25"
    }
  ],
  "intake": {
    "read": 26,
    "comments": 3,
    "blanks": 2,
    "accepted": 16,
    "rejected": 5
  },
  "problems": [
    "line 15: expected 6 fields, found 5",
    "line 19: not a whole number (invalid digit found in string)",
    "line 21: the star has no name",
    "line 22: declination 99.26 is out of range",
    "line 24: not a decimal number (invalid float literal)",
    "Vega is already in the catalogue"
  ],
  "fileText": "# Corvid Peak Observatory: night log, copied from the observers' notebooks\n# name | constellation | right ascension (h) | declination (deg) | magnitude | distance (ly)\n\nSirius|Canis Major|6.75|-16.72|-1.46|9\nCanopus|Carina|6.40|-52.70|-0.74|310\nArcturus|Bootes|14.26|19.18|-0.05|37\nVega|Lyra|18.62|38.78|0.03|25\nCapella|Auriga|5.28|46.00|0.08|43\n  Rigel|Orion|5.24|-8.20|0.13|860\nProcyon|Canis Minor|7.65|5.22|0.34|11\nBetelgeuse|Orion|5.92|7.41|0.42|550\nAltair|Aquila|19.85|8.87|0.76|17\nAldebaran|Taurus|4.60|16.51|0.86|65\n# the next line was smudged by rain\nAntares|Scorpius|16.49|-26.43|1.06\nSpica|Virgo|13.42|-11.16|0.97|250\n\nPollux|Gemini|7.76|28.03|1.14|34\nDeneb|Cygnus|20.69|45.28|1.25|26OO\nRegulus|Leo|10.14|11.97|1.35|79\n|Orion|5.53|-0.30|2.23|1200\nPolaris|Ursa Minor|2.53|99.26|1.98|430\nAlnitak|Orion|5.68|-1.94|1.77|1260\nMizar|Ursa Major|13.40|54.93|two|83\nAlnilam|Orion|5.60|-1.20|1.69|2000\nVega|Lyra|18.62|38.78|0.03|25\n",
  "report": {
    "night": 42,
    "read": 26,
    "accepted": 15,
    "rejected": 6,
    "nearest": "Sirius",
    "faintest": "Alnitak",
    "meanLy": 370,
    "constellations": {
      "Aquila": 1,
      "Auriga": 1,
      "Bootes": 1,
      "Canis Major": 1,
      "Canis Minor": 1,
      "Carina": 1,
      "Gemini": 1,
      "Leo": 1,
      "Lyra": 1,
      "Orion": 4,
      "Taurus": 1,
      "Virgo": 1
    }
  }
};

export function rustInventoryDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
