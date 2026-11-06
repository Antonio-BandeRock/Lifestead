// What a course card sounds like, and which voice says it (2026-11-05). Pure.
// The text on a card is written for the eye: a middle dot between forms, a slash
// between alternatives, an arrow in an example, and in Spanish an @ standing for
// both endings. A voice reads those aloud as "arroba" and the like, so they are
// turned into what a person would say. Only the @ needs to know a language, and
// it lives in one table a new language can join.

import type { CourseCard } from './learnCourseFile';
import { courseCardLayout } from './learnCourseCard';
import { languagePart } from './languageBasics';

/** Each language's two endings for a word written with @, as [singular], with plurals built by adding s. */
const AT_ENDINGS: Record<string, [string, string]> = {
  es: ['o', 'a'],
};

function expandAt(text: string, language: string): string {
  const endings = AT_ENDINGS[language];
  if (!endings) return text.replace(/@/g, '');
  return text.replace(/([\p{L}]*)@(s?)/gu, (_whole, stem: string, plural: string) => `${stem}${endings[0]}${plural}, ${stem}${endings[1]}${plural}`);
}

/** A card's text as a voice should say it, in the course's target language. */
export function speechText(text: string, code: string): string {
  const language = languagePart(code);
  return expandAt(text, language)
    .replace(/\s*[·→]\s*/g, ', ')
    .replace(/\s+\/\s+/g, ', ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** What the speaker reads on a card: the target side, then its example. A verb's head line is left out, since it can name the tense in another language. */
export function speechParts(card: Pick<CourseCard, 'type' | 'target' | 'native' | 'exampleTarget'>, code: string): string[] {
  const layout = courseCardLayout(card);
  const main = layout.kind === 'verb' ? layout.targetForms.join(' · ') : card.target;
  return [main, card.exampleTarget].filter(Boolean).map((text) => speechText(text, code));
}

export type VoiceLike = { identifier: string; name?: string; language: string; quality?: string };

function normalCode(code: string): string {
  return code.replace(/_/g, '-').toLowerCase();
}

/** Android names a voice that needs the internet with "network" in it. Those cannot be counted on offline. */
export function worksOffline(voice: VoiceLike): boolean {
  return !/network/i.test(voice.identifier) && !/network/i.test(voice.name ?? '');
}

/** The voice for a language code: the exact code first, then any voice of that language. Null when none is on this device. */
export function pickVoice(voices: VoiceLike[], code: string): VoiceLike | null {
  const offline = voices.filter(worksOffline);
  const wanted = normalCode(code);
  const language = languagePart(code);
  const better = (list: VoiceLike[]) => [...list].sort((a, b) => (a.quality === 'Enhanced' ? 0 : 1) - (b.quality === 'Enhanced' ? 0 : 1) || a.identifier.localeCompare(b.identifier))[0] ?? null;
  return better(offline.filter((voice) => normalCode(voice.language) === wanted)) ?? better(offline.filter((voice) => languagePart(voice.language) === language));
}
