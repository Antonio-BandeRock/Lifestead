// Interests > Library and People & Places (2026-10-30, Interests stage 4).
//
// Library holds what is read, watched, taken or followed for an interest: a
// book, a channel, a course, a magazine, a page kept from Capture. Each has a
// status (to read or watch, going through it, following, finished) and
// where the person left off. People & Places holds who and where an interest
// happens with: the friend who does it too, a teacher, a club, a shop, a
// show, a place to go.
//
// A kind on either is the person's words. The built-in kinds are offered as
// pills beside the person's earlier ones, so the list is open and there is no
// list entry to remove or orphan.
//
// Nothing here rates a book, counts how much was read as an achievement, or
// ranks one person or place against another. Something no longer part of an
// interest is kept under No Longer Part of It with everything it had.
// scripts/test_interest_library.js checks every sentence here.
//
// Pure: lib/interestLibraryDb.ts reads and writes.

import { formatStartedOn } from './interests';

export type LibraryStatus = 'want' | 'going' | 'following' | 'done';
export const LIBRARY_STATUSES: LibraryStatus[] = ['going', 'want', 'following', 'done'];

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  want: 'To Read or Watch',
  going: 'Going Through It',
  following: 'Following',
  done: 'Finished',
};

export type LibraryEntry = {
  id: string;
  interestId: string;
  /** The person's words: a book, a channel, a course. */
  kind: string | null;
  title: string;
  /** Who wrote, made or runs it. */
  byWhom: string | null;
  link: string | null;
  status: LibraryStatus;
  /** Page 120, episode 4, chapter 3. */
  leftOff: string | null;
  about: string | null;
  /** When it came out, as exactly as known: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'. */
  published: string | null;
  /** The local day it was marked Finished. */
  doneOn: string | null;
  /** The Capture note a read page came from. */
  fromNoteId: string | null;
  retiredAt: string | null;
  createdAt: string;
};

export type InterestPerson = {
  id: string;
  interestId: string;
  /** The person's words: a friend, a teacher, a club, a shop. */
  kind: string | null;
  name: string;
  /** How to reach them: a phone number, an email, a site, a meeting night. */
  reach: string | null;
  /** Where: an address, a town, a field. */
  place: string | null;
  about: string | null;
  retiredAt: string | null;
  createdAt: string;
};

/** Offered as pills before the person's own kinds. */
export const LIBRARY_KINDS = ['A book', 'An article', 'A video', 'A channel', 'A course', 'A podcast', 'A magazine', 'A website'];
export const PEOPLE_KINDS = ['A friend', 'A teacher', 'A club or group', 'A shop or supplier', 'A show or event', 'A place to go'];

export function readLibraryStatus(status: string | null | undefined): LibraryStatus {
  return status === 'going' || status === 'following' || status === 'done' ? status : 'want';
}

/**
 * The kinds to offer: the built-ins, then any the person has typed before
 * that are not built-ins, alphabetically. Matching ignores case.
 */
export function kindChoices(builtIn: readonly string[], used: readonly (string | null)[]): string[] {
  const known = new Set(builtIn.map((kind) => kind.toLowerCase()));
  const theirs = [...new Set(used.filter((kind): kind is string => !!kind && !known.has(kind.toLowerCase())))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  return [...builtIn, ...theirs];
}

/** "1 thing to read or watch", "3 people and places". */
export function countLibrary(n: number): string {
  return n === 1 ? '1 thing in the library' : `${n} things in the library`;
}

export function countPeople(n: number): string {
  return n === 1 ? '1 person or place' : `${n} people and places`;
}

/** The site a link is on, for a caption: "youtube.com". */
export function linkSite(address: string): string {
  const match = /^[a-z]+:\/\/(?:www\.)?([^/?#]+)/i.exec(address.trim());
  return match ? match[1].toLowerCase() : address.trim();
}

/** The caption under a library entry's title, empty parts left out. */
export function describeLibraryLine(entry: LibraryEntry): string {
  const parts: string[] = [];
  if (entry.kind) parts.push(entry.kind);
  if (entry.byWhom) parts.push(`by ${entry.byWhom}`);
  if (entry.published) parts.push(formatStartedOn(entry.published));
  if (entry.link) parts.push(linkSite(entry.link));
  return parts.join(' · ');
}

/** Where the person left off, or when it was finished. */
export function describeLibraryProgress(entry: LibraryEntry): string | null {
  if (entry.status === 'done') return entry.doneOn ? `Finished ${formatStartedOn(entry.doneOn)}` : 'Finished';
  if (entry.leftOff) return `Left off at ${entry.leftOff}`;
  return null;
}

/** The caption under a person or place's name. */
export function describePersonLine(person: InterestPerson): string {
  return [person.kind, person.place, person.reach].filter(Boolean).join(' · ');
}

/** What is said back after a status change. */
export function describeStatusChange(title: string, status: LibraryStatus): string {
  if (status === 'done') return `${title} is under Finished, dated today.`;
  return `${title} is under ${LIBRARY_STATUS_LABELS[status]}.`;
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export type LibraryGroup = {
  interestId: string;
  interestName: string;
  /** In the order Going Through It, To Read or Watch, Following, Finished; empty ones left out. */
  statuses: { status: LibraryStatus; entries: LibraryEntry[] }[];
  count: number;
};

/**
 * Library entries grouped by interest (alphabetically) and then by status.
 * Inside a status, titles alphabetically, except Finished, newest first.
 * Entries no longer part of an interest are left out; see retiredLibrary.
 */
export function groupLibrary(entries: readonly LibraryEntry[], interestName: (id: string) => string): LibraryGroup[] {
  const groups = new Map<string, LibraryEntry[]>();
  for (const entry of entries) {
    if (entry.retiredAt) continue;
    const list = groups.get(entry.interestId) ?? [];
    list.push(entry);
    groups.set(entry.interestId, list);
  }
  return [...groups.entries()]
    .map(([interestId, list]) => ({
      interestId,
      interestName: interestName(interestId),
      count: list.length,
      statuses: LIBRARY_STATUSES.map((status) => ({
        status,
        entries: list
          .filter((entry) => entry.status === status)
          .sort((a, b) =>
            status === 'done' ? (b.doneOn ?? '').localeCompare(a.doneOn ?? '') || byText(a.title, b.title) : byText(a.title, b.title),
          ),
      })).filter((part) => part.entries.length > 0),
    }))
    .sort((a, b) => byText(a.interestName, b.interestName));
}

export function retiredLibrary(entries: readonly LibraryEntry[]): LibraryEntry[] {
  return entries.filter((entry) => entry.retiredAt).sort((a, b) => byText(a.title, b.title));
}

export type PeopleGroup = {
  interestId: string;
  interestName: string;
  /** By kind, alphabetically, entries with no kind last. */
  kinds: { kind: string | null; people: InterestPerson[] }[];
  count: number;
};

export function groupPeople(people: readonly InterestPerson[], interestName: (id: string) => string): PeopleGroup[] {
  const groups = new Map<string, InterestPerson[]>();
  for (const person of people) {
    if (person.retiredAt) continue;
    const list = groups.get(person.interestId) ?? [];
    list.push(person);
    groups.set(person.interestId, list);
  }
  return [...groups.entries()]
    .map(([interestId, list]) => {
      const sorted = [...list].sort((a, b) => byText(a.name, b.name));
      const kinds = [...new Set(sorted.map((person) => person.kind))].sort((a, b) =>
        a === null ? 1 : b === null ? -1 : byText(a, b),
      );
      return {
        interestId,
        interestName: interestName(interestId),
        count: list.length,
        kinds: kinds.map((kind) => ({ kind, people: sorted.filter((person) => person.kind === kind) })),
      };
    })
    .sort((a, b) => byText(a.interestName, b.interestName));
}

export function retiredPeople(people: readonly InterestPerson[]): InterestPerson[] {
  return people.filter((person) => person.retiredAt).sort((a, b) => byText(a.name, b.name));
}

/**
 * A library entry filled from a page read in Capture: its title, who wrote
 * it, when it came out, the link, and the kind of page in words.
 */
export function libraryFromPage(page: {
  url: string;
  title: string;
  author: string | null;
  published: string | null;
  kind: string;
}): { title: string; byWhom: string; link: string; published: string; kind: string } {
  const kind = page.kind === 'video' ? 'A video' : page.kind === 'study' ? 'A study' : page.kind === 'article' ? 'An article' : 'A website';
  return { title: page.title, byWhom: page.author ?? '', link: page.url, published: page.published ?? '', kind };
}
