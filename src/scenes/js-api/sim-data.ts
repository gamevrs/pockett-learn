import type { Bike, Rental, Station } from "./types.ts";

/** The Dockline seed data (exact), shared by the stand-in API and the scene's fallbacks. */

export const ZONES = ["waterfront", "old-town", "central", "park", "east", "campus"] as const;

export const SEED_STATIONS: Station[] = [
  { id: "st-01", name: "Harbour Gate", zone: "waterfront", capacity: 12, x: 14, y: 30 },
  { id: "st-02", name: "Mill Lane", zone: "old-town", capacity: 10, x: 34, y: 16 },
  { id: "st-03", name: "Tram Depot", zone: "central", capacity: 14, x: 50, y: 46 },
  { id: "st-04", name: "Botanic Steps", zone: "park", capacity: 8, x: 30, y: 74 },
  { id: "st-05", name: "Foundry Square", zone: "east", capacity: 10, x: 82, y: 26 },
  { id: "st-06", name: "Lantern Bridge", zone: "waterfront", capacity: 12, x: 20, y: 54 },
  { id: "st-07", name: "University Row", zone: "campus", capacity: 16, x: 72, y: 70 },
  { id: "st-08", name: "Rail Hall", zone: "central", capacity: 20, x: 62, y: 38 },
];

type BikeSeed = [id: string, station: string, kind: "classic" | "electric", battery: number | null, status?: Bike["status"]];

const BIKE_SEED: BikeSeed[] = [
  ["bk-101", "st-01", "classic", null],
  ["bk-102", "st-01", "electric", 88],
  ["bk-103", "st-01", "classic", null],
  ["bk-104", "st-01", "electric", 41],
  ["bk-105", "st-02", "classic", null],
  ["bk-106", "st-02", "electric", 93],
  ["bk-107", "st-02", "classic", null, "service"],
  ["bk-108", "st-03", "electric", 76],
  ["bk-109", "st-03", "classic", null],
  ["bk-110", "st-03", "classic", null],
  ["bk-111", "st-03", "electric", 12],
  ["bk-112", "st-03", "electric", 100],
  ["bk-113", "st-04", "classic", null],
  ["bk-114", "st-04", "electric", 67],
  ["bk-115", "st-05", "classic", null],
  ["bk-116", "st-05", "electric", 55],
  ["bk-117", "st-05", "classic", null],
  ["bk-118", "st-06", "electric", 90],
  ["bk-119", "st-06", "classic", null],
  ["bk-120", "st-06", "classic", null],
  ["bk-121", "st-07", "electric", 72],
  ["bk-122", "st-07", "classic", null],
  ["bk-123", "st-08", "electric", 34],
  ["bk-124", "st-08", "classic", null],
];

export interface Rider {
  id: string;
  name: string;
  role: "rider" | "mechanic" | "admin";
  pin: string;
}

export const RIDERS: Rider[] = [
  { id: "u-ana", name: "Ana Whitlock", role: "rider", pin: "4821" },
  { id: "u-ben", name: "Ben Okafor", role: "rider", pin: "7390" },
  { id: "u-mia", name: "Mia Tanaka", role: "mechanic", pin: "1156" },
  { id: "u-root", name: "Rae Calder", role: "admin", pin: "9034" },
];

type RentalSeed = [id: string, rider: string, bike: string, from: string, to: string, hoursAgo: number, minutes: number];

const RENTAL_SEED: RentalSeed[] = [
  ["rt-1001", "u-ana", "bk-102", "st-01", "st-03", 52, 18],
  ["rt-1002", "u-ben", "bk-109", "st-03", "st-08", 47, 9],
  ["rt-1003", "u-ana", "bk-114", "st-04", "st-06", 30, 26],
  ["rt-1004", "u-mia", "bk-121", "st-07", "st-07", 26, 6],
  ["rt-1005", "u-ben", "bk-116", "st-05", "st-02", 20, 31],
  ["rt-1006", "u-ana", "bk-123", "st-08", "st-03", 9, 14],
  ["rt-1007", "u-ben", "bk-105", "st-02", "st-01", 3, 22],
];

/** Mutable copy of the world, one per API instance. */
export class Store {
  stations: Station[] = SEED_STATIONS.map((s) => ({ ...s }));
  bikes: Bike[] = BIKE_SEED.map(([id, stationId, kind, battery, status]) => ({ id, stationId, kind, battery, status: status ?? "available" }));
  rentals: Rental[];
  nextStation = 9;
  nextRental = 1008;

  constructor(now: number) {
    this.rentals = RENTAL_SEED.map(([id, riderId, bikeId, fromStationId, toStationId, hoursAgo, minutes]) => {
      const startedAt = now - hoursAgo * 3_600_000;
      return { id, riderId, bikeId, fromStationId, toStationId, startedAt: new Date(startedAt).toISOString(), returnedAt: new Date(startedAt + minutes * 60_000).toISOString() };
    });
  }
}
