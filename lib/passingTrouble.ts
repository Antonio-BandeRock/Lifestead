// Trouble that passes on its own is not said out loud until it has lasted,
// 1.0.66.9 (2026-10-10). Direct instruction, after a "Sync could not reach
// your shared folder ... OneDrive refused that (503)" notice on the phone:
// "The last thing we need is for the users to get messages that aren't a big
// deal and only serve to make them wonder what's wrong when nothing is wrong."
// And for anything else like it: "please make the same change for them."
//
// Turned around on 2026-10-12 (1.0.68.2), after the notice came again:
// "Why is this being shown at all? I thought we had this fixed." Two holes
// let it through. Only a short list of sentences counted as passing, so any
// other wording (a copy OneDrive was still uploading from the other device
// reading as "could not be read", a download that broke off) spoke at once.
// And the clock counted only time, so one failure as the phone woke, then
// another an hour later on the next wake, read as an hour of trouble with
// two failed tries in it.
//
// So now the short list is the other way round: NEEDS_THE_PERSON names the
// few things nobody but the person can put right (signed out, the folder
// gone or refused, the wrong sync password, sync turned off), and those are
// said at once, the way they always were. Everything else is passing, and is
// said only once it has lasted PASSING_TROUBLE_HOLD_MS AND failed at least
// PASSING_TROUBLE_MIN_FAILURES separate times with no success in between. Any success
// stops the clock.
//
// No I/O here, so scripts/test_passing_trouble.js can check it. Where the
// clock is kept is lib/passingTroubleClock.ts.

export const PASSING_TROUBLE_HOLD_MS = 60 * 60 * 1000;
export const PASSING_TROUBLE_MIN_FAILURES = 4;
// Failures closer together than this are one try: a single wake reads the
// session note, checks for an arrival and saves, and all three fail together.
export const SEPARATE_TRY_GAP_MS = 2 * 60 * 1000;

// The sentence lib/oneDriveGraph.ts gives a status Microsoft uses for "busy,
// try later" (408, 429 and the 5xx family).
export const ONEDRIVE_BUSY_LEAD = 'OneDrive is busy or briefly unavailable';

const NEEDS_THE_PERSON: readonly RegExp[] = [
  /Not signed in to OneDrive/i,
  /sign-in expired/i,
  /no longer a folder/i,
  /not found|could not be found/i,
  /access ?denied|\(403/i,
  /not the password sync was turned on with/i,
  /no OneDrive application id/i,
  /Sync is off/i,
];

export function needsThePerson(reason: string): boolean {
  return NEEDS_THE_PERSON.some((pattern) => pattern.test(reason));
}

export function isPassingTrouble(reason: string): boolean {
  return !needsThePerson(reason);
}

/** When the current run of passing trouble began, how many separate tries have failed in it, and when the last one did. */
export type TroubleClock = { since: number; count: number; last: number };

export type TroubleDecision =
  | { speak: false; clock: TroubleClock }
  | { speak: true; clock: TroubleClock | null; sentence: string };

/**
 * What to do with one failure. A passing failure keeps or starts the clock
 * and adds one to its count; any other failure leaves it as it was.
 */
export function decideTrouble(clock: TroubleClock | null, reason: string, now: number): TroubleDecision {
  if (needsThePerson(reason)) return { speak: true, clock, sentence: reason };
  const separate = !clock || now - clock.last >= SEPARATE_TRY_GAP_MS;
  const next: TroubleClock = {
    since: clock?.since ?? now,
    count: (clock?.count ?? 0) + (separate ? 1 : 0),
    last: now,
  };
  if (now - next.since < PASSING_TROUBLE_HOLD_MS || next.count < PASSING_TROUBLE_MIN_FAILURES) {
    return { speak: false, clock: next };
  }
  return { speak: true, clock: next, sentence: 'This has been going on for more than an hour. ' + reason };
}
