// Where a person on a list came from (2026-11-02): typed in by hand, or
// picked from the phone's contacts, and then which account on the phone
// holds them, Google, WhatsApp, Signal and the rest. The app fills it in and
// the person never types it, because it is a fact about the record rather
// than something to remember.
//
// Android keeps one contact as several raw contacts, one per account that
// knows the person, so a single pick can come from Google, WhatsApp and
// Signal at once. modules/contact-accounts reads those account types for the
// one contact picked; a binary built before it has no way to tell, and the
// record says only that it came from the phone's contacts. Stored as a comma
// list of the keys below, in this order, so two picks of the same person
// always read the same.
//
// Pure, so scripts/test_contact_pick.js checks it.

export type ContactSourceKey =
  | 'typed'
  | 'contacts'
  | 'phone'
  | 'sim'
  | 'google'
  | 'whatsapp'
  | 'signal'
  | 'telegram'
  | 'outlook'
  | 'samsung'
  | 'other';

// The name each key reads as. Account names are the apps' names and stay as
// they are in every language.
const NAMES: Record<ContactSourceKey, string> = {
  typed: 'typed in by hand',
  contacts: "the phone's contacts",
  phone: 'kept on the phone only',
  sim: 'the SIM card',
  google: 'Google',
  whatsapp: 'WhatsApp',
  signal: 'Signal',
  telegram: 'Telegram',
  outlook: 'Outlook',
  samsung: 'Samsung account',
  other: 'another account',
};

const ORDER: ContactSourceKey[] = ['google', 'whatsapp', 'signal', 'telegram', 'outlook', 'samsung', 'sim', 'phone', 'other', 'contacts', 'typed'];

// Android account types, exactly as the apps register them.
const ACCOUNT_TYPES: Record<string, ContactSourceKey> = {
  'com.google': 'google',
  'com.whatsapp': 'whatsapp',
  'com.whatsapp.w4b': 'whatsapp',
  'org.thoughtcrime.securesms': 'signal',
  'org.telegram.messenger': 'telegram',
  'org.telegram.messenger.web': 'telegram',
  'com.microsoft.office.outlook': 'outlook',
  'com.microsoft.office.outlook.USER_ACCOUNT': 'outlook',
  'com.android.exchange': 'outlook',
  'com.google.android.gm.exchange': 'outlook',
  'com.osp.app.signin': 'samsung',
};

export function accountKey(type: string | null | undefined): ContactSourceKey {
  const t = (type ?? '').trim();
  // No account at all is a contact saved on the phone itself, and each
  // maker names that local store differently.
  if (!t) return 'phone';
  if (ACCOUNT_TYPES[t]) return ACCOUNT_TYPES[t];
  if (/sim/i.test(t)) return 'sim';
  if (/phone|local|device/i.test(t)) return 'phone';
  return 'other';
}

// The stored value for a pick. null means the phone could not say which
// accounts (a binary without the module, or the read failed), which is still
// truthfully the phone's contacts.
export function sourceFromAccountTypes(types: readonly (string | null)[] | null | undefined): string {
  if (!types || types.length === 0) return 'contacts';
  const keys = new Set(types.map(accountKey));
  return ORDER.filter((key) => keys.has(key)).join(',');
}

export const TYPED_SOURCE = 'typed';

// The names a stored value reads as, in order; empty for a row saved before
// the app kept this, which says nothing rather than guessing.
export function contactSourceNames(source: string | null | undefined): string[] {
  if (!source) return [];
  const keys = source.split(',').map((part) => part.trim()).filter((part): part is ContactSourceKey => part in NAMES);
  return ORDER.filter((key) => keys.includes(key)).map((key) => NAMES[key]);
}
