import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Cairn Depot program prints (the real output of the reference solution,
 * frozen), so the landing page can show the ledger board without calling the code runner.
 */

const STDOUT = "Cairn Depot opens with 8 stock lines\ntaken: 3 short: 5\nafter the copy loop, rope stock is still 10\nrunning low: [ROP-0518 RAD-0031 SPL-0044]\nline 3 refused: not enough stock: RAD-0031 has 5, asked for 8\nretired so far: 2\n[receiver issuer retirer(3) none] [adds to a bin (no note) retired 3 so far (no note)]\n<nil> true | *main.Retirer false\n[ROP-0412 Dynamic rope 60 m (60 m, 2 falls) RAD-0031 Handheld radio ROP-0412 Dynamic rope 60 m]\naudited calls: 4 failed: 1 has Note: false\nSKU       ITEM                QTY  BIN\nROP-0412  Dynamic rope 60 m   6    A1-03\nROP-0518  Static line 100 m   3    A1-04\nHAR-0210  Rescue harness M    9    B2-01\nHEL-0107  Climbing helmet     14   B2-05\nRAD-0031  Handheld radio      5    C1-02\nBAT-0880  Radio battery pack  22   C1-04\nSPL-0044  Vacuum splint       4    D3-07\nBLK-0150  Foil blanket        40   D3-09\n%v   Item      RAD-0031 x5 @C1-02\n%+v  Item      RAD-0031 x5 @C1-02\n%#v  Item      main.Item{SKU:\"RAD-0031\", Name:\"Handheld radio\", Qty:5, Bin:\"C1-02\"}\n%T   Item      main.Item\n%q   Item      \"RAD-0031 x5 @C1-02\"\n%v   Movement  {6 ISSUE RAD-0031 6 }\n%+v  Movement  {Line:6 Kind:ISSUE SKU:RAD-0031 Qty:6 Bin:}\n%v   *Retirer  Retirer(2 retired)\n%v   Retirer   {2}\n%v   Rope      ROP-0412 x8 @A1-03\nrefused: line 2: ISSUE RAD-0031: not enough stock: RAD-0031 has 3, asked for 6\nrefused: line 3: lookup \"ZZZ-9999\": unknown SKU\nrefused: line 4: \"LOAN\": unknown movement kind\nrefused: line 7: ISSUE SPL-0044: not enough stock: SPL-0044 has 4, asked for 9\nline 1: RAD-0031: asked for 9, only 5 on the shelf\nline 2: HEL-0107: asked for 20, only 14 on the shelf\nline 4: handler panicked: runtime error: index out of range [5] with length 3\nstill running after the panic\nby quantity: [BLK-0150 BAT-0880 HEL-0107 HAR-0210 RAD-0031 ROP-0412 SPL-0044 ROP-0518]\n[ROP-0412 ROP-0518 HAR-0210 HEL-0107 RAD-0031 BAT-0880 SPL-0044 BLK-0150] 103 [ROP-0518 RAD-0031 SPL-0044] BLK-0150\n[]string int main.Metres float64\n[ROP-0412 ROP-0518 HAR-0210 HEL-0107 RAD-0031 BAT-0880 SPL-0044 BLK-0150] [3 2 1]\nrecord 1 failed: json: cannot unmarshal string into Go struct field rawItem.qty of type int\nrecord 4 failed: json: unknown field \"colour\"\nrecord 5 failed: json: cannot unmarshal number 2.5 into Go struct field rawItem.qty of type int\n{\"sku\":\"HEL-0107\",\"name\":\"Climbing helmet\",\"qty\":null}\nrecord 1:\nname: is required\nqty: must not be negative\nrecord 2:\nqty: is missing\nbin: is required\nrecord 3:\nsku: is required\n[ROP-0412 HAR-0210-B BAT-0880]\nMoved <SKU> and <SKU> to B2-04, then <SKU> to C1-04 (ask Sam).\nline 10: bad SKU: \"rop-0412\" (in \"ISSUE rop-0412 1\")\nline 11: bad movement kind: \"LOAN\" (in \"LOAN HAR-0210 1\")\nline 12: bad quantity: \"x\" is not a whole number (in \"ISSUE SPL-0044 x\")\nline 13: bad quantity: -5 must be positive (in \"RECEIVE BLK-0150 -5\")\nline 14: wrong number of fields: want KIND SKU QTY [BIN], got 2 (in \"ISSUE ROP-0518\")\nline 17: bad bin code: \"E1-01\" (in \"RECEIVE BLK-0150 20 E1-01\")\n19 lines, 11 movements, 6 rejected\n10 SKU cases and 8 bin cases are ready\n--- PASS: ParseSKU/plain\n--- PASS: ParseSKU/with_revision\n--- PASS: ParseSKU/lowercase\n--- PASS: ParseSKU/three_digits\n--- PASS: ParseSKU/four_letters\n--- PASS: ParseSKU/lowercase_revision\n--- PASS: ParseSKU/no_dash\n--- PASS: ParseSKU/leading_space\n--- PASS: ParseSKU/trailing_junk\n--- PASS: ParseSKU/empty\n--- PASS: ParseBin/plain\n--- PASS: ParseBin/last_aisle\n--- PASS: ParseBin/aisle_too_high\n--- PASS: ParseBin/shelf_zero\n--- PASS: ParseBin/shelf_too_high\n--- PASS: ParseBin/short_slot\n--- PASS: ParseBin/trailing_junk\n--- PASS: ParseBin/lowercase\n--- PASS: looseSKU/plain\n--- PASS: looseSKU/with_revision\n--- PASS: looseSKU/lowercase\n--- PASS: looseSKU/three_digits\n--- FAIL: looseSKU/four_letters (looseSKU(\"ROPE-0412\") = true, want false)\n--- FAIL: looseSKU/lowercase_revision (looseSKU(\"ROP-0412-b\") = true, want false)\n--- PASS: looseSKU/no_dash\n--- FAIL: looseSKU/leading_space (looseSKU(\" ROP-0412\") = true, want false)\n--- FAIL: looseSKU/trailing_junk (looseSKU(\"ROP-0412!\") = true, want false)\n--- PASS: looseSKU/empty\n4 of 28 cases failed\nopening stock: 8 lines, 0 problems; log: 11 movements, 6 unreadable lines\nSKU       ITEM                QTY  BIN\nROP-0412  Dynamic rope 60 m   10   A1-03\nROP-0518  Static line 100 m   2    A1-04\nHAR-0210  Rescue harness M    8    B2-09\nHEL-0107  Climbing helmet     12   B2-05\nRAD-0031  Handheld radio      3    C1-02\nBAT-0880  Radio battery pack  20   C1-04\nSPL-0044  Vacuum splint       0    D3-07\nBLK-0150  Foil blanket        40   D3-09\nOpening    103\nReceived   +14\nReturned    +2\nIssued     -21\nRetired     -3\nClosing     95\nBalanced: yes\n--- PASS: reconcile/balanced\n--- PASS: reconcile/one_unit_lost\n--- PASS: reconcile/nothing_moved\n--- PASS: reconcile/only_issues\n--- PASS: applyMovement/receive\n--- PASS: applyMovement/issue\n--- PASS: applyMovement/issue_too_many\n--- PASS: applyMovement/unknown_sku\n--- PASS: applyMovement/unknown_kind\n--- PASS: parseMovement/good_line\n--- PASS: parseMovement/bad_sku\n--- PASS: parseMovement/too_few_fields\n--- PASS: parseMovement/negative_quantity\nRelease gate: PASS";

const VARS: Record<string, unknown> = {
  "shelves": [
    {
      "SKU": "ROP-0412",
      "Name": "Dynamic rope 60 m",
      "Qty": 10,
      "Bin": "A1-03"
    },
    {
      "SKU": "ROP-0518",
      "Name": "Static line 100 m",
      "Qty": 2,
      "Bin": "A1-04"
    },
    {
      "SKU": "HAR-0210",
      "Name": "Rescue harness M",
      "Qty": 8,
      "Bin": "B2-09"
    },
    {
      "SKU": "HEL-0107",
      "Name": "Climbing helmet",
      "Qty": 12,
      "Bin": "B2-05"
    },
    {
      "SKU": "RAD-0031",
      "Name": "Handheld radio",
      "Qty": 3,
      "Bin": "C1-02"
    },
    {
      "SKU": "BAT-0880",
      "Name": "Radio battery pack",
      "Qty": 20,
      "Bin": "C1-04"
    },
    {
      "SKU": "SPL-0044",
      "Name": "Vacuum splint",
      "Qty": 0,
      "Bin": "D3-07"
    },
    {
      "SKU": "BLK-0150",
      "Name": "Foil blanket",
      "Qty": 40,
      "Bin": "D3-09"
    }
  ],
  "taken": 3,
  "short": 5,
  "copyLoopQty": 10,
  "lowSKUs": [
    "ROP-0518",
    "RAD-0031",
    "SPL-0044"
  ],
  "lane": [
    {
      "handler": "main.Receiver",
      "kind": "RECEIVE",
      "line": 2,
      "ok": true,
      "qty": 4,
      "sku": "ROP-0412"
    },
    {
      "handler": "*main.Audited",
      "kind": "ISSUE",
      "line": 3,
      "ok": true,
      "qty": 3,
      "sku": "HAR-0210"
    },
    {
      "handler": "*main.Audited",
      "kind": "ISSUE",
      "line": 4,
      "ok": true,
      "qty": 2,
      "sku": "RAD-0031"
    },
    {
      "handler": "*main.Audited",
      "kind": "ISSUE",
      "line": 6,
      "ok": false,
      "qty": 6,
      "sku": "RAD-0031"
    },
    {
      "handler": "*main.Retirer",
      "kind": "RETIRE",
      "line": 7,
      "ok": true,
      "qty": 2,
      "sku": "HEL-0107"
    },
    {
      "handler": "main.Receiver",
      "kind": "RECEIVE",
      "line": 8,
      "ok": true,
      "qty": 10,
      "sku": "BAT-0880"
    },
    {
      "handler": "*main.Audited",
      "kind": "ISSUE",
      "line": 9,
      "ok": false,
      "qty": 1,
      "sku": "ZZZ-9999"
    },
    {
      "handler": "main.Receiver",
      "kind": "RETURN",
      "line": 15,
      "ok": true,
      "qty": 2,
      "sku": "HAR-0210"
    },
    {
      "handler": "*main.Audited",
      "kind": "ISSUE",
      "line": 16,
      "ok": true,
      "qty": 12,
      "sku": "BAT-0880"
    },
    {
      "handler": "*main.Retirer",
      "kind": "RETIRE",
      "line": 18,
      "ok": true,
      "qty": 1,
      "sku": "ROP-0518"
    },
    {
      "handler": "*main.Audited",
      "kind": "ISSUE",
      "line": 19,
      "ok": true,
      "qty": 4,
      "sku": "SPL-0044"
    }
  ],
  "laneStock": [
    {
      "SKU": "ROP-0412",
      "Name": "Dynamic rope 60 m",
      "Qty": 10,
      "Bin": "A1-03"
    },
    {
      "SKU": "ROP-0518",
      "Name": "Static line 100 m",
      "Qty": 3,
      "Bin": "A1-04"
    },
    {
      "SKU": "HAR-0210",
      "Name": "Rescue harness M",
      "Qty": 6,
      "Bin": "B2-01"
    },
    {
      "SKU": "HEL-0107",
      "Name": "Climbing helmet",
      "Qty": 12,
      "Bin": "B2-05"
    },
    {
      "SKU": "RAD-0031",
      "Name": "Handheld radio",
      "Qty": 5,
      "Bin": "C1-02"
    },
    {
      "SKU": "BAT-0880",
      "Name": "Radio battery pack",
      "Qty": 32,
      "Bin": "C1-04"
    },
    {
      "SKU": "SPL-0044",
      "Name": "Vacuum splint",
      "Qty": 0,
      "Bin": "D3-07"
    },
    {
      "SKU": "BLK-0150",
      "Name": "Foil blanket",
      "Qty": 40,
      "Bin": "D3-09"
    }
  ],
  "retired": 2,
  "kinds": [
    "receiver",
    "issuer",
    "retirer(3)",
    "none"
  ],
  "notes": [
    "adds to a bin",
    "(no note)",
    "retired 3 so far",
    "(no note)"
  ],
  "qtyProbe": [
    {
      "in": "7",
      "ok": true,
      "qty": 7,
      "type": "int"
    },
    {
      "in": "12",
      "ok": true,
      "qty": 12,
      "type": "float64"
    },
    {
      "in": "2.5",
      "ok": false,
      "qty": 0,
      "type": "float64"
    },
    {
      "in": "9",
      "ok": true,
      "qty": 9,
      "type": "string"
    },
    {
      "in": "nine",
      "ok": false,
      "qty": 0,
      "type": "string"
    },
    {
      "in": "<nil>",
      "ok": false,
      "qty": 0,
      "type": "<nil>"
    }
  ],
  "nilGotcha": {
    "plainNilIsNil": true,
    "typedNilIsNil": false
  },
  "compose": {
    "audit": {
      "calls": 4,
      "failed": 1
    },
    "auditHasNote": false,
    "radio": {
      "SKU": "RAD-0031",
      "Name": "Handheld radio",
      "Qty": 5,
      "Bin": "C1-02",
      "Channel": 7
    },
    "rope": {
      "SKU": "ROP-0412",
      "Name": "Dynamic rope 60 m",
      "Qty": 8,
      "Bin": "A1-03",
      "LengthM": 60,
      "Falls": 2
    },
    "ropeQty": 8
  },
  "labels": [
    "ROP-0412 Dynamic rope 60 m (60 m, 2 falls)",
    "RAD-0031 Handheld radio",
    "ROP-0412 Dynamic rope 60 m"
  ],
  "tableLines": [
    "SKU       ITEM                QTY  BIN",
    "ROP-0412  Dynamic rope 60 m   6    A1-03",
    "ROP-0518  Static line 100 m   3    A1-04",
    "HAR-0210  Rescue harness M    9    B2-01",
    "HEL-0107  Climbing helmet     14   B2-05",
    "RAD-0031  Handheld radio      5    C1-02",
    "BAT-0880  Radio battery pack  22   C1-04",
    "SPL-0044  Vacuum splint       4    D3-07",
    "BLK-0150  Foil blanket        40   D3-09"
  ],
  "verbRows": [
    {
      "out": "RAD-0031 x5 @C1-02",
      "value": "Item",
      "verb": "%v"
    },
    {
      "out": "RAD-0031 x5 @C1-02",
      "value": "Item",
      "verb": "%+v"
    },
    {
      "out": "main.Item{SKU:\"RAD-0031\", Name:\"Handheld radio\", Qty:5, Bin:\"C1-02\"}",
      "value": "Item",
      "verb": "%#v"
    },
    {
      "out": "main.Item",
      "value": "Item",
      "verb": "%T"
    },
    {
      "out": "\"RAD-0031 x5 @C1-02\"",
      "value": "Item",
      "verb": "%q"
    },
    {
      "out": "{6 ISSUE RAD-0031 6 }",
      "value": "Movement",
      "verb": "%v"
    },
    {
      "out": "{Line:6 Kind:ISSUE SKU:RAD-0031 Qty:6 Bin:}",
      "value": "Movement",
      "verb": "%+v"
    },
    {
      "out": "Retirer(2 retired)",
      "value": "*Retirer",
      "verb": "%v"
    },
    {
      "out": "{2}",
      "value": "Retirer",
      "verb": "%v"
    },
    {
      "out": "ROP-0412 x8 @A1-03",
      "value": "Rope",
      "verb": "%v"
    }
  ],
  "inbox": [
    {
      "badge": "*main.StockError",
      "class": "short",
      "line": 6,
      "message": "line 6: ISSUE RAD-0031: RAD-0031: asked for 6, only 3 on the shelf",
      "text": "ISSUE RAD-0031 6"
    },
    {
      "badge": "ErrUnknownSKU",
      "class": "unknown-sku",
      "line": 9,
      "message": "line 9: lookup \"ZZZ-9999\": unknown SKU",
      "text": "ISSUE ZZZ-9999 1"
    },
    {
      "badge": "*main.ParseError",
      "class": "sku",
      "line": 10,
      "message": "line 10: bad SKU: \"rop-0412\" (in \"ISSUE rop-0412 1\")",
      "text": "ISSUE rop-0412 1"
    },
    {
      "badge": "*main.ParseError",
      "class": "kind",
      "line": 11,
      "message": "line 11: bad movement kind: \"LOAN\" (in \"LOAN HAR-0210 1\")",
      "text": "LOAN HAR-0210 1"
    },
    {
      "badge": "*main.ParseError",
      "class": "qty",
      "line": 12,
      "message": "line 12: bad quantity: \"x\" is not a whole number (in \"ISSUE SPL-0044 x\")",
      "text": "ISSUE SPL-0044 x"
    },
    {
      "badge": "*main.ParseError",
      "class": "qty",
      "line": 13,
      "message": "line 13: bad quantity: -5 must be positive (in \"RECEIVE BLK-0150 -5\")",
      "text": "RECEIVE BLK-0150 -5"
    },
    {
      "badge": "*main.ParseError",
      "class": "fields",
      "line": 14,
      "message": "line 14: wrong number of fields: want KIND SKU QTY [BIN], got 2 (in \"ISSUE ROP-0518\")",
      "text": "ISSUE ROP-0518"
    },
    {
      "badge": "*main.ParseError",
      "class": "bin",
      "line": 17,
      "message": "line 17: bad bin code: \"E1-01\" (in \"RECEIVE BLK-0150 20 E1-01\")",
      "text": "RECEIVE BLK-0150 20 E1-01"
    }
  ],
  "errCompare": {
    "chainLen": 3,
    "directEq": false,
    "viaIs": true
  },
  "errTypes": [
    {
      "badge": "*main.StockError",
      "have": 5,
      "isShort": true,
      "line": 1,
      "message": "line 1: RAD-0031: asked for 9, only 5 on the shelf",
      "shortBy": 4,
      "sku": "RAD-0031",
      "want": 9
    },
    {
      "badge": "*main.StockError",
      "have": 14,
      "isShort": true,
      "line": 2,
      "message": "line 2: HEL-0107: asked for 20, only 14 on the shelf",
      "shortBy": 6,
      "sku": "HEL-0107",
      "want": 20
    },
    {
      "badge": "*main.PanicError",
      "isShort": false,
      "line": 4,
      "message": "line 4: handler panicked: runtime error: index out of range [5] with length 3",
      "sku": "RAD-0031"
    }
  ],
  "indexView": {
    "byQty": [
      "BLK-0150",
      "BAT-0880",
      "HEL-0107",
      "HAR-0210",
      "RAD-0031",
      "ROP-0412",
      "SPL-0044",
      "ROP-0518"
    ],
    "found": false,
    "keys": [
      "BAT-0880",
      "BLK-0150",
      "HAR-0210",
      "HEL-0107",
      "RAD-0031",
      "ROP-0412",
      "ROP-0518",
      "SPL-0044"
    ],
    "missingPtrNil": true,
    "ptrMapRAD": 8,
    "sliceBAT": 22,
    "sliceRAD": 8,
    "valueMapBAT": 27
  },
  "helpers": {
    "biggest": "BLK-0150",
    "floatSum": 1,
    "lowSKUs": [
      "ROP-0518",
      "RAD-0031",
      "SPL-0044"
    ],
    "skus": [
      "ROP-0412",
      "ROP-0518",
      "HAR-0210",
      "HEL-0107",
      "RAD-0031",
      "BAT-0880",
      "SPL-0044",
      "BLK-0150"
    ],
    "totalMetres": 190,
    "totalUnits": 103,
    "types": {
      "floatSum": "float64",
      "skus": "[]string",
      "totalMetres": "main.Metres",
      "totalUnits": "int"
    }
  },
  "ledgerView": {
    "foundMissing": false,
    "keys": [
      "ROP-0412",
      "ROP-0518",
      "HAR-0210",
      "HEL-0107",
      "RAD-0031",
      "BAT-0880",
      "SPL-0044",
      "BLK-0150"
    ],
    "len": 8,
    "radioQty": 99,
    "type": "*main.Ledger[string,main.Item]",
    "undoEmptyOK": false,
    "undoOrder": [
      3,
      2,
      1
    ]
  },
  "importDepot": "Cairn Depot",
  "importDecoded": [
    {
      "bin": "A1-03",
      "hasQty": true,
      "index": 0,
      "name": "Dynamic rope 60 m",
      "qty": 6,
      "sku": "ROP-0412"
    },
    {
      "bin": "B2-05",
      "hasQty": false,
      "index": 2,
      "name": "Climbing helmet",
      "sku": "HEL-0107"
    },
    {
      "bin": "C1-02",
      "hasQty": true,
      "index": 3,
      "name": "Handheld radio",
      "qty": 0,
      "sku": "RAD-0031"
    }
  ],
  "importFailed": [
    {
      "field": "qty",
      "index": 1,
      "message": "json: cannot unmarshal string into Go struct field rawItem.qty of type int"
    },
    {
      "field": "colour",
      "index": 4,
      "message": "json: unknown field \"colour\""
    },
    {
      "field": "qty",
      "index": 5,
      "message": "json: cannot unmarshal number 2.5 into Go struct field rawItem.qty of type int"
    }
  ],
  "importEcho": "{\"sku\":\"HEL-0107\",\"name\":\"Climbing helmet\",\"qty\":null}",
  "validation": {
    "checked": 5,
    "joinIs": true,
    "joinNil": true,
    "joinText": "a\nb",
    "problems": [
      {
        "fields": [
          "name",
          "qty"
        ],
        "index": 1,
        "messages": [
          "name: is required",
          "qty: must not be negative"
        ],
        "sku": "HAR-0210"
      },
      {
        "fields": [
          "qty",
          "bin"
        ],
        "index": 2,
        "messages": [
          "qty: is missing",
          "bin: is required"
        ],
        "sku": "HEL-0107"
      },
      {
        "fields": [
          "sku"
        ],
        "index": 3,
        "messages": [
          "sku: is required"
        ],
        "sku": ""
      }
    ],
    "total": 5,
    "valid": 2
  },
  "skuStrip": [
    {
      "cat": "ROP",
      "num": 412,
      "ok": true,
      "rev": "",
      "value": "ROP-0412"
    },
    {
      "cat": "HAR",
      "num": 210,
      "ok": true,
      "rev": "B",
      "value": "HAR-0210-B"
    },
    {
      "cat": "",
      "num": 0,
      "ok": false,
      "rev": "",
      "value": "rop-0412"
    },
    {
      "cat": "",
      "num": 0,
      "ok": false,
      "rev": "",
      "value": "ROP-412"
    },
    {
      "cat": "",
      "num": 0,
      "ok": false,
      "rev": "",
      "value": "ROPE-0412"
    },
    {
      "cat": "",
      "num": 0,
      "ok": false,
      "rev": "",
      "value": "ROP-0412-b"
    },
    {
      "cat": "",
      "num": 0,
      "ok": false,
      "rev": "",
      "value": "ROP0412"
    },
    {
      "cat": "",
      "num": 0,
      "ok": false,
      "rev": "",
      "value": " ROP-0412"
    }
  ],
  "binStrip": [
    {
      "aisle": "A",
      "ok": true,
      "shelf": 1,
      "slot": 3,
      "value": "A1-03"
    },
    {
      "aisle": "D",
      "ok": true,
      "shelf": 6,
      "slot": 12,
      "value": "D6-12"
    },
    {
      "aisle": "",
      "ok": false,
      "shelf": 0,
      "slot": 0,
      "value": "E1-01"
    },
    {
      "aisle": "",
      "ok": false,
      "shelf": 0,
      "slot": 0,
      "value": "A7-01"
    },
    {
      "aisle": "",
      "ok": false,
      "shelf": 0,
      "slot": 0,
      "value": "A1-3"
    },
    {
      "aisle": "",
      "ok": false,
      "shelf": 0,
      "slot": 0,
      "value": "B2-05x"
    }
  ],
  "skuFound": [
    "ROP-0412",
    "HAR-0210-B",
    "BAT-0880"
  ],
  "skuMasked": "Moved <SKU> and <SKU> to B2-04, then <SKU> to C1-04 (ask Sam).",
  "logRead": {
    "lines": 19,
    "moveLines": [
      2,
      3,
      4,
      6,
      7,
      8,
      9,
      15,
      16,
      18,
      19
    ],
    "movements": 11,
    "rejected": [
      {
        "class": "sku",
        "line": 10,
        "message": "line 10: bad SKU: \"rop-0412\" (in \"ISSUE rop-0412 1\")",
        "text": "ISSUE rop-0412 1"
      },
      {
        "class": "kind",
        "line": 11,
        "message": "line 11: bad movement kind: \"LOAN\" (in \"LOAN HAR-0210 1\")",
        "text": "LOAN HAR-0210 1"
      },
      {
        "class": "qty",
        "line": 12,
        "message": "line 12: bad quantity: \"x\" is not a whole number (in \"ISSUE SPL-0044 x\")",
        "text": "ISSUE SPL-0044 x"
      },
      {
        "class": "qty",
        "line": 13,
        "message": "line 13: bad quantity: -5 must be positive (in \"RECEIVE BLK-0150 -5\")",
        "text": "RECEIVE BLK-0150 -5"
      },
      {
        "class": "fields",
        "line": 14,
        "message": "line 14: wrong number of fields: want KIND SKU QTY [BIN], got 2 (in \"ISSUE ROP-0518\")",
        "text": "ISSUE ROP-0518"
      },
      {
        "class": "bin",
        "line": 17,
        "message": "line 17: bad bin code: \"E1-01\" (in \"RECEIVE BLK-0150 20 E1-01\")",
        "text": "RECEIVE BLK-0150 20 E1-01"
      }
    ]
  },
  "tests": {
    "failed": 4,
    "results": [
      {
        "Name": "ParseSKU/plain",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/with_revision",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/lowercase",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/three_digits",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/four_letters",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/lowercase_revision",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/no_dash",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/leading_space",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/trailing_junk",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseSKU/empty",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/plain",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/last_aisle",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/aisle_too_high",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/shelf_zero",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/shelf_too_high",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/short_slot",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/trailing_junk",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "ParseBin/lowercase",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "looseSKU/plain",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "looseSKU/with_revision",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "looseSKU/lowercase",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "looseSKU/three_digits",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "looseSKU/four_letters",
        "Pass": false,
        "Msg": "looseSKU(\"ROPE-0412\") = true, want false"
      },
      {
        "Name": "looseSKU/lowercase_revision",
        "Pass": false,
        "Msg": "looseSKU(\"ROP-0412-b\") = true, want false"
      },
      {
        "Name": "looseSKU/no_dash",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "looseSKU/leading_space",
        "Pass": false,
        "Msg": "looseSKU(\" ROP-0412\") = true, want false"
      },
      {
        "Name": "looseSKU/trailing_junk",
        "Pass": false,
        "Msg": "looseSKU(\"ROP-0412!\") = true, want false"
      },
      {
        "Name": "looseSKU/empty",
        "Pass": true,
        "Msg": ""
      }
    ],
    "total": 28
  },
  "closeout": {
    "applied": 9,
    "audit": {
      "calls": 5,
      "failed": 1
    },
    "balanced": true,
    "closing": 95,
    "issued": 21,
    "opening": 103,
    "received": 14,
    "rejected": 8,
    "retired": 3,
    "returned": 2
  },
  "gateTests": {
    "failed": 0,
    "results": [
      {
        "Name": "reconcile/balanced",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "reconcile/one_unit_lost",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "reconcile/nothing_moved",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "reconcile/only_issues",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "applyMovement/receive",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "applyMovement/issue",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "applyMovement/issue_too_many",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "applyMovement/unknown_sku",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "applyMovement/unknown_kind",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "parseMovement/good_line",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "parseMovement/bad_sku",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "parseMovement/too_few_fields",
        "Pass": true,
        "Msg": ""
      },
      {
        "Name": "parseMovement/negative_quantity",
        "Pass": true,
        "Msg": ""
      }
    ],
    "total": 13
  }
};

export function goInventoryDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
