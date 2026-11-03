// Choosing the one Shared Folder everything the app keeps in OneDrive lives in.
//
// ONE FOLDER, NOT TWO. An earlier pass asked for a mailbox folder and a backup
// folder to be picked separately, which put the person in charge of a layout the
// app should keep itself. Now one folder is chosen and the app makes and owns
// what goes inside it:
//
//   Shared Folder
//   |- Mailbox     where every person's mailbox lives, partner and later child
//   |- Backups     where backups are written
//
// SET UP BEFORE ANYBODY IS ADDED. This is not a step that belongs to pairing. It
// is set up when the app is first opened, whether or not there is ever a partner,
// because backups need it just as much as a mailbox does.
//
// A REAL PICKER, WHICH IS THE WHOLE POINT. An earlier attempt asked somebody to
// type a folder's name, which told the app nothing it could open. This browses
// the actual account and hands back an address the app can write to and read
// from.
//
// TWO STARTING POINTS, AND BOTH ARE NEEDED. A folder somebody else shared with
// you does not appear anywhere in your own OneDrive; it sits under Shared with me
// and physically lives in their drive. Whoever MADE the folder finds it under
// their own files instead.
//
// ON A COMPUTER THERE IS NO SIGN-IN AND ONE STARTING POINT. The OneDrive
// client on the machine is already signed in and keeps its folder on the
// disk, so the picker starts inside that folder (lib/desktop/cloudFolder.ts
// finds it), a shared folder is whatever the person added to their own
// OneDrive, and the operating system's folder dialog is offered beside the
// listing for anyone who would rather point at the folder directly. The
// sign-in and sign-out cards are not shown, because there is nothing to sign
// in to: the 2026-09-21 report was a sign-in page that "kept waiting and
// waiting and never completed", since Microsoft's redirect had nowhere to
// land on a PC.
//
// ON A PHONE THERE IS A THIRD WAY: A FOLDER ON THE PHONE (2026-11-03). For
// anyone whose files live somewhere other than OneDrive, Android's own
// folder picker chooses a folder that another app keeps in step with their
// storage (lib/phoneFolder.ts). It needs no sign-in here, so it is offered
// whether or not OneDrive is signed in, and signing out of OneDrive leaves
// it alone.
//
// AND ON BOTH, GOOGLE DRIVE (1.0.80.6). Google's narrowest permission lets
// the app see only what it made, so there is nothing to browse: Use Google
// Drive signs in and makes or finds Google Drive / Lifestead, the same
// folder on every device signed in to that Google account. Signing out of
// OneDrive leaves it alone, and signing out of Google clears it.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppTextInput } from '../components/AppTextInput';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { CalmBands, HOME_BAND_ACCENT_WIDTH, HOME_BAND_CONTENT_PADDING, homeBandNoHairlines, homeBandStyle } from '../components/HomeSectionBand';
import { getOneDriveFolder, setMailboxFolderName, setOneDriveFolder } from '../lib/db';
import { isDesktopApp } from '../lib/desktop/bridge';
import { explainNotYet } from '../lib/notYet';
import { pickFolder } from '../lib/desktop/cloudFolder';
import { isPhoneFolder, pickFolder as pickPhoneFolder } from '../lib/phoneFolder';
import { isOneDriveConfigured, isSignedIn, signIn, signOut } from '../lib/oneDriveAuth';
import { isGoogleFolder } from '../lib/googleDrive';
import {
  googleDriveUnavailableReason,
  isGoogleDriveAvailable,
  isGoogleSignedIn,
  signInToGoogle,
  signOutOfGoogle,
} from '../lib/googleDriveAuth';
import {
  adoptDefaultFolderIfNone,
  BACKUPS_FOLDER_NAME,
  chooseGoogleFolder,
  forgetResolvedFolders,
  GOOGLE_FOLDER_SENTENCE,
  getSharedFolder,
  MAILBOX_FOLDER_NAME,
  prepareSharedFolder,
  SHARED_FOLDER_CHILDREN_SENTENCE,
} from '../lib/oneDriveFolders';
import {
  createFolder,
  listChildFolders,
  listMyRootFolders,
  listSharedFolders,
  type DriveItemRef,
} from '../lib/oneDriveGraph';
import { ONEDRIVE_NOT_CONFIGURED } from '../lib/oneDriveConfig';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT } from '../constants/buttons';

/** Where the listing came from, so Back knows what to go back to. */
type Root = 'shared' | 'mine';

export default function OneDriveFolderScreen() {
  const router = useRouter();
  const scrollPadding = useFloatingButtonScrollPadding();
  const desktop = isDesktopApp();

  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // A computer has no Shared with me: a folder somebody shared sits inside
  // the OneDrive folder on the disk once the person adds it to their files.
  const [root, setRoot] = useState<Root>(desktop ? 'mine' : 'shared');
  // The path from a root down to wherever the person is now. Empty means they
  // are looking at a root listing. The last entry is the current folder, which
  // is also the one the Use button would pick.
  const [trail, setTrail] = useState<DriveItemRef[]>([]);
  const [folders, setFolders] = useState<DriveItemRef[]>([]);
  const [chosen, setChosen] = useState<DriveItemRef | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const current = trail.length > 0 ? trail[trail.length - 1] : null;
  const usingPhoneFolder = isPhoneFolder(chosen);
  const usingGoogleFolder = isGoogleFolder(chosen);
  // A folder that answers to no OneDrive sign-in.
  const usingOtherFolder = usingPhoneFolder || usingGoogleFolder;

  const load = useCallback(async (nextRoot: Root, nextTrail: DriveItemRef[]) => {
    setBusy(true);
    const parent = nextTrail.length > 0 ? nextTrail[nextTrail.length - 1] : null;
    const result = parent
      ? await listChildFolders(parent)
      : nextRoot === 'shared'
        ? await listSharedFolders()
        : await listMyRootFolders();
    setBusy(false);
    if (!result.ok) {
      setFolders([]);
      setNote(result.reason);
      return;
    }
    setFolders(result.value);
  }, []);

  /**
   * Brings the stored folder back in line with what OneDrive says about it.
   *
   * A folder renamed or moved since it was picked otherwise shows as something
   * that does not match what the person sees in OneDrive, which is exactly the
   * confusion showing a path was meant to remove. getSharedFolder does the
   * checking, and on a computer it also reads a folder chosen on a phone back
   * into the same folder on this disk. A folder that cannot be reached right
   * now is kept and the reason shown: losing the choice over one failed
   * request would be worse than a slightly stale name.
   */
  const refreshStored = useCallback(async (saved: DriveItemRef | null): Promise<DriveItemRef | null> => {
    if (!saved) return null;
    const shared = await getSharedFolder();
    if (shared.state === 'ready') return shared.folder;
    if (shared.state === 'unreachable') setNote(shared.reason);
    return saved;
  }, []);

  useEffect(() => {
    void (async () => {
      const [alreadySignedIn, saved, google] = await Promise.all([isSignedIn(), getOneDriveFolder(), isGoogleSignedIn()]);
      setSignedIn(alreadySignedIn);
      setGoogleSignedIn(google);
      setChosen(saved);
      if (!alreadySignedIn) {
        if (isPhoneFolder(saved) || isGoogleFolder(saved)) setChosen(await refreshStored(saved));
        return;
      }
      const currentFolder = await refreshStored(saved);
      setChosen(currentFolder);
      if (!currentFolder) {
        // Nothing chosen yet, so the app makes Apps / Lifestead rather than
        // asking somebody to build a layout it keeps itself.
        const made = await adoptDefaultFolderIfNone();
        if (made) {
          setChosen(made.folder);
          setNote(made.note);
        }
      }
      if (desktop) {
        // Start inside the OneDrive folder itself when there is one, since
        // a listing that says only "OneDrive" is a tap for nothing. Two
        // roots (a personal account and a work one) are listed to choose
        // between.
        const roots = await listMyRootFolders();
        if (roots.ok && roots.value.length === 1) {
          setTrail([roots.value[0]]);
          await load('mine', [roots.value[0]]);
          return;
        }
      }
      await load(desktop ? 'mine' : 'shared', []);
    })();
  }, [desktop, load, refreshStored]);

  const handleSignIn = async () => {
    setBusy(true);
    const result = await signIn();
    setBusy(false);
    if (!result.ok) {
      setNote(result.reason);
      return;
    }
    setSignedIn(true);
    const made = await adoptDefaultFolderIfNone();
    if (made) {
      setChosen(made.folder);
      setNote(made.note);
    }
    await load(root, []);
  };

  const handleSignOut = async () => {
    await signOut();
    setSignedIn(false);
    setFolders([]);
    setTrail([]);
    if (usingPhoneFolder) {
      // A folder on this phone never needed OneDrive, so it stays.
      setNote('Signed out of OneDrive. Your shared folder is on this phone, so it is still in use.');
      return;
    }
    if (usingGoogleFolder) {
      setNote('Signed out of OneDrive. Your shared folder is in Google Drive, so it is still in use.');
      return;
    }
    // The folder goes with the account. Leaving an address behind that nothing
    // can open would show a folder that is set up and refuses every write, which
    // is worse than plainly showing nothing is set up.
    await setOneDriveFolder(null);
    await setMailboxFolderName(null);
    forgetResolvedFolders();
    setChosen(null);
    setNote('Signed out of OneDrive. The shared folder was cleared with it.');
  };

  /** Signs in to Google when needed, then makes or finds Google Drive / Lifestead. */
  const handleUseGoogle = async () => {
    if (!isGoogleDriveAvailable()) return explainNotYet(googleDriveUnavailableReason());
    setBusy(true);
    setNote(null);
    if (!googleSignedIn) {
      const signedInNow = await signInToGoogle();
      if (!signedInNow.ok) {
        setBusy(false);
        setNote(signedInNow.reason);
        return;
      }
      setGoogleSignedIn(true);
    }
    const used = await chooseGoogleFolder();
    setBusy(false);
    if (!used.ok) {
      setNote(used.reason);
      return;
    }
    setChosen(used.folder);
    setNote(used.note);
  };

  const handleGoogleSignOut = async () => {
    await signOutOfGoogle();
    setGoogleSignedIn(false);
    const ending =
      ' To take away Lifestead\'s access completely, remove it under Security in your Google Account. Your files stay in Google Drive.';
    if (!usingGoogleFolder) {
      setNote('Signed out of Google Drive.' + ending);
      return;
    }
    // The same reason as OneDrive: an address nothing can open is worse than
    // plainly showing nothing is set up.
    await setOneDriveFolder(null);
    await setMailboxFolderName(null);
    forgetResolvedFolders();
    setChosen(null);
    setNote('Signed out of Google Drive. The shared folder was cleared with it.' + ending);
  };

  const handleSwitchRoot = async (nextRoot: Root) => {
    setRoot(nextRoot);
    setTrail([]);
    setNote(null);
    await load(nextRoot, []);
  };

  const handleOpen = async (folder: DriveItemRef) => {
    const nextTrail = [...trail, folder];
    setTrail(nextTrail);
    setNote(null);
    await load(root, nextTrail);
  };

  const handleBack = async () => {
    const nextTrail = trail.slice(0, -1);
    setTrail(nextTrail);
    setNote(null);
    await load(root, nextTrail);
  };

  const adoptFolder = async (folder: DriveItemRef, nextTrail: DriveItemRef[]) => {
    setBusy(true);
    await setOneDriveFolder(folder);
    // The name is written too, and not as a duplicate. It is what travels in a
    // pairing code so the other phone can say which folder it means. The address
    // is what this app opens; the name is what a person reads.
    await setMailboxFolderName(folder.name);
    setChosen(folder);
    forgetResolvedFolders();
    // Made now rather than on first use, so somebody can open OneDrive straight
    // afterwards and see the shape they were told about.
    const prepared = await prepareSharedFolder();
    setBusy(false);
    setNote(
      prepared.ok
        ? 'Using ' + folder.name + '. ' + SHARED_FOLDER_CHILDREN_SENTENCE + ' are ready inside it.'
        : 'Using ' + folder.name + ', but its folders could not be made yet. ' + (prepared.reason ?? ''),
    );
    // A folder on this phone was chosen in Android's picker, so there is no
    // OneDrive listing to move to.
    if (!isPhoneFolder(folder)) await load(root, nextTrail);
  };

  const handleUse = async () => {
    if (!current) return;
    await adoptFolder(current, trail);
  };

  /**
   * The operating system's folder dialog, on a computer only.
   *
   * The folder it hands back is used straight away and the listing moves
   * there, so what is on the screen is what was just chosen.
   */
  const handleChooseFolder = async () => {
    const picked = await pickFolder();
    if (!picked.ok) {
      setNote(picked.reason);
      return;
    }
    if (!picked.value) return;
    const nextTrail = [picked.value];
    setTrail(nextTrail);
    setRoot('mine');
    await adoptFolder(picked.value, nextTrail);
  };

  /**
   * Android's folder picker, for a folder another app keeps in step with
   * wherever the person stores their files.
   */
  const handleChoosePhoneFolder = async () => {
    const picked = await pickPhoneFolder();
    if (!picked.ok) {
      setNote(picked.reason);
      return;
    }
    if (!picked.value) return;
    await adoptFolder(picked.value, []);
  };

  const handleCreate = async () => {
    const name = newFolderName.trim();
    if (!name) return explainNotYet('Type a name for the new folder first.');
    if (!current) {
      // A root listing is not a folder, so there is nowhere to put a new one.
      // Shared with me especially is a view rather than a place.
      setNote('Open a folder first. A new folder has to go inside one.');
      return;
    }
    setBusy(true);
    const result = await createFolder(current, name);
    setBusy(false);
    if (!result.ok) {
      setNote(result.reason);
      return;
    }
    setNewFolderName('');
    await load(root, trail);
    setNote('Made ' + result.value.name + '. Open it and tap Use to make it your shared folder.');
  };

  if (!isOneDriveConfigured()) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
        <View style={styles.card}>
          <Text style={styles.hint}>{ONEDRIVE_NOT_CONFIGURED}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <CalmBands>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
        <View style={styles.card}>
          <Text style={styles.label}>Your shared folder</Text>
          <Text style={styles.hint}>
            One folder holding everything this app keeps there. Set it up once, whether or not you ever add anyone,
            because backups need it too.
          </Text>
          {/* Signed out, nothing is in use, whatever is remembered. The choice is
              kept (a sign-in Microsoft stopped honouring leaves it in place) so
              signing back in picks it up, and the sign-in card says so. */}
          {signedIn === false && !usingOtherFolder ? (
            <Text style={styles.hint}>Not signed in to OneDrive, so no folder is in use on this device.</Text>
          ) : chosen ? (
            <>
              <Text style={styles.chosen}>Currently using: {chosen.name}</Text>
              {/* The full path, because two folders can be called Lifestead and
                  a name on its own cannot tell them apart. */}
              <Text style={styles.pathText}>{chosen.path ?? 'OneDrive, in a folder shared with you.'}</Text>
              {/* What the app puts inside it, named plainly rather than left to be
                  discovered in OneDrive. */}
              <Text style={styles.hint}>
                Inside it: {MAILBOX_FOLDER_NAME}, where everyone&apos;s mail lives, and {BACKUPS_FOLDER_NAME}, where your
                backups are written. The app makes both.
              </Text>
              {/* Said once, plainly, because it is the consequence somebody is
                  least likely to have thought through. */}
              <Text style={styles.warning}>
                {usingPhoneFolder
                  ? 'Anything in this folder is visible to whoever can see it where your storage app keeps it, and that includes your backups.'
                  : usingGoogleFolder
                    ? 'Anything in this folder is visible to whoever you share it with in Google Drive, and that includes your backups.'
                    : 'Anything in this folder is visible to whoever you share it with in OneDrive, and that includes your backups.'}
              </Text>
              {usingPhoneFolder ? (
                <Text style={styles.hint}>
                  The app that keeps this folder in step decides when it reaches your storage, so a change here reaches
                  your other device as soon as that app has carried it across.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.hint}>Nothing set up yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Google Drive</Text>
          <Text style={styles.hint}>
            The app makes one folder, {GOOGLE_FOLDER_SENTENCE}, and works only inside it. Google is asked for the
            narrowest permission it has: Lifestead can see the files it made and nothing else in your Drive.
          </Text>
          <Text style={styles.hint}>
            For two devices, sign in to the same Google account on both and tap Use Google Drive on each. To share with
            another person, use Connections rather than sharing this folder, since the app cannot see a folder somebody
            else made.
          </Text>
          {usingGoogleFolder ? (
            <Text style={styles.hint}>In use now.</Text>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleUseGoogle} disabled={busy}>
              <Ionicons name="logo-google" size={18} color={colors.textOnButton} />
              <Text style={styles.primaryButtonText}>Use Google Drive</Text>
            </TouchableOpacity>
          )}
          {googleSignedIn ? (
            <TouchableOpacity onPress={handleGoogleSignOut} hitSlop={8} disabled={busy}>
              <Text style={styles.action}>Sign Out of Google Drive</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {signedIn === false ? (
          <View style={styles.card}>
            <Text style={styles.label}>Sign in to OneDrive</Text>
            {/* Said before sending anybody to the consent screen rather than
                leaving Microsoft's wording to explain it. Asking for access to
                everything and using one folder is a real gap between what is
                granted and what is used, and it should be stated by the side
                doing the asking. */}
            <Text style={styles.hint}>
              Microsoft will ask you to allow access to your files. It has no narrower permission that can reach a folder
              somebody else shared with you, and a folder only you can see cannot hold a mailbox.
            </Text>
            <Text style={styles.hint}>
              What this app does with it: list your folders so you can pick one, then read and write inside the one you
              pick. It never looks anywhere else.
            </Text>
            {chosen ? (
              <Text style={styles.hint}>Once you are signed in, the app goes back to the folder you used before.</Text>
            ) : null}
            <TouchableOpacity style={styles.primaryButton} onPress={handleSignIn} disabled={busy}>
              <Ionicons name="cloud-outline" size={18} color={colors.textOnButton} />
              <Text style={styles.primaryButtonText}>Sign In to OneDrive</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {desktop ? null : (
          <View style={styles.card}>
            <Text style={styles.label}>A folder on this phone</Text>
            <Text style={styles.hint}>
              For files kept anywhere other than OneDrive or Google Drive: Dropbox, Box, MEGA, pCloud, a Nextcloud, or a
              computer at home.
              Install an app that keeps a folder on this phone in step with that storage, such as Syncthing, FolderSync or
              Autosync, then choose that folder here. No sign-in is needed in Lifestead.
            </Text>
            <Text style={styles.hint}>
              Some storage apps, Dropbox among them, do not offer their folders in this list. Android also
              will not hand over the top of the phone&apos;s storage or the Download folder itself, so choose a folder inside
              one.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleChoosePhoneFolder} disabled={busy}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.textOnButton} />
              <Text style={styles.primaryButtonText}>Choose a Folder on This Phone</Text>
            </TouchableOpacity>
          </View>
        )}

        {signedIn ? (
          <>
            <View style={styles.card}>
              {desktop ? (
                <>
                  <Text style={styles.label}>OneDrive on this computer</Text>
                  <Text style={styles.hint}>
                    The folder OneDrive keeps on this computer, already signed in. A folder somebody shared with you is
                    in here once you add it to your OneDrive. Open one and tap Use, make one below, or choose any folder
                    with the button.
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.rootRow}>
                    <TouchableOpacity onPress={() => handleSwitchRoot('shared')} hitSlop={8}>
                      <Text style={root === 'shared' ? styles.rootActive : styles.rootInactive}>Shared with me</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSwitchRoot('mine')} hitSlop={8}>
                      <Text style={root === 'mine' ? styles.rootActive : styles.rootInactive}>My files</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hint}>
                    {root === 'shared'
                      ? 'Folders other people have shared with you. Look here if they made the folder.'
                      : 'Folders in your OneDrive. Look here if you made the folder, or make one below.'}
                  </Text>
                </>
              )}

              {trail.length > 0 ? (
                <View style={styles.trailRow}>
                  <TouchableOpacity onPress={handleBack} hitSlop={8}>
                    <Text style={styles.action}>Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.trailText} numberOfLines={2}>
                    {current?.path ?? trail.map((entry) => entry.name).join(' / ')}
                  </Text>
                </View>
              ) : null}

              {busy ? <ActivityIndicator color={colors.accent} /> : null}

              {!busy && folders.length === 0 ? (
                <Text style={styles.hint}>
                  {trail.length > 0
                    ? 'Nothing but files in here. You can still use this folder, or make one inside it.'
                    : desktop
                      ? 'OneDrive was not found on this computer. Install it and sign in, or choose a folder with the button below.'
                      : root === 'shared'
                        ? 'Nobody has shared a folder with you yet. Ask them to share one, or switch to My files and make one.'
                        : 'No folders at the top of your OneDrive.'}
                </Text>
              ) : null}

              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.driveId + ':' + folder.itemId}
                  style={styles.folderRow}
                  onPress={() => handleOpen(folder)}
                >
                  <Ionicons name="folder-outline" size={18} color={colors.accent} />
                  <Text style={styles.folderName} numberOfLines={1}>
                    {folder.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}

              {current ? (
                <TouchableOpacity style={styles.primaryButton} onPress={handleUse} disabled={busy}>
                  <Ionicons name="checkmark" size={18} color={colors.textOnButton} />
                  <Text style={styles.primaryButtonText}>Use {current.name}</Text>
                </TouchableOpacity>
              ) : null}

              {desktop ? (
                <TouchableOpacity style={styles.primaryButton} onPress={handleChooseFolder} disabled={busy}>
                  <Ionicons name="folder-open-outline" size={18} color={colors.textOnButton} />
                  <Text style={styles.primaryButtonText}>Choose a Folder</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Make a new folder</Text>
              <Text style={styles.hint}>
                Goes inside whichever folder you have open. The app can make it, but only OneDrive can share it: make it
                here, then share it with them from the OneDrive app.
              </Text>
              <AppTextInput
                style={styles.input}
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="What should it be called?"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity onPress={handleCreate} hitSlop={8} disabled={busy}>
                <Text style={styles.action}>Make It</Text>
              </TouchableOpacity>
            </View>

            {desktop ? null : (
              <View style={styles.card}>
                <TouchableOpacity onPress={handleSignOut} hitSlop={8}>
                  <Text style={styles.action}>Sign Out of OneDrive</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : null}

        {note ? (
          <View style={styles.card}>
            <Text style={styles.hint}>{note}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.card} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.action}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </CalmBands>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_ACCENT_WIDTH },
  card: {
    ...homeBandStyle,
    ...homeBandNoHairlines,
    borderColor: colors.tabProfile,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 8,
  },
  label: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  hint: { ...typography.caption, color: colors.textMuted, ...textShadow },
  chosen: { ...typography.body, color: colors.textPrimary, ...textShadow },
  // The path reads as supporting detail under the name rather than competing
  // with it, which is why it is the quieter of the two.
  pathText: { ...typography.caption, color: colors.accent, ...textShadow },
  // Not danger red: nothing here is broken or about to be lost. It is a
  // consequence of a choice, and it should be noticed without alarming.
  warning: { ...typography.caption, color: colors.statusYellowStandalone, ...textShadow },
  action: { ...typography.body, color: colors.accent, ...textShadow },
  rootRow: { flexDirection: 'row', gap: 20 },
  rootActive: { ...typography.bodyEmphasis, color: colors.accent, ...textShadow },
  rootInactive: { ...typography.body, color: colors.textMuted, ...textShadow },
  trailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trailText: { ...typography.caption, color: colors.textMuted, flex: 1, ...textShadow },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  folderName: { ...typography.body, color: colors.textPrimary, flex: 1, ...textShadow },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    ...typography.body,
  },
  primaryButton: {
    ...BUTTON_PRIMARY,
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
});
