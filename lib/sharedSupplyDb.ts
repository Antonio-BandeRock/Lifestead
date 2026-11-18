// Reading and writing a bottle two partners take from. The arithmetic and
// the reasons are in lib/sharedSupply.ts; the tables are described in
// lib/db.ts beside their CREATE statements; what crosses to the partner is
// the sharedSupplies area in lib/peerRelationships.ts.
//
// This file never imports lib/medDetailsDb.ts: that file reads the doses and
// calls in here to write them, so the two never import each other.
import { listPartners, type Connection } from './connections';
import { getDatabase } from './db';
import type { DoseAhead } from './medSupply';
import type { SharedBottle, TakenDose } from './sharedSupply';

export type SharedBottleRow = SharedBottle & { endedAt: string | null; updatedAt: string };

export type SharedUseRow = {
  id: string;
  supplyId: string;
  treatmentId: string;
  taken: TakenDose[];
  ahead: DoseAhead[] | null;
  through: string | null;
  ends: boolean;
  updatedAt: string;
};

export type SharedLink = { supplyId: string; treatmentId: string | null; answer: 'joined' | 'declined' };

export type SharedState = {
  bottles: Map<string, SharedBottleRow>;
  uses: SharedUseRow[];
  links: Map<string, SharedLink>;
};

type BottleDbRow = {
  id: string;
  name: string;
  unit: string | null;
  on_hand: number | null;
  counted_at: string | null;
  lead_days: number;
  updated_at: string;
  ended_at: string | null;
};

type UseDbRow = {
  id: string;
  supply_id: string;
  treatment_id: string;
  taken_json: string;
  ahead_json: string | null;
  through: string | null;
  ends: number;
  updated_at: string;
};

function parseList<T>(text: string | null): T[] | null {
  if (text === null) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function localNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** The partner a bottle is shared with: the first by name, as meal planning does. */
export async function getSharingPartner(): Promise<Connection | null> {
  try {
    return (await listPartners())[0] ?? null;
  } catch {
    return null;
  }
}

export async function readSharedState(): Promise<SharedState> {
  const db = await getDatabase();
  const [bottles, uses, links] = await Promise.all([
    db.getAllAsync<BottleDbRow>('SELECT id, name, unit, on_hand, counted_at, lead_days, updated_at, ended_at FROM shared_supplies'),
    db.getAllAsync<UseDbRow>('SELECT * FROM shared_supply_use'),
    db.getAllAsync<{ supply_id: string; treatment_id: string | null; answer: string }>(
      'SELECT supply_id, treatment_id, answer FROM shared_supply_links',
    ),
  ]);
  return {
    bottles: new Map(
      bottles.map((row) => [
        row.id,
        {
          id: row.id,
          name: row.name,
          unit: row.unit,
          onHand: row.on_hand,
          countedAt: row.counted_at,
          leadDays: row.lead_days,
          endedAt: row.ended_at,
          updatedAt: row.updated_at,
        },
      ]),
    ),
    uses: uses.map((row) => ({
      id: row.id,
      supplyId: row.supply_id,
      treatmentId: row.treatment_id,
      taken: parseList<TakenDose>(row.taken_json) ?? [],
      ahead: parseList<DoseAhead>(row.ahead_json),
      through: row.through,
      ends: row.ends === 1,
      updatedAt: row.updated_at,
    })),
    links: new Map(
      links.map((row) => [
        row.supply_id,
        { supplyId: row.supply_id, treatmentId: row.treatment_id, answer: row.answer === 'joined' ? 'joined' : 'declined' },
      ]),
    ),
  };
}

/** The bottle one of this person's meds takes from, while it is still shared. */
export async function bottleForTreatment(treatmentId: string): Promise<SharedBottleRow | null> {
  const state = await readSharedState();
  for (const link of state.links.values()) {
    if (link.answer !== 'joined' || link.treatmentId !== treatmentId) continue;
    const bottle = state.bottles.get(link.supplyId);
    if (bottle && !bottle.endedAt) return bottle;
  }
  return null;
}

async function writeLink(supplyId: string, treatmentId: string | null, answer: 'joined' | 'declined'): Promise<void> {
  const db = await getDatabase();
  const stamp = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO shared_supply_links (supply_id, treatment_id, answer, answered_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(supply_id) DO UPDATE SET treatment_id = excluded.treatment_id, answer = excluded.answer,
       answered_at = excluded.answered_at, updated_at = excluded.updated_at`,
    supplyId,
    treatmentId,
    answer,
    stamp,
    stamp,
  );
}

/** Marks one of this person's meds as taking from a bottle shared with their partner. */
export async function shareBottle(
  treatmentId: string,
  name: string,
  count: { onHand: number; unit: string | null; leadDays: number },
): Promise<string> {
  const db = await getDatabase();
  const id = `bottle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    `INSERT INTO shared_supplies (id, name, unit, on_hand, counted_at, lead_days, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    name.trim(),
    count.unit?.trim() || null,
    count.onHand,
    localNow(),
    Math.max(0, Math.round(count.leadDays)),
    new Date().toISOString(),
  );
  await writeLink(id, treatmentId, 'joined');
  return id;
}

/** A fresh count of a shared bottle, from either phone. Dated now, so both people's doses from here on draw it down. */
export async function saveBottleCount(supplyId: string, count: { onHand: number; unit: string | null; leadDays: number }): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE shared_supplies SET on_hand = ?, unit = ?, counted_at = ?, lead_days = ?, updated_at = ? WHERE id = ?',
    count.onHand,
    count.unit?.trim() || null,
    localNow(),
    Math.max(0, Math.round(count.leadDays)),
    new Date().toISOString(),
    supplyId,
  );
}

/** This person says which of their meds takes from a bottle their partner shared. */
export async function joinBottle(supplyId: string, treatmentId: string): Promise<void> {
  await writeLink(supplyId, treatmentId, 'joined');
}

/** This person says a bottle their partner shared is not one they take from. */
export async function declineBottle(supplyId: string): Promise<void> {
  await writeLink(supplyId, null, 'declined');
}

/**
 * Stop sharing, from either phone. The bottle is kept with ended_at set, and
 * each person's med goes back to its own count.
 */
export async function stopSharingBottle(supplyId: string): Promise<void> {
  const db = await getDatabase();
  const stamp = new Date().toISOString();
  await db.runAsync('UPDATE shared_supplies SET ended_at = ?, updated_at = ? WHERE id = ?', stamp, stamp, supplyId);
}

/**
 * Writes this person's line of use on a bottle, only when it changed, so a
 * reading that changes nothing sends nothing to the partner.
 */
export async function writeMyUse(
  existing: SharedUseRow | undefined,
  line: { supplyId: string; treatmentId: string; taken: TakenDose[]; ahead: DoseAhead[] | null; through: string | null; ends: boolean },
): Promise<void> {
  const takenJson = JSON.stringify(line.taken);
  const aheadJson = line.ahead === null ? null : JSON.stringify(line.ahead);
  if (
    existing &&
    JSON.stringify(existing.taken) === takenJson &&
    (existing.ahead === null ? null : JSON.stringify(existing.ahead)) === aheadJson &&
    existing.through === line.through &&
    existing.ends === line.ends
  ) {
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO shared_supply_use (id, supply_id, treatment_id, taken_json, ahead_json, through, ends, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET taken_json = excluded.taken_json, ahead_json = excluded.ahead_json,
       through = excluded.through, ends = excluded.ends, updated_at = excluded.updated_at`,
    `${line.supplyId}:${line.treatmentId}`,
    line.supplyId,
    line.treatmentId,
    takenJson,
    aheadJson,
    line.through,
    line.ends ? 1 : 0,
    new Date().toISOString(),
  );
}

/**
 * Bottles the partner shared that this person has not answered yet: not
 * ended, no answer on this person's side, and none of this person's meds
 * already taking from it.
 */
export async function listBottlesToAnswer(): Promise<SharedBottleRow[]> {
  try {
    const state = await readSharedState();
    return [...state.bottles.values()].filter((bottle) => !bottle.endedAt && !state.links.has(bottle.id));
  } catch {
    return [];
  }
}
