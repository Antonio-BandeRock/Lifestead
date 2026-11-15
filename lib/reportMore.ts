// The sections the newer reports carry (1.0.90.4), each built from records
// a screen already keeps, with no I/O, so scripts/test_output_lenses.js can
// run them without a phone. lib/reportGenerator.ts reads the records and
// hands them here. Every section says what it covers and where its records
// go in when it has none, and none of them counts a blank day as a zero.
import type { ReportListSection, ReportSection, ReportTableSection } from './reportGenerator';
import { BLOOD_WORDS, PAIN_WORDS, URGENCY_WORDS, bloodSeenLine, bowelRangeSentence, bowelTypeTally, bristolWords, type BowelEntry } from './bowel';
import { formatTrackerValue, type CustomTracker, type TrackerEntry } from './customTrackers';
import { formatFinanceMoney } from './financeCore';
import { financeCategoryLabel } from './financeCategories';
import { INTEREST_STAGES, INTEREST_STAGE_LABELS, type Interest } from './interests';
import { LIBRARY_STATUS_LABELS, type LibraryEntry, type LibraryStatus } from './interestLibrary';
import type { MoneyEntry } from './interestMoney';
import type { InterestThing, ThingKind } from './interestThings';
import type { KeepingUpSummary } from './keepingUp';
import type { MicrobiomeResult, MicrobiomeTest } from './microbiome';
import { PROJECT_AREA_LABELS, type Project, type ProjectArea, type ProjectStep } from './projects';
import { upkeepCategoryLabel, type UpkeepStanding } from './upkeep';
import { foodDisplayName } from './ingredientShortName';

function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function when(stamp: string): string {
  return stamp.slice(0, 16).replace('T', ' ');
}

function inRange(day: string, start: string, end: string): boolean {
  return day >= start && day <= end;
}

// --- Labs ---------------------------------------------------------------

export type LabHistoryRow = {
  testName: string;
  value: number;
  unit: string;
  low: number | null;
  high: number | null;
  testedAt: string;
  labName: string | null;
};

/** Every result with a test date in the range, grouped by test, oldest first. */
export function labHistorySection(results: LabHistoryRow[], start: string, end: string): ReportTableSection {
  const rows = results
    .filter((result) => inRange(result.testedAt.slice(0, 10), start, end))
    .sort((a, b) => a.testName.localeCompare(b.testName) || a.testedAt.localeCompare(b.testedAt));
  const tests = new Set(rows.map((row) => row.testName)).size;
  return {
    kind: 'table',
    heading: 'Lab results in this range',
    note:
      rows.length > 0
        ? `${count(rows.length, 'result')} for ${count(tests, 'test')}, grouped by test with the oldest first. The range shown is the one the person's lab reported, not a general reference range.`
        : undefined,
    columns: ['Test', 'Result', 'Lab range', 'Tested', 'Lab'],
    rows: rows.map((row) => [
      row.testName,
      `${row.value} ${row.unit}`,
      row.low != null && row.high != null ? `${row.low} to ${row.high}` : '',
      row.testedAt.slice(0, 10),
      row.labName ?? '',
    ]),
    empty: 'No lab results with a test date in this range. Insights > Labs is where they go in.',
  };
}

// --- Blood pressure -----------------------------------------------------

export type BloodPressureRow = { loggedAt: string; systolic: number; diastolic: number; pulse: number | null };

export function bloodPressureLogSection(readings: BloodPressureRow[], start: string, end: string): ReportTableSection {
  const rows = readings
    .filter((reading) => inRange(reading.loggedAt.slice(0, 10), start, end))
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const days = new Set(rows.map((row) => row.loggedAt.slice(0, 10))).size;
  return {
    kind: 'table',
    heading: 'Every reading',
    note: rows.length > 0 ? `${count(rows.length, 'reading')} on ${count(days, 'day')}, in the order they were taken.` : undefined,
    columns: ['When', 'Reading', 'Pulse'],
    rows: rows.map((row) => [when(row.loggedAt), `${Math.round(row.systolic)}/${Math.round(row.diastolic)} mmHg`, row.pulse == null ? '' : `${Math.round(row.pulse)}`]),
    empty: 'No blood pressure readings in this range. Signals > Blood Pressure is where they go in.',
  };
}

// --- Bowel movements ----------------------------------------------------

export function bowelSections(entries: BowelEntry[], start: string, end: string): ReportSection[] {
  const rows = entries
    .filter((entry) => inRange(entry.occurredAt.slice(0, 10), start, end))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const summary = rows.length > 0
    ? [
        bowelRangeSentence(rows, start, end),
        ...bowelTypeTally(rows).map(({ type, count: times }) => `Type ${type}, ${bristolWords(type)}: ${count(times, 'time')}`),
        bloodSeenLine(rows),
      ].filter((line): line is string => Boolean(line))
    : [];
  return [
    {
      kind: 'list',
      heading: 'Bowel movements in brief',
      note: 'Types are the Bristol stool scale, as the person chose them. A day with nothing logged is a day nothing was logged, not a day with none.',
      rows: summary,
      empty: 'No bowel movements logged in this range. Signals > Bowel Movements is where they go in.',
    },
    {
      kind: 'table',
      heading: 'Every bowel movement',
      columns: ['When', 'Type', 'Urgency', 'Blood', 'Pain', 'Note'],
      rows: rows.map((entry) => [
        when(entry.occurredAt),
        `${entry.bristolType}, ${bristolWords(entry.bristolType)}`,
        entry.urgency == null ? '' : URGENCY_WORDS[entry.urgency] ?? '',
        entry.blood == null ? '' : BLOOD_WORDS[entry.blood] ?? '',
        entry.pain == null ? '' : PAIN_WORDS[entry.pain] ?? '',
        entry.note ?? '',
      ]),
      empty: 'None logged in this range.',
    },
  ];
}

// --- Hands-on therapies -------------------------------------------------

export type TherapySessionRow = {
  performedAt: string;
  therapyLabel: string;
  practitioner: string | null;
  bodyFocus: string | null;
  durationMinutes: number | null;
  notes: string | null;
};

export function therapySessionsSection(sessions: TherapySessionRow[], start: string, end: string): ReportTableSection {
  const rows = sessions
    .filter((session) => inRange(session.performedAt.slice(0, 10), start, end))
    .sort((a, b) => a.performedAt.localeCompare(b.performedAt));
  return {
    kind: 'table',
    heading: 'Hands-on therapy sessions',
    note: rows.length > 0 ? `${count(rows.length, 'session')} in the range, in order.` : undefined,
    columns: ['When', 'Therapy', 'Practitioner', 'Focus', 'Minutes', 'Notes'],
    rows: rows.map((session) => [
      session.performedAt.slice(0, 10),
      session.therapyLabel,
      session.practitioner ?? '',
      session.bodyFocus ?? '',
      session.durationMinutes == null ? '' : String(session.durationMinutes),
      session.notes ?? '',
    ]),
    empty: 'No sessions logged in this range. Signals > Hands-On Therapies is where they go in.',
  };
}

/** Takes the lines describeTherapyResponse already wrote for the screen. */
export function therapyResponseSection(lines: string[], totalSessions: number, totalCheckins: number): ReportListSection {
  return {
    kind: 'list',
    heading: 'How the days after a session went',
    note: `Counted from ${count(totalSessions, 'session')} and ${count(totalCheckins, 'check-in')}. Days after a session are set beside the person's other days; that is a count, and it cannot say the session caused anything.`,
    rows: lines,
    empty: 'Not enough sessions and check-ins in this range to compare yet.',
  };
}

// --- My Trackers --------------------------------------------------------

export function trackerSections(trackers: CustomTracker[], entries: TrackerEntry[], start: string, end: string): ReportSection[] {
  const byId = new Map(trackers.map((tracker) => [tracker.id, tracker]));
  const rows = entries
    .filter((entry) => byId.has(entry.trackerId) && inRange(entry.loggedAt.slice(0, 10), start, end))
    .sort((a, b) => byId.get(a.trackerId)!.name.localeCompare(byId.get(b.trackerId)!.name) || a.loggedAt.localeCompare(b.loggedAt));
  const perTracker = new Map<string, TrackerEntry[]>();
  for (const entry of rows) perTracker.set(entry.trackerId, [...(perTracker.get(entry.trackerId) ?? []), entry]);
  const summary = trackers
    .filter((tracker) => perTracker.has(tracker.id))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((tracker) => {
      const list = perTracker.get(tracker.id)!;
      const days = new Set(list.map((entry) => entry.loggedAt.slice(0, 10))).size;
      return `${tracker.name}: ${count(list.length, 'entry', 'entries')} on ${count(days, 'day')}`;
    });
  const quiet = trackers.filter((tracker) => !tracker.retiredAt && !perTracker.has(tracker.id)).map((tracker) => tracker.name);
  return [
    {
      kind: 'list',
      heading: 'Trackers in brief',
      note: quiet.length > 0 ? `Nothing logged in this range for: ${quiet.join(', ')}.` : undefined,
      rows: summary,
      empty: trackers.length > 0 ? 'Nothing logged on any tracker in this range.' : 'No trackers made yet. Signals > My Trackers is where one is made.',
    },
    {
      kind: 'table',
      heading: 'Every tracker entry',
      columns: ['Tracker', 'When', 'Value', 'Notes'],
      rows: rows.map((entry) => {
        const tracker = byId.get(entry.trackerId)!;
        return [tracker.name, when(entry.loggedAt), formatTrackerValue(tracker, entry.value), entry.notes ?? ''];
      }),
      empty: 'None logged in this range.',
    },
  ];
}

// --- Microbiome tests ---------------------------------------------------

/** Every test entered, whenever it was taken, since a stool test is rare
 *  and the last one is still the one a clinician asks about. */
export function microbiomeSection(tests: MicrobiomeTest[], results: MicrobiomeResult[]): ReportTableSection {
  const testById = new Map(tests.map((test) => [test.id, test]));
  const rows = results
    .filter((result) => testById.has(result.testId))
    .sort((a, b) => {
      const ta = testById.get(a.testId)!;
      const tb = testById.get(b.testId)!;
      return tb.sampledOn.localeCompare(ta.sampledOn) || a.groupName.localeCompare(b.groupName) || a.sortOrder - b.sortOrder;
    });
  return {
    kind: 'table',
    heading: 'Microbiome tests',
    note: tests.length > 0 ? `${count(tests.length, 'test')} entered, newest first, whenever each was taken. Values and ranges are as the test report printed them.` : undefined,
    columns: ['Sampled', 'Test', 'Group', 'Name', 'Value', 'Range', 'Flag'],
    rows: rows.map((result) => {
      const test = testById.get(result.testId)!;
      return [
        test.sampledOn,
        test.provider,
        result.groupName,
        result.name,
        result.unit ? `${result.valueText} ${result.unit}` : result.valueText,
        result.low != null && result.high != null ? `${result.low} to ${result.high}` : '',
        result.printedFlag ?? '',
      ];
    }),
    empty: 'No microbiome tests entered. Life > Conditions holds them, under the gut.',
  };
}

// --- Medicines, allergies and the emergency card ------------------------

export type MedListRow = {
  name: string;
  genericName: string | null;
  dose: string;
  frequency: string | null;
  treatmentType: string;
  notes: string | null;
};

const TREATMENT_TYPE_WORDS: Record<string, string> = {
  prescription: 'Prescription',
  otc: 'Over the counter',
  supplement: 'Supplement',
};

export function medListSection(meds: MedListRow[]): ReportTableSection {
  const rows = [...meds].sort((a, b) => (TREATMENT_TYPE_WORDS[a.treatmentType] ?? a.treatmentType).localeCompare(TREATMENT_TYPE_WORDS[b.treatmentType] ?? b.treatmentType) || a.name.localeCompare(b.name));
  return {
    kind: 'table',
    heading: 'Medicines and supplements taken now',
    note: 'Everything marked active in Life > My Meds on the day this was made, whatever the range. Any change to a dose or a time is for the prescriber.',
    columns: ['Name', 'Also called', 'Dose', 'How often', 'Kind', 'Notes'],
    rows: rows.map((med) => [med.name, med.genericName ?? '', med.dose, med.frequency ?? '', TREATMENT_TYPE_WORDS[med.treatmentType] ?? med.treatmentType, med.notes ?? '']),
    empty: 'None marked active. Life > My Meds is where they go in.',
  };
}

export function allergiesSection(drugAllergies: string | null, foodAllergies: string[]): ReportListSection {
  const rows = [
    drugAllergies?.trim() ? `Drug allergies: ${drugAllergies.trim()}` : null,
    foodAllergies.length > 0 ? `Food allergies: ${[...foodAllergies].sort((a, b) => a.localeCompare(b)).join(', ')}` : null,
  ].filter((line): line is string => Boolean(line));
  return {
    kind: 'list',
    heading: 'Allergies',
    rows,
    empty: 'No allergies recorded. Life > Emergency holds drug allergies, and Profile holds food allergies.',
  };
}

/** The emergency card as the Emergency lens shows it, one line a row. */
export function emergencyCardSection(cardText: string | null): ReportListSection {
  const rows = cardText ? cardText.split('\n').map((line) => line.trim()).filter((line) => line.length > 0) : [];
  return {
    kind: 'list',
    heading: 'Emergency card',
    note: 'The same card Life > Emergency shows, never held in the vault.',
    rows,
    empty: 'Could not be read for this report.',
  };
}

// --- Money --------------------------------------------------------------

export type MoneyEntryRow = { occurredOn: string; direction: 'income' | 'expense' | string; amount: number; category: string; description: string | null };

export function moneyEntriesSection(entries: MoneyEntryRow[], start: string, end: string): ReportTableSection {
  const rows = entries
    .filter((entry) => inRange(entry.occurredOn.slice(0, 10), start, end))
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn));
  const incoming = rows.filter((entry) => entry.direction === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const outgoing = rows.filter((entry) => entry.direction !== 'income').reduce((sum, entry) => sum + entry.amount, 0);
  return {
    kind: 'table',
    heading: 'Money in and out',
    note:
      rows.length > 0
        ? `${count(rows.length, 'entry', 'entries')} in the range. In: ${formatFinanceMoney(incoming)}. Out: ${formatFinanceMoney(outgoing)}. Only money entered against a day is counted; repeating bills are not guessed into it.`
        : undefined,
    columns: ['Date', 'In or out', 'Category', 'What', 'Amount'],
    rows: rows.map((entry) => [
      entry.occurredOn.slice(0, 10),
      entry.direction === 'income' ? 'In' : 'Out',
      financeCategoryLabel(entry.category),
      entry.description ?? '',
      formatFinanceMoney(entry.amount),
    ]),
    empty: 'No money entered against a day in this range. Life > Finances is where it goes in.',
  };
}

// --- Home upkeep --------------------------------------------------------

export function upkeepStandingSection(standings: UpkeepStanding[], placeName: (item: UpkeepStanding['item']) => string): ReportTableSection {
  const active = standings.filter((standing) => standing.item.active);
  const rows = [...active].sort((a, b) => {
    if (a.dueOn && b.dueOn) return a.dueOn.localeCompare(b.dueOn);
    if (a.dueOn) return -1;
    if (b.dueOn) return 1;
    return a.item.name.localeCompare(b.item.name);
  });
  const standingWords = (standing: UpkeepStanding): string => {
    if (standing.missing === 'neverDone') return 'Never marked done, so no next date yet';
    if (standing.missing === 'noInterval') return 'No interval given';
    if (standing.missing === 'noDate') return 'No date given';
    if (standing.overdue) return 'Past its date';
    if (standing.dueSoon) return 'Coming up';
    return 'On its way';
  };
  return {
    kind: 'table',
    heading: 'Everything kept up, and when it is next due',
    note: 'Every active item in Life > Upkeep on the day this was made, soonest first. A blank cost is one not entered, not a zero.',
    columns: ['Item', 'Kind', 'Place', 'Last done', 'Next date', 'Where it stands', 'Cost'],
    rows: rows.map((standing) => [
      standing.item.name,
      upkeepCategoryLabel(standing.item.category),
      placeName(standing.item),
      standing.item.lastDoneOn ?? '',
      standing.dueOn ?? '',
      standingWords(standing),
      standing.item.cost == null ? '' : formatFinanceMoney(standing.item.cost),
    ]),
    empty: 'Nothing in Life > Upkeep yet.',
  };
}

export function upkeepDoneSection(summary: KeepingUpSummary | null): ReportListSection {
  const band = summary?.upkeep;
  return {
    kind: 'list',
    heading: 'Upkeep done in this range',
    note: band?.historyNote,
    rows: band?.hasHistory ? [band.headline, band.standingLine, ...band.recent.map((doing) => `${doing.itemName}: ${doing.line}`)].filter(Boolean) : [],
    empty: summary ? 'Nothing marked done in this range.' : 'Could not be read for this report.',
  };
}

// --- Meals and shopping -------------------------------------------------

export type MealAheadRow = { scheduledFor: string; title: string; mealType: string | null; dishes: string[] };

export function mealsAheadSection(meals: MealAheadRow[], days: number): ReportTableSection {
  const rows = [...meals].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  return {
    kind: 'table',
    heading: `Meals scheduled for the next ${days} days`,
    note: 'What Schedules holds from today on, whatever range the report covers.',
    columns: ['When', 'Meal', 'Dishes'],
    rows: rows.map((meal) => [when(meal.scheduledFor), meal.mealType ? `${meal.title} (${meal.mealType})` : meal.title, meal.dishes.join(', ')]),
    empty: 'No meals scheduled ahead. Schedules > Meal Plan makes a plan.',
  };
}

export type GroceryRow = { category: string; foodName: string; quantity: number; unit: string; checked: boolean; price: number | null };

export function groceryListSection(listName: string | null, items: GroceryRow[]): ReportTableSection {
  const rows = [...items].sort((a, b) => a.category.localeCompare(b.category) || a.foodName.localeCompare(b.foodName));
  const got = rows.filter((item) => item.checked).length;
  const amount = (item: GroceryRow): string => {
    if (!(item.quantity > 0)) return '';
    const rounded = Math.round(item.quantity * 10) / 10;
    return item.unit ? `${rounded} ${item.unit}` : String(rounded);
  };
  return {
    kind: 'table',
    heading: 'Grocery list',
    note: listName ? `${listName}: ${count(rows.length, 'item')}, ${got} already got.` : undefined,
    columns: ['Aisle', 'Food', 'Amount', 'Got it', 'Price'],
    rows: rows.map((item) => [item.category, foodDisplayName(item.foodName), amount(item), item.checked ? 'Yes' : '', item.price == null ? '' : formatFinanceMoney(item.price)]),
    empty: 'No grocery list open. Life > Grocery List makes one.',
  };
}

// --- Kitchen ------------------------------------------------------------

export type KitchenRow = { foodName: string; category: string; quantityRemaining: number; unit: string; location: string | null; addedAt: string };

export function kitchenItemsSection(items: KitchenRow[]): ReportTableSection {
  const rows = items
    .filter((item) => item.quantityRemaining > 0)
    .sort((a, b) => a.category.localeCompare(b.category) || a.foodName.localeCompare(b.foodName));
  return {
    kind: 'table',
    heading: 'Everything on hand',
    note: rows.length > 0 ? `${count(rows.length, 'item')} on hand on the day this was made, whatever the range.` : undefined,
    columns: ['Food', 'Kind', 'Left', 'Where', 'Added'],
    rows: rows.map((item) => [
      foodDisplayName(item.foodName),
      item.category,
      `${Math.round(item.quantityRemaining * 10) / 10}${item.unit ? ` ${item.unit}` : ''}`,
      item.location ?? '',
      item.addedAt.slice(0, 10),
    ]),
    empty: 'Nothing in Life > Kitchen yet.',
  };
}

// --- Keeping up ---------------------------------------------------------

export function keepingUpSections(summary: KeepingUpSummary | null): ReportSection[] {
  if (!summary) return [{ kind: 'list', heading: 'Keeping up', rows: [], empty: 'Could not be read for this report.' }];
  const { checks, routines, captures } = summary;
  return [
    {
      kind: 'list',
      heading: 'Did I Do It',
      note: [checks.gapNote, checks.caveat].filter(Boolean).join(' ') || undefined,
      rows: checks.hasChecks ? [checks.headline, ...checks.standings.map((standing) => `${standing.name}: ${standing.line}`)] : [],
      empty: 'No checks made yet. Life > Did I Do It is where one is made.',
    },
    {
      kind: 'list',
      heading: 'Routines',
      note: [routines.gapNote, routines.note].filter(Boolean).join(' ') || undefined,
      rows: routines.hasRuns
        ? [routines.headline, ...routines.standings.map((standing) => `${standing.routineName}: ${standing.line}`), ...routines.stalls.map((stall) => stall.line)]
        : [],
      empty: 'No routine run in this range. Life > Routines holds them.',
    },
    {
      kind: 'list',
      heading: 'Things captured',
      note: [captures.gapNote, captures.note].filter(Boolean).join(' ') || undefined,
      rows: captures.hasCaptures ? [captures.headline] : [],
      empty: 'Nothing captured in this range.',
    },
  ];
}

// --- Interests, projects and Learn --------------------------------------

export function interestsSection(interests: Interest[]): ReportTableSection {
  const rows = [...interests].sort((a, b) => Number(Boolean(a.retiredAt)) - Number(Boolean(b.retiredAt)) || a.name.localeCompare(b.name));
  return {
    kind: 'table',
    heading: 'Interests',
    note: 'Every interest kept in Interests, the ones stepped back from last.',
    columns: ['Interest', 'Stages', 'Started', 'Where it was left off', 'Now'],
    rows: rows.map((interest) => [
      interest.name,
      INTEREST_STAGES.filter((stage) => interest.stages[stage]).map((stage) => INTEREST_STAGE_LABELS[stage]).join(', '),
      interest.startedOn ?? '',
      interest.leftOff ?? '',
      interest.retiredAt ? 'Stepped back' : 'Going',
    ]),
    empty: 'No interests kept yet. Interests is where one is added.',
  };
}

export function interestTimeSection(summary: KeepingUpSummary | null): ReportListSection {
  const band = summary?.interestTime;
  return {
    kind: 'list',
    heading: 'Time given to interests',
    note: [band?.gapNote, band?.caveat].filter(Boolean).join(' ') || undefined,
    rows: band?.hasSessions ? [band.headline, ...band.standings.map((standing) => `${standing.interestName}: ${standing.line}`)] : [],
    empty: summary ? 'No sessions logged in this range.' : 'Could not be read for this report.',
  };
}

const PROJECT_STATUS_WORDS: Record<string, string> = { active: 'Going', paused: 'Paused', finished: 'Finished', stopped: 'Stopped' };

export function projectsSection(projects: Project[], steps: ProjectStep[], area: ProjectArea | null): ReportTableSection {
  const chosen = projects.filter((project) => area == null || project.area === area);
  const order = ['active', 'paused', 'finished', 'stopped'];
  const rows = [...chosen].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.name.localeCompare(b.name));
  return {
    kind: 'table',
    heading: area ? `${PROJECT_AREA_LABELS[area]} projects` : 'Projects',
    note: 'Every project kept, going ones first. Steps kept for later are left out of the count.',
    columns: ['Project', 'Area', 'Now', 'Steps done', 'Due', 'Left off'],
    rows: rows.map((project) => {
      const own = steps.filter((step) => step.projectId === project.id && !step.parked);
      const done = own.filter((step) => step.doneAt).length;
      return [
        project.name,
        PROJECT_AREA_LABELS[project.area] ?? project.area,
        PROJECT_STATUS_WORDS[project.status] ?? project.status,
        own.length > 0 ? `${done} of ${own.length}` : '',
        project.dueOn ?? '',
        project.pausedNote ?? '',
      ];
    }),
    empty: 'No projects kept yet.',
  };
}

// Money spent and earned on hobbies and interests (2026-11-15). Called
// "hobbies and interests" everywhere money is read, so it is never taken for
// interest paid on a loan or earned at a bank.
export function hobbyMoneySection(entries: MoneyEntry[], interests: Interest[], start: string, end: string): ReportTableSection {
  const names = new Map(interests.map((interest) => [interest.id, interest.name]));
  const rows = entries.filter((entry) => inRange(entry.onDay, start, end) && entry.amount > 0);
  const byInterest = new Map<string, { out: number; in: number; count: number }>();
  for (const entry of rows) {
    const name = names.get(entry.interestId) ?? 'An interest no longer listed';
    const sums = byInterest.get(name) ?? { out: 0, in: 0, count: 0 };
    if (entry.direction === 'in') sums.in += entry.amount;
    else sums.out += entry.amount;
    sums.count += 1;
    byInterest.set(name, sums);
  }
  const spent = rows.filter((entry) => entry.direction !== 'in').reduce((sum, entry) => sum + entry.amount, 0);
  const earned = rows.filter((entry) => entry.direction === 'in').reduce((sum, entry) => sum + entry.amount, 0);
  return {
    kind: 'table',
    heading: 'Hobbies and interests',
    note:
      rows.length > 0
        ? `${count(rows.length, 'entry', 'entries')} in the range. Spent: ${formatFinanceMoney(spent)}. Came in: ${formatFinanceMoney(earned)}. Recorded under Interests, Spending and Earning, apart from Finances, so nothing is counted twice. Interest paid on a loan or earned at a bank is in Finances, not here.`
        : 'Recorded under Interests, Spending and Earning, apart from Finances. Interest paid on a loan or earned at a bank is in Finances, not here.',
    columns: ['Interest', 'Spent', 'Came in', 'Entries'],
    rows: [...byInterest.entries()]
      .sort((a, b) => b[1].out - a[1].out || a[0].localeCompare(b[0]))
      .map(([name, sums]) => [name, sums.out > 0 ? formatFinanceMoney(sums.out) : '', sums.in > 0 ? formatFinanceMoney(sums.in) : '', String(sums.count)]),
    empty: 'Nothing spent or earned on hobbies and interests in this range. Interests, Spending and Earning is where it goes in.',
  };
}

const THING_KIND_WORDS: Record<ThingKind, string> = { supply: 'Supply or equipment', collection: 'Collection', wish: 'Wished for' };

/** Supplies, collections and wishes as they stand now, kept ones first. */
export function interestThingsSection(things: InterestThing[], interests: Interest[]): ReportTableSection {
  const names = new Map(interests.map((interest) => [interest.id, interest.name]));
  const order: ThingKind[] = ['supply', 'collection', 'wish'];
  const rows = [...things].sort(
    (a, b) =>
      Number(Boolean(a.retiredAt)) - Number(Boolean(b.retiredAt)) ||
      order.indexOf(a.kind) - order.indexOf(b.kind) ||
      a.name.localeCompare(b.name),
  );
  return {
    kind: 'table',
    heading: 'Supplies, collections and wishes',
    note: 'Everything kept under Interests as it stands today, whatever the range. Things no longer had come last.',
    columns: ['Thing', 'Kind', 'Interest', 'How many', 'Cost', 'Now'],
    rows: rows.map((thing) => [
      thing.setName ? `${thing.name} (${thing.setName})` : thing.name,
      THING_KIND_WORDS[thing.kind],
      names.get(thing.interestId) ?? 'An interest no longer listed',
      thing.amount ?? '',
      thing.cost == null ? '' : formatFinanceMoney(thing.cost),
      thing.retiredAt ? 'No longer had' : thing.kind === 'wish' ? 'Wished for' : 'Kept',
    ]),
    empty: 'No supplies, collections or wishes kept yet. Interests holds them.',
  };
}

/** The Library as it stands now, with what was finished in the range said first. */
export function interestLibrarySection(entries: LibraryEntry[], interests: Interest[], start: string, end: string): ReportTableSection {
  const names = new Map(interests.map((interest) => [interest.id, interest.name]));
  const finished = entries.filter((entry) => entry.doneOn && inRange(entry.doneOn, start, end)).length;
  const order: LibraryStatus[] = ['going', 'following', 'want', 'done'];
  const rows = [...entries].sort(
    (a, b) =>
      Number(Boolean(a.retiredAt)) - Number(Boolean(b.retiredAt)) ||
      order.indexOf(a.status) - order.indexOf(b.status) ||
      a.title.localeCompare(b.title),
  );
  return {
    kind: 'table',
    heading: 'Library',
    note: `${count(finished, 'entry', 'entries')} marked Finished in the range. The list is the Library as it stands today, entries taken off it last.`,
    columns: ['Title', 'Kind', 'By', 'Interest', 'Where it stands', 'Left off'],
    rows: rows.map((entry) => [
      entry.title,
      entry.kind ?? '',
      entry.byWhom ?? '',
      names.get(entry.interestId) ?? 'An interest no longer listed',
      entry.retiredAt ? 'Taken off the list' : entry.status === 'done' && entry.doneOn ? `${LIBRARY_STATUS_LABELS.done}, ${entry.doneOn}` : LIBRARY_STATUS_LABELS[entry.status],
      entry.leftOff ?? '',
    ]),
    empty: 'Nothing in the Library yet. Interests, Library is where a book, a course or a channel goes in.',
  };
}

export type LearnReviewRow = { cardId: string; day: string; recalled: boolean };

/** Counts only: Learn keeps percentages behind a link the person opens. */
export function learnSection(reviews: LearnReviewRow[], start: string, end: string): ReportListSection {
  const rows = reviews.filter((review) => inRange(review.day, start, end));
  const days = new Set(rows.map((review) => review.day)).size;
  const cards = new Set(rows.map((review) => review.cardId)).size;
  const recalled = new Set(rows.filter((review) => review.recalled).map((review) => review.cardId)).size;
  return {
    kind: 'list',
    heading: 'Learn',
    rows:
      rows.length > 0
        ? [
            `${count(rows.length, 'answer')} on ${count(days, 'day')}, across ${count(cards, 'different card')}.`,
            `${count(recalled, 'card')} answered from memory at least once in this range.`,
          ]
        : [],
    empty: 'No cards answered in this range. Interests > Learn holds the decks.',
  };
}
