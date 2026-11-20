// Reading and writing dose groups (lib/doseGroups.ts holds the rules).
//
// A group is retired, never deleted, and so is a member that leaves, so a
// past reminder's group still has a name. Changing a group's time moves its
// members' planned doses from today on to the new time, which is also what
// the next stretch of each repeating series continues from
// (ensureScheduleSeriesGenerated in lib/db.ts reads the latest row's time).

import { getDatabase } from './db';
import type { DoseGroup, DoseGroupMember } from './doseGroups';

const DECLINED_KEY = 'dose_group_offer_declined';

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function listDoseGroups(includeRetired = false): Promise<DoseGroup[]> {
  const db = await getDatabase();
  return db.getAllAsync<DoseGroup>(
    `SELECT id, name, time_of_day AS timeOfDay, retired_at AS retiredAt FROM dose_groups
     ${includeRetired ? '' : 'WHERE retired_at IS NULL'} ORDER BY time_of_day ASC, name ASC`,
  );
}

export async function listDoseGroupMembers(): Promise<DoseGroupMember[]> {
  const db = await getDatabase();
  return db.getAllAsync<DoseGroupMember>(
    `SELECT id, group_id AS groupId, treatment_id AS treatmentId, retired_at AS retiredAt FROM dose_group_members WHERE retired_at IS NULL`,
  );
}

export async function getDoseGroup(id: string): Promise<DoseGroup | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DoseGroup>(
    `SELECT id, name, time_of_day AS timeOfDay, retired_at AS retiredAt FROM dose_groups WHERE id = ?`,
    id,
  );
}

/** Makes a group at a time with these meds in it. Returns its id, or null for an empty name. */
export async function createDoseGroup(name: string, timeOfDay: string, treatmentIds: string[]): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed || !/^\d\d:\d\d$/.test(timeOfDay)) return null;
  const db = await getDatabase();
  const id = newId('dgrp');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO dose_groups (id, name, time_of_day, retired_at, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?)`,
    id,
    trimmed,
    timeOfDay,
    now,
    now,
  );
  for (const treatmentId of treatmentIds) await addDoseGroupMember(id, treatmentId);
  return id;
}

export async function renameDoseGroup(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const db = await getDatabase();
  await db.runAsync(`UPDATE dose_groups SET name = ?, updated_at = ? WHERE id = ?`, trimmed, new Date().toISOString(), id);
}

/** Adds a med, or brings back one that had left. A med already in it is left alone. */
export async function addDoseGroupMember(groupId: string, treatmentId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await db.getFirstAsync<{ id: string; retiredAt: string | null }>(
    `SELECT id, retired_at AS retiredAt FROM dose_group_members WHERE group_id = ? AND treatment_id = ? ORDER BY added_at DESC LIMIT 1`,
    groupId,
    treatmentId,
  );
  if (existing && !existing.retiredAt) return;
  if (existing) {
    await db.runAsync(`UPDATE dose_group_members SET retired_at = NULL, updated_at = ? WHERE id = ?`, now, existing.id);
    return;
  }
  await db.runAsync(
    `INSERT INTO dose_group_members (id, group_id, treatment_id, added_at, retired_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?)`,
    newId('dgm'),
    groupId,
    treatmentId,
    now,
    now,
  );
}

/** Takes a med out of a group. Its doses stay where they are and get reminders of their own again. */
export async function removeDoseGroupMember(groupId: string, treatmentId: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE dose_group_members SET retired_at = ?, updated_at = ? WHERE group_id = ? AND treatment_id = ? AND retired_at IS NULL`,
    now,
    now,
    groupId,
    treatmentId,
  );
}

/** Retires a group. Its meds keep their doses and their times, each with a reminder of its own. */
export async function retireDoseGroup(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE dose_groups SET retired_at = ?, updated_at = ? WHERE id = ?`, now, now, id);
  await db.runAsync(`UPDATE dose_group_members SET retired_at = ?, updated_at = ? WHERE group_id = ? AND retired_at IS NULL`, now, now, id);
}

/**
 * Moves one med's planned doses at `from` to `to`, from today on. Doses
 * already marked taken or skipped keep the time they were taken at. Returns
 * how many moved.
 */
export async function moveTreatmentDoseTime(treatmentId: string, from: string, to: string): Promise<number> {
  if (!/^\d\d:\d\d$/.test(from) || !/^\d\d:\d\d$/.test(to) || from === to) return 0;
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE schedule_items
     SET scheduled_for = substr(scheduled_for, 1, 11) || ?, updated_at = ?
     WHERE linked_treatment_id = ? AND status = 'planned'
       AND substr(scheduled_for, 12, 5) = ? AND substr(scheduled_for, 1, 10) >= ?`,
    to,
    new Date().toISOString(),
    treatmentId,
    from,
    todayLocal(),
  );
  return result.changes ?? 0;
}

/** A group's new time, with every member's planned doses at the old time moved to it. */
export async function retimeDoseGroup(id: string, timeOfDay: string): Promise<void> {
  if (!/^\d\d:\d\d$/.test(timeOfDay)) return;
  const group = await getDoseGroup(id);
  if (!group || group.timeOfDay === timeOfDay) return;
  const members = (await listDoseGroupMembers()).filter((member) => member.groupId === id);
  for (const member of members) await moveTreatmentDoseTime(member.treatmentId, group.timeOfDay, timeOfDay);
  const db = await getDatabase();
  await db.runAsync(`UPDATE dose_groups SET time_of_day = ?, updated_at = ? WHERE id = ?`, timeOfDay, new Date().toISOString(), id);
}

/**
 * The one-tap move from the group screen: a supplement or OTC item's doses
 * at `from` go to `to`, it leaves the group at `from`, and it joins the group
 * at `to` when there is one.
 */
export async function moveDoseToTime(treatmentId: string, from: string, to: string, fromGroupId: string | null, toGroupId: string | null): Promise<number> {
  const moved = await moveTreatmentDoseTime(treatmentId, from, to);
  if (fromGroupId) await removeDoseGroupMember(fromGroupId, treatmentId);
  if (toGroupId) await addDoseGroupMember(toGroupId, treatmentId);
  return moved;
}

/** Times whose grouping offer the person said no to, so it is not asked again. */
export async function listDeclinedGroupingTimes(): Promise<string[]> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', DECLINED_KEY);
  try {
    const parsed = row?.value ? JSON.parse(row.value) : [];
    return Array.isArray(parsed) ? parsed.filter((time): time is string => typeof time === 'string') : [];
  } catch {
    return [];
  }
}

export async function declineGroupingOffer(time: string): Promise<void> {
  const declined = await listDeclinedGroupingTimes();
  if (declined.includes(time)) return;
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO app_meta (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    DECLINED_KEY,
    JSON.stringify([...declined, time]),
    now,
  );
}

/**
 * Each active med's dose times over the coming week, one row per med and
 * time. This is what the grouping offer and the add-a-med picker read: a med
 * belongs in a group only at a time it is actually taken.
 */
export async function listUpcomingDoseTimes(): Promise<{ treatmentId: string; treatmentName: string; treatmentType: string; time: string }[]> {
  const db = await getDatabase();
  const start = todayLocal();
  const end = new Date(`${start}T12:00:00`);
  end.setDate(end.getDate() + 7);
  const endDay = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  return db.getAllAsync(
    `SELECT DISTINCT t.id AS treatmentId, t.name AS treatmentName, t.treatment_type AS treatmentType,
            substr(s.scheduled_for, 12, 5) AS time
     FROM schedule_items s JOIN treatments t ON t.id = s.linked_treatment_id
     WHERE s.item_type IN ('supplement', 'prescription', 'otc') AND t.active = 1
       AND substr(s.scheduled_for, 1, 10) BETWEEN ? AND ?
     ORDER BY time ASC, t.name ASC`,
    start,
    endDay,
  );
}
