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
  const what = unit?.trim();
  return what ? `${amount(n)} ${what}` : amount(n);
}

/** How much one day uses: the week ahead on the schedule first, then the
 *  last two weeks of marks, otherwise nothing to go on. */
export function dailyUse(input: Pick<SupplyInput, 'perDose' | 'dueNext7Days' | 'takenPast14Days'>): number | null {
  const perDose = input.perDose > 0 ? input.perDose : 1;
  if (input.dueNext7Days > 0) return (input.dueNext7Days * perDose) / 7;
  if (input.takenPast14Days > 0) return (input.takenPast14Days * perDose) / 14;
  return null;
}

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
      sentence: `By the doses marked taken since you counted on ${since}, none are left. Count what is there and save the number again.`,
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
      sentence: `${counted(remaining, input.unit)} left, counting the doses marked taken since ${since}. Set its times on Schedules > Meds to see how many days that lasts.`,
    };
  }
  const daysLeft = Math.floor(remaining / perDay);
  const runsOutOn = addDays(input.today, daysLeft);
  const lead = Math.max(0, Math.round(input.leadDays));
  const remindOn = addDays(runsOutOn, -lead);
  const days = daysLeft === 1 ? 'About 1 day left' : `About ${daysLeft} days left`;
  return {
    remaining,
    daysLeft,
    runsOutOn,
    remindOn,
    short: `${days} (${counted(remaining, input.unit)})`,
    sentence:
      `${days}: ${counted(remaining, input.unit)}, counting the doses marked taken since you counted on ${since}. ` +
      `At the pace on the schedule it runs out around ${shortDate(runsOutOn)}` +
      (lead > 0 ? `, and a reminder comes ${lead === 1 ? '1 day' : `${lead} days`} before that.` : '.') +
      ' A dose taken but not marked is still counted as there.',
  };
}

function leadSentence(lead: number): string {
  return lead > 0 ? `, and a reminder comes ${lead === 1 ? '1 day' : `${lead} days`} before that.` : '.';
}

function unconvertedSentence(ahead: ScheduleAhead, input: SupplyInput): string {
  if (!ahead.unconverted) return '';
  const stepUnit = ahead.unconverted.stepUnit;
  return ` The taper's steps are in ${stepUnit}, so each dose is counted as ${counted(input.perDose > 0 ? input.perDose : 1, input.unit)}. Enter the dose on the med in ${stepUnit} on My Meds and each step is counted at the amount it sets.`;
}

function readAhead(input: SupplyInput, ahead: ScheduleAhead, remaining: number, since: string): SupplyReading {
  const pace =
    ahead.tapered && !ahead.unconverted
      ? 'Following each dose on the schedule at the amount for its taper step'
      : 'Following each dose on the schedule';
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
      sentence:
        `${counted(remaining, input.unit)} left, counting the doses marked taken since you counted on ${since}. ${covers}` +
        unconvertedSentence(ahead, input) +
        ' A dose taken but not marked is still counted as there.',
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
      ? `${pace}, what is left does not cover the next one.`
      : `${pace}, it runs out around ${shortDate(runsOutOn)}${leadSentence(lead)}`;
  return {
    remaining,
    daysLeft,
    runsOutOn,
    remindOn,
    short: `${days} (${counted(remaining, input.unit)})`,
    sentence:
      `${days}: ${counted(remaining, input.unit)}, counting the doses marked taken since you counted on ${since}. ${when}` +
      unconvertedSentence(ahead, input) +
      ' A dose taken but not marked is still counted as there.',
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
