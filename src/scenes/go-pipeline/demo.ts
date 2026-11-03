import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Tidewatch program prints and sends to the board: the real output of the reference
 * solution, frozen by scripts/gen-demo-go-pipeline.mjs, so the landing page and the project hub can show
 * the harbour board without calling the code runner.
 */

const STDOUT = "Tidewatch is listening to 6 buoys\nsame answers both ways: true\nbuoy 3 waves, in order: [44 97 150 43 96 149]\nreceive from a closed channel says ok = false\ninbox: filled 4 room 0 after taking two, 2 wait\ncollected buoys: 6 first max wave: 183\nshelf of 3 took 3 and turned away 3\nlistener heard 5 readings\nAABB -> 2\nABAB -> 1 (one update lost)\nABBA -> 1 (one update lost)\nBAAB -> 1 (one update lost)\nBABA -> 1 (one update lost)\nBBAA -> 2\n4 of 6 orders lose an update\ntally says 143040 plain loop says 143040 match: true\ntable loaded 1 time(s); readings seen: 400\npeak waves per buoy: map[1:183 2:199 3:199 4:187 5:199 6:199]\n40 readings in, 13 storm readings out; first is # 3\nits temperature: 173 raw, 178 calibrated\n12 jobs on 4 workers, same as one-at-a-time: true\nmerged 180 readings from 6 streams; per buoy: map[1:30 2:30 3:30 4:30 5:30 6:30]\n1 worker(s): done at tick 29 utilisation 100 % peak queue 6\n2 worker(s): done at tick 15 utilisation 96 % peak queue 4\n3 worker(s): done at tick 10 utilisation 96 % peak queue 3\ntook 5 of 10000, then cancelled: context canceled\npoll results: [ok ok ok timeout ok ok]\nfirst error: buoy 3: radio fault | jobs stopped by the cancel: 4\nevery error, in launch order:\nbuoy 2: bad checksum\nbuoy 4: bad checksum\naccepted 60 processed 60 lost 0\nclean shutdown: true | per buoy: map[1:10 2:10 3:10 4:10 5:10 6:10]";

const VARS: Record<string, unknown> = {
  "lanes": [
    {
      "Buoy": 1,
      "Count": 50,
      "MaxWave": 183,
      "WindSum": 2155
    },
    {
      "Buoy": 2,
      "Count": 50,
      "MaxWave": 167,
      "WindSum": 2145
    },
    {
      "Buoy": 3,
      "Count": 50,
      "MaxWave": 199,
      "WindSum": 2135
    },
    {
      "Buoy": 4,
      "Count": 50,
      "MaxWave": 187,
      "WindSum": 2125
    },
    {
      "Buoy": 5,
      "Count": 50,
      "MaxWave": 171,
      "WindSum": 2045
    },
    {
      "Buoy": 6,
      "Count": 50,
      "MaxWave": 199,
      "WindSum": 2105
    }
  ],
  "sequential": [
    {
      "Buoy": 1,
      "Count": 50,
      "MaxWave": 183,
      "WindSum": 2155
    },
    {
      "Buoy": 2,
      "Count": 50,
      "MaxWave": 167,
      "WindSum": 2145
    },
    {
      "Buoy": 3,
      "Count": 50,
      "MaxWave": 199,
      "WindSum": 2135
    },
    {
      "Buoy": 4,
      "Count": 50,
      "MaxWave": 187,
      "WindSum": 2125
    },
    {
      "Buoy": 5,
      "Count": 50,
      "MaxWave": 171,
      "WindSum": 2045
    },
    {
      "Buoy": 6,
      "Count": 50,
      "MaxWave": 199,
      "WindSum": 2105
    }
  ],
  "same": true,
  "waves": [
    44,
    97,
    150,
    43,
    96,
    149
  ],
  "streamTotal": 579,
  "streamPeak": 150,
  "stillOpen": false,
  "queue": {
    "cap": 4,
    "filled": 4,
    "firstWave": 130,
    "room": 0,
    "waiting": 2
  },
  "collected": [
    {
      "Buoy": 1,
      "Count": 30,
      "MaxWave": 183,
      "WindSum": 1315
    },
    {
      "Buoy": 2,
      "Count": 30,
      "MaxWave": 167,
      "WindSum": 1295
    },
    {
      "Buoy": 3,
      "Count": 30,
      "MaxWave": 199,
      "WindSum": 1275
    },
    {
      "Buoy": 4,
      "Count": 30,
      "MaxWave": 187,
      "WindSum": 1255
    },
    {
      "Buoy": 5,
      "Count": 30,
      "MaxWave": 171,
      "WindSum": 1235
    },
    {
      "Buoy": 6,
      "Count": 30,
      "MaxWave": 199,
      "WindSum": 1285
    }
  ],
  "shed": {
    "accepted": 3,
    "shed": 3,
    "shedSeqs": [
      4,
      5,
      6
    ]
  },
  "heard": [
    167,
    60,
    113,
    166,
    59
  ],
  "race": [
    {
      "order": "AABB",
      "result": 2
    },
    {
      "order": "ABAB",
      "result": 1
    },
    {
      "order": "ABBA",
      "result": 1
    },
    {
      "order": "BAAB",
      "result": 1
    },
    {
      "order": "BABA",
      "result": 1
    },
    {
      "order": "BBAA",
      "result": 2
    }
  ],
  "lostRuns": 4,
  "tally": {
    "expected": 143040,
    "match": true,
    "perBuoy": {
      "1": 200,
      "2": 200,
      "3": 200,
      "4": 200,
      "5": 200,
      "6": 200
    },
    "waveSum": 143040
  },
  "calibration": {
    "fixed": [
      7345,
      7115,
      7235,
      7505,
      7075,
      7255,
      7345,
      7115
    ],
    "loads": 1,
    "seen": 400,
    "workers": 8
  },
  "peaks": {
    "1": 183,
    "2": 199,
    "3": 199,
    "4": 187,
    "5": 199,
    "6": 199
  },
  "pipeline": {
    "calibrated": 178,
    "in": 40,
    "limit": 150,
    "out": 13,
    "raw": 173,
    "seqs": [
      3,
      6,
      9,
      12,
      15,
      18,
      21,
      24,
      27,
      30,
      33,
      36,
      39
    ]
  },
  "pool": {
    "jobs": 12,
    "match": true,
    "summaries": [
      {
        "Buoy": 1,
        "Count": 20,
        "MaxWave": 183,
        "WindSum": 870
      },
      {
        "Buoy": 2,
        "Count": 25,
        "MaxWave": 167,
        "WindSum": 1075
      },
      {
        "Buoy": 3,
        "Count": 30,
        "MaxWave": 199,
        "WindSum": 1275
      },
      {
        "Buoy": 4,
        "Count": 35,
        "MaxWave": 187,
        "WindSum": 1470
      },
      {
        "Buoy": 5,
        "Count": 40,
        "MaxWave": 171,
        "WindSum": 1660
      },
      {
        "Buoy": 6,
        "Count": 45,
        "MaxWave": 199,
        "WindSum": 1915
      },
      {
        "Buoy": 1,
        "Count": 50,
        "MaxWave": 183,
        "WindSum": 2155
      },
      {
        "Buoy": 2,
        "Count": 55,
        "MaxWave": 167,
        "WindSum": 2350
      },
      {
        "Buoy": 3,
        "Count": 60,
        "MaxWave": 199,
        "WindSum": 2540
      },
      {
        "Buoy": 4,
        "Count": 65,
        "MaxWave": 187,
        "WindSum": 2725
      },
      {
        "Buoy": 5,
        "Count": 70,
        "MaxWave": 171,
        "WindSum": 2975
      },
      {
        "Buoy": 6,
        "Count": 75,
        "MaxWave": 199,
        "WindSum": 3150
      }
    ],
    "workers": 4
  },
  "fan": {
    "first": {
      "Buoy": 1,
      "Seq": 1,
      "Wave": 130,
      "Wind": 48,
      "Temp": 123
    },
    "perBuoy": {
      "1": 30,
      "2": 30,
      "3": 30,
      "4": 30,
      "5": 30,
      "6": 30
    },
    "streams": 6,
    "tempSum": 26280,
    "total": 180,
    "workers": 3
  },
  "ticks": {
    "best": 3,
    "runs": [
      {
        "Workers": 1,
        "Slots": [
          {
            "Job": 0,
            "Worker": 0,
            "Start": 0,
            "End": 4
          },
          {
            "Job": 1,
            "Worker": 0,
            "Start": 4,
            "End": 6
          },
          {
            "Job": 2,
            "Worker": 0,
            "Start": 6,
            "End": 12
          },
          {
            "Job": 3,
            "Worker": 0,
            "Start": 12,
            "End": 15
          },
          {
            "Job": 4,
            "Worker": 0,
            "Start": 15,
            "End": 20
          },
          {
            "Job": 5,
            "Worker": 0,
            "Start": 20,
            "End": 22
          },
          {
            "Job": 6,
            "Worker": 0,
            "Start": 22,
            "End": 26
          },
          {
            "Job": 7,
            "Worker": 0,
            "Start": 26,
            "End": 29
          }
        ],
        "Makespan": 29,
        "Busy": [
          29
        ],
        "PeakQueue": 6,
        "Depth": [
          2,
          3,
          5,
          6,
          5,
          6,
          5,
          5,
          5,
          5,
          5,
          5,
          4,
          4,
          4,
          3,
          3,
          3,
          3,
          3,
          2,
          2,
          1,
          1,
          1,
          1,
          0,
          0,
          0
        ]
      },
      {
        "Workers": 2,
        "Slots": [
          {
            "Job": 0,
            "Worker": 0,
            "Start": 0,
            "End": 4
          },
          {
            "Job": 1,
            "Worker": 1,
            "Start": 0,
            "End": 2
          },
          {
            "Job": 2,
            "Worker": 1,
            "Start": 2,
            "End": 8
          },
          {
            "Job": 3,
            "Worker": 0,
            "Start": 4,
            "End": 7
          },
          {
            "Job": 4,
            "Worker": 0,
            "Start": 7,
            "End": 12
          },
          {
            "Job": 5,
            "Worker": 1,
            "Start": 8,
            "End": 10
          },
          {
            "Job": 6,
            "Worker": 1,
            "Start": 10,
            "End": 14
          },
          {
            "Job": 7,
            "Worker": 0,
            "Start": 12,
            "End": 15
          }
        ],
        "Makespan": 15,
        "Busy": [
          15,
          14
        ],
        "PeakQueue": 4,
        "Depth": [
          1,
          2,
          3,
          4,
          3,
          4,
          4,
          3,
          2,
          2,
          1,
          1,
          0,
          0,
          0
        ]
      },
      {
        "Workers": 3,
        "Slots": [
          {
            "Job": 0,
            "Worker": 0,
            "Start": 0,
            "End": 4
          },
          {
            "Job": 1,
            "Worker": 1,
            "Start": 0,
            "End": 2
          },
          {
            "Job": 2,
            "Worker": 2,
            "Start": 0,
            "End": 6
          },
          {
            "Job": 3,
            "Worker": 1,
            "Start": 2,
            "End": 5
          },
          {
            "Job": 4,
            "Worker": 0,
            "Start": 4,
            "End": 9
          },
          {
            "Job": 5,
            "Worker": 1,
            "Start": 5,
            "End": 7
          },
          {
            "Job": 6,
            "Worker": 2,
            "Start": 6,
            "End": 10
          },
          {
            "Job": 7,
            "Worker": 1,
            "Start": 7,
            "End": 10
          }
        ],
        "Makespan": 10,
        "Busy": [
          9,
          10,
          10
        ],
        "PeakQueue": 3,
        "Depth": [
          0,
          1,
          2,
          3,
          2,
          2,
          1,
          0,
          0,
          0
        ]
      }
    ],
    "util": [
      100,
      96,
      96
    ]
  },
  "cancel": {
    "asked": 10000,
    "reason": "context canceled",
    "stopped": true,
    "took": 5,
    "waves": [
      155,
      48,
      101,
      154,
      47
    ]
  },
  "deadlines": {
    "limitMs": 250,
    "silentErr": "buoy 4: context deadline exceeded",
    "statuses": [
      "ok",
      "ok",
      "ok",
      "timeout",
      "ok",
      "ok"
    ]
  },
  "group": {
    "cancelled": 4,
    "first": "buoy 3: radio fault",
    "joined": "buoy 2: bad checksum\nbuoy 4: bad checksum",
    "tasks": 5
  },
  "shutdown": {
    "Accepted": 60,
    "Processed": 60,
    "PerBuoy": {
      "1": 10,
      "2": 10,
      "3": 10,
      "4": 10,
      "5": 10,
      "6": 10
    },
    "MaxWave": 187,
    "Clean": true
  }
};

export function goPipelineDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
