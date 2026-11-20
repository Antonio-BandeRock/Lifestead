// The food list change file, the part with no native code in it (2026-11-20).
//
// The phone carries a frozen base of the food list (foods_reference.db.gz)
// and a change file (foods_reference.patch.gz) made by
// scripts/compress_reference_db.js: the statements that turn the base into
// today's list, and the undo. The phone keeps the undo of the change file it
// applied inside the list itself, so the next change file starts from the
// base again: undo, then the new statements, in one transaction. Only a
// phone without the base (a fresh install, a new base, a damaged list)
// unpacks the whole base. lib/referenceDbPatch.ts does the native part;
// scripts/test_reference_patch.js runs this against node:sqlite.

export const PATCH_STATE_TABLE = 'lifestead_patch_state';
export const PATCH_BATCH_STATEMENTS = 100;

export type ReferencePatch = {
  format: 1;
  base: string;
  version: string;
  forward: string[];
  undo: string[];
};

export type HeldPatch = { base: string | null; undo: string[] };

export type ReferenceUpdatePlan = { kind: 'patch'; undo: string[] } | { kind: 'unpack' };

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseReferencePatch(text: string): ReferencePatch {
  const value = JSON.parse(text) as Partial<ReferencePatch>;
  if (
    value.format !== 1 ||
    typeof value.base !== 'string' ||
    typeof value.version !== 'string' ||
    !isStringList(value.forward) ||
    !isStringList(value.undo)
  ) {
    throw new Error('The food list change file is not one this version of the app can read.');
  }
  return { format: 1, base: value.base, version: value.version, forward: value.forward, undo: value.undo };
}

// What the list on the phone says it holds, from its state rows.
export function readHeldPatch(rows: { key: string; value: string }[]): HeldPatch | null {
  if (!rows.length) return null;
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const undoText = byKey.get('undo');
  let undo: unknown = [];
  if (undoText) {
    try {
      undo = JSON.parse(undoText);
    } catch {
      return null;
    }
  }
  if (!isStringList(undo)) return null;
  return { base: byKey.get('base') ?? null, undo };
}

// previousVersion is the food list version the app last recorded. A phone
// that unpacked the base before change files existed holds the base with
// nothing applied, which that version says.
export function chooseReferenceUpdate(input: {
  fileExists: boolean;
  held: HeldPatch | null;
  previousVersion: string | null;
  patch: ReferencePatch;
}): ReferenceUpdatePlan {
  const { fileExists, held, previousVersion, patch } = input;
  if (!fileExists) return { kind: 'unpack' };
  if (held && held.base === patch.base) return { kind: 'patch', undo: held.undo };
  if (!held && previousVersion === patch.base) return { kind: 'patch', undo: [] };
  return { kind: 'unpack' };
}

export type PatchExecutor = {
  exec(sql: string): Promise<void>;
  run(sql: string, params: string[]): Promise<void>;
};

// Runs inside the caller's transaction: the kept undo, the new statements,
// then the state rows naming what the list now holds.
export async function applyReferencePatch(
  db: PatchExecutor,
  undo: string[],
  patch: ReferencePatch,
  onProgress?: (fraction: number) => void,
  pause?: () => Promise<void>,
): Promise<void> {
  const statements = [...undo, ...patch.forward];
  for (let i = 0; i < statements.length; i += PATCH_BATCH_STATEMENTS) {
    await db.exec(statements.slice(i, i + PATCH_BATCH_STATEMENTS).join('\n'));
    onProgress?.(Math.min(1, (i + PATCH_BATCH_STATEMENTS) / statements.length));
    if (pause) await pause();
  }
  await db.exec(`CREATE TABLE IF NOT EXISTS ${PATCH_STATE_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const upsert = `INSERT OR REPLACE INTO ${PATCH_STATE_TABLE} (key, value) VALUES (?, ?)`;
  await db.run(upsert, ['base', patch.base]);
  await db.run(upsert, ['version', patch.version]);
  await db.run(upsert, ['undo', JSON.stringify(patch.undo)]);
}
