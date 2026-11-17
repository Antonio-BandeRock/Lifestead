// Save to a folder on the Reports tab (Q64, 1.0.91.11). The first save asks
// where: a Reports folder inside the shared folder when that is set up, or
// any folder through the system picker. The folder and the kinds of file
// are remembered on this device, so every later save is one tap. The host
// gives it a surface. Rules and words are in lib/reportFolder.ts.

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { confirmItsYou } from '../lib/freshAuth';
import { t } from '../lib/i18n';
import type { DriveItemRef } from '../lib/oneDriveGraph';
import { explainNotYet } from '../lib/notYet';
import {
  FORMAT_LABELS,
  folderLine,
  folderWords,
  NO_FORMAT_CHOSEN,
  PICK_FOLDER_CAPTION,
  REPORT_FILE_FORMATS,
  REPORT_FOLDER_CAPTION,
  savedMessage,
  SHARED_REPORTS_CAPTION,
  toggleFormat,
  type ReportFileFormat,
} from '../lib/reportFolder';
import {
  chooseSharedReportsFolder,
  getReportFolder,
  getReportFormats,
  pickReportFolder,
  saveReportToFolder,
  setReportFormats,
  sharedFolderReady,
  type FolderChoice,
} from '../lib/reportFolderDb';
import type { ReportDocument } from '../lib/reportGenerator';
import { useInfoAlert } from './InfoAlert';
import { useWalkMark } from './WalkMark';

type Props = {
  report: ReportDocument;
  /** The report's name, which goes into each file's name. */
  kindLabel: string;
  /** Called once at least one file went in, with the folder's words. */
  onSaved?: (savedTo: string) => void;
};

export function ReportFolderSave({ report, kindLabel, onSaved }: Props) {
  const walkMark = useWalkMark();
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [folder, setFolder] = useState<DriveItemRef | null>(null);
  const [formats, setFormats] = useState<ReportFileFormat[]>(['pdf', 'text']);
  const [choosing, setChoosing] = useState(false);
  const [sharedReady, setSharedReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // Set when the first save opened the choice, so choosing a folder goes
  // straight on to save.
  const [saveAfterChoice, setSaveAfterChoice] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getReportFolder(), getReportFormats()])
      .then(([kept, keptFormats]) => {
        if (cancelled) return;
        setFolder(kept);
        setFormats(keptFormats);
      })
      .catch((error: unknown) => console.warn('[reportFolder] could not read the remembered folder', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const openChoice = useCallback(async (thenSave: boolean) => {
    setSaveAfterChoice(thenSave);
    setChoosing(true);
    setSharedReady(await sharedFolderReady());
  }, []);

  async function save(target: DriveItemRef) {
    if (busy) return;
    if (formats.length === 0) {
      explainNotYet(NO_FORMAT_CHOSEN);
      return;
    }
    if (!(await confirmItsYou('Before the report is saved'))) return;
    setBusy(true);
    try {
      const outcomes = await saveReportToFolder(report, kindLabel, target, formats);
      const said = savedMessage(target, outcomes);
      showInfoAlert(said.title, t(said.words, said.values).trim());
      if (outcomes.some((outcome) => outcome.ok)) onSaved?.(folderWords(target));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (busy) return;
    if (formats.length === 0) {
      explainNotYet(NO_FORMAT_CHOSEN);
      return;
    }
    if (!folder) {
      await openChoice(true);
      return;
    }
    await save(folder);
  }

  async function settle(choice: FolderChoice) {
    if (!choice.ok) {
      showInfoAlert('Folder not set', choice.reason);
      return;
    }
    if (!choice.folder) return; // the picker was closed
    setFolder(choice.folder);
    setChoosing(false);
    if (saveAfterChoice) await save(choice.folder);
  }

  function handleFormat(format: ReportFileFormat) {
    const next = toggleFormat(formats, format);
    setFormats(next);
    if (next.length === 0) return; // kept once something is chosen again
    setReportFormats(next).catch((error: unknown) => {
      console.warn('[reportFolder] could not keep the choice of files', error);
    });
  }

  const line = folderLine(folder);

  return (
    <View style={styles.wrap}>
      <Text style={styles.captionText}>{REPORT_FOLDER_CAPTION}</Text>
      <Text style={styles.folderText}>{t(line.words, line.values)}</Text>
      <View style={styles.pillRow}>
        {REPORT_FILE_FORMATS.map((format) => {
          const on = formats.includes(format);
          return (
            <TouchableOpacity
              key={format}
              style={[PILL, on && PILL_ON]}
              onPress={() => handleFormat(format)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <Text style={on ? PILL_ON_TEXT : PILL_TEXT}>{FORMAT_LABELS[format]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {choosing ? (
        <View style={styles.choice}>
          <Text style={styles.folderText}>Where should reports be saved?</Text>
          {sharedReady ? (
            <View style={styles.choiceItem}>
              <TouchableOpacity style={styles.button} onPress={async () => settle(await chooseSharedReportsFolder())} disabled={busy}>
                <Text style={styles.buttonText}>Reports in the shared folder</Text>
              </TouchableOpacity>
              <Text style={styles.captionText}>{SHARED_REPORTS_CAPTION}</Text>
            </View>
          ) : null}
          <View style={styles.choiceItem}>
            <TouchableOpacity style={sharedReady ? styles.secondary : styles.button} onPress={async () => settle(await pickReportFolder())} disabled={busy}>
              <Text style={sharedReady ? styles.secondaryText : styles.buttonText}>Pick a folder</Text>
            </TouchableOpacity>
            <Text style={styles.captionText}>{PICK_FOLDER_CAPTION}</Text>
          </View>
          <TouchableOpacity style={styles.secondary} onPress={() => setChoosing(false)}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            ref={walkMark.ref('reports.folder')}
            style={[styles.button, busy && styles.buttonBusy]}
            onPress={handleSave}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save to a folder'}</Text>
          </TouchableOpacity>
          {folder ? (
            <TouchableOpacity ref={walkMark.ref('reports.folderChange')} style={styles.secondary} onPress={() => openChoice(false)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Change folder</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {infoAlertElement}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  folderText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: { gap: 12 },
  choiceItem: { gap: 6 },
  button: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  buttonBusy: { opacity: 0.6 },
  buttonText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
});
