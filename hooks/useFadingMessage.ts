// A line saying what just happened ("Saved.", "Timer started.") that goes by
// itself (2026-11-15). Until then such a line stayed under a form until the
// lens was left, so "Kept." could still be showing long after something else
// had been done. It stays long enough to read at an unhurried pace, and any
// newer message replaces it at once.
import { useCallback, useEffect, useRef, useState } from 'react';

export const FADING_MESSAGE_MS = 8000;

export function useFadingMessage(ms = FADING_MESSAGE_MS): [string | null, (message: string | null) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const say = useCallback(
    (next: string | null) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      if (next) timer.current = setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );
  return [message, say];
}
