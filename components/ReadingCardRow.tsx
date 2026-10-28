// A topic's entries as a sideways row of cards (1.0.75.2), the way Your
// Guide lays out its cards, asked for on every reading lens: "The topics
// expand to show the items in that topic as the facebook-like cards and
// scroll horizontally." Health Literacy, Earth Matters, Horticulture,
// Conditions and the crop guides all use it. A card shows the title and
// its one line; Read opens the entry full width under the row, since an
// entry is too long to read inside a card, and the card it came from stays
// lit while it is open. Search results stay a list.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { colors, hexToRgba } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { EntryScrollAnchor, type EntryScrollTarget } from './EntryScrollAnchor';
import { useWalkMark } from './WalkMark';
import type { ToolMark } from '../lib/toolHowTos';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ReadingCardItem = {
  id: string;
  title: string;
  line?: string;
  // The evidence tier or severity dot an entry row carries.
  dotColor?: string | null;
};

export const READ_CARD_LABEL = 'Read';
export const CLOSE_CARD_LABEL = 'Close';

const CARD_GAP = 12;
// Dark text on a filled button carries no shadow.
const NO_SHADOW = { textShadowColor: 'transparent', textShadowRadius: 0 } as const;

// Narrower than a Your Guide card, so the next card shows at the edge and
// the row reads as something to swipe.
export function readingCardWidth(windowWidth: number): number {
  return Math.round(Math.min(Math.max(windowWidth * 0.62, 220), 300));
}

export function ReadingCardRow({
  heading,
  items,
  openId,
  onToggle,
  renderBody,
  tabColor,
  icon,
  scrollTarget,
  markCard,
}: {
  // A subgroup's name and count, over the row. Left out when the topic
  // band already says it.
  heading?: string;
  items: ReadingCardItem[];
  openId: string | null;
  onToggle: (id: string) => void;
  renderBody: (id: string) => ReactNode;
  tabColor: string;
  icon: IconName;
  scrollTarget?: EntryScrollTarget;
  // The walk mark a how-to rings, on the first card's Read button.
  markCard?: ToolMark;
}) {
  const walkMark = useWalkMark();
  const { width } = useWindowDimensions();
  const cardWidth = readingCardWidth(width);
  const scroller = useRef<ScrollView>(null);
  const openIndex = openId ? items.findIndex((item) => item.id === openId) : -1;

  // An entry opened from elsewhere may sit far along the row; bring its
  // card into view.
  useEffect(() => {
    if (openIndex <= 0) return;
    scroller.current?.scrollTo({ x: openIndex * (cardWidth + CARD_GAP), animated: false });
  }, [openIndex, cardWidth]);

  return (
    <EntryScrollAnchor id={openIndex >= 0 ? items[openIndex].id : ''} target={scrollTarget}>
      <View style={styles.wrap}>
        {heading ? (
          <View style={styles.head}>
            <Text style={[styles.heading, { color: tabColor }]}>{heading}</Text>
          </View>
        ) : null}
        <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {items.map((item, index) => {
            const open = item.id === openId;
            const mark = index === 0 ? markCard : undefined;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.card,
                  { width: cardWidth, borderColor: hexToRgba(tabColor, open ? 0.95 : 0.5) },
                  open && { borderWidth: 2 },
                ]}
                onPress={() => onToggle(item.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${open ? CLOSE_CARD_LABEL : READ_CARD_LABEL}: ${item.title}`}
              >
                <View style={[styles.hero, { backgroundColor: hexToRgba(tabColor, open ? 0.32 : 0.2) }]}>
                  <View style={[styles.heroCircle, { backgroundColor: hexToRgba(tabColor, 0.3), borderColor: tabColor }]}>
                    <Ionicons name={icon} size={24} color={tabColor} style={textShadow} />
                  </View>
                  {item.dotColor ? <View style={[styles.dot, { backgroundColor: item.dotColor }]} /> : null}
                </View>
                <View style={styles.body}>
                  <Text style={styles.title}>{item.title}</Text>
                  {item.line ? <Text style={styles.line}>{item.line}</Text> : null}
                  <View style={styles.spacer} />
                  <View
                    ref={mark ? walkMark.ref(mark) : undefined}
                    style={[
                      open ? styles.closeButton : styles.readButton,
                      open ? { borderColor: tabColor } : { backgroundColor: tabColor },
                      mark && walkMark(mark),
                    ]}
                  >
                    <Text style={open ? styles.closeText : styles.readText}>{open ? CLOSE_CARD_LABEL : READ_CARD_LABEL}</Text>
                    {open ? (
                      <Ionicons name="chevron-up" size={15} color={tabColor} style={textShadow} />
                    ) : (
                      <Ionicons name="chevron-down" size={15} color={colors.textOnButton} style={NO_SHADOW} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {openIndex >= 0 ? (
          <View style={[styles.opened, { borderLeftColor: tabColor }]}>
            <Text style={styles.openedTitle}>{items[openIndex].title}</Text>
            {renderBody(items[openIndex].id)}
          </View>
        ) : null}
      </View>
    </EntryScrollAnchor>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  head: { backgroundColor: colors.surfaceMuted, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' },
  heading: { ...typography.eyebrow, ...textShadow },
  row: { gap: CARD_GAP, paddingRight: CARD_GAP, alignItems: 'stretch' },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  hero: { height: 64, alignItems: 'center', justifyContent: 'center' },
  heroCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', top: 10, right: 10, width: 12, height: 12, borderRadius: 6 },
  body: { flex: 1, padding: 12, gap: 6, backgroundColor: colors.surfaceMuted },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  line: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  spacer: { flex: 1 },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  readText: { ...typography.label, color: colors.textOnButton, ...NO_SHADOW },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: colors.surface,
  },
  closeText: { ...typography.label, color: colors.textPrimary, ...textShadow },
  // The open entry, full width under its row, on the plain surface with
  // the tab's accent down its left side.
  openedTitle: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow, marginBottom: 6 },
  opened: { backgroundColor: colors.surface, borderRadius: 10, borderLeftWidth: 3, paddingHorizontal: 12, paddingVertical: 10 },
});
