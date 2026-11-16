// The tester's review (2026-11-15, direct instruction): every 90 days a
// tester answers about the parts of the app they used in that time, hears
// which parts they have not tried yet, and sends it to testers@ghostead.com.
// Sending starts the next 90 days; after the third the app stops calling
// itself a tester version (lib/testerGraduation.ts).
//
// Each part used gets two scales of 1 to 5, Easy to use and Useful to me,
// or Hardly used it, and one note that takes typing or speech
// (AppTextInput's microphone). From the second review on, what was changed
// because of testers' answers is asked about first
// (lib/testerReviewChanges.ts). The answers are kept as they are written,
// so leaving halfway loses nothing.
//
// Shown two ways: on its own screen (app/tester-review.tsx) once the review
// opens, two weeks before its day, and over the whole app on the day
// (components/TesterGate.tsx). Covered, nothing links into the app, and the
// emergency lines from the lock screen are shown at the top so the cover
// never hides them.
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  BUTTON_PRIMARY,
  BUTTON_PRIMARY_TEXT,
  BUTTON_SECONDARY,
  BUTTON_SECONDARY_TEXT,
  PILL_ON,
  PILL_ON_TEXT,
  PILL_SMALL,
  PILL_TEXT,
} from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { readEmergencyLinesSync } from '../lib/emergencyLockScreen';
import { t } from '../lib/i18n';
import { explainNotYet } from '../lib/notYet';
import { PROBLEM_REPORT_ADDRESS } from '../lib/problemReport';
import { useTesterReview } from '../lib/testerGraduation';
import {
  CHANGE_SCALE,
  EASE_SCALE,
  EMPTY_ITEM,
  REVIEW_ROUNDS,
  USEFUL_SCALE,
  isGraduated,
  stillToAnswer,
  tabTitle,
  type ChangeAnswer,
  type ItemAnswer,
  type ReviewDraft,
  type ReviewItem,
} from '../lib/testerReview';
import {
  gatherReview,
  keepReviewDraft,
  readReviewDraft,
  reviewSentText,
  sendReview,
  type ReviewContent,
} from '../lib/testerReviewState';
import { VOICE_LENS_DIRECTORY } from '../lib/voiceLensDirectory';
import { AppTextInput } from './AppTextInput';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';

type Props = {
  /** When the device was approved, which starts the first 90 days. */
  approvedAt: number;
  /** The tester's name, for the email. */
  name: string;
  /** Over the whole app on its day: nothing links into the app. */
  covered: boolean;
  /** Padding the screen around it needs (safe area, the report flag). */
  contentStyle?: object;
};

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Items grouped under their tab, in catalog order. */
function byTab(items: readonly ReviewItem[]): { tab: string; items: ReviewItem[] }[] {
  const out: { tab: string; items: ReviewItem[] }[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && last.tab === item.tab) last.items.push(item);
    else out.push({ tab: item.tab, items: [item] });
  }
  return out;
}

function ScaleRow({
  label,
  words,
  value,
  onPick,
}: {
  label: string;
  words: readonly string[];
  value: number | null;
  onPick: (value: number) => void;
}) {
  return (
    <View style={styles.scale}>
      <Text style={styles.label}>
        {t(label)}
        {value !== null ? `: ${t(words[value - 1])}` : ''}
      </Text>
      <View style={styles.pills}>
        {words.map((word, index) => {
          const n = index + 1;
          const on = value === n;
          return (
            <TouchableOpacity
              key={word}
              style={[styles.pill, on && styles.pillOn]}
              onPress={() => onPick(n)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${n}, ${t(word)}`}
            >
              <Text style={on ? styles.pillOnText : styles.pillText}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.ends}>
        1 {t(words[0])} · 5 {t(words[words.length - 1])}
      </Text>
    </View>
  );
}

export function TesterReview({ approvedAt, name, covered, contentStyle }: Props) {
  const router = useRouter();
  const progress = useTesterReview();
  const [content, setContent] = useState<ReviewContent | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [emergency] = useState(() => (covered ? readEmergencyLinesSync() : null));

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const next = await gatherReview(approvedAt, Date.now());
      setContent(next);
      setDraft((current) => (current && current.round === next.round ? current : readReviewDraft(next.round)));
    } catch (error) {
      console.warn('[testerReview] could not gather the review', error);
      setFailed(true);
    }
  }, [approvedAt]);

  useEffect(() => {
    void load();
  }, [load]);

  function change(next: ReviewDraft) {
    setDraft(next);
    keepReviewDraft(next);
  }

  function setItem(id: string, patch: Partial<ItemAnswer>) {
    if (!draft) return;
    const current = draft.items[id] ?? EMPTY_ITEM;
    change({ ...draft, items: { ...draft.items, [id]: { ...current, ...patch } } });
  }

  function setChange(id: string, patch: Partial<ChangeAnswer>) {
    if (!draft) return;
    const current = draft.changes[id] ?? { score: null, note: '' };
    change({ ...draft, changes: { ...draft.changes, [id]: { ...current, ...patch } } });
  }

  function open(item: ReviewItem) {
    const place = item.lens ? VOICE_LENS_DIRECTORY.find((entry) => entry.tab === item.tab && entry.key === item.lens) : null;
    if (place) router.push({ pathname: place.tab as never, params: { [place.param]: place.key } });
    else router.push(item.tab as never);
  }

  async function send() {
    if (!content || !draft || sending) return;
    const left = stillToAnswer(draft, content.rate, content.changes);
    if (left.changes.length > 0) {
      explainNotYet(t('Answer the changes at the top first: {count} still have no answer.', { count: left.changes.length }));
      return;
    }
    if (left.items.length > 0) {
      const names = left.items
        .slice(0, 4)
        .map((item) => (item.lens ? `${tabTitle(item.tab)}, ${t(item.label)}` : t(item.label)))
        .join('; ');
      explainNotYet(
        t('These still need both scales, or Hardly used it: {names}{more}.', {
          names,
          more: left.items.length > 4 ? t(' and {count} more', { count: left.items.length - 4 }) : '',
        }),
      );
      return;
    }
    setSending(true);
    try {
      const now = Date.now();
      const result = await sendReview(content, draft, name, now);
      setSent(reviewSentText(result, result !== 'failed' && content.round >= REVIEW_ROUNDS));
    } finally {
      setSending(false);
    }
  }

  const emergencyBand = emergency ? (
    <View style={[styles.band, styles.emergency]}>
      <Text style={styles.heading}>{emergency.title}</Text>
      {emergency.lines.map((line, index) => (
        <Text key={`${index}-${line}`} style={styles.body}>
          {line}
        </Text>
      ))}
      <Text style={styles.caption}>{t('From your emergency card. Reminders and the lock screen keep working while this review is open.')}</Text>
    </View>
  ) : null;

  if (sent) {
    return (
      <ScrollView contentContainerStyle={[styles.content, contentStyle]}>
        {emergencyBand}
        <View style={styles.band}>
          <Text style={styles.title} accessibilityRole="header">
            {isGraduated(progress) ? t('Thank you') : t('Review sent')}
          </Text>
          <Text style={styles.body}>{sent}</Text>
          {covered ? null : (
            <TouchableOpacity style={styles.secondary} onPress={() => router.back()} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t('Back to the App')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  if (failed) {
    return (
      <ScrollView contentContainerStyle={[styles.content, contentStyle]}>
        {emergencyBand}
        <View style={styles.band}>
          <Text style={styles.body}>
            {t('The review could not read which parts of the app you have used. Nothing you recorded is lost, and the answers you wrote are kept.')}
          </Text>
          <TouchableOpacity style={styles.primary} onPress={() => void load()} accessibilityRole="button">
            <Text style={styles.primaryText}>{t('Try Again')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (!content || !draft) {
    return (
      <ScrollView contentContainerStyle={[styles.content, contentStyle]}>
        {emergencyBand}
        <View style={styles.band}>
          <Text style={styles.body}>{t('Gathering the parts of the app you used…')}</Text>
        </View>
      </ScrollView>
    );
  }

  const groups = byTab(content.rate);
  const untried = byTab(content.untried);
  const answered = content.rate.length - stillToAnswer(draft, content.rate, []).items.length;

  return (
    <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
      {emergencyBand}
      <View style={styles.band}>
        <Text style={styles.title} accessibilityRole="header">
          {t('Review {round} of {total}', { round: content.round, total: REVIEW_ROUNDS })}
        </Text>
        <Text style={styles.body}>
          {covered
            ? t('Your 90 days of testing ended on {day}. Lifestead opens again as soon as this review is sent. Your records are all still here.', {
                day: formatDay(content.period.due),
              })
            : t('This review is due on {day}. It covers what you used since {start}.', {
                day: formatDay(content.period.due),
                start: formatDay(content.period.start),
              })}
        </Text>
        <Text style={styles.body}>
          {content.round >= REVIEW_ROUNDS
            ? t('This is the last one. Once it is sent, Lifestead is yours and your partner’s to use free, and the tester wording goes away.')
            : t('Once it is sent, your next 90 days start. After the third review, Lifestead is yours and your partner’s to use free.')}
        </Text>
        <Text style={styles.caption}>
          {t('For each part, pick 1 to 5 for how easy it is and how useful it is to you, or Hardly used it. The note takes typing or the microphone. Your answers are kept as you go.')}
        </Text>
      </View>

      {content.changes.length > 0 ? (
        <View style={styles.band}>
          <Text style={styles.heading}>{t('What changed since your last review')}</Text>
          <Text style={styles.caption}>{t('These were changed because of what testers said. How do they work for you now?')}</Text>
          {content.changes.map((item) => {
            const answer = draft.changes[item.id] ?? { score: null, note: '' };
            return (
              <View key={item.id} style={styles.item}>
                <Text style={styles.body}>{t(item.text)}</Text>
                <ScaleRow label="Now it is" words={CHANGE_SCALE} value={answer.score} onPick={(score) => setChange(item.id, { score })} />
                <AppTextInput
                  style={styles.input}
                  value={answer.note}
                  onChangeText={(note) => setChange(item.id, { note })}
                  placeholder={t('Anything to add (optional)')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {groups.length === 0 ? (
        <View style={styles.band}>
          <Text style={styles.body}>{t('No part of the app shows as used in these 90 days. Say below what got in the way, and send it.')}</Text>
        </View>
      ) : (
        <View style={styles.band}>
          <Text style={styles.caption}>{t('{done} of {count} parts answered', { done: answered, count: content.rate.length })}</Text>
        </View>
      )}

      {groups.map((group) => (
        <View key={group.tab} style={styles.band}>
          <Text style={styles.heading}>{t(tabTitle(group.tab))}</Text>
          {group.items.map((item) => {
            const answer = draft.items[item.id] ?? EMPTY_ITEM;
            return (
              <View key={item.id} style={styles.item}>
                <Text style={styles.itemName}>{item.lens ? t(item.label) : t('The {tab} tab as a whole', { tab: t(item.label) })}</Text>
                {answer.hardly ? null : (
                  <>
                    <ScaleRow label="Easy to use" words={EASE_SCALE} value={answer.ease} onPick={(ease) => setItem(item.id, { ease })} />
                    <ScaleRow label="Useful to me" words={USEFUL_SCALE} value={answer.useful} onPick={(useful) => setItem(item.id, { useful })} />
                  </>
                )}
                <View style={styles.pills}>
                  <TouchableOpacity
                    style={[styles.pill, answer.hardly && styles.pillOn]}
                    onPress={() => setItem(item.id, { hardly: !answer.hardly })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: answer.hardly }}
                  >
                    <Text style={answer.hardly ? styles.pillOnText : styles.pillText}>{t('Hardly used it')}</Text>
                  </TouchableOpacity>
                </View>
                <AppTextInput
                  style={styles.input}
                  value={answer.note}
                  onChangeText={(note) => setItem(item.id, { note })}
                  placeholder={t('A problem or a suggestion (optional)')}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            );
          })}
        </View>
      ))}

      {untried.length > 0 ? (
        <View style={styles.band}>
          <Text style={styles.heading}>{t('Not tried yet')}</Text>
          <Text style={styles.caption}>
            {covered
              ? t('These parts have not been opened on this device yet. Please give them a try in the next 90 days; the next review asks about them.')
              : t('These parts have not been opened on this device yet. Please give them a try; tap one to open it.')}
          </Text>
          {untried.map((group) => (
            <View key={group.tab} style={styles.untriedGroup}>
              <Text style={styles.label}>{t(tabTitle(group.tab))}</Text>
              <View style={styles.pills}>
                {group.items.map((item) =>
                  covered ? (
                    <View key={item.id} style={styles.pill}>
                      <Text style={styles.pillText}>{t(item.label)}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity key={item.id} style={styles.pill} onPress={() => open(item)} accessibilityRole="link">
                      <Text style={styles.pillText}>{t(item.label)}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.band}>
        <Text style={styles.heading}>{t('Anything else')}</Text>
        <AppTextInput
          style={styles.input}
          value={draft.general}
          onChangeText={(general) => change({ ...draft, general })}
          placeholder={t('Anything else, or what got in the way of trying more (optional)')}
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity style={[styles.primary, sending && styles.busy]} onPress={() => void send()} disabled={sending} accessibilityRole="button">
          <Text style={styles.primaryText}>{t('Send the Review')}</Text>
        </TouchableOpacity>
        <Text style={styles.caption}>
          {t('Your email app opens with the answers written in, to {address}. Nothing else from your records goes with it.', { address: PROBLEM_REPORT_ADDRESS })}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: HOME_BAND_GAP },
  band: {
    ...homeBandStyle,
    borderColor: colors.tabProfile,
    padding: HOME_BAND_CONTENT_PADDING,
    gap: 10,
  },
  emergency: { borderColor: colors.danger },
  title: { ...typography.sectionTitle, fontSize: 22, color: colors.tabProfileText, ...textShadow },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  itemName: { ...typography.body, fontWeight: '600', color: colors.textPrimary, ...textShadow },
  body: { ...typography.body, color: colors.textPrimary, ...textShadow },
  label: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  ends: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  item: { gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  untriedGroup: { gap: 6 },
  scale: { gap: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { ...PILL_SMALL, minWidth: 40, alignItems: 'center' },
  pillOn: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillOnText: { ...PILL_ON_TEXT },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  secondary: { ...BUTTON_SECONDARY },
  secondaryText: { ...BUTTON_SECONDARY_TEXT },
  busy: { opacity: 0.6 },
});
