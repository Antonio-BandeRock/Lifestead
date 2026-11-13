// Change the dishes of one planned meal, on any day (2026-11-13, direct
// request: "replace meals with their own self added meals or other system
// meals, or they can replace individual sides with something they add or from
// the system").
//
// A planned meal is a set of dishes. Each can be swapped for one of the
// person's saved dishes or one of the app's recipes, or taken off, and more
// can be added. Saving writes a new set for this one occurrence only
// (replaceScheduledMealDishes in lib/db.ts); other days and other meals from
// the same plan stay as they were.
//
// An app recipe picked here becomes a hidden saved dish only when Save is
// pressed, the same conversion Meal Builder's picker makes, so backing out
// leaves nothing behind.
import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppTextInput } from './AppTextInput';
import { useInfoAlert } from './InfoAlert';
import { BUTTON_PRIMARY, BUTTON_PRIMARY_TEXT, BUTTON_SECONDARY, BUTTON_SECONDARY_TEXT, PILL_SMALL, PILL_ON, PILL_ON_TEXT, PILL_TEXT } from '../constants/buttons';
import { colors, inputBackground } from '../constants/colors';
import { textShadow, typography } from '../constants/typography';
import {
  getScheduledMealDishes,
  listCuratedRecipeComponentOptions,
  listMealComponentOptions,
  materializeCuratedRecipeAsMealComponent,
  replaceScheduledMealDishes,
  type CuratedComponentOption,
  type MealComponentOption,
  type MealComponentType,
  type ScheduledMealDish,
} from '../lib/db';
import { explainNotYet } from '../lib/notYet';
import { modalAnimationType } from '../lib/visualPreferences';
import { t } from '../lib/i18n';

export const CHANGE_DISHES_LABEL = 'Change dishes';

const KIND_LABELS: { type: MealComponentType; label: string }[] = [
  { type: 'bakedGoods', label: 'Baked goods' },
  { type: 'beverage', label: 'Drink' },
  { type: 'dessert', label: 'Dessert' },
  { type: 'fermentation', label: 'Ferment' },
  { type: 'handheld', label: 'Handheld' },
  { type: 'salad', label: 'Salad' },
  { type: 'sauce', label: 'Sauce' },
  { type: 'side', label: 'Side or main' },
  { type: 'smoothie', label: 'Smoothie' },
  { type: 'snack', label: 'Snack' },
  { type: 'soup', label: 'Soup' },
];

function kindLabel(type: MealComponentType): string {
  return KIND_LABELS.find((kind) => kind.type === type)?.label ?? 'Dish';
}

// One dish in the sheet. A dish picked from the app's recipes has no saved
// record yet, so it carries the recipe id until Save makes one.
type DraftDish = ScheduledMealDish & { key: string; pendingRecipeId: string | null };

function matches(option: MealComponentOption, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return option.name.toLowerCase().includes(query) || (option.ingredientNames ?? '').toLowerCase().includes(query);
}

export function ChangeDishesSheet({
  scheduleItemId,
  tabColor,
  onClose,
  onSaved,
}: {
  scheduleItemId: string | null;
  tabColor: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [showInfoAlert, infoAlertElement] = useInfoAlert();
  const [title, setTitle] = useState('');
  const [dishes, setDishes] = useState<DraftDish[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Set while choosing a dish: which dish it replaces (null adds one) and
  // which kind of dish is listed.
  const [picking, setPicking] = useState<{ replaceKey: string | null; type: MealComponentType } | null>(null);
  const [search, setSearch] = useState('');
  const [yours, setYours] = useState<MealComponentOption[]>([]);
  const [appRecipes, setAppRecipes] = useState<CuratedComponentOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    if (!scheduleItemId) return;
    let alive = true;
    setLoading(true);
    setPicking(null);
    getScheduledMealDishes(scheduleItemId).then((found) => {
      if (!alive) return;
      setTitle(found?.title ?? '');
      setDishes((found?.dishes ?? []).map((dish, index) => ({ ...dish, key: `${dish.componentId}_${index}`, pendingRecipeId: null })));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [scheduleItemId]);

  useEffect(() => {
    if (!picking) return;
    let alive = true;
    setOptionsLoading(true);
    Promise.all([listMealComponentOptions(picking.type), listCuratedRecipeComponentOptions(picking.type)]).then(([saved, curated]) => {
      if (!alive) return;
      setYours(saved);
      setAppRecipes(curated);
      setOptionsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [picking]);

  const shownYours = useMemo(() => yours.filter((option) => matches(option, search)), [yours, search]);
  const shownApp = useMemo(() => appRecipes.filter((option) => matches(option, search)), [appRecipes, search]);

  function startPicking(replaceKey: string | null, type: MealComponentType) {
    setSearch('');
    setPicking({ replaceKey, type });
  }

  function choose(option: MealComponentOption, fromApp: boolean) {
    if (!picking) return;
    const replaced = picking.replaceKey ? dishes.find((dish) => dish.key === picking.replaceKey) : undefined;
    const next: DraftDish = {
      key: `${option.id}_${Date.now()}`,
      componentType: picking.type,
      componentId: fromApp ? '' : option.id,
      // A swap keeps the share of the dish it replaces; an added dish is the
      // whole of what it makes, the same as a planned dish.
      yourSharePercent: replaced?.yourSharePercent ?? 100,
      name: option.name,
      curatedRecipeId: fromApp ? option.id : null,
      pendingRecipeId: fromApp ? option.id : null,
    };
    setDishes((current) =>
      picking.replaceKey ? current.map((dish) => (dish.key === picking.replaceKey ? next : dish)) : [...current, next],
    );
    setPicking(null);
  }

  function removeDish(key: string) {
    setDishes((current) => current.filter((dish) => dish.key !== key));
  }

  async function save() {
    if (!scheduleItemId) return;
    if (dishes.length === 0) {
      explainNotYet('This meal has no dishes left. Add a dish, or close this and use Skip to leave the meal out.');
      return;
    }
    setSaving(true);
    try {
      const ready: ScheduledMealDish[] = [];
      for (const dish of dishes) {
        if (dish.pendingRecipeId) {
          const made = await materializeCuratedRecipeAsMealComponent(dish.pendingRecipeId);
          if ('error' in made) {
            showInfoAlert('Could not add that recipe', made.error);
            return;
          }
          ready.push({ componentType: made.componentType, componentId: made.componentId, yourSharePercent: dish.yourSharePercent, name: made.name, curatedRecipeId: dish.pendingRecipeId });
        } else {
          ready.push({ componentType: dish.componentType, componentId: dish.componentId, yourSharePercent: dish.yourSharePercent, name: dish.name, curatedRecipeId: dish.curatedRecipeId });
        }
      }
      const result = await replaceScheduledMealDishes(scheduleItemId, ready);
      if ('error' in result) {
        showInfoAlert('Could not save', result.error);
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const replacing = picking?.replaceKey ? dishes.find((dish) => dish.key === picking.replaceKey) : undefined;

  return (
    <Modal visible={scheduleItemId !== null} transparent animationType={modalAnimationType('slide')} onRequestClose={picking ? () => setPicking(null) : onClose}>
      {infoAlertElement}
      <View style={styles.backdrop}>
        <TouchableOpacity accessibilityLabel="Close" style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {picking ? (replacing ? t('In place of {name}', { name: replacing.name }) : 'Add a dish') : t('Change dishes: {title}', { title })}
            </Text>
            <TouchableOpacity onPress={picking ? () => setPicking(null) : onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {picking ? (
            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.helper, { color: tabColor }]}>Which kind of dish?</Text>
              <View style={styles.pillRow}>
                {KIND_LABELS.map((kind) => {
                  const on = kind.type === picking.type;
                  return (
                    <TouchableOpacity key={kind.type} style={[styles.pill, on ? styles.pillOn : null]} onPress={() => startPicking(picking.replaceKey, kind.type)}>
                      <Text style={on ? styles.pillOnText : styles.pillText}>{kind.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <AppTextInput
                onVoiceResult={setSearch}
                micColor={tabColor}
                style={[styles.input, { backgroundColor: inputBackground(tabColor) }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search by name or ingredient"
                placeholderTextColor={colors.textMuted}
              />
              {optionsLoading ? (
                <Text style={styles.muted}>Loading…</Text>
              ) : (
                <>
                  <Text style={[styles.groupHeading, { color: tabColor }]}>Yours</Text>
                  {shownYours.length === 0 ? (
                    <Text style={styles.muted}>
                      {yours.length === 0 ? `You have no saved dishes of this kind yet. Dishes you build and save on Food are listed here.` : 'None of yours match that search.'}
                    </Text>
                  ) : (
                    shownYours.map((option) => (
                      <TouchableOpacity key={`y_${option.id}`} style={styles.optionRow} onPress={() => choose(option, false)}>
                        <Text style={styles.optionName}>{option.name}</Text>
                        {option.ingredientNames ? <Text style={styles.muted} numberOfLines={2}>{option.ingredientNames}</Text> : null}
                      </TouchableOpacity>
                    ))
                  )}
                  <Text style={[styles.groupHeading, { color: tabColor }]}>Lifestead recipes</Text>
                  {shownApp.length === 0 ? (
                    <Text style={styles.muted}>{appRecipes.length === 0 ? 'Lifestead has no recipes of this kind.' : 'No recipes match that search.'}</Text>
                  ) : (
                    shownApp.map((option) => (
                      <TouchableOpacity key={`a_${option.id}`} style={styles.optionRow} onPress={() => choose(option, true)}>
                        <Text style={styles.optionName}>{option.name}</Text>
                        {option.ingredientNames ? <Text style={styles.muted} numberOfLines={2}>{option.ingredientNames}</Text> : null}
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </ScrollView>
          ) : (
            <ScrollView style={styles.scroll}>
              <Text style={[styles.helper, { color: tabColor }]}>
                Swap any dish for one of your saved dishes or one of Lifestead&apos;s recipes, take one off, or add another. This changes this one meal only. To make your own version of a recipe with different ingredients, open it on Food, tap Build This Recipe, change what you like and save it: it is then listed under Yours.
              </Text>
              {loading ? (
                <Text style={styles.muted}>Loading…</Text>
              ) : dishes.length === 0 ? (
                <Text style={styles.muted}>No dishes are listed for this meal yet. Add one below.</Text>
              ) : (
                dishes.map((dish) => (
                  <View key={dish.key} style={styles.dishCard}>
                    <Text style={styles.optionName}>{dish.name}</Text>
                    <Text style={styles.muted}>{kindLabel(dish.componentType)}</Text>
                    <View style={styles.dishActions}>
                      <TouchableOpacity onPress={() => startPicking(dish.key, dish.componentType)}>
                        <Text style={[styles.action, { color: tabColor }]}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeDish(dish.key)}>
                        <Text style={styles.actionRemove}>Take off</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => startPicking(null, 'side')}>
                  <Text style={styles.secondaryButtonText}>Add a dish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, saving ? styles.busy : null]} disabled={saving} onPress={save}>
                  <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { ...typography.sectionTitle, color: colors.textPrimary, flex: 1, marginRight: 12, ...textShadow },
  closeText: { ...typography.sectionTitle, color: colors.textMuted, ...textShadow },
  scroll: { marginTop: 8 },
  helper: { ...typography.caption, marginBottom: 10, ...textShadow },
  muted: { ...typography.caption, color: colors.textMuted, ...textShadow },
  groupHeading: { ...typography.captionEmphasis, marginTop: 14, marginBottom: 6, ...textShadow },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: { ...PILL_SMALL },
  pillOn: { ...PILL_ON },
  pillText: { ...PILL_TEXT },
  pillOnText: { ...PILL_ON_TEXT },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...textShadow,
  },
  optionRow: { backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 10, marginBottom: 6, gap: 2 },
  optionName: { ...typography.bodyEmphasis, color: colors.textPrimary, ...textShadow },
  dishCard: { backgroundColor: colors.surfaceMuted, borderRadius: 12, padding: 12, marginBottom: 10, gap: 2 },
  dishActions: { flexDirection: 'row', gap: 18, marginTop: 6 },
  action: { ...typography.captionEmphasis, ...textShadow },
  actionRemove: { ...typography.captionEmphasis, color: colors.danger, ...textShadow },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6, marginBottom: 12 },
  primaryButton: { ...BUTTON_PRIMARY },
  primaryButtonText: { ...BUTTON_PRIMARY_TEXT },
  secondaryButton: { ...BUTTON_SECONDARY },
  secondaryButtonText: { ...BUTTON_SECONDARY_TEXT },
  busy: { opacity: 0.5 },
});
