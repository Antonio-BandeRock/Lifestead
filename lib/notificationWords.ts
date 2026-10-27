// Every notification in the app's language (2026-10-26). A notification is
// drawn by the operating system, so its words never pass through
// components/EditableText.tsx; each one is looked up here at the moment it is
// scheduled.
//
// The English it was made from rides along in its data, so the reconcile in
// lib/reminderNotifications.ts can go on comparing what is queued with what
// it would queue now in English, the way it always has, and a reminder
// queued in one language is replaced once the app speaks another.
import type * as Notifications from 'expo-notifications';
import { t } from './i18n';
import { getLanguage, type AppLanguage } from './language';

const ENGLISH_KEY = 'englishWords';

type EnglishWords = { title: string | null; body: string | null; language: AppLanguage };

/** The same request with its title, subtitle and body in the app's language. */
export function inAppLanguage(request: Notifications.NotificationRequestInput): Notifications.NotificationRequestInput {
  const content = request.content;
  const data = (content.data ?? {}) as Record<string, unknown>;
  // A copy made from one already queued (a snooze, quiet hours) keeps the
  // English of the first.
  const english: EnglishWords = isEnglishWords(data[ENGLISH_KEY])
    ? { ...data[ENGLISH_KEY], language: getLanguage() }
    : { title: content.title ?? null, body: content.body ?? null, language: getLanguage() };
  return {
    ...request,
    content: {
      ...content,
      ...(typeof content.title === 'string' ? { title: t(content.title) } : {}),
      ...(typeof content.subtitle === 'string' ? { subtitle: t(content.subtitle) } : {}),
      ...(typeof content.body === 'string' ? { body: t(content.body) } : {}),
      data: { ...data, [ENGLISH_KEY]: english },
    },
  };
}

/**
 * The English title and body a queued notification was made from, or null
 * when it was queued in another language than the app speaks now (or before
 * 2026-10-26, when every one was English and is read as it stands).
 */
export function queuedEnglish(content: { title?: string | null; body?: string | null; data?: unknown }): { title: string | null; body: string | null } | null {
  const data = (content.data ?? {}) as Record<string, unknown>;
  const english = data[ENGLISH_KEY];
  if (!isEnglishWords(english)) return getLanguage() === 'en' ? { title: content.title ?? null, body: content.body ?? null } : null;
  return english.language === getLanguage() ? { title: english.title, body: english.body } : null;
}

function isEnglishWords(value: unknown): value is EnglishWords {
  return typeof value === 'object' && value !== null && 'language' in value;
}
