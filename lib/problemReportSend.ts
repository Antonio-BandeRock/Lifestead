// Hands a report to the tester's email app (tester plan T4, attachment T8).
//
// On a phone it goes through expo-mail-composer, which can carry a picture of
// the screen. Where that cannot open (no email account set up on the phone,
// or the computer), a mailto link carries the words alone, and when no
// email app opens at all the report is copied so it can be pasted into any
// email. The sheet says which happened.
import * as Clipboard from 'expo-clipboard';
import * as MailComposer from 'expo-mail-composer';
import { Linking, Platform } from 'react-native';
import { isDesktopApp } from './desktop/bridge';
import { composeProblemReport, PROBLEM_REPORT_ADDRESS, problemReportMailto, problemReportPlainText } from './problemReport';
import type { ProblemReport } from './problemReport';

export type ProblemReportSent = 'opened' | 'openedNoPicture' | 'copied' | 'failed';

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

export async function sendProblemReport(report: ProblemReport, picture: string | null = null): Promise<ProblemReportSent> {
  if (Platform.OS !== 'web' && !isDesktopApp()) {
    try {
      if (await MailComposer.isAvailableAsync()) {
        const email = composeProblemReport(report);
        await MailComposer.composeAsync({
          recipients: [PROBLEM_REPORT_ADDRESS],
          subject: email.subject,
          body: email.body,
          attachments: picture ? [picture] : [],
        });
        return 'opened';
      }
    } catch (error) {
      console.error('[problemReport] the email composer did not open', error);
    }
  }
  try {
    await Linking.openURL(problemReportMailto(report));
    return picture ? 'openedNoPicture' : 'opened';
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
