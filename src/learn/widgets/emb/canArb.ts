/**
 * Pure logic for the emb-can widget: CAN bitwise arbitration on the 11-bit identifier of a classic (CAN 2.0A) frame.
 * Dominant = 0 (pair driven apart), recessive = 1 (not driven). The bus is the AND of every bit sent (wired-AND).
 * A node that sends recessive but reads dominant has lost and stops at once; the lowest ID wins.
 * Checked under Node (no imports).
 */

export const CAN_ID_BITS = 11;
export const CAN_MAX_ID = 0x7ff;

export interface CanNodeIn {
  id: string;
  name: string;
  canId: number;
}

export interface CanBitRow {
  /** Bit index in the identifier: 10 (first on the wire) down to 0. */
  bit: number;
  /** Bus level after the wired-AND of everyone still sending (0 = dominant, 1 = recessive). */
  bus: 0 | 1;
  /** What each node sends in this bit slot, or null if it already dropped out. Keyed by node id. */
  sent: Record<string, 0 | 1 | null>;
}

export type CanResult =
  | { ok: false; error: string }
  | {
      ok: true;
      rows: CanBitRow[];
      /** Bit index where each node backed off (sent 1, read 0), or null if it never did. */
      lostAt: Record<string, number | null>;
      /** Node ids still sending after the 11th bit. One normally; more than one only with equal IDs. */
      survivors: string[];
      /** Winner node id, or null when nobody wins cleanly (equal IDs). */
      winner: string | null;
      /** True if any two nodes share an ID (a network-plan error: IDs must be unique). */
      duplicate: boolean;
    };

export function isValidCanId(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= CAN_MAX_ID;
}

/** Run arbitration for nodes that all start sending at the same moment. */
export function arbitrate(nodes: CanNodeIn[]): CanResult {
  if (nodes.length === 0) return { ok: false, error: "No nodes" };
  for (const n of nodes) {
    if (!isValidCanId(n.canId)) return { ok: false, error: `${n.name}: an 11-bit ID is 0x000 to 0x7FF` };
  }
  const active = new Set(nodes.map((n) => n.id));
  const lostAt: Record<string, number | null> = Object.fromEntries(nodes.map((n) => [n.id, null]));
  const rows: CanBitRow[] = [];
  for (let bit = CAN_ID_BITS - 1; bit >= 0; bit--) {
    const sent: Record<string, 0 | 1 | null> = {};
    let bus: 0 | 1 = 1;
    for (const n of nodes) {
      if (!active.has(n.id)) {
        sent[n.id] = null;
        continue;
      }
      const b = ((n.canId >> bit) & 1) as 0 | 1;
      sent[n.id] = b;
      if (b === 0) bus = 0;
    }
    // Every node listens while it sends: recessive sent, dominant read = lost.
    for (const n of nodes) {
      if (active.has(n.id) && sent[n.id] === 1 && bus === 0) {
        active.delete(n.id);
        lostAt[n.id] = bit;
      }
    }
    rows.push({ bit, bus, sent });
  }
  const survivors = nodes.filter((n) => active.has(n.id)).map((n) => n.id);
  const ids = nodes.map((n) => n.canId);
  const duplicate = new Set(ids).size !== ids.length;
  const winner = survivors.length === 1 ? survivors[0] : null;
  return { ok: true, rows, lostAt, survivors, winner, duplicate };
}

export function hex3(n: number): string {
  return "0x" + n.toString(16).toUpperCase().padStart(3, "0");
}
