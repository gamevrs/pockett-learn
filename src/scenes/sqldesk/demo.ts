import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Pit Wall query file returns (the real output of the reference solution, frozen by
 * scripts/gen-demo-pit-wall.mjs), so the landing page can show the dashboard without loading SQLite.
 * Regenerate with `node scripts/gen-demo-pit-wall.mjs` whenever the lessons or the seed data change.
 */

type Row = (string | number | null)[];

const TABLES = [
  { name: "car_status", rowCount: 11, columns: [{ name: "driver_id", type: "INTEGER" }, { name: "position", type: "INTEGER" }, { name: "gap_s", type: "REAL" }, { name: "compound", type: "TEXT" }, { name: "tyre_age", type: "INTEGER" }, { name: "fuel_kg", type: "REAL" }] },
  { name: "drivers", rowCount: 12, columns: [{ name: "driver_id", type: "INTEGER" }, { name: "number", type: "INTEGER" }, { name: "code", type: "TEXT" }, { name: "name", type: "TEXT" }, { name: "country", type: "TEXT" }, { name: "team_id", type: "INTEGER" }, { name: "retired_lap", type: "INTEGER" }] },
  { name: "laps", rowCount: 273, columns: [{ name: "lap_id", type: "INTEGER" }, { name: "driver_id", type: "INTEGER" }, { name: "lap", type: "INTEGER" }, { name: "lap_ms", type: "INTEGER" }, { name: "compound", type: "TEXT" }, { name: "tyre_age", type: "INTEGER" }, { name: "pit_lap", type: "INTEGER" }] },
  { name: "pit_stops", rowCount: 9, columns: [{ name: "stop_id", type: "INTEGER" }, { name: "driver_id", type: "INTEGER" }, { name: "lap", type: "INTEGER" }, { name: "duration_ms", type: "INTEGER" }, { name: "new_compound", type: "TEXT" }] },
  { name: "teams", rowCount: 6, columns: [{ name: "team_id", type: "INTEGER" }, { name: "name", type: "TEXT" }, { name: "country", type: "TEXT" }, { name: "founded", type: "INTEGER" }] },
];

const RESULTS: { sql: string; columns: string[]; rows: Row[] }[] = [
  {
    sql: "-- Driver roster\nSELECT number, code, name, country\nFROM drivers;",
    columns: ["number","code","name","country"],
    rows: [
      [4,"NOV","Lena Novak","Czechia"],
      [16,"ADE","Tomi Adeyemi","Nigeria"],
      [7,"MAR","Inés Marín","Spain"],
      [22,"BEL","Luca Bellini","Italy"],
      [11,"HAR","Kai Hartmann","Germany"],
      [31,"LIN","Mei Lin","China"],
      [3,"MOR","Haru Mori","Japan"],
      [44,"PAL","Diego Palma","Argentina"],
      [9,"SOL","Freya Solberg","Norway"],
      [27,"KOV","Anya Kovač","Croatia"],
      [18,"DUB","Théo Dubois","France"],
      [63,"WAL","Sam Walsh","Australia"],
    ],
  },
  {
    sql: "-- Live timing: lap 24, spins filtered out\nSELECT driver_id, lap, lap_ms, compound\nFROM laps\nWHERE lap = 24 AND lap_ms < 100000;",
    columns: ["driver_id","lap","lap_ms","compound"],
    rows: [
      [1,24,93535,"HARD"],
      [2,24,94351,"HARD"],
      [3,24,94161,"HARD"],
      [4,24,94987,"MEDIUM"],
      [5,24,95355,"MEDIUM"],
      [6,24,94606,"HARD"],
      [7,24,93962,"HARD"],
      [8,24,95292,"HARD"],
      [9,24,94744,"MEDIUM"],
      [11,24,94317,"MEDIUM"],
    ],
  },
  {
    sql: "-- Broadcast shortlist\nSELECT driver_id, lap_ms\nFROM laps\nWHERE lap = 24\n  AND lap_ms BETWEEN 94000 AND 94800\n  AND driver_id NOT IN (1, 2)\nORDER BY lap_ms;",
    columns: ["driver_id","lap_ms"],
    rows: [
      [3,94161],
      [11,94317],
      [6,94606],
      [9,94744],
    ],
  },
  {
    sql: "-- Radio search\nSELECT code, name\nFROM drivers\nWHERE name LIKE '%an%' OR code LIKE 'M_R'\nORDER BY code;",
    columns: ["code","name"],
    rows: [
      ["HAR","Kai Hartmann"],
      ["KOV","Anya Kovač"],
      ["MAR","Inés Marín"],
      ["MOR","Haru Mori"],
    ],
  },
  {
    sql: "-- Fastest laps board\nSELECT driver_id, lap, lap_ms\nFROM laps\nORDER BY lap_ms ASC\nLIMIT 10;",
    columns: ["driver_id","lap","lap_ms"],
    rows: [
      [1,24,93535],
      [1,20,93752],
      [3,23,93853],
      [7,21,93867],
      [9,20,93889],
      [9,4,93924],
      [7,24,93962],
      [1,21,93998],
      [9,2,94013],
      [1,15,94049],
    ],
  },
  {
    sql: "-- Tyre legend\nSELECT DISTINCT compound\nFROM laps\nORDER BY compound;",
    columns: ["compound"],
    rows: [
      ["HARD"],
      ["MEDIUM"],
      ["SOFT"],
    ],
  },
  {
    sql: "-- Race stats\nSELECT\n  COUNT(*) AS laps,\n  COUNT(DISTINCT driver_id) AS cars,\n  MIN(lap_ms) AS best_ms,\n  ROUND(AVG(lap_ms)) AS avg_ms\nFROM laps;",
    columns: ["laps","cars","best_ms","avg_ms"],
    rows: [
      [273,12,93535,95930],
    ],
  },
  {
    sql: "-- Still running\nSELECT code, name\nFROM drivers\nWHERE retired_lap IS NULL\nORDER BY code;",
    columns: ["code","name"],
    rows: [
      ["ADE","Tomi Adeyemi"],
      ["BEL","Luca Bellini"],
      ["DUB","Théo Dubois"],
      ["HAR","Kai Hartmann"],
      ["LIN","Mei Lin"],
      ["MAR","Inés Marín"],
      ["MOR","Haru Mori"],
      ["NOV","Lena Novak"],
      ["PAL","Diego Palma"],
      ["SOL","Freya Solberg"],
      ["WAL","Sam Walsh"],
    ],
  },
  {
    sql: "-- Last lap completed\nSELECT code, COALESCE(retired_lap, 24) AS last_lap\nFROM drivers\nORDER BY last_lap, code;",
    columns: ["code","last_lap"],
    rows: [
      ["KOV",9],
      ["ADE",24],
      ["BEL",24],
      ["DUB",24],
      ["HAR",24],
      ["LIN",24],
      ["MAR",24],
      ["MOR",24],
      ["NOV",24],
      ["PAL",24],
      ["SOL",24],
      ["WAL",24],
    ],
  },
  {
    sql: "-- Pace chart: average clean lap per driver\nSELECT driver_id, COUNT(*) AS laps, ROUND(AVG(lap_ms)) AS avg_ms\nFROM laps\nWHERE pit_lap = 0\nGROUP BY driver_id\nHAVING COUNT(*) >= 10\nORDER BY avg_ms;",
    columns: ["driver_id","laps","avg_ms"],
    rows: [
      [9,23,94702],
      [1,23,94728],
      [7,23,94929],
      [3,23,94939],
      [2,23,95050],
      [4,23,95080],
      [11,23,95238],
      [5,24,95253],
      [6,23,95443],
      [8,24,95701],
      [12,24,96656],
    ],
  },
  {
    sql: "-- Timing tower\nSELECT c.position, d.code, d.name, t.name AS team, c.gap_s\nFROM car_status AS c\nJOIN drivers AS d ON d.driver_id = c.driver_id\nJOIN teams AS t ON t.team_id = d.team_id\nORDER BY c.position;",
    columns: ["position","code","name","team","gap_s"],
    rows: [
      [1,"HAR","Kai Hartmann","Kestrel GP",0],
      [2,"NOV","Lena Novak","Halcyon Racing",7.665],
      [3,"SOL","Freya Solberg","Nordlys Racing",8.146],
      [4,"PAL","Diego Palma","Orbital Dynamics",10.767],
      [5,"MOR","Haru Mori","Orbital Dynamics",11.834],
      [6,"MAR","Inés Marín","Vanta Motorsport",12.117],
      [7,"BEL","Luca Bellini","Vanta Motorsport",15.948],
      [8,"ADE","Tomi Adeyemi","Halcyon Racing",17.523],
      [9,"DUB","Théo Dubois","Sable Works",20.009],
      [10,"LIN","Mei Lin","Kestrel GP",24.666],
      [11,"WAL","Sam Walsh","Sable Works",33.688],
    ],
  },
  {
    sql: "-- Cars yet to pit\nSELECT d.code, d.name, p.lap AS stop_lap\nFROM drivers AS d\nLEFT JOIN pit_stops AS p ON p.driver_id = d.driver_id\nWHERE p.stop_id IS NULL\nORDER BY d.code;",
    columns: ["code","name","stop_lap"],
    rows: [
      ["HAR","Kai Hartmann",null],
      ["KOV","Anya Kovač",null],
      ["PAL","Diego Palma",null],
      ["WAL","Sam Walsh",null],
    ],
  },
  {
    sql: "-- Strategy calls\nSELECT\n  d.code,\n  c.compound,\n  c.tyre_age,\n  ROUND(c.fuel_kg / 1.8, 1) AS fuel_laps,\n  CASE\n    WHEN c.tyre_age >= 20 THEN 'BOX'\n    WHEN c.tyre_age >= 15 THEN 'WATCH'\n    ELSE 'STAY OUT'\n  END AS call\nFROM car_status AS c\nJOIN drivers AS d ON d.driver_id = c.driver_id\nORDER BY c.position;",
    columns: ["code","compound","tyre_age","fuel_laps","call"],
    rows: [
      ["HAR","MEDIUM",24,31.7,"BOX"],
      ["NOV","HARD",7,31.8,"STAY OUT"],
      ["SOL","MEDIUM",16,31.3,"WATCH"],
      ["PAL","HARD",24,31.6,"BOX"],
      ["MOR","HARD",6,31.9,"STAY OUT"],
      ["MAR","HARD",5,31.4,"STAY OUT"],
      ["BEL","MEDIUM",15,30.8,"WATCH"],
      ["ADE","HARD",12,31,"STAY OUT"],
      ["DUB","MEDIUM",10,30.6,"STAY OUT"],
      ["LIN","HARD",11,31.2,"STAY OUT"],
      ["WAL","HARD",24,32.1,"BOX"],
    ],
  },
  {
    sql: "-- Pit log\nSELECT p.lap, d.code, p.duration_ms, p.new_compound\nFROM pit_stops AS p\nJOIN drivers AS d ON d.driver_id = p.driver_id\nORDER BY p.lap;",
    columns: ["lap","code","duration_ms","new_compound"],
    rows: [
      [8,"SOL",3120,"MEDIUM"],
      [9,"BEL",2650,"MEDIUM"],
      [12,"ADE",4870,"HARD"],
      [13,"LIN",2530,"HARD"],
      [14,"DUB",2480,"MEDIUM"],
      [17,"NOV",2410,"HARD"],
      [18,"MOR",2340,"HARD"],
      [19,"MAR",2290,"HARD"],
      [25,"HAR",2380,"HARD"],
    ],
  },
];

export function sqldeskDemoProgram(): ProgramHandle {
  const last = RESULTS[RESULTS.length - 1];
  return createStaticProgram({
    stdout: "number │ code │ name          │ country  \n───────┼──────┼───────────────┼──────────\n4      │ NOV  │ Lena Novak    │ Czechia  \n16     │ ADE  │ Tomi Adeyemi  │ Nigeria  \n7      │ MAR  │ Inés Marín    │ Spain    \n22     │ BEL  │ Luca Bellini  │ Italy    \n11     │ HAR  │ Kai Hartmann  │ Germany  \n31     │ LIN  │ Mei Lin       │ China    \n3      │ MOR  │ Haru Mori     │ Japan    \n44     │ PAL  │ Diego Palma   │ Argentina\n9      │ SOL  │ Freya Solberg │ Norway   \n27     │ KOV  │ Anya Kovač    │ Croatia  \n18     │ DUB  │ Théo Dubois   │ France   \n63     │ WAL  │ Sam Walsh     │ Australia\n(12 rows)\n\ndriver_id │ lap │ lap_ms │ compound\n──────────┼─────┼────────┼─────────\n1         │ 24  │ 93535  │ HARD    \n2         │ 24  │ 94351  │ HARD    \n3         │ 24  │ 94161  │ HARD    \n4         │ 24  │ 94987  │ MEDIUM  \n5         │ 24  │ 95355  │ MEDIUM  \n6         │ 24  │ 94606  │ HARD    \n7         │ 24  │ 93962  │ HARD    \n8         │ 24  │ 95292  │ HARD    \n9         │ 24  │ 94744  │ MEDIUM  \n11        │ 24  │ 94317  │ MEDIUM  \n(10 rows)\n\ndriver_id │ lap_ms\n──────────┼───────\n3         │ 94161 \n11        │ 94317 \n6         │ 94606 \n9         │ 94744 \n(4 rows)\n\ncode │ name        \n─────┼─────────────\nHAR  │ Kai Hartmann\nKOV  │ Anya Kovač  \nMAR  │ Inés Marín  \nMOR  │ Haru Mori   \n(4 rows)\n\ndriver_id │ lap │ lap_ms\n──────────┼─────┼───────\n1         │ 24  │ 93535 \n1         │ 20  │ 93752 \n3         │ 23  │ 93853 \n7         │ 21  │ 93867 \n9         │ 20  │ 93889 \n9         │ 4   │ 93924 \n7         │ 24  │ 93962 \n1         │ 21  │ 93998 \n9         │ 2   │ 94013 \n1         │ 15  │ 94049 \n(10 rows)\n\ncompound\n────────\nHARD    \nMEDIUM  \nSOFT    \n(3 rows)\n\nlaps │ cars │ best_ms │ avg_ms\n─────┼──────┼─────────┼───────\n273  │ 12   │ 93535   │ 95930 \n(1 row)\n\ncode │ name         \n─────┼──────────────\nADE  │ Tomi Adeyemi \nBEL  │ Luca Bellini \nDUB  │ Théo Dubois  \nHAR  │ Kai Hartmann \nLIN  │ Mei Lin      \nMAR  │ Inés Marín   \nMOR  │ Haru Mori    \nNOV  │ Lena Novak   \nPAL  │ Diego Palma  \nSOL  │ Freya Solberg\nWAL  │ Sam Walsh    \n(11 rows)\n\ncode │ last_lap\n─────┼─────────\nKOV  │ 9       \nADE  │ 24      \nBEL  │ 24      \nDUB  │ 24      \nHAR  │ 24      \nLIN  │ 24      \nMAR  │ 24      \nMOR  │ 24      \nNOV  │ 24      \nPAL  │ 24      \nSOL  │ 24      \nWAL  │ 24      \n(12 rows)\n\ndriver_id │ laps │ avg_ms\n──────────┼──────┼───────\n9         │ 23   │ 94702 \n1         │ 23   │ 94728 \n7         │ 23   │ 94929 \n3         │ 23   │ 94939 \n2         │ 23   │ 95050 \n4         │ 23   │ 95080 \n11        │ 23   │ 95238 \n5         │ 24   │ 95253 \n6         │ 23   │ 95443 \n8         │ 24   │ 95701 \n12        │ 24   │ 96656 \n(11 rows)\n\nposition │ code │ name          │ team             │ gap_s \n─────────┼──────┼───────────────┼──────────────────┼───────\n1        │ HAR  │ Kai Hartmann  │ Kestrel GP       │ 0     \n2        │ NOV  │ Lena Novak    │ Halcyon Racing   │ 7.665 \n3        │ SOL  │ Freya Solberg │ Nordlys Racing   │ 8.146 \n4        │ PAL  │ Diego Palma   │ Orbital Dynamics │ 10.767\n5        │ MOR  │ Haru Mori     │ Orbital Dynamics │ 11.834\n6        │ MAR  │ Inés Marín    │ Vanta Motorsport │ 12.117\n7        │ BEL  │ Luca Bellini  │ Vanta Motorsport │ 15.948\n8        │ ADE  │ Tomi Adeyemi  │ Halcyon Racing   │ 17.523\n9        │ DUB  │ Théo Dubois   │ Sable Works      │ 20.009\n10       │ LIN  │ Mei Lin       │ Kestrel GP       │ 24.666\n11       │ WAL  │ Sam Walsh     │ Sable Works      │ 33.688\n(11 rows)\n\ncode │ name         │ stop_lap\n─────┼──────────────┼─────────\nHAR  │ Kai Hartmann │ NULL    \nKOV  │ Anya Kovač   │ NULL    \nPAL  │ Diego Palma  │ NULL    \nWAL  │ Sam Walsh    │ NULL    \n(4 rows)\n\ncode │ compound │ tyre_age │ fuel_laps │ call    \n─────┼──────────┼──────────┼───────────┼─────────\nHAR  │ MEDIUM   │ 24       │ 31.7      │ BOX     \nNOV  │ HARD     │ 7        │ 31.8      │ STAY OUT\nSOL  │ MEDIUM   │ 16       │ 31.3      │ WATCH   \nPAL  │ HARD     │ 24       │ 31.6      │ BOX     \nMOR  │ HARD     │ 6        │ 31.9      │ STAY OUT\nMAR  │ HARD     │ 5        │ 31.4      │ STAY OUT\nBEL  │ MEDIUM   │ 15       │ 30.8      │ WATCH   \nADE  │ HARD     │ 12       │ 31        │ STAY OUT\nDUB  │ MEDIUM   │ 10       │ 30.6      │ STAY OUT\nLIN  │ HARD     │ 11       │ 31.2      │ STAY OUT\nWAL  │ HARD     │ 24       │ 32.1      │ BOX     \n(11 rows)\n\nINSERT ok · 1 row changed\n\nUPDATE ok · 1 row changed\n\nlap │ code │ duration_ms │ new_compound\n────┼──────┼─────────────┼─────────────\n8   │ SOL  │ 3120        │ MEDIUM      \n9   │ BEL  │ 2650        │ MEDIUM      \n12  │ ADE  │ 4870        │ HARD        \n13  │ LIN  │ 2530        │ HARD        \n14  │ DUB  │ 2480        │ MEDIUM      \n17  │ NOV  │ 2410        │ HARD        \n18  │ MOR  │ 2340        │ HARD        \n19  │ MAR  │ 2290        │ HARD        \n25  │ HAR  │ 2380        │ HARD        \n(9 rows)\n",
    vars: {
      tables: TABLES,
      results: RESULTS,
      result: last,
      rows: last.rows.map((r) => Object.fromEntries(last.columns.map((c, i) => [c, r[i]]))),
      error: null,
    },
  });
}
