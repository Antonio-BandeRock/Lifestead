// Interests > Supplies & Equipment, Collections and Wish List (2026-10-30,
// Interests stage 3): one component for the three lenses, since all three
// are rows of interest_things told apart by kind. A wish that arrives is
// moved by Got It into supplies or a collection, keeping the day it was
// first wished for, so nothing is typed twice.
//
// Nothing here values a collection, says what it is worth, or suggests the
// next thing to buy. Every sentence is in lib/interestThings.ts, checked by
// scripts/test_interest_things.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { groupInterests, interestChoices, localDayOf, readStartedOn, type Interest } from '../lib/interests';
import { listInterests } from '../lib/interestsDb';
import {
  describeGotIt,
  describeThingLine,
  describeThingsTotal,
  describeWishedFor,
  gotItGoesTo,
  groupThings,
  readCost,
  retiredThings,
  setNamesFor,
  type InterestThing,
  type ThingKind,
} from '../lib/interestThings';
import {
  addInterestThing,
  deleteInterestThing,
  gotWish,
  listInterestThings,
  setInterestThingRetired,
  updateInterestThing,
} from '../lib/interestThingsDb';
import { explainNotYet } from '../lib/notYet';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

const NO_INTEREST = '__no_interest__';

type Props = { kind: ThingKind; tabColor: string };

type ThingForm = {
  /** Null for a new thing. */
  id: string | null;
  interestId: string | null;
  name: string;
  about: string;
  amount: string;
  place: string;
  cost: string;
  source: string;
  cameBy: string;
  gotOn: string;
  setName: string;
};

const LEAD: Record<ThingKind, string> = {
  supply: 'What an interest uses: tools, materials, gear. Where each is kept, when it came and what it cost, if you want to keep that.',
  collection: 'What you collect for an interest, in sets if you like. When each came, how and from where.',
  wish: 'What you would like for an interest, with where to get it and about what it costs. Got It moves it into Supplies & Equipment or Collections.',
};

const ADD_LABEL: Record<ThingKind, string> = {
  supply: 'Add a Supply',
  collection: 'Add to a Collection',
  wish: 'Add a Wish',
};

const EMPTY: Record<ThingKind, string> = {
  supply: 'No supplies or equipment yet. Each one you add shows here under its interest.',
  collection: 'Nothing in a collection yet. Each thing you add shows here under its interest and set.',
  wish: 'Nothing on the wish list yet. Each wish you add shows here under its interest.',
};

const NEEDS_A_NAME: Record<ThingKind, string> = {
  supply: 'Give the supply or piece of equipment a name first.',
  collection: 'Give the thing a name first.',
  wish: 'Give the wish a name first.',
};

const COST_HELP = 'That could not be read as a price. Try "12", "12.50", "$1,200" or "free", or leave it empty.';
const GOT_ON_HELP = 'That could not be read as a date. Try "2019", "March 2024" or "3 March 2024", or leave it empty. A day still to come cannot be when it came.';

function emptyForm(interestId: string | null): ThingForm {
  return { id: null, interestId, name: '', about: '', amount: '', place: '', cost: '', source: '', cameBy: '', gotOn: '', setName: '' };
}

export function InterestThingsSection({ kind, tabColor }: Props) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [things, setThings] = useState<InterestThing[]>([]);
  const [form, setForm] = useState<ThingForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  const load = useCallback(async () => {
    setInterests(await listInterests());
    setThings(await listInterestThings());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = localDayOf(new Date().toISOString());
  const walkMark = useWalkMark();
  const { current } = groupInterests(interests);
  const nameOf = (id: string) => interests.find((interest) => interest.id === id)?.name ?? 'An interest no longer listed';
  const groups = groupThings(things, kind, nameOf);
  const retired = kind === 'wish' ? [] : retiredThings(things, kind);
  const firstThingId = groups[0]?.things[0]?.id;

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

  function startChange(thing: InterestThing) {
    setFormError(null);
    setForm({
      id: thing.id,
      interestId: thing.interestId,
      name: thing.name,
      about: thing.about ?? '',
      amount: thing.amount ?? '',
      place: thing.place ?? '',
      cost: thing.cost === null ? '' : thing.cost === 0 ? 'free' : String(thing.cost),
      source: thing.source ?? '',
      cameBy: thing.cameBy ?? '',
      gotOn: thing.gotOn ?? '',
      setName: thing.setName ?? '',
    });
  }

  async function saveForm() {
    if (!form) return;
    if (!form.interestId) {
      explainNotYet('Pick the interest this belongs to first.');
      return;
    }
    if (!form.name.trim()) {
      explainNotYet(NEEDS_A_NAME[kind]);
      return;
    }
    const cost = readCost(form.cost);
    if (!cost.ok) {
      setFormError(COST_HELP);
      return;
    }
    const gotOn = kind === 'wish' ? { ok: true, startedOn: null } : readStartedOn(form.gotOn, today);
    if (!gotOn.ok) {
      setFormError(GOT_ON_HELP);
      return;
    }
    const input = {
      interestId: form.interestId,
      kind,
      name: form.name,
      about: form.about,
      amount: form.amount,
      place: form.place,
      cost: cost.cost,
      source: form.source,
      cameBy: form.cameBy,
      gotOn: gotOn.startedOn,
      setName: form.setName,
    };
    const name = form.name.trim();
    if (form.id) {
      await updateInterestThing(form.id, input);
      setForm(null);
      await afterChange(`${name}: changed.`);
    } else {
      await addInterestThing(input);
      setForm(null);
      await afterChange(`${name}: kept under ${nameOf(form.interestId)}.`);
    }
  }

  function askGotIt(thing: InterestThing) {
    const interest = interests.find((one) => one.id === thing.interestId);
    const first = gotItGoesTo(interest?.kind ?? null, things, thing.interestId);
    const order: ('supply' | 'collection')[] = first === 'collection' ? ['collection', 'supply'] : ['supply', 'collection'];
    setConfirm({
      title: `Got ${thing.name}?`,
      message: 'It moves off the wish list with the day it was wished for, dated today.',
      actions: [
        ...order.map((to) => ({
          label: to === 'collection' ? 'Into Collections' : 'Into Supplies & Equipment',
          onPress: async () => {
            setConfirm(null);
            setOpenId(null);
            await gotWish(thing.id, to);
            await afterChange(describeGotIt(thing.name, to));
          },
        })),
        { label: 'Not yet', onPress: () => setConfirm(null) },
      ],
    });
  }

  async function retire(thing: InterestThing, retiredNow: boolean) {
    setOpenId(null);
    await setInterestThingRetired(thing.id, retiredNow);
    await afterChange(retiredNow ? `${thing.name} is under No Longer Have It, with everything it had.` : `${thing.name} is back.`);
  }

  function askRemove(thing: InterestThing) {
    setConfirm({
      title: `Remove ${thing.name}?`,
      message:
        kind === 'wish'
          ? 'It comes off the wish list for good.'
          : 'It comes off the list for good. If you no longer have it, No Longer Have It keeps it with its history instead.',
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            setOpenId(null);
            await deleteInterestThing(thing.id);
            await afterChange(`${thing.name}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function renderForm() {
    if (!form) return null;
    const sets = form.interestId && kind === 'collection' ? setNamesFor(things, form.interestId) : [];
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
          placeholder={kind === 'wish' ? 'What you would like' : kind === 'collection' ? 'What it is' : 'What it is: a tool, a material, gear'}
        />
        {kind === 'collection' ? (
          <>
            <AppTextInput
              style={styles.textInput}
              value={form.setName}
              onChangeText={(setName) => setForm({ ...form, setName })}
              placeholder="Which set (optional): Mexican coins"
            />
            {sets.length > 0 ? (
              <View style={styles.pillRow}>
                {sets.map((setName) => {
                  const on = form.setName.trim() === setName;
                  return (
                    <TouchableOpacity
                      key={setName}
                      style={[styles.pill, on && styles.pillActive]}
                      onPress={() => setForm({ ...form, setName: on ? '' : setName })}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{setName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : null}
        <AppTextInput
          style={styles.textInput}
          value={form.amount}
          onChangeText={(amount) => setForm({ ...form, amount })}
          placeholder="How many (optional): 3, 2 tubes, a box"
        />
        {kind !== 'wish' ? (
          <>
            <AppTextInput
              style={styles.textInput}
              value={form.place}
              onChangeText={(place) => setForm({ ...form, place })}
              placeholder="Where it is kept (optional)"
            />
            <AppTextInput
              style={styles.textInput}
              value={form.gotOn}
              onChangeText={(gotOn) => setForm({ ...form, gotOn })}
              placeholder="When it came (optional): 2019, March 2024"
            />
            <AppTextInput
              style={styles.textInput}
              value={form.cameBy}
              onChangeText={(cameBy) => setForm({ ...form, cameBy })}
              placeholder="How it came (optional): bought, a gift, found, made"
            />
          </>
        ) : null}
        <AppTextInput
          style={styles.textInput}
          value={form.cost}
          onChangeText={(cost) => setForm({ ...form, cost })}
          placeholder={kind === 'wish' ? 'About what it costs (optional)' : 'What it cost (optional), or free'}
        />
        <AppTextInput
          style={styles.textInput}
          value={form.source}
          onChangeText={(source) => setForm({ ...form, source })}
          placeholder={kind === 'wish' ? 'Where to get it (optional): a shop, a person, a link' : 'Where it came from (optional)'}
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
          <TouchableOpacity ref={walkMark.ref(`thing.${kind}Save`)} style={styles.primaryButton} onPress={saveForm}>
            <Text style={styles.primaryButtonText}>{form.id ? 'Save' : 'Keep It'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderThing(thing: InterestThing) {
    const open = openId === thing.id;
    const first = thing.id === firstThingId;
    if (form?.id === thing.id) return <View key={thing.id}>{renderForm()}</View>;
    const line = describeThingLine(thing);
    const wished = kind !== 'wish' ? describeWishedFor(thing) : null;
    return (
      <View key={thing.id} style={[styles.thingBlock, { borderLeftColor: tabColor }]}>
        <TouchableOpacity
          ref={first ? walkMark.ref(`thing.${kind}Row`) : undefined}
          onPress={() => setOpenId(open ? null : thing.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <View style={styles.itemText}>
            <Text style={styles.bodyText}>{thing.name}</Text>
            {line ? <Text style={styles.captionText}>{line}</Text> : null}
            {open && thing.about ? <Text style={styles.captionText}>{thing.about}</Text> : null}
            {open && kind !== 'wish' && thing.source ? <Text style={styles.captionText}>{`From ${thing.source}`}</Text> : null}
            {open && wished ? <Text style={styles.captionText}>{wished}</Text> : null}
          </View>
        </TouchableOpacity>
        {open ? (
          <View style={styles.links}>
            {kind === 'wish' ? (
              <TouchableOpacity ref={first ? walkMark.ref('thing.wishGot') : undefined} onPress={() => askGotIt(thing)}>
                <Text style={styles.linkText}>Got It</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity ref={first ? walkMark.ref(`thing.${kind}Change`) : undefined} onPress={() => startChange(thing)}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
            {kind !== 'wish' ? (
              <TouchableOpacity ref={first ? walkMark.ref(`thing.${kind}Retire`) : undefined} onPress={() => retire(thing, true)}>
                <Text style={styles.linkText}>No Longer Have It</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => askRemove(thing)}>
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
          <Text style={styles.groupHeading}>{`No Longer Have It (${retired.length})`}</Text>
        </TouchableOpacity>
        {showRetired
          ? retired.map((thing) => (
              <View key={thing.id} style={[styles.thingBlock, { borderLeftColor: tabColor }]}>
                <Text style={styles.bodyText}>{thing.name}</Text>
                <Text style={styles.captionText}>{[nameOf(thing.interestId), describeThingLine(thing)].filter(Boolean).join(' · ')}</Text>
                <View style={styles.links}>
                  <TouchableOpacity onPress={() => retire(thing, false)}>
                    <Text style={styles.linkText}>Have It Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => askRemove(thing)}>
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
      <Text style={styles.captionText}>{LEAD[kind]}</Text>

      {form && !form.id ? (
        renderForm()
      ) : (
        <TouchableOpacity ref={walkMark.ref(`thing.${kind}Add`)} style={styles.primaryButton} onPress={startAdd}>
          <Text style={styles.primaryButtonText}>{ADD_LABEL[kind]}</Text>
        </TouchableOpacity>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {groups.length === 0 ? (
        <Text style={styles.captionText}>{EMPTY[kind]}</Text>
      ) : (
        groups.map((group) => (
          <View key={group.interestId} style={styles.group}>
            <Text style={styles.groupHeading}>{group.interestName}</Text>
            <Text style={styles.captionText}>{describeThingsTotal(group.things)}</Text>
            {kind === 'collection'
              ? group.sets.map((set) => (
                  <View key={set.setName ?? '__no_set__'} style={styles.group}>
                    {set.setName ? <Text style={styles.setHeading}>{`${set.setName} · ${set.things.length}`}</Text> : null}
                    {set.things.map(renderThing)}
                  </View>
                ))
              : group.things.map(renderThing)}
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
  thingBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
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
  errorText: { color: colors.danger },
  linkText: { ...typography.body, color: colors.primary, ...textShadow },
});
