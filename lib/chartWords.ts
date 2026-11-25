// What a screen reader says for a chart (2026-11-24, build plan Q10 and Q35):
// the same figures the drawing shows, in a few plain sentences. Spoken only,
// never printed. A stretch with nothing recorded is said to have nothing
// recorded, and never as a zero. No sentence says what a reading should be.
//
// Each sentence is translated on its own, since that is what the language
// tables hold. lib/i18n.ts needs nothing from the phone, so
// scripts/test_chart_words.js runs this.
import { t } from './i18n';
import type { TierSeverity } from './sixDimensionsReference';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86400000;

export function chartDate(date: string, withYear: boolean): string {
  const [year, month, day] = date.slice(0, 10).split('-');
  const short = `${MONTHS[Number(month) - 1] ?? month} ${Number(day)}`;
  return withYear ? `${short}, ${year}` : short;
}

type Point = { date: string; value: number };
type Gap = { from: string; to: string };

/**
 * With no set break, a gap is a step well past the usual one, so a chart of
 * weeks, or of labs months apart, is not said to be missing the days between.
 */
export function chartGaps(points: readonly Point[], breakGapDays: number | null): Gap[] {
  const steps = points.slice(1).map((point, index) => Math.round((Date.parse(point.date.slice(0, 10)) - Date.parse(points[index].date.slice(0, 10))) / DAY_MS));
  if (steps.length === 0) return [];
  const usual = [...steps].sort((a, b) => a - b)[Math.floor((steps.length - 1) / 2)];
  const limit = breakGapDays ?? Math.max(1, usual * 1.5);
  return steps.flatMap((step, index) => (step > limit ? [{ from: points[index].date, to: points[index + 1].date }] : []));
}

const MOST_GAPS_SAID = 3;

export function trendChartWords(chart: {
  /** Oldest first, exactly as drawn. */
  points: readonly Point[];
  say: (value: number) => string;
  bucket: 'day' | 'week' | 'month';
  breakGapDays: number | null;
  referenceLabel?: string | null;
  usual?: { low: number; high: number } | null;
  /** The part of the last figure a lower line stands for, such as what came from food. */
  lower?: { value: number; label: string } | null;
}): string {
  const { points, say, bucket } = chart;
  if (points.length === 0) return t('Nothing recorded to chart.');
  const first = points[0];
  const last = points[points.length - 1];
  const withYear = first.date.slice(0, 4) !== last.date.slice(0, 4);
  const when = (date: string) => chartDate(date, withYear);
  if (points.length === 1) return t('Chart of one point: {value} on {date}.', { value: say(first.value), date: when(first.date) });
  const low = points.reduce((best, point) => (point.value < best.value ? point : best));
  const high = points.reduce((best, point) => (point.value > best.value ? point : best));
  const said: string[] = [];
  const count = points.length;
  if (bucket === 'week') said.push(t('Line chart of {count} weekly averages.', { count }));
  else if (bucket === 'month') said.push(t('Line chart of {count} monthly averages.', { count }));
  else said.push(t('Line chart of {count} points.', { count }));
  said.push(t('It starts on {date} at {value}.', { date: when(first.date), value: say(first.value) }));
  said.push(t('It ends on {date} at {value}.', { date: when(last.date), value: say(last.value) }));
  if (low.value === high.value) {
    said.push(t('Every point is {value}.', { value: say(low.value) }));
  } else {
    said.push(t('The lowest is {value}, on {date}.', { value: say(low.value), date: when(low.date) }));
    said.push(t('The highest is {value}, on {date}.', { value: say(high.value), date: when(high.date) }));
  }
  const gaps = chartGaps(points, chart.breakGapDays);
  for (const gap of gaps.slice(0, MOST_GAPS_SAID)) {
    said.push(t('Nothing recorded between {start} and {end}.', { start: when(gap.from), end: when(gap.to) }));
  }
  if (gaps.length > MOST_GAPS_SAID) said.push(t('Other stretches with nothing recorded: {count}.', { count: gaps.length - MOST_GAPS_SAID }));
  if (chart.lower) said.push(t('Of the last figure, {label}: {value}.', { label: chart.lower.label, value: say(chart.lower.value) }));
  if (chart.usual) said.push(t('Shaded band: {low} to {high}.', { low: say(chart.usual.low), high: say(chart.usual.high) }));
  if (chart.referenceLabel) said.push(t('Dashed line: {label}.', { label: chart.referenceLabel }));
  return said.join(' ');
}

export type ArcState = 'done' | 'skipped' | 'late' | 'planned';

function arcItemWords(item: { title: string; time: string; state: ArcState }): string {
  const values = { title: item.title, time: item.time };
  if (item.state === 'done') return t('{title} at {time}, logged.', values);
  if (item.state === 'skipped') return t('{title} at {time}, skipped.', values);
  if (item.state === 'late') return t('{title} at {time}, time passed and not logged.', values);
  return t('{title} at {time}, still to come.', values);
}

export function dayArcWords(items: readonly { title: string; time: string; state: ArcState }[]): string {
  if (items.length === 0) return t('Nothing is on your day.');
  const head = items.length === 1 ? t('One thing is on your day.') : t('{count} things are on your day.', { count: items.length });
  return [head, ...items.map(arcItemWords)].join(' ');
}

/** The English word for a severity color, translated where it is shown. */
export const SEVERITY_WORDS: Record<TierSeverity, string> = {
  green: 'Green',
  yellow: 'Yellow',
  red: 'Red',
  unknown: 'Not assessed',
};

export function dimensionChartWords(data: readonly { dimension: string; severity: TierSeverity }[]): string {
  return [t('Dimension chart.'), ...data.map((datum) => `${t(datum.dimension)}: ${t(SEVERITY_WORDS[datum.severity])}.`)].join(' ');
}

export function ringWords(ring: { label: string; sublabel?: string | null; percent: number; supplementPercent?: number }): string {
  const percent = `${Math.round(ring.percent)}%`;
  const said = [ring.label === percent ? `${percent}.` : `${t(ring.label)}: ${percent}.`];
  if (ring.sublabel && ring.sublabel !== percent) said.push(`${t(ring.sublabel)}.`);
  const fromSupplement = Math.round(ring.supplementPercent ?? 0);
  if (fromSupplement > 0) said.push(t('{percent}% came from a supplement.', { percent: fromSupplement }));
  return said.join(' ');
}
