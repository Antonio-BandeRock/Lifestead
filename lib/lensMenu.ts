// How a long lens menu is laid out, 1.0.87.7 (ease-of-use pass, fix 4).
// Trends had 31 lenses in one flat grid; grouping alone would still show 31.
// The menu now reads, top to bottom:
//   1. Opened lately: the last few lenses opened on this device;
//   2. the tab's groups, named by subject, in the tab's usual order;
//   3. one closed line, "Nothing recorded yet (n)", holding every lens with
//      no records behind it yet. One tap opens it; nothing is locked, and a
//      lens moves up into its group by itself the day its first record exists.
// Simple View leaves the closed line out and shows the first two parts.
// Pure, so scripts/test_lens_menu.js checks it without a phone.

export const OPENED_LATELY = 'Opened lately';

export type LensMenuRow<O> = {
  option: O;
  group: string | undefined;
  // Unique across the whole menu: a lens in Opened lately also sits in its group.
  rowKey: string;
};

export type LensMenuLayout<O> = {
  rows: LensMenuRow<O>[];
  // The lenses with nothing recorded yet, in the tab's order. Empty when the
  // tab does not fold (no emptyKeys given) or Simple View leaves them out.
  folded: LensMenuRow<O>[];
  // How many lenses were folded, also counted when Simple View hides the line.
  foldedCount: number;
};

export function arrangeLensMenu<K extends string, O extends { key: K; group?: string }>(
  options: readonly O[],
  recent: readonly string[],
  emptyKeys: ReadonlySet<K> | undefined,
  simpleView: boolean,
): LensMenuLayout<O> {
  const byKey = new Map(options.map((option) => [option.key as string, option]));
  const recentOptions = recent.map((key) => byKey.get(key)).filter((option): option is O => option !== undefined);
  const rows: LensMenuRow<O>[] = recentOptions.map((option) => ({ option, group: OPENED_LATELY, rowKey: `recent:${option.key}` }));
  const folded: LensMenuRow<O>[] = [];
  for (const option of options) {
    const row = { option, group: option.group, rowKey: option.key as string };
    if (emptyKeys?.has(option.key)) folded.push(row);
    else rows.push(row);
  }
  return { rows, folded: simpleView ? [] : folded, foldedCount: folded.length };
}
