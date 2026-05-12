'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechRecognitionConfig = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onVoiceCommand?: (command: string) => void;
};

const VOICE_COMMANDS = [
  'end session',
  'complete session',
  'stop recording',
  'hey coach stop',
] as const;

export function useSpeechRecognition(config: SpeechRecognitionConfig = {}) {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onTranscript,
    onError,
    onVoiceCommand,
  } = config;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Initialize recognition engine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onresult = (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTranscript(text);
      onTranscript?.(text);

      // Voice command detection
      const lower = text.toLowerCase();
      for (const cmd of VOICE_COMMANDS) {
        if (lower.includes(cmd)) {
          onVoiceCommand?.(cmd);
          break;
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      listeningRef.current = false;
      onError?.('Speech recognition hit an error. Try Chrome or restart recording.');
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* auto-restart silently */
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.stop();
      listeningRef.current = false;
    };
  }, [lang, continuous, interimResults, onTranscript, onError, onVoiceCommand]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.start();
      setIsListening(true);
      listeningRef.current = true;
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.stop();
    setIsListening(false);
    listeningRef.current = false;
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    start,
    stop,
    reset,
  };
}
