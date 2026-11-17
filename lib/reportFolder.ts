// Reports saved to a remembered folder (Q64, 1.0.91.11). Beside Share as
// PDF, Save to a folder writes the report into a folder the person picked
// once, with no share sheet each time: a folder on the phone, a folder on
// the computer, or a Reports folder inside the shared sync folder. The
// folder is remembered on this device only, since a folder on one phone
// means nothing on another (DEVICE_LOCAL_META_KEYS in lib/snapshotSync.ts).
//
// Open formats beside the PDF: plain text by default, and the whole report
// as a spreadsheet (CSV) when switched on, so a copy stays readable with
// nothing but a text editor long after the app is gone.
//
// Nothing goes anywhere the person did not pick. A copy in the shared
// folder is an ordinary file, not encrypted the way the sync copies are,
// and the choice says so before it is made.
//
// Pure: lib/reportFolderDb.ts reads and writes the device, the Reports tab
// shows it, and scripts/test_report_folder.js checks this without a phone.

import type { DriveItemRef } from './oneDriveGraph';

export type ReportFileFormat = 'pdf' | 'text' | 'csv';

export const REPORT_FILE_FORMATS: readonly ReportFileFormat[] = ['pdf', 'text', 'csv'];

/** What a save writes when nothing has been chosen yet. */
export const DEFAULT_REPORT_FORMATS: readonly ReportFileFormat[] = ['pdf', 'text'];

/** app_meta keys, both device-local. */
export const REPORT_FOLDER_META_KEY = 'report_save_folder';
export const REPORT_FORMATS_META_KEY = 'report_save_formats';

/** The folder made inside the shared folder when that is the choice. */
export const REPORTS_FOLDER_NAME = 'Reports';

export const FORMAT_LABELS: Record<ReportFileFormat, string> = {
  pdf: 'PDF',
  text: 'Plain text',
  csv: 'Spreadsheet',
};

export const REPORT_FOLDER_HEADING = 'Save to a folder';

export const REPORT_FOLDER_CAPTION =
  'Saves this report into a folder you choose once, with no share sheet each time. Plain text and the spreadsheet open with nothing but a text editor or a spreadsheet program.';

export const NO_FOLDER_YET = 'No folder chosen yet. The first save asks where.';

export const SHARED_REPORTS_CAPTION =
  'A Reports folder inside your shared folder. Files saved there are ordinary files, not encrypted the way the sync copies are, and anyone who can open that folder can read them.';

export const PICK_FOLDER_CAPTION = 'Any folder on this device, or one your cloud drive app shows.';

export const NO_FORMAT_CHOSEN = 'Choose at least one kind of file to save: PDF, plain text or spreadsheet.';

/** A stored formats value as a list in a fixed order; unreadable or empty is the default. */
export function parseFormats(value: string | null | undefined): ReportFileFormat[] {
  if (!value) return [...DEFAULT_REPORT_FORMATS];
  const wanted = new Set(value.split(',').map((part) => part.trim()));
  const formats = REPORT_FILE_FORMATS.filter((format) => wanted.has(format));
  return formats.length > 0 ? formats : [...DEFAULT_REPORT_FORMATS];
}

export function formatsValue(formats: readonly ReportFileFormat[]): string {
  return REPORT_FILE_FORMATS.filter((format) => formats.includes(format)).join(',');
}

/** One format switched on or off. Switching off the last one is allowed
 *  here so the screen can say why a save cannot go yet. */
export function toggleFormat(formats: readonly ReportFileFormat[], format: ReportFileFormat): ReportFileFormat[] {
  const next = formats.includes(format) ? formats.filter((item) => item !== format) : [...formats, format];
  return REPORT_FILE_FORMATS.filter((item) => next.includes(item));
}

/** A stored folder as a reference; anything unreadable is no folder. */
export function parseFolder(value: string | null | undefined): DriveItemRef | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const ref = parsed as Record<string, unknown>;
    if (typeof ref.driveId !== 'string' || typeof ref.itemId !== 'string' || typeof ref.name !== 'string') return null;
    if (!ref.itemId) return null;
    return {
      driveId: ref.driveId,
      itemId: ref.itemId,
      name: ref.name,
      ...(typeof ref.path === 'string' && ref.path ? { path: ref.path } : {}),
    };
  } catch {
    return null;
  }
}

export function folderValue(folder: DriveItemRef): string {
  return JSON.stringify({ driveId: folder.driveId, itemId: folder.itemId, name: folder.name, ...(folder.path ? { path: folder.path } : {}) });
}

/** How a folder is named on screen and in Report history. */
export function folderWords(folder: Pick<DriveItemRef, 'name' | 'path'>): string {
  return (folder.path ?? folder.name).trim() || 'the chosen folder';
}

/** The line under the heading, as words to translate and the value to put in. */
export function folderLine(folder: Pick<DriveItemRef, 'name' | 'path'> | null): { words: string; values?: Record<string, string> } {
  return folder ? { words: 'Saves to {where}', values: { where: folderWords(folder) } } : { words: NO_FOLDER_YET };
}

/** The file name for one format, from the report's stamp
 *  ("lifestead-report-2026-11-16-30d"). The kind of report goes in too,
 *  so two reports saved the same day sit side by side. */
export function reportFileName(stamp: string, kindSlug: string, format: ReportFileFormat): string {
  const slug = kindSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const base = slug ? `${stamp}-${slug}` : stamp;
  return `${base}.${format === 'pdf' ? 'pdf' : format === 'text' ? 'txt' : 'csv'}`;
}

export type SaveOutcome = { format: ReportFileFormat; fileName: string; ok: boolean; reason?: string };

/** What the screen says once a save has finished: a title, and the
 *  sentence as words to translate with the values to put in, so lib/i18n.ts
 *  can find it whatever the file names were. */
export function savedMessage(
  folder: Pick<DriveItemRef, 'name' | 'path'>,
  outcomes: readonly SaveOutcome[],
): { title: string; words: string; values: Record<string, string> } {
  const done = outcomes.filter((outcome) => outcome.ok);
  const failed = outcomes.filter((outcome) => !outcome.ok);
  const where = folderWords(folder);
  const list = (items: readonly SaveOutcome[]) => joinWords(items.map((item) => item.fileName));
  const reason = failed[0]?.reason ?? '';
  if (failed.length === 0) {
    return done.length === 1
      ? { title: 'Saved', words: '{files} is in {where}.', values: { files: list(done), where } }
      : { title: 'Saved', words: '{files} are in {where}.', values: { files: list(done), where } };
  }
  if (done.length === 0) {
    return { title: 'Not saved', words: 'Nothing could be saved to {where}. {reason}', values: { where, reason } };
  }
  return {
    title: 'Partly saved',
    words: 'Saved to {where}: {files}. Not saved: {failed}. {reason}',
    values: { where, files: list(done), failed: list(failed), reason },
  };
}

function joinWords(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
