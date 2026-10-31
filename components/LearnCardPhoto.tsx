// Interests > Learn, the photo on the front of a card a person made
// (2026-10-31, Learn part 6e): a bird, a leaf, a knot, a word on a sign. The
// newest photo kept for the card shows above the question. A photo whose row
// came over from the other device before its file did says so, the same way
// components/PhotoStrip.tsx does, rather than drawing an empty frame.

import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { PHOTO_ON_THE_WAY } from '../lib/media';
import { listMediaFor, mediaDisplayUri } from '../lib/mediaDb';
import { LEARN_CARD_OWNER_KIND } from '../lib/learnMyDecks';

type Shown = { state: 'none' } | { state: 'away' } | { state: 'here'; uri: string };

export function LearnCardPhoto({ cardId }: { cardId: string }) {
  const [shown, setShown] = useState<Shown>({ state: 'none' });

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const items = await listMediaFor(LEARN_CARD_OWNER_KIND, cardId);
        const item = items[0];
        if (!item) return;
        const uri = await mediaDisplayUri(item);
        if (alive) setShown(uri ? { state: 'here', uri } : { state: 'away' });
      } catch {
        // A card whose photo cannot be read is studied from its words.
      }
    })();
    return () => {
      alive = false;
    };
  }, [cardId]);

  if (shown.state === 'none') return null;
  if (shown.state === 'away') {
    return (
      <View style={styles.away}>
        <Text style={styles.captionText}>{PHOTO_ON_THE_WAY}</Text>
      </View>
    );
  }
  return <Image source={{ uri: shown.uri }} style={styles.photo} contentFit="contain" accessibilityLabel="The photo on this card" />;
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 220, borderRadius: 10, backgroundColor: colors.surfaceMuted },
  away: { padding: 12, borderRadius: 10, backgroundColor: colors.surfaceMuted },
  captionText: { ...typography.caption, color: colors.textMuted, ...textShadow },
});
