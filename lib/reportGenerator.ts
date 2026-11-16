import { withSeverityPrefix } from './ruleSeverity';
import {
  getDatabase,
  getLabTests,
  getUserConditions,
  listAllActiveTreatments,
  listAllConditions,
  listBodyMeasurements,
  listCheckinsBetween,
  listLabResults,
  listPersonalRules,
  listFoodTrials,
  getStoredMeasurementSystem,
  type LabResultRecord,
} from './db';
import { getCheckinTagDefinition } from './checkinTags';
import { chartCaption, type ReportChart } from './reportCharts';
import {
  getNutrientTrendSeriesForCodes,
  getSixDimensionsFlagTrendSeries,
  getSleepTrendPoints,
  getStepTrendPoints,
} from './trendAnalysis';
import { APP_VERSION } from '../constants/version';
import { REFERENCE_DB_VERSION } from './referenceDbVersion';
import { reportVersionLine } from './reportVersion';
import {
  costSections,
  eatingCostSection,
  eatingVarietyBrief,
  eatingVarietySections,
  gardenYieldSections,
  insuranceSection,
  medicalBillsSection,
  cleanLeftOut,
  leftOutPrefaceLine,
  REPORT_KIND_BY_KEY,
  sectionsFromReading,
  type ExtraSectionId,
  type ReportKind,
} from './reportKinds';
import type { ReadingView } from './readingBands';
import { heartSection } from './reportHeart';
import { diarySection } from './reportDiary';
import { listDiaryCheckins, listDiaryMeals } from './reportDiaryDb';
import { listBodySignalReadings, listScheduledDoses, loadSinceLastVisitView, loadTrendsMoreView, type TrendsMoreLens } from './trendsMoreDb';
import { buildAtAGlance, type GlanceTag } from './reportGlance';
import { addDays } from './eatingVariety';
import { loadInsightsMoreView, type InsightsMoreLens } from './insightsMoreDb';
import { getActiveInsurancePlan, listMedicalBills } from './financeHealthDb';
import { describePlanStanding, planStanding } from './financeHealth';
import { getCostSummary } from './costOfEatingDb';
import { getHarvestYieldSummary } from './harvestYieldDb';
import { getMealVarietySummary } from './mealVarietyDb';
import { reportPhotoTextLine } from './reportPhotos';
import { plantingPhotoSection, symptomPhotoSection } from './reportPhotosDb';
import { evaluateInteractionRules } from './interactionRules';
import { findFoodPatterns } from './patternFinder';
import { readExperimentInput, readSteppedInput } from './foodExperimentDb';
import { experimentResultLines } from './foodExperiment';
import { orderedSteps, steppedResultLines, steppedStage } from './steppedReintroduction';
import { experimentsSection, flareMarksSection, noticedSection, NOTICED_WINDOW_HOURS, type ExperimentForReport } from './reportNoticed';
import { readOrClosed } from './vaultReads';
import { isCategoryClosed } from './vaultState';
import type { VaultCategory } from './vault';
import {
  allergiesSection,
  bloodPressureLogSection,
  bowelSections,
  emergencyCardSection,
  groceryListSection,
  interestTimeSection,
  interestsSection,
  hobbyMoneySection,
  interestThingsSection,
  interestLibrarySection,
  keepingUpSections,
  kitchenItemsSection,
  labHistorySection,
  learnSection,
  mealsAheadSection,
  medListSection,
  microbiomeSection,
  moneyEntriesSection,
  hobbyMoneyRows,
  projectsSection,
  therapyResponseSection,
  therapySessionsSection,
  trackerSections,
  upkeepDoneSection,
  upkeepStandingSection,
} from './reportMore';
import { listBloodPressureReadings } from './trendsMoreDb';
import { listBowelEntriesBetween } from './bowelDb';
import { getTherapyResponseInputs, listFoodAllergies, listTherapySessions, listTodaysMealsWithRecipes } from './db';
import { DIARY_NOTE, REPORT_COLUMNS, reportRows, summariseDiary } from './bladderDiary';
import { listBladderDiariesBetween, listBladderEntries, listDiaryDrinks } from './bladderDiaryDb';
import { detectMeasurementSystemFromLocale } from './measurement';
import { summarizeTherapyResponse, describeTherapyResponse } from './therapyResponse';
import { therapyTypeLabel } from './therapyTypes';
import { listCustomTrackers, listTrackerEntriesSince } from './customTrackersDb';
import { listMicrobiomeTests } from './microbiomeDb';
import { gatherFromApp, getEmergencyProfile, listEmergencyContacts } from './emergencyDb';
import { buildEmergencyCard } from './emergency';
import { listEntries } from './financeDb';
import { listUpkeepItems, listUpkeepPlaces } from './upkeepDb';
import { placeLabel, upkeepStanding } from './upkeep';
import { getKeepingUpSummary } from './keepingUpDb';
import { getActiveGroceryList, getGroceryListItems } from './groceryDb';
import { listKitchenInventory } from './kitchenDb';
import { listInterests } from './interestsDb';
import { listInterestMoney } from './interestMoneyDb';
import { listInterestThings } from './interestThingsDb';
import { listLibrary } from './interestLibraryDb';
import { listProjectSteps, listProjects } from './projectsDb';
import { listLearnReviews } from './learnDb';
import { isRecalled } from './learnSchedule';

// Same real, small nutrient set app/(tabs)/index.tsx (Home) and
// app/(tabs)/trends.tsx both already use, duplicated here rather than
// imported -- a lib/ file importing from an app/ screen would be a real,
// backwards architectural direction nowhere else in this codebase does,
// even though it happens to type-check fine. Matches the same "duplicate
// a small, real constant rather than reach the wrong direction for it"
// precedent already established for todayDateString (see
// trendAnalysis.ts's own identical comment).
const CORE_NUTRIENT_CODES = ['iodine', 'selenium', 'zinc', 'iron', 'vitamin_d', 'calcium', 'magnesium', 'copper', 'vitamin_b12'];

// The report is one document, built once, rendered two ways (2026-09-14).
// buildReport gathers everything into a ReportDocument; renderReportText
// turns it into the plain text the Reports tab shows on screen and the
// share sheet carries as a message, and lib/reportHtml.ts turns the same
// document into the HTML that expo-print lays out as a PDF. Neither
// renderer computes anything, so the two can never disagree about what
// was logged.
//
// Everything here reuses functions that already exist for a screen
// (getNutrientTrendSeriesForCodes and getSixDimensionsFlagTrendSeries are the
// same per-day loops Trends runs; listAllActiveTreatments is what My Meds
// reads; getStepTrendPoints and getSleepTrendPoints are Trends >
// Movement), matching this app's standing "computation stays in lib/,
// don't re-derive it twice" discipline.

/** A chart drawn under a section's rows in the PDF (K3, 1.0.53.11), from
 *  the same figures the rows summarise. lib/reportCharts.ts draws it and
 *  writes its caption, which is all the plain-text view carries. */
export type ReportSectionChart = { title: string; chart: ReportChart };

export type ReportListSection = {
  kind: 'list';
  heading: string;
  charts?: ReportSectionChart[];
  /** Shown under the heading, before the rows. For a section whose
   *  contents need framing before anyone reads them. */
  note?: string;
  rows: string[];
  /** What to say when rows is empty. */
  empty: string;
};

export type ReportTableSection = {
  kind: 'table';
  heading: string;
  charts?: ReportSectionChart[];
  note?: string;
  columns: string[];
  rows: string[][];
  empty: string;
};

/** Photos at the report size (1.0.53.7). The PDF shows each one with its
 *  caption; the plain-text view says how many there are, since a text
 *  message cannot carry them. Built in lib/reportPhotosDb.ts. */
export type ReportPhotoSection = {
  kind: 'photos';
  heading: string;
  note?: string;
  rows: { caption: string; dataUri: string }[];
  empty: string;
};

export type ReportSection = ReportListSection | ReportTableSection | ReportPhotoSection;

export type ReportDocument = {
  title: string;
  /** "2026-08-16 to 2026-09-14" */
  rangeLabel: string;
  days: number;
  /** ISO date-time, local. */
  generatedAt: string;
  preface: string[];
  sections: ReportSection[];
  footer: string;
  /** What produced the figures. A score in this app is worked out live
   *  from the bundled reference database, which also holds the cited
   *  interaction rules, so the same weeks reported twice can differ after
   *  a reference update. Without this line nothing on the page would say
   *  why, and a clinician comparing two printouts could not tell a change
   *  in the person from a change in the app. */
  versionLine: string;
};

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rangeStartDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return isoDate(d);
}

function formatDateRange(days: number): string {
  return `${rangeStartDate(days)} to ${isoDate(new Date())}`;
}

function severityLabel(severity: number | null): string {
  if (severity == null) return 'unspecified';
  const labels = ['', 'mild', 'moderate', 'significant', 'severe'];
  return labels[severity] ?? String(severity);
}

function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

// Which report is being built (1.0.52.7). The Overview carries every core
// section; each narrower report names the core sections its reader needs
// in lib/reportKinds.ts, and the ones it leaves out are never gathered, so
// the Trainer report does not wait on a nutrient pass it will not show.
// K10: the person can leave any of a report's sections out of one copy,
// and a section left out is skipped the same way, never gathered.
// What a section held in a closed vault says in place of its rows.
const IN_THE_VAULT = 'In the vault, which is closed. Open it and make the report again to include this.';

export async function buildReport(
  days: number,
  kind: ReportKind = 'overview',
  leftOutIds: readonly string[] = [],
): Promise<ReportDocument> {
  const def = REPORT_KIND_BY_KEY[kind];
  const leftOut = cleanLeftOut(kind, leftOutIds);
  const want = new Set<string>(def.core.filter((id) => !leftOut.includes(id)));
  const sections: ReportSection[] = [];
  const rangeStart = rangeStartDate(days);
  const rangeEnd = isoDate(new Date());

  // K2: the front page, first so a reader sees it before anything else.
  if (want.has('glance')) sections.push(await glanceSection(rangeStart, rangeEnd));

  // Tracked conditions. The codes are read whenever the flags section is
  // wanted too, since that section is scoped to them.
  const userConditionCodes = want.has('conditions') || want.has('flags') ? await getUserConditions() : [];
  if (want.has('conditions') && isCategoryClosed('conditions')) {
    // Scoring still reads the conditions, so the flags below stay; only
    // naming them waits for the vault to be opened.
    sections.push({ kind: 'list', heading: 'Tracked conditions', rows: [], empty: IN_THE_VAULT });
  } else if (want.has('conditions')) {
    const allConditions = await listAllConditions();
    const conditionNames = userConditionCodes
      .map((code) => allConditions.find((c) => c.code === code)?.name ?? code)
      .sort((a, b) => a.localeCompare(b));
    sections.push({
      kind: 'list',
      heading: 'Tracked conditions',
      rows: conditionNames,
      empty: 'None selected in Profile.',
    });
  }

  // Nutrient highlights: the same per-nutrient series Trends' Nutrients
  // lens computes, averaged across the range rather than plotted point by
  // point. All nine come from one pass over the logged ingredients
  // (2026-09-14): nine separate passes took minutes on a phone.
  if (want.has('nutrients')) {
    const nutrientRows: string[][] = [];
    const nutrientSeries = await getNutrientTrendSeriesForCodes(CORE_NUTRIENT_CODES, rangeStart, isoDate(new Date()));
    for (const code of CORE_NUTRIENT_CODES) {
      const series = nutrientSeries.get(code);
      if (!series || series.points.length === 0 || !series.displayName) continue;
      const avg = series.points.reduce((sum, point) => sum + point.value, 0) / series.points.length;
      nutrientRows.push([series.displayName, `${Math.round(avg)}%`, String(series.points.length)]);
    }
    sections.push({
      kind: 'table',
      heading: 'Nutrient intake',
      note: 'Average percent of the daily target, over the days with a logged meal. Days with nothing logged are left out rather than counted as zero.',
      columns: ['Nutrient', 'Average of target', 'Days logged'],
      rows: nutrientRows,
      empty: 'No meals logged in this range yet.',
    });
  }

  // Condition-scoped flag summary -- reuses the exact same real daily
  // series the Trends Condition Scores lens already computes, and the
  // same userConditionCodes already fetched above for the tracked-
  // conditions section, rather than a second fetch. 2026-08-26: this used
  // to count every currently-scored sub-criterion regardless of
  // relevance; now it's scoped to what's actually relevant to the
  // conditions named directly above it, so the two sections agree with
  // each other.
  if (want.has('flags')) {
    const sixDsSeries = await getSixDimensionsFlagTrendSeries(days, userConditionCodes);
    const totalFlaggedItemDays = sixDsSeries.reduce((sum, point) => sum + point.value, 0);
    sections.push({
      kind: 'list',
      heading: 'Condition score flags',
      charts: [
        {
          title: 'Flagged items a day',
          chart: { style: 'bars', startDate: rangeStart, endDate: rangeEnd, points: sixDsSeries, unit: 'flagged items', decimals: 0, slotNoun: 'day' },
        },
      ],
      note: 'Logged foods whose scored properties matter for the conditions above. A flag is a property worth knowing about, not a verdict on the food.',
      rows:
        sixDsSeries.length > 0
          ? [`${plural(totalFlaggedItemDays, 'flagged item')} logged across ${plural(sixDsSeries.length, 'day')} with meals.`]
          : [],
      empty: 'No meals logged in this range yet.',
    });
  }

  // K9: the food and symptom diary, one row a day, for the Nutritionist.
  if (want.has('diary')) {
    const [meals, checkins] = await Promise.all([
      listDiaryMeals(rangeStart, rangeEnd).catch((error: unknown) => {
        console.warn('[reports] could not read meals for the diary', error);
        return null;
      }),
      listDiaryCheckins(rangeStart, rangeEnd).catch((error: unknown) => {
        console.warn('[reports] could not read check-ins for the diary', error);
        return null;
      }),
    ]);
    sections.push(diarySection(meals, checkins, rangeStart, rangeEnd));
  }

  // Symptom/flare log -- real, chronological, everything actually logged
  // in the window, not just a count the way the 6-DFF section above is.
  if (want.has('symptoms')) {
    // Read by the range alone, never by a count (2026-11-15), so a long
    // range is never cut short.
    const symptomEntries = (await listCheckinsBetween(['flare', 'post_meal'], rangeStart, rangeEnd))
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
    const perDay = new Map<string, number>();
    for (const entry of symptomEntries) {
      const day = entry.loggedAt.slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    sections.push({
      kind: 'table',
      heading: 'Symptoms and flares',
      charts: [
        {
          title: 'Flares and reactions logged a day',
          chart: {
            style: 'bars',
            startDate: rangeStart,
            endDate: rangeEnd,
            points: [...perDay.entries()].map(([date, value]) => ({ date, value })),
            unit: 'logged',
            decimals: 0,
            slotNoun: 'day',
          },
        },
      ],
      note: 'Every flare and after-meal reaction logged in the range, in order. Severity is as the person rated it at the time.',
      columns: ['When', 'Kind', 'Severity', 'Food', 'Tags', 'Notes'],
      rows: symptomEntries.map((entry) => [
        entry.loggedAt.slice(0, 16).replace('T', ' '),
        entry.checkinType === 'flare' ? 'Flare' : 'Reaction',
        severityLabel(entry.severity),
        entry.foodName ?? '',
        entry.tags.map((code) => getCheckinTagDefinition(code)?.label ?? code).join(', '),
        entry.notes ?? '',
      ]),
      empty: 'None logged in this range.',
    });
  }

  // K6: what Pattern Finder counted and the food experiments, each a
  // hypothesis, right after the symptoms they were counted against.
  if (want.has('noticed')) sections.push(...(await noticedSections(days, rangeStart, rangeEnd)));

  // Active meds/supplements/prescriptions -- reuses the exact real
  // registry My Meds & Interactions already reads (listAllActiveTreatments,
  // 2026-08-08), so this section can never drift from what's actually
  // marked active there.
  if (want.has('meds') && isCategoryClosed('medications')) {
    sections.push({ kind: 'list', heading: 'Active medications and supplements', rows: [], empty: IN_THE_VAULT });
  } else if (want.has('meds')) {
    const treatments = await listAllActiveTreatments();
    sections.push({
      kind: 'table',
      heading: 'Active medications and supplements',
      note: 'Everything currently marked active in Life > My Meds. Not scoped to the date range.',
      columns: ['Name', 'Dose', 'How often', 'Type'],
      rows: treatments.map((treatment) => [
        treatment.name,
        treatment.doseAmount != null ? `${treatment.doseAmount}${treatment.doseUnit ?? ''}` : '',
        treatment.frequency ?? '',
        treatment.treatmentType,
      ]),
      empty: 'None currently marked active.',
    });
  }

  // Movement, 2026-09-14: what the phone's health store brought in by way
  // of Life > Movement, summarised the way Trends > Movement captions it.
  // Steps and sleep are the two signals a doctor or trainer asks about
  // first; the rest of the store stays in the app. Weight and blood
  // pressure follow in a separate section since they are readings, not a
  // range average.
  if (want.has('movement')) {
    const [stepPoints, sleepPoints] = await Promise.all([getStepTrendPoints(days), getSleepTrendPoints(days)]);
    const movementRows: string[] = [];
    if (stepPoints.length > 0) {
      const average = stepPoints.reduce((sum, point) => sum + point.value, 0) / stepPoints.length;
      movementRows.push(`Steps: ${Math.round(average).toLocaleString()} a day, averaged over ${plural(stepPoints.length, 'recorded day')}.`);
    }
    if (sleepPoints.length > 0) {
      const average = sleepPoints.reduce((sum, point) => sum + point.value, 0) / sleepPoints.length;
      movementRows.push(`Sleep: ${average.toFixed(1)} hours a night, averaged over ${plural(sleepPoints.length, 'recorded night')}.`);
    }
    sections.push({
      kind: 'list',
      heading: 'Movement and sleep',
      charts: [
        {
          title: 'Steps a day',
          chart: { style: 'bars', startDate: rangeStart, endDate: rangeEnd, points: stepPoints, unit: 'steps', decimals: 0, slotNoun: 'day' },
        },
        {
          title: 'Hours of sleep a night',
          chart: { style: 'bars', startDate: rangeStart, endDate: rangeEnd, points: sleepPoints, unit: 'hours', decimals: 1, slotNoun: 'night' },
        },
      ].filter((entry) => entry.chart.points.length > 0) as ReportSectionChart[],
      note: "From the phone's health store, where connected. Days the phone did not record are left out rather than counted as zero.",
      rows: movementRows,
      empty: "Nothing from the phone's health store in this range. Life > Movement connects it.",
    });
  }

  // Weight and blood pressure: the most recent reading of each, whether
  // typed in or brought in from the phone, plus the earliest in the range
  // for weight so a change over the window is visible without a chart.
  if (want.has('body')) {
    const measurements = await listBodyMeasurements();
    const latestOf = (type: string) => measurements.find((row) => row.measurementType === type) ?? null;
    const bodyRows: string[][] = [];
    const weight = latestOf('weight');
    if (weight) {
      const inRange = measurements
        .filter((row) => row.measurementType === 'weight' && row.loggedAt.slice(0, 10) >= rangeStart)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
      const earliest = inRange[0];
      const change =
        earliest && earliest.id !== weight.id && earliest.unit === weight.unit
          ? `${weight.value - earliest.value >= 0 ? '+' : ''}${(weight.value - earliest.value).toFixed(1)} ${weight.unit} since ${earliest.loggedAt.slice(0, 10)}`
          : '';
      bodyRows.push(['Weight', `${weight.value} ${weight.unit}`, weight.loggedAt.slice(0, 10), change]);
    }
    const systolic = latestOf('blood_pressure_systolic');
    const diastolic = latestOf('blood_pressure_diastolic');
    if (systolic && diastolic) {
      bodyRows.push([
        'Blood pressure',
        `${Math.round(systolic.value)}/${Math.round(diastolic.value)} ${systolic.unit}`,
        systolic.loggedAt.slice(0, 10),
        '',
      ]);
    }
    const weightCharts: ReportSectionChart[] = [];
    if (weight) {
      const readings = measurements
        .filter((row) => row.measurementType === 'weight' && row.unit === weight.unit && row.loggedAt.slice(0, 10) >= rangeStart)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
        .map((row) => ({ date: row.loggedAt.slice(0, 10), value: row.value }));
      if (readings.length > 1) {
        weightCharts.push({
          title: `Weight in this range, last reading of each day (${weight.unit})`,
          chart: { style: 'dots', startDate: rangeStart, endDate: rangeEnd, points: readings, unit: weight.unit, decimals: 1, slotNoun: 'day' },
        });
      }
    }
    sections.push({
      kind: 'table',
      heading: 'Weight and blood pressure',
      charts: weightCharts,
      note: 'The most recent reading of each, typed in or brought in from the phone. Not scoped to the date range.',
      columns: ['Measure', 'Reading', 'Date', 'Change in range'],
      rows: bodyRows,
      empty: 'None logged yet.',
    });
  }

  // Resting heart rate and heart rate variability (K8, 2026-09-29), each
  // beside the person's usual range, the same as Trends > Body Signals.
  if (want.has('heart')) {
    const readings = await listBodySignalReadings().catch((error: unknown) => {
      console.warn('[reports] could not read body signals', error);
      return null;
    });
    sections.push(heartSection(readings, rangeStart, rangeEnd));
  }

  // The person's own rules -- the personal half of the interaction rules
  // engine, 2026-08-18. Kept in a clearly separate, clearly labeled
  // section, on purpose: this app's own architecture plan requires that
  // a personal hunch or a doctor's own specific instruction never gets
  // confused with the cited research elsewhere in this same report, and
  // that requirement applies here most of all, since a report like this
  // is likely to actually be read by a doctor. Only active rules are
  // included -- a paused one isn't currently something the person is
  // acting on. Each line states plainly whether it came from the person
  // or their own doctor, never presented as verified medical fact.
  if (want.has('rules')) {
    const activePersonalRules = (await listPersonalRules(true)).filter((rule) => rule.active);
    sections.push({
      kind: 'list',
      heading: 'Personal notes and rules',
      note: 'Self-reported. These are observations the person has made or instructions a clinician has given them, written in their words. None of it is from cited research, and none of it has been verified by this app.',
      rows: activePersonalRules.map(
        (rule) => `${rule.description} (${rule.source === 'doctor' ? 'an instruction from a clinician' : "the person's observation"})`,
      ),
      empty: 'None saved.',
    });
  }

  // Recent labs -- most recent result per test, matching Insights' own
  // Labs lens precedent, deliberately not scoped to the date range: a
  // lab drawn 4 months ago is still the real, current, relevant value for
  // a report handed to a doctor, unlike daily nutrient/symptom logging.
  if (want.has('labs')) {
    const [labResults, labTests] = await Promise.all([listLabResults(), getLabTests()]);
    const testNames = new Map(labTests.map((test) => [test.code, test.displayName]));
    const mostRecentByTest = new Map<string, LabResultRecord>();
    for (const result of labResults) {
      if (!mostRecentByTest.has(result.testCode)) mostRecentByTest.set(result.testCode, result);
    }
    const recentLabs = [...mostRecentByTest.values()].sort((a, b) => b.testedAt.localeCompare(a.testedAt));
    sections.push({
      kind: 'table',
      heading: 'Most recent lab results',
      note: "The latest result for each test, whenever it was drawn. The range shown is the one the person's lab reported, not a general reference range.",
      columns: ['Test', 'Result', 'Lab range', 'Tested', 'Lab'],
      rows: recentLabs.map((result) => [
        testNames.get(result.testCode) ?? result.testCode,
        `${result.value} ${result.unit}`,
        result.labRangeLow != null && result.labRangeHigh != null ? `${result.labRangeLow} to ${result.labRangeHigh}` : '',
        result.testedAt.slice(0, 10),
        result.labName ?? '',
      ]),
      empty: 'None logged yet.',
    });
  }

  sections.push(...(await kindSections(kind, days, leftOut)));

  const leftOutLine = leftOutPrefaceLine(leftOut.length);
  return {
    title: def.title,
    rangeLabel: formatDateRange(days),
    days,
    generatedAt: new Date().toISOString(),
    preface: leftOutLine ? [...def.preface, leftOutLine] : def.preface,
    sections,
    footer: `Generated on the phone by Lifestead ${APP_VERSION}. Nothing in this report left the phone until the person chose to share it.`,
    versionLine: reportVersionLine(APP_VERSION, REFERENCE_DB_VERSION),
  };
}

// K2's front page. Reads the check-ins, doses, body readings and labs over
// the range and hands them to the pure builder in lib/reportGlance.ts. A
// check-in's time is stored in UTC, so the window reaches a day early and
// the builder narrows it by the local day.
async function glanceSection(rangeStart: string, rangeEnd: string): Promise<ReportSection> {
  try {
    const db = await getDatabase();
    const [tagRows, doses, measurements, labResults, labTests] = await Promise.all([
      readOrClosed(() => db.getAllAsync<{ loggedAt: string; checkinType: string; tagCode: string | null; severity: number | null }>(
        `SELECT c.logged_at AS loggedAt, c.checkin_type AS checkinType, t.tag_code AS tagCode, t.severity AS severity
         FROM wellbeing_checkins c LEFT JOIN checkin_tags t ON t.checkin_id = c.id
         WHERE c.logged_at >= ?`,
        addDays(rangeStart, -1),
      ), []),
      listScheduledDoses({ start: rangeStart, end: rangeEnd }),
      listBodyMeasurements(),
      listLabResults(),
      getLabTests(),
    ]);
    const checkins: GlanceTag[] = tagRows.map((row) => {
      const definition = row.tagCode ? getCheckinTagDefinition(row.tagCode) : undefined;
      return {
        ...row,
        label: definition?.label ?? row.tagCode,
        // A tag this phone has no definition for was somebody's own symptom.
        negative: definition ? definition.usualValence === 'negative' : true,
      };
    });
    const latestOf = (type: string) => measurements.find((row) => row.measurementType === type) ?? null;
    const systolic = latestOf('blood_pressure_systolic');
    const diastolic = latestOf('blood_pressure_diastolic');
    const names = new Map(labTests.map((test) => [test.code, test.displayName]));
    const latestLab = new Map<string, LabResultRecord>();
    for (const result of labResults) if (!latestLab.has(result.testCode)) latestLab.set(result.testCode, result);
    return buildAtAGlance({
      rangeStart,
      today: rangeEnd,
      checkins,
      doses,
      weights: measurements
        .filter((row) => row.measurementType === 'weight')
        .map((row) => ({ loggedAt: row.loggedAt, value: row.value, unit: row.unit })),
      bloodPressure:
        systolic && diastolic
          ? { systolic: systolic.value, diastolic: diastolic.value, unit: systolic.unit, loggedAt: systolic.loggedAt }
          : null,
      labs: [...latestLab.values()].map((lab) => ({
        displayName: names.get(lab.testCode) ?? lab.testCode,
        value: lab.value,
        unit: lab.unit,
        low: lab.labRangeLow,
        high: lab.labRangeHigh,
        testedAt: lab.testedAt,
      })),
    });
  } catch (error) {
    console.warn('[reports] at a glance could not be read', error);
    return { kind: 'list', heading: 'At a glance', rows: [], empty: 'Could not be read for this report.' };
  }
}

// K6. Pattern Finder over the report's range in the window Trends opens
// on, scoped to the tracked conditions the way Trends scopes it, and every
// leave-it-out-then-bring-it-back experiment with its result. Each half
// fails on its own, so one unreadable half does not cost the other.
async function noticedSections(days: number, rangeStart: string, rangeEnd: string): Promise<ReportSection[]> {
  const patterns = (async () => {
    const [codes, conditions] = await Promise.all([getUserConditions(), listAllConditions()]);
    const tracked = conditions
      .filter((condition) => codes.includes(condition.code))
      .map((condition) => ({ code: condition.code, name: condition.name }));
    return findFoodPatterns(days, NOTICED_WINDOW_HOURS, tracked, 'flares');
  })().catch((error) => {
    console.warn('[reports] pattern finder could not be read', error);
    return null;
  });
  const experiments = (async () => {
    const trials = (await listFoodTrials()).filter(
      (trial) => trial.design === 'remove_return' || trial.design === 'stepped',
    );
    const made: ExperimentForReport[] = [];
    for (const trial of trials) {
      if (trial.design === 'stepped') {
        const stepped = await readSteppedInput(trial);
        if (!stepped) continue;
        const ordered = orderedSteps(stepped.steps);
        const finished = trial.status === 'cleared' || trial.status === 'flagged';
        made.push({
          foodName: trial.foodName,
          status: trial.status,
          removalStartedOn: ordered[0].startedOn,
          removalDays: stepped.washoutDays,
          returnedOn: finished ? ordered[ordered.length - 1].startedOn : null,
          observationDays: stepped.washoutDays,
          subject: 'food',
          lines: steppedResultLines(stepped),
          stepped: { stage: steppedStage(stepped.steps, stepped.washoutDays, stepped.today, trial.status) },
        });
        continue;
      }
      const input = await readExperimentInput(trial);
      if (!input) continue;
      made.push({
        foodName: trial.foodName,
        status: trial.status,
        removalStartedOn: input.removalStartedOn,
        removalDays: input.removalDays,
        returnedOn: input.returnedOn,
        observationDays: input.observationDays,
        subject: input.subject ?? null,
        lines: experimentResultLines(input),
      });
    }
    return made;
  })().catch((error) => {
    console.warn('[reports] food experiments could not be read', error);
    return null;
  });
  const [patternResult, experimentList] = await Promise.all([patterns, experiments]);
  return [
    noticedSection(patternResult),
    flareMarksSection(patternResult?.flareMarks),
    experimentsSection(experimentList, rangeStart, rangeEnd),
  ];
}

// The sections each narrower report adds after its core ones. A Trends or
// Insights lens is read through its loader and turned into sections by
// sectionsFromReading, so the report says what the lens says. Each lens is
// read separately and a failure reads as a section saying so, since one
// unreadable lens should not cost somebody the whole report.
async function readingSections(heading: string, read: () => Promise<ReadingView>): Promise<ReportSection[]> {
  try {
    return sectionsFromReading(heading, await read());
  } catch {
    return [{ kind: 'list', heading, rows: [], empty: 'Could not be read for this report.' }];
  }
}

// A13: the interaction rules that touch this person's active meds, each
// with how it works where that has been written, so a prescriber reading
// the report sees the reasoning and the source rather than a bare caution.
async function interactionSection(): Promise<ReportSection[]> {
  try {
    const evaluation = await evaluateInteractionRules(isoDate(new Date()));
    const rows = [
      ...evaluation.warnings.map((w) => [withSeverityPrefix(w.severity, w.title), w.message, w.mechanism ?? '', w.citation]),
      ...evaluation.referenceOnly.map((r) => [withSeverityPrefix(r.severity, r.title), r.guidance, r.mechanism ?? '', r.citation]),
    ];
    return [
      {
        kind: 'table',
        heading: 'Interaction notes for these meds',
        note:
          'Timing and combination notes from the cited rules in this app, for the meds and supplements marked active. ' +
          'How it works is left blank where that has not been written up. These are not a drug to drug check.',
        columns: ['Note', 'What it says', 'How it works', 'Source'],
        rows,
        empty: 'None of the rules in this app touch the meds marked active.',
      },
    ];
  } catch {
    return [{ kind: 'list', heading: 'Interaction notes for these meds', rows: [], empty: 'Could not be read for this report.' }];
  }
}

function trends(lens: TrendsMoreLens, heading: string, days: number): Promise<ReportSection[]> {
  return readingSections(heading, () => loadTrendsMoreView(lens, days));
}

function insights(lens: InsightsMoreLens, heading: string): Promise<ReportSection[]> {
  return readingSections(heading, () => loadInsightsMoreView(lens));
}

function varietyBrief(start: string, end: string): Promise<ReportSection[]> {
  return getMealVarietySummary(start, end)
    .then((summary) => [eatingVarietyBrief(summary)])
    .catch(() => [eatingVarietyBrief(null)]);
}

/** One section a vault category holds: said to be in the vault while it
 *  is closed, and said to be unreadable rather than missing if a read fails. */
async function guarded(category: VaultCategory | null, heading: string, read: () => Promise<ReportSection[]>): Promise<ReportSection[]> {
  if (category && isCategoryClosed(category)) return [{ kind: 'list', heading, rows: [], empty: IN_THE_VAULT }];
  try {
    return await read();
  } catch (error) {
    console.warn(`[reports] ${heading} could not be read`, error);
    return [{ kind: 'list', heading, rows: [], empty: 'Could not be read for this report.' }];
  }
}

function daysFrom(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

// Each extra section a report can carry, started only when called, so a
// report's extras list says which run and in what order, and a section
// the person left out is never read at all (K10).
function extraSectionLoaders(days: number): Record<ExtraSectionId, () => Promise<ReportSection[]>> {
  const start = rangeStartDate(days);
  const end = isoDate(new Date());
  return {
    'since-visit': () => readingSections('Since the last appointment', loadSinceLastVisitView),
    appointments: () => insights('i-appointment', 'Appointments'),
    'blood-pressure': () => trends('bloodPressure', 'Blood pressure', days),
    doses: () => trends('doses', 'Doses', days),
    interactions: () => interactionSection(),
    'symptom-photos': () => symptomPhotoSection(start, end).then((section) => [section]),
    hydration: () => trends('hydration', 'Hydration', days),
    planned: () => trends('planned', 'Planned and eaten', days),
    variety: () => varietyBrief(start, end),
    reactions: () => trends('reactions', 'After-meal reactions', days),
    nights: () => trends('nights', 'Nights', days),
    work: () => trends('work', 'Work', days),
    care: () => trends('care', 'Appointments and care', days),
    ferments: () => trends('ferments', 'Ferments', days),
    'eating-cost': () =>
      getCostSummary(start, end)
        .then((cost) => [eatingCostSection(cost)])
        .catch(() => [eatingCostSection(null)]),
    today: () => insights('i-today', 'Today'),
    bills: async () => {
      const [bills, plan] = await Promise.all([listMedicalBills(), getActiveInsurancePlan()]);
      return [medicalBillsSection(bills, start, end), insuranceSection(plan ? describePlanStanding(planStanding(plan, bills)) : null)];
    },
    costs: () =>
      getCostSummary(start, end)
        .then(costSections)
        .catch(() => costSections(null)),
    'variety-full': () =>
      getMealVarietySummary(start, end)
        .then(eatingVarietySections)
        .catch(() => [eatingVarietyBrief(null)]),
    'garden-yield': async () => {
      const system = (await getStoredMeasurementSystem()) === 'imperial' ? 'imperial' : 'metric';
      return gardenYieldSections(await getHarvestYieldSummary(start, end, system));
    },
    'on-hand': () => insights('i-garden', 'On hand now'),
    'planting-photos': () => plantingPhotoSection(start, end).then((section) => [section]),
    'lab-history': () =>
      guarded('labs', 'Lab results in this range', async () => {
        const [results, tests] = await Promise.all([listLabResults(), getLabTests()]);
        const names = new Map(tests.map((test) => [test.code, test.displayName]));
        return [
          labHistorySection(
            results.map((result) => ({
              testName: names.get(result.testCode) ?? result.testCode,
              value: result.value,
              unit: result.unit,
              low: result.labRangeLow,
              high: result.labRangeHigh,
              testedAt: result.testedAt,
              labName: result.labName,
            })),
            start,
            end,
          ),
        ];
      }),
    'bp-log': () => guarded('body', 'Every reading', async () => [bloodPressureLogSection(await listBloodPressureReadings(), start, end)]),
    bowel: () => guarded('symptoms', 'Bowel movements in brief', async () => bowelSections(await listBowelEntriesBetween(start, end), start, end)),
    bladder: () =>
      guarded('symptoms', 'Bladder diary', async () => {
        const diaries = await listBladderDiariesBetween(start, end);
        const system = (await getStoredMeasurementSystem()) ?? detectMeasurementSystemFromLocale();
        const rows: string[][] = [];
        for (const diary of diaries) {
          const [entries, drinks] = await Promise.all([listBladderEntries(diary.id), listDiaryDrinks(diary)]);
          rows.push(...reportRows(summariseDiary(diary, entries, drinks), system));
        }
        return [{
          kind: 'table',
          heading: 'Bladder diary',
          note: DIARY_NOTE,
          columns: [...REPORT_COLUMNS],
          rows,
          empty: 'No bladder diary was kept in this range.',
        }];
      }),
    microbiome: () =>
      guarded('labs', 'Microbiome tests', async () => {
        const { tests, results } = await listMicrobiomeTests();
        return [microbiomeSection(tests, results)];
      }),
    cycle: () => trends('cycle', 'Cycle', days),
    'body-signals': () => trends('bodySignals', 'Body signals', days),
    therapy: () =>
      guarded('therapy', 'Hands-on therapy sessions', async () => {
        const sessions = await listTherapySessions({ sinceDate: start });
        return [
          therapySessionsSection(
            sessions.map((session) => ({
              performedAt: session.performedAt,
              therapyLabel: therapyTypeLabel(session.therapyType),
              practitioner: session.practitioner,
              bodyFocus: session.bodyFocus,
              durationMinutes: session.durationMinutes,
              notes: session.notes,
            })),
            start,
            end,
          ),
        ];
      }),
    'therapy-response': () =>
      guarded('therapy', 'How the days after a session went', async () => {
        const inputs = await getTherapyResponseInputs(days);
        const result = summarizeTherapyResponse(inputs.sessions, inputs.checkins);
        const lines = result.summaries.map((summary) => describeTherapyResponse(summary, therapyTypeLabel(summary.therapyType)));
        return [therapyResponseSection(lines, result.totalSessions, result.totalCheckins)];
      }),
    trackers: () =>
      guarded(null, 'Trackers in brief', async () => {
        const [trackers, entries] = await Promise.all([listCustomTrackers(), listTrackerEntriesSince(start)]);
        return trackerSections(trackers, entries, start, end);
      }),
    workouts: () => trends('workouts', 'Workouts', days),
    pacing: () => trends('pacing', 'Pacing', days),
    'med-list': () =>
      guarded('medications', 'Medicines and supplements taken now', async () => {
        const meds = await listAllActiveTreatments();
        return [
          medListSection(
            meds.map((med) => ({
              name: med.name,
              genericName: med.genericName,
              dose: med.doseAmount != null ? `${med.doseAmount}${med.doseUnit ? ` ${med.doseUnit}` : ''}` : '',
              frequency: med.frequency,
              treatmentType: med.treatmentType,
              notes: med.notes,
            })),
          ),
        ];
      }),
    // Allergies are safety, so they are read whatever the vault says: the
    // drug allergies live on the emergency card, which is never vaulted,
    // and a closed vault only leaves the food list out.
    allergies: () =>
      guarded(null, 'Allergies', async () => {
        const [profile, foods] = await Promise.all([getEmergencyProfile(), readOrClosed(() => listFoodAllergies(), [] as string[])]);
        return [allergiesSection(profile.drugAllergies, foods)];
      }),
    emergency: () =>
      guarded(null, 'Emergency card', async () => {
        const [profile, fromApp, contacts] = await Promise.all([getEmergencyProfile(), gatherFromApp(), listEmergencyContacts()]);
        return [emergencyCardSection(buildEmergencyCard({ profile, fromApp, contacts, today: end }))];
      }),
    'money-now': () => guarded('finances', 'Where money stands', () => insights('i-money', 'Where money stands')),
    'money-entries': () =>
      guarded('finances', 'Money in and out', async () => {
        const [entries, hobbyEntries, interests] = await Promise.all([
          listEntries(),
          listInterestMoney().catch(() => []),
          listInterests().catch(() => []),
        ]);
        return [moneyEntriesSection(entries, start, end, hobbyMoneyRows(hobbyEntries, interests))];
      }),
    'upkeep-standing': () =>
      guarded(null, 'Everything kept up, and when it is next due', async () => {
        const [items, places] = await Promise.all([listUpkeepItems(), listUpkeepPlaces()]);
        return [upkeepStandingSection(items.map((item) => upkeepStanding(item, end)), (item) => placeLabel(item.place, places, item.placeName))];
      }),
    'upkeep-done': () =>
      getKeepingUpSummary(start, end)
        .then((summary) => [upkeepDoneSection(summary)])
        .catch(() => [upkeepDoneSection(null)]),
    'meals-ahead': () =>
      guarded(null, 'Meals scheduled ahead', async () => {
        const week = await Promise.all(daysFrom(end, 7).map((day) => listTodaysMealsWithRecipes(day)));
        return [
          mealsAheadSection(
            week.flat().map((meal) => ({ scheduledFor: meal.scheduledFor, title: meal.title, mealType: meal.mealType, dishes: meal.components.map((part) => part.name) })),
            7,
          ),
        ];
      }),
    grocery: () =>
      guarded(null, 'Grocery list', async () => {
        const list = await getActiveGroceryList();
        const items = list ? await getGroceryListItems(list.id) : [];
        return [groceryListSection(list?.name ?? null, items)];
      }),
    'kitchen-now': () => insights('i-kitchen', 'The kitchen in brief'),
    'kitchen-items': () => guarded(null, 'Everything on hand', async () => [kitchenItemsSection(await listKitchenInventory('food'))]),
    'keeping-checks': () => keepingPart(start, end, 0),
    'keeping-routines': () => keepingPart(start, end, 1),
    'keeping-captures': () => keepingPart(start, end, 2),
    interests: () => guarded(null, 'Interests', async () => [interestsSection(await listInterests())]),
    'interest-time': () =>
      getKeepingUpSummary(start, end)
        .then((summary) => [interestTimeSection(summary)])
        .catch(() => [interestTimeSection(null)]),
    'hobby-money': () =>
      guarded(null, 'Hobbies and interests', async () => {
        const [entries, interests] = await Promise.all([listInterestMoney(), listInterests()]);
        return [hobbyMoneySection(entries, interests, start, end)];
      }),
    'interest-things': () =>
      guarded(null, 'Supplies, collections and wishes', async () => {
        const [things, interests] = await Promise.all([listInterestThings(), listInterests()]);
        return [interestThingsSection(things, interests)];
      }),
    'interest-library': () =>
      guarded(null, 'Library', async () => {
        const [entries, interests] = await Promise.all([listLibrary(), listInterests()]);
        return [interestLibrarySection(entries, interests, start, end)];
      }),
    projects: () => guarded(null, 'Projects', () => projectsPart(null)),
    learn: () =>
      guarded(null, 'Learn', async () => {
        const reviews = await listLearnReviews();
        return [learnSection(reviews.map((review) => ({ cardId: review.cardId, day: review.day, recalled: isRecalled(review.grade) })), start, end)];
      }),
    'work-projects': () => guarded(null, 'Work projects', () => projectsPart('work')),
  };
}

async function keepingPart(start: string, end: string, index: number): Promise<ReportSection[]> {
  const summary = await getKeepingUpSummary(start, end).catch(() => null);
  const parts = keepingUpSections(summary);
  return summary ? [parts[index]] : parts;
}

async function projectsPart(area: 'work' | null): Promise<ReportSection[]> {
  const projects = await listProjects(area ?? 'everything');
  const steps = projects.length > 0 ? await listProjectSteps(projects.map((project) => project.id)) : [];
  return [projectsSection(projects, steps, area)];
}

async function kindSections(kind: ReportKind, days: number, leftOut: readonly string[]): Promise<ReportSection[]> {
  const loaders = extraSectionLoaders(days);
  const parts = REPORT_KIND_BY_KEY[kind].extras.filter((id) => !leftOut.includes(id)).map((id) => loaders[id]());
  return (await Promise.all(parts)).flat();
}

// The plain-text view: what the Reports tab shows on screen and what the
// share sheet carries as a message. Tables become one line per row, the
// first cell leading and the rest labelled by their column, so a row
// still reads as a sentence in a text message.
export function renderReportText(doc: ReportDocument): string {
  const lines: string[] = [];
  lines.push(doc.title.toUpperCase());
  lines.push(`Range: ${doc.rangeLabel} (last ${doc.days} days)`);
  lines.push(`Generated: ${new Date(doc.generatedAt).toLocaleString(globalThis.lifesteadDateLocale)}`);
  lines.push('');
  for (const paragraph of doc.preface) lines.push(paragraph);
  lines.push('');

  for (const section of doc.sections) {
    lines.push(section.heading.toUpperCase());
    if (section.note) lines.push(section.note);
    if (section.rows.length === 0) {
      lines.push(section.empty);
    } else if (section.kind === 'photos') {
      lines.push(reportPhotoTextLine(section.rows.length));
    } else if (section.kind === 'list') {
      for (const row of section.rows) lines.push(`- ${row}`);
    } else {
      for (const cells of section.rows) {
        const parts: string[] = [];
        cells.forEach((cell, index) => {
          if (!cell) return;
          if (index === 0) parts.push(cell);
          else if (index === 1) parts.push(cell);
          else parts.push(`${section.columns[index].toLowerCase()}: ${cell}`);
        });
        const [first, ...rest] = parts;
        lines.push(rest.length > 0 ? `- ${first}: ${rest.join(', ')}` : `- ${first}`);
      }
    }
    if (section.kind !== 'photos') {
      for (const { title, chart } of section.charts ?? []) lines.push(`${title}, drawn in the PDF: ${chartCaption(chart)}`);
    }
    lines.push('');
  }

  lines.push(doc.footer);
  lines.push(doc.versionLine);
  return lines.join('\n');
}

export async function generateReport(days: number, kind: ReportKind = 'overview'): Promise<string> {
  return renderReportText(await buildReport(days, kind));
}
