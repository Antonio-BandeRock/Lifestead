// Interests > Money (2026-10-30, Interests stage 5): what has gone out on
// an interest and what has come in from it, each on its day, grouped by
// interest and then by month. Each interest opens with its years in words,
// which also count the prices kept on its supplies and collected things, so
// nothing bought there has to be entered twice.
//
// Nothing here calls an interest a profit or a loss, or suggests it ought to
// pay: an interest that only costs money is as much an interest as one that
// earns. Every sentence is in lib/interestMoney.ts, checked by
// scripts/test_interest_money.js.

import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { groupInterests, interestChoices, localDayOf, type Interest } from '../lib/interests';
import { listInterests } from '../lib/interestsDb';
import { readSessionDay } from '../lib/interestSessions';
import type { InterestThing } from '../lib/interestThings';
import { listInterestThings } from '../lib/interestThingsDb';
import {
  describeMoneyFigure,
  describeMoneyLine,
  describeMoneySaved,
  describeMoneyYear,
  describeNoDay,
  formatMoney,
  groupMoneyByMonth,
  monthHeading,
  moneyByYear,
  MONEY_DIRECTION_LABELS,
  readMoneyAmount,
  type MoneyDirection,
  type MoneyEntry,
} from '../lib/interestMoney';
import { addInterestMoney, deleteInterestMoney, listInterestMoney, updateInterestMoney } from '../lib/interestMoneyDb';
import { explainNotYet } from '../lib/notYet';
import { AppActionSheet, type AppActionSheetAction } from './AppActionSheet';
import { useWalkMark } from './WalkMark';
import { AppTextInput } from './AppTextInput';
import { PopoverSelect } from './PopoverSelect';
import { ThumbRow } from './ThumbRow';
import { BUTTON_PRIMARY_COMPACT, BUTTON_PRIMARY_TEXT, PILL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';

const NO_INTEREST = '__no_interest__';
const DIRECTIONS: MoneyDirection[] = ['out', 'in'];
const MONEY_DAY_HELP = 'That day could not be read. Try "yesterday", "Monday", "28 October", or leave it empty for today.';

type Props = { tabColor: string };

type MoneyForm = {
  id: string | null;
  interestId: string | null;
  direction: MoneyDirection;
  amount: string;
  what: string;
  day: string;
  who: string;
  note: string;
};

function emptyMoneyForm(interestId: string | null): MoneyForm {
  return { id: null, interestId, direction: 'out', amount: '', what: '', day: '', who: '', note: '' };
}

export function InterestMoneySection({ tabColor }: Props) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [things, setThings] = useState<InterestThing[]>([]);
  const [form, setForm] = useState<MoneyForm | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saidBack, setSaidBack] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message?: string; actions: AppActionSheetAction[] } | null>(null);

  const load = useCallback(async () => {
    setInterests(await listInterests());
    setEntries(await listInterestMoney());
    setThings(await listInterestThings());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const walkMark = useWalkMark();
  const today = localDayOf(new Date().toISOString());
  const { current } = groupInterests(interests);
  const nameOf = (id: string) => interests.find((interest) => interest.id === id)?.name ?? 'An interest no longer listed';
  // An interest shows here once it has an amount, or a price with a day on
  // one of its supplies or collected things.
  const shownIds = [
    ...new Set([
      ...entries.map((entry) => entry.interestId),
      ...things.filter((thing) => thing.kind !== 'wish' && thing.cost !== null && thing.cost > 0).map((thing) => thing.interestId),
    ]),
  ].sort((a, b) => nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: 'base' }));
  // The how-to rings the first amount on the screen.
  const firstShownWithMoney = shownIds.find((id) => entries.some((entry) => entry.interestId === id));
  const firstEntryId = firstShownWithMoney
    ? groupMoneyByMonth(entries.filter((entry) => entry.interestId === firstShownWithMoney))[0]?.entries[0]?.id
    : undefined;

  async function afterChange(message: string | null) {
    setSaidBack(message);
    await load();
  }

  function startAdd() {
    if (current.length === 0) {
      explainNotYet('Every amount here belongs to an interest. Add one on My Interests first, then come back here.');
      return;
    }
    setForm(emptyMoneyForm(current.length === 1 ? current[0].id : null));
  }

  function startChange(entry: MoneyEntry) {
    setForm({
      id: entry.id,
      interestId: entry.interestId,
      direction: entry.direction,
      amount: String(entry.amount),
      what: entry.what,
      day: entry.onDay === today ? '' : entry.onDay,
      who: entry.who ?? '',
      note: entry.note ?? '',
    });
  }

  async function saveMoneyForm() {
    if (!form) return;
    if (!form.interestId) {
      explainNotYet('Pick the interest this belongs to first.');
      return;
    }
    const amount = readMoneyAmount(form.amount);
    if (amount === null) {
      explainNotYet('Put in how much, more than nothing: "12", "$12.50" or "12,50".');
      return;
    }
    if (!form.what.trim()) {
      explainNotYet(form.direction === 'in' ? 'Say what it came in for first: a sale, a commission, a prize.' : 'Say what it went on first: a class, dues, a fee, a ticket.');
      return;
    }
    const day = readSessionDay(form.day, today);
    if (!day.ok || !day.day) {
      explainNotYet(MONEY_DAY_HELP);
      return;
    }
    const input = {
      interestId: form.interestId,
      direction: form.direction,
      amount,
      onDay: day.day,
      what: form.what,
      who: form.who,
      note: form.note,
    };
    if (form.id) await updateInterestMoney(form.id, input);
    else await addInterestMoney(input);
    setForm(null);
    await afterChange(form.id ? `${form.what.trim()}: changed.` : describeMoneySaved({ amount, direction: form.direction, what: form.what.trim() }, nameOf(form.interestId)));
  }

  function askRemove(entry: MoneyEntry) {
    setConfirm({
      title: `Remove ${entry.what}?`,
      message: `${formatMoney(entry.amount)} comes off this interest's money for good.`,
      actions: [
        {
          label: 'Remove',
          destructive: true,
          onPress: async () => {
            setConfirm(null);
            setOpenId(null);
            await deleteInterestMoney(entry.id);
            await afterChange(`${entry.what}: removed.`);
          },
        },
        { label: 'Keep it', onPress: () => setConfirm(null) },
      ],
    });
  }

  function renderMoneyForm() {
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
        <View style={styles.pillRow}>
          {DIRECTIONS.map((direction) => {
            const on = form.direction === direction;
            return (
              <TouchableOpacity
                key={direction}
                style={[styles.pill, on && styles.pillActive]}
                onPress={() => setForm({ ...form, direction })}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{MONEY_DIRECTION_LABELS[direction]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <AppTextInput
          style={styles.textInput}
          value={form.amount}
          onChangeText={(amount) => setForm({ ...form, amount })}
          placeholder="How much: 40, $12.50"
          keyboardType="decimal-pad"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.what}
          onChangeText={(what) => setForm({ ...form, what })}
          placeholder={form.direction === 'in' ? 'What for: two bowls sold, a commission' : 'What on: a class, club dues, a stall fee'}
        />
        <AppTextInput
          style={styles.textInput}
          value={form.day}
          onChangeText={(day) => setForm({ ...form, day })}
          placeholder="Which day (empty for today): yesterday, 28 October"
        />
        <AppTextInput
          style={styles.textInput}
          value={form.who}
          onChangeText={(who) => setForm({ ...form, who })}
          placeholder={form.direction === 'in' ? 'Who from (optional)' : 'Paid to (optional)'}
        />
        <AppTextInput
          style={styles.textInput}
          value={form.note}
          onChangeText={(note) => setForm({ ...form, note })}
          placeholder="A note (optional)"
          multiline
        />
        {form.direction === 'out' ? (
          <Text style={styles.captionText}>
            Something bought for Supplies & Equipment or Collections with its price kept there is already counted here, so it needs no second entry.
          </Text>
        ) : null}
        <ThumbRow primary="first" style={styles.actionRow}>
          <TouchableOpacity ref={walkMark.ref('money.save')} style={styles.primaryButton} onPress={saveMoneyForm}>
            <Text style={styles.primaryButtonText}>{form.id ? 'Save' : 'Keep It'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setForm(null)}>
            <Text style={styles.linkText}>Cancel</Text>
          </TouchableOpacity>
        </ThumbRow>
      </View>
    );
  }

  function renderMoneyEntry(entry: MoneyEntry) {
    const open = openId === entry.id;
    const first = entry.id === firstEntryId;
    if (form?.id === entry.id) return <View key={entry.id}>{renderMoneyForm()}</View>;
    return (
      <View key={entry.id} style={[styles.entryBlock, { borderLeftColor: tabColor }]}>
        <TouchableOpacity
          ref={first ? walkMark.ref('money.row') : undefined}
          onPress={() => setOpenId(open ? null : entry.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <View style={styles.itemText}>
            <Text style={styles.bodyText}>{entry.what}</Text>
            <Text style={styles.captionText}>{describeMoneyLine(entry)}</Text>
          </View>
          <Text style={styles.figureText}>{describeMoneyFigure(entry)}</Text>
        </TouchableOpacity>
        {open ? (
          <View style={styles.links}>
            <TouchableOpacity ref={first ? walkMark.ref('money.change') : undefined} onPress={() => startChange(entry)}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => askRemove(entry)}>
              <Text style={[styles.linkText, { color: colors.danger }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }

  function renderMoneyInterest(interestId: string) {
    const own = entries.filter((entry) => entry.interestId === interestId);
    const { years, noDay } = moneyByYear(
      own,
      things.filter((thing) => thing.interestId === interestId),
    );
    const noDayLine = describeNoDay(noDay);
    return (
      <View key={interestId} style={styles.group}>
        <Text style={styles.groupHeading}>{nameOf(interestId)}</Text>
        {years.map((year) => (
          <Text key={year.year} style={styles.captionText}>
            {describeMoneyYear(year)}
          </Text>
        ))}
        {noDayLine ? <Text style={styles.captionText}>{noDayLine}</Text> : null}
        {groupMoneyByMonth(own).map((month) => (
          <View key={month.month} style={styles.group}>
            <Text style={styles.setHeading}>
              {[monthHeading(month.month), month.out > 0 ? `${formatMoney(month.out)} out` : null, month.in > 0 ? `${formatMoney(month.in)} in` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {month.entries.map(renderMoneyEntry)}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.captionText}>
        What has gone out on an interest and what has come in from it, each on its day: a class, club dues, a stall fee, a sale, a commission.
      </Text>

      {form && !form.id ? (
        renderMoneyForm()
      ) : (
        <TouchableOpacity ref={walkMark.ref('money.add')} style={styles.primaryButton} onPress={startAdd}>
          <Text style={styles.primaryButtonText}>Add an Amount</Text>
        </TouchableOpacity>
      )}
      {saidBack ? <Text style={styles.captionText}>{saidBack}</Text> : null}

      {shownIds.length === 0 ? (
        <Text style={styles.captionText}>
          No money kept yet. Each amount you add shows here under its interest, with the prices kept on its supplies and collected things beside it.
        </Text>
      ) : (
        shownIds.map(renderMoneyInterest)
      )}

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
  groupHeading: { ...typography.label, color: colors.textPrimary, ...textShadow },
  setHeading: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  entryBlock: { gap: 6, paddingLeft: 8, borderLeftWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  bodyText: { ...typography.body, color: colors.textPrimary, ...textShadow },
  figureText: { ...typography.body, color: colors.textPrimary, ...textShadow },
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
