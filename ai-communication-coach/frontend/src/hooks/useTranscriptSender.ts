'use client';

import { useCallback, useRef, useState } from 'react';

type TranscriptSenderConfig = {
  sessionId: string;
  minLength?: number;
  debounceMs?: number;
  onSend?: (content: string) => void;
};

/**
 * Debounced transcript sender hook.
 * Manages the timing of sending transcript chunks to the backend,
 * preventing excessive API calls during continuous speech recognition.
 */
export function useTranscriptSender(config: TranscriptSenderConfig) {
  const { sessionId, minLength = 20, debounceMs = 500, onSend } = config;
  const sendRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number>(0);

  const scheduleTranscriptSend = useCallback(
    (content: string) => {
      if (sendRef.current) clearTimeout(sendRef.current);

      sendRef.current = setTimeout(() => {
        const trimmed = content.trim();
        if (trimmed.length > minLength) {
          onSend?.(trimmed);
          setLastSentAt(Date.now());
        }
      }, debounceMs);
    },
    [minLength, debounceMs, onSend]
  );

  const cancel = useCallback(() => {
    if (sendRef.current) {
      clearTimeout(sendRef.current);
      sendRef.current = null;
    }
  }, []);

  return {
    scheduleTranscriptSend,
    cancel,
    lastSentAt,
  };
}
