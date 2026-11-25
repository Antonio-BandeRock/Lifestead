// The Diary card on Home (1.0.96.2): the way into a new entry, and what was
// written on this day in earlier years. It never says nothing was written,
// and while the vault holds the diary it shows nothing of it.
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { localStamp } from '../lib/dailyScales';
import { entryTitle, onThisDay, type DiaryEntry } from '../lib/diary';
import { listDiaryEntries } from '../lib/diaryDb';
import { t } from '../lib/i18n';
import { useVaultReloadKey } from '../lib/vaultReads';
import { useVault } from '../lib/vaultSession';
import { HOME_BAND_CONTENT_PADDING } from './HomeSectionBand';
import { VaultClosedBand } from './VaultClosedBand';

export function DiaryHomeCard({ tabColor }: { tabColor: string }) {
  const router = useRouter();
  const vault = useVault();
  const closed = vault.closed && vault.categories.includes('diary');
  const vaultKey = useVaultReloadKey();
  const [earlier, setEarlier] = useState<DiaryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      listDiaryEntries()
        .then((entries) => setEarlier(onThisDay(entries, localStamp(new Date()).slice(0, 10))))
        .catch((error) => {
          // Only the earlier years are lost; the diary itself says if it cannot be read.
          console.warn('Earlier diary entries could not be read', error);
          setEarlier([]);
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- vaultKey reads again as the vault opens or closes
    }, [vaultKey]),
  );

  if (closed) return <VaultClosedBand color={tabColor} categories={['diary']} />;

  return (
    <View style={styles.body}>
      <TouchableOpacity
        style={styles.primary}
        onPress={() => router.push({ pathname: '/life', params: { openLifeLens: 'diary', openDiaryWrite: String(Date.now()) } })}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>Write in Your Diary</Text>
      </TouchableOpacity>
      {earlier.length > 0 ? <Text style={styles.caption}>On this day</Text> : null}
      {earlier.map((entry) => (
        <TouchableOpacity
          key={entry.id}
          style={styles.row}
          onPress={() => router.push({ pathname: '/life', params: { openLifeLens: 'diary', openDiaryEntryId: entry.id } })}
          accessibilityRole="button"
        >
          <Text style={styles.caption}>{entry.happenedAt.slice(0, 4)}</Text>
          <Text style={styles.text}>{entryTitle(entry) || t('A diary entry')}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8, paddingHorizontal: HOME_BAND_CONTENT_PADDING, paddingVertical: 10 },
  primary: { ...BUTTON_PRIMARY },
  primaryText: { ...BUTTON_PRIMARY_TEXT },
  row: { gap: 2, paddingVertical: 6 },
  caption: { ...typography.caption, color: colors.textMuted, textShadowColor: 'transparent', textShadowRadius: 0 },
  text: { ...typography.body, color: colors.textPrimary, textShadowColor: 'transparent', textShadowRadius: 0 },
});
