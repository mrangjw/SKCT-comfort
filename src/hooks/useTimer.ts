import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(seconds: number, enabled: boolean, onTimeUp: () => void) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  const reset = useCallback(() => {
    setTimeLeft(seconds);
    setRunning(enabled);
  }, [seconds, enabled]);

  const stop = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running || !enabled) return;
    if (timeLeft <= 0) {
      onTimeUpRef.current();
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, running, enabled]);

  return { timeLeft, running, reset, stop };
}
