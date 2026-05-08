'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle, Clock, MessageSquare, Mic, MicOff, Square, Zap, Camera } from 'lucide-react';

import { AvatarOrb } from '@/components/AvatarOrb';
import { ConfidenceAnalysisPanel, MultiModalResult } from '@/components/ConfidenceAnalysisPanel';
import { Navbar } from '@/components/Navbar';
import { ScoreCard } from '@/components/ScoreCard';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { useVoiceAnalysis } from '@/hooks/useVoiceAnalysis';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';

type FeedbackPayload = { quick_tip: string; confidence_score: number; clarity_score: number; };
type SessionResult = { overall_score: number; clarity_score: number; confidence_score: number; content_score: number; delivery_score: number; strengths: string[]; weaknesses: string[]; improvements: string[]; explainability: string; };

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
  const [browserWarning, setBrowserWarning] = useState('');
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'>('connecting');
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptSendRef = useRef<NodeJS.Timeout | null>(null);
  const lastTTSRef = useRef(0);

  const [multiModalResult, setMultiModalResult] = useState<MultiModalResult | null>(null);

  const moduleName = searchParams.get('module') || 'Session';
  const submoduleName = searchParams.get('submodule') || 'Practice';
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  const { videoRef, canvasRef, metrics: faceMetrics, isActive: cameraActive, isLoading: cameraLoading, error: cameraError, start: startCamera, stop: stopCamera } = useMediaPipe(params.sessionId);
  const { voiceMetrics, isAnalyzing: voiceAnalyzing, start: startVoiceAnalysis, stop: stopVoiceAnalysis } = useVoiceAnalysis(params.sessionId, wordCount);

  const handleToggleCamera = () => { cameraActive ? stopCamera() : startCamera(); };
  const speechRecognitionSupported = typeof window !== 'undefined'
    && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

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
    return () => { socket.off('live_feedback', onLiveFeedback); socket.off('multimodal_update', onMultiModalUpdate); socket.emit('leave_session', { session_id: params.sessionId }); window.removeEventListener('socket_status', onStatus); };
  }, [params.sessionId]);

  // Speech recognition
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
    if (!SpeechRecognition) {
      setBrowserWarning('Speech recognition is not supported in this browser. Recording controls remain available, but live transcription may be limited.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const nextTranscript = Array.from(event.results).map((r: any) => r[0].transcript).join(' ');
      setTranscript(nextTranscript);
      const lowerTranscript = nextTranscript.toLowerCase();
      if (lowerTranscript.includes("end session") || lowerTranscript.includes("complete session") || lowerTranscript.includes("stop recording") || lowerTranscript.includes("hey coach stop")) {
        recognition.stop(); listeningRef.current = false;
        setTimeout(() => { document.getElementById('complete-session')?.click(); }, 100);
        return;
      }
      if (transcriptSendRef.current) clearTimeout(transcriptSendRef.current);
      transcriptSendRef.current = setTimeout(() => {
        const latest = nextTranscript.trim();
        if (latest.length > 20) { const socket = getSocket(); socket.emit('transcript_chunk', { session_id: params.sessionId, content: latest }); api.addTranscript(params.sessionId, latest, 'user').catch(() => {}); }
      }, 500);
    };
    recognition.onerror = () => { setListening(false); listeningRef.current = false; setError('Speech recognition hit an error. Try Chrome or restart recording.'); };
    recognition.onend = () => { if (listeningRef.current) { try { recognition.start(); } catch {} } };
    recognitionRef.current = recognition;
    return () => { recognition.onend = null; recognition.stop(); listeningRef.current = false; if (transcriptSendRef.current) clearTimeout(transcriptSendRef.current); };
  }, [params.sessionId]);

  // TTS
  const aiLine = useMemo(() => tips.length === 0 ? 'Begin speaking. I will coach your structure, confidence, and pacing in real-time.' : tips[0].quick_tip, [tips]);
  useEffect(() => {
    if (typeof window !== 'undefined' && aiLine && tips.length > 0) {
      const now = Date.now(); if (now - lastTTSRef.current < 4000) return; lastTTSRef.current = now;
      const utterance = new SpeechSynthesisUtterance(aiLine); utterance.rate = 1.05; utterance.pitch = 1;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
    }
  }, [aiLine, tips.length]);

  // Timer
  useEffect(() => {
    if (listening) { timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000); }
    else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [listening]);

  function formatTime(seconds: number) { const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); return `${m}:${s}`; }

  function toggleListening() {
    const recognition = recognitionRef.current; if (!recognition) return;
    if (listening) { recognition.stop(); setListening(false); listeningRef.current = false; stopVoiceAnalysis(); }
    else { setError(''); recognition.start(); setListening(true); listeningRef.current = true; if (speechRecognitionSupported) startVoiceAnalysis(); }
  }

  async function completeSession() {
    setCompleting(true); setError('');
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false); listeningRef.current = false; stopVoiceAnalysis(); stopCamera();
    try {
      const response = await api.completeSession(params.sessionId);
      setResult(response);
      if (typeof window !== 'undefined') { const msg = new SpeechSynthesisUtterance(`Session complete. Your overall score is ${response.overall_score.toFixed(0)} out of 100. ${response.strengths[0] || 'Good effort.'}`); msg.rate = 1; window.speechSynthesis.cancel(); window.speechSynthesis.speak(msg); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to complete session.'); }
    finally { setCompleting(false); }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl p-6 lg:p-8">
        {/* HUD Header */}
        <div className="flex items-center gap-4 mb-6 animate-fade-in-up">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-sm transition" style={{ color: 'var(--ink-muted)' }}>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--ink)' }}>{moduleName} · {submoduleName}</h1>
            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>Live AI coaching session</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-mono tabular-nums" style={{ color: 'var(--ink-secondary)' }}>
              <Clock className="h-4 w-4" /> {formatTime(elapsedSeconds)}
            </span>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
              <MessageSquare className="h-4 w-4" /> {wordCount} words
            </span>
            {listening && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs animate-neon-pulse" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--accent-rose)' }} /> REC
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{
              background: socketStatus === 'connected' ? 'rgba(16,185,129,0.1)' : socketStatus === 'reconnecting' ? 'rgba(245,158,11,0.1)' : 'var(--bg-card)',
              color: socketStatus === 'connected' ? 'var(--accent-emerald)' : socketStatus === 'reconnecting' ? 'var(--accent-amber)' : 'var(--ink-muted)',
              border: `1px solid ${socketStatus === 'connected' ? 'rgba(16,185,129,0.2)' : socketStatus === 'reconnecting' ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
            }}>
              <span className={`h-2 w-2 rounded-full ${socketStatus === 'reconnecting' ? 'animate-pulse' : ''}`} style={{ background: socketStatus === 'connected' ? 'var(--accent-emerald)' : socketStatus === 'reconnecting' ? 'var(--accent-amber)' : 'var(--ink-muted)' }} />
              {socketStatus === 'connected' ? 'Live' : socketStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Main content grid */}
        <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Left — Transcript & Controls */}
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6 relative">
              {listening && <div className="scan-line absolute inset-0 rounded-2xl overflow-hidden pointer-events-none" />}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>Live Transcript</h2>
                <WaveformVisualizer active={listening} />
              </div>
              <div className="min-h-[280px] max-h-[400px] overflow-y-auto rounded-xl p-5 text-sm leading-7" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--ink-secondary)' }}>
                {transcript || <span className="italic" style={{ color: 'var(--ink-muted)' }}>Your speech will appear here in real-time. Press &quot;Start Recording&quot; to begin...</span>}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              <button id="toggle-listening" onClick={toggleListening}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all duration-300 ${listening ? '' : 'btn-primary'}`}
                style={listening ? { background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' } : {}}>
                {listening ? <><MicOff className="h-5 w-5" /> Pause Recording</> : <><Mic className="h-5 w-5" /> Start Recording</>}
              </button>
              {submoduleName === 'Demo Mode' && (
                <button id="inject-demo-text" onClick={() => {
                  const mockText = "This is a demo mode transcript. I am speaking clearly and confidently about the topic. The AI should be able to analyze this speech and provide feedback on my performance. Thank you very much.";
                  setTranscript(mockText); const socket = getSocket(); socket.emit('transcript_chunk', { session_id: params.sessionId, content: mockText }); api.addTranscript(params.sessionId, mockText, 'user').catch(() => {});
                }} className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition" style={{ background: 'var(--glow-cyan)', color: 'var(--accent-cyan)', border: '1px solid var(--border-hover)' }}>
                  <MessageSquare className="h-4 w-4" /> Inject Demo Text
                </button>
              )}
              <button id="complete-session" onClick={completeSession} disabled={completing || wordCount < 5}
                className="flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition disabled:opacity-40"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                {completing ? <span className="animate-pulse">Analyzing...</span> : <><Square className="h-4 w-4" /> Complete Session</>}
              </button>
            </div>

            {error && (
              <div className="rounded-xl p-3 text-sm flex items-center gap-2" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}
            {browserWarning && (
              <div className="rounded-xl p-3 text-sm flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--accent-amber)' }}>
                <Camera className="h-4 w-4 flex-shrink-0" /> {browserWarning}
              </div>
            )}
            {!result && wordCount < 5 && <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>Speak at least 5 words to enable session completion.</p>}
          </div>

          {/* Right — Avatar + Analysis */}
          <aside className="space-y-4">
            <div className="glass rounded-2xl p-6 flex flex-col items-center text-center">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--ink-secondary)' }}>AI Coach</h3>
              <AvatarOrb speaking={listening} size="lg" emotion={listening ? 'speaking' : tips.length > 0 ? 'thinking' : 'idle'} />
              <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>{aiLine}</p>
            </div>

            <ConfidenceAnalysisPanel
              videoRef={videoRef as React.RefObject<HTMLVideoElement>}
              canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
              cameraActive={cameraActive} cameraLoading={cameraLoading} cameraError={cameraError}
              onToggleCamera={handleToggleCamera} faceMetrics={faceMetrics} voiceMetrics={voiceMetrics} multiModalResult={multiModalResult}
            />

            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--ink-secondary)' }}>
                <Zap className="inline h-3.5 w-3.5 mr-1" style={{ color: 'var(--accent-amber)' }} /> Live Feedback
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tips.length === 0 ? (
                  <p className="text-xs italic" style={{ color: 'var(--ink-muted)' }}>Feedback will appear here as you speak...</p>
                ) : tips.map((tip, index) => (
                  <div key={index} className="rounded-xl p-3 animate-fade-in-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', animationDelay: `${index * 0.05}s` }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>💡 {tip.quick_tip}</p>
                    <div className="flex gap-3 text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                      <span>Confidence: {tip.confidence_score.toFixed(1)}</span>
                      <span>Clarity: {tip.clarity_score.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        {/* Results panel */}
        {result && (
          <section className="mt-8 glass rounded-2xl p-8 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="h-6 w-6" style={{ color: 'var(--accent-emerald)' }} />
              <h2 className="text-2xl font-extrabold" style={{ color: 'var(--ink)' }}>Session Analysis</h2>
              <span className="ml-auto text-3xl font-bold gradient-text glow-text">
                <AnimatedCounter target={result.overall_score} decimals={1} />
              </span>
              <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>/ 100</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
              <ScoreCard label="Clarity" value={result.clarity_score} icon="🎯" color="cyan" />
              <ScoreCard label="Confidence" value={result.confidence_score} icon="💪" color="violet" />
              <ScoreCard label="Content" value={result.content_score} icon="📚" color="amber" />
              <ScoreCard label="Delivery" value={result.delivery_score} icon="🎤" color="emerald" />
            </div>

            {multiModalResult && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--glow-violet)', border: '1px solid rgba(168,85,247,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>Multi-Modal Confidence</p>
                  <p className="text-2xl font-bold gradient-text"><AnimatedCounter target={multiModalResult.confidence_score} decimals={1} /></p>
                  <p className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>/ 10.0</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'var(--glow-cyan)', border: '1px solid rgba(0,229,255,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>Eye Contact</p>
                  <p className="text-lg font-bold capitalize" style={{ color: 'var(--accent-cyan)' }}>{multiModalResult.eye_contact}</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.1)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>Engagement</p>
                  <p className="text-lg font-bold capitalize" style={{ color: 'var(--accent-emerald)' }}>{multiModalResult.engagement}</p>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl p-5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-emerald)' }}><CheckCircle className="h-4 w-4" /> Strengths</h4>
                <ul className="space-y-2 text-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {result.strengths.map((item) => <li key={item} className="flex items-start gap-2"><span style={{ color: 'var(--accent-emerald)' }}>•</span> {item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl p-5" style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.1)' }}>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-rose)' }}><AlertCircle className="h-4 w-4" /> Areas to Improve</h4>
                <ul className="space-y-2 text-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {result.weaknesses.map((item) => <li key={item} className="flex items-start gap-2"><span style={{ color: 'var(--accent-rose)' }}>•</span> {item}</li>)}
                </ul>
              </div>
              <div className="rounded-xl p-5" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)' }}>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-amber)' }}><Zap className="h-4 w-4" /> Actions</h4>
                <ul className="space-y-2 text-sm" style={{ color: 'var(--ink-secondary)' }}>
                  {result.improvements.map((item) => <li key={item} className="flex items-start gap-2"><span style={{ color: 'var(--accent-amber)' }}>•</span> {item}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                <span className="font-semibold" style={{ color: 'var(--ink-secondary)' }}>🔍 How we scored:</span> {result.explainability}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => router.push('/dashboard')} className="btn-primary flex items-center gap-2">Back to Dashboard</button>
              <button onClick={() => router.back()} className="btn-secondary flex items-center gap-2">Practice Again</button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
