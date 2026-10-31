// Profile's Developer Tools card, moved out of app/profile.tsx on 2026-10-31
// (tester plan T2) so the tester and store versions can leave it out of
// their bundles: metro.config.js resolves this file to a stand-in that draws
// nothing when APP_VARIANT is test or store, and app/profile.tsx only draws
// the card in the developer version (isDeveloperBuild, lib/appVariant.ts).
// Everything here was in the card before; see the comments inside for why
// each part exists.

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { describeLeaveOneOut } from '../lib/captureSuggest';
import { checkSuggestionsAgainstSorted } from '../lib/captureSuggestDb';
import { clearSeededTestData, seedHealthTestData, seedTest90Days } from '../lib/devSeed';
import { summariseDevNotes } from '../lib/devNotes';
import type { DevNote } from '../lib/devNotes';
import { clearShippedDevNotes, listDevNotes, syncDevNotes } from '../lib/devNotesDb';
import { setTier, tierSetByVersion, useTier } from '../lib/entitlement';
import { explainNotYet } from '../lib/notYet';
import { seedKitchenSources } from '../lib/testData';
import { getMyApprovalKey, sendMyApprovalKey } from '../lib/testerApprove';
import { useVisualPreferences } from '../hooks/useVisualPreferences';
import { setVisualPreferences } from '../lib/visualPreferences';
import { VoiceoverRecorder } from './VoiceoverRecorder';

type ViewName = 'cardBody' | 'pillRow' | 'pill' | 'pillActive' | 'addAllergyButton' | 'clearButton';
type TextName = 'helpText' | 'pillText' | 'pillTextActive' | 'addAllergyButtonText' | 'clearButtonText';

type Props = {
  /** Profile's styles, so the card looks as every other Profile card does. */
  styles: Record<ViewName, StyleProp<ViewStyle>> & Record<TextName, StyleProp<TextStyle>>;
  showAlert: (title: string, message: string) => void;
};

export function DeveloperToolsCard({ styles, showAlert }: Props) {
  const tier = useTier();
  const visualPrefs = useVisualPreferences();
  const [seedingTestWeek, setSeedingTestWeek] = useState(false);
  const [seedingHealth, setSeedingHealth] = useState(false);
  const [seedingKitchen, setSeedingKitchen] = useState(false);
  const [clearingSeededData, setClearingSeededData] = useState(false);

  // Tell Claude, 2026-09-22. The switch itself lives in visual
  // preferences (developerNotes), so a band can read it without this
  // screen being open; what is held here is only what the card says back:
  // how many notes are waiting, and whether the last publish reached the
  // folder. See lib/devNotes.ts for the whole thing.
  const [devNotes, setDevNotes] = useState<DevNote[]>([]);
  const [devNotesMessage, setDevNotesMessage] = useState<string | null>(null);
  const [devNotesBusy, setDevNotesBusy] = useState(false);
  // C8: how the capture sorting suggestions would have done on this
  // person's own sorted notes, run on request.
  const [suggestCheck, setSuggestCheck] = useState<string | null>(null);
  // Tester plan T12: what Send My Approval Key to Claude said back.
  const router = useRouter();
  const [testerKeyMessage, setTesterKeyMessage] = useState<string | null>(null);
  const [testerKeyBusy, setTesterKeyBusy] = useState(false);

  useEffect(() => {
    if (!visualPrefs.developerNotes) {
      setDevNotes([]);
      setDevNotesMessage(null);
      return;
    }
    let live = true;
    listDevNotes()
      .then((notes) => {
        if (live) setDevNotes(notes);
      })
      .catch((error) => {
        console.error('[tellClaude] could not read the notes', error);
      });
    return () => {
      live = false;
    };
  }, [visualPrefs.developerNotes]);

  return (
    <View style={styles.cardBody}>
      {/* Free or Paid, P27 (2026-10-09). Direct request: "a free to
          paid switch in developer tools that puts the paid things
          behind a virtual wall so I am able to use the app in free
          mode to see what the user would see." Changes nothing that
          is stored; lib/paidFeatures.ts says what is paid. */}
      <Text style={styles.helpText}>
        Use this device as Free or as Paid. On Free, every lens that comes with a plan shows a
        small key in its menu and opens on a page saying what the plan gives, so you see the app
        the way somebody on Free will. Nothing you have recorded changes either way.
      </Text>
      <View style={styles.pillRow}>
        {(['free', 'paid'] as const).map((value) => {
          const on = tier === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.pill, on && styles.pillActive]}
              onPress={() =>
                tierSetByVersion()
                  ? explainNotYet(
                      'This window is one version of the app opened from Versions Side by Side, and the version sets whether it is Free or Paid. Open the other version from the picker to see the other side.',
                    )
                  : setTier(value)
              }
            >
              <Text style={[styles.pillText, on && styles.pillTextActive]}>{value === 'free' ? 'Free' : 'Paid'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Tell Claude, 2026-09-22. Turning this on puts a long press on
          every fold band in the app and a small button against the left
          edge, either of which writes a note about wherever you are. It
          sits in this card because this card renders nothing at all in a
          store release, which is what "for development purposes only"
          means here. */}
      <Text style={styles.helpText}>
        Tell Claude: long press any band to leave a note about it, or use the button against
        the left edge for anything that is not a band, which is also how it works in the
        Windows app where there is no long press. A note remembers which device you were on,
        the version, and which tab, lens and band you were looking at. The button also offers
        Edit wording, which underlines every piece of text so you can tap it and change the
        words right there.
      </Text>
      <View style={styles.pillRow}>
        {[false, true].map((value) => {
          const on = visualPrefs.developerNotes === value;
          return (
            <TouchableOpacity
              key={value ? 'on' : 'off'}
              style={[styles.pill, on && styles.pillActive]}
              onPress={() => {
                void setVisualPreferences({ developerNotes: value });
              }}
            >
              <Text style={[styles.pillText, on && styles.pillTextActive]}>{value ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {visualPrefs.developerNotes ? (
        <>
          {/* Edit wording, 1.0.51.12: words changed in place show on
              this device straight away, until the change ships. */}
          <Text style={styles.helpText}>
            Show my wording edits before they ship. Off shows what the app itself says. An edit
            only ever shows on the device it was made on, and goes once its change is shipped.
          </Text>
          <View style={styles.pillRow}>
            {[false, true].map((value) => {
              const on = visualPrefs.developerNotesPreview === value;
              return (
                <TouchableOpacity
                  key={value ? 'on' : 'off'}
                  style={[styles.pill, on && styles.pillActive]}
                  onPress={() => {
                    void setVisualPreferences({ developerNotesPreview: value });
                  }}
                >
                  <Text style={[styles.pillText, on && styles.pillTextActive]}>{value ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helpText}>{summariseDevNotes(devNotes)}</Text>
          {devNotesMessage ? <Text style={styles.helpText}>{devNotesMessage}</Text> : null}
          <TouchableOpacity
            style={styles.addAllergyButton}
            disabled={devNotesBusy}
            onPress={async () => {
              setDevNotesBusy(true);
              try {
                const result = await syncDevNotes();
                setDevNotes(await listDevNotes());
                setDevNotesMessage(
                  result.problem
                    ? result.problem
                    : `Sent ${result.published}, and took back ${result.answered} answer(s).`,
                );
              } catch (error) {
                console.error('[tellClaude] could not send the notes', error);
                setDevNotesMessage('Could not reach the folder.');
              } finally {
                setDevNotesBusy(false);
              }
            }}
          >
            <Text style={styles.addAllergyButtonText}>
              {devNotesBusy ? 'Working…' : 'Send the Notes'}
            </Text>
          </TouchableOpacity>
          {devNotes.some((note) => note.status === 'done') ? (
            <TouchableOpacity
              style={styles.addAllergyButton}
              disabled={devNotesBusy}
              onPress={async () => {
                setDevNotesBusy(true);
                try {
                  const cleared = await clearShippedDevNotes();
                  setDevNotes(await listDevNotes());
                  setDevNotesMessage(`Cleared ${cleared}. The file keeps every one of them.`);
                } catch (error) {
                  console.error('[tellClaude] could not clear the notes', error);
                  setDevNotesMessage('Could not clear those.');
                } finally {
                  setDevNotesBusy(false);
                }
              }}
            >
              <Text style={styles.addAllergyButtonText}>Clear the Shipped Ones</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
      {/* Tester plan T12: approving testers, and sending this device's
          approval key so the tester version accepts what it signs. */}
      <Text style={styles.helpText}>
        Testers ask for access by email. Open the link in their email here, or paste it into Approve a Tester. This device&apos;s approvals
        open the tester version once its key has been sent and added.
      </Text>
      {testerKeyMessage ? <Text style={styles.helpText}>{testerKeyMessage}</Text> : null}
      <TouchableOpacity style={styles.addAllergyButton} onPress={() => router.push('/approve')}>
        <Text style={styles.addAllergyButtonText}>Approve a Tester</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addAllergyButton}
        disabled={testerKeyBusy}
        onPress={async () => {
          setTesterKeyBusy(true);
          try {
            const mine = await getMyApprovalKey();
            if (mine.trusted) {
              setTesterKeyMessage('This device\'s key is already in the tester version.');
              return;
            }
            const problem = await sendMyApprovalKey();
            setTesterKeyMessage(problem ? `Kept as a note, but not sent yet: ${problem}` : 'Sent as a note for Claude, who adds it to the tester version in the next update.');
          } catch (error) {
            console.error('[testerApprove] could not send the approval key', error);
            setTesterKeyMessage('Could not send the key.');
          } finally {
            setTesterKeyBusy(false);
          }
        }}
      >
        <Text style={styles.addAllergyButtonText}>{testerKeyBusy ? 'Working…' : 'Send My Approval Key to Claude'}</Text>
      </TouchableOpacity>
      {/* C8: the sorting suggestions checked against every note already
          sorted, each left out in turn. */}
      <TouchableOpacity
        style={styles.addAllergyButton}
        onPress={async () => {
          try {
            setSuggestCheck(describeLeaveOneOut(await checkSuggestionsAgainstSorted()));
          } catch (error) {
            console.error('[captureSuggest] could not run the check', error);
            setSuggestCheck('Could not read the sorted notes.');
          }
        }}
      >
        <Text style={styles.addAllergyButtonText}>Check Sorting Suggestions</Text>
      </TouchableOpacity>
      {suggestCheck ? <Text style={styles.helpText}>{suggestCheck}</Text> : null}
      <Text style={styles.helpText}>
        Shown in development and on the preview channel, never in a store release. Everything
        seeded here carries a [TEST] prefix. The 90-day span covers meals (60 past days already
        logged, today&apos;s breakfast/lunch/snack, 30 upcoming days still planned, cycling
        through several combinations rather than one fixed set), a handful of saved
        sides/salads/etc., and a few food trials in different states, so Past Meals, Trends, and
        Signals have something to look at; it takes a while. Health &amp; Reminders seeds thirty
        days of check-ins, a weight series, blood pressure, two lab draws, two personal rules,
        a prescription with a dose due three minutes from now, and an appointment tomorrow, so
        Pattern Finder, the Report, and the Meds and Appointments lenses have something to
        show and a reminder to fire. Clear removes exactly what these tools created, nothing else.
      </Text>
      <TouchableOpacity
        style={styles.addAllergyButton}
        disabled={seedingKitchen}
        onPress={async () => {
          setSeedingKitchen(true);
          try {
            const seeded = await seedKitchenSources();
            const lines = [
              `${seeded.gardenHarvests} garden harvest(s), ${seeded.fermentationHarvests} fermentation harvest(s), ${seeded.purchasedLines} line(s) on a past shopping trip.`,
            ];
            if (seeded.matchedFoods.length > 0) {
              lines.push(`Open your grocery list and look at: ${seeded.matchedFoods.join(', ')}.`);
            }
            // Whatever could not be seeded is said plainly rather than
            // left to look like the feature failing later.
            for (const note of seeded.skipped) lines.push(note);
            showAlert('Seeded', lines.join('\n\n'));
          } catch (error) {
            showAlert(
              'Something went wrong',
              error instanceof Error ? error.message : 'Failed to seed kitchen sources.',
            );
          } finally {
            setSeedingKitchen(false);
          }
        }}
      >
        <Text style={styles.addAllergyButtonText}>
          {seedingKitchen ? 'Seeding…' : 'Seed Kitchen Sources (Garden, Ferments, Past Shop)'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addAllergyButton}
        disabled={seedingTestWeek}
        onPress={async () => {
          setSeedingTestWeek(true);
          try {
            await seedTest90Days();
            showAlert('Seeded', 'A 90-day span of test data has been created.');
          } catch (error) {
            showAlert(
              'Something went wrong',
              error instanceof Error ? error.message : 'Failed to seed test data.',
            );
          } finally {
            setSeedingTestWeek(false);
          }
        }}
      >
        <Text style={styles.addAllergyButtonText}>{seedingTestWeek ? 'Seeding, this can take a while…' : 'Seed 90 Days of Test Data'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addAllergyButton}
        disabled={seedingHealth}
        onPress={async () => {
          setSeedingHealth(true);
          try {
            const seeded = await seedHealthTestData();
            const lines = [
              `${seeded.checkins} check-ins, ${seeded.measurements} weight and blood pressure readings, ${seeded.labResults} lab results, ${seeded.rules} personal rules, one prescription with doses, one appointment.`,
              `Dose reminder set for ${seeded.doseReminderAt.slice(11)} today; appointment reminder an hour before ${seeded.appointmentAt.replace('T', ' ')}.`,
            ];
            if (seeded.reminderPermission === 'granted') {
              lines.push(`${seeded.pendingReminders} reminder(s) are pending on the phone. Leave the app and watch for the dose.`);
            } else if (seeded.reminderPermission === 'denied') {
              lines.push('Notifications are not allowed for this app, so no reminder can fire. Allow them in the phone\'s app settings, then open Schedules once.');
            } else {
              lines.push('Reminders are not available on this platform.');
            }
            showAlert('Seeded', lines.join('\n\n'));
          } catch (error) {
            showAlert(
              'Something went wrong',
              error instanceof Error ? error.message : 'Failed to seed health test data.',
            );
          } finally {
            setSeedingHealth(false);
          }
        }}
      >
        <Text style={styles.addAllergyButtonText}>{seedingHealth ? 'Seeding…' : 'Seed Health & Reminders Test Data'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.clearButton}
        disabled={clearingSeededData}
        onPress={async () => {
          setClearingSeededData(true);
          try {
            const { deletedCount } = await clearSeededTestData();
            showAlert('Cleared', `Removed ${deletedCount} seeded record(s).`);
          } catch (error) {
            showAlert(
              'Something went wrong',
              error instanceof Error ? error.message : 'Failed to clear seeded test data.',
            );
          } finally {
            setClearingSeededData(false);
          }
        }}
      >
        <Text style={styles.clearButtonText}>
          {clearingSeededData ? 'Clearing...' : 'Clear Seeded Test Data'}
        </Text>
      </TouchableOpacity>
      <VoiceoverRecorder />
    </View>
  );
}
