// The plain file behind the running-low notification (lib/kitchenLow.ts):
// which foods were asked about and how each was answered, and the Add to
// list presses still to be written. Holds mark ids only, never a food's name,
// so it says nothing to anyone reading the phone's storage. The same shape
// lib/calendarOffer.ts keeps for a calendar event.
import { File, Paths } from 'expo-file-system';
import { EMPTY_KITCHEN_LOW_STATE, parseKitchenLowState, type KitchenLowOfferState } from './kitchenLow';

export const KITCHEN_LOW_PREFIX = 'inside-story-kitchen-low-';
export const KITCHEN_LOW_FILE_NAME = 'kitchen-low-offer.json';

export function kitchenLowIdentifier(markId: string): string {
  return KITCHEN_LOW_PREFIX + markId;
}

export function readKitchenLowState(): KitchenLowOfferState {
  try {
    const file = new File(Paths.document, KITCHEN_LOW_FILE_NAME);
    if (file.exists) return parseKitchenLowState(file.textSync()) ?? { ...EMPTY_KITCHEN_LOW_STATE };
  } catch (error) {
    console.error('[kitchenLow] the offer file could not be read', error);
  }
  return { ...EMPTY_KITCHEN_LOW_STATE };
}

export function writeKitchenLowState(state: KitchenLowOfferState): void {
  try {
    const file = new File(Paths.document, KITCHEN_LOW_FILE_NAME);
    if (!file.exists) file.create();
    file.write(JSON.stringify(state));
  } catch (error) {
    console.error('[kitchenLow] the offer file could not be written', error);
  }
}
