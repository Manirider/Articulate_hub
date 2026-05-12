'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type SessionTimerOptions = {
  autoStart?: boolean;
};

/**
 * Extracted session timer hook.
 * Encapsulates elapsed-time tracking for coaching sessions.
 */
export function useSessionTimer(options: SessionTimerOptions = {}) {
  const { autoStart = false } = options;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  return {
    elapsedSeconds,
    isRunning,
    formatted: formatTime(elapsedSeconds),
    start,
    stop,
    reset,
    formatTime,
  };
}
