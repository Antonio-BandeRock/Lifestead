// How much of a med is left, and when to ask for more (A3, Phase 2).
//
// Nothing is decremented. The person counts what is on hand once, and what
// is left is that count minus the doses marked taken since, so a dose marked
// from a notification, from Today, from Reconcile or from Meds all count,
// and un-marking one puts it back. A dose taken and never marked is still
// counted as in the bottle, and the sentences say so rather than guess.
//
// When the schedule is known (Q12), how long it lasts is found by walking
// the doses ahead one at a time, each at the amount for its day, rather than
// by an average of the week ahead: a weekly or monthly dose, a dose every
// few days and the steps of a taper all run down at the pace they are
// written. The schedule's rows are used as they stand (a skipped one is not
// counted), and past the rows laid out so far each series' repeat rule
// carries on. Without a schedule, the last two weeks of marks set the pace.
//
// Pure, no imports, so scripts/test_med_supply.js checks every sentence
// without a phone. The reading and writing is lib/medDetailsDb.ts.

export type SupplyInput = {
  /** What was counted, or null when nothing has been counted. */
  onHand: number | null;
  /** What is counted, as the person wrote it: tablets, capsules, ml. */
  unit: string | null;
  /** How many of those one dose uses. */
  perDose: number;
  /** When the count was saved, local "YYYY-MM-DDTHH:mm". */
  countedAt: string | null;
  /** Doses marked taken since the count. */
  takenSinceCount: number;
  /** Doses on the schedule over the next seven days. */
  dueNext7Days: number;
  /** Doses marked taken over the last fourteen days. */
  takenPast14Days: number;
  /** Today, "YYYY-MM-DD". */
  today: string;
  /** How many days before running out to be reminded. */
  leadDays: number;
  /** The doses ahead, when the schedule is known (Q12). */
  schedule?: ScheduleAhead | null;
};

/** One dose ahead on the schedule: its day and how much of the count it uses. */
export type DoseAhead = { date: string; units: number };

export type ScheduleAhead = {
  /** Every dose from now on, in order, as far as `through`. */
  doses: DoseAhead[];
  /** The last day looked at. */
  through: string;
  /** True when no series goes on past `through`, so the last dose is the last. */
  ends: boolean;
  /** True when a taper step set the amount of at least one dose ahead. */
  tapered: boolean;
  /** Set when taper steps could not be turned into the counted unit. */
  unconverted: { stepUnit: string } | null;
};

/** A taper step, as much of it as the count needs. */
export type SupplyStep = { startDate: string; endDate: string; amount: number; unit: string | null };

const same = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * How much of the count one dose on `date` uses. Outside a taper it is the
 * per-dose figure. Inside one, a count kept in the step's unit (mg counted
 * as mg) uses the step's amount, and a count of tablets scales the per-dose
 * figure by the step against the dose on the med, so 4 tablets for 20 mg
 * become 2 tablets on a 10 mg step. With neither, the per-dose figure stands
 * and `converted` is false, so the sentence can say so.
 */
export function unitsForDose(
  date: string,
  input: { perDose: number; unit: string | null; medAmount: number | null; medUnit: string | null; steps: readonly SupplyStep[] },
): { units: number; tapered: boolean; converted: boolean; stepUnit: string | null } {
  const perDose = input.perDose > 0 ? input.perDose : 1;
  const step = input.steps.find((x) => x.startDate <= date && date <= x.endDate);
  if (!step) return { units: perDose, tapered: false, converted: true, stepUnit: null };
  if (same(step.unit, input.unit)) return { units: step.amount, tapered: true, converted: true, stepUnit: step.unit };
  const medUnit = input.medUnit ?? null;
  const stepUnit = step.unit ?? medUnit;
  if (input.medAmount && input.medAmount > 0 && (same(stepUnit, medUnit) || (!step.unit && !medUnit))) {
    return { units: (perDose * step.amount) / input.medAmount, tapered: true, converted: true, stepUnit };
  }
  return { units: perDose, tapered: true, converted: false, stepUnit: step.unit };
}

/**
 * The first day a dose cannot be met in full from what is left, or null when
 * every dose ahead is covered. Doses are taken in order, so a 20 mg dose with
 * 15 mg left is the day it runs out.
 */
export function runOutDay(remaining: number, doses: readonly DoseAhead[]): string | null {
  let left = remaining;
  for (const dose of doses) {
    if (left + 1e-9 < dose.units) return dose.date;
    left -= dose.units;
  }
  return null;
}

function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((d) => {
    const [y, m, day] = d.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, day);
  });
  return Math.round((b - a) / 86400000);
}

export type SupplyReading = {
  remaining: number | null;
  daysLeft: number | null;
  runsOutOn: string | null;
  /** The day the refill reminder is due, or null when there is no rate. */
  remindOn: string | null;
  /** One line for a list row. */
  short: string | null;
  /** The full account, for the detail view. */
  sentence: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(day: string): string {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return day;
  return `${MONTHS[m - 1]} ${d}`;
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function amount(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

function counted(n: number, unit: string | null): string {
  const typed = unit?.trim();
  if (!typed) return amount(n);
  return `${amount(n)} ${n === 1 ? singular(typed) : typed}`;
}

/** "tablets" as "tablet" for a count of one, the unit being typed as a plural. */
function singular(unit: string): string {
  if (/[^aeiou]ies$/i.test(unit)) return unit.slice(0, -3) + 'y';
  if (/[^s]s$/i.test(unit) && unit.length > 3) return unit.slice(0, -1);
  return unit;
}

/** How much one day uses: the week ahead on the schedule first, then the
 *  last two weeks of marks, otherwise nothing to go on. */
export function dailyUse(input: Pick<SupplyInput, 'perDose' | 'dueNext7Days' | 'takenPast14Days'>): number | null {
  const perDose = input.perDose > 0 ? input.perDose : 1;
  if (input.dueNext7Days > 0) return (input.dueNext7Days * perDose) / 7;
  if (input.takenPast14Days > 0) return (input.takenPast14Days * perDose) / 14;
  return null;
}

// THE WORDS (rewritten 2026-11-27, after a count read "About 2 days left" for
// 150 tablets because 150 had been typed as one dose and nothing on the page
// showed it). Each sentence answers one question the person has, in order:
// how long it lasts, how many are left and where that figure comes from, how
// many doses that is at the amount one dose takes (so a mistyped dose shows
// itself), when it runs out, and when the reminder to get more comes, said
// as a day or as now, never as "N days before" a day already passed.

/** "At 1 tablet a dose, that is enough for 24 doses." */
function dosesSentence(remaining: number, perDose: number, unit: string | null): string {
  const each = counted(perDose, unit);
  const n = Math.floor(remaining / perDose + 1e-9);
  if (n <= 0) return `At ${each} a dose, that does not cover the next one.`;
  return n === 1 ? `At ${each} a dose, that is enough for 1 dose.` : `At ${each} a dose, that is enough for ${n} doses.`;
}

/** "150 tablets left of the 150 you counted on Nov 27." */
function leftOfSentence(remaining: number, input: SupplyInput, since: string): string {
  if (input.onHand === null || remaining === input.onHand) return `${counted(remaining, input.unit)} on hand, counted on ${since}.`;
  return `${counted(remaining, input.unit)} left of the ${amount(input.onHand)} you counted on ${since}.`;
}

/** The reminder to get more: a day ahead, or now when that day has come. */
function reminderSentence(remindOn: string, lead: number, today: string): string {
  if (remindOn > today) return ` A reminder to get more comes on ${shortDate(remindOn)}.`;
  if (lead <= 0) return ' It is time to get more.';
  return lead === 1
    ? ' That is within the 1 day you asked to be told, so it is time to get more.'
    : ` That is within the ${lead} days you asked to be told, so it is time to get more.`;
}

const UNMARKED = ' A dose you take without marking it taken is not taken off the count.';

export function readSupply(input: SupplyInput): SupplyReading {
  if (input.onHand === null || input.countedAt === null) {
    return {
      remaining: null,
      daysLeft: null,
      runsOutOn: null,
      remindOn: null,
      short: null,
      sentence: 'How many are on hand has not been counted. Count it once and the app keeps track from the doses you mark taken.',
    };
  }
  const perDose = input.perDose > 0 ? input.perDose : 1;
  const remaining = input.onHand - perDose * input.takenSinceCount;
  const since = shortDate(input.countedAt);
  if (remaining <= 0) {
    return {
      remaining: 0,
      daysLeft: 0,
      runsOutOn: input.today,
      remindOn: input.today,
      short: 'None left by the doses marked since the count',
      sentence:
        `None left: the ${amount(input.onHand)} you counted on ${since}, less the doses marked taken since, comes to nothing. ` +
        'If some are still there, count them and save the new number.',
    };
  }
  const ahead = input.schedule;
  if (ahead && ahead.doses.length > 0) return readAhead(input, ahead, remaining, since);
  const perDay = dailyUse(input);
  if (perDay === null) {
    return {
      remaining,
      daysLeft: null,
      runsOutOn: null,
      remindOn: null,
      short: `${counted(remaining, input.unit)} left`,
      sentence:
        `${leftOfSentence(remaining, input, since)} ${dosesSentence(remaining, perDose, input.unit)} ` +
        'Set its times on Schedules > Meds to see how many days that lasts.',
    };
  }
  const daysLeft = Math.floor(remaining / perDay);
  const runsOutOn = addDays(input.today, daysLeft);
  const lead = Math.max(0, Math.round(input.leadDays));
  const remindOn = addDays(runsOutOn, -lead);
  const days = daysLeft === 1 ? 'About 1 day left' : `About ${daysLeft} days left`;
  const pace = input.dueNext7Days > 0 ? 'Going by the doses due this week' : 'Going by the doses marked over the last two weeks';
  return {
    remaining,
    daysLeft,
    runsOutOn,
    remindOn,
    short: `${days} (${counted(remaining, input.unit)})`,
    sentence:
      `${days}. ${leftOfSentence(remaining, input, since)} ${dosesSentence(remaining, perDose, input.unit)} ` +
      `${pace}, they run out around ${shortDate(runsOutOn)}.` +
      reminderSentence(remindOn, lead, input.today) +
      UNMARKED,
  };
}

function unconvertedSentence(ahead: ScheduleAhead, input: SupplyInput): string {
  if (!ahead.unconverted) return '';
  const stepUnit = ahead.unconverted.stepUnit;
  return ` The taper's steps are in ${stepUnit}, so each dose is counted as ${counted(input.perDose > 0 ? input.perDose : 1, input.unit)}. Enter the dose on the med in ${stepUnit} on My Meds and each step is counted at the amount it sets.`;
}

function readAhead(input: SupplyInput, ahead: ScheduleAhead, remaining: number, since: string): SupplyReading {
  const perDose = input.perDose > 0 ? input.perDose : 1;
  // A taper changes the amount from one dose to the next, so a count of doses
  // at one amount would be wrong there; the taper sentence covers it instead.
  const doses = ahead.tapered ? '' : ` ${dosesSentence(remaining, perDose, input.unit)}`;
  const pace =
    ahead.tapered && !ahead.unconverted
      ? 'Going by each dose on the schedule, at the amount for its taper step'
      : 'Going by each dose on the schedule';
  const leftOf = leftOfSentence(remaining, input, since);
  const runsOutOn = runOutDay(remaining, ahead.doses);
  if (runsOutOn === null) {
    const last = ahead.doses[ahead.doses.length - 1].date;
    const covers = ahead.ends
      ? `That covers every dose on the schedule, through the last one on ${shortDate(last)}.`
      : `That covers every dose on the schedule through ${shortDate(ahead.through)}.`;
    return {
      remaining,
      daysLeft: null,
      runsOutOn: null,
      remindOn: null,
      short: `${counted(remaining, input.unit)} left, enough for the schedule`,
      sentence: `${leftOf}${doses} ${covers}` + unconvertedSentence(ahead, input) + UNMARKED,
    };
  }
  const daysLeft = Math.max(0, daysBetween(input.today, runsOutOn));
  const lead = Math.max(0, Math.round(input.leadDays));
  const early = addDays(runsOutOn, -lead);
  const remindOn = early < input.today ? input.today : early;
  const days =
    daysLeft === 0 ? 'Not enough for the next dose' : daysLeft === 1 ? 'About 1 day left' : `About ${daysLeft} days left`;
  const when =
    daysLeft === 0
      ? ahead.tapered
        ? ` ${pace}, what is left does not cover the next one. It is time to get more.`
        : ' It is time to get more.'
      : ` ${pace}, they run out around ${shortDate(runsOutOn)}.` + reminderSentence(remindOn, lead, input.today);
  return {
    remaining,
    daysLeft,
    runsOutOn,
    remindOn,
    short: `${days} (${counted(remaining, input.unit)})`,
    sentence: `${days}. ${leftOf}${doses}${when}` + unconvertedSentence(ahead, input) + UNMARKED,
  };
}

/** The refill reminder's line, for the notification and the Home list. */
export function describeRefillDue(name: string, reading: SupplyReading): string {
  if (reading.daysLeft === null) return `${name}: time to ask for more.`;
  if (reading.daysLeft <= 0) {
    return reading.remaining !== null && reading.remaining > 0
      ? `${name}: not enough left for the next dose. Time to ask for more.`
      : `${name}: none left by the doses marked. Time to ask for more.`;
  }
  return `${name}: about ${reading.daysLeft === 1 ? '1 day' : `${reading.daysLeft} days`} left. Time to ask for more.`;
}

/** A phone number reduced to what a dialler takes. Null when nothing is left. */
export function dialable(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d+]/g, '');
  const cleaned = digits.startsWith('+') ? `+${digits.slice(1).replace(/\+/g, '')}` : digits.replace(/\+/g, '');
  return cleaned.replace(/\D/g, '').length >= 3 ? cleaned : null;
}
