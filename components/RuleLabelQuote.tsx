import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useWalkMark } from './WalkMark';
import { t } from '../lib/i18n';
import { LABEL_SECTIONS, readableDate } from '../lib/medicineLabel';
import { labelSentenceForRule } from '../lib/ruleLabelSentences';

// What the FDA label says on a curated interaction rule's subject (A11b of
// the competitive build plan): the sentence word for word, the label it is
// from with its version and date, and a button that opens that label on the
// label screen with the sentence marked. Shown under a rule's Why? on every
// card that renders a curated rule (Life > My Meds, Insights > My Meds,
// Schedules > Meds and Today's Meals), folded until the person opens it.
//
// The sentence is shown as what the label says, never as the rule's source:
// many rules rest on the research their citation names, and the label is
// one maker's wording. A rule with no sentence shows nothing here
// (lib/ruleLabelSentences.ts lists why each such label is silent).
type Props = { ruleId: string | null };

export function RuleLabelQuote({ ruleId }: Props) {
  const router = useRouter();
  const walkMark = useWalkMark();
  const [open, setOpen] = useState(false);
  const quote = ruleId ? labelSentenceForRule(ruleId) : null;
  if (!quote) return null;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        ref={walkMark.ref('meds.labelQuote')}
        onPress={() => setOpen((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.toggle}>{open ? 'Hide What the FDA Label Says' : 'What the FDA Label Says'}</Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.box}>
          <Text style={styles.sentence} selectable>
            {`“${quote.sentence}”`}
          </Text>
          <Text style={styles.caption}>
            {t('From the {label} label by {maker}, version {version}, dated {date}, under "{section}".', {
              label: quote.labelName,
              maker: quote.maker,
              version: quote.version,
              date: readableDate(quote.effective),
              section: sectionHeading(quote.sectionKey),
            })}
          </Text>
          <Text style={styles.caption}>
            Labels from other makers of the same medicine may word this differently. The rule above rests on its citation; this is the label&apos;s wording on the same subject.
          </Text>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() =>
              router.push({ pathname: '/medicine-label', params: { setId: quote.setId, ruleId: quote.ruleId } })
            }
          >
            <Text style={styles.buttonText}>Open This Label</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// The heading the label screen gives the section, so the person can find it.
function sectionHeading(key: string): string {
  return t(LABEL_SECTIONS.find(([k]) => k === key)?.[1] ?? key);
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 4 },
  toggle: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline',
    ...textShadow,
  },
  box: {
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sentence: { ...typography.body, color: colors.textPrimary, fontStyle: 'italic', ...textShadow },
  caption: { ...typography.caption, color: colors.textMuted, ...textShadow },
  button: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  buttonText: { ...BUTTON_SECONDARY_TEXT },
});
