// Interests > Library (2026-10-30, Interests stage 4): what is read, watched,
// taken or followed for an interest, grouped by interest and then by
// Going Through It, To Read or Watch, Following and Finished. Where I Left
// Off is kept a tap away, since being able to set a thing down and pick it
// up again is the point. A page read in Capture arrives here filled in
// (fromNoteId), and keeping it marks that note done.
//
// Nothing here rates an entry or counts reading as an achievement. Every
// sentence is in lib/interestLibrary.ts, checked by
// scripts/test_interest_library.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { groupInterests, interestChoices, localDayOf, readStartedOn, type Interest } from '../lib/interests';
import { listInterests } from '../lib/interestsDb';
import {
  describeLibraryLine,
  describeLibraryProgress,
  describeStatusChange,
  groupLibrary,
  kindChoices,
  LIBRARY_KINDS,
  LIBRARY_STATUS_LABELS,
  LIBRARY_STATUSES,
  libraryFromPage,
  retiredLibrary,
  type LibraryEntry,
  type LibraryStatus,
} from '../lib/interestLibrary';
import {
  addLibraryEntry,
  deleteLibraryEntry,
  listLibrary,
  setLibraryLeftOff,
  setLibraryRetired,
  setLibraryStatus,
  updateLibraryEntry,
} from '../lib/interestLibraryDb';
import { listWebPagesForNotes } from '../lib/webCaptureDb';
import { setCaptureNoteDone } from '../lib/captureNotesDb';
import { explainNotYet } from '../lib/notYet';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

const NO_INTEREST = '__no_interest__';

type Props = {
  tabColor: string;
  /** A Capture note whose read page should open the add form, filled in. */
  fromNoteId?: string;
};

type LibraryForm = {
  id: string | null;
  interestId: string | null;
  kind: string;
  title: string;
  byWhom: string;
  link: string;
  status: LibraryStatus;
  leftOff: string;
  about: string;
  published: string;
  fromNoteId: string | null;
};

const PUBLISHED_HELP = 'That could not be read as a date. Try "2019", "March 2024" or "3 March 2024", or leave it empty.';

function emptyForm(interestId: string | null): LibraryForm {
  return {
    id: null,
    interestId,
    kind: '',
    title: '',
    byWhom: '',
    link: '',
    status: 'want',
    leftOff: '',
    about: '',
    published: '',
    fromNoteId: null,
  };
}

export function InterestLibrarySection({ tabColor, fromNoteId }: Props) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [form, setForm] = useState<LibraryForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [leftOffDraft, setLeftOffDraft] = useState<{ id: string; text: string } | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  const load = useCallback(async () => {
    setInterests(await listInterests());
    setEntries(await listLibrary());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // A page sent from Capture opens the form with what the page said about itself.
  useEffect(() => {
    if (!fromNoteId) return;
    let cancelled = false;
    (async () => {
      const [all, pages] = await Promise.all([listInterests(), listWebPagesForNotes([fromNoteId])]);
      const page = pages.get(fromNoteId);
      if (cancelled || !page) return;
      const live = groupInterests(all).current;
      const filled = libraryFromPage(page);
      setFormError(null);
      setForm({ ...emptyForm(live.length === 1 ? live[0].id : null), ...filled, fromNoteId });
    })();
    return () => {
      cancelled = true;
    };
  }, [fromNoteId]);

  const today = localDayOf(new Date().toISOString());
  const walkMark = useWalkMark();
  const { current } = groupInterests(interests);
  const nameOf = (id: string) => interests.find((interest) => interest.id === id)?.name ?? 'An interest no longer listed';
  const groups = groupLibrary(entries, nameOf);
  const retired = retiredLibrary(entries);
  const firstEntryId = groups[0]?.statuses[0]?.entries[0]?.id;
  const kinds = kindChoices(
    LIBRARY_KINDS,
    entries.map((entry) => entry.kind),
  );

  async function afterChange(message: string | null) {
    setSaidBack(message);
    await load();
  }

  function startAdd() {
    if (current.length === 0) {
      explainNotYet('Everything here belongs to an interest. Add one on My Interests first, then come back here.');
      return;
    }
    setFormError(null);
    setForm(emptyForm(current.length === 1 ? current[0].id : null));
  }

  function startChange(entry: LibraryEntry) {
    setFormError(null);
    setForm({
      id: entry.id,
      interestId: entry.interestId,
      kind: entry.kind ?? '',
      title: entry.title,
      byWhom: entry.byWhom ?? '',
      link: entry.link ?? '',
      status: entry.status,
      leftOff: entry.leftOff ?? '',
      about: entry.about ?? '',
      published: entry.published ?? '',
      fromNoteId: entry.fromNoteId,
    });
  }

  async function saveForm() {
    if (!form) return;
    if (!form.interestId) {
      explainNotYet('Pick the interest this belongs to first.');
      return;
    }
    if (!form.title.trim()) {
      explainNotYet('Give it a title first: the name of the book, the channel, the course.');
      return;
    }
    const published = readStartedOn(form.published, today);
    if (!published.ok) {
      setFormError(PUBLISHED_HELP);
      return;
    }
    const input = {
      interestId: form.interestId,
      kind: form.kind,
      title: form.title,
      byWhom: form.byWhom,
      link: form.link,
      status: form.status,
      leftOff: form.leftOff,
      about: form.about,
      published: published.startedOn,
      fromNoteId: form.fromNoteId,
    };
    const title = form.title.trim();
    if (form.id) {
      await updateLibraryEntry(form.id, input);
      setForm(null);
      await afterChange(`${title}: changed.`);
      return;
    }
    await addLibraryEntry(input);
    if (form.fromNoteId) await setCaptureNoteDone(form.fromNoteId, true).catch(() => undefined);
    setForm(null);
    await afterChange(
      form.fromNoteId
        ? `${title}: kept under ${nameOf(form.interestId)}, and its Capture note is marked done.`
        : `${title}: kept under ${nameOf(form.interestId)}.`,
    );
  }

  async function moveTo(entry: LibraryEntry, status: LibraryStatus) {
    if (entry.status === status) return;
    await setLibraryStatus(entry.id, status);
    await afterChange(describeStatusChange(entry.title, status));
  }

  async function keepLeftOff() {
    if (!leftOffDraft) return;
    const entry = entries.find((one) => one.id === leftOffDraft.id);
    await setLibraryLeftOff(leftOffDraft.id, leftOffDraft.text);
    setLeftOffDraft(null);
    await afterChange(entry ? `${entry.title}: where you left off is kept.` : null);
  }

  function openLink(address: string) {
    Linking.openURL(address).catch(() => explainNotYet('That link could not be opened. Change it to a full address starting with https://.'));
  }

  async function retire(entry: LibraryEntry, retiredNow: boolean) {
    setOpenId(null);
    await setLibraryRetired(entry.id, retiredNow);
    await afterChange(
      retiredNow ? `${entry.title} is under No Longer Part of It, with everything it had.` : `${entry.title} is back.`,
    );
  }

  function askRemove(entry: LibraryEntry) {
    setConfirm({
      title: `Remove ${entry.title}?`,
      message: 'It comes off the library for good. If it is no longer part of this interest, No Longer Part of It keeps it with its history instead.',
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            setOpenId(null);
            await deleteLibraryEntry(entry.id);
            await afterChange(`${entry.title}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function renderLibraryPills<T extends string>(choices: readonly T[], label: (choice: T) => string, isOn: (choice: T) => boolean, onPick: (choice: T) => void) {
    return (
      <View style={styles.pillRow}>
        {choices.map((choice) => {
          const on = isOn(choice);
          return (
            <TouchableOpacity
              key={choice}
              style={[styles.pill, on && styles.pillActive]}
              onPress={() => onPick(choice)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{label(choice)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderForm() {
    if (!form) return null;
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <Text style={styles.captionText}>Which interest</Text>
        <PopoverSelect
          options={[{ label: 'Pick an interest', value: NO_INTEREST }, ...interestChoices(interests, form.interestId)]}
          selected={form.interestId ?? NO_INTEREST}
          onSelect={(value) => setForm({ ...form, interestId: value === NO_INTEREST ? null : value })}
          tabColor={tabColor}
          searchable
          width={260}
        />
        <AppTextInput
          style={styles.textInput}
          value={form.title}
          onChangeText={(title) => setForm({ ...form, title })}
          placeholder="The title: a book, a channel, a course"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.kind}
          onChangeText={(kind) => setForm({ ...form, kind })}
          placeholder="What kind (optional): a book, a podcast"
        />
        {renderLibraryPills(
          kinds,
          (kind) => kind,
          (kind) => form.kind.trim().toLowerCase() === kind.toLowerCase(),
          (kind) => setForm({ ...form, kind: form.kind.trim().toLowerCase() === kind.toLowerCase() ? '' : kind }),
        )}
        <Text style={styles.captionText}>Where it stands</Text>
        {renderLibraryPills(
          LIBRARY_STATUSES,
          (status) => LIBRARY_STATUS_LABELS[status],
          (status) => form.status === status,
          (status) => setForm({ ...form, status }),
        )}
        {form.status === 'going' || form.status === 'following' ? (
          <AppTextInput
            style={styles.textInput}
            value={form.leftOff}
            onChangeText={(leftOff) => setForm({ ...form, leftOff })}
            placeholder="Where you left off (optional): page 120, episode 4"
          />
        ) : null}
        <AppTextInput
          style={styles.textInput}
          value={form.byWhom}
          onChangeText={(byWhom) => setForm({ ...form, byWhom })}
          placeholder="By whom (optional)"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.published}
          onChangeText={(published) => setForm({ ...form, published })}
          placeholder="When it came out (optional): 2019, March 2024"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.link}
          onChangeText={(text) => setForm({ ...form, link: text })}
          placeholder="A link (optional)"
          autoCapitalize="none"
          keyboardType="url"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.about}
          onChangeText={(about) => setForm({ ...form, about })}
          placeholder="Anything about it (optional)"
          multiline
        />
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('library.save')} style={styles.primaryButton} onPress={saveForm}>
            <Text style={styles.primaryButtonText}>{form.id ? 'Save' : 'Keep It'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderLibraryEntry(entry: LibraryEntry) {
    const open = openId === entry.id;
    const first = entry.id === firstEntryId;
    if (form?.id === entry.id) return <View key={entry.id}>{renderForm()}</View>;
    const line = describeLibraryLine(entry);
    const progress = describeLibraryProgress(entry);
    const drafting = leftOffDraft?.id === entry.id;
    return (
      <View key={entry.id} style={[styles.entryBlock, { borderLeftColor: tabColor }]}>
        <TouchableOpacity
          ref={first ? walkMark.ref('library.row') : undefined}
          onPress={() => setOpenId(open ? null : entry.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <View style={styles.itemText}>
            <Text style={styles.bodyText}>{entry.title}</Text>
            {line ? <Text style={styles.captionText}>{line}</Text> : null}
            {progress ? <Text style={styles.captionText}>{progress}</Text> : null}
            {open && entry.about ? <Text style={styles.captionText}>{entry.about}</Text> : null}
          </View>
        </TouchableOpacity>
        {open ? (
          <>
            <View ref={first ? walkMark.ref('library.status') : undefined}>
              {renderLibraryPills(
                LIBRARY_STATUSES,
                (status) => LIBRARY_STATUS_LABELS[status],
                (status) => entry.status === status,
                (status) => void moveTo(entry, status),
              )}
            </View>
            {drafting ? (
              <View style={styles.inlineForm}>
                <AppTextInput
                  style={styles.textInput}
                  value={leftOffDraft.text}
                  onChangeText={(text) => setLeftOffDraft({ id: entry.id, text })}
                  placeholder="Page 120, episode 4, chapter 3"
                  autoFocus
                />
                <ThumbRow primary="first" style={styles.actionRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={() => void keepLeftOff()}>
                    <Text style={styles.primaryButtonText}>Keep It</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setLeftOffDraft(null)}>
                    <Text style={styles.linkText}>Cancel</Text>
                  </TouchableOpacity>
                </ThumbRow>
              </View>
            ) : null}
            <View style={styles.links}>
              {entry.status !== 'done' && !drafting ? (
                <TouchableOpacity
                  ref={first ? walkMark.ref('library.leftOff') : undefined}
                  onPress={() => setLeftOffDraft({ id: entry.id, text: entry.leftOff ?? '' })}
                >
                  <Text style={styles.linkText}>Where I Left Off</Text>
                </TouchableOpacity>
              ) : null}
              {entry.link ? (
                <TouchableOpacity onPress={() => openLink(entry.link as string)}>
                  <Text style={styles.linkText}>Open the Link</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity ref={first ? walkMark.ref('library.change') : undefined} onPress={() => startChange(entry)}>
                <Text style={styles.linkText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void retire(entry, true)}>
                <Text style={styles.linkText}>No Longer Part of It</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => askRemove(entry)}>
                <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>
    );
  }

  function renderRetired() {
    if (retired.length === 0) return null;
    return (
      <View style={styles.group}>
        <TouchableOpacity
          onPress={() => setShowRetired(!showRetired)}
          style={styles.groupToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: showRetired }}
        >
          <Ionicons name={showRetired ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
          <Text style={styles.groupHeading}>{`No Longer Part of It (${retired.length})`}</Text>
        </TouchableOpacity>
        {showRetired
          ? retired.map((entry) => (
              <View key={entry.id} style={[styles.entryBlock, { borderLeftColor: tabColor }]}>
                <Text style={styles.bodyText}>{entry.title}</Text>
                <Text style={styles.captionText}>{[nameOf(entry.interestId), describeLibraryLine(entry)].filter(Boolean).join(' · ')}</Text>
                <View style={styles.links}>
                  <TouchableOpacity onPress={() => void retire(entry, false)}>
                    <Text style={styles.linkText}>Part of It Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => askRemove(entry)}>
                    <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.captionText}>
        What you read, watch, take or follow for an interest, with where you left off. A page read in Capture can be kept here too.
      </Text>

      {form && !form.id ? (
        renderForm()
      ) : (
        <TouchableOpacity ref={walkMark.ref('library.add')} style={styles.primaryButton} onPress={startAdd}>
          <Text style={styles.primaryButtonText}>Add to the Library</Text>
        </TouchableOpacity>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {groups.length === 0 ? (
        <Text style={styles.captionText}>Nothing in the library yet. Each thing you add shows here under its interest.</Text>
      ) : (
        groups.map((group) => (
          <View key={group.interestId} style={styles.group}>
            <Text style={styles.groupHeading}>{group.interestName}</Text>
            {group.statuses.map((part) => (
              <View key={part.status} style={styles.group}>
                <Text style={styles.setHeading}>{`${LIBRARY_STATUS_LABELS[part.status]} · ${part.entries.length}`}</Text>
                {part.entries.map(renderLibraryEntry)}
              </View>
            ))}
          </View>
        ))
      )}

      {renderRetired()}

      <AppActionSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions ?? []}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  group: { gap: 8 },
  groupToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  setHeading: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  entryBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  itemText: { flex: 1, gap: 2 },
  inlineForm: { gap: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL },
  pillActive: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillTextOn: { ...PILL_ON_TEXT },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  nestedForm: { gap: 8, padding: 12, borderRadius: 10, borderLeftWidth: 2, marginVertical: 4, backgroundColor: colors.surfaceMuted },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  primaryButton: { ...BUTTON_PRIMARY_COMPACT, alignSelf: 'flex-start' },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  errorText: { color: colors.danger },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
