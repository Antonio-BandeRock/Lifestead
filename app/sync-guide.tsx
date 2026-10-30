// Phone and Computer, the written steps for keeping the computer app in step
// with the phone (1.0.78.1). Direct request: "We will need instructions fully
// written for how to synch the companion app with their mobile. That should
// be added to the profile." Reached from Profile > Backup & Restore on both
// kinds of device, so either one can be the one somebody reads it on.
//
// The steps name the buttons as they are labelled on the screens they live
// on (Backup & Restore in app/profile.tsx, the folder screen in
// app/onedrive-folder.tsx, the waiting strip in
// components/SnapshotSyncWatcher.tsx). A label changed there needs its step
// changed here.

import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalmBands, HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandNoHairlines, homeBandStyle } from '../components/HomeSectionBand';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { isDesktopApp } from '../lib/desktop/bridge';

type GuideSection = { title: string; lead?: string; steps: string[] };

const SECTIONS: GuideSection[] = [
  {
    title: 'What this does',
    lead:
      'Your phone and your computer each keep a full copy of your records. Once they share one OneDrive folder and one password, ' +
      'whatever you add or change on one shows up on the other a few minutes later. The copy in the folder is locked with your password, ' +
      'so OneDrive holds it without being able to read it.',
    steps: [],
  },
  {
    title: 'Before you start',
    steps: [
      'A Microsoft account, the same one on both devices. A free account works.',
      'The OneDrive app installed on your computer and signed in with that account. Its icon sits by the clock at the bottom right of the screen.',
      'Lifestead installed on your phone and on your computer.',
    ],
  },
  {
    title: 'On your phone',
    steps: [
      'Open Profile, then Backup & Restore.',
      'Tap Set Up the Shared Folder.',
      'Tap Sign In to OneDrive and sign in with your Microsoft account.',
      'Open My files, then the Apps folder, then the Lifestead folder. If there is no Lifestead folder, type Lifestead under Make a new folder and tap Make It.',
      'Tap Use Lifestead, then go back to Backup & Restore.',
      'Tap Turn On Automatic Sync and choose a password. Write it down somewhere safe. Nobody can recover it for you, Lifestead included.',
    ],
  },
  {
    title: 'On your computer',
    steps: [
      'Wait for OneDrive to finish bringing the Lifestead folder down from the phone. Its icon by the clock stops turning when it is done.',
      'Open Lifestead, then Profile, then Backup & Restore.',
      'Click Set Up the Shared Folder. There is no sign-in on a computer, because OneDrive is already a folder on the disk.',
      'Open the Apps folder, then Lifestead, and click Use Lifestead.',
      'Back in Backup & Restore, click Turn On Automatic Sync and enter the same password you chose on the phone.',
      'When it asks which copy you want, choose Load the Copy from Your Phone. That replaces what is on the computer with your records from the phone.',
    ],
  },
  {
    title: 'Using the two after that',
    steps: [
      'One device is in use at a time. The other shows a strip across the top saying it is reading only, with Take Over Now to start using it.',
      'If the device in use has been left alone for 30 minutes, the other one can take over by itself the next time you use it.',
      'A device sends what changed three minutes after you stop, and when you put the app away. The other one brings it in the next time it checks, or straight away with Refresh Now.',
      'See Sync Activity in Backup & Restore lists everything that came across, and from which device.',
    ],
  },
  {
    title: 'If something goes wrong',
    steps: [
      'It says the folder cannot be reached: check that OneDrive is signed in on that device and that the folder has finished downloading.',
      'It will not open the copy from the other device: the passwords do not match. Turn Off Automatic Sync on the device with the wrong one, then turn it on again with the right password.',
      'You picked a different folder on each device: they cannot see each other. Use Change the Shared Folder on one of them until both show the same Apps / Lifestead folder.',
    ],
  },
];

export default function SyncGuideScreen() {
  const scrollPadding = useFloatingButtonScrollPadding();
  const here = isDesktopApp() ? 'computer' : 'phone';

  return (
    <CalmBands>
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Phone and Computer' }} />
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
          <View style={styles.card}>
            <Text style={styles.heading}>Keep your phone and computer in step</Text>
            <Text style={styles.caption}>
              {'You are reading this on your ' + here + '. Do the phone steps first, then the computer steps.'}
            </Text>
          </View>
          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.card}>
              <Text style={styles.heading}>{section.title}</Text>
              {section.lead ? <Text style={styles.body}>{section.lead}</Text> : null}
              {section.steps.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </CalmBands>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP },
  card: {
    ...homeBandStyle,
    ...homeBandNoHairlines,
    borderColor: colors.tabProfile,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 8,
  },
  heading: { ...typography.sectionTitle, color: colors.tabProfileText, fontWeight: '400', ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  stepRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepNumber: { ...typography.bodyEmphasis, color: colors.tabProfileText, fontWeight: '400', minWidth: 18, ...textShadow },
  stepText: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
});
