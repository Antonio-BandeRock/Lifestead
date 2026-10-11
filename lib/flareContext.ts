// What a flare is, without assuming food (2026-10-11).
//
// Direct instruction: "the flare is assuming I am having a flare from food
// or drink, when it could be a flare from stress, or it could be a flare
// that a autistic person can get from the fibromyalgia that is prevalent in
// them... the app isn't mainly just built for people with autoimmune
// diseases anymore. Its for everyone." And then: "it needs to start with
// what the user has told us in the app about themselves... be open to
// logging things that might not fall into the patterns that each condition
// is perceived as only having. The app should help identify things that
// aren't even catered to in it, but based on tracked data... We don't have
// to agree with the data in order to provide a tool for people to figure
// it out."
//
// So this module does three things, all pure and importing nothing:
//
// 1. Lists what may have been going on before a flare (stress, sleep,
//    exertion, noise and people, food, illness, hormones, weather, heat,
//    sun, a medication change, a change of routine, an injury, not sure),
//    each linked to the conditions and neurotypes where people often
//    mention it. The person adds their own beside these.
// 2. Links each of the 19 conditions and autism, ADHD and dyslexia to the
//    symptoms often reported with them, so the pickers can put those first
//    for the person who marked them. Nothing is hidden: every other
//    symptom follows under Other possibilities.
// 3. Finds symptoms that keep coming back and are not among those listed
//    for anything the person marked, worded as worth showing a doctor. It
//    never names a condition, never claims a cause, and says the app's
//    list is short, because a symptom outside it says as much about the
//    list as about the person.
//
// The links are ordering hints drawn from what patient groups and clinical
// overviews list, not a diagnostic table, and nothing here scores, gates or
// hides anything. The person's history always outranks them: what they
// have marked before comes first.

import type { NeuroProfileKey } from './neuroProfile';

export type PersonMarks = {
  /** Condition codes from Profile (user_conditions), never curious_about. */
  conditions: string[];
  neuro: NeuroProfileKey[];
};

export type FlareContributor = {
  code: string;
  label: string;
  custom?: boolean;
  retired?: boolean;
};

export const NOT_SURE_CONTRIBUTOR = 'not_sure';
/** The person's own contributors: 'own:' plus the custom_flare_contributors id. */
export const OWN_CONTRIBUTOR_PREFIX = 'own:';

// In the order offered when nothing is known about the person. Not sure is
// last and stands alone: choosing it clears the others.
export const FLARE_CONTRIBUTORS: FlareContributor[] = [
  { code: 'stress', label: 'Stress' },
  { code: 'poor_sleep', label: 'Poor sleep' },
  { code: 'exertion', label: 'Exercise or exertion' },
  { code: 'sensory_load', label: 'Too much noise, light or people' },
  { code: 'food_drink', label: 'Something I ate or drank' },
  { code: 'illness', label: 'Getting sick' },
  { code: 'cycle_hormones', label: 'Period or hormones' },
  { code: 'weather', label: 'Weather change' },
  { code: 'heat', label: 'Heat' },
  { code: 'sun', label: 'Sun' },
  { code: 'med_change', label: 'Medication change or missed dose' },
  { code: 'routine_change', label: 'Change of routine' },
  { code: 'injury', label: 'Injury or strain' },
  { code: NOT_SURE_CONTRIBUTOR, label: 'Not sure' },
];

// The person's own contributors (custom_flare_contributors), held here once
// loaded so every reader names them without a query. lib/db.ts fills it
// when the database opens and lib/flareContextDb.ts after every change.
let ownContributors: FlareContributor[] = [];

export type OwnContributorRow = { id: string; label: string; retired_at: string | null };

export function ownContributorFromRow(row: OwnContributorRow): FlareContributor {
  return { code: OWN_CONTRIBUTOR_PREFIX + row.id, label: row.label, custom: true, retired: row.retired_at !== null };
}

export function setOwnContributors(items: FlareContributor[]): void {
  ownContributors = items;
}

/** Everything offered today: the built-in list with the person's own
 *  entries, not removed, placed before Not sure. */
export function offeredContributors(): FlareContributor[] {
  const builtIn = FLARE_CONTRIBUTORS.filter((item) => item.code !== NOT_SURE_CONTRIBUTOR);
  const own = ownContributors.filter((item) => !item.retired);
  const notSure = FLARE_CONTRIBUTORS.filter((item) => item.code === NOT_SURE_CONTRIBUTOR);
  return [...builtIn, ...own, ...notSure];
}

export function contributorLabel(code: string): string {
  return (
    FLARE_CONTRIBUTORS.find((item) => item.code === code)?.label ??
    ownContributors.find((item) => item.code === code)?.label ??
    'Something no longer listed'
  );
}

/** Where people often mention each contributor: condition codes from
 *  lib/conditionCodeMap.ts and neuro keys from lib/neuroProfile.ts. */
export const CONTRIBUTOR_LINKS: Record<string, string[]> = {
  stress: ['ibs', 'psoriasis', 'migraine', 'lupus', 'multiple_sclerosis', 'ibd', 'autism', 'adhd'],
  poor_sleep: ['migraine', 'autism', 'adhd', 'hashimotos', 'graves'],
  exertion: ['multiple_sclerosis', 'lupus', 'rheumatoid_arthritis', 'sjogrens', 'type_1_diabetes', 'type_2_diabetes', 'cardiovascular_disease'],
  sensory_load: ['autism', 'adhd', 'migraine'],
  food_drink: ['celiac', 'ibs', 'ibd', 'gout', 'migraine', 'type_1_diabetes', 'type_2_diabetes', 'fatty_liver_disease', 'chronic_kidney_disease'],
  illness: ['multiple_sclerosis', 'psoriasis', 'lupus', 'type_1_diabetes'],
  cycle_hormones: ['migraine', 'pcos', 'lupus', 'hashimotos'],
  weather: ['rheumatoid_arthritis', 'migraine', 'psoriasis'],
  heat: ['multiple_sclerosis', 'graves'],
  sun: ['lupus'],
  med_change: ['hashimotos', 'graves', 'type_1_diabetes', 'type_2_diabetes', 'cardiovascular_disease'],
  routine_change: ['autism', 'adhd'],
  injury: ['rheumatoid_arthritis', 'gout', 'psoriasis'],
};

/** Symptoms often reported with each condition and neurotype, as tag codes
 *  from lib/checkinTags.ts. A symptom listed for none of the person's marks
 *  is still offered, under Other possibilities. */
export const SYMPTOM_LINKS: Record<string, string[]> = {
  hashimotos: ['fatigue', 'brain_fog', 'temperature_sensitivity', 'low_mood', 'constipation', 'stiffness', 'joint_pain', 'muscle_weakness'],
  graves: ['heart_palpitations', 'anxious', 'wired_jittery', 'temperature_sensitivity', 'trouble_falling_asleep', 'muscle_weakness', 'diarrhea'],
  rheumatoid_arthritis: ['joint_pain', 'stiffness', 'swelling', 'fatigue', 'dry_eyes_mouth'],
  psoriasis: ['skin_flare', 'itching', 'joint_pain', 'stiffness', 'swelling'],
  type_1_diabetes: ['fatigue', 'dizziness', 'wired_jittery', 'numbness_tingling', 'brain_fog', 'irritable'],
  type_2_diabetes: ['fatigue', 'numbness_tingling', 'dizziness', 'brain_fog', 'constant_hunger'],
  celiac: ['bloating', 'diarrhea', 'gas', 'cramping', 'fatigue', 'brain_fog', 'numbness_tingling', 'skin_flare'],
  ibd: ['cramping', 'diarrhea', 'fatigue', 'joint_pain', 'no_appetite', 'nausea'],
  ibs: ['bloating', 'cramping', 'diarrhea', 'constipation', 'gas', 'anxious'],
  multiple_sclerosis: ['fatigue', 'numbness_tingling', 'muscle_weakness', 'dizziness', 'brain_fog', 'temperature_sensitivity', 'stiffness', 'crash_after_exertion'],
  lupus: ['joint_pain', 'fatigue', 'skin_flare', 'swelling', 'widespread_pain', 'brain_fog', 'crash_after_exertion', 'dry_eyes_mouth'],
  sjogrens: ['dry_eyes_mouth', 'fatigue', 'joint_pain', 'widespread_pain', 'brain_fog'],
  pcos: ['fatigue', 'low_mood', 'constant_hunger', 'skin_flare', 'anxious'],
  chronic_kidney_disease: ['fatigue', 'swelling', 'itching', 'no_appetite', 'nausea'],
  fatty_liver_disease: ['fatigue', 'bloating', 'brain_fog'],
  migraine: ['headache', 'noise_light_sensitivity', 'nausea', 'dizziness', 'brain_fog', 'overstimulated'],
  cardiovascular_disease: ['heart_palpitations', 'fatigue', 'dizziness', 'swelling'],
  gout: ['joint_pain', 'swelling', 'stiffness'],
  prostate_health: ['woke_frequently'],
  // Widespread pain and touch that hurts are here because fibromyalgia is
  // reported far more often alongside autism than without it.
  autism: ['overstimulated', 'noise_light_sensitivity', 'meltdown', 'shutdown', 'touch_hurts', 'widespread_pain', 'anxious', 'trouble_falling_asleep', 'fatigue'],
  adhd: ['restless', 'couldnt_get_started', 'hyperfocused', 'forgot_to_eat', 'trouble_falling_asleep', 'irritable', 'overstimulated', 'brain_fog'],
  dyslexia: [],
};

function marksList(marks: PersonMarks): string[] {
  return [...marks.conditions, ...marks.neuro];
}

/** Every symptom listed for anything the person marked. */
export function symptomsForMarks(marks: PersonMarks): Set<string> {
  const found = new Set<string>();
  for (const mark of marksList(marks)) for (const code of SYMPTOM_LINKS[mark] ?? []) found.add(code);
  return found;
}

/** Every contributor linked to anything the person marked. */
export function contributorsForMarks(marks: PersonMarks): Set<string> {
  const mine = new Set(marksList(marks));
  const found = new Set<string>();
  for (const [code, links] of Object.entries(CONTRIBUTOR_LINKS)) {
    if (links.some((link) => mine.has(link))) found.add(code);
  }
  return found;
}

/**
 * Splits a list into what is offered first and what follows. First comes
 * whatever the person has marked before (most often first), then whatever
 * is linked to their marks, in the list's order. `alwaysFirst` holds codes
 * offered first whatever is known, such as the person's own entries.
 */
export function splitForPerson<T extends { code: string }>(
  items: T[],
  linked: Set<string>,
  usedCounts: Map<string, number>,
  alwaysFirst: Set<string> = new Set(),
): { forYou: T[]; other: T[] } {
  const used = items
    .filter((item) => (usedCounts.get(item.code) ?? 0) > 0)
    .sort((a, b) => (usedCounts.get(b.code) ?? 0) - (usedCounts.get(a.code) ?? 0));
  const usedCodes = new Set(used.map((item) => item.code));
  const rest = items.filter((item) => !usedCodes.has(item.code) && (linked.has(item.code) || alwaysFirst.has(item.code)));
  const forYou = [...used, ...rest];
  const firstCodes = new Set(forYou.map((item) => item.code));
  return { forYou, other: items.filter((item) => !firstCodes.has(item.code)) };
}

/**
 * The two contributors the lock-screen question offers beside Not sure:
 * the two the person has marked most, then the ones linked to their
 * marks, then stress and exertion, which are the commonest answers for
 * anybody.
 */
export function contributorsToAsk(usedCounts: Map<string, number>, marks: PersonMarks, offered: FlareContributor[]): string[] {
  const live = offered.filter((item) => item.code !== NOT_SURE_CONTRIBUTOR && !item.retired);
  const { forYou } = splitForPerson(live, contributorsForMarks(marks), usedCounts);
  const picked = forYou.map((item) => item.code);
  for (const fallback of ['stress', 'exertion', 'poor_sleep']) {
    if (!picked.includes(fallback) && live.some((item) => item.code === fallback)) picked.push(fallback);
  }
  return picked.slice(0, 2);
}

/** Choosing Not sure clears the rest; choosing anything else clears Not sure. */
export function toggleContributor(selected: string[], code: string): string[] {
  if (selected.includes(code)) return selected.filter((item) => item !== code);
  if (code === NOT_SURE_CONTRIBUTOR) return [NOT_SURE_CONTRIBUTOR];
  return [...selected.filter((item) => item !== NOT_SURE_CONTRIBUTOR), code];
}

// --- What the person marked behind their flares ---------------------------

export type MarkedFlare = { tags: string[]; contributors: string[] };

export type ContributorCount = { code: string; count: number };

/** How often each contributor was marked, Not sure included, most first. */
export function countContributors(flares: MarkedFlare[]): ContributorCount[] {
  const counts = new Map<string, number>();
  for (const flare of flares) {
    for (const code of new Set(flare.contributors)) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
}

/** One line per contributor, in the person's words: what they marked,
 *  never what caused anything. */
export function contributorLines(
  flares: MarkedFlare[],
  labelOf: (code: string) => string,
): { lines: string[]; unanswered: number } {
  const answered = flares.filter((flare) => flare.contributors.length > 0);
  const lines = countContributors(answered).map(({ code, count }) =>
    code === NOT_SURE_CONTRIBUTOR
      ? `Not sure what was going on: ${count} of ${answered.length} flares.`
      : `You marked ${labelOf(code).toLowerCase()} behind ${count} of ${answered.length} flares.`,
  );
  return { lines, unanswered: flares.length - answered.length };
}

export const CONTRIBUTOR_NOTE =
  'These are what you marked as going on at the time. A flare can follow more than one thing, and something marked is not shown to be the cause.';

// --- Symptoms outside what the person marked ------------------------------

/** How many flares a symptom must turn up in before it is listed. */
export const OUTSIDE_MIN_FLARES = 3;

export type OutsideSymptom = { code: string; count: number };

/**
 * Symptoms marked on at least OUTSIDE_MIN_FLARES flares that are not listed
 * for any condition or neurotype the person marked. With nothing marked,
 * every recurring symptom is listed, since none of them is accounted for.
 */
export function symptomsOutsideMarks(flares: MarkedFlare[], marks: PersonMarks): OutsideSymptom[] {
  const listed = symptomsForMarks(marks);
  const counts = new Map<string, number>();
  for (const flare of flares) {
    for (const code of new Set(flare.tags)) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([code, count]) => count >= OUTSIDE_MIN_FLARES && !listed.has(code))
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

export function outsideLines(
  outside: OutsideSymptom[],
  totalFlares: number,
  labelOf: (code: string) => string,
): string[] {
  return outside.map(({ code, count }) => `${labelOf(code)}: on ${count} of ${totalFlares} flares.`);
}

export function outsideNote(marks: PersonMarks): string {
  if (marksList(marks).length === 0) {
    return 'Nothing is marked in Profile, so every symptom that keeps coming back is listed here. These are worth showing a doctor as they are: how often, and alongside what else you recorded.';
  }
  return "These keep coming back and are not among the symptoms this app lists for anything you marked in Profile. That list is short and leaves a lot out, so a symptom here may simply be one it missed. Show a doctor how often each one comes back, especially if the rest of the picture does not add up.";
}

export const OUTSIDE_EMPTY_LINE =
  'Nothing has turned up on three or more flares that sits outside what the app lists for what you marked.';
