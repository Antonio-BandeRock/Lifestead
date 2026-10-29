// Getting Set Up as cards (1.0.74.13, lib/setupCards.ts). One block per tab
// where records go in, a sideways row of cards for each part of it, each
// card about three quarters of the window wide so the next one shows at the
// edge. A card opens with its lens's icon on a strip in its tab's colour,
// says what the thing is, what you do and where it comes back, and ends on
// one button that opens the place to set it up. A done card turns green and
// says since when.
//
// Each tab folds (2026-10-28, direct request), the way Profile's menus do:
// opening one closes the one open before and brings the one opened to the
// top of the page, just under the header (components/BringToTop.tsx). The
// tab holding the first thing still to set up starts open, so there is
// always somewhere to begin and a how-to has a card to point at.
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { colors, hexToRgba } from '../constants/colors';
import { TAB_ROUTES } from '../constants/tabs';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import {
  GETS_BACK_LABEL,
  NOT_FOR_ME_LABEL,
  OPEN_IT_LABEL,
  SETUP_CARDS_CAPTION,
  SETUP_CARDS_HEADING,
  SET_ASIDE_LABEL,
  SET_IT_UP_LABEL,
  START_HERE_CARD_LABEL,
  WHAT_IT_IS_LABEL,
  WHAT_YOU_DO_LABEL,
  WORKS_WITH_LABEL,
  buildSetupShelves,
  cardTitle,
  giveBackExplanation,
  type SetupCardView,
  type SetupShelfView,
  type SetupTabView,
} from '../lib/setupCards';
import { datelineFor, type StoryDestination, type YourStoryView } from '../lib/yourStory';
import type { GuideRecords } from '../lib/yourStoryGuides';
import type { ToolMark } from '../lib/toolHowTos';
import { useWalkMark } from './WalkMark';
import { useBringToTop } from './BringToTop';
import { HOME_BAND_CONTENT_PADDING, HOME_BAND_GAP, homeBandStyle } from './HomeSectionBand';
import { HorizontalScroll } from './HorizontalScroll';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  view: YourStoryView;
  records: GuideRecords;
  startPath: string | null;
  go: (destination: Exclude<StoryDestination, { kind: 'beats' }>) => void;
  explain: (title: string, body: string) => void;
  // 'inBand' on Home, where the whole list sits inside the Your Guide band.
  // 'bands' on the startup setup (2026-10-28, direct request), which is not
  // inside anything: the heading and each tab are bands of their own, edge
  // to edge, with nothing indented.
  layout?: 'inBand' | 'bands';
  // Told which card Set It Up was pressed on, in place of go, so setup can
  // name it in its strip and say once it is saved.
  onCardGo?: (card: SetupCardView) => void;
};

const DONE_COLOR = colors.statusGreenOnSurface;
// Dark text on a filled button carries no shadow.
const NO_SHADOW = { textShadowColor: 'transparent', textShadowRadius: 0 } as const;

function tabOf(path: string) {
  return TAB_ROUTES.find((route) => route.path === path);
}

type CardProps = {
  card: SetupCardView;
  tabColor: string;
  width: number;
  view: YourStoryView;
  go: Props['go'];
  explain: Props['explain'];
  onCardGo?: Props['onCardGo'];
  // The walk marks a how-to rings, on the one card it points at.
  markCard?: ToolMark;
  markGo?: ToolMark;
  // Over the area chips, a label other than Where it comes back.
  areasLabel?: string;
  // Shown as a quiet button under Set It Up when given.
  onNotForMe?: () => void;
};

// One card, shared by Your Guide on Home and the What fills this in row on
// a lens.
export function SetupCard({ card, tabColor, width, view, go, explain, onCardGo, markCard, markGo, areasLabel, onNotForMe }: CardProps) {
  const walkMark = useWalkMark();
  const done = !!card.doneOn;
  const tint = done ? DONE_COLOR : tabColor;
  const partners = (card.def.worksWith ?? []).map(cardTitle).filter((title): title is string => !!title);
  return (
    <View
      ref={markCard ? walkMark.ref(markCard) : undefined}
      style={[styles.card, { width, borderColor: hexToRgba(tint, done ? 0.7 : 0.55) }, markCard && walkMark(markCard)]}
    >
      <View style={[styles.hero, { backgroundColor: hexToRgba(tint, 0.2) }]}>
        <View style={[styles.heroCircle, { backgroundColor: hexToRgba(tint, 0.3), borderColor: tint }]}>
          <Ionicons name={(done ? 'checkmark' : card.def.icon) as IconName} size={34} color={tint} style={textShadow} />
        </View>
        <View style={styles.takesTag}>
          <Ionicons name={done ? 'checkmark-circle-outline' : 'time-outline'} size={12} color={tint} style={textShadow} />
          <Text style={styles.takesText}>{done && card.doneOn ? datelineFor(card.doneOn) : card.def.takes}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{card.def.title}</Text>
        <Text style={[styles.hook, { color: tint }]}>{card.def.hook}</Text>
        {card.setAside ? <Text style={styles.muted}>{SET_ASIDE_LABEL}</Text> : null}
        <View style={styles.part}>
          <View style={styles.partHead}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} style={textShadow} />
            <Text style={styles.partLabel}>{WHAT_IT_IS_LABEL}</Text>
          </View>
          <Text style={styles.partText}>{card.def.whatItIs}</Text>
        </View>
        <View style={styles.part}>
          <View style={styles.partHead}>
            <Ionicons name="hand-left-outline" size={13} color={colors.textMuted} style={textShadow} />
            <Text style={styles.partLabel}>{WHAT_YOU_DO_LABEL}</Text>
          </View>
          <Text style={styles.partText}>{card.def.whatYouDo}</Text>
        </View>
        {card.areas.length > 0 ? (
        <View style={styles.part}>
          <View style={styles.partHead}>
            <Ionicons name="return-down-back-outline" size={13} color={colors.textMuted} style={textShadow} />
            <Text style={styles.partLabel}>{areasLabel ?? GETS_BACK_LABEL}</Text>
          </View>
          <View style={styles.chips}>
            {card.areas.map((area) => {
              const areaTab = tabOf(area.tabPath);
              const color = areaTab?.color ?? colors.primary;
              return (
                <TouchableOpacity
                  key={area.key}
                  style={[styles.areaChip, { backgroundColor: hexToRgba(color, 0.16), borderColor: hexToRgba(color, 0.6) }]}
                  onPress={() => explain(t(area.label), giveBackExplanation(area, view, (english) => t(english)))}
                  accessibilityRole="button"
                  accessibilityLabel={area.label}
                >
                  <Ionicons name={(areaTab?.icon ?? 'ellipse') as IconName} size={11} color={color} style={textShadow} />
                  <Text style={styles.areaChipText}>{area.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        ) : null}
        {partners.length > 0 ? (
          <Text style={styles.muted}>{t('{label}: {names}', { label: t(WORKS_WITH_LABEL), names: partners.map((name) => t(name)).join(', ') })}</Text>
        ) : null}
        <View style={styles.spacer} />
        <TouchableOpacity
          ref={markGo ? walkMark.ref(markGo) : undefined}
          style={[
            done ? styles.openButton : styles.goButton,
            done ? { borderColor: tint } : { backgroundColor: tint },
            markGo && walkMark(markGo),
          ]}
          onPress={() => (onCardGo ? onCardGo(card) : go(card.def.destination))}
          accessibilityRole="button"
          accessibilityLabel={`${done ? OPEN_IT_LABEL : SET_IT_UP_LABEL}: ${card.def.title}`}
        >
          <Text style={done ? styles.openButtonText : styles.goButtonText}>{done ? OPEN_IT_LABEL : SET_IT_UP_LABEL}</Text>
          {done ? (
            <Ionicons name="arrow-forward" size={15} color={tint} style={textShadow} />
          ) : (
            <Ionicons name="arrow-forward" size={15} color={colors.textOnButton} style={NO_SHADOW} />
          )}
        </TouchableOpacity>
        {onNotForMe ? (
          <TouchableOpacity style={styles.notForMe} onPress={onNotForMe} accessibilityRole="button" accessibilityLabel={`${NOT_FOR_ME_LABEL}: ${card.def.title}`}>
            <Text style={styles.notForMeText}>{NOT_FOR_ME_LABEL}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}


// Three quarters of the window, never so wide on a computer that a row
// shows only one card.
export function setupCardWidth(windowWidth: number): number {
  return Math.round(Math.min(Math.max(windowWidth * 0.75, 240), 340));
}

function hasOpenCard(tab: SetupTabView): boolean {
  return tab.shelves.some((shelf) => shelf.openCount > 0);
}

export function SetupCardShelves({ view, records, startPath, go, explain, layout = 'inBand', onCardGo }: Props) {
  const bands = layout === 'bands';
  const { width } = useWindowDimensions();
  const cardWidth = setupCardWidth(width);
  const tabs = buildSetupShelves(view, records, startPath);
  const bringToTop = useBringToTop();
  const headRefs = useRef(new Map<string, View | null>());
  const [openPath, setOpenPath] = useState<string | null | undefined>(undefined);
  if (tabs.length === 0) return null;
  // Until somebody taps a tab, the one with the first thing left to set up.
  const startOpen = (tabs.find((tab) => tab.startHere && hasOpenCard(tab)) ?? tabs.find(hasOpenCard))?.def.path ?? null;
  const shownOpen = openPath === undefined ? startOpen : openPath;
  let firstOpenMarked = false;

  function toggle(path: string) {
    if (shownOpen === path) {
      setOpenPath(null);
      return;
    }
    setOpenPath(path);
    bringToTop?.(headRefs.current.get(path) ?? null);
  }

  function renderShelf(shelf: SetupShelfView, tabColor: string) {
    const total = shelf.cards.length;
    const settled = total - shelf.openCount;
    return (
      <View key={shelf.def.key} style={styles.shelf}>
        <View style={styles.shelfHead}>
          <Text style={styles.shelfTitle}>{shelf.def.title}</Text>
          <Text style={styles.shelfCount}>{t('{done} of {total} set up', { done: settled, total })}</Text>
        </View>
        <HorizontalScroll showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {shelf.cards.map((card) => {
            const markThis = !card.doneOn && !firstOpenMarked;
            if (markThis) firstOpenMarked = true;
            return (
              <SetupCard
                key={card.def.key}
                card={card}
                tabColor={tabColor}
                width={cardWidth}
                view={view}
                go={go}
                explain={explain}
                onCardGo={onCardGo}
                markCard={markThis ? 'home.setupCards' : undefined}
                markGo={markThis ? 'home.setupCardGo' : undefined}
              />
            );
          })}
        </HorizontalScroll>
      </View>
    );
  }

  function renderTab(tab: SetupTabView) {
    const route = tabOf(tab.def.path);
    const color = route?.color ?? colors.primary;
    const open = shownOpen === tab.def.path;
    return (
      <View key={tab.def.path} style={[bands ? styles.tabBand : styles.tab, { borderLeftColor: color }]}>
        <TouchableOpacity
          ref={(node) => {
            headRefs.current.set(tab.def.path, node);
          }}
          style={styles.tabHeadButton}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => toggle(tab.def.path)}
        >
          <View style={styles.tabHead}>
            <Ionicons name={(route?.icon ?? 'ellipse') as IconName} size={20} color={color} style={textShadow} />
            <Text style={styles.tabTitle}>{tab.def.title}</Text>
            {tab.startHere ? <Text style={styles.startHere}>{START_HERE_CARD_LABEL}</Text> : null}
            <View style={styles.spacer} />
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} style={textShadow} />
          </View>
          <Text style={styles.tabLine}>{tab.def.line}</Text>
        </TouchableOpacity>
        {open ? tab.shelves.map((shelf) => renderShelf(shelf, color)) : null}
      </View>
    );
  }

  return (
    <View style={bands ? styles.wrapBands : styles.wrap}>
      <View style={bands ? styles.headBand : styles.head}>
        <Text style={styles.heading}>{SETUP_CARDS_HEADING}</Text>
        <Text style={styles.caption}>{SETUP_CARDS_CAPTION}</Text>
      </View>
      {tabs.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16, backgroundColor: colors.surface },
  head: { gap: 2, backgroundColor: colors.surface },
  wrapBands: { gap: HOME_BAND_GAP },
  headBand: { ...homeBandStyle, borderColor: colors.border, gap: 2, padding: HOME_BAND_CONTENT_PADDING },
  tabBand: { ...homeBandStyle, borderColor: colors.border, gap: 8, padding: HOME_BAND_CONTENT_PADDING },
  heading: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  tab: { gap: 8, borderLeftWidth: 3, paddingLeft: 10, backgroundColor: colors.surface },
  tabHeadButton: { gap: 8, paddingVertical: 4, backgroundColor: colors.surface },
  tabHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tabTitle: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  startHere: { ...typography.caption, color: colors.accent, ...textShadow },
  tabLine: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  shelf: { gap: 6, backgroundColor: colors.surface },
  shelfHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  shelfTitle: { ...typography.label, color: colors.textPrimary, ...textShadow },
  shelfCount: { ...typography.caption, color: colors.textMuted, ...textShadow },
  row: { gap: 12, paddingRight: 12, alignItems: 'stretch' },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  hero: { height: 92, alignItems: 'center', justifyContent: 'center' },
  heroCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takesTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  takesText: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  cardBody: { flex: 1, padding: 12, gap: 8, backgroundColor: colors.surfaceMuted },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary, ...textShadow },
  hook: { ...typography.body, ...textShadow },
  muted: { ...typography.caption, color: colors.textMuted, ...textShadow },
  part: { gap: 2, backgroundColor: colors.surfaceMuted },
  partHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partLabel: { ...typography.eyebrow, color: colors.textMuted, ...textShadow },
  partText: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 },
  // Each chip is tinted with the tab the card gives back to, so it is not on
  // the shared PILL look (scripts/audit_pill_style.js EXEMPT).
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  areaChipText: { ...typography.caption, color: colors.textPrimary, ...textShadow },
  spacer: { flex: 1 },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  goButtonText: { ...typography.label, color: colors.textOnButton, ...NO_SHADOW },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: colors.surface,
  },
  notForMe: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surfaceMuted },
  notForMeText: { ...typography.caption, color: colors.textMuted, ...textShadow },
  openButtonText: { ...typography.label, color: colors.textPrimary, ...textShadow },
});
