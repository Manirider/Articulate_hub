'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type TTSConfig = {
  rate?: number;
  pitch?: number;
  cooldownMs?: number;
};

/**
 * Text-to-Speech hook for AI coaching feedback.
 * Manages TTS lifecycle, cooldown between utterances, and browser compatibility.
 */
export function useTextToSpeech(config: TTSConfig = {}) {
  const { rate = 1.05, pitch = 1, cooldownMs = 4000 } = config;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenRef = useRef(0);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !text) return;

      const now = Date.now();
      if (now - lastSpokenRef.current < cooldownMs) return;
      lastSpokenRef.current = now;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [rate, pitch, cooldownMs]
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, isSpeaking };
}
