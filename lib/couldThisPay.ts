// Could This Pay? (2026-10-30, Interests stage 5c), on Interests > Money.
//
// For one interest or several together: first what the records already
// say (what went out, what came in, and the hours kept on Sessions), then
// the person's own numbers for a month of selling (a price, how many, what
// each takes in materials and time, the fees and monthly costs, a share set
// aside for tax), worked out into what comes in, what is left, what that is
// an hour, how many sales cover the monthly costs, and what it takes to have
// put by before starting. Every number used is listed beside the result in
// words, including the ones left empty and counted as nothing.
//
// The rule, on the model of the clinical-claims rule: this never tells
// anyone to start a business, quit a job or give up on an idea, gives no tax
// or legal advice, and neither cheers nor discourages. It is sums on numbers
// the person gave, and it says what those sums cannot tell them. The share
// set aside for tax is the person's choice, never a tax figure. Nothing here
// calls a result a profit or a loss. scripts/test_could_this_pay.js checks
// the arithmetic and sweeps every sentence for the words that would break it.
//
// Pure: lib/couldThisPayDb.ts keeps what was typed.

import { formatMoney, formatMoneyDay, type MoneyEntry } from './interestMoney';
import type { InterestThing } from './interestThings';
import type { InterestSession } from './interestSessions';
import { formatMinutes } from './interestSessions';

// --- what the records say -----------------------------------------------------------

export type PayRecords = {
  /** Entered on Money as gone out. */
  out: number;
  /** Prices kept on supplies and collected things (wishes never). */
  thingsOut: number;
  thingCount: number;
  in: number;
  /** Minutes on finished, timed sessions. */
  minutes: number;
  /** Sessions kept with no length. */
  untimed: number;
  /** The first day anything here was kept, when one is known. */
  firstDay: string | null;
};

export function gatherPayRecords(
  interestIds: readonly string[],
  entries: readonly MoneyEntry[],
  things: readonly InterestThing[],
  sessions: readonly InterestSession[],
): PayRecords {
  const ids = new Set(interestIds);
  const days: string[] = [];
  let out = 0;
  let income = 0;
  for (const entry of entries) {
    if (!ids.has(entry.interestId)) continue;
    if (entry.direction === 'in') income += entry.amount;
    else out += entry.amount;
    days.push(entry.onDay);
  }
  let thingsOut = 0;
  let thingCount = 0;
  for (const thing of things) {
    if (!ids.has(thing.interestId) || thing.kind === 'wish' || thing.cost === null || thing.cost <= 0) continue;
    thingsOut += thing.cost;
    thingCount += 1;
    if (thing.gotOn && /^\d{4}-\d{2}-\d{2}$/.test(thing.gotOn)) days.push(thing.gotOn);
  }
  let minutes = 0;
  let untimed = 0;
  for (const session of sessions) {
    if (!ids.has(session.interestId) || session.running) continue;
    if (session.minutes && session.minutes > 0) minutes += session.minutes;
    else untimed += 1;
    days.push(session.doneOn);
  }
  days.sort();
  return {
    out: cents(out),
    thingsOut: cents(thingsOut),
    thingCount,
    in: cents(income),
    minutes,
    untimed,
    firstDay: days[0] ?? null,
  };
}

/** What the records say, in words. Empty when nothing is kept yet. */
export function describePayRecords(records: PayRecords): string[] {
  const lines: string[] = [];
  const out = cents(records.out + records.thingsOut);
  const nothing = out === 0 && records.in === 0 && records.minutes === 0 && records.untimed === 0;
  if (nothing) return lines;
  if (records.firstDay) lines.push(`Since ${formatMoneyDay(records.firstDay)}, your records hold this.`);
  if (out > 0 || records.in > 0) {
    lines.push(`${formatMoney(out)} went out and ${formatMoney(records.in)} came in.`);
  }
  if (records.thingCount > 0) {
    const things = records.thingCount === 1 ? '1 supply or collected thing' : `${records.thingCount} supplies and collected things`;
    lines.push(`${formatMoney(records.thingsOut)} of what went out is the price kept on ${things}, some of which may last for years.`);
  }
  if (records.minutes > 0) {
    lines.push(`${formatMinutes(records.minutes)} is kept on Sessions.`);
  }
  if (records.untimed > 0) {
    lines.push(records.untimed === 1 ? '1 session has no length, so it is not in the hours.' : `${records.untimed} sessions have no length, so they are not in the hours.`);
  }
  if (records.minutes > 0 && records.in > 0) {
    const perHour = cents((records.in - out) / (records.minutes / 60));
    lines.push(
      perHour >= 0
        ? `What came in, less what went out, is ${formatMoney(perHour)} for each hour kept.`
        : `What went out is more than what came in, by ${formatMoney(-perHour)} for each hour kept.`,
    );
  }
  lines.push('Anything not kept in the app is not in these sums.');
  return lines;
}

// --- the person's numbers -------------------------------------------------------------

export const PAY_FIELDS = [
  'price',
  'perMonth',
  'materialsEach',
  'minutesEach',
  'feePercent',
  'overheadMonth',
  'runningMinutesMonth',
  'taxPercent',
  'wantMonth',
  'startingCosts',
  'livingMonth',
  'slowMonths',
] as const;
export type PayField = (typeof PAY_FIELDS)[number];
/** What was typed, kept as typed so the worksheet opens the way it was left. */
export type PayWords = Partial<Record<PayField, string>>;

export const PAY_FIELD_LABELS: Record<PayField, string> = {
  price: 'Price of one',
  perMonth: 'How many sold in a month',
  materialsEach: 'Materials for one',
  minutesEach: 'Time to make one',
  feePercent: 'Fees taken from each sale, as a share',
  overheadMonth: 'Costs each month whatever sells',
  runningMinutesMonth: 'Time each month on selling, photos, shipping, messages and books',
  taxPercent: 'Share set aside for tax',
  wantMonth: 'A month you would like left, to compare',
  startingCosts: 'Starting costs',
  livingMonth: 'Your living costs for a month',
  slowMonths: 'Months before it brings much in',
};

export const PAY_FIELD_PLACEHOLDERS: Record<PayField, string> = {
  price: '25',
  perMonth: '20',
  materialsEach: '8',
  minutesEach: '1 hour, 45 minutes',
  feePercent: '10%',
  overheadMonth: '50',
  runningMinutesMonth: '10 hours',
  taxPercent: '25%',
  wantMonth: 'Optional',
  startingCosts: 'Optional',
  livingMonth: 'Optional',
  slowMonths: 'Optional',
};

const MINUTE_FIELDS: PayField[] = ['minutesEach', 'runningMinutesMonth'];
const PERCENT_FIELDS: PayField[] = ['feePercent', 'taxPercent'];
const COUNT_FIELDS: PayField[] = ['perMonth', 'slowMonths'];

export function payFieldKind(field: PayField): 'money' | 'minutes' | 'percent' | 'count' {
  if (MINUTE_FIELDS.includes(field)) return 'minutes';
  if (PERCENT_FIELDS.includes(field)) return 'percent';
  if (COUNT_FIELDS.includes(field)) return 'count';
  return 'money';
}

/** A number as typed: "25", "$25.50", "25,50", "1,200". Empty is null. */
export function readPayNumber(words: string | undefined): { ok: boolean; value: number | null } {
  const text = (words ?? '').trim().toLowerCase();
  if (!text) return { ok: true, value: null };
  let digits = text.replace(/[$€£\s]/g, '').replace(/(mxn|usd|eur|gbp|pesos?|dollars?)$/, '');
  if (/^\d+,\d{1,2}$/.test(digits)) digits = digits.replace(',', '.');
  else digits = digits.replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(digits)) return { ok: false, value: null };
  const value = Number(digits);
  if (!Number.isFinite(value) || value > 100000000) return { ok: false, value: null };
  return { ok: true, value };
}

/** A share: "15", "15%", "12.5 %". Not over 100. */
export function readPayPercent(words: string | undefined): { ok: boolean; value: number | null } {
  const text = (words ?? '').trim().replace(/%$/, '').trim();
  const read = readPayNumber(text);
  if (!read.ok || read.value === null) return read;
  return read.value > 100 ? { ok: false, value: null } : read;
}

/** A length of time: "45", "45 minutes", "1 hour", "1.5 hours", "1 hour 30 minutes", "1:30". Plain numbers are minutes. */
export function readPayMinutes(words: string | undefined): { ok: boolean; value: number | null } {
  const text = (words ?? '').trim().toLowerCase();
  if (!text) return { ok: true, value: null };
  const clock = text.match(/^(\d+):(\d{2})$/);
  if (clock) return { ok: true, value: Number(clock[1]) * 60 + Number(clock[2]) };
  if (/^\d+(\.\d+)?$/.test(text)) return { ok: true, value: Number(text) };
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|hora|horas)\b/);
  const mins = text.match(/(\d+)\s*(m|min|mins|minute|minutes|minuto|minutos)\b/);
  if (!hours && !mins) return { ok: false, value: null };
  const value = Math.round((hours ? Number(hours[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0));
  return { ok: true, value };
}

export function readPayField(field: PayField, words: string | undefined): { ok: boolean; value: number | null } {
  const kind = payFieldKind(field);
  if (kind === 'percent') return readPayPercent(words);
  if (kind === 'minutes') return readPayMinutes(words);
  const read = readPayNumber(words);
  if (kind === 'count' && read.value !== null && !Number.isInteger(read.value)) return { ok: true, value: Math.round(read.value) };
  return read;
}

/** The first field that could not be read, said so it can be fixed. */
export function unreadablePayField(words: PayWords): string | null {
  for (const field of PAY_FIELDS) {
    if (!readPayField(field, words[field]).ok) {
      const kind = payFieldKind(field);
      const example = kind === 'percent' ? '"15" or "15%"' : kind === 'minutes' ? '"45 minutes" or "1.5 hours"' : kind === 'count' ? '"20"' : '"25" or "$25.50"';
      return `${PAY_FIELD_LABELS[field]} could not be read. Try ${example}, or leave it empty.`;
    }
  }
  return null;
}

/** What has to be there before anything can be worked out. */
export function missingForPay(words: PayWords): string | null {
  const price = readPayField('price', words.price).value;
  const perMonth = readPayField('perMonth', words.perMonth).value;
  if (price === null || price <= 0) return 'Put in a price for one first, more than nothing.';
  if (perMonth === null || perMonth <= 0) return 'Put in how many might sell in a month first.';
  return null;
}

// --- working it out -------------------------------------------------------------------

export type PayResult = {
  /** The month in words, top to bottom. */
  lines: string[];
  /** Every number used, in words, including the ones counted as nothing. */
  assumptions: string[];
  /** What the sums cannot say, always last. */
  limits: string[];
  comesIn: number;
  leftBeforeTax: number;
  leftOver: number;
  hours: number;
  perHour: number | null;
  /** Sales a month to cover the monthly costs; null when each sale cannot. */
  coverSales: number | null;
  wantSales: number | null;
  putBy: number | null;
};

function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

function hoursWords(minutes: number): string {
  return minutes === 0 ? 'no time' : formatMinutes(Math.round(minutes));
}

export function workOutPay(words: PayWords): PayResult | null {
  if (missingForPay(words) || unreadablePayField(words)) return null;
  const n = (field: PayField) => readPayField(field, words[field]).value;
  const price = n('price') as number;
  const perMonth = n('perMonth') as number;
  const materialsEach = n('materialsEach') ?? 0;
  const minutesEach = n('minutesEach') ?? 0;
  const feePercent = n('feePercent') ?? 0;
  const overhead = n('overheadMonth') ?? 0;
  const runningMinutes = n('runningMinutesMonth') ?? 0;
  const taxPercent = n('taxPercent') ?? 0;
  const want = n('wantMonth');
  const starting = n('startingCosts');
  const living = n('livingMonth');
  const slow = n('slowMonths');

  const comesIn = cents(price * perMonth);
  const materials = cents(materialsEach * perMonth);
  const fees = cents((comesIn * feePercent) / 100);
  const leftBeforeTax = cents(comesIn - materials - fees - overhead);
  const setAside = leftBeforeTax > 0 ? cents((leftBeforeTax * taxPercent) / 100) : 0;
  const leftOver = cents(leftBeforeTax - setAside);
  const minutes = minutesEach * perMonth + runningMinutes;
  const hours = Math.round((minutes / 60) * 10) / 10;
  const perHour = minutes > 0 && leftOver > 0 ? cents(leftOver / (minutes / 60)) : null;
  const eachSaleLeaves = price - materialsEach - (price * feePercent) / 100;
  const coverSales = eachSaleLeaves > 0 ? Math.ceil(cents(overhead / eachSaleLeaves)) : null;
  const keepShare = 1 - taxPercent / 100;
  const wantSales =
    want !== null && want > 0 && eachSaleLeaves > 0 && keepShare > 0 ? Math.ceil(cents((want / keepShare + overhead) / eachSaleLeaves)) : null;
  const putBy = starting !== null || (living !== null && slow !== null) ? cents((starting ?? 0) + (living ?? 0) * (slow ?? 0)) : null;

  const lines: string[] = [];
  lines.push(`At ${formatMoney(price)} each and ${perMonth} a month, ${formatMoney(comesIn)} comes in a month.`);
  const costs: string[] = [];
  if (materials > 0) costs.push(`materials ${formatMoney(materials)}`);
  if (fees > 0) costs.push(`fees ${formatMoney(fees)}`);
  if (overhead > 0) costs.push(`monthly costs ${formatMoney(overhead)}`);
  if (leftBeforeTax >= 0) {
    lines.push(
      costs.length > 0
        ? `Taking out ${costs.join(', ')} leaves ${formatMoney(leftBeforeTax)} before tax.`
        : `With no costs given, all ${formatMoney(leftBeforeTax)} is left before tax.`,
    );
    if (taxPercent > 0 && leftBeforeTax > 0) {
      lines.push(`Setting ${taxPercent}% of that aside for tax, ${formatMoney(setAside)}, leaves ${formatMoney(leftOver)} a month.`);
    }
  } else {
    lines.push(`Taking out ${costs.join(', ')} comes to ${formatMoney(-leftBeforeTax)} more than comes in, so nothing is left in the month.`);
  }
  if (minutes > 0) {
    lines.push(
      perHour !== null
        ? `That is ${hoursWords(minutes)} a month, which works out to ${formatMoney(perHour)} an hour.`
        : `That is ${hoursWords(minutes)} a month, with nothing left over to divide among the hours.`,
    );
  } else {
    lines.push('No time was given, so a figure for each hour cannot be worked out.');
  }
  if (overhead > 0) {
    lines.push(
      coverSales !== null
        ? `Covering the ${formatMoney(overhead)} of monthly costs takes ${coverSales} ${coverSales === 1 ? 'sale' : 'sales'} a month.`
        : 'At this price, each sale brings in less than its materials and fees, so no number of sales covers the monthly costs.',
    );
  }
  if (want !== null && want > 0) {
    if (wantSales !== null) {
      const wantMinutes = minutesEach * wantSales + runningMinutes;
      const time = minutesEach > 0 ? `, which by your time for each comes to ${hoursWords(wantMinutes)} a month` : '';
      lines.push(`Having ${formatMoney(want)} left in a month, after the tax set-aside, takes ${wantSales} sales a month${time}.`);
    } else {
      lines.push(`At this price no number of sales leaves ${formatMoney(want)} in a month.`);
    }
  }
  if (putBy !== null) {
    const parts: string[] = [];
    if (starting) parts.push(`starting costs of ${formatMoney(starting)}`);
    if (living && slow) parts.push(`${slow} ${slow === 1 ? 'month' : 'months'} of ${formatMoney(living)} living costs`);
    if (parts.length > 0) {
      lines.push(`${capitalise(parts.join(' and '))} come to ${formatMoney(putBy)} to have put by, counting nothing coming in from it in those months.`);
    }
  }

  const assumptions: string[] = [];
  assumptions.push(`${formatMoney(price)} for one, and ${perMonth} sold every month.`);
  assumptions.push(materialsEach > 0 ? `${formatMoney(materialsEach)} of materials in each one.` : 'No materials cost was given, so none is counted.');
  assumptions.push(minutesEach > 0 ? `${hoursWords(minutesEach)} to make each one.` : 'No time to make one was given, so none is counted.');
  assumptions.push(feePercent > 0 ? `${feePercent}% of each sale taken in fees.` : 'No fees were given, so none are counted.');
  assumptions.push(overhead > 0 ? `${formatMoney(overhead)} of costs every month, whatever sells.` : 'No monthly costs were given, so none are counted.');
  assumptions.push(
    runningMinutes > 0
      ? `${hoursWords(runningMinutes)} a month on selling, photos, shipping, messages and books.`
      : 'No time was given for selling, photos, shipping, messages and books. For many people this is a large part of the hours.',
  );
  assumptions.push(
    taxPercent > 0
      ? `${taxPercent}% set aside for tax is the share you chose, not a tax figure. What is owed depends on the country, the year and the rest of your income.`
      : 'Nothing is set aside for tax. Tax on self-employment is owed in most countries, and what is owed depends on the country, the year and the rest of your income.',
  );
  if (putBy !== null && !(living && slow)) assumptions.push('No living costs or months were given for the time before it brings much in.');

  const limits = [
    'These are sums on the numbers you gave. They cannot say whether people will buy, at this price or in this number, and every month is counted the same.',
    'Costs an employer would cover, such as health cover, a pension, paid leave and sick days, are not in these sums unless you put them in the monthly costs.',
    'Rules on tax, registration and benefits differ by country. An accountant or the tax office where you live can say what applies to you.',
  ];

  return { lines, assumptions, limits, comesIn, leftBeforeTax, leftOver, hours, perHour, coverSales, wantSales, putBy };
}

function capitalise(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** The key one worksheet is kept under: the interests it covers, in order. */
export function worksheetKey(interestIds: readonly string[]): string {
  return [...new Set(interestIds)].sort().join(',');
}

export function readPayWords(stored: string | null | undefined): PayWords {
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    const words: PayWords = {};
    for (const field of PAY_FIELDS) {
      if (typeof parsed?.[field] === 'string') words[field] = parsed[field];
    }
    return words;
  } catch {
    return {};
  }
}
