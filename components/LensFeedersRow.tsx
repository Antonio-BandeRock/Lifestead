// What fills this in (1.0.75.1, lib/setupCards.ts buildLensFeeders). At the
// top of a lens on Insights, Trends or Reports, the Your Guide cards that
// feed it and are still open, in the same sideways row as on Home. A card
// steps aside once its record exists, and Not for me takes it off every
// lens row while Your Guide on Home keeps it. With nothing open the row is
// not drawn at all.
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '../constants/colors';
import { TAB_ROUTES } from '../constants/tabs';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import {
  ALSO_COMES_BACK_LABEL,
  FEEDS_THIS_CAPTION,
  FEEDS_THIS_CAPTION_MANY,
  FEEDS_THIS_HEADING,
  NOT_FOR_ME_BODY,
  NOT_FOR_ME_TITLE,
  buildLensFeeders,
  type LensTabPath,
} from '../lib/setupCards';
import { hideFeederCard, loadLensFeederData, type LensFeederData } from '../lib/setupCardsDb';
import type { StoryDestination } from '../lib/yourStory';
import { useInfoAlert } from './InfoAlert';
import { SetupCard, setupCardWidth } from './SetupCardShelves';
import { makeTabBandStyles } from './TabBand';
import { HorizontalScroll } from './HorizontalScroll';

type Props = {
  tabPath: LensTabPath;
  lensKey: string;
  tabColor: string;
};

export function LensFeedersRow({ tabPath, lensKey, tabColor }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<LensFeederData | null>(null);
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const live = useRef(true);

  useFocusEffect(
    useCallback(() => {
      live.current = true;
      loadLensFeederData()
        .then((next) => {
          if (live.current) setData(next);
        })
        .catch((error) => console.warn('loadLensFeederData failed', error));
      return () => {
        live.current = false;
      };
    }, []),
  );

  // Opening a card's place from a lens is not leaving Your Story, so no
  // Back to Your Story pill is marked.
  const go = useCallback(
    (destination: Exclude<StoryDestination, { kind: 'beats' }>) => {
      if (destination.kind === 'route') {
        router.push({ pathname: destination.pathname, params: destination.params } as Href);
      } else if (destination.kind === 'home') {
        router.push({ pathname: '/', params: { openHomeSection: destination.section } } as Href);
      } else {
        router.push({ pathname: '/', params: { openHomeQuickLog: destination.form } } as Href);
      }
    },
    [router],
  );

  if (!data) return null;
  const feeders = buildLensFeeders(tabPath, lensKey, data.view, data.records, data.hidden);
  if (feeders.cards.length === 0) return null;
  const band = makeTabBandStyles(tabColor);
  const cardWidth = setupCardWidth(width);
  const caption =
    feeders.areas.length === 1 ? t(FEEDS_THIS_CAPTION, { label: t(feeders.areas[0].label) }) : t(FEEDS_THIS_CAPTION_MANY);

  async function notForMe(key: string, title: string) {
    try {
      const hidden = await hideFeederCard(key);
      setData((current) => (current ? { ...current, hidden } : current));
      showInfoAlert(t(NOT_FOR_ME_TITLE), t(NOT_FOR_ME_BODY, { title: t(title) }));
    } catch (error) {
      console.warn('hideFeederCard failed', error);
    }
  }

  return (
    <View style={band.box}>
      {infoAlertElement}
      <View style={styles.head}>
        <Text style={styles.heading}>{FEEDS_THIS_HEADING}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
      <HorizontalScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {feeders.cards.map((card, index) => (
          <SetupCard
            key={card.def.key}
            card={card}
            tabColor={TAB_ROUTES.find((route) => route.path === card.tabPath)?.color ?? tabColor}
            width={cardWidth}
            view={data.view}
            go={go}
            explain={showInfoAlert}
            markCard={index === 0 ? 'lens.feedsThis' : undefined}
            markGo={index === 0 ? 'lens.feedsThisGo' : undefined}
            areasLabel={ALSO_COMES_BACK_LABEL}
            onNotForMe={() => void notForMe(card.def.key, card.def.title)}
          />
        ))}
      </HorizontalScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2, paddingBottom: 10, backgroundColor: colors.surface },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  row: { gap: 12, paddingRight: 12, alignItems: 'stretch' },
});
