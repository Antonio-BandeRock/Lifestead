// Buttons on the notification itself (C1 of the competitive build plan,
// 2026-09-26). Until now every reminder carried the one Snooze button, so
// answering a dose reminder meant opening the app, finding Meds and tapping
// the dose, which is three steps too many for somebody whose hands were full
// when it arrived. Each kind now carries the one answer the app already
// knows how to record for it, beside Snooze.
//
// Pure on purpose, with no expo import and no database, so
// scripts/test_reminder_actions.js can check every kind without a phone.
// lib/reminderNotifications.ts registers the categories and does the writes.
//
// No button opens the app (1.0.53.10, direct instruction 2026-09-26: "it
// should just do it rather than take the user to the app to do it there").
// The press is recorded where the notification sits and the reminder goes
// away. Until 1.0.53.9 every button opened the app for a moment. Nothing is
// shown afterwards (direct instruction, 2026-09-27): the person pressed the
// button, so a notification saying so is one more thing to clear.
//
// Android hands a press to the app's JavaScript whenever the app is still
// running in the background, which is most of the time. When the phone has
// closed the app completely, the press is kept and recorded the next time
// the app opens; recording it at once in that case needs expo-task-manager,
// which is a native rebuild and is on the list for the next one.
//
// What gets a button, and what deliberately does not:
//   - A dose, a drink and a planned meal write the same schedule status the
//     Reconciliation screen writes for "Took it", "Drank it" and "Ate it".
//   - A garden task and a thing noted down in Capture write "completed",
//     the same as Reconciliation's "Did it".
//   - Upkeep on a cadence ("every six months") records a doing for today,
//     the same as the Upkeep lens. Something that EXPIRES does not get the
//     button, because renewing it needs the new expiry date, which a button
//     cannot ask for.
//   - A compost pile records a turn for today.
//   - A crop in My Crops (2026-10-01): Prepped on the get-ready reminder and
//     Sown on the sowing one record that step for that window, which is
//     what quiets it, the same as the buttons on the crop's row.
//   - The two check-in kinds ask one plain question, "Do you need to log a
//     flare?", with Yes and No (1.0.67.1). Direct instruction, 2026-10-11:
//     "why not just be straight forward with a simple question like 'Do you
//     need to log a flare?' and it offers Yes and No. If they say no, it
//     goes away, and if they say yes it starts sending questions about the
//     flare that they can tap the answer without unlocking the phone." No
//     writes nothing. Yes saves the flare at once and brings up how bad it
//     is (Mild, Moderate, Severe or worse, then Severe or Very severe), then
//     what it is most like, from the two symptoms the person has logged
//     with flares most often. Each answer changes the one flare Yes saved,
//     whose id rides in the follow-up's payload. Until 1.0.67.1 these two
//     buttons took a typed reply, which Android will not take on a locked
//     phone, so the question could not be answered where it was seen.
//
// Every notification answered or cleared on the lock screen (standing rule,
// 2026-10-11: "notifications are required to all be answered or dismissed
// without having to unlock the phone and open the app"). So no button takes
// typed words, since Android asks for the unlock before it opens a reply
// box, and no button opens the app. scripts/audit_lock_answerable.js checks
// both, and that no set holds more than the three buttons Android shows.
//   - The morning check-in asks how somebody slept with three of the sleep
//     scale's own words (direct instruction, 2026-10-01: a question on a
//     notification must be answerable on it, or its tap must open the place
//     it is answered). A press saves the word and brings up the energy
//     question with three of the energy scale's own words. Android shows
//     three buttons at most, so neither carries Snooze; the tap opens the
//     check-in on the sleep question, where all five words and a note are.
//   - Appointments, bills, work benefits, Days Until counters, routines and
//     Your Week carry Got it and Snooze. Nothing in the app records a bill
//     as paid or a benefit as used, a counter is marked done where it
//     lives, and a routine is a walk of several steps that its tap already
//     opens, so Got it writes nothing: it clears the reminder. Until
//     1.0.74.12 they had Snooze only, which left a reminder that had been
//     read with no way to go except coming back in 15 minutes (direct
//     report, 2026-10-27, on Your Week).

export type ReminderActionId =
  | 'snooze'
  | 'gotIt'
  | 'taken'
  | 'drank'
  | 'ate'
  | 'done'
  | 'doneToday'
  | 'turned'
  | 'flareYes'
  | 'flareNo'
  | 'flareMild'
  | 'flareModerate'
  | 'flareWorse'
  | 'flareSevere'
  | 'flareVerySevere'
  | 'flareTagA'
  | 'flareTagB'
  | 'flareTagOther'
  | 'flareWhyA'
  | 'flareWhyB'
  | 'flareWhyNotSure'
  | 'sleptPoorly'
  | 'sleptOkay'
  | 'sleptWell'
  | 'energyLow'
  | 'energySome'
  | 'energyPlenty'
  | 'prepped'
  | 'sown'
  | 'vaultSetUp'
  | 'vaultNotNow'
  | 'vaultStop';

export type ReminderCategoryKey =
  | 'plain'
  | 'dose'
  | 'hydration'
  | 'meal'
  | 'task'
  | 'upkeep'
  | 'compost'
  | 'checkin'
  | 'flareHowBad'
  | 'flareWorse'
  | 'morning'
  | 'energy'
  | 'cropPrep'
  | 'cropSow'
  | 'vaultOffer';

// 'plain' keeps the identifier the single category always had, so a
// reminder already queued is still correct and is left alone by the
// reconcile rather than replaced; it picks up Got it from the category.
export const REMINDER_CATEGORY_IDS: Record<ReminderCategoryKey, string> = {
  plain: 'inside-story-reminder',
  dose: 'inside-story-reminder-dose',
  hydration: 'inside-story-reminder-drink',
  meal: 'inside-story-reminder-meal',
  task: 'inside-story-reminder-task',
  upkeep: 'inside-story-reminder-upkeep',
  compost: 'inside-story-reminder-compost',
  // A new identifier for the Yes and No pair, so a check-in queued before
  // 1.0.67.1 keeps the typed-reply buttons it was posted with rather than
  // showing Yes and No over a question that asks something else.
  checkin: 'inside-story-reminder-flare-ask',
  flareHowBad: 'inside-story-reminder-flare-how-bad',
  flareWorse: 'inside-story-reminder-flare-worse',
  morning: 'inside-story-reminder-morning',
  energy: 'inside-story-reminder-energy',
  cropPrep: 'inside-story-reminder-crop-prep',
  cropSow: 'inside-story-reminder-crop-sow',
  vaultOffer: 'inside-story-vault-offer',
};

// The 1 to 5 value each morning button saves. Each title is that value's
// word on its scale (SLEEP_QUALITY_WORDS in lib/morningCheckin.ts, the
// energy words in lib/dailyScales.ts), which scripts/test_reminder_actions.js
// checks, so a button never says one thing and saves another.
export const MORNING_BUTTON_VALUES: Partial<Record<ReminderActionId, number>> = {
  sleptPoorly: 2,
  sleptOkay: 3,
  sleptWell: 4,
  energyLow: 2,
  energySome: 3,
  energyPlenty: 5,
};

export const ALL_REMINDER_CATEGORY_KEYS = Object.keys(REMINDER_CATEGORY_IDS) as ReminderCategoryKey[];

export function reminderActionTitle(action: ReminderActionId, snoozeMinutes: number): string {
  switch (action) {
    case 'snooze':
      return `Snooze ${snoozeMinutes} min`;
    case 'gotIt':
      return 'Got it';
    case 'taken':
      return 'Taken';
    case 'drank':
      return 'Drank it';
    case 'ate':
      return 'Ate it';
    case 'done':
      return 'Done';
    case 'doneToday':
      return 'Done today';
    case 'turned':
      return 'Turned it';
    case 'flareYes':
      return 'Yes';
    case 'flareNo':
      return 'No';
    case 'flareMild':
      return 'Mild';
    case 'flareModerate':
      return 'Moderate';
    case 'flareWorse':
      return 'Severe or worse';
    case 'flareSevere':
      return 'Severe';
    case 'flareVerySevere':
      return 'Very severe';
    // The symptom buttons carry the symptom's name, set when the question
    // is shown (flareWhatCategory); these are what stands in where no name
    // is to hand.
    case 'flareTagA':
      return 'The first one';
    case 'flareTagB':
      return 'The second one';
    case 'flareTagOther':
      return 'Something else';
    // Named for the person's contributors when the question is shown, the
    // same way the symptom buttons are.
    case 'flareWhyA':
      return 'The first one';
    case 'flareWhyB':
      return 'The second one';
    case 'flareWhyNotSure':
      return 'Not sure';
    case 'sleptPoorly':
      return 'Poorly';
    case 'sleptOkay':
      return 'Okay';
    case 'sleptWell':
      return 'Well';
    case 'energyLow':
      return 'Low';
    case 'energySome':
      return 'Some';
    case 'energyPlenty':
      return 'Plenty';
    case 'prepped':
      return 'Prepped';
    case 'sown':
      return 'Sown';
    case 'vaultSetUp':
      return 'Set It Up';
    case 'vaultNotNow':
      return 'Not Now';
    case 'vaultStop':
      return 'Stop Asking';
  }
}

// Android shows three buttons at most, so no category may list more.
export const CATEGORY_ACTIONS: Record<ReminderCategoryKey, ReminderActionId[]> = {
  plain: ['gotIt', 'snooze'],
  dose: ['taken', 'snooze'],
  hydration: ['drank', 'snooze'],
  meal: ['ate', 'snooze'],
  task: ['done', 'snooze'],
  upkeep: ['doneToday', 'snooze'],
  compost: ['turned', 'snooze'],
  // No Snooze: the question is answered with Yes or No, and No is how it
  // goes away.
  checkin: ['flareYes', 'flareNo'],
  flareHowBad: ['flareMild', 'flareModerate', 'flareWorse'],
  flareWorse: ['flareSevere', 'flareVerySevere'],
  morning: ['sleptPoorly', 'sleptOkay', 'sleptWell'],
  energy: ['energyLow', 'energySome', 'energyPlenty'],
  cropPrep: ['prepped', 'snooze'],
  cropSow: ['sown', 'snooze'],
  // The offer to set the vault up (lib/vault.ts, shouldOfferVault): three
  // answers and no Snooze, since Not Now is the snooze and it asks again in
  // a month.
  vaultOffer: ['vaultSetUp', 'vaultNotNow', 'vaultStop'],
};

/**
 * Which set of buttons a reminder of this kind carries. `markable` is false
 * for the one case inside a kind that cannot be answered with a button: an
 * upkeep item that expires rather than recurs.
 */
export function categoryKeyFor(kind: string, markable = true): ReminderCategoryKey {
  switch (kind) {
    case 'dose':
      return 'dose';
    case 'hydration':
      return 'hydration';
    case 'meal':
      return 'meal';
    case 'garden':
    case 'reminder':
    case 'check':
    case 'todo':
      return 'task';
    case 'upkeep':
      return markable ? 'upkeep' : 'plain';
    case 'compost':
      return 'compost';
    case 'checkin':
    case 'afterMeal':
      return 'checkin';
    case 'morning':
      return 'morning';
    case 'cropPrep':
      return 'cropPrep';
    case 'cropSow':
      return 'cropSow';
    default:
      return 'plain';
  }
}

// --- The flare questions (1.0.67.1) ------------------------------------------

/** What the check-in asks, with Yes and No. */
export const FLARE_ASK_TITLE = 'Do you need to log a flare?';

export function flareAskAfterMealTitle(mealName: string): string {
  return `Do you need to log a flare after ${mealName}?`;
}

/** The step each severity button saves, on SEVERITY_STEPS in lib/severityScale.ts. */
export const FLARE_SEVERITY_VALUES: Partial<Record<ReminderActionId, number>> = {
  flareMild: 1,
  flareModerate: 2,
  // Saved as Severe at once, so a flare left at the next question is not
  // left lighter than the person said; Very severe changes it to 4.
  flareWorse: 3,
  flareSevere: 3,
  flareVerySevere: 4,
};

export type FlareQuestion = 'howBad' | 'worse' | 'what' | 'why';

/** The question a press brings up next, or null when the chain is done.
 *  What was going on follows the symptom question (2026-10-11), since a
 *  flare is never assumed to come from food. */
export function flareFollowUp(action: string): FlareQuestion | null {
  if (action === 'flareYes') return 'howBad';
  if (action === 'flareWorse') return 'worse';
  if (action === 'flareMild' || action === 'flareModerate' || action === 'flareSevere' || action === 'flareVerySevere') return 'what';
  if (action === 'flareTagA' || action === 'flareTagB' || action === 'flareTagOther') return 'why';
  return null;
}

export const FLARE_QUESTION_TEXT: Record<FlareQuestion, { title: string; body: string }> = {
  howBad: { title: 'How bad is the flare?', body: 'The flare is saved. Pick how bad it is and it is saved with it.' },
  worse: { title: 'Severe or very severe?', body: 'Saved as severe for now. Pick the one that fits.' },
  what: {
    title: 'What is it most like?',
    body: 'The symptoms you have logged with flares most often. Something else keeps the flare as it is, and you can add what it was like with Edit on the flare in Signals.',
  },
  why: {
    title: 'What was going on?',
    body: 'What you mark most often, or what fits what you told the app. Not sure keeps the flare as it is, and you can add more with Edit on the flare in Signals.',
  },
};

// The symptom question's buttons are named for the person's symptoms, so
// its set is registered when it is shown, under one of these two
// identifiers by how many symptoms it names.
export const FLARE_WHAT_CATEGORY_IDS: Record<1 | 2, string> = {
  1: 'inside-story-reminder-flare-what-1',
  2: 'inside-story-reminder-flare-what-2',
};

export function flareWhatActions(count: 1 | 2): ReminderActionId[] {
  return count === 2 ? ['flareTagA', 'flareTagB', 'flareTagOther'] : ['flareTagA', 'flareTagOther'];
}

// What was going on: always two of the person's contributors and Not sure,
// registered when it is shown since the first two carry their names.
export const FLARE_WHY_CATEGORY_ID = 'inside-story-reminder-flare-why';
export const FLARE_WHY_ACTIONS: ReminderActionId[] = ['flareWhyA', 'flareWhyB', 'flareWhyNotSure'];

/** The kind every follow-up question carries; its scheduleItemId is the flare's id. */
export const FLARE_FOLLOW_UP_KIND = 'flare';

/** The id Yes gives the flare it saves, made at the press so every later answer finds it. */
export function newFlareId(pressedAt: Date): string {
  return `checkin_flare_${pressedAt.getTime()}`;
}

// Words written or said on the screen a tap on the flare questions opens
// over the lock screen (next rebuild, 2026-10-11). Not a button on any
// notification: the screen hands it in the way a press is handed in, so it
// is sealed for the next unlock or written at once by the same path.
export const ADD_WORDS_ACTION = 'addWords';

/** Added to the body of a question the words screen can open on. */
export const ADD_WORDS_LINE = 'Tap here to write or say more without unlocking.';

/** Whether a tap on this kind of reminder can open the words screen. */
export function takesWords(kind: string): boolean {
  return kind === 'checkin' || kind === 'afterMeal' || kind === FLARE_FOLLOW_UP_KIND;
}

export type ReminderActionPlan =
  | { write: 'scheduleStatus'; status: 'logged' | 'completed' }
  | { write: 'checkMarked' }
  | { write: 'upkeepDone' }
  | { write: 'compostTurned' }
  | { write: 'todoDone' }
  | { write: 'cropStep'; step: 'prepped' | 'sown' }
  | { write: 'checkinNote' }
  | { write: 'flare' }
  | { write: 'flareStart' }
  | { write: 'flareSeverity'; value: number }
  | { write: 'flareTag'; slot: 0 | 1 }
  | { write: 'flareWhy'; slot: 0 | 1 | 'notSure' }
  | { write: 'flareNote' }
  | { write: 'nothing' }
  | { write: 'sleepQuality'; value: number }
  | { write: 'morningEnergy'; value: number };

/**
 * What a pressed button does. Null for Snooze (handled on its own), for a
 * plain tap, and for any pairing a notification should never carry, since
 * everything read here came off a notification the phone has been holding,
 * possibly since before an update.
 */
export function planReminderAction(kind: string, action: string): ReminderActionPlan | null {
  // Got it, on a reminder with nothing to record: it goes, nothing is written.
  if (action === 'gotIt') return { write: 'nothing' };
  const asks = kind === 'checkin' || kind === 'afterMeal';
  if (action === 'flareYes' && asks) return { write: 'flareStart' };
  // No is the answer, and the question goes away with nothing written.
  if (action === 'flareNo' && asks) return { write: 'nothing' };
  // Words on the flare question are a check-in note, and words on a flare
  // already saved go with that flare.
  if (action === ADD_WORDS_ACTION && asks) return { write: 'checkinNote' };
  if (action === ADD_WORDS_ACTION && kind === FLARE_FOLLOW_UP_KIND) return { write: 'flareNote' };
  if (kind === FLARE_FOLLOW_UP_KIND) {
    const step = FLARE_SEVERITY_VALUES[action as ReminderActionId];
    if (step !== undefined) return { write: 'flareSeverity', value: step };
    if (action === 'flareTagA') return { write: 'flareTag', slot: 0 };
    if (action === 'flareTagB') return { write: 'flareTag', slot: 1 };
    if (action === 'flareTagOther') return { write: 'nothing' };
    if (action === 'flareWhyA') return { write: 'flareWhy', slot: 0 };
    if (action === 'flareWhyB') return { write: 'flareWhy', slot: 1 };
    if (action === 'flareWhyNotSure') return { write: 'flareWhy', slot: 'notSure' };
  }
  // The typed-reply buttons check-ins carried until 1.0.67.1, still on a
  // notification posted before the update.
  if (action === 'howAreYou' && asks) return { write: 'checkinNote' };
  if (action === 'logFlare' && asks) return { write: 'flare' };
  // The energy question is a morning reminder too, raised by the sleep
  // press with the energy buttons rather than planned on its own.
  const morningValue = MORNING_BUTTON_VALUES[action as ReminderActionId];
  if (kind === 'morning' && morningValue !== undefined) {
    return action.startsWith('slept') ? { write: 'sleepQuality', value: morningValue } : { write: 'morningEnergy', value: morningValue };
  }
  if (action === 'taken' && kind === 'dose') return { write: 'scheduleStatus', status: 'logged' };
  if (action === 'drank' && kind === 'hydration') return { write: 'scheduleStatus', status: 'logged' };
  if (action === 'ate' && kind === 'meal') return { write: 'scheduleStatus', status: 'logged' };
  if (action === 'done' && (kind === 'garden' || kind === 'reminder')) return { write: 'scheduleStatus', status: 'completed' };
  if (action === 'done' && kind === 'check') return { write: 'checkMarked' };
  if (action === 'doneToday' && kind === 'upkeep') return { write: 'upkeepDone' };
  if (action === 'turned' && kind === 'compost') return { write: 'compostTurned' };
  if (action === 'done' && kind === 'todo') return { write: 'todoDone' };
  if (action === 'prepped' && kind === 'cropPrep') return { write: 'cropStep', step: 'prepped' };
  if (action === 'sown' && kind === 'cropSow') return { write: 'cropStep', step: 'sown' };
  return null;
}

// --- What a reminder says, and what a press says back -----------------------

/**
 * The one sentence a reminder's body uses to say what its button records
 * and where, so nobody has to guess what pressing it will do. Null for a
 * reminder whose only button is Snooze.
 */
export function answerLine(kind: string, markable = true): string | null {
  switch (categoryKeyFor(kind, markable)) {
    case 'dose':
      return 'Taken marks it taken on Meds.';
    case 'hydration':
      return 'Drank it marks it on Hydration.';
    case 'meal':
      return "Ate it marks it eaten on Today's Meals.";
    case 'task':
      if (kind === 'garden') return 'Done marks it done in Upcoming Tasks.';
      if (kind === 'check') return 'Done marks it on Did I Do It.';
      if (kind === 'todo') return 'Done marks it done on your list.';
      return 'Done marks it done.';
    case 'upkeep':
      return 'Done today records it in Upkeep.';
    case 'compost':
      return 'Turned it records a turn for today.';
    case 'cropPrep':
      return 'Prepped records it in My Crops.';
    case 'cropSow':
      return 'Sown records it in My Crops.';
    case 'checkin':
      return 'Yes saves a flare and asks how bad it is, No clears this, both right here.';
    case 'morning':
      return 'Pick one here and the energy question follows, or tap for every answer and a note.';
    default:
      return null;
  }
}

// The question a sleep press brings up, answered with the energy buttons.
export const MORNING_ENERGY_TITLE = 'How much energy do you have?';
export const MORNING_ENERGY_BODY = 'Pick one here and it is saved with how you slept, or tap to add a note.';

// --- The two check-in reminders ---------------------------------------------

/** Minutes after a meal was eaten that the after-meal question arrives. */
export const AFTER_MEAL_MINUTES = 120;

export type LoggedMealForNudge = {
  id: string;
  name: string;
  mealType: string;
  /** Local 'YYYY-MM-DDTHH:mm', as meals.eaten_at stores it. */
  eatenAt: string;
};

function parseLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The one after-meal question worth asking, or null. Only the latest meal
 * eaten in the last two hours is asked about, because a coffee at ten and
 * lunch at eleven are one stretch of eating and two questions about it would
 * be nagging. A drink logged on its own is not a meal and asks nothing, and
 * nothing is asked once the person has already checked in since eating.
 */
export function planAfterMealNudge(
  meals: LoggedMealForNudge[],
  lastCheckinAt: string | null,
  now: Date,
): { meal: LoggedMealForNudge; fireAt: Date } | null {
  let latest: { meal: LoggedMealForNudge; eaten: Date } | null = null;
  for (const meal of meals) {
    if (meal.mealType === 'beverage') continue;
    const eaten = parseLocal(meal.eatenAt);
    if (!eaten || eaten.getTime() > now.getTime()) continue;
    if (!latest || eaten.getTime() > latest.eaten.getTime()) latest = { meal, eaten };
  }
  if (!latest) return null;
  const fireAt = new Date(latest.eaten.getTime() + AFTER_MEAL_MINUTES * 60_000);
  if (fireAt.getTime() <= now.getTime()) return null;
  const checked = lastCheckinAt ? parseLocal(lastCheckinAt) : null;
  if (checked && checked.getTime() >= latest.eaten.getTime()) return null;
  return { meal: latest.meal, fireAt };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Every daily flare question inside the window, soonest first. Today's
 * is left out once anything has been checked in today, since the question
 * has been answered.
 */
export function planDailyCheckins(time: string, now: Date, days: number, checkedInToday: boolean): Date[] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return [];
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return [];
  const out: Date[] = [];
  for (let offset = 0; offset <= days; offset += 1) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, minute);
    if (at.getTime() <= now.getTime()) continue;
    if (offset === 0 && checkedInToday) continue;
    out.push(at);
  }
  return out;
}
