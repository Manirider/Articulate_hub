'use client';

import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from 'lucide-react';

type Props = {
  isMicOn: boolean;
  isCameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
  participantCount: number;
  roomCode: string;
  isHost: boolean;
  isSessionActive: boolean;
  onStartSession?: () => void;
  onEndSession?: () => void;
};

export function RoomControls({
  isMicOn,
  isCameraOn,
  onToggleMic,
  onToggleCamera,
  onLeave,
  participantCount,
  roomCode,
  isHost,
  isSessionActive,
  onStartSession,
  onEndSession,
}: Props) {
  return (
    <div className="glass rounded-2xl border-t border-slate-700/30 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Room info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Users className="h-4 w-4" />
            <span>{participantCount}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1 text-xs">
            <span className="text-slate-500">Code:</span>
            <span className="font-mono font-bold text-cyan-400 tracking-wider">{roomCode}</span>
          </div>
        </div>

        {/* Center: Media controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMic}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              isMicOn
                ? 'bg-slate-700/50 text-white hover:bg-slate-600/50'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
            title={isMicOn ? 'Mute' : 'Unmute'}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>

          <button
            onClick={onToggleCamera}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
              isCameraOn
                ? 'bg-slate-700/50 text-white hover:bg-slate-600/50'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
            title={isCameraOn ? 'Camera Off' : 'Camera On'}
          >
            {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </button>

          <button
            onClick={onLeave}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-all"
            title="Leave Room"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Session controls (host only) */}
        <div className="flex items-center gap-3">
          {isHost && !isSessionActive && (
            <button
              onClick={onStartSession}
              className="btn-primary text-sm px-4 py-2"
            >
              Start Session
            </button>
          )}
          {isHost && isSessionActive && (
            <button
              onClick={onEndSession}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              End Session
            </button>
          )}
          {!isHost && (
            <span className={`text-xs px-3 py-1.5 rounded-full ${
              isSessionActive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-700/40 text-slate-500'
            }`}>
              {isSessionActive ? '● Session Active' : 'Waiting for host...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
