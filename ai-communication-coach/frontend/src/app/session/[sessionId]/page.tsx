'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, MessageSquare, Mic, MicOff, Square, Zap } from 'lucide-react';

import { AvatarOrb } from '@/components/AvatarOrb';
import { Navbar } from '@/components/Navbar';
import { ScoreCard } from '@/components/ScoreCard';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';

type FeedbackPayload = {
  quick_tip: string;
  confidence_score: number;
  clarity_score: number;
};

type SessionResult = {
  overall_score: number;
  clarity_score: number;
  confidence_score: number;
  content_score: number;
  delivery_score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  explainability: string;
};

export default function SessionPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transcript, setTranscript] = useState('');
  const [tips, setTips] = useState<FeedbackPayload[]>([]);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [listening, setListening] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptSendRef = useRef<NodeJS.Timeout | null>(null);
  const lastTTSRef = useRef(0);

  const moduleName = searchParams.get('module') || 'Session';
  const submoduleName = searchParams.get('submodule') || 'Practice';

  // Socket setup
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_session', { session_id: params.sessionId });

    const onLiveFeedback = (payload: FeedbackPayload) => {
      setTips((current) => [payload, ...current].slice(0, 6));
    };

    socket.on('live_feedback', onLiveFeedback);
    return () => {
      socket.off('live_feedback', onLiveFeedback);
      socket.emit('leave_session', { session_id: params.sessionId });
    };
  }, [params.sessionId]);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const nextTranscript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');

      setTranscript(nextTranscript);

      // Voice Commands Interception
      const lowerTranscript = nextTranscript.toLowerCase();
      if (
        lowerTranscript.includes("end session") ||
        lowerTranscript.includes("complete session") ||
        lowerTranscript.includes("stop recording") ||
        lowerTranscript.includes("hey coach stop")
      ) {
        recognition.stop();
        listeningRef.current = false;
        
        // Use a slight timeout to ensure React state has updated the button to be clickable
        setTimeout(() => {
          document.getElementById('complete-session')?.click();
        }, 100);
        return;
      }

      // Debounced socket + DB push
      if (transcriptSendRef.current) clearTimeout(transcriptSendRef.current);
      transcriptSendRef.current = setTimeout(() => {
        const latest = nextTranscript.trim();
        if (latest.length > 20) {
          const socket = getSocket();
          socket.emit('transcript_chunk', { session_id: params.sessionId, content: latest });
          api.addTranscript(params.sessionId, latest, 'user').catch(() => {});
        }
      }, 500);
    };

    recognition.onerror = () => {
      setListening(false);
      listeningRef.current = false;
    };

    recognition.onend = () => {
      // Use ref instead of state to avoid stale closure
      if (listeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onend = null;
      recognition.stop();
      listeningRef.current = false;
      if (transcriptSendRef.current) clearTimeout(transcriptSendRef.current);
    };
  }, [params.sessionId]);

  // AI Avatar text-to-speech
  const aiLine = useMemo(() => {
    if (tips.length === 0) {
      return 'Begin speaking. I will coach your structure, confidence, and pacing in real-time.';
    }
    return tips[0].quick_tip;
  }, [tips]);

  useEffect(() => {
    if (typeof window !== 'undefined' && aiLine && tips.length > 0) {
      // Throttle TTS: at most once every 4 seconds to avoid audio spam
      const now = Date.now();
      if (now - lastTTSRef.current < 4000) return;
      lastTTSRef.current = now;

      const utterance = new SpeechSynthesisUtterance(aiLine);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [aiLine, tips.length]);

  // Timer
  useEffect(() => {
    if (listening) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [listening]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
      listeningRef.current = false;
    } else {
      setError('');
      recognition.start();
      setListening(true);
      listeningRef.current = true;
    }
  }

  async function completeSession() {
    setCompleting(true);
    setError('');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setListening(false);
    listeningRef.current = false;

    try {
      const response = await api.completeSession(params.sessionId);
      setResult(response);

      // Announce result
      if (typeof window !== 'undefined') {
        const msg = new SpeechSynthesisUtterance(
          `Session complete. Your overall score is ${response.overall_score.toFixed(0)} out of 100. ${response.strengths[0] || 'Good effort.'}`
        );
        msg.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(msg);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete session. Please try again.';
      setError(message);
    } finally {
      setCompleting(false);
    }
  }

  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-100">{moduleName} · {submoduleName}</h1>
            <p className="text-sm text-slate-500">Live AI coaching session</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="h-4 w-4" /> {formatTime(elapsedSeconds)}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <MessageSquare className="h-4 w-4" /> {wordCount} words
            </span>
            {listening && (
              <span className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-400 border border-rose-500/20">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> REC
              </span>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {/* Left — Transcript & Controls */}
          <div className="space-y-4">
            {/* Transcript area */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-100">Live Transcript</h2>
                <WaveformVisualizer active={listening} />
              </div>
              <div className="min-h-[280px] max-h-[400px] overflow-y-auto rounded-xl bg-slate-900/50 p-5 text-sm leading-7 text-slate-300 border border-slate-700/20">
                {transcript || (
                  <span className="text-slate-600 italic">
                    Your speech will appear here in real-time. Press "Start Recording" to begin...
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              <button
                id="toggle-listening"
                onClick={toggleListening}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-300 ${
                  listening
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                    : 'btn-primary'
                }`}
              >
                {listening ? (
                  <>
                    <MicOff className="h-5 w-5" /> Pause Recording
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" /> Start Recording
                  </>
                )}
              </button>
              {submoduleName === 'Demo Mode' && (
                <button
                  id="inject-demo-text"
                  onClick={() => {
                    const mockText = "This is a demo mode transcript. I am speaking clearly and confidently about the topic. The AI should be able to analyze this speech and provide feedback on my performance. Thank you very much.";
                    setTranscript(mockText);
                    const socket = getSocket();
                    socket.emit('transcript_chunk', { session_id: params.sessionId, content: mockText });
                    api.addTranscript(params.sessionId, mockText, 'user').catch(() => {});
                  }}
                  className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-900/30 px-6 py-3 font-semibold text-cyan-300 transition hover:bg-cyan-800/40"
                >
                  <MessageSquare className="h-4 w-4" /> Inject Demo Text
                </button>
              )}
              <button
                id="complete-session"
                onClick={completeSession}
                disabled={completing || wordCount < 5}
                className="flex items-center gap-2 rounded-xl border border-slate-600/30 bg-slate-800/50 px-6 py-3 font-semibold text-slate-300 transition hover:bg-slate-700/50 disabled:opacity-40"
              >
                {completing ? (
                  <span className="animate-pulse">Analyzing...</span>
                ) : (
                  <>
                    <Square className="h-4 w-4" /> Complete Session
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Right — Avatar + Live Feedback */}
          <aside className="space-y-4">
            {/* AI Avatar Coach */}
            <div className="glass rounded-2xl p-6 flex flex-col items-center text-center">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">AI Coach</h3>
              <AvatarOrb speaking={listening} size="lg" emotion={listening ? 'speaking' : tips.length > 0 ? 'thinking' : 'idle'} />
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">{aiLine}</p>
            </div>

            {/* Live Feedback Stream */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                <Zap className="inline h-3.5 w-3.5 mr-1 text-amber-400" />
                Live Feedback
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tips.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">Feedback will appear here as you speak...</p>
                ) : (
                  tips.map((tip, index) => (
                    <div
                      key={index}
                      className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/20 animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <p className="text-xs font-semibold text-cyan-400 mb-1">💡 {tip.quick_tip}</p>
                      <div className="flex gap-3 text-[10px] text-slate-500">
                        <span>Confidence: {tip.confidence_score.toFixed(1)}</span>
                        <span>Clarity: {tip.clarity_score.toFixed(1)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* Results panel */}
        {result && (
          <section className="mt-8 glass rounded-2xl p-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="h-6 w-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-slate-100">Session Analysis</h2>
              <span className="ml-auto text-3xl font-bold gradient-text">{result.overall_score.toFixed(1)}</span>
              <span className="text-sm text-slate-500">/ 100</span>
            </div>

            {/* Score cards grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ScoreCard label="Clarity" value={result.clarity_score} icon="🎯" color="cyan" />
              <ScoreCard label="Confidence" value={result.confidence_score} icon="💪" color="violet" />
              <ScoreCard label="Content" value={result.content_score} icon="📚" color="amber" />
              <ScoreCard label="Delivery" value={result.delivery_score} icon="🎤" color="emerald" />
            </div>

            {/* Feedback sections */}
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-5">
                <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Strengths
                </h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  {result.strengths.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-emerald-500 mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-5">
                <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Areas to Improve
                </h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  {result.weaknesses.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-rose-500 mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 p-5">
                <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Actions
                </h4>
                <ul className="space-y-2 text-sm text-slate-400">
                  {result.improvements.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Explainability */}
            <div className="mt-4 rounded-xl bg-slate-800/30 border border-slate-700/20 p-4">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-400">🔍 How we scored:</span> {result.explainability}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-primary flex items-center gap-2"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.back()}
                className="btn-secondary flex items-center gap-2"
              >
                Practice Again
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
