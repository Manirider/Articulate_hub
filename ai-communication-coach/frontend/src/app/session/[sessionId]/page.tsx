'use client';

import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, ArrowLeft, CheckCircle, Clock, MessageSquare,
  Mic, MicOff, Square, Zap, Camera, Brain, Activity,
  Target, Sparkles, Volume2, Radio, Eye, Scan,
  ChevronRight, X, BarChart3, Trophy, Flame
} from 'lucide-react';

import { AvatarOrb } from '@/components/AvatarOrb';
import { TiltCard } from '@/components/TiltCard';
import { Navbar } from '@/components/Navbar';
import type { MultiModalResult } from '@/components/ConfidenceAnalysisPanel';
import dynamic from 'next/dynamic';

const ConfidenceAnalysisPanel = dynamic(
  () => import('@/components/ConfidenceAnalysisPanel').then((mod) => mod.ConfidenceAnalysisPanel),
  { ssr: false, loading: () => <div className="animate-pulse h-40 bg-white/5 rounded-xl border border-white/10" /> }
);

const WaveformVisualizer = dynamic(
  () => import('@/components/WaveformVisualizer').then((mod) => mod.WaveformVisualizer),
  { ssr: false }
);
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { useVoiceAnalysis } from '@/hooks/useVoiceAnalysis';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTranscriptSender } from '@/hooks/useTranscriptSender';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';
import { DEFAULT_LANGUAGE_CODE } from '@/lib/languages';

type FeedbackPayload = { quick_tip: string; confidence_score: number; clarity_score: number; };
type SessionResult = { overall_score: number; clarity_score: number; confidence_score: number; content_score: number; delivery_score: number; strengths: string[]; weaknesses: string[]; improvements: string[]; explainability: string; };

function SessionContent() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [transcript, setTranscript] = useState('');
  const [tips, setTips] = useState<FeedbackPayload[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [browserWarning, setBrowserWarning] = useState('');
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'>('connecting');
  const [multiModalResult, setMultiModalResult] = useState<MultiModalResult | null>(null);

  const moduleName = searchParams.get('module') || 'Session';
  const submoduleName = searchParams.get('submodule') || 'Practice';
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_session', { session_id: params.sessionId });
    const onLiveFeedback = (payload: FeedbackPayload) => { setTips((current) => [payload, ...current].slice(0, 6)); };
    const onMultiModalUpdate = (payload: MultiModalResult) => { setMultiModalResult(payload); };
    const onStatus = (e: Event) => { setSocketStatus((e as CustomEvent).detail); };
    window.addEventListener('socket_status', onStatus);
    if (socket.connected) setSocketStatus('connected');
    socket.on('live_feedback', onLiveFeedback);
    socket.on('multimodal_update', onMultiModalUpdate);
    return () => { 
      socket.off('live_feedback', onLiveFeedback); 
      socket.off('multimodal_update', onMultiModalUpdate); 
      socket.emit('leave_session', { session_id: params.sessionId }); 
      window.removeEventListener('socket_status', onStatus); 
    };
  }, [params.sessionId]);

  const sessionLanguage = searchParams.get('lang') || DEFAULT_LANGUAGE_CODE;

  // Hooks
  const { elapsedSeconds, formatted, start: startTimer, stop: stopTimer } = useSessionTimer();
  const { speak, stop: stopTTS } = useTextToSpeech();
  const { scheduleTranscriptSend, cancel: cancelTranscriptSend } = useTranscriptSender({
    sessionId: params.sessionId,
    onSend: (content) => {
      const socket = getSocket();
      socket.emit('transcript_chunk', { session_id: params.sessionId, content });
      api.addTranscript(params.sessionId, content, 'user').catch(() => {});
    }
  });

  const { isListening: listening, isSupported: speechSupported, start: startRecording, stop: stopRecording } = useSpeechRecognition({
    lang: sessionLanguage,
    onTranscript: (text) => {
      setTranscript(text);
      scheduleTranscriptSend(text);
    },
    onError: (err) => setError(err),
    onVoiceCommand: (cmd) => {
      if (cmd === 'end session' || cmd === 'complete session') {
        document.getElementById('complete-session')?.click();
      }
    }
  });

  const { videoRef, canvasRef, metrics: faceMetrics, isActive: cameraActive, isLoading: cameraLoading, error: cameraError, start: startCamera, stop: stopCamera } = useMediaPipe(params.sessionId);
  const { voiceMetrics, isAnalyzing: voiceAnalyzing, start: startVoiceAnalysis, stop: stopVoiceAnalysis } = useVoiceAnalysis(params.sessionId, wordCount);

  const handleToggleCamera = () => { if (cameraActive) stopCamera(); else startCamera(); };

  // Sync state
  useEffect(() => {
    if (listening) {
      startTimer();
      if (speechSupported) startVoiceAnalysis();
    } else {
      stopTimer();
      stopVoiceAnalysis();
    }
  }, [listening, speechSupported, startTimer, stopTimer, startVoiceAnalysis, stopVoiceAnalysis]);

  // TTS for coaching tips
  const aiLine = useMemo(() => tips.length === 0 ? 'Begin speaking. I will coach your structure, confidence, and pacing in real-time.' : tips[0].quick_tip, [tips]);
  useEffect(() => {
    if (tips.length > 0) {
      speak(aiLine);
    }
  }, [aiLine, tips.length, speak]);

  function formatTime(seconds: number) { return formatted; }

  function toggleListening() {
    if (listening) stopRecording();
    else {
      setError('');
      startRecording();
    }
  }

  async function completeSession() {
    setCompleting(true); setError('');
    stopRecording();
    stopVoiceAnalysis();
    stopCamera();
    stopTTS();
    cancelTranscriptSend();
    try {
      const response = await api.completeSession(params.sessionId);
      setResult(response);
      speak(`Session complete. Your overall score is ${response.overall_score.toFixed(0)} out of 100. ${response.strengths[0] || 'Good effort.'}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to complete session.'); }
    finally { setCompleting(false); }
  }

  return (
    <div className="min-h-screen bg-[#050810] relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[150px] animate-float-slow" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[120px] animate-float-slow" style={{ animationDelay: '3s' }} />
      </div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 z-[1] opacity-10 pointer-events-none grid-bg" />

      <Navbar />

      <main className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8">
        {/* HUD Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass-ultra border border-white/10 text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Exit</span>
          </motion.button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{moduleName}</h1>
              <span className="text-white/30">·</span>
              <span className="text-lg text-white/70">{submoduleName}</span>
            </div>
            <p className="text-sm text-white/40 flex items-center gap-2">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              Live AI Coaching Session
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full glass-ultra border border-white/10"
              whileHover={{ scale: 1.02 }}
            >
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="font-mono text-white">{formatTime(elapsedSeconds)}</span>
            </motion.div>

            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full glass-ultra border border-white/10"
              whileHover={{ scale: 1.02 }}
            >
              <MessageSquare className="h-4 w-4 text-violet-400" />
              <span className="text-white">{wordCount}</span>
              <span className="text-white/50 text-xs">words</span>
            </motion.div>

            {listening && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/30"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-rose-400 text-xs font-medium">REC</span>
              </motion.div>
            )}

            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
              socketStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : socketStatus === 'reconnecting'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-white/5 border-white/10 text-white/50'
            }`}>
              <span className={`h-2 w-2 rounded-full ${socketStatus === 'reconnecting' ? 'animate-pulse' : ''}`} />
              {socketStatus === 'connected' ? 'Live' : socketStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
            </div>
          </div>
        </motion.div>

        {/* Main content grid */}
        <section className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Left — Transcript & Controls */}
          <div className="space-y-4">
            <TiltCard tiltAmount={5}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-ultra rounded-3xl p-6 border border-white/10 relative overflow-hidden"
              >
                {/* Scanner line effect */}
                {listening && (
                  <motion.div
                    className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                )}

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <MessageSquare className="h-4 w-4 text-cyan-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Live Transcript</h2>
                  </div>
                  <WaveformVisualizer active={listening} />
                </div>

                <div className="min-h-[280px] max-h-[400px] overflow-y-auto rounded-xl p-5 text-sm leading-7 bg-black/20 border border-white/5">
                  {transcript ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-white/80"
                    >
                      {transcript}
                    </motion.p>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                        <Mic className="h-5 w-5 text-white/30" />
                      </div>
                      <p className="italic text-white/40">
                        Your speech will appear here in real-time.
                        <br />
                        <span className="text-cyan-400/60">Press &quot;Start Recording&quot; to begin...</span>
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </TiltCard>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-3"
            >
              <motion.button
                id="toggle-listening"
                onClick={toggleListening}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-300 ${
                  listening
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                    : 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white'
                }`}
              >
                {listening ? (
                  <><MicOff className="h-5 w-5" /> Pause Recording</>
                ) : (
                  <><Mic className="h-5 w-5" /> Start Recording</>
                )}
              </motion.button>

              {submoduleName === 'Demo Mode' && (
                <motion.button
                  id="inject-demo-text"
                  onClick={() => {
                    const mockText = "This is a demo mode transcript. I am speaking clearly and confidently about the topic. The AI should be able to analyze this speech and provide feedback on my performance. Thank you very much.";
                    setTranscript(mockText);
                    const socket = getSocket();
                    socket.emit('transcript_chunk', { session_id: params.sessionId, content: mockText });
                    api.addTranscript(params.sessionId, mockText, 'user').catch(() => {});
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition"
                >
                  <Sparkles className="h-4 w-4" /> Inject Demo Text
                </motion.button>
              )}

              <motion.button
                id="complete-session"
                onClick={completeSession}
                disabled={completing || wordCount < 5}
                whileHover={{ scale: wordCount >= 5 ? 1.05 : 1 }}
                whileTap={{ scale: wordCount >= 5 ? 0.95 : 1 }}
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {completing ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Scan className="h-4 w-4" />
                    </motion.span>
                    Analyzing...
                  </span>
                ) : (
                  <><Square className="h-4 w-4" /> Complete Session</>
                )}
              </motion.button>
            </motion.div>

            {/* Error / Warning Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl p-4 text-sm flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400"
                >
                  <div className="p-1.5 rounded-lg bg-rose-500/20">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  {error}
                </motion.div>
              )}
              {browserWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl p-4 text-sm flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-400"
                >
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Camera className="h-4 w-4" />
                  </div>
                  {browserWarning}
                </motion.div>
              )}
            </AnimatePresence>

            {!result && wordCount < 5 && (
              <p className="text-xs text-white/40 flex items-center gap-2">
                <Target className="h-3 w-3" />
                Speak at least 5 words to enable session completion.
              </p>
            )}
          </div>

          {/* Right — AI Coach + Analysis */}
          <aside className="space-y-4">
            {/* AI Coach Avatar */}
            <TiltCard tiltAmount={8}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-ultra rounded-3xl p-6 border border-white/10 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-4 w-4 text-violet-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-white/60">AI Coach</h3>
                  </div>

                  <div className="relative">
                    <motion.div
                      className="absolute -inset-4 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 blur-xl"
                      animate={{
                        scale: listening ? [1, 1.2, 1] : 1,
                        opacity: listening ? [0.5, 0.8, 0.5] : 0.3,
                      }}
                      transition={{ duration: 2, repeat: listening ? Infinity : 0 }}
                    />
                    <AvatarOrb
                      speaking={listening}
                      size="lg"
                      emotion={listening ? 'speaking' : tips.length > 0 ? 'thinking' : 'idle'}
                    />
                  </div>

                  <motion.p
                    key={aiLine}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-sm leading-relaxed text-white/70 max-w-xs"
                  >
                    {aiLine}
                  </motion.p>
                </div>
              </motion.div>
            </TiltCard>

            {/* Confidence Analysis Panel */}
            <ConfidenceAnalysisPanel
              videoRef={videoRef as React.RefObject<HTMLVideoElement>}
              canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
              cameraActive={cameraActive}
              cameraLoading={cameraLoading}
              cameraError={cameraError}
              onToggleCamera={handleToggleCamera}
              faceMetrics={faceMetrics}
              voiceMetrics={voiceMetrics}
              multiModalResult={multiModalResult}
            />

            {/* Live Feedback */}
            <TiltCard tiltAmount={5}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-ultra rounded-3xl p-6 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Zap className="h-4 w-4 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-white/60">Live Feedback</h3>
                </div>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {tips.length === 0 ? (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm italic text-white/40 text-center py-4"
                      >
                        Feedback will appear here as you speak...
                      </motion.p>
                    ) : tips.map((tip, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-xl p-4 bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors"
                      >
                        <p className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                          <Sparkles className="h-3 w-3" />
                          {tip.quick_tip}
                        </p>
                        <div className="flex gap-4 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            Confidence: {tip.confidence_score.toFixed(1)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Volume2 className="h-3 w-3" />
                            Clarity: {tip.clarity_score.toFixed(1)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            </TiltCard>
          </aside>
        </section>

        {/* Results panel */}
        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="mt-8"
            >
              <TiltCard tiltAmount={3}>
                <div className="glass-ultra rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                  {/* Background glow */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

                  {/* Header */}
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Session Analysis</h2>
                        <p className="text-sm text-white/50">AI-powered performance review</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent"
                      >
                        <AnimatedCounter target={result.overall_score} decimals={1} />
                      </motion.span>
                      <span className="text-xl text-white/40">/ 100</span>
                    </div>
                  </div>

                  {/* Score Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                    {[
                      { label: 'Clarity', value: result.clarity_score, icon: Target, color: 'cyan' },
                      { label: 'Confidence', value: result.confidence_score, icon: Zap, color: 'violet' },
                      { label: 'Content', value: result.content_score, icon: BarChart3, color: 'amber' },
                      { label: 'Delivery', value: result.delivery_score, icon: Activity, color: 'emerald' },
                    ].map((score, index) => (
                      <motion.div
                        key={score.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="rounded-2xl p-5 bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`p-1.5 rounded-lg bg-${score.color}-500/10`}>
                            <score.icon className={`h-4 w-4 text-${score.color}-400`} />
                          </div>
                          <span className="text-sm text-white/60">{score.label}</span>
                        </div>
                        <p className={`text-3xl font-bold text-${score.color}-400`}>
                          <AnimatedCounter target={score.value} decimals={1} />
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Multi-Modal Results */}
                  {multiModalResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="grid gap-4 sm:grid-cols-3 mb-6"
                    >
                      <div className="rounded-2xl p-5 bg-violet-500/5 border border-violet-500/20 text-center">
                        <p className="text-xs text-white/50 mb-2">Multi-Modal Confidence</p>
                        <p className="text-3xl font-bold text-violet-400">
                          <AnimatedCounter target={multiModalResult.confidence_score} decimals={1} />
                        </p>
                        <p className="text-xs text-white/30">/ 10.0</p>
                      </div>
                      <div className="rounded-2xl p-5 bg-cyan-500/5 border border-cyan-500/20 text-center">
                        <p className="text-xs text-white/50 mb-2">Eye Contact</p>
                        <div className="flex items-center justify-center gap-2">
                          <Eye className="h-5 w-5 text-cyan-400" />
                          <p className="text-xl font-bold text-cyan-400 capitalize">{multiModalResult.eye_contact}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl p-5 bg-emerald-500/5 border border-emerald-500/20 text-center">
                        <p className="text-xs text-white/50 mb-2">Engagement</p>
                        <div className="flex items-center justify-center gap-2">
                          <Activity className="h-5 w-5 text-emerald-400" />
                          <p className="text-xl font-bold text-emerald-400 capitalize">{multiModalResult.engagement}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Detailed Analysis */}
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="rounded-2xl p-5 bg-emerald-500/5 border border-emerald-500/10"
                    >
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-emerald-400">
                        <Trophy className="h-4 w-4" /> Strengths
                      </h4>
                      <ul className="space-y-2">
                        {result.strengths.map((item, i) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.05 }}
                            className="text-sm text-white/70 flex items-start gap-2"
                          >
                            <span className="text-emerald-400 mt-1">•</span>
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="rounded-2xl p-5 bg-rose-500/5 border border-rose-500/10"
                    >
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-rose-400">
                        <Target className="h-4 w-4" /> Areas to Improve
                      </h4>
                      <ul className="space-y-2">
                        {result.weaknesses.map((item, i) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + i * 0.05 }}
                            className="text-sm text-white/70 flex items-start gap-2"
                          >
                            <span className="text-rose-400 mt-1">•</span>
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 }}
                      className="rounded-2xl p-5 bg-amber-500/5 border border-amber-500/10"
                    >
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2 text-amber-400">
                        <Sparkles className="h-4 w-4" /> Actions
                      </h4>
                      <ul className="space-y-2">
                        {result.improvements.map((item, i) => (
                          <motion.li
                            key={item}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + i * 0.05 }}
                            className="text-sm text-white/70 flex items-start gap-2"
                          >
                            <span className="text-amber-400 mt-1">•</span>
                            {item}
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>

                  {/* Explainability */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.1 }}
                    className="rounded-xl p-4 bg-white/5 border border-white/10 mb-6"
                  >
                    <p className="text-xs text-white/40">
                      <span className="font-semibold text-white/60 flex items-center gap-2">
                        <Brain className="h-3 w-3" />
                        How we scored:
                      </span>
                      {result.explainability}
                    </p>
                  </motion.div>

                  {/* Actions */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="flex flex-wrap gap-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/dashboard')}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold"
                    >
                      <ChevronRight className="h-4 w-4" /> Back to Dashboard
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.back()}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition"
                    >
                      <Flame className="h-4 w-4" /> Practice Again
                    </motion.button>
                  </motion.div>
                </div>
              </TiltCard>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* HUD Corners */}
      <div className="fixed inset-0 z-[5] pointer-events-none">
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />
      </div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin mb-4" />
          <p className="text-white/50">Loading Session...</p>
        </div>
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
