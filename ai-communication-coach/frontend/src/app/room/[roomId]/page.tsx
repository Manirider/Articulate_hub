'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, MessageSquare, Mic, MicOff, Users, Radio,
  Wifi, Crown, Play, Square as SquareIcon, AlertCircle, Sparkles,
  Video, VideoOff, LogOut, Trophy, Target, Zap, Brain, Eye,
  Activity, ChevronRight
} from 'lucide-react';

import { GroupReportPanel } from '@/components/GroupReportPanel';
import { Navbar } from '@/components/Navbar';
import { RoomControls } from '@/components/RoomControls';
import { VideoGrid } from '@/components/VideoGrid';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { TiltCard } from '@/components/TiltCard';
import { AvatarOrb } from '@/components/AvatarOrb';
import { AnimatedCounter } from '@/components/AnimatedCounter';
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
      <div className="min-h-screen bg-[#050810] relative overflow-hidden">
        <div className="fixed inset-0 z-0 opacity-10 pointer-events-none grid-bg" />
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 mb-4"
          />
          <p className="text-white/50 animate-pulse">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050810] relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[150px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[120px] animate-float-slow" style={{ animationDelay: '3s' }} />
      </div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 z-[1] opacity-10 pointer-events-none grid-bg" />

      <Navbar />

      <main className="relative z-10 flex-1 flex flex-col mx-auto w-full max-w-7xl p-4 lg:p-6">
        {/* HUD Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            onClick={() => router.push('/room')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass-ultra border border-white/10 text-white/50 hover:text-white transition self-start"
            aria-label="Back to room lobby"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Exit Room</span>
          </motion.button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{room?.title || 'Room'}</h1>
              {isHost && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-1">
                  <Crown className="h-3 w-3" /> Host
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 flex items-center gap-2">
              {room?.mode === 'practice' ? (
                <><Sparkles className="h-3 w-3" /> Free Practice</>
              ) : room?.mode === 'team_2v2' ? (
                <><Users className="h-3 w-3" /> Team 2v2</>
              ) : (
                <><Users className="h-3 w-3" /> Team 3v3</>
              )}
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3 text-emerald-400" />
                {room?.participants.length || 0} participant{(room?.participants.length || 0) !== 1 ? 's' : ''}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
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

            {isSessionActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 text-xs font-medium">Live</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Error Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 flex items-center gap-3"
            >
              <div className="p-1.5 rounded-lg bg-rose-500/20">
                <AlertCircle className="h-4 w-4" />
              </div>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Grid or Report */}
        <AnimatePresence mode="wait">
          {!report ? (
            <motion.div
              key="session"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-4"
            >
              {/* Video Grid */}
              <div className="flex-1 relative">
                <TiltCard tiltAmount={2}>
                  <div className="glass-ultra rounded-3xl p-4 border border-white/10 h-full">
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
                </TiltCard>

                {/* AI Coach Overlay */}
                {!isSessionActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute bottom-4 right-4"
                  >
                    <div className="glass-ultra rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                      <AvatarOrb size="sm" emotion="idle" />
                      <div>
                        <p className="text-xs text-white/50">AI Coach</p>
                        <p className="text-sm text-white">{aiMessage}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Transcript preview */}
              <AnimatePresence>
                {isSessionActive && transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="glass-ultra rounded-2xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <WaveformVisualizer active={listening} />
                      <span className="text-[10px] text-white/50 uppercase tracking-wider">Your transcript</span>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed line-clamp-3">{transcript}</p>
                  </motion.div>
                )}
              </AnimatePresence>

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
            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="flex-1"
            >
              <TiltCard tiltAmount={2}>
                <div className="glass-ultra rounded-3xl p-6 border border-white/10">
                  <GroupReportPanel
                    individualReports={report.individual_reports}
                    groupMetrics={report.group_metrics}
                    teamReports={report.team_reports}
                    winner={report.winner}
                    mode={report.mode}
                  />
                </div>
              </TiltCard>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/room')}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-semibold"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Rooms
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition"
                >
                  <ChevronRight className="h-4 w-4" /> Dashboard
                </motion.button>
              </motion.div>
            </motion.div>
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
