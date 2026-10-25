import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/**
 * What the finished Pit Wall query file returns (the real output of the reference solution, frozen),
 * so the landing page can show the dashboard without loading SQLite.
 */

type Row = (string | number | null)[];

const TABLES = [
  { name: "car_status", rowCount: 11, columns: [{ name: "driver_id", type: "INTEGER" }, { name: "position", type: "INTEGER" }, { name: "gap_s", type: "REAL" }, { name: "compound", type: "TEXT" }, { name: "tyre_age", type: "INTEGER" }, { name: "fuel_kg", type: "REAL" }] },
  { name: "drivers", rowCount: 12, columns: [{ name: "driver_id", type: "INTEGER" }, { name: "number", type: "INTEGER" }, { name: "code", type: "TEXT" }, { name: "name", type: "TEXT" }, { name: "country", type: "TEXT" }, { name: "team_id", type: "INTEGER" }] },
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
    sql: "-- Race stats\nSELECT\n  COUNT(*) AS laps,\n  COUNT(DISTINCT driver_id) AS cars,\n  MIN(lap_ms) AS best_ms,\n  ROUND(AVG(lap_ms)) AS avg_ms\nFROM laps;",
    columns: ["laps","cars","best_ms","avg_ms"],
    rows: [
      [273,12,93535,95930],
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
    stdout: "INSERT ok · 1 row changed\n\nUPDATE ok · 1 row changed\n",
    vars: {
      tables: TABLES,
      results: RESULTS,
      result: last,
      rows: last.rows.map((r) => Object.fromEntries(last.columns.map((c, i) => [c, r[i]]))),
      error: null,
    },
  });
}
