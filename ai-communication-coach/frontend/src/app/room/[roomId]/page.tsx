'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, MessageSquare, Mic, MicOff, Users } from 'lucide-react';

import { GroupReportPanel } from '@/components/GroupReportPanel';
import { Navbar } from '@/components/Navbar';
import { RoomControls } from '@/components/RoomControls';
import { VideoGrid } from '@/components/VideoGrid';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { useWebRTC } from '@/hooks/useWebRTC';
import { api, RoomDetailResponse, RoomReportResponse } from '@/services/api';
import { getSocket } from '@/services/socket';
import { useAuth } from '@/hooks/useAuth';

export default function RoomSessionPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [room, setRoom] = useState<RoomDetailResponse | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [report, setReport] = useState<RoomReportResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [aiMessage, setAiMessage] = useState('Waiting for the session to begin...');
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptSendRef = useRef<NodeJS.Timeout | null>(null);

  const userId = user?.email || 'unknown';
  const displayName = user?.full_name || 'Guest';
  const isHost = room?.host_user_id === userId || room?.participants.some(p => p.user_id === userId && p.role === 'host');
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  // ── WebRTC Hook ──────────────────────────────────────────────────
  const {
    localStream,
    peers,
    isMicOn,
    isCameraOn,
    toggleMic,
    toggleCamera,
    startMedia,
    stopMedia,
  } = useWebRTC(params.roomId, userId, displayName);

  // ── Load room details ────────────────────────────────────────────
  useEffect(() => {
    api.getRoom(params.roomId)
      .then((data) => {
        setRoom(data);
        if (data.status === 'active') setIsSessionActive(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load room'))
      .finally(() => setLoading(false));
  }, [params.roomId]);

  // ── Start media when room loads ──────────────────────────────────
  useEffect(() => {
    if (room && !report) {
      startMedia();
    }
  }, [room, report, startMedia]);

  // ── Socket events for room ───────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onSessionStarted = () => {
      setIsSessionActive(true);
      setAiMessage('Session started! I\'m observing. Speak naturally.');
    };

    const onLiveFeedback = (data: any) => {
      if (data.user_id === userId) {
        setAiMessage(data.quick_tip || 'Keep going, you\'re doing great!');
      }
    };

    const onRoomMultimodal = (data: any) => {
      // Could update per-participant live scores here
    };

    socket.on('room_session_started', onSessionStarted);
    socket.on('room_live_feedback', onLiveFeedback);
    socket.on('room_multimodal_update', onRoomMultimodal);

    return () => {
      socket.off('room_session_started', onSessionStarted);
      socket.off('room_live_feedback', onLiveFeedback);
      socket.off('room_multimodal_update', onRoomMultimodal);
    };
  }, [userId]);

  // ── Speech recognition ───────────────────────────────────────────
  useEffect(() => {
    if (!isSessionActive) return;

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
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setTranscript(text);

      // Debounced emission
      if (transcriptSendRef.current) clearTimeout(transcriptSendRef.current);
      transcriptSendRef.current = setTimeout(() => {
        const latest = text.trim();
        if (latest.length > 10) {
          const socket = getSocket();
          socket.emit('room_transcript', {
            room_id: params.roomId,
            user_id: userId,
            display_name: displayName,
            content: latest,
          });
        }
      }, 500);
    };

    recognition.onerror = () => {
      setListening(false);
      listeningRef.current = false;
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    // Auto-start listening when session starts
    try {
      recognition.start();
      setListening(true);
      listeningRef.current = true;
    } catch {}

    return () => {
      recognition.onend = null;
      recognition.stop();
      listeningRef.current = false;
    };
  }, [isSessionActive, params.roomId, userId, displayName]);

  // ── Timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSessionActive && !report) {
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSessionActive, report]);

  function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // ── Host actions ─────────────────────────────────────────────────
  async function handleStartSession() {
    try {
      await api.startRoom(params.roomId);
      const socket = getSocket();
      socket.emit('room_ready', { room_id: params.roomId });
      setIsSessionActive(true);
      setAiMessage('Session started! I\'m observing. Speak naturally.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }

  async function handleEndSession() {
    setCompleting(true);
    try {
      // Stop recognition
      if (recognitionRef.current) recognitionRef.current.stop();
      listeningRef.current = false;
      setListening(false);

      await api.completeRoom(params.roomId);
      const reportData = await api.getRoomReport(params.roomId);
      setReport(reportData);

      // TTS announcement
      if (typeof window !== 'undefined') {
        const msg = new SpeechSynthesisUtterance('Session complete. Your reports are ready.');
        msg.rate = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(msg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  }

  function handleLeave() {
    stopMedia();
    router.push('/room');
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[70vh]">
          <div className="animate-pulse text-slate-500">Loading room...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col mx-auto w-full max-w-7xl p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <button onClick={() => router.push('/room')} className="text-slate-500 hover:text-slate-300 transition self-start" aria-label="Back to room lobby">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-100">{room?.title || 'Room'}</h1>
            <p className="text-xs text-slate-500">
              {room?.mode === 'practice' ? 'Free Practice' : room?.mode === 'team_2v2' ? 'Team 2v2' : 'Team 3v3'}
              {' · '}
              {room?.participants.length || 0} participant{(room?.participants.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="h-4 w-4" /> {formatTime(elapsedSeconds)}
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <MessageSquare className="h-4 w-4" /> {wordCount} words
            </span>
            {isSessionActive && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Video Grid or Report */}
        {!report ? (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1">
              <VideoGrid
                localStream={localStream}
                peers={peers}
                localDisplayName={displayName}
                isMicOn={isMicOn}
                isCameraOn={isCameraOn}
                aiMessage={aiMessage}
                mode={room?.mode}
              />
            </div>

            {/* Transcript preview (small) */}
            {isSessionActive && transcript && (
              <div className="glass rounded-xl p-3 max-h-24 overflow-y-auto">
                <div className="flex items-center gap-2 mb-1">
                  <WaveformVisualizer active={listening} />
                  <span className="text-[10px] text-slate-500 uppercase">Your transcript</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* Controls */}
            <RoomControls
              isMicOn={isMicOn}
              isCameraOn={isCameraOn}
              onToggleMic={toggleMic}
              onToggleCamera={toggleCamera}
              onLeave={handleLeave}
              participantCount={1 + peers.size}
              roomCode={room?.code || ''}
              isHost={!!isHost}
              isSessionActive={isSessionActive}
              onStartSession={handleStartSession}
              onEndSession={handleEndSession}
            />
          </div>
        ) : (
          <div className="flex-1">
            <GroupReportPanel
              individualReports={report.individual_reports}
              groupMetrics={report.group_metrics}
              teamReports={report.team_reports}
              winner={report.winner}
              mode={report.mode}
            />
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => router.push('/room')} className="btn-primary w-full sm:w-auto">
                Back to Rooms
              </button>
              <button onClick={() => router.push('/dashboard')} className="btn-secondary w-full sm:w-auto">
                Dashboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
