// The Diary (1.0.96.2): what a person writes for themselves, on Life. It is
// private. No report reads it, lib/peerRelationships.ts names none of its
// tables, and it is a vault category of its own (lib/vault.ts).
//
// The Health Journal on Signals is the other half and stays a separate
// record: it is written for a doctor. A diary can show those entries on
// their dates, or an entry can point at one of them, and each time it is a
// reference to the one health record, never a copy. Nothing goes the other
// way.
//
// Nothing here reads a person's words for meaning, counts how often they
// write or says they have not.
//
// Pure, so scripts/test_diary.js can check it without a phone.

export const DAILY_DIARY_ID = 'diary_daily';

export type Diary = {
  id: string;
  name: string;
  /** Health Journal entries appear on their dates in this diary. */
  showHealth: boolean;
  retiredAt: string | null;
};

export type DiaryEntry = {
  id: string;
  diaryId: string;
  /** Local wall clock, 'YYYY-MM-DDTHH:mm'. */
  happenedAt: string;
  body: string;
  isLifeEvent: boolean;
  lifeEventLabel: string | null;
};

export type DiaryLinkKind = 'person' | 'interest' | 'garden' | 'condition' | 'project' | 'health';

export type DiaryLink = {
  id: string;
  entryId: string;
  kind: DiaryLinkKind;
  targetId: string;
  /** The name it had when it was linked, so a link to something removed still reads. */
  label: string;
};

/** A Health Journal entry, as the Diary shows it: a reference, never a copy. */
export type HealthLine = { id: string; loggedAt: string; words: string };

/** What is being written, kept on this device until it is saved. */
export type DiaryDraft = {
  entryId: string;
  /** True for a new entry, whose photos go with it if it is let go. */
  isNew: boolean;
  diaryId: string;
  happenedAt: string;
  body: string;
  isLifeEvent: boolean;
  lifeEventLabel: string;
  links: { kind: DiaryLinkKind; targetId: string; label: string }[];
};

export const LINK_KIND_LABELS: Record<Exclude<DiaryLinkKind, 'health'>, string> = {
  person: 'A person',
  interest: 'An interest',
  garden: 'A garden area',
  condition: 'A condition',
  project: 'A project',
};

const FIRST_LINE_LENGTH = 90;

/** The first line with any words in it, shortened on a whole word. */
export function firstLine(body: string, max = FIRST_LINE_LENGTH): string {
  const line = body.split(/\r?\n/).map((part) => part.trim()).find((part) => part.length > 0) ?? '';
  if (line.length <= max) return line;
  const cut = line.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '') + '…';
}

/** What one entry is called in a list: its event, else its first line. */
export function entryTitle(entry: Pick<DiaryEntry, 'body' | 'isLifeEvent' | 'lifeEventLabel'>): string {
  if (entry.isLifeEvent && entry.lifeEventLabel?.trim()) return entry.lifeEventLabel.trim();
  return firstLine(entry.body);
}

export function newestFirst<T extends { happenedAt: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
}

/** Entries from this day in earlier years, newest first. */
export function onThisDay<T extends { happenedAt: string }>(entries: readonly T[], today: string): T[] {
  return newestFirst(
    entries.filter((entry) => entry.happenedAt.slice(5, 10) === today.slice(5, 10) && entry.happenedAt.slice(0, 4) < today.slice(0, 4)),
  );
}

function plain(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Entries holding every word typed, whatever the accents and capitals. */
export function findByWords<T extends { body: string; lifeEventLabel: string | null }>(entries: readonly T[], words: string): T[] {
  const wanted = plain(words).split(/\s+/).filter(Boolean);
  if (wanted.length === 0) return [...entries];
  return entries.filter((entry) => {
    const text = plain(`${entry.lifeEventLabel ?? ''} ${entry.body}`);
    return wanted.every((word) => text.includes(word));
  });
}

export function isDay(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** The list from that day back: the day itself and everything before it. */
export function fromDayBack<T extends { happenedAt: string }>(entries: readonly T[], day: string): T[] {
  return newestFirst(entries).filter((entry) => entry.happenedAt.slice(0, 10) <= day);
}

/** The entries either side of one, in the diary it is in. */
export function neighbours<T extends { id: string; happenedAt: string }>(
  entries: readonly T[],
  id: string,
): { earlier: T | null; later: T | null } {
  const ordered = newestFirst(entries);
  const at = ordered.findIndex((entry) => entry.id === id);
  if (at < 0) return { earlier: null, later: null };
  return { earlier: ordered[at + 1] ?? null, later: at > 0 ? ordered[at - 1] : null };
}

/**
 * What letting a diary go means. One with entries is put away and can come
 * back; only an empty one is deleted, and never Daily, which every device
 * starts with. The last diary in use stays.
 */
export function letGoOfDiary(
  diary: Diary,
  entryCount: number,
  inUse: number,
): { action: 'refuse'; why: string } | { action: 'retire' } | { action: 'delete' } {
  if (inUse <= 1) return { action: 'refuse', why: 'This is the only diary in use. Add another one first, then put this one away.' };
  if (entryCount > 0 || diary.id === DAILY_DIARY_ID) return { action: 'retire' };
  return { action: 'delete' };
}

/** Why a diary cannot take this name, or null when it can. */
export function diaryNameProblem(name: string, others: readonly Diary[]): string | null {
  const wanted = name.trim();
  if (!wanted) return 'Give the diary a name first.';
  if (others.some((other) => plain(other.name) === plain(wanted))) return 'You already have a diary with that name.';
  return null;
}

/** Why an entry cannot be saved yet, or null when it can. */
export function entryProblem(draft: Pick<DiaryDraft, 'body' | 'isLifeEvent' | 'lifeEventLabel' | 'happenedAt'>, hasFiles: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(draft.happenedAt) || !isDay(draft.happenedAt.slice(0, 10))) {
    return 'Choose a date and a time for this entry first.';
  }
  if (draft.isLifeEvent && !draft.lifeEventLabel.trim()) return 'Say what the life event was, in a few words, so Trends can name it.';
  if (!draft.body.trim() && !hasFiles && !draft.isLifeEvent) return 'Write something, or add a photo or a recording, then save.';
  return null;
}

/** One line in a diary's list: an entry of its own, or a health reference. */
export type DiaryRow = { kind: 'entry'; entry: DiaryEntry; happenedAt: string } | { kind: 'health'; health: HealthLine; happenedAt: string };

/** A diary's entries with the Health Journal on its dates, when asked for. */
export function diaryRows(entries: readonly DiaryEntry[], health: readonly HealthLine[], showHealth: boolean): DiaryRow[] {
  const rows: DiaryRow[] = entries.map((entry) => ({ kind: 'entry', entry, happenedAt: entry.happenedAt }));
  if (showHealth) rows.push(...health.map((line): DiaryRow => ({ kind: 'health', health: line, happenedAt: line.loggedAt.slice(0, 16) })));
  return newestFirst(rows);
}

/** Diary entries on the flare days or up to `days` before one, newest first,
 *  for Pattern Finder to list beside sleep and treatment. Never a cause. */
export function entriesNearDays(entries: readonly DiaryEntry[], flareDays: readonly string[], days: number): DiaryEntry[] {
  const wanted = new Set<string>();
  for (const day of flareDays) {
    const [year, month, date] = day.slice(0, 10).split('-').map(Number);
    for (let back = 0; back <= days; back += 1) {
      const at = new Date(Date.UTC(year, month - 1, date - back));
      wanted.add(at.toISOString().slice(0, 10));
    }
  }
  return newestFirst(entries.filter((entry) => wanted.has(entry.happenedAt.slice(0, 10))));
}

/** Every life event as a day and a name, for the lines on Trends charts. */
export function lifeEvents(entries: readonly DiaryEntry[]): { id: string; day: string; label: string }[] {
  return entries
    .filter((entry) => entry.isLifeEvent)
    .map((entry) => ({ id: entry.id, day: entry.happenedAt.slice(0, 10), label: entryTitle(entry) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

// --- The exported page ----------------------------------------------------

export type ExportEntry = {
  happenedAt: string;
  diaryName: string;
  title: string | null;
  body: string;
  about: string[];
  /** data: URIs, so the page opens with nothing installed and no network. */
  photos: { uri: string; caption: string | null }[];
  sounds: { uri: string; name: string }[];
};

export type ExportWords = {
  about: string;
  sound: string;
  health: string;
  /** A recording named where the page cannot play one, in a PDF. */
  soundKept: (name: string) => string;
  when: (happenedAt: string) => string;
};

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The whole page, oldest first, the way a diary reads. Health lines are in
 *  it only when the person asked for them. */
export function diaryPage(
  title: string,
  entries: readonly ExportEntry[],
  health: readonly HealthLine[],
  forPaper: boolean,
  words: ExportWords,
  language: string,
): string {
  const parts = [
    ...entries.map((entry) => ({ at: entry.happenedAt, html: entryHtml(entry, forPaper, words) })),
    ...health.map((line) => ({
      at: line.loggedAt.slice(0, 16),
      html: `<section class="health"><h2>${escapeHtml(words.when(line.loggedAt.slice(0, 16)))}</h2><p>${escapeHtml(`${words.health}: ${line.words}`)}</p></section>`,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return `<!doctype html><html lang="${escapeHtml(language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>
body{font-family:Georgia,serif;max-width:42rem;margin:0 auto;padding:2rem 1.25rem;color:#222;background:#fff;line-height:1.6}
h1{font-size:1.8rem}h2{font-size:1.05rem;margin:0 0 .4rem;color:#555}h3{font-size:1.2rem;margin:0 0 .4rem}
section{border-top:1px solid #ccc;padding:1.2rem 0;page-break-inside:avoid}.health{color:#555;font-size:.95rem}
p{margin:0 0 .6rem;white-space:pre-wrap}img{max-width:100%;max-height:60vh;display:block;margin:.6rem 0}figure{margin:0}figcaption,.about{font-size:.9rem;color:#555}audio{width:100%}
</style></head><body><h1>${escapeHtml(title)}</h1>${parts.map((part) => part.html).join('')}</body></html>`;
}

function entryHtml(entry: ExportEntry, forPaper: boolean, words: ExportWords): string {
  const photos = entry.photos
    .map((photo) => `<figure><img src="${escapeHtml(photo.uri)}" alt="${escapeHtml(photo.caption ?? '')}">${photo.caption ? `<figcaption>${escapeHtml(photo.caption)}</figcaption>` : ''}</figure>`)
    .join('');
  const sounds = entry.sounds
    .map((sound) =>
      forPaper
        ? `<p class="about">${escapeHtml(words.soundKept(sound.name))}</p>`
        : `<p class="about">${escapeHtml(`${words.sound}: ${sound.name}`)}</p><audio controls src="${escapeHtml(sound.uri)}"></audio>`,
    )
    .join('');
  const about = entry.about.length ? `<p class="about">${escapeHtml(`${words.about}: ${entry.about.join(', ')}`)}</p>` : '';
  return `<section><h2>${escapeHtml(`${words.when(entry.happenedAt)} · ${entry.diaryName}`)}</h2>${entry.title ? `<h3>${escapeHtml(entry.title)}</h3>` : ''}${entry.body.trim() ? `<p>${escapeHtml(entry.body.trim())}</p>` : ''}${photos}${sounds}${about}</section>`;
}

/** A draft read back, or null when what was kept cannot be read. */
export function parseDraft(payload: string): DiaryDraft | null {
  try {
    const value = JSON.parse(payload) as Partial<DiaryDraft>;
    if (!value || typeof value.entryId !== 'string' || typeof value.diaryId !== 'string' || typeof value.body !== 'string' || typeof value.happenedAt !== 'string') return null;
    return {
      entryId: value.entryId,
      isNew: value.isNew === true,
      diaryId: value.diaryId,
      happenedAt: value.happenedAt,
      body: value.body,
      isLifeEvent: value.isLifeEvent === true,
      lifeEventLabel: typeof value.lifeEventLabel === 'string' ? value.lifeEventLabel : '',
      links: Array.isArray(value.links) ? value.links : [],
    };
  } catch {
    return null;
  }
}
