// Dose groups: meds and supplements taken at the same time, with one
// reminder for all of them (Tony, 2026-11-20: "Meds and Supplements that all
// are taken at the same time need to be able to be grouped and only have one
// reminder setup for them all to be acted on at once").
//
// What this module decides, with no database and no React, so that
// scripts/test_dose_groups.js can check every rule:
//
//   1. Which doses belong to a group. A dose is in a group when its med is a
//      member and its time of day is the group's, so a med taken twice a
//      day joins a morning group only at its morning time.
//   2. Which two doses in the same group the interaction rules say should
//      not be taken together, and why, with the rule's citation.
//   3. Where one of them could go instead: a time that keeps the rule's
//      separation from every dose it competes with and puts it beside no
//      meal that competes with it. A time another group already uses comes
//      first, so a move joins something the person already does.
//   4. Which dose of a pair is the one to move. A supplement or an OTC item
//      can be moved with one tap; a prescription never is, since when a
//      prescription is taken is for the person and their pharmacist or
//      prescriber to settle. The screen says why and leaves it there.
//
// Nothing here says a dose is unnecessary, and nothing tells anybody to
// stop, start or skip one: the suggestion is only ever a time.

import {
  doseFoodNotes,
  doseMatchesSubject,
  minutesOfDay,
  type DoseFoodNote,
  type TimelineDose,
  type TimelineMeal,
  type TimingRule,
} from './doseMealTiming';
import { formatTime12 } from './timeOfDay';

export type DoseGroup = {
  id: string;
  name: string;
  /** 'HH:mm', 24-hour. */
  timeOfDay: string;
  retiredAt: string | null;
};

export type DoseGroupMember = {
  id: string;
  groupId: string;
  treatmentId: string;
  retiredAt: string | null;
};

/** 'HH:mm' from a schedule row's 'YYYY-MM-DDTHH:mm'. */
export function timeOfScheduled(scheduledFor: string): string {
  return scheduledFor.slice(11, 16);
}

/** The live group a dose of this med at this time belongs to, or null. */
export function groupForDose(
  treatmentId: string | null,
  time: string,
  groups: DoseGroup[],
  members: DoseGroupMember[],
): DoseGroup | null {
  if (!treatmentId) return null;
  for (const group of groups) {
    if (group.retiredAt || group.timeOfDay !== time) continue;
    if (members.some((member) => !member.retiredAt && member.groupId === group.id && member.treatmentId === treatmentId)) return group;
  }
  return null;
}

/** Every live member med of a group. */
export function memberTreatmentIds(groupId: string, members: DoseGroupMember[]): string[] {
  return members.filter((member) => !member.retiredAt && member.groupId === groupId).map((member) => member.treatmentId);
}

// --- The grouping offer ------------------------------------------------------

export type GroupingOffer = {
  time: string;
  treatmentIds: string[];
  names: string[];
};

/**
 * Two or more meds whose doses share a time that no group covers yet. Each is
 * an offer and nothing more: a group is made only when the person says yes.
 * `doses` is one day's planned doses, any status.
 */
export function groupingOffers(
  doses: { treatmentId: string; treatmentName: string; time: string }[],
  groups: DoseGroup[],
  members: DoseGroupMember[],
  declinedTimes: string[] = [],
): GroupingOffer[] {
  const byTime = new Map<string, Map<string, string>>();
  for (const dose of doses) {
    if (groupForDose(dose.treatmentId, dose.time, groups, members)) continue;
    const seen = byTime.get(dose.time) ?? new Map<string, string>();
    seen.set(dose.treatmentId, dose.treatmentName);
    byTime.set(dose.time, seen);
  }
  const offers: GroupingOffer[] = [];
  for (const [time, meds] of byTime) {
    if (meds.size < 2 || declinedTimes.includes(time)) continue;
    // A group already at this time takes the newcomers instead of a second
    // group being offered beside it.
    offers.push({ time, treatmentIds: [...meds.keys()], names: [...meds.values()] });
  }
  return offers.sort((a, b) => a.time.localeCompare(b.time));
}

/** A name to start the offer with, from the time of day. The person can change it. */
export function suggestedGroupName(time: string): string {
  const minutes = minutesOfDay(time);
  if (minutes < 11 * 60) return 'Morning';
  if (minutes < 14 * 60) return 'Midday';
  if (minutes < 18 * 60) return 'Afternoon';
  if (minutes < 21 * 60) return 'Evening';
  return 'Bedtime';
}

// --- Pairs inside a group ----------------------------------------------------

export type DosePairNote = {
  /** 'separate' when the rule asks for hours between them; 'together' when it
   *  is about taking both at all, which moving one does not change. */
  kind: 'separate' | 'together';
  ruleId: string;
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  hours: number | null;
  severity: string;
  title: string;
  guidance: string;
  citation: string;
  mechanism: string | null;
};

function ruleMatchesPair(rule: TimingRule, a: TimelineDose, b: TimelineDose): boolean {
  return (
    (doseMatchesSubject(a, rule.subjectAKind, rule.subjectA) && doseMatchesSubject(b, rule.subjectBKind, rule.subjectB)) ||
    (doseMatchesSubject(b, rule.subjectAKind, rule.subjectA) && doseMatchesSubject(a, rule.subjectBKind, rule.subjectB))
  );
}

/** What the interaction rules say about two doses taken at the same time. */
export function pairNotes(doses: TimelineDose[], rules: TimingRule[]): DosePairNote[] {
  const notes: DosePairNote[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < doses.length; i += 1) {
    for (let j = i + 1; j < doses.length; j += 1) {
      const a = doses[i];
      const b = doses[j];
      if (a.treatmentId === b.treatmentId) continue;
      for (const rule of rules) {
        if (!rule.checkable) continue;
        const separate = rule.ruleType === 'timing_separation' && rule.minSeparationHours != null;
        const together = rule.ruleType === 'concurrent_use_caution';
        if (!separate && !together) continue;
        if (!ruleMatchesPair(rule, a, b)) continue;
        const key = `${rule.id}:${[a.treatmentId, b.treatmentId].sort().join(':')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        notes.push({
          kind: separate ? 'separate' : 'together',
          ruleId: rule.id,
          aId: a.id,
          bId: b.id,
          aName: a.treatmentName,
          bName: b.treatmentName,
          hours: separate ? rule.minSeparationHours : null,
          severity: rule.severity,
          title: rule.title,
          guidance: rule.guidance,
          citation: rule.citation,
          mechanism: rule.mechanism,
        });
      }
    }
  }
  const order = (severity: string) => (severity === 'major' ? 0 : severity === 'caution' ? 1 : 2);
  return notes.sort((x, y) => (x.kind === y.kind ? order(x.severity) - order(y.severity) : x.kind === 'separate' ? -1 : 1));
}

/** Whether this dose can be moved with one tap. A prescription never can. */
export function movable(dose: TimelineDose): boolean {
  return dose.treatmentType === 'supplement' || dose.treatmentType === 'otc';
}

/** Which dose of a pair to offer to move: a supplement before an OTC item, and never a prescription. Null when neither can be. */
export function doseToMove(a: TimelineDose, b: TimelineDose): TimelineDose | null {
  const rank = (dose: TimelineDose) => (dose.treatmentType === 'supplement' ? 0 : dose.treatmentType === 'otc' ? 1 : 9);
  const best = rank(a) <= rank(b) ? a : b;
  return movable(best) ? best : null;
}

// --- Where a dose could go instead -------------------------------------------

export type MoveSuggestion = {
  doseId: string;
  treatmentId: string;
  treatmentName: string;
  from: string;
  to: string;
  /** The group already at that time, when there is one. */
  joinsGroupId: string | null;
  joinsGroupName: string | null;
  /** Why this time, in a sentence. */
  why: string;
};

const EARLIEST = 6 * 60;
const LATEST = 22 * 60;

function toTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Hours between two 'HH:mm' times on the same day. */
function hoursBetween(a: string, b: string): number {
  return Math.abs(minutesOfDay(a) - minutesOfDay(b)) / 60;
}

/**
 * Whether `dose` at `time` keeps every separation rule against every other
 * dose of the day, and sits beside no meal that competes with it.
 */
function timeIsClear(dose: TimelineDose, time: string, dayDoses: TimelineDose[], meals: TimelineMeal[], rules: TimingRule[]): boolean {
  const moved: TimelineDose = { ...dose, time };
  for (const other of dayDoses) {
    if (other.id === dose.id || other.treatmentId === dose.treatmentId || other.status === 'skipped') continue;
    for (const rule of rules) {
      if (!rule.checkable || rule.ruleType !== 'timing_separation' || rule.minSeparationHours == null) continue;
      if (!ruleMatchesPair(rule, moved, other)) continue;
      if (hoursBetween(time, other.time) < rule.minSeparationHours) return false;
    }
  }
  return !doseFoodNotes(moved, meals, rules).some((note: DoseFoodNote) => note.kind === 'clash');
}

/**
 * A time for `dose` that clears what made it clash with `other`, or null when
 * no time between 6 a.m. and 10 p.m. does. Other groups' times come first,
 * nearest to where the dose is now; after them, the rule's separation either
 * side of the group, then each quarter hour outward.
 */
export function suggestMove(
  dose: TimelineDose,
  note: DosePairNote,
  dayDoses: TimelineDose[],
  meals: TimelineMeal[],
  rules: TimingRule[],
  groups: DoseGroup[],
): MoveSuggestion | null {
  if (note.kind !== 'separate' || note.hours == null || !movable(dose)) return null;
  const hours = note.hours;
  const from = dose.time;
  const fromMinutes = minutesOfDay(from);
  const live = groups.filter((group) => !group.retiredAt && group.timeOfDay !== from);
  const candidates: string[] = [];
  const add = (minutes: number) => {
    if (minutes < EARLIEST || minutes > LATEST) return;
    const time = toTime(minutes);
    if (time !== from && !candidates.includes(time)) candidates.push(time);
  };
  [...live].sort((a, b) => Math.abs(minutesOfDay(a.timeOfDay) - fromMinutes) - Math.abs(minutesOfDay(b.timeOfDay) - fromMinutes)).forEach((group) => add(minutesOfDay(group.timeOfDay)));
  const gap = Math.round(hours * 60);
  add(fromMinutes + gap);
  add(fromMinutes - gap);
  for (let step = gap + 15; step <= 16 * 60; step += 15) {
    add(fromMinutes + step);
    add(fromMinutes - step);
  }
  const otherName = note.aId === dose.id ? note.bName : note.aName;
  for (const time of candidates) {
    if (!timeIsClear(dose, time, dayDoses, meals, rules)) continue;
    const joins = live.find((group) => group.timeOfDay === time) ?? null;
    const apart = `${hours} hour${hours === 1 ? '' : 's'}`;
    return {
      doseId: dose.id,
      treatmentId: dose.treatmentId,
      treatmentName: dose.treatmentName,
      from,
      to: time,
      joinsGroupId: joins?.id ?? null,
      joinsGroupName: joins?.name ?? null,
      why: joins
        ? `${formatTime12(time)} is when you take ${joins.name}, at least ${apart} from ${otherName}, and no meal on today's plan competes with it there.`
        : `${formatTime12(time)} is at least ${apart} from ${otherName}, and no meal on today's plan competes with it there.`,
    };
  }
  return null;
}

// --- The reminder ------------------------------------------------------------

/** Schedule rows a group reminder carries, joined into the one id field a payload has. */
export function joinDoseIds(ids: string[]): string {
  return ids.join(',');
}

export function splitDoseIds(joined: string): string[] {
  return joined
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}
