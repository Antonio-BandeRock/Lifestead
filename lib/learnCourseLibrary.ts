// Which courses a person sees first (2026-11-05). Pure, and with no language
// named anywhere: a course is matched by the language part of its native code
// against the language the app is in, so es-MX and es-ES both match Spanish and
// a new pair of languages needs no change here.

import type { CourseDeck } from './learnCourseFile';

/** The language part of a BCP 47 code: es-MX reads as es. */
export function languagePart(code: string): string {
  return code.trim().split(/[-_]/)[0].toLowerCase();
}

/** A course taught from this language. A course with no native language at all, on any subject, suits anybody. */
export function courseSuits(deck: Pick<CourseDeck, 'nativeCode'>, appLanguage: string): boolean {
  return !deck.nativeCode || languagePart(deck.nativeCode) === languagePart(appLanguage);
}

export type LibraryShelf<T> = { subject: string; courses: T[] };
export type Library<T> = { forYou: LibraryShelf<T>[]; others: LibraryShelf<T>[] };

/**
 * The library for the language the app is in: courses taught from that language
 * first, and a course already being studied always with them, then everything
 * else behind Browse All Courses. Shelves and courses read alphabetically, so
 * the same courses always land in the same places.
 */
export function buildLibrary<T extends { deck: CourseDeck }>(courses: T[], appLanguage: string, isStudying: (course: T) => boolean = () => false): Library<T> {
  const shelves = (list: T[]): LibraryShelf<T>[] => {
    const bySubject = new Map<string, T[]>();
    for (const course of list) {
      const shelf = bySubject.get(course.deck.subject);
      if (shelf) shelf.push(course);
      else bySubject.set(course.deck.subject, [course]);
    }
    return [...bySubject.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([subject, group]) => ({ subject, courses: [...group].sort((a, b) => a.deck.name.localeCompare(b.deck.name)) }));
  };
  const first = courses.filter((course) => courseSuits(course.deck, appLanguage) || isStudying(course));
  const rest = courses.filter((course) => !first.includes(course));
  return { forYou: shelves(first), others: shelves(rest) };
}
