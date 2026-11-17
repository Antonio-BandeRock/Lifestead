// Reports saved to a remembered folder (Q64): the device half. Which folder
// and which kinds of file are kept in app_meta, both on this device only;
// the files go through lib/oneDriveGraph.ts, which already writes to a
// folder on the phone, a folder on the computer, OneDrive or Google Drive
// by the folder's kind. Every rule about names and words is in
// lib/reportFolder.ts.

import { getDatabase } from './db';
import { isDesktopApp } from './desktop/bridge';
import { pickFolder as pickComputerFolder } from './desktop/cloudFolder';
import { getReportsFolder, getSharedFolder } from './oneDriveFolders';
import { checkFolder, uploadFile, uploadText, type DriveItemRef } from './oneDriveGraph';
import { pickFolder as pickPhoneFolder } from './phoneFolder';
import { wholeReportCsv } from './reportCsv';
import type { ReportDocument } from './reportGenerator';
import { renderReportText } from './reportGenerator';
import { renderReportHtml } from './reportHtml';
import { fileStamp, makePdfFile } from './reportPdf';
import {
  folderValue,
  formatsValue,
  parseFolder,
  parseFormats,
  REPORT_FOLDER_META_KEY,
  REPORT_FORMATS_META_KEY,
  reportFileName,
  type ReportFileFormat,
  type SaveOutcome,
} from './reportFolder';

async function readMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM app_meta WHERE key = ?', key);
  return row?.value ?? null;
}

async function writeMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', key, value);
}

export async function getReportFolder(): Promise<DriveItemRef | null> {
  return parseFolder(await readMeta(REPORT_FOLDER_META_KEY));
}

export async function setReportFolder(folder: DriveItemRef): Promise<void> {
  await writeMeta(REPORT_FOLDER_META_KEY, folderValue(folder));
}

export async function getReportFormats(): Promise<ReportFileFormat[]> {
  return parseFormats(await readMeta(REPORT_FORMATS_META_KEY));
}

export async function setReportFormats(formats: readonly ReportFileFormat[]): Promise<void> {
  await writeMeta(REPORT_FORMATS_META_KEY, formatsValue(formats));
}

/** Whether the shared sync folder is set up and reachable, so its Reports
 *  folder can be offered as a choice. */
export async function sharedFolderReady(): Promise<boolean> {
  try {
    return (await getSharedFolder()).state === 'ready';
  } catch {
    return false;
  }
}

export type FolderChoice = { ok: true; folder: DriveItemRef | null } | { ok: false; reason: string };

/** The Reports folder inside the shared folder, made if it is missing. */
export async function chooseSharedReportsFolder(): Promise<FolderChoice> {
  const made = await getReportsFolder();
  if (!made.ok) return { ok: false, reason: made.reason };
  await setReportFolder(made.value);
  return { ok: true, folder: made.value };
}

/** The system folder picker on this device. A closed picker is no folder. */
export async function pickReportFolder(): Promise<FolderChoice> {
  const picked = isDesktopApp() ? await pickComputerFolder() : await pickPhoneFolder();
  if (!picked.ok) return { ok: false, reason: picked.reason };
  if (!picked.value) return { ok: true, folder: null };
  await setReportFolder(picked.value);
  return { ok: true, folder: picked.value };
}

/** Writes each chosen kind of file into the folder, one at a time, and
 *  says which went in and which did not. */
export async function saveReportToFolder(
  doc: ReportDocument,
  kindLabel: string,
  folder: DriveItemRef,
  formats: readonly ReportFileFormat[],
): Promise<SaveOutcome[]> {
  const reachable = await checkFolder(folder);
  if (!reachable.ok) {
    return formats.map((format) => ({ format, fileName: reportFileName(fileStamp(doc), kindLabel, format), ok: false, reason: reachable.reason }));
  }
  const stamp = fileStamp(doc);
  const outcomes: SaveOutcome[] = [];
  for (const format of formats) {
    const fileName = reportFileName(stamp, kindLabel, format);
    try {
      if (format === 'pdf') {
        const made = await makePdfFile(renderReportHtml(doc));
        if (!made.ok) {
          outcomes.push({ format, fileName, ok: false, reason: made.message });
          continue;
        }
        const sent = await uploadFile(folder, fileName, made.uri, 'application/pdf');
        await removeQuietly(made.uri);
        outcomes.push(sent.ok ? { format, fileName, ok: true } : { format, fileName, ok: false, reason: sent.reason });
      } else {
        const text = format === 'text' ? renderReportText(doc) : wholeReportCsv(doc);
        const sent = await uploadText(folder, fileName, text);
        outcomes.push(sent.ok ? { format, fileName, ok: true } : { format, fileName, ok: false, reason: sent.reason });
      }
    } catch (error) {
      console.error('[reportFolder] could not save', fileName, error);
      outcomes.push({ format, fileName, ok: false, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return outcomes;
}

/** The PDF made on the way is a working copy; the one in the folder is the keeper. */
async function removeQuietly(uri: string): Promise<void> {
  if (isDesktopApp()) return;
  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // A working copy left in the cache is cleared with the cache.
  }
}
