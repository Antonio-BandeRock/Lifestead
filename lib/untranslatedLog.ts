// What was still English on screen, written where Claude can read it.
//
// The coverage script counts the words it can find in the source, and most
// of what a person still sees in English is not there: a sentence put
// together from a count and a noun, a name kept in the reference database,
// a label handed through two components before it reaches a Text. So while
// the app is in a language other than English and Developer Tools has Tell
// Claude on, every piece of words the table had nothing for is kept here
// with the tab and lens it was drawn on, and written to
// lifestead-untranslated.jsonl in the shared Backups folder beside the Tell
// Claude notes. A walk through the app is then a list of exactly what is
// left, rather than a guess at it.
//
// One line per piece of words, never two for the same words: the file is
// read before every write and only what it does not hold yet goes on the
// end. Nothing here is health content unless a record of the person's was
// drawn in a language the table could not find, which is why this runs only
// under Developer Tools, the same as the notes, and never in a store release.

import { setMissListener } from './i18n';
import { getBackupsFolder } from './oneDriveFolders';
import { downloadText, uploadText } from './oneDriveGraph';
import { currentTellClaudeScreen } from './tellClaude';

export const UNTRANSLATED_FILE_NAME = 'lifestead-untranslated.jsonl';

type Miss = { text: string; tab: string | null; lens: string | null };

const waiting = new Map<string, Miss>();
const written = new Set<string>();

/** Words with no letters in them, or too long to be one piece, are not kept. */
function worthKeeping(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 2 && trimmed.length <= 4000 && /[A-Za-z]{2}/.test(trimmed);
}

function remember(text: string): void {
  if (written.has(text) || waiting.has(text) || !worthKeeping(text)) return;
  const screen = currentTellClaudeScreen();
  waiting.set(text, { text, tab: screen.tab, lens: screen.lens });
}

/** Starts or stops keeping what the table had nothing for. */
export function keepUntranslated(on: boolean): void {
  setMissListener(on ? remember : null);
}

/** How many pieces are kept and not yet in the file. */
export function untranslatedWaiting(): number {
  return waiting.size;
}

/**
 * Puts what is waiting on the end of the file. A folder nobody has set up
 * yet keeps everything here for the next try, the same as the notes.
 */
export async function writeUntranslated(): Promise<void> {
  if (!waiting.size) return;
  const folder = await getBackupsFolder();
  if (!folder.ok) return;
  let text = '';
  const existing = await downloadText(folder.value, UNTRANSLATED_FILE_NAME);
  if (existing.ok) text = existing.value;
  for (const line of text.split('\n')) {
    try {
      const parsed = JSON.parse(line) as Partial<Miss>;
      if (typeof parsed.text === 'string') written.add(parsed.text);
    } catch {
      // A half-written line from another device is skipped, not fatal.
    }
  }
  const fresh = [...waiting.values()].filter((miss) => !written.has(miss.text));
  if (!fresh.length) {
    waiting.clear();
    return;
  }
  const added = fresh.map((miss) => JSON.stringify(miss)).join('\n');
  const body = text && !text.endsWith('\n') ? `${text}\n${added}\n` : `${text}${added}\n`;
  const result = await uploadText(folder.value, UNTRANSLATED_FILE_NAME, body);
  if (!result.ok) return;
  for (const miss of fresh) written.add(miss.text);
  waiting.clear();
}
