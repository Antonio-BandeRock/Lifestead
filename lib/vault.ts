// The vault, the rules with no I/O in them (agreed 2026-10-06, phase 1 built
// 2026-10-07, phase 2 from 2026-10-07). Pure, so scripts/test_vault.js
// checks every decision without a phone.
//
// What it is: the part of a person's records that only a partner may ever
// see, kept closed while the app is open, so a phone left unlocked on the
// counter shows the shopping list and not the labs. It opens with the App
// Lock code or fingerprint, or with a code of its own when App Lock is off,
// and closes once the app has been put away for as long as the person chose
// (Tony, 2026-11-27: it had closed on every trip to the camera or a
// fingerprint prompt, so it asked again at every turn).
//
// What goes in it is the person's choice, one category at a time (direct
// instruction, 2026-10-07): "let the user decide what goes into the vault
// and what stays out." Everything HIPAA would treat as health information
// and everything about money is offered pre-ticked, and nothing is in the
// vault until somebody chooses it.
//
// Records, never tools. The vault holds what a person has stored, never the
// means of adding to it: a list of choices (the check-in tags a person made
// up), a template or a setting stays out, so every form works with the vault
// closed and only the history beside it says "in the vault".
//
// How it holds, two ways:
//
//  1. A RECORDS category is refused at the one place every read goes
//     through (attachWriteTracking in lib/databaseActivity.ts). A SELECT that
//     names one of its tables while the vault is closed is refused with
//     VaultClosedError before it reaches the database, the same way
//     SessionReadOnlyError refuses a write. Writing is never refused: a
//     check-in can be added with the vault closed, and it is then behind the
//     vault with the rest.
//
//  2. A LISTED category (medications, conditions, appointments) cannot be
//     refused at the database, because the app's tools read the same rows to
//     keep a person safe: the timing warnings read the medicines, food scoring
//     reads the conditions, the day's reminders read the appointments. Safety
//     is never hidden, by a tier or by the vault (P28). So those reads go on,
//     and the screens that SHOW the list (My Meds, the conditions list, the
//     appointments lens, past doses, a report's sections) ask
//     isCategoryClosed() and draw the band instead. Agreed 2026-10-07 with
//     the cost said out loud: a warning on a food screen still says "a
//     caution for your condition".
//
// A tool that must read a RECORDS table to work (a personal rule raising its
// warning, a family member's conditions joining the meal plan) marks its
// statement with VAULT_TOOL_READ. scripts/audit_vault_readers.js lists every
// file allowed to.
//
// The emergency card is never in the vault, by agreement: it has to be
// readable by whoever is helping.

export type VaultCategory =
  | 'symptoms'
  | 'labs'
  | 'body'
  | 'cycle'
  | 'therapy'
  | 'neuro'
  | 'work'
  | 'experiments'
  | 'familyHealth'
  | 'medications'
  | 'conditions'
  | 'appointments'
  | 'medicalBills'
  | 'finances'
  | 'diary';

/** The order categories are listed in: health, then money, then the diary. */
export const VAULT_CATEGORIES: readonly VaultCategory[] = [
  'symptoms',
  'labs',
  'body',
  'cycle',
  'therapy',
  'neuro',
  'work',
  'experiments',
  'familyHealth',
  'medications',
  'conditions',
  'appointments',
  'medicalBills',
  'finances',
  'diary',
];

/** Refused at the database (records), or hidden where the list is shown (listed). */
export type VaultCategoryKind = 'records' | 'listed';

export const VAULT_CATEGORY_KIND: Record<VaultCategory, VaultCategoryKind> = {
  symptoms: 'records',
  labs: 'records',
  body: 'records',
  cycle: 'records',
  therapy: 'records',
  neuro: 'records',
  work: 'records',
  experiments: 'records',
  familyHealth: 'records',
  medications: 'listed',
  conditions: 'listed',
  appointments: 'listed',
  medicalBills: 'records',
  finances: 'records',
  diary: 'records',
};

/** Health information, money or personal, which is how setup groups them. */
export const VAULT_CATEGORY_GROUP: Record<VaultCategory, VaultGroup> = {
  symptoms: 'health',
  labs: 'health',
  body: 'health',
  cycle: 'health',
  therapy: 'health',
  neuro: 'health',
  work: 'health',
  experiments: 'health',
  familyHealth: 'health',
  medications: 'health',
  conditions: 'health',
  appointments: 'health',
  medicalBills: 'money',
  finances: 'money',
  diary: 'personal',
};

/**
 * What setup offers pre-ticked: everything HIPAA would treat as health
 * information, everything about money and the diary, which today is every
 * category.
 * Kept as its own list so a category added later can be offered unticked.
 */
export const VAULT_DEFAULT_CATEGORIES: readonly VaultCategory[] = VAULT_CATEGORIES;

/**
 * Every table a category's records live in. For a records category these
 * are refused while the vault is closed; for a listed category they are
 * only counted (for the offer to set the vault up) and never refused.
 * custom_checkin_tags and custom_flare_contributors are left out on
 * purpose: each is a list to choose from, a tool, not a record.
 */
export const VAULT_TABLES: Record<VaultCategory, readonly string[]> = {
  symptoms: [
    'wellbeing_checkins',
    'checkin_body_regions',
    'checkin_contributors',
    'checkin_tags',
    'symptom_assessments',
    'symptom_assessment_responses',
    'bowel_movements',
    'nocturia_nights',
    'bladder_diaries',
    'bladder_entries',
  ],
  labs: ['lab_results', 'own_lab_tests', 'microbiome_tests', 'microbiome_results', 'health_records'],
  body: ['body_measurements'],
  cycle: ['cycle_days'],
  therapy: ['therapy_sessions'],
  neuro: ['user_neuro_profile'],
  work: ['work_checkins'],
  experiments: ['personal_rules', 'food_trials', 'food_trial_task_links', 'trial_series', 'trial_series_items', 'trial_steps'],
  familyHealth: ['family_member_conditions'],
  medications: ['treatments', 'dose_sites', 'medicine_labels', 'med_barcodes', 'dose_groups', 'dose_group_members'],
  conditions: ['user_conditions', 'user_food_allergies'],
  appointments: [],
  medicalBills: ['finance_medical_bills'],
  finances: [
    'finance_accounts',
    'finance_account_balance_history',
    'finance_entries',
    'finance_recurring',
    'finance_budgets',
    'finance_goals',
    'finance_goal_contributions',
    'finance_goal_costs',
    'finance_networth_snapshots',
    'finance_health_accounts',
    'finance_insurance_plans',
    'work_benefits',
    'interest_pay_worksheets',
    'electricity_bills',
  ],
  // The diaries themselves (their names) are a list to write in, a tool.
  diary: ['diary_entries', 'diary_links', 'diary_drafts'],
};

/** What each category is called where a person reads it. */
export const VAULT_CATEGORY_LABELS: Record<VaultCategory, string> = {
  symptoms: 'Symptoms, flares and check-ins',
  labs: 'Labs, home tests, microbiome and health records',
  body: 'Body measurements',
  cycle: 'Cycle',
  therapy: 'Therapy sessions',
  neuro: 'Neurodivergent profile',
  work: 'Work check-ins',
  experiments: 'Personal rules and food experiments',
  familyHealth: 'Family health history',
  medications: 'Medications and supplements list',
  conditions: 'Conditions and allergies list',
  appointments: 'Appointments',
  medicalBills: 'Medical bills',
  finances: 'Finances',
  diary: 'Diary',
};

/** How a category reads inside a sentence, always plural: "Your cycle records are in the vault." */
export const VAULT_CATEGORY_PHRASES: Record<VaultCategory, string> = {
  symptoms: 'symptoms and check-ins',
  labs: 'labs and health records',
  body: 'body measurements',
  cycle: 'cycle records',
  therapy: 'therapy sessions',
  neuro: 'neurodivergent profile notes',
  work: 'work check-ins',
  experiments: 'personal rules and food experiments',
  familyHealth: 'family health records',
  medications: 'medications and supplements',
  conditions: 'conditions and allergies',
  appointments: 'appointments',
  medicalBills: 'medical bills',
  finances: 'money records',
  diary: 'diary entries',
};

/** "Your cycle records are in the vault." or "These are in the vault: labs and health records; cycle records." */
export function vaultClosedWords(categories: readonly VaultCategory[]): string {
  const phrases = categories.map((c) => VAULT_CATEGORY_PHRASES[c]);
  if (phrases.length === 0) return 'These records are in the vault.';
  if (phrases.length === 1) return `Your ${phrases[0]} are in the vault.`;
  return `These are in the vault: ${phrases.join('; ')}.`;
}

/** One line under each category, saying what stays usable. */
export const VAULT_CATEGORY_NOTES: Partial<Record<VaultCategory, string>> = {
  medications: 'Timing warnings and today’s doses keep working. The list and past doses are what close.',
  conditions: 'Food scoring and allergy cautions keep working. The list, and the conditions named in a report, are what close.',
  appointments: 'Reminders keep coming. The appointments list is what closes.',
};

export function isVaultCategory(value: unknown): value is VaultCategory {
  return typeof value === 'string' && (VAULT_CATEGORIES as readonly string[]).includes(value);
}

/** A saved list of categories, cleaned: known names only, each once, in list order. */
export function cleanCategories(values: readonly unknown[]): VaultCategory[] {
  return VAULT_CATEGORIES.filter((category) => values.includes(category));
}

const RECORD_TABLES: readonly string[] = VAULT_CATEGORIES.filter((c) => VAULT_CATEGORY_KIND[c] === 'records').flatMap(
  (c) => VAULT_TABLES[c],
);

/** Every table that is ever refused, whichever categories are chosen. */
export const ALL_VAULT_TABLES: readonly string[] = RECORD_TABLES;

const TABLE_TO_CATEGORY = new Map<string, VaultCategory>();
for (const category of VAULT_CATEGORIES) {
  if (VAULT_CATEGORY_KIND[category] !== 'records') continue;
  for (const table of VAULT_TABLES[category]) TABLE_TO_CATEGORY.set(table, category);
}

const NAMES = new RegExp(`(?:^|[^A-Za-z0-9_])"?(${ALL_VAULT_TABLES.join('|')})"?(?![A-Za-z0-9_])`, 'gi');

/**
 * Put at the start of a statement a tool has to run whatever the vault says:
 * a personal rule raising its warning, a family member's conditions joining
 * the meal plan. Only files listed in scripts/audit_vault_readers.js may use
 * it, each with its reason.
 */
export const VAULT_TOOL_READ = '/* vault:tool */';

/**
 * The statement with string literals and comments blanked, so a vault
 * table's name inside a quoted value ('lab_results' as a word somebody
 * typed) or a comment is not read as the table. A double-quoted name is an
 * identifier in SQLite and is kept.
 */
export function stripLiteralsAndComments(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** Whether a statement reads rows: SELECT, or WITH ... SELECT. A PRAGMA, a write or a CREATE is not a read. */
export function isReadStatement(sql: string): boolean {
  return /^\s*(SELECT|WITH)\b/i.test(stripLiteralsAndComments(sql));
}

/** Whether a statement carries the tool mark at its start. */
export function isToolRead(sql: string): boolean {
  return sql.trimStart().startsWith(VAULT_TOOL_READ);
}

/** The vault tables a statement names, in the order they appear, without repeats. */
export function vaultTablesIn(sql: string): string[] {
  const found: string[] = [];
  const text = stripLiteralsAndComments(sql);
  NAMES.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NAMES.exec(text)) !== null) {
    const name = match[1].toLowerCase();
    if (!found.includes(name)) found.push(name);
  }
  return found;
}

/** The records categories a statement would read from, or an empty list when it reads nothing in the vault. */
export function vaultCategoriesRead(sql: string): VaultCategory[] {
  if (!isReadStatement(sql)) return [];
  const categories: VaultCategory[] = [];
  for (const table of vaultTablesIn(sql)) {
    const category = TABLE_TO_CATEGORY.get(table);
    if (category && !categories.includes(category)) categories.push(category);
  }
  return categories;
}

export const VAULT_CLOSED_SENTENCE = 'This is in the vault. Open the vault with your code or fingerprint to see it.';

export class VaultClosedError extends Error {
  readonly categories: VaultCategory[];
  constructor(categories: VaultCategory[]) {
    super(VAULT_CLOSED_SENTENCE);
    this.name = 'VaultClosedError';
    this.categories = categories;
  }
}

/** Whether an error is the vault saying it is closed, however it arrived. */
export function isVaultClosedError(error: unknown): boolean {
  return error instanceof VaultClosedError || (error instanceof Error && error.name === 'VaultClosedError');
}

/**
 * The refusal for a statement, or null when it may run: the vault has to be
 * guarding (chosen categories and a code to open them), closed, and the
 * statement a read naming a table in a chosen records category, without the
 * tool mark.
 */
export function vaultRefusal(
  sql: string,
  guarding: boolean,
  vaultOpen: boolean,
  chosen: readonly VaultCategory[],
): VaultClosedError | null {
  if (!guarding || vaultOpen || chosen.length === 0 || isToolRead(sql)) return null;
  const categories = vaultCategoriesRead(sql).filter((category) => chosen.includes(category));
  return categories.length ? new VaultClosedError(categories) : null;
}

// ---------------------------------------------------------------------------
// The vault's own settings (vault.json beside the lock file)
//
// Kept on this device and never in the database, for two reasons: the rule
// deciding whether a read may run cannot itself be a read, and a choice about
// who may see this phone's records belongs to this phone. Changing it on the
// computer changes the computer.

export type VaultCode = {
  kind: 'digits' | 'phrase';
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string };
  /** A random 32 bytes secretboxed under the code, so the right code opens it. */
  check: string;
  failedTries: number;
  lastFailedAt: number;
};

export type VaultSettings = {
  version: 1;
  /** What is in the vault. Empty means nothing is. */
  categories: VaultCategory[];
  /** The vault's own code: used while App Lock is off, and with App Lock on
   *  when separateCode is set. */
  code: VaultCode | null;
  /** With App Lock on, the vault opens with its own code rather than the
   *  App Lock code (Tony, 2026-11-19: "App lock being another code should be
   *  a choice for the user"). Only counts while code is set. */
  separateCode: boolean;
  /** Whether a fingerprint may open it in place of its own code. */
  biometric: boolean;
  /** When the offer to set the vault up was last made, in milliseconds, or 0. */
  offeredAt: number;
  /** The person said Stop Asking. */
  stopOffering: boolean;
  /** The setup question has been asked, whatever was answered. */
  setupAsked: boolean;
  /** Set It Up was pressed on the offer, and setup opens the next time the
   *  app is opened (1.0.67.1: no button on a notification opens the app). */
  setUpWaiting: boolean;
  /** The offer made the moment a first health, money or diary record was saved,
   *  once for each group (direct instruction, 2026-11-14). */
  firstOffered: Record<VaultGroup, boolean>;
  /** How long the app may be put away before the vault closes, used while
   *  App Lock is off. With App Lock on its own choice counts instead
   *  (vaultCloseMinutes). 0 is right away. */
  closeAfterMinutes: VaultCloseMinutes;
};

/** The same four choices App Lock offers (AUTO_LOCK_CHOICES in lib/appLock.ts). */
export const VAULT_CLOSE_CHOICES = [0, 1, 5, 15] as const;
export type VaultCloseMinutes = (typeof VAULT_CLOSE_CHOICES)[number];
export const DEFAULT_VAULT_CLOSE_MINUTES: VaultCloseMinutes = 1;

/**
 * How long the app may be away before the vault closes: App Lock's choice
 * while App Lock is on, so one setting governs both, and the vault's own
 * otherwise.
 */
export function vaultCloseMinutes(appLockMinutes: number | null, settings: VaultSettings): VaultCloseMinutes {
  if (appLockMinutes !== null && (VAULT_CLOSE_CHOICES as readonly number[]).includes(appLockMinutes)) {
    return appLockMinutes as VaultCloseMinutes;
  }
  return settings.closeAfterMinutes;
}

/**
 * Whether coming back closes the vault: away at least the chosen minutes, or
 * any time at all for right away. A clock that went backwards counts as long
 * enough, since the time away is unknown.
 */
export function vaultClosesOnReturn(awaySince: number | null, now: number, minutes: VaultCloseMinutes): boolean {
  if (awaySince === null) return false;
  const away = now - awaySince;
  if (away < 0) return true;
  return away >= minutes * 60_000;
}

export const EMPTY_VAULT_SETTINGS: VaultSettings = {
  version: 1,
  categories: [],
  code: null,
  separateCode: false,
  biometric: false,
  offeredAt: 0,
  stopOffering: false,
  setupAsked: false,
  setUpWaiting: false,
  firstOffered: { health: false, money: false, personal: false },
  closeAfterMinutes: DEFAULT_VAULT_CLOSE_MINUTES,
};

function cleanCode(value: unknown): VaultCode | null {
  if (!value || typeof value !== 'object') return null;
  const c = value as Record<string, unknown>;
  const kdf = c.kdf as Record<string, unknown> | undefined;
  if (c.kind !== 'digits' && c.kind !== 'phrase') return null;
  if (!kdf || kdf.name !== 'scrypt' || typeof kdf.salt !== 'string') return null;
  if (typeof kdf.N !== 'number' || typeof kdf.r !== 'number' || typeof kdf.p !== 'number') return null;
  if (typeof c.check !== 'string' || !c.check) return null;
  return {
    kind: c.kind,
    kdf: { name: 'scrypt', N: kdf.N, r: kdf.r, p: kdf.p, salt: kdf.salt },
    check: c.check,
    failedTries: typeof c.failedTries === 'number' ? c.failedTries : 0,
    lastFailedAt: typeof c.lastFailedAt === 'number' ? c.lastFailedAt : 0,
  };
}

/**
 * The settings in the file, or null when there is no file or it cannot be
 * read. A phase 1 lock file that said vault on, with no vault file yet, is
 * read by the caller as the phase 1 categories (vaultSettingsFromPhaseOne).
 */
export function parseVaultSettings(text: string | null): VaultSettings | null {
  if (!text) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return null;
  return {
    version: 1,
    categories: cleanCategories(Array.isArray(r.categories) ? r.categories : []),
    code: cleanCode(r.code),
    separateCode: r.separateCode === true,
    biometric: r.biometric === true,
    offeredAt: typeof r.offeredAt === 'number' ? r.offeredAt : 0,
    stopOffering: r.stopOffering === true,
    setupAsked: r.setupAsked === true,
    setUpWaiting: r.setUpWaiting === true,
    firstOffered: {
      health: (r.firstOffered as Record<string, unknown> | undefined)?.health === true,
      money: (r.firstOffered as Record<string, unknown> | undefined)?.money === true,
      personal: (r.firstOffered as Record<string, unknown> | undefined)?.personal === true,
    },
    closeAfterMinutes: (VAULT_CLOSE_CHOICES as readonly unknown[]).includes(r.closeAfterMinutes)
      ? (r.closeAfterMinutes as VaultCloseMinutes)
      : DEFAULT_VAULT_CLOSE_MINUTES,
  };
}

export function serializeVaultSettings(settings: VaultSettings): string {
  return JSON.stringify(settings);
}

/** The nine categories phase 1 held, for a phone that switched the vault on before phase 2. */
export const PHASE_ONE_CATEGORIES: readonly VaultCategory[] = [
  'symptoms',
  'labs',
  'body',
  'cycle',
  'therapy',
  'neuro',
  'experiments',
  'medicalBills',
  'familyHealth',
];

export function vaultSettingsFromPhaseOne(): VaultSettings {
  return { ...EMPTY_VAULT_SETTINGS, categories: [...PHASE_ONE_CATEGORIES], setupAsked: true };
}

/** What opens the vault right now: the App Lock code, its own code, or nothing yet. */
export type VaultKey = 'app-lock' | 'own-code' | 'none';

export function vaultKey(appLockOn: boolean, settings: VaultSettings): VaultKey {
  if (settings.code && (!appLockOn || settings.separateCode)) return 'own-code';
  return appLockOn ? 'app-lock' : 'none';
}

/** Whether the vault is closing anything: categories are chosen and something opens it. */
export function vaultGuarding(appLockOn: boolean, settings: VaultSettings): boolean {
  return settings.categories.length > 0 && vaultKey(appLockOn, settings) !== 'none';
}

// ---------------------------------------------------------------------------
// How Lifestead is protected, the four choices (Tony, 2026-11-19: "Yes,
// build it with 4 options"). Each is a pairing of the two things that
// already exist: App Lock, which encrypts the whole file and asks for the
// code when the app opens, and the vault, which keeps the chosen health and
// money records closed while the app is open.

export type ProtectionChoice = 'both' | 'records' | 'app' | 'none';

export const PROTECTION_CHOICES: readonly ProtectionChoice[] = ['both', 'records', 'app', 'none'];

export const PROTECTION_LABELS: Record<ProtectionChoice, string> = {
  both: 'The whole app and the health records',
  records: 'Only the health records',
  app: 'Only the whole app',
  none: 'No lock',
};

export const PROTECTION_NOTES: Record<ProtectionChoice, string> = {
  both: 'Lifestead asks for a code when it opens, and the health and money records you choose stay closed until you open them as well.',
  records: 'Lifestead opens without a code, and the health and money records you choose stay closed until a vault code opens them. The file is not encrypted.',
  app: 'Lifestead asks for a code when it opens, and once it is open everything in it can be seen.',
  none: 'Anyone holding this phone while it is unlocked can open Lifestead and read everything in it.',
};

/** Which of the four is in place now. The vault counts only while it is guarding. */
export function protectionChoice(appLockOn: boolean, settings: VaultSettings): ProtectionChoice {
  const guarding = vaultGuarding(appLockOn, settings);
  if (appLockOn) return guarding ? 'both' : 'app';
  return guarding ? 'records' : 'none';
}

/** One step toward a choice, in the order they must happen so nothing is ever left open with no way to close it. */
export type ProtectionStep =
  | 'chooseRecords'
  | 'chooseVaultCode'
  | 'turnOnAppLock'
  | 'emptyVault'
  | 'turnOffAppLock';

/**
 * What moving from now to the chosen protection takes. Setting a vault code
 * comes before App Lock is turned off, so records in the vault are never
 * left with nothing to close them; App Lock itself is turned on and off on
 * its own screen, since that restarts the app.
 */
export function protectionSteps(appLockOn: boolean, settings: VaultSettings, target: ProtectionChoice): ProtectionStep[] {
  const steps: ProtectionStep[] = [];
  const wantsVault = target === 'both' || target === 'records';
  const wantsLock = target === 'both' || target === 'app';
  if (wantsVault && settings.categories.length === 0) steps.push('chooseRecords');
  if (target === 'records' && !settings.code) steps.push('chooseVaultCode');
  if (!wantsVault && settings.categories.length > 0) steps.push('emptyVault');
  if (wantsLock && !appLockOn) steps.push('turnOnAppLock');
  if (!wantsLock && appLockOn) steps.push('turnOffAppLock');
  return steps;
}

// ---------------------------------------------------------------------------
// The offer to set the vault up later (direct instruction, 2026-10-07)
//
// "If they choose no security, the app should provide a notification once
// every so often to offer to secure the vault later after they build up some
// data for it." Once there are VAULT_OFFER_AFTER_RECORDS records in the
// categories setup would have pre-ticked, and no oftener than every
// VAULT_OFFER_EVERY_DAYS, until the vault is guarding or the person says
// Stop Asking.

export const VAULT_OFFER_AFTER_RECORDS = 20;
export const VAULT_OFFER_EVERY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function shouldOfferVault(
  settings: VaultSettings,
  appLockOn: boolean,
  recordCount: number,
  now: number,
): boolean {
  if (settings.stopOffering) return false;
  if (vaultGuarding(appLockOn, settings)) return false;
  if (recordCount < VAULT_OFFER_AFTER_RECORDS) return false;
  if (settings.offeredAt > now) return true; // a clock that moved backwards
  return now - settings.offeredAt >= VAULT_OFFER_EVERY_DAYS * DAY_MS;
}

// ---------------------------------------------------------------------------
// The offer at the first protected record (direct instruction, 2026-11-14)
//
// "If they choose to wait to set it up then it should be provided to them the
// moment they enter any data that should be protected", and "The offer should
// only come if they haven't already turned them on." Made in the app, right
// after the save, once for the first health record and once for the first
// money record, never while that group's records are already closed behind
// a code, and never after Don't Ask Again. It comes even when setup has not
// reached its security question yet (Tony, 2026-11-18: "Lisa saved a
// supplement and it didn't ask her to setup the code for security"); that
// question is the last one in setup, after medicines are typed in. The
// monthly notification above stays as the fallback.

export type VaultGroup = 'health' | 'money' | 'personal';

const INSERT_TABLE = /^\s*(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO)\s+"?([A-Za-z0-9_]+)"?/i;

const TABLE_TO_ANY_CATEGORY = new Map<string, VaultCategory>();
for (const category of VAULT_CATEGORIES) {
  for (const table of VAULT_TABLES[category]) TABLE_TO_ANY_CATEGORY.set(table, category);
}

/** The vault category a statement adds a row to, or null when it adds nothing the vault holds. */
export function vaultCategoryInserted(sql: string): VaultCategory | null {
  const match = INSERT_TABLE.exec(stripLiteralsAndComments(sql));
  if (!match) return null;
  return TABLE_TO_ANY_CATEGORY.get(match[1].toLowerCase()) ?? null;
}

/** Whether this group's records are already closed behind a code. */
export function vaultGroupGuarded(group: VaultGroup, appLockOn: boolean, settings: VaultSettings): boolean {
  return vaultGuarding(appLockOn, settings) && settings.categories.some((c) => VAULT_CATEGORY_GROUP[c] === group);
}

/** The group to make the offer for after this statement ran, or null for no offer. */
export function firstRecordOfferFor(sql: string, appLockOn: boolean, settings: VaultSettings): VaultGroup | null {
  if (settings.stopOffering) return null;
  const category = vaultCategoryInserted(sql);
  if (!category || /\bdiary_drafts\b/i.test(sql)) return null; // a draft waits for its entry
  const group = VAULT_CATEGORY_GROUP[category];
  if (settings.firstOffered[group]) return null;
  if (vaultGroupGuarded(group, appLockOn, settings)) return null;
  return group;
}

/** What the vault holds once this group is added to it: every earlier choice stays as it was. */
export function categoriesWithGroup(categories: readonly VaultCategory[], group: VaultGroup): VaultCategory[] {
  return VAULT_CATEGORIES.filter((c) => categories.includes(c) || VAULT_CATEGORY_GROUP[c] === group);
}

/**
 * The words of the offer, which say what kind of record and never what it
 * says. Somebody who already has a code is never asked to set one up (Tony,
 * 2026-11-24): the offer is only to put this kind of record behind it.
 */
export function firstRecordOfferText(group: VaultGroup, key: VaultKey): { title: string; message: string } {
  if (key === 'app-lock') {
    return group === 'health'
      ? {
          title: 'Add your health records to the vault?',
          message:
            'They are not in the vault yet. Adding them keeps them closed until you open the vault with the App Lock code you already have. Safety warnings and reminders keep working either way.',
        }
      : group === 'personal'
      ? {
          title: 'Add your diary to the vault?',
          message:
            'It is not in the vault yet. Adding it keeps your entries closed until you open the vault with the App Lock code you already have.',
        }
      : {
          title: 'Add your money records to the vault?',
          message:
            'They are not in the vault yet. Adding them keeps them closed until you open the vault with the App Lock code you already have.',
        };
  }
  if (key === 'own-code') {
    return group === 'health'
      ? {
          title: 'Add your health records to the vault?',
          message:
            'They are not in the vault yet. Adding them keeps them closed until you open the vault with the vault code you already have. Safety warnings and reminders keep working either way.',
        }
      : group === 'personal'
      ? {
          title: 'Add your diary to the vault?',
          message:
            'It is not in the vault yet. Adding it keeps your entries closed until you open the vault with the vault code you already have.',
        }
      : {
          title: 'Add your money records to the vault?',
          message:
            'They are not in the vault yet. Adding them keeps them closed until you open the vault with the vault code you already have.',
        };
  }
  return group === 'health'
    ? {
        title: 'Keep your health records closed?',
        message:
          'You just saved your first health record, and anyone holding this device can open it. Set up a code or fingerprint to keep health and money records closed until you open them. Safety warnings and reminders keep working either way.',
      }
    : group === 'personal'
    ? {
        title: 'Keep your diary closed?',
        message:
          'You just saved your first diary entry, and anyone holding this device can open it. Set up a code or fingerprint to keep your diary closed until you open it.',
      }
    : {
        title: 'Keep your money records closed?',
        message:
          'You just saved your first money record, and anyone holding this device can open it. Set up a code or fingerprint to keep money and health records closed until you open them.',
      };
}

export const FIRST_RECORD_SET_UP_LABEL = 'Set It Up';
export const FIRST_RECORD_ADD_LABEL = 'Add to the Vault';
export const FIRST_RECORD_NOT_NOW_LABEL = 'Not Now';
export const FIRST_RECORD_STOP_LABEL = 'Don’t Ask Again';

/** The offer is shown, never queued, so it carries an id of its own that no reconcile cancels. */
export const VAULT_OFFER_NOTIFICATION_ID = 'inside-story-vault-offer';

/**
 * The tables counted for the offer: one per kind of record, leaving out the
 * rows that only hang off another row (a check-in's body regions, a test's
 * results), so the number it names is a number of things somebody recorded.
 */
export const VAULT_COUNTED_TABLES: readonly string[] = [
  'wellbeing_checkins',
  'symptom_assessments',
  'bowel_movements',
  'nocturia_nights',
  'bladder_entries',
  'lab_results',
  'own_lab_tests',
  'microbiome_tests',
  'health_records',
  'body_measurements',
  'cycle_days',
  'therapy_sessions',
  'personal_rules',
  'food_trials',
  'family_member_conditions',
  'treatments',
  'user_conditions',
  'user_food_allergies',
  'finance_medical_bills',
  'finance_accounts',
  'finance_entries',
  'finance_goals',
  'finance_insurance_plans',
  'work_checkins',
  'work_benefits',
  'electricity_bills',
  'diary_entries',
];

/** The offer arrives in the day, never at night or first thing. */
export function vaultOfferHourOk(at: Date): boolean {
  const hour = at.getHours();
  return hour >= 10 && hour < 20;
}

/** The words of the offer, which name how many records and never what they are. */
export function vaultOfferText(recordCount: number): { title: string; body: string } {
  return {
    title: 'Your vault has no code yet',
    body: `You have ${recordCount} private records anyone holding this phone can open. Set up the vault to keep them closed until your code or fingerprint opens them. Set It Up opens the setup the next time you open Lifestead.`,
  };
}

/**
 * What the person is told when they put a category in the vault and nothing
 * opens it yet (direct instruction, 2026-10-07: "the app should say directly
 * they don't have the security turned on yet, and would they like to turn it
 * on now?").
 */
export const VAULT_NO_CODE_SENTENCE =
  'Your vault has no code yet, so anything you put in it is still open to anyone holding this phone. Turn it on now?';
