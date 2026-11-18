// Reading and writing what is on hand of a med and who fills and prescribes
// it (A3 and A6, Phase 2). The arithmetic and every sentence are in
// lib/medSupply.ts.

import { getDatabase } from './db';
import {
  addDays,
  readSupply,
  unitsForDose,
  type DoseAhead,
  type ScheduleAhead,
  type SupplyReading,
  type SupplyStep,
} from './medSupply';
import { occurrencesOf, weekdaysFromColumn, type RepeatConfig, type RepeatEndType } from './repeatRule';
import { combineSharedSupply, describeSharedUse, type SharedUse, type TakenDose } from './sharedSupply';
import { getSharingPartner, readSharedState, writeMyUse } from './sharedSupplyDb';

export type TreatmentDetails = {
  treatmentId: string;
  supplyOnHand: number | null;
  supplyUnit: string | null;
  supplyPerDose: number;
  supplyCountedAt: string | null;
  refillLeadDays: number;
  pharmacyName: string | null;
  pharmacyPhone: string | null;
  prescriberName: string | null;
  prescriberPhone: string | null;
};

type Row = {
  treatment_id: string;
  supply_on_hand: number | null;
  supply_unit: string | null;
  supply_per_dose: number;
  supply_counted_at: string | null;
  refill_lead_days: number;
  pharmacy_name: string | null;
  pharmacy_phone: string | null;
  prescriber_name: string | null;
  prescriber_phone: string | null;
};

const TAKEN = "('logged', 'partial', 'replaced')";

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function localNow(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function localToday(): string {
  return localNow().slice(0, 10);
}

function fromRow(row: Row): TreatmentDetails {
  return {
    treatmentId: row.treatment_id,
    supplyOnHand: row.supply_on_hand,
    supplyUnit: row.supply_unit,
    supplyPerDose: row.supply_per_dose,
    supplyCountedAt: row.supply_counted_at,
    refillLeadDays: row.refill_lead_days,
    pharmacyName: row.pharmacy_name,
    pharmacyPhone: row.pharmacy_phone,
    prescriberName: row.prescriber_name,
    prescriberPhone: row.prescriber_phone,
  };
}

export function blankDetails(treatmentId: string): TreatmentDetails {
  return {
    treatmentId,
    supplyOnHand: null,
    supplyUnit: null,
    supplyPerDose: 1,
    supplyCountedAt: null,
    refillLeadDays: 7,
    pharmacyName: null,
    pharmacyPhone: null,
    prescriberName: null,
    prescriberPhone: null,
  };
}

export async function listTreatmentDetails(): Promise<Map<string, TreatmentDetails>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>('SELECT * FROM treatment_details');
  return new Map(rows.map((row) => [row.treatment_id, fromRow(row)]));
}

async function ensureRow(treatmentId: string) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR IGNORE INTO treatment_details (treatment_id, updated_at) VALUES (?, ?)',
    treatmentId,
    new Date().toISOString(),
  );
}

/** Saves a fresh count. The count is dated now, so doses marked from here on
 *  are what draw it down. Null clears the count. */
export async function saveTreatmentSupply(
  treatmentId: string,
  input: { onHand: number | null; unit: string | null; perDose: number; leadDays: number },
): Promise<void> {
  await ensureRow(treatmentId);
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE treatment_details
     SET supply_on_hand = ?, supply_unit = ?, supply_per_dose = ?, supply_counted_at = ?, refill_lead_days = ?, updated_at = ?
     WHERE treatment_id = ?`,
    input.onHand,
    input.unit?.trim() || null,
    input.perDose > 0 ? input.perDose : 1,
    input.onHand === null ? null : localNow(),
    Math.max(0, Math.round(input.leadDays)),
    new Date().toISOString(),
    treatmentId,
  );
}

export async function saveTreatmentContacts(
  treatmentId: string,
  input: { pharmacyName: string; pharmacyPhone: string; prescriberName: string; prescriberPhone: string },
): Promise<void> {
  await ensureRow(treatmentId);
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE treatment_details
     SET pharmacy_name = ?, pharmacy_phone = ?, prescriber_name = ?, prescriber_phone = ?, updated_at = ?
     WHERE treatment_id = ?`,
    input.pharmacyName.trim() || null,
    input.pharmacyPhone.trim() || null,
    input.prescriberName.trim() || null,
    input.prescriberPhone.trim() || null,
    new Date().toISOString(),
    treatmentId,
  );
}

async function countDoses(treatmentId: string, where: string, ...args: string[]): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM schedule_items WHERE linked_treatment_id = ? AND ${where}`,
    treatmentId,
    ...args,
  );
  return row?.n ?? 0;
}

// How far ahead the doses are walked: a year covers any count kept on hand.
const AHEAD_DAYS = 366;

type SeriesRow = {
  repeat_type: string;
  repeat_end_type: string | null;
  repeat_count: number | null;
  repeat_until: string | null;
  repeat_interval: number | null;
  repeat_weekdays: string | null;
  repeat_start: string | null;
  first_scheduled_for: string;
  latest_scheduled_for: string;
};

/**
 * Every dose of one med from now on (Q12): the schedule's rows as they stand,
 * then each series carried on by its repeat rule past the rows laid out so
 * far, each at the amount its day's taper step sets. Null when the med has
 * nothing on the schedule ahead, so the reading falls back to recent marks.
 */
async function readScheduleAhead(details: TreatmentDetails, today: string, now: string): Promise<ScheduleAhead | null> {
  const db = await getDatabase();
  const through = addDays(today, AHEAD_DAYS);
  const [rows, series, steps, med] = await Promise.all([
    db.getAllAsync<{ scheduled_for: string }>(
      `SELECT scheduled_for FROM schedule_items
       WHERE linked_treatment_id = ? AND scheduled_for >= ? AND substr(scheduled_for, 1, 10) <= ?
         AND status NOT IN ('skipped', 'cancelled', 'logged', 'partial', 'replaced')`,
      details.treatmentId,
      now,
      through,
    ),
    db.getAllAsync<SeriesRow>(
      `SELECT repeat_type, repeat_end_type, repeat_count, repeat_until, repeat_interval, repeat_weekdays, repeat_start,
              MIN(scheduled_for) AS first_scheduled_for, MAX(scheduled_for) AS latest_scheduled_for
       FROM schedule_items
       WHERE linked_treatment_id = ? AND repeat_type IS NOT NULL AND repeat_type <> 'none' AND repeat_group_id IS NOT NULL
       GROUP BY repeat_group_id`,
      details.treatmentId,
    ),
    db.getAllAsync<{ start_date: string; end_date: string; dose_amount: number; dose_unit: string | null }>(
      'SELECT start_date, end_date, dose_amount, dose_unit FROM treatment_taper_steps WHERE treatment_id = ? ORDER BY start_date',
      details.treatmentId,
    ),
    db.getFirstAsync<{ dose_amount: number | null; dose_unit: string | null }>(
      'SELECT dose_amount, dose_unit FROM treatments WHERE id = ?',
      details.treatmentId,
    ),
  ]);

  const dates: string[] = rows.map((row) => row.scheduled_for.slice(0, 10));
  let ends = true;
  for (const group of series) {
    const rule: RepeatConfig = {
      type: group.repeat_type as RepeatConfig['type'],
      endType: (group.repeat_end_type as RepeatEndType | null) ?? 'indefinite',
      count: group.repeat_count ?? undefined,
      until: group.repeat_until ?? undefined,
      interval: group.repeat_interval ?? undefined,
      weekdays: weekdaysFromColumn(group.repeat_weekdays),
    };
    const anchor = group.repeat_start ?? group.first_scheduled_for.slice(0, 10);
    const latest = group.latest_scheduled_for.slice(0, 10);
    const after = latest > today ? latest : addDays(today, -1);
    for (const next of occurrencesOf(anchor, rule, { after, through })) {
      if (next.date <= through && next.date >= today) dates.push(next.date);
    }
    if (occurrencesOf(anchor, rule, { after: through, through: addDays(through, AHEAD_DAYS) }).length > 0) ends = false;
  }
  if (dates.length === 0) return null;
  dates.sort();

  const supplySteps: SupplyStep[] = steps.map((step) => ({
    startDate: step.start_date,
    endDate: step.end_date,
    amount: step.dose_amount,
    unit: step.dose_unit,
  }));
  let tapered = false;
  let unconverted: { stepUnit: string } | null = null;
  const doses: DoseAhead[] = dates.map((date) => {
    const dose = unitsForDose(date, {
      perDose: details.supplyPerDose,
      unit: details.supplyUnit,
      medAmount: med?.dose_amount ?? null,
      medUnit: med?.dose_unit ?? null,
      steps: supplySteps,
    });
    if (dose.tapered) tapered = true;
    if (!dose.converted && !unconverted) unconverted = { stepUnit: dose.stepUnit ?? 'another unit' };
    return { date, units: dose.units };
  });
  return { doses, through, ends, tapered, unconverted };
}

/** What is left of one med, worked out from its count and its marks. */
export async function readTreatmentSupply(details: TreatmentDetails, today = localToday()): Promise<SupplyReading> {
  const now = localNow();
  const [takenSinceCount, dueNext7Days, takenPast14Days] = details.supplyCountedAt
    ? await Promise.all([
        countDoses(details.treatmentId, `status IN ${TAKEN} AND scheduled_for >= ? AND scheduled_for <= ?`, details.supplyCountedAt, now),
        countDoses(
          details.treatmentId,
          "status NOT IN ('skipped', 'cancelled') AND substr(scheduled_for, 1, 10) >= ? AND substr(scheduled_for, 1, 10) < ?",
          today,
          addDays(today, 7),
        ),
        countDoses(
          details.treatmentId,
          `status IN ${TAKEN} AND substr(scheduled_for, 1, 10) >= ? AND substr(scheduled_for, 1, 10) < ?`,
          addDays(today, -14),
          today,
        ),
      ])
    : [0, 0, 0];
  const schedule = details.supplyCountedAt ? await readScheduleAhead(details, today, now) : null;
  return readSupply({
    onHand: details.supplyOnHand,
    unit: details.supplyUnit,
    perDose: details.supplyPerDose,
    countedAt: details.supplyCountedAt,
    takenSinceCount,
    dueNext7Days,
    takenPast14Days,
    today,
    leadDays: details.refillLeadDays,
    schedule,
  });
}

/** Every counted med's reading, for My Meds and the refill reminder. */
export async function listSupplyReadings(today = localToday()): Promise<Map<string, SupplyReading>> {
  const details = await listTreatmentDetails();
  const out = new Map<string, SupplyReading>();
  for (const item of details.values()) {
    if (item.supplyOnHand === null) continue;
    out.set(item.treatmentId, await readTreatmentSupply(item, today));
  }
  try {
    await overlaySharedBottles(out, details, today);
  } catch (error) {
    // A shared bottle that cannot be read leaves each med on its own count,
    // which is what it showed before the bottle was shared.
    console.error('[medDetails] could not read the shared bottles', error);
  }
  return out;
}

/**
 * One person's use of a shared bottle: the doses of this med marked taken
 * since `from`, and the doses ahead, each in units of the bottle at what one
 * of this person's doses uses (half a tablet is 0.5).
 */
async function readUseOfBottle(details: TreatmentDetails, from: string, today: string, now: string) {
  const db = await getDatabase();
  const [rows, steps, med] = await Promise.all([
    db.getAllAsync<{ scheduled_for: string }>(
      `SELECT scheduled_for FROM schedule_items
       WHERE linked_treatment_id = ? AND status IN ${TAKEN} AND scheduled_for >= ? AND scheduled_for <= ?
       ORDER BY scheduled_for`,
      details.treatmentId,
      from,
      now,
    ),
    db.getAllAsync<{ start_date: string; end_date: string; dose_amount: number; dose_unit: string | null }>(
      'SELECT start_date, end_date, dose_amount, dose_unit FROM treatment_taper_steps WHERE treatment_id = ? ORDER BY start_date',
      details.treatmentId,
    ),
    db.getFirstAsync<{ dose_amount: number | null; dose_unit: string | null }>(
      'SELECT dose_amount, dose_unit FROM treatments WHERE id = ?',
      details.treatmentId,
    ),
  ]);
  const supplySteps: SupplyStep[] = steps.map((step) => ({
    startDate: step.start_date,
    endDate: step.end_date,
    amount: step.dose_amount,
    unit: step.dose_unit,
  }));
  const taken: TakenDose[] = rows.map((row) => ({
    at: row.scheduled_for.slice(0, 16),
    units: unitsForDose(row.scheduled_for.slice(0, 10), {
      perDose: details.supplyPerDose,
      unit: details.supplyUnit,
      medAmount: med?.dose_amount ?? null,
      medUnit: med?.dose_unit ?? null,
      steps: supplySteps,
    }).units,
  }));
  const schedule = await readScheduleAhead(details, today, now);
  return { taken, schedule };
}

/**
 * A med that takes from a bottle shared with a partner (lib/sharedSupply.ts)
 * reads the bottle, not its own count: the count minus what both people
 * marked taken since, at both people's pace. This phone's own line of use is
 * written here, only when it changed, so the partner's phone reads the same
 * sum and both get the low reminder.
 */
async function overlaySharedBottles(
  out: Map<string, SupplyReading>,
  details: Map<string, TreatmentDetails>,
  today: string,
): Promise<void> {
  const state = await readSharedState();
  const joined = [...state.links.values()].filter((link) => link.answer === 'joined' && link.treatmentId);
  if (joined.length === 0) return;
  const now = localNow();
  const partner = await getSharingPartner();
  const partnerName = partner?.name ?? null;
  const mine = new Set(joined.map((link) => link.treatmentId as string));
  for (const link of joined) {
    const bottle = state.bottles.get(link.supplyId);
    if (!bottle || bottle.endedAt) continue;
    const treatmentId = link.treatmentId as string;
    const own = details.get(treatmentId) ?? blankDetails(treatmentId);
    const counted = bottle.countedAt ?? `${today}T00:00`;
    const fortnight = `${addDays(today, -14)}T00:00`;
    const from = counted < fortnight ? counted : fortnight;
    const use = await readUseOfBottle(own, from, today, now);
    const line = {
      supplyId: bottle.id,
      treatmentId,
      taken: use.taken,
      ahead: use.schedule ? use.schedule.doses : null,
      through: use.schedule ? use.schedule.through : null,
      ends: use.schedule ? use.schedule.ends : true,
    };
    const existing = state.uses.find((row) => row.supplyId === bottle.id && row.treatmentId === treatmentId);
    try {
      await writeMyUse(existing, line);
    } catch (error) {
      // Another of this person's devices holds the session: the reading
      // here is still right, and that device writes the line.
      console.error("[medDetails] could not write this phone's use of a shared bottle", error);
    }
    const uses: SharedUse[] = [
      { who: 'you', mine: true, ...line, updatedAt: new Date().toISOString() },
      ...state.uses
        .filter((row) => row.supplyId === bottle.id && !mine.has(row.treatmentId))
        .map((row) => ({
          who: partnerName ?? 'Your partner',
          mine: false,
          taken: row.taken,
          ahead: row.ahead,
          through: row.through,
          ends: row.ends,
          updatedAt: row.updatedAt,
        })),
    ];
    const reading = readSupply(combineSharedSupply({ bottle, uses, today, now }));
    const words = describeSharedUse({ uses, unit: bottle.unit, today, partnerName });
    out.set(treatmentId, {
      ...reading,
      short: reading.short ? `${reading.short}, shared` : 'Shared, not counted yet',
      sentence: `${reading.sentence} ${words}`,
    });
  }
}
