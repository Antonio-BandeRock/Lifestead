// Show more for a list kept on the device in full (2026-11-15). Nothing a
// person records is ever capped: a long list shows its newest stretch first
// and this carries on from there, saying how many are still to come, so a
// list that stops never looks like the whole of it.
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BUTTON_SECONDARY_COMPACT, BUTTON_SECONDARY_TEXT } from '../constants/buttons';
import { t } from '../lib/i18n';

/** How many rows a list shows first, and how many more each press brings. */
export const LIST_PAGE = 25;

/** The part of `items` on screen now, and what Show more needs. */
export function useShownPart<T>(items: readonly T[], page = LIST_PAGE): { shown: T[]; more: number; showMore: () => void } {
  const [limit, setLimit] = useState(page);
  const shown = items.slice(0, limit);
  return { shown, more: Math.max(0, items.length - shown.length), showMore: () => setLimit((n) => n + page) };
}

export function ShowMoreButton({ more, onPress, page = LIST_PAGE, monthly = false }: { more: number; onPress: () => void; page?: number; /** Counts months, not rows. */ monthly?: boolean }) {
  if (more <= 0) return null;
  const next = Math.min(more, page);
  const label = more === 1
    ? t(monthly ? 'Show the last month' : 'Show the last one')
    : monthly
    ? more <= page
      ? t('Show the last {count} months', { count: String(more) })
      : t('Show {next} more months of {count}', { next: String(next), count: String(more) })
    : more <= page
      ? t('Show the last {count}', { count: String(more) })
      : t('Show {next} more of {count}', { next: String(next), count: String(more) });
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} accessibilityRole="button">
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { ...BUTTON_SECONDARY_COMPACT, alignSelf: 'flex-start' },
  text: { ...BUTTON_SECONDARY_TEXT },
});
