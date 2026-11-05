// Add to the Grocery List from Home, C6 of the competitive build plan
// (Phase 2, 2026-09-26). One box, typed or spoken, split into items the same
// way a Capture note is (groceryItemsFromNote in lib/captureNotes.ts), and
// added to the list being shopped from. With no list yet, a plain one is made
// by hand rather than built from the schedule, so saying "eggs" never pulls a
// week of meal ingredients in beside it.
//
// Each item is matched against the food database (2026-11-04,
// lib/groceryFoodMatch.ts): a plain match goes on under the database name,
// so the kitchen and the recipes find it, and an item that could be one of a
// few foods waits under Did you mean with Keep as Typed beside the choices.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PILL_SMALL, PILL_TEXT } from '../constants/buttons';
import { colors } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import { groceryItemsFromNote } from '../lib/captureNotes';
import { addFoodsToActiveGroceryList } from '../lib/groceryDb';
import { matchFoodName } from '../lib/groceryFoodMatch';
import { t } from '../lib/i18n';
import { foodDisplayName } from '../lib/ingredientShortName';
import { listPurchasableFoods, type PurchasableFood } from '../lib/kitchenDb';
import { explainNotYet } from '../lib/notYet';
import { AppTextInput } from './AppTextInput';
import { useWalkMark } from './WalkMark';

type Props = {
  tabColor: string;
  onOpenList: () => void;
};

export function GroceryQuickAdd({ tabColor, onOpenList }: Props) {
  const walkMark = useWalkMark();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  // Items that could be one of a few foods, asked about one at a time.
  const [unsure, setUnsure] = useState<{ typed: string; options: PurchasableFood[] }[]>([]);
  const items = groceryItemsFromNote(text);

  async function add() {
    if (items.length === 0 || saving) return;
    setSaving(true);
    try {
      const foods = await listPurchasableFoods();
      const sure: { foodName: string; category?: string }[] = [];
      const waiting: { typed: string; options: PurchasableFood[] }[] = [];
      for (const item of items) {
        const found = matchFoodName(item, foods, (english) => t(english));
        if (found.kind === 'match') sure.push({ foodName: found.food.baseName, category: found.food.category });
        else if (found.kind === 'choose') waiting.push({ typed: item, options: found.options });
        else sure.push({ foodName: item });
      }
      const count = await addFoodsToActiveGroceryList(sure);
      setText('');
      setUnsure(waiting);
      const names = sure.map((food) => foodDisplayName(food.foodName));
      if (count === 0) setAdded(null);
      else setAdded(count === 1 ? t('{name} is on the list.', { name: names[0] }) : t('{count} things are on the list: {names}.', { count, names: names.join(', ') }));
    } finally {
      setSaving(false);
    }
  }

  async function settle(food: { foodName: string; category?: string }) {
    if (saving) return;
    setSaving(true);
    try {
      await addFoodsToActiveGroceryList([food]);
      setUnsure((was) => was.slice(1));
      setAdded(t('{name} is on the list.', { name: foodDisplayName(food.foodName) }));
    } finally {
      setSaving(false);
    }
  }

  const asking = unsure[0] ?? null;

  return (
    <View style={styles.body}>
      <View ref={walkMark.ref('home.groceryType')} collapsable={false} style={styles.inputRow}>
        <AppTextInput
          onVoiceResult={(transcript) => setText(transcript)}
          micColor={tabColor}
          style={styles.input}
          value={text}
          onChangeText={(value) => {
            setText(value);
            setAdded(null);
          }}
          placeholder="eggs, milk and bread"
          onSubmitEditing={() => void add()}
          returnKeyType="done"
        />
      </View>
      {items.length > 1 ? <Text style={styles.caption}>{`Adds ${items.length}: ${items.join(', ')}`}</Text> : null}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          ref={walkMark.ref('home.groceryAdd')}
          style={[styles.button, { borderColor: tabColor }, items.length === 0 ? styles.off : null]}
          activeOpacity={0.8}
          onPress={() => {
            if (items.length === 0) {
              explainNotYet('Type what to add first, for example "eggs, milk and bread".');
              return;
            }
            void add();
          }}
          disabled={saving}
        >
          <Ionicons name="add-circle-outline" size={18} color={tabColor} />
          <Text style={[styles.buttonText, { color: tabColor }]}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity
          ref={walkMark.ref('home.groceryQuickOpen')}
          style={[styles.button, { borderColor: tabColor }]}
          activeOpacity={0.8}
          onPress={onOpenList}
        >
          <Ionicons name="cart-outline" size={18} color={tabColor} />
          <Text style={[styles.buttonText, { color: tabColor }]}>Open the list</Text>
        </TouchableOpacity>
      </View>
      {added ? <Text style={styles.caption}>{added}</Text> : null}
      {asking ? (
        <View style={styles.askBlock}>
          <Text style={styles.caption}>{t('Did you mean, for "{typed}"', { typed: asking.typed })}</Text>
          <View ref={walkMark.ref('home.groceryDidYouMean')} collapsable={false} style={styles.buttonRow}>
            {asking.options.map((food) => {
              const shortName = foodDisplayName(food.baseName);
              const twin = asking.options.some((other) => other !== food && foodDisplayName(other.baseName) === shortName);
              return (
                <TouchableOpacity
                  key={`${food.category}|${food.baseName}`}
                  style={styles.pill}
                  activeOpacity={0.85}
                  onPress={() => void settle({ foodName: food.baseName, category: food.category })}
                >
                  <Text style={styles.pillText}>{twin ? food.baseName : shortName}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.pill} activeOpacity={0.85} onPress={() => void settle({ foodName: asking.typed })}>
              <Text style={styles.pillText}>Keep as Typed</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  caption: { ...typography.caption, ...textShadow, color: colors.textMuted },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  off: { opacity: 0.5 },
  askBlock: { gap: 6 },
  pill: { ...PILL_SMALL },
  pillText: { ...PILL_TEXT },
  buttonText: { ...typography.bodyEmphasis, textShadowColor: 'transparent', textShadowRadius: 0 },
});
