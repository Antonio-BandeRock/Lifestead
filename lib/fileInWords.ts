// The files Lifestead keeps in a shared folder still carry the names they had
// before the rename (inside-story-sync.json and the rest), because both
// devices find each other's files by those names. A file name must never
// reach a sentence, though. Direct instruction, 2026-10-12: "NOTHING should
// refer to Inside Story at all anymore on anything about the app, including
// messages like this." So every message built around a file name passes the
// name through here first. A name the app did not make, such as a backup the
// person renamed, is shown as it is.

const KNOWN: { test: RegExp; words: string }[] = [
  { test: /^inside-story-sync\.json$/i, words: 'the note saying which device saved last' },
  { test: /^inside-story-session\.json$/i, words: 'the note saying which device is in use' },
  { test: /^inside-story-snapshot-/i, words: 'the saved copy of your records' },
  { test: /^inside-story-changes-/i, words: 'the latest changes from your other device' },
  { test: /^inside-story-sync-(sent-whole|received-whole|base)\.json$/i, words: 'a copy sync keeps to compare against' },
  { test: /^(lifestead|inside-story)-backup-/i, words: 'the backup' },
  { test: /^inside-story-notes\.jsonl$/i, words: 'the notes left for Claude' },
  { test: /^inside-story/i, words: 'a Lifestead file' },
];

/** A file name as words that fit in a sentence, starting lower case. */
export function fileInWords(fileName: string): string {
  const base = fileName.split(/[\/]/).pop() ?? fileName;
  for (const known of KNOWN) if (known.test.test(base)) return known.words;
  return base;
}

/** The same, for the start of a sentence. */
export function FileInWords(fileName: string): string {
  const words = fileInWords(fileName);
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Any of Lifestead's file names inside a longer sentence, such as one OneDrive wrote, put into words. */
export function fileNamesInWords(text: string): string {
  return text.replace(/'?(inside-story|lifestead)-[\w.-]*[\w]'?/gi, (match) => {
    const name = match.replace(/'/g, '');
    const words = fileInWords(name);
    return words === name ? match : words;
  });
}
