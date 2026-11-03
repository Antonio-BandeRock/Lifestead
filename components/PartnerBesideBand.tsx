// What a partner shares about themselves, beside this person's own (1.0.80.3).
//
// One fold per partner who has shared this kind and whose side is shown on
// this phone, under their name, read only. Nothing here writes: their meds,
// card, appointments and money are theirs, and they change them on their
// phone. The caption says how fresh the copy is, since it is only as new as
// their last send. Drawn below the person's own records on My Meds,
// Emergency, Appointments and Finances; lib/peerBeside.ts has the rules.
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { useBandFolds } from '../hooks/useBandFolds';
import { formatFinanceMoney } from '../lib/financeCore';
import { t } from '../lib/i18n';
import { useLanguage } from '../lib/language';
import { BESIDE_TITLES, besideFreshness, besideRows, type BesideKind } from '../lib/peerBeside';
import { listBeside, type BesidePerson } from '../lib/peerBesideDb';
import { TabBand, useTabBandStyles } from './TabBand';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PartnerBesideBand({ kind, tabColor }: { kind: BesideKind; tabColor: string }) {
  const folds = useBandFolds();
  const band = useTabBandStyles(tabColor);
  useLanguage();
  const [people, setPeople] = useState<BesidePerson<BesideKind>[]>([]);

  useFocusEffect(
    useCallback(() => {
      let current = true;
      listBeside(kind).then((found) => {
        if (current) setPeople(found);
      });
      return () => {
        current = false;
      };
    }, [kind]),
  );

  if (people.length === 0) return null;
  const today = localToday();
  return (
    <>
      {people.map((person) => {
        const rows = besideRows(kind, person.body, formatFinanceMoney, t);
        return (
          <TabBand
            key={person.connectionId}
            folds={folds}
            color={tabColor}
            id={`beside:${kind}:${person.connectionId}`}
            title={t(BESIDE_TITLES[kind], { name: person.name })}
            icon="people-outline"
            count={rows.length}
          >
            <View style={band.rows}>
              <Text style={styles.caption}>{besideFreshness(person.sentAt, today, t)}</Text>
              {rows.map((row, index) => (
                <View key={`${row.title}:${index}`} style={band.row}>
                  <Text style={styles.title}>{row.title}</Text>
                  {row.caption ? <Text style={styles.meta}>{row.caption}</Text> : null}
                </View>
              ))}
            </View>
          </TabBand>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  caption: { ...typography.caption, color: colors.textSecondary, ...textShadow },
  title: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  meta: { ...typography.caption, color: colors.textSecondary, ...textShadow },
});
