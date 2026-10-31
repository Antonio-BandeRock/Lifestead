// The words a tester agrees to before the tester version opens (tester plan
// T12, 2026-10-31). Written out for review in docs/tester-agreement.md, which
// says the same thing. Changing a point in a way a tester should read again
// means raising TESTER_AGREEMENT_VERSION in lib/testerAccess.ts.
import type { AgreementPoint } from './agreement';

export const TESTER_AGREEMENT_TITLE = 'Before you start testing';

export const TESTER_AGREEMENT_INTRO =
  'This is a test version of Lifestead, made for you to try before anyone else can. A few things to agree to first.';

export const TESTER_AGREEMENT_POINTS: readonly AgreementPoint[] = [
  {
    heading: 'This copy is for you alone',
    body:
      'Please do not pass the app, its installer or your activation link to anybody else, or post them anywhere. Each copy opens only on the phone or computer it was approved for. If somebody else would like to test, send their name to testers@ghostead.com and they can be invited.',
  },
  {
    heading: 'Your records stay on your device',
    body:
      'What you put in stays on this phone or computer, and in your cloud folder if you turn on sync or backups. Nothing is sent to Ghostead or anybody else. A report you send is an email you read before it goes.',
  },
  {
    heading: 'Things will go wrong',
    body:
      'It is a test version, so some screens will break, some words will be wrong, and some things will change while you use it. It is not medical advice and does not replace your doctor or pharmacist.',
  },
  {
    heading: 'Keep a backup',
    body:
      'Updates keep your records, and the app is built so that an update never removes any. Even so, make a backup now and then from Profile > Backup & Restore, so a lost or broken phone does not take your records with it.',
  },
  {
    heading: 'Access lasts 90 days at a time',
    body:
      'Your approval runs for 90 days. Two weeks before it ends the app offers to ask for more time with one press. If it ends, your records stay where they are and open again once more time is approved.',
  },
  {
    heading: 'Please tell us what you find',
    body:
      'Report a Problem is on every screen. Anything that went wrong, anything confusing, and anything you wish it did is worth sending.',
  },
];

export const TESTER_AGREEMENT_BUTTON = 'I Agree';
