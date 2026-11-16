// The three-day bladder diary (Q23, 1.0.91.9). An optional stretch of days
// started on Signals > Bladder, during which each trip to the toilet is a
// tap, with how much if it was measured, how strong the urge was and any
// leak, and Going to bed and Up for the day mark the night. Fluid in is
// read from the drinks already logged, never asked for a second time.
//
// Pure: no database, no clock read except through arguments, so
// scripts/test_bladder_diary.js runs it on a computer. lib/bladderDiaryDb.ts
// reads and writes; Signals, Home and the For Your Doctor report show what
// this works out.
//
// How a day and a night are counted follows the International Continence
// Society's terms (Hashim H et al., Neurourol Urodyn 2019;38:499-508; van
// Kerrebroeck P et al., Neurourol Urodyn 2002;21:179-183):
//   - the 24 hours start just after the first trip on getting up and run to
//     the first trip on getting up the next morning, that one included;
//   - night trips are the ones between going to bed and getting up, not
//     counting the first trip on getting up;
//   - the night amount is the night trips plus that first morning trip.
// The night share is the night amount over the 24-hour amount. It is shown
// as a figure only: nothing here says what it should be.

export type BladderKind = 'void' | 'leak' | 'bed' | 'up';
export type LeakSize = 'drops' | 'small' | 'large';

export type BladderEntry = {
  id: string;
  diaryId: string;
  /** Local time, 'YYYY-MM-DDTHH:mm'. */
  at: string;
  kind: BladderKind;
  volumeMl: number | null;
  /** 0 to 4 on the urge scale below. */
  urgency: number | null;
  leak: LeakSize | null;
  note: string | null;
};

export type BladderDiary = {
  id: string;
  /** The first of the diary's days, 'YYYY-MM-DD'. */
  startedOn: string;
  days: number;
  /** Set when the person finishes or stops it early. */
  endedOn: string | null;
};

export type DiaryDrink = {
  /** Local time, 'YYYY-MM-DDTHH:mm'. */
  at: string;
  name: string;
  /** Null when the drink was logged with no amount, or by weight. */
  ml: number | null;
};

export const DIARY_DAYS = 3;

/** The urge scale, 0 to 4, after the Patient Perception of Intensity of
 *  Urgency Scale (Cartwright R et al., BJU Int 2011;107:1612-1617) that
 *  continence clinics hand out with a diary. */
export const URGE_WORDS = ['No urge', 'Mild', 'Moderate', 'Strong', 'Could not hold it'] as const;

export const LEAK_SIZES: { key: LeakSize; label: string }[] = [
  { key: 'drops', label: 'Drops' },
  { key: 'small', label: 'Small' },
  { key: 'large', label: 'Large' },
];

export function leakLabel(size: LeakSize | null): string {
  return LEAK_SIZES.find((s) => s.key === size)?.label ?? 'Size not said';
}

export function isLeakSize(value: unknown): value is LeakSize {
  return value === 'drops' || value === 'small' || value === 'large';
}

export function isBladderKind(value: unknown): value is BladderKind {
  return value === 'void' || value === 'leak' || value === 'bed' || value === 'up';
}

// ---------------------------------------------------------------- dates

export function addDays(day: string, offset: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offset));
  return date.toISOString().slice(0, 10);
}

function minutesOf(at: string): number {
  const [day, time = '00:00'] = at.split('T');
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
}

/** The diary's dates in order, one per day. */
export function diaryDates(diary: Pick<BladderDiary, 'startedOn' | 'days'>): string[] {
  return Array.from({ length: diary.days }, (_, i) => addDays(diary.startedOn, i));
}

/** The morning after the last day, when the last night closes. */
export function lastMorning(diary: Pick<BladderDiary, 'startedOn' | 'days'>): string {
  return addDays(diary.startedOn, diary.days);
}

export type DiaryStage =
  | { stage: 'before'; startsOn: string }
  | { stage: 'day'; day: number; of: number }
  | { stage: 'lastMorning' }
  | { stage: 'done' };

/** Where today falls in a diary: a day of it, the morning after the last
 *  day (still open, for the last night's trips and the first trip on
 *  getting up), or past it. A diary finished early is done. */
export function diaryStage(diary: BladderDiary, today: string): DiaryStage {
  if (diary.endedOn) return { stage: 'done' };
  if (today < diary.startedOn) return { stage: 'before', startsOn: diary.startedOn };
  const dates = diaryDates(diary);
  const index = dates.indexOf(today);
  if (index >= 0) return { stage: 'day', day: index + 1, of: diary.days };
  if (today === lastMorning(diary)) return { stage: 'lastMorning' };
  return { stage: 'done' };
}

export function isDiaryOpen(diary: BladderDiary, today: string): boolean {
  const s = diaryStage(diary, today).stage;
  return s === 'day' || s === 'lastMorning' || s === 'before';
}

export function stageLine(stage: DiaryStage, tr: Translate = asWritten): string {
  switch (stage.stage) {
    case 'before':
      return tr('The diary starts on the day you chose.');
    case 'day':
      return tr('Day {day} of {of}', { day: stage.day, of: stage.of });
    case 'lastMorning':
      return tr('Last morning: log your first trip and tap Up for the day, and the diary is complete.');
    case 'done':
      return tr('Complete');
  }
}

// ---------------------------------------------------------------- amounts

/** A typed amount in the person's units, to millilitres. */
export function toMl(amount: number, system: 'metric' | 'imperial'): number {
  return system === 'imperial' ? amount * 29.5735 : amount;
}

/** Millilitres in the person's units, rounded for reading. */
export function formatAmount(ml: number, system: 'metric' | 'imperial'): string {
  if (system === 'imperial') return `${Math.round((ml / 29.5735) * 10) / 10} fl oz`;
  return `${Math.round(ml)} mL`;
}

export function amountUnit(system: 'metric' | 'imperial'): string {
  return system === 'imperial' ? 'fl oz' : 'mL';
}

/** Checks a typed amount. Empty is fine (not measured); anything else must
 *  be a number a bladder can hold, so a slip of the thumb is caught. */
export function parseAmount(text: string, system: 'metric' | 'imperial'): { ok: true; ml: number | null } | { ok: false; why: string } {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return { ok: true, ml: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return { ok: false, why: 'Enter the amount as a number, or leave it empty if you did not measure.' };
  const ml = toMl(value, system);
  if (ml > 2000) {
    return {
      ok: false,
      why: system === 'imperial'
        ? 'That is more than 67 fl oz. Check the number, or leave it empty if you did not measure.'
        : 'That is more than 2000 mL. Check the number, or leave it empty if you did not measure.',
    };
  }
  return { ok: true, ml: Math.round(ml) };
}

// ---------------------------------------------------------------- one day

export type DiaryDay = {
  date: string;
  /** Trips from getting up to going to bed, the first morning trip and the
   *  last one before sleep included. Null when neither mark is there to
   *  split the day from the night. */
  dayTrips: number | null;
  /** Trips between going to bed and getting up the next morning, not
   *  counting the first trip on getting up. Null without both marks. */
  nightTrips: number | null;
  /** Every trip logged in the day's stretch. */
  trips: number;
  measured: number;
  largestMl: number | null;
  /** The 24-hour amount, only when every trip in it was measured and both
   *  mornings were marked. */
  totalMl: number | null;
  nightMl: number | null;
  /** nightMl / totalMl, 0 to 1. */
  nightShare: number | null;
  leaks: { drops: number; small: number; large: number; unsized: number };
  strongUrges: number;
  drinks: number;
  drinksMl: number;
  drinksWithoutAmount: number;
  bedAt: string | null;
  upAt: string | null;
  nextUpAt: string | null;
  /** What is missing for the night share, in words, or null. */
  missing: string | null;
};

function firstUpOn(entries: BladderEntry[], date: string): BladderEntry | null {
  const ups = entries.filter((e) => e.kind === 'up' && e.at.slice(0, 10) === date).sort((a, b) => a.at.localeCompare(b.at));
  return ups[0] ?? null;
}

/** The first trip on getting up: a trip logged up to 30 minutes before the
 *  Up for the day tap, or else the first one in the two hours after it. */
export function morningVoid(voids: BladderEntry[], up: BladderEntry | null): BladderEntry | null {
  if (!up) return null;
  const upMin = minutesOf(up.at);
  const before = voids.filter((v) => minutesOf(v.at) <= upMin && upMin - minutesOf(v.at) <= 30);
  if (before.length > 0) return before[before.length - 1];
  return voids.find((v) => minutesOf(v.at) > upMin && minutesOf(v.at) - upMin <= 120) ?? null;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function summariseDay(date: string, entries: BladderEntry[], drinks: DiaryDrink[]): DiaryDay {
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  const voids = sorted.filter((e) => e.kind === 'void');
  const up = firstUpOn(sorted, date);
  const nextUp = firstUpOn(sorted, addDays(date, 1));
  const morning = morningVoid(voids, up);
  const nextMorning = morningVoid(voids, nextUp);

  // The day's stretch: from its first morning trip (or the Up tap, or
  // midnight) to the next morning's first trip (or Up tap, or noon).
  const startAt = morning?.at ?? up?.at ?? `${date}T00:00`;
  const endAt = nextMorning?.at ?? nextUp?.at ?? `${addDays(date, 1)}T12:00`;
  const inStretch = (at: string, includeStart: boolean) => (includeStart ? at >= startAt : at > startAt) && at < endAt;

  const beds = sorted.filter((e) => e.kind === 'bed' && e.at > (up?.at ?? `${date}T12:00`) && e.at < endAt);
  const bed = beds.length > 0 ? beds[beds.length - 1] : null;

  const stretchVoids = voids.filter((v) => inStretch(v.at, true) && v.id !== nextMorning?.id);
  const dayVoids = bed ? stretchVoids.filter((v) => v.at <= bed.at) : null;
  const nightVoids = bed ? stretchVoids.filter((v) => v.at > bed.at) : null;

  const measuredVoids = stretchVoids.filter((v) => v.volumeMl != null);
  const largest = measuredVoids.length > 0 ? Math.max(...measuredVoids.map((v) => v.volumeMl as number)) : null;

  // The 24-hour amount: everything after the first morning trip, up to and
  // including the next one.
  let totalMl: number | null = null;
  let nightMl: number | null = null;
  let missing: string | null = null;
  if (!morning || !nextMorning) {
    missing = !up || !nextUp
      ? 'The night share needs Up for the day on this morning and the next.'
      : 'The night share needs the first trip on getting up, on this morning and the next.';
  } else if (!bed) {
    missing = 'The night share needs Going to bed on this night.';
  } else {
    const inTotal = voids.filter((v) => v.at > morning.at && v.at <= nextMorning.at);
    const unmeasured = inTotal.filter((v) => v.volumeMl == null).length;
    if (unmeasured > 0) {
      missing = unmeasured === 1 ? 'One trip in these 24 hours has no amount, so the totals are left out.' : `${unmeasured} trips in these 24 hours have no amount, so the totals are left out.`;
    } else {
      totalMl = sum(inTotal.map((v) => v.volumeMl as number));
      const nightIn = inTotal.filter((v) => v.at > bed.at);
      nightMl = sum(nightIn.map((v) => v.volumeMl as number));
    }
  }

  const leakEntries = sorted.filter((e) => inStretch(e.at, true) && e.at !== nextMorning?.at && (e.kind === 'leak' || (e.kind === 'void' && e.leak)));
  const leaks = { drops: 0, small: 0, large: 0, unsized: 0 };
  for (const e of leakEntries) {
    if (e.leak) leaks[e.leak] += 1;
    else leaks.unsized += 1;
  }

  const dayDrinks = drinks.filter((d) => inStretch(d.at, true));
  const measuredDrinks = dayDrinks.filter((d) => d.ml != null);

  return {
    date,
    dayTrips: dayVoids ? dayVoids.length : null,
    nightTrips: nightVoids ? nightVoids.length : null,
    trips: stretchVoids.length,
    measured: measuredVoids.length,
    largestMl: largest,
    totalMl,
    nightMl,
    nightShare: totalMl && nightMl != null ? nightMl / totalMl : null,
    leaks,
    strongUrges: stretchVoids.filter((v) => (v.urgency ?? 0) >= 3).length + sorted.filter((e) => e.kind === 'leak' && inStretch(e.at, true) && (e.urgency ?? 0) >= 3).length,
    drinks: dayDrinks.length,
    drinksMl: Math.round(sum(measuredDrinks.map((d) => d.ml as number))),
    drinksWithoutAmount: dayDrinks.length - measuredDrinks.length,
    bedAt: bed?.at ?? null,
    upAt: up?.at ?? null,
    nextUpAt: nextUp?.at ?? null,
    missing,
  };
}

export function summariseDiary(diary: BladderDiary, entries: BladderEntry[], drinks: DiaryDrink[]): DiaryDay[] {
  const mine = entries.filter((e) => e.diaryId === diary.id);
  return diaryDates(diary).map((date) => summariseDay(date, mine, drinks));
}

// ---------------------------------------------------------------- words

/** Turns a sentence with {names} into the words shown. The screens pass
 *  t from lib/i18n so the lines read in the app's language; left out, the
 *  English is filled in as it stands (the report, the tests). */
export type Translate = (text: string, values?: Readonly<Record<string, string | number>>) => string;

const asWritten: Translate = (text, values) =>
  values ? text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole)) : text;

function count(tr: Translate, n: number, one: string, many: string): string {
  return n === 1 ? tr(one) : tr(many, { count: n });
}

export function leakWords(leaks: DiaryDay['leaks'], tr: Translate = asWritten): string {
  const parts: string[] = [];
  if (leaks.drops) parts.push(tr('{count} drops', { count: leaks.drops }));
  if (leaks.small) parts.push(tr('{count} small', { count: leaks.small }));
  if (leaks.large) parts.push(tr('{count} large', { count: leaks.large }));
  if (leaks.unsized) parts.push(tr('{unsized} size not said', { unsized: leaks.unsized }));
  const total = leaks.drops + leaks.small + leaks.large + leaks.unsized;
  if (total === 0) return tr('No leaks');
  return tr('{leaks} ({sizes})', { leaks: count(tr, total, '1 leak', '{count} leaks'), sizes: parts.join(', ') });
}

/** One entry as a line for the list under the diary. */
export function entryLine(entry: BladderEntry, system: 'metric' | 'imperial', tr: Translate = asWritten): string {
  if (entry.kind === 'bed') return tr('Going to bed');
  if (entry.kind === 'up') return tr('Up for the day');
  const parts: string[] = [tr(entry.kind === 'void' ? 'Trip' : 'Leak')];
  if (entry.volumeMl != null) parts.push(formatAmount(entry.volumeMl, system));
  if (entry.urgency != null && URGE_WORDS[entry.urgency]) parts.push(tr('urge: {words}', { words: tr(URGE_WORDS[entry.urgency]) }));
  if (entry.kind === 'void' && entry.leak) parts.push(tr('leaked: {size}', { size: tr(leakLabel(entry.leak)) }));
  if (entry.kind === 'leak' && entry.leak) parts.push(tr(leakLabel(entry.leak)));
  return parts.join(', ');
}

const UNMEASURED = /^(\d+) trips in these 24 hours have no amount/;

/** The lines for one day, shared by Signals and the report. */
export function dayLines(day: DiaryDay, system: 'metric' | 'imperial', tr: Translate = asWritten): string[] {
  const lines: string[] = [];
  const trips = (n: number) => count(tr, n, '1 trip', '{count} trips');
  lines.push(
    day.dayTrips != null && day.nightTrips != null
      ? tr('{day} by day, {night} at night', { day: trips(day.dayTrips), night: trips(day.nightTrips) })
      : trips(day.trips),
  );
  if (day.measured > 0) {
    const largest = formatAmount(day.largestMl as number, system);
    lines.push(
      day.measured === day.trips
        ? tr('Every trip measured; largest {amount}', { amount: largest })
        : tr('{measured} of {trips} trips measured; largest {amount}', { measured: day.measured, trips: day.trips, amount: largest }),
    );
  }
  if (day.totalMl != null) lines.push(tr('24 hours: {amount}', { amount: formatAmount(day.totalMl, system) }));
  if (day.nightShare != null && day.nightMl != null) {
    lines.push(tr('Night: {amount}, {value}% of the 24 hours', { amount: formatAmount(day.nightMl, system), value: Math.round(day.nightShare * 100) }));
  }
  lines.push(leakWords(day.leaks, tr));
  if (day.strongUrges > 0) {
    lines.push(tr('{value} with a strong urge or one that could not be held', { value: count(tr, day.strongUrges, '1 time', '{count} times') }));
  }
  if (day.drinks === 0) lines.push(tr('No drinks logged'));
  else {
    const drinks = count(tr, day.drinks, '1 drink', '{count} drinks');
    const without = day.drinksWithoutAmount > 0 ? tr(', {count} with no amount', { count: day.drinksWithoutAmount }) : '';
    lines.push(
      day.drinksMl > 0
        ? tr('Drinks: {amount} in {drinks}{without}', { amount: formatAmount(day.drinksMl, system), drinks, without })
        : tr('Drinks: {drinks}{without}', { drinks, without }),
    );
  }
  if (day.missing) {
    const unmeasured = UNMEASURED.exec(day.missing);
    lines.push(
      unmeasured
        ? tr('{unmeasured} trips in these 24 hours have no amount, so the totals are left out.', { unmeasured: Number(unmeasured[1]) })
        : tr(day.missing),
    );
  }
  return lines;
}

/** The note under the diary and in the report: what the figures are and
 *  that they are counted, not judged. */
export const DIARY_NOTE =
  'Counted the way continence clinics count a diary: the 24 hours run from just after the first trip on getting up to the first trip on getting up the next morning, and the night is the trips after going to bed plus that first morning trip. The figures are as you logged them; your clinician reads what they mean.';

/** Rows for the report's table, one per day. */
export function reportRows(days: DiaryDay[], system: 'metric' | 'imperial'): string[][] {
  return days.map((day) => [
    day.date,
    day.dayTrips != null ? String(day.dayTrips) : '',
    day.nightTrips != null ? String(day.nightTrips) : '',
    day.totalMl != null ? formatAmount(day.totalMl, system) : '',
    day.largestMl != null ? formatAmount(day.largestMl, system) : '',
    day.nightShare != null ? `${Math.round(day.nightShare * 100)}%` : '',
    leakWords(day.leaks),
    day.drinks === 0 ? 'None logged' : `${day.drinksMl > 0 ? formatAmount(day.drinksMl, system) : ''}${day.drinksWithoutAmount > 0 ? `${day.drinksMl > 0 ? ' + ' : ''}${count(asWritten, day.drinksWithoutAmount, '1 drink', '{count} drinks')} with no amount` : ''}`,
  ]);
}

export const REPORT_COLUMNS = ['Day', 'Trips by day', 'Trips at night', '24 hours', 'Largest', 'Night share', 'Leaks', 'Drinks'];

/** The meal items of a logged drink, to millilitres: volume units convert,
 *  a weight or a count is never guessed into a volume (rule 4 of the
 *  six-phase push). Null when any item cannot be read as a volume. */
export function drinkMl(
  items: { servingSize: number | null; servingUnit: string | null; yourSharePercent: number | null; dishServings: number | null }[],
  volumeToMl: (amount: number, unit: string) => number | null,
): number | null {
  if (items.length === 0) return null;
  let total = 0;
  for (const item of items) {
    if (item.servingSize == null || !item.servingUnit) return null;
    const share = item.yourSharePercent != null ? item.yourSharePercent / 100 : 1 / (item.dishServings ?? 1);
    const ml = volumeToMl(item.servingSize * share, item.servingUnit);
    if (ml == null) return null;
    total += ml;
  }
  return total;
}
