import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Footlight program prints (the real output of the reference solution,
 * frozen), so the landing page can show the desk board without calling the code runner.
 * Regenerate by running the reference solution and pasting its output here.
 */

const STDOUT = [
  "CUE 007",
  "labeler is a CueLabeler",
  "85 bright? True",
  "20 dim? True",
  "Firing house-down",
  "  house lights fade down",
  "Firing curtain-up",
  "  curtain rises",
  "Firing spot-on",
  "  follow-spot finds the lead",
  "halve(80) = 40, blend(20, 60) = 40",
  "master 100: 60 -> 60",
  "master 50: 60 -> 30",
  "shared loop variable: 40, 40, 40",
  "copy per pass:        10, 20, 30",
  "mic 10 -> 0",
  "mic 40 -> 60",
  "mic 80 -> 90",
  "trail for 80: 80 -> 120 -> 120 -> 90",
  "halfway, linear:  50",
  "halfway, ease-in: 25",
  "halfway, stepped x3: 33.3",
  "GO has 4 handlers: Lights, Fog, Sound, Fly",
  "  lights -> Act 1",
  "GO aborted: fog machine jammed",
  "naive GO finished: Lights",
  "  lights -> Act 2",
  "  sound -> Act 2",
  "  fly bar -> Act 2",
  "safe GO finished:  Lights, Sound, Fly",
  "failures: Fog: fog machine jammed",
  "direct call returns 70; every return: 40, 70",
  "0 listeners, nothing happened",
  "2 listeners",
  "1 listener left",
  "3 deliveries logged",
  "2 subscribers",
  "alarm unsubscribed, 1 left",
  "meter saw: 30, 60, 95",
  "alarm saw: 30, 60",
  "completed for: meter",
  "3 lanterns, heaviest: Storm lantern",
  "seen as props: 3",
  "Oil lamp: light | Storm lantern: heavy | Candle lamp: light",
  "tagged Pilot light",
  "made a Lantern",
  "fade 0 -> 100: 0, 25, 50, 75, 100",
  "stack created, nothing loaded yet",
  "  loading cue 1",
  "  running house-down",
  "  loading cue 2",
  "  running curtain-up",
  "pulse: 0 100 0 100 0 100",
  "query built, entries pulled so far: 0",
  "bright cues: curtain-up, spot-on, chase, bows",
  "entries pulled by one full pass: 7",
  "first bright cue: curtain-up (pulled 2)",
  "page 1: curtain-up + spot-on",
  "page 2: chase + bows",
  "overlaps: Act two / Curtain call",
  "minutes on the sheet: 117, show ends at 115",
  "lazy version: the call returned without complaint",
  "lazy check: threw only when enumerated",
  "eager check: threw at the call",
  "flats in position",
  "trap door in position",
  "one after another took the sum: True",
  "first home: turntable in position",
  "all in position: turntable in position, backdrop in position, chandelier in position",
  "side by side beat the sum: True",
  "await rethrew: trap door jammed",
  "tasks that failed: 2",
  "flight stopped by the hold, status Canceled",
  "stopped early: True",
  "timeout: gave up after 40 ms",
  "guarded flight: the stage hold arrived first",
  "crew handled 8 calls: warn fly, go fly, warn lights, go lights, warn sound, go sound, warn fog, go fog",
  "the stage manager had to wait: True",
  "deepest queue never passed the capacity: True",
  "fog released after 3 attempts",
  "  attempt 1: failed: fog machine busy (call 1), waiting 3 ms",
  "  attempt 2: failed: fog machine busy (call 2), waiting 8 ms",
  "  attempt 3: ok",
  "slow fly bar: gave up after 25 ms, tried 2 times",
  "after three faults the breaker is Open",
  "outcomes: failed, failed, failed, rejected, failed, rejected, ok, ok",
  "transitions: Closed -> Open; Open -> HalfOpen; HalfOpen -> Open; Open -> HalfOpen; HalfOpen -> Closed",
  "the projector itself was called 6 times",
  "three at once, two slots: lit, lit, rejected",
  "Spot A lent, 1 free",
  "Spot B lent, 0 free",
  "third request: no spotlight free",
  "after the block: 2 free",
  "caught: lamp blew; 2 free again",
  "log: borrow Spot A | borrow Spot B | return Spot B | return Spot A | borrow Spot B | return Spot B | rack powered up | borrow Spot A | show in progress | return Spot A | rack powered down",
  "  log: [1000] stage left -> 80",
  "  log: cue done at 1000",
  "transient: two controllers? True",
  "singleton: one clock? True",
  "  log: [5] stage right -> 40",
  "  log: cue done at 5",
  "circular dependency: FlyBar -> Winch -> FlyBar",
  "  log: Spot A lent for the run",
  "  log: house-down on lights at 30",
  "  log: curtain-up failed: fly fault on call 3",
  "  log: spot-on on lights at 60",
  "  log: fog-in on fog at 37",
  "  log: chase on lights at 90",
  "  log: fly-in failed: fly fault on call 6",
  "  log: flash on lights at 90",
  "  log: fly-out skipped: fly circuit open",
  "  log: bows on lights at 82",
  "Show report: 6 fired, 2 failed, 1 skipped, 6 retries, peak level 90, spots free 2"
].join("\n");

const VARS: Record<string, unknown> = {
  "cueLabel": "CUE 007",
  "labelerType": "CueLabeler",
  "cueSheet": [
    "house-down",
    "curtain-up",
    "spot-on"
  ],
  "brightness": {
    "bright": true,
    "dim": true
  },
  "faders": {
    "master": 50,
    "levels": [
      10,
      20,
      30
    ],
    "brokenLevels": [
      40,
      40,
      40
    ]
  },
  "chain": {
    "stageNames": [
      "Gain 150%",
      "Gate below 20",
      "Limit 90"
    ],
    "trail": [
      80,
      120,
      120,
      90
    ],
    "samples": [
      {
        "input": 10,
        "output": 0
      },
      {
        "input": 40,
        "output": 60
      },
      {
        "input": 80,
        "output": 90
      }
    ],
    "fade": {
      "linear": 50,
      "easeIn": 25,
      "stepped": 33.3,
      "steppedName": "stepped x3"
    }
  },
  "go": {
    "handlers": [
      "Lights",
      "Fog",
      "Sound",
      "Fly"
    ],
    "naive": [
      "Lights"
    ],
    "safe": [
      "Lights",
      "Sound",
      "Fly"
    ],
    "failures": [
      "Fog: fog machine jammed"
    ],
    "lastWins": 70,
    "everyReturn": [
      40,
      70
    ]
  },
  "bus": {
    "log": [
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "house-down"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "SoundDesk",
        "payload": "house-down"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "curtain-up"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "house-down"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "SoundDesk",
        "payload": "house-down"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "spot-on"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "SoundDesk",
        "payload": "spot-on"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "fog-in"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "SoundDesk",
        "payload": "fog-in"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "chase"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "SoundDesk",
        "payload": "chase"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "flash"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "SoundDesk",
        "payload": "flash"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "HouseLights",
        "payload": "bows"
      },
      {
        "publisher": "CueBoard",
        "eventName": "CueFired",
        "subscriber": "SoundDesk",
        "payload": "bows"
      }
    ],
    "listeners": 2
  },
  "observers": {
    "meter": [
      30,
      60,
      95
    ],
    "alarm": [
      30,
      60
    ],
    "completed": [
      "meter"
    ],
    "stillSubscribed": 1
  },
  "props": {
    "shelf": [
      {
        "name": "Oil lamp",
        "kind": "Lantern",
        "weight": 3
      },
      {
        "name": "Storm lantern",
        "kind": "Lantern",
        "weight": 6
      },
      {
        "name": "Candle lamp",
        "kind": "Lantern",
        "weight": 1
      }
    ],
    "heaviest": "Storm lantern",
    "viewed": 3,
    "judged": [
      "Oil lamp: light",
      "Storm lantern: heavy",
      "Candle lamp: light"
    ]
  },
  "iter": {
    "fade": [
      0,
      25,
      50,
      75,
      100
    ],
    "trace": [
      "loading cue 1",
      "running house-down",
      "loading cue 2",
      "running curtain-up"
    ],
    "pulse": [
      0,
      100,
      0,
      100,
      0,
      100
    ]
  },
  "query": {
    "source": 7,
    "pulls": {
      "built": 0,
      "pass": 7,
      "first": 2
    },
    "kept": 4,
    "pages": [
      [
        "curtain-up",
        "spot-on"
      ],
      [
        "chase",
        "bows"
      ]
    ]
  },
  "runSheet": {
    "segments": [
      {
        "name": "Overture",
        "start": 0,
        "end": 5,
        "length": 5
      },
      {
        "name": "Act one",
        "start": 5,
        "end": 50,
        "length": 45
      },
      {
        "name": "Interval",
        "start": 50,
        "end": 65,
        "length": 15
      },
      {
        "name": "Act two",
        "start": 65,
        "end": 110,
        "length": 45
      },
      {
        "name": "Curtain call",
        "start": 108,
        "end": 115,
        "length": 7
      }
    ],
    "overlaps": [
      "Act two / Curtain call"
    ],
    "totalMinutes": 117,
    "endsAt": 115,
    "lazyCheck": "threw only when enumerated",
    "eagerCheck": "threw at the call"
  },
  "spans": [
    {
      "name": "flats",
      "start": 0,
      "end": 26,
      "state": "done"
    },
    {
      "name": "trap door",
      "start": 26,
      "end": 46,
      "state": "done"
    },
    {
      "name": "turntable",
      "start": 46,
      "end": 77,
      "state": "done"
    },
    {
      "name": "backdrop",
      "start": 46,
      "end": 106,
      "state": "done"
    },
    {
      "name": "chandelier",
      "start": 46,
      "end": 138,
      "state": "done"
    },
    {
      "name": "trap door",
      "start": 139,
      "end": 150,
      "state": "failed"
    },
    {
      "name": "fly bar",
      "start": 139,
      "end": 150,
      "state": "failed"
    },
    {
      "name": "revolve",
      "start": 138,
      "end": 158,
      "state": "done"
    },
    {
      "name": "fly backdrop",
      "start": 167,
      "end": 221,
      "state": "cancelled"
    },
    {
      "name": "fly backdrop",
      "start": 223,
      "end": 264,
      "state": "cancelled"
    },
    {
      "name": "fly backdrop",
      "start": 264,
      "end": 293,
      "state": "cancelled"
    }
  ],
  "timeline": {
    "winner": "turntable in position",
    "rethrown": "trap door jammed",
    "failedCount": 2
  },
  "hold": {
    "state": "Canceled",
    "stepsDone": 4,
    "stepsTotal": 20,
    "timeoutMessage": "gave up after 40 ms",
    "guardedOutcome": "the stage hold arrived first"
  },
  "channel": {
    "capacity": 2,
    "sent": 8,
    "handled": [
      "warn fly",
      "go fly",
      "warn lights",
      "go lights",
      "warn sound",
      "go sound",
      "warn fog",
      "go fog"
    ],
    "waits": 6,
    "deepest": 2
  },
  "retry": {
    "fog": [
      {
        "number": 1,
        "outcome": "failed: fog machine busy (call 1)",
        "waitMs": 3
      },
      {
        "number": 2,
        "outcome": "failed: fog machine busy (call 2)",
        "waitMs": 8
      },
      {
        "number": 3,
        "outcome": "ok",
        "waitMs": 0
      }
    ],
    "fogResult": "fog released",
    "slow": [
      {
        "number": 1,
        "outcome": "failed: gave up after 25 ms",
        "waitMs": 3
      },
      {
        "number": 2,
        "outcome": "failed: gave up after 25 ms",
        "waitMs": 0
      }
    ],
    "slowOutcome": "gave up after 25 ms"
  },
  "breaker": {
    "outcomes": [
      "failed",
      "failed",
      "failed",
      "rejected",
      "failed",
      "rejected",
      "ok",
      "ok"
    ],
    "transitions": [
      "Closed -> Open",
      "Open -> HalfOpen",
      "HalfOpen -> Open",
      "Open -> HalfOpen",
      "HalfOpen -> Closed"
    ],
    "finalState": "Closed",
    "serviceCalls": 6,
    "bulkhead": [
      "lit",
      "lit",
      "rejected"
    ]
  },
  "lifetimes": {
    "log": [
      "borrow Spot A",
      "borrow Spot B",
      "return Spot B",
      "return Spot A",
      "borrow Spot B",
      "return Spot B",
      "rack powered up",
      "borrow Spot A",
      "show in progress",
      "return Spot A",
      "rack powered down"
    ],
    "free": 2
  },
  "wiring": {
    "nodes": [
      {
        "name": "IClock",
        "lifetime": "singleton"
      },
      {
        "name": "ILog",
        "lifetime": "singleton"
      },
      {
        "name": "ILighting",
        "lifetime": "singleton"
      },
      {
        "name": "ShowController",
        "lifetime": "transient"
      }
    ],
    "edges": [
      {
        "from": "ShowController",
        "to": "ILighting"
      },
      {
        "from": "ILighting",
        "to": "IClock"
      },
      {
        "from": "ILighting",
        "to": "ILog"
      },
      {
        "from": "ShowController",
        "to": "IClock"
      },
      {
        "from": "ShowController",
        "to": "ILog"
      }
    ],
    "liveLog": [
      "[1000] stage left -> 80",
      "cue done at 1000"
    ],
    "rehearsalLog": [
      "[5] stage right -> 40",
      "cue done at 5"
    ],
    "cycleMessage": "circular dependency: FlyBar -> Winch -> FlyBar"
  },
  "show": {
    "report": {
      "fired": 6,
      "failed": 2,
      "skipped": 1,
      "peakLevel": 90,
      "retries": 6,
      "spotsFree": 2
    },
    "cues": [
      {
        "number": 1,
        "name": "house-down",
        "device": "lights"
      },
      {
        "number": 2,
        "name": "curtain-up",
        "device": "fly"
      },
      {
        "number": 3,
        "name": "spot-on",
        "device": "lights"
      },
      {
        "number": 4,
        "name": "fog-in",
        "device": "fog"
      },
      {
        "number": 5,
        "name": "chase",
        "device": "lights"
      },
      {
        "number": 6,
        "name": "fly-in",
        "device": "fly"
      },
      {
        "number": 7,
        "name": "flash",
        "device": "lights"
      },
      {
        "number": 8,
        "name": "fly-out",
        "device": "fly"
      },
      {
        "number": 9,
        "name": "bows",
        "device": "lights"
      }
    ]
  }
};

export function footlightDemoProgram(): ProgramHandle {
  return createStaticProgram({ stdout: STDOUT, vars: VARS });
}
