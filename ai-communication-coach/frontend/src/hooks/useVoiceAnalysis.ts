'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/services/socket';

/**
 * Voice analysis metrics computed from the Web Audio API.
 */
export type VoiceAnalysisMetrics = {
  rms_energy: number;         // 0-1 normalized RMS amplitude
  pitch_hz: number;           // Estimated fundamental frequency (F0)
  speech_rate_wpm: number;    // Estimated words per minute
  pause_ratio: number;        // Ratio of silent frames to total frames (0-1)
};

const DEFAULT_VOICE_METRICS: VoiceAnalysisMetrics = {
  rms_energy: 0,
  pitch_hz: 0,
  speech_rate_wpm: 0,
  pause_ratio: 0.5,
};

/**
 * useVoiceAnalysis — Custom hook for real-time voice feature extraction.
 *
 * Uses the Web Audio API (AudioContext + AnalyserNode) on the microphone
 * stream to compute RMS energy, estimated pitch (autocorrelation-based F0),
 * and pause ratio. Emits metrics via Socket.IO every ~1 second.
 */
export function useVoiceAnalysis(sessionId: string, wordCount: number) {
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceAnalysisMetrics>(DEFAULT_VOICE_METRICS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Rolling counters for pause detection
  const totalFramesRef = useRef(0);
  const silentFramesRef = useRef(0);

  // ── Start analysis ──────────────────────────────────────────────────

  const start = useCallback(async () => {
    if (isAnalyzing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      startTimeRef.current = Date.now();
      totalFramesRef.current = 0;
      silentFramesRef.current = 0;

      setIsAnalyzing(true);

      // Analyze every 1 second
      intervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyserRef.current.getFloatTimeDomainData(dataArray);

        // ── RMS Energy ──
        let sumSq = 0;
        for (let i = 0; i < bufferLength; i++) {
          sumSq += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSq / bufferLength);

        // Track silence frames (energy < threshold)
        totalFramesRef.current += 1;
        if (rms < 0.01) {
          silentFramesRef.current += 1;
        }

        const pauseRatio = totalFramesRef.current > 0
          ? silentFramesRef.current / totalFramesRef.current
          : 0.5;

        // ── Pitch Estimation (Autocorrelation) ──
        const pitch = estimatePitch(dataArray, audioCtx.sampleRate);

        // ── Speech Rate (from word count and elapsed time) ──
        const elapsedMinutes = (Date.now() - startTimeRef.current) / 60000;
        const wpm = elapsedMinutes > 0.05 ? wordCount / elapsedMinutes : 0;

        const newMetrics: VoiceAnalysisMetrics = {
          rms_energy: Math.round(rms * 1000) / 1000,
          pitch_hz: Math.round(pitch),
          speech_rate_wpm: Math.round(Math.min(300, wpm)),
          pause_ratio: Math.round(pauseRatio * 100) / 100,
        };

        setVoiceMetrics(newMetrics);

        // Emit via Socket.IO
        const socket = getSocket();
        socket.emit('voice_metrics', {
          session_id: sessionId,
          ...newMetrics,
        });
      }, 1000);

    } catch {
      // Audio access denied — degrade gracefully
      console.warn('[VoiceAnalysis] Microphone access denied or unavailable');
    }
  }, [isAnalyzing, sessionId, wordCount]);

  // ── Stop analysis ──────────────────────────────────────────────────

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
    setIsAnalyzing(false);
    setVoiceMetrics(DEFAULT_VOICE_METRICS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { voiceMetrics, isAnalyzing, start, stop };
}

// ────────────────────────────────────────────────────────────────────────
// Autocorrelation-based pitch detection (simplified McLeod method)
// ────────────────────────────────────────────────────────────────────────

function estimatePitch(buffer: Float32Array, sampleRate: number): number {
  // Find the RMS first — skip pitch estimation on silence
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) return 0;

  // Autocorrelation
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let foundGoodCorrelation = false;
  const correlations = new Float32Array(MAX_SAMPLES);

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs((buffer[i]) - (buffer[i + offset]));
    }
    correlation = 1 - (correlation / MAX_SAMPLES);
    correlations[offset] = correlation;

    if (correlation > 0.9 && !foundGoodCorrelation) {
      foundGoodCorrelation = true;
    }

    if (foundGoodCorrelation && correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    } else if (foundGoodCorrelation && correlation < bestCorrelation - 0.01) {
      break;
    }
  }

  if (bestCorrelation > 0.01 && bestOffset > 0) {
    return sampleRate / bestOffset;
  }
  return 0;
}
