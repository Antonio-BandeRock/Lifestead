// Steps under a to-do and labels on to-dos (Q47). Life > To-Do and Work's
// To-Do. Everything here is pure, so scripts/test_todo_extras.js checks it
// without a phone; the reading and writing is in lib/todosDb.ts.
//
// The same rules as Projects (lib/projects.ts) hold for steps: no
// percentage, no streak and no score. The opener says how many steps are
// still to do, which is what helps, and nothing else. A to-do can be marked
// done with steps not ticked; nothing complains about it.
//
// Labels are the person's own words, with no fixed list. Taking a label off
// a to-do loses nothing else, so there is nothing to move or retire.

export type Translate = (english: string, values?: Readonly<Record<string, string | number>>) => string;
const asIs: Translate = (english, values) =>
  values ? english.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole)) : english;

export type TodoStep = {
  id: string;
  todoId: string;
  text: string;
  position: number;
  /** ISO time it was ticked, or null. */
  doneAt: string | null;
  createdAt: string;
};

export const MAX_STEP_LENGTH = 200;
export const MAX_LABEL_LENGTH = 40;

/** A step keeps its words, with extra spaces taken out. */
export function cleanStepText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_STEP_LENGTH);
}

/** Steps in the order the person set; ties keep the order they were added. */
export function orderTodoSteps(steps: TodoStep[]): TodoStep[] {
  return [...steps].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
}

export function nextStepPosition(steps: TodoStep[]): number {
  return steps.reduce((highest, step) => Math.max(highest, step.position + 1), 0);
}

/** Moving one step up or down renumbers every step from 0. Null when the
 *  move would go past either end. */
export function moveTodoStep(steps: TodoStep[], id: string, direction: 'up' | 'down'): { id: string; position: number }[] | null {
  const ordered = orderTodoSteps(steps);
  const from = ordered.findIndex((step) => step.id === id);
  if (from < 0) return null;
  const to = direction === 'up' ? from - 1 : from + 1;
  if (to < 0 || to >= ordered.length) return null;
  const moved = [...ordered];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved.map((step, position) => ({ id: step.id, position }));
}

/** The opener's words: how many are still to do, nothing more. */
export function stepsLabel(steps: TodoStep[], tr: Translate = asIs): string {
  if (steps.length === 0) return tr('Steps');
  const open = steps.filter((step) => !step.doneAt).length;
  if (open === 0) return tr('Steps (all ticked)');
  return tr('Steps ({count} to do)', { count: open });
}

/** A label as kept: spaces tidied, a leading # dropped, not endless. */
export function cleanLabel(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/^#+\s*/, '').slice(0, MAX_LABEL_LENGTH).trim();
}

/**
 * The Labels field read as labels: words split at commas, each tidied, and
 * the same label said twice (in any capitals) kept once, as first written.
 * When a label already in use elsewhere is typed with other capitals, the
 * spelling in use wins, so "House" and "house" never become two labels.
 */
export function readLabelWords(text: string, inUse: readonly string[] = []): string[] {
  const known = new Map(inUse.map((label) => [label.toLocaleLowerCase(), label]));
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const piece of text.split(',')) {
    const label = cleanLabel(piece);
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(known.get(key) ?? label);
  }
  return labels;
}

/** The Labels field's starting words for a to-do being changed. */
export function labelWordsOf(labels: readonly string[]): string {
  return labels.join(', ');
}

function compareWords(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/** Every label on any of these to-dos, once each, in alphabetical order. */
export function labelsInUse(labelsByTodo: ReadonlyMap<string, readonly string[]>): string[] {
  const byKey = new Map<string, string>();
  for (const labels of labelsByTodo.values()) {
    for (const label of labels) {
      const key = label.toLocaleLowerCase();
      if (!byKey.has(key)) byKey.set(key, label);
    }
  }
  return [...byKey.values()].sort(compareWords);
}

/** True when the to-do carries this label (any capitals), or when no label
 *  is chosen. */
export function todoHasLabel(labels: readonly string[] | undefined, chosen: string | null): boolean {
  if (!chosen) return true;
  const key = chosen.toLocaleLowerCase();
  return (labels ?? []).some((label) => label.toLocaleLowerCase() === key);
}

/** The words shown when a label filter leaves nothing to show. */
export function emptyLabelWords(label: string, tr: Translate = asIs): string {
  return tr('Nothing on the list carries the label {label}.', { label });
}

/** Labels in the order they are shown on a row. */
export function sortedLabels(labels: readonly string[]): string[] {
  return [...labels].sort(compareWords);
}
