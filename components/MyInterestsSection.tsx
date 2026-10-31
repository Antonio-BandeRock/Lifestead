// Interests > My Interests (2026-10-30): every interest as one record, its
// four stages turned on or off as it changes, with the dates kept.
//
// An interest leads with where it was left off, so opening one after a
// month away says where things stood. Stepping back keeps everything and
// moves it under Stepped Back; Remove is only for one nothing else refers
// to. Nothing here counts hours, ranks one interest above another or
// suggests a stage to move to. Every sentence is in lib/interests.ts,
// checked by scripts/test_interests.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  INTEREST_STAGE_LABELS,
  INTEREST_STAGE_LINES,
  INTEREST_STAGES,
  INTERESTS_EXPLAINED,
  describeInterestLine,
  describeLeftOff,
  describeStageHistory,
  groupInterests,
  isBuiltInKind,
  kindChoices,
  kindLabel,
  noStages,
  readStartedOn,
  formatStartedOn,
  type Interest,
  type InterestStage,
  type InterestStageChange,
} from '../lib/interests';
import {
  addInterest,
  countInterestReferences,
  deleteInterest,
  listInterestStageChanges,
  listInterests,
  renameInterestKind,
  setInterestLeftOff,
  setInterestRetired,
  setInterestStage,
  updateInterest,
} from '../lib/interestsDb';
import { explainNotYet } from '../lib/notYet';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

const OWN_KIND = '__own_kind__';
const NO_KIND = '__no_kind__';

function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

type Props = { tabColor: string };

type InterestForm = {
  id: string | null;
  name: string;
  kind: string | null;
  /** True while the person is typing a kind of their own. */
  typingKind: boolean;
  ownKind: string;
  about: string;
  since: string;
  stages: Record<InterestStage, boolean>;
};

const SINCE_HELP = 'That could not be read as a time already gone by. Try "2019", "March 2024" or "3 March 2024", or leave it empty.';

export function MyInterestsSection({ tabColor }: Props) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [changes, setChanges] = useState<InterestStageChange[]>([]);
  const [form, setForm] = useState<InterestForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [leftOff, setLeftOff] = useState<{ id: string; note: string } | null>(null);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [showSteppedBack, setShowSteppedBack] = useState(false);
  const [showExplained, setShowExplained] = useState(false);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  const load = useCallback(async () => {
    setInterests(await listInterests());
    setChanges(await listInterestStageChanges());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = todayLocal();
  const { current, steppedBack } = groupInterests(interests);
  // The first interest carries the tutorial rings (lib/toolHowTos.ts).
  const walkMark = useWalkMark();
  const firstId = current[0]?.id ?? steppedBack[0]?.id;

  async function afterChange(message: string | null) {
    setSaidBack(message);
    await load();
  }

  function startNew() {
    setFormError(null);
    setRenaming(null);
    setForm({ id: null, name: '', kind: null, typingKind: false, ownKind: '', about: '', since: '', stages: { ...noStages(), following: true } });
  }

  function startChange(interest: Interest) {
    setFormError(null);
    setRenaming(null);
    setForm({
      id: interest.id,
      name: interest.name,
      kind: interest.kind,
      typingKind: false,
      ownKind: '',
      about: interest.about ?? '',
      since: interest.startedOn ? formatStartedOn(interest.startedOn) : '',
      stages: { ...interest.stages },
    });
  }

  async function saveForm() {
    if (!form) return;
    const name = form.name.trim();
    if (!name) {
      explainNotYet('Give the interest a name first, in a few words: "Architecture" or "Playing the guitar".');
      return;
    }
    if (form.typingKind && !form.ownKind.trim()) {
      explainNotYet('Type the kind of your own, or pick one from the list.');
      return;
    }
    const since = readStartedOn(form.since, today);
    if (!since.ok) {
      setFormError(SINCE_HELP);
      return;
    }
    const input = {
      name,
      kind: form.typingKind ? form.ownKind : form.kind,
      about: form.about,
      stages: form.stages,
      startedOn: since.startedOn,
    };
    if (form.id) {
      await updateInterest(form.id, input);
      setForm(null);
      await afterChange(`${name}: changed.`);
    } else {
      const id = await addInterest(input);
      setForm(null);
      setOpenId(id);
      await afterChange(`Added: ${name}.`);
    }
  }

  async function handleStage(interest: Interest, stage: InterestStage) {
    const on = !interest.stages[stage];
    await setInterestStage(interest.id, stage, on);
    const words = INTEREST_STAGE_LABELS[stage].toLowerCase();
    await afterChange(on ? `${interest.name}: started ${words}.` : `${interest.name}: stepped back from ${words}.`);
  }

  async function saveLeftOff() {
    if (!leftOff) return;
    const interest = interests.find((entry) => entry.id === leftOff.id);
    await setInterestLeftOff(leftOff.id, leftOff.note);
    setLeftOff(null);
    await afterChange(interest ? (leftOff.note.trim() ? `${interest.name}: where you left off is kept.` : `${interest.name}: note cleared.`) : null);
  }

  async function saveRename() {
    if (!renaming) return;
    if (!renaming.to.trim()) {
      explainNotYet('Type the new name for this kind first.');
      return;
    }
    await renameInterestKind(renaming.from, renaming.to);
    if (form && form.kind === renaming.from) setForm({ ...form, kind: renaming.to.trim() });
    setRenaming(null);
    await afterChange(`Renamed on every interest that had it: ${renaming.to.trim()}.`);
  }

  function askStepBack(interest: Interest) {
    setConfirm({
      title: `Step back from ${interest.name}?`,
      message: 'It moves to Stepped Back with everything kept: its stages, its dates, its projects. It can come back at any time.',
      actions: [
        {
          label: 'Step Back',
          onPress: async () => {
            setConfirm(null);
            await setInterestRetired(interest.id, true);
            await afterChange(`${interest.name}: stepped back, everything kept.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  async function handleComeBack(interest: Interest) {
    await setInterestRetired(interest.id, false);
    await afterChange(`${interest.name}: back with your interests.`);
  }

  async function askRemove(interest: Interest) {
    const references = await countInterestReferences(interest.id);
    if (references.projects > 0) {
      explainNotYet(
        references.projects === 1
          ? 'A project names this interest, so removing it would leave that project pointing at nothing. Step back from it instead, which keeps everything.'
          : `${references.projects} projects name this interest, so removing it would leave them pointing at nothing. Step back from it instead, which keeps everything.`,
      );
      return;
    }
    if (references.sessions > 0) {
      explainNotYet(
        references.sessions === 1
          ? 'A session is kept for this interest, and removing it would take that record with it. Step back from it instead, which keeps everything.'
          : `${references.sessions} sessions are kept for this interest, and removing it would take those records with it. Step back from it instead, which keeps everything.`,
      );
      return;
    }
    if (references.things > 0) {
      explainNotYet(
        references.things === 1
          ? 'A supply, a collected thing or a wish is kept for this interest, and removing it would leave that pointing at nothing. Step back from it instead, which keeps everything.'
          : `${references.things} supplies, collected things or wishes are kept for this interest, and removing it would leave them pointing at nothing. Step back from it instead, which keeps everything.`,
      );
      return;
    }
    const kept = references.library + references.people;
    if (kept > 0) {
      explainNotYet(
        kept === 1
          ? 'Something in its Library or People & Places is kept for this interest, and removing it would leave that pointing at nothing. Step back from it instead, which keeps everything.'
          : `${kept} things in its Library or People & Places are kept for this interest, and removing it would leave them pointing at nothing. Step back from it instead, which keeps everything.`,
      );
      return;
    }
    setConfirm({
      title: `Remove ${interest.name}?`,
      message: 'It comes off the list with its stage dates. To keep the record, step back from it instead.',
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            if (openId === interest.id) setOpenId(null);
            await deleteInterest(interest.id);
            await afterChange(`${interest.name}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function renderStagePills(stages: Record<InterestStage, boolean>, onPress: (stage: InterestStage) => void, marked: boolean) {
    return (
      <View style={styles.pillRow}>
        {INTEREST_STAGES.map((stage, index) => {
          const on = stages[stage];
          return (
            <TouchableOpacity
              key={stage}
              ref={marked && index === 1 ? walkMark.ref('interest.stage') : undefined}
              style={[styles.pill, on && styles.pillActive]}
              onPress={() => onPress(stage)}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
            >
              <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{INTEREST_STAGE_LABELS[stage]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function renderForm() {
    if (!form) return null;
    const ownChosen = !!form.kind && !isBuiltInKind(form.kind) && !form.typingKind;
    const options = [
      ...kindChoices(interests),
      { label: 'A kind of your own', value: OWN_KIND },
      { label: 'No kind', value: NO_KIND },
    ];
    return (
      <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
        <AppTextInput
          style={styles.textInput}
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
          placeholder="Interest name: Architecture"
        />
        <Text style={styles.captionText}>What kind of interest it is (optional)</Text>
        <PopoverSelect
          options={options}
          selected={form.typingKind ? OWN_KIND : (form.kind ?? NO_KIND)}
          onSelect={(value) => {
            setRenaming(null);
            if (value === OWN_KIND) setForm({ ...form, typingKind: true, ownKind: '' });
            else setForm({ ...form, typingKind: false, kind: value === NO_KIND ? null : value });
          }}
          tabColor={tabColor}
          searchable
          width={260}
        />
        {form.typingKind ? (
          <AppTextInput
            style={styles.textInput}
            value={form.ownKind}
            onChangeText={(ownKind) => setForm({ ...form, ownKind })}
            placeholder="Your kind: Birdwatching"
          />
        ) : null}
        {ownChosen && !renaming ? (
          <TouchableOpacity onPress={() => setRenaming({ from: form.kind as string, to: form.kind as string })}>
            <Text style={styles.linkText}>Rename This Kind</Text>
          </TouchableOpacity>
        ) : null}
        {renaming ? (
          <View style={styles.addRow}>
            <AppTextInput
              style={[styles.textInput, styles.flexInput]}
              value={renaming.to}
              onChangeText={(to) => setRenaming({ ...renaming, to })}
              placeholder="New name for this kind"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={saveRename}>
              <Text style={styles.primaryButtonText}>Rename</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <AppTextInput
          style={styles.textInput}
          value={form.about}
          onChangeText={(about) => setForm({ ...form, about })}
          placeholder="What draws you to it (optional)"
          multiline
        />
        <AppTextInput
          style={styles.textInput}
          value={form.since}
          onChangeText={(since) => setForm({ ...form, since })}
          placeholder="Since when (optional): 2019, or March 2024"
        />
        <Text style={styles.captionText}>Where it is now. Any mix, and it can change whenever it does.</Text>
        {renderStagePills(form.stages, (stage) => setForm({ ...form, stages: { ...form.stages, [stage]: !form.stages[stage] } }), false)}
        {INTEREST_STAGES.map((stage) => (
          <Text key={stage} style={styles.captionText}>{`${INTEREST_STAGE_LABELS[stage]}: ${INTEREST_STAGE_LINES[stage]}`}</Text>
        ))}
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('interest.save')} style={styles.primaryButton} onPress={saveForm}>
            <Text style={styles.primaryButtonText}>{form.id ? 'Save' : 'Add the Interest'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setForm(null);
              setRenaming(null);
            }}
          >
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderInterest(interest: Interest) {
    const open = openId === interest.id;
    const first = interest.id === firstId;
    const note = describeLeftOff(interest);
    const history = describeStageHistory(changes.filter((change) => change.interestId === interest.id));
    const kind = kindLabel(interest.kind);
    return (
      <View key={interest.id} style={[styles.interestBlock, { borderLeftColor: tabColor }]}>
        <TouchableOpacity
          ref={first ? walkMark.ref('interest.open') : undefined}
          onPress={() => {
            setOpenId(open ? null : interest.id);
            setLeftOff(null);
          }}
          style={styles.interestHead}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={kind ? `${interest.name}, ${kind}` : interest.name}
        >
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
          <View style={styles.itemText}>
            <Text style={styles.bodyText}>{interest.name}</Text>
            <Text style={styles.captionText}>{describeInterestLine(interest)}</Text>
          </View>
        </TouchableOpacity>
        {open ? (
          <View style={styles.interestBody}>
            {note ? <Text style={styles.bodyText}>{note}</Text> : null}
            {interest.about ? <Text style={styles.captionText}>{interest.about}</Text> : null}
            {!interest.retiredAt ? renderStagePills(interest.stages, (stage) => handleStage(interest, stage), first) : null}
            {leftOff?.id === interest.id ? (
              <View style={[styles.nestedForm, { borderLeftColor: tabColor }]}>
                <AppTextInput
                  style={styles.textInput}
                  value={leftOff.note}
                  onChangeText={(text) => setLeftOff({ ...leftOff, note: text })}
                  placeholder="Where you left off: the second verse, or chapter 4"
                  multiline
                />
                <ThumbRow primary="first" style={styles.actionRow}>
                  <TouchableOpacity style={styles.primaryButton} onPress={saveLeftOff}>
                    <Text style={styles.primaryButtonText}>Keep It</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setLeftOff(null)}>
                    <Text style={styles.linkText}>Cancel</Text>
                  </TouchableOpacity>
                </ThumbRow>
              </View>
            ) : form?.id === interest.id ? (
              renderForm()
            ) : (
              <View style={styles.interestLinks}>
                <TouchableOpacity
                  ref={first ? walkMark.ref('interest.leftOff') : undefined}
                  onPress={() => setLeftOff({ id: interest.id, note: interest.leftOff ?? '' })}
                >
                  <Text style={styles.linkText}>Where I Left Off</Text>
                </TouchableOpacity>
                <TouchableOpacity ref={first ? walkMark.ref('interest.change') : undefined} onPress={() => startChange(interest)}>
                  <Text style={styles.linkText}>Change</Text>
                </TouchableOpacity>
                {interest.retiredAt ? (
                  <TouchableOpacity ref={first ? walkMark.ref('interest.stepBack') : undefined} onPress={() => handleComeBack(interest)}>
                    <Text style={styles.linkText}>Come Back to It</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity ref={first ? walkMark.ref('interest.stepBack') : undefined} onPress={() => askStepBack(interest)}>
                    <Text style={styles.linkText}>Step Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => askRemove(interest)}>
                  <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            {history.length > 0 ? (
              <View style={styles.history}>
                <Text style={styles.captionText}>How it has changed</Text>
                {history.map((line, index) => (
                  <Text key={`${line}-${index}`} style={styles.captionText}>{line}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  const explainedOpen = showExplained || interests.length === 0;

  return (
    <View style={styles.section}>
      <TouchableOpacity
        ref={walkMark.ref('interest.explained')}
        onPress={() => setShowExplained(!showExplained)}
        style={styles.groupToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: explainedOpen }}
      >
        <Ionicons name={explainedOpen ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
        <Text style={styles.groupHeading}>Interests and hobbies</Text>
      </TouchableOpacity>
      {explainedOpen
        ? INTERESTS_EXPLAINED.map((part) => (
            <View key={part.heading} style={styles.explained}>
              <Text style={styles.bodyText}>{part.heading}</Text>
              <Text style={styles.captionText}>{part.body}</Text>
            </View>
          ))
        : null}

      {form && !form.id ? (
        renderForm()
      ) : (
        <TouchableOpacity ref={walkMark.ref('interest.new')} style={styles.primaryButton} onPress={startNew}>
          <Text style={styles.primaryButtonText}>Add an Interest</Text>
        </TouchableOpacity>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {interests.length === 0 ? (
        <Text style={styles.captionText}>
          No interests yet. Add anything you enjoy, whether you only read about it or do it every week.
        </Text>
      ) : null}

      {current.length > 0 ? <View style={styles.group}>{current.map(renderInterest)}</View> : null}

      {steppedBack.length > 0 ? (
        <View style={styles.group}>
          <TouchableOpacity onPress={() => setShowSteppedBack(!showSteppedBack)} style={styles.groupToggle}>
            <Ionicons name={showSteppedBack ? 'chevron-down' : 'chevron-forward'} size={16} color={tabColor} />
            <Text style={styles.groupHeading}>{`Stepped Back (${steppedBack.length})`}</Text>
          </TouchableOpacity>
          {showSteppedBack ? steppedBack.map(renderInterest) : null}
        </View>
      ) : null}

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
  explained: { gap: 2, paddingLeft: 22 },
  interestBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  interestHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  interestBody: { gap: 8, paddingLeft: 24 },
  interestLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 },
  history: { gap: 2, marginTop: 4 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  itemText: { flex: 1, gap: 2 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flexInput: { flex: 1 },
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
