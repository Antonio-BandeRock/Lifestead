// The words a tester agrees to before the tester version opens (tester plan
// T12, 2026-10-31). Since 1.0.79.1 they come after access is approved, and
// hold what a fresh install used to show as an update message: how to
// report, how updates arrive, and the name across the screens. Written out for review in docs/tester-agreement.md, which
// says the same thing. Changing a point in a way a tester should read again
// means raising TESTER_AGREEMENT_VERSION in lib/testerAccess.ts.
import type { AgreementPoint } from './agreement';

export const TESTER_AGREEMENT_TITLE = 'Before you start testing';

export const TESTER_AGREEMENT_INTRO =
  'This device is approved. This is a test version of Lifestead, made for you to try before anyone else can. A few things to know and agree to first.';

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
      'Tap the flag at the edge of any screen, or press and hold any band. Say what went wrong, what was confusing, or what you wish it did, by typing or with the mic. If the app closed by itself, what happened is offered to send along. It goes by email, and you read it before it goes.',
  },
  {
    heading: 'Updates arrive by themselves',
    body:
      'Updates come over the air and keep everything you have put in. Once one has arrived, What Changed on the For Testers band on Home reads its notes. Now and then a change needs a new installer, and For Testers says so, with a button to fetch it.',
  },
  {
    heading: 'Your first name shows faintly on every screen',
    body: 'So a screenshot says whose copy it came from. It covers nothing and stops nothing from being tapped.',
  },
];

export const TESTER_AGREEMENT_BUTTON = 'I Agree';
