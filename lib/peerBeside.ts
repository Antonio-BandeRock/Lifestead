// What a partner shares about themselves, shown beside your own (1.0.80.3).
//
// Direct instruction, 2026-11-03: when each partner has shared whatever they
// are going to share, "it appears along side their own of whatever that thing
// is, unless it is taken away." So their meds sit under yours on My Meds,
// their emergency card under yours on Emergency, their appointments under
// yours, and their accounts, budgets and insurance under yours on Finances,
// read only and under their name.
//
// Each kind is a COPY, the way conditions and doses already travel
// (lib/partnerSync.ts): their latest send is their state, it lands in
// peer_beside keyed by the link, and it never touches a table of yours.
// Every kind they have switched off goes as null, so taking one away clears
// this phone's copy on the next send rather than leaving last week's on it.
// A kind missing from the payload altogether came from an older phone and
// leaves whatever is held alone.
//
// Pure, so scripts/test_peer_beside.js runs it in plain node. Reading and
// storing are lib/peerBesideDb.ts.

import { accountKind } from './financeAccounts';

export type BesideKind = 'meds' | 'emergency' | 'appointments' | 'accounts' | 'budgets' | 'insurance';

export const BESIDE_KINDS: readonly BesideKind[] = ['meds', 'emergency', 'appointments', 'accounts', 'budgets', 'insurance'];

export type BesideMed = { name: string; kind: string; amount: string | null; frequency: string | null; times: string[] };

export type BesideContact = { name: string; relationship: string | null; phone: string; primary: boolean };

export type BesideEmergency = {
  drugAllergies: string | null;
  bloodType: string | null;
  devices: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  hospital: string | null;
  language: string | null;
  directiveLocation: string | null;
  contacts: BesideContact[];
};

export type BesideAppointment = {
  when: string;
  title: string;
  type: string | null;
  provider: string | null;
  place: string | null;
  status: string;
};

export type BesideAccount = {
  name: string;
  kind: string;
  balance: number;
  apr: number | null;
  minimumPayment: number | null;
};

export type BesideBudgets = {
  budgets: { category: string; monthlyLimit: number }[];
  goals: { name: string; reason: string | null; targetDate: string | null; status: string }[];
};

export type BesideInsurance = {
  plans: { name: string; yearStart: string; deductible: number | null; outOfPocketMax: number | null }[];
  healthAccounts: { kind: string; planYear: string; contributed: number; spent: number; deadline: string | null }[];
};

export type BesideBodies = {
  meds: BesideMed[];
  emergency: BesideEmergency;
  appointments: BesideAppointment[];
  accounts: BesideAccount[];
  budgets: BesideBudgets;
  insurance: BesideInsurance;
};

/** One kind as it travels: the body, or null for switched off. */
export type BesidePart = { [K in BesideKind]?: BesideBodies[K] | null };

/** The most of any one list that travels, so one send stays small. */
export const BESIDE_LIST_LIMIT = 200;

const TEXT_LIMIT = 400;

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, TEXT_LIMIT) : null;
}

function needText(value: unknown): string | null {
  return text(value);
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function list<T>(value: unknown, clean: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value.slice(0, BESIDE_LIST_LIMIT)) {
    const kept = item && typeof item === 'object' ? clean(item) : null;
    if (kept) out.push(kept);
  }
  return out;
}

const TIME_SHAPE = /^\d{2}:\d{2}$/;

function cleanMed(raw: unknown): BesideMed | null {
  const r = raw as Record<string, unknown>;
  const name = needText(r.name);
  if (!name) return null;
  const times = Array.isArray(r.times)
    ? [...new Set(r.times.filter((t): t is string => typeof t === 'string' && TIME_SHAPE.test(t)))].sort().slice(0, 12)
    : [];
  return { name, kind: text(r.kind) ?? 'medication', amount: text(r.amount), frequency: text(r.frequency), times };
}

function cleanContact(raw: unknown): BesideContact | null {
  const r = raw as Record<string, unknown>;
  const name = needText(r.name);
  const phone = needText(r.phone);
  if (!name || !phone) return null;
  return { name, relationship: text(r.relationship), phone, primary: r.primary === true };
}

function cleanEmergency(raw: unknown): BesideEmergency | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    drugAllergies: text(r.drugAllergies),
    bloodType: text(r.bloodType),
    devices: text(r.devices),
    doctorName: text(r.doctorName),
    doctorPhone: text(r.doctorPhone),
    hospital: text(r.hospital),
    language: text(r.language),
    directiveLocation: text(r.directiveLocation),
    contacts: list(r.contacts, cleanContact),
  };
}

const WHEN_SHAPE = /^\d{4}-\d{2}-\d{2}/;

function cleanAppointment(raw: unknown): BesideAppointment | null {
  const r = raw as Record<string, unknown>;
  const when = typeof r.when === 'string' && WHEN_SHAPE.test(r.when) ? r.when.slice(0, 32) : null;
  const title = needText(r.title);
  if (!when || !title) return null;
  return { when, title, type: text(r.type), provider: text(r.provider), place: text(r.place), status: text(r.status) ?? 'planned' };
}

function cleanAccount(raw: unknown): BesideAccount | null {
  const r = raw as Record<string, unknown>;
  const name = needText(r.name);
  if (!name) return null;
  return { name, kind: text(r.kind) ?? 'other', balance: num(r.balance) ?? 0, apr: num(r.apr), minimumPayment: num(r.minimumPayment) };
}

function cleanBudgets(raw: unknown): BesideBudgets | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    budgets: list(r.budgets, (item) => {
      const b = item as Record<string, unknown>;
      const category = needText(b.category);
      const monthlyLimit = num(b.monthlyLimit);
      return category && monthlyLimit !== null ? { category, monthlyLimit } : null;
    }),
    goals: list(r.goals, (item) => {
      const g = item as Record<string, unknown>;
      const name = needText(g.name);
      return name ? { name, reason: text(g.reason), targetDate: text(g.targetDate), status: text(g.status) ?? 'active' } : null;
    }),
  };
}

function cleanInsurance(raw: unknown): BesideInsurance | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  return {
    plans: list(r.plans, (item) => {
      const p = item as Record<string, unknown>;
      const name = needText(p.name);
      const yearStart = needText(p.yearStart);
      return name && yearStart ? { name, yearStart, deductible: num(p.deductible), outOfPocketMax: num(p.outOfPocketMax) } : null;
    }),
    healthAccounts: list(r.healthAccounts, (item) => {
      const h = item as Record<string, unknown>;
      const kind = needText(h.kind);
      const planYear = needText(h.planYear);
      return kind && planYear
        ? { kind, planYear, contributed: num(h.contributed) ?? 0, spent: num(h.spent) ?? 0, deadline: text(h.deadline) }
        : null;
    }),
  };
}

const CLEANERS: { [K in BesideKind]: (raw: unknown) => BesideBodies[K] | null } = {
  meds: (raw) => (Array.isArray(raw) ? list(raw, cleanMed) : null),
  emergency: cleanEmergency,
  appointments: (raw) => (Array.isArray(raw) ? list(raw, cleanAppointment) : null),
  accounts: (raw) => (Array.isArray(raw) ? list(raw, cleanAccount) : null),
  budgets: cleanBudgets,
  insurance: cleanInsurance,
};

/**
 * A received part, read back without trusting any of it. Undefined when the
 * payload carried none (an older phone); otherwise every kind present is
 * either its cleaned body or null, and a body that does not read is null too,
 * which clears rather than keeps a copy nobody can vouch for.
 */
export function cleanBesidePart(value: unknown): BesidePart | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const out: BesidePart = {};
  for (const kind of BESIDE_KINDS) {
    if (!(kind in raw)) continue;
    const cell = raw[kind];
    (out as Record<BesideKind, unknown>)[kind] = cell === null ? null : CLEANERS[kind](cell);
  }
  return out;
}

/**
 * What goes, cut down to the switches. A kind switched off goes as null, so
 * the other phone clears it. A kind switched on goes as its body, even when
 * that is empty, since an emptied list is news too. A kind switched on that
 * could not be read this time (the vault closed, say) is left out, so the
 * other phone keeps the copy it has rather than losing it to a locked door.
 */
export function besidePartToSend(granted: Record<BesideKind, boolean>, read: Partial<BesideBodies>): BesidePart {
  const out: BesidePart = {};
  for (const kind of BESIDE_KINDS) {
    if (!granted[kind]) {
      (out as Record<BesideKind, unknown>)[kind] = null;
      continue;
    }
    const body = read[kind];
    if (body === undefined) continue;
    (out as Record<BesideKind, unknown>)[kind] = CLEANERS[kind](body);
  }
  return out;
}

/** Whether a kind's body holds anything worth a heading. */
export function besideHasAnything<K extends BesideKind>(kind: K, body: BesideBodies[K] | null | undefined): boolean {
  if (!body) return false;
  if (Array.isArray(body)) return body.length > 0;
  if (kind === 'emergency') {
    const e = body as BesideEmergency;
    return e.contacts.length > 0 || Object.entries(e).some(([key, value]) => key !== 'contacts' && typeof value === 'string' && value.length > 0);
  }
  if (kind === 'budgets') {
    const b = body as BesideBudgets;
    return b.budgets.length > 0 || b.goals.length > 0;
  }
  const i = body as BesideInsurance;
  return i.plans.length > 0 || i.healthAccounts.length > 0;
}

/** The heading over their side of a lens, in English for t(). */
export const BESIDE_HEADING = '{name} shared';

type Words = (english: string, values?: Record<string, string>) => string;
const asIs: Words = (english, values) =>
  english.replace(/{(\w+)}/g, (whole, key: string) => values?.[key] ?? whole);

/** The caption under it, naming how fresh the copy is. */
export function besideFreshness(sentAt: string, today: string, words: Words = asIs): string {
  const day = sentAt.slice(0, 10);
  if (!WHEN_SHAPE.test(day)) return words('Read only, from their phone.');
  if (day === today) return words('Read only, sent from their phone today.');
  return words('Read only, sent from their phone on {day}.', { day });
}

export type BesideRow = { title: string; caption: string | null };

const MED_KIND_WORDS: Record<string, string> = {
  prescription: 'Prescription',
  otc: 'Over the counter',
  supplement: 'Supplement',
};


const HEALTH_ACCOUNT_WORDS: Record<string, string> = { hsa: 'HSA', fsa: 'FSA' };

function joined(parts: (string | null | undefined)[]): string | null {
  const kept = parts.filter((part): part is string => typeof part === 'string' && part.length > 0);
  return kept.length ? kept.join(', ') : null;
}

/**
 * The lines one partner's copy draws as, read only. `money` formats an
 * amount the way the screen it sits on does; `words` is t().
 */
export function besideRows<K extends BesideKind>(
  kind: K,
  body: BesideBodies[K],
  money: (amount: number) => string,
  words: Words = asIs,
): BesideRow[] {
  if (kind === 'meds') {
    return (body as BesideMed[]).map((med) => ({
      title: med.name,
      caption: joined([
        MED_KIND_WORDS[med.kind] ? words(MED_KIND_WORDS[med.kind]) : null,
        med.amount,
        med.frequency,
        med.times.length ? words('at {times}', { times: med.times.join(', ') }) : null,
      ]),
    }));
  }
  if (kind === 'emergency') {
    const e = body as BesideEmergency;
    const rows: BesideRow[] = [];
    const facts: [string, string | null][] = [
      ['Drug allergies', e.drugAllergies],
      ['Blood type', e.bloodType],
      ['Devices or implants', e.devices],
      ['Doctor', joined([e.doctorName, e.doctorPhone])],
      ['Hospital', e.hospital],
      ['Language', e.language],
      ['Advance directive', e.directiveLocation],
    ];
    for (const [label, value] of facts) if (value) rows.push({ title: words(label), caption: value });
    for (const contact of e.contacts) {
      rows.push({
        title: contact.primary ? words('{name}, first to call', { name: contact.name }) : contact.name,
        caption: joined([contact.relationship, contact.phone]),
      });
    }
    return rows;
  }
  if (kind === 'appointments') {
    return (body as BesideAppointment[]).map((appointment) => ({
      title: appointment.title,
      caption: joined([
        appointment.when.length >= 16 ? `${appointment.when.slice(0, 10)} ${appointment.when.slice(11, 16)}` : appointment.when.slice(0, 10),
        appointment.provider,
        appointment.place,
      ]),
    }));
  }
  if (kind === 'accounts') {
    return (body as BesideAccount[]).map((account) => ({
      title: account.name,
      caption: joined([
        accountKind(account.kind) ? words(accountKind(account.kind)!.label) : null,
        money(account.balance),
        account.apr != null ? words('{apr}% APR', { apr: String(account.apr) }) : null,
        account.minimumPayment != null ? words('{amount} minimum', { amount: money(account.minimumPayment) }) : null,
      ]),
    }));
  }
  if (kind === 'budgets') {
    const b = body as BesideBudgets;
    return [
      ...b.budgets.map((budget) => ({ title: budget.category, caption: words('{amount} a month', { amount: money(budget.monthlyLimit) }) })),
      ...b.goals.map((goal) => ({
        title: goal.name,
        caption: joined([goal.reason, goal.targetDate ? words('by {day}', { day: goal.targetDate }) : null]),
      })),
    ];
  }
  const i = body as BesideInsurance;
  return [
    ...i.plans.map((plan) => ({
      title: plan.name,
      caption: joined([
        words('year from {day}', { day: plan.yearStart }),
        plan.deductible != null ? words('{amount} deductible', { amount: money(plan.deductible) }) : null,
        plan.outOfPocketMax != null ? words('{amount} out of pocket at most', { amount: money(plan.outOfPocketMax) }) : null,
      ]),
    })),
    ...i.healthAccounts.map((account) => ({
      title: `${HEALTH_ACCOUNT_WORDS[account.kind] ?? account.kind} ${account.planYear}`,
      caption: joined([
        words('{amount} put in', { amount: money(account.contributed) }),
        words('{amount} spent', { amount: money(account.spent) }),
        account.deadline ? words('use by {day}', { day: account.deadline }) : null,
      ]),
    })),
  ];
}

/** The fold's name for one partner's copy of a kind. */
export const BESIDE_TITLES: Record<BesideKind, string> = {
  meds: "{name}'s meds and supplements",
  emergency: "{name}'s emergency card",
  appointments: "{name}'s appointments",
  accounts: "{name}'s accounts",
  budgets: "{name}'s budgets and goals",
  insurance: "{name}'s insurance and health accounts",
};
