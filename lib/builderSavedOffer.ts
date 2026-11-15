// What a Food builder says once a new dish is saved (2026-11-15). The old
// notice said only that the dish was saved and a fresh one was starting,
// which left the person to guess where it went and how to eat it. Now it
// names the band of My Recipes it is in and offers to log it or put it on
// the schedule, which hands the dish to Meal Builder through the same
// buildMealFrom param Log or Schedule a Meal already uses.
import type { useRouter } from 'expo-router';
import type { ConfirmSheetRequest } from '../components/ConfirmSheet';
import type { MealComponentType } from './db';
import { t } from './i18n';
import { encodeBuildMealHandoff } from './mealBuilderHandoff';

export async function offerToLogSavedDish(args: {
  confirm: (request: ConfirmSheetRequest) => Promise<boolean>;
  router: ReturnType<typeof useRouter>;
  componentType: MealComponentType;
  // The title shown in the notice, e.g. 'Side saved'.
  title: string;
  // The band of My Recipes the dish lands in, e.g. 'Saved Sides'.
  listTitle: string;
  name: string;
  id: string | null;
}): Promise<void> {
  const { confirm, router, componentType, title, listTitle, name, id } = args;
  const logIt = await confirm({
    title: t(title),
    message: t('{name} is in My Recipes under {list}. Log it as eaten or put it on your schedule now, or start a fresh one.', {
      name,
      list: t(listTitle),
    }),
    confirmLabel: t('Log or schedule it'),
    cancelLabel: t('Start a fresh one'),
  });
  if (!logIt || !id) return;
  const buildMealFrom = encodeBuildMealHandoff({ name, items: [{ componentType, componentId: id }], nonce: Date.now() });
  router.push({ pathname: '/food', params: { buildMealFrom } });
}
