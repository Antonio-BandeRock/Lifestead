// Hands a report to the tester's email app (tester plan T4).
//
// This version opens a mailto link, which every phone and computer with an
// email app can take. The branch next-rebuild-tester replaces it with
// expo-mail-composer, which can also attach a picture of the screen, once
// the tester build is made with that module in it. When no email app opens,
// the report is copied so it can be pasted into any email, and the sheet
// says so.
import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';
import { isDesktopApp } from './desktop/bridge';
import { problemReportMailto, problemReportPlainText } from './problemReport';
import type { ProblemReport } from './problemReport';

export type ProblemReportSent = 'opened' | 'copied' | 'failed';

/** The device a report came from, by make and model, never by its name. */
export function describeReportDevice(): string {
  if (isDesktopApp()) return 'the Windows app';
  if (Platform.OS === 'android') {
    const made = Platform.constants as { Manufacturer?: string; Model?: string; Release?: string };
    const model = [made.Manufacturer, made.Model].filter(Boolean).join(' ') || 'An Android phone';
    return made.Release ? `${model}, Android ${made.Release}` : model;
  }
  if (Platform.OS === 'ios') return `An iPhone, iOS ${String(Platform.Version)}`;
  return Platform.OS;
}

export async function sendProblemReport(report: ProblemReport): Promise<ProblemReportSent> {
  try {
    await Linking.openURL(problemReportMailto(report));
    return 'opened';
  } catch (error) {
    console.error('[problemReport] no email app opened', error);
  }
  try {
    await Clipboard.setStringAsync(problemReportPlainText(report));
    return 'copied';
  } catch (error) {
    console.error('[problemReport] could not copy the report', error);
    return 'failed';
  }
}
