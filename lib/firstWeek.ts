// The first week, P1 of the competitive build plan (1.0.68.5). Direct
// statement behind it, 2026-09-16: someone who came for help running their
// day "should recognize the app as theirs on the first screen". Days one,
// two and seven each get one line on the One Next Thing card, aimed at the
// daily-living core rather than at food or a condition, since that is the
// part of the app every person can use without setting anything else up.
//
// The rules Your Story keeps hold here: no count of what was or was not
// done, no praise, no blame, and nothing asked about the days in between.
// Pure, so scripts/test_first_week.js checks it without a phone.

export type FirstWeekLine = {
  sentence: string;
  action: string;
  /** Where the button goes: a route, with params for a lens. */
  pathname: string;
  params?: Record<string, string>;
};

/** Which day of use `now` is, counted from the local day of `firstDay`
 *  (a YYYY-MM-DD string), with the first day as 1. Null for a stamp that
 *  does not parse or lies in the future. */
export function firstWeekDay(firstDay: string | null | undefined, now: number): number | null {
  if (!firstDay || !/^\d{4}-\d{2}-\d{2}$/.test(firstDay)) return null;
  const [year, month, date] = firstDay.split('-').map(Number);
  const start = Date.UTC(year, month - 1, date);
  const today = new Date(now);
  const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((end - start) / 86_400_000);
  return days < 0 ? null : days + 1;
}

/** Today's local day as YYYY-MM-DD, the shape firstWeekDay reads. */
export function localDayStamp(now: number): string {
  const day = new Date(now);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** The line for day one, two or seven, or null on any other day. */
export function firstWeekLine(day: number | null): FirstWeekLine | null {
  switch (day) {
    case 1:
      return {
        sentence:
          'Your first day here. Put the next thing you need to remember in Capture, and it stays there until you decide where it belongs.',
        action: 'Open Capture',
        pathname: '/capture',
      };
    case 2:
      return {
        sentence:
          'Something you do every day, like a medicine, watering the plants or locking up, can become a routine, so the app holds it instead of you.',
        action: 'Open Routines',
        pathname: '/life',
        params: { openLifeLens: 'routines' },
      };
    case 7:
      return {
        sentence:
          'A week since you started. Your Guide shows what is set up and what could come next, whenever you want to look.',
        action: 'Open Your Guide',
        pathname: '/your-story',
      };
    default:
      return null;
  }
}
