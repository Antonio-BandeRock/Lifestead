// How a course card is laid out (2026-11-05). Pure. Works from the shape of the
// text and the card's type, never from a tense name or any word in a language,
// so a new course in any language lays out the same way.
//
// What the two course files actually hold decides the rules here:
//  - A Verb card is normally a head line and then forms split on " · ", and the
//    two sides line up row by row. Some are one line (llegar / to arrive), which
//    draw plain, and a few have forms on one side only, which draw as a table
//    with nothing falsely set beside it.
//  - A Set or Contrast pair lines up only when both sides split into the same
//    number of items. Where they do not (four Spanish forms of "our" against the
//    one English word), the side with several reads as a list and the other
//    plainly, never paired.
//  - A Contrast pair may split on " / " instead of " · ", which counts only when
//    both sides give the same number, since a slash can also just be a slash.

import type { CourseCard } from './learnCourseFile';

export type CourseDirection = 'targetFirst' | 'nativeFirst';

const DOT = ' · ';
const SLASH = ' / ';

export type CourseLayout =
  | { kind: 'plain'; target: string; native: string }
  | { kind: 'verb'; targetHead: string; nativeHead: string; targetForms: string[]; nativeForms: string[] | null; nativeText: string | null }
  | { kind: 'pairs'; target: string[]; native: string[] }
  | { kind: 'list'; target: string[] | string; native: string[] | string };

function splitVerb(text: string): { head: string; forms: string[] } | null {
  const at = text.indexOf('\n');
  if (at < 0) return null;
  const forms = text.slice(at + 1).split(DOT).map((form) => form.trim()).filter(Boolean);
  return forms.length >= 2 ? { head: text.slice(0, at).trim(), forms } : null;
}

export function courseCardLayout(card: Pick<CourseCard, 'type' | 'target' | 'native'>): CourseLayout {
  const { target, native } = card;
  if (card.type === 'Verb') {
    const front = splitVerb(target);
    if (!front) return { kind: 'plain', target, native };
    const back = splitVerb(native);
    if (back && back.forms.length === front.forms.length) {
      return { kind: 'verb', targetHead: front.head, nativeHead: back.head, targetForms: front.forms, nativeForms: back.forms, nativeText: null };
    }
    return { kind: 'verb', targetHead: front.head, nativeHead: '', targetForms: front.forms, nativeForms: null, nativeText: native };
  }
  if (card.type === 'Set' || card.type === 'Contrast pair') {
    const dotFront = target.split(DOT);
    const dotBack = native.split(DOT);
    if (dotFront.length > 1 && dotFront.length === dotBack.length) return { kind: 'pairs', target: dotFront, native: dotBack };
    if (card.type === 'Contrast pair') {
      const slashFront = target.split(SLASH);
      const slashBack = native.split(SLASH);
      if (slashFront.length > 1 && slashFront.length === slashBack.length) return { kind: 'pairs', target: slashFront, native: slashBack };
    }
    if (dotFront.length > 1 || dotBack.length > 1) {
      return { kind: 'list', target: dotFront.length > 1 ? dotFront : target, native: dotBack.length > 1 ? dotBack : native };
    }
  }
  return { kind: 'plain', target, native };
}

/** The asked side and the answer side's text, as the direction has them. */
export function facesOf(card: CourseCard, direction: CourseDirection) {
  return direction === 'targetFirst'
    ? { frontExample: card.exampleTarget, backExample: card.exampleNative }
    : { frontExample: card.exampleNative, backExample: card.exampleTarget };
}

// ---- Type the answer ----

function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tidy(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[.,;:!?¡¿"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What may be typed for one form: the whole of it, or without the pronoun in front. */
export function acceptedForms(form: string): string[] {
  const whole = tidy(form);
  const accepted = new Set<string>([whole]);
  const dropFirst = (text: string) => {
    const words = text.split(' ');
    if (words.length >= 2) accepted.add(words.slice(1).join(' '));
  };
  if (form.includes(SLASH)) {
    const pieces = form.split(SLASH).map(tidy).filter(Boolean);
    // am / is / are: any one of them. ellos / ustedes son: the last piece holds the verb.
    if (pieces.every((piece) => !piece.includes(' '))) pieces.forEach((piece) => accepted.add(piece));
    else {
      const last = pieces[pieces.length - 1];
      accepted.add(last);
      dropFirst(last);
    }
  } else {
    dropFirst(whole);
  }
  return [...accepted];
}

export type TypedCheck = 'match' | 'accents' | 'different';

/** Compares what was typed with one form. Language-neutral: accents alone never count as different, and are pointed out. */
export function checkTypedForm(typed: string, form: string): TypedCheck {
  const said = tidy(typed);
  if (!said) return 'different';
  const accepted = acceptedForms(form);
  if (accepted.includes(said)) return 'match';
  const bare = stripDiacritics(said);
  return accepted.some((one) => stripDiacritics(one) === bare) ? 'accents' : 'different';
}

/** Which form to hide, the same one for a card all day and another the next. */
export function hiddenFormIndex(cardId: string, day: string, count: number): number {
  let hash = 0x811c9dc5;
  const text = `${day}${cardId}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % Math.max(1, count);
}
