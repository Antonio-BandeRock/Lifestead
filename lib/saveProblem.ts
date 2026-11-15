// A save that did not go through says so (2026-11-15). Before this, most
// saves on Garden ran with nothing around them: if the database refused
// one, the button did nothing visible and the person walked away thinking
// it was kept. saveOrSay runs the save and, if it throws, shows the
// sentence it was given through the same popup explainNotYet uses
// (components/NotYetHost.tsx), under the title Not Saved.
//
// The sentence is whole, so each language can phrase it, and it names
// what was not saved: 'The harvest was not saved. Try again.'
import { explainNotYet } from './notYet';

export const NOT_SAVED_TITLE = 'Not Saved';

/**
 * Runs `work`. Resolves to its result, or to undefined after telling the
 * person `problem` when it throws. Never rethrows, so a handler can await
 * it without a try of its own.
 */
export async function saveOrSay<T>(problem: string, work: () => Promise<T>): Promise<T | undefined> {
  try {
    return await work();
  } catch (error) {
    console.warn(problem, error);
    explainNotYet(problem, NOT_SAVED_TITLE);
    return undefined;
  }
}
