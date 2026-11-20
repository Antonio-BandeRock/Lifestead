// Brings the food list on a phone up to date from the base and the change
// file the app carries (2026-11-20). The deciding and the statements are in
// lib/referencePatchPlan.ts; this is the native part.
//
// An update that changes the food list downloads only the change file. The
// phone runs the undo it kept, then the new statements, in one transaction,
// so a phone closed half way keeps the list it had. Anything it cannot place
// (no list, a new base, a damaged list, a change file that will not apply)
// falls back to unpacking the base, which the phone already holds, then
// applying the change file to it. The desktop never runs this.
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { gunzipSync, strFromU8 } from 'fflate';
import { unpackReferenceDatabase } from './referenceDbUnpack';
import {
  applyReferencePatch,
  chooseReferenceUpdate,
  type HeldPatch,
  PATCH_STATE_TABLE,
  parseReferencePatch,
  readHeldPatch,
  type ReferencePatch,
} from './referencePatchPlan';
import { setReferenceUnpackProgress } from './referenceUnpackProgress';

async function readChangeFile(patchModule: number): Promise<ReferencePatch> {
  const asset = Asset.fromModule(patchModule);
  await asset.downloadAsync();
  const packed = await new File(asset.localUri ?? asset.uri).bytes();
  return parseReferencePatch(strFromU8(gunzipSync(packed)));
}

async function readHeld(databaseName: string): Promise<HeldPatch | null> {
  const db = await SQLite.openDatabaseAsync(databaseName);
  try {
    const table = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      PATCH_STATE_TABLE,
    );
    if (!table) return null;
    return readHeldPatch(await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM ${PATCH_STATE_TABLE}`));
  } finally {
    await db.closeAsync();
  }
}

async function applyTo(databaseName: string, undo: string[], patch: ReferencePatch): Promise<void> {
  // Runs even when there is nothing to change, so the list records which
  // base and version it holds for the next change file.
  setReferenceUnpackProgress(0);
  const db = await SQLite.openDatabaseAsync(databaseName);
  try {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await applyReferencePatch(
        {
          exec: (sql) => txn.execAsync(sql),
          run: async (sql, params) => {
            await txn.runAsync(sql, params);
          },
        },
        undo,
        patch,
        (fraction) => setReferenceUnpackProgress(fraction),
        () => new Promise((resolve) => setTimeout(resolve, 0)),
      );
    });
  } finally {
    await db.closeAsync();
    setReferenceUnpackProgress(null);
  }
}

export async function bringReferenceDatabaseUpToDate(input: {
  baseModule: number;
  patchModule: number;
  databaseName: string;
  databaseUri: string;
  previousVersion: string | null;
}): Promise<void> {
  const { baseModule, patchModule, databaseName, databaseUri, previousVersion } = input;
  const patch = await readChangeFile(patchModule);
  const fileExists = new File(databaseUri).exists;

  let held: HeldPatch | null = null;
  if (fileExists) {
    try {
      held = await readHeld(databaseName);
    } catch (error) {
      console.warn('The food list on this phone could not be read; unpacking it again', error);
    }
  }

  const plan = chooseReferenceUpdate({ fileExists, held, previousVersion, patch });
  if (plan.kind === 'patch') {
    try {
      await applyTo(databaseName, plan.undo, patch);
      return;
    } catch (error) {
      console.warn('The food list change file did not apply; unpacking the list again', error);
    }
  }

  await unpackReferenceDatabase(baseModule, databaseUri);
  await applyTo(databaseName, [], patch);
}
