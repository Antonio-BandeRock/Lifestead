// The vault offer at the first protected record (direct instruction,
// 2026-11-14): "if they choose to wait to set it up then it should be
// provided to them the moment they enter any data that should be
// protected", and "the offer should only come if they haven't already
// turned them on."
//
// lib/databaseActivity.ts tells lib/vaultState.ts about every write that
// went through; the first one adding a health or money row, whether or not
// setup has reached its security question, is held there until this sheet shows it. Mounted once at
// the app root, the GardenPlateOfferHost shape, so it comes up over whichever
// screen did the saving. Which rows count and when is in lib/vault.ts
// (firstRecordOfferFor), with its tests in scripts/test_vault.js.
import { useRouter } from 'expo-router';
import { useSyncExternalStore } from 'react';
import {
  FIRST_RECORD_ADD_LABEL,
  FIRST_RECORD_NOT_NOW_LABEL,
  FIRST_RECORD_SET_UP_LABEL,
  FIRST_RECORD_STOP_LABEL,
  VAULT_DEFAULT_CATEGORIES,
  categoriesWithGroup,
  firstRecordOfferText,
} from '../lib/vault';
import {
  answerFirstRecordOffer,
  chosenVaultCategories,
  currentVaultKey,
  getPendingVaultOffer,
  subscribeVaultOffer,
} from '../lib/vaultState';
import { setVaultCategories } from '../lib/vaultSession';
import { AppActionSheet } from './AppActionSheet';

export function VaultFirstRecordOfferHost() {
  const router = useRouter();
  const group = useSyncExternalStore(subscribeVaultOffer, getPendingVaultOffer, getPendingVaultOffer);
  if (group === null) return null;
  const hasCode = currentVaultKey() !== 'none';
  const words = firstRecordOfferText(group, currentVaultKey());

  function setUp(): void {
    if (group === null) return;
    answerFirstRecordOffer(group, 'setUp');
    setVaultCategories(VAULT_DEFAULT_CATEGORIES);
    router.push('/app-lock-setup');
  }

  // A code is already there, so this kind of record goes behind it now and
  // every other choice stays as it was.
  function add(): void {
    if (group === null) return;
    answerFirstRecordOffer(group, 'setUp');
    setVaultCategories(categoriesWithGroup(chosenVaultCategories(), group));
  }

  return (
    <AppActionSheet
      visible
      onClose={() => answerFirstRecordOffer(group, 'notNow')}
      title={words.title}
      message={words.message}
      actions={[
        hasCode ? { label: FIRST_RECORD_ADD_LABEL, onPress: add } : { label: FIRST_RECORD_SET_UP_LABEL, onPress: setUp },
        { label: FIRST_RECORD_NOT_NOW_LABEL, onPress: () => answerFirstRecordOffer(group, 'notNow') },
        { label: FIRST_RECORD_STOP_LABEL, onPress: () => answerFirstRecordOffer(group, 'stop') },
      ]}
    />
  );
}
