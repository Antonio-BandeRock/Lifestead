// Not Tried Yet, in a tab's group on Home (lib/untriedLenses.ts). One row
// per lens on the tab that has not been used yet, with its name and what it
// does; a tap opens that lens. Home draws the card only while the list has
// something on it.
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { TAB_ROUTES } from '../constants/tabs';
import { textShadow, typography } from '../constants/typography';
import { t } from '../lib/i18n';
import { UNTRIED_LINE, untriedRoute, type UntriedTabPath } from '../lib/untriedLenses';
import { lensLine, lensName } from '../lib/yourStoryInterview';
import { useWalkMark } from './WalkMark';

type Props = { path: UntriedTabPath; lenses: readonly string[] };

export function UntriedLensCards({ path, lenses }: Props) {
  const router = useRouter();
  const walkMark = useWalkMark();
  const color = TAB_ROUTES.find((route) => route.path === path)?.color ?? colors.primary;
  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>{UNTRIED_LINE}</Text>
      {lenses.map((lens, index) => {
        const line = lensLine(path, lens);
        return (
          <TouchableOpacity
            key={lens}
            ref={index === 0 ? walkMark.ref('home.untriedLens') : undefined}
            style={[styles.row, index === 0 && walkMark('home.untriedLens')]}
            onPress={() => router.push(untriedRoute(path, lens) as unknown as Href)}
            accessibilityRole="button"
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{t(lensName(path, lens))}</Text>
              {line ? <Text style={styles.rowDetail}>{t(line)}</Text> : null}
            </View>
            <Ionicons name="arrow-forward-circle-outline" size={18} color={color} style={textShadow} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  line: { ...typography.body, color: colors.textSecondary, ...textShadow },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  rowDetail: { ...typography.caption, color: colors.textMuted, ...textShadow },
});
