// The records behind lib/peerBeside.ts (1.0.80.3). Both sides live here:
//
//   Sending: what this person shares about themselves, read from their own
//   tables only for the kinds they have switched on for that link. A kind
//   that cannot be read this time (the vault closed) is left out, so the
//   other phone keeps its copy rather than losing it.
//
//   Showing: the latest of each kind a partner sent (peer_beside, replaced
//   on every arrival, since their send is their state), read by the bands
//   beside this person's own records. Device-local (DEVICE_LOCAL_TABLES).
import type { Connection } from './connections';
import { getDatabase } from './db';
import {
  BESIDE_KINDS,
  BESIDE_LIST_LIMIT,
  besideHasAnything,
  cleanBesidePart,
  type BesideBodies,
  type BesideKind,
} from './peerBeside';

const MED_TYPES = ['supplement', 'prescription', 'otc'];

function localDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function joinAmount(amount: number | string | null, unit: string | null): string | null {
  if (amount === null || amount === undefined || amount === '') return null;
  return unit ? `${amount} ${unit}` : String(amount);
}

const READERS: { [K in BesideKind]: () => Promise<BesideBodies[K]> } = {
  meds: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      kind: string;
      amount: number | string | null;
      unit: string | null;
      frequency: string | null;
    }>(
      `SELECT id, name, treatment_type AS kind, dose_amount AS amount, dose_unit AS unit, frequency
       FROM treatments
       WHERE active = 1 AND treatment_type IN (${MED_TYPES.map(() => '?').join(', ')})
       ORDER BY name COLLATE NOCASE ASC
       LIMIT ${BESIDE_LIST_LIMIT}`,
      ...MED_TYPES,
    );
    // The clock times each is scheduled for, from the doses on the timeline
    // a week either side of today, so a med taken twice a day reads as two.
    const now = Date.now();
    const times = await db.getAllAsync<{ treatmentId: string; time: string }>(
      `SELECT DISTINCT linked_treatment_id AS treatmentId, substr(scheduled_for, 12, 5) AS time
       FROM schedule_items
       WHERE linked_treatment_id IS NOT NULL
         AND substr(scheduled_for, 1, 10) BETWEEN ? AND ?`,
      localDay(now - 7 * 86_400_000),
      localDay(now + 7 * 86_400_000),
    );
    const byTreatment = new Map<string, string[]>();
    for (const row of times) {
      const list = byTreatment.get(row.treatmentId) ?? [];
      list.push(row.time);
      byTreatment.set(row.treatmentId, list);
    }
    return rows.map((row) => ({
      name: row.name,
      kind: row.kind,
      amount: joinAmount(row.amount, row.unit),
      frequency: row.frequency,
      times: byTreatment.get(row.id) ?? [],
    }));
  },
  emergency: async () => {
    const db = await getDatabase();
    const profile = await db.getFirstAsync<{
      drug_allergies: string | null;
      blood_type: string | null;
      devices: string | null;
      doctor_name: string | null;
      doctor_phone: string | null;
      preferred_hospital: string | null;
      language: string | null;
      directive_location: string | null;
    }>(
      `SELECT drug_allergies, blood_type, devices, doctor_name, doctor_phone, preferred_hospital, language, directive_location
       FROM emergency_profile ORDER BY updated_at DESC LIMIT 1`,
    );
    const contacts = await db.getAllAsync<{ name: string; relationship: string | null; phone: string; is_primary: number }>(
      `SELECT name, relationship, phone, is_primary FROM emergency_contacts
       ORDER BY is_primary DESC, name COLLATE NOCASE ASC LIMIT ${BESIDE_LIST_LIMIT}`,
    );
    return {
      drugAllergies: profile?.drug_allergies ?? null,
      bloodType: profile?.blood_type ?? null,
      devices: profile?.devices ?? null,
      doctorName: profile?.doctor_name ?? null,
      doctorPhone: profile?.doctor_phone ?? null,
      hospital: profile?.preferred_hospital ?? null,
      language: profile?.language ?? null,
      directiveLocation: profile?.directive_location ?? null,
      contacts: contacts.map((row) => ({
        name: row.name,
        relationship: row.relationship,
        phone: row.phone,
        primary: Number(row.is_primary) === 1,
      })),
    };
  },
  appointments: async () => {
    const db = await getDatabase();
    // From today on, since a partner planning around somebody's week needs
    // what is coming, not what has been.
    const rows = await db.getAllAsync<{
      when: string;
      title: string;
      type: string | null;
      provider: string | null;
      place: string | null;
      status: string;
    }>(
      `SELECT scheduled_for AS "when", title, appointment_type AS type, provider_name AS provider, location AS place, status
       FROM schedule_items
       WHERE item_type = 'appointment' AND substr(scheduled_for, 1, 10) >= ?
       ORDER BY scheduled_for ASC
       LIMIT ${BESIDE_LIST_LIMIT}`,
      localDay(Date.now()),
    );
    return rows;
  },
  accounts: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ name: string; kind: string; balance: number; apr: number | null; minimum_payment: number | null }>(
      `SELECT name, kind, balance, apr, minimum_payment FROM finance_accounts
       WHERE active = 1 ORDER BY name COLLATE NOCASE ASC LIMIT ${BESIDE_LIST_LIMIT}`,
    );
    return rows.map((row) => ({ name: row.name, kind: row.kind, balance: row.balance, apr: row.apr, minimumPayment: row.minimum_payment }));
  },
  budgets: async () => {
    const db = await getDatabase();
    const budgets = await db.getAllAsync<{ category: string; monthly_limit: number }>(
      `SELECT category, monthly_limit FROM finance_budgets
       WHERE active = 1 ORDER BY category COLLATE NOCASE ASC LIMIT ${BESIDE_LIST_LIMIT}`,
    );
    const goals = await db.getAllAsync<{ name: string; reason: string | null; target_date: string | null; status: string }>(
      `SELECT name, reason, target_date, status FROM finance_goals
       WHERE status = 'active' ORDER BY target_date IS NULL, target_date ASC LIMIT ${BESIDE_LIST_LIMIT}`,
    );
    return {
      budgets: budgets.map((row) => ({ category: row.category, monthlyLimit: row.monthly_limit })),
      goals: goals.map((row) => ({ name: row.name, reason: row.reason, targetDate: row.target_date, status: row.status })),
    };
  },
  insurance: async () => {
    const db = await getDatabase();
    const plans = await db.getAllAsync<{ name: string; year_start: string; deductible: number | null; out_of_pocket_max: number | null }>(
      `SELECT name, year_start, deductible, out_of_pocket_max FROM finance_insurance_plans
       WHERE active = 1 ORDER BY year_start DESC LIMIT ${BESIDE_LIST_LIMIT}`,
    );
    const healthAccounts = await db.getAllAsync<{ kind: string; plan_year: string; contributed: number; spent: number; deadline: string | null }>(
      `SELECT kind, plan_year, contributed, spent, deadline FROM finance_health_accounts
       ORDER BY plan_year DESC LIMIT ${BESIDE_LIST_LIMIT}`,
    );
    return {
      plans: plans.map((row) => ({ name: row.name, yearStart: row.year_start, deductible: row.deductible, outOfPocketMax: row.out_of_pocket_max })),
      healthAccounts: healthAccounts.map((row) => ({
        kind: row.kind,
        planYear: row.plan_year,
        contributed: row.contributed,
        spent: row.spent,
        deadline: row.deadline,
      })),
    };
  },
};

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

/** What this phone shares about itself with one link, read only for the
 *  kinds switched on. lib/partnerSync.ts sends null for every other kind. */
export async function besidePartFor(partner: Connection): Promise<Partial<BesideBodies>> {
  const out: Partial<BesideBodies> = {};
  if (partner.role === 'recipe') return out;
  for (const kind of BESIDE_KINDS) {
    if (!partner.grants[kind]) continue;
    try {
      (out as Record<BesideKind, unknown>)[kind] = await READERS[kind]();
    } catch {
      // Left out rather than sent empty: the vault may be closed, and the
      // other phone keeps what it has until the next send that can read.
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Showing
// ---------------------------------------------------------------------------

/** Stores what arrived. True when anything changed. */
export async function applyPeerBeside(connectionId: string, payload: { beside?: unknown; sentAt: string }): Promise<boolean> {
  const part = cleanBesidePart(payload.beside);
  if (part === undefined) return false;
  const db = await getDatabase();
  let changed = false;
  for (const kind of BESIDE_KINDS) {
    if (!(kind in part)) continue;
    const body = part[kind];
    const before = await db.getFirstAsync<{ body_json: string }>(
      'SELECT body_json FROM peer_beside WHERE connection_id = ? AND kind = ?',
      connectionId,
      kind,
    );
    if (body === null || body === undefined) {
      if (before) {
        await db.runAsync('DELETE FROM peer_beside WHERE connection_id = ? AND kind = ?', connectionId, kind);
        changed = true;
      }
      continue;
    }
    const json = JSON.stringify(body);
    await db.runAsync(
      `INSERT INTO peer_beside (connection_id, kind, body_json, sent_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(connection_id, kind) DO UPDATE SET body_json = excluded.body_json, sent_at = excluded.sent_at, updated_at = excluded.updated_at`,
      connectionId,
      kind,
      json,
      payload.sentAt,
      new Date().toISOString(),
    );
    if (before?.body_json !== json) changed = true;
  }
  return changed;
}

export type BesidePerson<K extends BesideKind> = { connectionId: string; name: string; sentAt: string; body: BesideBodies[K] };

/**
 * Everyone who has shared this kind and whose side is shown on this phone
 * (show_theirs), with something in it.
 */
export async function listBeside<K extends BesideKind>(kind: K): Promise<BesidePerson<K>[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ connection_id: string; name: string; sent_at: string; body_json: string; show_theirs: number | null }>(
      `SELECT b.connection_id, c.name, b.sent_at, b.body_json, c.show_theirs
       FROM peer_beside b JOIN connections c ON c.id = b.connection_id
       WHERE b.kind = ?
       ORDER BY c.name COLLATE NOCASE ASC`,
      kind,
    );
    const out: BesidePerson<K>[] = [];
    for (const row of rows) {
      if (row.show_theirs != null && Number(row.show_theirs) !== 1) continue;
      let body: BesideBodies[K] | null | undefined;
      try {
        body = cleanBesidePart({ [kind]: JSON.parse(row.body_json) })?.[kind] as BesideBodies[K] | null | undefined;
      } catch {
        body = null;
      }
      if (!body || !besideHasAnything(kind, body)) continue;
      out.push({ connectionId: row.connection_id, name: row.name, sentAt: row.sent_at, body });
    }
    return out;
  } catch {
    // Nothing shared is a fine thing to show.
    return [];
  }
}

/** Everything one link shared about themselves, when the link goes. */
export async function clearPeerBeside(connectionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM peer_beside WHERE connection_id = ?', connectionId);
}
