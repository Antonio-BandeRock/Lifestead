// The information icon on a deck of language basics (2026-11-05): how this deck relates
// to the ones before it, whether the person has worked on them, and which rules to keep
// in mind because of it. The structure comes from deckInfo in lib/languageBasics.ts and
// the sentences around it are here. Deck names, reasons and rules are drawn as written.

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CourseText } from './CourseText';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import type { DeckInfo, DeckLink } from '../lib/languageBasics';
import { useNavigationHand } from '../lib/navigationHand';
import { modalAnimationType } from '../lib/visualPreferences';

type Props = {
  /** The deck's name, or null while nothing is being shown. */
  title: string | null;
  info: DeckInfo | null;
  /** On a card being studied, what that one card says to remember. */
  cardRemember?: string;
  onClose: () => void;
};

function Links({ heading, links }: { heading: string; links: DeckLink[] }) {
  if (links.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.heading}>{heading}</Text>
      {links.map((link) => (
        <View key={link.name} style={styles.item}>
          <CourseText style={styles.name}>{link.name}</CourseText>
          <CourseText style={styles.text}>{link.why}</CourseText>
        </View>
      ))}
    </View>
  );
}

export function LanguageDeckInfo({ title, info, cardRemember, onClose }: Props) {
  const navigationHand = useNavigationHand();
  const nothingBefore = !!info && info.worked.length === 0 && info.notYet.length === 0;
  const hasRules = !!info && (info.rules.length > 0 || info.remember.length > 0 || !!cardRemember);
  return (
    <Modal visible={title !== null} transparent animationType={modalAnimationType('fade')} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <CourseText style={styles.title}>{title ?? ''}</CourseText>
          {info ? (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <Links heading="You have worked on" links={info.worked} />
              <Links heading="Comes before this, not worked on yet" links={info.notYet} />
              {nothingBefore ? <Text style={styles.text}>Nothing before this one is needed.</Text> : null}
              {hasRules ? (
                <View style={styles.block}>
                  <Text style={styles.heading}>Rules to keep in mind</Text>
                  {cardRemember ? <CourseText style={styles.text}>{cardRemember}</CourseText> : null}
                  {info.rules.map((rule) => (
                    <View key={`${rule.native}|${rule.target}`} style={styles.item}>
                      <CourseText style={styles.text}>{rule.native}</CourseText>
                      {rule.target ? <CourseText style={styles.example}>{rule.target}</CourseText> : null}
                    </View>
                  ))}
                  {info.remember.map((line) => (
                    <CourseText key={line} style={styles.text}>
                      {line}
                    </CourseText>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          ) : null}
          <View style={[styles.buttonRow, { justifyContent: navigationHand === 'left' ? 'flex-start' : 'flex-end' }]}>
            <Pressable style={styles.button} onPress={onClose} hitSlop={8} accessibilityRole="button">
              <Text style={styles.buttonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: colors.menuSurface, borderRadius: 14, padding: 20, width: '100%', maxWidth: 420, maxHeight: '80%', gap: 10 },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, fontSize: 18, ...textShadow },
  scroll: { flexShrink: 1 },
  scrollContent: { gap: 14 },
  block: { gap: 8 },
  item: { gap: 2 },
  heading: { ...typography.label, color: colors.textMuted, ...textShadow },
  name: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  text: { ...typography.body, color: colors.textSecondary, ...textShadow },
  example: { ...typography.caption, fontStyle: 'italic', color: colors.textMuted, ...textShadow },
  buttonRow: { flexDirection: 'row' },
  button: BUTTON_SECONDARY_COMPACT,
  buttonText: BUTTON_SECONDARY_TEXT,
});
