// The plain file behind Q14's travel question (lib/travelTime.ts,
// TravelNoticeState): the time zone the phone was last on, the trip that
// began when it changed, which meds were asked about, and answers pressed on
// a locked phone that are still to be written. Treatment ids only, never a
// med's name, so it says nothing to anyone reading the phone's storage. It
// stays on this device: the trip is where this phone is, not a record.
import { File, Paths } from 'expo-file-system';
import { currentZone, noticeZone, parseTravelNotice, tripOf, type TravelNoticeState, type TravelTrip } from './travelTime';

export const TRAVEL_QUESTION_PREFIX = 'inside-story-travel-';
export const TRAVEL_NOTICE_FILE_NAME = 'travel-notice.json';

export function travelQuestionIdentifier(treatmentId: string): string {
  return TRAVEL_QUESTION_PREFIX + treatmentId;
}

function localToday(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function readTravelNotice(): TravelNoticeState | null {
  try {
    const file = new File(Paths.document, TRAVEL_NOTICE_FILE_NAME);
    if (file.exists) return parseTravelNotice(file.textSync());
  } catch (error) {
    console.error('[travelNotice] the file could not be read', error);
  }
  return null;
}

export function writeTravelNotice(state: TravelNoticeState): void {
  try {
    const file = new File(Paths.document, TRAVEL_NOTICE_FILE_NAME);
    if (!file.exists) file.create();
    file.write(JSON.stringify(state));
  } catch (error) {
    console.error('[travelNotice] the file could not be written', error);
  }
}

/** Looks at the phone's zone, starts a trip when it has changed, and keeps
 *  the result. Called each time the reminders are worked out. */
export function noticeTravelNow(now: Date = new Date()): TravelNoticeState {
  const before = readTravelNotice();
  const after = noticeZone(before, currentZone(), now.getTime(), localToday(now));
  if (after !== before) writeTravelNotice(after);
  return after;
}

/** The trip a stepped med moves along, read without changing anything. */
export function currentTrip(): TravelTrip | null {
  return tripOf(readTravelNotice());
}
