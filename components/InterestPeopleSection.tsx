// Interests > People & Places (2026-10-30, Interests stage 4): who and where
// an interest happens with, grouped by interest and then by the kind the
// person gave it (a friend, a teacher, a club, a shop, a show, a place to
// go). How to reach them and where they are are the person's words.
//
// Nothing here ranks one person or place against another. Every sentence is
// in lib/interestLibrary.ts, checked by scripts/test_interest_library.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { groupInterests, interestChoices, type Interest } from '../lib/interests';
import { listInterests } from '../lib/interestsDb';
import {
  describePersonLine,
  groupPeople,
  kindChoices,
  PEOPLE_KINDS,
  retiredPeople,
  type InterestPerson,
} from '../lib/interestLibrary';
import {
  addInterestPerson,
  deleteInterestPerson,
  listInterestPeople,
  setInterestPersonRetired,
  updateInterestPerson,
} from '../lib/interestLibraryDb';
import { explainNotYet } from '../lib/notYet';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

const NO_INTEREST = '__no_interest__';

type Props = { tabColor: string };

type PersonForm = {
  id: string | null;
  interestId: string | null;
  kind: string;
  name: string;
  reach: string;
  place: string;
  about: string;
};

function emptyForm(interestId: string | null): PersonForm {
  return { id: null, interestId, kind: '', name: '', reach: '', place: '', about: '' };
}

export function InterestPeopleSection({ tabColor }: Props) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [people, setPeople] = useState<InterestPerson[]>([]);
  const [form, setForm] = useState<PersonForm | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  const load = useCallback(async () => {
    setInterests(await listInterests());
    setPeople(await listInterestPeople());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const walkMark = useWalkMark();
  const { current } = groupInterests(interests);
  const nameOf = (id: string) => interests.find((interest) => interest.id === id)?.name ?? 'An interest no longer listed';
  const groups = groupPeople(people, nameOf);
  const retired = retiredPeople(people);
  const firstPersonId = groups[0]?.kinds[0]?.people[0]?.id;
  const kinds = kindChoices(
    PEOPLE_KINDS,
    people.map((person) => person.kind),
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
    setForm(emptyForm(current.length === 1 ? current[0].id : null));
  }

  function startChange(person: InterestPerson) {
    setForm({
      id: person.id,
      interestId: person.interestId,
      kind: person.kind ?? '',
      name: person.name,
      reach: person.reach ?? '',
      place: person.place ?? '',
      about: person.about ?? '',
    });
  }

  async function saveForm() {
    if (!form) return;
    if (!form.interestId) {
      explainNotYet('Pick the interest this belongs to first.');
      return;
    }
    if (!form.name.trim()) {
      explainNotYet('Give them a name first: the person, the club, the shop or the place.');
      return;
    }
    const input = {
      interestId: form.interestId,
      kind: form.kind,
      name: form.name,
      reach: form.reach,
      place: form.place,
      about: form.about,
    };
    const name = form.name.trim();
    if (form.id) await updateInterestPerson(form.id, input);
    else await addInterestPerson(input);
    setForm(null);
    await afterChange(form.id ? `${name}: changed.` : `${name}: kept under ${nameOf(form.interestId)}.`);
  }

  async function retire(person: InterestPerson, retiredNow: boolean) {
    setOpenId(null);
    await setInterestPersonRetired(person.id, retiredNow);
    await afterChange(
      retiredNow ? `${person.name} is under No Longer Part of It, with everything kept about them.` : `${person.name} is back.`,
    );
  }

  function askRemove(person: InterestPerson) {
    setConfirm({
      title: `Remove ${person.name}?`,
      message: 'They come off this list for good. If they are no longer part of this interest, No Longer Part of It keeps what you wrote instead.',
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            setOpenId(null);
            await deleteInterestPerson(person.id);
            await afterChange(`${person.name}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
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
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
          placeholder="Who or where: a name, a club, a shop"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.kind}
          onChangeText={(kind) => setForm({ ...form, kind })}
          placeholder="What kind (optional): a friend, a teacher"
        />
        <View style={styles.pillRow}>
          {kinds.map((kind) => {
            const on = form.kind.trim().toLowerCase() === kind.toLowerCase();
            return (
              <TouchableOpacity
                key={kind}
                style={[styles.pill, on && styles.pillActive]}
                onPress={() => setForm({ ...form, kind: on ? '' : kind })}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{kind}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <AppTextInput
          style={styles.textInput}
          value={form.reach}
          onChangeText={(reach) => setForm({ ...form, reach })}
          placeholder="How to reach them (optional): a number, an email, meets Tuesdays"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.place}
          onChangeText={(place) => setForm({ ...form, place })}
          placeholder="Where (optional): an address, a town"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.about}
          onChangeText={(about) => setForm({ ...form, about })}
          placeholder="Anything about them (optional)"
          multiline
        />
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('people.save')} style={styles.primaryButton} onPress={saveForm}>
            <Text style={styles.primaryButtonText}>{form.id ? 'Save' : 'Keep It'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderPerson(person: InterestPerson) {
    const open = openId === person.id;
    const first = person.id === firstPersonId;
    if (form?.id === person.id) return <View key={person.id}>{renderForm()}</View>;
    const line = describePersonLine(person);
    return (
      <View key={person.id} style={[styles.entryBlock, { borderLeftColor: tabColor }]}>
        <TouchableOpacity
          ref={first ? walkMark.ref('people.row') : undefined}
          onPress={() => setOpenId(open ? null : person.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <View style={styles.itemText}>
            <Text style={styles.bodyText}>{person.name}</Text>
            {line ? <Text style={styles.captionText}>{line}</Text> : null}
            {open && person.about ? <Text style={styles.captionText}>{person.about}</Text> : null}
          </View>
        </TouchableOpacity>
        {open ? (
          <View style={styles.links}>
            <TouchableOpacity ref={first ? walkMark.ref('people.change') : undefined} onPress={() => startChange(person)}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void retire(person, true)}>
              <Text style={styles.linkText}>No Longer Part of It</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => askRemove(person)}>
              <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
            </TouchableOpacity>
          </View>
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
          ? retired.map((person) => (
              <View key={person.id} style={[styles.entryBlock, { borderLeftColor: tabColor }]}>
                <Text style={styles.bodyText}>{person.name}</Text>
                <Text style={styles.captionText}>{[nameOf(person.interestId), describePersonLine(person)].filter(Boolean).join(' · ')}</Text>
                <View style={styles.links}>
                  <TouchableOpacity onPress={() => void retire(person, false)}>
                    <Text style={styles.linkText}>Part of It Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => askRemove(person)}>
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
        Who and where an interest happens with: a friend who does it too, a teacher, a club, a shop, a show, a place to go.
      </Text>

      {form && !form.id ? (
        renderForm()
      ) : (
        <TouchableOpacity ref={walkMark.ref('people.add')} style={styles.primaryButton} onPress={startAdd}>
          <Text style={styles.primaryButtonText}>Add a Person or Place</Text>
        </TouchableOpacity>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {groups.length === 0 ? (
        <Text style={styles.captionText}>Nobody here yet. Each person or place you add shows here under its interest.</Text>
      ) : (
        groups.map((group) => (
          <View key={group.interestId} style={styles.group}>
            <Text style={styles.groupHeading}>{group.interestName}</Text>
            {group.kinds.map((part) => (
              <View key={part.kind ?? '__none__'} style={styles.group}>
                {part.kind ? <Text style={styles.setHeading}>{part.kind}</Text> : null}
                {part.people.map(renderPerson)}
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
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
