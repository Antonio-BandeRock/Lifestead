// The foods said through Say Several Ingredients, waiting their turn in a
// Food builder (voice step 4, 1.0.66.22). Each one goes through the builder's
// pending card the same way a food picked by hand does, so cut and cooking
// method are still asked one food at a time. Held in a ref so the builder's
// reset can read the next one straight away, with a counter beside it so the
// "N more" note redraws.
import { useCallback, useMemo, useRef, useState } from 'react';
import type { SpokenIngredient } from '../lib/spokenIngredients';

export function useSpokenIngredientQueue() {
  const queue = useRef<{ current: SpokenIngredient | null; remaining: SpokenIngredient[] }>({ current: null, remaining: [] });
  const [, setVersion] = useState(0);
  const redraw = useCallback(() => setVersion((version) => version + 1), []);

  const start = useCallback(
    (list: SpokenIngredient[]): SpokenIngredient | null => {
      queue.current = { current: list[0] ?? null, remaining: list.slice(1) };
      redraw();
      return queue.current.current;
    },
    [redraw],
  );

  const advance = useCallback((): SpokenIngredient | null => {
    const [next, ...rest] = queue.current.remaining;
    queue.current = { current: next ?? null, remaining: next ? rest : [] };
    redraw();
    return queue.current.current;
  }, [redraw]);

  const stop = useCallback(() => {
    if (!queue.current.current && queue.current.remaining.length === 0) return;
    queue.current = { current: null, remaining: [] };
    redraw();
  }, [redraw]);

  return useMemo(
    () => ({
      start,
      advance,
      stop,
      current: () => queue.current.current,
      remainingCount: () => queue.current.remaining.length,
    }),
    [start, advance, stop],
  );
}

export type SpokenIngredientQueue = ReturnType<typeof useSpokenIngredientQueue>;
