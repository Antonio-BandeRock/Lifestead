// Taking diary entries out of the app (1.0.96.2): a PDF for paper, or one
// plain web page with its photos and recordings inside it, which opens in
// any browser with nothing installed. The page is laid out by diaryPage in
// lib/diary.ts; this gathers the photos and recordings and hands it over.
// Nothing is sent anywhere: the share sheet (a Save As dialog on a
// computer) is the person choosing where it goes.
import { attachmentBase64, listAttachmentsOf } from './attachmentsDb';
import { diaryPage, type Diary, type DiaryEntry, type DiaryLink, type ExportEntry, type ExportWords, type HealthLine } from './diary';
import { t } from './i18n';
import { appLocale, getLanguage } from './language';
import { mediaMimeType } from './media';
import { ensureMediaHere, listMediaFor, mediaFile } from './mediaDb';
import { shareFileIfAvailable } from './nativeSharing';
import { exportHtmlAsPdf } from './reportPdf';

/** "Tuesday, November 24, 2026, 3:05 PM", from a local wall clock. */
export function diaryWhen(happenedAt: string): string {
  const [day, time] = happenedAt.split('T');
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = (time ?? '00:00').split(':').map(Number);
  return new Date(year, month - 1, date, hour, minute).toLocaleString(appLocale(), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function gather(entry: DiaryEntry, diaries: readonly Diary[], links: readonly DiaryLink[]): Promise<{ entry: ExportEntry; missing: number }> {
  let missing = 0;
  const photos: ExportEntry['photos'] = [];
  for (const item of await listMediaFor('diary_entry', entry.id)) {
    try {
      if (!(await ensureMediaHere(item))) throw new Error('not here');
      const data = await (await mediaFile(item.fileName)).base64();
      photos.push({ uri: `data:${mediaMimeType(item.fileName)};base64,${data}`, caption: item.caption });
    } catch {
      missing += 1;
    }
  }
  const sounds: ExportEntry['sounds'] = [];
  const about = links.filter((link) => link.entryId === entry.id && link.kind !== 'health').map((link) => link.label);
  for (const item of await listAttachmentsOf('diary_entry', entry.id)) {
    const isPhoto = item.mimeType.startsWith('image/');
    const isSound = item.mimeType.startsWith('audio/');
    if (!isPhoto && !isSound) {
      about.push(item.name);
      continue;
    }
    const data = await attachmentBase64(item).catch(() => null);
    if (!data) {
      missing += 1;
      continue;
    }
    const uri = `data:${item.mimeType};base64,${data}`;
    if (isPhoto) photos.push({ uri, caption: null });
    else sounds.push({ uri, name: item.name.replace(/\.m4a$/, '') });
  }
  return {
    entry: {
      happenedAt: entry.happenedAt,
      diaryName: diaries.find((diary) => diary.id === entry.diaryId)?.name ?? '',
      title: entry.isLifeEvent ? entry.lifeEventLabel : null,
      body: entry.body,
      about,
      photos,
      sounds,
    },
    missing,
  };
}

export type DiaryExportResult = { status: 'done'; missing: number } | { status: 'cancelled' } | { status: 'problem'; message: string };

export async function exportDiary(input: {
  title: string;
  entries: readonly DiaryEntry[];
  diaries: readonly Diary[];
  links: readonly DiaryLink[];
  health: readonly HealthLine[];
  as: 'pdf' | 'page';
}): Promise<DiaryExportResult> {
  try {
    const gathered = [];
    for (const entry of input.entries) gathered.push(await gather(entry, input.diaries, input.links));
    const missing = gathered.reduce((sum, item) => sum + item.missing, 0);
    const words: ExportWords = {
      about: t('About'),
      sound: t('Recording'),
      health: t('Health Journal'),
      soundKept: (name) => t('Recording kept in the app: {name}', { name }),
      when: diaryWhen,
    };
    const html = diaryPage(
      input.title,
      gathered.map((item) => item.entry),
      input.health,
      input.as === 'pdf',
      words,
      getLanguage(),
    );
    const base = input.title.replace(/[^\p{L}\p{N} -]/gu, '').trim() || 'Diary';
    if (input.as === 'pdf') {
      const result = await exportHtmlAsPdf(html, base, t('Your diary'));
      if (result.status === 'cancelled') return { status: 'cancelled' };
      if (result.status === 'failed') return { status: 'problem', message: result.message };
      return { status: 'done', missing };
    }
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.cache, `${base}.html`);
    if (file.exists) file.delete();
    file.create();
    file.write(html);
    const shared = await shareFileIfAvailable(file.uri, { mimeType: 'text/html', dialogTitle: t('Your diary') });
    return shared ? { status: 'done', missing } : { status: 'cancelled' };
  } catch (error) {
    console.warn('The diary could not be exported', error);
    return { status: 'problem', message: t('The page could not be made. Nothing in your diary changed. Try again.') };
  }
}
