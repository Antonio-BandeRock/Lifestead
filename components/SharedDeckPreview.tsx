// A deck somebody shared from Interests > Learn, opened from a .is file
// (2026-10-31, Learn part 6e). app/import-shared.tsx has already checked the
// signature; this screen reads the cards with no trust in them
// (lib/learnShare.ts), shows what came, and keeps it under Your Decks on
// Add to Your Decks. Receiving and studying a shared deck is Free; making
// and changing decks stays part of Individual, so the deck can be studied at
// once and changed once the plan allows.

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { useFloatingButtonScrollPadding } from '../constants/floatingButton';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { addSharedDeck } from '../lib/learnMyDecksDb';
import { describeSharedDeck, readSharedDeck } from '../lib/learnShare';
import type { DeckEnvelope } from '../lib/sharing';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';
import { ThumbRow } from './ThumbRow';

const FRONTS_SHOWN = 5;

export function SharedDeckPreview({ envelope, verifiedName }: { envelope: DeckEnvelope; verifiedName: string | null }) {
  const router = useRouter();
  const scrollPadding = useFloatingButtonScrollPadding();
  const read = useMemo(() => readSharedDeck(envelope.payload), [envelope]);
  const [status, setStatus] = useState<'preview' | 'saving' | 'saved' | 'error'>('preview');
  const [photosMissed, setPhotosMissed] = useState(0);

  async function handleAdd() {
    setStatus('saving');
    try {
      const kept = await addSharedDeck(read);
      setPhotosMissed(kept.photosMissed);
      setStatus('saved');
    } catch (error) {
      console.error('[SharedDeckPreview] Could not keep a shared deck', error);
      setStatus('error');
    }
  }

  function openLearn() {
    router.replace({ pathname: '/(tabs)/interests', params: { openInterestsLens: 'learn' } });
  }

  if (read.cards.length === 0) {
    return (
      <View style={styles.screen}>
        <View style={styles.body}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
          <Text style={styles.title}>No card in this deck could be read</Text>
          <Text style={styles.text}>It may be from a newer version of the app. Ask whoever sent it to share it again once both phones are up to date.</Text>
        </View>
      </View>
    );
  }

  if (status === 'saved') {
    return (
      <View style={styles.screen}>
        <View style={styles.body}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.accent} />
          <Text style={styles.title}>Added to Your Decks</Text>
          <Text style={styles.text}>
            {t('{title} is under Your Decks in Interests > Learn, ready to study.', { title: read.title })}
          </Text>
          {photosMissed > 0 ? (
            <Text style={styles.text}>
              {photosMissed === 1 ? t('1 photo could not be kept, so its card shows only its words.') : t('{n} photos could not be kept, so their cards show only their words.', { n: photosMissed })}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={openLearn}>
            <Text style={styles.primaryButtonText}>Open Learn</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const fronts = read.cards.slice(0, FRONTS_SHOWN).map((card) => card.front.trim() || card.story.trim()).filter(Boolean);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
      <View style={styles.card}>
        <Text style={styles.fromLine}>{t('A deck shared with you by {name}', { name: envelope.fromName })}</Text>
        <Text style={styles.title}>{read.title}</Text>
        {read.about ? <Text style={styles.text}>{read.about}</Text> : null}
        {verifiedName ? (
          <View style={styles.verifiedRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.accent} />
            <Text style={styles.verifiedText}>{t('Verified: this is your connection {name}', { name: verifiedName })}</Text>
          </View>
        ) : (
          <Text style={styles.captionText}>
            {t('{name} is not one of your connections yet, so this cannot be shown to come from them. The file itself checked out.', { name: envelope.fromName })}
          </Text>
        )}
        {describeSharedDeck(read, t).map((line) => (
          <Text key={line} style={styles.captionText}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>The first cards</Text>
        {fronts.map((front, index) => (
          <Text key={index} style={styles.line}>
            {'•'} {front}
          </Text>
        ))}
        <Text style={styles.captionText}>Only the cards come. What the sender knows and when their cards come up stay with them.</Text>
      </View>

      {status === 'error' ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>This deck could not be kept just now. Please try again.</Text>
        </View>
      ) : null}

      <ThumbRow primary="first" style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryButton, styles.actionButton, status === 'saving' ? styles.busy : null]}
          activeOpacity={0.85}
          onPress={() => void handleAdd()}
          disabled={status === 'saving'}
        >
          <Text style={styles.primaryButtonText}>{status === 'saving' ? 'Saving…' : 'Add to Your Decks'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, styles.actionButton]} activeOpacity={0.85} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Discard</Text>
        </TouchableOpacity>
      </ThumbRow>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: HOME_BAND_GAP },
  card: { ...homeBandStyle, borderColor: colors.tabInterests, padding: HOME_BAND_CONTENT_PADDING, gap: 6 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  fromLine: { ...typography.caption, color: colors.textMuted, ...textShadow },
  title: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  text: { ...typography.body, color: colors.textSecondary, ...textShadow },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedText: { ...typography.caption, color: colors.accent, flexShrink: 1, ...textShadow },
  sectionLabel: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  line: { ...typography.body, color: colors.textPrimary, ...textShadow },
  errorText: { ...typography.caption, color: colors.danger, ...textShadow },
  actionRow: { flexDirection: 'row', gap: 12, marginHorizontal: HOME_BAND_CONTENT_PADDING, marginTop: 14 },
  actionButton: { flex: 1 },
  primaryButton: { ...BUTTON_PRIMARY },
  busy: { opacity: 0.6 },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  secondaryButton: { ...BUTTON_SECONDARY },
  secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
});
